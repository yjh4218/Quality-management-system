import React, { useState, useEffect } from 'react';
import { getDashboardLayouts, createDashboardLayout, updateDashboardLayout, deleteDashboardLayout } from './api';
import { toast } from 'react-toastify';
import { usePermissions } from './usePermissions';

const WIDGET_OPTIONS = [
    { key: 'WIDGET_NEW_PRODUCTS', label: '📦 신규 등록 품목', description: '최근 등록된 신제품 리스트를 표시합니다.' },
    { key: 'WIDGET_PENDING_USERS', label: '👥 사용자 승인 대기', description: '승인이 필요한 신규 가입자 목록을 표시합니다.' },
    { key: 'WIDGET_AUDIT_LOGS', label: '📜 시스템 변경 이력', description: '최근의 데이터 변경/삭제 로그를 표시합니다.' },
    { key: 'WIDGET_QUALITY_INBOUNDS', label: '⚖️ 입고 품질 관리', description: '최근 입고된 품목의 품질 검사 현황을 표시합니다.' },
    { key: 'WIDGET_PENDING_DIMENSIONS', label: '📐 체적 확정 필요', description: '체적 정보가 가안 상태인 품목들을 표시합니다.' },
    { key: 'WIDGET_CONFIRMED_DIMENSIONS', label: '✅ 체적 확정 리스트', description: '최근 체적 정보가 확정된 품목들을 표시합니다.' },
    { key: 'WIDGET_RECENT_CLAIMS', label: '⚠️ 클레임 인입 내역', description: '최근 접수된 제품 클레임 현황을 표시합니다.' },
    { key: 'WIDGET_MFR_COMPLETED_CLAIMS', label: '✅ 제조사 답변 완료 클레임', description: '제조사 응대가 완료된 클레임 내역을 표시합니다.' },
    { key: 'WIDGET_AUDIT_REVIEW', label: '🔍 생산감리 검토 필요', description: '제조사가 제출한 사진감리 검토 대상을 표시합니다.' },
    { key: 'WIDGET_AUDIT_PROGRESS', label: '📸 생산감리 진행 필요', description: '미진행 또는 반려된 생산감리 대상을 표시합니다.' },
];

const DashboardManagementPage = ({ user }) => {
    const { canEdit: canEditFn, canDelete: canDeleteFn } = usePermissions(user);
    const canEdit = canEditFn('dashboardLayouts');
    const canDelete = canDeleteFn('dashboardLayouts');

    const [layouts, setLayouts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLayout, setSelectedLayout] = useState(null);
    const [formData, setFormData] = useState({ name: '', widgets: [] });

    useEffect(() => {
        fetchLayouts();
    }, []);

    const fetchLayouts = async () => {
        try {
            const data = await getDashboardLayouts();
            setLayouts(data);
        } catch (err) {
            // Silently fail
        }
    };

    const handleOpenModal = (layout = null) => {
        if (layout) {
            setSelectedLayout(layout);
            let parsedWidgets = [];
            try {
                parsedWidgets = JSON.parse(layout.widgetConfig || '[]');
            } catch (e) {
                parsedWidgets = [];
            }
            setFormData({ name: layout.name, widgets: parsedWidgets });
        } else {
            setSelectedLayout(null);
            setFormData({ name: '', widgets: [] });
        }
        setIsModalOpen(true);
    };

    const handleToggleWidget = (widgetKey) => {
        setFormData(prev => {
            const isSelected = prev.widgets.includes(widgetKey);
            if (isSelected) {
                return { ...prev, widgets: prev.widgets.filter(w => w !== widgetKey) };
            } else {
                return { ...prev, widgets: [...prev.widgets, widgetKey] };
            }
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name) return toast.warning("레이아웃 이름을 입력해주세요.");
        if (formData.widgets.length === 0) return toast.warning("최소 하나 이상의 위젯을 선택해주세요.");

        try {
            const payload = {
                name: formData.name,
                widgetConfig: JSON.stringify(formData.widgets)
            };

            if (selectedLayout) {
                await updateDashboardLayout(selectedLayout.id, payload);
                toast.success("레이아웃이 수정되었습니다.");
            } else {
                await createDashboardLayout(payload);
                toast.success("새 레이아웃이 생성되었습니다.");
            }
            setIsModalOpen(false);
            fetchLayouts();
        } catch (err) {
            // Silently fail
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("정말 이 레이아웃을 삭제하시겠습니까? 해당 레이아웃을 사용하던 권한들은 기본 레이아웃으로 복구됩니다.")) return;
        try {
            await deleteDashboardLayout(id);
            toast.success("레이아웃이 삭제되었습니다.");
            fetchLayouts();
        } catch (err) {
            // Silently fail
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ margin: 0 }}>🎨 대시보드 제작 및 관리</h1>
                <button 
                    onClick={() => handleOpenModal()}
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#4f46e5', 
                        color: 'white', 
                        borderRadius: '6px', 
                        cursor: canEdit ? 'pointer' : 'default',
                        border: 'none',
                        fontWeight: '600',
                        opacity: canEdit ? 1 : 0.5
                    }}
                    disabled={!canEdit}
                >
                    + 새 대시보드 제작
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {layouts.map(layout => (
                    <div 
                        key={layout.id} 
                        style={{ 
                            padding: '20px', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '12px', 
                            backgroundColor: 'white',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                    >
                        <h3 style={{ margin: '0 0 10px 0' }}>{layout.name}</h3>
                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '15px' }}>
                            설정 위젯: {(() => {
                                try {
                                    const widgets = JSON.parse(layout.widgetConfig);
                                    return widgets.length + "개";
                                } catch(e) { return "0개"; }
                            })()}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                             <button 
                                 onClick={() => handleOpenModal(layout)}
                                 style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #4f46e5', color: '#4f46e5', backgroundColor: 'transparent', cursor: canEdit ? 'pointer' : 'default', opacity: canEdit ? 1 : 0.5 }}
                                 disabled={!canEdit}
                             >
                                 편집
                             </button>
                             <button 
                                 onClick={() => handleDelete(layout.id)}
                                 style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'transparent', cursor: canDelete ? 'pointer' : 'default', opacity: canDelete ? 1 : 0.5 }}
                                 disabled={!canDelete}
                             >
                                 삭제
                             </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
                }}>
                    <div style={{ 
                        backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '800px', 
                        maxHeight: '90vh', overflowY: 'auto' 
                    }}>
                        <h2>{selectedLayout ? '대시보드 편집' : '새 대시보드 제작'}</h2>
                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>레이아웃 이름</label>
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    placeholder="예: 품질팀 전용 대시보드"
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>포함할 위젯 선택 (순서대로 표시됨)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                                    {WIDGET_OPTIONS.map(opt => {
                                        const isChecked = formData.widgets.includes(opt.key);
                                        return (
                                            <div 
                                                key={opt.key}
                                                onClick={() => handleToggleWidget(opt.key)}
                                                style={{ 
                                                    padding: '12px', border: '1px solid', borderColor: isChecked ? '#4f46e5' : '#e2e8f0',
                                                    borderRadius: '8px', cursor: 'pointer', backgroundColor: isChecked ? '#f5f3ff' : 'white',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{opt.label}</div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>{opt.description}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>취소</button>
                                <button type="submit" style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}>저장하기</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardManagementPage;
