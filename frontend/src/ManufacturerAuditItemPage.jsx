import React, { useState, useEffect } from 'react';
import { getAuditTemplates, saveAuditTemplate } from './api';
import { toast } from 'react-toastify';

const ManufacturerAuditItemPage = () => {
    const [templates, setTemplates] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [thresholds, setThresholds] = useState({ A: 90, B: 80, C: 70, D: 60 });

    useEffect(() => {
        loadTemplates();
        loadCategories();
        loadThresholds();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await import('./api').then(api => api.getManufacturerCategories());
            setCategories(data);
        } catch (err) {
            console.log("Failed to load categories");
        }
    };

    const loadThresholds = async () => {
        try {
            const data = await import('./api').then(api => api.getSystemSetting('AUDIT_GRADE_THRESHOLDS'));
            if (data && data.settingValue) setThresholds(JSON.parse(data.settingValue));
        } catch (err) {
            // Silently use defaults if not found or error
            console.log("Using default grade thresholds");
        }
    };

    const handleSaveThresholds = async () => {
        try {
            await import('./api').then(api => api.saveSystemSetting({
                settingKey: 'AUDIT_GRADE_THRESHOLDS',
                settingValue: JSON.stringify(thresholds),
                description: '제조사 Audit 등급 산정 기준 점수'
            }));
            toast.success('등급 기준이 저장되었습니다.');
        } catch (err) {
            toast.error('기준 저장 실패');
        }
    };

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const data = await getAuditTemplates();
            setTemplates(data);
            if (data.length > 0 && !selectedTemplate) {
                setSelectedTemplate(data[0]);
            } else if (selectedTemplate) {
                const updated = data.find(t => t.id === selectedTemplate.id);
                if (updated) setSelectedTemplate(updated);
            }
        } catch (err) {
            toast.error('항목 로드 실패');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedTemplate) return;
        if (!selectedTemplate.classificationName) {
            toast.warning('분류명을 입력해주세요.');
            return;
        }
        setIsLoading(true);
        try {
            await saveAuditTemplate(selectedTemplate);
            toast.success('저장되었습니다.');
            loadTemplates();
        } catch (err) {
            toast.error('저장 실패');
        } finally {
            setIsLoading(false);
        }
    };

    const addNewTemplate = () => {
        const name = window.prompt('새 점검 양식 분류명을 입력하세요 (예: 식품 제조사 Audit)');
        if (!name) return;
        
        const newT = {
            classificationName: name,
            groups: [],
            active: true
        };
        setTemplates([...templates, newT]);
        setSelectedTemplate(newT);
    };

    const addGroup = () => {
        if (!selectedTemplate) return;
        const updated = { ...selectedTemplate };
        if (!updated.groups) updated.groups = [];
        updated.groups.push({
            groupName: '새 점검항목',
            displayOrder: updated.groups.length + 1,
            items: []
        });
        setSelectedTemplate(updated);
    };

    const removeGroup = (gIdx) => {
        if (window.confirm('이 점검항목을 삭제하시겠습니까? 관련 세부항목도 모두 삭제됩니다.')) {
            const updated = { ...selectedTemplate };
            updated.groups.splice(gIdx, 1);
            setSelectedTemplate(updated);
        }
    };

    const addItem = (gIdx) => {
        const updated = { ...selectedTemplate };
        if (!updated.groups[gIdx].items) updated.groups[gIdx].items = [];
        updated.groups[gIdx].items.push({
            itemContent: '',
            displayOrder: updated.groups[gIdx].items.length + 1
        });
        setSelectedTemplate(updated);
    };

    const removeItem = (gIdx, iIdx) => {
        const updated = { ...selectedTemplate };
        updated.groups[gIdx].items.splice(iIdx, 1);
        setSelectedTemplate(updated);
    };

    const updateGroup = (gIdx, name) => {
        const updated = { ...selectedTemplate };
        updated.groups[gIdx].groupName = name;
        setSelectedTemplate(updated);
    };

    const updateItem = (gIdx, iIdx, content) => {
        const updated = { ...selectedTemplate };
        updated.groups[gIdx].items[iIdx].itemContent = content;
        setSelectedTemplate(updated);
    };

    if (isLoading && templates.length === 0) return <div className="p-4">로딩 중...</div>;

    return (
        <div className="page-container-inner" style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
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
                            ⚙️ 제조사 점검항목 관리
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="primary" 
                            onClick={addNewTemplate} 
                            style={{ 
                                padding: '10px 24px', 
                                borderRadius: '10px', 
                                fontWeight: '800', 
                                backgroundColor: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer'
                            }} 
                        >
                            ➕ 새 양식 만들기
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
                        제조사 Audit에 사용되는 점검 양식과 항목을 설정합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="primary" 
                            onClick={handleSave} 
                            style={{ backgroundColor: '#1e293b', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            💾 전체 저장
                        </button>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '20px', background: '#f0f7ff', border: '1px solid #c3dafe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: '#2c5282' }}>📊 등급 산정 기준 관리 (백분율 %)</h3>
                    <button className="primary" onClick={handleSaveThresholds} style={{ padding: '6px 15px', fontSize: '13px' }}>기준 저장</button>
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #c3dafe', minWidth: '150px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>A등급 (우수) 기준</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <input type="number" value={thresholds.A} onChange={(e) => setThresholds({...thresholds, A: parseInt(e.target.value)})} style={{ width: '60px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }} />
                            <span>% 이상</span>
                        </div>
                    </div>
                    <div style={{ padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #bee3f8', minWidth: '150px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>B등급 (보통) 기준</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <input type="number" value={thresholds.B} onChange={(e) => setThresholds({...thresholds, B: parseInt(e.target.value)})} style={{ width: '60px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }} />
                            <span>% 이상</span>
                        </div>
                    </div>
                    <div style={{ padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #fed7d7', minWidth: '150px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>C등급 (요주의) 기준</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <input type="number" value={thresholds.C} onChange={(e) => setThresholds({...thresholds, C: parseInt(e.target.value)})} style={{ width: '60px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }} />
                            <span>% 이상</span>
                        </div>
                    </div>
                    <div style={{ padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #feb2b2', minWidth: '150px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px' }}>D등급 (부적합) 기준</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <input type="number" value={thresholds.D} onChange={(e) => setThresholds({...thresholds, D: parseInt(e.target.value)})} style={{ width: '60px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }} />
                            <span>% 이상</span>
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#718096' }}>
                    * 백분율(%) = (총 취득 점수 / 전체 만점) × 100. 저장 후 생성되는 신규 심사부터 적용됩니다.
                </div>
            </div>

            <div className="card" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px', background: '#f8fafc' }}>
                <div>
                    <label style={{ fontWeight: 'bold', marginRight: '10px' }}>점검 양식 선택:</label>
                    <select 
                        value={selectedTemplate?.id || ''} 
                        onChange={(e) => {
                            const id = parseInt(e.target.value);
                            setSelectedTemplate(templates.find(t => t.id === id) || templates.find(t => !t.id && t.classificationName === e.target.value));
                        }}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '250px' }}
                    >
                        <option value="">양식 선택</option>
                        {templates.map(t => (
                            <option key={t.id || t.classificationName} value={t.id || t.classificationName}>{t.classificationName}</option>
                        ))}
                    </select>
                </div>
                {selectedTemplate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '20px', borderLeft: '1px solid #eee' }}>
                        <label style={{ fontWeight: 'bold', color: '#4a5568' }}>🔗 자동 맵핑 제조사 분류:</label>
                        <select
                            value={selectedTemplate.targetCategory || ''}
                            onChange={(e) => setSelectedTemplate({...selectedTemplate, targetCategory: e.target.value})}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #3182ce', background: '#ebf8ff', color: '#2b6cb0', fontWeight: 'bold' }}
                        >
                            <option value="">맵핑 없음 (수동 선택)</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {selectedTemplate && (
                <div className="audit-config-container">
                    {selectedTemplate.groups.map((group, gIdx) => (
                        <div key={group.id || gIdx} className="card" style={{ marginBottom: '30px', borderLeft: '5px solid var(--primary-color)', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                                <button className="danger" onClick={() => removeGroup(gIdx)} style={{ padding: '4px 10px', fontSize: '12px' }}>항목 삭제</button>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', gap: '15px', paddingRight: '100px' }}>
                                <span style={{ fontWeight: '800', color: 'var(--primary-color)', fontSize: '18px' }}>점검항목 {gIdx + 1}:</span>
                                <input 
                                    type="text" 
                                    value={group.groupName} 
                                    onChange={(e) => updateGroup(gIdx, e.target.value)}
                                    style={{ flex: 1, fontSize: '16px', fontWeight: 'bold', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                                    placeholder="그룹 명칭 입력 (예: 운영관리)"
                                />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '15px' }}>
                                {group.items.map((item, iIdx) => (
                                    <div key={item.id || iIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                        <span style={{ width: '80px', fontSize: '12px', color: '#64748b', marginTop: '10px' }}>세부항목 {iIdx + 1}</span>
                                        <textarea 
                                            value={item.itemContent} 
                                            onChange={(e) => updateItem(gIdx, iIdx, e.target.value)}
                                            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #e2e8f0', minHeight: '60px', fontSize: '14px' }}
                                            placeholder="세부 점검 내용을 입력하세요."
                                        />
                                        <button 
                                            onClick={() => removeItem(gIdx, iIdx)} 
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px', padding: '5px' }}
                                            title="세부항목 삭제"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <div style={{ textAlign: 'center' }}>
                                <button className="outline" onClick={() => addItem(gIdx)} style={{ padding: '6px 20px', fontSize: '13px', color: '#4a5568' }}>+ 세부항목 추가</button>
                            </div>
                        </div>
                    ))}
                    
                    <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: '12px', marginBottom: '40px' }}>
                        <button className="primary" onClick={addGroup} style={{ padding: '10px 30px', fontWeight: 'bold' }}>+ 새로운 점검항목(그룹) 추가</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManufacturerAuditItemPage;
