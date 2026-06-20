import { useState, useEffect } from 'react';
import { getBrands, createBrand, deleteBrand } from './api';
import { usePermissions } from './usePermissions';
import { toast } from 'react-toastify';

/**
 * 브랜드 마스터 관리 페이지
 * [디자인 표준화] 제품코드 마스터의 40px 여백 및 표준 헤더 레이아웃을 적용했습니다.
 * [UX 개선] 입력 폼과 리스트의 시각적 분리를 명확히 하고, 프리미엄 카드 디자인을 적용하여 소규모 마스터 데이터의 관리 편의성을 높였습니다.
 */
const BrandManagementPage = ({ user, onNavigate }) => {
    const [brands, setBrands] = useState([]);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('기타');

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
            await createBrand({ name: newName, type: newType });
            setNewName('');
            setNewType('기타');
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

    const handleBrandClick = (brandName) => {
        if (onNavigate) {
            onNavigate('products', { brandName });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch (e) {
            return '-';
        }
    };

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9' }}>
            
            {/* 3단계 표준 헤더 레이아웃 */}
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
                {/* 1단계: 생성 및 연동 (최상단) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            🏷️ 브랜드 마스터 관리
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                value={newType}
                                onChange={e => setNewType(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: '#fff' }}
                                disabled={!canEdit}
                            >
                                <option value="스킨케어">🧴 스킨케어</option>
                                <option value="메이크업">💄 메이크업</option>
                                <option value="바디케어">🛁 바디케어</option>
                                <option value="헤어케어">💇 헤어케어</option>
                                <option value="이너뷰티">💊 이너뷰티</option>
                                <option value="기타">📦 기타</option>
                            </select>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="신규 브랜드명..."
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', width: '200px' }}
                                disabled={!canEdit}
                            />
                            <button 
                                type="submit"
                                className="primary" 
                                style={{ 
                                    padding: '8px 16px', 
                                    borderRadius: '8px', 
                                    fontWeight: '800', 
                                    backgroundColor: '#2563eb',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: canEdit ? 'pointer' : 'not-allowed',
                                    opacity: canEdit ? 1 : 0.5
                                }} 
                                disabled={!canEdit}
                            >
                                ➕ 브랜드 등록
                            </button>
                        </form>
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
                        시스템 내 제품 분류의 최상위 카테고리인 브랜드 정보를 관리합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="outline" 
                            onClick={() => alert("브랜드 목록 엑셀 다운로드 기능 준비 중입니다.")}
                            style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                        >
                            📊 결과 다운로드
                        </button>
                        <button 
                            className="primary" 
                            onClick={fetchBrands} 
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            🔍 조회
                        </button>
                        <button 
                            className="outline" 
                            onClick={() => { setNewName(''); setNewType('기타'); }} 
                            style={{ padding: '10px 16px', fontSize: '14px' }}
                        >
                            ♻️ 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 브랜드 목록 카드 */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', flex: 1, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ marginBottom: '15px', fontWeight: '800', fontSize: '14px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>현황 리스트</span>
                    <span style={{ color: '#2563eb' }}>총 {brands.length}개 건</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '800', fontSize: '14px' }}>
                                <th style={{ padding: '12px 16px', width: '80px' }}>No</th>
                                <th style={{ padding: '12px 16px' }}>브랜드명</th>
                                <th style={{ padding: '12px 16px', width: '150px' }}>브랜드 유형</th>
                                <th style={{ padding: '12px 16px', width: '150px' }}>등록일자</th>
                                <th style={{ padding: '12px 16px', width: '150px' }}>등록 제품 수</th>
                                <th style={{ padding: '12px 16px', width: '100px', textAlign: 'center' }}>작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brands.map((b, index) => (
                                <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', verticalAlign: 'middle', transition: 'background-color 0.2s' }}>
                                    <td style={{ padding: '16px', color: '#94a3b8', fontWeight: '800' }}>
                                        {String(index + 1).padStart(2, '0')}
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: '800', color: '#1e293b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>🔖</span>
                                            <span>{b.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', color: '#475569' }}>
                                        <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '600' }}>
                                            {b.type || '기타'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', color: '#64748b' }}>
                                        {formatDate(b.createdAt)}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <button
                                            onClick={() => handleBrandClick(b.name)}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                border: 'none',
                                                backgroundColor: b.productCount > 0 ? '#eff6ff' : '#f1f5f9',
                                                color: b.productCount > 0 ? '#2563eb' : '#64748b',
                                                fontWeight: '800',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                            title="해당 브랜드 제품 필터링 조회"
                                        >
                                            📦 {b.productCount || 0} 개 건
                                        </button>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleDelete(b.id)}
                                            className="secondary"
                                            style={{
                                                padding: '6px 16px',
                                                fontSize: '12px',
                                                borderRadius: '8px',
                                                color: '#ef4444',
                                                background: '#fef2f2',
                                                border: '1px solid #fee2e2',
                                                fontWeight: '800',
                                                opacity: canDelete ? 1 : 0.5,
                                                cursor: canDelete ? 'pointer' : 'not-allowed'
                                            }}
                                            disabled={!canDelete}
                                        >
                                            삭제
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {brands.length === 0 && (
                        <div style={{ padding: '100px 20px', textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏷️</div>
                            <h3 style={{ fontWeight: '800' }}>등록된 브랜드가 없습니다.</h3>
                            <p style={{ fontSize: '13px', marginTop: '8px' }}>상단의 폼을 통해 새로운 브랜드를 시스템에 등록해 주세요.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrandManagementPage;
