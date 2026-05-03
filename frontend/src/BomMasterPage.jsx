import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import * as api from './api';
import { toast } from 'react-toastify';
import BomRegistrationDrawer from './BomRegistrationDrawer';
import { usePermissions } from './usePermissions';

const BOM_TYPE_MAP = {
    '용기': ['PET병', '초자(유리)', '파우치', '필름', '합성수지 용기(헤비브로우, 트레이)', '튜브', '기타'],
    '캡': ['원터치캡', '막캡', '스포이드', '펌프', '기타'],
    '라벨': ['PP', 'LDPE', 'PET', '은박 + PP', '은박 + LDPE', '은박 + PET', '복합재질', '기타'],
    '단상자': ['뷰티팩', '일반 종이', '기타'],
    '봉합라벨': ['PP', 'LDPE', 'PET', '기타'],
    '기타 잡자재': ['실링지', '박킹', '리드', '기타']
};

const BomMasterPage = ({ user }) => {
    const [materials, setMaterials] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [filters, setFilters] = useState({
        bomCode: '',
        componentName: '',
        type: '',
        detailedType: '',
        detailedMaterial: '',
        manufacturer: ''
    });

    const hasFetchedOnMount = useRef(false);
    useEffect(() => {
        if (hasFetchedOnMount.current) return;
        hasFetchedOnMount.current = true;
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            const res = await api.getMasterMaterialsSearch(filters);
            setMaterials(res.data);
        } catch (error) {
            toast.error("BOM 데이터를 불러오지 못했습니다.");
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchMaterials();
    };

    const handleReset = () => {
        setFilters({
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
        { field: "bomCode", headerName: "BOM 코드", filter: true, width: 140, pinned: 'left' },
        { field: "componentName", headerName: "구성품명", filter: true, flex: 1, minWidth: 200 },
        { field: "specification", headerName: "규격", filter: true, width: 150 },
        { 
            headerName: "유형 / 세부유형", 
            width: 180, 
            valueGetter: p => `${p.data.type || ''} / ${p.data.detailedType || ''}`,
            filter: true
        },
        { 
            headerName: "재질 상세", 
            width: 250, 
            valueGetter: p => p.data.isMultiLayer ? p.data.layers?.map(l => l.materialName).join(' + ') : (p.data.detailedMaterial || '-')
        },
        { 
            headerName: "중량(g) / 두께(um)", 
            width: 180,
            valueGetter: p => `${p.data.weight || 0}g / ${p.data.thickness || 0}um`
        },
        { field: "manufacturer", headerName: "제조사", filter: true, width: 150 },
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
    ], []);

    return (
        <div className="page-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <header className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c' }}>📏 구성품 BOM 마스터 관리</h1>
                    <p style={{ color: '#718096', fontSize: '14px' }}>제품 구성품(용기, 캡, 라벨 등)의 상세 스펙과 재질 정보를 통합 관리합니다.</p>
                </div>
                <button className="primary" onClick={handleCreateNew} disabled={!canEdit} style={{ opacity: canEdit ? 1 : 0.5 }}>
                    <span style={{ marginRight: '8px' }}>+</span> 신규 구성품 등록
                </button>
            </header>

            {/* 검색 필터 영역 */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px', flexShrink: 0 }}>
                <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>BOM 코드</label>
                        <input value={filters.bomCode} onChange={e => setFilters({...filters, bomCode: e.target.value})} placeholder="코드 검색" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>구성품명</label>
                        <input value={filters.componentName} onChange={e => setFilters({...filters, componentName: e.target.value})} placeholder="구성품명 검색" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>유형</label>
                        <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value, detailedType: ''})}>
                            <option value="">전체 유형</option>
                            {Object.keys(BOM_TYPE_MAP).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>세부 유형</label>
                        <select value={filters.detailedType} onChange={e => setFilters({...filters, detailedType: e.target.value})}>
                            <option value="">전체 세부유형</option>
                            {filters.type && BOM_TYPE_MAP[filters.type].map(dt => <option key={dt} value={dt}>{dt}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>제조사</label>
                        <input value={filters.manufacturer} onChange={e => setFilters({...filters, manufacturer: e.target.value})} placeholder="제조사 검색" />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="primary" style={{ flex: 1 }}>🔍 검색</button>
                        <button type="button" onClick={handleReset} className="secondary">초기화</button>
                    </div>
                </form>
            </div>

            {/* 리스트 영역 (AG Grid) */}
            <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', minHeight: '400px' }}>
                <AgGridReact theme="legacy"
                    rowData={materials} 
                    columnDefs={colDefs} 
                    rowHeight={50}
                    animateRows={true}
                    domLayout="normal"
                />
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
        </div>
    );
};

export default BomMasterPage;
