/**
 * QMS Global JavaScript Error & Unhandled Promise Rejection Listener
 * - Catches uncaught runtime errors before/outside React lifecycle
 * - Records lightweight user action breadcrumbs for debugging
 * - Filters noisy browser extensions
 * - Automatically dispatches bug reports to /api/bug-reports with 30s debouncing
 */

import { submitBugReport, getFormattedReporterInfo } from '../api';
import { toast } from 'react-toastify';

const reportedErrors = new Set();
const breadcrumbs = [];
const MAX_BREADCRUMBS = 10;

export const addBreadcrumb = (action, category = 'UI') => {
    try {
        const time = new Date().toTimeString().split(' ')[0];
        breadcrumbs.push(`[${time}] [${category}] ${action}`);
        if (breadcrumbs.length > MAX_BREADCRUMBS) {
            breadcrumbs.shift();
        }
    } catch (e) {
        // ignore
    }
};

const isExtensionOrNoise = (errorMsg = '', stackTrace = '') => {
    const text = `${errorMsg} ${stackTrace}`.toLowerCase();
    return (
        text.includes('chrome-extension://') ||
        text.includes('moz-extension://') ||
        text.includes('safari-extension://') ||
        text.includes('a listener indicated an asynchronous response') ||
        text.includes('message channel closed') ||
        text.includes('resizeobserver loop completed') ||
        text.includes('resizeobserver loop limit exceeded')
    );
};

export const reportGlobalError = async (errorMsg, stackTrace, source = 'Global JS Error', category = 'RUNTIME') => {
    if (!errorMsg || isExtensionOrNoise(errorMsg, stackTrace)) {
        return;
    }

    const dedupeKey = `${errorMsg}:${stackTrace ? stackTrace.slice(0, 100) : ''}`;
    if (reportedErrors.has(dedupeKey)) {
        return;
    }
    reportedErrors.add(dedupeKey);
    setTimeout(() => reportedErrors.delete(dedupeKey), 30000); // 30초 디바운싱

    const reporterInfo = getFormattedReporterInfo();
    const isNetwork = errorMsg.includes('Load failed') || errorMsg.includes('Failed to fetch') || errorMsg.includes('Network Error');
    const breadcrumbText = breadcrumbs.length > 0 ? `\n\n[최근 사용자 인터랙션 (Breadcrumbs)]\n${breadcrumbs.join('\n')}` : '';

    const payload = {
        screenName: window.__QMS_ACTIVE_PAGE__ || (typeof window !== 'undefined' ? window.location.pathname : '전역 감지'),
        url: typeof window !== 'undefined' ? window.location.href : '',
        severity: isNetwork ? 'HIGH' : 'CRITICAL',
        errorCategory: category,
        description: `[자동 감지] ${source}: ${errorMsg}`,
        steps: `시스템 전역에서 비정상적인 예외가 감지되어 버그 리포트가 자동 접수되었습니다.\n\n[오류 구분]: ${category}\n[발생 원천]: ${source}\n[에러 메시지]\n${errorMsg}\n\n[Stack Trace]\n${stackTrace || 'N/A'}${breadcrumbText}`,
        reporterName: reporterInfo.name,
        reporterUsername: reporterInfo.username
    };

    try {
        await submitBugReport(payload);
        // 오류 자동 접수 사용자 가시적 피드백 제공 (중복 방지 toastId 설정)
        toast.error(
            `🚨 시스템 오류가 감지되어 관리자에게 버그 리포트가 자동 접수되었습니다.`,
            { autoClose: 5000, toastId: dedupeKey }
        );
    } catch (err) {
        console.warn('[QMS-ErrorListener] Failed to automatically dispatch bug report, storing in offline queue:', err);
        try {
            const queue = JSON.parse(localStorage.getItem('qms_pending_bug_reports') || '[]');
            queue.push({ ...payload, queuedAt: new Date().toISOString() });
            localStorage.setItem('qms_pending_bug_reports', JSON.stringify(queue.slice(-50)));
        } catch (lsErr) {
            // ignore
        }
    }
};

export const initGlobalErrorListener = () => {
    if (typeof window === 'undefined' || window.__QMS_ERROR_LISTENER_INITIALIZED__) {
        return;
    }
    window.__QMS_ERROR_LISTENER_INITIALIZED__ = true;

    // 1. Uncaught Exception 리스너
    window.addEventListener('error', (event) => {
        const errorMsg = event.message || (event.error && event.error.message) || 'Unknown global script error';
        const stackTrace = event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`;
        const isNetwork = errorMsg.includes('Load failed') || errorMsg.includes('Failed to fetch') || errorMsg.includes('Network Error');
        reportGlobalError(errorMsg, stackTrace, 'Uncaught Exception', isNetwork ? 'NETWORK' : 'RUNTIME');
    });

    // 2. Unhandled Promise Rejection 리스너
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const errorMsg = reason instanceof Error ? reason.message : (typeof reason === 'string' ? reason : JSON.stringify(reason || ''));
        const stackTrace = reason instanceof Error ? reason.stack : 'N/A';
        const isNetwork = errorMsg.includes('Load failed') || errorMsg.includes('Failed to fetch') || errorMsg.includes('Network Error');
        reportGlobalError(errorMsg, stackTrace, 'Unhandled Rejection', isNetwork ? 'NETWORK' : 'PROMISE');
    });

    // 3. 사용자 클릭 및 내비게이션 브레드크럼 자동 기록
    document.addEventListener('click', (e) => {
        try {
            const target = e.target;
            if (!target) return;
            const btn = target.closest('button, a, [role="button"], input[type="submit"]');
            if (btn) {
                const label = (btn.innerText || btn.getAttribute('aria-label') || btn.title || btn.tagName).trim().slice(0, 40);
                if (label) addBreadcrumb(`Click: "${label}"`, 'CLICK');
            }
        } catch (ignored) {}
    }, { capture: true, passive: true });

    window.addEventListener('popstate', () => {
        addBreadcrumb(`Navigate: ${window.location.pathname}`, 'NAV');
    });

    console.info('🛡️ [QMS] Global error listener successfully initialized with breadcrumbs.');
};

// Auto initialize on module import
initGlobalErrorListener();
