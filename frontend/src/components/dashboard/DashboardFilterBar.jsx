import React from 'react';

/**
 * 대시보드 내 검색 조건을 균일하게 나열하고 배치하는 필터 바 컴포넌트입니다.
 * 다크 카드 테마에 맞춰 고주파 입력창 및 유리 질감 버튼이 적용되었습니다.
 */
const DashboardFilterBar = ({ fields = [], onSearch, onReset, children }) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            padding: '24px 28px',
            backgroundColor: '#ffffff', // 밝은 배경 복원
            borderRadius: '20px',
            border: '1px solid #e2e8f0', // 밝은 보더 복원
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)'
        }}>
            {/* 필터 입력 필드 영역 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '18px',
                flex: 1
            }}>
                {children ? children : fields.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {f.icon && <span style={{ fontSize: '14px' }}>{f.icon}</span>} {f.label}
                        </label>
                        {f.type === 'select' ? (
                            <select
                                value={f.value}
                                onChange={f.onChange}
                                style={{
                                    padding: '9px 14px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '10px',
                                    fontSize: '13.5px',
                                    backgroundColor: '#ffffff', // 하얀색 인풋 복원
                                    color: '#0f172a',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                                onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
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
                                    padding: '9px 14px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '10px',
                                    fontSize: '13.5px',
                                    backgroundColor: '#ffffff', // 하얀색 인풋 복원
                                    color: '#0f172a',
                                    outline: 'none',
                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                                onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* 필터 검색/초기화 버튼 그룹 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                flexShrink: 0
            }}>
                {onReset && (
                    <button
                        onClick={onReset}
                        style={{
                            padding: '9px 18px',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease-in-out',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.color = '#0f172a';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.color = '#475569';
                        }}
                    >
                        ♻️ 초기화
                    </button>
                )}
                {onSearch && (
                    <button
                        onClick={onSearch}
                        style={{
                            padding: '9px 22px',
                            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '700',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                            transition: 'all 0.2s ease-in-out',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.35)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.2)';
                        }}
                    >
                        🔍 조회
                    </button>
                )}
            </div>
        </div>
    );
};

export default DashboardFilterBar;
