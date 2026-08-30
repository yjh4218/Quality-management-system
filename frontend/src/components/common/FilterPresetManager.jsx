import React, { useState, useEffect, useRef } from 'react';

/**
 * 🔍 검색 조건 / 필터 프리셋 관리기 (FilterPresetManager)
 * 자주 쓰는 복합 검색 조건을 이름으로 저장하고 1클릭으로 적용/삭제할 수 있습니다.
 */
const FilterPresetManager = ({
    currentFilters = {},
    onApplyPreset,
    storageKey = 'filter_presets_default'
}) => {
    const [presets, setPresets] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const popoverRef = useRef(null);

    const fullStorageKey = `qms_presets_${storageKey}`;

    useEffect(() => {
        try {
            const raw = localStorage.getItem(fullStorageKey);
            if (raw) setPresets(JSON.parse(raw));
        } catch (e) {
            console.error('Load filter presets failed', e);
        }
    }, [fullStorageKey]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setIsOpen(false);
                setIsSaving(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSavePreset = () => {
        const name = presetName.trim();
        if (!name) return;

        const newPreset = {
            id: Date.now(),
            name,
            filters: currentFilters,
            createdAt: new Date().toLocaleDateString()
        };

        const updated = [newPreset, ...presets.filter(p => p.name !== name)];
        setPresets(updated);
        try {
            localStorage.setItem(fullStorageKey, JSON.stringify(updated));
        } catch (e) {
            console.error('Save preset failed', e);
        }

        setPresetName('');
        setIsSaving(false);
    };

    const handleDeletePreset = (id, e) => {
        e.stopPropagation();
        const updated = presets.filter(p => p.id !== id);
        setPresets(updated);
        try {
            localStorage.setItem(fullStorageKey, JSON.stringify(updated));
        } catch (e) {
            console.error('Delete preset failed', e);
        }
    };

    const handleSelectPreset = (preset) => {
        if (onApplyPreset) {
            onApplyPreset(preset.filters);
        }
        setIsOpen(false);
    };

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
                <span>🔖 필터 프리셋</span>
                {presets.length > 0 && (
                    <span style={{
                        background: '#dbeafe',
                        borderRadius: '10px',
                        padding: '1px 6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#1e40af'
                    }}>
                        {presets.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '6px',
                    width: '260px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                    zIndex: 1000,
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
                        <span>저장된 검색 필터</span>
                        <button
                            type="button"
                            onClick={() => setIsSaving(!isSaving)}
                            style={{
                                background: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            + 현재 조건 저장
                        </button>
                    </div>

                    {isSaving && (
                        <div style={{ padding: '10px 14px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
                            <input
                                type="text"
                                placeholder="프리셋 이름 입력 (예: 최근 7일 불량)"
                                value={presetName}
                                onChange={e => setPresetName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    borderRadius: '5px',
                                    border: '1px solid #93c5fd',
                                    fontSize: '12px',
                                    marginBottom: '6px'
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsSaving(false)}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '4px',
                                        padding: '2px 8px',
                                        fontSize: '11px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    취소
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSavePreset}
                                    style={{
                                        background: '#2563eb',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '2px 10px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    저장
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '6px' }}>
                        {presets.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                저장된 프리셋이 없습니다.
                            </div>
                        ) : (
                            presets.map(preset => (
                                <div
                                    key={preset.id}
                                    onClick={() => handleSelectPreset(preset)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        transition: 'background 0.1s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{preset.name}</span>
                                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>{preset.createdAt}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDeletePreset(preset.id, e)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#94a3b8',
                                            cursor: 'pointer',
                                            padding: '2px 6px',
                                            fontSize: '12px'
                                        }}
                                        title="프리셋 삭제"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterPresetManager;
