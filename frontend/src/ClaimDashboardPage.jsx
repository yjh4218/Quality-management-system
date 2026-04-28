import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getClaimDashboard } from './api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import ClaimDrawer from './ClaimDrawer';

// ==========================================
// PRODUCTION READY - PERFORMANCE OPTIMIZED
// ==========================================

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CF8', '#FF6666'];

// MOUNT LOOP KILLER - GLOBAL DATA STORE
let globalDashboardData = { stats: null, claims: [], key: '' };
let globalDashboardPromise = null;

function ClaimDashboardPage({ user, onNavigate }) {
    const hasEffectRun = useRef(false);
    
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

    if (!stats && loading) return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner-ring" style={{ width: '40px', height: '40px', margin: '0 auto 15px' }}></div>
                <div style={{ fontSize: '18px', color: '#666' }}>데이터를 분석 중입니다...</div>
            </div>
        </div>
    );

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
    const categoryData = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] }));
    const monthlyData = Object.keys(monthlyMap).sort().map(k => ({ name: k, 클레임발생건수: monthlyMap[k] }));

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5', overflowY: 'auto' }}>
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                        <button className="secondary" onClick={() => onNavigate('claims')} style={{ marginBottom: '10px' }}>&larr; 클레임 관리로 돌아가기</button>
                        <h2 style={{ fontSize: '26px', fontWeight: 'bold', margin: 0 }}>📊 클레임 종합 대시보드</h2>
                        <p style={{ color: '#666', margin: '5px 0 0 0' }}>품질 이슈 실시간 모니터링 및 분석</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{display:'block', fontSize:'12px', color:'#666', marginBottom:'5px'}}>조회 시작일</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{padding:'8px', border:'1px solid #ced4da', borderRadius:'4px'}} />
                    </div>
                    <div>
                        <label style={{display:'block', fontSize:'12px', color:'#666', marginBottom:'5px'}}>조회 종료일</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{padding:'8px', border:'1px solid #ced4da', borderRadius:'4px'}} />
                    </div>
                    <div>
                        <label style={{display:'block', fontSize:'12px', color:'#666', marginBottom:'5px'}}>품목코드</label>
                        <input type="text" placeholder="품목코드" value={itemCode} onChange={e => setItemCode(e.target.value)} style={{padding:'8px', border:'1px solid #ced4da', borderRadius:'4px', width: '120px'}} />
                    </div>
                    <div>
                        <label style={{display:'block', fontSize:'12px', color:'#666', marginBottom:'5px'}}>품목명</label>
                        <input type="text" placeholder="품목명" value={productName} onChange={e => setProductName(e.target.value)} style={{padding:'8px', border:'1px solid #ced4da', borderRadius:'4px', width: '150px'}} />
                    </div>
                    {!isManufacturer && (
                        <div>
                            <label style={{display:'block', fontSize:'12px', color:'#666', marginBottom:'5px'}}>제조사</label>
                            <input type="text" placeholder="제조사명" value={manufacturer} onChange={e => setManufacturer(e.target.value)} style={{padding:'8px', border:'1px solid #ced4da', borderRadius:'4px', width: '130px'}} />
                        </div>
                    )}
                    <button className="primary" onClick={handleSearch} disabled={loading}>{loading ? '조회 중...' : '조회'}</button>
                    <button className="secondary" onClick={handleReset} disabled={loading}>초기화</button>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="card" style={{ background: '#f8f9fa' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>🏆 최근 1개월 최다 발생품목</h4>
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {stats.topProductsByBrand && Object.keys(stats.topProductsByBrand).length > 0 ? (
                            Object.entries(stats.topProductsByBrand).map(([brand, products]) => (
                                <div key={brand} style={{ marginBottom: '10px' }}>
                                    <strong style={{ color: '#0056b3', fontSize: '13px' }}>{brand}</strong>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#555' }}>
                                        {products.map((p, idx) => (
                                            <li key={idx} style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleTopProductClick(p.itemCode, p.productName)}>
                                                [{p.itemCode}] {p.productName} ({p.count}건)
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))
                        ) : <p style={{ color: '#888', fontSize: '13px' }}>내역 없음</p>}
                    </div>
                </div>

                <div className="card" style={{ background: '#f8f9fa' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>⚠ 최다 발생 클레임 유형</h4>
                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {stats.topCategories && stats.topCategories.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#555' }}>
                                {stats.topCategories.map((cat, idx) => (
                                    <li key={idx} style={{ marginBottom: '5px', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleTopCategoryClick(cat.category)}>
                                        <strong>{cat.category}</strong> ({cat.count}건)
                                    </li>
                                ))}
                            </ul>
                        ) : <p style={{ color: '#888', fontSize: '13px' }}>내역 없음</p>}
                    </div>
                </div>

                <div className="card" style={{ background: '#f8f9fa' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📅 발생 현황 요약</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                        <div style={{ background: 'white', padding: '8px', textAlign: 'center', borderRadius: '4px' }}>
                            <div style={{ fontSize: '11px', color: '#888' }}>이번달</div>
                            <strong>{stats.thisMonthCount}건</strong>
                        </div>
                        <div style={{ background: 'white', padding: '8px', textAlign: 'center', borderRadius: '4px' }}>
                            <div style={{ fontSize: '11px', color: '#888' }}>전달</div>
                            <strong>{stats.lastMonthCount}건</strong>
                        </div>
                        <div style={{ background: 'white', padding: '8px', textAlign: 'center', borderRadius: '4px' }}>
                            <div style={{ fontSize: '11px', color: '#888' }}>전분기</div>
                            <strong>{stats.lastQuarterCount}건</strong>
                        </div>
                        <div style={{ background: 'white', padding: '8px', textAlign: 'center', borderRadius: '4px' }}>
                            <div style={{ fontSize: '11px', color: '#888' }}>최근1년</div>
                            <strong>{stats.oneYearCount}건</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Area */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                <div className="card">
                    <h4 style={{ marginBottom: '15px' }}>접수 추이</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={monthlyData} onClick={handleMonthClick} style={{cursor:'pointer'}}>
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <RechartsTooltip />
                            <Bar dataKey="클레임발생건수" fill="#8884d8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card">
                    <h4 style={{ marginBottom: '15px' }}>국가별 비중</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={countryData} cx="50%" cy="50%" outerRadius={80} label dataKey="value" onClick={handleCountryClick} style={{cursor:'pointer'}}>
                                {countryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Grid Area - Search Results */}
            <div className="card" style={{ marginTop: '20px', flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>📋 클레임 조회 결과 목록 (총 {claims?.length || 0}건)</h3>
                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                    <AgGridReact
                        theme="legacy"
                        rowData={claims || []}
                        columnDefs={columnDefs}
                        pagination={true}
                        paginationPageSize={10}
                        onRowDoubleClicked={handleRowDoubleClick}
                    />
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
                        <div className="ag-theme-alpine" style={{ flex: 1 }}>
                            <AgGridReact
                                theme="legacy"
                                rowData={modalData}
                                columnDefs={columnDefs}
                                pagination={true}
                                onRowDoubleClicked={handleRowDoubleClick}
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
        </div>
    );
}

const FinalClaimDashboardPage = React.memo(ClaimDashboardPage);
export default FinalClaimDashboardPage;
