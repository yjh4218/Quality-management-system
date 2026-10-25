import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner.jsx';
import {
    fetchFacilityKpi,
    fetchEquipments,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    fetchCalibrationRecords,
    createCalibrationRecord,
    updateCalibrationRecord,
    deleteCalibrationRecord,
    fetchMaintenanceRecords,
    createMaintenanceRecord,
    updateMaintenanceRecord,
    deleteMaintenanceRecord,
    fetchEnvironmentalMonitorings,
    createEnvironmentalMonitoring,
    updateEnvironmentalMonitoring,
    deleteEnvironmentalMonitoring
} from './api.jsx';

// =========================================================================
// 상수 및 옵션 정의
// =========================================================================

const EQUIPMENT_CATEGORY_OPTIONS = [
    { value: 'MEASURING_INSTRUMENT', label: '계측기/시험장비' },
    { value: 'PRODUCTION_EQUIPMENT', label: '제조설비/가공기' },
    { value: 'UTILITY_FACILITY', label: '유틸리티/공조/순수' },
    { value: 'STORAGE_EQUIPMENT', label: '보관/냉장설비' },
    { value: 'OTHER', label: '기타 설비' }
];

const EQUIPMENT_STATUS_OPTIONS = [
    { value: 'OPERATIONAL', label: '정상 가동중', color: '#10b981', bg: '#dcfce7' },
    { value: 'UNDER_MAINTENANCE', label: '점검/수리중', color: '#f59e0b', bg: '#fef3c7' },
    { value: 'CALIBRATION_PENDING', label: '교정 대기중', color: '#8b5cf6', bg: '#ede9fe' },
    { value: 'OUT_OF_SERVICE', label: '사용 중지 (OOS/불합격)', color: '#ef4444', bg: '#fee2e2' },
    { value: 'DECOMMISSIONED', label: '폐기/불용처리', color: '#64748b', bg: '#f1f5f9' }
];

const CRITICALITY_OPTIONS = [
    { value: 'HIGH', label: '중점관리 (품질직접영향)', color: '#dc2626', bg: '#fef2f2' },
    { value: 'MEDIUM', label: '일반관리 (공정간접영향)', color: '#2563eb', bg: '#eff6ff' },
    { value: 'LOW', label: '보조관리 (단순보조설비)', color: '#475569', bg: '#f8fafc' }
];

const CALIBRATION_AGENCY_OPTIONS = [
    { value: 'EXTERNAL_KOLAS', label: '국가공인 교정기관 (KOLAS)' },
    { value: 'MANUFACTURER', label: '장비 제조사 (OEM)' },
    { value: 'INTERNAL', label: '사내 교정' }
];

const CALIBRATION_RESULT_OPTIONS = [
    { value: 'PASS', label: '적합 (Pass)', color: '#16a34a', bg: '#dcfce7' },
    { value: 'PASS_WITH_CORRECTION', label: '조건부 적합 (보정표 사용)', color: '#d97706', bg: '#fef3c7' },
    { value: 'FAIL', label: '불합격 (Fail / OOS)', color: '#dc2626', bg: '#fee2e2' }
];

const MAINTENANCE_TYPE_OPTIONS = [
    { value: 'PREVENTIVE_PM', label: '정기 예방보전 (PM)', color: '#2563eb', bg: '#eff6ff' },
    { value: 'CORRECTIVE_BREAKDOWN', label: '고장 수리 (BM)', color: '#ea580c', bg: '#ffedd5' },
    { value: 'VALIDATION_IQ_OQ', label: '적격성평가 (IQ/OQ/PQ)', color: '#9333ea', bg: '#f3e8ff' }
];

const MAINTENANCE_RESULT_OPTIONS = [
    { value: 'COMPLETED', label: '정상 완료', color: '#16a34a', bg: '#dcfce7' },
    { value: 'PARTIAL', label: '부품 대기 / 임시 가동', color: '#d97706', bg: '#fef3c7' },
    { value: 'FAILED', label: '보전 실패 / 재작업 필요', color: '#dc2626', bg: '#fee2e2' }
];

const ENVIRONMENTAL_AREA_OPTIONS = [
    { value: 'CLEANROOM_GRADE_C', label: '청정실 Grade C (조제실)' },
    { value: 'CLEANROOM_GRADE_D', label: '청정실 Grade D (충전실)' },
    { value: 'WEIGHING_ROOM', label: '원료 칭량실 (칭량부스)' },
    { value: 'PACKAGING_AREA', label: '포장실 (일반제조구역)' },
    { value: 'WAREHOUSE', label: '보관소 (온·습도 관리구역)' },
    { value: 'QC_LAB', label: '품질관리 시험실 (이화학/미생물)' }
];

const ENVIRONMENTAL_STATUS_OPTIONS = [
    { value: 'NORMAL', label: '정상 적합', color: '#16a34a', bg: '#dcfce7' },
    { value: 'WARNING_ACTION_LIMIT', label: '주의 (경계기준)', color: '#d97706', bg: '#fef3c7' },
    { value: 'OUT_OF_SPEC', label: '기준 이탈 (OOS)', color: '#dc2626', bg: '#fee2e2' }
];

export default function FacilityManagementPage({ user, onNavigate }) {
    // 탭 상태: EQUIPMENT, CALIBRATION, MAINTENANCE, ENVIRONMENT
    const [activeTab, setActiveTab] = useState('EQUIPMENT');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Grid APIs
    const [gridApi, setGridApi] = useState(null);

    // KPI 상태
    const [kpi, setKpi] = useState({
        totalEquipment: 0,
        operationalEquipment: 0,
        operationalRate: 0,
        overdueCalibrations: 0,
        dueSoonCalibrations: 0,
        totalCalibrationAttention: 0,
        dueSoonPm: 0,
        failedCalibrations: 0,
        recentEnvironmentalOos: 0
    });

    // 데이터 목록
    const [equipments, setEquipments] = useState([]);
    const [calibrations, setCalibrations] = useState([]);
    const [maintenances, setMaintenances] = useState([]);
    const [environments, setEnvironments] = useState([]);

    // 모달 상태
    const [showEquipmentModal, setShowEquipmentModal] = useState(false);
    const [equipmentForm, setEquipmentForm] = useState(getInitialEquipmentForm());
    const [editingEquipmentId, setEditingEquipmentId] = useState(null);

    const [showCalibrationModal, setShowCalibrationModal] = useState(false);
    const [calibrationForm, setCalibrationForm] = useState(getInitialCalibrationForm());
    const [editingCalibrationId, setEditingCalibrationId] = useState(null);

    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [maintenanceForm, setMaintenanceForm] = useState(getInitialMaintenanceForm());
    const [editingMaintenanceId, setEditingMaintenanceId] = useState(null);

    const [showEnvironmentModal, setShowEnvironmentModal] = useState(false);
    const [environmentForm, setEnvironmentForm] = useState(getInitialEnvironmentForm());
    const [editingEnvironmentId, setEditingEnvironmentId] = useState(null);

    // =========================================================================
    // 데이터 로드
    // =========================================================================

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [kpiRes, eqRes, calRes, mntRes, envRes] = await Promise.all([
                fetchFacilityKpi().catch(() => null),
                fetchEquipments().catch(() => []),
                fetchCalibrationRecords().catch(() => []),
                fetchMaintenanceRecords().catch(() => []),
                fetchEnvironmentalMonitorings().catch(() => [])
            ]);

            if (kpiRes) setKpi(kpiRes);
            if (eqRes) setEquipments(eqRes);
            if (calRes) setCalibrations(calRes);
            if (mntRes) setMaintenances(mntRes);
            if (envRes) setEnvironments(envRes);
        } catch (error) {
            console.error('Failed to load facility data:', error);
            toast.error('시설·교정 데이터 로드 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // =========================================================================
    // 폼 초기화 도우미
    // =========================================================================

    function getInitialEquipmentForm() {
        return {
            equipmentName: '',
            category: 'MEASURING_INSTRUMENT',
            modelNumber: '',
            serialNumber: '',
            manufacturer: '',
            supplier: '',
            installationDate: new Date().toISOString().slice(0, 10),
            installationLocation: '',
            department: '품질관리팀',
            managerName: user?.username || '관리자',
            status: 'OPERATIONAL',
            calibrationCycleMonths: 12,
            lastCalibrationDate: '',
            nextCalibrationDueDate: '',
            pmCycleMonths: 6,
            lastPmDate: '',
            nextPmDueDate: '',
            criticality: 'MEDIUM',
            specifications: '',
            remarks: ''
        };
    }

    function getInitialCalibrationForm() {
        return {
            equipmentId: equipments[0]?.id || '',
            calibrationDate: new Date().toISOString().slice(0, 10),
            agencyType: 'EXTERNAL_KOLAS',
            agencyName: '한국인정기구 (KOLAS)',
            certificateNumber: '',
            certificateFileUrl: '',
            result: 'PASS',
            toleranceStandard: '허용오차 ±1.0% 이내',
            maxDeviation: '',
            calibratedBy: '',
            verifiedBy: user?.username || '품질책임자',
            verificationDate: new Date().toISOString().slice(0, 10),
            impactAssessmentRequired: false,
            impactAssessmentNotes: '',
            nextCalibrationDueDate: '',
            remarks: ''
        };
    }

    function getInitialMaintenanceForm() {
        return {
            equipmentId: equipments[0]?.id || '',
            maintenanceType: 'PREVENTIVE_PM',
            maintenanceDate: new Date().toISOString().slice(0, 10),
            performer: '',
            cost: 0,
            maintenanceResult: 'COMPLETED',
            partsReplaced: '',
            downtimeHours: 0,
            details: '',
            verifiedBy: user?.username || '시설책임자',
            nextPmDueDate: '',
            remarks: ''
        };
    }

    function getInitialEnvironmentForm() {
        return {
            area: 'CLEANROOM_GRADE_C',
            monitoringDate: new Date().toISOString().slice(0, 16),
            temperature: 21.0,
            humidity: 45.0,
            differentialPressure: 25.0,
            airborneParticles05: 352000,
            airborneParticles50: 2900,
            microbialCount: 10,
            status: 'NORMAL',
            inspector: user?.username || '품질담당자',
            correctiveAction: '',
            remarks: ''
        };
    }

    // =========================================================================
    // 모달 열기 핸들러
    // =========================================================================

    const openCreateEquipment = () => {
        setEditingEquipmentId(null);
        setEquipmentForm(getInitialEquipmentForm());
        setShowEquipmentModal(true);
    };

    const openEditEquipment = (row) => {
        setEditingEquipmentId(row.id);
        setEquipmentForm({
            equipmentName: row.equipmentName || '',
            category: row.category || 'MEASURING_INSTRUMENT',
            modelNumber: row.modelNumber || '',
            serialNumber: row.serialNumber || '',
            manufacturer: row.manufacturer || '',
            supplier: row.supplier || '',
            installationDate: row.installationDate || '',
            installationLocation: row.installationLocation || '',
            department: row.department || '',
            managerName: row.managerName || '',
            status: row.status || 'OPERATIONAL',
            calibrationCycleMonths: row.calibrationCycleMonths || 12,
            lastCalibrationDate: row.lastCalibrationDate || '',
            nextCalibrationDueDate: row.nextCalibrationDueDate || '',
            pmCycleMonths: row.pmCycleMonths || 6,
            lastPmDate: row.lastPmDate || '',
            nextPmDueDate: row.nextPmDueDate || '',
            criticality: row.criticality || 'MEDIUM',
            specifications: row.specifications || '',
            remarks: row.remarks || ''
        });
        setShowEquipmentModal(true);
    };

    const openCreateCalibration = (eq = null) => {
        setEditingCalibrationId(null);
        const form = getInitialCalibrationForm();
        if (eq) {
            form.equipmentId = eq.id;
        } else if (equipments.length > 0) {
            form.equipmentId = equipments[0].id;
        }
        setCalibrationForm(form);
        setShowCalibrationModal(true);
    };

    const openEditCalibration = (row) => {
        setEditingCalibrationId(row.id);
        setCalibrationForm({
            equipmentId: row.equipmentId || '',
            calibrationDate: row.calibrationDate || '',
            agencyType: row.agencyType || 'EXTERNAL_KOLAS',
            agencyName: row.agencyName || '',
            certificateNumber: row.certificateNumber || '',
            certificateFileUrl: row.certificateFileUrl || '',
            result: row.result || 'PASS',
            toleranceStandard: row.toleranceStandard || '',
            maxDeviation: row.maxDeviation || '',
            calibratedBy: row.calibratedBy || '',
            verifiedBy: row.verifiedBy || '',
            verificationDate: row.verificationDate || '',
            impactAssessmentRequired: row.impactAssessmentRequired || false,
            impactAssessmentNotes: row.impactAssessmentNotes || '',
            nextCalibrationDueDate: row.nextCalibrationDueDate || '',
            remarks: row.remarks || ''
        });
        setShowCalibrationModal(true);
    };

    const openCreateMaintenance = (eq = null) => {
        setEditingMaintenanceId(null);
        const form = getInitialMaintenanceForm();
        if (eq) {
            form.equipmentId = eq.id;
        } else if (equipments.length > 0) {
            form.equipmentId = equipments[0].id;
        }
        setMaintenanceForm(form);
        setShowMaintenanceModal(true);
    };

    const openEditMaintenance = (row) => {
        setEditingMaintenanceId(row.id);
        setMaintenanceForm({
            equipmentId: row.equipmentId || '',
            maintenanceType: row.maintenanceType || 'PREVENTIVE_PM',
            maintenanceDate: row.maintenanceDate || '',
            performer: row.performer || '',
            cost: row.cost || 0,
            maintenanceResult: row.maintenanceResult || 'COMPLETED',
            partsReplaced: row.partsReplaced || '',
            downtimeHours: row.downtimeHours || 0,
            details: row.details || '',
            verifiedBy: row.verifiedBy || '',
            nextPmDueDate: row.nextPmDueDate || '',
            remarks: row.remarks || ''
        });
        setShowMaintenanceModal(true);
    };

    const openCreateEnvironment = () => {
        setEditingEnvironmentId(null);
        setEnvironmentForm(getInitialEnvironmentForm());
        setShowEnvironmentModal(true);
    };

    const openEditEnvironment = (row) => {
        setEditingEnvironmentId(row.id);
        setEnvironmentForm({
            area: row.area || 'CLEANROOM_GRADE_C',
            monitoringDate: row.monitoringDate ? row.monitoringDate.slice(0, 16) : new Date().toISOString().slice(0, 16),
            temperature: row.temperature || 21.0,
            humidity: row.humidity || 45.0,
            differentialPressure: row.differentialPressure || 25.0,
            airborneParticles05: row.airborneParticles05 || 352000,
            airborneParticles50: row.airborneParticles50 || 2900,
            microbialCount: row.microbialCount || 10,
            status: row.status || 'NORMAL',
            inspector: row.inspector || '',
            correctiveAction: row.correctiveAction || '',
            remarks: row.remarks || ''
        });
        setShowEnvironmentModal(true);
    };

    // =========================================================================
    // 저장 및 삭제 액션
    // =========================================================================

    const handleSaveEquipment = async (e) => {
        e.preventDefault();
        try {
            if (editingEquipmentId) {
                await updateEquipment(editingEquipmentId, equipmentForm);
                toast.success('장비 정보가 성공적으로 수정되었습니다.');
            } else {
                await createEquipment(equipmentForm);
                toast.success('새 장비가 성공적으로 등록되었습니다.');
            }
            setShowEquipmentModal(false);
            loadData();
        } catch (error) {
            console.error('Save equipment failed:', error);
            toast.error(error.response?.data?.message || '장비 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteEquipment = async (id) => {
        if (!window.confirm('정말 이 장비를 삭제 처리하시겠습니까?')) return;
        try {
            await deleteEquipment(id);
            toast.success('장비가 삭제되었습니다.');
            loadData();
        } catch (error) {
            toast.error('장비 삭제 중 오류가 발생했습니다.');
        }
    };

    const handleSaveCalibration = async (e) => {
        e.preventDefault();
        try {
            if (editingCalibrationId) {
                await updateCalibrationRecord(editingCalibrationId, calibrationForm);
                toast.success('교정 성적서 정보가 수정되었습니다.');
            } else {
                await createCalibrationRecord(calibrationForm);
                toast.success('교정 성적서가 성공적으로 등록되었습니다.');
            }
            setShowCalibrationModal(false);
            loadData();
        } catch (error) {
            console.error('Save calibration failed:', error);
            toast.error(error.response?.data?.message || '교정 기록 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteCalibration = async (id) => {
        if (!window.confirm('정말 이 교정 기록을 삭제하시겠습니까?')) return;
        try {
            await deleteCalibrationRecord(id);
            toast.success('교정 기록이 삭제되었습니다.');
            loadData();
        } catch (error) {
            toast.error('교정 기록 삭제 중 오류가 발생했습니다.');
        }
    };

    const handleSaveMaintenance = async (e) => {
        e.preventDefault();
        try {
            if (editingMaintenanceId) {
                await updateMaintenanceRecord(editingMaintenanceId, maintenanceForm);
                toast.success('유지보수 기록이 수정되었습니다.');
            } else {
                await createMaintenanceRecord(maintenanceForm);
                toast.success('유지보수 기록이 등록되었습니다.');
            }
            setShowMaintenanceModal(false);
            loadData();
        } catch (error) {
            console.error('Save maintenance failed:', error);
            toast.error(error.response?.data?.message || '유지보수 기록 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteMaintenance = async (id) => {
        if (!window.confirm('정말 이 유지보수 기록을 삭제하시겠습니까?')) return;
        try {
            await deleteMaintenanceRecord(id);
            toast.success('유지보수 기록이 삭제되었습니다.');
            loadData();
        } catch (error) {
            toast.error('유지보수 기록 삭제 중 오류가 발생했습니다.');
        }
    };

    const handleSaveEnvironment = async (e) => {
        e.preventDefault();
        try {
            if (editingEnvironmentId) {
                await updateEnvironmentalMonitoring(editingEnvironmentId, environmentForm);
                toast.success('환경 모니터링 기록이 수정되었습니다.');
            } else {
                await createEnvironmentalMonitoring(environmentForm);
                toast.success('환경 모니터링 측정값이 등록되었습니다.');
            }
            setShowEnvironmentModal(false);
            loadData();
        } catch (error) {
            console.error('Save environment failed:', error);
            toast.error(error.response?.data?.message || '환경 모니터링 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteEnvironment = async (id) => {
        if (!window.confirm('정말 이 환경 모니터링 기록을 삭제하시겠습니까?')) return;
        try {
            await deleteEnvironmentalMonitoring(id);
            toast.success('환경 모니터링 기록이 삭제되었습니다.');
            loadData();
        } catch (error) {
            toast.error('환경 모니터링 삭제 중 오류가 발생했습니다.');
        }
    };

    // =========================================================================
    // CSV 내보내기
    // =========================================================================

    const handleExportCsv = () => {
        if (gridApi) {
            const todayStr = new Date().toISOString().slice(0, 10);
            gridApi.exportDataAsCsv({
                fileName: `Facility_${activeTab}_${todayStr}.csv`
            });
            toast.info('CSV 내보내기가 완료되었습니다.');
        }
    };

    // =========================================================================
    // AG Grid 컬럼 정의
    // =========================================================================

    // 1. 장비 마스터 컬럼
    const equipmentColumns = useMemo(() => [
        {
            field: 'equipmentCode',
            headerName: '관리번호',
            width: 150,
            pinned: 'left',
            cellStyle: { fontWeight: '700', color: '#1e293b' }
        },
        {
            field: 'equipmentName',
            headerName: '장비/설비명',
            width: 220,
            pinned: 'left',
            cellStyle: { fontWeight: '600', color: '#0f172a' }
        },
        {
            field: 'categoryDescription',
            headerName: '설비 구분',
            width: 160
        },
        {
            field: 'modelNumber',
            headerName: '모델명',
            width: 150
        },
        {
            field: 'serialNumber',
            headerName: '시리얼번호',
            width: 140
        },
        {
            field: 'installationLocation',
            headerName: '설치 장소',
            width: 180
        },
        {
            field: 'department',
            headerName: '관리부서',
            width: 130
        },
        {
            field: 'status',
            headerName: '가동 상태',
            width: 170,
            cellRenderer: (params) => {
                const opt = EQUIPMENT_STATUS_OPTIONS.find(o => o.value === params.value) || {
                    label: params.value, color: '#475569', bg: '#f1f5f9'
                };
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: opt.color,
                        backgroundColor: opt.bg,
                        lineHeight: 1
                    }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: opt.color, marginRight: '6px' }}></span>
                        {opt.label}
                    </span>
                );
            }
        },
        {
            field: 'criticality',
            headerName: '중요도',
            width: 130,
            cellRenderer: (params) => {
                const opt = CRITICALITY_OPTIONS.find(o => o.value === params.value);
                if (!opt) return params.value;
                return (
                    <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: opt.color,
                        backgroundColor: opt.bg,
                        border: `1px solid ${opt.color}40`
                    }}>
                        {params.value}
                    </span>
                );
            }
        },
        {
            field: 'nextCalibrationDueDate',
            headerName: '차기 교정일',
            width: 150,
            cellRenderer: (params) => {
                if (!params.value) return '-';
                const isOverdue = params.data.isCalibrationOverdue;
                const isDueSoon = params.data.isCalibrationDueSoon;
                let badgeStyle = { color: '#334155' };
                if (isOverdue) badgeStyle = { color: '#dc2626', fontWeight: '700', backgroundColor: '#fee2e2', padding: '3px 6px', borderRadius: '4px' };
                else if (isDueSoon) badgeStyle = { color: '#d97706', fontWeight: '700', backgroundColor: '#fef3c7', padding: '3px 6px', borderRadius: '4px' };
                return (
                    <span style={badgeStyle}>
                        {params.value} {isOverdue ? '⚠️만료' : isDueSoon ? '⏳임박' : ''}
                    </span>
                );
            }
        },
        {
            field: 'nextPmDueDate',
            headerName: '차기 PM일',
            width: 140,
            cellRenderer: (params) => {
                if (!params.value) return '-';
                const isPmDue = params.data.isPmDueSoon;
                return (
                    <span style={isPmDue ? { color: '#ea580c', fontWeight: '700' } : { color: '#334155' }}>
                        {params.value} {isPmDue ? '🔧도래' : ''}
                    </span>
                );
            }
        },
        {
            headerName: '관리 액션',
            width: 220,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => openCreateCalibration(params.data)}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid #8b5cf6',
                            background: '#f5f3ff',
                            color: '#6d28d9',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                        title="이 장비의 교정 성적서 등록"
                    >
                        교정
                    </button>
                    <button
                        onClick={() => openCreateMaintenance(params.data)}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid #3b82f6',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                        title="이 장비의 PM/수리 등록"
                    >
                        PM
                    </button>
                    <button
                        onClick={() => openEditEquipment(params.data)}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#334155',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }}
                    >
                        수정
                    </button>
                    <button
                        onClick={() => handleDeleteEquipment(params.data.id)}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid #fecaca',
                            background: '#fff',
                            color: '#ef4444',
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
    ], [equipments]);

    // 2. 교정 이력 컬럼
    const calibrationColumns = useMemo(() => [
        {
            field: 'calibrationNumber',
            headerName: '교정관리번호',
            width: 160,
            pinned: 'left',
            cellStyle: { fontWeight: '700', color: '#1e293b' }
        },
        {
            field: 'equipmentName',
            headerName: '대상 장비명',
            width: 200,
            pinned: 'left',
            cellRenderer: (params) => (
                <div>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{params.value}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{params.data.equipmentCode}</div>
                </div>
            )
        },
        {
            field: 'calibrationDate',
            headerName: '교정 실시일',
            width: 120
        },
        {
            field: 'agencyName',
            headerName: '교정기관명 (KOLAS)',
            width: 180,
            cellRenderer: (params) => (
                <div>
                    <div>{params.value || '-'}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{params.data.agencyTypeDescription}</div>
                </div>
            )
        },
        {
            field: 'certificateNumber',
            headerName: '성적서 번호',
            width: 160
        },
        {
            field: 'result',
            headerName: '교정 판정',
            width: 140,
            cellRenderer: (params) => {
                const opt = CALIBRATION_RESULT_OPTIONS.find(o => o.value === params.value) || {
                    label: params.value, color: '#475569', bg: '#f1f5f9'
                };
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: opt.color,
                        backgroundColor: opt.bg
                    }}>
                        {opt.label}
                    </span>
                );
            }
        },
        {
            field: 'maxDeviation',
            headerName: '최대 오차/편차',
            width: 140
        },
        {
            field: 'impactAssessmentRequired',
            headerName: '소급영향평가',
            width: 130,
            cellRenderer: (params) => (
                params.value ? (
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: '#dc2626', backgroundColor: '#fee2e2' }}>
                        ⚠️필수대상
                    </span>
                ) : (
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>해당없음</span>
                )
            )
        },
        {
            field: 'nextCalibrationDueDate',
            headerName: '차기 예정일',
            width: 130
        },
        {
            field: 'verifiedBy',
            headerName: '승인/검토자',
            width: 110
        },
        {
            headerName: '관리',
            width: 140,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => openEditCalibration(params.data)}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#334155',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }}
                    >
                        수정
                    </button>
                    <button
                        onClick={() => handleDeleteCalibration(params.data.id)}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid #fecaca',
                            background: '#fff',
                            color: '#ef4444',
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

    // 3. 유지보수 이력 컬럼
    const maintenanceColumns = useMemo(() => [
        {
            field: 'maintenanceNumber',
            headerName: '보전관리번호',
            width: 160,
            pinned: 'left',
            cellStyle: { fontWeight: '700', color: '#1e293b' }
        },
        {
            field: 'equipmentName',
            headerName: '대상 장비명',
            width: 200,
            pinned: 'left',
            cellRenderer: (params) => (
                <div>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{params.value}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{params.data.equipmentCode}</div>
                </div>
            )
        },
        {
            field: 'maintenanceType',
            headerName: '작업 구분',
            width: 150,
            cellRenderer: (params) => {
                const opt = MAINTENANCE_TYPE_OPTIONS.find(o => o.value === params.value) || {
                    label: params.value, color: '#475569', bg: '#f1f5f9'
                };
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: opt.color,
                        backgroundColor: opt.bg
                    }}>
                        {opt.label}
                    </span>
                );
            }
        },
        {
            field: 'maintenanceDate',
            headerName: '작업 일자',
            width: 120
        },
        {
            field: 'performer',
            headerName: '작업자/업체',
            width: 150
        },
        {
            field: 'maintenanceResult',
            headerName: '작업 결과',
            width: 130,
            cellRenderer: (params) => {
                const opt = MAINTENANCE_RESULT_OPTIONS.find(o => o.value === params.value) || {
                    label: params.value, color: '#475569', bg: '#f1f5f9'
                };
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: opt.color,
                        backgroundColor: opt.bg
                    }}>
                        {opt.label}
                    </span>
                );
            }
        },
        {
            field: 'downtimeHours',
            headerName: '다운타임(h)',
            width: 110,
            cellRenderer: (params) => params.value ? `${params.value}시간` : '-'
        },
        {
            field: 'partsReplaced',
            headerName: '교체 부품 내역',
            width: 200
        },
        {
            field: 'cost',
            headerName: '소요 비용',
            width: 130,
            cellRenderer: (params) => params.value ? `₩${Number(params.value).toLocaleString()}` : '₩0'
        },
        {
            field: 'nextPmDueDate',
            headerName: '차기 PM 예정일',
            width: 130
        },
        {
            headerName: '관리',
            width: 140,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => openEditMaintenance(params.data)}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#334155',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }}
                    >
                        수정
                    </button>
                    <button
                        onClick={() => handleDeleteMaintenance(params.data.id)}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid #fecaca',
                            background: '#fff',
                            color: '#ef4444',
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

    // 4. 환경 모니터링 컬럼
    const environmentColumns = useMemo(() => [
        {
            field: 'monitoringNumber',
            headerName: '모니터링번호',
            width: 160,
            pinned: 'left',
            cellStyle: { fontWeight: '700', color: '#1e293b' }
        },
        {
            field: 'areaDescription',
            headerName: '측정 구역',
            width: 190,
            pinned: 'left',
            cellStyle: { fontWeight: '600' }
        },
        {
            field: 'monitoringDate',
            headerName: '측정 일시',
            width: 160,
            cellRenderer: (params) => params.value ? params.value.replace('T', ' ').slice(0, 16) : '-'
        },
        {
            field: 'temperature',
            headerName: '온도 (℃)',
            width: 110,
            cellRenderer: (params) => params.value !== null ? `${params.value} ℃` : '-'
        },
        {
            field: 'humidity',
            headerName: '습도 (%)',
            width: 110,
            cellRenderer: (params) => params.value !== null ? `${params.value} %` : '-'
        },
        {
            field: 'differentialPressure',
            headerName: '차압 (Pa)',
            width: 110,
            cellRenderer: (params) => params.value !== null ? `${params.value} Pa` : '-'
        },
        {
            field: 'airborneParticles05',
            headerName: '부유미립자(0.5μm)',
            width: 150,
            cellRenderer: (params) => params.value !== null ? Number(params.value).toLocaleString() : '-'
        },
        {
            field: 'airborneParticles50',
            headerName: '부유미립자(5.0μm)',
            width: 150,
            cellRenderer: (params) => params.value !== null ? Number(params.value).toLocaleString() : '-'
        },
        {
            field: 'microbialCount',
            headerName: '낙하균(CFU)',
            width: 120,
            cellRenderer: (params) => params.value !== null ? `${params.value} CFU` : '-'
        },
        {
            field: 'status',
            headerName: '판정 상태',
            width: 130,
            cellRenderer: (params) => {
                const opt = ENVIRONMENTAL_STATUS_OPTIONS.find(o => o.value === params.value) || {
                    label: params.value, color: '#475569', bg: '#f1f5f9'
                };
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: opt.color,
                        backgroundColor: opt.bg
                    }}>
                        {opt.label}
                    </span>
                );
            }
        },
        {
            field: 'inspector',
            headerName: '측정자',
            width: 120
        },
        {
            headerName: '관리',
            width: 140,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => openEditEnvironment(params.data)}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#334155',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }}
                    >
                        수정
                    </button>
                    <button
                        onClick={() => handleDeleteEnvironment(params.data.id)}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid #fecaca',
                            background: '#fff',
                            color: '#ef4444',
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

    // =========================================================================
    // 필터링된 데이터셋
    // =========================================================================

    const filteredEquipments = useMemo(() => {
        if (!searchTerm) return equipments;
        const q = searchTerm.toLowerCase();
        return equipments.filter(e =>
            (e.equipmentCode && e.equipmentCode.toLowerCase().includes(q)) ||
            (e.equipmentName && e.equipmentName.toLowerCase().includes(q)) ||
            (e.installationLocation && e.installationLocation.toLowerCase().includes(q)) ||
            (e.modelNumber && e.modelNumber.toLowerCase().includes(q)) ||
            (e.department && e.department.toLowerCase().includes(q))
        );
    }, [equipments, searchTerm]);

    const filteredCalibrations = useMemo(() => {
        if (!searchTerm) return calibrations;
        const q = searchTerm.toLowerCase();
        return calibrations.filter(c =>
            (c.calibrationNumber && c.calibrationNumber.toLowerCase().includes(q)) ||
            (c.equipmentName && c.equipmentName.toLowerCase().includes(q)) ||
            (c.certificateNumber && c.certificateNumber.toLowerCase().includes(q)) ||
            (c.agencyName && c.agencyName.toLowerCase().includes(q))
        );
    }, [calibrations, searchTerm]);

    const filteredMaintenances = useMemo(() => {
        if (!searchTerm) return maintenances;
        const q = searchTerm.toLowerCase();
        return maintenances.filter(m =>
            (m.maintenanceNumber && m.maintenanceNumber.toLowerCase().includes(q)) ||
            (m.equipmentName && m.equipmentName.toLowerCase().includes(q)) ||
            (m.performer && m.performer.toLowerCase().includes(q)) ||
            (m.details && m.details.toLowerCase().includes(q))
        );
    }, [maintenances, searchTerm]);

    const filteredEnvironments = useMemo(() => {
        if (!searchTerm) return environments;
        const q = searchTerm.toLowerCase();
        return environments.filter(env =>
            (env.monitoringNumber && env.monitoringNumber.toLowerCase().includes(q)) ||
            (env.areaDescription && env.areaDescription.toLowerCase().includes(q)) ||
            (env.inspector && env.inspector.toLowerCase().includes(q))
        );
    }, [environments, searchTerm]);

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
            {/* 1. 상단 3-Tier 표준 헤더 */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>
                            품질경영시스템 (eQMS) &gt; 인프라 및 시험설비 관리 &gt; 시설·교정·유지보수
                        </div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                            🛠️ 시설·설비, 교정(Calibration) 및 환경 모니터링 관리
                        </h1>
                        <p style={{ fontSize: '14px', color: '#475569', margin: '4px 0 0 0' }}>
                            ISO 13485:2016 §6.3/§6.4/§7.6, ISO 22716:2007 §4/§5, 21 CFR 820.70/820.72 기반 국가표준 소급성 교정 주기, 예방보전(PM) 및 청정실 환경 통제
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleExportCsv}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '9px 14px',
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                color: '#334155',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            📊 CSV 내보내기
                        </button>
                        <button
                            onClick={loadData}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '9px 14px',
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                color: '#334155',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            🔄 새로고침
                        </button>
                        {activeTab === 'EQUIPMENT' && (
                            <button
                                onClick={openCreateEquipment}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 16px',
                                    border: 'none',
                                    background: '#0284c7',
                                    color: '#fff',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)'
                                }}
                            >
                                ➕ 신규 장비 등록
                            </button>
                        )}
                        {activeTab === 'CALIBRATION' && (
                            <button
                                onClick={() => openCreateCalibration()}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 16px',
                                    border: 'none',
                                    background: '#7c3aed',
                                    color: '#fff',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(124, 58, 237, 0.3)'
                                }}
                            >
                                ➕ 교정 성적서 등록
                            </button>
                        )}
                        {activeTab === 'MAINTENANCE' && (
                            <button
                                onClick={() => openCreateMaintenance()}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 16px',
                                    border: 'none',
                                    background: '#2563eb',
                                    color: '#fff',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
                                }}
                            >
                                ➕ 유지보수(PM) 등록
                            </button>
                        )}
                        {activeTab === 'ENVIRONMENT' && (
                            <button
                                onClick={openCreateEnvironment}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 16px',
                                    border: 'none',
                                    background: '#059669',
                                    color: '#fff',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)'
                                }}
                            >
                                ➕ 환경 측정값 등록
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. 표준 규제 매뉴얼 배너 */}
                <RegulatoryManualBanner
                    guideKey="facilityManagement"
                    standardCode="ISO 13485:2016 §6.3, §6.4, §7.6 / ISO 22716:2007 §4, §5 / 21 CFR 820.70, 820.72"
                    sopDocId="SOP-EQ-01"
                    onNavigate={onNavigate}
                />
            </div>

            {/* 3. 6개 실시간 종합 반응형 KPI 카드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>총 관리 설비</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '6px 0 2px 0' }}>{kpi.totalEquipment} <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>대</span></div>
                    <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600' }}>계측기·제조설비·공조</div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>정상 가동률</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#16a34a', margin: '6px 0 2px 0' }}>{kpi.operationalRate}%</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>가동 중 {kpi.operationalEquipment}대</div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>교정 요주의 (만료/30일)</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: kpi.totalCalibrationAttention > 0 ? '#ea580c' : '#0f172a', margin: '6px 0 2px 0' }}>
                        {kpi.totalCalibrationAttention} <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '12px', color: kpi.overdueCalibrations > 0 ? '#dc2626' : '#64748b', fontWeight: '600' }}>
                        만료: {kpi.overdueCalibrations}건 / 임박: {kpi.dueSoonCalibrations}건
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>예방보전(PM) 도래</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#2563eb', margin: '6px 0 2px 0' }}>{kpi.dueSoonPm} <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>건</span></div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>30일 이내 정기점검 대상</div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>교정 불합격 / OOS</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: kpi.failedCalibrations > 0 ? '#dc2626' : '#16a34a', margin: '6px 0 2px 0' }}>
                        {kpi.failedCalibrations} <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '12px', color: kpi.failedCalibrations > 0 ? '#dc2626' : '#64748b', fontWeight: '600' }}>
                        {kpi.failedCalibrations > 0 ? '소급 영향평가 요망' : '이상 무'}
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>환경 OOS 기준이탈</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: kpi.recentEnvironmentalOos > 0 ? '#dc2626' : '#16a34a', margin: '6px 0 2px 0' }}>
                        {kpi.recentEnvironmentalOos} <span style={{ fontSize: '13px', fontWeight: '500', color: '#94a3b8' }}>건</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>최근 30일 청정실 이탈</div>
                </div>
            </div>

            {/* 4. 탭 네비게이션 & 검색 바 */}
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setActiveTab('EQUIPMENT')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            backgroundColor: activeTab === 'EQUIPMENT' ? '#0f172a' : '#f1f5f9',
                            color: activeTab === 'EQUIPMENT' ? '#fff' : '#475569'
                        }}
                    >
                        ⚙️ 장비/설비 마스터 원장 ({equipments.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('CALIBRATION')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            backgroundColor: activeTab === 'CALIBRATION' ? '#0f172a' : '#f1f5f9',
                            color: activeTab === 'CALIBRATION' ? '#fff' : '#475569'
                        }}
                    >
                        🎯 교정(Calibration) 이력 & 성적서 ({calibrations.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('MAINTENANCE')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            backgroundColor: activeTab === 'MAINTENANCE' ? '#0f172a' : '#f1f5f9',
                            color: activeTab === 'MAINTENANCE' ? '#fff' : '#475569'
                        }}
                    >
                        🔧 유지보수 및 예방보전(PM) ({maintenances.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('ENVIRONMENT')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            backgroundColor: activeTab === 'ENVIRONMENT' ? '#0f172a' : '#f1f5f9',
                            color: activeTab === 'ENVIRONMENT' ? '#fff' : '#475569'
                        }}
                    >
                        🌡️ 청정실·작업환경 모니터링 ({environments.length})
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="관리번호, 장비명, 성적서, 작업내용 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '260px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            style={{
                                padding: '8px 10px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            초기화
                        </button>
                    )}
                </div>
            </div>

            {/* 5. AG Grid 테이블 영역 */}
            <div className="ag-theme-alpine" style={{ width: '100%', height: 'calc(100vh - 420px)', minHeight: '460px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                {activeTab === 'EQUIPMENT' && (
                    <AgGridReact
                        theme="legacy"
                        rowData={filteredEquipments}
                        columnDefs={equipmentColumns}
                        rowHeight={54}
                        headerHeight={48}
                        onGridReady={(params) => setGridApi(params.api)}
                        pagination={true}
                        paginationPageSize={15}
                        animateRows={true}
                        overlayNoRowsTemplate="<span>등록된 장비/설비 내역이 없습니다.</span>"
                    />
                )}

                {activeTab === 'CALIBRATION' && (
                    <AgGridReact
                        theme="legacy"
                        rowData={filteredCalibrations}
                        columnDefs={calibrationColumns}
                        rowHeight={54}
                        headerHeight={48}
                        onGridReady={(params) => setGridApi(params.api)}
                        pagination={true}
                        paginationPageSize={15}
                        animateRows={true}
                        overlayNoRowsTemplate="<span>등록된 교정 성적서 및 이력이 없습니다.</span>"
                    />
                )}

                {activeTab === 'MAINTENANCE' && (
                    <AgGridReact
                        theme="legacy"
                        rowData={filteredMaintenances}
                        columnDefs={maintenanceColumns}
                        rowHeight={54}
                        headerHeight={48}
                        onGridReady={(params) => setGridApi(params.api)}
                        pagination={true}
                        paginationPageSize={15}
                        animateRows={true}
                        overlayNoRowsTemplate="<span>등록된 유지보수/PM 이력이 없습니다.</span>"
                    />
                )}

                {activeTab === 'ENVIRONMENT' && (
                    <AgGridReact
                        theme="legacy"
                        rowData={filteredEnvironments}
                        columnDefs={environmentColumns}
                        rowHeight={54}
                        headerHeight={48}
                        onGridReady={(params) => setGridApi(params.api)}
                        pagination={true}
                        paginationPageSize={15}
                        animateRows={true}
                        overlayNoRowsTemplate="<span>등록된 청정실 환경 모니터링 기록이 없습니다.</span>"
                    />
                )}
            </div>

            {/* ========================================================================= */}
            {/* Modal 1: 장비/설비 등록 및 수정 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {showEquipmentModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '16px 24px', backgroundColor: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                    {editingEquipmentId ? '⚙️ 장비/설비 마스터 수정' : '⚙️ 신규 장비/설비 마스터 등록'}
                                </h2>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                                    ISO 13485:2016 §6.3 / 21 CFR 820.70(g) 장비 규격 및 교정·PM 주기 설정
                                </p>
                            </div>
                            <button
                                onClick={() => setShowEquipmentModal(false)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveEquipment} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>1. 기본 장비 정보</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>장비명 *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="예: 고성능 액체크로마토그래피 (HPLC)"
                                                value={equipmentForm.equipmentName}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, equipmentName: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>설비 구분 *</label>
                                            <select
                                                value={equipmentForm.category}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, category: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            >
                                                {EQUIPMENT_CATEGORY_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>가동 상태 *</label>
                                            <select
                                                value={equipmentForm.status}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, status: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            >
                                                {EQUIPMENT_STATUS_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>모델명</label>
                                            <input
                                                type="text"
                                                placeholder="예: 1260 Infinity II"
                                                value={equipmentForm.modelNumber}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, modelNumber: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>일련번호 (Serial No.)</label>
                                            <input
                                                type="text"
                                                placeholder="예: DEAGB01928"
                                                value={equipmentForm.serialNumber}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, serialNumber: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>제조사</label>
                                            <input
                                                type="text"
                                                placeholder="예: Agilent Technologies"
                                                value={equipmentForm.manufacturer}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, manufacturer: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>2. 설치 및 관리 책임</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>설치 장소</label>
                                            <input
                                                type="text"
                                                placeholder="예: 제1시험실 (HPLC실) / Grade D 충전실"
                                                value={equipmentForm.installationLocation}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, installationLocation: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>관리 부서</label>
                                            <input
                                                type="text"
                                                placeholder="예: 품질관리팀 / 생산팀"
                                                value={equipmentForm.department}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, department: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>관리 책임자</label>
                                            <input
                                                type="text"
                                                placeholder="예: 김연구 책임"
                                                value={equipmentForm.managerName}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, managerName: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>설치 일자</label>
                                            <input
                                                type="date"
                                                value={equipmentForm.installationDate}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, installationDate: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>품질 중요도 *</label>
                                            <select
                                                value={equipmentForm.criticality}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, criticality: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            >
                                                {CRITICALITY_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>3. 교정(Calibration) 및 예방보전(PM) 주기</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>교정 주기 (개월)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={equipmentForm.calibrationCycleMonths}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, calibrationCycleMonths: parseInt(e.target.value) || 12 })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>최종 교정일자</label>
                                            <input
                                                type="date"
                                                value={equipmentForm.lastCalibrationDate}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, lastCalibrationDate: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>차기 교정 예정일</label>
                                            <input
                                                type="date"
                                                value={equipmentForm.nextCalibrationDueDate}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, nextCalibrationDueDate: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>예방보전(PM) 주기 (개월)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="36"
                                                value={equipmentForm.pmCycleMonths}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, pmCycleMonths: parseInt(e.target.value) || 6 })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>최종 PM 일자</label>
                                            <input
                                                type="date"
                                                value={equipmentForm.lastPmDate}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, lastPmDate: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>차기 PM 예정일</label>
                                            <input
                                                type="date"
                                                value={equipmentForm.nextPmDueDate}
                                                onChange={(e) => setEquipmentForm({ ...equipmentForm, nextPmDueDate: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>4. 상세 규격 및 비고</h3>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>설비 사양 및 스펙 (Specifications)</label>
                                        <textarea
                                            rows={3}
                                            placeholder="설비 용량, 검출기 종류, 유속 범위 등"
                                            value={equipmentForm.specifications}
                                            onChange={(e) => setEquipmentForm({ ...equipmentForm, specifications: e.target.value })}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>특이사항 및 비고</label>
                                        <textarea
                                            rows={2}
                                            placeholder="참조 사항 기재"
                                            value={equipmentForm.remarks}
                                            onChange={(e) => setEquipmentForm({ ...equipmentForm, remarks: e.target.value })}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '16px 24px', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowEquipmentModal(false)}
                                    style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 24px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: '700', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                                >
                                    {editingEquipmentId ? '수정사항 저장' : '장비 등록 완료'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* Modal 2: 교정 성적서 등록 및 판정 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {showCalibrationModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '16px 24px', backgroundColor: '#4c1d95', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                    {editingCalibrationId ? '🎯 교정 성적서 및 판정 수정' : '🎯 교정 성적서 등록 및 적합성 판정'}
                                </h2>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#c4b5fd' }}>
                                    ISO 13485:2016 §7.6 / 21 CFR 820.72 국가표준 소급성 교정 성적서 및 불합격 영향평가 관리
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCalibrationModal(false)}
                                style={{ background: 'none', border: 'none', color: '#c4b5fd', fontSize: '20px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveCalibration} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>1. 교정 대상 설비 및 기관</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>대상 장비 *</label>
                                            <select
                                                value={calibrationForm.equipmentId}
                                                onChange={(e) => setCalibrationForm({ ...calibrationForm, equipmentId: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                                required
                                            >
                                                {equipments.map(eq => (
                                                    <option key={eq.id} value={eq.id}>
                                                        [{eq.equipmentCode}] {eq.equipmentName} ({eq.installationLocation || '위치미정'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>교정 실시일자 *</label>
                                            <input
                                                type="date"
                                                required
                                                value={calibrationForm.calibrationDate}
                                                onChange={(e) => setCalibrationForm({ ...calibrationForm, calibrationDate: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>교정 기관 구분 *</label>
                                            <select
                                                value={calibrationForm.agencyType}
                                                onChange={(e) => setCalibrationForm({ ...calibrationForm, agencyType: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            >
                                                {CALIBRATION_AGENCY_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>교정 기관명</label>
                                            <input
                                                type="text"
                                                placeholder="예: 한국표준과학연구원 (KRISS)"
                                                value={calibrationForm.agencyName}
                                                onChange={(e) => setCalibrationForm({ ...calibrationForm, agencyName: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>교정 성적서 번호 *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="예: KOLAS-CAL-2026-00123"
                                                value={calibrationForm.certificateNumber}
                                                onChange={(e) => setCalibrationForm({ ...calibrationForm, certificateNumber: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>성적서 PDF 파일 URL</label>
                                            <input
                                                type="text"
                                                placeholder="/files/calibration/cert_2026.pdf"
                                                value={calibrationForm.certificateFileUrl}
                                                onChange={(e) => setCalibrationForm({ ...calibrationForm, certificateFileUrl: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>2. 교정 결과 및 허용오차 판정</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>교정 판정 결과 *</label>
                                            <select
                                                value={calibrationForm.result}
                                                onChange={(e) => setCalibrationForm({
                                                    ...calibrationForm,
                                                    result: e.target.value,
                                                    impactAssessmentRequired: e.target.value === 'FAIL'
                                                })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    borderRadius: '6px',
                                                    border: `2px solid ${calibrationForm.result === 'FAIL' ? '#dc2626' : '#cbd5e1'}`,
                                                    fontSize: '14px',
                                                    fontWeight: '700',
                                                    boxSizing: 'border-box'
                                                }}
                                            >
                                                {CALIBRATION_RESULT_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>허용 오차 기준</label>
                                            <input
                                                type="text"
                                                placeholder="예: ±1.0% 이내, ±0.5℃ 이내"
                                                value={calibrationForm.toleranceStandard}
                                                onChange={(e) => setCalibrationForm({ ...calibrationForm, toleranceStandard: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>실측 최대 편차</label>
                                            <input
                                                type="text"
                                                placeholder="예: +0.12%, +0.15℃"
                                                value={calibrationForm.maxDeviation}
                                                onChange={(e) => setCalibrationForm({ ...calibrationForm, maxDeviation: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>교정 실시자</label>
                                            <input
                                                type="text"
                                                placeholder="예: 김공인 기사"
                                                value={calibrationForm.calibratedBy}
                                                onChange={(e) => setCalibrationForm({ ...calibrationForm, calibratedBy: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>승인/검토자</label>
                                            <input
                                                type="text"
                                                placeholder="예: 품질책임자 이영희"
                                                value={calibrationForm.verifiedBy}
                                                onChange={(e) => setCalibrationForm({ ...calibrationForm, verifiedBy: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>차기 교정 예정일 (미입력 시 주기 자동계산)</label>
                                            <input
                                                type="date"
                                                value={calibrationForm.nextCalibrationDueDate}
                                                onChange={(e) => setCalibrationForm({ ...calibrationForm, nextCalibrationDueDate: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 불합격 시 소급 영향평가 강제 섹션 */}
                                {calibrationForm.result === 'FAIL' && (
                                    <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '18px' }}>🚨</span>
                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#991b1b' }}>
                                                [규제 가드] 교정 불합격(FAIL/OOS)에 따른 제품 소급 품질 영향평가
                                            </h3>
                                        </div>
                                        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#7f1d1d' }}>
                                            ISO 13485:2016 §7.6 및 21 CFR 820.72에 따라 교정 불합격 시 해당 장비는 즉시 [사용 중지] 상태로 전환되며,
                                            직전 유효 교정 시점 이후 해당 장비로 시험/제조된 로트에 대한 소급 영향평가(NCR/CAPA 검토)를 반드시 기술해야 합니다.
                                        </p>
                                        <textarea
                                            rows={3}
                                            required
                                            placeholder="불합격 원인, 과거 시험/제조 로트 영향 범위, 출하 보류(HOLD) 여부 및 CAPA 연계 번호를 상세히 기록하세요."
                                            value={calibrationForm.impactAssessmentNotes}
                                            onChange={(e) => setCalibrationForm({ ...calibrationForm, impactAssessmentNotes: e.target.value })}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #f87171', fontSize: '14px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                )}

                                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>3. 기타 비고</h3>
                                    <textarea
                                        rows={2}
                                        placeholder="성적서 보관 위치 및 비고 사항"
                                        value={calibrationForm.remarks}
                                        onChange={(e) => setCalibrationForm({ ...calibrationForm, remarks: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div style={{ padding: '16px 24px', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCalibrationModal(false)}
                                    style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 24px', border: 'none', background: '#7c3aed', color: '#fff', fontWeight: '700', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                                >
                                    {editingCalibrationId ? '수정사항 저장' : '교정 성적서 등록'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* Modal 3: 유지보수 및 예방보전(PM) 등록 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {showMaintenanceModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '16px 24px', backgroundColor: '#1e3a8a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                    {editingMaintenanceId ? '🔧 유지보수(PM/수리) 기록 수정' : '🔧 예방보전(PM) 및 유지보수 작업 등록'}
                                </h2>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#93c5fd' }}>
                                    ISO 13485:2016 §6.3 / ISO 22716 §5 설비 보전, 부품 교체 및 다운타임 관리
                                </p>
                            </div>
                            <button
                                onClick={() => setShowMaintenanceModal(false)}
                                style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: '20px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveMaintenance} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>1. 작업 개요 및 대상 설비</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>대상 장비 *</label>
                                            <select
                                                value={maintenanceForm.equipmentId}
                                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, equipmentId: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                                required
                                            >
                                                {equipments.map(eq => (
                                                    <option key={eq.id} value={eq.id}>
                                                        [{eq.equipmentCode}] {eq.equipmentName} ({eq.installationLocation || '위치미정'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>작업 구분 *</label>
                                            <select
                                                value={maintenanceForm.maintenanceType}
                                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenanceType: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            >
                                                {MAINTENANCE_TYPE_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>작업 일자 *</label>
                                            <input
                                                type="date"
                                                required
                                                value={maintenanceForm.maintenanceDate}
                                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenanceDate: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>작업자 / 외주업체명 *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="예: 시설팀 정대리 / 한선엔지니어링 기술팀"
                                                value={maintenanceForm.performer}
                                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performer: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>작업 결과 *</label>
                                            <select
                                                value={maintenanceForm.maintenanceResult}
                                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenanceResult: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            >
                                                {MAINTENANCE_RESULT_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>소요 비용 (원)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={maintenanceForm.cost}
                                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: parseFloat(e.target.value) || 0 })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>2. 작업 상세 및 교체 부품</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>교체 부품 내역</label>
                                            <input
                                                type="text"
                                                placeholder="예: 메카니컬 씰, Viton O-Ring 2EA, HEPA 필터"
                                                value={maintenanceForm.partsReplaced}
                                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, partsReplaced: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>설비 다운타임 (시간)</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                placeholder="예: 4.0"
                                                value={maintenanceForm.downtimeHours}
                                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, downtimeHours: parseFloat(e.target.value) || 0 })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>작업 상세 내용 *</label>
                                        <textarea
                                            rows={4}
                                            required
                                            placeholder="점검 항목, 부품 교체 전/후 상태, 기밀도 테스트 결과 등을 기술하세요."
                                            value={maintenanceForm.details}
                                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, details: e.target.value })}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>작업 확인자</label>
                                            <input
                                                type="text"
                                                placeholder="예: 생산팀 박과장"
                                                value={maintenanceForm.verifiedBy}
                                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, verifiedBy: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>차기 PM 예정일 (미입력 시 주기 자동계산)</label>
                                            <input
                                                type="date"
                                                value={maintenanceForm.nextPmDueDate}
                                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, nextPmDueDate: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '16px 24px', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowMaintenanceModal(false)}
                                    style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 24px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: '700', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                                >
                                    {editingMaintenanceId ? '수정사항 저장' : '유지보수 기록 등록'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* Modal 4: 청정실 & 작업환경 모니터링 등록 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {showEnvironmentModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        width: '96vw',
                        height: '92vh',
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '16px 24px', backgroundColor: '#065f46', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                                    {editingEnvironmentId ? '🌡️ 환경 모니터링 기록 수정' : '🌡️ 청정실 & 작업환경 측정치 등록'}
                                </h2>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#a7f3d0' }}>
                                    ISO 13485:2016 §6.4 / ISO 22716 §4 온도, 습도, 차압, 미립자, 미생물 환경 모니터링
                                </p>
                            </div>
                            <button
                                onClick={() => setShowEnvironmentModal(false)}
                                style={{ background: 'none', border: 'none', color: '#a7f3d0', fontSize: '20px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveEnvironment} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>1. 모니터링 구역 및 시점</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>측정 구역 *</label>
                                            <select
                                                value={environmentForm.area}
                                                onChange={(e) => setEnvironmentForm({ ...environmentForm, area: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            >
                                                {ENVIRONMENTAL_AREA_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>측정 일시 *</label>
                                            <input
                                                type="datetime-local"
                                                required
                                                value={environmentForm.monitoringDate}
                                                onChange={(e) => setEnvironmentForm({ ...environmentForm, monitoringDate: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>측정 담당자 *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="예: 품질환경원 최수민"
                                                value={environmentForm.inspector}
                                                onChange={(e) => setEnvironmentForm({ ...environmentForm, inspector: e.target.value })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>2. 환경 측정 파라미터 (온습도·차압·미립자·낙하균)</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>온도 (℃)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                placeholder="예: 21.5"
                                                value={environmentForm.temperature}
                                                onChange={(e) => setEnvironmentForm({ ...environmentForm, temperature: parseFloat(e.target.value) || 0 })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>습도 (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                placeholder="예: 48.0"
                                                value={environmentForm.humidity}
                                                onChange={(e) => setEnvironmentForm({ ...environmentForm, humidity: parseFloat(e.target.value) || 0 })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>차압 (Pa - 양압/음압)</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                placeholder="예: 25.0 (양압) 또는 -12.5 (음압)"
                                                value={environmentForm.differentialPressure}
                                                onChange={(e) => setEnvironmentForm({ ...environmentForm, differentialPressure: parseFloat(e.target.value) || 0 })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>부유 미립자 (0.5μm / m³)</label>
                                            <input
                                                type="number"
                                                placeholder="예: 284000"
                                                value={environmentForm.airborneParticles05}
                                                onChange={(e) => setEnvironmentForm({ ...environmentForm, airborneParticles05: parseInt(e.target.value) || 0 })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>부유 미립자 (5.0μm / m³)</label>
                                            <input
                                                type="number"
                                                placeholder="예: 1850"
                                                value={environmentForm.airborneParticles50}
                                                onChange={(e) => setEnvironmentForm({ ...environmentForm, airborneParticles50: parseInt(e.target.value) || 0 })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>미생물 낙하균 (CFU / Plate)</label>
                                            <input
                                                type="number"
                                                placeholder="예: 8"
                                                value={environmentForm.microbialCount}
                                                onChange={(e) => setEnvironmentForm({ ...environmentForm, microbialCount: parseInt(e.target.value) || 0 })}
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>판정 상태 *</label>
                                        <select
                                            value={environmentForm.status}
                                            onChange={(e) => setEnvironmentForm({ ...environmentForm, status: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: `2px solid ${environmentForm.status === 'OUT_OF_SPEC' ? '#dc2626' : '#cbd5e1'}`,
                                                fontSize: '14px',
                                                fontWeight: '700',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            {ENVIRONMENTAL_STATUS_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {environmentForm.status === 'OUT_OF_SPEC' && (
                                    <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '20px' }}>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '700', color: '#991b1b' }}>
                                            ⚠️ 청정실 기준 이탈(OOS)에 따른 즉시 시정조치 내용
                                        </h3>
                                        <textarea
                                            rows={3}
                                            required
                                            placeholder="환기율 상향, 공조기 필터 점검, 출입 인원 제한 및 재측정 조치 내용을 상세히 기록하세요."
                                            value={environmentForm.correctiveAction}
                                            onChange={(e) => setEnvironmentForm({ ...environmentForm, correctiveAction: e.target.value })}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #f87171', fontSize: '14px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '16px 24px', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowEnvironmentModal(false)}
                                    style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 24px', border: 'none', background: '#059669', color: '#fff', fontWeight: '700', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                                >
                                    {editingEnvironmentId ? '수정사항 저장' : '환경 측정값 등록'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
