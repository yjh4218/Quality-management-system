# 🗂️ QMS 개발 가이드 인덱스 (INDEX.md)

> **이 파일의 목적**: QMS 프로젝트의 모든 규칙과 가이드 문서를 한 곳에서 참조할 수 있는 마스터 인덱스.  
> **AI 에이전트 사용 순서**: 작업 시작 전 반드시 이 파일을 먼저 읽고, 해당 작업과 관련된 가이드를 추가로 로드할 것.

---

## 📁 가이드 문서 목록

| 파일명 | 내용 | 언제 참조하는가 |
|--------|------|----------------|
| `qmsguide.md` | **시스템 헌법** (최상위 원칙) | 항상, 가장 먼저 |
| `qms-skill.md` | 개발 마스터 지침 | 항상, 두 번째로 |
| `deployment.md` | 배포 가이드 (HuggingFace/Cloudflare) | 배포, 환경 설정, 플랫폼 전환 시 |
| `ui-ux-guide.md` | UI/UX 표준 (화면 구조, React 패턴) | 신규 화면 개발, 컴포넌트 수정 시 |
| `security-guide.md` | 보안 가이드 (Spring Security, JWT) | 인증/인가, API 보안, 권한 설정 시 |
| `comment-guide.md` | 주석 표준 (Javadoc/JSDoc) | 코드 작성 및 수정 시 항상 |
| `data-api-guide.md` | 데이터 모델 & API 설계 표준 | Entity, DTO, API 신규 설계 시 |

---

## 🏗️ 프로젝트 구조 요약

```
Quality-management-system/
├── backend/                  # Spring Boot (Java)
│   └── src/main/java/
│       ├── config/           # Security, CORS, JWT 설정
│       ├── controller/       # REST API 엔드포인트
│       ├── service/          # 비즈니스 로직
│       ├── repository/       # JPA Repository
│       ├── entity/           # DB Entity
│       ├── dto/              # Request/Response DTO
│       └── security/         # JWT 필터, UserDetails
├── frontend/                 # React + Vite
│   └── src/
│       ├── pages/            # 페이지 컴포넌트 (라우팅 단위)
│       ├── components/       # 재사용 컴포넌트
│       ├── hooks/            # 커스텀 훅
│       ├── services/         # API 호출 (axios)
│       ├── constants/        # 상수 (pageGuides.js 등)
│       └── utils/            # 유틸리티
├── Dockerfile                # HuggingFace 배포용
├── render.yaml               # Render.com 배포용 (대안)
├── rules/                    # 가이드 문서 폴더
│   ├── INDEX.md              # ← 이 파일
│   ├── qmsguide.md
│   ├── qms-skill.md
│   ├── deployment.md
│   ├── ui-ux-guide.md
│   ├── security-guide.md
│   ├── comment-guide.md
│   └── data-api-guide.md
└── README.md
```

---

## ⚡ 작업 유형별 필수 참조 가이드

### 신규 화면(페이지) 개발

```
1. qmsguide.md        → 개발 원칙 확인
2. ui-ux-guide.md     → 화면 구조, 컴포넌트 패턴
3. comment-guide.md   → JSDoc 주석 작성
4. data-api-guide.md  → API 호출 패턴
```

### 신규 API 개발 (백엔드)

```
1. security-guide.md  → 권한 설정 (@PreAuthorize)
2. data-api-guide.md  → Entity, DTO, URL 패턴
3. comment-guide.md   → Javadoc 주석 작성
```

### 배포 / 환경 설정 변경

```
1. deployment.md      → 플랫폼별 배포 절차
2. security-guide.md  → 환경변수(Secrets) 설정 확인
```

### 보안 기능 수정

```
1. security-guide.md  → RBAC, JWT, CORS 전체 검토
2. qmsguide.md        → 보안 원칙 재확인
```

---

## ✅ 개발 전 체크리스트

```
□ 이 INDEX.md 로드 완료
□ qmsguide.md 핵심 원칙 확인 (Zero-Cost, Soft Delete, RBAC)
□ 작업 유형에 해당하는 가이드 추가 로드
□ 신규 기능: Zero-Cost 정책 위반 여부 확인
□ 신규 API: @PreAuthorize 권한 설정 적용
□ 신규 화면: ui-ux-guide.md 화면 구조 준수
□ 신규 화면: pageGuides.js 도움말 콘텐츠 추가
□ 코드 작성: comment-guide.md 주석 표준 적용
□ 배포 전: security-guide.md 보안 체크리스트 확인
```

---

## 🔑 핵심 상수 참조

| 항목 | 값 | 위치 |
|------|-----|------|
| 백엔드 포트 (HuggingFace) | `7860` | Dockerfile |
| 백엔드 포트 (로컬) | `8080` | application.properties |
| 프론트엔드 포트 (로컬) | `5173` | vite.config.js |
| 파일 업로드 최대 크기 | `5MB` | ClaimConstants.java |
| JWT 만료 시간 | `12시간` | application-prod.properties |
| 그리드 기본 페이지 크기 | `100건` | ui-ux-guide.md |
| 워크플로우 최대 단계 | `5단계 (0~5)` | ClaimConstants.java |

---

## 📝 가이드 문서 업데이트 원칙

1. 새로운 기술 결정이 내려지면 **즉시** 해당 가이드 문서 업데이트
2. 배포 플랫폼 변경 → `deployment.md` 업데이트
3. 신규 UI 패턴 도입 → `ui-ux-guide.md` 업데이트
4. 신규 권한 역할 추가 → `security-guide.md` 업데이트
5. 이 INDEX.md의 파일 목록도 함께 최신화
