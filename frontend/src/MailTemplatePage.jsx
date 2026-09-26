import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import * as api from './api';
import { toast } from 'react-toastify';
import { usePermissions } from './usePermissions';

const MailTemplatePage = ({ user }) => {
    const { isAdmin } = usePermissions(user);
    const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'categories'
    
    // --- Templates State ---
    const [templates, setTemplates] = useState([]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [searchFields, setSearchFields] = useState({ templateName: '', body: '' });
    const [templateFormData, setTemplateFormData] = useState({
        templateCode: '',
        templateName: '',
        subject: '',
        body: '',
        category: '',
        active: true,
        maxHistoryCount: 20,
        autoReminderEnabled: false,
        reminderIntervalDays: 3,
        maxReminderCount: 2,
        reminderTemplateCode: ''
    });

    // --- Categories State ---
    const [categories, setCategories] = useState([]);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryFormData, setCategoryFormData] = useState({
        categoryCode: '',
        categoryName: '',
        availableVariables: ''
    });

    // --- Mail Histories & Analytics State ---
    const [mailHistories, setMailHistories] = useState([]);
    const [leadTimeStats, setLeadTimeStats] = useState([]);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [historySearchFilter, setHistorySearchFilter] = useState('');
    const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadTemplates();
        loadCategories();
    }, []);

    const loadMailHistories = async (forceRefresh = false) => {
        setLoading(true);
        try {
            const [histRes, statsRes] = await Promise.all([
                api.getAllMailHistories(forceRefresh),
                api.getManufacturerLeadTimeStats(forceRefresh)
            ]);
            setMailHistories(histRes.data || []);
            setLeadTimeStats(statsRes.data || []);
        } catch (error) {
            console.error("Failed to load mail histories", error);
            toast.error("메일 발송 이력을 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const loadTemplates = async (forceRefresh = false) => {
        setLoading(true);
        try {
            const res = await api.getMailTemplates(forceRefresh);
            setTemplates(res.data || []);
        } catch (error) {
            console.error("Failed to load templates", error);
            toast.error("템플릿 목록을 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const res = await api.getMailCategories();
            setCategories(res.data);
            // Set default category in template form if empty
            if (res.data.length > 0 && !templateFormData.category) {
                setTemplateFormData(prev => ({ ...prev, category: res.data[0].categoryCode }));
            }
        } catch (error) {
            console.error("Failed to load categories", error);
            toast.error("카테고리 목록을 불러오는 중 오류가 발생했습니다.");
        }
    };

    const handleSearch = () => {
        loadTemplates(true);
    };

    const handleReset = () => {
        setSearchFields({ templateName: '', body: '' });
        loadTemplates(true);
    };

    // 필터링된 템플릿
    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            const matchName = !searchFields.templateName || 
                (t.templateName && t.templateName.toLowerCase().includes(searchFields.templateName.toLowerCase()));
            const matchBody = !searchFields.body || 
                (t.body && t.body.toLowerCase().includes(searchFields.body.toLowerCase()));
            return matchName && matchBody;
        });
    }, [templates, searchFields]);

    // --- Template CRUD Handlers ---
    const handleAddTemplate = () => {
        setEditingTemplate(null);
        setTemplateFormData({
            templateCode: '',
            templateName: '',
            subject: '',
            body: '',
            category: categories.length > 0 ? categories[0].categoryCode : '',
            active: true,
            maxHistoryCount: 20,
            autoReminderEnabled: false,
            reminderIntervalDays: 3,
            maxReminderCount: 2,
            reminderTemplateCode: ''
        });
        setIsTemplateModalOpen(true);
    };

    const handleEditTemplate = (template) => {
        setEditingTemplate(template);
        setTemplateFormData({
            templateCode: template.templateCode,
            templateName: template.templateName,
            subject: template.subject,
            body: template.body,
            category: template.category,
            active: template.active,
            maxHistoryCount: template.maxHistoryCount || 20,
            autoReminderEnabled: !!template.autoReminderEnabled,
            reminderIntervalDays: template.reminderIntervalDays || 3,
            maxReminderCount: template.maxReminderCount || 2,
            reminderTemplateCode: template.reminderTemplateCode || ''
        });
        setIsTemplateModalOpen(true);
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm("정말 이 메일 양식을 삭제하시겠습니까?")) return;
        try {
            await api.deleteMailTemplate(id);
            toast.success("삭제되었습니다.");
            loadTemplates(true);
        } catch (error) {
            console.error("Delete template failed", error);
            toast.error("삭제 중 오류가 발생했습니다.");
        }
    };

    const handleTemplateSave = async (e) => {
        e.preventDefault();
        if (!templateFormData.category) {
            toast.warn("카테고리를 선택해 주세요.");
            return;
        }
        try {
            if (editingTemplate) {
                await api.updateMailTemplate(editingTemplate.id, templateFormData);
                toast.success("수정되었습니다.");
            } else {
                await api.createMailTemplate(templateFormData);
                toast.success("생성되었습니다.");
            }
            setIsTemplateModalOpen(false);
            loadTemplates(true);
        } catch (error) {
            console.error("Save template failed", error);
            toast.error("저장 중 오류가 발생했습니다.");
        }
    };

    // --- Category CRUD Handlers ---
    const handleAddCategory = () => {
        setEditingCategory(null);
        setCategoryFormData({
            categoryCode: '',
            categoryName: '',
            availableVariables: ''
        });
        setIsCategoryModalOpen(true);
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        
        // Format variables from "code:desc, code:desc" to multiline format for textarea
        let formattedVars = '';
        if (category.availableVariables) {
            formattedVars = category.availableVariables
                .split(',')
                .map(v => v.trim())
                .filter(v => v.includes(':'))
                .join('\n');
        }

        setCategoryFormData({
            categoryCode: category.categoryCode,
            categoryName: category.categoryName,
            availableVariables: formattedVars
        });
        setIsCategoryModalOpen(true);
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("정말 이 카테고리를 삭제하시겠습니까? 해당 카테고리에 속한 템플릿의 발송 지원 변수가 정상 작동하지 않을 수 있습니다.")) return;
        try {
            await api.deleteMailCategory(id);
            toast.success("삭제되었습니다.");
            loadCategories();
        } catch (error) {
            console.error("Delete category failed", error);
            toast.error("삭제 중 오류가 발생했습니다.");
        }
    };

    const handleCategorySave = async (e) => {
        e.preventDefault();
        
        // Convert multiline availableVariables to comma-separated format
        const cleanVars = categoryFormData.availableVariables
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.includes(':'))
            .join(', ');

        const payload = {
            ...categoryFormData,
            availableVariables: cleanVars
        };

        try {
            if (editingCategory) {
                await api.updateMailCategory(editingCategory.id, payload);
                toast.success("카테고리가 수정되었습니다.");
            } else {
                await api.createMailCategory(payload);
                toast.success("신규 카테고리가 등록되었습니다.");
            }
            setIsCategoryModalOpen(false);
            loadCategories();
        } catch (error) {
            console.error("Save category failed", error);
            const msg = error.response?.data?.message || "저장 중 오류가 발생했습니다.";
            toast.error(msg);
        }
    };

    // --- Dynamic variables lookup for current template edit ---
    const activeCategoryVariables = useMemo(() => {
        const selCat = categories.find(c => c.categoryCode === templateFormData.category);
        if (!selCat || !selCat.availableVariables) return [];
        return selCat.availableVariables.split(',').map(item => {
            const [code, desc] = item.split(':').map(s => s.trim());
            return { code, desc };
        }).filter(item => item.code);
    }, [templateFormData.category, categories]);

    const getCategoryName = (code) => {
        const cat = categories.find(c => c.categoryCode === code);
        return cat ? cat.categoryName : code;
    };

    // Columns definition
    const templateColumns = [
        { 
            field: 'category', 
            headerName: '카테고리', 
            width: 160,
            cellRenderer: p => (
                <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca'
                }}>
                    {getCategoryName(p.value)}
                </span>
            )
        },
        { field: 'templateCode', headerName: '양식 코드', width: 180, cellStyle: { fontWeight: '600', color: '#475569' } },
        { field: 'templateName', headerName: '양식명', flex: 1, cellStyle: { color: '#0f172a', fontWeight: '500' } },
        { field: 'subject', headerName: '메일 제목', flex: 2 },
        { 
            field: 'maxHistoryCount', 
            headerName: '이력 보관 수량', 
            width: 130,
            cellRenderer: p => (
                <span style={{ fontWeight: '600', color: '#0284c7' }}>
                    최대 {p.value || 20}개
                </span>
            )
        },
        { 
            field: 'autoReminderEnabled', 
            headerName: '자동 리마인드', 
            width: 170,
            cellRenderer: p => (
                <span style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    backgroundColor: p.value ? '#dcfce7' : '#f1f5f9',
                    color: p.value ? '#15803d' : '#64748b'
                }}>
                    {p.value ? `ON (${p.data.reminderIntervalDays || 3}일 / ${p.data.maxReminderCount || 2}회)` : 'OFF (수동)'}
                </span>
            )
        },
        { 
            field: 'active', 
            headerName: '상태', 
            width: 100, 
            cellRenderer: p => (
                <span style={{ color: p.value ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                    {p.value ? '● 활성' : '○ 비활성'}
                </span>
            )
        },
        {
            headerName: '관리',
            width: 160,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '100%' }}>
                    <button 
                        onClick={() => handleEditTemplate(params.data)} 
                        className="outline" 
                        style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#cbd5e1', color: '#475569', backgroundColor: '#fff' }}
                    >
                        수정
                    </button>
                    <button 
                        onClick={() => handleDeleteTemplate(params.data.id)} 
                        className="outline" 
                        style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#fca5a5', color: '#dc2626', backgroundColor: '#fef2f2' }}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ];

    const categoryColumns = [
        { field: 'categoryCode', headerName: '카테고리 코드', width: 180, cellStyle: { fontWeight: 'bold', color: '#0f172a' } },
        { field: 'categoryName', headerName: '카테고리명', width: 180, cellStyle: { color: '#4338ca', fontWeight: 'bold' } },
        { 
            field: 'availableVariables', 
            headerName: '지원하는 발송 치환변수 목록', 
            flex: 2,
            cellRenderer: p => {
                if (!p.value) return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>지원 변수 없음</span>;
                return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 0' }}>
                        {p.value.split(',').map((v, idx) => {
                            const [code, desc] = v.split(':').map(s => s.trim());
                            return (
                                <span key={idx} style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', padding: '2px 6px', color: '#334155' }} title={desc}>
                                    {"${" + code + "}"}
                                </span>
                            );
                        })}
                    </div>
                );
            }
        },
        {
            headerName: '관리',
            width: 160,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '100%' }}>
                    <button 
                        onClick={() => handleEditCategory(params.data)} 
                        className="outline" 
                        style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#cbd5e1', color: '#475569', backgroundColor: '#fff' }}
                    >
                        수정
                    </button>
                    <button 
                        onClick={() => handleDeleteCategory(params.data.id)} 
                        className="outline" 
                        style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#fca5a5', color: '#dc2626', backgroundColor: '#fef2f2' }}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ];

    const handleMarkReplied = async (id) => {
        const remarks = window.prompt("회신 메모 또는 요약 내용을 입력하세요 (선택사항):", "유선/오프라인 접수 확인");
        if (remarks === null) return;
        try {
            await api.markMailHistoryReplied(id, remarks);
            toast.success("회신 완료 처리되었습니다.");
            loadMailHistories(true);
        } catch (e) {
            console.error(e);
            toast.error("회신 처리 중 오류가 발생했습니다.");
        }
    };

    const handleSendReminder = async (id) => {
        if (!window.confirm("제조사에 즉시 리마인드 메일을 재발송하시겠습니까? (어뷰징 방지: 1분 1회 제한)")) return;
        try {
            await api.sendMailHistoryReminder(id);
            toast.success("리마인드 메일이 성공적으로 재발송되었습니다.");
            loadMailHistories(true);
        } catch (e) {
            const msg = e.response?.data?.message || e.message || "발송 실패";
            toast.warn(msg);
        }
    };

    const mailHistoryColumns = [
        {
            field: 'domain',
            headerName: '구분',
            width: 110,
            cellRenderer: p => {
                const isClaim = p.value === 'CLAIM';
                return (
                    <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: isClaim ? '#fee2e2' : '#e0e7ff',
                        color: isClaim ? '#dc2626' : '#4338ca'
                    }}>
                        {isClaim ? '클레임' : '생산감리'}
                    </span>
                );
            }
        },
        { field: 'sourceNumber', headerName: '문서/품목번호', width: 160, cellStyle: { fontWeight: '700', color: '#0f172a' } },
        { field: 'templateName', headerName: '적용 양식', width: 160 },
        { field: 'manufacturer', headerName: '수신 제조사', width: 140, cellStyle: { fontWeight: 'bold', color: '#0284c7' } },
        { field: 'recipientEmail', headerName: '수신 이메일', width: 180 },
        { field: 'subject', headerName: '메일 제목', flex: 1.5 },
        { 
            field: 'sentAt', 
            headerName: '발송일시', 
            width: 150,
            cellRenderer: p => p.value ? p.value.replace('T', ' ').substring(0, 16) : '-'
        },
        {
            field: 'dispatchType',
            headerName: '발송 유형',
            width: 120,
            cellRenderer: p => {
                const isAuto = p.value === 'AUTO_REMINDER';
                const isManualRem = p.value === 'MANUAL_REMINDER';
                const bg = isAuto ? '#fef3c7' : isManualRem ? '#ffedd5' : '#f1f5f9';
                const col = isAuto ? '#d97706' : isManualRem ? '#ea580c' : '#475569';
                const label = isAuto ? '자동 리마인드' : isManualRem ? '수동 리마인드' : '최초 발송';
                return (
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', backgroundColor: bg, color: col }}>
                        {label}
                    </span>
                );
            }
        },
        {
            field: 'reminderCount',
            headerName: '리마인드',
            width: 90,
            cellRenderer: p => (
                <span style={{ fontWeight: 'bold', color: (p.value > 0) ? '#ea580c' : '#94a3b8' }}>
                    {p.value > 0 ? `${p.value}회차` : '0회'}
                </span>
            )
        },
        {
            field: 'status',
            headerName: '회신 상태',
            width: 120,
            cellRenderer: p => {
                if (p.value === 'REPLIED') {
                    return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#15803d' }}>✅ 회신 완료</span>;
                }
                if (p.value === 'OVERDUE') {
                    return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#b91c1c' }}>🚨 회신 지연</span>;
                }
                return <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef3c7', color: '#b45309' }}>⏳ 회신 대기</span>;
            }
        },
        {
            field: 'leadTimeHours',
            headerName: '소요시간(리드타임)',
            width: 140,
            cellRenderer: p => {
                if (p.value != null) {
                    const days = Math.floor(p.value / 24);
                    const hours = (p.value % 24).toFixed(1);
                    return (
                        <span style={{ fontWeight: 'bold', color: p.value > 72 ? '#dc2626' : '#2563eb' }}>
                            {days > 0 ? `${days}일 ${hours}시간` : `${hours}시간`}
                        </span>
                    );
                }
                return <span style={{ color: '#94a3b8' }}>-</span>;
            }
        },
        {
            headerName: '관리 / 액션',
            width: 220,
            pinned: 'right',
            cellRenderer: p => {
                const item = p.data;
                return (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedHistory(item);
                                setIsPreviewModalOpen(true);
                            }}
                            className="outline"
                            style={{ padding: '4px 8px', fontSize: '11px', borderColor: '#cbd5e1', color: '#334155', backgroundColor: '#fff', borderRadius: '4px' }}
                        >
                            👁️ 내용
                        </button>
                        {item.status !== 'REPLIED' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleMarkReplied(item.id)}
                                    style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid #86efac', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                    title="전화나 외부 채널로 회신받은 경우 수동 완료 처리"
                                >
                                    ✅ 회신확인
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSendReminder(item.id)}
                                    style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid #fed7aa', backgroundColor: '#fff7ed', color: '#c2410c', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                    title="제조사에 즉시 리마인드 메일 발송 (1분 1회 제한)"
                                >
                                    ⏰ 리마인드
                                </button>
                            </>
                        )}
                    </div>
                );
            }
        }
    ];

    const filteredMailHistories = useMemo(() => {
        return mailHistories.filter(h => {
            if (historyStatusFilter !== 'ALL' && h.status !== historyStatusFilter) {
                return false;
            }
            if (historySearchFilter) {
                const q = historySearchFilter.toLowerCase();
                const matchMfr = h.manufacturer && h.manufacturer.toLowerCase().includes(q);
                const matchSub = h.subject && h.subject.toLowerCase().includes(q);
                const matchNum = h.sourceNumber && h.sourceNumber.toLowerCase().includes(q);
                const matchEmail = h.recipientEmail && h.recipientEmail.toLowerCase().includes(q);
                return matchMfr || matchSub || matchNum || matchEmail;
            }
            return true;
        });
    }, [mailHistories, historyStatusFilter, historySearchFilter]);

    const kpiSummary = useMemo(() => {
        const total = mailHistories.length;
        const replied = mailHistories.filter(h => h.status === 'REPLIED').length;
        const pending = mailHistories.filter(h => h.status === 'PENDING').length;
        const overdue = mailHistories.filter(h => h.status === 'OVERDUE').length;
        const repliedWithLeadTime = mailHistories.filter(h => h.leadTimeHours != null);
        const avgLeadTime = repliedWithLeadTime.length > 0 
            ? (repliedWithLeadTime.reduce((acc, cur) => acc + cur.leadTimeHours, 0) / repliedWithLeadTime.length).toFixed(1)
            : '-';
        return { total, replied, pending, overdue, avgLeadTime };
    }, [mailHistories]);

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
            
            {/* 3단계 표준 헤더 레이아웃 */}
            <div className="page-header-standard" style={{
                marginBottom: '20px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '24px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                border: '1px solid #f1f5f9'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            📧 제조사 전달 메일 양식 & 카테고리 마스터
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        {activeTab === 'templates' ? (
                            <button
                                onClick={handleAddTemplate}
                                className="primary"
                                style={{ padding: '10px 24px', fontWeight: 'bold', backgroundColor: '#4f46e5', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
                            >
                                + 새 메일 양식 추가
                            </button>
                        ) : (
                            isAdmin && (
                                <button
                                    onClick={handleAddCategory}
                                    className="primary"
                                    style={{ padding: '10px 24px', fontWeight: 'bold', backgroundColor: '#0284c7', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
                                >
                                    + 새 카테고리 추가
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* 탭 인터페이스 신설 */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', width: '100%', gap: '8px', marginTop: '10px' }}>
                    <button 
                        onClick={() => setActiveTab('templates')}
                        style={{
                            padding: '12px 20px',
                            border: 'none',
                            background: 'none',
                            fontSize: '14px',
                            fontWeight: activeTab === 'templates' ? '800' : '500',
                            color: activeTab === 'templates' ? '#4f46e5' : '#64748b',
                            borderBottom: activeTab === 'templates' ? '3px solid #4f46e5' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        📧 메일 발송 양식 마스터
                    </button>
                    {isAdmin && (
                        <button 
                            onClick={() => setActiveTab('categories')}
                            style={{
                                padding: '12px 20px',
                                border: 'none',
                                background: 'none',
                                fontSize: '14px',
                                fontWeight: activeTab === 'categories' ? '800' : '500',
                                color: activeTab === 'categories' ? '#0284c7' : '#64748b',
                                borderBottom: activeTab === 'categories' ? '3px solid #0284c7' : 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            🗂️ 발송 카테고리 & 치환 변수 관리
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            setActiveTab('history');
                            loadMailHistories();
                        }}
                        style={{
                            padding: '12px 20px',
                            border: 'none',
                            background: 'none',
                            fontSize: '14px',
                            fontWeight: activeTab === 'history' ? '800' : '500',
                            color: activeTab === 'history' ? '#0d9488' : '#64748b',
                            borderBottom: activeTab === 'history' ? '3px solid #0d9488' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        📊 메일 발송·회신 이력 & 리드타임 KPI
                    </button>
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderTop: activeTab === 'templates' ? '1px solid #f1f5f9' : 'none'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                        {activeTab === 'templates' 
                            ? '제조사로 전송될 메일 양식을 관리하고, 연동된 카테고리의 사용가능한 변수들을 동적으로 치환해 활용합니다.'
                            : activeTab === 'categories'
                            ? '메일 발송 화면별로 새로운 카테고리를 추가하고, 해당 카테고리에서 동적 변환에 사용 가능한 지원변수(치환 토큰)를 직접 설정합니다.'
                            : '제조사별 메일 발송 현황, 회신 소요시간(Lead Time), 미회신 지연 건수 및 리마인드 이력을 통합 분석합니다.'}
                    </div>
                    {activeTab === 'templates' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="primary"
                                onClick={handleSearch}
                                style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px', borderRadius: '8px' }}
                            >
                                🔍 조회
                            </button>
                            <button
                                className="outline"
                                onClick={handleReset}
                                style={{ padding: '10px 16px', fontSize: '14px', borderRadius: '8px', backgroundColor: '#fff', border: '1px solid #cbd5e1' }}
                            >
                                ♻️ 초기화
                            </button>
                        </div>
                    )}
                    {activeTab === 'history' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="primary"
                                onClick={() => loadMailHistories(true)}
                                style={{ backgroundColor: '#0d9488', padding: '10px 20px', fontWeight: 'bold', fontSize: '13px', borderRadius: '8px', color: '#fff', border: 'none', cursor: 'pointer' }}
                            >
                                🔄 이력 새로고침
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'templates' ? (
                <>
                    {/* 검색 필터 카드 */}
                    <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>📝 메일 양식명</label>
                                <input
                                    type="text"
                                    placeholder="양식명 검색"
                                    value={searchFields.templateName}
                                    onChange={(e) => setSearchFields({ ...searchFields, templateName: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fcfcfc' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>👁️ 메일 내용/본문</label>
                                <input
                                    type="text"
                                    placeholder="본문 키워드 검색"
                                    value={searchFields.body}
                                    onChange={(e) => setSearchFields({ ...searchFields, body: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fcfcfc' }}
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* ag-Grid 테이블 */}
                    <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', minHeight: 0, borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                        <AgGridReact theme="legacy"
                            rowData={filteredTemplates}
                            columnDefs={templateColumns}
                            defaultColDef={{ resizable: true, sortable: true, filter: true }}
                            pagination={true}
                            paginationPageSize={20}
                            rowHeight={54}
                            overlayLoadingTemplate={loading ? '<span class="ag-overlay-loading-center">데이터를 불러오는 중입니다...</span>' : undefined}
                        />
                    </div>
                </>
            ) : activeTab === 'categories' ? (
                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', minHeight: 0, borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                    <AgGridReact theme="legacy"
                        rowData={categories}
                        columnDefs={categoryColumns}
                        defaultColDef={{ resizable: true, sortable: true, filter: true }}
                        pagination={true}
                        paginationPageSize={20}
                        rowHeight={54}
                    />
                </div>
            ) : (
                /* 📊 메일 발송·회신 이력 & 리드타임 KPI 탭 뷰 */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', minHeight: 0 }}>
                    {/* 1. 상단 KPI 서머리 카드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <div style={{ backgroundColor: '#fff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>총 발송 건수</div>
                            <div style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', marginTop: '6px' }}>
                                {kpiSummary.total}<span style={{ fontSize: '14px', fontWeight: 'normal', color: '#94a3b8' }}> 건</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                                회신율: {kpiSummary.total > 0 ? ((kpiSummary.replied / kpiSummary.total) * 100).toFixed(1) : 0}%
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#fff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#15803d' }}>✅ 회신 완료 (Lead Time)</div>
                            <div style={{ fontSize: '26px', fontWeight: '800', color: '#16a34a', marginTop: '6px' }}>
                                {kpiSummary.replied}<span style={{ fontSize: '14px', fontWeight: 'normal', color: '#86efac' }}> 건</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#15803d', marginTop: '4px', fontWeight: '600' }}>
                                평균 회신 소요시간: {kpiSummary.avgLeadTime}시간
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#fff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #fef08a', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#a16207' }}>⏳ 미회신 대기 중</div>
                            <div style={{ fontSize: '26px', fontWeight: '800', color: '#ca8a04', marginTop: '6px' }}>
                                {kpiSummary.pending}<span style={{ fontSize: '14px', fontWeight: 'normal', color: '#fde047' }}> 건</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#854d0e', marginTop: '4px' }}>
                                리마인드 주기 도래 시 자동 발송
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#fff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b91c1c' }}>🚨 회신 지연 (Overdue)</div>
                            <div style={{ fontSize: '26px', fontWeight: '800', color: '#dc2626', marginTop: '6px' }}>
                                {kpiSummary.overdue}<span style={{ fontSize: '14px', fontWeight: 'normal', color: '#fca5a5' }}> 건</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px', fontWeight: 'bold' }}>
                                긴급 품질팀 확인 필요
                            </div>
                        </div>
                    </div>

                    {/* 2. 제조사별 회신 성향 & 리드타임 벤치마크 카드 섹션 */}
                    {leadTimeStats && leadTimeStats.length > 0 && (
                        <div style={{ backgroundColor: '#fff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    🏭 제조사별 회신 소요시간(Lead Time) 및 요청 빈도 현황
                                </h3>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    * 평균 회신시간이 짧을수록 신속 대응 우수 제조사
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '12px' }}>
                                {leadTimeStats.map((stat, idx) => {
                                    const avgHours = stat.avgLeadTimeHours != null ? stat.avgLeadTimeHours.toFixed(1) : '-';
                                    const isFast = stat.avgLeadTimeHours != null && stat.avgLeadTimeHours <= 24;
                                    const isSlow = stat.avgLeadTimeHours != null && stat.avgLeadTimeHours > 72;
                                    const replyRate = stat.totalDispatches > 0 ? ((stat.repliedCount / stat.totalDispatches) * 100).toFixed(0) : 0;

                                    return (
                                        <div key={idx} style={{
                                            padding: '14px 16px',
                                            borderRadius: '10px',
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>
                                                    {stat.manufacturer}
                                                </span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    fontWeight: 'bold',
                                                    backgroundColor: isFast ? '#dcfce7' : isSlow ? '#fee2e2' : '#f1f5f9',
                                                    color: isFast ? '#15803d' : isSlow ? '#b91c1c' : '#475569'
                                                }}>
                                                    {isFast ? '⚡ 신속 회신' : isSlow ? '⚠️ 지연 주의' : '정상 회신'}
                                                </span>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#475569' }}>
                                                <div>발송: <strong>{stat.totalDispatches}</strong>건 (회신 {replyRate}%)</div>
                                                <div>평균 소요: <strong style={{ color: isFast ? '#16a34a' : isSlow ? '#dc2626' : '#2563eb' }}>{avgHours}시간</strong></div>
                                                <div>대기/지연: <strong style={{ color: '#d97706' }}>{stat.pendingCount}</strong> / <strong style={{ color: '#dc2626' }}>{stat.overdueCount}</strong></div>
                                                <div>평균 리마인드: <strong>{stat.avgReminderCount != null ? stat.avgReminderCount.toFixed(1) : 0}회</strong></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 3. 이력 목록 필터 및 ag-Grid */}
                    <div style={{ backgroundColor: '#fff', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>상태 필터:</span>
                            {['ALL', 'PENDING', 'REPLIED', 'OVERDUE'].map(st => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setHistoryStatusFilter(st)}
                                    style={{
                                        padding: '5px 12px',
                                        fontSize: '12px',
                                        borderRadius: '8px',
                                        border: historyStatusFilter === st ? '1px solid #0d9488' : '1px solid #cbd5e1',
                                        backgroundColor: historyStatusFilter === st ? '#0d9488' : '#fff',
                                        color: historyStatusFilter === st ? '#fff' : '#475569',
                                        fontWeight: historyStatusFilter === st ? 'bold' : 'normal',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {st === 'ALL' ? '전체' : st === 'PENDING' ? '⏳ 대기' : st === 'REPLIED' ? '✅ 완료' : '🚨 지연'}
                                </button>
                            ))}
                        </div>

                        <div style={{ width: '300px' }}>
                            <input
                                type="text"
                                placeholder="제조사, 제목, 문서번호 검색..."
                                value={historySearchFilter}
                                onChange={e => setHistorySearchFilter(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    <div className="ag-theme-alpine" style={{ flex: 1, minHeight: '350px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                        <AgGridReact theme="legacy"
                            rowData={filteredMailHistories}
                            columnDefs={mailHistoryColumns}
                            defaultColDef={{ resizable: true, sortable: true, filter: true }}
                            pagination={true}
                            paginationPageSize={20}
                            rowHeight={52}
                            overlayLoadingTemplate={loading ? '<span class="ag-overlay-loading-center">이력을 불러오는 중입니다...</span>' : undefined}
                        />
                    </div>
                </div>
            )}

            {/* --- 3. 메일 본문 내용 확인 모달 --- */}
            {isPreviewModalOpen && selectedHistory && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000,
                    padding: '20px'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '750px', maxHeight: '85vh', backgroundColor: '#fff',
                        borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
                                📨 발송 메일 원문 확인
                            </h3>
                            <button onClick={() => setIsPreviewModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '24px', color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
                                <div><strong>문서번호:</strong> {selectedHistory.sourceNumber || '-'}</div>
                                <div><strong>제조사:</strong> {selectedHistory.manufacturer || '-'}</div>
                                <div><strong>수신처:</strong> {selectedHistory.recipientEmail}</div>
                                <div><strong>발송일시:</strong> {selectedHistory.sentAt ? selectedHistory.sentAt.replace('T', ' ') : '-'}</div>
                                <div><strong>발송자:</strong> {selectedHistory.sentBy || 'SYSTEM'}</div>
                                <div><strong>상태:</strong> {selectedHistory.status} (리마인드 {selectedHistory.reminderCount}회)</div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', color: '#334155', marginBottom: '6px' }}>메일 제목</label>
                                <div style={{ padding: '10px 14px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
                                    {selectedHistory.subject}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', color: '#334155', marginBottom: '6px' }}>메일 본문</label>
                                <div 
                                    style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', minHeight: '180px', maxHeight: '350px', overflowY: 'auto' }}
                                    dangerouslySetInnerHTML={{ __html: selectedHistory.body || '<p style="color:#94a3b8">내용 없음</p>' }}
                                />
                            </div>
                            {selectedHistory.replyRemarks && (
                                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#166534' }}>
                                    <strong>회신 메모:</strong> {selectedHistory.replyRemarks}
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
                            <button onClick={() => setIsPreviewModalOpen(false)} style={{ padding: '8px 18px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 1. 메일 양식 등록/수정 모달 --- */}
            {isTemplateModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(6px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000,
                    padding: '20px'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '850px', maxHeight: '90vh', backgroundColor: '#ffffff',
                        borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.7)'
                    }}>
                        <div style={{
                            padding: '24px 30px', borderBottom: '1px solid #e2e8f0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'linear-gradient(to right, #f8fafc, #ffffff)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                📑 {editingTemplate ? '메일 양식 상세 수정' : '새 메일 양식 등록 마스터'}
                            </h3>
                            <button onClick={() => setIsTemplateModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '28px', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
                        </div>

                        <form onSubmit={handleTemplateSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '30px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '13px', color: '#334155' }}>양식 코드 (영문/숫자/_)</label>
                                        <input 
                                            type="text" 
                                            value={templateFormData.templateCode} 
                                            onChange={(e) => setTemplateFormData({ ...templateFormData, templateCode: e.target.value })} 
                                            required 
                                            disabled={!!editingTemplate} 
                                            placeholder="예: CLAIM_DEFAULT"
                                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', backgroundColor: editingTemplate ? '#f1f5f9' : '#fff' }}
                                        />
                                        {!editingTemplate && <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>* 등록된 양식 코드는 수정 불가</small>}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '13px', color: '#334155' }}>양식명</label>
                                        <input 
                                            type="text" 
                                            value={templateFormData.templateName} 
                                            onChange={(e) => setTemplateFormData({ ...templateFormData, templateName: e.target.value })} 
                                            required 
                                            placeholder="예: 기본 제조사 클레임 통보 양식" 
                                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '13px', color: '#334155' }}>발송 카테고리</label>
                                        <select 
                                            value={templateFormData.category} 
                                            onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value })}
                                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', backgroundColor: '#fff' }}
                                        >
                                            {categories.map(c => (
                                                <option key={c.id} value={c.categoryCode}>{c.categoryName} ({c.categoryCode})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '13px', color: '#334155' }}>메일 제목</label>
                                        <input 
                                            type="text" 
                                            value={templateFormData.subject} 
                                            onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })} 
                                            required 
                                            placeholder="이메일 발송 제목 입력"
                                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '13px', color: '#334155' }}>메일 본문 (HTML 지원)</label>
                                    <textarea 
                                        value={templateFormData.body} 
                                        onChange={(e) => setTemplateFormData({ ...templateFormData, body: e.target.value })} 
                                        required 
                                        rows="12" 
                                        style={{ width: '100%', padding: '12px', fontFamily: 'monospace', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px', lineHeight: '1.6', resize: 'vertical' }}
                                        placeholder="본문 내용을 입력하세요. HTML 태그가 지원됩니다."
                                    />
                                    
                                    {/* 템플릿 치환 변수 목록 동적 가이드 신설 */}
                                    <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', fontSize: '13px' }}>
                                        <strong style={{ color: '#4f46e5', display: 'block', marginBottom: '8px' }}>💡 선택한 카테고리 지원 변수 목록 (더블 클릭 또는 복사하여 본문에 붙여넣어 사용)</strong>
                                        {activeCategoryVariables.length > 0 ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 15px', color: '#475569' }}>
                                                {activeCategoryVariables.map((v, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <code 
                                                            style={{ backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', color: '#4f46e5', cursor: 'pointer' }}
                                                            title="클릭하여 복사"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText("${" + v.code + "}");
                                                                toast.info(`\${${v.code}} 복사 완료!`);
                                                            }}
                                                        >
                                                            {"${" + v.code + "}"}
                                                        </code>
                                                        <span style={{ fontSize: '12px', color: '#64748b' }}>: {v.desc}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>이 카테고리에는 등록된 지원 변수가 없습니다. 카테고리 관리 탭에서 변수를 등록해주세요.</span>
                                        )}
                                    </div>
                                </div>

                                {/* ⚙️ 이력 보관 수량 및 자동 리마인드 엔진 설정 섹션 */}
                                <div style={{ padding: '16px 20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            ⚙️ 발송 이력 보관 및 자동 리마인드 설정 (Auto-Reminder Engine)
                                        </h4>
                                        <span style={{ fontSize: '11px', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                            비용 제로 자동화
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '700', marginBottom: '6px', fontSize: '12px', color: '#334155' }}>
                                                최대 이력 보관 수량 (건당)
                                            </label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="100" 
                                                value={templateFormData.maxHistoryCount || 20} 
                                                onChange={(e) => setTemplateFormData({ ...templateFormData, maxHistoryCount: parseInt(e.target.value) || 20 })}
                                                style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff' }}
                                            />
                                            <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                                * 클레임/감리 1건당 최대 보관할 발송 이력 개수 (기본 20개, 초과 시 자동 정리)
                                            </small>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontWeight: '700', marginBottom: '6px', fontSize: '12px', color: '#334155' }}>
                                                자동 리마인드 발송 활성화
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px', fontSize: '13px', fontWeight: '600', color: templateFormData.autoReminderEnabled ? '#15803d' : '#64748b' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={templateFormData.autoReminderEnabled || false} 
                                                    onChange={(e) => setTemplateFormData({ ...templateFormData, autoReminderEnabled: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#16a34a' }}
                                                />
                                                미회신 시 자동 리마인드 엔진 가동
                                            </label>
                                        </div>
                                    </div>

                                    {templateFormData.autoReminderEnabled && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '12px', paddingTop: '10px', borderTop: '1px dashed #bbf7d0' }}>
                                            <div>
                                                <label style={{ display: 'block', fontWeight: '600', fontSize: '12px', color: '#334155', marginBottom: '4px' }}>
                                                    미회신 리마인드 주기
                                                </label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                        max="30" 
                                                        value={templateFormData.reminderIntervalDays || 3} 
                                                        onChange={(e) => setTemplateFormData({ ...templateFormData, reminderIntervalDays: parseInt(e.target.value) || 3 })}
                                                        style={{ width: '65px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff' }}
                                                    />
                                                    <span style={{ fontSize: '13px', color: '#475569' }}>일 후 발송</span>
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontWeight: '600', fontSize: '12px', color: '#334155', marginBottom: '4px' }}>
                                                    최대 리마인드 횟수
                                                </label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                        max="5" 
                                                        value={templateFormData.maxReminderCount || 2} 
                                                        onChange={(e) => setTemplateFormData({ ...templateFormData, maxReminderCount: parseInt(e.target.value) || 2 })}
                                                        style={{ width: '65px', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff' }}
                                                    />
                                                    <span style={{ fontSize: '13px', color: '#475569' }}>회 제한</span>
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontWeight: '600', fontSize: '12px', color: '#334155', marginBottom: '4px' }}>
                                                    리마인드 전용 양식
                                                </label>
                                                <select 
                                                    value={templateFormData.reminderTemplateCode || ''} 
                                                    onChange={(e) => setTemplateFormData({ ...templateFormData, reminderTemplateCode: e.target.value })}
                                                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', backgroundColor: '#fff' }}
                                                >
                                                    <option value="">(기본) 원본 양식 + [리마인드 N차] 접두어</option>
                                                    {templates.filter(t => t.templateCode !== templateFormData.templateCode).map(t => (
                                                        <option key={t.id} value={t.templateCode}>{t.templateName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', color: '#334155', fontSize: '13px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={templateFormData.active} 
                                            onChange={(e) => setTemplateFormData({ ...templateFormData, active: e.target.checked })}
                                            style={{ width: '17px', height: '17px', accentColor: '#4f46e5' }}
                                        />
                                        해당 이메일 양식을 즉시 활성화하여 실무 발송에 연동합니다.
                                    </label>
                                </div>
                            </div>

                            <div className="modal-footer" style={{ padding: '16px 30px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
                                <button type="button" onClick={() => setIsTemplateModalOpen(false)} style={{ padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff', color: '#475569', fontWeight: 'bold', cursor: 'pointer', minWidth: '80px' }}>닫기</button>
                                <button type="submit" style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', backgroundColor: '#003366', color: '#fff', fontWeight: 'bold', cursor: 'pointer', minWidth: '120px' }}>💾 템플릿 저장</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 2. 카테고리 & 지원변수 등록/수정 모달 --- */}
            {isCategoryModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(6px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000,
                    padding: '20px'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '600px', maxHeight: '90vh', backgroundColor: '#ffffff',
                        borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.7)'
                    }}>
                        <div style={{
                            padding: '24px 30px', borderBottom: '1px solid #e2e8f0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'linear-gradient(to right, #f8fafc, #ffffff)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🗂️ {editingCategory ? '카테고리 상세 수정' : '새 카테고리 등록 마스터'}
                            </h3>
                            <button onClick={() => setIsCategoryModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '28px', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
                        </div>

                        <form onSubmit={handleCategorySave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '30px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '13px', color: '#334155' }}>카테고리 코드 (영문대문자/_)</label>
                                    <input 
                                        type="text" 
                                        value={categoryFormData.categoryCode} 
                                        onChange={(e) => setCategoryFormData({ ...categoryFormData, categoryCode: e.target.value.toUpperCase() })} 
                                        required 
                                        disabled={!!editingCategory} 
                                        placeholder="예: CLAIM, PRODUCTION_AUDIT"
                                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', backgroundColor: editingCategory ? '#f1f5f9' : '#fff' }}
                                    />
                                    {!editingCategory && <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>* 카테고리 코드는 한 번 등록하면 수정 불가</small>}
                                </div>
                                
                                <div>
                                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '13px', color: '#334155' }}>카테고리 이름</label>
                                    <input 
                                        type="text" 
                                        value={categoryFormData.categoryName} 
                                        onChange={(e) => setCategoryFormData({ ...categoryFormData, categoryName: e.target.value })} 
                                        required 
                                        placeholder="예: 클레임 관리, 생산감리"
                                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '13px', color: '#334155' }}>
                                        지원 변수 설정 (변수명:한글설명, 한 줄에 하나씩)
                                    </label>
                                    <textarea 
                                        value={categoryFormData.availableVariables} 
                                        onChange={(e) => setCategoryFormData({ ...categoryFormData, availableVariables: e.target.value })} 
                                        rows="8" 
                                        style={{ width: '100%', padding: '12px', fontFamily: 'monospace', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px', lineHeight: '1.6', resize: 'vertical' }}
                                        placeholder={"예시:\nclaimNumber:클레임 문서번호\nproductName:제품명\nitemCode:품목코드"}
                                    />
                                    <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '8px', fontSize: '11px', color: '#0369a1' }}>
                                        * 입력된 변수는 메일 발송 템플릿 제작 시 <strong>{"${변수명}"}</strong> 형태로 동적 자동 치환될 수 있도록 QMS 엔진과 연동됩니다.
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer" style={{ padding: '16px 30px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc' }}>
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} style={{ padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff', color: '#475569', fontWeight: 'bold', cursor: 'pointer', minWidth: '80px' }}>닫기</button>
                                <button type="submit" style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', backgroundColor: '#003366', color: '#fff', fontWeight: 'bold', cursor: 'pointer', minWidth: '120px' }}>💾 카테고리 저장</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .outline:hover {
                    background-color: #f8fafc !important;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .primary:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                button {
                    transition: all 0.2s ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default MailTemplatePage;
