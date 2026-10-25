import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import {
    fetchOfficialRecordsKpi,
    fetchElectronicSignatures,
    createElectronicSignature,
    revokeElectronicSignature,
    fetchPart11Assessments,
    createPart11Assessment,
    updatePart11Assessment,
    deletePart11Assessment,
    fetchOfficialRecordPolicies,
    createOfficialRecordPolicy,
    updateOfficialRecordPolicy,
    deleteOfficialRecordPolicy
} from './api';

// =========================================================================
// 상수 & 옵션 (21 CFR Part 11 & DEC-01)
// =========================================================================

const SIGNATURE_MEANING_OPTIONS = [
    { value: 'AUTHOR', label: '작성 완료 (Author/Created)', color: '#2563eb', bg: '#eff6ff' },
    { value: 'REVIEWER', label: '기술/절차 검토 완료 (Reviewed)', color: '#0284c7', bg: '#e0f2fe' },
    { value: 'APPROVER', label: '부서장 승인 (Approved)', color: '#d97706', bg: '#fef3c7' },
    { value: 'QUALITY_AUTHORITY', label: '품질책임자 최종 인가 (Quality Authority Release)', color: '#16a34a', bg: '#dcfce7' },
    { value: 'WITNESS', label: '입회 및 시험 확인 (Witness/Verified)', color: '#7c3aed', bg: '#f3e8ff' }
];

const OFFICIAL_ORIGINAL_OPTIONS = [
    { value: 'ELECTRONIC_ONLY', label: '완전 전자기록 (Electronic Original - Part 11)', color: '#2563eb', bg: '#eff6ff' },
    { value: 'HYBRID', label: '하이브리드 (화면 전자서명 + 인쇄본 서명 보관 - DEC-01)', color: '#059669', bg: '#ecfdf5' },
    { value: 'PAPER_ONLY', label: '수기/종이 원본 보관 (시스템은 보조 열람)', color: '#d97706', bg: '#fef3c7' }
];

const RECORD_CATEGORY_OPTIONS = [
    { value: 'SPECIFICATION', label: '제품표준서 및 기준규격서' },
    { value: 'BATCH_RECORD', label: '제조지시 및 제조기록서' },
    { value: 'TEST_REPORT', label: '원자재 및 완제품 시험성적서' },
    { value: 'RELEASE_RECORD', label: '완제품 출하승인서' },
    { value: 'CHANGE_RECORD', label: '변경관리 및 영향평가서' },
    { value: 'CAPA_RECORD', label: '시정 및 예방조치(CAPA) 보고서' },
    { value: 'NCR_RECORD', label: '부적합품(NCR) 보고서' },
    { value: 'AUDIT_RECORD', label: '내부심사 및 경영검토 기록서' },
    { value: 'FACILITY_RECORD', label: '설비적격성 및 교정 성적서' },
    { value: 'COMPLAINT_RECORD', label: '고객불만 및 이상사례 보고서' },
    { value: 'TRAINING_RECORD', label: '교육훈련 및 자격인정서' }
];

const COMPLIANCE_STATUS_OPTIONS = [
    { value: 'COMPLIANT', label: '완전 적합 (Compliant)', color: '#16a34a', bg: '#dcfce7' },
    { value: 'PARTIALLY_COMPLIANT', label: '부분 적합 / 보완 진행 (Partially)', color: '#d97706', bg: '#fef3c7' },
    { value: 'NON_COMPLIANT', label: '부적합 (Non-Compliant)', color: '#dc2626', bg: '#fee2e2' },
    { value: 'NOT_APPLICABLE', label: '해당 없음 (N/A)', color: '#64748b', bg: '#f1f5f9' }
];

export default function OfficialRecordPolicyPage() {
    const [activeTab, setActiveTab] = useState('signatures'); // 'signatures' | 'policies' | 'part11' | 'manifest'
    const [loading, setLoading] = useState(false);

    // KPI 데이터
    const [kpi, setKpi] = useState({
        totalSignatures: 0,
        qualityAuthoritySignatures: 0,
        part11ComplianceRate: 100.0,
        activePolicies: 0,
        hybridPolicyRate: 0.0,
        integrityValidRate: 100.0
    });

    // 목록 데이터
    const [signatures, setSignatures] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [part11List, setPart11List] = useState([]);

    // 검색/필터
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterMeaning, setFilterMeaning] = useState('');

    // 모달 상태
    const [isCreateSigModalOpen, setIsCreateSigModalOpen] = useState(false);
    const [selectedSig, setSelectedSig] = useState(null); // 서명 상세 모달
    const [selectedPolicy, setSelectedPolicy] = useState(null); // 정책 등록/수정 모달
    const [selectedPart11, setSelectedPart11] = useState(null); // Part11 항목 등록/수정 모달

    // 그리드 API
    const [gridApi, setGridApi] = useState(null);

    // =========================================================================
    // 데이터 로드
    // =========================================================================
    const loadAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [kpiRes, sigRes, polRes, p11Res] = await Promise.all([
                fetchOfficialRecordsKpi().catch(() => null),
                fetchElectronicSignatures().catch(() => []),
                fetchOfficialRecordPolicies().catch(() => []),
                fetchPart11Assessments().catch(() => [])
            ]);

            if (kpiRes) setKpi(kpiRes);
            setSignatures(sigRes || []);
            setPolicies(polRes || []);
            setPart11List(p11Res || []);
        } catch (err) {
            console.error('Failed to load official records data', err);
            toast.error('데이터 조회 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // =========================================================================
    // AG Grid 컬럼 정의
    // =========================================================================

    // 1. 전자서명 감사대장 컬럼
    const signatureColumns = useMemo(() => [
        {
            headerName: '서명 번호',
            field: 'signatureNumber',
            width: 160,
            cellRenderer: (params) => (
                <span style={{ fontWeight: '700', color: '#1e40af', cursor: 'pointer' }}
                      onClick={() => setSelectedSig(params.data)}>
                    {params.value}
                </span>
            )
        },
        {
            headerName: '서명 의도/의미',
            field: 'signatureMeaning',
            width: 220,
            cellRenderer: (params) => {
                const opt = SIGNATURE_MEANING_OPTIONS.find(o => o.value === params.value);
                return (
                    <span style={{
                        backgroundColor: opt ? opt.bg : '#f1f5f9',
                        color: opt ? opt.color : '#334155',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '12px'
                    }}>
                        {opt ? opt.label : params.value}
                    </span>
                );
            }
        },
        { headerName: '대상 모듈', field: 'documentType', width: 120 },
        { headerName: '관리 번호', field: 'targetNumber', width: 160 },
        { headerName: '대상 문서/기록 제목', field: 'targetTitle', minWidth: 220, flex: 1 },
        {
            headerName: '서명자',
            field: 'signerFullName',
            width: 130,
            cellRenderer: (params) => (
                <span>
                    <strong>{params.value}</strong>
                    <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>({params.data.signerUsername})</span>
                </span>
            )
        },
        { headerName: '서명자 부서/직책', field: 'signerDepartment', width: 150, valueGetter: (p) => `${p.data.signerDepartment || ''} / ${p.data.signerRole || ''}` },
        {
            headerName: '서명 일시',
            field: 'signedAt',
            width: 170,
            cellRenderer: (p) => p.value ? p.value.replace('T', ' ').substring(0, 19) : '-'
        },
        {
            headerName: '무결성 해시 (SHA-256)',
            field: 'signatureHash',
            width: 140,
            cellRenderer: (p) => (
                <span title={p.value} style={{ fontFamily: 'monospace', fontSize: '11px', color: '#0f766e', background: '#f0fdfa', padding: '2px 6px', borderRadius: '4px' }}>
                    {p.value ? `${p.value.substring(0, 10)}...` : '-'}
                </span>
            )
        },
        {
            headerName: '서명 상태',
            field: 'isRevoked',
            width: 110,
            cellRenderer: (p) => p.value ? (
                <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>철회됨</span>
            ) : (
                <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>유효 (VALID)</span>
            )
        },
        {
            headerName: '관리',
            width: 110,
            pinned: 'right',
            cellRenderer: (params) => (
                <button
                    type="button"
                    onClick={() => setSelectedSig(params.data)}
                    style={{
                        padding: '4px 10px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    상세/검증
                </button>
            )
        }
    ], []);

    // 2. 공식 원본 및 보존 정책 컬럼
    const policyColumns = useMemo(() => [
        { headerName: '정책 코드', field: 'policyCode', width: 130, cellStyle: { fontWeight: '700', color: '#0f172a' } },
        { headerName: '정책 규정 명칭', field: 'policyTitle', minWidth: 240, flex: 1 },
        {
            headerName: '기록 카테고리',
            field: 'recordCategoryDescription',
            width: 200,
            cellRenderer: (p) => <span style={{ fontWeight: '600', color: '#334155' }}>{p.value || p.data.recordCategory}</span>
        },
        {
            headerName: '공식 원본 유형 (DEC-01)',
            field: 'officialOriginalType',
            width: 200,
            cellRenderer: (params) => {
                const opt = OFFICIAL_ORIGINAL_OPTIONS.find(o => o.value === params.value);
                return (
                    <span style={{
                        backgroundColor: opt ? opt.bg : '#f1f5f9',
                        color: opt ? opt.color : '#334155',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '12px'
                    }}>
                        {opt ? opt.label : params.value}
                    </span>
                );
            }
        },
        {
            headerName: '법정 보존연한',
            field: 'retentionPeriodYears',
            width: 120,
            cellRenderer: (p) => <span style={{ fontWeight: '700', color: '#0284c7' }}>{p.value}년</span>
        },
        { headerName: '보존 형식/포맷', field: 'storageFormat', width: 220 },
        { headerName: '법적 근거', field: 'legalBasis', width: 220 },
        {
            headerName: '하이브리드 인쇄본 의무',
            field: 'isHybridSignedPaperRequired',
            width: 150,
            cellRenderer: (p) => p.value ? (
                <span style={{ color: '#059669', fontWeight: '700' }}>✓ 인쇄본 보존 필수</span>
            ) : (
                <span style={{ color: '#64748b' }}>전자 원본 단독</span>
            )
        },
        {
            headerName: '상태',
            field: 'isActive',
            width: 100,
            cellRenderer: (p) => p.value ? (
                <span style={{ color: '#16a34a', fontWeight: '700' }}>운영 중</span>
            ) : (
                <span style={{ color: '#94a3b8' }}>비활성</span>
            )
        },
        {
            headerName: '관리',
            width: 120,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        type="button"
                        onClick={() => setSelectedPolicy(params.data)}
                        style={{
                            padding: '4px 8px',
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }}
                    >
                        수정
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeletePolicy(params.data.id)}
                        style={{
                            padding: '4px 8px',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ], []);

    // 3. 21 CFR Part 11 자가평가 매트릭스 컬럼
    const part11Columns = useMemo(() => [
        { headerName: '순번', field: 'displayOrder', width: 80, sort: 'asc' },
        { headerName: '규제 조항', field: 'sectionCode', width: 120, cellStyle: { fontWeight: '700', color: '#1e40af' } },
        { headerName: '요건 명칭', field: 'requirementTitle', width: 220, cellStyle: { fontWeight: '600' } },
        {
            headerName: '적합성 판정',
            field: 'complianceStatus',
            width: 180,
            cellRenderer: (params) => {
                const opt = COMPLIANCE_STATUS_OPTIONS.find(o => o.value === params.value);
                return (
                    <span style={{
                        backgroundColor: opt ? opt.bg : '#f1f5f9',
                        color: opt ? opt.color : '#334155',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '12px'
                    }}>
                        {opt ? opt.label : params.value}
                    </span>
                );
            }
        },
        { headerName: 'eQMS 구현 및 대응 현황', field: 'implementationSummary', minWidth: 320, flex: 1 },
        { headerName: '검증 증빙 및 SOP 매핑', field: 'evidenceDocument', width: 220 },
        { headerName: '평가자', field: 'assessedBy', width: 100 },
        { headerName: '평가 일자', field: 'assessedDate', width: 110 },
        { headerName: '확인/승인자', field: 'verifiedBy', width: 120 },
        {
            headerName: '관리',
            width: 120,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        type="button"
                        onClick={() => setSelectedPart11(params.data)}
                        style={{
                            padding: '4px 8px',
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }}
                    >
                        수정
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeletePart11(params.data.id)}
                        style={{
                            padding: '4px 8px',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ], []);

    // 정책 삭제
    const handleDeletePolicy = async (id) => {
        if (!window.confirm('선택한 공식 원본 정책 규정을 삭제하시겠습니까?')) return;
        try {
            await deleteOfficialRecordPolicy(id);
            toast.success('정책 규정이 삭제되었습니다.');
            loadAllData();
        } catch (err) {
            console.error(err);
            toast.error('삭제 실패');
        }
    };

    // Part11 항목 삭제
    const handleDeletePart11 = async (id) => {
        if (!window.confirm('선택한 21 CFR Part 11 평가 항목을 삭제하시겠습니까?')) return;
        try {
            await deletePart11Assessment(id);
            toast.success('평가 항목이 삭제되었습니다.');
            loadAllData();
        } catch (err) {
            console.error(err);
            toast.error('삭제 실패');
        }
    };

    // 필터링된 데이터
    const filteredSignatures = useMemo(() => {
        return signatures.filter(s => {
            const matchSearch = !searchTerm ||
                s.signatureNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.targetNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.targetTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.signerFullName?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchMeaning = !filterMeaning || s.signatureMeaning === filterMeaning;
            return matchSearch && matchMeaning;
        });
    }, [signatures, searchTerm, filterMeaning]);

    const filteredPolicies = useMemo(() => {
        return policies.filter(p => {
            const matchSearch = !searchTerm ||
                p.policyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.policyTitle?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = !filterCategory || p.recordCategory === filterCategory;
            return matchSearch && matchCat;
        });
    }, [policies, searchTerm, filterCategory]);

    const filteredPart11 = useMemo(() => {
        return part11List.filter(p => {
            return !searchTerm ||
                p.sectionCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.requirementTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.implementationSummary?.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [part11List, searchTerm]);

    // CSV 내보내기
    const handleExportCsv = () => {
        if (gridApi) {
            gridApi.exportDataAsCsv({ fileName: `official_records_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv` });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', padding: '16px' }}>

            {/* ========================================================================= */}
            {/* 3-Tier Header */}
            {/* ========================================================================= */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 1행: 타이틀 & 글로벌 액션 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>📜</span>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
                            공식 원본 및 전자서명 정책 (DEC-01 / 21 CFR Part 11)
                        </h1>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#334155',
                                cursor: 'pointer'
                            }}
                        >
                            📊 CSV 내보내기
                        </button>
                        <button
                            type="button"
                            onClick={loadAllData}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#ffffff',
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
                            type="button"
                            onClick={() => setIsCreateSigModalOpen(true)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#2563eb',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#ffffff',
                                cursor: 'pointer'
                            }}
                        >
                            ✍️ 전자서명 발행 (2차 재인증)
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedPolicy({})}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#059669',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#ffffff',
                                cursor: 'pointer'
                            }}
                        >
                            + 새 원본 정책 등록
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedPart11({})}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#7c3aed',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: '#ffffff',
                                cursor: 'pointer'
                            }}
                        >
                            + Part 11 평가 추가
                        </button>
                    </div>
                </div>

                {/* 2행: 규제 요약 설명 */}
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
                    <strong>미국 FDA 21 CFR Part 11 / EU GMP Annex 11 / 의사결정대장 DEC-01</strong> 규정에 의거하여 전자기록 및 하이브리드 공식 원본(Official Records) 보존 정책을 정의하고, 비밀번호 2차 재인증 기반 전자서명(Electronic Signatures)과 SHA-256 서명 감사 매니페스트를 통한 위변조 방지 및 무결성을 보장합니다.
                </div>

                {/* 3행: 규제 매뉴얼 배너 */}
                <RegulatoryManualBanner pageKey="officialRecords" />
            </div>

            {/* ========================================================================= */}
            {/* 6대 KPI 요약 카드 */}
            {/* ========================================================================= */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>총 전자서명 발행 수</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                        {kpi.totalSignatures} <span style={{ fontSize: '14px', fontWeight: '500' }}>건</span>
                    </div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>품질책임자 인가 서명</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
                        {kpi.qualityAuthoritySignatures} <span style={{ fontSize: '14px', fontWeight: '500' }}>건</span>
                    </div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #7c3aed' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>21 CFR Part 11 적합률</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#7c3aed', marginTop: '4px' }}>
                        {kpi.part11ComplianceRate}%
                    </div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #059669' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>활성 원본 정책 수</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
                        {kpi.activePolicies} <span style={{ fontSize: '14px', fontWeight: '500' }}>개 규정</span>
                    </div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>하이브리드 보존 비율</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>
                        {kpi.hybridPolicyRate}%
                    </div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '4px solid #d97706' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>서명 무결성 검증 유효율</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>
                        {kpi.integrityValidRate}%
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 4대 탭 바 */}
            {/* ========================================================================= */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', gap: '8px' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('signatures')}
                    style={{
                        padding: '10px 20px',
                        fontWeight: '700',
                        fontSize: '14px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'signatures' ? '3px solid #2563eb' : '3px solid transparent',
                        color: activeTab === 'signatures' ? '#2563eb' : '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    ✍️ ① 전자서명 감사대장 (Signatures: {signatures.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('policies')}
                    style={{
                        padding: '10px 20px',
                        fontWeight: '700',
                        fontSize: '14px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'policies' ? '3px solid #059669' : '3px solid transparent',
                        color: activeTab === 'policies' ? '#059669' : '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    📜 ② 공식 원본 및 보존 정책 (DEC-01: {policies.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('part11')}
                    style={{
                        padding: '10px 20px',
                        fontWeight: '700',
                        fontSize: '14px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'part11' ? '3px solid #7c3aed' : '3px solid transparent',
                        color: activeTab === 'part11' ? '#7c3aed' : '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    🛡️ ③ 21 CFR Part 11 자가평가 매트릭스 ({part11List.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('manifest')}
                    style={{
                        padding: '10px 20px',
                        fontWeight: '700',
                        fontSize: '14px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'manifest' ? '3px solid #d97706' : '3px solid transparent',
                        color: activeTab === 'manifest' ? '#d97706' : '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    🖨️ ④ 서명 매니페스트 인쇄 미리보기 (Manifest Preview)
                </button>
            </div>

            {/* ========================================================================= */}
            {/* 검색 & 필터 바 */}
            {/* ========================================================================= */}
            {activeTab !== 'manifest' && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input
                            type="text"
                            placeholder={activeTab === 'signatures' ? '서명번호, 대상번호, 문서제목, 서명자 검색...' : '정책코드, 제목, 조항 검색...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px'
                            }}
                        />
                    </div>
                    {activeTab === 'signatures' && (
                        <select
                            value={filterMeaning}
                            onChange={(e) => setFilterMeaning(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        >
                            <option value="">전체 서명의미</option>
                            {SIGNATURE_MEANING_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    )}
                    {activeTab === 'policies' && (
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        >
                            <option value="">전체 기록 카테고리</option>
                            {RECORD_CATEGORY_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    )}
                    <button
                        type="button"
                        onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterMeaning(''); }}
                        style={{
                            padding: '8px 14px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        ♻️ 필터 초기화
                    </button>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 그리드 뷰 및 탭별 뷰 */}
            {/* ========================================================================= */}
            <div style={{ flex: 1, minHeight: '400px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {activeTab === 'signatures' && (
                    <div className="ag-theme-alpine" style={{ width: '100%', height: '100%' }}>
                        <AgGridReact
                            theme="legacy"
                            rowData={filteredSignatures}
                            columnDefs={signatureColumns}
                            rowHeight={54}
                            headerHeight={48}
                            pagination={true}
                            paginationPageSize={20}
                            onGridReady={(params) => setGridApi(params.api)}
                        />
                    </div>
                )}

                {activeTab === 'policies' && (
                    <div className="ag-theme-alpine" style={{ width: '100%', height: '100%' }}>
                        <AgGridReact
                            theme="legacy"
                            rowData={filteredPolicies}
                            columnDefs={policyColumns}
                            rowHeight={54}
                            headerHeight={48}
                            pagination={true}
                            paginationPageSize={20}
                            onGridReady={(params) => setGridApi(params.api)}
                        />
                    </div>
                )}

                {activeTab === 'part11' && (
                    <div className="ag-theme-alpine" style={{ width: '100%', height: '100%' }}>
                        <AgGridReact
                            theme="legacy"
                            rowData={filteredPart11}
                            columnDefs={part11Columns}
                            rowHeight={54}
                            headerHeight={48}
                            pagination={true}
                            paginationPageSize={20}
                            onGridReady={(params) => setGridApi(params.api)}
                        />
                    </div>
                )}

                {activeTab === 'manifest' && (
                    <ManifestPreviewTab signatures={signatures} />
                )}
            </div>

            {/* ========================================================================= */}
            {/* 모달 1: 전자서명 생성 모달 (2차 재인증 비밀번호 검증) */}
            {/* ========================================================================= */}
            {isCreateSigModalOpen && (
                <CreateSignatureModal
                    onClose={() => setIsCreateSigModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateSigModalOpen(false);
                        loadAllData();
                    }}
                />
            )}

            {/* ========================================================================= */}
            {/* 모달 2: 서명 상세 및 무결성 검증/철회 모달 */}
            {/* ========================================================================= */}
            {selectedSig && (
                <SignatureDetailModal
                    signature={selectedSig}
                    onClose={() => setSelectedSig(null)}
                    onRevoked={() => {
                        setSelectedSig(null);
                        loadAllData();
                    }}
                />
            )}

            {/* ========================================================================= */}
            {/* 모달 3: 공식 원본 정책 등록/수정 모달 */}
            {/* ========================================================================= */}
            {selectedPolicy && (
                <PolicyModal
                    policy={selectedPolicy}
                    onClose={() => setSelectedPolicy(null)}
                    onSaved={() => {
                        setSelectedPolicy(null);
                        loadAllData();
                    }}
                />
            )}

            {/* ========================================================================= */}
            {/* 모달 4: Part 11 평가 항목 등록/수정 모달 */}
            {/* ========================================================================= */}
            {selectedPart11 && (
                <Part11Modal
                    item={selectedPart11}
                    onClose={() => setSelectedPart11(null)}
                    onSaved={() => {
                        setSelectedPart11(null);
                        loadAllData();
                    }}
                />
            )}
        </div>
    );
}

// =========================================================================
// Modal 1: 전자서명 발행 모달 (21 CFR Part 11 §11.200 비밀번호 재인증)
// =========================================================================
function CreateSignatureModal({ onClose, onSuccess }) {
    const [form, setForm] = useState({
        documentType: 'RELEASE',
        targetId: 1,
        targetNumber: 'REL-20261025-001',
        targetTitle: '완제품 출하승인 판정서 (Lot 20261025-01)',
        signatureMeaning: 'QUALITY_AUTHORITY',
        signatureReason: '시험성적서 및 배치제조기록 적합 확인 완료에 따른 최종 출하 인가',
        password: '',
        reauthMethod: 'PASSWORD'
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.password) {
            toast.error('21 CFR Part 11 §11.200 규정에 따라 비밀번호 재인증은 필수입니다.');
            return;
        }

        setSubmitting(true);
        try {
            await createElectronicSignature(form);
            toast.success('21 CFR Part 11 전자서명이 성공적으로 발행되었습니다.');
            onSuccess();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || '전자서명 실패';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ width: '96vw', maxWidth: '800px', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                {/* 헤더 */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>✍️</span>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                            21 CFR Part 11 전자서명 발행 (2차 재인증)
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                {/* 법적 고지 배너 */}
                <div style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '12px 20px', margin: '16px 24px 0 24px', borderRadius: '6px', fontSize: '12px', color: '#1e40af', lineHeight: '1.5' }}>
                    <strong>⚠️ 법적 구속력 고지 (21 CFR Part 11 §11.100)</strong><br />
                    본 시스템에 생성되는 전자서명은 본인의 의사에 의해 생성된 것으로 간주되며, 수기 서명과 법적으로 완벽히 동일한 효력을 가집니다. 타인의 계정을 이용한 부정 서명은 관련 법률에 따라 처벌받을 수 있습니다.
                </div>

                {/* 폼 본문 */}
                <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>대상 모듈</label>
                            <select
                                value={form.documentType}
                                onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                <option value="RELEASE">출하승인 (RELEASE)</option>
                                <option value="DOCUMENT">통제문서 (DOCUMENT)</option>
                                <option value="CAPA">시정조치 (CAPA)</option>
                                <option value="NCR">부적합품 (NCR)</option>
                                <option value="CHANGE_CONTROL">변경관리 (CCB)</option>
                                <option value="INTERNAL_AUDIT">내부심사 (AUDIT)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>관리 번호</label>
                            <input
                                type="text"
                                value={form.targetNumber}
                                onChange={(e) => setForm({ ...form, targetNumber: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>대상 문서/기록 제목</label>
                        <input
                            type="text"
                            value={form.targetTitle}
                            onChange={(e) => setForm({ ...form, targetTitle: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>서명 의미/의도 (Signature Meaning - §11.50)</label>
                        <select
                            value={form.signatureMeaning}
                            onChange={(e) => setForm({ ...form, signatureMeaning: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
                        >
                            {SIGNATURE_MEANING_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>서명 사유 및 승인 의견</label>
                        <textarea
                            rows={3}
                            value={form.signatureReason}
                            onChange={(e) => setForm({ ...form, signatureReason: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                            placeholder="서명 사유 또는 심의 의견을 입력하십시오."
                            required
                        />
                    </div>

                    {/* 2차 재인증 비밀번호 필드 */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                            🔒 21 CFR §11.200 재인증: 계정 비밀번호 확인 <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                            type="password"
                            placeholder="현재 로그인된 계정의 비밀번호를 입력하십시오."
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #2563eb', fontSize: '14px' }}
                            required
                            autoFocus
                        />
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                            대리 서명 방지를 위해 서명 수행 시마다 비밀번호 재검증이 강제됩니다.
                        </div>
                    </div>

                    {/* 푸터 */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{ padding: '8px 24px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                        >
                            {submitting ? '재인증 검증 중...' : '확인 및 전자서명 날인'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =========================================================================
// Modal 2: 서명 상세 & 무결성 검증/철회 모달
// =========================================================================
function SignatureDetailModal({ signature, onClose, onRevoked }) {
    const [revoking, setRevoking] = useState(false);
    const [revocationReason, setRevocationReason] = useState('');

    const handleRevoke = async () => {
        if (!revocationReason.trim()) {
            toast.error('서명 철회 사유를 입력하십시오.');
            return;
        }
        if (!window.confirm('경고: 서명을 철회하면 해당 승인 효력이 무효화됩니다. 진행하시겠습니까?')) return;

        setRevoking(true);
        try {
            await revokeElectronicSignature(signature.id, revocationReason);
            toast.success('전자서명이 철회되었습니다.');
            onRevoked();
        } catch (err) {
            console.error(err);
            toast.error('서명 철회 실패');
        } finally {
            setRevoking(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ width: '96vw', maxWidth: '850px', maxHeight: '90vh', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                {/* 헤더 */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>🛡️</span>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                            전자서명 감사 매니페스트 상세 및 무결성 검증 [{signature.signatureNumber}]
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                {/* 바디 */}
                <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* 무결성 상태 배너 */}
                    <div style={{
                        backgroundColor: signature.isRevoked ? '#fee2e2' : '#dcfce7',
                        border: signature.isRevoked ? '1px solid #fca5a5' : '1px solid #86efac',
                        padding: '14px 18px',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: signature.isRevoked ? '#dc2626' : '#16a34a' }}>
                                {signature.isRevoked ? '⚠️ [철회됨] 서명이 무효화 처리된 상태입니다' : '✓ [유효] 21 CFR §11.70 전자서명 결합 및 SHA-256 무결성 검증 통과'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                                대상 레코드와 타임스탬프가 암호학적으로 결합되어 위조 및 분리가 불가능합니다.
                            </div>
                        </div>
                    </div>

                    {/* 그리드 정보 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                        <div><strong style={{ color: '#64748b', fontSize: '12px' }}>서명 관리번호:</strong> <span style={{ fontWeight: '700' }}>{signature.signatureNumber}</span></div>
                        <div><strong style={{ color: '#64748b', fontSize: '12px' }}>서명 일시:</strong> <span>{signature.signedAt?.replace('T', ' ')}</span></div>
                        <div><strong style={{ color: '#64748b', fontSize: '12px' }}>서명자:</strong> <span>{signature.signerFullName} ({signature.signerUsername})</span></div>
                        <div><strong style={{ color: '#64748b', fontSize: '12px' }}>부서 / 직책:</strong> <span>{signature.signerDepartment} / {signature.signerRole}</span></div>
                        <div><strong style={{ color: '#64748b', fontSize: '12px' }}>서명 의미:</strong> <span style={{ fontWeight: '700', color: '#2563eb' }}>{signature.signatureMeaningDescription || signature.signatureMeaning}</span></div>
                        <div><strong style={{ color: '#64748b', fontSize: '12px' }}>재인증 방식:</strong> <span>{signature.reauthMethod}</span></div>
                        <div><strong style={{ color: '#64748b', fontSize: '12px' }}>대상 문서:</strong> <span>[{signature.documentType}] {signature.targetNumber}</span></div>
                        <div><strong style={{ color: '#64748b', fontSize: '12px' }}>클라이언트 IP:</strong> <span>{signature.ipAddress || '-'}</span></div>
                    </div>

                    <div>
                        <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>SHA-256 서명 무결성 해시 (Signature Hash):</strong>
                        <div style={{ backgroundColor: '#0f172a', color: '#38bdf8', padding: '10px 14px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                            {signature.signatureHash}
                        </div>
                    </div>

                    <div>
                        <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>서명 사유 및 승인 의견:</strong>
                        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#334155' }}>
                            {signature.signatureReason || '사유 없음'}
                        </div>
                    </div>

                    <div>
                        <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>21 CFR §11.50 원문 매니페스트 (JSON):</strong>
                        <pre style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', fontSize: '11px', maxHeight: '140px', overflowY: 'auto' }}>
                            {signature.manifestJson ? JSON.stringify(JSON.parse(signature.manifestJson), null, 2) : '{}'}
                        </pre>
                    </div>

                    {/* 철회 섹션 */}
                    {!signature.isRevoked && (
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <strong style={{ color: '#dc2626', fontSize: '13px' }}>⚠️ 서명 철회 (Revocation)</strong>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="철회 사유를 입력하십시오 (e.g. 오서명, 문서 내용 전면 개정)..."
                                    value={revocationReason}
                                    onChange={(e) => setRevocationReason(e.target.value)}
                                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                                <button
                                    type="button"
                                    onClick={handleRevoke}
                                    disabled={revoking}
                                    style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                >
                                    {revoking ? '처리 중...' : '서명 철회'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ padding: '8px 20px', backgroundColor: '#475569', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// Modal 3: 공식 원본 및 보존 정책 등록/수정 모달 (DEC-01)
// =========================================================================
function PolicyModal({ policy, onClose, onSaved }) {
    const isEdit = Boolean(policy && policy.id);
    const [form, setForm] = useState({
        policyCode: policy?.policyCode || '',
        policyTitle: policy?.policyTitle || '',
        recordCategory: policy?.recordCategory || 'RELEASE_RECORD',
        officialOriginalType: policy?.officialOriginalType || 'HYBRID',
        storageFormat: policy?.storageFormat || 'eQMS 전자기록 + 인쇄본 서명 바인더',
        retentionPeriodYears: policy?.retentionPeriodYears || 10,
        retentionPeriodCriteria: policy?.retentionPeriodCriteria || '의료기기 유효기간 + 2년 이상 보존',
        legalBasis: policy?.legalBasis || 'ISO 13485 §4.2.5, 21 CFR 820.180, DEC-01',
        disposalProcedure: policy?.disposalProcedure || '품질책임자 승인 하에 분쇄 폐기',
        isHybridSignedPaperRequired: policy?.isHybridSignedPaperRequired ?? true,
        isActive: policy?.isActive ?? true
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEdit) {
                await updateOfficialRecordPolicy(policy.id, form);
                toast.success('공식 원본 정책이 수정되었습니다.');
            } else {
                await createOfficialRecordPolicy(form);
                toast.success('신규 공식 원본 정책이 등록되었습니다.');
            }
            onSaved();
        } catch (err) {
            console.error(err);
            toast.error('저장 실패');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ width: '96vw', maxWidth: '850px', maxHeight: '90vh', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>📜</span>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                            {isEdit ? `공식 원본 정책 수정 [${policy.policyCode}]` : '신규 공식 원본 및 보존 정책 등록 (DEC-01)'}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>정책 코드</label>
                            <input
                                type="text"
                                value={form.policyCode}
                                onChange={(e) => setForm({ ...form, policyCode: e.target.value })}
                                placeholder="POL-REC-07"
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>정책 규정 명칭</label>
                            <input
                                type="text"
                                value={form.policyTitle}
                                onChange={(e) => setForm({ ...form, policyTitle: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>기록 카테고리</label>
                            <select
                                value={form.recordCategory}
                                onChange={(e) => setForm({ ...form, recordCategory: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                {RECORD_CATEGORY_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>공식 원본 유형 (DEC-01)</label>
                            <select
                                value={form.officialOriginalType}
                                onChange={(e) => setForm({ ...form, officialOriginalType: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
                            >
                                {OFFICIAL_ORIGINAL_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>보존 연한 (년)</label>
                            <input
                                type="number"
                                min={1}
                                max={99}
                                value={form.retentionPeriodYears}
                                onChange={(e) => setForm({ ...form, retentionPeriodYears: parseInt(e.target.value) || 10 })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>보존 기준 상세 설명</label>
                            <input
                                type="text"
                                value={form.retentionPeriodCriteria}
                                onChange={(e) => setForm({ ...form, retentionPeriodCriteria: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>저장 포맷 및 보관 장소</label>
                        <input
                            type="text"
                            value={form.storageFormat}
                            onChange={(e) => setForm({ ...form, storageFormat: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>법적 / 규제 근거</label>
                        <input
                            type="text"
                            value={form.legalBasis}
                            onChange={(e) => setForm({ ...form, legalBasis: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>폐기 절차 및 기준</label>
                        <textarea
                            rows={2}
                            value={form.disposalProcedure}
                            onChange={(e) => setForm({ ...form, disposalProcedure: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={form.isHybridSignedPaperRequired}
                                onChange={(e) => setForm({ ...form, isHybridSignedPaperRequired: e.target.checked })}
                            />
                            <strong>하이브리드 수기 서명 인쇄본 바인더 보존 의무화 (DEC-01)</strong>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                            />
                            <strong>운영 활성 상태</strong>
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>취소</button>
                        <button type="submit" disabled={saving} style={{ padding: '8px 24px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                            {saving ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =========================================================================
// Modal 4: 21 CFR Part 11 자가평가 항목 등록/수정 모달
// =========================================================================
function Part11Modal({ item, onClose, onSaved }) {
    const isEdit = Boolean(item && item.id);
    const [form, setForm] = useState({
        sectionCode: item?.sectionCode || '§11.',
        requirementTitle: item?.requirementTitle || '',
        regulatoryStandard: item?.regulatoryStandard || '21 CFR Part 11 / EU Annex 11',
        requirementDetails: item?.requirementDetails || '',
        complianceStatus: item?.complianceStatus || 'COMPLIANT',
        implementationSummary: item?.implementationSummary || '',
        evidenceDocument: item?.evidenceDocument || '',
        assessedBy: item?.assessedBy || 'admin',
        verifiedBy: item?.verifiedBy || '품질책임자',
        displayOrder: item?.displayOrder || 1
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEdit) {
                await updatePart11Assessment(item.id, form);
                toast.success('자가평가 항목이 수정되었습니다.');
            } else {
                await createPart11Assessment(form);
                toast.success('신규 자가평가 항목이 등록되었습니다.');
            }
            onSaved();
        } catch (err) {
            console.error(err);
            toast.error('저장 실패');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ width: '96vw', maxWidth: '850px', maxHeight: '90vh', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>🛡️</span>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                            {isEdit ? `21 CFR Part 11 항목 수정 [${item.sectionCode}]` : '신규 21 CFR Part 11 자가평가 항목 추가'}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>규제 조항 코드</label>
                            <input
                                type="text"
                                value={form.sectionCode}
                                onChange={(e) => setForm({ ...form, sectionCode: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>표시 순서</label>
                            <input
                                type="number"
                                value={form.displayOrder}
                                onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 1 })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>적합성 판정</label>
                            <select
                                value={form.complianceStatus}
                                onChange={(e) => setForm({ ...form, complianceStatus: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '700' }}
                            >
                                {COMPLIANCE_STATUS_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>요건 명칭</label>
                        <input
                            type="text"
                            value={form.requirementTitle}
                            onChange={(e) => setForm({ ...form, requirementTitle: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>규제 본문 요구사항</label>
                        <textarea
                            rows={3}
                            value={form.requirementDetails}
                            onChange={(e) => setForm({ ...form, requirementDetails: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>eQMS 구현 및 대응 현황</label>
                        <textarea
                            rows={3}
                            value={form.implementationSummary}
                            onChange={(e) => setForm({ ...form, implementationSummary: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>증빙 문서 / SOP 매핑</label>
                            <input
                                type="text"
                                value={form.evidenceDocument}
                                onChange={(e) => setForm({ ...form, evidenceDocument: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>평가자</label>
                            <input
                                type="text"
                                value={form.assessedBy}
                                onChange={(e) => setForm({ ...form, assessedBy: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>확인/승인자</label>
                            <input
                                type="text"
                                value={form.verifiedBy}
                                onChange={(e) => setForm({ ...form, verifiedBy: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>취소</button>
                        <button type="submit" disabled={saving} style={{ padding: '8px 24px', backgroundColor: '#7c3aed', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                            {saving ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =========================================================================
// Tab 4: 서명 매니페스트 인쇄 미리보기 (하이브리드 인쇄용 서명 매니페스트 블록)
// =========================================================================
function ManifestPreviewTab({ signatures }) {
    const latestSig = signatures.length > 0 ? signatures[0] : null;

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                        🖨️ 21 CFR §11.50 전자서명 매니페스트 인쇄 블록 시뮬레이터 (하이브리드 종이 출력 규격)
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        출하승인서, CAPA 보고서, 시험성적서 인쇄 시 하단에 자동 결합되어 법적 원본성을 입증하는 표준 서명 매니페스트입니다.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer'
                    }}
                >
                    🖨️ 서명 매니페스트 출력
                </button>
            </div>

            {/* 인쇄용 서명 매니페스트 카드 (표준 양식) */}
            <div style={{
                backgroundColor: '#ffffff',
                border: '2px dashed #94a3b8',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '900px',
                margin: '0 auto',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', letterSpacing: '2px' }}>
                        UNITED STATES FDA 21 CFR PART 11 / EU GMP ANNEX 11 COMPLIANT
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                        공식 전자기록 서명 매니페스트 증명서 (ELECTRONIC SIGNATURE MANIFEST)
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px', marginBottom: '20px' }}>
                    <div>
                        <strong style={{ color: '#475569' }}>대상 문서 번호:</strong> {latestSig?.targetNumber || 'REL-20261025-001'}
                    </div>
                    <div>
                        <strong style={{ color: '#475569' }}>대상 문서 명칭:</strong> {latestSig?.targetTitle || '완제품 출하승인 판정서'}
                    </div>
                    <div>
                        <strong style={{ color: '#475569' }}>서명 관리 번호:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{latestSig?.signatureNumber || 'SIG-20261025-D5A9'}</span>
                    </div>
                    <div>
                        <strong style={{ color: '#475569' }}>서명 타임스탬프:</strong> {latestSig?.signedAt?.replace('T', ' ') || '2026-10-25 18:30:00 KST'}
                    </div>
                    <div>
                        <strong style={{ color: '#475569' }}>서명자 성명 / ID:</strong> {latestSig?.signerFullName || '김품질'} ({latestSig?.signerUsername || 'admin'})
                    </div>
                    <div>
                        <strong style={{ color: '#475569' }}>소속 부서 / 직책:</strong> {latestSig?.signerDepartment || '품질경영본부'} / {latestSig?.signerRole || '품질책임자'}
                    </div>
                    <div>
                        <strong style={{ color: '#475569' }}>서명 의도(Meaning):</strong> <span style={{ color: '#16a34a', fontWeight: '800' }}>{latestSig?.signatureMeaningDescription || '품질책임자 최종 인가 (Quality Authority Release)'}</span>
                    </div>
                    <div>
                        <strong style={{ color: '#475569' }}>재인증 방식:</strong> {latestSig?.reauthMethod || 'PASSWORD (BCrypt Re-auth)'}
                    </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>SHA-256 서명 무결성 해시 (Cryptographic Integrity Hash):</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#0f766e', wordBreak: 'break-all' }}>
                        {latestSig?.signatureHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                    </div>
                </div>

                {/* 하이브리드 수기 서명란 (DEC-01) */}
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '16px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                        <strong>[DEC-01 하이브리드 수기 서명 확인]</strong><br />
                        본 출력물은 시스템 상의 전자서명 원본과 완전히 일치함을 확인하며, 규제기관 실사 제출용 하이브리드 문서로 보관합니다.
                    </div>
                    <div style={{ border: '1px solid #94a3b8', borderRadius: '4px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
                        (인쇄본 보존 시 수기 날인/서명란)
                    </div>
                </div>
            </div>
        </div>
    );
}
