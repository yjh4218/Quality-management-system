import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner.jsx';
import {
    fetchVigilanceRecallKpis,
    fetchVigilanceReports,
    createVigilanceReport,
    updateVigilanceReport,
    submitVigilanceReport,
    transitionVigilanceStatus,
    deleteVigilanceReport,
    fetchProductRecalls,
    createProductRecall,
    updateProductRecall,
    updateRecallReconciliation,
    transitionProductRecallStatus,
    deleteProductRecall
} from './api.jsx';

// 규제기관 옵션
const AUTHORITY_OPTIONS = [
    { value: '', label: '전체 규제기관' },
    { value: 'MFDS', label: '식약처 (대한민국 MFDS)', color: '#10b981' },
    { value: 'FDA', label: '미국 FDA (21 CFR)', color: '#3b82f6' },
    { value: 'EU_MDR', label: '유럽 EU MDR (2017/745)', color: '#8b5cf6' }
];

// 규제 제품 유형
const REGULATORY_TYPE_OPTIONS = [
    { value: 'COSMETIC', label: '화장품 (ISO 22716)' },
    { value: 'MEDICAL_DEVICE', label: '의료기기 (ISO 13485 / MDR)' },
    { value: 'GENERAL', label: '일반 공산품' }
];

// 보고 분류
const CLASSIFICATION_OPTIONS = [
    { value: 'MFDS_DEATH_LIFE_THREAT_7D', label: '식약처 사망/생명위협 (7일 이내)', days: 7, authority: 'MFDS' },
    { value: 'MFDS_SERIOUS_15D', label: '식약처 기타 중대 부작용 (15일 이내)', days: 15, authority: 'MFDS' },
    { value: 'MFDS_GENERAL_30D', label: '식약처 통상 부작용 (30일 이내)', days: 30, authority: 'MFDS' },
    { value: 'MFDS_COSMETIC_SERIOUS_15D', label: '식약처 화장품 중대 유해사례 (15일 이내)', days: 15, authority: 'MFDS' },
    { value: 'MFDS_COSMETIC_QUARTERLY', label: '식약처 화장품 정기보고 (분기말 익월)', days: 45, authority: 'MFDS' },
    { value: 'FDA_5DAY_MDR', label: 'FDA 5-Day MDR (5일 이내)', days: 5, authority: 'FDA' },
    { value: 'FDA_30DAY_MDR', label: 'FDA 30-Day MDR (30일 이내)', days: 30, authority: 'FDA' },
    { value: 'EU_MDR_IMMEDIATE_2D', label: 'EU MDR 공중보건위해 (2일 이내)', days: 2, authority: 'EU_MDR' },
    { value: 'EU_MDR_SERIOUS_10D', label: 'EU MDR 사망/중대악화 (10일 이내)', days: 10, authority: 'EU_MDR' },
    { value: 'EU_MDR_INCIDENT_15D', label: 'EU MDR 중대사고 (15일 이내)', days: 15, authority: 'EU_MDR' }
];

// 사건 심각도
const SEVERITY_OPTIONS = [
    { value: 'DEATH', label: '사망', color: '#ef4444' },
    { value: 'LIFE_THREATENING', label: '생명 위협', color: '#f97316' },
    { value: 'HOSPITALIZATION', label: '입원 / 입원 연장', color: '#eab308' },
    { value: 'PERMANENT_DISABILITY', label: '영구적 장애 / 기능 상실', color: '#ec4899' },
    { value: 'CONGENITAL_ANOMALY', label: '선천적 기형 / 이상', color: '#8b5cf6' },
    { value: 'MALFUNCTION_RISK', label: '기능부전 (재발 시 상해 우려)', color: '#3b82f6' },
    { value: 'OTHER_SERIOUS', label: '기타 중대한 위해', color: '#64748b' }
];

// 회수 등급
const RECALL_CLASS_OPTIONS = [
    { value: 'CLASS_1', label: '1등급 (사망/중대한 건강피해)', color: '#ef4444' },
    { value: 'CLASS_2', label: '2등급 (일시적/가역적 손상)', color: '#f97316' },
    { value: 'CLASS_3', label: '3등급 (경미한 위반/피해 희박)', color: '#3b82f6' }
];

// 회수 상태
const RECALL_STATUS_OPTIONS = [
    { value: 'INITIATED', label: '회수 발의 및 계획수립', color: '#3b82f6' },
    { value: 'AUTHORITY_NOTIFIED', label: '규제당국 회수계획 보고', color: '#8b5cf6' },
    { value: 'CUSTOMER_NOTIFIED', label: '거래처/소비자 회수 공표', color: '#f59e0b' },
    { value: 'IN_RECALL', label: '회수 진행 및 수거·격리', color: '#06b6d4' },
    { value: 'RECONCILIATION', label: '회수 수량 대사 및 폐기', color: '#ec4899' },
    { value: 'COMPLETED', label: '회수 완료 및 최종 종결', color: '#10b981' },
    { value: 'CANCELLED', label: '회수 취소', color: '#64748b' }
];

export default function VigilanceRecallManagementPage({ user, onNavigate }) {
    const [activeTab, setActiveTab] = useState('VIGILANCE'); // VIGILANCE, RECALL, SIMULATOR_STANDARDS

    // KPI 상태
    const [kpis, setKpis] = useState({
        totalVigilanceReports: 0,
        draftReports: 0,
        overdueReports: 0,
        dueSoonReports: 0,
        submittedReports: 0,
        capaLinkedReports: 0,
        totalRecalls: 0,
        activeRecalls: 0,
        completedRecalls: 0,
        class1Recalls: 0,
        avgRecoveryRate: 0.0
    });

    // 데이터 목록
    const [vigilanceList, setVigilanceList] = useState([]);
    const [recallList, setRecallList] = useState([]);
    const [loading, setLoading] = useState(false);

    // 필터 상태
    const [vigFilter, setVigFilter] = useState({
        keyword: '',
        authorityType: '',
        severity: '',
        status: ''
    });

    const [recFilter, setRecFilter] = useState({
        keyword: '',
        recallClass: '',
        status: ''
    });

    // 모달 상태
    const [vigilanceModalOpen, setVigilanceModalOpen] = useState(false);
    const [editingVigilance, setEditingVigilance] = useState(null);

    const [submitModalOpen, setSubmitModalOpen] = useState(false);
    const [submittingVig, setSubmittingVig] = useState(null);
    const [authoritySubmissionNumber, setAuthoritySubmissionNumber] = useState('');
    const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0]);

    const [recallModalOpen, setRecallModalOpen] = useState(false);
    const [editingRecall, setEditingRecall] = useState(null);

    const [reconciliationModalOpen, setReconciliationModalOpen] = useState(false);
    const [reconcilingRecall, setReconcilingRecall] = useState(null);

    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printingDoc, setPrintingDoc] = useState(null);
    const [printType, setPrintType] = useState('VIGILANCE'); // VIGILANCE or RECALL

    const vigGridRef = useRef(null);
    const recGridRef = useRef(null);

    // -------------------------------------------------------------------------
    // 데이터 로드
    // -------------------------------------------------------------------------
    const loadAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [kpiRes, vigRes, recRes] = await Promise.all([
                fetchVigilanceRecallKpis(),
                fetchVigilanceReports(),
                fetchProductRecalls()
            ]);
            setKpis(kpiRes || {});
            setVigilanceList(Array.isArray(vigRes) ? vigRes : []);
            setRecallList(Array.isArray(recRes) ? recRes : []);
        } catch (error) {
            console.error('Failed to load vigilance/recall data:', error);
            toast.error('데이터를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // -------------------------------------------------------------------------
    // Vigilance 그리드 컬럼 정의
    // -------------------------------------------------------------------------
    const vigColumnDefs = useMemo(() => [
        {
            headerName: '보고 번호',
            field: 'reportNumber',
            width: 150,
            pinned: 'left',
            cellRenderer: (params) => (
                <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{params.value}</span>
            )
        },
        {
            headerName: '규제기관',
            field: 'authorityType',
            width: 120,
            cellRenderer: (params) => {
                const opt = AUTHORITY_OPTIONS.find(o => o.value === params.value);
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: (opt?.color || '#64748b') + '20',
                        color: opt?.color || '#64748b'
                    }}>
                        {params.value}
                    </span>
                );
            }
        },
        {
            headerName: '사건 심각도',
            field: 'incidentSeverity',
            width: 140,
            cellRenderer: (params) => {
                const opt = SEVERITY_OPTIONS.find(o => o.value === params.value);
                return (
                    <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: (opt?.color || '#64748b') + '15',
                        color: opt?.color || '#64748b'
                    }}>
                        {opt?.label || params.value}
                    </span>
                );
            }
        },
        {
            headerName: '보고서 건명',
            field: 'title',
            flex: 1,
            minWidth: 240,
            cellRenderer: (params) => (
                <div style={{ lineHeight: '1.4' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{params.value}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {params.data.productName} ({params.data.lotNumber || 'LOT미상'})
                    </div>
                </div>
            )
        },
        {
            headerName: '보고 분류 (법정기한)',
            field: 'reportClassificationDescription',
            width: 200,
            cellRenderer: (params) => (
                <span style={{ fontSize: '12px', color: '#334155' }}>{params.value}</span>
            )
        },
        {
            headerName: '법정 보고 마감일 (D-Day)',
            field: 'dueDate',
            width: 170,
            cellRenderer: (params) => {
                const d = params.data;
                const days = d.daysRemaining;
                const isOverdue = d.isOverdue;
                const isSubmitted = d.submissionStatus === 'SUBMITTED' || d.submissionStatus === 'ACKNOWLEDGED' || d.submissionStatus === 'CLOSED';

                let badgeStyle = {
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700'
                };

                if (isSubmitted) {
                    badgeStyle.backgroundColor = '#dcfce7';
                    badgeStyle.color = '#15803d';
                    return <span style={badgeStyle}>제출완료 ({params.value})</span>;
                } else if (isOverdue) {
                    badgeStyle.backgroundColor = '#fee2e2';
                    badgeStyle.color = '#b91c1c';
                    return <span style={badgeStyle}>🚨 기한초과 D+{Math.abs(days)} ({params.value})</span>;
                } else if (days <= 3) {
                    badgeStyle.backgroundColor = '#ffedd5';
                    badgeStyle.color = '#c2410c';
                    return <span style={badgeStyle}>⏳ 임박 D-{days} ({params.value})</span>;
                } else {
                    badgeStyle.backgroundColor = '#f1f5f9';
                    badgeStyle.color = '#475569';
                    return <span style={badgeStyle}>D-{days} ({params.value})</span>;
                }
            }
        },
        {
            headerName: '제출 상태',
            field: 'submissionStatus',
            width: 130,
            cellRenderer: (params) => {
                const isDraft = params.value === 'DRAFT';
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: isDraft ? '#fef3c7' : '#dcfce7',
                        color: isDraft ? '#b45309' : '#15803d'
                    }}>
                        {params.data.submissionStatusName || params.value}
                    </span>
                );
            }
        },
        {
            headerName: 'CAPA 연계',
            field: 'capaNumber',
            width: 140,
            cellRenderer: (params) => {
                if (params.value) {
                    return (
                        <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#e0e7ff',
                            color: '#4338ca',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            🛡️ {params.value}
                        </span>
                    );
                }
                return <span style={{ color: '#94a3b8', fontSize: '12px' }}>미연계</span>;
            }
        },
        {
            headerName: '액션',
            pinned: 'right',
            width: 220,
            cellRenderer: (params) => {
                const item = params.data;
                const isDraft = item.submissionStatus === 'DRAFT';
                return (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                        <button
                            onClick={() => {
                                setEditingVigilance(item);
                                setVigilanceModalOpen(true);
                            }}
                            style={{
                                padding: '4px 10px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            상세/수정
                        </button>
                        {isDraft ? (
                            <button
                                onClick={() => {
                                    setSubmittingVig(item);
                                    setAuthoritySubmissionNumber('');
                                    setSubmitModalOpen(true);
                                }}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '12px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: '#10b981',
                                    color: '#fff',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                당국제출
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setPrintingDoc(item);
                                    setPrintType('VIGILANCE');
                                    setPrintModalOpen(true);
                                }}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '12px',
                                    borderRadius: '4px',
                                    border: '1px solid #3b82f6',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                🖨️ A4인쇄
                            </button>
                        )}
                        <button
                            onClick={() => handleDeleteVigilance(item.id)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #fee2e2',
                                background: '#fef2f2',
                                color: '#ef4444',
                                cursor: 'pointer'
                            }}
                        >
                            삭제
                        </button>
                    </div>
                );
            }
        }
    ], []);

    // -------------------------------------------------------------------------
    // Recall 그리드 컬럼 정의
    // -------------------------------------------------------------------------
    const recColumnDefs = useMemo(() => [
        {
            headerName: '회수 번호',
            field: 'recallNumber',
            width: 150,
            pinned: 'left',
            cellRenderer: (params) => (
                <span style={{ fontWeight: 'bold', color: '#d97706' }}>{params.value}</span>
            )
        },
        {
            headerName: '위해성 등급',
            field: 'recallClass',
            width: 140,
            cellRenderer: (params) => {
                const opt = RECALL_CLASS_OPTIONS.find(o => o.value === params.value);
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: (opt?.color || '#64748b') + '15',
                        color: opt?.color || '#64748b'
                    }}>
                        {opt?.label || params.value}
                    </span>
                );
            }
        },
        {
            headerName: '회수 건명',
            field: 'title',
            flex: 1,
            minWidth: 220,
            cellRenderer: (params) => (
                <div style={{ lineHeight: '1.4' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{params.value}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {params.data.productName} | LOT: {params.data.lotNumber}
                    </div>
                </div>
            )
        },
        {
            headerName: '진행 상태',
            field: 'status',
            width: 170,
            cellRenderer: (params) => {
                const opt = RECALL_STATUS_OPTIONS.find(o => o.value === params.value);
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: (opt?.color || '#64748b') + '15',
                        color: opt?.color || '#64748b'
                    }}>
                        {opt?.label || params.value}
                    </span>
                );
            }
        },
        {
            headerName: '출고량 대비 회수율',
            field: 'recoveryRate',
            width: 200,
            cellRenderer: (params) => {
                const d = params.data;
                const rate = d.recoveryRate || 0.0;
                const shipped = d.shippedQuantity || 0;
                const accounted = d.accountedQuantity || 0;
                const isBalanced = d.isReconciliationBalanced;

                return (
                    <div style={{ width: '100%', padding: '4px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                            <span style={{ fontWeight: '700', color: '#1e293b' }}>{rate}%</span>
                            <span style={{ color: isBalanced ? '#15803d' : '#b91c1c' }}>
                                {accounted} / {shipped} {isBalanced ? '✓ 대사일치' : '⚠️ 오차발생'}
                            </span>
                        </div>
                        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${Math.min(rate, 100)}%`,
                                height: '100%',
                                background: isBalanced ? '#10b981' : (rate >= 80 ? '#3b82f6' : '#f59e0b')
                            }} />
                        </div>
                    </div>
                );
            }
        },
        {
            headerName: '발의일자',
            field: 'initiationDate',
            width: 120
        },
        {
            headerName: '담당 책임자',
            field: 'assignedLeader',
            width: 120
        },
        {
            headerName: '액션',
            pinned: 'right',
            width: 240,
            cellRenderer: (params) => {
                const item = params.data;
                const isCompleted = item.status === 'COMPLETED';
                return (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                        <button
                            onClick={() => {
                                setEditingRecall(item);
                                setRecallModalOpen(true);
                            }}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            상세
                        </button>
                        <button
                            onClick={() => {
                                setReconcilingRecall(item);
                                setReconciliationModalOpen(true);
                            }}
                            style={{
                                padding: '4px 10px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #0284c7',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            ⚖️ 수량대사
                        </button>
                        <button
                            onClick={() => {
                                setPrintingDoc(item);
                                setPrintType('RECALL');
                                setPrintModalOpen(true);
                            }}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                cursor: 'pointer'
                            }}
                        >
                            🖨️
                        </button>
                        <button
                            onClick={() => handleDeleteRecall(item.id)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                borderRadius: '4px',
                                border: '1px solid #fee2e2',
                                background: '#fef2f2',
                                color: '#ef4444',
                                cursor: 'pointer'
                            }}
                        >
                            삭제
                        </button>
                    </div>
                );
            }
        }
    ], []);

    // -------------------------------------------------------------------------
    // 핸들러 함수
    // -------------------------------------------------------------------------
    const handleDeleteVigilance = async (id) => {
        if (!window.confirm('정말 이 보고서를 삭제하시겠습니까? (감사추적 이력 보존)')) return;
        try {
            await deleteVigilanceReport(id);
            toast.success('보고서가 삭제되었습니다.');
            loadAllData();
        } catch (error) {
            toast.error('삭제에 실패했습니다.');
        }
    };

    const handleDeleteRecall = async (id) => {
        if (!window.confirm('정말 이 회수 건을 삭제하시겠습니까? (감사추적 이력 보존)')) return;
        try {
            await deleteProductRecall(id);
            toast.success('회수 건이 삭제되었습니다.');
            loadAllData();
        } catch (error) {
            toast.error('삭제에 실패했습니다.');
        }
    };

    const handleConfirmSubmit = async () => {
        if (!authoritySubmissionNumber.trim()) {
            toast.warning('규제기관 접수/보고 번호를 입력해주세요.');
            return;
        }
        try {
            await submitVigilanceReport(submittingVig.id, authoritySubmissionNumber, submissionDate);
            toast.success('규제기관 제출 처리가 완료되었습니다.');
            setSubmitModalOpen(false);
            loadAllData();
        } catch (error) {
            toast.error(error?.response?.data?.message || '제출 처리에 실패했습니다.');
        }
    };

    // 필터링된 데이터
    const filteredVigilanceList = useMemo(() => {
        return vigilanceList.filter(item => {
            if (vigFilter.keyword && !item.title.toLowerCase().includes(vigFilter.keyword.toLowerCase()) &&
                !item.reportNumber.toLowerCase().includes(vigFilter.keyword.toLowerCase()) &&
                !(item.productName && item.productName.toLowerCase().includes(vigFilter.keyword.toLowerCase()))) {
                return false;
            }
            if (vigFilter.authorityType && item.authorityType !== vigFilter.authorityType) return false;
            if (vigFilter.severity && item.incidentSeverity !== vigFilter.severity) return false;
            if (vigFilter.status && item.submissionStatus !== vigFilter.status) return false;
            return true;
        });
    }, [vigilanceList, vigFilter]);

    const filteredRecallList = useMemo(() => {
        return recallList.filter(item => {
            if (recFilter.keyword && !item.title.toLowerCase().includes(recFilter.keyword.toLowerCase()) &&
                !item.recallNumber.toLowerCase().includes(recFilter.keyword.toLowerCase()) &&
                !item.productName.toLowerCase().includes(recFilter.keyword.toLowerCase()) &&
                !item.lotNumber.toLowerCase().includes(recFilter.keyword.toLowerCase())) {
                return false;
            }
            if (recFilter.recallClass && item.recallClass !== recFilter.recallClass) return false;
            if (recFilter.status && item.status !== recFilter.status) return false;
            return true;
        });
    }, [recallList, recFilter]);

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
            {/* 1. 3-Tier Header */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
                        🚨 규제보고 (Vigilance & MDR) 및 제품 회수 (Product Recall) 관리
                    </h1>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => {
                                if (activeTab === 'VIGILANCE') {
                                    vigGridRef.current?.api?.exportDataAsCsv({ fileName: 'Vigilance_Reports.csv' });
                                } else {
                                    recGridRef.current?.api?.exportDataAsCsv({ fileName: 'Product_Recalls.csv' });
                                }
                            }}
                            style={{
                                padding: '8px 14px',
                                backgroundColor: '#fff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#334155',
                                cursor: 'pointer'
                            }}
                        >
                            📥 CSV 내보내기
                        </button>
                        <button
                            onClick={loadAllData}
                            style={{
                                padding: '8px 14px',
                                backgroundColor: '#fff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#334155',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 새로고침
                        </button>
                        <button
                            onClick={() => {
                                setEditingVigilance(null);
                                setVigilanceModalOpen(true);
                            }}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#dc2626',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            ➕ 신규 Vigilance 보고 접수
                        </button>
                        <button
                            onClick={() => {
                                setEditingRecall(null);
                                setRecallModalOpen(true);
                            }}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#d97706',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            📦 신규 제품회수 발의
                        </button>
                    </div>
                </div>

                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                    의료기기법 제31조/제34조, 21 CFR Part 803(MDR)/Part 7(Recall), EU MDR 2017/745 Article 87, 화장품법 제5조의2/제5조의3 준수
                </div>

                {/* 3행: 규제 매뉴얼 배너 */}
                <RegulatoryManualBanner guideKey="vigilanceRecall" onNavigate={onNavigate} />
            </div>

            {/* 2. 6개 핵심 KPI 요약 카드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>🚨 기한 초과 보고</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>{kpis.overdueReports || 0} 건</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>즉시 당국 보고 필요</div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #f97316', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>⏳ 마감 임박 (D-3 이내)</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#f97316', marginTop: '4px' }}>{kpis.dueSoonReports || 0} 건</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>초동 보고서 작성 요망</div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>📋 규제보고 완료</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>{kpis.submittedReports || 0} 건</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>식약처/FDA 접수 완료</div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>📦 진행 중 제품 회수</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#3b82f6', marginTop: '4px' }}>{kpis.activeRecalls || 0} 건</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>수거 및 격리 보관 중</div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>⚖️ 회수 완료 / 종결</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>{kpis.completedRecalls || 0} 건</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>수량 대사 100% 일치</div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #06b6d4', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>📈 평균 회수율</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0891b2', marginTop: '4px' }}>{kpis.avgRecoveryRate || 0.0}%</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>출고 총량 대비 회수·격리</div>
                </div>
            </div>

            {/* 3. 탭 네비게이션 */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px' }}>
                <button
                    onClick={() => setActiveTab('VIGILANCE')}
                    style={{
                        padding: '10px 18px',
                        border: 'none',
                        borderBottom: activeTab === 'VIGILANCE' ? '3px solid #dc2626' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        fontWeight: '700',
                        fontSize: '14px',
                        color: activeTab === 'VIGILANCE' ? '#dc2626' : '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    🚨 규제기관 이상사례 보고 (Vigilance & MDR) ({vigilanceList.length})
                </button>
                <button
                    onClick={() => setActiveTab('RECALL')}
                    style={{
                        padding: '10px 18px',
                        border: 'none',
                        borderBottom: activeTab === 'RECALL' ? '3px solid #d97706' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        fontWeight: '700',
                        fontSize: '14px',
                        color: activeTab === 'RECALL' ? '#d97706' : '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    📦 제품 회수 (Product Recall) 및 수량 대사 ({recallList.length})
                </button>
                <button
                    onClick={() => setActiveTab('SIMULATOR_STANDARDS')}
                    style={{
                        padding: '10px 18px',
                        border: 'none',
                        borderBottom: activeTab === 'SIMULATOR_STANDARDS' ? '3px solid #0284c7' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        fontWeight: '700',
                        fontSize: '14px',
                        color: activeTab === 'SIMULATOR_STANDARDS' ? '#0284c7' : '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    ⚖️ 회수 수량 대사 시뮬레이터 & 국가별 규제 기준표
                </button>
            </div>

            {/* 탭 1: Vigilance 화면 */}
            {activeTab === 'VIGILANCE' && (
                <div>
                    {/* 검색 필터 */}
                    <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>통합 검색</label>
                                <input
                                    type="text"
                                    placeholder="보고서 번호, 품목명, 건명 검색..."
                                    value={vigFilter.keyword}
                                    onChange={(e) => setVigFilter({ ...vigFilter, keyword: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>규제기관</label>
                                <select
                                    value={vigFilter.authorityType}
                                    onChange={(e) => setVigFilter({ ...vigFilter, authorityType: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                >
                                    {AUTHORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>사건 심각도</label>
                                <select
                                    value={vigFilter.severity}
                                    onChange={(e) => setVigFilter({ ...vigFilter, severity: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                >
                                    <option value="">전체 심각도</option>
                                    {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>제출 상태</label>
                                <select
                                    value={vigFilter.status}
                                    onChange={(e) => setVigFilter({ ...vigFilter, status: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                >
                                    <option value="">전체 상태</option>
                                    <option value="DRAFT">작성 중 (DRAFT)</option>
                                    <option value="SUBMITTED">보고 완료 (SUBMITTED)</option>
                                    <option value="ACKNOWLEDGED">당국 접수 (ACKNOWLEDGED)</option>
                                    <option value="CLOSED">최종 종결 (CLOSED)</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={() => setVigFilter({ keyword: '', authorityType: '', severity: '', status: '' })}
                                style={{ padding: '6px 14px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                            >
                                ♻️ 초기화
                            </button>
                            <button
                                onClick={loadAllData}
                                style={{ padding: '6px 18px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: '700', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                            >
                                🔍 조회
                            </button>
                        </div>
                    </div>

                    {/* 그리드 */}
                    <div className="ag-theme-alpine" style={{ height: '550px', width: '100%', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <AgGridReact
                            ref={vigGridRef}
                            rowData={filteredVigilanceList}
                            columnDefs={vigColumnDefs}
                            theme="legacy"
                            rowHeight={54}
                            headerHeight={48}
                            pagination={true}
                            paginationPageSize={10}
                        />
                    </div>
                </div>
            )}

            {/* 탭 2: Recall 화면 */}
            {activeTab === 'RECALL' && (
                <div>
                    {/* 검색 필터 */}
                    <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>통합 검색</label>
                                <input
                                    type="text"
                                    placeholder="회수 번호, 품목명, LOT 검색..."
                                    value={recFilter.keyword}
                                    onChange={(e) => setRecFilter({ ...recFilter, keyword: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>회수 등급</label>
                                <select
                                    value={recFilter.recallClass}
                                    onChange={(e) => setRecFilter({ ...recFilter, recallClass: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                >
                                    <option value="">전체 등급</option>
                                    {RECALL_CLASS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>회수 상태</label>
                                <select
                                    value={recFilter.status}
                                    onChange={(e) => setRecFilter({ ...recFilter, status: e.target.value })}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                >
                                    <option value="">전체 상태</option>
                                    {RECALL_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={() => setRecFilter({ keyword: '', recallClass: '', status: '' })}
                                style={{ padding: '6px 14px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                            >
                                ♻️ 초기화
                            </button>
                            <button
                                onClick={loadAllData}
                                style={{ padding: '6px 18px', border: 'none', background: '#d97706', color: '#fff', fontWeight: '700', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                            >
                                🔍 조회
                            </button>
                        </div>
                    </div>

                    {/* 그리드 */}
                    <div className="ag-theme-alpine" style={{ height: '550px', width: '100%', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <AgGridReact
                            ref={recGridRef}
                            rowData={filteredRecallList}
                            columnDefs={recColumnDefs}
                            theme="legacy"
                            rowHeight={54}
                            headerHeight={48}
                            pagination={true}
                            paginationPageSize={10}
                        />
                    </div>
                </div>
            )}

            {/* 탭 3: 시뮬레이터 & 국가별 규제 기준표 */}
            {activeTab === 'SIMULATOR_STANDARDS' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* 국가별 법정 기한 기준표 */}
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                            📋 국가별 이상사례 보고 법정 기한 표준표
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>국가/기관</th>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>사건 분류</th>
                                    <th style={{ padding: '8px', textAlign: 'center' }}>법정 보고 기한</th>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>법적 근거</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px', fontWeight: '600', color: '#10b981' }}>한국 식약처 (MFDS)</td>
                                    <td style={{ padding: '8px' }}>사망 또는 생명 위협</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: '#ef4444' }}>7일 이내</td>
                                    <td style={{ padding: '8px', color: '#64748b' }}>의료기기법 시행규칙 제51조</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px', fontWeight: '600', color: '#10b981' }}>한국 식약처 (MFDS)</td>
                                    <td style={{ padding: '8px' }}>기타 중대한 부작용 / 화장품 유해사례</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: '#f97316' }}>15일 이내</td>
                                    <td style={{ padding: '8px', color: '#64748b' }}>화장품법 제5조의2</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px', fontWeight: '600', color: '#10b981' }}>한국 식약처 (MFDS)</td>
                                    <td style={{ padding: '8px' }}>통상적 부작용</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '600' }}>30일 이내</td>
                                    <td style={{ padding: '8px', color: '#64748b' }}>의료기기법 제31조</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px', fontWeight: '600', color: '#3b82f6' }}>미국 FDA</td>
                                    <td style={{ padding: '8px' }}>공중보건 위해 / FDA 요구</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: '#ef4444' }}>5 영업일 (5 Days)</td>
                                    <td style={{ padding: '8px', color: '#64748b' }}>21 CFR 803.53</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px', fontWeight: '600', color: '#3b82f6' }}>미국 FDA</td>
                                    <td style={{ padding: '8px' }}>사망 / 중증상해 / 기능부전 (MDR)</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '600' }}>30일 이내</td>
                                    <td style={{ padding: '8px', color: '#64748b' }}>21 CFR 803.50</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px', fontWeight: '600', color: '#8b5cf6' }}>유럽 EU MDR</td>
                                    <td style={{ padding: '8px' }}>심각한 공중보건 위해 (Public Health)</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: '#ef4444' }}>2일 이내 (즉시)</td>
                                    <td style={{ padding: '8px', color: '#64748b' }}>MDR 2017/745 Art.87(3)</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px', fontWeight: '600', color: '#8b5cf6' }}>유럽 EU MDR</td>
                                    <td style={{ padding: '8px' }}>사망 또는 예기치 않은 건강 악화</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: '#f97316' }}>10일 이내</td>
                                    <td style={{ padding: '8px', color: '#64748b' }}>MDR 2017/745 Art.87(4)</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '8px', fontWeight: '600', color: '#8b5cf6' }}>유럽 EU MDR</td>
                                    <td style={{ padding: '8px' }}>기타 중대 사건 (Serious Incident)</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '600' }}>15일 이내</td>
                                    <td style={{ padding: '8px', color: '#64748b' }}>MDR 2017/745 Art.87(5)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* 수량 대사 시뮬레이터 */}
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                            ⚖️ 회수 수량 대사 (Reconciliation) 계산 원리 & 가드 정책
                        </h3>
                        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '14px', fontSize: '13px' }}>
                            <div style={{ fontWeight: '700', color: '#0284c7', marginBottom: '6px' }}>대사 공식 (Quantity Reconciliation Equation)</div>
                            <code style={{ display: 'block', backgroundColor: '#e0f2fe', padding: '8px', borderRadius: '4px', color: '#0369a1', fontWeight: 'bold' }}>
                                출고 총 수량 = 회수량 + 격리량 + 폐기량 + 미회수량 (100% 일치 필수)
                            </code>
                            <div style={{ marginTop: '8px', color: '#64748b', fontSize: '12px' }}>
                                회수율(%) = (회수량 + 격리량 + 폐기량) / 출고 수량 × 100
                            </div>
                        </div>

                        <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155' }}>
                            <h4 style={{ margin: '10px 0 6px 0', fontSize: '14px', color: '#dc2626' }}>🛡️ 규제당국 종결 차단 가드 (Safety Guard)</h4>
                            <p style={{ margin: 0, marginBottom: '6px' }}>
                                <strong>21 CFR Part 7</strong> 및 <strong>의료기기법 제34조</strong>에 따라, 출고 총 수량과 대사 수량 합계에 1개의 오차라도 발생하면 회수 건을 <code>COMPLETED</code>로 종결할 수 없습니다.
                            </p>
                            <p style={{ margin: 0, color: '#64748b' }}>
                                • 소비자 소진 또는 반품 불응 수량은 반드시 <code>미회수 수량(Unretrieved)</code>에 기록하고 정당화 사유를 종결 보고서에 포함해야 합니다.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 모달 1: Vigilance 보고서 등록/수정 모달 (96vw × 92vh) */}
            {/* ----------------------------------------------------------------- */}
            {vigilanceModalOpen && (
                <VigilanceEditModal
                    editingItem={editingVigilance}
                    onClose={() => setVigilanceModalOpen(false)}
                    onSaveSuccess={() => {
                        setVigilanceModalOpen(false);
                        loadAllData();
                    }}
                />
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 모달 2: 제품 회수 (Product Recall) 등록/수정 모달 (96vw × 92vh) */}
            {/* ----------------------------------------------------------------- */}
            {recallModalOpen && (
                <RecallEditModal
                    editingItem={editingRecall}
                    onClose={() => setRecallModalOpen(false)}
                    onSaveSuccess={() => {
                        setRecallModalOpen(false);
                        loadAllData();
                    }}
                />
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 모달 3: 수량 대사 (Reconciliation) 모달 (96vw × 92vh) */}
            {/* ----------------------------------------------------------------- */}
            {reconciliationModalOpen && reconcilingRecall && (
                <ReconciliationModal
                    recall={reconcilingRecall}
                    onClose={() => setReconciliationModalOpen(false)}
                    onSaveSuccess={() => {
                        setReconciliationModalOpen(false);
                        loadAllData();
                    }}
                />
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 모달 4: 당국 제출 처리 모달 */}
            {/* ----------------------------------------------------------------- */}
            {submitModalOpen && submittingVig && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '12px', width: '500px', padding: '24px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                            🏛️ 규제기관 이상사례 보고서 제출 완료 처리
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                            보고서: <strong>{submittingVig.reportNumber}</strong> ({submittingVig.title})
                        </p>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                규제당국 접수번호 / 보고 확인증 번호 <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="예: MFDS-2026-REC-00123 / FDA-MDR-2026-99"
                                value={authoritySubmissionNumber}
                                onChange={(e) => setAuthoritySubmissionNumber(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                실제 제출일자
                            </label>
                            <input
                                type="date"
                                value={submissionDate}
                                onChange={(e) => setSubmissionDate(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={() => setSubmitModalOpen(false)}
                                style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirmSubmit}
                                style={{ padding: '8px 20px', border: 'none', background: '#10b981', color: '#fff', fontWeight: '700', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                            >
                                제출 확인 및 상태 갱신
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 모달 5: 공식 A4 보고서 인쇄 모달 (96vw × 92vh) */}
            {/* ----------------------------------------------------------------- */}
            {printModalOpen && printingDoc && (
                <PrintReportModal
                    doc={printingDoc}
                    type={printType}
                    onClose={() => setPrintModalOpen(false)}
                />
            )}
        </div>
    );
}

// =============================================================================
// 모달 1 컴포넌트: Vigilance 등록/수정 모달 (96vw × 92vh)
// =============================================================================
function VigilanceEditModal({ editingItem, onClose, onSaveSuccess }) {
    const isNew = !editingItem;
    const [formData, setFormData] = useState({
        title: editingItem?.title || '',
        authorityType: editingItem?.authorityType || 'MFDS',
        regulatoryType: editingItem?.regulatoryType || 'COSMETIC',
        reportClassification: editingItem?.reportClassification || 'MFDS_COSMETIC_SERIOUS_15D',
        incidentSeverity: editingItem?.incidentSeverity || 'HOSPITALIZATION',
        sourceType: editingItem?.sourceType || 'COMPLAINT',
        sourceNumber: editingItem?.sourceNumber || '',
        sourceDescription: editingItem?.sourceDescription || '',
        itemCode: editingItem?.itemCode || '',
        productName: editingItem?.productName || '',
        lotNumber: editingItem?.lotNumber || '',
        isLotUnknown: editingItem?.isLotUnknown || false,
        awarenessDate: editingItem?.awarenessDate || new Date().toISOString().split('T')[0],
        dueDate: editingItem?.dueDate || '',
        incidentDescription: editingItem?.incidentDescription || '',
        patientImpact: editingItem?.patientImpact || '',
        preliminaryCausality: editingItem?.preliminaryCausality || '',
        reporterName: editingItem?.reporterName || '',
        reportedToDepartment: editingItem?.reportedToDepartment || '',
        actionTaken: editingItem?.actionTaken || '',
        capaRequired: editingItem?.capaRequired || false,
        capaNumber: editingItem?.capaNumber || ''
    });

    // 분류 변경 시 법정 마감일 자동 계산
    useEffect(() => {
        if (!formData.awarenessDate) return;
        const opt = CLASSIFICATION_OPTIONS.find(o => o.value === formData.reportClassification);
        if (opt) {
            const base = new Date(formData.awarenessDate);
            base.setDate(base.getDate() + opt.days);
            setFormData(prev => ({ ...prev, dueDate: base.toISOString().split('T')[0] }));
        }
    }, [formData.reportClassification, formData.awarenessDate]);

    const handleSave = async () => {
        if (!formData.title.trim()) {
            toast.warning('보고서 제목을 입력해주세요.');
            return;
        }
        if (!formData.incidentDescription.trim()) {
            toast.warning('이상사례 상세 설명을 입력해주세요.');
            return;
        }

        try {
            if (isNew) {
                await createVigilanceReport(formData);
                toast.success('신규 규제보고서가 성공적으로 접수되었습니다.');
            } else {
                await updateVigilanceReport(editingItem.id, formData);
                toast.success('보고서가 수정되었습니다.');
            }
            onSaveSuccess();
        } catch (error) {
            toast.error(error?.response?.data?.message || '저장에 실패했습니다.');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: '#fff', borderRadius: '12px',
                width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}>
                {/* 헤더 */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                            {isNew ? '➕ 신규 규제기관 이상사례 보고서 접수' : `✏️ 규제보고서 상세 / 수정 [${editingItem.reportNumber}]`}
                        </h2>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                            의료기기법 제31조 / 21 CFR Part 803 (FDA MDR) / 화장품법 제5조의2 신속보고 표준 서식
                        </div>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
                </div>

                {/* 바디 (스크롤) */}
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                            1. 기본 정보 및 규제기관 분류
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>보고서 제목 <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    placeholder="예: [식약처 15일] 센텔라 수분 크림 피부 접촉성 유해사례 신속보고"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>규제기관</label>
                                <select
                                    value={formData.authorityType}
                                    onChange={(e) => setFormData({ ...formData, authorityType: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                >
                                    <option value="MFDS">식약처 (대한민국 MFDS)</option>
                                    <option value="FDA">미국 FDA (21 CFR Part 803)</option>
                                    <option value="EU_MDR">유럽 EU MDR (2017/745)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>규제 제품 유형</label>
                                <select
                                    value={formData.regulatoryType}
                                    onChange={(e) => setFormData({ ...formData, regulatoryType: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                >
                                    {REGULATORY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>보고 분류 (법정기한 산정 기준)</label>
                                <select
                                    value={formData.reportClassification}
                                    onChange={(e) => setFormData({ ...formData, reportClassification: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                >
                                    {CLASSIFICATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>사건 심각도</label>
                                <select
                                    value={formData.incidentSeverity}
                                    onChange={(e) => setFormData({ ...formData, incidentSeverity: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                >
                                    {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>발생 소스</label>
                                <select
                                    value={formData.sourceType}
                                    onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                >
                                    <option value="COMPLAINT">고객 불만 / 시판 후 조사</option>
                                    <option value="NCR">부적합품 보고서 (NCR)</option>
                                    <option value="CAPA">시정 및 예방조치 (CAPA)</option>
                                    <option value="CLINICAL_TRIAL">임상시험 / PMS</option>
                                    <option value="INTERNAL_AUDIT">내부심사 / 모니터링</option>
                                    <option value="LITERATURE">학술문헌 / 규제당국 통지</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>사례 인지일자 (Awareness Date) <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="date"
                                    value={formData.awarenessDate}
                                    onChange={(e) => setFormData({ ...formData, awarenessDate: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#dc2626', marginBottom: '6px' }}>법정 보고 마감일 (자동 산출)</label>
                                <input
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #f87171', backgroundColor: '#fef2f2', fontSize: '14px', fontWeight: 'bold', color: '#b91c1c', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>소스 관리번호</label>
                                <input
                                    type="text"
                                    placeholder="예: CLM-20260426-001 / NCR-202610-001"
                                    value={formData.sourceNumber}
                                    onChange={(e) => setFormData({ ...formData, sourceNumber: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                            2. 대상 제품 및 로트 정보
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>품목코드</label>
                                <input
                                    type="text"
                                    value={formData.itemCode}
                                    onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>품목명</label>
                                <input
                                    type="text"
                                    value={formData.productName}
                                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>제조번호 (LOT)</label>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.isLotUnknown}
                                            onChange={(e) => setFormData({ ...formData, isLotUnknown: e.target.checked, lotNumber: e.target.checked ? 'LOT-UNKNOWN' : '' })}
                                        />
                                        LOT 미상 (D-9 허용)
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    disabled={formData.isLotUnknown}
                                    placeholder={formData.isLotUnknown ? 'LOT 미상으로 등록됨' : 'LOT 번호 입력'}
                                    value={formData.lotNumber}
                                    onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', backgroundColor: formData.isLotUnknown ? '#f1f5f9' : '#fff' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                            3. 이상사례 상세 및 초동 조치
                        </h3>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>이상사례 경위 및 환자/피해 상태 <span style={{ color: '#ef4444' }}>*</span></label>
                            <textarea
                                rows={4}
                                placeholder="이상사례 발생 일시, 환자 증상, 치료 경과, 인과관계 조사 내용을 기술하세요."
                                value={formData.incidentDescription}
                                onChange={(e) => setFormData({ ...formData, incidentDescription: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>초동 조치 사항</label>
                                <textarea
                                    rows={3}
                                    placeholder="해당 로트 출하 보류(HOLD), 고객 교환/환불, 병원 치료비 지원 등 초동 조치 내역 기술"
                                    value={formData.actionTaken}
                                    onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>추정 인과관계 (Preliminary Causality)</label>
                                <textarea
                                    rows={3}
                                    placeholder="성분 알레르기, 용기 파손, 기기 오작동 등 추정 원인 및 기전"
                                    value={formData.preliminaryCausality}
                                    onChange={(e) => setFormData({ ...formData, preliminaryCausality: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>보고 담당자</label>
                                <input
                                    type="text"
                                    placeholder="품질보증팀 홍길동"
                                    value={formData.reporterName}
                                    onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>보고 대상 부처</label>
                                <input
                                    type="text"
                                    placeholder="식약처 화장품정책과 / FDA CDRH"
                                    value={formData.reportedToDepartment}
                                    onChange={(e) => setFormData({ ...formData, reportedToDepartment: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>CAPA 연계</label>
                                    <label style={{ fontSize: '12px', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.capaRequired}
                                            onChange={(e) => setFormData({ ...formData, capaRequired: e.target.checked })}
                                        />
                                        CAPA 발행 필수
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    placeholder="연계 CAPA 번호 (예: CAPA-202610-001)"
                                    value={formData.capaNumber}
                                    onChange={(e) => setFormData({ ...formData, capaNumber: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 푸터 */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        style={{ padding: '10px 24px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: '700', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                    >
                        {isNew ? '신규 접수 및 기한 등록' : '보고서 내용 수정 저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// 모달 2 컴포넌트: Product Recall 등록/수정 모달 (96vw × 92vh)
// =============================================================================
function RecallEditModal({ editingItem, onClose, onSaveSuccess }) {
    const isNew = !editingItem;
    const [formData, setFormData] = useState({
        title: editingItem?.title || '',
        recallClass: editingItem?.recallClass || 'CLASS_2',
        authorityType: editingItem?.authorityType || 'MFDS',
        regulatoryType: editingItem?.regulatoryType || 'COSMETIC',
        itemCode: editingItem?.itemCode || '',
        productName: editingItem?.productName || '',
        lotNumber: editingItem?.lotNumber || '',
        distributionStartDate: editingItem?.distributionStartDate || '',
        distributionEndDate: editingItem?.distributionEndDate || '',
        initiationDate: editingItem?.initiationDate || new Date().toISOString().split('T')[0],
        authorityReportDate: editingItem?.authorityReportDate || '',
        authorityApprovalNumber: editingItem?.authorityApprovalNumber || '',
        recallReason: editingItem?.recallReason || '',
        healthHazardAssessment: editingItem?.healthHazardAssessment || '',
        shippedQuantity: editingItem?.shippedQuantity || 0,
        recalledQuantity: editingItem?.recalledQuantity || 0,
        quarantinedQuantity: editingItem?.quarantinedQuantity || 0,
        disposedQuantity: editingItem?.disposedQuantity || 0,
        unretrievedQuantity: editingItem?.unretrievedQuantity || 0,
        disposalMethod: editingItem?.disposalMethod || '',
        assignedLeader: editingItem?.assignedLeader || '',
        capaNumber: editingItem?.capaNumber || ''
    });

    const handleSave = async () => {
        if (!formData.title.trim()) {
            toast.warning('회수 건명을 입력해주세요.');
            return;
        }
        if (!formData.itemCode.trim() || !formData.lotNumber.trim()) {
            toast.warning('품목코드와 대상 LOT 번호를 입력해주세요.');
            return;
        }
        if (!formData.assignedLeader.trim()) {
            toast.warning('회수 전담 책임자를 입력해주세요.');
            return;
        }
        if (!formData.recallReason.trim()) {
            toast.warning('회수 사유를 입력해주세요.');
            return;
        }

        try {
            if (isNew) {
                await createProductRecall(formData);
                toast.success('신규 제품 회수가 성공적으로 발의되었습니다.');
            } else {
                await updateProductRecall(editingItem.id, formData);
                toast.success('회수 정보가 수정되었습니다.');
            }
            onSaveSuccess();
        } catch (error) {
            toast.error(error?.response?.data?.message || '저장에 실패했습니다.');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: '#fff', borderRadius: '12px',
                width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                            {isNew ? '📦 신규 제품 회수 (Product Recall) 발의' : `✏️ 제품 회수 상세 / 수정 [${editingItem.recallNumber}]`}
                        </h2>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                            의료기기법 제34조 / 21 CFR Part 7 / 화장품법 제5조의3 회수의무자 계획서 표준
                        </div>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
                </div>

                <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                            1. 회수 기본 정보 및 등급 분류
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>회수 건명/제목 <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    placeholder="예: 센텔라 수분 크림 특정 LOT 유화 안정성 저하 2등급 자진 회수"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>회수 위해성 등급 <span style={{ color: '#ef4444' }}>*</span></label>
                                <select
                                    value={formData.recallClass}
                                    onChange={(e) => setFormData({ ...formData, recallClass: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                >
                                    {RECALL_CLASS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>규제기관</label>
                                <select
                                    value={formData.authorityType}
                                    onChange={(e) => setFormData({ ...formData, authorityType: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                >
                                    <option value="MFDS">식약처 (MFDS)</option>
                                    <option value="FDA">미국 FDA</option>
                                    <option value="EU_MDR">유럽 EU</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>품목코드 <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    value={formData.itemCode}
                                    onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>품목명 <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    value={formData.productName}
                                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>대상 LOT 번호 <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    value={formData.lotNumber}
                                    onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>회수 책임자 <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    value={formData.assignedLeader}
                                    onChange={(e) => setFormData({ ...formData, assignedLeader: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                            2. 회수 사유 및 위해성 평가
                        </h3>

                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>회수 사유 (Recall Reason) <span style={{ color: '#ef4444' }}>*</span></label>
                            <textarea
                                rows={3}
                                placeholder="회수를 결정하게 된 결함의 내용, 검사 불합격 내역 및 원인 기술"
                                value={formData.recallReason}
                                onChange={(e) => setFormData({ ...formData, recallReason: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>건강 유해성 평가 요약 (Health Hazard Assessment)</label>
                            <textarea
                                rows={2}
                                placeholder="해당 결함이 인체 안전성 및 기능에 미치는 위해 평가 요약 (예: 피부 자극성 없음, 가역적 손상 등)"
                                value={formData.healthHazardAssessment}
                                onChange={(e) => setFormData({ ...formData, healthHazardAssessment: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                            3. 출고 수량 및 연계 정보
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0369a1', marginBottom: '6px' }}>대상 LOT 총 출고 수량 <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="number"
                                    value={formData.shippedQuantity}
                                    onChange={(e) => setFormData({ ...formData, shippedQuantity: parseInt(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #38bdf8', fontSize: '14px', fontWeight: 'bold', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>회수 발의일자</label>
                                <input
                                    type="date"
                                    value={formData.initiationDate}
                                    onChange={(e) => setFormData({ ...formData, initiationDate: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>연계 CAPA 번호</label>
                                <input
                                    type="text"
                                    placeholder="예: CAPA-202610-001"
                                    value={formData.capaNumber}
                                    onChange={(e) => setFormData({ ...formData, capaNumber: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>취소</button>
                    <button onClick={handleSave} style={{ padding: '10px 24px', border: 'none', background: '#d97706', color: '#fff', fontWeight: '700', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
                        {isNew ? '제품 회수 발의 및 계획서 등록' : '회수 정보 수정 저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// 모달 3 컴포넌트: 회수 수량 대사 (Reconciliation) 모달 (96vw × 92vh)
// =============================================================================
function ReconciliationModal({ recall, onClose, onSaveSuccess }) {
    const [recon, setRecon] = useState({
        shippedQuantity: recall.shippedQuantity || 0,
        recalledQuantity: recall.recalledQuantity || 0,
        quarantinedQuantity: recall.quarantinedQuantity || 0,
        disposedQuantity: recall.disposedQuantity || 0,
        unretrievedQuantity: recall.unretrievedQuantity || 0,
        disposalMethod: recall.disposalMethod || '',
        disposalDate: recall.disposalDate || '',
        disposalWitness: recall.disposalWitness || '',
        closureSummary: recall.closureSummary || ''
    });

    // 실시간 대사 합계 및 오차 계산
    const totalAccounted = recon.recalledQuantity + recon.quarantinedQuantity + recon.disposedQuantity + recon.unretrievedQuantity;
    const discrepancy = recon.shippedQuantity - totalAccounted;
    const recoveryRate = recon.shippedQuantity > 0 
        ? Math.round(((recon.recalledQuantity + recon.quarantinedQuantity + recon.disposedQuantity) / recon.shippedQuantity) * 1000.0) / 10.0 
        : 0.0;
    const isBalanced = recon.shippedQuantity > 0 && discrepancy === 0;

    const handleSaveReconciliation = async () => {
        try {
            await updateRecallReconciliation(recall.id, recon);
            toast.success('수량 대사 정보가 갱신되었습니다.');
            onSaveSuccess();
        } catch (error) {
            toast.error('수량 대사 갱신 실패');
        }
    };

    const handleCompleteRecall = async () => {
        if (!isBalanced) {
            toast.error(`회수 수량 대사가 불일치합니다! (오차: ${discrepancy}개). 21 CFR Part 7 / 의료기기법 제34조에 따라 100% 대사가 완료되어야 종결할 수 있습니다.`);
            return;
        }
        if (!recon.closureSummary.trim()) {
            toast.warning('최종 종결 보고서 요약을 작성해주세요.');
            return;
        }

        try {
            await transitionProductRecallStatus(recall.id, 'COMPLETED', recon.closureSummary);
            toast.success('회수가 성공적으로 100% 대사 완료 및 공식 종결되었습니다.');
            onSaveSuccess();
        } catch (error) {
            toast.error(error?.response?.data?.message || '종결 처리에 실패했습니다.');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: '#fff', borderRadius: '12px',
                width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                            ⚖️ 회수 수량 대사 (Reconciliation) 및 폐기 조치 검증
                        </h2>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                            회수 번호: <strong>{recall.recallNumber}</strong> | 대상 품목: {recall.productName} ({recall.lotNumber})
                        </div>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
                </div>

                <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                    {/* 대사 상태 배너 */}
                    <div style={{
                        backgroundColor: isBalanced ? '#ecfdf5' : '#fef2f2',
                        border: `2px solid ${isBalanced ? '#10b981' : '#ef4444'}`,
                        borderRadius: '8px',
                        padding: '16px 20px',
                        marginBottom: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: isBalanced ? '#065f46' : '#991b1b' }}>
                                {isBalanced ? '✓ 회수 수량 대사 100% 일치 (Balanced)' : '⚠️ 회수 수량 불일치 (Discrepancy Detected)'}
                            </div>
                            <div style={{ fontSize: '13px', color: isBalanced ? '#047857' : '#b91c1c', marginTop: '4px' }}>
                                총 출고량 {recon.shippedQuantity}개 = [회수 {recon.recalledQuantity} + 격리 {recon.quarantinedQuantity} + 폐기 {recon.disposedQuantity} + 미회수 {recon.unretrievedQuantity}]
                                ({totalAccounted}개) | {isBalanced ? '오차 없음 (0개)' : `오차: ${discrepancy}개`}
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>현재 회수율</div>
                            <div style={{ fontSize: '28px', fontWeight: '800', color: isBalanced ? '#059669' : '#d97706' }}>
                                {recoveryRate}%
                            </div>
                        </div>
                    </div>

                    {/* 수량 대사 입력 카드 */}
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                            1. 수량 대사 5대 항목 입력 (단위: 개)
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0369a1', marginBottom: '6px' }}>
                                    ① 총 출고 수량 (Shipped)
                                </label>
                                <input
                                    type="number"
                                    value={recon.shippedQuantity}
                                    onChange={(e) => setRecon({ ...recon, shippedQuantity: parseInt(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #0284c7', fontSize: '14px', fontWeight: 'bold', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#16a34a', marginBottom: '6px' }}>
                                    ② 회수 수량 (Recalled)
                                </label>
                                <input
                                    type="number"
                                    value={recon.recalledQuantity}
                                    onChange={(e) => setRecon({ ...recon, recalledQuantity: parseInt(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #16a34a', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#f59e0b', marginBottom: '6px' }}>
                                    ③ 창고 격리 수량 (HOLD)
                                </label>
                                <input
                                    type="number"
                                    value={recon.quarantinedQuantity}
                                    onChange={(e) => setRecon({ ...recon, quarantinedQuantity: parseInt(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #f59e0b', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#8b5cf6', marginBottom: '6px' }}>
                                    ④ 폐기 완료 수량 (Disposed)
                                </label>
                                <input
                                    type="number"
                                    value={recon.disposedQuantity}
                                    onChange={(e) => setRecon({ ...recon, disposedQuantity: parseInt(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #8b5cf6', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                                    ⑤ 미회수/소진 수량 (Unretrieved)
                                </label>
                                <input
                                    type="number"
                                    value={recon.unretrievedQuantity}
                                    onChange={(e) => setRecon({ ...recon, unretrievedQuantity: parseInt(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 폐기 처분 및 증빙 */}
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                            2. 폐기 처분 내역 및 입회 확인
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>폐기 방식</label>
                                <input
                                    type="text"
                                    placeholder="예: 고온 소각 및 친환경 위탁 처리"
                                    value={recon.disposalMethod}
                                    onChange={(e) => setRecon({ ...recon, disposalMethod: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>폐기 집행일자</label>
                                <input
                                    type="date"
                                    value={recon.disposalDate}
                                    onChange={(e) => setRecon({ ...recon, disposalDate: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>폐기 입회인 (Witness)</label>
                                <input
                                    type="text"
                                    placeholder="예: 환경안전팀 박팀장, QA 이과장"
                                    value={recon.disposalWitness}
                                    onChange={(e) => setRecon({ ...recon, disposalWitness: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 최종 종결 요약 */}
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                            3. 회수 완료 보고서 요약 (미회수 사유 필수 명시)
                        </h3>
                        <textarea
                            rows={3}
                            placeholder="회수 진행 경과, 거래처 100% 공표 여부, 미회수 수량 발생 원인(소비자 기소진 등) 및 재발방지 조치를 기술하세요."
                            value={recon.closureSummary}
                            onChange={(e) => setRecon({ ...recon, closureSummary: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>취소</button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleSaveReconciliation}
                            style={{ padding: '10px 20px', border: '1px solid #0284c7', background: '#f0f9ff', color: '#0369a1', fontWeight: '700', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                        >
                            대사 수량 임시저장
                        </button>
                        <button
                            onClick={handleCompleteRecall}
                            disabled={!isBalanced}
                            style={{
                                padding: '10px 24px',
                                border: 'none',
                                background: isBalanced ? '#10b981' : '#94a3b8',
                                color: '#fff',
                                fontWeight: '700',
                                borderRadius: '6px',
                                fontSize: '14px',
                                cursor: isBalanced ? 'pointer' : 'not-allowed'
                            }}
                        >
                            ✓ 100% 대사 확인 및 공식 종결
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// 모달 4 컴포넌트: 공식 A4 인쇄 프리뷰 모달 (식약처/FDA 표준 양식)
// =============================================================================
function PrintReportModal({ doc, type, onClose }) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: '#fff', borderRadius: '12px',
                width: '96vw', maxWidth: '1000px', height: '92vh', maxHeight: '94vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>
                        🖨️ 규제기관 공식 제출용 감사 리포트 (A4 Print Preview)
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handlePrint} style={{ padding: '6px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}>인쇄하기</button>
                        <button onClick={onClose} style={{ padding: '6px 14px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}>닫기</button>
                    </div>
                </div>

                <div style={{ flex: 1, padding: '40px', overflowY: 'auto', backgroundColor: '#525659', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        width: '210mm', minHeight: '297mm', backgroundColor: '#fff', padding: '25mm 20mm',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)', boxSizing: 'border-box', color: '#000', fontSize: '12pt', lineHeight: '1.6'
                    }}>
                        {type === 'VIGILANCE' ? (
                            <div>
                                <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
                                    <h1 style={{ fontSize: '18pt', margin: 0, fontWeight: 'bold' }}>의약품·의료기기·화장품 이상사례 보고서</h1>
                                    <div style={{ fontSize: '10pt', marginTop: '4px', color: '#555' }}>
                                        [식약처 / FDA MDR / EU Competent Authority 공식 제출 양식]
                                    </div>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '10pt' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', width: '25%', fontWeight: 'bold' }}>보고서 관리번호</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', width: '25%' }}>{doc.reportNumber}</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', width: '25%', fontWeight: 'bold' }}>규제당국 접수번호</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', width: '25%' }}>{doc.authoritySubmissionNumber || '미제출(Draft)'}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>보고 분류</td>
                                            <td style={{ border: '1px solid #000', padding: '6px' }}>{doc.reportClassificationDescription}</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>사건 심각도</td>
                                            <td style={{ border: '1px solid #000', padding: '6px' }}>{doc.incidentSeverityDescription}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>대상 품목명</td>
                                            <td style={{ border: '1px solid #000', padding: '6px' }}>{doc.productName} ({doc.itemCode})</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>제조번호 (LOT)</td>
                                            <td style={{ border: '1px solid #000', padding: '6px' }}>{doc.lotNumber}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>인지 일자</td>
                                            <td style={{ border: '1px solid #000', padding: '6px' }}>{doc.awarenessDate}</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>법정 마감 기한</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold' }}>{doc.dueDate}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '4px' }}>1. 이상사례 개요 및 피해 현황</div>
                                    <div style={{ border: '1px solid #000', padding: '10px', minHeight: '80px', fontSize: '10pt' }}>
                                        {doc.incidentDescription}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '4px' }}>2. 추정 인과관계 및 임상 분석</div>
                                    <div style={{ border: '1px solid #000', padding: '10px', minHeight: '60px', fontSize: '10pt' }}>
                                        {doc.preliminaryCausality || '조사 진행 중'}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '4px' }}>3. 초동 조치 사항 및 CAPA 연계</div>
                                    <div style={{ border: '1px solid #000', padding: '10px', minHeight: '60px', fontSize: '10pt' }}>
                                        {doc.actionTaken || '출하 보류(HOLD) 조치 완료'}
                                        {doc.capaNumber && <div style={{ marginTop: '6px', fontWeight: 'bold' }}>연계 CAPA: {doc.capaNumber}</div>}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', marginTop: '40px', fontSize: '11pt' }}>
                                    <div>보고 일자: {doc.submissionDate || new Date().toISOString().split('T')[0]}</div>
                                    <div style={{ marginTop: '8px' }}>품질책임자 / 안전관리책임자 서명: ____________________ (인)</div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
                                    <h1 style={{ fontSize: '18pt', margin: 0, fontWeight: 'bold' }}>제품 회수 및 수량 대사 종결 보고서</h1>
                                    <div style={{ fontSize: '10pt', marginTop: '4px', color: '#555' }}>
                                        [의료기기법 제34조 / 21 CFR Part 7 / 화장품법 제5조의3 회수 종료 보고서]
                                    </div>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '10pt' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', width: '25%', fontWeight: 'bold' }}>회수 번호</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', width: '25%' }}>{doc.recallNumber}</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', width: '25%', fontWeight: 'bold' }}>위해성 등급</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', width: '25%', fontWeight: 'bold', color: '#b91c1c' }}>{doc.recallClassName}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>회수 대상 품목</td>
                                            <td style={{ border: '1px solid #000', padding: '6px' }}>{doc.productName} ({doc.itemCode})</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>대상 LOT</td>
                                            <td style={{ border: '1px solid #000', padding: '6px' }}>{doc.lotNumber}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>총 출고 수량</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold' }}>{doc.shippedQuantity} 개</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>최종 회수율</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold', color: '#15803d' }}>{doc.recoveryRate}%</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '4px' }}>[수량 대사 내역표 (100% Reconciliation)]</div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '10pt', textAlign: 'center' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f2f2f2' }}>
                                            <th style={{ border: '1px solid #000', padding: '6px' }}>출고량</th>
                                            <th style={{ border: '1px solid #000', padding: '6px' }}>실제 회수량</th>
                                            <th style={{ border: '1px solid #000', padding: '6px' }}>창고 격리량</th>
                                            <th style={{ border: '1px solid #000', padding: '6px' }}>폐기 수량</th>
                                            <th style={{ border: '1px solid #000', padding: '6px' }}>미회수/소진량</th>
                                            <th style={{ border: '1px solid #000', padding: '6px' }}>대사 오차</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold' }}>{doc.shippedQuantity}</td>
                                            <td style={{ border: '1px solid #000', padding: '6px' }}>{doc.recalledQuantity}</td>
                                            <td style={{ border: '1px solid #000', padding: '6px' }}>{doc.quarantinedQuantity}</td>
                                            <td style={{ border: '1px solid #000', padding: '6px' }}>{doc.disposedQuantity}</td>
                                            <td style={{ border: '1px solid #000', padding: '6px' }}>{doc.unretrievedQuantity}</td>
                                            <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold', color: doc.discrepancyQuantity === 0 ? '#15803d' : '#b91c1c' }}>
                                                {doc.discrepancyQuantity || 0} 개 (일치)
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '4px' }}>1. 회수 사유 및 위해성 평가</div>
                                    <div style={{ border: '1px solid #000', padding: '10px', minHeight: '60px', fontSize: '10pt' }}>
                                        {doc.recallReason}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '4px' }}>2. 회수 완료 보고 및 폐기 집행 결과</div>
                                    <div style={{ border: '1px solid #000', padding: '10px', minHeight: '60px', fontSize: '10pt' }}>
                                        {doc.closureSummary || '유통 재고 전량 회수 및 폐기 조치 완료'}
                                        <div style={{ marginTop: '6px', fontSize: '9pt', color: '#555' }}>
                                            폐기 방식: {doc.disposalMethod || '위탁 고온소각'} | 입회인: {doc.disposalWitness || '품질관리팀장'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', marginTop: '40px', fontSize: '11pt' }}>
                                    <div>종결 일자: {doc.closedDate || new Date().toISOString().split('T')[0]}</div>
                                    <div style={{ marginTop: '8px' }}>품질책임자 / 대표이사 서명: ____________________ (인)</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
