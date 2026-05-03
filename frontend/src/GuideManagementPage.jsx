import React, { useState, useEffect } from 'react';
import { getPageGuides, savePageGuide, deletePageGuide } from './api';
import { toast } from 'react-toastify';
import { usePermissions } from './usePermissions';

/**
 * 사용자 가이드 관리 페이지 (관리자 전용)
 * 시스템 각 화면별 도움말 내용을 동적으로 수정할 수 있는 프리미엄 UI를 제공합니다.
 */
const GuideManagementPage = ({ user }) => {
    const { canEdit, canDelete } = usePermissions(user);
    const canEditGuide = canEdit('guideManagement');
    const canDeleteGuide = canDelete('guideManagement');
    const [guides, setGuides] = useState([]);
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);

    // 가이드 목록 로드
    useEffect(() => {
        fetchGuides();
    }, []);

    const fetchGuides = async () => {
        try {
            setLoading(true);
            const data = await getPageGuides();
            setGuides(data);
        } catch (error) {
            // Silently fail
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (guide) => {
        const parsedSections = guide.sectionsJson ? JSON.parse(guide.sectionsJson) : [];
        setSelectedGuide({ ...guide, sections: parsedSections });
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCreateNew = () => {
        setSelectedGuide({
            pageKey: '',
            title: '',
            sections: [{ subtitle: '', content: '' }]
        });
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAddSection = () => {
        setSelectedGuide(prev => ({
            ...prev,
            sections: [...prev.sections, { subtitle: '', content: '' }]
        }));
    };

    const handleRemoveSection = (index) => {
        if (selectedGuide.sections.length <= 1) {
            toast.warn("최소 하나의 섹션은 필요합니다.");
            return;
        }
        const newSections = selectedGuide.sections.filter((_, i) => i !== index);
        setSelectedGuide({ ...selectedGuide, sections: newSections });
    };

    const handleSectionChange = (index, field, value) => {
        const newSections = [...selectedGuide.sections];
        newSections[index][field] = value;
        setSelectedGuide({ ...selectedGuide, sections: newSections });
    };

    const handleSave = async () => {
        try {
            if (!selectedGuide.pageKey || !selectedGuide.title) {
                toast.error("페이지 키와 제목을 입력해 주세요.");
                return;
            }

            // 빈 섹션 필터링
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
            // Silently fail
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("정말 이 가이드를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) return;
        try {
            await deletePageGuide(id);
            toast.success("가이드가 삭제되었습니다.");
            fetchGuides();
        } catch (error) {
            // Silently fail
        }
    };

    if (loading && !isEditing) return (
        <div className="global-loading-overlay">
            <div className="spinner-ring"></div>
            <div className="loading-text">가이드 시스템 환경 설정을 로드 중입니다...</div>
        </div>
    );

    return (
        <div className="guide-mgmt-container" style={{ animation: 'fadeIn 0.5s ease' }}>
            {/* 상단 헤더 섹션 */}
            <div className="page-header" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1a365d', marginBottom: '8px' }}>
                        📖 사용자 가이드 마스터 관리
                    </h2>
                    <p style={{ color: '#718096', fontSize: '14px' }}>
                        시스템 각 모듈별 컨텍스트 도움말을 동적으로 구성하고 배포합니다.
                    </p>
                </div>
                {canEditGuide && !isEditing && (
                    <button className="primary" onClick={handleCreateNew} style={{ padding: '12px 24px', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0, 118, 255, 0.39)' }}>
                        ✨ 신규 가이드 등록
                    </button>
                )}
            </div>

            {!isEditing ? (
                <>
                    {guides.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '100px 20px', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)' }}>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
                            <h3 style={{ justifyContent: 'center' }}>등록된 가이드가 없습니다.</h3>
                            <p style={{ color: '#a0aec0' }}>상단의 버튼을 눌러 첫 번째 시스템 가이드를 만들어 보세요.</p>
                        </div>
                    ) : (
                        <div className="guide-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
                            {guides.map(guide => (
                                <div key={guide.id} className="card premium-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                    <div style={{ background: 'linear-gradient(45deg, #f8fafc, #ffffff)', padding: '20px', borderBottom: '1px solid #edf2f7' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-color)', background: '#e6f0ff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                {guide.pageKey}
                                            </span>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className="secondary" style={{ padding: '6px', minWidth: '32px', height: '32px', opacity: canEditGuide ? 1 : 0.5 }} title="수정" onClick={() => handleEdit(guide)} disabled={!canEditGuide}>✏️</button>
                                                <button className="secondary" style={{ padding: '6px', minWidth: '32px', height: '32px', color: '#e53e3e', opacity: canDeleteGuide ? 1 : 0.5 }} title="삭제" onClick={() => handleDelete(guide.id)} disabled={!canDeleteGuide}>🗑️</button>
                                            </div>
                                        </div>
                                        <h3 style={{ margin: '15px 0 5px 0', fontSize: '18px' }}>{guide.title}</h3>
                                        <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                                            최종 수정: {guide.updatedAt ? new Date(guide.updatedAt).toLocaleString() : '기록 없음'}
                                        </div>
                                    </div>
                                    <div style={{ padding: '15px 20px', background: '#fff' }}>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {guide.sectionsJson && JSON.parse(guide.sectionsJson).slice(0, 2).map((s, i) => (
                                                <span key={i} style={{ fontSize: '11px', color: '#718096', background: '#f1f5f9', padding: '3px 8px', borderRadius: '20px' }}>
                                                    # {s.subtitle}
                                                </span>
                                            ))}
                                            {guide.sectionsJson && JSON.parse(guide.sectionsJson).length > 2 && (
                                                <span style={{ fontSize: '11px', color: '#a0aec0' }}>...</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="guide-editor-wrapper" style={{ animation: 'slideUp 0.4s ease-out' }}>
                    <div className="card" style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', border: '1px solid var(--primary-color)', boxShadow: '0 20px 50px rgba(0, 51, 102, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px' }}>
                                {selectedGuide.id ? '🛠️ 시스템 가이드 편집' : '✨ 신규 가이드 생성'}
                            </h3>
                            <button className="secondary" onClick={() => setIsEditing(false)} style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0 }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>페이지 식별 키 (Page Key)</label>
                                <div className="input-group">
                                    <input 
                                        type="text" 
                                        placeholder="예: dashboard" 
                                        value={selectedGuide.pageKey}
                                        onChange={(e) => setSelectedGuide({...selectedGuide, pageKey: e.target.value})}
                                        disabled={selectedGuide.id}
                                        style={{ background: selectedGuide.id ? '#f8fafc' : '#fff' }}
                                    />
                                    <div className="input-group-addon">APP_KEY</div>
                                </div>
                                <p style={{ fontSize: '11px', color: '#a0aec0', marginTop: '5px' }}>
                                    * 내부 시스템 경로 값과 일치해야 합니다. (수정 불가)
                                </p>
                            </div>

                            <div className="form-group">
                                <label>가이드 대제목 (Title)</label>
                                <input 
                                    type="text" 
                                    placeholder="도움말 상단에 표시될 제목" 
                                    value={selectedGuide.title}
                                    onChange={(e) => setSelectedGuide({...selectedGuide, title: e.target.value})}
                                    style={{ fontWeight: '700' }}
                                />
                            </div>
                        </div>

                        <div className="sections-container" style={{ marginTop: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h4 style={{ margin: 0, color: '#4a5568', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📝 상세 안내 섹션 구성 <span style={{ fontSize: '12px', fontWeight: '400', color: '#a0aec0' }}>({selectedGuide.sections.length}개)</span>
                                </h4>
                                <button className="secondary" onClick={handleAddSection} style={{ fontSize: '13px', background: '#ebf4ff', color: 'var(--primary-color)', border: 'none' }}>
                                    ➕ 섹션 추가
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {selectedGuide.sections.map((section, idx) => (
                                    <div key={idx} className="section-item-card" style={{ 
                                        padding: '25px', 
                                        background: '#fff', 
                                        borderRadius: '12px', 
                                        border: '1px solid #edf2f7',
                                        position: 'relative',
                                        transition: 'all 0.2s'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#cbd5e0' }}>SECTION {idx + 1}</span>
                                            <button 
                                                onClick={() => handleRemoveSection(idx)} 
                                                style={{ padding: '0', background: 'transparent', color: '#fc8181', fontSize: '18px' }}
                                                title="이 섹션 삭제"
                                            >✕</button>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '15px' }}>
                                            <input 
                                                type="text" 
                                                placeholder="소제목 (예: 데이터 구성, 이용 방법 등)" 
                                                value={section.subtitle}
                                                onChange={(e) => handleSectionChange(idx, 'subtitle', e.target.value)}
                                                style={{ border: 'none', borderBottom: '1px solid #edf2f7', borderRadius: 0, padding: '8px 0', fontSize: '15px', fontWeight: '700' }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <textarea 
                                                placeholder="상세 내용을 입력하세요. 사용자가 이해하기 쉽게 구체적으로 작성해 주세요." 
                                                rows="3"
                                                value={section.content}
                                                onChange={(e) => handleSectionChange(idx, 'content', e.target.value)}
                                                style={{ background: '#f8fafc', border: '1px solid #edf2f7', resize: 'vertical' }}
                                            ></textarea>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="editor-actions" style={{ marginTop: '50px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <button className="secondary" onClick={() => setIsEditing(false)} style={{ minWidth: '120px', padding: '12px' }}>돌아가기</button>
                            <button className="primary" onClick={handleSave} style={{ minWidth: '180px', padding: '12px', background: 'linear-gradient(135deg, var(--primary-color), #0056b3)', boxShadow: '0 8px 20px rgba(0, 51, 102, 0.2)' }}>
                                가이드 최종 저장
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .premium-card:hover { transform: translateY(-5px); box-shadow: 0 12px 30px rgba(0,0,0,0.08) !important; }
                .section-item-card:focus-within { border-color: var(--primary-color) !important; box-shadow: 0 4px 20px rgba(0,51,102,0.05); }
                .guide-editor-wrapper input:focus, .guide-editor-wrapper textarea:focus { border-color: var(--primary-color); outline: none; }
            `}</style>
        </div>
    );
};

export default GuideManagementPage;
