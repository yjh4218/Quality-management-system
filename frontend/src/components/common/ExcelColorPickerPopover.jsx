import React, { useState, useRef, useEffect } from 'react';

/**
 * 🎨 엑셀(Excel) 스타일 테마색 & 표준색 컬러 피커 팝오버 컴포넌트
 * 
 * - 테마 색 매트릭스 (10개 메인 테마색 x 6단계 명도 = 60색)
 * - 표준 색 (10개 기본 원색)
 * - 채우기 없음 / 투명 (No Fill / Transparent)
 * - 최근 사용한 색상 (최대 10개 자동 저장 및 복원)
 * - 사용자 지정 색상 (HTML5 Native Color Picker)
 * 
 * @param {string} value 현재 선택된 색상 (Hex or 'transparent')
 * @param {Function} onChange (color: string) => void
 * @param {string} title 버튼 및 팝오버 제목 (예: "선 색상", "내부 면 색상", "글자 색상")
 * @param {boolean} allowTransparent '채우기 없음' 버튼 허용 여부
 * @param {string} icon 버튼 아이콘 (예: "🖌️", "🎨", "🔤")
 */

// 1. 엑셀 10대 메인 테마색 및 5단계 명도 쉐이드 매트릭스 (10열 x 6행)
const THEME_COLORS_MATRIX = [
    // 1행: 기본 테마 베이스 색상 (10개)
    [
        '#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd',
        '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646'
    ],
    // 2행: 80% 더 밝게
    [
        '#f2f2f2', '#7f7f7f', '#ddd9c3', '#c6d9f1', '#dce6f2',
        '#f2dcdb', '#ebf1de', '#e6e0ec', '#dbeef4', '#fdeada'
    ],
    // 3행: 60% 더 밝게
    [
        '#d9d9d9', '#595959', '#c4bd97', '#8eb4e3', '#b9cde5',
        '#e6b9b8', '#d7e4bd', '#ccc1db', '#b7dde8', '#fbd5b5'
    ],
    // 4행: 40% 더 밝게 / 더 어둡게
    [
        '#bfbfbf', '#3f3f3f', '#948a54', '#558ed5', '#95b3d7',
        '#d99694', '#c3d69b', '#b3a1c7', '#93cddc', '#fac090'
    ],
    // 5행: 25% 더 어둡게
    [
        '#a6a6a6', '#262626', '#4a442a', '#17375e', '#376092',
        '#953735', '#77933c', '#604a7b', '#31859c', '#e46c0a'
    ],
    // 6행: 50% 더 어둡게
    [
        '#7f7f7f', '#0d0d0d', '#1e1c11', '#10243f', '#254061',
        '#632523', '#4f6228', '#403152', '#215968', '#984807'
    ]
];

// 2. 엑셀 표준 색상 (10개)
const STANDARD_COLORS = [
    '#c00000', // 진빨강
    '#ff0000', // 빨강
    '#ffc000', // 주황/황금
    '#ffff00', // 노랑
    '#92d050', // 연두
    '#00b050', // 초록
    '#00b0f0', // 하늘
    '#0070c0', // 파랑
    '#002060', // 진남색
    '#7030a0'  // 보라
];

const RECENT_COLORS_KEY = 'qms_excel_recent_colors';

const ExcelColorPickerPopover = ({
    value = '#000000',
    onChange,
    title = '색상 선택',
    allowTransparent = true,
    icon = '🎨',
    buttonStyle = {},
    align = 'left' // 'left' | 'right'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);
    const nativeColorInputRef = useRef(null);

    // 최근 사용 색상 (localStorage 로드)
    const [recentColors, setRecentColors] = useState(() => {
        try {
            const saved = localStorage.getItem(RECENT_COLORS_KEY);
            return saved ? JSON.parse(saved) : ['#ff0000', '#00b050', '#0070c0', '#ffff00'];
        } catch {
            return ['#ff0000', '#00b050', '#0070c0'];
        }
    });

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelectColor = (hex) => {
        if (onChange) onChange(hex);

        if (hex && hex !== 'transparent' && hex !== 'none') {
            const normalized = hex.toLowerCase();
            setRecentColors(prev => {
                const next = [normalized, ...prev.filter(c => c.toLowerCase() !== normalized)].slice(0, 10);
                try {
                    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
                } catch (e) {
                    // Ignore storage errors
                }
                return next;
            });
        }
        setIsOpen(false);
    };

    const isTransparent = !value || value === 'transparent' || value === 'none';

    return (
        <div style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef}>
            {/* 트리거 버튼 (현재 색상 미리보기 바 포함) */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                title={title}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 6px',
                    background: '#ffffff',
                    border: isOpen ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#334155',
                    boxShadow: isOpen ? '0 0 0 2px rgba(37,99,235,0.15)' : 'none',
                    transition: 'all 0.15s',
                    ...buttonStyle
                }}
            >
                <span>{icon}</span>
                {/* 선택된 색상 칩 */}
                <div
                    style={{
                        width: '18px',
                        height: '14px',
                        borderRadius: '2px',
                        background: isTransparent 
                            ? 'repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50% / 6px 6px' 
                            : value,
                        border: '1px solid #94a3b8',
                        position: 'relative'
                    }}
                >
                    {isTransparent && (
                        <div style={{
                            position: 'absolute', top: '50%', left: 0, right: 0,
                            height: '1.5px', background: '#ef4444', transform: 'rotate(-45deg)'
                        }} />
                    )}
                </div>
                <span style={{ fontSize: '9px', color: '#64748b' }}>▼</span>
            </button>

            {/* 엑셀 스타일 팔레트 팝오버 */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        ...(align === 'right' ? { right: 0 } : { left: 0 }),
                        zIndex: 100000,
                        width: '236px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        padding: '10px 12px',
                        fontSize: '11px',
                        userSelect: 'none',
                        animation: 'tooltipFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    {/* 상단 타이틀 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '11.5px' }}>{title}</span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* 채우기 없음 / 투명 버튼 */}
                    {allowTransparent && (
                        <div style={{ marginBottom: '8px' }}>
                            <button
                                type="button"
                                onClick={() => handleSelectColor('transparent')}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 8px',
                                    background: isTransparent ? '#eff6ff' : '#f8fafc',
                                    border: isTransparent ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: isTransparent ? 700 : 500,
                                    color: isTransparent ? '#1d4ed8' : '#334155'
                                }}
                            >
                                <div style={{
                                    width: '14px', height: '14px', borderRadius: '2px',
                                    border: '1px solid #94a3b8',
                                    background: 'repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50% / 6px 6px',
                                    position: 'relative'
                                }}>
                                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1.5px', background: '#ef4444', transform: 'rotate(-45deg)' }} />
                                </div>
                                <span>선택 없음 / 투명 (No Fill)</span>
                            </button>
                        </div>
                    )}

                    {/* 1. 테마 색 (Theme Colors) */}
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                            테마 색
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {THEME_COLORS_MATRIX.map((row, rowIdx) => (
                                <div key={rowIdx} style={{ display: 'flex', gap: '2px', marginBottom: rowIdx === 0 ? '3px' : '0' }}>
                                    {row.map((hex, colIdx) => {
                                        const isSelected = value?.toLowerCase() === hex.toLowerCase();
                                        return (
                                            <div
                                                key={colIdx}
                                                onClick={() => handleSelectColor(hex)}
                                                title={hex}
                                                style={{
                                                    width: '18.5px',
                                                    height: rowIdx === 0 ? '17px' : '13px',
                                                    backgroundColor: hex,
                                                    border: isSelected ? '1.5px solid #2563eb' : (hex === '#ffffff' ? '1px solid #cbd5e1' : '1px solid rgba(0,0,0,0.08)'),
                                                    borderRadius: '1px',
                                                    cursor: 'pointer',
                                                    boxSizing: 'border-box',
                                                    transform: isSelected ? 'scale(1.15)' : 'none',
                                                    zIndex: isSelected ? 2 : 1,
                                                    transition: 'transform 0.1s'
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. 표준 색 (Standard Colors) */}
                    <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                            표준 색
                        </div>
                        <div style={{ display: 'flex', gap: '2px' }}>
                            {STANDARD_COLORS.map((hex, idx) => {
                                const isSelected = value?.toLowerCase() === hex.toLowerCase();
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectColor(hex)}
                                        title={hex}
                                        style={{
                                            width: '18.5px',
                                            height: '17px',
                                            backgroundColor: hex,
                                            border: isSelected ? '1.5px solid #2563eb' : '1px solid rgba(0,0,0,0.12)',
                                            borderRadius: '1px',
                                            cursor: 'pointer',
                                            boxSizing: 'border-box',
                                            transform: isSelected ? 'scale(1.15)' : 'none',
                                            zIndex: isSelected ? 2 : 1,
                                            transition: 'transform 0.1s'
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. 최근에 사용한 색 (Recent Colors) */}
                    {recentColors.length > 0 && (
                        <div style={{ marginBottom: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                                최근에 사용한 색
                            </div>
                            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                                {recentColors.map((hex, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectColor(hex)}
                                        title={hex}
                                        style={{
                                            width: '18.5px',
                                            height: '15px',
                                            backgroundColor: hex,
                                            border: '1px solid rgba(0,0,0,0.12)',
                                            borderRadius: '2px',
                                            cursor: 'pointer',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 4. 다른 색... (사용자 지정 색상 / Native Color Picker) */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                        <button
                            type="button"
                            onClick={() => nativeColorInputRef.current && nativeColorInputRef.current.click()}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '4px 0',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '10.5px',
                                fontWeight: 600,
                                color: '#334155'
                            }}
                        >
                            <span>🌈</span>
                            <span>다른 색 (사용자 지정)...</span>
                        </button>
                        <input
                            type="color"
                            ref={nativeColorInputRef}
                            value={isTransparent ? '#000000' : value}
                            onChange={(e) => handleSelectColor(e.target.value)}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExcelColorPickerPopover;
