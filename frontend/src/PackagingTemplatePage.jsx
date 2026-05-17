import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import * as api from './api';
import { toast } from 'react-toastify';
import TemplateRegistrationDrawer from './TemplateRegistrationDrawer';
import { usePermissions } from './usePermissions';

const PRODUCT_TYPE_LABELS = {
    'PET_REGULAR': 'PET병 - 막캡',
    'PET_ONE_TOUCH': 'PET병 - 원터치캡',
    'TUBE': '튜브 형태',
    'MASK': '마스크',
    'PAD_PP': '패드 - PP용기',
    'PAD_POUCH': '패드 - 파우치',
    'GLASS': '유리(초자)',
    'PET_SERUM': 'PET병 - 세럼(헤비브로우)',
    'ETC': '기타'
};

const PackagingTemplatePage = ({ user }) => {
    const { canEdit: canEditFn } = usePermissions(user);
    const canManageBatch = canEditFn('packagingTemplates');
    
    const [templates, setTemplates] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await api.getMasterTemplates();
            setTemplates(res.data);
        } catch (error) {
            toast.error("템플릿 데이터를 불러오지 못했습니다.");
        }
    };

    const handleCreateNew = () => {
        setSelectedTemplate(null);
        setIsDrawerOpen(true);
    };

    const handleEdit = (template) => {
        setSelectedTemplate(template);
        setIsDrawerOpen(true);
    };



    const colDefs = useMemo(() => [
        { 
            headerName: "포장 제형", 
            width: 180, 
            pinned: 'left',
            valueGetter: p => PRODUCT_TYPE_LABELS[p.data.productType] || p.data.productType,
            cellStyle: { fontWeight: 'bold', color: '#2b6cb0' },
            filter: true
        },
        {
            headerName: "공정 단계 요약",
            flex: 1,
            minWidth: 400,
            cellRenderer: p => {
                if (!p.data.steps || p.data.steps.length === 0) {
                    return <span style={{ color: '#cbd5e0', fontSize: '13px' }}>설정된 공정 단계가 없습니다.</span>;
                }
                return (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', height: '100%', padding: '5px 0' }}>
                        {p.data.steps.map(step => (
                            <span key={step.id} style={{ background: '#ebf8ff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#2b6cb0', lineHeight: 'normal' }}>
                                Step {step.stepNumber}: {step.instruction.length > 25 ? step.instruction.substring(0, 25) + '...' : step.instruction}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        { 
            headerName: "단계 수", 
            width: 100,
            valueGetter: p => p.data.steps?.length || 0,
            cellStyle: { textAlign: 'center', fontWeight: 'bold', color: '#4a5568' }
        },
        {
            headerName: "관리",
            width: 100,
            pinned: 'right',
            cellRenderer: p => (
                <button 
                    className="outline" 
                    style={{ padding: '4px 12px', fontSize: '12px' }} 
                    onClick={() => handleEdit(p.data)}
                >
                    {canManageBatch ? '수정' : '조회'}
                </button>
            ),
            cellStyle: { textAlign: 'center' }
        }
    ], []);

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
                            📋 포장공정 템플릿 관리
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
                                cursor: canManageBatch ? 'pointer' : 'not-allowed',
                                opacity: canManageBatch ? 1 : 0.5
                            }} 
                            disabled={!canManageBatch}
                        >
                            ➕ 신규 템플릿 등록
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
                        제품 제형별 표준 포장 공정 및 단계별 작업 가이드를 관리합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="outline" 
                            onClick={() => alert("포장 템플릿 엑셀 다운로드 기능 준비 중입니다.")}
                            style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                        >
                            📊 결과 다운로드
                        </button>
                        <button 
                            className="primary" 
                            onClick={fetchTemplates} 
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            🔍 조회
                        </button>
                        <button 
                            className="outline" 
                            onClick={() => {}} 
                            style={{ padding: '10px 16px', fontSize: '14px' }}
                        >
                            ♻️ 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 데이터 카드 */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', flex: 1, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '15px', fontWeight: '800', fontSize: '14px', color: '#64748b' }}>
                    등록된 템플릿 수: <span style={{ color: '#2563eb' }}>{templates.length}</span> 건
                </div>
                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                    <AgGridReact theme="legacy"
                        rowData={templates} 
                        columnDefs={colDefs} 
                        rowHeight={60}
                        animateRows={true}
                    />
                </div>
            </div>

            {isDrawerOpen && (
                <TemplateRegistrationDrawer 
                    template={selectedTemplate} 
                    onClose={(saved) => {
                        setIsDrawerOpen(false);
                        if (saved) fetchTemplates();
                    }}
                    user={user}
                />
            )}
        </div>
    );
};

export default PackagingTemplatePage;
