# QMS (Quality Management System) 아키텍처 문서 (docs/ARCHITECTURE.md)

본 문서는 QMS(품질관리시스템)의 핵심 아키텍처 설계 패턴, 데이터 모델링 배경, 대시보드 컴포넌트 구조 및 최신 보안 결정을 정리한 공식 아키텍처 명세서입니다.

---

## 1. 마스터 상속 구조 (Master Product Copy Pattern)

QMS는 **단일 마스터 제품(Master Product)** 정보를 기반으로 각 유통 채널(쿠팡, 네이버, 11번가 등)에 종속된 채널별 제품 정보를 확장·복사하는 상속 구조를 가집니다.

```
[ Master Product (is_master = true) ]
         │
         ├─── (copyFromMaster) ───► [ Channel Product (is_master = false, channel_id = 1) ]
         └─── (copyFromMaster) ───► [ Channel Product (is_master = false, channel_id = 2) ]
```

- **설계 의도**: 마스터 정보 변경 시 개별 채널 상품으로 기본 사양이 안전하게 전파되며, 채널별 전용 속성(패키징 규칙, 채널 전용 품목명)만 오버라이딩하여 관리가 용이합니다.
- **주요 메서드**: `Product.copyFromMaster(Product master, SalesChannel channel)`

---

## 2. EAV (Entity-Attribute-Value) & JSON 컬럼 설계 배경

제품 및 제조사별 동적 확장 필드(예: 국가별 규제 성분, 커스텀 필수 서류, 포장 방식 메타데이터)를 지원하기 위해 EAV 패턴과 PostgreSQL/H2 JSONB 컬럼을 혼합 사용합니다.

- **장점**: RDBMS 테이블 스키마의 잦은 변경 없이 신규 채널 및 국가별 서류 규격을 즉시 수용할 수 있습니다.
- **보완책**: 무분별한 EAV 검색 성능 저하를 방지하기 위해 핵심 외래키(`product_id`, `manufacturer_id`, `status`, `next_due_date`)에는 Flyway `V62` 인덱스를 추가하여 인덱스 스캔을 보장합니다.

---

## 3. Strategy 패턴 기반 포장공간비율 및 검증 규칙

국가별(한국, 중국, 일본, 미국, EU, ASEAN) 포장공간비율 계산 및 환경 규제 검증 로직은 **Strategy 패턴**으로 분리되어 있습니다.

- **구조**: `SpaceRatioChecker` 인터페이스를 상속받은 국가별 전략 클래스(`KoreaSpaceRatioStrategy`, `ChinaSpaceRatioStrategy` 등)가 존재합니다.
- **효과**: 신규 국가 규제 추가 시 기존 코드 변경 없이 전략 클래스만 새로 추가하여 OCP(Open-Closed Principle)를 준수합니다.

---

## 4. 프론트엔드 코드 스플리팅 및 대시보드 구조

초기 번들 크기(기존 3.08MB 단일 번들)로 인한 초기 로딩 속도 저하를 해결하기 위해 다음과 같이 구현되었습니다.

- **React.lazy() + Suspense**: 대시보드 5종(`DashboardPage`, `ClaimDashboardPage`, `QualityDashboardPage`, `ProductDashboardPage`, `ProductionAuditDashboardPage`) 및 대형 화면 동적 로드.
- **Rollup manualChunks (Vite)**:
  - `vendor-aggrid`: AG Grid 라이브러리
  - `vendor-recharts`: 차트 시각화
  - `vendor-xlsx`: 엑셀 파싱
  - `vendor-mui`: UI 컴포넌트 라이브러리

---

## 5. 보안 강화 결정 근거 (Security Architecture Decisions)

### 5.1 SVG 업로드 저장형 XSS 차단
- Tika MIME 분석 시 `image/svg+xml`, `text/xml` 및 `.svg` 확장자를 `image/` 검사보다 선행하여 즉시 업로드 차단.
- 서비스 기동 시 `uploads` 내 기존 SVG 파일 `uploads/isolated/`로 자동 격리/삭제.

### 5.2 Content-Security-Policy (CSP) 및 보안 헤더
- `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; object-src 'none'; frame-ancestors 'self';` 헤더 추가.
- `/uploads/**` 응답 시 `X-Content-Type-Options: nosniff` 및 비이미지 문서 `Content-Disposition: attachment` 지정.

### 5.3 Rate Limiting 근본 재설계
- Caffeine Cache 적용 (TTL 10분, Max 10,000).
- URL 경로 변수(토큰)를 키에서 제외하고 `clientIp:Category` 기준으로 버킷 구성하여 토큰 무차별 대입 및 DoS 완벽 차단.

### 5.4 CORS 와일드카드 전면 제거
- Controller 레벨 `@CrossOrigin(origins = "*")` 전면 삭제.
- `SecurityConfig`에 명시된 Whitelist 도메인만 허용.

### 5.5 CSRF 보호 복원 (SameSite=None 대응)
- `CookieCsrfTokenRepository.withHttpOnlyFalse()` 기반 CSRF 보호 복원.
- SPA 프론트엔드는 Axios 인터셉터를 통해 `XSRF-TOKEN` 쿠키를 읽고 `X-XSRF-TOKEN` 헤더를 자동 실어 전송하여 CSRF 공격 차단.

### 5.6 RBAC 권한 세분화
- 생성/수정/삭제 액션에 `@PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")` 적용.

---

## 6. 파일 스토리지 접근 제어 및 Presigned URL 가이드

- **S3 Public Read 미설정 권장**: S3 버킷 업로드 파일이 Public Open되지 않도록 Private 버킷으로 설정합니다.
- **Presigned URL 방식 도입**: 파일 다운로드 시 유효 기간 15분의 임시 서명 URL(`s3Client.generatePresignedUrl(...)`)을 발급하여 외부 유출 및 무단 직접링크(Hotlinking)를 차단합니다.
