import React, { useState, useEffect, useRef } from 'react';

/**
 * 🎛️ 그리드 컬럼 표시/숨김 선택기 (ColumnVisibilityToggle)
 * 사용자가 필요한 컬럼만 체크하여 볼 수 있고, 설정은 localStorage에 자동 저장됩니다.
 */
const ColumnVisibilityToggle = ({
    columnDefs = [],
    onColumnDefsChange,
    storageKey = 'grid_columns_default',
    buttonLabel = '컬럼 설정 ⚙️'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [columns, setColumns] = useState([]);
    const popoverRef = useRef(null);

    // 초기 컬럼 상태 로드
    useEffect(() => {
        if (!columnDefs || columnDefs.length === 0) return;

        let savedHiddenFields = [];
        try {
            const raw = localStorage.getItem(`qms_cols_${storageKey}`);
            if (raw) savedHiddenFields = JSON.parse(raw);
        } catch (e) {
            console.error('Failed to load hidden columns', e);
        }

        const initialCols = columnDefs
            .filter(col => col.field || col.headerName)
            .map(col => {
                const field = col.field || col.colId || col.headerName;
                const isHidden = savedHiddenFields.includes(field) || !!col.hide;
                return {
                    field,
                    headerName: col.headerName || col.field,
                    hide: isHidden
                };
            });

        setColumns(initialCols);

        // 저장된 상태가 있다면 부모 columnDefs에 반영
        if (savedHiddenFields.length > 0 && onColumnDefsChange) {
            const updated = columnDefs.map(col => {
                const field = col.field || col.colId || col.headerName;
                return {
                    ...col,
                    hide: savedHiddenFields.includes(field)
                };
            });
            onColumnDefsChange(updated);
        }
    }, [storageKey]);

    // 외부 클릭 시 닫기
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

    // 개별 컬럼 토글
    const handleToggle = (field) => {
        const nextCols = columns.map(c => c.field === field ? { ...c, hide: !c.hide } : c);
        setColumns(nextCols);

        const hiddenFields = nextCols.filter(c => c.hide).map(c => c.field);
        try {
            localStorage.setItem(`qms_cols_${storageKey}`, JSON.stringify(hiddenFields));
        } catch (e) {
            console.error('Save hidden columns failed', e);
        }

        if (onColumnDefsChange) {
            const updatedDefs = columnDefs.map(col => {
                const f = col.field || col.colId || col.headerName;
                const match = nextCols.find(c => c.field === f);
                return match ? { ...col, hide: match.hide } : col;
            });
            onColumnDefsChange(updatedDefs);
        }
    };

    // 전체 보이기 / 초기화
    const handleResetAll = () => {
        const nextCols = columns.map(c => ({ ...c, hide: false }));
        setColumns(nextCols);
        localStorage.removeItem(`qms_cols_${storageKey}`);

        if (onColumnDefsChange) {
            const updatedDefs = columnDefs.map(col => ({ ...col, hide: false }));
            onColumnDefsChange(updatedDefs);
        }
    };

    const visibleCount = columns.filter(c => !c.hide).length;

    return (
        <div style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef}>
            <button
                type="button"
                className="cmd-quick-tag"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: isOpen ? '#eff6ff' : '#ffffff',
                    borderColor: isOpen ? '#3b82f6' : '#cbd5e1',
                    color: isOpen ? '#1d4ed8' : '#334155'
                }}
            >
                <span>{buttonLabel}</span>
                <span style={{
                    background: '#f1f5f9',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#64748b'
                }}>
                    {visibleCount}/{columns.length}
                </span>
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    width: '230px',
                    maxHeight: '340px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease-out'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#334155'
                    }}>
                        <span>표시할 컬럼 선택</span>
                        <button
                            type="button"
                            onClick={handleResetAll}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#2563eb',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            전체 표시
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
                        {columns.map(col => (
                            <label
                                key={col.field}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: col.hide ? '#94a3b8' : '#1e293b',
                                    cursor: 'pointer',
                                    transition: 'background 0.1s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <input
                                    type="checkbox"
                                    checked={!col.hide}
                                    onChange={() => handleToggle(col.field)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {col.headerName}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColumnVisibilityToggle;
