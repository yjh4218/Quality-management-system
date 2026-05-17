# QMS 통합 표준 및 AI 에이전트 룰셋 (QMS-AI-RULES.md)

이 문서는 700명 규모의 동시 접속을 처리하는 QMS(품질관리시스템) 개발을 위해, AI 에이전트(Gemini 3 Flash)가 코드를 생성하고 인프라를 제어할 때 반드시 지켜야 할 '절대 규칙'을 정의합니다.

---

## 1. AI 행동 규칙 및 컨벤션 (AI_CODING_GUIDELINES)
AI가 코드를 작성하고 수정할 때의 기본 태도와 코드 스타일을 정의합니다.

- **기술 스택 명시**:
  - Frontend: React(Vite), Antigravity(자체 프레임워크), Tailwind CSS, Shadcn UI, AG Grid.
  - Backend: Java 17+, Spring Boot, Spring Security.
- **프론트엔드 코드 스타일**:
  - 모든 컴포넌트는 **함수형(Functional)**으로 작성하며, React Hooks(`useState`, `useEffect`, `useReducer`)를 활용함.
  - UI 픽셀 단위: **8px 그리드 시스템** 준수. (Padding/Margin 정규화).
  - 반응형: 모바일 우선(Mobile-First, `<768px`) 적용. 모바일에서는 하단 탭바/드로어 메뉴 활용.
- **백엔드 코드 스타일**:
  - **하드코딩 절대 금지**: 모든 비즈니스 로직 상수는 `Enum`, 환경 변수는 `.env` 또는 `application.yml`에서 호출.
  - Controller는 요청/응답만 담당하며, 실제 로직은 Service 레이어에서만 작성.
- **토큰 최적화 및 답변 지침**:
  - 불필요한 서론/결론이나 주저리주저리 설명하는 텍스트는 생략할 것.
  - 코드를 수정할 때는 전체 파일을 다시 출력하지 말고, **변경된 함수나 블록만 간결하게 출력**할 것.

---

## 2. 도메인 지식 및 비즈니스 로직 (DOMAIN_KNOWLEDGE)
ERP/QMS 시스템 특유의 업무 프로세스와 특수 제약 조건을 정의합니다.

- **핵심 용어 사전**:
  - `Non-conformance`: 부적합 관리 (제품에 문제가 발생했을 때 기록하는 모듈)
  - `Audit`: 감사 관리 (제조사 품질 평가)
  - `Packaging Spec`: 포장사양서 (물류 기준)
- **업무 프로세스 및 제약 조건**:
  - **6-Step Workflow**: 문서 및 부적합 관리는 제조사 입력 필드(회수 일자 등) 데이터 입력 여부와 품질팀(Quality Team) 승인에 따라 **0~5단계로 상태가 자동 전환**되어야 함.
  - **포장/물류 제약**: 국내 및 핵심 유통망(OY 등)의 물류 규격은 **아주팔레트 1,100 x 1,100 mm**를 기본(Default) 검증 기준으로 시스템 로직에 내장할 것. 휴먼 에러 방지용.

---

## 3. 시스템 아키텍처 및 인프라 (ARCHITECTURE)
다수 접속 환경에서의 통신 구조와 배포 규격을 정의합니다.

- **데이터 흐름 (Data Flow)**:
  - Client -> Cloudflare Pages (Frontend / CDN) -> Hugging Face Spaces (Backend Docker, Port 7860) -> Supabase (Production DB).
- **배포 정규화 (CI/CD)**:
  - GitHub `main` 브랜치에 코드가 푸시되면 Cloudflare와 Hugging Face Webhook을 통해 자동으로 무중단 배포됨.
- **환경 변수 및 격리 기준 (Dev vs Prod)**:
  - **Local Dev**: 개발 중에는 본 서버에 영향을 주지 않도록 반드시 **로컬 H2 DB**(`spring.profiles.active=local`)를 사용.
  - **Production**: Supabase 연결.
  - 필수 환경 변수: `SPRING_DATASOURCE_URL`, `JWT_SECRET_KEY`, `VITE_API_BASE_URL` 등. (Github Secret 및 플랫폼 대시보드에서 관리).

---

## 4. 데이터베이스 및 API 규격 (SCHEMA & API_STANDARDS)
환각(Hallucination) 방지를 위한 엄격한 데이터 규칙입니다.

- **데이터 무결성 및 명명 규칙**:
  - **물리적 삭제(DELETE) 금지**: 모든 테이블은 `is_deleted` (boolean, 기본값 false)를 통한 Soft Delete 적용.
  - **명명 규칙**: DB Level은 Snake Case (`non_conformance`), App Level은 Camel Case (`nonConformance`).
  - **격리**: `sharedWithManufacturer` 플래그로 제조사별 데이터 노출 엄격히 통제.
- **문서 채번 시스템**:
  - 모든 문서는 `[모듈 접두사]-[YYYYMMDD]-[3자리 일련번호]` 규격을 따름 (예: `CLM-20260509-001`).
- **API 통신 표준**:
  - 응답 포맷: 성공/실패 시 일관된 JSON 구조 사용.
    ```json
    { "status": 200, "data": { ... }, "message": "Success", "timestamp": "2026-05-09T..." }
    ```
  - 인증/인가: 모든 API 요청 헤더에 `Authorization: Bearer <JWT_TOKEN>` 필수. 역할 기반(Admin, Quality, Manufacturer) 통제(`@PreAuthorize`).

---

## 5. 트러블슈팅 및 프롬프트 저장소 (PROMPT & KNOWN_ISSUES)
반복되는 문제 해결과 AI 성능 극대화를 위한 섹션입니다.

- **마스터 프롬프트 (Prompt Book)**:
  - 신규 화면/기능 개발 지시 시: *"QMS-AI-RULES.md를 기반으로, H2 로컬 DB에서 작동하는 [기능명] 모듈의 Service 로직과 React Component를 작성해. 변경된 코드 블록만 설명 없이 출력해."*
  - 문서화(주석) 지시 시: *"이 로직에 대해 Javadoc/JSDoc 주석을 추가하되, 영문 코드를 한국어로 설명하고 '왜(비즈니스적 근거)' 이 로직이 들어갔는지 명시해."*
- **알려진 이슈 및 해결책 (Known Issues)**:
  - **DB 연결 오류**: Supabase 환경 변수 누락 시 발생. Render/Hugging Face 대시보드 환경변수 및 로컬 `application-local.yml`의 H2 설정 분리 여부 확인.
  - **프론트엔드 API 호출 실패**: `VITE_API_BASE_URL`이 하드코딩 되어 있는지 확인. 반드시 `import.meta.env`를 통해 호출할 것.
  - **모바일 화면 깨짐**: AG Grid가 모바일에서 넘칠 경우 가로 스크롤(overflow-x-auto) 또는 모바일 전용 카드 리스트 뷰로 전환하도록 조치.
