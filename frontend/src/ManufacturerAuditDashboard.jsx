import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { searchManufacturerAudits } from './api';
import { toast } from 'react-toastify';
import ManufacturerSearchModal from './ManufacturerSearchModal';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import ChartCard from './components/dashboard/ChartCard';
import DataGrid from './components/common/DataGrid';

const COLORS = ['#389e0d', '#096dd9', '#faad14', '#cf1322', '#a28cf8', '#ff6666'];

const ManufacturerAuditDashboard = ({ user, onNavigate }) => {
    const gridRef = useRef();
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [manufacturerCode, setManufacturerCode] = useState('');
    
    // Filter State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [manufacturerName, setManufacturerName] = useState('');
    const [grade, setGrade] = useState('');

    const [stats, setStats] = useState({
        total: 0,
        avgScore: 0,
        gradeDist: [],
        trendData: []
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                startDate,
                endDate,
                manufacturerName,
                grade
            };
            const data = await searchManufacturerAudits(params);
            const auditList = data || [];
            setAudits(auditList);
            calculateStats(auditList);
        } catch (error) {
            toast.error('데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, manufacturerName, grade]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 예정일 도래 D-7 제조사 목록 산출 (최근 점검일 기준 1년 뒤가 7일 이내 도래)
    const upcomingAudits = useMemo(() => {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        // 제조사별 가장 마지막 점검내역 추출
        const lastAudits = {};
        audits.forEach(a => {
            const mName = a.manufacturer?.name;
            if (!mName) return;
            if (!lastAudits[mName] || new Date(a.auditDate) > new Date(lastAudits[mName].auditDate)) {
                lastAudits[mName] = a;
            }
        });

        return Object.values(lastAudits).map(a => {
            const lastDate = new Date(a.auditDate);
            const nextDate = new Date(lastDate);
            nextDate.setFullYear(lastDate.getFullYear() + 1); // 1년 후
            
            const diffTime = nextDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return {
                mfrName: a.manufacturer?.name,
                nextDateStr: nextDate.toISOString().split('T')[0],
                dDay: diffDays
            };
        }).filter(item => item.dDay >= 0 && item.dDay <= 7);
    }, [audits]);

    // 등급 변동 이력 (등급 하락 제조사 감지)
    const downgradedMfrs = useMemo(() => {
        const mfrAudits = {};
        // 날짜순 오름차순 정렬하여 순차 비교
        const sorted = [...audits].sort((a,b) => new Date(a.auditDate) - new Date(b.auditDate));
        
        const downgrades = [];
        const gradeMap = { A: 4, B: 3, C: 2, D: 1 };

        sorted.forEach(a => {
            const mName = a.manufacturer?.name;
            if (!mName) return;
            
            const prev = mfrAudits[mName];
            if (prev) {
                const prevLevel = gradeMap[prev.grade] || 0;
                const currLevel = gradeMap[a.grade] || 0;
                if (currLevel < prevLevel) {
                    // 강등 발생
                    downgrades.push({
                        mfrName: mName,
                        prevGrade: prev.grade,
                        currGrade: a.grade,
                        date: a.auditDate
                    });
                }
            }
            mfrAudits[mName] = a;
        });
        return downgrades.reverse(); // 최신순 정렬
    }, [audits]);

    const calculateStats = (data) => {
        let total = data.length;
        if (total === 0) {
            setStats({ total: 0, avgScore: 0, gradeDist: [], trendData: [] });
            return;
        }
        
        let sumScore = 0;
        let distMap = { A: 0, B: 0, C: 0, D: 0 };
        let monthlyTrend = {};
        
        data.forEach(a => {
            sumScore += a.totalScore || 0;
            if (a.grade && distMap[a.grade] !== undefined) {
                distMap[a.grade]++;
            }
            
            // Trend by month
            if (a.auditDate) {
                const month = a.auditDate.substring(0, 7);
                if (!monthlyTrend[month]) monthlyTrend[month] = { count: 0, sum: 0 };
                monthlyTrend[month].count++;
                monthlyTrend[month].sum += a.totalScore || 0;
            }
        });
        
        const gradeDist = Object.entries(distMap).map(([name, value]) => ({ name, value }));
        const trendData = Object.keys(monthlyTrend).sort().map(month => ({
            name: month,
            평균점수: (monthlyTrend[month].sum / monthlyTrend[month].count).toFixed(1),
            점검건수: monthlyTrend[month].count
        }));

        setStats({
            total,
            avgScore: (sumScore / total).toFixed(1),
            gradeDist,
            trendData
        });
    };

    const handleSearch = () => {
        loadData();
    };

    const handleSelectManufacturer = (m) => {
        setManufacturerName(m.name);
        setManufacturerCode(m.manufacturerCode || '');
        setShowSearchModal(false);
    };
    const handleReset = () => {
        const d = new Date(); d.setMonth(d.getMonth() - 6);
        setStartDate(d.toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        setManufacturerName('');
        setManufacturerCode('');
        setGrade('');
    };

    const colDefs = useMemo(() => [
        { field: 'manufacturer.name', headerName: '제조사', flex: 1, cellClass: 'text-left' },
        { field: 'auditDate', headerName: '점검일자', width: 130, cellClass: 'text-center' },
        { field: 'modifierInfo', headerName: '점검자', width: 110, cellClass: 'text-center' },
        { 
            field: 'totalScore', 
            headerName: '총점(%)', 
            width: 100, 
            cellClass: 'text-right',
            valueFormatter: (params) => params.value !== undefined ? `${params.value}%` : '-'
        },
        { 
            field: 'grade', 
            headerName: '등급', 
            width: 90,
            cellClass: 'text-center',
            cellRenderer: (params) => {
                const val = params.value;
                let bg = 'bg-gray-100 text-gray-800 border-gray-200';
                if (val === 'A') bg = 'bg-green-100 text-green-800 border-green-200';
                else if (val === 'B') bg = 'bg-blue-100 text-blue-800 border-blue-200';
                else if (val === 'C') bg = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                else if (val === 'D') bg = 'bg-red-100 text-red-800 border-red-200';
                return (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${bg}`}>
                        {val}
                    </span>
                );
            }
        }
    ], []);

    const filterFields = [
        { label: '조회 시작일', type: 'date', value: startDate, onChange: e => setStartDate(e.target.value), icon: '🗓️' },
        { label: '조회 종료일', type: 'date', value: endDate, onChange: e => setEndDate(e.target.value), icon: '🗓️' },
        { label: '등급', type: 'select', value: grade, onChange: e => setGrade(e.target.value), icon: '🏆', options: [
            { label: '전체', value: '' },
            { label: 'A', value: 'A' },
            { label: 'B', value: 'B' },
            { label: 'C', value: 'C' },
            { label: 'D', value: 'D' }
        ]},
        { label: '제조사명', type: 'text', value: manufacturerName, onChange: e => setManufacturerName(e.target.value), icon: '🏭', placeholder: '제조사명 입력' }
    ];

    const summaryCards = [
        { icon: '📋', label: '총 점검 건수', value: `${stats.total}건` },
        { icon: '🎯', label: '전체 평균 점수', value: `${stats.avgScore}점` },
        { icon: '📈', label: '최근 1개월 점검', value: `${audits.filter(a => new Date(a.auditDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}건`, valueColor: '#d46b08' }
    ];

    return (
        <AnalyticsDashboardShell
            icon="📊"
            title="제조사 Audit 종합 대시보드"
            subtitle="제조사별 품질 등급 및 점검 이력 분석 데이터를 통합 제공합니다."
            backTo="manufacturerAudits"
            backLabel="제조사 Audit 관리로 돌아가기"
            onDownloadReport={() => alert("대시보드 통계 엑셀 다운로드 기능 준비 중입니다.")}
            onNavigate={onNavigate}
        >
            {/* 필터 바 */}
            <DashboardFilterBar 
                fields={filterFields}
                onSearch={handleSearch}
                onReset={handleReset}
            />

            {/* 수치 요약 */}
            <SummaryCardRow cards={summaryCards} />

            {/* 차트 영역 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                <ChartCard 
                    title="월별 점검 추이 및 건수"
                    type="line"
                    data={stats.trendData}
                    dataKey="평균점수"
                    nameKey="name"
                    emptyThreshold={3}
                />
                <ChartCard 
                    title="등급별 비중 분포"
                    type="donut"
                    data={stats.gradeDist}
                    dataKey="value"
                    nameKey="name"
                    emptyThreshold={3}
                    colors={['#389e0d', '#096dd9', '#faad14', '#cf1322']}
                />
            </div>

            {/* D-7 이내 점검예정 제조사 및 등급하락 위젯 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div style={{ padding: '20px 24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', boxSizing: 'border-box' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                        📅 점검 기한 7일 이내 임박 제조사 (D-7)
                    </h3>
                    {upcomingAudits.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                            7일 이내 만료 예정인 제조사가 없습니다.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {upcomingAudits.map((item, index) => (
                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{item.mfrName}</span>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#d97706' }}>{item.nextDateStr} (D-{item.dDay})</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ padding: '20px 24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', boxSizing: 'border-box' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                        📉 직전 검사 대비 등급 강등 제조사
                    </h3>
                    {downgradedMfrs.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                            최근 등급이 강등된 제조사가 없습니다.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {downgradedMfrs.map((item, index) => (
                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#fff5f5', border: '1px solid #fed7d7' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#c53030' }}>{item.mfrName}</span>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#9b2c2c' }}>
                                        {item.prevGrade}등급 → {item.currGrade}등급 ({item.date})
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 데이터 테이블 영역 */}
            <div style={{
                padding: '20px 24px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '400px'
            }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                    📋 상세 점검 내역
                </h3>
                <DataGrid
                    ref={gridRef}
                    rowData={audits}
                    columnDefs={colDefs}
                    paginationPageSize={50}
                />
            </div>

            {showSearchModal && (
                <ManufacturerSearchModal 
                    onClose={() => setShowSearchModal(false)}
                    onSelect={handleSelectManufacturer}
                />
            )}
        </AnalyticsDashboardShell>
    );
};

export default ManufacturerAuditDashboard;
