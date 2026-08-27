import React, { useState, useEffect } from 'react';
import { searchProducts, getPackagingSpecs, getPackagingMethodImages, getBaseURL } from './api';

const ProductSearchPopup = ({ 
    isOpen = true,
    onClose, 
    onSelect, 
    onSelectProduct, 
    initialIsMasterOnly = false,
    title = "🔍 품목 상세 검색"
}) => {
    const [searchFields, setSearchFields] = useState({
        itemCode: '',
        productName: '',
        englishProductName: '',
        manufacturer: '',
        ingredients: '',
        isMasterOnly: initialIsMasterOnly
    });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // 포장사진 미리보기 상태
    const [previewProduct, setPreviewProduct] = useState(null);
    const [previewImages, setPreviewImages] = useState([]);
    const [previewLoading, setPreviewLoading] = useState(false);

    const handleItemSelect = (product) => {
        if (typeof onSelectProduct === 'function') {
            onSelectProduct(product);
        } else if (typeof onSelect === 'function') {
            onSelect(product);
        }
    };

    // 컴포넌트 마운트 시 initialIsMasterOnly가 true이면 자동 검색 수행
    useEffect(() => {
        if (initialIsMasterOnly) {
            fetchInitialMasterProducts();
        }
    }, [initialIsMasterOnly]);

    const fetchInitialMasterProducts = async () => {
        setLoading(true);
        try {
            const res = await searchProducts({ isMaster: true, size: 50 });
            const rawData = res.data.content !== undefined ? res.data.content : res.data;
            const list = Array.isArray(rawData) ? rawData : [];
            const filtered = list.filter(p => p.isMaster === true || p.isMaster === 'true' || p.isMaster === 1);
            setResults(filtered.length > 0 ? filtered : list);
        } catch (error) {
            console.error("Failed to load initial master products:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();

        setLoading(true);
        setPreviewProduct(null);
        setPreviewImages([]);
        try {
            const queryParams = {
                itemCode: searchFields.itemCode,
                productName: searchFields.productName,
                englishProductName: searchFields.englishProductName,
                manufacturer: searchFields.manufacturer,
                ingredients: searchFields.ingredients,
                isMaster: searchFields.isMasterOnly ? true : undefined,
                size: 50
            };
            const res = await searchProducts(queryParams);
            const data = res.data.content !== undefined ? res.data.content : res.data;
            let list = Array.isArray(data) ? data : [];

            if (searchFields.isMasterOnly) {
                list = list.filter(p => p.isMaster === true || p.isMaster === 'true' || p.isMaster === 1);
            }
            setResults(list);
        } catch (error) {
            alert("검색에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSearchFields(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    // 품목의 포장방법 사진 미리보기 로드
    const handleLoadPackagingImages = async (prod) => {
        setPreviewProduct(prod);
        setPreviewLoading(true);
        setPreviewImages([]);
        try {
            // 1. 해당 제품의 사양서 목록 조회
            const specRes = await getPackagingSpecs(prod.id);
            const specs = Array.isArray(specRes.data) ? specRes.data : [];
            if (specs.length > 0) {
                // 최신 사양서 ID 추출
                const latestSpec = specs.reduce((max, s) => (s.version > (max.version || 0) ? s : max), specs[0]);
                if (latestSpec && latestSpec.id) {
                    const imgRes = await getPackagingMethodImages(latestSpec.id);
                    const imgList = Array.isArray(imgRes.data) ? imgRes.data : (imgRes.data?.data || []);
                    setPreviewImages(imgList);
                }
            }
        } catch (err) {
            console.error("Failed to load packaging images for preview:", err);
        } finally {
            setPreviewLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="drawer-overlay" style={{ zIndex: 3500 }}>
            <div 
                className="modal-content" 
                style={{ 
                    width: previewProduct ? '1380px' : '1100px', 
                    maxWidth: '98vw', 
                    height: '88vh', 
                    minHeight: '620px', 
                    maxHeight: '92vh', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'width 0.25s ease'
                }} 
                onClick={e => e.stopPropagation()}
            >
                {/* 1. Modal Header */}
                <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                            {title} {searchFields.isMasterOnly && <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold' }}>(👑 마스터 전용 모드)</span>}
                        </h3>
                    </div>
                    <button type="button" onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Modal Body */}
                <div className="modal-body" style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {/* Search Form Card */}
                    <div role="search" style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>품목 코드</label>
                                <input 
                                    type="text" 
                                    name="itemCode" 
                                    value={searchFields.itemCode} 
                                    onChange={handleFieldChange} 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleSearch();
                                        }
                                    }}
                                    placeholder="예: 000000000000" 
                                    style={{ fontSize: '13px' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>제품명 (국문)</label>
                                <input 
                                    type="text" 
                                    name="productName" 
                                    value={searchFields.productName} 
                                    onChange={handleFieldChange} 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleSearch();
                                        }
                                    }}
                                    placeholder="제품명 검색" 
                                    style={{ fontSize: '13px' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>제품명 (영문)</label>
                                <input 
                                    type="text" 
                                    name="englishProductName" 
                                    value={searchFields.englishProductName} 
                                    onChange={handleFieldChange} 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleSearch();
                                        }
                                    }}
                                    placeholder="English name" 
                                    style={{ fontSize: '13px' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>제조사</label>
                                <input 
                                    type="text" 
                                    name="manufacturer" 
                                    value={searchFields.manufacturer} 
                                    onChange={handleFieldChange} 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleSearch();
                                        }
                                    }}
                                    placeholder="제조사명" 
                                    style={{ fontSize: '13px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#1e293b', fontWeight: '600', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        name="isMasterOnly" 
                                        checked={searchFields.isMasterOnly} 
                                        onChange={handleFieldChange} 
                                    />
                                    👑 마스터 상품만 조회
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setSearchFields({ itemCode: '', productName: '', englishProductName: '', manufacturer: '', ingredients: '', isMasterOnly: false })}
                                    className="secondary" 
                                    style={{ padding: '6px 14px', fontSize: '13px' }}
                                >
                                    초기화
                                </button>
                                <button 
                                    type="button" 
                                    onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSearch();
                                    }} 
                                    className="primary" 
                                    style={{ padding: '6px 20px', fontSize: '13px', fontWeight: 'bold' }}
                                >
                                    🔍 검색 수행
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content Area (Search Table + Live Image Preview Split View) */}
                    <div style={{ flex: 1, display: 'flex', gap: '15px', minHeight: 0 }}>
                        {/* Table Area */}
                        <div style={{ flex: previewProduct ? 6 : 10, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: '#64748b' }}>
                                    <div className="spinner" style={{ marginRight: '8px' }}></div> 검색 중입니다...
                                </div>
                            ) : results.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, color: '#94a3b8' }}>
                                    <span style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</span>
                                    <span>조건을 입력하고 검색을 수행해주세요.</span>
                                </div>
                            ) : (
                                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                                            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                                                <th style={{ padding: '10px 12px', width: '110px' }}>품목코드</th>
                                                <th style={{ padding: '10px 12px', width: '80px' }}>구분</th>
                                                <th style={{ padding: '10px 12px' }}>제품명</th>
                                                <th style={{ padding: '10px 12px' }}>제조사</th>
                                                <th style={{ padding: '10px 12px', width: '160px', textAlign: 'center' }}>동작</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map(p => {
                                                const isMasterItem = p.isMaster === true || p.isMaster === 'true' || p.isMaster === 1;
                                                const isSelectedForPreview = previewProduct && previewProduct.id === p.id;
                                                return (
                                                    <tr 
                                                        key={p.id}
                                                        onDoubleClick={() => handleItemSelect(p)}
                                                        onClick={() => handleLoadPackagingImages(p)}
                                                        style={{ 
                                                            borderBottom: '1px solid #f1f5f9', 
                                                            cursor: 'pointer', 
                                                            transition: 'background 0.2s', 
                                                            background: isSelectedForPreview ? '#eff6ff' : (isMasterItem ? '#f0fdf4' : 'white') 
                                                        }}
                                                        className="search-result-row"
                                                    >
                                                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#1e293b' }}>{p.itemCode}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            {isMasterItem ? (
                                                                <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                                                                    👑 마스터
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>일반</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', fontWeight: '500' }}>
                                                            <div style={{ color: '#0f172a' }}>{p.productName}</div>
                                                            {p.englishProductName && <div style={{ fontSize: '11.5px', color: '#64748b' }}>{p.englishProductName}</div>}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', color: '#475569', fontSize: '12px' }}>
                                                            {p.manufacturerName || (p.manufacturerInfo ? p.manufacturerInfo.name : '-')}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleLoadPackagingImages(p);
                                                                    }}
                                                                    style={{ 
                                                                        padding: '4px 8px', 
                                                                        fontSize: '11.5px', 
                                                                        borderRadius: '5px', 
                                                                        background: '#f0f9ff', 
                                                                        border: '1px solid #7dd3fc', 
                                                                        color: '#0284c7', 
                                                                        cursor: 'pointer',
                                                                        fontWeight: '600'
                                                                    }}
                                                                    title="포장방법 사진 미리보기"
                                                                >
                                                                    📸 사진보기
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleItemSelect(p);
                                                                    }}
                                                                    className="primary"
                                                                    style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '5px', fontWeight: '600' }}
                                                                >
                                                                    선택
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Packaging Method Images Preview Panel */}
                        {previewProduct && (
                            <div style={{ 
                                flex: 4, 
                                border: '1px solid #cbd5e1', 
                                borderRadius: '8px', 
                                background: '#f8fafc', 
                                padding: '14px', 
                                display: 'flex', 
                                flexDirection: 'column',
                                minHeight: 0
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                    <div>
                                        <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 'bold' }}>[{previewProduct.itemCode}]</span>
                                        <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {previewProduct.productName}
                                        </strong>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setPreviewProduct(null)} 
                                        style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px' }}>
                                    {previewLoading ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '140px', color: '#64748b', fontSize: '12px' }}>
                                            <div className="spinner" style={{ marginRight: '6px' }}></div> 사진 로딩 중...
                                        </div>
                                    ) : previewImages.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '12px' }}>
                                            📷 등록된 포장방법 사진이 없습니다.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                            {previewImages.map((img, idx) => {
                                                const imgUrl = img.imageUrl?.startsWith('blob:') || img.imageUrl?.startsWith('http') 
                                                    ? img.imageUrl 
                                                    : (getBaseURL ? `${getBaseURL()}${img.imageUrl?.startsWith('/') ? '' : '/'}${img.imageUrl}` : img.imageUrl);
                                                return (
                                                    <div key={img.id || idx} style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', background: '#fff', textAlign: 'center' }}>
                                                        <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', overflow: 'hidden' }}>
                                                            <img 
                                                                src={imgUrl} 
                                                                alt={`Step ${idx + 1}`} 
                                                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                                                            />
                                                        </div>
                                                        <div style={{ padding: '3px 6px', fontSize: '11px', background: '#f8fafc', color: '#475569', fontWeight: 'bold', borderTop: '1px solid #f1f5f9' }}>
                                                            Step {img.stepOrder || idx + 1}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleItemSelect(previewProduct)}
                                    disabled={previewImages.length === 0}
                                    style={{ 
                                        width: '100%', 
                                        padding: '9px', 
                                        fontSize: '12.5px', 
                                        fontWeight: 'bold', 
                                        background: previewImages.length > 0 ? '#10b981' : '#cbd5e1', 
                                        color: '#fff', 
                                        border: 'none', 
                                        borderRadius: '6px', 
                                        cursor: previewImages.length > 0 ? 'pointer' : 'not-allowed',
                                        boxShadow: previewImages.length > 0 ? '0 2px 4px rgba(16,185,129,0.2)' : 'none'
                                    }}
                                >
                                    📥 이 제품의 포장사진 ({previewImages.length}장) 복사하기
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Modal Footer */}
                <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0' }}>
                    <div className="footer-left">
                        <span style={{ fontSize: '13px', color: '#475569' }}>
                            검색 결과: <strong style={{ color: '#003366' }}>{results.length}</strong> 건
                        </span>
                    </div>
                    <div className="footer-actions">
                        <button type="button" onClick={onClose} className="secondary" style={{ minWidth: '80px' }}>닫기</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductSearchPopup;
