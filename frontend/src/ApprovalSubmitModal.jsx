import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
    fetchApprovalDocTypes,
    fetchApprovalTemplate,
    submitApproval,
    resubmitApprovalDocument,
    fetchApprovalDocumentDetail,
    approveApprovalDocument,
    rejectApprovalDocument,
    recallApprovalDocument
} from './api';
import ApprovalLineModal from './ApprovalLineModal';

/**
 * HTML 문자열에서 태그를 안전하게 제거하고 줄바꿈/기호를 보존하여 모노스페이스 ERP 서식으로 정제하는 유틸리티
 */
export const stripHtmlToPlainText = (html) => {
    if (!html || typeof html !== 'string') return '';
    if (!/<[a-z][\s\S]*>/i.test(html)) return html;
    
    return html
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<td[^>]*>/gi, ' | ')
        .replace(/<th[^>]*>/gi, ' | ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

/**
 * 대화면 ERP/그룹웨어 표준 전자결재 결의서 모달
 * - 모드: CREATE(신규 상신), VIEW(문서 상세 조회), EDIT(회수/반려 후 수정 및 재상신)
 * - 라이트 톤 통일 UI/UX (기존 팝업과 통일된 감각의 상단 툴바)
 * - 좌측: 품의번호, 작성일자, 기안부서, 기안자, 수신/참조, 보존연한 메타정보 표
 * - 우측: [기안], [결재], [합의] 직인 도장란 (진행 상태별 직인/대기/반려 시각화)
 * - 회수(Recall) 및 수정 후 재상신(Resubmit) 완벽 지원
 */
const ApprovalSubmitModal = ({
    isOpen,
    onClose,
    onSubmitted,
    onActionCompleted,
    mode: initialMode = 'CREATE',
    documentId = null,
    initialDocTypeCode = '',
    initialSourceRecordId = null,
    initialTitle = '',
    initialContent = '',
    currentUser,
    showAlert = (msg, type = 'info') => {
        if (type === 'error' || msg?.includes('실패') || msg?.includes('못했습니다') || msg?.includes('없습니다')) {
            toast.error(msg);
        } else if (type === 'success' || msg?.includes('성공') || msg?.includes('되었습니다')) {
            toast.success(msg);
        } else if (type === 'warning' || msg?.includes('입력해') || msg?.includes('선택해') || msg?.includes('필수')) {
            toast.warning(msg);
        } else {
            toast.info(msg);
        }
    },
    showConfirm = (msg, fn) => { if (window.confirm(msg)) fn?.(); }
}) => {
    const userCompany = currentUser?.companyName || '';
    const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

    // 협력업체(제조사) 계정 여부 판별 (사내 전자결재 기안 불가)
    const isManufacturer = useMemo(() => {
        if (!currentUser) return false;
        return currentUser.roles?.some(r => (r.authority || r).includes('ROLE_MANUFACTURER') || (r.authority || r).includes('MANUFACTURER'))
            || (currentUser.role && currentUser.role.includes('MANUFACTURER'))
            || currentUser.department === '제조사'
            || Boolean(currentUser.manufacturer);
    }, [currentUser]);

    // 현재 모드 ('CREATE' | 'VIEW' | 'EDIT')
    const [mode, setMode] = useState(initialMode);

    // 상세 조회 데이터 (VIEW / EDIT 모드)
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // 폼 상태
    const [docTypes, setDocTypes] = useState([]);
    const [docTypeCode, setDocTypeCode] = useState(initialDocTypeCode);
    const [sourceRecordId, setSourceRecordId] = useState(initialSourceRecordId || '');
    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(stripHtmlToPlainText(initialContent || ''));
    const [comment, setComment] = useState('');
    const [retentionPeriod, setRetentionPeriod] = useState('5년');

    // 결재선 상태 ({ id, name, department, position, companyName, stepType })
    const [approverList, setApproverList] = useState([]);
    const [consensusList, setConsensusList] = useState([]);
    const [referenceList, setReferenceList] = useState([]);

    // 조직도 결재라인 모달
    const [lineModalOpen, setLineModalOpen] = useState(false);

    // 승인/반려 코멘트 모달
    const [commentModal, setCommentModal] = useState({ open: false, type: 'APPROVE', comment: '' });
    const [submitting, setSubmitting] = useState(false);

    // 상세 데이터 로드 (VIEW / EDIT)
    const loadDetail = useCallback(async (docId) => {
        if (!docId) return;
        try {
            setDetailLoading(true);
            const res = await fetchApprovalDocumentDetail(docId);
            const d = res.data;
            setDetail(d);
            setDocTypeCode(d.docTypeCode || '');
            setSourceRecordId(d.sourceRecordId || '');
            setTitle(d.title || '');
            setContent(stripHtmlToPlainText(d.content || ''));
            setRetentionPeriod(d.retentionPeriod || '5년');

            // 결재 단계 분리
            if (d.steps) {
                const apps = [];
                const cons = [];
                const refs = [];
                d.steps.forEach(s => {
                    const item = {
                        id: s.assigneeUserId,
                        name: s.assigneeUserName,
                        department: s.assigneeDepartment,
                        position: s.assigneePosition,
                        companyName: s.assigneeCompanyName,
                        stepType: s.stepType,
                        status: s.status,
                        processedAt: s.processedAt,
                        comment: s.comment
                    };
                    if (s.stepType === 'REFERENCE') refs.push(item);
                    else if (s.stepType === 'CONSENSUS') cons.push(item);
                    else apps.push(item);
                });
                setApproverList(apps);
                setConsensusList(cons);
                setReferenceList(refs);
            }
        } catch (err) {
            showAlert?.("결재 문서 정보를 불러오지 못했습니다.");
        } finally {
            setDetailLoading(false);
        }
    }, [showAlert]);

    // 초기화 및 모드 설정
    useEffect(() => {
        if (!isOpen) return;

        setMode(initialMode);

        const init = async () => {
            try {
                const dtRes = await fetchApprovalDocTypes(true);
                const list = dtRes.data || [];
                setDocTypes(list);

                if (documentId) {
                    await loadDetail(documentId);
                } else {
                    // 비활성화된 문서 유형으로 상신 진입 시도시 차단
                    if (initialDocTypeCode && list.length > 0 && !list.some(dt => dt.code === initialDocTypeCode)) {
                        showAlert?.(`해당 결재 문서 유형('${initialDocTypeCode}')은 현재 비활성화(중지) 상태이므로 상신할 수 없습니다.`);
                        onClose?.();
                        return;
                    }
                    const targetCode = initialDocTypeCode || (list[0]?.code || '');
                    setDocTypeCode(targetCode);
                    setSourceRecordId(initialSourceRecordId || '');
                    setTitle(initialTitle || '');
                    setContent(stripHtmlToPlainText(initialContent || ''));
                    setComment('');
                    setRetentionPeriod('5년');
                }
            } catch (err) {
                showAlert?.("결재 기본 정보를 불러오지 못했습니다.");
            }
        };

        init();
    }, [isOpen, initialMode, documentId, initialDocTypeCode, initialSourceRecordId, initialTitle, initialContent, loadDetail, showAlert, onClose]);

    // CREATE 모드 시 템플릿 로드
    const loadPreview = useCallback(async (code) => {
        if (!code || mode !== 'CREATE') return;
        try {
            const res = await fetchApprovalTemplate(code);
            const tpl = res.data;
            if (tpl && tpl.steps) {
                const apps = [];
                const cons = [];
                const refs = [];

                tpl.steps.forEach(st => {
                    const assignee = {
                        id: st.assigneeUserId || 0,
                        name: st.assigneeUserName || (st.assigneeRole ? `[${st.assigneeDepartmentName || '소속부서'}] ${st.assigneeRole}` : '부서장'),
                        department: st.assigneeDepartmentName || currentUser?.department || '소속부서',
                        position: st.assigneeRole || '팀장/부서장',
                        companyName: userCompany,
                        stepType: st.stepType || 'APPROVAL'
                    };

                    if (st.stepType === 'REFERENCE') refs.push(assignee);
                    else if (st.stepType === 'CONSENSUS') cons.push(assignee);
                    else apps.push(assignee);
                });

                setApproverList(apps);
                setConsensusList(cons);
                setReferenceList(refs);
            }
        } catch (err) {
            // 템플릿 없을 시 기본 유지
        }
    }, [mode, currentUser, userCompany]);

    useEffect(() => {
        if (mode === 'CREATE' && docTypeCode) {
            loadPreview(docTypeCode);
            if (!initialTitle) {
                const dt = docTypes.find(d => d.code === docTypeCode);
                const typeName = dt ? dt.name : docTypeCode;
                setTitle(`[${typeName}] ${currentUser?.name || ''} 결재 요청`);
            }
        }
    }, [mode, docTypeCode, docTypes, currentUser, initialTitle, loadPreview]);

    // 결재선 저장 콜백
    const handleLineSave = ({ approvers, consensus, references }) => {
        setApproverList(approvers);
        setConsensusList(consensus);
        setReferenceList(references);
    };

    // 현재 선택된 문서 유형 명칭
    const currentDocTypeName = useMemo(() => {
        if (detail?.docTypeName) return detail.docTypeName;
        const dt = docTypes.find(d => d.code === docTypeCode);
        return dt ? dt.name : '전자 결의서';
    }, [detail, docTypes, docTypeCode]);

    // 신규 상신 (CREATE)
    const handleCreateSubmit = async () => {
        if (isManufacturer) {
            showAlert?.("협력업체(제조사) 계정은 사내 전자결재를 기안할 수 없습니다.", "error");
            return;
        }
        if (!docTypeCode) {
            showAlert?.("문서 유형을 선택해 주세요.");
            return;
        }
        if (!title?.trim()) {
            showAlert?.("결재 문서 제목을 입력해 주세요.");
            return;
        }

        try {
            setSubmitting(true);
            const res = await submitApproval({
                docTypeCode,
                sourceRecordId: sourceRecordId ? Number(sourceRecordId) : null,
                title: title.trim(),
                content: content.trim(),
                retentionPeriod,
                comment: comment.trim(),
                adhocApproverUserIds: approverList.map(u => Number(u.id)).filter(id => id > 0),
                adhocConsensusUserIds: consensusList.map(u => Number(u.id)).filter(id => id > 0),
                adhocReferenceUserIds: referenceList.map(u => Number(u.id)).filter(id => id > 0)
            });

            showAlert?.("결재가 성공적으로 상신되었습니다.");
            onSubmitted?.(res.data);
            onActionCompleted?.();
            onClose();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || "결재 상신에 실패했습니다.";
            showAlert?.(typeof msg === 'string' ? msg : "결재 상신에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    // 수정 후 재상신 (EDIT)
    const handleResubmit = async () => {
        if (!title?.trim()) {
            showAlert?.("결재 문서 제목을 입력해 주세요.");
            return;
        }
        if (!detail?.id) return;

        try {
            setSubmitting(true);
            await resubmitApprovalDocument(detail.id, {
                title: title.trim(),
                content: content.trim(),
                retentionPeriod,
                sourceRecordId: sourceRecordId ? Number(sourceRecordId) : null,
                comment: comment.trim(),
                adhocApproverUserIds: approverList.map(u => Number(u.id)).filter(id => id > 0),
                adhocConsensusUserIds: consensusList.map(u => Number(u.id)).filter(id => id > 0),
                adhocReferenceUserIds: referenceList.map(u => Number(u.id)).filter(id => id > 0)
            });

            showAlert?.("결재 문서가 수정되어 성공적으로 재상신되었습니다.");
            onActionCompleted?.();
            await loadDetail(detail.id);
            setMode('VIEW');
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || "재상신에 실패했습니다.";
            showAlert?.(typeof msg === 'string' ? msg : "재상신에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    // 결재 회수 실행
    const handleRecall = () => {
        if (!detail?.id) return;
        showConfirm?.("상신한 결재 문서를 회수하시겠습니까?\n회수 후 내용을 수정하여 다시 상신할 수 있습니다.", async () => {
            try {
                setSubmitting(true);
                await recallApprovalDocument(detail.id);
                showAlert?.("결재 문서가 회수되었습니다.");
                onActionCompleted?.();
                await loadDetail(detail.id);
            } catch (err) {
                showAlert?.(err.response?.data?.message || "회수 처리에 실패했습니다.");
            } finally {
                setSubmitting(false);
            }
        });
    };

    // 승인 실행
    const handleApprove = async () => {
        if (!detail?.id) return;
        try {
            setSubmitting(true);
            await approveApprovalDocument(detail.id, commentModal.comment);
            showAlert?.("결재가 승인되었습니다.");
            setCommentModal({ open: false, type: 'APPROVE', comment: '' });
            onActionCompleted?.();
            await loadDetail(detail.id);
        } catch (err) {
            showAlert?.(err.response?.data?.message || "승인 처리에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    // 반려 실행
    const handleReject = async () => {
        if (!detail?.id) return;
        if (!commentModal.comment?.trim()) {
            showAlert?.("반려 사유를 필수로 입력해야 합니다.");
            return;
        }
        try {
            setSubmitting(true);
            await rejectApprovalDocument(detail.id, commentModal.comment);
            showAlert?.("결재가 반려되었습니다.");
            setCommentModal({ open: false, type: 'REJECT', comment: '' });
            onActionCompleted?.();
            await loadDetail(detail.id);
        } catch (err) {
            showAlert?.(err.response?.data?.message || "반려 처리에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isReadOnly = mode === 'VIEW';
    const statusConfig = {
        'PENDING': { bg: '#e0f2fe', color: '#0369a1', text: '진행중' },
        'APPROVED': { bg: '#dcfce7', color: '#15803d', text: '승인완료' },
        'REJECTED': { bg: '#fee2e2', color: '#b91c1c', text: '반려' },
        'RECALLED': { bg: '#f1f5f9', color: '#64748b', text: '회수' }
    }[detail?.status || 'PENDING'] || { bg: '#f1f5f9', color: '#64748b', text: detail?.status || '진행중' };

    return (
        <>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
                zIndex: 10050, display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                <div style={{
                    backgroundColor: '#f8fafc', borderRadius: '12px',
                    width: '96vw', height: '94vh', maxWidth: '1440px', maxHeight: '96vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
                }}>
                    {/* 1. 상단 윈도우 헤더 툴바 (라이트 톤 통일) */}
                    <div style={{
                        padding: '14px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '18px' }}>
                                {mode === 'VIEW' ? '📑' : mode === 'EDIT' ? '✏️' : '📝'}
                            </span>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
                                {mode === 'VIEW' ? `전자결재 문서 조회 · ${currentDocTypeName}` :
                                 mode === 'EDIT' ? `전자결재 문서 수정 및 재상신 · ${currentDocTypeName}` :
                                 `전자결재 기안문서 작성 · ${currentDocTypeName}`}
                            </h2>

                            {mode === 'VIEW' && (
                                <span style={{
                                    backgroundColor: statusConfig.bg, color: statusConfig.color,
                                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'
                                }}>
                                    {statusConfig.text}
                                </span>
                            )}

                            {mode === 'CREATE' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                                    <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>문서양식:</label>
                                    <select
                                        value={docTypeCode}
                                        onChange={(e) => setDocTypeCode(e.target.value)}
                                        style={{
                                            backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1',
                                            borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 'bold'
                                        }}
                                    >
                                        {docTypes.map(dt => (
                                            <option key={dt.id} value={dt.code}>
                                                {dt.name} ({dt.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                style={{
                                    padding: '6px 12px', backgroundColor: '#fff', color: '#475569',
                                    border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                                title="A4 인쇄 미리보기"
                            >
                                🖨️ 인쇄
                            </button>
                            {!isReadOnly && !isManufacturer && (
                                <button
                                    type="button"
                                    onClick={() => setLineModalOpen(true)}
                                    style={{
                                        padding: '6px 14px', backgroundColor: '#2563eb', color: '#fff',
                                        border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                        boxShadow: '0 1px 3px rgba(37,99,235,0.3)'
                                    }}
                                >
                                    👥 결재라인 지정
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    backgroundColor: 'transparent', border: 'none', color: '#64748b',
                                    fontSize: '20px', cursor: 'pointer', padding: '0 6px'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* 2. 대화면 결의서 양식 페이퍼 영역 (스크롤 가능) */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            backgroundColor: '#ffffff', width: '100%', maxWidth: '1100px',
                            minHeight: '850px', padding: '40px 48px', borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
                            border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '24px'
                        }}>
                            {/* 문서 대타이틀 */}
                            <div style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '2px solid #0f172a' }}>
                                <h1 style={{
                                    margin: 0, fontSize: '26px', fontWeight: '900', letterSpacing: '6px',
                                    color: '#0f172a', textDecoration: 'underline', textUnderlineOffset: '8px'
                                }}>
                                    {currentDocTypeName.toUpperCase()}
                                </h1>
                            </div>

                            {/* 결의서 상단 영역: [좌측 메타 정보표] + [우측 직인 결재란] */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'stretch' }}>
                                {/* 좌측: 문서 기본정보 표 */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #475569', fontSize: '13px' }}>
                                    <tbody>
                                        <tr>
                                            <th style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', width: '100px', textAlign: 'center', color: '#334155' }}>품의번호</th>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#1e293b', fontWeight: 'bold' }}>
                                                {detail?.id ? `APP-${(detail.submittedAt || todayStr).slice(0, 10).replace(/-/g, '')}-${detail.id}` : (sourceRecordId ? `APP-${todayStr.replace(/-/g, '')}-${sourceRecordId}` : '(상신 시 자동 채번)')}
                                            </td>
                                            <th style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', width: '100px', textAlign: 'center', color: '#334155' }}>작성일자</th>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 'bold', color: '#1e293b' }}>
                                                {detail?.submittedAt ? detail.submittedAt.slice(0, 10) : todayStr}
                                            </td>
                                        </tr>
                                        <tr>
                                            <th style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', textAlign: 'center', color: '#334155' }}>기안부서</th>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#1e293b' }}>
                                                {detail ? (detail.submittedByDepartment || '소속부서') : (currentUser?.department || '소속부서')}
                                            </td>
                                            <th style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', textAlign: 'center', color: '#334155' }}>기안자</th>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 'bold', color: '#1e293b' }}>
                                                {detail ? `${detail.submittedByName}${detail.submittedByCompanyName ? ` (${detail.submittedByCompanyName})` : ''}` : `${currentUser?.name} ${currentUser?.position || '담당'}`}
                                            </td>
                                        </tr>
                                        <tr>
                                            <th style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', textAlign: 'center', color: '#334155' }}>수신 및 참조</th>
                                            <td colSpan="3" style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                    {referenceList.length === 0 ? (
                                                        isReadOnly ? (
                                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>지정된 참조자 없음</span>
                                                        ) : (
                                                            <span
                                                                onClick={() => setLineModalOpen(true)}
                                                                style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                                            >
                                                                + 수신참조자 지정 (클릭)
                                                            </span>
                                                        )
                                                    ) : (
                                                        referenceList.map((ref, i) => (
                                                            <span
                                                                key={i}
                                                                style={{
                                                                    padding: '2px 8px', backgroundColor: '#f3e8ff', color: '#7e22ce',
                                                                    borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                                                                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                                }}
                                                            >
                                                                {ref.name} ({ref.department || '참조'})
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <th style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', textAlign: 'center', color: '#334155' }}>보존연한</th>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                                                {isReadOnly ? (
                                                    <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{retentionPeriod}</span>
                                                ) : (
                                                    <select
                                                        value={retentionPeriod}
                                                        onChange={(e) => setRetentionPeriod(e.target.value)}
                                                        style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}
                                                    >
                                                        <option value="1년">1년</option>
                                                        <option value="3년">3년</option>
                                                        <option value="5년">5년 (기본)</option>
                                                        <option value="영구">영구보존</option>
                                                    </select>
                                                )}
                                            </td>
                                            <th style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', textAlign: 'center', color: '#334155' }}>연동 레코드</th>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>
                                                {isReadOnly ? (
                                                    <span style={{ color: sourceRecordId ? '#0f172a' : '#94a3b8' }}>
                                                        {sourceRecordId ? `ID: ${sourceRecordId}` : '-'}
                                                    </span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={sourceRecordId}
                                                        onChange={(e) => setSourceRecordId(e.target.value)}
                                                        placeholder="연동 ID"
                                                        style={{ width: '100px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* 우측: 결재 및 합의 직인 도장란 */}
                                <div style={{ minWidth: '420px', border: '1px solid #475569' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12px' }}>
                                        <tbody>
                                            {/* 행 1: 결재란 (기안자 + 결재자 최대 4명) */}
                                            <tr>
                                                <th
                                                    rowSpan="3"
                                                    style={{
                                                        backgroundColor: '#f1f5f9', border: '1px solid #64748b',
                                                        padding: '4px', writingMode: 'vertical-rl', letterSpacing: '4px',
                                                        fontWeight: 'bold', width: '24px', color: '#334155'
                                                    }}
                                                >
                                                    결재
                                                </th>
                                                {/* 기안자 직인 헤더 */}
                                                <td style={{ width: '75px', height: '22px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#475569' }}>
                                                    기안
                                                </td>
                                                {/* 결재자 슬롯 4개 */}
                                                {[0, 1, 2, 3].map((idx) => {
                                                    const approver = approverList[idx];
                                                    return (
                                                        <td
                                                            key={`app-head-${idx}`}
                                                            onClick={() => !isReadOnly && setLineModalOpen(true)}
                                                            style={{
                                                                width: '75px', height: '22px', backgroundColor: '#f8fafc',
                                                                border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#475569',
                                                                cursor: !isReadOnly ? 'pointer' : 'default', fontSize: '11px'
                                                            }}
                                                        >
                                                            {approver ? (approver.position || `결재 ${idx + 1}`) : `결재 ${idx + 1}`}
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {/* 결재 직인 공간 */}
                                            <tr>
                                                {/* 기안자 도장 */}
                                                <td style={{ height: '52px', border: '1px solid #cbd5e1', verticalAlign: 'middle', backgroundColor: '#fff' }}>
                                                    <div style={{
                                                        display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                        width: '42px', height: '42px', border: '2px solid #2563eb', borderRadius: '50%',
                                                        color: '#1d4ed8', fontSize: '9px', fontWeight: 'bold', backgroundColor: '#eff6ff'
                                                    }}>
                                                        <span>기안</span>
                                                        <span style={{ fontSize: '8px', transform: 'scale(0.85)' }}>
                                                            {detail?.submittedAt ? detail.submittedAt.slice(5, 10) : todayStr.slice(5)}
                                                        </span>
                                                    </div>
                                                </td>
                                                {/* 결재자 도장 슬롯 4개 */}
                                                {[0, 1, 2, 3].map((idx) => {
                                                    const approver = approverList[idx];
                                                    const isApproved = approver?.status === 'APPROVED';
                                                    const isRejected = approver?.status === 'REJECTED';
                                                    const isPending = approver?.status === 'PENDING';

                                                    return (
                                                        <td
                                                            key={`app-stamp-${idx}`}
                                                            onClick={() => !isReadOnly && setLineModalOpen(true)}
                                                            style={{
                                                                height: '52px', border: '1px solid #cbd5e1', verticalAlign: 'middle',
                                                                cursor: !isReadOnly ? 'pointer' : 'default', backgroundColor: approver ? '#fff' : '#fafafa'
                                                            }}
                                                        >
                                                            {isApproved ? (
                                                                <div style={{
                                                                    display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                                    width: '42px', height: '42px', border: '2px solid #16a34a', borderRadius: '50%',
                                                                    color: '#15803d', fontSize: '9px', fontWeight: 'bold', backgroundColor: '#f0fdf4'
                                                                }}>
                                                                    <span>승인</span>
                                                                    <span style={{ fontSize: '8px', transform: 'scale(0.85)' }}>
                                                                        {approver.processedAt ? approver.processedAt.slice(5, 10) : ''}
                                                                    </span>
                                                                </div>
                                                            ) : isRejected ? (
                                                                <div style={{
                                                                    display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                                    width: '42px', height: '42px', border: '2px solid #dc2626', borderRadius: '50%',
                                                                    color: '#b91c1c', fontSize: '9px', fontWeight: 'bold', backgroundColor: '#fef2f2'
                                                                }}>
                                                                    <span>반려</span>
                                                                </div>
                                                            ) : isPending ? (
                                                                <div style={{
                                                                    display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                                    width: '42px', height: '42px', border: '1px dashed #f59e0b', borderRadius: '50%',
                                                                    color: '#d97706', fontSize: '9px', fontWeight: 'bold', backgroundColor: '#fffbeb'
                                                                }}>
                                                                    <span>대기</span>
                                                                </div>
                                                            ) : approver ? (
                                                                <span style={{ fontSize: '11px', color: '#64748b' }}>-</span>
                                                            ) : (
                                                                <span style={{ fontSize: '10px', color: '#cbd5e1' }}>-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {/* 결재자 성명 */}
                                            <tr>
                                                <td style={{ height: '22px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold', color: '#0f172a' }}>
                                                    {detail ? detail.submittedByName : (currentUser?.name || '-')}
                                                </td>
                                                {[0, 1, 2, 3].map((idx) => {
                                                    const approver = approverList[idx];
                                                    return (
                                                        <td
                                                            key={`app-name-${idx}`}
                                                            onClick={() => !isReadOnly && setLineModalOpen(true)}
                                                            style={{
                                                                height: '22px', border: '1px solid #cbd5e1', fontSize: '11px',
                                                                fontWeight: approver ? 'bold' : 'normal', color: approver ? '#0f172a' : '#94a3b8',
                                                                cursor: !isReadOnly ? 'pointer' : 'default'
                                                            }}
                                                        >
                                                            {approver ? approver.name : '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {/* 행 2: 합의란 */}
                                            <tr>
                                                <th
                                                    rowSpan="3"
                                                    style={{
                                                        backgroundColor: '#f0fdf4', border: '1px solid #64748b',
                                                        padding: '4px', writingMode: 'vertical-rl', letterSpacing: '4px',
                                                        fontWeight: 'bold', color: '#166534'
                                                    }}
                                                >
                                                    합의
                                                </th>
                                                {[0, 1, 2, 3, 4].map((idx) => {
                                                    const con = consensusList[idx];
                                                    return (
                                                        <td
                                                            key={`con-head-${idx}`}
                                                            onClick={() => !isReadOnly && setLineModalOpen(true)}
                                                            style={{
                                                                width: '75px', height: '22px', backgroundColor: '#f0fdf4',
                                                                border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#15803d',
                                                                cursor: !isReadOnly ? 'pointer' : 'default', fontSize: '11px'
                                                            }}
                                                        >
                                                            {con ? (con.department || '합의팀') : `합의 ${idx + 1}`}
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {/* 합의 직인 공간 */}
                                            <tr>
                                                {[0, 1, 2, 3, 4].map((idx) => {
                                                    const con = consensusList[idx];
                                                    const isApproved = con?.status === 'APPROVED';
                                                    const isRejected = con?.status === 'REJECTED';
                                                    const isPending = con?.status === 'PENDING';

                                                    return (
                                                        <td
                                                            key={`con-stamp-${idx}`}
                                                            onClick={() => !isReadOnly && setLineModalOpen(true)}
                                                            style={{
                                                                height: '50px', border: '1px solid #cbd5e1', verticalAlign: 'middle',
                                                                cursor: !isReadOnly ? 'pointer' : 'default', backgroundColor: con ? '#fff' : '#fafafa'
                                                            }}
                                                        >
                                                            {isApproved ? (
                                                                <div style={{
                                                                    display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                                    width: '40px', height: '40px', border: '1px solid #16a34a', borderRadius: '50%',
                                                                    color: '#15803d', fontSize: '9px', fontWeight: 'bold', backgroundColor: '#f0fdf4'
                                                                }}>
                                                                    <span>합의</span>
                                                                </div>
                                                            ) : isRejected ? (
                                                                <div style={{
                                                                    display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                                    width: '40px', height: '40px', border: '1px solid #dc2626', borderRadius: '50%',
                                                                    color: '#b91c1c', fontSize: '9px', fontWeight: 'bold', backgroundColor: '#fef2f2'
                                                                }}>
                                                                    <span>반려</span>
                                                                </div>
                                                            ) : isPending ? (
                                                                <div style={{
                                                                    display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                                    width: '40px', height: '40px', border: '1px dashed #f59e0b', borderRadius: '50%',
                                                                    color: '#d97706', fontSize: '9px', fontWeight: 'bold', backgroundColor: '#fffbeb'
                                                                }}>
                                                                    <span>대기</span>
                                                                </div>
                                                            ) : con ? (
                                                                <span style={{ fontSize: '11px', color: '#64748b' }}>-</span>
                                                            ) : (
                                                                <span style={{ fontSize: '10px', color: '#cbd5e1' }}>-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {/* 합의자 성명 */}
                                            <tr>
                                                {[0, 1, 2, 3, 4].map((idx) => {
                                                    const con = consensusList[idx];
                                                    return (
                                                        <td
                                                            key={`con-name-${idx}`}
                                                            onClick={() => !isReadOnly && setLineModalOpen(true)}
                                                            style={{
                                                                height: '20px', border: '1px solid #cbd5e1', fontSize: '11px',
                                                                color: con ? '#0f172a' : '#94a3b8', cursor: !isReadOnly ? 'pointer' : 'default',
                                                                fontWeight: con ? 'bold' : 'normal'
                                                            }}
                                                        >
                                                            {con ? con.name : '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 3. 기안문서 제목란 */}
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #475569', backgroundColor: '#f8fafc' }}>
                                <div style={{
                                    width: '100px', padding: '12px', backgroundColor: '#f1f5f9', fontWeight: 'bold',
                                    textAlign: 'center', borderRight: '1px solid #cbd5e1', color: '#334155', fontSize: '13px'
                                }}>
                                    제 목
                                </div>
                                {isReadOnly ? (
                                    <div style={{ flex: 1, padding: '10px 16px', fontSize: '15px', fontWeight: 'bold', color: '#0f172a', backgroundColor: '#fff' }}>
                                        {title}
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="결의서 제목을 명확하고 구체적으로 입력해 주세요"
                                        style={{
                                            flex: 1, padding: '10px 16px', border: 'none', fontSize: '14px',
                                            fontWeight: 'bold', color: '#0f172a', outline: 'none', backgroundColor: '#fff'
                                        }}
                                        required
                                    />
                                )}
                            </div>

                            {/* 4. 결의서 본문 영역 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                                    📋 품의 / 결의 세부 내용
                                </label>
                                {isReadOnly ? (
                                    <div style={{
                                        width: '100%', minHeight: '220px', padding: '16px 20px',
                                        borderRadius: '6px', border: '1px solid #cbd5e1',
                                        fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap',
                                        backgroundColor: '#fafafa', color: '#1e293b', boxSizing: 'border-box'
                                    }}>
                                        {content || <span style={{ color: '#94a3b8' }}>등록된 본문 내용이 없습니다.</span>}
                                    </div>
                                ) : (
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="1. 기안 목적&#10;2. 주요 내용 및 추진 계획&#10;3. 소요 예산 및 관련 근거&#10;4. 기대 효과 및 향후 조치사항 등을 상세히 기재하십시오."
                                        style={{
                                            width: '100%', minHeight: '260px', padding: '16px',
                                            borderRadius: '6px', border: '1px solid #cbd5e1',
                                            fontSize: '13px', lineHeight: '1.6', resize: 'vertical',
                                            fontFamily: 'inherit', boxSizing: 'border-box'
                                        }}
                                    />
                                )}
                            </div>

                            {/* 5. 상신 의견 및 결재자 코멘트 이력 */}
                            {!isReadOnly ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                                        💬 상신 의견 (결재자 전달사항)
                                    </label>
                                    <input
                                        type="text"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="결재권자에게 긴급성이나 주요 검토 포인트를 전달할 수 있습니다."
                                        style={{
                                            padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1',
                                            fontSize: '13px', width: '100%', boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            ) : (
                                detail?.historyLogs && detail.historyLogs.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                                            📜 결재 진행 이력 (Audit Trail)
                                        </label>
                                        <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                                                        <th style={{ padding: '6px 10px', width: '130px' }}>일시</th>
                                                        <th style={{ padding: '6px 10px', width: '90px' }}>구분</th>
                                                        <th style={{ padding: '6px 10px', width: '110px' }}>처리자</th>
                                                        <th style={{ padding: '6px 10px' }}>내용 / 의견</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detail.historyLogs.map(log => (
                                                        <tr key={log.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '6px 10px', color: '#64748b' }}>
                                                                {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                                                            </td>
                                                            <td style={{ padding: '6px 10px', fontWeight: 'bold' }}>
                                                                <span style={{
                                                                    padding: '2px 6px', borderRadius: '4px',
                                                                    backgroundColor: log.action === 'APPROVE' ? '#dcfce7' : log.action === 'REJECT' ? '#fee2e2' : '#f1f5f9',
                                                                    color: log.action === 'APPROVE' ? '#15803d' : log.action === 'REJECT' ? '#b91c1c' : '#475569'
                                                                }}>
                                                                    {log.action}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#1e293b' }}>
                                                                {log.actorUserName}
                                                            </td>
                                                            <td style={{ padding: '6px 10px', color: '#334155' }}>
                                                                {log.detailJson}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* 3. 하단 푸터 액션 바 */}
                    <div style={{
                        padding: '16px 28px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                결재라인: 기안(1) ➔ 결재(<b>{approverList.length}</b>명) ➔ 합의(<b>{consensusList.length}</b>명) ➔ 참조(<b>{referenceList.length}</b>명)
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            {/* VIEW 모드 액션 버튼들 */}
                            {mode === 'VIEW' && (
                                <>
                                    {detail?.canRecall && (
                                        <button
                                            type="button"
                                            onClick={handleRecall}
                                            disabled={submitting}
                                            style={{
                                                padding: '10px 18px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
                                                borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#b91c1c', cursor: 'pointer'
                                            }}
                                        >
                                            ↩️ 결재 회수
                                        </button>
                                    )}

                                    {detail?.canResubmit && (
                                        <button
                                            type="button"
                                            onClick={() => setMode('EDIT')}
                                            style={{
                                                padding: '10px 20px', backgroundColor: '#eff6ff', border: '1px solid #93c5fd',
                                                borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', cursor: 'pointer'
                                            }}
                                        >
                                            ✏️ 수정 후 재상신
                                        </button>
                                    )}

                                    {detail?.canApprove && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setCommentModal({ open: true, type: 'APPROVE', comment: '' })}
                                                style={{
                                                    padding: '10px 22px', backgroundColor: '#16a34a', border: 'none',
                                                    borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#fff', cursor: 'pointer'
                                                }}
                                            >
                                                ✅ 승인
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCommentModal({ open: true, type: 'REJECT', comment: '' })}
                                                style={{
                                                    padding: '10px 20px', backgroundColor: '#dc2626', border: 'none',
                                                    borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#fff', cursor: 'pointer'
                                                }}
                                            >
                                                🚫 반려
                                            </button>
                                        </>
                                    )}

                                    <button
                                        type="button"
                                        onClick={onClose}
                                        style={{
                                            padding: '10px 20px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1',
                                            borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#475569', cursor: 'pointer'
                                        }}
                                    >
                                        닫기
                                    </button>
                                </>
                            )}

                            {/* EDIT 모드 액션 버튼들 (수정 후 재상신) */}
                            {mode === 'EDIT' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setLineModalOpen(true)}
                                        style={{
                                            padding: '10px 18px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1',
                                            borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#334155', cursor: 'pointer'
                                        }}
                                    >
                                        👥 결재라인 수정
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode('VIEW')}
                                        style={{
                                            padding: '10px 18px', backgroundColor: '#fff', border: '1px solid #cbd5e1',
                                            borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#64748b', cursor: 'pointer'
                                        }}
                                    >
                                        수정 취소
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResubmit}
                                        disabled={submitting}
                                        style={{
                                            padding: '10px 28px', backgroundColor: '#2563eb', border: 'none',
                                            borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', color: '#fff',
                                            cursor: submitting ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)'
                                        }}
                                    >
                                        {submitting ? '재상신 중...' : '🚀 결재 재상신'}
                                    </button>
                                </>
                            )}

                            {/* CREATE 모드 액션 버튼들 (신규 상신) */}
                            {mode === 'CREATE' && (
                                <>
                                    {!isManufacturer && (
                                        <button
                                            type="button"
                                            onClick={() => setLineModalOpen(true)}
                                            style={{
                                                padding: '10px 18px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1',
                                                borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#334155', cursor: 'pointer'
                                            }}
                                        >
                                            👥 결재라인 수정
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        style={{
                                            padding: '10px 20px', backgroundColor: '#fff', border: '1px solid #cbd5e1',
                                            borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#64748b', cursor: 'pointer'
                                        }}
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreateSubmit}
                                        disabled={submitting || isManufacturer}
                                        style={{
                                            padding: '10px 28px',
                                            backgroundColor: isManufacturer ? '#94a3b8' : '#2563eb',
                                            border: 'none',
                                            borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', color: '#fff',
                                            cursor: (submitting || isManufacturer) ? 'not-allowed' : 'pointer',
                                            boxShadow: isManufacturer ? 'none' : '0 4px 6px -1px rgba(37, 99, 235, 0.4)'
                                        }}
                                        title={isManufacturer ? '협력업체(제조사) 계정은 기안할 수 없습니다.' : '결재 상신'}
                                    >
                                        {isManufacturer ? '🚫 기안 불가 (협력사)' : submitting ? '상신 중...' : '📝 결재 상신'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 승인 / 반려 코멘트 팝업 모달 */}
            {commentModal.open && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 10550,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '10px', width: '420px', padding: '24px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', display: 'flex', flexDirection: 'column', gap: '16px'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                            {commentModal.type === 'APPROVE' ? '✅ 결재 승인 처리' : '🚫 결재 반려 처리'}
                        </h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                            {commentModal.type === 'APPROVE'
                                ? '승인 의견을 남길 수 있습니다 (선택사항).'
                                : '반려 사유를 필수로 입력해야 합니다.'}
                        </p>
                        <textarea
                            value={commentModal.comment}
                            onChange={(e) => setCommentModal({ ...commentModal, comment: e.target.value })}
                            placeholder={commentModal.type === 'APPROVE' ? '승인 의견 (선택)' : '반려 사유 (필수)'}
                            style={{
                                width: '100%', height: '90px', padding: '10px', borderRadius: '6px',
                                border: '1px solid #cbd5e1', fontSize: '13px', resize: 'none', boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={() => setCommentModal({ open: false, type: 'APPROVE', comment: '' })}
                                style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                            >
                                취소
                            </button>
                            <button
                                onClick={commentModal.type === 'APPROVE' ? handleApprove : handleReject}
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: commentModal.type === 'APPROVE' ? '#16a34a' : '#dc2626',
                                    color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px'
                                }}
                            >
                                {commentModal.type === 'APPROVE' ? '승인 확인' : '반려 확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 조직도 기반 결재라인 지정 모달 */}
            <ApprovalLineModal
                isOpen={lineModalOpen}
                onClose={() => setLineModalOpen(false)}
                currentUser={currentUser}
                initialApprovers={approverList}
                initialConsensus={consensusList}
                initialReferences={referenceList}
                onSave={handleLineSave}
            />
        </>
    );
};

export default ApprovalSubmitModal;
