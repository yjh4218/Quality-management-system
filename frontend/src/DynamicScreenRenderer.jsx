import React, { useState, useEffect, useCallback } from 'react';
import api from './api';
import DynamicFilterBar from './components/dynamic/DynamicFilterBar';
import NotionPropertyMenu from './components/dynamic/NotionPropertyMenu';
import DynamicGrid from './components/dynamic/DynamicGrid';
import DynamicDashboardView from './components/dynamic/DynamicDashboardView';
import DynamicFormModal from './components/dynamic/DynamicFormModal';
import DynamicDetailDrawer from './components/dynamic/DynamicDetailDrawer';
import ScreenBuilderModal from './components/dynamic/ScreenBuilderModal';
import { toast } from 'react-toastify';
import { reportGlobalError } from './utils/globalErrorListener';

// API 엔드포인트 누락 시 컬럼 및 화면 정보로부터 유추하는 똑똑한 폴백 함수
const getFallbackEndpoint = (metaData) => {
    if (metaData?.screen?.apiEndpoint && metaData.screen.apiEndpoint.trim() !== '') {
        return metaData.screen.apiEndpoint.trim();
    }
    const cols = metaData?.gridColumns || [];
    const hasProductCol = cols.some(c => 
        ['itemCode', 'productName', 'brand', 'manufacturer', 'specification'].includes(c.fieldKey || c.field)
    );
    if (hasProductCol) return '/api/products';
    const hasClaimCol = cols.some(c => 
        ['claimNo', 'claimNumber', 'claimType', 'defectType'].includes(c.fieldKey || c.field)
    );
    if (hasClaimCol) return '/api/claims';
    if (metaData?.screen?.targetTable === 'products' || metaData?.screen?.targetTable === 'product') return '/api/products';
    if (metaData?.screen?.targetTable === 'claims' || metaData?.screen?.targetTable === 'claim') return '/api/claims';
    return '/api/products'; // 기본 CRUD 폴백
};

const DynamicScreenRenderer = ({ screenCode = 'SCR_NOTION_PRODUCT', user }) => {
    const [meta, setMeta] = useState(null);
    const [rowData, setRowData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState(null);
    const [showDashboard, setShowDashboard] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [isRegenerating, setIsRegenerating] = useState(false);

    // 상세 드로어 및 데이터 C/U 상태
    const [selectedRow, setSelectedRow] = useState(null);
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
    const [isSavingData, setIsSavingData] = useState(false);

    const [errorStatus, setErrorStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    // 유효 API 엔드포인트 산출
    const effectiveEndpoint = meta?.screen?.apiEndpoint || getFallbackEndpoint(meta);

    // 관리자 권한 확인
    const isAdmin = user?.role === 'ADMIN' 
        || user?.role === 'ROLE_ADMIN' 
        || user?.username === 'admin' 
        || user?.roles?.some(r => r.authority?.includes('ADMIN'));

    // 1. 화면 메타데이터 로드
    const loadMeta = useCallback(async () => {
        try {
            setLoading(true);
            setErrorStatus(null);
            setErrorMessage('');
            const res = await api.get(`/api/dynamic/screens/by-code/${screenCode}/meta`);
            setMeta(res.data);

            // 비활성화된 화면 체크
            if (res.data?.screen && res.data.screen.isActive === false) {
                setErrorStatus(404);
                setErrorMessage('해당 동적 화면은 비활성화(삭제)되었습니다.');
                return;
            }

            // 대시보드 로드
            if (res.data?.screen?.id) {
                try {
                    const dashRes = await api.get(`/api/dynamic/dashboards/screen/${res.data.screen.id}`);
                    setDashboard(dashRes.data || null);
                } catch (dashErr) {
                    console.warn('[DYNAMIC] No dashboard found', dashErr);
                }
            }

            // 그리드 데이터 로드 (엔드포인트 또는 컬럼 기반 자동 폴백)
            const targetEndpoint = res.data?.screen?.apiEndpoint || getFallbackEndpoint(res.data);
            if (targetEndpoint) {
                loadGridData(targetEndpoint, {});
            }
        } catch (err) {
            console.error('[DYNAMIC] Failed to load screen meta', err);
            const status = err.response?.status;
            setErrorStatus(status || 500);
            if (status === 403) {
                setErrorMessage('해당 화면에 접근할 수 있는 권한이 없습니다.');
            } else if (status === 404) {
                setErrorMessage('요청하신 동적 화면을 찾을 수 없습니다.');
            } else {
                setErrorMessage(err?.response?.data?.message || err?.message || '화면 메타데이터를 불러오지 못했습니다.');
                reportGlobalError(err?.message || `동적 화면 메타 로드 실패 (${screenCode})`, err?.stack, `DynamicScreenRenderer:${screenCode}`, 'METADATA');
            }
            toast.error(status === 403 ? '접근 권한이 없습니다.' : '화면 정보를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [screenCode]);

    // 2. 그리드 데이터 로드
    const loadGridData = async (endpoint, filters) => {
        try {
            const res = await api.get(endpoint, { params: filters });
            const data = Array.isArray(res.data) ? res.data : (res.data?.content || []);
            setRowData(data);
        } catch (err) {
            console.error('[DYNAMIC] Failed to load data from', endpoint, err);
            reportGlobalError(err?.message || `동적 데이터 로드 실패 (${endpoint})`, err?.stack, `DynamicScreenRenderer:loadGridData`, 'API_COMMUNICATION');
            toast.warning('데이터를 불러오는 중 문제가 발생했습니다.');
        }
    };

    useEffect(() => {
        loadMeta();
    }, [loadMeta]);

    // 3. Notion 속성 가시성 토글 및 서버 저장
    const handleVisibilityChange = async (columnId, isVisible) => {
        if (!meta) return;
        const currentViews = meta.userViews || [];
        const existing = currentViews.find(v => v.columnId === columnId);

        let updatedViews;
        if (existing) {
            updatedViews = currentViews.map(v => v.columnId === columnId ? { ...v, isVisible } : v);
        } else {
            updatedViews = [...currentViews, { columnId, isVisible, columnOrder: 0 }];
        }

        setMeta(prev => ({ ...prev, userViews: updatedViews }));

        // 서버 비동기 저장
        try {
            await api.put(`/api/dynamic/screens/${meta.screen.id}/user-views`, {
                settings: updatedViews
            });
        } catch (err) {
            console.error('[DYNAMIC] Failed to save user views', err);
        }
    };

    // 4. 대시보드 자동 생성 실행
    const handleRegenerateDashboard = async () => {
        if (!meta?.screen?.id) return;
        try {
            setIsRegenerating(true);
            const res = await api.post(`/api/dynamic/dashboards/screen/${meta.screen.id}/auto-generate`);
            setDashboard(res.data);
            toast.success('규칙 기반 대시보드가 새로 생성되었습니다!');
        } catch (err) {
            console.error('[DYNAMIC] Failed to auto-generate dashboard', err);
            toast.error('대시보드 자동 생성에 실패했습니다.');
        } finally {
            setIsRegenerating(false);
        }
    };

    // 5. 검색 및 초기화
    const handleSearch = () => {
        if (meta?.screen?.apiEndpoint) {
            // 필터 파라미터 정규화 (품목코드&제품명 복합 객체 및 날짜/키워드 분리 매핑)
            const params = {};
            Object.entries(filterValues).forEach(([key, val]) => {
                if (val === null || val === undefined || val === '') return;
                if (key === 'PRODUCT_NAME') {
                    if (typeof val === 'object') {
                        if (val.itemCode) params.itemCode = val.itemCode;
                        if (val.productName) params.productName = val.productName;
                    } else if (typeof val === 'string') {
                        params.productName = val;
                    }
                } else if (key === 'DATE_RANGE') {
                    if (typeof val === 'object') {
                        if (val.startDate) params.startDate = val.startDate;
                        if (val.endDate) params.endDate = val.endDate;
                    }
                } else if (key === 'TEXT_SEARCH') {
                    params.keyword = val;
                    params.search = val;
                    params[key] = val;
                } else {
                    params[key] = val;
                }
            });
            if (effectiveEndpoint) {
                loadGridData(effectiveEndpoint, params);
            }
        }
    };

    const handleReset = () => {
        setFilterValues({});
        if (effectiveEndpoint) {
            loadGridData(effectiveEndpoint, {});
        }
    };

    // 6. 행 더블클릭 상세 열기
    const handleRowDoubleClick = (data) => {
        if (!data) return;
        setSelectedRow(data);
        setIsDetailDrawerOpen(true);
    };

    // 7. 신규 데이터 자동 등록
    const handleCreateData = async (formData) => {
        if (!effectiveEndpoint) {
            toast.warning('연결된 데이터 저장 엔드포인트가 없습니다.');
            return;
        }
        try {
            setIsSavingData(true);
            await api.post(effectiveEndpoint, formData);
            toast.success('데이터가 성공적으로 등록되었습니다.');
            setIsFormOpen(false);
            loadGridData(effectiveEndpoint, filterValues);
        } catch (err) {
            console.error('[DYNAMIC] Failed to create data', err);
            toast.error(err?.response?.data?.message || err?.message || '데이터 등록에 실패했습니다.');
        } finally {
            setIsSavingData(false);
        }
    };

    // 8. 기존 데이터 수정 저장
    const handleUpdateData = async (updatedData) => {
        if (!effectiveEndpoint || !updatedData) return;
        const targetId = updatedData.id;
        try {
            setIsSavingData(true);
            if (targetId) {
                try {
                    await api.put(`${effectiveEndpoint}/${targetId}`, updatedData);
                } catch (putErr) {
                    await api.post(`${effectiveEndpoint}/${targetId}`, updatedData);
                }
            } else {
                await api.post(effectiveEndpoint, updatedData);
            }
            toast.success('데이터가 성공적으로 수정되었습니다.');
            setSelectedRow(updatedData);
            loadGridData(effectiveEndpoint, filterValues);
        } catch (err) {
            console.error('[DYNAMIC] Failed to update data', err);
            toast.error(err?.response?.data?.message || err?.message || '데이터 수정에 실패했습니다.');
        } finally {
            setIsSavingData(false);
        }
    };

    if (loading && !meta) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>
                <div className="spinner-ring" style={{ width: '40px', height: '40px', marginBottom: '16px' }}></div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>화면 메타데이터를 로딩 중입니다...</div>
            </div>
        );
    }

    if (errorStatus || !meta) {
        const isForbidden = errorStatus === 403;
        return (
            <div style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                minHeight: '60vh', padding: '40px', textAlign: 'center' 
            }}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>{isForbidden ? '🔐' : '🔍'}</div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                    {isForbidden ? '접근 권한이 없습니다' : '화면을 불러올 수 없습니다'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '450px', lineHeight: '1.6', marginBottom: '24px' }}>
                    {errorMessage || '요청하신 화면이 존재하지 않거나 관리자에 의해 비활성화되었습니다.'}
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        type="button" 
                        onClick={loadMeta}
                        style={{ padding: '8px 18px', borderRadius: '8px', background: '#003366', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                    >
                        🔄 다시 시도
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            {/* 상단 헤더 */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                padding: '14px 20px',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>⚡</span>
                        <span>{meta.screen?.screenName}</span>
                    </h2>
                    {meta.screen?.description && (
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                            {meta.screen.description}
                        </p>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* 대시보드 토글 버튼 */}
                    <button
                        type="button"
                        onClick={() => setShowDashboard(!showDashboard)}
                        style={{
                            padding: '6px 14px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: showDashboard ? '#bfdbfe' : '#cbd5e1',
                            background: showDashboard ? '#eff6ff' : '#ffffff',
                            color: showDashboard ? '#1d4ed8' : '#475569',
                            fontWeight: '600',
                            cursor: 'pointer',
                            height: '34px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <span>📊</span>
                        <span>{showDashboard ? '대시보드 접기' : '대시보드 펼치기'}</span>
                    </button>

                    {/* Notion 스타일 속성 메뉴 */}
                    <NotionPropertyMenu
                        columns={meta.gridColumns || []}
                        userViews={meta.userViews || []}
                        onVisibilityChange={handleVisibilityChange}
                        onResetDefault={() => {
                            setMeta(prev => ({ ...prev, userViews: [] }));
                            if (meta.screen?.id) {
                                api.put(`/api/dynamic/screens/${meta.screen.id}/user-views`, { settings: [] });
                            }
                        }}
                    />

                    {/* 데이터 등록 팝업 버튼 (컬럼 기반 자동 생성 또는 서브페이지) */}
                    <button
                        type="button"
                        onClick={() => setIsFormOpen(true)}
                        style={{
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: '700',
                            borderRadius: '6px',
                            background: '#003366',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            height: '34px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 2px rgba(0, 51, 102, 0.2)'
                        }}
                        title="현재 그리드 컬럼 규격에 맞춰 신규 데이터 등록 팝업을 엽니다."
                    >
                        <span>➕</span>
                        <span>{meta.subPage?.buttonLabel || '데이터 등록'}</span>
                    </button>

                    {/* 관리자용 화면 편집기 버튼 */}
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => setIsBuilderOpen(true)}
                            style={{
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                borderRadius: '6px',
                                background: '#4f46e5',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                height: '34px',
                                boxShadow: '0 1px 3px rgba(79, 70, 229, 0.25)'
                            }}
                            title="관리자 전용: 현재 동적 화면 구성 편집 (기본정보, 그리드 컬럼, 검색필드, 메뉴위치)"
                        >
                            <span>⚙️</span>
                            <span>화면 편집기</span>
                        </button>
                    )}
                </div>
            </div>


            {/* 대시보드 영역 */}
            {showDashboard && (
                <DynamicDashboardView
                    dashboard={dashboard}
                    rowData={rowData}
                    onRegenerate={handleRegenerateDashboard}
                    isRegenerating={isRegenerating}
                />
            )}

            {/* 동적 검색 필터바 */}
            <DynamicFilterBar
                searchFields={meta.searchFields || []}
                filterValues={filterValues}
                onFilterChange={setFilterValues}
                onSearch={handleSearch}
                onReset={handleReset}
            />

            {/* AG Grid Notion형 데이터 테이블 (행 더블클릭 시 상세 드로어 오픈) */}
            <DynamicGrid
                columns={meta.gridColumns || []}
                userViews={meta.userViews || []}
                rowData={rowData}
                loading={loading}
                enableRowSelection={meta.screen?.enableRowSelection}
                rowSelectionMode={meta.screen?.rowSelectionMode}
                onRowDoubleClicked={handleRowDoubleClick}
            />

            {/* 그리드 컬럼 기반 자동 데이터 등록 모달 */}
            <DynamicFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                columns={meta.gridColumns || []}
                subPage={meta.subPage}
                onSave={handleCreateData}
                loading={isSavingData}
            />

            {/* 행 더블클릭 품목코드 스타일 상세정보 드로어 */}
            <DynamicDetailDrawer
                isOpen={isDetailDrawerOpen}
                onClose={() => {
                    setIsDetailDrawerOpen(false);
                    setSelectedRow(null);
                }}
                rowData={selectedRow}
                columns={meta.gridColumns || []}
                screenName={meta.screen?.screenName || '동적 데이터'}
                onSave={handleUpdateData}
                loading={isSavingData}
            />

            {/* 관리자용 동적 화면 편집 모달 */}
            {isAdmin && (
                <ScreenBuilderModal
                    isOpen={isBuilderOpen}
                    onClose={() => setIsBuilderOpen(false)}
                    mode="edit"
                    screenMeta={meta}
                    onSuccess={(updatedScreen) => {
                        toast.success('화면 구성이 성공적으로 수정되었습니다.');
                        loadMeta();
                        window.dispatchEvent(new CustomEvent('dynamic-menu-updated', { detail: updatedScreen }));
                    }}
                />
            )}
        </div>

    );
};

export default DynamicScreenRenderer;
