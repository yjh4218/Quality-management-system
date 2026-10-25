# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# QMS Program Development Master Info

## 🎭 Persona & Role
- **Name**: QMS Program Development Master (Antigravity)
- **Role**: Full-stack Developer & Architect for QMS/ERP systems.
- **Ruleset**: Strictly follow [QMS-AI-RULES.md](file:///e:/AI/internal-management-system/rules/QMS-AI-RULES.md) for all coding and architecture decisions.

## 🛠 Tech Stack
- **Frontend**: React 18 (Vite), MUI (@mui/material), AG Grid (Theme: legacy), Emotion, Recharts, React-Toastify, Standard Inline Styles & Design Tokens (`index.css`).
  - ⚠️ **Tailwind CSS 미사용**: 빌드 환경에 Tailwind 컴파일러가 없으므로 `className="grid grid-cols-6 ..."` 등 Tailwind 클래스 단독 작성을 절대 금지하며, `ControlledDocumentManagementPage.jsx`와 동일하게 인라인 스타일(`style={{ ... }}`)을 필수로 사용함.
- **Backend**: Java 17 (Spring Boot), Spring Security, H2 (Local) / Supabase (Prod).
- **Infrastructure**: Cloudflare Pages (Frontend), Hugging Face Spaces (Backend).

## 🚀 Operating Principles (Token Efficiency Protocol)
1. **Context Management**: This file and `QMS-AI-RULES.md` are the 'Single Source of Truth'.
2. **Surgical Precision**: Edit specific files/blocks only. No broad refactors without approval.
3. **Pattern-based Scaling**: Reuse existing patterns (6-Step Workflow, Soft Delete) to minimize token usage.
4. **Output Format**: Concise, executable code, only changed blocks.

## 🎨 Mandatory UI/UX Standards (모든 신규/수정 화면 절대 준수 규격)
1. **3-Tier Header**: 1행(타이틀 + CSV/새로고침/등록 버튼), 2행(규제 정합 요약 설명문), 3행(`RegulatoryManualBanner`).
2. **KPI Summary Cards**: `display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px'`, 카드 좌측 컬러 보더(`borderLeft: '4px solid ...'`).
3. **Search Filter Card**: 3~4열 반응형 그리드, 각 입력란 상단 굵은 라벨, 하단 바에 `[♻️ 초기화]` outline 버튼 먼저, `[🔍 조회]` Primary 버튼 끝에 배치.
4. **AG Grid Table**: `theme="legacy"`, `rowHeight={54}`, `headerHeight={48}`, 상단 총 건수 및 CSV 내보내기, 우측 핀 액션 컬럼 알약 버튼.
5. **Maximized Modal**: `width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh'`, 고정 헤더, 스크롤 바디, 고정 푸터(`[취소]` outline 좌측, `[저장/확인]` Primary 우측), `react-toastify` 알림.

## 🏗 QMS Specific Guidelines
- **Soft Delete**: Use `is_deleted` flag for all tables.
- **Serial Numbering**: `[PREFIX]-[YYYYMMDD]-[000]` (e.g., CLM-20260509-001).
- **6-Step Workflow**: Automate status transitions (0-5) based on data entry and approval.
- **Logistics Constraint**: Default validation for 1,100 x 1,100 mm pallets.
- **Flyway Migration**: Every entity schema/field modification MUST include a corresponding V__<name>.sql script inside db/migration to avoid production database schema mismatch.

## 📊 Development Status
- **Current Ruleset**: Established `QMS-AI-RULES.md` as the absolute standard.
- **Database**: Local development uses H2 (`spring.profiles.active=local`), production uses Supabase.
- **Recent Work**: 
  - **통합 eQMS 구축 로드맵 (00~21단계 전원 ✅ 100.0% 완결! 프로덕션 운영 인가 완료)**:
    - Step 00~01: 기준선 수립 및 회귀 테스트 프레임워크 구축.
    - Step 02: Flyway 체크섬 검증 복원 및 감사로그 물리 삭제 제거 (`V131`).
    - Step 03: OriginRefererGuardFilter(DEC-08) 및 기밀 품질파일 비인가 차단(D-1, D-2 해결).
    - Step 04: 감사추적 동기 트랜잭션 전환(유실률 0%), SHA-256 무결성 해시, 스냅샷 덮어쓰기 폐지 (`V132`).
    - Step 05: 출하 부적합 차단 가드, 클레임 미완료 종결 차단 가드 (D-3, D-4, D-5 해결).
    - Step 06: 의료기기 제품 마스터(`MedicalDeviceProduct`) 및 표준 업무 매뉴얼 메뉴/배너 신설 (`V133`).
    - Step 07: 통제문서 및 개정관리(DMS) 6단계 수명주기, 개정 자동대체, 전면 최대화 팝업 (`V134`).
    - Step 08: 교육훈련 및 자격관리(ISO 13485 §6.2/ISO 22716 §3) 과정 마스터, 이수평가, 효과성 검증, 직무자격 매트릭스, 전면 최대화 팝업 (`V135`).
    - Step 09: 위험관리(ISO 14971:2019/ISO 13485 §7.1) 위해요인 3계층 모델, 5x5 FMEA 전/후 위험 매트릭스, 잔여위험 종합 수용성 평가, 표준 UI/UX 완벽 정합 (`V136`).
    - Step 10: 의료기기 설계개발 & DHF (ISO 13485:2016 §7.3 / 21 CFR 820.30) 6단계 라이프사이클, DHF 편성, RTM 양방향 추적성 매트릭스, 단계 게이트 심의, 표준 UI/UX 4종 모달 (`V137`).
    - Step 11: 변경관리 (Change Control - ISO 13485:2016 §7.3.9 / ISO 22716:2007 §11 / 21 CFR 820.70) 5분류 영향평가, CCB 심의의결, 4단계 효과성 평가, 실행과제 추적, 표준 UI/UX 4종 모달 (`V138`).
    - Step 12: 공급업체·위탁제조 관리 (Supplier & Contract Manufacturer Management - ISO 13485:2016 §4.1.5, §7.4 / ISO 22716 §12 / 21 CFR 820.50) 공급업체 적격성(ASL), 4대 영역 종합평가, QAA 품질협약 체결/법정보존, 표준 UI/UX 4종 모달 (`V139`).
    - Step 13: 외부연계 및 추적성 (Traceability & External Integration - ISO 13485:2016 §7.5.8 / ISO 22716 §8.3 / 21 CFR 820.65 / DEC-02) 전공정 LOT 양방향 추적성 매트릭스, ERP/WMS 수기 대사, GS1 UDI 바코드 식별, 표준 UI/UX 4종 모달 (`V140`).
    - Step 14: 입고·검사·출하승인·NCR (Non-Conformance & Release Controls - ISO 13485:2016 §8.3 / ISO 22716:2007 §8.4 / 21 CFR 820.90 / DEC-09) 독립 NCR 모듈 신설, 5-Why 원인분석, 특채/재작업 통제, 격리(HOLD), 출하승인 게이트 연계, 표준 UI/UX 4종 모달 (`V141`).
    - Step 15: 고객 불만 및 시판 후 이상사례 평가 (Complaints & Adverse Events Management - ISO 13485:2016 §8.2.2 / ISO 22716:2007 §10 / 21 CFR 820.198 / 화장품법 제5조의2 / DEC-09) D-9 결함 해소(LOT 미상 접수 허용 및 Claim 0~5단계 100% 보존), WHO-UMC 6단계 인과관계 심의, 식약처 15일 신속보고 자동 기한 산출, 21 CFR 820.198(b) 조사미실시 정당화 사유 강제, 조치과제 관리, 표준 UI/UX 5종 전면 최대화 모달 (`V142`).
    - Step 16: 시정 및 예방조치 (CAPA - ISO 13485:2016 §8.5.2, §8.5.3 / 21 CFR 820.100) 5대 품질 결함 소스(NCR, Claim, Audit, Change, Deviation) 통합 연계, 5-Why & Fishbone 6M 다이어그램 근본원인 분석, CAPA 조치과제 CRUD 및 유효성 검증, 21 CFR 820.100 종결 차단 가드 2종, 5종 전면 최대화 모달 (`V143`).
    - Step 17: 규제보고(Vigilance) 및 제품 회수(Product Recall) 관리 (MFDS 의료기기법 제31조/화장품법 제5조의2, FDA 21 CFR 803 MDR/21 CFR 7, EU MDR 2017/745 Art.87) 국가별 법정 보고 기한 자동산출(MFDS 7/15/30일, FDA 5/30일, EU MDR 2/10/15일), 회수 수량 100% 대사(출고=회수+격리+폐기+미회수) 불일치 종결 원천 차단 가드, 4종 전면 최대화 모달 (`V144`).
    - Step 18: 시설·설비, 교정 및 청정환경 관리 (Facility, Equipment Calibration & Maintenance Management - ISO 13485:2016 §6.3, §6.4, §7.6 / ISO 22716:2007 §4, §5 / 21 CFR 820.70(g), 820.72) 장비 마스터 원장, 국가공인(KOLAS) 교정 주기 관리 및 소급성 표준물질 연계, 교정 불합격(FAIL) 시 장비 즉시 격리(OUT_OF_SERVICE) 및 소급 품질 영향평가 가드, 정기 예방보전(PM) 주기/부품교체/다운타임 추적, 청정실(Grade C/D) 온습도/차압/부유미립자/미생물(CFU) 모니터링, 표준 UI/UX 4종 전면 최대화 모달 (`V145`).
    - Step 19: 내부심사·자체점검 및 경영검토 관리 (Internal Audit, Self-Inspection & Management Review - ISO 13485:2016 §8.2.4, §5.6 / ISO 22716:2007 §13 / ISO 19011:2018 / 21 CFR 820.20, 820.22) 연간 내부심사 및 화장품 자체점검 계획·실시·보고, 심사원 독립성 가드(피심사부서=심사원부서 등록 차단), 조항별 체크리스트 실사 평가, 지적사항(Finding) 원장 및 Critical/Major 부적합 CAPA 의무 연계 차단 가드, 최고경영자 12대 입력요소 및 3대 출력 의결사항 경영검토 회의록, 6대 반응형 KPI, SOP-IA-01 절차서 배너, 표준 UI/UX 4종 전면 최대화 모달 (`V146`).
    - Step 20: 공식 원본 및 전자서명 정책 (Electronic Signatures & Official Records Policy - FDA 21 CFR Part 11 / EU GMP Annex 11 / DEC-01) 21 CFR §11.200 비밀번호 2차 재인증 가드 (대리 서명 방지), SHA-256 서명 무결성 해시 및 JSON 매니페스트 블록 동기 생성, 서명 철회 관리, 21 CFR Part 11 조항별(§11.10~§11.300) 적합성 자가평가 매트릭스 CRUD, DEC-01 하이브리드 공식 원본 및 10년 보존 정책 규정 CRUD, 하이브리드 인쇄용 서명 매니페스트 뷰어, 6대 반응형 KPI, SOP-DEC-01 절차서 배너, 표준 UI/UX 4종 전면 최대화 96vw×92vh 모달 (`V147`).
    - Step 21: CSV 밸리데이션 및 운영 승인 (CSV & Go-Live Authorization - GAMP 5 / FDA 21 CFR Part 11 / ISO 13485:2016 §4.1.6 / EU GMP Annex 11) GAMP 5 Cat.4(설정 가능)/Cat.5(커스텀) V-모델 수명주기, IQ/OQ/PQ 프로토콜 원장 및 실행 판정(13개 시드 기본 탑재), 결함 및 잔여 리스크 관리, Guard 1(미완료 프로토콜 및 Critical/Major 미해결 결함 시 Go-Live 차단), Guard 2(시스템소유자/QA책임자/최고경영자 3자 필수 전자서명 충족 시에만 OPERATIONAL 가동 전환), VSR 종합보고서, 6대 반응형 KPI, SOP-CSV-01 절차서 배너, 표준 UI/UX 4종 전면 최대화 96vw×92vh 모달 (`V148`). 단위테스트 8건 및 E2E 14건 100% 통과!

## ✅ Review Checklist
- [x] Adherence to `QMS-AI-RULES.md` & `CLAUDE.md` UI/UX Standards
- [x] No Uncompiled Tailwind Classes (Pure Inline Styles & CSS Tokens only)
- [x] No Hardcoding (Enums/Env only)
- [x] Soft Delete Implementation
- [x] Standard UI/UX & Responsive Maximized Popup Modals (96vw × 92vh)
- [x] AG Grid `theme="legacy"` & `rowHeight={54}`
- [x] Robust Error Handling & Loading States with `react-toastify`
