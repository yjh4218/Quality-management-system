import React, { useState, useEffect, useMemo } from 'react';
import * as api from './api';
import { toast } from 'react-toastify';
import { matchesAllTokens, matchesMultiFieldTokens } from './utils/searchUtils';

const BOM_DEFAULT_TYPES = ['용기', '캡·펌프', '단상자·라벨', '인박스·아웃박스', '부속품'];

const BomMasterSearchModal = ({ onClose, onSelect }) => {
    const [materials, setMaterials] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState(null);

    // 6대 분류 검색 상태 (BOM코드, 유형, 부자재명, 중량, 재질, 제조사)
    const [filters, setFilters] = useState({
        bomCode: '',
        type: '',
        componentName: '',
        weight: '',
        material: '',
        manufacturer: ''
    });

    useEffect(() => {
        fetchMaterials();
        fetchCategories();
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

    const fetchCategories = async () => {
        try {
            const res = await api.getActiveBomCategories();
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setCategories(list);
        } catch (error) {
            // Non-blocking
        }
    };

    const typeOptions = useMemo(() => {
        if (categories.length > 0) {
            const set = new Set(categories.map(c => c.mainType).filter(Boolean));
            BOM_DEFAULT_TYPES.forEach(t => set.add(t));
            return Array.from(set);
        }
        return BOM_DEFAULT_TYPES;
    }, [categories]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleResetFilters = () => {
        setFilters({
            bomCode: '',
            type: '',
            componentName: '',
            weight: '',
            material: '',
            manufacturer: ''
        });
    };

    // 활성화된 필터 개수 계산
    const activeFilterCount = useMemo(() => {
        return Object.values(filters).filter(v => typeof v === 'string' && v.trim().length > 0).length;
    }, [filters]);

    // 6대 분류 다중 키워드(쉼표/공백 구분 AND 조건) 상호작용 필터링
    const filteredMaterials = useMemo(() => {
        return materials.filter(m => {
            // 1. BOM 코드 (다중 키워드 AND)
            if (filters.bomCode.trim() && !matchesAllTokens(m.bomCode, filters.bomCode)) {
                return false;
            }

            // 2. 유형 (드롭다운 완전일치 or 세부유형 다중 키워드 매칭)
            if (filters.type.trim()) {
                const combinedType = `${m.type || ''} ${m.detailedType || ''}`;
                if (!matchesAllTokens(combinedType, filters.type)) {
                    return false;
                }
            }

            // 3. 부자재(구성품)명 (다중 키워드 AND - 예: "스포이드, 18")
            if (filters.componentName.trim() && !matchesAllTokens(m.componentName, filters.componentName)) {
                return false;
            }

            // 4. 중량 (다중 키워드 AND - 예: "8.5")
            if (filters.weight.trim()) {
                const weightStr = m.weight != null ? String(m.weight) : '';
                const specStr = m.specification || '';
                const combinedWeight = `${weightStr} ${weightStr}g ${specStr}`;
                if (!matchesAllTokens(combinedWeight, filters.weight)) {
                    return false;
                }
            }

            // 5. 재질 (다중 키워드 AND - 예: "PP 유리 NBR")
            if (filters.material.trim()) {
                const layersStr = m.isMultiLayer && m.layers ? m.layers.map(l => l.materialName).join(' ') : '';
                const combinedMaterial = `${m.material || ''} ${m.detailedMaterial || ''} ${layersStr}`;
                if (!matchesAllTokens(combinedMaterial, filters.material)) {
                    return false;
                }
            }

            // 6. 제조사 (다중 키워드 AND - 예: "진코스텍")
            if (filters.manufacturer.trim() && !matchesAllTokens(m.manufacturer, filters.manufacturer)) {
                return false;
            }

            return true;
        });
    }, [materials, filters]);

    return (
        <div className="drawer-overlay" style={{ zIndex: 3001 }}>
            <div className="modal-content" style={{ width: '1040px', maxWidth: '96vw' }} onClick={e => e.stopPropagation()}>
                {/* 1. Modal Header */}
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>🔍</span>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                            BOM 마스터 부자재 분류 검색
                        </h3>
                        {activeFilterCount > 0 && (
                            <span style={{ background: '#3b82f6', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                                {activeFilterCount}개 항목 필터 적용 중
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="secondary close-button" style={{ padding: '6px 12px', fontSize: '13px' }}>
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Modal Body */}
                <div className="modal-body white-bg" style={{ padding: '20px 24px' }}>
                    {/* 6대 항목 분류 상호작용 필터 바 */}
                    <div style={{
                        marginBottom: '18px',
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '14px' }}>🏷️</span>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>
                                    검색 항목별 세부 분류 (쉼표[,] 또는 띄어쓰기로 다중 단어 동시 검색)
                                </span>
                                {activeFilterCount > 0 && (
                                    <span style={{ fontSize: '11px', background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                                        {activeFilterCount}개 필터 적용 중
                                    </span>
                                )}
                            </div>
                            {activeFilterCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    style={{
                                        background: '#fff',
                                        border: '1px solid #cbd5e1',
                                        color: '#64748b',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                    title="모든 검색 필터 초기화"
                                >
                                    <span>🔄</span> 필터 초기화
                                </button>
                            )}
                        </div>

                        {/* 6개 항목 3열 x 2행 반응형 그리드 */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '12px'
                        }}>
                            {/* 1. BOM 코드 */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                                    1. BOM 코드
                                </label>
                                <input
                                    type="text"
                                    value={filters.bomCode}
                                    onChange={e => handleFilterChange('bomCode', e.target.value)}
                                    placeholder="예: MAT-CAP, 0002"
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                            </div>

                            {/* 2. 유형 */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                                    2. 부자재 유형
                                </label>
                                <select
                                    value={filters.type}
                                    onChange={e => handleFilterChange('type', e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                                >
                                    <option value="">전체 유형</option>
                                    {typeOptions.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. 부자재(구성품)명 */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                                    3. 부자재(구성품)명
                                </label>
                                <input
                                    type="text"
                                    value={filters.componentName}
                                    onChange={e => handleFilterChange('componentName', e.target.value)}
                                    placeholder="예: 스포이드, 18"
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                            </div>

                            {/* 4. 중량 */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                                    4. 중량 / 규격
                                </label>
                                <input
                                    type="text"
                                    value={filters.weight}
                                    onChange={e => handleFilterChange('weight', e.target.value)}
                                    placeholder="예: 8.5, 30ml"
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                            </div>

                            {/* 5. 재질 */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                                    5. 재질
                                </label>
                                <input
                                    type="text"
                                    value={filters.material}
                                    onChange={e => handleFilterChange('material', e.target.value)}
                                    placeholder="예: PP, 유리, NBR"
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                            </div>

                            {/* 6. 제조사 */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                                    6. 제조사
                                </label>
                                <input
                                    type="text"
                                    value={filters.manufacturer}
                                    onChange={e => handleFilterChange('manufacturer', e.target.value)}
                                    placeholder="예: 진코스텍, 신우"
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 부자재 결과 목록 테이블 */}
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', maxHeight: '420px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #3b82f6', position: 'sticky', top: 0, zIndex: 1 }}>
                                    <th style={{ padding: '10px 8px', textAlign: 'center', color: '#475569', fontWeight: '800', width: '60px' }}>사진</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: '800', width: '130px' }}>BOM 코드</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: '800', width: '140px' }}>유형 / 세부유형</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: '800' }}>부자재(구성품)명</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: '800', width: '130px' }}>규격 / 중량</th>
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
                                                <p style={{ fontSize: '16px', margin: 0 }}>📭 일치하는 BOM 부자재가 없습니다.</p>
                                                <p style={{ fontSize: '13px', marginTop: '6px' }}>검색 조건(BOM코드, 유형, 부자재명, 중량, 재질, 제조사)을 변경해 보세요.</p>
                                                {activeFilterCount > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleResetFilters}
                                                        style={{
                                                            marginTop: '10px',
                                                            background: '#f1f5f9',
                                                            border: '1px solid #cbd5e1',
                                                            color: '#334155',
                                                            padding: '6px 14px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        필터 전체 초기화
                                                    </button>
                                                )}
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
                <div className="modal-footer" style={{ padding: '14px 24px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="footer-left">
                        <span style={{ fontSize: '13px', color: '#475569' }}>
                            검색 결과: <strong>{filteredMaterials.length}</strong> / 전체 {materials.length}개 BOM 구성품
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
