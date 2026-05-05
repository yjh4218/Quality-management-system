import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { getRoles, createRole, updateRole, deleteRole, getDashboardLayouts } from './api';
import * as api from './api';
import { toast } from 'react-toastify';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';

/**
 * 시스템 권한 관리 페이지
 * [디자인 표준화] 제품코드 마스터의 40px 여백 및 표준 헤더 레이아웃을 적용했습니다.
 * [UX 개선] 권한 목록을 Ag-Grid로 유지하되, 헤더와 버튼 배치를 시스템 표준에 맞춰 정렬했습니다.
 */

const MENU_OPTIONS = [
    { key: 'dashboard', category: '시스템', label: '시스템 대시보드 (제조사 접근 필요)', actions: ['VIEW'] },
    { key: 'users', category: '시스템', label: '사용자 승인 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'accessLogs', category: '시스템', label: '사용자 접근 로그', actions: ['VIEW'] },
    { key: 'bugReports', category: '시스템', label: '버그 리포트 관리', actions: ['VIEW', 'EDIT'] },
    { key: 'logs', category: '시스템', label: '시스템 변경 이력', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'roles', category: '시스템', label: '권한 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'products', category: '마스터', label: '제품코드 마스터', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'bomMaster', category: '마스터', label: '구성품 BOM 마스터 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'bomCategories', category: '마스터', label: 'BOM 유형 설정/관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'manufacturerAuditItems', category: '마스터', label: '제조사 점검항목 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'packagingTemplates', category: '마스터', label: '포장공정 템플릿 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'packagingRules', category: '마스터', label: '채널별 포장 규칙 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'brands', category: '운영', label: '브랜드 마스터 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'manufacturers', category: '운영', label: '제조사 정보 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'salesChannels', category: '운영', label: '유통 채널 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'manufacturerAudits', category: '운영', label: '제조사 Audit 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'manufacturerAuditDashboard', category: '운영', label: '제조사 Audit 대시보드', actions: ['VIEW'] },
    { key: 'quality', category: '운영', label: '입고 품질 관리 (제조사 접근 필요)', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'releaseRecord', category: '운영', label: '시장출하 적부판정 기록', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'qualityPhotoAudit', category: '운영', label: '신제품 생산감리(사진감리)', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'claims', category: '클레임', label: '클레임 조회 및 입력 (제조사 접근 필요)', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'claimDashboard', category: '클레임', label: '클레임 대시보드', actions: ['VIEW'] },
];

const FUNCTIONAL_PERMISSIONS = [
    { key: 'AUDIT_DISCLOSE_MANAGE', label: '📸 사진감리 제조사 공개 제어', description: '생산감리 리스트에서 제조사 공개/비공개 여부를 설정할 수 있습니다.' },
    { key: 'PRODUCT_DISCLOSE_MANAGE', label: '📦 제품 마스터 제조사 공개 제어', description: '제품 상세에서 제조사 공개/비공개 여부를 설정할 수 있습니다.' },
    { key: 'PRODUCT_MASTER_MANAGE', label: '🛠️ 제품 마스터 등록/수정 권한', description: '신규 제품 등록 및 기존 마스터 정보를 수정할 수 있는 마스터 권한입니다.' },
    { key: 'DASHBOARD_QUALITY_VIEW', label: '📊 품질 대시보드 조회 권한', description: '품질 지표, 입고 현황, 체적 가안/확정 등 품질팀용 대시보드를 조회합니다.' },
    { key: 'DASHBOARD_SALES_VIEW', label: '📈 영업 대시보드 조회 권한', description: '신제품 현황, 체적 확정 내역 등 영업팀용 대시보드를 조회합니다.' },
    { key: 'SENSITIVE_DATA_VIEW', label: '🕵️ 민감 정보(BOM/원가) 조회', description: '제품의 원재료 및 단가 등 민감한 비즈니스 데이터를 조회할 수 있습니다.' },
    { key: 'PRODUCT_PACKAGING_VIEW', label: '📦 제품 포장재/사양서 조회 권한', description: '제품 마스터에서 포장재 정보 및 사양서 탭을 조회할 수 있는 권한입니다.' },
    { key: 'AUDIT_EDIT_APPROVED', label: '🛡️ 승인된 생산감리 수정 권한', description: '이미 [승인됨] 상태인 생산감리 항목을 예외적으로 수정할 수 있는 권한입니다.' }
];

const FP_DEPENDENCIES = {
    'AUDIT_DISCLOSE_MANAGE': 'qualityPhotoAudit',
    'PRODUCT_DISCLOSE_MANAGE': 'products',
    'PRODUCT_MASTER_MANAGE': 'products',
    'DASHBOARD_QUALITY_VIEW': 'dashboard',
    'DASHBOARD_SALES_VIEW': 'dashboard',
    'SENSITIVE_DATA_VIEW': 'bomMaster',
    'PRODUCT_PACKAGING_VIEW': 'products',
    'AUDIT_EDIT_APPROVED': 'qualityPhotoAudit'
};

const RoleManagementPage = ({ user }) => {
    const { canEdit: canEditRole, canDelete: canDeleteRole, isAdmin } = usePermissions(user);
    const canEdit = canEditRole('roles');
    const canDelete = canDeleteRole('roles');
    const [rowData, setRowData] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState({
        roleKey: '',
        displayName: '',
        description: '',
        allowedMenus: '{}',
        allowedPermissions: '[]',
        dashboardLayoutId: null,
        isSystemRole: false
    });
    const [isInitialSystemRole, setIsInitialSystemRole] = useState(false);
    const [quickFilterText, setQuickFilterText] = useState('');
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [targetRoleName, setTargetRoleName] = useState('');

    const [layouts, setLayouts] = useState([]);

    useEffect(() => {
        fetchRoles();
        fetchLayouts();
    }, []);

    const fetchLayouts = async () => {
        try {
            const data = await getDashboardLayouts();
            setLayouts(data);
        } catch (err) {
            // Silently fail
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await getRoles();
            setRowData(response.data);
        } catch (error) {
            toast.error("권한 목록을 불러오는데 실패했습니다.");
        }
    };

    const handleOpenModal = (role = null) => {
        if (role) {
            setSelectedRole({
                ...role,
                allowedMenus: role.allowedMenus || '{}',
                allowedPermissions: role.allowedPermissions || '[]'
            });
            setIsInitialSystemRole(role.isSystemRole);
            setIsEditMode(true);
        } else {
            setSelectedRole({
                roleKey: '',
                displayName: '',
                description: '',
                allowedMenus: JSON.stringify({ dashboard: ['VIEW'] }),
                allowedPermissions: '[]',
                isSystemRole: false
            });
            setIsInitialSystemRole(false);
            setIsEditMode(false);
        }
        setIsModalOpen(true);
    };

    const handleSaveTrigger = () => {
        if (!selectedRole.roleKey || !selectedRole.displayName) {
            toast.error("권한 코드와 표시명은 필수 입력 항목입니다.");
            return;
        }
        setIsConfirmOpen(true);
    };

    const handleSave = async () => {
        setIsConfirmOpen(false);
        try {
            if (isEditMode) {
                await updateRole(selectedRole.id, selectedRole);
                toast.success("권한 정보가 성공적으로 수정되었습니다.");
            } else {
                await createRole(selectedRole);
                toast.success("새로운 시스템 권한이 생성되었습니다.");
            }
            setIsModalOpen(false);
            fetchRoles();
        } catch (error) {
            toast.error(error.response?.data || "저장 중 오류가 발생했습니다.");
        }
    };

    const handleDelete = async (id, isSystemRole) => {
        if (isSystemRole) {
            toast.warning("보호된 시스템 계정 권한은 삭제가 불가능합니다.");
            return;
        }
        if (window.confirm("정말로 이 권한을 삭제하시겠습니까? 삭제 시 해당 권한을 가진 사용자들의 시스템 접근이 차단될 수 있습니다.")) {
            try {
                await deleteRole(id);
                toast.success("권한이 영구 삭제되었습니다.");
                fetchRoles();
            } catch (error) {
                toast.error("삭제 처리에 실패했습니다.");
            }
        }
    };

    const getParsedPermissions = (data, isArray = false) => {
        if (!data) return isArray ? [] : {};
        try {
            let parsed = JSON.parse(data);
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            return parsed;
        } catch (e) {
            return isArray ? [] : {};
        }
    };

    const togglePermission = (menuKey, action) => {
        if (selectedRole.isSystemRole && isInitialSystemRole && !isAdmin) return;

        const currentPermissions = getParsedPermissions(selectedRole.allowedMenus);
        let menuActions = currentPermissions[menuKey] || [];

        if (menuActions.includes(action)) {
            menuActions = menuActions.filter(a => a !== action);
        } else {
            menuActions = [...menuActions, action];
        }

        if (menuActions.length === 0) {
            delete currentPermissions[menuKey];
            const currentFuncPerms = getParsedPermissions(selectedRole.allowedPermissions, true);
            const dependentFPKeys = Object.entries(FP_DEPENDENCIES)
                .filter(([fpKey, depMenu]) => depMenu === menuKey)
                .map(([fpKey]) => fpKey);

            const filteredFuncPerms = currentFuncPerms.filter(p => !dependentFPKeys.includes(p));
            setSelectedRole({
                ...selectedRole,
                allowedMenus: JSON.stringify(currentPermissions),
                allowedPermissions: JSON.stringify(filteredFuncPerms)
            });
        } else {
            currentPermissions[menuKey] = menuActions;
            setSelectedRole({ ...selectedRole, allowedMenus: JSON.stringify(currentPermissions) });
        }
    };

    const handleBatchPermission = (category, action) => {
        if (selectedRole.isSystemRole && isInitialSystemRole && !isAdmin) return;

        const currentPermissions = getParsedPermissions(selectedRole.allowedMenus);
        const categoryMenus = MENU_OPTIONS.filter(m => m.category === category && m.actions.includes(action));
        if (categoryMenus.length === 0) return;

        const allChecked = categoryMenus.every(menu => (currentPermissions[menu.key] || []).includes(action));
        const shouldCheck = !allChecked;

        categoryMenus.forEach(menu => {
            const menuPermissions = [...(currentPermissions[menu.key] || [])];
            if (shouldCheck) {
                if (!menuPermissions.includes(action)) {
                    currentPermissions[menu.key] = [...menuPermissions, action];
                }
            } else {
                currentPermissions[menu.key] = menuPermissions.filter(a => a !== action);
                if (currentPermissions[menu.key].length === 0) {
                    delete currentPermissions[menu.key];
                }
            }
        });

        setSelectedRole({ ...selectedRole, allowedMenus: JSON.stringify(currentPermissions) });
    };

    const toggleFunctionalPermission = (permissionKey) => {
        if (selectedRole.isSystemRole && isInitialSystemRole && !isAdmin) return;

        const depMenu = FP_DEPENDENCIES[permissionKey];
        if (depMenu) {
            const currentMenus = getParsedPermissions(selectedRole.allowedMenus);
            if (!currentMenus[depMenu] || !currentMenus[depMenu].includes('VIEW')) {
                const menuLabel = MENU_OPTIONS.find(m => m.key === depMenu)?.label || depMenu;
                toast.warn(`[${menuLabel}] 메뉴 조회 권한이 선행되어야 합니다.`);
                return;
            }
        }

        const currentFuncPerms = getParsedPermissions(selectedRole.allowedPermissions, true);
        let updated = currentFuncPerms.includes(permissionKey)
            ? currentFuncPerms.filter(p => p !== permissionKey)
            : [...currentFuncPerms, permissionKey];
        
        setSelectedRole({ ...selectedRole, allowedPermissions: JSON.stringify(updated) });
    };

    const handleViewHistory = async (role) => {
        try {
            const response = await api.getRoleLogs(role.id);
            setHistoryLogs(response.data);
            setTargetRoleName(role.displayName);
            setIsHistoryModalOpen(true);
        } catch (error) {
            toast.error("변경 이력을 불러오지 못했습니다.");
        }
    };

    const columnDefs = useMemo(() => [
        { field: "id", headerName: "ID", width: 80, pinned: 'left' },
        {
            field: "roleKey", headerName: "권한 코드 (Key)", filter: true, width: 220,
            cellStyle: (params) => params.data.isSystemRole ? { color: '#0056b3', fontWeight: 'bold' } : null
        },
        { field: "displayName", headerName: "표시명", filter: true, width: 200 },
        { field: "description", headerName: "설명", flex: 1, filter: true },
        {
            field: "isSystemRole",
            headerName: "보호 상태",
            width: 140,
            cellRenderer: (params) => (
                <span className={`badge ${params.value ? 'warning' : 'info'}`} style={{ fontSize: '11px', fontWeight: '800' }}>
                    {params.value ? "🛡️ SYSTEM" : "🔓 CUSTOM"}
                </span>
            )
        },
        {
            headerName: "관리 액션",
            width: 220,
            sortable: false,
            filter: false,
            cellRenderer: (params) => (
                <div className="actions" style={{ justifyContent: 'center', gap: '8px' }}>
                    <button
                        onClick={() => handleOpenModal(params.data)}
                        className="secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', opacity: (canEdit || (params.data.isSystemRole && !isAdmin)) ? 1 : 0.5 }}
                        disabled={!canEdit && !(params.data.isSystemRole && !isAdmin)}
                    >
                        {(params.data.isSystemRole && !isAdmin) ? '조회' : '수정'}
                    </button>
                    {!params.data.isSystemRole && (
                        <button
                            onClick={() => handleDelete(params.data.id, params.data.isSystemRole)}
                            className="secondary"
                            style={{ padding: '6px 12px', fontSize: '12px', color: '#e53e3e', background: '#fff5f5', opacity: canDelete ? 1 : 0.5 }}
                            disabled={!canDelete}
                        >
                            삭제
                        </button>
                    )}
                    <button
                        onClick={() => handleViewHistory(params.data)}
                        className="secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', background: '#f1f5f9', color: '#64748b' }}
                    >
                        ⌛ 이력
                    </button>
                </div>
            )
        }
    ], [canEdit, canDelete, isAdmin]);

    return (
        <div className="page-container">
            {/* 표준화된 헤더 */}
            <div className="page-header-standard">
                <div className="header-title">
                    <h2>🔐 시스템 권한 마스터 관리</h2>
                    <p>사용자 역할별 메뉴 접근 제어 및 기능적 권한을 중앙에서 정의하고 배포합니다.</p>
                </div>
                <button 
                    className="primary" 
                    onClick={() => handleOpenModal()} 
                    style={{ padding: '12px 30px', borderRadius: '12px', fontWeight: '800', opacity: canEdit ? 1 : 0.5 }} 
                    disabled={!canEdit}
                >
                    ➕ 신규 권한 등록
                </button>
            </div>

            {/* 필터 및 데이터 카드 (제품코드 마스터 스타일 벤치마킹) */}
            <div className="card" style={{ padding: '30px', borderRadius: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '800', fontSize: '16px', color: '#475569' }}>
                        권한 리스트 <span style={{ color: 'var(--primary-color)', marginLeft: '8px' }}>{rowData.length}</span>
                    </div>
                    <div className="search-bar-standard" style={{ padding: '0', border: 'none', boxShadow: 'none', margin: 0, width: '350px' }}>
                        <div style={{ display: 'flex', width: '100%', position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="권한 코드 또는 표시명으로 빠른 검색..."
                                value={quickFilterText}
                                onChange={(e) => setQuickFilterText(e.target.value)}
                                style={{ padding: '12px 45px 12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', width: '100%' }}
                            />
                            <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
                        </div>
                    </div>
                </div>

                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', minHeight: '500px' }}>
                    <AgGridReact
                        theme="legacy"
                        rowHeight={60}
                        rowData={rowData}
                        columnDefs={columnDefs}
                        pagination={true}
                        paginationPageSize={50}
                        quickFilterText={quickFilterText}
                        animateRows={true}
                    />
                </div>
            </div>

            {/* Role Config Modal (Drawer style) */}
            {isModalOpen && (
                <div className="drawer-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: '1400px', borderRadius: '28px' }}>
                        <div className="drawer-header" style={{ padding: '30px 45px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '900' }}>
                                {isEditMode ? `🛠️ [${selectedRole.displayName}] 권한 설정` : '✨ 신규 권한 정의'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="secondary close-button" style={{ borderRadius: '50%', width: '45px', height: '45px', padding: 0, fontSize: '20px' }}>✕</button>
                        </div>

                        <div className="drawer-body" style={{ padding: '45px', background: '#f8fafc' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '40px', height: '100%' }}>
                                {/* Left Side: Role Identity */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                    <div className="card" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '25px', color: 'var(--primary-color)' }}>📌 기본 식별 정보</h3>
                                        <div className="form-group">
                                            <label>권한 식별 코드 (Key)</label>
                                            <input
                                                type="text"
                                                placeholder="예: QUALITY_ADMIN"
                                                value={selectedRole.roleKey}
                                                onChange={(e) => setSelectedRole({ ...selectedRole, roleKey: e.target.value })}
                                                disabled={isInitialSystemRole && isEditMode && !isAdmin}
                                                style={{ padding: '14px', borderRadius: '12px', fontWeight: '600' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>사용자 노출 명칭</label>
                                            <input
                                                type="text"
                                                placeholder="예: 품질관리 시스템 관리자"
                                                value={selectedRole.displayName}
                                                onChange={(e) => setSelectedRole({ ...selectedRole, displayName: e.target.value })}
                                                disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                                style={{ padding: '14px', borderRadius: '12px', fontWeight: '600' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ color: '#e67e22' }}>🛡️ 시스템 계정 보호 여부</label>
                                            <div style={{ display: 'flex', gap: '20px', padding: '14px', background: '#fffaf0', borderRadius: '12px', border: '1px solid #feebc8' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}>
                                                    <input type="radio" checked={selectedRole.isSystemRole === true} onChange={() => setSelectedRole({ ...selectedRole, isSystemRole: true })} disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)} /> 보호 활성
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}>
                                                    <input type="radio" checked={selectedRole.isSystemRole === false} onChange={() => setSelectedRole({ ...selectedRole, isSystemRole: false })} disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)} /> 미보호
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', flex: 1 }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px', color: '#64748b' }}>📝 권한 상세 설명</h3>
                                        <textarea
                                            rows="8"
                                            placeholder="해당 권한의 역할과 책임을 상세히 기술하세요."
                                            value={selectedRole.description}
                                            onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                                            disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                            style={{ padding: '18px', borderRadius: '16px', resize: 'none', height: 'calc(100% - 50px)', fontWeight: '500', fontSize: '14px', lineHeight: '1.6' }}
                                        />
                                    </div>
                                </div>

                                {/* Right Side: Permissions Matrix */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                                    <div className="card" style={{ padding: '35px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                        <h3 style={{ fontSize: '19px', fontWeight: '900', marginBottom: '30px', color: 'var(--primary-color)', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
                                            🧩 메뉴 접근 및 액션 권한 매트릭스
                                        </h3>
                                        <div>
                                            <table className="qms-table" style={{ fontSize: '14px' }}>
                                                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white' }}>
                                                    <tr>
                                                        <th style={{ textAlign: 'left', padding: '15px 20px', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>메뉴 경로</th>
                                                        <th style={{ width: '100px', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>조회(V)</th>
                                                        <th style={{ width: '100px', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>편집(E)</th>
                                                        <th style={{ width: '100px', background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>삭제(D)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        const currentAllowedMenus = getParsedPermissions(selectedRole.allowedMenus);
                                                        return ['시스템', '마스터', '운영', '클레임'].map(cat => (
                                                            <React.Fragment key={cat}>
                                                                <tr style={{ background: '#eef2ff', borderTop: '2px solid #c7d2fe' }}>
                                                                    <td style={{ fontWeight: '900', color: 'var(--primary-color)', padding: '12px 20px', fontSize: '14px' }}>📁 {cat} 관리 그룹</td>
                                                                    <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#6366f1' }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                                            <span style={{ color: '#64748b', fontSize: '10px' }}>조회(V)</span>
                                                                            <button type="button" onClick={() => handleBatchPermission(cat, 'VIEW')} className="secondary" style={{ fontSize: '11px', padding: '3px 12px', fontWeight: '800', borderRadius: '6px' }}>ALL</button>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#6366f1' }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                                            <span style={{ color: '#64748b', fontSize: '10px' }}>편집(E)</span>
                                                                            <button type="button" onClick={() => handleBatchPermission(cat, 'EDIT')} className="secondary" style={{ fontSize: '11px', padding: '3px 12px', fontWeight: '800', borderRadius: '6px' }}>ALL</button>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#6366f1' }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                                            <span style={{ color: '#64748b', fontSize: '10px' }}>삭제(D)</span>
                                                                            <button type="button" onClick={() => handleBatchPermission(cat, 'DELETE')} className="secondary" style={{ fontSize: '11px', padding: '3px 12px', fontWeight: '800', borderRadius: '6px' }}>ALL</button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                {MENU_OPTIONS.filter(m => m.category === cat).map(menu => {
                                                                    const permissions = currentAllowedMenus[menu.key] || [];
                                                                    return (
                                                                        <tr key={menu.key}>
                                                                            <td style={{ paddingLeft: '45px', color: permissions.length > 0 ? '#1e293b' : '#94a3b8', fontWeight: permissions.length > 0 ? '800' : '500', padding: '12px 20px 12px 45px' }}>{menu.label}</td>
                                                                            <td style={{ textAlign: 'center' }}>
                                                                                <input type="checkbox" style={{ width: '18px', height: '18px' }} checked={permissions.includes('VIEW')} onChange={() => togglePermission(menu.key, 'VIEW')} disabled={!menu.actions.includes('VIEW') || !canEdit || (isInitialSystemRole && isEditMode && !isAdmin)} />
                                                                            </td>
                                                                            <td style={{ textAlign: 'center' }}>
                                                                                {menu.actions.includes('EDIT') ? <input type="checkbox" style={{ width: '18px', height: '18px' }} checked={permissions.includes('EDIT')} onChange={() => togglePermission(menu.key, 'EDIT')} disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)} /> : '-'}
                                                                            </td>
                                                                            <td style={{ textAlign: 'center' }}>
                                                                                {menu.actions.includes('DELETE') ? <input type="checkbox" style={{ width: '18px', height: '18px' }} checked={permissions.includes('DELETE')} onChange={() => togglePermission(menu.key, 'DELETE')} disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)} /> : '-'}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </React.Fragment>
                                                        ));
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="card" style={{ padding: '35px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                        <h3 style={{ fontSize: '19px', fontWeight: '900', marginBottom: '25px', color: '#0d9488' }}>💎 고급 기능 액션 권한 (Functional)</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '15px' }}>
                                            {FUNCTIONAL_PERMISSIONS.map(fp => {
                                                const currentFuncPerms = getParsedPermissions(selectedRole.allowedPermissions, true);
                                                const isChecked = currentFuncPerms.includes(fp.key);
                                                return (
                                                    <div 
                                                        key={fp.key}
                                                        onClick={() => canEdit && (!isInitialSystemRole || isAdmin) && toggleFunctionalPermission(fp.key)}
                                                        style={{
                                                            padding: '18px', borderRadius: '16px', border: '2px solid',
                                                            borderColor: isChecked ? '#0d9488' : '#f1f5f9',
                                                            background: isChecked ? '#f0fdfa' : '#ffffff',
                                                            cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '15px'
                                                        }}
                                                    >
                                                        <input type="checkbox" style={{ width: '18px', height: '18px', marginTop: '3px' }} checked={isChecked} readOnly disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)} />
                                                        <div>
                                                            <div style={{ fontWeight: '900', fontSize: '15px', color: isChecked ? '#134e4a' : '#475569' }}>{fp.label}</div>
                                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', lineHeight: '1.5' }}>{fp.description}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="drawer-footer" style={{ padding: '25px 45px' }}>
                            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>* 시스템 계정 보호 설정은 최고 관리자 권한이 필요합니다.</span>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button className="secondary" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 35px', borderRadius: '12px', fontWeight: '700' }}>닫기</button>
                                <button className="primary" onClick={handleSaveTrigger} style={{ padding: '12px 60px', borderRadius: '12px', fontWeight: '900', boxShadow: '0 4px 15px rgba(0, 51, 102, 0.2)' }} disabled={!canEdit}>권한 설정 저장</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {isHistoryModalOpen && (
                <div className="drawer-overlay" onClick={() => setIsHistoryModalOpen(false)}>
                    <div className="drawer" style={{ width: '1000px', height: '80vh', borderRadius: '28px' }} onClick={e => e.stopPropagation()}>
                        <div className="drawer-header" style={{ padding: '30px 45px' }}>
                            <h3 style={{ margin: 0, fontWeight: '900', fontSize: '20px' }}>⌛ [{targetRoleName}] 변경 히스토리 요약</h3>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="secondary close-button" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}>✕</button>
                        </div>
                        <div className="drawer-body" style={{ padding: '40px' }}>
                            <table className="qms-table">
                                <thead style={{ position: 'sticky', top: 0, background: '#fff' }}>
                                    <tr>
                                        <th style={{ width: '200px' }}>변경 일시</th>
                                        <th style={{ width: '120px' }}>액션</th>
                                        <th style={{ width: '150px' }}>수정자</th>
                                        <th>변경 사항 요약</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyLogs.length === 0 ? (
                                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '80px', color: '#cbd5e0', fontSize: '16px' }}>변경 기록이 존재하지 않습니다.</td></tr>
                                    ) : (
                                        historyLogs.map(log => (
                                            <tr key={log.id}>
                                                <td style={{ fontSize: '13px', fontWeight: '600' }}>{new Date(log.modifiedAt).toLocaleString()}</td>
                                                <td><span className={`badge ${log.action === 'CREATE' ? 'success' : 'info'}`} style={{ fontSize: '11px', fontWeight: '900' }}>{log.action}</span></td>
                                                <td style={{ fontWeight: '800', color: '#1a202c' }}>{log.modifier}</td>
                                                <td style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.5' }}>{log.description}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <SaveConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleSave}
            />
        </div>
    );
};

export default RoleManagementPage;
