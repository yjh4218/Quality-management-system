import React, { useState, useEffect } from 'react';
import { getManufacturerCategories, saveManufacturerCategory, deleteManufacturerCategory } from './api';
import { toast } from 'react-toastify';

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
            toast.error('카테고리 로드 실패');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newCategoryName.trim()) return;
        try {
            await saveManufacturerCategory({ name: newCategoryName });
            setNewCategoryName('');
            toast.success('추가되었습니다.');
            fetchCategories();
        } catch (err) {
            toast.error('추가 실패');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('정말 삭제하시겠습니까? (비활성화 처리됩니다)')) return;
        try {
            await deleteManufacturerCategory(id);
            toast.success('삭제되었습니다.');
            fetchCategories();
        } catch (err) {
            toast.error('삭제 실패');
        }
    };

    return (
        <div className="page-container-inner" style={{ padding: '20px' }}>
            <div className="page-header">
                <h2>📂 제조사 구분 관리</h2>
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        type="text" 
                        placeholder="새 카테고리 명칭 입력" 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        style={{ flex: 1, padding: '10px' }}
                    />
                    <button className="primary" onClick={handleAdd}>카테고리 추가</button>
                </div>
            </div>

            <div className="card">
                {isLoading ? (
                    <p>로딩 중...</p>
                ) : (
                    <table className="qms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>카테고리 명칭</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '100px' }}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px' }}>{cat.id}</td>
                                    <td style={{ padding: '12px' }}>{cat.name}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <button 
                                            className="secondary" 
                                            style={{ color: '#c53030', borderColor: '#feb2b2' }}
                                            onClick={() => handleDelete(cat.id)}
                                        >
                                            삭제
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>등록된 카테고리가 없습니다.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ManufacturerCategoryPage;
