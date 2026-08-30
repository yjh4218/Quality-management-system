import React, { useState, useEffect } from 'react';
import { getPageGuide } from '../api';
import { pageGuides } from '../guides/pageGuides';

/**
 * 💡 QMS 각 화면 상세 가이드 팝업 모달 컴포넌트
 * - 화면 중앙 팝업 모달로 띄워 기존 업무 화면(그리드, 폼)을 밀지 않고 오버레이 플로팅
 * - 현재 화면 가이드 및 전체 39개 화면 가이드 실시간 검색/탐색 지원
 * - ESC 키 및 배경 클릭으로 간편 닫기
 */
const HelpCenterModal = ({ currentPage, onClose, user }) => {
    const [guide, setGuide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('current'); // 'current' | 'all'
    const [selectedPageKey, setSelectedPageKey] = useState(currentPage);

    const isManufacturer = user?.roles?.some(r => r.authority?.includes('MANUFACTURER'));

    // ESC 키로 닫기
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (currentPage) {
            setSelectedPageKey(currentPage);
        }
    }, [currentPage]);

    useEffect(() => {
        const fetchGuide = async () => {
            try {
                setLoading(true);
                const data = await getPageGuide(selectedPageKey);
                if (data && data.sectionsJson) {
                    data.sections = JSON.parse(data.sectionsJson);
                }
                setGuide(data);
            } catch (error) {
                // Fallback to local guide dictionary
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

        if (selectedPageKey) {
            fetchGuide();
        }
    }, [selectedPageKey]);

    // 전체 가이드 목록 실시간 필터링
    const filteredGuideKeys = Object.keys(pageGuides || {}).filter(k => {
        const item = pageGuides[k];
        if (!item) return false;
        const text = `${item.title || ''} ${item.sections?.map(s => (s.subtitle || '') + ' ' + (s.content || '')).join(' ') || ''}`.toLowerCase();
        return text.includes(searchQuery.toLowerCase());
    });

    return (
        <div className="modal-overlay help-popup-overlay" onClick={onClose}>
            <div className="modal-content help-popup-content" onClick={(e) => e.stopPropagation()}>
                {/* 팝업 헤더 */}
                <div className="help-popup-header">
                    <div className="help-popup-header-title-area">
                        <div className="help-popup-tag">💡 화면 상세 가이드</div>
                        <h3 className="help-popup-title">
                            {loading ? "가이드 정보를 불러오는 중..." : (guide?.title || "화면 상세 매뉴얼")}
                        </h3>
                    </div>

                    <div className="help-popup-header-controls">
                        <div className="help-mode-tabs">
                            <button
                                type="button"
                                className={`help-mode-tab-btn ${viewMode === 'current' ? 'active' : ''}`}
                                onClick={() => {
                                    setViewMode('current');
                                    setSelectedPageKey(currentPage);
                                }}
                            >
                                📌 현재 화면
                            </button>
                            <button
                                type="button"
                                className={`help-mode-tab-btn ${viewMode === 'all' ? 'active' : ''}`}
                                onClick={() => setViewMode('all')}
                            >
                                📚 전체 목차 ({Object.keys(pageGuides || {}).length})
                            </button>
                        </div>
                        <button type="button" className="help-popup-close-btn" onClick={onClose} title="닫기 (ESC)">
                            ✕
                        </button>
                    </div>
                </div>

                {/* 전체 목차 검색창 */}
                {viewMode === 'all' && (
                    <div className="help-popup-search-box">
                        <div className="help-search-input-wrapper">
                            <span className="help-search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="화면명, 기능 설명, 키워드 검색 (예: BOM, 적재, 클레임...)"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="help-popup-search-input"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="help-search-clear-btn"
                                    onClick={() => setSearchQuery('')}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <div className="help-guide-chips-scroll">
                            {filteredGuideKeys.map(key => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`help-guide-chip-btn ${key === selectedPageKey ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedPageKey(key);
                                        setViewMode('current');
                                    }}
                                >
                                    {pageGuides[key]?.title?.replace(/^[^\s]+\s/, '') || key}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 팝업 본문 */}
                <div className="help-popup-body">
                    {loading ? (
                        <div className="help-popup-loading">
                            <div className="spinner-ring" style={{ width: '32px', height: '32px', margin: '0 auto 12px auto' }}></div>
                            <p>가이드 데이터를 불러오고 있습니다...</p>
                        </div>
                    ) : (
                        <>
                            {/* 제조사 권한 안내 배너 */}
                            {isManufacturer && (
                                <div className="help-mfg-alert-banner">
                                    <div className="help-mfg-alert-title">🤝 제조사 담당자 필수 업무 요령</div>
                                    <div className="help-mfg-alert-desc">
                                        이 페이지는 완제품 품질 관리에 필수적인 협업 지점입니다. 
                                        제조 사양 변경 또는 품질 이상 징후 발생 시 즉각 소명 등록 또는 품질 담당자에게 전달해 주세요.
                                    </div>
                                </div>
                            )}

                            {/* 가이드 섹션 리스트 */}
                            <div className="help-popup-sections-grid">
                                {guide?.sections && guide.sections.length > 0 ? (
                                    guide.sections.map((section, idx) => (
                                        <div key={idx} className="help-popup-section-card">
                                            <div className="help-section-badge-num">
                                                {String(idx + 1).padStart(2, '0')}
                                            </div>
                                            <div className="help-section-content-wrap">
                                                <h4 className="help-section-card-title">{section.subtitle}</h4>
                                                <p className="help-section-card-desc">{section.content}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                                        등록된 상세 가이드 내용이 없습니다.
                                    </div>
                                )}
                            </div>

                            {/* 💡 스마트 팁 박스 */}
                            <div className="help-popup-smart-tip">
                                <span className="help-tip-emoji">💡</span>
                                <div className="help-tip-text">
                                    <strong>스마트 팁:</strong> 궁금한 기능이나 오류 발생 시 상단 헤더의 🐞 <strong>버그 리포트</strong> 또는 <kbd className="cmd-mini-kbd">Ctrl + K</kbd> 퀵 검색을 활용하세요.
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 팝업 푸터 */}
                <div className="help-popup-footer">
                    <div className="help-popup-footer-note">
                        QMS Enterprise User Guide v2.4 • 배포 자동 동기화
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        확인 및 닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpCenterModal;
