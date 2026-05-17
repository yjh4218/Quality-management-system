import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import * as api from './api';
import { toast } from 'react-toastify';
import RuleRegistrationDrawer from './RuleRegistrationDrawer';
import { usePermissions } from './usePermissions';

/**
 * 채널별 포장 규칙 관리 페이지
 * [디자인 표준화] 제품코드 마스터의 20px 여백 및 그리드+팝업 UX를 적용했습니다.
 * [UX 개선] 사이드바 레이아웃 대신 전체 채널 그리드를 제공하며, 더블클릭 시 해당 채널의 포장 규칙을 팝업(Drawer)으로 관리합니다.
 */
const PackagingRulePage = ({ user }) => {
    const { canEdit: canEditFn } = usePermissions(user);
    const canManageRules = canEditFn('packagingRules');

    const [channels, setChannels] = useState([]);
    const [rules, setRules] = useState([]);
    const [stickers, setStickers] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [quickFilterText, setQuickFilterText] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [channelsRes, rulesRes, stickersRes] = await Promise.all([
                api.getSalesChannels(),
                api.getMasterRules(),
                api.getMasterStickers()
            ]);
            
            const activeChannels = channelsRes.data.filter(c => c.active);
            setChannels(activeChannels);
            setRules(rulesRes.data);
            setStickers(stickersRes.data);
        } catch (error) {
            toast.error("데이터를 불러오지 못했습니다.");
        }
    };

    const handleRowDoubleClicked = (params) => {
        setSelectedChannel(params.data);
        setIsDrawerOpen(true);
    };

    const columnDefs = useMemo(() => [
        { field: "id", headerName: "ID", width: 80, pinned: 'left' },
        { field: "name", headerName: "유통 채널명", flex: 1, filter: true, cellStyle: { fontWeight: '800', color: '#1a202c' } },
        { field: "description", headerName: "채널 설명", flex: 2, filter: true },
        { 
            headerName: "설정된 규칙 수", 
            width: 140, 
            valueGetter: (params) => rules.filter(r => r.channel?.id === params.data.id).length + "개"
        },
        { 
            headerName: "스티커 등록", 
            width: 120, 
            cellRenderer: (params) => (
                stickers.some(s => s.channel?.id === params.data.id) 
                ? <span className="badge success">등록됨</span> 
                : <span className="badge warning">미등록</span>
            )
        },
        {
            headerName: "관리",
            width: 140,
            sortable: false,
            filter: false,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
                    <button 
                        className="secondary" 
                        onClick={() => { setSelectedChannel(params.data); setIsDrawerOpen(true); }}
                        style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '800' }}
                    >
                        규칙 관리
                    </button>
                </div>
            )
        }
    ], [rules, stickers]);

    return (
        <div className="page-container" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
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
                {/* 1단계: 상단 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            📑 채널별 포장 규칙 관리
                        </h2>
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
                        각 유통 채널별 특수 포장 요구사항 및 분류 스티커를 관리합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="primary" 
                            onClick={fetchData} 
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            🔍 조회
                        </button>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '25px', borderRadius: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: '#475569' }}>
                        활성 채널 목록 <span style={{ color: 'var(--primary-color)', marginLeft: '8px' }}>{channels.length}</span>
                    </div>
                    <div className="search-bar-standard" style={{ padding: '0', border: 'none', boxShadow: 'none', margin: 0, width: '350px' }}>
                        <div style={{ display: 'flex', width: '100%', position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="채널명으로 검색..."
                                value={quickFilterText}
                                onChange={(e) => setQuickFilterText(e.target.value)}
                                style={{ padding: '12px 45px 12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', width: '100%', fontWeight: '600' }}
                            />
                            <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
                        </div>
                    </div>
                </div>

                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', minHeight: '500px' }}>
                    <AgGridReact
                        theme="legacy"
                        rowHeight={55}
                        rowData={channels}
                        columnDefs={columnDefs}
                        pagination={true}
                        paginationPageSize={50}
                        quickFilterText={quickFilterText}
                        animateRows={true}
                        onRowDoubleClicked={handleRowDoubleClicked}
                    />
                </div>
            </div>

            {isDrawerOpen && (
                <RuleRegistrationDrawer 
                    initialChannel={selectedChannel}
                    onClose={(saved) => {
                        setIsDrawerOpen(false);
                        if (saved) fetchData();
                    }}
                    user={user}
                />
            )}
        </div>
    );
};

export default PackagingRulePage;
