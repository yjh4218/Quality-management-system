import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getClaimDashboard, getActiveSalesChannels } from './api';
import ClaimDrawer from './ClaimDrawer';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import ChartCard from './components/dashboard/ChartCard';
import DashboardDataTable from './components/dashboard/DashboardDataTable';
import StatusBadgeRenderer from './components/dashboard/StatusBadgeRenderer';
import ProductSearchPopup from './ProductSearchPopup';
import ClaimListModal from './components/dashboard/ClaimListModal';
import useDateRangePreset from './hooks/useDateRangePreset';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

let globalDashboardData = { stats: null, claims: [], key: '' };
let globalDashboardPromise = null;

function ClaimDashboardPage({ user, onNavigate }) {
    const hasEffectRun = useRef(false);
    const gridRef = useRef();
    
    const [stats, setStats] = useState(globalDashboardData.stats);
    const [claims, setClaims] = useState(globalDashboardData.claims);
    const [channelOptions, setChannelOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    
    const { renderPresetButtons } = useDateRangePreset(setStartDate, setEndDate);

    const [itemCode, setItemCode] = useState('');
    const [productName, setProductName] = useState('');
    const [channel, setChannel] = useState('');
    const [lotNumber, setLotNumber] = useState('');
    const [manufacturer, setManufacturer] = useState('');

    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);

    // 팝업 모달 상태
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [listModalTitle, setListModalTitle] = useState('');
    const [listModalClaims, setListModalClaims] = useState([]);
    const [selectedClaimDetail, setSelectedClaimDetail] = useState(null);
    const [detailRow, setDetailRow] = useState(null);

    // 유통 채널 동적 수집
    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const res = await getActiveSalesChannels();
                const apiChannels = (res.data || []).map(ch => ch.name);
                setChannelOptions(apiChannels);
            } catch (err) {
                setChannelOptions(['JP/OFF', 'JP/ON(AMZ)', 'Domestic/OY', 'EU/ON(AMZ)', 'Export/Others', '스마트스토어', '올리브영', '쿠팡', '자사몰']);
            }
        };
        fetchChannels();
    }, []);

    const load = useCallback(async (force = false) => {
        const currentKey = `${startDate}-${endDate}-${itemCode}-${productName}-${channel}-${lotNumber}-${manufacturer}`;
        
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
            const params = { startDate, endDate, itemCode, productName, lotNumber, manufacturer };
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
    }, [startDate, endDate, itemCode, productName, channel, lotNumber, manufacturer]);

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
        setChannel('');
        setLotNumber('');
        setManufacturer('');
    };

    // 채널 필터링 반영된 클레임 목록
    const filteredClaims = useMemo(() => {
        if (!claims) return [];
        if (!channel) return claims;

        return claims.filter(c => {
            if (channel === '기타/직접') {
                return !c.productName || !c.productName.includes('[');
            }
            return c.productName && c.productName.includes(`[${channel}]`);
        });
    }, [claims, channel]);

    // --- Interaction Handlers (그래프/카드 클릭 시 팝업 모달 표출) ---
    const handleMonthClick = (data) => {
        const monthPrefix = data.activePayload?.[0]?.payload?.name || data.name;
        if (!monthPrefix) return;
        const filtered = filteredClaims.filter(c => c.receiptDate && c.receiptDate.startsWith(monthPrefix));
        setListModalTitle(`${monthPrefix} 접수 클레임 목록`);
        setListModalClaims(filtered);
        setIsListModalOpen(true);
    };

    const handleCountryClick = (data) => {
        const country = data.name;
        if (!country) return;
        const filtered = filteredClaims.filter(c => (c.country || '알 수 없음') === country);
        setListModalTitle(`국가: ${country} 접수 클레임 목록`);
        setListModalClaims(filtered);
        setIsListModalOpen(true);
    };

    const handleTopProductClick = (itemCode, prodName) => {
        const productClaims = filteredClaims.filter(c => c.itemCode === itemCode || (c.productName && c.productName.includes(prodName)));
        setListModalTitle(`품목별 상세 내역: ${prodName}`);
        setListModalClaims(productClaims);
        setIsListModalOpen(true);
    };

    const handleTopCategoryClick = (catName) => {
        const categoryClaims = filteredClaims.filter(c => (c.primaryCategory || '미분류') === catName);
        setListModalTitle(`대분류별 상세 내역: ${catName}`);
        setListModalClaims(categoryClaims);
        setIsListModalOpen(true);
    };

    const handleRowClick = (params) => {
        if (params && params.data && onNavigate) {
            onNavigate('claims', params.data);
        } else if (params && params.data) {
            setDetailRow(params.data);
        }
    };

    const handleRowDoubleClick = (params) => {
        if (params && params.data && onNavigate) {
            onNavigate('claims', params.data);
        } else if (params && params.data) {
            setDetailRow(params.data);
        }
    };

    const columnDefs = useMemo(() => [
        { field: 'receiptDate', headerName: '접수일자', width: 120, cellClass: 'text-center' },
        { field: 'itemCode', headerName: '품목코드', width: 120, cellClass: 'text-center' },
        { field: 'productName', headerName: '품목명 (채널명)', flex: 1, cellClass: 'text-left' },
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

    const slaUrgentCount = useMemo(() => {
        const today = new Date();
        return filteredClaims.filter(c => {
            const isFinished = c.qualityStatus && (c.qualityStatus.includes('5단계') || c.qualityStatus.includes('완료'));
            if (isFinished) return false;
            if (!c.receiptDate) return false;
            const rDate = new Date(c.receiptDate);
            const diffDays = (today - rDate) / (1000 * 60 * 60 * 24);
            return diffDays >= 4;
        }).length;
    }, [filteredClaims]);

    if (!stats && loading) return null;

    if (!stats) return <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>대시보드 데이터를 불러올 수 없습니다.</div>;

    const countryMap = {};
    const monthlyMap = {};

    filteredClaims.forEach(c => {
        if (!c.receiptDate) return;
        const country = c.country || '알 수 없음';
        countryMap[country] = (countryMap[country] || 0) + 1;
        const month = c.receiptDate.substring(0, 7);
        monthlyMap[month] = (monthlyMap[month] || 0) + 1;
    });

    const countryData = Object.keys(countryMap).map(k => ({ name: k, value: countryMap[k] }));
    const monthlyData = Object.keys(monthlyMap).sort().map(k => ({ name: k, 클레임발생건수: monthlyMap[k] }));

    const summaryCards = [
        { icon: '📅', label: '기간 내 발생', value: `${filteredClaims.length}건`, description: '현재 필터 조건에 부합하는 총 접수 건수' },
        { icon: '🚨', label: 'SLA 임박 (4일 이상)', value: `${slaUrgentCount}건`, valueColor: slaUrgentCount > 0 ? '#ef4444' : '#64748b', description: '접수 4일 이상 경과 미종결 건 (SLA 목표 4일 이내)' },
        { icon: '📊', label: '전분기 발생', value: `${stats.lastQuarterCount || 0}건`, description: '직전 분기 총 품질 클레임 건수' },
        { icon: '💯', label: '최근 1년 발생', value: `${stats.oneYearCount || 0}건`, valueColor: '#ef4444', description: '최근 365일 누적 품질 클레임 건수' }
    ];

    return (
        <AnalyticsDashboardShell
            icon="📊"
            title="클레임 종합 대시보드"
            subtitle="품질 이슈 실시간 모니터링, 차트 클릭 드릴다운 팝업 및 채널별 분석을 제공합니다."
            backTo="claims"
            backLabel="클레임 관리로 돌아가기"
            onDownloadReport={() => alert("대시보드 통계 엑셀 다운로드 기능 준비 중입니다.")}
            onNavigate={onNavigate}
        >
            {/* 필터 검색 바 */}
            <DashboardFilterBar 
                onSearch={handleSearch}
                onReset={handleReset}
            >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>📅 조회 시작일</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '150px' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>📅 조회 종료일</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '150px' }}
                        />
                    </div>
                    {/* 기간 빠른 선택 버튼 그룹 */}
                    <div style={{ alignSelf: 'flex-end', marginBottom: '2px' }}>
                        {renderPresetButtons()}
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>🏷️ 품목코드</label>
                        <input
                            type="text"
                            placeholder="코드 검색 (예: PRD-001)"
                            value={itemCode}
                            onChange={e => setItemCode(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '170px' }}
                        />
                    </div>
                    {/* 품목 검색 돋보기 버튼 */}
                    <div style={{ alignSelf: 'flex-end', marginBottom: '2px' }}>
                        <button
                            type="button"
                            onClick={() => setIsProductSearchOpen(true)}
                            title="품목 상세 검색"
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '34px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        >
                            🔍
                        </button>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>📦 품목명</label>
                        <input
                            type="text"
                            placeholder="품목명 검색 (예: 수분크림)"
                            value={productName}
                            onChange={e => setProductName(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '190px' }}
                        />
                    </div>
                    {!isManufacturer && (
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>🏭 제조사</label>
                            <input
                                type="text"
                                placeholder="제조사명 검색"
                                value={manufacturer}
                                onChange={e => setManufacturer(e.target.value)}
                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '160px' }}
                            />
                        </div>
                    )}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>🛒 판매 채널</label>
                        <select
                            value={channel}
                            onChange={e => setChannel(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '170px', backgroundColor: '#fff', cursor: 'pointer' }}
                        >
                            <option value="">전체 채널</option>
                            {channelOptions.map((chOption, idx) => (
                                <option key={idx} value={chOption}>{chOption}</option>
                            ))}
                            <option value="기타/직접">기타/직접</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>🏷️ LOT 번호</label>
                        <input
                            type="text"
                            placeholder="LOT 검색 (예: LOT-202606A)"
                            value={lotNumber}
                            onChange={e => setLotNumber(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '180px' }}
                        />
                    </div>
                </div>
            </DashboardFilterBar>

            {/* 수치 요약 */}
            <SummaryCardRow cards={summaryCards} />

            {/* 랭킹 카드 영역 */}
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
                        🏆 최근 1개월 최다 발생 품목 (클릭 시 팝업)
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
                                            <li key={idx} style={{ cursor: 'pointer', textDecoration: 'underline', padding: '3px 0', color: '#2563eb' }} onClick={() => handleTopProductClick(p.itemCode, p.productName)}>
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
                        ⚠️ 최다 발생 클레임 유형 (클릭 시 팝업)
                    </h3>
                    <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                        {stats.topCategories && stats.topCategories.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: '#475569', lineHeight: '1.6' }}>
                                {stats.topCategories.map((cat, idx) => (
                                    <li key={idx} style={{ marginBottom: '6px', cursor: 'pointer', textDecoration: 'underline', color: '#ef4444' }} onClick={() => handleTopCategoryClick(cat.category)}>
                                        <strong>{cat.category}</strong> ({cat.count}건)
                                    </li>
                                ))}
                            </ul>
                        ) : <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>내역이 없습니다.</p>}
                    </div>
                </div>
            </div>

            {/* 차트 영역 (클릭 시 팝업 연동) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                <ChartCard 
                    title="월간 접수 추이 (막대 클릭 시 팝업)"
                    type="bar"
                    data={monthlyData}
                    dataKey="클레임발생건수"
                    nameKey="name"
                    emptyThreshold={1}
                    colors={COLORS}
                    onClickItem={handleMonthClick}
                />
                <ChartCard 
                    title="국가별 비중 (파이 조각 클릭 시 팝업)"
                    type="pie"
                    data={countryData}
                    dataKey="value"
                    nameKey="name"
                    emptyThreshold={1}
                    colors={COLORS}
                    onClickItem={handleCountryClick}
                />
            </div>

            {/* 데이터 테이블 목록 */}
            <DashboardDataTable
                title="📋 클레임 조회 결과 목록 (항목 클릭 시 '클레임 등록 및 현황' 세부 화면 이동)"
                rowData={filteredClaims}
                columnDefs={columnDefs}
                onRowClicked={handleRowClick}
                onRowDoubleClick={handleRowDoubleClick}
                defaultPageSize={50}
            />

            {/* 선택된 클레임 상세 Drawer */}
            {detailRow && (
                <ClaimDrawer
                    claim={detailRow}
                    readOnly={true}
                    onClose={() => setDetailRow(null)}
                />
            )}

            {/* 품목/제품 검색 팝업 모달 */}
            {isProductSearchOpen && (
                <ProductSearchPopup
                    onClose={() => setIsProductSearchOpen(false)}
                    onSelect={(product) => {
                        if (product) {
                            if (product.itemCode) setItemCode(product.itemCode);
                            if (product.productName) setProductName(product.productName);
                        }
                        setIsProductSearchOpen(false);
                    }}
                />
            )}

            {/* 클레임 목록 드릴다운 팝업 모달 */}
            <ClaimListModal
                isOpen={isListModalOpen}
                onClose={() => setIsListModalOpen(false)}
                title={listModalTitle}
                claims={listModalClaims}
                user={user}
            />
        </AnalyticsDashboardShell>
    );
}

export default ClaimDashboardPage;
