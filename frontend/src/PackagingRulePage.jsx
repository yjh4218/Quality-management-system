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
        window.__QMS_ACTIVE_PAGE__ = '📑 채널별 포장 규칙 관리';
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [channelsResult, rulesResult, stickersResult] = await Promise.allSettled([
                api.getSalesChannels(),
                api.getMasterRules(),
                api.getMasterStickers()
            ]);
            
            const channelsRes = channelsResult.status === 'fulfilled' ? channelsResult.value : { data: [] };
            const rulesRes = rulesResult.status === 'fulfilled' ? rulesResult.value : { data: [] };
            const stickersRes = stickersResult.status === 'fulfilled' ? stickersResult.value : { data: [] };

            const rawChannels = channelsRes?.data || [];
            const activeChannels = Array.isArray(rawChannels) ? rawChannels.filter(c => c.active) : [];
            setChannels(activeChannels);
            setRules(Array.isArray(rulesRes?.data) ? rulesRes.data : []);
            setStickers(Array.isArray(stickersRes?.data) ? stickersRes.data : []);
        } catch (error) {
            console.error("채널별 포장 규칙 데이터 파싱 실패:", error);
        }
    };

    const handleRowDoubleClicked = (params) => {
        setSelectedChannel(params.data);
        setIsDrawerOpen(true);
    };

    const rulesByChannel = useMemo(() => {
        const map = {};
        rules.forEach(r => {
            if (r.channel && r.channel.id) {
                const channelId = String(r.channel.id);
                if (!map[channelId]) {
                    map[channelId] = {};
                }
                map[channelId][r.ruleType] = r;
            }
        });
        return map;
    }, [rules]);

    const getRuleValue = useCallback((channelId, ruleType) => {
        const channelRules = rulesByChannel[String(channelId)];
        return channelRules && channelRules[ruleType] ? channelRules[ruleType].ruleValue : '-';
    }, [rulesByChannel]);

    const columnDefs = useMemo(() => [
        { field: "id", headerName: "ID", width: 80, pinned: 'left' },
        { field: "name", headerName: "유통 채널명", width: 150, filter: true, pinned: 'left', cellStyle: { fontWeight: '800', color: '#1a202c' } },
        { field: "description", headerName: "채널 설명", width: 200, filter: true },
        { 
            headerName: "팔레트 규격", 
            width: 250, 
            valueGetter: (params) => getRuleValue(params.data.id, 'PALLET_SPEC'),
            wrapText: true,
            autoHeight: true,
            cellStyle: { lineHeight: '20px', padding: '8px 0', fontSize: '13px' }
        },
        { 
            headerName: "스티커 여부", 
            width: 120, 
            cellRenderer: (params) => {
                const val = getRuleValue(params.data.id, 'STICKER_REQUIRED');
                if (val === '부착') {
                    return <span className="badge success" style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>부착</span>;
                } else if (val === '미부착') {
                    return <span className="badge neutral" style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '13px', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold' }}>미부착</span>;
                }
                return <span style={{ color: '#94a3b8' }}>-</span>;
            }
        },
        { 
            headerName: "적재 높이", 
            width: 200, 
            valueGetter: (params) => getRuleValue(params.data.id, 'LOAD_HEIGHT'),
            wrapText: true,
            autoHeight: true,
            cellStyle: { lineHeight: '20px', padding: '8px 0', fontSize: '13px' }
        },
        { 
            headerName: "사용기한 포맷", 
            width: 160, 
            valueGetter: (params) => getRuleValue(params.data.id, 'LABELING'),
            cellStyle: { fontSize: '13px' }
        },
        { 
            headerName: "설정된 규칙 수", 
            width: 120, 
            valueGetter: (params) => {
                const channelRules = rulesByChannel[String(params.data.id)];
                return channelRules ? Object.keys(channelRules).length + "개" : "0개";
            }
        },
        { 
            headerName: "스티커 등록", 
            width: 120, 
            cellRenderer: (params) => (
                stickers.some(s => s.channel && String(s.channel.id) === String(params.data.id)) 
                ? <span className="badge success" style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>등록됨</span> 
                : <span className="badge warning" style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>미등록</span>
            )
        },
        {
            headerName: "관리",
            width: 120,
            sortable: false,
            filter: false,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
                    <button 
                        className="secondary" 
                        onClick={() => { setSelectedChannel(params.data); setIsDrawerOpen(true); }}
                        style={{ padding: '6px 14px', fontSize: '13px', fontWeight: '800', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        규칙 관리
                    </button>
                </div>
            )
        }
    ], [rulesByChannel, stickers, getRuleValue]);

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
                        rowHeight={54}
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
