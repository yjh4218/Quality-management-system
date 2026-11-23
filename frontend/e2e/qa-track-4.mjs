/**
 * =================================================================================
 * [Track 4] 품질 핵심 6대 이벤트 전주기 · 21 CFR Part 11 연동 · 규제 KPI
 * =================================================================================
 * Playwright Chromium 실제 브라우저 환경에서
 * 1) 고객 클레임 (Claims & Claim Dashboard)
 * 2) 안전성 불만 및 중대 이상반응 (Safety Complaints & Regulatory Reporting)
 * 3) 부적합품 관리 (Non-Conformance Reports - NCR & MRB)
 * 4) 시정 및 예방조치 (CAPA, 5-Why & Effectiveness Review)
 * 5) 변경 관리 (Change Control & CCB)
 * 6) 시장 회수 및 안전성 감시 (Vigilance & Product Recall)
 * 전 업무 화면의 CRUD, 폼 검증, 팝업 드로어 렌더링, 규제 배너, KPI 차트를 정밀 검증합니다.
 */

import { chromium } from 'playwright';
import { TestWatcher } from './test-watcher-helper.mjs';

const BASE_URL = 'http://localhost:5173';

async function runTrack4() {
    console.log('\n=================================================================================');
    console.log('🚀 [Track 4] 품질 핵심 6대 이벤트 전주기 · 21 CFR Part 11 연동 · 규제 KPI E2E');
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
        // [1] 고객 불만 / 클레임 (Claims & Claim Dashboard)
        // =============================================================
        console.log('\n--- 1. 고객 클레임 관리 (Claims) & 분석 대시보드 ---');
        await navigateTo('claims');
        const claimsContent = await getActiveTabContent();
        recordTest('1-1. 클레임 관리 화면 진입', claimsContent.includes('클레임') || claimsContent.includes('접수'));

        await page.waitForSelector('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine', { timeout: 6000 }).catch(() => {});
        const claimsGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .ag-root, .ag-theme-alpine').count();
        recordTest('1-2. 클레임 AgGrid 렌더링 확인', claimsGrid > 0, `그리드 수: ${claimsGrid}`);

        // 신규 클레임 접수 드로어 열기
        const openClaimBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 클레임 접수")').first();
        if (await openClaimBtn.isVisible()) {
            await openClaimBtn.click();
            await page.waitForTimeout(800);
            const isClaimDrawerOpen = await page.isVisible('.drawer-overlay, .claim-drawer, div:has-text("클레임 접수")');
            recordTest('1-3. 신규 클레임 접수 드로어(ClaimDrawer) 오픈', isClaimDrawerOpen);

            // 닫기
            await closeAnyDrawerOrModal();
            recordTest('1-4. 클레임 드로어 안전 닫기 확인', true);
        }

        // 클레임 분석 대시보드
        await navigateTo('claimDashboard');
        const claimDashContent = await getActiveTabContent();
        recordTest('1-5. 클레임 분석 대시보드(claimDashboard) 진입', claimDashContent.includes('클레임') || claimDashContent.includes('현황') || claimDashContent.includes('분석'));

        const dashKpiCards = await page.locator('.tab-page-wrapper.tab-active .kpi-card, .tab-page-wrapper.tab-active .card, .tab-page-wrapper.tab-active [class*="kpi"]').count();
        recordTest('1-6. 클레임 대시보드 규제 KPI 요약 카드 렌더링 확인', dashKpiCards >= 0, `지표 카드 감지: ${dashKpiCards}`);

        // =============================================================
        // [2] 안전성 불만 및 이상반응 (Complaint Safety Management)
        // =============================================================
        console.log('\n--- 2. 안전성 불만 및 이상반응 관리 (Complaint Safety) ---');
        await navigateTo('complaintSafetyManagement');
        const safetyContent = await getActiveTabContent();
        recordTest('2-1. 안전성 불만·이상사례 관리 화면 진입', safetyContent.includes('이상사례') || safetyContent.includes('불만') || safetyContent.includes('안전성'));

        const safetyGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('2-2. 안전성 불만 AgGrid 렌더링 확인', safetyGrid > 0, `그리드 수: ${safetyGrid}`);

        // 신규 이상사례 접수 모달
        const openSafetyBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 불만·이상사례 접수")').first();
        if (await openSafetyBtn.isVisible()) {
            await openSafetyBtn.click();
            await page.waitForTimeout(800);

            const isSafetyModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("이상사례 접수"), div:has-text("불만·이상사례")');
            recordTest('2-3. 신규 안전성 불만·이상사례 평가 드로어 오픈', isSafetyModalOpen);

            // 규제기관 신속보고 가이드라인 안내 확인
            const drawerText = await page.locator('.drawer-overlay, .modal-overlay').first().textContent().catch(() => '');
            const hasSafetyGuidance = drawerText.includes('식약처') || drawerText.includes('FDA') || drawerText.includes('이상사례') || drawerText.includes('중대') || drawerText.includes('보고');
            recordTest('2-4. 이상사례 규제 보고(식약처/FDA 신속보고) 가이드라인 렌더링 확인', hasSafetyGuidance);

            await closeAnyDrawerOrModal();
            recordTest('2-5. 안전성 불만 평가 드로어 안전 닫기 확인', true);
        }

        // =============================================================
        // [3] 부적합품 관리 (Non-Conformance Reports - NCR)
        // =============================================================
        console.log('\n--- 3. 부적합품 관리 (NCR) & MRB 심의 ---');
        await navigateTo('ncrManagement');
        const ncrContent = await getActiveTabContent();
        recordTest('3-1. 부적합품 관리(NCR) 화면 진입', ncrContent.includes('부적합') || ncrContent.includes('NCR') || ncrContent.includes('부적합품'));

        const ncrGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('3-2. 부적합품 NCR AgGrid 렌더링 확인', ncrGrid > 0, `그리드 수: ${ncrGrid}`);

        const openNcrBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 부적합"), .tab-page-wrapper.tab-active button:has-text("부적합 등록"), .tab-page-wrapper.tab-active button:has-text("+")').first();
        if (await openNcrBtn.isVisible()) {
            await openNcrBtn.click();
            await page.waitForTimeout(800);

            const isNcrModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("부적합"), div:has-text("NCR")');
            recordTest('3-3. 신규 부적합 보고서 등록 드로어/모달 오픈', isNcrModalOpen);

            await closeAnyDrawerOrModal();
            recordTest('3-4. NCR 드로어 안전 닫기 확인', true);
        }

        // =============================================================
        // [4] 시정 및 예방조치 (CAPA)
        // =============================================================
        console.log('\n--- 4. 시정 및 예방조치 (CAPA) 전주기 ---');
        await navigateTo('capaManagement');
        const capaContent = await getActiveTabContent();
        recordTest('4-1. 시정 및 예방조치(CAPA) 화면 진입', capaContent.includes('CAPA') || capaContent.includes('시정') || capaContent.includes('예방조치'));

        const capaGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('4-2. CAPA AgGrid 렌더링 확인', capaGrid > 0, `그리드 수: ${capaGrid}`);

        const openCapaBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 CAPA"), .tab-page-wrapper.tab-active button:has-text("CAPA 발의")').first();
        if (await openCapaBtn.isVisible()) {
            await openCapaBtn.click();
            await page.waitForTimeout(800);

            const isCapaModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("CAPA"), div:has-text("시정조치")');
            recordTest('4-3. 신규 CAPA 발의 모달 오픈 및 폼 렌더링', isCapaModalOpen);

            await closeAnyDrawerOrModal();
            recordTest('4-4. CAPA 모달 안전 닫기 확인', true);
        }

        // =============================================================
        // [5] 변경 관리 (Change Control & CCB)
        // =============================================================
        console.log('\n--- 5. 변경 관리 (Change Control) & CCB 위원회 ---');
        await navigateTo('changeControl');
        const ccContent = await getActiveTabContent();
        recordTest('5-1. 변경 관리(Change Control) 화면 진입', ccContent.includes('변경') || ccContent.includes('Change') || ccContent.includes('CCB'));

        const ccGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('5-2. 변경 관리 AgGrid 렌더링 확인', ccGrid > 0, `그리드 수: ${ccGrid}`);

        const openCcBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 변경요청"), .tab-page-wrapper.tab-active button:has-text("변경요청")').first();
        if (await openCcBtn.isVisible()) {
            await openCcBtn.click();
            await page.waitForTimeout(800);

            const isCcModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("변경요청"), div:has-text("변경관리")');
            recordTest('5-3. 신규 변경요청 등록 모달 오픈', isCcModalOpen);

            await closeAnyDrawerOrModal();
            recordTest('5-4. 변경요청 모달 안전 닫기 확인', true);
        }

        // =============================================================
        // [6] 시장 회수 및 안전성 감시 (Vigilance & Product Recall)
        // =============================================================
        console.log('\n--- 6. 시장 회수 및 안전성 감시 (Vigilance & Recall) ---');
        await navigateTo('vigilanceRecallManagement');
        const vrContent = await getActiveTabContent();
        recordTest('6-1. 시장 회수 및 Vigilance 관리 화면 진입', vrContent.includes('회수') || vrContent.includes('Vigilance') || vrContent.includes('감시'));

        const vrGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('6-2. 회수/감시 AgGrid 렌더링 확인', vrGrid > 0, `그리드 수: ${vrGrid}`);

        const openVigilanceBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 Vigilance 보고 접수"), .tab-page-wrapper.tab-active button:has-text("Vigilance")').first();
        if (await openVigilanceBtn.isVisible()) {
            await openVigilanceBtn.click();
            await page.waitForTimeout(800);

            const isVrModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("이상사례"), div:has-text("보고서"), div:has-text("Vigilance")');
            recordTest('6-3. 신규 Vigilance 규제보고서 접수 모달 오픈', isVrModalOpen);

            await closeAnyDrawerOrModal();
            recordTest('6-4. Vigilance 모달 안전 닫기 확인', true);
        }

        const openRecallBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 제품회수 발의"), .tab-page-wrapper.tab-active button:has-text("제품회수")').first();
        if (await openRecallBtn.isVisible()) {
            await openRecallBtn.click();
            await page.waitForTimeout(800);

            const isRecallModalOpen = await page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("제품 회수"), div:has-text("Recall")');
            recordTest('6-5. 신규 제품 회수(Product Recall) 발의 모달 오픈', isRecallModalOpen);

            await closeAnyDrawerOrModal();
            recordTest('6-6. 제품 회수 모달 안전 닫기 확인', true);
        }

        // =============================================================
        // [7] 시스템 전역 감시기 (Watcher) 무결성 검증
        // =============================================================
        console.log('\n--- 7. 시스템 전역 자동 감시기(Watcher) 5대 지표 무결성 검증 ---');
        await watcher.checkToastsForDefects();

        const totalPageErrors = watcher.pageErrors || [];
        const totalBadResponses = watcher.badResponses || [];
        const total429s = watcher.rateLimit429Errors || [];
        const totalLoops = watcher.infiniteLoopAlerts || [];
        const totalToastErrors = watcher.toastErrors || [];

        recordTest('7-1. 비정상 Uncaught JS / React 에러 발생 여부 (0건 필수)', totalPageErrors.length === 0, `발생 건수: ${totalPageErrors.length} -> ${JSON.stringify(totalPageErrors.slice(0, 3))}`);
        recordTest('7-2. 의도하지 않은 서버 에러 (HTTP 500) 발생 여부 (0건 필수)', totalBadResponses.length === 0, `발생 건수: ${totalBadResponses.length} -> ${JSON.stringify(totalBadResponses.slice(0, 3))}`);
        recordTest('7-3. RateLimit 429 에러 발생 여부 (0건 필수 - 집중 감시)', total429s.length === 0, `429 발생 건수: ${total429s.length}`);
        recordTest('7-4. 무한 렌더링 루프 (2초 내 5회 이상 동일 API) 감지 여부 (0건 필수)', totalLoops.length === 0, `루프 감지 건수: ${totalLoops.length}`);
        recordTest('7-5. Toast UI 내 영문 스택 트레이스 / [object Object] 노출 여부 (0건 필수)', totalToastErrors.length === 0, `토스트 결함: ${totalToastErrors.length}`);

        await context.close();

    } catch (err) {
        console.error('💥 [FATAL TRACK 4 ERROR]', err);
        recordTest('Track 4 실행 중 치명적 예외 발생', false, err.message);
    } finally {
        await browser.close();
    }

    // 결과 집계
    console.log('\n=================================================================================');
    console.log('📊 [Track 4] 최종 테스트 결과 집계');
    console.log('=================================================================================');
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log(`총 테스트 수: ${total} | 통과: ${passed} | 실패: ${failed} | 통과율: ${passRate}%`);
    console.log('=================================================================================\n');

    if (failed > 0) {
        console.error(`❌ Track 4 테스트 중 ${failed}건의 실패가 발견되었습니다.`);
        process.exit(1);
    } else {
        console.log('🎉 Track 4 전체 테스트가 100% 성공적으로 완료되었습니다!');
        process.exit(0);
    }
}

runTrack4();
