import React, { useState, useEffect, useCallback } from 'react';
import {
    fetchApprovalDocumentDetail,
    approveApprovalDocument,
    rejectApprovalDocument,
    recallApprovalDocument,
    addAdhocApprover,
    fetchCompanyUsersForApproval
} from './api';

const ApprovalDetailDrawer = ({ documentId, onClose, onActionCompleted, showAlert, showConfirm }) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    const [commentModal, setCommentModal] = useState({ open: false, type: 'APPROVE', comment: '' });
    const [adhocModal, setAdhocModal] = useState(false);
    const [adhocForm, setAdhocForm] = useState({ userId: '', stepType: 'APPROVAL' });
    const [userSearchText, setUserSearchText] = useState('');
    const [companyUsers, setCompanyUsers] = useState([]);

    const loadDetail = useCallback(async () => {
        if (!documentId) return;
        try {
            setLoading(true);
            const res = await fetchApprovalDocumentDetail(documentId);
            setDetail(res.data);
        } catch (err) {
            showAlert?.("결재 문서 상세 정보를 불러오지 못했습니다.");
            onClose();
        } finally {
            setLoading(false);
        }
    }, [documentId, onClose, showAlert]);

    useEffect(() => {
        loadDetail();
    }, [loadDetail]);

    // 회사 사용자 검색 (Ad-hoc 용)
    const searchUsers = useCallback(async (kw) => {
        if (!detail?.submittedByCompanyName) return;
        try {
            const res = await fetchCompanyUsersForApproval(kw, detail.submittedByCompanyName);
            setCompanyUsers(res.data || []);
        } catch (err) {
            console.error("Failed to search users", err);
        }
    }, [detail]);

    useEffect(() => {
        if (adhocModal) {
            searchUsers(userSearchText);
        }
    }, [adhocModal, userSearchText, searchUsers]);

    // 승인 실행
    const handleApprove = async () => {
        try {
            await approveApprovalDocument(documentId, commentModal.comment);
            showAlert?.("결재가 승인되었습니다.");
            setCommentModal({ open: false, type: 'APPROVE', comment: '' });
            loadDetail();
            onActionCompleted?.();
        } catch (err) {
            showAlert?.(err.response?.data?.message || "승인 처리에 실패했습니다.");
        }
    };

    // 반려 실행
    const handleReject = async () => {
        if (!commentModal.comment?.trim()) {
            showAlert?.("반려 사유를 필수로 입력해야 합니다.");
            return;
        }
        try {
            await rejectApprovalDocument(documentId, commentModal.comment);
            showAlert?.("결재가 반려되었습니다.");
            setCommentModal({ open: false, type: 'REJECT', comment: '' });
            loadDetail();
            onActionCompleted?.();
        } catch (err) {
            showAlert?.(err.response?.data?.message || "반려 처리에 실패했습니다.");
        }
    };

    // 회수 실행
    const handleRecall = () => {
        showConfirm?.("상신한 결재 문서를 회수하시겠습니까?", async () => {
            try {
                await recallApprovalDocument(documentId);
                showAlert?.("결재 문서가 회수되었습니다.");
                loadDetail();
                onActionCompleted?.();
            } catch (err) {
                showAlert?.(err.response?.data?.message || "회수 처리에 실패했습니다.");
            }
        });
    };

    // Ad-hoc 결재자 추가
    const handleAddAdhoc = async (e) => {
        e.preventDefault();
        if (!adhocForm.userId) {
            showAlert?.("추가할 사용자를 선택해 주세요.");
            return;
        }
        try {
            await addAdhocApprover(documentId, Number(adhocForm.userId), adhocForm.stepType);
            showAlert?.("결재선에 추가되었습니다.");
            setAdhocModal(false);
            setAdhocForm({ userId: '', stepType: 'APPROVAL' });
            loadDetail();
            onActionCompleted?.();
        } catch (err) {
            showAlert?.("결재자 추가에 실패했습니다.");
        }
    };

    if (!documentId) return null;

    const statusBadge = (status) => {
        const config = {
            'PENDING': { bg: '#e0f2fe', color: '#0369a1', text: '진행중' },
            'APPROVED': { bg: '#dcfce7', color: '#15803d', text: '승인완료' },
            'REJECTED': { bg: '#fee2e2', color: '#b91c1c', text: '반려됨' },
            'RECALLED': { bg: '#f1f5f9', color: '#64748b', text: '회수됨' }
        }[status] || { bg: '#f1f5f9', color: '#64748b', text: status };

        return (
            <span style={{ backgroundColor: config.bg, color: config.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                {config.text}
            </span>
        );
    };

    const stepStatusBadge = (status) => {
        const config = {
            'PENDING': { bg: '#fef3c7', color: '#92400e', text: '대기' },
            'APPROVED': { bg: '#dcfce7', color: '#15803d', text: '승인' },
            'REJECTED': { bg: '#fee2e2', color: '#b91c1c', text: '반려' },
            'SKIPPED': { bg: '#f1f5f9', color: '#94a3b8', text: '취소' }
        }[status] || { bg: '#f1f5f9', color: '#64748b', text: status };

        return (
            <span style={{ backgroundColor: config.bg, color: config.color, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                {config.text}
            </span>
        );
    };

    return (
        <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '560px',
            backgroundColor: '#fff', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            zIndex: 1200, display: 'flex', flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb' }}>
                            [{detail?.docTypeName || '문서'}]
                        </span>
                        {detail && statusBadge(detail.status)}
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                        {detail?.title || '결재 문서 상세'}
                    </h2>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                        상신자: <b>{detail?.submittedByName}</b> ({detail?.submittedByDepartment || '부서미지정'}) · 상신일시: {detail?.submittedAt ? new Date(detail.submittedAt).toLocaleString() : '-'}
                    </div>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8' }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>불러오는 중...</div>
                ) : detail && (
                    <>
                        {/* 결재선 타임라인 */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                                    📋 결재 진행 현황
                                </h3>
                                {detail.status === 'PENDING' && (
                                    <button
                                        onClick={() => {
                                            setUserSearchText('');
                                            setAdhocModal(true);
                                        }}
                                        style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        ➕ 결재자/참조 추가
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {detail.steps?.map((st, idx) => (
                                    <div key={st.id || idx} style={{
                                        padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                        backgroundColor: st.status === 'APPROVED' ? '#f0fdf4' : st.status === 'REJECTED' ? '#fef2f2' : '#ffffff'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold',
                                                    backgroundColor: st.stepType === 'REFERENCE' ? '#e2e8f0' : '#dbeafe',
                                                    color: st.stepType === 'REFERENCE' ? '#475569' : '#1e40af'
                                                }}>
                                                    {st.stepType === 'REFERENCE' ? '참조' : `${st.stepOrder}단계`}
                                                </span>
                                                <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>
                                                    {st.assigneeUserName}
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                    ({st.assigneeDepartment || '-'} / {st.assigneePosition || '-'})
                                                </span>
                                                {st.isAdhoc && (
                                                    <span style={{ fontSize: '10px', color: '#ea580c', backgroundColor: '#fff7ed', padding: '1px 5px', borderRadius: '3px' }}>
                                                        추가결재
                                                    </span>
                                                )}
                                            </div>
                                            {stepStatusBadge(st.status)}
                                        </div>

                                        {st.comment && (
                                            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '12px', color: '#334155', borderLeft: '3px solid #cbd5e1' }}>
                                                💬 {st.comment}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                                            <span>확인: {st.readAt ? new Date(st.readAt).toLocaleString() : '미확인'}</span>
                                            <span>처리: {st.processedAt ? new Date(st.processedAt).toLocaleString() : '-'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 결재 이력 감사 로그 (Audit Trail) */}
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>
                                📜 결재 이력 (감사 추적)
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                                {detail.historyLogs?.map((log) => (
                                    <div key={log.id} style={{ fontSize: '12px', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: 'bold', color: '#0f172a' }}>
                                                {log.actorUserName} [{log.action}]
                                            </span>
                                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                                {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                                            </span>
                                        </div>
                                        {log.detailJson && (
                                            <div style={{ color: '#475569', marginTop: '4px' }}>{log.detailJson}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Footer 액션 바 */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                {detail?.canRecall && (
                    <button
                        onClick={handleRecall}
                        style={{ padding: '10px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                    >
                        ↩️ 결재 회수
                    </button>
                )}
                {detail?.canReject && (
                    <button
                        onClick={() => setCommentModal({ open: true, type: 'REJECT', comment: '' })}
                        style={{ padding: '10px 18px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                    >
                        🚫 반려하기
                    </button>
                )}
                {detail?.canApprove && (
                    <button
                        onClick={() => setCommentModal({ open: true, type: 'APPROVE', comment: '' })}
                        style={{ padding: '10px 24px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                    >
                        ✅ 승인하기
                    </button>
                )}
                <button
                    onClick={onClose}
                    style={{ padding: '10px 18px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                >
                    닫기
                </button>
            </div>

            {/* 승인/반려 의견 모달 */}
            {commentModal.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300 }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '10px', width: '400px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: commentModal.type === 'REJECT' ? '#b91c1c' : '#15803d' }}>
                            {commentModal.type === 'REJECT' ? '결재 반려' : '결재 승인'}
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                            {commentModal.type === 'REJECT' ? '반려 사유를 필수로 입력해 주십시오.' : '승인 의견을 입력해 주십시오 (선택사항).'}
                        </p>
                        <textarea
                            value={commentModal.comment}
                            onChange={(e) => setCommentModal({ ...commentModal, comment: e.target.value })}
                            rows={4}
                            placeholder={commentModal.type === 'REJECT' ? '반려 사유 입력...' : '승인 의견 입력 (선택)...'}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                            required={commentModal.type === 'REJECT'}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                            <button
                                type="button"
                                onClick={() => setCommentModal({ open: false, type: 'APPROVE', comment: '' })}
                                style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={commentModal.type === 'REJECT' ? handleReject : handleApprove}
                                style={{
                                    padding: '8px 18px', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                                    backgroundColor: commentModal.type === 'REJECT' ? '#ef4444' : '#16a34a'
                                }}
                            >
                                {commentModal.type === 'REJECT' ? '반려 확정' : '승인 확정'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ad-hoc 결재자 추가 모달 */}
            {adhocModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300 }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '10px', width: '420px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: '#0f172a' }}>
                            결재자 / 참조자 추가
                        </h3>
                        <form onSubmit={handleAddAdhoc} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>구분</label>
                                <select
                                    value={adhocForm.stepType}
                                    onChange={(e) => setAdhocForm({ ...adhocForm, stepType: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                >
                                    <option value="APPROVAL">추가 결재자 (마지막 단계로 추가)</option>
                                    <option value="REFERENCE">추가 참조자 (참조 목록에 추가)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                                    사용자 검색 ({detail?.submittedByCompanyName})
                                </label>
                                <input
                                    type="text"
                                    value={userSearchText}
                                    onChange={(e) => setUserSearchText(e.target.value)}
                                    placeholder="이름 또는 아이디..."
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '8px' }}
                                />
                                <select
                                    value={adhocForm.userId}
                                    onChange={(e) => setAdhocForm({ ...adhocForm, userId: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    required
                                >
                                    <option value="">-- 사용자를 선택해 주세요 --</option>
                                    {companyUsers.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.username}) - {u.department || '부서미지정'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setAdhocModal(false)}
                                    style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    추가하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalDetailDrawer;
