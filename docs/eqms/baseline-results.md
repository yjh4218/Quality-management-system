# 🧪 현행 시스템 기준선 및 시험 결과 보고서 (baseline-results.md)

> **작성 일시**: 2026-10-12  
> **목적**: 00단계 저장소 진단 기준 현행 테스트 스위트, 커밋, 빌드 상태 기록

---

## 1. 저장소 및 형상 관리 상태

- **현재 브랜치**: `main`
- **최신 커밋**: `c3db2da` (*fix: 권한 마스터 수정 저장 보존, 버그리포트 읽음 알람 동기화 및 전자결재 unreadCount 런타임 오류 해결*)
- **작업 트리 상태 (Uncommitted Changes)**:
  - 백엔드 5개 파일: `PackagingSpecificationController.java`, `IngredientPrecautionDto.java`, `PackagingSpecBomItemRepository.java`, `IngredientPrecautionService.java`, `PackagingSpecService.java`
  - 프론트엔드 3개 파일: `ProductBomInquiryPage.jsx`, `ProductDrawer.jsx`, `api.jsx`
  - 상태 요약: 화장품 제품 드로어 및 포장재 BOM 규격 조회 기능 개선 작업이 로컬에 진행 중.

---

## 2. 현행 백엔드 테스트 스위트 현황

| 테스트 클래스 | 경로 | 목적 | 비고 |
| :--- | :--- | :--- | :--- |
| `FlywayMigrationValidationTest` | `com/example/ims/` | Flyway V1~V130 마이그레이션 H2 검증 | CI 프로파일 핵심 테스트 |
| `SmokeTest` | `com/example/ims/` | Spring Context 구동 검증 | 필수 스모크 테스트 |
| `ApprovalServiceTest` | `com/example/ims/service/` | 결재 상신/승인/반려 단위 테스트 | 기본 결재 흐름 검증 |
| `ApprovalRegressionDefectTest` | `com/example/ims/service/` | 결재 D-3, D-4, D-5 결함 특성화 및 회귀 방어 | 01단계 신규 작성 (3건 PASS) |
| `AuditLogPreservationTest` | `com/example/ims/service/` | 감사로그 D-7, D-8 결함 특성화 및 회귀 방어 | 01단계 신규 작성 (2건 PASS) |
| `MedicalDeviceProductServiceTest` | `com/example/ims/service/` | 의료기기 마스터 비즈니스 로직 및 UDI 검증 | 06단계 신규 작성 (5건 PASS) |
| `MedicalDeviceProductControllerTest` | `com/example/ims/controller/` | 의료기기 마스터 API 슬라이스 검증 | 06단계 신규 작성 (4건 PASS) |
| `ControlledDocumentServiceTest` | `com/example/ims/service/` | 통제문서 수명주기, 개정 및 삭제 방어가드 검증 | 07단계 신규 작성 (6건 PASS) |
| `ControlledDocumentControllerTest` | `com/example/ims/controller/` | 통제문서 API 및 승인/개정 슬라이스 검증 | 07단계 신규 작성 (7건 PASS) |
| `TrainingServiceTest` | `com/example/ims/service/` | 교육과정/이수기록/직무자격/효과성평가 검증 | 08단계 신규 작성 (7건 PASS) |
| `TrainingControllerTest` | `com/example/ims/controller/` | 교육훈련 및 자격관리 API 슬라이스 검증 | 08단계 신규 작성 (7건 PASS) |
| `RiskAssessmentServiceTest` | `com/example/ims/service/` | ISO 14971 위해요인 3계층, FMEA 5x5 매트릭스, 통제순위, RMF 검증 | 09단계 신규 작성 (10건 PASS) |
| `RiskAssessmentControllerTest` | `com/example/ims/controller/` | ISO 14971 위험관리 및 FMEA 슬라이스 검증 | 09단계 신규 작성 (8건 PASS) |
| `PackagingSpecExportServiceTest` | `com/example/ims/service/` | 포장 사양서 엑셀/PDF 출력 검증 | 파일 생성 로직 검증 |
| `FileSelfHealingCacheTest` | `com/example/ims/service/` | 파일 자가 복구 캐시 동작 검증 | 스토리지 복구 테스트 |
| `ResendEmailSenderTest` | `com/example/ims/service/` | 메일 발송 mock 검증 | 이메일 연동 테스트 |
| `PerformanceBenchmarkTest` | `com/example/ims/` | 성능 벤치마크 테스트 | 선택적 실행 |
| `QmsFullE2EComprehensiveTest` | `com/example/ims/` | 전체 E2E 종합 테스트 | 규제 시딩 데이터 부하 주의 |

---

## 3. 프론트엔드 검증 도구 현황

- **빌드 도구**: Vite 4.3.9 (`npm run build`)
- **테스트 러너**: 없음 (`vitest`, `jest` 미설치 상태)
- **현재 컴포넌트 특이점**:
  - `ProductDrawer.jsx` (8,500+ 줄), `App.jsx` 등 단일 대형 파일 구조 존재.
  - 별도 프론트엔드 단위/회귀 테스트 러너 없이 빌드 검증에 의존.

---

## 4. CI/CD 파이프라인 기준선

- **CI 실행 명령**: `./mvnw test -Dspring.profiles.active=ci`
- **CI 환경 특성**:
  - `spring.jpa.hibernate.ddl-auto=create-drop`
  - `spring.datasource.url=jdbc:h2:mem:citestdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL`
  - `spring.flyway.enabled=false`
  - `com.example.ims.util.SystemStartupRunner.enabled=false` (대량 규제 성분 시딩 생략)
- **위험 요소**: CI가 H2 메모리 DB 기반 `create-drop`으로 실행되어 PostgreSQL 고유 SQL 문법 및 실제 Flyway 체크섬을 CI 파이프라인에서 완벽히 검증하지 못함 (`FlywayMigrationValidationTest`를 통해서만 간접 검증).

---

## 5. 01단계 회귀시험 및 무결성 검증 결과 (2026-10-13)

- **Flyway 마이그레이션 검증**: `FlywayMigrationValidationTest` (135개 스크립트 적용 및 JPA Schema Align 100% 일치 확인)
- **CI 스모크 테스트**: `SmokeTest` (3개 테스트 PASS)
- **결재 및 연동 특성화 테스트**: `ApprovalRegressionDefectTest` (3개 테스트 PASS)
- **감사로그 보존 특성화 테스트**: `AuditLogPreservationTest` (2개 테스트 PASS)
- **프론트엔드 전체 번들 빌드**: `npm run build` (34.88초 성공, 컴파일 오류 0건)

---

## 6. 02단계 DB 마이그레이션 및 보존 정책 검증 결과 (2026-10-18)

- **해결 결함**:
  - **D-10 (Flyway 검증 복원)**: `application.properties` 내 `spring.flyway.validate-on-migrate=true` 적용 완료.
  - **D-8 (감사로그 물리 삭제 폐지)**: `AuditLogService.archiveOldLogs()` 내 `deleteArchivedLogs()` 호출 제거 완료, 원본 로그 영구 보존 및 아카이브 복제 테이블 스키마 정렬 (`V131__align_audit_logs_archive_schema.sql` 신규 작성).
- **마이그레이션 검증**: `FlywayMigrationValidationTest` (136개 마이그레이션 정상 적용, JPA Schema Align 100% 일치 확인)
- **감사로그 보존 검증**: `AuditLogPreservationTest` (원천 로그 물리 삭제 배제 및 아카이브 복제 무결성 확인, 2건 PASS)
- **빌드 및 테스트 결과**: 전체 3개 테스트 PASS (Total time: 01:09 min, BUILD SUCCESS)

---

## 7. 03단계 인증·권한·파일 보안 강화 검증 결과 (2026-10-18)

- **해결 결함**:
  - **D-1 (CSRF 무영향 보장 및 Origin 가드 - DEC-08)**: Hugging Face Spaces + Cloudflare Pages 교차 출처 배포 환경에서 403 장애를 일으키는 CSRF 토큰 강제 적용을 배제하고 현행 `ignoringRequestMatchers("/api/**")`를 안전하게 유지하면서, `SecurityConfig` 내 `OriginRefererGuardFilter`를 신설하여 비인가 외부 도메인으로부터의 위조된 상태 변경(POST/PUT/DELETE/PATCH) 요청을 원천 차단(403 Forbidden).
  - **D-2 (첨부파일 인가 전환 및 기밀 품질 문서 보호 - DEC-09)**: `FileServingController` 내 `isSensitiveDocument()` 검증 로직을 도입하여 기밀 문서(성적서/사양서/클레임/감사 등 `.pdf`, `.xlsx`, `/coa/`, `/claims/` 등)에 대한 비인가 익명 접근을 차단(401 Unauthorized)하고, 일반 제품 이미지 등 비기밀 미디어는 정상 서빙하여 기존 프론트엔드 화면 렌더링 100% 보존.
- **보안 및 접근 제어 검증**: `SecurityAndFileAccessTest` (4건 PASS: 기밀문서 익명 차단 2건, 인증 서빙 1건, 공개 미디어 서빙 1건)
- **전체 회귀 테스트**: 16개 테스트 전체 PASS (Total time: 41.6s, BUILD SUCCESS)
- **프론트엔드 번들 빌드**: `npm run build` (34.66초 성공, 에러 0건)

---

## 8. 04단계 감사추적 무결성 및 트랜잭션 보장 검증 결과 (2026-10-18)

- **해결 결함**:
  - **D-6 (감사로그 비동기 분기 유실)**: `AuditLogService` 내 `handleEntityChangeEvent`, `logAction`, `logEntityChange`의 `@Async("auditExecutor")` 큐 분기를 제거하고, `AFTER_COMMIT` 및 독립 트랜잭션(`REQUIRES_NEW`)으로 동기 커밋하여 서버 재기동/큐 포화 시 감사로그 유실률 0% 달성.
  - **D-7 (불완전 스냅샷 복원 폐지)**: `restoreFromLog`의 엔티티 직접 덮어쓰기 로직을 전면 폐지하고 `UnsupportedOperationException`을 발생시켜 ISO 13485 / 21 CFR Part 11 데이터 무결성 요건 준수 (정식 변경관리/개정 승인 절차 강제).
  - **무결성 해시 체인**: `AuditLog` 엔티티 및 테이블에 SHA-256 `record_hash` 컬럼 추가 (`V132__add_audit_log_record_hash.sql`), 변조 방지 해시 자동 산출 및 아카이브 복제 동기화.
- **마이그레이션 검증**: `FlywayMigrationValidationTest` (137개 마이그레이션 정상 적용, JPA Schema Align 100% 일치 확인)
- **감사 무결성 검증**: `AuditLogPreservationTest` (3건 PASS: SHA-256 해시 생성, 스냅샷 덮어쓰기 차단, 아카이브 보존)
- **빌드 및 테스트 결과**: 4개 테스트 PASS (Total time: 54.7s, BUILD SUCCESS)

---

## 9. 05단계 전자결재 및 품질승인 연동 개편 검증 결과 (2026-10-18)

- **해결 결함**:
  - **D-3 (출하승인 무조건 적합 방어)**: `ApprovalService` 내 `MARKET_RELEASE` 최종 승인 시 품질 검사(`finalInspectionResult`, `inboundInspectionResult`) 결과가 '부적합'인 경우 예외 발생 및 출하 승인 원천 차단.
  - **D-4 (클레임 대책보고서 미완료 강제 종결 방어)**: `CLAIM_REPORT` 최종 승인 시 원인 분석 및 재발 방지 대책 수립 여부를 검증하여 조사 미완료 건의 5단계 강제 종결 차단.
  - **D-5 (사후 연동 예외 삼킴 방지)**: 사후 연동 훅 실패 시 전체 트랜잭션 롤백 및 정합성 보존.
- **결재 및 연동 특성화 검증**: `ApprovalRegressionDefectTest` (3건 PASS)
- **전체 회귀 테스트**: 전체 결재 및 감사 스위트 전원 PASS

---

## 10. 06단계 제품·시장·규제 마스터 분리 & 매뉴얼 신설 검증 결과 (2026-10-18)

- **완료 산출물**:
  - `ProductFamily` (COMMON, COSMETICS, MEDICAL_DEVICE) 확장 (기존 화장품 Product 100% 보존 - DEC-09)
  - `MedicalDeviceProduct` 엔티티/Repository/Service/Controller (기기등급, UDI, SaMD, 멸균, 인허가)
  - `V133__create_medical_device_products_and_manual_menus.sql` 마이그레이션 적용
  - 표준 업무 매뉴얼 LNB 대메뉴(`MANUAL_ROOT`), `RegulatoryManualBanner` 가이드 연동 (DEC-10)
  - `MedicalDeviceManagementPage.jsx`, `SopManualPage.jsx`, `RegulatoryGuidePage.jsx`
- **단위/슬라이스 검증**: `MedicalDeviceProductServiceTest` (5건 PASS), `MedicalDeviceProductControllerTest` (4건 PASS)
- **전체 백엔드 테스트**: 64건 전원 PASS (0 failure)
- **프론트엔드 번들 빌드**: `npm run build` (0 errors)

---

## 11. 07단계 통제문서 및 개정관리(DMS) 검증 결과 (2026-10-18)

- **완료 산출물**:
  - 통제문서 라이프사이클(`DRAFT` → `UNDER_REVIEW` → `APPROVED` → `EFFECTIVE` → `SUPERSEDED` → `OBSOLETE`)
  - 4단계 문서화 계층(`ControlledDocType` 8종) 및 `ControlledDocument` 엔티티
  - 신규 개정판 활성화 시 구버전 `SUPERSEDED` 자동 대체 및 `parentDocumentId` 역추적
  - `EFFECTIVE` 유효 문서 무단 삭제 차단 안전 가드
  - `CONTROLLED_DOC` 전자결재 연동 (상신 → 검토중 → 승인 시 EFFECTIVE & 구버전 자동대체)
  - `ControlledDocumentManagementPage.jsx` (KPI 카드, 매뉴얼 배너, 마크다운 뷰어, 개정 타임라인, 개정/상태/결재 모달)
  - `V134__create_controlled_documents_and_dms_menus.sql` 및 H2 초기 시딩 연동
- **단위/슬라이스 검증**: `ControlledDocumentServiceTest` (6건 PASS), `ControlledDocumentControllerTest` (7건 PASS)
- **전체 백엔드 테스트**: 77건 전원 PASS (0 failure, 0 regression)
- **실제 REST API E2E 검증**: 인증, 생성, 유효화, 개정, 자동대체, 히스토리 조회, 삭제 방어 가드 100% 통과
- **프론트엔드 번들 빌드**: `npm run build` (0 errors, 청크 37.53 kB 생성)

---

## 12. 08단계 교육훈련 및 자격관리(Training & Competence) 검증 결과 (2026-10-18)

- **규제 정합 요건**:
  - ISO 13485:2016 §6.2 (인적 자원 - 적격성, 교육훈련 및 효과성 평가)
  - ISO 22716:2007 §3 (인력 및 교육훈련 요건)
  - 화장품법 제3조·제7조 (책임판매관리자 및 법정의무교육)
- **완료 산출물**:
  - **도메인 엔티티**: `TrainingCourse`, `TrainingRecord`, `UserQualification`
  - **비즈니스 로직**: `TrainingService` (관리번호 `TRR-yyyyMM-xxx` 자동채번, 만료일 `trainingDate + cycleMonths` 자동계산, 점수 기반 합격/불합격 판정, ISO 13485 §6.2(c) 적격 효과성 평가, 감사로그 `EntityChangeEvent` 연동, 대시보드 6대 KPI 통계 산출)
  - **REST 컨트롤러**: `TrainingController` (13개 엔드포인트 완비, Spring Security `@PreAuthorize` 연동)
  - **DB 마이그레이션**: `V135__create_training_and_competence_management.sql` (테이블 3종, 인덱스 12종, 동적 메뉴 `SYS_TRAINING_MGMT`, 시스템 권한, 페이지 가이드, 표준 코스 5종, 표준 자격 4종 시딩) 및 로컬 H2 `SystemInitializationService` 연동
  - **프론트엔드 UI**: `TrainingManagementPage.jsx` (3단계 표준 헤더, 규제 매뉴얼 배너, 6개 반응형 KPI 카드, 3개 탭 구성, 다차원 필터, AG Grid `rowHeight={54}`, CSV 다운로드, 96vw×92vh 전면 최대화 팝업 3종 및 상세/효과성 평가 모달)
  - **라우팅 및 가이드**: `App.jsx` (`PAGE_INFO`, 라우트, 사이드바, 동적 메뉴 연동), `pageGuides.js` (`trainingManagement` 3개 섹션 가이드), `api.jsx` (13개 API 클라이언트 메서드)
- **단위/슬라이스 검증**:
  - `TrainingServiceTest` (7건 PASS - 과정 등록/중복방어/삭제, 이수기록 만료일 자동산출/합격판정/불합격판정, 자격 부여, KPI 집계)
  - `TrainingControllerTest` (7건 PASS - REST 엔드포인트 상태코드, JSON 직렬화, 권한 연동 검증)
  - 총 14건 100% PASS (0 failure, 0 error)
- **프론트엔드 번들 빌드**: `npm run build` (0 errors, 청크 `TrainingManagementPage-3dd2ad1e.js` 63.72 kB 생성 완료)
- **실제 브라우저 UI 검증**: 브라우저 서브에이전트를 통해 3단계 헤더, 6개 KPI 카드, 3개 탭 전환, `신규 교육과정 제정` 최대화 모달(96vw×92vh) 정상 오픈/닫기 100% 정상 작동 확인 (스크린샷 증적 확보)





