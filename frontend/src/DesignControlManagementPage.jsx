import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import {
    fetchDesignProjects,
    fetchDesignProjectById,
    createDesignProject,
    updateDesignProject,
    deleteDesignProject,
    advanceDesignProjectPhase,
    updateDesignProjectDhfStatus,
    fetchDesignControlItems,
    createDesignControlItem,
    updateDesignControlItem,
    deleteDesignControlItem,
    fetchDesignReviewRecords,
    createDesignReviewRecord,
    updateDesignReviewRecord,
    deleteDesignReviewRecord,
    fetchDesignTraceabilityMatrix,
    fetchDesignKpiMetrics
} from './api';

// =============================================================================
// Constants & Styling Tokens (ISO 13485:2016 §7.3 / 21 CFR 820.30)
// =============================================================================

const DESIGN_PHASES = [
    { value: 'PLANNING', label: '1. 계획 수립 (Planning)' },
    { value: 'INPUT', label: '2. 설계 입력 (Design Input)' },
    { value: 'OUTPUT', label: '3. 설계 출력 (Design Output)' },
    { value: 'VERIFICATION', label: '4. 설계 검증 (Verification)' },
    { value: 'VALIDATION', label: '5. 유효성확인 (Validation)' },
    { value: 'TRANSFER', label: '6. 설계 이관 (Transfer)' },
    { value: 'COMPLETED', label: '7. 개발 완료 (Completed)' }
];

const PHASE_CONFIG = {
    PLANNING: { label: '계획 수립', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
    INPUT: { label: '설계 입력', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    OUTPUT: { label: '설계 출력', bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
    VERIFICATION: { label: '설계 검증', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    VALIDATION: { label: '유효성확인', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
    TRANSFER: { label: '설계 이관', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    COMPLETED: { label: '개발 종결', bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' }
};

const STATUS_CONFIG = {
    ACTIVE: { label: '진행중', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    UNDER_REVIEW: { label: '심의중', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    APPROVED: { label: '단계 승인', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    ON_HOLD: { label: '일시 보류', bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' },
    COMPLETED: { label: '개발 완료', bg: '#fdf4ff', color: '#a21caf', border: '#f5d0fe' },
    CANCELLED: { label: '취소', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
};

const ITEM_TYPES = [
    { value: 'DESIGN_INPUT', label: '설계 입력 (DI)', prefix: 'DI' },
    { value: 'DESIGN_OUTPUT', label: '설계 출력 (DO)', prefix: 'DO' },
    { value: 'DESIGN_VERIFICATION', label: '설계 검증 (DV)', prefix: 'DV' },
    { value: 'DESIGN_VALIDATION', label: '설계 유효성확인 (VAL)', prefix: 'VAL' },
    { value: 'DESIGN_TRANSFER', label: '설계 이관 (TRF)', prefix: 'TRF' }
];

const ITEM_TYPE_CONFIG = {
    DESIGN_INPUT: { label: '설계입력 (DI)', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    DESIGN_OUTPUT: { label: '설계출력 (DO)', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    DESIGN_VERIFICATION: { label: '설계검증 (DV)', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    DESIGN_VALIDATION: { label: '유효성확인 (VAL)', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    DESIGN_TRANSFER: { label: '설계이관 (TRF)', bg: '#fffbeb', color: '#b45309', border: '#fde68a' }
};

const VERIFICATION_RESULT_CONFIG = {
    PASS: { label: '적합 (PASS)', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
    FAIL: { label: '부적합 (FAIL)', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    PENDING: { label: '검증 대기', bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' },
    NOT_APPLICABLE: { label: '해당 없음', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
};

const GATE_DECISIONS = [
    { value: 'GO', label: '승인 (GO - 다음 단계 진입)' },
    { value: 'CONDITIONAL_GO', label: '조건부 승인 (Conditional GO)' },
    { value: 'HOLD', label: '보류 (HOLD - 추가 보완 필요)' },
    { value: 'REJECT', label: '반려 (REJECT - 재작업 요구)' }
];

const GATE_DECISION_CONFIG = {
    GO: { label: 'GO 승인', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
    CONDITIONAL_GO: { label: '조건부 GO', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    HOLD: { label: '보류 (HOLD)', bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' },
    REJECT: { label: '반려 (REJECT)', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' }
};

const DEVICE_CLASSES = [
    { value: 'CLASS_I', label: '1등급 (Class I - 잠재적 위해도 거의 없음)' },
    { value: 'CLASS_II', label: '2등급 (Class II - 잠재적 위해도 낮음)' },
    { value: 'CLASS_III', label: '3등급 (Class III - 중증도 잠재적 위해성)' },
    { value: 'CLASS_IV', label: '4등급 (Class IV - 고도의 위해성 / 인체 삽입)' }
];

export default function DesignControlManagementPage({ user, onNavigate }) {
    // 탭 상태: projects (프로젝트 & DHF), traceability (추적성 매트릭스 RTM), reviews (설계심의 & Stage-Gate)
    const [activeTab, setActiveTab] = useState('projects');
    const [isLoading, setIsLoading] = useState(false);

    // KPI & 대시보드 지표
    const [kpiMetrics, setKpiMetrics] = useState({
        totalProjects: 0,
        activeProjects: 0,
        overallVerificationPassRate: 0,
        overallTraceabilityRate: 0,
        openDhfCount: 0,
        frozenDhfCount: 0,
        pendingReviewCount: 0,
        totalControlItems: 0
    });

    // 프로젝트 목록 & 필터
    const [projects, setProjects] = useState([]);
    const [totalProjectsCount, setTotalProjectsCount] = useState(0);
    const [filterKeyword, setFilterKeyword] = useState('');
    const [filterPhase, setFilterPhase] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDhfStatus, setFilterDhfStatus] = useState('');

    // 선택된 프로젝트 (추적성 및 심의 탭 전용)
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);

    // 추적성 매트릭스 & 통제 항목
    const [traceabilityMatrix, setTraceabilityMatrix] = useState([]);
    const [controlItems, setControlItems] = useState([]);

    // 설계 심의 기록
    const [reviewRecords, setReviewRecords] = useState([]);

    // 모달 상태
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isDhfModalOpen, setIsDhfModalOpen] = useState(false);

    // 모달 폼 데이터
    const [projectFormData, setProjectFormData] = useState({
        id: null,
        projectCode: '',
        projectName: '',
        targetDeviceName: '',
        deviceClassification: 'CLASS_II',
        projectLeader: user?.name || '',
        department: user?.department || '연구개발팀',
        startDate: new Date().toISOString().split('T')[0],
        targetCompletionDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
        currentPhase: 'PLANNING',
        status: 'ACTIVE',
        dhfNumber: '',
        dhfStatus: 'OPEN',
        description: ''
    });

    const [itemFormData, setItemFormData] = useState({
        id: null,
        itemCode: '',
        itemType: 'DESIGN_INPUT',
        title: '',
        specification: '',
        acceptanceCriteria: '',
        verificationMethod: '',
        verificationResult: 'PENDING',
        resultSummary: '',
        evidenceDocUrl: '',
        parentInputItemCode: '',
        riskHazardCode: '',
        responsiblePerson: user?.name || '',
        status: 'DRAFT'
    });

    const [reviewFormData, setReviewFormData] = useState({
        id: null,
        reviewNumber: '',
        reviewPhase: 'PLANNING',
        reviewTitle: '',
        reviewDate: new Date().toISOString().split('T')[0],
        attendees: `${user?.name || '책임연구원'}(연구), 품질보증팀장(품질), 제조팀장(생산)`,
        reviewSummary: '',
        actionItems: '',
        gateDecision: 'GO'
    });

    const projectGridRef = useRef(null);
    const rtmGridRef = useRef(null);
    const reviewGridRef = useRef(null);

    // =========================================================================
    // 데이터 로드
    // =========================================================================

    const loadKpis = useCallback(async () => {
        try {
            const data = await fetchDesignKpiMetrics();
            if (data) setKpiMetrics(data);
        } catch (err) {
            console.error('KPI 로드 실패:', err);
        }
    }, []);

    const loadProjects = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {
                keyword: filterKeyword || undefined,
                phase: filterPhase || undefined,
                status: filterStatus || undefined,
                dhfStatus: filterDhfStatus || undefined,
                page: 0,
                size: 100
            };
            const res = await fetchDesignProjects(params);
            const content = res?.data?.content || res?.content || [];
            setProjects(content);
            setTotalProjectsCount(res?.data?.totalElements || res?.totalElements || content.length);

            // 첫 번째 프로젝트 자동 선택
            if (content.length > 0 && !selectedProjectId) {
                setSelectedProjectId(content[0].id);
                setSelectedProject(content[0]);
            }
        } catch (err) {
            console.error('프로젝트 목록 로드 실패:', err);
            toast.error('설계 프로젝트 목록을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [filterKeyword, filterPhase, filterStatus, filterDhfStatus, selectedProjectId]);

    const loadProjectDetails = useCallback(async (projectId) => {
        if (!projectId) return;
        try {
            const [proj, items, rtm, revs] = await Promise.all([
                fetchDesignProjectById(projectId),
                fetchDesignControlItems(projectId),
                fetchDesignTraceabilityMatrix(projectId),
                fetchDesignReviewRecords(projectId)
            ]);
            setSelectedProject(proj);
            setControlItems(items || []);
            setTraceabilityMatrix(rtm || []);
            setReviewRecords(revs || []);
        } catch (err) {
            console.error('프로젝트 세부정보 로드 실패:', err);
        }
    }, []);

    useEffect(() => {
        loadKpis();
        loadProjects();
    }, [loadKpis, loadProjects]);

    useEffect(() => {
        if (selectedProjectId) {
            loadProjectDetails(selectedProjectId);
        }
    }, [selectedProjectId, loadProjectDetails]);

    // =========================================================================
    // 프로젝트 핸들러
    // =========================================================================

    const handleOpenProjectModal = (proj = null) => {
        if (proj) {
            setProjectFormData({
                id: proj.id,
                projectCode: proj.projectCode,
                projectName: proj.projectName,
                targetDeviceName: proj.targetDeviceName,
                deviceClassification: proj.deviceClassification || 'CLASS_II',
                projectLeader: proj.projectLeader,
                department: proj.department,
                startDate: proj.startDate,
                targetCompletionDate: proj.targetCompletionDate,
                currentPhase: proj.currentPhase || 'PLANNING',
                status: proj.status || 'ACTIVE',
                dhfNumber: proj.dhfNumber || '',
                dhfStatus: proj.dhfStatus || 'OPEN',
                description: proj.description || ''
            });
        } else {
            setProjectFormData({
                id: null,
                projectCode: '',
                projectName: '',
                targetDeviceName: '',
                deviceClassification: 'CLASS_II',
                projectLeader: user?.name || '',
                department: user?.department || '연구개발팀',
                startDate: new Date().toISOString().split('T')[0],
                targetCompletionDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
                currentPhase: 'PLANNING',
                status: 'ACTIVE',
                dhfNumber: '',
                dhfStatus: 'OPEN',
                description: ''
            });
        }
        setIsProjectModalOpen(true);
    };

    const handleSaveProject = async (e) => {
        e.preventDefault();
        if (!projectFormData.projectName.trim()) {
            toast.warning('프로젝트 명칭을 입력해주세요.');
            return;
        }
        if (!projectFormData.targetDeviceName.trim()) {
            toast.warning('대상 의료기기 명칭을 입력해주세요.');
            return;
        }

        try {
            if (projectFormData.id) {
                await updateDesignProject(projectFormData.id, projectFormData);
                toast.success('설계 프로젝트가 성공적으로 수정되었습니다.');
            } else {
                await createDesignProject(projectFormData);
                toast.success('신규 설계개발 프로젝트 및 DHF가 등록되었습니다.');
            }
            setIsProjectModalOpen(false);
            loadProjects();
            loadKpis();
        } catch (err) {
            console.error('프로젝트 저장 실패:', err);
            toast.error(err.response?.data?.message || '프로젝트 저장에 실패했습니다.');
        }
    };

    const handleDeleteProject = async (id, projectCode) => {
        if (!window.confirm(`[${projectCode}] 프로젝트를 삭제하시겠습니까?\n관련된 DHF 및 추적성 기록이 보존 처리됩니다.`)) return;
        try {
            await deleteDesignProject(id);
            toast.success('프로젝트가 삭제되었습니다.');
            loadProjects();
            loadKpis();
        } catch (err) {
            toast.error('삭제 처리에 실패했습니다.');
        }
    };

    const handleAdvancePhase = async (proj, nextPhase) => {
        if (!window.confirm(`[${proj.projectName}]의 설계 단계를 '${PHASE_CONFIG[nextPhase]?.label}'(으)로 전이하시겠습니까?`)) return;
        try {
            await advanceDesignProjectPhase(proj.id, nextPhase);
            toast.success(`설계 단계가 [${PHASE_CONFIG[nextPhase]?.label}]로 성공적으로 전이되었습니다.`);
            loadProjects();
            loadKpis();
            if (selectedProjectId === proj.id) {
                loadProjectDetails(proj.id);
            }
        } catch (err) {
            toast.error('단계 전이 실패: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleToggleDhfStatus = async (proj) => {
        const nextStatus = proj.dhfStatus === 'OPEN' ? 'FROZEN' : 'OPEN';
        const msg = nextStatus === 'FROZEN' 
            ? 'DHF(설계이력파일)를 동결(FROZEN) 처리하시겠습니까?\n동결 후에는 변경관리(Change Control) 승인 없이 임의 수정이 제한됩니다.'
            : 'DHF 동결을 해제하고 개방(OPEN) 상태로 전환하시겠습니까?';
        if (!window.confirm(msg)) return;

        try {
            await updateDesignProjectDhfStatus(proj.id, nextStatus);
            toast.success(`DHF 상태가 [${nextStatus}]로 변경되었습니다.`);
            loadProjects();
            loadKpis();
        } catch (err) {
            toast.error('DHF 상태 변경 실패');
        }
    };

    // =========================================================================
    // 통제 항목 핸들러
    // =========================================================================

    const handleOpenItemModal = (item = null) => {
        if (!selectedProjectId) {
            toast.warning('먼저 상단에서 대상 프로젝트를 선택해주세요.');
            return;
        }
        if (item) {
            setItemFormData({
                id: item.id,
                itemCode: item.itemCode,
                itemType: item.itemType || 'DESIGN_INPUT',
                title: item.title,
                specification: item.specification,
                acceptanceCriteria: item.acceptanceCriteria || '',
                verificationMethod: item.verificationMethod || '',
                verificationResult: item.verificationResult || 'PENDING',
                resultSummary: item.resultSummary || '',
                evidenceDocUrl: item.evidenceDocUrl || '',
                parentInputItemCode: item.parentInputItemCode || '',
                riskHazardCode: item.riskHazardCode || '',
                responsiblePerson: item.responsiblePerson || user?.name || '',
                status: item.status || 'DRAFT'
            });
        } else {
            setItemFormData({
                id: null,
                itemCode: '',
                itemType: 'DESIGN_INPUT',
                title: '',
                specification: '',
                acceptanceCriteria: '',
                verificationMethod: '',
                verificationResult: 'PENDING',
                resultSummary: '',
                evidenceDocUrl: '',
                parentInputItemCode: '',
                riskHazardCode: '',
                responsiblePerson: user?.name || '',
                status: 'DRAFT'
            });
        }
        setIsItemModalOpen(true);
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        if (!itemFormData.title.trim() || !itemFormData.specification.trim()) {
            toast.warning('항목명과 상세 사양을 입력해주세요.');
            return;
        }

        try {
            if (itemFormData.id) {
                await updateDesignControlItem(selectedProjectId, itemFormData.id, itemFormData);
                toast.success('설계통제 항목이 수정되었습니다.');
            } else {
                await createDesignControlItem(selectedProjectId, itemFormData);
                toast.success('신규 설계통제 항목이 등록되었습니다.');
            }
            setIsItemModalOpen(false);
            loadProjectDetails(selectedProjectId);
            loadKpis();
        } catch (err) {
            toast.error(err.response?.data?.message || '항목 저장에 실패했습니다.');
        }
    };

    const handleDeleteItem = async (itemId, itemCode) => {
        if (!window.confirm(`[${itemCode}] 통제 항목을 삭제하시겠습니까?`)) return;
        try {
            await deleteDesignControlItem(selectedProjectId, itemId);
            toast.success('통제 항목이 삭제되었습니다.');
            loadProjectDetails(selectedProjectId);
            loadKpis();
        } catch (err) {
            toast.error('항목 삭제 실패');
        }
    };

    // =========================================================================
    // 설계 심의 핸들러
    // =========================================================================

    const handleOpenReviewModal = (rev = null) => {
        if (!selectedProjectId) {
            toast.warning('먼저 상단에서 대상 프로젝트를 선택해주세요.');
            return;
        }
        if (rev) {
            setReviewFormData({
                id: rev.id,
                reviewNumber: rev.reviewNumber,
                reviewPhase: rev.reviewPhase || 'PLANNING',
                reviewTitle: rev.reviewTitle,
                reviewDate: rev.reviewDate,
                attendees: rev.attendees,
                reviewSummary: rev.reviewSummary,
                actionItems: rev.actionItems || '',
                gateDecision: rev.gateDecision || 'GO'
            });
        } else {
            setReviewFormData({
                id: null,
                reviewNumber: '',
                reviewPhase: selectedProject?.currentPhase || 'PLANNING',
                reviewTitle: `[Stage-Gate] ${selectedProject?.projectName || ''} 단계 심의`,
                reviewDate: new Date().toISOString().split('T')[0],
                attendees: `${user?.name || '책임연구원'}(연구), 품질팀장(품질), 제조팀장(생산)`,
                reviewSummary: '',
                actionItems: '',
                gateDecision: 'GO'
            });
        }
        setIsReviewModalOpen(true);
    };

    const handleSaveReview = async (e) => {
        e.preventDefault();
        if (!reviewFormData.reviewTitle.trim() || !reviewFormData.reviewSummary.trim()) {
            toast.warning('심의 제목과 내용을 입력해주세요.');
            return;
        }

        try {
            if (reviewFormData.id) {
                await updateDesignReviewRecord(selectedProjectId, reviewFormData.id, reviewFormData);
                toast.success('설계 심의 기록이 수정되었습니다.');
            } else {
                await createDesignReviewRecord(selectedProjectId, reviewFormData);
                toast.success('신규 설계 심의(Stage-Gate) 기록이 등록되었습니다.');
            }
            setIsReviewModalOpen(false);
            loadProjectDetails(selectedProjectId);
            loadKpis();
        } catch (err) {
            toast.error(err.response?.data?.message || '심의 기록 저장 실패');
        }
    };

    const handleDeleteReview = async (recordId, reviewNumber) => {
        if (!window.confirm(`[${reviewNumber}] 심의 기록을 삭제하시겠습니까?`)) return;
        try {
            await deleteDesignReviewRecord(selectedProjectId, recordId);
            toast.success('심의 기록이 삭제되었습니다.');
            loadProjectDetails(selectedProjectId);
            loadKpis();
        } catch (err) {
            toast.error('심의 기록 삭제 실패');
        }
    };

    // =========================================================================
    // AG Grid 컬럼 정의
    // =========================================================================

    const projectColumnDefs = useMemo(() => [
        { headerName: '프로젝트 코드', field: 'projectCode', width: 140, pinned: 'left', cellStyle: { fontWeight: 'bold', color: '#1e293b' } },
        { headerName: '설계개발 프로젝트명', field: 'projectName', minWidth: 240, flex: 1, cellStyle: { fontWeight: '600' } },
        { headerName: '대상 의료기기', field: 'targetDeviceName', width: 180 },
        { 
            headerName: '등급', 
            field: 'deviceClassification', 
            width: 110,
            cellRenderer: (p) => {
                const cls = p.value || 'CLASS_II';
                return (
                    <span style={{
                        padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: cls.includes('IV') ? '#fef2f2' : cls.includes('III') ? '#fffbeb' : '#eff6ff',
                        color: cls.includes('IV') ? '#dc2626' : cls.includes('III') ? '#d97706' : '#2563eb',
                        border: '1px solid currentColor'
                    }}>
                        {cls.replace('CLASS_', '')}등급
                    </span>
                );
            }
        },
        {
            headerName: '진행 단계 (Phase)',
            field: 'currentPhase',
            width: 140,
            cellRenderer: (p) => {
                const cfg = PHASE_CONFIG[p.value] || PHASE_CONFIG.PLANNING;
                return (
                    <span style={{
                        padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
                    }}>
                        {cfg.label}
                    </span>
                );
            }
        },
        {
            headerName: '상태',
            field: 'status',
            width: 110,
            cellRenderer: (p) => {
                const cfg = STATUS_CONFIG[p.value] || STATUS_CONFIG.ACTIVE;
                return (
                    <span style={{
                        padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                        backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
                    }}>
                        {cfg.label}
                    </span>
                );
            }
        },
        {
            headerName: 'DHF 관리번호',
            field: 'dhfNumber',
            width: 140,
            cellRenderer: (p) => (
                <button
                    onClick={() => { setSelectedProjectId(p.data.id); setIsDhfModalOpen(true); }}
                    style={{
                        background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline',
                        cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'
                    }}
                >
                    📁 {p.value}
                </button>
            )
        },
        {
            headerName: 'DHF 상태',
            field: 'dhfStatus',
            width: 110,
            cellRenderer: (p) => {
                const isFrozen = p.value === 'FROZEN';
                return (
                    <span style={{
                        padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: isFrozen ? '#f1f5f9' : '#ecfdf5',
                        color: isFrozen ? '#475569' : '#059669',
                        border: `1px solid ${isFrozen ? '#cbd5e1' : '#a7f3d0'}`
                    }}>
                        {isFrozen ? '🔒 FROZEN' : '🟢 OPEN'}
                    </span>
                );
            }
        },
        { headerName: '책임자', field: 'projectLeader', width: 110 },
        { headerName: '시작일', field: 'startDate', width: 110 },
        { headerName: '목표일', field: 'targetCompletionDate', width: 110 },
        {
            headerName: '관리 액션',
            width: 220,
            pinned: 'right',
            cellRenderer: (p) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => { setSelectedProjectId(p.data.id); setActiveTab('traceability'); }}
                        style={{
                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                            backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'pointer'
                        }}
                    >
                        🔗 RTM
                    </button>
                    <button
                        onClick={() => handleOpenProjectModal(p.data)}
                        style={{
                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                            backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', cursor: 'pointer'
                        }}
                    >
                        ✏️ 수정
                    </button>
                    <button
                        onClick={() => handleToggleDhfStatus(p.data)}
                        style={{
                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                            backgroundColor: p.data.dhfStatus === 'OPEN' ? '#fef3c7' : '#ecfdf5',
                            color: p.data.dhfStatus === 'OPEN' ? '#d97706' : '#059669',
                            border: '1px solid currentColor', cursor: 'pointer'
                        }}
                    >
                        {p.data.dhfStatus === 'OPEN' ? '🔒 동결' : '🔓 개방'}
                    </button>
                </div>
            )
        }
    ], [selectedProjectId]);

    const rtmColumnDefs = useMemo(() => [
        { headerName: '입력 코드 (DI)', field: 'inputItemCode', width: 130, pinned: 'left', cellStyle: { fontWeight: 'bold', color: '#1e293b' } },
        { headerName: '사용자 및 규제 요구사항', field: 'inputTitle', width: 220, cellStyle: { fontWeight: '600' } },
        { headerName: '요구 상세 사양', field: 'inputSpecification', minWidth: 240, flex: 1 },
        { headerName: '출력 코드 (DO)', field: 'outputItemCode', width: 130, cellStyle: { color: '#6d28d9', fontWeight: 'bold' } },
        { headerName: '도면/회로/BOM 산출물', field: 'outputTitle', width: 200 },
        { headerName: '검증 코드 (DV)', field: 'verificationItemCode', width: 130, cellStyle: { color: '#0369a1', fontWeight: 'bold' } },
        {
            headerName: '검증 판정',
            field: 'verificationResult',
            width: 120,
            cellRenderer: (p) => {
                const cfg = VERIFICATION_RESULT_CONFIG[p.value] || VERIFICATION_RESULT_CONFIG.PENDING;
                return (
                    <span style={{
                        padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
                    }}>
                        {cfg.label}
                    </span>
                );
            }
        },
        { headerName: '유효성확인 (VAL)', field: 'validationItemCode', width: 130 },
        { headerName: '위험요인 (ISO 14971)', field: 'riskHazardCode', width: 140, cellStyle: { color: '#b91c1c', fontWeight: 'bold' } },
        {
            headerName: '추적 완성도',
            field: 'fullyTraced',
            width: 120,
            pinned: 'right',
            cellRenderer: (p) => (
                <span style={{
                    padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                    backgroundColor: p.value ? '#ecfdf5' : '#fffbeb',
                    color: p.value ? '#059669' : '#d97706',
                    border: `1px solid ${p.value ? '#a7f3d0' : '#fde68a'}`
                }}>
                    {p.value ? '✅ 100% 추적' : '⚠️ 보완 필요'}
                </span>
            )
        }
    ], []);

    const reviewColumnDefs = useMemo(() => [
        { headerName: '심의 번호', field: 'reviewNumber', width: 130, pinned: 'left', cellStyle: { fontWeight: 'bold' } },
        { 
            headerName: '심의 단계', 
            field: 'reviewPhase', 
            width: 130,
            cellRenderer: (p) => {
                const cfg = PHASE_CONFIG[p.value] || PHASE_CONFIG.PLANNING;
                return (
                    <span style={{
                        padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
                    }}>
                        {cfg.label}
                    </span>
                );
            }
        },
        { headerName: '심의 제목', field: 'reviewTitle', minWidth: 220, flex: 1, cellStyle: { fontWeight: '600' } },
        { headerName: '심의 일자', field: 'reviewDate', width: 120 },
        { headerName: '참석자 명단', field: 'attendees', width: 220 },
        {
            headerName: '게이트 판정',
            field: 'gateDecision',
            width: 140,
            cellRenderer: (p) => {
                const cfg = GATE_DECISION_CONFIG[p.value] || GATE_DECISION_CONFIG.GO;
                return (
                    <span style={{
                        padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
                    }}>
                        {cfg.label}
                    </span>
                );
            }
        },
        {
            headerName: '관리 액션',
            width: 140,
            pinned: 'right',
            cellRenderer: (p) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => handleOpenReviewModal(p.data)}
                        style={{
                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                            backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', cursor: 'pointer'
                        }}
                    >
                        ✏️ 수정
                    </button>
                    <button
                        onClick={() => handleDeleteReview(p.data.id, p.data.reviewNumber)}
                        style={{
                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                            backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer'
                        }}
                    >
                        🗑️ 삭제
                    </button>
                </div>
            )
        }
    ], [selectedProjectId]);

    // CSV 내보내기
    const handleExportCsv = () => {
        if (activeTab === 'projects' && projectGridRef.current?.api) {
            projectGridRef.current.api.exportDataAsCsv({ fileName: `Design_Projects_${new Date().toISOString().split('T')[0]}.csv` });
        } else if (activeTab === 'traceability' && rtmGridRef.current?.api) {
            rtmGridRef.current.api.exportDataAsCsv({ fileName: `RTM_${selectedProject?.projectCode || 'Matrix'}_${new Date().toISOString().split('T')[0]}.csv` });
        } else if (activeTab === 'reviews' && reviewGridRef.current?.api) {
            reviewGridRef.current.api.exportDataAsCsv({ fileName: `Design_Reviews_${selectedProject?.projectCode || 'Reviews'}_${new Date().toISOString().split('T')[0]}.csv` });
        } else {
            toast.info('내보낼 데이터가 없습니다.');
        }
    };

    return (
        <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* 3-Tier Header */}
            {/* 1행: 타이틀 및 액션 버튼 바 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                        📐 의료기기 설계개발 & DHF 통제 (Design Controls)
                    </h1>
                    <span style={{ fontSize: '12px', padding: '3px 8px', backgroundColor: '#e2e8f0', color: '#334155', borderRadius: '12px', fontWeight: '600' }}>
                        Step 10
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleExportCsv}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px',
                            backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                        }}
                    >
                        📥 CSV 내보내기
                    </button>
                    <button
                        onClick={() => { loadProjects(); loadKpis(); if (selectedProjectId) loadProjectDetails(selectedProjectId); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px',
                            backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                        }}
                    >
                        🔄 새로고침
                    </button>
                    <button
                        onClick={() => handleOpenProjectModal()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px',
                            backgroundColor: '#2563eb', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)'
                        }}
                    >
                        ➕ 신규 설계 프로젝트 등록
                    </button>
                </div>
            </div>

            {/* 2행: 규제 정합 요약문 */}
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                ISO 13485:2016 §7.3 및 21 CFR 820.30 규격에 부합하도록 계획(Planning) → 설계입력(Input) → 출력(Output) → 검증(Verification) → 유효성확인(Validation) → 이관(Transfer) 전 수명주기 Stage-Gate 및 DHF(설계이력파일)를 통합 통제합니다.
            </div>

            {/* 3행: 표준 업무 매뉴얼 배너 (DEC-10) */}
            <RegulatoryManualBanner pageKey="designControls" />

            {/* KPI Summary Cards (6종) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>전체 설계 프로젝트</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginTop: '6px' }}>{kpiMetrics.totalProjects}건</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>진행중 (Active)</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', marginTop: '6px' }}>{kpiMetrics.activeProjects}건</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0ea5e9' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>설계 검증 PASS율</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284c7', marginTop: '6px' }}>{kpiMetrics.overallVerificationPassRate}%</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>RTM 추적성 완성도</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed', marginTop: '6px' }}>{kpiMetrics.overallTraceabilityRate}%</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>DHF 개방 / 동결</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706', marginTop: '6px' }}>
                        {kpiMetrics.openDhfCount} / <span style={{ fontSize: '18px', color: '#64748b' }}>{kpiMetrics.frozenDhfCount}</span>
                    </div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>심의 대기/보류</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', marginTop: '6px' }}>{kpiMetrics.pendingReviewCount}건</div>
                </div>
            </div>

            {/* 탭 네비게이션 */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '2px' }}>
                <button
                    onClick={() => setActiveTab('projects')}
                    style={{
                        padding: '10px 18px', border: 'none', background: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
                        color: activeTab === 'projects' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'projects' ? '3px solid #2563eb' : '3px solid transparent'
                    }}
                >
                    📋 설계 프로젝트 & DHF 마스터 ({totalProjectsCount})
                </button>
                <button
                    onClick={() => setActiveTab('traceability')}
                    style={{
                        padding: '10px 18px', border: 'none', background: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
                        color: activeTab === 'traceability' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'traceability' ? '3px solid #2563eb' : '3px solid transparent'
                    }}
                >
                    🔗 설계통제 & 추적성 매트릭스 (RTM)
                </button>
                <button
                    onClick={() => setActiveTab('reviews')}
                    style={{
                        padding: '10px 18px', border: 'none', background: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
                        color: activeTab === 'reviews' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'reviews' ? '3px solid #2563eb' : '3px solid transparent'
                    }}
                >
                    ⚖️ 단계별 설계심의 (Design Reviews & Stage-Gate)
                </button>
            </div>

            {/* 탭 1: 설계 프로젝트 & DHF 마스터 */}
            {activeTab === 'projects' && (
                <>
                    {/* 검색 필터 카드 */}
                    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>통합 검색어</label>
                                <input
                                    type="text"
                                    placeholder="프로젝트코드, 기기명, DHF번호, 책임자..."
                                    value={filterKeyword}
                                    onChange={(e) => setFilterKeyword(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>진행 단계</label>
                                <select
                                    value={filterPhase}
                                    onChange={(e) => setFilterPhase(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                                >
                                    <option value="">전체 단계</option>
                                    {DESIGN_PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>프로젝트 상태</label>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                                >
                                    <option value="">전체 상태</option>
                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>DHF 상태</label>
                                <select
                                    value={filterDhfStatus}
                                    onChange={(e) => setFilterDhfStatus(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                                >
                                    <option value="">전체 DHF</option>
                                    <option value="OPEN">개방 (OPEN)</option>
                                    <option value="FROZEN">동결 (FROZEN)</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                            <button
                                onClick={() => { setFilterKeyword(''); setFilterPhase(''); setFilterStatus(''); setFilterDhfStatus(''); }}
                                style={{
                                    padding: '7px 14px', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
                                    color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                                }}
                            >
                                ♻️ 초기화
                            </button>
                            <button
                                onClick={loadProjects}
                                style={{
                                    padding: '7px 18px', borderRadius: '6px', backgroundColor: '#2563eb', border: 'none',
                                    color: '#ffffff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                🔍 조회
                            </button>
                        </div>
                    </div>

                    {/* 프로젝트 AG Grid 테이블 */}
                    <div className="ag-theme-legacy" style={{ height: '520px', width: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <AgGridReact
                            ref={projectGridRef}
                            rowData={projects}
                            columnDefs={projectColumnDefs}
                            theme="legacy"
                            rowHeight={54}
                            headerHeight={48}
                            pagination={true}
                            paginationPageSize={10}
                            onRowClicked={(e) => {
                                setSelectedProjectId(e.data.id);
                                setSelectedProject(e.data);
                            }}
                        />
                    </div>
                </>
            )}

            {/* 탭 2: 설계통제 & 추적성 매트릭스 (RTM) */}
            {activeTab === 'traceability' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* 상단 프로젝트 선택기 및 항목 등록 바 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#334155' }}>대상 프로젝트:</span>
                            <select
                                value={selectedProjectId || ''}
                                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                                style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #2563eb', fontWeight: 'bold', color: '#1e293b', fontSize: '13px' }}
                            >
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>[{p.projectCode}] {p.projectName}</option>
                                ))}
                            </select>
                            {selectedProject && (
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    (DHF: <strong>{selectedProject.dhfNumber}</strong> | 단계: <strong>{PHASE_CONFIG[selectedProject.currentPhase]?.label}</strong>)
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => handleOpenItemModal()}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '6px',
                                backgroundColor: '#10b981', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            ➕ 통제 항목 (DI/DO/DV/VAL) 추가
                        </button>
                    </div>

                    {/* RTM 5단 추적성 매트릭스 그리드 */}
                    <div className="ag-theme-legacy" style={{ height: '520px', width: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <AgGridReact
                            ref={rtmGridRef}
                            rowData={traceabilityMatrix}
                            columnDefs={rtmColumnDefs}
                            theme="legacy"
                            rowHeight={54}
                            headerHeight={48}
                            pagination={true}
                            paginationPageSize={10}
                        />
                    </div>
                </div>
            )}

            {/* 탭 3: 단계별 설계심의 (Design Reviews & Stage-Gate) */}
            {activeTab === 'reviews' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* 상단 바 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#334155' }}>심의 대상 프로젝트:</span>
                            <select
                                value={selectedProjectId || ''}
                                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                                style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #2563eb', fontWeight: 'bold', color: '#1e293b', fontSize: '13px' }}
                            >
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>[{p.projectCode}] {p.projectName}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => handleOpenReviewModal()}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '6px',
                                backgroundColor: '#7c3aed', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            ➕ Stage-Gate 설계심의 등록
                        </button>
                    </div>

                    {/* 심의 목록 그리드 */}
                    <div className="ag-theme-legacy" style={{ height: '520px', width: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <AgGridReact
                            ref={reviewGridRef}
                            rowData={reviewRecords}
                            columnDefs={reviewColumnDefs}
                            theme="legacy"
                            rowHeight={54}
                            headerHeight={48}
                            pagination={true}
                            paginationPageSize={10}
                        />
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 1. 프로젝트 신규/수정 전면 최대화 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {isProjectModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                        
                        {/* 고정 헤더 */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                                    {projectFormData.id ? `✏️ 설계개발 프로젝트 수정 [${projectFormData.projectCode}]` : '➕ 신규 의료기기 설계개발 프로젝트 등록 (ISO 13485:2016 §7.3)'}
                                </h2>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                                    프로젝트 기본 정보 및 DHF(Design History File) 관리번호를 등록하고 초기 계획 단계를 수립합니다.
                                </p>
                            </div>
                            <button onClick={() => setIsProjectModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        {/* 스크롤 바디 */}
                        <form id="projectForm" onSubmit={handleSaveProject} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>프로젝트 명칭 *</label>
                                    <input
                                        type="text"
                                        required
                                        value={projectFormData.projectName}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, projectName: e.target.value })}
                                        placeholder="예: 스마트 인슐린 펜 인젝터 설계개발"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>대상 의료기기 품목명 *</label>
                                    <input
                                        type="text"
                                        required
                                        value={projectFormData.targetDeviceName}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, targetDeviceName: e.target.value })}
                                        placeholder="예: 스마트 인슐린 펜 주입기"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>기기 등급</label>
                                    <select
                                        value={projectFormData.deviceClassification}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, deviceClassification: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#ffffff' }}
                                    >
                                        {DEVICE_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>총괄 책임자 *</label>
                                    <input
                                        type="text"
                                        required
                                        value={projectFormData.projectLeader}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, projectLeader: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>담당 부서 *</label>
                                    <input
                                        type="text"
                                        required
                                        value={projectFormData.department}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, department: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>진행 단계</label>
                                    <select
                                        value={projectFormData.currentPhase}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, currentPhase: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#ffffff' }}
                                    >
                                        {DESIGN_PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>시작일 *</label>
                                    <input
                                        type="date"
                                        required
                                        value={projectFormData.startDate}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, startDate: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>목표 완료일 *</label>
                                    <input
                                        type="date"
                                        required
                                        value={projectFormData.targetCompletionDate}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, targetCompletionDate: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>설계개발 개요 및 배경 설명</label>
                                <textarea
                                    rows={4}
                                    value={projectFormData.description}
                                    onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                                    placeholder="개발 목적, 임상적 유효성, 핵심 타깃 사양을 기술하세요."
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                />
                            </div>
                        </form>

                        {/* 고정 푸터 */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
                            <button
                                type="button"
                                onClick={() => setIsProjectModalOpen(false)}
                                style={{
                                    padding: '9px 18px', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
                                    color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                                }}
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                form="projectForm"
                                style={{
                                    padding: '9px 24px', borderRadius: '6px', backgroundColor: '#2563eb', border: 'none',
                                    color: '#ffffff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                                }}
                            >
                                {projectFormData.id ? '수정 완료' : '프로젝트 등록'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 2. 설계통제 항목 등록/수정 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {isItemModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                        
                        {/* 고정 헤더 */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                                    {itemFormData.id ? `✏️ 통제 항목 수정 [${itemFormData.itemCode}]` : `➕ [${selectedProject?.projectName}] 설계통제 항목 추가`}
                                </h2>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                                    설계입력(DI), 출력(DO), 검증(DV), 유효성확인(VAL), 이관(TRF) 요구사항 및 판정 기준을 등록합니다.
                                </p>
                            </div>
                            <button onClick={() => setIsItemModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        {/* 스크롤 바디 */}
                        <form id="itemForm" onSubmit={handleSaveItem} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>통제 유형 (Item Type) *</label>
                                    <select
                                        value={itemFormData.itemType}
                                        onChange={(e) => setItemFormData({ ...itemFormData, itemType: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#ffffff' }}
                                    >
                                        {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>항목 명칭 / 요구사항 명 *</label>
                                    <input
                                        type="text"
                                        required
                                        value={itemFormData.title}
                                        onChange={(e) => setItemFormData({ ...itemFormData, title: e.target.value })}
                                        placeholder="예: 정밀 투여량 제어 요구사항"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>상위 설계입력 추적 코드 (DO/DV/VAL용)</label>
                                    <input
                                        type="text"
                                        value={itemFormData.parentInputItemCode}
                                        onChange={(e) => setItemFormData({ ...itemFormData, parentInputItemCode: e.target.value })}
                                        placeholder="예: DI-001 (설계입력 코드)"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>위험요인 코드 (ISO 14971 연계)</label>
                                    <input
                                        type="text"
                                        value={itemFormData.riskHazardCode}
                                        onChange={(e) => setItemFormData({ ...itemFormData, riskHazardCode: e.target.value })}
                                        placeholder="예: HAZ-001"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>검증 결과 (DV / VAL 판정)</label>
                                    <select
                                        value={itemFormData.verificationResult}
                                        onChange={(e) => setItemFormData({ ...itemFormData, verificationResult: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#ffffff' }}
                                    >
                                        <option value="PENDING">검증 대기 (PENDING)</option>
                                        <option value="PASS">적합 (PASS)</option>
                                        <option value="FAIL">부적합 (FAIL)</option>
                                        <option value="NOT_APPLICABLE">해당 없음 (N/A)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>담당자 *</label>
                                    <input
                                        type="text"
                                        required
                                        value={itemFormData.responsiblePerson}
                                        onChange={(e) => setItemFormData({ ...itemFormData, responsiblePerson: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>상세 사양 및 규격 요구내용 *</label>
                                <textarea
                                    rows={3}
                                    required
                                    value={itemFormData.specification}
                                    onChange={(e) => setItemFormData({ ...itemFormData, specification: e.target.value })}
                                    placeholder="구체적인 정량적 수치 또는 기능 명세를 작성하세요."
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>합격 판정 기준 (Acceptance Criteria)</label>
                                <textarea
                                    rows={2}
                                    value={itemFormData.acceptanceCriteria}
                                    onChange={(e) => setItemFormData({ ...itemFormData, acceptanceCriteria: e.target.value })}
                                    placeholder="시험 결과 합격/불합격을 가르는 허용 오차 또는 기준 규격을 기술하세요."
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>검증 방법 (시험법 / 성적서 규격)</label>
                                    <input
                                        type="text"
                                        value={itemFormData.verificationMethod}
                                        onChange={(e) => setItemFormData({ ...itemFormData, verificationMethod: e.target.value })}
                                        placeholder="예: IEC 60601-1 시험 성적서 확인"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>근거 문서 URL / 성적서 파일명</label>
                                    <input
                                        type="text"
                                        value={itemFormData.evidenceDocUrl}
                                        onChange={(e) => setItemFormData({ ...itemFormData, evidenceDocUrl: e.target.value })}
                                        placeholder="예: CERT-KTL-2026-0994.pdf"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                            </div>
                        </form>

                        {/* 고정 푸터 */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
                            <button
                                type="button"
                                onClick={() => setIsItemModalOpen(false)}
                                style={{
                                    padding: '9px 18px', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
                                    color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                                }}
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                form="itemForm"
                                style={{
                                    padding: '9px 24px', borderRadius: '6px', backgroundColor: '#10b981', border: 'none',
                                    color: '#ffffff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                {itemFormData.id ? '항목 수정' : '항목 추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 3. 설계 심의 (Design Review) 등록/수정 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {isReviewModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                        
                        {/* 고정 헤더 */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                                    {reviewFormData.id ? `✏️ Stage-Gate 설계심의 수정 [${reviewFormData.reviewNumber}]` : `➕ [${selectedProject?.projectName}] Stage-Gate 설계심의 등록`}
                                </h2>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                                    ISO 13485:2016 §7.3.5에 의거 각 개발 단계 완료 심의 및 다음 단계 진입(GO/HOLD) 승인 결정을 기록합니다.
                                </p>
                            </div>
                            <button onClick={() => setIsReviewModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        {/* 스크롤 바디 */}
                        <form id="reviewForm" onSubmit={handleSaveReview} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>심의 대상 단계 *</label>
                                    <select
                                        value={reviewFormData.reviewPhase}
                                        onChange={(e) => setReviewFormData({ ...reviewFormData, reviewPhase: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#ffffff' }}
                                    >
                                        {DESIGN_PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>심의 일자 *</label>
                                    <input
                                        type="date"
                                        required
                                        value={reviewFormData.reviewDate}
                                        onChange={(e) => setReviewFormData({ ...reviewFormData, reviewDate: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>게이트 결정 (Gate Decision) *</label>
                                    <select
                                        value={reviewFormData.gateDecision}
                                        onChange={(e) => setReviewFormData({ ...reviewFormData, gateDecision: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#ffffff', fontWeight: 'bold' }}
                                    >
                                        {GATE_DECISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>심의 제목 *</label>
                                <input
                                    type="text"
                                    required
                                    value={reviewFormData.reviewTitle}
                                    onChange={(e) => setReviewFormData({ ...reviewFormData, reviewTitle: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>참석자 명단 (연구, 품질, 제조, 임상 등) *</label>
                                <input
                                    type="text"
                                    required
                                    value={reviewFormData.attendees}
                                    onChange={(e) => setReviewFormData({ ...reviewFormData, attendees: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>심의 내용 및 결론 요약 *</label>
                                <textarea
                                    rows={4}
                                    required
                                    value={reviewFormData.reviewSummary}
                                    onChange={(e) => setReviewFormData({ ...reviewFormData, reviewSummary: e.target.value })}
                                    placeholder="설계 요구사항 충족성, 검증 데이터 신뢰성, 잔여 결함 및 리스크 평가 결과를 상세히 기술하세요."
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>후속 조치 과제 (Action Items)</label>
                                <textarea
                                    rows={2}
                                    value={reviewFormData.actionItems}
                                    onChange={(e) => setReviewFormData({ ...reviewFormData, actionItems: e.target.value })}
                                    placeholder="차기 단계 전이 전 완료되어야 할 후속 보완 과제 및 담당자, 완료기한을 기술하세요."
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                />
                            </div>
                        </form>

                        {/* 고정 푸터 */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
                            <button
                                type="button"
                                onClick={() => setIsReviewModalOpen(false)}
                                style={{
                                    padding: '9px 18px', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
                                    color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                                }}
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                form="reviewForm"
                                style={{
                                    padding: '9px 24px', borderRadius: '6px', backgroundColor: '#7c3aed', border: 'none',
                                    color: '#ffffff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                {reviewFormData.id ? '심의 수정' : '심의 등록'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 4. DHF (Design History File) 종합 보고서 인덱스 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {isDhfModalOpen && selectedProject && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                        
                        {/* 고정 헤더 */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '24px' }}>📁</span>
                                <div>
                                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                                        DHF 종합 편철 보고서: [{selectedProject.dhfNumber}] {selectedProject.projectName}
                                    </h2>
                                    <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                                        21 CFR 820.30(j) / ISO 13485:2016 §7.3.10 규격 정합 설계이력파일(DHF) 인덱스 및 편철 현황
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{
                                    padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold',
                                    backgroundColor: selectedProject.dhfStatus === 'FROZEN' ? '#f1f5f9' : '#ecfdf5',
                                    color: selectedProject.dhfStatus === 'FROZEN' ? '#475569' : '#059669',
                                    border: '1px solid currentColor'
                                }}>
                                    {selectedProject.dhfStatus === 'FROZEN' ? '🔒 FROZEN (동결)' : '🟢 OPEN (개방)'}
                                </span>
                                <button onClick={() => setIsDhfModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                            </div>
                        </div>

                        {/* 스크롤 바디: DHF 인덱스 트리 및 증빙 매핑 */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* 프로젝트 요약 카드 */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div><span style={{ color: '#64748b', fontSize: '12px' }}>프로젝트 코드:</span> <strong style={{ display: 'block', fontSize: '14px' }}>{selectedProject.projectCode}</strong></div>
                                <div><span style={{ color: '#64748b', fontSize: '12px' }}>대상 기기명:</span> <strong style={{ display: 'block', fontSize: '14px' }}>{selectedProject.targetDeviceName}</strong></div>
                                <div><span style={{ color: '#64748b', fontSize: '12px' }}>기기 등급:</span> <strong style={{ display: 'block', fontSize: '14px' }}>{selectedProject.deviceClassification}</strong></div>
                                <div><span style={{ color: '#64748b', fontSize: '12px' }}>책임자 / 부서:</span> <strong style={{ display: 'block', fontSize: '14px' }}>{selectedProject.projectLeader} ({selectedProject.department})</strong></div>
                                <div><span style={{ color: '#64748b', fontSize: '12px' }}>개발 일정:</span> <strong style={{ display: 'block', fontSize: '14px' }}>{selectedProject.startDate} ~ {selectedProject.targetCompletionDate}</strong></div>
                                <div><span style={{ color: '#64748b', fontSize: '12px' }}>통제 항목 수:</span> <strong style={{ display: 'block', fontSize: '14px', color: '#2563eb' }}>{controlItems.length}건</strong></div>
                            </div>

                            {/* DHF 6계층 인덱스 섹션 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                                    📑 DHF 편철 인덱스 항목 (6단계)
                                </h3>

                                {ITEM_TYPES.map(type => {
                                    const matching = controlItems.filter(i => i.itemType === type.value);
                                    const cfg = ITEM_TYPE_CONFIG[type.value];
                                    return (
                                        <div key={type.value} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: cfg.bg, color: cfg.color, fontWeight: 'bold', fontSize: '12px' }}>
                                                        {type.label}
                                                    </span>
                                                    <span style={{ fontSize: '13px', color: '#64748b' }}>({matching.length}건 수록)</span>
                                                </div>
                                            </div>

                                            {matching.length === 0 ? (
                                                <div style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 0' }}>편철된 항목이 없습니다.</div>
                                            ) : (
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                    <thead>
                                                        <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                                            <th style={{ padding: '8px' }}>코드</th>
                                                            <th style={{ padding: '8px' }}>항목명 / 사양</th>
                                                            <th style={{ padding: '8px' }}>검증 방법 및 판정</th>
                                                            <th style={{ padding: '8px' }}>근거 성적서/도면</th>
                                                            <th style={{ padding: '8px' }}>담당자</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {matching.map(m => (
                                                            <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '8px', fontWeight: 'bold', color: '#1e293b' }}>{m.itemCode}</td>
                                                                <td style={{ padding: '8px' }}>
                                                                    <strong>{m.title}</strong>
                                                                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>{m.specification}</div>
                                                                </td>
                                                                <td style={{ padding: '8px' }}>
                                                                    <div>{m.verificationMethod || '-'}</div>
                                                                    <span style={{
                                                                        fontSize: '11px', fontWeight: 'bold',
                                                                        color: m.verificationResult === 'PASS' ? '#059669' : m.verificationResult === 'FAIL' ? '#dc2626' : '#64748b'
                                                                    }}>
                                                                        {m.verificationResult || 'PENDING'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '8px', color: '#2563eb' }}>{m.evidenceDocUrl || '-'}</td>
                                                                <td style={{ padding: '8px' }}>{m.responsiblePerson}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Stage-Gate 심의 승인 이력 */}
                            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 18px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 10px 0' }}>
                                    ⚖️ 공식 Stage-Gate 심의 승인 기록 ({reviewRecords.length}건)
                                </h4>
                                {reviewRecords.length === 0 ? (
                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>등록된 심의 이력이 없습니다.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {reviewRecords.map(r => (
                                            <div key={r.id} style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <span style={{ fontWeight: 'bold', color: '#1e293b', marginRight: '8px' }}>[{r.reviewNumber}] {r.reviewTitle}</span>
                                                    <span style={{ fontSize: '12px', color: '#64748b' }}>({r.reviewDate} | {r.attendees})</span>
                                                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{r.reviewSummary}</div>
                                                </div>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                                    backgroundColor: GATE_DECISION_CONFIG[r.gateDecision]?.bg,
                                                    color: GATE_DECISION_CONFIG[r.gateDecision]?.color,
                                                    border: `1px solid ${GATE_DECISION_CONFIG[r.gateDecision]?.border}`
                                                }}>
                                                    {GATE_DECISION_CONFIG[r.gateDecision]?.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 고정 푸터 */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
                            <button
                                onClick={() => setIsDhfModalOpen(false)}
                                style={{
                                    padding: '9px 24px', borderRadius: '6px', backgroundColor: '#2563eb', border: 'none',
                                    color: '#ffffff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
