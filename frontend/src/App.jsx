import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { toast } from 'react-toastify';
import { TabErrorBoundary } from './components/common/GlobalErrorBoundary.jsx';
import LoginPage from './LoginPage';
import ProductListPage from './ProductListPage';
import UserManagementPage from './UserManagementPage';
import ManufacturerManagementPage from './ManufacturerManagementPage';
import BrandManagementPage from './BrandManagementPage';
import LogManagementPage from './LogManagementPage';
import { swrCache } from './utils/swrCache';

// [청크 로드 실패 자동 재시도 및 배포 캐시 무효화 유틸리티]
function lazyRetry(componentImport) {
    return lazy(async () => {
        const hasRefreshed = JSON.parse(
            window.sessionStorage.getItem('qms_chunk_reload_done') || 'false'
        );

        try {
            const component = await componentImport();
            window.sessionStorage.removeItem('qms_chunk_reload_done');
            return component;
        } catch (error) {
            console.error('Dynamic chunk import error:', error);
            if (!hasRefreshed) {
                window.sessionStorage.setItem('qms_chunk_reload_done', 'true');
                window.location.reload();
                return new Promise(() => {}); // 대기
            }
            throw error;
        }
    });
}

// [코드 스플리팅] 대시보드 5종 및 대형 모듈 lazyRetry 동적 로드 적용
const DashboardPage = lazyRetry(() => import('./DashboardPage'));
const ClaimManagementPage = lazyRetry(() => import('./ClaimManagementPage'));
const ClaimDashboardPage = lazyRetry(() => import('./ClaimDashboardPage.jsx'));
const QualityDashboardPage = lazyRetry(() => import('./QualityDashboardPage.jsx'));
const ProductDashboardPage = lazyRetry(() => import('./ProductDashboardPage.jsx'));
const ProductionAuditDashboardPage = lazyRetry(() => import('./ProductionAuditDashboardPage.jsx'));
const QualityManagementPage = lazyRetry(() => import('./QualityManagementPage'));
const PackagingSpaceRatioCalculatorPage = lazyRetry(() => import('./PackagingSpaceRatioCalculatorPage.jsx'));
const OutboxSpecCalculatorPage = lazyRetry(() => import('./OutboxSpecCalculatorPage.jsx'));
const LotPpmDashboardPage = lazyRetry(() => import('./LotPpmDashboardPage.jsx'));

const MarketReleaseRecordPage = lazyRetry(() => import('./MarketReleaseRecordPage.jsx'));
const BomMasterPage = lazyRetry(() => import('./BomMasterPage.jsx'));
const ProductionAuditPage = lazyRetry(() => import('./ProductionAuditPage.jsx'));
const ManufacturerAuditPage = lazyRetry(() => import('./ManufacturerAuditPage.jsx'));
const ManufacturerAuditDashboard = lazyRetry(() => import('./ManufacturerAuditDashboard.jsx'));
const IngredientCompliancePage = lazyRetry(() => import('./IngredientCompliancePage.jsx'));
const DocumentRequestManagementPage = lazyRetry(() => import('./DocumentRequestManagementPage.jsx'));
const SystemBenchmarkPage = lazyRetry(() => import('./SystemBenchmarkPage.jsx'));
const ProductBomInquiryPage = lazyRetry(() => import('./ProductBomInquiryPage.jsx'));
const DynamicScreenRenderer = lazyRetry(() => import('./DynamicScreenRenderer.jsx'));
const ScreenMenuManagementPage = lazyRetry(() => import('./ScreenMenuManagementPage.jsx'));

import BomCategoryManagementPage from './BomCategoryManagementPage.jsx';
import PackagingTemplatePage from './PackagingTemplatePage.jsx';
import SalesChannelManagement from './SalesChannelManagement.jsx';
import RoleManagementPage from './RoleManagementPage.jsx';
import GuideManagementPage from './GuideManagementPage.jsx';
import DashboardManagementPage from './DashboardManagementPage.jsx';
import TrashBinPage from './TrashBinPage.jsx';
import MailTemplatePage from './MailTemplatePage.jsx';
import NotificationSettingsPage from './NotificationSettingsPage.jsx';
import HelpCenterModal from './components/HelpCenterModal';
import CommandPaletteModal from './components/common/CommandPaletteModal';
import ProfileModal from './ProfileModal';
import api, { getCurrentUser, logout, getMyNotifications, getUnreadNotificationCount, getOpenBugReportCount, readNotification, readAllNotifications, deleteNotification, submitBugReport, getBaseURL, getFormattedReporterInfo, fetchApprovalUnreadCounts, fetchDynamicMenusTree, fetchDynamicScreens } from './api';
import ManufacturerAuditItemPage from './ManufacturerAuditItemPage';
import ManufacturerCategoryPage from './ManufacturerCategoryPage';
import AccessLogPage from './AccessLogPage.jsx';
import BugReportPage from './BugReportPage.jsx';
import AnnouncementManagementPage from './AnnouncementManagementPage.jsx';
import NotificationListPage from './NotificationListPage.jsx';
import ManufacturerGuidePage from './ManufacturerGuidePage.jsx';
import VendorUploadPage from './VendorUploadPage.jsx';
import DocumentCycleConfigPage from './DocumentCycleConfigPage.jsx';
import ChannelNoteCategoryConfigPage from './ChannelNoteCategoryConfigPage.jsx';
import ApprovalInboxPage from './ApprovalInboxPage.jsx';
import ApprovalDocTypeManagementPage from './ApprovalDocTypeManagementPage.jsx';
import ApprovalTemplateBuilderPage from './ApprovalTemplateBuilderPage.jsx';
import ApprovalNotificationRulesPage from './ApprovalNotificationRulesPage.jsx';

const PAGE_INFO = {
    dashboard: { title: '📊 시스템 대시보드' },
    notifications: { title: '🔔 수신 알림 확인' },
    users: { title: '👥 사용자 승인 관리' },
    logs: { title: '📜 시스템 변경 이력' },
    roles: { title: '🔐 권한 관리' },
    guideManagement: { title: '📖 가이드 관리' },
    dashboardMgmt: { title: '🎨 대시보드 관리' },
    trashBin: { title: '🗑️ 데이터 복구' },
    brands: { title: '🏷️ 브랜드 마스터' },
    manufacturers: { title: '🏭 제조사 정보' },
    salesChannels: { title: '🌐 유통 채널 관리' },
    channelNoteConfig: { title: '⚙️ 유통 채널 포장 특이사항 항목 설정' },
    products: { title: '📦 제품코드 마스터' },
    productBomInquiry: { title: '📦 제품코드별 포장재 조회' },
    bomMaster: { title: '📏 BOM 마스터' },
    bomCategories: { title: '⚙️ BOM 유형 설정' },
    packagingTemplates: { title: '📋 포장공정 템플릿' },
    spaceRatioCalculator: { title: '📐 포장공간비율 계산기' },
    outboxCalculator: { title: '📦 아웃박스 규격 계산기' },
    quality: { title: '📦 입고 품질 관리' },
    releaseRecord: { title: '📄 시장출하 기록' },
    qualityPhotoAudit: { title: '📸 신제품 생산감리' },
    productionAuditDashboard: { title: '📊 생산감리 대시보드' },
    claims: { title: '🔍 클레임 조회/입력' },
    claimDashboard: { title: '📈 클레임 대시보드' },
    lotPpmDashboard: { title: '📉 LOT PPM 분석 & 근본원인' },
    qualityDashboard: { title: '📊 입고 품질 검사 대시보드' },
    productDashboard: { title: '📊 제품코드 마스터 대시보드' },
    manufacturerAuditItems: { title: '📋 제조사 점검항목 관리' },
    manufacturerAudits: { title: '📝 제조사 Audit 관리' },
    manufacturerAuditDashboard: { title: '📊 제조사 Audit 대시보드' },
    manufacturerCategories: { title: '📂 제조사 구분 관리' },
    accessLogs: { title: '🕒 사용자 접근 로그' },
    bugReports: { title: '🐞 버그 리포트 관리' },
    ingredientCompliance: { title: '🧪 성분 안전성 검토' },
    mailTemplates: { title: '📧 제조사 전달 메일 관리' },
    announcements: { title: '📢 전체공지' },
    manufacturerGuide: { title: '🤝 제조사 협업 가이드' },
    documentRequests: { title: '📋 필수 품질서류 관리' },
    documentTypeConfig: { title: '⚙️ 추가서류 설정' },
    systemBenchmark: { title: '⚡ 시스템 속도 측정 센터' },
    approvals: { title: '📋 통합 전자결재함' },
    approvalPending: { title: '⏳ 결재 대기함' },
    approvalSubmitted: { title: '📤 기안 문서함' },
    approvalInProgress: { title: '🔄 진행 중 문서' },
    approvalCompleted: { title: '✅ 결재 완료함' },
    approvalRejected: { title: '❌ 반려 문서함' },
    approvalReference: { title: '👀 참조 문서함' },
    approvalHistory: { title: '📜 내 결재 내역' },
    approvalDocTypes: { title: '📑 결재 문서유형 관리' },
    approvalTemplates: { title: '📐 결재선 템플릿 빌더' },
    approvalNotificationRules: { title: '🔔 결재 알림 설정' },
    dynScreenProduct: { title: '📋 제품 메타 그리드 (Notion형)' },
    dynScreenClaim: { title: '📊 클레임 다이나믹 분석' },
    menuManagement: { title: '📁 메뉴 및 화면 관리' },
    screenPositionManagement: { title: '🧭 화면 위치 관리' }
};

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null, isReporting: false, autoReported: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // [배포 후 구버전 청크 요청 시 자동 새로고침 복구]
        const isChunkLoadFailed = error?.message && (
            error.message.includes('dynamically imported module') ||
            error.message.includes('Loading chunk') ||
            error.message.includes('Failed to fetch')
        );

        if (isChunkLoadFailed) {
            const hasRefreshed = JSON.parse(window.sessionStorage.getItem('qms_chunk_reload_done') || 'false');
            if (!hasRefreshed) {
                window.sessionStorage.setItem('qms_chunk_reload_done', 'true');
                window.location.reload();
                return;
            }
        }

        this.setState({ errorInfo }, () => {
            this.sendAutoReportBackground();
        });
        console.error(">>>> [FATAL ERROR] Captured by ErrorBoundary:", error, errorInfo);
    }

    sendAutoReportBackground = async () => {
        const { error, errorInfo } = this.state;
        if (!error) return;

        const payload = {
            screenName: window.__QMS_ACTIVE_PAGE__ || '전역 에러',
            url: window.location.href,
            severity: 'CRITICAL',
            errorCategory: 'RENDER',
            description: `[자동 감지] 시스템 치명적 오류 발생: ${error.message}`,
            steps: `사용자 활동 중 예기치 않은 오류가 발생하여 화면이 중단되었습니다.\n\n[Stack Trace]\n${error.stack}\n\n[Component Stack]\n${errorInfo?.componentStack}`,
            reporterName: this.props.user?.name || '알 수 없는 사용자',
            reporterUsername: this.props.user?.username || 'unknown'
        };

        try {
            const { submitBugReport } = await import('./api');
            await submitBugReport(payload);
            this.setState({ autoReported: true });
        } catch (err) {
            console.error("Automatic bug report via api.jsx failed, attempting direct fetch fallback:", err);
            try {
                const baseURL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:8080' : '');
                await fetch(`${baseURL}/api/bug-reports`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                this.setState({ autoReported: true });
            } catch (fallbackErr) {
                console.error("Fallback bug report submission also failed, storing in offline queue:", fallbackErr);
                try {
                    const queue = JSON.parse(localStorage.getItem('qms_pending_bug_reports') || '[]');
                    queue.push({ ...payload, queuedAt: new Date().toISOString() });
                    localStorage.setItem('qms_pending_bug_reports', JSON.stringify(queue.slice(-50)));
                } catch (qErr) {
                    console.error("Failed to queue bug report offline:", qErr);
                }
            }
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ 
                    height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                    backgroundColor: '#f8fafc', padding: '20px', textAlign: 'center' 
                }}>
                    <div style={{ fontSize: '60px', marginBottom: '20px' }}>🚧</div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>
                        시스템에 일시적인 오류가 발생했습니다.
                    </h1>
                    <p style={{ color: '#64748b', marginBottom: '30px', maxWidth: '500px', lineHeight: '1.6' }}>
                        화면을 렌더링하는 중 예상치 못한 오류가 발견되어 보호 모드로 전환되었습니다.<br/>
                        <strong style={{ color: '#ef4444' }}>
                            {this.state.autoReported 
                                ? "🐞 본 오류는 '버그 리포트 관리'에 실시간으로 자동 신고되었습니다. (접수 완료)" 
                                : "🐞 본 오류는 '버그 리포트 관리'에 실시간으로 자동 신고 중입니다..."}
                        </strong>
                    </p>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button 
                            className="primary" 
                            onClick={() => window.location.reload()}
                            style={{ padding: '12px 30px', fontWeight: 'bold' }}
                        >
                            🔄 새로고침 및 복구
                        </button>
                    </div>
                    {import.meta.env?.DEV && (
                        <pre style={{ 
                            marginTop: '40px', padding: '20px', background: '#fff', border: '1px solid #e2e8f0', 
                            borderRadius: '8px', textAlign: 'left', maxWidth: '800px', overflow: 'auto', fontSize: '12px' 
                        }}>
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}

const App = () => {
    // [비인증 라우트] 제조사 업로드 우회 검출
    const path = window.location.pathname;
    if (path.startsWith('/vendor-upload/')) {
        const token = path.replace('/vendor-upload/', '');
        return <VendorUploadPage token={token} />;
    }

    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('user_info');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        return !!localStorage.getItem('user_info');
    });

    // [QMS 표준 알림 & 컨펌 시스템]
    const showAlert = useCallback((message, type = 'info') => {
        if (!message) return;
        if (type === 'error') {
            toast.error(message);
        } else if (type === 'success') {
            toast.success(message);
        } else if (type === 'warning') {
            toast.warning(message);
        } else {
            toast.info(message);
        }
    }, []);

    const showConfirm = useCallback((message, onConfirm) => {
        if (!message) return;
        if (window.confirm(message)) {
            if (typeof onConfirm === 'function') onConfirm();
        }
    }, []);
    const [tabs, setTabs] = useState([
        { id: 'dashboard', page: 'dashboard', title: '📊 시스템 대시보드', data: null }
    ]);
    const [activeTabId, setActiveTabId] = useState('dashboard');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false); 
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Productivity & UX Enhancement States
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [favorites, setFavorites] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('qms_favorites') || '[]');
        } catch {
            return [];
        }
    });
    const [isFavOpen, setIsFavOpen] = useState(() => {
        try {
            const saved = localStorage.getItem('qms_fav_open');
            return saved !== null ? JSON.parse(saved) : true;
        } catch {
            return true;
        }
    });
    const [tabContextMenu, setTabContextMenu] = useState({ visible: false, x: 0, y: 0, tabId: null });
    // [전자결재] 각 결재함별 읽지 않은 문서 수
    const [approvalUnreadCounts, setApprovalUnreadCounts] = useState({});
    // [시스템 관리] 미확인(OPEN) 버그 리포트 수
    const [openBugCount, setOpenBugCount] = useState(0);
    // [동적 화면 & 메뉴 트리] 활성 동적 화면 및 계층 메뉴 트리
    const [dynamicScreens, setDynamicScreens] = useState([]);
    const [dynamicMenuTree, setDynamicMenuTree] = useState([]);

    const loadDynamicScreens = async () => {
        try {
            const [screenRes, menuRes] = await Promise.allSettled([
                fetchDynamicScreens(),
                fetchDynamicMenusTree()
            ]);
            if (screenRes.status === 'fulfilled') {
                const sData = screenRes.value?.data?.data || screenRes.value?.data || [];
                setDynamicScreens(Array.isArray(sData) ? sData : []);
            }
            if (menuRes.status === 'fulfilled') {
                const rawMenu = menuRes.value?.data || menuRes.value || [];
                const mData = Array.isArray(rawMenu) ? rawMenu : (rawMenu.data || []);
                if (Array.isArray(mData) && mData.length > 0) {
                    setDynamicMenuTree(mData);
                }
            } else {
                console.warn('[MENU SYNC] fetchDynamicMenusTree rejected:', menuRes.reason);
            }
        } catch (err) {
            console.warn('[MENU SYNC] Failed to load dynamic screens or menu tree', err);
        }
    };

    // [동적 메뉴 트리 전역 상시 동기화] 마운트 즉시 1회 로드 및 관리 센터 업데이트 이벤트 수신
    useEffect(() => {
        loadDynamicScreens();

        const handleMenuSyncEvent = () => {
            loadDynamicScreens();
        };

        window.addEventListener('dynamic-menu-updated', handleMenuSyncEvent);
        window.addEventListener('qms_menu_updated', handleMenuSyncEvent);
        window.addEventListener('focus', handleMenuSyncEvent);

        return () => {
            window.removeEventListener('dynamic-menu-updated', handleMenuSyncEvent);
            window.removeEventListener('qms_menu_updated', handleMenuSyncEvent);
            window.removeEventListener('focus', handleMenuSyncEvent);
        };
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            loadDynamicScreens();
        }
    }, [isLoggedIn]);

    // [전역 Data-Density 시스템: 해상도 자동 감지 + 수동 토글]
    const [density, setDensity] = useState(() => {
        try {
            const saved = localStorage.getItem('qms_global_density');
            if (saved) return saved;
            return window.innerWidth <= 1440 ? 'compact' : 'comfortable';
        } catch {
            return window.innerWidth <= 1440 ? 'compact' : 'comfortable';
        }
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-density', density);
        const handleResize = () => {
            const isManual = localStorage.getItem('qms_global_density_manual') === 'true';
            if (!isManual) {
                const autoDensity = window.innerWidth <= 1440 ? 'compact' : 'comfortable';
                setDensity(autoDensity);
                document.documentElement.setAttribute('data-density', autoDensity);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [density]);

    const handleToggleDensity = () => {
        const next = density === 'compact' ? 'comfortable' : 'compact';
        setDensity(next);
        try {
            localStorage.setItem('qms_global_density', next);
            localStorage.setItem('qms_global_density_manual', 'true');
        } catch (e) {
            console.error(e);
        }
        document.documentElement.setAttribute('data-density', next);
    };

    // Favorites Toggle
    const handleToggleFavorite = (pageKey) => {
        setFavorites(prev => {
            const next = prev.includes(pageKey) ? prev.filter(k => k !== pageKey) : [...prev, pageKey];
            localStorage.setItem('qms_favorites', JSON.stringify(next));
            return next;
        });
    };

    const handleToggleFavOpen = () => {
        setIsFavOpen(prev => {
            const next = !prev;
            localStorage.setItem('qms_fav_open', JSON.stringify(next));
            return next;
        });
    };

    // Global Shortcuts (Ctrl+K, Ctrl+W)
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+K or Cmd+K: Command Palette
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
                return;
            }

            // Ctrl+W: Close active tab (Custom QMS tab closure)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
                if (tabs.length > 1) {
                    e.preventDefault();
                    handleCloseTab(activeTabId, e);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTabId, tabs]);

    // Close Tab Context Menu on Click Outside
    useEffect(() => {
        const handleGlobalClick = () => {
            if (tabContextMenu.visible) {
                setTabContextMenu({ visible: false, x: 0, y: 0, tabId: null });
            }
        };
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, [tabContextMenu.visible]);

    // Tab Context Menu Actions
    const handleTabContextMenu = (e, tabId) => {
        e.preventDefault();
        e.stopPropagation();
        setTabContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            tabId
        });
    };

    const handleCloseOtherTabs = (tabId) => {
        setTabs(prev => prev.filter(t => t.id === tabId || t.id === 'dashboard'));
        setActiveTabId(tabId);
        setTabContextMenu({ visible: false, x: 0, y: 0, tabId: null });
    };

    const handleCloseRightTabs = (tabId) => {
        const index = tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;
        const newTabs = tabs.slice(0, index + 1);
        setTabs(newTabs);
        if (!newTabs.some(t => t.id === activeTabId)) {
            setActiveTabId(tabId);
        }
        setTabContextMenu({ visible: false, x: 0, y: 0, tabId: null });
    };

    const handleCloseAllExceptDashboard = () => {
        setTabs([{ id: 'dashboard', page: 'dashboard', title: '📊 시스템 대시보드', data: null }]);
        setActiveTabId('dashboard');
        setTabContextMenu({ visible: false, x: 0, y: 0, tabId: null });
    };

    const handleTabSelect = (tabId) => {
        if (activeTabId === tabId) return;
        setActiveTabId(tabId);
        window.dispatchEvent(new CustomEvent('qms-tab-activated', { detail: { tabId } }));
        requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
        });
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
    };

    // Notification states
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [bellAnimated, setBellAnimated] = useState(false);
    const popoverRef = React.useRef(null);
    const isNotifOpenRef = React.useRef(isNotifOpen);
    const isLoggingOutRef = React.useRef(false);
    useEffect(() => {
        isNotifOpenRef.current = isNotifOpen;
    }, [isNotifOpen]);

    // [고도화 1] 사이드바 그룹 열림/닫힘 상태 관리 (Accordion Behavior)
    const [openSections, setOpenSections] = useState({
        monitoring: true,
        system: false,
        products: false,
        partner: false,
        audit: false,
        quality: false,
        packaging: false,
        inbound: false,
        claim: false,
        approval: false,
        dynamic: false
    });
    const tabBarRef = React.useRef(null);

    // [추가] 탭 바 마우스 휠 가로 스크롤 지원
    useEffect(() => {
        const tabBar = tabBarRef.current;
        if (!tabBar) return;

        const handleWheel = (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                tabBar.scrollLeft += e.deltaY;
            }
        };

        tabBar.addEventListener('wheel', handleWheel, { passive: false });
        return () => tabBar.removeEventListener('wheel', handleWheel);
    }, []);

    // [고도화] 현재 활성 화면 정보를 전역 객체에 기록 (버그 리포트 연동용)
    useEffect(() => {
        if (!isLoggedIn) return;
        
        let currentPageName = '';
        if (isProfileOpen) {
            currentPageName = '개인정보 수정 화면';
        } else if (isHelpOpen) {
            currentPageName = '도움말 센터';
        } else {
            const activeTab = tabs.find(t => t.id === activeTabId);
            currentPageName = activeTab ? (PAGE_INFO[activeTab.page]?.title || activeTab.title || activeTab.page) : '알 수 없음';
            // 이모지 제거 (DB 저장 시 깨짐 방지 및 가독성)
            currentPageName = currentPageName.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|^[^\w\s\uAC00-\uD7A3]+ /g, '').trim();
        }
        
        window.__QMS_ACTIVE_PAGE__ = currentPageName;
    }, [isLoggedIn, activeTabId, tabs, isProfileOpen, isHelpOpen]);

    // [추가] 활성 탭 자동 스크롤 및 AG Grid 뷰포트 크기 자동 복원
    useEffect(() => {
        if (!activeTabId) return;
        
        // 1. 활성 탭 스크롤 위치 보정
        setTimeout(() => {
            const activeTabElement = document.querySelector(`.tab-item.active`);
            if (activeTabElement && tabBarRef.current) {
                activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }, 100);

        // 2. 탭 전환 시(tab-hidden -> tab-active) AG Grid 가상 렌더러가 화면 크기를 즉시 갱신하도록 rAF 및 지연 디스패치
        requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
        });
        const t1 = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 50);
        const t2 = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 200);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [activeTabId]);

    const toggleSection = (section) => {
        setOpenSections(prev => {
            const isOpening = !prev[section];
            if (isOpening) {
                // Close all other sections
                return {
                    monitoring: false,
                    system: false,
                    products: false,
                    partner: false,
                    audit: false,
                    quality: false,
                    packaging: false,
                    inbound: false,
                    claim: false,
                    approval: false,
                    dynamic: false,
                    [section]: true
                };
            } else {
                // Just toggle this one off
                return { ...prev, [section]: false };
            }
        });
    };

    // Notification effects and functions
    const fetchNotifications = async () => {
        if (!isLoggedIn) return;
        try {
            const res = await getMyNotifications();
            if (res && res.data) {
                setNotifications(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    const fetchUnreadCount = async () => {
        if (!isLoggedIn) return;
        try {
            const res = await getUnreadNotificationCount();
            if (res && res.data) {
                const newCount = res.data.unreadCount;
                if (newCount > unreadCount) {
                    // Trigger bell animation on new unread notifications
                    setBellAnimated(true);
                    setTimeout(() => setBellAnimated(false), 800);
                }
                setUnreadCount(newCount);
            }
        } catch (err) {
            console.error("Failed to fetch unread notification count", err);
        }
    };

    const loadApprovalUnreadCounts = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            const res = await fetchApprovalUnreadCounts();
            if (res && res.data) {
                setApprovalUnreadCounts(res.data);
            }
        } catch (err) {
            console.debug("Failed to fetch approval unread counts", err);
        }
    }, [isLoggedIn]);

    const fetchOpenBugCount = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            const count = await getOpenBugReportCount();
            setOpenBugCount(count);
        } catch (err) {
            console.debug("Failed to fetch open bug count", err);
        }
    }, [isLoggedIn]);

    const handleReadNotification = async (notification) => {
        try {
            await readNotification(notification.id);
            fetchNotifications();
            fetchUnreadCount();

            // Redirect based on linkUrl
            if (notification.linkUrl) {
                setIsNotifOpen(false);
                const url = new URL(notification.linkUrl, window.location.origin);
                const searchParams = url.searchParams;
                const claimId = searchParams.get('claimId');
                const auditId = searchParams.get('auditId');
                const itemCode = searchParams.get('itemCode');
                const docId = searchParams.get('docId');

                // Determine routing
                if (docId || url.pathname === '/approvals') {
                    handleNavigate('approvals', { documentId: docId ? Number(docId) : null });
                } else if (claimId) {
                    import('./api').then(({ getClaimById }) => {
                        getClaimById(claimId, false)
                            .then(res => {
                                if (res && res.data) {
                                    handleNavigate('claims', res.data);
                                }
                            });
                    });
                } else if (itemCode) {
                    handleNavigate('qualityPhotoAudit', { auditId, itemCode });
                } else if (url.pathname === '/user-management') {
                    handleNavigate('users');
                } else {
                    // Fallback navigate based on pathname
                    const pathMap = {
                        '/user-management': 'users',
                        '/claims': 'claims',
                        '/production-audits': 'qualityPhotoAudit',
                        '/announcements': 'announcements',
                        '/approvals': 'approvals'
                    };
                    const pageKey = pathMap[url.pathname];
                    if (pageKey) handleNavigate(pageKey);
                }
            }
        } catch (err) {
            console.error("Failed to read notification", err);
        }
    };

    const handleReadAllNotifications = async () => {
        try {
            await readAllNotifications();
            fetchNotifications();
            fetchUnreadCount();
        } catch (err) {
            console.error("Failed to read all notifications", err);
        }
    };

    const handleDeleteNotification = async (id, e) => {
        e.stopPropagation(); // Prevent trigger click item
        try {
            await deleteNotification(id);
            fetchNotifications();
            fetchUnreadCount();
        } catch (err) {
            console.error("Failed to delete notification", err);
        }
    };

    // Polling, SSE, and Click Outside hook
    useEffect(() => {
        if (!isLoggedIn) return;
        
        fetchNotifications();
        fetchUnreadCount();
        loadApprovalUnreadCounts();
        fetchOpenBugCount();

        let eventSource = null;
        let reconnectTimeout = null;
        let isClosing = false;

        const connectSSE = () => {
            if (isClosing) return;
            eventSource = new EventSource(getBaseURL() + '/api/notifications/stream', { withCredentials: true });
            
            eventSource.addEventListener('notification', (event) => {
                try {
                    const newNotif = JSON.parse(event.data);
                    console.log("[SSE] Received new notification:", newNotif);
                    
                    fetchNotifications();
                    fetchUnreadCount();
                    loadApprovalUnreadCounts();
                    fetchOpenBugCount();

                    // [추가] 이메일 발송 실패 실시간 토스트 피드백
                    if (newNotif.type === 'EMAIL_FAILURE') {
                        import('react-toastify').then(({ toast }) => {
                            toast.error("메일 발송에 실패했습니다. 잠시 후 다시 시도해 주십시오.", {
                                autoClose: 5000,
                                position: "top-right"
                            });
                        });
                    }
                    
                    // Trigger bell animation
                    setBellAnimated(true);
                    setTimeout(() => setBellAnimated(false), 800);
                } catch (e) {
                    console.error("[SSE] Failed to parse notification", e);
                }
            });

            // [SWR 실시간 동기화] 타 사용자에 의한 CUD 발생 시 해당 도메인 캐시 자동 무효화
            eventSource.addEventListener('data-updated', (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload && payload.domain) {
                        console.debug("[SSE] Real-time data-updated event received for domain:", payload.domain);
                        swrCache.invalidateByPrefix(payload.domain);
                    }
                } catch (e) {
                    console.error("[SSE] Failed to parse data-updated event", e);
                }
            });

            eventSource.onerror = (err) => {
                console.debug("[SSE] EventSource reconnecting in 5s...", err);
                eventSource.close();
                reconnectTimeout = setTimeout(() => {
                    if (isLoggedIn && !isClosing) connectSSE();
                }, 5000);
            };
        };

        connectSSE();

        // 30 seconds Short Polling fallback
        const interval = setInterval(() => {
            fetchUnreadCount();
            loadApprovalUnreadCounts();
            fetchOpenBugCount();
            if (isNotifOpenRef.current) {
                fetchNotifications();
            }
        }, 30000);

        // Click outside handler
        const handleOutsideClick = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target) && !e.target.closest('.notification-bell-btn')) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);

        // [SWR 포커스 재검증] 브라우저 복귀 시 상태 최신화
        const handleWindowFocus = () => {
            fetchUnreadCount();
            loadApprovalUnreadCounts();
            fetchOpenBugCount();
            loadDynamicScreens();
        };
        window.addEventListener('focus', handleWindowFocus);

        // [동적 화면 & 메뉴 업데이트 이벤트 수신]
        const handleDynamicMenuUpdated = () => {
            loadDynamicScreens();
        };
        window.addEventListener('dynamic-menu-updated', handleDynamicMenuUpdated);
        window.addEventListener('qms_menu_updated', handleDynamicMenuUpdated);

        // 최초 1회 동적 화면 로드
        loadDynamicScreens();

        return () => {
            isClosing = true;
            if (eventSource) {
                eventSource.close();
            }
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            clearInterval(interval);
            document.removeEventListener('mousedown', handleOutsideClick);
            window.removeEventListener('focus', handleWindowFocus);
            window.removeEventListener('dynamic-menu-updated', handleDynamicMenuUpdated);
            window.removeEventListener('qms_menu_updated', handleDynamicMenuUpdated);
        };

    }, [isLoggedIn]);

    useEffect(() => {
        // [변경] sessionStorage token 체크 제거 -> 항상 세션 쿠키로 fetchUser() 시도
        fetchUser();

        const handleLoadingEvent = (e) => setIsLoading(e.detail);
        window.addEventListener('qms-api-loading', handleLoadingEvent);

        const handleAuthError = () => handleLogout();
        window.addEventListener('auth-unauthorized', handleAuthError);

        return () => {
            window.removeEventListener('qms-api-loading', handleLoadingEvent);
            window.removeEventListener('auth-unauthorized', handleAuthError);
        };
    }, []);

    // [추가] 딥링크 파라미터 감지 및 로그인 후 복원 로직
    useEffect(() => {
        // 1. 최초 앱 로드 시 URL에 딥링크 파라미터가 있으면 sessionStorage에 저장
        const searchParams = new URLSearchParams(window.location.search);
        const claimId = searchParams.get('claimId');
        const auditId = searchParams.get('auditId');
        const itemCode = searchParams.get('itemCode');
        const fromEmail = searchParams.get('fromEmail');

        if (claimId || auditId || itemCode) {
            sessionStorage.setItem('qms_deeplink', JSON.stringify({
                claimId,
                auditId,
                itemCode,
                fromEmail: fromEmail === 'true'
            }));
            console.log(">>>> [DEEPLINK] Saved to sessionStorage:", { claimId, auditId, itemCode, fromEmail });
        }
    }, []);

    useEffect(() => {
        // 2. 사용자가 로그인하면 sessionStorage에서 딥링크 정보를 가져와 복원
        if (!isLoggedIn || !user) return;

        const savedDeeplink = sessionStorage.getItem('qms_deeplink');
        const searchParams = new URLSearchParams(window.location.search);
        
        let claimId = searchParams.get('claimId');
        let auditId = searchParams.get('auditId');
        let itemCode = searchParams.get('itemCode');
        let fromEmail = searchParams.get('fromEmail') === 'true';

        if (!claimId && !auditId && !itemCode && savedDeeplink) {
            try {
                const parsed = JSON.parse(savedDeeplink);
                claimId = parsed.claimId;
                auditId = parsed.auditId;
                itemCode = parsed.itemCode;
                fromEmail = parsed.fromEmail;
                console.log(">>>> [DEEPLINK] Restored from sessionStorage:", parsed);
            } catch (e) {
                console.error("Failed to parse saved deeplink", e);
            }
        }

        if (claimId || auditId || itemCode) {
            // 주소창 및 sessionStorage의 딥링크 정보 초기화 (중복 진입 방지)
            sessionStorage.removeItem('qms_deeplink');
            try {
                const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                window.history.replaceState({ path: newUrl }, '', newUrl);
            } catch (historyErr) {
                console.error("Failed to clear query parameters", historyErr);
            }

            if (claimId) {
                import('./api').then(({ getClaimById }) => {
                    getClaimById(claimId, fromEmail)
                        .then(res => {
                            if (res && res.data) {
                                handleNavigate('claims', res.data);
                                console.log(">>>> [DEEPLINK] Navigated to claims with:", res.data);
                            }
                        })
                        .catch(err => {
                            console.error("Failed to load deep link claim", err);
                        });
                });
            } else if (auditId || itemCode) {
                handleNavigate('qualityPhotoAudit', { auditId, itemCode });
                console.log(">>>> [DEEPLINK] Navigated to qualityPhotoAudit with:", { auditId, itemCode });
            }
        }
    }, [isLoggedIn, user]);

    // [추가] 탭 변경 시 사이드바 동기화 및 페이지 열람 로깅
    useEffect(() => {
        if (!activeTabId || !isLoggedIn) return;

        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab) return;

        const pageKey = activeTab.page;
        const pageTitle = PAGE_INFO[pageKey]?.title || pageKey;

        // 1. 사이드바 그룹 자동 열기
        let targetSection = null;
        if (['dashboard', 'announcements', 'notifications'].includes(pageKey)) targetSection = 'monitoring';
        else if (['users', 'logs', 'roles', 'guideManagement', 'dashboardMgmt', 'trashBin', 'accessLogs', 'bugReports', 'mailTemplates', 'notificationSettings', 'systemBenchmark'].includes(pageKey)) targetSection = 'system';
        else if (['products', 'brands', 'ingredientCompliance', 'bomMaster', 'bomCategories', 'salesChannels'].includes(pageKey)) targetSection = 'products';
        else if (['manufacturers', 'manufacturerCategories'].includes(pageKey)) targetSection = 'partner';
        else if (['manufacturerAudits', 'manufacturerAuditDashboard', 'manufacturerAuditItems'].includes(pageKey)) targetSection = 'audit';
        else if (['qualityPhotoAudit', 'productionAuditDashboard'].includes(pageKey)) targetSection = 'quality';
        else if (['packagingTemplates', 'spaceRatioCalculator', 'outboxCalculator'].includes(pageKey)) targetSection = 'packaging';
        else if (['qualityDashboard', 'quality', 'releaseRecord'].includes(pageKey)) targetSection = 'inbound';
        else if (['claims', 'claimDashboard'].includes(pageKey)) targetSection = 'claim';
        else if (['approvals', 'approvalPending', 'approvalSubmitted', 'approvalInProgress', 'approvalCompleted', 'approvalRejected', 'approvalReference', 'approvalHistory', 'approvalDocTypes', 'approvalTemplates', 'approvalNotificationRules'].includes(pageKey)) targetSection = 'approval';

        if (targetSection) {
            setOpenSections({
                monitoring: false,
                approval: false,
                system: false,
                products: false,
                partner: false,
                audit: false,
                quality: false,
                packaging: false,
                inbound: false,
                claim: false,
                [targetSection]: true
            });
        }

        // 2. 페이지 열람 로깅
        if (isLoggedIn && user) {
            import('./api').then(({ logPageView }) => {
                logPageView({ pageKey, pageTitle }).catch(err => console.error("Page log failed", err));
            });
        }

    }, [activeTabId, isLoggedIn, user, tabs]);

    const handleLogoutState = () => {
        localStorage.removeItem('user_info');
        sessionStorage.removeItem('qms_authenticated');
        setUser(null);
        setIsLoggedIn(false);
    };

    const fetchUser = async () => {
        try {
            const response = await getCurrentUser({ skipLoading: true, silentAuthCheck: true });
            if (response && response.data) {
                setUser(response.data);
                setIsLoggedIn(true);
                localStorage.setItem('user_info', JSON.stringify(response.data));
                sessionStorage.setItem('qms_authenticated', 'true');
            } else {
                handleLogoutState();
            }
        } catch (err) {
            handleLogoutState();
        } finally {
            setIsAuthChecking(false);
        }
    };

    const handleNavigate = (page, data = null) => {
        // [전자결재 보안 강화] 협력업체(제조사) 계정의 결재 화면 직접 진입 원천 차단
        const isUserManufacturer = user?.roles?.some(r => r.authority?.includes('MANUFACTURER')) || user?.department === '제조사';
        const approvalPages = [
            'approvals', 
            'approvalPending', 'approvalSubmitted', 'approvalInProgress', 
            'approvalCompleted', 'approvalRejected', 'approvalReference', 'approvalHistory',
            'approvalDocTypes', 'approvalTemplates', 'approvalNotificationRules'
        ];
        if (isUserManufacturer && approvalPages.includes(page)) {
            toast.warning("협력업체(제조사) 계정은 사내 전자결재 기능에 접근할 수 없습니다.");
            return;
        }

        let pageTitle = PAGE_INFO[page]?.title || data?.title;
        if (!pageTitle && page.startsWith('dynScreen_')) {
            const screenCode = page.replace('dynScreen_', '');
            const foundScreen = dynamicScreens.find(ds => ds.screenCode === screenCode);
            if (foundScreen) {
                pageTitle = `📋 ${foundScreen.screenName}`;
            } else {
                pageTitle = `📋 ${screenCode}`;
            }
        }
        if (!pageTitle) {
            pageTitle = page;
        }
        
        setTabs(prev => {
            const exists = prev.find(t => t.page === page);
            if (exists) {
                // If it exists, we might want to update its data if new data is provided
                if (data) {
                    return prev.map(t => t.page === page ? { ...t, data } : t);
                }
                return prev;
            }
            return [...prev, { id: page, page, title: pageTitle, data }];
        });
        
        setActiveTabId(page);
        setIsMobileMenuOpen(false);
        // 화면 재진입 시 AG Grid 레이아웃 강제 동기화
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
    };

    useEffect(() => {
        window.__QMS_NAVIGATE__ = handleNavigate;
        return () => {
            delete window.__QMS_NAVIGATE__;
        };
    }, []);

    const handleCloseTab = (tabId, e) => {
        if (e?.stopPropagation) e.stopPropagation();
        if (tabs.length === 1) return; // Don't close the last tab
        
        const newTabs = tabs.filter(t => t.id !== tabId);
        setTabs(newTabs);
        
        if (activeTabId === tabId) {
            setActiveTabId(newTabs[newTabs.length - 1].id);
        }
    };

    const handleLoginSuccess = () => {
        fetchUser();
    };

    const handleLogout = async () => {
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;
        try {
            await logout();
        } catch (err) {
            console.error("Logout failed", err);
        } finally {
            handleLogoutState();
            setTabs([{ id: 'dashboard', page: 'dashboard', title: '📊 시스템 대시보드', data: null }]);
            setActiveTabId('dashboard');
            setIsMobileMenuOpen(false);
            setTimeout(() => {
                isLoggingOutRef.current = false;
            }, 1000);
        }
    };

    // [보안] 30분 동안 활동이 없으면 자동 로그아웃 (Idle Timer)
    useEffect(() => {
        if (!isLoggedIn) return;

        let idleTimer;
        const IDLE_TIMEOUT = 30 * 60 * 1000; // 30분

        const resetTimer = () => {
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                console.log(">>>> [SECURITY] Idle timeout - triggering auto-logout");
                handleLogout();
            }, IDLE_TIMEOUT);
        };

        // 감지할 사용자 활동 이벤트
        const events = ['mousemove', 'keypress', 'touchstart', 'scroll', 'click'];
        events.forEach(evt => window.addEventListener(evt, resetTimer));

        resetTimer();

        return () => {
            if (idleTimer) clearTimeout(idleTimer);
            events.forEach(evt => window.removeEventListener(evt, resetTimer));
        };
    }, [isLoggedIn]);

    // Permission check helper
    const allowedMenus = React.useMemo(() => {
        if (!user || !user.roles) return [];
        return user.roles.reduce((acc, role) => {
            if (role.allowedMenus) {
                try {
                    const cleanData = role.allowedMenus.trim();
                    if (cleanData.startsWith('{')) {
                        const parsed = JSON.parse(cleanData);
                        return [...acc, ...Object.keys(parsed)];
                    }
                    return [...acc, ...cleanData.split(',').filter(m => m)];
                } catch (e) {
                    return [...acc, ...role.allowedMenus.split(',').filter(m => m)];
                }
            }
            return acc;
        }, []);
    }, [user]);

    // 제조사 전용 보안링크 접속 시 비인증 포털 바로 연결
    if (window.location.pathname.startsWith('/vendor/upload') || window.location.search.includes('token=')) {
        return <VendorUploadPage />;
    }

    // [세션 검증 중 스플래시] 캐시된 유저 정보가 없고 세션 확인 중일 때는 로그인 화면 깜빡임 방지
    if (isAuthChecking && !isLoggedIn) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
                zIndex: 9999
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #e2e8f0',
                    borderTopColor: '#2563eb',
                    borderRadius: '50%',
                    animation: 'qms-spin 0.8s linear infinite'
                }} />
                <p style={{ marginTop: '14px', fontSize: '13px', fontWeight: 600, color: '#475569', letterSpacing: '-0.02em' }}>
                    QMS 세션 확인 중...
                </p>
                <style>{`
                    @keyframes qms-spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!isLoggedIn) {
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }

    const checkRole = (roleName) => user?.roles?.some(r => r.authority?.includes(roleName));
    const isAdmin = checkRole('ADMIN');
    const isResponsibleSales = checkRole('RESPONSIBLE_SALES');
    const isQuality = checkRole('QUALITY');
    const isManufacturer = checkRole('MANUFACTURER');
    const isSales = checkRole('SALES');

    const isACompany = !isManufacturer;
    const isAQualityTeam = isQuality || (isACompany && (user?.department === 'Quality' || user?.department === '품질팀'));

    const hasPermission = (menuKey, action = 'VIEW') => {
        if (isAdmin) return true;
        
        // Find if any role has this permission
        return user?.roles?.some(role => {
            if (!role.allowedMenus) return false;
            try {
                const cleanData = role.allowedMenus.trim();
                if (cleanData.startsWith('{')) {
                    const permissions = JSON.parse(cleanData);
                    return permissions[menuKey]?.includes(action);
                }
                // Legacy support: CSV means VIEW permission only
                return action === 'VIEW' && cleanData.split(',').includes(menuKey);
            } catch (e) {
                return false;
            }
        });
    };

    const canAccess = (menuKey) => {
        if (menuKey === 'productBomInquiry') return isAdmin || hasPermission('bomMaster') || hasPermission('products') || hasPermission('productBomInquiry');
        if (menuKey === 'systemBenchmark') return isAdmin || isAQualityTeam || hasPermission('logs') || hasPermission('systemBenchmark');
        return hasPermission(menuKey, 'VIEW');
    };

    const hasMonitoringAccess = canAccess('dashboard') || canAccess('announcements') || canAccess('notifications');
    const hasSystemAccess = canAccess('users') || canAccess('logs') || canAccess('roles') || canAccess('guideManagement') || canAccess('dashboardMgmt') || canAccess('trashBin') || canAccess('accessLogs') || canAccess('bugReports') || canAccess('mailTemplates') || canAccess('notificationSettings') || canAccess('systemBenchmark');
    const hasProductsAccess = canAccess('products') || canAccess('brands') || canAccess('ingredientCompliance') || canAccess('bomMaster') || canAccess('bomCategories') || canAccess('salesChannels') || canAccess('productDashboard');
    const hasPartnerAccess = canAccess('manufacturers') || canAccess('manufacturerCategories') || canAccess('manufacturerGuide');
    const hasAuditAccess = canAccess('manufacturerAudits') || canAccess('manufacturerAuditDashboard') || canAccess('manufacturerAuditItems');
    const hasQualityAccess = canAccess('qualityPhotoAudit') || canAccess('productionAuditDashboard');
    const hasPackagingAccess = canAccess('packagingTemplates') || canAccess('spaceRatioCalculator') || canAccess('outboxCalculator');
    const hasInboundAccess = canAccess('quality') || canAccess('releaseRecord') || canAccess('qualityDashboard');
    const hasClaimAccess = canAccess('claims') || canAccess('claimDashboard') || canAccess('lotPpmDashboard');
    // [전자결재 RBAC 권한 제어]
    const hasApprovalAccess = !isManufacturer && (
        isAdmin || 
        canAccess('approvals') || 
        canAccess('approvalPending') || canAccess('approvalSubmitted') || canAccess('approvalInProgress') ||
        canAccess('approvalCompleted') || canAccess('approvalRejected') || canAccess('approvalReference') || canAccess('approvalHistory') ||
        canAccess('approvalDocTypes') || canAccess('approvalTemplates') || canAccess('approvalNotificationRules')
    );
    // [동적 화면 및 Notion형 그리드 권한 제어]
    const hasDynamicAccess = !isManufacturer && (
        isAdmin || canAccess('dynScreenProduct') || canAccess('dynScreenClaim')
    );

    // [동적 메뉴 표준 루트 코드 매핑]
    const STANDARD_ROOT_MAP = {
        'SYSTEM_ROOT': 'system',
        'MONITORING_ROOT': 'monitoring',
        'APPROVAL_ROOT': 'approval',
        'PRODUCTS_ROOT': 'products',
        'PARTNER_ROOT': 'partner',
        'AUDIT_ROOT': 'audit',
        'QUALITY_ROOT': 'quality',
        'PACKAGING_ROOT': 'packaging',
        'DYNAMIC_ROOT': 'dynamic',
        'INBOUND_ROOT': 'inbound',
        'CLAIM_ROOT': 'claim'
    };

    // [고도화 5] 현재 활성화된 섹션 판단 로직
    const isSectionActive = (section) => {
        const activePage = tabs.find(t => t.id === activeTabId)?.page;
        if (!activePage) return false;

        // 커스텀 대메뉴 활성화 판별
        if (section.startsWith('custom_')) {
            const rootId = Number(section.replace('custom_', ''));
            const customRoot = (dynamicMenuTree || []).find(m => m.id === rootId);
            if (customRoot) {
                if (customRoot.screen && `dynScreen_${customRoot.screen.screenCode}` === activePage) return true;
                return (customRoot.children || []).some(c => 
                    (c.screen && `dynScreen_${c.screen.screenCode}` === activePage) ||
                    (c.children || []).some(sub => sub.screen && `dynScreen_${sub.screen.screenCode}` === activePage)
                );
            }
            return false;
        }

        switch(section) {
            case 'monitoring': return ['dashboard', 'announcements', 'notifications'].includes(activePage);
            case 'system': return ['users', 'logs', 'roles', 'guideManagement', 'dashboardMgmt', 'trashBin', 'accessLogs', 'bugReports', 'mailTemplates', 'notificationSettings', 'systemBenchmark', 'menuManagement'].includes(activePage);
            case 'products': return ['products', 'productBomInquiry', 'brands', 'ingredientCompliance', 'bomMaster', 'bomCategories', 'salesChannels', 'productDashboard'].includes(activePage);
            case 'partner': return ['manufacturers', 'manufacturerCategories', 'manufacturerGuide'].includes(activePage);
            case 'audit': return ['manufacturerAudits', 'manufacturerAuditDashboard', 'manufacturerAuditItems'].includes(activePage);
            case 'quality': return ['qualityPhotoAudit', 'productionAuditDashboard'].includes(activePage);
            case 'packaging': return ['packagingTemplates', 'spaceRatioCalculator', 'outboxCalculator'].includes(activePage);
            case 'inbound': return ['qualityDashboard', 'quality', 'releaseRecord'].includes(activePage);
            case 'claim': return ['claims', 'claimDashboard', 'lotPpmDashboard'].includes(activePage);
            case 'dynamic': return ['dynScreenProduct', 'dynScreenClaim'].includes(activePage) || (activePage && activePage.startsWith('dynScreen_'));
            case 'approval': return [
                'approvals', 
                'approvalPending', 'approvalSubmitted', 'approvalInProgress', 
                'approvalCompleted', 'approvalRejected', 'approvalReference', 'approvalHistory',
                'approvalDocTypes', 'approvalTemplates', 'approvalNotificationRules'
            ].includes(activePage);
            default: return false;
        }
    };
    const renderSidebarItem = (pageKey, label, badgeCount = null) => {
        const isCurrentActive = tabs.find(t => t.id === activeTabId)?.page === pageKey;
        const isFav = favorites.includes(pageKey);
        const count = typeof badgeCount === 'number' ? badgeCount : 0;
        return (
            <div key={pageKey} className="sidebar-item-wrapper">
                <button
                    type="button"
                    className={`sidebar-item ${isCurrentActive ? 'active' : ''}`}
                    onClick={() => handleNavigate(pageKey)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                    {count > 0 && (
                        <span 
                            style={{
                                marginLeft: '6px',
                                padding: '1px 6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '10px',
                                background: '#ef4444',
                                color: '#ffffff',
                                lineHeight: '14px',
                                flexShrink: 0
                            }}
                        >
                            {count > 99 ? '99+' : count}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    className={`sidebar-pin-btn ${isFav ? 'pinned' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(pageKey);
                    }}
                    title={isFav ? '즐겨찾기 해제' : '빠른 바로가기 고정'}
                >
                    {isFav ? '★' : '☆'}
                </button>
            </div>
        );
    };

    // [시스템 표준 메뉴 -> 라우트 키 매핑 테이블]
    const SYSTEM_MENU_ROUTE_MAP = {
        // [현황 모니터링]
        'SYS_DASHBOARD': { routeKey: 'dashboard', defaultLabel: '시스템 대시보드', defaultIcon: '📊' },
        'SYS_ANNOUNCEMENTS': { routeKey: 'announcements', defaultLabel: '전체공지', defaultIcon: '📢' },
        'SYS_NOTIFICATIONS': { routeKey: 'notifications', defaultLabel: '수신 알림 확인', defaultIcon: '🔔', badge: 'noti' },

        // [전자결재]
        'SYS_APPROVAL_PENDING': { routeKey: 'approvalPending', defaultLabel: '결재 대기함', defaultIcon: '⏳', approvalStatus: 'PENDING' },
        'SYS_APPROVAL_SUBMITTED': { routeKey: 'approvalSubmitted', defaultLabel: '기안 문서함', defaultIcon: '📤', approvalStatus: 'SUBMITTED' },
        'SYS_APPROVAL_IN_PROGRESS': { routeKey: 'approvalInProgress', defaultLabel: '진행 중 문서', defaultIcon: '🔄', approvalStatus: 'IN_PROGRESS' },
        'SYS_APPROVAL_COMPLETED': { routeKey: 'approvalCompleted', defaultLabel: '결재 완료함', defaultIcon: '✅', approvalStatus: 'COMPLETED' },
        'SYS_APPROVAL_REJECTED': { routeKey: 'approvalRejected', defaultLabel: '반려 문서함', defaultIcon: '❌', approvalStatus: 'REJECTED' },
        'SYS_APPROVAL_REFERENCE': { routeKey: 'approvalReference', defaultLabel: '참조 문서함', defaultIcon: '👀', approvalStatus: 'REFERENCE' },
        'SYS_APPROVAL_HISTORY': { routeKey: 'approvalHistory', defaultLabel: '내 결재 내역', defaultIcon: '📜', approvalStatus: 'PROCESSED' },
        'SYS_APPROVAL_DOC_TYPES': { routeKey: 'approvalDocTypes', defaultLabel: '결재 문서유형 관리', defaultIcon: '📑' },
        'SYS_APPROVAL_TEMPLATES': { routeKey: 'approvalTemplates', defaultLabel: '결재선 템플릿 빌더', defaultIcon: '📐' },
        'SYS_APPROVAL_NOTI_RULES': { routeKey: 'approvalNotificationRules', defaultLabel: '결재 알림 설정', defaultIcon: '🔔' },

        // [품목코드 관리]
        'SYS_PRODUCTS': { routeKey: 'products', defaultLabel: '제품코드 마스터', defaultIcon: '📦' },
        'SYS_PRODUCT_BOM_INQUIRY': { routeKey: 'productBomInquiry', defaultLabel: '제품코드별 포장재 조회', defaultIcon: '📦' },
        'SYS_PRODUCT_DASHBOARD': { routeKey: 'productDashboard', defaultLabel: '제품코드 대시보드', defaultIcon: '📊' },
        'SYS_BRANDS': { routeKey: 'brands', defaultLabel: '브랜드 마스터 관리', defaultIcon: '🏷️' },
        'SYS_SALES_CHANNELS': { routeKey: 'salesChannels', defaultLabel: '유통 채널 관리', defaultIcon: '🌐' },
        'SYS_INGREDIENT_COMPLIANCE': { routeKey: 'ingredientCompliance', defaultLabel: '성분 안전성 검토 (Global Compliance)', defaultIcon: '🧪' },
        'SYS_BOM_MASTER': { routeKey: 'bomMaster', defaultLabel: '구성품 BOM 마스터 관리', defaultIcon: '📏' },
        'SYS_BOM_CATEGORIES': { routeKey: 'bomCategories', defaultLabel: 'BOM 유형 설정/관리', defaultIcon: '⚙️' },

        // [제조사 등록 관리]
        'SYS_MANUFACTURERS': { routeKey: 'manufacturers', defaultLabel: '제조사 정보 관리', defaultIcon: '🏭' },
        'SYS_MANUFACTURER_CATEGORIES': { routeKey: 'manufacturerCategories', defaultLabel: '제조사 구분 관리', defaultIcon: '📂' },
        'SYS_MANUFACTURER_GUIDE': { routeKey: 'manufacturerGuide', defaultLabel: '제조사 협업 가이드', defaultIcon: '🤝' },

        // [Audit 관리]
        'SYS_MANUFACTURER_AUDITS': { routeKey: 'manufacturerAudits', defaultLabel: '제조사 Audit 관리', defaultIcon: '📝' },
        'SYS_MANUFACTURER_AUDIT_DASHBOARD': { routeKey: 'manufacturerAuditDashboard', defaultLabel: '제조사 Audit 대시보드', defaultIcon: '📊' },
        'SYS_MANUFACTURER_AUDIT_ITEMS': { routeKey: 'manufacturerAuditItems', defaultLabel: '제조사 점검항목 관리', defaultIcon: '📋' },

        // [생산감리 관리]
        'SYS_QUALITY_PHOTO_AUDIT': { routeKey: 'qualityPhotoAudit', defaultLabel: '신제품 생산감리 (사진감리)', defaultIcon: '📸' },
        'SYS_PRODUCTION_AUDIT_DASHBOARD': { routeKey: 'productionAuditDashboard', defaultLabel: '생산감리 대시보드', defaultIcon: '📊' },
        'SYS_DOCUMENT_REQUESTS': { routeKey: 'documentRequests', defaultLabel: '필수 품질서류 관리', defaultIcon: '📋' },

        // [포장재 관리]
        'SYS_PACKAGING_TEMPLATES': { routeKey: 'packagingTemplates', defaultLabel: '포장공정 템플릿 관리', defaultIcon: '📋' },
        'SYS_SPACE_RATIO_CALCULATOR': { routeKey: 'spaceRatioCalculator', defaultLabel: '포장공간비율 계산기', defaultIcon: '📐' },
        'SYS_OUTBOX_CALCULATOR': { routeKey: 'outboxCalculator', defaultLabel: '아웃박스 규격 계산기', defaultIcon: '📦' },

        // [입고검사 관리]
        'SYS_QUALITY_DASHBOARD': { routeKey: 'qualityDashboard', defaultLabel: '입고 품질 검사 대시보드', defaultIcon: '🚚' },
        'SYS_QUALITY': { routeKey: 'quality', defaultLabel: '입고 품질 관리', defaultIcon: '📦' },
        'SYS_RELEASE_RECORD': { routeKey: 'releaseRecord', defaultLabel: '시장출하 적부판정 기록', defaultIcon: '📄' },

        // [CX 클레임 관리]
        'SYS_CLAIMS': { routeKey: 'claims', defaultLabel: '클레임 조회 및 입력', defaultIcon: '🔍' },
        'SYS_CLAIM_DASHBOARD': { routeKey: 'claimDashboard', defaultLabel: '클레임 대시보드', defaultIcon: '📈' },
        'SYS_LOT_PPM_DASHBOARD': { routeKey: 'lotPpmDashboard', defaultLabel: 'LOT PPM 분석 & 근본원인', defaultIcon: '📉' },

        // [시스템 관리]
        'SYS_USERS': { routeKey: 'users', defaultLabel: '사용자 승인 관리', defaultIcon: '👥' },
        'SYS_ROLES': { routeKey: 'roles', defaultLabel: '권한 관리', defaultIcon: '🔐' },
        'SYS_ACCESS_LOGS': { routeKey: 'accessLogs', defaultLabel: '사용자 접근 로그', defaultIcon: '🕒' },
        'SYS_LOGS': { routeKey: 'logs', defaultLabel: '시스템 변경 이력', defaultIcon: '📜' },
        'SYS_BUG_REPORTS': { routeKey: 'bugReports', defaultLabel: '버그 리포트 관리', defaultIcon: '🐞', badge: 'bug' },
        'SYS_SYSTEM_BENCHMARK': { routeKey: 'systemBenchmark', defaultLabel: '시스템 속도 측정 센터', defaultIcon: '⚡' },
        'SYS_GUIDE_MGMT': { routeKey: 'guideManagement', defaultLabel: '가이드 관리', defaultIcon: '📖' },
        'SYS_DASHBOARD_MGMT': { routeKey: 'dashboardMgmt', defaultLabel: '대시보드 제작/관리', defaultIcon: '🎨' },
        'SYS_TRASH_BIN': { routeKey: 'trashBin', defaultLabel: '데이터 복구 (휴지통)', defaultIcon: '🗑️' },
        'SYS_MAIL_TEMPLATES': { routeKey: 'mailTemplates', defaultLabel: '제조사 전달 메일 관리', defaultIcon: '📧' },
        'SYS_NOTIFICATION_SETTINGS': { routeKey: 'notificationSettings', defaultLabel: '알림 설정 관리', defaultIcon: '🔔' },
        'SYS_MENU_MANAGEMENT': { routeKey: 'menuManagement', defaultLabel: '메뉴 및 화면 관리', defaultIcon: '📁' },

        // [동적 화면 관리]
        'SYS_DYN_SCREEN_PRODUCT': { routeKey: 'dynScreenProduct', defaultLabel: '제품 메타 그리드', defaultIcon: '📋' },
        'SYS_DYN_SCREEN_CLAIM': { routeKey: 'dynScreenClaim', defaultLabel: '클레임 다이나믹 분석', defaultIcon: '📊' }
    };

    // [시스템 화면 및 메뉴 관리 센터 연동] menuOrder 기반 동적 순서 사이드바 렌더러
    const renderDynamicSidebarSection = (rootCode, fallbackRender = null) => {
        if (!dynamicMenuTree || dynamicMenuTree.length === 0) {
            return fallbackRender ? fallbackRender() : null;
        }
        const targetCodeUpper = (rootCode || '').toUpperCase();
        const rootNode = dynamicMenuTree.find(m => (m.menuCode || '').toUpperCase() === targetCodeUpper);
        if (!rootNode || !rootNode.children || rootNode.children.length === 0) {
            return fallbackRender ? fallbackRender() : null;
        }

        // menuOrder 오름차순 정렬
        const sortedChildren = [...rootNode.children]
            .filter(item => item.isActive !== false)
            .sort((a, b) => (a.menuOrder ?? 999) - (b.menuOrder ?? 999));

        if (sortedChildren.length === 0) {
            return fallbackRender ? fallbackRender() : null;
        }

        return sortedChildren.map((item, idx) => {
            const isDivider = item.menuType === 'DIVIDER' || (item.menuCode && item.menuCode.startsWith('DIV_'));

            // 1. 구분선(소분류 헤더)
            if (isDivider) {
                let hasVisibleChildAfter = isAdmin;
                if (!hasVisibleChildAfter) {
                    for (let i = idx + 1; i < sortedChildren.length; i++) {
                        const nextItem = sortedChildren[i];
                        if (nextItem.menuType === 'DIVIDER' || (nextItem.menuCode && nextItem.menuCode.startsWith('DIV_'))) break;
                        const sysCfg = SYSTEM_MENU_ROUTE_MAP[nextItem.menuCode];
                        if (sysCfg && canAccess(sysCfg.routeKey)) {
                            hasVisibleChildAfter = true;
                            break;
                        }
                        if (nextItem.screenCode || nextItem.screen?.screenCode) {
                            hasVisibleChildAfter = true;
                            break;
                        }
                    }
                }
                if (!hasVisibleChildAfter) return null;
                return (
                    <div key={`div_${item.id || item.menuCode || idx}`} className="sidebar-sub-header">
                        {item.menuName}
                    </div>
                );
            }

            // 2. 시스템 표준 메뉴
            if (item.menuType === 'SYSTEM' || item.isSystem) {
                const sysConfig = SYSTEM_MENU_ROUTE_MAP[item.menuCode];
                if (sysConfig) {
                    const routeKey = sysConfig.routeKey;
                    const isAccessible = isAdmin || canAccess(routeKey);
                    if (!isAccessible) return null;

                    let badgeCount = null;
                    if (sysConfig.badge === 'bug') badgeCount = openBugCount;
                    else if (sysConfig.badge === 'noti') badgeCount = unreadCount;
                    else if (sysConfig.approvalStatus && approvalUnreadCounts) {
                        badgeCount = approvalUnreadCounts[sysConfig.approvalStatus] || null;
                    }

                    const label = `${item.icon || sysConfig.defaultIcon} ${item.menuName || sysConfig.defaultLabel}`;
                    return renderSidebarItem(routeKey, label, badgeCount);
                }
            }

            // 3. 동적 추가 화면 및 서브메뉴
            const sCode = item.screenCode || 
                          item.screen?.screenCode || 
                          (item.menuCode?.startsWith('MENU_SCR_') ? item.menuCode.replace('MENU_', '') : null) ||
                          (item.screenId ? `SCR_${item.screenId}` : null);
            if (sCode) {
                const navKey = `dynScreen_${sCode}`;
                return renderSidebarItem(navKey, `${item.icon || '🔬'} ${item.menuName}`);
            }

            // 4. 하위 자식이 있는 2계층 커스텀 서브메뉴
            if (item.children && item.children.length > 0) {
                const validSubs = item.children.filter(s => s.isActive !== false && (s.screenCode || s.screen?.screenCode || s.menuCode?.startsWith('MENU_SCR_')));
                if (validSubs.length === 0) return null;
                return (
                    <div key={`subgroup_${item.id}`} style={{ marginTop: '4px' }}>
                        <div className="sidebar-sub-header" style={{ paddingLeft: '14px', fontSize: '11px', color: '#64748b' }}>
                            {item.icon || '📁'} {item.menuName}
                        </div>
                        {validSubs.map(sub => {
                            const subCode = sub.screenCode || sub.screen?.screenCode || (sub.menuCode?.startsWith('MENU_SCR_') ? sub.menuCode.replace('MENU_', '') : null);
                            const navKey = `dynScreen_${subCode}`;
                            return renderSidebarItem(navKey, `${sub.icon || '📋'} ${sub.menuName}`);
                        })}
                    </div>
                );
            }

            return null;
        });
    };

    // [기존 호환 헬퍼 유지]
    const renderDynamicSubItemsForRoot = (rootCode) => {
        return null; // renderDynamicSidebarSection으로 일원화
    };

    // 표준 대메뉴 외 사용자가 신규 생성한 커스텀 최상위 대메뉴 목록
    const customRootMenus = (dynamicMenuTree || []).filter(
        m => !Object.keys(STANDARD_ROOT_MAP).includes(m.menuCode) && !m.parentId && m.isActive !== false
    );

    // [전자결재] 결재 대기 및 진행 중 문서 합산 카운트
    const totalApprovalCount = (approvalUnreadCounts.PENDING || 0) + (approvalUnreadCounts.IN_PROGRESS || 0);

    return (
        <ErrorBoundary user={user}>
            <div className={`app-container ${isMobileMenuOpen ? 'mobile-menu-active' : ''}`}>
            {isLoading && (
                <div className="global-loading-overlay">
                    <div className="spinner-ring"></div>
                    <div className="loading-text">데이터를 처리 중입니다...</div>
                </div>
            )}
            {isProfileOpen && (
                <ProfileModal user={user} onClose={() => setIsProfileOpen(false)} onUpdate={fetchUser} />
            )}

            {/* Mobile Menu Toggle Button */}
            <button 
                className="mobile-header-toggle" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle Menu"
            >
                {isMobileMenuOpen ? '✕' : '☰'}
            </button>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}
            
            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h1>QMS</h1>
                    <p style={{ fontSize: '12px', color: '#888', margin: '5px 0 0 0' }}>품질관리시스템</p>
                </div>

                <nav className="sidebar-menu">
                    {/* [관리자 전용 메뉴 섹터] - 관리자 계정만 노출 */}
                    {isAdmin && (
                        <div className="sidebar-section-container admin-section">
                            <div className="sidebar-section-header">
                                <span className="sidebar-section-badge admin">ADMIN</span>
                                <span className="sidebar-section-title">관리자 전용 메뉴</span>
                            </div>

                            {/* [시스템 관리] */}
                            {hasSystemAccess && (
                            <div className="sidebar-group sidebar-system-group" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
                                <button 
                                    className={`sidebar-group-header ${isSectionActive('system') ? 'active' : ''}`} 
                                    onClick={() => toggleSection('system')}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>🛠️ 시스템 관리</span>
                                        {openBugCount > 0 && (
                                            <span className="sidebar-group-badge danger">{openBugCount > 99 ? '99+' : openBugCount}</span>
                                        )}
                                    </span>
                                    <span className={`arrow ${openSections.system ? 'open' : ''}`}>▼</span>
                                </button>
                                {openSections.system && (
                                    <div className="sidebar-group-content open">
                                        {renderDynamicSidebarSection('SYSTEM_ROOT', () => (
                                            <>
                                                {(canAccess('users') || canAccess('roles') || canAccess('accessLogs')) && (
                                                    <>
                                                        <div className="sidebar-sub-header">사용자 및 보안</div>
                                                        {canAccess('users') && renderSidebarItem('users', '👥 사용자 승인 관리')}
                                                        {canAccess('roles') && renderSidebarItem('roles', '🔐 권한 관리')}
                                                        {canAccess('accessLogs') && renderSidebarItem('accessLogs', '🕒 사용자 접근 로그')}
                                                    </>
                                                )}

                                                {(canAccess('logs') || canAccess('bugReports') || canAccess('systemBenchmark')) && (
                                                    <>
                                                        <div className="sidebar-sub-header">운영 모니터링</div>
                                                        {canAccess('logs') && renderSidebarItem('logs', '📜 시스템 변경 이력')}
                                                        {canAccess('bugReports') && renderSidebarItem('bugReports', '🐞 버그 리포트 관리', openBugCount)}
                                                        {canAccess('systemBenchmark') && renderSidebarItem('systemBenchmark', '⚡ 시스템 속도 측정 센터')}
                                                    </>
                                                )}

                                                {(canAccess('guideManagement') || canAccess('dashboardMgmt') || canAccess('trashBin') || canAccess('mailTemplates') || canAccess('notificationSettings')) && (
                                                    <>
                                                        <div className="sidebar-sub-header">설정 및 유지보수</div>
                                                        {canAccess('guideManagement') && renderSidebarItem('guideManagement', '📖 가이드 관리')}
                                                        {canAccess('dashboardMgmt') && renderSidebarItem('dashboardMgmt', '🎨 대시보드 제작/관리')}
                                                        {canAccess('trashBin') && renderSidebarItem('trashBin', '🗑️ 데이터 복구 (휴지통)')}
                                                        {canAccess('mailTemplates') && renderSidebarItem('mailTemplates', '📧 제조사 전달 메일 관리')}
                                                        {canAccess('notificationSettings') && renderSidebarItem('notificationSettings', '🔔 알림 설정 관리')}
                                                    </>
                                                )}

                                                {(isAdmin || canAccess('menuManagement')) && (
                                                    <>
                                                        <div className="sidebar-sub-header">화면 관리</div>
                                                        {renderSidebarItem('menuManagement', '📁 메뉴 및 화면 관리')}
                                                    </>
                                                )}
                                            </>
                                        ))}
                                    </div>
                                )}
                            </div>
                            )}

                            {/* [동적 화면 관리] - 명칭 변경: '⚡ 동적 화면 (Notion형)' -> '⚡ 동적 화면 관리' */}
                            {hasDynamicAccess && (
                            <div className="sidebar-group sidebar-dynamic-group" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
                                <button 
                                    className={`sidebar-group-header ${isSectionActive('dynamic') ? 'active' : ''}`} 
                                    onClick={() => toggleSection('dynamic')}
                                >
                                    <span>⚡ 동적 화면 관리</span>
                                    <span className={`arrow ${openSections.dynamic ? 'open' : ''}`}>▼</span>
                                </button>
                                {openSections.dynamic && (
                                    <div className="sidebar-group-content open">
                                        {renderDynamicSidebarSection('DYNAMIC_ROOT', () => (
                                            <>
                                                <div className="sidebar-sub-header">동적 메타 관리</div>
                                                {canAccess('dynScreenProduct') && renderSidebarItem('dynScreenProduct', '📋 제품 메타 그리드')}
                                                {canAccess('dynScreenClaim') && renderSidebarItem('dynScreenClaim', '📊 클레임 다이나믹 분석')}
                                            </>
                                        ))}

                                        {/* 표준 대메뉴나 커스텀 대메뉴 어디에도 매핑되지 않은 화면 fallback 렌더링 */}
                                        {(() => {
                                            const mappedCodes = new Set();
                                            const collectCodes = (nodes) => {
                                                for (const n of nodes) {
                                                    if (n.screen?.screenCode) mappedCodes.add(n.screen.screenCode);
                                                    if (n.children?.length) collectCodes(n.children);
                                                }
                                            };
                                            collectCodes(dynamicMenuTree || []);

                                            return dynamicScreens
                                                .filter(ds => ds.screenCode !== 'SCR_NOTION_PRODUCT' && ds.screenCode !== 'SCR_DYNAMIC_CLAIM' && !mappedCodes.has(ds.screenCode))
                                                .map(ds => {
                                                    const navKey = `dynScreen_${ds.screenCode}`;
                                                    return renderSidebarItem(navKey, `📋 ${ds.screenName}`);
                                                });
                                        })()}
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                    )}

                    {/* [사용자 메뉴 섹터] */}
                    <div className="sidebar-section-container user-section">
                        {isAdmin && (
                            <div className="sidebar-section-header user">
                                <span className="sidebar-section-badge user">USER</span>
                                <span className="sidebar-section-title">사용자 메뉴</span>
                            </div>
                        )}

                        {favorites.length > 0 && (
                            <div className="sidebar-fav-group">
                                <button
                                    type="button"
                                    className={`sidebar-group-header ${isFavOpen ? 'active' : ''}`}
                                    onClick={handleToggleFavOpen}
                                    style={{ padding: '10px 16px', background: 'transparent' }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 700, fontSize: '13px' }}>
                                        ⭐ 빠른 바로가기 ({favorites.filter(favKey => canAccess(favKey)).length})
                                    </span>
                                    <span className={`arrow ${isFavOpen ? 'open' : ''}`}>▼</span>
                                </button>
                                {isFavOpen && (
                                    <div className="sidebar-fav-content">
                                        {favorites.filter(favKey => canAccess(favKey)).map(favKey => {
                                            const pageTitle = PAGE_INFO[favKey]?.title || favKey;
                                            const isCurrentActive = tabs.find(t => t.id === activeTabId)?.page === favKey;
                                            return (
                                                <div key={favKey} className="sidebar-fav-item" onClick={() => handleNavigate(favKey)}>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{pageTitle}</span>
                                                    <span
                                                        style={{ opacity: 0.6, cursor: 'pointer', padding: '0 4px', fontSize: '11px', color: '#94a3b8' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleFavorite(favKey);
                                                        }}
                                                        title="즐겨찾기 해제"
                                                    >
                                                        ✕
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* [현황 모니터링] */}
                        {hasMonitoringAccess && (
                        <div className="sidebar-group">
                            <button 
                                className={`sidebar-group-header ${isSectionActive('monitoring') ? 'active' : ''}`} 
                                onClick={() => toggleSection('monitoring')}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>📊 현황 모니터링</span>
                                    {unreadCount > 0 && (
                                        <span className="sidebar-group-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                                    )}
                                </span>
                                <span className={`arrow ${openSections.monitoring ? 'open' : ''}`}>▼</span>
                            </button>
                            {openSections.monitoring && (
                                <div className="sidebar-group-content open">
                                    {renderDynamicSidebarSection('MONITORING_ROOT', () => (
                                        <>
                                            {canAccess('dashboard') && renderSidebarItem('dashboard', '📊 시스템 대시보드')}
                                            {canAccess('announcements') && renderSidebarItem('announcements', '📢 전체공지')}
                                            {canAccess('notifications') && renderSidebarItem('notifications', '🔔 수신 알림 확인', unreadCount)}
                                        </>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}

                        {/* [전자결재 관리] */}
                        {hasApprovalAccess && (
                        <div className="sidebar-group">
                            <button 
                                className={`sidebar-group-header ${isSectionActive('approval') ? 'active' : ''}`} 
                                onClick={() => toggleSection('approval')}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>📋 전자결재</span>
                                    {totalApprovalCount > 0 && (
                                        <span className="sidebar-group-badge">{totalApprovalCount > 99 ? '99+' : totalApprovalCount}</span>
                                    )}
                                </span>
                                <span className={`arrow ${openSections.approval ? 'open' : ''}`}>▼</span>
                            </button>
                            {openSections.approval && (
                                <div className="sidebar-group-content open">
                                    {renderDynamicSidebarSection('APPROVAL_ROOT', () => (
                                        <>
                                            {(isAdmin || canAccess('approvalPending') || canAccess('approvals')) && 
                                                renderSidebarItem('approvalPending', '⏳ 결재 대기함', approvalUnreadCounts.PENDING)}
                                            {(isAdmin || canAccess('approvalSubmitted') || canAccess('approvals')) && 
                                                renderSidebarItem('approvalSubmitted', '📤 기안 문서함', approvalUnreadCounts.SUBMITTED)}
                                            {(isAdmin || canAccess('approvalInProgress') || canAccess('approvals')) && 
                                                renderSidebarItem('approvalInProgress', '🔄 진행 중 문서', approvalUnreadCounts.IN_PROGRESS)}
                                            {(isAdmin || canAccess('approvalCompleted') || canAccess('approvals')) && 
                                                renderSidebarItem('approvalCompleted', '✅ 결재 완료함', approvalUnreadCounts.COMPLETED)}
                                            {(isAdmin || canAccess('approvalRejected') || canAccess('approvals')) && 
                                                renderSidebarItem('approvalRejected', '❌ 반려 문서함', approvalUnreadCounts.REJECTED)}
                                            {(isAdmin || canAccess('approvalReference') || canAccess('approvals')) && 
                                                renderSidebarItem('approvalReference', '👀 참조 문서함', approvalUnreadCounts.REFERENCE)}
                                            {(isAdmin || canAccess('approvalHistory') || canAccess('approvals')) && 
                                                renderSidebarItem('approvalHistory', '📜 내 결재 내역', approvalUnreadCounts.PROCESSED)}
                                            {(isAdmin || canAccess('approvalDocTypes') || canAccess('approvalTemplates') || canAccess('approvalNotificationRules')) && (
                                                <>
                                                    <div className="sidebar-sub-header">결재선 마스터 설정</div>
                                                    {(isAdmin || canAccess('approvalDocTypes')) && renderSidebarItem('approvalDocTypes', '📑 결재 문서유형 관리')}
                                                    {(isAdmin || canAccess('approvalTemplates')) && renderSidebarItem('approvalTemplates', '📐 결재선 템플릿 빌더')}
                                                    {(isAdmin || canAccess('approvalNotificationRules')) && renderSidebarItem('approvalNotificationRules', '🔔 결재 알림 설정')}
                                                </>
                                            )}
                                        </>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}


                        {/* [품목코드 관리] */}
                        {hasProductsAccess && (
                        <div className="sidebar-group">
                            <button 
                                className={`sidebar-group-header ${isSectionActive('products') ? 'active' : ''}`} 
                                onClick={() => toggleSection('products')}
                            >
                                <span>📦 품목코드 관리</span>
                                <span className={`arrow ${openSections.products ? 'open' : ''}`}>▼</span>
                            </button>
                            {openSections.products && (
                                <div className="sidebar-group-content open">
                                    {renderDynamicSidebarSection('PRODUCTS_ROOT', () => (
                                        <>
                                            {(canAccess('products') || canAccess('brands') || canAccess('ingredientCompliance') || canAccess('salesChannels')) && (
                                                <>
                                                    <div className="sidebar-sub-header">기본 마스터</div>
                                                    {dynamicScreens.filter(s => s.screenCode?.includes('SCR_TEST_EXT') || s.parentMenuCode === 'PRODUCTS_ROOT').map(s => 
                                                        renderSidebarItem(`dynScreen_${s.screenCode}`, `🔬 ${s.screenName}`)
                                                    )}
                                                    {canAccess('products') && renderSidebarItem('products', '📦 제품코드 마스터')}
                                                    {renderSidebarItem('productDashboard', '📊 제품코드 대시보드')}
                                                    {canAccess('brands') && renderSidebarItem('brands', '🏷️ 브랜드 마스터 관리')}
                                                    {canAccess('salesChannels') && renderSidebarItem('salesChannels', '🌐 유통 채널 관리')}
                                                    {canAccess('ingredientCompliance') && renderSidebarItem('ingredientCompliance', '🧪 성분 안전성 검토 (Global Compliance)')}
                                                </>
                                            )}

                                            {(canAccess('bomMaster') || canAccess('bomCategories')) && (
                                                <>
                                                    <div className="sidebar-sub-header">BOM/구성품 관리</div>
                                                    {canAccess('bomMaster') && renderSidebarItem('bomMaster', '📏 구성품 BOM 마스터 관리')}
                                                    {canAccess('bomCategories') && renderSidebarItem('bomCategories', '⚙️ BOM 유형 설정/관리')}
                                                </>
                                            )}
                                        </>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}

                        {/* [제조사 등록 관리] */}
                        {hasPartnerAccess && (
                        <div className="sidebar-group">
                            <button 
                                className={`sidebar-group-header ${isSectionActive('partner') ? 'active' : ''}`} 
                                onClick={() => toggleSection('partner')}
                            >
                                <span>🏭 제조사 등록 관리</span>
                                <span className={`arrow ${openSections.partner ? 'open' : ''}`}>▼</span>
                            </button>
                            {openSections.partner && (
                                <div className="sidebar-group-content open">
                                    {renderDynamicSidebarSection('PARTNER_ROOT', () => (
                                        <>
                                            {canAccess('manufacturers') && renderSidebarItem('manufacturers', '🏭 제조사 정보 관리')}
                                            {canAccess('manufacturerCategories') && renderSidebarItem('manufacturerCategories', '📂 제조사 구분 관리')}
                                            {canAccess('manufacturerGuide') && renderSidebarItem('manufacturerGuide', '🤝 제조사 협업 가이드')}
                                        </>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}

                        {/* [Audit 관리] */}
                        {hasAuditAccess && (
                        <div className="sidebar-group">
                            <button 
                                className={`sidebar-group-header ${isSectionActive('audit') ? 'active' : ''}`} 
                                onClick={() => toggleSection('audit')}
                            >
                                <span>📝 Audit 관리</span>
                                <span className={`arrow ${openSections.audit ? 'open' : ''}`}>▼</span>
                            </button>
                            {openSections.audit && (
                                <div className="sidebar-group-content open">
                                    {renderDynamicSidebarSection('AUDIT_ROOT', () => (
                                        <>
                                            {canAccess('manufacturerAudits') && renderSidebarItem('manufacturerAudits', '📝 제조사 Audit 관리')}
                                            {canAccess('manufacturerAuditDashboard') && renderSidebarItem('manufacturerAuditDashboard', '📊 제조사 Audit 대시보드')}
                                            {canAccess('manufacturerAuditItems') && renderSidebarItem('manufacturerAuditItems', '📋 제조사 점검항목 관리')}
                                        </>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}

                        {/* [생산감리 관리] */}
                        {hasQualityAccess && (
                        <div className="sidebar-group">
                            <button 
                                className={`sidebar-group-header ${isSectionActive('quality') ? 'active' : ''}`} 
                                onClick={() => toggleSection('quality')}
                            >
                                <span>📸 생산감리 관리</span>
                                <span className={`arrow ${openSections.quality ? 'open' : ''}`}>▼</span>
                            </button>
                            {openSections.quality && (
                                <div className="sidebar-group-content open">
                                    {renderDynamicSidebarSection('QUALITY_ROOT', () => (
                                        <>
                                            {canAccess('qualityPhotoAudit') && renderSidebarItem('qualityPhotoAudit', '📸 신제품 생산감리 (사진감리)')}
                                            {canAccess('productionAuditDashboard') && renderSidebarItem('productionAuditDashboard', '📊 생산감리 대시보드')}
                                            {canAccess('documentRequests') && renderSidebarItem('documentRequests', '📋 필수 품질서류 관리')}
                                        </>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}

                        {/* [포장재 관리] */}
                        {hasPackagingAccess && (
                        <div className="sidebar-group">
                            <button 
                                className={`sidebar-group-header ${isSectionActive('packaging') ? 'active' : ''}`} 
                                onClick={() => toggleSection('packaging')}
                            >
                                <span>📦 포장재 관리</span>
                                <span className={`arrow ${openSections.packaging ? 'open' : ''}`}>▼</span>
                            </button>
                            {openSections.packaging && (
                                <div className="sidebar-group-content open">
                                    {renderDynamicSidebarSection('PACKAGING_ROOT', () => (
                                        <>
                                            {canAccess('packagingTemplates') && renderSidebarItem('packagingTemplates', '📋 포장공정 템플릿 관리')}
                                            {canAccess('spaceRatioCalculator') && renderSidebarItem('spaceRatioCalculator', '📐 포장공간비율 계산기')}
                                            {canAccess('outboxCalculator') && renderSidebarItem('outboxCalculator', '📦 아웃박스 규격 계산기')}
                                        </>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}

                        {/* [입고검사 관리] */}
                        {hasInboundAccess && (
                        <div className="sidebar-group">
                            <button 
                                className={`sidebar-group-header ${isSectionActive('inbound') ? 'active' : ''}`} 
                                onClick={() => toggleSection('inbound')}
                            >
                                <span>🚚 입고검사 관리</span>
                                <span className={`arrow ${openSections.inbound ? 'open' : ''}`}>▼</span>
                            </button>
                            {openSections.inbound && (
                                <div className="sidebar-group-content open">
                                    {renderDynamicSidebarSection('INBOUND_ROOT', () => (
                                        <>
                                            {canAccess('qualityDashboard') && renderSidebarItem('qualityDashboard', '🚚 입고 품질 검사 대시보드')}
                                            {canAccess('quality') && renderSidebarItem('quality', '📦 입고 품질 관리')}
                                            {canAccess('releaseRecord') && renderSidebarItem('releaseRecord', '📄 시장출하 적부판정 기록')}
                                        </>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}

                        {/* [CX 클레임 관리] */}
                        {hasClaimAccess && (
                        <div className="sidebar-group">
                            <button 
                                className={`sidebar-group-header ${isSectionActive('claim') ? 'active' : ''}`} 
                                onClick={() => toggleSection('claim')}
                            >
                                <span>⚠️ CX 클레임 관리</span>
                                <span className={`arrow ${openSections.claim ? 'open' : ''}`}>▼</span>
                            </button>
                            {openSections.claim && (
                                <div className="sidebar-group-content open">
                                    {renderDynamicSidebarSection('CLAIM_ROOT', () => (
                                        <>
                                            <div className="sidebar-sub-header">클레임 운영</div>
                                            {canAccess('claims') && renderSidebarItem('claims', '🔍 클레임 조회 및 입력')}
                                            {canAccess('claimDashboard') && renderSidebarItem('claimDashboard', '📈 클레임 대시보드')}
                                            {canAccess('lotPpmDashboard') && renderSidebarItem('lotPpmDashboard', '📉 LOT PPM 분석 & 근본원인')}
                                        </>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}

                        {/* [사용자 커스텀 대메뉴] - 사용자가 신규 생성한 최상위 대메뉴 자동 렌더링 */}
                        {customRootMenus.map(customRoot => {
                            const sectionKey = `custom_${customRoot.id}`;
                            const isOpen = openSections[sectionKey] !== undefined ? openSections[sectionKey] : true;
                            return (
                                <div key={customRoot.id} className="sidebar-group" style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <button 
                                        className={`sidebar-group-header ${isSectionActive(sectionKey) ? 'active' : ''}`} 
                                        onClick={() => toggleSection(sectionKey)}
                                    >
                                        <span>{customRoot.icon || '📁'} {customRoot.menuName}</span>
                                        <span className={`arrow ${isOpen ? 'open' : ''}`}>▼</span>
                                    </button>
                                    {isOpen && (
                                        <div className="sidebar-group-content open">
                                            {(customRoot.screenCode || customRoot.screen?.screenCode) && (
                                                renderSidebarItem(`dynScreen_${customRoot.screenCode || customRoot.screen?.screenCode}`, `${customRoot.icon || '📋'} ${customRoot.menuName}`)
                                            )}
                                            {customRoot.children && customRoot.children.map(child => {
                                                const childCode = child.screenCode || child.screen?.screenCode;
                                                if (childCode) {
                                                    return renderSidebarItem(`dynScreen_${childCode}`, `${child.icon || '📋'} ${child.menuName}`);
                                                }
                                                if (child.children && child.children.length > 0) {
                                                    const validSubs = child.children.filter(s => s.isActive !== false && (s.screenCode || s.screen?.screenCode));
                                                    if (validSubs.length === 0) return null;
                                                    return (
                                                        <div key={child.id} style={{ marginTop: '4px' }}>
                                                            <div className="sidebar-sub-header" style={{ paddingLeft: '14px', fontSize: '11px', color: '#64748b' }}>
                                                                {child.icon || '📁'} {child.menuName}
                                                            </div>
                                                            {validSubs.map(sub => {
                                                                const subCode = sub.screenCode || sub.screen?.screenCode;
                                                                return renderSidebarItem(`dynScreen_${subCode}`, `${sub.icon || '📋'} ${sub.menuName}`);
                                                            })}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                </nav>

                <div className="sidebar-footer">
                    <div className="profile-card" onClick={() => setIsProfileOpen(true)}>
                        <div className="profile-avatar">
                            {user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                        </div>
                        <div className="profile-info">
                            <div className="profile-name">{user?.name || user?.username}</div>
                            <div className="profile-meta">
                                {user?.companyName} • {user?.department || '소속 없음'}
                            </div>
                        </div>
                        <div className="profile-edit-trigger">
                            <button className="icon-btn">✎</button>
                        </div>
                    </div>
                    
                    <button onClick={handleLogout} className="logout-btn-full">
                        <span style={{ marginRight: '8px' }}>🚪</span> 로그아웃
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                <div className="tab-header-container">
                    <div 
                        className="tab-bar" 
                        ref={tabBarRef}
                        onWheel={(e) => {
                            if (tabBarRef.current && e.deltaY !== 0) {
                                tabBarRef.current.scrollLeft += e.deltaY;
                            }
                        }}
                    >
                        {tabs.map(tab => (
                            <div 
                                key={tab.id} 
                                className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
                                onClick={() => handleTabSelect(tab.id)}
                                onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                                title="우클릭 시 탭 정리 메뉴"
                            >
                                <span className="tab-title">{tab.title}</span>
                                {tabs.length > 1 && (
                                    <span className="tab-close" onClick={(e) => handleCloseTab(tab.id, e)}>&times;</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* 상단 생산성 도구 모음: 퀵 서치, 밀도 조절 토글, 단축키, 알림 */}
                    <div className="tab-header-tools" style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '12px' }}>
                        {/* 📐 전역 밀도(Compact / Comfortable) 토글 버튼 */}
                        <button
                            type="button"
                            onClick={handleToggleDensity}
                            title={`화면 표시 밀도 전환 (현재: ${density === 'compact' ? '컴팩트 모드' : '기본 모드'})`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                background: density === 'compact' ? '#eff6ff' : '#f8fafc',
                                border: `1px solid ${density === 'compact' ? '#93c5fd' : '#e2e8f0'}`,
                                borderRadius: '6px',
                                color: density === 'compact' ? '#1d4ed8' : '#475569',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                        >
                            <span>{density === 'compact' ? '📐 컴팩트' : '📏 기본'}</span>
                        </button>
                        {/* 🔍 전역 커맨드 검색 버튼 */}
                        <button
                            type="button"
                            onClick={() => setIsCommandPaletteOpen(true)}
                            title="전역 화면 퀵 이동 (Ctrl + K)"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 10px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                color: '#475569',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                        >
                            <span>🔍 이동</span>
                            <kbd style={{
                                padding: '1px 4px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '3px',
                                fontSize: '10px',
                                color: '#64748b'
                            }}>
                                Ctrl+K
                            </kbd>
                        </button>

                        {/* 알림 시스템 위젯 */}
                        <div className="notifications-widget-container">
                            <button 
                                className={`notification-bell-btn ${unreadCount > 0 ? 'has-unread' : ''} ${bellAnimated ? 'bell-ringing' : ''}`}
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                title="알림 확인"
                            >
                                🔔
                                {unreadCount > 0 && (
                                    <span className="notification-badge">{unreadCount}</span>
                                )}
                            </button>

                        {isNotifOpen && (
                            <div className="notifications-popover" ref={popoverRef}>
                                <div className="notifications-header">
                                    <h3>알림 목록</h3>
                                    {unreadCount > 0 && (
                                        <button className="read-all-btn" onClick={handleReadAllNotifications}>
                                            모두 읽음
                                        </button>
                                    )}
                                </div>
                                <div className="notifications-list">
                                    {notifications.length === 0 ? (
                                        <div className="notifications-empty">
                                            <span className="notifications-empty-icon">🔔</span>
                                            <span>새로운 알림이 없습니다.</span>
                                        </div>
                                    ) : (
                                        notifications.map(n => (
                                            <div 
                                                key={n.id} 
                                                className={`notification-item ${!n.read ? 'unread' : ''}`}
                                                onClick={() => handleReadNotification(n)}
                                            >
                                                <div className="notification-item-header">
                                                    <span className="notification-item-title">{n.title}</span>
                                                    <button 
                                                        className="notification-delete-btn" 
                                                        onClick={(e) => handleDeleteNotification(n.id, e)}
                                                        title="알림 삭제"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                                <div className="notification-item-message">{n.message}</div>
                                                <div className="notification-item-meta">
                                                    <span className={`notification-type-badge ${n.type ? n.type.toLowerCase() : 'announcement'}`}>
                                                        {n.type === 'CLAIM' ? '클레임' : 
                                                         n.type === 'PRODUCTION_AUDIT' ? '생산감리' : 
                                                         n.type === 'USER_APPROVAL' ? '사용자승인' : '공지'}
                                                    </span>
                                                    <span>
                                                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString('ko-KR', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
                </div>

                <div className="tab-content-container">
                    <Suspense fallback={
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '40px', flexDirection: 'column', gap: '12px' }}>
                            <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>페이지 로딩 중...</span>
                        </div>
                    }>
                        {tabs.map(tab => (
                            <div 
                                key={tab.id} 
                                className={`tab-page-wrapper ${tab.id === activeTabId ? 'tab-active' : 'tab-hidden'}`}
                            >
                                <div className="page-container-inner">
                                    <TabErrorBoundary 
                                        tabId={tab.id} 
                                        tabTitle={tab.title} 
                                        onCloseTab={() => handleCloseTab(tab.id)}
                                    >
                                        {canAccess('users') && tab.page === 'users' && (
                                            <UserManagementPage 
                                                user={user}
                                                navigationData={tab.data} 
                                                onNavigated={() => {}} // No-op as data is stored in tab
                                            />
                                        )}
                                        {canAccess('logs') && tab.page === 'logs' && <LogManagementPage user={user} />}
                                        {canAccess('roles') && tab.page === 'roles' && <RoleManagementPage user={user} />}
                                        {canAccess('guideManagement') && tab.page === 'guideManagement' && <GuideManagementPage user={user} />}
                                        {canAccess('dashboardMgmt') && tab.page === 'dashboardMgmt' && <DashboardManagementPage user={user} />}
                                        {canAccess('mailTemplates') && tab.page === 'mailTemplates' && <MailTemplatePage user={user} />}
                                        {canAccess('announcements') && tab.page === 'announcements' && <AnnouncementManagementPage user={user} onNavigate={handleNavigate} />}
                                        {canAccess('notifications') && tab.page === 'notifications' && <NotificationListPage user={user} onNavigate={handleNavigate} />}

                                        {canAccess('documentRequests') && tab.page === 'documentRequests' && (
                                            <DocumentRequestManagementPage 
                                                user={user} 
                                                onNavigateToConfig={() => handleNavigate('documentTypeConfig')}
                                            />
                                        )}
                                        {canAccess('documentRequests') && tab.page === 'documentTypeConfig' && (
                                            <DocumentCycleConfigPage 
                                                user={user} 
                                                onBack={() => handleNavigate('documentRequests')}
                                            />
                                        )}

                                        {tab.page === 'brands' && <BrandManagementPage user={user} onNavigate={handleNavigate} />}
                                        {tab.page === 'manufacturers' && <ManufacturerManagementPage user={user} />}
                                        {tab.page === 'salesChannels' && <SalesChannelManagement user={user} />}
                                        {tab.page === 'channelNoteConfig' && <ChannelNoteCategoryConfigPage user={user} />}
                                        {tab.page === 'manufacturerCategories' && <ManufacturerCategoryPage user={user} />}
                                        {tab.page === 'products' && (
                                            <ProductListPage 
                                                user={user} 
                                                navigationData={tab.data} 
                                                onNavigated={() => {}} 
                                                isActive={tab.id === activeTabId}
                                            />
                                        )}
                                        {tab.page === 'quality' && (
                                            <QualityManagementPage 
                                                user={user} 
                                                navigationData={tab.data} 
                                                onNavigated={() => {}} 
                                            />
                                        )}
                                        {canAccess('releaseRecord') && tab.page === 'releaseRecord' && (
                                            <MarketReleaseRecordPage user={user} />
                                        )}
                                        {canAccess('qualityPhotoAudit') && tab.page === 'qualityPhotoAudit' && (
                                            <ProductionAuditPage 
                                                user={user} 
                                                navigationData={tab.data}
                                                onNavigated={() => {}}
                                            />
                                        )}
                                        {canAccess('ingredientCompliance') && tab.page === 'ingredientCompliance' && <IngredientCompliancePage user={user} />}
                                        {tab.page === 'dashboard' && (
                                            <DashboardPage 
                                                user={user} 
                                                onNavigate={handleNavigate} 
                                            />
                                        )}
                                        {tab.page === 'claims' && (
                                            <ClaimManagementPage 
                                                user={user} 
                                                navigationData={tab.data}
                                                onNavigated={() => {}}
                                                onNavigate={handleNavigate}
                                                isActive={tab.id === activeTabId}
                                            />
                                        )}
                                        {tab.page === 'claimDashboard' && (
                                            <ClaimDashboardPage 
                                                user={user}
                                                onNavigate={handleNavigate}
                                            />
                                        )}
                                        {tab.page === 'lotPpmDashboard' && (
                                            <LotPpmDashboardPage 
                                                user={user}
                                                onNavigate={handleNavigate}
                                            />
                                        )}
                                        {tab.page === 'qualityDashboard' && (
                                            <QualityDashboardPage 
                                                user={user}
                                                onNavigate={handleNavigate}
                                            />
                                        )}
                                        {tab.page === 'productDashboard' && (
                                            <ProductDashboardPage user={user} onNavigate={handleNavigate} />
                                        )}
                                        {tab.page === 'productionAuditDashboard' && (
                                            <ProductionAuditDashboardPage user={user} onNavigate={handleNavigate} />
                                        )}
                                        {tab.page === 'productBomInquiry' && <ProductBomInquiryPage user={user} isActive={tab.id === activeTabId} />}
                                        {tab.page === 'bomMaster' && <BomMasterPage user={user} />}
                                        {tab.page === 'bomCategories' && <BomCategoryManagementPage user={user} />}
                                        {tab.page === 'packagingTemplates' && <PackagingTemplatePage user={user} />}
                                        {canAccess('spaceRatioCalculator') && tab.page === 'spaceRatioCalculator' && (
                                            <PackagingSpaceRatioCalculatorPage user={user} onNavigate={handleNavigate} />
                                        )}
                                        {canAccess('outboxCalculator') && tab.page === 'outboxCalculator' && (
                                            <OutboxSpecCalculatorPage user={user} onNavigate={handleNavigate} />
                                        )}
                                        {tab.page === 'manufacturerAuditItems' && <ManufacturerAuditItemPage user={user} />}
                                        {tab.page === 'manufacturerAudits' && <ManufacturerAuditPage user={user} />}
                                        {tab.page === 'manufacturerAuditDashboard' && <ManufacturerAuditDashboard user={user} onNavigate={handleNavigate} />}
                                        {canAccess('manufacturerGuide') && tab.page === 'manufacturerGuide' && (
                                            <ManufacturerGuidePage user={user} />
                                        )}
                                        {canAccess('trashBin') && tab.page === 'trashBin' && <TrashBinPage user={user} />}
                                        {canAccess('accessLogs') && tab.page === 'accessLogs' && <AccessLogPage user={user} />}
                                        {canAccess('bugReports') && tab.page === 'bugReports' && <BugReportPage user={user} />}
                                        {canAccess('notificationSettings') && tab.page === 'notificationSettings' && <NotificationSettingsPage user={user} />}
                                        {canAccess('systemBenchmark') && tab.page === 'systemBenchmark' && <SystemBenchmarkPage user={user} />}
                                        {!isManufacturer && (
                                            tab.page === 'approvals' || 
                                            tab.page === 'approvalPending' || 
                                            tab.page === 'approvalSubmitted' || 
                                            tab.page === 'approvalInProgress' || 
                                            tab.page === 'approvalCompleted' || 
                                            tab.page === 'approvalRejected' || 
                                            tab.page === 'approvalReference' || 
                                            tab.page === 'approvalHistory'
                                        ) && (
                                            <ApprovalInboxPage 
                                                currentUser={user} 
                                                navigationData={tab.data} 
                                                onNavigated={() => {}}
                                                showAlert={showAlert} 
                                                showConfirm={showConfirm} 
                                                fixedTab={
                                                    tab.page === 'approvalPending' ? 'PENDING' :
                                                    tab.page === 'approvalSubmitted' ? 'SUBMITTED' :
                                                    tab.page === 'approvalInProgress' ? 'IN_PROGRESS' :
                                                    tab.page === 'approvalCompleted' ? 'COMPLETED' :
                                                    tab.page === 'approvalRejected' ? 'REJECTED' :
                                                    tab.page === 'approvalReference' ? 'REFERENCE' :
                                                    tab.page === 'approvalHistory' ? 'PROCESSED' : null
                                                }
                                                onUnreadChanged={loadApprovalUnreadCounts}
                                            />
                                        )}
                                        {!isManufacturer && (isAdmin || canAccess('approvalDocTypes')) && tab.page === 'approvalDocTypes' && (
                                            <ApprovalDocTypeManagementPage 
                                                user={user}
                                                showAlert={showAlert} 
                                                showConfirm={showConfirm} 
                                            />
                                        )}
                                        {!isManufacturer && (isAdmin || canAccess('approvalTemplates')) && tab.page === 'approvalTemplates' && (
                                            <ApprovalTemplateBuilderPage 
                                                currentUser={user} 
                                                showAlert={showAlert} 
                                                showConfirm={showConfirm} 
                                            />
                                        )}
                                        {!isManufacturer && (isAdmin || canAccess('approvalNotificationRules')) && tab.page === 'approvalNotificationRules' && (
                                            <ApprovalNotificationRulesPage 
                                                user={user}
                                                showAlert={showAlert} 
                                            />
                                        )}
                                        {tab.page === 'dynScreenProduct' && (
                                            <DynamicScreenRenderer screenCode="SCR_NOTION_PRODUCT" user={user} />
                                        )}
                                        {tab.page === 'dynScreenClaim' && (
                                            <DynamicScreenRenderer screenCode="SCR_DYNAMIC_CLAIM" user={user} />
                                        )}
                                        {tab.page?.startsWith('dynScreen_') && (
                                            <DynamicScreenRenderer 
                                                screenCode={tab.data?.screenCode || tab.page.replace('dynScreen_', '')} 
                                                user={user} 
                                            />
                                        )}
                                        {!isManufacturer && (isAdmin || canAccess('menuManagement')) && (tab.page === 'menuManagement' || tab.page === 'screenPositionManagement') && (
                                            <ScreenMenuManagementPage user={user} />
                                        )}

                                    </TabErrorBoundary>
                                </div>
                            </div>
                        ))}
                    </Suspense>
                </div>
            </main>

            {/* Global floating help button */}
            <button 
                className="floating-help-btn" 
                onClick={() => setIsHelpOpen(prev => !prev)}
                title="작업 병행형 가이드 보기"
            >
                💡
            </button>

            {/* Smart Tab Context Menu */}
            {tabContextMenu.visible && (
                <div
                    className="tab-context-menu"
                    style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button className="tab-context-item" onClick={() => handleCloseTab(tabContextMenu.tabId, { stopPropagation: () => {} })}>
                        ✕ 현재 탭 닫기 <kbd className="cmd-mini-kbd" style={{ marginLeft: 'auto' }}>Ctrl+W</kbd>
                    </button>
                    <button className="tab-context-item" onClick={() => handleCloseOtherTabs(tabContextMenu.tabId)}>
                        ↔️ 다른 탭 모두 닫기
                    </button>
                    <button className="tab-context-item" onClick={() => handleCloseRightTabs(tabContextMenu.tabId)}>
                        ➡️ 오른쪽 탭 모두 닫기
                    </button>
                    <div className="tab-context-divider" />
                    <button className="tab-context-item danger" onClick={handleCloseAllExceptDashboard}>
                        🧹 대시보드 외 전체 닫기
                    </button>
                </div>
            )}

            {/* Command Palette Modal (Ctrl + K) */}
            <CommandPaletteModal
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
                onNavigate={handleNavigate}
                pageInfo={PAGE_INFO}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                canAccess={canAccess}
            />

            {/* Contextual Screen Help Modal (Popup) */}
            {isHelpOpen && (
                <HelpCenterModal 
                    currentPage={tabs.find(t => t.id === activeTabId)?.page} 
                    onClose={() => setIsHelpOpen(false)} 
                    user={user}
                />
            )}

        </div>
        </ErrorBoundary>
    );
};

export default App;
