import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { searchManufacturerAudits } from './api';
import { AgGridReact } from 'ag-grid-react';
import { toast } from 'react-toastify';
import ManufacturerSearchModal from './ManufacturerSearchModal';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip as RechartsTooltip, 
    CartesianGrid, 
    PieChart, 
    Pie, 
    Cell, 
    Legend,
    LineChart,
    Line
} from 'recharts';

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

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9', overflowY: 'auto' }}>
            
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
                            📊 제조사 Audit 종합 대시보드
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="secondary" 
                            onClick={() => onNavigate('manufacturerAudits')} 
                            style={{ 
                                padding: '10px 20px', 
                                borderRadius: '10px', 
                                fontWeight: '800', 
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer'
                            }} 
                        >
                            &larr; 제조사 Audit 관리로 돌아가기
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
                        제조사별 품질 등급 및 점검 이력 분석 데이터를 통합 대시보드 형태로 제공합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="outline" 
                            onClick={() => alert("대시보드 통계 엑셀 다운로드 기능 준비 중입니다.")}
                            style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                        >
                            📊 분석 리포트 다운로드
                        </button>
                        <button 
                            className="primary" 
                            onClick={handleSearch} 
                            disabled={loading}
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            {loading ? '조회 중...' : '🔍 조회'}
                        </button>
                        <button 
                            className="outline" 
                            onClick={handleReset} 
                            disabled={loading}
                            style={{ padding: '10px 16px', fontSize: '14px' }}
                        >
                            ♻️ 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 검색 필터 그리드 */}
            <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🗓️ 조회 시작일</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🗓️ 조회 종료일</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                        />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🏭 제조사 정보</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                                type="text" 
                                readOnly 
                                placeholder="코드"
                                value={manufacturerCode} 
                                style={{ width: '100px', padding: '10px', background: '#f8fafc', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                            />
                            <button 
                                onClick={() => setShowSearchModal(true)}
                                style={{ padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e0', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                🔍
                            </button>
                            <input 
                                type="text" 
                                readOnly 
                                placeholder="제조사명"
                                value={manufacturerName} 
                                style={{ flex: 1, padding: '10px', background: '#f8fafc', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🏆 등급</label>
                        <select
                            value={grade}
                            onChange={e => setGrade(e.target.value)}
                            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', height: '42px' }}
                        >
                            <option value="">전체</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="card" style={{ background: 'white', display: 'flex', alignItems: 'center', gap: '20px', padding: '25px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📋</div>
                    <div>
                        <div style={{ fontSize: '14px', color: '#888' }}>총 점검 건수</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0056b3' }}>{stats.total}건</div>
                    </div>
                </div>
                <div className="card" style={{ background: 'white', display: 'flex', alignItems: 'center', gap: '20px', padding: '25px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎯</div>
                    <div>
                        <div style={{ fontSize: '14px', color: '#888' }}>전체 평균 점수</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#389e0d' }}>{stats.avgScore}점</div>
                    </div>
                </div>
                <div className="card" style={{ background: 'white', display: 'flex', alignItems: 'center', gap: '20px', padding: '25px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#fff7e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📈</div>
                    <div>
                        <div style={{ fontSize: '14px', color: '#888' }}>최근 1개월 점검</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d46b08' }}>
                            {audits.filter(a => new Date(a.auditDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}건
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Area */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="card" style={{ background: 'white', padding: '20px' }}>
                    <h4 style={{ marginBottom: '20px', fontSize: '16px' }}>📅 월별 점검 추이 및 평균 점수</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={stats.trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                            <RechartsTooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="평균점수" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                            <Bar yAxisId="right" dataKey="점검건수" fill="#82ca9d" opacity={0.3} radius={[4, 4, 0, 0]} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="card" style={{ background: 'white', padding: '20px' }}>
                    <h4 style={{ marginBottom: '20px', fontSize: '16px' }}>🏆 등급별 비중</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie 
                                data={stats.gradeDist} 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={70} 
                                outerRadius={100} 
                                paddingAngle={5} 
                                dataKey="value"
                                label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                                {stats.gradeDist.map((entry, index) => {
                                    let color = '#cf1322'; // D
                                    if (entry.name === 'A') color = '#389e0d';
                                    else if (entry.name === 'B') color = '#096dd9';
                                    else if (entry.name === 'C') color = '#faad14';
                                    return <Cell key={`cell-${index}`} fill={color} />;
                                })}
                            </Pie>
                            <RechartsTooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Grid Area */}
            <div className="card" style={{ background: 'white', padding: '20px', flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>📋 상세 점검 내역 (총 {audits.length}건)</h3>
                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                    <AgGridReact 
                        theme="legacy"
                        rowData={audits}
                        columnDefs={colDefs}
                        pagination={true}
                        paginationPageSize={20}
                        defaultColDef={{
                            sortable: true,
                            resizable: true,
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
        </div>
    );
};

export default ManufacturerAuditDashboard;
