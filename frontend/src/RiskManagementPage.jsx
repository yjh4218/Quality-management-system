import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import {
    fetchRiskAssessments,
    fetchRiskAssessmentById,
    createRiskAssessment,
    updateRiskAssessment,
    deleteRiskAssessment,
    approveRiskAssessment,
    createRiskHazardItem,
    updateRiskHazardItem,
    deleteRiskHazardItem,
    fetchRiskKpiMetrics
} from './api';

// =============================================================================
// Constants & Color Mappings (ISO 14971:2019)
// =============================================================================

const TARGET_FAMILIES = [
    { value: 'MEDICAL_DEVICE', label: '의료기기 (Medical Device)' },
    { value: 'IVD', label: '체외진단의료기기 (IVD)' },
    { value: 'COMBINATION', label: '복합·조합 의료기기 (Combination)' },
    { value: 'COSMETICS_DEVICE', label: '미용·피부의료기기 (Aesthetic Device)' }
];

const RISK_PHASES = [
    { value: 'DESIGN', label: '설계 위험분석 (Design Risk)' },
    { value: 'PROCESS', label: '공정 위험분석 (Process FMEA)' },
    { value: 'USE', label: '사용적합성 위험 (Usability / IEC 62366)' },
    { value: 'POST_MARKET', label: '시판 후 위험평가 (Post-Market Surveillance)' }
];

const HAZARD_CATEGORIES = [
    { value: 'BIO_SAFETY', label: '생물학적 안전성 (Biocompatibility / Sterility)' },
    { value: 'ELECTRICAL', label: '전기·전자 안전성 (Electrical / Thermal)' },
    { value: 'SOFTWARE', label: '소프트웨어 안전성 (Software / IEC 62304)' },
    { value: 'MECHANICAL', label: '기계적 안전성 (Mechanical / Physical)' },
    { value: 'USABILITY', label: '사용성 및 휴먼에러 (Usability / User Error)' },
    { value: 'RAW_MATERIAL', label: '원자재·화학물질 잔류 (Raw Material / Tox)' },
    { value: 'ENVIRONMENTAL', label: '환경·보관·운송 (Environmental / Storage)' }
];

const CONTROL_CATEGORIES = [
    { value: 'INHERENT_SAFETY', label: '1순위: 설계에 의한 본질적 안전 (Inherent Safety)' },
    { value: 'PROTECTIVE_MEASURES', label: '2순위: 기기 자체 또는 공정 보호수단 (Protective Measures)' },
    { value: 'INFORMATION_FOR_SAFETY', label: '3순위: 안전을 위한 정보제공 (Information for Safety)' }
];

const SEVERITY_LEVELS = [
    { score: 1, label: 'S1: 무시할 만함 (Negligible - 경미한 불편감)' },
    { score: 2, label: 'S2: 경미함 (Minor - 가벼운 상처, 처치 불요)' },
    { score: 3, label: 'S3: 중대함 (Serious - 가역적 상해, 전문의료 필요)' },
    { score: 4, label: 'S4: 치명적 (Critical - 영구적 장애, 기능 상실)' },
    { score: 5, label: 'S5: 파국적 (Catastrophic - 환자/사용자 사망)' }
];

const PROBABILITY_LEVELS = [
    { score: 1, label: 'P1: 거의 불가능 (Improbable - < 10⁻⁶)' },
    { score: 2, label: 'P2: 극히 드묾 (Remote - 10⁻⁶ ~ 10⁻⁴)' },
    { score: 3, label: 'P3: 가끔 (Occasional - 10⁻⁴ ~ 10⁻²)' },
    { score: 4, label: 'P4: 유력함 (Probable - 10⁻² ~ 10⁻¹)' },
    { score: 5, label: 'P5: 빈번함 (Frequent - > 10⁻¹)' }
];

const STATUS_CONFIG = {
    DRAFT: { label: '작성중', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
    REVIEW: { label: '검토중', bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
    APPROVED: { label: '승인완료', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
    OBSOLETE: { label: '폐기', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' }
};

// 5x5 Matrix Cell Evaluation
const getAcceptability = (score) => {
    if (score <= 4) {
        return {
            code: 'ACCEPTABLE',
            label: '수용 가능 (Acceptable)',
            bg: '#ecfdf5',
            color: '#065f46',
            border: '#a7f3d0'
        };
    }
    if (score <= 9) {
        return {
            code: 'ALARP',
            label: 'ALARP (실행가능최저수준)',
            bg: '#fffbeb',
            color: '#92400e',
            border: '#fde68a'
        };
    }
    return {
        code: 'UNACCEPTABLE',
        label: '수용 불가 (Unacceptable)',
        bg: '#fef2f2',
        color: '#991b1b',
        border: '#fca5a5'
    };
};

export default function RiskManagementPage() {
    // List & Filter States
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [kpiMetrics, setKpiMetrics] = useState({
        totalAssessments: 0,
        totalHazards: 0,
        completedControls: 0,
        unacceptableRisks: 0,
        residualAcceptableRate: 100.0,
        pendingReviewCount: 0,
        initialMatrix: {},
        residualMatrix: {}
    });

    const [filters, setFilters] = useState({
        keyword: '',
        targetFamily: '',
        riskPhase: '',
        status: ''
    });

    const [matrixViewMode, setMatrixViewMode] = useState('initial'); // 'initial', 'residual', 'split'

    // Modals
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState('hazards'); // 'hazards', 'matrix', 'report'
    const [currentDetail, setCurrentDetail] = useState(null);

    const [isHazardModalOpen, setIsHazardModalOpen] = useState(false);
    const [editingHazard, setEditingHazard] = useState(null);

    // Form Data for Assessment
    const [formData, setFormData] = useState({
        assessmentNo: '',
        title: '',
        productCode: '',
        productName: '',
        targetFamily: 'MEDICAL_DEVICE',
        riskPhase: 'DESIGN',
        versionTag: '1.0',
        author: '시스템 관리자',
        reviewer: '',
        approver: '',
        assessmentDate: new Date().toISOString().substring(0, 10),
        scopeDescription: '',
        overallConclusion: '',
        status: 'DRAFT'
    });

    // Form Data for Hazard Item
    const [hazardForm, setHazardForm] = useState({
        itemNo: '',
        category: 'ELECTRICAL',
        hazard: '',
        hazardousSituation: '',
        harm: '',
        initialSeverity: 3,
        initialProbability: 3,
        controlCategory: 'INHERENT_SAFETY',
        controlMeasures: '',
        controlStatus: 'COMPLETED',
        verificationMethod: '',
        verificationResult: 'PASS',
        residualSeverity: 2,
        residualProbability: 1,
        benefitRiskNeeded: false,
        benefitRiskSummary: '',
        remarks: ''
    });

    const gridRef = useRef(null);

    // =========================================================================
    // Data Fetching
    // =========================================================================

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [listRes, kpiRes] = await Promise.all([
                fetchRiskAssessments({
                    keyword: filters.keyword,
                    targetFamily: filters.targetFamily,
                    riskPhase: filters.riskPhase,
                    status: filters.status
                }),
                fetchRiskKpiMetrics()
            ]);

            const items = listRes?.data?.content || listRes?.content || listRes || [];
            setAssessments(Array.isArray(items) ? items : []);

            if (kpiRes) {
                setKpiMetrics(kpiRes);
            }
        } catch (error) {
            console.error('Failed to load risk management data:', error);
            toast.error('위험관리 데이터 조회 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // =========================================================================
    // Assessment CRUD Handlers
    // =========================================================================

    const handleOpenCreate = () => {
        setIsEditing(false);
        setSelectedAssessmentId(null);
        setFormData({
            assessmentNo: '',
            title: '',
            productCode: '',
            productName: '',
            targetFamily: 'MEDICAL_DEVICE',
            riskPhase: 'DESIGN',
            versionTag: '1.0',
            author: '시스템 관리자',
            reviewer: '',
            approver: '',
            assessmentDate: new Date().toISOString().substring(0, 10),
            scopeDescription: '',
            overallConclusion: '',
            status: 'DRAFT'
        });
        setIsFormOpen(true);
    };

    const handleOpenEdit = (data) => {
        setIsEditing(true);
        setSelectedAssessmentId(data.id);
        setFormData({
            assessmentNo: data.assessmentNo || '',
            title: data.title || '',
            productCode: data.productCode || '',
            productName: data.productName || '',
            targetFamily: data.targetFamily || 'MEDICAL_DEVICE',
            riskPhase: data.riskPhase || 'DESIGN',
            versionTag: data.versionTag || '1.0',
            author: data.author || '',
            reviewer: data.reviewer || '',
            approver: data.approver || '',
            assessmentDate: data.assessmentDate || new Date().toISOString().substring(0, 10),
            scopeDescription: data.scopeDescription || '',
            overallConclusion: data.overallConclusion || '',
            status: data.status || 'DRAFT'
        });
        setIsFormOpen(true);
    };

    const handleSaveAssessment = async (e) => {
        e.preventDefault();
        try {
            if (isEditing && selectedAssessmentId) {
                await updateRiskAssessment(selectedAssessmentId, formData);
                toast.success('위험성 평가 정보가 수정되었습니다.');
            } else {
                await createRiskAssessment(formData);
                toast.success('신규 위험성 평가가 등록되었습니다.');
            }
            setIsFormOpen(false);
            loadData();
        } catch (error) {
            console.error('Failed to save risk assessment:', error);
            toast.error('위험성 평가 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteAssessment = async (id, assessmentNo) => {
        if (!window.confirm(`[${assessmentNo}] 위험성 평가 문서를 삭제하시겠습니까?\n하위 위해요인 항목도 함께 삭제됩니다.`)) {
            return;
        }
        try {
            await deleteRiskAssessment(id);
            toast.success(`[${assessmentNo}] 위험성 평가 문서가 삭제되었습니다.`);
            loadData();
        } catch (error) {
            console.error('Failed to delete risk assessment:', error);
            toast.error('문서 삭제 중 오류가 발생했습니다.');
        }
    };

    const handleApprove = async (id, assessmentNo) => {
        const approverName = window.prompt('승인자 이름을 입력하십시오 (품질책임자/RA본부장):', '품질책임자');
        if (!approverName) return;

        try {
            await approveRiskAssessment(id, approverName);
            toast.success(`[${assessmentNo}] 위험관리 파일이 최종 전자 승인되었습니다.`);
            loadData();
            if (isDetailOpen && currentDetail && currentDetail.id === id) {
                loadDetail(id);
            }
        } catch (error) {
            console.error('Failed to approve risk assessment:', error);
            toast.error('승인 처리 중 오류가 발생했습니다.');
        }
    };

    // =========================================================================
    // Detail & Hazard CRUD Handlers
    // =========================================================================

    const loadDetail = async (id) => {
        try {
            const data = await fetchRiskAssessmentById(id);
            setCurrentDetail(data);
        } catch (error) {
            console.error('Failed to load assessment detail:', error);
            toast.error('상세 정보 조회에 실패했습니다.');
        }
    };

    const handleOpenDetailModal = async (data) => {
        await loadDetail(data.id);
        setActiveDetailTab('hazards');
        setIsDetailOpen(true);
    };

    const handleOpenAddHazard = () => {
        setEditingHazard(null);
        setHazardForm({
            itemNo: `HAZ-${String((currentDetail?.hazardItems?.length || 0) + 1).padStart(3, '0')}`,
            category: 'ELECTRICAL',
            hazard: '',
            hazardousSituation: '',
            harm: '',
            initialSeverity: 3,
            initialProbability: 3,
            controlCategory: 'INHERENT_SAFETY',
            controlMeasures: '',
            controlStatus: 'COMPLETED',
            verificationMethod: '',
            verificationResult: 'PASS',
            residualSeverity: 2,
            residualProbability: 1,
            benefitRiskNeeded: false,
            benefitRiskSummary: '',
            remarks: ''
        });
        setIsHazardModalOpen(true);
    };

    const handleOpenEditHazard = (hazard) => {
        setEditingHazard(hazard);
        setHazardForm({
            itemNo: hazard.itemNo || '',
            category: hazard.category || 'ELECTRICAL',
            hazard: hazard.hazard || '',
            hazardousSituation: hazard.hazardousSituation || '',
            harm: hazard.harm || '',
            initialSeverity: hazard.initialSeverity || 3,
            initialProbability: hazard.initialProbability || 3,
            controlCategory: hazard.controlCategory || 'INHERENT_SAFETY',
            controlMeasures: hazard.controlMeasures || '',
            controlStatus: hazard.controlStatus || 'COMPLETED',
            verificationMethod: hazard.verificationMethod || '',
            verificationResult: hazard.verificationResult || 'PASS',
            residualSeverity: hazard.residualSeverity || 2,
            residualProbability: hazard.residualProbability || 1,
            benefitRiskNeeded: hazard.benefitRiskNeeded || false,
            benefitRiskSummary: hazard.benefitRiskSummary || '',
            remarks: hazard.remarks || ''
        });
        setIsHazardModalOpen(true);
    };

    const handleSaveHazard = async (e) => {
        e.preventDefault();
        if (!currentDetail) return;

        try {
            if (editingHazard) {
                await updateRiskHazardItem(currentDetail.id, editingHazard.id, hazardForm);
                toast.success('위해요인 및 통제조치가 수정되었습니다.');
            } else {
                await createRiskHazardItem(currentDetail.id, hazardForm);
                toast.success('위해요인이 신규 추가되었습니다.');
            }
            setIsHazardModalOpen(false);
            await loadDetail(currentDetail.id);
            loadData();
        } catch (error) {
            console.error('Failed to save hazard item:', error);
            toast.error('위해요인 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteHazard = async (hazardId, itemNo) => {
        if (!window.confirm(`[${itemNo}] 위해요인 항목을 삭제하시겠습니까?`)) return;

        try {
            await deleteRiskHazardItem(currentDetail.id, hazardId);
            toast.success(`[${itemNo}] 위해요인이 삭제되었습니다.`);
            await loadDetail(currentDetail.id);
            loadData();
        } catch (error) {
            console.error('Failed to delete hazard:', error);
            toast.error('위해요인 삭제 중 오류가 발생했습니다.');
        }
    };

    // =========================================================================
    // AG Grid Configuration (Theme: Legacy, rowHeight: 54px)
    // =========================================================================

    const columnDefs = useMemo(() => [
        {
            headerName: '평가문서 번호',
            field: 'assessmentNo',
            width: 170,
            pinned: 'left',
            cellStyle: { display: 'flex', alignItems: 'center' },
            cellRenderer: (params) => (
                <span style={{ fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>
                    {params.value}
                </span>
            )
        },
        {
            headerName: '평가 제목',
            field: 'title',
            flex: 2,
            minWidth: 260,
            cellStyle: { display: 'flex', alignItems: 'center' },
            cellRenderer: (params) => (
                <span style={{ fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                    {params.value}
                </span>
            )
        },
        {
            headerName: '대상 품목',
            field: 'productName',
            width: 180,
            cellStyle: { display: 'flex', alignItems: 'center' },
            cellRenderer: (params) => (
                <span style={{ color: '#334155', fontWeight: 600 }}>
                    {params.value}
                </span>
            )
        },
        {
            headerName: '제품군',
            field: 'targetFamily',
            width: 140,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params) => {
                const fam = TARGET_FAMILIES.find(f => f.value === params.value);
                return (
                    <span style={{
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1'
                    }}>
                        {fam ? fam.label.split('(')[0].trim() : params.value}
                    </span>
                );
            }
        },
        {
            headerName: '위험단계',
            field: 'riskPhase',
            width: 130,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params) => {
                const phase = RISK_PHASES.find(p => p.value === params.value);
                return (
                    <span style={{
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe'
                    }}>
                        {phase ? phase.label.split('(')[0].trim() : params.value}
                    </span>
                );
            }
        },
        {
            headerName: 'Rev',
            field: 'versionTag',
            width: 80,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#475569' },
            cellRenderer: (params) => `v${params.value || '1.0'}`
        },
        {
            headerName: '진행상태',
            field: 'status',
            width: 110,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params) => {
                const info = STATUS_CONFIG[params.value] || { label: params.value, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
                return (
                    <span style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: info.bg,
                        color: info.color,
                        border: `1px solid ${info.border}`
                    }}>
                        {info.label}
                    </span>
                );
            }
        },
        {
            headerName: '위해요인 수',
            field: 'hazardCount',
            width: 110,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params) => (
                <span style={{ fontWeight: 700, color: '#1e293b' }}>
                    {params.value || 0}건
                </span>
            )
        },
        {
            headerName: '초기 수용불가',
            field: 'unacceptableCount',
            width: 120,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params) => (
                <span style={{ fontWeight: 700, color: params.value > 0 ? '#dc2626' : '#94a3b8' }}>
                    {params.value || 0}건
                </span>
            )
        },
        {
            headerName: '종합 잔여수용성',
            field: 'overallResidualRiskAcceptable',
            width: 140,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params) => (
                params.value ? (
                    <span style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0'
                    }}>
                        적합 (Acceptable)
                    </span>
                ) : (
                    <span style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5'
                    }}>
                        부적합 (Action Req)
                    </span>
                )
            )
        },
        {
            headerName: '작성자',
            field: 'author',
            width: 110,
            cellStyle: { display: 'flex', alignItems: 'center' }
        },
        {
            headerName: '평가일자',
            field: 'assessmentDate',
            width: 120,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }
        },
        {
            headerName: '관리 액션',
            field: 'actions',
            width: 250,
            pinned: 'right',
            sortable: false,
            filter: false,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params) => {
                const isApproved = params.data.status === 'APPROVED';
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => handleOpenDetailModal(params.data)}
                            style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#ffffff',
                                backgroundColor: '#2563eb',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                            title="FMEA 위해요인 3계층 분석 및 매트릭스 상세"
                        >
                            🔍 FMEA 분석
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenEdit(params.data)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#475569',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                            title="평가 기본정보 수정"
                        >
                            ✏️ 수정
                        </button>
                        {!isApproved && (
                            <button
                                type="button"
                                onClick={() => handleApprove(params.data.id, params.data.assessmentNo)}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#059669',
                                    backgroundColor: '#ecfdf5',
                                    border: '1px solid #a7f3d0',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                                title="품질책임자 최종 전자승인"
                            >
                                ✍️ 승인
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleDeleteAssessment(params.data.id, params.data.assessmentNo)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#dc2626',
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fca5a5',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                            title="위험관리 파일 삭제"
                        >
                            ❌ 삭제
                        </button>
                    </div>
                );
            }
        }
    ], []);

    // CSV Download
    const handleExportCsv = () => {
        if (gridRef.current && gridRef.current.api) {
            gridRef.current.api.exportDataAsCsv({
                fileName: `ISO14971_Risk_Assessments_${new Date().toISOString().substring(0, 10)}.csv`
            });
            toast.info('위험관리 목록이 CSV로 다운로드되었습니다.');
        }
    };

    // 5x5 Matrix Cell Rendering Helper
    const renderMatrixGrid = (matrixData, title, subtitle) => {
        return (
            <div style={{
                background: '#ffffff',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                flex: 1,
                minWidth: '320px'
            }}>
                <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>{title}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{subtitle}</p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', color: '#334155' }}>
                                <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '120px', fontWeight: 700 }}>심각도 (S)</th>
                                <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontWeight: 700 }}>P1 (거의불가)</th>
                                <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontWeight: 700 }}>P2 (극히드묾)</th>
                                <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontWeight: 700 }}>P3 (가끔)</th>
                                <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontWeight: 700 }}>P4 (유력함)</th>
                                <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontWeight: 700 }}>P5 (빈번함)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[5, 4, 3, 2, 1].map((s) => {
                                const sLabel = SEVERITY_LEVELS.find(l => l.score === s)?.label.split('(')[0].trim() || `S${s}`;
                                return (
                                    <tr key={s}>
                                        <td style={{
                                            padding: '8px 10px',
                                            fontWeight: 700,
                                            background: '#f8fafc',
                                            border: '1px solid #cbd5e1',
                                            textAlign: 'left',
                                            color: '#1e293b'
                                        }}>
                                            {sLabel}
                                        </td>
                                        {[1, 2, 3, 4, 5].map((p) => {
                                            const score = s * p;
                                            const cellCount = matrixData[`S${s}_P${p}`] || 0;
                                            let cellBg = '#ecfdf5';
                                            let cellSubText = '#059669';
                                            if (score >= 10) {
                                                cellBg = '#fef2f2';
                                                cellSubText = '#dc2626';
                                            } else if (score >= 5) {
                                                cellBg = '#fffbeb';
                                                cellSubText = '#d97706';
                                            }
                                            return (
                                                <td
                                                    key={p}
                                                    style={{
                                                        padding: '8px 6px',
                                                        border: '1px solid #cbd5e1',
                                                        backgroundColor: cellBg,
                                                        fontFamily: 'monospace'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                        <span style={{ fontSize: '10px', color: cellSubText, fontWeight: 600 }}>점수: {score}</span>
                                                        <span style={{
                                                            fontSize: '14px',
                                                            fontWeight: 800,
                                                            color: cellCount > 0 ? '#0f172a' : '#94a3b8'
                                                        }}>
                                                            {cellCount}건
                                                        </span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9', minHeight: '100%', width: '100%' }}>
            
            {/* ================================================================= */}
            {/* 1. 3-Tier Standard Header (ui-ux-guide.md 표준)                   */}
            {/* ================================================================= */}
            <div className="page-header-standard" style={{
                marginBottom: '16px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '20px 24px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0'
            }}>
                {/* 1단계: 타이틀 및 핵심 액션 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            <span>⚠️</span>
                            <span>위험관리 (ISO 14971:2019)</span>
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            style={{
                                padding: '9px 16px',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '13px',
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            📊 CSV 다운로드
                        </button>
                        <button
                            type="button"
                            onClick={loadData}
                            style={{
                                padding: '9px 16px',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '13px',
                                backgroundColor: '#ffffff',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            🔄 새로고침
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            style={{
                                padding: '9px 20px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '13px',
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                            }}
                        >
                            ➕ 신규 위험성평가 파일 등록
                        </button>
                    </div>
                </div>

                {/* 2단계: 핵심 요약 설명 */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                    paddingTop: '10px',
                    borderTop: '1px solid #f1f5f9'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                        의료기기 설계·공정·사용적합성 위해요인 3계층 모델, FMEA 통제 조치 및 잔여위험 종합 수용성 평가 (ISO 14971:2019 / ISO 13485:2016 §7.1)
                    </div>
                </div>
            </div>

            {/* 규제 기준 매뉴얼 가이드 배너 */}
            <RegulatoryManualBanner
                pageKey="riskManagement"
                standardLabel="ISO 14971:2019 (의료기기 위험관리) / ISO 13485:2016 §7.1 (제품실현의 기획 및 위험관리)"
            />

            {/* ================================================================= */}
            {/* 2. 6 KPI Summary Cards Grid (ControlledDocument 표준)              */}
            {/* ================================================================= */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
            }}>
                {/* 1. 전체 위험관리 파일 */}
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #2563eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>전체 위험관리 파일</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        {kpiMetrics.totalAssessments} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', marginTop: '2px' }}>RMF 파일 관리</div>
                </div>

                {/* 2. 식별된 위해요인 */}
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #4f46e5',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>식별된 위해요인</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        {kpiMetrics.totalHazards} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#4f46e5', marginTop: '2px' }}>총 Hazard 항목 수</div>
                </div>

                {/* 3. 통제 조치 완료 */}
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #0d9488',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>통제 조치 완료</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        {kpiMetrics.completedControls} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#0d9488', marginTop: '2px' }}>검증 완료 포함</div>
                </div>

                {/* 4. 초기 수용불가 위험 */}
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #dc2626',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>초기 수용불가 위험</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                        {kpiMetrics.unacceptableRisks} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', marginTop: '2px' }}>FMEA 10점 이상 고위험</div>
                </div>

                {/* 5. 잔여위험 수용가능률 */}
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #16a34a',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>잔여위험 수용가능률</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                        {kpiMetrics.residualAcceptableRate}%
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>안전성 저감 목표 달성</div>
                </div>

                {/* 6. 검토·승인 대기 */}
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #d97706',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>검토·승인 대기</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                        {kpiMetrics.pendingReviewCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', marginTop: '2px' }}>승인 결재 진행 중</div>
                </div>
            </div>

            {/* ================================================================= */}
            {/* 3. Interactive 5x5 FMEA Risk Matrix Section                      */}
            {/* ================================================================= */}
            <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                padding: '20px 24px',
                marginBottom: '16px'
            }}>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '14px',
                    marginBottom: '16px',
                    borderBottom: '1px solid #f1f5f9',
                    gap: '12px'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>📊</span>
                            <span>전사 위험 5x5 FMEA 매트릭스 지표 (전체 위해요인 분포)</span>
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                            통제 조치 적용 전(Initial)과 통제 후 잔여위험(Residual)의 매트릭스 좌표 이동 현황을 모니터링합니다.
                        </p>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#f1f5f9',
                        padding: '4px',
                        borderRadius: '8px'
                    }}>
                        <button
                            type="button"
                            onClick={() => setMatrixViewMode('initial')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: matrixViewMode === 'initial' ? 800 : 600,
                                border: 'none',
                                background: matrixViewMode === 'initial' ? '#ffffff' : 'transparent',
                                color: matrixViewMode === 'initial' ? '#2563eb' : '#64748b',
                                boxShadow: matrixViewMode === 'initial' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer'
                            }}
                        >
                            통제 전 초기 위험
                        </button>
                        <button
                            type="button"
                            onClick={() => setMatrixViewMode('residual')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: matrixViewMode === 'residual' ? 800 : 600,
                                border: 'none',
                                background: matrixViewMode === 'residual' ? '#ffffff' : 'transparent',
                                color: matrixViewMode === 'residual' ? '#2563eb' : '#64748b',
                                boxShadow: matrixViewMode === 'residual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer'
                            }}
                        >
                            통제 후 잔여 위험
                        </button>
                        <button
                            type="button"
                            onClick={() => setMatrixViewMode('split')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: matrixViewMode === 'split' ? 800 : 600,
                                border: 'none',
                                background: matrixViewMode === 'split' ? '#ffffff' : 'transparent',
                                color: matrixViewMode === 'split' ? '#2563eb' : '#64748b',
                                boxShadow: matrixViewMode === 'split' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer'
                            }}
                        >
                            나란히 비교
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    {(matrixViewMode === 'initial' || matrixViewMode === 'split') && (
                        renderMatrixGrid(
                            kpiMetrics.initialMatrix || {},
                            '통제 조치 전 초기 위험 매트릭스 (Initial Risk)',
                            '위험 통제 설계 전 잠재 위험 발생 가능성 및 심각도 분포'
                        )
                    )}
                    {(matrixViewMode === 'residual' || matrixViewMode === 'split') && (
                        renderMatrixGrid(
                            kpiMetrics.residualMatrix || {},
                            '통제 조치 후 잔여 위험 매트릭스 (Residual Risk)',
                            '본질안전·보호수단·안전정보 적용 후 잔여위험 수용성 판정 분포'
                        )
                    )}
                </div>

                {/* Matrix Legend */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '16px',
                    marginTop: '14px',
                    paddingTop: '10px',
                    borderTop: '1px solid #f1f5f9',
                    fontSize: '12px',
                    color: '#64748b'
                }}>
                    <span style={{ fontWeight: 700, color: '#334155' }}>판정 기준:</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', display: 'inline-block' }}></span>
                        <span>수용 가능 (1~4점)</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', display: 'inline-block' }}></span>
                        <span>ALARP (5~9점, 추가저감 권고)</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', display: 'inline-block' }}></span>
                        <span>수용 불가 (10~25점, 필수통제 요구)</span>
                    </span>
                </div>
            </div>

            {/* ================================================================= */}
            {/* 4. Search & Filter Card (ui-ux-guide.md 표준 준수)                */}
            {/* ================================================================= */}
            <div className="card" style={{
                marginBottom: '16px',
                padding: '18px 24px',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px',
                    alignItems: 'flex-end'
                }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                            🔍 검색어
                        </label>
                        <input
                            type="text"
                            placeholder="평가번호, 문서제목, 품목명, 작성자..."
                            value={filters.keyword}
                            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && loadData()}
                            style={{
                                width: '100%',
                                height: '38px',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '13px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                            적용 제품군
                        </label>
                        <select
                            value={filters.targetFamily}
                            onChange={(e) => setFilters(prev => ({ ...prev, targetFamily: e.target.value }))}
                            style={{
                                width: '100%',
                                height: '38px',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '13px',
                                background: '#ffffff',
                                color: '#334155',
                                outline: 'none'
                            }}
                        >
                            <option value="">전체 제품군</option>
                            {TARGET_FAMILIES.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                            위험관리 단계
                        </label>
                        <select
                            value={filters.riskPhase}
                            onChange={(e) => setFilters(prev => ({ ...prev, riskPhase: e.target.value }))}
                            style={{
                                width: '100%',
                                height: '38px',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '13px',
                                background: '#ffffff',
                                color: '#334155',
                                outline: 'none'
                            }}
                        >
                            <option value="">전체 위험단계</option>
                            {RISK_PHASES.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                            진행 상태
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            style={{
                                width: '100%',
                                height: '38px',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '13px',
                                background: '#ffffff',
                                color: '#334155',
                                outline: 'none'
                            }}
                        >
                            <option value="">전체 상태</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label} ({k})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 검색 하단 버튼 바 (ui-ux-guide.md 표준: 초기화 outline 왼쪽, 조회 primary 오른쪽) */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9'
                }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                        총 <strong style={{ color: '#2563eb' }}>{assessments.length}</strong>건의 위험관리 파일이 조회되었습니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setFilters({ keyword: '', targetFamily: '', riskPhase: '', status: '' });
                            }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            ♻️ 초기화
                        </button>
                        <button
                            type="button"
                            onClick={loadData}
                            style={{
                                padding: '8px 22px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#2563eb',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                            }}
                        >
                            🔍 조회
                        </button>
                    </div>
                </div>
            </div>

            {/* ================================================================= */}
            {/* 5. AG Grid Data Table Card (rowHeight={54} 표준)                  */}
            {/* ================================================================= */}
            <div className="card" style={{
                padding: '20px 24px',
                borderRadius: '16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                marginBottom: '16px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px'
                }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#334155' }}>
                        📋 위험관리 파일 목록 (행 더블클릭 또는 'FMEA 분석' 클릭 시 상세 열람)
                    </div>
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#475569',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        엑셀(CSV) 내보내기
                    </button>
                </div>

                <div className="ag-theme-alpine w-full" style={{ height: '520px', width: '100%' }}>
                    <AgGridReact
                        ref={gridRef}
                        theme="legacy"
                        rowData={assessments}
                        columnDefs={columnDefs}
                        defaultColDef={{
                            sortable: true,
                            filter: true,
                            resizable: true
                        }}
                        rowHeight={54}
                        headerHeight={48}
                        pagination={true}
                        paginationPageSize={20}
                        paginationPageSizeSelector={[10, 20, 50, 100]}
                        onRowDoubleClicked={(params) => handleOpenDetailModal(params.data)}
                        overlayLoadingTemplate="<span class='ag-overlay-loading-center'>위험관리 데이터를 불러오는 중입니다...</span>"
                        overlayNoRowsTemplate="<span class='ag-overlay-no-rows-center'>조회된 위험관리 파일이 없습니다.</span>"
                    />
                </div>
            </div>

            {/* ================================================================= */}
            {/* 6. Maximized Modal: Assessment Register / Edit (96vw × 92vh)     */}
            {/* ================================================================= */}
            {isFormOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '96vw',
                        maxWidth: '1680px',
                        height: '92vh',
                        maxHeight: '94vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '16px 24px',
                            backgroundColor: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{isEditing ? '✏️' : '📄'}</span>
                                    <span>{isEditing ? '위험성 평가 파일 수정' : '신규 위험성 평가 파일 등록'}</span>
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                                    ISO 14971:2019 규정에 부합하는 위험관리 파일(RMF) 기본 정보 등록 및 관리
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '26px',
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    cursor: 'pointer'
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveAssessment} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: '16px'
                                }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            평가번호 {isEditing && <span style={{ color: '#dc2626' }}>*</span>}
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="미입력 시 RSK-YYYYMM-XXX 자동생성"
                                            value={formData.assessmentNo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, assessmentNo: e.target.value }))}
                                            disabled={isEditing}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                outline: 'none',
                                                backgroundColor: isEditing ? '#f1f5f9' : '#ffffff'
                                            }}
                                        />
                                        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                                            신규 등록 시 비워두면 시스템이 순번을 자동 부여합니다.
                                        </span>
                                    </div>

                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            평가 문서 제목 <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: 스마트 인슐린 펜 주입기 설계 및 사용 위험성 평가"
                                            value={formData.title}
                                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                            required
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            품목 코드
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: MDP-001"
                                            value={formData.productCode}
                                            onChange={(e) => setFormData(prev => ({ ...prev, productCode: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            대상 품목명 <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: 스마트 인슐린 펜 인젝터"
                                            value={formData.productName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                                            required
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            제품군 구분
                                        </label>
                                        <select
                                            value={formData.targetFamily}
                                            onChange={(e) => setFormData(prev => ({ ...prev, targetFamily: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                background: '#ffffff',
                                                color: '#334155',
                                                outline: 'none'
                                            }}
                                        >
                                            {TARGET_FAMILIES.map(f => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            위험관리 단계
                                        </label>
                                        <select
                                            value={formData.riskPhase}
                                            onChange={(e) => setFormData(prev => ({ ...prev, riskPhase: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                background: '#ffffff',
                                                color: '#334155',
                                                outline: 'none'
                                            }}
                                        >
                                            {RISK_PHASES.map(p => (
                                                <option key={p.value} value={p.value}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            개정판 (Revision Tag)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="1.0"
                                            value={formData.versionTag}
                                            onChange={(e) => setFormData(prev => ({ ...prev, versionTag: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontFamily: 'monospace',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            진행 상태
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                background: '#ffffff',
                                                color: '#334155',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="DRAFT">작성중 (DRAFT)</option>
                                            <option value="REVIEW">검토중 (REVIEW)</option>
                                            <option value="APPROVED">승인완료 (APPROVED)</option>
                                            <option value="OBSOLETE">폐기 (OBSOLETE)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            작성자 (기안자) <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.author}
                                            onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                                            required
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            검토자
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: 김품질 팀장"
                                            value={formData.reviewer}
                                            onChange={(e) => setFormData(prev => ({ ...prev, reviewer: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            승인자 (품질책임자)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: 박대표 대표이사"
                                            value={formData.approver}
                                            onChange={(e) => setFormData(prev => ({ ...prev, approver: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            평가 기준일자
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.assessmentDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, assessmentDate: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            평가 대상 범위 및 제품의 의도된 사용 (Intended Use)
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="예: 본 위험성 평가는 환자 자가 투여용 스마트 인슐린 펜 주입기의 하드웨어 배터리, 모터 제어 SW 및 환자 사용 인터페이스 전반의 잠재 위험을 식별하고 통제 조치의 적절성을 평가함."
                                            value={formData.scopeDescription}
                                            onChange={(e) => setFormData(prev => ({ ...prev, scopeDescription: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                outline: 'none',
                                                resize: 'vertical'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            종합 결론 및 이익-위험 분석 (Benefit-Risk Analysis) 요약
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="예: 식별된 모든 위해요인에 대해 설계적 본질안전 및 보호수단 통제 조치를 완료하였으며, 최종 잔여위험은 당뇨 환자의 정밀 혈당 관리라는 의료적 유익성에 비추어 볼 때 완전히 수용 가능한 수준임."
                                            value={formData.overallConclusion}
                                            onChange={(e) => setFormData(prev => ({ ...prev, overallConclusion: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                outline: 'none',
                                                resize: 'vertical'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer (ui-ux-guide.md 표준: 취소 왼쪽, 저장 오른쪽) */}
                            <div style={{
                                padding: '14px 24px',
                                backgroundColor: '#f8fafc',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '8px',
                                flexShrink: 0
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        color: '#475569',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '8px 22px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                                    }}
                                >
                                    {isEditing ? '변경사항 저장' : '등록 완료'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* 7. Maximized Modal: FMEA Detail & Risk Analysis (96vw × 92vh)    */}
            {/* ================================================================= */}
            {isDetailOpen && currentDetail && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '96vw',
                        maxWidth: '1680px',
                        height: '92vh',
                        maxHeight: '94vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 24px',
                            backgroundColor: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '26px' }}>⚠️</span>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                            [{currentDetail.assessmentNo}] {currentDetail.title}
                                        </h2>
                                        <span style={{
                                            fontSize: '11px',
                                            fontFamily: 'monospace',
                                            backgroundColor: '#eff6ff',
                                            color: '#2563eb',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontWeight: 800,
                                            border: '1px solid #bfdbfe'
                                        }}>
                                            v{currentDetail.versionTag}
                                        </span>
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '2px 10px',
                                            borderRadius: '12px',
                                            fontWeight: 700,
                                            border: '1px solid #cbd5e1',
                                            backgroundColor: '#ffffff',
                                            color: '#475569'
                                        }}>
                                            {currentDetail.status}
                                        </span>
                                    </div>
                                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                                        대상 품목: <strong style={{ color: '#1e293b' }}>{currentDetail.productName}</strong> | 작성: {currentDetail.author} ({currentDetail.assessmentDate}) | 승인: {currentDetail.approver || '미승인'}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsDetailOpen(false)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '26px',
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    cursor: 'pointer'
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Sub Navigation Tabs */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0 24px',
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveDetailTab('hazards')}
                                    style={{
                                        padding: '12px 6px',
                                        border: 'none',
                                        borderBottom: activeDetailTab === 'hazards' ? '3px solid #2563eb' : '3px solid transparent',
                                        backgroundColor: 'transparent',
                                        color: activeDetailTab === 'hazards' ? '#2563eb' : '#64748b',
                                        fontSize: '13px',
                                        fontWeight: activeDetailTab === 'hazards' ? 800 : 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span>📋</span>
                                    <span>FMEA 위해요인 3계층 &amp; 통제조치 목록 ({currentDetail.hazardItems?.length || 0})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveDetailTab('matrix')}
                                    style={{
                                        padding: '12px 6px',
                                        border: 'none',
                                        borderBottom: activeDetailTab === 'matrix' ? '3px solid #2563eb' : '3px solid transparent',
                                        backgroundColor: 'transparent',
                                        color: activeDetailTab === 'matrix' ? '#2563eb' : '#64748b',
                                        fontSize: '13px',
                                        fontWeight: activeDetailTab === 'matrix' ? 800 : 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span>📊</span>
                                    <span>5x5 FMEA 전/후 위험 매트릭스 비교</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveDetailTab('report')}
                                    style={{
                                        padding: '12px 6px',
                                        border: 'none',
                                        borderBottom: activeDetailTab === 'report' ? '3px solid #2563eb' : '3px solid transparent',
                                        backgroundColor: 'transparent',
                                        color: activeDetailTab === 'report' ? '#2563eb' : '#64748b',
                                        fontSize: '13px',
                                        fontWeight: activeDetailTab === 'report' ? 800 : 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span>📑</span>
                                    <span>위험관리 보고서 요약 (RMF Summary) &amp; 승인</span>
                                </button>
                            </div>

                            {activeDetailTab === 'hazards' && (
                                <button
                                    type="button"
                                    onClick={handleOpenAddHazard}
                                    style={{
                                        padding: '7px 16px',
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        color: '#ffffff',
                                        backgroundColor: '#2563eb',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                                    }}
                                >
                                    ➕ 위해요인 항목 추가
                                </button>
                            )}
                        </div>

                        {/* Tab Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', backgroundColor: '#f8fafc' }}>
                            {/* TAB 1: Hazards List Table */}
                            {activeDetailTab === 'hazards' && (
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#f1f5f9', color: '#334155', borderBottom: '1px solid #e2e8f0', fontWeight: 800 }}>
                                                    <th style={{ padding: '12px 10px', width: '70px', textAlign: 'center' }}>번호</th>
                                                    <th style={{ padding: '12px 10px', width: '110px' }}>분류</th>
                                                    <th style={{ padding: '12px 10px', width: '280px' }}>1. 위해요인 (Hazard) / 2. 상황</th>
                                                    <th style={{ padding: '12px 10px', width: '200px' }}>3. 최종 피해 (Harm)</th>
                                                    <th style={{ padding: '12px 10px', width: '120px', textAlign: 'center', backgroundColor: '#fff1f2' }}>초기 위험 (S×P)</th>
                                                    <th style={{ padding: '12px 10px' }}>위험 통제 조치 (Control Measures)</th>
                                                    <th style={{ padding: '12px 10px', width: '120px', textAlign: 'center', backgroundColor: '#f0fdf4' }}>잔여 위험 (S×P)</th>
                                                    <th style={{ padding: '12px 10px', width: '100px', textAlign: 'center' }}>검증 결과</th>
                                                    <th style={{ padding: '12px 10px', width: '110px', textAlign: 'center' }}>관리</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(currentDetail.hazardItems || []).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                                                            등록된 위해요인(Hazard) 항목이 없습니다. 상단의 '+ 위해요인 항목 추가'를 눌러 위험을 등록하세요.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (currentDetail.hazardItems || []).map((h) => {
                                                        const initAcc = getAcceptability(h.initialRiskScore);
                                                        const resAcc = getAcceptability(h.residualRiskScore);
                                                        return (
                                                            <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '12px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#334155' }}>
                                                                    {h.itemNo}
                                                                </td>
                                                                <td style={{ padding: '12px 10px' }}>
                                                                    <span style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '8px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 700,
                                                                        backgroundColor: '#f1f5f9',
                                                                        color: '#475569'
                                                                    }}>
                                                                        {h.category}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '12px 10px' }}>
                                                                    <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{h.hazard}</div>
                                                                    <div style={{ color: '#64748b', fontSize: '11px', lineHeight: '1.4' }}>상황: {h.hazardousSituation}</div>
                                                                </td>
                                                                <td style={{ padding: '12px 10px' }}>
                                                                    <span style={{ color: '#dc2626', fontWeight: 700 }}>{h.harm}</span>
                                                                </td>
                                                                <td style={{ padding: '12px 10px', textAlign: 'center', backgroundColor: '#fff5f5' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                        <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                                                                            S{h.initialSeverity} × P{h.initialProbability} = {h.initialRiskScore}
                                                                        </span>
                                                                        <span style={{
                                                                            display: 'inline-block',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '6px',
                                                                            fontSize: '10px',
                                                                            fontWeight: 800,
                                                                            marginTop: '4px',
                                                                            backgroundColor: initAcc.bg,
                                                                            color: initAcc.color,
                                                                            border: `1px solid ${initAcc.border}`
                                                                        }}>
                                                                            {initAcc.code}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '12px 10px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                                        <span style={{
                                                                            fontSize: '10px',
                                                                            fontWeight: 800,
                                                                            padding: '2px 6px',
                                                                            borderRadius: '6px',
                                                                            backgroundColor: '#eff6ff',
                                                                            color: '#2563eb'
                                                                        }}>
                                                                            {h.controlCategory === 'INHERENT_SAFETY' ? '1순위 본질안전' : h.controlCategory === 'PROTECTIVE_MEASURES' ? '2순위 보호수단' : '3순위 정보제공'}
                                                                        </span>
                                                                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>상태: {h.controlStatus}</span>
                                                                    </div>
                                                                    <p style={{ margin: 0, color: '#334155', fontSize: '12px', lineHeight: '1.4' }}>{h.controlMeasures}</p>
                                                                    {h.verificationMethod && (
                                                                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '11px' }}>검증: {h.verificationMethod}</p>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '12px 10px', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                        <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                                                                            S{h.residualSeverity} × P{h.residualProbability} = {h.residualRiskScore}
                                                                        </span>
                                                                        <span style={{
                                                                            display: 'inline-block',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '6px',
                                                                            fontSize: '10px',
                                                                            fontWeight: 800,
                                                                            marginTop: '4px',
                                                                            backgroundColor: resAcc.bg,
                                                                            color: resAcc.color,
                                                                            border: `1px solid ${resAcc.border}`
                                                                        }}>
                                                                            {resAcc.code}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                                    <span style={{
                                                                        padding: '2px 8px',
                                                                        borderRadius: '8px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 800,
                                                                        backgroundColor: h.verificationResult === 'PASS' ? '#ecfdf5' : '#fffbeb',
                                                                        color: h.verificationResult === 'PASS' ? '#059669' : '#d97706',
                                                                        border: `1px solid ${h.verificationResult === 'PASS' ? '#a7f3d0' : '#fde68a'}`
                                                                    }}>
                                                                        {h.verificationResult || 'PASS'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenEditHazard(h)}
                                                                            style={{
                                                                                padding: '4px 8px',
                                                                                fontSize: '11px',
                                                                                fontWeight: 700,
                                                                                color: '#2563eb',
                                                                                backgroundColor: '#eff6ff',
                                                                                border: '1px solid #bfdbfe',
                                                                                borderRadius: '6px',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            수정
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteHazard(h.id, h.itemNo)}
                                                                            style={{
                                                                                padding: '4px 8px',
                                                                                fontSize: '11px',
                                                                                fontWeight: 700,
                                                                                color: '#dc2626',
                                                                                backgroundColor: '#fef2f2',
                                                                                border: '1px solid #fca5a5',
                                                                                borderRadius: '6px',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            삭제
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: 5x5 Matrix Comparison */}
                            {activeDetailTab === 'matrix' && (
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    padding: '20px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                                        [{currentDetail.assessmentNo}] 본 문서 위해요인 5x5 전/후 이동 매트릭스
                                    </h3>
                                    <p style={{ margin: '4px 0 16px', fontSize: '12px', color: '#64748b' }}>
                                        본 위험관리 파일에 포함된 {currentDetail.hazardItems?.length || 0}건의 위해요인이 통제 조치를 통해 안전한 수용 영역으로 전이되었음을 시각적으로 증빙합니다.
                                    </p>

                                    {(() => {
                                        const itemInitial = {};
                                        const itemResidual = {};
                                        for (let s = 1; s <= 5; s++) {
                                            for (let p = 1; p <= 5; p++) {
                                                itemInitial[`S${s}_P${p}`] = 0;
                                                itemResidual[`S${s}_P${p}`] = 0;
                                            }
                                        }
                                        (currentDetail.hazardItems || []).forEach(it => {
                                            if (it.initialSeverity && it.initialProbability) {
                                                itemInitial[`S${it.initialSeverity}_P${it.initialProbability}`] = (itemInitial[`S${it.initialSeverity}_P${it.initialProbability}`] || 0) + 1;
                                            }
                                            if (it.residualSeverity && it.residualProbability) {
                                                itemResidual[`S${it.residualSeverity}_P${it.residualProbability}`] = (itemResidual[`S${it.residualSeverity}_P${it.residualProbability}`] || 0) + 1;
                                            }
                                        });

                                        return (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                                {renderMatrixGrid(itemInitial, '통제 조치 전 초기 위험 (Initial)', '위험 통제 조치 적용 전 FMEA 점수')}
                                                {renderMatrixGrid(itemResidual, '통제 조치 후 잔여 위험 (Residual)', '설계 및 보호수단 적용 후 최종 잔여위험')}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* TAB 3: Report Summary & Approval */}
                            {activeDetailTab === 'report' && (
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    padding: '24px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingBottom: '16px',
                                        borderBottom: '1px solid #e2e8f0'
                                    }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                                위험관리 파일 종합 보고서 (Risk Management File Summary)
                                            </h3>
                                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                                                ISO 14971:2019 및 ISO 13485:2016 규정 준수 검증
                                            </p>
                                        </div>
                                        <span style={{
                                            fontSize: '12px',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontWeight: 800,
                                            backgroundColor: '#eff6ff',
                                            color: '#2563eb',
                                            border: '1px solid #bfdbfe'
                                        }}>
                                            문서번호: {currentDetail.assessmentNo}
                                        </span>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                                        gap: '20px',
                                        fontSize: '12px'
                                    }}>
                                        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <h4 style={{ margin: '0 0 10px', fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>1. 기본 개요 및 평가 범위</h4>
                                            <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b' }}>평가명:</span> <strong style={{ color: '#0f172a' }}>{currentDetail.title}</strong></p>
                                            <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b' }}>대상 품목:</span> <strong style={{ color: '#0f172a' }}>{currentDetail.productName} ({currentDetail.productCode || '-'})</strong></p>
                                            <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b' }}>위험관리 단계:</span> {currentDetail.riskPhase} | 제품군: {currentDetail.targetFamily}</p>
                                            <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b' }}>평가일자:</span> {currentDetail.assessmentDate} | 개정판: v{currentDetail.versionTag}</p>
                                            <div style={{ marginTop: '10px', backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#475569', lineHeight: '1.5' }}>
                                                {currentDetail.scopeDescription || '의도된 사용 범위 설명이 등록되어 있지 않습니다.'}
                                            </div>
                                        </div>

                                        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <h4 style={{ margin: '0 0 10px', fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>2. 위해요인 식별 및 통제 통계</h4>
                                            <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b' }}>식별된 위해요인:</span> <strong style={{ color: '#2563eb' }}>{currentDetail.hazardCount || 0}건</strong></p>
                                            <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b' }}>초기 수용불가 위험:</span> <strong style={{ color: '#dc2626' }}>{currentDetail.unacceptableCount || 0}건</strong></p>
                                            <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b' }}>잔여 수용불가 위험:</span> <strong style={{ color: '#059669' }}>{currentDetail.residualUnacceptableCount || 0}건 (0건 달성)</strong></p>
                                            <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b' }}>종합 수용성 판정:</span> <strong style={{ color: '#059669' }}>{currentDetail.overallResidualRiskAcceptable ? '수용 가능 (ACCEPTABLE)' : '조치 필요'}</strong></p>
                                            <div style={{ marginTop: '10px', backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#475569', lineHeight: '1.5' }}>
                                                {currentDetail.overallConclusion || '종합 결론 요약이 등록되어 있지 않습니다.'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Electronic Signature / Approval Section */}
                                    <div style={{
                                        paddingTop: '16px',
                                        borderTop: '1px solid #e2e8f0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            {currentDetail.status === 'APPROVED' ? (
                                                <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>✅</span> 본 문서는 {currentDetail.approver}에 의해 {currentDetail.approvalDate}부로 최종 전자 승인되었습니다.
                                                </span>
                                            ) : (
                                                <span style={{ color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>⏳</span> 품질책임자의 최종 승인 결재 대기 중인 문서입니다.
                                                </span>
                                            )}
                                        </div>

                                        {currentDetail.status !== 'APPROVED' && (
                                            <button
                                                type="button"
                                                onClick={() => handleApprove(currentDetail.id, currentDetail.assessmentNo)}
                                                style={{
                                                    padding: '9px 20px',
                                                    fontSize: '12px',
                                                    fontWeight: 800,
                                                    color: '#ffffff',
                                                    backgroundColor: '#059669',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                                                }}
                                            >
                                                <span>✍️</span>
                                                <span>전자서명 및 최종 승인 (Approve)</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer (ui-ux-guide.md 표준) */}
                        <div style={{
                            padding: '14px 24px',
                            backgroundColor: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '8px',
                            flexShrink: 0
                        }}>
                            <button
                                type="button"
                                onClick={() => setIsDetailOpen(false)}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#475569',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* 8. Maximized Modal: Hazard Item Register / Edit (96vw × 92vh)     */}
            {/* ================================================================= */}
            {isHazardModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '96vw',
                        maxWidth: '1680px',
                        height: '92vh',
                        maxHeight: '94vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 24px',
                            backgroundColor: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⚠️</span>
                                    <span>{editingHazard ? '위해요인(Hazard) 및 FMEA 통제 조치 수정' : '신규 위해요인(Hazard) 및 FMEA 통제 조치 등록'}</span>
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                                    ISO 14971:2019 위해요인 3계층 식별(Hazard-Situation-Harm) 및 통제우선순위 조치
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsHazardModalOpen(false)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '26px',
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    cursor: 'pointer'
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSaveHazard} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                
                                {/* Section 1: Classification & 3-Tier Model */}
                                <div style={{
                                    backgroundColor: '#eff6ff',
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    border: '1px solid #bfdbfe',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🔍</span>
                                        <span>1. 위험 분류 및 위해요인 3계층 식별 모델</span>
                                    </h3>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                        gap: '14px'
                                    }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                항목 식별 번호
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="미입력 시 HAZ-XXX 자동부여"
                                                value={hazardForm.itemNo}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, itemNo: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    fontFamily: 'monospace',
                                                    outline: 'none',
                                                    backgroundColor: '#ffffff'
                                                }}
                                            />
                                        </div>

                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                위험 분류 카테고리 <span style={{ color: '#dc2626' }}>*</span>
                                            </label>
                                            <select
                                                value={hazardForm.category}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, category: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    background: '#ffffff',
                                                    color: '#334155',
                                                    outline: 'none'
                                                }}
                                            >
                                                {HAZARD_CATEGORIES.map(c => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                        gap: '14px'
                                    }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                1단계: 위해요인 (Hazard - 잠재적 위해의 근원) <span style={{ color: '#dc2626' }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="예: 리튬이온 배터리 과충전 및 단락 발열"
                                                value={hazardForm.hazard}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, hazard: e.target.value }))}
                                                required
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                    backgroundColor: '#ffffff'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                2단계: 위해상황 (Hazardous Situation) <span style={{ color: '#dc2626' }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="예: 충전 중 기기 외장 온도 55°C 초과하여 환자 접촉"
                                                value={hazardForm.hazardousSituation}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, hazardousSituation: e.target.value }))}
                                                required
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                    backgroundColor: '#ffffff'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                3단계: 피해 (Harm - 인체 상해/건강 손상) <span style={{ color: '#dc2626' }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="예: 피부 접촉 환자의 2도 열상 및 제품 외장 파손"
                                                value={hazardForm.harm}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, harm: e.target.value }))}
                                                required
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    color: '#dc2626',
                                                    outline: 'none',
                                                    backgroundColor: '#ffffff'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Initial Risk Evaluation */}
                                <div style={{
                                    backgroundColor: '#fff1f2',
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    border: '1px solid #fecdd3',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#9f1239', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>⚡</span>
                                            <span>2. 통제 전 초기 위험 평가 (Initial Risk Evaluation)</span>
                                        </h3>
                                        {(() => {
                                            const score = hazardForm.initialSeverity * hazardForm.initialProbability;
                                            const acc = getAcceptability(score);
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>초기 점수:</span>
                                                    <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>{score}점</span>
                                                    <span style={{
                                                        padding: '3px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        backgroundColor: acc.bg,
                                                        color: acc.color,
                                                        border: `1px solid ${acc.border}`
                                                    }}>
                                                        {acc.label}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                        gap: '14px'
                                    }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                초기 심각도 (Severity S1 ~ S5)
                                            </label>
                                            <select
                                                value={hazardForm.initialSeverity}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, initialSeverity: Number(e.target.value) }))}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    background: '#ffffff',
                                                    color: '#334155',
                                                    outline: 'none'
                                                }}
                                            >
                                                {SEVERITY_LEVELS.map(l => (
                                                    <option key={l.score} value={l.score}>{l.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                초기 발생확률 (Probability P1 ~ P5)
                                            </label>
                                            <select
                                                value={hazardForm.initialProbability}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, initialProbability: Number(e.target.value) }))}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    background: '#ffffff',
                                                    color: '#334155',
                                                    outline: 'none'
                                                }}
                                            >
                                                {PROBABILITY_LEVELS.map(l => (
                                                    <option key={l.score} value={l.score}>{l.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Risk Control Measures */}
                                <div style={{
                                    backgroundColor: '#fffbeb',
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    border: '1px solid #fde68a',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🛡️</span>
                                        <span>3. 위험 통제 조치 (Risk Control Measures - 3대 우선순위)</span>
                                    </h3>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                        gap: '14px'
                                    }}>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                통제 조치 우선순위 구분 <span style={{ color: '#dc2626' }}>*</span>
                                            </label>
                                            <select
                                                value={hazardForm.controlCategory}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, controlCategory: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    background: '#ffffff',
                                                    color: '#334155',
                                                    outline: 'none'
                                                }}
                                            >
                                                {CONTROL_CATEGORIES.map(c => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                조치 진행 상태
                                            </label>
                                            <select
                                                value={hazardForm.controlStatus}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, controlStatus: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    background: '#ffffff',
                                                    color: '#334155',
                                                    outline: 'none'
                                                }}
                                            >
                                                <option value="COMPLETED">조치 완료 (COMPLETED)</option>
                                                <option value="VERIFIED">검증 완료 (VERIFIED)</option>
                                                <option value="IN_PROGRESS">진행중 (IN_PROGRESS)</option>
                                                <option value="PENDING">대기 (PENDING)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            통제 조치 상세 내용 <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="예: PCM 보호회로 이중화 설계 및 PTC 서미스터 45°C 도달 시 하드웨어 자동 전원 차단 회로 적용"
                                            value={hazardForm.controlMeasures}
                                            onChange={(e) => setHazardForm(prev => ({ ...prev, controlMeasures: e.target.value }))}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                outline: 'none',
                                                backgroundColor: '#ffffff',
                                                resize: 'vertical'
                                            }}
                                        />
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                        gap: '14px'
                                    }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                통제 효과 검증 방법
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="예: IEC 60601-1 발열 시험 성적서, IEC 62304 정적분석"
                                                value={hazardForm.verificationMethod}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, verificationMethod: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                    backgroundColor: '#ffffff'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                검증 결과 판정
                                            </label>
                                            <select
                                                value={hazardForm.verificationResult}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, verificationResult: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    background: '#ffffff',
                                                    color: '#334155',
                                                    outline: 'none'
                                                }}
                                            >
                                                <option value="PASS">적합 (PASS)</option>
                                                <option value="CONDITIONAL">조건부 적합 (CONDITIONAL)</option>
                                                <option value="FAIL">부적합 (FAIL)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: Residual Risk Evaluation */}
                                <div style={{
                                    backgroundColor: '#ecfdf5',
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    border: '1px solid #a7f3d0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>✅</span>
                                            <span>4. 통제 후 잔여 위험 평가 (Residual Risk Evaluation)</span>
                                        </h3>
                                        {(() => {
                                            const score = hazardForm.residualSeverity * hazardForm.residualProbability;
                                            const acc = getAcceptability(score);
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>잔여 점수:</span>
                                                    <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>{score}점</span>
                                                    <span style={{
                                                        padding: '3px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        backgroundColor: acc.bg,
                                                        color: acc.color,
                                                        border: `1px solid ${acc.border}`
                                                    }}>
                                                        {acc.label}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                        gap: '14px'
                                    }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                잔여 심각도 (Residual Severity S1 ~ S5)
                                            </label>
                                            <select
                                                value={hazardForm.residualSeverity}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, residualSeverity: Number(e.target.value) }))}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    background: '#ffffff',
                                                    color: '#334155',
                                                    outline: 'none'
                                                }}
                                            >
                                                {SEVERITY_LEVELS.map(l => (
                                                    <option key={l.score} value={l.score}>{l.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                잔여 발생확률 (Residual Probability P1 ~ P5)
                                            </label>
                                            <select
                                                value={hazardForm.residualProbability}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, residualProbability: Number(e.target.value) }))}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    background: '#ffffff',
                                                    color: '#334155',
                                                    outline: 'none'
                                                }}
                                            >
                                                {PROBABILITY_LEVELS.map(l => (
                                                    <option key={l.score} value={l.score}>{l.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 5: Benefit-Risk & Remarks */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            id="benefitRiskNeeded"
                                            checked={hazardForm.benefitRiskNeeded}
                                            onChange={(e) => setHazardForm(prev => ({ ...prev, benefitRiskNeeded: e.target.checked }))}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="benefitRiskNeeded" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                                            이익-위험 분석(Benefit-Risk Analysis) 필요 여부 (잔여위험이 ALARP/UNACCEPTABLE인 경우 권장)
                                        </label>
                                    </div>

                                    {hazardForm.benefitRiskNeeded && (
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                                이익-위험 분석 요약
                                            </label>
                                            <textarea
                                                rows={2}
                                                placeholder="임상적 효용성 대비 잔여위험의 수용 타당성을 기재합니다."
                                                value={hazardForm.benefitRiskSummary}
                                                onChange={(e) => setHazardForm(prev => ({ ...prev, benefitRiskSummary: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                    backgroundColor: '#ffffff',
                                                    resize: 'vertical'
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            비고 및 참고 문서
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: 공인시험기관 성적서 확보, KTR 시험성적서 첨부"
                                            value={hazardForm.remarks}
                                            onChange={(e) => setHazardForm(prev => ({ ...prev, remarks: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                outline: 'none',
                                                backgroundColor: '#ffffff'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer (ui-ux-guide.md 표준: 취소 왼쪽, 저장 오른쪽) */}
                            <div style={{
                                padding: '14px 24px',
                                backgroundColor: '#f8fafc',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '8px',
                                flexShrink: 0
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setIsHazardModalOpen(false)}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        color: '#475569',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '8px 22px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                                    }}
                                >
                                    {editingHazard ? '위해요인 수정 저장' : '위해요인 등록 완료'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
