import React, { useState, useRef, useEffect } from 'react';

const NotionPropertyMenu = ({ columns = [], userViews = [], onVisibilityChange, onResetDefault }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const viewMap = {};
    userViews.forEach(uv => {
        viewMap[uv.columnId] = uv.isVisible;
    });

    const isColumnVisible = (col) => {
        if (viewMap[col.id] !== undefined) {
            return viewMap[col.id];
        }
        return true;
    };

    const getTypeBadge = (type) => {
        switch (type) {
            case 'RELATION': return { label: '🔗 관계', color: '#4f46e5', bg: '#eef2ff' };
            case 'NUMBER': return { label: '# 숫자', color: '#059669', bg: '#ecfdf5' };
            case 'DATE': return { label: '📅 일자', color: '#d97706', bg: '#fffbeb' };
            case 'SELECT': return { label: '🏷️ 선택', color: '#7c3aed', bg: '#f5f3ff' };
            default: return { label: 'Aa 텍스트', color: '#64748b', bg: '#f1f5f9' };
        }
    };

    return (
        <div style={{ position: 'relative' }} ref={menuRef}>
            <button
                type="button"
                className="outline"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    background: '#fff',
                    color: '#334155',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                }}
            >
                <span>⚙️</span>
                <span style={{ fontWeight: '600' }}>속성 ({columns.filter(c => isColumnVisible(c)).length}/{columns.length})</span>
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '260px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    padding: '12px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>그리드 속성 표시</span>
                        <button
                            type="button"
                            onClick={onResetDefault}
                            style={{ fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            기본값 복원
                        </button>
                    </div>

                    <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {columns.map(col => {
                            const badge = getTypeBadge(col.fieldType);
                            const visible = isColumnVisible(col);
                            return (
                                <label
                                    key={col.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '6px 8px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        background: visible ? '#f8fafc' : 'transparent',
                                        transition: 'background 0.15s'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={visible}
                                        onChange={(e) => onVisibilityChange(col.id, e.target.checked)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <span style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: badge.bg,
                                        color: badge.color,
                                        fontWeight: 'bold',
                                        fontFamily: 'monospace'
                                    }}>
                                        {badge.label}
                                    </span>
                                    <span style={{ fontSize: '13px', color: visible ? '#0f172a' : '#94a3b8', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {col.label}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotionPropertyMenu;
