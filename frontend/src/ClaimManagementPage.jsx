import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { getClaims, getClaimDashboard } from './api';
import ClaimDrawer from './ClaimDrawer';
import ProductSearchPopup from './ProductSearchPopup';
import { usePermissions } from './usePermissions';

const ClaimManagementPage = ({ user, onNavigate, navigationData, onNavigated }) => {
    const gridRef = useRef(null);
    const [actualClaims, setActualClaims] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const initializedRef = useRef(false);

    const lastSearchRef = useRef('');

    const getInitialDates = () => {
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        return {
            start: lastWeek.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0]
        };
    };

    const initialDates = useMemo(() => getInitialDates(), []);
    const [searchParams, setSearchParams] = useState({
        startDate: initialDates.start,
        endDate: initialDates.end,
        itemCode: '',
        productName: '',
        lotNumber: '',
        country: '',
        qualityStatus: '',
        claimNumber: '',
        sharedWithManufacturer: ''
    });
    const [showSearchPopup, setShowSearchPopup] = useState(false);

    const isInternal = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_QUALITY' || user?.role === 'ADMIN' || user?.role === 'QUALITY' ||
        user?.companyName === '더파운더즈' ||
        user?.roles?.some(r => ['ROLE_ADMIN', 'ROLE_QUALITY', 'ADMIN', 'QUALITY'].includes(r.authority));

    const loadData = React.useCallback(async (force = false) => {
        const currentSearchKey = `${searchParams.sharedWithManufacturer}-${searchParams.qualityStatus}`;
        if (!force && lastSearchRef.current === currentSearchKey) return;
        
        lastSearchRef.current = currentSearchKey; // Set early to prevent race conditions
        try {
            const claimsRes = await getClaims(searchParams);
            setActualClaims(claimsRes.data || []);
        } catch (error) {
            setActualClaims([]);
        }
    }, [searchParams]);

    // Consistently trigger check on mount and key-filter changes
    const hasFetchedOnMount = useRef(false);
    useEffect(() => {
        if (hasFetchedOnMount.current) return;
        hasFetchedOnMount.current = true;
        loadData(false); // Automated trigger uses the guard
    }, [loadData]);

    const isManufacturer = user?.roles?.some(r => r.authority?.includes('MANUFACTURER'));

    const lastNavData = useRef(undefined);
    useEffect(() => {
        if (lastNavData.current === navigationData) return;
        lastNavData.current = navigationData;

        if (navigationData) {
            setSelectedClaim(navigationData);
            setIsDrawerOpen(true);
            if (onNavigated) onNavigated();
        }
    }, [navigationData, onNavigated]);

    const columnDefs = useMemo(() => [
        { field: 'claimNumber', headerName: '문서번호', width: 180, sortable: true, filter: true, pinned: 'left' },
        { field: 'receiptDate', headerName: '접수일자', sortable: true, filter: true, width: 150 },
        {
            field: 'qualityStatus', headerName: '처리 상태', sortable: true, filter: true, width: 230,
            cellRenderer: params => {
                const status = params.value;
                let color = '#6c757d';
                if (status?.includes('1단계')) color = '#0d6efd';
                if (status?.includes('2단계')) color = '#fd7e14';
                if (status?.includes('3단계')) color = '#17a2b8';
                if (status?.includes('4단계')) color = '#6610f2';
                if (status?.includes('5단계')) color = '#198754';
                return <span style={{ color: color, fontWeight: 'bold' }}>{status || '0단계 (접수 대기)'}</span>;
            }
        },
        {
            field: 'sharedWithManufacturer', headerName: '제조사 공유', width: 120, hide: isManufacturer,
            cellRenderer: params => params.value ? '✅ 공유중' : '❌ 비공개'
        },
        {
            field: 'mfrStatus', headerName: '제조사 처리 상태', sortable: true, filter: true, width: 230,
            cellRenderer: params => {
                if (!params.data.sharedWithManufacturer) return <span style={{color: '#adb5bd', fontSize: '12px'}}>-비공개-</span>;
                const status = params.value;
                let color = '#6c757d';
                if (status?.includes('1. 접수')) color = '#339af0';
                if (status?.includes('2. 원인분석')) color = '#fab005';
                if (status?.includes('3. 대책수립')) color = '#40c057';
                if (status?.includes('4. 클레임 종결')) color = '#000';
                return <span style={{ color: color, fontWeight: 'bold' }}>{status || '1. 접수'}</span>;
            }
        },
        { field: 'country', headerName: '인입 국가', sortable: true, filter: true, width: 150 },
        { field: 'itemCode', headerName: '품목코드', sortable: true, filter: true, width: 160 },
        { field: 'productName', headerName: '품목명', sortable: true, filter: true, width: 280 },
        { field: 'lotNumber', headerName: '로트번호', sortable: true, filter: true, width: 160 },
        { field: 'manufacturer', headerName: '제조사', sortable: true, filter: true, width: 180 },
        { field: 'primaryCategory', headerName: '대분류', sortable: true, filter: true, width: 170 },
        { field: 'occurrenceQty', headerName: '발생수량', sortable: true, filter: true, width: 130 },
        { field: 'qualityReceivedReturnedProduct', headerName: '품질팀 회수 제품 수령 여부', sortable: true, filter: true, width: 200 },
        { field: 'qualityReceivedDate', headerName: '품질팀 수령일자', sortable: true, filter: true, width: 160 },
        { field: 'terminationDate', headerName: '종결일', sortable: true, filter: true, width: 150 }
    ], [isManufacturer]);

    const handleRowClick = (e) => {
        setSelectedClaim(e.data);
        setIsDrawerOpen(true);
    };

    const handleCreateNew = () => {
        setSelectedClaim(null);
        setIsDrawerOpen(true);
    };

    const getRowStyle = params => {
        if (params.data && params.data.consumerReplyNeeded === '필요') {
            return { backgroundColor: '#ffe5e5', color: '#b30000', fontWeight: 'bold' };
        }
        return null;
    };

    const { canView, canEdit: canEditClaim } = usePermissions(user);
    const canCreate = canEditClaim('claims');
    const canViewDashboard = canView('claimDashboard');

    const handleExport = () => {
        if (gridRef.current) {
            gridRef.current.api.exportDataAsCsv({ fileName: 'claim_list.csv', allColumns: true });
        }
    };

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ marginBottom: '15px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>⚠️ 클레임 관리</h2>
                <div className="button-group">
                    {canViewDashboard && (
                        <button className="secondary" onClick={() => onNavigate('claimDashboard')}>📊 클레임 대시보드 보기</button>
                    )}
                    <button className="primary" onClick={handleExport} style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}>📥 엑셀(CSV) 다운로드</button>
                    <button className="primary" onClick={handleCreateNew} disabled={!canCreate} style={{ opacity: canCreate ? 1 : 0.5 }}>+ 신규 클레임 접수</button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#fff', borderRadius: '12px' }}>
                <div className="responsive-filter-grid">
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>📑 문서번호</label>
                        <input type="text" placeholder="문서번호" value={searchParams.claimNumber || ''} onChange={e => setSearchParams({ ...searchParams, claimNumber: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>📅 시작일</label>
                        <input type="date" value={searchParams.startDate || ''} onChange={e => setSearchParams({ ...searchParams, startDate: e.target.value })} style={{ width: '100%', padding: '9px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>📅 종료일</label>
                        <input type="date" value={searchParams.endDate || ''} onChange={e => setSearchParams({ ...searchParams, endDate: e.target.value })} style={{ width: '100%', padding: '9px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>🌍 국가</label>
                        <input type="text" placeholder="국가명" value={searchParams.country || ''} onChange={e => setSearchParams({ ...searchParams, country: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>🔍 품목코드</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="text" placeholder="코드" value={searchParams.itemCode || ''} onChange={e => setSearchParams({ ...searchParams, itemCode: e.target.value })} style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }} />
                            <button type="button" onClick={() => setShowSearchPopup(true)} style={{ padding: '0 10px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}>🧪</button>
                        </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>📦 제품명</label>
                        <input type="text" placeholder="제품명" value={searchParams.productName || ''} onChange={e => setSearchParams({ ...searchParams, productName: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>🔢 LOT</label>
                        <input type="text" placeholder="LOT" value={searchParams.lotNumber || ''} onChange={e => setSearchParams({ ...searchParams, lotNumber: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>🔄 상태</label>
                        <select value={searchParams.qualityStatus || ''} onChange={e => setSearchParams({ ...searchParams, qualityStatus: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' }}>
                            <option value="">전체</option>
                            <option value="0. 접수 대기">0. 접수 대기</option>
                            <option value="1. 클레임 접수">1. 클레임 접수</option>
                            <option value="2. 제품 회수">2. 제품 회수</option>
                            <option value="3. 원인 분석">3. 원인 분석</option>
                            <option value="4. 클레임 종결">4. 클레임 종결</option>
                        </select>
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                        <div>
                            {isInternal && (
                                <div 
                                    onClick={() => {
                                        const newVal = searchParams.sharedWithManufacturer === 'true' ? '' : 'true';
                                        setSearchParams(prev => ({ ...prev, sharedWithManufacturer: newVal }));
                                    }}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                                        padding: '10px 20px', borderRadius: '30px', 
                                        backgroundColor: searchParams.sharedWithManufacturer === 'true' ? '#fff1f0' : '#f9fafb',
                                        border: `1px solid ${searchParams.sharedWithManufacturer === 'true' ? '#ffa39e' : '#e5e7eb'}`,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                >
                                    <div style={{
                                        width: '20px', height: '20px', borderRadius: '50%',
                                        backgroundColor: searchParams.sharedWithManufacturer === 'true' ? '#ff4d4f' : '#d1d5db',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px'
                                    }}>
                                        {searchParams.sharedWithManufacturer === 'true' && '✓'}
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: searchParams.sharedWithManufacturer === 'true' ? '#cf1322' : '#4b5563' }}>🧡 제조사 공유 항목만 보기</span>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="secondary" onClick={() => {
                                const initD = getInitialDates();
                                setSearchParams({ startDate: initD.start, endDate: initD.end, itemCode: '', productName: '', lotNumber: '', country: '', qualityStatus: '', claimNumber: '', sharedWithManufacturer: '' });
                            }} style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #d1d5db', backgroundColor: '#fff', fontWeight: '600' }}>🔄 초기화</button>
                            <button className="primary" onClick={() => loadData(true)} style={{ padding: '10px 25px', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}>🔍 검색하기</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Stats are moved to ClaimDashboardPage */}

            <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                <AgGridReact
                    theme="legacy"
                    ref={gridRef}
                    rowData={actualClaims}
                    columnDefs={columnDefs}
                    pagination={true}
                    paginationPageSize={100}
                    onRowDoubleClicked={handleRowClick}
                    getRowStyle={getRowStyle}
                />
            </div>

            {isDrawerOpen && (
                <ClaimDrawer
                    claim={selectedClaim}
                    onClose={() => setIsDrawerOpen(false)}
                    onSaved={() => loadData(true)}
                    user={user}
                />
            )}

            {showSearchPopup && (
                <ProductSearchPopup
                    onClose={() => setShowSearchPopup(false)}
                    onSelect={(p) => {
                        setSearchParams({ ...searchParams, itemCode: p.itemCode, productName: p.productName });
                        setShowSearchPopup(false);
                    }}
                />
            )}
        </div>
    );
};

export default ClaimManagementPage;
