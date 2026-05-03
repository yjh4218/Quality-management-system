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
