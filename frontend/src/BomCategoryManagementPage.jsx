import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import * as api from './api';
import { toast } from 'react-toastify';
import { usePermissions } from './usePermissions';

const BomCategoryManagementPage = ({ user }) => {
    const { canEdit: checkEdit, canDelete: checkDelete } = usePermissions(user);
    const canEdit = checkEdit('bomCategories');
    const canDelete = checkDelete('bomCategories');
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        mainType: '',
        subType: ''
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await api.getAllBomCategories();
            setCategories(res.data);
        } catch (error) {
            toast.error("카테고리 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.mainType || !formData.subType) return;
        try {
            await api.saveBomCategory(formData);
            toast.success("카테고리가 성공적으로 등록되었습니다.");
            setFormData({ mainType: '', subType: '' });
            fetchCategories();
        } catch (error) {
            toast.error("저장 실패");
        }
    };

    const handleSoftDelete = async (id) => {
        if (!window.confirm("이 항목을 목록에서 숨길까요?")) return;
        try {
            await api.softDeleteBomCategory(id);
            toast.info("항목이 숨겨졌습니다.");
            fetchCategories();
        } catch (error) {
            toast.error("처리 실패");
        }
    };

    const handleHardDelete = async (id) => {
        if (!window.confirm("이 항목을 영구 삭제하시겠습니까? 복구가 불가능합니다.")) return;
        try {
            await api.hardDeleteBomCategory(id);
            toast.warn("항목이 영구 삭제되었습니다.");
            fetchCategories();
        } catch (error) {
            toast.error("삭제 실패 (데이터 무결성 확인 필요)");
        }
    };

    const colDefs = useMemo(() => [
        { field: "id", headerName: "ID", width: 80, pinned: 'left' },
        { field: "mainType", headerName: "유형", filter: true, width: 120, cellStyle: { fontWeight: 'bold' } },
        { field: "subType", headerName: "세부유형", filter: true, flex: 1, minWidth: 150 },
        {
            field: "active",
            headerName: "상태",
            width: 120,
            cellRenderer: p => p.value 
                ? <span className="badge" style={{ background: '#ebf8ff', color: '#2b6cb0' }}>사용 중</span>
                : <span className="badge" style={{ background: '#fff5f5', color: '#c53030' }}>숨김 처리</span>
        },
        {
            headerName: "업데이트 정보",
            width: 200,
            valueGetter: p => `${p.data.updatedBy} / ${new Date(p.data.updatedAt).toLocaleDateString()}`,
            cellStyle: { fontSize: '12px', color: '#718096' }
        },
        {
            headerName: "관리",
            width: 150,
            pinned: 'right',
            cellRenderer: p => (
                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                    {p.data.active && (
                        <button 
                            className="outline" 
                            style={{ padding: '4px 8px', fontSize: '12px', opacity: canEdit ? 1 : 0.5, cursor: canEdit ? 'pointer' : 'not-allowed' }} 
                            onClick={() => handleSoftDelete(p.data.id)} 
                            disabled={!canEdit}
                        >
                            숨김
                        </button>
                    )}
                    <button 
                        className="outline" 
                        style={{ padding: '4px 8px', fontSize: '12px', borderColor: '#feb2b2', color: '#c53030', opacity: canDelete ? 1 : 0.5, cursor: canDelete ? 'pointer' : 'not-allowed' }} 
                        onClick={() => handleHardDelete(p.data.id)}
                        disabled={!canDelete}
                    >
                        영구삭제
                    </button>
                </div>
            )
        }
    ], [canEdit, canDelete]);

    return (
        <div className="page-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <header className="page-header" style={{ marginBottom: '24px', flexShrink: 0 }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>⚙️ BOM 유형/세부유형 설정</h1>
                    <p style={{ color: '#718096', fontSize: '14px' }}>구성품 등록 시 사용되는 유형 정보를 관리합니다.</p>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', flex: 1, minHeight: 0 }}>
                <div className="card" style={{ padding: '20px', height: 'fit-content' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '20px' }}>🆕 신규 유형 등록</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>유형 (Main Type)</label>
                            <input 
                                value={formData.mainType} 
                                onChange={e => setFormData({...formData, mainType: e.target.value})} 
                                placeholder="예: 용기, 캡, 라벨" 
                                required
                                disabled={!canEdit}
                                style={{ backgroundColor: !canEdit ? '#f8f9fa' : '#fff' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>세부 유형 (Sub Type)</label>
                            <input 
                                value={formData.subType} 
                                onChange={e => setFormData({...formData, subType: e.target.value})} 
                                placeholder="예: PET병, PP, 원터치캡" 
                                required
                                disabled={!canEdit}
                                style={{ backgroundColor: !canEdit ? '#f8f9fa' : '#fff' }}
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="primary" 
                            style={{ width: '100%', marginTop: '10px', opacity: canEdit ? 1 : 0.5, cursor: canEdit ? 'pointer' : 'not-allowed' }}
                            disabled={!canEdit}
                        >
                            {canEdit ? '카테고리 저장' : '🛠️ 조회 전용 모드'}
                        </button>
                    </form>
                </div>


                <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <h3 style={{ margin: 0 }}>📋 설정 목록</h3>
                        <button className="secondary" onClick={fetchCategories}>새로고침</button>
                    </div>
                    <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                        <AgGridReact theme="legacy"
                            rowData={categories} 
                            columnDefs={colDefs} 
                            rowHeight={50}
                            animateRows={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BomCategoryManagementPage;
