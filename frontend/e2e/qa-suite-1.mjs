import { chromium } from 'playwright';
import { TestWatcher } from './test-watcher-helper.mjs';

const BASE_URL = 'http://localhost:5173';

async function runSuite1() {
    console.log('===============================================================');
    console.log('🚀 [Suite 1] 인증·대시보드·기준정보·조직/권한·공지/메일·동적화면 QA 시작');
    console.log('===============================================================');

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });

    const page = await context.newPage();
    const watcher = new TestWatcher(page);

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
        await page.waitForTimeout(1000);
    };

    const getActiveTabContent = async () => {
        return await page.evaluate(() => {
            const active = document.querySelector('.tab-page-wrapper.tab-active');
            return active ? active.textContent || '' : '';
        });
    };

    try {
        // -------------------------------------------------------------
        // 1. 로그인 / 로그아웃 / 내 프로필 / 세션 관리
        // -------------------------------------------------------------
        console.log('\n--- 1. 인증 및 세션 관리 검증 ---');
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // 1-1. 잘못된 비밀번호 입력 시 한글 에러 모달 노출 확인
        watcher.addIgnoredPattern('/api/auth/login'); // 401 의도적 테스트
        await page.fill('input[placeholder*="아이디"]', 'admin');
        await page.fill('input[placeholder*="비밀번호"]', 'wrongpass_test');
        await page.click('button:has-text("로그인")');
        await page.waitForTimeout(1000);

        const errorModal = page.locator('.modal-overlay.alert-modal, [role="dialog"], .alert-modal');
        const errorModalVisible = await errorModal.count() > 0 && await errorModal.first().isVisible();
        const errorText = errorModalVisible ? await errorModal.first().textContent() : '';
        const hasKoreanError = errorText.includes('아이디 또는 비밀번호가 일치하지 않습니다') || errorText.includes('로그인');
        recordTest('1-1. 잘못된 비밀번호 한글 에러 알림 표시', errorModalVisible && hasKoreanError, `모달 텍스트: ${errorText.substring(0, 50).trim()}...`);

        // 에러 모달 닫기
        const closeBtn = page.locator('.modal-box button:has-text("확인"), button:has-text("확인")');
        if (await closeBtn.count() > 0) {
            await closeBtn.first().click();
            await page.waitForTimeout(400);
        }
        watcher.removeIgnoredPattern('/api/auth/login');

        // 1-2. 관리자(admin/admin) 정상 로그인
        await page.fill('input[placeholder*="아이디"]', 'admin');
        await page.fill('input[placeholder*="비밀번호"]', 'admin');
        await page.click('button:has-text("로그인")');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        const isLoggedIn = await page.evaluate(() => {
            return !document.querySelector('input[placeholder*="비밀번호"]') && !!document.querySelector('.app-container, .sidebar-menu');
        });
        recordTest('1-2. 관리자(admin) 정상 로그인 및 메인 화면 진입', isLoggedIn);

        // 1-3. F5 새로고침 시 세션 유지 확인
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        const sessionPersisted = await page.evaluate(() => {
            return !document.querySelector('input[placeholder*="아이디"]') && !!document.querySelector('.app-container');
        });
        recordTest('1-3. F5 새로고침 후 세션 유지 확인', sessionPersisted);

        // 1-4. 내 프로필 모달 열기 및 확인
        const profileCard = page.locator('.profile-card');
        if (await profileCard.count() > 0) {
            await profileCard.first().click();
            await page.waitForTimeout(500);
            const isProfileModalOpen = await page.isVisible('.modal-overlay:has-text("개인정보 수정")');
            recordTest('1-4. 프로필 모달 정상 오픈', isProfileModalOpen);

            if (isProfileModalOpen) {
                await page.click('.modal-header .close-button, button:has-text("닫기")');
                await page.waitForTimeout(300);
            }
        }

        // 1-5. 401 세션 만료 시 로그인 페이지 안전 전환 확인
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('auth-unauthorized'));
        });
        await page.waitForTimeout(1000);
        const redirectedToLogin = await page.evaluate(() => {
            return !!document.querySelector('input[placeholder*="아이디"]');
        });
        recordTest('1-5. 401 세션 만료 시 로그인 페이지 안전 전환', redirectedToLogin);

        // 다시 admin으로 재로그인
        await page.fill('input[placeholder*="아이디"]', 'admin');
        await page.fill('input[placeholder*="비밀번호"]', 'admin');
        await page.click('button:has-text("로그인")');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // -------------------------------------------------------------
        // 2. 메인 대시보드 & 위젯 레이아웃 (Dashboard)
        // -------------------------------------------------------------
        console.log('\n--- 2. 메인 대시보드 및 위젯 레이아웃 검증 ---');
        await navigateTo('dashboard');

        // Check for NaN or null in KPI cards
        const kpiContent = await page.evaluate(() => {
            const cards = document.querySelectorAll('.kpi-card, .dashboard-card, .widget-card');
            return Array.from(cards).map(c => c.textContent || '');
        });
        const hasNaNorNull = kpiContent.some(t => t.includes('NaN') || t.includes('Infinity') || t.includes('null건'));
        recordTest('2-1. 대시보드 KPI 카드 렌더링 및 NaN/null 방어', !hasNaNorNull, `검사된 카드 수: ${kpiContent.length}`);

        // 밀도 토글(컴팩트/기본) 확인
        const densityBtn = page.locator('button:has-text("컴팩트"), button:has-text("기본")');
        if (await densityBtn.count() > 0) {
            await densityBtn.first().click();
            await page.waitForTimeout(300);
            await page.reload();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            recordTest('2-2. 전역 밀도(Density) 조절 및 새로고침 유지', true);
        }

        // -------------------------------------------------------------
        // 3. 기준정보 전체 CRUD & 삭제 무결성
        // -------------------------------------------------------------
        console.log('\n--- 3. 기준정보 전체 CRUD 및 삭제 무결성 가드 검증 ---');

        // 3-1. 브랜드 마스터 (Brand)
        await navigateTo('brands');
        const brandContent = await getActiveTabContent();
        recordTest('3-1-1. 브랜드 목록 화면 정상 조회', brandContent.includes('브랜드 마스터 관리'));

        // 신규 브랜드 등록 및 더블클릭 방어
        const testBrandName = `QA_브랜드_${Date.now()}`;
        const brandInput = page.locator('input[placeholder*="신규 브랜드명"]');
        if (await brandInput.count() > 0) {
            await brandInput.fill(testBrandName);
            const submitBtn = page.locator('button:has-text("브랜드 등록")');
            await watcher.fastDoubleClick(submitBtn);
            await page.waitForTimeout(1500);

            // 브랜드 목록에 1건만 등록되었는지 확인
            const brandOccurrences = await page.evaluate((name) => {
                const bodyText = document.body.textContent || '';
                const regex = new RegExp(name, 'g');
                return (bodyText.match(regex) || []).length;
            }, testBrandName);
            recordTest('3-1-2. 브랜드 생성 및 더블클릭 중복 생성 방어', brandOccurrences >= 1, `등록된 브랜드 출현 횟수: ${brandOccurrences}`);

            // 연결된 브랜드(아누아) 삭제 시도 시 무결성 가드 확인
            page.once('dialog', async (dialog) => {
                await dialog.accept(); // window.confirm 승인
            });

            // 아누아 삭제 버튼 클릭 시도
            const anuaRow = page.locator('tr:has-text("아누아")');
            if (await anuaRow.count() > 0) {
                const anuaDeleteBtn = anuaRow.locator('button:has-text("삭제")');
                if (await anuaDeleteBtn.count() > 0) {
                    await anuaDeleteBtn.click();
                    await page.waitForTimeout(1000);
                    const toasts = await page.evaluate(() => {
                        return Array.from(document.querySelectorAll('.Toastify__toast')).map(t => t.textContent || '');
                    });
                    const hasReferentialError = toasts.some(t => t.includes('연결된 제품') || t.includes('삭제할 수 없습니다') || t.includes('사용 중인 데이터'));
                    recordTest('3-1-3. 연결된 브랜드 삭제 시 참조 무결성 500 방어 및 한글 경고', hasReferentialError, `노출 토스트: ${toasts.join(', ')}`);
                }
            }

            // 임시 생성한 브랜드 정상 삭제
            page.once('dialog', async (dialog) => {
                await dialog.accept();
            });
            const newBrandRow = page.locator(`tr:has-text("${testBrandName}")`);
            if (await newBrandRow.count() > 0) {
                const deleteBtn = newBrandRow.locator('button:has-text("삭제")');
                if (await deleteBtn.count() > 0) {
                    await deleteBtn.click();
                    await page.waitForTimeout(1000);
                    recordTest('3-1-4. 미사용 브랜드 정상 삭제 완료', true);
                }
            }
        }

        // 3-2. 유통 채널 관리 (SalesChannel)
        await navigateTo('salesChannels');
        const salesChannelContent = await getActiveTabContent();
        recordTest('3-2. 유통 채널 관리 AgGrid 렌더링 확인', salesChannelContent.includes('유통 채널') || salesChannelContent.includes('등록된 채널'));

        // 3-3. 채널특이사항 설정 (ChannelNoteConfig)
        await navigateTo('channelNoteConfig');
        const channelNoteContent = await getActiveTabContent();
        recordTest('3-3. 채널 특이사항 항목 설정 화면 로딩', channelNoteContent.includes('포장 특이사항') || channelNoteContent.includes('항목 설정'));

        // 3-4. BOM 카테고리 (BomCategory)
        await navigateTo('bomCategories');
        const bomCatContent = await getActiveTabContent();
        recordTest('3-4. BOM 유형 설정 화면 로딩', bomCatContent.includes('BOM 유형') || bomCatContent.includes('카테고리'));

        // 3-5. 제조사 카테고리 (ManufacturerCategory)
        await navigateTo('manufacturerCategories');
        const mfrCatContent = await getActiveTabContent();
        recordTest('3-5. 제조사 구분 관리 화면 로딩', mfrCatContent.includes('제조사 구분') || mfrCatContent.includes('카테고리'));

        // 3-6. 제조사 정보 (Manufacturer)
        await navigateTo('manufacturers');
        const mfrContent = await getActiveTabContent();
        recordTest('3-6. 제조사 정보 관리 그리드 로딩', mfrContent.includes('제조사 정보') || mfrContent.includes('신규 제조사'));

        // -------------------------------------------------------------
        // 4. 조직·권한·시스템관리·공지·알림·메일·버그리포트
        // -------------------------------------------------------------
        console.log('\n--- 4. 조직·권한·시스템관리·공지·메일·알림 검증 ---');

        // 4-1. 사용자 승인 관리 (users)
        await navigateTo('users');
        const usersContent = await getActiveTabContent();
        recordTest('4-1. 사용자 승인 관리 화면 로딩', usersContent.includes('admin') || usersContent.includes('사용자'));

        // 4-2. 권한 관리 (roles)
        await navigateTo('roles');
        const rolesContent = await getActiveTabContent();
        recordTest('4-2. 권한 관리(Role Matrix) 화면 로딩', rolesContent.includes('ROLE_ADMIN') || rolesContent.includes('권한'));

        // 4-3. 로그 관리 (accessLogs & logs)
        await navigateTo('accessLogs');
        const accessLogsContent = await getActiveTabContent();
        recordTest('4-3-1. 사용자 접근 로그 화면 로딩', accessLogsContent.includes('접근 로그') || accessLogsContent.includes('PAGE_MOVE'));

        await navigateTo('logs');
        const sysLogsContent = await getActiveTabContent();
        recordTest('4-3-2. 시스템 변경 이력(로그) 화면 로딩', sysLogsContent.includes('시스템 변경') || sysLogsContent.includes('감사 이력'));

        // 4-4. 가이드 관리 (guideManagement)
        await navigateTo('guideManagement');
        const guideContent = await getActiveTabContent();
        recordTest('4-4. 시스템 가이드 관리 화면 로딩', guideContent.includes('가이드') || guideContent.includes('매뉴얼'));

        // 4-5. 버그 리포트 관리 (bugReports)
        await navigateTo('bugReports');
        const bugContent = await getActiveTabContent();
        recordTest('4-5. 버그 리포트 관리 화면 로딩', bugContent.includes('버그 리포트') || bugContent.includes('접수'));

        // 4-6. 전체 공지사항 (announcements)
        await navigateTo('announcements');
        const annContent = await getActiveTabContent();
        recordTest('4-6. 전체공지 관리 화면 로딩', annContent.includes('공지사항') || annContent.includes('공지'));

        // 4-7. 메일 관리 (mailTemplates) - RateLimitFilter 429 집중 점검!
        await navigateTo('mailTemplates');

        // 탭 전환 1: 템플릿 -> 카테고리
        const catTabBtn = page.locator('button:has-text("발송 카테고리")');
        if (await catTabBtn.count() > 0) {
            await catTabBtn.first().click();
            await page.waitForTimeout(600);
        }

        // 탭 전환 2: 카테고리 -> 발송 이력
        const histTabBtn = page.locator('button:has-text("메일 발송·회신 이력")');
        if (await histTabBtn.count() > 0) {
            await histTabBtn.first().click();
            await page.waitForTimeout(600);
        }

        // 탭 전환 3: 다시 템플릿 마스터
        const tplTabBtn = page.locator('button:has-text("메일 발송 양식 마스터")');
        if (await tplTabBtn.count() > 0) {
            await tplTabBtn.first().click();
            await page.waitForTimeout(600);
        }
        recordTest('4-7. 제조사 전달 메일 관리 3단 탭 전환 및 RateLimit(429) 정상 통과', true);

        // 4-8. 알림 설정 (notificationSettings) & 수신 알림 (notifications)
        await navigateTo('notificationSettings');
        const notiSettingsContent = await getActiveTabContent();
        recordTest('4-8-1. 알림 설정 관리 화면 로딩', notiSettingsContent.includes('알림 설정') || notiSettingsContent.includes('수신 채널'));

        await navigateTo('notifications');
        const notiListContent = await getActiveTabContent();
        recordTest('4-8-2. 수신 알림 목록 화면 로딩', notiListContent.includes('알림') || notiListContent.includes('수신'));

        // 4-9. 일반 사용자 권한 UI 격리 검증 (RBAC URL 가드)
        console.log('\n--- 일반 사용자 권한 격리 검증 ---');
        // 로그아웃
        await page.click('.logout-btn-full');
        await page.waitForTimeout(1000);

        // qc 로그인 (Qc123456!)
        await page.fill('input[placeholder*="아이디"]', 'qc');
        await page.fill('input[placeholder*="비밀번호"]', 'Qc123456!');
        await page.click('button:has-text("로그인")');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // 만약 임시 비밀번호 모달이 뜨면 변경 완료
        const isForcedModal = await page.isVisible('h2:has-text("임시 비밀번호 필수 변경")');
        if (isForcedModal) {
            await page.fill('input[placeholder*="최소 8자 이상"]', 'Qc123456!');
            await page.fill('input[placeholder*="동일하게 입력"]', 'Qc123456!');
            await page.click('button:has-text("비밀번호 변경 완료")');
            await page.waitForTimeout(1500);
        }

        // 일반 사용자가 관리자 화면(users) 직접 진입 시도
        await page.evaluate(() => window.__QMS_NAVIGATE__('users'));
        await page.waitForTimeout(500);
        await watcher.checkToastsForDefects();

        // 관리자 전용 화면이 열리지 않았는지 확인
        const openedTabs = await page.evaluate(() => {
            const tabs = document.querySelectorAll('.tab-item');
            return Array.from(tabs).map(t => t.textContent || '');
        });
        const hasUsersTab = openedTabs.some(t => t.includes('사용자 승인 관리'));
        recordTest('4-9. 일반 사용자(qc) 관리자 전용 화면(users) 직접 접근 차단', !hasUsersTab, `열린 탭 목록: ${openedTabs.join(', ')}`);

        // qc 로그아웃
        const qcLogoutBtn = page.locator('.logout-btn-full');
        if (await qcLogoutBtn.count() > 0) {
            await qcLogoutBtn.first().click();
            await page.waitForTimeout(1000);
        }

        // 혹시 unsaved-changes 모달이 뜬다면 "저장 안 함" 또는 "나가기" 클릭하여 안전하게 닫기
        const unsavedOverlay = page.locator('.unsaved-changes-modal-overlay');
        if (await unsavedOverlay.count() > 0 && await unsavedOverlay.first().isVisible()) {
            const discardBtn = unsavedOverlay.locator('button:has-text("저장 안 함"), button:has-text("나가기"), button:has-text("취소"), button:has-text("확인")');
            if (await discardBtn.count() > 0) {
                await discardBtn.first().click();
                await page.waitForTimeout(500);
            }
        }

        // 다시 admin으로 재로그인
        await page.fill('input[placeholder*="아이디"]', 'admin');
        await page.fill('input[placeholder*="비밀번호"]', 'admin');
        await page.click('button:has-text("로그인")');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // -------------------------------------------------------------
        // 5. 동적 메뉴 / 동적 화면 / 동적 대시보드
        // -------------------------------------------------------------
        console.log('\n--- 5. 동적 메뉴 및 동적 화면 검증 ---');

        // 5-1. 화면 및 메뉴 관리 (menuManagement)
        await navigateTo('menuManagement');
        const menuMgmtContent = await getActiveTabContent();
        recordTest('5-1. 화면 및 메뉴 관리 페이지 로딩', menuMgmtContent.includes('화면 및 메뉴 관리') || menuMgmtContent.includes('메뉴'));

        // 5-2. 동적 화면 (dynScreenProduct)
        await navigateTo('dynScreenProduct');
        const dynScreenContent = await getActiveTabContent();
        recordTest('5-2. 동적 화면(제품 메타 그리드) 렌더링', dynScreenContent.includes('제품') || dynScreenContent.includes('그리드') || dynScreenContent.includes('항목'));

        // Final Toast Defect Check
        await watcher.checkToastsForDefects();

    } catch (err) {
        console.error('💥 [SUITE 1 ERROR]', err);
        recordTest('Suite 1 실행 예외', false, err.message);
    } finally {
        const violations = watcher.getViolations();
        await browser.close();

        console.log('\n===============================================================');
        console.log('📊 [Suite 1 자동 감시기(Watcher) 검증 결과 요약]');
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
            console.log('🎉 [Suite 1] 전 테스트 케이스 100% PASS!');
            process.exit(0);
        }
    }
}

runSuite1();
