import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as api from './api';
import { toast } from 'react-toastify';
import { matchesAllTokens } from './utils/searchUtils';

const ManufacturerSearchModal = ({ onClose, onSelect }) => {
    const [manufacturers, setManufacturers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    // 검색 필터 상태 (입력용)
    const [filters, setFilters] = useState({
        name: '',
        code: '',
        category: '',
        managerName: ''
    });

    // 실제 적용된 검색 필터 상태
    const [appliedFilters, setAppliedFilters] = useState({
        name: '',
        code: '',
        category: '',
        managerName: ''
    });

    useEffect(() => {
        fetchManufacturers();
        fetchCategories();
    }, []);

    const fetchManufacturers = async () => {
        setLoading(true);
        try {
            const res = await api.getManufacturers();
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setManufacturers(list.filter(m => m.active !== false && !m.isDeleted));
        } catch (error) {
            toast.error("제조사 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await api.getManufacturerCategories();
            const list = Array.isArray(res) ? res : (res.data || []);
            setCategories(list);
        } catch (e) {
            // Non-blocking fallback
        }
    };

    const handleInputChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        setAppliedFilters({ ...filters });
    };

    const handleReset = () => {
        const empty = { name: '', code: '', category: '', managerName: '' };
        setFilters(empty);
        setAppliedFilters(empty);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch(e);
        }
    };

    // 적용된 필터 개수
    const activeFilterCount = useMemo(() => {
        return Object.values(appliedFilters).filter(v => typeof v === 'string' && v.trim().length > 0).length;
    }, [appliedFilters]);

    // 동적 카테고리 옵션 (DB 마스터 + 제조사 목록 기반)
    const categoryOptions = useMemo(() => {
        const set = new Set();
        categories.forEach(c => {
            if (c.name) set.add(c.name);
            if (c.categoryName) set.add(c.categoryName);
        });
        manufacturers.forEach(m => {
            if (m.category) set.add(m.category);
        });
        return Array.from(set).filter(Boolean);
    }, [categories, manufacturers]);

    // 필터링 적용
    const filteredManufacturers = useMemo(() => {
        return manufacturers.filter(m => {
            const mCode = `${m.manufacturerCode || ''} ${m.identificationCode || ''}`;
            const mManager = `${m.managerName || ''} ${m.representativeName || ''}`;

            if (appliedFilters.name.trim() && !matchesAllTokens(m.name, appliedFilters.name)) {
                return false;
            }
            if (appliedFilters.code.trim() && !matchesAllTokens(mCode, appliedFilters.code)) {
                return false;
            }
            if (appliedFilters.category.trim() && m.category !== appliedFilters.category) {
                return false;
            }
            if (appliedFilters.managerName.trim() && !matchesAllTokens(mManager, appliedFilters.managerName)) {
                return false;
            }
            return true;
        });
    }, [manufacturers, appliedFilters]);

    const handleSelectRow = (m) => {
        if (onSelect) onSelect(m);
        if (onClose) onClose();
    };

    return (
        <div className="drawer-overlay" style={{ zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-content" style={{ width: '820px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                {/* 1. Modal Header */}
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>🏭</span>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                            제조사 검색
                        </h3>
                        {activeFilterCount > 0 && (
                            <span style={{ backgroundColor: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>
                                {activeFilterCount}개 필터 적용됨
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="secondary close-button" style={{ padding: '6px 12px', fontSize: '13px' }}>
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Modal Body */}
                <div className="modal-body white-bg" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {/* [ui-ux-guide.md 검색 영역 규칙] 회색 배경 박스, 좌측 정렬, 최대 한 행에 3~4개, 초기화/조회 버튼 */}
                    <div style={{
                        marginBottom: '16px',
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
                            {/* 1. 제조사명 */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                                    제조사명
                                </label>
                                <input
                                    type="text"
                                    value={filters.name}
                                    onChange={e => handleInputChange('name', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="예: 코스맥스, 한국콜마"
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    autoFocus
                                />
                            </div>

                            {/* 2. 제조사 코드 */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                                    제조사 코드
                                </label>
                                <input
                                    type="text"
                                    value={filters.code}
                                    onChange={e => handleInputChange('code', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="예: M-2026, 001"
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                            </div>

                            {/* 3. 카테고리 */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                                    카테고리
                                </label>
                                <select
                                    value={filters.category}
                                    onChange={e => handleInputChange('category', e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                                >
                                    <option value="">전체 카테고리</option>
                                    {categoryOptions.map((cat, idx) => (
                                        <option key={idx} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 4. 담당자 / 대표자 */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                                    담당자 / 대표자
                                </label>
                                <input
                                    type="text"
                                    value={filters.managerName}
                                    onChange={e => handleInputChange('managerName', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="담당자명"
                                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                            </div>
                        </div>

                        {/* 검색 버튼 영역 - [초기화] 좌측, [🔍 조회] 우측 끝 */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={handleReset}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: '#fff',
                                    color: '#475569',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 초기화
                            </button>
                            <button
                                type="button"
                                onClick={handleSearch}
                                style={{
                                    padding: '7px 18px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#2563eb',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                🔍 조회
                            </button>
                        </div>
                    </div>

                    {/* 목록 테이블 */}
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 'bold', width: '120px' }}>제조사 코드</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>제조사명</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 'bold', width: '120px' }}>카테고리</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 'bold', width: '110px' }}>담당자</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#475569', fontWeight: 'bold', width: '80px' }}>선택</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>
                                            <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
                                            <p style={{ color: '#718096' }}>제조사 목록을 불러오는 중...</p>
                                        </td>
                                    </tr>
                                ) : filteredManufacturers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '50px', textAlign: 'center' }}>
                                            <div style={{ color: '#94a3b8' }}>
                                                <p style={{ fontSize: '16px', margin: 0 }}>📭 검색 결과가 없습니다.</p>
                                                <p style={{ fontSize: '12px', marginTop: '6px' }}>검색 조건을 변경하여 다시 조회해 보세요.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredManufacturers.map(m => (
                                        <tr
                                            key={m.id}
                                            style={{ transition: 'background 0.15s', cursor: 'pointer' }}
                                            onDoubleClick={() => handleSelectRow(m)}
                                            className="search-result-row hover:bg-slate-50"
                                        >
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontFamily: 'monospace' }}>
                                                {m.manufacturerCode || m.identificationCode || '-'}
                                            </td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#0f172a' }}>
                                                {m.name}
                                            </td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                                                    {m.category || '일반'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                                                {m.managerName || m.representativeName || '-'}
                                            </td>
                                            <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                                                <button 
                                                    type="button"
                                                    style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectRow(m);
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
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div>
                        <span style={{ fontSize: '13px', color: '#475569' }}>
                            검색 결과: <strong>{filteredManufacturers.length}</strong>개의 협력사 (전체: {manufacturers.length}개)
                        </span>
                    </div>
                    <div>
                        <button onClick={onClose} className="secondary" style={{ minWidth: '80px', padding: '7px 16px', borderRadius: '6px' }}>
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManufacturerSearchModal;
