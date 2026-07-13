import React from 'react';
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

/**
 * 데이터를 기반으로 둥근 모서리의 카드 틀 내부에 Recharts 그래프를 안전하게 렌더링하는 공용 컴포넌트입니다.
 * 데이터가 부족한 경우 Empty 메시지를 자동으로 렌더링합니다.
 */
const ChartCard = ({
    title,
    type = 'bar',
    data = [],
    dataKey,
    nameKey,
    emptyThreshold = 3,
    colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
}) => {
    
    // 데이터의 건수가 임계치 미만인 경우 플레이스홀더 처리
    const hasEnoughData = data && data.length >= emptyThreshold;

    // Pie/Donut 커스텀 라벨 포맷터
    const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        
        // 데이터 명칭과 비율 표시
        const labelText = `${name} ${(percent * 100).toFixed(0)}%`;
        
        return (
            <text 
                x={x} 
                y={y} 
                fill="#334155" 
                textAnchor={x > cx ? 'start' : 'end'} 
                dominantBaseline="central" 
                style={{ fontSize: '11px', fontWeight: 'bold', fill: '#0f172a' }}
            >
                {labelText}
            </text>
        );
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
                    fontSize: '13px',
                    fontWeight: '600',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px dashed #cbd5e1'
                }}>
                    📊 표시할 데이터가 충분하지 않습니다 (최소 {emptyThreshold}건 필요)
                </div>
            );
        }

        switch (type) {
            case 'pie':
            case 'donut': {
                const isDonut = type === 'donut';
                // Value 기준 내림차순 정렬하여 조각과 범례 순서 일치
                const sortedData = [...data].sort((a, b) => (b[dataKey] || 0) - (a[dataKey] || 0));
                return (
                    <div style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sortedData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={true}
                                    label={renderCustomizedPieLabel}
                                    outerRadius={75}
                                    innerRadius={isDonut ? 45 : 0}
                                    fill="#8884d8"
                                    dataKey={dataKey}
                                    nameKey={nameKey}
                                >
                                    {sortedData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value}건`} />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconSize={10} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                );
            }
            case 'line':
                return (
                    <div style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} domain={[0, 'dataMax']} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Line type="monotone" dataKey={dataKey} stroke="#3b82f6" strokeWidth={2.5} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                );
            case 'bar':
            default:
                return (
                    <div style={{ height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} domain={[0, 'dataMax']} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar dataKey={dataKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );
        }
    };

    return (
        <section style={{
            padding: '20px 24px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            boxSizing: 'border-box'
        }}>
            <h3 style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#334155',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                📈 {title}
            </h3>
            {renderChartContent()}
        </section>
    );
};

export default ChartCard;
