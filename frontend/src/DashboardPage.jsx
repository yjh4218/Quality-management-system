import React, { useState, useEffect, useRef } from 'react';
import { getDashboard, getActiveAnnouncements, getDashboardStats } from './api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import './DashboardPage.css';
import { usePermissions } from './usePermissions';
import EmptyState from './components/EmptyState';

const SafeResponsiveContainer = ({ children, height = 220, minHeight = 150 }) => {
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect.width > 0) {
                    const targetH = rect.height > 0 ? rect.height : (typeof height === 'number' ? height : 220);
                    setDimensions({ width: Math.floor(rect.width), height: Math.floor(targetH) });
                }
            }
        };

        updateSize();
        const observer = new ResizeObserver(() => updateSize());
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [height]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height, minHeight, position: 'relative' }}>
            {dimensions.width > 0 && dimensions.height > 0 && (
                <ResponsiveContainer width={dimensions.width} height={dimensions.height}>
                    {children}
                </ResponsiveContainer>
            )}
        </div>
    );
};

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
    const [stats, setStats] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [result, annList, statsResult] = await Promise.all([
                    getDashboard(),
                    getActiveAnnouncements(),
                    getDashboardStats()
                ]);
                setData(result);
                setAnnouncements(annList.data || []);
                setStats(statsResult);
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
        WIDGET_QUALITY_STATS: () => {
            const passRate = stats?.qualityPassRate || 100;
            const failRate = Math.max(0, 100 - passRate);
            const total = stats?.qualityTotal || 0;
            const dataPie = [
                { name: '합격', value: passRate },
                { name: '불합격', value: failRate }
            ];
            const COLORS = ['#10b981', '#ef4444'];
            return (
                <section className="dashboard-section card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('quality')} key="quality-stats"
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                    <div className="section-header">
                        <span className="icon">🚚</span>
                        <h2>입고 품질 합격률 (최근 1개월)</h2>
                        <span className="count">{total}건</span>
                    </div>
                    <div style={{ height: '240px', width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <SafeResponsiveContainer height={190}>
                            <PieChart>
                                <Pie data={dataPie} cx="50%" cy="50%" innerRadius={58} outerRadius={78} paddingAngle={5} dataKey="value">
                                    {dataPie.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value}%`} />
                            </PieChart>
                        </SafeResponsiveContainer>
                        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{passRate}%</span>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>합격률</div>
                        </div>
                        <div style={{ display: 'flex', gap: '18px', fontSize: '13px', marginTop: '8px' }}>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>● 합격 ({passRate}%)</span>
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>● 불합격 ({failRate}%)</span>
                        </div>
                    </div>
                </section>
            );
        },
        WIDGET_CLAIM_TREND: () => {
            const chartData = Object.entries(stats?.claimByCategory || {}).map(([key, val]) => ({
                name: key,
                건수: val
            }));
            const total = stats?.claimCountThisMonth || 0;
            return (
                <section className="dashboard-section card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('claimDashboard')} key="claim-trend"
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(2,132,199,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                    <div className="section-header">
                        <span className="icon">🚨</span>
                        <h2>당월 CX 클레임 유형 분포</h2>
                        <span className="count">{total}건</span>
                    </div>
                    <div style={{ height: '240px', width: '100%', minWidth: 0, padding: '10px 0' }}>
                        {chartData.length === 0 ? (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>접수된 클레임이 없습니다.</div>
                        ) : (
                            <SafeResponsiveContainer height={220}>
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="건수" fill="#0284c7" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </SafeResponsiveContainer>
                        )}
                    </div>
                </section>
            );
        },
        WIDGET_AUDIT_GRADE: () => {
            const chartData = Object.entries(stats?.auditGradeDistribution || {}).map(([key, val]) => ({
                name: `${key}등급`,
                제조사수: val
            })).sort((a, b) => a.name.localeCompare(b.name));
            return (
                <section className="dashboard-section card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('manufacturerAuditDashboard')} key="audit-grade"
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                    <div className="section-header">
                        <span className="icon">📂</span>
                        <h2>제조사 현장 Audit 등급 분포</h2>
                    </div>
                    <div style={{ height: '240px', width: '100%', minWidth: 0, padding: '10px 0' }}>
                        {chartData.length === 0 ? (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>평가 등급 이력이 없습니다.</div>
                        ) : (
                            <SafeResponsiveContainer height={220}>
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="제조사수" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </SafeResponsiveContainer>
                        )}
                    </div>
                </section>
            );
        },
        WIDGET_ANNOUNCEMENTS: () => {
            const hasAnnouncements = announcements && announcements.length > 0;
            const MAX_SHOW = 5;
            return (
                <section className="dashboard-section card db-ann-compact" style={{ height: '280px', display: 'flex', flexDirection: 'column' }} key="announcements">
                    <div className="section-header" style={{ marginBottom: '8px', flexShrink: 0 }}>
                        <span className="icon" style={{ fontSize: '18px' }}>📢</span>
                        <h2 style={{ fontSize: '14px' }}>전사 전체공지</h2>
                        <span className="count" style={{ fontSize: '12px', padding: '2px 8px' }}>{announcements?.length || 0}</span>
                        <button onClick={() => onNavigate('announcements')} style={{ marginLeft: '8px', fontSize: '11px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600' }}>전체보기 →</button>
                    </div>
                    {hasAnnouncements ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                            {announcements.slice(0, MAX_SHOW).map(ann => (
                                <div key={ann.id}
                                    onClick={() => onNavigate('announcements', { id: ann.id })}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '7px 10px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        borderLeft: `3px solid ${ann.category ? ann.category.color : '#cbd5e1'}`,
                                        background: '#f8fafc',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                                >
                                    <span style={{
                                        backgroundColor: ann.category ? ann.category.color : '#475569',
                                        color: '#fff', fontSize: '10px', fontWeight: '700',
                                        padding: '1px 7px', borderRadius: '10px', whiteSpace: 'nowrap'
                                    }}>{ann.category ? ann.category.name : '일반'}</span>
                                    <span style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {ann.title}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                        {new Date(ann.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="등록된 활성 전체공지가 없습니다." icon="📢" />
                    )}
                </section>
            );
        },
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
                                    {item.extraInfo?.isMaster && <span className="badge-category">마스터</span>}
                                    {item.extraInfo?.isPlanningSet && <span className="badge-status-pending">기획세트</span>}
                                    {item.name}
                                </span>
                                <span className="date"><span className="item-label">등록일</span>{item.date}</span>
                            </li>
                        ))}
                    </ul>
                ) : <EmptyState message="최근 등록된 품목이 없습니다." icon="📦" />}
            </section>
        ),
        WIDGET_PENDING_USERS: () => (
            <section className="dashboard-section card highlight urgent-card" style={{ height: '280px', display: 'flex', flexDirection: 'column' }} key="pending_users">
                <div className="section-header" style={{ flexShrink: 0 }}>
                    <span className="icon">👥</span>
                    <h2>사용자 승인 대기</h2>
                    <span className="count urgent">{data.pendingUsers?.length || 0}</span>
                </div>
                {data.pendingUsers?.length > 0 ? (
                    <ul className="dashboard-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                        {data.pendingUsers.map(item => (
                            <li key={item.id} onClick={() => onNavigate('users', { username: item.code })} className="clickable">
                                <span className="name">{item.name} ({item.code})</span>
                                <span className="company"><span className="badge-category">{item.category}</span></span>
                                <button className="goto-btn">승인하기</button>
                            </li>
                        ))}
                    </ul>
                ) : <EmptyState message="승인 대기 중인 사용자가 없습니다." icon="👥" />}
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
                ) : <EmptyState message="최근 변경 이력이 없습니다." icon="📜" />}
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
                ) : <EmptyState message="최근 입고된 품목이 없습니다." icon="⚖️" />}
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
                ) : <EmptyState message="체적 확정 대기 중인 품목이 없습니다." icon="📐" />}
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
                ) : <EmptyState message="최근 확정된 체적 정보가 없습니다." icon="✅" />}
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
                                    <span className={item.status === '4. 클레임 종결' ? 'badge-status-done' : 'badge-status-urgent'}>
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
                ) : <EmptyState message="최근 1개월 간 인입된 클레임 내역이 없습니다." icon="⚠️" />}
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
                ) : <EmptyState message="최근 1개월 간 제조사 답변 완료 건이 없습니다." icon="✅" />}
            </section>
        ),
        WIDGET_AUDIT_REVIEW: () => (
            <section className="dashboard-section card warning highlight urgent-card" style={{ height: '280px', display: 'flex', flexDirection: 'column' }} key="audit_review">
                <div className="section-header" style={{ flexShrink: 0 }}>
                    <span className="icon">🔍</span>
                    <h2 style={{ color: '#d9480f' }}>📸 생산감리 검토 필요 (제출됨)</h2>
                    <span className="count" style={{ backgroundColor: '#d9480f' }}>{data.needsAuditReview?.length || 0}</span>
                </div>
                {data.needsAuditReview?.length > 0 ? (
                    <ul className="dashboard-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                        {data.needsAuditReview.map(item => (
                            <li key={item.id} onClick={() => onNavigate('qualityPhotoAudit', { auditId: item.id })} className="clickable detailed-item">
                                <div className="item-header">
                                    <span className="code"><span className="item-label">코드</span>{item.code}</span>
                                    <span className="name" style={{ fontWeight: 600 }}>{item.name}</span>
                                    <span className="badge-status-pending">제출됨</span>
                                </div>
                                <div className="item-details">
                                    <span className="detail-tag">제조사: {item.category}</span>
                                    <span className="detail-tag">생산일: {item.extraInfo?.productionDate}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <EmptyState message="검토 대기 중인 생산감리가 없습니다." icon="🔍" />}
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
                            <li key={item.id || `pending-${idx}`} onClick={() => onNavigate('qualityPhotoAudit', item.extraInfo?.isAudit ? { auditId: item.id } : { itemCode: item.code })} className="clickable detailed-item">
                                <div className="item-header">
                                    <span className="code"><span className="item-label">코드</span>{item.code}</span>
                                    <span className="name">{item.name}</span>
                                    <span className={item.status === 'REJECTED' ? 'badge-status-urgent' : 'badge-status-pending'}>
                                        {item.status === 'REJECTED' ? '반려됨' : '미진행'}
                                    </span>
                                </div>
                                <div className="item-details">
                                    <span className="detail-tag">제조사: {item.category || item.extraInfo?.manufacturer}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <EmptyState message="진행 대상이 없습니다." icon="📸" />}
            </section>
        ),
    };

    // ─── 위젯 분류 ────────────────────────────────────────────────
    const STATS_WIDGETS    = ['WIDGET_QUALITY_STATS', 'WIDGET_CLAIM_TREND', 'WIDGET_AUDIT_GRADE'];
    const ANN_WIDGETS      = ['WIDGET_ANNOUNCEMENTS'];
    const URGENT_WIDGETS   = ['WIDGET_PENDING_USERS', 'WIDGET_AUDIT_REVIEW'];
    const SUMMARY_WIDGETS  = ['WIDGET_NEW_PRODUCTS', 'WIDGET_RECENT_CLAIMS', 'WIDGET_MFR_COMPLETED_CLAIMS',
                              'WIDGET_AUDIT_PROGRESS', 'WIDGET_VOLUME_CONFIRMED'];
    const REFERENCE_WIDGETS = ['WIDGET_AUDIT_LOGS', 'WIDGET_QUALITY_STATS', 'WIDGET_CLAIM_TREND', 'WIDGET_AUDIT_GRADE'];

    const allWidgetKeys = data.widgetConfig ? [...data.widgetConfig] : [];
    // 통계 위젯이 DB 설정에 없으면 자동으로 추가
    const statsToAdd = isManufacturer
        ? ['WIDGET_QUALITY_STATS', 'WIDGET_CLAIM_TREND']
        : ['WIDGET_QUALITY_STATS', 'WIDGET_CLAIM_TREND', 'WIDGET_AUDIT_GRADE'];
    statsToAdd.forEach(k => { if (!allWidgetKeys.includes(k)) allWidgetKeys.push(k); });

    const renderSector = (keys) =>
        keys.filter(k => allWidgetKeys.includes(k) && renderers[k])
            .map(k => renderers[k]());

    const urgentWidgets   = renderSector(URGENT_WIDGETS);
    const summaryWidgets  = renderSector(SUMMARY_WIDGETS);
    const annWidgets      = renderSector(ANN_WIDGETS);
    const refWidgets      = renderSector(REFERENCE_WIDGETS);

    const SectorLabel = ({ icon, label, color = '#6366f1', rightElement = null }) => (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 0 8px 2px', marginBottom: '4px',
            borderBottom: `2px solid ${color}20`
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{icon}</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</span>
            </div>
            {rightElement}
        </div>
    );

    return (
        <div className="dashboard-container" style={{ padding: '18px 24px', background: '#f1f5f9', minHeight: '100vh' }}>
            {/* ── 헤더 ── */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                        👋 안녕하세요, {user?.name || user?.username}님!
                    </h1>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>오늘의 시스템 현황과 확인이 필요한 작업들입니다.</p>
                </div>
                <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                </span>
            </header>

            {data.widgetConfig && data.widgetConfig.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* ── 섹터 1: 공지사항 + 긴급 처리 (가로 분할) ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: annWidgets.length > 0 && urgentWidgets.length > 0 ? '1fr 1fr' : '1fr', gap: '14px' }}>
                        {annWidgets.length > 0 && (
                            <div>
                                <SectorLabel icon="📢" label="공지사항" color="#6366f1" />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {annWidgets}
                                </div>
                            </div>
                        )}
                        {urgentWidgets.length > 0 && (
                            <div>
                                <SectorLabel icon="⚡" label="긴급 처리 필요" color="#ef4444" />
                                <div className="dashboard-grid--urgent">
                                    {urgentWidgets}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── 섹터 2: 현황 요약 ── */}
                    {summaryWidgets.length > 0 && (
                        <div>
                            <SectorLabel icon="📋" label="현황 요약" color="#0ea5e9" />
                            <div className="dashboard-grid--summary">
                                {summaryWidgets}
                            </div>
                        </div>
                    )}

                    {/* ── 섹터 3: 통계 분석 및 변경 이력 (하단 고정) ── */}
                    {refWidgets.length > 0 && (
                        <div>
                            <SectorLabel 
                                icon="📈" 
                                label="통계 및 변경 이력" 
                                color="#10b981" 
                            />
                            <div className="dashboard-grid--reference">
                                {refWidgets}
                            </div>
                        </div>
                    )}

                </div>
            ) : (
                <div className="empty-dashboard">
                    <h3>대시보드가 설정되지 않았습니다.</h3>
                    <p>관리자에게 대시보드 구성을 요청하시거나, 잠시만 기다려주세요.</p>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
