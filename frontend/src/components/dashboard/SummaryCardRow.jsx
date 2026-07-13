import React from 'react';

/**
 * 대시보드 상단 요약 카드를 가로로 균등 배치하는 컴포넌트입니다.
 * 
 * @param {Object} props
 * @param {Array} props.cards - 카드 리스트 배열
 * @param {string} props.cards[].icon - 카드 아이콘 (이모지)
 * @param {string} props.cards[].label - 카드 라벨 텍스트
 * @param {string|number} props.cards[].value - 카드에 표시할 수치
 * @param {string} [props.cards[].valueColor] - 수치 색상 (옵션, 기본값: #1e293b)
 */
const SummaryCardRow = ({ cards = [] }) => {
    return (
        <div style={{
            display: 'flex',
            gap: '16px',
            width: '100%',
            flexWrap: 'wrap',
            boxSizing: 'border-box'
        }}>
            {cards.map((card, idx) => (
                <div 
                    key={idx}
                    style={{
                        flex: '1 1 200px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px 20px',
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxSizing: 'border-box',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                    }}
                >
                    <div style={{
                        fontSize: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '12px'
                    }}>
                        {card.icon || '📊'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>
                            {card.label}
                        </span>
                        <span style={{ 
                            fontSize: '20px', 
                            fontWeight: '800', 
                            color: card.valueColor || '#1e293b' 
                        }}>
                            {typeof card.value === 'number' ? card.value.toLocaleString() : (card.value ?? 0)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SummaryCardRow;
