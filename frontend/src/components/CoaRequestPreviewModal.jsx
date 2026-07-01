import React, { useState } from 'react';
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
    Alert
} from '@mui/material';

const CoaRequestPreviewModal = ({ isOpen, onClose, previewData, onSend, startDate, endDate }) => {
    const [activeTab, setActiveTab] = useState(0);

    if (!isOpen || !previewData) return null;

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const currentMfr = previewData[activeTab];

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
                            >
                                {previewData.map((mfr, index) => {
                                    const hasEmail = mfr.email && mfr.email.trim() !== '';
                                    return (
                                        <Tab 
                                            key={index} 
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                                        <Typography variant="body2">
                                            <b>수신자:</b> {currentMfr.email ? (
                                                <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{currentMfr.email}</span>
                                            ) : (
                                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>이메일 정보 없음</span>
                                            )}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <b>출처:</b> {currentMfr.emailSource}
                                        </Typography>
                                    </Box>
                                    {!currentMfr.email && (
                                        <Alert severity="error" sx={{ mt: 1.5, py: 0.5 }}>
                                            제조사 이메일 및 시스템 사용자 정보에 이메일이 등록되어 있지 않습니다. 이 제조사에는 메일이 발송되지 않습니다.
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
                        onClick={onSend} 
                        variant="contained" 
                        color="primary"
                        disabled={!previewData.some(m => m.email && m.email.trim() !== '')}
                    >
                        요청 메일 일괄 발송
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default CoaRequestPreviewModal;
