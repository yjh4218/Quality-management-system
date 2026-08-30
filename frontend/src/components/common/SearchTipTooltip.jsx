import React, { useState } from 'react';

/**
 * 💡 다중 키워드 교집합(AND) 고속 검색 안내 툴팁 컴포넌트
 * 마우스 호버 시 쉼표(,) 및 공백(Space) 구분 검색 가이드를 제공합니다.
 */
const SearchTipTooltip = ({ position = 'bottom', style = {} }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="search-tip-container"
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            <button
                type="button"
                className="search-tip-icon-btn"
                aria-label="검색 팁 안내"
                style={{
                    background: 'none',
                    border: 'none',
                    padding: '2px 4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.85,
                    transition: 'opacity 0.15s'
                }}
            >
                💡
            </button>

            {isVisible && (
                <div
                    className="search-tip-popover"
                    style={{
                        position: 'absolute',
                        [position === 'top' ? 'bottom' : 'top']: '100%',
                        right: 0,
                        zIndex: 12000,
                        width: '280px',
                        padding: '10px 12px',
                        background: '#1e293b',
                        color: '#ffffff',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        fontSize: '11.5px',
                        lineHeight: 1.5,
                        pointerEvents: 'none',
                        animation: 'fadeIn 0.15s ease-out'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                        <span>💡 다중 키워드 교집합(AND) 검색</span>
                    </div>
                    <p style={{ margin: '0 0 6px 0', color: '#cbd5e1' }}>
                        <strong style={{ color: '#fef08a' }}>쉼표 ( , )</strong> 또는 <strong style={{ color: '#fef08a' }}>공백 ( Space )</strong>으로 단어를 구분하여 입력하면 모든 조건이 포함된 결과를 고속 검색합니다.
                    </p>
                    <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '4px 6px', borderRadius: '4px', fontSize: '10.5px', color: '#94a3b8' }}>
                        예시: <span style={{ color: '#67e8f9' }}>"모이스처, 튜브"</span> 또는 <span style={{ color: '#67e8f9' }}>"크림 50ml"</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchTipTooltip;
