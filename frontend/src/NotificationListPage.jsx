import React, { useState, useEffect, useMemo } from 'react';
import { getMyNotifications, readNotification, readAllNotifications, deleteNotification, getClaimById } from './api';
import { toast } from 'react-toastify';
import { matchesMultiFieldTokens } from './utils/searchUtils';

/**
 * 🔔 알림 확인 페이지
 * [디자인 표준] QMS 표준 둥근 모서리 및 HSL 컬러, 로딩 스피너 및 토스트 피드백 적용
 * [기능] 전체/미확인/확인완료 필터, 개별/전체 읽음 처리, 삭제 처리, 업무 화면 이동(Deep Link) 지원
 */
const NotificationListPage = ({ user, onNavigate }) => {
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('ALL'); // ALL, UNREAD, READ
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const res = await getMyNotifications();
            if (res && res.data) {
                setNotifications(res.data);
            }
        } catch (err) {
            console.error("Failed to load notifications", err);
            toast.error("알림 목록을 불러오지 못했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    // 필터링된 알림 목록 (탭 필터 + 다중 키워드 AND 검색)
    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            if (filter === 'UNREAD' && n.read) return false;
            if (filter === 'READ' && !n.read) return false;

            if (searchQuery.trim()) {
                const combinedFields = [n.title, n.message, n.type];
                if (!matchesMultiFieldTokens(combinedFields, searchQuery)) {
                    return false;
                }
            }

            return true;
        });
    }, [notifications, filter, searchQuery]);

    const handleRead = async (id, linkUrl) => {
        try {
            await readNotification(id);
            fetchNotifications();
            toast.success("알림을 확인 처리했습니다.");

            // 딥링크 이동 처리
            if (linkUrl && onNavigate) {
                const url = new URL(linkUrl, window.location.origin);
                const searchParams = url.searchParams;
                const claimId = searchParams.get('claimId');
                const auditId = searchParams.get('auditId');
                const itemCode = searchParams.get('itemCode');

                if (claimId) {
                    getClaimById(claimId, false).then(res => {
                        if (res && res.data) {
                            onNavigate('claims', res.data);
                        }
                    });
                } else if (itemCode) {
                    onNavigate('qualityPhotoAudit', { auditId, itemCode });
                } else {
                    const pathMap = {
                        '/user-management': 'users',
                        '/claims': 'claims',
                        '/production-audits': 'qualityPhotoAudit',
                        '/announcements': 'announcements'
                    };
                    const pageKey = pathMap[url.pathname];
                    if (pageKey) onNavigate(pageKey);
                }
            }
        } catch (err) {
            console.error("Failed to read notification", err);
            toast.error("알림 확인 처리에 실패했습니다.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("이 알림을 삭제하시겠습니까?")) return;
        try {
            await deleteNotification(id);
            fetchNotifications();
            toast.success("알림이 삭제되었습니다.");
        } catch (err) {
            console.error("Failed to delete notification", err);
            toast.error("알림 삭제에 실패했습니다.");
        }
    };

    const handleReadAll = async () => {
        const hasUnread = notifications.some(n => !n.read);
        if (!hasUnread) {
            toast.info("확인할 미확인 알림이 없습니다.");
            return;
        }

        try {
            await readAllNotifications();
            fetchNotifications();
            toast.success("모든 알림을 확인 처리했습니다.");
        } catch (err) {
            console.error("Failed to read all notifications", err);
            toast.error("전체 읽음 처리에 실패했습니다.");
        }
    };

    const getTypeBadgeClass = (type) => {
        switch (type) {
            case 'CLAIM': return 'notification-type-badge claim';
            case 'PRODUCTION_AUDIT': return 'notification-type-badge audit';
            case 'USER_APPROVAL': return 'notification-type-badge approval';
            default: return 'notification-type-badge announcement';
        }
    };

    const getTypeName = (type) => {
        switch (type) {
            case 'CLAIM': return '클레임';
            case 'PRODUCTION_AUDIT': return '생산감리';
            case 'USER_APPROVAL': return '사용자승인';
            default: return '공지';
        }
    };

    return (
        <div className="page-container-inner" style={{ padding: '30px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 120px)' }}>
            {/* 페이지 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>🔔 수신 알림 확인</h2>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>QMS 내에서 발생한 최근 변경사항 및 검토 요청 이력입니다.</p>
                </div>
                <button 
                    onClick={handleReadAll} 
                    className="primary"
                    style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    ✓ 모든 알림 확인 처리
                </button>
            </div>

            {/* 필터 탭 바 및 다중 키워드 검색창 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                        { key: 'ALL', label: '전체 알림' },
                        { key: 'UNREAD', label: `미확인 (${notifications.filter(n => !n.read).length})` },
                        { key: 'READ', label: '확인 완료' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '13.5px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                backgroundColor: filter === tab.key ? '#e2e8f0' : 'transparent',
                                color: filter === tab.key ? '#0f172a' : '#64748b',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ minWidth: '280px' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="🔍 알림 내용/제목 다중 검색 (예: 클레임, 토너)"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                    />
                </div>
            </div>

            {/* 알림 리스트 영역 */}
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                    <div className="spinner-ring"></div>
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div style={{
                    padding: '80px 20px',
                    textAlign: 'center',
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    color: '#94a3b8',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '48px' }}>🔔</span>
                    <p style={{ fontSize: '14px', margin: 0 }}>해당 조건에 해당하는 알림 사항이 없습니다.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredNotifications.map(n => (
                        <div 
                            key={n.id} 
                            style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '20px',
                                boxShadow: n.read ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)',
                                borderLeft: n.read ? '1px solid #e2e8f0' : '4px solid #3b82f6',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span className={getTypeBadgeClass(n.type)}>
                                        {getTypeName(n.type)}
                                    </span>
                                    <span style={{ fontSize: '15px', fontWeight: n.read ? '600' : '700', color: '#1e293b' }}>
                                        {n.title}
                                    </span>
                                </div>
                                <p style={{ fontSize: '13.5px', color: '#475569', margin: '4px 0 0 0', lineHeight: '1.5', wordBreak: 'break-all' }}>
                                    {n.message}
                                </p>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                    수신일시: {n.createdAt ? new Date(n.createdAt).toLocaleString('ko-KR') : '-'}
                                </div>
                            </div>

                            {/* 액션 버튼 그룹 */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', shrink: 0 }}>
                                {n.linkUrl && (
                                    <button 
                                        className="secondary"
                                        onClick={() => handleRead(n.id, n.linkUrl)}
                                        style={{ padding: '8px 14px', fontSize: '12.5px', fontWeight: 'bold' }}
                                    >
                                        🔍 상세 화면 이동
                                    </button>
                                )}
                                {!n.read && (
                                    <button 
                                        className="secondary"
                                        onClick={async () => {
                                            try {
                                                await readNotification(n.id);
                                                fetchNotifications();
                                                toast.success("알림을 확인 처리했습니다.");
                                            } catch (err) {
                                                console.error("Failed to read notification", err);
                                                toast.error("알림 확인 처리에 실패했습니다.");
                                            }
                                        }}
                                        style={{ padding: '8px 14px', fontSize: '12.5px' }}
                                    >
                                        확인
                                    </button>
                                )}
                                <button 
                                    className="secondary"
                                    onClick={() => handleDelete(n.id)}
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: '12.5px',
                                        color: '#ef4444',
                                        backgroundColor: '#fee2e2',
                                        border: '1px solid #fca5a5'
                                    }}
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationListPage;
