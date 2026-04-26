import React from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Typography, 
  Paper, 
  Stack,
  Autocomplete
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { IconButton, InputAdornment } from '@mui/material';
import ProductSearchPopup from '../ProductSearchPopup';


const QualitySearchFilter = ({
    searchParams,
    setSearchParams,
    onSearch,
    onReset,
    onSync,
    onBatchSave,
    isInternalQuality,
    manufacturers
}) => {
    const [showSearchPopup, setShowSearchPopup] = React.useState(false);
    const handleChange = (field) => (event) => {
        setSearchParams(prev => ({ ...prev, [field]: event.target.value }));
    };

    const handleDateChange = (field) => (newValue) => {
        const formattedDate = newValue ? newValue.format('YYYY-MM-DD') : '';
        setSearchParams(prev => ({ ...prev, [field]: formattedDate }));
    };

    return (
        <Box sx={{ mb: 3 }}>
            {/* Standardized Responsive Header */}
            <div className="page-header" style={{ marginBottom: '15px' }}>
                <Box>
                    <h2 style={{ fontSize: '22px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        ⚖️ 입고 품질 검사 관리
                    </h2>
                    <Stack direction="row" spacing={2} sx={{ fontSize: '11px', mt: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ color: '#0056b3', fontWeight: 'bold' }}>● 파란색: 품질 담당자</Typography>
                        <Typography variant="caption" sx={{ color: '#27ae60', fontWeight: 'bold' }}>● 녹색: 제조사</Typography>
                        <Typography variant="caption" sx={{ color: '#666' }}>● 회색: 자동/상세전용</Typography>
                    </Stack>
                </Box>
                <div className="button-group">
                    <button className="primary" onClick={onBatchSave} style={{ backgroundColor: '#2c3e50', whiteSpace: 'nowrap', opacity: isInternalQuality ? 1 : 0.5 }} disabled={!isInternalQuality}>💾 수정사항 저장</button>
                    {isInternalQuality && (
                        <button className="secondary" onClick={onSync} style={{ whiteSpace: 'nowrap' }}>🔄 WMS 동기화</button>
                    )}
                    <button className="primary" onClick={onSearch} style={{ backgroundColor: '#2563eb', whiteSpace: 'nowrap' }}>🔍 조회</button>
                    <button className="secondary" onClick={onReset} style={{ whiteSpace: 'nowrap' }}>♻️ 초기화</button>
                </div>
            </div>

            {/* Search Filters */}
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', gridColumn: { xs: 'span 1', md: 'span 2' } }}>
                        <DatePicker
                            label="시작일"
                            value={searchParams.startDate ? dayjs(searchParams.startDate) : null}
                            onChange={handleDateChange('startDate')}
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            format="YYYY-MM-DD"
                        />
                        <Typography color="textSecondary">~</Typography>
                        <DatePicker
                            label="종료일"
                            value={searchParams.endDate ? dayjs(searchParams.endDate) : null}
                            onChange={handleDateChange('endDate')}
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            format="YYYY-MM-DD"
                        />
                    </Box>

                    <TextField
                        label="입고번호"
                        size="small"
                        fullWidth
                        placeholder="GRN-YYYYMMDD-XXX"
                        value={searchParams.grnNumber || ''}
                        onChange={handleChange('grnNumber')}
                    />

                    <TextField
                        label="품목코드"
                        size="small"
                        fullWidth
                        value={searchParams.itemCode}
                        onChange={handleChange('itemCode')}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setShowSearchPopup(true)} title="품목 상세 검색">
                                        <span style={{ fontSize: '16px' }}>🔍</span>
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        label="품목명"
                        size="small"
                        fullWidth
                        value={searchParams.productName}
                        onChange={handleChange('productName')}
                    />

                    <TextField
                        label="LOT 번호"
                        size="small"
                        fullWidth
                        value={searchParams.lotNumber}
                        onChange={handleChange('lotNumber')}
                    />

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
                                label="제조사명" 
                                fullWidth 
                                onChange={handleChange('manufacturer')}
                            />
                        )}
                    />

                    <FormControl size="small" fullWidth>
                        <InputLabel>상태 필터</InputLabel>
                        <Select
                            value={searchParams.excludeStatus}
                            label="상태 필터"
                            onChange={handleChange('excludeStatus')}
                        >
                            <MenuItem value="">전체 보기</MenuItem>
                            <MenuItem value="STEP5_FINAL_COMPLETE">진행 중인 것만 (5단계 제외)</MenuItem>
                        </Select>
                    </FormControl>
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
