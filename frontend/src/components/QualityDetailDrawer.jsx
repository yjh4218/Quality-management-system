import React, { useState, useEffect } from 'react';
import { getProductByItemCode, deleteInbound } from '../api';
import SaveConfirmModal from './SaveConfirmModal';
import { usePermissions } from '../usePermissions';
import NumericFormattedInput from './common/NumericFormattedInput';
import { toast } from 'react-toastify';

const QualityDetailDrawer = ({
    isOpen,
    onClose,
    user,
    selectedInbound,
    setSelectedInbound,
    activeTab,
    setActiveTab,
    history,
    manufacturers,
    isInternalQuality,
    isAdmin,
    isManufacturer,
    overallStatusMap,
    handleFileUpload,
    handleSave,
    getFullUrl,
    getCleanFileName,
    isLoading
}) => {
    const { canViewHistory } = usePermissions(user);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [productInfo, setProductInfo] = useState(null);

    useEffect(() => {
        const fetchProduct = async () => {
            if (selectedInbound?.itemCode) {
                try {
                    const res = await getProductByItemCode(selectedInbound.itemCode);
                    setProductInfo(res.data);
                } catch (error) {
                    setProductInfo(null);
                }
            }
        };
        fetchProduct();
    }, [selectedInbound?.itemCode]);

    if (!isOpen || !selectedInbound) return null;

    const fieldTranslations = {
        'overallStatus': '통합 진행 상태',
        'inboundInspectionStatus': '입고검사 단계',
        'inboundInspectionResult': '입고 검사 결과',
        'controlSampleStatus': '관리품 확인',
        'finalInspectionResult': '완제품 검사 결과',
        'qualityDecisionDate': '품질 적합 판정일',
        'specificGravity': '비중값',
        'testReportNumbers': '시험성적서 번호',
        'coaFileUrl': 'COA 국문',
        'coaFileUrlEng': 'COA 영문',
        'coaDecisionDate': '성적서 판정일',
        'remark': '비고',
        'itemCode': '품목코드',
        'productName': '제품명',
        'manufacturer': '제조사',
        'lotNumber': 'LOT 번호',
        'expirationDate': '사용기한',
        'quantity': '입고 수량',
        'inboundDate': '입고일자',
        'controlSampleRemarks': '관리품 확인 중 특이사항',
        'finalInspectionRemarks': '완제품 검사 중 특이사항',
        'mfrRemarks': '제조사 확인 비고'
    };

    const formatHistoryValue = (val, fieldName) => {
        if (!val || val === 'null' || val === '[]' || val === '-' || val === '{}') return '없음';
        
        if (fieldName === 'overallStatus') return overallStatusMap[val] || val;

        if (typeof val === 'boolean' || val === 'true' || val === 'false') {
            return String(val) === 'true' ? '예' : '아니오';
        }
        try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'boolean') return parsed ? '예' : '아니오';
            
            if (Array.isArray(parsed)) {
                if (parsed.length === 0) return '없음';
                return parsed.map((item) => {
                    if (typeof item === 'string') {
                        if (item.startsWith('http') || item.startsWith('/uploads')) {
                            return getCleanFileName(item);
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
            return getCleanFileName(val);
        }
        
        return val;
    };

    const handleChange = (field) => (e) => {
        setSelectedInbound(prev => ({ ...prev, [field]: e.target.value }));
    };

    const validateAndSave = () => {
        if (!selectedInbound.itemCode || !String(selectedInbound.itemCode).trim()) {
            toast.warning("품목코드 칸이 비어있습니다. 반드시 입력해주세요.");
            return;
        }
        if (!selectedInbound.productName || !String(selectedInbound.productName).trim()) {
            toast.warning("제품명 칸이 비어있습니다. 반드시 입력해주세요.");
            return;
        }
        if (!selectedInbound.manufacturer || !String(selectedInbound.manufacturer).trim()) {
            toast.warning("제조사를 목록에서 반드시 선택해주세요.");
            return;
        }
        if (!selectedInbound.lotNumber || !String(selectedInbound.lotNumber).trim()) {
            toast.warning("LOT 번호가 누락되었습니다.");
            return;
        }

        const parsedQuantity = Number(selectedInbound.quantity);
        if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
            toast.warning("입고 수량은 문자가 아닌 0보다 큰 숫자만 허용됩니다.");
            return;
        }

        if (selectedInbound.specificGravity !== null && selectedInbound.specificGravity !== '') {
            const parsedGravity = Number(selectedInbound.specificGravity);
            if (Number.isNaN(parsedGravity)) {
                toast.warning("비중값은 한글/영문이 아닌 정확한 숫자(또는 소수)만 입력 가능합니다.");
                return;
            }
        }

        setIsConfirmOpen(true);
    };

    const handleConfirmFinalSave = () => {
        setIsConfirmOpen(false);
        handleSave();
    };

    const handleDelete = async () => {
        if (window.confirm("정말 이 입고 내역을 삭제하시겠습니까? 삭제된 데이터는 휴지통에서 확인 가능합니다.")) {
            try {
                await deleteInbound(selectedInbound.id);
                toast.success("삭제되었습니다.");
                onClose();
                if (window.__QMS_REFRESH_QUALITY__) window.__QMS_REFRESH_QUALITY__();
            } catch (e) {
                toast.error("삭제에 실패했습니다.");
            }
        }
    };

    const canEditWms = isInternalQuality || isAdmin;
    const canEditQuality = isInternalQuality || isAdmin;
    const canEditMfr = isManufacturer || isAdmin;

    return (
        <div className="drawer-overlay" style={{ zIndex: 4500 }}>
            <div className="drawer" onClick={(e) => e.stopPropagation()} style={{ width: '1200px' }}>
                
                <div className="drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {productInfo?.imagePath ? (
                            <img 
                                src={getFullUrl(productInfo.imagePath)} 
                                alt="제품 썸네일" 
                                style={{ 
                                    width: '48px', 
                                    height: '48px', 
                                    objectFit: 'contain', 
                                    borderRadius: '8px', 
                                    border: '1px solid #e2e8f0', 
                                    background: '#ffffff',
                                    padding: '2px'
                                }} 
                            />
                        ) : (
                            <span style={{ fontSize: '28px' }}>📦</span>
                        )}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 style={{ margin: 0 }}>{selectedInbound.productName || '제품명 미지정'}</h2>
                                <span className="badge" style={{ 
                                    background: '#eff6ff', 
                                    color: '#1d4ed8', 
                                    border: '1px solid #bfdbfe', 
                                    padding: '3px 8px', 
                                    borderRadius: '6px', 
                                    fontSize: '12px', 
                                    fontWeight: 'bold',
                                    fontFamily: 'monospace'
                                }}>
                                    {selectedInbound.itemCode}
                                </span>
                                {selectedInbound.overallStatus && (
                                    <span className="badge" style={{ 
                                        background: selectedInbound.overallStatus === 'STEP5_FINAL_COMPLETE' ? '#ecfdf5' : '#fff7ed', 
                                        color: selectedInbound.overallStatus === 'STEP5_FINAL_COMPLETE' ? '#059669' : '#d97706',
                                        border: `1px solid ${selectedInbound.overallStatus === 'STEP5_FINAL_COMPLETE' ? '#a7f3d0' : '#fed7aa'}`,
                                        padding: '3px 8px', 
                                        borderRadius: '6px', 
                                        fontSize: '12px', 
                                        fontWeight: 'bold'
                                    }}>
                                        ● {overallStatusMap[selectedInbound.overallStatus] || selectedInbound.overallStatus}
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px', display: 'flex', gap: '15px' }}>
                                <span><strong style={{ color: '#475569' }}>GRN:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedInbound.grnNumber}</span></span>
                                {selectedInbound.manufacturer && <span><strong style={{ color: '#475569' }}>제조사:</strong> {selectedInbound.manufacturer}</span>}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                <div className="drawer-tabs-wrapper">
                    <div className="drawer-tabs">
                        <button 
                            type="button" 
                            className={`drawer-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                            onClick={() => setActiveTab('info')} 
                        >
                            📋 기본 정보
                        </button>
                        {canViewHistory && (
                            <button 
                                type="button" 
                                className={`drawer-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                                onClick={() => setActiveTab('history')} 
                            >
                                🕒 변경 이력
                            </button>
                        )}
                    </div>
                </div>

                <div className="drawer-body">
                    {activeTab === 'info' && (
                        <div className="tab-pane">
                            
                            {/* 카드 1: WMS 입고 기본 정보 (Blue Theme - 한 줄에 3개 항목) */}
                            <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #2563eb', background: '#ffffff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a' }}>
                                        <span style={{ color: '#2563eb' }}>📋</span> WMS 입고 기본 정보
                                    </h3>
                                    <span style={{ fontSize: '11.5px', color: '#1d4ed8', background: '#eff6ff', padding: '3px 10px', borderRadius: '6px', border: '1px solid #bfdbfe', fontWeight: '600' }}>
                                        WMS 연동 데이터
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>품목코드</label>
                                        <input 
                                            type="text" 
                                            value={selectedInbound.itemCode || ''} 
                                            onChange={handleChange('itemCode')} 
                                            disabled={!canEditWms} 
                                            style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>제품명</label>
                                        <input 
                                            type="text" 
                                            value={selectedInbound.productName || ''} 
                                            onChange={handleChange('productName')} 
                                            disabled={!canEditWms} 
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>진행 상태 (Overall)</label>
                                        <select 
                                            value={selectedInbound.overallStatus || ''} 
                                            onChange={handleChange('overallStatus')}
                                            disabled={!canEditWms}
                                        >
                                            {Object.entries(overallStatusMap).map(([key, val]) => (
                                                <option key={key} value={key}>{val}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>제조사</label>
                                        <select 
                                            value={selectedInbound.manufacturer || ''} 
                                            onChange={handleChange('manufacturer')}
                                            disabled={!canEditWms}
                                        >
                                            <option value="">선택하세요</option>
                                            {manufacturers.map(m => (
                                                <option key={m.id} value={m.name}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>입고일자</label>
                                        <input 
                                            type="date" 
                                            value={selectedInbound.inboundDate ? selectedInbound.inboundDate.split('T')[0] : ''} 
                                            onChange={e => {
                                                const timePart = selectedInbound.inboundDate ? selectedInbound.inboundDate.split('T')[1] || '00:00:00' : '00:00:00';
                                                setSelectedInbound(prev => ({ ...prev, inboundDate: `${e.target.value}T${timePart.split('.')[0]}` }));
                                            }}
                                            disabled={!isAdmin} 
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>입고 수량 (EA)</label>
                                        <NumericFormattedInput 
                                            name="quantity" 
                                            disabled={!canEditWms} 
                                            value={selectedInbound.quantity || 0} 
                                            onChange={handleChange('quantity')} 
                                            placeholder="수량 입력" 
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>LOT 번호</label>
                                        <input 
                                            type="text" 
                                            value={selectedInbound.lotNumber || ''} 
                                            onChange={handleChange('lotNumber')} 
                                            disabled={!canEditWms} 
                                            style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>사용기한</label>
                                        <input 
                                            type="date" 
                                            value={selectedInbound.expirationDate || ''} 
                                            onChange={handleChange('expirationDate')} 
                                            disabled={!canEditWms} 
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                    </div>
                                </div>
                            </div>

                            {/* 카드 2: 품질 담당자 검사 및 판정 (Teal/Emerald Theme - 한 줄에 2개씩 + 단계별 특이사항 매칭) */}
                            <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #0d9488', background: '#ffffff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e' }}>
                                        <span style={{ color: '#0d9488' }}>🔬</span> 품질 담당자 검사 및 판정
                                    </h3>
                                    <span style={{ fontSize: '11.5px', color: '#0f766e', background: '#f0fdfa', padding: '3px 10px', borderRadius: '6px', border: '1px solid #99f6e4', fontWeight: '600' }}>
                                        품질팀 검사 영역
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>입고검사 단계</label>
                                        <select 
                                            value={selectedInbound.inboundInspectionStatus || '검사 대기'} 
                                            onChange={handleChange('inboundInspectionStatus')}
                                            disabled={!canEditQuality}
                                        >
                                            {['검사 대기', '검사 중', '검사 완료', '반품'].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>입고 검사 결과</label>
                                        <select 
                                            value={selectedInbound.inboundInspectionResult || '판정 중'} 
                                            onChange={handleChange('inboundInspectionResult')}
                                            disabled={!canEditQuality}
                                            style={{
                                                color: selectedInbound.inboundInspectionResult === '적합' ? '#059669' : (selectedInbound.inboundInspectionResult === '부적합' ? '#dc2626' : '#d97706'),
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {['판정 중', '적합', '부적합'].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>관리품 확인 단계</label>
                                        <select 
                                            value={selectedInbound.controlSampleStatus || '검사 대기'} 
                                            onChange={handleChange('controlSampleStatus')}
                                            disabled={!canEditQuality}
                                        >
                                            {['검사 대기', '검사 중', '검사 완료'].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>관리품 확인 중 특이사항</label>
                                        <textarea 
                                            rows="2" 
                                            value={selectedInbound.controlSampleRemarks || ''} 
                                            onChange={handleChange('controlSampleRemarks')} 
                                            disabled={!canEditQuality}
                                            placeholder="관리품 확인 시 특이사항이 있다면 입력해주세요." 
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>완제품 검사 결과</label>
                                        <select 
                                            value={selectedInbound.finalInspectionResult || '판정 중'} 
                                            onChange={handleChange('finalInspectionResult')}
                                            disabled={!canEditQuality}
                                            style={{
                                                color: selectedInbound.finalInspectionResult === '적합' ? '#059669' : (selectedInbound.finalInspectionResult === '부적합' ? '#dc2626' : '#d97706'),
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {['판정 중', '적합', '부적합'].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>품질 적합 판정일 (Final Decision Date)</label>
                                        <input 
                                            type="date" 
                                            value={selectedInbound.qualityDecisionDate || ''} 
                                            onChange={handleChange('qualityDecisionDate')}
                                            disabled={!canEditQuality} 
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>완제품 검사 중 특이사항</label>
                                    <textarea 
                                        rows="2" 
                                        value={selectedInbound.finalInspectionRemarks || ''} 
                                        onChange={handleChange('finalInspectionRemarks')} 
                                        disabled={!canEditQuality}
                                        placeholder="완제품 검사 시 특이사항이 있다면 입력해주세요." 
                                    />
                                </div>
                            </div>

                            {/* 카드 3: 제조사 성적서 및 COA 문서 (Amber/Orange Theme - 한 줄에 3개 분할 + 비고 1줄 전체) */}
                            <div className="card" style={{ borderLeft: '4px solid #d97706', background: '#ffffff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e' }}>
                                        <span style={{ color: '#d97706' }}>🏭</span> 제조사 성적서 및 COA 문서
                                    </h3>
                                    <span style={{ fontSize: '11.5px', color: '#b45309', background: '#fffbeb', padding: '3px 10px', borderRadius: '6px', border: '1px solid #fde68a', fontWeight: '600' }}>
                                        제조사 등록 영역
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>비중값 (Specific Gravity)</label>
                                        <input 
                                            type="number" 
                                            step="0.001" 
                                            value={selectedInbound.specificGravity || ''} 
                                            onChange={e => setSelectedInbound(prev => ({ ...prev, specificGravity: parseFloat(e.target.value) }))}
                                            disabled={!canEditMfr} 
                                            placeholder="예: 1.025" 
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>성적서 판정일</label>
                                        <input 
                                            type="date" 
                                            value={selectedInbound.coaDecisionDate || ''} 
                                            onChange={handleChange('coaDecisionDate')}
                                            disabled={!canEditMfr} 
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>시험성적서 번호 (콤마 구분)</label>
                                        <input 
                                            type="text" 
                                            value={selectedInbound.testReportNumbers || ''} 
                                            onChange={handleChange('testReportNumbers')}
                                            disabled={!canEditMfr} 
                                            placeholder="예: TR-2026-001, TR-2026-002" 
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label>제조사 확인 비고</label>
                                    <textarea 
                                        rows="2" 
                                        value={selectedInbound.mfrRemarks || ''} 
                                        onChange={handleChange('mfrRemarks')} 
                                        disabled={!canEditMfr} 
                                        placeholder="제조사 측 특이사항을 입력해주세요." 
                                    />
                                </div>

                                {/* COA 문서 업로드 2종 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    {/* 국문 COA */}
                                    <div style={{ padding: '15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #d97706', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#92400e' }}>📄 COA 국문 (PDF)</span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>최대 10MB</span>
                                        </div>
                                        {selectedInbound.coaFileUrl ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ecfdf5', padding: '10px 12px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                                                <span style={{ fontSize: '12.5px', color: '#065f46', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                                                    ✓ {getCleanFileName(selectedInbound.coaFileUrl)}
                                                </span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <a 
                                                        href={getFullUrl(selectedInbound.coaFileUrl)} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="secondary"
                                                        style={{ padding: '4px 10px', fontSize: '12px', textDecoration: 'none', borderRadius: '4px', background: '#fff', border: '1px solid #cbd5e1', color: '#334155' }}
                                                    >
                                                        열기
                                                    </a>
                                                    {canEditMfr && (
                                                        <label className="secondary" style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px', background: '#fff', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer', margin: 0 }}>
                                                            변경
                                                            <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFileUpload(e, selectedInbound, 'coaFileUrl')} />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                {canEditMfr ? (
                                                    <input 
                                                        type="file" 
                                                        accept=".pdf" 
                                                        onChange={e => handleFileUpload(e, selectedInbound, 'coaFileUrl')} 
                                                        style={{ width: '100%', fontSize: '13px' }}
                                                    />
                                                ) : (
                                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>등록된 파일이 없습니다.</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 영문 COA */}
                                    <div style={{ padding: '15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #0284c7', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#0369a1' }}>🌐 COA 영문 (PDF)</span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>최대 10MB</span>
                                        </div>
                                        {selectedInbound.coaFileUrlEng ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ecfdf5', padding: '10px 12px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                                                <span style={{ fontSize: '12.5px', color: '#065f46', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                                                    ✓ {getCleanFileName(selectedInbound.coaFileUrlEng)}
                                                </span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <a 
                                                        href={getFullUrl(selectedInbound.coaFileUrlEng)} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="secondary"
                                                        style={{ padding: '4px 10px', fontSize: '12px', textDecoration: 'none', borderRadius: '4px', background: '#fff', border: '1px solid #cbd5e1', color: '#334155' }}
                                                    >
                                                        열기
                                                    </a>
                                                    {canEditMfr && (
                                                        <label className="secondary" style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px', background: '#fff', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer', margin: 0 }}>
                                                            변경
                                                            <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFileUpload(e, selectedInbound, 'coaFileUrlEng')} />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                {canEditMfr ? (
                                                    <input 
                                                        type="file" 
                                                        accept=".pdf" 
                                                        onChange={e => handleFileUpload(e, selectedInbound, 'coaFileUrlEng')} 
                                                        style={{ width: '100%', fontSize: '13px' }}
                                                    />
                                                ) : (
                                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>등록된 파일이 없습니다.</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div>
                            {history.length === 0 ? (
                                <p style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                                    등록된 변경 이력이 없습니다.
                                </p>
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
                                    <div key={idx} style={{ padding: '15px 20px', borderBottom: '1px solid #eee', marginBottom: '12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ color: '#003366', fontWeight: 'bold', fontSize: '13px', marginBottom: '10px' }}>
                                            🕒 {groupKey}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {records.map((rec, rIdx) => {
                                                const displayName = rec.fieldName ? (fieldTranslations[rec.fieldName] || rec.fieldName) : '항목';
                                                const oldVal = formatHistoryValue(rec.oldValue, rec.fieldName);
                                                const newVal = formatHistoryValue(rec.newValue, rec.fieldName);

                                                return (
                                                    <div key={rec.id || rIdx} style={{ display: 'flex', gap: '10px', fontSize: '12.5px', padding: '4px 0', borderBottom: '1px solid #f8fafc' }}>
                                                        <div style={{ minWidth: '160px', color: '#64748b', fontWeight: '600' }}>{displayName}</div>
                                                        <div style={{ flex: 1, color: '#334155' }}>
                                                            <span style={{ color: '#e11d48', textDecoration: oldVal === '없음' ? 'none' : 'line-through' }}>{oldVal}</span>
                                                            <span style={{ margin: '0 8px', color: '#94a3b8' }}>→</span>
                                                            <span style={{ fontWeight: 'bold', color: '#059669' }}>{newVal}</span>
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

                <div className="drawer-footer">
                    <div className="footer-left">
                        {(isAdmin || isInternalQuality) && (
                            <button 
                                type="button" 
                                className="outline" 
                                onClick={handleDelete} 
                                style={{ padding: '8px 16px', color: '#c53030', borderColor: '#feb2b2' }}
                            >
                                🗑️ 삭제
                            </button>
                        )}
                    </div>
                    <div className="footer-actions">
                        <button type="button" className="secondary" onClick={onClose} style={{ minWidth: '80px' }}>
                            닫기
                        </button>
                        {(canEditQuality || canEditMfr) && (
                            <button 
                                type="button" 
                                className="primary" 
                                onClick={validateAndSave}
                                disabled={isLoading}
                                style={{ 
                                    minWidth: '120px', 
                                    background: '#003366', 
                                    color: '#fff', 
                                    border: 'none', 
                                    borderRadius: '4px', 
                                    fontWeight: 'bold', 
                                    padding: '10px 20px' 
                                }}
                            >
                                {isLoading ? '저장 처리 중...' : '💾 변경 사항 저장'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <SaveConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmFinalSave}
            />
        </div>
    );
};

export default QualityDetailDrawer;

