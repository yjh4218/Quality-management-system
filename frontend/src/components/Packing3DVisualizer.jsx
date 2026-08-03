import React, { useState } from 'react';

/**
 * 📦 Packing3DVisualizer 컴포넌트
 * 인박스, 아웃박스, 팔레트 제원(장x폭x고 mm) 및 적재 수량을 기반으로
 * 입체감 있는 3D 가상 물류 박스 및 팔레트 적재 형태를 실시간 렌더링합니다.
 */
export default function Packing3DVisualizer({ type = 'outbox', length = 300, width = 200, height = 150, qty = 1, title = '3D 입체 구조' }) {
    const [viewAngle, setViewAngle] = useState({ rx: -25, ry: 45 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // 수치 안전 정제
    const l = Math.max(parseFloat(length) || 300, 50);
    const w = Math.max(parseFloat(width) || 200, 50);
    const h = Math.max(parseFloat(height) || 150, 50);

    // 뷰포트 내 스케일 비율 계산
    const maxDim = Math.max(l, w, h, 400);
    const scaleFactor = 160 / maxDim;

    const scaledL = l * scaleFactor;
    const scaledW = w * scaleFactor;
    const scaledH = h * scaleFactor;

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setViewAngle(prev => ({
            rx: Math.min(Math.max(prev.rx - dy * 0.5, -80), 10),
            ry: prev.ry + dx * 0.5
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => setIsDragging(false);

    // 박스 타입별 테마 색상
    const colors = type === 'pallet' ? {
        top: '#d97706',
        front: '#b45309',
        side: '#92400e',
        border: '#78350f',
        accent: '#f59e0b'
    } : type === 'inbox' ? {
        top: '#3b82f6',
        front: '#2563eb',
        side: '#1d4ed8',
        border: '#1e40af',
        accent: '#60a5fa'
    } : {
        top: '#10b981',
        front: '#059669',
        side: '#047857',
        border: '#065f46',
        accent: '#34d399'
    };

    return (
        <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', color: '#fff', border: '1px solid #334155', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🧊 {title} <span style={{ fontSize: '11px', color: '#64748b' }}>(드래그하여 360° 회전)</span>
                </span>
                <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 'bold', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                    {l} &times; {w} &times; {h} mm
                </span>
            </div>

            {/* 3D Canvas Container */}
            <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    height: '220px',
                    perspective: '800px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Grid Floor */}
                <div style={{
                    position: 'absolute',
                    width: '300px',
                    height: '300px',
                    border: '1px dashed #334155',
                    borderRadius: '50%',
                    transform: `rotateX(75deg) translateZ(-80px)`,
                    background: 'radial-gradient(circle, rgba(51,65,85,0.2) 0%, rgba(15,23,42,0) 70%)',
                    pointerEvents: 'none'
                }} />

                {/* 3D Cube Container */}
                <div style={{
                    width: `${scaledL}px`,
                    height: `${scaledH}px`,
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(${viewAngle.rx}deg) rotateY(${viewAngle.ry}deg)`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}>
                    {/* Top Face */}
                    <div style={{
                        position: 'absolute',
                        width: `${scaledL}px`,
                        height: `${scaledW}px`,
                        background: colors.top,
                        opacity: 0.9,
                        transform: `rotateX(90deg) translateZ(${scaledW / 2}px)`,
                        border: `1px solid ${colors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#fff',
                        boxShadow: 'inset 0 0 15px rgba(255,255,255,0.2)'
                    }}>
                        상단 (Top: {l}mm)
                    </div>

                    {/* Front Face */}
                    <div style={{
                        position: 'absolute',
                        width: `${scaledL}px`,
                        height: `${scaledH}px`,
                        background: colors.front,
                        opacity: 0.95,
                        transform: `translateZ(${scaledW / 2}px)`,
                        border: `1px solid ${colors.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#fff',
                        boxShadow: 'inset 0 0 15px rgba(0,0,0,0.2)'
                    }}>
                        <span>정면 (Front)</span>
                        <span style={{ fontSize: '10px', opacity: 0.8 }}>높이: {h}mm</span>
                    </div>

                    {/* Right Side Face */}
                    <div style={{
                        position: 'absolute',
                        width: `${scaledW}px`,
                        height: `${scaledH}px`,
                        background: colors.side,
                        opacity: 0.9,
                        transform: `rotateY(90deg) translateZ(${scaledL - scaledW / 2}px)`,
                        border: `1px solid ${colors.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10.5px',
                        fontWeight: 'bold',
                        color: '#fff',
                        boxShadow: 'inset 0 0 15px rgba(0,0,0,0.3)'
                    }}>
                        <span>측면 (Side)</span>
                        <span style={{ fontSize: '10px', opacity: 0.8 }}>폭: {w}mm</span>
                    </div>
                </div>
            </div>

            {/* 제원 요약 바 */}
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '12px', color: '#94a3b8', paddingTop: '10px', borderTop: '1px solid #1e293b' }}>
                <div>가로(Length): <b style={{ color: '#fff' }}>{l} mm</b></div>
                <div>세로(Width): <b style={{ color: '#fff' }}>{w} mm</b></div>
                <div>높이(Height): <b style={{ color: '#fff' }}>{h} mm</b></div>
                {qty && <div>입수량: <b style={{ color: colors.accent }}>{qty} ea</b></div>}
            </div>
        </div>
    );
}
