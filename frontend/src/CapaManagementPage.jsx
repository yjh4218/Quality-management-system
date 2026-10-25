import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner.jsx';
import {
    fetchCapaKpis,
    fetchCapas,
    fetchCapaById,
    createCapa,
    recordCapaRootCause,
    addCapaActionItem,
    updateCapaActionItem,
    verifyCapaActionItem,
    deleteCapaActionItem,
    evaluateCapaEffectiveness,
    closeCapa,
    voidCapa
} from './api.jsx';

// 5대 품질 소스 옵션
const SOURCE_TYPE_OPTIONS = [
    { value: '', label: '전체 소스' },
    { value: 'COMPLAINT_SAFETY', label: '고객 불만 / 이상사례 (15단계)' },
    { value: 'NCR', label: '부적합품 보고서 NCR (14단계)' },
    { value: 'SUPPLIER_AUDIT', label: '공급업체 / 제조사 심사 (12단계)' },
    { value: 'CHANGE_CONTROL', label: '변경관리 (11단계)' },
    { value: 'INTERNAL_AUDIT', label: '내부감사 / 자체점검' },
    { value: 'INSPECTION_DEFECT', label: '품질 검사 일탈' },
    { value: 'REGULATORY_FINDING', label: '규제기관 지적사항' },
    { value: 'AD_HOC', label: '자체 발굴 / 상시 개선' }
];

// 상태 옵션
const STATUS_OPTIONS = [
    { value: '', label: '전체 상태' },
    { value: 'INITIATED', label: '발의 / 접수', color: '#3b82f6' },
    { value: 'UNDER_INVESTIGATION', label: '원인조사 중', color: '#8b5cf6' },
    { value: 'ACTION_PLANNING', label: '조치계획 수립', color: '#f59e0b' },
    { value: 'IMPLEMENTATION', label: '조치 실행 중', color: '#06b6d4' },
    { value: 'EFFECTIVENESS_REVIEW', label: '효과성 검증 중', color: '#ec4899' },
    { value: 'CLOSED', label: '공식 종결', color: '#10b981' },
    { value: 'VOID', label: '무효화', color: '#64748b' }
];

// 위험도 옵션
const RISK_OPTIONS = [
    { value: '', label: '전체 위험도' },
    { value: 'CRITICAL', label: '치명적 (Critical)', color: '#ef4444' },
    { value: 'HIGH', label: '높음 (High)', color: '#f97316' },
    { value: 'MEDIUM', label: '보통 (Medium)', color: '#eab308' },
    { value: 'LOW', label: '낮음 (Low)', color: '#3b82f6' }
];

// 카테고리 옵션
const CATEGORY_OPTIONS = [
    { value: '', label: '전체 카테고리' },
    { value: 'PRODUCT_QUALITY', label: '완제품 품질' },
    { value: 'PACKAGING', label: '용기 / 포장재 / 표시기재' },
    { value: 'PROCESS_CONTROL', label: '제조 공정 제어' },
    { value: 'EQUIPMENT_FACILITY', label: '설비 / 장비 / 교정' },
    { value: 'RAW_MATERIAL', label: '원료 / 부자재' },
    { value: 'COMPLIANCE', label: '규제 / 표준 / 인허가' },
    { value: 'DOCUMENTATION', label: '품질 문서 / 기록 관리' },
    { value: 'ENVIRONMENT_CLEANROOM', label: '환경 모니터링 / 클린룸' }
];

export default function CapaManagementPage({ user, onNavigate }) {
    // 탭 상태 (1: 전체, 2: 조치실행중, 3: 효과성검증대기, 4: 기한초과지연, 5: 5대소스별)
    const [activeTab, setActiveTab] = useState('ALL');

    // KPI 상태
    const [kpis, setKpis] = useState({
        totalCapas: 0,
        inProgressCapas: 0,
        pendingEffectivenessCapas: 0,
        overdueCapas: 0,
        criticalOrHighRiskCapas: 0,
        closedEffectiveCapas: 0,
        closureEffectivenessRate: 0.0
    });

    // 목록 및 로딩 상태
    const [capaList, setCapaList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalElements, setTotalElements] = useState(0);

    // 검색 필터 상태
    const [searchFilter, setSearchFilter] = useState({
        keyword: '',
        sourceType: '',
        status: '',
        category: '',
        riskLevel: '',
        assignedTo: '',
        overdueOnly: false,
        startDate: '',
        endDate: '',
        page: 0,
        size: 50
    });

    // 모달 상태 (5종)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRootCauseModalOpen, setIsRootCauseModalOpen] = useState(false);
    const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
    const [isEffectivenessModalOpen, setIsEffectivenessModalOpen] = useState(false);
    const [isAuditReportModalOpen, setIsAuditReportModalOpen] = useState(false);

    // 선택된 CAPA 상세 데이터
    const [selectedCapa, setSelectedCapa] = useState(null);

    // 모달 폼 데이터
    const [createForm, setCreateForm] = useState({
        title: '',
        sourceType: 'COMPLAINT_SAFETY',
        sourceId: null,
        sourceNumber: '',
        sourceDescription: '',
        category: 'PRODUCT_QUALITY',
        riskLevel: 'HIGH',
        problemDescription: '',
        containmentAction: '',
        containmentDate: new Date().toISOString().split('T')[0],
        containmentResponsible: user?.name || '',
        itemCode: '',
        productName: '',
        lotNumber: '',
        isLotUnknown: false,
        assignedTo: user?.name || '',
        targetCompletionDate: '',
        effectivenessCriteria: '',
        effectivenessTargetDate: ''
    });

    const [rootCauseForm, setRootCauseForm] = useState({
        rootCauseAnalysis: '',
        why1: '',
        why2: '',
        why3: '',
        why4: '',
        why5: '',
        fishboneMan: '',
        fishboneMachine: '',
        fishboneMaterial: '',
        fishboneMethod: '',
        fishboneMeasurement: '',
        fishboneEnvironment: ''
    });

    const [actionItemForm, setActionItemForm] = useState({
        actionType: 'CORRECTIVE',
        title: '',
        description: '',
        assignedTo: '',
        targetDate: ''
    });

    const [effectivenessForm, setEffectivenessForm] = useState({
        effectivenessResult: 'EFFECTIVE',
        effectivenessEvidence: '',
        followUpActionRequired: false,
        closureComment: ''
    });

    const gridRef = useRef(null);

    // 데이터 조회 (KPI & 목록)
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const kpiData = await fetchCapaKpis();
            setKpis(kpiData || {});

            const params = {
                keyword: searchFilter.keyword || undefined,
                sourceType: searchFilter.sourceType || undefined,
                status: searchFilter.status || undefined,
                category: searchFilter.category || undefined,
                riskLevel: searchFilter.riskLevel || undefined,
                assignedTo: searchFilter.assignedTo || undefined,
                overdueOnly: searchFilter.overdueOnly ? true : undefined,
                startDate: searchFilter.startDate || undefined,
                endDate: searchFilter.endDate || undefined,
                page: searchFilter.page,
                size: searchFilter.size
            };

            // 탭별 자동 필터링 파라미터 보정
            if (activeTab === 'IN_PROGRESS') {
                params.status = 'IMPLEMENTATION';
            } else if (activeTab === 'PENDING_EFF') {
                params.status = 'EFFECTIVENESS_REVIEW';
            } else if (activeTab === 'OVERDUE') {
                params.overdueOnly = true;
            }

            const pageData = await fetchCapas(params);
            setCapaList(pageData.content || []);
            setTotalElements(pageData.totalElements || 0);
        } catch (err) {
            console.error('Failed to load CAPA data:', err);
            toast.error('CAPA 데이터를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [searchFilter, activeTab]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 필터 초기화
    const handleResetFilter = () => {
        setSearchFilter({
            keyword: '',
            sourceType: '',
            status: '',
            category: '',
            riskLevel: '',
            assignedTo: '',
            overdueOnly: false,
            startDate: '',
            endDate: '',
            page: 0,
            size: 50
        });
        setActiveTab('ALL');
    };

    // CSV 내보내기
    const handleExportCsv = () => {
        if (gridRef.current?.api) {
            gridRef.current.api.exportDataAsCsv({
                fileName: `QMS_CAPA_Management_${new Date().toISOString().slice(0, 10)}.csv`
            });
        }
    };

    // 모달 열기 핸들러
    const handleOpenCreateModal = () => {
        setCreateForm({
            title: '',
            sourceType: 'COMPLAINT_SAFETY',
            sourceId: null,
            sourceNumber: '',
            sourceDescription: '',
            category: 'PRODUCT_QUALITY',
            riskLevel: 'HIGH',
            problemDescription: '',
            containmentAction: '',
            containmentDate: new Date().toISOString().split('T')[0],
            containmentResponsible: user?.name || '',
            itemCode: '',
            productName: '',
            lotNumber: '',
            isLotUnknown: false,
            assignedTo: user?.name || '',
            targetCompletionDate: '',
            effectivenessCriteria: '',
            effectivenessTargetDate: ''
        });
        setIsCreateModalOpen(true);
    };

    const handleOpenRootCauseModal = (capa) => {
        setSelectedCapa(capa);
        setRootCauseForm({
            rootCauseAnalysis: capa.rootCauseAnalysis || '',
            why1: capa.why1 || '',
            why2: capa.why2 || '',
            why3: capa.why3 || '',
            why4: capa.why4 || '',
            why5: capa.why5 || '',
            fishboneMan: capa.fishboneMan || '',
            fishboneMachine: capa.fishboneMachine || '',
            fishboneMaterial: capa.fishboneMaterial || '',
            fishboneMethod: capa.fishboneMethod || '',
            fishboneMeasurement: capa.fishboneMeasurement || '',
            fishboneEnvironment: capa.fishboneEnvironment || ''
        });
        setIsRootCauseModalOpen(true);
    };

    const handleOpenActionsModal = async (capa) => {
        try {
            const detail = await fetchCapaById(capa.id);
            setSelectedCapa(detail);
            setActionItemForm({
                actionType: 'CORRECTIVE',
                title: '',
                description: '',
                assignedTo: user?.name || '',
                targetDate: ''
            });
            setIsActionsModalOpen(true);
        } catch (err) {
            toast.error('CAPA 상세 조치과제를 불러오지 못했습니다.');
        }
    };

    const handleOpenEffectivenessModal = (capa) => {
        setSelectedCapa(capa);
        setEffectivenessForm({
            effectivenessResult: capa.effectivenessResult || 'EFFECTIVE',
            effectivenessEvidence: capa.effectivenessEvidence || '',
            followUpActionRequired: capa.followUpActionRequired || false,
            closureComment: capa.closureComment || ''
        });
        setIsEffectivenessModalOpen(true);
    };

    const handleOpenAuditReportModal = async (capa) => {
        try {
            const detail = await fetchCapaById(capa.id);
            setSelectedCapa(detail);
            setIsAuditReportModalOpen(true);
        } catch (err) {
            toast.error('감사 리포트용 상세 데이터를 불러오지 못했습니다.');
        }
    };

    // 신규 발의 제출
    const handleSubmitCreate = async (e) => {
        e.preventDefault();
        if (!createForm.title || !createForm.problemDescription || !createForm.assignedTo || !createForm.targetCompletionDate) {
            toast.warning('필수 입력 항목(제목, 문제설명, 담당자, 완료목표일)을 작성해 주십시오.');
            return;
        }

        try {
            await createCapa(createForm);
            toast.success('신규 CAPA가 성공적으로 발의되었습니다.');
            setIsCreateModalOpen(false);
            loadData();
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || 'CAPA 발의에 실패했습니다.');
        }
    };

    // 근본원인 분석 저장
    const handleSubmitRootCause = async (e) => {
        e.preventDefault();
        if (!rootCauseForm.rootCauseAnalysis) {
            toast.warning('근본원인 종합 분석 내용은 필수입니다.');
            return;
        }

        try {
            await recordCapaRootCause(selectedCapa.id, rootCauseForm);
            toast.success('근본원인 분석(5-Why & Fishbone)이 저장되었습니다.');
            setIsRootCauseModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err?.response?.data?.message || '근본원인 저장에 실패했습니다.');
        }
    };

    // 조치과제 추가
    const handleAddAction = async (e) => {
        e.preventDefault();
        if (!actionItemForm.title || !actionItemForm.description || !actionItemForm.assignedTo || !actionItemForm.targetDate) {
            toast.warning('조치과제 필수 입력 항목을 채워주십시오.');
            return;
        }

        try {
            await addCapaActionItem(selectedCapa.id, actionItemForm);
            toast.success('새 조치과제가 추가되었습니다.');
            const updated = await fetchCapaById(selectedCapa.id);
            setSelectedCapa(updated);
            setActionItemForm({
                actionType: 'CORRECTIVE',
                title: '',
                description: '',
                assignedTo: user?.name || '',
                targetDate: ''
            });
            loadData();
        } catch (err) {
            toast.error(err?.response?.data?.message || '조치과제 추가에 실패했습니다.');
        }
    };

    // 조치과제 완료 검증
    const handleVerifyAction = async (itemId) => {
        const notes = window.prompt('조치 완료 검증 의견을 입력하십시오 (선택사항):');
        if (notes === null) return;

        try {
            await verifyCapaActionItem(itemId, user?.name, notes);
            toast.success('조치과제가 완료 및 검증되었습니다.');
            const updated = await fetchCapaById(selectedCapa.id);
            setSelectedCapa(updated);
            loadData();
        } catch (err) {
            toast.error(err?.response?.data?.message || '조치과제 검증 실패');
        }
    };

    // 조치과제 삭제
    const handleDeleteAction = async (itemId) => {
        if (!window.confirm('해당 조치과제를 삭제하시겠습니까?')) return;
        try {
            await deleteCapaActionItem(itemId);
            toast.info('조치과제가 삭제되었습니다.');
            const updated = await fetchCapaById(selectedCapa.id);
            setSelectedCapa(updated);
            loadData();
        } catch (err) {
            toast.error(err?.response?.data?.message || '조치과제 삭제 실패');
        }
    };

    // 효과성 검증 수행
    const handleSubmitEffectiveness = async (e) => {
        e.preventDefault();
        if (!effectivenessForm.effectivenessEvidence) {
            toast.warning('효과성을 입증할 객관적 데이터 및 증거는 필수입니다.');
            return;
        }

        try {
            await evaluateCapaEffectiveness(selectedCapa.id, {
                effectivenessResult: effectivenessForm.effectivenessResult,
                effectivenessEvidence: effectivenessForm.effectivenessEvidence,
                followUpActionRequired: effectivenessForm.followUpActionRequired
            });
            toast.success('효과성 검증이 완료되었습니다.');
            setIsEffectivenessModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err?.response?.data?.message || '효과성 검증 실패');
        }
    };

    // 공식 최종 종결
    const handleCloseCapa = async () => {
        if (!effectivenessForm.closureComment) {
            toast.warning('최종 종결 검토 의견을 입력해주십시오.');
            return;
        }

        try {
            await closeCapa(selectedCapa.id, {
                closureComment: effectivenessForm.closureComment
            });
            toast.success('CAPA가 성공적으로 공식 종결되었습니다.');
            setIsEffectivenessModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'CAPA 종결 실패 (미완료 과제 또는 효과성 미흡)');
        }
    };

    // AG Grid 컬럼 정의
    const columnDefs = useMemo(() => [
        {
            headerName: 'CAPA 번호',
            field: 'capaNumber',
            width: 160,
            pinned: 'left',
            cellRenderer: params => (
                <span 
                    style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => handleOpenAuditReportModal(params.data)}
                >
                    {params.value}
                </span>
            )
        },
        {
            headerName: '제목 / 문제 현상',
            field: 'title',
            flex: 2,
            minWidth: 260,
            cellRenderer: params => (
                <div style={{ lineHeight: '18px', padding: '6px 0' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{params.value}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {params.data.problemDescription}
                    </div>
                </div>
            )
        },
        {
            headerName: '발의 소스',
            field: 'sourceTypeDescription',
            width: 170,
            cellRenderer: params => (
                <div style={{ fontSize: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#475569' }}>{params.value}</div>
                    {params.data.sourceNumber && (
                        <div style={{ fontSize: '11px', color: '#0284c7' }}>{params.data.sourceNumber}</div>
                    )}
                </div>
            )
        },
        {
            headerName: '위험도',
            field: 'riskLevel',
            width: 120,
            cellRenderer: params => {
                const color = params.data.riskLevelColor || '#64748b';
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: `${color}18`,
                        color: color,
                        border: `1px solid ${color}40`
                    }}>
                        {params.data.riskLevelDescription || params.value}
                    </span>
                );
            }
        },
        {
            headerName: '진행 상태',
            field: 'status',
            width: 130,
            cellRenderer: params => {
                const color = params.data.statusColor || '#64748b';
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: `${color}18`,
                        color: color,
                        border: `1px solid ${color}40`
                    }}>
                        {params.data.statusDescription || params.value}
                    </span>
                );
            }
        },
        {
            headerName: '조치과제 진행',
            field: 'actionItemCount',
            width: 120,
            cellRenderer: params => (
                <div style={{ fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ color: '#10b981' }}>{params.data.completedActionItemCount}</span>
                    <span style={{ color: '#94a3b8' }}> / </span>
                    <span style={{ color: '#1e293b' }}>{params.value} 건</span>
                </div>
            )
        },
        {
            headerName: '효과성 판정',
            field: 'effectivenessResultDescription',
            width: 140,
            cellRenderer: params => {
                const color = params.data.effectivenessResultColor || '#94a3b8';
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: `${color}18`,
                        color: color
                    }}>
                        {params.value || '미평가'}
                    </span>
                );
            }
        },
        {
            headerName: '담당자',
            field: 'assignedTo',
            width: 110,
            cellStyle: { fontWeight: 500 }
        },
        {
            headerName: '목표 완료일',
            field: 'targetCompletionDate',
            width: 120,
            cellRenderer: params => {
                const isOverdue = params.data.isOverdue;
                return (
                    <span style={{
                        color: isOverdue ? '#ef4444' : '#1e293b',
                        fontWeight: isOverdue ? 700 : 500
                    }}>
                        {params.value}
                        {isOverdue && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#ef4444' }}>⚠️지연</span>}
                    </span>
                );
            }
        },
        {
            headerName: '관리 액션',
            pinned: 'right',
            width: 240,
            cellRenderer: params => {
                const capa = params.data;
                const isClosed = capa.status === 'CLOSED' || capa.status === 'VOID';
                return (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                        <button
                            onClick={() => handleOpenRootCauseModal(capa)}
                            disabled={isClosed}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '4px',
                                border: '1px solid #8b5cf6',
                                background: isClosed ? '#f1f5f9' : '#f5f3ff',
                                color: isClosed ? '#94a3b8' : '#7c3aed',
                                cursor: isClosed ? 'not-allowed' : 'pointer'
                            }}
                            title="5-Why & Fishbone 원인분석"
                        >
                            🔍 원인분석
                        </button>
                        <button
                            onClick={() => handleOpenActionsModal(capa)}
                            disabled={isClosed}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '4px',
                                border: '1px solid #06b6d4',
                                background: isClosed ? '#f1f5f9' : '#ecfeff',
                                color: isClosed ? '#94a3b8' : '#0891b2',
                                cursor: isClosed ? 'not-allowed' : 'pointer'
                            }}
                            title="조치과제 실행 및 검증"
                        >
                            📋 조치과제
                        </button>
                        <button
                            onClick={() => handleOpenEffectivenessModal(capa)}
                            disabled={isClosed}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '4px',
                                border: '1px solid #ec4899',
                                background: isClosed ? '#f1f5f9' : '#fdf2f8',
                                color: isClosed ? '#94a3b8' : '#db2777',
                                cursor: isClosed ? 'not-allowed' : 'pointer'
                            }}
                            title="효과성 검증 및 최종 종결"
                        >
                            ⚖️ 효과성·종결
                        </button>
                    </div>
                );
            }
        }
    ], []);

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1단계: 3단계 표준 헤더 (1행 타이틀, 2행 설명, 3행 규제배너) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🛡️</span>
                        <span>시정 및 예방조치 (CAPA) 관리 센터</span>
                    </h1>
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        ISO 13485:2016 §8.5.2/§8.5.3, ISO 22716 §10, 21 CFR 820.100 표준 준수 — 5대 품질 소스 통합 연계, 5-Why 원인 규명, 조치과제 추적 및 사후 효과성(Effectiveness) 검증 체계
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={loadData}
                        style={{
                            padding: '8px 14px',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        🔄 새로고침
                    </button>
                    <button
                        onClick={handleExportCsv}
                        style={{
                            padding: '8px 14px',
                            backgroundColor: '#ffffff',
                            color: '#059669',
                            border: '1px solid #10b981',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        📥 CSV 내보내기
                    </button>
                    <button
                        onClick={handleOpenCreateModal}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                        }}
                    >
                        ➕ 신규 CAPA 발의
                    </button>
                </div>
            </div>

            {/* 3행: 규제 매뉴얼 배너 (DEC-10) */}
            <RegulatoryManualBanner pageKey="capaManagement" onNavigate={onNavigate} />

            {/* 2단계: 6개 반응형 KPI 카드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px'
            }}>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>전체 CAPA 발의</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{kpis.totalCapas} <span style={{ fontSize: '13px', fontWeight: 500 }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>품질 5대 소스 통합</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #06b6d4', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>조치 실행 중</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0891b2', marginTop: '4px' }}>{kpis.inProgressCapas} <span style={{ fontSize: '13px', fontWeight: 500 }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>과제 편성 및 이행 중</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #ec4899', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>효과성 검증 대기</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#db2777', marginTop: '4px' }}>{kpis.pendingEffectivenessCapas} <span style={{ fontSize: '13px', fontWeight: 500 }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>사후 데이터 모니터링 중</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444' }}>기한 초과 지연 경보</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{kpis.overdueCapas} <span style={{ fontSize: '13px', fontWeight: 500 }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#f87171', marginTop: '2px' }}>완료 목표일 경과 긴급</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #f97316', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>치명/고위험 과제</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#ea580c', marginTop: '4px' }}>{kpis.criticalOrHighRiskCapas} <span style={{ fontSize: '13px', fontWeight: 500 }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Critical / High Risk</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>효과성 달성 종결율</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>{kpis.closureEffectivenessRate}%</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{kpis.closedEffectiveCapas}건 입증 완료</div>
                </div>
            </div>

            {/* 3단계: 탭 네비게이션 */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', paddingBottom: '2px' }}>
                {[
                    { id: 'ALL', label: '전체 목록' },
                    { id: 'IN_PROGRESS', label: '⚡ 조치 실행 중' },
                    { id: 'PENDING_EFF', label: '⚖️ 효과성 검증 대기' },
                    { id: 'OVERDUE', label: '⚠️ 기한 초과 지연' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: activeTab === tab.id ? 700 : 500,
                            color: activeTab === tab.id ? '#2563eb' : '#64748b',
                            backgroundColor: activeTab === tab.id ? '#eff6ff' : 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                            cursor: 'pointer',
                            borderRadius: '4px 4px 0 0'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 4단계: 다차원 검색 필터 카드 */}
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>통합 검색어</label>
                        <input
                            type="text"
                            placeholder="CAPA번호, 제목, 문제내용, 소스번호..."
                            value={searchFilter.keyword}
                            onChange={e => setSearchFilter(prev => ({ ...prev, keyword: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>발의 소스</label>
                        <select
                            value={searchFilter.sourceType}
                            onChange={e => setSearchFilter(prev => ({ ...prev, sourceType: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        >
                            {SOURCE_TYPE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>진행 상태</label>
                        <select
                            value={searchFilter.status}
                            onChange={e => setSearchFilter(prev => ({ ...prev, status: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>위험 등급</label>
                        <select
                            value={searchFilter.riskLevel}
                            onChange={e => setSearchFilter(prev => ({ ...prev, riskLevel: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        >
                            {RISK_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>CAPA 담당자</label>
                        <input
                            type="text"
                            placeholder="담당자명..."
                            value={searchFilter.assignedTo}
                            onChange={e => setSearchFilter(prev => ({ ...prev, assignedTo: e.target.value }))}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                        총 <strong style={{ color: '#0f172a' }}>{totalElements}</strong>건의 CAPA 과제가 조회되었습니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleResetFilter}
                            style={{
                                padding: '6px 14px',
                                backgroundColor: '#ffffff',
                                color: '#64748b',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            ♻️ 필터 초기화
                        </button>
                        <button
                            onClick={loadData}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: '#1e293b',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            🔍 검색 적용
                        </button>
                    </div>
                </div>
            </div>

            {/* 5단계: AG Grid 테이블 */}
            <div className="ag-theme-alpine" style={{ flex: 1, minHeight: '520px', width: '100%', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <AgGridReact
                    ref={gridRef}
                    rowData={capaList}
                    columnDefs={columnDefs}
                    rowHeight={54}
                    headerHeight={48}
                    animateRows={true}
                    loading={loading}
                    pagination={true}
                    paginationPageSize={20}
                    suppressCellFocus={true}
                />
            </div>

            {/* ========================================================================= */}
            {/* [모달 1] 신규 CAPA 발의/등록 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {isCreateModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '96vw', maxWidth: '1480px', height: '92vh', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        {/* 헤더 */}
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>➕ 신규 시정 및 예방조치(CAPA) 발의</h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>ISO 13485:2016 §8.5.2 / 21 CFR 820.100 부적합 원인 제거 및 위험 봉쇄조치 수립</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        {/* 바디 (스크롤) */}
                        <form onSubmit={handleSubmitCreate} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* 섹션 1: 기본 정보 및 소스 연계 */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>1. 발의 소스 및 기본 분류</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>CAPA 제목 *</label>
                                        <input
                                            type="text"
                                            required
                                            value={createForm.title}
                                            onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="예: 시카 크림 보존제 함량 편차 근본원인 시정조치"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>발의 소스 유형 *</label>
                                        <select
                                            value={createForm.sourceType}
                                            onChange={e => setCreateForm(prev => ({ ...prev, sourceType: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        >
                                            {SOURCE_TYPE_OPTIONS.filter(o => o.value).map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>연계 소스 문서 번호</label>
                                        <input
                                            type="text"
                                            value={createForm.sourceNumber}
                                            onChange={e => setCreateForm(prev => ({ ...prev, sourceNumber: e.target.value }))}
                                            placeholder="예: SAFE-202610-001, NCR-202610-001"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>분류 범주 *</label>
                                        <select
                                            value={createForm.category}
                                            onChange={e => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        >
                                            {CATEGORY_OPTIONS.filter(o => o.value).map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>위험도 등급 *</label>
                                        <select
                                            value={createForm.riskLevel}
                                            onChange={e => setCreateForm(prev => ({ ...prev, riskLevel: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        >
                                            {RISK_OPTIONS.filter(o => o.value).map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* 섹션 2: 문제 설명 및 임시 봉쇄조치 */}
                            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>2. 문제 현상 및 임시 봉쇄조치 (Containment)</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>문제 현상 상세 설명 *</label>
                                        <textarea
                                            required
                                            rows={3}
                                            value={createForm.problemDescription}
                                            onChange={e => setCreateForm(prev => ({ ...prev, problemDescription: e.target.value }))}
                                            placeholder="발생한 부적합, 결함 현상, 발생 건수 및 파급 범위를 상세히 기술하십시오."
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>임시 봉쇄조치 (즉시 격리/HOLD/출하보류)</label>
                                            <input
                                                type="text"
                                                value={createForm.containmentAction}
                                                onChange={e => setCreateForm(prev => ({ ...prev, containmentAction: e.target.value }))}
                                                placeholder="예: 해당 LOT 재고 전량 격리(HOLD) 및 선별검사"
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>봉쇄 조치일자</label>
                                            <input
                                                type="date"
                                                value={createForm.containmentDate}
                                                onChange={e => setCreateForm(prev => ({ ...prev, containmentDate: e.target.value }))}
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>봉쇄 조치 책임자</label>
                                            <input
                                                type="text"
                                                value={createForm.containmentResponsible}
                                                onChange={e => setCreateForm(prev => ({ ...prev, containmentResponsible: e.target.value }))}
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 섹션 3: 일정 및 효과성 검증 계획 */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>3. 담당자 지정 및 사후 효과성 검증 계획</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>CAPA 총괄 담당자 *</label>
                                        <input
                                            type="text"
                                            required
                                            value={createForm.assignedTo}
                                            onChange={e => setCreateForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>완료 목표일자 *</label>
                                        <input
                                            type="date"
                                            required
                                            value={createForm.targetCompletionDate}
                                            onChange={e => setCreateForm(prev => ({ ...prev, targetCompletionDate: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>효과성 검증 판정 기준</label>
                                        <input
                                            type="text"
                                            value={createForm.effectivenessCriteria}
                                            onChange={e => setCreateForm(prev => ({ ...prev, effectivenessCriteria: e.target.value }))}
                                            placeholder="예: 연속 3개 LOT 동일 결함 0건 및 CPK 1.33 이상"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>효과성 목표 검증일</label>
                                        <input
                                            type="date"
                                            value={createForm.effectivenessTargetDate}
                                            onChange={e => setCreateForm(prev => ({ ...prev, effectivenessTargetDate: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 푸터 버튼 */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    style={{ padding: '8px 16px', backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 20px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    발의 완료 (저장)
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* [모달 2] 5-Why & Fishbone 근본원인 분석 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {isRootCauseModalOpen && selectedCapa && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '96vw', maxWidth: '1480px', height: '92vh', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    🔍 근본원인 분석 (5-Why & Fishbone) — [{selectedCapa.capaNumber}]
                                </h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>단순 작업자 부주의가 아닌 시스템·설비·프로세스 관점의 근본 원인을 과학적으로 도출합니다.</p>
                            </div>
                            <button onClick={() => setIsRootCauseModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        <form onSubmit={handleSubmitRootCause} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* 종합 원인 분석 */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>근본원인 종합 규명 결과 (Root Cause Statement) *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={rootCauseForm.rootCauseAnalysis}
                                    onChange={e => setRootCauseForm(prev => ({ ...prev, rootCauseAnalysis: e.target.value }))}
                                    placeholder="5-Why 및 Fishbone 분석을 통해 최종 도출된 근본 원인을 요약하십시오."
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* 5-Why 원인 추적 단계 */}
                            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>🎯</span>
                                    <span>5-Why 연속 질문 분석</span>
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '70px', fontWeight: 700, color: '#7c3aed', fontSize: '13px' }}>Why {num}</div>
                                            <input
                                                type="text"
                                                value={rootCauseForm[`why${num}`] || ''}
                                                onChange={e => setRootCauseForm(prev => ({ ...prev, [`why${num}`]: e.target.value }))}
                                                placeholder={`Why ${num}: 원인 질문 및 답변`}
                                                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Fishbone 6M 특성요인도 */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>🐟</span>
                                    <span>Fishbone 6M 다차원 요인 분석</span>
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>👤 Man (사람/작업자 요인)</label>
                                        <textarea
                                            rows={2}
                                            value={rootCauseForm.fishboneMan || ''}
                                            onChange={e => setRootCauseForm(prev => ({ ...prev, fishboneMan: e.target.value }))}
                                            placeholder="숙련도, 교육 미흡, 휴먼에러..."
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>⚙️ Machine (설비/장비 요인)</label>
                                        <textarea
                                            rows={2}
                                            value={rootCauseForm.fishboneMachine || ''}
                                            onChange={e => setRootCauseForm(prev => ({ ...prev, fishboneMachine: e.target.value }))}
                                            placeholder="지그 마모, 교정 만료, 센서 오작동..."
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>🧪 Material (원료/부자재 요인)</label>
                                        <textarea
                                            rows={2}
                                            value={rootCauseForm.fishboneMaterial || ''}
                                            onChange={e => setRootCauseForm(prev => ({ ...prev, fishboneMaterial: e.target.value }))}
                                            placeholder="원료 순도 편차, 규격 불일치..."
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>📐 Method (작업방법/SOP 요인)</label>
                                        <textarea
                                            rows={2}
                                            value={rootCauseForm.fishboneMethod || ''}
                                            onChange={e => setRootCauseForm(prev => ({ ...prev, fishboneMethod: e.target.value }))}
                                            placeholder="지침서 모호, 검증되지 않은 절차..."
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>📏 Measurement (측정/계측 요인)</label>
                                        <textarea
                                            rows={2}
                                            value={rootCauseForm.fishboneMeasurement || ''}
                                            onChange={e => setRootCauseForm(prev => ({ ...prev, fishboneMeasurement: e.target.value }))}
                                            placeholder="샘플링 부족, 검사 게이지 오차..."
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>🌡️ Environment (환경/클린룸 요인)</label>
                                        <textarea
                                            rows={2}
                                            value={rootCauseForm.fishboneEnvironment || ''}
                                            onChange={e => setRootCauseForm(prev => ({ ...prev, fishboneEnvironment: e.target.value }))}
                                            placeholder="온습도 이탈, 조도, 정전기..."
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsRootCauseModalOpen(false)}
                                    style={{ padding: '8px 16px', backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    닫기
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 20px', backgroundColor: '#7c3aed', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    원인분석 저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* [모달 3] 시정/예방조치 과제 관리 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {isActionsModalOpen && selectedCapa && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '96vw', maxWidth: '1480px', height: '92vh', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    📋 조치과제(Action Items) 편성 및 검증 — [{selectedCapa.capaNumber}]
                                </h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>시정조치(재발방지) 및 예방조치(수평전개) 과제를 실행하고 객관적 검증을 완료합니다.</p>
                            </div>
                            <button onClick={() => setIsActionsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* 신규 과제 등록 폼 */}
                            <form onSubmit={handleAddAction} style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#166534' }}>➕ 신규 조치과제 추가</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>조치 유형 *</label>
                                        <select
                                            value={actionItemForm.actionType}
                                            onChange={e => setActionItemForm(prev => ({ ...prev, actionType: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '13px', boxSizing: 'border-box' }}
                                        >
                                            <option value="CORRECTIVE">시정조치 (재발 방지)</option>
                                            <option value="PREVENTIVE">예방조치 (수평 전개)</option>
                                            <option value="CONTAINMENT">임시 봉쇄조치</option>
                                            <option value="DOCUMENT_REVISION">문서/절차서 개정</option>
                                            <option value="TRAINING">교육훈련 및 자격부여</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>과제 제목 *</label>
                                        <input
                                            type="text"
                                            required
                                            value={actionItemForm.title}
                                            onChange={e => setActionItemForm(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="예: 교반 인터락 제어반 설치"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>실행 담당자 *</label>
                                        <input
                                            type="text"
                                            required
                                            value={actionItemForm.assignedTo}
                                            onChange={e => setActionItemForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>완료 목표일 *</label>
                                        <input
                                            type="date"
                                            required
                                            value={actionItemForm.targetDate}
                                            onChange={e => setActionItemForm(prev => ({ ...prev, targetDate: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>상세 실행 내용 *</label>
                                    <textarea
                                        required
                                        rows={2}
                                        value={actionItemForm.description}
                                        onChange={e => setActionItemForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="과제의 구체적 이행 절차 및 검증 기준을 기재하십시오."
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="submit"
                                        style={{ padding: '8px 18px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        과제 추가
                                    </button>
                                </div>
                            </form>

                            {/* 과제 목록 */}
                            <div>
                                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                                    등록된 조치과제 목록 ({selectedCapa.actionItems?.length || 0}건)
                                </h3>

                                {(!selectedCapa.actionItems || selectedCapa.actionItems.length === 0) ? (
                                    <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontSize: '13px' }}>
                                        아직 등록된 조치과제가 없습니다. 상단에서 조치과제를 추가해주십시오.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {selectedCapa.actionItems.map(item => {
                                            const isDone = item.status === 'COMPLETED';
                                            return (
                                                <div
                                                    key={item.id}
                                                    style={{
                                                        backgroundColor: isDone ? '#f8fafc' : '#ffffff',
                                                        padding: '16px',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${isDone ? '#e2e8f0' : '#cbd5e1'}`,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'flex-start',
                                                        gap: '16px'
                                                    }}
                                                >
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                backgroundColor: isDone ? '#dcfce7' : '#fef3c7',
                                                                color: isDone ? '#166534' : '#b45309'
                                                            }}>
                                                                {isDone ? '✅ 완료 검증됨' : '⏳ 진행 중'}
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: '#64748b' }}>[{item.actionTypeDescription}]</span>
                                                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: isDone ? '#64748b' : '#0f172a' }}>{item.title}</h4>
                                                        </div>

                                                        <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#334155', lineHeight: '18px' }}>{item.description}</p>

                                                        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                                                            <span>담당자: <strong>{item.assignedTo}</strong></span>
                                                            <span>목표일: <strong>{item.targetDate}</strong></span>
                                                            {item.completionDate && <span>완료일: <strong style={{ color: '#16a34a' }}>{item.completionDate}</strong></span>}
                                                            {item.verifiedBy && <span>검증자: <strong style={{ color: '#2563eb' }}>{item.verifiedBy}</strong></span>}
                                                        </div>

                                                        {item.verificationNotes && (
                                                            <div style={{ marginTop: '6px', fontSize: '12px', color: '#2563eb', backgroundColor: '#eff6ff', padding: '6px 10px', borderRadius: '4px' }}>
                                                                검증 의견: {item.verificationNotes}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        {!isDone && (
                                                            <button
                                                                onClick={() => handleVerifyAction(item.id)}
                                                                style={{ padding: '6px 12px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                                            >
                                                                ✓ 완료 검증
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteAction(item.id)}
                                                            style={{ padding: '6px 12px', backgroundColor: '#ffffff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setIsActionsModalOpen(false)}
                                style={{ padding: '8px 20px', backgroundColor: '#1e293b', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* [모달 4] 효과성 검증 & 공식 최종 종결 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {isEffectivenessModalOpen && selectedCapa && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '96vw', maxWidth: '1480px', height: '92vh', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    ⚖️ 효과성 검증(Effectiveness Review) 및 최종 종결 — [{selectedCapa.capaNumber}]
                                </h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>21 CFR 820.100(a)(4) / ISO 13485 §8.5.2 시정조치가 유효하며 재발이 방지되었음을 객관적 증거로 검증합니다.</p>
                            </div>
                            <button onClick={() => setIsEffectivenessModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* 효과성 판정 폼 */}
                            <form onSubmit={handleSubmitEffectiveness} style={{ backgroundColor: '#fdf2f8', padding: '16px', borderRadius: '8px', border: '1px solid #fbcfe8', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#9d174d' }}>1. 사후 효과성 판정 (Effectiveness Determination)</h3>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#9d174d', marginBottom: '4px' }}>효과성 판정 결과 *</label>
                                        <select
                                            value={effectivenessForm.effectivenessResult}
                                            onChange={e => setEffectivenessForm(prev => ({ ...prev, effectivenessResult: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f472b6', fontSize: '13px', boxSizing: 'border-box' }}
                                        >
                                            <option value="EFFECTIVE">✅ 효과적 (EFFECTIVE - 재발 방지 확인됨, 종결 가능)</option>
                                            <option value="PARTIALLY_EFFECTIVE">⚠️ 부분 효과적 (PARTIALLY - 추가 모니터링 필요)</option>
                                            <option value="INEFFECTIVE">❌ 비효과적 (INEFFECTIVE - 재발생 확인, 재조사 필수)</option>
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '22px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#9d174d', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={effectivenessForm.followUpActionRequired}
                                                onChange={e => setEffectivenessForm(prev => ({ ...prev, followUpActionRequired: e.target.checked }))}
                                            />
                                            <span>후속 조치 또는 2차 CAPA 연계 필요</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#9d174d', marginBottom: '4px' }}>객관적 입증 데이터 및 증거 (Objective Evidence) *</label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={effectivenessForm.effectivenessEvidence}
                                        onChange={e => setEffectivenessForm(prev => ({ ...prev, effectivenessEvidence: e.target.value }))}
                                        placeholder="조치 완료 후 출하된 N개 배치 검사 결과, 통계적 지표, 클레임 발생률 0건 확인 등 정량적 증거를 기술하십시오."
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f472b6', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="submit"
                                        style={{ padding: '8px 18px', backgroundColor: '#db2777', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        효과성 검증 결과 저장
                                    </button>
                                </div>
                            </form>

                            {/* 최종 종결 승인 섹션 */}
                            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#10b981' }}>2. 공식 최종 종결 승인 (Closure Authorization)</h3>
                                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '18px' }}>
                                    💡 <strong>종결 승인 가드 원칙</strong>:
                                    <br />① 모든 조치과제(Action Items)가 '완료 검증' 상태여야 합니다. (현재 잔존 미완료: <strong>{selectedCapa.actionItemCount - selectedCapa.completedActionItemCount}건</strong>)
                                    <br />② 효과성 판정 결과가 반드시 <strong>'효과적(EFFECTIVE)'</strong>이어야 최종 종결이 승인됩니다.
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>품질책임자 최종 종결 검토 의견 *</label>
                                    <textarea
                                        rows={2}
                                        value={effectivenessForm.closureComment}
                                        onChange={e => setEffectivenessForm(prev => ({ ...prev, closureComment: e.target.value }))}
                                        placeholder="본 CAPA의 원인 규명, 조치 이행 및 사후 효과성이 충분히 입증되었으므로 공식 종결을 승인함."
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={handleCloseCapa}
                                        style={{
                                            padding: '10px 24px',
                                            backgroundColor: '#10b981',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
                                        }}
                                    >
                                        🏆 CAPA 공식 최종 종결 승인
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setIsEffectivenessModalOpen(false)}
                                style={{ padding: '8px 20px', backgroundColor: '#1e293b', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* [모달 5] 공식 A4 규제 감사 리포트 인쇄 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {isAuditReportModalOpen && selectedCapa && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '96vw', maxWidth: '1480px', height: '92vh', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    🖨️ 공식 시정 및 예방조치(CAPA) 감사 리포트 — [{selectedCapa.capaNumber}]
                                </h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>ISO 13485:2016 / ISO 22716 / FDA 규제기관 실사 제출용 표준 품질기록서</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => window.print()}
                                    style={{ padding: '6px 14px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    인쇄 / PDF 저장
                                </button>
                                <button onClick={() => setIsAuditReportModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                            </div>
                        </div>

                        {/* 인쇄 영역 */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '40px', backgroundColor: '#f1f5f9' }}>
                            <div style={{ maxWidth: '850px', margin: '0 auto', backgroundColor: '#ffffff', padding: '48px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', color: '#0f172a', fontFamily: 'serif' }}>
                                <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
                                    <div style={{ fontSize: '12px', letterSpacing: '2px', color: '#64748b', textTransform: 'uppercase' }}>Quality Management System Standard Record</div>
                                    <h1 style={{ margin: '8px 0 0 0', fontSize: '22px', fontWeight: 800 }}>시정 및 예방조치 (CAPA) 완료 보고서</h1>
                                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>문서번호: {selectedCapa.capaNumber} | 승인일: {selectedCapa.closedDate || selectedCapa.updatedAt?.slice(0, 10)}</div>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '24px' }}>
                                    <tbody>
                                        <tr>
                                            <th style={{ width: '18%', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '8px', textAlign: 'left' }}>CAPA 제목</th>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 600 }} colSpan={3}>{selectedCapa.title}</td>
                                        </tr>
                                        <tr>
                                            <th style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '8px', textAlign: 'left' }}>발의 소스</th>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{selectedCapa.sourceTypeDescription} ({selectedCapa.sourceNumber || '-'})</td>
                                            <th style={{ width: '18%', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '8px', textAlign: 'left' }}>위험도 / 분류</th>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{selectedCapa.riskLevelDescription} / {selectedCapa.categoryDescription}</td>
                                        </tr>
                                        <tr>
                                            <th style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '8px', textAlign: 'left' }}>총괄 담당자</th>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{selectedCapa.assignedTo}</td>
                                            <th style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '8px', textAlign: 'left' }}>완료 목표일</th>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{selectedCapa.targetCompletionDate}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div style={{ marginBottom: '20px' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, borderLeft: '3px solid #2563eb', paddingLeft: '8px' }}>1. 문제 현상 및 임시 봉쇄조치</h4>
                                    <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px', fontSize: '12px', lineHeight: '18px', backgroundColor: '#fafafa' }}>
                                        <strong>[문제 현상]</strong><br />{selectedCapa.problemDescription}
                                        {selectedCapa.containmentAction && (
                                            <>
                                                <br /><br />
                                                <strong>[임시 봉쇄조치]</strong> ({selectedCapa.containmentDate || '-'}, 담당: {selectedCapa.containmentResponsible || '-'})<br />
                                                {selectedCapa.containmentAction}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, borderLeft: '3px solid #7c3aed', paddingLeft: '8px' }}>2. 근본원인 규명 (5-Why & 특성요인도)</h4>
                                    <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px', fontSize: '12px', lineHeight: '18px', backgroundColor: '#fafafa' }}>
                                        <strong>[최종 근본원인]</strong><br />{selectedCapa.rootCauseAnalysis || '원인 조사 분석 완료'}
                                        {selectedCapa.why1 && (
                                            <div style={{ marginTop: '8px', paddingLeft: '10px', borderLeft: '2px solid #e2e8f0' }}>
                                                {selectedCapa.why1 && <div>• Why 1: {selectedCapa.why1}</div>}
                                                {selectedCapa.why2 && <div>• Why 2: {selectedCapa.why2}</div>}
                                                {selectedCapa.why3 && <div>• Why 3: {selectedCapa.why3}</div>}
                                                {selectedCapa.why4 && <div>• Why 4: {selectedCapa.why4}</div>}
                                                {selectedCapa.why5 && <div>• Why 5: {selectedCapa.why5}</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, borderLeft: '3px solid #0891b2', paddingLeft: '8px' }}>3. 시정 및 예방조치 과제 이행 결과</h4>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                                <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>유형</th>
                                                <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>조치 과제명</th>
                                                <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>담당자</th>
                                                <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>완료일</th>
                                                <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>검증자</th>
                                                <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>상태</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedCapa.actionItems?.map((act, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>{act.actionTypeDescription}</td>
                                                    <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>{act.title}</td>
                                                    <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>{act.assignedTo}</td>
                                                    <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>{act.completionDate || '-'}</td>
                                                    <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>{act.verifiedBy || '-'}</td>
                                                    <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontWeight: 700 }}>{act.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, borderLeft: '3px solid #db2777', paddingLeft: '8px' }}>4. 사후 효과성 검증 및 공식 최종 종결</h4>
                                    <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '4px', fontSize: '12px', lineHeight: '18px', backgroundColor: '#fafafa' }}>
                                        <div><strong>[효과성 판정 결과]</strong>: <span style={{ fontWeight: 700, color: '#16a34a' }}>{selectedCapa.effectivenessResultDescription || '미평가'}</span> (검증자: {selectedCapa.effectivenessReviewedBy || '-'}, 검증일: {selectedCapa.effectivenessReviewedDate || '-'})</div>
                                        <div style={{ marginTop: '4px' }}><strong>[객관적 입증 증거]</strong>:<br />{selectedCapa.effectivenessEvidence || '해당 조치 이행 완료'}</div>
                                        {selectedCapa.closureComment && (
                                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                                                <strong>[최종 종결 검토 의견]</strong> (종결승인자: {selectedCapa.closedBy}, 종결일자: {selectedCapa.closedDate}):<br />
                                                {selectedCapa.closureComment}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #0f172a', fontSize: '12px' }}>
                                    <div>작성자: <strong>{selectedCapa.assignedTo}</strong> (서명 / 印)</div>
                                    <div>품질보증부서장 검토: <strong>김품질</strong> (서명 / 印)</div>
                                    <div>품질책임자 최종승인: <strong>{selectedCapa.closedBy || '강품질'}</strong> (서명 / 印)</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setIsAuditReportModalOpen(false)}
                                style={{ padding: '8px 20px', backgroundColor: '#1e293b', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
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
