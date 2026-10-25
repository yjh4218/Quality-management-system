import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    fetchMedicalDevices, 
    fetchMedicalDeviceMetrics, 
    createMedicalDevice, 
    updateMedicalDevice, 
    deleteMedicalDevice, 
    checkMedicalDeviceDuplicate 
} from './api';
import { usePermissions } from './usePermissions';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import { toast } from 'react-toastify';

/**
 * 🩺 의료기기 품목 마스터 및 UDI 관리 가이드 페이지 (MedicalDeviceManagementPage)
 * - ISO 13485:2016 §7.3 & 의료기기법 제6조, 제31조의2 준수
 * - UDI(고유식별코드: UDI-DI / UDI-PI) 식별·추적성 관리 및 통합정보시스템(IMDS) 연계 지침
 * - DEC-03: 의료기기 전용 품목 마스터 분리
 * - DEC-09: 기존 화장품 Product와 독립 보존 및 Audit Trail(소프트 삭제) 보장
 * - DEC-10: 규제 표준 매뉴얼 배너 및 전사 QMS UI/UX 표준 가이드 완전 준수
 */

const CLASSIFICATION_OPTIONS = [
    { value: '', label: '전체 등급' },
    { value: 'CLASS_I', label: '1등급 (신고)', badgeColor: '#0284c7', bg: '#e0f2fe', desc: '잠재적 위해성이 거의 없는 기기' },
    { value: 'CLASS_II', label: '2등급 (인증)', badgeColor: '#16a34a', bg: '#dcfce7', desc: '잠재적 위해성이 낮은 기기' },
    { value: 'CLASS_III', label: '3등급 (허가)', badgeColor: '#d97706', bg: '#fef3c7', desc: '중증도의 잠재적 위해성을 가진 기기' },
    { value: 'CLASS_IV', label: '4등급 (고위험 허가)', badgeColor: '#dc2626', bg: '#fee2e2', desc: '고도의 위해성을 가진 기기 (인체삽입 등)' }
];

const STERILIZATION_METHODS = [
    { value: 'NONE', label: '비멸균 (None)' },
    { value: 'EO_GAS', label: 'EO 가스 멸균 (Ethylene Oxide)' },
    { value: 'STEAM', label: '고압증기 멸균 (Steam/Autoclave)' },
    { value: 'GAMMA', label: '감마선 멸균 (Gamma Irradiation)' },
    { value: 'RADIATION', label: '방사선 멸균 (E-Beam/Radiation)' }
];

const UDI_PI_OPTIONS = [
    { value: 'LOT,EXPIRY', label: 'LOT번호 + 사용기한 (기본 포장 규격)' },
    { value: 'LOT,EXPIRY,SERIAL', label: 'LOT번호 + 사용기한 + 일련번호 (추적 관리)' },
    { value: 'SERIAL,EXPIRY', label: '일련번호 + 사용기한 (고위험/전자기기)' },
    { value: 'LOT,MFG_DATE', label: 'LOT번호 + 제조연월일' },
    { value: 'SERIAL', label: '일련번호 단독' }
];

const INITIAL_FORM_STATE = {
    itemCode: '',
    productName: '',
    englishProductName: '',
    modelName: '',
    deviceClassification: 'CLASS_I',
    intendedUse: '',
    licenseNumber: '',
    udiDi: '',
    udiPiType: 'LOT,EXPIRY',
    isSoftware: false,
    softwareVersion: '',
    isSterile: false,
    sterilizationMethod: 'NONE',
    storageConditions: '실온(1~30℃)',
    shelfLifeMonths: 36,
    manufacturer: '',
    remarks: '',
    active: true
};

const MedicalDeviceManagementPage = ({ user, onNavigate }) => {
    const { canEdit: checkEdit, canDelete: checkDelete, isAdmin } = usePermissions(user);
    const hasEditPermission = isAdmin || checkEdit('products') || checkEdit('medicalDevices');
    const hasDeletePermission = isAdmin || checkDelete('products') || checkDelete('medicalDevices');

    // 탭 상태: 'master' (품목 마스터 목록) vs 'guide' (UDI 관리 가이드)
    const [activeTab, setActiveTab] = useState('master');

    // 목록 및 페이징 상태
    const [devices, setDevices] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(false);

    // 검색 필터 상태
    const [filters, setFilters] = useState({
        keyword: '',
        deviceClass: '',
        attributeType: '', // 'all', 'software', 'sterile', 'general'
        activeStatus: ''   // '', 'true', 'false'
    });

    // 실제 API 호출에 사용되는 파라미터 상태
    const [appliedFilters, setAppliedFilters] = useState({
        keyword: '',
        deviceClass: '',
        attributeType: '',
        activeStatus: ''
    });

    // 통계 지표
    const [metrics, setMetrics] = useState({
        totalCount: 0,
        udiRegisteredCount: 0,
        udiRate: 0,
        classificationCounts: {}
    });

    // 등록/수정 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [isDuplicateChecking, setIsDuplicateChecking] = useState(false);
    const [duplicateCheckPassed, setDuplicateCheckPassed] = useState(false);
    const [saving, setSaving] = useState(false);

    // 삭제 확인 모달 (Audit Trail)
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // 상세 보기 Modal
    const [viewDevice, setViewDevice] = useState(null);

    // 요약 통계 로드
    const loadMetrics = useCallback(async () => {
        try {
            const data = await fetchMedicalDeviceMetrics();
            if (data) setMetrics(data);
        } catch (err) {
            console.error('[MED_DEVICE] Failed to load metrics:', err);
        }
    }, []);

    // 목록 로드
    const loadDevices = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchMedicalDevices({
                keyword: appliedFilters.keyword,
                deviceClass: appliedFilters.deviceClass,
                page: currentPage,
                size: pageSize
            });
            const pageData = res?.data || res;
            let items = pageData.content || [];

            // 클라이언트 필터링 (특수 속성 및 활성 상태)
            if (appliedFilters.attributeType === 'software') {
                items = items.filter(d => Boolean(d.isSoftware));
            } else if (appliedFilters.attributeType === 'sterile') {
                items = items.filter(d => Boolean(d.isSterile));
            } else if (appliedFilters.attributeType === 'general') {
                items = items.filter(d => !d.isSoftware && !d.isSterile);
            }

            if (appliedFilters.activeStatus === 'true') {
                items = items.filter(d => d.active !== false);
            } else if (appliedFilters.activeStatus === 'false') {
                items = items.filter(d => d.active === false);
            }

            setDevices(items);
            setTotalElements(pageData.totalElements || items.length);
            setTotalPages(pageData.totalPages || 1);
        } catch (err) {
            console.error('[MED_DEVICE] Failed to fetch devices:', err);
            toast.error('의료기기 품목 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [appliedFilters, currentPage, pageSize]);

    useEffect(() => {
        loadMetrics();
    }, [loadMetrics]);

    useEffect(() => {
        loadDevices();
    }, [loadDevices]);

    // 검색 실행 핸들러
    const handleSearch = (e) => {
        if (e) e.preventDefault();
        setCurrentPage(0);
        setAppliedFilters({ ...filters });
    };

    // 필터 초기화 핸들러 (규칙: 초기화 버튼은 좌측 아웃라인)
    const handleResetFilters = () => {
        const resetState = {
            keyword: '',
            deviceClass: '',
            attributeType: '',
            activeStatus: ''
        };
        setFilters(resetState);
        setAppliedFilters(resetState);
        setCurrentPage(0);
    };

    // 신규 등록 모달 열기
    const handleOpenCreateModal = () => {
        setFormData(INITIAL_FORM_STATE);
        setEditingId(null);
        setDuplicateCheckPassed(false);
        setIsModalOpen(true);
    };

    // 수정 모달 열기
    const handleOpenEditModal = (device) => {
        setFormData({
            itemCode: device.itemCode || '',
            productName: device.productName || '',
            englishProductName: device.englishProductName || '',
            modelName: device.modelName || '',
            deviceClassification: device.deviceClassification || 'CLASS_I',
            intendedUse: device.intendedUse || '',
            licenseNumber: device.licenseNumber || '',
            udiDi: device.udiDi || '',
            udiPiType: device.udiPiType || 'LOT,EXPIRY',
            isSoftware: Boolean(device.isSoftware),
            softwareVersion: device.softwareVersion || '',
            isSterile: Boolean(device.isSterile),
            sterilizationMethod: device.sterilizationMethod || 'NONE',
            storageConditions: device.storageConditions || '실온(1~30℃)',
            shelfLifeMonths: device.shelfLifeMonths ?? 36,
            manufacturer: device.manufacturer || '',
            remarks: device.remarks || '',
            active: device.active !== false
        });
        setEditingId(device.id);
        setDuplicateCheckPassed(true);
        setIsModalOpen(true);
    };

    // 품목코드 중복 검사
    const handleCheckDuplicate = async () => {
        if (!formData.itemCode || !formData.itemCode.trim()) {
            toast.warning('품목코드를 입력해주세요.');
            return;
        }
        try {
            setIsDuplicateChecking(true);
            const isDup = await checkMedicalDeviceDuplicate(formData.itemCode.trim());
            if (isDup) {
                toast.error(`이미 존재하는 품목코드입니다: ${formData.itemCode}`);
                setDuplicateCheckPassed(false);
            } else {
                toast.success('사용 가능한 품목코드입니다.');
                setDuplicateCheckPassed(true);
            }
        } catch (e) {
            toast.error('중복 검사 중 오류가 발생했습니다.');
        } finally {
            setIsDuplicateChecking(false);
        }
    };

    // 저장 처리
    const handleSaveDevice = async (e) => {
        e.preventDefault();
        if (!formData.itemCode.trim()) {
            toast.warning('품목코드는 필수 항목입니다.');
            return;
        }
        if (!formData.productName.trim()) {
            toast.warning('제품명은 필수 항목입니다.');
            return;
        }
        if (!editingId && !duplicateCheckPassed) {
            toast.warning('품목코드 중복 확인을 완료해주세요.');
            return;
        }

        try {
            setSaving(true);
            if (editingId) {
                await updateMedicalDevice(editingId, formData);
                toast.success('의료기기 품목 정보가 성공적으로 수정되었습니다.');
            } else {
                await createMedicalDevice(formData);
                toast.success('신규 의료기기 품목이 성공적으로 등록되었습니다.');
            }
            setIsModalOpen(false);
            if (viewDevice && viewDevice.id === editingId) {
                setViewDevice({ ...viewDevice, ...formData });
            }
            loadDevices();
            loadMetrics();
        } catch (err) {
            const msg = err.response?.data?.message || err.message || '저장 중 오류가 발생했습니다.';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    // 삭제 실행 (Audit Trail 보존 소프트 삭제)
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            await deleteMedicalDevice(deleteTarget.id);
            toast.success(`품목 (${deleteTarget.itemCode})이(가) 안전하게 삭제(소프트 삭제) 처리되었습니다.`);
            setDeleteTarget(null);
            if (viewDevice && viewDevice.id === deleteTarget.id) {
                setViewDevice(null);
            }
            loadDevices();
            loadMetrics();
        } catch (err) {
            toast.error('삭제 처리 중 오류가 발생했습니다.');
        } finally {
            setDeleting(false);
        }
    };

    // 등급 뱃지 렌더러
    const renderClassBadge = (classKey) => {
        const opt = CLASSIFICATION_OPTIONS.find(o => o.value === classKey) || {
            label: classKey || '미정',
            badgeColor: '#64748b',
            bg: '#f1f5f9'
        };
        return (
            <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '12px',
                background: opt.bg,
                color: opt.badgeColor,
                border: `1px solid ${opt.badgeColor}40`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: opt.badgeColor }} />
                {opt.label}
            </span>
        );
    };

    return (
        <div className="page-container" style={{ padding: '24px 32px', maxWidth: '1800px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
            
            {/* 1. 표준 3단 페이지 헤더 (3-tier Standard Header) */}
            <div style={{
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        품목코드 관리 &gt; 의료기기 마스터 &gt; UDI 식별·추적성
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🩺</span>
                            <span>의료기기 품목 마스터 및 UDI 관리 가이드</span>
                        </h1>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '12px',
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe'
                        }}>
                            ISO 13485:2016 §7.3
                        </span>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '12px',
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0'
                        }}>
                            의료기기법 제6조 &amp; 제31조의2
                        </span>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '12px',
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a'
                        }}>
                            UDI 통합정보시스템 연동
                        </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                        의료기기 품목 기본 제원, 인허가(신고·인증·허가), GS1 GTIN 기반 UDI-DI/PI 바코드 식별자 및 특수속성(소프트웨어/멸균) 전주기 통합 관리
                    </p>
                </div>

                {/* 상단 액션 버튼 그룹 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {onNavigate && (
                        <>
                            <button
                                type="button"
                                onClick={() => onNavigate('sopManual')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#334155',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                            >
                                <span>📖</span> SOP-730 설계개발 절차서
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigate('regulatoryGuide')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#334155',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                            >
                                <span>⚖️</span> 규제 표준 가이드
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigate('riskManagement')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#334155',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                            >
                                <span>⚠️</span> 위험관리(ISO 14971) 연동
                            </button>
                        </>
                    )}

                    {hasEditPermission && (
                        <button
                            type="button"
                            onClick={handleOpenCreateModal}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '9px 18px',
                                borderRadius: '8px',
                                background: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                        >
                            <span>➕</span> 신규 의료기기 품목 등록
                        </button>
                    )}
                </div>
            </div>

            {/* 2. 규제 기준 매뉴얼 가이드 배너 (DEC-10 준수) */}
            <RegulatoryManualBanner 
                pageKey="medicalDevices" 
                standardLabel="ISO 13485:2016 §7.3 & 의료기기법 제6조" 
                onNavigate={onNavigate}
            />

            {/* 3. 상단 핵심 KPI 요약 카드 그리드 (4개 카드) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                marginBottom: '20px'
            }}>
                <div style={{
                    background: '#ffffff',
                    padding: '18px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>전체 의료기기 품목</span>
                        <span style={{ fontSize: '18px' }}>📦</span>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                            {metrics.totalCount?.toLocaleString()}
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', marginLeft: '4px' }}>건</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
                            ✓ 유효 마스터 유지율 100%
                        </div>
                    </div>
                </div>

                <div style={{
                    background: '#ffffff',
                    padding: '18px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>1등급 · 2등급 품목</span>
                        <span style={{ fontSize: '18px' }}>🛡️</span>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#0284c7', letterSpacing: '-0.02em' }}>
                            {(metrics.classificationCounts?.CLASS_I || 0) + (metrics.classificationCounts?.['1등급'] || 0)}
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', margin: '0 4px' }}>건 /</span>
                            {(metrics.classificationCounts?.CLASS_II || 0) + (metrics.classificationCounts?.['2등급'] || 0)}
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginLeft: '2px' }}>건</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            저·중위험군 (신고 및 인증 대상)
                        </div>
                    </div>
                </div>

                <div style={{
                    background: '#ffffff',
                    padding: '18px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>3등급 · 4등급 (고위험군)</span>
                        <span style={{ fontSize: '18px' }}>⚡</span>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626', letterSpacing: '-0.02em' }}>
                            {(metrics.classificationCounts?.CLASS_III || 0) + (metrics.classificationCounts?.['3등급'] || 0)}
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', margin: '0 4px' }}>건 /</span>
                            {(metrics.classificationCounts?.CLASS_IV || 0) + (metrics.classificationCounts?.['4등급'] || 0)}
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginLeft: '2px' }}>건</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, marginTop: '4px' }}>
                            식약처 정밀 허가 및 임상평가 대상
                        </div>
                    </div>
                </div>

                <div style={{
                    background: '#ffffff',
                    padding: '18px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>UDI 고유식별 등록률</span>
                        <span style={{ fontSize: '18px' }}>🏷️</span>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a', letterSpacing: '-0.02em' }}>
                                {metrics.udiRate}%
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                                ({metrics.udiRegisteredCount}건 등록 완료)
                            </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, marginTop: '4px' }}>
                            GS1 GTIN-14 및 공급내역 보고 준수
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. 서브 탭 스위처: [📋 의료기기 품목 마스터 목록] vs [📘 UDI 관리 및 바코드 표시 가이드] */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '2px'
            }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('master')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: activeTab === 'master' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'master' ? '3px solid #2563eb' : '3px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '-2px',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <span>📋</span> 의료기기 품목 마스터 목록
                    <span style={{
                        fontSize: '11px',
                        padding: '2px 7px',
                        borderRadius: '10px',
                        background: activeTab === 'master' ? '#dbeafe' : '#f1f5f9',
                        color: activeTab === 'master' ? '#1d4ed8' : '#64748b'
                    }}>
                        {totalElements}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('guide')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: activeTab === 'guide' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'guide' ? '3px solid #2563eb' : '3px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '-2px',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <span>📘</span> UDI 관리 및 바코드 표시 가이드 (GS1-128 / IMDS)
                </button>
            </div>

            {/* TAB 1: 의료기기 품목 마스터 목록 */}
            {activeTab === 'master' && (
                <>
                    {/* 표준 검색 필터 카드 (규칙 준수) */}
                    <div style={{
                        background: '#ffffff',
                        padding: '20px 24px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        marginBottom: '20px'
                    }}>
                        <form onSubmit={handleSearch}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: '16px'
                            }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                        통합 검색어
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="품목코드, 제품명, 모델명, 허가번호, UDI..."
                                        value={filters.keyword}
                                        onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            height: '38px',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            outline: 'none',
                                            backgroundColor: '#ffffff'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                        의료기기 등급 구분
                                    </label>
                                    <select
                                        value={filters.deviceClass}
                                        onChange={(e) => setFilters(prev => ({ ...prev, deviceClass: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            height: '38px',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            background: '#ffffff',
                                            color: '#334155'
                                        }}
                                    >
                                        {CLASSIFICATION_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                        특수 속성 (SW / 멸균 관리)
                                    </label>
                                    <select
                                        value={filters.attributeType}
                                        onChange={(e) => setFilters(prev => ({ ...prev, attributeType: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            height: '38px',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            background: '#ffffff',
                                            color: '#334155'
                                        }}
                                    >
                                        <option value="">전체 속성</option>
                                        <option value="software">소프트웨어 의료기기 (SaMD/SiMD)</option>
                                        <option value="sterile">멸균 의료기기 (Sterile Device)</option>
                                        <option value="general">일반 기기 (비멸균·하드웨어)</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                        운영 상태
                                    </label>
                                    <select
                                        value={filters.activeStatus}
                                        onChange={(e) => setFilters(prev => ({ ...prev, activeStatus: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            height: '38px',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            background: '#ffffff',
                                            color: '#334155'
                                        }}
                                    >
                                        <option value="">전체 상태</option>
                                        <option value="true">정상 운영 (Active)</option>
                                        <option value="false">운영 중지 / 단종 (Inactive)</option>
                                    </select>
                                </div>
                            </div>

                            {/* 필터 하단 버튼 바: 좌측 [초기화] vs 우측 [조회] (규칙 필수 준수) */}
                            <div style={{
                                marginTop: '16px',
                                paddingTop: '16px',
                                borderTop: '1px solid #f1f5f9',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: '#475569',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                                >
                                    <span>♻️</span> 검색 조건 초기화
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                                        검색 결과 <strong>{totalElements}</strong>건
                                    </span>
                                    <button
                                        type="submit"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 24px',
                                            borderRadius: '8px',
                                            background: '#2563eb',
                                            color: '#ffffff',
                                            border: 'none',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                                    >
                                        <span>🔍</span> 조회
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* 품목 데이터 테이블 카드 */}
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        {/* 테이블 상단 헤더 바 */}
                        <div style={{
                            padding: '16px 20px',
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>📋</span> 의료기기 등록 품목 목록
                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>
                                    (행 클릭 시 상세 제원 및 UDI 라벨 규격 열람)
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setCurrentPage(0);
                                    }}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '12px',
                                        background: '#ffffff',
                                        color: '#334155'
                                    }}
                                >
                                    <option value={10}>10개씩 보기</option>
                                    <option value={20}>20개씩 보기</option>
                                    <option value={50}>50개씩 보기</option>
                                </select>
                            </div>
                        </div>

                        {/* 데이터 테이블 */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                        <th style={{ padding: '12px 16px', fontWeight: 700, width: '140px' }}>품목코드 (SKU)</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>제품명 / 영문명</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700, width: '130px' }}>모델명</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700, width: '120px' }}>등급</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700, width: '160px' }}>UDI-DI (고유식별)</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700, width: '150px' }}>허가/신고 번호</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700, width: '140px' }}>특성 (SW/멸균)</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700, width: '130px' }}>유효기간/보관</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700, width: '80px', textAlign: 'center' }}>상태</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700, width: '150px', textAlign: 'center' }}>관리</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={10} style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
                                                <div style={{ fontSize: '18px', marginBottom: '8px' }}>⏳</div>
                                                의료기기 품목 목록을 불러오는 중입니다...
                                            </td>
                                        </tr>
                                    ) : devices.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                                                <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔍</div>
                                                <div style={{ fontSize: '15px', fontWeight: 700, color: '#475569' }}>등록된 의료기기 품목이 없습니다.</div>
                                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                                    신규 품목을 등록하거나 검색 필터를 조정해 보세요.
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        devices.map((d) => (
                                            <tr 
                                                key={d.id} 
                                                style={{ 
                                                    borderBottom: '1px solid #f1f5f9',
                                                    transition: 'background 0.15s ease',
                                                    cursor: 'pointer'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                                                onClick={() => setViewDevice(d)}
                                            >
                                                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>
                                                    {d.itemCode}
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.productName}</div>
                                                    {d.englishProductName && (
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{d.englishProductName}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600 }}>
                                                    {d.modelName || '-'}
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    {renderClassBadge(d.deviceClassification)}
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    {d.udiDi ? (
                                                        <span style={{
                                                            fontFamily: 'monospace',
                                                            fontSize: '12px',
                                                            background: '#f1f5f9',
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            color: '#0f172a',
                                                            border: '1px solid #e2e8f0',
                                                            fontWeight: 600
                                                        }}>
                                                            {d.udiDi}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600, background: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
                                                            ⚠️ 미등록
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px 16px', color: '#475569', fontSize: '12px' }}>
                                                    {d.licenseNumber || '-'}
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                        {d.isSoftware && (
                                                            <span style={{
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                background: '#e0e7ff',
                                                                color: '#4338ca',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                border: '1px solid #c7d2fe'
                                                            }}>
                                                                SW {d.softwareVersion || ''}
                                                            </span>
                                                        )}
                                                        {d.isSterile && (
                                                            <span style={{
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                background: '#fef3c7',
                                                                color: '#b45309',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                border: '1px solid #fde68a'
                                                            }}>
                                                                멸균 ({d.sterilizationMethod || 'STERILE'})
                                                            </span>
                                                        )}
                                                        {!d.isSoftware && !d.isSterile && (
                                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>일반 기기</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>
                                                    <div style={{ fontWeight: 600 }}>{d.shelfLifeMonths ? `${d.shelfLifeMonths}개월` : '-'}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{d.storageConditions || '-'}</div>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        padding: '3px 8px',
                                                        borderRadius: '10px',
                                                        background: d.active ? '#dcfce7' : '#f1f5f9',
                                                        color: d.active ? '#15803d' : '#64748b',
                                                        border: `1px solid ${d.active ? '#86efac' : '#cbd5e1'}`
                                                    }}>
                                                        {d.active ? '정상' : '중지'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewDevice(d)}
                                                            style={{
                                                                background: '#f8fafc',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '6px',
                                                                padding: '4px 8px',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                color: '#475569'
                                                            }}
                                                            title="상세 보기"
                                                        >
                                                            상세
                                                        </button>
                                                        {hasEditPermission && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditModal(d)}
                                                                style={{
                                                                    background: '#eff6ff',
                                                                    border: '1px solid #bfdbfe',
                                                                    borderRadius: '6px',
                                                                    padding: '4px 8px',
                                                                    fontSize: '12px',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    color: '#2563eb'
                                                                }}
                                                                title="수정"
                                                            >
                                                                수정
                                                            </button>
                                                        )}
                                                        {hasDeletePermission && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleteTarget(d)}
                                                                style={{
                                                                    background: '#fff1f2',
                                                                    border: '1px solid #fecdd3',
                                                                    borderRadius: '6px',
                                                                    padding: '4px 8px',
                                                                    fontSize: '12px',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    color: '#e11d48'
                                                                }}
                                                                title="소프트 삭제"
                                                            >
                                                                삭제
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 페이징 네비게이션 */}
                        <div style={{
                            padding: '12px 20px',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                총 <strong>{totalElements}</strong>건 중 <strong>{currentPage * pageSize + 1}</strong> ~ <strong>{Math.min((currentPage + 1) * pageSize, totalElements)}</strong>건 표시 (페이지 {currentPage + 1} / {totalPages || 1})
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    type="button"
                                    disabled={currentPage === 0}
                                    onClick={() => setCurrentPage(0)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        fontSize: '12px',
                                        cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === 0 ? 0.4 : 1
                                    }}
                                >
                                    맨처음
                                </button>
                                <button
                                    type="button"
                                    disabled={currentPage === 0}
                                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === 0 ? 0.4 : 1
                                    }}
                                >
                                    ◀ 이전
                                </button>
                                <button
                                    type="button"
                                    disabled={currentPage + 1 >= totalPages}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: (currentPage + 1 >= totalPages) ? 'not-allowed' : 'pointer',
                                        opacity: (currentPage + 1 >= totalPages) ? 0.4 : 1
                                    }}
                                >
                                    다음 ▶
                                </button>
                                <button
                                    type="button"
                                    disabled={currentPage + 1 >= totalPages}
                                    onClick={() => setCurrentPage(totalPages - 1)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        fontSize: '12px',
                                        cursor: (currentPage + 1 >= totalPages) ? 'not-allowed' : 'pointer',
                                        opacity: (currentPage + 1 >= totalPages) ? 0.4 : 1
                                    }}
                                >
                                    맨끝
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* TAB 2: UDI 관리 및 바코드 표시 가이드 (GS1-128 / IMDS) */}
            {activeTab === 'guide' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 가이드 상단 요약 배너 */}
                    <div style={{
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                        color: '#ffffff',
                        padding: '24px 28px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '24px' }}>🏷️</span>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
                                의료기기 고유식별코드 (UDI: Unique Device Identification) 법적 기준 및 실무 가이드
                            </h2>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#bfdbfe', lineHeight: '1.6', maxWidth: '1200px' }}>
                            식약처 의료기기법 제31조의2, 제31조의3 및 미국 FDA 21 CFR Part 830, 유럽 EU MDR(2017/745)에 따른 
                            의료기기 용기·외포장 UDI 바코드 부착 기준 및 의료기기통합정보시스템(IMDS) 공급내역 전산 보고 표준 지침입니다.
                        </p>
                    </div>

                    {/* UDI 구조 다이어그램 카드 */}
                    <div style={{
                        background: '#ffffff',
                        padding: '24px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>1.</span> UDI 코드의 2단 구조 체계 (UDI-DI + UDI-PI)
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                            {/* UDI-DI */}
                            <div style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '10px',
                                padding: '18px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e40af' }}>
                                        🔹 기기식별자 (UDI-DI, Device Identifier)
                                    </span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '10px' }}>
                                        고정 코드 (Fixed)
                                    </span>
                                </div>
                                <p style={{ fontSize: '12px', color: '#334155', lineHeight: '1.6', margin: '0 0 10px' }}>
                                    품목별·모델명별·포장단위별로 고유하게 부여되는 정적 식별 코드입니다. 국내 식약처 및 글로벌 공통 표준으로 <strong>GS1 GTIN-14 (14자리 숫자)</strong>를 사용합니다.
                                </p>
                                <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                    응용식별자(AI): (01) 88012345678901
                                </div>
                            </div>

                            {/* UDI-PI */}
                            <div style={{
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '10px',
                                padding: '18px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#166534' }}>
                                        🔸 생산식별자 (UDI-PI, Production Identifier)
                                    </span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px' }}>
                                        동적 코드 (Dynamic)
                                    </span>
                                </div>
                                <p style={{ fontSize: '12px', color: '#334155', lineHeight: '1.6', margin: '0 0 10px' }}>
                                    제조 단위별 추적성을 확보하기 위한 동적 생산 정보입니다. 제조번호(LOT), 유효기한(EXP), 제조일자(MFG), 일련번호(SN) 등으로 구성됩니다.
                                </p>
                                <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                                    (17) 261231 + (10) LOT2026A01 + (21) SN9001
                                </div>
                            </div>
                        </div>

                        {/* 바코드 라벨 표준 규격 시각화 박스 */}
                        <div style={{
                            marginTop: '20px',
                            background: '#f8fafc',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '10px',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '12px' }}>
                                🏷️ 의료기기 제품 라벨 바코드 표기 표준 예시 (GS1-128 / GS1 DataMatrix)
                            </div>
                            
                            <div style={{
                                background: '#ffffff',
                                border: '2px solid #0f172a',
                                borderRadius: '8px',
                                padding: '16px 24px',
                                maxWidth: '640px',
                                width: '100%',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>초음파 프로브 일회용 덮개 (Sterile)</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Model: UP-COVER-100 / 제조원: (주)메디텍인스트루먼트</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>2등급 인증</span>
                                    </div>
                                </div>

                                {/* 가상 바코드 박스 */}
                                <div style={{
                                    background: '#f1f5f9',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    textAlign: 'center',
                                    margin: '12px 0'
                                }}>
                                    <div style={{ fontFamily: 'monospace', fontSize: '20px', letterSpacing: '4px', fontWeight: 800, color: '#0f172a' }}>
                                        ||| | || |||| | ||| || |||| | || ||
                                    </div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#334155', marginTop: '6px', fontWeight: 700 }}>
                                        (01)08801234567893(17)261231(10)LOT26A01
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: '#475569' }}>
                                    <div>📅 <strong>사용기한</strong>: 2026-12-31</div>
                                    <div>📦 <strong>제조번호</strong>: LOT26A01</div>
                                    <div>🏷️ <strong>UDI-DI</strong>: 08801234567893</div>
                                    <div>🛡️ <strong>멸균방식</strong>: EO 가스 멸균</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 등급별 단계적 도입 및 공급내역 보고 의무 */}
                    <div style={{
                        background: '#ffffff',
                        padding: '24px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>2.</span> 식약처 등급별 UDI 바코드 표시 및 공급내역 보고 법적 시한
                        </h3>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>의료기기 등급</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>UDI 바코드 부착 의무일</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>IMDS 공급내역 보고 의무일</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>보고 기한 및 주기</th>
                                        <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>법적 이행 상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626' }}>4등급 (고위험 허가)</td>
                                        <td style={{ padding: '12px 16px' }}>2019년 7월 1일</td>
                                        <td style={{ padding: '12px 16px' }}>2020년 7월 1일</td>
                                        <td style={{ padding: '12px 16px' }}>출고한 달의 다음 달 말일까지</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>의무 시행 중</span>
                                        </td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#d97706' }}>3등급 (중위험 허가)</td>
                                        <td style={{ padding: '12px 16px' }}>2020년 7월 1일</td>
                                        <td style={{ padding: '12px 16px' }}>2021년 7월 1일</td>
                                        <td style={{ padding: '12px 16px' }}>출고한 달의 다음 달 말일까지</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>의무 시행 중</span>
                                        </td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>2등급 (인증 품목)</td>
                                        <td style={{ padding: '12px 16px' }}>2021년 7월 1일</td>
                                        <td style={{ padding: '12px 16px' }}>2022년 7월 1일</td>
                                        <td style={{ padding: '12px 16px' }}>출고한 달의 다음 달 말일까지</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>의무 시행 중</span>
                                        </td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>1등급 (신고 품목)</td>
                                        <td style={{ padding: '12px 16px' }}>2022년 7월 1일</td>
                                        <td style={{ padding: '12px 16px' }}>2023년 7월 1일</td>
                                        <td style={{ padding: '12px 16px' }}>출고한 달의 다음 달 말일까지</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>의무 시행 중</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 실무 체크리스트 및 주의사항 */}
                    <div style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '12px',
                        padding: '20px 24px'
                    }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#92400e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⚠️</span> UDI 바코드 인쇄 및 전산 보고 시 품질책임자 체크리스트
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#78350f', lineHeight: '1.7' }}>
                            <li><strong>바코드 인쇄 품질 검증</strong>: ISO/IEC 15415(2D) 및 ISO/IEC 15416(1D) 검증 등급 1.5(C등급) 이상을 유지해야 합니다.</li>
                            <li><strong>인간 판독 가능 서식(HRI) 병기</strong>: 바코드 스캔 불량에 대비하여 사람이 눈으로 읽을 수 있는 문자열 `(01)...(17)...`을 반드시 바코드 아래 또는 옆에 병기해야 합니다.</li>
                            <li><strong>식약처 IMDS 사전 등록</strong>: 제조·수입 품목허가 후 제품을 출하하기 전 반드시 식약처 의료기기통합정보시스템(udi.mfds.go.kr)에 UDI-DI 정보를 사전 등록해야 합니다.</li>
                            <li><strong>공급내역 보고 누락 주의</strong>: 병원, 약국, 유통사로 출고된 내역은 익월 말일까지 보고하지 않을 경우 행정처분(판매업무정지 등)의 대상이 됩니다.</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* 5. 모달: 신규 등록 및 수정 (96vw x 92vh 최대화 표준) */}
            {/* ================================================================= */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '96vw',
                        maxWidth: '1280px',
                        height: '92vh',
                        maxHeight: '94vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        {/* 모달 헤더 (고정) */}
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
                                    <span>{editingId ? '✏️' : '🩺'}</span>
                                    <span>{editingId ? '의료기기 품목 정보 수정' : '신규 의료기기 품목 마스터 등록'}</span>
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                                    ISO 13485:2016 §7.3 설계개발 및 의료기기법 제6조 기준에 부합하는 기준 정보 및 UDI 고유식별 등록
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
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

                        {/* 모달 폼 본문 (스크롤) */}
                        <form onSubmit={handleSaveDevice} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                
                                {/* 섹션 1: 품목 식별 기본 정보 */}
                                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e40af', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>1.</span> 기본 식별 정보
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                품목코드 (SKU) <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="예: MD-2026-001"
                                                    value={formData.itemCode}
                                                    disabled={Boolean(editingId)}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, itemCode: e.target.value.toUpperCase() });
                                                        setDuplicateCheckPassed(false);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        height: '38px',
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        border: '1px solid #cbd5e1',
                                                        fontSize: '13px',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 700,
                                                        background: editingId ? '#f1f5f9' : '#ffffff'
                                                    }}
                                                />
                                                {!editingId && (
                                                    <button
                                                        type="button"
                                                        disabled={isDuplicateChecking || !formData.itemCode.trim()}
                                                        onClick={handleCheckDuplicate}
                                                        style={{
                                                            padding: '8px 14px',
                                                            borderRadius: '8px',
                                                            background: duplicateCheckPassed ? '#16a34a' : '#2563eb',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {duplicateCheckPassed ? '✓ 중복확인완료' : '중복검사'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                의료기기 등급 <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <select
                                                value={formData.deviceClassification}
                                                onChange={(e) => setFormData({ ...formData, deviceClassification: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px',
                                                    background: '#ffffff'
                                                }}
                                            >
                                                <option value="CLASS_I">1등급 (신고 대상 품목 - 잠재적 위해성 거의 없음)</option>
                                                <option value="CLASS_II">2등급 (인증 대상 품목 - 잠재적 위해성 낮음)</option>
                                                <option value="CLASS_III">3등급 (품목 허가 대상 - 중증도 잠재적 위해성)</option>
                                                <option value="CLASS_IV">4등급 (고위험 허가 대상 - 인체삽입/생명유지)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                품목명 (국문) <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="예: 휴대용 초음파 영상 진단기"
                                                value={formData.productName}
                                                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px',
                                                    fontWeight: 600
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                품목명 (영문)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="예: Portable Ultrasound Diagnostic System"
                                                value={formData.englishProductName}
                                                onChange={(e) => setFormData({ ...formData, englishProductName: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                모델명 / 형식 (Model)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="예: PUD-200X"
                                                value={formData.modelName}
                                                onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                품목 운영 상태
                                            </label>
                                            <select
                                                value={formData.active ? 'true' : 'false'}
                                                onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px',
                                                    background: '#ffffff'
                                                }}
                                            >
                                                <option value="true">정상 운영 (Active)</option>
                                                <option value="false">운영 중지 / 단종 (Inactive)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* 섹션 2: 규제 인허가 및 UDI 식별자 */}
                                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e40af', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>2.</span> 규제 인허가 및 고유식별코드 (UDI)
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                품목 허가 / 인증 / 신고 번호
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="예: 제허 26-104호 / 수신 25-88호"
                                                value={formData.licenseNumber}
                                                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                UDI-DI (기기식별자: GS1 GTIN 14자리)
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={50}
                                                placeholder="예: 88012345678901 (14자리 숫자)"
                                                value={formData.udiDi}
                                                onChange={(e) => setFormData({ ...formData, udiDi: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 600
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                UDI-PI 속성 (생산식별자 부착 규격)
                                            </label>
                                            <select
                                                value={formData.udiPiType}
                                                onChange={(e) => setFormData({ ...formData, udiPiType: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px',
                                                    background: '#ffffff'
                                                }}
                                            >
                                                {UDI_PI_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                사용 목적 및 적응증 (Intended Use)
                                            </label>
                                            <textarea
                                                rows={2}
                                                placeholder="의료기기 허가증 상의 사용 목적 및 환자 적응증을 명시합니다."
                                                value={formData.intendedUse}
                                                onChange={(e) => setFormData({ ...formData, intendedUse: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px',
                                                    resize: 'vertical'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 섹션 3: 멸균 및 소프트웨어 특수 속성 */}
                                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e40af', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>3.</span> 특수 속성 (SaMD 소프트웨어 / 멸균 관리)
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                        <div style={{
                                            background: '#f8fafc',
                                            padding: '16px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isSoftware}
                                                    onChange={(e) => setFormData({ ...formData, isSoftware: e.target.checked })}
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                                소프트웨어 의료기기 (SaMD / SiMD - IEC 62304)
                                            </label>
                                            {formData.isSoftware && (
                                                <div style={{ marginTop: '10px' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="소프트웨어 버전 (예: v1.0.4)"
                                                        value={formData.softwareVersion}
                                                        onChange={(e) => setFormData({ ...formData, softwareVersion: e.target.value })}
                                                        style={{
                                                            width: '100%',
                                                            height: '36px',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #cbd5e1',
                                                            fontSize: '12px'
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div style={{
                                            background: '#f8fafc',
                                            padding: '16px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isSterile}
                                                    onChange={(e) => setFormData({ ...formData, isSterile: e.target.checked })}
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                                멸균 의료기기 (Sterile Device - ISO 11135/11137)
                                            </label>
                                            {formData.isSterile && (
                                                <div style={{ marginTop: '10px' }}>
                                                    <select
                                                        value={formData.sterilizationMethod}
                                                        onChange={(e) => setFormData({ ...formData, sterilizationMethod: e.target.value })}
                                                        style={{
                                                            width: '100%',
                                                            height: '36px',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #cbd5e1',
                                                            fontSize: '12px',
                                                            background: '#ffffff'
                                                        }}
                                                    >
                                                        {STERILIZATION_METHODS.filter(m => m.value !== 'NONE').map(m => (
                                                            <option key={m.value} value={m.value}>{m.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 섹션 4: 제조 및 보관 조건 */}
                                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e40af', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>4.</span> 제조원 및 유통/보관 조건
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                제조원 / 제조소 (Manufacturer)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="예: (주)메디텍인스트루먼트 제1공장"
                                                value={formData.manufacturer}
                                                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                유효기간 / 사용기한 (개월 수)
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={120}
                                                placeholder="36"
                                                value={formData.shelfLifeMonths || ''}
                                                onChange={(e) => setFormData({ ...formData, shelfLifeMonths: parseInt(e.target.value, 10) || null })}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                보관 및 수송 조건
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="예: 실온(1~30℃), 직사광선 피할 것"
                                                value={formData.storageConditions}
                                                onChange={(e) => setFormData({ ...formData, storageConditions: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                                비고 및 특이사항
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="참고용 메모 입력"
                                                value={formData.remarks}
                                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '13px'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 모달 하단 버튼 바: 좌측 [취소/닫기] vs 우측 [저장] (규칙 필수 준수) */}
                            <div style={{
                                padding: '16px 24px',
                                backgroundColor: '#f8fafc',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexShrink: 0
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{
                                        padding: '9px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: '#475569',
                                        cursor: 'pointer'
                                    }}
                                >
                                    취소 / 닫기
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        padding: '9px 26px',
                                        borderRadius: '8px',
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                                    }}
                                >
                                    {saving ? '저장 처리 중...' : (editingId ? '수정 내용 저장 완료' : '품목 등록 완료')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* 6. 모달: 품목 상세 제원 및 UDI 라벨 사양서 열람 */}
            {/* ================================================================= */}
            {viewDevice && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '94vw',
                        maxWidth: '1100px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        {/* 헤더 */}
                        <div style={{
                            padding: '16px 24px',
                            background: '#0f172a',
                            color: '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0
                        }}>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🩺</span> 의료기기 상세 제원 및 UDI 라벨 규격
                                    <span style={{ fontSize: '13px', color: '#93c5fd', fontFamily: 'monospace' }}>[{viewDevice.itemCode}]</span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                    {viewDevice.productName} {viewDevice.englishProductName ? `(${viewDevice.englishProductName})` : ''}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewDevice(null)}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer' }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* 본문 */}
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* 상단 2열 정보: 기본 스펙 vs 가상 UDI 라벨 */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                                
                                {/* 좌측: 상세 항목 리스트 */}
                                <div style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    padding: '18px'
                                }}>
                                    <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 800, color: '#1e40af' }}>
                                        📋 제품 기준 제원
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 12px', fontSize: '13px' }}>
                                        <div style={{ color: '#64748b', fontWeight: 600 }}>품목코드</div>
                                        <div style={{ fontWeight: 800, color: '#1e40af', fontFamily: 'monospace' }}>{viewDevice.itemCode}</div>

                                        <div style={{ color: '#64748b', fontWeight: 600 }}>기기 등급</div>
                                        <div>{renderClassBadge(viewDevice.deviceClassification)}</div>

                                        <div style={{ color: '#64748b', fontWeight: 600 }}>모델명</div>
                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{viewDevice.modelName || '-'}</div>

                                        <div style={{ color: '#64748b', fontWeight: 600 }}>인허가 번호</div>
                                        <div>{viewDevice.licenseNumber || '-'}</div>

                                        <div style={{ color: '#64748b', fontWeight: 600 }}>UDI-DI</div>
                                        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{viewDevice.udiDi || '미등록'}</div>

                                        <div style={{ color: '#64748b', fontWeight: 600 }}>UDI-PI 규격</div>
                                        <div>{viewDevice.udiPiType || '-'}</div>

                                        <div style={{ color: '#64748b', fontWeight: 600 }}>소프트웨어</div>
                                        <div>{viewDevice.isSoftware ? `예 (SaMD: ${viewDevice.softwareVersion || '미기재'})` : '아니오 (하드웨어)'}</div>

                                        <div style={{ color: '#64748b', fontWeight: 600 }}>멸균 여부</div>
                                        <div>{viewDevice.isSterile ? `예 (방식: ${viewDevice.sterilizationMethod})` : '비멸균'}</div>

                                        <div style={{ color: '#64748b', fontWeight: 600 }}>제조원</div>
                                        <div>{viewDevice.manufacturer || '-'}</div>

                                        <div style={{ color: '#64748b', fontWeight: 600 }}>보관/수송</div>
                                        <div>{viewDevice.storageConditions || '-'}</div>

                                        <div style={{ color: '#64748b', fontWeight: 600 }}>유효기한</div>
                                        <div>{viewDevice.shelfLifeMonths ? `${viewDevice.shelfLifeMonths}개월` : '-'}</div>

                                        <div style={{ color: '#64748b', fontWeight: 600 }}>등록일자</div>
                                        <div>{viewDevice.createdAt ? new Date(viewDevice.createdAt).toLocaleString() : '-'}</div>
                                    </div>
                                </div>

                                {/* 우측: 가상 UDI 라벨 박스 */}
                                <div style={{
                                    background: '#ffffff',
                                    border: '2px solid #0f172a',
                                    borderRadius: '10px',
                                    padding: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>
                                                GS1 MEDICAL DEVICE UDI LABEL
                                            </span>
                                            <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>
                                                포장 단위 표기용
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                                            {viewDevice.productName}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
                                            {viewDevice.englishProductName || viewDevice.modelName}
                                        </div>

                                        {/* 바코드 그래픽 */}
                                        <div style={{
                                            background: '#f8fafc',
                                            padding: '14px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            textAlign: 'center',
                                            marginBottom: '12px'
                                        }}>
                                            <div style={{ fontFamily: 'monospace', fontSize: '22px', letterSpacing: '4px', fontWeight: 800, color: '#0f172a' }}>
                                                || | |||| | ||| || |||| | || ||
                                            </div>
                                            <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#2563eb', marginTop: '6px' }}>
                                                (01){viewDevice.udiDi || '08800000000000'}(17)261231(10)LOT2026A
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.6' }}>
                                            <div>• <strong>허가번호</strong>: {viewDevice.licenseNumber || '미기재'}</div>
                                            <div>• <strong>제조원</strong>: {viewDevice.manufacturer || '사내 공장'}</div>
                                            <div>• <strong>보관조건</strong>: {viewDevice.storageConditions || '실온 보관'}</div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                                        ✓ 식약처 의료기기통합정보시스템(IMDS) 보고 연동 규격 준수
                                    </div>
                                </div>
                            </div>

                            {/* 사용 목적 박스 */}
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                                    🎯 사용 목적 및 적응증 (Intended Use)
                                </div>
                                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                    {viewDevice.intendedUse || '등록된 사용 목적이 없습니다.'}
                                </div>
                            </div>
                        </div>

                        {/* 모달 하단 버튼 바: 좌측 [닫기] vs 우측 [수정하기] */}
                        <div style={{
                            padding: '16px 24px',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0
                        }}>
                            <button
                                type="button"
                                onClick={() => setViewDevice(null)}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                닫기
                            </button>

                            {hasEditPermission && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const target = viewDevice;
                                        setViewDevice(null);
                                        handleOpenEditModal(target);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 20px',
                                        borderRadius: '8px',
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                                    }}
                                >
                                    <span>✏️</span> 이 품목 정보 수정하기
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* 7. 모달: 소프트 삭제 확인 (Audit Trail 보존 안내 및 표준 버튼 순서) */}
            {/* ================================================================= */}
            {deleteTarget && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '16px'
                }}>
                    <div style={{
                        background: '#ffffff',
                        width: '90%',
                        maxWidth: '480px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
                        padding: '24px'
                    }}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#dc2626', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⚠️</span> 의료기기 품목 삭제 확인
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
                            정말로 <strong>[{deleteTarget.itemCode}] {deleteTarget.productName}</strong> 품목을 삭제하시겠습니까?
                            
                            <div style={{
                                marginTop: '12px',
                                padding: '12px',
                                background: '#fef2f2',
                                border: '1px solid #fecdd3',
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: '#991b1b',
                                lineHeight: '1.5'
                            }}>
                                📌 <strong>감사추적(Audit Trail) 보존 규정 (DEC-09)</strong><br />
                                의료기기법 및 ISO 13485 규제 요건에 따라 데이터는 물리적으로 영구 삭제되지 않으며, 소프트 삭제(Soft Delete)되어 이력 로그에 안전하게 보존됩니다.
                            </div>
                        </div>

                        {/* 모달 버튼: 좌측 [취소] vs 우측 [삭제 확인] */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={() => setDeleteTarget(null)}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#475569',
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
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(220,38,38,0.2)'
                                }}
                            >
                                {deleting ? '처리 중...' : '확인 (소프트 삭제)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicalDeviceManagementPage;
