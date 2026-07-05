import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tabs,
    Tab,
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert,
    TextField
} from '@mui/material';

const CoaRequestPreviewModal = ({ isOpen, onClose, previewData, onSend, startDate, endDate }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [editedEmails, setEditedEmails] = useState({});

    // Initialize or reset edited emails when modal opens or previewData changes
    useEffect(() => {
        if (isOpen && previewData) {
            const initial = {};
            previewData.forEach(mfr => {
                initial[mfr.manufacturerName] = mfr.email || '';
            });
            setEditedEmails(initial);
            setActiveTab(0);
        }
    }, [previewData, isOpen]);

    if (!isOpen || !previewData) return null;

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const currentMfr = previewData[activeTab];
    const currentEmailValue = currentMfr ? (editedEmails[currentMfr.manufacturerName] || '') : '';

    const handleEmailChange = (e) => {
        if (currentMfr) {
            setEditedEmails(prev => ({
                ...prev,
                [currentMfr.manufacturerName]: e.target.value
            }));
        }
    };

    const hasAnyEmail = Object.values(editedEmails).some(email => email && email.trim() !== '');

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', pb: 2, fontWeight: 'bold' }}>
                📧 시험성적서(COA) 요청 메일 미리보기
            </DialogTitle>
            <DialogContent sx={{ mt: 2, p: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    선택된 조회 기간(<b>{startDate} ~ {endDate}</b>) 내 성적서 미제출 품목 목록이 아래 제조사별로 분류되어 각각 메일로 발송됩니다.
                </Typography>

                {previewData.length === 0 ? (
                    <Alert severity="info">해당 기간 내에 성적서가 누락된 입고 품목이 없습니다.</Alert>
                ) : (
                    <>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                            <Tabs 
                                value={activeTab} 
                                onChange={handleTabChange} 
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{
                                    '& .MuiTabs-indicator': {
                                        display: 'none',
                                    }
                                }}
                            >
                                {previewData.map((mfr, index) => {
                                    const emailVal = editedEmails[mfr.manufacturerName] || '';
                                    const hasEmail = emailVal.trim() !== '';
                                    return (
                                        <Tab 
                                            key={index} 
                                            sx={{
                                                fontWeight: 'medium',
                                                textTransform: 'none',
                                                transition: 'all 0.2s',
                                                mr: 1,
                                                '&.Mui-selected': {
                                                    bgcolor: '#0f172a',
                                                    color: '#ffffff !important',
                                                    borderRadius: '6px 6px 0 0',
                                                }
                                            }}
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>{mfr.manufacturerName}</span>
                                                    {!hasEmail && <span style={{ color: '#ef4444' }}>⚠️</span>}
                                                </Box>
                                            } 
                                        />
                                    );
                                })}
                            </Tabs>
                        </Box>

                        {currentMfr && (
                            <Box sx={{ mt: 1 }}>
                                <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
                                                수신 이메일:
                                            </Typography>
                                            <TextField
                                                size="small"
                                                variant="outlined"
                                                value={currentEmailValue}
                                                onChange={handleEmailChange}
                                                placeholder="이메일을 입력하세요 (콤마로 구분하여 다중 입력 가능)"
                                                sx={{ 
                                                    flexGrow: 1, 
                                                    bgcolor: '#ffffff',
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: '6px'
                                                    }
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mt: 0.5 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                <b>기본 이메일 출처:</b> {currentMfr.emailSource}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    {!currentEmailValue.trim() && (
                                        <Alert severity="error" sx={{ mt: 1.5, py: 0.5 }}>
                                            이메일 주소가 비어있습니다. 이 상태로는 해당 제조사로 메일이 전송되지 않습니다.
                                        </Alert>
                                    )}
                                </Paper>

                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#475569' }}>
                                    📋 요청 대상 품목 리스트 ({currentMfr.items?.length || 0}건)
                                </Typography>

                                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300, overflowY: 'auto' }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f1f5f9' }}>입고일자</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f1f5f9' }}>입고번호</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f1f5f9' }}>품목코드</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f1f5f9' }}>제품명</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f1f5f9' }}>LOT번호</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f1f5f9' }}>수량</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {currentMfr.items?.map((item, idx) => (
                                                <TableRow key={idx} hover>
                                                    <TableCell>{item.inboundDate}</TableCell>
                                                    <TableCell>{item.grnNumber}</TableCell>
                                                    <TableCell>{item.itemCode}</TableCell>
                                                    <TableCell>{item.productName}</TableCell>
                                                    <TableCell>{item.lotNumber || '-'}</TableCell>
                                                    <TableCell align="right">{Number(item.quantity).toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2 }}>
                <Button onClick={onClose} variant="outlined" color="inherit">
                    닫기
                </Button>
                {previewData.length > 0 && (
                    <Button 
                        onClick={() => onSend(editedEmails)} 
                        variant="contained" 
                        color="primary"
                        disabled={!hasAnyEmail}
                        sx={{
                            bgcolor: '#0f172a',
                            '&:hover': {
                                bgcolor: '#1e293b'
                            }
                        }}
                    >
                        요청 메일 일괄 발송
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default CoaRequestPreviewModal;
