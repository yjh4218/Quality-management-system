import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import * as api from './api';
import { toast } from 'react-toastify';

const AccessLogPage = () => {
    const [rowData, setRowData] = useState([]);
    const [quickFilterText, setQuickFilterText] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const data = await api.getAccessLogs();
            setRowData(data);
        } catch (error) {
            toast.error("접근 로그를 불러오는데 실패했습니다.");
        }
    };

    const columnDefs = useMemo(() => [
        { field: "id", headerName: "ID", width: 80, sort: 'desc' },
        {
            field: "createdAt", headerName: "일시", width: 180,
            valueFormatter: (params) => params.value ? new Date(params.value).toLocaleString() : ''
        },
        { field: "username", headerName: "ID", width: 120, filter: true },
        { field: "name", headerName: "사용자명", width: 120, filter: true },
        {
            field: "action",
            headerName: "액션",
            width: 120,
            filter: true,
            cellRenderer: (params) => {
                const colors = {
                    'LOGIN': '#27ae60',
                    'LOGOUT': '#e67e22',
                    'PAGE_MOVE': '#3498db'
                };
                return (
                    <span style={{
                        color: colors[params.value] || '#7f8c8d',
                        fontWeight: 'bold',
                        backgroundColor: (colors[params.value] || '#7f8c8d') + '15',
                        padding: '4px 8px',
                        borderRadius: '4px'
                    }}>
                        {params.value}
                    </span>
                );
            }
        },
        { field: "pageName", headerName: "화면명", width: 180, filter: true },
        { field: "pageUrl", headerName: "페이지 Key", width: 150 },
        { field: "ipAddress", headerName: "IP 주소", width: 140 },
        { field: "userAgent", headerName: "브라우저 정보", flex: 1, tooltipField: 'userAgent' }
    ], []);

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9' }}>
            
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
                            🕒 사용자 접근 로그
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={fetchLogs} 
                            className="secondary" 
                            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 'bold' }}
                        >
                            🔄 로그 새로고침
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
                        사용자의 로그인, 로그아웃 및 페이지 이동 이력을 모니터링합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="outline" 
                            onClick={() => alert("접근 로그 엑셀 다운로드 기능 준비 중입니다.")}
                            style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                        >
                            📊 결과 다운로드
                        </button>
                        <button 
                            className="primary" 
                            onClick={fetchLogs} 
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            🔍 조회
                        </button>
                        <button 
                            className="outline" 
                            onClick={() => setQuickFilterText('')} 
                            style={{ padding: '10px 16px', fontSize: '14px' }}
                        >
                            ♻️ 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 검색 필터 그리드 */}
            <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔍 로그 검색</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="ID, 성명, 액션 등 검색..."
                                value={quickFilterText}
                                onChange={(e) => setQuickFilterText(e.target.value)}
                                style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 데이터 카드 */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', flex: 1, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0' }}>
                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                    <AgGridReact
                        theme="legacy"
                        rowHeight={45}
                        rowData={rowData}
                        columnDefs={columnDefs}
                        pagination={true}
                        paginationPageSize={100}
                        quickFilterText={quickFilterText}
                        enableBrowserTooltips={true}
                    />
                </div>
            </div>
        </div>
    );
};

export default AccessLogPage;
