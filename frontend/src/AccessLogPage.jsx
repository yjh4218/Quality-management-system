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
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>🕒 사용자 접근 로그</h2>
                    <p style={{ fontSize: '14px', color: '#666' }}>사용자의 로그인, 로그아웃 및 페이지 이동 이력을 모니터링합니다.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder="ID, 성명, 액션 검색..."
                        value={quickFilterText}
                        onChange={(e) => setQuickFilterText(e.target.value)}
                        style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', width: '250px' }}
                    />
                    <button onClick={fetchLogs} className="outline" style={{ padding: '10px 20px' }}>
                        🔄 새로고침
                    </button>
                </div>
            </div>

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
    );
};

export default AccessLogPage;
