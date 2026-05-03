import React, { useState } from 'react';
import { searchProducts } from './api';

const ProductSearchPopup = ({ onClose, onSelect }) => {
    const [searchFields, setSearchFields] = useState({
        itemCode: '',
        productName: '',
        englishProductName: '',
        manufacturer: '',
        ingredients: ''
    });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();

        // At least one field should be filled
        if (!Object.values(searchFields).some(val => val.trim())) {
            alert("검색 조건을 하나 이상 입력해 주세요.");
            return;
        }

        setLoading(true);
        try {
            const res = await searchProducts(searchFields);
            const data = res.data.content !== undefined ? res.data.content : res.data;
            setResults(Array.isArray(data) ? data : []);
        } catch (error) {
            alert("검색에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        setSearchFields(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="drawer-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
            <div className="modal-content" style={{ width: '1000px' }} onClick={e => e.stopPropagation()}>
                {/* 1. Modal Header */}
                <div className="modal-header">
                    <h3>🔍 품목 상세 검색</h3>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Modal Body (Scrollable) */}
                <div className="modal-body white-bg">
                    {/* Search Form Card */}
                    <div className="card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
                        <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'flex-end' }}>
                            {/* ... (fields remain same but labels slightly adjusted in CSS if needed) ... */}
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
                            <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#444' }}>전성분</label>
                                <input name="ingredients" value={searchFields.ingredients} onChange={handleFieldChange} placeholder="성분 키워드 검색" />
                            </div>
                            <div style={{ display: 'flex' }}>
                                <button type="submit" className="primary" style={{ flex: 1, padding: '10px', height: '42px', fontWeight: '800' }}>🔍 검색 수행</button>
                            </div>
                        </form>
                    </div>

                    {loading && (
                        <div style={{ textAlign: 'center', padding: '30px' }}>
                            <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
                            <p style={{ color: '#718096', fontSize: '14px' }}>품목 정보를 불러오는 중입니다...</p>
                        </div>
                    )}

                    {!loading && (
                        <div className="results-list">
                            {results.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 0', color: '#a0aec0', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                                    <p style={{ fontSize: '16px', margin: 0 }}>📭 검색 결과가 없습니다.</p>
                                    <p style={{ fontSize: '12px', marginTop: '8px' }}>다른 검색어를 입력하거나 필터를 확인해 주세요.</p>
                                </div>
                            ) : (
                                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #4a90e2' }}>
                                                <th style={{ padding: '12px 15px', textAlign: 'left', color: '#475569', fontWeight: '800' }}>품목코드</th>
                                                <th style={{ padding: '12px 15px', textAlign: 'left', color: '#475569', fontWeight: '800' }}>제품명(한글)</th>
                                                <th style={{ padding: '12px 15px', textAlign: 'left', color: '#475569', fontWeight: '800' }}>제품명(영문)</th>
                                                <th style={{ padding: '12px 15px', textAlign: 'left', color: '#475569', fontWeight: '800' }}>제조사</th>
                                                <th style={{ padding: '12px 15px', textAlign: 'center', color: '#475569', fontWeight: '800' }}>선택</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map(p => (
                                                <tr 
                                                    key={p.id}
                                                    onDoubleClick={() => onSelect(p)}
                                                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                                                    className="search-result-row"
                                                >
                                                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: '600' }}>{p.itemCode}</td>
                                                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9' }}>{p.productName}</td>
                                                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', color: '#718096', fontSize: '12px' }}>{p.englishProductName || '-'}</td>
                                                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9' }}>{p.manufacturerName || '정보 없음'}</td>
                                                    <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelect(p);
                                                            }}
                                                            className="secondary"
                                                            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}
                                                        >
                                                            선택
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Modal Footer */}
                <div className="modal-footer">
                    <span style={{ fontSize: '13px' }}>검색 결과: <strong>{results.length}</strong> 건</span>
                    <button onClick={onClose} className="secondary">취소</button>
                </div>
            </div>
        </div>
    );
};

export default ProductSearchPopup;
