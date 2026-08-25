import React from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { compressImageToWebP } from './utils/imageCompressor';

// [고도화 1] 환경 변수(.env) 기반 주소 관리
export const getBaseURL = () => {
    // 1. .env 파일의 VITE_API_BASE_URL 우선 사용
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }
    
    // 2. 로컬 개발 환경인 경우 백엔드 포트 기본값 사용
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return "http://localhost:8080";
    }

    // 3. 배포(HF) 환경 기본값
    return "https://yjh332123-qms.hf.space";
};

/**
 * [공통 유틸] 파일/이미지 경로를 백엔드 BaseURL 포함 풀 URL로 변환합니다.
 */
export const getFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseURL = getBaseURL();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseURL}${cleanPath}`;
};

// [고도화 3] 전역 로딩 상태 (글로벌 스피너) 제어 함수
let activeRequests = 0;
let loadingTimeout = null;
const setGlobalLoading = (isLoading) => {
    if (isLoading) {
        activeRequests++;
        clearTimeout(loadingTimeout);
        window.dispatchEvent(new CustomEvent('qms-api-loading', { detail: true }));
    } else {
        activeRequests = Math.max(0, activeRequests - 1);
        // [FIX] 로딩 종료 시 debounce 적용 - 동시 다발 API 호출 시 모달 중복/깜빡임 방지
        clearTimeout(loadingTimeout);
        loadingTimeout = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('qms-api-loading', { detail: activeRequests > 0 }));
        }, 100);
    }
};

/**
 * [공통 유틸] Blob 데이터를 파일로 다운로드합니다.
 */
export const downloadBlob = (response, defaultFileName) => {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Content-Disposition 헤더에서 파일명 추출 시도
    const contentDisposition = response.headers['content-disposition'];
    let fileName = defaultFileName;
    if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename=(.+)/);
        if (fileNameMatch.length === 2) fileName = fileNameMatch[1];
    }
    
    // 파일명에 오늘 날짜 추가 (예: filename_2026-04-26.xlsx)
    const today = new Date().toISOString().split('T')[0];
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex > -1) {
        fileName = fileName.substring(0, dotIndex) + "_" + today + fileName.substring(dotIndex);
    } else {
        fileName = fileName + "_" + today;
    }

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

const getCookie = (name) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
};

export const getFormattedReporterInfo = (customUser = null) => {
    try {
        let user = customUser;
        if (!user) {
            const userStr = localStorage.getItem('user_info') || localStorage.getItem('user');
            if (userStr) {
                user = JSON.parse(userStr);
            }
        }
        if (!user) {
            return { name: 'ANONYMOUS_USER', username: 'anonymous' };
        }
        const company = user.companyName || user.manufacturerName || user.manufacturer || (user.roles?.some(r => r.authority === 'ROLE_MANUFACTURER') ? '제조사' : 'HQ(본사)');
        const dept = user.department || user.team || (user.roles?.some(r => r.authority === 'ROLE_ADMIN') ? '시스템관리자' : '품질관리팀');
        const name = user.name || user.username || '사용자';
        return {
            name: `${company} / ${dept} / ${name}`,
            username: user.username || 'unknown'
        };
    } catch (e) {
        return { name: customUser?.name || 'ANONYMOUS_USER', username: customUser?.username || 'unknown' };
    }
};

const api = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN'
});

// [버그 리포트 전용 독립 AXIOS 인스턴스] CORS preflight 및 CSRF 인터셉터의 영향을 받지 않는 무인증 JSON 클라이언트
const bugReportAxios = axios.create({
    baseURL: getBaseURL(),
    withCredentials: false,
    headers: {
        'Content-Type': 'application/json'
    }
});

// [고도화 3] Request 인프라: 로딩 시작, CSRF 토큰 헤더 주입 및 HTTP 메서드 우회
api.interceptors.request.use(
    (config) => {
        if (!config.skipLoading) {
            setGlobalLoading(true); // 스피너 시작
        }

        // [CSRF SECURITY] XSRF-TOKEN 쿠키를 읽어 X-XSRF-TOKEN 헤더에 주입
        const xsrfToken = getCookie('XSRF-TOKEN');
        if (xsrfToken) {
            config.headers['X-XSRF-TOKEN'] = xsrfToken;
        }

        // [HTTP METHOD OVERRIDE] PUT, PATCH, DELETE 시 OPTIONS preflight를 회피하기 위해 POST + _method 쿼리스트링 조합으로 변환
        const upperMethod = config.method ? config.method.toUpperCase() : '';
        if (['PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
            const separator = config.url.includes('?') ? '&' : '?';
            config.url = `${config.url}${separator}_method=${upperMethod}`;
            config.method = 'post';
        }

        return config;
    },
    (error) => {
        setGlobalLoading(false);
        return Promise.reject(error);
    }
);

// [고도화 4] Response 인프라: 로딩 종료 및 전역 에러 알림(Toast) 자동화
api.interceptors.response.use(
    (response) => {
        if (!response.config.skipLoading) {
            setGlobalLoading(false); // 스피너 종료
        }

        // [아키텍처] ApiResponse 표준 규격 대응
        // 서버에서 { success: true, data: { ... } } 형태로 응답이 오면 내부 data만 추출하여 반환합니다.
        // 이를 통해 프론트엔드 코드 전반에서 response.data를 기존처럼 투명하게 사용할 수 있습니다.
        if (response.data && typeof response.data === 'object' && Object.prototype.hasOwnProperty.call(response.data, 'success')) {
            if (response.data.success === true) {
                return { ...response, data: response.data.data };
            } else {
                // 서버에서 명시적으로 success: false를 보낸 경우 (비즈니스 로직 에러)
                const errorMsg = response.data.message || "요청 처리 중 오류가 발생했습니다.";
                if (!response.config.skipLoading) {
                    toast.error(errorMsg);
                }
                return Promise.reject({ response: { data: response.data } });
            }
        }

        // 서버와의 정상 통신이 성공했으므로, 혹시 오프라인 상태에서 쌓였던 버그리포트가 있다면 비동기로 flush합니다.
        flushPendingBugReports();

        return response;
    },
    (error) => {
        if (error.config && !error.config.skipLoading) {
            setGlobalLoading(false);
        }

        const isLoginRequest = error.config && error.config.url && (error.config.url.endsWith('/auth/login') || error.config.url.includes('/auth/login'));
        const isBugReportRequest = error.config && error.config.url && (error.config.url.endsWith('/api/bug-reports') || error.config.url.includes('/api/bug-reports'));
        const isSilentAuthCheck = error.config && error.config.silentAuthCheck === true;
        
        if (error.response && error.response.status === 401 && !isLoginRequest && !isSilentAuthCheck) {
            window.dispatchEvent(new Event('auth-unauthorized'));
        } else if (!isLoginRequest && !isBugReportRequest && !isSilentAuthCheck && !(error.config && error.config.skipToast)) {
            let errorMsg = "서버와 통신 중 문제가 발생했습니다.";
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                errorMsg = "요청 처리 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
            } else if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            } else if (typeof error.response?.data === 'string' && error.response.data.trim()) {
                errorMsg = error.response.data;
            } else if (error.message) {
                errorMsg = error.message;
            }

            const isNetworkError = !error.response;
            const isSystemBug = isNetworkError || (error.response?.status >= 500) || (error.response?.status === 403) || error.code === 'ECONNABORTED';

            if (isSystemBug) {
                // 네트워크 에러는 서버에 전송이 원천 불가능하므로, 바로 큐로만 적재하고 불필요한 전송 시도는 건너뜁니다.
                if (isNetworkError) {
                    console.warn("[QMS] Network Error detected. Skipping API auto-report and queueing offline.");
                    const reporterInfo = getFormattedReporterInfo();
                    const bugReportPayload = {
                        description: `[시스템 자동 감지 - 오프라인] 네트워크 장애 감지: ${errorMsg}`,
                        steps: [
                            error.stack || '네트워크 장애가 발생했습니다.',
                            `[요청 정보] URL: ${error.config?.url || 'N/A'}`
                        ].join('\n'),
                        screenName: window.__QMS_ACTIVE_PAGE__ || window.location.pathname,
                        url: window.location.href,
                        severity: 'CRITICAL',
                        serverError: 'Network Error / CORS Issue',
                        reporterName: reporterInfo.name,
                        reporterUsername: reporterInfo.username
                    };
                    try {
                        const queue = JSON.parse(localStorage.getItem('qms_pending_bug_reports') || '[]');
                        if (queue.length >= 50) queue.shift();
                        queue.push({ ...bugReportPayload, queuedAt: new Date().toISOString() });
                        localStorage.setItem('qms_pending_bug_reports', JSON.stringify(queue));
                    } catch (lsErr) {
                        console.error("Failed to write to localStorage:", lsErr);
                    }
                    toast.error(
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>⚠️</span>
                                <span style={{ fontWeight: 600 }}>통신 장애 감지</span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#666' }}>
                                서버와의 통신이 원활하지 않습니다. 요청이 로컬 큐에 안전하게 저장되었습니다.
                            </div>
                        </div>,
                        { autoClose: 4000 }
                    );
                } else {
                    // 서버 에러(500+)의 경우에만 실제 API 전송 시도
                    (async () => {
                        let serverErrorData = error.response?.data;
                        if (serverErrorData instanceof Blob) {
                            try {
                                const blobText = await serverErrorData.text();
                                serverErrorData = JSON.parse(blobText);
                            } catch (parseError) {
                                serverErrorData = "Blob data (not JSON)";
                            }
                        }

                        const bugReportPayload = {
                            description: `[시스템 자동 감지] API 에러 발생: ${errorMsg}`,
                            steps: [
                                error.stack || 'API 요청 중 에러 발생',
                                '',
                                `[요청 정보]`,
                                `Method: ${error.config?.method?.toUpperCase() || 'N/A'}`,
                                `URL: ${error.config?.url || 'N/A'}`,
                                `Status: ${error.response?.status || 'N/A'} ${error.response?.statusText || ''}`,
                                '',
                                `[요청 데이터]`,
                                error.config?.data ? (typeof error.config.data === 'string' ? error.config.data.substring(0, 2000) : 'FormData/Binary') : 'N/A'
                            ].join('\n'),
                            screenName: window.__QMS_ACTIVE_PAGE__ || window.location.pathname,
                            url: window.location.href,
                            severity: 'CRITICAL',
                            serverError: serverErrorData ? JSON.stringify(serverErrorData, null, 2) : 'N/A'
                        };

                        try {
                            await bugReportAxios.post('/api/bug-reports', { ...bugReportPayload, errorCategory: 'API_500' });
                            toast.error(
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '20px' }}>🚨</span>
                                        <span style={{ fontWeight: 600 }}>{errorMsg}</span>
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#666' }}>
                                        시스템 오류가 감지되어 에러 리포트가 관리자에게 자동 전송되었습니다.
                                    </div>
                                </div>,
                                { autoClose: 5000 }
                            );
                        } catch (reportErr) {
                            console.error("Failed to automatically report bug, saving to offline queue:", reportErr);
                            try {
                                const queue = JSON.parse(localStorage.getItem('qms_pending_bug_reports') || '[]');
                                if (queue.length >= 50) queue.shift();
                                queue.push({ ...bugReportPayload, queuedAt: new Date().toISOString() });
                                localStorage.setItem('qms_pending_bug_reports', JSON.stringify(queue));
                            } catch (lsErr) {
                                console.error("Failed to write to localStorage:", lsErr);
                            }
                        }
                    })();
                }
                toast.error(
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>⚠️</span>
                            <span style={{ fontWeight: 600 }}>{errorMsg}</span>
                        </div>
                    </div>,
                    { autoClose: 4000 }
                );
            }
        }
        return Promise.reject(error);
    }
);

// Dashboard
export const getDashboard = () => 
  api.get('/api/dashboard').then(res => res.data);

export const getDashboardStats = () => 
  api.get('/api/dashboard/stats').then(res => res.data);

// Auth
export const logout = () => api.post('/api/auth/logout');
export const login = (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    return api.post('/api/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
};
export const getCurrentUser = (config = {}) => api.get('/api/auth/me', config);
export const checkUsername = (username) => api.post('/api/auth/check-username', { username });
export const registerUser = (userData) => api.post('/api/auth/register', userData);
export const verifyEmail = (token) => api.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
export const findPassword = (data) => api.post('/api/auth/find-password', data);
export const changePassword = (data) => api.post('/api/auth/change-password', data);

// System Settings
export const getSystemSettings = () => api.get('/api/system-settings').then(res => res.data);
export const saveSystemSettings = (settings) => api.post('/api/system-settings', settings).then(res => res.data);

// Admin APIs
export const getUsers = (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.name) queryParams.append('name', params.name);
    if (params.companyName) queryParams.append('companyName', params.companyName);
    if (params.department) queryParams.append('department', params.department);
    if (params.role) queryParams.append('role', params.role);
    return api.get(`/api/admin/users?${queryParams.toString()}`);
};

// Role Management APIs
export const getRoles = () => api.get('/api/admin/roles');
export const createRole = (data) => api.post('/api/admin/roles', data);
export const updateRole = (id, data) => api.put(`/api/admin/roles/${id}`, data);
export const deleteRole = (id) => api.delete(`/api/admin/roles/${id}`);
export const getRoleLogs = (id) => api.get(`/api/admin/roles/${id}/logs`);

export const approveUser = (id) => api.post(`/api/admin/users/${id}/approve`);
export const toggleUserStatus = (id) => api.post(`/api/admin/users/${id}/toggle-status`);
export const updateUserRole = (id, role) => api.put(`/api/admin/users/${id}/role`, { role });
export const unlockUser = (id) => api.put(`/api/auth/unlock/${id}`, {});
export const resetUserPassword = (id, newPassword) => api.put(`/api/auth/reset-password/${id}`, { newPassword });

// Quality & WMS
export const getInboundData = (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params.productName) queryParams.append('productName', params.productName);
    if (params.lotNumber) queryParams.append('lotNumber', params.lotNumber);
    if (params.manufacturer) queryParams.append('manufacturer', params.manufacturer);
    if (params.excludeStatus) queryParams.append('excludeStatus', params.excludeStatus);
    if (params.grnNumber) queryParams.append('grnNumber', params.grnNumber);
    return api.get(`/api/quality/inbound?${queryParams.toString()}`);
};
export const updateInboundData = (id, data) => api.put(`/api/quality/inbound/${id}`, data);
export const completeInboundInspection = (id) => api.post(`/api/quality/inbound/${id}/complete`);
export const getInboundHistory = (id) => api.get(`/api/quality/inbound/${id}/history`, { skipToast: true }).catch(() => ({ data: [] }));
export const deleteInbound = (id) => api.delete(`/api/quality/inbound/${id}`);
export const uploadCoaFile = async (file, productName = '') => {
    const processedFile = await compressImageToWebP(file);
    const formData = new FormData();
    formData.append('file', processedFile);
    return api.post(`/api/quality/inbound/upload-coa?productName=${encodeURIComponent(productName)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const submitQualityReport = (report) => api.post('/api/quality/report', report);
export const triggerWmsFetch = () => api.post('/api/quality/fetch-wms');
export const getLotPpmAnalysis = (params = {}) => {
    const query = new URLSearchParams();
    if (params.itemCode) query.append('itemCode', params.itemCode);
    if (params.productName) query.append('productName', params.productName);
    if (params.lotNumber) query.append('lotNumber', params.lotNumber);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.groupByMaster !== undefined) query.append('groupByMaster', params.groupByMaster);
    return api.get(`/api/quality-analytics/lot-ppm?${query.toString()}`);
};
export const exportInboundExcel = (params) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params.productName) queryParams.append('productName', params.productName);
    if (params.lotNumber) queryParams.append('lotNumber', params.lotNumber);
    if (params.manufacturer) queryParams.append('manufacturer', params.manufacturer);
    if (params.grnNumber) queryParams.append('grnNumber', params.grnNumber);
    return api.get(`/api/quality/export?${queryParams.toString()}`, { responseType: 'blob' });
};
export const importInboundExcel = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/quality/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const downloadInboundTemplate = () => api.get('/api/quality/import-template', { responseType: 'blob' });
export const requestCoaEmails = (startDate, endDate, customEmails = {}) => api.post('/api/quality/request-coa', { startDate, endDate, customEmails });
export const getCoaRequestPreview = (startDate, endDate) => api.get(`/api/quality/request-coa/preview?startDate=${startDate}&endDate=${endDate}`);

// Manufacturer APIs
export const getManufacturers = () => api.get('/api/manufacturers');
export const createManufacturer = (m) => api.post('/api/manufacturers', m);
export const updateManufacturer = (id, m) => api.put(`/api/manufacturers/${id}`, m);
export const deleteManufacturer = (id) => api.delete(`/api/manufacturers/${id}`);
export const restoreManufacturer = (id) => api.post(`/api/manufacturers/${id}/restore`);
export const hardDeleteManufacturer = (id) => api.delete(`/api/manufacturers/${id}/hard`);
export const getCompanyDepartmentsAndEmails = (companyName) => api.get('/api/manufacturers/departments', { params: { companyName } });
export const getManufacturerScorecard = (id) => api.get(`/api/manufacturers/${id}/scorecard`);

// Brand APIs
export const getBrands = () => api.get('/api/brands');
export const createBrand = (brand) => api.post('/api/brands', brand);
export const updateBrand = (id, brand) => api.put(`/api/brands/${id}`, brand);
export const deleteBrand = (id) => api.delete(`/api/brands/${id}`);

// Product APIs
export const getProducts = () => api.get('/api/products');
export const createProduct = (product) => api.post('/api/products', product);
export const updateProduct = (id, product) => api.put(`/api/products/${id}`, product);
export const getProductById = (id) => api.get(`/api/products/${id}`);
export const uploadFile = async (file, productName = '') => {
    const processedFile = await compressImageToWebP(file);
    const formData = new FormData();
    formData.append('file', processedFile);
    return api.post(`/api/products/upload?productName=${encodeURIComponent(productName)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const uploadIngredients = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/products/upload-ingredients', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const getProductHistory = (id) => api.get(`/api/products/${id}/history`, { skipToast: true }).catch(() => ({ data: [] }));
export const deleteProduct = (id) => api.delete(`/api/products/${id}`);
export const restoreProduct = (id) => api.post(`/api/products/${id}/restore`);
export const restoreDeletedClaim = (id) => api.post(`/api/claims/${id}/restore`);
export const getActiveMailTemplates = (category) => api.get(`/api/mail-templates/active${category ? `?category=${category}` : ''}`);
export const getClaimEmailPreview = (id, templateCode) => api.get(`/api/claims/${id}/email-preview?templateCode=${templateCode}`);
export const sendClaimEmail = (id, emailForm) => api.post(`/api/claims/${id}/send-email`, emailForm);
export const hardDeleteProduct = (id) => api.delete(`/api/products/${id}/hard`);
export const checkDuplicateItemCode = (itemCode) => api.get(`/api/products/check-duplicate/${itemCode}`);
export const loadMasterProduct = (itemCode) => api.get(`/api/products/master/${itemCode}`, { skipToast: true }).catch(() => ({ data: null }));
export const getProductByItemCode = loadMasterProduct;
export const searchProducts = (params) => {
    const queryParams = new URLSearchParams();
    if (params.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params.productName) queryParams.append('productName', params.productName);
    if (params.englishProductName) queryParams.append('englishProductName', params.englishProductName);
    if (params.brand) queryParams.append('brand', params.brand);
    if (params.manufacturer) queryParams.append('manufacturer', params.manufacturer);
    if (params.ingredients) queryParams.append('ingredients', params.ingredients);
    if (params.isMaster !== undefined) queryParams.append('isMaster', params.isMaster);
    if (params.channelNames && params.channelNames.length > 0) {
        params.channelNames.forEach(ch => queryParams.append('channelNames', ch));
    }
    if (params.page !== undefined) queryParams.append('page', params.page);
    if (params.size !== undefined) queryParams.append('size', params.size);
    return api.get(`/api/products/search?${queryParams.toString()}`);
};
export const exportProductsExcel = (params) => {
    const queryParams = new URLSearchParams();
    if (params.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params.productName) queryParams.append('productName', params.productName);
    if (params.englishProductName) queryParams.append('englishProductName', params.englishProductName);
    if (params.brand) queryParams.append('brand', params.brand);
    if (params.manufacturer) queryParams.append('manufacturer', params.manufacturer);
    if (params.ingredients) queryParams.append('ingredients', params.ingredients);
    return api.get(`/api/products/export?${queryParams.toString()}`, { responseType: 'blob' });
};
export const scanComplianceIngredients = (payload) => api.post('/api/compliance/scan', payload);
export const evaluateIngredientPrecautions = (payload, config = { skipToast: true }) => api.post('/api/compliance/evaluate-precautions', payload, config);
export const downloadIngredientTemplate = () => api.get('/api/products/ingredient-template', { responseType: 'blob' });

// Packaging Spec APIs
export const getPackagingSpecs = (productId) => api.get(`/api/packaging-specs/product/${productId}`);
export const getFullPackagingSpec = (productId) => api.get(`/api/packaging-specs/full/product/${productId}`);
export const saveFullPackagingSpec = (dto) => api.post('/api/packaging-specs/save-full', dto);
export const getProductInfoByItemCode = (itemCode) => api.get(`/api/packaging-specs/product-info/${itemCode}`);
export const createPackagingSpec = (productId) => api.post(`/api/packaging-specs/product/${productId}`);
export const savePackagingSpec = (spec) => api.post('/api/packaging-specs', spec); // This might be used for updates
export const copyMasterPackagingSpec = (productId, masterProductId) => 
    api.post(`/api/packaging-specs/copy-master?productId=${productId}&masterProductId=${masterProductId}`);
export const downloadPackagingSpecExcel = (productId) => api.get(`/api/packaging-specs/export-excel/${productId}`, { responseType: 'blob' });
export const downloadPackagingSpecPdf = (productId) => api.get(`/api/packaging-specs/export-pdf/${productId}`, { responseType: 'blob' });
export const getPackagingMethodImages = (specId) => api.get(`/api/packaging-specs/${specId}/method-images`);
export const copyPackagingMethodImagesFromProduct = (targetSpecId, sourceItemCode) => 
    api.post(`/api/packaging-specs/${targetSpecId}/method-images/copy-from-product/${encodeURIComponent(sourceItemCode)}`);
export const aggregateBomByComponents = (components) => 
    api.post('/api/packaging-specs/components/aggregate-bom', components);
export const uploadPackagingSpec3DSnapshot = (specId, mode, imageBase64, viewConfig = null) => 
    api.post(`/api/packaging-specs/${specId}/3d-snapshot`, { mode, imageBase64, viewConfig });


// Production Audit (Photo Audit) APIs
export const getProductionAudits = (manufacturerName) => 
    api.get(`/api/production-audits${manufacturerName ? `?manufacturerName=${encodeURIComponent(manufacturerName)}` : ''}`);
export const getPendingProductionAudits = (manufacturerName) => 
    api.get(`/api/production-audits/pending${manufacturerName ? `?manufacturerName=${encodeURIComponent(manufacturerName)}` : ''}`);
export const createProductionAudit = (data) => api.post(`/api/production-audits`, data);
export const updateProductionAudit = (id, data) => api.put(`/api/production-audits/${id}`, data);
export const deleteProductionAudit = (id) => api.delete(`/api/production-audits/${id}`);
export const toggleProductDisclosure = (itemCode, isDisclosed) => 
    api.patch(`/api/production-audits/pending/${encodeURIComponent(itemCode)}/disclosure`, { isDisclosed });
export const getProductionAuditHistory = (id) => api.get(`/api/production-audits/${id}/history`);
export const getProductionAuditEmailPreview = (id) => api.get(`/api/production-audits/${id}/email-preview`);
export const sendProductionAuditEmail = (id, emailRequest) => api.post(`/api/production-audits/${id}/send-email`, emailRequest);
export const exportAuditsExcel = (params) => {
    const queryParams = new URLSearchParams();
    if (params.manufacturerName) queryParams.append('manufacturerName', params.manufacturerName);
    if (params.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params.productName) queryParams.append('productName', params.productName);
    return api.get(`/api/production-audits/export?${queryParams.toString()}`, { responseType: 'blob' });
};

// Master Data APIs (Feature 2, 11)
export const getMasterTemplates = () => api.get('/api/admin/master-data/templates', { skipToast: true }).catch(() => ({ data: [] }));
export const saveMasterTemplate = (template) => api.post('/api/admin/master-data/templates', template);
export const getMasterMaterials = () => api.get('/api/admin/master-data/materials', { skipToast: true }).catch(() => ({ data: [] }));
export const getMasterMaterialsSearch = (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.bomCode) queryParams.append('bomCode', params.bomCode);
    if (params.componentName) queryParams.append('componentName', params.componentName);
    if (params.type) queryParams.append('type', params.type);
    if (params.detailedType) queryParams.append('detailedType', params.detailedType);
    if (params.manufacturer) queryParams.append('manufacturer', params.manufacturer);
    return api.get(`/api/admin/master-data/materials/search?${queryParams.toString()}`, { skipToast: true }).catch(() => ({ data: [] }));
};
export const saveMasterMaterial = (material) => api.post('/api/admin/master-data/materials', material);
export const checkBomCodeExists = (bomCode) => api.get(`/api/admin/master-data/materials/check-bom-code?bomCode=${bomCode}`);
export const generateBomCode = (type) => api.get(`/api/admin/master-data/materials/generate-code${type ? `?type=${encodeURIComponent(type)}` : ''}`);
export const getMasterStickers = () => api.get('/api/admin/master-data/stickers', { skipToast: true }).catch(() => ({ data: [] }));
export const saveMasterSticker = (sticker) => api.post('/api/admin/master-data/stickers', sticker);

// --- Sales Channels (Distribution Channel Management) ---
export const getSalesChannels = () => api.get('/api/admin/master-data/sales-channels', { skipToast: true }).catch(() => ({ data: [] }));
export const getActiveSalesChannels = () => api.get('/api/admin/master-data/sales-channels/active', { skipToast: true }).catch(() => ({ data: [] }));
export const saveSalesChannel = (channel) => api.post('/api/admin/master-data/sales-channels', channel);
export const toggleSalesChannel = (id) => api.post(`/api/admin/master-data/sales-channels/${id}/toggle`);
export const deleteSalesChannel = (id) => api.delete(`/api/admin/master-data/sales-channels/${id}`);
export const getChannelSpecialNotes = (channelId) => api.get(`/api/sales-channels/${channelId}/special-notes`, { skipToast: true }).catch(() => ({ data: { notes: [] } }));

// Master Data Upload (Common)
export const uploadMasterFile = async (file, prefix = 'MASTER') => {
    const processedFile = await compressImageToWebP(file);
    const formData = new FormData();
    formData.append('file', processedFile);
    formData.append('prefix', prefix);
    return api.post('/api/admin/master-data/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

// BOM Category APIs (New - Relocated to stable MasterDataController)
export const getActiveBomCategories = () => api.get('/api/admin/master-data/bom-categories/active');
export const getAllBomCategories = () => api.get('/api/admin/master-data/bom-categories/all');
export const saveBomCategory = (category) => api.post('/api/admin/master-data/bom-categories', category);
export const softDeleteBomCategory = (id) => api.delete(`/api/admin/master-data/bom-categories/${id}/soft`);
export const hardDeleteBomCategory = (id) => api.delete(`/api/admin/master-data/bom-categories/${id}/hard`);

// Global Admin & Profile APIs
export const getAdminLogs = (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.entityType) queryParams.append('entityType', params.entityType);
    if (params.entityId) queryParams.append('entityId', params.entityId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page !== undefined) queryParams.append('page', params.page);
    if (params.size !== undefined) queryParams.append('size', params.size);
    return api.get(`/api/admin/logs?${queryParams.toString()}`);
};
export const rollbackAuditLog = (logId) => api.post(`/api/admin/logs/${logId}/restore`);
export const updateProfile = (profileData) => api.put('/api/auth/profile', profileData);

// Page View Logging
export const logPageView = (data) => api.post('/api/logs/access/page-move', data, { skipLoading: true, skipToast: true });

// User Access Logs
export const getAccessLogs = () => api.get('/api/logs/access').then(res => res.data);

// Bug Reports
export const submitBugReport = (report = {}) => {
    const reporterInfo = getFormattedReporterInfo();
    const screenName = report?.screenName || report?.pageName || window.__QMS_ACTIVE_PAGE__ || window.location.pathname || '시스템 공통';
    const url = report?.url || report?.pageUrl || window.location.href || 'http://localhost:5173/';
    const description = report?.description || report?.errorMessage || '오류가 발생했습니다.';
    const serverError = report?.serverError || (report?.errorMessage ? `[에러메시지] ${report.errorMessage}` : null);
    const steps = report?.steps || report?.stackTrace || '시스템 전역에서 예외 상황이 감지되었습니다.';

    const payload = {
        ...report,
        screenName: String(screenName).trim() || '시스템 공통',
        url: String(url).slice(0, 1000),
        description: String(description).trim().slice(0, 5000) || '오류 발생',
        serverError: serverError ? String(serverError).slice(0, 2000) : null,
        steps: steps ? String(steps).slice(0, 3000) : null,
        severity: report?.severity || 'HIGH',
        errorCategory: report?.errorCategory || 'API_400_SAVE_ERROR',
        reporterName: (report?.reporterName && report?.reporterName !== 'ANONYMOUS_USER' && !report?.reporterName.includes('null'))
            ? report.reporterName
            : reporterInfo.name,
        reporterUsername: (report?.reporterUsername && report?.reporterUsername !== 'unknown' && report?.reporterUsername !== 'anonymous')
            ? report.reporterUsername
            : reporterInfo.username
    };
    return bugReportAxios.post('/api/bug-reports', payload).then(res => res.data);
};
export const getBugReports = () => api.get('/api/bug-reports').then(res => res.data);
export const updateBugReportStatus = (id, status) => api.patch(`/api/bug-reports/${id}/status`, { status }).then(res => res.data);

// Claim APIs
export const getClaims = (params = {}, config = {}) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params.productName) queryParams.append('productName', params.productName);
    if (params.lotNumber) queryParams.append('lotNumber', params.lotNumber);
    if (params.country) queryParams.append('country', params.country);
    if (params.qualityStatus) queryParams.append('qualityStatus', params.qualityStatus);
    if (params.claimNumber) queryParams.append('claimNumber', params.claimNumber);
    if (params.manufacturer) queryParams.append('manufacturer', params.manufacturer);
    if (params.sharedWithManufacturer !== undefined && params.sharedWithManufacturer !== '') {
        queryParams.append('sharedWithManufacturer', params.sharedWithManufacturer);
    }
    return api.get(`/api/claims?${queryParams.toString()}`, config);
};
export const getClaimsPaged = (params = {}, page = 0, size = 50, config = {}) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params.productName) queryParams.append('productName', params.productName);
    if (params.lotNumber) queryParams.append('lotNumber', params.lotNumber);
    if (params.country) queryParams.append('country', params.country);
    if (params.qualityStatus) queryParams.append('qualityStatus', params.qualityStatus);
    if (params.claimNumber) queryParams.append('claimNumber', params.claimNumber);
    if (params.manufacturer) queryParams.append('manufacturer', params.manufacturer);
    if (params.sharedWithManufacturer !== undefined && params.sharedWithManufacturer !== '') {
        queryParams.append('sharedWithManufacturer', params.sharedWithManufacturer);
    }
    queryParams.append('page', page);
    queryParams.append('size', size);
    return api.get(`/api/claims/paged?${queryParams.toString()}`, config);
};
export const getDebugStatus = () => api.get('/api/claims/debug/status');
export const getClaimDashboard = (params = {}, config = {}) => {
    let url = '/api/claims/dashboard';
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params.productName) queryParams.append('productName', params.productName);
    if (params.manufacturer) queryParams.append('manufacturer', params.manufacturer);
    
    const qStr = queryParams.toString();
    if (qStr) url += '?' + qStr;
    
    return api.get(url, config);
};

export const getClaimById = (id, fromEmail = false) => api.get(`/api/claims/${id}${fromEmail ? '?fromEmail=true' : ''}`);
export const createClaim = (claim) => api.post('/api/claims', claim);
export const updateClaim = (id, data) => api.put(`/api/claims/${id}`, data);
export const deleteClaim = (id) => api.delete(`/api/claims/${id}`);
export const reRequestCriticalCapa = (id, reason) => api.post(`/api/claims/${id}/re-request`, { reason }).then(res => res.data);
export const uploadClaimResponse = (id, file, productName) => {
    const formData = new FormData();
    formData.append('file', file);
    if (productName) formData.append('productName', productName);
    return api.post(`/api/claims/${id}/upload-response`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
};
export const uploadClaimPhoto = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/claims/upload-photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
};
export const exportClaimsExcel = (params) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params.productName) queryParams.append('productName', params.productName);
    if (params.lotNumber) queryParams.append('lotNumber', params.lotNumber);
    if (params.country) queryParams.append('country', params.country);
    if (params.qualityStatus) queryParams.append('qualityStatus', params.qualityStatus);
    if (params.claimNumber) queryParams.append('claimNumber', params.claimNumber);
    if (params.manufacturer) queryParams.append('manufacturer', params.manufacturer);
    return api.get(`/api/claims/export?${queryParams.toString()}`, { responseType: 'blob' });
};
export const getClaimDashboardStats = (startDate, endDate, itemCode, productName, manufacturer) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (itemCode) params.append('itemCode', itemCode);
    if (productName) params.append('productName', productName);
    if (manufacturer) params.append('manufacturer', manufacturer);
    return api.get(`/api/claims/dashboard?${params.toString()}`);
};

export const getClaimHistory = (id) => api.get(`/api/claims/${id}/history`);

// Dashboard Layout APIs
export const getDashboardLayouts = () => api.get('/api/dashboard-layouts').then(res => res.data);
export const createDashboardLayout = (data) => api.post('/api/dashboard-layouts', data).then(res => res.data);
export const updateDashboardLayout = (id, data) => api.put(`/api/dashboard-layouts/${id}`, data).then(res => res.data);
export const deleteDashboardLayout = (id) => api.delete(`/api/dashboard-layouts/${id}`);

// Page Guide Management
export const getPageGuides = () => api.get('/api/guides').then(res => res.data);
export const getPageGuide = (pageKey) => api.get(`/api/guides/${pageKey}`).then(res => res.data);
export const savePageGuide = (data) => api.post('/api/guides', data).then(res => res.data);
export const deletePageGuide = (id) => api.delete(`/api/guides/${id}`);

// [휴지통 관련]
export const getTrashItems = () => api.get('/api/admin/trash');
export const restoreTrashItem = (type, id) => api.post(`/api/admin/trash/${type}/${id}/restore`);
export const hardDeleteTrashItem = (type, id) => api.delete(`/api/admin/trash/${type}/${id}`);

// Manufacturer Audit Management
export const getAuditTemplates = () => api.get('/api/audit-templates').then(res => res.data);
export const getAuditTemplate = (id) => api.get(`/api/audit-templates/${id}`).then(res => res.data);
export const uploadAuditPhoto = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/manufacturer-audits/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const saveAuditTemplate = (data) => api.post('/api/audit-templates', data).then(res => res.data);
export const deleteAuditTemplate = (id) => api.delete(`/api/audit-templates/${id}`);

export const searchManufacturerAudits = (params) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.manufacturerName) queryParams.append('manufacturerName', params.manufacturerName);
    return api.get(`/api/manufacturer-audits/search?${queryParams.toString()}`).then(res => res.data);
};
export const saveManufacturerAudit = (data) => {
    if (data.id) return api.put(`/api/manufacturer-audits/${data.id}`, data).then(res => res.data);
    return api.post('/api/manufacturer-audits', data).then(res => res.data);
};
export const deleteManufacturerAudit = (id) => api.delete(`/api/manufacturer-audits/${id}`);

// --- Mail Template APIs ---
export const getMailTemplates = () => api.get('/api/mail-templates');
export const createMailTemplate = (data) => api.post('/api/mail-templates', data);
export const updateMailTemplate = (id, data) => api.put(`/api/mail-templates/${id}`, data);
export const deleteMailTemplate = (id) => api.delete(`/api/mail-templates/${id}`);

// --- Announcement APIs ---
export const getAnnouncements = () => api.get('/api/announcements');
export const getActiveAnnouncements = () => api.get('/api/announcements/active');
export const saveAnnouncement = (data) => {
    if (data.id) return api.put(`/api/announcements/${data.id}`, data);
    return api.post('/api/announcements', data);
};
export const deleteAnnouncement = (id) => api.delete(`/api/announcements/${id}`);

// --- Announcement Category APIs ---
export const getAnnouncementCategories = () => api.get('/api/announcements/categories');
export const saveAnnouncementCategory = (data) => {
    if (data.id) return api.put(`/api/announcements/categories/${data.id}`, data);
    return api.post('/api/announcements/categories', data);
};
export const deleteAnnouncementCategory = (id) => api.delete(`/api/announcements/categories/${id}`);

// --- Announcement Email ---
export const sendAnnouncementEmail = (id) => api.post(`/api/announcements/${id}/send-email`);

export const getMailCategories = () => api.get('/api/mail-categories');
export const createMailCategory = (data) => api.post('/api/mail-categories', data);
export const updateMailCategory = (id, data) => api.put(`/api/mail-categories/${id}`, data);
export const deleteMailCategory = (id) => api.delete(`/api/mail-categories/${id}`);

export const exportAuditToExcel = (id) => api.get(`/api/manufacturer-audits/${id}/export/excel`, { responseType: 'blob' }).then(res => res.data);
export const getManufacturerAuditHistory = (id) => api.get(`/api/manufacturer-audits/${id}/history`).then(res => res.data);

// export const exportAuditToPdf = (id) => api.get(`/api/manufacturer-audits/${id}/export/pdf`, { responseType: 'blob' }).then(res => res.data);

// --- Manufacturer Categories ---
export const getManufacturerCategories = () => api.get('/api/manufacturer-categories').then(res => res.data);
export const saveManufacturerCategory = (category) => {
    if (category.id) return api.put(`/api/manufacturer-categories/${category.id}`, category).then(res => res.data);
    return api.post('/api/manufacturer-categories', category).then(res => res.data);
};
export const deleteManufacturerCategory = (id) => api.delete(`/api/manufacturer-categories/${id}`);

// --- System Settings ---
export const getSystemSetting = (key) => api.get(`/api/system-settings/${key}`).then(res => res.data);
export const saveSystemSetting = (setting) => api.post('/api/system-settings', setting).then(res => res.data);

// --- Notification APIs ---
export const getMyNotifications = () => api.get('/api/notifications', { skipLoading: true, skipToast: true }).catch(() => ({ data: [] }));
export const getUnreadNotificationCount = () => api.get('/api/notifications/unread-count', { skipLoading: true, skipToast: true }).catch(() => ({ data: 0 }));
export const readNotification = (id) => api.post(`/api/notifications/${id}/read`);
export const readAllNotifications = () => api.post('/api/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/api/notifications/${id}`);

// --- Notification Settings APIs ---
export const getNotificationSettings = () => api.get('/api/notifications/settings').then(res => res.data);
export const createNotificationSetting = (setting) => api.post('/api/notifications/settings', setting).then(res => res.data);
export const updateNotificationSetting = (id, payload) => api.put(`/api/notifications/settings/${id}`, payload).then(res => res.data);

export default api;

export const getProductTestReports = (productId) => api.get(`/api/products/${productId}/test-reports`);
export const addProductTestReport = (productId, data) => api.post(`/api/products/${productId}/test-reports`, data);
export const deleteProductTestReport = (reportId) => api.delete(`/api/products/test-reports/${reportId}`);

// [오프라인 큐 전송 기능] 저장된 미전송 버그리포트를 서버가 정상화되었을 때 전송합니다.
let isFlushing = false;
let lastFlushTime = 0;
let consecutiveFailures = 0;
let flushDisabledUntil = 0;

export const flushPendingBugReports = async () => {
    const now = Date.now();
    
    // 연속 실패 시 일정 시간(예: 3분) 동안 큐 전송 시도 자체를 비활성화하여 리소스 무한 소모 방지
    if (now < flushDisabledUntil) {
        return;
    }

    // 쿨다운을 60초로 늘려 빈번한 API 콜을 억제합니다.
    if (isFlushing || (now - lastFlushTime < 60000)) return;
    
    try {
        const queue = JSON.parse(localStorage.getItem('qms_pending_bug_reports') || '[]');
        if (queue.length === 0) return;
        
        // 큐 항목별 24시간 TTL 필터링 (너무 오래된 정보는 자동 유실 처리)
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const validQueue = queue.filter(report => {
            if (!report.queuedAt) return true;
            return (now - new Date(report.queuedAt).getTime()) < ONE_DAY_MS;
        });

        if (validQueue.length === 0) {
            localStorage.removeItem('qms_pending_bug_reports');
            return;
        }

        isFlushing = true;
        lastFlushTime = now;
        
        console.log(`[QMS] Flushing ${validQueue.length} pending offline bug reports...`);
        const remaining = [];
        let hasErrorThisRun = false;
        
        for (const report of validQueue) {
            if (hasErrorThisRun) {
                remaining.push(report);
                continue;
            }

            const currentRetry = (report.retryCount || 0) + 1;
            if (currentRetry > 10) {
                console.warn(`[QMS] Bug report exceeded max retries (10 attempts). Dropping report:`, report.description);
                continue; // 10회 초과 시 제거 (remaining에 추가하지 않음)
            }

            try {
                await bugReportAxios.post('/api/bug-reports', report);
                consecutiveFailures = 0;
            } catch (err) {
                console.error(`Failed to flush offline report (attempt ${currentRetry}/10):`, err);
                if (err?.response?.status === 403) {
                    console.warn(`[QMS] 403 Forbidden received. Dropping stale offline bug report.`);
                } else {
                    remaining.push({ ...report, retryCount: currentRetry });
                }
                hasErrorThisRun = true;
                consecutiveFailures++;
            }
        }
        
        if (remaining.length > 0) {
            // 최대 50건까지 FIFO 유지
            const trimmedQueue = remaining.slice(-50);
            localStorage.setItem('qms_pending_bug_reports', JSON.stringify(trimmedQueue));
            
            // 5회 이상 연속 실패 시 2분 쿨다운
            if (consecutiveFailures >= 5) {
                console.warn("[QMS] Bug reports keep failing. Disabling queue flush for 2 minutes.");
                flushDisabledUntil = now + (2 * 60 * 1000);
            }
        } else {
            localStorage.removeItem('qms_pending_bug_reports');
            console.log("[QMS] All pending bug reports flushed successfully.");
        }
    } catch (err) {
        console.error("Error during flushing pending bug reports:", err);
    } finally {
        isFlushing = false;
    }
};

// 모듈이 처음 로드될 때 및 주기적으로 flush 시도
setTimeout(() => {
    flushPendingBugReports();
}, 5000);

// 2분 간격으로 백그라운드 재시도
setInterval(() => {
    flushPendingBugReports();
}, 120000);

/**
 * 품목 자동검증 API
 */
export const checkProductSpaceRatio = (productId) => {
    return api.post(`/api/products/${productId}/space-ratio-check`, {}, { skipToast: true }).catch(() => ({ data: null }));
};

/**
 * 독립 계산기 API
 */
export const calculateSpaceRatio = (params) => {
    return api.post(`/api/space-ratio/calculator`, params);
};

/**
 * 이력 로그 조회 API
 */
export const getSpaceRatioLogs = (page = 0, size = 20) => {
    return api.get(`/api/space-ratio/logs?page=${page}&size=${size}`);
};


