import React, { useState, useRef, useEffect } from 'react';

/**
 * 🎨 그리드 색상 범례 (Legend) 팝오버 컴포넌트
 * - 시스템 기본 색상 규칙(행/셀 스타일, 상태별 색상 등)과
 * - 현재 그리드에 활성화된 관리자 커스텀 서식 규칙(customRules)을 함께 실시간 안내합니다.
 * 
 * @param {string} title 그리드 이름 (예: "제품코드 마스터", "CX 클레임 관리")
 * @param {Array<{ color: string, bg: string, label: string, desc: string, icon?: string, scope?: string }>} legends 시스템 기본 색상 범례 항목 목록
 * @param {Array<{ id: string, column: string, condition: string, value: string, color: string }>} customRules 현재 그리드에 적용된 관리자 커스텀 서식 목록
 * @param {Array<{ field: string, headerName: string }>} formattableColumns 서식 설정 가능한 컬럼 매핑 정보
 */
const GridColorLegendPopover = ({
    title = '그리드',
    legends = [],
    customRules = [],
    formattableColumns = []
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'system' | 'custom'
    const popoverRef = useRef(null);

    // 컬럼 필드명을 읽기 쉬운 헤더명으로 변환하는 맵
    const columnHeaderMap = React.useMemo(() => {
        const map = {};
        formattableColumns.forEach(c => {
            map[c.field] = c.headerName || c.field;
        });
        return map;
    }, [formattableColumns]);

    // 프리셋 색상 텍스트 매핑
    const colorLabelMap = {
        red: { label: '연빨강', bg: '#fee2e2', color: '#b91c1c' },
        yellow: { label: '연노랑', bg: '#fef3c7', color: '#b45309' },
        green: { label: '연초록', bg: '#dcfce7', color: '#15803d' },
        blue: { label: '연파랑', bg: '#e0f2fe', color: '#0369a1' },
        purple: { label: '연보라', bg: '#f3e8ff', color: '#7e22ce' },
        gray: { label: '연회색', bg: '#f1f5f9', color: '#475569' }
    };

    // 조건명 한국어 매핑
    const conditionLabelMap = {
        equals: '일치 (==)',
        contains: '포함',
        startsWith: '시작 문자',
        endsWith: '끝 문자'
    };

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

    const activeCustomRulesCount = customRules?.length || 0;
    const totalRulesCount = (legends?.length || 0) + activeCustomRulesCount;

    return (
        <div style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef}>
            <button
                type="button"
                className="outline"
                onClick={() => setIsOpen(!isOpen)}
                title="그리드 색상 의미 및 적용된 규칙 확인"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: isOpen ? '#f0f9ff' : '#ffffff',
                    borderColor: isOpen ? '#0284c7' : '#cbd5e1',
                    color: isOpen ? '#0284c7' : '#475569',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                }}
            >
                <span>🎨</span>
                <span>색상 범례</span>
                {activeCustomRulesCount > 0 && (
                    <span style={{
                        background: '#0284c7',
                        color: '#ffffff',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '10px',
                        lineHeight: 1.2
                    }}>
                        +{activeCustomRulesCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        zIndex: 10000,
                        width: '380px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.18), 0 4px 10px -2px rgba(0, 0, 0, 0.06)',
                        padding: '14px 16px',
                        animation: 'tooltipFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    {/* 상단 헤더 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '15px' }}>🎨</span>
                            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{title} 색상 안내</span>
                            <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                총 {totalRulesCount}개 규칙
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '14px', cursor: 'pointer', padding: '2px 4px' }}
                            title="닫기"
                        >
                            ✕
                        </button>
                    </div>

                    {/* 탭 네비게이션 */}
                    {activeCustomRulesCount > 0 && (
                        <div style={{ display: 'flex', background: '#f8fafc', padding: '3px', borderRadius: '6px', gap: '4px', fontSize: '11.5px' }}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('all')}
                                style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    background: activeTab === 'all' ? '#ffffff' : 'transparent',
                                    color: activeTab === 'all' ? '#0f172a' : '#64748b',
                                    fontWeight: activeTab === 'all' ? 700 : 500,
                                    boxShadow: activeTab === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                전체 보기 ({totalRulesCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('system')}
                                style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    background: activeTab === 'system' ? '#ffffff' : 'transparent',
                                    color: activeTab === 'system' ? '#0f172a' : '#64748b',
                                    fontWeight: activeTab === 'system' ? 700 : 500,
                                    boxShadow: activeTab === 'system' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                시스템 기본 ({legends.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('custom')}
                                style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    background: activeTab === 'custom' ? '#ffffff' : 'transparent',
                                    color: activeTab === 'custom' ? '#0284c7' : '#64748b',
                                    fontWeight: activeTab === 'custom' ? 700 : 500,
                                    boxShadow: activeTab === 'custom' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                커스텀 서식 ({activeCustomRulesCount})
                            </button>
                        </div>
                    )}

                    {/* 범례 리스트 스크롤 영역 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto', paddingRight: '2px' }}>
                        {/* 1. 관리자 커스텀 서식 규칙 섹션 */}
                        {(activeTab === 'all' || activeTab === 'custom') && activeCustomRulesCount > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
                                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px' }}>
                                    <span>⚙️</span> 관리자 지정 서식 규칙 ({activeCustomRulesCount}개 적용 중)
                                </div>
                                {customRules.map((rule, idx) => {
                                    const fieldKey = rule.field || rule.column;
                                    const colName = columnHeaderMap[fieldKey] || fieldKey;
                                    const opKey = rule.operator || rule.condition || 'EQUALS';
                                    const condName = opKey === 'CONTAINS' || opKey === 'contains' ? '포함' : '일치 (==)';
                                    const bgColor = rule.bg || (colorLabelMap[rule.color]?.bg) || '#fee2e2';
                                    const textColor = rule.text || (colorLabelMap[rule.color]?.color) || '#b91c1c';
                                    return (
                                        <div
                                            key={rule.id || idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                background: bgColor,
                                                border: `1px solid ${textColor}40`
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 700, color: textColor }}>
                                                    [{colName}] {condName} "{rule.value}"
                                                </div>
                                                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                                                    조건 일치 시 해당 셀에 배경 및 글자색 적용
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: '#ffffff',
                                                border: `1px solid ${textColor}`,
                                                color: textColor,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                지정 서식
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 2. 시스템 기본 색상 규칙 섹션 */}
                        {(activeTab === 'all' || activeTab === 'system') && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {activeTab === 'all' && activeCustomRulesCount > 0 && (
                                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px' }}>
                                        <span>📌</span> 시스템 기본 색상 규칙 ({legends.length}개)
                                    </div>
                                )}
                                {legends.map((item, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '10px',
                                            padding: '7px 10px',
                                            borderRadius: '6px',
                                            background: item.bg || '#f8fafc',
                                            border: `1px solid ${item.color ? item.color + '40' : '#e2e8f0'}`
                                        }}
                                    >
                                        <div
                                            style={{
                                                minWidth: '24px',
                                                height: '24px',
                                                borderRadius: '5px',
                                                background: item.bg || '#ffffff',
                                                border: `1.5px solid ${item.color || '#cbd5e1'}`,
                                                color: item.color || '#334155',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px',
                                                fontWeight: 800,
                                                flexShrink: 0
                                            }}
                                        >
                                            {item.icon || '●'}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: item.color || '#1e293b' }}>
                                                    {item.label}
                                                </span>
                                                {item.scope && (
                                                    <span style={{ fontSize: '10px', color: '#64748b', background: '#ffffff', padding: '1px 4px', borderRadius: '3px', border: '1px solid #e2e8f0' }}>
                                                        {item.scope}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', lineHeight: 1.4, wordBreak: 'keep-all' }}>
                                                {item.desc}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 하단 안내 */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                        <span>관리자 설정 규칙은 사용자 화면에 자동 동기화됩니다.</span>
                        <span style={{ fontWeight: 600, color: '#0284c7' }}>QMS Live</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GridColorLegendPopover;
