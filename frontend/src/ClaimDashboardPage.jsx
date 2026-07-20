import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getClaimDashboard } from './api';
import ClaimDrawer from './ClaimDrawer';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import ChartCard from './components/dashboard/ChartCard';
import DashboardDataTable from './components/dashboard/DashboardDataTable';
import StatusBadgeRenderer from './components/dashboard/StatusBadgeRenderer';

// ==========================================
// PRODUCTION READY - PERFORMANCE OPTIMIZED
// ==========================================

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

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
            const response = await getClaimDashboard(params);
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
        { field: 'receiptDate', headerName: '접수일자', width: 120, cellClass: 'text-center' },
        { field: 'itemCode', headerName: '품목코드', width: 120, cellClass: 'text-center' },
        { field: 'productName', headerName: '품목명', flex: 1, cellClass: 'text-left' },
        { field: 'lotNumber', headerName: 'LOT Number', width: 130, cellClass: 'text-center' },
        { field: 'country', headerName: '국가', width: 100, cellClass: 'text-center' },
        { field: 'primaryCategory', headerName: '대분류', width: 140, cellClass: 'text-center' },
        { 
            field: 'qualityStatus', 
            headerName: '처리 상태', 
            width: 180,
            cellClass: 'text-center',
            cellRenderer: (params) => (
                <StatusBadgeRenderer
                    value={params.value}
                    rules={{
                        '0단계': '#94a3b8',
                        '1단계': '#0d6efd',
                        '2단계': '#f59e0b',
                        '3단계': '#8b5cf6',
                        '4단계': '#ec4899',
                        '5단계': '#16a34a',
                        '대기': '#f59e0b',
                        '완료': '#16a34a'
                    }}
                />
            )
        },
        { 
            field: 'claimContent', 
            headerName: '클레임 내용', 
            flex: 2,
            cellClass: 'text-left',
            cellRenderer: (params) => {
                const val = params.value || '-';
                return <span title={val} className="truncate block w-full">{val}</span>;
            }
        }
    ], []);

    const isManufacturer = user?.roles?.some(r => r.authority?.includes('MANUFACTURER'));

    // SLA 임박 건수 산출 (품질/제조사 완료되지 않았으면서 접수일로부터 4일 이상 경과한 건)
    const slaUrgentCount = React.useMemo(() => {
        const today = new Date();
        return claims.filter(c => {
            if (!c.receiptDate) return false;
            // 5단계(종결) 또는 4단계(종결) 이외의 건 대상
            const isCompleted = c.qualityStatus?.includes('4단계') || c.mfrStatus?.includes('5단계') || c.mfrStatus?.includes('4단계');
            if (isCompleted) return false;
            const diffTime = Math.abs(today - new Date(c.receiptDate));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 4; // 접수 후 4일 이상 지남 -> SLA 3일 이내 임박
        }).length;
    }, [claims]);

    // 제조사별 평균 답변 소요시간 집계
    const mfrRankings = React.useMemo(() => {
        const mfrData = {};
        claims.forEach(c => {
            if (c.receiptDate && c.mfrTerminationDate) {
                const diffTime = Math.abs(new Date(c.mfrTerminationDate) - new Date(c.receiptDate));
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (!mfrData[c.manufacturer]) {
                    mfrData[c.manufacturer] = { totalDays: 0, count: 0 };
                }
                mfrData[c.manufacturer].totalDays += diffDays;
                mfrData[c.manufacturer].count++;
            }
        });
        return Object.entries(mfrData).map(([name, data]) => ({
            name,
            avgDays: (data.totalDays / data.count).toFixed(1)
        })).sort((a, b) => parseFloat(a.avgDays) - parseFloat(b.avgDays));
    }, [claims]);

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
        { icon: '🚨', label: 'SLA 임박 (3일 이내)', value: `${slaUrgentCount}건`, valueColor: slaUrgentCount > 0 ? '#ef4444' : '#64748b' },
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                <div style={{
                    padding: '24px 28px',
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
                    boxSizing: 'border-box'
                }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: '0 0 16px 0' }}>
                        🏆 최근 1개월 최다 발생 품목
                    </h3>
                    <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                                <span className="spinner-ring" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span> 로딩 중...
                            </div>
                        ) : stats.topProductsByBrand && Object.keys(stats.topProductsByBrand).length > 0 ? (
                            Object.entries(stats.topProductsByBrand).map(([brand, products]) => (
                                <div key={brand} style={{ marginBottom: '12px' }}>
                                    <strong style={{ color: '#6366f1', fontSize: '13.5px' }}>{brand}</strong>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569' }}>
                                        {products.map((p, idx) => (
                                            <li key={idx} style={{ cursor: 'pointer', textDecoration: 'underline', padding: '3px 0' }} onClick={() => handleTopProductClick(p.itemCode, p.productName)}>
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
                    padding: '24px 28px',
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
                    boxSizing: 'border-box'
                }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: '0 0 16px 0' }}>
                        ⚠️ 최다 발생 클레임 유형
                    </h3>
                    <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                        {stats.topCategories && stats.topCategories.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: '#475569', lineHeight: '1.6' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                <ChartCard 
                    title="월간 접수 추이"
                    type="bar"
                    data={monthlyData}
                    dataKey="클레임발생건수"
                    nameKey="name"
                    emptyThreshold={2}
                    colors={COLORS}
                />
                <ChartCard 
                    title="국가별 비중"
                    type="pie"
                    data={countryData}
                    dataKey="value"
                    nameKey="name"
                    emptyThreshold={2}
                    colors={COLORS}
                />
            </div>

            {/* 제조사 답변 소요일 랭킹 위젯 추가 */}
            <div style={{
                padding: '24px 28px',
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
                boxSizing: 'border-box',
                marginBottom: '20px'
            }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                    🏭 제조사별 평균 클레임 답변 소요 기간 (랭킹)
                </h3>
                {mfrRankings.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                        충분한 답변 데이터가 축적되지 않았습니다.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        {mfrRankings.slice(0, 5).map((rank, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#475569' }}>{i+1}위. {rank.name}</span>
                                <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#6366f1' }}>{rank.avgDays}일</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 데이터 테이블 목록 */}
            <DashboardDataTable
                title="📋 클레임 조회 결과 목록"
                rowData={claims || []}
                columnDefs={columnDefs}
                onRowDoubleClick={handleRowDoubleClick}
                defaultPageSize={50}
            />

            {/* Drill-down Modal */}
            {modalOpen && (
                <div className="drawer-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
                    <div style={{ background: 'white', width: '85%', height: '85%', margin: 'auto', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>{modalTitle}</h3>
                            <button onClick={() => setModalOpen(false)} style={{ fontSize: '24px', border: 'none', background: 'none', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <DashboardDataTable
                                rowData={modalData}
                                columnDefs={columnDefs}
                                onRowDoubleClick={handleRowDoubleClick}
                                defaultPageSize={10}
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
