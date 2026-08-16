import React, { useState, useMemo } from 'react';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import NumericFormattedInput from './components/common/NumericFormattedInput';
import { 
    calculateAllCountrySpaceRatios, 
    calculateBoxVolume, 
    calculateTotalContainersVolume, 
    generateOptimizationSuggestions 
} from './utils/packagingRatioCalculator';

/**
 * 6개국(한국, 중국, 대만, 유럽, 미국, 일본) 화장품 포장공간비율 계산기
 * - 1차 용기 형태별(원기둥/직육면체/직접입력) 부피 및 수량 곱연산
 * - 2차 단상자 외형 규격 기반 6개국 실시간 동시 연산 및 최적화 역산
 */
const PackagingSpaceRatioCalculatorPage = ({ user, onNavigate }) => {
    // 1. 2차 단상자 외형 규격 (mm)
    const [secondaryBox, setSecondaryBox] = useState({
        width: 105,
        depth: 80,
        height: 150
    });

    // 2. 1차 용기 목록 (형태, 치수, 용량, 수량)
    const [primaryContainers, setPrimaryContainers] = useState([
        {
            id: 1,
            name: '본품 용기 1',
            shape: 'cylinder', // 'cylinder' | 'rect' | 'custom_volume'
            diameter: 45,
            width: 45,
            depth: 45,
            height: 135,
            capacity_ml: 50,
            quantity: 1
        }
    ]);

    // 3. 국가별 세부 옵션
    const [productCategory, setProductCategory] = useState('GENERAL'); // 'GENERAL' | 'CLEANSING' | 'SET'
    const [chinaKValue, setChinaKValue] = useState(9.0);
    const [isElectricDeviceIncluded, setIsElectricDeviceIncluded] = useState(false);
    const [taiwanCValue, setTaiwanCValue] = useState(3.1); // 3.1: 단일재질, 2.7: 복합재질
    const [packagingLayers, setPackagingLayers] = useState(2);

    // 툴팁 및 UI 상태
    const [activeTooltip, setActiveTooltip] = useState(null);
    const [expandedCountry, setExpandedCountry] = useState(null);
    const [hasCalculated, setHasCalculated] = useState(true); // 기본 실시간 연산

    // 용기 추가
    const addContainer = () => {
        const nextId = primaryContainers.length > 0 ? Math.max(...primaryContainers.map(c => c.id)) + 1 : 1;
        setPrimaryContainers([
            ...primaryContainers,
            {
                id: nextId,
                name: `용기 ${nextId}`,
                shape: 'cylinder',
                diameter: 40,
                width: 40,
                depth: 40,
                height: 100,
                capacity_ml: 30,
                quantity: 1
            }
        ]);
        import('react-toastify').then(({ toast }) => toast.success('새 1차 용기가 추가되었습니다.'));
    };

    // 용기 제거
    const removeContainer = (id) => {
        if (primaryContainers.length <= 1) {
            import('react-toastify').then(({ toast }) => toast.warn('최소 1개 이상의 1차 용기가 필요합니다.'));
            return;
        }
        setPrimaryContainers(primaryContainers.filter(c => c.id !== id));
        import('react-toastify').then(({ toast }) => toast.info('용기가 제거되었습니다.'));
    };

    // 용기 필드 수정
    const updateContainer = (id, field, value) => {
        setPrimaryContainers(primaryContainers.map(c => {
            if (c.id === id) {
                return { ...c, [field]: value };
            }
            return c;
        }));
    };

    // 2차 단상자 필드 수정
    const updateBox = (field, value) => {
        setSecondaryBox(prev => ({
            ...prev,
            [field]: parseFloat(value) || 0
        }));
    };

    // 실시간 부피 계산 (mm³ 및 mL)
    const boxVolumeMm3 = useMemo(() => calculateBoxVolume(secondaryBox), [secondaryBox]);
    const totalContentVolumeMm3 = useMemo(() => calculateTotalContainersVolume(primaryContainers), [primaryContainers]);
    const boxVolumeMl = boxVolumeMm3 / 1000;
    const totalContentVolumeMl = totalContentVolumeMm3 / 1000;

    // 6개국 공간비율 실시간 연산 결과
    const results = useMemo(() => {
        return calculateAllCountrySpaceRatios({
            secondaryBox,
            primaryContainers,
            productCategory,
            chinaKValue: parseFloat(chinaKValue) || 9.0,
            isElectricDeviceIncluded,
            taiwanCValue: parseFloat(taiwanCValue) || 3.1,
            packagingLayers: parseInt(packagingLayers, 10) || 2
        });
    }, [secondaryBox, primaryContainers, productCategory, chinaKValue, isElectricDeviceIncluded, taiwanCValue, packagingLayers]);

    // 최적화 역산 제안 옵션
    const optimizationOptions = useMemo(() => {
        return generateOptimizationSuggestions({
            secondaryBox,
            primaryContainers,
            productCategory
        });
    }, [secondaryBox, primaryContainers, productCategory]);

    // 역산 제안 사이즈 적용
    const handleApplyOption = (opt) => {
        setSecondaryBox({
            width: opt.newW,
            depth: opt.newD,
            height: opt.newH
        });
        import('react-toastify').then(({ toast }) => toast.success(`단상자 규격이 ${opt.dims}로 조정되었습니다.`));
    };

    // 폼 초기화
    const handleReset = () => {
        setSecondaryBox({ width: 105, depth: 80, height: 150 });
        setPrimaryContainers([
            {
                id: 1,
                name: '본품 용기 1',
                shape: 'cylinder',
                diameter: 45,
                width: 45,
                depth: 45,
                height: 135,
                capacity_ml: 50,
                quantity: 1
            }
        ]);
        setProductCategory('GENERAL');
        setChinaKValue(9.0);
        setIsElectricDeviceIncluded(false);
        setTaiwanCValue(3.1);
        setPackagingLayers(2);
        import('react-toastify').then(({ toast }) => toast.info('입력값이 초기화되었습니다.'));
    };

    // 카드 스타일
    const cardStyle = {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontSize: '12px',
        fontWeight: '800',
        color: '#475569'
    };

    const inputStyle = {
        width: '100%',
        padding: '8px 12px',
        fontSize: '13px',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        backgroundColor: '#fff',
        outline: 'none',
        boxSizing: 'border-box'
    };

    return (
        <AnalyticsDashboardShell
            icon="📐"
            title="국가별 포장공간비율 계산기 (6개국 통합)"
            subtitle="한국, 중국, 대만, 유럽, 미국, 일본의 최신 환경 규제 및 법적 기준에 맞춘 포장공간비율 자동 검증 및 규격 역산 시뮬레이터"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: '"Inter", "Outfit", system-ui, sans-serif' }}>
                
                {/* ── 6개국 규제 요약 배너 ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '12px'
                }}>
                    {[
                        { flag: '🇰🇷', country: '대한민국', rule: '환경부 고시', limit: '10% / 15% / 25%', type: '법적 강제', color: '#2563eb' },
                        { flag: '🇨🇳', country: '중국', rule: 'GB 23350-2021', limit: 'K=9.0 공극률', type: '법적 강제', color: '#dc2626' },
                        { flag: '🇹🇼', country: '대만', rule: '자원회수법(선물세트)', limit: 'PVR ≤ 1.00', type: '법적 강제', color: '#059669' },
                        { flag: '🇪🇺', country: '유럽 (EU)', rule: 'PPWR Article 24', limit: '수송포장 40~50%', type: '참고용', color: '#7c3aed' },
                        { flag: '🇺🇸', country: '미국', rule: 'Slack-Fill', limit: '소송 리스크 관리', type: '참고용', color: '#d97706' },
                        { flag: '🇯🇵', country: '일본', rule: '용기포장리사이클법', limit: '자율규약', type: '참고용', color: '#475569' }
                    ].map(c => (
                        <div key={c.country} style={{
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '26px' }}>{c.flag}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{c.country}</span>
                                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: c.type === '법적 강제' ? '#fee2e2' : '#f1f5f9', color: c.type === '법적 강제' ? '#b91c1c' : '#64748b' }}>{c.type}</span>
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: c.color, marginTop: '2px' }}>{c.limit}</div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.rule}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── 2단 메인 레이아웃: 좌측(입력 폼) / 우측(6개국 판정 카드) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.1fr) minmax(440px, 1.2fr)', gap: '24px', alignItems: 'start' }}>
                    
                    {/* [좌측] 입력 영역 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* 1. 2차 단상자 규격 */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                <span style={{ fontSize: '18px' }}>📦</span>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>2차 단상자 외형 규격 (Secondary Box)</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>개별 제품을 감싸는 외부 단상자의 외측 치수를 입력하세요.</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>가로 (W, mm)</label>
                                    <input
                                        type="number"
                                        value={secondaryBox.width || ''}
                                        onChange={e => updateBox('width', e.target.value)}
                                        style={inputStyle}
                                        placeholder="105"
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>세로/깊이 (D, mm)</label>
                                    <input
                                        type="number"
                                        value={secondaryBox.depth || ''}
                                        onChange={e => updateBox('depth', e.target.value)}
                                        style={inputStyle}
                                        placeholder="80"
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>높이 (H, mm)</label>
                                    <input
                                        type="number"
                                        value={secondaryBox.height || ''}
                                        onChange={e => updateBox('height', e.target.value)}
                                        style={inputStyle}
                                        placeholder="150"
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>단상자 총 부피 (Box Volume):</span>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb' }}>
                                    {boxVolumeMm3.toLocaleString()} mm³ ({boxVolumeMl.toFixed(1)} mL)
                                </span>
                            </div>
                        </div>

                        {/* 2. 1차 용기 목록 (Primary Containers) */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '18px' }}>🧪</span>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>1차 용기 목록 (Primary Containers)</h3>
                                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>단상자 안에 들어가는 내용물 용기를 등록하세요. (복수 등록 가능)</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={addContainer}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        backgroundColor: '#2563eb',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ➕ 용기 추가
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {primaryContainers.map((c, idx) => (
                                    <div key={c.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#fafafa' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 6px', background: '#e2e8f0', borderRadius: '4px', color: '#475569' }}>
                                                    #{idx + 1}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={c.name}
                                                    onChange={e => updateContainer(c.id, 'name', e.target.value)}
                                                    style={{ border: 'none', borderBottom: '1px solid #cbd5e1', padding: '2px 4px', fontSize: '13px', fontWeight: '700', outline: 'none', background: 'transparent', width: '130px' }}
                                                    placeholder="용기명"
                                                />
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <select
                                                    value={c.shape}
                                                    onChange={e => updateContainer(c.id, 'shape', e.target.value)}
                                                    style={{ padding: '4px 8px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                                                >
                                                    <option value="cylinder">🔵 원기둥 (Cylinder)</option>
                                                    <option value="rect">📦 직육면체 (Rectangular)</option>
                                                    <option value="custom_volume">🧪 직접입력 (mL)</option>
                                                </select>

                                                {primaryContainers.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeContainer(c.id)}
                                                        style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                    >
                                                        삭제
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* 형태별 입력 필드 */}
                                        <div style={{ display: 'grid', gridTemplateColumns: c.shape === 'cylinder' ? 'repeat(4, 1fr)' : c.shape === 'rect' ? 'repeat(5, 1fr)' : 'repeat(2, 1fr)', gap: '8px', alignItems: 'flex-end' }}>
                                            {c.shape === 'cylinder' && (
                                                <>
                                                    <div>
                                                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>지름 (D, mm)</label>
                                                        <input
                                                            type="number"
                                                            value={c.diameter || ''}
                                                            onChange={e => updateContainer(c.id, 'diameter', e.target.value)}
                                                            style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }}
                                                            placeholder="45"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>높이 (H, mm)</label>
                                                        <input
                                                            type="number"
                                                            value={c.height || ''}
                                                            onChange={e => updateContainer(c.id, 'height', e.target.value)}
                                                            style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }}
                                                            placeholder="135"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {c.shape === 'rect' && (
                                                <>
                                                    <div>
                                                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>가로 (W, mm)</label>
                                                        <input
                                                            type="number"
                                                            value={c.width || ''}
                                                            onChange={e => updateContainer(c.id, 'width', e.target.value)}
                                                            style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }}
                                                            placeholder="45"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>세로 (D, mm)</label>
                                                        <input
                                                            type="number"
                                                            value={c.depth || ''}
                                                            onChange={e => updateContainer(c.id, 'depth', e.target.value)}
                                                            style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }}
                                                            placeholder="45"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>높이 (H, mm)</label>
                                                        <input
                                                            type="number"
                                                            value={c.height || ''}
                                                            onChange={e => updateContainer(c.id, 'height', e.target.value)}
                                                            style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }}
                                                            placeholder="135"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>내용량 (mL)</label>
                                                <input
                                                    type="number"
                                                    value={c.capacity_ml || ''}
                                                    onChange={e => updateContainer(c.id, 'capacity_ml', e.target.value)}
                                                    style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }}
                                                    placeholder="50"
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>수량 (개)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={c.quantity || 1}
                                                    onChange={e => updateContainer(c.id, 'quantity', e.target.value)}
                                                    style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }}
                                                    placeholder="1"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>총 내용물/용기 체적:</span>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#059669' }}>
                                    {Math.round(totalContentVolumeMm3).toLocaleString()} mm³ ({totalContentVolumeMl.toFixed(1)} mL)
                                </span>
                            </div>
                        </div>

                        {/* 3. 국가별 세부 옵션 */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                <span style={{ fontSize: '18px' }}>⚙️</span>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>국가별 세부 규정 옵션 (Options)</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>품목 분류 및 각국 표준 계수를 지정하세요.</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                                {/* 품목 분류 (한국/대만 기준 분기) */}
                                <div>
                                    <label style={labelStyle}>🇰🇷 제품 품목 유형</label>
                                    <select
                                        value={productCategory}
                                        onChange={e => setProductCategory(e.target.value)}
                                        style={{ ...inputStyle, height: '38px' }}
                                    >
                                        <option value="GENERAL">그 외 일반 화장품 (기준: 10% 이하)</option>
                                        <option value="CLEANSING">인체·두발 세정용 제품 (기준: 15% 이하)</option>
                                        <option value="SET">종합제품 / 기획세트 (기준: 25% 이하)</option>
                                    </select>
                                </div>

                                {/* 중국 K값 */}
                                <div>
                                    <label style={labelStyle}>
                                        🇨🇳 중국 K값 (기본 9.0)
                                        <span title="GB 23350-2021: 일반 액상/크림 9.0, 파우더 15.0, 왁스 20.0" style={{ cursor: 'pointer', marginLeft: '4px' }}>ℹ️</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={chinaKValue}
                                        onChange={e => setChinaKValue(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>

                                {/* 대만 C값 */}
                                <div>
                                    <label style={labelStyle}>🇹🇼 대만 C값 (재질 계수)</label>
                                    <select
                                        value={taiwanCValue}
                                        onChange={e => setTaiwanCValue(parseFloat(e.target.value))}
                                        style={{ ...inputStyle, height: '38px' }}
                                    >
                                        <option value={3.1}>단일 재질 (C = 3.1)</option>
                                        <option value={2.7}>복합/기타 재질 (C = 2.7)</option>
                                    </select>
                                </div>

                                {/* 포장 횟수/층수 */}
                                <div>
                                    <label style={labelStyle}>포장 횟수 / 층수 (Layers)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="6"
                                        value={packagingLayers}
                                        onChange={e => setPackagingLayers(parseInt(e.target.value, 10) || 2)}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            {/* 전동기구 동봉 옵션 */}
                            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    id="electric-device-chk"
                                    checked={isElectricDeviceIncluded}
                                    onChange={e => setIsElectricDeviceIncluded(e.target.checked)}
                                    style={{ width: '16px', height: '16px' }}
                                />
                                <label htmlFor="electric-device-chk" style={{ fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                                    ⚡ 전동 미용기기 동봉 제품 (중국 K값 1.5배 가산 적용)
                                </label>
                            </div>

                            {/* 액션 버튼 */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '700', background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    ♻️ 초기화
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* [우측] 6개국 동시 판정 결과 카드 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#1e293b' }}>
                                📊 6개국 포장공간비율 판정 결과
                            </h3>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                                입력값 실시간 자동 연산 중
                            </span>
                        </div>

                        {/* 6개국 결과 카드 리스트 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {results.map((r) => {
                                const isPass = r.status === 'PASS';
                                const isFail = r.status === 'FAIL';
                                const isRefer = r.badgeType === 'REFERENCE_ONLY';
                                const isNotApplicable = r.status === 'NOT_APPLICABLE';

                                let cardBorder = '#e2e8f0';
                                let cardBg = '#fff';
                                let badgeBg = '#f1f5f9';
                                let badgeText = '#475569';

                                if (isPass) {
                                    cardBorder = '#bbf7d0';
                                    cardBg = '#f0fdf4';
                                    badgeBg = '#dcfce7';
                                    badgeText = '#15803d';
                                } else if (isFail) {
                                    cardBorder = '#fecaca';
                                    cardBg = '#fff1f2';
                                    badgeBg = '#fee2e2';
                                    badgeText = '#b91c1c';
                                } else if (isRefer) {
                                    cardBorder = '#ddd6fe';
                                    cardBg = '#faf5ff';
                                    badgeBg = '#ede9fe';
                                    badgeText = '#6d28d9';
                                }

                                return (
                                    <div key={r.countryCode} style={{
                                        borderRadius: '14px',
                                        border: `1.5px solid ${cardBorder}`,
                                        background: cardBg,
                                        padding: '18px 20px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                                        transition: 'all 0.2s'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '22px' }}>{r.flag}</span>
                                                <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{r.countryName}</span>
                                                {r.isLegalForce ? (
                                                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b' }}>법적 강제</span>
                                                ) : (
                                                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b' }}>참고용</span>
                                                )}
                                            </div>

                                            {/* 배지 표시 */}
                                            <div>
                                                {r.badgeType === 'LEGAL_DECISION' && (
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: '800',
                                                        background: badgeBg,
                                                        color: badgeText
                                                    }}>
                                                        {isPass ? '✓ 적합' : '✕ 부적합'}
                                                    </span>
                                                )}
                                                {r.badgeType === 'OFFICIAL_VALUE' && (
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: '800',
                                                        background: '#e0e7ff',
                                                        color: '#3730a3'
                                                    }}>
                                                        공식 산출치
                                                    </span>
                                                )}
                                                {r.badgeType === 'REFERENCE_ONLY' && (
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: '800',
                                                        background: badgeBg,
                                                        color: badgeText
                                                    }}>
                                                        참고용 (Reference Only)
                                                    </span>
                                                )}
                                                {r.badgeType === 'NOT_APPLICABLE' && (
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        background: '#f1f5f9',
                                                        color: '#64748b'
                                                    }}>
                                                        해당 없음 (N/A)
                                                    </span>
                                                )}
                                                {r.badgeType === 'NO_BADGE' && (
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '13px',
                                                        fontWeight: '800',
                                                        background: '#f8fafc',
                                                        color: '#0f172a',
                                                        border: '1px solid #cbd5e1'
                                                    }}>
                                                        {r.title}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 수치 및 요약 */}
                                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                                            {r.summary}
                                        </div>

                                        {/* 상세 설명 */}
                                        <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', marginBottom: '8px' }}>
                                            {r.detailDescription}
                                        </div>

                                        {/* 플래그 경고 */}
                                        {r.flags && r.flags.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                                {r.flags.map((flag, fIdx) => (
                                                    <span key={fIdx} style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                                                        {flag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* 법령명 */}
                                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '6px' }}>
                                            📜 근거: {r.lawName}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 규격 최적화 역산 시뮬레이터 (부적합 발생 시 또는 개선용) */}
                        {optimizationOptions.length > 0 && (
                            <div style={{
                                ...cardStyle,
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                padding: '20px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '20px' }}>💡</span>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#92400e' }}>
                                            포장 규격 최적화 역산 제안 (Optimization Simulator)
                                        </h4>
                                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#b45309' }}>
                                            단상자 치수를 줄여 공간비율을 개선할 수 있는 권장 가안 사이즈입니다.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                                    {optimizationOptions.map((opt, idx) => (
                                        <div key={idx} style={{
                                            background: '#fff',
                                            borderRadius: '10px',
                                            border: '1px solid #fde68a',
                                            padding: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            gap: '8px'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>{opt.icon} {opt.label}</span>
                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: opt.passesKorea ? '#16a34a' : '#dc2626' }}>
                                                        {opt.newRatio}%
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontFamily: 'monospace' }}>
                                                    {opt.dims}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                <span style={{ fontSize: '11px', color: '#d97706', fontWeight: '700' }}>부피 {opt.reduction}% 절감</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleApplyOption(opt)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        background: '#fef3c7',
                                                        color: '#92400e',
                                                        border: '1px solid #fde68a',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    대입 ↵
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AnalyticsDashboardShell>
    );
};

export default PackagingSpaceRatioCalculatorPage;
