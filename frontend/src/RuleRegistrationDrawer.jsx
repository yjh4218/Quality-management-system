import React, { useState, useEffect } from 'react';
import * as api from './api';
import { toast } from 'react-toastify';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';

const RULE_TYPES = [
    { value: 'MAX_BOX_HEIGHT', label: '최대 박스 높이' },
    { value: 'STICKER_REQUIRED', label: '스티커 부착 필수' },
    { value: 'PALLET_SPEC', label: '지정 팔레트 규격' },
    { value: 'LOAD_HEIGHT', label: '적재 높이 제한' },
    { value: 'LABELING', label: '라벨링/착인 규칙' },
    { value: 'PACKAGING', label: '포장재 사양 규칙' },
    { value: 'PROMOTION', label: 'PROMOTION/기획세트 규칙' },
    { value: 'ETC', label: '기타' }
];

const RuleRegistrationDrawer = ({ initialChannel, onClose, user }) => {
    const [channels, setChannels] = useState([]);
    const [channelRules, setChannelRules] = useState([]);
    const [editingRule, setEditingRule] = useState(null);
    const [formData, setFormData] = useState({
        channel: initialChannel || null,
        ruleType: '',
        ruleValue: '',
        warningMessage: ''
    });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const { canEdit: canEditRule } = usePermissions(user);
    const canEdit = canEditRule('packagingRules');

    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const res = await api.getSalesChannels();
                const activeOnes = res.data.filter(c => c.active);
                setChannels(activeOnes);
                if (initialChannel) {
                    setFormData(prev => ({ ...prev, channel: initialChannel }));
                    fetchRulesForChannel(initialChannel.id);
                }
            } catch (err) {
                toast.error("채널 목록을 불러오지 못했습니다.");
            }
        };
        fetchChannels();
    }, [initialChannel]);

    const fetchRulesForChannel = async (channelId) => {
        try {
            const res = await api.getMasterRules();
            const filtered = res.data.filter(r => r.channel && String(r.channel.id) === String(channelId));
            setChannelRules(filtered);
        } catch (error) {
            toast.error("채널 규칙 조회 실패");
        }
    };

    const handleSelectRule = (rule) => {
        setEditingRule(rule);
        setFormData({
            id: rule.id,
            channel: rule.channel,
            ruleType: rule.ruleType || '',
            ruleValue: rule.ruleValue || '',
            warningMessage: rule.warningMessage || '',
            createdAt: rule.createdAt,
            updatedAt: rule.updatedAt
        });
    };

    const handleResetForm = () => {
        setEditingRule(null);
        setFormData({
            channel: initialChannel || formData.channel,
            ruleType: '',
            ruleValue: '',
            warningMessage: ''
        });
    };

    const handleDeleteRule = async (ruleId) => {
        if (!window.confirm("이 규칙을 정말 삭제하시겠습니까?")) return;
        try {
            await api.deleteMasterRule(ruleId);
            toast.success("규칙이 성공적으로 삭제되었습니다.");
            if (formData.channel) {
                fetchRulesForChannel(formData.channel.id);
            }
            handleResetForm();
        } catch (error) {
            toast.error("규칙 삭제 실패");
        }
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (!formData.channel) {
            toast.warning("유통 채널을 선택해주세요.");
            return;
        }
        setIsConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsConfirmOpen(false);
        try {
            await api.saveMasterRule(formData);
            toast.success("포장 규칙이 저장되었습니다.");
            if (formData.channel) {
                fetchRulesForChannel(formData.channel.id);
            }
            handleResetForm();
        } catch (error) {
            toast.error("규칙 저장 실패: " + (error.response?.data || error.message));
        }
    };

    return (
        <div className="drawer-overlay" style={{ animation: 'fadeIn 0.25s ease' }}>
            <div className="drawer" onClick={(e) => e.stopPropagation()} style={{ width: '1350px', display: 'flex', flexDirection: 'column' }}>
                
                {/* 1. Header */}
                <div className="drawer-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>⚖️</span>
                        <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#1e293b' }}>
                            [{formData.channel?.name || '채널 선택 필요'}] 포장 규칙 설정 및 관리
                        </h2>
                    </div>
                    <button onClick={() => onClose(true)} className="secondary close-button" style={{ border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>
                        &times;
                    </button>
                </div>

                {/* 2. Scrollable Body: Dual Pane Layout */}
                <div className="drawer-body" style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 0 }}>
                    
                    {/* Left Pane: Rule List */}
                    <div style={{ flex: 1, borderRight: '1px solid #e2e8f0', padding: '20px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#475569' }}>
                                등록된 규칙 리스트 ({channelRules.length})
                            </h3>
                            {canEdit && (
                                <button type="button" onClick={handleResetForm} className="primary" style={{ padding: '6px 12px', fontSize: '11px', background: '#2563eb' }}>
                                    + 규칙 추가
                                </button>
                            )}
                        </div>

                        {channelRules.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 20px', fontSize: '13px' }}>
                                현재 채널에 등록된 포장 규칙이 없습니다.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {channelRules.map(r => {
                                    const rType = RULE_TYPES.find(t => t.value === r.ruleType);
                                    const isSelected = editingRule?.id === r.id;
                                    return (
                                        <div 
                                            key={r.id} 
                                            onClick={() => handleSelectRule(r)}
                                            style={{ 
                                                padding: '12px 16px', 
                                                borderRadius: '10px', 
                                                border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`, 
                                                background: '#fff', 
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: isSelected ? '0 4px 6px -1px rgba(59, 130, 246, 0.1)' : 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                                                    {rType ? rType.label : r.ruleType}
                                                </span>
                                                {canEdit && (
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteRule(r.id); }}
                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                                    >
                                                        삭제
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>
                                                값: {r.ruleValue || '(없음)'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'pre-line', overflow: 'visible', marginTop: '6px', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                                                {r.warningMessage}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Pane: Form Editor */}
                    <div style={{ flex: 1.2, padding: '20px', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '800', color: '#475569' }}>
                            {editingRule ? '🛠️ 규칙 수정 및 상세 정보' : '🆕 신규 규칙 작성'}
                        </h3>
                        <form id="rule-registration-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>유통 채널</label>
                                <input type="text" readOnly value={formData.channel?.name || ''} style={{ background: '#f8fafc', fontSize: '13px' }} />
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>규칙 종류 (Rule Type)</label>
                                <select 
                                    value={formData.ruleType} 
                                    onChange={e => setFormData({...formData, ruleType: e.target.value})}
                                    required
                                    style={{ fontSize: '13px', height: '40px' }}
                                    disabled={!canEdit}
                                >
                                    <option value="">선택하세요</option>
                                    {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>규칙 값 (Rule Value)</label>
                                <input 
                                    value={formData.ruleValue} 
                                    onChange={e => setFormData({...formData, ruleValue: e.target.value})} 
                                    placeholder="예: 1500 (높이제한), AJU (지정팔레트) 등" 
                                    style={{ fontSize: '13px', height: '40px' }}
                                    disabled={!canEdit}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>경고/안내 문구 (Warning Message)</label>
                                <textarea 
                                    value={formData.warningMessage} 
                                    onChange={e => setFormData({...formData, warningMessage: e.target.value})} 
                                    placeholder="사양서 작성 중 규칙 위반 시 경고하거나 작업자 표준서 내에 표기될 내용을 적으세요." 
                                    style={{ height: '100px', fontSize: '13px', lineHeight: '1.5' }}
                                    required
                                    disabled={!canEdit}
                                />
                            </div>

                            {canEdit && (
                                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                    {editingRule && (
                                        <button type="button" onClick={handleResetForm} className="secondary" style={{ marginRight: '8px', fontSize: '12px', padding: '8px 16px' }}>
                                            취소
                                        </button>
                                    )}
                                    <button type="submit" className="primary" style={{ fontSize: '12px', padding: '8px 24px', background: '#10b981', color: '#fff', border: 'none' }}>
                                        {editingRule ? '💾 규칙 변경 저장' : '💾 새 규칙 저장'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* 3. Footer */}
                {editingRule && (
                    <div className="drawer-footer" style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '15px' }}>
                        <span>📅 등록: {formData.createdAt ? formData.createdAt.substring(0, 16).replace('T', ' ') : '-'}</span>
                        <span>🔄 수정: {formData.updatedAt ? formData.updatedAt.substring(0, 16).replace('T', ' ') : '-'}</span>
                    </div>
                )}
            </div>

            <SaveConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmSave}
            />
        </div>
    );
};

export default RuleRegistrationDrawer;
