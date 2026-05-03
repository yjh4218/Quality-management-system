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

    const updateGroup = (groupId, name) => {
        const updated = { ...selectedTemplate };
        const group = updated.groups.find(g => g.id === groupId);
        if (group) group.groupName = name;
        setSelectedTemplate(updated);
    };

    const updateItem = (groupId, itemId, content) => {
        const updated = { ...selectedTemplate };
        const group = updated.groups.find(g => g.id === groupId);
        if (group) {
            const item = group.items.find(i => i.id === itemId);
            if (item) item.itemContent = content;
        }
        setSelectedTemplate(updated);
    };

    if (isLoading && templates.length === 0) return <div className="p-4">로딩 중...</div>;

    return (
        <div className="page-container-inner" style={{ padding: '20px' }}>
            <div className="page-header">
                <h2>⚙️ 제조사 점검항목 관리</h2>
                <div className="button-group">
                    <button className="primary" onClick={handleSave}>전체 저장</button>
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

            <div className="card" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div>
                    <label style={{ fontWeight: 'bold', marginRight: '10px' }}>점검 양식 선택:</label>
                    <select 
                        value={selectedTemplate?.id || ''} 
                        onChange={(e) => setSelectedTemplate(templates.find(t => t.id === parseInt(e.target.value)))}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '200px' }}
                    >
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.classificationName}</option>
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
                        <span style={{ fontSize: '12px', color: '#718096' }}>* 제조사의 분류가 일치할 때 이 양식이 자동 선택됩니다.</span>
                    </div>
                )}
            </div>

            {selectedTemplate && (
                <div className="audit-config-container">
                    {selectedTemplate.groups.map((group, gIdx) => (
                        <div key={group.id || gIdx} className="card" style={{ marginBottom: '30px', borderLeft: '5px solid var(--primary-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', gap: '15px' }}>
                                <span style={{ fontWeight: '800', color: 'var(--primary-color)', fontSize: '18px' }}>점검항목 {gIdx + 1}:</span>
                                <input 
                                    type="text" 
                                    value={group.groupName} 
                                    onChange={(e) => updateGroup(group.id, e.target.value)}
                                    style={{ flex: 1, fontSize: '16px', fontWeight: 'bold', padding: '8px' }}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {group.items.map((item, iIdx) => (
                                    <div key={item.id || iIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8f9fa', padding: '10px', borderRadius: '8px' }}>
                                        <span style={{ width: '80px', fontSize: '13px', color: '#666' }}>세부항목 {iIdx + 1}</span>
                                        <textarea 
                                            value={item.itemContent} 
                                            onChange={(e) => updateItem(group.id, item.id, e.target.value)}
                                            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #eee', minHeight: '40px' }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManufacturerAuditItemPage;
