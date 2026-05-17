import React, { useState, useEffect } from 'react';
import LoginPage from './LoginPage';
import ProductListPage from './ProductListPage';
import UserManagementPage from './UserManagementPage';
import QualityManagementPage from './QualityManagementPage';
import ManufacturerManagementPage from './ManufacturerManagementPage';
import BrandManagementPage from './BrandManagementPage';
import LogManagementPage from './LogManagementPage';
import DashboardPage from './DashboardPage';
import ClaimManagementPage from './ClaimManagementPage';
import ClaimDashboardPage from './ClaimDashboardPage.jsx';
import MarketReleaseRecordPage from './MarketReleaseRecordPage.jsx';
import BomMasterPage from './BomMasterPage.jsx';
import BomCategoryManagementPage from './BomCategoryManagementPage.jsx';
import PackagingTemplatePage from './PackagingTemplatePage.jsx';
import PackagingRulePage from './PackagingRulePage.jsx';
import SalesChannelManagement from './SalesChannelManagement.jsx';
import RoleManagementPage from './RoleManagementPage.jsx';
import GuideManagementPage from './GuideManagementPage.jsx';
import ProductionAuditPage from './ProductionAuditPage.jsx';
import DashboardManagementPage from './DashboardManagementPage.jsx';
import TrashBinPage from './TrashBinPage.jsx';
import IngredientCompliancePage from './IngredientCompliancePage.jsx';
import HelpCenterModal from './components/HelpCenterModal';
import ProfileModal from './ProfileModal';
import { getCurrentUser, logout } from './api';
import ManufacturerAuditItemPage from './ManufacturerAuditItemPage';
import ManufacturerAuditPage from './ManufacturerAuditPage';
import ManufacturerAuditDashboard from './ManufacturerAuditDashboard';
import ManufacturerCategoryPage from './ManufacturerCategoryPage';
import AccessLogPage from './AccessLogPage.jsx';
import BugReportPage from './BugReportPage.jsx';

const PAGE_INFO = {
    dashboard: { title: '📊 시스템 대시보드' },
    users: { title: '👥 사용자 승인 관리' },
    logs: { title: '📜 시스템 변경 이력' },
    roles: { title: '🔐 권한 관리' },
    guideManagement: { title: '📖 가이드 관리' },
    dashboardMgmt: { title: '🎨 대시보드 관리' },
    trashBin: { title: '🗑️ 데이터 복구' },
    brands: { title: '🏷️ 브랜드 마스터' },
    manufacturers: { title: '🏭 제조사 정보' },
    salesChannels: { title: '🌐 유통 채널 관리' },
    products: { title: '📦 제품코드 마스터' },
    bomMaster: { title: '📏 BOM 마스터' },
    bomCategories: { title: '⚙️ BOM 유형 설정' },
    packagingTemplates: { title: '📋 포장공정 템플릿' },
    packagingRules: { title: '⚖️ 채널별 포장 규칙' },
    quality: { title: '📦 입고 품질 관리' },
    releaseRecord: { title: '📄 시장출하 기록' },
    qualityPhotoAudit: { title: '📸 신제품 생산감리' },
    claims: { title: '🔍 클레임 조회/입력' },
    claimDashboard: { title: '📈 클레임 대시보드' },
    manufacturerAuditItems: { title: '📋 제조사 점검항목 관리' },
    manufacturerAudits: { title: '📝 제조사 Audit 관리' },
    manufacturerAuditDashboard: { title: '📊 제조사 Audit 대시보드' },
    manufacturerCategories: { title: '📂 제조사 구분 관리' },
    accessLogs: { title: '🕒 사용자 접근 로그' },
    bugReports: { title: '🐞 버그 리포트 관리' },
    ingredientCompliance: { title: '🧪 성분 안전성 검토' }
};

// [추가] 글로벌 에러 핸들링을 위한 Error Boundary 컴포넌트
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null, isReporting: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error(">>>> [FATAL ERROR] Captured by ErrorBoundary:", error, errorInfo);
        // 자동 리포팅 시도 (선택 사항)
        // this.sendAutoReport(error, errorInfo);
    }

    sendAutoReport = async () => {
        const { error, errorInfo } = this.state;
        if (!error) return;

        this.setState({ isReporting: true });
        try {
            const { submitBugReport } = await import('./api');
            await submitBugReport({
                screenName: window.__QMS_ACTIVE_PAGE__ || '전역 에러',
                url: window.location.href,
                severity: 'CRITICAL',
                description: `[자동 감지] 시스템 치명적 오류 발생: ${error.message}`,
                steps: `사용자 활동 중 예기치 않은 오류가 발생하여 화면이 중단되었습니다.\n\n[Stack Trace]\n${error.stack}\n\n[Component Stack]\n${errorInfo?.componentStack}`,
                reporterName: this.props.user?.name || '알 수 없는 사용자',
                reporterUsername: this.props.user?.username || 'unknown'
            });
            alert("버그 리포트가 개발팀에 성공적으로 전달되었습니다. 시스템을 새로고침합니다.");
            window.location.reload();
        } catch (err) {
            console.error("Bug report failed", err);
            alert("리포트 전송에 실패했습니다. 수동으로 새로고침해 주세요.");
            this.setState({ isReporting: false });
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
                        아래 버튼을 눌러 버그를 신고하시면 개발팀에서 즉시 확인하겠습니다.
                    </p>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button 
                            className="primary" 
                            onClick={this.sendAutoReport}
                            disabled={this.state.isReporting}
                            style={{ padding: '12px 30px', fontWeight: 'bold' }}
                        >
                            {this.state.isReporting ? '전송 중...' : '🐞 버그 리포트 전송 및 새로고침'}
                        </button>
                        <button 
                            className="secondary" 
                            onClick={() => window.location.reload()}
                            style={{ padding: '12px 30px' }}
                        >
                            새로고침
                        </button>
                    </div>
                    {process.env.NODE_ENV === 'development' && (
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
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [tabs, setTabs] = useState([
        { id: 'dashboard', page: 'dashboard', title: '📊 시스템 대시보드', data: null }
    ]);
    const [activeTabId, setActiveTabId] = useState('dashboard');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false); 
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // [고도화 1] 사이드바 그룹 열림/닫힘 상태 관리 (Accordion Behavior)
    const [openSections, setOpenSections] = useState({
        system: true,
        master: false,
        quality: false,
        claim: false
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
    }, [isLoggedIn]); // Re-attach when logged in state changes and UI renders

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

    // [추가] 활성 탭 자동 스크롤
    useEffect(() => {
        if (!activeTabId) return;
        setTimeout(() => {
            const activeTabElement = document.querySelector(`.tab-item.active`);
            if (activeTabElement && tabBarRef.current) {
                activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }, 100);
    }, [activeTabId]);

    const toggleSection = (section) => {
        setOpenSections(prev => {
            const isOpening = !prev[section];
            if (isOpening) {
                // Close all other sections
                return {
                    system: false,
                    master: false,
                    quality: false,
                    claim: false,
                    [section]: true
                };
            } else {
                // Just toggle this one off
                return { ...prev, [section]: false };
            }
        });
    };

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

    // [추가] 탭 변경 시 사이드바 동기화 및 페이지 열람 로깅
    useEffect(() => {
        if (!activeTabId || !isLoggedIn) return;

        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab) return;

        const pageKey = activeTab.page;
        const pageTitle = PAGE_INFO[pageKey]?.title || pageKey;

        // 1. 사이드바 그룹 자동 열기
        let targetSection = null;
        if (['dashboard', 'users', 'logs', 'roles', 'guideManagement', 'dashboardMgmt', 'trashBin', 'accessLogs', 'bugReports'].includes(pageKey)) targetSection = 'system';
        else if (['brands', 'manufacturers', 'salesChannels', 'manufacturerCategories', 'products', 'bomMaster', 'bomCategories', 'packagingTemplates', 'packagingRules', 'ingredientCompliance'].includes(pageKey)) targetSection = 'master';
        else if (['quality', 'releaseRecord', 'qualityPhotoAudit', 'manufacturerAudits', 'manufacturerAuditDashboard'].includes(pageKey)) targetSection = 'quality';
        else if (['claims', 'claimDashboard'].includes(pageKey)) targetSection = 'claim';

        if (targetSection) {
            setOpenSections({
                system: false,
                master: false,
                quality: false,
                claim: false,
                [targetSection]: true
            });
        }

        // 2. 페이지 열람 로깅
        import('./api').then(({ logPageView }) => {
            logPageView({ pageKey, pageTitle }).catch(err => console.error("Page log failed", err));
        });

    }, [activeTabId, isLoggedIn, tabs]);

    const fetchUser = async () => {
        try {
            const response = await getCurrentUser({ skipLoading: true });
            console.log(">>>> [DEBUG] Current User Data:", response.data);
            setUser(response.data);
            setIsLoggedIn(true);
        } catch (err) {
            setIsLoggedIn(false);
        }
    };

    const handleNavigate = (page, data = null) => {
        const pageTitle = PAGE_INFO[page]?.title || page;
        
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
    };

    const handleCloseTab = (tabId, e) => {
        e.stopPropagation();
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
        try {
            await logout();
        } catch (err) {
            console.error("Logout failed", err);
        }
        setIsLoggedIn(false);
        setUser(null);
        setTabs([{ id: 'dashboard', page: 'dashboard', title: '📊 시스템 대시보드', data: null }]);
        setActiveTabId('dashboard');
        setIsMobileMenuOpen(false);
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

    if (!isLoggedIn) {
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }

    const checkRole = (roleName) => user?.roles?.some(r => r.authority?.includes(roleName));
    const isAdmin = checkRole('ADMIN');
    const isResponsibleSales = checkRole('RESPONSIBLE_SALES');
    const isQuality = checkRole('QUALITY');
    const isManufacturer = checkRole('MANUFACTURER');
    const isSales = checkRole('SALES');

    const isACompany = user?.companyName === '더파운더즈';
    const isAQualityTeam = isQuality || (isACompany && user?.department === 'Quality');

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

    const canAccess = (menuKey) => hasPermission(menuKey, 'VIEW');

    const hasSystemAccess = canAccess('dashboard') || canAccess('users') || canAccess('logs') || canAccess('roles') || canAccess('guideManagement') || canAccess('dashboardMgmt') || canAccess('trashBin') || canAccess('accessLogs') || canAccess('bugReports');
    const hasMasterAccess = canAccess('brands') || canAccess('manufacturers') || canAccess('salesChannels') || canAccess('manufacturerCategories') || canAccess('products') || canAccess('bomMaster') || canAccess('bomCategories') || canAccess('packagingTemplates') || canAccess('packagingRules') || canAccess('ingredientCompliance');
    const hasQualityAccess = canAccess('quality') || canAccess('releaseRecord') || canAccess('qualityPhotoAudit') || canAccess('manufacturerAudits') || canAccess('manufacturerAuditDashboard') || canAccess('manufacturerAuditItems');
    const hasClaimAccess = canAccess('claims') || canAccess('claimDashboard');

    // [고도화 5] 현재 활성화된 섹션 판단 로직
    const isSectionActive = (section) => {
        const activePage = tabs.find(t => t.id === activeTabId)?.page;
        switch(section) {
            case 'system': return ['dashboard', 'users', 'logs', 'roles', 'guideManagement', 'dashboardMgmt', 'trashBin', 'accessLogs', 'bugReports'].includes(activePage);
            case 'master': return ['brands', 'manufacturers', 'salesChannels', 'manufacturerCategories', 'products', 'bomMaster', 'bomCategories', 'packagingTemplates', 'packagingRules', 'ingredientCompliance'].includes(activePage);
            case 'quality': return ['quality', 'releaseRecord', 'qualityPhotoAudit', 'manufacturerAudits', 'manufacturerAuditDashboard', 'manufacturerAuditItems'].includes(activePage);
            case 'claim': return ['claims', 'claimDashboard'].includes(activePage);
            default: return false;
        }
    };

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
                    {/* [시스템 관리] */}
                    {hasSystemAccess && (
                    <div className="sidebar-group">
                        <button 
                            className={`sidebar-group-header ${isSectionActive('system') ? 'active' : ''}`} 
                            onClick={() => toggleSection('system')}
                        >
                            <span>🛠️ 시스템 관리</span>
                            <span className={`arrow ${openSections.system ? 'open' : ''}`}>▼</span>
                        </button>
                        {openSections.system && (
                            <div className="sidebar-group-content">
                                {(canAccess('users') || canAccess('roles') || canAccess('accessLogs')) && (
                                    <>
                                        <div className="sidebar-sub-header">사용자 및 보안</div>
                                        {canAccess('users') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'users' ? 'active' : ''}`} onClick={() => handleNavigate('users')}>
                                                👥 사용자 승인 관리
                                            </button>
                                        )}
                                        {canAccess('roles') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'roles' ? 'active' : ''}`} onClick={() => handleNavigate('roles')}>
                                                🔐 권한 관리
                                            </button>
                                        )}
                                        {canAccess('accessLogs') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'accessLogs' ? 'active' : ''}`} onClick={() => handleNavigate('accessLogs')}>
                                                🕒 사용자 접근 로그
                                            </button>
                                        )}
                                    </>
                                )}

                                {(canAccess('dashboard') || canAccess('logs') || canAccess('bugReports')) && (
                                    <>
                                        <div className="sidebar-sub-header">운영 모니터링</div>
                                        {canAccess('dashboard') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavigate('dashboard')}>
                                                📊 시스템 대시보드
                                            </button>
                                        )}
                                        {canAccess('logs') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'logs' ? 'active' : ''}`} onClick={() => handleNavigate('logs')}>
                                                📜 시스템 변경 이력
                                            </button>
                                        )}
                                        {canAccess('bugReports') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'bugReports' ? 'active' : ''}`} onClick={() => handleNavigate('bugReports')}>
                                                🐞 버그 리포트 관리
                                            </button>
                                        )}
                                    </>
                                )}

                                {(canAccess('guideManagement') || canAccess('dashboardMgmt') || canAccess('trashBin')) && (
                                    <>
                                        <div className="sidebar-sub-header">설정 및 유지보수</div>
                                        {canAccess('guideManagement') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'guideManagement' ? 'active' : ''}`} onClick={() => handleNavigate('guideManagement')}>
                                                📖 가이드 관리
                                            </button>
                                        )}
                                        {canAccess('dashboardMgmt') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'dashboardMgmt' ? 'active' : ''}`} onClick={() => handleNavigate('dashboardMgmt')}>
                                                🎨 대시보드 제작/관리
                                            </button>
                                        )}
                                        {canAccess('trashBin') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'trashBin' ? 'active' : ''}`} onClick={() => handleNavigate('trashBin')}>
                                                🗑️ 데이터 복구 (휴지통)
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    )}

                    {/* [품목 및 기준정보] */}
                    {hasMasterAccess && (
                    <div className="sidebar-group">
                        <button 
                            className={`sidebar-group-header ${isSectionActive('master') ? 'active' : ''}`} 
                            onClick={() => toggleSection('master')}
                        >
                            <span>📦 품목 및 기준정보</span>
                            <span className={`arrow ${openSections.master ? 'open' : ''}`}>▼</span>
                        </button>
                        {openSections.master && (
                            <div className="sidebar-group-content">
                                {(canAccess('products') || canAccess('brands') || canAccess('ingredientCompliance')) && (
                                    <>
                                        <div className="sidebar-sub-header">기본 마스터</div>
                                        {canAccess('products') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'products' ? 'active' : ''}`} onClick={() => handleNavigate('products')}>
                                                📦 제품코드 마스터
                                            </button>
                                        )}
                                        {canAccess('brands') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'brands' ? 'active' : ''}`} onClick={() => handleNavigate('brands')}>
                                                🏷️ 브랜드 마스터 관리
                                            </button>
                                        )}
                                        {canAccess('ingredientCompliance') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'ingredientCompliance' ? 'active' : ''}`} onClick={() => handleNavigate('ingredientCompliance')}>
                                                🧪 성분 안전성 검토 (Global Compliance)
                                            </button>
                                        )}
                                    </>
                                )}

                                {(canAccess('manufacturers') || canAccess('manufacturerCategories') || canAccess('salesChannels')) && (
                                    <>
                                        <div className="sidebar-sub-header">파트너 관리</div>
                                        {canAccess('manufacturers') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'manufacturers' ? 'active' : ''}`} onClick={() => handleNavigate('manufacturers')}>
                                                🏭 제조사 정보 관리
                                            </button>
                                        )}
                                        {canAccess('manufacturerCategories') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'manufacturerCategories' ? 'active' : ''}`} onClick={() => handleNavigate('manufacturerCategories')}>
                                                📂 제조사 구분 관리
                                            </button>
                                        )}
                                        {canAccess('salesChannels') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'salesChannels' ? 'active' : ''}`} onClick={() => handleNavigate('salesChannels')}>
                                                🌐 유통 채널 관리
                                            </button>
                                        )}
                                    </>
                                )}

                                {(canAccess('bomMaster') || canAccess('bomCategories')) && (
                                    <>
                                        <div className="sidebar-sub-header">BOM/구성품 관리</div>
                                        {canAccess('bomMaster') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'bomMaster' ? 'active' : ''}`} onClick={() => handleNavigate('bomMaster')}>
                                                📏 구성품 BOM 마스터 관리
                                            </button>
                                        )}
                                        {canAccess('bomCategories') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'bomCategories' ? 'active' : ''}`} onClick={() => handleNavigate('bomCategories')}>
                                                ⚙️ BOM 유형 설정/관리
                                            </button>
                                        )}
                                    </>
                                )}

                                {(canAccess('packagingTemplates') || canAccess('packagingRules')) && (
                                    <>
                                        <div className="sidebar-sub-header">포장 규칙 설정</div>
                                        {canAccess('packagingTemplates') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'packagingTemplates' ? 'active' : ''}`} onClick={() => handleNavigate('packagingTemplates')}>
                                                📋 포장공정 템플릿 관리
                                            </button>
                                        )}
                                        {canAccess('packagingRules') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'packagingRules' ? 'active' : ''}`} onClick={() => handleNavigate('packagingRules')}>
                                                ⚖️ 채널별 포장 규칙 관리
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    )}

                    {/* [생산감리 및 품질] */}
                    {hasQualityAccess && (
                    <div className="sidebar-group">
                        <button 
                            className={`sidebar-group-header ${isSectionActive('quality') ? 'active' : ''}`} 
                            onClick={() => toggleSection('quality')}
                        >
                            <span>🔍 생산감리 및 품질</span>
                            <span className={`arrow ${openSections.quality ? 'open' : ''}`}>▼</span>
                        </button>
                        {openSections.quality && (
                            <div className="sidebar-group-content">
                                {canAccess('qualityPhotoAudit') && (
                                    <>
                                        <div className="sidebar-sub-header">생산감리</div>
                                        {canAccess('qualityPhotoAudit') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'qualityPhotoAudit' ? 'active' : ''}`} onClick={() => handleNavigate('qualityPhotoAudit')}>
                                                📸 신제품 생산감리 (사진감리)
                                            </button>
                                        )}
                                    </>
                                )}

                                {(canAccess('manufacturerAudits') || canAccess('manufacturerAuditDashboard')) && (
                                    <>
                                        <div className="sidebar-sub-header">제조사 Audit</div>
                                        {canAccess('manufacturerAudits') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'manufacturerAudits' ? 'active' : ''}`} onClick={() => handleNavigate('manufacturerAudits')}>
                                                📝 제조사 Audit 관리
                                            </button>
                                        )}
                                        {canAccess('manufacturerAuditDashboard') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'manufacturerAuditDashboard' ? 'active' : ''}`} onClick={() => handleNavigate('manufacturerAuditDashboard')}>
                                                📊 제조사 Audit 대시보드
                                            </button>
                                        )}
                                    </>
                                )}

                                {(canAccess('quality') || canAccess('releaseRecord')) && (
                                    <>
                                        <div className="sidebar-sub-header">입고 관리</div>
                                        {canAccess('quality') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'quality' ? 'active' : ''}`} onClick={() => handleNavigate('quality')}>
                                                📦 입고 품질 관리
                                            </button>
                                        )}
                                        {canAccess('releaseRecord') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'releaseRecord' ? 'active' : ''}`} onClick={() => handleNavigate('releaseRecord')}>
                                                📄 시장출하 적부판정 기록
                                            </button>
                                        )}
                                    </>
                                )}

                                {canAccess('manufacturerAuditItems') && (
                                    <>
                                        <div className="sidebar-sub-header">설정 관리</div>
                                        {canAccess('manufacturerAuditItems') && (
                                            <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'manufacturerAuditItems' ? 'active' : ''}`} onClick={() => handleNavigate('manufacturerAuditItems')}>
                                                📋 제조사 점검항목 관리
                                            </button>
                                        )}
                                    </>
                                )}
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
                            <div className="sidebar-group-content">
                                <div className="sidebar-sub-header">클레임 운영</div>
                                {canAccess('claims') && (
                                    <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'claims' ? 'active' : ''}`} onClick={() => handleNavigate('claims')}>
                                        🔍 클레임 조회 및 입력
                                    </button>
                                )}
                                {canAccess('claimDashboard') && (
                                    <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'claimDashboard' ? 'active' : ''}`} onClick={() => handleNavigate('claimDashboard')}>
                                        📈 클레임 대시보드
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    )}

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
                <div className="tab-bar" ref={tabBarRef}>
                    {tabs.map(tab => (
                        <div 
                            key={tab.id} 
                            className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
                            onClick={() => setActiveTabId(tab.id)}
                        >
                            <span className="tab-title">{tab.title}</span>
                            {tabs.length > 1 && (
                                <span className="tab-close" onClick={(e) => handleCloseTab(tab.id, e)}>&times;</span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="tab-content-container">
                    {tabs.map(tab => (
                        <div 
                            key={tab.id} 
                            className="tab-page-wrapper"
                            style={{ display: tab.id === activeTabId ? 'flex' : 'none' }}
                        >
                            <div className="page-container-inner">
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

                                {tab.page === 'brands' && <BrandManagementPage user={user} />}
                                {tab.page === 'manufacturers' && <ManufacturerManagementPage user={user} />}
                                {tab.page === 'salesChannels' && <SalesChannelManagement user={user} />}
                                {tab.page === 'manufacturerCategories' && <ManufacturerCategoryPage user={user} />}
                                {tab.page === 'products' && (
                                    <ProductListPage 
                                        user={user} 
                                        navigationData={tab.data} 
                                        onNavigated={() => {}} 
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
                                {canAccess('qualityPhotoAudit') && tab.page === 'qualityPhotoAudit' && <ProductionAuditPage user={user} />}
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
                                    />
                                )}
                                {tab.page === 'claimDashboard' && (
                                    <ClaimDashboardPage 
                                        user={user}
                                        onNavigate={handleNavigate}
                                    />
                                )}
                                {tab.page === 'bomMaster' && <BomMasterPage user={user} />}
                                {tab.page === 'bomCategories' && <BomCategoryManagementPage user={user} />}
                                {tab.page === 'packagingTemplates' && <PackagingTemplatePage user={user} />}
                                {tab.page === 'packagingRules' && <PackagingRulePage user={user} />}
                                {tab.page === 'manufacturerAuditItems' && <ManufacturerAuditItemPage user={user} />}
                                {tab.page === 'manufacturerAudits' && <ManufacturerAuditPage user={user} />}
                                {tab.page === 'manufacturerAuditDashboard' && <ManufacturerAuditDashboard user={user} onNavigate={handleNavigate} />}
                                {canAccess('trashBin') && tab.page === 'trashBin' && <TrashBinPage user={user} />}
                                {canAccess('accessLogs') && tab.page === 'accessLogs' && <AccessLogPage user={user} />}
                                {canAccess('bugReports') && tab.page === 'bugReports' && <BugReportPage user={user} />}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Global floating help button */}
            <button 
                className="floating-help-btn" 
                onClick={() => setIsHelpOpen(true)}
                title="도움말 보기"
            >
                💡
            </button>

            {isHelpOpen && (
                <HelpCenterModal 
                    currentPage={tabs.find(t => t.id === activeTabId)?.page} 
                    onClose={() => setIsHelpOpen(false)} 
                />
            )}

        </div>
        </ErrorBoundary>
    );
};

export default App;
