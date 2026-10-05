import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ProductSearchPopup from '../../ProductSearchPopup';
import ManufacturerSearchModal from '../../ManufacturerSearchModal';
import { toast } from 'react-toastify';
import { isMasterField, getMasterFieldType } from './DynamicFormModal';

const DynamicDetailDrawer = ({
    isOpen,
    onClose,
    rowData = null,
    columns = [],
    screenName = '동적 데이터',
    onSave,
    loading = false
}) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState({});
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
    const [isManufacturerSearchOpen, setIsManufacturerSearchOpen] = useState(false);
    const [activeRelationField, setActiveRelationField] = useState(null);

    useEffect(() => {
        if (isOpen && rowData) {
            setEditData({ ...rowData });
            setIsEditMode(false);
        }
    }, [isOpen, rowData]);

    if (!isOpen || !rowData) return null;

    const handleChange = (fieldKey, value) => {
        setEditData(prev => ({ ...prev, [fieldKey]: value }));
    };

    // 마스터 검색 팝업 열기 (품목 또는 제조사)
    const handleOpenMasterSearch = (col) => {
        setActiveRelationField(col);
        const type = getMasterFieldType(col.fieldKey);
        if (type === 'MANUFACTURER') {
            setIsManufacturerSearchOpen(true);
        } else {
            setIsProductSearchOpen(true);
        }
    };

    const handleProductSelect = (product) => {
        if (!product) return;

        setEditData(prev => {
            const next = { ...prev };
            columns.forEach(c => {
                const lk = c.fieldKey.toLowerCase().replace(/[-_]/g, '');
                if (lk.includes('itemcode') || lk.includes('productcode')) {
                    next[c.fieldKey] = product.itemCode || product.productCode || '';
                } else if (lk.includes('productname') || lk.includes('itemname')) {
                    next[c.fieldKey] = product.productName || '';
                } else if (lk.includes('brand')) {
                    next[c.fieldKey] = product.brand || '';
                } else if (lk.includes('manufacturer') || lk.includes('companyname')) {
                    next[c.fieldKey] = product.manufacturer || next[c.fieldKey] || '';
                } else if (lk.includes('spec')) {
                    next[c.fieldKey] = product.specification || next[c.fieldKey] || '';
                }
            });
            return next;
        });

        setIsProductSearchOpen(false);
        setActiveRelationField(null);
        toast.info(`[${product.productName || product.itemCode}] 기준정보가 적용되었습니다.`);
    };

    const handleManufacturerSelect = (mfr) => {
        if (!mfr) return;

        setEditData(prev => {
            const next = { ...prev };
            columns.forEach(c => {
                const lk = c.fieldKey.toLowerCase().replace(/[-_]/g, '');
                if (lk.includes('manufacturer') || lk.includes('companyname')) {
                    next[c.fieldKey] = mfr.companyName || mfr.name || '';
                }
            });
            return next;
        });

        setIsManufacturerSearchOpen(false);
        setActiveRelationField(null);
        toast.info(`[${mfr.companyName || mfr.name}] 제조사가 적용되었습니다.`);
    };

    const handleSaveSubmit = (e) => {
        e?.preventDefault();
        if (onSave) {
            onSave(editData);
        }
    };

    // 주 타이틀 결정 (우선순위: productName -> name -> title -> screenName #ID)
    const primaryTitle = rowData.productName 
        || rowData.name 
        || rowData.title 
        || rowData.itemCode 
        || rowData.claimNumber 
        || `상세 데이터 #${rowData.id || ''}`;

    const subTitle = rowData.itemCode && rowData.productName 
        ? `코드: ${rowData.itemCode}` 
        : (rowData.id ? `ID: ${rowData.id}` : '');

    const drawerElement = (
        <div
            className="drawer-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(3px)',
                zIndex: 1100,
                display: 'flex',
                justifyContent: 'flex-end',
                animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                style={{
                    width: '640px',
                    maxWidth: '100vw',
                    height: '100%',
                    backgroundColor: '#ffffff',
                    boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* 1. 드로어 상단 헤더 */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                background: '#e0e7ff',
                                color: '#3730a3'
                            }}>
                                {screenName}
                            </span>
                            {subTitle && (
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                                    {subTitle}
                                </span>
                            )}
                        </div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: '800',
                            color: '#0f172a',
                            lineHeight: '1.3'
                        }}>
                            {primaryTitle}
                        </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => setIsEditMode(!isEditMode)}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '700',
                                borderRadius: '6px',
                                border: '1px solid',
                                borderColor: isEditMode ? '#93c5fd' : '#cbd5e1',
                                background: isEditMode ? '#eff6ff' : '#ffffff',
                                color: isEditMode ? '#1d4ed8' : '#475569',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <span>{isEditMode ? '👁️ 보기 모드' : '✏️ 편집하기'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                fontSize: '24px',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                lineHeight: '1'
                            }}
                            title="닫기"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* 2. 드로어 본문 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {isEditMode ? (
                        /* 편집 모드 */
                        <form onSubmit={handleSaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{
                                padding: '12px 14px',
                                background: '#f0fdf4',
                                borderRadius: '8px',
                                border: '1px solid #bbf7d0',
                                fontSize: '12px',
                                color: '#166534',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span>🔒</span>
                                <span><b>기준정보 보호 정책:</b> 품목코드, 제품명, 제조사명, 브랜드는 기존 DB에서 <b>조회/선택만 가능</b>하며 임의 추가·수정·삭제할 수 없습니다.</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                                {(() => {
                                    const productCodeCol = columns.find(c => isProductCodeField(c.fieldKey));
                                    const productNameCol = columns.find(c => isProductNameField(c.fieldKey));

                                    return columns.map(col => {
                                        // 1. 제품코드 컬럼인 경우 -> [제품코드 🔍 제품명 ✕] 복합 렌더링
                                        if (productCodeCol && col.fieldKey === productCodeCol.fieldKey) {
                                            const codeVal = editData[productCodeCol.fieldKey] || '';
                                            const nameVal = productNameCol ? (editData[productNameCol.fieldKey] || '') : '';
                                            return (
                                                <div
                                                    key="composite_drawer_product_field"
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '5px',
                                                        gridColumn: 'span 2'
                                                    }}
                                                >
                                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span>제품코드 & 제품명</span>
                                                        <span style={{
                                                            fontSize: '10px',
                                                            fontWeight: '600',
                                                            padding: '1px 6px',
                                                            borderRadius: '4px',
                                                            background: '#e0f2fe',
                                                            color: '#0369a1',
                                                            border: '1px solid #bae6fd'
                                                        }}>
                                                            🔒 DB 조회 전용
                                                        </span>
                                                    </label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                                                        <input
                                                            type="text"
                                                            value={codeVal}
                                                            readOnly
                                                            placeholder="제품코드"
                                                            onClick={() => handleOpenMasterSearch(productCodeCol)}
                                                            style={{
                                                                width: '160px',
                                                                padding: '7px 10px',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '6px',
                                                                fontSize: '13px',
                                                                background: '#f8fafc',
                                                                color: codeVal ? '#0f172a' : '#94a3b8',
                                                                fontWeight: codeVal ? '700' : '400',
                                                                cursor: 'pointer',
                                                                boxSizing: 'border-box'
                                                            }}
                                                            title="클릭하여 기존 DB 품목 조회"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenMasterSearch(productCodeCol)}
                                                            style={{
                                                                padding: '0 12px',
                                                                height: '33px',
                                                                background: '#eff6ff',
                                                                border: '1px solid #bfdbfe',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '13px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: '#1d4ed8',
                                                                fontWeight: '700'
                                                            }}
                                                            title="품목 상세 검색"
                                                        >
                                                            🔍
                                                        </button>
                                                        <input
                                                            type="text"
                                                            value={nameVal}
                                                            readOnly
                                                            placeholder="제품명"
                                                            onClick={() => handleOpenMasterSearch(productCodeCol)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '7px 10px',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '6px',
                                                                fontSize: '13px',
                                                                background: '#f8fafc',
                                                                color: nameVal ? '#0f172a' : '#94a3b8',
                                                                fontWeight: nameVal ? '600' : '400',
                                                                cursor: 'pointer',
                                                                boxSizing: 'border-box'
                                                            }}
                                                            title="클릭하여 기존 DB 품목 조회"
                                                        />
                                                        {(codeVal || nameVal) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditData(prev => ({
                                                                        ...prev,
                                                                        [productCodeCol.fieldKey]: '',
                                                                        ...(productNameCol ? { [productNameCol.fieldKey]: '' } : {})
                                                                    }));
                                                                }}
                                                                style={{
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    color: '#94a3b8',
                                                                    fontSize: '15px',
                                                                    cursor: 'pointer',
                                                                    padding: '2px 6px'
                                                                }}
                                                                title="선택 해제"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // 2. 제품명 컬럼인데 제품코드와 복합 렌더링에 통합된 경우 중복 생략
                                        if (productCodeCol && productNameCol && col.fieldKey === productNameCol.fieldKey) {
                                            return null;
                                        }

                                        const isId = col.fieldKey === 'id';
                                        const isMaster = isMasterField(col.fieldKey);
                                        const isWide = col.fieldType === 'TEXT' && (col.fieldKey.includes('desc') || col.fieldKey.includes('remark') || col.fieldKey.includes('note'));
                                        return (
                                            <div
                                                key={col.id || col.fieldKey}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '5px',
                                                    gridColumn: isWide ? 'span 2' : 'span 1'
                                                }}
                                            >
                                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>{col.label}</span>
                                                    {isId && <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(고유키, 수정불가)</span>}
                                                    {isMaster && (
                                                        <span style={{
                                                            fontSize: '10px',
                                                            fontWeight: '600',
                                                            padding: '1px 6px',
                                                            borderRadius: '4px',
                                                            background: '#e0f2fe',
                                                            color: '#0369a1',
                                                            border: '1px solid #bae6fd'
                                                        }}>
                                                            🔒 DB 조회 전용
                                                        </span>
                                                    )}
                                                </label>
                                                {renderDrawerInput(
                                                    col,
                                                    editData[col.fieldKey],
                                                    (val) => handleChange(col.fieldKey, val),
                                                    isId,
                                                    () => handleOpenMasterSearch(col)
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </form>
                    ) : (
                        /* 보기 모드 (품목코드 상세정보 스타일) */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* 핵심 요약 카드 */}
                            <div style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '16px',
                                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                            }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                                    📋 상세 속성 정보
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                    {columns.map(col => {
                                        const rawVal = rowData[col.fieldKey];
                                        return (
                                            <div
                                                key={col.id || col.fieldKey}
                                                style={{
                                                    padding: '10px 12px',
                                                    background: '#f8fafc',
                                                    borderRadius: '8px',
                                                    border: '1px solid #f1f5f9',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px'
                                                }}
                                            >
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                                                    {col.label}
                                                </span>
                                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', wordBreak: 'break-all' }}>
                                                    {formatDetailValue(rawVal, col.fieldType)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 메타데이터 정보 (ID, 타임스탬프) */}
                            {(rowData.createdAt || rowData.updatedAt || rowData.id) && (
                                <div style={{
                                    fontSize: '11px',
                                    color: '#94a3b8',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '12px',
                                    padding: '8px 12px',
                                    background: '#f8fafc',
                                    borderRadius: '6px'
                                }}>
                                    {rowData.id && <span><b>ID:</b> {rowData.id}</span>}
                                    {rowData.createdAt && <span><b>등록일시:</b> {new Date(rowData.createdAt).toLocaleString()}</span>}
                                    {rowData.updatedAt && <span><b>수정일시:</b> {new Date(rowData.updatedAt).toLocaleString()}</span>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. 드로어 하단 액션 바 */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#ffffff',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px'
                }}>
                    {isEditMode ? (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditData({ ...rowData });
                                    setIsEditMode(false);
                                }}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#475569',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveSubmit}
                                disabled={loading}
                                style={{
                                    padding: '8px 22px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#003366',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                <span>💾</span>
                                <span>{loading ? '저장 중...' : '수정사항 저장'}</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#475569',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                닫기
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditMode(true)}
                                style={{
                                    padding: '8px 22px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#4f46e5',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>✏️</span>
                                <span>데이터 수정하기</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* 품목 관계형 검색 모달 (기존 DB 데이터 조회/선택 전용) */}
            {isProductSearchOpen && (
                <ProductSearchPopup
                    onClose={() => {
                        setIsProductSearchOpen(false);
                        setActiveRelationField(null);
                    }}
                    onSelect={handleProductSelect}
                    onSelectProduct={handleProductSelect}
                />
            )}

            {/* 제조사 검색 모달 (기존 DB 데이터 조회/선택 전용) */}
            {isManufacturerSearchOpen && (
                <ManufacturerSearchModal
                    onClose={() => {
                        setIsManufacturerSearchOpen(false);
                        setActiveRelationField(null);
                    }}
                    onSelect={handleManufacturerSelect}
                />
            )}
        </div>
    );

    return createPortal(drawerElement, document.body);
};

const formatDetailValue = (val, fieldType) => {
    if (val === null || val === undefined || val === '') {
        return <span style={{ color: '#cbd5e1' }}>-</span>;
    }

    if (typeof val === 'boolean') {
        return (
            <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                background: val ? '#dcfce7' : '#fee2e2',
                color: val ? '#15803d' : '#b91c1c'
            }}>
                {val ? 'Y' : 'N'}
            </span>
        );
    }

    if (typeof val === 'object') {
        return val.name || val.productName || val.itemCode || JSON.stringify(val);
    }

    if (fieldType === 'NUMBER' && typeof val === 'number') {
        return val.toLocaleString();
    }

    if (fieldType === 'DATE' && typeof val === 'string' && val.length >= 10) {
        return val.substring(0, 10);
    }

    return String(val);
};

const renderDrawerInput = (col, value, onChange, disabled, onOpenRelationSearch) => {
    const inputStyle = {
        padding: '7px 10px',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        fontSize: '13px',
        outline: 'none',
        color: '#1e293b',
        boxSizing: 'border-box',
        width: '100%',
        background: disabled ? '#f1f5f9' : '#ffffff'
    };

    if (disabled) {
        return <input type="text" value={value || ''} disabled style={inputStyle} />;
    }

    // 마스터 기준정보 필드 (품목코드, 제품명, 제조사, 브랜드 등): 직접 수정 불가, 기존 DB 조회 선택만 가능
    const isMaster = isMasterField(col.fieldKey);
    const isRelation = col.fieldType === 'RELATION' || col.relationSource;
    if (isMaster || isRelation) {
        const isMfr = getMasterFieldType(col.fieldKey) === 'MANUFACTURER';
        return (
            <div style={{ display: 'flex', gap: '5px', width: '100%', position: 'relative' }}>
                <input
                    type="text"
                    value={value || ''}
                    readOnly
                    placeholder={`🔍 클릭하여 기존 DB ${isMfr ? '제조사' : '품목'} 조회`}
                    onClick={onOpenRelationSearch}
                    style={{
                        ...inputStyle,
                        flex: 1,
                        background: '#f8fafc',
                        cursor: 'pointer',
                        color: value ? '#0f172a' : '#94a3b8',
                        fontWeight: value ? '600' : '400',
                        borderColor: value ? '#93c5fd' : '#cbd5e1'
                    }}
                    title="기존 DB에 등록된 데이터에서 조회하여 선택만 가능합니다 (임의 수정/추가/삭제 불가)"
                />
                {value && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange('');
                        }}
                        style={{
                            position: 'absolute',
                            right: '38px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '13px',
                            cursor: 'pointer',
                            padding: '2px 4px'
                        }}
                        title="선택 해제"
                    >
                        ✕
                    </button>
                )}
                <button
                    type="button"
                    onClick={onOpenRelationSearch}
                    style={{
                        padding: '0 10px',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1d4ed8',
                        fontWeight: '700'
                    }}
                    title={`${isMfr ? '제조사' : '품목'} 조회 팝업 열기`}
                >
                    🔍
                </button>
            </div>
        );
    }

    switch (col.fieldType) {
        case 'NUMBER':
            return (
                <input
                    type="number"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
                    style={inputStyle}
                />
            );

        case 'DATE':
            return (
                <input
                    type="date"
                    value={typeof value === 'string' && value.length >= 10 ? value.substring(0, 10) : (value || '')}
                    onChange={(e) => onChange(e.target.value)}
                    style={inputStyle}
                />
            );

        case 'DATETIME':
            return (
                <input
                    type="datetime-local"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    style={inputStyle}
                />
            );

        case 'BOOLEAN':
            return (
                <select
                    value={value === true ? 'true' : value === false ? 'false' : ''}
                    onChange={(e) => onChange(e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}
                    style={{ ...inputStyle, background: '#fff' }}
                >
                    <option value="">선택</option>
                    <option value="true">Y (예)</option>
                    <option value="false">N (아니오)</option>
                </select>
            );

        case 'TEXT':
        default:
            if (col.fieldKey?.toLowerCase().includes('desc') || col.fieldKey?.toLowerCase().includes('remark') || col.fieldKey?.toLowerCase().includes('note')) {
                return (
                    <textarea
                        value={value || ''}
                        rows={3}
                        onChange={(e) => onChange(e.target.value)}
                        style={{ ...inputStyle, resize: 'vertical' }}
                    />
                );
            }
            return (
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    style={inputStyle}
                />
            );
    }
};

export default DynamicDetailDrawer;
