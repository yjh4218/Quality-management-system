import React, { useState, useEffect, useCallback } from 'react';
import {
    fetchApprovalDocTypes,
    fetchAdminApprovalTemplateByDocTypeId,
    fetchApprovalTemplateHistory,
    saveApprovalTemplate,
    fetchActiveDepartments,
    fetchCompanyUsersForApproval
} from './api';
import { usePermissions } from './usePermissions';

const ApprovalTemplateBuilderPage = ({ 
    currentUser, 
    showAlert = (msg) => console.info(msg), 
    showConfirm = (msg, fn) => { if (window.confirm(msg)) fn?.(); } 
}) => {
    const { canView, canEdit, isAdmin } = usePermissions(currentUser);
    const hasView = isAdmin || canView('approvalTemplates');
    const hasEdit = isAdmin || canEdit('approvalTemplates');

    const userCompany = currentUser?.companyName || '';

    const [docTypes, setDocTypes] = useState([]);
    const [selectedDocTypeId, setSelectedDocTypeId] = useState('');
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [templateHistory, setTemplateHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    if (currentUser && !hasView) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', borderRadius: '8px', margin: '20px', border: '1px solid #fee2e2' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⛔</div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>접근 권한 없음</h3>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>이 페이지는 결재선 템플릿 빌더 조회 권한이 있는 사용자만 접근할 수 있습니다.</p>
            </div>
        );
    }

    const [departments, setDepartments] = useState([]);
    const [companyUsers, setCompanyUsers] = useState([]);
    const [steps, setSteps] = useState([]);

    // 1. 기초 데이터 로드
    useEffect(() => {
        const init = async () => {
            try {
                const [dtRes, deptRes, userRes] = await Promise.all([
                    fetchApprovalDocTypes(true),
                    fetchActiveDepartments(userCompany),
                    fetchCompanyUsersForApproval('', userCompany)
                ]);
                setDocTypes(dtRes.data || []);
                setDepartments(deptRes.data || []);
                setCompanyUsers(userRes.data || []);

                if (dtRes.data && dtRes.data.length > 0) {
                    setSelectedDocTypeId(dtRes.data[0].id);
                }
            } catch (err) {
                showAlert?.("기초 정보를 불러오지 못했습니다.");
            }
        };
        init();
    }, [userCompany, showAlert]);

    // 2. 문서 유형 변경 시 해당 템플릿 로드
    const loadTemplate = useCallback(async (docTypeId) => {
        if (!docTypeId) return;
        try {
            const res = await fetchAdminApprovalTemplateByDocTypeId(docTypeId);
            if (res.data) {
                setCurrentTemplate(res.data);
                setSteps(res.data.steps || []);
            } else {
                setCurrentTemplate(null);
                // 기본 1단계(부서장 결재) 프리셋 제공
                setSteps([
                    {
                        stepOrder: 1,
                        stepType: 'APPROVAL',
                        assigneeType: 'SUBMITTER_MANAGER',
                        assigneeRole: 'DEPT_HEAD',
                        assigneeDepartmentId: '',
                        assigneeUserId: '',
                        isRequired: true
                    }
                ]);
            }
        } catch (err) {
            setCurrentTemplate(null);
            setSteps([]);
        }
    }, []);

    useEffect(() => {
        if (selectedDocTypeId) {
            loadTemplate(selectedDocTypeId);
            setShowHistory(false);
        }
    }, [selectedDocTypeId, loadTemplate]);

    const loadHistory = async () => {
        if (!selectedDocTypeId) return;
        try {
            const res = await fetchApprovalTemplateHistory(selectedDocTypeId);
            setTemplateHistory(res.data || []);
            setShowHistory(true);
        } catch (err) {
            showAlert?.("템플릿 이력을 불러오지 못했습니다.");
        }
    };

    // 단계 조작 함수들
    const addStep = (stepType = 'APPROVAL') => {
        const nextOrder = steps.filter(s => s.stepType !== 'REFERENCE').length + 1;
        setSteps([
            ...steps,
            {
                stepOrder: stepType === 'REFERENCE' ? 0 : nextOrder,
                stepType: stepType,
                assigneeType: 'ROLE',
                assigneeRole: 'DEPT_HEAD',
                assigneeDepartmentId: departments.length > 0 ? departments[0].id : '',
                assigneeUserId: '',
                isRequired: true
            }
        ]);
    };

    const updateStep = (index, field, value) => {
        const updated = [...steps];
        updated[index] = { ...updated[index], [field]: value };
        setSteps(updated);
    };

    const removeStep = (index) => {
        const updated = steps.filter((_, i) => i !== index);
        // re-index step orders
        let order = 1;
        const reordered = updated.map(s => {
            if (s.stepType === 'REFERENCE') return { ...s, stepOrder: 0 };
            return { ...s, stepOrder: order++ };
        });
        setSteps(reordered);
    };

    const moveStep = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= steps.length) return;
        const updated = [...steps];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;

        let order = 1;
        const reordered = updated.map(s => {
            if (s.stepType === 'REFERENCE') return { ...s, stepOrder: 0 };
            return { ...s, stepOrder: order++ };
        });
        setSteps(reordered);
    };

    // 템플릿 저장 (새 버전 생성)
    const handleSaveTemplate = async () => {
        if (!selectedDocTypeId) return;
        if (steps.filter(s => s.stepType !== 'REFERENCE').length === 0) {
            showAlert?.("최소 1개 이상의 결재/합의 단계가 필요합니다.");
            return;
        }

        const nextVersion = (currentTemplate?.version || 0) + 1;
        showConfirm?.(`결재선 템플릿을 신규 버전(v${nextVersion})으로 배포하시겠습니까?\n(기존 진행 중인 결재 문서는 기존 템플릿 스냅샷을 유지합니다.)`, async () => {
            try {
                await saveApprovalTemplate({
                    docTypeId: Number(selectedDocTypeId),
                    steps: steps.map((s, idx) => ({
                        ...s,
                        assigneeDepartmentId: s.assigneeDepartmentId ? Number(s.assigneeDepartmentId) : null,
                        assigneeUserId: s.assigneeUserId ? Number(s.assigneeUserId) : null,
                        stepOrder: s.stepType === 'REFERENCE' ? 0 : s.stepOrder
                    }))
                });
                showAlert?.(`템플릿 v${nextVersion}이 성공적으로 배포되었습니다.`);
                loadTemplate(selectedDocTypeId);
            } catch (err) {
                showAlert?.("템플릿 저장에 실패했습니다.");
            }
        });
    };

    const selectedDocType = docTypes.find(d => String(d.id) === String(selectedDocTypeId));

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                        📐 결재선 템플릿 빌더
                    </h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                        문서유형별 표준 결재선(부서 역할 기반 또는 특정인)을 데이터로 정의하여 유연하게 확장합니다.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={loadHistory}
                        style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        📜 버전 이력 조회
                    </button>
                    {hasEdit && (
                        <button
                            onClick={handleSaveTemplate}
                            style={{ padding: '8px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                        >
                            💾 새 버전 배포 ({currentTemplate ? `v${(currentTemplate.version || 1) + 1}` : 'v1'})
                        </button>
                    )}
                </div>
            </div>

            {/* 컨트롤 바 */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#fff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>결재 문서유형:</label>
                    <select
                        value={selectedDocTypeId}
                        onChange={(e) => setSelectedDocTypeId(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '180px' }}
                    >
                        {docTypes.map(dt => (
                            <option key={dt.id} value={dt.id}>
                                {dt.name} ({dt.code})
                            </option>
                        ))}
                    </select>
                </div>

                {currentTemplate ? (
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                        <span>현재 배포 버전: <b style={{ color: '#0369a1' }}>v{currentTemplate.version}</b></span>
                        <span>배포자: <b>{currentTemplate.createdByName}</b></span>
                        <span>배포일시: <b>{new Date(currentTemplate.createdAt).toLocaleDateString()}</b></span>
                    </div>
                ) : (
                    <span style={{ fontSize: '12px', color: '#ea580c', fontWeight: 'bold' }}>
                        ⚠️ 등록된 결재선 템플릿이 없습니다. 단계를 구성한 후 배포해 주십시오.
                    </span>
                )}
            </div>

            {/* 메인 빌더 영역 */}
            {!showHistory ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
                            결재 단계 구성 ({steps.length}단계) {!hasEdit && <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 'normal' }}>(조회 전용)</span>}
                        </span>
                        {hasEdit && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => addStep('APPROVAL')}
                                    style={{ padding: '6px 12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    ➕ 결재 단계 추가
                                </button>
                                <button
                                    onClick={() => addStep('AGREEMENT')}
                                    style={{ padding: '6px 12px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    ➕ 합의 단계 추가
                                </button>
                                <button
                                    onClick={() => addStep('REFERENCE')}
                                    style={{ padding: '6px 12px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    ➕ 참조 단계 추가
                                </button>
                            </div>
                        )}
                    </div>

                    {steps.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                            결재 단계가 없습니다. 상단의 '단계 추가' 버튼을 눌러 결재선을 구성해 주십시오.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {steps.map((step, idx) => (
                                <div key={idx} style={{
                                    display: 'grid',
                                    gridTemplateColumns: hasEdit ? '70px 100px 140px 1fr 1fr 90px 100px' : '70px 100px 140px 1fr 1fr 90px',
                                    gap: '10px',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    backgroundColor: step.stepType === 'REFERENCE' ? '#f8fafc' : '#ffffff',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}>
                                    {/* 순서 */}
                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            width: '28px',
                                            height: '28px',
                                            lineHeight: '28px',
                                            borderRadius: '50%',
                                            backgroundColor: step.stepType === 'REFERENCE' ? '#e2e8f0' : '#0f172a',
                                            color: step.stepType === 'REFERENCE' ? '#475569' : '#fff',
                                            fontWeight: 'bold',
                                            fontSize: '12px'
                                        }}>
                                            {step.stepType === 'REFERENCE' ? '참조' : step.stepOrder}
                                        </span>
                                    </div>

                                    {/* 단계 유형 */}
                                    <div>
                                        <select
                                            value={step.stepType}
                                            onChange={(e) => updateStep(idx, 'stepType', e.target.value)}
                                            disabled={!hasEdit}
                                            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold', backgroundColor: !hasEdit ? '#f1f5f9' : '#fff' }}
                                        >
                                            <option value="APPROVAL">결재</option>
                                            <option value="AGREEMENT">합의</option>
                                            <option value="REFERENCE">참조</option>
                                        </select>
                                    </div>

                                    {/* 지정 방식 */}
                                    <div>
                                        <select
                                            value={step.assigneeType}
                                            onChange={(e) => updateStep(idx, 'assigneeType', e.target.value)}
                                            disabled={!hasEdit}
                                            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: !hasEdit ? '#f1f5f9' : '#fff' }}
                                        >
                                            <option value="SUBMITTER_MANAGER">상신자 부서장</option>
                                            <option value="ROLE">부서 역할 마스터</option>
                                            <option value="USER">특정 사용자</option>
                                        </select>
                                    </div>

                                    {/* 부서 / 역할 / 사용자 세부 지정 */}
                                    {step.assigneeType === 'ROLE' ? (
                                        <>
                                            <div>
                                                <select
                                                    value={step.assigneeDepartmentId || ''}
                                                    onChange={(e) => updateStep(idx, 'assigneeDepartmentId', e.target.value)}
                                                    disabled={!hasEdit}
                                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: !hasEdit ? '#f1f5f9' : '#fff' }}
                                                >
                                                    <option value="">상신자 소속 부서</option>
                                                    {departments.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <select
                                                    value={step.assigneeRole || 'DEPT_HEAD'}
                                                    onChange={(e) => updateStep(idx, 'assigneeRole', e.target.value)}
                                                    disabled={!hasEdit}
                                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: !hasEdit ? '#f1f5f9' : '#fff' }}
                                                >
                                                    <option value="DEPT_HEAD">부서장 (DEPT_HEAD)</option>
                                                    <option value="DEPUTY_HEAD">부부서장 (DEPUTY_HEAD)</option>
                                                    <option value="TEAM_LEAD">팀장 (TEAM_LEAD)</option>
                                                </select>
                                            </div>
                                        </>
                                    ) : step.assigneeType === 'USER' ? (
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <select
                                                value={step.assigneeUserId || ''}
                                                onChange={(e) => updateStep(idx, 'assigneeUserId', e.target.value)}
                                                disabled={!hasEdit}
                                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: !hasEdit ? '#f1f5f9' : '#fff' }}
                                            >
                                                <option value="">-- 결재자 지정 --</option>
                                                {companyUsers.map(u => (
                                                    <option key={u.id} value={u.id}>
                                                        {u.name} ({u.username}) - {u.department || '부서미지정'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div style={{ gridColumn: 'span 2', fontSize: '12px', color: '#64748b', fontStyle: 'italic', paddingLeft: '8px' }}>
                                            상신자의 회사 및 소속 부서 기준 '부서장'이 상신 시점에 자동 resolve 됩니다.
                                        </div>
                                    )}

                                    {/* 필수 여부 */}
                                    <div style={{ textAlign: 'center' }}>
                                        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: hasEdit ? 'pointer' : 'default' }}>
                                            <input
                                                type="checkbox"
                                                checked={step.isRequired !== false}
                                                disabled={!hasEdit}
                                                onChange={(e) => updateStep(idx, 'isRequired', e.target.checked)}
                                            />
                                            필수
                                        </label>
                                    </div>

                                    {/* 조작 버튼 */}
                                    {hasEdit && (
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                disabled={idx === 0}
                                                onClick={() => moveStep(idx, -1)}
                                                style={{ padding: '3px 6px', fontSize: '11px', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                                            >
                                                ▲
                                            </button>
                                            <button
                                                type="button"
                                                disabled={idx === steps.length - 1}
                                                onClick={() => moveStep(idx, 1)}
                                                style={{ padding: '3px 6px', fontSize: '11px', cursor: idx === steps.length - 1 ? 'not-allowed' : 'pointer' }}
                                            >
                                                ▼
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeStep(idx)}
                                                style={{ padding: '3px 6px', fontSize: '11px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* 버전 이력 뷰 */
                <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                            📜 [{selectedDocType?.name}] 결재선 버전 이력
                        </h3>
                        <button
                            onClick={() => setShowHistory(false)}
                            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                        >
                            ← 빌더로 돌아가기
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {templateHistory.map(t => (
                            <div key={t.id} style={{
                                padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                backgroundColor: t.isCurrent ? '#f0fdf4' : '#f8fafc'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>v{t.version}</span>
                                        {t.isCurrent && (
                                            <span style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 'bold', borderRadius: '4px' }}>
                                                현재 사용 중
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        배포자: {t.createdByName} | 배포일: {new Date(t.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {t.steps.map((st, i) => (
                                        <span key={i} style={{ padding: '3px 8px', backgroundColor: '#e2e8f0', borderRadius: '4px', fontSize: '11px', color: '#334155' }}>
                                            {st.stepOrder}단계: {st.stepType} ({st.assigneeType === 'SUBMITTER_MANAGER' ? '상신자 부서장' : st.assigneeRole || st.assigneeUserName})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalTemplateBuilderPage;
