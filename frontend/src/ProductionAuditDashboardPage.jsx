import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getProductionAudits } from './api';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import ChartCard from './components/dashboard/ChartCard';
import DashboardDataTable from './components/dashboard/DashboardDataTable';
import StatusBadgeRenderer from './components/dashboard/StatusBadgeRenderer';

const ProductionAuditDashboardPage = ({ user, onNavigate }) => {
    const gridRef = useRef();
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [manufacturerFilter, setManufacturerFilter] = useState('');
    const [itemCodeFilter, setItemCodeFilter] = useState('');
    const [productNameFilter, setProductNameFilter] = useState('');

    const [stats, setStats] = useState({
        total: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        avgScore: 0,
        manufacturerScores: [],
        statusDist: []
    });

    const isManufacturer = user?.roles?.some(r => r.authority === 'ROLE_MANUFACTURER');

    const calculateStats = (auditList) => {
        const total = auditList.length;
        if (total === 0) {
            setStats({
                total: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0, avgScore: 0, manufacturerScores: [], statusDist: []
            });
            return;
        }

        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        let totalScoreSum = 0;
        let scoredCount = 0;

        const manuMap = {};
        const statusMap = { '대기': 0, '승인': 0, '반려': 0 };

        auditList.forEach(a => {
            // 상태 집계
            const status = a.auditStatus || '대기';
            if (status === '대기' || status === '제출됨' || status === 'PENDING') {
                pendingCount++;
                statusMap['대기']++;
            } else if (status === '승인' || status === 'APPROVED') {
                approvedCount++;
                statusMap['승인']++;
            } else if (status === '반려' || status === 'REJECTED') {
                rejectedCount++;
                statusMap['반려']++;
            }

            // 점수 집계 (총점이 입력된 경우)
            if (a.totalScore !== undefined && a.totalScore !== null) {
                totalScoreSum += a.totalScore;
                scoredCount++;

                const mName = a.manufacturerName || '미지정';
                if (!manuMap[mName]) manuMap[mName] = { sum: 0, count: 0 };
                manuMap[mName].sum += a.totalScore;
                manuMap[mName].count++;
            }
        });

        const manufacturerScores = Object.entries(manuMap).map(([name, data]) => ({
            name,
            평균점수: Math.round(data.sum / data.count)
        }));

        const statusDist = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        setStats({
            total,
            pendingCount,
            approvedCount,
            rejectedCount,
            avgScore: scoredCount > 0 ? Math.round(totalScoreSum / scoredCount) : 0,
            manufacturerScores,
            statusDist
        });
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const targetManufacturer = isManufacturer ? user?.companyName : manufacturerFilter;
            const res = await getProductionAudits(targetManufacturer);
            let list = res.data || [];

            // 클라이언트 단에서 추가 필터링 (품목코드, 품목명)
            if (itemCodeFilter) {
                list = list.filter(a => a.itemCode?.toLowerCase().includes(itemCodeFilter.toLowerCase()));
            }
            if (productNameFilter) {
                list = list.filter(a => a.productName?.toLowerCase().includes(productNameFilter.toLowerCase()));
            }

            setAudits(list);
            calculateStats(list);
        } catch (error) {
            console.error("Failed to load production audits stats", error);
        } finally {
            setLoading(false);
        }
    }, [manufacturerFilter, itemCodeFilter, productNameFilter, isManufacturer, user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSearch = () => loadData();
    const handleReset = () => {
        setManufacturerFilter('');
        setItemCodeFilter('');
        setProductNameFilter('');
    };

    const columnDefs = useMemo(() => [
        { field: 'itemCode', headerName: '품목코드', width: 130, cellClass: 'text-center' },
        { field: 'productName', headerName: '품목명', flex: 1.2, cellClass: 'text-left' },
        { field: 'manufacturerName', headerName: '제조사', width: 140, cellClass: 'text-left' },
        { field: 'auditDate', headerName: '감리일자', width: 120, cellClass: 'text-center' },
        { 
            field: 'totalScore', 
            headerName: '평가점수', 
            width: 100,
            cellClass: 'text-right',
            valueFormatter: (params) => params.value !== null && params.value !== undefined ? `${params.value}점` : '-'
        },
        { 
            field: 'auditStatus', 
            headerName: '진행상태', 
            width: 110,
            cellClass: 'text-center',
            cellRenderer: (params) => {
                let val = params.value;
                if (val === 'APPROVED') val = '승인';
                else if (val === 'REJECTED') val = '반려';
                else if (val === 'PENDING') val = '대기';
                return <StatusBadgeRenderer value={val || '대기'} />;
            }
        }
    ], []);

    const filterFields = [
        ...(!isManufacturer ? [{
            label: '제조사명',
            type: 'text',
            value: manufacturerFilter,
            onChange: e => setManufacturerFilter(e.target.value),
            icon: '🏭',
            placeholder: '제조사 검색'
        }] : []),
        { label: '품목코드', type: 'text', value: itemCodeFilter, onChange: e => setItemCodeFilter(e.target.value), icon: '🏷️', placeholder: '코드 검색' },
        { label: '품목명', type: 'text', value: productNameFilter, onChange: e => setProductNameFilter(e.target.value), icon: '📦', placeholder: '품목명 검색' }
    ];

    // 사진 감사 미제출 건수 (용기, 아웃박스, 적재 이미지 중 비어 있는 항목 집계)
    const missingPhotoCount = useMemo(() => {
        return audits.filter(a => {
            return !a.containerImages || !a.boxImages || !a.loadImages;
        }).length;
    }, [audits]);

    // 반려 사유 유형 집계 및 분포 데이터 추출
    const rejectionReasons = useMemo(() => {
        const distribution = {};
        audits.forEach(a => {
            const status = a.auditStatus || '대기';
            if (status === '반려' || status === 'REJECTED') {
                const reason = a.rejectionReason || '사유 미입력';
                const label = reason.length > 20 ? reason.substring(0, 17) + '...' : reason;
                distribution[label] = (distribution[label] || 0) + 1;
            }
        });
        return Object.entries(distribution).map(([name, value]) => ({ name, value }));
    }, [audits]);

    const summaryCards = [
        { icon: '📸', label: '감리 신청 총수', value: `${stats.total}건` },
        { icon: '🖼️', label: '사진 미제출 건수', value: `${missingPhotoCount}건`, valueColor: missingPhotoCount > 0 ? '#ef4444' : '#10b981' },
        { icon: '⏳', label: '승인 대기 건수', value: `${stats.pendingCount}건`, valueColor: '#b45309' },
        { icon: '🔴', label: '검토 반려 건수', value: `${stats.rejectedCount}건`, valueColor: '#ef4444' }
    ];

    return (
        <AnalyticsDashboardShell
            icon="📸"
            title="신제품 생산감리 대시보드"
            subtitle="신제품 초도 생산 감리(현장 사진/체크리스트) 심사 및 승인 현황"
            backTo="productionAudits"
            backLabel="생산감리 관리로 돌아가기"
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                <ChartCard 
                    title="제조사별 평균 감리점수"
                    type="bar"
                    data={stats.manufacturerScores}
                    dataKey="평균점수"
                    nameKey="name"
                    emptyThreshold={1}
                />
                <ChartCard 
                    title="진행상태별 비중 분포"
                    type="donut"
                    data={stats.statusDist}
                    dataKey="value"
                    nameKey="name"
                    emptyThreshold={1}
                    colors={['#f59e0b', '#10b981', '#ef4444']}
                />
            </div>

            {/* 반려 사유 및 미제출 통계 위젯 영역 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <ChartCard 
                    title="감리 반려 사유 유형 분포"
                    type="donut"
                    data={rejectionReasons}
                    dataKey="value"
                    nameKey="name"
                    emptyThreshold={1}
                />
            </div>

            {/* 생산감리 내역 그리드 */}
            <DashboardDataTable
                title="📋 생산감리 상세 점검 결과"
                rowData={audits}
                columnDefs={columnDefs}
                defaultPageSize={50}
            />
        </AnalyticsDashboardShell>
    );
};

export default ProductionAuditDashboardPage;
