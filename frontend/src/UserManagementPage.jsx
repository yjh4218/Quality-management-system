import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import { getUsers, getRoles, approveUser, toggleUserStatus, updateUserRole, unlockUser, resetUserPassword, getSystemSettings, saveSystemSettings } from './api';
import { usePermissions } from './usePermissions';

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
        SMTP_PORT: '587',
        SMTP_USERNAME: '',
        SMTP_PASSWORD: ''
    });

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

    const showConfirm = React.useCallback((message, onConfirm) => {
        setConfirmModal({ isOpen: true, message, onConfirm });
    }, []);

    const showAlert = React.useCallback((message) => {
        setAlertModal({ isOpen: true, message });
    }, []);
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
        if (activeTab === 'settings') {
            fetchSettings();
        }
    }, [navigationData, activeTab]);

    const fetchSettings = async () => {
        try {
            const data = await getSystemSettings();
            setSettings(prev => ({ ...prev, ...data }));
        } catch (error) {
            showAlert("설정을 불러오는데 실패했습니다.");
        }
    };

    const handleSaveSettings = async () => {
        try {
            await saveSystemSettings(settings);
            showAlert("설정이 성공적으로 저장되었습니다.");
            fetchSettings();
        } catch (error) {
            showAlert("설정 저장에 실패했습니다.");
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await getRoles();
            setRoles(response.data);
        } catch (error) {
            // Error handled silently or via Toast
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await getUsers(searchFields);
            setRowData(response.data);
        } catch (error) {
            alert("사용자 목록을 불러오지 못했습니다. 관리자 권한을 확인하세요.");
        }
    };


    const handleApprove = async (id) => {
        showConfirm("이 사용자의 가입을 승인하시겠습니까?", async () => {
            try {
                await approveUser(id);
                showAlert("사용자가 승인되었습니다!");
                await fetchUsers(); // Refresh data
            } catch (error) {
                showAlert("승인 처리에 실패했습니다.");
            }
        });
    };

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
    }, [fetchUsers, showConfirm, showAlert]);

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
        { field: "name", headerName: "성명", filter: true, width: 150 },
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
    ], [rowData]);

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>👥 사용자 관리 및 승인</h2>
                    <p style={{ fontSize: '14px', color: '#666' }}>신규 가입자의 승인 처리 및 계정 잠금 해제, 시스템 권한 설정을 관리합니다.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={activeTab === 'users' ? 'primary' : 'outline'}
                        style={{ padding: '10px 16px', fontWeight: '600' }}
                    >
                        👥 사용자 목록
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={activeTab === 'settings' ? 'primary' : 'outline'}
                        style={{ padding: '10px 16px', fontWeight: '600' }}
                    >
                        ⚙️ 메일 발송 설정
                    </button>
                    {activeTab === 'users' && (
                        <>
                            <button onClick={() => setShowRoleGuide(!showRoleGuide)} className="secondary outline" style={{ padding: '10px 16px', fontWeight: '600' }}>
                                {showRoleGuide ? '💡 권한 가이드라인 숨기기' : '💡 시스템 권한표 보기'}
                            </button>
                            <button onClick={fetchUsers} className="primary" style={{ padding: '10px 24px', fontWeight: '600', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px' }}>🔍 조회</button>
                        </>
                    )}
                </div>
            </div>

            {activeTab === 'users' && (
                <>

            {showRoleGuide && (
                <div style={{ marginBottom: '25px', padding: '20px', backgroundColor: '#FCFFFF', borderRadius: '10px', border: '1px solid #cce5df', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '16px', color: '#0a6c75', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>🔐 시스템 계정별 권한 세부 가이드라인</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f4f7f6', borderBottom: '2px solid #ddd' }}>
                                <th style={{ padding: '10px', textAlign: 'left', width: '20%' }}>접근 권한명 (Role)</th>
                                <th style={{ padding: '10px', textAlign: 'left', width: '25%' }}>조회 가능 메뉴</th>
                                <th style={{ padding: '10px', textAlign: 'left', width: '25%' }}>조회 차단 메뉴</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>데이터 생성/수정/삭제 등 편집 권한</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map(r => (
                                <tr key={r.roleKey} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px' }}><strong>{r.displayName}</strong><br/><small style={{color:'#666'}}>({r.roleKey})</small></td>
                                    <td style={{ padding: '10px', color: r.roleKey === 'ROLE_ADMIN' ? '#2ecc71' : '#2ecc71', fontWeight: r.roleKey === 'ROLE_ADMIN' ? 'bold' : 'normal' }}>
                                        {r.roleKey === 'ROLE_ADMIN' ? '전 메뉴 및 시스템 운영 메뉴' : '기본 업무 메뉴'}
                                    </td>
                                    <td style={{ padding: '10px', color: '#e74c3c' }}>
                                        {r.roleKey === 'ROLE_ADMIN' ? '-' : '사용자 관리 등 일부 메뉴'}
                                    </td>
                                    <td style={{ padding: '10px' }}>{r.description || '권한 상세 설명이 없습니다.'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 검색 필터 영역 */}
            <div className="card" style={{ marginBottom: '15px', padding: '15px' }}>
                <div className="responsive-filter-grid">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>성명</label>
                        <input
                            type="text"
                            placeholder="성명 검색"
                            value={searchFields.name}
                            onChange={(e) => setSearchFields({ ...searchFields, name: e.target.value })}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>업체명</label>
                        <input
                            type="text"
                            placeholder="업체명 검색"
                            value={searchFields.companyName}
                            onChange={(e) => setSearchFields({ ...searchFields, companyName: e.target.value })}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>부서</label>
                        <input
                            type="text"
                            placeholder="부서 검색"
                            value={searchFields.department}
                            onChange={(e) => setSearchFields({ ...searchFields, department: e.target.value })}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>권한 (Role)</label>
                          <select
                              value={searchFields.role}
                              onChange={(e) => setSearchFields({ ...searchFields, role: e.target.value })}
                              style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', backgroundColor: '#fff' }}
                          >
                              <option value="">전체 권한 보기</option>
                              {roles.map(r => (
                                  <option key={r.roleKey} value={r.roleKey}>{r.displayName} ({r.roleKey})</option>
                              ))}
                          </select>
                    </div>
                </div>
            </div>

            <div className="ag-theme-alpine" style={{ height: 600, width: '100%', marginTop: '10px' }}>
                <AgGridReact theme="legacy"
                    rowHeight={50}
                    rowData={rowData}
                    columnDefs={colDefs}
                    pagination={true}
                    paginationPageSize={100}
                    quickFilterText={quickFilterText}
                />
            </div>
            </>)}

            {activeTab === 'settings' && (
                <div className="card" style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', border: '1px solid #eef2f6', borderRadius: '12px' }}>
                    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fffaf0', borderLeft: '4px solid #f6e05e', borderRadius: '4px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#b7791f' }}>⚠️ 메일 발송 계정 설정 안내</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#718096' }}>
                            신규 사용자 가입 시 자동 발송되는 알림 이메일의 발송자 정보를 입력합니다.<br />
                            Gmail을 추천하며, Gmail 계정 사용 시 <strong>[보안] ➔ [2단계 인증] ➔ [앱 비밀번호]</strong>를 생성하여 비밀번호 칸에 입력하셔야 합니다.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontWeight: '700' }}>SMTP 서버 주소 (Host)</label>
                            <input 
                                type="text" 
                                value={settings.SMTP_HOST || ''} 
                                onChange={e => setSettings({...settings, SMTP_HOST: e.target.value})} 
                                placeholder="예: smtp.gmail.com"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontWeight: '700' }}>SMTP 서버 포트 (Port)</label>
                            <input 
                                type="text" 
                                value={settings.SMTP_PORT || ''} 
                                onChange={e => setSettings({...settings, SMTP_PORT: e.target.value})} 
                                placeholder="예: 587"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontWeight: '700' }}>이메일 계정 (Username)</label>
                            <input 
                                type="text" 
                                value={settings.SMTP_USERNAME || ''} 
                                onChange={e => setSettings({...settings, SMTP_USERNAME: e.target.value})} 
                                placeholder="예: admin@example.com"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontWeight: '700' }}>이메일 비밀번호 (App Password)</label>
                            <input 
                                type="password" 
                                value={settings.SMTP_PASSWORD || ''} 
                                onChange={e => setSettings({...settings, SMTP_PASSWORD: e.target.value})} 
                                placeholder="기존 값이 유지됩니다. 변경하려면 입력하세요."
                            />
                            <small style={{ color: '#a0aec0', display: 'block', marginTop: '5px' }}>
                                ※ 일반 비밀번호가 아닌 '앱 비밀번호'를 입력하세요. 입력한 내용은 안전하게 암호화되어 저장됩니다.
                            </small>
                        </div>
                    </div>

                    <div style={{ marginTop: '30px', textAlign: 'right' }}>
                        <button className="primary" onClick={handleSaveSettings} style={{ padding: '12px 30px', fontSize: '15px' }}>
                            💾 설정 저장
                        </button>
                    </div>
                </div>
            )}

            {/* 커스텀 Confirm 모달 */}
            {confirmModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', minWidth: '320px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                        <p style={{ fontSize: '16px', marginBottom: '24px', color: '#333', fontWeight: '500' }}>{confirmModal.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button onClick={() => {
                                setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                                if (confirmModal.onConfirm) confirmModal.onConfirm();
                            }} style={{ padding: '8px 24px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>확인</button>
                            <button onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })} style={{ padding: '8px 24px', backgroundColor: '#e0e0e0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>취소</button>
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
