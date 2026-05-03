import React, { useState, useEffect } from 'react';
import { createClaim, updateClaim, uploadClaimResponse, uploadClaimPhoto, getClaimHistory } from './api';
import ProductSearchPopup from './ProductSearchPopup';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';

const ClaimDrawer = ({ claim, onClose, onSaved, user, readOnly = false, onNavigateToEdit }) => {
    const [formData, setFormData] = useState({
        receiptDate: new Date().toISOString().split('T')[0],
        country: '',
        itemCode: '',
        productName: '',
        lotNumber: '',
        manufacturer: '',
        occurrenceQty: 1,
        primaryCategory: '',
        secondaryCategory: '',
        tertiaryCategory: '',
        claimContent: '',
        consumerReplyNeeded: '불필요',
        productRetrievalNeeded: '불필요',
        expectedRetrievalDate: '',
        qualityCheckNeeded: '필요',
        claimPhotos: [],
        
        qualityStatus: '0. 접수',
        rootCauseAnalysis: '',
        preventativeAction: '',
        qualityReceivedReturnedProduct: '미수령',
        qualityReceivedDate: '',
        manufacturerResponsePdf: '',
        sharedWithManufacturer: false,
        terminationDate: '',
        
        mfrRootCauseAnalysis: '',
        mfrPreventativeAction: '',
        mfrRecallDate: '',
        mfrRecallStatus: '미회수',
        mfrTerminationDate: '',
        qualityRemarks: '',
        mfrRemarks: '',
        mfrStatus: '1. 접수'
    });

    const stands = user?.roles || [];
    const isManufacturer = stands.some(r => r.authority === 'ROLE_MANUFACTURER');
    const isAdmin = stands.some(r => r.authority === 'ROLE_ADMIN');
    const isQuality = stands.some(r => r.authority === 'ROLE_QUALITY' || 
        (user?.companyName === '더파운더즈' && (user?.department === 'Quality' || user?.department === '품질팀' || user?.department === '품질')));

    const { canEdit: canEditClaim } = usePermissions(user);
    const hasGlobalEdit = canEditClaim('claims');

    const canEditCs = (!readOnly) && hasGlobalEdit && (!isManufacturer);
    const canEditQuality = (!readOnly) && hasGlobalEdit && (isAdmin || isQuality || isManufacturer);
    const canEditMfr = (!readOnly) && hasGlobalEdit && (isAdmin || isManufacturer);

    const [isSearchPopupOpen, setIsSearchPopupOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const loadHistory = async () => {
        if (!claim) return;
        try {
            const res = await getClaimHistory(claim.id);
            setHistory(res.data);
        } catch (error) {
            // Silently fail
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab, claim]);

    const fieldTranslations = {
        'ReceiptDate': '접수일자',
        'Country': '인입 국가',
        'ItemCode': '품목코드',
        'ProductName': '품목명',
        'LotNumber': '로트(LOT)',
        'Manufacturer': '제조사',
        'OccurrenceQty': '발생수량',
        'PrimaryCategory': '대분류',
        'SecondaryCategory': '중분류',
        'TertiaryCategory': '소분류',
        'ClaimContent': '상세 클레임 내용',
        'QualityCheckNeeded': '품질팀 확인 필요 여부',
        'ConsumerReplyNeeded': '소비자 회신 필요 여부',
        'ProductRetrievalNeeded': '제품 회수 여부',
        'ExpectedRetrievalDate': '제품 회수 예상일자',
        'ClaimPhotos': '첨부 사진',
        'QualityStatus': '품질팀 처리 상태',
        'RootCauseAnalysis': '원인 분석',
        'PreventativeAction': '재발방지 체계 수립 내역',
        'QualityReceivedReturnedProduct': '품질팀 회수 제품 수령 여부',
        'QualityReceivedDate': '회수 제품 수령일자',
        'MfrRootCauseAnalysis': '제조사 원인 분석',
        'MfrPreventativeAction': '제조사 재발방지 대책',
        'MfrRecallDate': '제조사 제품 회수 일자',
        'MfrRecallStatus': '제조사 제품 회수 여부',
        'MfrTerminationDate': '제조사 클레임 종결일자',
        'MfrStatus': '제조사 처리 상태',
        'QualityRemarks': '품질팀 비고',
        'MfrRemarks': '제조사 비고'
    };

    const formatHistoryValue = (val, fieldName) => {
        if (!val || val === 'null' || val === '[]' || val === '-' || val === '{}') return '없음';
        if (typeof val === 'boolean' || val === 'true' || val === 'false') {
            return String(val) === 'true' ? '예' : '아니오';
        }
        try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'boolean') return parsed ? '예' : '아니오';
            
            if (Array.isArray(parsed)) {
                if (parsed.length === 0) return '없음';
                return parsed.map((item, index) => {
                    if (typeof item === 'string') {
                        if (item.startsWith('http') || item.startsWith('/uploads')) {
                            return decodeURIComponent(item.split('/').pop()).replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '');
                        }
                        return item;
                    }
                    if (typeof item === 'object') {
                        return '【 ' + Object.entries(item)
                            .filter(([k,v]) => v !== null && v !== '' && k !== 'id')
                            .map(([k,v]) => `${fieldTranslations[k] || k}: ${v}`)
                            .join(', ') + ' 】';
                    }
                    return String(item);
                }).join(', ');
            }
            if (typeof parsed === 'object') {
                return Object.entries(parsed)
                    .filter(([k,v]) => v !== null && v !== '' && v !== '[]' && v !== '{}' && v !== false && k !== 'id')
                    .map(([k,v]) => `${fieldTranslations[k] || k}: ${formatHistoryValue(typeof v === 'string' ? v : JSON.stringify(v), k)}`)
                    .join(' | ');
            }
        } catch (e) {}
        
        if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('/uploads'))) {
            return decodeURIComponent(val.split('/').pop()).replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '');
        }
        
        return val;
    };

    useEffect(() => {
        if (claim) {
            setFormData({
                receiptDate: claim.receiptDate || '',
                country: claim.country || '',
                itemCode: claim.itemCode || '',
                productName: claim.productName || '',
                lotNumber: claim.lotNumber || '',
                manufacturer: claim.manufacturer || '',
                occurrenceQty: claim.occurrenceQty || 1,
                primaryCategory: claim.primaryCategory || '',
                secondaryCategory: claim.secondaryCategory || '',
                tertiaryCategory: claim.tertiaryCategory || '',
                claimContent: claim.claimContent || '',
                consumerReplyNeeded: claim.consumerReplyNeeded || '불필요',
                productRetrievalNeeded: claim.productRetrievalNeeded || '불필요',
                expectedRetrievalDate: claim.expectedRetrievalDate || '',
                qualityCheckNeeded: claim.qualityCheckNeeded || '필요',
                claimPhotos: claim.claimPhotos || [],
                qualityStatus: claim.qualityStatus || '0. 접수',
                rootCauseAnalysis: claim.rootCauseAnalysis || '',
                preventativeAction: claim.preventativeAction || '',
                qualityReceivedReturnedProduct: claim.qualityReceivedReturnedProduct || '미수령',
                qualityReceivedDate: claim.qualityReceivedDate || '',
                manufacturerResponsePdf: claim.manufacturerResponsePdf || '',
                sharedWithManufacturer: claim.sharedWithManufacturer || false,
                terminationDate: claim.terminationDate || '',
                mfrRootCauseAnalysis: claim.mfrRootCauseAnalysis || '',
                mfrPreventativeAction: claim.mfrPreventativeAction || '',
                mfrRecallDate: claim.mfrRecallDate || '',
                mfrRecallStatus: claim.mfrRecallStatus || '미회수',
                mfrTerminationDate: claim.mfrTerminationDate || '',
                qualityRemarks: claim.qualityRemarks || '',
                mfrRemarks: claim.mfrRemarks || '',
                mfrStatus: claim.mfrStatus || '1. 접수',
                createdAt: claim.createdAt || '',
                updatedAt: claim.updatedAt || ''
            });
        }
    }, [claim]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (formData.claimPhotos.length + files.length > 10) {
            alert("최대 10장까지 가능합니다.");
            return;
        }
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) continue;
            try {
                const res = await uploadClaimPhoto(file);
                setFormData(prev => ({ ...prev, claimPhotos: [...prev.claimPhotos, res.data] }));
            } catch (error) {}
        }
    };
    
    const removePhoto = (indexToRemove) => {
        setFormData(prev => ({ ...prev, claimPhotos: prev.claimPhotos.filter((_, idx) => idx !== indexToRemove) }));
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        setIsConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsConfirmOpen(false);
        if (loading) return;
        
        const sanitizedData = { ...formData };
        const dateFields = ['receiptDate', 'expectedRetrievalDate', 'recallDate', 'qualityReceivedDate', 'terminationDate', 'mfrRecallDate', 'mfrTerminationDate'];
        dateFields.forEach(field => {
            if (sanitizedData[field] === '') {
                sanitizedData[field] = null;
            }
        });

        setLoading(true);
        try {
            if (claim) {
                await updateClaim(claim.id, sanitizedData);
                alert("수정되었습니다.");
            } else {
                await createClaim(sanitizedData);
                alert("등록되었습니다.");
            }
            onSaved();
            onClose();
        } catch (error) {
            const serverMsg = error.response?.data?.message || "";
            alert(`저장 중에 오류가 발생했습니다.\n${serverMsg}\n날짜 형식이 올바른지 확인해주세요.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="drawer-overlay" onClick={onClose}>
            <div className="drawer" onClick={e => e.stopPropagation()}>
                {/* 1. Header Section */}
                <div className="drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h2>{claim ? '🔍 클레임 상세 현황' : '🆕 신규 클레임 접수'}</h2>
                        {claim?.claimNumber && (
                            <span className="badge" style={{ 
                                background: '#e2e8f0', padding: '4px 12px', borderRadius: '20px', 
                                fontSize: '13px', fontWeight: 'bold', color: '#475569', 
                                border: '1px solid #cbd5e1' 
                            }}>
                                📑 {claim.claimNumber}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Tabs Section */}
                <div className="drawer-tabs-wrapper">
                    <div className="drawer-tabs">
                        <button 
                            type="button" 
                            className={`drawer-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                            onClick={() => setActiveTab('details')} 
                        >
                            상세 정보
                        </button>
                        {!isManufacturer && (
                            <button 
                                type="button" 
                                className={`drawer-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                                onClick={() => setActiveTab('history')} 
                            >
                                변경 이력
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. Body Section (Scrollable) */}
                <div className="drawer-body">
                    <form onSubmit={handleSubmit} className="drawer-body-form">
                        {activeTab === 'details' && (
                            <div className="tab-pane">
                                {/* 접수 정보 섹션 */}
                                <div className="card">
                                    <h3>
                                        <span style={{ color: '#4a90e2' }}>📝</span> 접수 정보
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>접수일자</label>
                                            <input type="date" name="receiptDate" value={formData.receiptDate} onChange={handleChange} disabled={!canEditCs} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>인입 국가</label>
                                            <input type="text" name="country" value={formData.country} onChange={handleChange} disabled={!canEditCs} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '20px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>품목코드</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input type="text" value={formData.itemCode} readOnly style={{ flex: 1, backgroundColor: '#f8fafc' }} />
                                                {canEditCs && <button type="button" onClick={() => setIsSearchPopupOpen(true)} className="secondary" style={{ padding: '0 15px' }}>검색</button>}
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>품목명</label>
                                            <input type="text" value={formData.productName} readOnly style={{ backgroundColor: '#f8fafc' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>로트(LOT)</label>
                                            <input type="text" name="lotNumber" value={formData.lotNumber} onChange={handleChange} disabled={!canEditCs} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>발생수량</label>
                                            <input type="number" name="occurrenceQty" value={formData.occurrenceQty} onChange={handleChange} disabled={!canEditCs} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>상세 클레임 내용</label>
                                        <textarea name="claimContent" value={formData.claimContent} onChange={handleChange} disabled={!canEditCs} rows="4" />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '20px' }}>
                                        <label>첨부 사진 (최대 5MB, 10개까지)</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
                                            {formData.claimPhotos.map((photo, idx) => (
                                                <div key={idx} style={{ position: 'relative', width: '90px', height: '90px' }}>
                                                    <img 
                                                        src={photo.startsWith('http') ? photo : `http://localhost:8080${photo}`} 
                                                        alt="Claim" 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }} 
                                                        onClick={() => window.open(photo.startsWith('http') ? photo : `http://localhost:8080${photo}`, '_blank')}
                                                    />
                                                    {canEditCs && (
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                                                            style={{ 
                                                                position: 'absolute', top: -8, right: -8, background: '#ef4444', 
                                                                color: 'white', border: 'none', borderRadius: '50%', 
                                                                width: '24px', height: '24px', cursor: 'pointer', 
                                                                fontSize: '14px', display: 'flex', alignItems: 'center', 
                                                                justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                                                            }}
                                                        >&times;</button>
                                                    )}
                                                </div>
                                            ))}
                                            {canEditCs && formData.claimPhotos.length < 10 && (
                                                <div style={{ 
                                                    width: '90px', height: '90px', background: '#f8fafc', 
                                                    border: '2px dashed #cbd5e1', borderRadius: '8px', 
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                                    justifyContent: 'center', cursor: 'pointer', position: 'relative', 
                                                    color: '#64748b', transition: 'all 0.2s'
                                                }}>
                                                    <span style={{ fontSize: '24px' }}>+</span>
                                                    <span style={{ fontSize: '11px' }}>추가</span>
                                                    <input 
                                                        type="file" 
                                                        multiple 
                                                        accept="image/*" 
                                                        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} 
                                                        onChange={handlePhotoUpload} 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 품질 분석 및 조치 (제조사 미노출) */}
                                {!isManufacturer && (
                                    <div className="card" style={{ borderLeft: '5px solid #38b2ac' }}>
                                        <h3>
                                            <span style={{ color: '#38b2ac' }}>🔬</span> 품질 분석 및 조치
                                        </h3>
                                        {(isAdmin || isQuality) && (
                                            <div style={{ 
                                                display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', 
                                                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', 
                                                marginBottom: '20px' 
                                            }}>
                                                <label style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#4a5568' }}>🛡️ 제조사 데이터 공유 활성화</label>
                                                <input type="checkbox" checked={formData.sharedWithManufacturer} onChange={e => setFormData(p => ({ ...p, sharedWithManufacturer: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
                                            </div>
                                        )}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>품질팀 처리 상태</label>
                                                <input type="text" value={formData.qualityStatus} readOnly style={{ backgroundColor: '#edf2f7', fontWeight: 'bold' }} />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>품질팀 클레임 종결일</label>
                                                <input type="date" name="terminationDate" value={formData.terminationDate} onChange={handleChange} disabled={!canEditQuality || !formData.preventativeAction} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>회수 제품 수령 여부</label>
                                                <select name="qualityReceivedReturnedProduct" value={formData.qualityReceivedReturnedProduct} onChange={handleChange} disabled={!canEditQuality}>
                                                    <option value="미수령">미수령</option>
                                                    <option value="수령">수령</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>회수 제품 수령일자</label>
                                                <input type="date" name="qualityReceivedDate" value={formData.qualityReceivedDate} onChange={handleChange} disabled={!canEditQuality} />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>품질팀 원인 분석/개선 방안</label>
                                            <textarea name="rootCauseAnalysis" value={formData.rootCauseAnalysis} onChange={handleChange} disabled={!canEditQuality} rows="3" />
                                        </div>
                                        <div className="form-group">
                                            <label>품질팀 재발방지대책 수립</label>
                                            <textarea name="preventativeAction" value={formData.preventativeAction} onChange={handleChange} disabled={!canEditQuality} rows="3" />
                                        </div>
                                    </div>
                                )}

                                {/* 제조사 담당자 기재 구역 */}
                                {((isManufacturer || formData.sharedWithManufacturer)) && (
                                    <div className="card" style={{ borderLeft: '5px solid #ed8936' }}>
                                        <h3>
                                            <span style={{ color: '#ed8936' }}>🏭</span> 제조사 담당자 의견
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>제조사 처리 상태</label>
                                                <input type="text" value={formData.mfrStatus} readOnly style={{ backgroundColor: '#fff', border: '1px solid #fbd38d', fontWeight: 'bold' }} />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>제조사 종결일자</label>
                                                <input type="date" name="mfrTerminationDate" value={formData.mfrTerminationDate} onChange={handleChange} disabled={!canEditMfr || !formData.mfrPreventativeAction} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>제조사 제품 회수 여부</label>
                                                <select name="mfrRecallStatus" value={formData.mfrRecallStatus} onChange={handleChange} disabled={!canEditMfr}>
                                                    <option value="미회수">미회수</option>
                                                    <option value="회수">회수</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>제조사 제품 회수 일자</label>
                                                <input type="date" name="mfrRecallDate" value={formData.mfrRecallDate} onChange={handleChange} disabled={!canEditMfr} />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>제조사 원인 분석</label>
                                            <textarea name="mfrRootCauseAnalysis" value={formData.mfrRootCauseAnalysis} onChange={handleChange} disabled={!canEditMfr} rows="3" />
                                        </div>
                                        <div className="form-group">
                                            <label>제조사 재발방지 대책</label>
                                            <textarea name="mfrPreventativeAction" value={formData.mfrPreventativeAction} onChange={handleChange} disabled={!canEditMfr} rows="3" />
                                        </div>
                                    </div>
                                )}
                                
                                {canEditQuality && (
                                    <div style={{ marginTop: '30px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #edf2f7', textAlign: 'center' }}>
                                        <button type="submit" className="primary" style={{ minWidth: '240px', padding: '12px 40px', fontSize: '15px' }} disabled={loading}>
                                            {loading ? '⏳ 저장 중...' : (claim ? '💾 변경사항 저장하기' : '🚀 신규 클레임 등록하기')}
                                        </button>
                                    </div>
                                )}
                            </div>
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
                                            // [고도화] 상세 사용자 정보 우선 노출, 없으면 기존 modifier 필드 사용
                                            const mName = rec.modifierName || rec.modifier || '시스템';
                                            const mId = rec.modifierUsername ? `(${rec.modifierUsername})` : '';
                                            const mComp = rec.modifierCompany ? ` [${rec.modifierCompany}]` : '';
                                            const groupKey = `${mName}${mId}${mComp} | ${timeKey}`;
                                            if (!acc[groupKey]) acc[groupKey] = [];
                                            acc[groupKey].push(rec);
                                            return acc;
                                        }, {})
                                    ).map(([groupKey, records], idx) => (
                                        <div key={idx} className="card">
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
                    </form>
                </div>

                {/* 4. Footer Section */}
                <div className="drawer-footer">
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <span>📅 등록일: <strong>{formData.createdAt ? formData.createdAt.substring(0, 16).replace('T', ' ') : '-'}</strong></span>
                        <span>🔄 마지막 수정: <strong>{formData.updatedAt ? formData.updatedAt.substring(0, 16).replace('T', ' ') : '-'}</strong></span>
                    </div>
                </div>
            </div>

            {/* Popups */}
            {isSearchPopupOpen && (
                <ProductSearchPopup 
                    onClose={() => setIsSearchPopupOpen(false)}
                    onSelect={(p) => {
                        setFormData(prev => ({ ...prev, itemCode: p.itemCode, productName: p.productName, manufacturer: p.manufacturerName || p.manufacturer || '' }));
                        setIsSearchPopupOpen(false);
                    }}
                />
            )}
            {isConfirmOpen && (
                <SaveConfirmModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmSave}
                />
            )}
        </div>
    );
};

export default ClaimDrawer;
