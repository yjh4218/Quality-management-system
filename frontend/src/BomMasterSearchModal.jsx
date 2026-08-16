import React, { useState, useEffect } from 'react';
import * as api from './api';
import { toast } from 'react-toastify';

const BomMasterSearchModal = ({ onClose, onSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState(null);

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const res = await api.getMasterMaterials();
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || (Array.isArray(res) ? res : []));
            setMaterials(list);
        } catch (error) {
            toast.error("BOM 마스터 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const filteredMaterials = materials.filter(m => 
        (m.bomCode && m.bomCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.componentName && m.componentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.type && m.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.detailedType && m.detailedType.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.manufacturer && m.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="drawer-overlay" style={{ zIndex: 3001 }}>
            <div className="modal-content" style={{ width: '960px' }} onClick={e => e.stopPropagation()}>
                {/* 1. Modal Header */}
                <div className="modal-header">
                    <h3>🔍 BOM 마스터 부자재 검색</h3>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Modal Body */}
                <div className="modal-body white-bg">
                    <div className="form-group" style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <label style={{ fontSize: '13px', fontWeight: '800', color: '#444', marginBottom: '8px', display: 'block' }}>🔍 BOM 코드, 부자재명, 유형, 세부유형, 제조사 검색</label>
                        <input 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            placeholder="검색어를 입력하여 실시간 필터링하세요..." 
                            autoFocus
                            style={{ padding: '10px 14px', fontSize: '14px' }}
                        />
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', maxHeight: '450px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #3182ce', position: 'sticky', top: 0, zIndex: 1 }}>
                                    <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: '800', width: '60px' }}>사진</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: '800', width: '130px' }}>BOM 코드</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: '800', width: '140px' }}>유형 / 세부유형</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: '800' }}>부자재(구성품)명</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: '800', width: '140px' }}>규격 / 중량</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: '800', width: '150px' }}>재질 / 제조사</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#475569', fontWeight: '800', width: '80px' }}>선택</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '40px', textAlign: 'center' }}>
                                            <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
                                            <p style={{ color: '#718096' }}>BOM 마스터를 불러오는 중...</p>
                                        </td>
                                    </tr>
                                ) : filteredMaterials.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '60px', textAlign: 'center' }}>
                                            <div style={{ color: '#a0aec0' }}>
                                                <p style={{ fontSize: '16px', margin: 0 }}>📭 결과가 없습니다.</p>
                                                <p style={{ fontSize: '13px', marginTop: '6px' }}>입력하신 검색어와 일치하는 BOM 구성품이 없습니다.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMaterials.map(m => (
                                        <tr key={m.id} style={{ transition: 'background 0.2s', borderBottom: '1px solid #f1f5f9' }} className="search-result-row">
                                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                {m.imagePath ? (
                                                    <img 
                                                        src={m.imagePath} 
                                                        alt="패키지 사진" 
                                                        style={{ 
                                                            width: '38px', 
                                                            height: '38px', 
                                                            objectFit: 'contain', 
                                                            borderRadius: '6px', 
                                                            border: '1px solid #e2e8f0',
                                                            background: '#fff',
                                                            cursor: 'pointer' 
                                                        }}
                                                        title="클릭 시 확대 미리보기"
                                                        onClick={() => setPreviewPhoto({ url: m.imagePath, title: `${m.bomCode} - ${m.componentName}` })}
                                                    />
                                                ) : (
                                                    <span style={{ fontSize: '16px', opacity: 0.35 }} title="사진 미등록">📦</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '10px 12px', fontWeight: '700', color: '#2563eb' }}>{m.bomCode || '-'}</td>
                                            <td style={{ padding: '10px 12px', color: '#475569' }}>
                                                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                                    {m.type || '-'}
                                                </span>
                                                {m.detailedType && <div style={{ marginTop: '2px', fontSize: '11px', color: '#64748b' }}>{m.detailedType}</div>}
                                            </td>
                                            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#1e293b' }}>{m.componentName}</td>
                                            <td style={{ padding: '10px 12px', color: '#64748b' }}>
                                                <div>{m.specification || '-'}</div>
                                                {m.weight != null && <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600' }}>{m.weight}g</div>}
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <div style={{ fontSize: '12px', color: '#718096' }}>
                                                    {m.isMultiLayer ? m.layers?.map(l => l.materialName).join('+') : (m.detailedMaterial || m.material || '-')}
                                                </div>
                                                <div style={{ fontWeight: '500', color: '#4a5568', fontSize: '12px' }}>{m.manufacturer || '-'}</div>
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                <button 
                                                    type="button"
                                                    className="primary" 
                                                    style={{ padding: '5px 14px', fontSize: '12px', borderRadius: '6px' }}
                                                    onClick={() => {
                                                        onSelect(m);
                                                        onClose();
                                                    }}
                                                >
                                                    선택
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Modal Footer */}
                <div className="modal-footer" style={{ padding: '14px 24px', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                    <div className="footer-left">
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                            총 <strong>{filteredMaterials.length}</strong>개의 BOM 구성품이 검색되었습니다.
                        </span>
                    </div>
                    <div className="footer-actions">
                        <button type="button" onClick={onClose} className="secondary" style={{ minWidth: '80px' }}>
                            닫기
                        </button>
                    </div>
                </div>
            </div>

            {/* Photo Preview Lightbox Modal */}
            {previewPhoto && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        zIndex: 99999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                    onClick={() => setPreviewPhoto(null)}
                >
                    <div 
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '85vh',
                            background: '#fff',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            padding: '12px 18px',
                            background: '#0f172a',
                            color: '#fff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontWeight: 600, fontSize: '15px' }}>
                                📸 {previewPhoto.title || '패키지 사진 미리보기'}
                            </span>
                            <button 
                                onClick={() => setPreviewPhoto(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    padding: '0 4px'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' }}>
                            <img 
                                src={previewPhoto.url} 
                                alt={previewPhoto.title} 
                                style={{
                                    maxWidth: '80vw',
                                    maxHeight: '70vh',
                                    objectFit: 'contain',
                                    borderRadius: '6px'
                                }} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BomMasterSearchModal;
