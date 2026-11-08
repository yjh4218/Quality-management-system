import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigationGuard } from '../../context/NavigationGuardContext';

/**
 * StandardWorkspaceDrawer
 * 
 * QMS 표준 워크스페이스 드로어 팝업 컴포넌트
 * - ProductDrawer.jsx의 고품질 UI/UX 표준을 100% 계승
 * - 좌측 LNB 사이드바는 가리지 않고 선명하게 보존 (left: var(--sidebar-width, 240px))
 * - 우측 메인 작업 영역 전체에 부드러운 블러(backdrop-filter: blur(6px)) 및 딤드 적용
 * - 캔버스를 100% 채운 초대형 카드 뷰로 시원한 작업 공간 제공
 * - 표준 헤더(식별번호/개정차수/상태 뱃지), 탭 바, 스크롤 본문, 규제 표준 푸터 일체화
 */
const StandardWorkspaceDrawer = ({
    isOpen = false,
    onClose,
    title,
    subtitle,
    docNumber,
    revision,
    statusBadge,
    badges = [],
    headerRight = null,
    tabs = [],
    activeTab,
    onTabChange,
    complianceText = 'ISO 13485:2016 §4.2.4 & ISO 22716 §17 품질문서화 기준 전문',
    footerLeft = null,
    footerRight = null,
    children,
    className = '',
    bodyClassName = '',
    closeOnBackdrop = true,
    closeOnEsc = true,
    isDirty = undefined,
    onSave = null,
    onDiscard = null
}) => {
    const { registerGuard, unregisterGuard } = useNavigationGuard();
    const [autoDirty, setAutoDirty] = useState(false);
    const drawerRef = useRef(null);

    // Reset autoDirty on drawer open
    useEffect(() => {
        if (isOpen) {
            setAutoDirty(false);
        }
    }, [isOpen]);

    // Register navigation guard
    useEffect(() => {
        if (!isOpen) return;
        const guardId = `drawer-${docNumber || title || Math.random()}`;
        registerGuard({
            id: guardId,
            targetName: title || docNumber || '작성 중인 문서',
            isDirty: () => {
                if (typeof isDirty === 'function') return isDirty();
                if (typeof isDirty === 'boolean') return isDirty;
                return autoDirty;
            },
            onClose: () => {
                setAutoDirty(false);
                onClose?.();
            },
            onSave,
            onDiscard: () => {
                setAutoDirty(false);
                onDiscard?.();
            }
        });

        return () => unregisterGuard(guardId);
    }, [isOpen, title, docNumber, isDirty, autoDirty, onClose, onSave, onDiscard, registerGuard, unregisterGuard]);
    useEffect(() => {
        if (!isOpen || !closeOnEsc) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEsc, onClose]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onClose?.();
        }
    };

    return createPortal(
        <div 
            className={`drawer-overlay ${className}`} 
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="drawer" 
                ref={drawerRef}
                onClick={(e) => e.stopPropagation()}
                onInput={() => setAutoDirty(true)}
                onChange={() => setAutoDirty(true)}
            >
                {/* 1. Drawer Header */}
                <div className="drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', minWidth: 0 }}>
                        {docNumber && (
                            <span 
                                style={{ 
                                    fontFamily: 'monospace', 
                                    fontWeight: 800, 
                                    color: '#2563eb', 
                                    fontSize: '13px', 
                                    background: '#eff6ff', 
                                    padding: '3px 10px', 
                                    borderRadius: '6px', 
                                    border: '1px solid #bfdbfe' 
                                }}
                            >
                                {docNumber}
                            </span>
                        )}
                        {revision && (
                            <span 
                                style={{ 
                                    fontFamily: 'monospace', 
                                    fontWeight: 700, 
                                    color: '#475569', 
                                    fontSize: '12px', 
                                    background: '#f1f5f9', 
                                    padding: '3px 8px', 
                                    borderRadius: '6px', 
                                    border: '1px solid #cbd5e1' 
                                }}
                            >
                                {revision}
                            </span>
                        )}
                        {statusBadge}
                        {badges && badges.map((badge, idx) => (
                            <React.Fragment key={idx}>{badge}</React.Fragment>
                        ))}

                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {title}
                            </h2>
                            {subtitle && (
                                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                    {subtitle}
                                </span>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        {headerRight}
                        <button
                            type="button"
                            onClick={onClose}
                            className="secondary close-button"
                            title="팝업 닫기 (Esc)"
                        >
                            <span className="icon">✕</span> 닫기
                        </button>
                    </div>
                </div>

                {/* 2. Drawer Tabs (옵션) */}
                {tabs && tabs.length > 0 && (
                    <div className="drawer-tabs-wrapper">
                        <div className="drawer-tabs">
                            {tabs.map((tab) => {
                                const tabId = typeof tab === 'string' ? tab : tab.id;
                                const tabLabel = typeof tab === 'string' ? tab : (tab.label || tab.title);
                                const tabIcon = typeof tab === 'object' ? tab.icon : null;
                                const isActive = activeTab === tabId;
                                return (
                                    <button
                                        key={tabId}
                                        type="button"
                                        onClick={() => onTabChange?.(tabId)}
                                        className={`drawer-tab-btn ${isActive ? 'active' : ''}`}
                                    >
                                        {tabIcon && <span style={{ marginRight: '6px' }}>{tabIcon}</span>}
                                        {tabLabel}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. Drawer Body (모듈형 스크롤 영역) */}
                <div className={`drawer-body ${bodyClassName}`}>
                    {children}
                </div>

                {/* 4. Drawer Footer (규제 표준 & 액션 버튼) */}
                <div className="drawer-footer">
                    <div className="footer-left">
                        {footerLeft ? footerLeft : (
                            complianceText && (
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                                    🛡️ {complianceText}
                                </span>
                            )
                        )}
                    </div>
                    <div className="footer-right">
                        {footerRight}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default StandardWorkspaceDrawer;

