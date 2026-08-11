import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from './api';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import ChartCard from './components/dashboard/ChartCard';
import DashboardDataTable from './components/dashboard/DashboardDataTable';
import StatusBadgeRenderer from './components/dashboard/StatusBadgeRenderer';
import ClaimListModal from './components/dashboard/ClaimListModal';
import ProductSearchPopup from './ProductSearchPopup';
import {
    ComposedChart, BarChart, Bar, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

import { getActiveSalesChannels } from './api';
import useDateRangePreset from './hooks/useDateRangePreset';

const SafeResponsiveContainer = ({ children, height = 220, minHeight = 150 }) => {
    const containerRef = React.useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect.width > 0) {
                    const targetH = rect.height > 0 ? rect.height : (typeof height === 'number' ? height : 220);
                    setDimensions({ width: Math.floor(rect.width), height: Math.floor(targetH) });
                }
            }
        };

        updateSize();
        const observer = new ResizeObserver(() => updateSize());
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [height]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height, minHeight, position: 'relative' }}>
            {dimensions.width > 0 && dimensions.height > 0 && (
                <ResponsiveContainer width={dimensions.width} height={dimensions.height}>
                    {children}
                </ResponsiveContainer>
            )}
        </div>
    );
};

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function LotPpmDashboardPage({ user, onNavigate }) {
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState({ 
        monthlyPpmList: [], 
        topProductPpmList: [], 
        claimCategoryList: [],
        channelClaimList: []
    });
    const [rawClaims, setRawClaims] = useState([]);
    const [channelOptions, setChannelOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // 제품 검색 팝업 모달 상태
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);

    // 다차원 검색 필터 state
    const [itemCode, setItemCode] = useState('');
    const [productName, setProductName] = useState('');
    const [channel, setChannel] = useState('');
    const [lotNumber, setLotNumber] = useState('');
    const [groupByMaster, setGroupByMaster] = useState(false);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const { renderPresetButtons } = useDateRangePreset(setStartDate, setEndDate);

    // 팝업 모달 상태
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [listModalTitle, setListModalTitle] = useState('');
    const [listModalClaims, setListModalClaims] = useState([]);
    const [selectedClaimDetail, setSelectedClaimDetail] = useState(null);

    // 등록된 유통 채널 동적 수집
    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const res = await getActiveSalesChannels();
                const apiChannels = (res.data || []).map(ch => ch.name);
                setChannelOptions(apiChannels);
            } catch (err) {
                // API 실패 시 기본 등록 채널 집합 사용
                setChannelOptions(['JP/OFF', 'JP/ON(AMZ)', 'Domestic/OY', 'EU/ON(AMZ)', 'Export/Others', '스마트스토어', '올리브영', '쿠팡', '자사몰']);
            }
        };
        fetchChannels();
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (itemCode) params.itemCode = itemCode;
            if (productName) params.productName = productName;
            if (lotNumber) params.lotNumber = lotNumber;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (groupByMaster) params.groupByMaster = true;

            const summaryParams = {};
            if (startDate) summaryParams.startDate = startDate;
            if (endDate) summaryParams.endDate = endDate;
            if (groupByMaster) summaryParams.groupByMaster = true;

            const [resData, resSummary, resClaims] = await Promise.all([
                axios.get('/api/quality-analytics/lot-ppm', { params }),
                axios.get('/api/quality-analytics/summary', { params: summaryParams }),
                axios.get('/api/claims')
            ]);

            setData(resData.data || []);
            setSummary(resSummary.data || { monthlyPpmList: [], topProductPpmList: [], claimCategoryList: [], channelClaimList: [] });
            setRawClaims(resClaims.data || []);
        } catch (err) {
            console.error("Failed to load Quality Analytics data", err);
        } finally {
            setLoading(false);
        }
    }, [itemCode, productName, lotNumber, startDate, endDate, groupByMaster]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 차트/표 항목 클릭 시 팝업 모달으로 클레임 목록 표시
    const handleOpenClaimModal = (type, value, titleLabel) => {
        let filtered = [];
        if (type === 'month') {
            filtered = rawClaims.filter(c => c.receiptDate && c.receiptDate.startsWith(value));
        } else if (type === 'product') {
            filtered = rawClaims.filter(c => 
                (c.productName && c.productName.toLowerCase().includes(value.toLowerCase())) ||
                (c.itemCode && c.itemCode.toLowerCase().includes(value.toLowerCase()))
            );
        } else if (type === 'category') {
            filtered = rawClaims.filter(c => c.primaryCategory === value);
        } else if (type === 'channel') {
            filtered = rawClaims.filter(c => {
                if (value === '기타/직접') {
                    return !c.productName || !c.productName.includes('[');
                }
                return c.productName && c.productName.includes(`[${value}]`);
            });
        }

        setListModalTitle(titleLabel);
        setListModalClaims(filtered);
        setIsListModalOpen(true);
    };

    // 요약 지표 계산 (명확한 수식 및 근거 명시)
    const summaryCards = useMemo(() => {
        const totalLots = data.filter(d => d.lotNumber !== 'LOT 미확인').length;
        const anomalyCount = data.filter(d => d.status === 'STATISTICAL_ANOMALY').length;
        const sampleShortageCount = data.filter(d => d.status === 'INSUFFICIENT_SAMPLE').length;
        
        const totalInbound = data.reduce((acc, cur) => acc + (cur.inboundQty || 0), 0);
        const totalClaim = data.reduce((acc, cur) => acc + (cur.claimQty || 0), 0);
        const avgPpm = totalInbound > 0 ? Math.round(((totalClaim / totalInbound) * 1000000) * 100) / 100 : 0;

        return [
            {
                label: '평균 불량률 (PPM)',
                value: `${avgPpm.toLocaleString()} PPM`,
                description: `총 입고(${totalInbound.toLocaleString()}개) 대비 클레임(${totalClaim.toLocaleString()}개) 산출`,
                status: 'info'
            },
            {
                label: '통계적 이상 판정 (유의함)',
                value: `${anomalyCount.toLocaleString()} 건`,
                description: 'Z-Score ≥ 1.645 (95% 신뢰수준 이상 유의미한 불량)',
                status: anomalyCount > 0 ? 'error' : 'success'
            },
            {
                label: '샘플 부족 (판단 보류)',
                value: `${sampleShortageCount.toLocaleString()} 건`,
                description: '입고 수량 30개 미만으로 통계 검정 판단 보류',
                status: 'warning'
            },
            {
                label: '분석 대상 LOT 수',
                value: `${totalLots.toLocaleString()} 개`,
                description: 'LOT 미확인 제외, 기간 내 실시간 입고 고유 LOT 총합',
                status: 'default'
            }
        ];
    }, [data]);

    // AG Grid 컬럼 명세
    const columnDefs = useMemo(() => [
        { 
            headerName: groupByMaster ? '마스터 구분' : '품목코드', 
            field: groupByMaster ? 'masterProductName' : 'itemCode', 
            width: 150, 
            filter: 'agTextColumnFilter',
            cellRenderer: (params) => {
                if (groupByMaster) {
                    return <span style={{ fontWeight: 600, color: '#1e293b' }}>{params.value}</span>;
                }
                return params.value;
            }
        },
        { 
            headerName: '품목명 (채널명)', 
            field: 'productName', 
            flex: 1.5, 
            minWidth: 180, 
            filter: 'agTextColumnFilter',
            cellRenderer: (params) => (
                <span 
                    onClick={() => handleOpenClaimModal('product', params.data.productName, `제품: ${params.data.productName} 클레임 내역`)}
                    title="클릭 시 관련 클레임 목록 팝업이 표시됩니다."
                    style={{ color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                    {params.value}
                </span>
            )
        },
        { 
            headerName: 'LOT 번호', 
            field: 'lotNumber', 
            width: 140, 
            filter: 'agTextColumnFilter',
            cellRenderer: (params) => (
                <span style={{ color: '#059669', fontWeight: 600 }}>
                    {params.value}
                </span>
            )
        },
        { 
            headerName: '입고량', 
            field: 'inboundQty', 
            width: 110, 
            type: 'numericColumn',
            valueFormatter: params => params.value ? params.value.toLocaleString() + '개' : '0개'
        },
        { 
            headerName: '클레임 불량수', 
            field: 'claimQty', 
            width: 130, 
            type: 'numericColumn',
            valueFormatter: params => params.value ? params.value.toLocaleString() + '개' : '0개'
        },
        { 
            headerName: '불량률 (PPM)', 
            field: 'ppm', 
            width: 130, 
            type: 'numericColumn',
            valueFormatter: params => params.value != null ? params.value.toLocaleString() + ' PPM' : '0 PPM'
        },
        { 
            headerName: 'Baseline PPM', 
            field: 'baselinePpm', 
            width: 140, 
            type: 'numericColumn',
            valueFormatter: params => params.value != null ? params.value.toLocaleString() + ' PPM' : '0 PPM'
        },
        { 
            headerName: 'Z-Score', 
            field: 'zScore', 
            width: 110, 
            type: 'numericColumn',
            valueFormatter: params => params.value != null ? params.value.toFixed(2) : '0.00'
        },
        {
            headerName: '근본원인 판정',
            field: 'status',
            width: 160,
            cellRenderer: (params) => {
                const statusMap = {
                    STATISTICAL_ANOMALY: { text: '통계적 이상', type: 'error' },
                    INSUFFICIENT_SAMPLE: { text: '샘플 부족', type: 'warning' },
                    NORMAL: { text: '정상', type: 'success' }
                };
                const config = statusMap[params.value] || { text: params.value, type: 'default' };
                return <StatusBadgeRenderer status={config.type} text={config.text} />;
            }
        },
        { headerName: '판정 상세', field: 'statusMessage', flex: 2, minWidth: 240 }
    ], [groupByMaster]);

    return (
        <AnalyticsDashboardShell
            title="입고-클레임 연동 PPM 분석 & LOT 근본원인 판별 대시보드"
            subtitle="월별 입고 대비 클레임율 추이, 불량률 높은 제품 순위, 유형/채널별 비중을 입체적으로 분석합니다."
        >
            {/* 검색 필터바 */}
            <DashboardFilterBar>
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
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '150px' }}
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
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>📦 제품명</label>
                        <input
                            type="text"
                            placeholder="제품명 검색 (예: 수분크림)"
                            value={productName}
                            onChange={e => setProductName(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '190px' }}
                        />
                    </div>
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
                    <div style={{ marginTop: '18px', display: 'flex', gap: '8px' }}>
                        <button
                            onClick={fetchData}
                            style={{
                                padding: '7px 18px',
                                backgroundColor: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            🔍 {loading ? '조회 중...' : '검색'}
                        </button>
                        <button
                            onClick={() => setGroupByMaster(prev => !prev)}
                            style={{
                                padding: '7px 14px',
                                backgroundColor: groupByMaster ? '#059669' : '#f1f5f9',
                                color: groupByMaster ? '#fff' : '#334155',
                                border: '1px solid ' + (groupByMaster ? '#059669' : '#cbd5e1'),
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {groupByMaster ? '✓ 마스터 정렬 중' : '마스터 코드 정렬'}
                        </button>
                    </div>
                </div>
            </DashboardFilterBar>

            <SummaryCardRow cards={summaryCards} />

            {/* 메인 비주얼 차트 레이아웃 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                
                {/* 월별 입고 대비 클레임율 추이 */}
                <ChartCard 
                    title="📈 월별 입고 대비 클레임율 추이" 
                    subtitle="월별 막대/행 클릭 시 클레임 상세 내역 팝업이 나타납니다."
                    data={summary.monthlyPpmList}
                    emptyThreshold={1}
                >
                    <div style={{ width: '100%', height: 260, minWidth: 0 }}>
                        <SafeResponsiveContainer height={260}>
                            <ComposedChart data={summary.monthlyPpmList} margin={{ top: 20, right: 65, bottom: 0, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis 
                                    yAxisId="left" 
                                    orientation="left" 
                                    stroke="#3b82f6" 
                                    tickFormatter={(val) => val.toLocaleString()}
                                    label={{ value: '클레임(개)', angle: -90, position: 'insideLeft', fontSize: 11 }} 
                                />
                                <YAxis 
                                    yAxisId="right" 
                                    orientation="right" 
                                    stroke="#ef4444" 
                                    tickFormatter={(val) => {
                                        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                                        if (val >= 1000) return `${(val / 1000).toLocaleString()}k`;
                                        return val.toLocaleString();
                                    }}
                                    label={{ value: 'PPM', angle: 90, position: 'insideRight', offset: 10, fontSize: 11 }} 
                                />
                                <Tooltip 
                                    formatter={(val, name) => [
                                        name === 'PPM 불량률' ? `${val.toLocaleString()} PPM` : `${val.toLocaleString()} 개`,
                                        name
                                    ]}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar 
                                    yAxisId="left" 
                                    dataKey="claimQty" 
                                    name="클레임 불량수" 
                                    fill="#3b82f6" 
                                    barSize={28} 
                                    radius={[4, 4, 0, 0]}
                                    onClick={(entry) => handleOpenClaimModal('month', entry.month, `${entry.month} 접수 클레임 목록`)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <Line yAxisId="right" type="monotone" dataKey="ppm" name="PPM 불량률" stroke="#ef4444" strokeWidth={3} dot={{ r: 5 }} />
                            </ComposedChart>
                        </SafeResponsiveContainer>
                    </div>

                    {/* 월별 요약 표 */}
                    <div style={{ marginTop: '16px', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'center' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                                    <th style={{ padding: '8px' }}>년-월</th>
                                    <th style={{ padding: '8px' }}>입고 수량</th>
                                    <th style={{ padding: '8px' }}>클레임 수량</th>
                                    <th style={{ padding: '8px' }}>클레임 건수</th>
                                    <th style={{ padding: '8px' }}>불량률 (PPM)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.monthlyPpmList.map((m, idx) => (
                                    <tr 
                                        key={idx} 
                                        onClick={() => handleOpenClaimModal('month', m.month, `${m.month} 접수 클레임 목록`)}
                                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ padding: '8px', fontWeight: 600, color: '#2563eb', textDecoration: 'underline' }}>{m.month}</td>
                                        <td style={{ padding: '8px' }}>{m.inboundQty.toLocaleString()}개</td>
                                        <td style={{ padding: '8px', color: '#ef4444', fontWeight: 600 }}>{m.claimQty.toLocaleString()}개</td>
                                        <td style={{ padding: '8px' }}>{m.claimCount.toLocaleString()}건</td>
                                        <td style={{ padding: '8px', fontWeight: 700, color: m.ppm > 50000 ? '#ef4444' : '#2563eb' }}>
                                            {m.ppm.toLocaleString()} PPM
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ChartCard>

                {/* 우측 3단 분할 패널 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 1. 제품별 PPM 순위 */}
                    <ChartCard 
                        title="🏆 제품별 불량률 (PPM) Top 5" 
                        subtitle="막대 클릭 시 해당 제품의 클레임 내역 팝업이 나타납니다."
                        data={summary.topProductPpmList}
                        emptyThreshold={1}
                    >
                        <div style={{ width: '100%', height: 220, minWidth: 0 }}>
                            <SafeResponsiveContainer height={220}>
                                <BarChart layout="vertical" data={summary.topProductPpmList} margin={{ top: 5, right: 35, bottom: 5, left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        type="number" 
                                        tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : val.toLocaleString()} 
                                        unit=" PPM" 
                                        tick={{ fontSize: 11 }} 
                                    />
                                    <YAxis 
                                        type="category" 
                                        dataKey="productName" 
                                        width={140} 
                                        tick={({ x, y, payload }) => {
                                            const name = payload.value || '';
                                            const truncated = name.length > 12 ? name.substring(0, 11) + '...' : name;
                                            return (
                                                <g transform={`translate(${x},${y})`}>
                                                    <text x={-5} y={4} textAnchor="end" fill="#475569" fontSize={11} fontWeight={500}>
                                                        <title>{name}</title>
                                                        {truncated}
                                                    </text>
                                                </g>
                                            );
                                        }} 
                                    />
                                    <Tooltip formatter={(val) => [`${val.toLocaleString()} PPM`, 'PPM 불량률']} />
                                    <Bar 
                                        dataKey="ppm" 
                                        name="PPM 불량률" 
                                        fill="#f59e0b" 
                                        radius={[0, 4, 4, 0]} 
                                        barSize={20} 
                                        onClick={(entry) => handleOpenClaimModal('product', entry.productName, `제품: ${entry.productName} 클레임 내역`)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </BarChart>
                            </SafeResponsiveContainer>
                        </div>
                    </ChartCard>

                    {/* 2. 클레임 유형별 비중 */}
                    <ChartCard 
                        title="🏷️ 클레임 유형별 발생 비중" 
                        subtitle="유형 클릭 시 해당 원인의 클레임 내역 팝업이 나타납니다."
                        data={summary.claimCategoryList}
                        emptyThreshold={1}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', height: 140 }}>
                            <div style={{ width: '50%', height: '100%', minWidth: 0 }}>
                                <SafeResponsiveContainer height={140}>
                                    <PieChart>
                                        <Pie 
                                            data={summary.claimCategoryList} 
                                            dataKey="claimQty" 
                                            nameKey="category" 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={28} 
                                            outerRadius={55} 
                                            paddingAngle={3}
                                            onClick={(entry) => handleOpenClaimModal('category', entry.category, `유형: ${entry.category} 클레임 내역`)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {summary.claimCategoryList.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val, name, entry) => [`${val.toLocaleString()}개 (${entry.payload.percentage}%)`, name]} />
                                    </PieChart>
                                </SafeResponsiveContainer>
                            </div>
                            <div style={{ width: '50%', paddingLeft: '8px', overflowY: 'auto', maxHeight: '130px' }}>
                                {summary.claimCategoryList.map((cat, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => handleOpenClaimModal('category', cat.category, `유형: ${cat.category} 클레임 내역`)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11.5px', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                                            <span style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'underline' }}>{cat.category}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{cat.percentage}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ChartCard>

                    {/* 3. 판매 채널별 발생 비중 (신규) */}
                    <ChartCard 
                        title="🛒 판매 채널별 클레임 비중" 
                        subtitle="채널 클릭 시 해당 유통채널의 클레임 목록 팝업이 표시됩니다."
                        data={summary.channelClaimList || []}
                        emptyThreshold={1}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', height: 140 }}>
                            <div style={{ width: '50%', height: '100%', minWidth: 0 }}>
                                <SafeResponsiveContainer height={140}>
                                    <PieChart>
                                        <Pie 
                                            data={summary.channelClaimList || []} 
                                            dataKey="claimQty" 
                                            nameKey="channel" 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={28} 
                                            outerRadius={55} 
                                            paddingAngle={3}
                                            onClick={(entry) => handleOpenClaimModal('channel', entry.channel, `채널: ${entry.channel} 클레임 내역`)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {(summary.channelClaimList || []).map((entry, index) => (
                                                <Cell key={`cell-ch-${index}`} fill={PIE_COLORS[(index + 3) % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val, name, entry) => [`${val.toLocaleString()}개 (${entry.payload.percentage}%)`, name]} />
                                    </PieChart>
                                </SafeResponsiveContainer>
                            </div>
                            <div style={{ width: '50%', paddingLeft: '8px', overflowY: 'auto', maxHeight: '130px' }}>
                                {(summary.channelClaimList || []).map((ch, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => handleOpenClaimModal('channel', ch.channel, `채널: ${ch.channel} 클레임 내역`)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11.5px', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PIE_COLORS[(idx + 3) % PIE_COLORS.length] }}></span>
                                            <span style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'underline' }}>{ch.channel}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{ch.percentage}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ChartCard>

                </div>
            </div>

            {/* 하단 세부 LOT 데이터 테이블 */}
            <div style={{ marginTop: '28px' }}>
                <DashboardDataTable
                    title="📋 LOT별 PPM 및 근본원인 상세 목록 (더블클릭 시 클레임 등록 및 현황 이동)"
                    rowData={data}
                    columnDefs={columnDefs}
                    loading={loading}
                    onRowDoubleClick={(rowData) => onNavigate && onNavigate('claims', rowData)}
                />
            </div>

            {/* 클레임 목록 팝업 모달 */}
            <ClaimListModal
                isOpen={isListModalOpen}
                onClose={() => setIsListModalOpen(false)}
                title={listModalTitle}
                claims={listModalClaims}
                user={user}
            />

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
        </AnalyticsDashboardShell>
    );
}
