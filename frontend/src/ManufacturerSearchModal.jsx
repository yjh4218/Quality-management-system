import React, { useState, useEffect } from 'react';
import * as api from './api';
import { toast } from 'react-toastify';

const ManufacturerSearchModal = ({ onClose, onSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [manufacturers, setManufacturers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchManufacturers();
    }, []);

    const fetchManufacturers = async () => {
        setLoading(true);
        try {
            const res = await api.getManufacturers();
            // Filter inactive ones if needed, though they already filtered by soft-delete usually
            setManufacturers(res.data.filter(m => m.active));
        } catch (error) {
            toast.error("제조사 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const filteredManufacturers = manufacturers.filter(m => 
        (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.manufacturerCode && m.manufacturerCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.identificationCode && m.identificationCode.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="drawer-overlay" onClick={onClose} style={{ zIndex: 3001 }}>
            <div className="modal-content" style={{ width: '700px' }} onClick={e => e.stopPropagation()}>
                {/* 1. Modal Header */}
                <div className="modal-header">
                    <h3>🔍 제조사 검색</h3>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Modal Body */}
                <div className="modal-body white-bg">
                    <div className="form-group" style={{ marginBottom: '25px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <label style={{ fontSize: '13px', fontWeight: '800', color: '#444', marginBottom: '10px', display: 'block' }}>🔍 제조사명 또는 코드 검색</label>
                        <input 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            placeholder="업체명, 업체코드를 입력하여 실시간 필터링하세요..." 
                            autoFocus
                            style={{ padding: '12px 15px', fontSize: '15px' }}
                        />
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #ed8936' }}>
                                    <th style={{ padding: '12px 15px', textAlign: 'left', color: '#475569', fontWeight: '800' }}>제조사 코드</th>
                                    <th style={{ padding: '12px 15px', textAlign: 'left', color: '#475569', fontWeight: '800' }}>제조사명</th>
                                    <th style={{ padding: '12px 15px', textAlign: 'left', color: '#475569', fontWeight: '800' }}>카테고리</th>
                                    <th style={{ padding: '12px 15px', textAlign: 'center', color: '#475569', fontWeight: '800' }}>선택</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}>
                                            <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
                                            <p style={{ color: '#718096' }}>제조사 목록을 불러오는 중...</p>
                                        </td>
                                    </tr>
                                ) : filteredManufacturers.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '60px', textAlign: 'center' }}>
                                            <div style={{ color: '#a0aec0' }}>
                                                <p style={{ fontSize: '18px', margin: 0 }}>📭 결과가 없습니다.</p>
                                                <p style={{ fontSize: '13px', marginTop: '8px' }}>입력하신 검색어와 일치하는 제조사가 없습니다.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredManufacturers.map(m => (
                                        <tr key={m.id} style={{ transition: 'background 0.2s' }} className="search-result-row">
                                            <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>{m.manufacturerCode || m.identificationCode || '-'}</td>
                                            <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontWeight: '700', color: '#2d3748' }}>{m.name}</td>
                                            <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9' }}>
                                                <span className="badge" style={{ background: '#ebf8ff', color: '#2b6cb0', border: '1px solid #bee3f8' }}>{m.category}</span>
                                            </td>
                                            <td style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                                                <button 
                                                    className="secondary" 
                                                    style={{ padding: '5px 15px', fontSize: '12px', borderRadius: '6px' }}
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
                <div className="modal-footer">
                    <span style={{ fontSize: '13px' }}>총 <strong>{filteredManufacturers.length}</strong>개의 제조사</span>
                    <button onClick={onClose} className="secondary">취소</button>
                </div>
            </div>
        </div>
    );
};

export default ManufacturerSearchModal;
