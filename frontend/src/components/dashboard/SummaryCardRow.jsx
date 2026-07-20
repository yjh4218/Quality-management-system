import React from 'react';

/**
 * 대시보드 상단 요약 카드를 가로로 균등 배치하는 컴포넌트입니다.
 * 프리미엄 다크 테마가 적용되어 고급스러운 카드로 재탄생했습니다.
 */
const SummaryCardRow = ({ cards = [] }) => {
    return (
        <div style={{
            display: 'flex',
            gap: '20px',
            width: '100%',
            flexWrap: 'wrap',
            boxSizing: 'border-box'
        }}>
            {cards.map((card, idx) => {
                const hoverColor = card.valueColor || '#6366f1';
                return (
                    <div 
                        key={idx}
                        style={{
                            flex: '1 1 220px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '18px',
                            padding: '20px 24px',
                            backgroundColor: '#ffffff', // 밝은 카드 배경
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0', // 밝은 테두리
                            boxSizing: 'border-box',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: card.onClick ? 'pointer' : 'default',
                            ...card.style
                        }}
                        onClick={card.onClick}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = `0 12px 20px -8px ${hoverColor}25`;
                            e.currentTarget.style.borderColor = hoverColor;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02)';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                    >
                        <div style={{
                            fontSize: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '52px',
                            height: '52px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '14px',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                            {card.icon || '📊'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#64748b', letterSpacing: '-0.01em' }}>
                                {card.label}
                            </span>
                            <span style={{ 
                                fontSize: '24px', 
                                fontWeight: '800', 
                                color: card.valueColor || '#1e293b', // 수치 색상 복구
                                letterSpacing: '-0.02em'
                            }}>
                                {typeof card.value === 'number' ? card.value.toLocaleString() : (card.value ?? 0)}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default SummaryCardRow;
