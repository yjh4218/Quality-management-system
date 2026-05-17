import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { getClaims, getClaimDashboard } from './api';
import ClaimDrawer from './ClaimDrawer';
import ProductSearchPopup from './ProductSearchPopup';
import { usePermissions } from './usePermissions';

const ClaimManagementPage = ({ user, onNavigate, navigationData, onNavigated }) => {
    const { canView } = usePermissions(user);
    const gridRef = useRef(null);
    const [actualClaims, setActualClaims] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const initializedRef = useRef(false);

    const lastSearchRef = useRef('');

    const getInitialDates = () => {
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setFullYear(today.getFullYear() - 1); // 1년으로 확장
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

    const { canEdit: canEditClaim } = usePermissions(user);
    const canCreate = canEditClaim('claims');
    const canViewDashboard = canView('claimDashboard');

    const handleExportExcel = async () => {
        if (!actualClaims || actualClaims.length === 0) {
            alert("조회 내역이 없습니다.");
            return;
        }
        try {
            const { exportClaimsExcel, downloadBlob } = await import('./api');
            const response = await exportClaimsExcel(searchParams);
            downloadBlob(response, "Claim_Export.xlsx");
        } catch (error) {
            alert("엑셀 다운로드 중 오류가 발생했습니다.");
        }
    };

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
            
            {/* 3단계 표준 헤더 레이아웃 */}
            <div className="page-header-standard" style={{ 
                marginBottom: '20px', 
                flexDirection: 'column', 
                alignItems: 'flex-start', 
                gap: '12px',
                padding: '24px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #f1f5f9'
            }}>
                {/* 1단계: 생성 및 연동 (최상단) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            ⚠️ 클레임 관리
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="primary" 
                            onClick={handleCreateNew} 
                            disabled={!canCreate} 
                            style={{ padding: '10px 24px', fontWeight: 'bold', backgroundColor: '#4f46e5', opacity: canCreate ? 1 : 0.5 }}
                        >
                            + 신규 클레임 접수
                        </button>
                    </div>
                </div>

                {/* 2단계: 핵심 제어 (중단) */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    width: '100%', 
                    alignItems: 'center', 
                    padding: '12px 0', 
                    borderTop: '1px solid #f1f5f9',
                    borderBottom: '1px solid #f1f5f9'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                        국내외 고객 클레임 접수 내역 및 단계별 처리 현황을 관리합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {canViewDashboard && (
                            <button 
                                className="outline" 
                                onClick={() => onNavigate('claimDashboard')}
                                style={{ fontWeight: 'bold', color: '#4f46e5', borderColor: '#c7d2fe' }}
                            >
                                📊 대시보드 보기
                            </button>
                        )}
                        {canView('claims') && (
                            <button 
                                className="outline" 
                                onClick={handleExportExcel} 
                                style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                            >
                                📊 결과 다운로드
                            </button>
                        )}
                        <button 
                            className="primary" 
                            onClick={() => loadData(true)} 
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            🔍 조회
                        </button>
                        <button 
                            className="outline" 
                            onClick={() => {
                                const initD = getInitialDates();
                                setSearchParams({ startDate: initD.start, endDate: initD.end, itemCode: '', productName: '', lotNumber: '', country: '', qualityStatus: '', claimNumber: '', sharedWithManufacturer: '' });
                            }} 
                            style={{ padding: '10px 16px', fontSize: '14px' }}
                        >
                            ♻️ 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 검색 필터 그리드 */}
            <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                    
                    {/* 1. 기간 (날짜) - 넓게 배치 */}
                    <div style={{ gridColumn: 'span 2', minWidth: '400px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>🗓️ 발생 기간</label>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <input type="date" value={searchParams.startDate || ''} onChange={e => setSearchParams({ ...searchParams, startDate: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                            <span style={{ color: '#94a3b8' }}>~</span>
                            <input type="date" value={searchParams.endDate || ''} onChange={e => setSearchParams({ ...searchParams, endDate: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                        </div>
                    </div>

                    {/* 2. 품목/제품 정보 */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>📦 품목 정보</label>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
                                <input type="text" placeholder="품목코드" value={searchParams.itemCode || ''} onChange={e => setSearchParams({ ...searchParams, itemCode: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                                <button type="button" onClick={() => setShowSearchPopup(true)} style={{ padding: '0 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>🔍</button>
                            </div>
                            <input type="text" placeholder="제품명 검색" value={searchParams.productName || ''} onChange={e => setSearchParams({ ...searchParams, productName: e.target.value })} style={{ flex: 2, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                        </div>
                    </div>

                    {/* 3. 고유 번호 (문서번호) */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>📑 문서번호</label>
                        <input type="text" placeholder="문서번호" value={searchParams.claimNumber || ''} onChange={e => setSearchParams({ ...searchParams, claimNumber: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                    </div>

                    {/* 4. LOT 번호 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔢 LOT 번호</label>
                        <input type="text" placeholder="LOT" value={searchParams.lotNumber || ''} onChange={e => setSearchParams({ ...searchParams, lotNumber: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                    </div>

                    {/* 5. 기타 (국가/상태) */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🌍 국가</label>
                        <input type="text" placeholder="국가명" value={searchParams.country || ''} onChange={e => setSearchParams({ ...searchParams, country: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔄 처리 상태</label>
                        <select value={searchParams.qualityStatus || ''} onChange={e => setSearchParams({ ...searchParams, qualityStatus: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', height: '38px' }}>
                            <option value="">전체 상태</option>
                            <option value="0. 접수 대기">0. 접수 대기</option>
                            <option value="1. 클레임 접수">1. 클레임 접수</option>
                            <option value="2. 제품 회수">2. 제품 회수</option>
                            <option value="3. 원인 분석">3. 원인 분석</option>
                            <option value="4. 클레임 종결">4. 클레임 종결</option>
                        </select>
                    </div>

                    {/* 제조사 공유 필터 (토글 스타일) */}
                    {isInternal && (
                        <div style={{ gridColumn: 'span 1' }}>
                            <div 
                                onClick={() => {
                                    const newVal = searchParams.sharedWithManufacturer === 'true' ? '' : 'true';
                                    setSearchParams(prev => ({ ...prev, sharedWithManufacturer: newVal }));
                                }}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                    padding: '7px 16px', borderRadius: '8px', 
                                    backgroundColor: searchParams.sharedWithManufacturer === 'true' ? '#fef2f2' : '#f8fafc',
                                    border: `1px solid ${searchParams.sharedWithManufacturer === 'true' ? '#fecaca' : '#e2e8f0'}`,
                                    transition: 'all 0.2s',
                                    height: '38px'
                                }}
                            >
                                <div style={{
                                    width: '14px', height: '14px', borderRadius: '4px',
                                    backgroundColor: searchParams.sharedWithManufacturer === 'true' ? '#ef4444' : '#cbd5e1',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px'
                                }}>
                                    {searchParams.sharedWithManufacturer === 'true' && '✓'}
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: searchParams.sharedWithManufacturer === 'true' ? '#b91c1c' : '#64748b' }}>제조사 공유 항목만</span>
                            </div>
                        </div>
                    )}
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
