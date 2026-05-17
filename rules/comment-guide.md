# 📝 QMS 주석 표준 가이드 (comment-guide.md)

**목적**: 모든 핵심 코드에 일관된 주석을 적용하여, 개발자(또는 AI 에이전트)가 코드만 보고도  
업무 맥락과 유지보수 포인트를 파악할 수 있도록 한다.  
**언어 정책**: 코드는 영문, 주석은 **한국어** 기본. "무엇을 하는가"와 "왜 이렇게 하는가"를 모두 기술.

---

## 1. Java (Backend) 주석 표준

### 1-1. 클래스 레벨 Javadoc

```java
/**
 * 부적합(클레임) 관리 서비스
 *
 * <p>유통사와 제조사 간 발생하는 품질 이슈(부적합)를 등록, 조회, 상태 전환하는
 * 핵심 비즈니스 로직을 담당한다.</p>
 *
 * <p>6단계 워크플로우:</p>
 * <pre>
 *   0단계(접수) → 1단계(원인분석) → 2단계(개선조치) →
 *   3단계(제조사확인) → 4단계(검증) → 5단계(완료)
 * </pre>
 *
 * <p>역할별 접근 제한:</p>
 * <ul>
 *   <li>ADMIN, QUALITY: 전체 건 접근</li>
 *   <li>MANUFACTURER: sharedWithManufacturer=true 건만 접근</li>
 * </ul>
 *
 * @author QMS 개발팀
 * @see ClaimRepository
 * @see ClaimController
 */
@Service
@Transactional
public class ClaimService { ... }
```

### 1-2. 메서드 레벨 Javadoc

```java
/**
 * 부적합 건 상태를 다음 단계로 전환한다.
 *
 * <p>비즈니스 흐름: 품질팀이 현장 확인 후 단계를 진행시키면,
 * 제조사에 자동으로 알림이 발송되고 이력이 기록된다.</p>
 *
 * <p>전환 조건:
 * <ul>
 *   <li>현재 상태가 최종 단계(5단계)이면 전환 불가 (IllegalStateException)</li>
 *   <li>제조사 입력 필드가 비어있으면 3단계 진입 불가</li>
 * </ul>
 * </p>
 *
 * @param claimId    상태를 전환할 부적합 건 ID
 * @param actor      전환을 실행하는 사용자 (권한 검증에 사용)
 * @return           전환 후 업데이트된 ClaimDto
 * @throws EntityNotFoundException  해당 ID의 부적합 건이 존재하지 않을 때
 * @throws IllegalStateException    이미 완료 상태이거나 전환 조건 미충족 시
 * @throws AccessDeniedException    MANUFACTURER가 자신 무관 건을 전환 시도할 때
 */
public ClaimDto advanceStatus(Long claimId, UserPrincipal actor) { ... }
```

### 1-3. 인라인 주석 (로직 설명)

```java
public ClaimDto advanceStatus(Long claimId, UserPrincipal actor) {

    // ① 존재 여부 확인 (soft delete된 건은 조회 불가)
    Claim claim = claimRepository.findByIdAndIsDeletedFalse(claimId)
        .orElseThrow(() -> new EntityNotFoundException("부적합 건을 찾을 수 없습니다. ID: " + claimId));

    // ② 최종 단계(5단계) 도달 시 더 이상 전환 불가
    if (claim.getStatus() >= MAX_STATUS) {
        throw new IllegalStateException("이미 완료된 부적합 건입니다.");
    }

    // ③ 3단계 진입 조건: 제조사 회수일자와 분석 결과가 모두 입력되어야 함
    //    이유: 제조사 데이터 없이 품질팀이 일방적으로 진행하는 것을 방지
    if (claim.getStatus() == 2) {
        validateManufacturerFields(claim);
    }

    // ④ 상태 전환 및 이력 기록
    claim.setStatus(claim.getStatus() + 1);
    claimHistoryService.record(claim, actor, "상태 전환: " + claim.getStatus() + "단계");

    return ClaimMapper.toDto(claimRepository.save(claim));
}
```

### 1-4. 상수 및 필드 주석

```java
public class ClaimConstants {

    /** 부적합 최대 단계 수 (0~5, 총 6단계) */
    public static final int MAX_STATUS = 5;

    /** 파일 업로드 최대 크기: 5MB (Firebase Storage 부하 관리 목적) */
    public static final long MAX_FILE_SIZE = 5 * 1024 * 1024L;

    /** 채번 접두사: 부적합 건 (예: CLM-20240101-001) */
    public static final String CLAIM_PREFIX = "CLM";
}
```

---

## 2. JavaScript/React (Frontend) 주석 표준

### 2-1. 컴포넌트 레벨 JSDoc

```jsx
/**
 * 부적합 관리 목록 페이지
 *
 * @description
 * 품질팀이 접수된 부적합 건을 조회하고 상태를 관리하는 메인 화면.
 * - 검색: 기간, 상태, 거래처명 조합 검색
 * - 목록: AG Grid 사용, 행 클릭 시 상세 Drawer 오픈
 * - 권한: ADMIN, QUALITY 전용 (MANUFACTURER는 /claims/shared 라우트 사용)
 *
 * @component
 * @returns {JSX.Element} 부적합 관리 목록 화면
 */
const ClaimListPage = () => { ... };
```

### 2-2. 함수/핸들러 JSDoc

```jsx
/**
 * 부적합 건 저장 처리
 *
 * @description
 * 폼 데이터 유효성 검사 후 API를 호출하여 저장한다.
 * 성공 시 목록을 새로고침하고 팝업을 닫는다.
 * 실패 시 서버 에러 메시지를 Toast로 표시한다.
 *
 * @param {Object} formData - 저장할 부적합 건 데이터
 * @param {string} formData.claimCode - 클레임 코드 (자동 채번)
 * @param {string} formData.partnerName - 거래처명
 * @param {number} formData.quantity - 부적합 수량
 * @returns {Promise<void>}
 */
const handleSave = async (formData) => { ... };
```

### 2-3. 커스텀 훅 JSDoc

```jsx
/**
 * 부적합 목록 데이터 및 검색 상태 관리 훅
 *
 * @description
 * 목록 조회, 검색 파라미터 관리, 로딩 상태를 캡슐화한다.
 * 컴포넌트는 이 훅을 통해서만 데이터에 접근한다. (관심사 분리)
 *
 * @returns {{
 *   list: Array,        - 부적합 건 목록
 *   isLoading: boolean, - 로딩 상태
 *   searchParams: Object, - 현재 검색 조건
 *   setSearchParams: Function, - 검색 조건 변경
 *   fetchList: Function - 목록 재조회 트리거
 * }}
 */
const useClaimList = () => { ... };
```

### 2-4. 상수 파일 주석

```js
// constants/pageGuides.js

/**
 * 각 페이지의 💡 도움말 버튼 클릭 시 표시되는 가이드 콘텐츠
 *
 * 규칙:
 * - 신규 화면 개발 시 반드시 이 파일에 항목 추가
 * - key는 라우트 경로와 동일하게 사용 (예: '/claims')
 * - 내용은 비기술적 언어로 업무 담당자가 이해할 수 있게 작성
 */
export const PAGE_GUIDES = {
  '/claims': {
    title: '부적합 관리 도움말',
    content: `
      • 부적합 건을 등록하고 처리 단계를 관리하는 화면입니다.
      • [+ 신규등록] 버튼으로 새 부적합 건을 접수하세요.
      • 행을 클릭하면 상세 내용을 확인하고 수정할 수 있습니다.
      • 처리 단계: 접수(0) → 원인분석(1) → 조치(2) → 제조사확인(3) → 검증(4) → 완료(5)
    `,
  },
};
```

---

## 3. 주석 작성 금지 패턴 (Bad Examples)

```java
// ❌ 코드만 반복하는 무의미한 주석
// i를 1 증가시킨다
i++;

// ❌ 무엇을 하는지만 설명, 왜 하는지 없음
// 상태를 저장한다
claim.setStatus(newStatus);

// ✅ 업무 맥락과 이유가 있는 주석
// 상태 전환 후 히스토리 기록 (감사 추적을 위해 모든 상태 변경 이력 보존 필수)
claim.setStatus(newStatus);
claimHistoryService.record(claim, actor, "상태전환: " + newStatus + "단계");
```

```jsx
// ❌ TODO 방치 (기한 없는 TODO는 영원히 남음)
// TODO: 나중에 고치기

// ✅ 담당자와 관련 이슈 포함
// TODO(2024-Q2): 페이지네이션 서버사이드 전환 - AG Grid rowModelType='serverSide'
//               현재는 클라이언트 페이지네이션, 데이터 5000건 이상 시 성능 이슈 발생 가능
```

---

## 4. AI 에이전트(Gemini 3 Flash) 최적화 주석

> AI 에이전트가 코드를 수정할 때 실수를 방지하기 위한 특수 주석 패턴

```java
// [AI-CRITICAL] 이 메서드의 반환값은 반드시 DTO여야 함. Entity 직접 반환 금지 (순환 참조 위험)
public ClaimDto getClaimById(Long id) { ... }

// [AI-DO-NOT-MODIFY] 채번 로직. 변경 시 기존 데이터와 키 충돌 발생 가능
private String generateClaimCode(LocalDate date) { ... }

// [AI-DEPENDENCY] 이 메서드 수정 시 ClaimHistoryService.record()도 함께 수정 필요
public ClaimDto advanceStatus(Long claimId, UserPrincipal actor) { ... }
```

```jsx
// [AI-CRITICAL] 이 컴포넌트는 pageGuides.js와 연동됨. 라우트 변경 시 pageGuides.js도 업데이트 필요
const ClaimListPage = () => { ... };

// [AI-DO-NOT-MODIFY] AG Grid columnDefs - 컬럼 순서가 사용자 UX에 직접 영향
const columnDefs = [...];
```

---

## 5. 주석 체크리스트 (PR 전 자가 확인)

```
□ 신규 Service 클래스에 역할, 접근 권한, 관련 모듈 Javadoc 작성
□ public 메서드 전체에 @param, @return, @throws Javadoc 작성
□ 복잡한 조건 분기(if/else 3개 이상)에 인라인 주석으로 업무 근거 기재
□ 신규 React 컴포넌트에 @description, @component JSDoc 작성
□ 신규 화면 개발 시 pageGuides.js에 도움말 콘텐츠 추가
□ 상수/매직 넘버에 의미와 단위 주석 추가
□ AI 에이전트 위험 코드에 [AI-CRITICAL] 태그 적용
□ 방치된 TODO에 기한 및 담당자 추가
```
