# 🗄️ QMS 데이터 모델 & API 설계 표준 (data-api-guide.md)

**목적**: Entity 설계, DTO 패턴, 채번 시스템, API 명세 구조를 표준화하여  
신규 모듈 개발 시 일관된 패턴을 유지하고 유지보수 비용을 최소화한다.

---

## 1. Entity 설계 표준

### 1-1. 공통 BaseEntity

모든 Entity는 반드시 `BaseEntity`를 상속한다.

```java
/**
 * QMS 모든 Entity의 공통 기반 클래스
 *
 * 포함 필드:
 * - createdAt: 생성 일시 (자동 기록)
 * - updatedAt: 최종 수정 일시 (자동 갱신)
 * - isDeleted: Soft Delete 플래그 (물리 삭제 금지 원칙)
 * - createdBy: 생성자 ID (감사 추적용)
 *
 * 비즈니스 근거: 품질관리 시스템 특성상 모든 데이터 변경 이력 보존 필수.
 *              물리 삭제 대신 is_deleted 플래그로 논리 삭제 처리.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // Soft Delete 플래그: true이면 삭제된 데이터 (조회에서 자동 제외)
    @Column(nullable = false)
    private Boolean isDeleted = false;

    @CreatedBy
    @Column(updatable = false)
    private String createdBy;
}
```

### 1-2. Entity 작성 규칙

```java
@Entity
@Table(name = "claims")
public class Claim extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 채번 코드: CLM-YYYYMMDD-000 형식 (unique) */
    @Column(nullable = false, unique = true, length = 20)
    private String claimCode;

    /** 처리 단계: 0(접수) ~ 5(완료) */
    @Column(nullable = false)
    private Integer status = 0;

    /**
     * 제조사 공유 여부
     * true이면 MANUFACTURER 역할도 이 건을 조회 가능
     * 비즈니스 근거: 제조사와 공유 필요한 건만 선택적으로 노출하여 정보 보안 강화
     */
    @Column(nullable = false)
    private Boolean sharedWithManufacturer = false;
}
```

---

## 2. 채번(Serial Number) 시스템

### 2-1. 채번 형식 표준

| 모듈 | 접두사 | 형식 예시 |
|------|--------|----------|
| 부적합 | `CLM` | `CLM-20240101-001` |
| 입고검사 | `GRN` | `GRN-20240101-001` |
| 감사 | `AUD` | `AUD-20240101-001` |
| 문서 | `DOC` | `DOC-20240101-001` |

### 2-2. 채번 로직 표준

```java
/**
 * 문서 채번 생성 유틸리티
 *
 * [AI-DO-NOT-MODIFY] 채번 로직 수정 시 기존 데이터와 코드 충돌 발생 위험.
 * 변경 필요 시 반드시 마이그레이션 스크립트와 함께 작성할 것.
 *
 * 채번 형식: {PREFIX}-{YYYYMMDD}-{3자리 순번}
 * 순번은 해당 날짜 내 해당 접두사 문서 수 기준 (일자 바뀌면 001 리셋)
 */
@Component
public class DocumentCodeGenerator {

    public String generate(String prefix, LocalDate date, int sequence) {
        return String.format("%s-%s-%03d",
            prefix,
            date.format(DateTimeFormatter.ofPattern("yyyyMMdd")),
            sequence
        );
    }

    /** 오늘 날짜 기준 다음 순번 조회 */
    public int getNextSequence(String prefix, LocalDate date) {
        String dateStr = date.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        // DB에서 오늘 해당 접두사 건수 조회 후 +1
        return documentRepository.countByCodeStartingWith(prefix + "-" + dateStr) + 1;
    }
}
```

---

## 3. DTO 패턴

### 3-1. DTO 계층 분리

```
Entity (DB 매핑)
    ↕ (Mapper 변환)
Service DTO (비즈니스 로직)
    ↕ (변환 없이 직접 사용)
Controller Request/Response DTO (API 인터페이스)
```

```java
// Request DTO: 클라이언트 → 서버 (입력)
public record ClaimCreateRequest(
    @NotBlank(message = "거래처명은 필수입니다.")
    String partnerName,

    @NotNull(message = "부적합 수량은 필수입니다.")
    @Positive(message = "수량은 1 이상이어야 합니다.")
    Integer quantity,

    String description  // 선택 필드
) {}

// Response DTO: 서버 → 클라이언트 (출력)
// Entity 직접 반환 금지 (불필요한 필드 노출, 순환 참조 위험)
public record ClaimResponse(
    Long id,
    String claimCode,
    String partnerName,
    Integer status,
    String statusLabel,  // 상태코드를 한국어로 변환한 값
    LocalDateTime createdAt
) {}
```

---

## 4. API 설계 표준

### 4-1. URL 패턴 규칙

```
GET    /api/{module}           → 목록 조회
GET    /api/{module}/{id}      → 단건 조회
POST   /api/{module}           → 신규 등록
PUT    /api/{module}/{id}      → 전체 수정
PATCH  /api/{module}/{id}      → 부분 수정 (상태 변경 등)
DELETE /api/{module}/{id}      → 삭제 (Soft Delete)

예시:
GET    /api/claims             → 부적합 목록
POST   /api/claims             → 부적합 등록
PATCH  /api/claims/{id}/advance → 단계 전환 (상태 변경)
DELETE /api/claims/{id}        → 부적합 삭제 (is_deleted=true)
```

### 4-2. 표준 응답 형식

```java
// 성공 응답: HTTP 200/201 + 데이터 직접 반환
ResponseEntity.ok(claimResponse)
ResponseEntity.status(201).body(claimResponse)

// 삭제 성공: HTTP 204 No Content
ResponseEntity.noContent().build()

// 에러 응답: GlobalExceptionHandler에서 표준 형식으로 처리
{
  "status": 404,
  "code": "DATA-001",
  "message": "해당 부적합 건을 찾을 수 없습니다.",
  "timestamp": "2024-01-01T12:00:00"
}
```

### 4-3. 검색 파라미터 표준 (QueryString)

```
GET /api/claims?startDate=2024-01-01&endDate=2024-12-31&status=2&partnerName=ABC

파라미터 규칙:
- 날짜: ISO 형식 (YYYY-MM-DD)
- 상태: 숫자 (0~5)
- 문자열 검색: 부분 일치 (LIKE %검색어%)
- 정렬: 기본값 createdAt DESC (변경 불필요 시 파라미터 생략)
```

---

## 5. DB 설계 원칙

### 5-1. 컬럼 네이밍

| 유형 | 규칙 | 예시 |
|------|------|------|
| 기본키 | `id` (Long) | `id BIGINT AUTO_INCREMENT` |
| 채번 코드 | `{entity}_code` | `claim_code VARCHAR(20)` |
| 상태 | `status` (Integer) | `status INT DEFAULT 0` |
| 날짜 | `{action}_date` | `received_date DATE` |
| 플래그 | `is_{상태}` | `is_deleted BOOLEAN` |
| 외래키 | `{참조테이블}_id` | `partner_id BIGINT` |

### 5-2. 필수 인덱스

```sql
-- 모든 테이블 공통
CREATE INDEX idx_{table}_created_at ON {table}(created_at DESC);
CREATE INDEX idx_{table}_is_deleted ON {table}(is_deleted);

-- 채번 코드 (unique)
CREATE UNIQUE INDEX idx_{table}_code ON {table}({table}_code);

-- 자주 검색되는 조건
CREATE INDEX idx_claims_status ON claims(status, is_deleted);
CREATE INDEX idx_claims_partner ON claims(partner_id, is_deleted);
```

---

## 6. 6단계 워크플로우 상태 관리

```
상태코드  │ 한국어 명칭  │ 담당자        │ 입력 조건
─────────┼────────────┼──────────────┼──────────────────────────
   0     │ 접수        │ QUALITY      │ 기본 정보 입력
   1     │ 원인 분석   │ QUALITY      │ 원인 분석 내용
   2     │ 개선 조치   │ QUALITY      │ 조치 계획 및 결과
   3     │ 제조사 확인 │ MANUFACTURER │ 회수일자 + 분석 결과 (필수)
   4     │ 검증        │ QUALITY      │ 검증 결과
   5     │ 완료        │ ADMIN/QUALITY│ (최종, 더 이상 전환 불가)
```

### 상태 전환 검증 로직 (표준)

```java
// [AI-DO-NOT-MODIFY] 워크플로우 핵심 검증 로직
private void validateTransition(Claim claim, int targetStatus) {
    // 3단계 진입 조건: 제조사 필드 필수
    if (targetStatus == 3) {
        if (claim.getReturnDate() == null || claim.getAnalysisResult() == null) {
            throw new IllegalStateException(
                "3단계 진입 전 제조사 회수일자와 분석 결과를 입력해야 합니다."
            );
        }
    }
    // 역방향 전환 금지
    if (targetStatus <= claim.getStatus()) {
        throw new IllegalStateException("이전 단계로 되돌아갈 수 없습니다.");
    }
}
```
