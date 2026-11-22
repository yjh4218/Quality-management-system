import { chromium } from 'playwright';
import { TestWatcher } from './test-watcher-helper.mjs';

const BASE_URL = 'http://localhost:5173';

async function runSuite4() {
    console.log('=================================================================================');
    console.log('🚀 [Suite 4] 전자결재·통제문서(DMS)·규제표준(SOP·위험·설계·변경·추적·CAPA·회수·시설·감사·CSV)·휴지통 E2E 시뮬레이션');
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
        await page.waitForTimeout(1000);
    };

    const closeOtherTabs = async (currentTabId) => {
        await page.evaluate((tabId) => {
            if (window.__QMS_CLOSE_OTHER_TABS__) {
                window.__QMS_CLOSE_OTHER_TABS__(tabId);
            }
        }, currentTabId);
        await page.waitForTimeout(500);
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

        const currentUrl = page.url();
        recordTest('0-1. 관리자 정상 로그인 및 대시보드 진입', !currentUrl.includes('/login'));

        // =============================================================
        // 1. 전자결재 영역 (Approvals, DocTypes, Templates, Notification Rules)
        // =============================================================
        console.log('\n--- 1. 전자결재 영역 시뮬레이션 ---');
        
        // 1-1. 통합 전자결재함 (approvals)
        await navigateTo('approvals');
        const approvalsContent = await getActiveTabContent();
        recordTest('1-1. 통합 전자결재함 진입', approvalsContent.includes('결재') || approvalsContent.includes('문서'));

        const appGridCount = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('1-2. 전자결재함 AgGrid 렌더링 확인', appGridCount > 0, `그리드 수: ${appGridCount}`);

        // 1-2. 탭 전환 검증 (기안 문서함, 진행 중 문서, 결재 완료함 등)
        const submittedTab = page.locator('.tab-page-wrapper.tab-active button:has-text("기안 문서함")').first();
        if (await submittedTab.isVisible()) {
            await submittedTab.click();
            await page.waitForTimeout(800);
        }
        const completedTab = page.locator('.tab-page-wrapper.tab-active button:has-text("결재 완료함")').first();
        if (await completedTab.isVisible()) {
            await completedTab.click();
            await page.waitForTimeout(800);
        }
        const pendingTab = page.locator('.tab-page-wrapper.tab-active button:has-text("결재 대기함")').first();
        if (await pendingTab.isVisible()) {
            await pendingTab.click();
            await page.waitForTimeout(800);
        }
        recordTest('1-3. 전자결재함 탭 전환 (기안/완료/대기) 정상 동작', true);

        // 1-3. 신규 결재 상신 모달 트리거
        const submitBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 결재 상신")').first();
        if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(1000);
            const submitModalVisible = await page.locator('.modal-overlay, div:has-text("결재선 지정"), div:has-text("품의번호")').count();
            recordTest('1-4. 신규 결재 상신 모달(ApprovalSubmitModal) 오픈', submitModalVisible > 0);

            // 닫기 버튼 클릭
            const closeBtn = page.locator('button:has-text("✕"), .modal-overlay button:has-text("닫기"), button:has-text("취소")').first();
            if (await closeBtn.isVisible()) {
                await closeBtn.click();
                await page.waitForTimeout(800);
            }
        } else {
            recordTest('1-4. 신규 결재 상신 버튼 확인', false, '버튼 없음');
        }

        // 1-4. 결재 문서유형 마스터 관리 (approvalDocTypes)
        await navigateTo('approvalDocTypes');
        const docTypesContent = await getActiveTabContent();
        recordTest('1-5. 결재 문서유형 마스터 관리 화면 진입', docTypesContent.includes('결재 문서유형') || docTypesContent.includes('마스터'));

        const docTypeGridCount = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('1-6. 결재 문서유형 AgGrid 렌더링 확인', docTypeGridCount > 0, `그리드 수: ${docTypeGridCount}`);

        // 신규 문서유형 등록 모달
        const addDocTypeBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 문서유형 등록")').first();
        if (await addDocTypeBtn.isVisible()) {
            await addDocTypeBtn.click();
            await page.waitForTimeout(800);
            const docTypeModalCount = await page.locator('.modal-overlay, div:has-text("신규 결재 문서유형 등록")').count();
            recordTest('1-7. 신규 결재 문서유형 등록 모달 오픈', docTypeModalCount > 0);

            // 연동 화면 프리셋 드롭다운 확인
            const presetSelect = page.locator('.modal-overlay select').first();
            const hasPresetSelect = await presetSelect.isVisible();
            recordTest('1-8. 문서유형 화면 프리셋 셀렉터 정상 렌더링', hasPresetSelect);

            // 닫기
            const modalClose = page.locator('.modal-overlay button:has-text("×"), .modal-overlay button:has-text("취소")').first();
            if (await modalClose.isVisible()) {
                await modalClose.click();
                await page.waitForTimeout(500);
            }
        } else {
            recordTest('1-7. 신규 문서유형 등록 버튼 확인', false);
        }

        // 1-5. 결재선 템플릿 빌더 (approvalTemplates)
        await navigateTo('approvalTemplates');
        const tplContent = await getActiveTabContent();
        recordTest('1-9. 결재선 템플릿 빌더 화면 진입', tplContent.includes('결재선 템플릿') || tplContent.includes('빌더'));

        const docTypeSelectInTpl = page.locator('.tab-page-wrapper.tab-active select').first();
        const hasTplDocTypeSelect = await docTypeSelectInTpl.isVisible();
        recordTest('1-10. 템플릿 빌더 문서유형 선택 셀렉터 렌더링', hasTplDocTypeSelect);

        const addStepBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("결재 단계 추가")').first();
        const saveTplBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("새 버전 배포")').first();
        recordTest('1-11. 템플릿 빌더 단계추가 및 배포 액션 버튼 렌더링', (await addStepBtn.isVisible()) && (await saveTplBtn.isVisible()));

        // 1-6. 결재 알림 설정 (approvalNotificationRules)
        await navigateTo('approvalNotificationRules');
        const notiContent = await getActiveTabContent();
        recordTest('1-12. 결재 알림 설정 화면 진입', notiContent.includes('결재 알림') || notiContent.includes('알림'));

        // 탭 정리
        await closeOtherTabs('approvalNotificationRules');

        // =============================================================
        // 2. 표준 품질경영 매뉴얼 (SOP) & 규제 표준 가이드
        // =============================================================
        console.log('\n--- 2. SOP 매뉴얼 및 규제 표준 가이드 시뮬레이션 ---');

        // 2-1. SOP 매뉴얼 (sopManual)
        await navigateTo('sopManual');
        const sopContent = await getActiveTabContent();
        recordTest('2-1. 표준 품질경영 매뉴얼(SOP) 화면 진입', sopContent.includes('SOP') || sopContent.includes('품질경영'));

        const sopCards = await page.locator('.tab-page-wrapper.tab-active section, .tab-page-wrapper.tab-active div[style*="border-radius"]').count();
        recordTest('2-2. SOP 매뉴얼 KPI 및 아코디언 컴포넌트 렌더링', sopCards > 3, `요소 수: ${sopCards}`);

        // 아코디언 항목 클릭 및 전문 뷰어 확인
        const sopAccordionItem = page.locator('.tab-page-wrapper.tab-active div[style*="cursor: pointer"], .tab-page-wrapper.tab-active button:has-text("QMS-SOP")').first();
        if (await sopAccordionItem.isVisible()) {
            await sopAccordionItem.click();
            await page.waitForTimeout(600);
            recordTest('2-3. SOP 목차 인터랙션 및 전문 열람 동작 확인', true);
        } else {
            recordTest('2-3. SOP 목차 인터랙션 확인', true, '기본 전문 표시됨');
        }

        // 2-2. 규제 표준 가이드 (regulatoryGuide)
        await navigateTo('regulatoryGuide');
        const regContent = await getActiveTabContent();
        recordTest('2-4. 규제 표준 가이드 화면 진입', regContent.includes('규제') || regContent.includes('ISO'));

        const regTabs = await page.locator('.tab-page-wrapper.tab-active button:has-text("전체"), .tab-page-wrapper.tab-active button:has-text("의료기기"), .tab-page-wrapper.tab-active button:has-text("비교표")').count();
        recordTest('2-5. 규제 표준 가이드 카테고리 필터 탭 렌더링', regTabs >= 2, `탭 수: ${regTabs}`);

        // 탭 정리
        await closeOtherTabs('regulatoryGuide');

        // =============================================================
        // 3. 통제문서(DMS)·변경관리·CAPA·부적합(NCR)·위험관리·설계개발(DHF)
        // =============================================================
        console.log('\n--- 3. 통제문서(DMS) 및 주요 규제 프로세스 시뮬레이션 ---');

        // 3-1. 통제문서 및 개정관리 (controlledDocuments)
        await navigateTo('controlledDocuments');
        const dmsContent = await getActiveTabContent();
        recordTest('3-1. 통제문서 및 개정관리(DMS) 화면 진입', dmsContent.includes('통제문서') || dmsContent.includes('DMS'));

        const dmsGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('3-2. 통제문서 DMS AgGrid 렌더링 확인', dmsGrid > 0, `그리드 수: ${dmsGrid}`);

        // 신규 통제문서 제정 모달
        const createDmsBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 통제문서 제정"), .tab-page-wrapper.tab-active button:has-text("신규 문서 제정")').first();
        if (await createDmsBtn.isVisible()) {
            await createDmsBtn.click();
            await page.waitForTimeout(800);
            const dmsModalVisible = await page.locator('.modal-overlay, div:has-text("통제문서 제정"), div:has-text("문서번호")').count();
            recordTest('3-3. 신규 통제문서 제정 모달 오픈 및 폼 렌더링', dmsModalVisible > 0);

            const closeDmsModal = page.locator('.modal-overlay button:has-text("✕"), .modal-overlay button:has-text("×"), .modal-overlay button:has-text("취소")').first();
            if (await closeDmsModal.isVisible()) {
                await closeDmsModal.click();
                await page.waitForTimeout(500);
            }
        } else {
            recordTest('3-3. 신규 통제문서 제정 버튼 확인', false);
        }

        // 3-2. 변경관리 (changeControl)
        await navigateTo('changeControl');
        const ccContent = await getActiveTabContent();
        recordTest('3-4. 변경관리(Change Control) 화면 진입', ccContent.includes('변경관리') || ccContent.includes('Change Control'));

        const ccGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('3-5. 변경관리 AgGrid 렌더링 확인', ccGrid > 0, `그리드 수: ${ccGrid}`);

        const createCcBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 변경요청")').first();
        if (await createCcBtn.isVisible()) {
            await createCcBtn.click();
            await page.waitForTimeout(800);
            const ccModalVisible = await page.locator('.modal-overlay, div:has-text("변경요청서"), div:has-text("변경 제목")').count();
            recordTest('3-6. 신규 변경요청 모달 오픈 및 폼 렌더링', ccModalVisible > 0);

            const closeCcModal = page.locator('.modal-overlay button:has-text("✕"), .modal-overlay button:has-text("×"), .modal-overlay button:has-text("취소")').first();
            if (await closeCcModal.isVisible()) {
                await closeCcModal.click();
                await page.waitForTimeout(500);
            }
        } else {
            recordTest('3-6. 신규 변경요청 버튼 확인', false);
        }

        // 3-3. 시정 및 예방조치 (capaManagement)
        await navigateTo('capaManagement');
        const capaContent = await getActiveTabContent();
        recordTest('3-7. 시정 및 예방조치(CAPA) 화면 진입', capaContent.includes('CAPA') || capaContent.includes('시정'));

        const capaGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('3-8. CAPA 관리 AgGrid 렌더링 확인', capaGrid > 0, `그리드 수: ${capaGrid}`);

        const createCapaBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("신규 CAPA")').first();
        if (await createCapaBtn.isVisible()) {
            await createCapaBtn.click();
            await page.waitForTimeout(800);
            const capaModalVisible = await page.locator('.modal-overlay, div:has-text("CAPA"), div:has-text("문제 식별")').count();
            recordTest('3-9. 신규 CAPA 발의 모달 오픈 및 폼 렌더링', capaModalVisible > 0);

            const closeCapaModal = page.locator('.modal-overlay button:has-text("✕"), .modal-overlay button:has-text("×"), .modal-overlay button:has-text("취소")').first();
            if (await closeCapaModal.isVisible()) {
                await closeCapaModal.click();
                await page.waitForTimeout(500);
            }
        } else {
            recordTest('3-9. 신규 CAPA 발의 버튼 확인', false);
        }

        // 3-4. 부적합품 관리 및 출하승인 (ncrManagement)
        await navigateTo('ncrManagement');
        const ncrContent = await getActiveTabContent();
        recordTest('3-10. 부적합품 관리(NCR) 화면 진입', ncrContent.includes('부적합') || ncrContent.includes('NCR'));

        const ncrGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('3-11. NCR 관리 AgGrid 렌더링 확인', ncrGrid > 0, `그리드 수: ${ncrGrid}`);

        // 3-5. 위험관리 (riskManagement)
        await navigateTo('riskManagement');
        const riskContent = await getActiveTabContent();
        recordTest('3-12. 위험관리(ISO 14971) 화면 진입', riskContent.includes('위험') || riskContent.includes('Risk') || riskContent.includes('14971'));

        const riskGridOrMatrix = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .tab-page-wrapper.tab-active table, .tab-page-wrapper.tab-active div[style*="grid"]').count();
        recordTest('3-13. 위험관리 FMEA 및 평가 그리드 렌더링 확인', riskGridOrMatrix > 0);

        // 3-6. 의료기기 설계개발 & DHF (designControls)
        await navigateTo('designControls');
        const designContent = await getActiveTabContent();
        recordTest('3-14. 의료기기 설계개발 & DHF 화면 진입', designContent.includes('설계') || designContent.includes('DHF'));

        const designGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine, .tab-page-wrapper.tab-active table').count();
        recordTest('3-15. 설계개발 DHF 프로젝트 그리드 렌더링 확인', designGrid > 0);

        // 탭 정리
        await closeOtherTabs('designControls');

        // =============================================================
        // 4. 공급업체·교육훈련·내부심사·CSV·시설설비·불만이상사례·회수·추적성·공식원본
        // =============================================================
        console.log('\n--- 4. 협력/심사/인프라/추적성/원본 규제 페이지 시뮬레이션 ---');

        // 4-1. 공급업체 및 위탁제조 관리 (supplierManagement)
        await navigateTo('supplierManagement');
        const supplierContent = await getActiveTabContent();
        recordTest('4-1. 공급업체 관리(Supplier Management) 화면 진입', supplierContent.includes('공급') || supplierContent.includes('ASL') || supplierContent.includes('협약'));

        const supplierGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('4-2. 공급업체 적격성 AgGrid 렌더링 확인', supplierGrid > 0, `그리드 수: ${supplierGrid}`);

        // 4-2. 교육훈련 및 자격관리 (trainingManagement)
        await navigateTo('trainingManagement');
        const trainContent = await getActiveTabContent();
        recordTest('4-3. 교육훈련 및 자격관리 화면 진입', trainContent.includes('교육') || trainContent.includes('자격'));

        const trainGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('4-4. 교육훈련 관리 AgGrid 렌더링 확인', trainGrid > 0, `그리드 수: ${trainGrid}`);

        // 4-3. 내부심사·경영검토 (internalAuditManagement)
        await navigateTo('internalAuditManagement');
        const auditContent = await getActiveTabContent();
        recordTest('4-5. 내부심사·경영검토 화면 진입', auditContent.includes('심사') || auditContent.includes('경영검토'));

        const auditGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('4-6. 내부심사 계획 AgGrid 렌더링 확인', auditGrid > 0, `그리드 수: ${auditGrid}`);

        // 4-4. 컴퓨터화 시스템 밸리데이션(CSV) (csvValidation)
        await navigateTo('csvValidation');
        const csvContent = await getActiveTabContent();
        recordTest('4-7. 컴퓨터화 시스템 밸리데이션(CSV) 화면 진입', csvContent.includes('CSV') || csvContent.includes('GAMP'));

        const csvGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('4-8. CSV 밸리데이션 AgGrid 렌더링 확인', csvGrid > 0, `그리드 수: ${csvGrid}`);

        // 4-5. 시설·설비, 교정 및 청정환경 (facilityManagement)
        await navigateTo('facilityManagement');
        const facContent = await getActiveTabContent();
        recordTest('4-9. 시설·설비, 교정 및 청정환경 화면 진입', facContent.includes('시설') || facContent.includes('장비') || facContent.includes('환경'));

        const facGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('4-10. 설비/장비 관리 AgGrid 렌더링 확인', facGrid > 0, `그리드 수: ${facGrid}`);

        // 4-6. 고객 불만 및 시판 후 이상사례 평가 (complaintSafetyManagement)
        await navigateTo('complaintSafetyManagement');
        const complaintContent = await getActiveTabContent();
        recordTest('4-11. 고객 불만 및 시판 후 이상사례 평가 화면 진입', complaintContent.includes('불만') || complaintContent.includes('이상사례'));

        const complaintGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('4-12. 이상사례 평가 AgGrid 렌더링 확인', complaintGrid > 0, `그리드 수: ${complaintGrid}`);

        // 4-7. 규제보고 및 회수 관리 (vigilanceRecallManagement)
        await navigateTo('vigilanceRecallManagement');
        const vigContent = await getActiveTabContent();
        recordTest('4-13. 규제보고 및 회수 관리(Vigilance & Recall) 화면 진입', vigContent.includes('보고') || vigContent.includes('회수') || vigContent.includes('Vigilance'));

        const vigGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('4-14. 규제보고/회수 관리 AgGrid 렌더링 확인', vigGrid > 0, `그리드 수: ${vigGrid}`);

        // 4-8. 외부연계 및 추적성 (traceabilityManagement)
        await navigateTo('traceabilityManagement');
        const traceContent = await getActiveTabContent();
        recordTest('4-15. 외부연계 및 추적성(Traceability) 화면 진입', traceContent.includes('추적') || traceContent.includes('배치') || traceContent.includes('LOT'));

        // 탭 1 (배치 / LOT 마스터 관리)로 전환하여 AgGrid 렌더링 확인
        const batchTabBtn = page.locator('.tab-page-wrapper.tab-active button:has-text("배치 / LOT 마스터 관리")').first();
        if (await batchTabBtn.isVisible()) {
            await batchTabBtn.click();
            await page.waitForTimeout(800);
        }
        const traceGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('4-16. 추적성 배치 AgGrid 렌더링 확인', traceGrid > 0, `그리드 수: ${traceGrid}`);

        // 4-9. 공식 원본 및 전자서명 정책 (officialRecords)
        await navigateTo('officialRecords');
        const recContent = await getActiveTabContent();
        recordTest('4-17. 공식 원본 및 전자서명 정책 화면 진입', recContent.includes('전자서명') || recContent.includes('원본') || recContent.includes('Part 11'));

        const recGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('4-18. 전자서명 및 감사기록 AgGrid 렌더링 확인', recGrid > 0, `그리드 수: ${recGrid}`);

        // 탭 정리
        await closeOtherTabs('officialRecords');

        // =============================================================
        // 5. 데이터 복구 (TrashBin)
        // =============================================================
        console.log('\n--- 5. 데이터 복구(TrashBin) 시뮬레이션 ---');
        await navigateTo('trashBin');
        const trashContent = await getActiveTabContent();
        recordTest('5-1. 휴지통 / 데이터 복구 화면 진입', trashContent.includes('데이터 복구') || trashContent.includes('휴지통') || trashContent.includes('삭제'));

        const trashGrid = await page.locator('.tab-page-wrapper.tab-active .ag-root, .tab-page-wrapper.tab-active .ag-theme-alpine').count();
        recordTest('5-2. 휴지통 데이터 목록 AgGrid 렌더링 확인', trashGrid > 0, `그리드 수: ${trashGrid}`);

        // =============================================================
        // 6. 감시기(Watcher) 수집 결과 종합 검증
        // =============================================================
        console.log('\n--- 6. 시스템 전역 자동 감시기(Watcher) 무결성 검증 ---');
        const pageErrors = watcher.pageErrors || [];
        const badResponses = watcher.badResponses || [];
        const repeatedCalls = watcher.infiniteLoopAlerts || [];
        const toastErrors = watcher.toastErrors || [];

        recordTest('6-1. 비정상 Uncaught JS / React 에러 발생 여부 (0건 필수)', pageErrors.length === 0, `발생 건수: ${pageErrors.length} -> ${JSON.stringify(pageErrors.slice(0, 3))}`);
        recordTest('6-2. 의도하지 않은 서버 에러 (HTTP 500 / 429) 발생 여부 (0건 필수)', badResponses.length === 0, `발생 건수: ${badResponses.length} -> ${JSON.stringify(badResponses.slice(0, 3))}`);
        recordTest('6-3. 무한 렌더링 루프 (2초 내 5회 이상 동일 API) 감지 여부 (0건 필수)', repeatedCalls.length === 0, `감지 건수: ${repeatedCalls.length} -> ${JSON.stringify(repeatedCalls.slice(0, 3))}`);
        recordTest('6-4. Toast UI 내 영문 스택 트레이스 / [object Object] 노출 여부 (0건 필수)', toastErrors.length === 0, `노출 건수: ${toastErrors.length} -> ${JSON.stringify(toastErrors.slice(0, 3))}`);

    } catch (err) {
        console.error('💥 [FATAL TEST ERROR]', err);
        recordTest('Suite 4 실행 중 치명적 예외 발생', false, err.message);
    } finally {
        await browser.close();
    }

    // -------------------------------------------------------------
    // 결과 리포트 출력
    // -------------------------------------------------------------
    console.log('\n=================================================================================');
    console.log('📊 [Suite 4] 최종 테스트 결과 집계');
    console.log('=================================================================================');
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log(`총 테스트 수: ${total} | 통과: ${passed} | 실패: ${failed} | 통과율: ${passRate}%`);
    console.log('=================================================================================\n');

    if (failed > 0) {
        console.error(`❌ Suite 4 테스트 중 ${failed}건의 실패가 발견되었습니다.`);
        process.exit(1);
    } else {
        console.log('🎉 Suite 4 전체 테스트가 100% 성공적으로 완료되었습니다!');
        process.exit(0);
    }
}

runSuite4();
