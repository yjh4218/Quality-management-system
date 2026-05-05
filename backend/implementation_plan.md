# QMS 시스템 고도화 및 안정화 최종 구현 계획 (Security, DB Perf, Architecture)

사용자님이 최종 승인 조건으로 추가하신 DB 성능 튜닝(pg_trgm 구조 기반 GIN 인덱스) 및 병목 구간 최적화(페이징, N+1, 캐싱) 사항을 모두 포함한 통합 구현 계획입니다. 이 단계들이 성공적으로 완료되면 Render 단에서의 응답 성능이 최고 수준으로 개선됩니다.

## User Review Required

> [!WARNING]  
> **N+1 문제 해결 및 페이징 도입:**
> 기존 `ProductService.getProducts()`는 모든 제품 목록을 가져왔으나, 페이징 처리가 완료되면 한 번에 50개만 조회합니다. 이에 따라 프론트엔드의 `ProductListPage.jsx`에서도 무한 스크롤(또는 페이지네이션 모듈)이 필요합니다. 이번 작업에 프론트엔드 페이징 연동 작업도 함께 진행하겠습니다.

---

## Proposed Changes

### Phase 1: 보안 강화 및 프론트엔드 권한 격리 (Security)
- #### [MODIFY] `App.jsx` (Frontend)
  - 사이드바 내 **사용자 승인 관리** 메뉴가 일부 권한에도 보이던 문제를 `{(isAdmin) && ...}` 조건으로 수정하여 관리자 전용 화면으로 한정.
- #### [MODIFY] `AdminSystemController.java` & `DebugController.java`
  - `/api/admin/system/migrate-data`의 주석 처리된 `@PreAuthorize("hasRole('ADMIN')")` 복구.
  - `DebugController` 클래스에 `@Profile("local")`을 추가해 외부에 데이터베이스 구조 정보가 운영에서 노출되지 않도록 조치.
- #### [MODIFY] `SecurityConfig.java`
  - `/api/auth/unlock/{id}` 및 `/api/auth/reset-password/{id}` 인가 설정을 `permitAll()`에서 `hasRole('ADMIN')`으로 조정하여 인증 우회 차단.
  - `/uploads/**` ignoring 설정을 제거, REST API 전용으로 CSRF를 조율하고 토큰 기반 사용자만 접근하도록 안전 처리.

### Phase 2: DB 성능 최적화 대수술 (pg_trgm & GIN Indexes)
- #### [NEW] `schema-indexes.sql` (마이그레이션 스크립트 작성)
  - 확장 실행: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
  - **B-Tree 인덱스**: `CREATE INDEX CONCURRENTLY idx_products_active_created ON products (active, created_at DESC);`
  - **B-Tree 인덱스**: `CREATE INDEX CONCURRENTLY idx_products_dimensions_status ON products (status);` (참고: JPA @Embedded 전략에 의해 dimensions.status는 DB에 status 컬럼으로 맵핑됩니다)
  - **B-Tree 인덱스**: `CREATE INDEX CONCURRENTLY idx_claims_receipt_mfr ON claims (receipt_date DESC, manufacturer);`
  - **GIN 풀텍스트 인덱스**: `product_name`, `english_product_name`, `ingredients` 컬럼에 대해 `gin_trgm_ops` 인덱스 생성.
  - *참고: 이 스크립트는 추후 Supabase 대시보드(SQL Editor)를 통해 직접 한 번 실행해야 합니다.*
- #### [MODIFY] `Product.java` & `Claim.java` (Entity 연동)
  - `@Table(indexes = {...})` 선언부에 위에서 작성한 복합 인덱스 및 시간역순(`createdAt DESC`) 구조를 `@Index`로 매핑.
- #### [MODIFY] `ProductRepository.java` (ILIKE 최적화 & DTO 프로젝션)
  - 무거운 EAGER 로딩을 제거하고 목록 조회 전용 인터페이스 `ProductSummaryDto` 생성.
  - 목록 호출 메서드를 `Page<ProductSummaryDto> findSummaryByActiveTrue(Pageable pageable)`로 리팩토링.
  - `searchProducts` 메서드의 쿼리에서 모든 `LOWER()` 함수를 걷어내고, PostgreSQL 전용 `ILIKE` 연산자로 호환 변경.

### Phase 3: 병목 해소 및 아키텍처 튜닝 (Bottleneck, Caching, Session)
- #### [MODIFY] `pom.xml` & `application-prod.properties`
  - **세션 9시간 강제 유지**: `spring-session-jdbc` 활성화 및 만료 시간을 `server.servlet.session.timeout=9h`로 적용.
  - **Hikari 튜닝 (Fast-Fail)**: `maximum-pool-size=10`, `connection-timeout=5000` 설정 변경.
  - **캐시 설정 활성화**: `spring-boot-starter-cache` 와 `caffeine` 라이브러리를 추가하여 간단한 TTL 연동.
- #### [MODIFY] `DashboardController.java` & `DashboardService.java`
  - 대시보드 요약 데이터를 제공하는 서비스 메서드에 `@Cacheable(value="dashboard", cacheManager="caffeineCacheManager")` (TTL 60초) 추가.
- #### [MODIFY] `ProductService.java`
  - 페이징 `Pageable` 적용 (한 페이지 50개 제한).
  - `ProductHistory` 저장 로직을 `List<ProductHistory>` 수집 후 단 1번의 `saveAll()` 호출로 변경하는 Batch 처리 구현.

### Phase 4: 데이터 무결성 및 인프라 정리 (Integrity & Git)
- #### [DELETE] `ProductController.java`
  - 인증 없는 랜덤 데이터 변경 엔드포인트 `/randomize-shelf-life` 삭제.
- #### [MODIFY] `Product.java`
  - `@Version private Long version;` 필드를 추가해 **낙관적 잠금(Optimistic Lock)** 방어기재 추가 (동시성 수정시 버전 충돌 Exception 발생으로 덮어쓰기 방지).
- #### [MODIFY] `application-prod.properties`
  - `spring.jpa.hibernate.ddl-auto=validate`로 락업하여 향후 스키마 자동 변경 대참사 방지.
- #### [EXECUTE] `.gitignore` 반영
  - `.gitignore`에 `backend/data/**` 추가 및 `git rm -r --cached backend/data/` 스크립트 실행 가이드.

---

## 오픈소스 활용 가이드
- **EXPLAIN ANALYZE 사용법**: 콘솔 또는 Supabase SQL 편집기에서 `EXPLAIN ANALYZE SELECT * FROM products WHERE product_name ILIKE '%토너%';` 실행 시 쿼리의 소요 비용(Cost)과 GIN, B-Tree 인덱스가 실제로 쿼리 플랜에 쓰였는지(Index Scan vs Seq Scan)를 명확히 진단할 수 있습니다. 

## Verification Plan
1. `EXPLAIN ANALYZE` 를 통해 `ILIKE` 검색 시 `product_name_gin_idx`를 타는지 확인(수행 가이드 안내 예정).
2. N+1 확인 로드: 포스트맨 API에서 `/api/products` 호출 시 `LIMIT 50`과 단 2~3줄의 쿼리로 처리가 완료되는지 콘솔에서 검증.
3. 세션 유지 확인: 로그인 수행 후 로컬 서버 프로세스를 강제 종료하고 다시 기동해도 세션이 DB에 쓰였으므로 로그인 창으로 튕기지 않고 화면이 복원되는지 점검 (만료 시간 9시간 보장).
