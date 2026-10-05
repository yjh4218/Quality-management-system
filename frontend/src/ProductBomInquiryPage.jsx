import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import * as api from './api';
import { toast } from 'react-toastify';
import ProductSearchPopup from './ProductSearchPopup';
import { usePermissions } from './usePermissions';
import CommonFilePreviewModal from './components/common/CommonFilePreviewModal';
import useGridTabRecovery from './hooks/useGridTabRecovery';

const BOM_INQUIRY_LEGENDS = [
    {
        title: '포장재 유형별 분류 기준 (EU PPWR 대응)',
        items: [
            { label: '용기류 (PET/초자/파우치)', desc: '화장품 본품 직접 충진 용기', bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
            { label: '캡·펌프류', desc: '원터치캡, 스크류캡, 디스펜서 펌프', bg: '#fdf4ff', text: '#a21caf', border: '#f5d0fe' },
            { label: '단상자·라벨류', desc: '종이 단상자, 방수/은박 라벨, 봉합 라벨', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
            { label: '인박스·아웃박스', desc: '골판지 포장박스, 간지, 완충재', bg: '#fffbeb', text: '#b45309', border: '#fef3c7' },
            { label: '부속품', desc: '스파츌라, 실링지, 가이드 설명서', bg: '#f8fafc', text: '#475569', border: '#cbd5e1' }
        ]
    }
];

const ProductBomInquiryPage = ({ user, isActive = true }) => {
    const { canAccess } = usePermissions();
    const [loading, setLoading] = useState(false);
    const [bomData, setBomData] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const gridRef = useRef(null);
    useGridTabRecovery(gridRef, isActive);

    // 검색 필터 상태
    const [filters, setFilters] = useState({
        itemCode: '',
        productName: '',
        keyword: '',
        bomType: '',
        latestOnly: true
    });

    // 선택된 단일 제품 (마스터 요약 카드 표시용)
    const [selectedProductSummary, setSelectedProductSummary] = useState(null);

    // 최초 로드 시 BOM 유형 카테고리 로드 및 초기 조회
    const hasMounted = useRef(false);
    useEffect(() => {
        if (hasMounted.current) return;
        hasMounted.current = true;
        fetchCategories();
        fetchBomData();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await api.getActiveBomCategories();
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setCategories(list);
        } catch (error) {
            console.error('Failed to load BOM categories:', error);
        }
    };

    // 데이터 조회
    const fetchBomData = async (overrideFilters = null) => {
        const targetFilters = overrideFilters || filters;
        setLoading(true);
        try {
            const params = {
                itemCode: targetFilters.itemCode || undefined,
                keyword: targetFilters.keyword || undefined,
                bomType: targetFilters.bomType || undefined,
                latestOnly: targetFilters.latestOnly
            };

            const res = await api.getProductBomSummaries(params);
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setBomData(data);

            // 단일 제품 검색인 경우 요약 카드 활성화
            if (targetFilters.itemCode && data.length > 0) {
                const first = data[0];
                setSelectedProductSummary({
                    productId: first.productId,
                    itemCode: first.itemCode,
                    productName: first.productName,
                    englishProductName: first.englishProductName,
                    brandName: first.brandName,
                    productManufacturer: first.productManufacturer,
                    specVersion: first.specVersion,
                    inboxQty: first.inboxQty,
                    inboxSize: first.inboxSize,
                    inboxType: first.inboxType,
                    outboxQty: first.outboxQty,
                    outboxSize: first.outboxSize,
                    outboxType: first.outboxType,
                    palletTotalProductQty: first.palletTotalProductQty
                });
            } else {
                // 고유 제품 수가 1개면 요약 표시, 복수면 null
                const uniqueProds = [...new Set(data.map(d => d.itemCode))];
                if (uniqueProds.length === 1 && data.length > 0) {
                    const first = data[0];
                    setSelectedProductSummary({
                        productId: first.productId,
                        itemCode: first.itemCode,
                        productName: first.productName,
                        englishProductName: first.englishProductName,
                        brandName: first.brandName,
                        productManufacturer: first.productManufacturer,
                        specVersion: first.specVersion,
                        inboxQty: first.inboxQty,
                        inboxSize: first.inboxSize,
                        inboxType: first.inboxType,
                        outboxQty: first.outboxQty,
                        outboxSize: first.outboxSize,
                        outboxType: first.outboxType,
                        palletTotalProductQty: first.palletTotalProductQty
                    });
                } else {
                    setSelectedProductSummary(null);
                }
            }
        } catch (error) {
            console.error('Failed to fetch product BOM summaries:', error);
            toast.error('제품별 포장재 BOM 목록 조회 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 제품 팝업 선택 핸들러
    const handleProductSelect = (product) => {
        setIsProductSearchOpen(false);
        if (!product) return;

        const newFilters = {
            ...filters,
            itemCode: product.itemCode || '',
            productName: product.productName || ''
        };
        setFilters(newFilters);
        fetchBomData(newFilters);
    };

    // 검색 초기화
    const handleReset = () => {
        const resetFilters = {
            itemCode: '',
            productName: '',
            keyword: '',
            bomType: '',
            latestOnly: true
        };
        setFilters(resetFilters);
        setSelectedProductSummary(null);
        fetchBomData(resetFilters);
    };

    // 엑셀(CSV) 내보내기
    const handleExportExcel = () => {
        if (gridRef.current && gridRef.current.api) {
            gridRef.current.api.exportDataAsCsv({
                fileName: `제품별_포장재_BOM_조회_${new Date().toISOString().slice(0, 10)}.csv`
            });
            toast.success('포장재 BOM 데이터를 CSV 파일로 내보냈습니다.');
        }
    };

    // 유형 카테고리 옵션 (DB 마스터 기반 동적 로딩)
    const typeOptions = useMemo(() => {
        if (categories && categories.length > 0) {
            return [...new Set(categories.map(c => c.mainType))];
        }
        return ['용기', '캡·펌프', '단상자·라벨', '인박스·아웃박스', '부속품'];
    }, [categories]);

    // 통계 요약 지표
    const summaryStats = useMemo(() => {
        const uniqueSkus = new Set(bomData.map(d => d.itemCode)).size;
        const totalItems = bomData.length;
        const multiLayerCount = bomData.filter(d => d.isMultiLayer).length;
        const singleLayerCount = totalItems - multiLayerCount;

        const typeCounts = bomData.reduce((acc, cur) => {
            const t = cur.type || '기타';
            acc[t] = (acc[t] || 0) + 1;
            return acc;
        }, {});

        return { uniqueSkus, totalItems, multiLayerCount, singleLayerCount, typeCounts };
    }, [bomData]);

    // AG Grid 컬럼 정의
    const columnDefs = useMemo(() => [
        {
            field: 'itemCode',
            headerName: '품목코드',
            pinned: 'left',
            width: 140,
            filter: 'agTextColumnFilter',
            cellStyle: { fontWeight: '700', color: '#1d4ed8' },
            cellRenderer: p => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{p.value}</span>
                </div>
            )
        },
        {
            field: 'productName',
            headerName: '제품명 (국문)',
            width: 220,
            filter: 'agTextColumnFilter',
            cellStyle: { fontWeight: '600' },
            tooltipField: 'productName'
        },
        {
            field: 'brandName',
            headerName: '브랜드',
            width: 120,
            filter: 'agTextColumnFilter',
            cellRenderer: p => p.value ? (
                <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '6px', 
                    fontSize: '11px', 
                    fontWeight: '600',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#475569'
                }}>
                    {p.value}
                </span>
            ) : '-'
        },
        {
            field: 'specVersion',
            headerName: '사양서 버전',
            width: 110,
            cellRenderer: p => (
                <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    fontSize: '11px', 
                    fontWeight: '700',
                    backgroundColor: '#eff6ff', 
                    color: '#2563eb',
                    border: '1px solid #bfdbfe'
                }}>
                    v{p.value || 1}
                </span>
            )
        },
        {
            field: 'bomCode',
            headerName: 'BOM 코드',
            width: 150,
            filter: 'agTextColumnFilter',
            cellStyle: { fontWeight: '700', color: '#0f766e' },
            cellRenderer: p => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', padding: '1px 6px', borderRadius: '4px' }}>
                        {p.value}
                    </span>
                </div>
            )
        },
        {
            field: 'componentName',
            headerName: '구성품명',
            width: 180,
            filter: 'agTextColumnFilter',
            cellStyle: { fontWeight: '600' }
        },
        {
            field: 'type',
            headerName: '유형',
            width: 120,
            filter: 'agTextColumnFilter',
            cellRenderer: p => {
                const val = p.value || '';
                let bg = '#f1f5f9';
                let color = '#475569';
                let border = '#cbd5e1';

                if (val.includes('용기')) {
                    bg = '#f0f9ff'; color = '#0369a1'; border = '#bae6fd';
                } else if (val.includes('캡') || val.includes('펌프')) {
                    bg = '#fdf4ff'; color = '#a21caf'; border = '#f5d0fe';
                } else if (val.includes('단상자') || val.includes('라벨')) {
                    bg = '#f0fdf4'; color = '#15803d'; border = '#bbf7d0';
                } else if (val.includes('박스')) {
                    bg = '#fffbeb'; color = '#b45309'; border = '#fef3c7';
                }

                return (
                    <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: bg,
                        color: color,
                        border: `1px solid ${border}`
                    }}>
                        {val || '-'}
                    </span>
                );
            }
        },
        {
            field: 'detailedType',
            headerName: '세부유형',
            width: 130,
            filter: 'agTextColumnFilter'
        },
        {
            field: 'detailedMaterial',
            headerName: '재질 상세 (PPWR)',
            width: 170,
            valueGetter: p => p.data?.detailedMaterial || p.data?.material || '-',
            cellRenderer: p => (
                <span style={{ fontWeight: '500', color: '#334155' }}>
                    {p.value}
                </span>
            )
        },
        {
            field: 'isMultiLayer',
            headerName: '구조 (단일/다층)',
            width: 130,
            cellRenderer: p => (
                <span style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: p.value ? '#fef2f2' : '#f0fdf4',
                    color: p.value ? '#b91c1c' : '#15803d',
                    border: `1px solid ${p.value ? '#fecaca' : '#bbf7d0'}`
                }}>
                    {p.value ? '다층구조(복합)' : '단일재질(재활용용이)'}
                </span>
            )
        },
        {
            field: 'weight',
            headerName: '중량(g)',
            width: 100,
            type: 'numericColumn',
            valueFormatter: p => p.value != null ? `${Number(p.value).toLocaleString()}g` : '-'
        },
        {
            field: 'thickness',
            headerName: '두께(μm)',
            width: 110,
            type: 'numericColumn',
            valueFormatter: p => p.value != null ? `${Number(p.value).toLocaleString()}μm` : '-'
        },
        {
            field: 'specification',
            headerName: '포장재 규격',
            width: 160
        },
        {
            field: 'usageCount',
            headerName: '소요량',
            width: 90,
            type: 'numericColumn',
            valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '1'
        },
        {
            field: 'bomManufacturer',
            headerName: '포장재 제조사',
            width: 140,
            filter: 'agTextColumnFilter'
        },
        {
            field: 'inboxQty',
            headerName: '인박스 입수량',
            width: 120,
            type: 'numericColumn',
            valueFormatter: p => p.value ? `${Number(p.value).toLocaleString()}개` : '-'
        },
        {
            field: 'inboxSize',
            headerName: '인박스 규격(mm)',
            width: 140
        },
        {
            field: 'outboxQty',
            headerName: '아웃박스 입수량',
            width: 130,
            type: 'numericColumn',
            valueFormatter: p => p.value ? `${Number(p.value).toLocaleString()}개` : '-'
        },
        {
            field: 'outboxSize',
            headerName: '아웃박스 규격(mm)',
            width: 150
        },
        {
            field: 'palletTotalProductQty',
            headerName: '팔레트 낱개 수량',
            width: 130,
            type: 'numericColumn',
            valueFormatter: p => p.value ? `${Number(p.value).toLocaleString()}개` : '-'
        },
        {
            headerName: '성적서 (MSDS/RoHS)',
            width: 150,
            pinned: 'right',
            cellRenderer: p => (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span 
                        title="EU PPWR 및 글로벌 화학물질 규제 대응 성적서 첨부 준비 중"
                        style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            backgroundColor: '#f1f5f9',
                            color: '#64748b',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                            fontWeight: '600'
                        }}
                    >
                        📑 준비중
                    </span>
                    {p.data?.imagePath && (
                        <button
                            type="button"
                            onClick={() => setPreviewPhoto(p.data.imagePath)}
                            style={{
                                padding: '2px 6px',
                                fontSize: '11px',
                                backgroundColor: '#f0f9ff',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                            title="실물 사진 미리보기"
                        >
                            📷 사진
                        </button>
                    )}
                </div>
            )
        }
    ], []);

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}>
            {/* 1. 상단 타이틀 & 글로벌 액션 바 */}
            <div style={{
                marginBottom: '16px',
                padding: '20px 24px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                            📦 제품코드별 포장재 조회
                        </h2>
                        <span style={{
                            padding: '3px 10px',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '700',
                            border: '1px solid #dbeafe'
                        }}>
                            EU PPWR 포장재 규제 대응
                        </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        제품코드별 포장사양서에 등록된 구성품 BOM 목록 및 입수량, 재질, 규격을 실시간으로 통합 조회합니다.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '9px 16px',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        📥 엑셀(CSV) 다운로드
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        style={{
                            padding: '9px 14px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        ♻️ 초기화
                    </button>
                </div>
            </div>

            {/* 2. 제품 검색 및 다차원 필터 바 */}
            <div style={{
                marginBottom: '16px',
                padding: '18px 24px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(320px, 1.8fr) minmax(200px, 1.2fr) minmax(160px, 1fr) auto auto',
                    gap: '16px',
                    alignItems: 'flex-end'
                }}>
                    {/* [제품코드 돋보기 제품명 형태] (사용자 지정 필수 UI 패턴) */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>
                            📦 제품코드 & 제품명
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                                type="text"
                                placeholder="제품코드"
                                value={filters.itemCode}
                                onChange={e => setFilters({ ...filters, itemCode: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && fetchBomData()}
                                style={{
                                    width: '120px',
                                    padding: '8px 10px',
                                    fontSize: '13px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setIsProductSearchOpen(true)}
                                title="제품 선택 팝업"
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                🔍
                            </button>
                            <input
                                type="text"
                                placeholder="제품명 (돋보기로 선택)"
                                value={filters.productName}
                                readOnly
                                style={{
                                    flex: 1,
                                    padding: '8px 10px',
                                    fontSize: '13px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    backgroundColor: '#f8fafc',
                                    color: '#475569',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {(filters.itemCode || filters.productName) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const cleared = { ...filters, itemCode: '', productName: '' };
                                        setFilters(cleared);
                                        fetchBomData(cleared);
                                    }}
                                    title="제품 선택 해제"
                                    style={{
                                        padding: '7px 9px',
                                        backgroundColor: '#fee2e2',
                                        border: '1px solid #fca5a5',
                                        color: '#ef4444',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '800'
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 통합 키워드 검색 (토너, 크림 등 제품명 및 BOM 자유 검색) */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>
                            🔍 키워드 통합 검색 (제품명/BOM/브랜드)
                        </label>
                        <input
                            type="text"
                            placeholder="예: 토너, 용기, 아누아 등"
                            value={filters.keyword}
                            onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && fetchBomData()}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '13px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* BOM 유형 셀렉트 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>
                            📂 포장재 유형
                        </label>
                        <select
                            value={filters.bomType}
                            onChange={e => {
                                const newFilters = { ...filters, bomType: e.target.value };
                                setFilters(newFilters);
                                fetchBomData(newFilters);
                            }}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '13px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                backgroundColor: '#ffffff',
                                height: '37px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="">전체 유형</option>
                            {typeOptions.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* 최신 사양서 토글 */}
                    <div style={{ display: 'flex', alignItems: 'center', height: '37px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '700',
                            color: '#334155',
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}>
                            <input
                                type="checkbox"
                                checked={filters.latestOnly}
                                onChange={e => {
                                    const newFilters = { ...filters, latestOnly: e.target.checked };
                                    setFilters(newFilters);
                                    fetchBomData(newFilters);
                                }}
                                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                            />
                            최신 사양서만 보기
                        </label>
                    </div>

                    {/* 조회 버튼 */}
                    <div>
                        <button
                            type="button"
                            onClick={() => fetchBomData()}
                            disabled={loading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '9px 24px',
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer',
                                height: '37px',
                                opacity: loading ? 0.7 : 1,
                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                            }}
                        >
                            {loading ? '⏳ 조회 중...' : '🔍 검색'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. 단일 제품 선택 시: 마스터-디테일 사양서 핵심 요약 배너 */}
            {selectedProductSummary && (
                <div style={{
                    marginBottom: '16px',
                    padding: '16px 20px',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #bfdbfe',
                    background: 'linear-gradient(135deg, #f0fdfa 0%, #eff6ff 100%)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                                padding: '4px 10px',
                                backgroundColor: '#2563eb',
                                color: '#fff',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '800'
                            }}>
                                {selectedProductSummary.itemCode}
                            </span>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
                                {selectedProductSummary.productName}
                            </span>
                            {selectedProductSummary.brandName && (
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                                    ({selectedProductSummary.brandName})
                                </span>
                            )}
                            <span style={{
                                padding: '2px 8px',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: '700'
                            }}>
                                사양서 v{selectedProductSummary.specVersion || 1}
                            </span>
                        </div>
                        {selectedProductSummary.productManufacturer && (
                            <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                                🏭 제조사: {selectedProductSummary.productManufacturer}
                            </span>
                        )}
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        fontSize: '12px'
                    }}>
                        <div style={{ backgroundColor: '#fff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div style={{ color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>📦 인박스 정보</div>
                            <div style={{ color: '#0f172a', fontWeight: '800' }}>
                                입수량: <span style={{ color: '#2563eb' }}>{selectedProductSummary.inboxQty ? `${selectedProductSummary.inboxQty}개` : '없음'}</span>
                            </div>
                            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                                규격: {selectedProductSummary.inboxSize || '-'} {selectedProductSummary.inboxType ? `(${selectedProductSummary.inboxType})` : ''}
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#fff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div style={{ color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>🚚 아웃박스 정보</div>
                            <div style={{ color: '#0f172a', fontWeight: '800' }}>
                                입수량: <span style={{ color: '#2563eb' }}>{selectedProductSummary.outboxQty ? `${selectedProductSummary.outboxQty}개` : '없음'}</span>
                            </div>
                            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                                규격: {selectedProductSummary.outboxSize || '-'} {selectedProductSummary.outboxType ? `(${selectedProductSummary.outboxType})` : ''}
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#fff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div style={{ color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>📐 팔레트 적재</div>
                            <div style={{ color: '#0f172a', fontWeight: '800' }}>
                                총 수량: <span style={{ color: '#16a34a' }}>{selectedProductSummary.palletTotalProductQty ? `${selectedProductSummary.palletTotalProductQty.toLocaleString()}개` : '-'}</span>
                            </div>
                            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                                등록 포장재 수: {bomData.length}종
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. 통계 요약 바 */}
            <div style={{
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 4px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>
                    <div>
                        조회된 제품: <span style={{ color: '#2563eb', fontWeight: '800' }}>{summaryStats.uniqueSkus}</span>개 품목
                    </div>
                    <div style={{ color: '#cbd5e1' }}>|</div>
                    <div>
                        포장재 BOM: <span style={{ color: '#059669', fontWeight: '800' }}>{summaryStats.totalItems}</span>건
                    </div>
                    <div style={{ color: '#cbd5e1' }}>|</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                        단일재질 {summaryStats.singleLayerCount}건 / 복합재질 {summaryStats.multiLayerCount}건
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                    {Object.entries(summaryStats.typeCounts).slice(0, 4).map(([t, count]) => (
                        <span key={t} style={{
                            padding: '2px 8px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#475569'
                        }}>
                            {t}: {count}
                        </span>
                    ))}
                </div>
            </div>

            {/* 5. AG Grid 데이터 영역 (플랫 그리드) */}
            <div style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                minHeight: '400px'
            }}>
                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                    <AgGridReact
                        ref={gridRef}
                        theme="legacy"
                        rowData={bomData}
                        columnDefs={columnDefs}
                        rowHeight={48}
                        headerHeight={44}
                        animateRows={true}
                        domLayout="normal"
                        pagination={true}
                        paginationPageSize={50}
                        overlayLoadingTemplate='<span class="ag-overlay-loading-center">데이터를 불러오는 중입니다...</span>'
                        overlayNoRowsTemplate='<span class="ag-overlay-loading-center">조회된 포장재 BOM 데이터가 없습니다. 검색 조건을 확인해주세요.</span>'
                    />
                </div>
            </div>

            {/* 제품 선택 팝업 */}
            {isProductSearchOpen && (
                <ProductSearchPopup
                    onClose={() => setIsProductSearchOpen(false)}
                    onSelect={handleProductSelect}
                />
            )}

            {/* 부자재 사진 미리보기 모달 */}
            {previewPhoto && (
                <CommonFilePreviewModal
                    fileUrl={previewPhoto}
                    fileName="포장재 실물 사진"
                    onClose={() => setPreviewPhoto(null)}
                />
            )}
        </div>
    );
};

export default ProductBomInquiryPage;
