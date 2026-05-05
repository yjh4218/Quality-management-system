import React, { useState, useEffect } from 'react';
import { getTrashItems, restoreTrashItem, hardDeleteTrashItem } from './api';
import { usePermissions } from './usePermissions';
import { toast } from 'react-toastify';

/**
 * 데이터 관리 및 복구 (휴지통) 페이지
 * [디자인 표준화] 제품코드 마스터의 40px 여백 및 표준 헤더 레이아웃을 적용했습니다.
 * [UX 개선] 딱딱한 테이블 대신 시각적 카테고리별 아이콘이 포함된 카드 뉴스 그리드 형식을 도입하여 삭제 데이터를 직관적으로 관리할 수 있습니다.
 */
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
            toast.error('데이터를 로드하는 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (type, id) => {
        if (!window.confirm('선택한 항목을 원래의 위치로 복구하시겠습니까?')) return;

        try {
            await restoreTrashItem(type, id);
            toast.success('데이터가 성공적으로 복구되었습니다.');
            fetchTrashItems();
        } catch (err) {
            const msg = err.response?.data?.error || '복구 중 에러가 발생했습니다.';
            toast.error(msg);
        }
    };

    const handleHardDelete = async (type, id) => {
        if (!window.confirm('⚠️ 경고: 영구 삭제 시 관련 파일과 데이터가 모두 소멸되며 복구가 불가능합니다. 정말 삭제하시겠습니까?')) return;

        try {
            await hardDeleteTrashItem(type, id);
            toast.success('데이터가 영구 삭제되었습니다.');
            fetchTrashItems();
        } catch (err) {
            toast.error('영구 삭제 중 에러가 발생했습니다.');
        }
    };

    const filteredItems = category === 'ALL'
        ? items
        : items.filter(item => item.entityType === category);

    const getEntityInfo = (type) => {
        switch (type) {
            case 'PRODUCT': return { label: '제품 마스터', icon: '📦', color: '#3182ce' };
            case 'CLAIM': return { label: '클레임 기록', icon: '⚠️', color: '#e53e3e' };
            case 'AUDIT': return { label: '생산감리', icon: '📸', color: '#38a169' };
            default: return { label: type, icon: '📄', color: '#718096' };
        }
    };

    return (
        <div className="page-container">
            {/* 표준화된 헤더 */}
            <div className="page-header-standard">
                <div className="header-title">
                    <h2>🗑️ 데이터 관리 및 복구 (휴지통)</h2>
                    <p>Soft Delete된 데이터를 확인하고 복구하거나 영구 삭제할 수 있습니다.</p>
                </div>
            </div>

            {/* 표준화된 검색/필터 바 */}
            <div className="search-bar-standard" style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {['ALL', 'PRODUCT', 'CLAIM', 'AUDIT'].map(cat => (
                        <button
                            key={cat}
                            className={`secondary ${category === cat ? 'active' : ''}`}
                            onClick={() => setCategory(cat)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                background: category === cat ? 'var(--primary-color)' : '#fff',
                                color: category === cat ? '#fff' : '#4a5568',
                                border: '1px solid #e2e8f0',
                                fontWeight: '700',
                                fontSize: '13px'
                            }}
                        >
                            {cat === 'ALL' ? '전체 내역' : getEntityInfo(cat).label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <div className="spinner-ring" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '20px', color: '#a0aec0' }}>삭제된 데이터를 분석 중입니다...</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '100px 20px', borderRadius: '24px' }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>🗑️</div>
                    <h3 style={{ justifyContent: 'center', color: '#cbd5e0' }}>삭제된 항목이 없습니다.</h3>
                    <p style={{ color: '#a0aec0' }}>휴지통이 비어 있어 모든 데이터가 안전하게 보관 중입니다.</p>
                </div>
            ) : (
                <div className="card-news-grid">
                    {filteredItems.map(item => {
                        const info = getEntityInfo(item.entityType);
                        return (
                            <div key={`${item.entityType}-${item.id}`} className="card-news-item" style={{ borderLeft: `6px solid ${info.color}` }}>
                                <div className="card-news-header">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="badge" style={{ background: `${info.color}15`, color: info.color }}>
                                            {info.icon} {info.label}
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                                            ID: {item.identifier}
                                        </span>
                                    </div>
                                    <h3 style={{ margin: '15px 0 8px 0', fontSize: '18px', fontWeight: '800' }}>
                                        {item.displayTitle}
                                    </h3>
                                    <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                                        삭제 일시: {new Date(item.deletedAt).toLocaleString()}
                                    </div>
                                </div>
                                <div className="card-news-body">
                                    <p style={{ margin: 0, fontSize: '13px', color: '#718096', lineHeight: '1.6' }}>
                                        해당 데이터는 현재 시스템에서 비활성화 상태입니다. 복구를 원하시면 하단의 복구 버튼을, 영구 삭제를 원하시면 삭제 버튼을 눌러주세요.
                                    </p>
                                </div>
                                <div className="card-news-footer" style={{ background: '#fff' }}>
                                    <button
                                        className="secondary"
                                        onClick={() => handleRestore(item.entityType, item.id)}
                                        style={{ background: '#f0fff4', color: '#38a169', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800', padding: '8px 16px', opacity: canRestore ? 1 : 0.5 }}
                                        disabled={!canRestore}
                                    >
                                        ♻️ 복구하기
                                    </button>
                                    <button
                                        className="secondary"
                                        onClick={() => handleHardDelete(item.entityType, item.id)}
                                        style={{ background: '#fff5f5', color: '#e53e3e', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800', padding: '8px 16px', opacity: canHardDelete ? 1 : 0.5 }}
                                        disabled={!canHardDelete}
                                    >
                                        🔥 영구 삭제
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TrashBinPage;
