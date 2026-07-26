import React, { useState, useEffect } from 'react';
import api from './api';
import { toast } from 'react-toastify';
import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Typography, Card, CardContent, Divider, Switch, FormControlLabel } from '@mui/material';

export default function DocumentCycleConfigPage({ user, onBack }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // 기본 4종 서류 주기 설정
    const [cycleConfigs, setCycleConfigs] = useState({
        MSDS: { periodMonths: 12, reminderDDay: 14 },
        MANUFACTURING_PROCESS_CHART: { periodMonths: 0, reminderDDay: 14 },
        PRODUCT_STANDARD: { periodMonths: 0, reminderDDay: 14 },
        STABILITY_TEST: { periodMonths: 0, reminderDDay: 14 },
        COA: { periodMonths: 1, reminderDDay: 7 }
    });

    // 커스텀 서류 목록
    const [customTypes, setCustomTypes] = useState([]);

    // 커스텀 추가 서류 추가 폼 상태
    const [name, setName] = useState('');
    const [scope, setScope] = useState('PRODUCT');
    const [recurrenceType, setRecurrenceType] = useState('ONE_TIME');
    const [periodMonths, setPeriodMonths] = useState(12);

    useEffect(() => {
        window.__QMS_ACTIVE_PAGE__ = '⚙️ 품질서류 갱신 주기 및 종류 설정';
        fetchConfigs();
        fetchCustomTypes();
    }, []);

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/document-requests/cycle-configs');
            if (res.data) {
                const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
                setCycleConfigs(prev => ({ ...prev, ...parsed }));
            }
        } catch (err) {
            console.error("서류 주기 설정 로드 실패:", err);
            toast.error("서류 주기 설정 데이터를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomTypes = async () => {
        try {
            const res = await api.get('/api/document-requests/custom-types');
            setCustomTypes(res.data || []);
        } catch (err) {
            console.error("커스텀 추가서류 목록 로드 실패:", err);
        }
    };

    const handleCycleChange = (docType, field, value) => {
        setCycleConfigs(prev => ({
            ...prev,
            [docType]: {
                ...prev[docType],
                [field]: parseInt(value, 10)
            }
        }));
    };

    const handleSaveCycleConfigs = async () => {
        setSaving(true);
        try {
            await api.post('/api/document-requests/cycle-configs', JSON.stringify(cycleConfigs));
            toast.success("기본 필수서류 갱신 주기 및 D-Day 알림 설정이 저장되었습니다.");
        } catch (err) {
            console.error("설정 저장 실패:", err);
            toast.error("설정 저장 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateCustomType = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("서류 종류명을 입력해 주십시오.");
            return;
        }

        try {
            const payload = {
                name: name.trim(),
                scope,
                recurrenceType,
                periodMonths: recurrenceType === 'PERIODIC' ? periodMonths : null,
                isActive: true
            };

            await api.post('/api/document-requests/custom-types', payload);
            toast.success("신규 커스텀 서류 종류가 등록 및 전체 배포되었습니다.");
            setName('');
            setRecurrenceType('ONE_TIME');
            setPeriodMonths(12);
            fetchCustomTypes();
        } catch (err) {
            const errorMsg = err.response?.data?.message || "등록 실패";
            toast.error(errorMsg);
        }
    };

    const handleToggleActiveCustomType = async (id, currentActive) => {
        try {
            await api.put(`/api/document-requests/custom-types/${id}`, { isActive: !currentActive });
            toast.success("커스텀 서류 상태 변경이 저장되었습니다.");
            fetchCustomTypes();
        } catch (err) {
            toast.error("상태 변경 저장 실패");
        }
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            {/* 상단 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                        ⚙️ 품질서류 갱신 주기 및 종류 설정
                    </h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                        기본 필수 서류 4종의 정기 발송 갱신 주기와 사전 D-Day 알림 규칙 및 커스텀 서류 종류를 관리합니다.
                    </p>
                </div>
                <Button variant="outlined" onClick={onBack} sx={{ borderRadius: '8px', fontWeight: 'bold' }}>
                    ◀ 서류 대시보드로 복귀
                </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 1. 기본 4종 필수서류 갱신 주기 & D-Day 알림 설정 카드 */}
                <Card sx={{ borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <CardContent style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                                📑 기본 4종 서류 정기 갱신 주기 & 사전 D-Day 알림
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={handleSaveCycleConfigs}
                                disabled={saving || loading}
                                sx={{ backgroundColor: '#2563eb', borderRadius: '8px', fontWeight: 'bold' }}
                            >
                                {saving ? '저장 중...' : '💾 주기 설정 저장'}
                            </Button>
                        </div>

                        <Divider sx={{ mb: 3 }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* MSDS */}
                            <div style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                                <div style={{ fontWeight: 'bold', color: '#334155', marginBottom: '12px' }}>
                                    🧪 MSDS (물질안전보건자료)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>자동 갱신 주기</InputLabel>
                                        <Select
                                            value={cycleConfigs.MSDS?.periodMonths ?? 12}
                                            label="자동 갱신 주기"
                                            onChange={(e) => handleCycleChange('MSDS', 'periodMonths', e.target.value)}
                                        >
                                            <MenuItem value={0}>최초 1회 제출만 적용 (갱신 없음)</MenuItem>
                                            <MenuItem value={1}>1개월마다 정기 갱신</MenuItem>
                                            <MenuItem value={3}>3개월마다 정기 갱신</MenuItem>
                                            <MenuItem value={6}>6개월마다 정기 갱신</MenuItem>
                                            <MenuItem value={12}>1년마다 정기 갱신 (권장)</MenuItem>
                                            <MenuItem value={24}>2년마다 정기 갱신</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <FormControl size="small" fullWidth>
                                        <InputLabel>사전 자동독촉 D-Day</InputLabel>
                                        <Select
                                            value={cycleConfigs.MSDS?.reminderDDay ?? 14}
                                            label="사전 자동독촉 D-Day"
                                            onChange={(e) => handleCycleChange('MSDS', 'reminderDDay', e.target.value)}
                                        >
                                            <MenuItem value={30}>만료 30일 전 자동 이메일 독촉</MenuItem>
                                            <MenuItem value={14}>만료 14일 전 자동 이메일 독촉 (기본)</MenuItem>
                                            <MenuItem value={7}>만료 7일 전 자동 이메일 독촉</MenuItem>
                                            <MenuItem value={0}>만료 당일 자동 이메일 독촉</MenuItem>
                                        </Select>
                                    </FormControl>
                                </div>
                            </div>

                            {/* 제조공정도 */}
                            <div style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                                <div style={{ fontWeight: 'bold', color: '#334155', marginBottom: '12px' }}>
                                    🏭 제조공정도 (Manufacturing Process Chart)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>자동 갱신 주기</InputLabel>
                                        <Select
                                            value={cycleConfigs.MANUFACTURING_PROCESS_CHART?.periodMonths ?? 0}
                                            label="자동 갱신 주기"
                                            onChange={(e) => handleCycleChange('MANUFACTURING_PROCESS_CHART', 'periodMonths', e.target.value)}
                                        >
                                            <MenuItem value={0}>최초 1회 제출만 적용 (권장)</MenuItem>
                                            <MenuItem value={6}>6개월마다 정기 갱신</MenuItem>
                                            <MenuItem value={12}>1년마다 정기 갱신</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <FormControl size="small" fullWidth>
                                        <InputLabel>사전 자동독촉 D-Day</InputLabel>
                                        <Select
                                            value={cycleConfigs.MANUFACTURING_PROCESS_CHART?.reminderDDay ?? 14}
                                            label="사전 자동독촉 D-Day"
                                            onChange={(e) => handleCycleChange('MANUFACTURING_PROCESS_CHART', 'reminderDDay', e.target.value)}
                                        >
                                            <MenuItem value={14}>만료 14일 전 자동 독촉</MenuItem>
                                            <MenuItem value={7}>만료 7일 전 자동 독촉</MenuItem>
                                        </Select>
                                    </FormControl>
                                </div>
                            </div>

                            {/* 제품표준서 */}
                            <div style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                                <div style={{ fontWeight: 'bold', color: '#334155', marginBottom: '12px' }}>
                                    📘 제품표준서 (Product Specification)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>자동 갱신 주기</InputLabel>
                                        <Select
                                            value={cycleConfigs.PRODUCT_STANDARD?.periodMonths ?? 0}
                                            label="자동 갱신 주기"
                                            onChange={(e) => handleCycleChange('PRODUCT_STANDARD', 'periodMonths', e.target.value)}
                                        >
                                            <MenuItem value={0}>최초 1회 제출만 적용 (권장)</MenuItem>
                                            <MenuItem value={12}>1년마다 정기 갱신</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <FormControl size="small" fullWidth>
                                        <InputLabel>사전 자동독촉 D-Day</InputLabel>
                                        <Select
                                            value={cycleConfigs.PRODUCT_STANDARD?.reminderDDay ?? 14}
                                            label="사전 자동독촉 D-Day"
                                            onChange={(e) => handleCycleChange('PRODUCT_STANDARD', 'reminderDDay', e.target.value)}
                                        >
                                            <MenuItem value={14}>만료 14일 전 자동 독촉</MenuItem>
                                            <MenuItem value={7}>만료 7일 전 자동 독촉</MenuItem>
                                        </Select>
                                    </FormControl>
                                </div>
                            </div>

                            {/* 안정성테스트보고서 */}
                            <div style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                                <div style={{ fontWeight: 'bold', color: '#334155', marginBottom: '12px' }}>
                                    🧪 안정성테스트보고서 (Stability Test Report)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>자동 갱신 주기</InputLabel>
                                        <Select
                                            value={cycleConfigs.STABILITY_TEST?.periodMonths ?? 0}
                                            label="자동 갱신 주기"
                                            onChange={(e) => handleCycleChange('STABILITY_TEST', 'periodMonths', e.target.value)}
                                        >
                                            <MenuItem value={0}>최초 1회 제출만 적용 (권장)</MenuItem>
                                            <MenuItem value={12}>1년마다 정기 갱신</MenuItem>
                                        </Select>
                                    </FormControl>

                                    <FormControl size="small" fullWidth>
                                        <InputLabel>사전 자동독촉 D-Day</InputLabel>
                                        <Select
                                            value={cycleConfigs.STABILITY_TEST?.reminderDDay ?? 14}
                                            label="사전 자동독촉 D-Day"
                                            onChange={(e) => handleCycleChange('STABILITY_TEST', 'reminderDDay', e.target.value)}
                                        >
                                            <MenuItem value={14}>만료 14일 전 자동 독촉</MenuItem>
                                            <MenuItem value={7}>만료 7일 전 자동 독촉</MenuItem>
                                        </Select>
                                    </FormControl>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. 커스텀 품질서류 종류 등록 및 활성화 관리 카드 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <Card sx={{ borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <CardContent style={{ padding: '24px' }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '16px' }}>
                                ➕ 신규 커스텀 품질서류 등록
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <form onSubmit={handleCreateCustomType} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <TextField
                                    label="서류명"
                                    size="small"
                                    placeholder="예: 비건인증서, 잔류용제분석서..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    fullWidth
                                />

                                <FormControl size="small" fullWidth>
                                    <InputLabel>적용 범위 (Scope)</InputLabel>
                                    <Select value={scope} label="적용 범위 (Scope)" onChange={(e) => setScope(e.target.value)}>
                                        <option value="PRODUCT">📦 품목 단위 (마스터 제품별 제출)</option>
                                        <option value="MANUFACTURER">🏭 제조사 단위 (공통 서류)</option>
                                    </Select>
                                </FormControl>

                                <FormControl size="small" fullWidth>
                                    <InputLabel>제출/갱신 형태</InputLabel>
                                    <Select value={recurrenceType} label="제출/갱신 형태" onChange={(e) => setRecurrenceType(e.target.value)}>
                                        <option value="ONE_TIME">최초 1회 제출만 필요</option>
                                        <option value="PERIODIC">주기적 정기 갱신 필요</option>
                                    </Select>
                                </FormControl>

                                {recurrenceType === 'PERIODIC' && (
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>갱신 주기 (개월)</InputLabel>
                                        <Select value={periodMonths} label="갱신 주기 (개월)" onChange={(e) => setPeriodMonths(parseInt(e.target.value, 10))}>
                                            <option value={1}>1개월마다</option>
                                            <option value={3}>3개월마다</option>
                                            <option value={6}>6개월마다</option>
                                            <option value={12}>1년마다</option>
                                            <option value={24}>2년마다</option>
                                        </Select>
                                    </FormControl>
                                )}

                                <Button type="submit" variant="contained" sx={{ backgroundColor: '#059669', fontWeight: 'bold', borderRadius: '8px' }}>
                                    ➕ 커스텀 품질서류 등록 및 배포
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* 등록된 커스텀 서류 리스트 */}
                    <Card sx={{ borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <CardContent style={{ padding: '24px' }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '16px' }}>
                                📋 등록된 커스텀 서류 목록 ({customTypes.length}개)
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            {customTypes.length === 0 ? (
                                <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                                    등록된 커스텀 서류가 없습니다.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {customTypes.map(ct => (
                                        <div
                                            key={ct.id}
                                            style={{
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                backgroundColor: ct.isActive ? '#fff' : '#f1f5f9',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                                                    {ct.name}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                    범위: {ct.scope === 'PRODUCT' ? '📦 품목' : '🏭 제조사'} | 주기: {ct.recurrenceType === 'ONE_TIME' ? '최초 1회' : `${ct.periodMonths}개월`}
                                                </div>
                                            </div>

                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={ct.isActive ?? true}
                                                        onChange={() => handleToggleActiveCustomType(ct.id, ct.isActive)}
                                                        size="small"
                                                        color="primary"
                                                    />
                                                }
                                                label={ct.isActive ? "활성" : "비활성"}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
