import React from 'react';

/**
 * DrawerCard
 * 
 * StandardWorkspaceDrawer 내부에서 사용하는 모듈형 정보 카드 컴포넌트
 * - 흰색 바탕(#ffffff), 섬세한 테두리(#e2e8f0), 부드러운 그림자
 * - 카드 상단 타이틀, 카테고리 아이콘, 우측 보조 액션 영역 제공
 */
const DrawerCard = ({
    title,
    icon,
    headerRight = null,
    children,
    style = {},
    className = '',
    bodyStyle = {}
}) => {
    return (
        <div 
            className={`drawer-card ${className}`}
            style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                ...style
            }}
        >
            {(title || icon || headerRight) && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #f1f5f9'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
                        {title && (
                            <h3 style={{
                                margin: 0,
                                fontSize: '15px',
                                fontWeight: 800,
                                color: '#1e293b'
                            }}>
                                {title}
                            </h3>
                        )}
                    </div>
                    {headerRight && <div>{headerRight}</div>}
                </div>
            )}
            <div style={{ flex: 1, ...bodyStyle }}>
                {children}
            </div>
        </div>
    );
};

export default DrawerCard;

