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
window.addEventListener('error', async (event) => {
  const isBugReportRequest = event.filename && (event.filename.includes('/api/bug-reports') || event.filename.includes('bug-reports'));
  if (isBugReportRequest) return;
  
  try {
    const axios = (await import('axios')).default;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    await axios.post(`${baseURL}/api/bug-reports`, {
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
    }, { withCredentials: true });
  } catch (err) {
    console.error('Failed to auto-report frontend error:', err);
  }
});

window.addEventListener('unhandledrejection', async (event) => {
  const reason = event.reason;
  // Skip bug report API calls failing
  if (reason && reason.config && reason.config.url && reason.config.url.includes('/api/bug-reports')) {
    return;
  }
  
  try {
    const axios = (await import('axios')).default;
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const errorMsg = reason?.message || (typeof reason === 'string' ? reason : JSON.stringify(reason));
    await axios.post(`${baseURL}/api/bug-reports`, {
      description: `[프론트엔드 자동 감지] 비동기 처리 오류: ${errorMsg}`,
      steps: [
        `Reason: ${reason?.stack || errorMsg || 'No reason specified'}`,
        `UserAgent: ${navigator.userAgent}`
      ].join('\n'),
      screenName: window.__QMS_ACTIVE_PAGE__ || window.location.pathname,
      url: window.location.href,
      severity: 'HIGH',
      serverError: 'FRONTEND_UNHANDLED_REJECTION'
    }, { withCredentials: true });
  } catch (err) {
    console.error('Failed to auto-report unhandled promise rejection:', err);
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
