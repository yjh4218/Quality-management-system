import React, { useState, useEffect } from 'react';
import * as api from './api';
import { toast } from 'react-toastify';

/**
 * ProductBomDetailModal
 * 제품코드별 포장재 조회 화면에서 각 포장재를 더블클릭했을 때 나타나는 세부 사양 관리 및 마스터 연동 팝업 모달.
 * (규격: 96vw × 92vh 전면 최대화 표준 규격 준수)
 */
const ProductBomDetailModal = ({ isOpen, onClose, bomItem, onSaved, user }) => {
    const [formData, setFormData] = useState({
        masterMaterialId: null,
        bomCode: '',
        componentName: '',
        type: '',
        detailedType: '',
        detailedMaterial: '',
        specification: '',
        weight: '',
        thickness: '',
        usageCount: 1,
        bomManufacturer: '',
        coatingSpec: '',
        printingSpec: '',
        adhesiveSpec: '',
        postProcessingSpec: '',
        syncProductMaster: true
    });

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (bomItem) {
            setFormData({
                masterMaterialId: bomItem.masterMaterialId || null,
                bomCode: bomItem.bomCode || '',
                componentName: bomItem.componentName || '',
                type: bomItem.type || '',
                detailedType: bomItem.detailedType || '',
                detailedMaterial: bomItem.detailedMaterial || bomItem.material || '',
                specification: bomItem.specification || '',
                weight: bomItem.weight != null ? bomItem.weight : '',
                thickness: bomItem.thickness != null ? bomItem.thickness : '',
                usageCount: bomItem.usageCount != null ? bomItem.usageCount : 1,
                bomManufacturer: bomItem.bomManufacturer || bomItem.manufacturer || '',
                coatingSpec: bomItem.coatingSpec || '',
                printingSpec: bomItem.printingSpec || '',
                adhesiveSpec: bomItem.adhesiveSpec || '',
                postProcessingSpec: bomItem.postProcessingSpec || '',
                syncProductMaster: true
            });
        }
    }, [bomItem]);

    if (!isOpen || !bomItem) return null;

    const handleSave = async (e) => {
        if (e) e.preventDefault();

        if (!formData.componentName?.trim()) {
            toast.error('구성품명을 입력해주세요.');
            return;
        }

        setSaving(true);
        try {
            // 1. 마스터 포장재 저장/수정 페이로드 구성
            const payload = {
                id: formData.masterMaterialId || undefined,
                bomCode: formData.bomCode,
                componentName: formData.componentName,
                type: formData.type || '기타',
                detailedType: formData.detailedType,
                detailedMaterial: formData.detailedMaterial,
                specification: formData.specification,
                weight: formData.weight !== '' ? parseFloat(formData.weight) : 0.0,
                thickness: formData.thickness !== '' ? parseFloat(formData.thickness) : 0.0,
                manufacturer: formData.bomManufacturer,
                coatingSpec: formData.coatingSpec,
                printingSpec: formData.printingSpec,
                adhesiveSpec: formData.adhesiveSpec,
                postProcessingSpec: formData.postProcessingSpec
            };

            await api.saveMasterMaterial(payload);

            toast.success(`포장재 [${formData.bomCode || formData.componentName}] 세부 사양이 성공적으로 저장 및 연동되었습니다!`);
            if (onSaved) onSaved();
            onClose();
        } catch (error) {
            console.error('Failed to save packaging material detailed spec:', error);
            const errMsg = error.response?.data?.message || error.message || '저장 중 오류가 발생했습니다.';
            toast.error(`포장재 세부 사양 저장 실패: ${errMsg}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                width: '96vw',
                maxWidth: '1680px',
                height: '92vh',
                maxHeight: '94vh',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
            }}>
                {/* 1. 고정 헤더 */}
                <div style={{
                    padding: '20px 28px',
                    backgroundColor: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>📏</span>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                                포장재 세부 사양 관리 및 마스터 연동
                            </h2>
                            <span style={{
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '700',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe'
                            }}>
                                {formData.bomCode || '신규 포장재'}
                            </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                            연계 제품: <strong style={{ color: '#1e293b' }}>{bomItem.productName || '-'}</strong> ({bomItem.itemCode || '-'}) | 브랜드: {bomItem.brandName || '-'}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '13px',
                                color: '#475569'
                            }}
                        >
                            ✕ 닫기
                        </button>
                    </div>
                </div>

                {/* 2. 스크롤 본문 */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '28px',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    {/* 상단 안내 배너 */}
                    <div style={{
                        padding: '14px 20px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>💡</span>
                            <div style={{ fontSize: '13px', color: '#166534', lineHeight: '1.5' }}>
                                본 화면에서 수정한 <strong>코팅, 인쇄, 접착제 등의 가공 세부 사양</strong>은 BOM 마스터 원장에 즉시 업데이트되며, 해당 포장재를 참조하는 <strong>제품코드 마스터(포장사양서)</strong>에도 실시간 동기화됩니다.
                            </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#15803d', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.syncProductMaster}
                                onChange={e => setFormData({ ...formData, syncProductMaster: e.target.checked })}
                                style={{ width: '16px', height: '16px' }}
                            />
                            제품코드 마스터 일괄 동기화 (권장)
                        </label>
                    </div>

                    {/* 그리드 2열 카드 레이아웃 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        
                        {/* 카드 1: 기본 식별 및 물성 사양 */}
                        <div style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            padding: '22px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            borderLeft: '5px solid #0d9488'
                        }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>📦</span> 기본 식별 및 물성 규격
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>BOM 코드</label>
                                    <input
                                        type="text"
                                        value={formData.bomCode}
                                        readOnly
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontSize: '13px', fontWeight: '700', color: '#0f766e' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>구성품명 (필수)</label>
                                    <input
                                        type="text"
                                        value={formData.componentName}
                                        onChange={e => setFormData({ ...formData, componentName: e.target.value })}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>유형 / 세부유형</label>
                                    <input
                                        type="text"
                                        value={`${formData.type || ''} / ${formData.detailedType || ''}`}
                                        readOnly
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>재질 상세</label>
                                    <input
                                        type="text"
                                        value={formData.detailedMaterial}
                                        onChange={e => setFormData({ ...formData, detailedMaterial: e.target.value })}
                                        placeholder="예: PET, 알루미늄 튜브, CCP 종이"
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>규격 / 치수</label>
                                    <input
                                        type="text"
                                        value={formData.specification}
                                        onChange={e => setFormData({ ...formData, specification: e.target.value })}
                                        placeholder="예: 50 * 50 * 150 (mm)"
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>제조사 (공급업체)</label>
                                    <input
                                        type="text"
                                        value={formData.bomManufacturer}
                                        onChange={e => setFormData({ ...formData, bomManufacturer: e.target.value })}
                                        placeholder="제조사명"
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>중량 (g)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.weight}
                                        onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                        placeholder="0.00"
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>두께 (um)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.thickness}
                                        onChange={e => setFormData({ ...formData, thickness: e.target.value })}
                                        placeholder="0.0"
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 카드 2: 가공 세부 사양 (코팅, 인쇄, 접착제, 후가공) */}
                        <div style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            padding: '22px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            borderLeft: '5px solid #2563eb'
                        }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🎨</span> 포장재 공정 세부 사양 (품질 관리 기준)
                            </h3>

                            {/* 1. 코팅 사양 */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                    <span>🖌️</span> 코팅 세부 사양
                                </label>
                                <input
                                    type="text"
                                    value={formData.coatingSpec}
                                    onChange={e => setFormData({ ...formData, coatingSpec: e.target.value })}
                                    placeholder="예: 전면 UV 무광 코팅, 수성 바니시, 하드 코팅, 무코팅 등"
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: '#f0f9ff', fontSize: '13px' }}
                                />
                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    {['UV 무광', 'UV 유광', '수성 바니시', '라미네이팅', '무코팅'].map(sample => (
                                        <button
                                            type="button"
                                            key={sample}
                                            onClick={() => setFormData({ ...formData, coatingSpec: sample })}
                                            style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', cursor: 'pointer' }}
                                        >
                                            +{sample}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2. 인쇄 사양 */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                    <span>🖨️</span> 인쇄 세부 사양
                                </label>
                                <input
                                    type="text"
                                    value={formData.printingSpec}
                                    onChange={e => setFormData({ ...formData, printingSpec: e.target.value })}
                                    placeholder="예: 옵셋 4도+별색 1도, 실크스크린 1도, 핫스탬핑(금박/은박), 그라비아 등"
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e9d5ff', backgroundColor: '#faf5ff', fontSize: '13px' }}
                                />
                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    {['옵셋 4도', '실크스크린 1도', '금박 핫스탬핑', '은박 핫스탬핑', '그라비아 6도'].map(sample => (
                                        <button
                                            type="button"
                                            key={sample}
                                            onClick={() => setFormData({ ...formData, printingSpec: sample })}
                                            style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff', cursor: 'pointer' }}
                                        >
                                            +{sample}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 3. 접착제 사양 */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                    <span>🧴</span> 접착제 세부 사양
                                </label>
                                <input
                                    type="text"
                                    value={formData.adhesiveSpec}
                                    onChange={e => setFormData({ ...formData, adhesiveSpec: e.target.value })}
                                    placeholder="예: 친환경 수성 접착제, 핫멜트(EVA계), 아크릴 에멀전, 무용제형 등"
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', backgroundColor: '#f0fdf4', fontSize: '13px' }}
                                />
                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    {['친환경 수성 접착제', '핫멜트(EVA계)', '아크릴 에멀전', '무용제형'].map(sample => (
                                        <button
                                            type="button"
                                            key={sample}
                                            onClick={() => setFormData({ ...formData, adhesiveSpec: sample })}
                                            style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', cursor: 'pointer' }}
                                        >
                                            +{sample}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 4. 후가공 사양 */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                    <span>✨</span> 후가공 및 특이 사양
                                </label>
                                <input
                                    type="text"
                                    value={formData.postProcessingSpec}
                                    onChange={e => setFormData({ ...formData, postProcessingSpec: e.target.value })}
                                    placeholder="예: 전면 형압(엠보싱), 디보싱, 에칭 가공, 샌딩, 윈도우 타공"
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #fde68a', backgroundColor: '#fffbeb', fontSize: '13px' }}
                                />
                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    {['형압(엠보싱)', '디보싱(음각)', '에칭 가공', '샌딩 처리', '윈도우 타공'].map(sample => (
                                        <button
                                            type="button"
                                            key={sample}
                                            onClick={() => setFormData({ ...formData, postProcessingSpec: sample })}
                                            style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', cursor: 'pointer' }}
                                        >
                                            +{sample}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 3. 고정 푸터 */}
                <div style={{
                    padding: '16px 28px',
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                        * 저장 시 BOM 마스터 및 관련 포장사양서에 동기화 반영됩니다.
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            style={{
                                padding: '10px 22px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '14px',
                                color: '#475569'
                            }}
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                padding: '10px 28px',
                                backgroundColor: '#2563eb',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '800',
                                fontSize: '14px',
                                color: '#ffffff',
                                opacity: saving ? 0.7 : 1,
                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                            }}
                        >
                            {saving ? '저장 및 연동 중...' : '💾 저장 및 마스터 연동'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductBomDetailModal;
