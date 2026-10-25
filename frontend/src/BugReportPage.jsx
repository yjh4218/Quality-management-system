import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import * as api from './api';
import { toast } from 'react-toastify';

const BugReportPage = ({ user }) => {
    const [rowData, setRowData] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [quickFilterText, setQuickFilterText] = useState('');
    const [selectedCount, setSelectedCount] = useState(0);
    const gridRef = React.useRef(null);

    const onSelectionChanged = () => {
        const selected = gridRef.current?.api?.getSelectedRows() || [];
        setSelectedCount(selected.length);
    };

    const handleBatchRead = async () => {
        const selected = gridRef.current?.api?.getSelectedRows() || [];
        if (selected.length === 0) return;
        const ids = selected.map(r => r.id);
        try {
            // 즉시 로컬 낙관적 업데이트
            setRowData(prev => prev.map(r => ids.includes(r.id) ? { ...r, isRead: true } : r));
            await api.markBugReportsAsReadBatch(ids);
            toast.success(`선택한 ${ids.length}건의 리포트를 읽음 확인 처리했습니다.`);
            window.dispatchEvent(new CustomEvent('bug-reports-updated'));
            await fetchReports();
            gridRef.current?.api?.deselectAll();
        } catch (e) {
            toast.error("일괄 읽음 확인 실패");
            fetchReports();
        }
    };

    const handleBatchStatus = async (status) => {
        const selected = gridRef.current?.api?.getSelectedRows() || [];
        if (selected.length === 0) return;
        const ids = selected.map(r => r.id);
        try {
            // 즉시 로컬 낙관적 업데이트
            setRowData(prev => prev.map(r => ids.includes(r.id) ? { ...r, status, isRead: true } : r));
            await api.updateBugReportsBatchStatus(ids, status);
            toast.success(`선택한 ${ids.length}건의 상태를 ${status}로 변경했습니다.`);
            window.dispatchEvent(new CustomEvent('bug-reports-updated'));
            await fetchReports();
            gridRef.current?.api?.deselectAll();
        } catch (e) {
            toast.error("일괄 상태 변경 실패");
            fetchReports();
        }
    };

    const handleReadAll = async () => {
        try {
            // 즉시 로컬 낙관적 업데이트
            setRowData(prev => prev.map(r => ({ ...r, isRead: true })));
            await api.markAllBugReportsAsRead();
            toast.success("모든 리포트를 읽음 확인 처리했습니다.");
            window.dispatchEvent(new CustomEvent('bug-reports-updated'));
            await fetchReports();
            gridRef.current?.api?.deselectAll();
        } catch (e) {
            toast.error("전체 읽음 처리 실패");
            fetchReports();
        }
    };

    const handleOpenDetail = async (report) => {
        if (!report) return;
        const willMarkAsRead = !report.isRead;
        const updatedReport = willMarkAsRead ? { ...report, isRead: true, readAt: new Date().toISOString() } : report;
        
        setSelectedReport(updatedReport);

        if (willMarkAsRead) {
            // 상세 열람 시 즉시 로컬 읽음 처리 (낙관적 UI 반영)
            setRowData(prev => prev.map(r => r.id === report.id ? { ...r, isRead: true, readAt: updatedReport.readAt } : r));
            try {
                await api.markBugReportsAsReadBatch([report.id]);
                window.dispatchEvent(new CustomEvent('bug-reports-updated'));
            } catch (e) {
                console.debug("Failed to mark bug report as read", e);
            }
        }
    };

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
            window.dispatchEvent(new CustomEvent('bug-reports-updated'));
            fetchReports();
            if (selectedReport?.id === id) {
                setSelectedReport(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            toast.error("상태 변경 실패");
        }
    };

    const handleCopy = () => {
        if (!selectedReport) return;
        
        const textToCopy = `
[버그 리포트 #${selectedReport.id}]
상태: ${selectedReport.status}
심각도: ${selectedReport.severity}
발생 위치: ${selectedReport.screenName} (${selectedReport.url})
신고자: ${selectedReport.reporterName} (${selectedReport.reporterUsername})
신고일시: ${new Date(selectedReport.createdAt).toLocaleString()}

[상세 내용]
${selectedReport.description}

[재현 경로]
${selectedReport.steps || '기록 없음'}

[서버 오류]
${selectedReport.serverError || '없음'}
        `.trim();

        navigator.clipboard.writeText(textToCopy)
            .then(() => toast.success("리포트 내용이 클립보드에 복사되었습니다."))
            .catch(() => toast.error("복사에 실패했습니다."));
    };

    const columnDefs = useMemo(() => [
        {
            headerName: '',
            width: 48,
            pinned: 'left',
            lockPosition: true,
            headerCheckboxSelection: true,
            checkboxSelection: true,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        { 
            field: "id", 
            headerName: "ID", 
            width: 100,
            cellRenderer: (p) => {
                const isUnread = p.data && p.data.isRead === false;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isUnread ? (
                            <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: '900', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                NEW
                            </span>
                        ) : (
                            <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                읽음
                            </span>
                        )}
                        <span style={{ fontWeight: isUnread ? '900' : '600' }}>{p.value}</span>
                    </div>
                );
            }
        },
        {
            field: "status",
            headerName: "상태",
            width: 110,
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
            field: "occurrenceCount",
            headerName: "발생 횟수",
            width: 130,
            cellRenderer: (params) => {
                const count = params.value || 1;
                if (count >= 2) {
                    return (
                        <span style={{
                            backgroundColor: '#fff3bf',
                            color: '#d9480f',
                            border: '1px solid #ffe066',
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '800'
                        }}>
                            🔁 {count}회 반복 발생
                        </span>
                    );
                }
                return <span style={{ color: '#495057', fontSize: '12px', fontWeight: 'bold' }}>1회</span>;
            }
        },
        {
            field: "severity",
            headerName: "심각도",
            width: 95,
            cellRenderer: (params) => {
                const colors = { 'LOW': '#868e96', 'MEDIUM': '#339af0', 'HIGH': '#f08c00', 'CRITICAL': '#e03131' };
                return <span style={{ color: colors[params.value] || '#000', fontWeight: 'bold' }}>{params.value}</span>
            }
        },
        { field: "screenName", headerName: "발생 화면", width: 140 },
        { field: "description", headerName: "내용 요약", flex: 1, tooltipField: 'description' },
        { field: "reporterName", headerName: "신고자", width: 110 },
        { 
            field: "updatedAt", 
            headerName: "최근 발생시각", 
            width: 160, 
            valueFormatter: p => (p.value || p.data?.createdAt) ? new Date(p.value || p.data?.createdAt).toLocaleString() : '' 
        },
        {
            headerName: "작업",
            width: 100,
            cellRenderer: (params) => (
                <button className="btn-small outline" onClick={() => handleOpenDetail(params.data)}>
                    상세보기
                </button>
            )
        }
    ], []);

    const getRowStyle = (params) => {
        // 관리자가 아직 열람/확인하지 않은 신규 리포트만 붉은색 강조, 확인 완료 건은 일반 스타일로 표시
        if (params.data && params.data.isRead === false) {
            return {
                fontWeight: 800,
                backgroundColor: '#fff5f5',
                color: '#991b1b'
            };
        }
        return null;
    };

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
                            🐞 버그 리포트 관리
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {selectedCount > 0 && (
                            <>
                                <button
                                    onClick={handleBatchRead}
                                    className="primary"
                                    style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#2563eb' }}
                                >
                                    ✓ 선택 읽음 확인 ({selectedCount}건)
                                </button>
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleBatchStatus(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                    defaultValue=""
                                    style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#1e293b' }}
                                >
                                    <option value="" disabled>⚙️ 상태 일괄 변경...</option>
                                    <option value="OPEN">접수(OPEN)</option>
                                    <option value="IN_PROGRESS">처리중(IN_PROGRESS)</option>
                                    <option value="RESOLVED">해결됨(RESOLVED)</option>
                                    <option value="CLOSED">닫힘(CLOSED)</option>
                                </select>
                            </>
                        )}
                        <button
                            onClick={handleReadAll}
                            className="secondary"
                            style={{ padding: '8px 14px', fontSize: '13px' }}
                        >
                            ✓ 전체 읽음 확인
                        </button>
                        <button
                            onClick={fetchReports}
                            className="secondary"
                            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 'bold' }}
                        >
                            🔄 리포트 새로고침
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
                        사용자들이 보고한 버그 및 시스템 오류를 확인하고 처리합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="outline"
                            onClick={() => alert("버그 리포트 엑셀 다운로드 기능 준비 중입니다.")}
                            style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                        >
                            📊 결과 다운로드
                        </button>
                        <button
                            className="primary"
                            onClick={fetchReports}
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
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔍 리포트 검색</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="화면명, 신고자, 내용 검색..."
                                value={quickFilterText}
                                onChange={(e) => setQuickFilterText(e.target.value)}
                                style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: 0 }}>
                <div className="ag-theme-alpine" style={{ flex: 1, height: '100%' }}>
                    <AgGridReact
                        ref={gridRef}
                        theme="legacy"
                        rowHeight={54}
                        rowData={rowData}
                        columnDefs={columnDefs}
                        pagination={true}
                        paginationPageSize={50}
                        rowSelection="multiple"
                        suppressRowClickSelection={true}
                        onSelectionChanged={onSelectionChanged}
                        quickFilterText={quickFilterText}
                        onRowClicked={(e) => {
                            if (e.event?.target?.closest('.ag-selection-checkbox') || e.event?.target?.type === 'checkbox') {
                                return;
                            }
                            handleOpenDetail(e.data);
                        }}
                        getRowStyle={getRowStyle}
                    />
                </div>

                {selectedReport && (
                    <div style={{ width: '500px', minWidth: '500px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6', padding: '20px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 style={{ margin: 0 }}>Report Detail</h3>
                                {selectedReport.isRead ? (
                                    <span style={{
                                        backgroundColor: '#ecfdf5',
                                        color: '#047857',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        border: '1px solid #a7f3d0'
                                    }}>
                                        ✓ 읽음
                                    </span>
                                ) : (
                                    <span style={{
                                        backgroundColor: '#fef2f2',
                                        color: '#b91c1c',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        border: '1px solid #fecaca'
                                    }}>
                                        NEW 미확인
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    className="btn-small outline" 
                                    onClick={handleCopy}
                                    style={{ padding: '4px 12px', fontSize: '11px', borderColor: '#2563eb', color: '#2563eb' }}
                                >
                                    📋 복사하기
                                </button>
                                <button className="close-button" onClick={() => setSelectedReport(null)}>&times;</button>
                            </div>
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
                                color: '#444',
                                fontFamily: 'monospace'
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
                                    color: '#c92a2a',
                                    fontFamily: 'monospace'
                                }}>
                                    {selectedReport.serverError}
                                </div>
                            </div>
                        )}

                        <div className="info-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>상세 내용</label>
                            <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #eee', fontSize: '14px', marginTop: '5px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                                {selectedReport.description}
                            </div>
                        </div>

                        <div className="info-group">
                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>신고자 및 발생 이력 정보</label>
                            <div style={{ marginTop: '5px', fontSize: '14px', backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #eee' }}>
                                <div><strong>신고자:</strong> {selectedReport.reporterName} ({selectedReport.reporterUsername})</div>
                                <div><strong>누적 발생 횟수:</strong> <span style={{ color: selectedReport.occurrenceCount >= 2 ? '#d9480f' : '#333', fontWeight: 'bold' }}>{selectedReport.occurrenceCount || 1} 회</span></div>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                    최초 신고: {new Date(selectedReport.createdAt).toLocaleString()} <br />
                                    최근 발생: {selectedReport.updatedAt ? new Date(selectedReport.updatedAt).toLocaleString() : '최초 1회 발생'}
                                    {selectedReport.readAt && (
                                        <>
                                            <br />
                                            읽음 확인: {new Date(selectedReport.readAt).toLocaleString()} {selectedReport.readBy ? `(${selectedReport.readBy})` : ''}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BugReportPage;
