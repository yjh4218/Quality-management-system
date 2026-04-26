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
    { value: 'PROMOTION', label: '프로모션/기획세트 규칙' },
    { value: 'ETC', label: '기타' }
];

const RuleRegistrationDrawer = ({ rule, initialChannel, onClose, user }) => {
    const isMobile = window.innerWidth <= 768;
    const [channels, setChannels] = useState([]);
    const [formData, setFormData] = useState({
        channel: initialChannel || null,
        ruleType: '',
        ruleValue: '',
        warningMessage: ''
    });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const { canEdit: canEditRule } = usePermissions(user);
    const canEdit = canEditRule('ruleManagement');

    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const res = await api.getSalesChannels();
                const activeOnes = res.data.filter(c => c.active);
                setChannels(activeOnes);
                // initialChannel이 있다면 해당 객체를 찾아서 설정
                if (initialChannel && !formData.channel) {
                   setFormData(prev => ({...prev, channel: initialChannel }));
                }
            } catch (err) {
                toast.error("채널 목록을 불러오지 못했습니다.");
            }
        };
        fetchChannels();
    }, [initialChannel]);

    useEffect(() => {
        if (rule) {
            setFormData({
                id: rule.id,
                channel: rule.channel || null,
                ruleType: rule.ruleType || '',
                ruleValue: rule.ruleValue || '',
                warningMessage: rule.warningMessage || '',
                createdAt: rule.createdAt || '',
                updatedAt: rule.updatedAt || ''
            });
        }
    }, [rule]);

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
            toast.success("채널별 포장 규칙이 저장되었습니다.");
            onClose(true);
        } catch (error) {
            toast.error("규칙 저장 실패: " + (error.response?.data || error.message));
        }
    };

    return (
        <div className="drawer-overlay" onClick={() => onClose()}>
            <div className="drawer" onClick={(e) => e.stopPropagation()} style={{ width: '600px' }}>
                {/* 1. Fixed Header Area */}
                <div className="drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h2>{rule ? '⚖️ 규칙 수정' : '🆕 신규 채널 규칙 등록'}</h2>
                    </div>
                    <button onClick={() => onClose()} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Scrollable Body Area */}
                <div className="drawer-body">
                    <form id="rule-registration-form" onSubmit={handleSubmit} className="drawer-body-form">
                        <div className="card">
                            <div className="form-group">
                                <label style={{ fontWeight: '700', color: '#4a5568' }}>유통 채널 선택 (Sales Channel)</label>
                                <select 
                                    value={formData.channel?.id || ""} 
                                    onChange={e => {
                                        const selected = channels.find(c => c.id === parseInt(e.target.value));
                                        setFormData({...formData, channel: selected});
                                    }}
                                    required 
                                    style={{ height: '45px', fontSize: '15px' }}
                                    disabled={!canEdit}
                                >
                                    <option value="">채널을 선택하세요</option>
                                    {channels.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: '700', color: '#4a5568' }}>규칙 종류 (Rule Type)</label>
                                <select 
                                    value={formData.ruleType} 
                                    onChange={e => setFormData({...formData, ruleType: e.target.value})}
                                    required
                                    style={{ height: '45px', fontSize: '15px' }}
                                    disabled={!canEdit}
                                >
                                    <option value="">선택하세요</option>
                                    {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: '700', color: '#4a5568' }}>규칙 값 (Rule Value)</label>
                                <input 
                                    value={formData.ruleValue} 
                                    onChange={e => setFormData({...formData, ruleValue: e.target.value})} 
                                    placeholder="예: 180 (단위 생략), AJU 등" 
                                    style={{ height: '45px', fontSize: '15px' }}
                                    disabled={!canEdit}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: '700', color: '#4a5568' }}>경고/안내 문구 (Warning Message)</label>
                                <textarea 
                                    value={formData.warningMessage} 
                                    onChange={e => setFormData({...formData, warningMessage: e.target.value})} 
                                    placeholder="작업자나 검사자에게 표시될 경고 메시지 또는 상세 내용을 입력하세요." 
                                    style={{ height: '120px', fontSize: '15px', lineHeight: '1.6' }}
                                    required
                                    disabled={!canEdit}
                                />
                            </div>

                            <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                <button type="submit" className="primary" style={{ minWidth: '240px', padding: '12px 40px', fontSize: '15px', opacity: canEdit ? 1 : 0.5 }} disabled={!canEdit}>
                                    {canEdit ? '✅ 규칙 저장 완료' : '🚫 수정 권한 없음'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* 3. Fixed Footer Area */}
                <div className="drawer-footer">
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <span>📅 등록일: <strong>{formData.createdAt ? formData.createdAt.substring(0, 16).replace('T', ' ') : '-'}</strong></span>
                        <span>🔄 마지막 수정: <strong>{formData.updatedAt ? formData.updatedAt.substring(0, 16).replace('T', ' ') : '-'}</strong></span>
                    </div>
                </div>
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
