import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { usePermissions } from '../../usePermissions';
import { getSystemSetting, saveSystemSetting, deleteSystemSetting } from '../../api';

const PRESET_COLORS = [
    { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5', label: '연빨강 (경고/위험)' },
    { bg: '#fef3c7', text: '#d97706', border: '#fcd34d', label: '연노랑 (주의/대기)' },
    { bg: '#dcfce7', text: '#16a34a', border: '#86efac', label: '연초록 (적합/완료)' },
    { bg: '#e0f2fe', text: '#0284c7', border: '#7dd3fc', label: '연파랑 (정보/진행)' },
    { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd', label: '연보라 (기획/특수)' },
    { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: '연회색 (기본/비활성)' }
];

/**
 * 범례 배열 정규화 헬퍼 (단일 평탄 배열 및 그룹화 배열 모두 지원)
 */
const normalizeRawLegends = (rawLegends) => {
    if (!rawLegends || !Array.isArray(rawLegends) || rawLegends.length === 0) return [];

    const firstItem = rawLegends[0];
    if (firstItem && (firstItem.label || firstItem.color || firstItem.bg || firstItem.scope || firstItem.text)) {
        return [{
            title: '시스템 기본 서식 범례',
            items: rawLegends.map((item, idx) => ({
                id: item.id || `leg_item_${idx}_${Date.now()}`,
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

    return rawLegends.map((group, gIdx) => ({
        title: group.title || `범례 그룹 ${gIdx + 1}`,
        items: (group.items || []).map((item, iIdx) => ({
            id: item.id || `leg_${gIdx}_${iIdx}_${Date.now()}`,
            label: item.label || item.scope || '범례',
            desc: item.desc || item.scope || '',
            bg: item.bg || '#f1f5f9',
            text: item.text || item.color || '#1e293b',
            border: item.border || item.text || item.color || '#cbd5e1',
            icon: item.icon || '🏷️',
            scope: item.scope
        }))
    }));
};

/**
 * ⚙️ 그리드 맞춤형 조건부 서식 관리자 설정 모달
 * 
 * - 시스템 기본 색상 범례: 권한(GRID_SYSTEM_LEGEND_VIEW / MANAGE)에 따른 노출/숨김 및 수정/저장/복원
 * - 사용자 정의 조건부 서식 규칙 추가 / 항목별 수정 / 삭제 / 취소
 */
const GridConditionalFormattingModal = ({
    isOpen,
    onClose,
    columns = [],
    rules = [],
    onSave,
    onApplyRules,
    legends = [],
    gridId = 'default_grid',
    user = null,
    onLegendsChange = null
}) => {
    // 🔐 1. 사용자 권한 판정
    const effectiveUser = useMemo(() => {
        if (user) return user;
        try {
            const cached = localStorage.getItem('user_info');
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    }, [user]);

    const { canViewSystemLegend, canManageSystemLegend } = usePermissions(effectiveUser);

    // 🔑 2. 스토리지 및 설정 키 계산
    const effectiveGridId = useMemo(() => {
        if (gridId && gridId !== 'default_grid') return gridId;
        if (legends?.[0]?.title) return encodeURIComponent(legends[0].title);
        return 'default_grid';
    }, [gridId, legends]);

    const rulesStorageKey = `qms_grid_rules_${effectiveGridId}`;
    const legendStorageKey = `qms_system_legends_${effectiveGridId}`;
    const legendSettingKey = `GRID_SYSTEM_LEGENDS_${effectiveGridId}`;

    // 🎨 3. 기본 범례 데이터 정규화 및 커스텀 범례 상태
    const defaultNormalizedLegends = useMemo(() => normalizeRawLegends(legends), [legends]);

    const [activeRules, setActiveRules] = useState([]);
    const [showLegends, setShowLegends] = useState(true);

    // 시스템 범례 상태
    const [currentLegends, setCurrentLegends] = useState(() => {
        try {
            const saved = localStorage.getItem(legendStorageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return normalizeRawLegends(parsed);
            }
        } catch {
            // fallback
        }
        return defaultNormalizedLegends;
    });

    // 시스템 범례 편집 모드 상태
    const [isLegendEditing, setIsLegendEditing] = useState(false);
    const [editingLegendsDraft, setEditingLegendsDraft] = useState([]);
    const [isSavingLegends, setIsSavingLegends] = useState(false);

    // 서식 규칙 수정 모드 상태 (null이면 신규 추가 모드, 숫자면 해당 인덱스 수정 중)
    const [editingIndex, setEditingIndex] = useState(null);
    const [selectedLegendHint, setSelectedLegendHint] = useState('');

    // 서식 규칙 폼 상태
    const [field, setField] = useState('');
    const [operator, setOperator] = useState('equals'); // 'equals' | 'contains' | 'startsWith' | 'endsWith'
    const [value, setValue] = useState('');
    const [bg, setBg] = useState('#fee2e2');
    const [text, setText] = useState('#dc2626');

    // 🔄 원격 백엔드 시스템 범례 비동기 동기화
    const syncRemoteLegends = useCallback(async () => {
        if (!canViewSystemLegend) return;
        try {
            const res = await getSystemSetting(legendSettingKey);
            if (res?.data?.settingValue) {
                const parsed = JSON.parse(res.data.settingValue);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const normalized = normalizeRawLegends(parsed);
                    setCurrentLegends(normalized);
                    localStorage.setItem(legendStorageKey, JSON.stringify(normalized));
                    if (onLegendsChange) onLegendsChange(normalized);
                }
            }
        } catch {
            // 원격 설정 미존재 시 로컬/기본값 유지
        }
    }, [canViewSystemLegend, legendSettingKey, legendStorageKey, onLegendsChange]);

    useEffect(() => {
        if (isOpen) {
            // 1. rules 설정
            if (Array.isArray(rules) && rules.length > 0) {
                setActiveRules(rules);
            } else if (Array.isArray(rules)) {
                setActiveRules(rules);
            } else {
                try {
                    const saved = localStorage.getItem(rulesStorageKey);
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
            setIsLegendEditing(false);

            // 2. 백엔드 시스템 범례 동기화
            syncRemoteLegends();
        }
    }, [isOpen, rules, rulesStorageKey, columns, syncRemoteLegends]);

    if (!isOpen) return null;

    // 💡 기본 범례 항목을 선택하여 커스텀 규칙 폼에 불러오기 (수정/커스터마이징 모드)
    const handleSelectLegend = (item) => {
        if (isLegendEditing) return; // 편집 중에는 선택 불가

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
        setEditingIndex(null);
        setSelectedLegendHint(`[${item.label}] 기본 서식의 색상과 조건이 세팅되었습니다. 원하는 대로 수정 후 '규칙 추가'를 누르세요.`);
    };

    // ==========================================
    // 🎨 시스템 범례 편집 모드 관련 액션 핸들러
    // ==========================================
    const handleStartLegendEdit = () => {
        setEditingLegendsDraft(JSON.parse(JSON.stringify(currentLegends)));
        setIsLegendEditing(true);
        setShowLegends(true);
    };

    const handleCancelLegendEdit = () => {
        setIsLegendEditing(false);
        setEditingLegendsDraft([]);
    };

    const handleUpdateLegendItem = (groupIndex, itemIndex, fieldKey, val) => {
        setEditingLegendsDraft(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            if (next[groupIndex]?.items?.[itemIndex]) {
                next[groupIndex].items[itemIndex][fieldKey] = val;
                // 배경색 변경 시 테두리 색상도 기본적으로 연동
                if (fieldKey === 'bg') {
                    next[groupIndex].items[itemIndex].border = val;
                }
            }
            return next;
        });
    };

    const handleAddLegendItem = (groupIndex) => {
        setEditingLegendsDraft(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            if (!next[groupIndex]) return prev;
            next[groupIndex].items.push({
                id: `leg_custom_${Date.now()}`,
                label: '신규 범례 항목',
                desc: '범례 설명을 입력하세요',
                bg: '#fee2e2',
                text: '#dc2626',
                border: '#fca5a5',
                icon: '🏷️'
            });
            return next;
        });
    };

    const handleDeleteLegendItem = (groupIndex, itemIndex) => {
        setEditingLegendsDraft(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            if (next[groupIndex]?.items) {
                next[groupIndex].items.splice(itemIndex, 1);
            }
            return next;
        });
    };

    const handleSaveSystemLegends = async () => {
        setIsSavingLegends(true);
        try {
            const jsonStr = JSON.stringify(editingLegendsDraft);
            await saveSystemSetting(legendSettingKey, jsonStr);
            localStorage.setItem(legendStorageKey, jsonStr);
            setCurrentLegends(editingLegendsDraft);
            setIsLegendEditing(false);
            toast.success('시스템 기본 서식 범례가 성공적으로 저장되었습니다.');
            if (onLegendsChange) onLegendsChange(editingLegendsDraft);
        } catch (err) {
            toast.error('시스템 범례 저장 실패: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSavingLegends(false);
        }
    };

    const handleResetSystemLegends = async () => {
        if (!window.confirm('시스템 기본 범례를 최초 시스템 기본값으로 복원하시겠습니까?')) return;
        setIsSavingLegends(true);
        try {
            await deleteSystemSetting(legendSettingKey).catch(() => {});
            localStorage.removeItem(legendStorageKey);
            const resetLegends = normalizeRawLegends(legends);
            setCurrentLegends(resetLegends);
            setIsLegendEditing(false);
            setEditingLegendsDraft([]);
            toast.info('시스템 기본 서식 범례가 최초 기본값으로 복원되었습니다.');
            if (onLegendsChange) onLegendsChange(resetLegends);
        } catch (err) {
            toast.error('시스템 범례 복원 실패: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSavingLegends(false);
        }
    };

    // ==========================================
    // 📋 조건부 서식 커스텀 규칙 관련 핸들러
    // ==========================================
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

    const handleStartEdit = (rule, index) => {
        setEditingIndex(index);
        setSelectedLegendHint('');
        setField(rule.field || (columns[0]?.field || ''));
        setOperator(rule.operator || 'equals');
        setValue(rule.value || '');
        setBg(rule.bg || rule.bgColor || '#fee2e2');
        setText(rule.text || rule.textColor || '#dc2626');
    };

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

        setEditingIndex(null);
        setSelectedLegendHint('');
        setValue('');
        if (columns.length > 0) setField(columns[0].field);
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setSelectedLegendHint('');
        setValue('');
        if (columns.length > 0) setField(columns[0].field);
    };

    const handleDeleteRule = (index) => {
        if (editingIndex === index) {
            handleCancelEdit();
        } else if (editingIndex !== null && editingIndex > index) {
            setEditingIndex(editingIndex - 1);
        }
        setActiveRules(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        try {
            if (rulesStorageKey) {
                localStorage.setItem(rulesStorageKey, JSON.stringify(activeRules));
            }
        } catch (e) {
            console.error('Failed to save rules to localStorage', e);
        }

        if (onSave) onSave(activeRules);
        if (onApplyRules) onApplyRules(activeRules);
        onClose();
    };

    const handleReset = () => {
        if (window.confirm('모든 사용자 정의 서식 규칙을 초기화하시겠습니까?')) {
            setActiveRules([]);
            setEditingIndex(null);
            setSelectedLegendHint('');
            try {
                if (rulesStorageKey) {
                    localStorage.removeItem(rulesStorageKey);
                }
            } catch (e) {
                console.error('Failed to clear rules from localStorage', e);
            }

            if (onSave) onSave([]);
            if (onApplyRules) onApplyRules([]);
            onClose();
        }
    };

    // 범례 표시용 데이터 (편집 모드 시 draft, 뷰 모드 시 currentLegends)
    const displayedLegends = isLegendEditing ? editingLegendsDraft : currentLegends;
    const totalLegendItems = (displayedLegends || []).reduce((acc, g) => acc + (g.items?.length || 0), 0);

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div 
                className="modal-content" 
                style={{ 
                    width: '800px', 
                    maxWidth: '95vw', 
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '14px',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    background: '#ffffff'
                }} 
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderTopLeftRadius: '14px', borderTopRightRadius: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>⚙️</span>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#1e293b' }}>
                                조건부 서식 (열/셀 색상 규칙) 설정
                            </h2>
                            <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                                시스템 기본 규칙 및 사용자 맞춤형 열/셀 강조 색상 규칙을 관리합니다.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="secondary close-button" style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="modal-body white-bg" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>
                    
                    {/* 1. 🎨 시스템 기본 서식 범례 섹션 (권한 보유자에게만 노출 & 권한에 따라 편집 지원) */}
                    {canViewSystemLegend && displayedLegends && displayedLegends.length > 0 && (
                        <div style={{ 
                            background: isLegendEditing ? '#f5f3ff' : '#f8fafc', 
                            border: isLegendEditing ? '2px solid #8b5cf6' : '1px solid #e2e8f0', 
                            borderRadius: '10px', 
                            padding: '14px',
                            transition: 'all 0.2s ease'
                        }}>
                            <div 
                                style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    userSelect: 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                                    <span>🎨</span>
                                    <span>시스템 기본 색상 범례 ({totalLegendItems}개)</span>
                                    {isLegendEditing ? (
                                        <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 700, background: '#ede9fe', padding: '2px 8px', borderRadius: '12px' }}>
                                            ✏️ 시스템 범례 편집 모드
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                                            — 항목 클릭 시 맞춤 규칙 폼으로 세팅됩니다.
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {/* 수정 권한 보유 시 편집 제어 버튼 노출 */}
                                    {canManageSystemLegend && !isLegendEditing && (
                                        <button
                                            type="button"
                                            onClick={handleStartLegendEdit}
                                            style={{
                                                padding: '4px 10px',
                                                fontSize: '11.5px',
                                                fontWeight: 700,
                                                color: '#4338ca',
                                                background: '#e0e7ff',
                                                border: '1px solid #c7d2fe',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                            title="시스템 기본 범례의 명칭, 색상, 설명을 직접 수정합니다."
                                        >
                                            ✏️ 범례 편집
                                        </button>
                                    )}

                                    {canManageSystemLegend && isLegendEditing && (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={handleResetSystemLegends}
                                                disabled={isSavingLegends}
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: '#b91c1c',
                                                    background: '#fee2e2',
                                                    border: '1px solid #fca5a5',
                                                    borderRadius: '6px',
                                                    cursor: isSavingLegends ? 'not-allowed' : 'pointer'
                                                }}
                                                title="최초 시스템 기본값으로 복원"
                                            >
                                                🔄 기본값 복원
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancelLegendEdit}
                                                disabled={isSavingLegends}
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: '11px',
                                                    color: '#475569',
                                                    background: '#ffffff',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    cursor: isSavingLegends ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                ✕ 취소
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveSystemLegends}
                                                disabled={isSavingLegends}
                                                style={{
                                                    padding: '4px 12px',
                                                    fontSize: '11.5px',
                                                    fontWeight: 700,
                                                    color: '#ffffff',
                                                    background: '#7c3aed',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: isSavingLegends ? 'not-allowed' : 'pointer',
                                                    boxShadow: '0 2px 4px rgba(124, 58, 237, 0.3)'
                                                }}
                                            >
                                                {isSavingLegends ? '저장 중...' : '💾 시스템 범례 저장'}
                                            </button>
                                        </div>
                                    )}

                                    {!isLegendEditing && (
                                        <span 
                                            onClick={() => setShowLegends(!showLegends)}
                                            style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                                        >
                                            {showLegends ? '▲ 접기' : '▼ 펼치기'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {showLegends && (
                                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {displayedLegends.map((group, gIdx) => (
                                        <div key={gIdx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>📌 {group.title}</span>
                                                {isLegendEditing && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddLegendItem(gIdx)}
                                                        style={{
                                                            fontSize: '11px',
                                                            padding: '2px 8px',
                                                            background: '#f1f5f9',
                                                            border: '1px dashed #94a3b8',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            color: '#0284c7',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        ➕ 항목 추가
                                                    </button>
                                                )}
                                            </div>

                                            {/* 일반 뷰 모드: 범례 목록 카드 그리드 */}
                                            {!isLegendEditing && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '8px' }}>
                                                    {group.items?.map((item, iIdx) => (
                                                        <div 
                                                            key={item.id || iIdx}
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
                                                                ✏️ 선택 적용
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* 편집 모드: 각 항목별 인라인 수정 폼 */}
                                            {isLegendEditing && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {group.items?.map((item, iIdx) => (
                                                        <div 
                                                            key={item.id || iIdx}
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '8px',
                                                                padding: '10px 12px',
                                                                background: '#f8fafc',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '8px'
                                                            }}
                                                        >
                                                            {/* 상단: 미리보기 뱃지 및 삭제 버튼 */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>#{iIdx + 1} 미리보기:</span>
                                                                    <span style={{
                                                                        padding: '3px 10px',
                                                                        borderRadius: '6px',
                                                                        background: item.bg,
                                                                        color: item.text,
                                                                        border: `1.5px solid ${item.border}`,
                                                                        fontSize: '11.5px',
                                                                        fontWeight: 800,
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}>
                                                                        <span>{item.icon || '🏷️'}</span>
                                                                        <span>{item.label || '범례 라벨'}</span>
                                                                    </span>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteLegendItem(gIdx, iIdx)}
                                                                    style={{
                                                                        background: '#fee2e2',
                                                                        border: '1px solid #fca5a5',
                                                                        color: '#dc2626',
                                                                        borderRadius: '4px',
                                                                        padding: '2px 8px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    title="이 범례 항목 삭제"
                                                                >
                                                                    🗑️ 삭제
                                                                </button>
                                                            </div>

                                                            {/* 중단: 라벨명 및 설명 입력 */}
                                                            <div style={{ display: 'grid', gridTemplateColumns: '70px 1.5fr 2fr', gap: '8px' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginBottom: '2px', fontWeight: 600 }}>아이콘</label>
                                                                    <input
                                                                        type="text"
                                                                        className="form-control"
                                                                        value={item.icon || ''}
                                                                        onChange={e => handleUpdateLegendItem(gIdx, iIdx, 'icon', e.target.value)}
                                                                        placeholder="🏷️"
                                                                        style={{ fontSize: '12px', padding: '4px 6px', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginBottom: '2px', fontWeight: 600 }}>범례 명칭</label>
                                                                    <input
                                                                        type="text"
                                                                        className="form-control"
                                                                        value={item.label || ''}
                                                                        onChange={e => handleUpdateLegendItem(gIdx, iIdx, 'label', e.target.value)}
                                                                        placeholder="예: 5단계 최종 완료"
                                                                        style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginBottom: '2px', fontWeight: 600 }}>설명 문구</label>
                                                                    <input
                                                                        type="text"
                                                                        className="form-control"
                                                                        value={item.desc || ''}
                                                                        onChange={e => handleUpdateLegendItem(gIdx, iIdx, 'desc', e.target.value)}
                                                                        placeholder="예: 모든 검사 및 승인이 종결된 입고 건"
                                                                        style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* 하단: 배경색/글자색 피커 & 프리셋 */}
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>배경:</span>
                                                                        <input
                                                                            type="color"
                                                                            value={item.bg || '#ffffff'}
                                                                            onChange={e => handleUpdateLegendItem(gIdx, iIdx, 'bg', e.target.value)}
                                                                            style={{ width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            value={item.bg || ''}
                                                                            onChange={e => handleUpdateLegendItem(gIdx, iIdx, 'bg', e.target.value)}
                                                                            style={{ width: '65px', fontSize: '11px', padding: '2px 4px', fontFamily: 'monospace', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                                        />
                                                                    </div>

                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>글자:</span>
                                                                        <input
                                                                            type="color"
                                                                            value={item.text || '#000000'}
                                                                            onChange={e => handleUpdateLegendItem(gIdx, iIdx, 'text', e.target.value)}
                                                                            style={{ width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            value={item.text || ''}
                                                                            onChange={e => handleUpdateLegendItem(gIdx, iIdx, 'text', e.target.value)}
                                                                            style={{ width: '65px', fontSize: '11px', padding: '2px 4px', fontFamily: 'monospace', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* 빠른 프리셋 색상 적용 */}
                                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>빠른 프리셋:</span>
                                                                    {PRESET_COLORS.map((p, pIdx) => (
                                                                        <button
                                                                            key={pIdx}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                handleUpdateLegendItem(gIdx, iIdx, 'bg', p.bg);
                                                                                handleUpdateLegendItem(gIdx, iIdx, 'text', p.text);
                                                                                handleUpdateLegendItem(gIdx, iIdx, 'border', p.border);
                                                                            }}
                                                                            style={{
                                                                                padding: '2px 6px',
                                                                                borderRadius: '3px',
                                                                                fontSize: '10px',
                                                                                fontWeight: 700,
                                                                                background: p.bg,
                                                                                color: p.text,
                                                                                border: `1px solid ${p.border}`,
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            {p.label.split(' ')[0]}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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
                        borderRadius: '10px', 
                        padding: '14px',
                        transition: 'all 0.2s ease-in-out'
                    }}>
                        {/* 기본 범례 선택 안내 배너 */}
                        {selectedLegendHint && editingIndex === null && (
                            <div style={{ 
                                background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', 
                                padding: '6px 10px', borderRadius: '6px', fontSize: '11px', marginBottom: '8px',
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
                <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: '14px', borderBottomRightRadius: '14px' }}>
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
