import React from 'react';

/**
 * QMS 대시보드의 표준 외곽 프레임 및 헤더를 제공하는 공용 셸 컴포넌트입니다.
 * 밝은 테마(#f1f5f9) 배경에 세련된 디자인이 유지됩니다.
 */
const AnalyticsDashboardShell = ({ 
    icon, 
    title, 
    subtitle, 
    backTo, 
    backLabel = '이전으로', 
    onDownloadReport, 
    onSearch, 
    onReset, 
    children,
    onNavigate
}) => {
    return (
        <div style={{
            padding: '28px 36px',
            backgroundColor: '#f1f5f9', // 밝은 테마 배경색
            color: '#1e293b',
            minHeight: '100vh',
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* 상단 헤더 영역 */}
            <header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* 데코 그라데이션 라인 */}
                    <div style={{
                        width: '6px',
                        height: '42px',
                        background: 'linear-gradient(to bottom, #6366f1, #a855f7)',
                        borderRadius: '4px'
                    }}></div>
                    <div>
                        <h1 style={{
                            fontSize: '26px',
                            fontWeight: '800',
                            color: '#0f172a',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            letterSpacing: '-0.025em'
                        }}>
                            {icon && <span style={{ fontSize: '24px' }}>{icon}</span>} {title}
                        </h1>
                        {subtitle && <p style={{ fontSize: '13.5px', color: '#64748b', margin: '6px 0 0 0', fontWeight: '500' }}>{subtitle}</p>}
                    </div>
                </div>

                {/* 액션 버튼 그룹 */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap'
                }}>
                    {backTo && onNavigate && (
                        <button 
                            onClick={() => onNavigate(backTo)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '9px 18px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#475569',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease-in-out'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = '#f8fafc';
                                e.currentTarget.style.color = '#0f172a';
                                e.currentTarget.style.borderColor = '#94a3b8';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.color = '#475569';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                        >
                            ◀ {backLabel}
                        </button>
                    )}
                    {onDownloadReport && (
                        <button
                            onClick={onDownloadReport}
                            style={{
                                padding: '9px 18px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                                transition: 'all 0.2s ease-in-out'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.25)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
                            }}
                        >
                            📥 엑셀 리포트 추출
                        </button>
                    )}
                </div>
            </header>

            {/* 대시보드 세부 콘텐츠 영역 */}
            <main style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {children}
            </main>
        </div>
    );
};

export default AnalyticsDashboardShell;
