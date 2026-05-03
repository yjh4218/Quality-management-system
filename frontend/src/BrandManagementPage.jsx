import { useState, useEffect } from 'react';
import { getBrands, createBrand, deleteBrand } from './api';
import { usePermissions } from './usePermissions';

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
            alert("브랜드 목록 로딩 실패");
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName) return;
        try {
            await createBrand({ name: newName });
            setNewName('');
            fetchBrands();
        } catch (error) {
            alert("등록 실패 (중복 가능성)");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("브랜드를 삭제하시겠습니까?")) return;
        try {
            await deleteBrand(id);
            fetchBrands();
        } catch (error) {
            alert("삭제 실패");
        }
    };

    return (
        <div className="card" style={{ maxWidth: '600px' }}>
            <h2>🏷️ 브랜드 관리 (Admin Only)</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>제품 분류를 위한 브랜드 카테고리를 관리합니다.</p>

            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '20px', margin: '25px 0' }}>
                <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder={canEdit ? "신규 브랜드명 입력" : "수정 권한 없음"}
                    style={{ flex: 1 }}
                    disabled={!canEdit}
                />
                <button type="submit" className="primary" style={{ opacity: canEdit ? 1 : 0.5 }} disabled={!canEdit}>추가</button>
            </form>

            <div style={{ border: '1px solid #eee', borderRadius: '8px' }}>
                {brands.map(b => (
                    <div key={b.id} style={{
                        padding: '16px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #eee'
                    }}>
                        <span style={{ fontWeight: '600' }}>{b.name}</span>
                        <button
                            onClick={() => handleDelete(b.id)}
                            className="secondary"
                            style={{ padding: '4px 10px', fontSize: '12px', opacity: canDelete ? 1 : 0.5, cursor: canDelete ? 'pointer' : 'not-allowed' }}
                            disabled={!canDelete}
                        >
                            삭제
                        </button>
                    </div>
                ))}
                {brands.length === 0 && <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>등록된 브랜드가 없습니다.</p>}
            </div>
        </div>
    );
};

export default BrandManagementPage;
