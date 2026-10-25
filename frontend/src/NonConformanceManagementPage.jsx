import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import {
    fetchNcrKpis,
    fetchNcrs,
    fetchNcrById,
    createNcr,
    createNcrFromInbound,
    updateNcr,
    submitNcrInvestigation,
    decideNcrDisposition,
    updateNcrQuarantine,
    closeNcr,
    checkReleaseEligibility,
    addNcrActionItem,
    completeNcrActionItem,
    verifyNcrActionItem,
    deleteNcrActionItem
} from './api';

// =========================================================================
// 1. 공통 뱃지 스타일 및 상수 정의
// =========================================================================

const OCCURRENCE_STAGES = [
    { value: 'INCOMING_INSPECTION', label: '입고 검사 (원자재/부자재)', color: '#6366f1', bg: '#e0e7ff', icon: '📥' },
    { value: 'IN_PROCESS', label: '제조공정 (조제/충진/포장)', color: '#0ea5e9', bg: '#e0f2fe', icon: '⚙️' },
    { value: 'FINAL_RELEASE', label: '완제품 검사 및 출하 승인', color: '#10b981', bg: '#d1fae5', icon: '✨' },
    { value: 'STORAGE_STABILITY', label: '보관창고 및 안정성 시험', color: '#8b5cf6', bg: '#ede9fe', icon: '🌡️' },
    { value: 'MARKET_COMPLAINT', label: '시판 후 불만 및 반품', color: '#f59e0b', bg: '#fef3c7', icon: '📞' },
    { value: 'SUPPLIER_AUDIT', label: '공급업체 평가 및 정기실사', color: '#ec4899', bg: '#fce7f3', icon: '🏭' },
    { value: 'OTHER', label: '기타', color: '#64748b', bg: '#f1f5f9', icon: '📌' }
];

const SEVERITIES = [
    { value: 'CRITICAL', label: '치명 (Critical)', color: '#dc2626', bg: '#fee2e2', border: '#f87171' },
    { value: 'MAJOR', label: '주요 (Major)', color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
    { value: 'MINOR', label: '경미 (Minor)', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' }
];

const NCR_STATUSES = [
    { value: 'DRAFT', label: '작성 중', color: '#64748b', bg: '#f1f5f9' },
    { value: 'SUBMITTED', label: '접수 완료 (격리)', color: '#dc2626', bg: '#fee2e2' },
    { value: 'UNDER_INVESTIGATION', label: '원인 조사 중', color: '#ea580c', bg: '#ffedd5' },
    { value: 'DISPOSITION_PENDING', label: '처리방안 심의대기', color: '#d97706', bg: '#fef3c7' },
    { value: 'DISPOSITION_APPROVED', label: '처리방안 승인', color: '#2563eb', bg: '#dbeafe' },
    { value: 'REWORK_IN_PROGRESS', label: '재작업 실행 중', color: '#7c3aed', bg: '#ede9fe' },
    { value: 'EFFECTIVENESS_VERIFIED', label: '유효성 확인 완료', color: '#0d9488', bg: '#ccfbf1' },
    { value: 'CLOSED', label: '최종 종결', color: '#16a34a', bg: '#dcfce7' },
    { value: 'VOID', label: '무효/취소', color: '#94a3b8', bg: '#f8fafc' }
];

const QUARANTINE_STATUSES = [
    { value: 'QUARANTINED', label: '물리적 격리 보관 중', color: '#dc2626', bg: '#fee2e2', icon: '🛑' },
    { value: 'TAGGED_HOLD', label: '식별표 부착 및 보류(HOLD)', color: '#d97706', bg: '#fef3c7', icon: '🏷️' },
    { value: 'NOT_QUARANTINED', label: '미격리 (현장 보관)', color: '#64748b', bg: '#f1f5f9', icon: '📦' },
    { value: 'RELEASED_FROM_QUARANTINE', label: '격리 해제 완료', color: '#16a34a', bg: '#dcfce7', icon: '🔓' }
];

const DISPOSITION_TYPES = [
    { value: 'PENDING', label: '처리방안 미결', color: '#94a3b8', bg: '#f8fafc' },
    { value: 'SCRAP', label: '폐기 처분 (Scrap)', color: '#dc2626', bg: '#fee2e2' },
    { value: 'RETURN_TO_SUPPLIER', label: '공급사 반품 (Return)', color: '#ea580c', bg: '#ffedd5' },
    { value: 'REWORK', label: '재작업 (Rework)', color: '#7c3aed', bg: '#ede9fe' },
    { value: 'CONCESSION', label: '특채/양보 (Concession)', color: '#2563eb', bg: '#dbeafe' },
    { value: 'DOWNGRADE', label: '등급 하향 (Downgrade)', color: '#d97706', bg: '#fef3c7' },
    { value: 'RETEST_RELEASE', label: '재시험 후 출하 허용', color: '#0d9488', bg: '#ccfbf1' }
];

export default function NonConformanceManagementPage({ user, onNavigate }) {
    // 탭 상태: 0=전체 목록, 1=격리 보관 및 HOLD, 2=처리 및 특채 심의, 3=출하 게이트 검증
    const [activeTab, setActiveTab] = useState(0);

    // KPI 상태
    const [kpi, setKpi] = useState({
        totalNcrCount: 0,
        openNcrCount: 0,
        quarantinedCount: 0,
        reworkConcessionCount: 0,
        capaLinkedCount: 0,
        closedRatePercent: 0
    });

    // 목록 데이터 및 필터
    const [ncrs, setNcrs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        keyword: '',
        stage: '',
        severity: '',
        status: '',
        quarantineStatus: ''
    });

    // 선택된 NCR 상세 및 모달 제어
    const [selectedNcr, setSelectedNcr] = useState(null);
    const [modalMode, setModalMode] = useState(null); // 'CREATE', 'EDIT', 'INVESTIGATION', 'DISPOSITION', 'QUARANTINE', 'CLOSE', 'ACTIONS', 'REPORT'

    // 폼 상태: 신규 등록 / 수정
    const [formData, setFormData] = useState({
        title: '',
        stage: 'INCOMING_INSPECTION',
        severity: 'MAJOR',
        itemCode: '',
        productName: '',
        lotNumber: '',
        affectedQuantity: 0,
        unit: 'EA',
        supplierName: '',
        occurredDate: new Date().toISOString().split('T')[0],
        discoveredBy: user?.name || '',
        defectType: '',
        defectDescription: '',
        immediateAction: '',
        quarantineStatus: 'QUARANTINED',
        quarantineLocation: '원자재 격리창고 Q-101',
        capaRequired: false,
        capaRationale: ''
    });

    // 폼 상태: 원인 조사
    const [investigationData, setInvestigationData] = useState({
        rootCauseAnalysis: '',
        capaRequired: false,
        capaRationale: ''
    });

    // 폼 상태: 처리방안 심의
    const [dispositionData, setDispositionData] = useState({
        dispositionType: 'PENDING',
        dispositionDetails: '',
        reworkInstructions: '',
        concessionJustification: '',
        capaRequired: false,
        capaReferenceId: '',
        capaRationale: ''
    });

    // 폼 상태: 격리 보관 변경
    const [quarantineData, setQuarantineData] = useState({
        quarantineStatus: 'QUARANTINED',
        quarantineLocation: '',
        notes: ''
    });

    // 폼 상태: 종결
    const [closureRemarks, setClosureRemarks] = useState('');

    // 폼 상태: 신규 액션 아이템
    const [newActionItem, setNewActionItem] = useState({
        actionType: 'CORRECTION',
        description: '',
        assignee: user?.name || '',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    });

    // 탭 3: 출하 적격성 진단기 상태
    const [releaseGateQuery, setReleaseGateQuery] = useState({
        lotNumber: '',
        itemCode: '',
        inboundId: ''
    });
    const [releaseGateResult, setReleaseGateResult] = useState(null);
    const [releaseGateLoading, setReleaseGateLoading] = useState(false);

    // =========================================================================
    // 2. 데이터 로드 함수
    // =========================================================================

    const loadKpis = useCallback(async () => {
        try {
            const data = await fetchNcrKpis();
            if (data) setKpi(data);
        } catch (err) {
            console.error('KPI 로드 실패:', err);
        }
    }, []);

    const loadNcrs = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: 0,
                size: 50,
                keyword: filters.keyword || undefined,
                stage: filters.stage || undefined,
                severity: filters.severity || undefined,
                status: filters.status || undefined,
                quarantineStatus: filters.quarantineStatus || undefined
            };
            const res = await fetchNcrs(params);
            if (res && res.content) {
                setNcrs(res.content);
            } else if (Array.isArray(res)) {
                setNcrs(res);
            } else {
                setNcrs([]);
            }
        } catch (err) {
            console.error('NCR 목록 로드 실패:', err);
            toast.error('NCR 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadKpis();
        loadNcrs();
    }, [loadKpis, loadNcrs]);

    // =========================================================================
    // 3. 필터 제어
    // =========================================================================

    const handleFilterChange = (field, val) => {
        setFilters(prev => ({ ...prev, [field]: val }));
    };

    const handleResetFilters = () => {
        setFilters({
            keyword: '',
            stage: '',
            severity: '',
            status: '',
            quarantineStatus: ''
        });
    };

    // =========================================================================
    // 4. 모달 열기 헬퍼
    // =========================================================================

    const openCreateModal = () => {
        setFormData({
            title: '',
            stage: 'INCOMING_INSPECTION',
            severity: 'MAJOR',
            itemCode: '',
            productName: '',
            lotNumber: '',
            affectedQuantity: 0,
            unit: 'EA',
            supplierName: '',
            occurredDate: new Date().toISOString().split('T')[0],
            discoveredBy: user?.name || '',
            defectType: '',
            defectDescription: '',
            immediateAction: '',
            quarantineStatus: 'QUARANTINED',
            quarantineLocation: '원자재 격리창고 Q-101',
            capaRequired: false,
            capaRationale: ''
        });
        setModalMode('CREATE');
    };

    const openEditModal = (item) => {
        setSelectedNcr(item);
        setFormData({
            title: item.title,
            stage: item.stage,
            severity: item.severity,
            itemCode: item.itemCode,
            productName: item.productName,
            lotNumber: item.lotNumber || '',
            affectedQuantity: item.affectedQuantity || 0,
            unit: item.unit || 'EA',
            supplierName: item.supplierName || '',
            occurredDate: item.occurredDate || '',
            discoveredBy: item.discoveredBy || '',
            defectType: item.defectType || '',
            defectDescription: item.defectDescription || '',
            immediateAction: item.immediateAction || '',
            quarantineStatus: item.quarantineStatus,
            quarantineLocation: item.quarantineLocation || '',
            capaRequired: item.capaRequired || false,
            capaRationale: item.capaRationale || ''
        });
        setModalMode('EDIT');
    };

    const openInvestigationModal = (item) => {
        setSelectedNcr(item);
        setInvestigationData({
            rootCauseAnalysis: item.rootCauseAnalysis || '',
            capaRequired: item.capaRequired || false,
            capaRationale: item.capaRationale || ''
        });
        setModalMode('INVESTIGATION');
    };

    const openDispositionModal = (item) => {
        setSelectedNcr(item);
        setDispositionData({
            dispositionType: item.dispositionType && item.dispositionType !== 'PENDING' ? item.dispositionType : 'REWORK',
            dispositionDetails: item.dispositionDetails || '',
            reworkInstructions: item.reworkInstructions || '',
            concessionJustification: item.concessionJustification || '',
            capaRequired: item.capaRequired || false,
            capaReferenceId: item.capaReferenceId || '',
            capaRationale: item.capaRationale || ''
        });
        setModalMode('DISPOSITION');
    };

    const openQuarantineModal = (item) => {
        setSelectedNcr(item);
        setQuarantineData({
            quarantineStatus: item.quarantineStatus,
            quarantineLocation: item.quarantineLocation || '원자재 격리창고 Q-101',
            notes: ''
        });
        setModalMode('QUARANTINE');
    };

    const openCloseModal = (item) => {
        setSelectedNcr(item);
        setClosureRemarks('');
        setModalMode('CLOSE');
    };

    const openActionsModal = async (item) => {
        setSelectedNcr(item);
        setModalMode('ACTIONS');
        // 최신 상세 조회
        try {
            const fresh = await fetchNcrById(item.id);
            setSelectedNcr(fresh);
        } catch (e) {
            console.error(e);
        }
    };

    const openReportModal = (item) => {
        setSelectedNcr(item);
        setModalMode('REPORT');
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedNcr(null);
    };

    // =========================================================================
    // 5. 비즈니스 액션 핸들러
    // =========================================================================

    const handleSaveCreate = async () => {
        if (!formData.title.trim()) return toast.warning('보고서 제목을 입력해주세요.');
        if (!formData.itemCode.trim()) return toast.warning('품목코드를 입력해주세요.');
        if (!formData.productName.trim()) return toast.warning('품목명을 입력해주세요.');
        if (!formData.defectDescription.trim()) return toast.warning('부적합 상세 내용을 입력해주세요.');

        try {
            await createNcr(formData);
            toast.success('부적합 보고서(NCR)가 성공적으로 등록되었습니다.');
            closeModal();
            loadKpis();
            loadNcrs();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'NCR 등록에 실패했습니다.');
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedNcr) return;
        try {
            await updateNcr(selectedNcr.id, formData);
            toast.success('부적합 보고서가 수정되었습니다.');
            closeModal();
            loadNcrs();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || '수정에 실패했습니다.');
        }
    };

    const handleSaveInvestigation = async () => {
        if (!selectedNcr) return;
        if (!investigationData.rootCauseAnalysis.trim()) {
            return toast.warning('근본 원인 분석(5-Why/어골도) 내용을 입력해주세요.');
        }

        try {
            await submitNcrInvestigation(selectedNcr.id, investigationData);
            toast.success('원인 조사가 제출되었으며 심의 대기 상태로 전이되었습니다.');
            closeModal();
            loadKpis();
            loadNcrs();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || '원인 조사 제출 실패');
        }
    };

    const handleSaveDisposition = async () => {
        if (!selectedNcr) return;
        if (dispositionData.dispositionType === 'PENDING') {
            return toast.warning('유효한 처리(Disposition) 방안을 선택해주세요.');
        }
        if (dispositionData.dispositionType === 'CONCESSION' && !dispositionData.concessionJustification.trim()) {
            return toast.warning('특채(Concession) 승인 시 안전성/유효성 무영향 타당성 사유가 필수입니다. (ISO 13485:2016 §8.3)');
        }
        if (dispositionData.dispositionType === 'REWORK' && !dispositionData.reworkInstructions.trim()) {
            return toast.warning('재작업(Rework) 판정 시 재작업 작업지침서 및 재검사 기준이 필수입니다. (21 CFR 820.90)');
        }

        try {
            await decideNcrDisposition(selectedNcr.id, dispositionData);
            toast.success(`처리 방안(${dispositionData.dispositionType})이 승인 완료되었습니다.`);
            closeModal();
            loadKpis();
            loadNcrs();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || '처리 방안 승인 실패');
        }
    };

    const handleSaveQuarantine = async () => {
        if (!selectedNcr) return;
        try {
            await updateNcrQuarantine(selectedNcr.id, quarantineData);
            toast.success('격리 보관 상태가 변경되었습니다.');
            closeModal();
            loadKpis();
            loadNcrs();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || '격리 상태 변경 실패');
        }
    };

    const handleSaveClose = async () => {
        if (!selectedNcr) return;
        if (!closureRemarks.trim()) {
            return toast.warning('최종 종결 확인 및 검토 의견을 입력해주세요.');
        }

        try {
            await closeNcr(selectedNcr.id, { closureRemarks });
            toast.success('부적합 보고서가 최종 종결 처리되었습니다.');
            closeModal();
            loadKpis();
            loadNcrs();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || '종결 처리에 실패했습니다.');
        }
    };

    // 조치 과제 추가
    const handleAddActionItem = async () => {
        if (!selectedNcr) return;
        if (!newActionItem.description.trim()) return toast.warning('과제 내용을 입력해주세요.');
        if (!newActionItem.assignee.trim()) return toast.warning('담당자를 지정해주세요.');

        try {
            await addNcrActionItem(selectedNcr.id, newActionItem);
            toast.success('조치 과제가 추가되었습니다.');
            const fresh = await fetchNcrById(selectedNcr.id);
            setSelectedNcr(fresh);
            setNewActionItem({
                actionType: 'CORRECTION',
                description: '',
                assignee: user?.name || '',
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
            });
            loadNcrs();
        } catch (err) {
            console.error(err);
            toast.error('조치 과제 등록 실패');
        }
    };

    const handleCompleteActionItem = async (actionId) => {
        try {
            await completeNcrActionItem(actionId);
            toast.success('과제가 완료 처리되었습니다.');
            const fresh = await fetchNcrById(selectedNcr.id);
            setSelectedNcr(fresh);
            loadNcrs();
        } catch (err) {
            console.error(err);
            toast.error('과제 완료 실패');
        }
    };

    const handleVerifyActionItem = async (actionId, result) => {
        const notes = window.prompt('검증 확인 의견을 입력하십시오:', result === 'PASS' ? '조치 결과 적합 확인 완료' : '재조치 필요');
        if (notes === null) return;
        try {
            await verifyNcrActionItem(actionId, result, notes);
            toast.success(`과제 검증 결과(${result})가 반영되었습니다.`);
            const fresh = await fetchNcrById(selectedNcr.id);
            setSelectedNcr(fresh);
            loadNcrs();
        } catch (err) {
            console.error(err);
            toast.error('검증 저장 실패');
        }
    };

    const handleDeleteAction = async (actionId) => {
        if (!window.confirm('해당 조치 과제를 삭제하시겠습니까?')) return;
        try {
            await deleteNcrActionItem(actionId);
            toast.info('조치 과제가 삭제되었습니다.');
            const fresh = await fetchNcrById(selectedNcr.id);
            setSelectedNcr(fresh);
            loadNcrs();
        } catch (err) {
            console.error(err);
            toast.error('삭제 실패');
        }
    };

    // 출하 적격성 진단기 실행
    const handleRunReleaseCheck = async () => {
        if (!releaseGateQuery.lotNumber.trim() && !releaseGateQuery.inboundId.trim()) {
            return toast.warning('진단할 LOT 번호 또는 입고 ID를 입력해주세요.');
        }

        setReleaseGateLoading(true);
        setReleaseGateResult(null);
        try {
            const params = {
                lotNumber: releaseGateQuery.lotNumber.trim() || undefined,
                itemCode: releaseGateQuery.itemCode.trim() || undefined,
                inboundId: releaseGateQuery.inboundId.trim() ? Number(releaseGateQuery.inboundId.trim()) : undefined
            };
            const res = await checkReleaseEligibility(params);
            setReleaseGateResult(res);
        } catch (err) {
            console.error(err);
            toast.error('출하 적격성 진단 중 오류가 발생했습니다.');
        } finally {
            setReleaseGateLoading(false);
        }
    };

    // =========================================================================
    // 6. AG Grid 컬럼 정의
    // =========================================================================

    const columnDefs = useMemo(() => [
        {
            headerName: 'NCR 번호',
            field: 'ncrNumber',
            width: 155,
            pinned: 'left',
            cellRenderer: (p) => (
                <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#1e40af', cursor: 'pointer' }} onClick={() => openReportModal(p.data)}>
                        {p.value}
                    </span>
                </div>
            )
        },
        {
            headerName: '발생일',
            field: 'occurredDate',
            width: 110,
            valueFormatter: p => p.value || '-'
        },
        {
            headerName: '발생 단계',
            field: 'stage',
            width: 170,
            cellRenderer: (p) => {
                const s = OCCURRENCE_STAGES.find(x => x.value === p.value);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: s?.color || '#475569',
                            backgroundColor: s?.bg || '#f1f5f9'
                        }}>
                            {s?.icon} {s?.label.split(' ')[0] || p.value}
                        </span>
                    </div>
                );
            }
        },
        {
            headerName: '심각도',
            field: 'severity',
            width: 115,
            cellRenderer: (p) => {
                const s = SEVERITIES.find(x => x.value === p.value);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <span style={{
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: s?.color || '#334155',
                            backgroundColor: s?.bg || '#f1f5f9',
                            border: `1px solid ${s?.border || '#cbd5e1'}`
                        }}>
                            {s?.label.split(' ')[0] || p.value}
                        </span>
                    </div>
                );
            }
        },
        {
            headerName: '품목코드 / 품목명',
            field: 'productName',
            width: 240,
            cellRenderer: (p) => (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.value}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {p.data.itemCode}
                    </span>
                </div>
            )
        },
        {
            headerName: 'LOT 번호',
            field: 'lotNumber',
            width: 140,
            cellRenderer: p => (
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                        {p.value || '(미상)'}
                    </span>
                </div>
            )
        },
        {
            headerName: '부적합 수량',
            field: 'affectedQuantity',
            width: 120,
            cellRenderer: p => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%', paddingRight: '8px', fontWeight: 700, color: '#dc2626' }}>
                    {p.value?.toLocaleString()} <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>{p.data.unit}</span>
                </div>
            )
        },
        {
            headerName: '격리 상태',
            field: 'quarantineStatus',
            width: 155,
            cellRenderer: (p) => {
                const s = QUARANTINE_STATUSES.find(x => x.value === p.value);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: s?.color || '#475569',
                            backgroundColor: s?.bg || '#f1f5f9'
                        }}>
                            {s?.icon} {s?.label.split(' ')[0] || p.value}
                        </span>
                    </div>
                );
            }
        },
        {
            headerName: '처리방안(Disposition)',
            field: 'dispositionType',
            width: 150,
            cellRenderer: (p) => {
                const s = DISPOSITION_TYPES.find(x => x.value === p.value);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: s?.color || '#475569',
                            backgroundColor: s?.bg || '#f1f5f9'
                        }}>
                            {s?.label.split(' ')[0] || p.value}
                        </span>
                    </div>
                );
            }
        },
        {
            headerName: '진행 상태',
            field: 'status',
            width: 135,
            cellRenderer: (p) => {
                const s = NCR_STATUSES.find(x => x.value === p.value);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <span style={{
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: s?.color || '#475569',
                            backgroundColor: s?.bg || '#f1f5f9'
                        }}>
                            {s?.label || p.value}
                        </span>
                    </div>
                );
            }
        },
        {
            headerName: 'CAPA 연계',
            field: 'capaStatus',
            width: 120,
            cellRenderer: (p) => {
                const isLinked = p.value === 'LINKED';
                const isReq = p.data.capaRequired || p.value === 'REQUIRED';
                return (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        {isLinked ? (
                            <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, color: '#0f766e', backgroundColor: '#ccfbf1' }}>
                                🛡️ {p.data.capaReferenceId || 'LINKED'}
                            </span>
                        ) : isReq ? (
                            <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, color: '#b45309', backgroundColor: '#fef3c7' }}>
                                ⏳ CAPA 필수
                            </span>
                        ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>불요</span>
                        )}
                    </div>
                );
            }
        },
        {
            headerName: '관리 및 심의 조치',
            width: 320,
            pinned: 'right',
            cellRenderer: (p) => (
                <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '5px' }}>
                    <button
                        type="button"
                        onClick={() => openInvestigationModal(p.data)}
                        style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#334155',
                            cursor: 'pointer'
                        }}
                    >
                        🔍 조사
                    </button>
                    <button
                        type="button"
                        onClick={() => openDispositionModal(p.data)}
                        style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '5px',
                            border: '1px solid #93c5fd',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            cursor: 'pointer'
                        }}
                    >
                        ⚖️ 심의
                    </button>
                    <button
                        type="button"
                        onClick={() => openActionsModal(p.data)}
                        style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '5px',
                            border: '1px solid #c084fc',
                            background: '#faf5ff',
                            color: '#7e22ce',
                            cursor: 'pointer'
                        }}
                    >
                        🛠️ 과제({p.data.actionItems ? p.data.actionItems.length : 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => openQuarantineModal(p.data)}
                        style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '5px',
                            border: '1px solid #fca5a5',
                            background: '#fef2f2',
                            color: '#b91c1c',
                            cursor: 'pointer'
                        }}
                    >
                        🛑 격리
                    </button>
                    {p.data.status !== 'CLOSED' && (
                        <button
                            type="button"
                            onClick={() => openCloseModal(p.data)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '5px',
                                border: '1px solid #86efac',
                                background: '#f0fdf4',
                                color: '#15803d',
                                cursor: 'pointer'
                            }}
                        >
                            종결
                        </button>
                    )}
                </div>
            )
        }
    ], []);

    // 격리 탭용 데이터 필터
    const quarantineList = useMemo(() => {
        return ncrs.filter(x => x.quarantineStatus === 'QUARANTINED' || x.quarantineStatus === 'TAGGED_HOLD');
    }, [ncrs]);

    // 심의/특채 탭용 데이터 필터
    const dispositionList = useMemo(() => {
        return ncrs.filter(x => x.dispositionType && x.dispositionType !== 'PENDING');
    }, [ncrs]);

    // =========================================================================
    // 7. 메인 화면 렌더링
    // =========================================================================

    return (
        <div style={{ padding: '24px 28px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            
            {/* 3단계 표준 헤더 */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '26px' }}>⚠️</span>
                        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            부적합품 관리 및 출하승인 통제
                        </h1>
                        <span style={{
                            padding: '4px 10px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            fontSize: '11px',
                            fontWeight: 700,
                            borderRadius: '12px',
                            border: '1px solid #f87171'
                        }}>
                            ISO 13485:2016 §8.3 / ISO 22716:2007 §8.4 / 21 CFR 820.90
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setReleaseGateQuery({ lotNumber: '', itemCode: '', inboundId: '' });
                                setReleaseGateResult(null);
                                setActiveTab(3);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '9px 15px',
                                backgroundColor: '#ffffff',
                                color: '#1e40af',
                                border: '1px solid #bfdbfe',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            <span>🚪 출하 게이트 진단</span>
                        </button>
                        <button
                            type="button"
                            onClick={openCreateModal}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '9px 18px',
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)'
                            }}
                        >
                            <span>➕ 신규 부적합(NCR) 보고</span>
                        </button>
                    </div>
                </div>

                <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    원자재 입고검사부터 제조공정, 완제품 출하까지 모든 부적합품의 식별, 물리적 격리(Quarantine), 5-Why 원인조사, 폐기/반품/재작업/특채(Concession) 심의, CAPA 연계 및 출하승인 강제 게이트를 통제합니다.
                </p>
            </div>

            {/* 규제 표준 가이드 배너 */}
            <RegulatoryManualBanner pageKey="ncrManagement" />

            {/* 6대 반응형 KPI 카드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
                marginBottom: '20px'
            }}>
                {/* 1. 총 등록 */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>총 NCR 등록 건수</span>
                        <span style={{ fontSize: '18px' }}>⚠️</span>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                        {kpi.totalNcrCount.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>누적 품질 부적합</div>
                </div>

                {/* 2. 미결/조사중 */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid #fed7aa',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#c2410c', fontWeight: 600 }}>미결 / 조사 중</span>
                        <span style={{ fontSize: '18px' }}>⏳</span>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 800, color: '#ea580c' }}>
                        {kpi.openNcrCount.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500, color: '#9a3412' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#c2410c', marginTop: '4px' }}>원인규명 및 심의 대기</div>
                </div>

                {/* 3. 격리 보관 */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid #fecaca',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600 }}>물리적 격리 보관 (Hold)</span>
                        <span style={{ fontSize: '18px' }}>🛑</span>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 800, color: '#dc2626' }}>
                        {kpi.quarantinedCount.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500, color: '#991b1b' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>오용 방지 격리창고 보관</div>
                </div>

                {/* 4. 재작업 / 특채 */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid #e9d5ff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#7e22ce', fontWeight: 600 }}>재작업 / 특채 승인</span>
                        <span style={{ fontSize: '18px' }}>🛠️</span>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 800, color: '#9333ea' }}>
                        {kpi.reworkConcessionCount.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b21a8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#7e22ce', marginTop: '4px' }}>조건부 승인 및 조치실행</div>
                </div>

                {/* 5. CAPA 연계 */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid #99f6e4',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#0f766e', fontWeight: 600 }}>CAPA 연계 / 필수</span>
                        <span style={{ fontSize: '18px' }}>🛡️</span>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 800, color: '#0d9488' }}>
                        {kpi.capaLinkedCount.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500, color: '#115e59' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#0f766e', marginTop: '4px' }}>시정/예방조치 추진</div>
                </div>

                {/* 6. 종결율 */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    border: '1px solid #bbf7d0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>최종 종결율</span>
                        <span style={{ fontSize: '18px' }}>✅</span>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>
                        {kpi.closedRatePercent} <span style={{ fontSize: '12px', fontWeight: 500, color: '#166534' }}>%</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#15803d', marginTop: '4px' }}>원인해소 및 조치검증</div>
                </div>
            </div>

            {/* 다차원 검색 필터 카드 */}
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '16px 20px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'center' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>통합 검색어</label>
                        <input
                            type="text"
                            placeholder="NCR번호, 품목명, LOT, 공급사..."
                            value={filters.keyword}
                            onChange={e => handleFilterChange('keyword', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '13px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>발생 단계</label>
                        <select
                            value={filters.stage}
                            onChange={e => handleFilterChange('stage', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '13px',
                                backgroundColor: '#ffffff',
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="">전체 발생 단계</option>
                            {OCCURRENCE_STAGES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>심각도 등급</label>
                        <select
                            value={filters.severity}
                            onChange={e => handleFilterChange('severity', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '13px',
                                backgroundColor: '#ffffff',
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="">전체 심각도</option>
                            {SEVERITIES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>진행 상태</label>
                        <select
                            value={filters.status}
                            onChange={e => handleFilterChange('status', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '13px',
                                backgroundColor: '#ffffff',
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="">전체 진행 상태</option>
                            {NCR_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>격리 상태</label>
                        <select
                            value={filters.quarantineStatus}
                            onChange={e => handleFilterChange('quarantineStatus', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '13px',
                                backgroundColor: '#ffffff',
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="">전체 격리 상태</option>
                            {QUARANTINE_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                        <button
                            type="button"
                            onClick={loadNcrs}
                            style={{
                                flex: 1,
                                padding: '8px 14px',
                                backgroundColor: '#1e40af',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            🔍 조회
                        </button>
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 4대 탭 바 */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab(0)}
                    style={{
                        padding: '10px 18px',
                        fontSize: '14px',
                        fontWeight: activeTab === 0 ? 800 : 600,
                        color: activeTab === 0 ? '#1e40af' : '#64748b',
                        borderBottom: activeTab === 0 ? '3px solid #1e40af' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>📋 NCR 전체 목록</span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '10px', backgroundColor: '#e2e8f0', color: '#334155' }}>
                        {ncrs.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab(1)}
                    style={{
                        padding: '10px 18px',
                        fontSize: '14px',
                        fontWeight: activeTab === 1 ? 800 : 600,
                        color: activeTab === 1 ? '#dc2626' : '#64748b',
                        borderBottom: activeTab === 1 ? '3px solid #dc2626' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>🛑 격리 보관 및 HOLD 현황</span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '10px', backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                        {quarantineList.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab(2)}
                    style={{
                        padding: '10px 18px',
                        fontSize: '14px',
                        fontWeight: activeTab === 2 ? 800 : 600,
                        color: activeTab === 2 ? '#7c3aed' : '#64748b',
                        borderBottom: activeTab === 2 ? '3px solid #7c3aed' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>⚖️ 처리(Disposition) 및 특채 심의</span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '10px', backgroundColor: '#ede9fe', color: '#6b21a8' }}>
                        {dispositionList.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab(3)}
                    style={{
                        padding: '10px 18px',
                        fontSize: '14px',
                        fontWeight: activeTab === 3 ? 800 : 600,
                        color: activeTab === 3 ? '#0d9488' : '#64748b',
                        borderBottom: activeTab === 3 ? '3px solid #0d9488' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>🚪 출하 승인 게이트 & 입고 연계</span>
                </button>
            </div>

            {/* 탭 0: 전체 목록 AG Grid */}
            {activeTab === 0 && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                            검색 결과: 총 {ncrs.length}건의 부적합 보고서
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            행을 더블 클릭하거나 [보고서]를 클릭하면 인쇄용 공식 NCR 감사 리포트를 확인할 수 있습니다.
                        </span>
                    </div>

                    <div className="ag-theme-alpine" style={{ width: '100%', height: '560px' }}>
                        <AgGridReact
                            rowData={ncrs}
                            columnDefs={columnDefs}
                            rowHeight={54}
                            headerHeight={44}
                            animateRows={true}
                            pagination={true}
                            paginationPageSize={15}
                            onRowDoubleClicked={(e) => openReportModal(e.data)}
                        />
                    </div>
                </div>
            )}

            {/* 탭 1: 격리 보관 및 HOLD 현황 */}
            {activeTab === 1 && (
                <div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '16px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px', border: '1px solid #fecaca' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '20px' }}>🛑</span>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#b91c1c' }}>전용 격리 보관구역 (Quarantine Zone)</h3>
                            </div>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                                ISO 13485:2016 §8.3 및 ISO 22716 §8.4에 따라 부적합 원자재 및 반제품은 적색 식별표 부착 후 위험물/격리 전용 창고에 이격 보관되어 임의 반출 및 조제 투입이 원천 봉쇄됩니다.
                            </p>
                        </div>

                        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px', border: '1px solid #fed7aa' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '20px' }}>🏷️</span>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#c2410c' }}>부적합 식별표 (Hold Tagging) 원칙</h3>
                            </div>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                                식별 라벨에는 품목명, 품목코드, LOT 번호, 부적합 수량, 발생 일자 및 담당자 서명이 필수로 기재되어야 하며, 시스템 상태가 'RELEASED'로 승인되기 전까지 라벨을 훼손하거나 제거할 수 없습니다.
                            </p>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0' }}>
                            현재 격리 보관 및 HOLD 관리 대상 ({quarantineList.length}건)
                        </h4>

                        {quarantineList.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13px' }}>
                                현재 격리 보관 중인 부적합품이 없습니다. 모든 품목이 정상 출하 또는 종결되었습니다.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {quarantineList.map(item => (
                                    <div key={item.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '14px 18px',
                                        borderRadius: '8px',
                                        border: '1px solid #fecaca',
                                        backgroundColor: '#fff5f5'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <span style={{ fontSize: '24px' }}>🛑</span>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <span style={{ fontWeight: 800, color: '#b91c1c', fontSize: '14px' }}>{item.ncrNumber}</span>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{item.productName}</span>
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>({item.itemCode})</span>
                                                    <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '10px', fontWeight: 700 }}>
                                                        {item.severity}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#475569', display: 'flex', gap: '12px' }}>
                                                    <span>📦 LOT: <b>{item.lotNumber || '미상'}</b></span>
                                                    <span>수량: <b>{item.affectedQuantity?.toLocaleString()} {item.unit}</b></span>
                                                    <span>위치: <b>{item.quarantineLocation || '미지정'}</b></span>
                                                    <span>발생일: {item.occurredDate}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={() => openQuarantineModal(item)}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    borderRadius: '6px',
                                                    backgroundColor: '#ffffff',
                                                    border: '1px solid #f87171',
                                                    color: '#b91c1c',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                격리 위치/상태 변경
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openDispositionModal(item)}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    borderRadius: '6px',
                                                    backgroundColor: '#b91c1c',
                                                    border: 'none',
                                                    color: '#ffffff',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                처리방안 심의
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 탭 2: 처리(Disposition) 및 특채 심의 현황 */}
            {activeTab === 2 && (
                <div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '14px',
                        marginBottom: '16px'
                    }}>
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '16px', border: '1px solid #fee2e2' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>폐기 (Scrap)</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#991b1b' }}>
                                {ncrs.filter(x => x.dispositionType === 'SCRAP').length} <span style={{ fontSize: '11px', fontWeight: 500 }}>건</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>품질 복구 불가능 소각/폐수</div>
                        </div>

                        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '16px', border: '1px solid #ffedd5' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#ea580c', marginBottom: '4px' }}>공급사 반품 (Return)</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#c2410c' }}>
                                {ncrs.filter(x => x.dispositionType === 'RETURN_TO_SUPPLIER').length} <span style={{ fontSize: '11px', fontWeight: 500 }}>건</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>입고 불합격 원자재 반송/환불</div>
                        </div>

                        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '16px', border: '1px solid #ede9fe' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#7c3aed', marginBottom: '4px' }}>재작업 (Rework)</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#6b21a8' }}>
                                {ncrs.filter(x => x.dispositionType === 'REWORK').length} <span style={{ fontSize: '11px', fontWeight: 500 }}>건</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>승인된 SOP 지침 및 재검사</div>
                        </div>

                        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '16px', border: '1px solid #dbeafe' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', marginBottom: '4px' }}>특채 / 양보 (Concession)</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e40af' }}>
                                {ncrs.filter(x => x.dispositionType === 'CONCESSION').length} <span style={{ fontSize: '11px', fontWeight: 500 }}>건</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>안전성 무영향 타당성 승인</div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0' }}>
                            처리 방안 승인 내역 및 근거 사유
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {dispositionList.map(item => (
                                <div key={item.id} style={{
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#fafafa'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 800, color: '#1e40af' }}>{item.ncrNumber}</span>
                                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.title}</span>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                backgroundColor: item.dispositionType === 'CONCESSION' ? '#dbeafe' : item.dispositionType === 'REWORK' ? '#ede9fe' : '#fee2e2',
                                                color: item.dispositionType === 'CONCESSION' ? '#1e40af' : item.dispositionType === 'REWORK' ? '#6b21a8' : '#b91c1c'
                                            }}>
                                                {item.dispositionType}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            승인자: <b>{item.dispositionApprovedBy || '품질책임자'}</b> | 일시: {item.dispositionApprovedAt ? new Date(item.dispositionApprovedAt).toLocaleString() : '-'}
                                        </div>
                                    </div>

                                    {item.dispositionType === 'CONCESSION' && (
                                        <div style={{ marginTop: '8px', padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', marginBottom: '2px' }}>특채(Concession) 타당성 입증 근거 (ISO 13485:2016 §8.3):</div>
                                            <div style={{ fontSize: '12px', color: '#1e3a8a', lineHeight: 1.5 }}>{item.concessionJustification}</div>
                                        </div>
                                    )}

                                    {item.dispositionType === 'REWORK' && (
                                        <div style={{ marginTop: '8px', padding: '10px 14px', backgroundColor: '#faf5ff', borderRadius: '6px', borderLeft: '4px solid #a855f7' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b21a8', marginBottom: '2px' }}>재작업 작업지침 및 재검사 기준 (21 CFR 820.90):</div>
                                            <div style={{ fontSize: '12px', color: '#581c87', lineHeight: 1.5 }}>{item.reworkInstructions}</div>
                                        </div>
                                    )}

                                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#475569' }}>
                                        처리 상세 계획: {item.dispositionDetails || '등록된 상세 내용 없음'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 탭 3: 출하 승인 게이트 & 입고 부적합 연계 */}
            {activeTab === 3 && (
                <div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                        gap: '20px'
                    }}>
                        {/* 출하 적격성 진단기 */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '24px' }}>🚪</span>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>출하 승인 게이트 사전 적격성 진단 (Release Gate)</h3>
                            </div>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                                출하 승인(MARKET_RELEASE) 상신 전 완제품 또는 원자재에 미해결 부적합(NCR)이나 입고/완제품 불합격 건이 존재하는지 시스템적으로 교차 검증합니다.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>LOT 번호</label>
                                    <input
                                        type="text"
                                        placeholder="예: LOT-202610-FP02 또는 LOT-KOH-20261001"
                                        value={releaseGateQuery.lotNumber}
                                        onChange={e => setReleaseGateQuery(prev => ({ ...prev, lotNumber: e.target.value }))}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>입고(WMS) ID (선택)</label>
                                    <input
                                        type="number"
                                        placeholder="예: 1 또는 100"
                                        value={releaseGateQuery.inboundId}
                                        onChange={e => setReleaseGateQuery(prev => ({ ...prev, inboundId: e.target.value }))}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleRunReleaseCheck}
                                    disabled={releaseGateLoading}
                                    style={{
                                        padding: '10px 16px',
                                        backgroundColor: '#1e40af',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        cursor: releaseGateLoading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {releaseGateLoading ? '진단 중...' : '🔍 출하 적격성 검증 실행'}
                                </button>
                            </div>

                            {/* 진단 결과 카드 */}
                            {releaseGateResult && (
                                <div style={{
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: releaseGateResult.eligible ? '1px solid #86efac' : '1px solid #fca5a5',
                                    backgroundColor: releaseGateResult.eligible ? '#f0fdf4' : '#fef2f2'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '20px' }}>{releaseGateResult.eligible ? '✅' : '🚫'}</span>
                                        <span style={{
                                            fontSize: '15px',
                                            fontWeight: 800,
                                            color: releaseGateResult.eligible ? '#15803d' : '#b91c1c'
                                        }}>
                                            {releaseGateResult.eligible ? '출하 허용 (RELEASE PERMITTED)' : '출하 차단 (RELEASE BLOCKED)'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: releaseGateResult.eligible ? '#166534' : '#991b1b', lineHeight: 1.5, marginBottom: '8px' }}>
                                        {releaseGateResult.message}
                                    </div>

                                    {releaseGateResult.blockingNcrCount > 0 && (
                                        <div style={{ marginTop: '8px', borderTop: '1px dashed #f87171', paddingTop: '8px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
                                                출하를 차단 중인 활성 부적합 보고서 목록 ({releaseGateResult.blockingNcrCount}건):
                                            </div>
                                            {releaseGateResult.blockingNcrs.map(bn => (
                                                <div key={bn.id} style={{ fontSize: '11px', color: '#7f1d1d', marginBottom: '2px' }}>
                                                    • <b>{bn.ncrNumber}</b>: {bn.title} ({bn.status} / {bn.severity})
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 입고 불합격 건 원클릭 NCR 변환 가이드 */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '24px' }}>🚚</span>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>입고 검사(WmsInbound) 불합격 연동</h3>
                            </div>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                                WmsInbound(입고 5단계)에서 수입검사 또는 완제품 검사 결과가 '부적합'으로 판정된 건은 입고 번호(ID)를 통해 클릭 한 번으로 모든 원자재 정보, LOT, 공급사 및 불량 내역이 자동 바인딩된 정식 NCR을 발행할 수 있습니다.
                            </p>

                            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>빠른 NCR 변환 실행:</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="number"
                                        placeholder="입고 ID 입력 (예: 1)"
                                        id="quickInboundId"
                                        style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const idInput = document.getElementById('quickInboundId')?.value;
                                            if (!idInput) return toast.warning('입고 ID를 입력해주세요.');
                                            try {
                                                const res = await createNcrFromInbound(Number(idInput));
                                                toast.success(`입고 ID ${idInput}로부터 NCR(${res.ncrNumber})이 발행되었습니다.`);
                                                loadKpis();
                                                loadNcrs();
                                                setActiveTab(0);
                                            } catch (e) {
                                                console.error(e);
                                                toast.error(e.response?.data?.message || '변환 실패');
                                            }
                                        }}
                                        style={{
                                            padding: '8px 14px',
                                            backgroundColor: '#0d9488',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ➕ NCR 자동 생성
                                    </button>
                                </div>
                            </div>

                            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
                                💡 <b>DEC-09 무변경 보존 원칙</b>: 기존 WmsInbound의 5단계 입고 검사 절차는 100% 온전히 유지되며, 본 NCR 모듈과의 느슨한 결합(Loose Coupling)을 통해 입고 부적합의 격리 및 CAPA 연계를 독립적으로 확장 관리합니다.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 8. 전면 최대화 모달 4종 (96vw × 92vh, 인라인 스타일) */}
            {/* ========================================================================= */}

            {/* 모달 1: NCR 등록 / 수정 모달 */}
            {(modalMode === 'CREATE' || modalMode === 'EDIT') && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        {/* 모달 헤더 */}
                        <div style={{
                            padding: '18px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                    {modalMode === 'CREATE' ? '➕ 신규 부적합 보고서(NCR) 등록' : `✏️ 부적합 보고서 수정 (${selectedNcr?.ncrNumber})`}
                                </h2>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    ISO 13485:2016 §8.3 / ISO 22716:2007 §8.4 부적합품 식별 및 격리 통제
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* 모달 본문 (스크롤) */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        부적합 보고서 제목 <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="예: 원료 [포타슘하이드록사이드] 비중 기준치 상한 초과 부적합"
                                        value={formData.title}
                                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        발생 단계 <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <select
                                        value={formData.stage}
                                        onChange={e => setFormData(prev => ({ ...prev, stage: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                                    >
                                        {OCCURRENCE_STAGES.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        심각도 등급 <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <select
                                        value={formData.severity}
                                        onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                                    >
                                        {SEVERITIES.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        품목코드 <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="예: RM-KOH-01"
                                        value={formData.itemCode}
                                        onChange={e => setFormData(prev => ({ ...prev, itemCode: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        품목명 <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="예: 포타슘 하이드록사이드 45%액"
                                        value={formData.productName}
                                        onChange={e => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>LOT 번호</label>
                                    <input
                                        type="text"
                                        placeholder="예: LOT-KOH-20261001"
                                        value={formData.lotNumber}
                                        onChange={e => setFormData(prev => ({ ...prev, lotNumber: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>부적합 수량 / 단위</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="number"
                                            value={formData.affectedQuantity}
                                            onChange={e => setFormData(prev => ({ ...prev, affectedQuantity: Number(e.target.value) }))}
                                            style={{ flex: 2, padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                        <input
                                            type="text"
                                            value={formData.unit}
                                            onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                                            style={{ flex: 1, padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>공급사 / 제조소</label>
                                    <input
                                        type="text"
                                        placeholder="예: (주)화신화학소재"
                                        value={formData.supplierName}
                                        onChange={e => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>발생일자</label>
                                    <input
                                        type="date"
                                        value={formData.occurredDate}
                                        onChange={e => setFormData(prev => ({ ...prev, occurredDate: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            {/* 결함 상세 내용 */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    부적합 상세 내용 및 규격 이탈 현상 <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="측정된 시험 결과치와 표준 기준 규격 간의 이탈 수치, 외관 불량 현상 등을 상세히 서술하십시오."
                                    value={formData.defectDescription}
                                    onChange={e => setFormData(prev => ({ ...prev, defectDescription: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                />
                            </div>

                            {/* 초동 긴급 조치 */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    초동 긴급 조치 내용
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="발견 즉시 취해진 라인 가동 중지, 부적합 식별 라벨 부착, 보관 보류(HOLD) 등록 조치를 기록하십시오."
                                    value={formData.immediateAction}
                                    onChange={e => setFormData(prev => ({ ...prev, immediateAction: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                />
                            </div>

                            {/* 격리 상태 및 보관 위치 */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', padding: '16px', backgroundColor: '#fff5f5', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#991b1b', marginBottom: '6px' }}>격리 상태 설정</label>
                                    <select
                                        value={formData.quarantineStatus}
                                        onChange={e => setFormData(prev => ({ ...prev, quarantineStatus: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #f87171', borderRadius: '8px', fontSize: '13px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                                    >
                                        {QUARANTINE_STATUSES.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#991b1b', marginBottom: '6px' }}>물리적 격리 보관 장소</label>
                                    <input
                                        type="text"
                                        placeholder="예: 원자재 격리창고 Q-101"
                                        value={formData.quarantineLocation}
                                        onChange={e => setFormData(prev => ({ ...prev, quarantineLocation: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #f87171', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 모달 푸터 */}
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '10px',
                            backgroundColor: '#f8fafc'
                        }}>
                            <button
                                type="button"
                                onClick={closeModal}
                                style={{ padding: '10px 18px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={modalMode === 'CREATE' ? handleSaveCreate : handleSaveEdit}
                                style={{ padding: '10px 24px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                            >
                                {modalMode === 'CREATE' ? 'NCR 등록 및 격리 확정' : '수정 사항 저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 모달 2: 원인조사 & 처리판정(Disposition) 심의 모달 */}
            {modalMode === 'INVESTIGATION' && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '18px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#fff7ed'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#9a3412', margin: 0 }}>
                                    🔍 5-Why 및 어골도 기반 근본 원인 조사 ({selectedNcr?.ncrNumber})
                                </h2>
                                <span style={{ fontSize: '12px', color: '#c2410c' }}>
                                    품목: {selectedNcr?.productName} (LOT: {selectedNcr?.lotNumber})
                                </span>
                            </div>
                            <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#9a3412' }}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <div style={{ marginBottom: '16px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>발생 현상 요약:</div>
                                <div style={{ fontSize: '13px', color: '#0f172a' }}>{selectedNcr?.defectDescription}</div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    근본 원인 분석 (Root Cause Analysis - 5-Why / Fishbone) <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <textarea
                                    rows={8}
                                    placeholder="단순 작업자 실수가 아닌 4M(Man, Machine, Material, Method) 관점에서 '왜(Why)'를 5회 반복 추적하여 제도적/설비적 재발 방지 근본 원인을 도출하십시오."
                                    value={investigationData.rootCauseAnalysis}
                                    onChange={e => setInvestigationData(prev => ({ ...prev, rootCauseAnalysis: e.target.value }))}
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #fed7aa', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                />
                            </div>

                            <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <input
                                        type="checkbox"
                                        id="investCapaReq"
                                        checked={investigationData.capaRequired}
                                        onChange={e => setInvestigationData(prev => ({ ...prev, capaRequired: e.target.checked }))}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    <label htmlFor="investCapaReq" style={{ fontSize: '13px', fontWeight: 800, color: '#92400e', cursor: 'pointer' }}>
                                        시정 및 예방조치 (CAPA) 발행 필요 판정 (ISO 13485 §8.5)
                                    </label>
                                </div>
                                <textarea
                                    rows={3}
                                    placeholder="CAPA 발행 필요성 판단 근거 및 발행/미발행 사유를 기록하십시오."
                                    value={investigationData.capaRationale}
                                    onChange={e => setInvestigationData(prev => ({ ...prev, capaRationale: e.target.value }))}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
                            <button type="button" onClick={closeModal} style={{ padding: '10px 18px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>취소</button>
                            <button type="button" onClick={handleSaveInvestigation} style={{ padding: '10px 24px', backgroundColor: '#ea580c', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>원인 조사 제출 및 심의 요청</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 모달 3: 처리방안(Disposition) 및 특채 심의 모달 */}
            {modalMode === 'DISPOSITION' && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '18px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#eff6ff'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e40af', margin: 0 }}>
                                    ⚖️ 부적합품 처리방안(Disposition) 및 특채 심의 ({selectedNcr?.ncrNumber})
                                </h2>
                                <span style={{ fontSize: '12px', color: '#3b82f6' }}>
                                    품질책임자 공식 권한 승인 및 재작업/특채(Concession) 법적 타당성 검증
                                </span>
                            </div>
                            <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#1e40af' }}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    최종 처리(Disposition) 방안 선택 <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <select
                                    value={dispositionData.dispositionType}
                                    onChange={e => setDispositionData(prev => ({ ...prev, dispositionType: e.target.value }))}
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #93c5fd', borderRadius: '8px', fontSize: '14px', fontWeight: 700, color: '#1e40af', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                                >
                                    {DISPOSITION_TYPES.filter(x => x.value !== 'PENDING').map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 특채(Concession) 선택 시 타당성 근거 입력란 필수화 */}
                            {dispositionData.dispositionType === 'CONCESSION' && (
                                <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #93c5fd' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#1e40af', marginBottom: '6px' }}>
                                        특채(Concession/양보) 승인 타당성 사유 (ISO 13485:2016 §8.3 법적 필수) <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <p style={{ fontSize: '11px', color: '#3b82f6', margin: '0 0 8px 0' }}>
                                        기준 규격을 벗어난 제품을 출하 허용하기 위해서는 의도된 사용에 대한 안전성 및 유효성에 유해한 영향이 없음을 과학적/문서화된 근거로 입증해야 합니다.
                                    </p>
                                    <textarea
                                        rows={4}
                                        placeholder="예: 피부자극성/미생물 시험 100% 적합 확인 완료. 단순 외관 단상자 색차(Delta E 2.8)이나 법적 표시기재 사항 및 바코드 스캔 판독성 100% 충족하여 소비자 안전 및 효능에 무영향 입증됨."
                                        value={dispositionData.concessionJustification}
                                        onChange={e => setDispositionData(prev => ({ ...prev, concessionJustification: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #60a5fa', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                    />
                                </div>
                            )}

                            {/* 재작업(Rework) 선택 시 작업지침 및 재검사 기준 필수화 */}
                            {dispositionData.dispositionType === 'REWORK' && (
                                <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#faf5ff', borderRadius: '8px', border: '1px solid #c084fc' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#6b21a8', marginBottom: '6px' }}>
                                        재작업 작업지침서 및 재검사 판정 기준 (21 CFR 820.90 법적 필수) <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <p style={{ fontSize: '11px', color: '#9333ea', margin: '0 0 8px 0' }}>
                                        재작업으로 인한 추가적 부작용이 없음을 보증하기 위해 승인된 SOP 지침과 전수 재검사 기준을 명시해야 합니다.
                                    </p>
                                    <textarea
                                        rows={4}
                                        placeholder="예: SOP-PRD-CAP-02 준수: 캡핑 설비 헤드 교체 후 1,800병 전량 수동 토크 렌치 전수 재검사 실시(기준 5.0 kgf·cm), 이후 기밀성 진공 챔버 테스트 전수 합격 확인 후 출하 판정."
                                        value={dispositionData.reworkInstructions}
                                        onChange={e => setDispositionData(prev => ({ ...prev, reworkInstructions: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #a855f7', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                    />
                                </div>
                            )}

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    처리 세부 계획 및 실행 조건
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="폐기 처리 일정, 공급사 반품 및 대금 정산 조건, 관련 부서 협조 사항 등을 기록하십시오."
                                    value={dispositionData.dispositionDetails}
                                    onChange={e => setDispositionData(prev => ({ ...prev, dispositionDetails: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                />
                            </div>

                            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <input
                                        type="checkbox"
                                        id="dispCapaReq"
                                        checked={dispositionData.capaRequired}
                                        onChange={e => setDispositionData(prev => ({ ...prev, capaRequired: e.target.checked }))}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    <label htmlFor="dispCapaReq" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', cursor: 'pointer' }}>
                                        시정조치(CAPA) 연계 번호 지정 (Step 16 연계)
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    placeholder="연계할 CAPA 관리번호 (예: CAPA-202610-001)"
                                    value={dispositionData.capaReferenceId}
                                    onChange={e => setDispositionData(prev => ({ ...prev, capaReferenceId: e.target.value }))}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
                            <button type="button" onClick={closeModal} style={{ padding: '10px 18px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>취소</button>
                            <button type="button" onClick={handleSaveDisposition} style={{ padding: '10px 24px', backgroundColor: '#1e40af', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>품질책임자 처리방안 최종 승인</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 모달 4: 조치 과제(Action Items) 관리 모달 */}
            {modalMode === 'ACTIONS' && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '18px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#faf5ff'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#6b21a8', margin: 0 }}>
                                    🛠️ 부적합 조치 과제 및 재작업 실행 관리 ({selectedNcr?.ncrNumber})
                                </h2>
                                <span style={{ fontSize: '12px', color: '#9333ea' }}>
                                    품목: {selectedNcr?.productName} | 처리방안: {selectedNcr?.dispositionType}
                                </span>
                            </div>
                            <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#6b21a8' }}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {/* 신규 과제 등록 폼 */}
                            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>➕ 신규 조치 과제 등록</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>조치 유형</label>
                                        <select
                                            value={newActionItem.actionType}
                                            onChange={e => setNewActionItem(prev => ({ ...prev, actionType: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                                        >
                                            <option value="CORRECTION">초동 시정조치</option>
                                            <option value="PREVENTIVE">재발방지 대책</option>
                                            <option value="REWORK">재작업 수행</option>
                                            <option value="RE_INSPECTION">전수 재검사</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>담당자</label>
                                        <input
                                            type="text"
                                            value={newActionItem.assignee}
                                            onChange={e => setNewActionItem(prev => ({ ...prev, assignee: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>완료 마감일</label>
                                        <input
                                            type="date"
                                            value={newActionItem.dueDate}
                                            onChange={e => setNewActionItem(prev => ({ ...prev, dueDate: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="과제 실행 내용 및 구체적 조치 지침 입력..."
                                        value={newActionItem.description}
                                        onChange={e => setNewActionItem(prev => ({ ...prev, description: e.target.value }))}
                                        style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddActionItem}
                                        style={{ padding: '8px 16px', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                                    >
                                        과제 추가
                                    </button>
                                </div>
                            </div>

                            {/* 과제 목록 */}
                            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
                                등록된 조치 과제 목록 ({selectedNcr?.actionItems ? selectedNcr.actionItems.length : 0}건)
                            </h4>

                            {(!selectedNcr?.actionItems || selectedNcr.actionItems.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '13px' }}>
                                    등록된 조치 과제가 없습니다. 위 폼에서 새로운 과제를 등록하십시오.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {selectedNcr.actionItems.map(act => (
                                        <div key={act.id} style={{
                                            padding: '14px 18px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: '#ffffff',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', backgroundColor: '#ede9fe', padding: '2px 6px', borderRadius: '4px' }}>
                                                        {act.actionType}
                                                    </span>
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{act.description}</span>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        color: act.status === 'COMPLETED' ? '#15803d' : '#d97706',
                                                        backgroundColor: act.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7',
                                                        padding: '2px 7px',
                                                        borderRadius: '10px'
                                                    }}>
                                                        {act.status}
                                                    </span>
                                                    {act.verificationResult && act.verificationResult !== 'PENDING' && (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            color: act.verificationResult === 'PASS' ? '#0f766e' : '#b91c1c',
                                                            backgroundColor: act.verificationResult === 'PASS' ? '#ccfbf1' : '#fee2e2',
                                                            padding: '2px 7px',
                                                            borderRadius: '10px'
                                                        }}>
                                                            검증: {act.verificationResult}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                    담당자: <b>{act.assignee}</b> | 마감일: {act.dueDate || '미지정'}
                                                    {act.completedAt && ` | 완료일: ${new Date(act.completedAt).toLocaleDateString()}`}
                                                    {act.verifiedBy && ` | 검증자: ${act.verifiedBy} (${act.verificationNotes || ''})`}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {act.status !== 'COMPLETED' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCompleteActionItem(act.id)}
                                                        style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '5px', backgroundColor: '#10b981', color: '#fff', border: 'none', cursor: 'pointer' }}
                                                    >
                                                        완료 처리
                                                    </button>
                                                )}
                                                {act.status === 'COMPLETED' && act.verificationResult === 'PENDING' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleVerifyActionItem(act.id, 'PASS')}
                                                            style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '5px', backgroundColor: '#0d9488', color: '#fff', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            적합 검증
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleVerifyActionItem(act.id, 'FAIL')}
                                                            style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '5px', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            불합격
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteAction(act.id)}
                                                    style={{ padding: '5px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '5px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
                            <button type="button" onClick={closeModal} style={{ padding: '10px 24px', backgroundColor: '#6b21a8', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 모달 5: 격리 위치/상태 변경 모달 */}
            {modalMode === 'QUARANTINE' && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '500px',
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#b91c1c', margin: '0 0 12px 0' }}>
                            🛑 격리 보관 상태 및 위치 변경 ({selectedNcr?.ncrNumber})
                        </h3>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>격리 상태</label>
                            <select
                                value={quarantineData.quarantineStatus}
                                onChange={e => setQuarantineData(prev => ({ ...prev, quarantineStatus: e.target.value }))}
                                style={{ width: '100%', padding: '9px 12px', border: '1px solid #f87171', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                            >
                                {QUARANTINE_STATUSES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>물리적 격리 위치</label>
                            <input
                                type="text"
                                placeholder="예: 위험물 격리창고 Q-101"
                                value={quarantineData.quarantineLocation}
                                onChange={e => setQuarantineData(prev => ({ ...prev, quarantineLocation: e.target.value }))}
                                style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" onClick={closeModal} style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>취소</button>
                            <button type="button" onClick={handleSaveQuarantine} style={{ padding: '8px 18px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 모달 6: 최종 종결 확인 모달 */}
            {modalMode === 'CLOSE' && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '560px',
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', margin: '0 0 12px 0' }}>
                            ✅ 부적합 보고서(NCR) 최종 종결 확인 ({selectedNcr?.ncrNumber})
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                            모든 조치 과제와 재작업이 적합으로 검증되었음을 확인하고 최종 종결(Closed)합니다. 종결 시 격리 상태는 자동으로 해제됩니다.
                        </p>

                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                품질책임자 종결 확인 의견 <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <textarea
                                rows={4}
                                placeholder="예: 재작업 100% 전수 검사 적합 확인 및 공급사 8D 보고서 접수 완료로 최종 종결 승인함."
                                value={closureRemarks}
                                onChange={e => setClosureRemarks(e.target.value)}
                                style={{ width: '100%', padding: '9px 12px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" onClick={closeModal} style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>취소</button>
                            <button type="button" onClick={handleSaveClose} style={{ padding: '8px 20px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>최종 종결 승인</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 모달 7: 공식 NCR 감사 리포트 출력 미리보기 (Certificate of Nonconformance) */}
            {modalMode === 'REPORT' && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                    📄 공식 부적합 보고서 (Non-Conformance Report - {selectedNcr?.ncrNumber})
                                </h2>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    ISO 13485:2016 §8.3 / ISO 22716:2007 §8.4 / 21 CFR 820.90 규제 감사용 출력 양식
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    style={{
                                        padding: '7px 16px',
                                        backgroundColor: '#1e40af',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🖨️ 인쇄 / PDF 출력
                                </button>
                                <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                            </div>
                        </div>

                        {/* 리포트 본문 (인쇄용 레이아웃) */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '36px', backgroundColor: '#525659' }}>
                            <div style={{
                                maxWidth: '820px',
                                margin: '0 auto',
                                backgroundColor: '#ffffff',
                                padding: '48px',
                                borderRadius: '4px',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                color: '#0f172a'
                            }}>
                                {/* 문서 타이틀 */}
                                <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
                                    <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 6px 0', letterSpacing: '1px' }}>
                                        부 적 합 보 고 서 (NCR)
                                    </h1>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>
                                        NON-CONFORMANCE REPORT (ISO 13485:2016 §8.3 / ISO 22716:2007 §8.4)
                                    </div>
                                </div>

                                {/* 기본 메타 테이블 */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 700, width: '18%' }}>NCR 관리번호</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', width: '32%', fontWeight: 800, color: '#1e40af' }}>{selectedNcr?.ncrNumber}</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 700, width: '18%' }}>발생 일자</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', width: '32%' }}>{selectedNcr?.occurredDate}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 700 }}>발생 공정/단계</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{selectedNcr?.stage}</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 700 }}>심각도 등급</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 800, color: selectedNcr?.severity === 'CRITICAL' ? '#dc2626' : '#d97706' }}>{selectedNcr?.severity}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 700 }}>품목코드 / 품목명</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{selectedNcr?.itemCode} / <b>{selectedNcr?.productName}</b></td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 700 }}>LOT 번호</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 700 }}>{selectedNcr?.lotNumber || '미상'}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 700 }}>부적합 수량</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 700 }}>{selectedNcr?.affectedQuantity?.toLocaleString()} {selectedNcr?.unit}</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 700 }}>공급사 / 제조소</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{selectedNcr?.supplierName || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 700 }}>물리적 격리 상태</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#dc2626' }}>{selectedNcr?.quarantineStatus} ({selectedNcr?.quarantineLocation || '미지정'})</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 700 }}>발견자</td>
                                            <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{selectedNcr?.discoveredBy || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* 1. 부적합 현상 및 내용 */}
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, backgroundColor: '#f1f5f9', padding: '6px 10px', borderLeft: '4px solid #0f172a', marginBottom: '8px' }}>
                                        1. 부적합 현상 및 규격 이탈 내용 (Defect Description)
                                    </div>
                                    <div style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                        {selectedNcr?.defectDescription}
                                    </div>
                                </div>

                                {/* 2. 초동 조치 */}
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, backgroundColor: '#f1f5f9', padding: '6px 10px', borderLeft: '4px solid #0f172a', marginBottom: '8px' }}>
                                        2. 초동 긴급 조치 및 격리 내역 (Immediate Correction)
                                    </div>
                                    <div style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', lineHeight: 1.6 }}>
                                        {selectedNcr?.immediateAction || '현장 격리표 부착 및 보관 조치 완료'}
                                    </div>
                                </div>

                                {/* 3. 근본 원인 분석 */}
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, backgroundColor: '#f1f5f9', padding: '6px 10px', borderLeft: '4px solid #0f172a', marginBottom: '8px' }}>
                                        3. 근본 원인 분석 결과 (Root Cause Analysis - 5-Why)
                                    </div>
                                    <div style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                        {selectedNcr?.rootCauseAnalysis || '원인 조사 진행 중'}
                                    </div>
                                </div>

                                {/* 4. 처리 방안 심의 결과 */}
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, backgroundColor: '#f1f5f9', padding: '6px 10px', borderLeft: '4px solid #0f172a', marginBottom: '8px' }}>
                                        4. 처리 방안(Disposition) 및 특채(Concession) 심의
                                    </div>
                                    <div style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', lineHeight: 1.6 }}>
                                        <div style={{ marginBottom: '6px' }}>
                                            • 최종 처리 방안: <b>{selectedNcr?.dispositionType}</b>
                                        </div>
                                        {selectedNcr?.concessionJustification && (
                                            <div style={{ marginTop: '6px', color: '#1e40af' }}>
                                                • 특채 타당성 근거: {selectedNcr?.concessionJustification}
                                            </div>
                                        )}
                                        {selectedNcr?.reworkInstructions && (
                                            <div style={{ marginTop: '6px', color: '#6b21a8' }}>
                                                • 재작업 작업지침: {selectedNcr?.reworkInstructions}
                                            </div>
                                        )}
                                        <div style={{ marginTop: '6px', color: '#475569' }}>
                                            • 세부 실행 계획: {selectedNcr?.dispositionDetails || '-'}
                                        </div>
                                    </div>
                                </div>

                                {/* 5. 서명 및 승인란 */}
                                <div style={{ marginTop: '40px', borderTop: '2px solid #0f172a', paddingTop: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>작성 및 발견자</div>
                                            <div style={{ fontSize: '14px', fontWeight: 800 }}>{selectedNcr?.discoveredBy || '품질관리 담당자'}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>서명: (인)</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>원인 조사자</div>
                                            <div style={{ fontSize: '14px', fontWeight: 800 }}>품질보증팀 검토위원</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>서명: (인)</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>품질책임자 (최종 승인)</div>
                                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e40af' }}>{selectedNcr?.dispositionApprovedBy || '품질책임자 이신뢰'}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>전자승인 완료 (인)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
