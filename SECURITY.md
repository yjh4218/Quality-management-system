# QMS (Quality Management System) 보안 및 의존성 관리 정책 (SECURITY.md)

본 문서는 QMS 시스템의 보안 가이드라인, 프레임워크 업그레이드 경로 및 취약 의존성에 대한 위험 완화책을 정의합니다.

---

## 1. Spring Boot 버전 관리 및 업그레이드 로드맵

- **현재 버전**: Spring Boot `3.2.12`
- **업그레이드 경로 계획**:
  1. `3.2.12` -> `3.3.x` (최신 마이너 안정 버전)
  2. `3.3.x` -> `3.4.x` (LTS 버전 순차 검증)
- **보안 완화책 (Mitigation Controls)**:
  - 사람의 최종 승인 전까지 기존 버전의 알려진 취약점을 완화하기 위하여 애플리케이션 레벨 보안 조치를 1차로 보장합니다.
  - **CSP 적용**: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; object-src 'none'; frame-ancestors 'self';`
  - **정적 서빙 보안**: `/uploads/**` 서빙 시 `X-Content-Type-Options: nosniff` 및 비이미지 문서 `Content-Disposition: attachment` 지정.
  - **CORS 와일드카드 전면 제거**: Controller 레벨 `@CrossOrigin` 제거 및 `SecurityConfig` 중앙 허용 리스트 Whitelist 지정.
  - **Rate Limiting**: Caffeine Cache 기반 IP + Category 버킷으로 토큰/업로드/로그인 무차별 대입 및 DoS 차단.

---

## 2. 프론트엔드 의존성 및 라이브러리 보안 정책

### 2.1 SheetJS (`xlsx`) 라이브러리 취약점 완화책
- **상태**: `xlsx` (SheetJS) 0.18.5 버전은 upstream 커뮤니티 버전에서 추가 패치가 공식 제공되지 않음.
- **수용 조치 및 완화 정책**:
  1. **서버 측 용량 제한**: 업로드 파일 크기를 최대 10MB로 엄격히 제한 (`FileStorageService`).
  2. **Strict MIME & Extension Validation**: Apache Tika 및 파일 확장자 이중 검증을 통해 `.xlsx`, `.xls` 이외의 위험 파일(SVG, HTML, XML 등) 업로드 전면 차단.
  3. **클라이언트 파싱 격리**: 엑셀 파싱 시 사용자 입력 수식/스크립트 실행을 방지하고 순수 텍스트 데이터 추출용으로만 사용.
  4. **대체 라이브러리 검토**: 추후 `exceljs` 또는 `lucide`/`xlsx-populate` 등 보안 관리가 유지되는 대체 npm 패키지 도입 검토.

---

## 3. RBAC (Role-Based Access Control) 권한 정책

- 모든 데이터 변경 API (`POST`, `PUT`, `DELETE`)는 `@PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")` 어노테이션으로 정밀 통제됩니다.
- 일반 사용자 및 시스템 접근은 `@PreAuthorize("isAuthenticated()")`로 보호됩니다.
