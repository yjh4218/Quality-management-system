import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { searchProducts, getBrands, getManufacturers } from './api';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import ChartCard from './components/dashboard/ChartCard';
import DataGrid from './components/common/DataGrid';

const ProductDashboardPage = ({ user, onNavigate }) => {
    const gridRef = useRef();
    const [products, setProducts] = useState([]);
    const [brands, setBrands] = useState([]);
    const [manufacturers, setManufacturers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [itemCode, setItemCode] = useState('');
    const [productName, setProductName] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [selectedManufacturer, setSelectedManufacturer] = useState('');

    const [stats, setStats] = useState({
        total: 0,
        normalCount: 0,
        specialPackCount: 0,
        activeCount: 0,
        brandDist: [],
        channelDist: []
    });

    const isManufacturer = user?.roles?.some(r => r.authority === 'ROLE_MANUFACTURER');

    // Load Filter Options
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [brandRes, manuRes] = await Promise.all([getBrands(), getManufacturers()]);
                setBrands(brandRes.data || []);
                setManufacturers(manuRes.data || []);
            } catch (err) {
                console.error("Filter loading failed", err);
            }
        };
        fetchFilters();
    }, []);

    const calculateStats = (productList) => {
        const total = productList.length;
        let normalCount = 0;
        let specialPackCount = 0;
        let activeCount = 0;

        const brandMap = {};
        const channelMap = {};

        productList.forEach(p => {
            if (p.isDeleted) return; // Soft deleted 제외
            activeCount++;

            // 마스터 유형
            if (p.specialPack === true || p.itemCode?.startsWith('SP')) {
                specialPackCount++;
            } else {
                normalCount++;
            }

            // 브랜드 분포
            const bName = p.brand?.name || '기타';
            brandMap[bName] = (brandMap[bName] || 0) + 1;

            // 채널 분포
            if (p.channelNames && p.channelNames.length > 0) {
                p.channelNames.forEach(ch => {
                    channelMap[ch] = (channelMap[ch] || 0) + 1;
                });
            } else {
                channelMap['미정'] = (channelMap['미정'] || 0) + 1;
            }
        });

        const brandDist = Object.entries(brandMap).map(([name, value]) => ({ name, value }));
        const channelDist = Object.entries(channelMap).map(([name, value]) => ({ name, value }));

        setStats({
            total,
            normalCount,
            specialPackCount,
            activeCount,
            brandDist,
            channelDist
        });
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                itemCode,
                productName,
                brand: selectedBrand,
                manufacturer: isManufacturer ? user?.companyName : selectedManufacturer,
                page: 0,
                size: 1000
            };
            const res = await searchProducts(params);
            const list = res.data?.content || [];
            setProducts(list);
            calculateStats(list);
        } catch (error) {
            console.error("Failed to load products dashboard", error);
        } finally {
            setLoading(false);
        }
    }, [itemCode, productName, selectedBrand, selectedManufacturer, isManufacturer, user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSearch = () => loadData();
    const handleReset = () => {
        setItemCode('');
        setProductName('');
        setSelectedBrand('');
        setSelectedManufacturer('');
    };

    const columnDefs = useMemo(() => [
        { field: 'itemCode', headerName: '품목코드', width: 140, cellClass: 'text-center' },
        { 
            field: 'productName', 
            headerName: '품목명(국문)', 
            flex: 1.5, 
            cellClass: 'text-left',
            cellRenderer: (params) => {
                const createdAt = params.data.createdAt;
                // 최근 7일 내 등록 체크
                const isNew = createdAt && (new Date() - new Date(createdAt)) < 7 * 24 * 60 * 60 * 1000;
                return (
                    <span className="flex items-center gap-1.5 font-medium">
                        {params.value}
                        {isNew && (
                            <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                N
                            </span>
                        )}
                    </span>
                );
            }
        },
        { field: 'brand.name', headerName: '브랜드', width: 130, cellClass: 'text-left' },
        { field: 'manufacturer.name', headerName: '제조사', width: 140, cellClass: 'text-left' },
        { 
            field: 'specialPack', 
            headerName: '구분', 
            width: 100,
            cellClass: 'text-center',
            valueGetter: (params) => params.data.specialPack ? '기획세트' : '단품'
        },
        { 
            field: 'channelNames', 
            headerName: '유통 채널', 
            width: 180,
            cellClass: 'text-left',
            valueGetter: (params) => params.data.channelNames?.join(', ') || '-'
        }
    ], []);

    const filterFields = [
        { label: '품목코드', type: 'text', value: itemCode, onChange: e => setItemCode(e.target.value), icon: '🏷️', placeholder: '코드 검색' },
        { label: '품목명', type: 'text', value: productName, onChange: e => setProductName(e.target.value), icon: '📦', placeholder: '품목명 검색' },
        { 
            label: '브랜드', 
            type: 'select', 
            value: selectedBrand, 
            onChange: e => setSelectedBrand(e.target.value), 
            icon: '✨', 
            options: [
                { label: '전체', value: '' },
                ...brands.map(b => ({ label: b.name, value: b.name }))
            ]
        },
        ...(!isManufacturer ? [{
            label: '제조사',
            type: 'select',
            value: selectedManufacturer,
            onChange: e => setSelectedManufacturer(e.target.value),
            icon: '🏭',
            options: [
                { label: '전체', value: '' },
                ...manufacturers.map(m => ({ label: m.name, value: m.name }))
            ]
        }] : [])
    ];

    // 미분류 브랜드 개수 및 필터 연동 함수
    const unclassifiedBrandCount = useMemo(() => {
        return products.filter(p => !p.brand || !p.brand.name || p.brand.name === '기타').length;
    }, [products]);

    const unclassifiedChannelCount = useMemo(() => {
        return products.filter(p => !p.channelNames || p.channelNames.length === 0 || p.channelNames.includes('미정')).length;
    }, [products]);

    // 최근 7일 이내 등록 품목
    const recentProducts = useMemo(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return products.filter(p => {
            if (!p.createdAt) return false;
            return new Date(p.createdAt) >= sevenDaysAgo;
        }).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    }, [products]);

    const handleFilterClick = (type) => {
        if (!gridRef.current || !gridRef.current.api) return;
        
        // AG Grid 필터 적용
        if (type === 'brand') {
            gridRef.current.api.setFilterModel({
                'brand.name': {
                    filterType: 'text',
                    type: 'equals',
                    filter: '기타'
                }
            });
        } else if (type === 'channel') {
            gridRef.current.api.setFilterModel({
                'channelNames': {
                    filterType: 'text',
                    type: 'contains',
                    filter: '미정'
                }
            });
        }
        gridRef.current.api.onFilterChanged();
    };

    const summaryCards = [
        { icon: '📦', label: '전체 등록 품목', value: `${stats.total}개` },
        { icon: '🟡', label: '미분류 브랜드 (클릭)', value: `${unclassifiedBrandCount}개`, valueColor: '#d97706', onClick: () => handleFilterClick('brand'), style: { cursor: 'pointer' } },
        { icon: '🟠', label: '미분류 채널 (클릭)', value: `${unclassifiedChannelCount}개`, valueColor: '#e11d48', onClick: () => handleFilterClick('channel'), style: { cursor: 'pointer' } },
        { icon: '✔️', label: '활성 품목 수', value: `${stats.activeCount}개`, valueColor: '#10b981' }
    ];

    return (
        <AnalyticsDashboardShell
            icon="🏷️"
            title="품목코드 마스터 대시보드"
            subtitle="등록된 품목 마스터의 채널별, 브랜드별 현황 실시간 집계"
            backTo="products"
            backLabel="품목 관리로 돌아가기"
            onDownloadReport={() => alert("통계 다운로드 준비 중입니다.")}
            onNavigate={onNavigate}
        >
            {/* 필터바 */}
            <DashboardFilterBar 
                fields={filterFields}
                onSearch={handleSearch}
                onReset={handleReset}
            />

            {/* 통계 요약 */}
            <SummaryCardRow cards={summaryCards} />

            {/* 차트 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                <ChartCard 
                    title="브랜드별 품목 보유 현황"
                    type="bar"
                    data={stats.brandDist}
                    dataKey="value"
                    nameKey="name"
                    emptyThreshold={1}
                />
                <ChartCard 
                    title="유통 채널별 품목 분포"
                    type="donut"
                    data={stats.channelDist}
                    dataKey="value"
                    nameKey="name"
                    emptyThreshold={1}
                />
            </div>

            {/* 최근 등록 품목 리스트 위젯 */}
            <div style={{
                padding: '20px 24px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                boxSizing: 'border-box',
                marginBottom: '16px'
            }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                    🆕 최근 7일 내 등록된 품목 마스터 (최대 5건)
                </h3>
                {recentProducts.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                        최근 7일 내 등록된 신규 품목이 없습니다.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        {recentProducts.map((p, index) => (
                            <div key={index} style={{ display: 'flex', flexDirection: 'column', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#166534' }}>{p.productName}</span>
                                <span style={{ fontSize: '11px', color: '#15803d' }}>{p.itemCode} | {p.brand?.name || '기타'}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 품목 리스트 그리드 */}
            <div style={{
                padding: '20px 24px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '450px'
            }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                    📋 품목 마스터 상세 내역
                </h3>
                <DataGrid
                    ref={gridRef}
                    rowData={products}
                    columnDefs={columnDefs}
                    paginationPageSize={50}
                />
            </div>
        </AnalyticsDashboardShell>
    );
};

export default ProductDashboardPage;
