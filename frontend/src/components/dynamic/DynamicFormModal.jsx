import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ProductSearchPopup from '../../ProductSearchPopup';
import ManufacturerSearchModal from '../../ManufacturerSearchModal';
import { toast } from 'react-toastify';

// 마스터 기준정보(품목, 제품명, 제조사, 브랜드 등) 판별 유틸
export const isMasterField = (key = '') => {
    const lk = String(key).toLowerCase().replace(/[-_]/g, '');
    return lk.includes('productcode') || lk.includes('itemcode') 
        || lk.includes('productname') || lk.includes('itemname')
        || lk.includes('manufacturer') || lk.includes('companyname')
        || lk.includes('brand') || lk.includes('claimnumber') || lk.includes('claimno');
};

export const isProductCodeField = (key = '') => {
    const lk = String(key).toLowerCase().replace(/[-_]/g, '');
    return lk.includes('productcode') || lk.includes('itemcode');
};

export const isProductNameField = (key = '') => {
    const lk = String(key).toLowerCase().replace(/[-_]/g, '');
    return lk.includes('productname') || lk.includes('itemname');
};

export const getMasterFieldType = (key = '') => {
    const lk = String(key).toLowerCase().replace(/[-_]/g, '');
    if (lk.includes('manufacturer') || lk.includes('companyname')) {
        return 'MANUFACTURER';
    }
    return 'PRODUCT'; // itemCode, productName, brand 등은 품목 검색 팝업
};

const DynamicFormModal = ({
    isOpen,
    onClose,
    columns = [],
    subPage = null,
    initialData = null,
    isEdit = false,
    onSave,
    loading = false
}) => {
    const [formData, setFormData] = useState({});
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
    const [isManufacturerSearchOpen, setIsManufacturerSearchOpen] = useState(false);
    const [activeRelationField, setActiveRelationField] = useState(null);

    // 폼 필드 도출: subPage.formFields가 있으면 우선 사용, 없으면 gridColumns로부터 자동 파생
    const formFields = useMemo(() => {
        if (subPage?.formFields && subPage.formFields.length > 0) {
            return subPage.formFields;
        }
        if (!columns || columns.length === 0) return [];

        const systemKeys = new Set(['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'createdBy', 'updatedBy']);
        return columns
            .filter(c => !systemKeys.has(c.fieldKey))
            .map(c => ({
                id: c.id || c.fieldKey,
                fieldKey: c.fieldKey,
                label: c.label || c.fieldKey,
                fieldType: c.fieldType || 'TEXT',
                isRequired: false,
                relationSource: c.relationSource
            }));
    }, [subPage, columns]);

    // 품목코드와 제품명 필드 탐색 (복합 렌더링용)
    const productCodeField = useMemo(() => formFields.find(f => isProductCodeField(f.fieldKey)), [formFields]);
    const productNameField = useMemo(() => formFields.find(f => isProductNameField(f.fieldKey)), [formFields]);

    useEffect(() => {
        if (isOpen) {
            if (initialData && typeof initialData === 'object') {
                setFormData({ ...initialData });
            } else {
                setFormData({});
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // 마스터 검색 팝업 열기 (품목 또는 제조사)
    const handleOpenMasterSearch = (field) => {
        setActiveRelationField(field);
        const type = getMasterFieldType(field?.fieldKey || '');
        if (type === 'MANUFACTURER') {
            setIsManufacturerSearchOpen(true);
        } else {
            setIsProductSearchOpen(true);
        }
    };

    // 품목 검색 결과 선택 (기존 DB 데이터로 일괄 자동 채우기 - 신규 추가/변조 불가)
    const handleProductSelect = (product) => {
        if (!product) return;

        setFormData(prev => {
            const next = { ...prev };
            formFields.forEach(f => {
                const lk = f.fieldKey.toLowerCase().replace(/[-_]/g, '');
                if (lk.includes('itemcode') || lk.includes('productcode')) {
                    next[f.fieldKey] = product.itemCode || product.productCode || '';
                } else if (lk.includes('productname') || lk.includes('itemname')) {
                    next[f.fieldKey] = product.productName || '';
                } else if (lk.includes('brand')) {
                    next[f.fieldKey] = product.brand || '';
                } else if (lk.includes('manufacturer') || lk.includes('companyname')) {
                    next[f.fieldKey] = product.manufacturer || next[f.fieldKey] || '';
                } else if (lk.includes('spec')) {
                    next[f.fieldKey] = product.specification || next[f.fieldKey] || '';
                }
            });
            return next;
        });

        setIsProductSearchOpen(false);
        setActiveRelationField(null);
        toast.info(`[${product.productName || product.itemCode}] 품목이 선택되었습니다.`);
    };

    // 제조사 검색 결과 선택 (기존 DB 등록 데이터 선택)
    const handleManufacturerSelect = (mfr) => {
        if (!mfr) return;

        setFormData(prev => {
            const next = { ...prev };
            formFields.forEach(f => {
                const lk = f.fieldKey.toLowerCase().replace(/[-_]/g, '');
                if (lk.includes('manufacturer') || lk.includes('companyname')) {
                    next[f.fieldKey] = mfr.companyName || mfr.name || '';
                }
            });
            return next;
        });

        setIsManufacturerSearchOpen(false);
        setActiveRelationField(null);
        toast.info(`[${mfr.companyName || mfr.name}] 제조사가 적용되었습니다.`);
    };

    // 품목코드 & 제품명 일괄 해제
    const handleClearProductComposite = () => {
        setFormData(prev => {
            const next = { ...prev };
            if (productCodeField) next[productCodeField.fieldKey] = '';
            if (productNameField) next[productNameField.fieldKey] = '';
            return next;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const modalTitle = isEdit 
        ? '✏️ 데이터 수정' 
        : (subPage?.buttonLabel ? `➕ ${subPage.buttonLabel}` : '➕ 신규 데이터 등록');

    const modalElement = (
        <div
            className="modal-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(15, 23, 42, 0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999,
                backdropFilter: 'blur(4px)'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div style={{
                background: '#ffffff',
                width: '740px',
                maxWidth: '94vw',
                maxHeight: '90vh',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                overflow: 'hidden'
            }}>
                {/* 헤더 */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                            {modalTitle}
                        </h3>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                            현재 화면의 그리드 규격에 맞춰 데이터를 등록합니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '22px',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* 기준정보 무결성 보호 안내 배너 */}
                <div style={{
                    padding: '9px 16px',
                    margin: '16px 24px 0 24px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#166534'
                }}>
                    <span style={{ fontSize: '15px' }}>🔒</span>
                    <span>
                        <strong>기준정보 보호 정책:</strong> 품목코드, 제품명, 제조사, 브랜드 등은 <strong>기존 DB 조회 및 선택만 가능</strong>하며, 임의로 추가·수정·삭제할 수 없습니다.
                    </span>
                </div>

                {/* 폼 본문 */}
                <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {formFields.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '13px' }}>
                            설정된 입력 필드가 없습니다.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            {formFields.map(ff => {
                                // 1. 제품코드 필드인 경우 -> 제품명과 통합된 복합 컨트롤 [제품코드 🔍 제품명 ✕] 렌더링
                                if (productCodeField && ff.fieldKey === productCodeField.fieldKey) {
                                    const codeVal = formData[productCodeField.fieldKey] || '';
                                    const nameVal = productNameField ? (formData[productNameField.fieldKey] || '') : '';
                                    return (
                                        <div 
                                            key="composite_product_field" 
                                            style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: '6px',
                                                gridColumn: 'span 2'
                                            }}
                                        >
                                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>제품코드 & 제품명</span>
                                                {(productCodeField.isRequired || productNameField?.isRequired) && <span style={{ color: '#ef4444' }}>*</span>}
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
                                                    onClick={() => handleOpenMasterSearch(productCodeField)}
                                                    style={{
                                                        width: '180px',
                                                        padding: '8px 12px',
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
                                                    onClick={() => handleOpenMasterSearch(productCodeField)}
                                                    style={{
                                                        padding: '0 12px',
                                                        height: '35px',
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
                                                    placeholder="제품명 (돋보기 버튼으로 품목을 선택하면 자동 입력됩니다)"
                                                    onClick={() => handleOpenMasterSearch(productCodeField)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
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
                                                        onClick={handleClearProductComposite}
                                                        style={{
                                                            border: 'none',
                                                            background: 'transparent',
                                                            color: '#94a3b8',
                                                            fontSize: '16px',
                                                            cursor: 'pointer',
                                                            padding: '4px 8px'
                                                        }}
                                                        title="품목 선택 해제"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                // 2. 제품명 필드인데 제품코드 필드가 이미 있어서 위 복합 필드에 통합된 경우 -> 중복 렌더링 건너뜀
                                if (productCodeField && productNameField && ff.fieldKey === productNameField.fieldKey) {
                                    return null;
                                }

                                // 3. 그 외 일반 필드들 (브랜드, 제조사, 상태 등)
                                const isWide = ff.fieldType === 'TEXT' && (ff.fieldKey.includes('desc') || ff.fieldKey.includes('remark') || ff.fieldKey.includes('detail') || ff.fieldKey.includes('note'));
                                const isMaster = isMasterField(ff.fieldKey);
                                return (
                                    <div 
                                        key={ff.id || ff.fieldKey} 
                                        style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            gap: '6px',
                                            gridColumn: isWide ? 'span 2' : 'span 1'
                                        }}
                                    >
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>{ff.label}</span>
                                            {ff.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
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
                                        {renderInput(
                                            ff, 
                                            formData[ff.fieldKey], 
                                            (val) => handleChange(ff.fieldKey, val),
                                            () => handleOpenMasterSearch(ff)
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 하단 푸터 액션 */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
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
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={loading || formFields.length === 0}
                            style={{
                                padding: '8px 22px',
                                background: '#003366',
                                color: '#fff',
                                fontWeight: '700',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            <span>💾</span>
                            <span>{loading ? '저장 중...' : (isEdit ? '수정사항 저장' : '등록 완료')}</span>
                        </button>
                    </div>
                </form>
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

    return createPortal(modalElement, document.body);
};

const renderInput = (field, value, onChange, onOpenMasterSearch) => {
    const inputStyle = {
        padding: '8px 12px',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        fontSize: '13px',
        outline: 'none',
        color: '#1e293b',
        boxSizing: 'border-box',
        width: '100%'
    };

    // 1. 기준정보 필드 (제조사, 브랜드 등): 직접 타이핑 차단 (readOnly), 기존 DB 조회 선택만 가능
    const isMaster = isMasterField(field.fieldKey);
    const isRelation = field.fieldType === 'RELATION' || field.relationSource;
    if (isMaster || isRelation) {
        const isMfr = getMasterFieldType(field.fieldKey) === 'MANUFACTURER';
        return (
            <div style={{ display: 'flex', gap: '6px', width: '100%', position: 'relative' }}>
                <input
                    type="text"
                    value={value || ''}
                    readOnly
                    required={field.isRequired}
                    placeholder={`🔍 클릭하여 기존 DB ${isMfr ? '제조사' : '데이터'} 조회`}
                    onClick={onOpenMasterSearch}
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
                            right: '44px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '14px',
                            cursor: 'pointer',
                            padding: '2px 6px'
                        }}
                        title="선택 해제"
                    >
                        ✕
                    </button>
                )}
                <button
                    type="button"
                    onClick={onOpenMasterSearch}
                    style={{
                        padding: '0 12px',
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
                    title={`${isMfr ? '제조사' : '데이터'} 조회 팝업 열기`}
                >
                    🔍
                </button>
            </div>
        );
    }

    switch (field.fieldType) {
        case 'NUMBER':
            return (
                <input
                    type="number"
                    value={value ?? ''}
                    required={field.isRequired}
                    placeholder="0"
                    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
                    style={inputStyle}
                />
            );

        case 'DATE':
            return (
                <input
                    type="date"
                    value={value || ''}
                    required={field.isRequired}
                    onChange={(e) => onChange(e.target.value)}
                    style={inputStyle}
                />
            );

        case 'DATETIME':
            return (
                <input
                    type="datetime-local"
                    value={value || ''}
                    required={field.isRequired}
                    onChange={(e) => onChange(e.target.value)}
                    style={inputStyle}
                />
            );

        case 'BOOLEAN':
            return (
                <select
                    value={value === true ? 'true' : value === false ? 'false' : ''}
                    required={field.isRequired}
                    onChange={(e) => onChange(e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}
                    style={{ ...inputStyle, background: '#fff' }}
                >
                    <option value="">선택하세요</option>
                    <option value="true">Y (예)</option>
                    <option value="false">N (아니오)</option>
                </select>
            );

        case 'SELECT':
            return (
                <select
                    value={value || ''}
                    required={field.isRequired}
                    onChange={(e) => onChange(e.target.value)}
                    style={{ ...inputStyle, background: '#fff' }}
                >
                    <option value="">선택하세요</option>
                    <option value="ACTIVE">정상 / 활성 (ACTIVE)</option>
                    <option value="PENDING">대기 / 진행 (PENDING)</option>
                    <option value="COMPLETED">완료 (COMPLETED)</option>
                    <option value="INACTIVE">비활성 (INACTIVE)</option>
                </select>
            );

        case 'TEXT':
        default:
            if (field.fieldKey?.toLowerCase().includes('desc') || field.fieldKey?.toLowerCase().includes('remark') || field.fieldKey?.toLowerCase().includes('note')) {
                return (
                    <textarea
                        value={value || ''}
                        required={field.isRequired}
                        rows={3}
                        placeholder={`${field.label} 입력`}
                        onChange={(e) => onChange(e.target.value)}
                        style={{ ...inputStyle, resize: 'vertical' }}
                    />
                );
            }
            return (
                <input
                    type="text"
                    value={value || ''}
                    required={field.isRequired}
                    placeholder={`${field.label} 입력`}
                    onChange={(e) => onChange(e.target.value)}
                    style={inputStyle}
                />
            );
    }
};

export default DynamicFormModal;
