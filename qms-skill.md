# QMS 개발 마스터 가이드 (qms-skill.md)

이 파일은 **'QMS 프로그램 개발 마스터'**로서 본 프로젝트의 모든 코드를 작성할 때 반드시 참조해야 하는 최상위 지침입니다.

## 1. 프로젝트 정체성 (Identity)
- **목적**: 700명의 사용자가 이용하는 유통사 특화 고성능 QMS 개발.
- **핵심 모듈**: 
  - 문서 관리 (Document Management)
  - 부적합 관리 (Non-conformance Management)
  - 감사 관리 (Audit Management)
- **개발 마스터 원칙**:
  - **비용 제로 (Spark Plan)**: 모든 기능은 Firebase 무료 범위 내에서 구현.
  - **데이터 무결성 최우선**: Soft Delete (`is_deleted` 플래그) 사용으로 감사 추적(Audit Trail) 보존.
  - **보안 강화**: RBAC(Admin, Quality Team, Manufacturer) 철저 준수 및 보안 키 관리.

## 2. 기술 사양 (Tech Stack)
- **Backend**: Spring Boot (Java), Spring Security (RBAC).
- **Frontend**: React (Vite), Tailwind CSS/Shadcn UI.
- **Database**: Firebase (Firestore/Storage), H2 (Local).
- **Deployment**: GitHub (Private Backup), Render/Supabase 연동.

## 3. 절대 준수 규칙 (Immutable Rules)
- **Zero-Cost Policy**: 모든 기능은 무료 범위 내에서 구현하며, 필요 시 프로그래밍적 우회 방식 사용.
- **6-Step Workflow**: 
  - 제조사 입력 필드(회수일자, 분석 등)의 유무에 따라 0~5단계 자동 상태 전환 로직 유지.
- **Security & Data Isolation**: 
  - `sharedWithManufacturer` 플래그를 통한 데이터 가시성 제어.
  - 파일 업로드 크기 5MB 제한 (Storage 관리).
- **Standardization (채번 시스템)**: 
  - 모든 문서는 표준 접두사 사용 (예: `CLM-YYYYMMDD-000`, `GRN-YYYYMMDD-000`).
- **Documentation & Maintenance (New Rule)**:
  - 모든 핵심 로직 및 UI 컴포넌트에 한국어 중심의 상세 주석(Javadoc/JSDoc) 필수 적용.
  - 신규 화면이나 기획 변경 시 `pageGuides.js`에 사용자용 도움말 콘텐츠를 즉시 반영.
- **UX/UI Focus**: 
  - 비동기 작업 시 Loading Spinner 및 Toast Notification 필수 적용.
  - 통합 도움말 버튼(💡)을 통한 실시간 안내 제공.

## 4. 파일 관리 전략
- 작업을 시작하기 전 본 가이드를 우선적으로 로드하여 일관된 코드를 작성할 것.
- `rules/qmsguide.md`의 시스템 헌법과 본 가이드의 내용을 상호 참조하여 개발할 것.
- 모든 코드 수정 및 신규 기능 구현은 위 원칙들을 위배해서는 안 됨.

## 5. Gemini 3 Flash 최적화 구현 가이드 (Agent Execution Strategy)
Gemini 3 Flash 모델이 계획을 정확하게 실행할 수 있도록, 모든 `implementation_plan.md` 및 작업 지시는 다음 형식을 준수해야 합니다.

- **원자적 작업 단위 (Atomic Tasks)**: 하나의 작업을 작은 단위(예: API 하나, UI 컴포넌트 하나)로 쪼개어 서술할 것.
- **명확한 코드 컨텍스트 (Explicit Code)**: 수정이 필요한 파일명, 함수명, 라인 번호 및 교체할 정확한 코드 스니펫을 계획서에 포함하여 모델의 추측을 방지할 것.
- **단계별 로직 검증 (Step-by-Step Validation)**: 각 단계 완료 후 실행해야 할 구체적인 테스트 명령어(예: `./mvnw test`, `npm run build`) 또는 브라우저 확인 절차를 명시할 것.
- **예외 상황 선제적 대응 (Defensive Planning)**: 발생 가능한 오류(예: API 응답 지연, DB 제약 조건 위반)와 대응책을 계획에 포함할 것.
- **의존성 순서 준수**: DB 스키마 -> 백엔드 API -> 프론트엔드 API 연결 -> UI 구현 순으로 의존성 순서에 따라 작업할 것.

