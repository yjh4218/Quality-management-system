## Phase 1: 보안 강화 (Security Hardening) - **[완료]**
- [x] 프론트엔드 권한 격리 (App.jsx, DashboardPage.jsx)
- [x] 어드민 및 민감 경로 보안 설정 (SecurityConfig.java, AdminSystemController.java)
- [x] Local 전용 디버그 노출 차단 (DebugController.java)
- [x] 불필요하고 위험한 랜덤화 엔드포인트 삭제 (ProductController.java)

## Phase 2: DB 성능 최적화(N+1 방지 초점) - **[완료]**
- [x] 1. `schema-indexes.sql` 작성 (pg_trgm 확장 및 주요 복합 인덱스 생성 로직)
- [x] 2. JPA 엔티티에 `@Table(indexes = ...)` 명시 (Product.java, Claim.java)
- [x] 3. `ProductRepository.searchProducts` 조회 로직 분석 및 DTO 프로젝션/페이징 쿼리(`searchSummary`)로 N+1 이슈 최적화
- [x] 4. 프론트엔드 검색 및 페이지네이션 연동 테스트 (ProductListPage.jsx)
- [x] 5. 일괄 처리를 통해 `history Batch saveAll` 도입 (ProductHistory 이력 저장 로직)

## Phase 3: 캐싱 및 시스템 안정화 - **[완료]**
- [x] 1. `pom.xml`에 캐시(Caffeine) 및 세션(spring-session-jdbc) 의존성 추가
- [x] 2. `application-prod.properties` HikariCP connection 튜닝 (max-lifetime, timeout 조절) 및 Session TTL 9시간 지정
- [x] 3. DashboardService의 무거운 통계 쿼리를 60초 TTL로 캐싱 (Caffeine)
- [x] 4. `@EnableCaching` 애플리케이션 시작 클래스에 추가

## Phase 4: 동시성 제어 및 마무리 - **[완료]**
- [x] 1. `Product.java`에 `@Version` 어노테이션 기반 낙관적 잠금(Optimistic Locking) 선언
- [x] 2. `application-prod.properties`의 DDL-auto를 `validate`로 방어 설정
- [x] 3. 전체 빌드(MVN Clean Install)로 문법 이상 감지
