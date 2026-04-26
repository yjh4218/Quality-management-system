import React, { useState, useEffect } from 'react';
import * as api from './api';
import { toast } from 'react-toastify';
import RuleRegistrationDrawer from './RuleRegistrationDrawer';
import { usePermissions } from './usePermissions';

const RULE_TYPE_LABELS = {
    'MAX_BOX_HEIGHT': '최대 박스 높이',
    'STICKER_REQUIRED': '스티커 부착 필수',
    'PALLET_SPEC': '지정 팔레트 규격',
    'LOAD_HEIGHT': '적재 높이 제한',
    'LABELING': '라벨링/착인 규칙',
    'PACKAGING': '포장재 사양 규칙',
    'PROMOTION': '프로모션/기획세트 규칙',
    'ETC': '기타'
};

const PackagingRulePage = ({ user }) => {
    const { canEdit: canEditFn } = usePermissions(user);
    const canManageRules = canEditFn('packagingRules');

    const [rules, setRules] = useState([]);
    const [stickers, setStickers] = useState([]);
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState('');
    const [activeTab, setActiveTab] = useState('rules'); // 'rules' or 'stickers'
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedRule, setSelectedRule] = useState(null);
    const [isStickerLoading, setIsStickerLoading] = useState(false);

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
            
            if (activeChannels.length > 0 && !activeChannel) {
                setActiveChannel(activeChannels[0]);
            }
        } catch (error) {
            toast.error("데이터를 불러오지 못했습니다.");
        }
    };

    const handleCreateNewRule = () => {
        setSelectedRule(null);
        setIsDrawerOpen(true);
    };

    const handleEditRule = (rule) => {
        setSelectedRule(rule);
        setIsDrawerOpen(true);
    };

    const handleStickerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !activeChannel) return;

        setIsStickerLoading(true);
        try {
            const uploadRes = await api.uploadMasterFile(file, `STICKER_${activeChannel.id}`);
            const imageUrl = uploadRes.data;
            
            // 기존 스티커가 있으면 업데이트, 없으면 새로 생성
            const existingSticker = stickers.find(s => s.channel?.id === activeChannel.id);
            await api.saveMasterSticker({
                id: existingSticker?.id,
                channel: { id: activeChannel.id },
                imagePath: imageUrl
            });
            
            toast.success(`${activeChannel.name} 채널 스티커가 업데이트되었습니다.`);
            fetchData();
        } catch (error) {
            toast.error("스티커 업로드 실패");
        } finally {
            setIsStickerLoading(false);
        }
    };

    const activeRules = rules.filter(r => r.channel?.id === activeChannel?.id);
    const activeSticker = stickers.find(s => s.channel?.id === activeChannel?.id);

    return (
        <div className="page-container" style={{ display: 'flex', height: 'calc(100vh - 80px)', overflow: 'hidden', padding: 0 }}>
            {/* Sidebar: Channel List */}
            <aside style={{ width: '280px', borderRight: '1px solid #edf2f7', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #edf2f7' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>📍 채널 목록</h3>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#718096' }}>규칙을 관리할 채널을 선택하세요.</p>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {channels.map(ch => (
                        <button
                            key={ch.id}
                            onClick={() => setActiveChannel(ch)}
                            style={{
                                width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: '8px', marginBottom: '4px',
                                border: 'none', background: (activeChannel?.id === ch.id) ? '#fff' : 'transparent',
                                color: (activeChannel?.id === ch.id) ? '#3182ce' : '#4a5568',
                                fontWeight: (activeChannel?.id === ch.id) ? 'bold' : 'normal',
                                boxShadow: (activeChannel?.id === ch.id) ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            {ch.name}
                        </button>
                    ))}
                    <button 
                        className="outline" 
                        style={{ width: '100%', marginTop: '12px', fontSize: '12px', opacity: canManageRules ? 1 : 0.5 }} 
                        onClick={handleCreateNewRule}
                        disabled={!canManageRules}
                    >
                        + 새 채널/규칙 추가
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
                <header style={{ padding: '24px', borderBottom: '1px solid #edf2f7' }}>
                    {/* [Feature] 메인 페이지 제목 추가 */}
                    <div style={{ marginBottom: '24px', borderBottom: '2px solid #3182ce', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#2d3748' }}>📑 채널별 포장 규칙 관리</h2>
                        <span style={{ fontSize: '12px', color: '#718096', fontWeight: 'normal' }}>통합 물류 및 패키징 요구사항</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{activeChannel?.name || '채널 선택'}</h1>
                            <p style={{ margin: '4px 0 0 0', color: '#718096' }}>채널별 특수 포장 요구사항 및 분류 스티커 관리</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                                <button 
                                    onClick={() => setActiveTab('rules')}
                                    style={{
                                        padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                        background: activeTab === 'rules' ? '#fff' : 'transparent',
                                        boxShadow: activeTab === 'rules' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                        fontWeight: activeTab === 'rules' ? '600' : 'normal'
                                    }}
                                >
                                    ⚖️ 포장 규칙
                                </button>
                                <button 
                                    onClick={() => setActiveTab('stickers')}
                                    style={{
                                        padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                        background: activeTab === 'stickers' ? '#fff' : 'transparent',
                                        boxShadow: activeTab === 'stickers' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                        fontWeight: activeTab === 'stickers' ? '600' : 'normal'
                                    }}
                                >
                                    🏷️ 분류 스티커
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {!activeChannel ? (
                        <div style={{ textAlign: 'center', padding: '100px', color: '#a0aec0' }}>좌측에서 채널을 선택해 주세요.</div>
                    ) : (
                        activeTab === 'rules' ? (
                            <div className="card" style={{ padding: 0 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ padding: '15px', textAlign: 'left' }}>규칙 종류</th>
                                            <th style={{ padding: '15px', textAlign: 'left' }}>값</th>
                                            <th style={{ padding: '15px', textAlign: 'left' }}>안내/경고 메시지</th>
                                            <th style={{ padding: '15px', textAlign: 'center' }}>관리</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeRules.length === 0 ? (
                                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '50px', color: '#cbd5e0' }}>등록된 규칙이 없습니다.</td></tr>
                                        ) : (
                                            activeRules.map(r => (
                                                <tr key={r.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                                                    <td style={{ padding: '15px' }}>
                                                        <span className="badge" style={{ background: '#ebf8ff', color: '#2b6cb0' }}>
                                                            {RULE_TYPE_LABELS[r.ruleType] || r.ruleType}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{r.ruleValue || '-'}</td>
                                                    <td style={{ padding: '15px', color: '#e53e3e', fontSize: '13px' }}>{r.warningMessage}</td>
                                                    <td style={{ padding: '15px', textAlign: 'center' }}>
                                                        <button 
                                                            className="outline" 
                                                            onClick={() => handleEditRule(r)}
                                                            style={{ opacity: canManageRules ? 1 : 0.5 }}
                                                            disabled={!canManageRules}
                                                        >
                                                            수정
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                <div style={{ padding: '16px', borderTop: '1px solid #edf2f7', textAlign: 'right' }}>
                                    <button 
                                        className="primary" 
                                        onClick={handleCreateNewRule}
                                        style={{ opacity: canManageRules ? 1 : 0.5 }}
                                        disabled={!canManageRules}
                                    >
                                        + 규칙 추가
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                                <h3 style={{ marginBottom: '20px' }}>🏷️ {activeChannel.name} 채널 분류 스티커</h3>
                                {activeSticker ? (
                                    <div style={{ marginBottom: '24px' }}>
                                        <img src={activeSticker.imagePath} alt="Sticker" style={{ maxWidth: '300px', borderRadius: '8px', border: '1px solid #edf2f7' }} />
                                    </div>
                                ) : (
                                    <div style={{ padding: '40px', background: '#f7fafc', borderRadius: '8px', marginBottom: '24px', color: '#718096' }}>
                                        등록된 스티커 이미지가 없습니다.
                                    </div>
                                )}
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <input 
                                        type="file" 
                                        onChange={handleStickerUpload} 
                                        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: canManageRules ? 'pointer' : 'default' }} 
                                        disabled={isStickerLoading || !canManageRules}
                                    />
                                    <button className="secondary" style={{ pointerEvents: 'none', opacity: canManageRules ? 1 : 0.5 }}>
                                        {isStickerLoading ? '업로드 중...' : '이미지 변경/업로드 (최대 10MB)'}
                                    </button>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </main>

            {isDrawerOpen && (
                <RuleRegistrationDrawer 
                    rule={selectedRule} 
                    initialChannel={activeChannel}
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
