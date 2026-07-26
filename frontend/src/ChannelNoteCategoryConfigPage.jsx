import React, { useState, useEffect } from 'react';
import api from './api';
import { toast } from 'react-toastify';
import {
    Box, Button, Card, CardContent, Typography, TextField,
    Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';

export default function ChannelNoteCategoryConfigPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // 모달 상태
    const [openAddModal, setOpenAddModal] = useState(false);
    const [newKey, setNewKey] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [newOrder, setNewOrder] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/channel-note-categories?all=true');
            setCategories(res.data || []);
        } catch (err) {
            console.error("카테고리 로드 실패:", err);
            toast.error("특이사항 카테고리 항목을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (cat) => {
        try {
            await api.put(`/api/channel-note-categories/${cat.id}`, {
                isActive: !cat.isActive
            });
            toast.success(`[${cat.categoryLabel}] 상태가 변경되었습니다.`);
            fetchCategories();
        } catch (err) {
            console.error("상태 변경 실패:", err);
            toast.error("카테고리 상태 변경 실패");
        }
    };

    const handleUpdateOrder = async (cat, newOrd) => {
        try {
            await api.put(`/api/channel-note-categories/${cat.id}`, {
                displayOrder: parseInt(newOrd, 10) || 1
            });
            fetchCategories();
        } catch (err) {
            console.error("순서 변경 실패:", err);
        }
    };

    const handleCreateCategory = async () => {
        if (!newKey.trim() || !newLabel.trim()) {
            toast.error("카테고리 Key와 라벨을 모두 입력해 주십시오.");
            return;
        }

        try {
            await api.post('/api/channel-note-categories', {
                categoryKey: newKey.trim().toUpperCase(),
                categoryLabel: newLabel.trim(),
                displayOrder: newOrder ? parseInt(newOrder, 10) : categories.length + 1
            });
            toast.success("신규 특이사항 관리 항목이 추가되었습니다.");
            setOpenAddModal(false);
            setNewKey('');
            setNewLabel('');
            setNewOrder('');
            fetchCategories();
        } catch (err) {
            console.error("카테고리 추가 실패:", err);
            const msg = err.response?.data?.message || "카테고리 추가 중 오류가 발생했습니다.";
            toast.error(msg);
        }
    };

    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '30px 24px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <Card sx={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', mb: 3, border: '1px solid #e2e8f0' }}>
                    <CardContent style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                                    ⚙️ 유통 채널 포장 특이사항 항목(카테고리) 설정
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                                    유통 채널별 포장 특이사항을 항목별로 관리하며, 포장사양서에 순서대로 자동 통합 렌더링됩니다.
                                </Typography>
                            </div>
                            <Button
                                variant="contained"
                                onClick={() => setOpenAddModal(true)}
                                sx={{ backgroundColor: '#2563eb', borderRadius: '8px', fontWeight: 'bold' }}
                            >
                                + 관리 항목 추가
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                    <Table>
                        <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', color: '#475569', width: '90px' }}>순서</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#475569' }}>카테고리 Key</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#475569' }}>카테고리 라벨 (화면 표기)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#475569', width: '120px' }}>사용 여부</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                                        항목 목록을 로드하는 중입니다...
                                    </TableCell>
                                </TableRow>
                            ) : categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                                        등록된 카테고리 항목이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((cat) => (
                                    <TableRow key={cat.id} hover>
                                        <TableCell>
                                            <input
                                                type="number"
                                                value={cat.displayOrder}
                                                onChange={(e) => setCategories(categories.map(c => c.id === cat.id ? { ...c, displayOrder: e.target.value } : c))}
                                                onBlur={(e) => handleUpdateOrder(cat, e.target.value)}
                                                style={{ width: '50px', padding: '4px 6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1e40af' }}>
                                            {cat.categoryKey}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                                            {cat.categoryLabel}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={Boolean(cat.isActive)}
                                                onChange={() => handleToggleActive(cat)}
                                                color="primary"
                                                size="small"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>

            {/* 신규 카테고리 추가 모달 */}
            <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold' }}>➕ 신규 특이사항 관리 항목 추가</DialogTitle>
                <DialogContent style={{ paddingTop: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <TextField
                            label="카테고리 Key (영문 대문자) *"
                            placeholder="예: LABEL_POSITION_RULE"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label="카테고리 라벨 (한글 표기명) *"
                            placeholder="예: 라벨 부착 위치 규정"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label="정렬 순서"
                            type="number"
                            placeholder="예: 9"
                            value={newOrder}
                            onChange={(e) => setNewOrder(e.target.value)}
                            size="small"
                            fullWidth
                        />
                    </div>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenAddModal(false)}>취소</Button>
                    <Button variant="contained" onClick={handleCreateCategory} sx={{ backgroundColor: '#2563eb' }}>
                        추가 저장
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
