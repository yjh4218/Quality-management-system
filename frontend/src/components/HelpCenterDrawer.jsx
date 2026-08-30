import React, { useState, useEffect } from 'react';
import { getPageGuide } from '../api';
import { pageGuides } from '../guides/pageGuides';

/**
 * 작업 병행형 스마트 가이드 드로어 (Side Drawer / Floating Mode)
 * 사용자가 화면에서 작업(입력, 검토)을 하면서 우측에서 실시간으로 가이드를 열어두고 참고할 수 있습니다.
 */
const HelpCenterDrawer = ({ currentPage, onClose, user, isDrawer = true }) => {
    const [guide, setGuide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('current'); // 'current' | 'all'
    const [selectedPageKey, setSelectedPageKey] = useState(currentPage);

    const isManufacturer = user?.roles?.some(r => r.authority?.includes('MANUFACTURER'));

    useEffect(() => {
        setSelectedPageKey(currentPage);
    }, [currentPage]);

    useEffect(() => {
        const fetchGuide = async () => {
            try {
                setLoading(true);
                const data = await getPageGuide(selectedPageKey);
                if (data.sectionsJson) {
                    data.sections = JSON.parse(data.sectionsJson);
                }
                setGuide(data);
            } catch (error) {
                // Fallback to local dictionary
                const fallback = pageGuides[selectedPageKey] || {
                    title: "📄 이용 가이드",
                    sections: [
                        {
                            subtitle: "안내",
                            content: "이 화면에 대한 상세 가이드가 아직 준비되지 않았거나 서버 통신에 실패했습니다."
                        }
                    ]
                };
                setGuide(fallback);
            } finally {
                setLoading(false);
            }
        };

        fetchGuide();
    }, [selectedPageKey]);

    // 전체 가이드 목록 필터링
    const filteredGuideKeys = Object.keys(pageGuides).filter(k => {
        const item = pageGuides[k];
        const text = `${item.title} ${item.sections?.map(s => s.subtitle + ' ' + s.content).join(' ')}`.toLowerCase();
        return text.includes(searchQuery.toLowerCase());
    });

    return (
        <div className={`help-drawer-overlay ${isDrawer ? 'drawer-mode' : 'modal-mode'}`} onClick={onClose}>
            <div className="help-drawer-container" onClick={e => e.stopPropagation()}>
                {/* 상단 헤더 */}
                <div className="help-drawer-header">
                    <div className="help-drawer-header-left">
                        <span className="help-drawer-badge">📖 사용자 매뉴얼</span>
                        <h3 className="help-drawer-title">{loading ? "가이드 로딩 중..." : guide?.title}</h3>
                    </div>
                    <div className="help-drawer-header-actions">
                        <div className="help-mode-toggle">
                            <button
                                className={`help-mode-btn ${viewMode === 'current' ? 'active' : ''}`}
                                onClick={() => setViewMode('current')}
                            >
                                현재 화면
                            </button>
                            <button
                                className={`help-mode-btn ${viewMode === 'all' ? 'active' : ''}`}
                                onClick={() => setViewMode('all')}
                            >
                                전체 목차
                            </button>
                        </div>
                        <button className="help-drawer-close" onClick={onClose} title="닫기 (ESC)">✕</button>
                    </div>
                </div>

                {/* 전체 목차 검색창 (전체 보기 모드일 때) */}
                {viewMode === 'all' && (
                    <div className="help-drawer-search">
                        <input
                            type="text"
                            placeholder="39개 화면 가이드 실시간 검색..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="help-search-input"
                        />
                        <div className="help-guide-chips">
                            {filteredGuideKeys.slice(0, 10).map(key => (
                                <button
                                    key={key}
                                    className={`help-guide-chip ${key === selectedPageKey ? 'active' : ''}`}
                                    onClick={() => setSelectedPageKey(key)}
                                >
                                    {pageGuides[key]?.title?.replace(/^[^\s]+\s/, '') || key}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 본문 콘텐츠 */}
                <div className="help-drawer-body">
                    {loading ? (
                        <div className="help-loading-state">
                            <div className="help-spinner"></div>
                            <span>가이드 정보를 불러오고 있습니다...</span>
                        </div>
                    ) : (
                        <>
                            {isManufacturer && (
                                <div className="help-manufacturer-banner">
                                    <div className="help-mfg-title">🤝 제조사 담당자 필수 업무 요령</div>
                                    <div className="help-mfg-desc">
                                        이 페이지는 완제품 품질 관리에 필수적인 협업 지점입니다. 
                                        제조 사양 변경 또는 품질 이상 징후 감증 시 즉각 소명 등록 또는 품질 담당자에게 전달해 주세요.
                                    </div>
                                </div>
                            )}

                            <div className="help-sections-list">
                                {guide?.sections?.map((section, idx) => (
                                    <div key={idx} className="help-section-box">
                                        <div className="help-section-num">0{idx + 1}</div>
                                        <div className="help-section-main">
                                            <h4 className="help-section-subtitle">{section.subtitle}</h4>
                                            <p className="help-section-content">{section.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="help-quick-tip-card">
                                <span className="help-tip-icon">💡</span>
                                <div>
                                    <strong>스마트 팁:</strong> 궁금한 기능이나 오류 발생 시 상단 헤더의 🐞 버그 리포트 또는 <kbd className="cmd-mini-kbd">Ctrl+K</kbd> 퀵 검색을 활용하세요.
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 하단 푸터 */}
                <div className="help-drawer-footer">
                    <span className="help-footer-text">QMS Enterprise User Guide v2.4 • 배포 자동 동기화 적용됨</span>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>창 닫기</button>
                </div>
            </div>
        </div>
    );
};

export default HelpCenterDrawer;
