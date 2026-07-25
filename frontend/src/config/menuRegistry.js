/**
 * QMS Single Source of Truth Menu Registry
 * 메뉴 구조, 사이드바 라벨, 라우트 키, 권한(RBAC) 액션 통합 명세서
 */

export const MENU_REGISTRY = [
    // 1. 📊 현황 모니터링
    {
        key: 'dashboard',
        category: '📊 현황 모니터링',
        label: '시스템 대시보드',
        icon: '📊',
        path: 'dashboard',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'announcements',
        category: '📊 현황 모니터링',
        label: '전체공지',
        icon: '📢',
        path: 'announcements',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'notifications',
        category: '📊 현황 모니터링',
        label: '수신 알림 확인',
        icon: '🔔',
        path: 'notifications',
        actions: ['VIEW']
    },

    // 2. 🛠️ 시스템 관리
    {
        key: 'users',
        category: '🛠️ 시스템 관리',
        label: '사용자 승인 관리',
        icon: '👥',
        path: 'users',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'roles',
        category: '🛠️ 시스템 관리',
        label: '권한 관리',
        icon: '🔐',
        path: 'roles',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'accessLogs',
        category: '🛠️ 시스템 관리',
        label: '사용자 접근 로그',
        icon: '🕒',
        path: 'accessLogs',
        actions: ['VIEW']
    },
    {
        key: 'logs',
        category: '🛠️ 시스템 관리',
        label: '시스템 변경 이력',
        icon: '📜',
        path: 'logs',
        actions: ['VIEW']
    },
    {
        key: 'bugReports',
        category: '🛠️ 시스템 관리',
        label: '버그 리포트 관리',
        icon: '🐞',
        path: 'bugReports',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'guideManagement',
        category: '🛠️ 시스템 관리',
        label: '가이드 관리',
        icon: '📖',
        path: 'guideManagement',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'dashboardMgmt',
        category: '🛠️ 시스템 관리',
        label: '대시보드 제작/관리',
        icon: '🎨',
        path: 'dashboardMgmt',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'trashBin',
        category: '🛠️ 시스템 관리',
        label: '데이터 복구 (휴지통)',
        icon: '🗑️',
        path: 'trashBin',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'mailTemplates',
        category: '🛠️ 시스템 관리',
        label: '제조사 전달 메일 관리',
        icon: '📧',
        path: 'mailTemplates',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'notificationSettings',
        category: '🛠️ 시스템 관리',
        label: '알림 설정 관리',
        icon: '🔔',
        path: 'notificationSettings',
        actions: ['VIEW', 'EDIT']
    },

    // 3. 📦 품목코드 관리
    {
        key: 'products',
        category: '📦 품목코드 관리',
        label: '제품코드 마스터',
        icon: '📦',
        path: 'products',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'productDashboard',
        category: '📦 품목코드 관리',
        label: '제품코드 대시보드',
        icon: '📊',
        path: 'productDashboard',
        actions: ['VIEW']
    },
    {
        key: 'brands',
        category: '📦 품목코드 관리',
        label: '브랜드 마스터 관리',
        icon: '🏷️',
        path: 'brands',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'salesChannels',
        category: '📦 품목코드 관리',
        label: '유통 채널 관리',
        icon: '🌐',
        path: 'salesChannels',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'ingredientCompliance',
        category: '📦 품목코드 관리',
        label: '성분 안전성 검토 (Global Compliance)',
        icon: '🧪',
        path: 'ingredientCompliance',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'bomMaster',
        category: '📦 품목코드 관리',
        label: '구성품 BOM 마스터 관리',
        icon: '📏',
        path: 'bomMaster',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'bomCategories',
        category: '📦 품목코드 관리',
        label: 'BOM 유형 설정/관리',
        icon: '⚙️',
        path: 'bomCategories',
        actions: ['VIEW', 'EDIT']
    },

    // 4. 🏭 제조사 등록 관리
    {
        key: 'manufacturers',
        category: '🏭 제조사 등록 관리',
        label: '제조사 정보 관리',
        icon: '🏭',
        path: 'manufacturers',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'manufacturerCategories',
        category: '🏭 제조사 등록 관리',
        label: '제조사 구분 관리',
        icon: '📂',
        path: 'manufacturerCategories',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'manufacturerGuide',
        category: '🏭 제조사 등록 관리',
        label: '제조사 협업 가이드',
        icon: '🤝',
        path: 'manufacturerGuide',
        actions: ['VIEW']
    },

    // 5. 📝 Audit 관리
    {
        key: 'manufacturerAudits',
        category: '📝 Audit 관리',
        label: '제조사 Audit 관리',
        icon: '📝',
        path: 'manufacturerAudits',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'manufacturerAuditDashboard',
        category: '📝 Audit 관리',
        label: '제조사 Audit 대시보드',
        icon: '📊',
        path: 'manufacturerAuditDashboard',
        actions: ['VIEW']
    },
    {
        key: 'manufacturerAuditItems',
        category: '📝 Audit 관리',
        label: '제조사 점검항목 관리',
        icon: '📋',
        path: 'manufacturerAuditItems',
        actions: ['VIEW', 'EDIT']
    },

    // 6. 📸 생산감리 관리
    {
        key: 'qualityPhotoAudit',
        category: '📸 생산감리 관리',
        label: '신제품 생산감리 (사진감리)',
        icon: '📸',
        path: 'qualityPhotoAudit',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'productionAuditDashboard',
        category: '📸 생산감리 관리',
        label: '생산감리 대시보드',
        icon: '📊',
        path: 'productionAuditDashboard',
        actions: ['VIEW']
    },
    {
        key: 'documentRequests',
        category: '📸 생산감리 관리',
        label: '필수 품질서류 관리',
        icon: '📋',
        path: 'documentRequests',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },

    // 7. 📦 포장재 관리
    {
        key: 'packagingTemplates',
        category: '📦 포장재 관리',
        label: '포장공정 템플릿 관리',
        icon: '📋',
        path: 'packagingTemplates',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'packagingRules',
        category: '📦 포장재 관리',
        label: '채널별 포장 규칙 관리',
        icon: '⚖️',
        path: 'packagingRules',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'spaceRatioCalculator',
        category: '📦 포장재 관리',
        label: '포장공간비율 계산기',
        icon: '📐',
        path: 'spaceRatioCalculator',
        actions: ['VIEW', 'EDIT']
    },

    // 8. 🚚 입고검사 관리
    {
        key: 'qualityDashboard',
        category: '🚚 입고검사 관리',
        label: '입고 품질 검사 대시보드',
        icon: '🚚',
        path: 'qualityDashboard',
        actions: ['VIEW']
    },
    {
        key: 'quality',
        category: '🚚 입고검사 관리',
        label: '입고 품질 관리',
        icon: '📦',
        path: 'quality',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'releaseRecord',
        category: '🚚 입고검사 관리',
        label: '시장출하 적부판정 기록',
        icon: '📄',
        path: 'releaseRecord',
        actions: ['VIEW', 'EDIT']
    },

    // 9. ⚠️ CX 클레임 관리
    {
        key: 'claims',
        category: '⚠️ CX 클레임 관리',
        label: '클레임 조회 및 입력',
        icon: '🔍',
        path: 'claims',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'claimDashboard',
        category: '⚠️ CX 클레임 관리',
        label: '클레임 대시보드',
        icon: '📈',
        path: 'claimDashboard',
        actions: ['VIEW']
    },
    {
        key: 'lotPpmDashboard',
        category: '⚠️ CX 클레임 관리',
        label: 'LOT PPM 분석 & 근본원인',
        icon: '📉',
        path: 'lotPpmDashboard',
        actions: ['VIEW']
    }
];

export default MENU_REGISTRY;
