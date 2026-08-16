import React, { useState, useEffect } from 'react';
import {
    createProductionAudit,
    updateProductionAudit,
    toggleProductDisclosure,
    uploadFile,
    getProductionAuditHistory,
    deleteProductionAudit
} from './api';
import * as api from './api';
import { toast } from 'react-toastify';
import DOMPurify from 'dompurify';
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

    // Email feature state
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailForm, setEmailForm] = useState({ toEmail: '', subject: '', body: '' });
    const [initialToEmail, setInitialToEmail] = useState('');
    const [deptEmails, setDeptEmails] = useState({});
    const [selectedDepts, setSelectedDepts] = useState([]);
    const [emailModalTab, setEmailModalTab] = useState('preview');

    const { canEdit, isAdmin, hasPerm, canDelete } = usePermissions(user);
    const canRegister = canEdit('qualityPhotoAudit');

    useEffect(() => {
        setIsQualityUser(isAdmin || user?.roles?.some(r => r.authority?.includes('QUALITY') || r.authority?.includes('RESPONSIBLE_SALES')));
        setIsManufacturer(user?.roles?.some(r => r.authority?.includes('MANUFACTURER')));
        
        // 세부 기능 권한 기반 플래그
        const canManageDisclosure = isAdmin || hasPerm('AUDIT_DISCLOSE_MANAGE');
        const canViewHistory = isAdmin || isQualityUser || user?.roles?.some(r => r.authority?.includes('RESPONSIBLE_SALES'));
        const canEditApproved = isAdmin || hasPerm('AUDIT_EDIT_APPROVED');
        
        setPermissions({ canManageDisclosure, canViewHistory, canEditApproved });

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

    // Load templates for PRODUCTION_AUDIT
    useEffect(() => {
        if (!isManufacturer) {
            api.getActiveMailTemplates('PRODUCTION_AUDIT')
               .then(res => {
                   setTemplates(res.data);
                   if (res.data.length > 0) setSelectedTemplate(res.data[0].templateCode);
               })
               .catch(err => console.error("Failed to load templates", err));
        }
    }, [isManufacturer]);

    const fetchHistory = async (id) => {
        if (!id || id === 'null' || id === 'undefined') {
            setHistory([]);
            return;
        }
        try {
            const res = await getProductionAuditHistory(id);
            setHistory(res.data || []);
        } catch (error) {
            // Fetch history fail
        }
    };

    const fieldTranslations = {
        productionDate: '생산일자',
        status: '진행상태',
        isDisclosed: '제조사 공개여부',
        rejectionReason: '반려사유',
        containerImages: '용기 사진',
        boxImages: '단상자 사진',
        loadImages: '적재 사진'
    };

    const formatHistoryValue = (val, fieldName) => {
        if (!val || val === 'null' || val === '[]' || val === '-' || val === '{}') return '없음';
        if (typeof val === 'boolean' || val === 'true' || val === 'false') {
            return String(val) === 'true' ? '예' : '아니오';
        }
        if (fieldName === 'status') {
            if (val === 'SUBMITTED') return '제출됨';
            if (val === 'APPROVED') return '승인됨';
            if (val === 'PENDING') return '미진행';
            if (val === 'REJECTED') return '반려됨';
        }
        try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'boolean') return parsed ? '예' : '아니오';
            
            if (Array.isArray(parsed)) {
                if (parsed.length === 0) return '없음';
                return parsed.map((item) => {
                    if (typeof item === 'string') {
                        if (item.startsWith('http') || item.startsWith('/uploads')) {
                            return decodeURIComponent(item.split('/').pop()).replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '');
                        }
                        return item;
                    }
                    return String(item);
                }).join(', ');
            }
        } catch (e) {}
        
        if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('/uploads'))) {
            return decodeURIComponent(val.split('/').pop()).replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '');
        }
        // 컴마로 구분된 여러 이미지 처리
        if (typeof val === 'string' && val.includes('/uploads/')) {
            return val.split(',').map(item => decodeURIComponent(item.split('/').pop()).replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '')).join(', ');
        }
        
        return val;
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

    const handleAuditDelete = async () => {
        if (!audit || !audit.id) return;
        
        if (window.confirm("정말 이 생산감리 내역을 삭제하시겠습니까? 삭제된 데이터는 휴지통에서 확인 가능합니다.")) {
            try {
                await deleteProductionAudit(audit.id);
                toast.success("생산감리 내역이 삭제되었습니다.");
                onSaveSuccess();
                onClose();
            } catch (error) {
                toast.error("삭제 중 오류가 발생했습니다.");
            }
        }
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

    // Email Feature Handlers
    const handleOpenEmailModal = async () => {
        if (!audit?.id && formData.status !== 'PENDING') {
            toast.error("생산감리 내역을 먼저 저장해주세요.");
            return;
        }
        if (!selectedTemplate) {
            toast.error("메일 양식을 먼저 등록/선택해주세요.");
            return;
        }

        try {
            const targetId = audit?.id || formData.itemCode;
            const res = await api.getProductionAuditEmailPreview(targetId);
            const { toEmail, subject, body } = res.data;

            // Load departments and pre-check '품질팀' and '영업팀'
            let loadedDeptEmails = {};
            const companyName = formData.manufacturerName;
            if (companyName) {
                try {
                    const deptRes = await api.getCompanyDepartmentsAndEmails(companyName);
                    loadedDeptEmails = deptRes.data || {};
                    setDeptEmails(loadedDeptEmails);
                } catch (deptErr) {
                    console.error("Failed to load departments", deptErr);
                }
            }

            const defaultDepts = [];
            let defaultEmails = [];
            if (loadedDeptEmails['품질팀']) {
                defaultDepts.push('품질팀');
                defaultEmails = [...defaultEmails, ...loadedDeptEmails['품질팀'].map(e => e.trim())];
            }
            if (loadedDeptEmails['영업팀']) {
                defaultDepts.push('영업팀');
                defaultEmails = [...defaultEmails, ...loadedDeptEmails['영업팀'].map(e => e.trim())];
            }

            const uniqueEmails = [...new Set(defaultEmails.filter(Boolean))];

            setSelectedDepts(defaultDepts);
            setEmailForm({ 
                toEmail: uniqueEmails.join(', '), 
                subject: subject || '', 
                body: body || '' 
            });
            setInitialToEmail('');
            setEmailModalTab('preview');
            setIsEmailModalOpen(true);
        } catch (error) {
            toast.error("이메일 미리보기를 불러오는데 실패했습니다.");
        }
    };

    const handleDeptToggle = (deptName) => {
        const isSelected = selectedDepts.includes(deptName);
        const newSelectedDepts = isSelected 
            ? selectedDepts.filter(d => d !== deptName)
            : [...selectedDepts, deptName];
            
        setSelectedDepts(newSelectedDepts);

        // Rebuild toEmail to ONLY include emails of checked departments
        const currentEmails = [];
        newSelectedDepts.forEach(d => {
            if (deptEmails[d]) {
                deptEmails[d].forEach(email => {
                    const trimmed = email.trim();
                    if (trimmed && !currentEmails.includes(trimmed)) {
                        currentEmails.push(trimmed);
                    }
                });
            }
        });
        
        setEmailForm(prev => ({
            ...prev,
            toEmail: currentEmails.join(', ')
        }));
    };

    const handleSendEmail = async () => {
        if (!emailForm.toEmail.trim()) {
            toast.error("수신자 메일 주소를 입력해주세요.");
            return;
        }

        setIsSendingEmail(true);
        try {
            // [추가] 메일 발송 전 현재 상태를 DB에 저장
            let savedAuditId = audit?.id;
            
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

            // 중복 메일 전송 방지: update/create 단에서는 기존의 공개 여부 상태를 유지하여
            // false -> true 상태 변경에 의한 시스템 자동 이메일 알림 트리거를 차단합니다.
            const originalDisclosed = audit ? !!audit.isDisclosed : false;
            const dataToSave = { ...formData, status: nextStatus, isDisclosed: originalDisclosed };

            if (savedAuditId) {
                await updateProductionAudit(savedAuditId, dataToSave);
            } else {
                const hasImages = formData.containerImages || formData.boxImages || formData.loadImages;
                const hasData = hasImages || formData.productionDate;

                if (!hasData) {
                    await toggleProductDisclosure(formData.itemCode, originalDisclosed);
                } else {
                    const createRes = await createProductionAudit(dataToSave);
                    savedAuditId = createRes.data?.id;
                }
            }

            const targetId = savedAuditId || formData.itemCode;
            const res = await api.sendProductionAuditEmail(targetId, emailForm);
            
            // SMTP Mock mode warning
            if (res.data?.isMock || res.data?.message === "SMTP_NOT_CONFIGURED") {
                toast.info("💡 SMTP 서버 미설정으로 [Mock 모드]가 동작했습니다. mock_emails 폴더에 메일이 저장되었습니다.", { autoClose: 8000 });
            } else {
                toast.success("메일이 성공적으로 발송되었습니다.");
            }
            setIsEmailModalOpen(false);
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error) {
            const errorMsg = error.response?.data?.message || "메일 발송에 실패했습니다. 시스템 설정을 확인하세요.";
            toast.error(`[자동 전송] 에러 발생: ${errorMsg}`);
        } finally {
            setIsSendingEmail(false);
        }
    };

    const isEditMode = !!audit;
    const isApproved = formData.status === 'APPROVED';
    const canEditForm = !isApproved || permissions.canEditApproved; // Not approved OR has special permission

    const renderImageSection = (title, field, limitLabel) => {
        const images = formData[field] ? formData[field].split(',').filter(p => p) : [];
        return (
            <div className="card" style={{ marginBottom: '20px', border: '1px solid #edf2f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#2d3748', fontWeight: '800' }}>{title} <span style={{ color: '#e53e3e', fontSize: '13px' }}>(필수)</span> <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#718096' }}>({limitLabel})</span></h4>
                    {canEditForm && canRegister && (
                        <label className="secondary" style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #cbd5e0', background: '#fff' }}>
                            📸 사진 추가
                            <input type="file" multiple accept="image/*" onChange={(e) => handleFileUpload(e, field)} style={{ display: 'none' }} />
                        </label>
                    )}
                </div>
                {canEditForm && (
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
                            {canEditForm && canRegister && (
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
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '850px', maxWidth: '95vw' }}>
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

                    {/* 알림 메일 즉시 발송 (Claim과 스타일 100% 동일화) */}
                    {isQualityUser && formData.isDisclosed && (
                        <div style={{ 
                            display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                            padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                            marginBottom: '20px' 
                        }}>
                            <span style={{ fontWeight: 'bold', color: '#334155' }}>📧 알림 메일 즉시 발송</span>
                            <select 
                                value={selectedTemplate} 
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '200px' }}
                            >
                                {templates.length === 0 && <option value="">이용 가능한 양식 없음</option>}
                                {templates.map(t => (
                                    <option key={t.templateCode} value={t.templateCode}>{t.templateName}</option>
                                ))}
                            </select>
                            <button 
                                type="button" 
                                onClick={handleOpenEmailModal} 
                                disabled={isSendingEmail || !selectedTemplate || (!audit?.id && formData.status !== 'PENDING')}
                                className="primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 'bold' }}
                            >
                                {isSendingEmail ? (
                                    <><div className="spinner-ring" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div> 처리 중...</>
                                ) : (
                                    <>메일 발송하기</>
                                )}
                            </button>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>* 버튼 클릭 시 해당 양식으로 메일 내용 미리보기가 표시됩니다.</span>
                        </div>
                    )}

                    {/* Status and Disclosure Toggle */}
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {/* Removed old inline email box */}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            {permissions.canManageDisclosure && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#f8fafc', padding: '8px 15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isDisclosed} 
                                        onChange={(e) => setFormData({ ...formData, isDisclosed: e.target.checked })} 
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: '800', color: formData.isDisclosed ? '#38a169' : '#e53e3e' }}>
                                        제조사 공개 여부
                                    </span>
                                </label>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#718096' }}>진행상태:</label>
                                <span className={`badge ${formData.status === 'APPROVED' ? 'success' : formData.status === 'REJECTED' ? 'secondary' : formData.status === 'PENDING' ? 'warning' : 'info'}`} style={{ padding: '8px 20px', fontSize: '14px', borderRadius: '8px', fontWeight: '800' }}>
                                    {formData.status === 'SUBMITTED' ? '제출됨' : formData.status === 'APPROVED' ? '승인됨' : formData.status === 'PENDING' ? '미진행' : '반려됨'}
                                </span>
                                {isApproved && permissions.canEditApproved && (
                                    <span style={{ fontSize: '12px', color: '#3182ce', fontWeight: 'bold' }}>(🛡️ 수정 권한 활성화됨)</span>
                                )}
                            </div>
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
                                <input type="date" value={formData.productionDate} onChange={(e) => setFormData({...formData, productionDate: e.target.value})} disabled={!canEditForm} style={{ height: '45px' }} />
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
                                disabled={!isQualityUser || (isApproved && !permissions.canEditApproved)}
                                style={{ 
                                    background: (!isQualityUser || (isApproved && !permissions.canEditApproved)) ? 'transparent' : '#fff', 
                                    width: '100%',
                                    padding: '15px',
                                    resize: 'vertical',
                                    fontSize: '14px',
                                    lineHeight: '1.5',
                                    minHeight: '120px',
                                    borderRadius: '8px',
                                    border: (!isQualityUser || (isApproved && !permissions.canEditApproved)) ? 'none' : '1px solid #cbd5e0',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    )}
                </>
            )}

            {activeTab === 'history' && (
                <div className="tab-pane">
                    {history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0', background: '#f8fafc', borderRadius: '12px' }}>
                            <p style={{ fontSize: '18px', margin: 0 }}>📭 변경 이력이 없습니다.</p>
                        </div>
                    ) : (
                        Object.entries(
                            history.reduce((acc, rec) => {
                                const timeKey = rec.modifiedAt ? rec.modifiedAt.substring(0, 19).replace('T', ' ') : '알 수 없는 시간';
                                const mName = rec.modifierName || rec.modifier || '시스템';
                                const mId = rec.modifierUsername ? `(${rec.modifierUsername})` : '';
                                const mComp = rec.modifierCompany ? ` [${rec.modifierCompany}]` : '';
                                const groupKey = `${mName}${mId}${mComp} | ${timeKey}`;
                                if (!acc[groupKey]) acc[groupKey] = [];
                                acc[groupKey].push(rec);
                                return acc;
                            }, {})
                        ).map(([groupKey, records], idx) => (
                            <div key={idx} className="card" style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                                <div style={{ color: '#2b6cb0', fontWeight: '800', fontSize: '14px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    🕒 {groupKey}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {records.map((rec, rIdx) => {
                                        const displayName = fieldTranslations[rec.fieldName] || rec.fieldName;
                                        const oldVal = formatHistoryValue(rec.oldValue, rec.fieldName);
                                        const newVal = formatHistoryValue(rec.newValue, rec.fieldName);
                                        
                                        return (
                                            <div key={rec.id || rIdx} style={{ fontSize: '13px', paddingLeft: '15px', position: 'relative', borderLeft: '2px solid #e2e8f0', paddingBottom: '5px' }}>
                                                <strong style={{ display: 'inline-block', minWidth: '140px', color: '#4a5568' }}>{displayName}</strong>
                                                <span style={{ color: '#e53e3e', textDecoration: oldVal === '없음' ? 'none' : 'line-through', marginRight: '8px' }}>{oldVal}</span>
                                                <span style={{ color: '#a0aec0', margin: '0 8px' }}>→</span>
                                                <span style={{ color: '#38a169', fontWeight: '700' }}>{newVal}</span>
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

                <div className="drawer-footer">
                    <div className="footer-left">
                        <span>상태: <strong style={{ color: '#0f172a' }}>{formData.status === 'APPROVED' ? '✅ 승인됨' : formData.status === 'REJECTED' ? '🚫 반려됨' : '📝 작성/제출'}</strong></span>
                        {formData.createdAt && <span>📅 등록: <strong>{formData.createdAt.substring(0, 10)}</strong></span>}
                    </div>
                    <div className="footer-actions">
                        {audit && canDelete('qualityPhotoAudit') && (
                            <button 
                                onClick={handleAuditDelete} 
                                className="outline" 
                                style={{ padding: '8px 16px', color: '#c53030', borderColor: '#feb2b2', marginRight: 'auto' }}
                            >
                                🗑️ 삭제
                            </button>
                        )}
                        <button onClick={onClose} className="secondary" style={{ minWidth: '80px' }}>닫기</button>
                        
                        {/* Manufacturer Save Button */}
                        {isManufacturer && (
                            <button 
                                onClick={() => setIsConfirmOpen(true)} 
                                className="primary" 
                                style={{ minWidth: '120px', background: '#003366', color: '#fff', fontWeight: '800', opacity: (canRegister && canEditForm) ? 1 : 0.5, cursor: (canRegister && canEditForm) ? 'pointer' : 'not-allowed' }} 
                                disabled={!canRegister || !canEditForm}
                            >
                                💾 저장/제출하기
                            </button>
                        )}

                        {/* Quality Team Actions */}
                        {isQualityUser && (
                            <>
                                {/* Case: Edit Approved Item (Only Save button) */}
                                {isEditMode && isApproved && permissions.canEditApproved ? (
                                    <button 
                                        onClick={() => setIsConfirmOpen(true)} 
                                        className="primary" 
                                        style={{ minWidth: '120px', background: '#003366', color: '#fff', fontWeight: '800' }}
                                    >
                                        💾 내역 저장 (승인됨)
                                    </button>
                                ) : (
                                    /* Case: Normal Edit/Create */
                                    <>
                                        <button 
                                            onClick={() => setIsConfirmOpen(true)} 
                                            className="outline" 
                                            style={{ padding: '8px 16px', borderColor: '#cbd5e1', color: '#334155', opacity: canEditForm ? 1 : 0.5, cursor: canEditForm ? 'pointer' : 'not-allowed' }} 
                                            disabled={!canEditForm}
                                        >
                                            💾 내역 저장
                                        </button>
                                        {isEditMode && formData.status === 'SUBMITTED' && (
                                            <>
                                                <button 
                                                    onClick={() => handleStatusUpdate('REJECTED')} 
                                                    className="outline" 
                                                    style={{ borderColor: '#ef4444', color: '#ef4444', padding: '8px 16px', opacity: canRegister ? 1 : 0.5, cursor: canRegister ? 'pointer' : 'not-allowed' }} 
                                                    disabled={!canRegister}
                                                >
                                                    🚫 반려 처리
                                                </button>
                                                <button 
                                                    onClick={() => handleStatusUpdate('APPROVED')} 
                                                    className="primary" 
                                                    style={{ minWidth: '100px', background: '#16a34a', color: '#fff', fontWeight: '800', opacity: canRegister ? 1 : 0.5, cursor: canRegister ? 'pointer' : 'not-allowed' }} 
                                                    disabled={!canRegister}
                                                >
                                                    ✅ 최종 승인
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </>
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
            
            {/* Email Preview & Send Modal */}
            {isEmailModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal-content" style={{ width: '700px', maxWidth: '90vw', padding: '0', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
                        
                        <div className="modal-header" style={{ borderBottom: '1px solid #edf2f7', padding: '20px 25px', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1a202c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📧 생산감리 알림 메일 발송 미리보기
                                </h3>
                                <button onClick={() => !isSendingEmail && setIsEmailModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#a0aec0' }}>
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="modal-body" style={{ padding: '25px', maxHeight: '70vh', overflowY: 'auto' }}>
                            
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#3b82f6' }}>👤</span> 수신자 이메일
                                </label>
                                <input 
                                    type="text" 
                                    value={emailForm.toEmail} 
                                    onChange={(e) => setEmailForm({...emailForm, toEmail: e.target.value})}
                                    style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                                    placeholder="수신자 이메일을 입력하세요 (콤마로 구분하여 여러 명 입력 가능)"
                                />
                                {!emailForm.toEmail && (
                                    <div style={{ color: '#e53e3e', fontSize: '12px', marginTop: '5px', fontWeight: '600' }}>⚠️ 수신자 이메일 주소가 없습니다. 직접 입력해주세요.</div>
                                )}
                            </div>

                            {Object.keys(deptEmails).length > 0 && (
                                <div className="form-group" style={{ marginBottom: '20px', background: '#f1f5f9', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ fontWeight: '800', color: '#334155', fontSize: '13px', marginBottom: '10px', display: 'block' }}>👥 수신 대상 팀 선택 (자동 추가)</label>
                                    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                                        {Object.entries(deptEmails).map(([dept, emails]) => (
                                            <label key={dept} style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '6px', background: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', border: '1px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedDepts.includes(dept)}
                                                    onChange={() => handleDeptToggle(dept)}
                                                />
                                                {dept} <span style={{ color: '#64748b', fontSize: '12px' }}>({emails.length})</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#3b82f6' }}>📝</span> 메일 제목
                                </label>
                                <input 
                                    type="text" 
                                    value={emailForm.subject} 
                                    onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                                    style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', fontSize: '14px', width: '100%', boxSizing: 'border-box', fontWeight: '600' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                                    <label style={{ fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                        <span style={{ color: '#3b82f6' }}>✉️</span> 메일 본문
                                    </label>
                                    <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '6px', padding: '3px' }}>
                                        <button 
                                            onClick={() => setEmailModalTab('preview')}
                                            style={{ padding: '5px 12px', fontSize: '12px', border: 'none', borderRadius: '4px', background: emailModalTab === 'preview' ? 'white' : 'transparent', color: emailModalTab === 'preview' ? '#1e293b' : '#64748b', fontWeight: emailModalTab === 'preview' ? 'bold' : 'normal', cursor: 'pointer', boxShadow: emailModalTab === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                                        >
                                            미리보기
                                        </button>
                                        <button 
                                            onClick={() => setEmailModalTab('edit')}
                                            style={{ padding: '5px 12px', fontSize: '12px', border: 'none', borderRadius: '4px', background: emailModalTab === 'edit' ? 'white' : 'transparent', color: emailModalTab === 'edit' ? '#1e293b' : '#64748b', fontWeight: emailModalTab === 'edit' ? 'bold' : 'normal', cursor: 'pointer', boxShadow: emailModalTab === 'edit' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                                        >
                                            직접 편집
                                        </button>
                                    </div>
                                </div>
                                
                                {emailModalTab === 'preview' ? (
                                    <div 
                                        className="email-preview-content"
                                        style={{ 
                                            padding: '20px', 
                                            border: '1px solid #cbd5e1', 
                                            borderRadius: '8px', 
                                            background: '#fff', 
                                            minHeight: '300px',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(emailForm.body) }}
                                    />
                                ) : (
                                    <textarea 
                                        value={emailForm.body} 
                                        onChange={(e) => setEmailForm({...emailForm, body: e.target.value})}
                                        style={{ 
                                            padding: '15px', 
                                            border: '1px solid #cbd5e1', 
                                            borderRadius: '8px', 
                                            background: '#1e293b', 
                                            color: '#a5b4fc',
                                            fontSize: '13px', 
                                            fontFamily: 'monospace',
                                            width: '100%', 
                                            minHeight: '300px',
                                            boxSizing: 'border-box',
                                            resize: 'vertical'
                                        }}
                                    />
                                )}
                            </div>

                        </div>

                        <div className="modal-footer" style={{ padding: '20px 25px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => setIsEmailModalOpen(false)} 
                                className="secondary" 
                                style={{ padding: '10px 20px', background: 'white', color: '#475569', border: '1px solid #cbd5e1' }}
                                disabled={isSendingEmail}
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleSendEmail} 
                                className="primary" 
                                style={{ 
                                    padding: '10px 25px', 
                                    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)', 
                                    border: 'none', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    opacity: isSendingEmail ? 0.7 : 1
                                }}
                                disabled={isSendingEmail}
                            >
                                {isSendingEmail ? (
                                    <>
                                        <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                        발송 중...
                                    </>
                                ) : (
                                    <>🚀 확인 및 발송</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionAuditDrawer;
