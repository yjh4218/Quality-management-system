import React from 'react';
import { 
  Box, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  Typography, 
  Paper, 
  Stack,
  Autocomplete
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { IconButton, InputAdornment } from '@mui/material';
import ProductSearchPopup from '../ProductSearchPopup';
import * as api from '../api';


const QualitySearchFilter = ({
    searchParams,
    setSearchParams,
    onSearch,
    onReset,
    onSync,
    onBatchSave,
    isInternalQuality,
    manufacturers,
    canViewInbound,
    inboundCount
}) => {
    const [showSearchPopup, setShowSearchPopup] = React.useState(false);
    const handleChange = (field) => (event) => {
        setSearchParams(prev => ({ ...prev, [field]: event.target.value }));
    };

    const handleDateChange = (field) => (newValue) => {
        const formattedDate = newValue ? newValue.format('YYYY-MM-DD') : '';
        setSearchParams(prev => ({ ...prev, [field]: formattedDate }));
    };

    const labelStyle = { 
        fontSize: '12px', 
        fontWeight: '800', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px', 
        marginBottom: '6px', 
        color: '#475569' 
    };

    return (
        <Box sx={{ mb: 2 }}>
            <div className="page-header-standard" style={{ marginBottom: '15px' }}>
                <div className="header-title">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⚖️ 입고 품질 검사 관리
                    </h2>
                    <Stack direction="row" spacing={2} sx={{ fontSize: '11px', mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#0056b3', fontWeight: 'bold' }}>● 파란색: 품질 담당자</Typography>
                        <Typography variant="caption" sx={{ color: '#27ae60', fontWeight: 'bold' }}>● 녹색: 제조사</Typography>
                        <Typography variant="caption" sx={{ color: '#666' }}>● 회색: 자동/상세전용</Typography>
                    </Stack>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="primary" onClick={onBatchSave} style={{ backgroundColor: '#1e293b', opacity: isInternalQuality ? 1 : 0.5 }} disabled={!isInternalQuality}>💾 수정사항 저장</button>
                    {isInternalQuality && (
                        <button className="secondary" onClick={onSync}>🔄 WMS 동기화</button>
                    )}
                    <button className="primary" onClick={onSearch} style={{ backgroundColor: '#2563eb' }}>🔍 조회</button>
                    {canViewInbound && (
                        <button className="outline" onClick={async () => {
                            if (!inboundCount || inboundCount === 0) {
                                alert("조회 내역이 없습니다.");
                                return;
                            }
                            try {
                                const response = await api.exportInboundExcel(searchParams);
                                api.downloadBlob(response, "InboundInspection_Export.xlsx");
                            } catch (e) {
                                alert("엑셀 다운로드 실패");
                            }
                        }} style={{ border: '1px solid #107c41', color: '#107c41' }}>📊 엑셀 다운로드</button>
                    )}
                    <button className="secondary" onClick={onReset}>♻️ 초기화</button>
                </div>
            </div>

            <Paper elevation={0} sx={{ p: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'start' }}>
                    <Box sx={{ gridColumn: { xs: 'span 1', md: 'span 2' } }}>
                        <label style={labelStyle}>🗓️ 입고 기간</label>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <DatePicker
                                value={searchParams.startDate ? dayjs(searchParams.startDate) : null}
                                onChange={handleDateChange('startDate')}
                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                format="YYYY-MM-DD"
                            />
                            <Typography color="textSecondary">~</Typography>
                            <DatePicker
                                value={searchParams.endDate ? dayjs(searchParams.endDate) : null}
                                onChange={handleDateChange('endDate')}
                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                format="YYYY-MM-DD"
                            />
                        </Box>
                    </Box>

                    <Box>
                        <label style={labelStyle}>🆔 입고번호</label>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="GRN-YYYYMMDD-XXX"
                            value={searchParams.grnNumber || ''}
                            onChange={handleChange('grnNumber')}
                        />
                    </Box>

                    <Box>
                        <label style={labelStyle}>🏷️ 품목코드</label>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="품목코드 입력"
                            value={searchParams.itemCode}
                            onChange={handleChange('itemCode')}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setShowSearchPopup(true)}>
                                            <span style={{ fontSize: '14px' }}>🔍</span>
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>

                    <Box>
                        <label style={labelStyle}>📦 제품명</label>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="제품명 입력"
                            value={searchParams.productName}
                            onChange={handleChange('productName')}
                        />
                    </Box>

                    <Box>
                        <label style={labelStyle}>🔢 LOT 번호</label>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="LOT 번호"
                            value={searchParams.lotNumber}
                            onChange={handleChange('lotNumber')}
                        />
                    </Box>

                    <Box>
                        <label style={labelStyle}>🏭 제조사명</label>
                        <Autocomplete
                            size="small"
                            options={manufacturers || []}
                            getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                            value={searchParams.manufacturer || null}
                            onChange={(event, newValue) => {
                                setSearchParams(prev => ({
                                    ...prev,
                                    manufacturer: newValue ? (typeof newValue === 'string' ? newValue : newValue.name) : ''
                                }));
                            }}
                            freeSolo
                            renderInput={(params) => (
                                <TextField 
                                    {...params} 
                                    fullWidth 
                                    placeholder="제조사 검색"
                                    onChange={handleChange('manufacturer')}
                                />
                            )}
                        />
                    </Box>

                    <Box>
                        <label style={labelStyle}>🚩 상태 필터</label>
                        <FormControl size="small" fullWidth>
                            <Select
                                value={searchParams.excludeStatus}
                                onChange={handleChange('excludeStatus')}
                            >
                                <MenuItem value="">전체 보기</MenuItem>
                                <MenuItem value="STEP5_FINAL_COMPLETE">진행 중인 것만 (5단계 제외)</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
            </Paper>

            {showSearchPopup && (
                <ProductSearchPopup 
                    onClose={() => setShowSearchPopup(false)}
                    onSelect={(p) => {
                        setSearchParams(prev => ({ ...prev, itemCode: p.itemCode, productName: p.productName }));
                        setShowSearchPopup(false);
                    }}
                />
            )}
        </Box>
    );
};

export default QualitySearchFilter;
