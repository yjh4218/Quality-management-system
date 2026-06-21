import React, { useState, useEffect } from 'react';
import { getPageGuide } from './api';
import { toast } from 'react-toastify';

/**
 * [NEW] 제조사 파트너 전용 통합 업무 설명서 (Manufacturer Guide Page)
 * 
 * 디자인: Glassmorphism 카드, 다이내믹 그라데이션 헤더, 직관적인 탭 인터랙션을 적용하여
 * 제조사 파트너가 QMS 필수 협업 요건을 쉽게 인지하고 수행할 수 있도록 돕습니다.
 */
const ManufacturerGuidePage = () => {
    const [activeTab, setActiveTab] = useState('photoAudit');
    const [guideData, setGuideData] = useState(null);
    const [loading, setLoading] = useState(true);

    const tabs = [
        { id: 'photoAudit', label: '생산감리 사진 제출', icon: '📸', dbIndex: 0 },
        { id: 'coaSubmit', label: '입고 성적서(COA) 등록', icon: '🧪', dbIndex: 1 },
        { id: 'claimResponse', label: '불량 클레임 소명', icon: '⚠️', dbIndex: 2 }
    ];

    useEffect(() => {
        fetchGuide();
    }, []);

    const fetchGuide = async () => {
        try {
            setLoading(true);
            const data = await getPageGuide('manufacturerGuide');
            if (data) {
                const parsedSections = data.sectionsJson ? JSON.parse(data.sectionsJson) : [];
                setGuideData({
                    title: data.title || '제조 협력사 품질 가이드라인',
                    sections: parsedSections
                });
            }
        } catch (error) {
            console.error("Failed to load manufacturer guide:", error);
            toast.warning("최신 가이드를 불러오지 못했습니다. 로컬 기본 가이드가 표시됩니다.");
        } finally {
            setLoading(false);
        }
    };

    const fallbackSections = [
        {
            subtitle: "생산감리 사진 실시간 제출 필수",
            content: "제조 공장 담당자는 신제품 생산 가동 즉시, 생산감리 화면에서 공정별 현장 증빙 사진(원료 칭량, 제조 가마, 최종 완제품 등)을 시스템에 직접 촬영/업로드하여 본사의 검토 승인을 득해야 합니다."
        },
        {
            subtitle: "수입 검사 시험성적서(COA) 첨부 필수",
            content: "원부자재 및 벌크 입고 예정 건에 대해서, 공장 검사실에서 발행된 자체 시험성적서(COA) 원본 PDF 파일을 제품 입고 전에 QMS 시스템에 반드시 등록해야 본사 창고로 정상 입고 입고 처리가 허용됩니다."
        },
        {
            subtitle: "품질 불량 클레임 피드백 의무",
            content: "본사로부터 품질 불량에 따른 클레임 대응 통보를 수신하면, 24시간 이내에 본 시스템의 클레임 상세 페이지 내에서 공장 측 1차 원인 규명 소명서를 제출해 주셔야 합니다."
        }
    ];

    const getSectionData = (index) => {
        if (guideData && guideData.sections && guideData.sections[index]) {
            return guideData.sections[index];
        }
        return fallbackSections[index];
    };

    const photoAuditSection = getSectionData(0);
    const coaSubmitSection = getSectionData(1);
    const claimResponseSection = getSectionData(2);

    return (
        <div style={{ padding: '24px', minHeight: '100%', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#fff',
                padding: '32px',
                borderRadius: '24px',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', right: '-50px', top: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.08)', filter: 'blur(40px)' }}></div>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    🤝 {guideData?.title || '제조 협력사 품질 가이드라인'}
                </h1>
                <p style={{ margin: '12px 0 0 0', color: '#94a3b8', fontSize: '15px', fontWeight: '500', lineHeight: '1.6' }}>
                    본 가이드는 완제품의 완벽한 품질 확보와 원활한 유통 공급망 관리를 위해 파트너사가 필히 준수해야 할 법적/계약적 의무 사양서입니다.
                </p>
            </div>

            <div style={{
                display: 'flex',
                gap: '12px',
                padding: '8px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
            }}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '14px 20px',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                backgroundColor: isActive ? '#3b82f6' : 'transparent',
                                color: isActive ? '#fff' : '#64748b',
                                boxShadow: isActive ? '0 8px 16px rgba(59, 130, 246, 0.25)' : 'none'
                            }}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="card" style={{
                backgroundColor: '#fff',
                borderRadius: '24px',
                padding: '40px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                animation: 'fadeIn 0.3s ease-out',
                position: 'relative'
            }}>
                {loading && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(255, 255, 255, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '24px',
                        zIndex: 10
                    }}>
                        <div style={{
                            width: '40px', height: '40px',
                            border: '3px solid #edf2f7',
                            borderTop: '3px solid #3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                    </div>
                )}

                {activeTab === 'photoAudit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>📸 {photoAuditSection.subtitle}</h2>
                            <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>{photoAuditSection.content}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'coaSubmit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>🧪 {coaSubmitSection.subtitle}</h2>
                            <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>{coaSubmitSection.content}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'claimResponse' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>⚠️ {claimResponseSection.subtitle}</h2>
                            <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>{claimResponseSection.content}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManufacturerGuidePage;
