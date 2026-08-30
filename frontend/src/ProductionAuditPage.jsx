import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { toast } from 'react-toastify';
import ProductionAuditDrawer from './ProductionAuditDrawer';
import ProductSearchPopup from './ProductSearchPopup';
import * as api from './api';
import { usePermissions } from './usePermissions';
import useDateRangePreset from './hooks/useDateRangePreset';
import GridColorLegendPopover from './components/common/GridColorLegendPopover';
import GridConditionalFormattingModal from './components/common/GridConditionalFormattingModal';

const PROD_AUDIT_LEGENDS = [
    {
        title: '생산 실사(사진 감리) 진행 상태',
        items: [
            { label: '승인됨 (APPROVED)', desc: '품질팀 최종 검토 및 승인 완료된 감리 건', bg: '#f6ffed', text: '#389e0d', border: '#b7eb8f' },
            { label: '제출됨 (SUBMITTED)', desc: '제조사 등록 완료 후 품질팀 검토 대기 건', bg: '#e6f7ff', text: '#096dd9', border: '#91d5ff' },
            { label: '반려됨 (REJECTED)', desc: '품질팀 검토 결과 보완/재촬영 요구 건', bg: '#fff1f0', text: '#cf1322', border: '#ffa39e' },
            { label: '미진행 (PENDING)', desc: '신제품 생산 후 사진 감리 미등록 대상 품목', bg: '#fffbe6', text: '#d48806', border: '#ffe58f' }
        ]
    }
];

const PROD_AUDIT_FORMATTABLE_COLUMNS = [
    { field: 'status', headerName: '진행상태' },
    { field: 'itemCode', headerName: '품목코드' },
    { field: 'productName', headerName: '제품명' },
    { field: 'manufacturerName', headerName: '제조사' },
    { field: 'isDisclosed', headerName: '제조사 공개' },
    { field: 'productionDate', headerName: '생산일자' },
    { field: 'uploadDate', headerName: '사진 업로드일' }
];

/**
 * 신제품 생산감리(사진감리) 메인 화면 컴포넌트입니다.
 * 진행 대상(PENDING), 작성 완료된 감리 내역을 탭 형식으로 제공하며,
 * 권한에 따라 데이터 조회 범위 및 노출 기능이 자동으로 조정됩니다.
 * 
 * @param {Object} props
 * @param {Object} props.user - 현재 로그인한 사용자의 정보
 */
const ProductionAuditPage = ({ user, navigationData, onNavigated }) => {
    const { canView, canEdit } = usePermissions(user);
    const isAdmin = user?.roles?.some(r => r.authority?.includes('ADMIN')) || user?.role === 'ADMIN';
    const isManufacturer = user?.roles?.some(r => r.authority?.includes('MANUFACTURER'));
    const canRegister = canEdit('qualityPhotoAudit');
    const [isFormattingModalOpen, setIsFormattingModalOpen] = useState(false);
    const [customRules, setCustomRules] = useState(() => {
        try {
            const saved = localStorage.getItem('prod_audit_grid_custom_rules');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const handleSaveCustomRules = (newRules) => {
        setCustomRules(newRules);
        localStorage.setItem('prod_audit_grid_custom_rules', JSON.stringify(newRules));
    };

    const getCellStyle = (field, value, fallbackStyle = null) => {
        if (!customRules || customRules.length === 0) return fallbackStyle;
        const matchedRule = customRules.find(rule => {
            if (rule.field !== field) return false;
            const strVal = String(value ?? '').trim().toLowerCase();
            const targetVal = String(rule.value ?? '').trim().toLowerCase();
            if (rule.operator === 'equals') return strVal === targetVal;
            if (rule.operator === 'contains') return strVal.includes(targetVal);
            if (rule.operator === 'startsWith') return strVal.startsWith(targetVal);
            if (rule.operator === 'endsWith') return strVal.endsWith(targetVal);
            return false;
        });

        if (matchedRule) {
            return {
                ...(fallbackStyle || {}),
                backgroundColor: matchedRule.bg || matchedRule.bgColor,
                color: matchedRule.text || matchedRule.textColor,
                fontWeight: 'bold'
            };
        }
        return fallbackStyle;
    };
    const gridRef = useRef(null);
    const [rowData, setRowData] = useState([]);
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
    const [viewMode, setViewMode] = useState('completed'); // 'completed' or 'pending'
    const [searchFields, setSearchFields] = useState({
        startDate: '',
        endDate: '',
        itemCode: '',
        productName: '',
        manufacturerName: '',
        disclosureFilter: 'ALL' // 'ALL', 'DISCLOSED', 'HIDDEN'
    });

    const { renderPresetButtons } = useDateRangePreset(
        (start) => setSearchFields(prev => ({ ...prev, startDate: start })),
        (end) => setSearchFields(prev => ({ ...prev, endDate: end }))
    );
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    // [추가] 딥링크(navigationData) 연동 처리
    const lastNavData = useRef(undefined);
    useEffect(() => {
        if (lastNavData.current === navigationData) return;
        lastNavData.current = navigationData;

        if (navigationData) {
            const { auditId, itemCode } = navigationData;
            
            // 만약 itemCode가 있으면 즉시 상세조회 시도 (제품 정보 상세 매핑 및 pending 뷰 모드 자동 활성화)
            if (itemCode) {
                const mfrFilter = isManufacturer ? user.companyName : '';
                Promise.all([
                    api.getPendingProductionAudits(mfrFilter).catch(() => ({ data: [] })),
                    api.getProducts().catch(() => ({ data: { content: [] } }))
                ]).then(([pendingRes, productsRes]) => {
                    const pendingList = pendingRes.data || [];
                    const productsList = productsRes.data?.content || productsRes.data || [];
                    
                    const foundPending = pendingList.find(p => p.itemCode === itemCode);
                    const foundProduct = productsList.find(p => p.itemCode === itemCode);
                    const found = foundPending || foundProduct;
                    
                    setSelectedAudit({
                        itemCode: itemCode,
                        productName: found ? found.productName : '',
                        manufacturerName: found ? (found.manufacturerName || found.manufacturerInfo?.name || found.manufacturer || '') : (user?.companyName || ''),
                        isDisclosed: found ? (found.isDisclosed !== undefined ? found.isDisclosed : found.disclosed) : true,
                        status: 'PENDING'
                    });
                    setViewMode('pending');
                    setIsDrawerOpen(true);
                }).catch(() => {
                    setSelectedAudit({
                        itemCode: itemCode,
                        productName: '',
                        manufacturerName: user?.companyName || '',
                        isDisclosed: true,
                        status: 'PENDING'
                    });
                    setViewMode('pending');
                    setIsDrawerOpen(true);
                });
            } else if (auditId) {
                // auditId 기반으로 목록에서 조회를 시도하여 해당 서랍 오픈
                api.getProductionAudits(isManufacturer ? user.companyName : '')
                    .then(res => {
                        const list = res.data || [];
                        const target = list.find(a => String(a.id) === String(auditId));
                        if (target) {
                            setSelectedAudit(target);
                            setIsDrawerOpen(true);
                        } else {
                            return api.getPendingProductionAudits(isManufacturer ? user.companyName : '');
                        }
                    })
                    .then(res => {
                        if (!res) return;
                        const pendingList = res.data || [];
                        const target = pendingList.find(p => String(p.id) === String(auditId) || p.itemCode === auditId);
                        if (target) {
                            setSelectedAudit({
                                itemCode: target.itemCode,
                                productName: target.productName,
                                manufacturerName: target.manufacturerName,
                                isDisclosed: target.isDisclosed,
                                status: 'PENDING'
                            });
                            setViewMode('pending');
                            setIsDrawerOpen(true);
                        }
                    })
                    .catch(err => {
                        console.error("Failed to load production audit from deep link", err);
                    });
            }

            if (onNavigated) onNavigated();
        }
    }, [navigationData]);


    const lastFetchedMode = useRef(null);
    useEffect(() => {
        if (lastFetchedMode.current === viewMode) return;
        lastFetchedMode.current = viewMode;
        fetchData();
    }, [viewMode]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const mfrFilter = isManufacturer ? user.companyName : searchFields.manufacturerName;
            
            // Fetch both parts with individual error handling to ensure visibility even if one fails
            let audits = [];
            let pending = [];
            
            try {
                const res = await api.getProductionAudits(mfrFilter);
                audits = res.data || [];
            } catch (err) {
                console.error("Failed to load production audits", err);
                toast.error("생산감리 내역 조회 중 오류가 발생했습니다.");
            }
            
            try {
                const res = await api.getPendingProductionAudits(mfrFilter);
                pending = res.data || [];
            } catch (err) {
                console.error("Failed to load pending audits", err);
                toast.error("미진행 품목 조회 중 오류가 발생했습니다.");
            }
            
            let finalData = [];
            if (viewMode === 'all') {
                finalData = [...audits, ...pending];
            } else if (viewMode === 'pending') {
                finalData = pending;
            } else if (viewMode === 'review') {
                if (!isManufacturer) {
                    // 관리자: 제출된 모든 내역 (반려 후 재제출 포함)
                    finalData = audits.filter(a => a.status === 'SUBMITTED');
                } else {
                    // 제조사: 품질팀에서 반려한 내역
                    finalData = audits.filter(a => a.status === 'REJECTED');
                }
            } else if (viewMode === 'completed') {
                // 관리자 & 제조사 공통: 최종 승인된 내역만 노출
                finalData = audits.filter(a => a.status === 'APPROVED');
            }
            
            let filteredResults = finalData;

            filteredResults = filteredResults.filter(item => {
                const matchesItemCode = !searchFields.itemCode || item.itemCode?.toLowerCase().includes(searchFields.itemCode.toLowerCase());
                const matchesProductName = !searchFields.productName || item.productName?.toLowerCase().includes(searchFields.productName.toLowerCase());
                
                let matchesDisclosure = true;
                if (!isManufacturer) { // 관리자(품질팀)인 경우 모든 탭에서 공개 여부 필터 적용
                    if (searchFields.disclosureFilter === 'DISCLOSED') matchesDisclosure = item.isDisclosed === true;
                    if (searchFields.disclosureFilter === 'HIDDEN') matchesDisclosure = item.isDisclosed === false;
                }

                return matchesItemCode && matchesProductName && matchesDisclosure;
            });

            setRowData(filteredResults);
        } catch (error) {
            console.error("Failed to process fetch data", error);
            toast.error("데이터 처리 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchClick = () => {
        fetchData();
    };

    const handleRowClick = (event) => {
        if (viewMode === 'pending') {
            setSelectedAudit({
                itemCode: event.data.itemCode,
                productName: event.data.productName,
                manufacturerName: event.data.manufacturerName,
                isDisclosed: event.data.isDisclosed,
                status: 'PENDING'
            });
        } else {
            setSelectedAudit(event.data);
        }
        setIsDrawerOpen(true);
    };

    const handleCreateNew = () => {
        setSelectedAudit(null);
        setIsDrawerOpen(true);
    };

    const handleExportExcel = async () => {
        if (!rowData || rowData.length === 0) {
            alert("조회 내역이 없습니다.");
            return;
        }
        setExporting(true);
        try {
            const mfrFilter = isManufacturer ? user.companyName : searchFields.manufacturerName;
            const response = await api.exportAuditsExcel({ ...searchFields, manufacturerName: mfrFilter });
            api.downloadBlob(response, "ProductionAudit_Export.xlsx");
            toast.success("생산감리 엑셀 다운로드가 완료되었습니다.");
        } catch (error) {
            console.error("Export error", error);
            toast.error("엑셀 다운로드 중 오류가 발생했습니다.");
        } finally {
            setExporting(false);
        }
    };

    const handleProductSelect = (product) => {
        setSearchFields(prev => ({
            ...prev,
            itemCode: product.itemCode,
            productName: product.productName
        }));
        setIsProductSearchOpen(false);
    };

    const colDefs = useMemo(() => [
        { 
            field: "status", 
            headerName: "진행상태", 
            width: 120,
            pinned: 'left',
            cellStyle: p => getCellStyle('status', p.value),
            cellRenderer: p => {
                const statusMap = {
                    'SUBMITTED': { label: '제출됨', class: 'info' },
                    'APPROVED': { label: '승인됨', class: 'success' },
                    'REJECTED': { label: '반려됨', class: 'secondary' },
                    'PENDING': { label: '미진행', class: 'warning' }
                };
                const status = statusMap[p.value] || { label: p.value, class: 'info' };
                return <span className={`badge ${status.class}`} style={{ fontSize: '11px' }}>{status.label}</span>;
            }
        },
        { field: "itemCode", headerName: "품목코드", filter: true, width: 140, pinned: 'left', cellStyle: p => getCellStyle('itemCode', p.value) },
        { field: "productName", headerName: "제품명", filter: true, width: 250, pinned: 'left', cellStyle: p => getCellStyle('productName', p.value) },
        { field: "manufacturerName", headerName: "제조사", filter: true, width: 150, cellStyle: p => getCellStyle('manufacturerName', p.value) },
        { 
            field: "isDisclosed", 
            headerName: "제조사 공개", 
            width: 110,
            hide: isManufacturer,
            cellStyle: p => getCellStyle('isDisclosed', p.value ? '공개' : '비공개'),
            cellRenderer: p => (
                <span style={{ 
                    color: p.value ? '#38a169' : '#e53e3e', 
                    fontWeight: '800', 
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    {p.value ? '● 공개' : '○ 비공개'}
                </span>
            )
        },
        { 
            field: "productionDate", 
            headerName: "생산일자", 
            width: 130, 
            filter: 'agDateColumnFilter',
            valueFormatter: p => p.value || '-',
            cellStyle: p => getCellStyle('productionDate', p.value)
        },
        { 
            field: "uploadDate", 
            headerName: "사진 업로드일", 
            width: 160, 
            filter: 'agDateColumnFilter',
            valueFormatter: p => p.value ? new Date(p.value).toLocaleString() : '-',
            cellStyle: p => getCellStyle('uploadDate', p.value)
        },
        { field: "rejectionReason", headerName: "승인/반려 의견", flex: 1, minWidth: 200 }
    ], [viewMode, isManufacturer, customRules]);

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9' }}>
            
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
                            📸 신제품 생산감리 (사진감리)
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {isManufacturer && (
                            <button 
                                className="primary" 
                                onClick={handleCreateNew} 
                                style={{ 
                                    padding: '10px 24px', 
                                    borderRadius: '10px', 
                                    fontWeight: '800', 
                                    backgroundColor: '#2563eb',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: canRegister ? 'pointer' : 'not-allowed',
                                    opacity: canRegister ? 1 : 0.5
                                }} 
                                disabled={!canRegister}
                            >
                                ➕ 신규 감리 등록
                            </button>
                        )}
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'inline-flex', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <button 
                                onClick={() => setViewMode('all')}
                                style={{ 
                                    padding: '8px 16px', 
                                    fontSize: '13px', 
                                    border: 'none', 
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    backgroundColor: viewMode === 'all' ? '#2563eb' : 'transparent',
                                    color: viewMode === 'all' ? '#fff' : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                전체 내역
                            </button>
                            <button 
                                onClick={() => setViewMode('pending')}
                                style={{ 
                                    padding: '8px 16px', 
                                    fontSize: '13px', 
                                    border: 'none', 
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    backgroundColor: viewMode === 'pending' ? '#2563eb' : 'transparent',
                                    color: viewMode === 'pending' ? '#fff' : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                미진행 품목
                            </button>
                            <button 
                                onClick={() => setViewMode('review')}
                                style={{ 
                                    padding: '8px 16px', 
                                    fontSize: '13px', 
                                    border: 'none', 
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    backgroundColor: viewMode === 'review' ? '#2563eb' : 'transparent',
                                    color: viewMode === 'review' ? '#fff' : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isManufacturer ? '반려됨' : '검토 필요'}
                            </button>
                            <button 
                                onClick={() => setViewMode('completed')}
                                style={{ 
                                    padding: '8px 16px', 
                                    fontSize: '13px', 
                                    border: 'none', 
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    backgroundColor: viewMode === 'completed' ? '#2563eb' : 'transparent',
                                    color: viewMode === 'completed' ? '#fff' : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                완료 내역
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* 🎨 색상 범례 팝오버 */}
                        <GridColorLegendPopover 
                            legends={PROD_AUDIT_LEGENDS}
                            customRules={customRules}
                            onDeleteCustomRule={(idx) => {
                                handleSaveCustomRules(customRules.filter((_, i) => i !== idx));
                            }}
                        />

                        {/* ⚙️ 조건부 서식 설정 (관리자 전용) */}
                        {isAdmin && (
                            <button
                                type="button"
                                className="outline"
                                onClick={() => setIsFormattingModalOpen(true)}
                                style={{
                                    fontSize: '13px',
                                    padding: '8px 14px',
                                    backgroundColor: '#fff',
                                    color: '#475569',
                                    borderColor: '#cbd5e1',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 'bold',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                                title="그리드 셀 조건부 서식 규칙 추가/관리"
                            >
                                ⚙️ 서식 설정
                            </button>
                        )}

                        <button 
                            className="outline" 
                            onClick={handleExportExcel}
                            disabled={exporting}
                            style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41', opacity: exporting ? 0.7 : 1 }}
                        >
                            {exporting ? '⏳ 다운로드 중...' : '📊 결과 다운로드'}
                        </button>
                        <button 
                            className="primary" 
                            onClick={handleSearchClick} 
                            disabled={loading}
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? '⏳ 조회 중...' : '🔍 조회'}
                        </button>
                        <button 
                            className="outline" 
                            onClick={() => setSearchFields({ itemCode: '', productName: '', manufacturerName: '', disclosureFilter: 'ALL' })} 
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
                    {/* 1. 감리 기간 (날짜 + ⚡빠른선택) */}
                    <div style={{ gridColumn: 'span 2', minWidth: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>🗓️ 감리 기간</label>
                            {renderPresetButtons()}
                        </div>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <input type="date" value={searchFields.startDate || ''} onChange={e => setSearchFields({ ...searchFields, startDate: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                            <span style={{ color: '#94a3b8' }}>~</span>
                            <input type="date" value={searchFields.endDate || ''} onChange={e => setSearchFields({ ...searchFields, endDate: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                        </div>
                    </div>

                    {/* 2. 품목코드 + 🔍 돋보기 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🏷️ 품목코드</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                                type="text"
                                value={searchFields.itemCode}
                                onChange={(e) => setSearchFields({ ...searchFields, itemCode: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                                placeholder="코드 입력"
                                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                            />
                            <button 
                                type="button" 
                                onClick={() => setIsProductSearchOpen(true)}
                                title="품목 상세 검색"
                                style={{ padding: '0 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                🔍
                            </button>
                        </div>
                    </div>

                    {/* 3. 품목명 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>📦 품목명</label>
                        <input
                            type="text"
                            value={searchFields.productName}
                            onChange={(e) => setSearchFields({ ...searchFields, productName: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                            placeholder="품목명 입력"
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        />
                    </div>

                    {/* 4. 제조사명 및 공개여부 (관리자 전용) */}
                    {!isManufacturer && (
                        <>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🏭 제조사명</label>
                                <input
                                    type="text"
                                    value={searchFields.manufacturerName}
                                    onChange={(e) => setSearchFields({ ...searchFields, manufacturerName: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                                    placeholder="제조사 입력"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>👁️ 제조사 공개 여부</label>
                                <select
                                    value={searchFields.disclosureFilter}
                                    onChange={(e) => setSearchFields({ ...searchFields, disclosureFilter: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', height: '37px' }}
                                >
                                    <option value="ALL">전체 보기 (공개/비공개)</option>
                                    <option value="DISCLOSED">공개만 보기</option>
                                    <option value="HIDDEN">비공개만 보기</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 데이터 카드 */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', flex: 1, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '15px', fontWeight: '800', fontSize: '14px', color: '#64748b' }}>
                    조회 결과: <span style={{ color: '#2563eb' }}>{rowData.length}</span> 건
                </div>
                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                    <AgGridReact
                        theme="legacy"
                        rowHeight={54}
                        ref={gridRef}
                        rowData={rowData}
                        columnDefs={colDefs}
                        onRowDoubleClicked={handleRowClick}
                        animateRows={true}
                        overlayNoRowsTemplate={
                            viewMode === 'pending' ? '생산감리 미진행 품목이 없습니다.' : 
                            viewMode === 'review' ? 
                                (isManufacturer ? '반려된 내역이 없습니다.' : '검토가 필요한 감리 내역이 없습니다.') : 
                            '조회된 감리 내역이 없습니다.'
                        }
                    />
                </div>
            </div>

            <div style={{ padding: '10px', fontSize: '12px', color: '#718096', borderTop: '1px solid #edf2f7', marginTop: '10px' }}>
                * 품목 리스트를 더블 클릭하면 상세 정보를 확인하거나 감리를 등록할 수 있습니다.
            </div>

            {isDrawerOpen && (
                <ProductionAuditDrawer
                    audit={selectedAudit}
                    user={user}
                    onClose={() => setIsDrawerOpen(false)}
                    onSaveSuccess={fetchData}
                />
            )}

            {isProductSearchOpen && (
                <ProductSearchPopup 
                    isOpen={isProductSearchOpen}
                    onClose={() => setIsProductSearchOpen(false)}
                    onSelect={(p) => {
                        setSearchFields(prev => ({
                            ...prev,
                            itemCode: p.itemCode || prev.itemCode,
                            productName: p.productName || prev.productName
                        }));
                        setIsProductSearchOpen(false);
                    }}
                    onSelectProduct={(p) => {
                        setSearchFields(prev => ({
                            ...prev,
                            itemCode: p.itemCode || prev.itemCode,
                            productName: p.productName || prev.productName
                        }));
                        setIsProductSearchOpen(false);
                    }}
                />
            )}

            {/* 조건부 서식 설정 모달 (관리자 전용) */}
            <GridConditionalFormattingModal
                isOpen={isFormattingModalOpen}
                onClose={() => setIsFormattingModalOpen(false)}
                columns={PROD_AUDIT_FORMATTABLE_COLUMNS}
                rules={customRules}
                legends={PROD_AUDIT_LEGENDS}
                onSave={handleSaveCustomRules}
            />
        </div>
    );
};

export default ProductionAuditPage;
