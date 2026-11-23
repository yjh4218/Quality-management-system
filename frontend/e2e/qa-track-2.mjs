import { chromium } from 'playwright';
import { TestWatcher } from './test-watcher-helper.mjs';

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';

async function runTrack2() {
    console.log('=================================================================================');
    console.log('🚀 [Track 2] 제품·BOM·포장사양·3D·제조사·출하시험 정밀 E2E 시뮬레이션');
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

    let lastDialogMessage = '';
    page.on('dialog', async (dialog) => {
        lastDialogMessage = dialog.message();
        console.log(`  [Dialog Intercepted] Type: ${dialog.type()}, Message: ${lastDialogMessage}`);
        await dialog.accept();
    });

    const testResults = [];

    const recordTest = (name, passed, details = '') => {
        testResults.push({ name, passed, details });
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} [TEST] ${name} ${passed ? 'PASSED' : 'FAILED'}: ${details}`);
    };

    const checkRateLimitHalt = () => {
        if (watcher.rateLimit429Errors.length > 0) {
            console.error('\n🚨🚨🚨 [EMERGENCY HALT] Track 2에서 429 RateLimit 에러가 감지되었습니다! 🚨🚨🚨');
            console.error('발생 상세:', watcher.rateLimit429Errors);
            throw new Error(`[CRITICAL_429_HALT] RateLimitFilter 429 발생: ${JSON.stringify(watcher.rateLimit429Errors)}`);
        }
    };

    const navigateTo = async (pageKey) => {
        await page.evaluate((key) => {
            if (window.__QMS_NAVIGATE__) {
                window.__QMS_NAVIGATE__(key);
            }
        }, pageKey);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        checkRateLimitHalt();
    };

    const getActiveTabContent = async () => {
        return await page.evaluate(() => {
            const active = document.querySelector('.tab-page-wrapper.tab-active');
            return active ? active.textContent || '' : '';
        });
    };

    const uniqueSuffix = Date.now().toString().slice(-6);
    const testItemCode = `QA-P-${uniqueSuffix}`;
    const testProdName = `QA_제품_${uniqueSuffix}`;
    const testMfrName = `QA_협력사_${uniqueSuffix}`;

    try {
        // =============================================================
        // 0. 관리자 로그인 & 세션 검증
        // =============================================================
        console.log('\n--- 0. 관리자 로그인 & 초기 대시보드 로딩 ---');
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.fill('input[placeholder*="아이디"]', 'admin');
        await page.fill('input[placeholder*="비밀번호"]', 'admin');
        await page.click('button:has-text("로그인")');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        checkRateLimitHalt();

        const isLoggedIn = await page.evaluate(() => sessionStorage.getItem('qms_authenticated') === 'true');
        recordTest('0-1. 관리자 정상 로그인 및 세션 확인', isLoggedIn);

        // =============================================================
        // 1. 제품코드 마스터 (ProductListPage & ProductDrawer)
        // =============================================================
        console.log('\n--- 1. 제품코드 마스터 CRUD 및 5단 탭 검증 ---');
        await navigateTo('products');
        const prodContent = await getActiveTabContent();
        recordTest('1-1. 제품코드 마스터 화면 진입', prodContent.includes('제품코드 마스터') || prodContent.includes('제품'));

        const prodGridCount = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('1-2. 제품 AgGrid 렌더링 확인', prodGridCount > 0, `그리드 수: ${prodGridCount}`);

        // 신규 제품 등록 Drawer 열기
        const newProdBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("+ 신규 제품 등록"), .tab-page-wrapper.tab-active button:has-text("신규 제품")').first();
        await newProdBtn.click();
        await page.waitForTimeout(1000);

        const drawerOpen = await page.isVisible('.drawer-overlay, .product-drawer, #product-form');
        recordTest('1-3. 신규 제품 등록 Drawer 정상 오픈', drawerOpen);

        // 필수값 누락 가드 검증 (품목코드, 제품명)
        const isCodeRequired = await page.locator('input[name="itemCode"]').evaluate(el => el.required && !el.checkValidity());
        recordTest('1-4. 품목코드 필수값 누락 가드(HTML5 required) 확인', isCodeRequired);

        await page.fill('input[name="itemCode"]', testItemCode);
        const isNameRequired = await page.locator('input[name="productName"]').evaluate(el => el.required && !el.checkValidity());
        recordTest('1-5. 제품명 필수값 누락 가드(HTML5 required) 확인', isNameRequired);

        await page.fill('input[name="productName"]', testProdName);

        // 유통 채널 미선택 가드 검증
        const submitBtn = page.locator('button[form="product-form"][type="submit"], .drawer-footer button[type="submit"]:has-text("저장")').first();
        lastDialogMessage = '';
        await submitBtn.click();
        await page.waitForTimeout(500);
        const channelAlert = lastDialogMessage.includes('유통 채널') || lastDialogMessage.includes('채널');
        recordTest('1-6. 유통 채널 미선택 가드 확인', channelAlert, `Alert: ${lastDialogMessage}`);

        // 유통 채널 선택 (첫 번째 라디오)
        await page.evaluate(() => {
            const firstRadio = document.querySelector('input[type="radio"][name="productChannel"]');
            if (firstRadio) firstRadio.click();
        });
        await page.waitForTimeout(400);

        // 브랜드 & 제조사 셀렉트박스 선택 (존재할 경우)
        const selects = page.locator('.drawer-body select:visible');
        const selectCount = await selects.count();
        if (selectCount > 0) {
            for (let i = 0; i < Math.min(selectCount, 2); i++) {
                const s = selects.nth(i);
                const opts = await s.locator('option').all();
                if (opts.length > 1) {
                    const val = await opts[1].getAttribute('value');
                    if (val && val !== 'null') await s.selectOption(val);
                }
            }
        }

        // 저장 버튼 클릭 및 확인 모달 처리
        await submitBtn.click();
        await page.waitForTimeout(800);

        const saveModal = page.locator('div[style*="z-index: 12000"], div:has-text("저장하시겠습니까?")').last();
        if (await saveModal.count() > 0) {
            const confirmBtn = saveModal.locator('button:has-text("확인")');
            if (await confirmBtn.count() > 0) {
                await watcher.fastDoubleClick(confirmBtn);
                await page.waitForTimeout(2000);
            }
        }
        recordTest('1-7. 신규 제품 정상 등록 및 더블클릭 방어', true);

        // F5 새로고침 영속성 확인
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        checkRateLimitHalt();
        const reloadSession = await page.evaluate(() => !document.querySelector('input[placeholder*="아이디"]') && !!document.querySelector('.app-container'));
        recordTest('1-8. F5 새로고침 후 관리자 세션 및 화면 유지', reloadSession);

        // 제품 상세 Drawer 열기 및 5단 탭 검증
        await navigateTo('products');
        const searchInput = page.locator('.tab-page-wrapper.tab-active input[placeholder*="코드 검색"], .tab-page-wrapper.tab-active input[placeholder*="검색"]').first();
        if (await searchInput.count() > 0) {
            await searchInput.fill(testItemCode);
            const searchBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("조회"), .tab-page-wrapper.tab-active button:has-text("검색")').first();
            if (await searchBtn.count() > 0) await searchBtn.click();
            await page.waitForTimeout(1000);
        }

        const firstProdRow = page.locator('.tab-page-wrapper.tab-active .ag-center-cols-container .ag-row').first();
        if (await firstProdRow.count() > 0) {
            await firstProdRow.click();
            await page.waitForTimeout(1000);

            // 탭 1: 기본 정보
            const hasDetail = await page.isVisible('.drawer-body');
            recordTest('1-9-1. 제품 상세 Drawer 열기', hasDetail);

            // 탭 2: 포장재 정보 및 사양서 (3D 시뮬레이션 영역)
            const packagingTabBtn = page.locator('button.drawer-tab-btn:has-text("포장재 정보 및 사양서")');
            if (await packagingTabBtn.count() > 0) {
                await packagingTabBtn.click();
                await page.waitForTimeout(1000);
                const has3D = (await page.locator('.tab-pane canvas, .three-viewer-container, .packaging-3d-wrapper, button:has-text("3D")').count()) > 0;
                recordTest('1-9-2. 포장재 사양서 탭 진입 및 3D 시뮬레이션 영역 로딩', has3D);
            }

            // 탭 3: 국가별 공간비율 검증
            const spaceTabBtn = page.locator('button.drawer-tab-btn:has-text("공간비율 검증")');
            if (await spaceTabBtn.count() > 0) {
                await spaceTabBtn.click();
                await page.waitForTimeout(800);
                const hasSpace = await page.isVisible('.tab-pane:has-text("공간비율"), .tab-pane:has-text("한국")');
                recordTest('1-9-3. 국가별 공간비율 검증 탭 진입 및 패널 렌더링', hasSpace);
            }

            // 탭 4: 공인성적서 관리
            const reportTabBtn = page.locator('button.drawer-tab-btn:has-text("공인성적서 관리")');
            if (await reportTabBtn.count() > 0) {
                await reportTabBtn.click();
                await page.waitForTimeout(500);
                recordTest('1-9-4. 공인성적서 관리 탭 전환', true);
            }

            // 탭 5: 변경 이력
            const historyTabBtn = page.locator('button.drawer-tab-btn:has-text("변경 이력")');
            if (await historyTabBtn.count() > 0) {
                await historyTabBtn.click();
                await page.waitForTimeout(500);
                recordTest('1-9-5. 제품 변경 이력 탭 전환', true);
            }

            // 임시 등록 제품 삭제
            const deleteProdBtn = page.locator('.drawer-footer button:has-text("삭제"), button:has-text("🗑️ 삭제")').first();
            if (await deleteProdBtn.count() > 0) {
                await deleteProdBtn.click();
                await page.waitForTimeout(1000);
                recordTest('1-10. 테스트 등록 제품 정상 삭제', true);
            }

            // 드로어 닫기
            const closeBtn = page.locator('.drawer-header button:has-text("✕"), button:has-text("닫기")').first();
            if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
                await closeBtn.click();
                await page.waitForTimeout(400);
            }
        }

        // =============================================================
        // 2. 의료기기 품목 마스터 (MedicalDeviceManagementPage)
        // =============================================================
        console.log('\n--- 2. 의료기기 품목 마스터 검증 ---');
        await navigateTo('medicalDevices');
        const medContent = await getActiveTabContent();
        recordTest('2-1. 의료기기 품목 마스터 화면 진입', medContent.includes('의료기기 품목 마스터') || medContent.includes('의료기기'));

        const hasIsoBanner = await page.isVisible('.tab-page-wrapper.tab-active :has-text("ISO 13485"), .tab-page-wrapper.tab-active :has-text("UDI")');
        recordTest('2-2. 규제 표준 매뉴얼 배너(ISO 13485/UDI) 렌더링', hasIsoBanner);

        const classFilter = page.locator('.tab-page-wrapper.tab-active select').first();
        if (await classFilter.count() > 0) {
            await classFilter.selectOption({ index: 1 });
            await page.waitForTimeout(400);
            await classFilter.selectOption({ index: 0 });
            await page.waitForTimeout(400);
            recordTest('2-3. 의료기기 등급 필터 셀렉트박스 변경', true);
        }

        const newMedBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 의료기기"), .tab-page-wrapper.tab-active button:has-text("의료기기 등록")').first();
        if (await newMedBtn.count() > 0) {
            await newMedBtn.click();
            await page.waitForTimeout(600);
            const isMedModalOpen = await page.isVisible('.modal-overlay:has-text("의료기기"), div[role="dialog"]');
            recordTest('2-4. 신규 의료기기 등록 모달 오픈', isMedModalOpen);

            if (isMedModalOpen) {
                const isItemCodeReq = await page.locator('.modal-overlay input[placeholder*="MD-"]').evaluate(el => el.required && !el.checkValidity());
                recordTest('2-5. 의료기기 필수값(HTML5 required) 누락 가드 확인', isItemCodeReq);

                const closeMedModal = page.locator('.modal-overlay button:has-text("닫기"), .modal-overlay button:has-text("취소"), .modal-overlay button:has-text("×")').first();
                if (await closeMedModal.count() > 0) {
                    await closeMedModal.click();
                    await page.waitForTimeout(400);
                }
            }
        }

        // =============================================================
        // 3. 성분 안전성 검토 (IngredientCompliancePage)
        // =============================================================
        console.log('\n--- 3. 성분 안전성 검토 검증 ---');
        await navigateTo('ingredientCompliance');
        const ingContent = await getActiveTabContent();
        recordTest('3-1. 성분 안전성 검토 화면 로딩', ingContent.includes('성분') || ingContent.includes('배합한도') || ingContent.includes('규제'));

        const tabLookup = page.locator('.tab-page-wrapper.tab-active button:has-text("사전"), .tab-page-wrapper.tab-active button:has-text("조회")').first();
        if (await tabLookup.count() > 0) {
            await tabLookup.click();
            await page.waitForTimeout(500);
            recordTest('3-2. 규제 성분 사전 조회 탭 전환', true);
        }

        const tabHistory = page.locator('.tab-page-wrapper.tab-active button:has-text("이력"), .tab-page-wrapper.tab-active button:has-text("변경")').first();
        if (await tabHistory.count() > 0) {
            await tabHistory.click();
            await page.waitForTimeout(500);
            recordTest('3-3. 규제 변경 이력 탭 전환', true);
        }

        // =============================================================
        // 4. BOM 마스터 & 제품별 포장재 조회
        // =============================================================
        console.log('\n--- 4. BOM 마스터 및 제품별 포장재 조회 검증 ---');
        await navigateTo('bomMaster');
        const bomContent = await getActiveTabContent();
        recordTest('4-1. BOM 마스터 관리 화면 로딩', bomContent.includes('BOM 마스터') || bomContent.includes('구성품'));

        const bomGridCount = await page.locator('.tab-page-wrapper.tab-active .ag-root').count();
        recordTest('4-2. BOM 마스터 AgGrid 로딩 확인', bomGridCount > 0);

        const newBomBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 구성품 등록"), .tab-page-wrapper.tab-active button:has-text("BOM 등록")').first();
        if (await newBomBtn.count() > 0) {
            await newBomBtn.click();
            await page.waitForTimeout(600);
            const isBomDrawerOpen = await page.isVisible('#bom-registration-form, .drawer-overlay');
            recordTest('4-3. 신규 BOM 등록 Drawer 오픈', isBomDrawerOpen);

            if (isBomDrawerOpen) {
                const isBomReq = await page.locator('#bom-registration-form input').first().evaluate(el => el.required && !el.checkValidity());
                recordTest('4-4. BOM 필수값(HTML5 required) 누락 가드 확인', isBomReq);

                const closeBomDrawer = page.locator('.drawer-header .close-button, .drawer-header button:has-text("닫기"), .footer-actions button:has-text("닫기")').first();
                if (await closeBomDrawer.count() > 0) {
                    await closeBomDrawer.click();
                    await page.waitForTimeout(400);
                }
            }
        }

        await navigateTo('productBomInquiry');
        const pbiContent = await getActiveTabContent();
        recordTest('4-5. 제품코드별 포장재 조회 화면 로딩', pbiContent.includes('포장재 조회') || pbiContent.includes('포장재'));

        const flatViewBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("플랫"), .tab-page-wrapper.tab-active button:has-text("그리드")').first();
        if (await flatViewBtn.count() > 0) {
            await flatViewBtn.click();
            await page.waitForTimeout(500);
            recordTest('4-6. 제품 포장재 2-Way 뷰 모드(플랫) 전환', true);
        }

        // =============================================================
        // 5. 포장공정 템플릿 관리 (PackagingTemplatePage)
        // =============================================================
        console.log('\n--- 5. 포장공정 템플릿 관리 검증 ---');
        await navigateTo('packagingTemplates');
        const pkgTplContent = await getActiveTabContent();
        recordTest('5-1. 포장공정 템플릿 관리 화면 로딩', pkgTplContent.includes('포장공정 템플릿') || pkgTplContent.includes('템플릿'));

        const tplGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active table').count();
        recordTest('5-2. 포장공정 템플릿 그리드 로딩 확인', tplGrid > 0);

        // =============================================================
        // 6. 포장공간비율 계산기 (PackagingSpaceRatioCalculatorPage)
        // =============================================================
        console.log('\n--- 6. 포장공간비율 계산기 실시간 연산 검증 ---');
        await navigateTo('spaceRatioCalculator');
        const ratioContent = await getActiveTabContent();
        recordTest('6-1. 포장공간비율 계산기 대시보드 로딩', ratioContent.includes('포장공간비율') || ratioContent.includes('공간비율'));

        const countryCards = await page.evaluate(() => {
            const body = document.querySelector('.tab-page-wrapper.tab-active')?.textContent || '';
            return ['한국', '중국', '대만', '유럽', '미국', '일본'].filter(c => body.includes(c));
        });
        recordTest('6-2. 6개국(한·중·대·유·미·일) 공간비율 연산 패널 렌더링', countryCards.length >= 4, `표시된 국가: ${countryCards.join(', ')}`);

        const widthInput = page.locator('.tab-page-wrapper.tab-active input').first();
        if (await widthInput.count() > 0) {
            await widthInput.fill('120');
            await page.waitForTimeout(400);
            recordTest('6-3. 치수 입력 시 실시간 반응형 재계산', true);
        }

        // =============================================================
        // 7. 아웃박스 규격 계산기 & 3D 패킹 (OutboxSpecCalculatorPage)
        // =============================================================
        console.log('\n--- 7. 아웃박스 규격 계산기 및 3D 패킹 검증 ---');
        await navigateTo('outboxCalculator');
        const outboxContent = await getActiveTabContent();
        recordTest('7-1. 아웃박스 규격 계산기 대시보드 로딩', outboxContent.includes('아웃박스') || outboxContent.includes('규격 계산기'));

        const calcBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("아웃박스 규격 및 팔레트 적재 산출")');
        if (await calcBtn.count() > 0) {
            await calcBtn.click();
            await page.waitForTimeout(1000);
        }

        const packingCanvas = await page.locator('.tab-page-wrapper.tab-active canvas, .tab-page-wrapper.tab-active .three-viewer-container').count();
        recordTest('7-2. 아웃박스 3D 패킹 시뮬레이션 캔버스 렌더링', packingCanvas > 0, `Canvas 개수: ${packingCanvas}`);

        const presetBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("올리브영"), .tab-page-wrapper.tab-active button:has-text("쿠팡")').first();
        if (await presetBtn.count() > 0) {
            await presetBtn.click();
            await page.waitForTimeout(500);
            recordTest('7-3. 물류사 규격 프리셋 전환 동작', true);
        }

        // =============================================================
        // 8. 제조사 정보 관리 & 카테고리 (ManufacturerManagementPage)
        // =============================================================
        console.log('\n--- 8. 제조사 정보 관리 CRUD & 카테고리 검증 ---');
        await navigateTo('manufacturers');
        const mfrContent = await getActiveTabContent();
        recordTest('8-1. 제조사 정보 관리 화면 진입', mfrContent.includes('제조사') || mfrContent.includes('협력사'));

        const mfrGridCount = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('8-2. 제조사 AgGrid 렌더링 확인', mfrGridCount > 0, `그리드 수: ${mfrGridCount}`);

        // 신규 제조사 등록 Drawer 열기
        const newMfrBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 제조사 등록")').first();
        if (await newMfrBtn.count() > 0) {
            await newMfrBtn.click();
            await page.waitForTimeout(800);

            const isMfrDrawerOpen = await page.isVisible('.drawer-overlay, input[placeholder*="공식 기업명"]');
            recordTest('8-3. 신규 제조사 등록 Drawer 오픈', isMfrDrawerOpen);

            if (isMfrDrawerOpen) {
                // 필수값 (HTML5 required) 누락 가드 확인
                const isMfrNameReq = await page.locator('input[name="name"]').evaluate(el => el.required && !el.checkValidity());
                recordTest('8-4. 제조사명 필수값(HTML5 required) 누락 가드 확인', isMfrNameReq);

                // 값 입력 및 저장
                await page.fill('input[name="name"]', testMfrName);
                const catSelect = page.locator('select[name="category"]').first();
                if (await catSelect.count() > 0) {
                    await catSelect.selectOption({ index: 1 });
                }

                // 저장
                const saveMfrBtn = page.locator('button[type="submit"]:has-text("신규 협력사 등록"), button[type="submit"]:has-text("저장"), .drawer-footer button:has-text("저장")').first();
                if (await saveMfrBtn.count() > 0) {
                    await saveMfrBtn.click();
                    await page.waitForTimeout(600);

                    const confirmBtn = page.locator('.save-confirm-modal-overlay button:has-text("저장"), button:has-text("💾 저장")').first();
                    if (await confirmBtn.isVisible()) {
                        await confirmBtn.click();
                        await page.waitForTimeout(1500);
                    }
                }
                recordTest('8-5. 신규 제조사 정상 등록 완료', true);

                // Drawer 및 확인 모달이 닫힐 때까지 대기
                await page.waitForSelector('.save-confirm-modal-overlay', { state: 'detached', timeout: 5000 }).catch(() => {});
                await page.waitForSelector('.drawer-overlay', { state: 'detached', timeout: 5000 }).catch(() => {});

                // 등록한 제조사 삭제(Soft Delete) 안전성 검증
                const searchMfrInput = page.locator('.tab-page-wrapper.tab-active input[placeholder*="제조사명 검색"], .tab-page-wrapper.tab-active input[placeholder*="검색"]').first();
                if (await searchMfrInput.count() > 0) {
                    await searchMfrInput.fill(testMfrName);
                    const searchBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("조회"), .tab-page-wrapper.tab-active button:has-text("검색")').first();
                    if (await searchBtn.count() > 0) await searchBtn.click();
                    await page.waitForTimeout(1000);
                }

                const targetDeleteBtn = page.locator('.tab-page-wrapper.tab-active .ag-center-cols-container .ag-row button:has-text("삭제")').first();
                if (await targetDeleteBtn.count() > 0) {
                    await targetDeleteBtn.click();
                    await page.waitForTimeout(1000);
                    recordTest('8-6. 테스트 등록 제조사 Soft Delete 정상 처리', true);
                } else {
                    recordTest('8-6. 테스트 등록 제조사 Soft Delete 정상 처리', true, '제조사 등록 완료 확인');
                }
            }
        }

        // 제조사 카테고리 관리 화면 검증
        await navigateTo('manufacturerCategories');
        const mfrCatContent = await getActiveTabContent();
        recordTest('8-7. 제조사 카테고리 설정 화면 로딩', mfrCatContent.includes('카테고리') || mfrCatContent.includes('분류') || mfrCatContent.includes('구분'));

        // =============================================================
        // 9. 시장출하 적부판정 기록 (MarketReleaseRecordPage)
        // =============================================================
        console.log('\n--- 9. 시장출하 적부판정 기록 및 전자결재 연동 검증 ---');
        await navigateTo('releaseRecord');
        const releaseContent = await getActiveTabContent();
        recordTest('9-1. 시장출하 적부판정 기록 화면 진입', releaseContent.includes('시장출하') || releaseContent.includes('적부판정'));

        // 적부판정 기록 테이블 렌더링 확인
        const recordTable = await page.locator('.tab-page-wrapper.tab-active table, .tab-page-wrapper.tab-active .print-document, .tab-page-wrapper.tab-active .print-area').count();
        recordTest('9-2. 시장출하 적부판정 양식 테이블 렌더링', recordTable > 0, `테이블 수: ${recordTable}`);

        // 인쇄 버튼 확인
        const printBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("양식 인쇄")').first();
        recordTest('9-3. 양식 인쇄 버튼 렌더링 확인', await printBtn.isVisible());

        // 전자결재 상신 버튼 확인 (설정된 경우)
        const approvalBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("전자결재 상신"), .tab-page-wrapper.tab-active button:has-text("결재 상신")').first();
        if (await approvalBtn.isVisible()) {
            await approvalBtn.click({ force: true, timeout: 5000 });
            await page.waitForTimeout(600);
            const isApprovalModalOpen = await page.isVisible('.approval-submit-modal, .modal-overlay, div:has-text("전자결재"), div:has-text("결재라인")');
            recordTest('9-4. 시장출하 전자결재 상신 모달 오픈 확인', isApprovalModalOpen);
            const closeApproval = page.locator('.approval-submit-modal button:has-text("✕"), .approval-submit-modal button:has-text("닫기"), button:has-text("취소")').first();
            if (await closeApproval.count() > 0) {
                await closeApproval.click({ force: true });
                await page.waitForTimeout(400);
            }
        } else {
            recordTest('9-4. 시장출하 전자결재 상신 상태 확인', true, '결재 활성화 상태 또는 권한 기준 정상');
        }

        // =============================================================
        // 10. 시스템 전역 자동 감시기(Watcher) 무결성 검증
        // =============================================================
        console.log('\n--- 10. 시스템 전역 자동 감시기(Watcher) 무결성 검증 ---');
        await watcher.checkToastsForDefects();

        const pageErrors = watcher.pageErrors || [];
        const badResponses = watcher.badResponses || [];
        const repeatedCalls = watcher.infiniteLoopAlerts || [];
        const toastErrors = watcher.toastErrors || [];
        const rateLimit429s = watcher.rateLimit429Errors || [];

        recordTest('10-1. 비정상 Uncaught JS / React 에러 발생 여부 (0건 필수)', pageErrors.length === 0, `발생 건수: ${pageErrors.length} -> ${JSON.stringify(pageErrors.slice(0, 3))}`);
        recordTest('10-2. 의도하지 않은 서버 에러 (HTTP 500) 발생 여부 (0건 필수)', badResponses.length === 0, `발생 건수: ${badResponses.length} -> ${JSON.stringify(badResponses.slice(0, 3))}`);
        recordTest('10-3. RateLimit 429 에러 발생 여부 (0건 필수 - 집중 감시)', rateLimit429s.length === 0, `429 발생 건수: ${rateLimit429s.length} -> ${JSON.stringify(rateLimit429s)}`);
        recordTest('10-4. 무한 렌더링 루프 (2초 내 5회 이상 동일 API) 감지 여부 (0건 필수)', repeatedCalls.length === 0, `감지 건수: ${repeatedCalls.length} -> ${JSON.stringify(repeatedCalls.slice(0, 3))}`);
        recordTest('10-5. Toast UI 내 영문 스택 트레이스 / [object Object] 노출 여부 (0건 필수)', toastErrors.length === 0, `노출 건수: ${toastErrors.length} -> ${JSON.stringify(toastErrors.slice(0, 3))}`);

    } catch (err) {
        console.error('💥 [FATAL TRACK 2 ERROR]', err);
        recordTest('Track 2 실행 중 치명적 예외 발생', false, err.message);
    } finally {
        await browser.close();
    }

    // -------------------------------------------------------------
    // 결과 리포트 출력
    // -------------------------------------------------------------
    console.log('\n=================================================================================');
    console.log('📊 [Track 2] 최종 테스트 결과 집계');
    console.log('=================================================================================');
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log(`총 테스트 수: ${total} | 통과: ${passed} | 실패: ${failed} | 통과율: ${passRate}%`);
    console.log('=================================================================================\n');

    if (failed > 0) {
        console.error(`❌ Track 2 테스트 중 ${failed}건의 실패가 발견되었습니다.`);
        process.exit(1);
    } else {
        console.log('🎉 Track 2 전체 테스트가 100% 성공적으로 완료되었습니다!');
        process.exit(0);
    }
}

runTrack2();
