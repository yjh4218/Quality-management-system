import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import ProductionAuditDrawer from './ProductionAuditDrawer';
import ProductSearchPopup from './ProductSearchPopup';
import * as api from './api';
import { usePermissions } from './usePermissions';

/**
 * 신제품 생산감리(사진감리) 메인 화면 컴포넌트입니다.
 * 진행 대상(PENDING), 작성 완료된 감리 내역을 탭 형식으로 제공하며,
 * 권한에 따라 데이터 조회 범위 및 노출 기능이 자동으로 조정됩니다.
 * 
 * @param {Object} props
 * @param {Object} props.user - 현재 로그인한 사용자의 정보
 */
const ProductionAuditPage = ({ user }) => {
    const { canEdit } = usePermissions(user);
    const isManufacturer = user?.roles?.some(r => r.authority?.includes('MANUFACTURER'));
    const canRegister = canEdit('qualityPhotoAudit');
    const gridRef = useRef(null);
    const [rowData, setRowData] = useState([]);
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
    const [viewMode, setViewMode] = useState('completed'); // 'completed' or 'pending'
    const [searchFields, setSearchFields] = useState({
        itemCode: '',
        productName: '',
        manufacturerName: '',
        disclosureFilter: 'ALL' // 'ALL', 'DISCLOSED', 'HIDDEN'
    });


    const lastFetchedMode = useRef(null);
    useEffect(() => {
        if (lastFetchedMode.current === viewMode) return;
        lastFetchedMode.current = viewMode;
        fetchData();
    }, [viewMode]);

    const fetchData = async () => {
        try {
            const mfrFilter = isManufacturer ? user.companyName : searchFields.manufacturerName;
            
            // Fetch both parts with individual error handling to ensure visibility even if one fails
            let audits = [];
            let pending = [];
            
            try {
                const res = await api.getProductionAudits(mfrFilter);
                audits = res.data || [];
            } catch (err) {
                // Fetch audits fail
            }
            
            try {
                const res = await api.getPendingProductionAudits(mfrFilter);
                pending = res.data || [];
            } catch (err) {
                // Fetch pending fail
            }
            
            let finalData = [];
            if (viewMode === 'all') {
                finalData = [...audits, ...pending];
            } else if (viewMode === 'pending') {
                finalData = pending;
            } else if (viewMode === 'review') {
                if (!isManufacturer) {
                    // 관리자: 제출된 모든 내역 (반려 후 재제출 포함)
                    finalData = audits.filter(a => a.status === 'SUBMITTED');
                } else {
                    // 제조사: 품질팀에서 반려한 내역
                    finalData = audits.filter(a => a.status === 'REJECTED');
                }
            } else if (viewMode === 'completed') {
                // 관리자 & 제조사 공통: 최종 승인된 내역만 노출
                finalData = audits.filter(a => a.status === 'APPROVED');
            }
            
            let filteredResults = finalData;

            filteredResults = filteredResults.filter(item => {
                const matchesItemCode = !searchFields.itemCode || item.itemCode?.toLowerCase().includes(searchFields.itemCode.toLowerCase());
                const matchesProductName = !searchFields.productName || item.productName?.toLowerCase().includes(searchFields.productName.toLowerCase());
                
                let matchesDisclosure = true;
                if (!isManufacturer) { // 관리자(품질팀)인 경우 모든 탭에서 공개 여부 필터 적용
                    if (searchFields.disclosureFilter === 'DISCLOSED') matchesDisclosure = item.isDisclosed === true;
                    if (searchFields.disclosureFilter === 'HIDDEN') matchesDisclosure = item.isDisclosed === false;
                }

                return matchesItemCode && matchesProductName && matchesDisclosure;
            });

            setRowData(filteredResults);
        } catch (error) {
            // Process fail
        }
    };

    const handleSearchClick = () => {
        fetchData();
    };

    const handleRowClick = (event) => {
        if (viewMode === 'pending') {
            setSelectedAudit({
                itemCode: event.data.itemCode,
                productName: event.data.productName,
                manufacturerName: event.data.manufacturerName,
                isDisclosed: event.data.isDisclosed,
                status: 'PENDING'
            });
        } else {
            setSelectedAudit(event.data);
        }
        setIsDrawerOpen(true);
    };

    const handleCreateNew = () => {
        setSelectedAudit(null);
        setIsDrawerOpen(true);
    };

    const handleProductSelect = (product) => {
        setSearchFields(prev => ({
            ...prev,
            itemCode: product.itemCode,
            productName: product.productName
        }));
        setIsProductSearchOpen(false);
    };

    const colDefs = useMemo(() => [
        { 
            field: "status", 
            headerName: "진행상태", 
            width: 120,
            pinned: 'left',
            cellRenderer: p => {
                const statusMap = {
                    'SUBMITTED': { label: '제출됨', class: 'info' },
                    'APPROVED': { label: '승인됨', class: 'success' },
                    'REJECTED': { label: '반려됨', class: 'secondary' },
                    'PENDING': { label: '미진행', class: 'warning' }
                };
                const status = statusMap[p.value] || { label: p.value, class: 'info' };
                return <span className={`badge ${status.class}`} style={{ fontSize: '11px' }}>{status.label}</span>;
            }
        },
        { field: "itemCode", headerName: "품목코드", filter: true, width: 140, pinned: 'left' },
        { field: "productName", headerName: "제품명", filter: true, width: 250, pinned: 'left' },
        { field: "manufacturerName", headerName: "제조사", filter: true, width: 150 },
        { 
            field: "isDisclosed", 
            headerName: "제조사 공개", 
            width: 110,
            hide: isManufacturer,
            cellRenderer: p => (
                <span style={{ 
                    color: p.value ? '#38a169' : '#e53e3e', 
                    fontWeight: '800', 
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    {p.value ? '● 공개' : '○ 비공개'}
                </span>
            )
        },
        { 
            field: "productionDate", 
            headerName: "생산일자", 
            width: 130, 
            filter: 'agDateColumnFilter',
            valueFormatter: p => p.value || '-'
        },
        { 
            field: "uploadDate", 
            headerName: "사진 업로드일", 
            width: 160, 
            filter: 'agDateColumnFilter',
            valueFormatter: p => p.value ? new Date(p.value).toLocaleString() : '-'
        },
        { field: "rejectionReason", headerName: "승인/반려 의견", flex: 1, minWidth: 200 }
    ], [viewMode, isManufacturer]);

    return (
        <div className="card" style={{ padding: '15px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
            <div className="page-header">
                <div>
                    <h2>📸 신제품 생산감리 (사진감리)</h2>
                    <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>제조사 생산 시 촬영한 용기, 단상자, 적재 사진 품질 감리 내역을 관리합니다.</p>
                </div>
                <div className="button-group">
                    <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', marginRight: '10px' }}>
                        <button 
                            onClick={() => setViewMode('all')}
                            className={viewMode === 'all' ? 'primary' : 'secondary'}
                            style={{ padding: '6px 15px', fontSize: '12px', border: 'none', borderRadius: '6px' }}
                        >
                            전체 내역
                        </button>
                        <button 
                            onClick={() => setViewMode('pending')}
                            className={viewMode === 'pending' ? 'primary' : 'secondary'}
                            style={{ padding: '6px 15px', fontSize: '12px', border: 'none', borderRadius: '6px' }}
                        >
                            미진행 품목
                        </button>
                        <button 
                            onClick={() => setViewMode('review')}
                            className={viewMode === 'review' ? 'primary' : 'secondary'}
                            style={{ padding: '6px 15px', fontSize: '12px', border: 'none', borderRadius: '6px' }}
                        >
                            {isManufacturer ? '반려됨' : '검토 필요'}
                        </button>
                        <button 
                            onClick={() => setViewMode('completed')}
                            className={viewMode === 'completed' ? 'primary' : 'secondary'}
                            style={{ padding: '6px 15px', fontSize: '12px', border: 'none', borderRadius: '6px' }}
                        >
                            완료 내역
                        </button>
                    </div>
                    {isManufacturer && (
                        <button onClick={handleCreateNew} className="primary" style={{ fontWeight: '800', opacity: canRegister ? 1 : 0.5 }} disabled={!canRegister}>➕ 신규 감리 등록</button>
                    )}
                </div>
            </div>

            {/* 검색 피드 카드 리팩토링 */}
            <div className="card" style={{ marginBottom: '15px', padding: '20px', flexShrink: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>품목코드</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input
                                type="text"
                                style={{ flex: 1 }}
                                placeholder="코드 입력"
                                value={searchFields.itemCode}
                                onChange={(e) => setSearchFields({ ...searchFields, itemCode: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                            />
                            <button 
                                type="button" 
                                onClick={() => setIsProductSearchOpen(true)}
                                style={{ padding: '0 10px', background: '#f8fafc', border: '1px solid #cbd5e0', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                🔍
                            </button>
                        </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>제품명</label>
                        <input
                            type="text"
                            placeholder="제품명 입력"
                            value={searchFields.productName}
                            onChange={(e) => setSearchFields({ ...searchFields, productName: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                        />
                    </div>
                    {!isManufacturer && (
                        <>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>제조사</label>
                                <input
                                    type="text"
                                    placeholder="제조사명 입력"
                                    value={searchFields.manufacturerName}
                                    onChange={(e) => setSearchFields({ ...searchFields, manufacturerName: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>제조사 공개 여부</label>
                                <select 
                                    value={searchFields.disclosureFilter}
                                    onChange={(e) => setSearchFields({ ...searchFields, disclosureFilter: e.target.value })}
                                    style={{ height: '42px' }}
                                >
                                    <option value="ALL">전체</option>
                                    <option value="DISCLOSED">공개됨</option>
                                    <option value="HIDDEN">비공개</option>
                                </select>
                            </div>
                        </>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="primary" onClick={handleSearchClick} style={{ flex: 1, padding: '10px' }}>🔍 검색</button>
                    </div>
                </div>
            </div>

            <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                <AgGridReact
                    theme="legacy"
                    rowHeight={50}
                    ref={gridRef}
                    rowData={rowData}
                    columnDefs={colDefs}
                    onRowDoubleClicked={handleRowClick}
                    animateRows={true}
                    overlayNoRowsTemplate={
                        viewMode === 'pending' ? '생산감리 미진행 품목이 없습니다.' : 
                        viewMode === 'review' ? 
                            (isManufacturer ? '반려된 내역이 없습니다.' : '검토가 필요한 감리 내역이 없습니다.') : 
                        '조회된 감리 내역이 없습니다.'
                    }
                />
            </div>

            <div style={{ padding: '10px', fontSize: '12px', color: '#718096', borderTop: '1px solid #edf2f7', marginTop: '10px' }}>
                * 품목 리스트를 더블 클릭하면 상세 정보를 확인하거나 감리를 등록할 수 있습니다.
            </div>

            {isDrawerOpen && (
                <ProductionAuditDrawer
                    audit={selectedAudit}
                    user={user}
                    onClose={() => setIsDrawerOpen(false)}
                    onSaveSuccess={fetchData}
                />
            )}

            {isProductSearchOpen && (
                <ProductSearchPopup 
                    onClose={() => setIsProductSearchOpen(false)}
                    onSelect={handleProductSelect}
                />
            )}
        </div>
    );
};

export default ProductionAuditPage;
