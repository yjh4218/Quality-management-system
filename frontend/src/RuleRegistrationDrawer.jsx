import React, { useState, useEffect } from 'react';
import * as api from './api';
import { toast } from 'react-toastify';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';
import NumericFormattedInput from './components/common/NumericFormattedInput';

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
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 20px', fontSize: '15px' }}>
                                현재 채널에 등록된 포장 규칙이 없습니다.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {channelRules.map(r => {
                                    const rType = RULE_TYPES.find(t => t.value === r.ruleType);
                                    const isSelected = editingRule?.id === r.id;
                                    
                                    // 규칙 종류별 아이콘 및 배경 테마 정의
                                    let icon = '⚙️';
                                    let cardBg = '#f8fafc'; // slate-50
                                    let labelBg = '#e2e8f0';
                                    let labelColor = '#334155';

                                    if (r.ruleType === 'PALLET_SPEC') {
                                        icon = '📦';
                                        cardBg = '#f0f7ff'; // blue-50
                                        labelBg = '#dbeafe';
                                        labelColor = '#1d4ed8';
                                    } else if (r.ruleType === 'STICKER_REQUIRED') {
                                        icon = '🏷️';
                                        cardBg = '#f0fdf4'; // green-50
                                        labelBg = '#dcfce7';
                                        labelColor = '#15803d';
                                    } else if (r.ruleType === 'LOAD_HEIGHT') {
                                        icon = '📐';
                                        cardBg = '#fffbeb'; // yellow-50
                                        labelBg = '#fef3c7';
                                        labelColor = '#b45309';
                                    } else if (r.ruleType === 'LABELING') {
                                        icon = '🔖';
                                        cardBg = '#faf5ff'; // purple-50
                                        labelBg = '#f3e8ff';
                                        labelColor = '#7e22ce';
                                    }

                                    return (
                                        <div 
                                            key={r.id} 
                                            onClick={() => handleSelectRule(r)}
                                            style={{ 
                                                padding: '16px 20px', 
                                                borderRadius: '12px', 
                                                border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`, 
                                                background: cardBg, 
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: isSelected ? '0 6px 12px -2px rgba(37, 99, 235, 0.15)' : '0 2px 4px rgba(0,0,0,0.02)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: labelColor, background: labelBg, padding: '4px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>{icon}</span> {rType ? rType.label : r.ruleType}
                                                </span>
                                                {canEdit && (
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteRule(r.id); }}
                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                                                    >
                                                        삭제
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', marginBottom: '8px', lineHeight: '1.4' }}>
                                                값: <span style={{ color: '#0f172a' }}>{r.ruleValue || '(없음)'}</span>
                                            </div>
                                            {r.warningMessage && (
                                                <div style={{ fontSize: '13px', color: '#475569', whiteSpace: 'pre-line', overflow: 'visible', marginTop: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', lineHeight: '1.5' }}>
                                                    {r.warningMessage}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Pane: Form Editor */}
                    <div style={{ flex: 1.2, padding: '20px', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                            {editingRule ? '🛠️ 포장 규칙 수정 및 상세 편집' : '🆕 신규 규칙 등록'}
                        </h3>
                        <form id="rule-registration-form" onSubmit={handleSubmit}>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '800', color: '#475569', marginBottom: '6px', display: 'block' }}>유통 채널</label>
                                <input type="text" readOnly value={formData.channel?.name || ''} style={{ background: '#f1f5f9', fontSize: '14px', height: '44px', fontWeight: 'bold' }} />
                            </div>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '800', color: '#475569', marginBottom: '6px', display: 'block' }}>규칙 종류 (Rule Type)</label>
                                <select 
                                    value={formData.ruleType} 
                                    onChange={e => {
                                        setFormData({
                                            ...formData, 
                                            ruleType: e.target.value,
                                            ruleValue: e.target.value === 'STICKER_REQUIRED' ? '미부착' : ''
                                        });
                                    }}
                                    required
                                    style={{ fontSize: '14px', height: '44px' }}
                                    disabled={!canEdit}
                                >
                                    <option value="">선택하세요</option>
                                    {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '800', color: '#475569', marginBottom: '6px', display: 'block' }}>규칙 값 (Rule Value)</label>
                                
                                {/* 스티커 여부(STICKER_REQUIRED) 입력 위젯: 부착/미부착 토글 버튼 */}
                                {formData.ruleType === 'STICKER_REQUIRED' ? (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, ruleValue: '부착'})}
                                            style={{
                                                flex: 1,
                                                height: '44px',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                border: '1px solid #16a34a',
                                                borderRadius: '8px',
                                                cursor: canEdit ? 'pointer' : 'not-allowed',
                                                backgroundColor: formData.ruleValue === '부착' ? '#dcfce7' : '#fff',
                                                color: formData.ruleValue === '부착' ? '#15803d' : '#475569',
                                                transition: 'all 0.2s'
                                            }}
                                            disabled={!canEdit}
                                        >
                                            🟢 부착
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, ruleValue: '미부착'})}
                                            style={{
                                                flex: 1,
                                                height: '44px',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                border: '1px solid #64748b',
                                                borderRadius: '8px',
                                                cursor: canEdit ? 'pointer' : 'not-allowed',
                                                backgroundColor: formData.ruleValue === '미부착' ? '#f1f5f9' : '#fff',
                                                color: formData.ruleValue === '미부착' ? '#334155' : '#475569',
                                                transition: 'all 0.2s'
                                            }}
                                            disabled={!canEdit}
                                        >
                                            ⚪ 미부착
                                        </button>
                                    </div>
                                ) : formData.ruleType === 'PALLET_SPEC' ? (
                                    /* 지정 팔레트 규격 (PALLET_SPEC) 위젯: 4가지 규격 선택 드롭다운 */
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <select
                                            value={[
                                                '아주팔레트 (1,100 x 1,100 mm)',
                                                '수출용 검은색 일회용 팔레트 (1,100 x 1,100 mm)',
                                                '수출용 목재 팔렛트(1219*1016*120) - 바닥보드 5개 / 훈증처리(GMA) 필수'
                                            ].includes(formData.ruleValue) ? formData.ruleValue : (formData.ruleValue ? 'CUSTOM' : '')}
                                            onChange={e => {
                                                if (e.target.value === 'CUSTOM') {
                                                    setFormData({...formData, ruleValue: ''});
                                                } else {
                                                    setFormData({...formData, ruleValue: e.target.value});
                                                }
                                            }}
                                            style={{ fontSize: '14px', height: '44px' }}
                                            disabled={!canEdit}
                                        >
                                            <option value="">팔레트 유형 선택</option>
                                            <option value="아주팔레트 (1,100 x 1,100 mm)">아주팔레트 (1100×1100)</option>
                                            <option value="수출용 검은색 일회용 팔레트 (1,100 x 1,100 mm)">수출용 검은색 팔레트 (1100×1100)</option>
                                            <option value="수출용 목재 팔렛트(1219*1016*120) - 바닥보드 5개 / 훈증처리(GMA) 필수">수출용 목재 팔레트 (1219×1016 훈증)</option>
                                            <option value="CUSTOM">기타 규격 (직접 입력)</option>
                                        </select>
                                        
                                        {/* 직접 입력 선택 혹은 선택 옵션 외의 값이 매핑되어 있는 경우 */}
                                        {(![
                                            '아주팔레트 (1,100 x 1,100 mm)',
                                            '수출용 검은색 일회용 팔레트 (1,100 x 1,100 mm)',
                                            '수출용 목재 팔렛트(1219*1016*120) - 바닥보드 5개 / 훈증처리(GMA) 필수'
                                        ].includes(formData.ruleValue) || formData.ruleValue === '') && (
                                            <input
                                                value={formData.ruleValue}
                                                onChange={e => setFormData({...formData, ruleValue: e.target.value})}
                                                placeholder="기타 팔레트 규격을 직접 입력하세요."
                                                style={{ fontSize: '14px', height: '44px', marginTop: '4px' }}
                                                disabled={!canEdit}
                                            />
                                        )}
                                    </div>
                                ) : formData.ruleType === 'LOAD_HEIGHT' ? (
                                    /* 적재 높이 제한 (LOAD_HEIGHT) 위젯: 4가지 규격 선택 드롭다운 */
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <select
                                            value={[
                                                'PLT 제외, 1,500mm 이하',
                                                'PLT 제외, 1050mm 이하',
                                                'PLT 제외, 1,500mm 이하, 패드&각대 적용'
                                            ].includes(formData.ruleValue) ? formData.ruleValue : (formData.ruleValue ? 'CUSTOM' : '')}
                                            onChange={e => {
                                                if (e.target.value === 'CUSTOM') {
                                                    setFormData({...formData, ruleValue: ''});
                                                } else {
                                                    setFormData({...formData, ruleValue: e.target.value});
                                                }
                                            }}
                                            style={{ fontSize: '14px', height: '44px' }}
                                            disabled={!canEdit}
                                        >
                                            <option value="">적재 높이 선택</option>
                                            <option value="PLT 제외, 1,500mm 이하">PLT 제외, 1,500mm 이하 (기본)</option>
                                            <option value="PLT 제외, 1050mm 이하">PLT 제외, 1,050mm 이하 (올리브영/PX)</option>
                                            <option value="PLT 제외, 1,500mm 이하, 패드&각대 적용">PLT 제외, 1,500mm 이하 + 패드&각대 적용</option>
                                            <option value="CUSTOM">기타 유형 (직접 입력)</option>
                                        </select>
                                        
                                        {(![
                                            'PLT 제외, 1,500mm 이하',
                                            'PLT 제외, 1050mm 이하',
                                            'PLT 제외, 1,500mm 이하, 패드&각대 적용'
                                        ].includes(formData.ruleValue) || formData.ruleValue === '') && (
                                            <input
                                                value={formData.ruleValue}
                                                onChange={e => setFormData({...formData, ruleValue: e.target.value})}
                                                placeholder="기타 높이 제한을 직접 입력하세요."
                                                style={{ fontSize: '14px', height: '44px', marginTop: '4px' }}
                                                disabled={!canEdit}
                                            />
                                        )}
                                    </div>
                                ) : formData.ruleType === 'LABELING' ? (
                                    /* 라벨링/착인 규칙 (LABELING) 위젯: 6가지 대표 포맷 드롭다운 */
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <select
                                            value={[
                                                'EXP YYYYMMDD까지',
                                                'EXP MM-DD-YYYY',
                                                'EXP DDMMYYYY',
                                                'EXP YYYY-MM',
                                                '사용기한 착인 금지',
                                                '신설 예정'
                                            ].includes(formData.ruleValue) ? formData.ruleValue : (formData.ruleValue ? 'CUSTOM' : '')}
                                            onChange={e => {
                                                if (e.target.value === 'CUSTOM') {
                                                    setFormData({...formData, ruleValue: ''});
                                                } else {
                                                    setFormData({...formData, ruleValue: e.target.value});
                                                }
                                            }}
                                            style={{ fontSize: '14px', height: '44px' }}
                                            disabled={!canEdit}
                                        >
                                            <option value="">착인 포맷 선택</option>
                                            <option value="EXP YYYYMMDD까지">EXP YYYYMMDD까지 (국내 표준)</option>
                                            <option value="EXP MM-DD-YYYY">EXP MM-DD-YYYY (미국/호주/일본AMZ)</option>
                                            <option value="EXP DDMMYYYY">EXP DDMMYYYY (유럽 표준)</option>
                                            <option value="EXP YYYY-MM">EXP YYYY-MM (OTC)</option>
                                            <option value="사용기한 착인 금지">사용기한 착인 금지 (일본 오프라인)</option>
                                            <option value="신설 예정">신설 예정</option>
                                            <option value="CUSTOM">기타 규격 (직접 입력)</option>
                                        </select>
                                        
                                        {(![
                                            'EXP YYYYMMDD까지',
                                            'EXP MM-DD-YYYY',
                                            'EXP DDMMYYYY',
                                            'EXP YYYY-MM',
                                            '사용기한 착인 금지',
                                            '신설 예정'
                                        ].includes(formData.ruleValue) || formData.ruleValue === '') && (
                                            <input
                                                value={formData.ruleValue}
                                                onChange={e => setFormData({...formData, ruleValue: e.target.value})}
                                                placeholder="기타 사용기한 포맷을 직접 입력하세요."
                                                style={{ fontSize: '14px', height: '44px', marginTop: '4px' }}
                                                disabled={!canEdit}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    formData.ruleType === 'MAX_BOX_HEIGHT' ? (
                                        <NumericFormattedInput
                                            name="ruleValue"
                                            value={formData.ruleValue}
                                            onChange={e => setFormData({...formData, ruleValue: e.target.value})}
                                            placeholder="높이 제한(mm) 수치를 입력하세요."
                                            disabled={!canEdit}
                                            style={{ fontSize: '14px', height: '44px' }}
                                        />
                                    ) : (
                                        <input 
                                            value={formData.ruleValue} 
                                            onChange={e => setFormData({...formData, ruleValue: e.target.value})} 
                                            placeholder="예: 규격을 입력하세요." 
                                            style={{ fontSize: '14px', height: '44px' }}
                                            disabled={!canEdit}
                                        />
                                    )
                                )}
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '800', color: '#475569', marginBottom: '6px', display: 'block' }}>경고/안내 문구 (Warning Message)</label>
                                <textarea 
                                    value={formData.warningMessage} 
                                    onChange={e => setFormData({...formData, warningMessage: e.target.value})} 
                                    placeholder="사양서 작성 중 규칙 위반 시 경고하거나 작업자 표준서 내에 표기될 내용을 적으세요." 
                                    style={{ height: '120px', fontSize: '14px', lineHeight: '1.6', padding: '12px' }}
                                    required
                                    disabled={!canEdit}
                                />
                            </div>

                            {canEdit && (
                                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                                    {editingRule && (
                                        <button type="button" onClick={handleResetForm} className="secondary" style={{ marginRight: '8px', fontSize: '13px', padding: '10px 20px', fontWeight: 'bold' }}>
                                            취소
                                        </button>
                                    )}
                                    <button type="submit" className="primary" style={{ fontSize: '13px', padding: '10px 28px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 'bold' }}>
                                        {editingRule ? '💾 규칙 변경 저장' : '💾 새 규칙 저장'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* 3. Footer */}
                {editingRule && (
                    <div className="drawer-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', display: 'flex', gap: '20px', backgroundColor: '#f8fafc' }}>
                        <span>📅 최초등록: {formData.createdAt ? formData.createdAt.substring(0, 16).replace('T', ' ') : '-'}</span>
                        <span>🔄 최종수정: {formData.updatedAt ? formData.updatedAt.substring(0, 16).replace('T', ' ') : '-'}</span>
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
