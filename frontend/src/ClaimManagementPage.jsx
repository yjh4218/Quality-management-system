import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { toast } from 'react-toastify';
import { getClaims, getClaimsPaged, getClaimDashboard } from './api';
import ClaimDrawer from './ClaimDrawer';
import ProductSearchPopup from './ProductSearchPopup';
import { usePermissions } from './usePermissions';
import useDateRangePreset from './hooks/useDateRangePreset';
import { splitSearchTokens, matchesAllTokens } from './utils/searchUtils';
import GridColorLegendPopover from './components/common/GridColorLegendPopover';
import GridConditionalFormattingModal from './components/common/GridConditionalFormattingModal';

const CLAIM_LEGENDS = [
    { label: '치명 클레임 (CRITICAL)', color: '#be123c', bg: '#fff5f5', icon: '🔴', scope: '행 전체', desc: '중대 결함으로 지정된 고위험 클레임 건 (연분홍 배경 & 붉은 글자)' },
    { label: '고객 회신 필요 건', color: '#b30000', bg: '#ffe5e5', icon: '⚠️', scope: '행 전체', desc: '소비자/고객사 추가 답변 및 보상 요구 건 (붉은 강조 배경)' },
    { label: '품질팀 처리 상태 (1~5단계)', color: '#0d6efd', bg: '#eff6ff', icon: '🔄', scope: '처리 상태', desc: '1단계(파랑) / 2단계(주황) / 3단계(청록) / 4단계(보라) / 5단계(초록)' },
    { label: '제조사 처리 상태 (1~4단계)', color: '#16a34a', bg: '#f0fdf4', icon: '🏭', scope: '제조사 상태', desc: '1.접수(파랑) / 2.원인분석(노랑) / 3.대책수립(초록) / 4.클레임 종결(검정)' },
    { label: '제조사 공유 상태', color: '#15803d', bg: '#dcfce7', icon: '✅', scope: '제조사 공유', desc: '제조사 포털 실시간 공유 여부 (공유중 / 비공개)' }
];

const CLAIM_FORMATTABLE_COLUMNS = [
    { field: 'claimNumber', headerName: '문서번호' },
    { field: 'country', headerName: '인입 국가' },
    { field: 'itemCode', headerName: '품목코드' },
    { field: 'productName', headerName: '품목명' },
    { field: 'lotNumber', headerName: '로트번호' },
    { field: 'manufacturer', headerName: '제조사' },
    { field: 'primaryCategory', headerName: '대분류' },
    { field: 'mfrStatus', headerName: '제조사 처리 상태' }
];

const ClaimManagementPage = ({ user, onNavigate, navigationData, onNavigated }) => {
    const { canView, isAdmin } = usePermissions(user);
    const gridRef = useRef(null);
    const [actualClaims, setActualClaims] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const initializedRef = useRef(false);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [isFormattingModalOpen, setIsFormattingModalOpen] = useState(false);
    const [customRules, setCustomRules] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('qms_grid_rules_claim_list') || '[]');
        } catch {
            return [];
        }
    });

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const pageSize = 50;

    const lastSearchRef = useRef('');

    const getInitialDates = () => {
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setFullYear(today.getFullYear() - 1); // 1년으로 확장
        return {
            start: lastWeek.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0]
        };
    };

    const initialDates = useMemo(() => getInitialDates(), []);
    const [searchParams, setSearchParams] = useState({
        startDate: initialDates.start,
        endDate: initialDates.end,
        itemCode: '',
        productName: '',
        lotNumber: '',
        country: '',
        qualityStatus: '',
        claimNumber: '',
        sharedWithManufacturer: '',
        manufacturer: '',
        isCriticalClaim: ''
    });

    const { renderPresetButtons } = useDateRangePreset(
        (start) => setSearchParams(prev => ({ ...prev, startDate: start })),
        (end) => setSearchParams(prev => ({ ...prev, endDate: end }))
    );
    const [showSearchPopup, setShowSearchPopup] = useState(false);

    const isInternal = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_QUALITY' || user?.role === 'ADMIN' || user?.role === 'QUALITY' ||
        user?.companyName === '더파운더즈' ||
        user?.roles?.some(r => ['ROLE_ADMIN', 'ROLE_QUALITY', 'ADMIN', 'QUALITY'].includes(r.authority));

    const loadData = React.useCallback(async (force = false, pageNum = 0) => {
        const currentSearchKey = `${searchParams.sharedWithManufacturer}-${searchParams.qualityStatus}-${pageNum}`;
        if (!force && lastSearchRef.current === currentSearchKey) return;
        
        lastSearchRef.current = currentSearchKey; // Set early to prevent race conditions
        setLoading(true);
        try {
            const itemCodeTokens = splitSearchTokens(searchParams.itemCode);
            const nameTokens = splitSearchTokens(searchParams.productName);
            const lotTokens = splitSearchTokens(searchParams.lotNumber);
            const claimNumTokens = splitSearchTokens(searchParams.claimNumber);
            const mfrTokens = splitSearchTokens(searchParams.manufacturer);

            const queryParams = {
                ...searchParams,
                itemCode: itemCodeTokens.length > 0 ? itemCodeTokens[0] : undefined,
                productName: nameTokens.length > 0 ? nameTokens[0] : undefined,
                lotNumber: lotTokens.length > 0 ? lotTokens[0] : undefined,
                claimNumber: claimNumTokens.length > 0 ? claimNumTokens[0] : undefined,
                manufacturer: mfrTokens.length > 0 ? mfrTokens[0] : undefined
            };

            const claimsRes = await getClaimsPaged(queryParams, pageNum, pageSize);
            setActualClaims(claimsRes.data.content || []);
            setTotalPages(claimsRes.data.totalPages || 0);
            setTotalElements(claimsRes.data.totalElements || 0);
            setCurrentPage(pageNum);
        } catch (error) {
            console.error("Failed to load claims", error);
            setActualClaims([]);
            toast.error("클레임 내역을 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    }, [searchParams]);

    const filteredClaims = useMemo(() => {
        return actualClaims.filter(c => {
            if (searchParams.claimNumber?.trim() && !matchesAllTokens(c.claimNumber, searchParams.claimNumber)) return false;
            if (searchParams.itemCode?.trim() && !matchesAllTokens(c.itemCode, searchParams.itemCode)) return false;
            if (searchParams.productName?.trim() && !matchesAllTokens(c.productName, searchParams.productName)) return false;
            if (searchParams.lotNumber?.trim() && !matchesAllTokens(c.lotNumber, searchParams.lotNumber)) return false;
            if (searchParams.country?.trim() && !matchesAllTokens(c.country, searchParams.country)) return false;
            if (searchParams.manufacturer?.trim() && !matchesAllTokens(c.manufacturer, searchParams.manufacturer)) return false;
            return true;
        });
    }, [actualClaims, searchParams]);

    // Consistently trigger check on mount and key-filter changes
    const hasFetchedOnMount = useRef(false);
    useEffect(() => {
        if (hasFetchedOnMount.current) return;
        hasFetchedOnMount.current = true;
        loadData(false, 0); // Automated trigger uses the guard
    }, [loadData]);

    const isManufacturer = user?.roles?.some(r => r.authority?.includes('MANUFACTURER'));

    const lastNavData = useRef(undefined);
    useEffect(() => {
        if (lastNavData.current === navigationData) return;
        lastNavData.current = navigationData;

        if (navigationData) {
            setSelectedClaim(navigationData);
            setIsDrawerOpen(true);
            if (onNavigated) onNavigated();
        }
    }, [navigationData, onNavigated]);

    const getCellStyle = (field) => (params) => {
        if (!customRules || customRules.length === 0 || !params.value) return null;
        const matchingRule = customRules.find(rule => {
            if (rule.field !== field) return false;
            const cellVal = String(params.value).toLowerCase();
            const ruleVal = String(rule.value).toLowerCase();
            return rule.operator === 'CONTAINS' ? cellVal.includes(ruleVal) : cellVal === ruleVal;
        });
        if (matchingRule) {
            return {
                backgroundColor: matchingRule.bg,
                color: matchingRule.text,
                fontWeight: '600'
            };
        }
        return null;
    };

    const columnDefs = useMemo(() => [
        { field: 'claimNumber', headerName: '문서번호', width: 180, sortable: true, filter: true, pinned: 'left', cellStyle: getCellStyle('claimNumber') },
        { field: 'receiptDate', headerName: '접수일자', sortable: true, filter: true, width: 150 },
        {
            field: 'qualityStatus', headerName: '처리 상태', sortable: true, filter: true, width: 230,
            cellRenderer: params => {
                const status = params.value;
                let color = '#6c757d';
                if (status?.includes('1단계')) color = '#0d6efd';
                if (status?.includes('2단계')) color = '#fd7e14';
                if (status?.includes('3단계')) color = '#17a2b8';
                if (status?.includes('4단계')) color = '#6610f2';
                if (status?.includes('5단계')) color = '#198754';
                return <span style={{ color: color, fontWeight: 'bold' }}>{status || '0단계 (접수 대기)'}</span>;
            }
        },
        {
            field: 'sharedWithManufacturer', headerName: '제조사 공유', width: 120, hide: isManufacturer,
            cellRenderer: params => params.value ? '✅ 공유중' : '❌ 비공개'
        },
        {
            field: 'mfrStatus', headerName: '제조사 처리 상태', sortable: true, filter: true, width: 230, cellStyle: getCellStyle('mfrStatus'),
            cellRenderer: params => {
                if (!params.data.sharedWithManufacturer) return <span style={{color: '#adb5bd', fontSize: '12px'}}>-비공개-</span>;
                const status = params.value;
                let color = '#6c757d';
                if (status?.includes('1. 접수')) color = '#339af0';
                if (status?.includes('2. 원인분석')) color = '#fab005';
                if (status?.includes('3. 대책수립')) color = '#40c057';
                if (status?.includes('4. 클레임 종결')) color = '#000';
                return <span style={{ color: color, fontWeight: 'bold' }}>{status || '1. 접수'}</span>;
            }
        },
        { field: 'country', headerName: '인입 국가', sortable: true, filter: true, width: 150, cellStyle: getCellStyle('country') },
        { field: 'itemCode', headerName: '품목코드', sortable: true, filter: true, width: 160, cellStyle: getCellStyle('itemCode') },
        { field: 'productName', headerName: '품목명', sortable: true, filter: true, width: 280, cellStyle: getCellStyle('productName') },
        { field: 'lotNumber', headerName: '로트번호', sortable: true, filter: true, width: 160, cellStyle: getCellStyle('lotNumber') },
        { field: 'manufacturer', headerName: '제조사', sortable: true, filter: true, width: 180, cellStyle: getCellStyle('manufacturer') },
        { field: 'primaryCategory', headerName: '대분류', sortable: true, filter: true, width: 170, cellStyle: getCellStyle('primaryCategory') },
        { field: 'occurrenceQty', headerName: '발생수량', sortable: true, filter: true, width: 130 },
        { field: 'qualityReceivedReturnedProduct', headerName: '품질팀 회수 제품 수령 여부', sortable: true, filter: true, width: 200 },
        { field: 'qualityReceivedDate', headerName: '품질팀 수령일자', sortable: true, filter: true, width: 160 },
        { field: 'terminationDate', headerName: '종결일', sortable: true, filter: true, width: 150 }
    ], [isManufacturer, customRules]);

    const handleRowClick = (e) => {
        setSelectedClaim(e.data);
        setIsDrawerOpen(true);
    };

    const handleCreateNew = () => {
        setSelectedClaim(null);
        setIsDrawerOpen(true);
    };

    const getRowStyle = params => {
        if (params.data && params.data.isCriticalClaim) {
            return { backgroundColor: '#fff5f5', color: '#be123c', fontWeight: 'bold' };
        }
        if (params.data && params.data.consumerReplyNeeded === '필요') {
            return { backgroundColor: '#ffe5e5', color: '#b30000', fontWeight: 'bold' };
        }
        return null;
    };

    const { canEdit: canEditClaim } = usePermissions(user);
    const canCreate = canEditClaim('claims');
    const canViewDashboard = canView('claimDashboard');

    const handleExportExcel = async () => {
        if (!actualClaims || actualClaims.length === 0) {
            alert("조회 내역이 없습니다.");
            return;
        }
        setExporting(true);
        try {
            const { exportClaimsExcel, downloadBlob } = await import('./api');
            const response = await exportClaimsExcel(searchParams);
            downloadBlob(response, "Claim_Export.xlsx");
            toast.success("클레임 엑셀 다운로드가 완료되었습니다.");
        } catch (error) {
            console.error("Export error", error);
            toast.error("엑셀 다운로드 중 오류가 발생했습니다.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
            
            {/* 3단계 표준 헤더 레이아웃 */}
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
                {/* 1단계: 생성 및 연동 (최상단) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            ⚠️ 클레임 관리
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="primary" 
                            onClick={handleCreateNew} 
                            disabled={!canCreate} 
                            style={{ padding: '10px 24px', fontWeight: 'bold', backgroundColor: '#4f46e5', opacity: canCreate ? 1 : 0.5 }}
                        >
                            + 신규 클레임 접수
                        </button>
                    </div>
                </div>

                {/* 2단계: 핵심 제어 (중단) */}
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
                        국내외 고객 클레임 접수 내역 및 단계별 처리 현황을 관리합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {canViewDashboard && (
                            <button 
                                className="outline" 
                                onClick={() => onNavigate('claimDashboard')}
                                style={{ fontWeight: 'bold', color: '#4f46e5', borderColor: '#c7d2fe' }}
                            >
                                📊 대시보드 보기
                            </button>
                        )}
                        {canView('claims') && (
                            <button 
                                className="outline" 
                                onClick={handleExportExcel} 
                                disabled={exporting}
                                style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41', opacity: exporting ? 0.7 : 1 }}
                            >
                                {exporting ? '⏳ 다운로드 중...' : '📊 결과 다운로드'}
                            </button>
                        )}
                        <GridColorLegendPopover 
                            title="CX 클레임 관리" 
                            legends={CLAIM_LEGENDS} 
                            customRules={customRules}
                            formattableColumns={CLAIM_FORMATTABLE_COLUMNS}
                        />
                        {isAdmin && (
                            <button
                                type="button"
                                className="outline"
                                onClick={() => setIsFormattingModalOpen(true)}
                                title="관리자 맞춤형 서식 규칙 설정"
                                style={{ fontSize: '13px', padding: '8px 12px', borderColor: '#94a3b8', color: '#334155' }}
                            >
                                ⚙️ 서식 설정
                            </button>
                        )}
                        <button 
                            className="primary" 
                            onClick={() => loadData(true, 0)} 
                            disabled={loading}
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? '⏳ 조회 중...' : '🔍 조회'}
                        </button>
                        <button 
                            className="outline" 
                            onClick={() => {
                                const initD = getInitialDates();
                                setSearchParams({ startDate: initD.start, endDate: initD.end, itemCode: '', productName: '', lotNumber: '', country: '', qualityStatus: '', claimNumber: '', sharedWithManufacturer: '', manufacturer: '', isCriticalClaim: '' });
                            }} 
                            style={{ padding: '10px 16px', fontSize: '14px' }}
                        >
                            ♻️ 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 검색 필터 그리드 */}
            <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                    
                    {/* 1. 기간 (날짜 + ⚡빠른선택 버튼) */}
                    <div style={{ gridColumn: 'span 2', minWidth: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>🗓️ 발생 기간</label>
                            {renderPresetButtons()}
                        </div>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <input type="date" value={searchParams.startDate || ''} onChange={e => setSearchParams({ ...searchParams, startDate: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                            <span style={{ color: '#94a3b8' }}>~</span>
                            <input type="date" value={searchParams.endDate || ''} onChange={e => setSearchParams({ ...searchParams, endDate: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
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
                                onChange={e => setSearchParams({ ...searchParams, itemCode: e.target.value })} 
                                onKeyDown={e => e.key === 'Enter' && fetchClaims()}
                                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowSearchPopup(true)} 
                                title="품목 상세 검색" 
                                style={{ padding: '0 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
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
                            onChange={e => setSearchParams({ ...searchParams, productName: e.target.value })} 
                            onKeyDown={e => e.key === 'Enter' && fetchClaims()}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} 
                        />
                    </div>

                    {/* 4. 제조사 */}
                    {!isManufacturer && (
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🏭 제조사</label>
                            <input 
                                type="text" 
                                placeholder="제조사명" 
                                value={searchParams.manufacturer || ''} 
                                onChange={e => setSearchParams({ ...searchParams, manufacturer: e.target.value })} 
                                onKeyDown={e => e.key === 'Enter' && fetchClaims()}
                                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} 
                            />
                        </div>
                    )}

                    {/* 5. LOT 번호 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔢 LOT 번호</label>
                        <input 
                            type="text" 
                            placeholder="LOT 번호" 
                            value={searchParams.lotNumber || ''} 
                            onChange={e => setSearchParams({ ...searchParams, lotNumber: e.target.value })} 
                            onKeyDown={e => e.key === 'Enter' && fetchClaims()}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} 
                        />
                    </div>

                    {/* 6. 문서번호 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>📑 문서번호</label>
                        <input 
                            type="text" 
                            placeholder="문서번호" 
                            value={searchParams.claimNumber || ''} 
                            onChange={e => setSearchParams({ ...searchParams, claimNumber: e.target.value })} 
                            onKeyDown={e => e.key === 'Enter' && fetchClaims()}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} 
                        />
                    </div>

                    {/* 7. 국가 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🌍 국가</label>
                        <input 
                            type="text" 
                            placeholder="국가명" 
                            value={searchParams.country || ''} 
                            onChange={e => setSearchParams({ ...searchParams, country: e.target.value })} 
                            onKeyDown={e => e.key === 'Enter' && fetchClaims()}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} 
                        />
                    </div>

                    {/* 8. 처리 상태 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔄 처리 상태</label>
                        <select value={searchParams.qualityStatus || ''} onChange={e => setSearchParams({ ...searchParams, qualityStatus: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', height: '38px' }}>
                            <option value="">전체 상태</option>
                            <option value="0. 접수 대기">0. 접수 대기</option>
                            <option value="1. 클레임 접수">1. 클레임 접수</option>
                            <option value="2. 제품 회수">2. 제품 회수</option>
                            <option value="3. 원인 분석">3. 원인 분석</option>
                            <option value="4. 클레임 종결">4. 클레임 종결</option>
                        </select>
                    </div>

                    {/* 제조사 공유 필터 (토글 스타일) */}
                    {isInternal && (
                        <div style={{ gridColumn: 'span 1' }}>
                            <div 
                                onClick={() => {
                                    const newVal = searchParams.sharedWithManufacturer === 'true' ? '' : 'true';
                                    setSearchParams(prev => ({ ...prev, sharedWithManufacturer: newVal }));
                                }}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                    padding: '7px 16px', borderRadius: '8px', 
                                    backgroundColor: searchParams.sharedWithManufacturer === 'true' ? '#fef2f2' : '#f8fafc',
                                    border: `1px solid ${searchParams.sharedWithManufacturer === 'true' ? '#fecaca' : '#e2e8f0'}`,
                                    transition: 'all 0.2s',
                                    height: '38px'
                                }}
                            >
                                <div style={{
                                    width: '14px', height: '14px', borderRadius: '4px',
                                    backgroundColor: searchParams.sharedWithManufacturer === 'true' ? '#ef4444' : '#cbd5e1',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px'
                                }}>
                                    {searchParams.sharedWithManufacturer === 'true' && '✓'}
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: searchParams.sharedWithManufacturer === 'true' ? '#b91c1c' : '#64748b' }}>제조사 공유 항목만</span>
                            </div>
                        </div>
                    )}

                    {/* 크리티컬 클레임 필터 (토글 스타일) */}
                    <div style={{ gridColumn: 'span 1' }}>
                        <div 
                            onClick={() => {
                                const newVal = searchParams.isCriticalClaim === 'true' ? '' : 'true';
                                setSearchParams(prev => ({ ...prev, isCriticalClaim: newVal }));
                            }}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                padding: '7px 16px', borderRadius: '8px', 
                                backgroundColor: searchParams.isCriticalClaim === 'true' ? '#fff5f5' : '#f8fafc',
                                border: `1px solid ${searchParams.isCriticalClaim === 'true' ? '#feb2b2' : '#e2e8f0'}`,
                                transition: 'all 0.2s',
                                height: '38px'
                            }}
                        >
                            <div style={{
                                width: '14px', height: '14px', borderRadius: '4px',
                                backgroundColor: searchParams.isCriticalClaim === 'true' ? '#e53e3e' : '#cbd5e1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px'
                            }}>
                                {searchParams.isCriticalClaim === 'true' && '✓'}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: searchParams.isCriticalClaim === 'true' ? '#c53030' : '#64748b' }}>🔥 크리티컬 클레임만</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Stats are moved to ClaimDashboardPage */}

            <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                <AgGridReact
                    theme="legacy"
                    ref={gridRef}
                    rowData={filteredClaims}
                    columnDefs={columnDefs}
                    pagination={false}
                    onRowDoubleClicked={handleRowClick}
                    getRowStyle={getRowStyle}
                />
            </div>

            {/* Custom Server-Side Pagination Bar */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '15px', padding: '10px 0' }}>
                <button
                    className="outline"
                    disabled={currentPage === 0 || loading}
                    onClick={() => loadData(true, currentPage - 1)}
                    style={{ padding: '6px 16px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: '#fff' }}
                >
                    ◀ 이전
                </button>
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>
                    {currentPage + 1} / {totalPages || 1} 페이지 (총 {totalElements}건)
                </span>
                <button
                    className="outline"
                    disabled={currentPage >= totalPages - 1 || loading}
                    onClick={() => loadData(true, currentPage + 1)}
                    style={{ padding: '6px 16px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: '#fff' }}
                >
                    다음 ▶
                </button>
            </div>

            {isDrawerOpen && (
                <ClaimDrawer
                    claim={selectedClaim}
                    onClose={() => setIsDrawerOpen(false)}
                    onSaved={(updated) => {
                        loadData(true, currentPage);
                        if (updated) {
                            setSelectedClaim(updated);
                        }
                    }}
                    user={user}
                />
            )}

            {showSearchPopup && (
                <ProductSearchPopup
                    onClose={() => setShowSearchPopup(false)}
                    onSelect={(p) => {
                        setSearchParams({ ...searchParams, itemCode: p.itemCode, productName: p.productName });
                        setShowSearchPopup(false);
                    }}
                />
            )}

            <GridConditionalFormattingModal
                isOpen={isFormattingModalOpen}
                onClose={() => setIsFormattingModalOpen(false)}
                columns={CLAIM_FORMATTABLE_COLUMNS}
                rules={customRules}
                legends={CLAIM_LEGENDS}
                onSave={(rules) => {
                    setCustomRules(rules);
                    if (gridRef.current?.api) {
                        gridRef.current.api.redrawRows();
                    }
                }}
            />
        </div>
    );
};

export default ClaimManagementPage;
