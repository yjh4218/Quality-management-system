import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import {
    fetchTrainingCourses,
    fetchTrainingCourseById,
    createTrainingCourse,
    updateTrainingCourse,
    deleteTrainingCourse,
    fetchTrainingRecords,
    fetchTrainingRecordById,
    createTrainingRecord,
    updateTrainingRecord,
    deleteTrainingRecord,
    fetchUserQualifications,
    fetchUserQualificationById,
    createUserQualification,
    updateUserQualification,
    deleteUserQualification,
    fetchTrainingMetrics
} from './api';
import { toast } from 'react-toastify';
import { usePermissions } from './usePermissions';

/**
 * 🎓 교육훈련 및 자격관리 (Training & Competence) 페이지
 * - ISO 13485:2016 §6.2 (인적 자원 - 적격성, 교육훈련 및 효과성 평가)
 * - ISO 22716:2007 §3 (인력 및 교육훈련 요건)
 * - 화장품법 제3조·제7조 (책임판매관리자 자격 및 법정의무교육)
 * 
 * [표준 QMS UI/UX 시스템 준수 (docs/ui-ux-guide.md)]:
 * 1. 3단계 표준 헤더 레이아웃 (타이틀, 배너, 가이드, 리프레시, 신규 액션 버튼)
 * 2. 6개 반응형 KPI 서머리 카드 그리드
 * 3. 3개 탭 구성 (📋 교육이수 기록, 📚 교육과정 마스터, 🏅 직무 자격 매트릭스)
 * 4. 통합 검색 필터 카드 (검색어, 카테고리, 상태, 제품군)
 * 5. 표준 AG-Grid (rowHeight={54}, 한국어 헤더, 태그 뱃지, 액션 버튼, CSV 다운로드)
 * 6. 최대화 반응형 모달 (96vw × 92vh, maxWidth: 1680px)
 */

// 교육 분류 정의
const CATEGORIES = [
    { value: 'GMP', label: 'GMP 우수제조', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
    { value: 'MEDICAL_DEVICE', label: '의료기기 규제/QMS', color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
    { value: 'QUALITY_GENERAL', label: '품질일반/SOP', color: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe' },
    { value: 'SECURITY', label: '정보보안/문서보안', color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe' },
    { value: 'SAFETY', label: '안전보건/위생관리', color: '#059669', bg: '#d1fae5', border: '#a7f3d0' }
];

// 적용 제품군
const TARGET_FAMILIES = [
    { value: 'COMMON', label: '공통(전사)', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
    { value: 'COSMETICS', label: '화장품 (ISO 22716)', color: '#db2777', bg: '#fce7f3', border: '#fbcfe8' },
    { value: 'MEDICAL_DEVICE', label: '의료기기 (ISO 13485)', color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' }
];

// 이수 상태
const COMPLETION_STATUSES = {
    COMPLETED: { label: '이수완료', color: '#16a34a', bg: '#dcfce7', border: '#86efac', dot: '#22c55e' },
    SCHEDULED: { label: '교육예정', color: '#0284c7', bg: '#e0f2fe', border: '#7dd3fc', dot: '#0ea5e9' },
    IN_PROGRESS: { label: '진행중', color: '#d97706', bg: '#fef3c7', border: '#fde68a', dot: '#f59e0b' },
    FAILED: { label: '미수료/과락', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', dot: '#ef4444' },
    EXPIRED: { label: '유효만료', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', dot: '#94a3b8' }
};

// 효과성 평가 상태 (ISO 13485 §6.2(c))
const EFFECTIVENESS_STATUSES = {
    EFFECTIVE: { label: '효과적(적합)', color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
    NEEDS_RETRAINING: { label: '재교육 필요', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
    PENDING: { label: '평가 대기', color: '#d97706', bg: '#fef3c7', border: '#fde68a' }
};

// 직무 자격 구분
const QUALIFICATION_TYPES = {
    LEGAL_MANDATORY: { label: '법정 필수인력', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
    INTERNAL_CERTIFIED: { label: '사내 공인자격', color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
    AUDITOR: { label: '내부심사원', color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe' },
    OPERATOR: { label: '핵심공정 작업자', color: '#059669', bg: '#d1fae5', border: '#a7f3d0' }
};

// 직무 자격 상태
const QUALIFICATION_STATUSES = {
    QUALIFIED: { label: '자격유효', color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
    CONDITIONAL: { label: '조건부 자격', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
    EXPIRED: { label: '기한만료', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
    SUSPENDED: { label: '자격정지', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' }
};

// 평가 방식
const EVALUATION_METHODS = [
    { value: 'WRITTEN_TEST', label: '필기시험 (객관식/주관식)' },
    { value: 'PRACTICAL_EVALUATION', label: '실기/작업 표준 평가' },
    { value: 'REPORT', label: '교육 결과보고서 검토' },
    { value: 'ATTENDANCE_ONLY', label: '출석 및 수료확인' }
];

const TrainingManagementPage = ({ user, onNavigate }) => {
    const { canEdit: checkEdit, canDelete: checkDelete, isAdmin } = usePermissions(user);
    const hasEditPermission = isAdmin || (checkEdit && checkEdit('trainingManagement')) || (checkEdit && checkEdit('products'));
    const hasDeletePermission = isAdmin || (checkDelete && checkDelete('trainingManagement')) || (checkDelete && checkDelete('products'));

    // 활성 탭: records (교육이수 기록), courses (교육과정 마스터), qualifications (직무자격)
    const [activeTab, setActiveTab] = useState('records');

    // 데이터 상태
    const [courses, setCourses] = useState([]);
    const [records, setRecords] = useState([]);
    const [qualifications, setQualifications] = useState([]);
    const [metrics, setMetrics] = useState({
        totalCourses: 0,
        activeCourses: 0,
        requiredCourses: 0,
        totalRecords: 0,
        completedRecords: 0,
        completionRate: 0,
        scheduledRecords: 0,
        expiringSoonRecords: 0,
        expiredRecords: 0,
        totalQualifications: 0,
        qualifiedUsers: 0,
        expiringSoonQualifications: 0
    });
    const [loading, setLoading] = useState(false);

    // 검색/필터 상태
    const [keyword, setKeyword] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [familyFilter, setFamilyFilter] = useState('');

    // 모달 상태
    const [recordModalOpen, setRecordModalOpen] = useState(false);
    const [courseModalOpen, setCourseModalOpen] = useState(false);
    const [qualificationModalOpen, setQualificationModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    // 편집 대상
    const [editingRecord, setEditingRecord] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);
    const [editingQualification, setEditingQualification] = useState(null);
    const [selectedDetail, setSelectedDetail] = useState(null);

    // 폼 상태
    const [recordForm, setRecordForm] = useState({
        courseId: '',
        username: user?.username || '',
        traineeName: user?.name || '',
        department: user?.department || '',
        position: user?.position || '',
        trainingDate: new Date().toISOString().substring(0, 10),
        expiryDate: '',
        completionStatus: 'COMPLETED',
        score: 85,
        evaluationMethod: 'WRITTEN_TEST',
        effectivenessEvaluation: 'PENDING',
        effectivenessEvaluator: '',
        effectivenessDate: '',
        effectivenessNotes: '',
        certificateUrl: '',
        remarks: ''
    });

    const [courseForm, setCourseForm] = useState({
        courseCode: '',
        courseName: '',
        category: 'GMP',
        targetFamily: 'COMMON',
        targetAudience: '',
        cycleMonths: 12,
        passingScore: 70,
        trainingHours: 2.0,
        isRequired: true,
        instructor: '',
        description: '',
        materialUrl: '',
        status: 'ACTIVE'
    });

    const [qualificationForm, setQualificationForm] = useState({
        username: user?.username || '',
        employeeName: user?.name || '',
        department: user?.department || '',
        position: user?.position || '',
        qualificationName: '',
        qualificationType: 'INTERNAL_CERTIFIED',
        qualificationStatus: 'QUALIFIED',
        certifiedDate: new Date().toISOString().substring(0, 10),
        expiryDate: '',
        requiredCourseCode: '',
        certificateNumber: '',
        authorizerName: user?.name || '품질책임자',
        remarks: ''
    });

    const recordsGridRef = useRef(null);
    const coursesGridRef = useRef(null);
    const qualificationsGridRef = useRef(null);

    // =========================================================================
    // 데이터 로드
    // =========================================================================

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [mRes, cRes, rRes, qRes] = await Promise.all([
                fetchTrainingMetrics().catch(() => null),
                fetchTrainingCourses({
                    category: categoryFilter || undefined,
                    targetFamily: familyFilter || undefined,
                    keyword: keyword.trim() || undefined
                }),
                fetchTrainingRecords({
                    category: categoryFilter || undefined,
                    completionStatus: statusFilter || undefined,
                    keyword: keyword.trim() || undefined
                }),
                fetchUserQualifications({
                    type: categoryFilter || undefined,
                    status: statusFilter || undefined,
                    keyword: keyword.trim() || undefined
                })
            ]);

            if (mRes) setMetrics(mRes);
            if (cRes?.data) setCourses(cRes.data);
            if (rRes?.data) setRecords(rRes.data);
            if (qRes?.data) setQualifications(qRes.data);
        } catch (error) {
            console.error('Failed to load training data:', error);
            toast.error('교육훈련 데이터 로드에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [categoryFilter, familyFilter, statusFilter, keyword]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // =========================================================================
    // 액션 핸들러 (Courses)
    // =========================================================================

    const handleOpenCreateCourse = () => {
        setEditingCourse(null);
        setCourseForm({
            courseCode: 'TC-' + (categoryFilter || 'GMP') + '-' + String(courses.length + 1).padStart(3, '0'),
            courseName: '',
            category: categoryFilter || 'GMP',
            targetFamily: 'COMMON',
            targetAudience: '품질/생산 임직원',
            cycleMonths: 12,
            passingScore: 70,
            trainingHours: 2.0,
            isRequired: true,
            instructor: '사내 품질책임자',
            description: '',
            materialUrl: '',
            status: 'ACTIVE'
        });
        setCourseModalOpen(true);
    };

    const handleOpenEditCourse = (course) => {
        setEditingCourse(course);
        setCourseForm({
            courseCode: course.courseCode,
            courseName: course.courseName,
            category: course.category,
            targetFamily: course.targetFamily || 'COMMON',
            targetAudience: course.targetAudience || '',
            cycleMonths: course.cycleMonths || 12,
            passingScore: course.passingScore || 70,
            trainingHours: course.trainingHours || 2.0,
            isRequired: course.isRequired ?? true,
            instructor: course.instructor || '',
            description: course.description || '',
            materialUrl: course.materialUrl || '',
            status: course.status || 'ACTIVE'
        });
        setCourseModalOpen(true);
    };

    const handleSaveCourse = async (e) => {
        e.preventDefault();
        if (!courseForm.courseCode.trim() || !courseForm.courseName.trim()) {
            toast.warn('과정 코드와 과정명을 입력해 주세요.');
            return;
        }

        try {
            if (editingCourse) {
                await updateTrainingCourse(editingCourse.id, courseForm);
                toast.success('교육과정이 성공적으로 수정되었습니다.');
            } else {
                await createTrainingCourse(courseForm);
                toast.success('신규 교육과정이 성공적으로 제정되었습니다.');
            }
            setCourseModalOpen(false);
            loadData();
        } catch (err) {
            console.error('Failed to save course:', err);
            toast.error(err.response?.data?.message || '교육과정 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteCourse = async (course) => {
        if (!window.confirm(`교육과정 [${course.courseCode} ${course.courseName}]을(를) 삭제하시겠습니까?`)) {
            return;
        }
        try {
            await deleteTrainingCourse(course.id);
            toast.success('교육과정이 삭제되었습니다.');
            loadData();
        } catch (err) {
            console.error('Failed to delete course:', err);
            toast.error(err.response?.data?.message || '교육과정 삭제에 실패했습니다.');
        }
    };

    // =========================================================================
    // 액션 핸들러 (Records)
    // =========================================================================

    const handleOpenCreateRecord = () => {
        setEditingRecord(null);
        setRecordForm({
            courseId: courses.length > 0 ? courses[0].id : '',
            username: user?.username || 'admin',
            traineeName: user?.name || '관리자',
            department: user?.department || '품질보증팀',
            position: user?.position || '책임연구원',
            trainingDate: new Date().toISOString().substring(0, 10),
            expiryDate: '',
            completionStatus: 'COMPLETED',
            score: 85,
            evaluationMethod: 'WRITTEN_TEST',
            effectivenessEvaluation: 'PENDING',
            effectivenessEvaluator: '',
            effectivenessDate: '',
            effectivenessNotes: '',
            certificateUrl: '',
            remarks: ''
        });
        setRecordModalOpen(true);
    };

    const handleOpenEditRecord = (record) => {
        setEditingRecord(record);
        setRecordForm({
            courseId: record.courseId,
            username: record.username,
            traineeName: record.traineeName,
            department: record.department || '',
            position: record.position || '',
            trainingDate: record.trainingDate,
            expiryDate: record.expiryDate || '',
            completionStatus: record.completionStatus,
            score: record.score ?? 80,
            evaluationMethod: record.evaluationMethod || 'WRITTEN_TEST',
            effectivenessEvaluation: record.effectivenessEvaluation || 'PENDING',
            effectivenessEvaluator: record.effectivenessEvaluator || '',
            effectivenessDate: record.effectivenessDate || '',
            effectivenessNotes: record.effectivenessNotes || '',
            certificateUrl: record.certificateUrl || '',
            remarks: record.remarks || ''
        });
        setRecordModalOpen(true);
    };

    const handleSaveRecord = async (e) => {
        e.preventDefault();
        if (!recordForm.courseId) {
            toast.warn('교육과정을 선택해 주세요.');
            return;
        }
        if (!recordForm.traineeName.trim()) {
            toast.warn('교육 대상자 성명을 입력해 주세요.');
            return;
        }

        try {
            if (editingRecord) {
                await updateTrainingRecord(editingRecord.id, recordForm);
                toast.success('교육이수 기록이 수정되었습니다.');
            } else {
                await createTrainingRecord(recordForm);
                toast.success('신규 교육이수 및 평가 기록이 등록되었습니다.');
            }
            setRecordModalOpen(false);
            loadData();
        } catch (err) {
            console.error('Failed to save record:', err);
            toast.error(err.response?.data?.message || '교육이수 기록 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteRecord = async (record) => {
        if (!window.confirm(`교육이수 기록 [${record.recordNo} - ${record.traineeName}]을(를) 삭제하시겠습니까?`)) {
            return;
        }
        try {
            await deleteTrainingRecord(record.id);
            toast.success('교육이수 기록이 삭제되었습니다.');
            loadData();
        } catch (err) {
            console.error('Failed to delete record:', err);
            toast.error(err.response?.data?.message || '교육이수 기록 삭제에 실패했습니다.');
        }
    };

    // =========================================================================
    // 액션 핸들러 (Qualifications)
    // =========================================================================

    const handleOpenCreateQualification = () => {
        setEditingQualification(null);
        setQualificationForm({
            username: user?.username || 'admin',
            employeeName: user?.name || '관리자',
            department: user?.department || '품질보증팀',
            position: user?.position || '책임연구원',
            qualificationName: 'ISO 13485 내부심사원 자격',
            qualificationType: 'INTERNAL_CERTIFIED',
            qualificationStatus: 'QUALIFIED',
            certifiedDate: new Date().toISOString().substring(0, 10),
            expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().substring(0, 10),
            requiredCourseCode: courses.length > 0 ? courses[0].courseCode : '',
            certificateNumber: 'CERT-' + new Date().getFullYear() + '-' + String(qualifications.length + 1).padStart(3, '0'),
            authorizerName: user?.name || '품질책임자',
            remarks: ''
        });
        setQualificationModalOpen(true);
    };

    const handleOpenEditQualification = (q) => {
        setEditingQualification(q);
        setQualificationForm({
            username: q.username,
            employeeName: q.employeeName || q.userName,
            department: q.department || '',
            position: q.position || '',
            qualificationName: q.qualificationName,
            qualificationType: q.qualificationType,
            qualificationStatus: q.qualificationStatus,
            certifiedDate: q.certifiedDate,
            expiryDate: q.expiryDate || '',
            requiredCourseCode: q.requiredCourseCode || '',
            certificateNumber: q.certificateNumber || '',
            authorizerName: q.authorizerName || '',
            remarks: q.remarks || ''
        });
        setQualificationModalOpen(true);
    };

    const handleSaveQualification = async (e) => {
        e.preventDefault();
        if (!qualificationForm.employeeName.trim() || !qualificationForm.qualificationName.trim()) {
            toast.warn('임직원 성명과 자격 명칭을 입력해 주세요.');
            return;
        }

        try {
            if (editingQualification) {
                await updateUserQualification(editingQualification.id, qualificationForm);
                toast.success('직무 자격 정보가 갱신되었습니다.');
            } else {
                await createUserQualification(qualificationForm);
                toast.success('신규 직무 자격이 부여되었습니다.');
            }
            setQualificationModalOpen(false);
            loadData();
        } catch (err) {
            console.error('Failed to save qualification:', err);
            toast.error(err.response?.data?.message || '직무 자격 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteQualification = async (q) => {
        if (!window.confirm(`직무 자격 [${q.qualificationName} - ${q.employeeName || q.userName}]을(를) 삭제하시겠습니까?`)) {
            return;
        }
        try {
            await deleteUserQualification(q.id);
            toast.success('직무 자격이 삭제되었습니다.');
            loadData();
        } catch (err) {
            console.error('Failed to delete qualification:', err);
            toast.error(err.response?.data?.message || '직무 자격 삭제에 실패했습니다.');
        }
    };

    // =========================================================================
    // 상세 조회 모달
    // =========================================================================

    const handleViewDetail = (item, type) => {
        setSelectedDetail({ item, type });
        setDetailModalOpen(true);
    };

    // 효과성 평가 즉시 갱신 (ISO 13485:2016 §6.2(c))
    const handleQuickEvaluateEffectiveness = async (recordId, evalStatus) => {
        try {
            const current = records.find(r => r.id === recordId);
            if (!current) return;

            await updateTrainingRecord(recordId, {
                ...current,
                effectivenessEvaluation: evalStatus,
                effectivenessEvaluator: user?.name || '품질책임자',
                effectivenessDate: new Date().toISOString().substring(0, 10),
                effectivenessNotes: evalStatus === 'EFFECTIVE' 
                    ? '현업 실무 적용 및 SOP 준수 상태 양호하여 효과성 입증됨.'
                    : '업무 적용 미흡으로 1개월 이내 보수 재교육 대상자로 지정함.'
            });

            toast.success(`효과성 평가가 [${evalStatus === 'EFFECTIVE' ? '효과적(적합)' : '재교육 필요'}]로 완료되었습니다.`);
            loadData();
            if (detailModalOpen && selectedDetail?.item?.id === recordId) {
                const refreshed = await fetchTrainingRecordById(recordId);
                setSelectedDetail({ item: refreshed, type: 'record' });
            }
        } catch (err) {
            console.error('Failed to evaluate effectiveness:', err);
            toast.error('효과성 평가 저장에 실패했습니다.');
        }
    };

    // =========================================================================
    // AG Grid 컬럼 정의
    // =========================================================================

    // 1. 교육이수 기록 컬럼
    const recordColumnDefs = useMemo(() => [
        {
            headerName: 'No',
            valueGetter: 'node.rowIndex + 1',
            width: 70,
            pinned: 'left',
            cellStyle: { textAlign: 'center', color: '#64748b' }
        },
        {
            field: 'recordNo',
            headerName: '관리번호',
            width: 150,
            pinned: 'left',
            cellRenderer: (params) => (
                <span 
                    style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => handleViewDetail(params.data, 'record')}
                >
                    {params.value}
                </span>
            )
        },
        {
            field: 'courseCode',
            headerName: '과정코드',
            width: 130,
            cellStyle: { fontWeight: 600, color: '#475569' }
        },
        {
            field: 'courseName',
            headerName: '교육과정명',
            width: 240,
            cellRenderer: (params) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{params.value}</span>
                </div>
            )
        },
        {
            field: 'category',
            headerName: '교육분류',
            width: 140,
            cellRenderer: (params) => {
                const cat = CATEGORIES.find(c => c.value === params.value);
                return cat ? (
                    <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: cat.bg,
                        color: cat.color,
                        border: `1px solid ${cat.border}`
                    }}>
                        {cat.label}
                    </span>
                ) : params.value;
            }
        },
        {
            field: 'traineeName',
            headerName: '대상자(성명)',
            width: 130,
            cellRenderer: (params) => (
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    👤 {params.value}
                </span>
            )
        },
        {
            field: 'department',
            headerName: '소속 부서',
            width: 130,
            cellStyle: { color: '#475569' }
        },
        {
            field: 'position',
            headerName: '직위/직책',
            width: 110,
            cellStyle: { color: '#64748b' }
        },
        {
            field: 'trainingDate',
            headerName: '이수일자',
            width: 120,
            cellStyle: { textAlign: 'center', color: '#1e293b' }
        },
        {
            field: 'expiryDate',
            headerName: '유효 만료일',
            width: 130,
            cellRenderer: (params) => {
                if (!params.value) return '-';
                const today = new Date().toISOString().substring(0, 10);
                const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
                const isExpired = params.value < today;
                const isSoon = params.value >= today && params.value <= in30Days;

                return (
                    <span style={{
                        color: isExpired ? '#dc2626' : isSoon ? '#d97706' : '#16a34a',
                        fontWeight: isExpired || isSoon ? 700 : 500
                    }}>
                        {params.value} {isExpired ? '⚠️만료' : isSoon ? '⏳임박' : ''}
                    </span>
                );
            }
        },
        {
            field: 'score',
            headerName: '평가점수',
            width: 100,
            cellStyle: { textAlign: 'center' },
            cellRenderer: (params) => {
                if (params.value === null || params.value === undefined) return '-';
                const isPassed = params.data.isPassed;
                return (
                    <span style={{
                        fontWeight: 700,
                        color: isPassed ? '#16a34a' : '#dc2626'
                    }}>
                        {params.value}점
                    </span>
                );
            }
        },
        {
            field: 'completionStatus',
            headerName: '이수상태',
            width: 120,
            cellRenderer: (params) => {
                const conf = COMPLETION_STATUSES[params.value] || { label: params.value, color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: conf.bg,
                        color: conf.color,
                        border: `1px solid ${conf.border}`
                    }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: conf.dot || conf.color }}></span>
                        {conf.label}
                    </span>
                );
            }
        },
        {
            field: 'effectivenessEvaluation',
            headerName: '효과성 평가',
            width: 140,
            cellRenderer: (params) => {
                const conf = EFFECTIVENESS_STATUSES[params.value] || { label: params.value, color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: conf.bg,
                        color: conf.color,
                        border: `1px solid ${conf.border}`
                    }}>
                        {conf.label}
                    </span>
                );
            }
        },
        {
            headerName: '관리 액션',
            width: 180,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => handleViewDetail(params.data, 'record')}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#fff',
                            color: '#334155',
                            cursor: 'pointer'
                        }}
                    >
                        상세/평가
                    </button>
                    {hasEditPermission && (
                        <button
                            onClick={() => handleOpenEditRecord(params.data)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #93c5fd',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                cursor: 'pointer'
                            }}
                        >
                            수정
                        </button>
                    )}
                    {hasDeletePermission && (
                        <button
                            onClick={() => handleDeleteRecord(params.data)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #fca5a5',
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                cursor: 'pointer'
                            }}
                        >
                            삭제
                        </button>
                    )}
                </div>
            )
        }
    ], [hasEditPermission, hasDeletePermission]);

    // 2. 교육과정 마스터 컬럼
    const courseColumnDefs = useMemo(() => [
        {
            headerName: 'No',
            valueGetter: 'node.rowIndex + 1',
            width: 70,
            pinned: 'left',
            cellStyle: { textAlign: 'center', color: '#64748b' }
        },
        {
            field: 'courseCode',
            headerName: '과정코드',
            width: 140,
            pinned: 'left',
            cellRenderer: (params) => (
                <span 
                    style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => handleViewDetail(params.data, 'course')}
                >
                    {params.value}
                </span>
            )
        },
        {
            field: 'courseName',
            headerName: '교육과정명',
            width: 260,
            cellStyle: { fontWeight: 600, color: '#1e293b' }
        },
        {
            field: 'category',
            headerName: '분류',
            width: 140,
            cellRenderer: (params) => {
                const cat = CATEGORIES.find(c => c.value === params.value);
                return cat ? (
                    <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: cat.bg,
                        color: cat.color,
                        border: `1px solid ${cat.border}`
                    }}>
                        {cat.label}
                    </span>
                ) : params.value;
            }
        },
        {
            field: 'targetFamily',
            headerName: '적용제품군',
            width: 150,
            cellRenderer: (params) => {
                const fam = TARGET_FAMILIES.find(f => f.value === params.value);
                return fam ? (
                    <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: fam.bg,
                        color: fam.color,
                        border: `1px solid ${fam.border}`
                    }}>
                        {fam.label}
                    </span>
                ) : params.value;
            }
        },
        {
            field: 'targetAudience',
            headerName: '대상 직무/인원',
            width: 180,
            cellStyle: { color: '#475569' }
        },
        {
            field: 'cycleMonths',
            headerName: '재교육주기',
            width: 110,
            cellStyle: { textAlign: 'center' },
            valueFormatter: (p) => p.value ? `${p.value}개월` : '해당없음'
        },
        {
            field: 'passingScore',
            headerName: '합격기준',
            width: 100,
            cellStyle: { textAlign: 'center', fontWeight: 600 },
            valueFormatter: (p) => p.value ? `${p.value}점 이상` : '-'
        },
        {
            field: 'trainingHours',
            headerName: '교육시간',
            width: 100,
            cellStyle: { textAlign: 'center' },
            valueFormatter: (p) => p.value ? `${p.value}시간` : '-'
        },
        {
            field: 'isRequired',
            headerName: '법정/필수',
            width: 110,
            cellStyle: { textAlign: 'center' },
            cellRenderer: (p) => p.value ? (
                <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: '11px' }}>
                    필수
                </span>
            ) : (
                <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b', fontSize: '11px' }}>
                    선택
                </span>
            )
        },
        {
            field: 'status',
            headerName: '운영여부',
            width: 110,
            cellStyle: { textAlign: 'center' },
            cellRenderer: (p) => p.value === 'ACTIVE' ? (
                <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#16a34a', fontWeight: 600, fontSize: '12px' }}>
                    활성
                </span>
            ) : (
                <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', fontSize: '12px' }}>
                    비활성
                </span>
            )
        },
        {
            headerName: '관리 액션',
            width: 140,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    {hasEditPermission && (
                        <button
                            onClick={() => handleOpenEditCourse(params.data)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #93c5fd',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                cursor: 'pointer'
                            }}
                        >
                            수정
                        </button>
                    )}
                    {hasDeletePermission && (
                        <button
                            onClick={() => handleDeleteCourse(params.data)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #fca5a5',
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                cursor: 'pointer'
                            }}
                        >
                            삭제
                        </button>
                    )}
                </div>
            )
        }
    ], [hasEditPermission, hasDeletePermission]);

    // 3. 직무 자격 매트릭스 컬럼
    const qualificationColumnDefs = useMemo(() => [
        {
            headerName: 'No',
            valueGetter: 'node.rowIndex + 1',
            width: 70,
            pinned: 'left',
            cellStyle: { textAlign: 'center', color: '#64748b' }
        },
        {
            field: 'employeeName',
            headerName: '임직원 성명',
            width: 140,
            pinned: 'left',
            cellRenderer: (params) => (
                <span 
                    style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => handleViewDetail(params.data, 'qualification')}
                >
                    👤 {params.value || params.data.userName}
                </span>
            )
        },
        {
            field: 'username',
            headerName: '계정 ID',
            width: 110,
            cellStyle: { color: '#64748b' }
        },
        {
            field: 'department',
            headerName: '소속 부서',
            width: 130,
            cellStyle: { color: '#334155' }
        },
        {
            field: 'position',
            headerName: '직위/직책',
            width: 110,
            cellStyle: { color: '#64748b' }
        },
        {
            field: 'qualificationName',
            headerName: '직무 자격 명칭',
            width: 240,
            cellStyle: { fontWeight: 600, color: '#0f172a' }
        },
        {
            field: 'qualificationType',
            headerName: '자격 구분',
            width: 140,
            cellRenderer: (params) => {
                const conf = QUALIFICATION_TYPES[params.value] || { label: params.value, color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
                return (
                    <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: conf.bg,
                        color: conf.color,
                        border: `1px solid ${conf.border}`
                    }}>
                        {conf.label}
                    </span>
                );
            }
        },
        {
            field: 'qualificationStatus',
            headerName: '자격 상태',
            width: 120,
            cellRenderer: (params) => {
                const conf = QUALIFICATION_STATUSES[params.value] || { label: params.value, color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
                return (
                    <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: conf.bg,
                        color: conf.color,
                        border: `1px solid ${conf.border}`
                    }}>
                        {conf.label}
                    </span>
                );
            }
        },
        {
            field: 'certifiedDate',
            headerName: '취득/부여일',
            width: 120,
            cellStyle: { textAlign: 'center', color: '#1e293b' }
        },
        {
            field: 'expiryDate',
            headerName: '자격 유효만료일',
            width: 130,
            cellRenderer: (params) => {
                if (!params.value) return '영구유효';
                const today = new Date().toISOString().substring(0, 10);
                const isExpired = params.value < today;
                return (
                    <span style={{
                        color: isExpired ? '#dc2626' : '#1e293b',
                        fontWeight: isExpired ? 700 : 500
                    }}>
                        {params.value} {isExpired ? '⚠️만료' : ''}
                    </span>
                );
            }
        },
        {
            field: 'certificateNumber',
            headerName: '자격증/인증번호',
            width: 160,
            cellStyle: { color: '#475569', fontFamily: 'monospace' }
        },
        {
            field: 'authorizerName',
            headerName: '승인/수여권자',
            width: 120,
            cellStyle: { color: '#64748b' }
        },
        {
            headerName: '관리 액션',
            width: 140,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    {hasEditPermission && (
                        <button
                            onClick={() => handleOpenEditQualification(params.data)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #93c5fd',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                cursor: 'pointer'
                            }}
                        >
                            갱신/수정
                        </button>
                    )}
                    {hasDeletePermission && (
                        <button
                            onClick={() => handleDeleteQualification(params.data)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #fca5a5',
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                cursor: 'pointer'
                            }}
                        >
                            삭제
                        </button>
                    )}
                </div>
            )
        }
    ], [hasEditPermission, hasDeletePermission]);

    // CSV 내보내기 핸들러
    const handleExportCsv = () => {
        let gridRef = null;
        let filename = 'training_export';
        if (activeTab === 'records') {
            gridRef = recordsGridRef;
            filename = 'training_records_' + new Date().toISOString().substring(0, 10);
        } else if (activeTab === 'courses') {
            gridRef = coursesGridRef;
            filename = 'training_courses_' + new Date().toISOString().substring(0, 10);
        } else {
            gridRef = qualificationsGridRef;
            filename = 'training_qualifications_' + new Date().toISOString().substring(0, 10);
        }

        if (gridRef?.current?.api) {
            gridRef.current.api.exportDataAsCsv({ fileName: `${filename}.csv` });
            toast.success('CSV 파일이 다운로드되었습니다.');
        }
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            {/* 1. 규제 정합 표준 배너 */}
            <RegulatoryManualBanner
                pageTitle="🎓 교육훈련 및 자격관리 (Training & Competence)"
                isoStandard="ISO 13485:2016 §6.2 (인적 자원) & ISO 22716:2007 §3 (인력 및 교육훈련 요건)"
                cosmeticsAct="화장품법 제3조·제7조 (품질책임자 자격 기준 및 법정의무교육)"
            />

            {/* 2. 3단계 표준 헤더 영역 */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: '#0f172a',
                        margin: '0 0 6px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        🎓 교육훈련 및 자격관리 시스템
                        <span style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1'
                        }}>
                            ISO 13485 & 22716
                        </span>
                    </h1>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                        임직원 직무 역량 확보를 위한 표준 교육과정 편성, 이수 평가, 현업 적용 효과성 검증 및 법정·사내 자격 매트릭스를 통합 통제합니다.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#fff',
                            color: '#334155',
                            cursor: 'pointer'
                        }}
                    >
                        🔄 {loading ? '동기화 중...' : '새로고침'}
                    </button>

                    <button
                        onClick={handleExportCsv}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#fff',
                            color: '#334155',
                            cursor: 'pointer'
                        }}
                    >
                        📥 CSV 내보내기
                    </button>

                    {hasEditPermission && activeTab === 'courses' && (
                        <button
                            onClick={handleOpenCreateCourse}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: 600,
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#2563eb',
                                color: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            ➕ 신규 교육과정 제정
                        </button>
                    )}

                    {hasEditPermission && activeTab === 'records' && (
                        <button
                            onClick={handleOpenCreateRecord}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: 600,
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#2563eb',
                                color: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            📝 교육이수/평가 등록
                        </button>
                    )}

                    {hasEditPermission && activeTab === 'qualifications' && (
                        <button
                            onClick={handleOpenCreateQualification}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: 600,
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#7c3aed',
                                color: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            🏅 직무 자격 부여
                        </button>
                    )}
                </div>
            </div>

            {/* 3. 6개 KPI 서머리 카드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
                marginBottom: '20px'
            }}>
                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                        📚 표준 교육과정
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                        {metrics.totalCourses}
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginLeft: '4px' }}>개 과정</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px' }}>
                        활성 {metrics.activeCourses}개 / 필수 {metrics.requiredCourses}개
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                        📈 전사 교육 이수율
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>
                        {metrics.completionRate}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                        완료 {metrics.completedRecords}건 / 전체 {metrics.totalRecords}건
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                        ⏳ 예정/진행 교육
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#0284c7' }}>
                        {metrics.scheduledRecords}
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginLeft: '4px' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '4px' }}>
                        즉시 이수 대상 인원
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                        ⚠️ 30일 내 만료예정
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#d97706' }}>
                        {metrics.expiringSoonRecords}
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginLeft: '4px' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px' }}>
                        재교육 주기 도래 대상
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                        🚨 유효만료 교육
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626' }}>
                        {metrics.expiredRecords}
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginLeft: '4px' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>
                        기한초과 보수교육 필요
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '10px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                        🏅 직무자격 적격자
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#7c3aed' }}>
                        {metrics.qualifiedUsers}
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginLeft: '4px' }}>명</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#6d28d9', marginTop: '4px' }}>
                        전체 부여 {metrics.totalQualifications}건
                    </div>
                </div>
            </div>

            {/* 4. 탭 네비게이션 */}
            <div style={{
                display: 'flex',
                borderBottom: '2px solid #e2e8f0',
                marginBottom: '16px',
                gap: '8px'
            }}>
                <button
                    onClick={() => setActiveTab('records')}
                    style={{
                        padding: '10px 18px',
                        fontSize: '14px',
                        fontWeight: activeTab === 'records' ? 700 : 500,
                        color: activeTab === 'records' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'records' ? '3px solid #2563eb' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    📋 교육이수 현황 및 평가 기록 ({records.length})
                </button>

                <button
                    onClick={() => setActiveTab('courses')}
                    style={{
                        padding: '10px 18px',
                        fontSize: '14px',
                        fontWeight: activeTab === 'courses' ? 700 : 500,
                        color: activeTab === 'courses' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'courses' ? '3px solid #2563eb' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    📚 표준 교육과정 마스터 ({courses.length})
                </button>

                <button
                    onClick={() => setActiveTab('qualifications')}
                    style={{
                        padding: '10px 18px',
                        fontSize: '14px',
                        fontWeight: activeTab === 'qualifications' ? 700 : 500,
                        color: activeTab === 'qualifications' ? '#7c3aed' : '#64748b',
                        borderBottom: activeTab === 'qualifications' ? '3px solid #7c3aed' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    🏅 직무 자격 적격성 매트릭스 ({qualifications.length})
                </button>
            </div>

            {/* 5. 검색 및 필터 카드 */}
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                padding: '14px 18px',
                marginBottom: '16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
                    <input
                        type="text"
                        placeholder="성명, 과정명, 과정코드, 자격명 검색..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') loadData(); }}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '13px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            outline: 'none'
                        }}
                    />
                </div>

                <div style={{ width: '160px' }}>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '13px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#fff'
                        }}
                    >
                        <option value="">모든 교육분류</option>
                        {CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                <div style={{ width: '160px' }}>
                    <select
                        value={familyFilter}
                        onChange={(e) => setFamilyFilter(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '13px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#fff'
                        }}
                    >
                        <option value="">모든 제품군</option>
                        {TARGET_FAMILIES.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                </div>

                {activeTab === 'records' && (
                    <div style={{ width: '150px' }}>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                fontSize: '13px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#fff'
                            }}
                        >
                            <option value="">모든 이수상태</option>
                            {Object.entries(COMPLETION_STATUSES).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                <button
                    onClick={() => {
                        setKeyword('');
                        setCategoryFilter('');
                        setFamilyFilter('');
                        setStatusFilter('');
                    }}
                    style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        color: '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    초기화
                </button>
            </div>

            {/* 6. 메인 AG Grid 테이블 */}
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div className="ag-theme-alpine" style={{ width: '100%', height: 'calc(100vh - 460px)', minHeight: '440px' }}>
                    {activeTab === 'records' && (
                        <AgGridReact
                            theme="legacy"
                            ref={recordsGridRef}
                            rowData={records}
                            columnDefs={recordColumnDefs}
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
                        />
                    )}

                    {activeTab === 'courses' && (
                        <AgGridReact
                            theme="legacy"
                            ref={coursesGridRef}
                            rowData={courses}
                            columnDefs={courseColumnDefs}
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
                        />
                    )}

                    {activeTab === 'qualifications' && (
                        <AgGridReact
                            theme="legacy"
                            ref={qualificationsGridRef}
                            rowData={qualifications}
                            columnDefs={qualificationColumnDefs}
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
                        />
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 7. 최대화 모달: 교육이수 기록 등록/수정 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {recordModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        maxWidth: '1680px',
                        backgroundColor: '#fff',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* 모달 헤더 */}
                        <div style={{
                            padding: '20px 28px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                                    {editingRecord ? '📝 교육이수 기록 수정 및 효과성 평가' : '📝 신규 교육이수 및 평가 기록 등록'}
                                </h2>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    ISO 13485:2016 §6.2(b)(c)에 따른 개인별 수료 평가 및 현업 업무 유효성 검증
                                </span>
                            </div>
                            <button
                                onClick={() => setRecordModalOpen(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* 모달 본문 */}
                        <form onSubmit={handleSaveRecord} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '22px' }}>
                                    {/* 교육과정 선택 */}
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            교육과정 선택 *
                                        </label>
                                        <select
                                            value={recordForm.courseId}
                                            onChange={(e) => setRecordForm({ ...recordForm, courseId: e.target.value })}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '9px 12px',
                                                fontSize: '13px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1'
                                            }}
                                        >
                                            <option value="">교육과정을 선택하세요</option>
                                            {courses.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    [{c.courseCode}] {c.courseName} ({c.category} - {c.passingScore}점 합격기준)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 이수 상태 */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            이수상태
                                        </label>
                                        <select
                                            value={recordForm.completionStatus}
                                            onChange={(e) => setRecordForm({ ...recordForm, completionStatus: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '9px 12px',
                                                fontSize: '13px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1'
                                            }}
                                        >
                                            {Object.entries(COMPLETION_STATUSES).map(([k, v]) => (
                                                <option key={k} value={k}>{v.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 교육 대상자 정보 */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            계정 아이디 (username) *
                                        </label>
                                        <input
                                            type="text"
                                            value={recordForm.username}
                                            onChange={(e) => setRecordForm({ ...recordForm, username: e.target.value })}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '9px 12px',
                                                fontSize: '13px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            교육 대상자 성명 *
                                        </label>
                                        <input
                                            type="text"
                                            value={recordForm.traineeName}
                                            onChange={(e) => setRecordForm({ ...recordForm, traineeName: e.target.value })}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '9px 12px',
                                                fontSize: '13px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            소속 부서 / 직급
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                placeholder="부서명"
                                                value={recordForm.department}
                                                onChange={(e) => setRecordForm({ ...recordForm, department: e.target.value })}
                                                style={{ flex: 1, padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="직급"
                                                value={recordForm.position}
                                                onChange={(e) => setRecordForm({ ...recordForm, position: e.target.value })}
                                                style={{ width: '100px', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>
                                    </div>

                                    {/* 이수일 및 만료일 */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            교육 이수 일자 *
                                        </label>
                                        <input
                                            type="date"
                                            value={recordForm.trainingDate}
                                            onChange={(e) => setRecordForm({ ...recordForm, trainingDate: e.target.value })}
                                            required
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            유효 만료일 (미입력 시 주기 자동계산)
                                        </label>
                                        <input
                                            type="date"
                                            value={recordForm.expiryDate}
                                            onChange={(e) => setRecordForm({ ...recordForm, expiryDate: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    {/* 평가 방식 및 점수 */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            평가 방식
                                        </label>
                                        <select
                                            value={recordForm.evaluationMethod}
                                            onChange={(e) => setRecordForm({ ...recordForm, evaluationMethod: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        >
                                            {EVALUATION_METHODS.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            평가 점수 (0 ~ 100)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={recordForm.score}
                                            onChange={(e) => setRecordForm({ ...recordForm, score: parseInt(e.target.value, 10) || 0 })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            수료증/인증서 첨부 링크 (URL)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="https://qms-storage.corp/certificates/..."
                                            value={recordForm.certificateUrl}
                                            onChange={(e) => setRecordForm({ ...recordForm, certificateUrl: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                </div>

                                {/* 효과성 평가 섹션 (ISO 13485:2016 §6.2(c)) */}
                                <div style={{
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '10px',
                                    padding: '18px 20px',
                                    backgroundColor: '#eff6ff',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e40af' }}>
                                            🎯 교육훈련 효과성 평가 (ISO 13485 §6.2(c))
                                        </h3>
                                        <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>
                                            교육 실시 후 업무 현장 적용 및 역량 유효성 검증
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                                                효과성 판정
                                            </label>
                                            <select
                                                value={recordForm.effectivenessEvaluation}
                                                onChange={(e) => setRecordForm({ ...recordForm, effectivenessEvaluation: e.target.value })}
                                                style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #93c5fd', backgroundColor: '#fff' }}
                                            >
                                                {Object.entries(EFFECTIVENESS_STATUSES).map(([k, v]) => (
                                                    <option key={k} value={k}>{v.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                                                평가자 (책임자/관리자)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="평가자 성명"
                                                value={recordForm.effectivenessEvaluator}
                                                onChange={(e) => setRecordForm({ ...recordForm, effectivenessEvaluator: e.target.value })}
                                                style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #93c5fd' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                                                평가 일자
                                            </label>
                                            <input
                                                type="date"
                                                value={recordForm.effectivenessDate}
                                                onChange={(e) => setRecordForm({ ...recordForm, effectivenessDate: e.target.value })}
                                                style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #93c5fd' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                                            효과성 평가 소견 및 관찰 내역
                                        </label>
                                        <textarea
                                            rows="3"
                                            placeholder="교육 이수 후 표준작업지침서(SOP) 준수 여부, 부적합 발생 감소, 실무 오류 발생 여부 등을 종합 검증한 내용을 기술합니다."
                                            value={recordForm.effectivenessNotes}
                                            onChange={(e) => setRecordForm({ ...recordForm, effectivenessNotes: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: '13px',
                                                borderRadius: '6px',
                                                border: '1px solid #93c5fd',
                                                resize: 'vertical'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                        비고 및 특이사항
                                    </label>
                                    <textarea
                                        rows="2"
                                        placeholder="추가 전달사항이나 이력 메모..."
                                        value={recordForm.remarks}
                                        onChange={(e) => setRecordForm({ ...recordForm, remarks: e.target.value })}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                            </div>

                            {/* 모달 푸터 */}
                            <div style={{
                                padding: '16px 28px',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '10px',
                                backgroundColor: '#f8fafc'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setRecordModalOpen(false)}
                                    style={{
                                        padding: '9px 18px',
                                        fontSize: '13px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: '#fff',
                                        color: '#475569',
                                        cursor: 'pointer'
                                    }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '9px 22px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        border: 'none',
                                        backgroundColor: '#2563eb',
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {editingRecord ? '기록 수정 완료' : '교육이수 등록'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 8. 최대화 모달: 교육과정 제정/수정 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {courseModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        maxWidth: '1680px',
                        backgroundColor: '#fff',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '20px 28px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                                    {editingCourse ? '📚 교육과정 마스터 수정' : '📚 신규 표준 교육과정 제정'}
                                </h2>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    품질 방침 및 규제 기준(ISO 13485/22716)에 적합한 표준 교육훈련 과정 제정
                                </span>
                            </div>
                            <button
                                onClick={() => setCourseModalOpen(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '22px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            과정 코드 *
                                        </label>
                                        <input
                                            type="text"
                                            value={courseForm.courseCode}
                                            onChange={(e) => setCourseForm({ ...courseForm, courseCode: e.target.value })}
                                            required
                                            placeholder="예: TC-GMP-001"
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            교육과정명 *
                                        </label>
                                        <input
                                            type="text"
                                            value={courseForm.courseName}
                                            onChange={(e) => setCourseForm({ ...courseForm, courseName: e.target.value })}
                                            required
                                            placeholder="예: 의료기기 GMP 기본 및 오염관리"
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            교육 분류 *
                                        </label>
                                        <select
                                            value={courseForm.category}
                                            onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        >
                                            {CATEGORIES.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            적용 제품군
                                        </label>
                                        <select
                                            value={courseForm.targetFamily}
                                            onChange={(e) => setCourseForm({ ...courseForm, targetFamily: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        >
                                            {TARGET_FAMILIES.map(f => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            운영 상태
                                        </label>
                                        <select
                                            value={courseForm.status}
                                            onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="ACTIVE">활성 (운영중)</option>
                                            <option value="INACTIVE">비활성 (보류)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            재교육 주기 (개월)
                                        </label>
                                        <input
                                            type="number"
                                            value={courseForm.cycleMonths}
                                            onChange={(e) => setCourseForm({ ...courseForm, cycleMonths: parseInt(e.target.value, 10) || 12 })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            합격 기준 점수 (Passing Score)
                                        </label>
                                        <input
                                            type="number"
                                            value={courseForm.passingScore}
                                            onChange={(e) => setCourseForm({ ...courseForm, passingScore: parseInt(e.target.value, 10) || 70 })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            교육 이수 시간 (Hours)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={courseForm.trainingHours}
                                            onChange={(e) => setCourseForm({ ...courseForm, trainingHours: parseFloat(e.target.value) || 2.0 })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            법정/사내 필수 여부
                                        </label>
                                        <select
                                            value={courseForm.isRequired ? 'true' : 'false'}
                                            onChange={(e) => setCourseForm({ ...courseForm, isRequired: e.target.value === 'true' })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="true">법정/전사 필수</option>
                                            <option value="false">선택 교육</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            주 강사 / 기관
                                        </label>
                                        <input
                                            type="text"
                                            value={courseForm.instructor}
                                            onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                                            placeholder="예: 품질책임자, KTL, 식약처"
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            대상 직무/인원
                                        </label>
                                        <input
                                            type="text"
                                            value={courseForm.targetAudience}
                                            onChange={(e) => setCourseForm({ ...courseForm, targetAudience: e.target.value })}
                                            placeholder="예: 제조/품질/물류 전 임직원"
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div style={{ gridColumn: 'span 3' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            교육 교재 / 자료 URL
                                        </label>
                                        <input
                                            type="text"
                                            value={courseForm.materialUrl}
                                            onChange={(e) => setCourseForm({ ...courseForm, materialUrl: e.target.value })}
                                            placeholder="https://docs.corp/training/materials/..."
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div style={{ gridColumn: 'span 3' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            교육과정 목표 및 세부 개요
                                        </label>
                                        <textarea
                                            rows="4"
                                            value={courseForm.description}
                                            onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                                            placeholder="교육과정의 취지, 주요 학습 목표, 평가 기준 등을 상세히 기술합니다."
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                padding: '16px 28px',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '10px',
                                backgroundColor: '#f8fafc'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setCourseModalOpen(false)}
                                    style={{
                                        padding: '9px 18px',
                                        fontSize: '13px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: '#fff',
                                        color: '#475569',
                                        cursor: 'pointer'
                                    }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '9px 22px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        border: 'none',
                                        backgroundColor: '#2563eb',
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {editingCourse ? '교육과정 수정' : '교육과정 제정'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 9. 최대화 모달: 직무 자격 부여/갱신 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {qualificationModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        maxWidth: '1680px',
                        backgroundColor: '#fff',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '20px 28px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                                    {editingQualification ? '🏅 직무 자격 갱신/수정' : '🏅 신규 직무 자격 적격성 부여'}
                                </h2>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    화장품법 및 ISO 13485 요건에 따른 법정·사내 전문 직무 자격 부여 및 권한 관리
                                </span>
                            </div>
                            <button
                                onClick={() => setQualificationModalOpen(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveQualification} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '22px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            임직원 계정 (username) *
                                        </label>
                                        <input
                                            type="text"
                                            value={qualificationForm.username}
                                            onChange={(e) => setQualificationForm({ ...qualificationForm, username: e.target.value })}
                                            required
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            임직원 성명 *
                                        </label>
                                        <input
                                            type="text"
                                            value={qualificationForm.employeeName}
                                            onChange={(e) => setQualificationForm({ ...qualificationForm, employeeName: e.target.value })}
                                            required
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            소속 부서 / 직급
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                placeholder="부서명"
                                                value={qualificationForm.department}
                                                onChange={(e) => setQualificationForm({ ...qualificationForm, department: e.target.value })}
                                                style={{ flex: 1, padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="직급"
                                                value={qualificationForm.position}
                                                onChange={(e) => setQualificationForm({ ...qualificationForm, position: e.target.value })}
                                                style={{ width: '100px', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            직무 자격 명칭 *
                                        </label>
                                        <input
                                            type="text"
                                            value={qualificationForm.qualificationName}
                                            onChange={(e) => setQualificationForm({ ...qualificationForm, qualificationName: e.target.value })}
                                            required
                                            placeholder="예: 화장품 책임판매관리자 / ISO 13485 내부심사원"
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            자격 구분 *
                                        </label>
                                        <select
                                            value={qualificationForm.qualificationType}
                                            onChange={(e) => setQualificationForm({ ...qualificationForm, qualificationType: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        >
                                            {Object.entries(QUALIFICATION_TYPES).map(([k, v]) => (
                                                <option key={k} value={k}>{v.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            자격 상태
                                        </label>
                                        <select
                                            value={qualificationForm.qualificationStatus}
                                            onChange={(e) => setQualificationForm({ ...qualificationForm, qualificationStatus: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        >
                                            {Object.entries(QUALIFICATION_STATUSES).map(([k, v]) => (
                                                <option key={k} value={k}>{v.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            취득/부여 일자 *
                                        </label>
                                        <input
                                            type="date"
                                            value={qualificationForm.certifiedDate}
                                            onChange={(e) => setQualificationForm({ ...qualificationForm, certifiedDate: e.target.value })}
                                            required
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            자격 만료일자 (비워두면 영구)
                                        </label>
                                        <input
                                            type="date"
                                            value={qualificationForm.expiryDate}
                                            onChange={(e) => setQualificationForm({ ...qualificationForm, expiryDate: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            연계 이수과정 코드
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: TC-GMP-001"
                                            value={qualificationForm.requiredCourseCode}
                                            onChange={(e) => setQualificationForm({ ...qualificationForm, requiredCourseCode: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            자격증/인증번호
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: CERT-AUDIT-2026-001"
                                            value={qualificationForm.certificateNumber}
                                            onChange={(e) => setQualificationForm({ ...qualificationForm, certificateNumber: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            승인/수여권자 성명
                                        </label>
                                        <input
                                            type="text"
                                            value={qualificationForm.authorizerName}
                                            onChange={(e) => setQualificationForm({ ...qualificationForm, authorizerName: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div style={{ gridColumn: 'span 3' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            자격 부여 요건 및 근거 메모
                                        </label>
                                        <textarea
                                            rows="3"
                                            value={qualificationForm.remarks}
                                            onChange={(e) => setQualificationForm({ ...qualificationForm, remarks: e.target.value })}
                                            placeholder="학력, 관련 실무 경력(화장품 1년 이상 등), 외부 심사원 자격증 취득 근거를 기록합니다."
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                padding: '16px 28px',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '10px',
                                backgroundColor: '#f8fafc'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setQualificationModalOpen(false)}
                                    style={{
                                        padding: '9px 18px',
                                        fontSize: '13px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: '#fff',
                                        color: '#475569',
                                        cursor: 'pointer'
                                    }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '9px 22px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: '6px',
                                        border: 'none',
                                        backgroundColor: '#7c3aed',
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {editingQualification ? '직무자격 갱신' : '직무자격 부여'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 10. 상세 조회 & 효과성 평가 팝업 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {detailModalOpen && selectedDetail && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        maxWidth: '1680px',
                        backgroundColor: '#fff',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '20px 28px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                                    {selectedDetail.type === 'record' ? `📋 교육이수 상세: ${selectedDetail.item.recordNo}` :
                                     selectedDetail.type === 'course' ? `📚 교육과정 상세: ${selectedDetail.item.courseCode}` :
                                     `🏅 직무자격 상세: ${selectedDetail.item.qualificationName}`}
                                </h2>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    감사 추적성(Audit Trail) 및 효과성 검증 상세 보고서
                                </span>
                            </div>
                            <button
                                onClick={() => setDetailModalOpen(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
                            {selectedDetail.type === 'record' && (
                                <div>
                                    {/* 상단 요약 카드 */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: '14px',
                                        marginBottom: '20px'
                                    }}>
                                        <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>교육 대상자</span>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                                                👤 {selectedDetail.item.traineeName} ({selectedDetail.item.department || '-'})
                                            </div>
                                        </div>
                                        <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>교육과정명</span>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                                                {selectedDetail.item.courseName}
                                            </div>
                                        </div>
                                        <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>평가점수 / 합격</span>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: selectedDetail.item.isPassed ? '#16a34a' : '#dc2626', marginTop: '4px' }}>
                                                {selectedDetail.item.score !== null ? `${selectedDetail.item.score}점` : '-'} 
                                                ({selectedDetail.item.isPassed ? '합격' : '불합격'})
                                            </div>
                                        </div>
                                        <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>유효 만료일</span>
                                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                                                {selectedDetail.item.expiryDate || '-'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 효과성 평가 상세 및 즉시 판정 박스 */}
                                    <div style={{
                                        border: '1px solid #bfdbfe',
                                        borderRadius: '10px',
                                        padding: '20px',
                                        backgroundColor: '#eff6ff',
                                        marginBottom: '20px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e40af' }}>
                                                🎯 교육훈련 효과성 평가 (ISO 13485:2016 §6.2(c))
                                            </h3>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {hasEditPermission && (
                                                    <>
                                                        <button
                                                            onClick={() => handleQuickEvaluateEffectiveness(selectedDetail.item.id, 'EFFECTIVE')}
                                                            style={{
                                                                padding: '6px 14px',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                borderRadius: '6px',
                                                                border: 'none',
                                                                backgroundColor: '#16a34a',
                                                                color: '#fff',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            ✓ 효과적(적합) 판정
                                                        </button>
                                                        <button
                                                            onClick={() => handleQuickEvaluateEffectiveness(selectedDetail.item.id, 'NEEDS_RETRAINING')}
                                                            style={{
                                                                padding: '6px 14px',
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                borderRadius: '6px',
                                                                border: 'none',
                                                                backgroundColor: '#dc2626',
                                                                color: '#fff',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            ⚠️ 재교육 필요 지정
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '12px' }}>
                                            <div>
                                                <span style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: 600 }}>평가 상태:</span>
                                                <div style={{ fontWeight: 700, color: '#1e40af', marginTop: '2px' }}>
                                                    {EFFECTIVENESS_STATUSES[selectedDetail.item.effectivenessEvaluation]?.label || selectedDetail.item.effectivenessEvaluation}
                                                </div>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: 600 }}>평가자:</span>
                                                <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                                                    {selectedDetail.item.effectivenessEvaluator || '미지정'}
                                                </div>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: 600 }}>평가 일자:</span>
                                                <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                                                    {selectedDetail.item.effectivenessDate || '미완료'}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: 600 }}>효과성 평가 소견:</span>
                                            <div style={{
                                                marginTop: '4px',
                                                padding: '12px',
                                                backgroundColor: '#fff',
                                                borderRadius: '6px',
                                                border: '1px solid #bfdbfe',
                                                fontSize: '13px',
                                                color: '#1e293b',
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {selectedDetail.item.effectivenessNotes || '등록된 효과성 평가 소견이 없습니다.'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 수료증/첨부 정보 */}
                                    <div style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '10px',
                                        padding: '16px',
                                        backgroundColor: '#fff'
                                    }}>
                                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                                            📜 수료증 및 증빙 자료
                                        </h4>
                                        {selectedDetail.item.certificateUrl ? (
                                            <a
                                                href={selectedDetail.item.certificateUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
                                            >
                                                🔗 수료증 증빙 파일 열람: {selectedDetail.item.certificateUrl}
                                            </a>
                                        ) : (
                                            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                                                등록된 전자 수료증 링크가 없습니다.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedDetail.type === 'course' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                    <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#334155' }}>과정 개요</h4>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>과정코드:</strong> {selectedDetail.item.courseCode}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>과정명:</strong> {selectedDetail.item.courseName}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>교육분류:</strong> {selectedDetail.item.category}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>적용제품군:</strong> {selectedDetail.item.targetFamily}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>대상직무:</strong> {selectedDetail.item.targetAudience}</p>
                                    </div>
                                    <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#334155' }}>운영 요건</h4>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>재교육주기:</strong> {selectedDetail.item.cycleMonths}개월</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>합격기준점수:</strong> {selectedDetail.item.passingScore}점</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>교육시간:</strong> {selectedDetail.item.trainingHours}시간</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>법정필수여부:</strong> {selectedDetail.item.isRequired ? '필수' : '선택'}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>주강사:</strong> {selectedDetail.item.instructor}</p>
                                    </div>
                                    <div style={{ gridColumn: 'span 2', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#334155' }}>상세 교육 내용</h4>
                                        <p style={{ fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                                            {selectedDetail.item.description || '등록된 상세 설명이 없습니다.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedDetail.type === 'qualification' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                    <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#334155' }}>자격 및 보유자 정보</h4>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>성명:</strong> 👤 {selectedDetail.item.employeeName || selectedDetail.item.userName}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>계정:</strong> {selectedDetail.item.username}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>부서/직급:</strong> {selectedDetail.item.department} / {selectedDetail.item.position}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>자격명칭:</strong> {selectedDetail.item.qualificationName}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>자격구분:</strong> {selectedDetail.item.qualificationType}</p>
                                    </div>
                                    <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#334155' }}>인증 및 유효 정보</h4>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>자격상태:</strong> {selectedDetail.item.qualificationStatus}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>취득일:</strong> {selectedDetail.item.certifiedDate}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>만료일:</strong> {selectedDetail.item.expiryDate || '영구유효'}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>자격증번호:</strong> {selectedDetail.item.certificateNumber || '-'}</p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>수여권자:</strong> {selectedDetail.item.authorizerName || '-'}</p>
                                    </div>
                                    <div style={{ gridColumn: 'span 2', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#334155' }}>자격 요건 및 승인 근거</h4>
                                        <p style={{ fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                                            {selectedDetail.item.remarks || '등록된 근거 메모가 없습니다.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{
                            padding: '16px 28px',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            backgroundColor: '#f8fafc'
                        }}>
                            <button
                                onClick={() => setDetailModalOpen(false)}
                                style={{
                                    padding: '9px 20px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#fff',
                                    color: '#334155',
                                    cursor: 'pointer'
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
};

export default TrainingManagementPage;
