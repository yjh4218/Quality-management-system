import React, { useState, useEffect } from 'react';
import { getPageGuide } from '../../api';
import { pageGuides } from '../../guides/pageGuides';

/**
 * 📖 규제 표준 및 업무 매뉴얼 안내 배너 (RegulatoryManualBanner)
 * - DEC-10: 신규 eQMS 규제 프로세스 화면 상단에 규제 기준(ISO 13485 / ISO 22716), 입력 가이드라인, 승인 절차 매뉴얼 뷰 연동
 * - 백엔드 SystemPageGuide 및 pageGuides 로컬 사전과 실시간 연동
 * - 접기/펼치기 상태 브라우저 세션 보존, 콤팩트 뷰 지원
 */
const RegulatoryManualBanner = ({ 
    pageKey = 'medicalDevices', 
    standardLabel = 'ISO 13485:2016 / 의료기기법 제6조 (품목허가 및 품질관리기준)',
    onNavigate = null 
}) => {
    const storageKey = `qms_guide_banner_collapsed_${pageKey}`;
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            return localStorage.getItem(storageKey) === 'true';
        } catch (e) {
            return false;
        }
    });
    const [guide, setGuide] = useState(null);
    const [loading, setLoading] = useState(true);

    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            try {
                localStorage.setItem(storageKey, String(next));
            } catch (e) {
                // ignore storage error
            }
            return next;
        });
    };

    useEffect(() => {
        let isMounted = true;
        const fetchGuideData = async () => {
            try {
                setLoading(true);
                const data = await getPageGuide(pageKey);
                if (!isMounted) return;
                if (data && data.sectionsJson) {
                    try {
                        data.sections = JSON.parse(data.sectionsJson);
                    } catch (pe) {
                        data.sections = [];
                    }
                }
                if (data && data.sections && data.sections.length > 0) {
                    setGuide(data);
                } else {
                    setGuide(pageGuides[pageKey] || data);
                }
            } catch (err) {
                if (!isMounted) return;
                const fallback = pageGuides[pageKey] || {
                    title: "📖 표준 규제 및 프로세스 가이드",
                    sections: [
                        {
                            subtitle: "규제 준수 안내",
                            content: "해당 업무 프로세스는 관련 규격(ISO 13485 / ISO 22716) 및 법정 기준을 준수해야 합니다."
                        }
                    ]
                };
                setGuide(fallback);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchGuideData();
        return () => { isMounted = false; };
    }, [pageKey]);

    const title = guide?.title || "📖 표준 업무 매뉴얼 & 규제 기준 가이드";
    const sections = guide?.sections || [];

    return (
        <div style={{
            background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f0fa 100%)',
            border: '1px solid #bfdbfe',
            borderLeft: '4px solid #2563eb',
            borderRadius: '8px',
            padding: isCollapsed ? '10px 16px' : '14px 18px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.08)',
            transition: 'all 0.2s ease',
            position: 'relative'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
                    <span style={{ fontSize: '18px' }}>📑</span>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e3a8a' }}>
                                {title}
                            </span>
                            {standardLabel && (
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: '#dbeafe',
                                    color: '#1d4ed8',
                                    border: '1px solid #93c5fd'
                                }}>
                                    {standardLabel}
                                </span>
                            )}
                        </div>
                        {isCollapsed && sections.length > 0 && (
                            <div style={{
                                fontSize: '12px',
                                color: '#475569',
                                marginTop: '2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '700px'
                            }}>
                                💡 {sections[0]?.subtitle}: {sections[0]?.content}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {onNavigate && (
                        <button
                            type="button"
                            onClick={() => onNavigate('sopManual')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#ffffff',
                                color: '#1d4ed8',
                                border: '1px solid #93c5fd',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title="표준 업무 매뉴얼 전문으로 이동"
                        >
                            📖 SOP 매뉴얼 전문
                        </button>
                    )}
                    {onNavigate && (
                        <button
                            type="button"
                            onClick={() => onNavigate('regulatoryGuide')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#ffffff',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title="규제 표준 비교 가이드로 이동"
                        >
                            ⚖️ 규제 표준 비교
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={toggleCollapse}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                        }}
                    >
                        {isCollapsed ? '펼치기 ▼' : '접기 ▲'}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px dashed #bfdbfe',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '12px'
                }}>
                    {loading ? (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>가이드 정보를 불러오는 중입니다...</div>
                    ) : (
                        sections.map((sec, idx) => (
                            <div key={idx} style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                padding: '10px 12px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            }}>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: '#2563eb' }}>●</span> {sec.subtitle}
                                </div>
                                <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                                    {sec.content}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default RegulatoryManualBanner;
