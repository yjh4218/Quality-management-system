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
import HelpCenterModal from './components/HelpCenterModal';
import ProfileModal from './ProfileModal';
import { getCurrentUser } from './api';

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
    claimDashboard: { title: '📈 클레임 대시보드' }
};

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
        category: false,
        master: false,
        quality: false,
        claim: false
    });

    const toggleSection = (section) => {
        setOpenSections(prev => {
            const isOpening = !prev[section];
            if (isOpening) {
                // Close all other sections
                return {
                    system: false,
                    category: false,
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

    const handleLogout = () => {
        setIsLoggedIn(false);
        setUser(null);
        setTabs([{ id: 'dashboard', page: 'dashboard', title: '📊 시스템 대시보드', data: null }]);
        setActiveTabId('dashboard');
        setIsMobileMenuOpen(false);
    };

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

    const hasSystemAccess = canAccess('dashboard') || canAccess('users') || canAccess('logs') || canAccess('roles') || canAccess('guideManagement') || canAccess('dashboardMgmt') || canAccess('trashBin');
    const hasCategoryAccess = canAccess('brands') || canAccess('manufacturers') || canAccess('salesChannels');
    const hasMasterAccess = canAccess('products') || canAccess('bomMaster') || canAccess('bomCategories') || canAccess('packagingTemplates') || canAccess('packagingRules');
    const hasQualityAccess = canAccess('quality') || canAccess('releaseRecord') || canAccess('qualityPhotoAudit');
    const hasClaimAccess = canAccess('claims') || canAccess('claimDashboard');

    // [고도화 5] 현재 활성화된 섹션 판단 로직
    const isSectionActive = (section) => {
        const activePage = tabs.find(t => t.id === activeTabId)?.page;
        switch(section) {
            case 'system': return ['dashboard', 'users', 'logs', 'roles', 'guideManagement', 'dashboardMgmt', 'trashBin'].includes(activePage);
            case 'category': return ['brands', 'manufacturers', 'salesChannels'].includes(activePage);
            case 'master': return ['products', 'bomMaster', 'bomCategories', 'packagingTemplates', 'packagingRules'].includes(activePage);
            case 'quality': return ['quality', 'releaseRecord', 'qualityPhotoAudit'].includes(activePage);
            case 'claim': return ['claims', 'claimDashboard'].includes(activePage);
            default: return false;
        }
    };

    return (
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
                                {canAccess('dashboard') && (
                                    <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavigate('dashboard')}>
                                        📊 시스템 대시보드
                                    </button>
                                )}
                                {canAccess('users') && (
                                    <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'users' ? 'active' : ''}`} onClick={() => handleNavigate('users')}>
                                        👥 사용자 승인 관리
                                    </button>
                                )}
                                {canAccess('logs') && (
                                    <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'logs' ? 'active' : ''}`} onClick={() => handleNavigate('logs')}>
                                        📜 시스템 변경 이력
                                    </button>
                                )}
                                {canAccess('roles') && (
                                    <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'roles' ? 'active' : ''}`} onClick={() => handleNavigate('roles')}>
                                        🔐 권한 관리
                                    </button>
                                )}
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
                            </div>
                        )}
                    </div>
                    )}

                    {/* [카테고리 관리] */}
                    {hasCategoryAccess && (
                    <div className="sidebar-group">
                        <button 
                            className={`sidebar-group-header ${isSectionActive('category') ? 'active' : ''}`} 
                            onClick={() => toggleSection('category')}
                        >
                            <span>📁 카테고리 관리</span>
                            <span className={`arrow ${openSections.category ? 'open' : ''}`}>▼</span>
                        </button>
                        {openSections.category && (
                            <div className="sidebar-group-content">
                                {canAccess('brands') && (
                                    <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'brands' ? 'active' : ''}`} onClick={() => handleNavigate('brands')}>
                                        🏷️ 브랜드 마스터 관리
                                    </button>
                                )}
                                {canAccess('manufacturers') && (
                                    <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'manufacturers' ? 'active' : ''}`} onClick={() => handleNavigate('manufacturers')}>
                                        🏭 제조사 정보 관리
                                    </button>
                                )}
                                {canAccess('salesChannels') && (
                                    <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'salesChannels' ? 'active' : ''}`} onClick={() => handleNavigate('salesChannels')}>
                                        🌐 유통 채널 관리
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    )}

                    {/* [기준 정보 관리] */}
                    {hasMasterAccess && (
                    <div className="sidebar-group">
                        <button 
                            className={`sidebar-group-header ${isSectionActive('master') ? 'active' : ''}`} 
                            onClick={() => toggleSection('master')}
                        >
                            <span>🧱 기준 정보 관리</span>
                            <span className={`arrow ${openSections.master ? 'open' : ''}`}>▼</span>
                        </button>
                        {openSections.master && (
                            <div className="sidebar-group-content">
                                {canAccess('products') && (
                                    <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'products' ? 'active' : ''}`} onClick={() => handleNavigate('products')}>
                                        📦 제품코드 마스터
                                    </button>
                                )}
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
                            </div>
                        )}
                    </div>
                    )}

                    {/* [품질 운영 관리] */}
                    {hasQualityAccess && (
                    <div className="sidebar-group">
                        <button 
                            className={`sidebar-group-header ${isSectionActive('quality') ? 'active' : ''}`} 
                            onClick={() => toggleSection('quality')}
                        >
                            <span>⚖️ 품질 운영 관리</span>
                            <span className={`arrow ${openSections.quality ? 'open' : ''}`}>▼</span>
                        </button>
                        {openSections.quality && (
                            <div className="sidebar-group-content">
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
                                {canAccess('qualityPhotoAudit') && (
                                    <button className={`sidebar-item ${tabs.find(t => t.id === activeTabId)?.page === 'qualityPhotoAudit' ? 'active' : ''}`} onClick={() => handleNavigate('qualityPhotoAudit')}>
                                        📸 신제품 생산감리 (사진감리)
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    )}

                    {/* [클레임 관리] */}
                    {hasClaimAccess && (
                    <div className="sidebar-group">
                        <button 
                            className={`sidebar-group-header ${isSectionActive('claim') ? 'active' : ''}`} 
                            onClick={() => toggleSection('claim')}
                        >
                            <span>⚠️ 클레임 관리</span>
                            <span className={`arrow ${openSections.claim ? 'open' : ''}`}>▼</span>
                        </button>
                        {openSections.claim && (
                            <div className="sidebar-group-content">
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
                <div className="tab-bar">
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
                                {tab.page === 'users' && (
                                    <UserManagementPage 
                                        user={user}
                                        navigationData={tab.data} 
                                        onNavigated={() => {}} // No-op as data is stored in tab
                                    />
                                )}
                                {tab.page === 'logs' && <LogManagementPage user={user} />}
                                {tab.page === 'roles' && <RoleManagementPage user={user} />}
                                {canAccess('guideManagement') && tab.page === 'guideManagement' && <GuideManagementPage user={user} />}
                                {canAccess('dashboardMgmt') && tab.page === 'dashboardMgmt' && <DashboardManagementPage user={user} />}
                                {tab.page === 'brands' && <BrandManagementPage user={user} />}
                                {tab.page === 'manufacturers' && <ManufacturerManagementPage user={user} />}
                                {tab.page === 'salesChannels' && <SalesChannelManagement user={user} />}
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
                                {canAccess('trashBin') && tab.page === 'trashBin' && <TrashBinPage user={user} />}
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
    );
};

export default App;
