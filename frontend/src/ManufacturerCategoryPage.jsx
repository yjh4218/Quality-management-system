import React, { useState, useEffect } from 'react';
import { getManufacturerCategories, saveManufacturerCategory, deleteManufacturerCategory } from './api';
import { toast } from 'react-toastify';

/**
 * 제조사 구분 관리 페이지
 * [디자인 표준화] 제품코드 마스터의 40px 여백 및 표준 헤더 레이아웃을 적용했습니다.
 * [UX 개선] 입력 폼을 상단 검색바 스타일로 재구성하고, 카테고리 리스트를 고해상도 테이블로 표현하여 가시성을 확보했습니다.
 */
const ManufacturerCategoryPage = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const data = await getManufacturerCategories();
            setCategories(data);
        } catch (err) {
            toast.error('카테고리 목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newCategoryName.trim()) {
            toast.warn('카테고리 명칭을 입력해 주세요.');
            return;
        }
        try {
            await saveManufacturerCategory({ name: newCategoryName });
            setNewCategoryName('');
            toast.success('신규 카테고리가 추가되었습니다.');
            fetchCategories();
        } catch (err) {
            toast.error('카테고리 추가에 실패했습니다.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('정말 이 카테고리를 삭제하시겠습니까? (삭제 시 해당 구분은 더 이상 선택할 수 없습니다)')) return;
        try {
            await deleteManufacturerCategory(id);
            toast.success('카테고리가 성공적으로 삭제되었습니다.');
            fetchCategories();
        } catch (err) {
            toast.error('삭제 처리 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="page-container" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
            {/* 표준화된 헤더 */}
            <div className="page-header-standard" style={{ 
                marginBottom: '20px', 
                flexDirection: 'column', 
                alignItems: 'flex-start', 
                gap: '12px',
                padding: '24px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #f1f5f9'
            }}>
                {/* 1단계: 상단 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            📂 제조사 구분 관리
                        </h2>
                    </div>
                </div>

                {/* 2단계: 핵심 제어 (중단) */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    width: '100%', 
                    alignItems: 'center', 
                    padding: '12px 0', 
                    borderTop: '1px solid #f1f5f9',
                    borderBottom: '1px solid #f1f5f9'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                        시스템에서 사용하는 제조사(협력사)의 업종 및 분류 체계를 관리합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="primary" 
                            onClick={fetchCategories} 
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            🔍 조회
                        </button>
                    </div>
                </div>
            </div>

            {/* 신규 등록 섹션 (검색바 스타일 응용) */}
            <div className="search-bar-standard" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', width: '100%' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#2d3748', marginBottom: '10px' }}>✨ 신규 카테고리 등록</label>
                        <input
                            type="text"
                            placeholder="예: 화장품, 건강기능식품, 포장부자재 등"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', fontWeight: '600' }}
                            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                        />
                    </div>
                    <button
                        className="primary"
                        onClick={handleAdd}
                        style={{ padding: '0 35px', borderRadius: '12px', fontWeight: '800', height: '52px', fontSize: '15px', boxShadow: '0 4px 12px rgba(0, 51, 102, 0.2)' }}
                    >
                        구분 추가
                    </button>
                </div>
            </div>

            {/* 목록 카드 섹션 */}
            <div className="card" style={{ padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid #edf2f7', background: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: '25px 30px', background: '#f8fafc', borderBottom: '1px solid #edf2f7', fontWeight: '900', fontSize: '15px', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>현황 리스트</span>
                    <span style={{ color: 'var(--primary-color)' }}>총 {categories.length}개 항목</span>
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '100px' }}>
                        <div className="spinner-ring" style={{ margin: '0 auto' }}></div>
                        <p style={{ marginTop: '25px', color: '#94a3b8', fontWeight: '600' }}>데이터를 불러오는 중입니다...</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="qms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#ffffff', borderBottom: '2px solid #f1f5f9' }}>
                                    <th style={{ padding: '20px 30px', textAlign: 'center', width: '120px', fontSize: '14px', color: '#64748b', fontWeight: '800' }}>고유 ID</th>
                                    <th style={{ padding: '20px 30px', textAlign: 'left', fontSize: '14px', color: '#64748b', fontWeight: '800' }}>구분 명칭 (Category Name)</th>
                                    <th style={{ padding: '20px 30px', textAlign: 'center', width: '150px', fontSize: '14px', color: '#64748b', fontWeight: '800' }}>액션</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((cat, index) => (
                                    <tr key={cat.id} style={{ borderBottom: index === categories.length - 1 ? 'none' : '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '20px 30px', textAlign: 'center', color: '#cbd5e0', fontSize: '14px', fontWeight: '800' }}>
                                            <span style={{ background: '#f8fafc', padding: '4px 10px', borderRadius: '6px' }}>#{cat.id}</span>
                                        </td>
                                        <td style={{ padding: '20px 30px', textAlign: 'left', color: '#1a202c', fontSize: '16px', fontWeight: '800' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)', opacity: 0.3 }}></div>
                                                {cat.name}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 30px', textAlign: 'center' }}>
                                            <button
                                                className="secondary"
                                                style={{
                                                    color: '#e53e3e',
                                                    background: '#fff5f5',
                                                    border: 'none',
                                                    padding: '8px 20px',
                                                    borderRadius: '10px',
                                                    fontSize: '13px',
                                                    fontWeight: '800',
                                                    transition: 'all 0.2s'
                                                }}
                                                onClick={() => handleDelete(cat.id)}
                                            >
                                                삭제하기
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {categories.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '120px 20px', textAlign: 'center', color: '#cbd5e0' }}>
                                            <div style={{ fontSize: '72px', marginBottom: '25px' }}>📂</div>
                                            <h3 style={{ color: '#94a3b8' }}>등록된 제조사 구분이 없습니다.</h3>
                                            <p style={{ marginTop: '10px' }}>상단의 입력 폼을 통해 새로운 업종 구분을 등록해 주세요.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManufacturerCategoryPage;
