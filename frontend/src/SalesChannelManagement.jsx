import React, { useState, useEffect, useMemo } from 'react';
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
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        channelCode: '',
        palletType: '',
        palletSpec: '',
        channelStickerRequired: false,
        maxStackHeightMm: 1500,
        padAndFrameRequired: false,
        expDateFormat: '',
        specialNotes: ''
    });
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
            setFormData({
                name: channel.name || '',
                description: channel.description || '',
                channelCode: channel.channelCode || '',
                palletType: channel.palletType || '',
                palletSpec: channel.palletSpec || '',
                channelStickerRequired: !!channel.channelStickerRequired,
                maxStackHeightMm: channel.maxStackHeightMm !== undefined ? channel.maxStackHeightMm : 1500,
                padAndFrameRequired: !!channel.padAndFrameRequired,
                expDateFormat: channel.expDateFormat || '',
                specialNotes: channel.specialNotes || ''
            });
        } else {
            setEditingChannel(null);
            setFormData({
                name: '',
                description: '',
                channelCode: '',
                palletType: '',
                palletSpec: '',
                channelStickerRequired: false,
                maxStackHeightMm: 1500,
                padAndFrameRequired: false,
                expDateFormat: '',
                specialNotes: ''
            });
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
            toast.success(editingChannel ? "채널 포장 규칙이 수정되었습니다." : "새 채널이 등록되었습니다.");
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
        { field: "channelCode", headerName: "채널 코드", width: 110, filter: true },
        { field: "name", headerName: "채널 명칭", flex: 1.5, filter: true, cellStyle: { fontWeight: '800', color: '#1e293b' } },
        { field: "palletType", headerName: "팔레트 종류", flex: 1.2, filter: true },
        { field: "maxStackHeightMm", headerName: "적재 높이(mm)", width: 120, filter: true, valueFormatter: params => params.value ? `${params.value} mm` : '-' },
        { field: "channelStickerRequired", headerName: "스티커 필수", width: 110, filter: true, cellRenderer: params => params.value ? '🔴 필수' : '❌ 미부착' },
        { field: "padAndFrameRequired", headerName: "패드/각대", width: 100, filter: true, cellRenderer: params => params.value ? '🟢 필요' : '❌ 불필요' },
        { field: "expDateFormat", headerName: "사용기한 형식", width: 130, filter: true },
        { field: "active", headerName: "상태", width: 100, filter: true,
          cellRenderer: (params) => (
            <span 
                className={`badge ${params.value ? 'success' : 'warning'}`} 
                style={{ cursor: canEdit ? 'pointer' : 'default', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }} 
                onClick={() => canEdit && handleToggle(params.data.id)}
            >
              {params.value ? 'ACTIVE' : 'INACTIVE'}
            </span>
          )
        },
        { field: "updatedBy", headerName: "수정자", width: 110 },
        {
            headerName: "관리",
            width: 130,
            sortable: false,
            filter: false,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
                    <button 
                        className="secondary" 
                        onClick={() => handleOpenDrawer(params.data)}
                        style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' }}
                    >
                        수정
                    </button>
                    <button 
                        className="secondary" 
                        onClick={() => handleDelete(params.data.id)}
                        style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 'bold', color: '#ef4444', background: '#fef2f2' }}
                        disabled={!canDelete}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ], [canEdit, canDelete]);

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
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            🌐 유통 채널별 포장 규격 관리
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="primary" 
                            onClick={() => handleOpenDrawer()} 
                            style={{ 
                                padding: '10px 24px', 
                                borderRadius: '10px', 
                                fontWeight: '800', 
                                backgroundColor: '#0f172a',
                                color: '#fff',
                                border: 'none',
                                cursor: canEdit ? 'pointer' : 'not-allowed',
                                opacity: canEdit ? 1 : 0.5
                            }} 
                            disabled={!canEdit}
                        >
                            ➕ 신규 채널 등록
                        </button>
                    </div>
                </div>

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
                        제품 마스터와 포장 사양 검증 시 자동으로 적용될 채널별 팔레트, 적재높이, 사용기한 규격 기준 데이터를 마스터링합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="primary" 
                            onClick={fetchChannels} 
                            style={{ backgroundColor: '#0f172a', color: '#fff', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px', border: 'none', borderRadius: '8px' }}
                        >
                            🔍 조회
                        </button>
                        <button 
                            className="outline" 
                            onClick={() => setQuickFilterText('')} 
                            style={{ padding: '10px 16px', fontSize: '14px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                        >
                            ♻️ 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 검색 필터 그리드 */}
            <div className="card" style={{ marginBottom: '20px', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔍 채널 통합 검색</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="채널 코드 또는 채널명으로 검색..."
                                value={quickFilterText}
                                onChange={(e) => setQuickFilterText(e.target.value)}
                                style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 데이터 카드 */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', flex: 1, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '15px', fontWeight: '800', fontSize: '14px', color: '#64748b' }}>
                    등록된 채널 수: <span style={{ color: '#0f172a' }}>{channels.length}</span> 건
                </div>
                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                    <AgGridReact
                        theme="legacy"
                        rowHeight={54}
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
                <div className="modal-overlay" style={{ zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '640px', maxHeight: '85vh', padding: '35px', borderRadius: '20px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#0f172a' }}>{editingChannel ? '📝 유통 채널 포장 규격 수정' : '✨ 신규 유통 채널 등록'}</h3>
                            <button className="secondary" onClick={() => setShowDrawer(false)} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✕</button>
                        </div>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px', display: 'block', color: '#475569' }}>채널 코드 *</label>
                                    <input
                                        type="text"
                                        value={formData.channelCode}
                                        onChange={e => setFormData({ ...formData, channelCode: e.target.value })}
                                        placeholder="예: OY, JP-ON"
                                        required
                                        disabled={!canEdit}
                                        style={{ width: '100%', borderRadius: '8px', padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1.5 }}>
                                    <label style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px', display: 'block', color: '#475569' }}>채널 명칭 *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="예: 올리브영(OY)"
                                        required
                                        disabled={!canEdit}
                                        style={{ width: '100%', borderRadius: '8px', padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px', display: 'block', color: '#475569' }}>팔레트 종류</label>
                                    <select
                                        value={formData.palletType}
                                        onChange={e => setFormData({ ...formData, palletType: e.target.value })}
                                        disabled={!canEdit}
                                        style={{ width: '100%', borderRadius: '8px', padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600', backgroundColor: '#fff' }}
                                    >
                                        <option value="">선택 안 함</option>
                                        <option value="아주팔레트">아주팔레트</option>
                                        <option value="수출용 검은색 일회용 팔레트">수출용 검은색 일회용 팔레트</option>
                                        <option value="수출용 목재 팔렛트">수출용 목재 팔렛트</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1.5 }}>
                                    <label style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px', display: 'block', color: '#475569' }}>팔레트 치수/훈증 스펙</label>
                                    <input
                                        type="text"
                                        value={formData.palletSpec}
                                        onChange={e => setFormData({ ...formData, palletSpec: e.target.value })}
                                        placeholder="예: 1,100 x 1,100 mm / GMA훈증 필수"
                                        disabled={!canEdit}
                                        style={{ width: '100%', borderRadius: '8px', padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px', display: 'block', color: '#475569' }}>적재 한도 높이 (mm)</label>
                                    <input
                                        type="number"
                                        value={formData.maxStackHeightMm}
                                        onChange={e => setFormData({ ...formData, maxStackHeightMm: parseInt(e.target.value) || 0 })}
                                        disabled={!canEdit}
                                        style={{ width: '100%', borderRadius: '8px', padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px', display: 'block', color: '#475569' }}>사용기한 규격 형식</label>
                                    <select
                                        value={formData.expDateFormat}
                                        onChange={e => setFormData({ ...formData, expDateFormat: e.target.value })}
                                        disabled={!canEdit}
                                        style={{ width: '100%', borderRadius: '8px', padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600', backgroundColor: '#fff' }}
                                    >
                                        <option value="">선택 안 함</option>
                                        <option value="YYYYMMDD까지">YYYYMMDD까지</option>
                                        <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                                        <option value="DDMMYYYY">DDMMYYYY</option>
                                        <option value="YYYY-MM">YYYY-MM</option>
                                        <option value="표기금지">표기금지 (제조번호만 허용)</option>
                                        <option value="(미정)">(미정)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '30px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#334155' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.channelStickerRequired}
                                        onChange={e => setFormData({ ...formData, channelStickerRequired: e.target.checked })}
                                        disabled={!canEdit}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    🏷️ 물류 스티커 부착 필수
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#334155' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.padAndFrameRequired}
                                        onChange={e => setFormData({ ...formData, padAndFrameRequired: e.target.checked })}
                                        disabled={!canEdit}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    📦 패드 및 각대 부착 필수
                                </label>
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px', display: 'block', color: '#475569' }}>채널별 핵심 특이사항 원문 (Special Notes)</label>
                                <textarea
                                    value={formData.specialNotes}
                                    onChange={e => setFormData({ ...formData, specialNotes: e.target.value })}
                                    placeholder="유통 가이드라인의 원문 규정을 개행하여 그대로 입력하십시오."
                                    rows={4}
                                    disabled={!canEdit}
                                    style={{ width: '100%', borderRadius: '8px', padding: '10px', border: '1px solid #cbd5e1', resize: 'none', fontSize: '13px', fontWeight: '500', lineHeight: 1.5 }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px', display: 'block', color: '#475569' }}>채널 설명 (Description)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="기타 참고사항을 기술하십시오."
                                    rows={2}
                                    disabled={!canEdit}
                                    style={{ width: '100%', borderRadius: '8px', padding: '10px', border: '1px solid #cbd5e1', resize: 'none', fontSize: '13px', fontWeight: '500' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '15px', paddingTop: '10px' }}>
                                <button type="submit" className="primary" style={{ flex: 2, padding: '12px', borderRadius: '10px', fontWeight: '800', backgroundColor: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', opacity: canEdit ? 1 : 0.5 }} disabled={!canEdit}>
                                    {canEdit ? (editingChannel ? '채널 정보 수정' : '채널 등록 완료') : '조회 전용'}
                                </button>
                                <button type="button" className="secondary" onClick={() => setShowDrawer(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}>취소</button>
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
