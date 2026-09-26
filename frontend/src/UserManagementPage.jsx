import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import { getUsers, getRoles, approveUser, toggleUserStatus, updateUserRole, unlockUser, resetUserPassword, getSystemSettings, saveSystemSettings, testSendEmail } from './api';
import { usePermissions } from './usePermissions';
import { matchesAllTokens, matchesMultiFieldTokens } from './utils/searchUtils';

const UserManagementPage = ({ user: currentUser, navigationData, onNavigated }) => {
    const { canEdit, canDelete } = usePermissions(currentUser);
    const [rowData, setRowData] = useState([]);
    const [searchFields, setSearchFields] = useState({
        name: '',
        companyName: '',
        department: '',
        role: ''
    });
    const [roles, setRoles] = useState([]);
    const [quickFilterText, setQuickFilterText] = useState('');
    const [showRoleGuide, setShowRoleGuide] = useState(false);
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'settings'
    const [settings, setSettings] = useState({
        SMTP_HOST: '',
        SMTP_PORT: '465',
        SMTP_USERNAME: '',
        SMTP_PASSWORD: '',
        SMTP_FROM_ADDRESS: ''
    });

    const [testEmailAddress, setTestEmailAddress] = useState(currentUser?.email || '');
    const [isTestingEmail, setIsTestingEmail] = useState(false);

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

    const showConfirm = React.useCallback((message, onConfirm) => {
        setConfirmModal({ isOpen: true, message, onConfirm });
    }, []);

    const showAlert = React.useCallback((message) => {
        setAlertModal({ isOpen: true, message });
    }, []);

    const fetchSettings = React.useCallback(async (force = true) => {
        try {
            const data = await getSystemSettings(force);
            if (data) {
                setSettings(prev => ({
                    ...prev,
                    ...data,
                    SMTP_HOST: data.SMTP_HOST || '',
                    SMTP_PORT: data.SMTP_PORT || '465',
                    SMTP_USERNAME: data.SMTP_USERNAME || '',
                    SMTP_PASSWORD: data.SMTP_PASSWORD || '',
                    SMTP_FROM_ADDRESS: data.SMTP_FROM_ADDRESS || ''
                }));
            }
        } catch (error) {
            showAlert("설정을 불러오는데 실패했습니다.");
        }
    }, [showAlert]);

    // [중요 FIX] 탭이 'settings'로 전환될 때마다 서버의 기존 저장 정보를 반드시 즉시 로드
    useEffect(() => {
        if (activeTab === 'settings') {
            fetchSettings(true);
        }
    }, [activeTab, fetchSettings]);

    // Fetch users & roles on mount
    const lastNavData = useRef(undefined);
    useEffect(() => {
        if (lastNavData.current === navigationData) return;
        lastNavData.current = navigationData;

        if (navigationData && navigationData.username) {
            setQuickFilterText(navigationData.username);
            if (onNavigated) onNavigated();
        }
        fetchUsers();
        fetchRoles();
    }, [navigationData]);

    const handleSaveSettings = async () => {
        try {
            await saveSystemSettings(settings);
            showAlert("메일 설정이 성공적으로 저장되었습니다.");
            await fetchSettings(true);
        } catch (error) {
            showAlert("설정 저장에 실패했습니다.");
        }
    };

    const handleTestEmail = async () => {
        if (!testEmailAddress || !testEmailAddress.includes('@')) {
            showAlert("유효한 수신 테스트 이메일 주소를 입력해 주세요.");
            return;
        }
        setIsTestingEmail(true);
        try {
            const res = await testSendEmail(testEmailAddress.trim());
            showAlert(res.data?.message || "테스트 메일이 성공적으로 발송되었습니다. 수신함을 확인해 주세요!");
        } catch (error) {
            const msg = error.response?.data?.message || error.message || "발송 실패";
            showAlert("테스트 메일 발송 실패: " + msg);
        } finally {
            setIsTestingEmail(false);
        }
    };

    const fillResendDefaults = () => {
        setSettings(prev => ({
            ...prev,
            SMTP_HOST: 'smtp.resend.com',
            SMTP_PORT: '465',
            SMTP_USERNAME: 'resend',
            SMTP_FROM_ADDRESS: prev.SMTP_FROM_ADDRESS || 'onboarding@resend.dev'
        }));
        showAlert("Resend 기본 연동 정보(호스트: smtp.resend.com, 포트: 465, 계정: resend)가 자동 입력되었습니다.\n[이메일 비밀번호] 칸에 Resend 대시보드에서 발급받으신 API Key(re_...)를 입력하고 저장해 주세요!");
    };

    const fillGmailDefaults = () => {
        setSettings(prev => ({
            ...prev,
            SMTP_HOST: 'smtp.gmail.com',
            SMTP_PORT: '587'
        }));
        showAlert("Gmail 기본 정보(호스트: smtp.gmail.com, 포트: 587)가 입력되었습니다.\n계정과 앱 비밀번호를 입력하고 저장해 주세요.");
    };

    const fetchRoles = async () => {
        try {
            const response = await getRoles();
            setRoles(response.data);
        } catch (error) {
            // Error handled silently or via Toast
        }
    };

    const fetchUsers = React.useCallback(async () => {
        try {
            const response = await getUsers(searchFields);
            setRowData(response.data);
        } catch (error) {
            showAlert("사용자 목록을 불러오지 못했습니다. 관리자 권한을 확인하세요.");
        }
    }, [searchFields, showAlert]);

    const filteredRowData = useMemo(() => {
        if (!quickFilterText) return rowData;
        return rowData.filter(item =>
            matchesMultiFieldTokens(
                [item.username, item.name, item.companyName, item.department, item.email, item.role],
                quickFilterText
            )
        );
    }, [rowData, quickFilterText]);

    const handleApprove = React.useCallback(async (id) => {
        showConfirm("이 사용자의 가입을 승인하시겠습니까?", async () => {
            try {
                await approveUser(id);
                showAlert("사용자가 승인되었습니다!");
                await fetchUsers(); // Refresh data
            } catch (error) {
                showAlert("승인 처리에 실패했습니다.");
            }
        });
    }, [fetchUsers, showConfirm, showAlert]);

    const handleRoleChange = React.useCallback(async (id, newRole) => {
        const roleObj = roles.find(r => r.roleKey === newRole);
        const displayName = roleObj ? roleObj.displayName : newRole;

        showConfirm(`권한을 ${displayName}로 변경하시겠습니까?`, async () => {
            try {
                await updateUserRole(id, newRole);
                showAlert("권한이 업데이트되었습니다!");
                await fetchUsers(); // 데이터 새로고침
            } catch (error) {
                showAlert("권한 변경에 실패했습니다.");
            }
        });
    }, [roles, fetchUsers, showConfirm, showAlert]);

    const handleUnlock = React.useCallback(async (id) => {
        showConfirm("이 계정의 잠금을 해제하시겠습니까?", async () => {
            try {
                await unlockUser(id);
                showAlert("계정 잠금이 해제되었습니다.");
                await fetchUsers();
            } catch (error) {
                showAlert("작업 실패");
            }
        });
    }, [fetchUsers, showConfirm, showAlert]);

    const handleToggleStatus = React.useCallback(async (id, currentEnabled) => {
        const confirmMsg = currentEnabled ? '정말로 계정을 비활성화 하시겠습니까?' : '정말로 계정을 활성화 하시겠습니까?';
        const successMsg = currentEnabled ? '계정이 비활성화 되었습니다.' : '계정이 활성화 되었습니다.';
        showConfirm(confirmMsg, async () => {
            try {
                await toggleUserStatus(id);
                showAlert(successMsg);
                await fetchUsers(); // 목록 새로고침
            } catch (error) {
                const message = error.response?.data;
                showAlert(typeof message === 'string' ? message : "상태 변경 중 오류가 발생했습니다.");
            }
        });
    }, [fetchUsers, showConfirm, showAlert]);

    const handleResetPassword = async (id) => {
        const newPassword = window.prompt("**[보안 경고] 비밀번호를 수동으로 재설정합니다.**\n새로운 비밀번호를 입력해 주세요:");
        if (!newPassword) return;
        try {
            await resetUserPassword(id, newPassword);
            showAlert("비밀번호가 성공적으로 변경되었습니다.");
        } catch (error) {
            showAlert("변경 실패");
        }
    };

    // Custom Cell Renderer for Actions
    const ActionsRenderer = (params) => {
        const user = params.data;
        if (!user) return null;

        const cannotEdit = !canEdit('users');
        const actionStyle = cannotEdit ? { opacity: 0.5, cursor: 'not-allowed' } : { cursor: 'pointer' };

        return (
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', height: '100%', opacity: cannotEdit ? 0.7 : 1 }}>
                {!user.enabled ? (
                    <button
                        disabled={cannotEdit}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!cannotEdit) handleToggleStatus(user.id, user.enabled);
                        }}
                        style={{ ...actionStyle, backgroundColor: '#4CAF50', color: 'white', padding: '4px 8px', border: 'none', borderRadius: '4px', fontSize: '11px' }}
                    >
                        활성화
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!cannotEdit) handleToggleStatus(user.id, user.enabled);
                        }}
                        disabled={cannotEdit || user.role === 'ROLE_ADMIN'}
                        style={{
                            ...actionStyle,
                            backgroundColor: (cannotEdit || user.role === 'ROLE_ADMIN') ? '#ccc' : '#f44336',
                            color: 'white',
                            padding: '4px 8px',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px'
                        }}
                    >
                        비활성화
                    </button>
                )}
                <select
                    disabled={cannotEdit}
                    value={user.role || 'ROLE_USER'}
                    onChange={(e) => {
                        e.stopPropagation();
                        if (!cannotEdit) handleRoleChange(user.id, e.target.value);
                    }}
                    style={{ padding: '4px', fontSize: '11px', ...actionStyle }}
                >
                    {roles.map(r => (
                        <option key={r.roleKey} value={r.roleKey}>{r.displayName}</option>
                    ))}
                </select>
                {user.locked && (
                    <button
                        disabled={cannotEdit}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!cannotEdit) handleUnlock(user.id);
                        }}
                        style={{ ...actionStyle, backgroundColor: '#ff9800', color: 'white', padding: '4px 8px', border: 'none', borderRadius: '4px', fontSize: '11px' }}
                    >
                        잠금 해제
                    </button>
                )}
                <button
                    disabled={cannotEdit}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!cannotEdit) handleResetPassword(user.id);
                    }}
                    style={{ ...actionStyle, backgroundColor: '#2196f3', color: 'white', padding: '4px 8px', border: 'none', borderRadius: '4px', fontSize: '11px' }}
                >
                    비번 초기화
                </button>
            </div>
        );
    };

    // Column Definitions
    const colDefs = useMemo(() => [
        { field: "id", headerName: "ID", width: 70 },
        { field: "username", headerName: "아이디", filter: true, width: 150 },
        { field: "email", headerName: "이메일", filter: true, width: 180 },
        { field: "name", headerName: "성명", filter: true, width: 120 },
        { field: "companyName", headerName: "업체명", filter: true, width: 160 },
        { field: "department", headerName: "부서", width: 130 },
        {
            field: "role", headerName: "현재 권한", width: 160, valueFormatter: p => {
                const roleObj = roles.find(r => r.roleKey === p.value);
                return roleObj ? roleObj.displayName : p.value;
            }
        },
        { field: "locked", headerName: "잠금상태", cellRenderer: (params) => params.value ? "🔒 잠김" : "🔓 정상", width: 100 },
        { field: "failedAttempts", headerName: "실패횟수", width: 90 },
        { field: "emailVerified", headerName: "이메일인증", cellRenderer: (params) => params.value ? "✅ 완료" : "⏳ 미인증", width: 100 },
        { field: "enabled", headerName: "승인여부", cellRenderer: (params) => params.value ? "✅ 승인" : "❌ 대기", width: 100 },
        {
            headerName: "관리 작업",
            cellRenderer: ActionsRenderer,
            width: 310,
            sortable: false,
            filter: false
        }
    ], [roles]);

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>

            {/* 3단계 표준 헤더 레이아웃 */}
            <div className="page-header-standard" style={{
                marginBottom: '20px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '24px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #f1f5f9'
            }}>
                {/* 1단계: 생성 및 연동 (최상단) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            👥 사용자 관리 및 승인
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {activeTab === 'users' && (
                            <button
                                onClick={() => setShowRoleGuide(!showRoleGuide)}
                                className="outline"
                                style={{ padding: '8px 16px', fontWeight: '600', height: '40px', borderColor: '#cbd5e1' }}
                            >
                                {showRoleGuide ? '💡 권한 가이드라인 숨기기' : '💡 시스템 권한표 보기'}
                            </button>
                        )}
                    </div>
                </div>

                {/* 2단계: 핵심 제어 (중단) */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderTop: '1px solid #f1f5f9',
                    borderBottom: '1px solid #f1f5f9'
                }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: '13px' }}>
                            사용자 승인 및 권한을 관리합니다.
                        </div>
                        {currentUser?.roles?.some(r => (r.authority || r).includes('ROLE_ADMIN')) && (
                            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                                <button
                                    onClick={() => setActiveTab('users')}
                                    style={{
                                        padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', border: 'none',
                                        backgroundColor: activeTab === 'users' ? '#fff' : 'transparent',
                                        color: activeTab === 'users' ? '#1e293b' : '#64748b',
                                        boxShadow: activeTab === 'users' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    👥 사용자 목록
                                </button>
                                <button
                                    onClick={() => setActiveTab('settings')}
                                    style={{
                                        padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', border: 'none',
                                        backgroundColor: activeTab === 'settings' ? '#fff' : 'transparent',
                                        color: activeTab === 'settings' ? '#1e293b' : '#64748b',
                                        boxShadow: activeTab === 'settings' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ⚙️ 메일 설정
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {activeTab === 'users' && (
                            <>
                                <button
                                    className="outline"
                                    onClick={() => alert("사용자 목록 엑셀 다운로드 기능 준비 중입니다.")}
                                    style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                                >
                                    📊 결과 다운로드
                                </button>
                                <button
                                    className="primary"
                                    onClick={fetchUsers}
                                    style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                                >
                                    🔍 조회
                                </button>
                                <button
                                    className="outline"
                                    onClick={() => setSearchFields({ name: '', companyName: '', department: '', role: '' })}
                                    style={{ padding: '10px 16px', fontSize: '14px' }}
                                >
                                    ♻️ 초기화
                                </button>
                            </>
                        )}
                        {activeTab === 'settings' && (
                            <button
                                className="primary"
                                onClick={handleSaveSettings}
                                style={{ backgroundColor: '#1e293b', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                            >
                                💾 설정 저장
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {activeTab === 'users' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {showRoleGuide && (
                        <div style={{ marginBottom: '25px', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>🔐 시스템 계정별 권한 세부 가이드라인</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '10px', textAlign: 'left', width: '20%', color: '#64748b' }}>접근 권한명 (Role)</th>
                                        <th style={{ padding: '10px', textAlign: 'left', width: '25%', color: '#64748b' }}>조회 가능 메뉴</th>
                                        <th style={{ padding: '10px', textAlign: 'left', width: '25%', color: '#64748b' }}>조회 차단 메뉴</th>
                                        <th style={{ padding: '10px', textAlign: 'left', color: '#64748b' }}>데이터 생성/수정/삭제 권한</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.map(r => (
                                        <tr key={r.roleKey} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px' }}><strong>{r.displayName}</strong><br /><small style={{ color: '#94a3b8' }}>({r.roleKey})</small></td>
                                            <td style={{ padding: '10px', color: '#16a34a', fontWeight: 'bold' }}>
                                                {r.roleKey === 'ROLE_ADMIN' ? '전 메뉴 및 시스템 운영 메뉴' : '기본 업무 메뉴'}
                                            </td>
                                            <td style={{ padding: '10px', color: '#ef4444' }}>
                                                {r.roleKey === 'ROLE_ADMIN' ? '-' : '사용자 관리 등 일부 메뉴'}
                                            </td>
                                            <td style={{ padding: '10px', color: '#475569' }}>{r.description || '권한 상세 설명이 없습니다.'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 검색 필터 그리드 */}
                    <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>👤 성명</label>
                                <input
                                    type="text"
                                    placeholder="성명 검색"
                                    value={searchFields.name}
                                    onChange={(e) => setSearchFields({ ...searchFields, name: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🏢 업체명</label>
                                <input
                                    type="text"
                                    placeholder="업체명 검색"
                                    value={searchFields.companyName}
                                    onChange={(e) => setSearchFields({ ...searchFields, companyName: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>📁 부서</label>
                                <input
                                    type="text"
                                    placeholder="부서 검색"
                                    value={searchFields.department}
                                    onChange={(e) => setSearchFields({ ...searchFields, department: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔐 권한 (Role)</label>
                                <select
                                    value={searchFields.role}
                                    onChange={(e) => setSearchFields({ ...searchFields, role: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', height: '38px' }}
                                >
                                    <option value="">전체 권한 보기</option>
                                    {roles.map(r => (
                                        <option key={r.roleKey} value={r.roleKey}>{r.displayName} ({r.roleKey})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', marginTop: '10px' }}>
                        <AgGridReact theme="legacy"
                            rowHeight={54}
                            rowData={filteredRowData}
                            columnDefs={colDefs}
                            pagination={true}
                            paginationPageSize={100}
                            quickFilterText={quickFilterText}
                        />
                    </div>
                </div>)}

            {activeTab === 'settings' && (
                <div className="card" style={{ padding: '30px', maxWidth: '850px', margin: '0 auto', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ marginBottom: '24px', padding: '18px 20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ margin: 0, color: '#166534', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                📬 실제 메일 발송 서버 연동 설정 (Resend / SMTP)
                            </h4>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={fillResendDefaults}
                                    style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#15803d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                    title="Resend 기본 호스트, 포트, 계정을 원클릭으로 채웁니다."
                                >
                                    ⚡ Resend 기본값 자동 채우기
                                </button>
                                <button
                                    type="button"
                                    onClick={fillGmailDefaults}
                                    className="outline"
                                    style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                                    title="Gmail 기본 설정을 채웁니다."
                                >
                                    📮 Gmail 기본값
                                </button>
                            </div>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                            신규 사용자 가입 승인, 제조사 클레임 통보, 대책 회신 리마인드 등 시스템 전반의 실제 이메일 발송에 사용됩니다.<br />
                            <strong>💡 Resend 사용 가이드:</strong> Resend 계정 가입 후 발급받은 API Key(<code>re_...</code>)를 비밀번호 칸에 입력하고, 발신자 주소는 인증된 도메인(기본 테스트용: <code>onboarding@resend.dev</code>)으로 설정하시면 무료로 실제 메일이 정상 도착합니다.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gap: '18px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>SMTP 서버 주소 (Host)</label>
                                <input
                                    type="text"
                                    value={settings.SMTP_HOST || ''}
                                    onChange={e => setSettings({ ...settings, SMTP_HOST: e.target.value })}
                                    placeholder="예: smtp.resend.com"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>SMTP 포트 (Port)</label>
                                <input
                                    type="text"
                                    value={settings.SMTP_PORT || ''}
                                    onChange={e => setSettings({ ...settings, SMTP_PORT: e.target.value })}
                                    placeholder="465 (SSL) 또는 587 (TLS)"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>이메일 계정 (Username)</label>
                                <input
                                    type="text"
                                    value={settings.SMTP_USERNAME || ''}
                                    onChange={e => setSettings({ ...settings, SMTP_USERNAME: e.target.value })}
                                    placeholder="Resend 사용 시 'resend' 입력"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                                />
                                <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                    * Resend SMTP의 계정 아이디는 고정값 <code>resend</code> 입니다.
                                </small>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>발신자 이메일 주소 (From Address)</label>
                                <input
                                    type="email"
                                    value={settings.SMTP_FROM_ADDRESS || ''}
                                    onChange={e => setSettings({ ...settings, SMTP_FROM_ADDRESS: e.target.value })}
                                    placeholder="예: onboarding@resend.dev 또는 회사 도메인"
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                                />
                                <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                    * 메일 수신자에게 표시될 발신자 주소 (미입력 시 계정 주소 자동 사용)
                                </small>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', display: 'flex', justifyContent: 'space-between' }}>
                                <span>이메일 비밀번호 / Resend API Key</span>
                                {settings.SMTP_PASSWORD === '********' && (
                                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 'bold' }}>
                                        🔒 기존 비밀번호 암호화 저장됨
                                    </span>
                                )}
                            </label>
                            <input
                                type="password"
                                value={settings.SMTP_PASSWORD || ''}
                                onChange={e => setSettings({ ...settings, SMTP_PASSWORD: e.target.value })}
                                placeholder={settings.SMTP_PASSWORD === '********' ? '기존 비밀번호가 안전하게 유지 중입니다 (변경 시에만 새 값 입력)' : 'Resend API Key(re_...) 또는 앱 비밀번호 입력'}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: settings.SMTP_PASSWORD === '********' ? '#f8fafc' : '#fff' }}
                            />
                            <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                ※ Resend 사용 시 <code>re_...</code> 형태의 API Key를 입력하세요. 서버에 안전하게 AES 암호화되어 보관됩니다.
                            </small>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button 
                            className="primary" 
                            onClick={handleSaveSettings} 
                            style={{ padding: '12px 28px', fontSize: '14px', fontWeight: 'bold', borderRadius: '8px' }}
                        >
                            💾 메일 설정 저장하기
                        </button>
                    </div>

                    {/* 실시간 메일 수신 테스트 섹션 */}
                    <div style={{ marginTop: '30px', paddingTop: '24px', borderTop: '1px dashed #cbd5e1' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🧪 실시간 메일 수신 테스트 (도착 확인)
                        </h4>
                        <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b' }}>
                            위 설정을 저장하신 후, 실제 본인 이메일로 테스트 메일이 도착하는지 지금 즉시 확인해볼 수 있습니다.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input 
                                type="email"
                                value={testEmailAddress}
                                onChange={e => setTestEmailAddress(e.target.value)}
                                placeholder="테스트 수신 이메일 주소 입력"
                                style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                            />
                            <button
                                type="button"
                                onClick={handleTestEmail}
                                disabled={isTestingEmail}
                                style={{ padding: '10px 20px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: isTestingEmail ? 'not-allowed' : 'pointer', minWidth: '130px' }}
                            >
                                {isTestingEmail ? '발송 중...' : '✉️ 테스트 발송'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 커스텀 Confirm 모달 */}
            {confirmModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', minWidth: '320px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                        <p style={{ fontSize: '16px', marginBottom: '24px', color: '#333', fontWeight: '500' }}>{confirmModal.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })} style={{ padding: '8px 24px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', minWidth: '80px' }}>취소</button>
                            <button onClick={() => {
                                setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                                if (confirmModal.onConfirm) confirmModal.onConfirm();
                            }} style={{ padding: '8px 24px', backgroundColor: '#003366', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', minWidth: '80px' }}>확인</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 커스텀 Alert 모달 */}
            {alertModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', minWidth: '320px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                        <p style={{ fontSize: '16px', marginBottom: '24px', color: '#333', fontWeight: '500' }}>{alertModal.message}</p>
                        <button onClick={() => setAlertModal({ isOpen: false, message: '' })} style={{ padding: '8px 32px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>확인</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;
