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
        <div className="page-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <header className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c' }}>📋 포장공정 템플릿 관리</h1>
                    <p style={{ color: '#718096', fontSize: '14px' }}>제품 제형별 표준 포장 공정 및 단계별 작업 가이드를 관리합니다.</p>
                </div>
                <button 
                    className="primary" 
                    onClick={handleCreateNew}
                    style={{ opacity: canManageBatch ? 1 : 0.5, cursor: canManageBatch ? 'pointer' : 'not-allowed' }}
                    disabled={!canManageBatch}
                >
                    <span style={{ marginRight: '8px' }}>+</span> 신규 템플릿 등록
                </button>
            </header>

            <div className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
