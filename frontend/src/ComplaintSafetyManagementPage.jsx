import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import {
    fetchComplaintSafetyKpis,
    fetchComplaintSafetyEvaluations,
    fetchComplaintSafetyEvaluationById,
    createComplaintSafetyEvaluation,
    evaluateComplaintCausality,
    submitComplaintRegulatoryReport,
    recordComplaintInvestigation,
    closeComplaintSafetyEvaluation,
    addComplaintActionItem,
    updateComplaintActionItem,
    verifyComplaintActionItem,
    deleteComplaintActionItem,
    getClaims
} from './api';

const PRODUCT_TYPES = [
    { value: 'COSMETIC', label: '화장품 (ISO 22716 / 화장품 안전성 보고)' },
    { value: 'MEDICAL_DEVICE', label: '의료기기 (ISO 13485 / 21 CFR 820.198 MDR)' },
    { value: 'GENERAL', label: '일반 공산품' }
];

const ADVERSE_EVENT_CATEGORIES = [
    { value: 'SKIN_RASH_ERYTHEMA', label: '피부 발진 / 홍반', type: 'COSMETIC' },
    { value: 'ACUTE_CONTACT_DERMATITIS', label: '급성 접촉피부염', type: 'COSMETIC' },
    { value: 'PRURITUS_ITCHING', label: '가려움증 / 소양증', type: 'COSMETIC' },
    { value: 'ANGIOEDEMA_SWELLING', label: '혈관부종 / 안검 부종', type: 'COSMETIC' },
    { value: 'BURN_SCALD', label: '작열감 / 피부 열감', type: 'COSMETIC' },
    { value: 'CHEILITIS', label: '구순염 / 입술 균열', type: 'COSMETIC' },
    { value: 'OCULAR_IRRITATION', label: '안구 자극 / 눈시림', type: 'COSMETIC' },
    { value: 'LEAKAGE_MALFUNCTION', label: '약액 누출 / 실링 파손', type: 'MEDICAL_DEVICE' },
    { value: 'CONTAMINATION', label: '이물 혼입 / 오염', type: 'MEDICAL_DEVICE' },
    { value: 'MECHANICAL_RESISTANCE', label: '기계적 작동 불량 / 방아쇠 압력', type: 'MEDICAL_DEVICE' },
    { value: 'BIO_INCOMPATIBILITY', label: '생체 적합성 거부 반응', type: 'MEDICAL_DEVICE' },
    { value: 'OTHER', label: '기타 이상 증상', type: 'GENERAL' }
];

const CAUSALITY_GRADES = [
    { value: 'CERTAIN', label: '확실함 (Certain)', badgeColor: '#b91c1c', badgeBg: '#fee2e2' },
    { value: 'PROBABLE', label: '가능성 높음 (Probable)', badgeColor: '#c2410c', badgeBg: '#ffedd5' },
    { value: 'POSSIBLE', label: '가능함 (Possible)', badgeColor: '#b45309', badgeBg: '#fef3c7' },
    { value: 'UNLIKELY', label: '관련성 적음 (Unlikely)', badgeColor: '#15803d', badgeBg: '#dcfce7' },
    { value: 'CONDITIONAL', label: '조건부/평가중 (Conditional)', badgeColor: '#4338ca', badgeBg: '#e0e7ff' },
    { value: 'UNASSESSABLE', label: '평가 불가 (Unassessable)', badgeColor: '#64748b', badgeBg: '#f1f5f9' },
    { value: 'EVALUATING', label: '평가 대기 (Evaluating)', badgeColor: '#0369a1', badgeBg: '#e0f2fe' }
];

const REPORTABILITY_STATUSES = [
    { value: 'NOT_REPORTABLE', label: '보고 비대상', badgeColor: '#64748b', badgeBg: '#f1f5f9' },
    { value: 'REPORTABLE', label: '보고 대상 (기한 내 보고 필요)', badgeColor: '#b91c1c', badgeBg: '#fee2e2' },
    { value: 'REPORTED', label: '규제기관 보고 완료', badgeColor: '#15803d', badgeBg: '#dcfce7' },
    { value: 'EXEMPT', label: '보고 면제 승인', badgeColor: '#4338ca', badgeBg: '#e0e7ff' }
];

const EVALUATION_STATUSES = [
    { value: 'SUBMITTED', label: '접수 완료', color: '#0369a1', bg: '#e0f2fe' },
    { value: 'UNDER_REVIEW', label: '조사·검토 진행', color: '#b45309', bg: '#fef3c7' },
    { value: 'EVALUATED', label: '평가 판정 완료', color: '#4338ca', bg: '#e0e7ff' },
    { value: 'REPORTED', label: '규제보고 완료', color: '#c2410c', bg: '#ffedd5' },
    { value: 'CLOSED', label: '최종 종결', color: '#15803d', badgeBg: '#dcfce7' }
];

const ACTION_TYPES = [
    { value: 'CUSTOMER_FEEDBACK', label: '고객 안내 및 보상' },
    { value: 'SAMPLE_TESTING', label: '보존검체 / 회수품 시험' },
    { value: 'MFR_NOTIFICATION', label: '제조사 시정 요구 통보' },
    { value: 'AUTHORITY_REPORT', label: '식약처 / 규제당국 보고' },
    { value: 'LABEL_REVISION', label: '표시기재 및 주의사항 개정' },
    { value: 'RECALL_REVIEW', label: '제품 회수(Recall) 심의' },
    { value: 'CAPA_INITIATION', label: 'CAPA 시정예방조치 발의' }
];

export default function ComplaintSafetyManagementPage({ user, onNavigate }) {
    // 탭 상태 (1: 전체 목록, 2: 중대유해사례 & 식약처보고, 3: 인과관계심의, 4: LOT미상 분석)
    const [activeTab, setActiveTab] = useState(1);

    // KPI 상태
    const [kpis, setKpis] = useState({
        totalEvaluations: 0,
        seriousCases: 0,
        reportableCases: 0,
        underReviewCases: 0,
        unknownLotCases: 0,
        capaRequiredCases: 0
    });

    // 목록 데이터 및 로딩
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalElements, setTotalElements] = useState(0);

    // 검색 필터 상태
    const [searchFilters, setSearchFilters] = useState({
        keyword: '',
        productType: '',
        isSerious: '',
        causalityGrade: '',
        reportabilityStatus: '',
        isLotUnknown: '',
        evaluationStatus: '',
        startDate: '',
        endDate: ''
    });

    // 모달 상태
    const [selectedItem, setSelectedItem] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCausalityModalOpen, setIsCausalityModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // 신규 등록 폼 데이터
    const [formData, setFormData] = useState({
        claimId: null,
        claimNumber: '',
        title: '',
        productType: 'COSMETIC',
        itemCode: '',
        productName: '',
        lotNumber: '',
        isLotUnknown: false,
        manufacturer: '',
        receiptDate: new Date().toISOString().split('T')[0],
        evaluatorName: user?.name || user?.username || '안전관리자',
        evaluationDate: new Date().toISOString().split('T')[0],
        customerName: '',
        customerContact: '',
        patientAge: '',
        patientGender: 'UNKNOWN',
        adverseEventCategory: 'ACUTE_CONTACT_DERMATITIS',
        symptomDescription: '',
        onsetDays: 1,
        medicalTreatmentGiven: false,
        treatmentDetails: '',
        isSerious: false,
        seriousReason: '',
        investigationRequired: true,
        noInvestigationReason: ''
    });

    // 인과관계 평가 폼
    const [causalityForm, setCausalityForm] = useState({
        causalityGrade: 'PROBABLE',
        causalityRationale: '',
        isSerious: false,
        seriousReason: '',
        reportabilityStatus: 'REPORTABLE',
        reportDeadline: '',
        capaRequired: false,
        capaRationale: ''
    });

    // 식약처 보고 폼
    const [reportForm, setReportForm] = useState({
        reportabilityStatus: 'REPORTED',
        authorityReportDate: new Date().toISOString().split('T')[0],
        authorityReportNumber: '',
        authorityFeedback: ''
    });

    // 원인조사 폼
    const [investigationForm, setInvestigationForm] = useState({
        investigationRequired: true,
        noInvestigationReason: '',
        investigationSummary: '',
        capaRequired: false,
        capaRationale: '',
        capaNumber: ''
    });

    // 조치과제 신규 추가 폼
    const [newActionForm, setNewActionForm] = useState({
        actionType: 'CUSTOMER_FEEDBACK',
        title: '',
        description: '',
        assigneeName: '',
        assigneeDept: '',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    });

    // 종결 소견 폼
    const [closeForm, setCloseForm] = useState({
        closedBy: user?.name || user?.username || '품질책임자',
        closureRemarks: ''
    });

    // 기존 클레임 선택 목록
    const [existingClaims, setExistingClaims] = useState([]);
    const [selectedClaimId, setSelectedClaimId] = useState('');

    const gridRef = useRef(null);

    // 초기 데이터 로딩
    useEffect(() => {
        loadKpis();
        loadEvaluations();
        loadExistingClaims();
    }, []);

    const loadKpis = async () => {
        try {
            const data = await fetchComplaintSafetyKpis();
            setKpis(data);
        } catch (err) {
            console.error('KPI 로딩 실패:', err);
        }
    };

    const loadExistingClaims = async () => {
        try {
            const res = await getClaims();
            const list = res.data || (Array.isArray(res) ? res : []);
            setExistingClaims(list.slice(0, 50));
        } catch (err) {
            console.error('클레임 목록 로딩 실패:', err);
        }
    };

    const loadEvaluations = async () => {
        setLoading(true);
        try {
            const params = {
                page: 0,
                size: 200,
                keyword: searchFilters.keyword || undefined,
                productType: searchFilters.productType || undefined,
                isSerious: searchFilters.isSerious !== '' ? searchFilters.isSerious === 'true' : undefined,
                causalityGrade: searchFilters.causalityGrade || undefined,
                reportabilityStatus: searchFilters.reportabilityStatus || undefined,
                isLotUnknown: searchFilters.isLotUnknown !== '' ? searchFilters.isLotUnknown === 'true' : undefined,
                evaluationStatus: searchFilters.evaluationStatus || undefined,
                startDate: searchFilters.startDate || undefined,
                endDate: searchFilters.endDate || undefined
            };
            const data = await fetchComplaintSafetyEvaluations(params);
            const content = data.content || (Array.isArray(data) ? data : []);
            setEvaluations(content);
            setTotalElements(data.totalElements || content.length);
        } catch (err) {
            console.error('평가 목록 조회 실패:', err);
            toast.error('불만·이상사례 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        loadEvaluations();
    };

    const handleResetFilters = () => {
        setSearchFilters({
            keyword: '',
            productType: '',
            isSerious: '',
            causalityGrade: '',
            reportabilityStatus: '',
            isLotUnknown: '',
            evaluationStatus: '',
            startDate: '',
            endDate: ''
        });
        setTimeout(() => {
            loadEvaluations();
        }, 50);
    };

    // 클레임 선택 시 폼 자동 채움
    const handleSelectClaim = (claimId) => {
        setSelectedClaimId(claimId);
        if (!claimId) return;
        const claim = existingClaims.find(c => String(c.id) === String(claimId));
        if (claim) {
            const lotUnknown = Boolean(claim.isLotUnknown) || !claim.lotNumber || claim.lotNumber === 'LOT-미상';
            setFormData(prev => ({
                ...prev,
                claimId: claim.id,
                claimNumber: claim.claimNumber,
                title: `[클레임 연계] ${claim.productName || ''} 고객 이상사례 평가`,
                itemCode: claim.itemCode || '',
                productName: claim.productName || '',
                lotNumber: lotUnknown ? '' : (claim.lotNumber || ''),
                isLotUnknown: lotUnknown,
                manufacturer: claim.manufacturer || '',
                receiptDate: claim.receiptDate || new Date().toISOString().split('T')[0],
                symptomDescription: claim.claimContent || '',
                isSerious: Boolean(claim.isCriticalClaim),
                seriousReason: claim.isCriticalClaim ? '중대 클레임 지정 건' : ''
            }));
        }
    };

    // 신규 등록 제출
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.itemCode.trim() || !formData.productName.trim()) {
            toast.warn('제목, 품목코드, 제품명은 필수 입력 항목입니다.');
            return;
        }
        if (!formData.isLotUnknown && !formData.lotNumber.trim()) {
            toast.warn('LOT 번호를 입력하거나 "LOT 번호 미상"을 체크해주세요.');
            return;
        }
        if (!formData.investigationRequired && !formData.noInvestigationReason.trim()) {
            toast.warn('21 CFR 820.198(b) 규정에 따라 원인조사 미실시 시 사유를 반드시 입력해야 합니다.');
            return;
        }

        try {
            const payload = {
                ...formData,
                lotNumber: formData.isLotUnknown ? null : formData.lotNumber.trim(),
                patientAge: formData.patientAge ? parseInt(formData.patientAge, 10) : null
            };
            await createComplaintSafetyEvaluation(payload);
            toast.success('신규 불만·이상사례 평가서가 성공적으로 접수되었습니다.');
            setIsCreateModalOpen(false);
            loadKpis();
            loadEvaluations();
        } catch (err) {
            console.error('등록 실패:', err);
            toast.error(err.response?.data?.message || '접수 중 오류가 발생했습니다.');
        }
    };

    // 인과관계 심의 저장
    const handleCausalitySubmit = async (e) => {
        e.preventDefault();
        if (!selectedItem) return;
        try {
            await evaluateComplaintCausality(selectedItem.id, causalityForm);
            toast.success('인과관계 평가 및 심의 의결이 완료되었습니다.');
            setIsCausalityModalOpen(false);
            loadKpis();
            loadEvaluations();
        } catch (err) {
            console.error('인과관계 심의 실패:', err);
            toast.error(err.response?.data?.message || '심의 처리 중 오류가 발생했습니다.');
        }
    };

    // 식약처 보고 저장
    const handleReportSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItem) return;
        try {
            await submitComplaintRegulatoryReport(selectedItem.id, reportForm);
            toast.success('규제기관(식약처/FDA) 보고 정보가 정식 등록되었습니다.');
            setIsReportModalOpen(false);
            loadKpis();
            loadEvaluations();
        } catch (err) {
            console.error('보고 등록 실패:', err);
            toast.error(err.response?.data?.message || '보고 등록 중 오류가 발생했습니다.');
        }
    };

    // 원인조사 저장
    const handleInvestigationSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItem) return;
        if (!investigationForm.investigationRequired && !investigationForm.noInvestigationReason.trim()) {
            toast.warn('원인조사 미실시 시 사유를 입력해야 합니다.');
            return;
        }
        try {
            await recordComplaintInvestigation(selectedItem.id, investigationForm);
            toast.success('원인조사 및 CAPA 연계 정보가 저장되었습니다.');
            setIsInvestigationModalOpen(false);
            loadKpis();
            loadEvaluations();
        } catch (err) {
            console.error('조사 저장 실패:', err);
            toast.error(err.response?.data?.message || '저장 중 오류가 발생했습니다.');
        }
    };

    // 조치과제 추가
    const handleAddActionItem = async (e) => {
        e.preventDefault();
        if (!selectedItem || !newActionForm.title.trim() || !newActionForm.assigneeName.trim()) {
            toast.warn('조치 제목과 담당자 성명을 입력해주세요.');
            return;
        }
        try {
            await addComplaintActionItem(selectedItem.id, newActionForm);
            toast.success('후속 조치과제가 추가되었습니다.');
            const refreshed = await fetchComplaintSafetyEvaluationById(selectedItem.id);
            setSelectedItem(refreshed);
            setNewActionForm({
                actionType: 'CUSTOMER_FEEDBACK',
                title: '',
                description: '',
                assigneeName: '',
                assigneeDept: '',
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
            });
            loadEvaluations();
        } catch (err) {
            console.error('조치과제 추가 실패:', err);
            toast.error(err.response?.data?.message || '추가 실패');
        }
    };

    // 조치과제 완료 처리
    const handleCompleteActionItem = async (actionId) => {
        try {
            await updateComplaintActionItem(actionId, {
                status: 'COMPLETED',
                completedDate: new Date().toISOString().split('T')[0],
                actionResult: '조치 완료 보고'
            });
            toast.success('조치과제가 완료 처리되었습니다.');
            const refreshed = await fetchComplaintSafetyEvaluationById(selectedItem.id);
            setSelectedItem(refreshed);
            loadEvaluations();
        } catch (err) {
            toast.error('완료 처리 실패');
        }
    };

    // 조치과제 검증
    const handleVerifyActionItem = async (actionId, pass) => {
        try {
            await verifyComplaintActionItem(actionId, user?.name || user?.username || '품질관리자', pass ? 'PASS' : 'FAIL');
            toast.success(`조치과제 효과성 검증이 ${pass ? '적합(PASS)' : '불합격(FAIL)'} 처리되었습니다.`);
            const refreshed = await fetchComplaintSafetyEvaluationById(selectedItem.id);
            setSelectedItem(refreshed);
            loadEvaluations();
        } catch (err) {
            toast.error('검증 판정 실패');
        }
    };

    // 최종 종결
    const handleCloseSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItem) return;
        if (!closeForm.closureRemarks.trim()) {
            toast.warn('최종 종결 종합 소견을 입력해주세요.');
            return;
        }
        try {
            await closeComplaintSafetyEvaluation(selectedItem.id, closeForm);
            toast.success('불만·이상사례 평가가 최종 완료 종결되었습니다.');
            setIsActionModalOpen(false);
            loadKpis();
            loadEvaluations();
        } catch (err) {
            console.error('종결 실패:', err);
            toast.error(err.response?.data?.message || '종결 처리 중 오류가 발생했습니다.');
        }
    };

    // 모달 오픈 핸들러
    const openCausalityModal = (item) => {
        setSelectedItem(item);
        setCausalityForm({
            causalityGrade: item.causalityGrade || 'PROBABLE',
            causalityRationale: item.causalityRationale || '',
            isSerious: Boolean(item.isSerious),
            seriousReason: item.seriousReason || '',
            reportabilityStatus: item.reportabilityStatus || (item.isSerious ? 'REPORTABLE' : 'NOT_REPORTABLE'),
            reportDeadline: item.reportDeadline || (item.isSerious ? new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0] : ''),
            capaRequired: Boolean(item.capaRequired),
            capaRationale: item.capaRationale || ''
        });
        setIsCausalityModalOpen(true);
    };

    const openReportModal = (item) => {
        setSelectedItem(item);
        setReportForm({
            reportabilityStatus: item.reportabilityStatus === 'NOT_REPORTABLE' ? 'REPORTED' : item.reportabilityStatus,
            authorityReportDate: item.authorityReportDate || new Date().toISOString().split('T')[0],
            authorityReportNumber: item.authorityReportNumber || '',
            authorityFeedback: item.authorityFeedback || ''
        });
        setIsReportModalOpen(true);
    };

    const openInvestigationModal = (item) => {
        setSelectedItem(item);
        setInvestigationForm({
            investigationRequired: item.investigationRequired ?? true,
            noInvestigationReason: item.noInvestigationReason || '',
            investigationSummary: item.investigationSummary || '',
            capaRequired: Boolean(item.capaRequired),
            capaRationale: item.capaRationale || '',
            capaNumber: item.capaNumber || ''
        });
        setIsInvestigationModalOpen(true);
    };

    const openActionModal = async (item) => {
        try {
            const detail = await fetchComplaintSafetyEvaluationById(item.id);
            setSelectedItem(detail);
            setCloseForm({
                closedBy: user?.name || user?.username || '품질책임자',
                closureRemarks: detail.closureRemarks || ''
            });
            setIsActionModalOpen(true);
        } catch (err) {
            toast.error('상세 정보 조회 실패');
        }
    };

    const openPrintModal = async (item) => {
        try {
            const detail = await fetchComplaintSafetyEvaluationById(item.id);
            setSelectedItem(detail);
            setIsPrintModalOpen(true);
        } catch (err) {
            toast.error('인쇄 상세 정보 조회 실패');
        }
    };

    // AG Grid 컬럼 정의
    const columnDefs = useMemo(() => [
        {
            field: 'evaluationNumber',
            headerName: '평가번호',
            width: 155,
            pinned: 'left',
            cellRenderer: (p) => (
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <span style={{ fontWeight: 700, color: '#1e3a8a', fontFamily: 'monospace' }}>
                        {p.value}
                    </span>
                </div>
            )
        },
        {
            field: 'productType',
            headerName: '제품군',
            width: 105,
            cellRenderer: (p) => {
                const isCos = p.value === 'COSMETIC';
                return (
                    <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                        background: isCos ? '#fdf2f8' : '#e0e7ff', color: isCos ? '#be185d' : '#3730a3',
                        border: `1px solid ${isCos ? '#fbcfe8' : '#c7d2fe'}`
                    }}>
                        {isCos ? '화장품' : '의료기기'}
                    </span>
                );
            }
        },
        {
            field: 'title',
            headerName: '불만·이상사례 제목 및 증상',
            flex: 1,
            minWidth: 260,
            cellRenderer: (p) => (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.value}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {p.data?.productName} ({p.data?.itemCode})
                    </span>
                </div>
            )
        },
        {
            field: 'lotNumber',
            headerName: '제조번호(LOT)',
            width: 140,
            cellRenderer: (p) => {
                const isUnknown = p.data?.isLotUnknown || !p.value;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        {isUnknown ? (
                            <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                                background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca'
                            }} title="D-9 해소: 소비자의 용기 분실로 LOT 미상 접수 허용됨">
                                ⚠️ LOT 미상
                            </span>
                        ) : (
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                                {p.value}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            field: 'isSerious',
            headerName: '중대성',
            width: 100,
            cellRenderer: (p) => (
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    {p.value ? (
                        <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                            background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5'
                        }}>
                            🚨 중대 유해
                        </span>
                    ) : (
                        <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                            background: '#f1f5f9', color: '#475569'
                        }}>
                            일반
                        </span>
                    )}
                </div>
            )
        },
        {
            field: 'causalityGrade',
            headerName: '인과관계(WHO)',
            width: 145,
            cellRenderer: (p) => {
                const conf = CAUSALITY_GRADES.find(c => c.value === p.value) || CAUSALITY_GRADES[6];
                return (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                            background: conf.badgeBg, color: conf.badgeColor
                        }}>
                            {conf.label}
                        </span>
                    </div>
                );
            }
        },
        {
            field: 'reportabilityStatus',
            headerName: '식약처/MDR 보고',
            width: 140,
            cellRenderer: (p) => {
                const conf = REPORTABILITY_STATUSES.find(s => s.value === p.value) || REPORTABILITY_STATUSES[0];
                return (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                            background: conf.badgeBg, color: conf.badgeColor
                        }}>
                            {conf.label}
                        </span>
                    </div>
                );
            }
        },
        {
            field: 'evaluationStatus',
            headerName: '진행상태',
            width: 120,
            cellRenderer: (p) => {
                const conf = EVALUATION_STATUSES.find(s => s.value === p.value) || EVALUATION_STATUSES[0];
                return (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                            background: conf.bg, color: conf.color
                        }}>
                            {conf.label}
                        </span>
                    </div>
                );
            }
        },
        {
            field: 'capaStatus',
            headerName: 'CAPA 연계',
            width: 110,
            cellRenderer: (p) => {
                const hasCapa = p.value === 'REQUIRED' || p.value === 'LINKED';
                return (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        {hasCapa ? (
                            <span style={{
                                padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                                background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe'
                            }}>
                                🔗 {p.data?.capaNumber || 'CAPA 필수'}
                            </span>
                        ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>해당 없음</span>
                        )}
                    </div>
                );
            }
        },
        {
            headerName: '조치 및 심의 관리',
            width: 290,
            pinned: 'right',
            cellRenderer: (p) => {
                const item = p.data;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '100%' }}>
                        <button
                            type="button"
                            onClick={() => openCausalityModal(item)}
                            style={{
                                padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
                                background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'pointer'
                            }}
                            title="WHO-UMC 6단계 인과관계 평가 및 심의 의결"
                        >
                            🔬 인과관계
                        </button>
                        <button
                            type="button"
                            onClick={() => openReportModal(item)}
                            style={{
                                padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
                                background: '#fdf2f8', color: '#be185d', border: '1px solid #fbcfe8', cursor: 'pointer'
                            }}
                            title="식약처 신속보고(15일) 또는 FDA MDR 보고서 등록"
                        >
                            🏛️ 규제보고
                        </button>
                        <button
                            type="button"
                            onClick={() => openActionModal(item)}
                            style={{
                                padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
                                background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', cursor: 'pointer'
                            }}
                            title="후속 조치과제(Action Item) 관리 및 최종 종결"
                        >
                            📋 조치·종결
                        </button>
                        <button
                            type="button"
                            onClick={() => openPrintModal(item)}
                            style={{
                                padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
                                background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer'
                            }}
                            title="공식 A4 규제 감사 리포트 인쇄"
                        >
                            🖨️ 인쇄
                        </button>
                    </div>
                );
            }
        }
    ], []);

    // 탭별 필터링 데이터
    const filteredEvaluations = useMemo(() => {
        if (activeTab === 2) {
            // 중대 유해사례 또는 규제보고 대상
            return evaluations.filter(e => e.isSerious || e.reportabilityStatus === 'REPORTABLE' || e.reportabilityStatus === 'REPORTED');
        }
        if (activeTab === 3) {
            // 인과관계 검토 또는 원인조사 필요
            return evaluations.filter(e => e.evaluationStatus === 'UNDER_REVIEW' || e.causalityGrade === 'EVALUATING' || e.causalityGrade === 'CONDITIONAL');
        }
        if (activeTab === 4) {
            // D-9 실증: LOT 미상 접수 건
            return evaluations.filter(e => e.isLotUnknown || !e.lotNumber || e.lotNumber.includes('미상'));
        }
        return evaluations;
    }, [evaluations, activeTab]);

    return (
        <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
            {/* ========================================================================= */}
            {/* 1. 3단계 표준 헤더 레이아웃 */}
            {/* ========================================================================= */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>🛡️</span>
                        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                            고객 불만 및 시판 후 이상사례 평가 관리
                        </h1>
                        <span style={{
                            fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px',
                            background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe'
                        }}>
                            ISO 13485 §8.2.2 | ISO 22716 §10 | 21 CFR 820.198 | D-9 해소
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => {
                                if (gridRef.current?.api) {
                                    gridRef.current.api.exportDataAsCsv({ fileName: `complaints_safety_${new Date().toISOString().slice(0, 10)}.csv` });
                                }
                            }}
                            style={{
                                padding: '8px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                                fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            📥 CSV 내보내기
                        </button>
                        <button
                            type="button"
                            onClick={() => { loadKpis(); loadEvaluations(); }}
                            style={{
                                padding: '8px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                                fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            🔄 새로고침
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFormData({
                                    claimId: null,
                                    claimNumber: '',
                                    title: '',
                                    productType: 'COSMETIC',
                                    itemCode: '',
                                    productName: '',
                                    lotNumber: '',
                                    isLotUnknown: false,
                                    manufacturer: '',
                                    receiptDate: new Date().toISOString().split('T')[0],
                                    evaluatorName: user?.name || user?.username || '안전관리자',
                                    evaluationDate: new Date().toISOString().split('T')[0],
                                    customerName: '',
                                    customerContact: '',
                                    patientAge: '',
                                    patientGender: 'UNKNOWN',
                                    adverseEventCategory: 'ACUTE_CONTACT_DERMATITIS',
                                    symptomDescription: '',
                                    onsetDays: 1,
                                    medicalTreatmentGiven: false,
                                    treatmentDetails: '',
                                    isSerious: false,
                                    seriousReason: '',
                                    investigationRequired: true,
                                    noInvestigationReason: ''
                                });
                                setSelectedClaimId('');
                                setIsCreateModalOpen(true);
                            }}
                            style={{
                                padding: '8px 16px', background: '#1e40af', border: 'none', borderRadius: '6px',
                                fontSize: '13px', fontWeight: 700, color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: '0 2px 4px rgba(30, 64, 175, 0.2)'
                            }}
                        >
                            + 신규 불만·이상사례 접수
                        </button>
                    </div>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                    소비자 및 의료기관으로부터 인입되는 모든 고객 불만과 이상사례를 전수 수집하며, 포장재 분실 시에도 <b>'LOT 번호 미상'</b> 접수를 보장(D-9 해소)합니다.
                    WHO-UMC 의학적 인과관계 6단계 평가, 중대 사례 식약처 15일 신속보고 및 16단계 시정예방조치(CAPA)를 연계 통제합니다.
                </p>
                <RegulatoryManualBanner pageKey="complaintSafetyManagement" defaultExpanded={false} />
            </div>

            {/* ========================================================================= */}
            {/* 2. 6개 반응형 KPI 카드 그리드 */}
            {/* ========================================================================= */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>전체 불만·이상사례</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{kpis.totalEvaluations} <span style={{ fontSize: '13px', fontWeight: 500 }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#3b82f6' }}>중앙 집중 접수 누계</div>
                </div>
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>중대한 유해사례 (Serious)</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#b91c1c', margin: '4px 0' }}>{kpis.seriousCases} <span style={{ fontSize: '13px', fontWeight: 500 }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#ef4444' }}>입원·부종·전문의 진단 건</div>
                </div>
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>식약처/MDR 보고 대상</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#6d28d9', margin: '4px 0' }}>{kpis.reportableCases} <span style={{ fontSize: '13px', fontWeight: 500 }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#8b5cf6' }}>15일 이내 신속보고 관리</div>
                </div>
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>인과관계 조사 진행</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>{kpis.underReviewCases} <span style={{ fontSize: '13px', fontWeight: 500 }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#f59e0b' }}>WHO 6단계 의학적 심의</div>
                </div>
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f43f5e', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>LOT 미상 접수 [D-9]</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#e11d48', margin: '4px 0' }}>{kpis.unknownLotCases} <span style={{ fontSize: '13px', fontWeight: 500 }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#f43f5e' }}>용기 분실 클레임 구제</div>
                </div>
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>CAPA 연계 필요 건</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#4338ca', margin: '4px 0' }}>{kpis.capaRequiredCases} <span style={{ fontSize: '13px', fontWeight: 500 }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#6366f1' }}>16단계 시정예방조치 발의</div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. 다차원 검색 필터 카드 */}
            {/* ========================================================================= */}
            <form onSubmit={handleSearch} style={{
                background: '#ffffff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '14px',
                    marginBottom: '14px'
                }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            통합 검색어
                        </label>
                        <input
                            type="text"
                            placeholder="평가번호, 제품명, 품목코드, 고객명, LOT..."
                            value={searchFilters.keyword}
                            onChange={e => setSearchFilters(prev => ({ ...prev, keyword: e.target.value }))}
                            style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            제품 규제 유형
                        </label>
                        <select
                            value={searchFilters.productType}
                            onChange={e => setSearchFilters(prev => ({ ...prev, productType: e.target.value }))}
                            style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                        >
                            <option value="">전체 제품군</option>
                            <option value="COSMETIC">화장품</option>
                            <option value="MEDICAL_DEVICE">의료기기</option>
                            <option value="GENERAL">일반 공산품</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            중대성 여부
                        </label>
                        <select
                            value={searchFilters.isSerious}
                            onChange={e => setSearchFilters(prev => ({ ...prev, isSerious: e.target.value }))}
                            style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                        >
                            <option value="">전체 중대성</option>
                            <option value="true">🚨 중대한 유해사례 (입원·진료 등)</option>
                            <option value="false">일반 이상사례</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            인과관계 등급 (WHO-UMC)
                        </label>
                        <select
                            value={searchFilters.causalityGrade}
                            onChange={e => setSearchFilters(prev => ({ ...prev, causalityGrade: e.target.value }))}
                            style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                        >
                            <option value="">전체 인과관계</option>
                            {CAUSALITY_GRADES.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            식약처/MDR 보고 상태
                        </label>
                        <select
                            value={searchFilters.reportabilityStatus}
                            onChange={e => setSearchFilters(prev => ({ ...prev, reportabilityStatus: e.target.value }))}
                            style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                        >
                            <option value="">전체 보고 상태</option>
                            {REPORTABILITY_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            LOT 번호 미상 여부 [D-9]
                        </label>
                        <select
                            value={searchFilters.isLotUnknown}
                            onChange={e => setSearchFilters(prev => ({ ...prev, isLotUnknown: e.target.value }))}
                            style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                        >
                            <option value="">전체 LOT 접수 건</option>
                            <option value="true">⚠️ LOT 미상 접수 건만</option>
                            <option value="false">정상 LOT 번호 보유 건</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                        검색 결과: <b style={{ color: '#0f172a' }}>{totalElements}</b> 건
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            style={{
                                padding: '6px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                                fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer'
                            }}
                        >
                            ♻️ 초기화
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '6px 18px', background: '#2563eb', border: 'none', borderRadius: '6px',
                                fontSize: '13px', fontWeight: 700, color: '#ffffff', cursor: 'pointer'
                            }}
                        >
                            🔍 조회
                        </button>
                    </div>
                </div>
            </form>

            {/* ========================================================================= */}
            {/* 4. 4개 탭 및 AG Grid 메인 영역 */}
            {/* ========================================================================= */}
            <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* 탭 헤더 */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    {[
                        { id: 1, label: '📋 불만·이상사례 전체 목록', count: evaluations.length },
                        { id: 2, label: '🚨 중대 유해사례 & 식약처/MDR 보고', count: kpis.seriousCases },
                        { id: 3, label: '🔬 인과관계 및 원인조사 심의', count: kpis.underReviewCases },
                        { id: 4, label: '📦 [D-9] LOT 미상 불만 및 클레임 연계', count: kpis.unknownLotCases }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '12px 20px',
                                fontSize: '13px',
                                fontWeight: activeTab === tab.id ? 700 : 500,
                                color: activeTab === tab.id ? '#1e40af' : '#64748b',
                                border: 'none',
                                borderBottom: activeTab === tab.id ? '2px solid #1e40af' : '2px solid transparent',
                                background: activeTab === tab.id ? '#ffffff' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {tab.label}
                            <span style={{
                                padding: '1px 6px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: activeTab === tab.id ? '#dbeafe' : '#e2e8f0',
                                color: activeTab === tab.id ? '#1e40af' : '#475569'
                            }}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* AG Grid */}
                <div className="ag-theme-alpine" style={{ height: '520px', width: '100%' }}>
                    <AgGridReact
                        ref={gridRef}
                        rowData={filteredEvaluations}
                        columnDefs={columnDefs}
                        rowHeight={54}
                        headerHeight={48}
                        pagination={true}
                        paginationPageSize={50}
                        animateRows={true}
                        suppressCellFocus={true}
                        enableCellTextSelection={true}
                        overlayLoadingTemplate="<span class='ag-overlay-loading-center'>데이터를 불러오는 중입니다...</span>"
                        overlayNoRowsTemplate="<span class='ag-overlay-no-rows-center'>조회된 불만·이상사례 평가 내역이 없습니다.</span>"
                    />
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 5. 전면 최대화 모달 1: 신규 불만/이상사례 접수 모달 */}
            {/* ========================================================================= */}
            {isCreateModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                        background: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
                    }}>
                        {/* 모달 헤더 */}
                        <div style={{
                            padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    🆕 고객 불만 및 시판 후 이상사례 신규 접수
                                </h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                    ISO 13485:2016 §8.2.2 / ISO 22716:2007 §10 | D-9 해소: 소비자가 용기를 분실한 경우에도 LOT 미상으로 정상 접수 가능
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* 모달 바디 (스크롤) */}
                        <form id="create-eval-form" onSubmit={handleCreateSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {/* 기존 클레임 선택 배너 */}
                            <div style={{
                                padding: '12px 16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe',
                                marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                                <span style={{ fontSize: '20px' }}>🔗</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>
                                        기존 클레임(Claim) 연계 접수 (선택 사항)
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                                        CS/영업팀에서 기접수된 클레임을 선택하면 제품명, 품목코드, LOT, 클레임 내용이 자동 연동됩니다.
                                    </div>
                                </div>
                                <select
                                    value={selectedClaimId}
                                    onChange={e => handleSelectClaim(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '13px', background: '#ffffff', minWidth: '260px' }}
                                >
                                    <option value="">-- 직접 신규 입력 --</option>
                                    {existingClaims.map(c => (
                                        <option key={c.id} value={c.id}>
                                            [{c.claimNumber}] {c.productName} ({c.lotNumber || 'LOT 미상'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        보고서 제목 <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="예: 인텐시브 하이드레이팅 크림 사용 후 안면부 급성 접촉피부염 및 부종"
                                        value={formData.title}
                                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        제품 규제 분류 <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        value={formData.productType}
                                        onChange={e => setFormData(prev => ({ ...prev, productType: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    >
                                        {PRODUCT_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        품목코드 <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="COS-CREAM-001"
                                        value={formData.itemCode}
                                        onChange={e => setFormData(prev => ({ ...prev, itemCode: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        제품명 <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="인텐시브 하이드레이팅 크림"
                                        value={formData.productName}
                                        onChange={e => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                                            제조번호 (LOT)
                                        </label>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#b91c1c', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.isLotUnknown}
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        isLotUnknown: checked,
                                                        lotNumber: checked ? '' : prev.lotNumber
                                                    }));
                                                }}
                                            />
                                            [D-9] LOT 미상
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={formData.isLotUnknown ? '용기 분실로 LOT 미상 접수' : '예: 24K05'}
                                        disabled={formData.isLotUnknown}
                                        value={formData.lotNumber}
                                        onChange={e => setFormData(prev => ({ ...prev, lotNumber: e.target.value }))}
                                        style={{
                                            width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box',
                                            background: formData.isLotUnknown ? '#fef2f2' : '#ffffff', color: formData.isLotUnknown ? '#b91c1c' : '#0f172a'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        제조사
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="(주)코스메틱코리아"
                                        value={formData.manufacturer}
                                        onChange={e => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        인입 접수일자 <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.receiptDate}
                                        onChange={e => setFormData(prev => ({ ...prev, receiptDate: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        평가일자 <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.evaluationDate}
                                        onChange={e => setFormData(prev => ({ ...prev, evaluationDate: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        평가 담당자 성명 <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.evaluatorName}
                                        onChange={e => setFormData(prev => ({ ...prev, evaluatorName: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        이상사례 증상 범주 <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        value={formData.adverseEventCategory}
                                        onChange={e => setFormData(prev => ({ ...prev, adverseEventCategory: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    >
                                        {ADVERSE_EVENT_CATEGORIES.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        환자/고객 성명
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="홍길동"
                                        value={formData.customerName}
                                        onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        고객 연락처
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="010-0000-0000"
                                        value={formData.customerContact}
                                        onChange={e => setFormData(prev => ({ ...prev, customerContact: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        연령 (세)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="28"
                                        value={formData.patientAge}
                                        onChange={e => setFormData(prev => ({ ...prev, patientAge: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        성별
                                    </label>
                                    <select
                                        value={formData.patientGender}
                                        onChange={e => setFormData(prev => ({ ...prev, patientGender: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                    >
                                        <option value="FEMALE">여성</option>
                                        <option value="MALE">남성</option>
                                        <option value="UNKNOWN">미상 / 비공개</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    이상 증상 및 발생 경과 상세 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="제품 도포/사용 후 증상 발현 시점, 구체적 증상(가려움, 수포, 팽진 등), 제품 중단 후 호전 여부 등을 구체적으로 서술하십시오."
                                    value={formData.symptomDescription}
                                    onChange={e => setFormData(prev => ({ ...prev, symptomDescription: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', resize: 'vertical' }}
                                />
                            </div>

                            {/* 중대성 및 진료 내역 판정 */}
                            <div style={{
                                padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc',
                                marginBottom: '16px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '12px' }}>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#b91c1c', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.isSerious}
                                            onChange={e => setFormData(prev => ({ ...prev, isSerious: e.target.checked }))}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        🚨 중대한 유해사례 (Serious AE) 해당 여부
                                    </label>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.medicalTreatmentGiven}
                                            onChange={e => setFormData(prev => ({ ...prev, medicalTreatmentGiven: e.target.checked }))}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        🏥 병원 진료 및 처치 여부
                                    </label>
                                </div>
                                {formData.isSerious && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
                                            중대 사유 (사망, 입원, 영구장애, 전문의 진단서 발급 등)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: 대학병원 응급실 내원 및 전문의 급성 접촉피부염 진단서 발급"
                                            value={formData.seriousReason}
                                            onChange={e => setFormData(prev => ({ ...prev, seriousReason: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #fca5a5', borderRadius: '6px', boxSizing: 'border-box', background: '#fff5f5' }}
                                        />
                                    </div>
                                )}
                                {formData.medicalTreatmentGiven && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                            진료 내용 및 처방 세부사항
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="병원명, 진단명, 처방 약물(항히스타민제, 스테로이드 등)"
                                            value={formData.treatmentDetails}
                                            onChange={e => setFormData(prev => ({ ...prev, treatmentDetails: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 21 CFR 820.198(b) 원인조사 여부 */}
                            <div style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                                        원인조사 실시 여부 (21 CFR 820.198(b))
                                    </label>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="invReq"
                                            checked={formData.investigationRequired}
                                            onChange={() => setFormData(prev => ({ ...prev, investigationRequired: true }))}
                                        />
                                        조사 실시 (보존검체 시험, 공정 확인)
                                    </label>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="invReq"
                                            checked={!formData.investigationRequired}
                                            onChange={() => setFormData(prev => ({ ...prev, investigationRequired: false }))}
                                        />
                                        조사 미실시 (사유 필수)
                                    </label>
                                </div>
                                {!formData.investigationRequired && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#b91c1c', marginBottom: '4px' }}>
                                            조사 미실시 정당화 사유 (21 CFR 820.198(b) 법적 의무) <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="예: 제품 결함이 아닌 사용자 단순 취향 불만으로 확인되어 추가 기술조사 불필요"
                                            value={formData.noInvestigationReason}
                                            onChange={e => setFormData(prev => ({ ...prev, noInvestigationReason: e.target.value }))}
                                            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #fca5a5', borderRadius: '6px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </form>

                        {/* 모달 푸터 */}
                        <div style={{
                            padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                style={{
                                    padding: '8px 18px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px',
                                    fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer'
                                }}
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                form="create-eval-form"
                                style={{
                                    padding: '8px 24px', background: '#1e40af', border: 'none', borderRadius: '6px',
                                    fontSize: '13px', fontWeight: 700, color: '#ffffff', cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(30, 64, 175, 0.2)'
                                }}
                            >
                                불만·이상사례 접수 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 6. 모달 2: WHO-UMC 인과관계 평가 및 심의 모달 */}
            {/* ========================================================================= */}
            {isCausalityModalOpen && selectedItem && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                        background: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    🔬 WHO-UMC 6단계 인과관계 평가 및 심의 의결 [{selectedItem.evaluationNumber}]
                                </h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                    제품: {selectedItem.productName} ({selectedItem.itemCode}) | LOT: {selectedItem.lotNumber || '미상'}
                                </p>
                            </div>
                            <button type="button" onClick={() => setIsCausalityModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <form id="causality-form" onSubmit={handleCausalitySubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {/* 환자 증상 요약 카드 */}
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                                    📌 인입된 이상 증상 및 경과
                                </div>
                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                                    {selectedItem.symptomDescription}
                                </div>
                                {selectedItem.treatmentDetails && (
                                    <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '6px' }}>
                                        🏥 진료 내역: {selectedItem.treatmentDetails}
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                    WHO-UMC / 식약처 인과관계 판정 등급 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    {CAUSALITY_GRADES.slice(0, 6).map(g => (
                                        <div
                                            key={g.value}
                                            onClick={() => setCausalityForm(prev => ({
                                                ...prev,
                                                causalityGrade: g.value,
                                                capaRequired: (g.value === 'CERTAIN' || g.value === 'PROBABLE') && prev.isSerious
                                            }))}
                                            style={{
                                                padding: '12px', borderRadius: '8px', border: `2px solid ${causalityForm.causalityGrade === g.value ? g.badgeColor : '#e2e8f0'}`,
                                                background: causalityForm.causalityGrade === g.value ? g.badgeBg : '#ffffff',
                                                cursor: 'pointer', transition: 'all 0.15s'
                                            }}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: g.badgeColor, marginBottom: '4px' }}>
                                                {g.label}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                                                {g.criteria}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    인과관계 판단 근거 및 의학적 소견 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="사용 시점과 발현 간격, 제품 중단 후 호전 경과, 보존 검체 재시험 결과, 과거 알레르기 병력 등을 종합하여 인과관계를 입증하는 근거를 작성하십시오."
                                    value={causalityForm.causalityRationale}
                                    onChange={e => setCausalityForm(prev => ({ ...prev, causalityRationale: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{
                                padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc',
                                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px'
                            }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        규제기관 보고 대상 여부
                                    </label>
                                    <select
                                        value={causalityForm.reportabilityStatus}
                                        onChange={e => setCausalityForm(prev => ({ ...prev, reportabilityStatus: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    >
                                        {REPORTABILITY_STATUSES.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        16단계 CAPA 연계 여부
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginTop: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={causalityForm.capaRequired}
                                            onChange={e => setCausalityForm(prev => ({ ...prev, capaRequired: e.target.checked }))}
                                        />
                                        시정 및 예방조치(CAPA) 발의 필수 연계
                                    </label>
                                </div>
                            </div>
                        </form>

                        <div style={{
                            padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <button type="button" onClick={() => setIsCausalityModalOpen(false)} style={{ padding: '8px 18px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
                            <button type="submit" form="causality-form" style={{ padding: '8px 24px', background: '#1e40af', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>인과관계 판정 완료</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 7. 모달 3: 식약처 / FDA MDR 규제기관 보고 등록 모달 */}
            {/* ========================================================================= */}
            {isReportModalOpen && selectedItem && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                        background: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    🏛️ 식약처(KFDA) / FDA MDR 규제기관 보고 등록 [{selectedItem.evaluationNumber}]
                                </h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                    화장품법 제5조의2 (인지일로부터 15일 이내 신속보고) | 21 CFR 803 의료기기 이상사례 보고(MDR)
                                </p>
                            </div>
                            <button type="button" onClick={() => setIsReportModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <form id="report-form" onSubmit={handleReportSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <div style={{
                                padding: '14px 18px', background: '#fdf2f8', borderRadius: '8px', border: '1px solid #fbcfe8',
                                marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px'
                            }}>
                                <span style={{ fontSize: '24px' }}>⏳</span>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#9d174d' }}>
                                        법정 보고 기한: {selectedItem.reportDeadline || '기한 미설정'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#be185d' }}>
                                        중대한 유해사례 발생 시 인지한 날로부터 15일 이내 식약처 의약품안전나라 시스템을 통해 정식 보고해야 합니다.
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        보고 진행 상태 <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        value={reportForm.reportabilityStatus}
                                        onChange={e => setReportForm(prev => ({ ...prev, reportabilityStatus: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    >
                                        <option value="REPORTED">규제기관 보고 완료</option>
                                        <option value="REPORTABLE">보고 준비 중</option>
                                        <option value="EXEMPT">법적 면제 승인</option>
                                        <option value="NOT_REPORTABLE">보고 비대상 판정</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        실제 보고 일자 <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={reportForm.authorityReportDate}
                                        onChange={e => setReportForm(prev => ({ ...prev, authorityReportDate: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        규제기관 접수 번호 <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="예: KFDA-AE-2026-10492"
                                        value={reportForm.authorityReportNumber}
                                        onChange={e => setReportForm(prev => ({ ...prev, authorityReportNumber: e.target.value }))}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                    규제당국 회신 및 보완 지시 사항 (Authority Feedback)
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="식약처 또는 FDA 담당관의 유선 확인 사항, 보존검체 제출 요구, 추가 시험 요청 등을 기록하십시오."
                                    value={reportForm.authorityFeedback}
                                    onChange={e => setReportForm(prev => ({ ...prev, authorityFeedback: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                />
                            </div>
                        </form>

                        <div style={{
                            padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <button type="button" onClick={() => setIsReportModalOpen(false)} style={{ padding: '8px 18px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
                            <button type="submit" form="report-form" style={{ padding: '8px 24px', background: '#be185d', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>규제기관 보고 등록 완료</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 8. 모달 4: 후속 조치과제(Action Items) 관리 및 종결 모달 */}
            {/* ========================================================================= */}
            {isActionModalOpen && selectedItem && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                        background: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    📋 후속 조치과제 관리 및 최종 종결 [{selectedItem.evaluationNumber}]
                                </h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                    모든 후속 조치과제가 완료 및 효과성 검증(PASS)되어야 최종 종결(CLOSED) 처리할 수 있습니다.
                                </p>
                            </div>
                            <button type="button" onClick={() => setIsActionModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {/* 조치과제 목록 테이블 */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                                    과제 목록 (등록된 조치: {selectedItem.actionItems?.length || 0}건)
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                                            <th style={{ padding: '8px 12px' }}>과제번호</th>
                                            <th style={{ padding: '8px 12px' }}>유형</th>
                                            <th style={{ padding: '8px 12px' }}>제목 및 내용</th>
                                            <th style={{ padding: '8px 12px' }}>담당자</th>
                                            <th style={{ padding: '8px 12px' }}>기한</th>
                                            <th style={{ padding: '8px 12px' }}>상태</th>
                                            <th style={{ padding: '8px 12px' }}>효과성 검증</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>동작</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(!selectedItem.actionItems || selectedItem.actionItems.length === 0) ? (
                                            <tr>
                                                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                                    등록된 후속 조치과제가 없습니다. 하단에서 과제를 추가하십시오.
                                                </td>
                                            </tr>
                                        ) : (
                                            selectedItem.actionItems.map(item => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#1e3a8a' }}>
                                                        {item.actionItemNumber}
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span style={{ padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                                            {item.actionTypeDescription}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{item.description}</div>
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>{item.assigneeName} ({item.assigneeDept || '-'})</td>
                                                    <td style={{ padding: '8px 12px' }}>{item.dueDate}</td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span style={{
                                                            padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                                            background: item.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7',
                                                            color: item.status === 'COMPLETED' ? '#15803d' : '#b45309'
                                                        }}>
                                                            {item.status === 'COMPLETED' ? '완료' : '진행중'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span style={{
                                                            padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                                            background: item.verificationResult === 'PASS' ? '#dcfce7' : '#f1f5f9',
                                                            color: item.verificationResult === 'PASS' ? '#15803d' : '#64748b'
                                                        }}>
                                                            {item.verificationResult === 'PASS' ? '적합(PASS)' : '검증대기'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                        {item.status !== 'COMPLETED' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCompleteActionItem(item.id)}
                                                                style={{ padding: '2px 8px', fontSize: '11px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}
                                                            >
                                                                완료
                                                            </button>
                                                        )}
                                                        {item.status === 'COMPLETED' && item.verificationResult !== 'PASS' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleVerifyActionItem(item.id, true)}
                                                                style={{ padding: '2px 8px', fontSize: '11px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                            >
                                                                검증 승인
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* 신규 과제 추가 폼 */}
                            <form onSubmit={handleAddActionItem} style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                                    + 후속 조치과제 추가
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '10px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>과제 유형</label>
                                        <select
                                            value={newActionForm.actionType}
                                            onChange={e => setNewActionForm(prev => ({ ...prev, actionType: e.target.value }))}
                                            style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                        >
                                            {ACTION_TYPES.map(a => (
                                                <option key={a.value} value={a.value}>{a.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>과제명</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="예: 보존검체 미생물 한도시험 의뢰"
                                            value={newActionForm.title}
                                            onChange={e => setNewActionForm(prev => ({ ...prev, title: e.target.value }))}
                                            style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>담당자 성명</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="이품질"
                                            value={newActionForm.assigneeName}
                                            onChange={e => setNewActionForm(prev => ({ ...prev, assigneeName: e.target.value }))}
                                            style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>완료 예정일</label>
                                        <input
                                            type="date"
                                            required
                                            value={newActionForm.dueDate}
                                            onChange={e => setNewActionForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                            style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="과제 상세 내용 및 목표를 작성하십시오."
                                        value={newActionForm.description}
                                        onChange={e => setNewActionForm(prev => ({ ...prev, description: e.target.value }))}
                                        style={{ flex: 1, padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                    />
                                    <button
                                        type="submit"
                                        style={{ padding: '6px 16px', background: '#1e40af', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        과제 등록
                                    </button>
                                </div>
                            </form>

                            {/* 최종 종결 처리 섹션 */}
                            {selectedItem.evaluationStatus !== 'CLOSED' && (
                                <form onSubmit={handleCloseSubmit} style={{ padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>
                                        🏁 최종 완료 종결 승인
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#166534', marginBottom: '2px' }}>종결 승인자</label>
                                            <input
                                                type="text"
                                                required
                                                value={closeForm.closedBy}
                                                onChange={e => setCloseForm(prev => ({ ...prev, closedBy: e.target.value }))}
                                                style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid #86efac', borderRadius: '4px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#166534', marginBottom: '2px' }}>종결 종합 소견</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="모든 고객 안내, 시험검사 및 CAPA 연계 조치가 완료되어 종결 승인함"
                                                value={closeForm.closureRemarks}
                                                onChange={e => setCloseForm(prev => ({ ...prev, closureRemarks: e.target.value }))}
                                                style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid #86efac', borderRadius: '4px' }}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            style={{
                                                padding: '8px 24px', background: '#15803d', color: '#ffffff', border: 'none',
                                                borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                                            }}
                                        >
                                            최종 종결 승인
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div style={{
                            padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
                            display: 'flex', justifyContent: 'flex-end'
                        }}>
                            <button type="button" onClick={() => setIsActionModalOpen(false)} style={{ padding: '8px 20px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 9. 모달 5: 공식 A4 규제 감사 리포트 인쇄 뷰어 */}
            {/* ========================================================================= */}
            {isPrintModalOpen && selectedItem && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw', maxWidth: '1080px', height: '92vh', maxHeight: '94vh',
                        background: '#ffffff', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}>
                        <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px' }}>🖨️ 공식 A4 부작용 및 고객 불만 안전성 평가서 인쇄 뷰어</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" onClick={() => window.print()} style={{ padding: '6px 14px', background: '#1e40af', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>출력 (Print)</button>
                                <button type="button" onClick={() => setIsPrintModalOpen(false)} style={{ padding: '6px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>닫기</button>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '40px', background: '#ffffff', fontFamily: 'serif' }}>
                            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '24px' }}>
                                <h1 style={{ fontSize: '24px', margin: '0 0 6px 0', fontWeight: 900 }}>
                                    고객 불만 및 시판 후 이상사례 안전성 평가서
                                </h1>
                                <div style={{ fontSize: '13px', color: '#555' }}>
                                    ISO 13485:2016 §8.2.2 / ISO 22716:2007 §10 / 21 CFR 820.198 / 화장품 안전성 정보 보고 관리
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                                <tbody>
                                    <tr>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', width: '15%' }}>평가 번호</th>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1', width: '35%', fontWeight: 700 }}>{selectedItem.evaluationNumber}</td>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', width: '15%' }}>연계 클레임</th>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1', width: '35%' }}>{selectedItem.claimNumber || '직접 접수'}</td>
                                    </tr>
                                    <tr>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>제품명</th>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 700 }}>{selectedItem.productName} ({selectedItem.itemCode})</td>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>제조번호(LOT)</th>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 700, color: selectedItem.isLotUnknown ? '#b91c1c' : '#000' }}>
                                            {selectedItem.isLotUnknown ? '⚠️ LOT 미상 (소비자 용기 분실)' : (selectedItem.lotNumber || '-')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>제품 규제 분류</th>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{selectedItem.productTypeDescription}</td>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>제조사</th>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{selectedItem.manufacturer || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>접수일 / 평가일</th>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{selectedItem.receiptDate} / {selectedItem.evaluationDate}</td>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>평가 담당자</th>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{selectedItem.evaluatorName}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ fontSize: '14px', fontWeight: 800, borderLeft: '4px solid #1e3a8a', paddingLeft: '8px', marginBottom: '8px' }}>
                                1. 고객 이상 증상 및 진료 내역
                            </div>
                            <div style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
                                <div><b>이상사례 범주:</b> {selectedItem.adverseEventCategoryDescription}</div>
                                <div style={{ marginTop: '6px' }}><b>증상 상세:</b> {selectedItem.symptomDescription}</div>
                                {selectedItem.treatmentDetails && (
                                    <div style={{ marginTop: '6px', color: '#b91c1c' }}><b>진료 및 처방:</b> {selectedItem.treatmentDetails}</div>
                                )}
                            </div>

                            <div style={{ fontSize: '14px', fontWeight: 800, borderLeft: '4px solid #1e3a8a', paddingLeft: '8px', marginBottom: '8px' }}>
                                2. 의학적 인과관계 심의 (WHO-UMC 6단계)
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                                <tbody>
                                    <tr>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', width: '20%' }}>판정 등급</th>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 800, color: '#1e40af' }}>
                                            {selectedItem.causalityGradeLabel || '평가 대기'}
                                        </td>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', width: '20%' }}>중대 유해사례 여부</th>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 700, color: selectedItem.isSerious ? '#b91c1c' : '#334155' }}>
                                            {selectedItem.isSerious ? `예 (사유: ${selectedItem.seriousReason || '병원 진료'})` : '아니오 (일반)'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>인과관계 근거 소견</th>
                                        <td colSpan="3" style={{ padding: '8px', border: '1px solid #cbd5e1', lineHeight: 1.5 }}>
                                            {selectedItem.causalityRationale || '인과관계 심의 진행 중'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ fontSize: '14px', fontWeight: 800, borderLeft: '4px solid #1e3a8a', paddingLeft: '8px', marginBottom: '8px' }}>
                                3. 규제기관 보고 및 시정조치(CAPA)
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                                <tbody>
                                    <tr>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', width: '20%' }}>식약처/MDR 보고 상태</th>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 700 }}>
                                            {selectedItem.reportabilityStatusLabel} (접수번호: {selectedItem.authorityReportNumber || '-'})
                                        </td>
                                        <th style={{ padding: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', width: '20%' }}>16단계 CAPA 연계</th>
                                        <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 700 }}>
                                            {selectedItem.capaRequired ? `발의 완료 (${selectedItem.capaNumber || '번호 부여 대기'})` : '해당 없음'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px', gap: '30px' }}>
                                <div style={{ textAlign: 'center', width: '120px' }}>
                                    <div style={{ fontSize: '12px', marginBottom: '40px' }}>평가 담당자</div>
                                    <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '12px' }}>{selectedItem.evaluatorName} (인)</div>
                                </div>
                                <div style={{ textAlign: 'center', width: '120px' }}>
                                    <div style={{ fontSize: '12px', marginBottom: '40px' }}>품질/안전 책임자</div>
                                    <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '12px' }}>{selectedItem.closedBy || '승인 대기'} (인)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
