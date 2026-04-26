---
title: qms
emoji: 🚀
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# Quality Management System (QMS)

이 프로젝트는 백엔드(Spring Boot)와 프론트엔드(React + Vite)로 구성된 내부 관리 시스템입니다.

## 기술 스택
- **Backend**: Java, Spring Boot, Spring Security, JPA, Hibernate, H2/MySQL
- **Frontend**: React, Vite, Axios, AG Grid

## 로컬 실행 방법

### 백엔드 (Backend)
```bash
cd backend
./mvnw spring-boot:run
```
---
title: qms
emoji: 🚀
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

### 프론트엔드 (Frontend)
```bash
cd frontend
npm install
npm run dev
```
- 기본 포트: 5173

## 외부 접속 및 배포 설정

### 1. GitHub 연동
로컬의 코드를 GitHub에 올리려면 다음 명령어를 사용하세요:
```bash
git remote add origin [본인의-리포지토리-URL]
git branch -M main
git push -u origin main
```

### 2. 클라우드 배포 (컴퓨터가 꺼져도 유지됨)
컴퓨터가 꺼져도 외부에서 접속 가능하게 하려면 클라우드 서비스를 사용해야 합니다.

#### 권장 서비스:
- **Render (render.com)**: 백엔드/프론트엔드 모두 배포 가능 (무료 플랜 제공)
- **Railway (railway.app)**: 설정이 매우 간편함

#### 배포 시 주의사항:
- 프론트엔드 배포 시 환경 변수 `VITE_API_BASE_URL`에 배포된 백엔드 API 주소를 설정해야 합니다.
- 백엔드 배포 시 데이터베이스 설정을 클라우드 DB에 맞춰 업데이트해야 합니다.

## 라이선스
이 프로젝트는 개인 개발용입니다.
