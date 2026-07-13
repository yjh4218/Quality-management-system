import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { searchManufacturerAudits } from './api';
import { AgGridReact } from 'ag-grid-react';
import { toast } from 'react-toastify';
import ManufacturerSearchModal from './ManufacturerSearchModal';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import ChartCard from './components/dashboard/ChartCard';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CF8', '#FF6666'];

const ManufacturerAuditDashboard = ({ user, onNavigate }) => {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [manufacturerCode, setManufacturerCode] = useState(''); // 추가
    
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
        // Apply default sorting if needed, but usually handled by backend
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
        { field: 'manufacturer.name', headerName: '제조사', flex: 1, filter: true },
        { field: 'auditDate', headerName: '점검일자', width: 130, filter: true },
        { field: 'modifierInfo', headerName: '점검자', width: 110 },
        { field: 'totalScore', headerName: '총점(%)', width: 100 },
        { 
            field: 'grade', 
            headerName: '등급', 
            width: 90,
            cellRenderer: (params) => {
                const val = params.value;
                let color = '#c53030';
                if (val === 'A') color = '#2c7a7b';
                else if (val === 'B') color = '#2b6cb0';
                else if (val === 'C') color = '#d69e2e';
                return <b style={{ color }}>{val}</b>;
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
                    📋 상세 점검 내역 (총 {audits.length}건)
                </h3>
                <div className="ag-theme-alpine" style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <AgGridReact 
                        rowData={audits}
                        columnDefs={colDefs}
                        pagination={true}
                        paginationPageSize={20}
                        defaultColDef={{
                            sortable: true,
                            resizable: true,
                            filter: true,
                            floatingFilter: true,
                            flex: 1
                        }}
                    />
                </div>
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
