import React from 'react';

/**
 * 대시보드 내 검색 조건을 균일하게 나열하고 배치하는 필터 바 컴포넌트입니다.
 */
const DashboardFilterBar = ({ fields = [], onSearch, onReset }) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            padding: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
            {/* 필터 입력 필드 영역 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                flex: 1
            }}>
                {fields.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {f.icon && <span>{f.icon}</span>} {f.label}
                        </label>
                        {f.type === 'select' ? (
                            <select
                                value={f.value}
                                onChange={f.onChange}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    backgroundColor: '#fff',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {f.options?.map((opt, oIdx) => (
                                    <option key={oIdx} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type={f.type || 'text'}
                                value={f.value}
                                onChange={f.onChange}
                                placeholder={f.placeholder || `${f.label} 검색`}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* 필터 검색/초기화 버튼 그룹 - flex-wrap 적용 및 최소 폭 보장 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                flexShrink: 0
            }}>
                {onReset && (
                    <button
                        onClick={onReset}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#fff',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'background 0.2s',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                        ♻️ 초기화
                    </button>
                )}
                {onSearch && (
                    <button
                        onClick={onSearch}
                        style={{
                            padding: '8px 20px',
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '700',
                            transition: 'background 0.2s',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                        onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
                    >
                        🔍 조회
                    </button>
                )}
            </div>
        </div>
    );
};

export default DashboardFilterBar;
