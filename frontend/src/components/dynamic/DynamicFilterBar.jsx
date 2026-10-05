import React, { useState } from 'react';
import ProductSearchPopup from '../../ProductSearchPopup';

const DynamicFilterBar = ({ searchFields = [], filterValues = {}, onFilterChange, onSearch, onReset }) => {
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);

    if (!searchFields || searchFields.length === 0) {
        return null;
    }

    const handleChange = (key, value) => {
        onFilterChange({ ...filterValues, [key]: value });
    };

    const handleProductSelect = (selectedProduct) => {
        if (!selectedProduct) return;
        handleChange('PRODUCT_NAME', {
            itemCode: selectedProduct.itemCode || '',
            productName: selectedProduct.productName || ''
        });
        setIsProductSearchOpen(false);
    };

    return (
        <div style={{
            background: '#ffffff',
            padding: '14px 20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
            marginBottom: '14px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: '14px'
        }}>
            {searchFields.map(field => {
                const value = filterValues[field.catalogKey];
                return (
                    <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                            {field.catalogKey === 'PRODUCT_NAME' ? '🏷️ 품목코드&제품명' : field.label}
                        </label>
                        {renderFieldInput(
                            field,
                            value,
                            (val) => handleChange(field.catalogKey, val),
                            onSearch,
                            () => setIsProductSearchOpen(true)
                        )}
                    </div>
                );
            })}

            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', alignSelf: 'flex-end' }}>
                <button
                    type="button"
                    onClick={onReset}
                    style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: '600',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        height: '34px'
                    }}
                >
                    <span>🔄</span>
                    <span>초기화</span>
                </button>
                <button
                    type="button"
                    onClick={onSearch}
                    style={{
                        padding: '6px 16px',
                        fontSize: '12px',
                        fontWeight: '700',
                        borderRadius: '6px',
                        background: '#003366',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        height: '34px'
                    }}
                >
                    <span>🔍</span>
                    <span>검색</span>
                </button>
            </div>

            {/* 품목코드 & 제품명 표준 팝업 모달 */}
            {isProductSearchOpen && (
                <ProductSearchPopup
                    onClose={() => setIsProductSearchOpen(false)}
                    onSelect={handleProductSelect}
                />
            )}
        </div>
    );
};

const renderFieldInput = (field, value, onChange, onSearch, onOpenProductSearch) => {
    const inputBaseStyle = {
        padding: '6px 10px',
        fontSize: '12px',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        height: '34px',
        outline: 'none',
        color: '#1e293b',
        boxSizing: 'border-box'
    };

    // 1. 품목코드 & 제품명 복합 필터 (ProductSearchPopup 연동)
    if (field.catalogKey === 'PRODUCT_NAME') {
        const prodVal = typeof value === 'object' && value !== null 
            ? value 
            : { itemCode: (typeof value === 'string' ? value : ''), productName: '' };

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                    type="text"
                    placeholder="품목코드"
                    value={prodVal.itemCode || ''}
                    onChange={(e) => onChange({ ...prodVal, itemCode: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch && onSearch()}
                    style={{ ...inputBaseStyle, width: '120px' }}
                    title="품목코드 직접 입력 또는 돋보기 클릭"
                />
                <button
                    type="button"
                    onClick={onOpenProductSearch}
                    style={{
                        padding: '0 10px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        height: '34px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px'
                    }}
                    title="품목 상세 검색 모달"
                >
                    🔍
                </button>
                <input
                    type="text"
                    placeholder="제품명"
                    value={prodVal.productName || ''}
                    onChange={(e) => onChange({ ...prodVal, productName: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch && onSearch()}
                    style={{ ...inputBaseStyle, width: '160px' }}
                    title="제품명 직접 입력"
                />
                {(prodVal.itemCode || prodVal.productName) && (
                    <button
                        type="button"
                        onClick={() => onChange({ itemCode: '', productName: '' })}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '0 4px',
                            fontSize: '13px',
                            lineHeight: '1'
                        }}
                        title="입력 내용 지우기"
                    >
                        ✕
                    </button>
                )}
            </div>
        );
    }

    switch (field.componentKey) {
        case 'DateRangePicker': {
            const dateVal = typeof value === 'object' && value !== null ? value : {};
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                        type="date"
                        value={dateVal.startDate || ''}
                        onChange={(e) => onChange({ ...dateVal, startDate: e.target.value })}
                        style={{ ...inputBaseStyle, width: '130px' }}
                    />
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>~</span>
                    <input
                        type="date"
                        value={dateVal.endDate || ''}
                        onChange={(e) => onChange({ ...dateVal, endDate: e.target.value })}
                        style={{ ...inputBaseStyle, width: '130px' }}
                    />
                </div>
            );
        }

        case 'SelectBox':
            return (
                <select
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(e.target.value)}
                    style={{ ...inputBaseStyle, minWidth: '120px', background: '#fff' }}
                >
                    <option value="">전체</option>
                    <option value="ACTIVE">정상 / 활성</option>
                    <option value="PENDING">대기 / 진행</option>
                    <option value="COMPLETED">완료</option>
                </select>
            );

        case 'RelationSearch':
            return (
                <input
                    type="text"
                    placeholder={`${field.label} 검색`}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch && onSearch()}
                    style={{ ...inputBaseStyle, minWidth: '140px' }}
                />
            );

        case 'TextInput':
        default:
            return (
                <input
                    type="text"
                    placeholder={`${field.label} 입력`}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch && onSearch()}
                    style={{ ...inputBaseStyle, minWidth: '150px' }}
                />
            );
    }
};

export default DynamicFilterBar;
