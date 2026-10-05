import React from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b'];

const DynamicDashboardView = ({ dashboard, rowData = [], onRegenerate, isRegenerating = false }) => {
    if (!dashboard || !dashboard.widgets || dashboard.widgets.length === 0) {
        return (
            <div style={{
                background: '#ffffff',
                padding: '24px',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
                textAlign: 'center',
                marginBottom: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
                <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '13px' }}>
                    등록된 규칙 기반 대시보드가 없습니다. 컬럼의 수치·차원 속성을 분석하여 시각화 차트를 자동 생성할 수 있습니다.
                </p>
                <button
                    type="button"
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    style={{
                        padding: '8px 18px',
                        borderRadius: '8px',
                        background: '#003366',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '13px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>⚡</span>
                    <span>{isRegenerating ? '차트 분석 중...' : '규칙 기반 대시보드 자동 생성'}</span>
                </button>
            </div>
        );
    }

    return (
        <div style={{
            background: '#ffffff',
            padding: '18px 22px',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
            marginBottom: '16px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📊</span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                        {dashboard.dashboardName || '규칙 기반 자동 생성 대시보드'}
                    </h3>
                </div>
                <button
                    type="button"
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: '700',
                        borderRadius: '6px',
                        border: '1px solid #bfdbfe',
                        color: '#1d4ed8',
                        background: '#eff6ff',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}
                >
                    <span>⚡</span>
                    <span>{isRegenerating ? '분석 중...' : '규칙 대시보드 재생성'}</span>
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: '12px'
            }}>
                {dashboard.widgets.map((w, idx) => (
                    <div
                        key={w.id || idx}
                        style={{
                            gridColumn: `span ${Math.min(w.width || 4, 12)}`,
                            background: '#f8fafc',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: w.widgetType === 'KPI_CARD' ? 'auto' : '260px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                                {w.title}
                            </h4>
                        </div>
                        <div style={{ flex: 1, width: '100%' }}>
                            {renderWidgetContent(w, rowData)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 필드값 안전 추출 헬퍼 (대체 키 탐색)
const getRowFieldValue = (row, key) => {
    if (!row) return null;
    let val = row[key];
    if (val !== undefined && val !== null && val !== '') return val;

    if (key === 'defectQuantity' || key === 'occurrenceQty' || key === 'quantity') {
        return row.occurrenceQty ?? row.defectQuantity ?? row.quantity;
    }
    if (key === 'claimCost' || key === 'claimAmount' || key === 'totalCost') {
        return row.claimCost ?? row.claimAmount ?? row.totalCost;
    }
    if (key === 'claimType' || key === 'primaryCategory' || key === 'category') {
        return row.primaryCategory ?? row.claimType ?? row.category;
    }
    if (key === 'productName' || key === 'product') {
        return row.productName || (row.product && typeof row.product === 'object' ? (row.product.productName || row.product.name) : row.product);
    }
    if (key === 'claimNumber' || key === 'code' || key === 'id') {
        return row.claimNumber ?? row.code ?? row.id;
    }
    return val;
};

const renderWidgetContent = (widget, data = []) => {
    switch (widget.widgetType) {
        case 'KPI_CARD': {
            let sum = 0;
            let count = 0;

            data.forEach(row => {
                const val = Number(getRowFieldValue(row, widget.boundFieldKey));
                if (!isNaN(val) && val !== null) {
                    sum += val;
                    count++;
                }
            });

            // 만약 합계가 0인데 데이터 행이 존재하면 행 수(건수)로 안내
            const displayValue = sum > 0 ? sum.toLocaleString() : (count > 0 ? count.toLocaleString() : data.length.toLocaleString());
            const unitLabel = sum > 0 ? '수치 합계' : '총 건수';

            return (
                <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderTop: '3px solid #2563eb'
                }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                        {widget.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                        <span style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                            {displayValue}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {unitLabel}
                        </span>
                    </div>
                </div>
            );
        }

        case 'BAR_CHART': {
            const counts = {};
            data.forEach(row => {
                let groupKey = getRowFieldValue(row, widget.secondaryFieldKey);
                if (groupKey && typeof groupKey === 'object') {
                    groupKey = groupKey.name || groupKey.label || groupKey.code;
                }
                const name = groupKey ? String(groupKey) : '기타';
                const measureVal = Number(getRowFieldValue(row, widget.boundFieldKey)) || 1;
                counts[name] = (counts[name] || 0) + measureVal;
            });

            const chartData = Object.entries(counts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 8);

            if (chartData.length === 0) {
                return <div style={{ color: '#94a3b8', fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>집계할 데이터가 없습니다.</div>;
            }

            return (
                <div style={{ width: '100%', height: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="name" 
                                tick={{ fontSize: 10, fill: '#64748b' }} 
                                tickFormatter={(v) => (v.length > 9 ? `${v.substring(0, 9)}...` : v)}
                                angle={-25}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip 
                                formatter={(value) => [Number(value).toLocaleString(), '수량/집계']}
                                labelFormatter={(label) => `항목: ${label}`}
                                contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
                            />
                            <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        case 'PIE_CHART': {
            const counts = {};
            data.forEach(row => {
                let key = getRowFieldValue(row, widget.boundFieldKey);
                if (key && typeof key === 'object') {
                    key = key.name || key.label || key.code;
                }
                const name = key ? String(key) : '미분류';
                counts[name] = (counts[name] || 0) + 1;
            });

            const total = Object.values(counts).reduce((acc, c) => acc + c, 0) || 1;
            const chartData = Object.entries(counts)
                .map(([name, value]) => ({ 
                    name, 
                    value,
                    percent: Math.round((value / total) * 100)
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 6);

            if (chartData.length === 0) {
                return <div style={{ color: '#94a3b8', fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>집계할 데이터가 없습니다.</div>;
            }

            return (
                <div style={{ display: 'flex', flexDirection: 'column', height: '220px' }}>
                    <div style={{ flex: 1, minHeight: '140px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Tooltip 
                                    formatter={(value, name, item) => [
                                        `${value}건 (${item.payload.percent}%)`, 
                                        item.payload.name
                                    ]}
                                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                                />
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={68}
                                    paddingAngle={2}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 범례 리스트 (긴 텍스트 겹침 방지 및 비율 표시) */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '6px',
                        padding: '6px 4px',
                        maxHeight: '75px',
                        overflowY: 'auto'
                    }}>
                        {chartData.map((item, idx) => (
                            <div 
                                key={idx} 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    fontSize: '11px', 
                                    color: '#475569',
                                    background: '#ffffff',
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #e2e8f0'
                                }}
                                title={`${item.name} (${item.value}건, ${item.percent}%)`}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                                    <span style={{ 
                                        width: '8px', 
                                        height: '8px', 
                                        borderRadius: '50%', 
                                        backgroundColor: COLORS[idx % COLORS.length],
                                        flexShrink: 0
                                    }} />
                                    <span style={{ 
                                        whiteSpace: 'nowrap', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis',
                                        maxWidth: '85px'
                                    }}>
                                        {item.name}
                                    </span>
                                </div>
                                <span style={{ fontWeight: '700', color: '#0f172a', marginLeft: '4px' }}>
                                    {item.percent}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        case 'LINE_CHART': {
            const dateMap = {};
            data.forEach(row => {
                const rawDate = getRowFieldValue(row, widget.secondaryFieldKey);
                const dateKey = rawDate ? String(rawDate).substring(0, 10) : '날짜미정';
                const measureVal = Number(getRowFieldValue(row, widget.boundFieldKey)) || 1;
                dateMap[dateKey] = (dateMap[dateKey] || 0) + measureVal;
            });
            const chartData = Object.entries(dateMap)
                .map(([date, value]) => ({ date, value }))
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(-15);

            if (chartData.length === 0) {
                return <div style={{ color: '#94a3b8', fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>집계할 데이터가 없습니다.</div>;
            }

            return (
                <div style={{ width: '100%', height: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 10, fill: '#64748b' }} 
                                angle={-20}
                                textAnchor="end"
                            />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                            />
                            <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        default:
            return <div style={{ color: '#94a3b8', fontSize: '12px' }}>지원되지 않는 위젯 형태입니다.</div>;
    }
};

export default DynamicDashboardView;
