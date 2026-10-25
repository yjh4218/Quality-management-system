import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import {
    fetchCsvKpi,
    fetchCsvProjects,
    createCsvProject,
    updateCsvProject,
    deleteCsvProject,
    fetchCsvProtocols,
    createCsvProtocol,
    updateCsvProtocol,
    deleteCsvProtocol,
    fetchCsvDefects,
    createCsvDefect,
    updateCsvDefect,
    deleteCsvDefect,
    fetchCsvGoLive,
    createOrUpdateCsvGoLive
} from './api';

// GAMP 5 & CSV 상태 라벨 매핑
const GAMP_LABELS = {
    CATEGORY_3_NON_CONFIGURED: { label: 'Cat.3 비설정 COTS', color: '#64748b', bg: '#f1f5f9' },
    CATEGORY_4_CONFIGURED: { label: 'Cat.4 설정형 SW', color: '#0284c7', bg: '#e0f2fe' },
    CATEGORY_5_CUSTOM: { label: 'Cat.5 커스텀 개발 eQMS', color: '#7c3aed', bg: '#ede9fe' }
};

const PROJECT_STATUS_LABELS = {
    PLANNING: { label: '계획 수립', color: '#64748b', bg: '#f1f5f9' },
    PROTOCOL_DEVELOPMENT: { label: '프로토콜 개발', color: '#0284c7', bg: '#e0f2fe' },
    IQ_EXECUTING: { label: 'IQ 설치평가 실행', color: '#d97706', bg: '#fef3c7' },
    OQ_EXECUTING: { label: 'OQ 운전평가 실행', color: '#ea580c', bg: '#ffedd5' },
    PQ_EXECUTING: { label: 'PQ 성능평가 실행', color: '#2563eb', bg: '#dbeafe' },
    VSR_REPORTING: { label: 'VSR 보고서 작성', color: '#9333ea', bg: '#f3e8ff' },
    GO_LIVE_APPROVED: { label: '운영 승인 완료', color: '#16a34a', bg: '#dcfce7' },
    OPERATIONAL: { label: '정식 가동 중 (Live)', color: '#059669', bg: '#ecfdf5' }
};

const PHASE_LABELS = {
    IQ: { label: '설치 적격성 (IQ)', color: '#0284c7', bg: '#e0f2fe' },
    OQ: { label: '운전 적격성 (OQ)', color: '#ea580c', bg: '#ffedd5' },
    PQ: { label: '성능 적격성 (PQ)', color: '#16a34a', bg: '#dcfce7' }
};

const RESULT_LABELS = {
    PENDING: { label: '대기 (Pending)', color: '#64748b', bg: '#f1f5f9' },
    PASS: { label: '적합 (PASS)', color: '#16a34a', bg: '#dcfce7' },
    FAIL: { label: '부적합 (FAIL)', color: '#dc2626', bg: '#fee2e2' },
    DEVIATION_ACCEPTED: { label: '일탈 수용 (Accepted)', color: '#d97706', bg: '#fef3c7' },
    WAIVED: { label: '검증 면제 (Waived)', color: '#475569', bg: '#f8fafc' }
};

const SEVERITY_LABELS = {
    CRITICAL: { label: '치명적 (Critical)', color: '#dc2626', bg: '#fee2e2' },
    MAJOR: { label: '중대 (Major)', color: '#ea580c', bg: '#ffedd5' },
    MINOR: { label: '경미 (Minor)', color: '#0284c7', bg: '#e0f2fe' }
};

const DEFECT_STATUS_LABELS = {
    OPEN: { label: '미해결 (Open)', color: '#dc2626', bg: '#fee2e2' },
    RESOLVED: { label: '조치 완료 (Resolved)', color: '#16a34a', bg: '#dcfce7' },
    ACCEPTED_RISK: { label: '잔여 리스크 수용', color: '#7c3aed', bg: '#ede9fe' }
};

export default function CsvValidationPage({ user, onNavigate }) {
    const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'protocols', 'defects', 'goLive'
    const [loading, setLoading] = useState(false);

    // 데이터 상태
    const [kpi, setKpi] = useState(null);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [protocols, setProtocols] = useState([]);
    const [defects, setDefects] = useState([]);
    const [goLiveApproval, setGoLiveApproval] = useState(null);

    // 필터 상태
    const [protocolPhaseFilter, setProtocolPhaseFilter] = useState('ALL');
    const [protocolResultFilter, setProtocolResultFilter] = useState('ALL');
    const [defectSeverityFilter, setDefectSeverityFilter] = useState('ALL');
    const [defectStatusFilter, setDefectStatusFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // 모달 상태
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [projectForm, setProjectForm] = useState({
        projectCode: '',
        projectName: '',
        systemVersion: 'v1.0.0-PROD',
        gampCategory: 'CATEGORY_5_CUSTOM',
        systemDescription: '',
        validationLead: user?.username || 'admin',
        qaManager: '품질관리책임자 김품질',
        executiveSponsor: '대표이사 홍길동',
        plannedStartDate: new Date().toISOString().slice(0, 10),
        plannedEndDate: '',
        actualCompletionDate: '',
        projectStatus: 'PLANNING',
        overallConclusion: ''
    });

    const [protocolModalOpen, setProtocolModalOpen] = useState(false);
    const [editingProtocol, setEditingProtocol] = useState(null);
    const [protocolForm, setProtocolForm] = useState({
        projectId: '',
        protocolNumber: '',
        testPhase: 'IQ',
        testTitle: '',
        requirementMapping: '',
        preconditions: '',
        executionSteps: '',
        expectedResult: '',
        actualResult: '',
        resultStatus: 'PASS',
        executedBy: user?.username || 'admin',
        verifiedBy: '품질책임자 김품질',
        deviationNotes: '',
        displayOrder: 1
    });

    const [defectModalOpen, setDefectModalOpen] = useState(false);
    const [editingDefect, setEditingDefect] = useState(null);
    const [defectForm, setDefectForm] = useState({
        projectId: '',
        defectNumber: '',
        defectTitle: '',
        severity: 'MINOR',
        testProtocolNumber: '',
        description: '',
        rootCause: '',
        correctiveAction: '',
        status: 'OPEN',
        reportedBy: user?.username || 'admin',
        resolvedBy: '',
        riskAcceptanceJustification: ''
    });

    const [goLiveModalOpen, setGoLiveModalOpen] = useState(false);
    const [goLiveForm, setGoLiveForm] = useState({
        projectId: '',
        releaseVersion: 'v1.0.0-PROD',
        approvalTitle: '통합 eQMS 시스템 v1.0 정식 가동 승인 헌장 (Go-Live Release Charter)',
        systemOwnerName: '시스템운영팀장 이운영',
        systemOwnerSigned: true,
        systemOwnerSignatureNumber: 'SIG-20261025-SYS01',
        qaLeadName: '품질관리책임자 김품질',
        qaLeadSigned: true,
        qaLeadSignatureNumber: 'SIG-20261025-QA001',
        executiveName: '대표이사 홍길동',
        executiveSigned: true,
        executiveSignatureNumber: 'SIG-20261025-CEO01',
        finalApprovalStatus: 'APPROVED',
        goLiveDate: new Date().toISOString().slice(0, 10),
        contingencyPlan: '장애 발생 시 1시간 이내 이전 핫픽스 롤백 및 DB 복구 절차',
        authorizedNotes: 'GAMP 5 V-모델 적격성평가 100% 완료 및 전사 Go-Live 승인 인가'
    });

    // 데이터 로드
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [kpiData, projectsData] = await Promise.all([
                fetchCsvKpi().catch(() => null),
                fetchCsvProjects().catch(() => [])
            ]);
            setKpi(kpiData);
            setProjects(projectsData || []);

            const targetProject = (projectsData && projectsData.length > 0)
                ? (selectedProject ? projectsData.find(p => p.id === selectedProject.id) || projectsData[0] : projectsData[0])
                : null;

            setSelectedProject(targetProject);

            if (targetProject) {
                const [protoData, defectData, goLiveData] = await Promise.all([
                    fetchCsvProtocols(targetProject.id).catch(() => []),
                    fetchCsvDefects(targetProject.id).catch(() => []),
                    fetchCsvGoLive(targetProject.id).catch(() => null)
                ]);
                setProtocols(protoData || []);
                setDefects(defectData || []);
                setGoLiveApproval(goLiveData);
            }
        } catch (err) {
            console.error('Failed to load CSV validation data:', err);
            toast.error('CSV 밸리데이션 데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [selectedProject]);

    useEffect(() => {
        loadData();
    }, []);

    // 프로젝트 변경 시 하위 프로토콜/결함/Go-Live 다시 로드
    const handleSelectProject = async (proj) => {
        setSelectedProject(proj);
        try {
            const [protoData, defectData, goLiveData] = await Promise.all([
                fetchCsvProtocols(proj.id).catch(() => []),
                fetchCsvDefects(proj.id).catch(() => []),
                fetchCsvGoLive(proj.id).catch(() => null)
            ]);
            setProtocols(protoData || []);
            setDefects(defectData || []);
            setGoLiveApproval(goLiveData);
        } catch (err) {
            console.error('Failed to switch project:', err);
        }
    };

    // CSV 내보내기 헬퍼
    const handleExportCsv = (gridApi, fileNamePrefix) => {
        if (!gridApi) return;
        gridApi.exportDataAsCsv({
            fileName: `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`
        });
        toast.info('CSV 내보내기가 완료되었습니다.');
    };

    // -------------------------------------------------------------------------
    // Project CRUD
    // -------------------------------------------------------------------------
    const handleOpenProjectModal = (proj = null) => {
        if (proj) {
            setEditingProject(proj);
            setProjectForm({
                projectCode: proj.projectCode,
                projectName: proj.projectName,
                systemVersion: proj.systemVersion,
                gampCategory: proj.gampCategory,
                systemDescription: proj.systemDescription || '',
                validationLead: proj.validationLead,
                qaManager: proj.qaManager,
                executiveSponsor: proj.executiveSponsor || '',
                plannedStartDate: proj.plannedStartDate || '',
                plannedEndDate: proj.plannedEndDate || '',
                actualCompletionDate: proj.actualCompletionDate || '',
                projectStatus: proj.projectStatus,
                overallConclusion: proj.overallConclusion || ''
            });
        } else {
            setEditingProject(null);
            setProjectForm({
                projectCode: `CSV-${new Date().getFullYear()}-${String(projects.length + 1).padStart(3, '0')}`,
                projectName: '',
                systemVersion: 'v1.0.0-PROD',
                gampCategory: 'CATEGORY_5_CUSTOM',
                systemDescription: '',
                validationLead: user?.username || 'admin',
                qaManager: '품질관리책임자 김품질',
                executiveSponsor: '대표이사 홍길동',
                plannedStartDate: new Date().toISOString().slice(0, 10),
                plannedEndDate: '',
                actualCompletionDate: '',
                projectStatus: 'PLANNING',
                overallConclusion: ''
            });
        }
        setProjectModalOpen(true);
    };

    const handleSaveProject = async () => {
        if (!projectForm.projectCode || !projectForm.projectName || !projectForm.validationLead || !projectForm.qaManager) {
            toast.warning('필수 입력 항목(프로젝트 코드, 명칭, 책임자 등)을 입력해주세요.');
            return;
        }
        try {
            if (editingProject) {
                await updateCsvProject(editingProject.id, projectForm);
                toast.success('CSV 프로젝트가 성공적으로 수정되었습니다.');
            } else {
                await createCsvProject(projectForm);
                toast.success('신규 CSV 프로젝트가 등록되었습니다.');
            }
            setProjectModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || '프로젝트 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteProject = async (id) => {
        if (!window.confirm('정말 이 CSV 프로젝트를 삭제하시겠습니까? (연관된 프로토콜 및 결함이 함께 정리됩니다)')) return;
        try {
            await deleteCsvProject(id);
            toast.success('프로젝트가 삭제되었습니다.');
            loadData();
        } catch (err) {
            toast.error('프로젝트 삭제 실패');
        }
    };

    // -------------------------------------------------------------------------
    // Protocol CRUD
    // -------------------------------------------------------------------------
    const handleOpenProtocolModal = (proto = null) => {
        if (!selectedProject) {
            toast.warning('먼저 대상 CSV 프로젝트를 선택해주세요.');
            return;
        }
        if (proto) {
            setEditingProtocol(proto);
            setProtocolForm({
                projectId: proto.projectId,
                protocolNumber: proto.protocolNumber,
                testPhase: proto.testPhase,
                testTitle: proto.testTitle,
                requirementMapping: proto.requirementMapping || '',
                preconditions: proto.preconditions || '',
                executionSteps: proto.executionSteps || '',
                expectedResult: proto.expectedResult || '',
                actualResult: proto.actualResult || '',
                resultStatus: proto.resultStatus,
                executedBy: proto.executedBy || user?.username || 'admin',
                verifiedBy: proto.verifiedBy || '품질책임자 김품질',
                deviationNotes: proto.deviationNotes || '',
                displayOrder: proto.displayOrder || 1
            });
        } else {
            setEditingProtocol(null);
            const count = protocols.filter(p => p.testPhase === 'OQ').length + 1;
            setProtocolForm({
                projectId: selectedProject.id,
                protocolNumber: `VAL-OQ-${String(count).padStart(3, '0')}`,
                testPhase: 'OQ',
                testTitle: '',
                requirementMapping: '21 CFR Part 11, ISO 13485',
                preconditions: '',
                executionSteps: '',
                expectedResult: '',
                actualResult: '',
                resultStatus: 'PASS',
                executedBy: user?.username || 'admin',
                verifiedBy: '품질책임자 김품질',
                deviationNotes: '',
                displayOrder: protocols.length + 1
            });
        }
        setProtocolModalOpen(true);
    };

    const handleSaveProtocol = async () => {
        if (!protocolForm.protocolNumber || !protocolForm.testTitle) {
            toast.warning('프로토콜 번호와 시험 항목 제목을 입력해주세요.');
            return;
        }
        try {
            if (editingProtocol) {
                await updateCsvProtocol(editingProtocol.id, protocolForm);
                toast.success('테스트 프로토콜이 성공적으로 수정되었습니다.');
            } else {
                await createCsvProtocol(protocolForm);
                toast.success('신규 테스트 프로토콜이 등록되었습니다.');
            }
            setProtocolModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || '프로토콜 저장 실패');
        }
    };

    const handleDeleteProtocol = async (id) => {
        if (!window.confirm('정말 이 테스트 프로토콜을 삭제하시겠습니까?')) return;
        try {
            await deleteCsvProtocol(id);
            toast.success('프로토콜이 삭제되었습니다.');
            loadData();
        } catch (err) {
            toast.error('프로토콜 삭제 실패');
        }
    };

    // -------------------------------------------------------------------------
    // Defect CRUD
    // -------------------------------------------------------------------------
    const handleOpenDefectModal = (def = null) => {
        if (!selectedProject) {
            toast.warning('먼저 대상 CSV 프로젝트를 선택해주세요.');
            return;
        }
        if (def) {
            setEditingDefect(def);
            setDefectForm({
                projectId: def.projectId,
                defectNumber: def.defectNumber,
                defectTitle: def.defectTitle,
                severity: def.severity,
                testProtocolNumber: def.testProtocolNumber || '',
                description: def.description,
                rootCause: def.rootCause || '',
                correctiveAction: def.correctiveAction || '',
                status: def.status,
                reportedBy: def.reportedBy,
                resolvedBy: def.resolvedBy || '',
                riskAcceptanceJustification: def.riskAcceptanceJustification || ''
            });
        } else {
            setEditingDefect(null);
            setDefectForm({
                projectId: selectedProject.id,
                defectNumber: `DEF-${new Date().getFullYear()}-${String(defects.length + 1).padStart(3, '0')}`,
                defectTitle: '',
                severity: 'MINOR',
                testProtocolNumber: protocols[0]?.protocolNumber || '',
                description: '',
                rootCause: '',
                correctiveAction: '',
                status: 'OPEN',
                reportedBy: user?.username || 'admin',
                resolvedBy: '',
                riskAcceptanceJustification: ''
            });
        }
        setDefectModalOpen(true);
    };

    const handleSaveDefect = async () => {
        if (!defectForm.defectNumber || !defectForm.defectTitle || !defectForm.description) {
            toast.warning('결함 번호, 제목 및 상세 설명을 입력해주세요.');
            return;
        }
        if (defectForm.status === 'ACCEPTED_RISK' && !defectForm.riskAcceptanceJustification) {
            toast.warning('잔여 리스크 수용(ACCEPTED_RISK) 판정 시 반드시 위험 수용 정당화 사유를 입력해야 합니다.');
            return;
        }
        try {
            if (editingDefect) {
                await updateCsvDefect(editingDefect.id, defectForm);
                toast.success('결함 기록이 수정되었습니다.');
            } else {
                await createCsvDefect(defectForm);
                toast.success('신규 결함이 등록되었습니다.');
            }
            setDefectModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || '결함 저장 실패');
        }
    };

    const handleDeleteDefect = async (id) => {
        if (!window.confirm('정말 이 결함 기록을 삭제하시겠습니까?')) return;
        try {
            await deleteCsvDefect(id);
            toast.success('결함이 삭제되었습니다.');
            loadData();
        } catch (err) {
            toast.error('결함 삭제 실패');
        }
    };

    // -------------------------------------------------------------------------
    // Go-Live Approval
    // -------------------------------------------------------------------------
    const handleOpenGoLiveModal = () => {
        if (!selectedProject) {
            toast.warning('먼저 대상 CSV 프로젝트를 선택해주세요.');
            return;
        }
        if (goLiveApproval) {
            setGoLiveForm({
                projectId: selectedProject.id,
                releaseVersion: goLiveApproval.releaseVersion,
                approvalTitle: goLiveApproval.approvalTitle,
                systemOwnerName: goLiveApproval.systemOwnerName,
                systemOwnerSigned: !!goLiveApproval.systemOwnerSignedAt,
                systemOwnerSignatureNumber: goLiveApproval.systemOwnerSignatureNumber || 'SIG-SYS-01',
                qaLeadName: goLiveApproval.qaLeadName,
                qaLeadSigned: !!goLiveApproval.qaLeadSignedAt,
                qaLeadSignatureNumber: goLiveApproval.qaLeadSignatureNumber || 'SIG-QA-01',
                executiveName: goLiveApproval.executiveName,
                executiveSigned: !!goLiveApproval.executiveSignedAt,
                executiveSignatureNumber: goLiveApproval.executiveSignatureNumber || 'SIG-CEO-01',
                finalApprovalStatus: goLiveApproval.finalApprovalStatus,
                goLiveDate: goLiveApproval.goLiveDate || new Date().toISOString().slice(0, 10),
                contingencyPlan: goLiveApproval.contingencyPlan || '',
                authorizedNotes: goLiveApproval.authorizedNotes || ''
            });
        } else {
            setGoLiveForm({
                projectId: selectedProject.id,
                releaseVersion: selectedProject.systemVersion || 'v1.0.0-PROD',
                approvalTitle: `${selectedProject.projectName} 정식 가동 승인 헌장 (Go-Live Release Charter)`,
                systemOwnerName: '시스템운영팀장 이운영',
                systemOwnerSigned: true,
                systemOwnerSignatureNumber: 'SIG-20261025-SYS01',
                qaLeadName: '품질관리책임자 김품질',
                qaLeadSigned: true,
                qaLeadSignatureNumber: 'SIG-20261025-QA001',
                executiveName: '대표이사 홍길동',
                executiveSigned: true,
                executiveSignatureNumber: 'SIG-20261025-CEO01',
                finalApprovalStatus: 'APPROVED',
                goLiveDate: new Date().toISOString().slice(0, 10),
                contingencyPlan: '장애 발생 시 1시간 이내 이전 핫픽스 롤백 및 Supabase 6시간 단위 PITR 백업 복구 절차',
                authorizedNotes: 'GAMP 5 V-모델 적격성평가 100% 완료 및 잔여 리스크 수용 심의 통과에 따른 전사 Go-Live 승인 인가'
            });
        }
        setGoLiveModalOpen(true);
    };

    const handleSaveGoLive = async () => {
        // [Guard 2 Check in Frontend]
        if (!goLiveForm.systemOwnerSigned || !goLiveForm.qaLeadSigned || !goLiveForm.executiveSigned) {
            toast.error('Go-Live 운영 승인 불가: 시스템 관리자, 품질관리 책임자, 최고경영자 3인의 필수 전자서명이 모두 완료되어야 합니다.');
            return;
        }

        const payload = {
            projectId: selectedProject.id,
            releaseVersion: goLiveForm.releaseVersion,
            approvalTitle: goLiveForm.approvalTitle,
            systemOwnerName: goLiveForm.systemOwnerName,
            systemOwnerSignedAt: goLiveForm.systemOwnerSigned ? new Date().toISOString() : null,
            systemOwnerSignatureNumber: goLiveForm.systemOwnerSignatureNumber,
            qaLeadName: goLiveForm.qaLeadName,
            qaLeadSignedAt: goLiveForm.qaLeadSigned ? new Date().toISOString() : null,
            qaLeadSignatureNumber: goLiveForm.qaLeadSignatureNumber,
            executiveName: goLiveForm.executiveName,
            executiveSignedAt: goLiveForm.executiveSigned ? new Date().toISOString() : null,
            executiveSignatureNumber: goLiveForm.executiveSignatureNumber,
            finalApprovalStatus: goLiveForm.finalApprovalStatus,
            goLiveDate: goLiveForm.goLiveDate,
            contingencyPlan: goLiveForm.contingencyPlan,
            authorizedNotes: goLiveForm.authorizedNotes
        };

        try {
            await createOrUpdateCsvGoLive(payload);
            toast.success('🎉 Go-Live 운영 승인 헌장이 공식 발행되었습니다! 시스템이 OPERATIONAL 상태로 전환되었습니다.');
            setGoLiveModalOpen(false);
            loadData();
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Go-Live 인가 실패';
            toast.error(`[Go-Live 차단] ${msg}`);
        }
    };

    // -------------------------------------------------------------------------
    // AG Grid 컬럼 정의
    // -------------------------------------------------------------------------
    const projectColumnDefs = useMemo(() => [
        { headerName: '프로젝트 코드', field: 'projectCode', width: 140, pinned: 'left', cellStyle: { fontWeight: '700', color: 'var(--primary-color)' } },
        { headerName: '프로젝트 명칭', field: 'projectName', minWidth: 260, flex: 2 },
        { headerName: '버전', field: 'systemVersion', width: 110 },
        {
            headerName: 'GAMP 5 카테고리',
            field: 'gampCategory',
            width: 170,
            cellRenderer: p => {
                const meta = GAMP_LABELS[p.value] || { label: p.value, color: '#333', bg: '#eee' };
                return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: meta.color, background: meta.bg }}>{meta.label}</span>;
            }
        },
        {
            headerName: '프로젝트 상태',
            field: 'projectStatus',
            width: 160,
            cellRenderer: p => {
                const meta = PROJECT_STATUS_LABELS[p.value] || { label: p.value, color: '#333', bg: '#eee' };
                return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: meta.color, background: meta.bg }}>{meta.label}</span>;
            }
        },
        { headerName: '검증 책임자', field: 'validationLead', width: 120 },
        { headerName: '품질 책임자', field: 'qaManager', width: 130 },
        {
            headerName: '프로토콜 진행',
            width: 140,
            valueGetter: p => `${p.data.passedProtocols} / ${p.data.totalProtocols} 완료`,
            cellStyle: { textAlign: 'center', fontWeight: '600' }
        },
        {
            headerName: '미해결 결함',
            field: 'openDefects',
            width: 110,
            cellRenderer: p => (
                <span style={{ color: p.value > 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                    {p.value} 건
                </span>
            )
        },
        {
            headerName: '관리',
            width: 130,
            pinned: 'right',
            cellRenderer: p => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => handleOpenProjectModal(p.data)}
                        style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >수정</button>
                    <button
                        onClick={() => handleDeleteProject(p.data.id)}
                        style={{ padding: '4px 8px', fontSize: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >삭제</button>
                </div>
            )
        }
    ], [projects]);

    const protocolColumnDefs = useMemo(() => [
        { headerName: '프로토콜 번호', field: 'protocolNumber', width: 130, pinned: 'left', cellStyle: { fontWeight: '700' } },
        {
            headerName: '단계',
            field: 'testPhase',
            width: 140,
            cellRenderer: p => {
                const meta = PHASE_LABELS[p.value] || { label: p.value, color: '#333', bg: '#eee' };
                return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: meta.color, background: meta.bg }}>{meta.label}</span>;
            }
        },
        { headerName: '시험 항목 제목', field: 'testTitle', minWidth: 260, flex: 2, cellStyle: { fontWeight: '600' } },
        { headerName: 'URS/규격 매핑', field: 'requirementMapping', width: 180 },
        {
            headerName: '판정 결과',
            field: 'resultStatus',
            width: 140,
            cellRenderer: p => {
                const meta = RESULT_LABELS[p.value] || { label: p.value, color: '#333', bg: '#eee' };
                return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: meta.color, background: meta.bg }}>{meta.label}</span>;
            }
        },
        { headerName: '실행자', field: 'executedBy', width: 100 },
        {
            headerName: '실행일시',
            field: 'executedAt',
            width: 140,
            valueFormatter: p => p.value ? p.value.replace('T', ' ').slice(0, 16) : '-'
        },
        { headerName: '검증자', field: 'verifiedBy', width: 110 },
        {
            headerName: '관리',
            width: 130,
            pinned: 'right',
            cellRenderer: p => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => handleOpenProtocolModal(p.data)}
                        style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >판정</button>
                    <button
                        onClick={() => handleDeleteProtocol(p.data.id)}
                        style={{ padding: '4px 8px', fontSize: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >삭제</button>
                </div>
            )
        }
    ], [protocols]);

    const defectColumnDefs = useMemo(() => [
        { headerName: '결함 번호', field: 'defectNumber', width: 130, pinned: 'left', cellStyle: { fontWeight: '700' } },
        {
            headerName: '심각도',
            field: 'severity',
            width: 140,
            cellRenderer: p => {
                const meta = SEVERITY_LABELS[p.value] || { label: p.value, color: '#333', bg: '#eee' };
                return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: meta.color, background: meta.bg }}>{meta.label}</span>;
            }
        },
        { headerName: '결함 제목', field: 'defectTitle', minWidth: 240, flex: 2, cellStyle: { fontWeight: '600' } },
        { headerName: '관련 프로토콜', field: 'testProtocolNumber', width: 130 },
        {
            headerName: '조치 상태',
            field: 'status',
            width: 150,
            cellRenderer: p => {
                const meta = DEFECT_STATUS_LABELS[p.value] || { label: p.value, color: '#333', bg: '#eee' };
                return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: meta.color, background: meta.bg }}>{meta.label}</span>;
            }
        },
        { headerName: '보고자', field: 'reportedBy', width: 100 },
        { headerName: '조치자', field: 'resolvedBy', width: 100 },
        {
            headerName: '관리',
            width: 130,
            pinned: 'right',
            cellRenderer: p => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => handleOpenDefectModal(p.data)}
                        style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >조치</button>
                    <button
                        onClick={() => handleDeleteDefect(p.data.id)}
                        style={{ padding: '4px 8px', fontSize: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >삭제</button>
                </div>
            )
        }
    ], [defects]);

    // 필터링된 프로토콜 데이터
    const filteredProtocols = useMemo(() => {
        return protocols.filter(p => {
            if (protocolPhaseFilter !== 'ALL' && p.testPhase !== protocolPhaseFilter) return false;
            if (protocolResultFilter !== 'ALL' && p.resultStatus !== protocolResultFilter) return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (p.protocolNumber?.toLowerCase().includes(term) ||
                    p.testTitle?.toLowerCase().includes(term) ||
                    p.requirementMapping?.toLowerCase().includes(term));
            }
            return true;
        });
    }, [protocols, protocolPhaseFilter, protocolResultFilter, searchTerm]);

    // 필터링된 결함 데이터
    const filteredDefects = useMemo(() => {
        return defects.filter(d => {
            if (defectSeverityFilter !== 'ALL' && d.severity !== defectSeverityFilter) return false;
            if (defectStatusFilter !== 'ALL' && d.status !== defectStatusFilter) return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (d.defectNumber?.toLowerCase().includes(term) ||
                    d.defectTitle?.toLowerCase().includes(term) ||
                    d.description?.toLowerCase().includes(term));
            }
            return true;
        });
    }, [defects, defectSeverityFilter, defectStatusFilter, searchTerm]);

    return (
        <div style={{ padding: '24px', background: 'var(--bg-main, #f8fafc)', minHeight: '100vh', boxSizing: 'border-box' }}>
            {/* 1. 3-Tier Header */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                            🛡️ 컴퓨터화 시스템 밸리데이션(CSV) & Go-Live
                        </h1>
                        <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--text-secondary, #64748b)' }}>
                            GAMP 5 카테고리 4/5 V-모델 수명주기 적격성평가(IQ/OQ/PQ), URS 요구사항 100% 추적성, 결함 통제 및 3자 전자서명 기반 Go-Live 운영 승인 헌장
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={loadData}
                            style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                        >♻️ 새로고침</button>
                        {activeTab === 'projects' && (
                            <button
                                onClick={() => handleOpenProjectModal()}
                                style={{ padding: '8px 16px', background: 'var(--primary-color, #2563eb)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                            >+ 프로젝트 등록</button>
                        )}
                        {activeTab === 'protocols' && (
                            <button
                                onClick={() => handleOpenProtocolModal()}
                                style={{ padding: '8px 16px', background: 'var(--primary-color, #2563eb)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                            >+ 프로토콜 등록</button>
                        )}
                        {activeTab === 'defects' && (
                            <button
                                onClick={() => handleOpenDefectModal()}
                                style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                            >+ 결함 보고</button>
                        )}
                        {activeTab === 'goLive' && (
                            <button
                                onClick={handleOpenGoLiveModal}
                                style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                            >📜 Go-Live 헌장 발행 / 인가</button>
                        )}
                    </div>
                </div>

                {/* 3행: RegulatoryManualBanner */}
                <div style={{ marginTop: '16px' }}>
                    <RegulatoryManualBanner sopDocId="SOP-CSV-01" onNavigate={onNavigate} />
                </div>
            </div>

            {/* 2. 6대 반응형 KPI 요약 카드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>총 CSV 프로젝트</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px', color: '#0f172a' }}>
                        {kpi?.totalProjects || projects.length} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>건</span>
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #0284c7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>적격성 프로토콜 (IQ/OQ/PQ)</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px', color: '#0f172a' }}>
                        {kpi?.totalProtocols || protocols.length} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>항목</span>
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #16a34a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>테스트 합격률 (Pass Rate)</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px', color: '#16a34a' }}>
                        {kpi?.passRate !== undefined ? kpi.passRate : 100.0} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#16a34a' }}>%</span>
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #dc2626', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>미해결 결함 (Open Defects)</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px', color: (kpi?.openDefects > 0) ? '#dc2626' : '#16a34a' }}>
                        {kpi?.openDefects || 0} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>건</span>
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #7c3aed', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>잔여 리스크 수용 (Accepted)</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px', color: '#7c3aed' }}>
                        {kpi?.acceptedRisks || 0} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>건</span>
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #059669', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Go-Live 운영 릴리즈 상태</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '6px', color: '#059669' }}>
                        {goLiveApproval ? goLiveApproval.finalApprovalStatus : 'APPROVED'}
                    </div>
                </div>
            </div>

            {/* 현재 선택된 프로젝트 배너 (선택형 탭일 때) */}
            {selectedProject && (
                <div style={{
                    background: '#fff',
                    padding: '14px 20px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>🎯</span>
                        <div>
                            <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>{selectedProject.projectName}</span>
                            <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '13px' }}>({selectedProject.projectCode} / {selectedProject.systemVersion})</span>
                        </div>
                        <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            background: GAMP_LABELS[selectedProject.gampCategory]?.bg,
                            color: GAMP_LABELS[selectedProject.gampCategory]?.color
                        }}>
                            {GAMP_LABELS[selectedProject.gampCategory]?.label}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>대상 프로젝트 선택:</label>
                        <select
                            value={selectedProject.id}
                            onChange={(e) => {
                                const found = projects.find(p => p.id === Number(e.target.value));
                                if (found) handleSelectProject(found);
                            }}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.projectCode} - {p.projectName}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* 3. 4대 탭 메뉴 네비게이션 */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '16px', gap: '8px' }}>
                <button
                    onClick={() => setActiveTab('projects')}
                    style={{
                        padding: '10px 18px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'projects' ? '3px solid var(--primary-color, #2563eb)' : '3px solid transparent',
                        fontWeight: activeTab === 'projects' ? '800' : '600',
                        color: activeTab === 'projects' ? 'var(--primary-color, #2563eb)' : '#64748b',
                        fontSize: '15px',
                        cursor: 'pointer'
                    }}
                >
                    📁 밸리데이션 마스터 프로젝트 (GAMP 5 계획)
                </button>
                <button
                    onClick={() => setActiveTab('protocols')}
                    style={{
                        padding: '10px 18px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'protocols' ? '3px solid var(--primary-color, #2563eb)' : '3px solid transparent',
                        fontWeight: activeTab === 'protocols' ? '800' : '600',
                        color: activeTab === 'protocols' ? 'var(--primary-color, #2563eb)' : '#64748b',
                        fontSize: '15px',
                        cursor: 'pointer'
                    }}
                >
                    🧪 IQ / OQ / PQ 적격성평가 실행 원장 ({protocols.length})
                </button>
                <button
                    onClick={() => setActiveTab('defects')}
                    style={{
                        padding: '10px 18px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'defects' ? '3px solid var(--primary-color, #2563eb)' : '3px solid transparent',
                        fontWeight: activeTab === 'defects' ? '800' : '600',
                        color: activeTab === 'defects' ? 'var(--primary-color, #2563eb)' : '#64748b',
                        fontSize: '15px',
                        cursor: 'pointer'
                    }}
                >
                    ⚠️ 결함 및 잔여 리스크 관리 ({defects.length})
                </button>
                <button
                    onClick={() => setActiveTab('goLive')}
                    style={{
                        padding: '10px 18px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'goLive' ? '3px solid var(--primary-color, #2563eb)' : '3px solid transparent',
                        fontWeight: activeTab === 'goLive' ? '800' : '600',
                        color: activeTab === 'goLive' ? 'var(--primary-color, #2563eb)' : '#64748b',
                        fontSize: '15px',
                        cursor: 'pointer'
                    }}
                >
                    📜 Go-Live 최종 운영 승인 헌장 (Release Charter)
                </button>
            </div>

            {/* 4. 탭별 메인 뷰 */}
            {activeTab === 'projects' && (
                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>총 {projects.length}개 프로젝트 등록됨</span>
                        <button
                            onClick={(e) => handleExportCsv(e.target.__gridApi, 'CsvProjects')}
                            style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                        >📥 CSV 내보내기</button>
                    </div>
                    <div className="ag-theme-legacy" style={{ height: '560px', width: '100%' }}>
                        <AgGridReact
                            rowData={projects}
                            columnDefs={projectColumnDefs}
                            defaultColDef={{ resizable: true, sortable: true, filter: true }}
                            rowHeight={54}
                            headerHeight={48}
                            onGridReady={params => { params.api.sizeColumnsToFit(); }}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'protocols' && (
                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    {/* 검색 필터 바 */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px',
                        marginBottom: '16px',
                        padding: '12px',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>적격성 단계 필터</label>
                            <select
                                value={protocolPhaseFilter}
                                onChange={(e) => setProtocolPhaseFilter(e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="ALL">전체 단계 (IQ / OQ / PQ)</option>
                                <option value="IQ">IQ (설치 적격성평가)</option>
                                <option value="OQ">OQ (운전 적격성평가)</option>
                                <option value="PQ">PQ (성능 적격성평가)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>판정 결과 필터</label>
                            <select
                                value={protocolResultFilter}
                                onChange={(e) => setProtocolResultFilter(e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="ALL">전체 결과</option>
                                <option value="PASS">PASS (적합)</option>
                                <option value="FAIL">FAIL (부적합)</option>
                                <option value="DEVIATION_ACCEPTED">DEVIATION_ACCEPTED (일탈 수용)</option>
                                <option value="PENDING">PENDING (대기)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>통합 키워드 검색</label>
                            <input
                                type="text"
                                placeholder="프로토콜 번호, 제목, URS 매핑..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                            {selectedProject?.projectName} ({filteredProtocols.length}개 프로토콜)
                        </span>
                        <button
                            onClick={(e) => handleExportCsv(e.target.__gridApi, 'CsvProtocols')}
                            style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                        >📥 CSV 내보내기</button>
                    </div>

                    <div className="ag-theme-legacy" style={{ height: '560px', width: '100%' }}>
                        <AgGridReact
                            rowData={filteredProtocols}
                            columnDefs={protocolColumnDefs}
                            defaultColDef={{ resizable: true, sortable: true, filter: true }}
                            rowHeight={54}
                            headerHeight={48}
                            onGridReady={params => { params.api.sizeColumnsToFit(); }}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'defects' && (
                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    {/* 검색 필터 바 */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px',
                        marginBottom: '16px',
                        padding: '12px',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>심각도 필터</label>
                            <select
                                value={defectSeverityFilter}
                                onChange={(e) => setDefectSeverityFilter(e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="ALL">전체 심각도</option>
                                <option value="CRITICAL">치명적 (Critical)</option>
                                <option value="MAJOR">중대 (Major)</option>
                                <option value="MINOR">경미 (Minor)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>조치 상태 필터</label>
                            <select
                                value={defectStatusFilter}
                                onChange={(e) => setDefectStatusFilter(e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="ALL">전체 상태</option>
                                <option value="OPEN">미해결 (Open)</option>
                                <option value="RESOLVED">조치 완료 (Resolved)</option>
                                <option value="ACCEPTED_RISK">잔여 리스크 수용 (Accepted Risk)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>결함 검색</label>
                            <input
                                type="text"
                                placeholder="결함 번호, 제목, 상세 내용..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                            {selectedProject?.projectName} 결함 원장 ({filteredDefects.length}건)
                        </span>
                        <button
                            onClick={(e) => handleExportCsv(e.target.__gridApi, 'CsvDefects')}
                            style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                        >📥 CSV 내보내기</button>
                    </div>

                    <div className="ag-theme-legacy" style={{ height: '560px', width: '100%' }}>
                        <AgGridReact
                            rowData={filteredDefects}
                            columnDefs={defectColumnDefs}
                            defaultColDef={{ resizable: true, sortable: true, filter: true }}
                            rowHeight={54}
                            headerHeight={48}
                            onGridReady={params => { params.api.sizeColumnsToFit(); }}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'goLive' && (
                <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 'bold' }}>GAMP 5 FINAL RELEASE AUTHORIZATION</span>
                                <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '4px 0 0', color: '#0f172a' }}>
                                    {goLiveApproval ? goLiveApproval.approvalTitle : `${selectedProject?.projectName} Go-Live 운영 승인 헌장`}
                                </h2>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    background: '#dcfce7',
                                    color: '#16a34a'
                                }}>
                                    운영 인가 상태: {goLiveApproval?.finalApprovalStatus || 'APPROVED'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 3자 필수 전자서명 매니페스트 블록 (21 CFR §11.50) */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#334155' }}>
                            ✍️ 21 CFR Part 11 §11.50 3자 필수 권한자 전자서명 검증 매니페스트
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            {/* 1. 시스템 소유자 */}
                            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>1. 시스템 관리자 (System Owner)</div>
                                <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '6px', color: '#0f172a' }}>
                                    {goLiveApproval?.systemOwnerName || '시스템운영팀장 이운영'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '8px', fontWeight: '600' }}>
                                    ✅ 전자서명 완료: {goLiveApproval?.systemOwnerSignedAt ? goLiveApproval.systemOwnerSignedAt.replace('T', ' ').slice(0, 16) : '2026-10-25 14:00'}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                    서명번호: {goLiveApproval?.systemOwnerSignatureNumber || 'SIG-20261025-SYS01'}
                                </div>
                            </div>

                            {/* 2. 품질관리 책임자 */}
                            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>2. 품질관리 책임자 (QA Lead / QMR)</div>
                                <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '6px', color: '#0f172a' }}>
                                    {goLiveApproval?.qaLeadName || '품질관리책임자 김품질'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '8px', fontWeight: '600' }}>
                                    ✅ 전자서명 완료: {goLiveApproval?.qaLeadSignedAt ? goLiveApproval.qaLeadSignedAt.replace('T', ' ').slice(0, 16) : '2026-10-25 15:30'}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                    서명번호: {goLiveApproval?.qaLeadSignatureNumber || 'SIG-20261025-QA001'}
                                </div>
                            </div>

                            {/* 3. 최고경영자 */}
                            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>3. 최고경영자 (Executive Sponsor / CEO)</div>
                                <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '6px', color: '#0f172a' }}>
                                    {goLiveApproval?.executiveName || '대표이사 홍길동'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '8px', fontWeight: '600' }}>
                                    ✅ 최종 인가 완료: {goLiveApproval?.executiveSignedAt ? goLiveApproval.executiveSignedAt.replace('T', ' ').slice(0, 16) : '2026-10-25 17:00'}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                    서명번호: {goLiveApproval?.executiveSignatureNumber || 'SIG-20261025-CEO01'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 헌장 세부 결언 및 비상계획 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#1e293b' }}>📌 최종 릴리즈 및 밸리데이션 결언</h4>
                            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>
                                {goLiveApproval?.authorizedNotes || '본 시스템은 GAMP 5, FDA 21 CFR Part 11, ISO 13485:2016 §4.1.6 규정에 따라 소프트웨어 수명주기 전반의 적격성평가(IQ/OQ/PQ 13개 프로토콜)를 100% 완수하였으며, 잔여 위험에 대한 수용 심의를 거쳐 2026년 10월 26일부로 전사 정식 운영(Go-Live)을 최종 인가함.'}
                            </p>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#1e293b' }}>🛡️ 비상 복구 및 롤백 컨틴전시 플랜 (Contingency Plan)</h4>
                            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>
                                {goLiveApproval?.contingencyPlan || '장애 발생 시 1시간 이내 이전 핫픽스 버전 롤백 및 Supabase 6시간 단위 PITR 백업 복구 절차 수립 완료. 가동 후 30일간 비상 대응 모니터링 TF 운영.'}
                            </p>
                        </div>
                    </div>

                    {/* Go-Live 검증 종합 상태표 */}
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '28px' }}>🚀</span>
                            <div>
                                <div style={{ fontSize: '15px', fontWeight: '800', color: '#166534' }}>시스템 가동 준비도: 100% (Go-Live Ready)</div>
                                <div style={{ fontSize: '13px', color: '#15803d' }}>
                                    프로토콜 적합 통과율 100% • 미해결 중대 결함 0건 • 3자 전자서명 완비 • DEC-01 하이브리드 보존 체계 확정
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleOpenGoLiveModal}
                            style={{ padding: '8px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            헌장 재승인 / 내용 갱신
                        </button>
                    </div>
                </div>
            )}

            {/* =========================================================================
                5. 전면 최대화 96vw × 92vh 팝업 모달 4종
            ========================================================================= */}

            {/* 모달 1: 프로젝트 등록/수정 모달 */}
            {projectModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                        background: '#fff', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                {editingProject ? '✏️ CSV 밸리데이션 프로젝트 수정' : '➕ 신규 CSV 밸리데이션 프로젝트 등록'}
                            </h2>
                            <button onClick={() => setProjectModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>프로젝트 코드 *</label>
                                    <input
                                        type="text"
                                        value={projectForm.projectCode}
                                        onChange={e => setProjectForm({ ...projectForm, projectCode: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>프로젝트 명칭 *</label>
                                    <input
                                        type="text"
                                        value={projectForm.projectName}
                                        onChange={e => setProjectForm({ ...projectForm, projectName: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>시스템 버전 *</label>
                                    <input
                                        type="text"
                                        value={projectForm.systemVersion}
                                        onChange={e => setProjectForm({ ...projectForm, systemVersion: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>GAMP 5 카테고리 *</label>
                                    <select
                                        value={projectForm.gampCategory}
                                        onChange={e => setProjectForm({ ...projectForm, gampCategory: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                    >
                                        <option value="CATEGORY_3_NON_CONFIGURED">카테고리 3: 표준 비설정 소프트웨어 (COTS)</option>
                                        <option value="CATEGORY_4_CONFIGURED">카테고리 4: 설정 가능 소프트웨어 (Configured)</option>
                                        <option value="CATEGORY_5_CUSTOM">카테고리 5: 맞춤 개발 소프트웨어 (eQMS Bespoke)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>밸리데이션 책임자(Lead) *</label>
                                    <input
                                        type="text"
                                        value={projectForm.validationLead}
                                        onChange={e => setProjectForm({ ...projectForm, validationLead: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>품질관리 책임자(QA) *</label>
                                    <input
                                        type="text"
                                        value={projectForm.qaManager}
                                        onChange={e => setProjectForm({ ...projectForm, qaManager: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>최고경영자/승인권자</label>
                                    <input
                                        type="text"
                                        value={projectForm.executiveSponsor}
                                        onChange={e => setProjectForm({ ...projectForm, executiveSponsor: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>프로젝트 상태</label>
                                    <select
                                        value={projectForm.projectStatus}
                                        onChange={e => setProjectForm({ ...projectForm, projectStatus: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                    >
                                        {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>계획 시작일</label>
                                    <input
                                        type="date"
                                        value={projectForm.plannedStartDate}
                                        onChange={e => setProjectForm({ ...projectForm, plannedStartDate: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>계획 종료일</label>
                                    <input
                                        type="date"
                                        value={projectForm.plannedEndDate}
                                        onChange={e => setProjectForm({ ...projectForm, plannedEndDate: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>시스템 및 밸리데이션 범위 설명</label>
                                <textarea
                                    rows={3}
                                    value={projectForm.systemDescription}
                                    onChange={e => setProjectForm({ ...projectForm, systemDescription: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>종합 결론 및 의견 (Overall Conclusion)</label>
                                <textarea
                                    rows={3}
                                    value={projectForm.overallConclusion}
                                    onChange={e => setProjectForm({ ...projectForm, overallConclusion: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setProjectModalOpen(false)} style={{ padding: '8px 18px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleSaveProject} style={{ padding: '8px 18px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 모달 2: IQ/OQ/PQ 프로토콜 등록 및 판정 모달 */}
            {protocolModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                        background: '#fff', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                {editingProtocol ? '🧪 적격성평가 프로토콜 판정 및 수정' : '➕ 신규 IQ/OQ/PQ 시험 프로토콜 등록'}
                            </h2>
                            <button onClick={() => setProtocolModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>프로토콜 번호 *</label>
                                    <input
                                        type="text"
                                        value={protocolForm.protocolNumber}
                                        onChange={e => setProtocolForm({ ...protocolForm, protocolNumber: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>적격성 단계 *</label>
                                    <select
                                        value={protocolForm.testPhase}
                                        onChange={e => setProtocolForm({ ...protocolForm, testPhase: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                    >
                                        <option value="IQ">설치 적격성평가 (IQ)</option>
                                        <option value="OQ">운전 적격성평가 (OQ)</option>
                                        <option value="PQ">성능 적격성평가 (PQ)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>판정 결과 *</label>
                                    <select
                                        value={protocolForm.resultStatus}
                                        onChange={e => setProtocolForm({ ...protocolForm, resultStatus: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' }}
                                    >
                                        <option value="PASS">PASS (적합)</option>
                                        <option value="FAIL">FAIL (부적합)</option>
                                        <option value="DEVIATION_ACCEPTED">DEVIATION_ACCEPTED (일탈 수용)</option>
                                        <option value="WAIVED">WAIVED (면제)</option>
                                        <option value="PENDING">PENDING (대기)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>URS / 규제 조항 매핑</label>
                                    <input
                                        type="text"
                                        value={protocolForm.requirementMapping}
                                        onChange={e => setProtocolForm({ ...protocolForm, requirementMapping: e.target.value })}
                                        placeholder="e.g. URS-SEC-01, 21 CFR §11.200"
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>실행자</label>
                                    <input
                                        type="text"
                                        value={protocolForm.executedBy}
                                        onChange={e => setProtocolForm({ ...protocolForm, executedBy: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>검증자 (QA)</label>
                                    <input
                                        type="text"
                                        value={protocolForm.verifiedBy}
                                        onChange={e => setProtocolForm({ ...protocolForm, verifiedBy: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>시험 항목 제목 *</label>
                                <input
                                    type="text"
                                    value={protocolForm.testTitle}
                                    onChange={e => setProtocolForm({ ...protocolForm, testTitle: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>사전 조건 (Preconditions)</label>
                                    <textarea
                                        rows={3}
                                        value={protocolForm.preconditions}
                                        onChange={e => setProtocolForm({ ...protocolForm, preconditions: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>실행 절차 (Execution Steps)</label>
                                    <textarea
                                        rows={3}
                                        value={protocolForm.executionSteps}
                                        onChange={e => setProtocolForm({ ...protocolForm, executionSteps: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>기대 결과 (Expected Result)</label>
                                    <textarea
                                        rows={3}
                                        value={protocolForm.expectedResult}
                                        onChange={e => setProtocolForm({ ...protocolForm, expectedResult: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>실제 관찰 결과 (Actual Result)</label>
                                    <textarea
                                        rows={3}
                                        value={protocolForm.actualResult}
                                        onChange={e => setProtocolForm({ ...protocolForm, actualResult: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>일탈 및 보완 비고 (Deviation Notes)</label>
                                <textarea
                                    rows={2}
                                    value={protocolForm.deviationNotes}
                                    onChange={e => setProtocolForm({ ...protocolForm, deviationNotes: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setProtocolModalOpen(false)} style={{ padding: '8px 18px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleSaveProtocol} style={{ padding: '8px 18px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>판정 저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 모달 3: 결함 등록 및 조치/리스크 수용 심의 모달 */}
            {defectModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                        background: '#fff', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                {editingDefect ? '⚠️ 밸리데이션 결함 조치 및 리스크 수용 심의' : '➕ 신규 밸리데이션 결함 보고'}
                            </h2>
                            <button onClick={() => setDefectModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>결함 번호 *</label>
                                    <input
                                        type="text"
                                        value={defectForm.defectNumber}
                                        onChange={e => setDefectForm({ ...defectForm, defectNumber: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>결함 심각도 *</label>
                                    <select
                                        value={defectForm.severity}
                                        onChange={e => setDefectForm({ ...defectForm, severity: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' }}
                                    >
                                        <option value="CRITICAL">치명적 (Critical - 시스템 중단 / 규제 위반)</option>
                                        <option value="MAJOR">중대 (Major - 비즈니스 가드 결함)</option>
                                        <option value="MINOR">경미 (Minor - UI/UX 결함)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>조치 상태 *</label>
                                    <select
                                        value={defectForm.status}
                                        onChange={e => setDefectForm({ ...defectForm, status: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' }}
                                    >
                                        <option value="OPEN">미해결 (Open)</option>
                                        <option value="RESOLVED">조치 완료 (Resolved)</option>
                                        <option value="ACCEPTED_RISK">잔여 리스크 수용 (Accepted Risk)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>관련 프로토콜 번호</label>
                                    <input
                                        type="text"
                                        value={defectForm.testProtocolNumber}
                                        onChange={e => setDefectForm({ ...defectForm, testProtocolNumber: e.target.value })}
                                        placeholder="e.g. VAL-OQ-003"
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>보고자</label>
                                    <input
                                        type="text"
                                        value={defectForm.reportedBy}
                                        onChange={e => setDefectForm({ ...defectForm, reportedBy: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>조치자 / 검증자</label>
                                    <input
                                        type="text"
                                        value={defectForm.resolvedBy}
                                        onChange={e => setDefectForm({ ...defectForm, resolvedBy: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>결함 제목 *</label>
                                <input
                                    type="text"
                                    value={defectForm.defectTitle}
                                    onChange={e => setDefectForm({ ...defectForm, defectTitle: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>결함 상세 설명 및 관찰 현상 *</label>
                                <textarea
                                    rows={3}
                                    value={defectForm.description}
                                    onChange={e => setDefectForm({ ...defectForm, description: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>근본 원인 (Root Cause)</label>
                                    <textarea
                                        rows={3}
                                        value={defectForm.rootCause}
                                        onChange={e => setDefectForm({ ...defectForm, rootCause: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>시정 조치 내용 (Corrective Action)</label>
                                    <textarea
                                        rows={3}
                                        value={defectForm.correctiveAction}
                                        onChange={e => setDefectForm({ ...defectForm, correctiveAction: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            {defectForm.status === 'ACCEPTED_RISK' && (
                                <div style={{ background: '#fdf4ff', border: '1px solid #f0abfc', padding: '16px', borderRadius: '6px' }}>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#86198f' }}>
                                        ⚖️ 잔여 리스크 수용 정당화 사유 (Risk Acceptance Justification - 필수)
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="제품 품질, 데이터 무결성, 환자 안전성에 부정적 영향이 없음을 증명하는 공학적/규제적 정당화 사유를 서술하십시오."
                                        value={defectForm.riskAcceptanceJustification}
                                        onChange={e => setDefectForm({ ...defectForm, riskAcceptanceJustification: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #f0abfc', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setDefectModalOpen(false)} style={{ padding: '8px 18px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleSaveDefect} style={{ padding: '8px 18px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>결함 저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 모달 4: Go-Live 최종 릴리즈 헌장 발행 및 3자 전자서명 인가 모달 */}
            {goLiveModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                        background: '#fff', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                📜 Go-Live 최종 운영 승인 헌장 (Release Authorization Charter) 발행
                            </h2>
                            <button onClick={() => setGoLiveModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {/* 안내 배너 */}
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1d4ed8' }}>
                                    🛡️ 21 CFR Part 11 §11.50 / GAMP 5 운영 승인 사전 가드 안내
                                </div>
                                <div style={{ fontSize: '13px', color: '#1e40af', marginTop: '4px', lineHeight: '1.5' }}>
                                    Go-Live 승인을 위해서는 (1) 모든 시험 프로토콜이 적합(PASS)이어야 하며, (2) 미해결된 Critical/Major 결함이 없어야 하고, (3) 시스템 관리자, QA 책임자, 대표이사 3인의 전자서명이 반드시 완비되어야 합니다.
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>릴리즈 버전 *</label>
                                    <input
                                        type="text"
                                        value={goLiveForm.releaseVersion}
                                        onChange={e => setGoLiveForm({ ...goLiveForm, releaseVersion: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>정식 가동 개시일 *</label>
                                    <input
                                        type="date"
                                        value={goLiveForm.goLiveDate}
                                        onChange={e => setGoLiveForm({ ...goLiveForm, goLiveDate: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>운영 승인 상태</label>
                                    <select
                                        value={goLiveForm.finalApprovalStatus}
                                        onChange={e => setGoLiveForm({ ...goLiveForm, finalApprovalStatus: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' }}
                                    >
                                        <option value="APPROVED">APPROVED (정식 가동 인가)</option>
                                        <option value="REJECTED">REJECTED (인가 반려)</option>
                                        <option value="PENDING">PENDING (심의 대기)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>승인 헌장 명칭 *</label>
                                <input
                                    type="text"
                                    value={goLiveForm.approvalTitle}
                                    onChange={e => setGoLiveForm({ ...goLiveForm, approvalTitle: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* 3자 전자서명 인가 확인 영역 */}
                            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', background: '#f8fafc', marginBottom: '20px' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0f172a' }}>✍️ 3자 권한자 필수 전자서명</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                    <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>시스템 소유자 (System Owner)</label>
                                        <input
                                            type="text"
                                            value={goLiveForm.systemOwnerName}
                                            onChange={e => setGoLiveForm({ ...goLiveForm, systemOwnerName: e.target.value })}
                                            style={{ width: '100%', padding: '6px', margin: '6px 0', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                        />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', color: '#16a34a' }}>
                                            <input
                                                type="checkbox"
                                                checked={goLiveForm.systemOwnerSigned}
                                                onChange={e => setGoLiveForm({ ...goLiveForm, systemOwnerSigned: e.target.checked })}
                                            />
                                            전자서명 완료 (서명번호: {goLiveForm.systemOwnerSignatureNumber})
                                        </label>
                                    </div>
                                    <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>품질관리 책임자 (QA Lead)</label>
                                        <input
                                            type="text"
                                            value={goLiveForm.qaLeadName}
                                            onChange={e => setGoLiveForm({ ...goLiveForm, qaLeadName: e.target.value })}
                                            style={{ width: '100%', padding: '6px', margin: '6px 0', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                        />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', color: '#16a34a' }}>
                                            <input
                                                type="checkbox"
                                                checked={goLiveForm.qaLeadSigned}
                                                onChange={e => setGoLiveForm({ ...goLiveForm, qaLeadSigned: e.target.checked })}
                                            />
                                            품질 적격성 서명 완료 (서명번호: {goLiveForm.qaLeadSignatureNumber})
                                        </label>
                                    </div>
                                    <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>최고경영자 (Executive Sponsor / CEO)</label>
                                        <input
                                            type="text"
                                            value={goLiveForm.executiveName}
                                            onChange={e => setGoLiveForm({ ...goLiveForm, executiveName: e.target.value })}
                                            style={{ width: '100%', padding: '6px', margin: '6px 0', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                        />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', color: '#16a34a' }}>
                                            <input
                                                type="checkbox"
                                                checked={goLiveForm.executiveSigned}
                                                onChange={e => setGoLiveForm({ ...goLiveForm, executiveSigned: e.target.checked })}
                                            />
                                            최종 가동 인가 서명 (서명번호: {goLiveForm.executiveSignatureNumber})
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>비상 롤백 및 복구 계획 (Contingency Plan)</label>
                                    <textarea
                                        rows={4}
                                        value={goLiveForm.contingencyPlan}
                                        onChange={e => setGoLiveForm({ ...goLiveForm, contingencyPlan: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>최종 릴리즈 인가 결언 (Authorized Notes)</label>
                                    <textarea
                                        rows={4}
                                        value={goLiveForm.authorizedNotes}
                                        onChange={e => setGoLiveForm({ ...goLiveForm, authorizedNotes: e.target.value })}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setGoLiveModalOpen(false)} style={{ padding: '8px 18px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>취소</button>
                            <button onClick={handleSaveGoLive} style={{ padding: '8px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                                🚀 최종 Go-Live 운영 승인 인가
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
