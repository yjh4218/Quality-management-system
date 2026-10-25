import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import {
    fetchChangeRequests,
    fetchChangeRequestById,
    createChangeRequest,
    updateChangeRequest,
    deleteChangeRequest,
    transitionChangeStatus,
    reviewCcbChange,
    evaluateChangeEffectiveness,
    fetchChangeActionItems,
    createChangeActionItem,
    updateChangeActionItem,
    deleteChangeActionItem,
    fetchChangeControlKpi
} from './api';

// [카테고리 및 상태 상수 정의]
const CHANGE_CATEGORIES = [
    { value: 'PRODUCT', label: '제품/사양/원자재', icon: '📦' },
    { value: 'PROCESS', label: '제조/포장/시험 공정', icon: '⚙️' },
    { value: 'DOCUMENT', label: '통제문서/SOP/DMR', icon: '📑' },
    { value: 'SUPPLIER', label: '공급업체/외주제조', icon: '🏭' },
    { value: 'FACILITY_EQUIPMENT', label: '시설/유틸리티/설비', icon: '🔧' },
    { value: 'SOFTWARE_SYSTEM', label: '소프트웨어/전산시스템', icon: '💻' }
];

const CHANGE_URGENCIES = [
    { value: 'EMERGENCY', label: '긴급 (안전/법적 긴급조치)', color: '#ef4444' },
    { value: 'STANDARD', label: '일반 (정규 절차)', color: '#3b82f6' },
    { value: 'MINOR', label: '경미 (단순 오탈자 등)', color: '#64748b' }
];

const CHANGE_STATUSES = [
    { value: 'DRAFT', label: '작성 중', bg: '#f1f5f9', color: '#475569' },
    { value: 'SUBMITTED', label: '제출됨', bg: '#e0f2fe', color: '#0369a1' },
    { value: 'IMPACT_ASSESSING', label: '영향평가 중', bg: '#fef3c7', color: '#b45309' },
    { value: 'CCB_REVIEW', label: 'CCB 심의 중', bg: '#fae8ff', color: '#86198f' },
    { value: 'APPROVED', label: '승인됨', bg: '#dcfce7', color: '#15803d' },
    { value: 'IN_PROGRESS', label: '실행 중', bg: '#e0e7ff', color: '#4338ca' },
    { value: 'EFFECTIVENESS_CHECK', label: '효과성 평가 중', bg: '#ffedd5', color: '#c2410c' },
    { value: 'CLOSED', label: '최종 종결', bg: '#f1f5f9', color: '#1e293b' },
    { value: 'REJECTED', label: '반려/부결', bg: '#fee2e2', color: '#b91c1c' },
    { value: 'CANCELLED', label: '취소됨', bg: '#f3f4f6', color: '#9ca3af' }
];

const CCB_DECISIONS = [
    { value: 'APPROVED', label: '승인 (Approved)', color: '#15803d' },
    { value: 'CONDITIONALLY_APPROVED', label: '조건부 승인 (Conditionally Approved)', color: '#b45309' },
    { value: 'REJECTED', label: '부결/반려 (Rejected)', color: '#b91c1c' },
    { value: 'MORE_INFO_REQUIRED', label: '보완 요구 (More Info Required)', color: '#0369a1' }
];

export default function ChangeControlManagementPage({ user, onNavigate }) {
    // -------------------------------------------------------------------------
    // 상태 관리
    // -------------------------------------------------------------------------
    const [kpiData, setKpiData] = useState({
        totalChanges: 0,
        activeChanges: 0,
        ccbPendingCount: 0,
        effectivenessPassRate: 100.0,
        emergencyCount: 0,
        closedChanges: 0,
        categoryDistribution: {},
        statusDistribution: {},
        urgencyDistribution: {}
    });

    const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'impact', 'actions'
    const [changeRequests, setChangeRequests] = useState([]);
    const [selectedCr, setSelectedCr] = useState(null);
    const [actionItems, setActionItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // 검색 필터
    const [filterCategory, setFilterCategory] = useState('');
    const [filterUrgency, setFilterUrgency] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');

    // 모달 관리 (96vw x 92vh 규격)
    const [isCrModalOpen, setIsCrModalOpen] = useState(false);
    const [editingCr, setEditingCr] = useState(null);

    const [isCcbModalOpen, setIsCcbModalOpen] = useState(false);
    const [isEffectivenessModalOpen, setIsEffectivenessModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [editingActionItem, setEditingActionItem] = useState(null);

    const gridRef = useRef();

    // -------------------------------------------------------------------------
    // 데이터 조회 (KPI & CR 목록 & 조치과제)
    // -------------------------------------------------------------------------
    const loadKpis = useCallback(async () => {
        try {
            const data = await fetchChangeControlKpi();
            if (data) setKpiData(data);
        } catch (err) {
            console.error('KPI 로드 실패:', err);
        }
    }, []);

    const loadChangeRequests = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: 0,
                size: 100,
                keyword: searchKeyword.trim() || undefined,
                category: filterCategory || undefined,
                urgency: filterUrgency || undefined,
                status: filterStatus || undefined
            };
            const res = await fetchChangeRequests(params);
            const content = res.data?.content || [];
            setChangeRequests(content);

            if (content.length > 0) {
                // 이전에 선택된 것이 있으면 유지, 없으면 첫번째 선택
                setSelectedCr(prev => {
                    if (prev) {
                        const found = content.find(c => c.id === prev.id);
                        return found || content[0];
                    }
                    return content[0];
                });
            } else {
                setSelectedCr(null);
                setActionItems([]);
            }
        } catch (err) {
            console.error('변경요청 목록 로드 실패:', err);
            toast.error('변경요청 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [searchKeyword, filterCategory, filterUrgency, filterStatus]);

    const loadActionItems = useCallback(async (crId) => {
        if (!crId) return;
        try {
            const items = await fetchChangeActionItems(crId);
            setActionItems(items || []);
        } catch (err) {
            console.error('조치과제 로드 실패:', err);
        }
    }, []);

    useEffect(() => {
        loadKpis();
        loadChangeRequests();
    }, [loadKpis, loadChangeRequests]);

    useEffect(() => {
        if (selectedCr?.id) {
            loadActionItems(selectedCr.id);
        }
    }, [selectedCr?.id, loadActionItems]);

    const handleSearch = (e) => {
        e?.preventDefault();
        loadChangeRequests();
    };

    const handleResetFilter = () => {
        setFilterCategory('');
        setFilterUrgency('');
        setFilterStatus('');
        setSearchKeyword('');
    };

    // -------------------------------------------------------------------------
    // CR 등록 / 수정 / 삭제 핸들러
    // -------------------------------------------------------------------------
    const handleOpenCreateCrModal = () => {
        setEditingCr(null);
        setIsCrModalOpen(true);
    };

    const handleOpenEditCrModal = (cr) => {
        setEditingCr(cr);
        setIsCrModalOpen(true);
    };

    const handleDeleteCr = async (cr) => {
        if (!window.confirm(`변경요청서 [${cr.changeNumber}]를 정말 삭제(소프트 삭제)하시겠습니까?`)) {
            return;
        }
        try {
            await deleteChangeRequest(cr.id);
            toast.success(`변경요청서 [${cr.changeNumber}]가 삭제되었습니다.`);
            loadChangeRequests();
            loadKpis();
        } catch (err) {
            console.error('삭제 실패:', err);
            toast.error('변경요청 삭제에 실패했습니다.');
        }
    };

    const handleTransitionStatus = async (crId, nextStatus) => {
        try {
            await transitionChangeStatus(crId, nextStatus);
            toast.success(`상태가 [${nextStatus}]로 전이되었습니다.`);
            loadChangeRequests();
            loadKpis();
        } catch (err) {
            console.error('상태 전이 실패:', err);
            toast.error('상태 전이에 실패했습니다.');
        }
    };

    // -------------------------------------------------------------------------
    // AG Grid 컬럼 정의 (변경요청서 마스터)
    // -------------------------------------------------------------------------
    const crColumnDefs = useMemo(() => [
        {
            headerName: '관리번호',
            field: 'changeNumber',
            width: 140,
            pinned: 'left',
            cellStyle: { fontWeight: '700', color: '#1e293b' }
        },
        {
            headerName: '분류',
            field: 'category',
            width: 140,
            cellRenderer: (params) => {
                const cat = CHANGE_CATEGORIES.find(c => c.value === params.value);
                return (
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                        {cat ? `${cat.icon} ${cat.label}` : params.value}
                    </span>
                );
            }
        },
        {
            headerName: '긴급도',
            field: 'urgency',
            width: 110,
            cellRenderer: (params) => {
                const urg = CHANGE_URGENCIES.find(u => u.value === params.value);
                const color = urg ? urg.color : '#64748b';
                return (
                    <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: `${color}15`,
                        color: color,
                        border: `1px solid ${color}40`
                    }}>
                        {params.value === 'EMERGENCY' ? '🚨 긴급' : params.value === 'STANDARD' ? '일반' : '경미'}
                    </span>
                );
            }
        },
        {
            headerName: '변경 제목',
            field: 'title',
            flex: 1,
            minWidth: 260,
            cellStyle: { fontWeight: '600' }
        },
        {
            headerName: '대상품목/코드',
            field: 'targetItemName',
            width: 180,
            cellRenderer: (params) => {
                const name = params.value || '-';
                const code = params.data?.itemCode ? `(${params.data.itemCode})` : '';
                return <span style={{ fontSize: '12px' }}>{name} {code}</span>;
            }
        },
        {
            headerName: '기안자/부서',
            field: 'initiatorName',
            width: 150,
            cellRenderer: (params) => (
                <span style={{ fontSize: '12px' }}>
                    {params.value} <span style={{ color: '#94a3b8' }}>/ {params.data?.department}</span>
                </span>
            )
        },
        {
            headerName: '기안일자',
            field: 'requestDate',
            width: 115,
            cellStyle: { textAlign: 'center', fontSize: '12px' }
        },
        {
            headerName: '상태',
            field: 'status',
            width: 130,
            cellRenderer: (params) => {
                const st = CHANGE_STATUSES.find(s => s.value === params.value);
                const bg = st ? st.bg : '#f1f5f9';
                const color = st ? st.color : '#475569';
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: bg,
                        color: color,
                        border: `1px solid ${color}30`
                    }}>
                        {st ? st.label : params.value}
                    </span>
                );
            }
        },
        {
            headerName: '조치과제 진척도',
            field: 'actionProgressPercent',
            width: 160,
            cellRenderer: (params) => {
                const pct = params.value || 0;
                const total = params.data?.totalActionItemsCount || 0;
                const completed = params.data?.completedActionItemsCount || 0;
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600' }}>
                            <span>{pct}%</span>
                            <span style={{ color: '#64748b' }}>({completed}/{total})</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${pct}%`,
                                height: '100%',
                                backgroundColor: pct === 100 ? '#10b981' : '#3b82f6',
                                borderRadius: '3px',
                                transition: 'width 0.3s'
                            }} />
                        </div>
                    </div>
                );
            }
        },
        {
            headerName: '액션',
            field: 'actions',
            width: 220,
            pinned: 'right',
            cellRenderer: (params) => {
                const cr = params.data;
                return (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenEditCrModal(cr); }}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            ✏️ 수정
                        </button>
                        {cr.status === 'IMPACT_ASSESSING' && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedCr(cr); setIsCcbModalOpen(true); }}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: '#8b5cf6',
                                    color: '#fff',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                ⚖️ CCB 심의
                            </button>
                        )}
                        {cr.status === 'EFFECTIVENESS_CHECK' && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedCr(cr); setIsEffectivenessModalOpen(true); }}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: '#10b981',
                                    color: '#fff',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                🎯 효과성 평가
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteCr(cr); }}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                border: '1px solid #fecaca',
                                background: '#fff',
                                color: '#ef4444',
                                cursor: 'pointer'
                            }}
                        >
                            🗑️
                        </button>
                    </div>
                );
            }
        }
    ], [handleDeleteCr]);

    // -------------------------------------------------------------------------
    // AG Grid 컬럼 정의 (조치과제 Action Items)
    // -------------------------------------------------------------------------
    const actionColumnDefs = useMemo(() => [
        { headerName: '순번', field: 'actionOrder', width: 70, cellStyle: { textAlign: 'center', fontWeight: '700' } },
        { headerName: '조치 과제명', field: 'actionTitle', flex: 1, minWidth: 200, cellStyle: { fontWeight: '600' } },
        { headerName: '상세 내용', field: 'actionDetails', flex: 1, minWidth: 220 },
        { headerName: '담당자', field: 'assignedPerson', width: 120, cellStyle: { fontWeight: '600' } },
        { headerName: '담당부서', field: 'assignedDepartment', width: 120 },
        { headerName: '마감기한', field: 'dueDate', width: 110, cellStyle: { textAlign: 'center' } },
        { headerName: '완료일', field: 'completionDate', width: 110, cellStyle: { textAlign: 'center' } },
        {
            headerName: '상태',
            field: 'status',
            width: 120,
            cellRenderer: (params) => {
                const isDone = params.value === 'COMPLETED';
                const isProg = params.value === 'IN_PROGRESS';
                return (
                    <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: isDone ? '#dcfce7' : isProg ? '#e0f2fe' : '#f1f5f9',
                        color: isDone ? '#15803d' : isProg ? '#0369a1' : '#64748b'
                    }}>
                        {isDone ? '✅ 완료' : isProg ? '🔄 진행 중' : '대기'}
                    </span>
                );
            }
        },
        {
            headerName: '증빙 서류',
            field: 'evidenceDocUrl',
            width: 140,
            cellRenderer: (params) => params.value ? (
                <a href={params.value} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontSize: '12px' }}>
                    📎 {params.value.split('/').pop()}
                </a>
            ) : <span style={{ color: '#cbd5e1' }}>미첨부</span>
        },
        {
            headerName: '조치',
            width: 130,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        type="button"
                        onClick={() => { setEditingActionItem(params.data); setIsActionModalOpen(true); }}
                        style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                    >
                        수정
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            if (window.confirm('해당 조치항목을 삭제하시겠습니까?')) {
                                try {
                                    await deleteChangeActionItem(selectedCr.id, params.data.id);
                                    toast.success('조치항목이 삭제되었습니다.');
                                    loadActionItems(selectedCr.id);
                                    loadChangeRequests();
                                } catch (e) {
                                    toast.error('삭제 실패');
                                }
                            }
                        }}
                        style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #fecaca', background: '#fff', color: '#ef4444', cursor: 'pointer' }}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ], [selectedCr?.id, loadActionItems, loadChangeRequests]);

    // -------------------------------------------------------------------------
    // 렌더링
    // -------------------------------------------------------------------------
    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
            {/* Tier 1 & 2: Header & Regulatory Description */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '28px' }}>🔄</span>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
                            변경관리 (Change Control) - ISO 13485 / ISO 22716
                        </h1>
                        <span style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3',
                            borderRadius: '16px',
                            border: '1px solid #c7d2fe'
                        }}>
                            ISO 13485 §7.3.9 & 21 CFR 820.70
                        </span>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        제품 사양, 원자재, 제조공정, 통제문서(DMS), 설비 변경 발생 시 다차원 영향평가와 CCB 위원회 승인을 거쳐 실행 및 효과성을 영구 검증합니다.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={handleOpenCreateCrModal}
                        style={{
                            padding: '10px 18px',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        ➕ 신규 변경요청
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (gridRef.current?.api) {
                                gridRef.current.api.exportDataAsCsv({ fileName: `변경관리대장_${new Date().toISOString().slice(0, 10)}.csv` });
                                toast.success('CSV 파일이 다운로드되었습니다.');
                            }
                        }}
                        style={{
                            padding: '10px 14px',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        📥 CSV 내보내기
                    </button>
                    <button
                        type="button"
                        onClick={() => { loadKpis(); loadChangeRequests(); toast.info('데이터가 새로고침되었습니다.'); }}
                        style={{
                            padding: '10px 14px',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        🔄 새로고침
                    </button>
                </div>
            </div>

            {/* Tier 3: Regulatory Manual Banner */}
            <div style={{ marginBottom: '20px' }}>
                <RegulatoryManualBanner pageKey="changeControl" />
            </div>

            {/* 6대 KPI 요약 카드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>전체 변경요청 (CR)</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginTop: '6px' }}>{kpiData.totalChanges} <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>건</span></div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>진행 중 변경 건수</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#b45309', marginTop: '6px' }}>{kpiData.activeChanges} <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>건</span></div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>CCB 심의 대기</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#6d28d9', marginTop: '6px' }}>{kpiData.ccbPendingCount} <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>건</span></div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>효과성 검증 적합률</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#047857', marginTop: '6px' }}>{kpiData.effectivenessPassRate}%</div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>🚨 긴급 변경 (Emergency)</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#b91c1c', marginTop: '6px' }}>{kpiData.emergencyCount} <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>건</span></div>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>최종 종결 완료 (Closed)</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#334155', marginTop: '6px' }}>{kpiData.closedChanges} <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>건</span></div>
                </div>
            </div>

            {/* 다차원 검색/필터 바 */}
            <div style={{
                backgroundColor: '#ffffff',
                padding: '16px 20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '20px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
                <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                            변경 분류 (Category)
                        </label>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                        >
                            <option value="">전체 분류</option>
                            {CHANGE_CATEGORIES.map(c => (
                                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                            긴급도 (Urgency)
                        </label>
                        <select
                            value={filterUrgency}
                            onChange={(e) => setFilterUrgency(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                        >
                            <option value="">전체 긴급도</option>
                            {CHANGE_URGENCIES.map(u => (
                                <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                            상태 (Status)
                        </label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                        >
                            <option value="">전체 상태</option>
                            {CHANGE_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                            키워드 검색
                        </label>
                        <input
                            type="text"
                            placeholder="변경번호, 제목, 기안자, 품목명..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            style={{
                                padding: '9px 14px',
                                backgroundColor: '#ffffff',
                                color: '#64748b',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            ♻️ 초기화
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '9px 20px',
                                backgroundColor: '#0f172a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            🔍 조회
                        </button>
                    </div>
                </form>
            </div>

            {/* 3개 탭 헤더 */}
            <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '2px solid #e2e8f0',
                marginBottom: '16px'
            }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('requests')}
                    style={{
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: activeTab === 'requests' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'requests' ? '3px solid #2563eb' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    📋 변경요청서 마스터 ({changeRequests.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('impact')}
                    style={{
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: activeTab === 'impact' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'impact' ? '3px solid #2563eb' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    📊 영향평가 및 양방향 추적성
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('actions')}
                    style={{
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: activeTab === 'actions' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'actions' ? '3px solid #2563eb' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    🎯 실행 조치과제 & 효과성 검증 ({actionItems.length})
                </button>
            </div>

            {/* 탭 1: 변경요청서 마스터 그리드 */}
            {activeTab === 'requests' && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                            총 {changeRequests.length}건의 변경요청서가 등록되어 있습니다. (행 클릭 시 세부정보 선택)
                        </span>
                    </div>
                    <div className="ag-theme-legacy" style={{ width: '100%', height: '560px' }}>
                        <AgGridReact
                            ref={gridRef}
                            rowData={changeRequests}
                            columnDefs={crColumnDefs}
                            rowHeight={54}
                            headerHeight={48}
                            rowSelection="single"
                            onRowClicked={(e) => setSelectedCr(e.data)}
                            overlayNoRowsTemplate="<span>등록된 변경요청서가 없습니다.</span>"
                            overlayLoadingTemplate="<span>데이터를 로딩 중입니다...</span>"
                            theme="legacy"
                        />
                    </div>
                </div>
            )}

            {/* 탭 2: 영향평가 및 양방향 추적성 카드 뷰 */}
            {activeTab === 'impact' && (
                <div>
                    {!selectedCr ? (
                        <div style={{ backgroundColor: '#fff', padding: '40px', textAlign: 'center', borderRadius: '8px', color: '#94a3b8' }}>
                            선택된 변경요청서가 없습니다. 첫 번째 탭에서 변경요청서를 선택해 주세요.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                            {/* 영향평가 요약 카드 */}
                            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                                        다차원 변경 영향평가 (Impact Assessment)
                                    </h3>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb' }}>{selectedCr.changeNumber}</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div style={{ padding: '12px', backgroundColor: selectedCr.regulatoryImpact ? '#fef2f2' : '#f0fdf4', borderRadius: '6px', border: `1px solid ${selectedCr.regulatoryImpact ? '#fecaca' : '#bbf7d0'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: '700', fontSize: '13px', color: selectedCr.regulatoryImpact ? '#991b1b' : '#166534' }}>
                                                ⚖️ 규제 / 인허가 영향
                                            </span>
                                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', backgroundColor: selectedCr.regulatoryImpact ? '#ef4444' : '#22c55e', color: '#fff' }}>
                                                {selectedCr.regulatoryImpact ? '영향 있음 (신고/허가 변경)' : '영향 없음'}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                                            {selectedCr.regulatoryDetails || '추가 인허가 변경 보고 불요.'}
                                        </p>
                                    </div>

                                    <div style={{ padding: '12px', backgroundColor: selectedCr.qualitySafetyImpact ? '#fffbeb' : '#f0fdf4', borderRadius: '6px', border: `1px solid ${selectedCr.qualitySafetyImpact ? '#fde68a' : '#bbf7d0'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: '700', fontSize: '13px', color: selectedCr.qualitySafetyImpact ? '#92400e' : '#166534' }}>
                                                🧪 제품 품질 및 안전성 영향
                                            </span>
                                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', backgroundColor: selectedCr.qualitySafetyImpact ? '#f59e0b' : '#22c55e', color: '#fff' }}>
                                                {selectedCr.qualitySafetyImpact ? '영향 있음 (규격/안정성 재검토)' : '영향 없음'}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                                            {selectedCr.qualityDetails || '기존 규격 및 품질 안전 기준 유지.'}
                                        </p>
                                    </div>

                                    <div style={{ padding: '12px', backgroundColor: selectedCr.validationRequired ? '#eff6ff' : '#f8fafc', borderRadius: '6px', border: `1px solid ${selectedCr.validationRequired ? '#bfdbfe' : '#e2e8f0'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: '700', fontSize: '13px', color: selectedCr.validationRequired ? '#1e40af' : '#475569' }}>
                                                🏭 밸리데이션 / 공정검증 필요성
                                            </span>
                                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', backgroundColor: selectedCr.validationRequired ? '#3b82f6' : '#94a3b8', color: '#fff' }}>
                                                {selectedCr.validationRequired ? '밸리데이션 필수' : '해당 없음'}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                                            {selectedCr.validationDetails || '단순 경미 변경으로 신규 검증 불요.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 양방향 추적성 연계 카드 (위험관리, 통제문서, 설계개발) */}
                            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                                        전사 eQMS 양방향 역추적성 연계
                                    </h3>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Cross-Module Traceability</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>위험관리 파일 (ISO 14971 RMF) 연계</div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                                                {selectedCr.riskAssessmentCode ? `⚠️ ${selectedCr.riskAssessmentCode}` : '미연계 (신규 위해요인 없음)'}
                                            </div>
                                        </div>
                                        {selectedCr.riskAssessmentCode && (
                                            <button
                                                type="button"
                                                onClick={() => onNavigate && onNavigate('riskManagement')}
                                                style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                                            >
                                                이동 ↗
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>통제문서 및 SOP (DMS) 개정 연계</div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                                                {selectedCr.dmsDocumentNumber ? `📂 ${selectedCr.dmsDocumentNumber}` : '미연계 (문서 개정 불요)'}
                                            </div>
                                        </div>
                                        {selectedCr.dmsDocumentNumber && (
                                            <button
                                                type="button"
                                                onClick={() => onNavigate && onNavigate('controlledDocuments')}
                                                style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                                            >
                                                이동 ↗
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>설계이력파일 (DHF 프로젝트) 연계</div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                                                {selectedCr.designProjectCode ? `📐 ${selectedCr.designProjectCode}` : '미연계 (설계 변경 아님)'}
                                            </div>
                                        </div>
                                        {selectedCr.designProjectCode && (
                                            <button
                                                type="button"
                                                onClick={() => onNavigate && onNavigate('designControls')}
                                                style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                                            >
                                                이동 ↗
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 탭 3: 실행 조치과제 & 효과성 검증 */}
            {activeTab === 'actions' && (
                <div>
                    {!selectedCr ? (
                        <div style={{ backgroundColor: '#fff', padding: '40px', textAlign: 'center', borderRadius: '8px', color: '#94a3b8' }}>
                            선택된 변경요청서가 없습니다.
                        </div>
                    ) : (
                        <div>
                            {/* CCB 심의 및 효과성 상태 배너 */}
                            <div style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                padding: '16px 20px',
                                marginBottom: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>현재 변경요청서</div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                                        [{selectedCr.changeNumber}] {selectedCr.title}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setEditingActionItem(null); setIsActionModalOpen(true); }}
                                        style={{
                                            padding: '8px 14px',
                                            backgroundColor: '#2563eb',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ➕ 조치과제 추가
                                    </button>
                                </div>
                            </div>

                            {/* 조치과제 AG Grid */}
                            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div className="ag-theme-legacy" style={{ width: '100%', height: '420px' }}>
                                    <AgGridReact
                                        rowData={actionItems}
                                        columnDefs={actionColumnDefs}
                                        rowHeight={54}
                                        headerHeight={48}
                                        overlayNoRowsTemplate="<span>등록된 실행 조치과제가 없습니다.</span>"
                                        theme="legacy"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* -------------------------------------------------------------------------
                모달 1: 신규/수정 변경요청서 모달 (96vw x 92vh Maximized)
            ------------------------------------------------------------------------- */}
            {isCrModalOpen && (
                <ChangeRequestModal
                    isOpen={isCrModalOpen}
                    initialData={editingCr}
                    onClose={() => setIsCrModalOpen(false)}
                    onSuccess={() => {
                        setIsCrModalOpen(false);
                        loadChangeRequests();
                        loadKpis();
                    }}
                />
            )}

            {/* -------------------------------------------------------------------------
                모달 2: CCB 심의 및 승인 모달 (96vw x 92vh Maximized)
            ------------------------------------------------------------------------- */}
            {isCcbModalOpen && selectedCr && (
                <CcbReviewModal
                    isOpen={isCcbModalOpen}
                    cr={selectedCr}
                    onClose={() => setIsCcbModalOpen(false)}
                    onSuccess={() => {
                        setIsCcbModalOpen(false);
                        loadChangeRequests();
                        loadKpis();
                    }}
                />
            )}

            {/* -------------------------------------------------------------------------
                모달 3: 효과성 검증 모달 (96vw x 92vh Maximized)
            ------------------------------------------------------------------------- */}
            {isEffectivenessModalOpen && selectedCr && (
                <EffectivenessModal
                    isOpen={isEffectivenessModalOpen}
                    cr={selectedCr}
                    onClose={() => setIsEffectivenessModalOpen(false)}
                    onSuccess={() => {
                        setIsEffectivenessModalOpen(false);
                        loadChangeRequests();
                        loadKpis();
                    }}
                />
            )}

            {/* -------------------------------------------------------------------------
                모달 4: 조치과제 등록/수정 모달
            ------------------------------------------------------------------------- */}
            {isActionModalOpen && selectedCr && (
                <ActionItemModal
                    isOpen={isActionModalOpen}
                    crId={selectedCr.id}
                    initialData={editingActionItem}
                    onClose={() => setIsActionModalOpen(false)}
                    onSuccess={() => {
                        setIsActionModalOpen(false);
                        loadActionItems(selectedCr.id);
                        loadChangeRequests();
                    }}
                />
            )}
        </div>
    );
}

// =============================================================================
// 서브 컴포넌트 1: 변경요청서 등록/수정 모달 (96vw x 92vh)
// =============================================================================
function ChangeRequestModal({ isOpen, initialData, onClose, onSuccess }) {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState({
        changeNumber: initialData?.changeNumber || '',
        title: initialData?.title || '',
        category: initialData?.category || 'PRODUCT',
        urgency: initialData?.urgency || 'STANDARD',
        status: initialData?.status || 'DRAFT',
        targetItemName: initialData?.targetItemName || '',
        itemCode: initialData?.itemCode || '',
        initiatorName: initialData?.initiatorName || '',
        department: initialData?.department || '',
        requestDate: initialData?.requestDate || new Date().toISOString().slice(0, 10),
        targetCompletionDate: initialData?.targetCompletionDate || '',
        changeReason: initialData?.changeReason || '',
        currentState: initialData?.currentState || '',
        proposedChange: initialData?.proposedChange || '',
        regulatoryImpact: initialData?.regulatoryImpact || false,
        regulatoryDetails: initialData?.regulatoryDetails || '',
        qualitySafetyImpact: initialData?.qualitySafetyImpact || false,
        qualityDetails: initialData?.qualityDetails || '',
        validationRequired: initialData?.validationRequired || false,
        validationDetails: initialData?.validationDetails || '',
        riskAssessmentCode: initialData?.riskAssessmentCode || '',
        dmsDocumentNumber: initialData?.dmsDocumentNumber || '',
        designProjectCode: initialData?.designProjectCode || '',
        effectivenessRequired: initialData?.effectivenessRequired ?? true,
        effectivenessDueDate: initialData?.effectivenessDueDate || ''
    });

    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) return toast.error('변경 제목을 입력해 주세요.');
        if (!formData.changeReason.trim()) return toast.error('변경 사유를 입력해 주세요.');
        if (!formData.currentState.trim()) return toast.error('변경 전 현황(As-Is)을 입력해 주세요.');
        if (!formData.proposedChange.trim()) return toast.error('변경 후 사양(To-Be)을 입력해 주세요.');

        setSubmitting(true);
        try {
            if (isEdit) {
                await updateChangeRequest(initialData.id, formData);
                toast.success('변경요청서가 성공적으로 수정되었습니다.');
            } else {
                await createChangeRequest(formData);
                toast.success('신규 변경요청서가 성공적으로 등록되었습니다.');
            }
            onSuccess();
        } catch (err) {
            console.error('저장 실패:', err);
            toast.error(err.response?.data?.message || '변경요청서 저장 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                backgroundColor: '#ffffff', borderRadius: '12px',
                display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
            }}>
                {/* 헤더 */}
                <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                            {isEdit ? `✏️ 변경요청서 수정 [${initialData.changeNumber}]` : '➕ 신규 변경요청서 (Change Request) 제정'}
                        </h2>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                            ISO 13485:2016 §7.3.9 및 ISO 22716 §11 규제 정합 변경신청서
                        </span>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                </div>

                {/* 바디 (스크롤) */}
                <form id="cr-form" onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>변경 분류 *</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                {CHANGE_CATEGORIES.map(c => (
                                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>긴급도 *</label>
                            <select
                                value={formData.urgency}
                                onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                {CHANGE_URGENCIES.map(u => (
                                    <option key={u.value} value={u.value}>{u.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>진행 상태</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                {CHANGE_STATUSES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>변경 제목 *</label>
                        <input
                            type="text"
                            placeholder="예: 스마트 인슐린 펜 리튬이온 배터리 공급사 및 보호회로 사양 변경"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>대상품목 / 설비 / 문서명</label>
                            <input
                                type="text"
                                placeholder="예: 스마트 인슐린 펜"
                                value={formData.targetItemName}
                                onChange={(e) => setFormData({ ...formData, targetItemName: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>품목코드 / 일련번호</label>
                            <input
                                type="text"
                                placeholder="예: DP-2026-001"
                                value={formData.itemCode}
                                onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>기안자 성명 *</label>
                            <input
                                type="text"
                                value={formData.initiatorName}
                                onChange={(e) => setFormData({ ...formData, initiatorName: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>기안 부서 *</label>
                            <input
                                type="text"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>변경 사유 및 배경 (Change Reason) *</label>
                        <textarea
                            rows={3}
                            placeholder="기존 원자재 단종, 공정 최적화, 불량률 개선 등 상세 배경 기술"
                            value={formData.changeReason}
                            onChange={(e) => setFormData({ ...formData, changeReason: e.target.value })}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#b91c1c', marginBottom: '6px' }}>변경 전 현황 (Current State / As-Is) *</label>
                            <textarea
                                rows={4}
                                placeholder="현재 적용 중인 사양, 부품 번호, 도면, 공정 조건 등"
                                value={formData.currentState}
                                onChange={(e) => setFormData({ ...formData, currentState: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fffaf0', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#15803d', marginBottom: '6px' }}>변경 후 사양 (Proposed Change / To-Be) *</label>
                            <textarea
                                rows={4}
                                placeholder="신규 제안 사양, 대체 부품 사양, 변경 공정 파라미터 등"
                                value={formData.proposedChange}
                                onChange={(e) => setFormData({ ...formData, proposedChange: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #86efac', backgroundColor: '#f0fdf4', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    {/* 영향평가 섹션 */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>다차원 변경 영향평가 (Change Impact Assessment)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.regulatoryImpact}
                                        onChange={(e) => setFormData({ ...formData, regulatoryImpact: e.target.checked })}
                                    />
                                    ⚖️ 규제 / 인허가 영향 있음
                                </label>
                                <input
                                    type="text"
                                    placeholder="상세 내용 기술 (허가변경 등)"
                                    value={formData.regulatoryDetails}
                                    onChange={(e) => setFormData({ ...formData, regulatoryDetails: e.target.value })}
                                    disabled={!formData.regulatoryImpact}
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.qualitySafetyImpact}
                                        onChange={(e) => setFormData({ ...formData, qualitySafetyImpact: e.target.checked })}
                                    />
                                    🧪 품질 / 안전성 영향 있음
                                </label>
                                <input
                                    type="text"
                                    placeholder="상세 내용 기술 (규격, 안정성 등)"
                                    value={formData.qualityDetails}
                                    onChange={(e) => setFormData({ ...formData, qualityDetails: e.target.value })}
                                    disabled={!formData.qualitySafetyImpact}
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.validationRequired}
                                        onChange={(e) => setFormData({ ...formData, validationRequired: e.target.checked })}
                                    />
                                    🏭 밸리데이션 / 공정검증 필수
                                </label>
                                <input
                                    type="text"
                                    placeholder="IQ/OQ/PQ/PV 검증 계획"
                                    value={formData.validationDetails}
                                    onChange={(e) => setFormData({ ...formData, validationDetails: e.target.value })}
                                    disabled={!formData.validationRequired}
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 양방향 연계 코드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>위험관리 번호 (ISO 14971 RMF)</label>
                            <input
                                type="text"
                                placeholder="예: RSK-202610-001"
                                value={formData.riskAssessmentCode}
                                onChange={(e) => setFormData({ ...formData, riskAssessmentCode: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>개정 대상 통제문서 (DMS)</label>
                            <input
                                type="text"
                                placeholder="예: SOP-ENG-001"
                                value={formData.dmsDocumentNumber}
                                onChange={(e) => setFormData({ ...formData, dmsDocumentNumber: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>설계개발 프로젝트 (DHF)</label>
                            <input
                                type="text"
                                placeholder="예: DP-2026-001"
                                value={formData.designProjectCode}
                                onChange={(e) => setFormData({ ...formData, designProjectCode: e.target.value })}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>
                </form>

                {/* 푸터 */}
                <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
                    <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                        취소
                    </button>
                    <button type="submit" form="cr-form" disabled={submitting} style={{ padding: '10px 22px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                        {submitting ? '저장 중...' : (isEdit ? '수정 완료' : '변경요청서 저장')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// 서브 컴포넌트 2: CCB 심의 및 승인 모달 (96vw x 92vh)
// =============================================================================
function CcbReviewModal({ isOpen, cr, onClose, onSuccess }) {
    const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
    const [attendees, setAttendees] = useState(cr?.ccbAttendees || '품질보증팀장, 연구개발팀장, 생산기술팀장, 인허가담당');
    const [summary, setSummary] = useState(cr?.ccbSummary || '');
    const [decision, setDecision] = useState(cr?.ccbDecision || 'APPROVED');
    const [conditions, setConditions] = useState(cr?.ccbConditions || '');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !cr) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!summary.trim()) return toast.error('심의 요약을 입력해 주세요.');

        setSubmitting(true);
        try {
            await reviewCcbChange(cr.id, {
                ccbReviewDate: reviewDate,
                ccbAttendees: attendees,
                ccbSummary: summary,
                ccbDecision: decision,
                ccbConditions: conditions
            });
            toast.success(`CCB 심의가 완료되었습니다. 판정: [${decision}]`);
            onSuccess();
        } catch (err) {
            console.error('심의 실패:', err);
            toast.error('CCB 심의 저장 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                width: '96vw', maxWidth: '1400px', height: '92vh', maxHeight: '94vh',
                backgroundColor: '#ffffff', borderRadius: '12px',
                display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
            }}>
                <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                            ⚖️ 변경관리위원회(CCB) 공식 심의 및 의결
                        </h2>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                            대상 변경요청: [{cr.changeNumber}] {cr.title}
                        </span>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                </div>

                <form id="ccb-form" onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>심의 일자 *</label>
                            <input
                                type="date"
                                value={reviewDate}
                                onChange={(e) => setReviewDate(e.target.value)}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>참석 심의위원 명단 *</label>
                            <input
                                type="text"
                                value={attendees}
                                onChange={(e) => setAttendees(e.target.value)}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>CCB 의결 판정 (Decision) *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                            {CCB_DECISIONS.map(d => (
                                <button
                                    key={d.value}
                                    type="button"
                                    onClick={() => setDecision(d.value)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: decision === d.value ? `2px solid ${d.color}` : '1px solid #cbd5e1',
                                        backgroundColor: decision === d.value ? `${d.color}15` : '#fff',
                                        color: decision === d.value ? d.color : '#475569',
                                        fontWeight: '700',
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>심의 요약 및 의결 내용 (Summary) *</label>
                        <textarea
                            rows={4}
                            placeholder="변경 타당성 검토 결과, 기술적 리스크 분석, 승인 근거 기술"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>조건부 승인 사항 및 조치 요구사항 (Conditions)</label>
                        <textarea
                            rows={3}
                            placeholder="조건부 승인 시 반드시 이행해야 할 과제 (예: 초도 3배치 안정성 시험성적서 첨부 등)"
                            value={conditions}
                            onChange={(e) => setConditions(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>
                </form>

                <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
                    <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>취소</button>
                    <button type="submit" form="ccb-form" disabled={submitting} style={{ padding: '10px 22px', borderRadius: '6px', border: 'none', background: '#8b5cf6', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                        {submitting ? '의결 중...' : 'CCB 심의 의결 완료'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// 서브 컴포넌트 3: 효과성 검증 모달 (96vw x 92vh)
// =============================================================================
function EffectivenessModal({ isOpen, cr, onClose, onSuccess }) {
    const [evalDate, setEvalDate] = useState(new Date().toISOString().slice(0, 10));
    const [status, setStatus] = useState(cr?.effectivenessStatus || 'EFFECTIVE');
    const [summary, setSummary] = useState(cr?.effectivenessSummary || '');
    const [evaluator, setEvaluator] = useState(cr?.evaluatorName || '품질보증팀장');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !cr) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!summary.trim()) return toast.error('효과성 평가 내용을 기술해 주세요.');

        setSubmitting(true);
        try {
            await evaluateChangeEffectiveness(cr.id, {
                effectivenessEvalDate: evalDate,
                effectivenessStatus: status,
                effectivenessSummary: summary,
                evaluatorName: evaluator
            });
            toast.success(`효과성 평가가 완료되었습니다. 판정: [${status}]`);
            onSuccess();
        } catch (err) {
            console.error('평가 저장 실패:', err);
            toast.error('효과성 평가 저장 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                width: '96vw', maxWidth: '1300px', height: '92vh', maxHeight: '94vh',
                backgroundColor: '#ffffff', borderRadius: '12px',
                display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
            }}>
                <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                            🎯 변경 효과성 검증 평가 (Effectiveness Check)
                        </h2>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                            ISO 13485:2016 §7.3.9 변경 후 일정 기간 동안의 품질 및 신뢰성 입증
                        </span>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                </div>

                <form id="effect-form" onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>평가 일자 *</label>
                            <input
                                type="date"
                                value={evalDate}
                                onChange={(e) => setEvalDate(e.target.value)}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>평가자 성명 *</label>
                            <input
                                type="text"
                                value={evaluator}
                                onChange={(e) => setEvaluator(e.target.value)}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>효과성 판정 결과 *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setStatus('EFFECTIVE')}
                                style={{
                                    padding: '14px',
                                    borderRadius: '8px',
                                    border: status === 'EFFECTIVE' ? '2px solid #10b981' : '1px solid #cbd5e1',
                                    backgroundColor: status === 'EFFECTIVE' ? '#dcfce7' : '#fff',
                                    color: status === 'EFFECTIVE' ? '#15803d' : '#475569',
                                    fontWeight: '800',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                ✅ 효과성 입증됨 (적합 / 종결)
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus('INEFFICIENT')}
                                style={{
                                    padding: '14px',
                                    borderRadius: '8px',
                                    border: status === 'INEFFICIENT' ? '2px solid #ef4444' : '1px solid #cbd5e1',
                                    backgroundColor: status === 'INEFFICIENT' ? '#fee2e2' : '#fff',
                                    color: status === 'INEFFICIENT' ? '#b91c1c' : '#475569',
                                    fontWeight: '800',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                ❌ 효과성 미흡 (부적합 / 추가 과제)
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>효과성 평가 결과 및 데이터 요약 *</label>
                        <textarea
                            rows={5}
                            placeholder="변경 후 3배치 수율, 클레임 발생률, 공정 안정성 등 구체적 지표 데이터 기술"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>
                </form>

                <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
                    <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>취소</button>
                    <button type="submit" form="effect-form" disabled={submitting} style={{ padding: '10px 22px', borderRadius: '6px', border: 'none', background: '#10b981', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                        {submitting ? '평가 중...' : '효과성 평가 완료 및 종결'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// 서브 컴포넌트 4: 조치과제 등록/수정 모달
// =============================================================================
function ActionItemModal({ isOpen, crId, initialData, onClose, onSuccess }) {
    const isEdit = !!initialData;
    const [title, setTitle] = useState(initialData?.actionTitle || '');
    const [details, setDetails] = useState(initialData?.actionDetails || '');
    const [person, setPerson] = useState(initialData?.assignedPerson || '');
    const [dept, setDept] = useState(initialData?.assignedDepartment || '');
    const [dueDate, setDueDate] = useState(initialData?.dueDate || new Date().toISOString().slice(0, 10));
    const [status, setStatus] = useState(initialData?.status || 'PENDING');
    const [docUrl, setDocUrl] = useState(initialData?.evidenceDocUrl || '');
    const [notes, setNotes] = useState(initialData?.verificationNotes || '');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return toast.error('조치 과제명을 입력해 주세요.');
        if (!person.trim()) return toast.error('담당자를 입력해 주세요.');

        setSubmitting(true);
        try {
            const payload = {
                actionTitle: title,
                actionDetails: details,
                assignedPerson: person,
                assignedDepartment: dept,
                dueDate: dueDate,
                status: status,
                evidenceDocUrl: docUrl,
                verificationNotes: notes
            };
            if (isEdit) {
                await updateChangeActionItem(crId, initialData.id, payload);
                toast.success('조치과제가 수정되었습니다.');
            } else {
                await createChangeActionItem(crId, payload);
                toast.success('신규 조치과제가 등록되었습니다.');
            }
            onSuccess();
        } catch (err) {
            console.error('조치과제 저장 실패:', err);
            toast.error('조치과제 저장 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <div style={{
                width: '680px', maxWidth: '94vw', maxHeight: '90vh',
                backgroundColor: '#ffffff', borderRadius: '10px',
                display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden'
            }}>
                <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                        {isEdit ? '✏️ 조치과제 수정' : '➕ 신규 조치과제 추가'}
                    </h3>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                </div>

                <form id="action-form" onSubmit={handleSubmit} style={{ padding: '20px 22px', overflowY: 'auto' }}>
                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>과제명 *</label>
                        <input
                            type="text"
                            placeholder="예: 공정 작업표준서(SOP) 개정 상신"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>담당자 *</label>
                            <input
                                type="text"
                                value={person}
                                onChange={(e) => setPerson(e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>담당부서</label>
                            <input
                                type="text"
                                value={dept}
                                onChange={(e) => setDept(e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>마감기한 *</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>진행 상태</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                <option value="PENDING">대기 (PENDING)</option>
                                <option value="IN_PROGRESS">진행 중 (IN_PROGRESS)</option>
                                <option value="COMPLETED">완료 (COMPLETED)</option>
                                <option value="CANCELLED">취소 (CANCELLED)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>증빙 문서 URL / 파일명</label>
                        <input
                            type="text"
                            placeholder="예: SOP-DMR-REV02.docx"
                            value={docUrl}
                            onChange={(e) => setDocUrl(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>상세 내용</label>
                        <textarea
                            rows={3}
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>
                </form>

                <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f8fafc' }}>
                    <button type="button" onClick={onClose} style={{ padding: '8px 14px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', cursor: 'pointer' }}>취소</button>
                    <button type="submit" form="action-form" disabled={submitting} style={{ padding: '8px 18px', borderRadius: '4px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                        {submitting ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}
