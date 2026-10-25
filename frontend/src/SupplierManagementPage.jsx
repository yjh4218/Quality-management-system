import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import {
    fetchSupplierQualifications,
    fetchSupplierQualificationById,
    createSupplierQualification,
    updateSupplierQualification,
    deleteSupplierQualification,
    transitionSupplierStatus,
    fetchSupplierEvaluations,
    createSupplierEvaluation,
    updateSupplierEvaluation,
    deleteSupplierEvaluation,
    fetchQualityAgreements,
    createQualityAgreement,
    updateQualityAgreement,
    deleteQualityAgreement,
    fetchSupplierKpi,
    getManufacturers
} from './api';

// =========================================================================
// 1. 공통 상수 및 뱃지 스타일 헬퍼
// =========================================================================

const SUPPLIER_TYPES = [
    { value: 'RAW_MATERIAL', label: '원자재/원료의약품/성분 공급사' },
    { value: 'PACKAGING', label: '용기/라벨/1·2차 포장재 공급사' },
    { value: 'CONTRACT_MANUFACTURER', label: '위탁제조/충진포장 OEM/ODM' },
    { value: 'TESTING_LAB', label: '공인 시험/검사 위탁기관' },
    { value: 'STERILIZATION', label: '멸균/방사선조사 위탁업체' },
    { value: 'SERVICE_LOGISTICS', label: '보관/물류/유통 서비스사' }
];

const APPROVAL_STATUSES = [
    { value: 'PENDING_QUALIFICATION', label: '적격성 심사대기', color: '#f59e0b', bg: '#fef3c7' },
    { value: 'APPROVED', label: '공식 승인 (거래가능)', color: '#10b981', bg: '#d1fae5' },
    { value: 'CONDITIONALLY_APPROVED', label: '조건부 승인 (모니터링)', color: '#6366f1', bg: '#e0e7ff' },
    { value: 'DISQUALIFIED', label: '자격 미달 (거래불가)', color: '#ef4444', bg: '#fee2e2' },
    { value: 'SUSPENDED', label: '잠정 거래 정지 (CAPA)', color: '#8b5cf6', bg: '#ede9fe' }
];

const SUPPLIER_GRADES = [
    { value: 'GRADE_A', label: 'A등급 (우수 - 90점 이상)', color: '#059669', bg: '#d1fae5' },
    { value: 'GRADE_B', label: 'B등급 (양호 - 80~89점)', color: '#2563eb', bg: '#dbeafe' },
    { value: 'GRADE_C', label: 'C등급 (주의 - 70~79점)', color: '#d97706', bg: '#fef3c7' },
    { value: 'GRADE_D', label: 'D등급 (부적격 - 70점 미만)', color: '#dc2626', bg: '#fee2e2' }
];

const AGREEMENT_TYPES = [
    { value: 'CONTRACT_MANUFACTURING', label: '위탁제조/포장 QAA (OEM/ODM)' },
    { value: 'RAW_MATERIAL', label: '핵심 원자재 공급 QAA' },
    { value: 'PACKAGING_MATERIAL', label: '직접 접촉 포장재 QAA' },
    { value: 'QUALITY_CONTROL', label: '시험검사 위탁 QAA' },
    { value: 'STERILIZATION', label: '멸균 공정 위탁 QAA' },
    { value: 'STORAGE_DISTRIBUTION', label: '보관/물류 GDP QAA' }
];

const AGREEMENT_STATUSES = [
    { value: 'ACTIVE', label: '유효 발효중', color: '#10b981', bg: '#d1fae5' },
    { value: 'EXPIRING_SOON', label: '만료 임박 (30일 이내)', color: '#f59e0b', bg: '#fef3c7' },
    { value: 'EXPIRED', label: '기간 만료 (재체결 필요)', color: '#ef4444', bg: '#fee2e2' },
    { value: 'TERMINATED', label: '협약 해지 (거래종료)', color: '#6b7280', bg: '#f3f4f6' }
];

const EVAL_PERIODS = [
    { value: 'Q1', label: '1분기 정기평가' },
    { value: 'Q2', label: '2분기 정기평가' },
    { value: 'Q3', label: '3분기 정기평가' },
    { value: 'Q4', label: '4분기 정기평가' },
    { value: 'ANNUAL', label: '연간 정기 종합평가' },
    { value: 'SPECIAL', label: '수시 특별평가' }
];

export default function SupplierManagementPage({ user, onNavigate }) {
    // 탭 상태: 1 = 자격승인(ASL), 2 = 정기평가, 3 = 품질협약(QAA)
    const [activeTab, setActiveTab] = useState(1);

    // KPI 상태
    const [kpiData, setKpiData] = useState({
        totalSuppliers: 0,
        approvedSuppliers: 0,
        conditionalSuppliers: 0,
        qaaComplianceRate: 0,
        qaaExpiringSoonCount: 0,
        averageEvaluationScore: 0
    });

    // 목록 데이터
    const [qualifications, setQualifications] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [agreements, setAgreements] = useState([]);
    const [manufacturersList, setManufacturersList] = useState([]);

    // 로딩 및 검색 필터
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [filterType, setFilterType] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');

    // 모달 상태 (4종)
    const [showQualModal, setShowQualModal] = useState(false);
    const [selectedQual, setSelectedQual] = useState(null);

    const [showEvalModal, setShowEvalModal] = useState(false);
    const [selectedEval, setSelectedEval] = useState(null);

    const [showQaaModal, setShowQaaModal] = useState(false);
    const [selectedQaa, setSelectedQaa] = useState(null);

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailQual, setDetailQual] = useState(null);

    // 권한 확인
    const isAdmin = user?.roles?.some(r => r.authority === 'ROLE_ADMIN' || r.authority === 'ADMIN') || user?.username === 'admin';
    const isManufacturer = user?.roles?.some(r => r.authority?.includes('MANUFACTURER')) || user?.department === '제조사';

    // -------------------------------------------------------------------------
    // 데이터 로드
    // -------------------------------------------------------------------------
    const loadKpi = useCallback(async () => {
        try {
            const data = await fetchSupplierKpi();
            setKpiData(data);
        } catch (err) {
            console.error('Failed to load supplier KPIs:', err);
        }
    }, []);

    const loadQualifications = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page: 0,
                size: 200,
                status: filterStatus || undefined,
                grade: filterGrade || undefined,
                type: filterType || undefined,
                keyword: searchKeyword || undefined
            };
            const res = await fetchSupplierQualifications(params);
            setQualifications(res.content || []);
        } catch (err) {
            console.error('Failed to load qualifications:', err);
            toast.error('공급업체 적격성 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterGrade, filterType, searchKeyword]);

    const loadEvaluations = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page: 0,
                size: 200,
                grade: filterGrade || undefined,
                keyword: searchKeyword || undefined
            };
            const res = await fetchSupplierEvaluations(params);
            setEvaluations(res.content || []);
        } catch (err) {
            console.error('Failed to load evaluations:', err);
            toast.error('공급업체 평가 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filterGrade, searchKeyword]);

    const loadAgreements = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page: 0,
                size: 200,
                status: filterStatus || undefined,
                type: filterType || undefined,
                keyword: searchKeyword || undefined
            };
            const res = await fetchQualityAgreements(params);
            setAgreements(res.content || []);
        } catch (err) {
            console.error('Failed to load quality agreements:', err);
            toast.error('품질협약서 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterType, searchKeyword]);

    const loadManufacturers = useCallback(async () => {
        try {
            const data = await getManufacturers();
            setManufacturersList(data || []);
        } catch (err) {
            console.error('Failed to load manufacturers:', err);
        }
    }, []);

    useEffect(() => {
        loadKpi();
        loadManufacturers();
    }, [loadKpi, loadManufacturers]);

    useEffect(() => {
        if (activeTab === 1) loadQualifications();
        if (activeTab === 2) loadEvaluations();
        if (activeTab === 3) loadAgreements();
    }, [activeTab, loadQualifications, loadEvaluations, loadAgreements]);

    const handleRefreshAll = () => {
        loadKpi();
        if (activeTab === 1) loadQualifications();
        if (activeTab === 2) loadEvaluations();
        if (activeTab === 3) loadAgreements();
        toast.info('데이터를 새로고침했습니다.');
    };

    // -------------------------------------------------------------------------
    // AG Grid 컬럼 정의
    // -------------------------------------------------------------------------

    // 1. 적격성 마스터 컬럼
    const qualColumnDefs = useMemo(() => [
        {
            headerName: '공급사 코드',
            field: 'supplierCode',
            width: 140,
            pinned: 'left',
            cellStyle: { fontWeight: '700', color: '#1e40af', cursor: 'pointer' },
            onCellClicked: (params) => {
                setDetailQual(params.data);
                setShowDetailModal(true);
            }
        },
        {
            headerName: '제조사(공급업체)명',
            field: 'manufacturerName',
            width: 180,
            pinned: 'left',
            cellStyle: { fontWeight: '600' }
        },
        {
            headerName: '공급 유형',
            field: 'supplierTypeDesc',
            width: 180
        },
        {
            headerName: '승인 상태',
            field: 'approvalStatusDesc',
            width: 160,
            cellRenderer: (params) => {
                const conf = APPROVAL_STATUSES.find(s => s.value === params.data.approvalStatus) || {};
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: conf.color || '#374151',
                        backgroundColor: conf.bg || '#f3f4f6'
                    }}>
                        {params.value || params.data.approvalStatus}
                    </span>
                );
            }
        },
        {
            headerName: '품질 등급',
            field: 'supplierGradeDesc',
            width: 150,
            cellRenderer: (params) => {
                const conf = SUPPLIER_GRADES.find(g => g.value === params.data.supplierGrade) || {};
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: conf.color || '#374151',
                        backgroundColor: conf.bg || '#f3f4f6'
                    }}>
                        {params.value || params.data.supplierGrade}
                    </span>
                );
            }
        },
        {
            headerName: '위험도',
            field: 'riskLevel',
            width: 100,
            cellRenderer: (params) => {
                const isHigh = params.value === 'HIGH';
                return (
                    <span style={{
                        color: isHigh ? '#dc2626' : '#2563eb',
                        fontWeight: '700'
                    }}>
                        {params.value || 'MEDIUM'}
                    </span>
                );
            }
        },
        {
            headerName: 'ISO/GMP 인증',
            field: 'isoCertifications',
            width: 180,
            cellStyle: { color: '#4b5563', fontSize: '13px' }
        },
        {
            headerName: '최초 승인일',
            field: 'initialApprovalDate',
            width: 120
        },
        {
            headerName: '차기 평가일',
            field: 'nextEvaluationDate',
            width: 120,
            cellStyle: (params) => {
                if (params.value && new Date(params.value) < new Date()) {
                    return { color: '#dc2626', fontWeight: '700' };
                }
                return {};
            }
        },
        {
            headerName: '작업',
            width: 150,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => {
                            setSelectedQual(params.data);
                            setShowQualModal(true);
                        }}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            background: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        수정
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => handleDeleteQualification(params.data.id)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #fca5a5',
                                background: '#fef2f2',
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
    ], [isAdmin]);

    // 2. 정기 종합평가 컬럼
    const evalColumnDefs = useMemo(() => [
        {
            headerName: '공급사명',
            field: 'manufacturerName',
            width: 180,
            pinned: 'left',
            cellStyle: { fontWeight: '700' }
        },
        {
            headerName: '식별코드',
            field: 'supplierCode',
            width: 130
        },
        {
            headerName: '평가 주기',
            field: 'evaluationPeriodDesc',
            width: 150,
            valueGetter: (params) => `${params.data.evaluationYear}년 ${params.data.evaluationPeriodDesc || params.data.evaluationPeriod}`
        },
        {
            headerName: '품질 (40점)',
            field: 'qualityScore',
            width: 110,
            cellStyle: { textAlign: 'center', fontWeight: '600' }
        },
        {
            headerName: '납기 (25점)',
            field: 'deliveryScore',
            width: 110,
            cellStyle: { textAlign: 'center', fontWeight: '600' }
        },
        {
            headerName: '규제/서류 (20점)',
            field: 'complianceScore',
            width: 130,
            cellStyle: { textAlign: 'center', fontWeight: '600' }
        },
        {
            headerName: '협력 (15점)',
            field: 'serviceScore',
            width: 110,
            cellStyle: { textAlign: 'center', fontWeight: '600' }
        },
        {
            headerName: '총점 (100점)',
            field: 'totalScore',
            width: 120,
            cellStyle: { textAlign: 'center', fontWeight: '800', color: '#1e3a8a', fontSize: '15px' }
        },
        {
            headerName: '평가 등급',
            field: 'evaluationGradeDesc',
            width: 150,
            cellRenderer: (params) => {
                const conf = SUPPLIER_GRADES.find(g => g.value === params.data.evaluationGrade) || {};
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: conf.color || '#374151',
                        backgroundColor: conf.bg || '#f3f4f6'
                    }}>
                        {params.value || params.data.evaluationGrade}
                    </span>
                );
            }
        },
        {
            headerName: '평가일자',
            field: 'evaluationDate',
            width: 120
        },
        {
            headerName: '평가자',
            field: 'evaluatorName',
            width: 110
        },
        {
            headerName: '시정조치(CAPA)',
            field: 'correctiveActionRequired',
            width: 130,
            cellRenderer: (params) => params.value ? (
                <span style={{ color: '#dc2626', fontWeight: '700' }}>⚠️ 요구됨</span>
            ) : (
                <span style={{ color: '#10b981' }}>-</span>
            )
        },
        {
            headerName: '작업',
            width: 120,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => {
                            setSelectedEval(params.data);
                            setShowEvalModal(true);
                        }}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            background: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        수정
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => handleDeleteEvaluation(params.data.id)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #fca5a5',
                                background: '#fef2f2',
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
    ], [isAdmin]);

    // 3. 품질협약서(QAA) 컬럼
    const qaaColumnDefs = useMemo(() => [
        {
            headerName: '협약 번호',
            field: 'agreementNumber',
            width: 150,
            pinned: 'left',
            cellStyle: { fontWeight: '700', color: '#1e40af' }
        },
        {
            headerName: '제조사(공급사)',
            field: 'manufacturerName',
            width: 180,
            pinned: 'left',
            cellStyle: { fontWeight: '600' }
        },
        {
            headerName: '협약 제목',
            field: 'title',
            width: 240
        },
        {
            headerName: '협약 유형',
            field: 'agreementTypeDesc',
            width: 190
        },
        {
            headerName: '효력 상태',
            field: 'agreementStatusDesc',
            width: 160,
            cellRenderer: (params) => {
                const conf = AGREEMENT_STATUSES.find(s => s.value === params.data.agreementStatus) || {};
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: conf.color || '#374151',
                        backgroundColor: conf.bg || '#f3f4f6'
                    }}>
                        {params.value || params.data.agreementStatus}
                    </span>
                );
            }
        },
        {
            headerName: '발효일자',
            field: 'effectiveDate',
            width: 120
        },
        {
            headerName: '만료일자',
            field: 'expiryDate',
            width: 120,
            cellStyle: (params) => {
                if (params.data.agreementStatus === 'EXPIRING_SOON') {
                    return { color: '#f59e0b', fontWeight: '700' };
                }
                if (params.data.agreementStatus === 'EXPIRED') {
                    return { color: '#dc2626', fontWeight: '700' };
                }
                return {};
            }
        },
        {
            headerName: '법정 보존 만료일',
            field: 'retentionExpiryDate',
            width: 140,
            cellStyle: { color: '#4b5563', fontSize: '13px' }
        },
        {
            headerName: '자동갱신',
            field: 'autoRenewal',
            width: 100,
            cellRenderer: (params) => params.value ? '✅ 가능' : '수동'
        },
        {
            headerName: '협약서 문서',
            field: 'documentFileName',
            width: 180,
            cellRenderer: (params) => params.data.agreementDocUrl ? (
                <a
                    href={params.data.agreementDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#2563eb', textDecoration: 'underline' }}
                >
                    📄 {params.value || '다운로드'}
                </a>
            ) : (
                <span style={{ color: '#9ca3af' }}>미등록</span>
            )
        },
        {
            headerName: '작업',
            width: 120,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => {
                            setSelectedQaa(params.data);
                            setShowQaaModal(true);
                        }}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            background: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        수정
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => handleDeleteAgreement(params.data.id)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #fca5a5',
                                background: '#fef2f2',
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
    ], [isAdmin]);

    // -------------------------------------------------------------------------
    // 핸들러: 삭제
    // -------------------------------------------------------------------------
    const handleDeleteQualification = async (id) => {
        if (!window.confirm('정말 이 공급업체 적격성 기록을 삭제하시겠습니까? (소프트 딜리트)')) return;
        try {
            await deleteSupplierQualification(id);
            toast.success('공급업체 적격성 기록이 삭제되었습니다.');
            loadQualifications();
            loadKpi();
        } catch (err) {
            console.error('Delete qual error:', err);
            toast.error('삭제에 실패했습니다.');
        }
    };

    const handleDeleteEvaluation = async (id) => {
        if (!window.confirm('정말 이 평가 기록을 삭제하시겠습니까?')) return;
        try {
            await deleteSupplierEvaluation(id);
            toast.success('평가 기록이 삭제되었습니다.');
            loadEvaluations();
            loadKpi();
        } catch (err) {
            console.error('Delete eval error:', err);
            toast.error('삭제에 실패했습니다.');
        }
    };

    const handleDeleteAgreement = async (id) => {
        if (!window.confirm('정말 이 품질협약서(QAA)를 삭제하시겠습니까?')) return;
        try {
            await deleteQualityAgreement(id);
            toast.success('품질협약서가 삭제되었습니다.');
            loadAgreements();
            loadKpi();
        } catch (err) {
            console.error('Delete qaa error:', err);
            toast.error('삭제에 실패했습니다.');
        }
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
            {/* ========================================================================= */}
            {/* 3-Tier Header: Tier 1 - 메인 타이틀 & 작업 버튼 */}
            {/* ========================================================================= */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e2e8f0'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '28px' }}>🏭</span>
                        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                            공급업체 및 위탁제조 관리 (Supplier & Contract Manufacturer Management)
                        </h1>
                        <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            background: '#dbeafe',
                            color: '#1e40af',
                            fontSize: '12px',
                            fontWeight: '700'
                        }}>
                            ISO 13485 §4.1.5, §7.4 / ISO 22716 §12
                        </span>
                    </div>
                    <p style={{ margin: '6px 0 0 38px', fontSize: '13px', color: '#64748b' }}>
                        공급업체 적격성 승인 목록(ASL), 정기 4대 영역 종합평가, 법정 보존 기한이 보장되는 품질보증협약(QAA)을 통합 관리합니다.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleRefreshAll}
                        style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#334155',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        🔄 새로고침
                    </button>
                    {activeTab === 1 && (
                        <button
                            onClick={() => {
                                setSelectedQual(null);
                                setShowQualModal(true);
                            }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#1e40af',
                                color: '#fff',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(30, 64, 175, 0.2)'
                            }}
                        >
                            + 공급업체 적격성 등록
                        </button>
                    )}
                    {activeTab === 2 && (
                        <button
                            onClick={() => {
                                setSelectedEval(null);
                                setShowEvalModal(true);
                            }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#047857',
                                color: '#fff',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)'
                            }}
                        >
                            + 정기 종합평가 등록
                        </button>
                    )}
                    {activeTab === 3 && (
                        <button
                            onClick={() => {
                                setSelectedQaa(null);
                                setShowQaaModal(true);
                            }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#4338ca',
                                color: '#fff',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)'
                            }}
                        >
                            + QAA 협약서 등록
                        </button>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 3-Tier Header: Tier 2 - 규제 표준 매뉴얼 배너 */}
            {/* ========================================================================= */}
            <div style={{ marginBottom: '20px' }}>
                <RegulatoryManualBanner pageKey="supplierManagement" />
            </div>

            {/* ========================================================================= */}
            {/* 3-Tier Header: Tier 3 - 6대 반응형 KPI 카드 그리드 */}
            {/* ========================================================================= */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{
                    background: '#fff',
                    padding: '18px 20px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>전체 등록 공급업체</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
                        {kpiData.totalSuppliers} <span style={{ fontSize: '14px', fontWeight: '500', color: '#94a3b8' }}>개사</span>
                    </div>
                </div>

                <div style={{
                    background: '#fff',
                    padding: '18px 20px',
                    borderRadius: '10px',
                    border: '1px solid #bbf7d0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '13px', color: '#15803d', fontWeight: '600' }}>공식 승인 업체 (APPROVED)</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#16a34a', marginTop: '6px' }}>
                        {kpiData.approvedSuppliers} <span style={{ fontSize: '14px', fontWeight: '500', color: '#86efac' }}>개사</span>
                    </div>
                </div>

                <div style={{
                    background: '#fff',
                    padding: '18px 20px',
                    borderRadius: '10px',
                    border: '1px solid #fde68a',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '13px', color: '#b45309', fontWeight: '600' }}>조건부 승인/주의</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>
                        {kpiData.conditionalSuppliers} <span style={{ fontSize: '14px', fontWeight: '500', color: '#fcd34d' }}>개사</span>
                    </div>
                </div>

                <div style={{
                    background: '#fff',
                    padding: '18px 20px',
                    borderRadius: '10px',
                    border: '1px solid #e0e7ff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '13px', color: '#4338ca', fontWeight: '600' }}>QAA 협약 체결률</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#4f46e5', marginTop: '6px' }}>
                        {kpiData.qaaComplianceRate} <span style={{ fontSize: '16px', fontWeight: '600' }}>%</span>
                    </div>
                </div>

                <div style={{
                    background: '#fff',
                    padding: '18px 20px',
                    borderRadius: '10px',
                    border: kpiData.qaaExpiringSoonCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '13px', color: kpiData.qaaExpiringSoonCount > 0 ? '#b91c1c' : '#64748b', fontWeight: '600' }}>
                        30일내 만료임박 QAA
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: kpiData.qaaExpiringSoonCount > 0 ? '#dc2626' : '#0f172a', marginTop: '6px' }}>
                        {kpiData.qaaExpiringSoonCount} <span style={{ fontSize: '14px', fontWeight: '500', color: '#94a3b8' }}>건</span>
                    </div>
                </div>

                <div style={{
                    background: '#fff',
                    padding: '18px 20px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>평균 공급업체 평가점수</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
                        {kpiData.averageEvaluationScore} <span style={{ fontSize: '14px', fontWeight: '500', color: '#94a3b8' }}>/ 100점</span>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 탭 네비게이션 */}
            {/* ========================================================================= */}
            <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '2px solid #e2e8f0',
                marginBottom: '16px'
            }}>
                <button
                    onClick={() => setActiveTab(1)}
                    style={{
                        padding: '10px 18px',
                        fontSize: '14px',
                        fontWeight: activeTab === 1 ? '700' : '500',
                        color: activeTab === 1 ? '#1e40af' : '#64748b',
                        borderBottom: activeTab === 1 ? '3px solid #1e40af' : '3px solid transparent',
                        background: 'transparent',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    📋 1. 공급업체 적격성 승인 목록 (ASL)
                </button>
                <button
                    onClick={() => setActiveTab(2)}
                    style={{
                        padding: '10px 18px',
                        fontSize: '14px',
                        fontWeight: activeTab === 2 ? '700' : '500',
                        color: activeTab === 2 ? '#047857' : '#64748b',
                        borderBottom: activeTab === 2 ? '3px solid #047857' : '3px solid transparent',
                        background: 'transparent',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    📊 2. 정기 공급자 종합평가 (Performance)
                </button>
                <button
                    onClick={() => setActiveTab(3)}
                    style={{
                        padding: '10px 18px',
                        fontSize: '14px',
                        fontWeight: activeTab === 3 ? '700' : '500',
                        color: activeTab === 3 ? '#4338ca' : '#64748b',
                        borderBottom: activeTab === 3 ? '3px solid #4338ca' : '3px solid transparent',
                        background: 'transparent',
                        borderTop: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    📜 3. 품질보증협약서 (QAA) 보존 관리
                </button>
            </div>

            {/* ========================================================================= */}
            {/* 검색 및 다차원 필터 바 */}
            {/* ========================================================================= */}
            <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                backgroundColor: '#fff',
                padding: '14px 18px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>검색:</span>
                    <input
                        type="text"
                        placeholder="업체명, 코드, 품목, 제목 검색..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            width: '220px'
                        }}
                    />
                </div>

                {activeTab === 1 && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>승인상태:</span>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '13px'
                                }}
                            >
                                <option value="">전체 상태</option>
                                {APPROVAL_STATUSES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>등급:</span>
                            <select
                                value={filterGrade}
                                onChange={(e) => setFilterGrade(e.target.value)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '13px'
                                }}
                            >
                                <option value="">전체 등급</option>
                                {SUPPLIER_GRADES.map(g => (
                                    <option key={g.value} value={g.value}>{g.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>공급유형:</span>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '13px'
                                }}
                            >
                                <option value="">전체 유형</option>
                                {SUPPLIER_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                {activeTab === 2 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>평가등급:</span>
                        <select
                            value={filterGrade}
                            onChange={(e) => setFilterGrade(e.target.value)}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px'
                            }}
                        >
                            <option value="">전체 등급</option>
                            {SUPPLIER_GRADES.map(g => (
                                <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                {activeTab === 3 && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>협약상태:</span>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '13px'
                                }}
                            >
                                <option value="">전체 상태</option>
                                {AGREEMENT_STATUSES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>협약유형:</span>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '13px'
                                }}
                            >
                                <option value="">전체 유형</option>
                                {AGREEMENT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                <button
                    onClick={() => {
                        setFilterStatus('');
                        setFilterGrade('');
                        setFilterType('');
                        setSearchKeyword('');
                    }}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        fontSize: '12px',
                        color: '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    필터 초기화
                </button>
            </div>

            {/* ========================================================================= */}
            {/* 메인 AG Grid 테이블 컨테이너 */}
            {/* ========================================================================= */}
            <div
                className="ag-theme-alpine"
                style={{
                    height: '560px',
                    width: '100%',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    border: '1px solid #e2e8f0'
                }}
            >
                {activeTab === 1 && (
                    <AgGridReact
                        rowData={qualifications}
                        columnDefs={qualColumnDefs}
                        rowHeight={54}
                        pagination={true}
                        paginationPageSize={10}
                        theme="legacy"
                        overlayLoadingTemplate='<span class="ag-overlay-loading-center">공급업체 적격성 목록 로딩 중...</span>'
                    />
                )}
                {activeTab === 2 && (
                    <AgGridReact
                        rowData={evaluations}
                        columnDefs={evalColumnDefs}
                        rowHeight={54}
                        pagination={true}
                        paginationPageSize={10}
                        theme="legacy"
                        overlayLoadingTemplate='<span class="ag-overlay-loading-center">정기 평가 목록 로딩 중...</span>'
                    />
                )}
                {activeTab === 3 && (
                    <AgGridReact
                        rowData={agreements}
                        columnDefs={qaaColumnDefs}
                        rowHeight={54}
                        pagination={true}
                        paginationPageSize={10}
                        theme="legacy"
                        overlayLoadingTemplate='<span class="ag-overlay-loading-center">품질협약서(QAA) 목록 로딩 중...</span>'
                    />
                )}
            </div>

            {/* ========================================================================= */}
            {/* 모달 1: 공급업체 적격성 등록/수정 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {showQualModal && (
                <SupplierQualificationModal
                    isOpen={showQualModal}
                    initialData={selectedQual}
                    manufacturers={manufacturersList}
                    onClose={() => setShowQualModal(false)}
                    onSuccess={() => {
                        setShowQualModal(false);
                        loadQualifications();
                        loadKpi();
                    }}
                />
            )}

            {/* ========================================================================= */}
            {/* 모달 2: 정기 종합평가 등록/수정 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {showEvalModal && (
                <SupplierEvaluationModal
                    isOpen={showEvalModal}
                    initialData={selectedEval}
                    qualifications={qualifications}
                    onClose={() => setShowEvalModal(false)}
                    onSuccess={() => {
                        setShowEvalModal(false);
                        loadEvaluations();
                        loadKpi();
                    }}
                />
            )}

            {/* ========================================================================= */}
            {/* 모달 3: 품질협약서(QAA) 등록/수정 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {showQaaModal && (
                <QualityAgreementModal
                    isOpen={showQaaModal}
                    initialData={selectedQaa}
                    manufacturers={manufacturersList}
                    qualifications={qualifications}
                    onClose={() => setShowQaaModal(false)}
                    onSuccess={() => {
                        setShowQaaModal(false);
                        loadAgreements();
                        loadKpi();
                    }}
                />
            )}

            {/* ========================================================================= */}
            {/* 모달 4: 공급업체 종합 상세 뷰어 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {showDetailModal && detailQual && (
                <SupplierDetailModal
                    qual={detailQual}
                    onClose={() => setShowDetailModal(false)}
                />
            )}
        </div>
    );
}

// =========================================================================
// 모달 1: 공급업체 적격성 등록/수정 컴포넌트
// =========================================================================
function SupplierQualificationModal({ isOpen, initialData, manufacturers, onClose, onSuccess }) {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState({
        supplierCode: initialData?.supplierCode || '',
        manufacturerId: initialData?.manufacturerId || (manufacturers[0]?.id || ''),
        supplierType: initialData?.supplierType || 'RAW_MATERIAL',
        approvalStatus: initialData?.approvalStatus || 'PENDING_QUALIFICATION',
        supplierGrade: initialData?.supplierGrade || 'GRADE_B',
        riskLevel: initialData?.riskLevel || 'MEDIUM',
        isoCertifications: initialData?.isoCertifications || '',
        businessRegistrationNumber: initialData?.businessRegistrationNumber || '',
        initialApprovalDate: initialData?.initialApprovalDate || '',
        lastAuditDate: initialData?.lastAuditDate || '',
        nextEvaluationDate: initialData?.nextEvaluationDate || '',
        scopeOfSupply: initialData?.scopeOfSupply || '',
        qualificationNotes: initialData?.qualificationNotes || '',
        approvedBy: initialData?.approvedBy || ''
    });

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.manufacturerId) {
            toast.warn('제조사(공급업체)를 선택해주세요.');
            return;
        }

        try {
            setSubmitting(true);
            if (isEdit) {
                await updateSupplierQualification(initialData.id, formData);
                toast.success('공급업체 적격성 정보가 성공적으로 수정되었습니다.');
            } else {
                await createSupplierQualification(formData);
                toast.success('공급업체 적격성 정보가 신규 등록되었습니다.');
            }
            onSuccess();
        } catch (err) {
            console.error('Submit qual error:', err);
            toast.error(err.response?.data?.message || '저장에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                width: '96vw',
                height: '92vh',
                backgroundColor: '#fff',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
            }}>
                {/* 헤더 */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc'
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                        {isEdit ? '🏭 공급업체 적격성 정보 수정' : '🏭 공급업체 적격성(ASL) 신규 등록'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: '22px',
                            cursor: 'pointer',
                            color: '#64748b'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 폼 본문 */}
                <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                공급업체 (제조사 마스터 연동) *
                            </label>
                            <select
                                value={formData.manufacturerId}
                                onChange={(e) => setFormData({ ...formData, manufacturerId: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="">선택하세요</option>
                                {manufacturers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.category || '기타'})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                공급업체 유형 (Supplier Type) *
                            </label>
                            <select
                                value={formData.supplierType}
                                onChange={(e) => setFormData({ ...formData, supplierType: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                {SUPPLIER_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                품질 적격성 승인 상태 *
                            </label>
                            <select
                                value={formData.approvalStatus}
                                onChange={(e) => setFormData({ ...formData, approvalStatus: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                {APPROVAL_STATUSES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                품질 평가 등급
                            </label>
                            <select
                                value={formData.supplierGrade}
                                onChange={(e) => setFormData({ ...formData, supplierGrade: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                {SUPPLIER_GRADES.map(g => (
                                    <option key={g.value} value={g.value}>{g.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                품질 위험도 (Risk Level)
                            </label>
                            <select
                                value={formData.riskLevel}
                                onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="HIGH">HIGH (핵심 원료/멸균/직접접촉)</option>
                                <option value="MEDIUM">MEDIUM (일반 부자재/외포장)</option>
                                <option value="LOW">LOW (단순 용역/간접 소모품)</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                사업자 등록번호
                            </label>
                            <input
                                type="text"
                                value={formData.businessRegistrationNumber}
                                onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
                                placeholder="000-00-00000"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                최초 승인 일자
                            </label>
                            <input
                                type="date"
                                value={formData.initialApprovalDate}
                                onChange={(e) => setFormData({ ...formData, initialApprovalDate: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                최근 실사(감사) 일자
                            </label>
                            <input
                                type="date"
                                value={formData.lastAuditDate}
                                onChange={(e) => setFormData({ ...formData, lastAuditDate: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                차기 정기 평가 예정일
                            </label>
                            <input
                                type="date"
                                value={formData.nextEvaluationDate}
                                onChange={(e) => setFormData({ ...formData, nextEvaluationDate: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                            보유 인증 (ISO 13485, ISO 22716, CGMP 등)
                        </label>
                        <input
                            type="text"
                            value={formData.isoCertifications}
                            onChange={(e) => setFormData({ ...formData, isoCertifications: e.target.value })}
                            placeholder="예: ISO 13485:2016, ISO 9001:2015, K-GMP"
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                            공급 품목 및 적용 범위 (Scope of Supply)
                        </label>
                        <textarea
                            rows={3}
                            value={formData.scopeOfSupply}
                            onChange={(e) => setFormData({ ...formData, scopeOfSupply: e.target.value })}
                            placeholder="공급 품목 명세, 규격 및 적용 제품..."
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                            적격성 심사 의견 및 특이사항
                        </label>
                        <textarea
                            rows={3}
                            value={formData.qualificationNotes}
                            onChange={(e) => setFormData({ ...formData, qualificationNotes: e.target.value })}
                            placeholder="실사 결과 요약, CAPA 이행 조건 등..."
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#1e40af',
                                color: '#fff',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            {submitting ? '저장 중...' : (isEdit ? '수정 완료' : '적격성 등록')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =========================================================================
// 모달 2: 정기 종합평가 등록/수정 컴포넌트 (4대 영역 실시간 계산)
// =========================================================================
function SupplierEvaluationModal({ isOpen, initialData, qualifications, onClose, onSuccess }) {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState({
        qualificationId: initialData?.qualificationId || (qualifications[0]?.id || ''),
        evaluationYear: initialData?.evaluationYear || new Date().getFullYear(),
        evaluationPeriod: initialData?.evaluationPeriod || 'ANNUAL',
        qualityScore: initialData?.qualityScore !== undefined ? initialData.qualityScore : 35,
        deliveryScore: initialData?.deliveryScore !== undefined ? initialData.deliveryScore : 22,
        complianceScore: initialData?.complianceScore !== undefined ? initialData.complianceScore : 18,
        serviceScore: initialData?.serviceScore !== undefined ? initialData.serviceScore : 13,
        evaluationDate: initialData?.evaluationDate || new Date().toISOString().split('T')[0],
        evaluatorName: initialData?.evaluatorName || '',
        evaluatorDepartment: initialData?.evaluatorDepartment || '품질경영본부',
        evaluationSummary: initialData?.evaluationSummary || '',
        correctiveActionRequired: initialData?.correctiveActionRequired || false,
        actionDetails: initialData?.actionDetails || ''
    });

    const [submitting, setSubmitting] = useState(false);

    // 실시간 총점 및 등급 계산
    const currentTotal = useMemo(() => {
        const q = Number(formData.qualityScore) || 0;
        const d = Number(formData.deliveryScore) || 0;
        const c = Number(formData.complianceScore) || 0;
        const s = Number(formData.serviceScore) || 0;
        return q + d + c + s;
    }, [formData.qualityScore, formData.deliveryScore, formData.complianceScore, formData.serviceScore]);

    const currentGrade = useMemo(() => {
        if (currentTotal >= 90) return { grade: 'GRADE_A', text: 'A등급 (우수 - 90점 이상)', color: '#059669', bg: '#d1fae5' };
        if (currentTotal >= 80) return { grade: 'GRADE_B', text: 'B등급 (양호 - 80~89점)', color: '#2563eb', bg: '#dbeafe' };
        if (currentTotal >= 70) return { grade: 'GRADE_C', text: 'C등급 (주의 - 70~79점)', color: '#d97706', bg: '#fef3c7' };
        return { grade: 'GRADE_D', text: 'D등급 (부적격 - 70점 미만)', color: '#dc2626', bg: '#fee2e2' };
    }, [currentTotal]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.qualificationId) {
            toast.warn('평가 대상 공급업체를 선택해주세요.');
            return;
        }

        try {
            setSubmitting(true);
            if (isEdit) {
                await updateSupplierEvaluation(initialData.id, formData);
                toast.success('공급업체 평가 기록이 수정되었습니다.');
            } else {
                await createSupplierEvaluation(formData);
                toast.success('공급업체 정기 종합평가가 등록되었습니다.');
            }
            onSuccess();
        } catch (err) {
            console.error('Submit eval error:', err);
            toast.error(err.response?.data?.message || '평가 등록에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                width: '96vw',
                height: '92vh',
                backgroundColor: '#fff',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
            }}>
                {/* 헤더 */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc'
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                        {isEdit ? '📊 공급업체 정기 평가 수정' : '📊 정기 공급업체 성과 종합평가 (ISO 13485 / ISO 22716)'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                    {/* 공급사 선택 및 평가 시기 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                평가 대상 공급업체 (ASL 등재 업체) *
                            </label>
                            <select
                                value={formData.qualificationId}
                                onChange={(e) => setFormData({ ...formData, qualificationId: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="">선택하세요</option>
                                {qualifications.map(q => (
                                    <option key={q.id} value={q.id}>
                                        [{q.supplierCode}] {q.manufacturerName} - {q.supplierTypeDesc}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                평가 연도 *
                            </label>
                            <input
                                type="number"
                                value={formData.evaluationYear}
                                onChange={(e) => setFormData({ ...formData, evaluationYear: Number(e.target.value) })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                평가 주기 *
                            </label>
                            <select
                                value={formData.evaluationPeriod}
                                onChange={(e) => setFormData({ ...formData, evaluationPeriod: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                {EVAL_PERIODS.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 실시간 종합 점수 & 등급 판정 디스플레이 박스 */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '16px 24px',
                        marginBottom: '24px'
                    }}>
                        <div>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>4대 영역 실시간 총점 산출:</span>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>
                                {currentTotal} <span style={{ fontSize: '16px', fontWeight: '600', color: '#94a3b8' }}>/ 100점 만점</span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>산출 판정 등급:</span>
                            <div style={{
                                marginTop: '4px',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '800',
                                color: currentGrade.color,
                                backgroundColor: currentGrade.bg
                            }}>
                                {currentGrade.text}
                            </div>
                        </div>
                    </div>

                    {/* 4대 평가 영역 점수 슬라이더 / 인풋 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        {/* 1. 품질 점수 (40점) */}
                        <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '700', color: '#1e40af' }}>
                                    1. 품질 점수 (최대 40점)
                                </label>
                                <span style={{ fontWeight: '800', color: '#1e40af' }}>{formData.qualityScore}점</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={40}
                                value={formData.qualityScore}
                                onChange={(e) => setFormData({ ...formData, qualityScore: Number(e.target.value) })}
                                style={{ width: '100%' }}
                            />
                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                수입검사 합격률, 불량률, 클레임 발생 건수(0건: 40점, 1건: 30점...)
                            </p>
                        </div>

                        {/* 2. 납기 점수 (25점) */}
                        <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '700', color: '#047857' }}>
                                    2. 납기 점수 (최대 25점)
                                </label>
                                <span style={{ fontWeight: '800', color: '#047857' }}>{formData.deliveryScore}점</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={25}
                                value={formData.deliveryScore}
                                onChange={(e) => setFormData({ ...formData, deliveryScore: Number(e.target.value) })}
                                style={{ width: '100%' }}
                            />
                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                정시 납품률 98% 이상(25점), 95~97%(20점), 납기 지연 일수 반영
                            </p>
                        </div>

                        {/* 3. 규제/서류 적합성 (20점) */}
                        <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '700', color: '#b45309' }}>
                                    3. 규제/서류 적합성 (최대 20점)
                                </label>
                                <span style={{ fontWeight: '800', color: '#b45309' }}>{formData.complianceScore}점</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={20}
                                value={formData.complianceScore}
                                onChange={(e) => setFormData({ ...formData, complianceScore: Number(e.target.value) })}
                                style={{ width: '100%' }}
                            />
                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                시험성적서(COA) 동봉 적시성, MSDS, 인증서 갱신, 변경 사전통보 의무 준수
                            </p>
                        </div>

                        {/* 4. 서비스/협력 점수 (15점) */}
                        <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '700', color: '#4338ca' }}>
                                    4. 서비스/기술 협력 (최대 15점)
                                </label>
                                <span style={{ fontWeight: '800', color: '#4338ca' }}>{formData.serviceScore}점</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={15}
                                value={formData.serviceScore}
                                onChange={(e) => setFormData({ ...formData, serviceScore: Number(e.target.value) })}
                                style={{ width: '100%' }}
                            />
                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                품질 이슈 대응 속도, 기술 지원 협조성, 단가 안정성
                            </p>
                        </div>
                    </div>

                    {/* 평가자 정보 및 일자 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                평가 일자 *
                            </label>
                            <input
                                type="date"
                                value={formData.evaluationDate}
                                onChange={(e) => setFormData({ ...formData, evaluationDate: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                평가자 성명 *
                            </label>
                            <input
                                type="text"
                                value={formData.evaluatorName}
                                onChange={(e) => setFormData({ ...formData, evaluatorName: e.target.value })}
                                required
                                placeholder="평가자 실명 입력"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                평가 담당 부서
                            </label>
                            <input
                                type="text"
                                value={formData.evaluatorDepartment}
                                onChange={(e) => setFormData({ ...formData, evaluatorDepartment: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    </div>

                    {/* 평가 요약 */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                            종합 평가 의견 (Summary)
                        </label>
                        <textarea
                            rows={3}
                            value={formData.evaluationSummary}
                            onChange={(e) => setFormData({ ...formData, evaluationSummary: e.target.value })}
                            placeholder="공급업체 성과에 대한 종합적 총평 및 차기 개선 권고사항 입력..."
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    {/* 시정조치 요구 여부 */}
                    <div style={{
                        padding: '16px',
                        backgroundColor: formData.correctiveActionRequired ? '#fef2f2' : '#f8fafc',
                        borderRadius: '8px',
                        border: formData.correctiveActionRequired ? '1px solid #fecaca' : '1px solid #e2e8f0',
                        marginBottom: '20px'
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '700', color: '#b91c1c', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.correctiveActionRequired}
                                onChange={(e) => setFormData({ ...formData, correctiveActionRequired: e.target.checked })}
                            />
                            시정조치(CAPA) 요구 대상 업체로 지정 (C/D 등급 권고)
                        </label>
                        {formData.correctiveActionRequired && (
                            <div style={{ marginTop: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                                    요구 시정조치 상세 및 제출 기한
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.actionDetails}
                                    onChange={(e) => setFormData({ ...formData, actionDetails: e.target.value })}
                                    placeholder="예: 공정 이물 제어 대책서 및 밸리데이션 보고서 30일 내 제출 요구..."
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '600', cursor: 'pointer' }}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#047857',
                                color: '#fff',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            {submitting ? '저장 중...' : (isEdit ? '수정 완료' : '평가 완료 및 등급 반영')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =========================================================================
// 모달 3: 품질보증협약서(QAA) 등록/수정 컴포넌트
// =========================================================================
function QualityAgreementModal({ isOpen, initialData, manufacturers, qualifications, onClose, onSuccess }) {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState({
        agreementNumber: initialData?.agreementNumber || '',
        manufacturerId: initialData?.manufacturerId || (manufacturers[0]?.id || ''),
        qualificationId: initialData?.qualificationId || '',
        title: initialData?.title || '',
        agreementType: initialData?.agreementType || 'CONTRACT_MANUFACTURING',
        effectiveDate: initialData?.effectiveDate || new Date().toISOString().split('T')[0],
        expiryDate: initialData?.expiryDate || '',
        retentionExpiryDate: initialData?.retentionExpiryDate || '',
        autoRenewal: initialData?.autoRenewal || false,
        renewalNoticeDays: initialData?.renewalNoticeDays || 60,
        agreementStatus: initialData?.agreementStatus || 'ACTIVE',
        changeNotificationObligation: initialData?.changeNotificationObligation || '원자재, 공정, 규격, 제조소 변경 시 최소 30일 전 당사 품질부서에 서면 통보 및 사전 승인 득할 것',
        auditRightsConfirmed: initialData?.auditRightsConfirmed !== undefined ? initialData.auditRightsConfirmed : true,
        agreementDocUrl: initialData?.agreementDocUrl || '',
        documentFileName: initialData?.documentFileName || '',
        notes: initialData?.notes || ''
    });

    const [submitting, setSubmitting] = useState(false);

    // 날짜 자동 계산 헬퍼 (만료일 + 법정보존 5년)
    const handleSetRetentionDate = (years = 5) => {
        if (!formData.expiryDate) {
            toast.warn('먼저 협약 만료일자를 입력해주세요.');
            return;
        }
        const exp = new Date(formData.expiryDate);
        exp.setFullYear(exp.getFullYear() + years);
        setFormData({ ...formData, retentionExpiryDate: exp.toISOString().split('T')[0] });
        toast.info(`법정 보존 만료일이 만료일 기준 +${years}년으로 설정되었습니다.`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.effectiveDate || !formData.expiryDate || !formData.retentionExpiryDate) {
            toast.warn('필수 입력 항목(제목, 발효일자, 만료일자, 보존만료일자)을 확인해주세요.');
            return;
        }

        try {
            setSubmitting(true);
            if (isEdit) {
                await updateQualityAgreement(initialData.id, formData);
                toast.success('품질보증협약서(QAA)가 수정되었습니다.');
            } else {
                await createQualityAgreement(formData);
                toast.success('품질보증협약서(QAA)가 신규 체결 등록되었습니다.');
            }
            onSuccess();
        } catch (err) {
            console.error('Submit qaa error:', err);
            toast.error(err.response?.data?.message || '협약서 저장에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                width: '96vw',
                height: '92vh',
                backgroundColor: '#fff',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
            }}>
                {/* 헤더 */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc'
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                        {isEdit ? '📜 품질보증협약서(QAA) 수정' : '📜 품질보증협약서 (Quality Assurance Agreement - QAA) 신규 체결'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                협약 제목 *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                placeholder="예: 의료기기 핵심부품 공급 및 품질보증에 관한 기본협약서"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                협약 대상 제조사(공급업체) *
                            </label>
                            <select
                                value={formData.manufacturerId}
                                onChange={(e) => setFormData({ ...formData, manufacturerId: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="">선택하세요</option>
                                {manufacturers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                협약 유형 (Agreement Type) *
                            </label>
                            <select
                                value={formData.agreementType}
                                onChange={(e) => setFormData({ ...formData, agreementType: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                {AGREEMENT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                효력 상태 (Agreement Status)
                            </label>
                            <select
                                value={formData.agreementStatus}
                                onChange={(e) => setFormData({ ...formData, agreementStatus: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                {AGREEMENT_STATUSES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                갱신 통지 기한 (일수)
                            </label>
                            <input
                                type="number"
                                value={formData.renewalNoticeDays}
                                onChange={(e) => setFormData({ ...formData, renewalNoticeDays: Number(e.target.value) })}
                                placeholder="60"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                협약 발효 일자 *
                            </label>
                            <input
                                type="date"
                                value={formData.effectiveDate}
                                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                협약 만료 일자 *
                            </label>
                            <input
                                type="date"
                                value={formData.expiryDate}
                                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                                    법정 보존 만료일자 *
                                </label>
                                <span style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleSetRetentionDate(5)}
                                        style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                                    >
                                        +5년(의료기기)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSetRetentionDate(3)}
                                        style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                                    >
                                        +3년(화장품)
                                    </button>
                                </span>
                            </div>
                            <input
                                type="date"
                                value={formData.retentionExpiryDate}
                                onChange={(e) => setFormData({ ...formData, retentionExpiryDate: e.target.value })}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                            변경 사전 통보 의무 조항 (Change Notification Obligation)
                        </label>
                        <textarea
                            rows={2}
                            value={formData.changeNotificationObligation}
                            onChange={(e) => setFormData({ ...formData, changeNotificationObligation: e.target.value })}
                            placeholder="변경 발생 시 통보 기한 및 사전 승인 요건..."
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                협약서 스캔본 / 파일 다운로드 URL
                            </label>
                            <input
                                type="text"
                                value={formData.agreementDocUrl}
                                onChange={(e) => setFormData({ ...formData, agreementDocUrl: e.target.value })}
                                placeholder="/uploads/qaa/파일명.pdf"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                첨부 파일명
                            </label>
                            <input
                                type="text"
                                value={formData.documentFileName}
                                onChange={(e) => setFormData({ ...formData, documentFileName: e.target.value })}
                                placeholder="QAA_계약서_날인본.pdf"
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '24px',
                        padding: '14px 18px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        marginBottom: '20px'
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.autoRenewal}
                                onChange={(e) => setFormData({ ...formData, autoRenewal: e.target.checked })}
                            />
                            이의 미제기 시 1년 단위 자동 연장 (Auto Renewal)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.auditRightsConfirmed}
                                onChange={(e) => setFormData({ ...formData, auditRightsConfirmed: e.target.checked })}
                            />
                            당사 및 규제기관 현장 실사권(Audit Rights) 보장 명시
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '600', cursor: 'pointer' }}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#4338ca',
                                color: '#fff',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            {submitting ? '저장 중...' : (isEdit ? '수정 완료' : '품질협약 체결 등록')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =========================================================================
// 모달 4: 공급업체 종합 이력 및 상세 뷰어 모달
// =========================================================================
function SupplierDetailModal({ qual, onClose }) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                width: '96vw',
                height: '92vh',
                backgroundColor: '#fff',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
            }}>
                {/* 헤더 */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc'
                }}>
                    <div>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e40af' }}>[{qual.supplierCode}]</span>
                        <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                            {qual.manufacturerName} - 공급업체 상세 프로필
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}
                    >
                        ✕
                    </button>
                </div>

                {/* 본문 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>승인 상태</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                                {qual.approvalStatusDesc || qual.approvalStatus}
                            </div>
                        </div>
                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>품질 등급</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                                {qual.supplierGradeDesc || qual.supplierGrade}
                            </div>
                        </div>
                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>공급 유형</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                                {qual.supplierTypeDesc || qual.supplierType}
                            </div>
                        </div>
                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>위험도</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: qual.riskLevel === 'HIGH' ? '#dc2626' : '#2563eb', marginTop: '4px' }}>
                                {qual.riskLevel || 'MEDIUM'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700', color: '#1e3a8a' }}>
                                📋 기본 인허가 및 인증 정보
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                <div><strong>사업자등록번호:</strong> {qual.businessRegistrationNumber || '미등록'}</div>
                                <div><strong>보유 규격 인증:</strong> {qual.isoCertifications || '기록 없음'}</div>
                                <div><strong>최초 승인 일자:</strong> {qual.initialApprovalDate || '-'}</div>
                                <div><strong>최근 실사 일자:</strong> {qual.lastAuditDate || '-'}</div>
                                <div><strong>차기 평가 일자:</strong> {qual.nextEvaluationDate || '-'}</div>
                                <div><strong>승인자:</strong> {qual.approvedBy || '-'}</div>
                            </div>
                        </div>

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700', color: '#1e3a8a' }}>
                                📦 공급 범위 (Scope of Supply)
                            </h3>
                            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                                {qual.scopeOfSupply || '상세 공급 범위 정보가 등록되지 않았습니다.'}
                            </p>
                            <h4 style={{ margin: '14px 0 6px 0', fontSize: '13px', fontWeight: '700', color: '#475569' }}>
                                심사 특이사항
                            </h4>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                                {qual.qualificationNotes || '특이사항 없음.'}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#1e293b',
                                color: '#fff',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
