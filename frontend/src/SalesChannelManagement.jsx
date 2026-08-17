import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import apiDefault, * as api from './api';
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
    const [activeDrawerTab, setActiveDrawerTab] = useState('unit'); // 'unit' | 'set'
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
        popRequired: false,
        cushioningStandard: '',
        specialNotes: '',
        // 단품 착인/현품표 기준 및 날짜 양식
        unitBoxMarkingRule: '',
        inboxLabelMarkingRule: '',
        outboxLabelMarkingRule: '',
        palletLabelMarkingRule: '',
        inboxDateFormat: '',
        outboxDateFormat: '',
        palletDateFormat: '',
        // 기획세트 착인/현품표 기준 및 규격
        setContainerMarkingDisplay: '',
        setUnitBoxMarkingRule: '',
        setInboxLabelMarkingRule: '',
        setOutboxLabelMarkingRule: '',
        setPalletLabelMarkingRule: '',
        setCushioningStandard: '',
        setPalletHeightLimit: '',
        setChannelStickerStandard: ''
    });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [quickFilterText, setQuickFilterText] = useState('');
    const [categorizedNotes, setCategorizedNotes] = useState([]);
    const [showLegacyNotes, setShowLegacyNotes] = useState(false);
    const [previewFile, setPreviewFile] = useState(null); // { url, type }

    const getFullFileUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const baseUrl = api.getBaseURL ? api.getBaseURL() : 'http://localhost:8080';
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    // 날짜 표기양식 프리셋 스마트 교체/추가 헬퍼
    const applyDateFormatPreset = (currentVal, type, presetVal) => {
        if (!presetVal) return currentVal || '';
        const prefix = type === 'mfg' ? '제조일자 (Mfg. Date):' : '사용기한 (Exp. Date):';
        const newEntry = `${prefix} ${presetVal}`;
        if (!currentVal || !currentVal.trim()) return newEntry;

        const lines = currentVal.split('\n');
        let replaced = false;
        const updatedLines = lines.map(line => {
            if (type === 'mfg' && (line.includes('제조일자') || line.includes('Mfg. Date') || line.includes('Mfg'))) {
                replaced = true;
                return newEntry;
            }
            if (type === 'exp' && (line.includes('사용기한') || line.includes('Exp. Date') || line.includes('EXP') || line.includes('Exp'))) {
                replaced = true;
                return newEntry;
            }
            return line;
        });

        if (!replaced) {
            updatedLines.push(newEntry);
        }
        return updatedLines.filter(Boolean).join('\n');
    };

    // 현품표 제조일자 / 사용기한 개별 추출 헬퍼
    const extractDateFormatPart = (fullText, type) => {
        if (!fullText) return '';
        const lines = fullText.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (type === 'mfg' && (trimmed.includes('제조일자') || trimmed.includes('Mfg. Date') || trimmed.includes('Mfg'))) {
                const clean = trimmed.replace(/^.*?:\s*/, '').trim();
                return clean || trimmed;
            }
            if (type === 'exp' && (trimmed.includes('사용기한') || trimmed.includes('Exp. Date') || trimmed.includes('EXP') || trimmed.includes('Exp'))) {
                const clean = trimmed.replace(/^.*?:\s*/, '').trim();
                return clean || trimmed;
            }
        }
        return '';
    };

    useEffect(() => {
        fetchChannels();
    }, []);

    const applyFormat = (itemCatId, formatType, colorVal = null) => {
        setCategorizedNotes(prev => prev.map(n => {
            if (n.categoryId !== itemCatId) return n;
            let current = n.noteContent || '';
            let formatted = current;

            if (formatType === 'bold') {
                formatted = `<b>${current}</b>`;
            } else if (formatType === 'italic') {
                formatted = `<i>${current}</i>`;
            } else if (formatType === 'color' && colorVal) {
                formatted = `<span style="color: ${colorVal}">${current}</span>`;
            }

            return { ...n, noteContent: formatted };
        }));
    };

    const handleFileUpload = async (itemCatId, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await apiDefault.post('/api/sales-channels/upload-sticker-file', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const { fileUrl, fileType } = res.data;

            setCategorizedNotes(prev => prev.map(n => {
                if (n.categoryId === itemCatId) {
                    return {
                        ...n,
                        fileUrl: fileUrl,
                        fileType: fileType,
                        noteContent: n.noteContent || '채널 스티커 규정 파일 첨부됨'
                    };
                }
                return n;
            }));

            toast.success("스티커 파일이 성공적으로 첨부되었습니다.");
        } catch (err) {
            console.error("파일 업로드 실패:", err);
            toast.error("스티커 파일 업로드 중 오류가 발생했습니다.");
        }
    };

    const fetchSpecialNotes = async (channelId) => {
        try {
            const res = await apiDefault.get(`/api/sales-channels/${channelId}/special-notes`);
            if (res.data?.notes && res.data.notes.length > 0) {
                setCategorizedNotes(res.data.notes);
            } else {
                await fetchCategoriesOnly();
            }
        } catch (err) {
            console.error("특이사항 항목 조회 실패:", err);
            await fetchCategoriesOnly();
        }
    };

    const fetchCategoriesOnly = async () => {
        try {
            const res = await apiDefault.get('/api/channel-note-categories');
            const cats = res.data || [];
            setCategorizedNotes(cats.map(c => ({
                categoryId: c.id,
                categoryKey: c.categoryKey,
                categoryLabel: c.categoryLabel,
                displayOrder: c.displayOrder,
                noteContent: ''
            })));
        } catch (err) {
            console.error("카테고리 목록 조회 실패:", err);
        }
    };

    const fetchChannels = async () => {
        try {
            const res = await api.getSalesChannels();
            setChannels(res.data);
        } catch (error) {
            toast.error("채널 목록을 불러오지 못했습니다.");
        }
    };

    const handleOpenDrawer = (channel = null) => {
        setActiveDrawerTab('unit');
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
                popRequired: !!channel.popRequired,
                cushioningStandard: channel.cushioningStandard || '',
                specialNotes: channel.specialNotes || '',
                unitBoxMarkingRule: channel.unitBoxMarkingRule || '',
                inboxLabelMarkingRule: channel.inboxLabelMarkingRule || '',
                outboxLabelMarkingRule: channel.outboxLabelMarkingRule || '',
                palletLabelMarkingRule: channel.palletLabelMarkingRule || '',
                inboxDateFormat: channel.inboxDateFormat || '',
                outboxDateFormat: channel.outboxDateFormat || '',
                palletDateFormat: channel.palletDateFormat || '',
                setContainerMarkingDisplay: channel.setContainerMarkingDisplay || '',
                setUnitBoxMarkingRule: channel.setUnitBoxMarkingRule || '',
                setInboxLabelMarkingRule: channel.setInboxLabelMarkingRule || '',
                setOutboxLabelMarkingRule: channel.setOutboxLabelMarkingRule || '',
                setPalletLabelMarkingRule: channel.setPalletLabelMarkingRule || '',
                setCushioningStandard: channel.setCushioningStandard || '',
                setPalletHeightLimit: channel.setPalletHeightLimit || '',
                setChannelStickerStandard: channel.setChannelStickerStandard || ''
            });
            fetchSpecialNotes(channel.id);
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
                popRequired: false,
                cushioningStandard: '',
                specialNotes: '',
                unitBoxMarkingRule: '',
                inboxLabelMarkingRule: '',
                outboxLabelMarkingRule: '',
                palletLabelMarkingRule: '',
                setContainerMarkingDisplay: '',
                setUnitBoxMarkingRule: '',
                setInboxLabelMarkingRule: '',
                setOutboxLabelMarkingRule: '',
                setPalletLabelMarkingRule: '',
                setCushioningStandard: '',
                setPalletHeightLimit: '',
                setChannelStickerStandard: ''
            });
            fetchCategoriesOnly();
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
            const res = await api.saveSalesChannel(channelData);
            const savedChannelId = editingChannel ? editingChannel.id : res.data?.id;

            // 단상자/용기 착인 기준 통합 값을 EXPIRY_MARKING 노트에 자동 동기화하여 저장
            const syncedNotes = categorizedNotes.map(n => {
                if (n.categoryKey === 'EXPIRY_MARKING' || n.categoryLabel?.includes('사용기한 착인')) {
                    return { ...n, noteContent: formData.unitBoxMarkingRule || n.noteContent || '' };
                }
                return n;
            });

            if (savedChannelId && syncedNotes.length > 0) {
                await apiDefault.post(`/api/sales-channels/${savedChannelId}/special-notes`, syncedNotes);
            }

            toast.success(editingChannel ? "채널 포장 규칙 및 항목별 특이사항이 수정되었습니다." : "새 채널 및 특이사항이 등록되었습니다.");
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
                            className="outline" 
                            onClick={() => window.location.href = '/channel-note-config'} 
                            style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#1e293b', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                        >
                            ⚙️ 특이사항 항목 설정
                        </button>
                        <button 
                            className="primary" 
                            onClick={() => handleOpenDrawer()} 
                            style={{ 
                                padding: '10px 20px', 
                                borderRadius: '8px', 
                                border: 'none', 
                                backgroundColor: canEdit ? '#2563eb' : '#94a3b8', 
                                color: '#ffffff', 
                                fontWeight: 'bold', 
                                fontSize: '13px',
                                cursor: canEdit ? 'pointer' : 'not-allowed',
                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
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
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '1100px', maxWidth: '95vw', maxHeight: '92vh', borderRadius: '20px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        
                        {/* 1. Fixed Modal Header */}
                        <div className="modal-header" style={{ padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                                    {editingChannel ? '📝 유통 채널 포장 규격 수정' : '✨ 신규 유통 채널 등록'}
                                </h3>
                                {formData.channelCode && (
                                    <span className="badge" style={{ background: '#e2e8f0', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', color: '#475569', border: '1px solid #cbd5e1' }}>
                                        🏷️ {formData.channelCode}
                                    </span>
                                )}
                            </div>
                            <button className="secondary close-button" onClick={() => setShowDrawer(false)}>
                                <span className="icon">×</span> 닫기
                            </button>
                        </div>

                        {/* 2. Fixed Tabs */}
                        <div className="drawer-tabs-wrapper" style={{ padding: '0 30px', borderBottom: '2px solid #e2e8f0', display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setActiveDrawerTab('unit')}
                                style={{
                                    padding: '12px 20px',
                                    fontWeight: '800',
                                    fontSize: '14px',
                                    border: 'none',
                                    borderBottom: activeDrawerTab === 'unit' ? '3px solid #2563eb' : '3px solid transparent',
                                    backgroundColor: 'transparent',
                                    color: activeDrawerTab === 'unit' ? '#2563eb' : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📦 기본 및 단품 규격 기준
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveDrawerTab('set')}
                                style={{
                                    padding: '12px 20px',
                                    fontWeight: '800',
                                    fontSize: '14px',
                                    border: 'none',
                                    borderBottom: activeDrawerTab === 'set' ? '3px solid #7c3aed' : '3px solid transparent',
                                    backgroundColor: 'transparent',
                                    color: activeDrawerTab === 'set' ? '#7c3aed' : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                🎁 기획세트 포장 / 현품표 규격
                            </button>
                        </div>

                        {/* 3. Scrollable Modal Body */}
                        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '30px' }}>
                            <form id="sales-channel-form" onSubmit={handleSave} className="drawer-body-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* 공통 기본 정보 */}
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

                            {activeDrawerTab === 'unit' ? (
                                <>
                                    {/* 📦 단품 규격 & 착인/현품표 탭 */}
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
                                                style={{ width: '100%', borderRadius: '8px', padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600', fontSize: '13px' }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px', display: 'block', color: '#475569' }}>단품 완충재 투입 기준</label>
                                            <input
                                                type="text"
                                                value={formData.cushioningStandard}
                                                onChange={e => setFormData({ ...formData, cushioningStandard: e.target.value })}
                                                placeholder="예: 박스 상단 빈공간 에어캡 투입"
                                                disabled={!canEdit}
                                                style={{ width: '100%', borderRadius: '8px', padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#334155' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.channelStickerRequired}
                                                onChange={e => setFormData({ ...formData, channelStickerRequired: e.target.checked })}
                                                disabled={!canEdit}
                                                style={{ width: '16px', height: '16px' }}
                                            />
                                            🏷️ 물류 스티커 필수
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', color: '#334155' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.padAndFrameRequired}
                                                onChange={e => setFormData({ ...formData, padAndFrameRequired: e.target.checked })}
                                                disabled={!canEdit}
                                                style={{ width: '16px', height: '16px' }}
                                            />
                                            📦 패드/각대 필수
                                        </label>
                                    </div>

                                     {/* 통합 유통채널 포장 특이사항 및 4대 포장재별 착인/현품표 표준 규격 카드 */}
                                     <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '14px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                             <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e40af' }}>📋 유통채널 포장 특이사항 및 4대 포장재별 착인/현품표 표준 규격</h4>
                                             <span style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb' }}>포장사양서 단상자/용기/인박스/아웃박스/팔레트 항목에 직접 동기화됩니다.</span>
                                         </div>
                                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                             
                                             {/* 1. 단상자 / 용기 착인 기준 */}
                                             <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                 <label style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a', display: 'block' }}>📦 단상자 / 용기 착인 기준 (제조번호, 사용기한, 제조일자)</label>
                                                 <select
                                                     onChange={(e) => {
                                                         const val = e.target.value;
                                                         if (val && val !== '그 외') {
                                                             const current = formData.unitBoxMarkingRule ? formData.unitBoxMarkingRule + '\n' : '';
                                                             let expPart = '';
                                                             if (val.includes('EXP')) {
                                                                 expPart = val.replace(/^.*?EXP\s*/, '').trim();
                                                             } else if (val.includes('표기금지')) {
                                                                 expPart = '표기금지';
                                                             }
                                                             setFormData({ 
                                                                 ...formData, 
                                                                 unitBoxMarkingRule: current + `1. 사용기한 착인 또는 압인 시 '${val}' 기재`,
                                                                 expDateFormat: expPart || formData.expDateFormat
                                                             });
                                                         }
                                                     }}
                                                     disabled={!canEdit}
                                                     style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #93c5fd', fontSize: '12.5px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}
                                                 >
                                                     <option value="">-- 📦 단상자/용기 착인 기준 프리셋 선택 --</option>
                                                     <option value="LOT(제조번호) EXP YYYYMMDD까지">LOT(제조번호) EXP YYYYMMDD까지</option>
                                                     <option value="LOT(제조번호) EXP DDMMYYYY">LOT(제조번호) EXP DDMMYYYY</option>
                                                     <option value="LOT(제조번호) EXP MM-DD-YYYY">LOT(제조번호) EXP MM-DD-YYYY</option>
                                                     <option value="표기금지(제조번호만 허용)">표기금지(제조번호만 허용)</option>
                                                     <option value="그 외">그 외 (직접 별도 유형/목록 입력)</option>
                                                 </select>
                                                 <textarea
                                                     value={formData.unitBoxMarkingRule || ''}
                                                     onChange={e => setFormData({ ...formData, unitBoxMarkingRule: e.target.value })}
                                                     placeholder="예: 1. 단상자 후면 하단 잉크젯 착인 (LOT(제조번호) / EXP: YYYYMMDD 까지)"
                                                     rows={3}
                                                     disabled={!canEdit}
                                                     style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', lineHeight: 1.4 }}
                                                 />
                                             </div>

                                             {/* 2. 인박스 현품표 착인 / 표시 기재 사항 및 날짜 양식 */}
                                             <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                 <label style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a', display: 'block' }}>📥 인박스 현품표 착인 / 표시 기재 사항</label>
                                                 <select
                                                     onChange={(e) => {
                                                         const val = e.target.value;
                                                         if (val) {
                                                             const current = formData.inboxLabelMarkingRule ? formData.inboxLabelMarkingRule + '\n' : '';
                                                             setFormData({ ...formData, inboxLabelMarkingRule: current + val });
                                                         }
                                                     }}
                                                     disabled={!canEdit}
                                                     style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #93c5fd', fontSize: '12.5px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}
                                                 >
                                                     <option value="">-- 📥 인박스 현품표 기재 사항 프리셋 선택 --</option>
                                                     <option value="인박스 측면 현품표 스티커 부착 (제품명, 입수량, LOT, 사용기한 기재)">인박스 측면 현품표 스티커 부착 (제품명, 입수량, LOT, 사용기한 기재)</option>
                                                     <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                     <option value="그 외">그 외 (직접 별도 유형/목록 입력)</option>
                                                 </select>
                                                 <textarea
                                                     value={formData.inboxLabelMarkingRule || ''}
                                                     onChange={e => setFormData({ ...formData, inboxLabelMarkingRule: e.target.value })}
                                                     placeholder="예: 1. 인박스 측면 현품표 스티커 부착 (제품명, 입수량, LOT, 사용기한 기재)"
                                                     rows={3}
                                                     disabled={!canEdit}
                                                     style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', lineHeight: 1.4 }}
                                                 />

                                                 {/* 인박스 날짜 표기양식 */}
                                                 <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #bfdbfe', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                     <label style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8' }}>📥 인박스 날짜 표기양식 (제조일자 & 사용기한 각각 선택):</label>
                                                     <div style={{ display: 'flex', gap: '6px' }}>
                                                         <select
                                                             value={extractDateFormatPart(formData.inboxDateFormat, 'mfg')}
                                                             onChange={(e) => {
                                                                 const val = e.target.value;
                                                                 if (val) {
                                                                     setFormData({ ...formData, inboxDateFormat: applyDateFormatPreset(formData.inboxDateFormat, 'mfg', val) });
                                                                 }
                                                             }}
                                                             disabled={!canEdit}
                                                             style={{ flex: 1, borderRadius: '4px', padding: '4px 6px', border: '1px solid #93c5fd', fontSize: '11.5px', backgroundColor: '#fff' }}
                                                         >
                                                             <option value="">-- Mfg Date 프리셋 --</option>
                                                             <option value="YYYY.MM.DD">YYYY.MM.DD</option>
                                                             <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                                                             <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                                                         </select>
                                                         <select
                                                             value={extractDateFormatPart(formData.inboxDateFormat, 'exp')}
                                                             onChange={(e) => {
                                                                 const val = e.target.value;
                                                                 if (val) {
                                                                     setFormData({ ...formData, inboxDateFormat: applyDateFormatPreset(formData.inboxDateFormat, 'exp', val) });
                                                                 }
                                                             }}
                                                             disabled={!canEdit}
                                                             style={{ flex: 1, borderRadius: '4px', padding: '4px 6px', border: '1px solid #93c5fd', fontSize: '11.5px', backgroundColor: '#fff' }}
                                                         >
                                                             <option value="">-- Exp Date 프리셋 --</option>
                                                             <option value="YYYY.MM.DD까지">YYYY.MM.DD까지</option>
                                                             <option value="MM-DD-YYYY까지">MM-DD-YYYY까지</option>
                                                             <option value="DD.MM.YYYY까지">DD.MM.YYYY까지</option>
                                                             <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                         </select>
                                                     </div>
                                                     <textarea
                                                         value={formData.inboxDateFormat || ''}
                                                         onChange={e => setFormData({ ...formData, inboxDateFormat: e.target.value })}
                                                         placeholder="예: 제조일자: YYYY.MM.DD 표기&#10;사용기한: EXP YYYY.MM.DD까지 표기"
                                                         rows={3}
                                                         disabled={!canEdit}
                                                         style={{ width: '100%', borderRadius: '6px', padding: '6px', border: '1px solid #93c5fd', fontSize: '12px', backgroundColor: '#fff', lineHeight: 1.4 }}
                                                     />
                                                 </div>
                                             </div>

                                             {/* 3. 아웃박스 현품표 착인 / 표시 기재 사항 및 날짜 양식 */}
                                             <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                 <label style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a', display: 'block' }}>📦 아웃박스 현품표 착인 / 표시 기재 사항</label>
                                                 <select
                                                     onChange={(e) => {
                                                         const val = e.target.value;
                                                         if (val) {
                                                             const current = formData.outboxLabelMarkingRule ? formData.outboxLabelMarkingRule + '\n' : '';
                                                             setFormData({ ...formData, outboxLabelMarkingRule: current + val });
                                                         }
                                                     }}
                                                     disabled={!canEdit}
                                                     style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #93c5fd', fontSize: '12.5px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}
                                                 >
                                                     <option value="">-- 📦 아웃박스 현품표 기재 사항 프리셋 선택 --</option>
                                                     <option value="아웃박스 우측 상단 현품표 착인 (제조번호, 바코드, 사용기한 포함)">아웃박스 우측 상단 현품표 착인 (제조번호, 바코드, 사용기한 포함)</option>
                                                     <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                     <option value="그 외">그 외 (직접 별도 유형/목록 입력)</option>
                                                 </select>
                                                 <textarea
                                                     value={formData.outboxLabelMarkingRule || ''}
                                                     onChange={e => setFormData({ ...formData, outboxLabelMarkingRule: e.target.value })}
                                                     placeholder="예: 1. 아웃박스 우측 상단 현품표 착인 (제조번호, 바코드, 사용기한 포함)"
                                                     rows={3}
                                                     disabled={!canEdit}
                                                     style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', lineHeight: 1.4 }}
                                                 />

                                                 {/* 아웃박스 날짜 표기양식 */}
                                                 <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #bfdbfe', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                     <label style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8' }}>📦 아웃박스 날짜 표기양식 (제조일자 & 사용기한 각각 선택):</label>
                                                     <div style={{ display: 'flex', gap: '6px' }}>
                                                         <select
                                                             value={extractDateFormatPart(formData.outboxDateFormat, 'mfg')}
                                                             onChange={(e) => {
                                                                 const val = e.target.value;
                                                                 if (val) {
                                                                     setFormData({ ...formData, outboxDateFormat: applyDateFormatPreset(formData.outboxDateFormat, 'mfg', val) });
                                                                 }
                                                             }}
                                                             disabled={!canEdit}
                                                             style={{ flex: 1, borderRadius: '4px', padding: '4px 6px', border: '1px solid #93c5fd', fontSize: '11.5px', backgroundColor: '#fff' }}
                                                         >
                                                             <option value="">-- Mfg Date 프리셋 --</option>
                                                             <option value="YYYY.MM.DD">YYYY.MM.DD</option>
                                                             <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                                                             <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                                                         </select>
                                                         <select
                                                             value={extractDateFormatPart(formData.outboxDateFormat, 'exp')}
                                                             onChange={(e) => {
                                                                 const val = e.target.value;
                                                                 if (val) {
                                                                     setFormData({ ...formData, outboxDateFormat: applyDateFormatPreset(formData.outboxDateFormat, 'exp', val) });
                                                                 }
                                                             }}
                                                             disabled={!canEdit}
                                                             style={{ flex: 1, borderRadius: '4px', padding: '4px 6px', border: '1px solid #93c5fd', fontSize: '11.5px', backgroundColor: '#fff' }}
                                                         >
                                                             <option value="">-- Exp Date 프리셋 --</option>
                                                             <option value="YYYY.MM.DD까지">YYYY.MM.DD까지</option>
                                                             <option value="MM-DD-YYYY까지">MM-DD-YYYY까지</option>
                                                             <option value="DD.MM.YYYY까지">DD.MM.YYYY까지</option>
                                                             <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                         </select>
                                                     </div>
                                                     <textarea
                                                         value={formData.outboxDateFormat || ''}
                                                         onChange={e => setFormData({ ...formData, outboxDateFormat: e.target.value })}
                                                         placeholder="예: 제조일자: YYYY.MM.DD 표기&#10;사용기한: EXP YYYY.MM.DD까지 표기"
                                                         rows={3}
                                                         disabled={!canEdit}
                                                         style={{ width: '100%', borderRadius: '6px', padding: '6px', border: '1px solid #93c5fd', fontSize: '12px', backgroundColor: '#fff', lineHeight: 1.4 }}
                                                     />
                                                 </div>
                                             </div>

                                             {/* 4. 팔레트 현품표 착인 / 표시 기재 사항 및 날짜 양식 */}
                                             <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                 <label style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a', display: 'block' }}>🏷️ 팔레트 현품표 착인 / 표시 기재 사항</label>
                                                 <select
                                                     onChange={(e) => {
                                                         const val = e.target.value;
                                                         if (val) {
                                                             const current = formData.palletLabelMarkingRule ? formData.palletLabelMarkingRule + '\n' : '';
                                                             setFormData({ ...formData, palletLabelMarkingRule: current + val });
                                                         }
                                                     }}
                                                     disabled={!canEdit}
                                                     style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #93c5fd', fontSize: '12.5px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}
                                                 >
                                                     <option value="">-- 🏷️ 팔레트 현품표 기재 사항 프리셋 선택 --</option>
                                                     <option value="팔레트 랩핑 후 전면/측면 2면 현품표 부착 (제조일자, 사용기한 필수)">팔레트 랩핑 후 전면/측면 2면 현품표 부착 (제조일자, 사용기한 필수)</option>
                                                      <option value="팔레트 랩핑 후 전면 1면 현품표 부착 (제조일자, 사용기한 필수)">팔레트 랩핑 후 전면 1면 현품표 부착 (제조일자, 사용기한 필수)</option>
                                                     <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                     <option value="그 외">그 외 (직접 별도 유형/목록 입력)</option>
                                                 </select>
                                                 <textarea
                                                     value={formData.palletLabelMarkingRule || ''}
                                                     onChange={e => setFormData({ ...formData, palletLabelMarkingRule: e.target.value })}
                                                     placeholder="예: 1. 팔레트 랩핑 후 전면/측면 2면 현품표 부착 (제조일자, 사용기한 필수)"
                                                     rows={3}
                                                     disabled={!canEdit}
                                                     style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', lineHeight: 1.4 }}
                                                 />

                                                 {/* 팔레트 날짜 표기양식 */}
                                                 <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #bfdbfe', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                     <label style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8' }}>🏷️ 팔레트 날짜 표기양식 (제조일자 & 사용기한 각각 선택):</label>
                                                     <div style={{ display: 'flex', gap: '6px' }}>
                                                          <select
                                                              value={extractDateFormatPart(formData.palletDateFormat, 'mfg')}
                                                              onChange={(e) => {
                                                                  const val = e.target.value;
                                                                  if (val) {
                                                                      setFormData({ ...formData, palletDateFormat: applyDateFormatPreset(formData.palletDateFormat, 'mfg', val) });
                                                                  }
                                                              }}
                                                              disabled={!canEdit}
                                                              style={{ flex: 1, borderRadius: '4px', padding: '4px 6px', border: '1px solid #93c5fd', fontSize: '11.5px', backgroundColor: '#fff' }}
                                                          >
                                                             <option value="">-- Mfg Date 프리셋 --</option>
                                                             <option value="YYYY.MM.DD">YYYY.MM.DD</option>
                                                             <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                                                             <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                                                         </select>
                                                          <select
                                                              value={extractDateFormatPart(formData.palletDateFormat, 'exp')}
                                                              onChange={(e) => {
                                                                  const val = e.target.value;
                                                                  if (val) {
                                                                      setFormData({ ...formData, palletDateFormat: applyDateFormatPreset(formData.palletDateFormat, 'exp', val) });
                                                                  }
                                                              }}
                                                              disabled={!canEdit}
                                                              style={{ flex: 1, borderRadius: '4px', padding: '4px 6px', border: '1px solid #93c5fd', fontSize: '11.5px', backgroundColor: '#fff' }}
                                                          >
                                                             <option value="">-- Exp Date 프리셋 --</option>
                                                             <option value="YYYY.MM.DD까지">YYYY.MM.DD까지</option>
                                                             <option value="MM-DD-YYYY까지">MM-DD-YYYY까지</option>
                                                             <option value="DD.MM.YYYY까지">DD.MM.YYYY까지</option>
                                                             <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                         </select>
                                                     </div>
                                                     <textarea
                                                         value={formData.palletDateFormat || ''}
                                                         onChange={e => setFormData({ ...formData, palletDateFormat: e.target.value })}
                                                         placeholder="예: 제조일자: YYYY.MM.DD 표기&#10;사용기한: EXP YYYY.MM.DD까지 표기"
                                                         rows={3}
                                                         disabled={!canEdit}
                                                         style={{ width: '100%', borderRadius: '6px', padding: '6px', border: '1px solid #93c5fd', fontSize: '12px', backgroundColor: '#fff', lineHeight: 1.4 }}
                                                     />
                                                 </div>
                                             </div>

                                         </div>
                                     </div>

                                    {/* 항목화된 채널 포장 특이사항 영역 (단품 전용 특이사항만 노출) */}
                                    <div className="form-group" style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px solid #cbd5e1', fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif", WebkitFontSmoothing: 'antialiased' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                            <label style={{ fontWeight: '900', fontSize: '15px', color: '#0f172a', letterSpacing: '-0.3px' }}>
                                                📋 기타 일반 / 단품 포장 특이사항 (서식 및 첨부파일)
                                            </label>
                                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>입력 시 포장사양서 비고란에 자동 조합 출력됩니다.</span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            {categorizedNotes.length === 0 ? (
                                                <div style={{ gridColumn: 'span 2', padding: '20px', textOverflow: 'ellipsis', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
                                                    특이사항 항목을 로딩 중입니다... 
                                                    <button 
                                                        type="button" 
                                                        onClick={fetchCategoriesOnly} 
                                                        style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#1d4ed8', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}
                                                    >
                                                        [항목 목록 불러오기]
                                                    </button>
                                                </div>
                                            ) : (
                                                categorizedNotes
                                                .filter(item => {
                                                    const isSetCat = item.categoryKey?.startsWith('SET_') || item.categoryLabel?.includes('기획세트');
                                                    const isExpiry = item.categoryKey === 'EXPIRY_MARKING' || item.categoryLabel?.includes('사용기한 착인');
                                                    return !isSetCat && !isExpiry;
                                                })
                                                .map((item, idx) => {
                                                    const isSticker = item.categoryKey === 'CHANNEL_STICKER';
                                                    const isExpiry = item.categoryKey === 'EXPIRY_MARKING';

                                                    return (
                                                        <div key={item.categoryId || idx} style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <label style={{ fontWeight: '800', fontSize: '13.5px', color: '#1d4ed8', letterSpacing: '-0.2px' }}>
                                                                    [{item.categoryLabel}]
                                                                </label>

                                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                    <button
                                                                        type="button"
                                                                        title="글자 굵게"
                                                                        onClick={() => applyFormat(item.categoryId, 'bold')}
                                                                        style={{ padding: '2px 6px', fontWeight: 'bold', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f8fafc', cursor: 'pointer' }}
                                                                    >
                                                                        B
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        title="기울임"
                                                                        onClick={() => applyFormat(item.categoryId, 'italic')}
                                                                        style={{ padding: '2px 6px', fontStyle: 'italic', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f8fafc', cursor: 'pointer' }}
                                                                    >
                                                                        I
                                                                    </button>
                                                                    <input
                                                                        type="color"
                                                                        title="글자 색상 변경"
                                                                        onChange={(e) => applyFormat(item.categoryId, 'color', e.target.value)}
                                                                        style={{ width: '22px', height: '22px', border: 'none', background: 'none', cursor: 'pointer' }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {isSticker ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*,application/pdf"
                                                                            onChange={(e) => handleFileUpload(item.categoryId, e.target.files[0])}
                                                                            style={{ fontSize: '12px', flex: 1 }}
                                                                            disabled={!canEdit}
                                                                        />
                                                                    </div>

                                                                    {item.fileUrl && (
                                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                                            {item.fileType === 'PDF' || item.fileUrl.toLowerCase().endsWith('.pdf') ? (
                                                                                <div style={{ width: '54px', height: '54px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '12px', borderRadius: '6px' }}>
                                                                                    📄 PDF
                                                                                </div>
                                                                            ) : (
                                                                                <img
                                                                                    src={getFullFileUrl(item.fileUrl)}
                                                                                    alt="Sticker Thumbnail"
                                                                                    style={{ width: '54px', height: '54px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                                                                                />
                                                                            )}
                                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}>
                                                                                    채널 스티커 규정 파일 ({item.fileType || 'MEDIA'})
                                                                                </span>
                                                                                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
                                                                                    ✓ 백엔드 저장 완료
                                                                                </span>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setPreviewFile({ url: getFullFileUrl(item.fileUrl), type: item.fileType })}
                                                                                style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', color: '#fff', backgroundColor: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                                            >
                                                                                👁️ 미리보기
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setCategorizedNotes(categorizedNotes.map(n => n.categoryId === item.categoryId ? { ...n, fileUrl: null, fileType: null } : n))}
                                                                                style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 'bold', color: '#ef4444', backgroundColor: '#fff', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer' }}
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                    <textarea
                                                                        value={item.noteContent || ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setCategorizedNotes(categorizedNotes.map(n => n.categoryId === item.categoryId ? { ...n, noteContent: val } : n));
                                                                        }}
                                                                        placeholder="채널 스티커 관련 세부 설명 입력..."
                                                                        rows={2}
                                                                        disabled={!canEdit}
                                                                        style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                                                                    />
                                                                </div>
                                                            ) : isExpiry ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    <select
                                                                        value={item.expiryOption || (item.noteContent?.includes('LOT EXP YYYYMMDD') ? 'LOT EXP YYYYMMDD까지' : item.noteContent?.includes('LOT EXP DDMMYYYY') ? 'LOT EXP DDMMYYYY' : item.noteContent?.includes('LOT EXP MM-DD-YYYY') ? 'LOT EXP MM-DD-YYYY' : item.noteContent?.includes('표시금지') ? '표시금지(제조번호만 허용)' : item.noteContent ? '그 외' : '')}
                                                                        onChange={(e) => {
                                                                            const opt = e.target.value;
                                                                            setCategorizedNotes(categorizedNotes.map(n => {
                                                                                if (n.categoryId === item.categoryId) {
                                                                                    let content = opt !== '그 외' ? opt : n.customExpiryFormat || '';
                                                                                    return { ...n, expiryOption: opt, noteContent: content };
                                                                                }
                                                                                return n;
                                                                            }));
                                                                        }}
                                                                        disabled={!canEdit}
                                                                        style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#fff' }}
                                                                    >
                                                                        <option value="">-- 사용기한 착인 규정 선택 --</option>
                                                                        <option value="LOT EXP YYYYMMDD까지">LOT EXP YYYYMMDD까지</option>
                                                                        <option value="LOT EXP DDMMYYYY">LOT EXP DDMMYYYY</option>
                                                                        <option value="LOT EXP MM-DD-YYYY">LOT EXP MM-DD-YYYY</option>
                                                                        <option value="표시금지(제조번호만 허용)">표시금지(제조번호만 허용)</option>
                                                                        <option value="그 외">그 외 (직접 별도 유형 기재)</option>
                                                                    </select>
                                                                    {(item.expiryOption === '그 외' || (item.noteContent && !['LOT EXP YYYYMMDD까지','LOT EXP DDMMYYYY','LOT EXP MM-DD-YYYY','표시금지(제조번호만 허용)'].includes(item.noteContent))) && (
                                                                        <textarea
                                                                            value={item.noteContent || ''}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                setCategorizedNotes(categorizedNotes.map(n => n.categoryId === item.categoryId ? { ...n, customExpiryFormat: val, noteContent: val } : n));
                                                                            }}
                                                                            placeholder="별도 사용기한 착인 규정 입력..."
                                                                            rows={2}
                                                                            disabled={!canEdit}
                                                                            style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <textarea
                                                                    value={item.noteContent || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setCategorizedNotes(categorizedNotes.map(n => n.categoryId === item.categoryId ? { ...n, noteContent: val } : n));
                                                                    }}
                                                                    placeholder="해당 없음 (입력 시 포장사양서 비고란에 자동 출력)"
                                                                    rows={2}
                                                                    disabled={!canEdit}
                                                                    style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #cbd5e1', fontSize: '13px', lineHeight: 1.4, resize: 'vertical' }}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* 🎁 기획세트 포장 / 현품표 규격 탭 */}
                                    <div style={{ backgroundColor: '#f3e8ff', padding: '16px', borderRadius: '12px', border: '1px solid #d8b4fe', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#6b21a8' }}>🎁 [기획세트 전용] 용기/단상자/박스/팔레트 착인 및 현품표 상세 기준</h4>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#9333ea' }}>포장사양서 기획세트 항목에 직접 동기화됩니다.</span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#581c87', display: 'block', marginBottom: '4px' }}>기획세트 용기 / 단상자 표기사항</label>
                                                <textarea
                                                    value={formData.setContainerMarkingDisplay}
                                                    onChange={e => setFormData({ ...formData, setContainerMarkingDisplay: e.target.value })}
                                                    placeholder="예: 세트 구성품 표기사항 및 세트용 바코드 표시"
                                                    rows={2}
                                                    disabled={!canEdit}
                                                    style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #c084fc', fontSize: '12.5px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#581c87', display: 'block', marginBottom: '4px' }}>기획세트 단상자 / 용기 착인 기준</label>
                                                <textarea
                                                    value={formData.setUnitBoxMarkingRule}
                                                    onChange={e => setFormData({ ...formData, setUnitBoxMarkingRule: e.target.value })}
                                                    placeholder="예: 기획세트 단상자 측면 착인 (제조번호, 사용기한, 구성품 개별 착인 여부)"
                                                    rows={2}
                                                    disabled={!canEdit}
                                                    style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #c084fc', fontSize: '12.5px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#581c87', display: 'block', marginBottom: '4px' }}>기획세트 인박스 현품표 착인 / 기재 내용</label>
                                                <textarea
                                                    value={formData.setInboxLabelMarkingRule}
                                                    onChange={e => setFormData({ ...formData, setInboxLabelMarkingRule: e.target.value })}
                                                    placeholder="예: 기획세트 인박스 현품표에 세트 구성품 세부 목록 및 수량 기재"
                                                    rows={2}
                                                    disabled={!canEdit}
                                                    style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #c084fc', fontSize: '12.5px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#581c87', display: 'block', marginBottom: '4px' }}>기획세트 아웃박스 현품표 착인 / 기재 내용</label>
                                                <textarea
                                                    value={formData.setOutboxLabelMarkingRule}
                                                    onChange={e => setFormData({ ...formData, setOutboxLabelMarkingRule: e.target.value })}
                                                    placeholder="예: 기획세트 전용 아웃박스 현품표 착인 (기획세트 코드, LOT, 사용기한)"
                                                    rows={2}
                                                    disabled={!canEdit}
                                                    style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #c084fc', fontSize: '12.5px' }}
                                                />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#581c87', display: 'block', marginBottom: '4px' }}>기획세트 팔레트 현품표 착인 / 기재 내용</label>
                                                <textarea
                                                    value={formData.setPalletLabelMarkingRule}
                                                    onChange={e => setFormData({ ...formData, setPalletLabelMarkingRule: e.target.value })}
                                                    placeholder="예: 기획세트 팔레트 전면/후면 현품표 부착 (기획세트명, 총 박스수량, 사용기한)"
                                                    rows={2}
                                                    disabled={!canEdit}
                                                    style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #c084fc', fontSize: '12.5px' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '6px' }}>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#581c87', display: 'block', marginBottom: '4px' }}>기획세트 완충재 기준</label>
                                                <input
                                                    type="text"
                                                    value={formData.setCushioningStandard}
                                                    onChange={e => setFormData({ ...formData, setCushioningStandard: e.target.value })}
                                                    placeholder="예: 에어캡 파우치 개별 포장"
                                                    disabled={!canEdit}
                                                    style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #c084fc', fontSize: '12.5px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#581c87', display: 'block', marginBottom: '4px' }}>기획세트 적재 높이 제한</label>
                                                <input
                                                    type="text"
                                                    value={formData.setPalletHeightLimit}
                                                    onChange={e => setFormData({ ...formData, setPalletHeightLimit: e.target.value })}
                                                    placeholder="예: 1,200 mm 이하 제한"
                                                    disabled={!canEdit}
                                                    style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #c084fc', fontSize: '12.5px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#581c87', display: 'block', marginBottom: '4px' }}>기획세트 스티커 부착 기준</label>
                                                <input
                                                    type="text"
                                                    value={formData.setChannelStickerStandard}
                                                    onChange={e => setFormData({ ...formData, setChannelStickerStandard: e.target.value })}
                                                    placeholder="예: 기획세트 전용 바코드 스티커 상단 부착"
                                                    disabled={!canEdit}
                                                    style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #c084fc', fontSize: '12.5px' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 기획세트 전용 동적 특이사항 영역 */}
                                    {categorizedNotes.some(item => item.categoryKey?.startsWith('SET_') || item.categoryLabel?.includes('기획세트')) && (
                                        <div className="form-group" style={{ backgroundColor: '#faf5ff', padding: '20px', borderRadius: '14px', border: '1px solid #d8b4fe', fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif", WebkitFontSmoothing: 'antialiased' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                                <label style={{ fontWeight: '900', fontSize: '15px', color: '#6b21a8', letterSpacing: '-0.3px' }}>
                                                    📋 기획세트 전용 포장 특이사항 (서식 및 추가 항목)
                                                </label>
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#7e22ce' }}>기획세트 사양서 비고란에 자동 출력을 위한 추가 항목입니다.</span>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                {categorizedNotes
                                                    .filter(item => item.categoryKey?.startsWith('SET_') || item.categoryLabel?.includes('기획세트'))
                                                    .map((item, idx) => (
                                                        <div key={item.categoryId || idx} style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e9d5ff', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <label style={{ fontWeight: '800', fontSize: '13.5px', color: '#7c3aed', letterSpacing: '-0.2px' }}>
                                                                    [{item.categoryLabel}]
                                                                </label>
                                                            </div>
                                                            <textarea
                                                                value={item.noteContent || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setCategorizedNotes(categorizedNotes.map(n => n.categoryId === item.categoryId ? { ...n, noteContent: val } : n));
                                                                }}
                                                                placeholder="기획세트 특이사항 세부 내용 입력..."
                                                                rows={2}
                                                                disabled={!canEdit}
                                                                style={{ width: '100%', borderRadius: '6px', padding: '8px', border: '1px solid #d8b4fe', fontSize: '13px', lineHeight: 1.4, resize: 'vertical' }}
                                                            />
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

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

                            </form>
                        </div>

                        {/* 4. Fixed Modal Footer */}
                        <div className="modal-footer" style={{ padding: '16px 30px', borderTop: '1px solid #edf2f7' }}>
                            <div className="footer-left">
                                <span>🏷️ 채널: <strong>{formData.name || formData.channelCode || '신규'}</strong></span>
                            </div>
                            <div className="footer-actions">
                                <button type="button" className="secondary" onClick={() => setShowDrawer(false)} style={{ minWidth: '80px' }}>
                                    닫기
                                </button>
                                <button 
                                    type="submit" 
                                    form="sales-channel-form"
                                    className="primary" 
                                    style={{ 
                                        minWidth: '120px', 
                                        background: '#003366', 
                                        color: '#fff', 
                                        border: 'none', 
                                        borderRadius: '4px', 
                                        fontWeight: 'bold', 
                                        padding: '10px 20px',
                                        opacity: canEdit ? 1 : 0.5,
                                        cursor: canEdit ? 'pointer' : 'not-allowed'
                                    }} 
                                    disabled={!canEdit}
                                >
                                    {canEdit ? (editingChannel ? '💾 채널 정보 수정' : '🆕 채널 등록 완료') : '🚫 조회 전용'}
                                </button>
                            </div>
                        </div>
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

            {/* 스티커 첨부 파일 미리보기 모달 (PDF / 이미지 뷰어) */}
            {previewFile && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '80vw', height: '85vh', backgroundColor: '#fff', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                                🏷️ 채널 스티커 첨부 규정 미리보기 ({previewFile.type})
                            </h3>
                            <button
                                onClick={() => setPreviewFile(null)}
                                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                            {previewFile.type === 'PDF' || previewFile.url?.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={previewFile.url} title="PDF Viewer" style={{ width: '100%', height: '100%', border: 'none' }} />
                            ) : (
                                <img src={previewFile.url} alt="Sticker Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesChannelManagement;
