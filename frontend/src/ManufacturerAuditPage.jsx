import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
    searchManufacturerAudits,
    deleteManufacturerAudit,
    getAuditTemplates,
    getAuditTemplate,
    saveManufacturerAudit,
    uploadAuditPhoto,
    exportAuditToExcel,
    getManufacturerAuditHistory,
    getBaseURL
} from './api';
import { toast } from 'react-toastify';
import ManufacturerSearchModal from './ManufacturerSearchModal';
import { usePermissions } from './usePermissions';

const ManufacturerAuditPage = ({ user }) => {
    const { canEdit, canDelete } = usePermissions(user);
    const gridRef = useRef(null);
    const [rowData, setRowData] = useState([]);
    // [수정] 초기 검색 기간 설정 (종료일: 오늘, 시작일: 6개월 전)
    const getInitialSearchDates = () => {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setFullYear(now.getFullYear() - 1); // 1년 전으로 확장 (데이터 노출 증대)
        return {
            startDate: sixMonthsAgo.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0]
        };
    };

    const initialDates = getInitialSearchDates();

    const [searchFields, setSearchFields] = useState({
        manufacturerName: '',
        manufacturerCode: '',
        startDate: initialDates.startDate,
        endDate: initialDates.endDate,
        grade: ''
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [fullTemplate, setFullTemplate] = useState(null);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [activeTab, setActiveTab] = useState('form');
    const [auditHistory, setAuditHistory] = useState([]);

    const fieldTranslations = {
        'AuditDate': '점검 일자',
        'AuditType': '점검 유형',
        'Auditor': '점검 담당자',
        'TotalScore': '총점 (%)',
        'Grade': '등급',
        'PositiveFeedback': '긍정적 피드백',
        'NegativeFeedback': '부적합 항목',
        'FinalEvaluation': '최종 평가',
        'results': '점검 결과',
        'groupResults': '그룹 총평'
    };

    const [formData, setFormData] = useState({
        auditDate: new Date().toISOString().split('T')[0],
        manufacturer: null,
        template: null,
        auditType: '정기',
        positiveFeedback: '',
        negativeFeedback: '',
        positivePhotos: [],
        negativePhotos: [],
        results: [],
        groupResults: [],
        finalEvaluation: '',
        auditor: user?.name || ''
    });

    const [manufacturerCode, setManufacturerCode] = useState('');
    const [manufacturerNameSearch, setManufacturerNameSearch] = useState('');

    useEffect(() => {
        loadAudits();
        loadTemplates();
    }, []);

    const loadAudits = async () => {
        try {
            const data = await searchManufacturerAudits(searchFields);
            setRowData(data || []);
        } catch (error) {
            toast.error('데이터를 불러오는데 실패했습니다.');
        }
    };

    const loadTemplates = async () => {
        try {
            const data = await getAuditTemplates();
            setTemplates(data || []);
        } catch (error) {
            toast.error('템플릿 목록을 불러오는데 실패했습니다.');
        }
    };

    const handleSearch = () => loadAudits();

    const handleCreateNew = () => {
        setSelectedAudit(null);
        setFullTemplate(null);
        setFormData({
            manufacturer: null,
            auditDate: new Date().toISOString().split('T')[0],
            auditType: '정기',
            template: null,
            totalScore: 0,
            grade: '',
            finalEvaluation: '',
            positiveFeedback: '',
            negativeFeedback: '',
            positivePhotos: [],
            negativePhotos: [],
            results: [],
            groupResults: [],
            auditor: user?.name || ''
        });
        setActiveTab('form');
        setIsModalOpen(true);
    };

    const handleEditAudit = async (audit) => {
        setSelectedAudit(audit);
        const mCode = audit.manufacturer?.manufacturerCode || audit.manufacturer?.identificationCode || '';
        setManufacturerCode(mCode);

        setFormData({
            ...audit,
            template: audit.template || null,
            positivePhotos: (audit.positivePhotos || []).map(u => u.startsWith('http') ? u : getBaseURL() + u),
            negativePhotos: (audit.negativePhotos || []).map(u => u.startsWith('http') ? u : getBaseURL() + u),
            groupResults: (audit.groupResults || []).map(gr => ({
                ...gr,
                feedback: (gr.feedback || '').replace(/\[그룹 점수: \d+ \/ \d+\]/g, '').trim()
            }))
        });

        if (audit.template && audit.template.id) {
            try {
                const templateData = await getAuditTemplate(audit.template.id);
                setFullTemplate(templateData);
            } catch (e) {
                toast.error('템플릿 정보를 가져오지 못했습니다.');
            }
        }

        try {
            const history = await getManufacturerAuditHistory(audit.id);
            setAuditHistory(history || []);
        } catch (e) {
            console.error('History load fail', e);
        }

        setActiveTab('form');
        setIsModalOpen(true);
    };

    const handleSelectManufacturer = (m) => {
        const mCode = m.manufacturerCode || m.identificationCode || '';

        if (selectedAudit || isModalOpen) {
            setManufacturerCode(mCode);
            let matchedTemplate = null;
            if (m.category) {
                matchedTemplate = templates.find(t => t.targetCategory === m.category);
                if (!matchedTemplate) {
                    matchedTemplate = templates.find(t => t.classificationName === `${m.category} 제조사 Audit`) ||
                        templates.find(t => t.classificationName?.includes(m.category));
                }
            }

            setFormData(prev => ({
                ...prev,
                manufacturer: m,
                template: matchedTemplate || prev.template
            }));

            if (matchedTemplate) {
                handleTemplateChange(matchedTemplate.id);
            }
        } else {
            setSearchFields(prev => ({
                ...prev,
                manufacturerName: m.name,
                manufacturerCode: mCode
            }));
        }
        setShowSearchModal(false);
    };

    const handleTemplateChange = async (templateId) => {
        if (!templateId) {
            setFullTemplate(null);
            setFormData(prev => ({ ...prev, template: null, results: [] }));
            return;
        }

        try {
            const templateData = await getAuditTemplate(templateId);
            setFullTemplate(templateData);
            const newResults = [];
            templateData.groups.forEach(group => {
                group.items.forEach(item => {
                    newResults.push({
                        item: { id: item.id, itemContent: item.itemContent },
                        score: 5,
                        remarks: ''
                    });
                });
            });

            setFormData(prev => ({
                ...prev,
                template: { id: templateId, classificationName: templateData.classificationName },
                results: newResults,
                groupResults: templateData.groups.map(g => ({ group: { id: g.id }, feedback: '' }))
            }));
        } catch (error) {
            toast.error('템플릿 상세 정보를 불러오지 못했습니다.');
        }
    };

    const handleScoreChange = (itemId, score) => {
        setFormData(prev => {
            const updatedResults = prev.results.map(r =>
                r.item.id === itemId ? { ...r, score: parseInt(score) } : r
            );
            return { ...prev, results: updatedResults };
        });
    };

    const handleRemarksChange = (itemId, remarks) => {
        setFormData(prev => {
            const updatedResults = prev.results.map(r =>
                r.item.id === itemId ? { ...r, remarks } : r
            );
            return { ...prev, results: updatedResults };
        });
    };

    const handleFileUpload = async (e, type) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const currentPhotos = type === 'positive' ? formData.positivePhotos : formData.negativePhotos;
        if (currentPhotos.length + files.length > 20) {
            toast.warning('최대 20장까지 업로드 가능합니다.');
            return;
        }

        for (const file of files) {
            if (file.size > 3 * 1024 * 1024) {
                toast.error(`${file.name} 파일이 3MB를 초과합니다.`);
                continue;
            }

            try {
                const res = await uploadAuditPhoto(file);
                const fileUrl = getBaseURL() + res.data;
                setFormData(prev => ({
                    ...prev,
                    [type === 'positive' ? 'positivePhotos' : 'negativePhotos']: [...prev[type === 'positive' ? 'positivePhotos' : 'negativePhotos'], fileUrl]
                }));
            } catch (error) {
                toast.error(`${file.name} 업로드 실패`);
            }
        }
        e.target.value = null;
    };

    const removePhoto = (index, type) => {
        setFormData(prev => {
            const key = type === 'positive' ? 'positivePhotos' : 'negativePhotos';
            const updated = [...prev[key]];
            updated.splice(index, 1);
            return { ...prev, [key]: updated };
        });
    };

    const handleSave = async () => {
        if (!formData.manufacturer) return toast.warning('제조사를 선택해주세요.');
        if (!formData.template) return toast.warning('분류(템플릿)를 선택해주세요.');

        try {
            await saveManufacturerAudit(formData);
            toast.success('저장되었습니다.');
            setIsModalOpen(false);
            loadAudits();
        } catch (error) {
            toast.error('저장에 실패했습니다.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('정말 이 Audit 내역을 삭제하시겠습니까? 삭제된 데이터는 휴지통에서 확인 가능합니다.')) {
            try {
                await deleteManufacturerAudit(id);
                toast.success('삭제되었습니다.');
                setIsModalOpen(false);
                loadAudits();
            } catch (error) {
                toast.error('삭제에 실패했습니다.');
            }
        }
    };

    const handleExportExcel = async (id) => {
        try {
            const res = await exportAuditToExcel(id);
            const url = window.URL.createObjectURL(new Blob([res]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Audit_Report_${id}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            toast.error('Excel 다운로드 실패');
        }
    };

    const colDefs = useMemo(() => [
        { field: 'id', headerName: 'ID', width: 70 },
        {
            headerName: '제조사 코드',
            width: 130,
            valueGetter: params => params.data.manufacturer?.manufacturerCode || params.data.manufacturer?.identificationCode || '-'
        },
        { headerName: '제조사명', field: 'manufacturer.name', filter: true, width: 180, sortable: true },
        { field: 'template.classificationName', headerName: '분류', width: 150 },
        { field: 'auditDate', headerName: '점검일자', width: 110 },
        { field: 'modifierInfo', headerName: '작성자', width: 100 },
        { field: 'totalScore', headerName: '총점(%)', width: 90 },
        {
            field: 'grade',
            headerName: '등급',
            width: 80,
            cellRenderer: (p) => <b style={{ color: p.value === 'A' ? '#389e0d' : p.value === 'B' ? '#096dd9' : '#cf1322' }}>{p.value}</b>
        },
        { field: 'updatedAt', headerName: '최종 수정일자', width: 160, valueFormatter: p => p.value ? p.value.replace('T', ' ').substring(0, 19) : '' },
        {
            headerName: '관리',
            width: 140,
            sortable: false,
            filter: false,
            cellRenderer: (p) => (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', height: '100%' }}>
                    <button onClick={() => handleEditAudit(p.data)} className="secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>수정</button>
                    <button onClick={() => handleExportExcel(p.data.id)} className="outline" style={{ padding: '2px 8px', fontSize: '11px' }}>Excel</button>
                    {canDelete('manufacturerAudits') && (
                        <button onClick={() => handleDelete(p.data.id)} className="danger" style={{ padding: '2px 8px', fontSize: '11px', backgroundColor: '#fff5f5', color: '#c53030', border: '1px solid #feb2b2' }}>삭제</button>
                    )}
                </div>
            )
        }
    ], [canDelete]);

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>

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
                            📋 제조사 Audit 관리
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="primary"
                            onClick={handleCreateNew}
                            style={{ padding: '10px 24px', fontWeight: 'bold', backgroundColor: '#4f46e5' }}
                        >
                            + 신규 Audit 등록
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
                        제조사별 현장 점검 결과 및 등급을 관리합니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="outline"
                            onClick={() => toast.info('검색 결과 엑셀 다운로드 기능 준비 중입니다.')}
                            style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                        >
                            📊 결과 다운로드
                        </button>
                        <button
                            className="primary"
                            onClick={handleSearch}
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            🔍 조회
                        </button>
                        <button
                            className="outline"
                            onClick={() => setSearchFields({ ...getInitialSearchDates(), manufacturerName: '', manufacturerCode: '', grade: '' })}
                            style={{ padding: '10px 16px', fontSize: '14px' }}
                        >
                            ♻️ 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 필터 그리드 - 날짜 우선 순위 */}
            <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>

                    {/* 1. 날짜 (시작일/종료일) - 넓게 배치하여 겹침 방지 */}
                    <div style={{ gridColumn: 'span 2', minWidth: '400px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>🗓️ 점검 기간</label>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <input type="date" value={searchFields.startDate} onChange={e => setSearchFields({ ...searchFields, startDate: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                            <span style={{ color: '#94a3b8' }}>~</span>
                            <input type="date" value={searchFields.endDate} onChange={e => setSearchFields({ ...searchFields, endDate: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
                        </div>
                    </div>

                    {/* 2. 제조사 정보 */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>🏭 제조사 정보</label>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <input
                                type="text"
                                readOnly
                                placeholder="코드"
                                value={searchFields.manufacturerCode}
                                style={{ width: '100px', padding: '8px', background: '#f8fafc', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                            />
                            <div
                                onClick={() => {
                                    setSelectedAudit(null);
                                    setShowSearchModal(true);
                                }}
                                style={{ cursor: 'pointer', fontSize: '18px', padding: '0 5px', backgroundColor: '#f1f5f9', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                title="제조사 검색"
                            >
                                🔍
                            </div>
                            <input
                                type="text"
                                readOnly
                                placeholder="제조사명 (검색 버튼 이용)"
                                value={searchFields.manufacturerName}
                                style={{ flex: 1, padding: '8px', background: '#f8fafc', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                            />
                        </div>
                    </div>
                    {/* 3. 등급 */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🏆 등급</label>
                        <select
                            value={searchFields.grade}
                            onChange={e => setSearchFields({ ...searchFields, grade: e.target.value })}
                            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', height: '42px' }}
                        >
                            <option value="">전체</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <AgGridReact
                    theme="legacy"
                    ref={gridRef}
                    rowData={rowData}
                    columnDefs={colDefs}
                    pagination={true}
                    paginationPageSize={20}
                    onRowDoubleClicked={(p) => handleEditAudit(p.data)}
                />
            </div>

            {isModalOpen && (
                <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
                    <div className="card" style={{ width: '1200px', maxWidth: '98vw', maxHeight: '92vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ padding: '0 25px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '60px' }}>
                                <button onClick={() => setActiveTab('form')} style={{ padding: '0 30px', height: '45px', fontSize: '14px', fontWeight: 'bold', border: 'none', background: 'transparent', borderBottom: activeTab === 'form' ? '3px solid #3b82f6' : 'none', color: activeTab === 'form' ? '#3b82f6' : '#64748b', cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none' }}>점검 내용</button>
                                {selectedAudit && <button onClick={() => setActiveTab('history')} style={{ padding: '0 30px', height: '45px', fontSize: '14px', fontWeight: 'bold', border: 'none', background: 'transparent', borderBottom: activeTab === 'history' ? '3px solid #3b82f6' : 'none', color: activeTab === 'history' ? '#3b82f6' : '#64748b', cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none' }}>변경 이력</button>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{formData.manufacturer?.name} | {formData.auditDate}</span>
                                <button onClick={() => setIsModalOpen(false)} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>&times;</button>
                            </div>
                        </div>

                        {activeTab === 'form' ? (
                            <>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '25px' }}>
                                    {/* Modal Content omitted for brevity in this scratch but should be complete in actual file */}
                                    {/* (Rest of the original form content) */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr', gap: '20px', marginBottom: '25px', padding: '15px', background: '#f1f5f9', borderRadius: '8px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>제조사 정보</label>
                                            <div style={{ display: 'flex', gap: '5px', marginTop: '5px', alignItems: 'center' }}>
                                                <input type="text" readOnly placeholder="코드" value={manufacturerCode} style={{ width: '85px', padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} />
                                                <div onClick={() => setShowSearchModal(true)} style={{ cursor: 'pointer', fontSize: '18px', padding: '0 5px' }} title="제조사 검색">🔍</div>
                                                <input type="text" readOnly placeholder="제조사명" value={formData.manufacturer?.name || ''} style={{ flex: 1, padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>점검 분류 (템플릿)</label>
                                            <select value={formData.template?.id || ''} onChange={e => handleTemplateChange(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', marginTop: '5px', fontSize: '13px', height: '35px' }}>
                                                <option value="">분류 선택</option>
                                                {templates.map(t => <option key={t.id} value={t.id}>{t.classificationName}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>점검일자 / 유형</label>
                                            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                                <input type="date" value={formData.auditDate} onChange={e => setFormData({ ...formData, auditDate: e.target.value })} style={{ flex: 2, padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} />
                                                <select value={formData.auditType} onChange={e => setFormData({ ...formData, auditType: e.target.value })} style={{ flex: 1, padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}>
                                                    <option value="정기">정기</option>
                                                    <option value="신규">신규</option>
                                                    <option value="비정기">비정기</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>점검 담당자</label>
                                            <input type="text" value={formData.auditor || ''} onChange={e => setFormData({ ...formData, auditor: e.target.value })} placeholder="담당자 이름" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', marginTop: '5px', fontSize: '13px' }} />
                                        </div>
                                    </div>
                                    {fullTemplate ? (
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                    <tr>
                                                        <th style={{ padding: '12px', textAlign: 'left', width: '180px' }}>그룹</th>
                                                        <th style={{ padding: '12px', textAlign: 'left' }}>점검 항목</th>
                                                        <th style={{ padding: '12px', textAlign: 'center', width: '280px' }}>평가 점수 (1~5)</th>
                                                        <th style={{ padding: '12px', textAlign: 'left', width: '250px' }}>비고</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {fullTemplate.groups.map(group => (
                                                        <React.Fragment key={group.id}>
                                                            {group.items.map((item, idx) => (
                                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                    {idx === 0 && (
                                                                        <td rowSpan={group.items.length} style={{ padding: '12px', background: '#f8fafc', fontWeight: 'bold', verticalAlign: 'top', borderRight: '1px solid #f1f5f9' }}>{group.groupName}</td>
                                                                    )}
                                                                    <td style={{ padding: '12px' }}>{item.itemContent}</td>
                                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                                            {[1, 2, 3, 4, 5].map(s => {
                                                                                const isSelected = formData.results.find(r => r.item.id === item.id)?.score === s;
                                                                                return (
                                                                                    <button key={s} type="button" onClick={() => handleScoreChange(item.id, s)} style={{ width: '36px', height: '36px', borderRadius: '6px', border: isSelected ? '2px solid #3b82f6' : '1px solid #ddd', cursor: 'pointer', backgroundColor: isSelected ? '#3b82f6' : 'white', color: isSelected ? 'white' : '#475569', fontWeight: isSelected ? 'bold' : '500', fontSize: '14px' }}>{s}</button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '8px' }}>
                                                                        <input type="text" value={formData.results.find(r => r.item.id === item.id)?.remarks || ''} onChange={(e) => handleRemarksChange(item.id, e.target.value)} style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px' }} />
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                                <td colSpan={2} style={{ padding: '12px', fontWeight: 'bold', color: '#1e40af', textAlign: 'right' }}>
                                                                    {group.groupName} 그룹 총평
                                                                    {(() => {
                                                                        const groupItems = (formData.results || []).filter(r => {
                                                                            const rid = r.item?.id || r.itemId;
                                                                            return group.items.some(gi => gi.id === rid);
                                                                        });
                                                                        const score = groupItems.reduce((acc, curr) => acc + (curr.score || 0), 0);
                                                                        const max = (group.items || []).length * 5;
                                                                        const percent = max > 0 ? Math.round(score / max * 100) : 0;
                                                                        return (
                                                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                                                                <span style={{ color: '#1e40af', fontWeight: 'bold' }}>그룹 점수: {score} / {max}</span>
                                                                                <span style={{ color: percent >= 80 ? '#059669' : percent >= 60 ? '#d97706' : '#dc2626' }}>({percent}%)</span>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td colSpan={2} style={{ padding: '8px' }}>
                                                                    <textarea value={formData.groupResults.find(gr => gr.group.id === group.id)?.feedback || ''} onChange={(e) => { const val = e.target.value; setFormData(prev => { const existing = prev.groupResults.find(gr => gr.group.id === group.id); let newGroupResults; if (existing) { newGroupResults = prev.groupResults.map(gr => gr.group.id === group.id ? { ...gr, feedback: val } : gr); } else { newGroupResults = [...prev.groupResults, { group: { id: group.id }, feedback: val }]; } return { ...prev, groupResults: newGroupResults }; }); }} placeholder={`${group.groupName} 점검 결과에 대한 전반적인 의견을 입력하세요.`} style={{ width: '100%', padding: '8px', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '12px', minHeight: '50px' }} />
                                                                </td>
                                                            </tr>
                                                        </React.Fragment>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>점검 분류를 먼저 선택하시면 해당 항목이 나타납니다.</div>
                                    )}
                                    <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                            <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#166534' }}>👍 긍정적인 부분</label>
                                            <textarea value={formData.positiveFeedback || ''} onChange={e => setFormData({ ...formData, positiveFeedback: e.target.value })} rows={3} style={{ width: '100%', padding: '10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '13px', marginBottom: '10px' }} placeholder="현장 점검 시 확인된 우수한 점을 기록하세요." />
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                                    <span style={{ fontSize: '12px', color: '#666' }}>사진 첨부 ({formData.positivePhotos.length}/20)</span>
                                                    <label className="secondary" style={{ padding: '4px 10px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>파일 선택<input type="file" multiple accept="image/*" onChange={e => handleFileUpload(e, 'positive')} style={{ display: 'none' }} /></label>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                    {formData.positivePhotos.map((url, idx) => (
                                                        <div key={idx} style={{ position: 'relative', width: '120px', height: '120px' }}>
                                                            <img src={url} alt="pos" onClick={() => setPreviewImage(url)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eee', cursor: 'pointer' }} />
                                                            <button onClick={() => removePhoto(idx, 'positive')} style={{ position: 'absolute', top: '0', right: '0', background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', width: '20px', height: '20px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                            <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#991b1b' }}>⚠️ 부적합 항목</label>
                                            <textarea value={formData.negativeFeedback || ''} onChange={e => setFormData({ ...formData, negativeFeedback: e.target.value })} rows={3} style={{ width: '100%', padding: '10px', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '13px', marginBottom: '10px' }} placeholder="현장 점검 시 확인된 부적합 및 개선이 필요한 항목을 기록하세요." />
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                                    <span style={{ fontSize: '12px', color: '#666' }}>사진 첨부 ({formData.negativePhotos.length}/20)</span>
                                                    <label className="secondary" style={{ padding: '4px 10px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>파일 선택<input type="file" multiple accept="image/*" onChange={e => handleFileUpload(e, 'negative')} style={{ display: 'none' }} /></label>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                    {formData.negativePhotos.map((url, idx) => (
                                                        <div key={idx} style={{ position: 'relative', width: '120px', height: '120px' }}>
                                                            <img src={url} alt="neg" onClick={() => setPreviewImage(url)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eee', cursor: 'pointer' }} />
                                                            <button onClick={() => removePhoto(idx, 'negative')} style={{ position: 'absolute', top: '0', right: '0', background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', width: '20px', height: '20px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '25px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>최종 평가 및 개선 요청사항</label>
                                        <textarea value={formData.finalEvaluation || ''} onChange={e => setFormData({ ...formData, finalEvaluation: e.target.value })} rows={4} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }} placeholder="전반적인 총평과 부적합 항목에 대한 조치 필요사항을 입력하세요." />
                                    </div>
                                </div>
                                <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px', justifyContent: 'flex-end', background: '#f8fafc' }}>
                                    {selectedAudit && canDelete('manufacturerAudits') && (
                                        <button
                                            className="outline"
                                            onClick={() => handleDelete(selectedAudit.id)}
                                            style={{ padding: '10px 25px', color: '#c53030', borderColor: '#feb2b2', marginRight: 'auto' }}
                                        >
                                            🗑️ 삭제
                                        </button>
                                    )}
                                    <button className="secondary" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 25px' }}>취소</button>
                                    <button className="primary" onClick={handleSave} style={{ padding: '10px 35px', fontWeight: 'bold' }}>데이터 저장 및 결과 분석</button>
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, overflowY: 'auto', padding: '25px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {(() => {
                                        const groups = [];
                                        auditHistory.forEach(rec => {
                                            const time = rec.modifiedAt?.substring(0, 19);
                                            const modifier = rec.modifier;
                                            let g = groups.find(x => x.time === time && x.modifier === modifier);
                                            if (!g) {
                                                g = { time, modifier, records: [] };
                                                groups.push(g);
                                            }
                                            g.records.push(rec);
                                        });
                                        if (groups.length === 0) return <div style={{ textAlign: 'center', padding: '100px 0', color: '#94a3b8' }}>변경 이력이 없습니다.</div>;
                                        return groups.map((g, idx) => (
                                            <div key={idx} className="card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                                                    <span style={{ fontSize: '16px' }}>🕒</span>
                                                    <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>{g.modifier}</span>
                                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>| {g.time?.replace('T', ' ')}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {g.records.map(rec => {
                                                        const formatVal = (v, field) => { if (!v) return '없음'; if (field.startsWith('GroupFeedback')) return v.replace(/\[그룹 점수: \d+ \/ \d+\]/g, '').trim() || '점수만 입력됨'; return v; };
                                                        const fieldName = rec.fieldName.startsWith('GroupFeedback:') ? `[그룹총평] ${rec.fieldName.split(':')[1]}` : (fieldTranslations[rec.fieldName] || rec.fieldName);
                                                        return (
                                                            <div key={rec.id} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '20px', alignItems: 'start', fontSize: '13px' }}>
                                                                <div style={{ color: '#64748b', fontWeight: '500' }}>{fieldName}</div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                    <span style={{ color: '#94a3b8', textDecoration: 'line-through', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatVal(rec.oldValue, rec.fieldName)}</span>
                                                                    <span style={{ color: '#3b82f6' }}>→</span>
                                                                    <span style={{ color: '#1e293b', fontWeight: '600', maxWidth: '400px' }}>{formatVal(rec.newValue, rec.fieldName)}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showSearchModal && <ManufacturerSearchModal onClose={() => setShowSearchModal(false)} onSelect={handleSelectManufacturer} />}
            {previewImage && (
                <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'pointer' }}>
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                        <img src={previewImage} alt="미리보기" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
                        <button onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: '-15px', right: '-15px', background: 'white', color: '#333', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '20px', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManufacturerAuditPage;
