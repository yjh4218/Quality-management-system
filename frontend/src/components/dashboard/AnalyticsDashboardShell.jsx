import React from 'react';

/**
 * QMS 대시보드의 표준 외곽 프레임 및 헤더를 제공하는 공용 셸 컴포넌트입니다.
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
            padding: '24px 32px',
            backgroundColor: '#f1f5f9', // 표준 배경색 고정
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
                marginBottom: '20px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div>
                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: '800',
                            color: '#0f172a',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {icon && <span>{icon}</span>} {title}
                        </h1>
                        {subtitle && <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>{subtitle}</p>}
                    </div>
                </div>

                {/* 액션 버튼 그룹 - flex-wrap 적용으로 반응형 호환 */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap'
                }}>
                    {backTo && onNavigate && (
                        <button 
                            onClick={() => onNavigate(backTo)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#475569',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                            ◀ {backLabel}
                        </button>
                    )}
                    {onDownloadReport && (
                        <button
                            onClick={onDownloadReport}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                            onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
                        >
                            📥 엑셀 리포트 추출
                        </button>
                    )}
                </div>
            </header>

            {/* 대시보드 세부 콘텐츠 영역 */}
            <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {children}
            </main>
        </div>
    );
};

export default AnalyticsDashboardShell;
