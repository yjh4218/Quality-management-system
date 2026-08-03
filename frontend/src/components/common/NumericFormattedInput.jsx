import React from 'react';

export const formatWithCommas = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const str = String(val).replace(/[^0-9.]/g, '');
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
};

export const parsePureNumber = (formattedStr) => {
    if (!formattedStr) return '';
    const cleanStr = String(formattedStr).replace(/[^0-9.]/g, '');
    const parts = cleanStr.split('.');
    if (parts.length > 2) {
        return parts[0] + '.' + parts.slice(1).join('');
    }
    return cleanStr;
};

const NumericFormattedInput = ({
    value,
    onChange,
    disabled,
    placeholder,
    style,
    name,
    invalid,
    step,
    className
}) => {
    const displayValue = formatWithCommas(value);

    const handleInputChange = (e) => {
        const rawVal = e.target.value;
        const cleanVal = parsePureNumber(rawVal);
        onChange({
            target: {
                name: name || e.target.name,
                value: cleanVal
            }
        });
    };

    const handleKeyDown = (e) => {
        const allowedKeys = ['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', '.', 'Process'];
        if (allowedKeys.includes(e.key) || (e.ctrlKey || e.metaKey)) {
            return;
        }
        if (!/^[0-9]$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handleComposition = (e) => {
        e.preventDefault();
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            name={name}
            value={displayValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleComposition}
            onCompositionUpdate={handleComposition}
            onCompositionEnd={(e) => {
                const cleanVal = parsePureNumber(e.target.value);
                onChange({ target: { name: name || e.target.name, value: cleanVal } });
            }}
            disabled={disabled}
            placeholder={placeholder || "0"}
            className={className}
            style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '4px',
                border: invalid ? '2px solid #ef4444' : '1px solid #ccc',
                backgroundColor: invalid ? '#fef2f2' : disabled ? '#f1f5f9' : '#fff',
                color: invalid ? '#991b1b' : '#333',
                fontWeight: invalid ? 'bold' : 'normal',
                boxShadow: invalid ? '0 0 0 3px rgba(239, 68, 68, 0.25)' : 'none',
                ...style
            }}
        />
    );
};

export default NumericFormattedInput;
