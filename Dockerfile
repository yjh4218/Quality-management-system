# 1단계: 빌드 스테이지 (Maven 사용)
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app

# 프로젝트 파일 복사 (backend 폴더가 있는 구조 반영)
COPY backend/pom.xml ./backend/
COPY backend/src ./backend/src

# backend 폴더로 이동하여 빌드 실행 (테스트는 건너뜀)
WORKDIR /app/backend
RUN mvn clean package -DskipTests

# 2단계: 실행 스테이지 (JRE만 포함하여 가볍게 구성)
FROM openjdk:17-jdk-slim
WORKDIR /app

# 빌드 스테이지에서 생성된 jar 파일만 가져오기
COPY --from=build /app/backend/target/*.jar app.jar

# Hugging Face용 포트 설정
EXPOSE 7860

# 메모리 최적화 및 실행 설정
ENTRYPOINT ["java", "-Xmx512m", "-Dserver.port=7860", "-jar", "app.jar"]
