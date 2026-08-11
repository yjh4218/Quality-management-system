import React, { useState, useEffect } from 'react';
import { 
     ResponsiveContainer, 
     BarChart, 
     Bar, 
     XAxis, 
     YAxis, 
     CartesianGrid, 
     Tooltip, 
     Legend, 
     PieChart, 
     Pie, 
     Cell, 
     LineChart, 
     Line 
} from 'recharts';

const SafeResponsiveContainer = ({ children, height = 220, minHeight = 150 }) => {
    const containerRef = React.useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect.width > 0) {
                    const targetH = rect.height > 0 ? rect.height : (typeof height === 'number' ? height : 220);
                    setDimensions({ width: Math.floor(rect.width), height: Math.floor(targetH) });
                }
            }
        };

        updateSize();
        const observer = new ResizeObserver(() => updateSize());
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [height]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height, minHeight, position: 'relative' }}>
            {dimensions.width > 0 && dimensions.height > 0 && (
                <ResponsiveContainer width={dimensions.width} height={dimensions.height}>
                    {children}
                </ResponsiveContainer>
            )}
        </div>
    );
};

/**
 * 데이터를 기반으로 둥근 모서리의 카드 틀 내부에 Recharts 그래프를 안전하게 렌더링하는 공용 컴포넌트입니다.
 * 프리미엄 다크 테마와 7색 인디고 계열 다채로운 색상이 적용되었습니다.
 */
const ChartCard = ({
    title,
    subtitle,
    type = 'bar',
    data = [],
    dataKey,
    nameKey,
    emptyThreshold = 1,
    colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'],
    onClickItem,
    children
}) => {
    
    // 데이터의 건수가 임계치 미만인 경우 플레이스홀더 처리
    const hasEnoughData = data && data.length >= emptyThreshold;

    // Pie/Donut 커스텀 라벨 포맷터
    const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }) => {
        const RADIAN = Math.PI / 180;
        const radius = outerRadius + 20;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        
        // nameKey 속성값 동적 획득
        const name = payload && payload[nameKey] ? payload[nameKey] : '';
        const labelText = `${name} ${(percent * 100).toFixed(0)}%`;
        
        return (
            <text 
                x={x} 
                y={y} 
                fill="#1e293b" 
                textAnchor={x > cx ? 'start' : 'end'} 
                dominantBaseline="central" 
                style={{ fontSize: '13px', fontWeight: '800', fill: '#1e293b' }}
            >
                {labelText}
            </text>
        );
    };

    // Y축 정수 최적화 및 눈금 간격 계산기 (niceTicks)
    const getNiceTicks = (dataList, key) => {
        if (!dataList || dataList.length === 0) return [0, 10, 20, 30];
        const maxVal = Math.max(...dataList.map(d => d[key] || 0), 10);
        
        // 4개의 구간을 반올림하여 둥근 단위로 생성
        const rawStep = maxVal / 3;
        let step = 1;
        if (rawStep > 1) {
            const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
            const normalized = rawStep / magnitude;
            let cleanStep;
            if (normalized < 1.5) cleanStep = 1;
            else if (normalized < 3) cleanStep = 2;
            else if (normalized < 7) cleanStep = 5;
            else cleanStep = 10;
            step = cleanStep * magnitude;
        }
        
        const ticks = [0, step, step * 2, step * 3];
        // 만약 최대값이 ticks 범위를 초과하는 경우 추가 구간 삽입
        while (ticks[ticks.length - 1] < maxVal) {
            ticks.push(ticks[ticks.length - 1] + step);
        }
        return ticks;
    };

    // 차트 컴포넌트 내용 분기 렌더링
    const renderChartContent = () => {
        if (!hasEnoughData) {
            return (
                <div style={{
                    height: '240px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px dashed #cbd5e1'
                }}>
                    📊 표시할 데이터가 충분하지 않습니다 (최소 {emptyThreshold}건 필요)
                </div>
            );
        }

        const commonTooltipStyle = {
            contentStyle: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' },
            itemStyle: { color: '#1e293b', fontSize: '13px' },
            labelStyle: { color: '#64748b', fontSize: '12px', fontWeight: 'bold' }
        };

        switch (type) {
            case 'pie':
            case 'donut': {
                const isDonut = type === 'donut';
                // 1. 값이 0보다 큰 데이터만 필터링하여 Pie 차트에 전달 (끊긴 도넛 방지)
                const activeData = data.filter(d => (d[dataKey] || 0) > 0);
                const sortedActiveData = [...activeData].sort((a, b) => (b[dataKey] || 0) - (a[dataKey] || 0));
                const sortedAllData = [...data].sort((a, b) => (b[dataKey] || 0) - (a[dataKey] || 0));

                const renderCustomLegend = () => {
                    return (
                        <ul style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px', listStyle: 'none', margin: '12px 0 0 0', padding: 0, fontSize: '13px' }}>
                            {sortedAllData.map((entry, index) => {
                                const val = entry[dataKey] || 0;
                                const isZero = val === 0;
                                // 2. 0건인 카테고리는 범례에서 회색 텍스트로 표출
                                const color = isZero ? '#cbd5e1' : colors[index % colors.length];
                                return (
                                    <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isZero ? '#94a3b8' : '#334155' }}>
                                        <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', backgroundColor: color }}></span>
                                        {entry[nameKey]}: {val}건
                                    </li>
                                );
                            })}
                        </ul>
                    );
                };

                return (
                    <div style={{ height: '270px', width: '100%', minWidth: 0 }}>
                        <SafeResponsiveContainer width="100%" height={220} minWidth={0} minHeight={150}>
                            <PieChart>
                                <Pie
                                    data={sortedActiveData.length > 0 ? sortedActiveData : [{ [nameKey]: '데이터 없음', [dataKey]: 1 }]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={sortedActiveData.length > 0}
                                    label={sortedActiveData.length > 0 ? renderCustomizedPieLabel : false}
                                    outerRadius={75}
                                    innerRadius={isDonut ? 45 : 0}
                                    fill={sortedActiveData.length > 0 ? '#8884d8' : '#cbd5e1'}
                                    dataKey={dataKey}
                                    nameKey={nameKey}
                                    onClick={(entry) => onClickItem && onClickItem(entry)}
                                    style={{ cursor: onClickItem ? 'pointer' : 'default' }}
                                >
                                    {sortedActiveData.length > 0 ? (
                                        sortedActiveData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                        ))
                                    ) : (
                                        <Cell fill="#cbd5e1" />
                                    )}
                                </Pie>
                                <Tooltip {...commonTooltipStyle} formatter={(value, name) => name === '데이터 없음' ? ['0건', '현황'] : [`${value}건`, name]} />
                            </PieChart>
                        </SafeResponsiveContainer>
                        {renderCustomLegend()}
                    </div>
                );
            }
            case 'line': {
                const niceTicks = getNiceTicks(data, dataKey);
                return (
                    <div style={{ height: '240px', width: '100%', minWidth: 0 }}>
                        <SafeResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={150}>
                            <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey={nameKey} tick={{ fontSize: 13, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 13, fill: '#64748b' }} allowDecimals={false} ticks={niceTicks} domain={[0, niceTicks[niceTicks.length - 1]]} />
                                <Tooltip {...commonTooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                                <Line type="monotone" dataKey={dataKey} stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} />
                            </LineChart>
                        </SafeResponsiveContainer>
                    </div>
                );
            }
            case 'bar':
            default: {
                const niceTicks = getNiceTicks(data, dataKey);
                return (
                    <div style={{ height: '240px', width: '100%', minWidth: 0 }}>
                        <SafeResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={150}>
                            <BarChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey={nameKey} tick={{ fontSize: 13, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 13, fill: '#64748b' }} allowDecimals={false} ticks={niceTicks} domain={[0, niceTicks[niceTicks.length - 1]]} />
                                <Tooltip {...commonTooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                                <Bar 
                                    dataKey={dataKey} 
                                    fill="#6366f1" 
                                    radius={[4, 4, 0, 0]}
                                    onClick={(entry) => onClickItem && onClickItem(entry)}
                                    style={{ cursor: onClickItem ? 'pointer' : 'default' }}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </SafeResponsiveContainer>
                    </div>
                );
            }
        }
    };

    return (
        <section style={{
            padding: '24px 28px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
            boxSizing: 'border-box'
        }}>
            <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#1e293b',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {title}
                </h3>
                {subtitle && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {children ? children : renderChartContent()}
        </section>
    );
};

export default ChartCard;
