import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from './api';
import AnalyticsDashboardShell from './components/dashboard/AnalyticsDashboardShell';
import SummaryCardRow from './components/dashboard/SummaryCardRow';
import DashboardFilterBar from './components/dashboard/DashboardFilterBar';
import StatusBadgeRenderer from './components/dashboard/StatusBadgeRenderer';
import DashboardDataTable from './components/dashboard/DashboardDataTable';
import EmptyState from './components/dashboard/EmptyState';
import ProductSearchPopup from './ProductSearchPopup';
import useDateRangePreset from './hooks/useDateRangePreset';
import { toast } from 'react-toastify';
import { Box, Button, TextField, Modal, Typography, IconButton, Checkbox, FormControlLabel } from '@mui/material';

export default function DocumentRequestManagementPage({ user, onNavigateToConfig }) {
    const [requirements, setRequirements] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    // 표준 필터 상태 (기본 오늘 ~ 1년 설정)
    const todayStr = new Date().toISOString().split('T')[0];
    const nextYearDate = new Date();
    nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
    const nextYearStr = nextYearDate.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(nextYearStr);
    const [itemCode, setItemCode] = useState('');
    const [productName, setProductName] = useState('');
    const [manufacturer, setManufacturer] = useState('');
    const [status, setStatus] = useState('');
    const [scope, setScope] = useState('');

    // 팝업 모달 상태
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);

    // 마스터 행 확장 토글 상태 (masterItemCode: boolean)
    const [expandedMasters, setExpandedMasters] = useState({});

    // 선택 재발송 체크박스 상태 (masterKey -> requirementId[])
    const [selectedDocIds, setSelectedDocIds] = useState({});

    // 재발송 팝업 모달 상태
    const [batchTarget, setBatchTarget] = useState(null); // { masterName, masterCode, email, reqIds: [] }
    const [recipientEmail, setRecipientEmail] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const { renderPresetButtons } = useDateRangePreset(setStartDate, setEndDate);
    const isManufacturerRole = user?.role === 'ROLE_MANUFACTURER' || user?.role === 'MANUFACTURER';

    useEffect(() => {
        window.__QMS_ACTIVE_PAGE__ = '📋 필수 품질서류 관리 대시보드';
        fetchRequirements();
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/api/products?size=1000');
            if (res.data && res.data.content) {
                setAllProducts(res.data.content);
            } else if (Array.isArray(res.data)) {
                setAllProducts(res.data);
            }
        } catch (err) {
            console.error("전체 품목 로드 실패:", err);
        }
    };

    const fetchRequirements = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (startDate) queryParams.append('startDate', startDate);
            if (endDate) queryParams.append('endDate', endDate);
            if (itemCode) queryParams.append('itemCode', itemCode);
            if (productName) queryParams.append('productName', productName);
            if (manufacturer && !isManufacturerRole) queryParams.append('manufacturer', manufacturer);
            if (status) queryParams.append('status', status);
            if (scope) queryParams.append('scope', scope);
            queryParams.append('page', '0');
            queryParams.append('size', '500');

            const response = await api.get(`/api/document-requests?${queryParams.toString()}`);
            const data = response.data;
            if (data && data.content) {
                setRequirements(data.content || []);
            } else if (Array.isArray(data)) {
                setRequirements(data);
            } else {
                setRequirements([]);
            }
        } catch (err) {
            console.error("품질서류 요구사항 조회 실패:", err);
            toast.error("데이터를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, itemCode, productName, manufacturer, status, scope, isManufacturerRole]);

    const handleSearchSubmit = () => {
        fetchRequirements();
    };

    const handleReset = () => {
        setStartDate('');
        setEndDate('');
        setItemCode('');
        setProductName('');
        setManufacturer('');
        setStatus('');
        setScope('');
        setTimeout(() => {
            fetchRequirements();
        }, 50);
    };

    // 서류 종류 정보 반환 유틸
    const getDocumentInfo = (req) => {
        let name = "서류";
        let cycle = "일반";
        if (req.documentEnumType) {
            switch (req.documentEnumType) {
                case 'COA':
                    name = "시험성적서 (COA)";
                    cycle = "입고 건마다";
                    break;
                case 'MSDS':
                    name = "MSDS (물질안전보건자료)";
                    cycle = "1년마다";
                    break;
                case 'MANUFACTURING_PROCESS_CHART':
                    name = "제조공정도";
                    cycle = "최초 1회";
                    break;
                case 'PRODUCT_STANDARD':
                    name = "제품표준서";
                    cycle = "최초 1회";
                    break;
                case 'STABILITY_TEST':
                    name = "안정성테스트보고서";
                    cycle = "최초 1회";
                    break;
                default:
                    name = req.documentEnumType;
            }
        } else if (req.customDocumentType) {
            name = req.customDocumentType.name || "커스텀 서류";
            cycle = req.customDocumentType.cycleMonths ? `${req.customDocumentType.cycleMonths}개월마다` : "최초 1회";
        }
        return { name, cycle };
    };

    // 마스터 품목별 서류 요구조건 그룹핑
    const groupedMasterRequirements = useMemo(() => {
        const map = {};

        requirements.forEach(req => {
            let key = "MANUFACTURER_GENERAL";
            let masterInfo = {
                key,
                isManufacturerScope: true,
                title: req.manufacturer ? req.manufacturer.name : "제조처 공통",
                subTitle: "제조처 단위 공통 요구서류",
                email: req.manufacturer ? req.manufacturer.email : "",
                requirements: []
            };

            if (req.product) {
                key = req.product.itemCode;
                masterInfo = {
                    key,
                    isManufacturerScope: false,
                    title: req.product.productName,
                    subTitle: `품목코드: ${req.product.itemCode} (마스터 코드)`,
                    itemCode: req.product.itemCode,
                    email: req.product.manufacturerInfo ? req.product.manufacturerInfo.email : "",
                    manufacturerName: req.product.manufacturerInfo ? req.product.manufacturerInfo.name : "-",
                    requirements: []
                };
            }

            if (!map[key]) {
                map[key] = masterInfo;
            }
            map[key].requirements.push(req);
        });

        return Object.values(map);
    }, [requirements]);

    // 마스터 행에 매핑된 하위 상속 품목들 찾기
    const getChildProducts = (masterItemCode) => {
        if (!masterItemCode) return [];
        return allProducts.filter(p => p.parentItemCode === masterItemCode || (p.master && p.itemCode === masterItemCode));
    };

    const toggleMasterExpand = (key) => {
        setExpandedMasters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // 서류 선택 체크박스 핸들러
    const toggleDocSelection = (masterKey, docId) => {
        setSelectedDocIds(prev => {
            const list = prev[masterKey] || [];
            if (list.includes(docId)) {
                return { ...prev, [masterKey]: list.filter(id => id !== docId) };
            } else {
                return { ...prev, [masterKey]: [...list, docId] };
            }
        });
    };

    const toggleSelectAllDoc = (masterKey, reqs) => {
        const currentSelected = selectedDocIds[masterKey] || [];
        if (currentSelected.length === reqs.length) {
            setSelectedDocIds(prev => ({ ...prev, [masterKey]: [] }));
        } else {
            setSelectedDocIds(prev => ({ ...prev, [masterKey]: reqs.map(r => r.id) }));
        }
    };

    // 일괄 재발송 모달 열기
    const openBatchReRequestModal = (masterGroup) => {
        const reqIds = selectedDocIds[masterGroup.key] || [];
        if (reqIds.length === 0) {
            toast.warning("재발송할 서류를 1개 이상 선택해 주십시오.");
            return;
        }

        setBatchTarget({
            masterName: masterGroup.title,
            masterCode: masterGroup.itemCode,
            reqIds
        });
        setRecipientEmail(masterGroup.email || '');
        setShowPreviewModal(true);
    };

    // 일괄 이메일 전송 API 호출
    const handleSendBatchRequest = async () => {
        if (!recipientEmail || !recipientEmail.includes('@')) {
            toast.error("올바른 이메일 주소를 입력해 주십시오.");
            return;
        }

        setPreviewLoading(true);
        try {
            await api.post('/api/document-requests/batch-re-request', {
                requirementIds: batchTarget.reqIds,
                recipientEmail
            });
            toast.success(`선택된 ${batchTarget.reqIds.length}건의 서류 재발송 요청이 발송되었습니다.`);
            setShowPreviewModal(false);
            fetchRequirements(); // 상태 갱신
        } catch (err) {
            console.error("일괄 재발송 실패:", err);
            toast.error("일괄 재발송 요청 처리에 실패했습니다.");
        } finally {
            setPreviewLoading(false);
        }
    };

    // 마스터 서류 요구조건 전체 동기화 API 호출
    const handleSyncMasters = async () => {
        setLoading(true);
        try {
            const res = await api.post('/api/document-requests/sync-masters');
            toast.success(res.data?.message || "마스터 서류 요구사항 동기화가 완료되었습니다.");
            fetchRequirements();
        } catch (err) {
            console.error("마스터 서류 동기화 실패:", err);
            toast.error("마스터 서류 요구사항 동기화 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // 개별 서류 제출기한 수동 변경 API 호출
    const handleUpdateDueDate = async (reqId, newDueDate) => {
        try {
            await api.put(`/api/document-requests/${reqId}/due-date`, { dueDate: newDueDate });
            toast.success("제출 기한이 수정되었습니다.");
            fetchRequirements();
            if (selectedMasterDetail) {
                setSelectedMasterDetail(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        items: prev.items.map(it => it.id === reqId ? { ...it, nextDueDate: newDueDate } : it)
                    };
                });
            }
        } catch (err) {
            console.error("기한 변경 실패:", err);
            toast.error("제출 기한 수정에 실패했습니다.");
        }
    };

    // 서류 변경 이력 팝업 모달 상태
    const [historyModalData, setHistoryModalData] = useState(null);

    const handleViewHistory = async (reqId, reqTitle) => {
        try {
            const res = await api.get(`/api/document-requests/${reqId}/histories`);
            setHistoryModalData({
                title: reqTitle,
                histories: res.data || []
            });
        } catch (err) {
            console.error("이력 로드 실패:", err);
            toast.error("변경 이력을 불러오지 못했습니다.");
        }
    };

    // 요약 카드 통계
    const statsData = useMemo(() => {
        const total = requirements.length;
        const overdueCount = requirements.filter(r => r.status === 'OVERDUE').length;
        const productScopeCount = requirements.filter(r => r.productId != null).length;
        const mfgScopeCount = requirements.filter(r => r.manufacturerId != null).length;

        return [
            { label: "당월 주기적 자동발송 대상 서류", value: `${total} 건`, color: "#2563eb", icon: "📊" },
            { label: "제출 기한이 경과된 미회신 요청", value: `${overdueCount} 건`, color: "#dc2626", icon: "⚠️" },
            { label: "마스터 품목 연동 개별 품질서류", value: `${productScopeCount} 건`, color: "#059669", icon: "📦" },
            { label: "제조처 공통 품질 인증 및 서류", value: `${mfgScopeCount} 건`, color: "#7c3aed", icon: "🏭" }
        ];
    }, [requirements]);

    // 상세 보기 모달 상태
    const [selectedMasterDetail, setSelectedMasterDetail] = useState(null);

    // AG Grid 컬럼 구성
    const columnDefs = useMemo(() => [
        {
            headerName: "마스터 품목 / 코드",
            field: "productName",
            minWidth: 260,
            flex: 1.5,
            cellRenderer: (params) => {
                const data = params.data;
                if (!data) return null;
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px 0', lineHeight: '1.3' }}>
                        <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '13px' }}>
                            {data.isManufacturerScope ? `🏭 [제조처] ${data.productName}` : `📦 ${data.productName}`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>
                            {data.itemCode} | {data.manufacturerName}
                        </div>
                    </div>
                );
            }
        },
        {
            headerName: "MSDS",
            field: "msdsStatus",
            width: 120,
            cellRenderer: (params) => {
                const status = params.value;
                return <StatusBadgeRenderer value={status} />;
            }
        },
        {
            headerName: "제조공정도",
            field: "chartStatus",
            width: 120,
            cellRenderer: (params) => {
                const status = params.value;
                return <StatusBadgeRenderer value={status} />;
            }
        },
        {
            headerName: "제품표준서",
            field: "standardStatus",
            width: 120,
            cellRenderer: (params) => {
                const status = params.value;
                return <StatusBadgeRenderer value={status} />;
            }
        },
        {
            headerName: "안정성보고서",
            field: "stabilityStatus",
            width: 130,
            cellRenderer: (params) => {
                const status = params.value;
                return <StatusBadgeRenderer value={status} />;
            }
        },
        {
            headerName: "연동 SKU",
            field: "childCount",
            width: 110,
            cellRenderer: (params) => (
                <span style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: params.value > 0 ? '#e0f2fe' : '#f1f5f9',
                    color: params.value > 0 ? '#0369a1' : '#64748b'
                }}>
                    {params.value}개 SKU
                </span>
            )
        },
        {
            headerName: "상세 보기",
            field: "id",
            width: 110,
            cellRenderer: (params) => (
                <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setSelectedMasterDetail(params.data)}
                    sx={{ borderRadius: '6px', fontSize: '11px', padding: '2px 8px', fontWeight: 'bold' }}
                >
                    🔍 상세 보기
                </Button>
            )
        }
    ], []);

    // 마스터 1행 요약 데이타 변환
    const gridRows = useMemo(() => {
        return groupedMasterRequirements.map(group => {
            const childProds = getChildProducts(group.itemCode);
            const reqList = group.requirements || group.items || [];
            
            // 4개 필수 서류 상태 맵 추출
            const msdsReq = reqList.find(i => (i.documentEnumType || i.docType) === 'MSDS');
            const chartReq = reqList.find(i => (i.documentEnumType || i.docType) === 'MANUFACTURING_PROCESS_CHART');
            const standardReq = reqList.find(i => (i.documentEnumType || i.docType) === 'PRODUCT_STANDARD');
            const stabilityReq = reqList.find(i => (i.documentEnumType || i.docType) === 'STABILITY_TEST');
            const customReqs = reqList.filter(i => i.customDocumentTypeId || i.isCustom);

            return {
                id: group.key,
                groupKey: group.key,
                productName: group.productName,
                itemCode: group.itemCode,
                manufacturerName: group.manufacturerName,
                isManufacturerScope: group.isManufacturerScope,
                childCount: childProds.length,
                msdsStatus: msdsReq?.status || 'N/A',
                msdsDueDate: msdsReq?.nextDueDate || null,
                chartStatus: chartReq?.status || 'N/A',
                standardStatus: standardReq?.status || 'N/A',
                stabilityStatus: stabilityReq?.status || 'N/A',
                customCount: customReqs.length,
                items: reqList,
                childProds
            };
        });
    }, [groupedMasterRequirements, getChildProducts]);

    return (
        <AnalyticsDashboardShell
            title="📋 필수 품질서류 관리 대시보드"
            subtitle="마스터 품목 및 제조처별 요구 서류의 정기 발송 현황과 기한 미회신 내역을 통합 추적합니다."
            extraHeaderActions={
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {!isManufacturerRole && (
                        <>
                            <Button
                                variant="contained"
                                onClick={handleSyncMasters}
                                disabled={loading}
                                sx={{ backgroundColor: '#059669', borderRadius: '8px', textTransform: 'none', fontWeight: 'bold' }}
                            >
                                ⚡ 마스터 서류 일괄 동기화
                            </Button>
                        </>
                    )}
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (masterSummaryRows && masterSummaryRows.length > 0) {
                                openBatchPreviewModal(masterSummaryRows[0]);
                            } else {
                                toast.info("메일을 발송할 마스터 서류 항목이 존재하지 않습니다.");
                            }
                        }}
                        sx={{ backgroundColor: '#2563eb', borderRadius: '8px', textTransform: 'none', fontWeight: 'bold' }}
                    >
                        ✉️ 제조사 서류 요청 메일 발송
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            if (typeof onNavigateToConfig === 'function') {
                                onNavigateToConfig();
                            } else {
                                window.location.href = '/document-cycle-config';
                            }
                        }}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 'bold', borderColor: '#475569', color: '#475569' }}
                    >
                        ⚙️ 서류 갱신주기 및 D-Day 설정
                    </Button>
                </div>
            }
        >
            {/* 요약 카드리스트 */}
            <SummaryCardRow cards={statsData} />

            {/* 표준 검색 필터 바 */}
            <DashboardFilterBar onSearch={handleSearchSubmit} onReset={handleReset}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    {/* 상단 1줄: 날짜 및 프리셋 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>📅 조회 기한</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                            <span style={{ color: '#94a3b8' }}>~</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                        {renderPresetButtons()}
                    </div>

                    {/* 하단 2줄: 품목코드(돋보기), 품목명, 보조필터 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>📦 마스터 품목코드</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                    type="text"
                                    placeholder="품목코드..."
                                    value={itemCode}
                                    onChange={(e) => setItemCode(e.target.value)}
                                    style={{ padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '130px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsProductSearchOpen(true)}
                                    style={{
                                        padding: '7px 10px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1',
                                        borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                                    }}
                                    title="품목 검색 모달 열기"
                                >
                                    🔍
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>🏷️ 품목명</label>
                            <input
                                type="text"
                                placeholder="품목명 입력..."
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                style={{ padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '160px' }}
                            />
                        </div>

                        {!isManufacturerRole && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>🏭 제조처명</label>
                                <input
                                    type="text"
                                    placeholder="제조처명 입력..."
                                    value={manufacturer}
                                    onChange={(e) => setManufacturer(e.target.value)}
                                    style={{ padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '140px' }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>📌 서류 상태</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                style={{ padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                            >
                                <option value="">전체 상태</option>
                                <option value="PENDING">대기 (PENDING)</option>
                                <option value="REQUESTED">요청완료 (REQUESTED)</option>
                                <option value="FULFILLED">제출완료 (FULFILLED)</option>
                                <option value="OVERDUE">기한초과 (OVERDUE)</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>🎯 요청 범위 (Scope)</label>
                            <select
                                value={scope}
                                onChange={(e) => setScope(e.target.value)}
                                style={{ padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                            >
                                <option value="">전체 범위</option>
                                <option value="PRODUCT">📦 품목 단위</option>
                                <option value="MANUFACTURER">🏭 제조사 단위 (공통)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </DashboardFilterBar>

            {/* AG Grid 1행 컴팩트 마스터 요약 테이블 뷰 */}
            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                    ⌛ 서류 요구사항 및 마스터 데이터를 로딩 중입니다...
                </div>
            ) : gridRows.length === 0 ? (
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '40px', textAlign: 'center' }}>
                    <EmptyState
                        icon="📋"
                        title="조회된 필수 품질서류 요구조건이 없습니다"
                        message="조건에 맞는 품질서류 내역이 없거나 아직 마스터 서류 요구조건이 자동 동기화되지 않았습니다."
                    />
                    {!isManufacturerRole && (
                        <Button
                            variant="contained"
                            onClick={handleSyncMasters}
                            disabled={loading}
                            sx={{ marginTop: '16px', backgroundColor: '#059669', borderRadius: '8px', fontWeight: 'bold' }}
                        >
                            ⚡ 기존 마스터 품목 서류 요구조건 전체 동기화 실행
                        </Button>
                    )}
                </div>
            ) : (
                <DashboardDataTable
                    rowData={gridRows}
                    columnDefs={columnDefs}
                    height="580px"
                    rowHeight={60}
                    paginationPageSize={20}
                />
            )}

            {/* 품목 돋보기 검색 팝업 모달 */}
            {isProductSearchOpen && (
                <ProductSearchPopup
                    onClose={() => setIsProductSearchOpen(false)}
                    onSelect={(prod) => {
                        setItemCode(prod.itemCode);
                        setIsProductSearchOpen(false);
                    }}
                />
            )}

            {/* 일괄 이메일 전송 팝업 모달 */}
            <Modal open={showPreviewModal} onClose={() => setShowPreviewModal(false)}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 520, bgcolor: 'background.paper', borderRadius: '16px', boxShadow: 24, p: 4, outline: 'none'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ✉️ 선택 서류 일괄 독촉 및 재발송
                        </Typography>
                        <IconButton size="small" onClick={() => setShowPreviewModal(false)}>✕</IconButton>
                    </div>

                    {batchTarget && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ marginBottom: '6px', fontWeight: 'bold', color: '#334155' }}>
                                    [요청 마스터]: {batchTarget.masterName} ({batchTarget.masterCode || '공통'})
                                </div>
                                <div style={{ color: '#2563eb', fontWeight: 'bold' }}>
                                    [선택된 서류 수]: 총 {batchTarget.reqIds.length}개 서류 항목
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#475569' }}>
                                    수신 이메일 주소 <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    placeholder="제조처 담당자 이메일 입력..."
                                />
                            </div>

                            <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', color: '#0369a1', fontSize: '12px', lineHeight: '1.5' }}>
                                ℹ️ [일괄 발송 안내] 지정한 {batchTarget.reqIds.length}개의 선택 서류가 단 1회의 1회성 링크가 포함된 이메일로 묶여서 발송됩니다.
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => setShowPreviewModal(false)}
                                    disabled={previewLoading}
                                    sx={{ borderRadius: '8px' }}
                                >
                                    취소
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={handleSendBatchRequest}
                                    disabled={previewLoading}
                                    sx={{ backgroundColor: '#2563eb', borderRadius: '8px', fontWeight: 'bold' }}
                                >
                                    {previewLoading ? '발송 중...' : '✉️ 선택 서류 일괄 전송'}
                                </Button>
                            </div>
                        </div>
                    )}
                </Box>
            </Modal>
            {/* 마스터 품목 서류 상세 현황 및 하위 상속 SKU 조망 모달 */}
            <Modal open={Boolean(selectedMasterDetail)} onClose={() => setSelectedMasterDetail(null)}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 660, bgcolor: 'background.paper', borderRadius: '16px', boxShadow: 24, p: 4, maxHeight: '85vh', overflowY: 'auto', outline: 'none'
                }}>
                    {selectedMasterDetail && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                                        📦 {selectedMasterDetail.productName} ({selectedMasterDetail.itemCode})
                                    </Typography>
                                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                                        제조처: <strong>{selectedMasterDetail.manufacturerName}</strong>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => openBatchPreviewModal(selectedMasterDetail)}
                                        sx={{ backgroundColor: '#2563eb', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}
                                    >
                                        ✉️ 제조사 서류 요청 메일 발송
                                    </Button>
                                    <IconButton size="small" onClick={() => setSelectedMasterDetail(null)}>✕</IconButton>
                                </div>
                            </div>

                            {/* 연동 필수 품질 서류 리스트 */}
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#334155', mb: 1.5 }}>
                                📑 연동 필수 품질 서류 요구조건 상세 ({selectedMasterDetail.items.length}개)
                            </Typography>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                                {selectedMasterDetail.items.map(item => {
                                    const { name, cycle } = getDocumentInfo(item);
                                    return (
                                        <div key={item.id} style={{
                                            padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e293b' }}>{name}</div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>주기: {cycle}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 'bold' }}>📅 기한:</span>
                                                    <input
                                                        type="date"
                                                        value={item.nextDueDate || ''}
                                                        onChange={(e) => handleUpdateDueDate(item.id, e.target.value)}
                                                        style={{ padding: '3px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                                                    />
                                                </div>
                                                <StatusBadgeRenderer value={item.status} />
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => handleViewHistory(item.id, name)}
                                                    sx={{ borderRadius: '6px', fontSize: '10px', padding: '1px 6px', color: '#64748b' }}
                                                >
                                                    📜 이력
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 하위 상속 SKU 리스트 */}
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#334155', mb: 1.5 }}>
                                🔗 하위 연동 상속 SKU 품목 목록 ({selectedMasterDetail.childProds.length}개)
                            </Typography>
                            {selectedMasterDetail.childProds.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#94a3b8', padding: '16px', textAlign: 'center', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                                    하위 연동 상속 SKU 품목이 존재하지 않습니다.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {selectedMasterDetail.childProds.map(child => (
                                        <div key={child.id} style={{
                                            padding: '6px 14px', borderRadius: '16px', backgroundColor: '#e0f2fe',
                                            color: '#0369a1', fontSize: '12px', fontWeight: 'bold'
                                        }}>
                                            📦 {child.productName} ({child.itemCode})
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <Button variant="contained" onClick={() => setSelectedMasterDetail(null)} sx={{ borderRadius: '8px', fontWeight: 'bold' }}>
                                    닫기
                                </Button>
                            </div>
                        </>
                    )}
                </Box>
            </Modal>
            {/* 서류 변경 및 제출 이력 타임라인 모달 */}
            <Modal open={Boolean(historyModalData)} onClose={() => setHistoryModalData(null)}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 580, bgcolor: 'background.paper', borderRadius: '16px', boxShadow: 24, p: 4, maxHeight: '80vh', overflowY: 'auto', outline: 'none'
                }}>
                    {historyModalData && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                                    📜 [{historyModalData.title}] 제출/변경 이력 타임라인
                                </Typography>
                                <IconButton size="small" onClick={() => setHistoryModalData(null)}>✕</IconButton>
                            </div>

                            {historyModalData.histories.length === 0 ? (
                                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                    등록된 제출 이력이 없습니다.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {historyModalData.histories.map(h => (
                                        <div key={h.id} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e293b' }}>
                                                    📄 {h.fileName || '서류 파일'}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                    업로더: <strong>{h.uploadedBy}</strong> | 일시: {h.uploadedAt ? h.uploadedAt.replace("T", " ").substring(0, 16) : '-'}
                                                </div>
                                                {h.changeReason && (
                                                    <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px' }}>
                                                        사유: {h.changeReason}
                                                    </div>
                                                )}
                                            </div>
                                            <StatusBadgeRenderer value={h.status} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <Button variant="contained" onClick={() => setHistoryModalData(null)} sx={{ borderRadius: '8px' }}>
                                    닫기
                                </Button>
                            </div>
                        </>
                    )}
                </Box>
            </Modal>
        </AnalyticsDashboardShell>
    );
}
