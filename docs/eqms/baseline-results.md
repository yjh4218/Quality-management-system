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
