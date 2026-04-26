import React, { useState, useEffect } from 'react';
import {
    createProductionAudit,
    updateProductionAudit,
    toggleProductDisclosure,
    uploadFile,
    getProductionAuditHistory
} from './api';
import { toast } from 'react-toastify';
import ProductSearchPopup from './ProductSearchPopup';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';

const ProductionAuditDrawer = ({ audit, onClose, user, onSaveSuccess }) => {
    const [formData, setFormData] = useState({
        itemCode: '',
        productName: '',
        manufacturerName: '',
        productionDate: '',
        containerImages: '',
        boxImages: '',
        loadImages: '',
        status: 'SUBMITTED',
        rejectionReason: '',
        isDisclosed: false
    });

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isQualityUser, setIsQualityUser] = useState(false);
    const [isManufacturer, setIsManufacturer] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [history, setHistory] = useState([]);
    const [permissions, setPermissions] = useState({ 
        canManageDisclosure: false,
        canViewHistory: false
    });

    const { canEdit, isAdmin } = usePermissions(user);
    const canRegister = canEdit('qualityPhotoAudit');

    useEffect(() => {
        setIsQualityUser(isAdmin || user?.roles?.some(r => r.authority?.includes('QUALITY')));
        setIsManufacturer(user?.roles?.some(r => r.authority?.includes('MANUFACTURER')));
        
        // 상세 기능 권한 체크 헬퍼
        const hasPermission = (permissionKey) => {
            return user?.roles?.some(r => {
                const perms = r.allowedPermissions ? JSON.parse(r.allowedPermissions) : [];
                return perms.includes(permissionKey);
            });
        };
        
        // 세부 기능 권한 기반 플래그
        const canManageDisclosure = isAdmin || hasPermission('AUDIT_DISCLOSE_MANAGE');
        const canViewHistory = isAdmin || isQuality || user?.roles?.some(r => r.authority?.includes('RESPONSIBLE_SALES'));
        
        setPermissions({ canManageDisclosure, canViewHistory });

        if (audit) {
            setFormData({
                ...audit,
                productionDate: audit.productionDate || '',
                rejectionReason: audit.rejectionReason || '',
                status: audit.status || 'SUBMITTED',
                isDisclosed: !!audit.isDisclosed
            });
            if (canViewHistory) fetchHistory(audit.id);
        }
    }, [audit, user]);

    const fetchHistory = async (id) => {
        try {
            const res = await getProductionAuditHistory(id);
            setHistory(res.data || []);
        } catch (error) {
            // Fetch history fail
        }
    };

    const handleProductSelect = (product) => {
        setFormData(prev => ({
            ...prev,
            itemCode: product.itemCode,
            productName: product.productName,
            manufacturerName: product.manufacturerName || user?.companyName || ''
        }));
        setIsSearchOpen(false);
    };

    const handleFileUpload = async (e, field) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const MAX_SIZE = 3 * 1024 * 1024; // 3MB per file
        
        try {
            const uploadTasks = files.map(async (file) => {
                if (file.size > MAX_SIZE) {
                    toast.warn(`[${file.name}] 용량이 3MB를 초과하여 제외되었습니다.`);
                    return null;
                }
                const res = await uploadFile(file, formData.productName || 'audit');
                return res.data;
            });

            const results = (await Promise.all(uploadTasks)).filter(Boolean);
            if (results.length > 0) {
                setFormData(prev => {
                    const currentPaths = prev[field] ? prev[field].split(',') : [];
                    const newPaths = [...currentPaths, ...results];
                    return { ...prev, [field]: newPaths.join(',') };
                });
                toast.success(`${results.length}개의 사진이 업로드되었습니다.`);
            }
        } catch (error) {
            toast.error("업로드 중 오류가 발생했습니다.");
        } finally {
            e.target.value = '';
        }
    };

    const removeImage = (field, index) => {
        setFormData(prev => {
            const paths = prev[field].split(',');
            paths.splice(index, 1);
            return { ...prev, [field]: paths.join(',') };
        });
    };

    const handleSave = async () => {
        if (!formData.itemCode) {
            toast.error("품목을 선택해주세요.");
            return;
        }

        // 역할 및 상황에 따른 상태 결정
        let nextStatus = formData.status;
        if (isManufacturer) {
            nextStatus = 'SUBMITTED';
        } else if (isQualityUser) {
            // 이미 승인된 건의 상세 수정이 아니면 '승인됨'으로 강제
            if (formData.status !== 'APPROVED') {
                nextStatus = 'APPROVED';
            }
        }

        const dataToSave = { ...formData, status: nextStatus };

        try {
            if (audit?.id) {
                await updateProductionAudit(audit.id, dataToSave);
                toast.success(isQualityUser ? "내역이 저장 및 승인되었습니다." : "내역이 제출되었습니다.");
            } else {
                // 신규(미진행) 상태에서 저장할 때의 로직 분기
                const hasImages = formData.containerImages || formData.boxImages || formData.loadImages;
                const hasData = hasImages || formData.productionDate;

                if (!hasData) {
                    // 사진이나 생산일자가 없는 경우 단순히 제조사 공개 여부만 업데이트
                    await toggleProductDisclosure(formData.itemCode, formData.isDisclosed);
                    toast.success(`제조사 공개 설정이 [${formData.isDisclosed ? '공개' : '비공개'}]로 변경되었습니다.`);
                } else {
                    // 실질적인 감리 데이터가 있는 경우 감리 레코드 생성
                    await createProductionAudit(dataToSave);
                    toast.success(isQualityUser ? "신규 감리가 등록 및 승인되었습니다." : "신규 감리가 제출되었습니다.");
                }
            }
            onSaveSuccess();
            onClose();
        } catch (error) {
            toast.error("저장에 실패했습니다.");
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        if (newStatus === 'REJECTED' && !formData.rejectionReason) {
            toast.error("반려 사유를 입력해주세요.");
            return;
        }

        try {
            await updateProductionAudit(audit.id, { ...formData, status: newStatus });
            toast.success(`상태가 [${newStatus}]로 업데이트되었습니다.`);
            onSaveSuccess();
            onClose();
        } catch (error) {
            toast.error("상태 업데이트 실패");
        }
    };

    const isEditMode = !!audit;
    const isApproved = formData.status === 'APPROVED';
    const canEditForm = !isApproved; // Not approved means we can attach photos or save drafts

    const renderImageSection = (title, field, limitLabel) => {
        const images = formData[field] ? formData[field].split(',').filter(p => p) : [];
        return (
            <div className="card" style={{ marginBottom: '20px', border: '1px solid #edf2f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#2d3748', fontWeight: '800' }}>{title} <span style={{ color: '#e53e3e', fontSize: '13px' }}>(필수)</span> <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#718096' }}>({limitLabel})</span></h4>
                    {canEditForm && !isApproved && canRegister && (
                        <label className="secondary" style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #cbd5e0', background: '#fff' }}>
                            📸 사진 추가
                            <input type="file" multiple accept="image/*" onChange={(e) => handleFileUpload(e, field)} style={{ display: 'none' }} />
                        </label>
                    )}
                </div>
                {canEditForm && !isApproved && (
                    <div style={{ marginBottom: '12px', padding: '10px 15px', background: '#fffaf0', border: '1px solid #feebc8', borderRadius: '10px', fontSize: '12px', color: '#c05621', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>💡</span>
                            <b>{field === 'containerImages' ? '용기 사진 업로드 가이드' : field === 'boxImages' ? '단상자 사진 업로드 가이드' : '적재 사진 업로드 가이드'}</b>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '25px' }}>
                            {field === 'containerImages' && <li>정면/후면/하단 등 <b>3~5장</b> 업로드 (<b>튜브 제품은 기장 길이 사진 필수</b>)</li>}
                            {field === 'boxImages' && <li><b>총 6장 필수 업로드</b> (정면, 후면, 측면, 상단, 하단 등)</li>}
                            {field === 'loadImages' && <li>인박스/아웃박스 입수, 현품표, 팔레트 적재 등 <b>3~5장</b> 업로드</li>}
                            <li>사진 한 장당 최대 용량 <b>3MB</b> 이하 준수</li>
                        </ul>
                    </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                    {images.map((path, idx) => (
                        <div key={idx} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', border: '2px solid #f1f5f9', transition: 'transform 0.2s', cursor: 'pointer' }} className="image-hover">
                            <img src={path} alt="audit" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => window.open(path, '_blank')} />
                            {canEditForm && !isApproved && canRegister && (
                                <button 
                                    onClick={() => removeImage(field, idx)}
                                    style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(231, 76, 60, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                    {images.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '12px', color: '#a0aec0', fontSize: '13px', border: '1px dashed #cbd5e0' }}>
                            등록된 사진이 없습니다.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '850px', maxWidth: '95vw' }}>
                <div className="modal-header" style={{ paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0 }}>{isEditMode ? '📸 생산감리 상세 정보' : '✨ 신규 생산감리 등록'}</h2>
                            <button onClick={onClose} className="secondary close-button">
                                <span className="icon">×</span> 닫기
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button 
                                onClick={() => setActiveTab('details')}
                                style={{ 
                                    padding: '10px 20px', 
                                    border: 'none', 
                                    background: activeTab === 'details' ? '#003366' : 'transparent',
                                    color: activeTab === 'details' ? '#fff' : '#666',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📋 상세 정보
                            </button>
                            {permissions.canViewHistory && isEditMode && (
                                <button 
                                    onClick={() => setActiveTab('history')}
                                    style={{ 
                                        padding: '10px 20px', 
                                        border: 'none', 
                                        background: activeTab === 'history' ? '#003366' : 'transparent',
                                        color: activeTab === 'history' ? '#fff' : '#666',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    🕒 변경 이력
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-body white-bg" style={{ padding: '25px', overflowY: 'auto' }}>
                    {activeTab === 'details' && (
                        <>
                    {/* Guidance Notice */}
                    <div className="card" style={{ marginBottom: '25px', background: '#eef2ff', borderColor: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', borderRadius: '12px' }}>
                        <span style={{ fontSize: '24px' }}>📢</span>
                        <div>
                            <p style={{ margin: 0, fontWeight: '800', color: '#4338ca', fontSize: '14px' }}>업무 지침 안내</p>
                            <p style={{ margin: 0, color: '#4f46e5', fontSize: '13px', lineHeight: '1.5' }}>발주 여부 및 포장사양서를 확인하신 후 해당 품목에 대해 제조사에 촬영 및 사진 등록을 요청하시기 바랍니다.</p>
                        </div>
                    </div>

                    {/* Status and Disclosure Toggle */}
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
                        {permissions.canManageDisclosure && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#f8fafc', padding: '8px 15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <input 
                                    type="checkbox" 
                                    checked={formData.isDisclosed} 
                                    onChange={(e) => setFormData({ ...formData, isDisclosed: e.target.checked })} 
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: '800', color: formData.isDisclosed ? '#38a169' : '#e53e3e' }}>
                                    {formData.isDisclosed ? '🔓 제조사 공개' : '🔒 제조사 비공개'}
                                </span>
                            </label>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#718096' }}>진행상태:</label>
                            <span className={`badge ${formData.status === 'APPROVED' ? 'success' : formData.status === 'REJECTED' ? 'secondary' : formData.status === 'PENDING' ? 'warning' : 'info'}`} style={{ padding: '8px 20px', fontSize: '14px', borderRadius: '8px', fontWeight: '800' }}>
                                {formData.status === 'SUBMITTED' ? '제출됨' : formData.status === 'APPROVED' ? '승인됨' : formData.status === 'PENDING' ? '미진행' : '반려됨'}
                            </span>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: '25px', padding: '20px', border: '1px solid #edf2f7' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: '700' }}>품목코드</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input value={formData.itemCode} readOnly placeholder="품목 검색을 클릭하세요" style={{ background: '#f8fafc', fontWeight: '600' }} />
                                    {canEditForm && !isEditMode && (
                                        <button onClick={() => setIsSearchOpen(true)} className="outline" style={{ whiteSpace: 'nowrap', padding: '0 15px', height: '45px' }}>🔍 검색</button>
                                    )}
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: '700' }}>제품명</label>
                                <input value={formData.productName} readOnly style={{ background: '#f8fafc', fontWeight: '600' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: '700' }}>제조사</label>
                                <input value={formData.manufacturerName} readOnly={!isQualityUser} onChange={(e) => setFormData({...formData, manufacturerName: e.target.value})} style={{ background: !isQualityUser ? '#f8fafc' : '#fff' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: '700' }}>생산일자</label>
                                <input type="date" value={formData.productionDate} onChange={(e) => setFormData({...formData, productionDate: e.target.value})} disabled={!canEditForm || isApproved} style={{ height: '45px' }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '5px' }}>
                        {renderImageSection("1. 용기 사진", "containerImages", "정면, 후면, 하단 착인 권장")}
                        {renderImageSection("2. 단상자 사진", "boxImages", "정면, 후면, 측면, 상단, 하단 착인 권장")}
                        {renderImageSection("3. 적재 사진", "loadImages", "인박스/아웃박스 입수, 현품표, 팔레트 적재 등")}
                    </div>

                    {/* Rejection Reason Section */}
                    {(isQualityUser || (formData.status === 'REJECTED' && formData.rejectionReason)) && (
                        <div className="card" style={{ marginTop: '20px', background: formData.status === 'REJECTED' ? '#fff5f5' : '#f8fafc', border: formData.status === 'REJECTED' ? '1px solid #feb2b2' : '1px solid #e2e8f0', padding: '20px' }}>
                            <label style={{ fontWeight: '800', display: 'block', marginBottom: '12px', color: formData.status === 'REJECTED' ? '#c53030' : '#2d3748' }}>🚩 반려 사유 (품질팀 작성)</label>
                            <textarea 
                                value={formData.rejectionReason}
                                onChange={(e) => setFormData({...formData, rejectionReason: e.target.value})}
                                placeholder="반려 시 사유를 입력해주세요."
                                disabled={!isQualityUser || isApproved}
                                style={{ 
                                    background: (!isQualityUser || isApproved) ? 'transparent' : '#fff', 
                                    width: '100%',
                                    padding: '15px',
                                    resize: 'vertical',
                                    fontSize: '14px',
                                    lineHeight: '1.5',
                                    minHeight: '120px',
                                    borderRadius: '8px',
                                    border: (!isQualityUser || isApproved) ? 'none' : '1px solid #cbd5e0',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    )}
                </>
            )}

            {activeTab === 'history' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {history.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '50px', color: '#999', background: '#f8fafc', borderRadius: '12px' }}>
                                    기록된 변경 이력이 없습니다.
                                </div>
                            ) : (
                                Object.entries(
                                    history.reduce((acc, rec) => {
                                        const date = rec.modifiedAt ? rec.modifiedAt.substring(0, 10) : '알 수 없음';
                                        const time = rec.modifiedAt ? rec.modifiedAt.substring(11, 19) : '';
                                        const groupKey = `${rec.modifier} | ${date} ${time}`;
                                        if (!acc[groupKey]) acc[groupKey] = [];
                                        acc[groupKey].push(rec);
                                        return acc;
                                    }, {})
                                ).map(([groupKey, records], idx) => (
                                    <div key={idx} style={{ background: '#f8fafc', borderRadius: '12px', padding: '15px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                            <span style={{ fontSize: '18px' }}>🕒</span>
                                            <span style={{ fontWeight: '800', color: '#2d3748', fontSize: '14px' }}>{groupKey}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {records.map(rec => {
                                                const fieldNames = {
                                                    productionDate: '생산일자',
                                                    status: '진행상태',
                                                    isDisclosed: '제조사 공개여부',
                                                    rejectionReason: '반려사유',
                                                    containerImages: '용기 사진',
                                                    boxImages: '단상자 사진',
                                                    loadImages: '적재 사진'
                                                };
                                                return (
                                                    <div key={rec.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '15px', fontSize: '13px' }}>
                                                        <span style={{ color: '#718096', fontWeight: 'bold' }}>{fieldNames[rec.fieldName] || rec.fieldName}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ color: '#a0aec0', textDecoration: 'line-through' }}>{rec.oldValue || '없음'}</span>
                                                            <span style={{ color: '#cbd5e0' }}>→</span>
                                                            <span style={{ fontWeight: '800', color: '#4a5568' }}>{rec.newValue || '비어있음'}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ padding: '20px 25px' }}>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', width: '100%' }}>
                        <button onClick={onClose} className="secondary" style={{ padding: '10px 25px' }}>닫기</button>
                        
                        {/* Manufacturer Save Button */}
                        {isManufacturer && (
                            <button 
                                onClick={() => setIsConfirmOpen(true)} 
                                className="primary" 
                                style={{ padding: '10px 30px', fontWeight: '800', opacity: (canRegister && canEditForm) ? 1 : 0.5, cursor: (canRegister && canEditForm) ? 'pointer' : 'not-allowed' }} 
                                disabled={!canRegister || !canEditForm}
                            >
                                💾 저장/제출하기
                            </button>
                        )}

                        {/* Quality Team Action Buttons */}
                        {isQualityUser && (
                            <>
                                <button 
                                    onClick={() => setIsConfirmOpen(true)} 
                                    className="outline" 
                                    style={{ padding: '10px 25px', borderColor: '#4a5568', color: '#4a5568', opacity: (canRegister && !isApproved) ? 1 : 0.5, cursor: (canRegister && !isApproved) ? 'pointer' : 'not-allowed' }} 
                                    disabled={!canRegister || isApproved}
                                >
                                    💾 내역 저장
                                </button>
                                {isEditMode && formData.status === 'SUBMITTED' && (
                                    <>
                                        <button 
                                            onClick={() => handleStatusUpdate('REJECTED')} 
                                            className="outline" 
                                            style={{ borderColor: '#e53e3e', color: '#e53e3e', padding: '10px 25px', opacity: canRegister ? 1 : 0.5, cursor: canRegister ? 'pointer' : 'not-allowed' }} 
                                            disabled={!canRegister}
                                        >
                                            🚫 반려 처리
                                        </button>
                                        <button 
                                            onClick={() => handleStatusUpdate('APPROVED')} 
                                            className="primary" 
                                            style={{ padding: '10px 30px', fontWeight: '800', opacity: canRegister ? 1 : 0.5, cursor: canRegister ? 'pointer' : 'not-allowed' }} 
                                            disabled={!canRegister}
                                        >
                                            ✅ 최종 승인
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                        
                        {/* Quality Team can also save simple field updates */}
                        {isQualityUser && isEditMode && isApproved && (
                            <button 
                                onClick={() => setIsConfirmOpen(true)} 
                                className="primary" 
                                style={{ padding: '10px 30px', fontWeight: '800', opacity: canRegister ? 1 : 0.5, cursor: canRegister ? 'pointer' : 'not-allowed' }} 
                                disabled={!canRegister}
                            >
                                상세 저장
                            </button>
                        )}
                    </div>
                </div>

                {isSearchOpen && <ProductSearchPopup onClose={() => setIsSearchOpen(false)} onSelect={handleProductSelect} />}
                
                <SaveConfirmModal 
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleSave}
                />
            </div>
        </div>
    );
};

export default ProductionAuditDrawer;
