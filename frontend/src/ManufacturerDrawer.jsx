import React, { useState, useEffect } from 'react';
import { createManufacturer, updateManufacturer, uploadFile, getManufacturerCategories } from './api';
import SaveConfirmModal from './components/SaveConfirmModal';
import { toast } from 'react-toastify';

/**
 * 제조사 정보 편집/등록 드로어
 * [디자인 고도화] 750px 너비의 중앙 집중형 레이아웃과 세분화된 카드 섹션을 적용했습니다.
 * [UX 개선] 파일 업로드 시 카테고리별 시각적 그룹화 및 프리미엄 버튼 스타일을 적용했습니다.
 */
const ManufacturerDrawer = ({ manufacturer, onClose, canEdit }) => {
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        department: '',
        position: '',
        phoneNumber: '',
        email: '',
        manufacturerCode: '',
        identificationCode: '',
        category: '',
        files: [] 
    });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const categories = [
        { key: 'BIZ_REG', label: '사업자 등록증 (최대 10MB)' },
        { key: 'BIZ_LICENSE', label: '영업등록증 (최대 10MB)' },
        { key: 'INSURANCE', label: '보험증권 (최대 10MB)' },
        { key: 'FACTORY_REG', label: '공장등록증 (최대 10MB)' },
        { key: 'OTHER', label: '기타 인증 서류' }
    ];
    const [manufacturerCategories, setManufacturerCategories] = useState([]);

    useEffect(() => {
        getManufacturerCategories().then(data => {
            setManufacturerCategories(data.map(c => c.name));
        }).catch(() => {
            setManufacturerCategories(['화장품', '공산품', '부자재(용기)', '사료', '동물용 의약외품']);
        });
    }, []);

    useEffect(() => {
        if (manufacturer) {
            setFormData({
                ...manufacturer,
                files: manufacturer.files || []
            });
        }
    }, [manufacturer]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e, category) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const MAX_SIZE = 10 * 1024 * 1024;
        for (const file of files) {
            if (file.size > MAX_SIZE) {
                toast.warn(`파일 용량이 너무 큽니다. (최대 10MB)`);
                e.target.value = '';
                return;
            }
        }

        try {
            for (const file of files) {
                const res = await uploadFile(file);
                const newFile = {
                    filePath: res.data,
                    fileName: file.name,
                    category: category
                };
                setFormData(prev => ({
                    ...prev,
                    files: [...prev.files, newFile]
                }));
            }
            toast.success("파일이 성공적으로 업로드되었습니다.");
            e.target.value = ''; 
        } catch (error) {
            toast.error("파일 업로드 중 오류가 발생했습니다.");
        }
    };

    const removeFile = (index) => {
        setFormData(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        setIsConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsConfirmOpen(false);
        try {
            if (manufacturer) {
                await updateManufacturer(manufacturer.id, formData);
                toast.success("제조사 정보가 수정되었습니다.");
            } else {
                await createManufacturer(formData);
                toast.success("새 제조사가 성공적으로 등록되었습니다.");
            }
            onClose();
        } catch (error) {
            toast.error("저장 중 오류가 발생했습니다.");
        }
    };

    const getFileUrl = (path) => path.startsWith('http') ? path : `http://localhost:8080${path}`;

    return (
        <div className="drawer-overlay" onClick={onClose} style={{ backdropFilter: 'blur(4px)', background: 'rgba(0, 51, 102, 0.15)' }}>
            <div className="drawer" onClick={(e) => e.stopPropagation()} style={{ width: '850px', borderRadius: '24px', overflow: 'hidden' }}>
                <div className="drawer-header" style={{ padding: '30px 40px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>🏢</span>
                        <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>
                            {manufacturer ? '제조사 마스터 상세 정보' : '신규 제조사 마스터 등록'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="secondary" style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0, border: 'none', background: '#f1f5f9' }}>✕</button>
                </div>

                <div className="drawer-body" style={{ padding: '40px', background: '#f8fafc' }}>
                    <form id="manufacturer-form" onSubmit={handleSubmit} className="drawer-body-form">
                        
                        <div className="card" style={{ padding: '30px', borderRadius: '20px', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '25px', color: 'var(--primary-color)' }}>
                                📌 기업 기본 정보
                            </h3>
                            
                            <div className="responsive-filter-grid" style={{ marginBottom: '25px' }}>
                                <div className="form-group">
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>제조사명 *</label>
                                    <input name="name" value={formData.name || ''} onChange={handleChange} required disabled={!canEdit} placeholder="공식 기업명을 입력하세요." style={{ padding: '12px', borderRadius: '10px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>제조사 구분</label>
                                    <select name="category" value={formData.category || ''} onChange={handleChange} required disabled={!canEdit} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ced4da', width: '100%' }}>
                                        <option value="">구분 선택</option>
                                        {manufacturerCategories.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="responsive-filter-grid">
                                <div className="form-group">
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>업체 고유 코드</label>
                                    <input name="manufacturerCode" value={formData.manufacturerCode || ''} onChange={handleChange} placeholder="ERP 업체 코드" disabled={!canEdit} style={{ padding: '12px', borderRadius: '10px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>식별 코드 (기타)</label>
                                    <input name="identificationCode" value={formData.identificationCode || ''} onChange={handleChange} placeholder="내부 관리 식별자" disabled={!canEdit} style={{ padding: '12px', borderRadius: '10px' }} />
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: '30px', borderRadius: '20px', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '25px', color: '#38b2ac' }}>
                                👤 메인 담당자 연락처
                            </h3>
                            
                            <div className="responsive-filter-grid" style={{ marginBottom: '25px' }}>
                                <div className="form-group">
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>담당자 성함</label>
                                    <input name="contactPerson" value={formData.contactPerson || ''} onChange={handleChange} disabled={!canEdit} placeholder="예: 홍길동" style={{ padding: '12px', borderRadius: '10px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>부서 및 직급</label>
                                    <input name="position" value={formData.position || ''} onChange={handleChange} disabled={!canEdit} placeholder="예: 품질관리팀 / 차장" style={{ padding: '12px', borderRadius: '10px' }} />
                                </div>
                            </div>

                            <div className="responsive-filter-grid">
                                <div className="form-group">
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>대표 연락처</label>
                                    <input name="phoneNumber" value={formData.phoneNumber || ''} onChange={handleChange} disabled={!canEdit} placeholder="010-0000-0000" style={{ padding: '12px', borderRadius: '10px' }} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#4a5568' }}>이메일 주소</label>
                                    <input name="email" value={formData.email || ''} onChange={handleChange} disabled={!canEdit} placeholder="example@company.com" style={{ padding: '12px', borderRadius: '10px' }} />
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: '30px', borderRadius: '20px', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '25px', color: '#ed8936' }}>
                                📄 핵심 증빙 서류 관리
                            </h3>
                            
                            <div className="file-categories-list">
                                {categories.map(cat => (
                                    <div key={cat.key} style={{ marginBottom: '30px', padding: '20px', background: '#ffffff', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                            <label style={{ fontWeight: '800', fontSize: '14px', color: '#4a5568', margin: 0 }}>{cat.label}</label>
                                            {canEdit && (
                                                <div className="file-input-wrapper" style={{ position: 'relative' }}>
                                                    <button type="button" className="secondary" style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px', border: 'none', background: '#ebf4ff', color: 'var(--primary-color)', fontWeight: '700' }}>📁 파일 업로드</button>
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept=".pdf,image/*"
                                                        onChange={(e) => handleFileUpload(e, cat.key)}
                                                        style={{ position: 'absolute', top: 0, left: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                            {formData.files.filter(f => f.category === cat.key).length === 0 && (
                                                <div style={{ padding: '15px', background: '#f8fafc', border: '1px dashed #cbd5e0', borderRadius: '12px', width: '100%', fontSize: '13px', color: '#a0aec0', textAlign: 'center' }}>
                                                    업로드된 서류가 없습니다.
                                                </div>
                                            )}
                                            {formData.files.filter(f => f.category === cat.key).map((f, idx) => {
                                                const isImage = f.filePath?.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/) != null;
                                                return (
                                                    <div key={idx} className="file-card" style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        background: '#fff', padding: isImage ? '0' : '10px 15px', borderRadius: '12px', border: '1px solid #e2e8f0',
                                                        fontSize: '12px', overflow: 'hidden', transition: 'all 0.2s',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                                                    }}>
                                                        {isImage ? (
                                                            <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                                                <img 
                                                                    src={getFileUrl(f.filePath)} 
                                                                    alt={f.fileName} 
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                                    onClick={() => window.open(getFileUrl(f.filePath), '_blank')}
                                                                />
                                                                {canEdit && (
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={(e) => { e.stopPropagation(); removeFile(formData.files.indexOf(f)); }}
                                                                        style={{ 
                                                                            position: 'absolute', top: '5px', right: '5px', 
                                                                            background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', 
                                                                            borderRadius: '50%', width: '22px', height: '22px', 
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                                                        }}
                                                                    >✕</button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span style={{ fontSize: '18px' }}>📄</span>
                                                                <a href={getFileUrl(f.filePath)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#2b6cb0', fontWeight: '700', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {f.fileName}
                                                                </a>
                                                                {canEdit && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeFile(formData.files.indexOf(f))}
                                                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}
                                                                    >✕</button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: '50px', padding: '30px', background: '#ffffff', borderRadius: '20px', border: '1px solid #edf2f7', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                            <button 
                                type="submit" 
                                className="primary" 
                                style={{ 
                                    minWidth: '300px', 
                                    padding: '16px 50px', 
                                    fontSize: '16px',
                                    fontWeight: '800',
                                    borderRadius: '14px',
                                    boxShadow: '0 8px 20px rgba(0, 51, 102, 0.2)',
                                    opacity: canEdit ? 1 : 0.5 
                                }}
                                disabled={!canEdit}
                            >
                                {canEdit ? (manufacturer ? '💾 변경 사항 저장 및 업데이트' : '🚀 신규 협력사 등록 완료') : '수정 권한이 제한되었습니다'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="drawer-footer" style={{ padding: '20px 40px', background: '#fff', fontSize: '12px', color: '#a0aec0' }}>
                    <div style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
                        <span>최초 등록일: <strong>{formData.createdAt ? new Date(formData.createdAt).toLocaleString() : '-'}</strong></span>
                        <span>최종 수정일: <strong>{formData.updatedAt ? new Date(formData.updatedAt).toLocaleString() : '-'}</strong></span>
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

export default ManufacturerDrawer;
