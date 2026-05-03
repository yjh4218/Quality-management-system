import React, { useState, useEffect } from 'react';
import * as api from './api';
import { toast } from 'react-toastify';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';

const PRODUCT_TYPES = [
    { value: 'PET_REGULAR', label: 'PET병 - 막캡' },
    { value: 'PET_ONE_TOUCH', label: 'PET병 - 원터치캡' },
    { value: 'TUBE', label: '튜브 형태' },
    { value: 'MASK', label: '마스크' },
    { value: 'PAD_PP', label: '패드 - PP용기' },
    { value: 'PAD_POUCH', label: '패드 - 파우치' },
    { value: 'GLASS', label: '유리(초자)' },
    { value: 'PET_SERUM', label: 'PET병 - 세럼(헤비브로우)' },
    { value: 'ETC', label: '기타' }
];

const TemplateRegistrationDrawer = ({ template, onClose, user }) => {
    const isMobile = window.innerWidth <= 768;
    const [formData, setFormData] = useState({
        productType: 'ETC',
        steps: []
    });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const { canEdit: checkEdit } = usePermissions(user);
    const canEdit = checkEdit('packagingTemplates');

    useEffect(() => {
        if (template) {
            setFormData({
                id: template.id,
                productType: template.productType || 'ETC',
                steps: template.steps || [],
                createdAt: template.createdAt || '',
                updatedAt: template.updatedAt || ''
            });
        } else {
            setFormData({
                productType: 'ETC',
                steps: [{ stepNumber: 1, instruction: '', imageUrl: '' }]
            });
        }
    }, [template]);

    const handleAddStep = () => {
        const nextStepNum = formData.steps.length + 1;
        setFormData({
            ...formData,
            steps: [...formData.steps, { stepNumber: nextStepNum, instruction: '', imageUrl: '' }]
        });
    };

    const handleRemoveStep = (index) => {
        const newSteps = formData.steps.filter((_, i) => i !== index)
            .map((s, i) => ({ ...s, stepNumber: i + 1 }));
        setFormData({ ...formData, steps: newSteps });
    };

    const handleStepChange = (index, field, value) => {
        const newSteps = [...formData.steps];
        newSteps[index][field] = value;
        setFormData({ ...formData, steps: newSteps });
    };

    const handleImageUpload = async (index, file) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const res = await api.uploadMasterFile(file, `STEP_${formData.productType}`);
            handleStepChange(index, 'imageUrl', res.data);
            toast.success("이미지가 업로드되었습니다.");
        } catch (error) {
            toast.error("이미지 업로드 실패");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        setIsConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsConfirmOpen(false);
        try {
            await api.saveMasterTemplate(formData);
            toast.success("공정 템플릿이 저장되었습니다.");
            onClose(true);
        } catch (error) {
            toast.error("템플릿 저장 실패: " + (error.response?.data || error.message));
        }
    };

    return (
        <div className="drawer-overlay" onClick={() => onClose()}>
            <div className="drawer modern-drawer" onClick={(e) => e.stopPropagation()} style={{ width: '800px' }}>
                {/* 1. Fixed Header Area */}
                <div className="drawer-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <span style={{ color: '#3182ce' }}>📋</span> {template ? '템플릿 수정' : '신규 템플릿 등록'}
                        </h2>
                        <p style={{ margin: 0, fontSize: '13px', color: '#718096', fontWeight: '500' }}>제형별 표준 공정 가이드를 구성합니다.</p>
                    </div>
                    <button onClick={() => onClose()} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Scrollable Body Area */}
                <div className="drawer-body">
                    <form id="template-registration-form" onSubmit={handleSubmit} className="drawer-body-form">
                        {/* 기본 정보 카드 */}
                        <div className="card">
                            <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '800', fontSize: '15px', color: '#2d3748' }}>제품 유형 (Product Category)</label>
                                <select 
                                    value={formData.productType} 
                                    onChange={e => setFormData({...formData, productType: e.target.value})}
                                    style={{ width: '100%', height: '48px', padding: '0 15px', borderRadius: '10px', fontSize: '15px' }}
                                    required
                                    disabled={!canEdit}
                                >
                                    {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#ed8936' }}>📦</span> 공정 단계 상세 구성
                            </h3>
                            <button 
                                type="button" 
                                className="secondary" 
                                onClick={handleAddStep} 
                                style={{ 
                                    background: canEdit ? '#ebf8ff' : '#f8f9fa', 
                                    color: canEdit ? '#3182ce' : '#cbd5e0', 
                                    border: `1px solid ${canEdit ? '#bee3f8' : '#e2e8f0'}`, 
                                    padding: '8px 16px', 
                                    borderRadius: '8px', 
                                    fontSize: '13px', 
                                    fontWeight: '700',
                                    cursor: canEdit ? 'pointer' : 'not-allowed'
                                }}
                                disabled={!canEdit}
                            >
                                + 단계 추가
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {formData.steps.map((step, index) => (
                                <div key={index} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <div style={{ background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ background: '#3182ce', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>{step.stepNumber}</span>
                                            <span style={{ fontWeight: '800', fontSize: '15px', color: '#2d3748' }}>STEP {step.stepNumber}</span>
                                        </div>
                                        {formData.steps.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveStep(index)} 
                                                style={{ 
                                                    background: 'transparent', 
                                                    color: '#e53e3e', 
                                                    border: 'none', 
                                                    fontSize: '13px', 
                                                    fontWeight: '700', 
                                                    cursor: canEdit ? 'pointer' : 'not-allowed',
                                                    opacity: canEdit ? 1 : 0.5
                                                }}
                                                disabled={!canEdit}
                                            >
                                                × 삭제
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ padding: '20px', display: 'flex', gap: '20px' }}>
                                        <div style={{ flex: 1 }}>
                                            <textarea 
                                                value={step.instruction}
                                                onChange={e => handleStepChange(index, 'instruction', e.target.value)}
                                                placeholder="공정 상세 지시 내용을 입력하세요."
                                                style={{ width: '100%', minHeight: '120px', padding: '15px', borderRadius: '10px', fontSize: '14px', lineHeight: '1.6', background: '#fcfcfc' }}
                                                required
                                                disabled={!canEdit}
                                            />
                                        </div>
                                        <div style={{ width: '140px' }}>
                                            {step.imageUrl ? (
                                                <div style={{ position: 'relative', width: '140px', height: '120px' }}>
                                                    <img src={step.imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                                                    {canEdit && (
                                                        <button type="button" onClick={() => handleStepChange(index, 'imageUrl', '')} style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>&times;</button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ width: '140px', height: '120px', background: '#f1f5f9', border: '2px dashed #cbd5e0', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                                                    <span style={{ fontSize: '24px', color: '#94a3b8', marginBottom: '6px' }}>📷</span>
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textAlign: 'center' }}>이미지 추가<br/>(10MB 미만)</span>
                                                    <input 
                                                        type="file" 
                                                        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: canEdit ? 'pointer' : 'not-allowed' }} 
                                                        onChange={e => handleImageUpload(index, e.target.files[0])}
                                                        disabled={isUploading || !canEdit}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '30px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #edf2f7', textAlign: 'center' }}>
                            <button 
                            type="submit" 
                            className="primary" 
                            style={{ 
                                minWidth: '300px', 
                                padding: '12px 40px', 
                                fontSize: '15px', 
                                opacity: (isUploading || !canEdit) ? 0.5 : 1,
                                cursor: (isUploading || !canEdit) ? 'not-allowed' : 'pointer'
                            }} 
                            disabled={isUploading || !canEdit}
                        >
                            {isUploading ? '📤 이미지 업로드 중...' : (canEdit ? '💾 공정 템플릿 저장 완료' : '🚫 수정 권한 없음')}
                        </button>
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

export default TemplateRegistrationDrawer;
