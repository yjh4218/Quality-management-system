import React, { useState, useEffect } from 'react';
import { getNotificationSettings, updateNotificationSetting, createNotificationSetting, getRoles } from './api';
import { toast } from 'react-toastify';

/**
 * QMS 알림 설정 관리 페이지 (NotificationSettingsPage)
 * [디자인 표준화] 제품코드 마스터의 40px 여백 및 표준 헤더 레이아웃을 적용했습니다.
 * [권한 연동] '🔐 시스템 권한 마스터 관리'의 권한 리스트(getRoles)를 실시간 바인딩하여 수신 대상 역할군을 체크박스 매트릭스로 렌더링합니다.
 * [설명 기록] 각 이벤트가 발생하는 조건 및 시점을 관리자가 기록하고 한글로 직접 모니터링할 수 있도록 보관합니다.
 * [유형 추가] 관리자가 직접 새로운 알림 유형 및 코드를 등록할 수 있는 팝업 모달 폼을 제공합니다.
 */

const NotificationSettingsPage = ({ user }) => {
    const [settings, setSettings] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    // Modal state for adding a new event type
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newSetting, setNewSetting] = useState({
        displayName: '',
        eventType: '',
        description: '',
        sourceDomain: '',
        sourceAction: 'CREATE',
        targetRoles: []
    });
    const [isSavingNew, setIsSavingNew] = useState(false);

    const DOMAIN_OPTIONS = [
        { value: '', label: '직접 지정 (이벤트 코드 사용)' },
        { value: 'ANNOUNCEMENT', label: '공지사항 (ANNOUNCEMENT)' },
        { value: 'CLAIM', label: '클레임 (CLAIM)' },
        { value: 'BOM', label: 'BOM (BOM)' },
        { value: 'PRODUCT', label: '제품/품목 (PRODUCT)' },
        { value: 'AUDIT', label: '생산감사 (AUDIT)' },
        { value: 'USER', label: '사용자계정 (USER)' }
    ];

    const ACTION_OPTIONS = [
        { value: 'CREATE', label: '신규 등록 시 (CREATE)' },
        { value: 'UPDATE', label: '상태 수정 시 (UPDATE)' },
        { value: 'DELETE', label: '삭제 시 (DELETE)' }
    ];

    useEffect(() => {
        loadPageData();
    }, []);

    const loadPageData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchSettings(),
                fetchRolesList()
            ]);
        } catch (error) {
            console.error("Failed to load page data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const data = await getNotificationSettings();
            if (Array.isArray(data)) {
                setSettings(data);
            } else {
                toast.error("알림 설정 데이터를 불러오지 못했습니다.");
            }
        } catch (error) {
            console.error("Failed to fetch notification settings:", error);
            toast.error("알림 설정 조회 중 오류가 발생했습니다.");
        }
    };

    const fetchRolesList = async () => {
        try {
            const res = await getRoles();
            if (res && res.data) {
                setRoles(res.data);
            } else {
                toast.error("시스템 권한 목록을 불러오지 못했습니다.");
            }
        } catch (error) {
            console.error("Failed to fetch roles:", error);
            toast.error("시스템 권한 조회 중 오류가 발생했습니다.");
        }
    };

    const handleRoleToggle = (settingId, roleKey) => {
        setSettings(prevSettings =>
            prevSettings.map(setting => {
                if (setting.id !== settingId) return setting;

                const currentRoles = setting.targetRoles
                    ? setting.targetRoles.split(',').map(r => r.trim()).filter(Boolean)
                    : [];

                let newRoles;
                if (currentRoles.includes(roleKey)) {
                    newRoles = currentRoles.filter(r => r !== roleKey);
                } else {
                    newRoles = [...currentRoles, roleKey];
                }

                return {
                    ...setting,
                    targetRoles: newRoles.join(',')
                };
            })
        );
    };

    const handleSaveSetting = async (setting) => {
        setUpdatingId(setting.id);
        try {
            // Send full payload including displayName, description, sourceDomain, sourceAction and targetRoles
            const res = await updateNotificationSetting(setting.id, {
                displayName: setting.displayName,
                description: setting.description,
                sourceDomain: setting.sourceDomain,
                sourceAction: setting.sourceAction,
                targetRoles: setting.targetRoles
            });
            if (res && res.id) {
                toast.success(`'${setting.displayName}' 알림 수신 설정이 성공적으로 저장되었습니다.`);
                fetchSettings();
            } else {
                toast.error("알림 설정 저장에 실패했습니다.");
            }
        } catch (error) {
            console.error("Failed to save setting:", error);
            toast.error("알림 설정 저장 중 시스템 오류가 발생했습니다.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleOpenModal = () => {
        setNewSetting({
            displayName: '',
            eventType: '',
            description: '',
            sourceDomain: '',
            sourceAction: 'CREATE',
            targetRoles: []
        });
        setIsModalOpen(true);
    };

    const handleModalRoleToggle = (roleKey) => {
        setNewSetting(prev => {
            const current = prev.targetRoles;
            const next = current.includes(roleKey)
                ? current.filter(r => r !== roleKey)
                : [...current, roleKey];
            return { ...prev, targetRoles: next };
        });
    };

    const handleCreateSetting = async (e) => {
        e.preventDefault();
        if (!newSetting.displayName || !newSetting.eventType) {
            toast.warning("이벤트명과 코드는 필수 입력 항목입니다.");
            return;
        }

        setIsSavingNew(true);
        try {
            const payload = {
                ...newSetting,
                targetRoles: newSetting.targetRoles.join(',')
            };
            const res = await createNotificationSetting(payload);
            if (res && res.id) {
                toast.success(`신규 알림 유형 '${newSetting.displayName}'이 성공적으로 추가되었습니다.`);
                setIsModalOpen(false);
                fetchSettings();
            } else {
                toast.error("알림 유형 등록에 실패했습니다.");
            }
        } catch (error) {
            console.error("Failed to create notification setting:", error);
            const errorMsg = error.response?.data?.message || "알림 유형 등록 중 오류가 발생했습니다.";
            toast.error(errorMsg);
        } finally {
            setIsSavingNew(false);
        }
    };

    return (
        <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>🔔 알림 설정 관리</h2>
                    <p style={{ color: '#64748b', fontSize: '14px', marginTop: '5px' }}>
                        QMS 주요 이벤트 발생 시 실시간 알림을 수신받을 대상 역할군을 지정하고 통제합니다.
                    </p>
                </div>
                <button 
                    onClick={handleOpenModal}
                    className="primary"
                    style={{ 
                        padding: '10px 20px', 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        cursor: 'pointer',
                        borderRadius: '8px'
                    }}
                >
                    ➕ 신규 알림 유형 추가
                </button>
            </div>

            {/* List and Grid */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.02)', padding: '24px', border: '1px solid #e2e8f0' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px 0', flexDirection: 'column', gap: '16px' }}>
                        <div className="spinner-ring" style={{ width: '40px', height: '40px' }}></div>
                        <span style={{ color: '#64748b', fontSize: '14px' }}>알림 설정 및 권한 목록 동기화 중...</span>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>
                                    <th style={{ padding: '16px', minWidth: '180px' }}>알림 이벤트</th>
                                    <th style={{ padding: '16px', minWidth: '150px' }}>이벤트 코드</th>
                                    <th style={{ padding: '16px', minWidth: '160px' }}>발생 기준 (도메인/시점)</th>
                                    <th style={{ padding: '16px', minWidth: '220px' }}>발생 조건 설명 (기록)</th>
                                    <th style={{ padding: '16px' }}>수신 대상 설정 (시스템 등록 권한 연동)</th>
                                    <th style={{ padding: '16px', textAlign: 'center', width: '100px' }}>작업</th>
                                </tr>
                            </thead>
                            <tbody>
                                {settings.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                                            등록된 알림 설정 항목이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    settings.map((setting) => {
                                        const activeRoles = setting.targetRoles
                                            ? setting.targetRoles.split(',').map(r => r.trim())
                                            : [];

                                        return (
                                            <tr key={setting.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', transition: 'background-color 0.2s' }}>
                                                <td style={{ padding: '20px 16px', fontWeight: '600', color: '#0f172a' }}>
                                                    {setting.displayName}
                                                </td>
                                                <td style={{ padding: '20px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: '13px' }}>
                                                    {setting.eventType}
                                                </td>
                                                <td style={{ padding: '20px 16px', minWidth: '160px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <select
                                                            value={setting.sourceDomain || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, sourceDomain: val } : s));
                                                            }}
                                                            style={{ padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', width: '100%', outline: 'none' }}
                                                        >
                                                            {DOMAIN_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                        {setting.sourceDomain && (
                                                            <select
                                                                value={setting.sourceAction || 'CREATE'}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, sourceAction: val } : s));
                                                                }}
                                                                style={{ padding: '6px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', width: '100%', outline: 'none' }}
                                                            >
                                                                {ACTION_OPTIONS.map(opt => (
                                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '20px 16px', color: '#475569', fontSize: '13.5px', lineHeight: '1.5', maxWidth: '300px', wordBreak: 'break-all' }}>
                                                    <textarea 
                                                        value={setting.description || ''} 
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, description: val } : s));
                                                        }}
                                                        placeholder="발생 조건을 입력해 기록해두세요."
                                                        style={{
                                                            width: '100%',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '6px',
                                                            padding: '6px 10px',
                                                            fontSize: '13px',
                                                            fontFamily: 'inherit',
                                                            resize: 'vertical',
                                                            minHeight: '60px'
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '20px 16px' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                                                        {roles.map((role) => {
                                                            const isChecked = activeRoles.includes(role.roleKey);
                                                            return (
                                                                <label 
                                                                    key={role.id} 
                                                                    style={{ 
                                                                        display: 'flex', 
                                                                        alignItems: 'center', 
                                                                        cursor: 'pointer',
                                                                        padding: '8px 12px',
                                                                        borderRadius: '6px',
                                                                        backgroundColor: isChecked ? '#eff6ff' : '#f8fafc',
                                                                        border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                                                                        transition: 'all 0.2s',
                                                                        userSelect: 'none'
                                                                    }}
                                                                >
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isChecked}
                                                                        onChange={() => handleRoleToggle(setting.id, role.roleKey)}
                                                                        style={{ marginRight: '8px', cursor: 'pointer' }}
                                                                    />
                                                                    <span style={{ fontSize: '13px', color: isChecked ? '#1e40af' : '#334155', fontWeight: isChecked ? '600' : 'normal' }}>
                                                                        {role.displayName}
                                                                    </span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '20px 16px', textAlign: 'center' }}>
                                                    <button 
                                                        onClick={() => handleSaveSetting(setting)}
                                                        disabled={updatingId === setting.id}
                                                        className="primary"
                                                        style={{ 
                                                            padding: '8px 16px', 
                                                            fontSize: '13px', 
                                                            whiteSpace: 'nowrap',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                                        }}
                                                    >
                                                        {updatingId === setting.id ? (
                                                            <>
                                                                <span className="spinner-ring" style={{ width: '12px', height: '12px', border: '2px solid #ffffff', borderTop: '2px solid transparent', display: 'inline-block', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '6px' }}></span>
                                                                저장 중
                                                            </>
                                                        ) : (
                                                            '저장'
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Dialog for Adding a New Notification Event */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        width: '100%', maxWidth: '600px', padding: '30px', animation: 'scaleUp 0.2s ease-out'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>➕ 신규 알림 이벤트 유형 추가</h3>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateSetting} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#344054', marginBottom: '6px' }}>
                                    알림 이벤트명 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={newSetting.displayName}
                                    onChange={(e) => setNewSetting(p => ({ ...p, displayName: e.target.value }))}
                                    placeholder="예: 원료 품질 승인 완료 통보"
                                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#344054', marginBottom: '6px' }}>
                                    이벤트 코드 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={newSetting.eventType}
                                    onChange={(e) => setNewSetting(p => ({ ...p, eventType: e.target.value.toUpperCase() }))}
                                    placeholder="예: INGREDIENT_APPROVED"
                                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontFamily: 'monospace' }}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#344054', marginBottom: '6px' }}>
                                        발생 도메인 (업무 영역)
                                    </label>
                                    <select
                                        value={newSetting.sourceDomain}
                                        onChange={(e) => setNewSetting(p => ({ ...p, sourceDomain: e.target.value }))}
                                        style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', backgroundColor: '#ffffff', outline: 'none' }}
                                    >
                                        {DOMAIN_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#344054', marginBottom: '6px' }}>
                                        발생 시점 (행위)
                                    </label>
                                    <select
                                        value={newSetting.sourceAction}
                                        onChange={(e) => setNewSetting(p => ({ ...p, sourceAction: e.target.value }))}
                                        disabled={!newSetting.sourceDomain}
                                        style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', backgroundColor: '#ffffff', outline: 'none' }}
                                    >
                                        {ACTION_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#344054', marginBottom: '6px' }}>
                                    발생 조건 설명 (기록용)
                                </label>
                                <textarea 
                                    value={newSetting.description}
                                    onChange={(e) => setNewSetting(p => ({ ...p, description: e.target.value }))}
                                    placeholder="어떤 경우에 이 알림 이벤트가 유발되는지 상세하게 기술하세요."
                                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#344054', marginBottom: '8px' }}>
                                    기본 수신 대상 설정 (시스템 권한 리스트 연동)
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '8px', border: '1px solid #edf2f7', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                                    {roles.map((role) => {
                                        const isChecked = newSetting.targetRoles.includes(role.roleKey);
                                        return (
                                            <label 
                                                key={role.id} 
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    cursor: 'pointer',
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked}
                                                    onChange={() => handleModalRoleToggle(role.roleKey)}
                                                    style={{ marginRight: '6px' }}
                                                />
                                                <span style={{ fontSize: '13px', color: isChecked ? '#1e40af' : '#475569' }}>
                                                    {role.displayName}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px', paddingTop: '15px', borderTop: '1px solid #edf2f7' }}>
                                <button 
                                    type="button" 
                                    className="secondary"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ minWidth: '80px' }}
                                >
                                    닫기
                                </button>
                                <button 
                                    type="submit" 
                                    className="primary"
                                    disabled={isSavingNew}
                                    style={{ minWidth: '120px', background: '#003366', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', padding: '10px 20px', cursor: isSavingNew ? 'not-allowed' : 'pointer' }}
                                >
                                    {isSavingNew ? '등록 중...' : '💾 이벤트 등록'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationSettingsPage;
