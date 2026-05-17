# 🔒 QMS 보안 가이드 (security-guide.md)

**목적**: Spring Security 기반 인증/인가 체계, JWT 운영 규칙, API 보호 정책, 민감 정보 관리를 표준화하여  
일관되고 유지보수가 쉬운 보안 구조를 유지한다.  
**대원칙**: 모든 API는 기본적으로 인증 필요. 예외 허용 경로만 명시적으로 열 것.

---

## 1. 역할(Role) 체계 (RBAC)

### 1-1. 역할 정의

| Role | 한국어 명칭 | 접근 범위 |
|------|-----------|---------|
| `ADMIN` | 관리자 | 전체 기능 + 시스템 설정 + 사용자 관리 |
| `QUALITY` | 품질팀 | 문서관리, 부적합관리, 감사관리 전체 |
| `MANUFACTURER` | 제조사 | 본인 관련 건만 조회/입력 (`sharedWithManufacturer=true` 항목) |

### 1-2. RBAC 적용 규칙

```java
// Controller 메서드 레벨 권한 적용 표준
@RestController
@RequestMapping("/api/claims")
public class ClaimController {

    // 전체 조회: ADMIN, QUALITY만 허용
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    public ResponseEntity<List<ClaimDto>> getAllClaims(...) { ... }

    // 제조사 공유 건 조회: MANUFACTURER도 허용
    @GetMapping("/shared")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'MANUFACTURER')")
    public ResponseEntity<List<ClaimDto>> getSharedClaims(...) { ... }

    // 삭제: ADMIN만 허용
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteClaim(@PathVariable Long id) { ... }
}
```

---

## 2. Spring Security 설정 표준

### 2-1. SecurityConfig 표준 구조

```java
/**
 * QMS Spring Security 핵심 보안 설정
 * - 모든 API 기본 인증 필요 (화이트리스트 방식)
 * - JWT 필터를 UsernamePasswordAuthenticationFilter 앞에 삽입
 * - CSRF 비활성화 (REST API + JWT 방식이므로 불필요)
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // @PreAuthorize 활성화
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                // ① 인증 불필요 경로 (명시적 화이트리스트)
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/admin/system/health").permitAll()
                // ② 나머지 전부 인증 필요
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

### 2-2. 화이트리스트 관리 원칙

- **추가 시**: PR + 코드 리뷰 후 반영 (임의 추가 금지)
- 현재 허용 경로: `/api/auth/login`, `/api/admin/system/health`
- 신규 공개 API 필요 시 SecurityConfig에 명시적으로 추가하고 주석으로 사유 기재

---

## 3. JWT 표준

### 3-1. JWT 구조

```
Header.Payload.Signature

Payload 클레임:
{
  "sub": "user123",          // 사용자 ID
  "role": "QUALITY",         // 단일 역할
  "iat": 1716000000,         // 발급 시각
  "exp": 1716086400          // 만료 시각 (24시간)
}
```

### 3-2. JWT 설정값

```properties
# application-prod.properties (Secret은 환경변수로 주입)
jwt.secret=${JWT_SECRET}        # 256bit 이상 랜덤 문자열, 환경변수 필수
jwt.expiration=86400000         # 24시간 (ms)
jwt.refresh-expiration=604800000 # 7일 (Refresh Token)
```

### 3-3. JWT 필터 표준

```java
/**
 * JWT 인증 필터
 * 매 요청마다 Authorization 헤더에서 JWT를 추출하여 유효성을 검증한다.
 *
 * 처리 흐름:
 *   요청 수신 → Bearer 토큰 추출 → 서명 검증 → 만료 확인 → SecurityContext 등록
 *
 * 비즈니스 근거:
 *   Stateless REST API 환경에서 세션 없이 사용자를 인증하기 위해 사용.
 *   토큰 위변조는 서명 검증(HMAC-SHA256)으로 방지.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws IOException, ServletException {
        try {
            String token = extractToken(request);
            if (token != null && jwtService.isValid(token)) {
                Authentication auth = jwtService.getAuthentication(token);
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        } catch (ExpiredJwtException e) {
            // 만료된 토큰: 401 반환 (프론트에서 재로그인 유도)
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token expired");
            return;
        } catch (JwtException e) {
            // 위변조된 토큰: 401 반환
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
            return;
        }
        chain.doFilter(request, response);
    }

    /** Authorization 헤더에서 "Bearer {token}" 추출 */
    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
```

---

## 4. API 보안 표준

### 4-1. 엔드포인트 설계 원칙

| 원칙 | 내용 |
|------|------|
| 인증 기본값 | 모든 엔드포인트는 인증 필요. 예외만 명시 |
| 역할 검증 | `@PreAuthorize`를 Controller 메서드마다 명시 |
| 데이터 격리 | MANUFACTURER는 `sharedWithManufacturer=true` 데이터만 접근 |
| Soft Delete | 삭제 API는 물리 삭제 금지, `is_deleted=true` 처리만 허용 |

### 4-2. API 응답 표준 (에러 포맷)

```java
// 표준 에러 응답 DTO
public record ApiErrorResponse(
    int status,       // HTTP 상태코드
    String code,      // 내부 오류 코드 (예: "CLM-001")
    String message,   // 사용자 표시 메시지 (한국어)
    String timestamp  // ISO-8601
) {}

// GlobalExceptionHandler 예시
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleForbidden(AccessDeniedException e) {
        return ResponseEntity.status(403).body(
            new ApiErrorResponse(403, "AUTH-002", "접근 권한이 없습니다.", now())
        );
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(EntityNotFoundException e) {
        return ResponseEntity.status(404).body(
            new ApiErrorResponse(404, "DATA-001", e.getMessage(), now())
        );
    }
}
```

### 4-3. MANUFACTURER 데이터 격리 패턴

```java
/**
 * 제조사 사용자의 데이터 접근 제어
 * - MANUFACTURER 역할은 자신과 관련된 sharedWithManufacturer=true 항목만 조회 가능
 * - 비즈니스 근거: 제조사에게 민감 내부 정보(원가, 전체 클레임 목록) 노출 방지
 */
@Service
public class ClaimService {

    public List<ClaimDto> getClaims(Authentication auth) {
        UserPrincipal user = (UserPrincipal) auth.getPrincipal();

        if (user.getRole() == Role.MANUFACTURER) {
            // 제조사: 공유 허용된 건만 반환
            return claimRepository.findByManufacturerCodeAndShared(
                user.getManufacturerCode(), true
            );
        }
        // ADMIN, QUALITY: 전체 반환
        return claimRepository.findAllActive(); // is_deleted=false 조건 포함
    }
}
```

---

## 5. 민감 정보 관리 (Secrets Management)

### 5-1. 절대 금지 사항

```
❌ 절대 코드 또는 Git에 포함 금지:
   - JWT_SECRET 값
   - DB 비밀번호
   - Supabase API Key
   - 외부 API Key 전체
```

### 5-2. 환경별 설정 분리

```
backend/src/main/resources/
├── application.properties          # 공통 (민감 정보 없음)
├── application-local.properties    # 로컬 개발 (Git 추적, H2 DB)
└── application-prod.properties     # 운영 (환경변수 참조만)
```

```properties
# application-prod.properties 예시 (값 없음, 환경변수 참조)
spring.datasource.url=${SUPABASE_URL}
spring.datasource.password=${SUPABASE_KEY}
jwt.secret=${JWT_SECRET}
cors.allowed-origins=${CORS_ALLOWED_ORIGINS}
```

### 5-3. .gitignore 필수 항목

```gitignore
# 환경 변수 파일
.env
.env.local
.env.production

# 로컬 설정 (민감 정보 포함 가능)
backend/src/main/resources/application-local.properties

# 빌드 산출물
backend/target/
frontend/dist/
```

---

## 6. CORS 설정 표준

```java
/**
 * CORS 설정
 * - 허용 출처는 환경변수로 관리 (하드코딩 금지)
 * - 운영 환경: Cloudflare Pages 도메인만 허용
 * - 로컬 환경: localhost:5173 허용
 *
 * 비즈니스 근거: 허가되지 않은 도메인의 API 호출 차단
 */
@Configuration
public class CorsConfig {

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(false); // JWT 사용이므로 Credentials 불필요

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

---

## 7. 보안 체크리스트 (배포 전 필수 확인)

```
□ JWT_SECRET 환경변수 등록 확인 (256bit 이상)
□ 운영 DB 비밀번호 환경변수 처리 확인
□ application-prod.properties에 하드코딩된 비밀 정보 없음
□ 인증 불필요 경로가 최소화되어 있음 (화이트리스트 검토)
□ ADMIN 전용 엔드포인트에 @PreAuthorize("hasRole('ADMIN')") 적용
□ MANUFACTURER 접근 시 데이터 격리 로직 동작 확인
□ CORS allowed-origins에 운영 프론트 도메인만 등록됨
□ Git 커밋 이력에 민감 정보 포함 여부 확인 (git log 검토)
```
