-- V104__seed_system_page_guides.sql
-- Seed comprehensive user guides for all 39 QMS screens (ANSI SQL H2 / PostgreSQL compatible)

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'dashboard', '📊 시스템 대시보드 가이드', '[{"subtitle":"위젯 기반 요약 정보","content":"오늘의 주요 품질 현황 및 업무 알림을 한눈에 파악할 수 있는 통합 대시보드입니다. 관리자가 설정한 권한별 템플릿 레이아웃에 맞춰 개인화된 위젯이 제공됩니다."},{"subtitle":"인입 내역 확인 및 빠른 이동 (Deep Link)","content":"클레임 미처리, 신규 생산감리 접수, 입고 대기 내역 등을 클릭하면 해당 전용 관리 화면으로 즉시 이동하여 신속하게 업무를 처리할 수 있습니다."}]', '위젯 기반 요약 정보: 오늘의 주요 품질 현황 및 업무 알림을 한눈에 파악할 수 있는 통합 대시보드입니다. 관리자가 설정한 권한별 템플릿 레이아웃에 맞춰 개인화된 위젯이 제공됩니다.

인입 내역 확인 및 빠른 이동 (Deep Link): 클레임 미처리, 신규 생산감리 접수, 입고 대기 내역 등을 클릭하면 해당 전용 관리 화면으로 즉시 이동하여 신속하게 업무를 처리할 수 있습니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'dashboard');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'notifications', '🔔 수신 알림 확인 가이드', '[{"subtitle":"실시간 업무 변경 알림 수신","content":"클레임 접수 및 상태 변경, 생산감리 검토 요청, 사용자 가입 승인 등 시스템 내에서 나에게 할당되거나 확인해야 할 모든 알림 이력을 실시간으로 확인합니다."},{"subtitle":"다중 키워드 검색 및 일괄 읽음 처리","content":"전체/미확인/확인완료 탭 필터와 함께 쉼표(,) 및 띄어쓰기 기반 다중 단어 AND 검색을 지원하며, 한 번의 클릭으로 모든 알림을 확인 완료 처리할 수 있습니다."}]', '실시간 업무 변경 알림 수신: 클레임 접수 및 상태 변경, 생산감리 검토 요청, 사용자 가입 승인 등 시스템 내에서 나에게 할당되거나 확인해야 할 모든 알림 이력을 실시간으로 확인합니다.

다중 키워드 검색 및 일괄 읽음 처리: 전체/미확인/확인완료 탭 필터와 함께 쉼표(,) 및 띄어쓰기 기반 다중 단어 AND 검색을 지원하며, 한 번의 클릭으로 모든 알림을 확인 완료 처리할 수 있습니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'notifications');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'users', '👥 사용자 승인 및 권한 관리 가이드', '[{"subtitle":"신규 가입 계정 검토 및 승인","content":"신규 가입 신청한 사용자의 소속(더파운더즈/제조사)과 부서, 연락처를 확인하고 계정 활성화(승인) 또는 차단을 제어합니다."},{"subtitle":"역할(Role) 할당 및 시스템 접근 통제","content":"관리자(ROLE_ADMIN), 품질팀(ROLE_QUALITY), 제조사(ROLE_MANUFACTURER) 등 정밀한 접근 제어(RBAC) 역할을 부여하여 보안을 유지합니다."}]', '신규 가입 계정 검토 및 승인: 신규 가입 신청한 사용자의 소속(더파운더즈/제조사)과 부서, 연락처를 확인하고 계정 활성화(승인) 또는 차단을 제어합니다.

역할(Role) 할당 및 시스템 접근 통제: 관리자(ROLE_ADMIN), 품질팀(ROLE_QUALITY), 제조사(ROLE_MANUFACTURER) 등 정밀한 접근 제어(RBAC) 역할을 부여하여 보안을 유지합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'users');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'logs', '📜 시스템 변경 이력 (Audit Trail) 가이드', '[{"subtitle":"전사 데이터 변경 추적성 확보","content":"제품 마스터, 포장 사양, 클레임, 제조사 등 주요 엔티티의 생성, 수정, 삭제(Soft Delete) 작업 이력을 시간대별로 완벽히 기록합니다."},{"subtitle":"변경 전/후 데이터 비교","content":"어떤 사용자가 언제 어느 항목의 데이터를 어떻게 변경했는지 상세 변경 JSON을 대조하여 감사 추적성을 제공합니다."}]', '전사 데이터 변경 추적성 확보: 제품 마스터, 포장 사양, 클레임, 제조사 등 주요 엔티티의 생성, 수정, 삭제(Soft Delete) 작업 이력을 시간대별로 완벽히 기록합니다.

변경 전/후 데이터 비교: 어떤 사용자가 언제 어느 항목의 데이터를 어떻게 변경했는지 상세 변경 JSON을 대조하여 감사 추적성을 제공합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'logs');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'roles', '🔐 권한 및 레이아웃 관리 가이드', '[{"subtitle":"역할별 메뉴 접근 권한 매트릭스","content":"각 역할별로 시스템 내 39개 메뉴에 대한 조회(VIEW), 생성/수정(EDIT), 삭제(DELETE) 권한을 세부적으로 부여하고 제어합니다."},{"subtitle":"대시보드 레이아웃 템플릿 매핑","content":"해당 권한을 가진 사용자가 로그인했을 때 기본으로 노출될 맞춤형 대시보드 템플릿을 연결합니다."}]', '역할별 메뉴 접근 권한 매트릭스: 각 역할별로 시스템 내 39개 메뉴에 대한 조회(VIEW), 생성/수정(EDIT), 삭제(DELETE) 권한을 세부적으로 부여하고 제어합니다.

대시보드 레이아웃 템플릿 매핑: 해당 권한을 가진 사용자가 로그인했을 때 기본으로 노출될 맞춤형 대시보드 템플릿을 연결합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'roles');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'guideManagement', '📖 사용자 가이드 마스터 관리 가이드', '[{"subtitle":"화면별 도움말 콘텐츠 중앙 관리","content":"시스템 내 39개 전체 화면의 도움말 제목과 섹션별 설명을 관리자가 직접 편집하고 업데이트할 수 있습니다."},{"subtitle":"배포 시드 및 실시간 반영","content":"작성된 가이드는 DB에 저장되어 각 화면의 [💡 사용 가이드] 팝업에 실시간으로 반영되며, 신규 배포 시 자동으로 안전하게 초기화/동기화됩니다."}]', '화면별 도움말 콘텐츠 중앙 관리: 시스템 내 39개 전체 화면의 도움말 제목과 섹션별 설명을 관리자가 직접 편집하고 업데이트할 수 있습니다.

배포 시드 및 실시간 반영: 작성된 가이드는 DB에 저장되어 각 화면의 [💡 사용 가이드] 팝업에 실시간으로 반영되며, 신규 배포 시 자동으로 안전하게 초기화/동기화됩니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'guideManagement');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'dashboardMgmt', '🎨 대시보드 템플릿 제작/관리 가이드', '[{"subtitle":"부서/역할별 대시보드 틀 구성","content":"경영진용, 품질관리팀용, 제조사용 등 업무 목적에 맞는 대시보드 템플릿을 신규 생성하고 관리합니다."},{"subtitle":"10종 이상의 위젯 자유 조합","content":"클레임 현황, 생산감리 타임라인, 입고 품질 합격률 등 다양한 시각화 위젯을 체크박스로 손쉽게 조합하여 템플릿을 구성합니다."}]', '부서/역할별 대시보드 틀 구성: 경영진용, 품질관리팀용, 제조사용 등 업무 목적에 맞는 대시보드 템플릿을 신규 생성하고 관리합니다.

10종 이상의 위젯 자유 조합: 클레임 현황, 생산감리 타임라인, 입고 품질 합격률 등 다양한 시각화 위젯을 체크박스로 손쉽게 조합하여 템플릿을 구성합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'dashboardMgmt');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'trashBin', '🗑️ 데이터 복구 (휴지통) 가이드', '[{"subtitle":"소프트 삭제(Soft Delete) 데이터 안전 보관","content":"실수로 삭제된 제품, BOM 부자재, 클레임, 제조사 등의 데이터를 영구 삭제하지 않고 안전하게 임시 보관합니다."},{"subtitle":"원클릭 복원 및 완전 삭제","content":"데이터 복구 버튼을 눌러 즉시 원래 상태로 원상 복구하거나, 불필요한 데이터를 선별하여 영구 파기할 수 있습니다."}]', '소프트 삭제(Soft Delete) 데이터 안전 보관: 실수로 삭제된 제품, BOM 부자재, 클레임, 제조사 등의 데이터를 영구 삭제하지 않고 안전하게 임시 보관합니다.

원클릭 복원 및 완전 삭제: 데이터 복구 버튼을 눌러 즉시 원래 상태로 원상 복구하거나, 불필요한 데이터를 선별하여 영구 파기할 수 있습니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'trashBin');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'brands', '🏷️ 브랜드 마스터 관리 가이드', '[{"subtitle":"사내 운영 브랜드 체계화","content":"아누아(ANUA) 등 사내에서 기획 및 유통하는 모든 브랜드 코드와 브랜드명을 등록하고 관리합니다."},{"subtitle":"품목 및 클레임 통계 연계","content":"등록된 브랜드 정보는 제품코드 마스터 생성 및 브랜드별 품질 통계 분석의 핵심 기준 데이터로 활용됩니다."}]', '사내 운영 브랜드 체계화: 아누아(ANUA) 등 사내에서 기획 및 유통하는 모든 브랜드 코드와 브랜드명을 등록하고 관리합니다.

품목 및 클레임 통계 연계: 등록된 브랜드 정보는 제품코드 마스터 생성 및 브랜드별 품질 통계 분석의 핵심 기준 데이터로 활용됩니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'brands');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'manufacturers', '🏭 제조사 정보 관리 가이드', '[{"subtitle":"협력 제조사 마스터 정보 관리","content":"제조사명, 사업자번호, 대표자, 품질/영업 담당자 연락처, 주소 및 시설 구분을 체계적으로 관리합니다."},{"subtitle":"제조사 계정 초대 및 포털 연동","content":"제조사별 전용 포털 계정 발급 및 보안 초대 토큰을 생성하여 감리 사진 제출 및 서류 등록을 지원합니다."}]', '협력 제조사 마스터 정보 관리: 제조사명, 사업자번호, 대표자, 품질/영업 담당자 연락처, 주소 및 시설 구분을 체계적으로 관리합니다.

제조사 계정 초대 및 포털 연동: 제조사별 전용 포털 계정 발급 및 보안 초대 토큰을 생성하여 감리 사진 제출 및 서류 등록을 지원합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'manufacturers');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'salesChannels', '🌐 유통 채널 마스터 관리 가이드', '[{"subtitle":"국내/글로벌 유통 채널 관리","content":"올리브영, 아마존, 큐텐, 라쿠텐, 코스트코 등 제품이 납품되는 국내외 유통 채널별 코드를 관리합니다."},{"subtitle":"채널별 포장/라벨 규격 매핑","content":"각 유통 채널에서 요구하는 바코드 표기법, 소비기한 날짜 포맷(YYYY-MM-DD 등), 아웃박스 테이핑/라벨 부착 규칙을 표준화합니다."}]', '국내/글로벌 유통 채널 관리: 올리브영, 아마존, 큐텐, 라쿠텐, 코스트코 등 제품이 납품되는 국내외 유통 채널별 코드를 관리합니다.

채널별 포장/라벨 규격 매핑: 각 유통 채널에서 요구하는 바코드 표기법, 소비기한 날짜 포맷(YYYY-MM-DD 등), 아웃박스 테이핑/라벨 부착 규칙을 표준화합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'salesChannels');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'channelNoteConfig', '⚙️ 유통 채널 포장 특이사항 설정 가이드', '[{"subtitle":"채널별 특수 포장 요구조건 템플릿","content":"아마존 FBA 바코드 라벨, 올리브영 전용 스티커, 코스트코 팔레트 적재 제한 등 채널별 포장 특이사항 항목을 마스터로 사전 정의합니다."},{"subtitle":"포장사양서 자동 불러오기","content":"제품별 포장사양서 작성 시 채널을 선택하면 사전에 등록된 특이사항 템플릿이 자동으로 로드되어 누락을 방지합니다."}]', '채널별 특수 포장 요구조건 템플릿: 아마존 FBA 바코드 라벨, 올리브영 전용 스티커, 코스트코 팔레트 적재 제한 등 채널별 포장 특이사항 항목을 마스터로 사전 정의합니다.

포장사양서 자동 불러오기: 제품별 포장사양서 작성 시 채널을 선택하면 사전에 등록된 특이사항 템플릿이 자동으로 로드되어 누락을 방지합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'channelNoteConfig');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'products', '📦 제품코드 마스터 관리 가이드', '[{"subtitle":"완제품 표준 정보 및 규격 통합 관리","content":"품목코드, 한글/영문 제품명, 브랜드, 규격(단상자/인박스/아웃박스), 바코드 정보를 종합 관리합니다."},{"subtitle":"3D 포장 시뮬레이션 및 포장사양서 연동","content":"제품 상세 Drawer에서 3D 포장 시뮬레이션을 통해 인박스 POP 마주보기, 아웃박스 입수, 팔레트 적재를 시뮬레이션하고 포장사양서 도면을 확정합니다."}]', '완제품 표준 정보 및 규격 통합 관리: 품목코드, 한글/영문 제품명, 브랜드, 규격(단상자/인박스/아웃박스), 바코드 정보를 종합 관리합니다.

3D 포장 시뮬레이션 및 포장사양서 연동: 제품 상세 Drawer에서 3D 포장 시뮬레이션을 통해 인박스 POP 마주보기, 아웃박스 입수, 팔레트 적재를 시뮬레이션하고 포장사양서 도면을 확정합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'products');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'bomMaster', '📏 BOM 마스터 관리 가이드', '[{"subtitle":"부자재(용기/캡/펌프/단상자 등) 표준화","content":"완제품에 투입되는 모든 1차/2차 부자재의 BOM 코드, 유형, 세부유형, 중량/규격, 재질, 제조사 정보를 관리합니다."},{"subtitle":"6대 항목 상호작용 및 다중 키워드 AND 검색","content":"BOM코드, 유형, 부자재명, 중량, 재질, 제조사 등 6개 필터 바를 활용해 쉼표(,) 및 띄어쓰기 다중 단어로 신속하고 정확하게 부자재를 검색합니다."}]', '부자재(용기/캡/펌프/단상자 등) 표준화: 완제품에 투입되는 모든 1차/2차 부자재의 BOM 코드, 유형, 세부유형, 중량/규격, 재질, 제조사 정보를 관리합니다.

6대 항목 상호작용 및 다중 키워드 AND 검색: BOM코드, 유형, 부자재명, 중량, 재질, 제조사 등 6개 필터 바를 활용해 쉼표(,) 및 띄어쓰기 다중 단어로 신속하고 정확하게 부자재를 검색합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'bomMaster');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'bomCategories', '⚙️ BOM 유형 및 세부분류 설정 가이드', '[{"subtitle":"부자재 대분류/중분류 카테고리 정의","content":"용기류, 캡·펌프류, 단상자류, 라벨류, 완충재류 등 부자재의 표준 유형 체계를 등록하고 정렬 순서를 지정합니다."},{"subtitle":"BOM 마스터 및 포장사양서 표준화","content":"여기서 정의된 유형 체계는 BOM 등록 및 포장사양서 부자재 구성 목록의 표준 선택 드롭다운으로 자동 연동됩니다."}]', '부자재 대분류/중분류 카테고리 정의: 용기류, 캡·펌프류, 단상자류, 라벨류, 완충재류 등 부자재의 표준 유형 체계를 등록하고 정렬 순서를 지정합니다.

BOM 마스터 및 포장사양서 표준화: 여기서 정의된 유형 체계는 BOM 등록 및 포장사양서 부자재 구성 목록의 표준 선택 드롭다운으로 자동 연동됩니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'bomCategories');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'packagingTemplates', '📋 포장공정 템플릿 관리 가이드', '[{"subtitle":"제품 형태별 표준 포장 프로세스 템플릿","content":"토너/앰플형, 크림 단지형, 마스크팩형, 튜브형 등 용기 형태별 표준 포장 공정 및 검사 기준을 템플릿으로 사전 구축합니다."},{"subtitle":"신제품 포장사양서 신속 작성","content":"신제품 개발 시 적합한 공정 템플릿을 원클릭으로 불러와 포장 구성품 및 작업 표준을 즉시 완성할 수 있습니다."}]', '제품 형태별 표준 포장 프로세스 템플릿: 토너/앰플형, 크림 단지형, 마스크팩형, 튜브형 등 용기 형태별 표준 포장 공정 및 검사 기준을 템플릿으로 사전 구축합니다.

신제품 포장사양서 신속 작성: 신제품 개발 시 적합한 공정 템플릿을 원클릭으로 불러와 포장 구성품 및 작업 표준을 즉시 완성할 수 있습니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'packagingTemplates');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'spaceRatioCalculator', '📐 포장공간비율 법령 계산기 가이드', '[{"subtitle":"자원의 절약과 재활용 촉진 법령 준수","content":"환경부 고시 기준에 따라 화장품 품목 유형별 법적 포장공간비율(10%~25% 이하) 및 포장횟수(1차~2차) 적합성을 실시간 계산합니다."},{"subtitle":"용기/단상자 체적 자동 비교 및 판정","content":"제품의 실제 치수와 받침판, 완충재 규격을 입력하여 즉시 [적합/부적합] 여부와 여유 공간을 판정합니다."}]', '자원의 절약과 재활용 촉진 법령 준수: 환경부 고시 기준에 따라 화장품 품목 유형별 법적 포장공간비율(10%~25% 이하) 및 포장횟수(1차~2차) 적합성을 실시간 계산합니다.

용기/단상자 체적 자동 비교 및 판정: 제품의 실제 치수와 받침판, 완충재 규격을 입력하여 즉시 [적합/부적합] 여부와 여유 공간을 판정합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'spaceRatioCalculator');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'outboxCalculator', '📦 아웃박스 규격 및 입수 계산기 가이드', '[{"subtitle":"최적 아웃박스 규격 역산출","content":"단상자 크기와 희망 입수량(예: 24개, 48개)을 입력하면 물류 및 적재에 가장 효율적인 골판지 아웃박스 치수를 자동 계산합니다."},{"subtitle":"공간 충진율 및 여유율 분석","content":"박스 내부 공차 및 여유 공간을 시각적으로 확인하여 과대포장 및 파손 위험을 사전에 방지합니다."}]', '최적 아웃박스 규격 역산출: 단상자 크기와 희망 입수량(예: 24개, 48개)을 입력하면 물류 및 적재에 가장 효율적인 골판지 아웃박스 치수를 자동 계산합니다.

공간 충진율 및 여유율 분석: 박스 내부 공차 및 여유 공간을 시각적으로 확인하여 과대포장 및 파손 위험을 사전에 방지합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'outboxCalculator');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'quality', '📦 입고 품질 및 COA 관리 가이드', '[{"subtitle":"완제품 물류센터 입고 검사","content":"생산 완료 후 물류센터로 입고되는 제품의 LOT별 성적서(COA), 외관, 수량, 바코드 인쇄 상태를 검사하여 합격/불합격을 판정합니다."},{"subtitle":"COA 성적서 파일 업로드 및 관리","content":"제조사에서 발행한 원본 시험성적서 PDF/이미지를 LOT별로 영구 아카이빙하여 품질 보증 체계를 유지합니다."}]', '완제품 물류센터 입고 검사: 생산 완료 후 물류센터로 입고되는 제품의 LOT별 성적서(COA), 외관, 수량, 바코드 인쇄 상태를 검사하여 합격/불합격을 판정합니다.

COA 성적서 파일 업로드 및 관리: 제조사에서 발행한 원본 시험성적서 PDF/이미지를 LOT별로 영구 아카이빙하여 품질 보증 체계를 유지합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'quality');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'releaseRecord', '📄 시장출하 기록 관리 가이드', '[{"subtitle":"화장품법 시장출하 규정 준수","content":"제조판매업자로서 제품을 국내외 유통 시장에 출하하기 전 필수 확인 사항(제조번호, 사용기한, 시험검사 결과 등)을 최종 기록합니다."},{"subtitle":"출하 승인 및 추적성 확보","content":"출하 적합 판정을 받은 제품 LOT만 유통 채널로 출고되도록 승인 이력을 전산 관리합니다."}]', '화장품법 시장출하 규정 준수: 제조판매업자로서 제품을 국내외 유통 시장에 출하하기 전 필수 확인 사항(제조번호, 사용기한, 시험검사 결과 등)을 최종 기록합니다.

출하 승인 및 추적성 확보: 출하 적합 판정을 받은 제품 LOT만 유통 채널로 출고되도록 승인 이력을 전산 관리합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'releaseRecord');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'qualityPhotoAudit', '📸 신제품 생산감리 관리 가이드', '[{"subtitle":"생산 라인 현장 사진 실시간 검토","content":"제조사 현장에서 초도 생산 시 촬영한 충진, 캡핑, 단상자 포장, LOT 마킹, 봉함 테이프 사진을 실시간으로 확인합니다."},{"subtitle":"품질팀 검토 및 승인/반려 워크플로우","content":"제출된 감리 데이터를 품질팀이 검토하여 적합 시 [승인], 이상 발견 시 보완 요청 [반려]를 처리하며 알림 메일을 자동 발송합니다."}]', '생산 라인 현장 사진 실시간 검토: 제조사 현장에서 초도 생산 시 촬영한 충진, 캡핑, 단상자 포장, LOT 마킹, 봉함 테이프 사진을 실시간으로 확인합니다.

품질팀 검토 및 승인/반려 워크플로우: 제출된 감리 데이터를 품질팀이 검토하여 적합 시 [승인], 이상 발견 시 보완 요청 [반려]를 처리하며 알림 메일을 자동 발송합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'qualityPhotoAudit');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'productionAuditDashboard', '📊 생산감리 현황 대시보드 가이드', '[{"subtitle":"전사 신제품 생산감리 진행 현황","content":"월별/브랜드별 감리 요청 건수, 승인율, 반려율, 제조사별 적기 제출률을 차트와 지표로 한눈에 모니터링합니다."},{"subtitle":"지연 감리 조기 경보","content":"생산 예정일 대비 감리 등록이 지연된 제조사 품목을 선별하여 즉시 대처할 수 있도록 지원합니다."}]', '전사 신제품 생산감리 진행 현황: 월별/브랜드별 감리 요청 건수, 승인율, 반려율, 제조사별 적기 제출률을 차트와 지표로 한눈에 모니터링합니다.

지연 감리 조기 경보: 생산 예정일 대비 감리 등록이 지연된 제조사 품목을 선별하여 즉시 대처할 수 있도록 지원합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'productionAuditDashboard');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'claims', '🔍 고객 클레임 접수 및 원인 분석 가이드', '[{"subtitle":"고객 및 채널 불량 클레임 접수","content":"소비자 또는 유통 채널에서 인입된 이물, 누액, 파손, 펌프 불량 등 클레임 내역을 사진과 함께 등록합니다."},{"subtitle":"제조사 귀책 판정 및 소명 관리","content":"클레임 품목의 LOT 번호를 기반으로 제조사를 자동 매핑하고, 제조사 소명서 접수 및 개선대책(CAPA)을 추적합니다."}]', '고객 및 채널 불량 클레임 접수: 소비자 또는 유통 채널에서 인입된 이물, 누액, 파손, 펌프 불량 등 클레임 내역을 사진과 함께 등록합니다.

제조사 귀책 판정 및 소명 관리: 클레임 품목의 LOT 번호를 기반으로 제조사를 자동 매핑하고, 제조사 소명서 접수 및 개선대책(CAPA)을 추적합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'claims');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'claimDashboard', '📈 고객 클레임 분석 대시보드 가이드', '[{"subtitle":"클레임 발생 추이 및 주요 불량 유형 분석","content":"월별 클레임 발생 건수, 불량 유형별 비중(파레토 차트), 브랜드별 클레임 점유율을 종합 시각화합니다."},{"subtitle":"개선 효과 측정","content":"품질 개선 대책 적용 전/후의 클레임 감소율을 정량적으로 평가합니다."}]', '클레임 발생 추이 및 주요 불량 유형 분석: 월별 클레임 발생 건수, 불량 유형별 비중(파레토 차트), 브랜드별 클레임 점유율을 종합 시각화합니다.

개선 효과 측정: 품질 개선 대책 적용 전/후의 클레임 감소율을 정량적으로 평가합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'claimDashboard');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'lotPpmDashboard', '📉 LOT PPM 분석 & 근본원인 가이드', '[{"subtitle":"LOT 생산량 대비 불량률(PPM) 정밀 산출","content":"각 LOT별 총 생산 수량 대비 클레임 발생 수량을 백만분율(PPM)로 환산하여 객관적인 품질 수준을 계량화합니다."},{"subtitle":"5-Why 및 근본원인(Root Cause) 분류","content":"원자재 불량, 작업자 숙련도, 설비 오작동 등 근본 원인별 통계를 제공하여 재발 방지 대책을 수립합니다."}]', 'LOT 생산량 대비 불량률(PPM) 정밀 산출: 각 LOT별 총 생산 수량 대비 클레임 발생 수량을 백만분율(PPM)로 환산하여 객관적인 품질 수준을 계량화합니다.

5-Why 및 근본원인(Root Cause) 분류: 원자재 불량, 작업자 숙련도, 설비 오작동 등 근본 원인별 통계를 제공하여 재발 방지 대책을 수립합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'lotPpmDashboard');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'qualityDashboard', '📊 입고 품질 검사 대시보드 가이드', '[{"subtitle":"물류센터 입고 합격률 및 불량 현황","content":"기간별 입고 검사 건수, 초품 합격률, 주요 불합격 사유(라벨 오기, 외관 찌그러짐 등)를 종합 모니터링합니다."},{"subtitle":"제조사별 입고 품질 등급 비교","content":"협력 제조사별 입고 불량률을 비교 분석하여 우수 제조사 평가의 기초 자료로 활용합니다."}]', '물류센터 입고 합격률 및 불량 현황: 기간별 입고 검사 건수, 초품 합격률, 주요 불합격 사유(라벨 오기, 외관 찌그러짐 등)를 종합 모니터링합니다.

제조사별 입고 품질 등급 비교: 협력 제조사별 입고 불량률을 비교 분석하여 우수 제조사 평가의 기초 자료로 활용합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'qualityDashboard');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'productDashboard', '📊 제품코드 마스터 대시보드 가이드', '[{"subtitle":"전사 품목 마스터 현황 요약","content":"브랜드별 활성 품목 수, 포장사양서 확정률, 체적 치수 입력 완료율 등 마스터 데이터의 무결성 현황을 모니터링합니다."},{"subtitle":"미확정 사양서 조기 식별","content":"3D 도면 또는 포장사양이 미확정된 품목들을 선별하여 담당자에게 신속한 등록을 유도합니다."}]', '전사 품목 마스터 현황 요약: 브랜드별 활성 품목 수, 포장사양서 확정률, 체적 치수 입력 완료율 등 마스터 데이터의 무결성 현황을 모니터링합니다.

미확정 사양서 조기 식별: 3D 도면 또는 포장사양이 미확정된 품목들을 선별하여 담당자에게 신속한 등록을 유도합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'productDashboard');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'manufacturerAuditItems', '📋 제조사 Audit 점검항목 관리 가이드', '[{"subtitle":"CGMP / ISO 22716 기반 표준 점검표 구성","content":"제조 시설, 위생 관리, 원자재 보관, 품질 시험, 공정 관리 등 5대 대분류별 세부 점검 항목과 배점을 관리합니다."},{"subtitle":"평가 항목 수정 및 가중치 설정","content":"사내 품질 정책 변경에 따라 점검 문항을 유연하게 추가/수정하고 필수 불합격 항목(Critical Point)을 지정합니다."}]', 'CGMP / ISO 22716 기반 표준 점검표 구성: 제조 시설, 위생 관리, 원자재 보관, 품질 시험, 공정 관리 등 5대 대분류별 세부 점검 항목과 배점을 관리합니다.

평가 항목 수정 및 가중치 설정: 사내 품질 정책 변경에 따라 점검 문항을 유연하게 추가/수정하고 필수 불합격 항목(Critical Point)을 지정합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'manufacturerAuditItems');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'manufacturerAudits', '📝 제조사 현장 Audit 관리 가이드', '[{"subtitle":"제조사 정기/수시 품질 감사 수행","content":"실제 제조사 공장을 방문하여 점검 항목별 평가 점수와 현장 확인 사진, 지적 사항(CAR)을 등록합니다."},{"subtitle":"종합 등급(A/B/C/D) 자동 판정 및 보고서 생성","content":"취득 점수에 따라 우수(A), 양호(B), 보완(C), 부적합(D) 등급을 자동 판정하고 공문용 평가 성적서를 출력합니다."}]', '제조사 정기/수시 품질 감사 수행: 실제 제조사 공장을 방문하여 점검 항목별 평가 점수와 현장 확인 사진, 지적 사항(CAR)을 등록합니다.

종합 등급(A/B/C/D) 자동 판정 및 보고서 생성: 취득 점수에 따라 우수(A), 양호(B), 보완(C), 부적합(D) 등급을 자동 판정하고 공문용 평가 성적서를 출력합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'manufacturerAudits');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'manufacturerAuditDashboard', '📊 제조사 Audit 종합 대시보드 가이드', '[{"subtitle":"전체 협력사 품질 역량 맵","content":"협력 제조사들의 평균 Audit 점수 분포, 등급별 비율, 항목별 취약 부문을 레이더 차트로 시각화합니다."},{"subtitle":"감사 주기 및 차기 일정 관리","content":"제조사별 등급에 따른 차기 정기 감사 도래일을 추적하여 누락 없는 감사를 지원합니다."}]', '전체 협력사 품질 역량 맵: 협력 제조사들의 평균 Audit 점수 분포, 등급별 비율, 항목별 취약 부문을 레이더 차트로 시각화합니다.

감사 주기 및 차기 일정 관리: 제조사별 등급에 따른 차기 정기 감사 도래일을 추적하여 누락 없는 감사를 지원합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'manufacturerAuditDashboard');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'manufacturerCategories', '📂 제조사 구분 관리 가이드', '[{"subtitle":"제조사 업종 및 생산 품목별 카테고리화","content":"OEM/ODM 완제품 제조사, 용기 전문 제조사, 펌프/부자재 제조사, 단상자 인쇄사 등 협력사 유형을 체계화합니다."},{"subtitle":"공지사항 및 권한 타겟팅 연계","content":"전체공지 등록 시 특정 제조사 카테고리만 지정하여 맞춤형 공문 및 메일을 발송할 수 있습니다."}]', '제조사 업종 및 생산 품목별 카테고리화: OEM/ODM 완제품 제조사, 용기 전문 제조사, 펌프/부자재 제조사, 단상자 인쇄사 등 협력사 유형을 체계화합니다.

공지사항 및 권한 타겟팅 연계: 전체공지 등록 시 특정 제조사 카테고리만 지정하여 맞춤형 공문 및 메일을 발송할 수 있습니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'manufacturerCategories');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'accessLogs', '🕒 사용자 접근 로그 가이드', '[{"subtitle":"시스템 로그인 및 접속 보안 감사","content":"모든 사용자의 로그인 시각, 접속 IP, 브라우저 정보, 로그인 성공/실패 이력을 실시간 모니터링합니다."},{"subtitle":"비정상 접근 탐지","content":"반복적인 비밀번호 오류 및 비인가 IP 접속 시도를 추적하여 계정 탈취 위험을 방지합니다."}]', '시스템 로그인 및 접속 보안 감사: 모든 사용자의 로그인 시각, 접속 IP, 브라우저 정보, 로그인 성공/실패 이력을 실시간 모니터링합니다.

비정상 접근 탐지: 반복적인 비밀번호 오류 및 비인가 IP 접속 시도를 추적하여 계정 탈취 위험을 방지합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'accessLogs');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'bugReports', '🐞 시스템 버그 리포트 관리 가이드', '[{"subtitle":"사용자 불편사항 및 시스템 오류 자동 수집","content":"사용자가 겪은 오류 내용, 발생 화면, 에러 스택, 스크린샷이 첨부된 버그 리포트를 접수하고 상태(접수/처리중/완료)를 관리합니다."},{"subtitle":"무장애 시스템 운영","content":"치명적 프론트엔드/백엔드 예외를 개발팀이 신속히 인지하고 패치할 수 있는 Audit 기반을 제공합니다."}]', '사용자 불편사항 및 시스템 오류 자동 수집: 사용자가 겪은 오류 내용, 발생 화면, 에러 스택, 스크린샷이 첨부된 버그 리포트를 접수하고 상태(접수/처리중/완료)를 관리합니다.

무장애 시스템 운영: 치명적 프론트엔드/백엔드 예외를 개발팀이 신속히 인지하고 패치할 수 있는 Audit 기반을 제공합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'bugReports');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'ingredientCompliance', '🧪 화장품 전성분 안전성 검토 가이드', '[{"subtitle":"6,000건 이상의 화장품 규제 성분 DB 연동","content":"식약처 고시 배합금지 성분, 배합한도 성분, 사용상 주의사항 성분 데이터를 기반으로 제품 전성분을 실시간 검토합니다."},{"subtitle":"전성분 텍스트 자동 파싱 및 위험 경고","content":"제품 전성분 목록을 붙여넣으면 유해 성분 및 한도 초과 위험을 자동으로 분석하여 규제 리스크를 제로화합니다."}]', '6,000건 이상의 화장품 규제 성분 DB 연동: 식약처 고시 배합금지 성분, 배합한도 성분, 사용상 주의사항 성분 데이터를 기반으로 제품 전성분을 실시간 검토합니다.

전성분 텍스트 자동 파싱 및 위험 경고: 제품 전성분 목록을 붙여넣으면 유해 성분 및 한도 초과 위험을 자동으로 분석하여 규제 리스크를 제로화합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'ingredientCompliance');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'mailTemplates', '📧 제조사 전달 메일 템플릿 관리 가이드', '[{"subtitle":"업무별 표준 이메일 양식 관리","content":"클레임 소명 요청, 생산감리 승인/반려 안내, Audit 결과 통보 등 상황별 이메일 제목과 본문 서식을 관리합니다."},{"subtitle":"동적 치환 변수 지원","content":"#{제조사명}, #{제품명}, #{클레임번호} 등 동적 변수를 사용하여 클릭 한 번으로 개인화된 공문 메일을 발송합니다."}]', '업무별 표준 이메일 양식 관리: 클레임 소명 요청, 생산감리 승인/반려 안내, Audit 결과 통보 등 상황별 이메일 제목과 본문 서식을 관리합니다.

동적 치환 변수 지원: #{제조사명}, #{제품명}, #{클레임번호} 등 동적 변수를 사용하여 클릭 한 번으로 개인화된 공문 메일을 발송합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'mailTemplates');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'announcements', '📢 전사 전체공지 및 분류 관리 가이드', '[{"subtitle":"사내 및 제조사 타겟 공지사항 전파","content":"품질 지침 개정, 법령 변경, 시스템 점검 안내 등을 전체 또는 특정 제조사 그룹을 지정하여 게시합니다."},{"subtitle":"공지 카테고리 스타일 및 대량 메일 발송","content":"긴급, 중요, 일반 등 카테고리별 글자 색상과 굵기를 지정하고, 공지 등록과 동시에 대상자들에게 알림 이메일을 일괄 발송합니다."}]', '사내 및 제조사 타겟 공지사항 전파: 품질 지침 개정, 법령 변경, 시스템 점검 안내 등을 전체 또는 특정 제조사 그룹을 지정하여 게시합니다.

공지 카테고리 스타일 및 대량 메일 발송: 긴급, 중요, 일반 등 카테고리별 글자 색상과 굵기를 지정하고, 공지 등록과 동시에 대상자들에게 알림 이메일을 일괄 발송합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'announcements');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'manufacturerGuide', '🤝 제조사 협업 포털 가이드', '[{"subtitle":"제조사 전용 업무 안내 포털","content":"협력 제조사가 시스템에 접속하여 생산감리 사진을 업로드하고 필수 품질 서류를 제출하는 표준 절차를 안내합니다."},{"subtitle":"원활한 품질 소통 체계","content":"제조사 담당자가 자주 묻는 질문과 규정 양식을 제공하여 소통 오류를 최소화합니다."}]', '제조사 전용 업무 안내 포털: 협력 제조사가 시스템에 접속하여 생산감리 사진을 업로드하고 필수 품질 서류를 제출하는 표준 절차를 안내합니다.

원활한 품질 소통 체계: 제조사 담당자가 자주 묻는 질문과 규정 양식을 제공하여 소통 오류를 최소화합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'manufacturerGuide');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'documentRequests', '📋 필수 품질서류 관리 가이드', '[{"subtitle":"제조사별 정기 필수 품질 서류 수집","content":"사업자등록증, CGMP 적합판정서, ISO 인증서, 책임판매업 등록증, 시험성적서 등 필수 서류의 제출 현황을 관리합니다."},{"subtitle":"만료일 추적 및 자동 갱신 알림","content":"서류의 유효기간 만료 30일/15일 전에 제조사에 갱신 요청 알림을 자동으로 발송하여 서류 단절을 방지합니다."}]', '제조사별 정기 필수 품질 서류 수집: 사업자등록증, CGMP 적합판정서, ISO 인증서, 책임판매업 등록증, 시험성적서 등 필수 서류의 제출 현황을 관리합니다.

만료일 추적 및 자동 갱신 알림: 서류의 유효기간 만료 30일/15일 전에 제조사에 갱신 요청 알림을 자동으로 발송하여 서류 단절을 방지합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'documentRequests');

INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)
SELECT 'documentTypeConfig', '⚙️ 추가 품질서류 항목 설정 가이드', '[{"subtitle":"수집 서류 카테고리 및 주기 설정","content":"환경 인증서, 비건 인증서, 할랄 인증서 등 제품군 및 제조사 특성에 따라 추가로 요구되는 서류 항목을 정의합니다."},{"subtitle":"갱신 주기(연간/반기/수시) 표준화","content":"각 서류별 유효기간 검증 규칙과 필수 제출 여부를 사내 규정에 맞게 유연하게 설정합니다."}]', '수집 서류 카테고리 및 주기 설정: 환경 인증서, 비건 인증서, 할랄 인증서 등 제품군 및 제조사 특성에 따라 추가로 요구되는 서류 항목을 정의합니다.

갱신 주기(연간/반기/수시) 표준화: 각 서류별 유효기간 검증 규칙과 필수 제출 여부를 사내 규정에 맞게 유연하게 설정합니다.', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = 'documentTypeConfig');

