# 🚀 QMS 배포 가이드 (deployment.md)

**목적**: 백엔드(Spring Boot)와 프론트엔드(React)의 배포 플랫폼을 표준화하고, 플랫폼 전환 시에도 일관된 절차로 배포할 수 있도록 정의한 가이드.  
**현재 운영 구성**: 백엔드 → Hugging Face Spaces (Docker), 프론트엔드 → Cloudflare Pages  
**자동 배포**: `main` 브랜치 push 시 각 플랫폼에서 자동 빌드·배포 트리거됨

---

## 1. 전체 아키텍처 개요

```
[개발자 로컬]
      │
      │  git push origin main
      ▼
[GitHub Repository]
  yjh4218/Quality-management-system
      │
      ├─── 백엔드 자동 배포 ──▶ [Hugging Face Spaces]
      │       Dockerfile 기반     포트: 7860
      │       Spring Boot JAR     URL: https://{space-name}.hf.space
      │
      └─── 프론트엔드 자동 배포 ▶ [Cloudflare Pages]
              npm run build        URL: https://{project}.pages.dev
              frontend/dist
```

---

## 2. 백엔드 배포: Hugging Face Spaces

### 2-1. 최초 설정 (최초 1회)

1. **huggingface.co** 로그인 → **New Space** 클릭
2. **Space 설정**:
   - **Space name**: `quality-management-system` (또는 원하는 이름)
   - **SDK**: `Docker`
   - **Visibility**: `Private` (내부 시스템이므로 반드시 Private 권장)
3. **GitHub 연동**:
   - Space → **Settings** → **Repository** 탭
   - **"Link to GitHub Repository"** 에서 `yjh4218/Quality-management-system` 연결
   - **Branch**: `main`
4. **환경 변수 설정** (Space → Settings → Variables and secrets):

| Key | Value | 비고 |
| :--- | :--- | :--- |
| **SPRING_PROFILES_ACTIVE** | `prod` | 운영 프로필 활성화 |
| **SUPABASE_URL** | `jdbc:postgresql://xxx.supabase.co:5432/postgres` | Secret으로 등록 |
| **SUPABASE_USERNAME** | `postgres.xxx` | Secret으로 등록 |
| **SUPABASE_PASSWORD** | `실제비밀번호` | Secret으로 등록 |
| **JWT_SECRET** | `{랜덤 256bit 값}` | Secret으로 등록 (Security) |
| **CORS_ALLOWED_ORIGINS** | `https://{project}.pages.dev` | Cloudflare Pages 프론트 도메인 |

### 2-2. Dockerfile 구조 이해

```dockerfile
# 1단계: Maven 빌드 (openjdk-17 기반)
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app/backend
RUN mvn clean package -DskipTests
 
# 2단계: 실행 이미지 (경량)
FROM openjdk:17-jdk-slim
EXPOSE 7860
ENTRYPOINT ["java", "-Xmx512m", \
  "-Dspring.profiles.active=prod", \
  "-Dserver.port=7860", \
  "-jar", "app.jar"]
```

> [!WARNING]
> **포트 규격**: Hugging Face Spaces는 컨테이너 외부 노출 시 반드시 내부 포트 `7860`을 사용해야 합니다. 다른 포트로 변경 시 헬스체크 및 라우팅이 실패합니다.

### 2-3. 자동 배포 흐름

```
git push origin main
     │
     ▼
Hugging Face가 GitHub Webhook 수신
     │
     ▼
Docker 이미지 빌드 (Dockerfile 실행)
     │
     ▼
Spring Boot 앱 기동 (포트 7860)
     │
     ▼
Health Check: GET /api/admin/system/health → 200 OK
```

### 2-4. 배포 확인 방법

```bash
# Hugging Face Space URL에서 헬스체크 호출
curl https://{space-name}.hf.space/api/admin/system/health

# 응답 예시
{"status": "UP", "profile": "prod"}
```

---

## 3. 프론트엔드 배포: Cloudflare Pages

### 3-1. 최초 설정 (최초 1회)

1. **dash.cloudflare.com** → **Pages** → **Create a project**
2. **GitHub 연결** → 리포지토리 `yjh4218/Quality-management-system` 선택
3. **빌드 설정**:

| 항목 | 값 |
| :--- | :--- |
| **Production branch** | `main` |
| **Root directory** | `frontend` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Node.js version** | `20.x` |

4. **환경 변수 설정** (Settings → Environment variables):

| Key | Value | 환경 |
| :--- | :--- | :--- |
| **VITE_API_BASE_URL** | `https://{space-name}.hf.space/api` | Production |
| **VITE_API_BASE_URL** | `http://localhost:8080/api` | Preview (PR/브랜치 테스트용) |

### 3-2. 자동 배포 흐름

```
git push origin main
     │
     ▼
Cloudflare Pages가 GitHub Webhook 수신
     │
     ▼
cd frontend && npm ci && npm run build
     │
     ▼
dist/ 폴더를 CDN에 배포
     │
     ▼
SPA 라우팅: /* → /index.html (rewrite 규칙 자동 적용)
```

### 3-3. 배포 확인 방법
- Cloudflare Pages 대시보드 → 배포 로그 확인
- 배포 완료된 도메인 접속: `https://{project-name}.pages.dev`

---

## 4. 플랫폼 전환 가이드 (이식성 확보)

배포 플랫폼은 인프라 환경 변화에 따라 언제든지 변경될 수 있습니다. 다음 체크리스트에 따라 전환을 수행하십시오.

### 4-1. 백엔드 플랫폼 전환 시 체크리스트

* [ ] 새 플랫폼의 포트 정책 확인 후 Dockerfile `EXPOSE` 및 `ENTRYPOINT` 포트 수정
* [ ] 데이터베이스 자격증명 및 JWT 환경 변수(Secrets) 새 플랫폼에 재등록
* [ ] `application-prod.properties`의 DB URL, CORS 설정 확인
* [ ] Health Check 경로(`/api/admin/system/health`) 새 플랫폼 모니터링에 등록
* [ ] 프론트엔드의 `VITE_API_BASE_URL` 새 API 서버 URL로 업데이트 후 재배포

#### 🌐 주요 플랫폼별 포트 및 특이사항

| 플랫폼 | 포트 | 특이사항 |
| :--- | :--- | :--- |
| **Hugging Face Spaces** | `7860` | Docker SDK 필수, Private Space 권장 |
| **Render.com** | `10000` (내부) | `render.yaml` 사용 가능, `PORT` 환경변수 자동 주입 |
| **Railway.app** | 동적 할당 | `$PORT` 환경변수 사용 |
| **Fly.io** | `8080` | `fly.toml` 설정 필요 |

### 4-2. 프론트엔드 플랫폼 전환 시 체크리스트

* [ ] 새 플랫폼에 GitHub 연결 및 빌드 명령어 설정 (`npm run build`, `dist` 폴더 지정)
* [ ] `VITE_API_BASE_URL` 환경 변수 등록
* [ ] SPA 라우팅 설정 (`/*` → `/index.html` 리다이렉션) 적용 여부 확인
* [ ] CORS: 새 프론트 도메인을 백엔드 `CORS_ALLOWED_ORIGINS`에 추가 및 배포

---

## 5. 로컬 개발 환경

```bash
# 백엔드 실행
cd backend
./mvnw spring-boot:run
# → http://localhost:8080

# 프론트엔드 실행
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 로컬 환경 변수 (.env.local - 절대 커밋 금지)
```env
# frontend/.env.local
VITE_API_BASE_URL=http://localhost:8080/api
```

---

## 6. Git 브랜치 전략 및 배포 트리거

```
main ─────────────────────────────── (자동 배포 트리거)
  │
  ├── feature/기능명  (개발 작업)
  ├── fix/버그명      (버그 수정)
  └── hotfix/긴급수정 (긴급 패치)
```

* `main` push → 자동 배포 (Hugging Face + Cloudflare Pages 동시 트리거)
* `feature/*`, `fix/*` 브랜치는 PR 머지 전까지 운영 환경에 배포되지 않음
* **사용자 명시 요청 시에만** `git push origin main` 실행

### 커밋 메시지 형식
`[type]: [간결한 설명] (한국어 가능)`

* **feat**: 부적합 관리 Excel 다운로드 기능 추가
* **fix**: JWT 만료 시 무한 루프 오류 수정
* **refactor**: ClaimService 조회 쿼리 최적화
* **docs**: deployment.md 배포 가이드 업데이트

---

## 7. 배포 트러블슈팅

| 증상 | 원인 | 해결 방법 |
| :--- | :--- | :--- |
| **HF Space가 무한 빌드 중** | Dockerfile 빌드 실패 | HF Space 로그 확인, `mvn clean package` 오류 분석 |
| **401 Unauthorized API 응답** | CORS 또는 JWT 설정 오류 | `CORS_ALLOWED_ORIGINS` 및 `JWT_SECRET` 환경변수 확인 |
| **프론트 빈 화면 (흰 화면)** | `VITE_API_BASE_URL` 미설정 | Cloudflare Pages 환경변수 확인 후 재배포 |
| **Health Check 실패** | Spring Boot 기동 실패 | HF 로그에서 `APPLICATION FAILED TO START` 메시지 확인 |
| **DB 연결 오류** | Supabase 환경변수 누락/오류 | Secrets 재등록 후 Space restart |
