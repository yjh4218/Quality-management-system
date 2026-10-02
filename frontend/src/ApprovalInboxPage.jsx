import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { fetchApprovalInbox, markApprovalDocumentAsRead } from './api';
import ApprovalSubmitModal from './ApprovalSubmitModal';

const TAB_CONFIG = {
    'PENDING': { label: '📥 결재 대기함', desc: '내가 지금 검토 및 승인/반려해야 하는 결재 문서입니다.' },
    'SUBMITTED': { label: '📤 기안 문서함', desc: '내가 작성하여 상신한 결재 문서의 진행 상태를 확인합니다.' },
    'IN_PROGRESS': { label: '⏳ 진행 중 문서', desc: '현재 부서/결재선에서 결재가 진행 중인 전체 문서 목록입니다.' },
    'COMPLETED': { label: '✅ 결재 완료함', desc: '모든 결재선 검토를 거쳐 최종 승인이 완료된 문서입니다.' },
    'REJECTED': { label: '🚫 반려 문서함', desc: '결재선 중 반려 처리가 발생한 문서입니다. 사유를 확인하고 재상신할 수 있습니다.' },
    'REFERENCE': { label: '👁️ 참조 문서함', desc: '본인이 참조자로 지정되어 열람 가능한 결재 문서입니다.' },
    'PROCESSED': { label: '📑 내 결재 내역', desc: '내가 과거에 승인 또는 반려했던 문서 이력입니다.' }
};

const ApprovalInboxPage = ({ 
    currentUser, 
    navigationData, 
    onNavigated, 
    fixedTab = null,
    onUnreadChanged,
    showAlert = (msg) => console.info(msg), 
    showConfirm = (msg, fn) => { if (window.confirm(msg)) fn?.(); } 
}) => {
    const [activeTab, setActiveTab] = useState(fixedTab || 'PENDING');
    const [rowData, setRowData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [unreadOnly, setUnreadOnly] = useState(false);

    // fixedTab prop이 변경되면 activeTab 동기화
    useEffect(() => {
        if (fixedTab) {
            setActiveTab(fixedTab);
        }
    }, [fixedTab]);

    // URL or Navigation 파라미터 처리 (?docId=123)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const docIdParam = params.get('docId') || navigationData?.documentId;
        if (docIdParam) {
            setSelectedDocId(Number(docIdParam));
            if (onNavigated) onNavigated();
        }
    }, [navigationData, onNavigated]);

    const loadInbox = useCallback(async () => {
        try {
            setLoading(true);
            const currentTargetTab = fixedTab || activeTab;
            const res = await fetchApprovalInbox(currentTargetTab, 0, 100);
            setRowData(res.data?.content || []);
        } catch (err) {
            showAlert?.("결재 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [fixedTab, activeTab, showAlert]);

    useEffect(() => {
        loadInbox();
    }, [loadInbox]);

    // 읽지 않은 문서 수 계산
    const unreadCount = useMemo(() => {
        return rowData.filter(d => !d.isRead).length;
    }, [rowData]);

    // 필터링된 데이터
    const displayedData = useMemo(() => {
        if (!unreadOnly) return rowData;
        return rowData.filter(d => !d.isRead);
    }, [rowData, unreadOnly]);

    // 문서 열람 및 읽음 처리
    const handleDocumentClick = useCallback((doc) => {
        if (!doc) return;
        setSelectedDocId(doc.id);

        if (!doc.isRead) {
            markApprovalDocumentAsRead(doc.id).catch(() => {});
            setRowData(prev => prev.map(item => item.id === doc.id ? { ...item, isRead: true } : item));
            if (onUnreadChanged) {
                onUnreadChanged();
            }
        }
    }, [onUnreadChanged]);

    const tabs = [
        { key: 'PENDING', label: '📥 결재 대기함' },
        { key: 'SUBMITTED', label: '📤 기안 문서함' },
        { key: 'IN_PROGRESS', label: '⏳ 진행 중 문서' },
        { key: 'COMPLETED', label: '✅ 결재 완료함' },
        { key: 'REJECTED', label: '🚫 반려 문서함' },
        { key: 'REFERENCE', label: '👁️ 참조 문서함' },
        { key: 'PROCESSED', label: '📑 내 결재 내역' }
    ];

    const currentTabInfo = TAB_CONFIG[fixedTab || activeTab] || { label: '📋 전자결재함', desc: '결재 문서 목록입니다.' };

    const columnDefs = useMemo(() => [
        { 
            headerName: '결재 ID', 
            field: 'id', 
            width: 85, 
            cellStyle: { textAlign: 'center', fontWeight: 'bold' } 
        },
        {
            headerName: '문서 유형', 
            field: 'docTypeName', 
            width: 140,
            cellRenderer: (p) => (
                <span style={{ backgroundColor: '#f1f5f9', color: '#1e293b', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                    {p.value || p.data.docTypeCode}
                </span>
            )
        },
        {
            headerName: '결재 문서 제목', 
            field: 'title', 
            flex: 1,
            minWidth: 320,
            cellClass: 'approval-title-cell',
            headerClass: 'approval-title-header',
            cellStyle: { justifyContent: 'flex-start', textAlign: 'left' },
            cellRenderer: (p) => {
                const isRead = Boolean(p.data?.isRead);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', width: '100%', justifyContent: 'flex-start' }}>
                        {!isRead ? (
                            <span 
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#2563eb',
                                    color: '#fff',
                                    fontSize: '10px',
                                    fontWeight: '900',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    lineHeight: '1.2',
                                    flexShrink: 0
                                }}
                                title="읽지 않은 새 결재 문서"
                            >
                                NEW
                            </span>
                        ) : null}
                        <span style={{ 
                            fontWeight: isRead ? '400' : '700', 
                            color: isRead ? '#475569' : '#0f172a',
                            fontSize: '13px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {p.value}
                        </span>
                    </div>
                );
            }
        },
        {
            headerName: '진행 상태', 
            field: 'status', 
            width: 110, 
            cellStyle: { textAlign: 'center' },
            cellRenderer: (p) => {
                const config = {
                    'PENDING': { bg: '#e0f2fe', color: '#0369a1', text: '진행중' },
                    'APPROVED': { bg: '#dcfce7', color: '#15803d', text: '승인완료' },
                    'REJECTED': { bg: '#fee2e2', color: '#b91c1c', text: '반려' },
                    'RECALLED': { bg: '#f1f5f9', color: '#64748b', text: '회수' }
                }[p.value] || { bg: '#f1f5f9', color: '#64748b', text: p.value };

                return (
                    <span style={{ backgroundColor: config.bg, color: config.color, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        {config.text}
                    </span>
                );
            }
        },
        {
            headerName: '상신자', 
            field: 'submittedByName', 
            width: 120,
            cellStyle: { textAlign: 'center' },
            cellRenderer: (p) => p.value || '-'
        },
        {
            headerName: '현재 결재 대기자', 
            field: 'currentAssigneeNames', 
            width: 170,
            cellRenderer: (p) => {
                const names = p.value || [];
                if (names.length === 0) return <span style={{ color: '#94a3b8' }}>-</span>;
                return (
                    <span style={{ color: '#b45309', fontWeight: 'bold', fontSize: '12px' }}>
                        ⏳ {names.join(', ')}
                    </span>
                );
            }
        }
    ], []);

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', boxSizing: 'border-box' }}>
            {/* 1. Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                            {currentTabInfo.label}
                        </h2>
                        {/* 읽지 않은 건수 뱃지 (숫자 표시) */}
                        <span style={{
                            backgroundColor: unreadCount > 0 ? '#ef4444' : '#64748b',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            읽지 않음 {unreadCount}건
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                            (총 {rowData.length}건)
                        </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                        {currentTabInfo.desc}
                    </p>
                </div>

                {/* 우측 제어: [읽지 않은 항목만 보기] 체크박스 + 신규 상신 + 새로고침 */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '13px', 
                        fontWeight: 'bold', 
                        color: unreadOnly ? '#2563eb' : '#475569',
                        background: unreadOnly ? '#eff6ff' : '#f8fafc',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        border: unreadOnly ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                        cursor: 'pointer'
                    }}>
                        <input
                            type="checkbox"
                            checked={unreadOnly}
                            onChange={(e) => setUnreadOnly(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        <span>읽지 않은 항목만 보기 ({unreadCount})</span>
                    </label>

                    <button
                        onClick={() => setSubmitModalOpen(true)}
                        style={{ padding: '8px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        ➕ 신규 결재 상신
                    </button>
                    <button
                        onClick={loadInbox}
                        style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                    >
                        🔄 새로고침
                    </button>
                </div>
            </div>

            {/* 2. fixedTab이 없을 때만 탭 바 노출 */}
            {!fixedTab && (
                <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0px' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: '10px 16px',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                border: 'none',
                                borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
                                marginBottom: '-2px',
                                backgroundColor: 'transparent',
                                color: activeTab === tab.key ? '#2563eb' : '#64748b',
                                cursor: 'pointer'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* 3. 그리드 */}
            <div className="ag-theme-alpine approval-inbox-grid" style={{ width: '100%', flex: 1, minHeight: '400px' }}>
                <AgGridReact
                    theme="legacy"
                    rowData={displayedData}
                    columnDefs={columnDefs}
                    animateRows={true}
                    headerHeight={40}
                    rowHeight={46}
                    rowSelection={{ mode: 'singleRow' }}
                    onRowClicked={(e) => handleDocumentClick(e.data)}
                    defaultColDef={{ resizable: true, sortable: true, filter: true }}
                />
            </div>

            {/* 결재 상세/처리 모달 */}
            {selectedDocId && (
                <ApprovalSubmitModal
                    isOpen={Boolean(selectedDocId)}
                    mode="VIEW"
                    documentId={selectedDocId}
                    onClose={() => setSelectedDocId(null)}
                    onActionCompleted={() => {
                        loadInbox();
                        if (onUnreadChanged) onUnreadChanged();
                    }}
                    currentUser={currentUser}
                    showAlert={showAlert}
                    showConfirm={showConfirm}
                />
            )}

            {/* 신규 결재 상신 모달 */}
            {submitModalOpen && (
                <ApprovalSubmitModal
                    isOpen={submitModalOpen}
                    mode="CREATE"
                    onClose={() => setSubmitModalOpen(false)}
                    onSubmitted={() => {
                        loadInbox();
                        if (onUnreadChanged) onUnreadChanged();
                    }}
                    onActionCompleted={() => {
                        loadInbox();
                        if (onUnreadChanged) onUnreadChanged();
                    }}
                    currentUser={currentUser}
                    showAlert={showAlert}
                    showConfirm={showConfirm}
                />
            )}
        </div>
    );
};

export default ApprovalInboxPage;
