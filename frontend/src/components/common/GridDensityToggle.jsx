import React, { useState, useEffect } from 'react';

/**
 * 📐 테이블 뷰 밀도 조절기 (GridDensityToggle)
 * '컴팩트(38px: 많은 데이터 한눈에)' vs '기본(54px: 여유 있는 터치)' 모드를 토글합니다.
 */
const GridDensityToggle = ({
    density: controlledDensity,
    onDensityChange,
    storageKey = 'grid_density_default'
}) => {
    const [density, setDensity] = useState(() => {
        if (controlledDensity) return controlledDensity;
        try {
            return localStorage.getItem(`qms_density_${storageKey}`) || 'comfortable';
        } catch {
            return 'comfortable';
        }
    });

    useEffect(() => {
        if (controlledDensity) {
            setDensity(controlledDensity);
        }
    }, [controlledDensity]);

    const handleSelect = (newDensity) => {
        setDensity(newDensity);
        try {
            localStorage.setItem(`qms_density_${storageKey}`, newDensity);
        } catch (e) {
            console.error('Save density failed', e);
        }
        if (onDensityChange) {
            onDensityChange(newDensity, newDensity === 'compact' ? 38 : 54);
        }
    };

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '2px',
            gap: '2px'
        }} title="테이블 행 높이 및 표시 밀도 조절">
            <button
                type="button"
                onClick={() => handleSelect('compact')}
                style={{
                    background: density === 'compact' ? '#2563eb' : 'transparent',
                    color: density === 'compact' ? '#ffffff' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                }}
            >
                📐 컴팩트
            </button>
            <button
                type="button"
                onClick={() => handleSelect('comfortable')}
                style={{
                    background: density === 'comfortable' ? '#2563eb' : 'transparent',
                    color: density === 'comfortable' ? '#ffffff' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                }}
            >
                📏 기본
            </button>
        </div>
    );
};

export default GridDensityToggle;
