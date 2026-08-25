# 1단계: 빌드 스테이지 (Maven 환경)
# 이 단계에서는 소스 코드를 컴파일하고 실행 가능한 JAR 파일을 생성합니다.
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app

# 백엔드 프로젝트 pom.xml 복사 및 의존성 캐싱
COPY backend/pom.xml ./backend/
WORKDIR /app/backend
RUN mvn dependency:go-offline -B

# 백엔드 소스 파일 복사 및 컴파일
WORKDIR /app
COPY backend/src ./backend/src
WORKDIR /app/backend
RUN mvn clean package -DskipTests

# 2단계: 실행 스테이지 (JRE 경량 환경)
# 실제 운영 환경에서 실행될 최적화된 이미지입니다.
FROM openjdk:17-jdk-slim
WORKDIR /app

# [AWT/폰트 지원] 엑셀/PDF 그래픽 렌더링을 위한 폰트 라이브러리 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    libfreetype6 \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# [보안] 루트(root) 권한 실행 방지를 위한 일반 사용자 생성
# 컨테이너 침해 사고 시 호스트 시스템으로의 권한 상승을 차단합니다.
RUN useradd -m -s /bin/bash qmsuser

# 빌드 스테이지에서 생성된 JAR 파일만 복사
COPY --from=build /app/backend/target/*.jar app.jar

# [보안] 파일 업로드 디렉토리 사전 생성 (qmsuser 전환 전에 root 권한으로 생성)
RUN mkdir -p /app/uploads && chown -R qmsuser:qmsuser /app/uploads

# [보안] 파일 소유권을 일반 사용자에게 할당
RUN chown qmsuser:qmsuser app.jar

# [보안] 컨테이너 실행 유저를 qmsuser로 변경
USER qmsuser

# 외부 노출 포트 설정 (Hugging Face / Render 표준)
EXPOSE 7860

# 애플리케이션 실행 설정
# -Xmx512m: 메모리 제한 설정
# -Djava.awt.headless=true: 서버 그래픽 환경 활성화
# -Dspring.profiles.active=prod: 운영 프로필 활성화
ENTRYPOINT ["java", "-Xmx512m", "-Djava.awt.headless=true", "-Dspring.profiles.active=prod", "-Dserver.port=7860", "-jar", "app.jar"]
