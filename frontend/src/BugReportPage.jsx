import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import * as api from './api';
import { toast } from 'react-toastify';

const BugReportPage = ({ user }) => {
    const [rowData, setRowData] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [quickFilterText, setQuickFilterText] = useState('');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const data = await api.getBugReports();
            setRowData(data);
        } catch (error) {
            toast.error("버그 리포트를 불러오는데 실패했습니다.");
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await api.updateBugReportStatus(id, newStatus);
            toast.success(`상태가 ${newStatus}로 변경되었습니다.`);
            fetchReports();
            if (selectedReport?.id === id) {
                setSelectedReport(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            toast.error("상태 변경 실패");
        }
    };

    const columnDefs = useMemo(() => [
        { field: "id", headerName: "ID", width: 70, sort: 'desc' },
        {
            field: "status",
            headerName: "상태",
            width: 120,
            cellRenderer: (params) => {
                const styles = {
                    'OPEN': { bg: '#fff0f0', color: '#e74c3c', text: '접수' },
                    'IN_PROGRESS': { bg: '#fff9db', color: '#f08c00', text: '처리중' },
                    'RESOLVED': { bg: '#ebfbee', color: '#2b8a3e', text: '해결됨' },
                    'CLOSED': { bg: '#f1f3f5', color: '#868e96', text: '닫힘' }
                };
                const style = styles[params.value] || styles['OPEN'];
                return (
                    <span style={{
                        backgroundColor: style.bg,
                        color: style.color,
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }}>
                        {style.text}
                    </span>
                );
            }
        },
        {
            field: "severity",
            headerName: "심각도",
            width: 100,
            cellRenderer: (params) => {
                const colors = { 'LOW': '#868e96', 'MEDIUM': '#339af0', 'HIGH': '#f08c00', 'CRITICAL': '#e03131' };
                return <span style={{ color: colors[params.value] || '#000', fontWeight: 'bold' }}>{params.value}</span>
            }
        },
        { field: "screenName", headerName: "발생 화면", width: 150 },
        { field: "description", headerName: "내용 요약", flex: 1, tooltipField: 'description' },
        { field: "reporterName", headerName: "신고자", width: 120 },
        { field: "createdAt", headerName: "신고일시", width: 160, valueFormatter: p => p.value ? new Date(p.value).toLocaleString() : '' },
        {
            headerName: "작업",
            width: 100,
            cellRenderer: (params) => (
                <button className="btn-small outline" onClick={() => setSelectedReport(params.data)}>
                    상세보기
                </button>
            )
        }
    ], []);

    return (
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>🐞 버그 리포트 관리</h2>
                    <p style={{ fontSize: '14px', color: '#666' }}>사용자들이 보고한 버그를 확인하고 처리 상태를 관리합니다.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder="화면명, 신고자, 내용 검색..."
                        value={quickFilterText}
                        onChange={(e) => setQuickFilterText(e.target.value)}
                        style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', width: '250px' }}
                    />
                    <button onClick={fetchReports} className="outline" style={{ padding: '10px 20px' }}>
                        🔄 새로고침
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: 0 }}>
                <div className="ag-theme-alpine" style={{ flex: 1, height: '100%' }}>
                    <AgGridReact
                        theme="legacy"
                        rowHeight={45}
                        rowData={rowData}
                        columnDefs={columnDefs}
                        pagination={true}
                        paginationPageSize={50}
                        quickFilterText={quickFilterText}
                        onRowClicked={(e) => setSelectedReport(e.data)}
                    />
                </div>

                {selectedReport && (
                    <div style={{ width: '400px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6', padding: '20px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Report Detail</h3>
                            <button className="close-button" onClick={() => setSelectedReport(null)}>&times;</button>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontSize: '12px', color: '#868e96', display: 'block', marginBottom: '4px' }}>상태 변경</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
                                    <button
                                        key={s}
                                        className={`btn-small ${selectedReport.status === s ? 'primary' : 'outline'}`}
                                        onClick={() => handleUpdateStatus(selectedReport.id, s)}
                                        style={{ flex: 1, fontSize: '10px' }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="info-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>발생 위치</label>
                            <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #eee', fontSize: '14px', marginTop: '5px' }}>
                                {selectedReport.screenName} <br />
                                <small style={{ color: '#666', wordBreak: 'break-all' }}>{selectedReport.url}</small>
                            </div>
                        </div>

                        <div className="info-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>심각도</label>
                            <div style={{ marginTop: '5px' }}>{selectedReport.severity}</div>
                        </div>

                        <div className="info-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>재현 경로</label>
                            <div style={{
                                backgroundColor: '#fff',
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #eee',
                                fontSize: '12px',
                                marginTop: '5px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                overflowWrap: 'anywhere',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                color: '#444'
                            }}>
                                {selectedReport.steps || '기록 없음'}
                            </div>
                        </div>

                        {selectedReport.serverError && (
                            <div className="info-group" style={{ marginBottom: '15px' }}>
                                <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#e03131' }}>서버 오류 내용</label>
                                <div style={{
                                    backgroundColor: '#fff5f5',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    border: '1px solid #ffa8a8',
                                    fontSize: '12px',
                                    marginTop: '5px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    overflowWrap: 'anywhere',
                                    maxHeight: '150px',
                                    overflowY: 'auto',
                                    color: '#c92a2a',
                                    fontFamily: 'monospace'
                                }}>
                                    {selectedReport.serverError}
                                </div>
                            </div>
                        )}

                        <div className="info-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>상세 내용</label>
                            <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #eee', fontSize: '14px', marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                                {selectedReport.description}
                            </div>
                        </div>

                        <div className="info-group">
                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>신고자 정보</label>
                            <div style={{ marginTop: '5px', fontSize: '14px' }}>
                                {selectedReport.reporterName} ({selectedReport.reporterUsername}) <br />
                                <small style={{ color: '#999' }}>{new Date(selectedReport.createdAt).toLocaleString()}</small>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BugReportPage;
