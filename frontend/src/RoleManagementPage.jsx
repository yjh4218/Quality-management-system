import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { getRoles, createRole, updateRole, deleteRole, getDashboardLayouts } from './api';
import * as api from './api';
import { toast } from 'react-toastify';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';

const MENU_OPTIONS = [
    { key: 'dashboard', category: '시스템', label: '시스템 대시보드 (제조사 접근 필요)', actions: ['VIEW'] },
    { key: 'users', category: '시스템', label: '사용자 승인 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'logs', category: '시스템', label: '시스템 변경 이력', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'roles', category: '시스템', label: '권한 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'products', category: '마스터', label: '제품코드 마스터', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'bomMaster', category: '마스터', label: '구성품 BOM 마스터 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'bomCategories', category: '마스터', label: 'BOM 유형 설정/관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'packagingTemplates', category: '마스터', label: '포장공정 템플릿 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'packagingRules', category: '마스터', label: '채널별 포장 규칙 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'brands', category: '운영', label: '브랜드 마스터 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'manufacturers', category: '운영', label: '제조사 정보 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
    { key: 'salesChannels', category: '운영', label: '유통 채널 관리', actions: ['VIEW', 'EDIT', 'DELETE'] },
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
    { key: 'PRODUCT_PACKAGING_VIEW', label: '📦 제품 포장재/사양서 조회 권한', description: '제품 마스터에서 포장재 정보 및 사양서 탭을 조회할 수 있는 권한입니다.' }
];

// DASHBOARD_WIDGET_OPTIONS removed - now using DashboardLayout templates

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
            // Silently fail or log to a dedicated error service if available
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
                toast.success("권한이 수정되었습니다.");
            } else {
                await createRole(selectedRole);
                toast.success("새로운 권한이 생성되었습니다.");
            }
            setIsModalOpen(false);
            fetchRoles();
        } catch (error) {
            toast.error(error.response?.data || "권한 저장 중 오류가 발생했습니다.");
        }
    };

    const handleDelete = async (id, isSystemRole) => {
        if (isSystemRole) {
            toast.warning("계정 보호 권한은 삭제할 수 없습니다.");
            return;
        }
        if (window.confirm("정말로 이 권한을 삭제하시겠습니까? 해당 권한을 가진 사용자의 접근이 제한될 수 있습니다.")) {
            try {
                await deleteRole(id);
                toast.success("권한이 삭제되었습니다.");
                fetchRoles();
            } catch (error) {
                toast.error("권한 삭제 실패");
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
        } else {
            currentPermissions[menuKey] = menuActions;
        }
        
        setSelectedRole({ ...selectedRole, allowedMenus: JSON.stringify(currentPermissions) });
    };

    const handleBatchPermission = (category, action) => {
        if (selectedRole.isSystemRole && isInitialSystemRole && !isAdmin) return;

        const currentPermissions = getParsedPermissions(selectedRole.allowedMenus);
        const categoryMenus = MENU_OPTIONS.filter(m => m.category === category && m.actions.includes(action));

        // Detect if all supported menus in this category already have this action
        const categoryMenusSupportingAction = categoryMenus.filter(m => m.actions.includes(action));
        if (categoryMenusSupportingAction.length === 0) return;

        const allChecked = categoryMenusSupportingAction.every(menu => (currentPermissions[menu.key] || []).includes(action));
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

        const currentFuncPerms = getParsedPermissions(selectedRole.allowedPermissions, true);
        let updated;
        if (currentFuncPerms.includes(permissionKey)) {
            updated = currentFuncPerms.filter(p => p !== permissionKey);
        } else {
            updated = [...currentFuncPerms, permissionKey];
        }
        setSelectedRole({ ...selectedRole, allowedPermissions: JSON.stringify(updated) });
    };

    const handleViewHistory = async (role) => {
        try {
            const response = await api.getRoleLogs(role.id);
            setHistoryLogs(response.data);
            setTargetRoleName(role.displayName);
            setIsHistoryModalOpen(true);
        } catch (error) {
            toast.error("이력을 불러오지 못했습니다.");
        }
    };

    const columnDefs = useMemo(() => [
        { field: "id", headerName: "ID", width: 70 },
        { field: "roleKey", headerName: "권한 코드 (Key)", filter: true, width: 220, 
          cellStyle: (params) => params.data.isSystemRole ? { color: '#0056b3', fontWeight: 'bold' } : null 
        },
        { field: "displayName", headerName: "표시명", filter: true, width: 200 },
        { field: "description", headerName: "설명", flex: 1, filter: true },
        { 
            field: "isSystemRole", 
            headerName: "계정 보호", 
            width: 140, 
            cellRenderer: (params) => (
                <span style={{ 
                    color: params.value ? '#e67e22' : '#7f8c8d', 
                    fontWeight: params.value ? 'bold' : 'normal',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    {params.value ? "🛡️ 계정 보호" : "🔓 계정 비보호"}
                </span>
            )
        },
        {
            headerName: "작업",
            width: 150,
            sortable: false,
            filter: false,
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '100%' }}>
                    <button 
                        onClick={() => handleOpenModal(params.data)}
                        className="btn-small outline"
                        style={{ padding: '4px 10px', fontSize: '12px', opacity: (canEdit || (params.data.isSystemRole && !isAdmin)) ? 1 : 0.5 }}
                        disabled={!canEdit && !(params.data.isSystemRole && !isAdmin)}
                    >
                        {(params.data.isSystemRole && !isAdmin) ? '조회' : '수정'}
                    </button>
                    {!params.data.isSystemRole && (
                        <button 
                            onClick={() => handleDelete(params.data.id, params.data.isSystemRole)}
                            className="btn-small secondary"
                            style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: '#e74c3c', opacity: canDelete ? 1 : 0.5 }}
                            disabled={!canDelete}
                        >
                            삭제
                        </button>
                    )}
                    <button 
                        onClick={() => handleViewHistory(params.data)}
                        className="btn-small"
                        style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: '#95a5a6', color: 'white', border: 'none' }}
                    >
                        ⌛ 이력
                    </button>
                </div>
            )
        }
    ], []);

    return (
        <div className="card" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>🔐 시스템 권한 관리</h2>
                    <p style={{ fontSize: '14px', color: '#666' }}>시스템 메뉴별 접근 권한 및 핵심 역할을 동적으로 정의합니다.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                        type="text" 
                        placeholder="빠른 검색..." 
                        value={quickFilterText}
                        onChange={(e) => setQuickFilterText(e.target.value)}
                        style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', width: '250px' }}
                    />
                    <button onClick={() => handleOpenModal()} className="primary" style={{ padding: '10px 24px', fontWeight: '600', opacity: canEdit ? 1 : 0.5 }} disabled={!canEdit}>
                        ➕ 권한 추가
                    </button>
                </div>
            </div>

            <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                <AgGridReact 
                    theme="legacy"
                    rowHeight={50}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    pagination={true}
                    paginationPageSize={100}
                    quickFilterText={quickFilterText}
                />
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '1200px', maxWidth: '95%', padding: '30px', maxHeight: '95vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>{isEditMode ? '🛠️ 권한 정보 및 메뉴 관리' : '✨ 신규 권한 생성'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="secondary close-button">
                                <span className="icon">×</span> 닫기
                            </button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '30px' }}>
                            {/* Left Side: General Info */}
                            <div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>권한 코드 (Key)</label>
                                    <input 
                                        type="text"
                                        placeholder="예: QUALITY_CONTROL"
                                        value={selectedRole.roleKey}
                                        onChange={(e) => setSelectedRole({ ...selectedRole, roleKey: e.target.value })}
                                        disabled={isInitialSystemRole && isEditMode && !isAdmin}
                                        style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: (isInitialSystemRole && isEditMode && !isAdmin) ? '#f5f5f5' : '#fff' }}
                                    />
                                    <small style={{ color: '#666' }}>ROLE_ 접두사는 자동으로 추가됩니다.</small>
                                </div>

                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>표시명 (Display Name)</label>
                                    <input 
                                        type="text"
                                        placeholder="예: 품질 제어 담당"
                                        value={selectedRole.displayName}
                                        onChange={(e) => setSelectedRole({ ...selectedRole, displayName: e.target.value })}
                                        disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                        style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: (!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)) ? '#f5f5f5' : '#fff' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#d35400' }}>🛡️ 계정 보호 설정</label>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', padding: '10px 15px', backgroundColor: '#fff7ed', borderRadius: '4px', border: '1px solid #ffedd5', flexWrap: 'nowrap', whiteSpace: 'nowrap', opacity: (canEdit && (!isInitialSystemRole || isAdmin)) ? 1 : 0.5 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: (canEdit && (!isInitialSystemRole || isAdmin)) ? 'pointer' : 'not-allowed', fontSize: '14px', margin: 0 }}>
                                            <input 
                                                type="radio" 
                                                name="isProtected" 
                                                checked={selectedRole.isSystemRole === true} 
                                                onChange={() => setSelectedRole({...selectedRole, isSystemRole: true})}
                                                disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                            />
                                            계정 보호
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: (canEdit && (!isInitialSystemRole || isAdmin)) ? 'pointer' : 'not-allowed', fontSize: '14px', margin: 0 }}>
                                            <input 
                                                type="radio" 
                                                name="isProtected" 
                                                checked={selectedRole.isSystemRole === false} 
                                                onChange={() => setSelectedRole({...selectedRole, isSystemRole: false})}
                                                disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                            />
                                            계정 비보호
                                        </label>
                                    </div>
                                    <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>보호 상태에서는 모든 권한 및 정보가 잠기며 삭제가 불가합니다.</small>
                                </div>

                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>설명</label>
                                    <textarea 
                                        rows="4"
                                        placeholder="해당 권한에 대한 상세 설명을 입력하세요."
                                        value={selectedRole.description}
                                        onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                                        disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                        style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: (!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)) ? '#f5f5f5' : '#fff' }}
                                    />
                                </div>
                            </div>

                            {/* Right Side: Menu Permissions */}
                            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
                                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                                    📌 기능 접근 권한 (Menu Access)
                                </label>
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9f9f9', zIndex: 10 }}>
                                            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                                                <th style={{ padding: '8px 4px' }}>메뉴명</th>
                                                <th style={{ padding: '8px 4px', textAlign: 'center', width: '60px' }}>조회</th>
                                                <th style={{ padding: '8px 4px', textAlign: 'center', width: '60px' }}>수정</th>
                                                <th style={{ padding: '8px 4px', textAlign: 'center', width: '60px' }}>삭제</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const currentAllowedMenus = getParsedPermissions(selectedRole.allowedMenus);
                                                return ['시스템', '마스터', '운영', '클레임'].map(cat => (
                                                    <React.Fragment key={cat}>
                                                        <tr style={{ backgroundColor: '#f0f2f5' }}>
                                                            <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#1890ff', fontSize: '12px' }}>
                                                                📁 {cat}
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '4px' }}>
                                                                <button 
                                                                    onClick={() => handleBatchPermission(cat, 'VIEW')}
                                                                    className="btn-small outline" 
                                                                    style={{ padding: '2px 4px', fontSize: '10px', width: '100%', opacity: (canEdit && (!isInitialSystemRole || isAdmin)) ? 1 : 0.5 }}
                                                                    disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                                                >조회전체</button>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '4px' }}>
                                                                <button 
                                                                    onClick={() => handleBatchPermission(cat, 'EDIT')}
                                                                    className="btn-small outline" 
                                                                    style={{ padding: '2px 4px', fontSize: '10px', width: '100%', opacity: (canEdit && (!isInitialSystemRole || isAdmin)) ? 1 : 0.5 }}
                                                                    disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                                                >수정전체</button>
                                                            </td>
                                                            <td style={{ textAlign: 'center', padding: '4px' }}>
                                                                <button 
                                                                    onClick={() => handleBatchPermission(cat, 'DELETE')}
                                                                    className="btn-small outline" 
                                                                    style={{ padding: '2px 4px', fontSize: '10px', width: '100%', opacity: (canEdit && (!isInitialSystemRole || isAdmin)) ? 1 : 0.5 }}
                                                                    disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                                                >삭제전체</button>
                                                            </td>
                                                        </tr>
                                                        {MENU_OPTIONS.filter(m => m.category === cat).map(menu => {
                                                            const permissions = currentAllowedMenus[menu.key] || [];
                                                            return (
                                                                <tr key={menu.key} style={{ borderBottom: '1px solid #eee' }}>
                                                                    <td style={{ padding: '12px 4px', fontWeight: permissions.length > 0 ? '600' : 'normal' }}>
                                                                        {menu.label}
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={permissions.includes('VIEW')}
                                                                            onChange={() => togglePermission(menu.key, 'VIEW')}
                                                                            disabled={!menu.actions.includes('VIEW') || !canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                                                        />
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        {menu.actions.includes('EDIT') ? (
                                                                            <input 
                                                                                type="checkbox" 
                                                                                checked={permissions.includes('EDIT')}
                                                                                onChange={() => togglePermission(menu.key, 'EDIT')}
                                                                                disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                                                            />
                                                                        ) : <span style={{ color: '#ccc' }}>-</span>}
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        {menu.actions.includes('DELETE') ? (
                                                                            <input 
                                                                                type="checkbox" 
                                                                                checked={permissions.includes('DELETE')}
                                                                                onChange={() => togglePermission(menu.key, 'DELETE')}
                                                                                disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                                                            />
                                                                        ) : <span style={{ color: '#ccc' }}>-</span>}
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

                                {/* Custom Functional Permissions Section */}
                                <label style={{ display: 'block', margin: '20px 0 12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                                    💎 세부 기능 권한 (Functional Permissions)
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                                    {FUNCTIONAL_PERMISSIONS.map(fp => {
                                        const currentFuncPerms = getParsedPermissions(selectedRole.allowedPermissions, true);
                                        const isChecked = currentFuncPerms.includes(fp.key);
                                        
                                        return (
                                            <div 
                                                key={fp.key} 
                                                onClick={() => canEdit && (!isInitialSystemRole || isAdmin) && toggleFunctionalPermission(fp.key)}
                                                style={{ 
                                                    padding: '12px', 
                                                    border: '1px solid',
                                                    borderColor: isChecked ? '#4a90e2' : '#e2e8f0',
                                                    borderRadius: '8px',
                                                    backgroundColor: isChecked ? '#f0f7ff' : '#fff',
                                                    cursor: (canEdit && (!isInitialSystemRole || isAdmin)) ? 'pointer' : 'not-allowed',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '10px',
                                                    opacity: (canEdit && (!isInitialSystemRole || isAdmin)) ? 1 : 0.6
                                                }}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked} 
                                                    readOnly 
                                                    style={{ marginTop: '3px' }}
                                                    disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: '700', fontSize: '14px', color: isChecked ? '#1e40af' : '#1e293b' }}>{fp.label}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{fp.description}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Dashboard Widget Configuration Section - Replaced with Layout Selection */}
                                <label style={{ display: 'block', margin: '20px 0 12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                                    🖥️ 대시보드 레이아웃 설정 (Dashboard Layout)
                                </label>
                                <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                                        각 역할에 맞는 미리 정의된 대시보드 구성을 선택합니다. '대시보드 제작/관리' 메뉴에서 새로운 구성을 만들 수 있습니다.
                                    </p>
                                    <div className="form-group">
                                        <select 
                                            value={selectedRole.dashboardLayoutId || ""}
                                            onChange={(e) => setSelectedRole({ ...selectedRole, dashboardLayoutId: e.target.value ? Number(e.target.value) : null })}
                                            disabled={!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (!canEdit || (isInitialSystemRole && isEditMode && !isAdmin)) ? '#f5f5f5' : '#fff' }}
                                        >
                                            <option value="">-- 레이아웃 선택 (미지정 시 시스템 기본값 사용) --</option>
                                            {layouts.map(layout => (
                                                <option key={layout.id} value={layout.id}>{layout.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedRole.dashboardLayoutId && (
                                        <div style={{ marginTop: '10px', fontSize: '11px', color: '#4f46e5' }}>
                                            💡 선택한 레이아웃의 위젯 구성이 실시간으로 적용됩니다.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <span style={{ fontSize: '13px', color: '#718096' }}>* 시스템 계정 보호 권한은 Admin만 수정이 가능합니다.</span>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setIsModalOpen(false)} className="secondary">취소</button>
                                <button 
                                    onClick={handleSaveTrigger} 
                                    className="primary" 
                                    style={{ 
                                        padding: '10px 40px',
                                        opacity: canEdit ? 1 : 0.5,
                                        cursor: canEdit ? 'pointer' : 'not-allowed'
                                    }}
                                    disabled={!canEdit}
                                >
                                    저장하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {isHistoryModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '900px', maxWidth: '95%', padding: '30px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>⌛ [{targetRoleName}] 변경 요약 이력</h3>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="secondary close-button">
                                <span className="icon">×</span> 닫기
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', width: '180px' }}>일시</th>
                                        <th style={{ padding: '12px', textAlign: 'left', width: '120px' }}>작업</th>
                                        <th style={{ padding: '12px', textAlign: 'left', width: '120px' }}>수정자</th>
                                        <th style={{ padding: '12px', textAlign: 'left' }}>변경 내용 요약</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyLogs.length === 0 ? (
                                        <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>기록된 변경 이력이 없습니다.</td></tr>
                                    ) : (
                                        historyLogs.map(log => (
                                            <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '12px' }}>{new Date(log.modifiedAt).toLocaleString()}</td>
                                                <td style={{ padding: '12px' }}>
                                                    <span className={`badge ${log.action === 'CREATE' ? 'success' : 'info'}`}>{log.action}</span>
                                                </td>
                                                <td style={{ padding: '12px' }}>{log.modifier}</td>
                                                <td style={{ padding: '12px' }}>{log.description}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setIsHistoryModalOpen(false)} className="secondary">닫기</button>
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
