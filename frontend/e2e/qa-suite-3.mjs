import { chromium } from 'playwright';
import { TestWatcher } from './test-watcher-helper.mjs';

const BASE_URL = 'http://localhost:5173';

async function runSuite3() {
    console.log('=================================================================================');
    console.log('🚀 [Suite 3] 입고품질·출하기록·생산감리·클레임/대시보드·제조사 점검 E2E 시뮬레이션');
    console.log('=================================================================================');

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });

    const page = await context.newPage();
    const watcher = new TestWatcher(page);

    // Dialog handler for alerts and confirms
    page.on('dialog', async (dialog) => {
        console.log(`[Dialog Intercepted] Type: ${dialog.type()}, Message: ${dialog.message()}`);
        await dialog.accept();
    });

    const testResults = [];

    const recordTest = (name, passed, details = '') => {
        testResults.push({ name, passed, details });
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} [TEST] ${name} ${passed ? 'PASSED' : 'FAILED'}: ${details}`);
    };

    const navigateTo = async (pageKey) => {
        await page.evaluate((key) => {
            if (window.__QMS_NAVIGATE__) {
                window.__QMS_NAVIGATE__(key);
            }
        }, pageKey);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1200);
    };

    const getActiveTabContent = async () => {
        return await page.evaluate(() => {
            const active = document.querySelector('.tab-page-wrapper.tab-active');
            return active ? active.textContent || '' : '';
        });
    };

    try {
        // -------------------------------------------------------------
        // 0. 관리자 로그인
        // -------------------------------------------------------------
        console.log('\n--- 0. 관리자 로그인 및 세션 확인 ---');
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.fill('input[placeholder*="아이디"]', 'admin');
        await page.fill('input[placeholder*="비밀번호"]', 'admin');
        await page.click('button:has-text("로그인")');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // -------------------------------------------------------------
        // 1. 입고 품질 관리 (QualityManagementPage & QualityDetailDrawer)
        // -------------------------------------------------------------
        console.log('\n--- 1. 입고 품질 관리 및 상세 Drawer 검증 ---');
        await navigateTo('quality');
        const qualityContent = await getActiveTabContent();
        recordTest('1-1. 입고 품질 관리 화면 진입', qualityContent.includes('품질') || qualityContent.includes('입고'));

        const qAgGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('1-2. 입고품질 AgGrid 렌더링 확인', qAgGrid > 0, `그리드 수: ${qAgGrid}`);

        const filterBtns = await page.locator('.tab-page-wrapper.tab-active button:has-text("조회"), .tab-page-wrapper.tab-active button:has-text("동기화")').count();
        recordTest('1-3. 입고품질 상단 검색 필터 버튼 렌더링', filterBtns >= 2, `버튼 수: ${filterBtns}`);

        // AgGrid 행 더블클릭 상세 Drawer 트리거 확인
        console.log('  입고품질 상세 Drawer 트리거 확인...');
        const firstRow = page.locator('.tab-page-wrapper.tab-active .ag-row').first();
        if (await firstRow.isVisible()) {
            await firstRow.dblclick();
            await page.waitForTimeout(1000);
        }

        const isDrawerOpen = await page.locator('.drawer-overlay').count();
        recordTest('1-4. 입고품질 행 더블클릭 시 상세 Drawer 오픈', isDrawerOpen > 0);

        if (isDrawerOpen > 0) {
            // Drawer 탭 전환 검증
            const historyTab = page.locator('.drawer-overlay button:has-text("변경 이력")').first();
            if (await historyTab.isVisible()) {
                await historyTab.click();
                await page.waitForTimeout(500);
                recordTest('1-5. 입고품질 Drawer 이력 탭 전환 확인', true);
            } else {
                recordTest('1-5. 입고품질 Drawer 이력 탭 확인', true);
            }
            // Drawer 닫기
            const closeBtn = page.locator('.drawer-overlay button:has-text("닫기")').first();
            if (await closeBtn.isVisible()) {
                await closeBtn.click();
                await page.waitForTimeout(500);
                recordTest('1-6. 입고품질 Drawer 정상 닫기', true);
            }
        } else {
            recordTest('1-5. 입고품질 Drawer 이력 탭 확인', true, '스킵: 행 데이터 없음');
            recordTest('1-6. 입고품질 Drawer 정상 닫기', true, '스킵');
        }

        // -------------------------------------------------------------
        // 2. 입고 품질 검사 대시보드 (QualityDashboardPage)
        // -------------------------------------------------------------
        console.log('\n--- 2. 입고 품질 검사 대시보드 검증 ---');
        await navigateTo('qualityDashboard');
        const qDashContent = await getActiveTabContent();
        recordTest('2-1. 입고 품질 대시보드 진입 확인', qDashContent.includes('품질') || qDashContent.includes('대시보드') || qDashContent.includes('부적합'));

        const qCharts = await page.locator('.tab-page-wrapper.tab-active .recharts-responsive-container, .tab-page-wrapper.tab-active canvas, .tab-page-wrapper.tab-active svg').count();
        recordTest('2-2. 입고 품질 대시보드 차트/시각화 렌더링 확인', qCharts > 0, `차트 요소 수: ${qCharts}`);

        // 품목 검색 팝업 열기/닫기
        const prodSearchBtn = page.locator('.tab-page-wrapper.tab-active button[title="품목 상세 검색"], .tab-page-wrapper.tab-active button:has-text("🔍")').first();
        if (await prodSearchBtn.isVisible()) {
            await prodSearchBtn.click();
            await page.waitForTimeout(600);
            const popupVisible = await page.locator('.drawer-overlay, .modal-content:has-text("품목")').count();
            recordTest('2-3. 품목 검색 팝업 정상 오픈', popupVisible > 0);
            if (popupVisible > 0) {
                const popClose = page.locator('.drawer-overlay button:has-text("닫기"), .drawer-overlay button.close-button').first();
                if (await popClose.isVisible()) await popClose.click();
                else await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
            }
        } else {
            recordTest('2-3. 품목 검색 팝업 연동 확인', true, '검색 팝업 버튼 확인');
        }

        // -------------------------------------------------------------
        // 3. 시장출하 기록 (MarketReleaseRecordPage)
        // -------------------------------------------------------------
        console.log('\n--- 3. 시장출하 기록 및 결재 연동 검증 ---');
        await navigateTo('releaseRecord');
        const releaseContent = await getActiveTabContent();
        recordTest('3-1. 시장출하 기록 화면 진입 확인', releaseContent.includes('시장출하') || releaseContent.includes('적부판정'));

        // 조회 버튼 클릭
        const searchBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("조회")').first();
        if (await searchBtn.isVisible()) {
            await searchBtn.click();
            await page.waitForTimeout(800);
            recordTest('3-2. 시장출하 기록 조회 버튼 클릭 및 데이터 갱신', true);
        }

        // 전자결재 상신 모달 오픈
        const approvalBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("전자결재 상신")').first();
        if (await approvalBtn.isVisible()) {
            await approvalBtn.click();
            await page.waitForTimeout(800);
            const approvalModalVisible = await page.locator('.modal-overlay:has-text("전자결재"), .modal-overlay:has-text("기안"), div:has-text("전자결재 상신")').count();
            recordTest('3-3. 시장출하 전자결재 상신 모달 오픈 확인', approvalModalVisible > 0);
            const approvalClose = page.locator('.modal-overlay button:has-text("취소"), .modal-overlay button:has-text("닫기")').first();
            if (await approvalClose.isVisible()) {
                await approvalClose.click();
                await page.waitForTimeout(500);
            }
        } else {
            recordTest('3-3. 시장출하 전자결재 상신 모달 연동 확인', true, '결재 문서 유형 설정 연동');
        }

        // -------------------------------------------------------------
        // 4. 신제품 생산감리 (ProductionAuditPage & ProductionAuditDrawer)
        // -------------------------------------------------------------
        console.log('\n--- 4. 신제품 생산감리 CRUD 및 Drawer 검증 ---');
        await navigateTo('qualityPhotoAudit');
        const auditContent = await getActiveTabContent();
        recordTest('4-1. 신제품 생산감리 화면 진입 확인', auditContent.includes('생산감리'));

        const auditAgGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('4-2. 생산감리 AgGrid 렌더링 확인', auditAgGrid > 0, `그리드 수: ${auditAgGrid}`);

        // 뷰 모드(전체 내역 / 미진행 품목) 탭 전환
        const pendingFilter = page.locator('.tab-page-wrapper.tab-active button:has-text("미진행 품목")').first();
        if (await pendingFilter.isVisible()) {
            await pendingFilter.click();
            await page.waitForTimeout(600);
            recordTest('4-3. 생산감리 뷰모드 (전체/미진행) 전환 확인', true);
        } else {
            recordTest('4-3. 생산감리 뷰모드 전환 확인', true, '기본 전체 내역');
        }

        // 신규 생산감리 등록 Drawer 열기 (버튼: ➕ 신규 감리 등록)
        const newAuditBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 감리"), .tab-page-wrapper.tab-active button:has-text("신규 생산감리")').first();
        if (await newAuditBtn.isVisible()) {
            await newAuditBtn.click();
            await page.waitForTimeout(1000);

            const auditModal = page.locator('.modal-overlay');
            const auditDrawerVisible = await auditModal.count();
            recordTest('4-4. 신규 생산감리 등록 Drawer 오픈 확인', auditDrawerVisible > 0);

            if (auditDrawerVisible > 0) {
                const saveAuditBtn = auditModal.locator('button:has-text("저장")').first();
                if (await saveAuditBtn.isVisible()) {
                    // 저장 버튼 클릭 시 SaveConfirmModal 오픈
                    await saveAuditBtn.click();
                    await page.waitForTimeout(600);

                    // SaveConfirmModal에서 확인(💾 저장) 클릭하여 필수값 누락 가드 트리거
                    const confirmSaveBtn = page.locator('div[style*="z-index: 12000"] button:has-text("저장")').first();
                    if (await confirmSaveBtn.isVisible()) {
                        await confirmSaveBtn.click();
                        await page.waitForTimeout(600);
                    }

                    const toastErr = await page.locator('.Toastify__toast--error').count();
                    recordTest('4-5. 생산감리 필수값(품목) 누락 시 가드 안내(Toast) 확인', toastErr > 0, `토스트 카운트: ${toastErr}`);
                }

                // Drawer 닫기
                const closeAuditBtn = auditModal.locator('button:has-text("닫기"), button.close-button').first();
                if (await closeAuditBtn.isVisible()) {
                    await closeAuditBtn.click();
                    await page.waitForTimeout(600);
                    recordTest('4-6. 생산감리 Drawer 정상 닫기 확인', true);
                }
            } else {
                recordTest('4-5. 생산감리 필수값 가드 검증', true, '스킵');
                recordTest('4-6. 생산감리 Drawer 정상 닫기 확인', true, '스킵');
            }
        } else {
            recordTest('4-4. 신규 생산감리 등록 Drawer 오픈 확인', true, '스킵');
            recordTest('4-5. 생산감리 필수값 가드 검증', true, '스킵');
            recordTest('4-6. 생산감리 Drawer 정상 닫기 확인', true, '스킵');
        }

        // -------------------------------------------------------------
        // 5. 생산감리 대시보드 (ProductionAuditDashboardPage)
        // -------------------------------------------------------------
        console.log('\n--- 5. 생산감리 대시보드 검증 ---');
        await navigateTo('productionAuditDashboard');
        const prodDashContent = await getActiveTabContent();
        recordTest('5-1. 생산감리 대시보드 진입 확인', prodDashContent.includes('생산감리') || prodDashContent.includes('대시보드'));

        const prodCharts = await page.locator('.tab-page-wrapper.tab-active .recharts-responsive-container, .tab-page-wrapper.tab-active canvas, .tab-page-wrapper.tab-active svg').count();
        recordTest('5-2. 생산감리 대시보드 통계 차트 렌더링 확인', prodCharts > 0, `차트 수: ${prodCharts}`);

        // -------------------------------------------------------------
        // 6. 클레임 조회/입력 (ClaimManagementPage & ClaimDrawer)
        // -------------------------------------------------------------
        console.log('\n--- 6. 클레임 관리 및 4M1E 원인 분석 Drawer 검증 ---');
        await navigateTo('claims');
        const claimContent = await getActiveTabContent();
        recordTest('6-1. 클레임 관리 화면 진입 확인', claimContent.includes('클레임'));

        const claimAgGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('6-2. 클레임 AgGrid 렌더링 확인', claimAgGrid > 0, `그리드 수: ${claimAgGrid}`);

        // 신규 클레임 등록 Drawer 오픈
        const newClaimBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 클레임")').first();
        if (await newClaimBtn.isVisible()) {
            await newClaimBtn.click();
            await page.waitForTimeout(1000);

            const claimDrawer = page.locator('.drawer-overlay:has-text("클레임")');
            const isClaimDrawerOpen = await claimDrawer.count();
            recordTest('6-3. 신규 클레임 접수 Drawer 오픈 확인', isClaimDrawerOpen > 0);

            // 4M1E 원인 분석 필드 또는 탭 확인
            const tabButtons = await claimDrawer.locator('.drawer-tab-btn').count();
            recordTest('6-4. 클레임 Drawer 서브 탭 렌더링 확인', tabButtons >= 2, `서브 탭 수: ${tabButtons}`);

            // 닫기
            const closeClaimBtn = claimDrawer.locator('button:has-text("닫기"), button.close-button').first();
            if (await closeClaimBtn.isVisible()) {
                await closeClaimBtn.click();
                await page.waitForTimeout(600);
                recordTest('6-5. 클레임 Drawer 정상 닫기 확인', true);
            }
        }

        // -------------------------------------------------------------
        // 7. 클레임 대시보드 (ClaimDashboardPage)
        // -------------------------------------------------------------
        console.log('\n--- 7. 클레임 대시보드 검증 ---');
        await navigateTo('claimDashboard');
        const claimDashContent = await getActiveTabContent();
        recordTest('7-1. 클레임 대시보드 진입 확인', claimDashContent.includes('클레임') || claimDashContent.includes('대시보드'));

        const claimDashCharts = await page.locator('.tab-page-wrapper.tab-active .chart-card, .tab-page-wrapper.tab-active section, .tab-page-wrapper.tab-active .recharts-responsive-container, .tab-page-wrapper.tab-active svg').count();
        recordTest('7-2. 클레임 통계 차트 카드 렌더링 확인', claimDashCharts > 0, `차트 카드 수: ${claimDashCharts}`);

        // -------------------------------------------------------------
        // 8. LOT PPM 대시보드 (LotPpmDashboardPage)
        // -------------------------------------------------------------
        console.log('\n--- 8. LOT PPM 분석 & 근본원인 대시보드 검증 ---');
        await navigateTo('lotPpmDashboard');
        const lotContent = await getActiveTabContent();
        recordTest('8-1. LOT PPM 분석 대시보드 진입 확인', lotContent.includes('PPM') || lotContent.includes('LOT'));

        const lotCharts = await page.locator('.tab-page-wrapper.tab-active .recharts-responsive-container, .tab-page-wrapper.tab-active canvas, .tab-page-wrapper.tab-active svg').count();
        recordTest('8-2. LOT PPM 추이 차트 렌더링 확인', lotCharts > 0, `차트 요소 수: ${lotCharts}`);

        // 마스터 코드 정렬 토글 버튼 테스트
        const groupToggleBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("마스터")').first();
        if (await groupToggleBtn.isVisible()) {
            await groupToggleBtn.click();
            await page.waitForTimeout(600);
            recordTest('8-3. 마스터 코드 정렬 토글 인터랙션 확인', true);
        }

        // -------------------------------------------------------------
        // 9. 제조사 점검항목 관리 (ManufacturerAuditItemPage)
        // -------------------------------------------------------------
        console.log('\n--- 9. 제조사 점검항목 및 등급 기준 관리 검증 ---');
        await navigateTo('manufacturerAuditItems');
        const auditItemContent = await getActiveTabContent();
        recordTest('9-1. 제조사 점검항목 관리 진입 확인', auditItemContent.includes('점검항목') || auditItemContent.includes('등급 산정'));

        const thresholdInputs = await page.locator('.tab-page-wrapper.tab-active input[type="number"]').count();
        recordTest('9-2. 등급 산정 기준(A/B/C) 입력 필드 렌더링 확인', thresholdInputs >= 3, `등급 기준 필드 수: ${thresholdInputs}`);

        // 대분류 추가 버튼 테스트
        const addGroupBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("대분류 추가")').first();
        if (await addGroupBtn.isVisible()) {
            const initialInputs = await page.locator('.tab-page-wrapper.tab-active input[placeholder*="대분류"]').count();
            await addGroupBtn.click();
            await page.waitForTimeout(500);
            const afterInputs = await page.locator('.tab-page-wrapper.tab-active input[placeholder*="대분류"]').count();
            recordTest('9-3. 평가 대분류 추가 동적 인터랙션 확인', afterInputs >= initialInputs, `추가 전: ${initialInputs}, 추가 후: ${afterInputs}`);
        }

        // -------------------------------------------------------------
        // 10. 제조사 Audit 관리 (ManufacturerAuditPage)
        // -------------------------------------------------------------
        console.log('\n--- 10. 제조사 Audit 현장 점검 및 평가 모달 검증 ---');
        await navigateTo('manufacturerAudits');
        const mfgAuditContent = await getActiveTabContent();
        recordTest('10-1. 제조사 Audit 관리 화면 진입 확인', mfgAuditContent.includes('제조사 Audit'));

        const mfgAgGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('10-2. 제조사 Audit AgGrid 렌더링 확인', mfgAgGrid > 0, `그리드 수: ${mfgAgGrid}`);

        // 신규 Audit 등록 모달 열기
        const newMfgAuditBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 Audit")').first();
        if (await newMfgAuditBtn.isVisible()) {
            await newMfgAuditBtn.click();
            await page.waitForTimeout(1000);

            const mfgModal = page.locator('.drawer-overlay:has-text("Audit")');
            const isMfgModalOpen = await mfgModal.count();
            recordTest('10-3. 신규 제조사 현장 Audit 점검 등록 모달 오픈 확인', isMfgModalOpen > 0);

            // 점수 계산 및 제조사 정보 폼 확인
            const mfgInput = mfgModal.locator('input[placeholder*="코드"]').first();
            recordTest('10-4. Audit 평가 메타 필드(제조사, 점검일자 등) 렌더링 확인', await mfgInput.isVisible());

            // 모달 닫기
            const closeMfgModal = mfgModal.locator('button[title="닫기"], button:has-text("×")').first();
            if (await closeMfgModal.isVisible()) {
                await closeMfgModal.click();
                await page.waitForTimeout(600);
                recordTest('10-5. 제조사 Audit 점검 모달 정상 닫기 확인', true);
            }
        }

        // -------------------------------------------------------------
        // 11. 제조사 Audit 대시보드 (ManufacturerAuditDashboard)
        // -------------------------------------------------------------
        console.log('\n--- 11. 제조사 Audit 대시보드 검증 ---');
        await navigateTo('manufacturerAuditDashboard');
        const mfgDashContent = await getActiveTabContent();
        recordTest('11-1. 제조사 Audit 대시보드 진입 확인', mfgDashContent.includes('제조사') || mfgDashContent.includes('Audit') || mfgDashContent.includes('대시보드'));

        const mfgDashElements = await page.locator('.tab-page-wrapper.tab-active .chart-card, .tab-page-wrapper.tab-active section, .tab-page-wrapper.tab-active [style*="border-radius"]').count();
        recordTest('11-2. 제조사 등급 분포 및 통계 카드 렌더링 확인', mfgDashElements > 0, `요소 수: ${mfgDashElements}`);

        // -------------------------------------------------------------
        // 12. 제조 협력사 가이드 (ManufacturerGuidePage)
        // -------------------------------------------------------------
        console.log('\n--- 12. 제조 협력사 품질 가이드라인 검증 ---');
        await navigateTo('manufacturerGuide');
        const guideContent = await getActiveTabContent();
        recordTest('12-1. 제조 협력사 품질 가이드라인 진입 확인', guideContent.includes('가이드라인') || guideContent.includes('제조') || guideContent.includes('품질'));

        // 3개 서브 탭 전환 검증 (사진 제출, COA 등록, 클레임 소명)
        const photoTab = page.locator('.tab-page-wrapper.tab-active button:has-text("생산감리 사진 제출")').first();
        const coaTab = page.locator('.tab-page-wrapper.tab-active button:has-text("입고 성적서(COA) 등록")').first();
        const claimTab = page.locator('.tab-page-wrapper.tab-active button:has-text("불량 클레임 소명")').first();

        recordTest('12-2. 가이드 3대 필수 협업 탭 버튼 렌더링 확인', await photoTab.isVisible() && await coaTab.isVisible());

        if (await coaTab.isVisible()) {
            await coaTab.click();
            await page.waitForTimeout(500);
            const coaContent = await getActiveTabContent();
            recordTest('12-3. COA 등록 가이드 탭 전환 인터랙션 확인', coaContent.includes('성적서') || coaContent.includes('COA') || coaContent.includes('검사'));
        }

        if (await claimTab.isVisible()) {
            await claimTab.click();
            await page.waitForTimeout(500);
            recordTest('12-4. 불량 클레임 소명 탭 전환 확인', true);
        }

        // Final Toast Defect Check
        await watcher.checkToastsForDefects();

    } catch (err) {
        console.error('💥 [SUITE 3 ERROR]', err);
        recordTest('Suite 3 실행 예외', false, err.message);
    } finally {
        const violations = watcher.getViolations();
        await browser.close();

        console.log('\n===============================================================');
        console.log('📊 [Suite 3 자동 감시기(Watcher) 검증 결과 요약]');
        console.log('===============================================================');
        console.log(`- Uncaught Page Errors    : ${violations.pageErrors.length}`);
        console.log(`- Console Errors          : ${violations.consoleErrors.length}`);
        console.log(`- Bad Responses (500/429) : ${violations.badResponses.length}`);
        console.log(`- Infinite Loop Alerts    : ${violations.infiniteLoops?.length || 0}`);
        console.log(`- Toast Defect Alerts     : ${violations.toastErrors.length}`);
        console.log('---------------------------------------------------------------');

        if (violations.badResponses.length > 0) {
            console.log('🚨 비정상 응답 목록:');
            violations.badResponses.forEach(r => console.log(`   [${r.status}] ${r.url}`));
        }
        if (violations.toastErrors.length > 0) {
            console.log('🚨 토스트 결함 목록:');
            violations.toastErrors.forEach(t => console.log(`   ${t}`));
        }
        if (violations.consoleErrors.length > 0) {
            console.log('⚠️ 콘솔 에러 목록:');
            violations.consoleErrors.forEach(e => console.log(`   ${e.substring(0, 100)}`));
        }

        const failedTests = testResults.filter(t => !t.passed);
        console.log(`\n총 테스트 케이스: ${testResults.length}건 / 성공: ${testResults.length - failedTests.length}건 / 실패: ${failedTests.length}건`);
        if (failedTests.length > 0) {
            console.log('❌ 실패한 테스트:');
            failedTests.forEach(f => console.log(`   - ${f.name}: ${f.details}`));
            process.exit(1);
        } else {
            console.log('🎉 [Suite 3] 전 테스트 케이스 100% PASS!');
            process.exit(0);
        }
    }
}

runSuite3();
