import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
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

// Global error tracker to automatically send bug reports
const queueFailedBugReport = (report) => {
  try {
    const queue = JSON.parse(localStorage.getItem('qms_pending_bug_reports') || '[]');
    // Limit queue size to 20 to avoid clogging local storage
    if (queue.length >= 20) queue.shift();
    queue.push({ ...report, queuedAt: new Date().toISOString() });
    localStorage.setItem('qms_pending_bug_reports', JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to queue bug report locally:', err);
  }
};

window.addEventListener('error', async (event) => {
  const isBugReportRequest = event.filename && (event.filename.includes('/api/bug-reports') || event.filename.includes('bug-reports'));
  if (isBugReportRequest) return;
  
  const report = {
    description: `[프론트엔드 자동 감지] 런타임 오류: ${event.message || '알 수 없는 오류'}`,
    steps: [
      `Error: ${event.error?.stack || event.message || 'No stack trace'}`,
      `File: ${event.filename || 'N/A'}`,
      `Line/Col: ${event.lineno || 0}:${event.colno || 0}`,
      `UserAgent: ${navigator.userAgent}`
    ].join('\n'),
    screenName: window.__QMS_ACTIVE_PAGE__ || window.location.pathname,
    url: window.location.href,
    severity: 'HIGH',
    serverError: 'FRONTEND_RUNTIME_EXCEPTION'
  };

  try {
    const axios = (await import('axios')).default;
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await axios.post(`${apiBase}/api/bug-reports`, report, { headers, withCredentials: true });
  } catch (err) {
    console.error('Failed to auto-report frontend error, queuing locally:', err);
    queueFailedBugReport(report);
  }
});

window.addEventListener('unhandledrejection', async (event) => {
  const reason = event.reason;
  // Skip bug report API calls failing
  if (reason && reason.config && reason.config.url && reason.config.url.includes('/api/bug-reports')) {
    return;
  }
  
  const errorMsg = reason?.message || (typeof reason === 'string' ? reason : JSON.stringify(reason));
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
    const axios = (await import('axios')).default;
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await axios.post(`${apiBase}/api/bug-reports`, report, { headers, withCredentials: true });
  } catch (err) {
    console.error('Failed to auto-report unhandled promise rejection, queuing locally:', err);
    queueFailedBugReport(report);
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
