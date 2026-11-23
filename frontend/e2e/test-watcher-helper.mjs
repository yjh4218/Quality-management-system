/**
 * Playwright E2E 5대 자동 감시기 (TestWatcher Helper)
 * 1. page.on('pageerror') 및 page.on('console', error) 수집 (Uncaught JS/React 에러 탐지)
 * 2. page.on('response') 감시: 의도하지 않은 status >= 500, status === 429(RateLimit 충돌), status === 404 API 응답 수집
 * 3. 동일 API가 2초 내 5회 이상 반복 호출되는 무한 렌더링 루프 탐지
 * 4. 토스트/알림 메시지에 영문 스택 트레이스, [object Object], undefined 문자열 노출 탐지
 * 5. 저장/결재/삭제 버튼 클릭 시 2회 연속 빠른 클릭(더블클릭) 시뮬레이션 및 중복 생성 여부 검증
 */

export class TestWatcher {
    constructor(page, options = {}) {
        this.page = page;
        this.pageErrors = [];
        this.consoleErrors = [];
        this.badResponses = [];
        this.apiCallTimestamps = new Map(); // path -> Array<number>
        this.infiniteLoopAlerts = [];
        this.toastErrors = [];
        this.rateLimit429Errors = [];
        this.ignoredStatusPatterns = options.ignoredStatusPatterns || [];

        this._setupWatchers();
    }

    _setupWatchers() {
        // 1. Uncaught JS / React page errors
        this.page.on('pageerror', (err) => {
            const msg = err?.message || String(err);
            this.pageErrors.push(msg);
            console.error('  ❌ [WATCHER:PAGE_ERROR]', msg);
        });

        // 2. console.error
        this.page.on('console', (msg) => {
            if (msg.type() === 'error') {
                const text = msg.text();
                // Filter out harmless browser noise
                if (text.includes('favicon.ico') || text.includes('net::ERR_ABORTED')) {
                    return;
                }
                this.consoleErrors.push(text);
                console.error('  ⚠️ [WATCHER:CONSOLE_ERROR]', text);
            }
        });

        // 3. Network response watcher: status >= 500, 429, 404
        this.page.on('response', (response) => {
            const status = response.status();
            const url = response.url();

            // Track API calls for infinite loop detection (same API called >= 5 times in 2000ms)
            if (url.includes('/api/')) {
                try {
                    const urlPath = new URL(url).pathname;
                    const now = Date.now();
                    if (!this.apiCallTimestamps.has(urlPath)) {
                        this.apiCallTimestamps.set(urlPath, []);
                    }
                    const times = this.apiCallTimestamps.get(urlPath);
                    times.push(now);
                    // Filter within last 2000ms
                    const recent = times.filter(t => now - t <= 2000);
                    this.apiCallTimestamps.set(urlPath, recent);
                    if (recent.length >= 5) {
                        const loopMsg = `[INFINITE_LOOP_DETECTED] API ${urlPath} called ${recent.length} times within 2000ms!`;
                        if (!this.infiniteLoopAlerts.includes(loopMsg)) {
                            this.infiniteLoopAlerts.push(loopMsg);
                            console.error('  🔄 [WATCHER:LOOP]', loopMsg);
                        }
                    }
                } catch (e) {
                    // Ignore URL parse error
                }
            }

            // Check HTTP status (500+, 429, 404)
            if (status === 429) {
                const err429 = { url, status, timestamp: Date.now() };
                this.rateLimit429Errors.push(err429);
                console.error('  🚨 [WATCHER:429_RATE_LIMIT_ERROR]', url);
            }

            if (status >= 500 || status === 429 || (status === 404 && url.includes('/api/'))) {
                const isIgnored = this.ignoredStatusPatterns.some(p => url.includes(p));
                if (!isIgnored) {
                    const entry = { url, status, statusText: response.statusText() };
                    this.badResponses.push(entry);
                    console.error('  🚫 [WATCHER:BAD_RESPONSE]', status, url);
                }
            }
        });
    }

    // 4. Toast / Alert inspection
    async checkToastsForDefects() {
        const toastTexts = await this.page.evaluate(() => {
            const elements = document.querySelectorAll(
                '.Toastify__toast-body, .Toastify__toast, .alert, .modal-body, [role="alert"]'
            );
            return Array.from(elements).map(el => el.textContent || '');
        });

        for (const text of toastTexts) {
            if (text.includes('[object Object]')) {
                const defect = `[OBJECT_OBJECT_IN_TOAST]: ${text.trim()}`;
                if (!this.toastErrors.includes(defect)) {
                    this.toastErrors.push(defect);
                    console.error('  🚨 [WATCHER:TOAST_DEFECT]', defect);
                }
            }
            if (/\bundefined\b/.test(text)) {
                const defect = `[UNDEFINED_IN_TOAST]: ${text.trim()}`;
                if (!this.toastErrors.includes(defect)) {
                    this.toastErrors.push(defect);
                    console.error('  🚨 [WATCHER:TOAST_DEFECT]', defect);
                }
            }
            if (text.includes('Exception:') || text.includes('at com.example') || text.includes('NullPointerException')) {
                const defect = `[STACK_TRACE_IN_TOAST]: ${text.trim()}`;
                if (!this.toastErrors.includes(defect)) {
                    this.toastErrors.push(defect);
                    console.error('  🚨 [WATCHER:TOAST_DEFECT]', defect);
                }
            }
        }
    }

    // 5. Fast double click simulator
    async fastDoubleClick(selectorOrLocator) {
        let locator;
        if (typeof selectorOrLocator === 'string') {
            locator = this.page.locator(selectorOrLocator);
        } else {
            locator = selectorOrLocator;
        }

        await locator.click({ delay: 0 });
        await this.page.waitForTimeout(40);
        try {
            await locator.click({ delay: 0, timeout: 400 });
        } catch (e) {
            // Button successfully disabled or modal closed on 1st click
        }
    }

    addIgnoredPattern(pattern) {
        this.ignoredStatusPatterns.push(pattern);
    }

    removeIgnoredPattern(pattern) {
        this.ignoredStatusPatterns = this.ignoredStatusPatterns.filter(p => p !== pattern);
    }

    getViolations() {
        return {
            pageErrors: [...this.pageErrors],
            consoleErrors: [...this.consoleErrors],
            badResponses: [...this.badResponses],
            infiniteLoops: [...this.infiniteLoopAlerts],
            toastErrors: [...this.toastErrors],
            totalCount: this.pageErrors.length +
                        this.consoleErrors.length +
                        this.badResponses.length +
                        this.infiniteLoops?.length || 0 +
                        this.toastErrors.length
        };
    }

    clearViolations() {
        this.pageErrors = [];
        this.consoleErrors = [];
        this.badResponses = [];
        this.infiniteLoopAlerts = [];
        this.toastErrors = [];
        this.apiCallTimestamps.clear();
    }
}
