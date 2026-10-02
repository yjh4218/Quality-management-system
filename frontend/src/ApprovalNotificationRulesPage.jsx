import React, { useState, useEffect, useCallback } from 'react';
import { fetchNotificationRules, updateNotificationRule } from './api';
import { usePermissions } from './usePermissions';

const ApprovalNotificationRulesPage = ({ 
    user,
    showAlert = (msg) => console.info(msg) 
}) => {
    const { canView, canEdit, isAdmin } = usePermissions(user);
    const hasView = isAdmin || canView('approvalNotificationRules');
    const hasEdit = isAdmin || canEdit('approvalNotificationRules');

    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(false);

    if (user && !hasView) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', borderRadius: '8px', margin: '20px', border: '1px solid #fee2e2' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⛔</div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>접근 권한 없음</h3>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>이 페이지는 결재 알림 설정 조회 권한이 있는 사용자만 접근할 수 있습니다.</p>
            </div>
        );
    }

    const loadRules = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchNotificationRules();
            setRules(res.data || []);
        } catch (err) {
            showAlert?.("알림 규칙 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [showAlert]);

    useEffect(() => {
        loadRules();
    }, [loadRules]);

    const handleToggle = async (id, currentVal) => {
        try {
            const nextVal = !currentVal;
            await updateNotificationRule(id, nextVal);
            setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: nextVal } : r));
        } catch (err) {
            showAlert?.("알림 규칙 변경에 실패했습니다.");
        }
    };

    const eventNames = {
        'MY_TURN': { title: '내 결재 차례 도래', desc: '이전 결재자가 승인하여 나의 승인 차례가 되었을 때' },
        'REFERENCE_TAGGED': { title: '참조자 지정', desc: '결재 문서에 참조자로 지정되었을 때' },
        'REJECTED': { title: '결재 반려', desc: '결재선에서 반려되었을 때 (상신자 알림)' },
        'APPROVED': { title: '결재 최종 완료', desc: '모든 결재선 승인이 완료되었을 때 (상신자 알림)' },
        'RECALLED': { title: '결재 상신 회수', desc: '상신자가 문서를 회수했을 때' }
    };

    const channels = ['IN_APP', 'EMAIL'];

    // Group rules by eventType
    const grouped = rules.reduce((acc, r) => {
        acc[r.eventType] = acc[r.eventType] || {};
        acc[r.eventType][r.channel] = r;
        return acc;
    }, {});

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', boxSizing: 'border-box' }}>
            <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                    🔔 결재 알림 발송 규칙 설정
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                    전자결재 이벤트 발생 시 인앱 실시간 알림(SSE) 및 이메일 자동 발송 여부를 이벤트별로 제어합니다.
                </p>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                            <th style={{ padding: '14px 20px', width: '25%' }}>발송 이벤트</th>
                            <th style={{ padding: '14px 20px', width: '45%' }}>설명</th>
                            <th style={{ padding: '14px 20px', textAlign: 'center', width: '15%' }}>📲 인앱 알림 (SSE)</th>
                            <th style={{ padding: '14px 20px', textAlign: 'center', width: '15%' }}>✉️ 이메일 발송</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(eventNames).map(evtKey => {
                            const evtInfo = eventNames[evtKey];
                            const inAppRule = grouped[evtKey]?.['IN_APP'];
                            const emailRule = grouped[evtKey]?.['EMAIL'];

                            return (
                                <tr key={evtKey} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '14px 20px', fontWeight: 'bold', color: '#1e293b' }}>
                                        {evtInfo.title}
                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{evtKey}</div>
                                    </td>
                                    <td style={{ padding: '14px 20px', color: '#64748b' }}>
                                        {evtInfo.desc}
                                    </td>
                                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                        {inAppRule ? (
                                            <label style={{ cursor: hasEdit ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={inAppRule.isActive}
                                                    disabled={!hasEdit}
                                                    onChange={() => hasEdit && handleToggle(inAppRule.id, inAppRule.isActive)}
                                                    style={{ width: '16px', height: '16px', cursor: hasEdit ? 'pointer' : 'default' }}
                                                />
                                                <span style={{ fontSize: '12px', fontWeight: inAppRule.isActive ? 'bold' : 'normal', color: inAppRule.isActive ? '#16a34a' : '#94a3b8' }}>
                                                    {inAppRule.isActive ? '켜짐' : '꺼짐'}
                                                </span>
                                            </label>
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                        {emailRule ? (
                                            <label style={{ cursor: hasEdit ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={emailRule.isActive}
                                                    disabled={!hasEdit}
                                                    onChange={() => hasEdit && handleToggle(emailRule.id, emailRule.isActive)}
                                                    style={{ width: '16px', height: '16px', cursor: hasEdit ? 'pointer' : 'default' }}
                                                />
                                                <span style={{ fontSize: '12px', fontWeight: emailRule.isActive ? 'bold' : 'normal', color: emailRule.isActive ? '#16a34a' : '#94a3b8' }}>
                                                    {emailRule.isActive ? '켜짐' : '꺼짐'}
                                                </span>
                                            </label>
                                        ) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ApprovalNotificationRulesPage;
