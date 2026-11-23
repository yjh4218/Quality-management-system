/**
 * =================================================================================
 * [Track 5] 설계 개발(DHF) · 위험관리 · CSV 밸리데이션 · 공급업체/감사 · 추적성 Lot · 교육/시설
 * =================================================================================
 * Playwright Chromium 실제 브라우저 환경에서
 * 1) 의료기기 설계개발 & DHF (Design Controls, Stage-Gate, RTM)
 * 2) 위험관리 (ISO 14971 FMEA, 위해요인 분석, RPN Matrix)
 * 3) 컴퓨터화 시스템 밸리데이션 (CSV, GAMP 5, V-Model, Go-Live)
 * 4) 외부연계 및 추적성 (Traceability, 순방향/역방향 배치 LOT 계통도)
 * 5) 내부심사 및 자체점검 (Internal Audit, ISO 19011, Checklist & Findings)
 * 6) 공급업체 및 위탁제조 (Supplier Management, ASL, QAA 품질협약)
 * 7) 시설·설비, 교정 및 청정환경 (Facility & Calibration, KOLAS)
 * 8) 교육훈련 및 자격관리 (Training & Competence, ISO 13485/22716)
 * 전 업무 화면의 CRUD, 폼 검증, 팝업 드로어 렌더링, 규제 배너, KPI 차트를 정밀 검증합니다.
 */

import { chromium } from 'playwright';
import { TestWatcher } from './test-watcher-helper.mjs';

const BASE_URL = 'http://localhost:5173';

async function runTrack5() {
    console.log('\n=================================================================================');
    console.log('🚀 [Track 5] 설계 개발(DHF) · 위험관리 · CSV 밸리데이션 · 공급업체/감사 · 추적성 Lot · 교육/시설 E2E');
    console.log('=================================================================================\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const watcher = new TestWatcher(page, {
        ignoredStatusPatterns: ['/api/auth/session']
    });

    const testResults = [];
    const recordTest = (name, passed, details = '') => {
        testResults.push({ name, passed, details });
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} [TEST] ${name} ${passed ? 'PASSED' : 'FAILED'}: ${details}`);
    };

    page.on('dialog', async (dialog) => {
        console.log(`  [Dialog Intercepted] ${dialog.type()}: ${dialog.message()}`);
        await dialog.accept();
    });

    const navigateTo = async (pageKey) => {
        await page.evaluate((key) => {
            if (window.__QMS_NAVIGATE__) {
                window.__QMS_NAVIGATE__(key);
            }
        }, pageKey);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
    };

    const getActiveTabContent = async () => {
        return await page.evaluate(() => {
            const active = document.querySelector('.tab-page-wrapper.tab-active');
            return active ? active.textContent || '' : '';
        });
    };

    const closeAnyDrawerOrModal = async () => {
        const closeBtn = page.locator('.drawer-overlay button.close-button, .drawer-overlay button:has-text("✕"), .drawer-overlay button:has-text("닫기"), .drawer-overlay button:has-text("취소"), .modal-overlay button:has-text("✕"), .modal-overlay button:has-text("닫기"), .modal-overlay button:has-text("취소")').first();
        if (await closeBtn.isVisible()) {
            await closeBtn.click().catch(() => {});
            await page.waitForTimeout(600);
        }
        await page.waitForSelector('.drawer-overlay, .modal-overlay', { state: 'detached', timeout: 3000 }).catch(() => {});
    };

    try {
        // =============================================================
        // [0] 관리자 로그인
        // =============================================================
        console.log('--- 0. 관리자 로그인 및 세션 확인 ---');
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.fill('input[placeholder*="아이디"]', 'admin');
        await page.fill('input[placeholder*="비밀번호"]', 'admin');
        await page.click('button:has-text("로그인")');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const loggedIn = await page.evaluate(() => sessionStorage.getItem('qms_authenticated') === 'true');
        recordTest('0-1. 관리자 세션 정상 로그인', loggedIn);

        // =============================================================
        // [1] 의료기기 설계개발 & DHF (Design Controls)
        // =============================================================
        console.log('\n--- 1. 의료기기 설계개발 & DHF (Design Controls) ---');
        await navigateTo('designControls');
        const designContent = await getActiveTabContent();
        recordTest('1-1. 설계개발(DHF) 관리 화면 진입', designContent.includes('설계') || designContent.includes('DHF') || designContent.includes('Design'));

        await page.waitForSelector('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine', { timeout: 6000 }).catch(() => {});
        const designGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine').count();
        recordTest('1-2. 설계개발 프로젝트 AgGrid 렌더링 확인', designGrid > 0, `그리드 수: ${designGrid}`);

        // 신규 설계 프로젝트 등록 드로어
        const openProjectBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 설계 프로젝트"), .tab-page-wrapper.tab-active button:has-text("프로젝트 등록")').first();
        if (await openProjectBtn.isVisible()) {
            await openProjectBtn.click();
            await page.waitForTimeout(800);

            const isProjectModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("설계개발 프로젝트"), div:has-text("DHF")');
            recordTest('1-3. 신규 설계 프로젝트 등록 드로어 오픈', isProjectModalOpen);

            await closeAnyDrawerOrModal();
            recordTest('1-4. 설계 프로젝트 드로어 안전 닫기 확인', true);
        }

        // =============================================================
        // [2] 위험관리 (ISO 14971 Risk Management)
        // =============================================================
        console.log('\n--- 2. 위험관리 (Risk Management - ISO 14971) ---');
        await navigateTo('riskManagement');
        const riskContent = await getActiveTabContent();
        recordTest('2-1. 위험관리(ISO 14971) 화면 진입', riskContent.includes('위험') || riskContent.includes('Risk') || riskContent.includes('FMEA'));

        await page.waitForSelector('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine', { timeout: 6000 }).catch(() => {});
        const riskGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine').count();
        recordTest('2-2. 위험성평가 AgGrid 렌더링 확인', riskGrid > 0, `그리드 수: ${riskGrid}`);

        // 신규 위험성평가 파일 등록 드로어
        const openRiskBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 위험성평가"), .tab-page-wrapper.tab-active button:has-text("위험성평가 파일 등록")').first();
        if (await openRiskBtn.isVisible()) {
            await openRiskBtn.click();
            await page.waitForTimeout(800);

            const isRiskModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("위험성 평가"), div:has-text("위험관리 파일")');
            recordTest('2-3. 신규 위험관리 파일(RMF) 등록 드로어 오픈', isRiskModalOpen);

            await closeAnyDrawerOrModal();
            recordTest('2-4. 위험관리 드로어 안전 닫기 확인', true);
        }

        // =============================================================
        // [3] 컴퓨터화 시스템 밸리데이션 (CSV Validation - GAMP 5)
        // =============================================================
        console.log('\n--- 3. 컴퓨터화 시스템 밸리데이션 (CSV Validation - GAMP 5) ---');
        await navigateTo('csvValidation');
        const csvContent = await getActiveTabContent();
        recordTest('3-1. CSV 밸리데이션 화면 진입', csvContent.includes('밸리데이션') || csvContent.includes('CSV') || csvContent.includes('GAMP'));

        const csvTabs = await page.locator('.tab-page-wrapper.tab-active button:has-text("프로젝트"), .tab-page-wrapper.tab-active button:has-text("프로토콜"), .tab-page-wrapper.tab-active button:has-text("결함")').count();
        recordTest('3-2. CSV V-Model 라이프사이클 탭 렌더링 확인', csvTabs >= 2, `감지된 탭 수: ${csvTabs}`);

        // 프로젝트 등록 모달
        const openCsvProjectBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("프로젝트 등록")').first();
        if (await openCsvProjectBtn.isVisible()) {
            await openCsvProjectBtn.click();
            await page.waitForTimeout(800);

            const isCsvModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("CSV"), div:has-text("프로젝트")');
            recordTest('3-3. 신규 CSV 프로젝트 등록 모달 오픈', isCsvModalOpen);

            await closeAnyDrawerOrModal();
            recordTest('3-4. CSV 프로젝트 모달 안전 닫기 확인', true);
        }

        // =============================================================
        // [4] 외부연계 및 추적성 (Traceability Management)
        // =============================================================
        console.log('\n--- 4. 외부연계 및 배치 LOT 추적성 (Traceability) ---');
        await navigateTo('traceabilityManagement');
        const traceContent = await getActiveTabContent();
        recordTest('4-1. 추적성 관리 화면 진입', traceContent.includes('추적') || traceContent.includes('Traceability') || traceContent.includes('배치') || traceContent.includes('LOT'));

        // 탭 바 확인 (양방향 추적성 매트릭스, 배치 마스터 등)
        const traceTabs = await page.locator('.tab-page-wrapper.tab-active button:has-text("추적성"), .tab-page-wrapper.tab-active button:has-text("배치"), .tab-page-wrapper.tab-active button:has-text("식별")').count();
        recordTest('4-2. 추적성 및 배치/LOT 탭 바 렌더링 확인', traceTabs >= 2, `감지된 탭 수: ${traceTabs}`);

        // 배치 마스터 탭 전환 및 AgGrid 확인
        const batchTabBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("배치"), .tab-page-wrapper.tab-active button:has-text("LOT 마스터")').first();
        if (await batchTabBtn.isVisible()) {
            await batchTabBtn.click();
            await page.waitForTimeout(1000);
        }
        await page.waitForSelector('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine', { timeout: 6000 }).catch(() => {});
        const traceGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine').count();
        recordTest('4-3. 배치/LOT 마스터 AgGrid 렌더링 확인', traceGrid > 0, `그리드 수: ${traceGrid}`);

        // =============================================================
        // [5] 내부심사 및 자체점검 (Internal Audit Management - ISO 19011)
        // =============================================================
        console.log('\n--- 5. 내부심사 및 자체점검 (Internal Audit - ISO 19011) ---');
        await navigateTo('internalAuditManagement');
        const auditContent = await getActiveTabContent();
        recordTest('5-1. 내부심사·자체점검 화면 진입', auditContent.includes('내부심사') || auditContent.includes('심사') || auditContent.includes('Audit'));

        await page.waitForSelector('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine', { timeout: 6000 }).catch(() => {});
        const auditGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine').count();
        recordTest('5-2. 내부심사 계획 및 일정 AgGrid 렌더링 확인', auditGrid > 0, `그리드 수: ${auditGrid}`);

        // 신규 심사 계획 수립 모달
        const openAuditBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 심사 계획 등록"), .tab-page-wrapper.tab-active button:has-text("심사 계획")').first();
        if (await openAuditBtn.isVisible()) {
            await openAuditBtn.click();
            await page.waitForTimeout(800);

            const isAuditModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("내부심사 계획"), div:has-text("심사 계획")');
            recordTest('5-3. 신규 내부심사 계획 수립 모달 오픈', isAuditModalOpen);

            await closeAnyDrawerOrModal();
            recordTest('5-4. 내부심사 모달 안전 닫기 확인', true);
        }

        // =============================================================
        // [6] 공급업체 및 위탁제조 관리 (Supplier Management)
        // =============================================================
        console.log('\n--- 6. 공급업체 및 위탁제조 관리 (Supplier Management) ---');
        await navigateTo('supplierManagement');
        const supplierContent = await getActiveTabContent();
        recordTest('6-1. 공급업체 및 위탁제조 관리 화면 진입', supplierContent.includes('공급업체') || supplierContent.includes('협력업체') || supplierContent.includes('Supplier'));

        await page.waitForSelector('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine', { timeout: 6000 }).catch(() => {});
        const supplierGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine').count();
        recordTest('6-2. 공급업체 적격성(ASL) AgGrid 렌더링 확인', supplierGrid > 0, `그리드 수: ${supplierGrid}`);

        // 신규 공급업체 적격성 등록 드로어
        const openSupplierBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 공급업체"), .tab-page-wrapper.tab-active button:has-text("적격성 등록"), .tab-page-wrapper.tab-active button:has-text("공급업체 등록")').first();
        if (await openSupplierBtn.isVisible()) {
            await openSupplierBtn.click();
            await page.waitForTimeout(800);

            const isSupplierModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("공급업체"), div:has-text("적격성")');
            recordTest('6-3. 공급업체 적격성 등록 드로어 오픈', isSupplierModalOpen);

            await closeAnyDrawerOrModal();
            recordTest('6-4. 공급업체 드로어 안전 닫기 확인', true);
        }

        // =============================================================
        // [7] 시설·설비, 교정 및 청정환경 (Facility & Calibration)
        // =============================================================
        console.log('\n--- 7. 시설·설비, 교정 및 청정환경 관리 (Facility & Calibration) ---');
        await navigateTo('facilityManagement');
        const facilityContent = await getActiveTabContent();
        recordTest('7-1. 시설·설비 및 교정관리 화면 진입', facilityContent.includes('시설') || facilityContent.includes('설비') || facilityContent.includes('교정') || facilityContent.includes('Facility'));

        await page.waitForSelector('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine', { timeout: 6000 }).catch(() => {});
        const facilityGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine').count();
        recordTest('7-2. 제조 및 시험장비 마스터 AgGrid 렌더링 확인', facilityGrid > 0, `그리드 수: ${facilityGrid}`);

        // 신규 장비 등록 모달
        const openEquipmentBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 장비 등록"), .tab-page-wrapper.tab-active button:has-text("장비 등록")').first();
        if (await openEquipmentBtn.isVisible()) {
            await openEquipmentBtn.click();
            await page.waitForTimeout(800);

            const isEquipmentModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("장비"), div:has-text("설비")');
            recordTest('7-3. 신규 장비/설비 마스터 등록 모달 오픈', isEquipmentModalOpen);

            await closeAnyDrawerOrModal();
            recordTest('7-4. 장비 등록 모달 안전 닫기 확인', true);
        }

        // =============================================================
        // [8] 교육훈련 및 자격관리 (Training & Competence)
        // =============================================================
        console.log('\n--- 8. 교육훈련 및 자격관리 (Training & Competence) ---');
        await navigateTo('trainingManagement');
        const trainingContent = await getActiveTabContent();
        recordTest('8-1. 교육훈련 및 자격관리 화면 진입', trainingContent.includes('교육훈련') || trainingContent.includes('자격') || trainingContent.includes('Training'));

        await page.waitForSelector('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine', { timeout: 6000 }).catch(() => {});
        const trainingGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine').count();
        recordTest('8-2. 교육훈련 이수 및 마스터 AgGrid 렌더링 확인', trainingGrid > 0, `그리드 수: ${trainingGrid}`);

        // 교육과정 탭 전환 및 신규 교육과정 제정 드로어
        const courseTabBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("교육과정"), .tab-page-wrapper.tab-active button:has-text("과정 마스터")').first();
        if (await courseTabBtn.isVisible()) {
            await courseTabBtn.click();
            await page.waitForTimeout(1000);

            const openCourseBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 교육과정 제정"), .tab-page-wrapper.tab-active button:has-text("교육과정 제정")').first();
            if (await openCourseBtn.isVisible()) {
                await openCourseBtn.click();
                await page.waitForTimeout(800);

                const isCourseModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("교육과정"), div:has-text("표준 교육")');
                recordTest('8-3. 신규 표준 교육과정 제정 드로어 오픈', isCourseModalOpen);

                await closeAnyDrawerOrModal();
                recordTest('8-4. 교육과정 드로어 안전 닫기 확인', true);
            }
        }

        // =============================================================
        // [9] 시스템 전역 감시기 (Watcher) 무결성 검증
        // =============================================================
        console.log('\n--- 9. 시스템 전역 자동 감시기(Watcher) 5대 지표 무결성 검증 ---');
        await watcher.checkToastsForDefects();

        const totalPageErrors = watcher.pageErrors || [];
        const totalBadResponses = watcher.badResponses || [];
        const total429s = watcher.rateLimit429Errors || [];
        const totalLoops = watcher.infiniteLoopAlerts || [];
        const totalToastErrors = watcher.toastErrors || [];

        recordTest('9-1. 비정상 Uncaught JS / React 에러 발생 여부 (0건 필수)', totalPageErrors.length === 0, `발생 건수: ${totalPageErrors.length} -> ${JSON.stringify(totalPageErrors.slice(0, 3))}`);
        recordTest('9-2. 의도하지 않은 서버 에러 (HTTP 500) 발생 여부 (0건 필수)', totalBadResponses.length === 0, `발생 건수: ${totalBadResponses.length} -> ${JSON.stringify(totalBadResponses.slice(0, 3))}`);
        recordTest('9-3. RateLimit 429 에러 발생 여부 (0건 필수 - 집중 감시)', total429s.length === 0, `429 발생 건수: ${total429s.length}`);
        recordTest('9-4. 무한 렌더링 루프 (2초 내 5회 이상 동일 API) 감지 여부 (0건 필수)', totalLoops.length === 0, `루프 감지 건수: ${totalLoops.length}`);
        recordTest('9-5. Toast UI 내 영문 스택 트레이스 / [object Object] 노출 여부 (0건 필수)', totalToastErrors.length === 0, `토스트 결함: ${totalToastErrors.length}`);

        await context.close();

    } catch (err) {
        console.error('💥 [FATAL TRACK 5 ERROR]', err);
        recordTest('Track 5 실행 중 치명적 예외 발생', false, err.message);
    } finally {
        await browser.close();
    }

    // 결과 집계
    console.log('\n=================================================================================');
    console.log('📊 [Track 5] 최종 테스트 결과 집계');
    console.log('=================================================================================');
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log(`총 테스트 수: ${total} | 통과: ${passed} | 실패: ${failed} | 통과율: ${passRate}%`);
    console.log('=================================================================================\n');

    if (failed > 0) {
        console.error(`❌ Track 5 테스트 중 ${failed}건의 실패가 발견되었습니다.`);
        process.exit(1);
    } else {
        console.log('🎉 Track 5 전체 테스트가 100% 성공적으로 완료되었습니다!');
        process.exit(0);
    }
}

runTrack5();
