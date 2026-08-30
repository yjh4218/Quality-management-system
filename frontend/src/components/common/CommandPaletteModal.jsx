import React, { useState, useEffect, useRef, useMemo } from 'react';
import { pageGuides } from '../../guides/pageGuides';
import SearchTipTooltip from './SearchTipTooltip';

// 초성 추출 함수 (한글 고속 검색용)
const CHO_HANGUL = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

const getChosung = (str = '') => {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i) - 44032;
        if (code >= 0 && code <= 11171) {
            result += CHO_HANGUL[Math.floor(code / 588)];
        } else {
            result += str.charAt(i);
        }
    }
    return result.toLowerCase();
};

// 화면 카테고리 매핑
const PAGE_CATEGORIES = {
    dashboard: '현황 모니터링',
    announcements: '현황 모니터링',
    notifications: '현황 모니터링',
    users: '시스템 관리',
    roles: '시스템 관리',
    accessLogs: '시스템 관리',
    logs: '시스템 관리',
    bugReports: '시스템 관리',
    guideManagement: '시스템 관리',
    dashboardMgmt: '시스템 관리',
    trashBin: '시스템 관리',
    mailTemplates: '시스템 관리',
    notificationSettings: '시스템 관리',
    products: '품목코드 관리',
    productDashboard: '품목코드 관리',
    brands: '품목코드 관리',
    salesChannels: '품목코드 관리',
    ingredientCompliance: '품목코드 관리',
    bomMaster: 'BOM 마스터 관리',
    bomCategories: 'BOM 마스터 관리',
    manufacturers: '제조사 관리',
    manufacturerCategories: '제조사 관리',
    manufacturerGuide: '제조사 관리',
    manufacturerAudits: 'Audit 관리',
    manufacturerAuditDashboard: 'Audit 관리',
    manufacturerAuditItems: 'Audit 관리',
    qualityPhotoAudit: '생산감리 관리',
    productionAuditDashboard: '생산감리 관리',
    documentRequests: '품질서류 관리',
    packagingTemplates: '포장재 관리',
    spaceRatioCalculator: '포장재 관리',
    outboxCalculator: '포장재 관리',
    qualityDashboard: '입고검사 관리',
    quality: '입고검사 관리',
    releaseRecord: '입고검사 관리',
    claims: 'CX 클레임 관리',
    claimDashboard: 'CX 클레임 관리',
    lotPpmDashboard: 'CX 클레임 관리'
};

const CommandPaletteModal = ({
    isOpen,
    onClose,
    onNavigate,
    pageInfo = {},
    favorites = [],
    onToggleFavorite,
    canAccess = () => true
}) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // 최근 방문 페이지 로드 (권한 필터링 적용)
    const recentPages = useMemo(() => {
        try {
            const saved = localStorage.getItem('qms_recent_pages');
            const parsed = saved ? JSON.parse(saved) : [];
            return parsed.filter(key => canAccess(key));
        } catch {
            return [];
        }
    }, [isOpen, canAccess]);

    // 전체 접근 가능한 페이지 리스트 가공 (권한 필터링 필수 적용)
    const allPages = useMemo(() => {
        return Object.entries(pageInfo)
            .filter(([key]) => canAccess(key))
            .map(([key, info]) => {
                const guide = pageGuides[key] || {};
                const category = PAGE_CATEGORIES[key] || '기타';
                const guideText = guide.sections?.map(s => `${s.subtitle} ${s.content}`).join(' ') || '';
                return {
                    key,
                    title: info.title || key,
                    category,
                    guideSummary: guide.title || '',
                    guideText,
                    chosung: getChosung(info.title || key)
                };
            });
    }, [pageInfo, canAccess]);

    // 필터링된 결과 (다중 키워드 교집합 AND 고속 복합 검색 지원: 쉼표/공백 구분)
    const filteredPages = useMemo(() => {
        const rawQuery = query.trim().toLowerCase();
        if (!rawQuery) {
            return allPages;
        }

        const keywords = rawQuery
            .split(/[\s,]+/)
            .map(k => k.trim())
            .filter(Boolean);

        if (keywords.length === 0) return allPages;

        return allPages.filter(p => {
            return keywords.every(kw => {
                const isChosungQuery = /^[ㄱ-ㅎ]+$/.test(kw);
                if (isChosungQuery) {
                    return p.chosung.includes(kw);
                }
                const titleMatch = p.title.toLowerCase().includes(kw);
                const keyMatch = p.key.toLowerCase().includes(kw);
                const catMatch = p.category.toLowerCase().includes(kw);
                const guideMatch = p.guideText.toLowerCase().includes(kw);
                return titleMatch || keyMatch || catMatch || guideMatch;
            });
        });
    }, [allPages, query]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // 키보드 조작 핸들러
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (filteredPages.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredPages.length) % (filteredPages.length || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredPages[selectedIndex]) {
                handleSelectPage(filteredPages[selectedIndex].key);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    // 선택 및 최근 페이지 갱신
    const handleSelectPage = (pageKey) => {
        if (!canAccess(pageKey)) {
            alert('해당 메뉴에 대한 접근 권한이 없습니다.');
            return;
        }
        try {
            let recents = [];
            const saved = localStorage.getItem('qms_recent_pages');
            if (saved) recents = JSON.parse(saved);
            recents = [pageKey, ...recents.filter(k => k !== pageKey)].slice(0, 8);
            localStorage.setItem('qms_recent_pages', JSON.stringify(recents));
        } catch (e) {
            console.error('Failed to save recents', e);
        }
        onNavigate(pageKey);
        onClose();
    };

    if (!isOpen) return null;

    // 활성 권한이 있는 즐겨찾기만 필터링
    const accessibleFavorites = favorites.filter(favKey => canAccess(favKey));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ width: '640px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
                {/* 1. Standard Modal Header */}
                <div className="modal-header">
                    <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🔍</span> 화면 빠른 이동
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginLeft: '4px' }}>Ctrl + K</span>
                    </h2>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Modal Body */}
                <div className="modal-body white-bg" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Search Input with SearchTipTooltip */}
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                        <input
                            ref={inputRef}
                            type="text"
                            className="form-control"
                            style={{
                                width: '100%',
                                padding: '10px 65px 10px 14px',
                                fontSize: '14px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                            placeholder="화면명, 초성(예: ㅍㅁ), 키워드 검색 (쉼표·공백 구분 가능)..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        padding: '2px 4px'
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                            <SearchTipTooltip position="bottom" />
                        </div>
                    </div>

                    {/* Quick Tags (Favorites & Recents) */}
                    {!query && (accessibleFavorites.length > 0 || recentPages.length > 0) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            {accessibleFavorites.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#b45309', minWidth: '60px' }}>⭐ 즐겨찾기</span>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {accessibleFavorites.map(favKey => (
                                            <button
                                                key={favKey}
                                                type="button"
                                                onClick={() => handleSelectPage(favKey)}
                                                style={{
                                                    background: '#ffffff',
                                                    border: '1px solid #fed7aa',
                                                    color: '#c2410c',
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {pageInfo[favKey]?.title || favKey}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {recentPages.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', minWidth: '60px' }}>🕒 최근 방문</span>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {recentPages.slice(0, 5).map(recKey => pageInfo[recKey] ? (
                                            <button
                                                key={recKey}
                                                type="button"
                                                onClick={() => handleSelectPage(recKey)}
                                                style={{
                                                    background: '#ffffff',
                                                    border: '1px solid #e2e8f0',
                                                    color: '#334155',
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {pageInfo[recKey]?.title || recKey}
                                            </button>
                                        ) : null)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Result List */}
                    <div
                        ref={listRef}
                        style={{
                            maxHeight: '360px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            paddingRight: '4px'
                        }}
                    >
                        {filteredPages.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>검색 결과가 없습니다.</p>
                                <span style={{ fontSize: '12px' }}>다른 키워드나 초성으로 검색해 보세요.</span>
                            </div>
                        ) : (
                            filteredPages.map((page, index) => {
                                const isFav = accessibleFavorites.includes(page.key);
                                const isSelected = index === selectedIndex;
                                return (
                                    <div
                                        key={page.key}
                                        onClick={() => handleSelectPage(page.key)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 14px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            background: isSelected ? '#f0f9ff' : 'transparent',
                                            borderLeft: isSelected ? '3px solid var(--primary-color)' : '3px solid transparent',
                                            borderBottom: '1px solid #f1f5f9',
                                            transition: 'background 0.15s, border-color 0.15s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: isSelected ? 'var(--primary-color)' : '#1e293b' }}>
                                                {page.title}
                                            </span>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 500,
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                background: '#f1f5f9',
                                                color: '#64748b'
                                            }}>
                                                {page.category}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleFavorite(page.key);
                                                }}
                                                title={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: isFav ? '#f59e0b' : '#cbd5e1',
                                                    fontSize: '16px',
                                                    cursor: 'pointer',
                                                    padding: '2px 4px'
                                                }}
                                            >
                                                {isFav ? '★' : '☆'}
                                            </button>
                                            <span style={{
                                                fontSize: '11.5px',
                                                color: isSelected ? 'var(--primary-color)' : '#94a3b8',
                                                fontWeight: 600
                                            }}>
                                                이동 ↵
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 3. Modal Footer */}
                <div className="modal-footer" style={{ padding: '12px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px', color: '#64748b' }}>
                        <span><kbd style={{ padding: '1px 5px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '3px', fontSize: '10px' }}>↑</kbd> <kbd style={{ padding: '1px 5px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '3px', fontSize: '10px' }}>↓</kbd> 탐색</span>
                        <span><kbd style={{ padding: '1px 5px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '3px', fontSize: '10px' }}>Enter</kbd> 선택</span>
                        <span><kbd style={{ padding: '1px 5px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '3px', fontSize: '10px' }}>ESC</kbd> 닫기</span>
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>총 {filteredPages.length}개 화면</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPaletteModal;
