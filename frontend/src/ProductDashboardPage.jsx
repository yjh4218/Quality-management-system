import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { searchProducts, getBrands, getManufacturers } from './api';
import { AgGridReact } from 'ag-grid-react';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import ChartCard from './components/dashboard/ChartCard';

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
        { field: 'itemCode', headerName: '품목코드', width: 140, filter: true },
        { field: 'productName', headerName: '품목명(국문)', flex: 1.5, filter: true },
        { field: 'brand.name', headerName: '브랜드', width: 130, filter: true },
        { field: 'manufacturer.name', headerName: '제조사', width: 140, filter: true },
        { 
            field: 'specialPack', 
            headerName: '구분', 
            width: 100,
            valueGetter: (params) => params.data.specialPack ? '기획세트' : '단품'
        },
        { 
            field: 'channelNames', 
            headerName: '유통 채널', 
            width: 180,
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

    const summaryCards = [
        { icon: '📦', label: '전체 등록 품목', value: `${stats.total}개` },
        { icon: '🟢', label: '단품 마스터 수', value: `${stats.normalCount}개` },
        { icon: '🎁', label: '기획세트(SP) 수', value: `${stats.specialPackCount}개`, valueColor: '#8b5cf6' },
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
                    📋 품목 마스터 상세 내역 (검색결과: {products.length}건)
                </h3>
                <div className="ag-theme-alpine" style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <AgGridReact 
                        rowData={products}
                        columnDefs={columnDefs}
                        pagination={true}
                        paginationPageSize={15}
                        defaultColDef={{
                            sortable: true,
                            resizable: true,
                            filter: true,
                            floatingFilter: true,
                            flex: 1
                        }}
                    />
                </div>
            </div>
        </AnalyticsDashboardShell>
    );
};

export default ProductDashboardPage;
