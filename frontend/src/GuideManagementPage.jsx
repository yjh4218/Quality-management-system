import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { getPageGuides, savePageGuide, deletePageGuide } from './api';
import { toast } from 'react-toastify';
import { usePermissions } from './usePermissions';

/**
 * 사용자 가이드 관리 페이지 (관리자 전용)
 * [디자인 표준화] 제품코드 마스터의 20px 여백 및 표준 그리드 레이아웃을 적용했습니다.
 * [UX 개선] 기존 카드 형태에서 Ag-Grid 기반의 데이터 중심 레이아웃으로 전환하여 대량의 가이드 데이터를 효율적으로 관리합니다.
 */
const GuideManagementPage = ({ user }) => {
    const { canEdit, canDelete } = usePermissions(user);
    const canEditGuide = canEdit('guideManagement');
    const canDeleteGuide = canDelete('guideManagement');
    const [guides, setGuides] = useState([]);
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [quickFilterText, setQuickFilterText] = useState('');

    useEffect(() => {
        fetchGuides();
    }, []);

    const fetchGuides = async () => {
        try {
            setLoading(true);
            const data = await getPageGuides();
            setGuides(data);
        } catch (error) {
            toast.error("가이드 목록 로딩 실패");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (guide) => {
        const parsedSections = guide.sectionsJson ? JSON.parse(guide.sectionsJson) : [];
        setSelectedGuide({ ...guide, sections: parsedSections });
        setIsEditing(true);
    };

    const handleCreateNew = () => {
        setSelectedGuide({
            pageKey: '',
            title: '',
            sections: [{ subtitle: '', content: '' }]
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            if (!selectedGuide.pageKey || !selectedGuide.title) {
                toast.error("페이지 키와 제목을 입력해 주세요.");
                return;
            }

            const validSections = selectedGuide.sections.filter(s => s.subtitle.trim() || s.content.trim());
            if (validSections.length === 0) {
                toast.error("최소 하나의 유효한 섹션 내용을 입력해 주세요.");
                return;
            }

            const dataToSave = {
                ...selectedGuide,
                sectionsJson: JSON.stringify(validSections)
            };

            await savePageGuide(dataToSave);
            toast.success("사용법 가이드가 안전하게 저장되었습니다.");
            setIsEditing(false);
            fetchGuides();
        } catch (error) {
            toast.error("저장 중 오류가 발생했습니다.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("정말 이 가이드를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) return;
        try {
            await deletePageGuide(id);
            toast.success("가이드가 삭제되었습니다.");
            fetchGuides();
        } catch (error) {
            toast.error("삭제 실패");
        }
    };

    const columnDefs = useMemo(() => [
        { field: "id", headerName: "ID", width: 80, pinned: 'left' },
        { field: "pageKey", headerName: "페이지 키 (APP_KEY)", width: 200, filter: true, cellStyle: { fontWeight: '800', color: 'var(--primary-color)' } },
        { field: "title", headerName: "가이드 제목", flex: 1, filter: true, cellStyle: { fontWeight: '800', color: '#1a202c' } },
        { 
            field: "updatedAt", 
            headerName: "최종 수정일", 
            width: 180, 
            valueFormatter: (p) => p.value ? new Date(p.value).toLocaleString() : '-'
        },
        {
            headerName: "관리",
            width: 160,
            sortable: false,
            filter: false,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
                    <button 
                        className="secondary" 
                        onClick={() => handleEdit(params.data)}
                        style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '800' }}
                        disabled={!canEditGuide}
                    >
                        수정
                    </button>
                    <button 
                        className="secondary" 
                        onClick={() => handleDelete(params.data.id)}
                        style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '800', color: '#e53e3e', background: '#fff5f5' }}
                        disabled={!canDeleteGuide}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ], [canEditGuide, canDeleteGuide]);

    if (loading && !isEditing) return (
        <div className="global-loading-overlay">
            <div className="spinner-ring"></div>
            <div className="loading-text">가이드 시스템 환경 설정을 로드 중입니다...</div>
        </div>
    );

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
                            📖 사용자 가이드 마스터 관리
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {canEditGuide && !isEditing && (
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
                                    cursor: 'pointer'
                                }}
                            >
                                ➕ 신규 가이드 등록
                            </button>
                        )}
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
                        시스템 각 모듈별 도움말을 동적으로 구성하고 배포합니다.
                    </div>
                    {!isEditing && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                className="outline" 
                                onClick={() => alert("가이드 목록 엑셀 다운로드 기능 준비 중입니다.")}
                                style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                            >
                                📊 결과 다운로드
                            </button>
                            <button 
                                className="primary" 
                                onClick={fetchGuides} 
                                style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                            >
                                🔍 조회
                            </button>
                            <button 
                                className="outline" 
                                onClick={() => setQuickFilterText('')} 
                                style={{ padding: '10px 16px', fontSize: '14px' }}
                            >
                                ♻️ 초기화
                            </button>
                        </div>
                    )}
                    {isEditing && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                className="primary" 
                                onClick={handleSave} 
                                style={{ backgroundColor: '#1e293b', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                            >
                                💾 가이드 저장
                            </button>
                            <button 
                                className="outline" 
                                onClick={() => setIsEditing(false)} 
                                style={{ padding: '10px 16px', fontSize: '14px' }}
                            >
                                ❌ 취소
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {!isEditing ? (
                <>
                    {/* 검색 필터 그리드 */}
                    <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔍 가이드 검색</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="가이드 제목, 키워드 검색..."
                                        value={quickFilterText}
                                        onChange={(e) => setQuickFilterText(e.target.value)}
                                        style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}
                                    />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 데이터 카드 */}
                    <div className="card" style={{ padding: '24px', borderRadius: '16px', flex: 1, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0' }}>
                        <div style={{ marginBottom: '15px', fontWeight: '800', fontSize: '14px', color: '#64748b' }}>
                            등록된 가이드 수: <span style={{ color: '#2563eb' }}>{guides.length}</span> 건
                        </div>
                        <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                            <AgGridReact
                                theme="legacy"
                                rowHeight={55}
                                rowData={guides}
                                columnDefs={columnDefs}
                                pagination={true}
                                paginationPageSize={50}
                                quickFilterText={quickFilterText}
                                animateRows={true}
                                onRowDoubleClicked={(p) => handleEdit(p.data)}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <div className="guide-editor-wrapper" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                    <div className="card" style={{ padding: '40px', borderRadius: '24px', border: '1px solid #edf2f7', boxShadow: '0 20px 50px rgba(0, 51, 102, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>
                                {selectedGuide.id ? '🛠️ 가이드 마스터 정보 편집' : '✨ 신규 가이드 마스터 생성'}
                            </h3>
                            <button className="secondary" onClick={() => setIsEditing(false)} style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, border: 'none', background: '#f1f5f9' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '30px' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: '700', fontSize: '14px' }}>페이지 식별 키 (Page Key)</label>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        placeholder="예: dashboard"
                                        value={selectedGuide.pageKey}
                                        onChange={(e) => setSelectedGuide({ ...selectedGuide, pageKey: e.target.value })}
                                        disabled={selectedGuide.id}
                                        style={{ background: selectedGuide.id ? '#f8fafc' : '#fff', borderRadius: '12px 0 0 12px', borderRight: 'none', fontWeight: '600' }}
                                    />
                                    <div className="input-group-addon" style={{ borderRadius: '0 12px 12px 0', background: '#edf2f7', fontWeight: '800', color: '#718096' }}>APP_KEY</div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: '700', fontSize: '14px' }}>가이드 대표 제목 (Title)</label>
                                <input
                                    type="text"
                                    placeholder="사용자에게 노출될 가이드 제목"
                                    value={selectedGuide.title}
                                    onChange={(e) => setSelectedGuide({ ...selectedGuide, title: e.target.value })}
                                    style={{ fontWeight: '800', borderRadius: '12px' }}
                                />
                            </div>
                        </div>

                        <div className="sections-container" style={{ marginTop: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <h4 style={{ margin: 0, color: '#2d3748', fontSize: '17px', fontWeight: '800' }}>
                                    📝 상세 안내 섹션 리스트 <span style={{ fontSize: '12px', fontWeight: '400', color: '#a0aec0', marginLeft: '8px' }}>총 {selectedGuide.sections.length}개</span>
                                </h4>
                                <button className="secondary" onClick={() => setSelectedGuide(prev => ({ ...prev, sections: [...prev.sections, { subtitle: '', content: '' }] }))} style={{ fontSize: '13px', background: '#ebf4ff', color: 'var(--primary-color)', border: 'none', fontWeight: '700', borderRadius: '8px' }}>
                                    ➕ 섹션 추가하기
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {selectedGuide.sections.map((section, idx) => (
                                    <div key={idx} style={{ padding: '30px', background: '#fff', borderRadius: '20px', border: '1px solid #edf2f7', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '900', color: '#cbd5e0', letterSpacing: '1px' }}>SECTION {idx + 1}</span>
                                            <button
                                                onClick={() => {
                                                    if (selectedGuide.sections.length <= 1) return;
                                                    const newSections = selectedGuide.sections.filter((_, i) => i !== idx);
                                                    setSelectedGuide({ ...selectedGuide, sections: newSections });
                                                }}
                                                style={{ padding: '0', background: 'transparent', color: '#fc8181', fontSize: '18px', border: 'none', cursor: 'pointer' }}
                                            >✕</button>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '20px' }}>
                                            <input
                                                type="text"
                                                placeholder="섹션 소제목"
                                                value={section.subtitle}
                                                onChange={(e) => {
                                                    const newSections = [...selectedGuide.sections];
                                                    newSections[idx].subtitle = e.target.value;
                                                    setSelectedGuide({ ...selectedGuide, sections: newSections });
                                                }}
                                                style={{ border: 'none', borderBottom: '2px solid #f1f5f9', borderRadius: 0, padding: '10px 0', fontSize: '16px', fontWeight: '800', background: 'transparent' }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <textarea
                                                placeholder="상세 내용"
                                                rows="4"
                                                value={section.content}
                                                onChange={(e) => {
                                                    const newSections = [...selectedGuide.sections];
                                                    newSections[idx].content = e.target.value;
                                                    setSelectedGuide({ ...selectedGuide, sections: newSections });
                                                }}
                                                style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: '12px', resize: 'vertical', padding: '15px' }}
                                            ></textarea>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                            <button className="secondary" onClick={() => setIsEditing(false)} style={{ padding: '14px 40px', borderRadius: '12px', minWidth: '150px' }}>취소</button>
                            <button className="primary" onClick={handleSave} style={{ padding: '14px 60px', borderRadius: '12px', minWidth: '220px', fontWeight: '800', background: 'linear-gradient(135deg, var(--primary-color), #0056b3)', boxShadow: '0 8px 20px rgba(0, 51, 102, 0.2)' }}>
                                가이드 최종 저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuideManagementPage;
