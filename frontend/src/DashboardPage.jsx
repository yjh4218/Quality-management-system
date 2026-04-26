import React, { useState, useEffect, useRef } from 'react';
import { getDashboard } from './api';
import './DashboardPage.css';
import { usePermissions } from './usePermissions';

/**
 * 전역 대시보드 화면 컴포넌트입니다.
 * 서버로부터 전달받은 위젯 설정(widgetConfig)에 따라 위젯들을 동적으로 렌더링합니다.
 * 
 * @param {Object} props
 * @param {Object} props.user - 현재 로그인한 사용자의 정보
 * @param {Function} props.onNavigate - 페이지 이동을 처리하는 핸들러 함수
 */
const DashboardPage = ({ user, onNavigate }) => {
    const { isAdmin, hasPerm } = usePermissions(user);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const result = await getDashboard();
                setData(result);
            } catch (err) {
                setError("데이터를 불러오는 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <div className="dashboard-loading">데이터를 분석 중입니다...</div>;
    if (error) return <div className="dashboard-error">{error}</div>;
    if (!data) return null;

    const isQuality = hasPerm('INBOUND_INSPECTION_EDIT') || hasPerm('QUALITY_TEAM_VIEW'); // General quality right
    const isManufacturer = user?.roles?.some(r => r.authority === 'ROLE_MANUFACTURER');
    const isSales = hasPerm('SALES_TEAM_VIEW');

    /**
     * 위젯 키별 렌더링 함수를 저장하는 맵입니다.
     * 새로운 위젯 종류가 추가될 경우 이곳에 렌더러를 정의하면 대시보드 빌더에서 즉시 사용 가능합니다.
     */
    const renderers = {
        WIDGET_NEW_PRODUCTS: () => (
            <section className="dashboard-section card" key="new_products">
                <div className="section-header">
                    <span className="icon">📦</span>
                    <h2>최근 {isAdmin ? '1개월' : '2주'} 동안 등록된 품목</h2>
                    <span className="count">{data.newProducts?.length || 0}</span>
                </div>
                {data.newProducts?.length > 0 ? (
                    <ul className="dashboard-list scrollable">
                        {data.newProducts.map(item => (
                            <li key={item.id} onClick={() => onNavigate('products', { id: item.id })} className="clickable">
                                <span className="code"><span className="item-label">코드</span>{item.code}</span>
                                <span className="name">
                                    <span className="item-label">제품명</span>
                                    {item.extraInfo?.isMaster && <span className="badge master">[마스터]</span>}
                                    {item.extraInfo?.isPlanningSet && <span className="badge planning">[기획세트]</span>}
                                    {item.name}
                                </span>
                                <span className="date"><span className="item-label">등록일</span>{item.date}</span>
                            </li>
                        ))}
                    </ul>
                ) : <div className="empty-section-msg">최근 등록된 품목이 없습니다.</div>}
            </section>
        ),
        WIDGET_PENDING_USERS: () => (
            <section className="dashboard-section card highlight" key="pending_users">
                <div className="section-header">
                    <span className="icon">👥</span>
                    <h2>사용자 승인 대기</h2>
                    <span className="count urgent">{data.pendingUsers?.length || 0}</span>
                </div>
                {data.pendingUsers?.length > 0 ? (
                    <ul className="dashboard-list scrollable-small">
                        {data.pendingUsers.map(item => (
                            <li key={item.id} onClick={() => onNavigate('users', { username: item.code })} className="clickable">
                                <span className="name">{item.name} ({item.code})</span>
                                <span className="company">{item.category}</span>
                                <button className="goto-btn">승인하기</button>
                            </li>
                        ))}
                    </ul>
                ) : <div className="empty-section-msg">승인 대기 중인 사용자가 없습니다.</div>}
            </section>
        ),
        WIDGET_AUDIT_LOGS: () => (
            <section className="dashboard-section card" key="audit_logs">
                <div className="section-header">
                    <span className="icon">📜</span>
                    <h2>최근 시스템 변경 이력</h2>
                </div>
                {data.auditLogs?.length > 0 ? (
                    <ul className="dashboard-list compact scrollable-small">
                        {data.auditLogs.map(item => (
                            <li key={item.id}>
                                <span className="action">[{item.status}]</span>
                                <span className="desc">{item.name}</span>
                                <span className="date">{item.date}</span>
                            </li>
                        ))}
                    </ul>
                ) : <div className="empty-section-msg">최근 변경 이력이 없습니다.</div>}
            </section>
        ),
        WIDGET_QUALITY_INBOUNDS: () => (
            <section className="dashboard-section card" key="quality_inbounds">
                <div className="section-header">
                    <span className="icon">⚖️</span>
                    <h2>최근 1개월 간 {isManufacturer ? '자사 ' : ''}입고된 품목 내역</h2>
                    <span className="count">{data.qualityInbounds?.length || 0}</span>
                </div>
                {data.qualityInbounds?.length > 0 ? (
                    <ul className="dashboard-list scrollable">
                        {data.qualityInbounds.map(item => (
                            <li key={item.id} onClick={() => onNavigate('quality', { id: item.id })} className="clickable detailed-item">
                                <div className="item-header">
                                    <span className="code"><span className="item-label">코드</span>{item.code}</span>
                                    <span className="name"><span className="item-label">제품명</span>{item.name}</span>
                                    <span className="status-tag" style={{ backgroundColor: '#e7f5ff', color: '#1971c2' }}>
                                        {item.status || '상태 없음'}
                                    </span>
                                    <span className="date"><span className="item-label">입고일</span>{item.date}</span>
                                </div>
                                <div className="item-details">
                                    <span className="detail-tag">입고수량: {item.extraInfo?.quantity?.toLocaleString() || 0}개</span>
                                    <span className="detail-tag">로트: {item.extraInfo?.lotNumber || '미지정'}</span>
                                    <span className="detail-tag">제조사: {item.category || '미지정'}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <div className="empty-section-msg">최근 입고된 품목이 없습니다.</div>}
            </section>
        ),
        WIDGET_PENDING_DIMENSIONS: () => (
            <section className="dashboard-section card warning" key="pending_dimensions">
                <div className="section-header">
                    <span className="icon">📐</span>
                    <h2>체적 확정 대기 중인 품목 (가안 상태)</h2>
                    <span className="count">{data.pendingDimensions?.length || 0}</span>
                </div>
                {data.pendingDimensions?.length > 0 ? (
                    <ul className="dashboard-list scrollable">
                        {data.pendingDimensions.map(item => (
                            <li key={item.id} onClick={() => onNavigate('products', { id: item.id })} className="clickable detailed-item" style={{ padding: '8px 0' }}>
                                <div className="item-header" style={{ marginBottom: 0 }}>
                                    <span className="code"><span className="item-label">코드</span>{item.code}</span>
                                    <span className="name"><span className="item-label">제품명</span>{item.name}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <div className="empty-section-msg">체적 확정 대기 중인 품목이 없습니다.</div>}
            </section>
        ),
        WIDGET_CONFIRMED_DIMENSIONS: () => (
            <section className="dashboard-section card success" key="confirmed_dimensions">
                <div className="section-header">
                    <span className="icon">✅</span>
                    <h2>최근 {(isSales || isAdmin) ? '1개월' : '2주'} 간 체적이 확정된 품목</h2>
                    <span className="count">{data.confirmedDimensions?.length || 0}</span>
                </div>
                {data.confirmedDimensions?.length > 0 ? (
                    <ul className="dashboard-list scrollable-small">
                        {data.confirmedDimensions.map(item => (
                            <li key={item.id} onClick={() => onNavigate('products', { id: item.id })} className="clickable detailed-item">
                                <div className="item-header">
                                    <span className="code"><span className="item-label">코드</span>{item.code}</span>
                                    <span className="name"><span className="item-label">제품명</span>{item.name}</span>
                                </div>
                                <div className="item-details">
                                    <span className="detail-tag">체적 확정됨 ({item.date})</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <div className="empty-section-msg">최근 확정된 체적 정보가 없습니다.</div>}
            </section>
        ),
        WIDGET_RECENT_CLAIMS: () => (
            <section className="dashboard-section card error" key="recent_claims">
                <div className="section-header">
                    <span className="icon">⚠️</span>
                    <h2>최근 1개월 간 {isManufacturer ? '자사 제품 ' : ''}클레임 인입 내역</h2>
                    <span className="count">{data.recentClaims?.length || 0}</span>
                </div>
                {data.recentClaims?.length > 0 ? (
                    <ul className="dashboard-list scrollable">
                        {data.recentClaims.map(item => (
                            <li key={item.id} onClick={() => onNavigate('claims', { id: item.id, itemCode: item.code, productName: item.name })} className="clickable detailed-item">
                                <div className="item-header">
                                    <span className="code"><span className="item-label">코드</span>{item.code}</span>
                                    <span className="name"><span className="item-label">제품명</span>{item.name}</span>
                                    <span className="status-tag" style={{ backgroundColor: item.status === '4. 클레임 종결' ? '#28a745' : '#dc3545', color: '#fff' }}>
                                        {item.status || '대기'}
                                    </span>
                                    <span className="date"><span className="item-label">접수일</span>{item.date}</span>
                                </div>
                                <div className="item-details">
                                    <span className="detail-tag">제조사: {item.category}</span>
                                    <span className="detail-tag">대분류: {item.extraInfo?.primaryCategory || '미지정'}</span>
                                    <span className="detail-tag">로트: {item.extraInfo?.lotNumber || '미지정'}</span>
                                    <span className="detail-tag">국가: {item.extraInfo?.country || '국내'}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="empty-section-msg">최근 1개월 간 인입된 클레임 내역이 없습니다.</div>
                )}
            </section>
        ),
        WIDGET_MFR_COMPLETED_CLAIMS: () => (
            <section className="dashboard-section card success highlight" key="mfr_completed_claims">
                <div className="section-header">
                    <span className="icon">✅</span>
                    <h2 style={{ color: '#2b8a3e' }}>최근 1개월 간 제조사 답변 완료 클레임 항목</h2>
                    <span className="count" style={{ backgroundColor: '#2b8a3e' }}>{data.completedMfrClaims?.length || 0}</span>
                </div>
                {data.completedMfrClaims?.length > 0 ? (
                    <ul className="dashboard-list scrollable-small">
                        {data.completedMfrClaims.map(item => (
                            <li key={item.id} onClick={() => onNavigate('claims', { id: item.id })} className="clickable detailed-item">
                                <div className="item-header">
                                    <span className="code"><span className="item-label">코드</span>{item.code}</span>
                                    <span className="name" style={{ fontWeight: 600 }}>{item.name}</span>
                                    <span className="date">답변일: {item.date}</span>
                                </div>
                                <div className="item-details">
                                    <span className="detail-tag" style={{ color: '#2b8a3e', fontWeight: 700 }}>{item.category} 답변 완료</span>
                                    <span className="detail-tag">로트: {item.extraInfo?.lotNumber}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="empty-section-msg">최근 1개월 간 제조사 답변 완료 건이 없습니다.</div>
                )}
            </section>
        ),
        WIDGET_AUDIT_REVIEW: () => (
            <section className="dashboard-section card warning highlight" key="audit_review">
                <div className="section-header">
                    <span className="icon">🔍</span>
                    <h2 style={{ color: '#d9480f' }}>📸 생산감리 검토 필요 (제출됨)</h2>
                    <span className="count" style={{ backgroundColor: '#d9480f' }}>{data.needsAuditReview?.length || 0}</span>
                </div>
                {data.needsAuditReview?.length > 0 ? (
                    <ul className="dashboard-list scrollable">
                        {data.needsAuditReview.map(item => (
                            <li key={item.id} onClick={() => onNavigate('qualityPhotoAudit', { id: item.id })} className="clickable detailed-item">
                                <div className="item-header">
                                    <span className="code"><span className="item-label">코드</span>{item.code}</span>
                                    <span className="name" style={{ fontWeight: 600 }}>{item.name}</span>
                                    <span className="status-tag" style={{ backgroundColor: '#fff4e6', color: '#d9480f', border: '1px solid #ffd8a8' }}>제출됨</span>
                                </div>
                                <div className="item-details">
                                    <span className="detail-tag">제조사: {item.category}</span>
                                    <span className="detail-tag">생산일: {item.extraInfo?.productionDate}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <div className="empty-section-msg">검토 대기 중인 생산감리가 없습니다.</div>}
            </section>
        ),
        WIDGET_AUDIT_PROGRESS: () => (
            <section className="dashboard-section card" key="audit_progress">
                <div className="section-header">
                    <span className="icon">📸</span>
                    <h2>{isManufacturer ? '자사 ' : ''}생산감리 진행 필요 (미진행/반려)</h2>
                    <span className="count">{data.needsAuditProgress?.length || 0}</span>
                </div>
                {data.needsAuditProgress?.length > 0 ? (
                    <ul className="dashboard-list scrollable">
                        {data.needsAuditProgress.map((item, idx) => (
                            <li key={item.id || `pending-${idx}`} onClick={() => onNavigate('qualityPhotoAudit', item.extraInfo?.isAudit ? { id: item.id } : { itemCode: item.code })} className="clickable detailed-item">
                                <div className="item-header">
                                    <span className="code"><span className="item-label">코드</span>{item.code}</span>
                                    <span className="name">{item.name}</span>
                                    <span className="status-tag" style={{ 
                                        backgroundColor: item.status === 'REJECTED' ? '#fff5f5' : '#f8fafc', 
                                        color: item.status === 'REJECTED' ? '#c53030' : '#495057',
                                        border: item.status === 'REJECTED' ? '1px solid #feb2b2' : '1px solid #dee2e6'
                                    }}>{item.status === 'REJECTED' ? '🚨 반려됨' : '⏳ 미진행'}</span>
                                </div>
                                <div className="item-details">
                                    <span className="detail-tag">제조사: {item.category || item.extraInfo?.manufacturer}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <div className="empty-section-msg">진행 대상이 없습니다.</div>}
            </section>
        ),
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>👋 안녕하세요, {user?.name || user?.username}님!</h1>
                <p>오늘의 시스템 현황과 확인이 필요한 작업들입니다.</p>
            </header>

            <div className="dashboard-grid">
                {data.widgetConfig && data.widgetConfig.length > 0 ? (
                    data.widgetConfig.map(widgetKey => {
                        const renderer = renderers[widgetKey];
                        return renderer ? renderer() : null;
                    })
                ) : (
                    <div className="empty-dashboard">
                        <h3>대시보드가 설정되지 않았습니다.</h3>
                        <p>관리자에게 대시보드 구성을 요청하시거나, 잠시만 기다려주세요.</p>
                    </div>
                )}
            </div>

            {(data.widgetConfig?.length > 0 && 
              (!data.newProducts || data.newProducts.length === 0) && 
              (!data.pendingUsers || data.pendingUsers.length === 0)) && (
                <div className="empty-dashboard" style={{ marginTop: '40px' }}>
                    <h3>현재 새로운 특이사항이 없습니다.</h3>
                    <p>모든 업무가 원활하게 진행되고 있습니다!</p>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
