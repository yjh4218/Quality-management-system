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

    // 2. 📋 전자결재 관리
    {
        key: 'approvalPending',
        category: '📋 전자결재 관리',
        label: '결재 대기함',
        icon: '⏳',
        path: 'approvalPending',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'approvalSubmitted',
        category: '📋 전자결재 관리',
        label: '기안 문서함',
        icon: '📤',
        path: 'approvalSubmitted',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'approvalInProgress',
        category: '📋 전자결재 관리',
        label: '진행 중 문서',
        icon: '🔄',
        path: 'approvalInProgress',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'approvalCompleted',
        category: '📋 전자결재 관리',
        label: '결재 완료함',
        icon: '✅',
        path: 'approvalCompleted',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'approvalRejected',
        category: '📋 전자결재 관리',
        label: '반려 문서함',
        icon: '❌',
        path: 'approvalRejected',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'approvalReference',
        category: '📋 전자결재 관리',
        label: '참조 문서함',
        icon: '👀',
        path: 'approvalReference',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'approvalHistory',
        category: '📋 전자결재 관리',
        label: '내 결재 내역',
        icon: '📜',
        path: 'approvalHistory',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'approvalDocTypes',
        category: '📋 전자결재 관리',
        label: '결재 문서유형 관리',
        icon: '📑',
        path: 'approvalDocTypes',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'approvalTemplates',
        category: '📋 전자결재 관리',
        label: '결재선 템플릿 빌더',
        icon: '📐',
        path: 'approvalTemplates',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'approvalNotificationRules',
        category: '📋 전자결재 관리',
        label: '결재 알림 설정',
        icon: '🔔',
        path: 'approvalNotificationRules',
        actions: ['VIEW', 'EDIT']
    },

    // 3. 🛠️ 시스템 관리
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
    {
        key: 'menuManagement',
        category: '🛠️ 시스템 관리',
        label: '화면 및 메뉴 관리',
        icon: '📁',
        path: 'menuManagement',
        actions: ['VIEW', 'EDIT', 'DELETE']
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
        key: 'productBomInquiry',
        category: '📦 품목코드 관리',
        label: '제품코드별 포장재 조회',
        icon: '📦',
        path: 'productBomInquiry',
        actions: ['VIEW']
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
        key: 'spaceRatioCalculator',
        category: '📦 포장재 관리',
        label: '포장공간비율 계산기',
        icon: '📐',
        path: 'spaceRatioCalculator',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'outboxCalculator',
        category: '📦 포장재 관리',
        label: '아웃박스 규격 계산기',
        icon: '📦',
        path: 'outboxCalculator',
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
    },
    {
        key: 'dynScreenClaim',
        category: '⚠️ CX 클레임 관리',
        label: 'CX 클레임 관리 (동적 화면)',
        icon: '🔍',
        path: 'dynScreenClaim',
        actions: ['VIEW', 'EDIT']
    },

    // 10. ⚙️ 추가 등록 관리
    {
        key: 'approvals',
        category: '📋 전자결재 관리',
        label: '전자결재 통합함',
        icon: '📋',
        path: 'approvals',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'documentTypeConfig',
        category: '📸 생산감리 관리',
        label: '품질서류 유형 설정',
        icon: '📑',
        path: 'documentTypeConfig',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'channelNoteConfig',
        category: '📦 품목코드 관리',
        label: '채널별 특이사항 설정',
        icon: '📝',
        path: 'channelNoteConfig',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'dynScreenProduct',
        category: '📦 품목코드 관리',
        label: '제품코드 관리 (동적 화면)',
        icon: '📦',
        path: 'dynScreenProduct',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'systemBenchmark',
        category: '🛠️ 시스템 관리',
        label: '시스템 벤치마크',
        icon: '⚡',
        path: 'systemBenchmark',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'screenPositionManagement',
        category: '🛠️ 시스템 관리',
        label: '화면 위치 관리',
        icon: '🗂️',
        path: 'screenPositionManagement',
        actions: ['VIEW', 'EDIT']
    },

    // 11. 📖 표준 업무 매뉴얼 (SOP)
    {
        key: 'sopManual',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '표준 품질경영 매뉴얼 (SOP)',
        icon: '📑',
        path: 'sopManual',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'regulatoryGuide',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '규제 표준 가이드 (ISO 13485/22716)',
        icon: '⚖️',
        path: 'regulatoryGuide',
        actions: ['VIEW', 'EDIT']
    },
    {
        key: 'controlledDocuments',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '통제문서 및 개정관리 (DMS)',
        icon: '📂',
        path: 'controlledDocuments',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'trainingManagement',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '교육훈련 및 자격관리',
        icon: '🎓',
        path: 'trainingManagement',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'riskManagement',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '위험관리 (ISO 14971)',
        icon: '⚠️',
        path: 'riskManagement',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'designControls',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '설계개발 및 DHF (ISO 13485)',
        icon: '📐',
        path: 'designControls',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'changeControl',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '변경관리 (ISO 13485/22716)',
        icon: '🔄',
        path: 'changeControl',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'supplierManagement',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '공급업체·위탁제조 관리 (ISO 13485/22716)',
        icon: '🏭',
        path: 'supplierManagement',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'traceabilityManagement',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '외부연계 및 추적성 (ISO 13485/22716)',
        icon: '🌐',
        path: 'traceabilityManagement',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'ncrManagement',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '부적합품 관리 및 출하승인 (NCR)',
        icon: '⚠️',
        path: 'ncrManagement',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'complaintSafetyManagement',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '불만·이상사례 평가 (ISO 13485/식약처)',
        icon: '🩺',
        path: 'complaintSafetyManagement',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'capaManagement',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '시정 및 예방조치 (CAPA)',
        icon: '🛡️',
        path: 'capaManagement',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'vigilanceRecallManagement',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '규제보고 및 회수 (Vigilance/Recall)',
        icon: '🚨',
        path: 'vigilanceRecallManagement',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'facilityManagement',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '시설·교정·유지보수 (ISO 13485/22716)',
        icon: '🛠️',
        path: 'facilityManagement',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'internalAuditManagement',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '내부심사·경영검토 (ISO 13485/22716)',
        icon: '📋',
        path: 'internalAuditManagement',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'officialRecords',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: '공식 원본·전자서명 (DEC-01/Part 11)',
        icon: '📜',
        path: 'officialRecords',
        actions: ['VIEW', 'EDIT', 'DELETE']
    },
    {
        key: 'csvValidation',
        category: '📖 표준 업무 매뉴얼 (SOP)',
        label: 'CSV 밸리데이션·Go-Live (GAMP 5)',
        icon: '🛡️',
        path: 'csvValidation',
        actions: ['VIEW', 'EDIT', 'DELETE']
    }
];

export default MENU_REGISTRY;
