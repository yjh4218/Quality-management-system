import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import {
    fetchControlledDocuments,
    fetchControlledDocumentById,
    fetchControlledDocumentRevisionHistory,
    fetchControlledDocumentMetrics,
    createControlledDocument,
    updateControlledDocument,
    createControlledDocumentRevision,
    updateControlledDocumentStatus,
    deleteControlledDocument
} from './api';
import { toast } from 'react-toastify';
import { usePermissions } from './usePermissions';

/**
 * 📂 통제문서 및 개정관리 (DMS) 페이지 - ControlledDocumentManagementPage
 * - 표준 QMS UI/UX 시스템 준수 (docs/ui-ux-guide.md):
 *   1. 3단계 표준 헤더 레이아웃 (타이틀, 도움말, 조회/초기화, 신규 제정 액션)
 *   2. KPI 서머리 카드 그리드 (전체/유효/검토중/초안/개정대체/폐기)
 *   3. 검색 필터 카드 (검색어, 유형, 제품군, 상태 드롭다운)
 *   4. 표준 AG-Grid (rowHeight={54}, 한국어 헤더, 태그 뱃지, 액션 버튼, CSV 다운로드)
 *   5. 4단계 고정 사이즈 표준 모달 (xl: 전문/이력 타임라인, lg: 제정/수정 폼, md: 개정 생성, sm: 상태전이/삭제확인)
 *   6. ISO 13485:2016 §4.2.4 & ISO 22716 §17 규제 정합 개정 추적성 보장
 */

// 문서 유형 계층 정의 (Level 1~4)
const DOC_TYPES = [
    { value: 'QUALITY_MANUAL', label: '품질매뉴얼 (QM)', level: 'Level 1', color: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe' },
    { value: 'SOP', label: '표준운영절차서 (SOP)', level: 'Level 2', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
    { value: 'DHF', label: '설계이력파일 (DHF)', level: 'Level 2', color: '#0891b2', bg: '#cffafe', border: '#a5f3fc' },
    { value: 'DMR', label: '제품표준서 (DMR)', level: 'Level 2', color: '#0d9488', bg: '#ccfbf1', border: '#99f6e4' },
    { value: 'WORK_INSTRUCTION', label: '작업지침서 (WI)', level: 'Level 3', color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
    { value: 'VALIDATION_REPORT', label: '밸리데이션보고서 (VR)', level: 'Level 3', color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
    { value: 'FORM', label: '품질양식/서식 (FORM)', level: 'Level 4', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
    { value: 'EXTERNAL_STANDARD', label: '대외규격/법규 (EXT)', level: 'Level 4', color: '#9333ea', bg: '#f3e8ff', border: '#e9d5ff' }
];

// 적용 제품군 정의
const TARGET_FAMILIES = [
    { value: 'COMMON', label: '공통(품질경영)', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
    { value: 'COSMETICS', label: '화장품 (ISO 22716)', color: '#db2777', bg: '#fce7f3', border: '#fbcfe8' },
    { value: 'MEDICAL_DEVICE', label: '의료기기 (ISO 13485)', color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' }
];

// 통제문서 라이프사이클 상태 구성
const STATUS_CONFIG = {
    EFFECTIVE: { label: '배포/유효', color: '#16a34a', bg: '#dcfce7', border: '#86efac', dot: '#22c55e' },
    UNDER_REVIEW: { label: '검토중', color: '#d97706', bg: '#fef3c7', border: '#fde68a', dot: '#f59e0b' },
    APPROVED: { label: '승인완료', color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe', dot: '#3b82f6' },
    DRAFT: { label: '작성중', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', dot: '#94a3b8' },
    SUPERSEDED: { label: '개정대체', color: '#9333ea', bg: '#f3e8ff', border: '#d8b4fe', dot: '#a855f7' },
    OBSOLETE: { label: '폐기', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', dot: '#ef4444' }
};

// 표준 템플릿 프리셋 6종
const TEMPLATE_PRESETS = [
    {
        name: '화장품 품질매뉴얼 (ISO 22716)',
        docNo: 'QM-COS-',
        title: '화장품 우수제조관리기준 품질매뉴얼',
        docType: 'QUALITY_MANUAL',
        targetFamily: 'COSMETICS',
        department: '품질보증팀',
        content: '# 제1장 총칙\n1.1 목적: 본 매뉴얼은 화장품법 및 ISO 22716:2007에 의거하여 화장품 제조 및 품질관리 기준을 규정함을 목적으로 한다.\n1.2 적용 범위: 본사 및 제조 협력사에서 기획, 개발, 제조, 검사, 보관 및 출하되는 모든 화장품 품목군에 적용한다.\n\n# 제2장 인력 및 조직\n2.1 품질책임자의 권한과 책임을 보장하며 독립된 품질 판정권을 부여한다.\n\n# 제3장 제조위생 및 품질관리\n3.1 교차오염 방지 구역 분리 및 청정도 관리를 이행한다.'
    },
    {
        name: '의료기기 품질매뉴얼 (ISO 13485)',
        docNo: 'QM-MD-',
        title: '의료기기 품질경영시스템 매뉴얼 (ISO 13485:2016)',
        docType: 'QUALITY_MANUAL',
        targetFamily: 'MEDICAL_DEVICE',
        department: 'RA/QA본부',
        content: '# 1. 적용범위 및 목적\n의료기기법 제6조 및 ISO 13485:2016에 준수하여 당사에서 설계, 개발, 제조 및 시판하는 의료기기의 안전성 및 유효성을 입증한다.\n\n# 2. 품질경영시스템 요구사항\n2.1 통제문서 및 전자기록(21 CFR Part 11) 관리 체계.\n2.2 위험관리(ISO 14971) 및 설계이력파일(DHF) 유지.'
    },
    {
        name: '통제문서 관리 절차서 (SOP)',
        docNo: 'SOP-QA-',
        title: '통제문서 및 개정관리 운영 절차서',
        docType: 'SOP',
        targetFamily: 'COMMON',
        department: '품질보증팀',
        content: '# 1. 목적\n모든 품질문서의 제정, 검토, 승인, 배포, 개정 및 폐기 절차를 체계적으로 통제하여 유효한 최신본만이 현장에 적용되도록 보장한다.\n\n# 2. 개정 통제 절차\n2.1 신규 개정판이 승인(EFFECTIVE)되면 기존 버전은 즉시 개정대체(SUPERSEDED)로 전환된다.\n2.2 구버전 문서의 현장 사용은 엄격히 금지된다.'
    },
    {
        name: 'CAPA 시정/예방조치 절차서',
        docNo: 'SOP-CAPA-',
        title: '시정 및 예방조치 (CAPA) 운영 표준절차서',
        docType: 'SOP',
        targetFamily: 'COMMON',
        department: '품질보증팀',
        content: '# 1. 목적\n부적합 사항 및 고객 불만의 근본 원인을 분석하고 재발 방지 조치를 실행 및 유효성 평가를 수행한다.\n\n# 2. CAPA 4단계 프로세스\n2.1 문제 식별 및 격리\n2.2 근본 원인 분석 (5-Why, Fishbone)\n2.3 시정조치 실행 계획 및 전개\n2.4 유효성 검증 및 공식 종결'
    },
    {
        name: 'DHF 작성 및 관리 지침서',
        docNo: 'WI-RND-',
        title: '설계이력파일 (DHF) 작성 및 관리 지침서',
        docType: 'DHF',
        targetFamily: 'MEDICAL_DEVICE',
        department: '연구개발팀',
        content: '# 1. 개요\nISO 13485 §7.3에 의거하여 설계개발 입력, 출력, 검증(Verification), 유효성확인(Validation) 및 이관 이력을 완결성 있게 관리한다.\n\n# 2. 필수 산출물\n- 사용자 요구사항 명세서 (URS)\n- 위험관리 파일 (ISO 14971)\n- V&V 종합 시험성적서'
    },
    {
        name: 'DMR 제품표준서 기본 양식',
        docNo: 'FORM-DMR-',
        title: '의료기기 제품표준서 (DMR) 표준 서식',
        docType: 'DMR',
        targetFamily: 'MEDICAL_DEVICE',
        department: '생산기술팀',
        content: '# 의료기기 제품표준서 (Device Master Record)\n1. 품목코드 / 품목명:\n2. 모델명 / 인허가 번호:\n3. UDI-DI 코드:\n4. 원자재 규격 및 BOM 명세:\n5. 제조 공정 흐름 및 작업 지침:\n6. 멸균 및 포장 사양 (UDI-PI 포함):\n7. 완제품 출하 검사 판정 기준:'
    }
];

const INITIAL_FORM_STATE = {
    docNo: '',
    title: '',
    docType: 'SOP',
    targetFamily: 'COMMON',
    revisionNo: 'Rev. 0',
    changeRationale: '최초 제정',
    department: '품질보증팀',
    authorName: '',
    reviewerName: '',
    approverName: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    content: ''
};

const ControlledDocumentManagementPage = ({ user, onNavigate }) => {
    const gridRef = useRef(null);
    const { canEdit: checkEdit, canDelete: checkDelete, isAdmin } = usePermissions(user);
    const hasEditPermission = isAdmin || checkEdit('controlledDocuments') || checkEdit('products');
    const hasDeletePermission = isAdmin || checkDelete('controlledDocuments') || checkDelete('products');

    // 데이터 상태
    const [documents, setDocuments] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);

    // KPI 지표 상태
    const [metrics, setMetrics] = useState({
        totalDocuments: 0,
        effectiveCount: 0,
        draftCount: 0,
        reviewCount: 0,
        approvedCount: 0,
        supersededCount: 0,
        obsoleteCount: 0,
        cosmeticsCount: 0,
        medicalDeviceCount: 0,
        commonCount: 0
    });

    // 검색 필터 상태
    const [keyword, setKeyword] = useState('');
    const [selectedDocType, setSelectedDocType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedFamily, setSelectedFamily] = useState('');

    // 상세 보기 모달 (xl: 1120px)
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState('content'); // 'content' | 'history' | 'info'
    const [revisionHistory, setRevisionHistory] = useState([]);

    // 등록/수정 모달 (lg: 880px)
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [saving, setSaving] = useState(false);

    // 개정(Revision) 생성 모달 (md: 640px)
    const [revisionModalOpen, setRevisionModalOpen] = useState(false);
    const [revisionFormData, setRevisionFormData] = useState({
        revisionNo: '',
        changeRationale: '',
        title: '',
        content: '',
        department: '',
        authorName: ''
    });

    // 상태 전이 모달 (sm: 440px)
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusFormData, setStatusFormData] = useState({
        status: 'UNDER_REVIEW',
        reason: ''
    });

    // 삭제 확인 모달 (sm: 420px)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTargetDoc, setDeleteTargetDoc] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // 1. KPI 지표 로드
    const loadMetrics = useCallback(async () => {
        try {
            const data = await fetchControlledDocumentMetrics();
            if (data) setMetrics(data);
        } catch (err) {
            console.error('[DMS] Failed to load metrics', err);
        }
    }, []);

    // 2. 문서 목록 로드
    const loadDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: 0,
                size: 500, // 그리드 클라이언트 페이징용
                keyword: keyword.trim() || undefined,
                docType: selectedDocType || undefined,
                status: selectedStatus || undefined,
                targetFamily: selectedFamily || undefined
            };
            const res = await fetchControlledDocuments(params);
            const pageData = res?.data || res;
            setDocuments(pageData?.content || []);
            setTotalElements(pageData?.totalElements || (pageData?.content || []).length);
        } catch (err) {
            console.error('[DMS] Failed to fetch documents', err);
            toast.error('통제문서 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [keyword, selectedDocType, selectedStatus, selectedFamily]);

    useEffect(() => {
        loadMetrics();
        loadDocuments();
    }, [loadMetrics, loadDocuments]);

    // 필터 초기화
    const handleReset = () => {
        setKeyword('');
        setSelectedDocType('');
        setSelectedStatus('');
        setSelectedFamily('');
        toast.info('검색 필터가 초기화되었습니다.');
    };

    // 상세 조회 모달 열기
    const handleOpenDetail = async (doc) => {
        try {
            const fullDoc = await fetchControlledDocumentById(doc.id);
            setSelectedDoc(fullDoc || doc);
            setActiveDetailTab('content');
            setDetailModalOpen(true);

            // 개정 이력 로드
            const history = await fetchControlledDocumentRevisionHistory(doc.docNo);
            setRevisionHistory(history || []);
        } catch (err) {
            console.error('[DMS] Failed to fetch document details', err);
            setSelectedDoc(doc);
            setDetailModalOpen(true);
        }
    };

    // 신규 등록 모달 열기
    const handleOpenCreate = () => {
        setIsEditMode(false);
        setFormData({
            ...INITIAL_FORM_STATE,
            authorName: user?.name || '품질관리자'
        });
        setCreateModalOpen(true);
    };

    // 수정 모달 열기
    const handleOpenEdit = (doc) => {
        setIsEditMode(true);
        setSelectedDoc(doc);
        setFormData({
            docNo: doc.docNo,
            title: doc.title,
            docType: doc.docType,
            targetFamily: doc.targetFamily,
            revisionNo: doc.revisionNo,
            changeRationale: doc.changeRationale || '',
            department: doc.department || '',
            authorName: doc.authorName || '',
            reviewerName: doc.reviewerName || '',
            approverName: doc.approverName || '',
            effectiveDate: doc.effectiveDate || '',
            expirationDate: doc.expirationDate || '',
            content: doc.content || ''
        });
        setCreateModalOpen(true);
    };

    // 템플릿 프리셋 적용
    const handleApplyTemplate = (preset) => {
        const randomNum = Math.floor(100 + Math.random() * 900);
        setFormData(prev => ({
            ...prev,
            docNo: preset.docNo + randomNum,
            title: preset.title,
            docType: preset.docType,
            targetFamily: preset.targetFamily,
            department: preset.department,
            content: preset.content
        }));
        toast.success(`[${preset.name}] 표준 서식이 폼에 적용되었습니다.`);
    };

    // 제정/수정 저장
    const handleSaveDocument = async (e) => {
        e.preventDefault();
        if (!formData.docNo.trim()) {
            toast.warning('문서 번호를 입력해 주세요.');
            return;
        }
        if (!formData.title.trim()) {
            toast.warning('문서 제목을 입력해 주세요.');
            return;
        }

        try {
            setSaving(true);
            if (isEditMode && selectedDoc) {
                await updateControlledDocument(selectedDoc.id, formData);
                toast.success(`통제문서 [${formData.docNo}]가 수정되었습니다.`);
            } else {
                await createControlledDocument(formData);
                toast.success(`신규 통제문서 [${formData.docNo}]가 등록되었습니다 (상태: DRAFT).`);
            }
            setCreateModalOpen(false);
            loadDocuments();
            loadMetrics();
        } catch (err) {
            toast.error(err.response?.data?.message || '저장 처리 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 개정(Revision) 모달 열기
    const handleOpenRevision = (doc) => {
        setSelectedDoc(doc);
        const currentInt = doc.revisionInt || 0;
        const nextRevNo = `Rev. ${currentInt + 1}.0`;
        setRevisionFormData({
            revisionNo: nextRevNo,
            changeRationale: '',
            title: doc.title,
            content: doc.content || '',
            department: doc.department || '',
            authorName: user?.name || '품질담당자'
        });
        setRevisionModalOpen(true);
    };

    // 개정판 저장
    const handleSaveRevision = async (e) => {
        e.preventDefault();
        if (!revisionFormData.changeRationale.trim()) {
            toast.warning('개정 사유(Change Rationale)는 규제 감사를 위한 필수 입력 항목입니다.');
            return;
        }

        try {
            setSaving(true);
            await createControlledDocumentRevision(selectedDoc.id, revisionFormData);
            toast.success(`신규 개정판 [${revisionFormData.revisionNo}] 초안이 생성되었습니다.`);
            setRevisionModalOpen(false);
            loadDocuments();
            loadMetrics();
        } catch (err) {
            toast.error(err.response?.data?.message || '개정판 생성 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 상태 전이 모달 열기
    const handleOpenStatus = (doc) => {
        setSelectedDoc(doc);
        setStatusFormData({
            status: doc.status === 'DRAFT' ? 'UNDER_REVIEW' : (doc.status === 'UNDER_REVIEW' ? 'APPROVED' : 'EFFECTIVE'),
            reason: ''
        });
        setStatusModalOpen(true);
    };

    // 상태 전이 실행
    const handleSaveStatus = async (e) => {
        e.preventDefault();
        if (!selectedDoc) return;
        try {
            setSaving(true);
            await updateControlledDocumentStatus(selectedDoc.id, statusFormData);
            const statusLabel = STATUS_CONFIG[statusFormData.status]?.label || statusFormData.status;
            toast.success(`문서 [${selectedDoc.docNo}]의 상태가 '${statusLabel}'(으)로 갱신되었습니다.`);
            setStatusModalOpen(false);
            loadDocuments();
            loadMetrics();
        } catch (err) {
            toast.error(err.response?.data?.message || '상태 변경 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // 삭제 모달 열기
    const handleOpenDelete = (doc) => {
        setDeleteTargetDoc(doc);
        setDeleteModalOpen(true);
    };

    // 삭제 실행 (안전 가드 적용)
    const handleConfirmDelete = async () => {
        if (!deleteTargetDoc) return;
        if (deleteTargetDoc.status === 'EFFECTIVE') {
            toast.error('현재 배포/유효(EFFECTIVE) 상태인 통제문서는 직접 삭제할 수 없습니다. 먼저 폐기(OBSOLETE) 처리를 진행하십시오.');
            setDeleteModalOpen(false);
            return;
        }

        try {
            setDeleting(true);
            await deleteControlledDocument(deleteTargetDoc.id);
            toast.success(`통제문서 [${deleteTargetDoc.docNo} (${deleteTargetDoc.revisionNo})]이(가) 안전하게 소프트 삭제되었습니다.`);
            setDeleteModalOpen(false);
            setDeleteTargetDoc(null);
            loadDocuments();
            loadMetrics();
        } catch (err) {
            toast.error(err.response?.data?.message || '삭제 중 오류가 발생했습니다.');
        } finally {
            setDeleting(false);
        }
    };

    // CSV 파일 다운로드
    const handleExportCsv = () => {
        if (!documents || documents.length === 0) {
            toast.warning('내보낼 데이터가 없습니다.');
            return;
        }

        const headers = ['문서번호', '개정번호', '문서제목', '문서유형', '제품군', '상태', '주관부서', '작성자', '효력발생일'];
        const rows = documents.map(d => [
            d.docNo,
            d.revisionNo,
            `"${(d.title || '').replace(/"/g, '""')}"`,
            d.docType,
            d.targetFamily,
            d.status,
            d.department || '',
            d.authorName || '',
            d.effectiveDate || ''
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `QMS_통제문서목록_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('통제문서 목록이 CSV 파일로 다운로드되었습니다.');
    };

    // AG-Grid 컬럼 정의 (ui-ux-guide.md rowHeight={54} 표준 준수)
    const columnDefs = useMemo(() => [
        {
            field: 'docNo',
            headerName: '문서 번호',
            width: 150,
            pinned: 'left',
            cellStyle: { display: 'flex', alignItems: 'center' },
            cellRenderer: (params) => (
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', cursor: 'pointer' }}>
                    {params.value}
                </span>
            )
        },
        {
            field: 'revisionNo',
            headerName: '개정',
            width: 100,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params) => (
                <span style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155'
                }}>
                    {params.value}
                </span>
            )
        },
        {
            field: 'title',
            headerName: '문서 제목',
            minWidth: 260,
            flex: 1,
            cellStyle: { display: 'flex', alignItems: 'center' },
            cellRenderer: (params) => (
                <span style={{ fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                    {params.value}
                </span>
            )
        },
        {
            field: 'docType',
            headerName: '유형 / 계층',
            width: 180,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params) => {
                const info = DOC_TYPES.find(t => t.value === params.value);
                return (
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: info?.bg || '#f1f5f9',
                        color: info?.color || '#475569',
                        border: `1px solid ${info?.border || '#cbd5e1'}`
                    }}>
                        {info?.level ? `[${info.level}] ` : ''}{info?.label || params.value}
                    </span>
                );
            }
        },
        {
            field: 'targetFamily',
            headerName: '적용 제품군',
            width: 140,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params) => {
                const info = TARGET_FAMILIES.find(f => f.value === params.value);
                return (
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '10px',
                        background: info?.bg || '#f1f5f9',
                        color: info?.color || '#475569',
                        border: `1px solid ${info?.border || '#cbd5e1'}`
                    }}>
                        {info?.label || params.value}
                    </span>
                );
            }
        },
        {
            field: 'status',
            headerName: '문서 상태',
            width: 130,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params) => {
                const info = STATUS_CONFIG[params.value] || { label: params.value, color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', dot: '#94a3b8' };
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: info.bg,
                        color: info.color,
                        border: `1px solid ${info.border}`
                    }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: info.dot }} />
                        {info.label}
                    </span>
                );
            }
        },
        {
            field: 'department',
            headerName: '주관 부서',
            width: 120,
            cellStyle: { display: 'flex', alignItems: 'center' }
        },
        {
            field: 'authorName',
            headerName: '작성자',
            width: 100,
            cellStyle: { display: 'flex', alignItems: 'center' }
        },
        {
            field: 'effectiveDate',
            headerName: '효력 발생일',
            width: 120,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }
        },
        {
            headerName: '관리 액션',
            width: 250,
            pinned: 'right',
            sortable: false,
            filter: false,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params) => {
                const doc = params.data;
                if (!doc) return null;
                return (
                    <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => handleOpenDetail(doc)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#1e293b',
                                cursor: 'pointer'
                            }}
                            title="문서 전문 열람 및 개정 타임라인"
                        >
                            🔍 상세
                        </button>
                        {doc.status === 'EFFECTIVE' && hasEditPermission && (
                            <button
                                type="button"
                                onClick={() => handleOpenRevision(doc)}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    border: '1px solid #d8b4fe',
                                    background: '#f3e8ff',
                                    color: '#9333ea',
                                    cursor: 'pointer'
                                }}
                                title="새 개정판(Revision) 초안 생성"
                            >
                                📝 개정
                            </button>
                        )}
                        {(doc.status === 'DRAFT' || doc.status === 'UNDER_REVIEW') && hasEditPermission && (
                            <button
                                type="button"
                                onClick={() => handleOpenEdit(doc)}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    border: '1px solid #fed7aa',
                                    background: '#fff7ed',
                                    color: '#ea580c',
                                    cursor: 'pointer'
                                }}
                                title="초안 내용 수정"
                            >
                                ✏️ 수정
                            </button>
                        )}
                        {hasEditPermission && (
                            <button
                                type="button"
                                onClick={() => handleOpenStatus(doc)}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    border: '1px solid #bfdbfe',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    cursor: 'pointer'
                                }}
                                title="문서 상태 전이 및 결재 승인"
                            >
                                🔄 상태
                            </button>
                        )}
                        {doc.status !== 'EFFECTIVE' && hasDeletePermission && (
                            <button
                                type="button"
                                onClick={() => handleOpenDelete(doc)}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    border: '1px solid #fecaca',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    cursor: 'pointer'
                                }}
                                title="소프트 딜리트"
                            >
                                ❌ 삭제
                            </button>
                        )}
                    </div>
                );
            }
        }
    ], [hasEditPermission, hasDeletePermission]);

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9', minHeight: '100%', width: '100%' }}>

            {/* 1. 3단계 표준 헤더 레이아웃 (ui-ux-guide.md 표준) */}
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
                {/* 1단계: 타이틀 및 핵심 액션 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            📂 통제문서 및 개정관리 (DMS)
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => onNavigate && onNavigate('sopManual')}
                            style={{
                                padding: '9px 18px',
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
                            📖 표준 SOP 열람
                        </button>
                        {hasEditPermission && (
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
                                ➕ 신규 통제문서 제정
                            </button>
                        )}
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
                        ISO 13485:2016 및 ISO 22716 규제 요구사항에 부합하는 품질경영 문서화 수명주기, 개정 이력 추적 및 유효성 관리 시스템
                    </div>
                </div>
            </div>

            {/* 2. 규제 기준 매뉴얼 가이드 배너 (DEC-10 표준) */}
            <RegulatoryManualBanner 
                pageKey="controlledDocuments" 
                standardLabel="ISO 13485:2016 §4.2 (문서화 요건) / ISO 22716 §17 (문서화)"
                onNavigate={onNavigate}
            />

            {/* 3. KPI 지표 요약 카드 그리드 (6종 상태 완비) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
            }}>
                {/* 전체 문서 */}
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>전체 통제문서</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        {metrics.totalDocuments} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#0284c7', marginTop: '2px' }}>관리 대상 품질문서</div>
                </div>

                {/* 유효/배포 */}
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #16a34a',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>유효/배포 (Effective)</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                        {metrics.effectiveCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>현재 현장 유효 적용본</div>
                </div>

                {/* 검토·결재중 */}
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #d97706',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>검토·결재중</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                        {metrics.reviewCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', marginTop: '2px' }}>품질 승인 대기 건</div>
                </div>

                {/* 작성중 */}
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #64748b',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>작성중 (Draft)</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#334155', marginTop: '4px' }}>
                        {metrics.draftCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>제정·개정 초안 작성</div>
                </div>

                {/* 개정대체 */}
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #9333ea',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#9333ea' }}>개정대체 (Superseded)</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#9333ea', marginTop: '4px' }}>
                        {metrics.supersededCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#9333ea', marginTop: '2px' }}>이전 개정 버전 보존</div>
                </div>

                {/* 폐기 */}
                <div style={{
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #dc2626',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>폐기 (Obsolete)</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                        {metrics.obsoleteCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', marginTop: '2px' }}>효력 상실 아카이브</div>
                </div>
            </div>

            {/* 4. 검색 필터 카드 (회색 배경 / 4열 그리드 규격) */}
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
                            🔍 문서 검색
                        </label>
                        <input
                            type="text"
                            placeholder="문서번호, 제목, 작성자, 부서 검색..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadDocuments()}
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
                            문서 유형 (계층)
                        </label>
                        <select
                            value={selectedDocType}
                            onChange={(e) => setSelectedDocType(e.target.value)}
                            style={{
                                width: '100%',
                                height: '38px',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '13px',
                                background: '#ffffff',
                                color: '#334155'
                            }}
                        >
                            <option value="">전체 문서 유형</option>
                            {DOC_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.level}: {t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                            적용 제품군
                        </label>
                        <select
                            value={selectedFamily}
                            onChange={(e) => setSelectedFamily(e.target.value)}
                            style={{
                                width: '100%',
                                height: '38px',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '13px',
                                background: '#ffffff',
                                color: '#334155'
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
                            문서 상태
                        </label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            style={{
                                width: '100%',
                                height: '38px',
                                padding: '8px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '13px',
                                background: '#ffffff',
                                color: '#334155'
                            }}
                        >
                            <option value="">전체 상태</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label} ({k})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 검색 하단 버튼 바 (ui-ux-guide.md 표준: 초기화 outline, 조회 primary) */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9'
                }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                        총 <strong style={{ color: '#2563eb' }}>{totalElements}</strong>건의 통제문서가 조회되었습니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={handleReset}
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
                            onClick={loadDocuments}
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

            {/* 5. 데이터 그리드 카드 (AG-Grid, rowHeight={54} 표준 준수) */}
            <div className="card" style={{
                padding: '20px 24px',
                borderRadius: '16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
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
                        📋 통제문서 목록 (행 클릭 시 상세 전문 및 개정 이력 조회)
                    </div>
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#1e293b',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        📊 결과 다운로드
                    </button>
                </div>

                <div className="ag-theme-alpine" style={{ height: '520px', width: '100%' }}>
                    <AgGridReact
                        ref={gridRef}
                        theme="legacy"
                        rowHeight={54}
                        rowData={documents}
                        columnDefs={columnDefs}
                        pagination={true}
                        paginationPageSize={50}
                        animateRows={true}
                        onRowClicked={(params) => handleOpenDetail(params.data)}
                        overlayLoadingTemplate="<span class='ag-overlay-loading-center'>통제문서 데이터를 불러오는 중입니다...</span>"
                        overlayNoRowsTemplate="<span class='ag-overlay-no-rows-center'>조회된 통제문서가 없습니다.</span>"
                    />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Modal 1: 상세 전문 및 개정 이력 타임라인 (xl: 1120px) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {detailModalOpen && selectedDoc && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
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
                            padding: '18px 24px',
                            backgroundColor: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', fontSize: '13px', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                                        {selectedDoc.docNo}
                                    </span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#475569', fontSize: '12px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                        {selectedDoc.revisionNo}
                                    </span>
                                    {(() => {
                                        const s = STATUS_CONFIG[selectedDoc.status] || { label: selectedDoc.status, color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' };
                                        return (
                                            <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                                                {s.label}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <h3 style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    {selectedDoc.title}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailModalOpen(false)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '24px',
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    cursor: 'pointer'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Tabs */}
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            padding: '0 24px',
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff'
                        }}>
                            <button
                                type="button"
                                onClick={() => setActiveDetailTab('content')}
                                style={{
                                    padding: '12px 18px',
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '13px',
                                    fontWeight: activeDetailTab === 'content' ? 800 : 600,
                                    color: activeDetailTab === 'content' ? '#2563eb' : '#64748b',
                                    borderBottom: activeDetailTab === 'content' ? '2px solid #2563eb' : '2px solid transparent',
                                    cursor: 'pointer'
                                }}
                            >
                                📄 문서 본문 전문
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveDetailTab('history')}
                                style={{
                                    padding: '12px 18px',
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '13px',
                                    fontWeight: activeDetailTab === 'history' ? 800 : 600,
                                    color: activeDetailTab === 'history' ? '#2563eb' : '#64748b',
                                    borderBottom: activeDetailTab === 'history' ? '2px solid #2563eb' : '2px solid transparent',
                                    cursor: 'pointer'
                                }}
                            >
                                ⏳ 전체 개정 이력 타임라인
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveDetailTab('info')}
                                style={{
                                    padding: '12px 18px',
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '13px',
                                    fontWeight: activeDetailTab === 'info' ? 800 : 600,
                                    color: activeDetailTab === 'info' ? '#2563eb' : '#64748b',
                                    borderBottom: activeDetailTab === 'info' ? '2px solid #2563eb' : '2px solid transparent',
                                    cursor: 'pointer'
                                }}
                            >
                                📋 규제 메타데이터 & 결재
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            {activeDetailTab === 'content' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: '12px',
                                        padding: '14px 18px',
                                        background: '#f8fafc',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '12px'
                                    }}>
                                        <div><span style={{ color: '#64748b' }}>주관 부서:</span> <strong>{selectedDoc.department || '-'}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>작성자:</span> <strong>{selectedDoc.authorName || '-'}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>승인자:</span> <strong>{selectedDoc.approverName || '-'}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>효력 발생일:</span> <strong style={{ fontFamily: 'monospace' }}>{selectedDoc.effectiveDate || '-'}</strong></div>
                                    </div>

                                    {selectedDoc.changeRationale && (
                                        <div style={{
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            background: '#fffbeb',
                                            border: '1px solid #fde68a',
                                            fontSize: '12.5px',
                                            color: '#92400e'
                                        }}>
                                            <strong>📝 개정 사유:</strong> {selectedDoc.changeRationale}
                                        </div>
                                    )}

                                    <div style={{
                                        padding: '20px',
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '10px',
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: 'sans-serif',
                                        fontSize: '13.5px',
                                        lineHeight: 1.7,
                                        color: '#1e293b',
                                        minHeight: '260px'
                                    }}>
                                        {selectedDoc.content || '본문 내용이 등록되어 있지 않습니다.'}
                                    </div>
                                </div>
                            )}

                            {activeDetailTab === 'history' && (
                                <div>
                                    <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 800, color: '#334155' }}>
                                        문서 [{selectedDoc.docNo}] 전체 버전 개정 추적표
                                    </h4>
                                    {revisionHistory.length === 0 ? (
                                        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                            등록된 개정 이력이 없습니다.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {revisionHistory.map((hist) => {
                                                const isCurrent = hist.id === selectedDoc.id;
                                                const s = STATUS_CONFIG[hist.status] || { label: hist.status, color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' };
                                                return (
                                                    <div
                                                        key={hist.id}
                                                        style={{
                                                            padding: '16px 20px',
                                                            borderRadius: '12px',
                                                            border: isCurrent ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                                            background: isCurrent ? '#eff6ff' : '#ffffff'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', fontSize: '13px' }}>
                                                                    {hist.revisionNo}
                                                                </span>
                                                                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                                                                    {s.label}
                                                                </span>
                                                                {isCurrent && (
                                                                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>(현재 열람 중)</span>
                                                                )}
                                                            </div>
                                                            <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                                                                효력일: {hist.effectiveDate || hist.createdAt?.split('T')[0] || '-'}
                                                            </span>
                                                        </div>
                                                        <div style={{ marginTop: '8px', fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                                                            {hist.title}
                                                        </div>
                                                        <div style={{
                                                            marginTop: '6px',
                                                            padding: '8px 12px',
                                                            borderRadius: '6px',
                                                            background: isCurrent ? '#ffffff' : '#f8fafc',
                                                            border: '1px solid #e2e8f0',
                                                            fontSize: '12px',
                                                            color: '#475569'
                                                        }}>
                                                            <strong>개정 사유:</strong> {hist.changeRationale || '최초 제정'}
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11.5px', color: '#64748b' }}>
                                                            <span>작성: {hist.authorName || '-'} / 승인: {hist.approverName || '-'}</span>
                                                            {!isCurrent && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenDetail(hist)}
                                                                    style={{
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        color: '#2563eb',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                        textDecoration: 'underline'
                                                                    }}
                                                                >
                                                                    이 버전 열람하기
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeDetailTab === 'info' && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '14px',
                                    padding: '18px 20px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '13px'
                                }}>
                                    <div><span style={{ color: '#64748b' }}>문서 식별 번호:</span> <strong>{selectedDoc.docNo}</strong></div>
                                    <div><span style={{ color: '#64748b' }}>개정 번호:</span> <strong>{selectedDoc.revisionNo}</strong></div>
                                    <div><span style={{ color: '#64748b' }}>계층 분류:</span> <strong>{selectedDoc.docType}</strong></div>
                                    <div><span style={{ color: '#64748b' }}>적용 규격:</span> <strong>{selectedDoc.targetFamily}</strong></div>
                                    <div><span style={{ color: '#64748b' }}>등록 일시:</span> <strong style={{ fontFamily: 'monospace' }}>{selectedDoc.createdAt || '-'}</strong></div>
                                    <div><span style={{ color: '#64748b' }}>최종 수정 일시:</span> <strong style={{ fontFamily: 'monospace' }}>{selectedDoc.updatedAt || '-'}</strong></div>
                                    <div><span style={{ color: '#64748b' }}>연동 전자결재 ID:</span> <strong>{selectedDoc.approvalDocId ? `#${selectedDoc.approvalDocId}` : '단독 승인'}</strong></div>
                                    <div><span style={{ color: '#64748b' }}>부모 문서 식별자:</span> <strong>{selectedDoc.parentDocumentId || '최초 원본'}</strong></div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '14px 24px',
                            backgroundColor: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                ISO 13485:2016 §4.2.4 & ISO 22716 §17 규제 통제문서 보존 표준
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {selectedDoc.status === 'EFFECTIVE' && hasEditPermission && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDetailModalOpen(false);
                                            handleOpenRevision(selectedDoc);
                                        }}
                                        style={{
                                            padding: '8px 18px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: '#9333ea',
                                            color: '#ffffff',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        📝 새 개정판(Revision) 생성
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setDetailModalOpen(false)}
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
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Modal 2: 신규 제정 / 내용 수정 모달 (최대 크기 전면 에디터) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {createModalOpen && (
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
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    {isEditMode ? '✏️ 통제문서 내용 수정' : '📄 신규 통제문서 제정 등록'}
                                </h3>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                    ISO 13485:2016 §4.2 및 ISO 22716 §17 품질문서화 기준 전문 전면 에디터
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                style={{ border: 'none', background: 'transparent', fontSize: '26px', fontWeight: 700, color: '#94a3b8', cursor: 'pointer' }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSaveDocument} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                
                                {/* 템플릿 프리셋 선택기 */}
                                {!isEditMode && (
                                    <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                                            ⚡ 표준 서식 템플릿 프리셋 적용 (클릭 시 자동 입력)
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {TEMPLATE_PRESETS.map((p, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleApplyTemplate(p)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #bfdbfe',
                                                        background: '#eff6ff',
                                                        color: '#2563eb',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Row 1: 문서번호, 개정번호, 유형(계층), 적용제품군 4열 그리드 */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            문서 번호 <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            disabled={isEditMode}
                                            placeholder="예: SOP-QA-001"
                                            value={formData.docNo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, docNo: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontFamily: 'monospace'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            개정 번호 <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            disabled={isEditMode}
                                            placeholder="Rev. 0"
                                            value={formData.revisionNo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, revisionNo: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontFamily: 'monospace'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            문서 유형 (계층)
                                        </label>
                                        <select
                                            value={formData.docType}
                                            onChange={(e) => setFormData(prev => ({ ...prev, docType: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px'
                                            }}
                                        >
                                            {DOC_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>{t.level}: {t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            적용 제품군 규격
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
                                                fontSize: '13px'
                                            }}
                                        >
                                            {TARGET_FAMILIES.map(f => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Row 2: 문서제목 (2열), 제정/개정 사유 요약 (2열) */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            문서 제목 <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="예: 통제문서 및 개정관리 운영 절차서"
                                            value={formData.title}
                                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                height: '38px',
                                                padding: '8px 12px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '13px'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            제정 / 개정 사유 요약
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: ISO 13485:2016 규제 요구사항 정합 제정"
                                            value={formData.changeRationale}
                                            onChange={(e) => setFormData(prev => ({ ...prev, changeRationale: e.target.value }))}
                                            style={{ width: '100%', height: '38px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                                        />
                                    </div>
                                </div>

                                {/* Row 3: 주관 부서, 작성자, 효력 발생일 */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            주관 부서
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.department}
                                            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                            style={{ width: '100%', height: '38px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            작성자
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.authorName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                                            style={{ width: '100%', height: '38px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            효력 발생일
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.effectiveDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                                            style={{ width: '100%', height: '38px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }}
                                        />
                                    </div>
                                </div>

                                {/* Row 4: 대형 문서 본문 에디터 (Flex 1, 최소 420px) */}
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '420px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                                            문서 본문 내용 (마크다운 / 표준 절차서 전문) <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                                            최대 편집 화면 제공 (줄바꿈 및 마크다운 서식 지원)
                                        </span>
                                    </div>
                                    <textarea
                                        placeholder="표준 절차서 또는 지침서 본문 내용을 작성해 주세요..."
                                        value={formData.content}
                                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            flex: 1,
                                            minHeight: '420px',
                                            padding: '16px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '13.5px',
                                            fontFamily: 'Consolas, Menlo, Monaco, monospace',
                                            lineHeight: 1.65,
                                            backgroundColor: '#fbfcfd',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Footer (ui-ux-guide.md 표준: 취소 왼쪽, 저장 오른쪽) */}
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
                                    onClick={() => setCreateModalOpen(false)}
                                    style={{
                                        padding: '9px 20px',
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
                                    disabled={saving}
                                    style={{
                                        padding: '9px 24px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        fontSize: '13px',
                                        fontWeight: 800,
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        opacity: saving ? 0.6 : 1
                                    }}
                                >
                                    {saving ? '저장 중...' : (isEditMode ? '수정 내용 저장' : '신규 문서 등록 (DRAFT)')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Modal 3: 새 개정판 (Revision) 초안 생성 모달 (최대 크기 전면 에디터) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {revisionModalOpen && selectedDoc && (
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
                        <div style={{
                            padding: '16px 24px',
                            backgroundColor: '#faf5ff',
                            borderBottom: '1px solid #e9d5ff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0
                        }}>
                            <div>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#9333ea', fontSize: '12px', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #d8b4fe' }}>
                                    {selectedDoc.docNo} (기존 {selectedDoc.revisionNo})
                                </span>
                                <h3 style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    새 개정판 (Revision) 초안 생성
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRevisionModalOpen(false)}
                                style={{ border: 'none', background: 'transparent', fontSize: '26px', fontWeight: 700, color: '#94a3b8', cursor: 'pointer' }}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSaveRevision} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    background: '#fffbeb',
                                    border: '1px solid #fde68a',
                                    fontSize: '12.5px',
                                    color: '#92400e',
                                    lineHeight: 1.5
                                }}>
                                    💡 <b>규제 개정 통제 안내 (ISO 13485)</b>: 기존 <b>{selectedDoc.revisionNo}</b> 문서를 모태로 신규 개정판 초안(DRAFT)을 생성합니다. 신규 개정이 최종 승인(EFFECTIVE)되면 기존 문서는 자동으로 <b>SUPERSEDED</b>로 대체 보존됩니다.
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 2fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            신규 개정 번호 <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="예: Rev. 2.0"
                                            value={revisionFormData.revisionNo}
                                            onChange={(e) => setRevisionFormData(prev => ({ ...prev, revisionNo: e.target.value }))}
                                            style={{ width: '100%', height: '38px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            문서 번호 (기준 원본)
                                        </label>
                                        <input
                                            type="text"
                                            disabled
                                            value={`${selectedDoc.docNo} (기존 ${selectedDoc.revisionNo})`}
                                            style={{ width: '100%', height: '38px', padding: '8px 12px', border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#64748b', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                            문서 제목
                                        </label>
                                        <input
                                            type="text"
                                            value={revisionFormData.title}
                                            onChange={(e) => setRevisionFormData(prev => ({ ...prev, title: e.target.value }))}
                                            style={{ width: '100%', height: '38px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                        개정 사유 (Change Rationale) <span style={{ color: '#dc2626' }}>* (ISO 13485 감사 추적 필수)</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        required
                                        placeholder="개정 배경 및 변경 요점을 구체적으로 기재하십시오 (감사로그 필수 추적 항목)"
                                        value={revisionFormData.changeRationale}
                                        onChange={(e) => setRevisionFormData(prev => ({ ...prev, changeRationale: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', lineHeight: 1.5 }}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '440px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                                            개정 본문 내용 (마크다운 / 표준 절차서 전문) <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                                            최대 편집 화면 제공 (줄바꿈 및 마크다운 서식 지원)
                                        </span>
                                    </div>
                                    <textarea
                                        value={revisionFormData.content}
                                        onChange={(e) => setRevisionFormData(prev => ({ ...prev, content: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            flex: 1,
                                            minHeight: '440px',
                                            padding: '16px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '13.5px',
                                            fontFamily: 'Consolas, Menlo, Monaco, monospace',
                                            lineHeight: 1.65,
                                            backgroundColor: '#fbfcfd',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>
                            </div>

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
                                    onClick={() => setRevisionModalOpen(false)}
                                    style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', background: '#9333ea', color: '#ffffff', fontSize: '13px', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
                                >
                                    {saving ? '생성 중...' : '개정판 초안 생성 (DRAFT)'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Modal 4: 상태 전이 모달 (sm: 440px) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {statusModalOpen && selectedDoc && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        maxWidth: '440px',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 20px',
                            backgroundColor: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                🔄 통제문서 상태 전이
                            </h3>
                            <button
                                type="button"
                                onClick={() => setStatusModalOpen(false)}
                                style={{ border: 'none', background: 'transparent', fontSize: '22px', fontWeight: 700, color: '#94a3b8', cursor: 'pointer' }}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSaveStatus} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>대상 문서:</span>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                                    {selectedDoc.docNo} ({selectedDoc.revisionNo})
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                    변경할 상태 선택
                                </label>
                                <select
                                    value={statusFormData.status}
                                    onChange={(e) => setStatusFormData(prev => ({ ...prev, status: e.target.value }))}
                                    style={{ width: '100%', height: '38px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                                >
                                    <option value="DRAFT">작성중 (DRAFT)</option>
                                    <option value="UNDER_REVIEW">검토중 (UNDER_REVIEW)</option>
                                    <option value="APPROVED">승인완료 (APPROVED)</option>
                                    <option value="EFFECTIVE">배포/유효 (EFFECTIVE - 구버전 자동 대체)</option>
                                    <option value="SUPERSEDED">개정대체 (SUPERSEDED)</option>
                                    <option value="OBSOLETE">폐기 (OBSOLETE)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                    상태 변경 사유
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: 품질책임자 검토 승인 완료"
                                    value={statusFormData.reason}
                                    onChange={(e) => setStatusFormData(prev => ({ ...prev, reason: e.target.value }))}
                                    style={{ width: '100%', height: '38px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setStatusModalOpen(false)}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontSize: '13px', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}
                                >
                                    {saving ? '처리 중...' : '상태 갱신'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Modal 5: 삭제 확인 모달 (sm: 420px, window.confirm 금지 표준 준수) */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {deleteModalOpen && deleteTargetDoc && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        maxWidth: '420px',
                        width: '100%',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>⚠️</span>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#dc2626' }}>
                                통제문서 삭제 확인
                            </h3>
                        </div>

                        <div style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.6 }}>
                            정말로 통제문서 <strong>[{deleteTargetDoc.docNo} ({deleteTargetDoc.revisionNo})]</strong>을(를) 삭제하시겠습니까?
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                🔒 <b>규제 감사 보존 안내</b>: ISO 13485 규정에 의거 물리적 영구 삭제되지 않으며 소프트 딜리트(is_deleted)로 안전하게 보존됩니다.
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                            <button
                                type="button"
                                onClick={() => setDeleteModalOpen(false)}
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
                                type="button"
                                disabled={deleting}
                                onClick={handleConfirmDelete}
                                style={{
                                    padding: '8px 22px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    cursor: deleting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {deleting ? '삭제 중...' : '삭제 실행'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ControlledDocumentManagementPage;
