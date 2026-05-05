import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import * as api from './api';
import { toast } from 'react-toastify';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';

/**
 * 유통 채널 관리 페이지
 * [디자인 표준화] 제품코드 마스터의 20px 여백 및 표준 그리드 레이아웃을 적용했습니다.
 * [UX 개선] 기존 카드 형태에서 Ag-Grid 기반의 데이터 중심 레이아웃으로 전환하여 대량의 유통 채널 정보를 효율적으로 관리합니다.
 */
const SalesChannelManagement = ({ user }) => {
    const { canEdit: checkEdit, canDelete: checkDelete } = usePermissions(user);
    const canEdit = checkEdit('salesChannels');
    const canDelete = checkDelete('salesChannels');
    const [channels, setChannels] = useState([]);
    const [showDrawer, setShowDrawer] = useState(false);
    const [editingChannel, setEditingChannel] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [quickFilterText, setQuickFilterText] = useState('');

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        try {
            const res = await api.getSalesChannels();
            setChannels(res.data);
        } catch (error) {
            toast.error("채널 목록을 불러오지 못했습니다.");
        }
    };

    const handleOpenDrawer = (channel = null) => {
        if (channel) {
            setEditingChannel(channel);
            setFormData({ name: channel.name, description: channel.description || '' });
        } else {
            setEditingChannel(null);
            setFormData({ name: '', description: '' });
        }
        setShowDrawer(true);
    };

    const handleSave = (e) => {
        if (e) e.preventDefault();
        setIsConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsConfirmOpen(false);
        try {
            const channelData = editingChannel ? { ...editingChannel, ...formData } : formData;
            await api.saveSalesChannel(channelData);
            toast.success(editingChannel ? "채널이 수정되었습니다." : "새 채널이 등록되었습니다.");
            setShowDrawer(false);
            fetchChannels();
        } catch (error) {
            toast.error("저장 실패: " + (error.response?.data?.message || "오류가 발생했습니다."));
        }
    };

    const handleToggle = async (id) => {
        try {
            await api.toggleSalesChannel(id);
            toast.success("채널 상태가 변경되었습니다.");
            fetchChannels();
        } catch (error) {
            toast.error("상태 변경 실패");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("정말로 이 채널을 삭제하시겠습니까? 관련 데이터가 있을 경우 오류가 발생할 수 있습니다.")) {
            try {
                await api.deleteSalesChannel(id);
                toast.success("채널이 삭제되었습니다.");
                fetchChannels();
            } catch (error) {
                toast.error("삭제 실패: 관련 데이터가 존재할 수 있습니다.");
            }
        }
    };

    const columnDefs = useMemo(() => [
        { field: "id", headerName: "ID", width: 80, pinned: 'left' },
        { field: "name", headerName: "채널 명칭", flex: 1, filter: true, cellStyle: { fontWeight: '800', color: '#1a202c' } },
        { field: "description", headerName: "상세 설명", flex: 2, filter: true },
        { field: "active", headerName: "상태", width: 120, filter: true,
          cellRenderer: (params) => (
            <span 
                className={`badge ${params.value ? 'success' : 'warning'}`} 
                style={{ cursor: canEdit ? 'pointer' : 'default' }} 
                onClick={() => canEdit && handleToggle(params.data.id)}
            >
              {params.value ? 'ACTIVE' : 'INACTIVE'}
            </span>
          )
        },
        { field: "updatedBy", headerName: "최종 수정자", width: 130 },
        { field: "updatedAt", headerName: "최종 수정일", width: 150, 
          valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : '-' 
        },
        {
            headerName: "관리",
            width: 140,
            sortable: false,
            filter: false,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
                    <button 
                        className="secondary" 
                        onClick={() => handleOpenDrawer(params.data)}
                        style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '800' }}
                    >
                        수정
                    </button>
                    <button 
                        className="secondary" 
                        onClick={() => handleDelete(params.data.id)}
                        style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '800', color: '#e53e3e', background: '#fff5f5' }}
                        disabled={!canDelete}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ], [canEdit, canDelete]);

    return (
        <div className="page-container">
            <div className="page-header-standard">
                <div className="header-title">
                    <h2>🌐 유통 채널 관리</h2>
                    <p>제품 마스터 및 포장 규칙에서 사용할 글로벌 유통 채널을 통합 관리합니다. (항목 더블클릭 시 상세 정보 확인)</p>
                </div>
                <button 
                    className="primary" 
                    onClick={() => handleOpenDrawer()} 
                    style={{ 
                        padding: '12px 28px', 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 12px rgba(0, 51, 102, 0.2)',
                        opacity: canEdit ? 1 : 0.5 
                    }} 
                    disabled={!canEdit}
                >
                    ➕ 신규 채널 등록
                </button>
            </div>

            <div className="card" style={{ padding: '25px', borderRadius: '24px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: '#475569' }}>
                        채널 목록 <span style={{ color: 'var(--primary-color)', marginLeft: '8px' }}>{channels.length}</span>
                    </div>
                    <div className="search-bar-standard" style={{ padding: '0', border: 'none', boxShadow: 'none', margin: 0, width: '350px' }}>
                        <div style={{ display: 'flex', width: '100%', position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="채널명으로 빠른 검색..."
                                value={quickFilterText}
                                onChange={(e) => setQuickFilterText(e.target.value)}
                                style={{ padding: '12px 45px 12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', width: '100%', fontWeight: '600' }}
                            />
                            <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
                        </div>
                    </div>
                </div>

                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                    <AgGridReact
                        theme="legacy"
                        rowHeight={55}
                        rowData={channels}
                        columnDefs={columnDefs}
                        pagination={true}
                        paginationPageSize={50}
                        quickFilterText={quickFilterText}
                        animateRows={true}
                        onRowDoubleClicked={(p) => handleOpenDrawer(p.data)}
                    />
                </div>
            </div>

            {showDrawer && (
                <div className="drawer-overlay" onClick={() => setShowDrawer(false)} style={{ zIndex: 1000 }}>
                    <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: '480px', padding: '40px', borderRadius: '24px 0 0 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
                            <h3 style={{ fontSize: '22px', fontWeight: '800' }}>{editingChannel ? '📝 유통 채널 정보 수정' : '✨ 신규 유통 채널 등록'}</h3>
                            <button className="secondary" onClick={() => setShowDrawer(false)} style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0, border: 'none', background: '#f1f5f9' }}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group" style={{ marginBottom: '25px' }}>
                                <label style={{ fontWeight: '700', fontSize: '14px', marginBottom: '10px', display: 'block' }}>채널명 (Channel Name) *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="예: 올리브영(OY), 아마존(AMZ)"
                                    required
                                    disabled={!canEdit}
                                    style={{ borderRadius: '12px', padding: '12px', fontWeight: '600' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '30px' }}>
                                <label style={{ fontWeight: '700', fontSize: '14px', marginBottom: '10px', display: 'block' }}>채널 상세 설명 (Description)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="해당 유통 채널의 특이사항이나 관리 규칙을 입력하세요."
                                    rows={6}
                                    disabled={!canEdit}
                                    style={{ borderRadius: '12px', padding: '15px', resize: 'none', fontWeight: '500' }}
                                />
                            </div>
                            <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
                                <button type="submit" className="primary" style={{ flex: 2, padding: '14px', borderRadius: '12px', fontWeight: '800', opacity: canEdit ? 1 : 0.5 }} disabled={!canEdit}>
                                    {canEdit ? (editingChannel ? '채널 정보 수정' : '채널 등록 완료') : '조회 전용'}
                                </button>
                                <button type="button" className="secondary" onClick={() => setShowDrawer(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px' }}>취소</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {isConfirmOpen && (
                <SaveConfirmModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmSave}
                />
            )}
        </div>
    );
};

export default SalesChannelManagement;
