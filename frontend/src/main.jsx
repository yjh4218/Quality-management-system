import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import api from './api'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// MUI Core
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
// MUI DatePickers
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
// React-Toastify
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const theme = createTheme({
  palette: {
    primary: {
      main: '#2c3e50',
    },
    secondary: {
      main: '#1890ff',
    },
    background: {
      default: '#f4f7f6',
    }
  },
  typography: {
    fontFamily: '"Pretendard", "Noto Sans KR", "Inter", sans-serif',
  }
});

// helper to get CSRF token from cookie if needed as secondary fallback
const getCsrfTokenFromCookie = () => {
  const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

// Global error tracker to automatically send bug reports
const queueFailedBugReport = (report) => {
  try {
    const queue = JSON.parse(localStorage.getItem('qms_pending_bug_reports') || '[]');
    if (queue.length >= 20) queue.shift();
    queue.push({ ...report, queuedAt: new Date().toISOString(), retryCount: 0 });
    localStorage.setItem('qms_pending_bug_reports', JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to queue bug report locally:', err);
  }
};

let lastBugReportTime = 0;

window.addEventListener('error', async (event) => {
  const now = Date.now();
  if (now - lastBugReportTime < 5000) return; // 5초 쿨다운
  lastBugReportTime = now;

  const errorMsg = event.message || 'Unknown Error';
  if (errorMsg.includes('bug-reports') || errorMsg.includes('ResizeObserver') || errorMsg.includes('429')) return;

  const report = {
    description: `[프론트엔드 자동 감지] 전역 런타임 오류: ${errorMsg}`,
    steps: [
      `Filename: ${event.filename}:${event.lineno}:${event.colno}`,
      `Stack: ${event.error?.stack || 'No stack trace available'}`,
      `UserAgent: ${navigator.userAgent}`
    ].join('\n'),
    screenName: window.__QMS_ACTIVE_PAGE__ || window.location.pathname,
    url: window.location.href,
    severity: 'HIGH',
    serverError: 'FRONTEND_RUNTIME_EXCEPTION'
  };

  try {
    const csrfToken = getCsrfTokenFromCookie();
    const headers = {};
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }
    await api.post('/api/bug-reports', report, { headers });
  } catch (err) {
    console.warn('Auto-report throttled or failed silently.');
  }
});

window.addEventListener('unhandledrejection', async (event) => {
  const reason = event.reason;
  if (reason && reason.config && reason.config.url && reason.config.url.includes('/api/bug-reports')) {
    return;
  }

  const now = Date.now();
  if (now - lastBugReportTime < 5000) return; // 5초 쿨다운
  lastBugReportTime = now;
  
  const errorMsg = reason?.message || (typeof reason === 'string' ? reason : JSON.stringify(reason));
  if (errorMsg.includes('429') || errorMsg.includes('canceled')) return;

  const report = {
    description: `[프론트엔드 자동 감지] 비동기 처리 오류: ${errorMsg}`,
    steps: [
      `Reason: ${reason?.stack || errorMsg || 'No reason specified'}`,
      `UserAgent: ${navigator.userAgent}`
    ].join('\n'),
    screenName: window.__QMS_ACTIVE_PAGE__ || window.location.pathname,
    url: window.location.href,
    severity: 'HIGH',
    serverError: 'FRONTEND_UNHANDLED_REJECTION'
  };

  try {
    const csrfToken = getCsrfTokenFromCookie();
    const headers = {};
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }
    await api.post('/api/bug-reports', report, { headers });
  } catch (err) {
    console.warn('Auto-report unhandled rejection throttled.');
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <App />
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
            </LocalizationProvider>
        </ThemeProvider>
    </React.StrictMode>,
)
