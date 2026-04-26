import React, { useState, useEffect } from 'react';
import { createManufacturer, updateManufacturer, uploadFile } from './api';
import SaveConfirmModal from './components/SaveConfirmModal';

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
        files: [] // List of { filePath, fileName, category }
    });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const categories = [
        { key: 'BIZ_REG', label: '사업자 등록증 (최대 10MB, 복수 가능)' },
        { key: 'BIZ_LICENSE', label: '영업등록증 (최대 10MB, 복수 가능)' },
        { key: 'INSURANCE', label: '보험증권 (최대 10MB, 복수 가능)' },
        { key: 'FACTORY_REG', label: '공장등록증 (최대 10MB, 복수 가능)' },
        { key: 'OTHER', label: '그외 인증 서류 (최대 10MB, 복수 가능)' }
    ];

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

        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        for (const file of files) {
            if (file.size > MAX_SIZE) {
                const currentSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                alert(`용량이 제한보다 큽니다.\n현재 파일 용량 : ${currentSizeMB}MB, 제한된 용량 : 10MB`);
                e.target.value = '';
                return;
            }
        }

        try {
            for (const file of files) {
                const res = await uploadFile(file); // Reusing product upload for now
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
            alert("파일이 업로드되었습니다.");
            e.target.value = ''; // Reset input
        } catch (error) {
            alert("파일 업로드에 실패했습니다.");
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
                alert("제조사 정보가 수정되었습니다.");
            } else {
                await createManufacturer(formData);
                alert("제조사가 등록되었습니다.");
            }
            onClose();
        } catch (error) {
            alert("저장에 실패했습니다.");
        }
    };

    const getFileUrl = (path) => path.startsWith('http') ? path : `http://localhost:8080${path}`;

    return (
        <div className="drawer-overlay" onClick={onClose}>
            <div className="drawer" onClick={(e) => e.stopPropagation()} style={{ width: '750px' }}>
                {/* 1. Fixed Header Area */}
                <div className="drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h2>{manufacturer ? '🏢 제조사 정보 수정' : '🆕 신규 제조사 등록'}</h2>
                    </div>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Scrollable Body Area */}
                <div className="drawer-body">
                    <form id="manufacturer-form" onSubmit={handleSubmit} className="drawer-body-form">
                        
                        {/* 섹션 1: 기업 기본 정보 */}
                        <div className="card">
                            <h3>
                                <span style={{ color: '#4a90e2' }}>📌</span> 기업 기본 정보
                            </h3>
                            
                            <div className="form-group">
                                <label>제조사명 (필수)</label>
                                <input name="name" value={formData.name || ''} onChange={handleChange} required disabled={!canEdit} placeholder="기업명을 입력하세요." />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label>제조사 코드 (고유)</label>
                                    <input name="manufacturerCode" value={formData.manufacturerCode || ''} onChange={handleChange} placeholder="업체 고유 코드" disabled={!canEdit} />
                                </div>
                                <div className="form-group">
                                    <label>식별코드 (기타)</label>
                                    <input name="identificationCode" value={formData.identificationCode || ''} onChange={handleChange} placeholder="ERP 코드 등" disabled={!canEdit} />
                                </div>
                            </div>
                        </div>

                        {/* 섹션 2: 담당자 및 연락처 */}
                        <div className="card" style={{ borderLeft: '5px solid #38b2ac' }}>
                            <h3>
                                <span style={{ color: '#38b2ac' }}>👤</span> 담당자 정보
                            </h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label>담당자 성함</label>
                                    <input name="contactPerson" value={formData.contactPerson || ''} onChange={handleChange} disabled={!canEdit} placeholder="홍길동" />
                                </div>
                                <div className="form-group">
                                    <label>직급</label>
                                    <input name="position" value={formData.position || ''} onChange={handleChange} disabled={!canEdit} placeholder="차장 / 팀장" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label>연락처</label>
                                    <input name="phoneNumber" value={formData.phoneNumber || ''} onChange={handleChange} disabled={!canEdit} placeholder="010-0000-0000" />
                                </div>
                                <div className="form-group">
                                    <label>이메일</label>
                                    <input name="email" value={formData.email || ''} onChange={handleChange} disabled={!canEdit} placeholder="example@company.com" />
                                </div>
                            </div>
                        </div>

                        {/* 섹션 3: 증빙 서류 관리 */}
                        <div className="card" style={{ borderLeft: '5px solid #ed8936' }}>
                            <h3>
                                <span style={{ color: '#ed8936' }}>📄</span> 증빙 서류 관리
                            </h3>
                            
                            <div className="file-categories-list">
                                {categories.map(cat => (
                                    <div key={cat.key} style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <label style={{ fontWeight: '700', fontSize: '14px', color: '#4a5568', margin: 0 }}>{cat.label}</label>
                                            {canEdit && (
                                                <div className="file-input-wrapper" style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                                                    <button type="button" className="secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>📁 파일 선택</button>
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

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px' }}>
                                            {formData.files.filter(f => f.category === cat.key).length === 0 && (
                                                <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px dashed #cbd5e0', borderRadius: '8px', width: '100%', fontSize: '12px', color: '#a0aec0', textAlign: 'center' }}>
                                                    등록된 서류가 없습니다.
                                                </div>
                                            )}
                                            {formData.files.filter(f => f.category === cat.key).map((f, idx) => {
                                                const isImage = f.filePath?.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/) != null;
                                                return (
                                                    <div key={idx} style={{
                                                        position: 'relative',
                                                        display: 'flex', alignItems: 'center', gap: '8px',
                                                        background: '#fff', padding: isImage ? '0' : '8px 15px', borderRadius: '10px', border: '1px solid #e2e8f0',
                                                        fontSize: '12px', overflow: 'hidden', transition: 'box-shadow 0.2s',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                    }}>
                                                        {isImage ? (
                                                            <div style={{ position: 'relative', width: '90px', height: '90px', group: 'true' }}>
                                                                <img 
                                                                    src={getFileUrl(f.filePath)} 
                                                                    alt={f.fileName} 
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                                    onClick={() => window.open(getFileUrl(f.filePath), '_blank')}
                                                                    title="원본 보기"
                                                                />
                                                                {canEdit && (
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={(e) => { e.stopPropagation(); removeFile(formData.files.indexOf(f)); }}
                                                                        style={{ 
                                                                            position: 'absolute', top: '4px', right: '4px', 
                                                                            background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', 
                                                                            borderRadius: '50%', width: '20px', height: '20px', 
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            cursor: 'pointer', fontWeight: 'bold', fontSize: '10px',
                                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                                        }}
                                                                        title="파일 삭제"
                                                                    >
                                                                        &times;
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span style={{ fontSize: '16px' }}>📄</span>
                                                                <a href={getFileUrl(f.filePath)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#2b6cb0', fontWeight: '600', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.fileName}>
                                                                    {f.fileName}
                                                                </a>
                                                                {canEdit && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeFile(formData.files.indexOf(f))}
                                                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px', padding: '0 5px' }}
                                                                        title="파일 삭제"
                                                                    >&times;</button>
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

                        <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #edf2f7', textAlign: 'center' }}>
                            <button 
                                type="submit" 
                                className="primary" 
                                style={{ 
                                    minWidth: '240px', 
                                    padding: '12px 40px', 
                                    fontSize: '15px',
                                    opacity: canEdit ? 1 : 0.5,
                                    cursor: canEdit ? 'pointer' : 'not-allowed'
                                }}
                                disabled={!canEdit}
                            >
                                {canEdit ? (manufacturer ? '💾 제조사 정보 업데이트' : '🚀 제조사 등록 완료') : '🚫 수정 권한 없음'}
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

export default ManufacturerDrawer;
