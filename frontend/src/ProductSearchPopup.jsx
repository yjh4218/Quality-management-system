import React, { useState, useEffect } from 'react';
import { searchProducts } from './api';

const ProductSearchPopup = ({ onClose, onSelect, initialIsMasterOnly = false }) => {
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

    // 컴포넌트 마운트 시 initialIsMasterOnly가 true이면 자동 검색 수행
    useEffect(() => {
        if (initialIsMasterOnly) {
            fetchInitialMasterProducts();
        }
    }, [initialIsMasterOnly]);

    const fetchInitialMasterProducts = async () => {
        setLoading(true);
        try {
            const res = await searchProducts({ isMaster: true, size: 200 });
            const rawData = res.data.content !== undefined ? res.data.content : res.data;
            const list = Array.isArray(rawData) ? rawData : [];
            // 클라이언트 단에서도 2차 필터링 검증 (isMaster === true)
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
        try {
            const queryParams = {
                itemCode: searchFields.itemCode,
                productName: searchFields.productName,
                englishProductName: searchFields.englishProductName,
                manufacturer: searchFields.manufacturer,
                ingredients: searchFields.ingredients,
                isMaster: searchFields.isMasterOnly ? true : undefined,
                size: 200
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

    return (
        <div className="drawer-overlay" style={{ zIndex: 3500 }}>
            <div 
                className="modal-content" 
                style={{ 
                    width: '1250px', 
                    maxWidth: '96vw', 
                    height: '86vh', 
                    minHeight: '620px', 
                    maxHeight: '92vh', 
                    display: 'flex', 
                    flexDirection: 'column' 
                }} 
                onClick={e => e.stopPropagation()}
            >
                {/* 1. Modal Header */}
                <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                            🔍 품목 상세 검색 {searchFields.isMasterOnly && <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold' }}>(👑 마스터 전용 모드)</span>}
                        </h3>
                    </div>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Modal Body (Expandable Scrollable Area) */}
                <div className="modal-body white-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
                    {/* Search Form Card */}
                    <div className="card" style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                        <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#444' }}>품목코드</label>
                                <input name="itemCode" value={searchFields.itemCode} onChange={handleFieldChange} placeholder="코드 입력" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#444' }}>제품명(한글)</label>
                                <input name="productName" value={searchFields.productName} onChange={handleFieldChange} placeholder="국문명" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#444' }}>제품명(영문)</label>
                                <input name="englishProductName" value={searchFields.englishProductName} onChange={handleFieldChange} placeholder="영문명" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#444' }}>제조사명</label>
                                <input name="manufacturer" value={searchFields.manufacturer} onChange={handleFieldChange} placeholder="제조사명" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#444' }}>전성분</label>
                                <input name="ingredients" value={searchFields.ingredients} onChange={handleFieldChange} placeholder="성분 키워드 검색" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        name="isMasterOnly" 
                                        checked={searchFields.isMasterOnly} 
                                        onChange={handleFieldChange} 
                                    />
                                    👑 마스터 코드만 조회
                                </label>
                                <button type="submit" className="primary" style={{ padding: '8px 12px', height: '38px', fontWeight: '800' }}>🔍 검색 수행</button>
                            </div>
                        </form>
                    </div>

                    {loading && (
                        <div style={{ textAlign: 'center', padding: '50px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                            <p style={{ color: '#718096', fontSize: '14px', margin: 0 }}>품목 정보를 불러오는 중입니다...</p>
                        </div>
                    )}

                    {!loading && (
                        <div className="results-list" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {results.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 0', color: '#a0aec0', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <p style={{ fontSize: '16px', margin: 0 }}>📭 검색 결과가 없습니다.</p>
                                    <p style={{ fontSize: '12px', marginTop: '8px' }}>검색어를 입력하거나 필터를 조정 후 [🔍 검색 수행]을 눌러주세요.</p>
                                </div>
                            ) : (
                                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ overflowY: 'auto', flex: 1 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                                    <th style={{ padding: '12px 15px', textAlign: 'left', color: '#334155', fontWeight: '800', width: '150px' }}>품목코드</th>
                                                    <th style={{ padding: '12px 15px', textAlign: 'left', color: '#334155', fontWeight: '800', width: '110px' }}>마스터 여부</th>
                                                    <th style={{ padding: '12px 15px', textAlign: 'left', color: '#334155', fontWeight: '800' }}>제품명(한글)</th>
                                                    <th style={{ padding: '12px 15px', textAlign: 'left', color: '#334155', fontWeight: '800' }}>제품명(영문)</th>
                                                    <th style={{ padding: '12px 15px', textAlign: 'left', color: '#334155', fontWeight: '800', width: '160px' }}>제조사</th>
                                                    <th style={{ padding: '12px 15px', textAlign: 'center', color: '#334155', fontWeight: '800', width: '90px' }}>선택</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.map(p => {
                                                    const isMasterItem = p.isMaster === true || p.isMaster === 'true' || p.isMaster === 1;
                                                    return (
                                                        <tr 
                                                            key={p.id}
                                                            onDoubleClick={() => onSelect(p)}
                                                            style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s', background: isMasterItem ? '#f0fdf4' : 'white' }}
                                                            className="search-result-row"
                                                        >
                                                            <td style={{ padding: '11px 15px', fontWeight: '700', color: '#1e293b' }}>{p.itemCode}</td>
                                                            <td style={{ padding: '11px 15px' }}>
                                                                {isMasterItem ? (
                                                                    <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                                                        👑 마스터
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>일반품목</span>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '11px 15px', fontWeight: '500' }}>{p.productName}</td>
                                                            <td style={{ padding: '11px 15px', color: '#64748b', fontSize: '12px' }}>{p.englishProductName || '-'}</td>
                                                            <td style={{ padding: '11px 15px', color: '#475569' }}>{p.manufacturerName || (p.manufacturerInfo ? p.manufacturerInfo.name : '정보 없음')}</td>
                                                            <td style={{ padding: '11px 15px', textAlign: 'center' }}>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onSelect(p);
                                                                    }}
                                                                    className="secondary"
                                                                    style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px', fontWeight: '600' }}
                                                                >
                                                                    선택
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Modal Footer */}
                <div className="modal-footer" style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#475569' }}>
                        검색 결과: <strong style={{ color: '#2563eb' }}>{results.length}</strong> 건
                    </span>
                    <button onClick={onClose} className="secondary" style={{ padding: '6px 16px' }}>취소</button>
                </div>
            </div>
        </div>
    );
};

export default ProductSearchPopup;
