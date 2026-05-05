import { useState, useEffect } from 'react';
import { getBrands, createBrand, deleteBrand } from './api';
import { usePermissions } from './usePermissions';
import { toast } from 'react-toastify';

/**
 * 브랜드 마스터 관리 페이지
 * [디자인 표준화] 제품코드 마스터의 40px 여백 및 표준 헤더 레이아웃을 적용했습니다.
 * [UX 개선] 입력 폼과 리스트의 시각적 분리를 명확히 하고, 프리미엄 카드 디자인을 적용하여 소규모 마스터 데이터의 관리 편의성을 높였습니다.
 */
const BrandManagementPage = ({ user }) => {
    const [brands, setBrands] = useState([]);
    const [newName, setNewName] = useState('');

    const { canEdit: checkEdit, canDelete: checkDelete } = usePermissions(user);
    const canEdit = checkEdit('brands');
    const canDelete = checkDelete('brands');

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        try {
            const res = await getBrands();
            setBrands(res.data);
        } catch (error) {
            toast.error("브랜드 목록 로딩 실패");
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName.trim()) {
            toast.warn("브랜드명을 입력해 주세요.");
            return;
        }
        try {
            await createBrand({ name: newName });
            setNewName('');
            toast.success("신규 브랜드가 등록되었습니다.");
            fetchBrands();
        } catch (error) {
            toast.error("등록 실패: 이미 존재하는 브랜드명이거나 서버 오류입니다.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("정말로 이 브랜드를 삭제하시겠습니까? 관련 제품이 있을 경우 삭제가 불가능할 수 있습니다.")) return;
        try {
            await deleteBrand(id);
            toast.success("브랜드가 삭제되었습니다.");
            fetchBrands();
        } catch (error) {
            toast.error("삭제 실패: 사용 중인 데이터가 존재할 수 있습니다.");
        }
    };

    return (
        <div className="page-container">
            {/* 표준화된 헤더 */}
            <div className="page-header-standard">
                <div className="header-title">
                    <h2>🏷️ 브랜드 마스터 관리</h2>
                    <p>시스템 내 제품 분류의 최상위 카테고리인 브랜드 정보를 관리합니다.</p>
                </div>
            </div>

            {/* 브랜드 등록 폼 (표준 검색바 스타일 응용) */}
            <div className="search-bar-standard" style={{ marginBottom: '40px' }}>
                <form onSubmit={handleAdd} style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', width: '100%' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#2d3748', marginBottom: '10px' }}>✨ 신규 브랜드 등록</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder={canEdit ? "등록할 브랜드 명칭을 입력하세요 (예: 리쥬란)" : "브랜드 등록 권한이 없습니다."}
                            style={{ padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', fontWeight: '600' }}
                            disabled={!canEdit}
                        />
                    </div>
                    <button
                        type="submit"
                        className="primary"
                        style={{ padding: '0 35px', borderRadius: '12px', fontWeight: '800', height: '52px', fontSize: '15px', boxShadow: '0 4px 12px rgba(0, 51, 102, 0.2)', opacity: canEdit ? 1 : 0.5 }}
                        disabled={!canEdit}
                    >
                        브랜드 추가
                    </button>
                </form>
            </div>

            {/* 브랜드 목록 카드 */}
            <div className="card" style={{ padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid #edf2f7', background: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: '25px 30px', background: '#f8fafc', borderBottom: '1px solid #edf2f7', fontWeight: '900', fontSize: '15px', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>현황 리스트</span>
                    <span style={{ color: 'var(--primary-color)' }}>총 {brands.length}개</span>
                </div>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    {brands.map((b, index) => (
                        <div key={b.id} style={{
                            padding: '20px 30px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: index === brands.length - 1 ? 'none' : '1px solid #f1f5f9',
                            transition: 'background 0.2s'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <span style={{ color: '#cbd5e0', fontSize: '13px', fontWeight: '800', width: '30px' }}>{String(index + 1).padStart(2, '0')}</span>
                                <div style={{ width: '40px', height: '40px', background: '#ebf4ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔖</div>
                                <span style={{ fontWeight: '800', color: '#1a202c', fontSize: '17px' }}>{b.name}</span>
                            </div>
                            <button
                                onClick={() => handleDelete(b.id)}
                                className="secondary"
                                style={{
                                    padding: '8px 20px',
                                    fontSize: '13px',
                                    borderRadius: '10px',
                                    color: '#e53e3e',
                                    background: '#fff5f5',
                                    border: 'none',
                                    fontWeight: '800',
                                    opacity: canDelete ? 1 : 0.5,
                                    cursor: canDelete ? 'pointer' : 'not-allowed'
                                }}
                                disabled={!canDelete}
                            >
                                삭제하기
                            </button>
                        </div>
                    ))}
                    {brands.length === 0 && (
                        <div style={{ padding: '100px 20px', textAlign: 'center', color: '#cbd5e0' }}>
                            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏷️</div>
                            <h3 style={{ justifyContent: 'center' }}>등록된 브랜드가 없습니다.</h3>
                            <p style={{ marginTop: '10px' }}>상단의 폼을 통해 새로운 브랜드를 시스템에 등록해 주세요.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrandManagementPage;
