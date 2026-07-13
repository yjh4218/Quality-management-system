import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getInboundData, getManufacturers } from './api';
import { AgGridReact } from 'ag-grid-react';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import ChartCard from './components/dashboard/ChartCard';

const QualityDashboardPage = ({ user, onNavigate }) => {
    const gridRef = useRef();
    const [inbounds, setInbounds] = useState([]);
    const [manufacturers, setManufacturers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [itemCode, setItemCode] = useState('');
    const [productName, setProductName] = useState('');
    const [selectedManufacturer, setSelectedManufacturer] = useState('');

    const [stats, setStats] = useState({
        total: 0,
        completedCount: 0, // 판정 완료
        pendingCount: 0,   // 검사 대기
        unfitCount: 0,     // 부적합
        manufacturerDist: [],
        statusDist: []
    });

    const isManufacturer = user?.roles?.some(r => r.authority === 'ROLE_MANUFACTURER');

    // Load Filter Options
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const manuRes = await getManufacturers();
                setManufacturers(manuRes.data || []);
            } catch (err) {
                console.error("Filter loading failed", err);
            }
        };
        if (!isManufacturer) {
            fetchFilters();
        }
    }, [isManufacturer]);

    const calculateStats = (list) => {
        const total = list.length;
        let completedCount = 0;
        let pendingCount = 0;
        let unfitCount = 0;

        const manuMap = {};
        const statusMap = { '판정대기': 0, '적합': 0, '부적합': 0 };

        list.forEach(item => {
            // 판정 상태 집계 (검사 적합여부)
            const result = item.inspectionResult || '대기';
            if (result === '적합' || result === 'PASS') {
                completedCount++;
                statusMap['적합']++;
            } else if (result === '부적합' || result === 'FAIL') {
                unfitCount++;
                statusMap['부적합']++;
            } else {
                pendingCount++;
                statusMap['판정대기']++;
            }

            // 제조사 분포
            const mName = item.manufacturer || '기타';
            manuMap[mName] = (manuMap[mName] || 0) + 1;
        });

        const manufacturerDist = Object.entries(manuMap).map(([name, value]) => ({ name, value }));
        const statusDist = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        setStats({
            total,
            completedCount,
            pendingCount,
            unfitCount,
            manufacturerDist,
            statusDist
        });
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                startDate,
                endDate,
                itemCode,
                productName,
                manufacturer: isManufacturer ? user?.companyName : selectedManufacturer
            };
            const res = await getInboundData(params);
            const list = res.data || [];
            setInbounds(list);
            calculateStats(list);
        } catch (error) {
            console.error("Failed to load quality dashboard data", error);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, itemCode, productName, selectedManufacturer, isManufacturer, user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSearch = () => loadData();
    const handleReset = () => {
        const d = new Date(); d.setMonth(d.getMonth() - 3);
        setStartDate(d.toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
        setItemCode('');
        setProductName('');
        setSelectedManufacturer('');
    };

    const columnDefs = useMemo(() => [
        { field: 'grnNumber', headerName: '입고번호', width: 140, filter: true },
        { field: 'itemCode', headerName: '품목코드', width: 120, filter: true },
        { field: 'productName', headerName: '품목명', flex: 1.5, filter: true },
        { field: 'lotNumber', headerName: 'Lot 번호', width: 130 },
        { field: 'manufacturer', headerName: '제조사', width: 130, filter: true },
        { 
            field: 'inboundQuantity', 
            headerName: '입고수량', 
            width: 100,
            valueFormatter: (params) => params.value ? params.value.toLocaleString() : '-'
        },
        { field: 'inboundDate', headerName: '입고일자', width: 120, filter: true },
        { 
            field: 'inspectionResult', 
            headerName: '검사결과', 
            width: 100,
            cellRenderer: (params) => {
                const val = params.value;
                let color = '#475569';
                let bg = '#f1f5f9';
                if (val === '적합' || val === 'PASS') {
                    color = '#15803d'; bg = '#dcfce7';
                } else if (val === '부적합' || val === 'FAIL') {
                    color = '#b91c1c'; bg = '#fee2e2';
                } else {
                    color = '#b45309'; bg = '#fef3c7';
                }
                return (
                    <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color,
                        backgroundColor: bg
                    }}>
                        {val || '대기'}
                    </span>
                );
            }
        }
    ], []);

    const filterFields = [
        { label: '조회 시작일', type: 'date', value: startDate, onChange: e => setStartDate(e.target.value), icon: '🗓️' },
        { label: '조회 종료일', type: 'date', value: endDate, onChange: e => setEndDate(e.target.value), icon: '🗓️' },
        { label: '품목코드', type: 'text', value: itemCode, onChange: e => setItemCode(e.target.value), icon: '🏷️', placeholder: '코드 검색' },
        { label: '품목명', type: 'text', value: productName, onChange: e => setProductName(e.target.value), icon: '📦', placeholder: '품목명 검색' },
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
        { icon: '🚚', label: '총 입고 검사 건수', value: `${stats.total}건` },
        { icon: '🟢', label: '적합 판정 건수', value: `${stats.completedCount}건`, valueColor: '#10b981' },
        { icon: '⏳', label: '검사 대기 건수', value: `${stats.pendingCount}건`, valueColor: '#f59e0b' },
        { icon: '🔴', label: '부적합 판정 건수', value: `${stats.unfitCount}건`, valueColor: '#ef4444' }
    ];

    return (
        <AnalyticsDashboardShell
            icon="🚚"
            title="입고 품질 검사 대시보드"
            subtitle="창고 입고 제품 검수/CoA 승인 및 판정 현황 요약"
            backTo="quality"
            backLabel="입고 품질 관리로 돌아가기"
            onDownloadReport={() => alert("리포트 다운로드 준비 중입니다.")}
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
                    title="제조사별 입고 점검 분포"
                    type="bar"
                    data={stats.manufacturerDist}
                    dataKey="value"
                    nameKey="name"
                    emptyThreshold={1}
                />
                <ChartCard 
                    title="입고 검사 적격 판정 비중"
                    type="donut"
                    data={stats.statusDist}
                    dataKey="value"
                    nameKey="name"
                    emptyThreshold={1}
                    colors={['#f59e0b', '#10b981', '#ef4444']}
                />
            </div>

            {/* 입고 검사 그리드 */}
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
                    📋 입고 검수 및 판정 내역 (검색결과: {inbounds.length}건)
                </h3>
                <div className="ag-theme-alpine" style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <AgGridReact 
                        rowData={inbounds}
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

export default QualityDashboardPage;
