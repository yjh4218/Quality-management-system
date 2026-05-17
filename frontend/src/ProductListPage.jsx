import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import ProductDrawer from './ProductDrawer';
import * as api from './api';
import ProductSearchPopup from './ProductSearchPopup';
import { usePermissions } from './usePermissions';

const ProductListPage = ({ user, navigationData, onNavigated }) => {
    const defaultPageSize = 100;
    const { canView, canEdit: canEditProduct, hasPerm } = usePermissions(user);
    const gridRef = useRef(null);
    const [rowData, setRowData] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchFields, setSearchFields] = useState({
        itemCode: '',
        productName: '',
        brand: '',
        manufacturer: '',
        ingredients: ''
    });
    const [showOnlyMaster, setShowOnlyMaster] = useState(false);
    const [showSearchPopup, setShowSearchPopup] = useState(false);

    const canEdit = canEditProduct('products');
    const canViewPackaging = hasPerm('PRODUCT_PACKAGING_VIEW');

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const hasFetchedOnMount = useRef(false);
    useEffect(() => {
        if (hasFetchedOnMount.current) return;
        hasFetchedOnMount.current = true;
        fetchProducts(0);
    }, []);

    const lastNavData = useRef(undefined);
    useEffect(() => {
        if (lastNavData.current === navigationData) return;
        lastNavData.current = navigationData;

        if (navigationData && navigationData.id) {
            handleAutoOpen(navigationData.id);
            if (onNavigated) onNavigated();
        }
    }, [navigationData]);

    const handleAutoOpen = async (id) => {
        try {
            const response = await api.getProductById(id);
            setSelectedProduct(response.data);
            setIsDrawerOpen(true);
        } catch (error) {
            // Auto-open silent fail
        }
    };

    const fetchProducts = async (pageNum = 0) => {
        try {
            const response = await api.searchProducts({ ...searchFields, page: pageNum, size: defaultPageSize });
            setRowData(response.data.content || []);
            setTotalPages(response.data.totalPages || 1);
            setPage(pageNum);
        } catch (error) {
            alert("제품 목록을 불러오지 못했습니다.");
        }
    };

    const handleSearchClick = () => {
        fetchProducts(0);
    };

    const filteredRowData = useMemo(() => {
        if (!showOnlyMaster) return rowData;
        return rowData.filter(p => p.isMaster);
    }, [rowData, showOnlyMaster]);

    const handleExportExcel = async () => {
        if (!rowData || rowData.length === 0) {
            alert("조회 내역이 없습니다.");
            return;
        }
        try {
            const response = await api.exportProductsExcel(searchFields);
            api.downloadBlob(response, "ProductMaster_Export.xlsx");
        } catch (error) {
            alert("엑셀 다운로드 중 오류가 발생했습니다.");
        }
    };

    const handleRowClick = (event) => {
        setSelectedProduct(event.data);
        setIsDrawerOpen(true);
    };

    const handleCreateNew = () => {
        setSelectedProduct(null);
        setIsDrawerOpen(true);
    };

    const colDefs = useMemo(() => [
        { field: "brandName", headerName: "브랜드", filter: true, width: 140, pinned: 'left' },
        {
            field: "productType",
            headerName: "제품구분",
            filter: true,
            width: 120,
            pinned: 'left',
            valueGetter: (params) => {
                if (params.data?.productType) return params.data.productType;
                return params.data?.isPlanningSet ? '기획세트' : '단품';
            }
        },
        {
            field: "itemCode",
            headerName: "품목코드",
            filter: true,
            width: 140,
            pinned: 'left',
            cellRenderer: p => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{p.value}</span>
                    {p.data?.isMaster && (
                        <span style={{
                            background: '#004085',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }} title="마스터 제품">M</span>
                    )}
                </div>
            )
        },
        {
            field: "productName",
            headerName: "제품명(한글)",
            filter: true,
            width: 250,
            pinned: 'left'
        },
        { field: "englishProductName", headerName: "제품명(영문)", filter: true, flex: 1, minWidth: 250 },
        { field: "manufacturerName", headerName: "제조사", filter: true, width: 130 },
        { field: "shelfLifeMonths", headerName: "사용기한(개월)", width: 120, filter: true, valueFormatter: p => p.value ? p.value + '개월' : '' },
        {
            field: "ingredients",
            headerName: "전성분",
            filter: true,
            width: 250
        },

        {
            headerName: '제품 체적',
            children: [
                { field: "dimensionsStatus", headerName: "상태", width: 110, cellRenderer: p => p.value === '확정' ? '✅ 확정' : '📝 가안' },
                { field: "width", headerName: "W", width: 90, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "length", headerName: "L", width: 90, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "height", headerName: "H", width: 90, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "weight", headerName: "무게(g)", width: 110, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' }
            ]
        },
        {
            headerName: '인박스',
            children: [
                { field: "inboxQuantity", headerName: "수량(ea)", width: 110, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "inboxWeight", headerName: "무게(kg)", width: 110, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' }
            ]
        },
        {
            headerName: '아웃박스',
            children: [
                { field: "outboxQuantity", headerName: "수량(ea)", width: 110, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "outboxWeight", headerName: "무게(kg)", width: 110, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' }
            ]
        },
        {
            headerName: '팔레트',
            children: [
                { field: "palletQuantity", headerName: "적재 수량", width: 120, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' }
            ]
        },
        {
            headerName: '포장재 재질 및 무게',
            children: [
                { field: "materialBody", headerName: "용기 재질", width: 120 },
                { field: "weightBody", headerName: "용기 무게(g)", width: 120, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "materialLabel", headerName: "라벨 재질", width: 120 },
                { field: "weightLabel", headerName: "라벨 무게(g)", width: 120, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "materialCap", headerName: "캡/뚜껑 재질", width: 120 },
                { field: "weightCap", headerName: "캡/뚜껑 무게(g)", width: 130, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "materialSealing", headerName: "실링/리드 재질", width: 150 },
                { field: "weightSealing", headerName: "실링 등 무게(g)", width: 140, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "materialPump", headerName: "펌프/드롭퍼 재질", width: 150 },
                { field: "weightPump", headerName: "펌프 등 무게(g)", width: 140, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "materialOuterBox", headerName: "단상자 재질", width: 120 },
                { field: "weightOuterBox", headerName: "단상자 무게(g)", width: 130, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "materialTool", headerName: "도구가이드 재질", width: 140 },
                { field: "weightTool", headerName: "도구 무게(g)", width: 120, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "materialPacking", headerName: "박킹 재질", width: 120 },
                { field: "weightPacking", headerName: "박킹 무게(g)", width: 120, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
                { field: "materialEtc", headerName: "기타 재질", width: 120 },
                { field: "weightEtc", headerName: "기타 무게(g)", width: 120, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' }
            ]
        },
        {
            headerName: '포장재 제조사',
            children: [
                { field: "manufacturerContainer", headerName: "용기 부자재 제조사", width: 160 },
                { field: "manufacturerLabel", headerName: "라벨/스티커 제조사", width: 160 },
                { field: "manufacturerOuterBox", headerName: "단상자 제조사", width: 140 },
                { field: "manufacturerEtc", headerName: "기타부자재 제조사", width: 150 },
                { field: "materialRemarks", headerName: "비고 (OTHER 상세)", width: 180 }
            ]
        }
    ].filter(col => {
        if (!canViewPackaging && (col.headerName === '포장재 재질 및 무게' || col.headerName === '포장재 제조사')) {
            return false;
        }
        return true;
    }), [canViewPackaging]);

    const getRowStyle = (params) => {
        const p = params.data;
        if (!p) return null;

        let style = {};
        const missingFields = [];
        if (!p.brandName) missingFields.push("브랜드");
        if (!p.manufacturerName) missingFields.push("제조사");
        if (!p.recycleGrade) missingFields.push("재활용등급");

        if (missingFields.length > 0) {
            style.backgroundColor = '#fff4f4';
        }

        if (p.isMaster) {
            style.backgroundColor = style.backgroundColor ? style.backgroundColor : '#f4fbff';
            style.fontWeight = '600';
            style.color = '#004085';
        }

        return Object.keys(style).length > 0 ? style : null;
    };

    // Responsive height for mobile/desktop
    const isMobile = window.innerWidth <= 768;
    const containerStyle = {
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: isMobile ? '700px' : 'auto', /* Ensure enough space for filter + grid */
        overflow: 'hidden'
    };

    /** 
     * Modified Header with .page-header class 
     */
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
                            📦 제품코드 마스터
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleCreateNew}
                            className="primary"
                            style={{ padding: '10px 24px', fontWeight: 'bold', backgroundColor: '#4f46e5', opacity: canEdit ? 1 : 0.5, cursor: canEdit ? 'pointer' : 'not-allowed' }}
                            disabled={!canEdit}
                        >
                            + 신규 제품 등록
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
                        전체 제품의 마스터 정보를 관리하고 상세 스펙 및 인증 서류를 확인합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setShowOnlyMaster(!showOnlyMaster)}
                            className="outline"
                            style={{
                                border: `1px solid ${showOnlyMaster ? '#ef4444' : '#f59e0b'}`,
                                backgroundColor: showOnlyMaster ? '#fef2f2' : '#fffbeb',
                                color: showOnlyMaster ? '#dc2626' : '#b45309',
                                fontWeight: 'bold'
                            }}
                        >
                            {showOnlyMaster ? '👀 전체 조회' : '⭐ 마스터 조회'}
                        </button>
                        {canView('products') && (
                            <button
                                onClick={handleExportExcel}
                                className="outline"
                                style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                            >
                                📊 결과 다운로드
                            </button>
                        )}
                        <button
                            className="primary"
                            onClick={handleSearchClick}
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            🔍 조회
                        </button>
                        <button
                            className="outline"
                            onClick={() => setSearchFields({ itemCode: '', productName: '', brand: '', manufacturer: '', ingredients: '' })}
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

                    {/* 1. 품목코드 (ID/고유번호 개념) */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🏷️ 품목코드</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input
                                type="text"
                                placeholder="코드 검색"
                                value={searchFields.itemCode}
                                onChange={(e) => setSearchFields({ ...searchFields, itemCode: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                            />
                            <button type="button" onClick={() => setShowSearchPopup(true)} style={{ padding: '0 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }} title="품목 상세 검색">🔍</button>
                        </div>
                    </div>

                    {/* 2. 제품명 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>📦 제품명</label>
                        <input
                            type="text"
                            placeholder="제품명 검색"
                            value={searchFields.productName}
                            onChange={(e) => setSearchFields({ ...searchFields, productName: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        />
                    </div>

                    {/* 3. 브랜드 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>✨ 브랜드</label>
                        <input
                            type="text"
                            placeholder="브랜드 검색"
                            value={searchFields.brand}
                            onChange={(e) => setSearchFields({ ...searchFields, brand: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        />
                    </div>

                    {/* 4. 제조사 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🏭 제조사명</label>
                        <input
                            type="text"
                            placeholder="제조사 검색"
                            value={searchFields.manufacturer}
                            onChange={(e) => setSearchFields({ ...searchFields, manufacturer: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        />
                    </div>

                    {/* 5. 전성분 (기타) */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🧪 전성분</label>
                        <input
                            type="text"
                            placeholder="전성분 검색"
                            value={searchFields.ingredients}
                            onChange={(e) => setSearchFields({ ...searchFields, ingredients: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        />
                    </div>
                </div>
            </div>

            <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', minHeight: 0 }}>
                <AgGridReact theme="legacy"
                    rowHeight={50}
                    ref={gridRef}
                    rowData={filteredRowData}
                    columnDefs={colDefs}
                    onRowDoubleClicked={handleRowClick}
                    pagination={false}
                    rowSelection="multiple"
                    animateRows={true}
                    getRowStyle={getRowStyle}
                />
            </div>

            {/* Custom Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                <button
                    onClick={() => fetchProducts(page - 1)}
                    disabled={page === 0}
                    style={{ padding: '6px 12px', border: '1px solid #ced4da', background: page === 0 ? '#e9ecef' : '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
                >
                    ◀ 이전
                </button>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
                    {page + 1} / {totalPages === 0 ? 1 : totalPages}
                </span>
                <button
                    onClick={() => fetchProducts(page + 1)}
                    disabled={page >= totalPages - 1}
                    style={{ padding: '6px 12px', border: '1px solid #ced4da', background: page >= totalPages - 1 ? '#e9ecef' : '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
                >
                    다음 ▶
                </button>
            </div>

            {isDrawerOpen && (
                <ProductDrawer
                    product={selectedProduct}
                    user={user}
                    onClose={(saved) => {
                        setIsDrawerOpen(false);
                        if (saved === true) {
                            fetchProducts();
                        }
                    }}
                />
            )}

            {showSearchPopup && (
                <ProductSearchPopup
                    onClose={() => setShowSearchPopup(false)}
                    onSelect={(p) => {
                        setSearchFields({ ...searchFields, itemCode: p.itemCode, productName: p.productName });
                        setShowSearchPopup(false);
                    }}
                />
            )}
        </div>
    );
};

export default ProductListPage;
