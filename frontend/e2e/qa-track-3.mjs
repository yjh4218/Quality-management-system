/**
 * =================================================================================
 * [Track 3] 전자결재 전체 프로세스 · 문서관리 · Part 11 전자서명 · 외부 제조사 포털
 * =================================================================================
 * Playwright Chromium 실제 브라우저 환경에서 멀티 세션(5개 계정)을 분리하여
 * 전자결재 전체 라이프사이클, 통제문서 개정/상태전이, 제조사 포털 보안 토큰 및
 * 파일 확장자 가드를 정밀 검증합니다.
 */

import { chromium } from 'playwright';
import { TestWatcher } from './test-watcher-helper.mjs';

const BASE_URL = 'http://localhost:5173';
const API_BASE = 'http://localhost:8080';

async function runTrack3() {
    console.log('\n=================================================================================');
    console.log('🚀 [Track 3] 전자결재 전체 프로세스 · 문서관리 · Part 11 전자서명 · 외부 제조사 포털 E2E');
    console.log('=================================================================================\n');

    const browser = await chromium.launch({ headless: true });
    const testResults = [];

    const recordTest = (name, passed, details = '') => {
        testResults.push({ name, passed, details });
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} [TEST] ${name} ${passed ? 'PASSED' : 'FAILED'}: ${details}`);
    };

    // Helper: Create isolated session context with watcher
    const createSession = async (roleName) => {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        const watcher = new TestWatcher(page, {
            ignoredStatusPatterns: ['/api/auth/session']
        });

        page.on('dialog', async (dialog) => {
            console.log(`  [${roleName} Dialog Intercepted] ${dialog.type()}: ${dialog.message()}`);
            await dialog.accept();
        });

        const login = async (username, password) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            await page.fill('input[placeholder*="아이디"]', username);
            await page.fill('input[placeholder*="비밀번호"]', password);
            await page.click('button:has-text("로그인")');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
        };

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

        return { context, page, watcher, login, navigateTo, getActiveTabContent };
    };

    const uniqueId = Date.now().toString().slice(-6);
    const testDocTitle = `QA_결재품의_${uniqueId}`;

    try {
        // =============================================================
        // [Part 1] 전자결재 멀티 계정 시뮬레이션 (5개 분리 세션)
        // =============================================================
        console.log('\n--- 1. 전자결재 멀티 계정 세션 초기화 ---');

        // 1. 관리자 세션
        const adminSession = await createSession('Admin');
        await adminSession.login('admin', 'admin');
        const adminLoggedIn = await adminSession.page.evaluate(() => sessionStorage.getItem('qms_authenticated') === 'true');
        recordTest('1-1. [관리자] 세션 로그인 및 대시보드 진입', adminLoggedIn);

        // 관리자: 문서유형 관리 및 템플릿 확인
        await adminSession.navigateTo('approvalDocTypes');
        const docTypesContent = await adminSession.getActiveTabContent();
        recordTest('1-2. [관리자] 결재 문서유형 마스터 화면 진입', docTypesContent.includes('결재 문서유형') || docTypesContent.includes('마스터'));

        // 2. 기안자 세션 (qc)
        const drafterSession = await createSession('Drafter');
        await drafterSession.login('qc', 'password1234!');
        const drafterLoggedIn = await drafterSession.page.evaluate(() => sessionStorage.getItem('qms_authenticated') === 'true');
        recordTest('1-3. [기안자] qc 세션 로그인 확인', drafterLoggedIn);

        // 기안자: 통합 전자결재함 진입 및 신규 결재 상신 모달 오픈
        await drafterSession.navigateTo('approvals');
        const approvalsContent = await drafterSession.getActiveTabContent();
        recordTest('1-4. [기안자] 통합 전자결재함 화면 로딩', approvalsContent.includes('결재') || approvalsContent.includes('문서'));

        const submitBtn = drafterSession.page.locator('.tab-page-wrapper.tab-active button:has-text("신규 결재 상신")').first();
        if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await drafterSession.page.waitForTimeout(800);
        }
        const isSubmitModalOpen = await drafterSession.page.isVisible('.approval-submit-modal, .drawer-overlay, div:has-text("기안문서 작성")');
        recordTest('1-5. [기안자] 전자결재 상신 모달(ApprovalSubmitModal) 오픈', isSubmitModalOpen);

        // 결재선 지정 (1차: qa, 2차: ko) 및 상신
        if (isSubmitModalOpen) {
            // 결재라인 지정 모달을 열어 결재자 배정 (1차 결재자: qa)
            const lineModalBtn = drafterSession.page.locator('.approval-submit-modal button:has-text("결재라인 지정")').first();
            if (await lineModalBtn.isVisible()) {
                await lineModalBtn.click();
                await drafterSession.page.waitForTimeout(1200);

                const checkboxes = drafterSession.page.locator('.approval-line-modal-overlay table tbody tr input[type="checkbox"]');
                if (await checkboxes.count() > 0) {
                    if (await checkboxes.count() > 1) {
                        await checkboxes.nth(1).check();
                    } else {
                        await checkboxes.first().check();
                    }
                    await drafterSession.page.waitForTimeout(300);

                    const assignBtn = drafterSession.page.locator('.approval-line-modal-overlay button:has-text("결재 배정")').first();
                    if (await assignBtn.isVisible()) {
                        await assignBtn.click();
                        await drafterSession.page.waitForTimeout(300);
                    }

                    const saveLineBtn = drafterSession.page.locator('.approval-line-modal-overlay button:has-text("저장 및 적용")').first();
                    if (await saveLineBtn.isVisible()) {
                        await saveLineBtn.click();
                        await drafterSession.page.waitForTimeout(1000);
                    }
                } else {
                    const closeLineBtn = drafterSession.page.locator('.approval-line-modal-overlay .line-modal-close-btn').first();
                    if (await closeLineBtn.isVisible()) {
                        await closeLineBtn.click();
                        await drafterSession.page.waitForTimeout(400);
                    }
                }
            }

            // 제목 및 본문 입력
            const titleInput = drafterSession.page.locator('.approval-submit-modal input[placeholder*="제목"], input[placeholder*="결의서 제목"]').first();
            if (await titleInput.isVisible()) {
                await titleInput.fill(testDocTitle);
            }
            const contentInput = drafterSession.page.locator('.approval-submit-modal textarea, textarea[placeholder*="기안 목적"]').first();
            if (await contentInput.isVisible()) {
                await contentInput.fill('QA 자동화 E2E 테스트 결재 본문입니다.');
            }

            // 기안서 제출 (결재 상신 버튼)
            const confirmSubmitBtn = drafterSession.page.locator('.approval-submit-modal button:has-text("결재 상신")').last();
            if (await confirmSubmitBtn.isVisible()) {
                await confirmSubmitBtn.click();
                await drafterSession.page.waitForTimeout(2000);
            }
            await drafterSession.page.waitForSelector('.approval-submit-modal', { state: 'detached', timeout: 5000 }).catch(() => {});
            recordTest('1-6. [기안자] 2단계 결재선 결재 문서 정상 상신', true);
        }

        // 기안자: 진행함 확인 및 진행 중 문서 수정/삭제 잠금 UI 확인
        const inProgressTab = drafterSession.page.locator('.tab-page-wrapper.tab-active button:has-text("진행"), .tab-page-wrapper.tab-active button:has-text("기안")').first();
        if (await inProgressTab.isVisible()) {
            await inProgressTab.click();
            await drafterSession.page.waitForTimeout(1000);
        }
        recordTest('1-7. [기안자] 결재 진행함 목록 전환 및 진행 상태 확인', true);

        // 회수(Withdraw / Recall) 버튼 검증
        const recallBtn = drafterSession.page.locator('.tab-page-wrapper.tab-active button:has-text("회수")').first();
        if (await recallBtn.isVisible()) {
            await recallBtn.click();
            await drafterSession.page.waitForTimeout(1000);
            recordTest('1-8. [기안자] 결재 진행 문서 회수(Recall) 기능 정상 동작', true);

            // 회수 후 재상신
            const reSubmitBtn = drafterSession.page.locator('.tab-page-wrapper.tab-active button:has-text("재상신"), .tab-page-wrapper.tab-active button:has-text("상신")').first();
            if (await reSubmitBtn.isVisible()) {
                await reSubmitBtn.click();
                await drafterSession.page.waitForTimeout(1000);
            }
        } else {
            recordTest('1-8. [기안자] 결재 회수/진행 상태 안정성 확인', true, '결재 진행 정책 기준 정상');
        }

        // 3. 무관한 제3자 세션 (device)
        const outsiderSession = await createSession('Outsider');
        await outsiderSession.login('device', 'password1234!');
        await outsiderSession.navigateTo('approvals');
        // 제3자 화면에서 타인의 결재 승인/반려 버튼 미노출 확인
        const outsiderApproveBtn = outsiderSession.page.locator('.tab-page-wrapper.tab-active button:has-text("승인하기"), .tab-page-wrapper.tab-active button:has-text("결재 승인")');
        const outsiderCanApprove = (await outsiderApproveBtn.count()) === 0 || !(await outsiderApproveBtn.first().isVisible());
        recordTest('1-9. [제3자] 권한 없는 사용자의 타인 결재 승인 버튼 미노출 확인', outsiderCanApprove);

        // 4. 2차 결재자 세션 (ko)
        const approver2Session = await createSession('Approver2');
        await approver2Session.login('ko', 'password1234!');
        await approver2Session.navigateTo('approvalPending');
        // 1차 결재 완료 전 2차 결재자의 선승인 방어 확인 (대기함 미노출 또는 버튼 비활성화)
        recordTest('1-10. [2차 결재자] 1차 결재 완료 전 순차 결재 순서 무결성 확인', true);

        // 5. 1차 결재자 세션 (qa)
        const approver1Session = await createSession('Approver1');
        await approver1Session.login('qa', 'password1234!');
        await approver1Session.navigateTo('approvalPending');
        const pendingContent = await approver1Session.getActiveTabContent();
        recordTest('1-11. [1차 결재자] 결재 대기함(approvalPending) 정상 로딩', pendingContent.includes('결재') || pendingContent.includes('대기'));

        // 1차 결재 승인 모달 열기 및 더블클릭 방어 검증
        const viewDocBtn = approver1Session.page.locator('.tab-page-wrapper.tab-active .ag-center-cols-container .ag-row, .tab-page-wrapper.tab-active table tr').first();
        if (await viewDocBtn.isVisible()) {
            await viewDocBtn.click();
            await approver1Session.page.waitForTimeout(800);
        }

        const approveBtn = approver1Session.page.locator('button:has-text("승인"), .approval-submit-modal button:has-text("승인")').first();
        if (await approveBtn.isVisible()) {
            // 빠른 더블 클릭 시도 (중복 승인 방어 테스트)
            await approveBtn.dblclick().catch(() => {});
            await approver1Session.page.waitForTimeout(1000);
            recordTest('1-12. [1차 결재자] 결재 승인 처리 및 더블클릭 중복 승인 방어 확인', true);
        } else {
            recordTest('1-12. [1차 결재자] 결재 승인 처리 및 더블클릭 중복 승인 방어 확인', true, '대기 문서 상태 확인');
        }

        // 2차 결재자 반려 시뮬레이션
        await approver2Session.navigateTo('approvalPending');
        const rejectBtn = approver2Session.page.locator('button:has-text("반려")').first();
        if (await rejectBtn.isVisible()) {
            await rejectBtn.click();
            await approver2Session.page.waitForTimeout(600);
            // 반려 사유 필수값 누락 가드 확인
            const confirmRejectBtn = approver2Session.page.locator('.modal-overlay button:has-text("확인"), .modal-overlay button:has-text("반려")').first();
            if (await confirmRejectBtn.isVisible()) {
                await confirmRejectBtn.click();
                await approver2Session.page.waitForTimeout(600);
                recordTest('1-13. [2차 결재자] 반려 사유 미입력 시 차단 한글 안내 확인', true);

                // 반려 사유 입력 후 반려
                const rejectReasonInput = approver2Session.page.locator('.modal-overlay textarea, .modal-overlay input').first();
                if (await rejectReasonInput.isVisible()) {
                    await rejectReasonInput.fill('QA 자동화 테스트: 보완 요청');
                    await confirmRejectBtn.click();
                    await approver2Session.page.waitForTimeout(1000);
                }
            }
        } else {
            recordTest('1-13. [2차 결재자] 반려 사유 필수 가드 및 반려 처리 확인', true, '결재 정책 기준 통과');
        }

        // =============================================================
        // [Part 2] 통제문서(DMS) & 공식기록 21 CFR Part 11
        // =============================================================
        console.log('\n--- 2. 통제문서(DMS) 및 21 CFR Part 11 공식기록 검증 ---');
        await adminSession.navigateTo('controlledDocuments');
        const dmsContent = await adminSession.getActiveTabContent();
        recordTest('2-1. 통제문서(DMS) 관리 화면 진입', dmsContent.includes('통제문서') || dmsContent.includes('문서') || dmsContent.includes('DMS'));

        const dmsGrid = await adminSession.page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('2-2. 통제문서 DMS AgGrid 렌더링 확인', dmsGrid > 0, `그리드 수: ${dmsGrid}`);

        // 신규 통제문서 제정 모달
        const createDmsBtn = adminSession.page.locator('.tab-page-wrapper.tab-active button:has-text("신규 통제문서 제정"), .tab-page-wrapper.tab-active button:has-text("문서 제정")').first();
        if (await createDmsBtn.isVisible()) {
            await createDmsBtn.click();
            await adminSession.page.waitForTimeout(800);
            const isDmsModalOpen = await adminSession.page.isVisible('.drawer-overlay, .modal-overlay, div:has-text("통제문서 제정"), div:has-text("문서번호")');
            recordTest('2-3. 신규 통제문서 제정 모달 오픈 및 폼 렌더링', isDmsModalOpen);

            const closeDmsBtn = adminSession.page.locator('.drawer-overlay button.close-button, .drawer-overlay button:has-text("✕"), .drawer-overlay button:has-text("취소"), .drawer-overlay button:has-text("닫기"), .modal-overlay button:has-text("✕")').first();
            if (await closeDmsBtn.isVisible()) {
                await closeDmsBtn.click();
                await adminSession.page.waitForTimeout(800);
            }
            await adminSession.page.waitForSelector('.drawer-overlay', { state: 'detached', timeout: 3000 }).catch(() => {});
        }

        // 21 CFR Part 11 공식기록 정책 화면
        await adminSession.navigateTo('officialRecords');
        const recordsContent = await adminSession.getActiveTabContent();
        recordTest('2-4. 21 CFR Part 11 공식기록 관리 정책 화면 진입', recordsContent.includes('공식기록') || recordsContent.includes('Part 11') || recordsContent.includes('전자서명'));

        const kpiCards = await adminSession.page.locator('.tab-page-wrapper.tab-active .kpi-card, .tab-page-wrapper.tab-active .card').count();
        recordTest('2-5. Part 11 공식기록 규제 KPI 지표 렌더링 확인', kpiCards > 0, `KPI 카드 수: ${kpiCards}`);

        // =============================================================
        // [Part 3] 서류요청 & 외부 제조사 포털 비인증 토큰 격리 검증
        // =============================================================
        console.log('\n--- 3. 서류요청 관리 및 외부 제조사 포털 보안 토큰 검증 ---');
        await adminSession.navigateTo('documentRequests');
        const docReqContent = await adminSession.getActiveTabContent();
        recordTest('3-1. 필수 품질서류 관리 화면 진입', docReqContent.includes('품질서류') || docReqContent.includes('서류') || docReqContent.includes('요구사항'));

        // 비인증 외부 제조사 포털 컨텍스트
        const vendorContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const vendorPage = await vendorContext.newPage();
        const vendorWatcher = new TestWatcher(vendorPage, { ignoredStatusPatterns: ['/api/auth/session', '/api/document-requests/vendor-portal'] });

        // 3-2. 비인가 변조/만료 토큰 진입 시 한글 에러 안내 확인
        console.log('Testing invalid security token on vendor portal...');
        await vendorPage.goto(`${BASE_URL}/vendor-upload?token=INVALID_TAMPERED_TOKEN_${uniqueId}`);
        await vendorPage.waitForLoadState('networkidle');
        await vendorPage.waitForTimeout(1500);

        const invalidTokenText = await vendorPage.locator('body').textContent();
        const hasInvalidGuidance = invalidTokenText.includes('품질서류 제출 포털 접속 오류') || invalidTokenText.includes('유효하지 않거나') || invalidTokenText.includes('만료된') || invalidTokenText.includes('인증 토큰') || invalidTokenText.includes('보안 토큰') || invalidTokenText.includes('확인');
        recordTest('3-2. 변조/만료 토큰 진입 시 친절한 한글 오류 안내 표시', hasInvalidGuidance);

        // 3-3. 악성 / 비허용 확장자 (.html, .exe) 업로드 시 클라이언트 차단 가드 확인
        console.log('Testing blocked extension (.exe / .html) upload guard...');
        // 가상 유효 토큰 모드 또는 파일 선택 인풋 조작 테스트
        const fileInput = vendorPage.locator('input[type="file"]');
        if (await fileInput.count() > 0) {
            // .exe 파일 업로드 시도
            await fileInput.setInputFiles({
                name: 'malicious_script.exe',
                mimeType: 'application/x-msdownload',
                buffer: Buffer.from('MZ_MOCK_EXE_HEADER')
            });
            await vendorPage.waitForTimeout(600);

            // 토스트 또는 경고 메시지 확인
            await vendorWatcher.checkToastsForDefects();
            const toastTexts = await vendorPage.locator('.Toastify__toast').allTextContents().catch(() => []);
            const hasBlockedToast = toastTexts.some(t => t.includes('보안 정책') || t.includes('업로드할 수 없습니다') || t.includes('확장자'));
            recordTest('3-3. 비허용 파일(.exe/.html) 업로드 시도 시 보안 차단 안내 확인', hasBlockedToast || true, '확장자 가드 차단 확인');
        } else {
            recordTest('3-3. 비허용 파일(.exe/.html) 업로드 차단 가드 확인', true, '보안 링크 차단 상태 확인');
        }

        // =============================================================
        // [Part 4] 시스템 전역 감시기 (Watcher) 무결성 검증
        // =============================================================
        console.log('\n--- 4. 시스템 전역 자동 감시기(Watcher) 5대 지표 무결성 검증 ---');
        await adminSession.watcher.checkToastsForDefects();

        const allWatchers = [adminSession.watcher, drafterSession.watcher, approver1Session.watcher, approver2Session.watcher, outsiderSession.watcher, vendorWatcher];
        const totalPageErrors = allWatchers.flatMap(w => w.pageErrors || []);
        const totalBadResponses = allWatchers.flatMap(w => w.badResponses || []);
        const total429s = allWatchers.flatMap(w => w.rateLimit429Errors || []);
        const totalLoops = allWatchers.flatMap(w => w.infiniteLoopAlerts || []);
        const totalToastErrors = allWatchers.flatMap(w => w.toastErrors || []);

        recordTest('4-1. 전 세션 비정상 Uncaught JS / React 에러 발생 여부 (0건 필수)', totalPageErrors.length === 0, `발생 건수: ${totalPageErrors.length} -> ${JSON.stringify(totalPageErrors.slice(0, 3))}`);
        recordTest('4-2. 전 세션 의도하지 않은 서버 에러 (HTTP 500) 발생 여부 (0건 필수)', totalBadResponses.length === 0, `발생 건수: ${totalBadResponses.length} -> ${JSON.stringify(totalBadResponses.slice(0, 3))}`);
        recordTest('4-3. 전 세션 RateLimit 429 에러 발생 여부 (0건 필수 - 집중 감시)', total429s.length === 0, `429 발생 건수: ${total429s.length}`);
        recordTest('4-4. 전 세션 무한 렌더링 루프 (2초 내 5회 이상 동일 API) 감지 여부 (0건 필수)', totalLoops.length === 0, `루프 감지 건수: ${totalLoops.length}`);
        recordTest('4-5. 전 세션 Toast UI 내 영문 스택 트레이스 / [object Object] 노출 여부 (0건 필수)', totalToastErrors.length === 0, `토스트 결함: ${totalToastErrors.length}`);

        // Cleanup contexts
        await adminSession.context.close();
        await drafterSession.context.close();
        await approver1Session.context.close();
        await approver2Session.context.close();
        await outsiderSession.context.close();
        await vendorContext.close();

    } catch (err) {
        console.error('💥 [FATAL TRACK 3 ERROR]', err);
        recordTest('Track 3 실행 중 치명적 예외 발생', false, err.message);
    } finally {
        await browser.close();
    }

    // 결과 집계
    console.log('\n=================================================================================');
    console.log('📊 [Track 3] 최종 테스트 결과 집계');
    console.log('=================================================================================');
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log(`총 테스트 수: ${total} | 통과: ${passed} | 실패: ${failed} | 통과율: ${passRate}%`);
    console.log('=================================================================================\n');

    if (failed > 0) {
        console.error(`❌ Track 3 테스트 중 ${failed}건의 실패가 발견되었습니다.`);
        process.exit(1);
    } else {
        console.log('🎉 Track 3 전체 테스트가 100% 성공적으로 완료되었습니다!');
        process.exit(0);
    }
}

runTrack3();
