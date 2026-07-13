import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getClaimDashboard } from './api';
import { AgGridReact } from 'ag-grid-react';
import ClaimDrawer from './ClaimDrawer';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import ChartCard from './components/dashboard/ChartCard';

// ==========================================
// PRODUCTION READY - PERFORMANCE OPTIMIZED
// ==========================================

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CF8', '#FF6666'];

// MOUNT LOOP KILLER - GLOBAL DATA STORE
let globalDashboardData = { stats: null, claims: [], key: '' };
let globalDashboardPromise = null;

function ClaimDashboardPage({ user, onNavigate }) {
    const hasEffectRun = useRef(false);
    const gridRef = useRef();
    
    const [stats, setStats] = useState(globalDashboardData.stats);
    const [claims, setClaims] = useState(globalDashboardData.claims);
    const [loading, setLoading] = useState(false);
    
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [itemCode, setItemCode] = useState('');
    const [productName, setProductName] = useState('');
    const [manufacturer, setManufacturer] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);
    const [detailRow, setDetailRow] = useState(null);

    const [gridPage, setGridPage] = useState(0);
    const [gridTotalPages, setGridTotalPages] = useState(1);
    const [gridPageSize, setGridPageSize] = useState(10);

    const onPaginationChanged = useCallback(() => {
        if (gridRef.current && gridRef.current.api) {
            setGridPage(gridRef.current.api.paginationGetCurrentPage());
            setGridTotalPages(gridRef.current.api.paginationGetTotalPages());
        }
    }, []);

    const handlePageSizeChange = (e) => {
        const newSize = Number(e.target.value);
        setGridPageSize(newSize);
    };

    const load = useCallback(async (force = false) => {
        const currentKey = `${startDate}-${endDate}-${itemCode}-${productName}-${manufacturer}`;
        
        if (!force && globalDashboardData.key === currentKey && globalDashboardData.stats) {
            return;
        }

        if (globalDashboardPromise && !force) {
            try {
                const result = await globalDashboardPromise;
                setStats(result);
                setClaims(result.allClaims || []);
                return;
            } catch (err) {
                // Silently fail
            }
        }

        const fetchFunc = async () => {
            const params = { startDate, endDate, itemCode, productName, manufacturer };
            const response = await getClaimDashboard(params); // Remove skipLoading
            return response.data;
        };

        globalDashboardPromise = fetchFunc();
        
        try {
            setLoading(true);
            const result = await globalDashboardPromise;
            globalDashboardData = { stats: result, claims: result.allClaims || [], key: currentKey };
            setStats(result);
            setClaims(result.allClaims || []);
        } catch (e) {
            // Silently fail
        } finally {
            setLoading(false);
            globalDashboardPromise = null;
        }
    }, [startDate, endDate, itemCode, productName, manufacturer]);

    useEffect(() => {
        // [v1.0.7] STAGE 1: Prevent double-run in same component instance lifecycle
        if (hasEffectRun.current) return;
        
        load(false);
        
        hasEffectRun.current = true;
    }, [load]);

    const handleSearch = () => load(true);
    const handleReset = () => {
        const d = new Date(); d.setMonth(d.getMonth() - 3);
        setStartDate(d.toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        setItemCode('');
        setProductName('');
        setManufacturer('');
    };

    // --- Interaction Handlers ---
    const handleMonthClick = (data) => {
        const monthPrefix = data.activePayload?.[0]?.payload?.name;
        if (!monthPrefix) return;
        const filtered = claims.filter(c => c.receiptDate && c.receiptDate.startsWith(monthPrefix));
        setModalTitle(`${monthPrefix} 접수 클레임`);
        setModalData(filtered);
        setModalOpen(true);
    };

    const handleCountryClick = (data) => {
        const country = data.name;
        const filtered = claims.filter(c => (c.country || '알 수 없음') === country);
        setModalTitle(`국가: ${country} 접수 클레임`);
        setModalData(filtered);
        setModalOpen(true);
    };

    const handleCategoryClick = (data) => {
        if (!data || !data.name) return;
        const categoryClaims = claims.filter(c => (c.primaryCategory || '미분류') === data.name);
        setModalTitle(`대분류: ${data.name} 접수 클레임`);
        setModalData(categoryClaims);
        setModalOpen(true);
    };

    const handleTopProductClick = (itemCode, productName) => {
        const productClaims = claims.filter(c => c.itemCode === itemCode);
        setModalTitle(`품목별 상세 내역: ${productName}`);
        setModalData(productClaims);
        setModalOpen(true);
    };

    const handleTopCategoryClick = (category) => {
        const categoryClaims = claims.filter(c => (c.primaryCategory || '미분류') === category);
        setModalTitle(`대분류별 상세 내역: ${category}`);
        setModalData(categoryClaims);
        setModalOpen(true);
    };

    const handleRowDoubleClick = (params) => {
        if (params && params.data) {
            setDetailRow(params.data);
        }
    };

    const columnDefs = useMemo(() => [
        { field: 'receiptDate', headerName: '접수일자', width: 120 },
        { field: 'itemCode', headerName: '품목코드', width: 120 },
        { field: 'productName', headerName: '품목명', flex: 1 },
        { field: 'lotNumber', headerName: 'LOT Number', width: 130 },
        { field: 'country', headerName: '국가', width: 100 },
        { field: 'primaryCategory', headerName: '대분류', width: 140 },
        { field: 'qualityStatus', headerName: '처리 상태', width: 180, 
          cellStyle: params => {
              const status = params.value;
              let color = '#6c757d'; 
              if (status?.includes('1단계')) color = '#0d6efd';
              if (status?.includes('2단계')) color = '#fd7e14';
              if (status?.includes('3단계')) color = '#17a2b8';
              if (status?.includes('4단계')) color = '#6610f2';
              if (status?.includes('5단계')) color = '#198754';
              return { color: color, fontWeight: 'bold' };
          }
        },
        { field: 'claimContent', headerName: '클레임 내용', flex: 2 }
    ], []);

    const isManufacturer = user?.roles?.some(r => r.authority?.includes('MANUFACTURER'));

    if (!stats && loading) return null;

    if (!stats) return <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>대시보드 데이터를 불러올 수 없습니다.</div>;

    const countryMap = {};
    const monthlyMap = {};
    const categoryMap = {};

    claims.forEach(c => {
        if (!c.receiptDate) return;
        const country = c.country || '알 수 없음';
        countryMap[country] = (countryMap[country] || 0) + 1;
        const month = c.receiptDate.substring(0, 7);
        monthlyMap[month] = (monthlyMap[month] || 0) + 1;
        const cat = c.primaryCategory || '미분류';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    const countryData = Object.keys(countryMap).map(k => ({ name: k, value: countryMap[k] }));
    const monthlyData = Object.keys(monthlyMap).sort().map(k => ({ name: k, 클레임발생건수: monthlyMap[k] }));

    const filterFields = [
        { label: '조회 기간 (시작)', type: 'date', value: startDate, onChange: e => setStartDate(e.target.value), icon: '🗓️' },
        { label: '조회 기간 (종료)', type: 'date', value: endDate, onChange: e => setEndDate(e.target.value), icon: '🗓️' },
        { label: '품목코드', type: 'text', value: itemCode, onChange: e => setItemCode(e.target.value), icon: '🏷️', placeholder: '코드 검색' },
        { label: '품목명', type: 'text', value: productName, onChange: e => setProductName(e.target.value), icon: '📦', placeholder: '품목명 검색' },
        ...(!isManufacturer ? [{ label: '제조사', type: 'text', value: manufacturer, onChange: e => setManufacturer(e.target.value), icon: '🏭', placeholder: '제조사명 검색' }] : [])
    ];

    const summaryCards = [
        { icon: '📅', label: '이번달 발생', value: `${stats.thisMonthCount || 0}건` },
        { icon: '⏳', label: '전달 발생', value: `${stats.lastMonthCount || 0}건` },
        { icon: '📊', label: '전분기 발생', value: `${stats.lastQuarterCount || 0}건` },
        { icon: '💯', label: '최근 1년 발생', value: `${stats.oneYearCount || 0}건`, valueColor: '#ef4444' }
    ];

    return (
        <AnalyticsDashboardShell
            icon="📊"
            title="클레임 종합 대시보드"
            subtitle="품질 이슈 실시간 모니터링 및 분석"
            backTo="claims"
            backLabel="클레임 관리로 돌아가기"
            onDownloadReport={() => alert("대시보드 통계 엑셀 다운로드 기능 준비 중입니다.")}
            onNavigate={onNavigate}
        >
            {/* 필터 검색 바 */}
            <DashboardFilterBar 
                fields={filterFields}
                onSearch={handleSearch}
                onReset={handleReset}
            />

            {/* 수치 요약 */}
            <SummaryCardRow cards={summaryCards} />

            {/* 기타 커스텀 랭킹 카드 영역 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                <div style={{
                    padding: '20px 24px',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    boxSizing: 'border-box'
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: '0 0 16px 0' }}>
                        🏆 최근 1개월 최다 발생 품목
                    </h3>
                    <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                                <span className="spinner-ring" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span> 로딩 중...
                            </div>
                        ) : stats.topProductsByBrand && Object.keys(stats.topProductsByBrand).length > 0 ? (
                            Object.entries(stats.topProductsByBrand).map(([brand, products]) => (
                                <div key={brand} style={{ marginBottom: '10px' }}>
                                    <strong style={{ color: '#2563eb', fontSize: '13px' }}>{brand}</strong>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#475569' }}>
                                        {products.map((p, idx) => (
                                            <li key={idx} style={{ cursor: 'pointer', textDecoration: 'underline', padding: '2px 0' }} onClick={() => handleTopProductClick(p.itemCode, p.productName)}>
                                                [{p.itemCode}] {p.productName} ({p.count}건)
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))
                        ) : <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>내역이 없습니다.</p>}
                    </div>
                </div>

                <div style={{
                    padding: '20px 24px',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    boxSizing: 'border-box'
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#334155', margin: '0 0 16px 0' }}>
                        ⚠️ 최다 발생 클레임 유형
                    </h3>
                    <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                        {stats.topCategories && stats.topCategories.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569' }}>
                                {stats.topCategories.map((cat, idx) => (
                                    <li key={idx} style={{ marginBottom: '6px', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleTopCategoryClick(cat.category)}>
                                        <strong>{cat.category}</strong> ({cat.count}건)
                                    </li>
                                ))}
                            </ul>
                        ) : <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>내역이 없습니다.</p>}
                    </div>
                </div>
            </div>

            {/* 차트 영역 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                <ChartCard 
                    title="월간 접수 추이"
                    type="bar"
                    data={monthlyData}
                    dataKey="클레임발생건수"
                    nameKey="name"
                    emptyThreshold={2}
                />
                <ChartCard 
                    title="국가별 비중"
                    type="pie"
                    data={countryData}
                    dataKey="value"
                    nameKey="name"
                    emptyThreshold={2}
                />
            </div>

            {/* 데이터 테이블 목록 */}
            <div style={{
                padding: '20px 24px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '520px'
            }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                    📋 클레임 조회 결과 목록 (총 {claims?.length || 0}건)
                </h3>
                <div className="ag-theme-alpine" style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <AgGridReact
                        ref={gridRef}
                        rowData={claims || []}
                        columnDefs={columnDefs}
                        pagination={true}
                        paginationPageSize={gridPageSize}
                        suppressPaginationPanel={true}
                        onPaginationChanged={onPaginationChanged}
                        onRowDoubleClicked={handleRowDoubleClick}
                        defaultColDef={{ sortable: true, resizable: true }}
                    />
                </div>
                
                {/* 페이징 제어 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', padding: '10px 5px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>페이지 표시 개수:</span>
                        <select 
                            value={gridPageSize} 
                            onChange={handlePageSizeChange}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', cursor: 'pointer', outline: 'none' }}
                        >
                            <option value={10}>10개씩 보기</option>
                            <option value={20}>20개씩 보기</option>
                            <option value={50}>50개씩 보기</option>
                            <option value={100}>100개씩 보기</option>
                        </select>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button
                            disabled={gridPage === 0}
                            onClick={() => gridRef.current?.api?.paginationGoToPreviousPage()}
                            style={{ padding: '6px 16px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: gridPage === 0 ? 'default' : 'pointer', opacity: gridPage === 0 ? 0.5 : 1 }}
                        >
                            ◀ 이전
                        </button>
                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>
                            {gridPage + 1} / {gridTotalPages || 1} 페이지
                        </span>
                        <button
                            disabled={gridPage >= gridTotalPages - 1}
                            onClick={() => gridRef.current?.api?.paginationGoToNextPage()}
                            style={{ padding: '6px 16px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: gridPage >= gridTotalPages - 1 ? 'default' : 'pointer', opacity: gridPage >= gridTotalPages - 1 ? 0.5 : 1 }}
                        >
                            다음 ▶
                        </button>
                    </div>
                </div>
            </div>

            {/* Drill-down Modal */}
            {modalOpen && (
                <div className="drawer-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
                    <div style={{ background: 'white', width: '85%', height: '85%', margin: 'auto', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>{modalTitle}</h3>
                            <button onClick={() => setModalOpen(false)} style={{ fontSize: '24px', border: 'none', background: 'none', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div className="ag-theme-alpine" style={{ height: 'calc(100% - 60px)', width: '100%' }}>
                            <AgGridReact
                                rowData={modalData}
                                columnDefs={columnDefs}
                                pagination={true}
                                paginationPageSize={10}
                                suppressPaginationPanel={false}
                                onRowDoubleClicked={handleRowDoubleClick}
                                popupParent={document.body}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Drawer */}
            {detailRow && (
                <ClaimDrawer 
                    claim={detailRow} 
                    onClose={() => setDetailRow(null)} 
                    readOnly={true}
                    onNavigateToEdit={() => {
                        const row = detailRow;
                        setDetailRow(null);
                        onNavigate('claims', row);
                    }}
                />
            )}
        </AnalyticsDashboardShell>
    );
}

const FinalClaimDashboardPage = React.memo(ClaimDashboardPage);
export default FinalClaimDashboardPage;
