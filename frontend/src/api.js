import axios from 'axios';
import { toast } from 'react-toastify';

// [고도화 1] 환경 변수(.env) 기반 주소 관리
const getBaseURL = () => {
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

// [고도화 3] 전역 로딩 상태 (글로벌 스피너) 제어 함수
let activeRequests = 0;
const setGlobalLoading = (isLoading) => {
    if (isLoading) {
        activeRequests++;
    } else {
        activeRequests = Math.max(0, activeRequests - 1);
    }
    // Only dispatch if it's the first request or the last one finishing
    // Use a small delay to prevent rapid toggle flickering which causes re-mount loops
    window.dispatchEvent(new CustomEvent('qms-api-loading', { detail: activeRequests > 0 }));
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

const api = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true,
});

// [고도화 3] Request 인프라: 로딩 시작 및 인증 토큰 주입
api.interceptors.request.use(
    (config) => {
        if (!config.skipLoading) {
            setGlobalLoading(true); // 스피너 시작
        }
        // withCredentials: true가 자동으로 세션 쿠키(QMS_SESSION)를 전송하므로 별도 토큰 주입 불필요
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
        return response;
    },
    (error) => {
        if (error.config && !error.config.skipLoading) {
            setGlobalLoading(false);
        }

        const isLoginRequest = error.config && error.config.url && (error.config.url.endsWith('/auth/login') || error.config.url.includes('/auth/login'));
        
        if (error.response && error.response.status === 401 && !isLoginRequest) {
            window.dispatchEvent(new Event('auth-unauthorized'));
        } else if (!isLoginRequest) {
            // [에어백] 모든 실패한 요청에 대해 사용자에게 즉시 토스트 알림
            const errorMsg = error.response?.data?.message || "서버와 통신 중 문제가 발생했습니다.";
            toast.error(`⚠️ ${errorMsg}`);
        }
        return Promise.reject(error);
    }
);

// Dashboard
export const getDashboard = () => 
  api.get('/api/dashboard').then(res => res.data);

// Auth
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
export const getSystemSettings = () => api.get('/api/settings').then(res => res.data);
export const saveSystemSettings = (settings) => api.post('/api/settings', settings).then(res => res.data);

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
export const getInboundHistory = (id) => api.get(`/api/quality/inbound/${id}/history`);
export const uploadCoaFile = (file, productName = '') => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/quality/inbound/upload-coa?productName=${encodeURIComponent(productName)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const submitQualityReport = (report) => api.post('/api/quality/report', report);
export const triggerWmsFetch = () => api.post('/api/quality/fetch-wms');
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

// Manufacturer APIs
export const getManufacturers = () => api.get('/api/manufacturers');
export const createManufacturer = (m) => api.post('/api/manufacturers', m);
export const updateManufacturer = (id, m) => api.put(`/api/manufacturers/${id}`, m);
export const deleteManufacturer = (id) => api.delete(`/api/manufacturers/${id}`);
export const restoreManufacturer = (id) => api.post(`/api/manufacturers/${id}/restore`);
export const hardDeleteManufacturer = (id) => api.delete(`/api/manufacturers/${id}/hard`);

// Brand APIs
export const getBrands = () => api.get('/api/brands');
export const createBrand = (brand) => api.post('/api/brands', brand);
export const deleteBrand = (id) => api.delete(`/api/brands/${id}`);

// Product APIs
export const getProducts = () => api.get('/api/products');
export const createProduct = (product) => api.post('/api/products', product);
export const updateProduct = (id, product) => api.put(`/api/products/${id}`, product);
export const getProductById = (id) => api.get(`/api/products/${id}`);
export const uploadFile = (file, productName = '') => {
    const formData = new FormData();
    formData.append('file', file);
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
export const getProductHistory = (id) => api.get(`/api/products/${id}/history`);
export const deleteProduct = (id) => api.delete(`/api/products/${id}`);
export const restoreProduct = (id) => api.post(`/api/products/${id}/restore`);
export const hardDeleteProduct = (id) => api.delete(`/api/products/${id}/hard`);
export const checkDuplicateItemCode = (itemCode) => api.get(`/api/products/check-duplicate/${itemCode}`);
export const loadMasterProduct = (itemCode) => api.get(`/api/products/master/${itemCode}`);
export const getProductByItemCode = loadMasterProduct;
export const searchProducts = (params) => {
    const queryParams = new URLSearchParams();
    if (params.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params.productName) queryParams.append('productName', params.productName);
    if (params.englishProductName) queryParams.append('englishProductName', params.englishProductName);
    if (params.brand) queryParams.append('brand', params.brand);
    if (params.manufacturer) queryParams.append('manufacturer', params.manufacturer);
    if (params.ingredients) queryParams.append('ingredients', params.ingredients);
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
export const downloadIngredientTemplate = () => api.get('/api/products/ingredient-template', { responseType: 'blob' });

// Packaging Spec APIs
export const getPackagingSpecs = (productId) => api.get(`/api/packaging-specs/product/${productId}`);
export const createPackagingSpec = (productId) => api.post(`/api/packaging-specs/product/${productId}`);
export const savePackagingSpec = (spec) => api.post('/api/packaging-specs', spec); // This might be used for updates
export const copyMasterPackagingSpec = (productId, masterProductId) => 
    api.post(`/api/packaging-specs/copy-master?productId=${productId}&masterProductId=${masterProductId}`);
export const downloadPackagingSpecExcel = (productId) => api.get(`/api/packaging-specs/export-excel/${productId}`, { responseType: 'blob' });
export const downloadPackagingSpecPdf = (productId) => api.get(`/api/packaging-specs/export-pdf/${productId}`, { responseType: 'blob' });

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
export const exportAuditsExcel = (params) => {
    const queryParams = new URLSearchParams();
    if (params.manufacturerName) queryParams.append('manufacturerName', params.manufacturerName);
    if (params.itemCode) queryParams.append('itemCode', params.itemCode);
    if (params.productName) queryParams.append('productName', params.productName);
    return api.get(`/api/production-audits/export?${queryParams.toString()}`, { responseType: 'blob' });
};

// Master Data APIs (Feature 2, 3, 4, 11)
export const getMasterTemplates = () => api.get('/api/admin/master-data/templates');
export const saveMasterTemplate = (template) => api.post('/api/admin/master-data/templates', template);
export const getMasterRules = () => api.get('/api/admin/master-data/rules');
export const saveMasterRule = (rule) => api.post('/api/admin/master-data/rules', rule);
export const getMasterMaterials = () => api.get('/api/admin/master-data/materials');
export const getMasterMaterialsSearch = (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.bomCode) queryParams.append('bomCode', params.bomCode);
    if (params.componentName) queryParams.append('componentName', params.componentName);
    if (params.type) queryParams.append('type', params.type);
    if (params.detailedType) queryParams.append('detailedType', params.detailedType);
    if (params.manufacturer) queryParams.append('manufacturer', params.manufacturer);
    return api.get(`/api/admin/master-data/materials/search?${queryParams.toString()}`);
};
export const saveMasterMaterial = (material) => api.post('/api/admin/master-data/materials', material);
export const checkBomCodeExists = (bomCode) => api.get(`/api/admin/master-data/materials/check-bom-code?bomCode=${bomCode}`);
export const getMasterStickers = () => api.get('/api/admin/master-data/stickers');
export const saveMasterSticker = (sticker) => api.post('/api/admin/master-data/stickers', sticker);

// --- Sales Channels (Distribution Channel Management) ---
export const getSalesChannels = () => api.get('/api/admin/master-data/sales-channels');
export const getActiveSalesChannels = () => api.get('/api/admin/master-data/sales-channels/active');
export const saveSalesChannel = (channel) => api.post('/api/admin/master-data/sales-channels', channel);
export const toggleSalesChannel = (id) => api.post(`/api/admin/master-data/sales-channels/${id}/toggle`);
export const deleteSalesChannel = (id) => api.delete(`/api/admin/master-data/sales-channels/${id}`);

// Master Data Upload (Common)
export const uploadMasterFile = (file, prefix = 'MASTER') => {
    const formData = new FormData();
    formData.append('file', file);
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
export const hardDeleteBomCategory = (id) => api.delete(`/api/admin/system/bom-categories/${id}/hard`); // Placeholder if needed

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
    if (params.sharedWithManufacturer !== undefined && params.sharedWithManufacturer !== '') {
        queryParams.append('sharedWithManufacturer', params.sharedWithManufacturer);
    }
    return api.get(`/api/claims?${queryParams.toString()}`, config);
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
export const createClaim = (claim) => api.post('/api/claims', claim);
export const updateClaim = (id, data) => api.put(`/api/claims/${id}`, data);
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

export default api;
