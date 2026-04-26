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

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [navigationData, setNavigationData] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false); 
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // [고도화 1] 사이드바 그룹 열림/닫힘 상태 관리
    const [openSections, setOpenSections] = useState({
        system: true,
        quality: true,
        claim: true,
        master: true,
        category: false
    });

    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
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
            if (!currentPage || currentPage === 'login') setCurrentPage('dashboard');
        } catch (err) {
            setIsLoggedIn(false);
        }
    };

    const handleNavigate = (page, data = null) => {
        setCurrentPage(page);
        setNavigationData(data);
        setIsMobileMenuOpen(false); // Close menu after navigation on mobile
    };

    const clearNavigationData = () => {
        setNavigationData(null);
    };

    const handleLoginSuccess = () => {
        fetchUser();
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setUser(null);
        setCurrentPage('dashboard');
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
        switch(section) {
            case 'system': return ['dashboard', 'users', 'logs', 'roles', 'guideManagement', 'dashboardMgmt', 'trashBin'].includes(currentPage);
            case 'category': return ['brands', 'manufacturers', 'salesChannels'].includes(currentPage);
            case 'master': return ['products', 'bomMaster', 'bomCategories', 'packagingTemplates', 'packagingRules'].includes(currentPage);
            case 'quality': return ['quality', 'releaseRecord', 'qualityPhotoAudit'].includes(currentPage);
            case 'claim': return ['claims', 'claimDashboard'].includes(currentPage);
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
                                    <button className={`sidebar-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
                                        📊 시스템 대시보드
                                    </button>
                                )}
                                {canAccess('users') && (
                                    <button className={`sidebar-item ${currentPage === 'users' ? 'active' : ''}`} onClick={() => setCurrentPage('users')}>
                                        👥 사용자 승인 관리
                                    </button>
                                )}
                                {canAccess('logs') && (
                                    <button className={`sidebar-item ${currentPage === 'logs' ? 'active' : ''}`} onClick={() => setCurrentPage('logs')}>
                                        📜 시스템 변경 이력
                                    </button>
                                )}
                                {canAccess('roles') && (
                                    <button className={`sidebar-item ${currentPage === 'roles' ? 'active' : ''}`} onClick={() => setCurrentPage('roles')}>
                                        🔐 권한 관리
                                    </button>
                                )}
                                {canAccess('guideManagement') && (
                                    <button className={`sidebar-item ${currentPage === 'guideManagement' ? 'active' : ''}`} onClick={() => setCurrentPage('guideManagement')}>
                                        📖 가이드 관리
                                    </button>
                                )}
                                {canAccess('dashboardMgmt') && (
                                    <button className={`sidebar-item ${currentPage === 'dashboardMgmt' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboardMgmt')}>
                                        🎨 대시보드 제작/관리
                                    </button>
                                )}
                                {canAccess('trashBin') && (
                                    <button className={`sidebar-item ${currentPage === 'trashBin' ? 'active' : ''}`} onClick={() => setCurrentPage('trashBin')}>
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
                                    <button className={`sidebar-item ${currentPage === 'brands' ? 'active' : ''}`} onClick={() => setCurrentPage('brands')}>
                                        🏷️ 브랜드 마스터 관리
                                    </button>
                                )}
                                {canAccess('manufacturers') && (
                                    <button className={`sidebar-item ${currentPage === 'manufacturers' ? 'active' : ''}`} onClick={() => setCurrentPage('manufacturers')}>
                                        🏭 제조사 정보 관리
                                    </button>
                                )}
                                {canAccess('salesChannels') && (
                                    <button className={`sidebar-item ${currentPage === 'salesChannels' ? 'active' : ''}`} onClick={() => setCurrentPage('salesChannels')}>
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
                                    <button className={`sidebar-item ${currentPage === 'products' ? 'active' : ''}`} onClick={() => setCurrentPage('products')}>
                                        📦 제품코드 마스터
                                    </button>
                                )}
                                {canAccess('bomMaster') && (
                                    <button className={`sidebar-item ${currentPage === 'bomMaster' ? 'active' : ''}`} onClick={() => setCurrentPage('bomMaster')}>
                                        📏 구성품 BOM 마스터 관리
                                    </button>
                                )}
                                {canAccess('bomCategories') && (
                                    <button className={`sidebar-item ${currentPage === 'bomCategories' ? 'active' : ''}`} onClick={() => setCurrentPage('bomCategories')}>
                                        ⚙️ BOM 유형 설정/관리
                                    </button>
                                )}
                                {canAccess('packagingTemplates') && (
                                    <button className={`sidebar-item ${currentPage === 'packagingTemplates' ? 'active' : ''}`} onClick={() => setCurrentPage('packagingTemplates')}>
                                        📋 포장공정 템플릿 관리
                                    </button>
                                )}
                                {canAccess('packagingRules') && (
                                    <button className={`sidebar-item ${currentPage === 'packagingRules' ? 'active' : ''}`} onClick={() => setCurrentPage('packagingRules')}>
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
                                    <button className={`sidebar-item ${currentPage === 'quality' ? 'active' : ''}`} onClick={() => setCurrentPage('quality')}>
                                        📦 입고 품질 관리
                                    </button>
                                )}
                                {canAccess('releaseRecord') && (
                                    <button className={`sidebar-item ${currentPage === 'releaseRecord' ? 'active' : ''}`} onClick={() => setCurrentPage('releaseRecord')}>
                                        📄 시장출하 적부판정 기록
                                    </button>
                                )}
                                {canAccess('qualityPhotoAudit') && (
                                    <button className={`sidebar-item ${currentPage === 'qualityPhotoAudit' ? 'active' : ''}`} onClick={() => setCurrentPage('qualityPhotoAudit')}>
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
                                    <button className={`sidebar-item ${currentPage === 'claims' ? 'active' : ''}`} onClick={() => setCurrentPage('claims')}>
                                        🔍 클레임 조회 및 입력
                                    </button>
                                )}
                                {canAccess('claimDashboard') && (
                                    <button className={`sidebar-item ${currentPage === 'claimDashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('claimDashboard')}>
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
                {currentPage === 'users' && (
                    <UserManagementPage 
                        user={user}
                        navigationData={navigationData} 
                        onNavigated={clearNavigationData} 
                    />
                )}
                {currentPage === 'logs' && <LogManagementPage user={user} />}
                {currentPage === 'roles' && <RoleManagementPage user={user} />}
                {canAccess('guideManagement') && currentPage === 'guideManagement' && <GuideManagementPage user={user} />}
                {canAccess('dashboardMgmt') && currentPage === 'dashboardMgmt' && <DashboardManagementPage user={user} />}
                {currentPage === 'brands' && <BrandManagementPage user={user} />}
                {currentPage === 'manufacturers' && <ManufacturerManagementPage user={user} />}
                {currentPage === 'salesChannels' && <SalesChannelManagement user={user} />}
                {currentPage === 'products' && (
                    <ProductListPage 
                        user={user} 
                        navigationData={navigationData} 
                        onNavigated={clearNavigationData} 
                    />
                )}
                {currentPage === 'quality' && (
                    <QualityManagementPage 
                        user={user} 
                        navigationData={navigationData} 
                        onNavigated={clearNavigationData} 
                    />
                )}
                {canAccess('releaseRecord') && currentPage === 'releaseRecord' && (
                    <MarketReleaseRecordPage user={user} />
                )}
                {canAccess('qualityPhotoAudit') && currentPage === 'qualityPhotoAudit' && <ProductionAuditPage user={user} />}
                {currentPage === 'dashboard' && (
                    <DashboardPage 
                        user={user} 
                        onNavigate={handleNavigate} 
                    />
                )}
                {currentPage === 'claims' && (
                    <ClaimManagementPage 
                        user={user} 
                        navigationData={navigationData}
                        onNavigated={clearNavigationData}
                        onNavigate={handleNavigate}
                    />
                )}
                {currentPage === 'claimDashboard' && (
                    <ClaimDashboardPage 
                        user={user}
                        onNavigate={handleNavigate}
                    />
                )}
                {currentPage === 'bomMaster' && <BomMasterPage user={user} />}
                {currentPage === 'bomCategories' && <BomCategoryManagementPage user={user} />}
                {currentPage === 'packagingTemplates' && <PackagingTemplatePage user={user} />}
                {currentPage === 'packagingRules' && <PackagingRulePage user={user} />}
                {canAccess('trashBin') && currentPage === 'trashBin' && <TrashBinPage user={user} />}
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
                    currentPage={currentPage} 
                    onClose={() => setIsHelpOpen(false)} 
                />
            )}
        </div>
    );
};

export default App;
