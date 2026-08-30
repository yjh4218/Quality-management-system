import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import * as api from './api';
import { toast } from 'react-toastify';
import BomRegistrationDrawer from './BomRegistrationDrawer';
import ProductSearchPopup from './ProductSearchPopup';
import { usePermissions } from './usePermissions';
import useDateRangePreset from './hooks/useDateRangePreset';
import { matchesAllTokens } from './utils/searchUtils';
import GridColorLegendPopover from './components/common/GridColorLegendPopover';
import GridConditionalFormattingModal from './components/common/GridConditionalFormattingModal';

const BOM_LEGENDS = [
    {
        title: '구성품 BOM 마스터 기본 분류',
        items: [
            { label: '용기류 (PET/초자/파우치)', desc: '화장품 본품 직접 충진 용기', bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
            { label: '캡·펌프류', desc: '원터치캡, 스크류캡, 디스펜서 펌프', bg: '#fdf4ff', text: '#a21caf', border: '#f5d0fe' },
            { label: '단상자·라벨류', desc: '종이 단상자, 방수/은박 라벨, 봉합 라벨', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
            { label: '인박스·아웃박스', desc: '골판지 포장박스, 간지, 완충재', bg: '#fffbeb', text: '#b45309', border: '#fef3c7' }
        ]
    }
];

const BOM_FORMATTABLE_COLUMNS = [
    { field: 'bomCode', headerName: 'BOM 코드' },
    { field: 'componentName', headerName: '구성품명' },
    { field: 'specification', headerName: '규격' },
    { field: 'type', headerName: '유형' },
    { field: 'detailedType', headerName: '세부유형' },
    { field: 'detailedMaterial', headerName: '재질 상세' },
    { field: 'manufacturer', headerName: '제조사' }
];

const BOM_TYPE_MAP = {
    '용기': ['PET병', '초자(유리)', '파우치', '필름', '합성수지 용기(헤비브로우, 트레이)', '알루미늄 튜브', 'PP용기', '기타 용기'],
    '캡·펌프': ['원터치캡', '막캡(스크류캡)', '일자 캡', '미스트 펌프', '로션 펌프', '스포이드(드로퍼)', '기타 캡/펌프'],
    '단상자·라벨': ['CCP 단상자', '일반 종이 단상자', '방수 라벨(PP/PET)', '은박 라벨', '수축 필름(수축라벨)', '봉합 라벨', '기타 단상자/라벨'],
    '인박스·아웃박스': ['인박스(골판지)', '아웃박스(골판지)', '간지/패드', '에어캡/완충재', '테이프/밴딩', '기타 포장박스'],
    '부속품': ['스푼/스파츌라', '실링지', '박킹', '리드/속뚜껑', '도구가이드/설명서', '기타 부속품']
};

const BomMasterPage = ({ user }) => {
    const isAdmin = user?.roles?.some(r => r.authority?.includes('ADMIN')) || user?.role === 'ADMIN';
    const [isFormattingModalOpen, setIsFormattingModalOpen] = useState(false);
    const [customRules, setCustomRules] = useState(() => {
        try {
            const saved = localStorage.getItem('bom_grid_custom_rules');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const handleSaveCustomRules = (newRules) => {
        setCustomRules(newRules);
        localStorage.setItem('bom_grid_custom_rules', JSON.stringify(newRules));
    };

    const getCellStyle = (field, value, fallbackStyle = null) => {
        if (!customRules || customRules.length === 0) return fallbackStyle;
        const matchedRule = customRules.find(rule => {
            if (rule.field !== field) return false;
            const strVal = String(value ?? '').trim().toLowerCase();
            const targetVal = String(rule.value ?? '').trim().toLowerCase();
            if (rule.operator === 'equals') return strVal === targetVal;
            if (rule.operator === 'contains') return strVal.includes(targetVal);
            if (rule.operator === 'startsWith') return strVal.startsWith(targetVal);
            if (rule.operator === 'endsWith') return strVal.endsWith(targetVal);
            return false;
        });

        if (matchedRule) {
            return {
                ...(fallbackStyle || {}),
                backgroundColor: matchedRule.bg || matchedRule.bgColor,
                color: matchedRule.text || matchedRule.textColor,
                fontWeight: 'bold'
            };
        }
        return fallbackStyle;
    };
    const [materials, setMaterials] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        bomCode: '',
        componentName: '',
        type: '',
        detailedType: '',
        detailedMaterial: '',
        manufacturer: ''
    });

    const { renderPresetButtons } = useDateRangePreset(
        (start) => setFilters(prev => ({ ...prev, startDate: start })),
        (end) => setFilters(prev => ({ ...prev, endDate: end }))
    );

    const [loading, setLoading] = useState(false);

    const hasFetchedOnMount = useRef(false);
    useEffect(() => {
        if (hasFetchedOnMount.current) return;
        hasFetchedOnMount.current = true;
        fetchMaterials();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await api.getActiveBomCategories();
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setCategories(list);
        } catch (error) {
            console.error("Failed to load active BOM categories:", error);
        }
    };

    const mainTypeOptions = useMemo(() => {
        if (categories.length > 0) {
            return [...new Set(categories.map(c => c.mainType))];
        }
        return Object.keys(BOM_TYPE_MAP);
    }, [categories]);

    const subTypeOptions = useMemo(() => {
        if (!filters.type) return [];
        if (categories.length > 0) {
            return categories.filter(c => c.mainType === filters.type).map(c => c.subType);
        }
        return BOM_TYPE_MAP[filters.type] || [];
    }, [filters.type, categories]);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const res = await api.getMasterMaterialsSearch(filters);
            setMaterials(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (error) {
            toast.error("BOM 데이터를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const filteredMaterials = useMemo(() => {
        return materials.filter(m => {
            if (filters.bomCode?.trim() && !matchesAllTokens(m.bomCode, filters.bomCode)) return false;
            if (filters.componentName?.trim() && !matchesAllTokens(m.componentName, filters.componentName)) return false;
            if (filters.type?.trim()) {
                const combinedType = `${m.type || ''} ${m.detailedType || ''}`;
                if (!matchesAllTokens(combinedType, filters.type)) return false;
            }
            if (filters.detailedType?.trim() && !matchesAllTokens(m.detailedType, filters.detailedType)) return false;
            if (filters.detailedMaterial?.trim()) {
                const layersStr = m.isMultiLayer && m.layers ? m.layers.map(l => l.materialName).join(' ') : '';
                const combinedMaterial = `${m.material || ''} ${m.detailedMaterial || ''} ${layersStr}`;
                if (!matchesAllTokens(combinedMaterial, filters.detailedMaterial)) return false;
            }
            if (filters.manufacturer?.trim() && !matchesAllTokens(m.manufacturer, filters.manufacturer)) return false;
            return true;
        });
    }, [materials, filters]);

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        fetchMaterials();
    };

    const handleReset = () => {
        setFilters({
            startDate: '',
            endDate: '',
            bomCode: '',
            componentName: '',
            type: '',
            detailedType: '',
            detailedMaterial: '',
            manufacturer: ''
        });
        fetchMaterials();
    };

    const handleCreateNew = () => {
        setSelectedMaterial(null);
        setIsDrawerOpen(true);
    };

    const handleEdit = (material) => {
        setSelectedMaterial(material);
        setIsDrawerOpen(true);
    };

    const { canEdit: canEditBom } = usePermissions(user);
    const canEdit = canEditBom('bomMaster');

    const colDefs = useMemo(() => [
        {
            headerName: "사진",
            width: 75,
            pinned: 'left',
            cellRenderer: p => {
                const img = p.data?.imagePath;
                if (!img) {
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <span style={{ fontSize: '18px', opacity: 0.35 }} title="사진 미등록">📦</span>
                        </div>
                    );
                }
                return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <img 
                            src={img} 
                            alt="패키지" 
                            style={{ 
                                width: '38px', 
                                height: '38px', 
                                objectFit: 'contain', 
                                borderRadius: '6px', 
                                border: '1px solid #e2e8f0',
                                background: '#fff',
                                cursor: 'pointer',
                                transition: 'transform 0.15s ease'
                            }} 
                            title="클릭 시 확대 미리보기"
                            onClick={() => setPreviewPhoto({ url: img, title: `${p.data.bomCode} - ${p.data.componentName}` })}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        />
                    </div>
                );
            }
        },
        { field: "bomCode", headerName: "BOM 코드", filter: true, width: 150, pinned: 'left', cellStyle: p => getCellStyle('bomCode', p.value) },
        { field: "componentName", headerName: "구성품명", filter: true, flex: 1, minWidth: 180, cellStyle: p => getCellStyle('componentName', p.value) },
        { field: "specification", headerName: "규격", filter: true, width: 140, cellStyle: p => getCellStyle('specification', p.value) },
        { 
            headerName: "유형 / 세부유형", 
            width: 180, 
            valueGetter: p => `${p.data.type || ''} / ${p.data.detailedType || ''}`,
            filter: true,
            cellStyle: p => getCellStyle('type', p.data?.type)
        },
        { 
            headerName: "재질 상세", 
            width: 220, 
            valueGetter: p => p.data.isMultiLayer ? p.data.layers?.map(l => l.materialName).join(' + ') : (p.data.detailedMaterial || '-'),
            cellStyle: p => getCellStyle('detailedMaterial', p.data?.detailedMaterial)
        },
        { 
            headerName: "중량(g) / 두께(um)", 
            width: 160,
            valueGetter: p => `${p.data.weight || 0}g / ${p.data.thickness || 0}um`
        },
        { field: "manufacturer", headerName: "제조사", filter: true, width: 140, cellStyle: p => getCellStyle('manufacturer', p.value) },
        {
            headerName: "관리",
            width: 100,
            pinned: 'right',
            cellRenderer: p => (
                <button 
                    className="outline" 
                    style={{ padding: '4px 12px', fontSize: '12px', opacity: canEdit ? 1 : 0.5 }} 
                    onClick={() => canEdit && handleEdit(p.data)}
                    disabled={!canEdit}
                >수정</button>
            )
        }
    ], [canEdit, customRules]);

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9' }}>
            
            {/* 3단계 표준 헤더 레이아웃 */}
            <div className="page-header-standard" style={{ 
                marginBottom: '20px', 
                flexDirection: 'column', 
                alignItems: 'flex-start', 
                gap: '12px',
                padding: '24px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #f1f5f9'
            }}>
                {/* 1단계: 생성 및 연동 (최상단) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            📏 구성품 BOM 마스터 관리
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="primary" 
                            onClick={handleCreateNew} 
                            style={{ 
                                padding: '10px 24px', 
                                borderRadius: '10px', 
                                fontWeight: '800', 
                                backgroundColor: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                cursor: canEdit ? 'pointer' : 'not-allowed',
                                opacity: canEdit ? 1 : 0.5
                            }} 
                            disabled={!canEdit}
                        >
                            ➕ 신규 구성품 등록
                        </button>
                    </div>
                </div>

                {/* 2단계: 핵심 제어 (중단) */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    width: '100%', 
                    alignItems: 'center', 
                    padding: '12px 0', 
                    borderTop: '1px solid #f1f5f9',
                    borderBottom: '1px solid #f1f5f9'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                        제품 구성품(용기, 캡, 라벨 등)의 상세 스펙과 재질 정보를 통합 관리합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* 🎨 색상 범례 팝오버 */}
                        <GridColorLegendPopover 
                            legends={BOM_LEGENDS}
                            customRules={customRules}
                            onDeleteCustomRule={(idx) => {
                                handleSaveCustomRules(customRules.filter((_, i) => i !== idx));
                            }}
                        />

                        {/* ⚙️ 조건부 서식 설정 (관리자 전용) */}
                        {isAdmin && (
                            <button
                                type="button"
                                className="outline"
                                onClick={() => setIsFormattingModalOpen(true)}
                                style={{
                                    fontSize: '13px',
                                    padding: '8px 14px',
                                    backgroundColor: '#fff',
                                    color: '#475569',
                                    borderColor: '#cbd5e1',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 'bold',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                                title="그리드 셀 조건부 서식 규칙 추가/관리"
                            >
                                ⚙️ 서식 설정
                            </button>
                        )}

                        <button 
                            className="outline" 
                            onClick={() => alert("BOM 마스터 엑셀 다운로드 기능 준비 중입니다.")}
                            style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                        >
                            📊 결과 다운로드
                        </button>
                        <button 
                            className="primary" 
                            onClick={fetchMaterials} 
                            disabled={loading}
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? '⏳ 조회 중...' : '🔍 조회'}
                        </button>
                        <button 
                            className="outline" 
                            onClick={handleReset} 
                            style={{ padding: '10px 16px', fontSize: '14px' }}
                        >
                            ♻️ 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 검색 필터 그리드 */}
            <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                    {/* 1. 등록/생성 기간 (날짜 + ⚡빠른선택) */}
                    <div style={{ gridColumn: 'span 2', minWidth: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>🗓️ 등록 기간</label>
                            {renderPresetButtons()}
                        </div>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <input type="date" value={filters.startDate || ''} onChange={e => setFilters({ ...filters, startDate: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                            <span style={{ color: '#94a3b8' }}>~</span>
                            <input type="date" value={filters.endDate || ''} onChange={e => setFilters({ ...filters, endDate: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                        </div>
                    </div>

                    {/* 2. BOM 코드 + 🔍 돋보기 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔢 BOM 코드 / 품목코드</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                                type="text"
                                value={filters.bomCode}
                                onChange={e => setFilters({...filters, bomCode: e.target.value})}
                                onKeyDown={e => e.key === 'Enter' && fetchBomList()}
                                placeholder="코드 검색"
                                style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setIsProductSearchOpen(true)}
                                title="품목 상세 검색"
                                style={{ padding: '0 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                🔍
                            </button>
                        </div>
                    </div>

                    {/* 3. 구성품명 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>📦 구성품명</label>
                        <input
                            type="text"
                            value={filters.componentName}
                            onChange={e => setFilters({...filters, componentName: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && fetchBomList()}
                            placeholder="구성품명 검색"
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        />
                    </div>

                    {/* 4. 제조사 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🏭 제조사</label>
                        <input
                            type="text"
                            value={filters.manufacturer}
                            onChange={e => setFilters({...filters, manufacturer: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && fetchBomList()}
                            placeholder="제조사 검색"
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        />
                    </div>

                    {/* 5. 유형 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>📂 유형</label>
                        <select
                            value={filters.type}
                            onChange={e => setFilters({...filters, type: e.target.value, detailedType: ''})}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', height: '37px', backgroundColor: '#fff' }}
                        >
                            <option value="">전체 유형</option>
                            {mainTypeOptions.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* 6. 세부 유형 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>📂 세부 유형</label>
                        <select
                            value={filters.detailedType}
                            onChange={e => setFilters({...filters, detailedType: e.target.value})}
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', height: '37px', backgroundColor: '#fff' }}
                            disabled={!filters.type}
                        >
                            <option value="">전체 세부유형</option>
                            {subTypeOptions.map(st => (
                                <option key={st} value={st}>{st}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* 데이터 카드 */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', flex: 1, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '15px', fontWeight: '800', fontSize: '14px', color: '#64748b' }}>
                    검색 결과: <span style={{ color: '#2563eb' }}>{filteredMaterials.length}</span> / 전체 {materials.length}건
                </div>
                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                    <AgGridReact
                        theme="legacy"
                        rowData={filteredMaterials}
                        columnDefs={colDefs}
                        rowHeight={54}
                        animateRows={true}
                        domLayout="normal"
                    />
                </div>
            </div>

            {isDrawerOpen && (
                <BomRegistrationDrawer 
                    material={selectedMaterial} 
                    onClose={(saved) => {
                        setIsDrawerOpen(false);
                        if (saved) fetchMaterials();
                    }}
                    user={user}
                />
            )}

            {isProductSearchOpen && (
                <ProductSearchPopup 
                    isOpen={isProductSearchOpen}
                    onClose={() => setIsProductSearchOpen(false)}
                    onSelect={(p) => {
                        setFilters(prev => ({
                            ...prev,
                            bomCode: p.itemCode || prev.bomCode,
                            componentName: p.productName || prev.componentName
                        }));
                        setIsProductSearchOpen(false);
                    }}
                    onSelectProduct={(p) => {
                        setFilters(prev => ({
                            ...prev,
                            bomCode: p.itemCode || prev.bomCode,
                            componentName: p.productName || prev.componentName
                        }));
                        setIsProductSearchOpen(false);
                    }}
                />
            )}

            {/* Photo Preview Lightbox Modal */}
            {previewPhoto && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        zIndex: 99999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                    onClick={() => setPreviewPhoto(null)}
                >
                    <div 
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '85vh',
                            background: '#fff',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            padding: '12px 18px',
                            background: '#0f172a',
                            color: '#fff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontWeight: 600, fontSize: '15px' }}>
                                📸 {previewPhoto.title || '패키지 사진 미리보기'}
                            </span>
                            <button 
                                onClick={() => setPreviewPhoto(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    padding: '0 4px'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' }}>
                            <img 
                                src={previewPhoto.url} 
                                alt={previewPhoto.title} 
                                style={{
                                    maxWidth: '80vw',
                                    maxHeight: '70vh',
                                    objectFit: 'contain',
                                    borderRadius: '6px'
                                }} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 조건부 서식 설정 모달 (관리자 전용) */}
            <GridConditionalFormattingModal
                isOpen={isFormattingModalOpen}
                onClose={() => setIsFormattingModalOpen(false)}
                columns={BOM_FORMATTABLE_COLUMNS}
                rules={customRules}
                legends={BOM_LEGENDS}
                onSave={handleSaveCustomRules}
            />
        </div>
    );
};

export default BomMasterPage;
