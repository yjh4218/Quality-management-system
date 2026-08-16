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
import useDateRangePreset from '../hooks/useDateRangePreset';


const QualitySearchFilter = ({
    searchParams,
    setSearchParams,
    onSearch,
    onReset,
    onSync,
    onBatchSave,
    onExcelImport,
    onDownloadTemplate,
    onRequestCoa,
    isInternalQuality,
    manufacturers,
    canViewInbound,
    inboundCount
}) => {
    const [showSearchPopup, setShowSearchPopup] = React.useState(false);

    const { renderPresetButtons } = useDateRangePreset(
        (start) => setSearchParams(prev => ({ ...prev, startDate: start })),
        (end) => setSearchParams(prev => ({ ...prev, endDate: end }))
    );

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
            <div className="page-header-standard" style={{ 
                marginBottom: '20px', 
                flexDirection: 'column', 
                alignItems: 'flex-start', 
                gap: '12px',
                padding: '24px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #f1f5f9'
            }}>
                {/* 1단계: 제목 및 동기화 (최상단) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            ⚖️ 입고 품질 검사 관리
                        </h2>
                        <Stack direction="row" spacing={2} sx={{ fontSize: '11px', mt: 1 }}>
                            <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span> 품질 담당자
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span> 제조사
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94a3b8' }}></span> 자동/상세전용
                            </Typography>
                        </Stack>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {isInternalQuality && (
                            <button className="secondary" onClick={onSync} style={{ padding: '8px 16px', fontSize: '13px' }}>🔄 WMS 동기화</button>
                        )}
                    </div>
                </div>

                {/* 2단계: 핵심 액션 (중단) */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    width: '100%', 
                    alignItems: 'center', 
                    padding: '12px 0', 
                    borderTop: '1px solid #f1f5f9',
                    borderBottom: '1px solid #f1f5f9'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                        검색 필터를 설정하고 데이터를 조회하세요.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {canViewInbound && (
                            <button 
                                className="outline" 
                                onClick={async () => {
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
                                }}
                                style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                            >
                                📊 다운로드
                            </button>
                        )}
                        {isInternalQuality && (
                            <button 
                                className="outline" 
                                onClick={onRequestCoa}
                                style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#2563eb', borderColor: '#3b82f6' }}
                            >
                                📧 성적서 요청
                            </button>
                        )}
                        <button 
                            className="primary" 
                            onClick={onSearch} 
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            🔍 조회
                        </button>
                        <button className="outline" onClick={onReset} style={{ padding: '10px 16px', fontSize: '14px' }}>♻️ 초기화</button>
                        <button 
                            className="primary" 
                            onClick={onBatchSave} 
                            style={{ backgroundColor: '#1e293b', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px', opacity: isInternalQuality ? 1 : 0.5 }} 
                            disabled={!isInternalQuality}
                        >
                            💾 저장
                        </button>
                    </div>
                </div>
            </div>

            {/* 검색 필터 그리드 (제품코드 마스터 표준 규격) */}
            <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                    {/* 1. 입고 기간 (날짜 + ⚡빠른선택) */}
                    <div style={{ gridColumn: 'span 2', minWidth: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>🗓️ 입고 기간</label>
                            {renderPresetButtons()}
                        </div>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <input 
                                type="date" 
                                value={searchParams.startDate || ''} 
                                onChange={e => setSearchParams(prev => ({ ...prev, startDate: e.target.value }))} 
                                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} 
                            />
                            <span style={{ color: '#94a3b8' }}>~</span>
                            <input 
                                type="date" 
                                value={searchParams.endDate || ''} 
                                onChange={e => setSearchParams(prev => ({ ...prev, endDate: e.target.value }))} 
                                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} 
                            />
                        </div>
                    </div>

                    {/* 2. 품목코드 + 🔍 돋보기 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🏷️ 품목코드</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input
                                type="text"
                                placeholder="코드 검색"
                                value={searchParams.itemCode || ''}
                                onChange={handleChange('itemCode')}
                                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowSearchPopup(true)} 
                                style={{ padding: '0 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }} 
                                title="품목 상세 검색"
                            >
                                🔍
                            </button>
                        </div>
                    </div>

                    {/* 3. 제품명 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>📦 제품명</label>
                        <input
                            type="text"
                            placeholder="제품명 검색"
                            value={searchParams.productName || ''}
                            onChange={handleChange('productName')}
                            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        />
                    </div>

                    {/* 4. 제조사명 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🏭 제조사명</label>
                        <input
                            type="text"
                            placeholder="제조사 검색"
                            value={searchParams.manufacturer || ''}
                            onChange={handleChange('manufacturer')}
                            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        />
                    </div>

                    {/* 5. LOT 번호 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔢 LOT 번호</label>
                        <input
                            type="text"
                            placeholder="LOT 번호"
                            value={searchParams.lotNumber || ''}
                            onChange={handleChange('lotNumber')}
                            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        />
                    </div>

                    {/* 6. 입고번호 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🆔 입고번호</label>
                        <input
                            type="text"
                            placeholder="GRN-YYYYMMDD-XXX"
                            value={searchParams.grnNumber || ''}
                            onChange={handleChange('grnNumber')}
                            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        />
                    </div>

                    {/* 7. 입고검사 상태 필터 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🚩 입고검사 상태</label>
                        <select
                            value={searchParams.excludeStatus || ''}
                            onChange={handleChange('excludeStatus')}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', height: '37px' }}
                        >
                            <option value="">전체 보기</option>
                            <option value="검사 대기">검사 대기</option>
                            <option value="검사 중">검사 중</option>
                            <option value="검사 완료">검사 완료</option>
                            <option value="STEP5_FINAL_COMPLETE">진행 중인 것만 (5단계 제외)</option>
                        </select>
                    </div>
                </div>
            </div>

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
