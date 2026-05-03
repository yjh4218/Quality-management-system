import React, { useState, useEffect } from 'react';
import { getTrashItems, restoreTrashItem, hardDeleteTrashItem } from './api';
import { usePermissions } from './usePermissions';

const TrashBinPage = ({ user }) => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [category, setCategory] = useState('ALL');

    const { canEdit, canDelete } = usePermissions(user);
    const canRestore = canEdit('trashBin');
    const canHardDelete = canDelete('trashBin');

    useEffect(() => {
        fetchTrashItems();
    }, []);

    const fetchTrashItems = async () => {
        setIsLoading(true);
        try {
            const response = await getTrashItems();
            setItems(response.data);
            setError(null);
        } catch (err) {
            setError('삭제 내역을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (type, id) => {
        if (!window.confirm('선택한 항목을 복구하시겠습니까?')) return;
        
        try {
            await restoreTrashItem(type, id);
            alert('성공적으로 복구되었습니다.');
            fetchTrashItems();
        } catch (err) {
            const msg = err.response?.data?.error || '복구 중 에러가 발생했습니다.';
            alert(msg);
        }
    };

    const handleHardDelete = async (type, id) => {
        if (!window.confirm('⚠️ 경고: 영구 삭제 시 관련 파일과 데이터가 모두 소멸되며 복구가 불가능합니다. 정말 삭제하시겠습니까?')) return;

        try {
            await hardDeleteTrashItem(type, id);
            alert('영구 삭제되었습니다.');
            fetchTrashItems();
        } catch (err) {
            alert('삭제 중 에러가 발생했습니다.');
        }
    };

    const filteredItems = category === 'ALL' 
        ? items 
        : items.filter(item => item.entityType === category);

    const getEntityLabel = (type) => {
        switch (type) {
            case 'PRODUCT': return '📦 제품';
            case 'CLAIM': return '⚠️ 클레임';
            case 'AUDIT': return '📸 생산감리';
            default: return type;
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <div className="header-title">
                    <h1>🗑️ 데이터 관리 및 복구 (휴지통)</h1>
                    <p>Soft Delete된 데이터를 확인하고 복구하거나 영구 삭제할 수 있습니다.</p>
                </div>
            </header>

            <div className="content-card">
                <div className="filter-bar" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                    <button className={`filter-btn ${category === 'ALL' ? 'active' : ''}`} onClick={() => setCategory('ALL')}>전체</button>
                    <button className={`filter-btn ${category === 'PRODUCT' ? 'active' : ''}`} onClick={() => setCategory('PRODUCT')}>제품</button>
                    <button className={`filter-btn ${category === 'CLAIM' ? 'active' : ''}`} onClick={() => setCategory('CLAIM')}>클레임</button>
                    <button className={`filter-btn ${category === 'AUDIT' ? 'active' : ''}`} onClick={() => setCategory('AUDIT')}>생산감리</button>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="table-responsive">
                    <table className="qms-table">
                        <thead>
                            <tr>
                                <th>구분</th>
                                <th>식별자</th>
                                <th>항목명</th>
                                <th>최종 변경/삭제일</th>
                                <th>액션</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="5" className="text-center">로딩 중...</td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan="5" className="text-center">삭제된 항목이 없습니다.</td></tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={`${item.entityType}-${item.id}`}>
                                        <td>{getEntityLabel(item.entityType)}</td>
                                        <td><code>{item.identifier}</code></td>
                                        <td>{item.displayTitle}</td>
                                        <td>{new Date(item.deletedAt).toLocaleString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button 
                                                    className="action-btn restore" 
                                                    onClick={() => handleRestore(item.entityType, item.id)}
                                                    style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', opacity: canRestore ? 1 : 0.5 }}
                                                    disabled={!canRestore}
                                                >
                                                    복구
                                                </button>
                                                <button 
                                                    className="action-btn delete" 
                                                    onClick={() => handleHardDelete(item.entityType, item.id)}
                                                    style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', opacity: canHardDelete ? 1 : 0.5 }}
                                                    disabled={!canHardDelete}
                                                >
                                                    영구 삭제
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TrashBinPage;
