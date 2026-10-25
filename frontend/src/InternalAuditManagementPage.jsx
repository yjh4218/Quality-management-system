import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import {
    fetchInternalAuditKpi,
    fetchInternalAudits,
    createInternalAudit,
    updateInternalAudit,
    deleteInternalAudit,
    fetchAuditChecklists,
    createAuditChecklist,
    updateAuditChecklist,
    deleteAuditChecklist,
    fetchAllAuditFindings,
    fetchAuditFindings,
    createAuditFinding,
    updateAuditFinding,
    deleteAuditFinding,
    fetchAllManagementReviews,
    createManagementReview,
    updateManagementReview,
    deleteManagementReview
} from './api';

// =========================================================================
// 상수 & 옵션
// =========================================================================

const AUDIT_TYPE_OPTIONS = [
    { value: 'REGULAR_INTERNAL', label: '정기 내부심사 (ISO 13485)' },
    { value: 'SPECIAL_INTERNAL', label: '특별/수시 내부심사' },
    { value: 'SELF_INSPECTION_CGMP', label: '화장품 자체점검 (ISO 22716/CGMP)' },
    { value: 'PRE_INSPECTION', label: '인증/규제기관 사전모의심사' }
];

const AUDIT_SCOPE_OPTIONS = [
    { value: 'QMS_FULL', label: '전체 품질경영시스템 (QMS 전체)' },
    { value: 'MANUFACTURING_PROCESS', label: '제조 및 공정관리' },
    { value: 'QUALITY_CONTROL', label: '품질관리 및 시험분석' },
    { value: 'DESIGN_DEVELOPMENT', label: '설계개발 및 DHF' },
    { value: 'FACILITY_EQUIPMENT', label: '시설설비 및 청정환경' },
    { value: 'SUPPLIER_CHAIN', label: '구매 및 협력업체 관리' }
];

const AUDIT_STATUS_OPTIONS = [
    { value: 'PLANNED', label: '계획 수립', color: '#2563eb', bg: '#eff6ff' },
    { value: 'IN_PROGRESS', label: '심사 진행 중', color: '#d97706', bg: '#fef3c7' },
    { value: 'REPORT_PENDING', label: '보고서 작성 중', color: '#9333ea', bg: '#f3e8ff' },
    { value: 'APPROVED', label: '심사 보고 승인', color: '#16a34a', bg: '#dcfce7' },
    { value: 'FOLLOW_UP', label: '후속 조치 추적', color: '#0284c7', bg: '#e0f2fe' },
    { value: 'CLOSED', label: '최종 종결', color: '#475569', bg: '#f1f5f9' },
    { value: 'CANCELLED', label: '심사 취소', color: '#dc2626', bg: '#fee2e2' }
];

const CHECKLIST_RESULT_OPTIONS = [
    { value: 'CONFORMING', label: '적합', color: '#16a34a', bg: '#dcfce7' },
    { value: 'NON_CONFORMING', label: '부적합 (Finding 발행)', color: '#dc2626', bg: '#fee2e2' },
    { value: 'NOT_APPLICABLE', label: '해당없음 (N/A)', color: '#64748b', bg: '#f8fafc' }
];

const FINDING_CLASSIFICATION_OPTIONS = [
    { value: 'CRITICAL', label: '중대 부적합 (Critical)', color: '#dc2626', bg: '#fee2e2', desc: '안전성/법적규제 치명적 결함 (CAPA 필수)' },
    { value: 'MAJOR', label: '주요 부적합 (Major)', color: '#ea580c', bg: '#ffedd5', desc: '품질시스템 핵심 요건 결여 (CAPA 필수)' },
    { value: 'MINOR', label: '경미 부적합 (Minor)', color: '#d97706', bg: '#fef3c7', desc: '일회성/경미한 절차 불이행' },
    { value: 'OBSERVATION', label: '권고/관찰사항 (Observation)', color: '#2563eb', bg: '#eff6ff', desc: '개선 기회 제안' }
];

const FINDING_STATUS_OPTIONS = [
    { value: 'OPEN', label: '시정조치 요구/대기', color: '#dc2626', bg: '#fee2e2' },
    { value: 'ACTION_SUBMITTED', label: '대책서 제출 완료', color: '#d97706', bg: '#fef3c7' },
    { value: 'CAPA_LINKED', label: 'CAPA 발행 연계', color: '#9333ea', bg: '#f3e8ff' },
    { value: 'VERIFIED', label: '시정조치 검증 완료', color: '#0284c7', bg: '#e0f2fe' },
    { value: 'CLOSED', label: '최종 종결', color: '#16a34a', bg: '#dcfce7' }
];

const MANAGEMENT_REVIEW_TYPE_OPTIONS = [
    { value: 'REGULAR_ANNUAL', label: '정기 연차 경영검토' },
    { value: 'SEMI_ANNUAL', label: '반기 경영검토' },
    { value: 'SPECIAL_REVIEW', label: '특별 경영검토 (중대 이슈/규제 변경)' }
];

const MANAGEMENT_REVIEW_STATUS_OPTIONS = [
    { value: 'SCHEDULED', label: '일정 수립/소집 통보', color: '#2563eb', bg: '#eff6ff' },
    { value: 'IN_SESSION', label: '회의 진행 중', color: '#d97706', bg: '#fef3c7' },
    { value: 'MINUTES_DRAFTED', label: '회의록 초안 작성', color: '#9333ea', bg: '#f3e8ff' },
    { value: 'APPROVED', label: '최고경영자 승인 종결', color: '#16a34a', bg: '#dcfce7' }
];

export default function InternalAuditManagementPage({ user, onNavigate }) {
    // 탭 상태: AUDIT_PLAN, AUDIT_EXECUTION, AUDIT_FINDINGS, MANAGEMENT_REVIEW
    const [activeTab, setActiveTab] = useState('AUDIT_PLAN');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Grid API
    const [gridApi, setGridApi] = useState(null);

    // KPI 상태
    const [kpi, setKpi] = useState({
        annualPlannedAudits: 0,
        completedAudits: 0,
        auditExecutionRate: 0,
        inProgressAudits: 0,
        openFindings: 0,
        criticalMajorFindings: 0,
        capaLinkedFindings: 0,
        recentReviewApproved: false,
        nextReviewDueDate: null
    });

    // 데이터 목록
    const [audits, setAudits] = useState([]);
    const [checklists, setChecklists] = useState([]);
    const [findings, setFindings] = useState([]);
    const [reviews, setReviews] = useState([]);

    // 선택된 심사 건 (체크리스트 필터링용)
    const [selectedAuditId, setSelectedAuditId] = useState(null);

    // 모달 상태
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [showChecklistModal, setShowChecklistModal] = useState(false);
    const [showFindingModal, setShowFindingModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);

    // 편집 대상
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [selectedChecklist, setSelectedChecklist] = useState(null);
    const [selectedFinding, setSelectedFinding] = useState(null);
    const [selectedReview, setSelectedReview] = useState(null);

    // -------------------------------------------------------------------------
    // 데이터 로드
    // -------------------------------------------------------------------------
    const loadAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [kpiData, auditList, findingList, reviewList] = await Promise.all([
                fetchInternalAuditKpi().catch(() => null),
                fetchInternalAudits().catch(() => []),
                fetchAllAuditFindings().catch(() => []),
                fetchAllManagementReviews().catch(() => [])
            ]);

            if (kpiData) setKpi(kpiData);
            setAudits(auditList || []);
            setFindings(findingList || []);
            setReviews(reviewList || []);

            // 체크리스트 로드 (특정 심사 선택 시 또는 첫 번째 심사 기준)
            const targetAuditId = selectedAuditId || (auditList && auditList.length > 0 ? auditList[0].id : null);
            if (targetAuditId) {
                setSelectedAuditId(targetAuditId);
                const checkList = await fetchAuditChecklists(targetAuditId).catch(() => []);
                setChecklists(checkList || []);
            }
        } catch (error) {
            console.error('Failed to load internal audit data:', error);
            toast.error('내부심사 데이터 로드에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [selectedAuditId]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const handleSelectAuditForChecklist = async (auditId) => {
        setSelectedAuditId(auditId);
        try {
            const checkList = await fetchAuditChecklists(auditId);
            setChecklists(checkList || []);
        } catch (err) {
            console.error(err);
            toast.error('해당 심사의 체크리스트를 불러오지 못했습니다.');
        }
    };

    // -------------------------------------------------------------------------
    // CSV 내보내기 & 새로고침
    // -------------------------------------------------------------------------
    const handleExportCsv = () => {
        if (gridApi) {
            gridApi.exportDataAsCsv({
                fileName: `InternalAudit_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`
            });
        }
    };

    const handleOpenCreateModal = () => {
        if (activeTab === 'AUDIT_PLAN') {
            setSelectedAudit(null);
            setShowAuditModal(true);
        } else if (activeTab === 'AUDIT_EXECUTION') {
            if (!selectedAuditId) {
                toast.warning('체크리스트를 추가할 대상 심사를 먼저 선택하십시오.');
                return;
            }
            setSelectedChecklist(null);
            setShowChecklistModal(true);
        } else if (activeTab === 'AUDIT_FINDINGS') {
            setSelectedFinding(null);
            setShowFindingModal(true);
        } else if (activeTab === 'MANAGEMENT_REVIEW') {
            setSelectedReview(null);
            setShowReviewModal(true);
        }
    };

    // -------------------------------------------------------------------------
    // AG Grid 컬럼 정의
    // -------------------------------------------------------------------------
    const auditColumns = useMemo(() => [
        { headerName: '심사 번호', field: 'auditNumber', width: 140, pinned: 'left', cellStyle: { fontWeight: 'bold', color: '#1e293b' } },
        { headerName: '심사 제목', field: 'title', width: 260, cellStyle: { color: '#0f172a', fontWeight: '500' } },
        { headerName: '심사 유형', field: 'auditTypeDescription', width: 170 },
        { headerName: '심사 범위', field: 'auditScopeDescription', width: 170 },
        { headerName: '피심사 부서', field: 'auditeeDepartment', width: 130, cellStyle: { fontWeight: '500' } },
        { headerName: '피심사 책임자', field: 'auditeeLeadName', width: 120 },
        { headerName: '선임 심사원', field: 'leadAuditorName', width: 110 },
        { headerName: '심사원 소속부서', field: 'leadAuditorDepartment', width: 130, cellStyle: { color: '#0369a1', fontWeight: '500' } },
        { headerName: '계획 시작일', field: 'plannedStartDate', width: 115 },
        { headerName: '계획 종료일', field: 'plannedEndDate', width: 115 },
        {
            headerName: '진행 상태',
            field: 'status',
            width: 130,
            cellRenderer: (params) => {
                const opt = AUDIT_STATUS_OPTIONS.find(o => o.value === params.value) || { label: params.value, color: '#475569', bg: '#f1f5f9' };
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: opt.color,
                        backgroundColor: opt.bg
                    }}>
                        {opt.label}
                    </span>
                );
            }
        },
        { headerName: '체크리스트', field: 'checklistCount', width: 100, cellStyle: { textAlign: 'center' } },
        { headerName: '지적 건수', field: 'findingCount', width: 95, cellStyle: { textAlign: 'center', fontWeight: 'bold' } },
        {
            headerName: '중대/주요',
            field: 'criticalMajorFindingCount',
            width: 105,
            cellStyle: { textAlign: 'center' },
            cellRenderer: (params) => (
                <span style={{ color: params.value > 0 ? '#dc2626' : '#64748b', fontWeight: params.value > 0 ? '700' : 'normal' }}>
                    {params.value} 건
                </span>
            )
        },
        {
            headerName: '관리',
            width: 160,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedAudit(params.data);
                            setShowAuditModal(true);
                        }}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            cursor: 'pointer'
                        }}
                    >
                        수정
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedAuditId(params.data.id);
                            setActiveTab('AUDIT_EXECUTION');
                            handleSelectAuditForChecklist(params.data.id);
                        }}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #0284c7',
                            background: '#eff6ff',
                            color: '#0284c7',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        체크리스트
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            if (window.confirm(`내부심사 계획 [${params.data.auditNumber}]을(를) 삭제하시겠습니까?`)) {
                                try {
                                    await deleteInternalAudit(params.data.id);
                                    toast.success('심사 계획이 삭제되었습니다.');
                                    loadAllData();
                                } catch (e) {
                                    toast.error('삭제에 실패했습니다.');
                                }
                            }
                        }}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer'
                        }}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ], [loadAllData]);

    const checklistColumns = useMemo(() => [
        { headerName: 'ID', field: 'id', width: 80, pinned: 'left' },
        { headerName: '심사 번호', field: 'auditNumber', width: 140, pinned: 'left', cellStyle: { fontWeight: 'bold' } },
        { headerName: '규격 조항', field: 'clauseNumber', width: 160, cellStyle: { color: '#0369a1', fontWeight: '600' } },
        { headerName: '체크포인트 (점검 항목)', field: 'checkpoint', width: 340 },
        { headerName: '심사 방법', field: 'auditMethod', width: 130 },
        { headerName: '확인 증빙 / 관찰 사실', field: 'evidenceNotes', width: 300 },
        {
            headerName: '점검 판정',
            field: 'result',
            width: 140,
            cellRenderer: (params) => {
                const opt = CHECKLIST_RESULT_OPTIONS.find(o => o.value === params.value) || { label: params.value, color: '#475569', bg: '#f1f5f9' };
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: opt.color,
                        backgroundColor: opt.bg
                    }}>
                        {opt.label}
                    </span>
                );
            }
        },
        { headerName: '심사자', field: 'auditedBy', width: 100 },
        { headerName: '점검일자', field: 'auditedDate', width: 110 },
        {
            headerName: '관리',
            width: 140,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedChecklist(params.data);
                            setShowChecklistModal(true);
                        }}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            cursor: 'pointer'
                        }}
                    >
                        수정
                    </button>
                    {params.data.result === 'NON_CONFORMING' && (
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedFinding({
                                    internalAuditId: params.data.internalAuditId,
                                    auditChecklistId: params.data.id,
                                    clauseNumber: params.data.clauseNumber,
                                    findingDetails: params.data.evidenceNotes || params.data.checkpoint
                                });
                                setShowFindingModal(true);
                            }}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #dc2626',
                                background: '#fef2f2',
                                color: '#dc2626',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            +지적발행
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={async () => {
                            if (window.confirm('체크리스트 항목을 삭제하시겠습니까?')) {
                                try {
                                    await deleteAuditChecklist(params.data.id);
                                    toast.success('항목이 삭제되었습니다.');
                                    if (selectedAuditId) handleSelectAuditForChecklist(selectedAuditId);
                                } catch (e) {
                                    toast.error('삭제 실패');
                                }
                            }
                        }}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #fecaca',
                            background: '#ffffff',
                            color: '#dc2626',
                            cursor: 'pointer'
                        }}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ], [selectedAuditId]);

    const findingColumns = useMemo(() => [
        { headerName: '지적 번호', field: 'findingNumber', width: 140, pinned: 'left', cellStyle: { fontWeight: 'bold', color: '#1e293b' } },
        { headerName: '심사 번호', field: 'auditNumber', width: 140, cellStyle: { fontWeight: '500' } },
        { headerName: '규격 조항', field: 'clauseNumber', width: 150, cellStyle: { color: '#0369a1', fontWeight: '600' } },
        {
            headerName: '부적합 분류',
            field: 'classification',
            width: 140,
            cellRenderer: (params) => {
                const opt = FINDING_CLASSIFICATION_OPTIONS.find(o => o.value === params.value) || { label: params.value, color: '#475569', bg: '#f1f5f9' };
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: opt.color,
                        backgroundColor: opt.bg
                    }}>
                        {opt.label.split(' ')[0]}
                    </span>
                );
            }
        },
        {
            headerName: '상태',
            field: 'status',
            width: 140,
            cellRenderer: (params) => {
                const opt = FINDING_STATUS_OPTIONS.find(o => o.value === params.value) || { label: params.value, color: '#475569', bg: '#f1f5f9' };
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: opt.color,
                        backgroundColor: opt.bg
                    }}>
                        {opt.label}
                    </span>
                );
            }
        },
        { headerName: '지적 상세 내용 (부적합 사실)', field: 'findingDetails', width: 320 },
        { headerName: '피심사부서 조치 계획', field: 'auditeeActionPlan', width: 260 },
        { headerName: '조치 기한', field: 'actionDueDate', width: 110 },
        {
            headerName: 'CAPA 연계 번호',
            field: 'capaNumber',
            width: 160,
            cellRenderer: (params) => params.value ? (
                <span
                    onClick={() => onNavigate && onNavigate('capaManagement', { capaNumber: params.value })}
                    style={{
                        color: '#9333ea',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}
                >
                    🛡️ {params.value}
                </span>
            ) : <span style={{ color: '#94a3b8' }}>-</span>
        },
        { headerName: '검증 심사원', field: 'verifiedBy', width: 110 },
        { headerName: '검증일자', field: 'verifiedDate', width: 110 },
        {
            headerName: '관리',
            width: 130,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedFinding(params.data);
                            setShowFindingModal(true);
                        }}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            cursor: 'pointer'
                        }}
                    >
                        수정/CAPA
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            if (window.confirm(`지적사항 [${params.data.findingNumber}]을(를) 삭제하시겠습니까?`)) {
                                try {
                                    await deleteAuditFinding(params.data.id);
                                    toast.success('지적사항이 삭제되었습니다.');
                                    loadAllData();
                                } catch (e) {
                                    toast.error('삭제 실패');
                                }
                            }
                        }}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer'
                        }}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ], [loadAllData, onNavigate]);

    const reviewColumns = useMemo(() => [
        { headerName: '검토 번호', field: 'reviewNumber', width: 140, pinned: 'left', cellStyle: { fontWeight: 'bold', color: '#1e293b' } },
        { headerName: '경영검토 안건/제목', field: 'title', width: 280, cellStyle: { color: '#0f172a', fontWeight: '500' } },
        { headerName: '검토 유형', field: 'reviewTypeDescription', width: 160 },
        { headerName: '회의 일자', field: 'reviewDate', width: 115, cellStyle: { fontWeight: 'bold' } },
        { headerName: '주관자(대표이사/품질책임자)', field: 'chairpersonName', width: 160, cellStyle: { color: '#0369a1' } },
        {
            headerName: '진행 상태',
            field: 'status',
            width: 140,
            cellRenderer: (params) => {
                const opt = MANAGEMENT_REVIEW_STATUS_OPTIONS.find(o => o.value === params.value) || { label: params.value, color: '#475569', bg: '#f1f5f9' };
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: opt.color,
                        backgroundColor: opt.bg
                    }}>
                        {opt.label}
                    </span>
                );
            }
        },
        { headerName: '자원배분/지원 결정사항', field: 'resourceAllocationDecisions', width: 280 },
        { headerName: 'QMS 개선 결정사항', field: 'qmsImprovementDecisions', width: 280 },
        { headerName: '차기 검토 예정일', field: 'nextReviewDueDate', width: 125, cellStyle: { color: '#d97706', fontWeight: '600' } },
        { headerName: '최종 승인자', field: 'approvedBy', width: 120 },
        {
            headerName: '관리',
            width: 130,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedReview(params.data);
                            setShowReviewModal(true);
                        }}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            cursor: 'pointer'
                        }}
                    >
                        열람/수정
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            if (window.confirm(`경영검토 회의록 [${params.data.reviewNumber}]을(를) 삭제하시겠습니까?`)) {
                                try {
                                    await deleteManagementReview(params.data.id);
                                    toast.success('경영검토 회의록이 삭제되었습니다.');
                                    loadAllData();
                                } catch (e) {
                                    toast.error('삭제 실패');
                                }
                            }
                        }}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer'
                        }}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ], [loadAllData]);

    // -------------------------------------------------------------------------
    // 필터링 데이터
    // -------------------------------------------------------------------------
    const currentTableData = useMemo(() => {
        let list = [];
        if (activeTab === 'AUDIT_PLAN') list = audits;
        else if (activeTab === 'AUDIT_EXECUTION') list = checklists;
        else if (activeTab === 'AUDIT_FINDINGS') list = findings;
        else if (activeTab === 'MANAGEMENT_REVIEW') list = reviews;

        if (!searchTerm.trim()) return list;
        const kw = searchTerm.toLowerCase().trim();
        return list.filter(item => {
            const str = JSON.stringify(item).toLowerCase();
            return str.includes(kw);
        });
    }, [activeTab, audits, checklists, findings, reviews, searchTerm]);

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            {/* 1. 3-Tier Header */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>📋</span>
                        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                            내부심사·자체점검 및 경영검토 (ISO 13485 / ISO 22716 / ISO 19011)
                        </h1>
                        <span style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '600' }}>
                            Step 19
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#334155',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            📥 CSV 내보내기
                        </button>
                        <button
                            type="button"
                            onClick={loadAllData}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#334155',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 새로고침
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenCreateModal}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            {activeTab === 'AUDIT_PLAN' && '+ 신규 심사 계획 등록'}
                            {activeTab === 'AUDIT_EXECUTION' && '+ 체크리스트 항목 추가'}
                            {activeTab === 'AUDIT_FINDINGS' && '+ 지적사항(Finding) 등록'}
                            {activeTab === 'MANAGEMENT_REVIEW' && '+ 경영검토 회의록 작성'}
                        </button>
                    </div>
                </div>

                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>
                    ISO 13485:2016 §8.2.4(내부심사) 및 ISO 19011 규정에 따른 심사원 독립성 가드(자기부서 심사 금지), ISO 22716 §13 자체점검, 중대/주요 부적합 지적사항 CAPA 의무 연계, ISO 13485 §5.6 / 21 CFR 820.20 최고경영자 경영검토(12대 입력 & 3대 출력)를 통합 운영합니다.
                </p>

                {/* RegulatoryManualBanner 연동 */}
                <RegulatoryManualBanner docId="SOP-IA-01" onNavigate={onNavigate} />
            </div>

            {/* 2. 6대 실시간 반응형 KPI 카드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>연간 심사 계획 / 실시율</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{kpi.completedAudits} / {kpi.annualPlannedAudits}</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb' }}>({kpi.auditExecutionRate}%)</span>
                    </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #d97706', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>진행 중 심사 (In-Progress)</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#d97706' }}>
                        {kpi.inProgressAudits} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>건</span>
                    </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #dc2626', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>미종결 지적사항 (Open)</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: kpi.openFindings > 0 ? '#dc2626' : '#16a34a' }}>
                        {kpi.openFindings} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>건</span>
                    </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ea580c', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>중대/주요 부적합 (Critical/Major)</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: kpi.criticalMajorFindings > 0 ? '#ea580c' : '#16a34a' }}>
                        {kpi.criticalMajorFindings} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>건</span>
                    </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #9333ea', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>CAPA 연계 지적사항</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#9333ea' }}>
                        {kpi.capaLinkedFindings} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>건</span>
                    </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>연간 경영검토 완료 / 차기</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: kpi.recentReviewApproved ? '#16a34a' : '#d97706' }}>
                        {kpi.recentReviewApproved ? '✅ 완료 (적합)' : '⏳ 예정/진행중'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        차기: {kpi.nextReviewDueDate || '일정 미수립'}
                    </div>
                </div>
            </div>

            {/* 3. 4대 탭 네비게이션 */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('AUDIT_PLAN')}
                    style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: activeTab === 'AUDIT_PLAN' ? '700' : '500',
                        color: activeTab === 'AUDIT_PLAN' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'AUDIT_PLAN' ? '2px solid #2563eb' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    📅 1. 내부심사 계획 및 일정 ({audits.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('AUDIT_EXECUTION')}
                    style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: activeTab === 'AUDIT_EXECUTION' ? '700' : '500',
                        color: activeTab === 'AUDIT_EXECUTION' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'AUDIT_EXECUTION' ? '2px solid #2563eb' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    📝 2. 심사 체크리스트 & 점검 ({checklists.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('AUDIT_FINDINGS')}
                    style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: activeTab === 'AUDIT_FINDINGS' ? '700' : '500',
                        color: activeTab === 'AUDIT_FINDINGS' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'AUDIT_FINDINGS' ? '2px solid #2563eb' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    ⚠️ 3. 지적사항(Finding) 원장 & CAPA ({findings.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('MANAGEMENT_REVIEW')}
                    style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: activeTab === 'MANAGEMENT_REVIEW' ? '700' : '500',
                        color: activeTab === 'MANAGEMENT_REVIEW' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'MANAGEMENT_REVIEW' ? '2px solid #2563eb' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    🏛️ 4. 최고경영자 경영검토 회의록 ({reviews.length})
                </button>
            </div>

            {/* 체크리스트 탭일 경우 대상 심사 선택기 */}
            {activeTab === 'AUDIT_EXECUTION' && (
                <div style={{ backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>대상 내부심사 선택:</span>
                    <select
                        value={selectedAuditId || ''}
                        onChange={(e) => handleSelectAuditForChecklist(Number(e.target.value))}
                        style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '320px' }}
                    >
                        {audits.map(a => (
                            <option key={a.id} value={a.id}>
                                [{a.auditNumber}] {a.title} ({a.auditeeDepartment} / {a.statusDescription})
                            </option>
                        ))}
                    </select>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                        * 선택된 심사에 배정된 체크리스트 점검 항목이 조회됩니다.
                    </span>
                </div>
            )}

            {/* 4. 검색 & 필터 카드 */}
            <div style={{ backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                    <input
                        type="text"
                        placeholder="심사번호, 제목, 부서, 규격조항, 지적내용 등 통합 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            width: '380px'
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#64748b',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        ♻️ 초기화
                    </button>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                    조회 결과: <strong style={{ color: '#0f172a' }}>{currentTableData.length}</strong> 건
                </div>
            </div>

            {/* 5. AG Grid */}
            <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 360px)', width: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <AgGridReact
                    theme="legacy"
                    rowData={currentTableData}
                    columnDefs={
                        activeTab === 'AUDIT_PLAN' ? auditColumns :
                        activeTab === 'AUDIT_EXECUTION' ? checklistColumns :
                        activeTab === 'AUDIT_FINDINGS' ? findingColumns : reviewColumns
                    }
                    rowHeight={54}
                    headerHeight={48}
                    pagination={true}
                    paginationPageSize={20}
                    onGridReady={(params) => setGridApi(params.api)}
                    overlayLoadingTemplate={'<span class="ag-overlay-loading-center">데이터 로딩 중...</span>'}
                    overlayNoRowsTemplate={'<span class="ag-overlay-loading-center">등록된 데이터가 없습니다.</span>'}
                />
            </div>

            {/* 6. 모달 4종 */}
            {showAuditModal && (
                <AuditPlanModal
                    audit={selectedAudit}
                    onClose={() => setShowAuditModal(false)}
                    onSaved={() => {
                        setShowAuditModal(false);
                        loadAllData();
                    }}
                />
            )}

            {showChecklistModal && (
                <AuditChecklistModal
                    checklist={selectedChecklist}
                    defaultAuditId={selectedAuditId}
                    audits={audits}
                    onClose={() => setShowChecklistModal(false)}
                    onSaved={() => {
                        setShowChecklistModal(false);
                        if (selectedAuditId) handleSelectAuditForChecklist(selectedAuditId);
                    }}
                />
            )}

            {showFindingModal && (
                <AuditFindingModal
                    finding={selectedFinding}
                    audits={audits}
                    checklists={checklists}
                    onClose={() => setShowFindingModal(false)}
                    onSaved={() => {
                        setShowFindingModal(false);
                        loadAllData();
                    }}
                    onNavigate={onNavigate}
                />
            )}

            {showReviewModal && (
                <ManagementReviewModal
                    review={selectedReview}
                    onClose={() => setShowReviewModal(false)}
                    onSaved={() => {
                        setShowReviewModal(false);
                        loadAllData();
                    }}
                />
            )}
        </div>
    );
}

// =========================================================================
// Modal 1: 심사 계획 등록/수정 모달 (심사원 독립성 가드 탑재)
// =========================================================================
function AuditPlanModal({ audit, onClose, onSaved }) {
    const isEdit = Boolean(audit && audit.id);

    const [form, setForm] = useState({
        title: audit?.title || '',
        auditType: audit?.auditType || 'REGULAR_INTERNAL',
        auditScope: audit?.auditScope || 'QMS_FULL',
        criteria: audit?.criteria || 'ISO 13485:2016, ISO 22716:2007, 의료기기 제조및품질관리기준',
        plannedStartDate: audit?.plannedStartDate || new Date().toISOString().slice(0, 10),
        plannedEndDate: audit?.plannedEndDate || new Date().toISOString().slice(0, 10),
        actualStartDate: audit?.actualStartDate || '',
        actualEndDate: audit?.actualEndDate || '',
        auditeeDepartment: audit?.auditeeDepartment || '',
        auditeeLeadName: audit?.auditeeLeadName || '',
        leadAuditorName: audit?.leadAuditorName || '',
        leadAuditorDepartment: audit?.leadAuditorDepartment || '',
        auditTeamMembers: audit?.auditTeamMembers || '',
        status: audit?.status || 'PLANNED',
        summaryConclusion: audit?.summaryConclusion || '',
        approvedBy: audit?.approvedBy || '',
        approvedDate: audit?.approvedDate || ''
    });

    const [saving, setSaving] = useState(false);

    // 심사원 독립성 실시간 감지
    const isIndependenceConflict = useMemo(() => {
        if (!form.auditeeDepartment || !form.leadAuditorDepartment) return false;
        return form.auditeeDepartment.trim().replace(/\s+/g, '').toLowerCase() ===
               form.leadAuditorDepartment.trim().replace(/\s+/g, '').toLowerCase();
    }, [form.auditeeDepartment, form.leadAuditorDepartment]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isIndependenceConflict) {
            toast.error('ISO 13485 §8.2.4 / ISO 19011 위반: 심사원은 자신의 소속 부서를 심사할 수 없습니다. 독립된 심사원을 배정하십시오.');
            return;
        }

        setSaving(true);
        try {
            if (isEdit) {
                await updateInternalAudit(audit.id, form);
                toast.success('심사 계획이 성공적으로 수정되었습니다.');
            } else {
                await createInternalAudit(form);
                toast.success('신규 심사 계획이 등록되었습니다.');
            }
            onSaved();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || '저장 실패';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ width: '96vw', maxWidth: '1400px', height: '92vh', maxHeight: '900px', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                {/* 헤더 */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>📅</span>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                            {isEdit ? `내부심사 계획 수정 [${audit.auditNumber}]` : '신규 내부심사 계획 수립'}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                {/* 독립성 경고 배너 */}
                {isIndependenceConflict && (
                    <div style={{ backgroundColor: '#fee2e2', borderLeft: '4px solid #dc2626', padding: '10px 20px', margin: '12px 24px 0 24px', borderRadius: '4px', fontSize: '13px', color: '#991b1b', fontWeight: '500' }}>
                        ⚠️ <strong>심사원 독립성 결여 경고:</strong> 선임 심사원 소속 부서와 피심사 부서가 동일합니다. ISO 13485:2016 §8.2.4 및 ISO 19011 규정에 의거하여 자기 부서에 대한 심사는 원천 차단됩니다.
                    </div>
                )}

                {/* 바디 */}
                <form id="auditForm" onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>심사 제목 *</label>
                            <input
                                type="text"
                                required
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder="예: 2026년 하반기 생산/품질관리 정기 내부심사"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>심사 진행 상태</label>
                            <select
                                value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                {AUDIT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>심사 유형 *</label>
                            <select
                                value={form.auditType}
                                onChange={e => setForm({ ...form, auditType: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                {AUDIT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>심사 범위 *</label>
                            <select
                                value={form.auditScope}
                                onChange={e => setForm({ ...form, auditScope: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                {AUDIT_SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>적용 심사 기준/규격</label>
                            <input
                                type="text"
                                value={form.criteria}
                                onChange={e => setForm({ ...form, criteria: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    {/* 피심사 및 심사원 독립성 영역 */}
                    <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
                            👥 심사팀 및 피심사 조직 배정 (독립성 검증 필수)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>피심사 부서 *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.auditeeDepartment}
                                    onChange={e => setForm({ ...form, auditeeDepartment: e.target.value })}
                                    placeholder="예: 제조공정관리팀"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>피심사 부서 책임자 *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.auditeeLeadName}
                                    onChange={e => setForm({ ...form, auditeeLeadName: e.target.value })}
                                    placeholder="예: 박생산 부장"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#0369a1', marginBottom: '4px' }}>선임 심사원 소속부서 * (독립성 체크)</label>
                                <input
                                    type="text"
                                    required
                                    value={form.leadAuditorDepartment}
                                    onChange={e => setForm({ ...form, leadAuditorDepartment: e.target.value })}
                                    placeholder="예: 품질보증팀"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: isIndependenceConflict ? '2px solid #dc2626' : '1px solid #cbd5e1',
                                        fontSize: '13px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#0369a1', marginBottom: '4px' }}>선임 심사원 성명 *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.leadAuditorName}
                                    onChange={e => setForm({ ...form, leadAuditorName: e.target.value })}
                                    placeholder="예: 김품질 팀장"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>동반 심사원 명단 (선택)</label>
                            <input
                                type="text"
                                value={form.auditTeamMembers}
                                onChange={e => setForm({ ...form, auditTeamMembers: e.target.value })}
                                placeholder="예: 이규제 대리, 정심사 연구원"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>계획 시작일 *</label>
                            <input
                                type="date"
                                required
                                value={form.plannedStartDate}
                                onChange={e => setForm({ ...form, plannedStartDate: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>계획 종료일 *</label>
                            <input
                                type="date"
                                required
                                value={form.plannedEndDate}
                                onChange={e => setForm({ ...form, plannedEndDate: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>실제 실시 시작일</label>
                            <input
                                type="date"
                                value={form.actualStartDate}
                                onChange={e => setForm({ ...form, actualStartDate: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>실제 실시 완료일</label>
                            <input
                                type="date"
                                value={form.actualEndDate}
                                onChange={e => setForm({ ...form, actualEndDate: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>심사 총평 및 종합 결론 (Summary Conclusion)</label>
                        <textarea
                            rows={3}
                            value={form.summaryConclusion}
                            onChange={e => setForm({ ...form, summaryConclusion: e.target.value })}
                            placeholder="내부심사 수행 결과 종합 소견을 기술하십시오."
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>승인자 (보고서 결재권자)</label>
                            <input
                                type="text"
                                value={form.approvedBy}
                                onChange={e => setForm({ ...form, approvedBy: e.target.value })}
                                placeholder="예: 강대표 대표이사"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>승인 일자</label>
                            <input
                                type="date"
                                value={form.approvedDate}
                                onChange={e => setForm({ ...form, approvedDate: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                    </div>
                </form>

                {/* 푸터 */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button type="button" onClick={onClose} style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '13px', cursor: 'pointer' }}>
                        취소
                    </button>
                    <button
                        type="submit"
                        form="auditForm"
                        disabled={saving || isIndependenceConflict}
                        style={{
                            padding: '8px 24px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isIndependenceConflict ? '#94a3b8' : '#2563eb',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: isIndependenceConflict ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {saving ? '저장 중...' : isEdit ? '수정 내용 저장' : '심사 계획 확정 등록'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// Modal 2: 체크리스트 점검 항목 등록/수정 모달
// =========================================================================
function AuditChecklistModal({ checklist, defaultAuditId, audits, onClose, onSaved }) {
    const isEdit = Boolean(checklist && checklist.id);

    const [form, setForm] = useState({
        internalAuditId: checklist?.internalAuditId || defaultAuditId || (audits[0]?.id || ''),
        clauseNumber: checklist?.clauseNumber || '',
        checkpoint: checklist?.checkpoint || '',
        auditMethod: checklist?.auditMethod || '현장실사 및 일일점검표 표본 확인',
        evidenceNotes: checklist?.evidenceNotes || '',
        result: checklist?.result || 'CONFORMING',
        auditedBy: checklist?.auditedBy || '김품질 팀장',
        auditedDate: checklist?.auditedDate || new Date().toISOString().slice(0, 10),
        remarks: checklist?.remarks || ''
    });

    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEdit) {
                await updateAuditChecklist(checklist.id, form);
                toast.success('체크리스트 항목이 수정되었습니다.');
            } else {
                await createAuditChecklist(form);
                toast.success('신규 체크리스트 항목이 추가되었습니다.');
            }
            onSaved();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || '저장 실패');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ width: '96vw', maxWidth: '1100px', height: '90vh', maxHeight: '800px', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                        {isEdit ? '심사 체크리스트 항목 수정' : '신규 체크포인트 점검 항목 추가'}
                    </h2>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                <form id="checklistForm" onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>대상 내부심사 건 *</label>
                        <select
                            disabled={isEdit}
                            value={form.internalAuditId}
                            onChange={e => setForm({ ...form, internalAuditId: Number(e.target.value) })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        >
                            {audits.map(a => <option key={a.id} value={a.id}>[{a.auditNumber}] {a.title}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>규격 조항 번호 *</label>
                            <input
                                type="text"
                                required
                                value={form.clauseNumber}
                                onChange={e => setForm({ ...form, clauseNumber: e.target.value })}
                                placeholder="예: ISO 13485 §7.5.1 / ISO 22716 §5.3"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>점검 방법</label>
                            <input
                                type="text"
                                value={form.auditMethod}
                                onChange={e => setForm({ ...form, auditMethod: e.target.value })}
                                placeholder="예: 현장실사, 문서검토, 작업자 인터뷰, 샘플링"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>체크포인트 (점검 요구사항) *</label>
                        <textarea
                            rows={3}
                            required
                            value={form.checkpoint}
                            onChange={e => setForm({ ...form, checkpoint: e.target.value })}
                            placeholder="확인해야 할 구체적인 품질 요구기준을 입력하십시오."
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>확인 증빙 내용 / 관찰 사실</label>
                        <textarea
                            rows={3}
                            value={form.evidenceNotes}
                            onChange={e => setForm({ ...form, evidenceNotes: e.target.value })}
                            placeholder="현장에서 확인된 객관적 증거, 인터뷰 답변, 샘플 번호 등을 기술하십시오."
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>점검 판정 결과 *</label>
                            <select
                                value={form.result}
                                onChange={e => setForm({ ...form, result: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
                            >
                                {CHECKLIST_RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>점검 심사원</label>
                            <input
                                type="text"
                                value={form.auditedBy}
                                onChange={e => setForm({ ...form, auditedBy: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>점검 일자</label>
                            <input
                                type="date"
                                value={form.auditedDate}
                                onChange={e => setForm({ ...form, auditedDate: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                    </div>
                </form>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button type="button" onClick={onClose} style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '13px', cursor: 'pointer' }}>
                        취소
                    </button>
                    <button
                        type="submit"
                        form="checklistForm"
                        disabled={saving}
                        style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                    >
                        {saving ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// Modal 3: 지적사항(Finding) 등록/수정 모달 (CAPA 의무 연계 가드 탑재)
// =========================================================================
function AuditFindingModal({ finding, audits, checklists, onClose, onSaved, onNavigate }) {
    const isEdit = Boolean(finding && finding.id);

    const [form, setForm] = useState({
        internalAuditId: finding?.internalAuditId || (audits[0]?.id || ''),
        auditChecklistId: finding?.auditChecklistId || null,
        clauseNumber: finding?.clauseNumber || '',
        classification: finding?.classification || 'MAJOR',
        status: finding?.status || 'OPEN',
        findingDetails: finding?.findingDetails || '',
        requirementCriteria: finding?.requirementCriteria || '',
        auditeeActionPlan: finding?.auditeeActionPlan || '',
        actionDueDate: finding?.actionDueDate || '',
        actionCompletedDate: finding?.actionCompletedDate || '',
        capaNumber: finding?.capaNumber || '',
        verifiedBy: finding?.verifiedBy || '',
        verifiedDate: finding?.verifiedDate || '',
        verificationNotes: finding?.verificationNotes || ''
    });

    const [saving, setSaving] = useState(false);

    // CRITICAL / MAJOR 일 때 CAPA 미연계 종결 시도 검증
    const isCapaClosingBlocked = useMemo(() => {
        const isHighSeverity = form.classification === 'CRITICAL' || form.classification === 'MAJOR';
        const isClosing = form.status === 'CLOSED';
        return isHighSeverity && isClosing && (!form.capaNumber || !form.capaNumber.trim());
    }, [form.classification, form.status, form.capaNumber]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isCapaClosingBlocked) {
            toast.error('중대(Critical) 또는 주요(Major) 부적합은 시정 및 예방조치(CAPA) 연계 및 조치 완료 검증 없이 종결할 수 없습니다.');
            return;
        }

        setSaving(true);
        try {
            if (isEdit) {
                await updateAuditFinding(finding.id, form);
                toast.success('지적사항이 수정되었습니다.');
            } else {
                await createAuditFinding(form);
                toast.success('신규 심사 지적사항이 등록되었습니다.');
            }
            onSaved();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || '저장 실패');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ width: '96vw', maxWidth: '1300px', height: '92vh', maxHeight: '880px', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                        {isEdit ? `심사 지적사항 수정 [${finding.findingNumber}]` : '신규 심사 지적사항(Finding) 발행'}
                    </h2>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                {isCapaClosingBlocked && (
                    <div style={{ backgroundColor: '#fee2e2', borderLeft: '4px solid #dc2626', padding: '10px 20px', margin: '12px 24px 0 24px', borderRadius: '4px', fontSize: '13px', color: '#991b1b', fontWeight: '500' }}>
                        🚨 <strong>21 CFR 820.100 / ISO 13485 §8.5.2 규제 가드:</strong> 중대(Critical) 또는 주요(Major) 부적합은 원인 규명 및 재발 방지 CAPA 번호 연동 없이는 종결(CLOSED) 처리할 수 없습니다.
                    </div>
                )}

                <form id="findingForm" onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>대상 내부심사 건 *</label>
                            <select
                                disabled={isEdit}
                                value={form.internalAuditId}
                                onChange={e => setForm({ ...form, internalAuditId: Number(e.target.value) })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                {audits.map(a => <option key={a.id} value={a.id}>[{a.auditNumber}] {a.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>규격 조항 *</label>
                            <input
                                type="text"
                                required
                                value={form.clauseNumber}
                                onChange={e => setForm({ ...form, clauseNumber: e.target.value })}
                                placeholder="예: ISO 13485 §7.5.8"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>부적합 분류 *</label>
                            <select
                                value={form.classification}
                                onChange={e => setForm({ ...form, classification: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '700', color: form.classification === 'CRITICAL' || form.classification === 'MAJOR' ? '#dc2626' : '#2563eb' }}
                            >
                                {FINDING_CLASSIFICATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>지적 상세 내용 (객관적 부적합 사실) *</label>
                        <textarea
                            rows={3}
                            required
                            value={form.findingDetails}
                            onChange={e => setForm({ ...form, findingDetails: e.target.value })}
                            placeholder="현장에서 확인된 객관적 부적합 사실을 구체적으로 기술하십시오."
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>요구 기준 규정 (SOP / 규격 요건)</label>
                        <input
                            type="text"
                            value={form.requirementCriteria}
                            onChange={e => setForm({ ...form, requirementCriteria: e.target.value })}
                            placeholder="예: SOP-MFG-02 원료 칭량 지침: 품목 전용 도구 식별 필수"
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                    </div>

                    {/* 피심사부서 대책 및 CAPA 연계 영역 */}
                    <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#fdf4ff', border: '1px solid #f0abfc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#86198f' }}>
                                🛡️ 피심사부서 시정조치 계획 및 CAPA 연동
                            </span>
                            {form.capaNumber && (
                                <button
                                    type="button"
                                    onClick={() => onNavigate && onNavigate('capaManagement', { capaNumber: form.capaNumber })}
                                    style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #c084fc', background: '#ffffff', color: '#9333ea', cursor: 'pointer', fontWeight: '600' }}
                                >
                                    CAPA 화면으로 이동 ↗
                                </button>
                            )}
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>피심사 부서 조치 계획 (Action Plan)</label>
                            <textarea
                                rows={2}
                                value={form.auditeeActionPlan}
                                onChange={e => setForm({ ...form, auditeeActionPlan: e.target.value })}
                                placeholder="원인 분석 및 재발방지 조치 계획을 입력하십시오."
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>조치 완료 요구일</label>
                                <input
                                    type="date"
                                    value={form.actionDueDate}
                                    onChange={e => setForm({ ...form, actionDueDate: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>실제 조치 완료일</label>
                                <input
                                    type="date"
                                    value={form.actionCompletedDate}
                                    onChange={e => setForm({ ...form, actionCompletedDate: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#9333ea', marginBottom: '4px' }}>
                                    연계 CAPA 번호 {(form.classification === 'CRITICAL' || form.classification === 'MAJOR') && '*'}
                                </label>
                                <input
                                    type="text"
                                    value={form.capaNumber}
                                    onChange={e => setForm({ ...form, capaNumber: e.target.value })}
                                    placeholder="예: CAPA-202610-001"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: (form.classification === 'CRITICAL' || form.classification === 'MAJOR') && !form.capaNumber ? '2px solid #dc2626' : '1px solid #c084fc',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: '#7e22ce'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 검증 및 종결 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>진행 상태</label>
                            <select
                                value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
                            >
                                {FINDING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>검증 심사원</label>
                            <input
                                type="text"
                                value={form.verifiedBy}
                                onChange={e => setForm({ ...form, verifiedBy: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>검증 소견</label>
                            <input
                                type="text"
                                value={form.verificationNotes}
                                onChange={e => setForm({ ...form, verificationNotes: e.target.value })}
                                placeholder="현장 재실사 및 개선 증빙 확인 결과"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                    </div>
                </form>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button type="button" onClick={onClose} style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '13px', cursor: 'pointer' }}>
                        취소
                    </button>
                    <button
                        type="submit"
                        form="findingForm"
                        disabled={saving || isCapaClosingBlocked}
                        style={{
                            padding: '8px 24px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isCapaClosingBlocked ? '#94a3b8' : '#2563eb',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: isCapaClosingBlocked ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {saving ? '저장 중...' : '지적사항 저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// Modal 4: 최고경영자 경영검토 회의록 모달 (12대 입력 & 3대 출력)
// =========================================================================
function ManagementReviewModal({ review, onClose, onSaved }) {
    const isEdit = Boolean(review && review.id);

    const [form, setForm] = useState({
        title: review?.title || '2026년도 하반기 정기 품질경영시스템(QMS) 경영검토 회의',
        reviewType: review?.reviewType || 'REGULAR_ANNUAL',
        reviewDate: review?.reviewDate || new Date().toISOString().slice(0, 10),
        chairpersonName: review?.chairpersonName || '강대표 대표이사',
        attendees: review?.attendees || '강대표 대표이사, 김품질 이사, 박생산 부장, 최연구 소장',
        status: review?.status || 'APPROVED',
        auditResultsSummary: review?.auditResultsSummary || '',
        customerFeedbackSummary: review?.customerFeedbackSummary || '',
        processPerformanceSummary: review?.processPerformanceSummary || '',
        capaStatusSummary: review?.capaStatusSummary || '',
        previousFollowUpSummary: review?.previousFollowUpSummary || '',
        regulatoryChangesSummary: review?.regulatoryChangesSummary || '',
        recommendationsSummary: review?.recommendationsSummary || '',
        qmsImprovementDecisions: review?.qmsImprovementDecisions || '',
        productImprovementDecisions: review?.productImprovementDecisions || '',
        resourceAllocationDecisions: review?.resourceAllocationDecisions || '',
        nextReviewDueDate: review?.nextReviewDueDate || '',
        approvedBy: review?.approvedBy || '',
        approvedDate: review?.approvedDate || ''
    });

    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEdit) {
                await updateManagementReview(review.id, form);
                toast.success('경영검토 회의록이 수정되었습니다.');
            } else {
                await createManagementReview(form);
                toast.success('신규 경영검토 회의록이 등록되었습니다.');
            }
            onSaved();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || '저장 실패');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ width: '96vw', maxWidth: '1440px', height: '94vh', maxHeight: '920px', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>🏛️</span>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                            {isEdit ? `경영검토 회의록 [${review.reviewNumber}]` : '신규 경영검토(Management Review) 회의록 작성'}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                <form id="reviewForm" onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* 기본 회의 정보 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>회의 안건/제목 *</label>
                            <input
                                type="text"
                                required
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>검토 유형 *</label>
                            <select
                                value={form.reviewType}
                                onChange={e => setForm({ ...form, reviewType: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                {MANAGEMENT_REVIEW_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>회의 일자 *</label>
                            <input
                                type="date"
                                required
                                value={form.reviewDate}
                                onChange={e => setForm({ ...form, reviewDate: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>진행 상태</label>
                            <select
                                value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                {MANAGEMENT_REVIEW_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0369a1', marginBottom: '6px' }}>주관자 (대표이사/품질책임자) *</label>
                            <input
                                type="text"
                                required
                                value={form.chairpersonName}
                                onChange={e => setForm({ ...form, chairpersonName: e.target.value })}
                                placeholder="예: 강대표 대표이사"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>참석자 명단 *</label>
                            <input
                                type="text"
                                required
                                value={form.attendees}
                                onChange={e => setForm({ ...form, attendees: e.target.value })}
                                placeholder="예: 강대표 대표이사, 김품질 이사, 박생산 부장, 최연구 소장"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    {/* 12대 입력요소 섹션 */}
                    <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
                            📥 1. 경영검토 필수 입력요소 평가 (ISO 13485 §5.6.2 / 21 CFR 820.20)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>① 내부/외부 심사 결과 요약</label>
                                <textarea rows={2} value={form.auditResultsSummary} onChange={e => setForm({ ...form, auditResultsSummary: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>② 고객 피드백 및 불만 동향</label>
                                <textarea rows={2} value={form.customerFeedbackSummary} onChange={e => setForm({ ...form, customerFeedbackSummary: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>③ 프로세스 성과 및 제품 적합성(NCR)</label>
                                <textarea rows={2} value={form.processPerformanceSummary} onChange={e => setForm({ ...form, processPerformanceSummary: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>④ 시정 및 예방조치(CAPA) 진행 상태</label>
                                <textarea rows={2} value={form.capaStatusSummary} onChange={e => setForm({ ...form, capaStatusSummary: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>⑤ 이전 경영검토 결정사항 후속조치</label>
                                <textarea rows={2} value={form.previousFollowUpSummary} onChange={e => setForm({ ...form, previousFollowUpSummary: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>⑥ 규제 요구사항 변경 및 대외 환경</label>
                                <textarea rows={2} value={form.regulatoryChangesSummary} onChange={e => setForm({ ...form, regulatoryChangesSummary: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                            </div>
                        </div>
                    </div>

                    {/* 3대 출력요소 섹션 */}
                    <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#166534', marginBottom: '12px' }}>
                            📤 2. 경영검토 필수 출력 및 공식 의결사항 (ISO 13485 §5.6.3 / 21 CFR 820.20)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#15803d', marginBottom: '4px' }}>
                                    [출력 1] QMS 및 프로세스 효과성 개선 결정사항
                                </label>
                                <textarea rows={2} value={form.qmsImprovementDecisions} onChange={e => setForm({ ...form, qmsImprovementDecisions: e.target.value })} placeholder="품질경영시스템 프로세스 개선을 위한 공식 결정 및 방침" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '13px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#15803d', marginBottom: '4px' }}>
                                    [출력 2] 고객 및 규제 요구 관련 제품 개선 조치
                                </label>
                                <textarea rows={2} value={form.productImprovementDecisions} onChange={e => setForm({ ...form, productImprovementDecisions: e.target.value })} placeholder="제품 안전성, 유효성 향상 및 사양 변경 결정사항" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '13px' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#15803d', marginBottom: '4px' }}>
                                    [출력 3] 필요 자원(인력/설비/예산) 배분 및 지원 결정
                                </label>
                                <textarea rows={2} value={form.resourceAllocationDecisions} onChange={e => setForm({ ...form, resourceAllocationDecisions: e.target.value })} placeholder="채용, 설비 투자, 밸리데이션 예산 승인 내역" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '13px' }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#d97706', marginBottom: '4px' }}>차기 경영검토 예정일</label>
                            <input
                                type="date"
                                value={form.nextReviewDueDate}
                                onChange={e => setForm({ ...form, nextReviewDueDate: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>최고경영자 승인 서명자</label>
                            <input
                                type="text"
                                value={form.approvedBy}
                                onChange={e => setForm({ ...form, approvedBy: e.target.value })}
                                placeholder="예: 강대표 대표이사"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>최종 승인 일자</label>
                            <input
                                type="date"
                                value={form.approvedDate}
                                onChange={e => setForm({ ...form, approvedDate: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                    </div>
                </form>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button type="button" onClick={onClose} style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '13px', cursor: 'pointer' }}>
                        취소
                    </button>
                    <button
                        type="submit"
                        form="reviewForm"
                        disabled={saving}
                        style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                    >
                        {saving ? '저장 중...' : '회의록 확정 저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}
