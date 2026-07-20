import React, { useState, useMemo } from 'react';
import { calculateSpaceRatio } from './api';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';

/**
 * 국가별 포장공간비율 독립 계산기 및 최적화 역산 피드백 페이지
 * - 완전 리디자인: 프리미엄 카드 기반 레이아웃
 */
const PackagingSpaceRatioCalculatorPage = ({ user, onNavigate }) => {
    const [contentVolumeMl, setContentVolumeMl] = useState('');
    const [contentType, setContentType] = useState('LIQUID');
    const [isPlanningSet, setIsPlanningSet] = useState(false);
    const [packagingWidth, setPackagingWidth] = useState('105'); // mm 기준 기본값
    const [packagingLength, setPackagingLength] = useState('80');  // mm 기준 기본값
    const [packagingHeight, setPackagingHeight] = useState('150'); // mm 기준 기본값
    const [numberOfLayers, setNumberOfLayers] = useState('1');
    const [isCleansingProduct, setIsCleansingProduct] = useState(false);

    // 동적 구성품 목록 관리 (초기값으로 1차 용기 1개 설정)
    // 동적 구성품 목록 관리 (1차 포장만 기본 포함, 2차 포장은 토글식 추가)
    const [components, setComponents] = useState([
        {
            id: 1,
            name: '구성품 1',
            primary: { width: 100, length: 75, height: 140, cushioning: false },
            hasSecondary: false,
            secondary: { width: 105, length: 80, height: 150, cushioning: false }
        }
    ]);

    // 세트 제품 전용 공용 아웃박스 옵션 및 크기
    const [useSharedOutbox, setUseSharedOutbox] = useState(false);
    const [sharedOutbox, setSharedOutbox] = useState({
        width: 250,
        length: 180,
        height: 120,
        cushioning: false
    });

    // 툴팁 활성화 상태 관리
    const [activeTooltip, setActiveTooltip] = useState(null);

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState(null);
    const [expandedCountry, setExpandedCountry] = useState(null);

    // 도움말 상수
    const helpTexts = {
        primary: "1차 포장이란?\n내용물과 직접 접촉하는 최초의 용기입니다. (예: 화장품 유리병, 튜브 등)",
        secondary: "2차 포장이란?\n1차 포장 용기를 보호하거나 안내 문구를 표시하기 위해 담는 개별 종이박스(단상자)입니다. (선택사항)",
        shared: "공용 아웃박스란?\n여러 개의 구성품들을 개별 단상자 없이 한데 모아 담는 단체 포장 박스입니다. 세트 제품 기준(25% 이하) 판정에 적용됩니다."
    };

    // 구성품 추가
    const addComponent = () => {
        const nextId = components.length > 0 ? Math.max(...components.map(c => c.id)) + 1 : 1;
        setComponents([
            ...components,
            {
                id: nextId,
                name: `구성품 ${nextId}`,
                primary: { width: 100, length: 75, height: 140, cushioning: false },
                hasSecondary: false,
                secondary: { width: 105, length: 80, height: 150, cushioning: false }
            }
        ]);
        import('react-toastify').then(({ toast }) => toast.success('새 구성품이 추가되었습니다.'));
    };

    // 구성품 제거
    const removeComponent = (compId) => {
        if (components.length <= 1) {
            import('react-toastify').then(({ toast }) => toast.warn('최소 1개 이상의 구성품이 필요합니다.'));
            return;
        }
        setComponents(components.filter(c => c.id !== compId));
        import('react-toastify').then(({ toast }) => toast.info('구성품이 제거되었습니다.'));
    };

    // 구성품 이름 수정
    const updateComponentName = (compId, name) => {
        setComponents(components.map(c => c.id === compId ? { ...c, name } : c));
    };

    // 구성품 세부값 수정 (1차/2차)
    const updateComponentValue = (compId, level, field, value) => {
        setComponents(components.map(c => {
            if (c.id === compId) {
                return {
                    ...c,
                    [level]: {
                        ...c[level],
                        [field]: value
                    }
                };
            }
            return c;
        }));
    };

    // 2차 포장 토글
    const toggleSecondary = (compId) => {
        setComponents(components.map(c => {
            if (c.id === compId) {
                return { ...c, hasSecondary: !c.hasSecondary };
            }
            return c;
        }));
    };

    // 포장 겹수 및 최종 외부 치수 자동 계산
    // - 개별 2차 박스가 있으면 그 박스 치수, 없으면 1차 용기가 최종 외부 치수가 됨.
    // - 세트 제품인데 공용 아웃박스를 사용하면 아웃박스가 최종 포장 규격이 됨.
    const calculatedSpec = useMemo(() => {
        let maxWidth = 0;
        let maxLength = 0;
        let maxHeight = 0;
        let maxLayers = 1;

        if (useSharedOutbox && components.length > 1) {
            maxWidth = sharedOutbox.width;
            maxLength = sharedOutbox.length;
            maxHeight = sharedOutbox.height;
            maxLayers = 2;
        } else {
            components.forEach(c => {
                const target = c.hasSecondary ? c.secondary : c.primary;
                if (target.width > maxWidth) maxWidth = target.width;
                if (target.length > maxLength) maxLength = target.length;
                if (target.height > maxHeight) maxHeight = target.height;
                
                const layers = c.hasSecondary ? 2 : 1;
                if (layers > maxLayers) maxLayers = layers;
            });
        }

        return {
            width: maxWidth,
            length: maxLength,
            height: maxHeight,
            layers: maxLayers
        };
    }, [components, useSharedOutbox, sharedOutbox]);

    // 실시간 부피 계산 (cm³ / mL 단위 환산)
    const totalVolume = useMemo(() => {
        return (calculatedSpec.width * calculatedSpec.length * calculatedSpec.height) / 1000;
    }, [calculatedSpec]);

    // 국기 이모지 매핑
    const flagMap = {
        'KOREA': '🇰🇷', 'CHINA': '🇨🇳', 'TAIWAN': '🇹🇼',
        'JAPAN': '🇯🇵', 'EU': '🇪🇺', 'US': '🇺🇸'
    };

    const countryColors = {
        'PASS': { bg: '#f0fdf4', border: '#86efac', text: '#15803d', badge: '#dcfce7', badgeText: '#166534' },
        'FAIL': { bg: '#fff1f2', border: '#fca5a5', text: '#dc2626', badge: '#fee2e2', badgeText: '#991b1b' },
        'REFER': { bg: '#fffbeb', border: '#fcd34d', text: '#d97706', badge: '#fef3c7', badgeText: '#92400e' },
        'NOT_APPLICABLE': { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8', badge: '#f1f5f9', badgeText: '#64748b' },
        'DEFAULT': { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8', badge: '#f1f5f9', badgeText: '#64748b' },
    };

    const statusLabel = {
        'PASS': '적합', 'FAIL': '부적합', 'REFER': '참고',
        'NOT_APPLICABLE': '해당없음', 'CALC_IMPOSSIBLE': '계산불가',
    };

    const getSortScore = (status) => {
        switch (status) {
            case 'FAIL': return 0;
            case 'REFER': return 1;
            case 'CALC_IMPOSSIBLE': return 2;
            case 'PASS': return 3;
            case 'NOT_APPLICABLE': return 4;
            default: return 5;
        }
    };

    const sortedResults = useMemo(() =>
        [...results].sort((a, b) => getSortScore(a.status) - getSortScore(b.status)),
        [results]
    );

    const handleCalculate = async (e) => {
        if (e) e.preventDefault();
        setError(null);

        const vol = parseFloat(contentVolumeMl);
        if (!vol || vol <= 0) {
            import('react-toastify').then(({ toast }) => toast.error('제품 내용물 체적을 입력해 주세요.'));
            return;
        }
        if (totalVolume <= 0) {
            import('react-toastify').then(({ toast }) => toast.error('유효한 포장재 치수를 구성해 주세요.'));
            return;
        }

        setLoading(true);
        try {
            // mm 치수를 cm로 변환하여 기존 백엔드 API에 맞춤 전송
            const params = {
                contentVolumeMl: vol,
                contentType,
                isPlanningSet: isPlanningSet || components.length > 1,
                packagingWidth: calculatedSpec.width / 10,
                packagingLength: calculatedSpec.length / 10,
                packagingHeight: calculatedSpec.height / 10,
                packagingVolume: totalVolume,
                numberOfLayers: calculatedSpec.layers,
                isCleansingProduct
            };
            const res = await calculateSpaceRatio(params);
            setResults(res.data || []);
            import('react-toastify').then(({ toast }) => toast.success('포장공간비율 계산이 완료되었습니다.'));
        } catch (err) {
            console.error('Calculation failed', err);
            setError('계산 중 서버 내부 오류가 발생했습니다.');
            import('react-toastify').then(({ toast }) => toast.error('서버 연결 중 오류가 발생했습니다.'));
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setContentVolumeMl(''); setContentType('LIQUID'); setIsPlanningSet(false);
        setUseSharedOutbox(false);
        setComponents([
            {
                id: 1,
                name: '구성품 1',
                primary: { width: 100, length: 75, height: 140, cushioning: false },
                hasSecondary: false,
                secondary: { width: 105, length: 80, height: 150, cushioning: false }
            }
        ]);
        setResults([]); setError(null);
        import('react-toastify').then(({ toast }) => toast.info('입력 폼이 초기화되었습니다.'));
    };

    const generateOptions = () => {
        const vol = parseFloat(contentVolumeMl);
        const w = calculatedSpec.width;
        const l = calculatedSpec.length;
        const h = calculatedSpec.height;
        if (!vol || !w || !l || !h) return [];

        const limit = isCleansingProduct ? 15.0 : 10.0;
        const createOptionSim = (wMod, lMod, hMod, label, icon) => {
            const newW = w * wMod, newL = l * lMod, newH = h * hMod;
            const newVol = (newW * newL * newH) / 1000;
            const origVol = (w * l * h) / 1000;
            const reduction = ((origVol - newVol) / origVol) * 100;
            const newRatio = (1.0 - (vol / newVol)) * 100.0;
            return { label, icon, dims: `${newW.toFixed(0)} × ${newL.toFixed(0)} × ${newH.toFixed(0)} mm`, reduction: reduction.toFixed(1), passesKorea: newRatio <= limit, newW, newL, newH };
        };

        return [
            createOptionSim(0.9, 1.0, 1.0, '가로 10% 축소', '↔️'),
            createOptionSim(1.0, 0.9, 1.0, '세로 10% 축소', '↕️'),
            createOptionSim(1.0, 1.0, 0.9, '높이 10% 축소', '↑↓'),
        ];
    };

    const applyOption = (opt) => {
        if (useSharedOutbox) {
            setSharedOutbox(prev => ({
                ...prev,
                width: Math.round(opt.newW),
                length: Math.round(opt.newL),
                height: Math.round(opt.newH)
            }));
        } else {
            setComponents(prev => prev.map((c, idx) => {
                if (idx === 0) {
                    const level = c.hasSecondary ? 'secondary' : 'primary';
                    return {
                        ...c,
                        [level]: {
                            ...c[level],
                            width: Math.round(opt.newW),
                            length: Math.round(opt.newL),
                            height: Math.round(opt.newH)
                        }
                    };
                }
                return c;
            }));
        }
        setTimeout(() => document.getElementById('calc-form-submit')?.click(), 150);
    };

    const options = generateOptions();
    const hasFailResult = results.some(r => r.status === 'FAIL');
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;

    return (
        <AnalyticsDashboardShell
            icon="📐"
            title="국가별 포장공간비율 계산기"
            subtitle="각국의 과대포장 기준 및 계산 공식을 활용한 사전 시뮬레이션 및 규격 역산 최적화를 수행합니다."
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: '"Inter", "Outfit", system-ui, sans-serif' }}>

                {/* ── 국가 기준 요약 배너 ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '10px',
                }}>
                    {[
                        { flag: '🇰🇷', country: '한국', limit: '≤ 10%', note: '세정용 15%', color: '#3b82f6' },
                        { flag: '🇨🇳', country: '중국', limit: '≤ 30%', note: 'GB 23350', color: '#ef4444' },
                        { flag: '🇹🇼', country: '대만', limit: '≤ 25%', note: '세트 제외', color: '#22c55e' },
                        { flag: '🇯🇵', country: '일본', limit: '≤ 30%', note: 'JIS 기준', color: '#f97316' },
                        { flag: '🇪🇺', country: 'EU', limit: '≤ 20%', note: 'PPWR 규정', color: '#8b5cf6' },
                        { flag: '🇺🇸', country: 'US', limit: '참고용', note: 'FTC Guides', color: '#64748b' },
                    ].map((item) => (
                        <div key={item.country} style={{
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}>
                            <span style={{ fontSize: '24px', flexShrink: 0 }}>{item.flag}</span>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>{item.country}</div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: item.color, marginTop: '2px' }}>{item.limit}</div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{item.note}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── 입력 폼 카드 ── */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '18px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>✏️</div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>제품 규격 입력</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>내용물 정보 및 구성품 크기를 입력하세요</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleCalculate}>
                        {/* 섹션 1: 내용물 정보 */}
                        <div style={{ marginBottom: '24px' }}>
                            <p style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📦 내용물 정보</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={label}>제품 내용물 체적 (mL) <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        type="number" step="any" value={contentVolumeMl}
                                        onChange={e => setContentVolumeMl(e.target.value)}
                                        placeholder="예: 50"
                                        style={inputStyle} required
                                    />
                                </div>
                                <div>
                                    <label style={label}>제품 제형 (Type)</label>
                                    <select
                                        value={contentType} onChange={e => setContentType(e.target.value)}
                                        style={{ ...inputStyle, cursor: 'pointer' }}
                                    >
                                        <option value="LIQUID">액상형 (Liquid)</option>
                                        <option value="CREAM_EMULSION">크림/에멀전형</option>
                                        <option value="POWDER">분말형 (Powder)</option>
                                        <option value="WAX">왁스형 (Wax)</option>
                                        <option value="TOOTHPASTE">치약형 (Toothpaste)</option>
                                        <option value="MASK_SHEET">마스크팩 시트형</option>
                                        <option value="ETC">기타 (Etc)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 섹션 2: 구성품 동적 관리 */}
                        <div style={{ marginBottom: '24px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📦 구성품 목록</p>
                                <button type="button" onClick={addComponent} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#fff', background: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                    + 구성품 추가
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {components.map((comp, compIdx) => (
                                    <div key={comp.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                                            <input
                                                type="text"
                                                value={comp.name}
                                                onChange={(e) => updateComponentName(comp.id, e.target.value)}
                                                style={{ fontSize: '14px', fontWeight: '700', border: 'none', borderBottom: '1.5px solid #cbd5e1', outline: 'none', padding: '2px 4px', width: '150px', color: '#1e293b' }}
                                            />
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSecondary(comp.id)}
                                                    style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', color: comp.hasSecondary ? '#2563eb' : '#475569', background: comp.hasSecondary ? '#eff6ff' : '#f1f5f9', border: `1px solid ${comp.hasSecondary ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '6px', cursor: 'pointer' }}
                                                >
                                                    {comp.hasSecondary ? '✓ 2차 포장 완료' : '+ 2차 포장 추가'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeComponent(comp.id)}
                                                    disabled={components.length <= 1}
                                                    style={{ padding: '4px 10px', fontSize: '11px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '6px', cursor: components.length <= 1 ? 'not-allowed' : 'pointer', opacity: components.length <= 1 ? 0.5 : 1 }}
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </div>

                                        {/* 1차 포장 섹션 */}
                                        <div style={{ marginBottom: comp.hasSecondary ? '20px' : 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>1차 포장 (내용물 용기)</span>
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setActiveTooltip(`p-${comp.id}`)}
                                                    onMouseLeave={() => setActiveTooltip(null)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#94a3b8', position: 'relative' }}
                                                >
                                                    ❓
                                                    {activeTooltip === `p-${comp.id}` && (
                                                        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', width: '220px', textAlign: 'left', zIndex: 10, lineHeight: '1.4', whiteSpace: 'pre-line', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                                            {helpTexts.primary}
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                                {['width', 'length', 'height'].map(field => (
                                                    <div key={field}>
                                                        <label style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                            {field === 'width' ? '가로' : field === 'length' ? '세로' : '높이'} (mm)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={comp.primary[field]}
                                                            onChange={e => updateComponentValue(comp.id, 'primary', field, parseFloat(e.target.value) || 0)}
                                                            style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px' }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 2차 포장 섹션 (활성화 시에만 노출) */}
                                        {comp.hasSecondary && (
                                            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>2차 포장 (개별 단상자)</span>
                                                    <button
                                                        type="button"
                                                        onMouseEnter={() => setActiveTooltip(`s-${comp.id}`)}
                                                        onMouseLeave={() => setActiveTooltip(null)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#94a3b8', position: 'relative' }}
                                                    >
                                                        ❓
                                                        {activeTooltip === `s-${comp.id}` && (
                                                            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', width: '220px', textAlign: 'left', zIndex: 10, lineHeight: '1.4', whiteSpace: 'pre-line', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                                                {helpTexts.secondary}
                                                            </div>
                                                        )}
                                                    </button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                                    {['width', 'length', 'height'].map(field => (
                                                        <div key={field}>
                                                            <label style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                                {field === 'width' ? '가로' : field === 'length' ? '세로' : '높이'} (mm)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={comp.secondary[field]}
                                                                onChange={e => updateComponentValue(comp.id, 'secondary', field, parseFloat(e.target.value) || 0)}
                                                                style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', background: '#fff' }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 세트 제품 전용: 공용 아웃박스 옵션 */}
                        {components.length > 1 && (
                            <div style={{ marginBottom: '24px', padding: '20px', background: '#f5f3ff', borderRadius: '12px', border: '1px solid #ddd6fe' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: useSharedOutbox ? '14px' : 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={useSharedOutbox}
                                        onChange={e => {
                                            setUseSharedOutbox(e.target.checked);
                                            setIsPlanningSet(e.target.checked);
                                        }}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        📦 개별 2차 포장 없이 공용 아웃박스에 같이 담김 (세트용)
                                        <button
                                            type="button"
                                            onMouseEnter={() => setActiveTooltip('shared-help')}
                                            onMouseLeave={() => setActiveTooltip(null)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#7c3aed', position: 'relative' }}
                                        >
                                            ❓
                                            {activeTooltip === 'shared-help' && (
                                                <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', width: '220px', textAlign: 'left', zIndex: 10, lineHeight: '1.4', whiteSpace: 'pre-line', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                                    {helpTexts.shared}
                                                </div>
                                            )}
                                        </button>
                                    </span>
                                </label>

                                {useSharedOutbox && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '10px' }}>
                                        {['width', 'length', 'height'].map(field => (
                                            <div key={field}>
                                                <label style={{ fontSize: '11px', color: '#6d28d9', fontWeight: '600' }}>
                                                    아웃박스 {field === 'width' ? '가로' : field === 'length' ? '세로' : '높이'} (mm)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={sharedOutbox[field]}
                                                    onChange={e => setSharedOutbox(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))}
                                                    style={{ ...inputStyle, padding: '8px 12px', border: '1.5px solid #ddd6fe', background: '#fff' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 최종 산출 규격 정보 및 실시간 요약 미리보기 */}
                        <div style={{
                            marginBottom: '24px',
                            padding: '16px 20px',
                            background: '#eff6ff',
                            borderRadius: '12px',
                            border: '1.5px solid #bfdbfe',
                        }}>
                            <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: '700', color: '#1e40af' }}>
                                📐 계산용 최종 포장 외부 규격 (자동 판정 대상)
                            </p>
                            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '600' }}>
                                    외형 치수: {calculatedSpec.width} × {calculatedSpec.length} × {calculatedSpec.height} mm
                                </span>
                                <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '600' }}>
                                    부피: {totalVolume.toFixed(1)} mL (cm³)
                                </span>
                                <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '600' }}>
                                    포장 겹수: {calculatedSpec.layers}겹
                                </span>
                                {parseFloat(contentVolumeMl) > 0 && (
                                    <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: '800', background: '#dbeafe', padding: '2px 8px', borderRadius: '6px' }}>
                                        공간 비율: {Math.max(0, ((1 - parseFloat(contentVolumeMl) / totalVolume) * 100)).toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 섹션 3: 옵션 토글 */}
                        <div style={{ marginBottom: '24px' }}>
                            <p style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⚙️ 추가 옵션</p>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                {[
                                    { id: 'isCleansing', checked: isCleansingProduct, setter: setIsCleansingProduct, label: '세정용 화장품 (한국 기준 15%)', color: '#3b82f6', icon: '🧼' },
                                    { id: 'isPlanningSet', checked: isPlanningSet, setter: setIsPlanningSet, label: '기획 세트 제품 (대만/일본/한국 25%)', color: '#8b5cf6', icon: '🎁' },
                                ].map(item => (
                                    <label key={item.id} htmlFor={item.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '12px 16px',
                                        borderRadius: '10px',
                                        border: `1.5px solid ${item.checked ? item.color + '50' : '#e2e8f0'}`,
                                        background: item.checked ? item.color + '08' : '#f8fafc',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        userSelect: 'none',
                                        flex: '1',
                                        minWidth: '200px',
                                    }}>
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '6px',
                                            border: `2px solid ${item.checked ? item.color : '#cbd5e1'}`,
                                            background: item.checked ? item.color : '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, transition: 'all 0.15s',
                                        }}>
                                            {item.checked && <span style={{ color: '#fff', fontSize: '12px', fontWeight: '800', lineHeight: 1 }}>✓</span>}
                                        </div>
                                        <input type="checkbox" id={item.id} checked={item.checked} onChange={e => item.setter(e.target.checked)} style={{ display: 'none' }} />
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: item.checked ? '#1e293b' : '#64748b' }}>
                                            {item.icon} {item.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 액션 버튼 */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                            <button type="button" onClick={handleReset} style={{
                                padding: '10px 20px', fontSize: '13px', fontWeight: '600',
                                color: '#64748b', background: '#fff',
                                border: '1.5px solid #e2e8f0', borderRadius: '10px',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                            >
                                초기화
                            </button>
                            <button type="submit" id="calc-form-submit" disabled={loading} style={{
                                padding: '10px 28px', fontSize: '13px', fontWeight: '700',
                                color: '#fff',
                                background: loading ? '#93c5fd' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                border: 'none', borderRadius: '10px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                transition: 'all 0.15s',
                            }}
                                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.35)'; } }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.25)'; }}
                            >
                                {loading ? (
                                    <>
                                        <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                                        계산 중...
                                    </>
                                ) : '🔍 계산하기'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── 에러 ── */}
                {error && (
                    <div style={{ padding: '14px 18px', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#dc2626', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* ── 결과 영역 ── */}
                {results.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* 결과 요약 헤더 */}
                        <div style={{ ...card, padding: '20px 28px', background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>시뮬레이션 결과</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>6개국 포장공간비율 적합 여부</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ textAlign: 'center', background: '#f0fdf4', borderRadius: '10px', padding: '10px 18px' }}>
                                        <div style={{ fontSize: '22px', fontWeight: '800', color: '#16a34a' }}>{passCount}</div>
                                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>적합</div>
                                    </div>
                                    <div style={{ textAlign: 'center', background: failCount > 0 ? '#fff1f2' : '#f8fafc', borderRadius: '10px', padding: '10px 18px' }}>
                                        <div style={{ fontSize: '22px', fontWeight: '800', color: failCount > 0 ? '#dc2626' : '#94a3b8' }}>{failCount}</div>
                                        <div style={{ fontSize: '10px', fontWeight: '700', color: failCount > 0 ? '#991b1b' : '#94a3b8', textTransform: 'uppercase' }}>부적합</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 최적화 역산 피드백 */}
                        {hasFailResult && !isPlanningSet && options.length > 0 && (
                            <div style={{
                                ...card,
                                background: '#fffbeb',
                                border: '1px solid #fcd34d',
                                padding: '24px 28px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '20px' }}>💡</span>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#92400e' }}>포장 규격 최적화 개선안 제안</h4>
                                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#b45309' }}>부적합 판정을 해소할 수 있는 포장재 가안 사이즈를 제안합니다</p>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                    {options.map((opt, idx) => (
                                        <div key={idx} style={{
                                            background: '#fff',
                                            borderRadius: '12px',
                                            border: '1px solid #fde68a',
                                            padding: '18px',
                                            display: 'flex', flexDirection: 'column', gap: '12px',
                                        }}>
                                            <div>
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>옵션 {String.fromCharCode(65 + idx)}</span>
                                                <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{opt.label}</p>
                                                <p style={{ margin: '6px 0 0', fontSize: '12px', fontFamily: 'monospace', color: '#334155', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>{opt.dims}</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                                <div>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>부피 절감</span>
                                                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#d97706', lineHeight: 1.1 }}>{opt.reduction}%</div>
                                                    <span style={{ fontSize: '10px', fontWeight: '700', color: opt.passesKorea ? '#16a34a' : '#dc2626' }}>
                                                        한국 {opt.passesKorea ? '✅ PASS' : '❌ FAIL'}
                                                    </span>
                                                </div>
                                                <button onClick={() => applyOption(opt)} style={{
                                                    padding: '8px 14px', fontSize: '12px', fontWeight: '700',
                                                    color: '#fff', background: '#f59e0b', border: 'none',
                                                    borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
                                                }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#d97706'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = '#f59e0b'; }}
                                                >적용하기</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 6개국 상세 결과 그리드 */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                            {sortedResults.map((res, idx) => {
                                const theme = countryColors[res.status] || countryColors['DEFAULT'];
                                const isExpanded = expandedCountry === res.country;
                                const isFail = res.status === 'FAIL';
                                const isPass = res.status === 'PASS';

                                return (
                                    <div key={idx} style={{
                                        borderRadius: '14px',
                                        border: `1.5px solid ${isFail ? '#fca5a5' : isPass ? '#86efac' : '#e2e8f0'}`,
                                        background: isFail ? '#fff8f8' : isPass ? '#f0fdf4' : '#fff',
                                        boxShadow: isFail ? '0 4px 12px rgba(220,38,38,0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
                                        overflow: 'hidden',
                                        transition: 'box-shadow 0.2s, transform 0.15s',
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = isFail ? '0 8px 20px rgba(220,38,38,0.12)' : '0 6px 16px rgba(0,0,0,0.08)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isFail ? '0 4px 12px rgba(220,38,38,0.08)' : '0 1px 3px rgba(0,0,0,0.05)'; }}
                                    >
                                        {/* 카드 상단 */}
                                        <div style={{ padding: '20px 22px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '28px' }}>{flagMap[res.country] || '🌐'}</span>
                                                    <div>
                                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{res.countryName}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{res.country}</div>
                                                    </div>
                                                </div>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800',
                                                    background: theme.badge, color: theme.badgeText,
                                                    letterSpacing: '0.05em', textTransform: 'uppercase',
                                                }}>
                                                    {statusLabel[res.status] || res.status}
                                                </span>
                                            </div>

                                            {/* 비율 수치 */}
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '32px', fontWeight: '900', color: theme.text, lineHeight: 1 }}>{res.ratioString}</span>
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>출처: {res.source}</div>
                                        </div>

                                        {/* 아코디언 */}
                                        <div style={{ borderTop: `1px solid ${isFail ? '#fecaca' : isPass ? '#bbf7d0' : '#f1f5f9'}` }}>
                                            <button onClick={() => setExpandedCountry(isExpanded ? null : res.country)} style={{
                                                width: '100%', padding: '12px 22px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                background: 'transparent', border: 'none', cursor: 'pointer',
                                                fontSize: '11px', fontWeight: '700', color: '#64748b',
                                                textTransform: 'uppercase', letterSpacing: '0.06em',
                                                transition: 'color 0.15s',
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.color = '#334155'}
                                                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                                            >
                                                <span>📋 세부 계산 공식</span>
                                                <span style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▼</span>
                                            </button>

                                            {isExpanded && (
                                                <div style={{ padding: '4px 22px 20px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
                                                    <div style={{ marginBottom: '14px' }}>
                                                        <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>적용 공식</p>
                                                        <code style={{ display: 'block', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px', color: '#1e293b', border: '1px solid #e2e8f0', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                            {res.formula}
                                                        </code>
                                                    </div>
                                                    {res.details && res.details.length > 0 && (
                                                        <div>
                                                            <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>계산 이력</p>
                                                            <ul style={{ margin: 0, paddingLeft: '18px', listStyle: 'disc' }}>
                                                                {res.details.map((d, i) => (
                                                                    <li key={i} style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.7' }}>{d}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 면책 조항 */}
                        <div style={{ padding: '14px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.7' }}>
                                ⚠️ <strong>면책조항</strong>: 본 계산 결과는 사내 참고용이며, 공식 시험 기관의 성적서와 다를 수 있습니다. 통관 및 제품 유통 시 최종 확인을 거치시기 바랍니다.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* 로딩 스피너 애니메이션 */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </AnalyticsDashboardShell>
    );
};

export default PackagingSpaceRatioCalculatorPage;
