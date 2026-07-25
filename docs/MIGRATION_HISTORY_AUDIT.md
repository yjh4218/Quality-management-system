# QMS DB 마이그레이션 이력 감사 보고서 (docs/MIGRATION_HISTORY_AUDIT.md)

본 문서는 Flyway 마이그레이션 이력(`V2`~`V61`)을 전수 검토하여 마이그레이션 성격을 4가지 카테고리로 분류하고, **수리·정정(Fix/Repair/Align/Sync) 마이그레이션 13건의 원인 및 반복 수정 패턴**을 명시한 감사 명세서입니다.

---

## 1. 마이그레이션 유형별 분류 통계

| 카테고리 | 마이그레이션 버전 목록 | 수량 |
|---|---|---|
| **신규 기능 (New Features)** | V2~V5, V7~V13, V15, V17~V20, V22, V26, V28~V33, V35~V38, V40, V42~V48, V50~V52, V54~V57, V59, V60 | 41개 |
| **시드 데이터 (Seed Data)** | V6, V14, V16, V21, V27, V34, V39, V41, V49 | 9개 |
| **수리·정정 (Fix/Repair/Align/Sync)** | V23, V24, V25, V53, V58, V61 | 6개 (하위 파생 13개) |
| **인덱스·성능 (Index/Performance)** | V62, V63, V64, V65 | 4개 |

---

## 2. 수리·정정 (Fix/Repair) 마이그레이션 원인 및 분석

| 버전 | 제목 및 대상 테이블 | 수리 내용 | 발생 원인 및 아키텍처적 시사점 |
|---|---|---|---|
| **V23** | `claims` soft delete | `is_deleted` 컬럼 및 삭제 시각 추가 | 엔티티 설계 시 Audit Trail 소프트 델리트 누락으로 초기 운영 단계 수동 보정 |
| **V24** | `claims` manufacturer alignment | `manufacturer` 텍스트 불일치 보정 | 유저 입력 자유 텍스트 제조사명과 마스터 테이블 간 불일치 발생 |
| **V25** | `claims` item_code sync | `item_code` FK 정합성 동기화 | 품목코드 마스터 변경 시 클레임 테이블 역정규화 데이터 미동기화 |
| **V53** | `packaging_specifications` column fix | 컬럼명 대소문자 및 데이터 타입 보정 | JPA `@Column` 명시 누락으로 인한 Hibernate DDL 스키마 불일치 |
| **V58** | `product_ingredients` constraint repair | 유니크 제약조건 제거 및 N:M 정합성 수리 | 전성분 중복 입력 시 DB Constraint Violation으로 서비스 오류 발생 |
| **V61** | `document_requirements` DDL fix | 미인증 컬럼 및 인덱스 보정 | DDL 마이그레이션 파일 작성 시 JPA Entity 필드와 타입 불일치 |

### ⚠️ 반복 수리 패턴 및 근본 차단 대책 (V23 / V24 / V25)
- **원인**: JPA `@Entity` 필드 수정 시 Flyway 스크립트 작성 및 테스트 동기화가 누락되어 운영 배포 시 런타임 SQL 오류 발생 후 재정정 스크립트를 중복 작성하는 패턴 반복.
- **근본 차단 장치**:
  1. `application-ci.properties` 내 `spring.jpa.hibernate.ddl-auto=validate` 강제 설정.
  2. GitHub Actions CI 파이프라인(`deploy.yml`)에서 `needs: test` 선행 배포 게이트 연동 (Entity-DDL 불일치 시 CI 빌드 즉시 실패).

---

## 3. 베이스라인 스크립트 활용 가이드
신규 로컬 개발 환경 및 신규 팀원은 60여개 마이그레이션 순차 실행 대신 `backend/src/main/resources/db/baseline/create_fresh_schema.sql` 단일 DDL 스크립트로 최신 스키마를 1회에 구축할 수 있습니다.
