import React, { useState, useEffect } from 'react';
import { getProductByItemCode } from '../api';
import SaveConfirmModal from './SaveConfirmModal';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Tabs,
    Tab,
    Paper,
    Grid,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Divider
} from '@mui/material';

const QualityDetailDrawer = ({
    isOpen,
    onClose,
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
    isLoading // [추가] 로딩 상태
}) => {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [productInfo, setProductInfo] = useState(null);

    // [고도화 1] 제품 정보(이미지) 추가 로드
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

    if (!selectedInbound) return null;

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
                return parsed.map((item, index) => {
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
        // [이중 에어백 방어 1] 필수 문자열 값 빈칸(Trim) 원천 차단
        if (!selectedInbound.itemCode || !String(selectedInbound.itemCode).trim()) {
            import('react-toastify').then(({ toast }) => toast.warning("품목코드 칸이 비어있습니다. 반드시 입력해주세요."));
            return;
        }
        if (!selectedInbound.productName || !String(selectedInbound.productName).trim()) {
            import('react-toastify').then(({ toast }) => toast.warning("제품명 칸이 비어있습니다. 반드시 입력해주세요."));
            return;
        }
        if (!selectedInbound.manufacturer || !String(selectedInbound.manufacturer).trim()) {
            import('react-toastify').then(({ toast }) => toast.warning("제조사를 목록에서 반드시 선택해주세요."));
            return;
        }
        if (!selectedInbound.lotNumber || !String(selectedInbound.lotNumber).trim()) {
            import('react-toastify').then(({ toast }) => toast.warning("LOT 번호가 누락되었습니다."));
            return;
        }

        // [이중 에어백 방어 2] 숫자 타입 엄격 검사 (Number.isNaN 활용)
        const parsedQuantity = Number(selectedInbound.quantity);
        if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
            import('react-toastify').then(({ toast }) => toast.warning("입고 수량은 문자가 아닌 0보다 큰 숫자만 허용됩니다."));
            return;
        }

        // 비중값이 빈칸이 아닌 경우, 무조건 숫자 형식인지 체크
        if (selectedInbound.specificGravity !== null && selectedInbound.specificGravity !== '') {
            const parsedGravity = Number(selectedInbound.specificGravity);
            if (Number.isNaN(parsedGravity)) {
                import('react-toastify').then(({ toast }) => toast.warning("비중값은 한글/영문이 아닌 정확한 숫자(또는 소수)만 입력 가능합니다."));
                return;
            }
        }

        // 모든 방어 로직을 통과한 경우에만 확인 팝업 표시
        setIsConfirmOpen(true);
    };

    const handleConfirmFinalSave = () => {
        setIsConfirmOpen(false);
        handleSave();
    };

    if (!isOpen) return null;

    return (
        <div className="drawer-overlay" onClick={onClose}>
            <div 
                className="drawer" 
                onClick={(e) => e.stopPropagation()}
                style={{ width: '1200px', padding: 0, borderRadius: '24px' }}
            >
                <Box sx={{ height: '90vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
                {/* Header Section */}
                <Box sx={{ 
                    p: 3, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    bgcolor: '#fff',
                    borderBottom: '1px solid #eef2f6',
                    pb: 2.5
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                        {productInfo?.imagePath ? (
                            <Box 
                                component="img" 
                                src={getFullUrl(productInfo.imagePath)} 
                                sx={{ 
                                    width: 64, 
                                    height: 64, 
                                    borderRadius: '16px', 
                                    objectFit: 'cover', 
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                                }} 
                            />
                        ) : (
                            <Box sx={{ 
                                width: 64, 
                                height: 64, 
                                borderRadius: '16px', 
                                bgcolor: '#f1f5f9', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                border: '1px dashed #cbd5e1'
                            }}>
                                <Typography sx={{ fontSize: '24px' }}>📦</Typography>
                            </Box>
                        )}
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '18px' }}>
                                    {selectedInbound.productName}
                                </Typography>
                                <Box sx={{ 
                                    px: 1.2, 
                                    py: 0.4, 
                                    borderRadius: '6px', 
                                    bgcolor: '#f1f5f9', 
                                    color: '#64748b', 
                                    fontSize: '11px', 
                                    fontWeight: 700,
                                    border: '1px solid #e2e8f0'
                                }}>
                                    {selectedInbound.itemCode}
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography sx={{ color: '#64748b', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <span style={{ opacity: 0.6 }}>GRN:</span> {selectedInbound.grnNumber}
                                </Typography>
                                {selectedInbound.overallStatus && (
                                    <Box sx={{ 
                                        px: 1, 
                                        py: 0.2, 
                                        borderRadius: '4px', 
                                        bgcolor: selectedInbound.overallStatus === 'STEP5_FINAL_COMPLETE' ? '#ecfdf5' : '#fff7ed', 
                                        color: selectedInbound.overallStatus === 'STEP5_FINAL_COMPLETE' ? '#059669' : '#d97706', 
                                        fontSize: '11px', 
                                        fontWeight: 800,
                                        border: `1px solid ${selectedInbound.overallStatus === 'STEP5_FINAL_COMPLETE' ? '#10b98133' : '#f9731633'}`
                                    }}>
                                        {overallStatusMap[selectedInbound.overallStatus] || selectedInbound.overallStatus}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>
                    <IconButton 
                        onClick={onClose} 
                        disabled={isLoading}
                        sx={{ 
                            bgcolor: '#f1f5f9', 
                            '&:hover': { bgcolor: '#e2e8f0' } 
                        }}
                    >
                        <Typography sx={{ fontSize: '18px', fontWeight: 'bold', color: '#64748b' }}>×</Typography>
                    </IconButton>
                </Box>

                <Box sx={{ px: 3, bgcolor: '#fff' }}>
                    <Tabs 
                        value={activeTab} 
                        onChange={(e, v) => setActiveTab(v)} 
                        sx={{ 
                            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: '#003366' },
                            '& .MuiTab-root': { fontWeight: 600, fontSize: '14px', py: 2, minWidth: '100px' },
                            '& .Mui-selected': { color: '#003366 !important' }
                        }}
                    >
                        <Tab label="기본 정보" value="info" />
                        <Tab label="변경 이력" value="history" />
                    </Tabs>
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto', p: 3, pb: 10 }}>
                    {activeTab === 'info' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {/* 섹션 스타일 정의 */}
                            {(() => {
                                const sectionCardStyle = {
                                    p: 3, 
                                    borderRadius: '16px', 
                                    bgcolor: '#ffffff', 
                                    border: '1px solid #eef2f6',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                };
                                const qualitySectionStyle = {
                                    ...sectionCardStyle,
                                    bgcolor: '#f8fafc',
                                    borderLeft: '6px solid #14b8a6'
                                };
                                const mfrSectionStyle = {
                                    ...sectionCardStyle,
                                    bgcolor: '#f8fafc',
                                    borderLeft: '6px solid #f59e0b'
                                };
                                const sectionTitleStyle = {
                                    fontWeight: 800, 
                                    mb: 3, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1.5,
                                    fontSize: '15px'
                                };
                                const labelStyle = {
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    color: '#475569',
                                    mb: 0.8,
                                    display: 'block'
                                };
                                const inputSx = {
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '10px',
                                        bgcolor: '#ffffff',
                                        '& fieldset': { borderColor: '#e2e8f0' },
                                        '&:hover fieldset': { borderColor: '#cbd5e1' },
                                        '&.Mui-focused fieldset': { borderColor: '#003366', borderWeight: 2 },
                                        '&.Mui-disabled': { bgcolor: '#f1f5f9', color: '#64748b' },
                                        '& input, & .MuiSelect-select': { py: 1.4, fontSize: '14px' }
                                    }
                                };

                                return (
                                    <>
                                        {/* WMS 기본 정보 */}
                                        <Box sx={sectionCardStyle}>
                                            <Typography sx={{ ...sectionTitleStyle, color: '#1e293b' }}>
                                                <span style={{ fontSize: '18px' }}>📋</span> WMS 기본 정보
                                                <Typography component="span" sx={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, ml: 'auto' }}>
                                                    * WMS 연동 필수 데이터
                                                </Typography>
                                            </Typography>
                                            <Grid container spacing={3}>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>품목코드</Typography>
                                                        <TextField size="small" fullWidth disabled={!isInternalQuality && !isAdmin} value={selectedInbound.itemCode || ''} onChange={handleChange('itemCode')} sx={inputSx} />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>제품명</Typography>
                                                        <TextField size="small" fullWidth disabled={!isInternalQuality && !isAdmin} value={selectedInbound.productName || ''} onChange={handleChange('productName')} sx={inputSx} />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>진행 상태 (Overall)</Typography>
                                                        <FormControl fullWidth size="small" sx={inputSx}>
                                                            <Select
                                                                disabled={!isInternalQuality && !isAdmin}
                                                                value={selectedInbound.overallStatus || ''}
                                                                onChange={handleChange('overallStatus')}
                                                            >
                                                                {Object.entries(overallStatusMap).map(([key, val]) => (
                                                                    <MenuItem key={key} value={key} sx={{ fontSize: '13px' }}>{val}</MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>제조사</Typography>
                                                        <FormControl fullWidth size="small" disabled={!isInternalQuality && !isAdmin} sx={inputSx}>
                                                            <Select value={selectedInbound.manufacturer || ''} onChange={handleChange('manufacturer')}>
                                                                <MenuItem value="" sx={{ fontSize: '13px' }}>선택하세요</MenuItem>
                                                                {manufacturers.map(m => (
                                                                    <MenuItem key={m.id} value={m.name} sx={{ fontSize: '13px' }}>{m.name}</MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>입고일자</Typography>
                                                        <TextField type="date" size="small" fullWidth disabled={!isAdmin} 
                                                            value={selectedInbound.inboundDate ? selectedInbound.inboundDate.split('T')[0] : ''}
                                                            onChange={e => {
                                                                const timePart = selectedInbound.inboundDate ? selectedInbound.inboundDate.split('T')[1] || '00:00:00' : '00:00:00';
                                                                setSelectedInbound(prev => ({...prev, inboundDate: `${e.target.value}T${timePart.split('.')[0]}`}));
                                                            }}
                                                            sx={inputSx}
                                                        />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>입고 수량</Typography>
                                                        <TextField type="number" size="small" fullWidth disabled={!isInternalQuality && !isAdmin} value={selectedInbound.quantity || 0} onChange={handleChange('quantity')} sx={inputSx} />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>LOT 번호</Typography>
                                                        <TextField size="small" fullWidth disabled={!isInternalQuality && !isAdmin} value={selectedInbound.lotNumber || ''} onChange={handleChange('lotNumber')} sx={inputSx} />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>사용기한</Typography>
                                                        <TextField type="date" size="small" fullWidth disabled={!isInternalQuality && !isAdmin} value={selectedInbound.expirationDate || ''} onChange={handleChange('expirationDate')} sx={inputSx} />
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </Box>

                                        {/* 품질 담당자 확인 */}
                                        <Box sx={qualitySectionStyle}>
                                            <Typography sx={{ ...sectionTitleStyle, color: '#0f766e' }}>
                                                <span style={{ fontSize: '18px' }}>🔬</span> 품질 담당자 확인
                                            </Typography>
                                            <Grid container spacing={3}>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>입고검사 단계</Typography>
                                                        <FormControl fullWidth size="small" disabled={!isInternalQuality && !isAdmin} sx={inputSx}>
                                                            <Select value={selectedInbound.inboundInspectionStatus || '검사 대기'} onChange={handleChange('inboundInspectionStatus')}>
                                                                {['검사 대기', '검사 중', '검사 완료', '반품'].map(opt => <MenuItem key={opt} value={opt} sx={{ fontSize: '13px' }}>{opt}</MenuItem>)}
                                                            </Select>
                                                        </FormControl>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>입고 검사 결과</Typography>
                                                        <FormControl fullWidth size="small" disabled={!isInternalQuality && !isAdmin} sx={inputSx}>
                                                            <Select value={selectedInbound.inboundInspectionResult || '판정 중'} onChange={handleChange('inboundInspectionResult')}>
                                                                {['판정 중', '적합', '부적합'].map(opt => <MenuItem key={opt} value={opt} sx={{ fontSize: '13px' }}>{opt}</MenuItem>)}
                                                            </Select>
                                                        </FormControl>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>관리품 확인 단계</Typography>
                                                        <FormControl fullWidth size="small" disabled={!isInternalQuality && !isAdmin} sx={inputSx}>
                                                            <Select value={selectedInbound.controlSampleStatus || '검사 대기'} onChange={handleChange('controlSampleStatus')}>
                                                                {['검사 대기', '검사 중', '검사 완료'].map(opt => <MenuItem key={opt} value={opt} sx={{ fontSize: '13px' }}>{opt}</MenuItem>)}
                                                            </Select>
                                                        </FormControl>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>완제품 검사 결과</Typography>
                                                        <FormControl fullWidth size="small" disabled={!isInternalQuality && !isAdmin} sx={inputSx}>
                                                            <Select value={selectedInbound.finalInspectionResult || '판정 중'} onChange={handleChange('finalInspectionResult')}>
                                                                {['판정 중', '적합', '부적합'].map(opt => <MenuItem key={opt} value={opt} sx={{ fontSize: '13px' }}>{opt}</MenuItem>)}
                                                            </Select>
                                                        </FormControl>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>품질 적합 판정일 (Final Decision Date)</Typography>
                                                        <TextField type="date" size="small" fullWidth disabled={!isInternalQuality && !isAdmin} value={selectedInbound.qualityDecisionDate || ''} onChange={handleChange('qualityDecisionDate')} sx={inputSx} />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>관리품 확인 중 특이사항</Typography>
                                                        <TextField multiline rows={2} size="small" fullWidth disabled={!isInternalQuality && !isAdmin} value={selectedInbound.controlSampleRemarks || ''} onChange={handleChange('controlSampleRemarks')} placeholder="관리품 확인 시 특이사항이 있다면 입력해주세요." sx={inputSx} />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>완제품 검사 중 특이사항</Typography>
                                                        <TextField multiline rows={2} size="small" fullWidth disabled={!isInternalQuality && !isAdmin} value={selectedInbound.finalInspectionRemarks || ''} onChange={handleChange('finalInspectionRemarks')} placeholder="완제품 검사 시 특이사항이 있다면 입력해주세요." sx={inputSx} />
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </Box>

                                        {/* 제조사 확인 */}
                                        <Box sx={mfrSectionStyle}>
                                            <Typography sx={{ ...sectionTitleStyle, color: '#92400e' }}>
                                                <span style={{ fontSize: '18px' }}>🏭</span> 제조사 성적서 확인
                                            </Typography>
                                            <Grid container spacing={3}>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>비중값 (Specific Gravity)</Typography>
                                                        <TextField type="number" inputProps={{ step: "0.001" }} size="small" fullWidth disabled={!isManufacturer && !isAdmin} value={selectedInbound.specificGravity || ''} onChange={e => setSelectedInbound(prev => ({...prev, specificGravity: parseFloat(e.target.value)}))} sx={inputSx} />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>성적서 판정일</Typography>
                                                        <TextField type="date" size="small" fullWidth disabled={!isManufacturer && !isAdmin} value={selectedInbound.coaDecisionDate || ''} onChange={handleChange('coaDecisionDate')} sx={inputSx} />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>시험성적서 번호 (콤마로 구분)</Typography>
                                                        <TextField size="small" fullWidth disabled={!isManufacturer && !isAdmin} value={selectedInbound.testReportNumbers || ''} onChange={handleChange('testReportNumbers')} placeholder="예: TR-1001, TR-1002" sx={inputSx} />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Box>
                                                        <Typography sx={labelStyle}>제조사 비고</Typography>
                                                        <TextField multiline rows={2} size="small" fullWidth disabled={!isManufacturer && !isAdmin} value={selectedInbound.mfrRemarks || ''} onChange={handleChange('mfrRemarks')} placeholder="제조사 측 특이사항을 입력해주세요." sx={inputSx} />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Box sx={{ p: 2, bgcolor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                        <Typography sx={{ ...labelStyle, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <span style={{ fontSize: '16px' }}>📂</span> 문서 업로드 (PDF)
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            <Box>
                                                                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#64748b', mb: 1 }}>COA 국문 (최대 10MB, 1개)</Typography>
                                                                <input 
                                                                    type="file" 
                                                                    accept=".pdf" 
                                                                    disabled={!isManufacturer && !isAdmin} 
                                                                    onChange={e => handleFileUpload(e, selectedInbound, 'coaFileUrl')} 
                                                                    style={{ display: 'block', width: '100%', fontSize: '13px', color: '#64748b' }} 
                                                                />
                                                                {selectedInbound.coaFileUrl && (
                                                                    <Typography sx={{ mt: 1, fontSize: '12px', color: '#14b8a6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                        ✓ {getCleanFileName(selectedInbound.coaFileUrl)}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                            <Box>
                                                                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#64748b', mb: 1 }}>COA 영문 (최대 10MB, 1개)</Typography>
                                                                <input 
                                                                    type="file" 
                                                                    accept=".pdf" 
                                                                    disabled={!isManufacturer && !isAdmin} 
                                                                    onChange={e => handleFileUpload(e, selectedInbound, 'coaFileUrlEng')} 
                                                                    style={{ display: 'block', width: '100%', fontSize: '13px', color: '#64748b' }} 
                                                                />
                                                                {selectedInbound.coaFileUrlEng && (
                                                                    <Typography sx={{ mt: 1, fontSize: '12px', color: '#14b8a6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                        ✓ {getCleanFileName(selectedInbound.coaFileUrlEng)}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    </>
                                );
                            })()}
                        </Box>
                    )}

                    {activeTab === 'history' && (
                        <Box sx={{ p: 1 }}>
                            {history.length === 0 ? (
                                <Typography color="textSecondary" align="center" sx={{ mt: 10, fontSize: '14px' }}>변경 이력이 없습니다.</Typography>
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
                                    <Box key={idx} sx={{ 
                                        p: 2.5, mb: 2, 
                                        bgcolor: '#fff', 
                                        borderRadius: '16px', 
                                        border: '1px solid #eef2f6',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                                    }}>
                                        <Typography sx={{ color: '#003366', fontWeight: 800, fontSize: '13px', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            🕒 {groupKey}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            {records.map((rec, rIdx) => {
                                                const displayName = rec.fieldName ? (fieldTranslations[rec.fieldName] || rec.fieldName) : '항목';
                                                const oldVal = formatHistoryValue(rec.oldValue, rec.fieldName);
                                                const newVal = formatHistoryValue(rec.newValue, rec.fieldName);

                                                return (
                                                    <Box key={rec.id || rIdx} sx={{ pl: 2.5, position: 'relative', fontSize: '13px', lineHeight: 1.6 }}>
                                                        <Box component="span" sx={{ position: 'absolute', left: 0, color: '#003366', opacity: 0.3, fontSize: '16px', lineHeight: '20px' }}>•</Box>
                                                        <Typography component="span" sx={{ display: 'inline-block', minWidth: '140px', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>{displayName}</Typography>
                                                        <Typography component="span" sx={{ color: '#e11d48', textDecoration: oldVal === '없음' ? 'none' : 'line-through', mr: 1, fontSize: '13px', bgcolor: '#fff1f2', px: 0.5, borderRadius: '4px' }}>{oldVal}</Typography>
                                                        <Typography component="span" sx={{ color: '#94a3b8', mx: 0.5, fontSize: '11px' }}>→</Typography>
                                                        <Typography component="span" sx={{ color: '#059669', fontWeight: 700, fontSize: '13px', bgcolor: '#ecfdf5', px: 0.8, py: 0.2, borderRadius: '4px' }}>{newVal}</Typography>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                ))
                            )}
                        </Box>
                    )}
                </Box>

                {/* Sticky Action Footer */}
                {activeTab === 'info' && (isInternalQuality || isAdmin || isManufacturer) && (
                    <Box sx={{ 
                        p: 2, 
                        bgcolor: 'rgba(255, 255, 255, 0.9)', 
                        backdropFilter: 'blur(10px)',
                        borderTop: '1px solid #eef2f6',
                        zIndex: 10,
                        position: 'sticky',
                        bottom: 0
                    }}>
                        <Button 
                            variant="contained" 
                            fullWidth 
                            onClick={validateAndSave}
                            disabled={isLoading || (!isInternalQuality && !isManufacturer)}
                            sx={{ 
                                py: 1.8, 
                                borderRadius: '14px', 
                                bgcolor: '#003366', 
                                boxShadow: '0 10px 15px -3px rgba(0, 51, 102, 0.4)',
                                fontWeight: 800,
                                fontSize: '16px',
                                textTransform: 'none',
                                '&:hover': { bgcolor: '#002244', transform: 'translateY(-2px)' },
                                transition: 'all 0.2s',
                                opacity: (isInternalQuality || isManufacturer) ? 1 : 0.5
                            }}
                        >
                            {isLoading ? '저장 처리 중...' : ((isInternalQuality || isManufacturer) ? '변경 사항 저장하기' : '🚫 수정 권한 없음')}
                        </Button>
                    </Box>
                )}
            </Box>
            <SaveConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmFinalSave}
            />
        </div>
    </div>
    );
};

export default QualityDetailDrawer;
