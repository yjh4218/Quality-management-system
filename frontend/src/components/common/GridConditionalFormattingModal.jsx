import React, { useState, useEffect, useMemo } from 'react';

const PRESET_COLORS = [
    { bg: '#fee2e2', text: '#dc2626', label: '연빨강 (경고/위험)' },
    { bg: '#fef3c7', text: '#d97706', label: '연노랑 (주의/대기)' },
    { bg: '#dcfce7', text: '#16a34a', label: '연초록 (적합/완료)' },
    { bg: '#e0f2fe', text: '#0284c7', label: '연파랑 (정보/진행)' },
    { bg: '#ede9fe', text: '#7c3aed', label: '연보라 (기획/특수)' },
    { bg: '#f1f5f9', text: '#475569', label: '연회색 (기본/비활성)' }
];

/**
 * ⚙️ 그리드 맞춤형 조건부 서식 관리자 설정 모달
 * 
 * - 시스템 기본 색상 범례 (평탄 배열 / 그룹 배열 자동 정규화 지원)
 * - 관리자 전용 사용자 지정 조건부 서식 규칙 추가 / 항목별 수정 / 삭제 / 취소
 * - 모든 화면의 호출 규격 (rules/onSave or gridId/onApplyRules) 완벽 지원
 */
const GridConditionalFormattingModal = ({
    isOpen,
    onClose,
    columns = [],
    rules = [],
    onSave,
    onApplyRules,
    legends = [],
    gridId = 'default_grid'
}) => {
    const storageKey = `qms_grid_rules_${gridId}`;
    const [activeRules, setActiveRules] = useState([]);
    const [showLegends, setShowLegends] = useState(true);
    
    // 수정 모드 상태 (null이면 신규 추가 모드, 숫자면 해당 인덱스 수정 중)
    const [editingIndex, setEditingIndex] = useState(null);
    const [selectedLegendHint, setSelectedLegendHint] = useState('');

    // 폼 상태
    const [field, setField] = useState('');
    const [operator, setOperator] = useState('equals'); // 'equals' | 'contains' | 'startsWith' | 'endsWith'
    const [value, setValue] = useState('');
    const [bg, setBg] = useState('#fee2e2');
    const [text, setText] = useState('#dc2626');

    // 🎨 시스템 기본 범례 데이터 정규화 (1차원 평탄 배열 & 2차원 그룹 배열 100% 자동 지원)
    const normalizedLegends = useMemo(() => {
        if (!legends || !Array.isArray(legends) || legends.length === 0) return [];

        // 1. 단일 평탄 배열 형태 ([{ label, color, bg, desc, icon, scope }, ...])
        const firstItem = legends[0];
        if (firstItem && (firstItem.label || firstItem.color || firstItem.bg || firstItem.scope)) {
            return [{
                title: '시스템 기본 서식 범례',
                items: legends.map(item => ({
                    label: item.label || item.scope || '범례',
                    desc: item.desc || item.scope || '',
                    bg: item.bg || '#f1f5f9',
                    text: item.color || item.text || '#1e293b',
                    border: item.border || item.color || item.text || '#cbd5e1',
                    icon: item.icon || '🏷️',
                    scope: item.scope
                }))
            }];
        }

        // 2. 그룹화된 배열 형태 ([{ title: '...', items: [...] }, ...])
        return legends.map((group, idx) => ({
            title: group.title || `범례 그룹 ${idx + 1}`,
            items: (group.items || []).map(item => ({
                label: item.label || item.scope || '범례',
                desc: item.desc || item.scope || '',
                bg: item.bg || '#f1f5f9',
                text: item.text || item.color || '#1e293b',
                border: item.border || item.text || item.color || '#cbd5e1',
                icon: item.icon || '🏷️',
                scope: item.scope
            }))
        }));
    }, [legends]);

    useEffect(() => {
        if (isOpen) {
            // rules prop 우선 사용
            if (Array.isArray(rules) && rules.length > 0) {
                setActiveRules(rules);
            } else if (Array.isArray(rules)) {
                setActiveRules(rules);
            } else {
                try {
                    const saved = localStorage.getItem(storageKey);
                    setActiveRules(saved ? JSON.parse(saved) : []);
                } catch {
                    setActiveRules([]);
                }
            }

            if (columns.length > 0) {
                setField(columns[0].field);
            }
            setEditingIndex(null);
            setSelectedLegendHint('');
            setValue('');
        }
    }, [isOpen, rules, storageKey, columns]);

    if (!isOpen) return null;

    // 💡 기본 범례 항목을 선택하여 커스텀 규칙 폼에 불러오기 (수정/커스터마이징 모드)
    const handleSelectLegend = (item) => {
        // 1. 해당 범례의 scope 또는 label과 일치하는 컬럼 자동 매칭
        let matchedCol = columns.find(c => {
            const header = (c.headerName || '').toLowerCase();
            const fieldName = (c.field || '').toLowerCase();
            const scopeStr = (item.scope || '').toLowerCase();
            const labelStr = (item.label || '').toLowerCase();

            if (scopeStr && scopeStr !== '행 전체' && (header.includes(scopeStr) || fieldName.includes(scopeStr))) {
                return true;
            }
            if (labelStr && (header.includes(labelStr) || fieldName.includes(labelStr))) {
                return true;
            }
            return false;
        });

        if (!matchedCol && columns.length > 0) {
            matchedCol = columns[0];
        }

        if (matchedCol) {
            setField(matchedCol.field);
        }

        // 2. 키워드 추출 (예: '기획세트 (Planning Set)' -> '기획세트', '대표 마스터 제품 (M)' -> '마스터')
        let extractedVal = item.label || '';
        if (extractedVal.includes('(')) {
            extractedVal = extractedVal.split('(')[0].trim();
        }
        if (extractedVal.includes('대표 마스터')) {
            extractedVal = '마스터';
        } else if (extractedVal.includes('필수 정보')) {
            extractedVal = '';
        }

        setValue(extractedVal);
        setBg(item.bg || '#fee2e2');
        setText(item.text || '#dc2626');
        setOperator('contains');
        setEditingIndex(null); // 신규 추가 폼에 세팅
        setSelectedLegendHint(`[${item.label}] 기본 서식의 색상과 조건이 세팅되었습니다. 원하는 대로 수정 후 '규칙 추가'를 누르세요.`);
    };

    // 신규 규칙 추가
    const handleAddRule = () => {
        if (!field || !value.trim()) {
            alert('적용 대상 열과 조건 값을 모두 입력해주세요.');
            return;
        }
        const newRule = {
            id: 'rule_' + Date.now(),
            field,
            operator,
            value: value.trim(),
            bg,
            bgColor: bg,
            text,
            textColor: text
        };
        setActiveRules(prev => [...prev, newRule]);
        setValue('');
        setSelectedLegendHint('');
    };

    // 항목 수정 모드 진입
    const handleStartEdit = (rule, index) => {
        setEditingIndex(index);
        setSelectedLegendHint('');
        setField(rule.field || (columns[0]?.field || ''));
        setOperator(rule.operator || 'equals');
        setValue(rule.value || '');
        setBg(rule.bg || rule.bgColor || '#fee2e2');
        setText(rule.text || rule.textColor || '#dc2626');
    };

    // 항목 수정 완료 반영
    const handleSaveEdit = () => {
        if (editingIndex === null) return;
        if (!field || !value.trim()) {
            alert('적용 대상 열과 조건 값을 모두 입력해주세요.');
            return;
        }

        const updatedRule = {
            ...(activeRules[editingIndex] || {}),
            field,
            operator,
            value: value.trim(),
            bg,
            bgColor: bg,
            text,
            textColor: text
        };

        const nextRules = [...activeRules];
        nextRules[editingIndex] = updatedRule;
        setActiveRules(nextRules);

        // 수정 모드 종료 및 폼 리셋
        setEditingIndex(null);
        setSelectedLegendHint('');
        setValue('');
        if (columns.length > 0) setField(columns[0].field);
    };

    // 항목 수정 취소
    const handleCancelEdit = () => {
        setEditingIndex(null);
        setSelectedLegendHint('');
        setValue('');
        if (columns.length > 0) setField(columns[0].field);
    };

    // 항목 삭제
    const handleDeleteRule = (index) => {
        if (editingIndex === index) {
            handleCancelEdit();
        } else if (editingIndex !== null && editingIndex > index) {
            setEditingIndex(editingIndex - 1);
        }
        setActiveRules(prev => prev.filter((_, i) => i !== index));
    };

    // 최종 저장 및 적용
    const handleSave = () => {
        try {
            if (storageKey) {
                localStorage.setItem(storageKey, JSON.stringify(activeRules));
            }
        } catch (e) {
            console.error('Failed to save rules to localStorage', e);
        }

        if (onSave) {
            onSave(activeRules);
        }
        if (onApplyRules) {
            onApplyRules(activeRules);
        }
        onClose();
    };

    // 전체 초기화
    const handleReset = () => {
        if (window.confirm('모든 사용자 정의 서식 규칙을 초기화하시겠습니까?')) {
            setActiveRules([]);
            setEditingIndex(null);
            setSelectedLegendHint('');
            try {
                if (storageKey) {
                    localStorage.removeItem(storageKey);
                }
            } catch (e) {
                console.error('Failed to clear rules from localStorage', e);
            }

            if (onSave) {
                onSave([]);
            }
            if (onApplyRules) {
                onApplyRules([]);
            }
            onClose();
        }
    };

    // 범례 총 아이템 개수 계산
    const totalLegendItems = normalizedLegends.reduce((acc, g) => acc + (g.items?.length || 0), 0);

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div 
                className="modal-content" 
                style={{ 
                    width: '740px', 
                    maxWidth: '94vw', 
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '12px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                }} 
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>⚙️</span>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#1e293b' }}>
                                조건부 서식 (열/셀 색상 규칙) 설정
                            </h2>
                            <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                                시스템 기본 규칙을 클릭하여 원하는 색상/조건으로 수정·추가하거나 신규 서식 규칙을 생성합니다.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="secondary close-button" style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="modal-body white-bg" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>
                    
                    {/* 1. 🎨 시스템 기본 서식 범례 섹션 (클릭 시 선택 및 폼 로드 지원) */}
                    {normalizedLegends && normalizedLegends.length > 0 && totalLegendItems > 0 && (
                        <div style={{ 
                            background: '#f8fafc', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '8px', 
                            padding: '12px 14px' 
                        }}>
                            <div 
                                onClick={() => setShowLegends(!showLegends)}
                                style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                    <span>🎨</span>
                                    <span>시스템 기본 색상 범례 ({totalLegendItems}개)</span>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>— 항목을 클릭하면 수정 폼으로 바로 불러옵니다.</span>
                                </div>
                                <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                                    {showLegends ? '▲ 접기' : '▼ 펼쳐서 확인'}
                                </span>
                            </div>

                            {showLegends && (
                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {normalizedLegends.map((group, gIdx) => (
                                        <div key={gIdx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                                                📌 {group.title}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px' }}>
                                                {group.items?.map((item, iIdx) => (
                                                    <div 
                                                        key={iIdx}
                                                        onClick={() => handleSelectLegend(item)}
                                                        style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'space-between',
                                                            gap: '8px', 
                                                            padding: '8px 10px',
                                                            borderRadius: '6px',
                                                            background: item.bg,
                                                            border: `1.5px solid ${item.border}`,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                                        }}
                                                        title="클릭하여 이 기본 서식을 폼으로 불러와서 수정/적용합니다."
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                                            {item.icon && <span style={{ fontSize: '15px' }}>{item.icon}</span>}
                                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                                                <span style={{ 
                                                                    fontSize: '11.5px', 
                                                                    fontWeight: 800, 
                                                                    color: item.text,
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}>
                                                                    {item.label}
                                                                </span>
                                                                {item.desc && (
                                                                    <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {item.desc}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <span style={{
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            color: '#2563eb',
                                                            background: '#ffffff',
                                                            border: '1px solid #bfdbfe',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            ✏️ 선택 수정
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. ➕ 신규 규칙 추가 / ✏️ 규칙 수정 폼 */}
                    <div style={{ 
                        background: editingIndex !== null ? '#f0f9ff' : (selectedLegendHint ? '#f0fdf4' : '#f8fafc'), 
                        border: editingIndex !== null ? '2px solid #3b82f6' : (selectedLegendHint ? '2px solid #10b981' : '1px solid #cbd5e1'), 
                        borderRadius: '8px', 
                        padding: '14px',
                        transition: 'all 0.2s ease-in-out'
                    }}>
                        {/* 기본 범례 선택 안내 배너 */}
                        {selectedLegendHint && editingIndex === null && (
                            <div style={{ 
                                background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', 
                                padding: '6px 10px', borderRadius: '4px', fontSize: '11px', marginBottom: '8px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <span>💡 {selectedLegendHint}</span>
                                <button type="button" onClick={() => setSelectedLegendHint('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontSize: '12px' }}>✕</button>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: editingIndex !== null ? '#1d4ed8' : '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{editingIndex !== null ? '✏️' : '➕'}</span>
                                <span>{editingIndex !== null ? `조건부 서식 규칙 수정 (규칙 #${editingIndex + 1})` : '신규 조건부 서식 규칙 추가'}</span>
                            </div>
                            {editingIndex !== null && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    style={{ padding: '2px 8px', fontSize: '11px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    수정 취소
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr', gap: '8px', marginBottom: '10px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>적용 대상 열</label>
                                <select
                                    className="form-control"
                                    value={field}
                                    onChange={e => setField(e.target.value)}
                                    style={{ fontSize: '12px', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                >
                                    {columns.map(col => (
                                        <option key={col.field} value={col.field}>
                                            {col.headerName || col.field}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>조건</label>
                                <select
                                    className="form-control"
                                    value={operator}
                                    onChange={e => setOperator(e.target.value)}
                                    style={{ fontSize: '12px', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                >
                                    <option value="equals">일치 (==)</option>
                                    <option value="contains">포함 (Contains)</option>
                                    <option value="startsWith">시작 단어 (Starts with)</option>
                                    <option value="endsWith">끝 단어 (Ends with)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>조건 값 (키워드)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="예: 기획세트, CRITICAL"
                                    value={value}
                                    onChange={e => setValue(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (editingIndex !== null ? handleSaveEdit() : handleAddRule())}
                                    style={{ fontSize: '12px', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                />
                            </div>
                        </div>

                        {/* 프리셋 컬러 선택 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>색상 선택:</span>
                                {PRESET_COLORS.map((p, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => { setBg(p.bg); setText(p.text); }}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            background: p.bg,
                                            color: p.text,
                                            border: (bg === p.bg) ? `2px solid ${p.text}` : '1px solid #cbd5e1',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {p.label.split(' ')[0]}
                                    </button>
                                ))}
                            </div>

                            {editingIndex !== null ? (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        style={{ padding: '6px 12px', fontSize: '12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#64748b' }}
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="button"
                                        className="primary"
                                        onClick={handleSaveEdit}
                                        style={{ padding: '6px 16px', fontSize: '12px', fontWeight: 700, backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        ✓ 수정 완료
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="primary"
                                    onClick={handleAddRule}
                                    style={{ padding: '6px 16px', fontSize: '12px', fontWeight: 700, backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    규칙 추가
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 3. 📋 적용된 커스텀 서식 규칙 목록 (각 항목별 수정/삭제 지원) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                            📋 적용된 커스텀 서식 규칙 목록 ({activeRules.length}개)
                        </div>

                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {activeRules.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                                    설정된 커스텀 서식 규칙이 없습니다. 위에서 신규 규칙을 추가하세요.
                                </div>
                            ) : (
                                activeRules.map((rule, idx) => {
                                    const colName = columns.find(c => c.field === rule.field)?.headerName || rule.field;
                                    const opLabel = rule.operator === 'equals' ? '일치' : (rule.operator === 'contains' ? '포함' : (rule.operator === 'startsWith' ? '시작' : '끝'));
                                    const ruleBg = rule.bg || rule.bgColor || '#fee2e2';
                                    const ruleText = rule.text || rule.textColor || '#dc2626';
                                    const isEditingThis = editingIndex === idx;

                                    return (
                                        <div
                                            key={rule.id || idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: isEditingThis ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                                background: isEditingThis ? '#eff6ff' : '#ffffff',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                                {isEditingThis && (
                                                    <span style={{ fontSize: '10px', background: '#3b82f6', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                                                        수정중
                                                    </span>
                                                )}
                                                <span style={{ fontWeight: 700, color: '#1e293b' }}>[{colName}]</span>
                                                <span style={{ color: '#64748b' }}>{opLabel}:</span>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    background: ruleBg,
                                                    color: ruleText,
                                                    fontWeight: 700,
                                                    border: `1px solid ${ruleText}40`
                                                }}>
                                                    "{rule.value}"
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleStartEdit(rule, idx)}
                                                    style={{ 
                                                        background: '#f1f5f9', 
                                                        border: '1px solid #cbd5e1', 
                                                        borderRadius: '4px',
                                                        color: '#2563eb', 
                                                        cursor: 'pointer', 
                                                        fontSize: '11px', 
                                                        padding: '3px 8px',
                                                        fontWeight: 600
                                                    }}
                                                    title="규칙 수정"
                                                >
                                                    ✏️ 수정
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRule(idx)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}
                                                    title="규칙 삭제"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={handleReset}
                        style={{ padding: '6px 12px', fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        ♻️ 전체 초기화
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            style={{ padding: '6px 14px', fontSize: '12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
                        >
                            취소
                        </button>
                        <button 
                            type="button" 
                            onClick={handleSave} 
                            style={{ padding: '6px 18px', fontSize: '12px', fontWeight: 700, background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            저장 및 적용
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GridConditionalFormattingModal;
