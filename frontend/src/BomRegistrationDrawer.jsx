import React, { useState, useEffect, useMemo } from 'react';
import * as api from './api';
import { toast } from 'react-toastify';
import ManufacturerSearchModal from './ManufacturerSearchModal';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';

const BomRegistrationDrawer = ({ material, onClose, user }) => {
    // 상태 관리
    const [formData, setFormData] = useState({
        bomCode: '',
        componentName: '',
        type: '',
        detailedType: '',
        detailedMaterial: '',
        manufacturerCode: '',
        specification: '',
        weight: '',
        thickness: '',
        isMultiLayer: false,
        imagePath: '',
        layers: []
    });

    const [categories, setCategories] = useState([]);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [bomCodeChecking, setBomCodeChecking] = useState(false);
    const [bomCodeAvailable, setBomCodeAvailable] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const { canEdit: canEditBom } = usePermissions(user);
    const canEdit = canEditBom('bomMaster');

    // 초기 데이터 로드 (수정 모드 및 카테고리 목록)
    useEffect(() => {
        fetchActiveCategories();
        if (material) {
            setFormData({
                id: material.id,
                bomCode: material.bomCode || '',
                componentName: material.componentName || '',
                type: material.type || '',
                detailedType: material.detailedType || '',
                detailedMaterial: material.detailedMaterial || '',
                manufacturer: material.manufacturer || '',
                manufacturerCode: material.manufacturerCode || '',
                specification: material.specification || '',
                weight: material.weight || '',
                thickness: material.thickness || '',
                isMultiLayer: material.isMultiLayer || false,
                imagePath: material.imagePath || '',
                layers: material.layers || [],
                createdAt: material.createdAt || '',
                updatedAt: material.updatedAt || ''
            });
            setBomCodeAvailable(true);
        }
    }, [material]);

    const fetchActiveCategories = async () => {
        try {
            const res = await api.getActiveBomCategories();
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setCategories(list);
        } catch (error) {
            if (!categories.length) {
                setCategories([]);
            }
        }
    };

    const handleAutoGenerateCode = async (selectedType = formData.type) => {
        try {
            const res = await api.generateBomCode(selectedType);
            const code = typeof res.data === 'string' ? res.data : (res.data?.data || '');
            if (code) {
                setFormData(prev => ({ ...prev, bomCode: code }));
                setBomCodeAvailable(true);
                toast.info(`BOM 코드가 자동 채번되었습니다: ${code}`);
            }
        } catch (err) {
            console.error("Auto generate BOM code error:", err);
        }
    };

    const selectedMainTypeSubCategories = useMemo(() => {
        if (!formData.type) return [];
        return categories.filter(c => c.mainType === formData.type).map(c => c.subType);
    }, [formData.type, categories]);

    const uniqueMainTypes = useMemo(() => {
        return [...new Set(categories.map(c => c.mainType))];
    }, [categories]);

    const totals = useMemo(() => {
        if (!formData.isMultiLayer || !formData.layers.length) {
            return { 
                weight: parseFloat(formData.weight) || 0, 
                thickness: parseFloat(formData.thickness) || 0 
            };
        }
        return formData.layers.reduce((acc, layer) => {
            acc.weight += parseFloat(layer.weight) || 0;
            acc.thickness += parseFloat(layer.thickness) || 0;
            return acc;
        }, { weight: 0, thickness: 0 });
    }, [formData.isMultiLayer, formData.layers, formData.weight, formData.thickness]);

    useEffect(() => {
        if (formData.isMultiLayer) {
            setFormData(prev => ({
                ...prev,
                weight: totals.weight,
                thickness: totals.thickness
            }));
        }
    }, [totals.weight, totals.thickness, formData.isMultiLayer]);

    const handleCheckBomCode = async () => {
        if (!formData.bomCode) return;
        setBomCodeChecking(true);
        try {
            const res = await api.checkBomCodeExists(formData.bomCode);
            setBomCodeAvailable(!res.data);
            if (res.data) toast.warn("이미 존재하는 BOM 코드입니다.");
            else toast.info("사용 가능한 BOM 코드입니다.");
        } catch (error) {
            toast.error("중복 체크 실패");
        } finally {
            setBomCodeChecking(false);
        }
    };

    const addLayer = () => {
        setFormData(prev => ({
            ...prev,
            layers: [...prev.layers, { materialName: '', weight: '', thickness: '' }]
        }));
    };

    const removeLayer = (idx) => {
        setFormData(prev => ({
            ...prev,
            layers: prev.layers.filter((_, i) => i !== idx)
        }));
    };

    const updateLayer = (idx, field, value) => {
        const newLayers = [...formData.layers];
        newLayers[idx] = { ...newLayers[idx], [field]: value };
        setFormData(prev => ({ ...prev, layers: newLayers }));
    };

    const handleManufacturerSelect = (m) => {
        setFormData(prev => ({
            ...prev,
            manufacturer: m.name,
            manufacturerCode: m.manufacturerCode || m.identificationCode || ''
        }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            return toast.error("이미지 파일만 업로드 가능합니다 (JPG, PNG, GIF, WEBP 등).");
        }

        if (file.size > 10 * 1024 * 1024) {
            return toast.error("파일 크기는 최대 10MB까지 가능합니다.");
        }

        setUploadingImage(true);
        try {
            const res = await api.uploadMasterFile(file, 'BOM');
            const imageUrl = typeof res.data === 'string' ? res.data : (res.data?.url || res.data?.data || '');
            if (imageUrl) {
                setFormData(prev => ({ ...prev, imagePath: imageUrl }));
                toast.success("패키지 사진이 성공적으로 업로드되었습니다.");
            }
        } catch (err) {
            console.error("Image upload failed:", err);
            toast.error("사진 업로드 중 오류가 발생했습니다.");
        } finally {
            setUploadingImage(false);
            e.target.value = '';
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, imagePath: '' }));
        toast.info("패키지 사진이 삭제되었습니다.");
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (formData.isMultiLayer && formData.layers.length === 0) {
            return toast.error("다층 구조 선택 시 최소 1개 이상의 레이어를 입력해야 합니다.");
        }
        if (!formData.weight || formData.weight <= 0) {
            return toast.error("중량 정보를 입력해주세요.");
        }
        if (bomCodeAvailable === false) {
            return toast.error("BOM 코드 중복 확인이 필요합니다.");
        }
        setIsConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsConfirmOpen(false);
        try {
            await api.saveMasterMaterial(formData);
            toast.success("저장되었습니다.");
            onClose(true);
        } catch (error) {
            toast.error(error.response?.data?.message || "저장 실패");
        }
    };

    const isAluminum = (name) => name && (name.includes('알루미늄') || name.toUpperCase().includes('AL'));

    return (
        <div className="drawer-overlay">
            <div className="drawer" onClick={e => e.stopPropagation()}>
                {/* 1. Fixed Header Area */}
                <div className="drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h2>{material ? '📦 구성품 수정' : '🆕 신규 구성품 등록'}</h2>
                    </div>
                    <button onClick={() => onClose()} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Scrollable Body Area */}
                <div className="drawer-body">
                    <form id="bom-registration-form" onSubmit={handleSubmit} className="drawer-body-form">
                        {/* 섹션 1: 기본 정보 */}
                        <div className="card">
                            <h3>
                                <span style={{ color: '#4a90e2' }}>📌</span> 기본 정보
                            </h3>
                            <div className="form-group">
                                <label>BOM 코드 (필수)</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        value={formData.bomCode} 
                                        onChange={e => {
                                            setFormData({...formData, bomCode: e.target.value});
                                            setBomCodeAvailable(null);
                                        }} 
                                        placeholder="예: MAT-CNT-0001" 
                                        required 
                                        disabled={!!material}
                                        style={{ flex: 1 }} 
                                    />
                                    {!material && (
                                        <>
                                            <button 
                                                type="button" 
                                                onClick={() => handleAutoGenerateCode(formData.type)} 
                                                className="secondary" 
                                                style={{ padding: '0 12px', fontSize: '13px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                                                title="선택된 유형에 맞게 코드를 자동 채번합니다"
                                            >
                                                ⚡ 자동 채번
                                            </button>
                                            <button type="button" onClick={handleCheckBomCode} disabled={bomCodeChecking || !formData.bomCode} className="secondary" style={{ padding: '0 12px', fontSize: '13px' }}>
                                                {bomCodeChecking ? '...' : '중복 확인'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>구성품명 (필수)</label>
                                <input 
                                    value={formData.componentName} 
                                    onChange={e => setFormData({...formData, componentName: e.target.value})} 
                                    placeholder="예: 500ml 신규 투명 PET병" 
                                    required 
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label>유형 (필수)</label>
                                    <select 
                                        value={formData.type} 
                                        onChange={e => {
                                            const newType = e.target.value;
                                            setFormData(prev => ({ ...prev, type: newType, detailedType: '' }));
                                            if (!material && (!formData.bomCode || formData.bomCode.startsWith('MAT-'))) {
                                                handleAutoGenerateCode(newType);
                                            }
                                        }} 
                                        required
                                    >
                                        <option value="">선택하세요</option>
                                        {uniqueMainTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>세부 유형 (필수)</label>
                                    <select 
                                        value={formData.detailedType} 
                                        onChange={e => setFormData({...formData, detailedType: e.target.value})} 
                                        required
                                        disabled={!formData.type}
                                    >
                                        <option value="">전체</option>
                                        {selectedMainTypeSubCategories.map(st => <option key={st} value={st}>{st}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>구성품 규격 (필수)</label>
                                <input 
                                    value={formData.specification || ''} 
                                    onChange={e => setFormData({...formData, specification: e.target.value})} 
                                    placeholder="예: 50 * 50 * 150 (mm)" 
                                    required 
                                />
                            </div>
                        </div>

                        {/* 섹션 2: 상세 재질 정보 */}
                        <div className="card" style={{ borderLeft: '5px solid #38b2ac' }}>
                            <h3>
                                <span style={{ color: '#38b2ac' }}>🧪</span> 상세 재질 정보
                            </h3>
                            
                            <div className="form-group" style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: 0 }}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isMultiLayer} 
                                        onChange={e => setFormData({...formData, isMultiLayer: e.target.checked})} 
                                        style={{ width: '20px', height: '20px' }}
                                    />
                                    <span style={{ fontWeight: '800', fontSize: '15px', color: '#2d3748' }}>다층 구조(Multi-layer)로 정보 입력</span>
                                </label>
                                <p style={{ margin: '8px 0 0 32px', fontSize: '13px', color: '#64748b' }}>체크 시 각 레이어별 중량/두께를 입력하며, 합계는 자동 계산됩니다.</p>
                            </div>

                            {formData.isMultiLayer ? (
                                <div style={{ marginTop: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <label style={{ margin: 0, fontWeight: 'bold', color: '#4a5568' }}>📏 레이어 구성 내역</label>
                                        <button type="button" onClick={addLayer} className="secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>+ 레이어 추가</button>
                                    </div>
                                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #38b2ac' }}>
                                                    <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>순번</th>
                                                    <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>재질명</th>
                                                    <th style={{ padding: '12px', textAlign: 'right', color: '#475569' }}>중량(g)</th>
                                                    <th style={{ padding: '12px', textAlign: 'right', color: '#475569' }}>두께(um)</th>
                                                    <th style={{ padding: '12px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.layers.map((layer, idx) => (
                                                    <tr key={idx} style={{ 
                                                        borderBottom: '1px solid #edf2f7',
                                                        backgroundColor: isAluminum(layer.materialName) ? '#fffaf0' : 'transparent'
                                                    }}>
                                                        <td style={{ padding: '10px', width: '40px', color: '#94a3b8' }}>{idx + 1}</td>
                                                        <td style={{ padding: '10px' }}>
                                                            <input 
                                                                value={layer.materialName} 
                                                                onChange={e => updateLayer(idx, 'materialName', e.target.value)} 
                                                                placeholder="예: 알루미늄" 
                                                                style={{ width: '100%', border: isAluminum(layer.materialName) ? '1px solid #ed8936' : '1px solid #cbd5e0' }} 
                                                                required
                                                            />
                                                        </td>
                                                        <td style={{ padding: '10px', width: '100px' }}>
                                                            <input type="number" step="0.01" value={layer.weight} onChange={e => updateLayer(idx, 'weight', e.target.value)} style={{ width: '100%', textAlign: 'right' }} required />
                                                        </td>
                                                        <td style={{ padding: '10px', width: '100px' }}>
                                                            <input type="number" step="1" value={layer.thickness} onChange={e => updateLayer(idx, 'thickness', e.target.value)} style={{ width: '100%', textAlign: 'right', fontWeight: isAluminum(layer.materialName) ? 'bold' : 'normal' }} required />
                                                        </td>
                                                        <td style={{ padding: '10px', width: '40px', textAlign: 'center' }}>
                                                            <button type="button" onClick={() => removeLayer(idx)} style={{ color: '#e53e3e', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                                                    <td colSpan="2" style={{ padding: '12px', textAlign: 'right' }}>합계:</td>
                                                    <td style={{ padding: '12px', textAlign: 'right', color: '#2b6cb0' }}>{totals.weight.toFixed(2)}g</td>
                                                    <td style={{ padding: '12px', textAlign: 'right', color: '#2b6cb0' }}>{Math.round(totals.thickness)}um</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '13px', color: '#64748b' }}>중량(g) (필수)</label>
                                        <div className="input-group">
                                            <input 
                                                type="number" 
                                                value={formData.weight} 
                                                onChange={e => setFormData({...formData, weight: e.target.value})} 
                                                step="0.01" 
                                                required 
                                            />
                                            <div className="input-group-addon">g</div>
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '13px', color: '#64748b' }}>두께(um) (선택)</label>
                                        <div className="input-group">
                                            <input 
                                                type="number" 
                                                value={formData.thickness} 
                                                onChange={e => setFormData({...formData, thickness: e.target.value})} 
                                                step="0.1" 
                                            />
                                            <div className="input-group-addon">um</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 섹션 3: 제조사 정보 */}
                        <div className="card" style={{ borderLeft: '5px solid #9b59b6' }}>
                            <h3>
                                <span style={{ color: '#9b59b6' }}>🏢</span> 제조사 정보
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>제조사 선택</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input value={formData.manufacturer || ''} readOnly placeholder="검색을 이용하세요" style={{ flex: 1, backgroundColor: '#f8fafc' }} />
                                        <button type="button" onClick={() => setIsSearchModalOpen(true)} className="secondary" style={{ padding: '0 15px' }}>검색</button>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>제조사 코드</label>
                                    <input value={formData.manufacturerCode || ''} readOnly style={{ backgroundColor: '#f8fafc' }} />
                                </div>
                            </div>
                        </div>

                        {/* 섹션 4: 패키지 실물 사진 */}
                        <div className="card" style={{ borderLeft: '5px solid #0284c7' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ margin: 0 }}>
                                    <span style={{ color: '#0284c7' }}>📸</span> 패키지 실물 사진
                                </h3>
                                {formData.imagePath && (
                                    <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                                        ✓ 사진 등록 완료
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                                {/* 썸네일 미리보기 영역 */}
                                <div style={{
                                    width: '120px',
                                    height: '120px',
                                    borderRadius: '10px',
                                    border: '2px dashed #cbd5e1',
                                    background: '#f8fafc',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    cursor: formData.imagePath ? 'pointer' : 'default',
                                    flexShrink: 0
                                }}
                                onClick={() => formData.imagePath && setPreviewModalOpen(true)}
                                title={formData.imagePath ? '클릭 시 확대 미리보기' : ''}
                                >
                                    {formData.imagePath ? (
                                        <>
                                            <img 
                                                src={formData.imagePath} 
                                                alt="패키지 실물 사진" 
                                                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} 
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                background: 'rgba(0,0,0,0.6)',
                                                color: '#fff',
                                                fontSize: '10px',
                                                textAlign: 'center',
                                                padding: '2px 0'
                                            }}>
                                                🔍 클릭 시 확대
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '10px' }}>
                                            <div style={{ fontSize: '24px', marginBottom: '4px' }}>📦</div>
                                            <div style={{ fontSize: '11px' }}>사진 미등록</div>
                                        </div>
                                    )}
                                </div>

                                {/* 업로드 및 삭제 액션 영역 */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px', lineHeight: '1.5' }}>
                                        부자재의 외관, 형태, 인쇄 상태를 확인할 수 있는 실물 사진을 등록하세요.<br />
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                                            • 지원 형식: JPG, PNG, GIF, WEBP (최대 10MB)
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <label style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 16px',
                                            background: '#0284c7',
                                            color: '#fff',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            cursor: canEdit && !uploadingImage ? 'pointer' : 'not-allowed',
                                            opacity: canEdit && !uploadingImage ? 1 : 0.6
                                        }}>
                                            <span>📷</span> {uploadingImage ? '업로드 중...' : (formData.imagePath ? '사진 변경하기' : '사진 파일 등록')}
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handleImageUpload} 
                                                disabled={!canEdit || uploadingImage} 
                                                style={{ display: 'none' }} 
                                            />
                                        </label>

                                        {formData.imagePath && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewModalOpen(true)}
                                                    className="secondary"
                                                    style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    🔍 확대 보기
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveImage}
                                                        className="secondary"
                                                        style={{ padding: '8px 14px', fontSize: '13px', color: '#ef4444', borderColor: '#fca5a5' }}
                                                    >
                                                        🗑️ 사진 삭제
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* 3. Footer Area */}
                <div className="drawer-footer">
                    <div className="footer-left">
                        <span>📅 등록일: <strong>{formData.createdAt ? formData.createdAt.substring(0, 16).replace('T', ' ') : '-'}</strong></span>
                        <span>🔄 마지막 수정: <strong>{formData.updatedAt ? formData.updatedAt.substring(0, 16).replace('T', ' ') : '-'}</strong></span>
                    </div>
                    <div className="footer-actions">
                        <button type="button" className="secondary" onClick={onClose} style={{ minWidth: '80px' }}>
                            닫기
                        </button>
                        <button 
                            type="submit" 
                            form="bom-registration-form" 
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
                            {canEdit ? (material ? '💾 변경 사항 저장' : '💾 신규 등록하기') : '🚫 수정 권한 없음'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals and Confirmations */}
            {isSearchModalOpen && (
                <ManufacturerSearchModal 
                    onClose={() => setIsSearchModalOpen(false)} 
                    onSelect={handleManufacturerSelect} 
                />
            )}

            <SaveConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmSave}
            />

            {/* Photo Preview Lightbox Modal */}
            {previewModalOpen && formData.imagePath && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        zIndex: 99999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                    onClick={() => setPreviewModalOpen(false)}
                >
                    <div 
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '85vh',
                            background: '#fff',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            padding: '12px 18px',
                            background: '#0f172a',
                            color: '#fff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontWeight: 600, fontSize: '15px' }}>
                                📸 {formData.componentName || formData.bomCode || '패키지 사진 미리보기'}
                            </span>
                            <button 
                                onClick={() => setPreviewModalOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    padding: '0 4px'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' }}>
                            <img 
                                src={formData.imagePath} 
                                alt={formData.componentName} 
                                style={{
                                    maxWidth: '80vw',
                                    maxHeight: '70vh',
                                    objectFit: 'contain',
                                    borderRadius: '6px'
                                }} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BomRegistrationDrawer;
