import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { toast } from 'react-toastify';
import RegulatoryManualBanner from './components/common/RegulatoryManualBanner';
import {
    fetchTraceabilityKpis,
    fetchTraceabilityBatches,
    createTraceabilityBatch,
    updateTraceabilityBatch,
    deleteTraceabilityBatch,
    fetchTraceabilityLinks,
    createTraceabilityLink,
    deleteTraceabilityLink,
    fetchBidirectionalTraceability,
    fetchExternalIntegrationLogs,
    createExternalIntegrationLog,
    reconcileIntegrationLog,
    fetchBarcodeRecords,
    issueBarcodeRecord,
    incrementBarcodePrint
} from './api';

// =========================================================================
// 1. 공통 상수 및 뱃지 스타일 헬퍼
// =========================================================================

const BATCH_STAGES = [
    { value: 'RAW_MATERIAL', label: '원자재 (Raw Material)', color: '#6366f1', bg: '#e0e7ff', icon: '🧪' },
    { value: 'PACKAGING', label: '포장재 (Packaging)', color: '#8b5cf6', bg: '#ede9fe', icon: '📦' },
    { value: 'BULK_PRODUCT', label: '반제품/벌크 (Bulk Product)', color: '#0ea5e9', bg: '#e0f2fe', icon: '⚗️' },
    { value: 'FINISHED_GOODS', label: '완제품 (Finished Goods)', color: '#10b981', bg: '#d1fae5', icon: '✨' },
    { value: 'SHIPMENT', label: '출하/유통 (Shipment)', color: '#3b82f6', bg: '#dbeafe', icon: '🚚' }
];

const QUALITY_STATUSES = [
    { value: 'QUARANTINE', label: '보관/검사중', color: '#f59e0b', bg: '#fef3c7' },
    { value: 'PASSED', label: '적합 (승인)', color: '#10b981', bg: '#d1fae5' },
    { value: 'REJECTED', label: '부적합 (폐기)', color: '#ef4444', bg: '#fee2e2' },
    { value: 'RELEASED', label: '출하승인', color: '#3b82f6', bg: '#dbeafe' },
    { value: 'RECALLED', label: '회수/격리', color: '#8b5cf6', bg: '#ede9fe' }
];

const INTEGRATION_SYSTEMS = [
    { value: 'ERP', label: 'ERP (SAP/더존)' },
    { value: 'WMS', label: 'WMS (물류창고관리)' },
    { value: 'MES', label: 'MES (제조실행시스템)' },
    { value: 'BARCODE_SYSTEM', label: '바코드/UDI 시스템' }
];

const INTERFACE_TYPES = [
    { value: 'INBOUND_LOT_SYNC', label: '입고 LOT 동기화' },
    { value: 'PRODUCTION_LOT_SYNC', label: '생산 실적 연동' },
    { value: 'OUTBOUND_SHIPMENT_SYNC', label: '출하 실적 연동' },
    { value: 'INVENTORY_RECONCILIATION', label: '재고 수기 대사' }
];

const BARCODE_TYPES = [
    { value: 'GS1_128', label: 'GS1-128 (1D 바코드)' },
    { value: 'DATA_MATRIX', label: 'GS1 DataMatrix (2D UDI 표준)' },
    { value: 'QR_CODE', label: 'QR Code (2D)' },
    { value: 'CODE_128', label: 'Code 128 (공정 식별)' }
];

export default function TraceabilityManagementPage({ user, onNavigate }) {
    // 탭 상태: 0=양방향 추적성 매트릭스, 1=배치/LOT 마스터, 2=외부연계 및 수기 대사, 3=바코드/UDI 식별
    const [activeTab, setActiveTab] = useState(0);

    // KPI 상태
    const [kpi, setKpi] = useState({
        totalBatches: 0,
        finishedGoodsBatches: 0,
        rawMaterialBatches: 0,
        traceabilityIntegrityRate: 0,
        integrationSuccessRate: 100,
        pendingReconciliationCount: 0
    });

    // 배치/LOT 마스터 데이터
    const [batches, setBatches] = useState([]);
    const [batchesLoading, setBatchesLoading] = useState(false);
    const [batchFilter, setBatchFilter] = useState({
        keyword: '',
        batchStage: '',
        qualityStatus: ''
    });

    // 양방향 추적성 매트릭스 상태
    const [selectedBatchNumber, setSelectedBatchNumber] = useState('');
    const [traceDirection, setTraceDirection] = useState('BOTH'); // FORWARD, BACKWARD, BOTH
    const [traceMatrixData, setTraceMatrixData] = useState(null);
    const [traceLoading, setTraceLoading] = useState(false);

    // 외부연계 로그 데이터
    const [integrationLogs, setIntegrationLogs] = useState([]);
    const [integrationLoading, setIntegrationLoading] = useState(false);
    const [integrationFilter, setIntegrationFilter] = useState({
        keyword: '',
        systemType: '',
        status: ''
    });

    // 바코드 레코드 데이터
    const [barcodes, setBarcodes] = useState([]);
    const [barcodesLoading, setBarcodesLoading] = useState(false);
    const [barcodeFilter, setBarcodeFilter] = useState({
        keyword: '',
        barcodeType: '',
        status: ''
    });

    // 모달 상태 4종
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null);

    const [traceReportModalOpen, setTraceReportModalOpen] = useState(false);

    const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
    const [selectedReconcileLog, setSelectedReconcileLog] = useState(null);

    const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
    const [selectedBarcodeForPrint, setSelectedBarcodeForPrint] = useState(null);

    const [externalSyncModalOpen, setExternalSyncModalOpen] = useState(false);

    // =========================================================================
    // 2. 데이터 조회 함수
    // =========================================================================

    const loadKpis = useCallback(async () => {
        try {
            const data = await fetchTraceabilityKpis();
            if (data) setKpi(data);
        } catch (err) {
            console.error('Failed to load traceability KPIs:', err);
        }
    }, []);

    const loadBatches = useCallback(async () => {
        setBatchesLoading(true);
        try {
            const params = {
                page: 0,
                size: 200,
                keyword: batchFilter.keyword || undefined,
                batchStage: batchFilter.batchStage || undefined,
                qualityStatus: batchFilter.qualityStatus || undefined
            };
            const res = await fetchTraceabilityBatches(params);
            const content = res?.content || res || [];
            setBatches(content);

            // 초기 선택 배치가 없으면 첫 번째 완제품 또는 첫 번째 배치 자동 선택
            if (!selectedBatchNumber && content.length > 0) {
                const fg = content.find(b => b.batchStage === 'FINISHED_GOODS') || content[0];
                setSelectedBatchNumber(fg.batchNumber);
            }
        } catch (err) {
            toast.error('배치 목록을 불러오지 못했습니다.');
        } finally {
            setBatchesLoading(false);
        }
    }, [batchFilter, selectedBatchNumber]);

    const loadTraceMatrix = useCallback(async (batchNum, dir) => {
        if (!batchNum) return;
        setTraceLoading(true);
        try {
            const data = await fetchBidirectionalTraceability(batchNum, dir);
            setTraceMatrixData(data);
        } catch (err) {
            console.error('Failed to load traceability matrix:', err);
            toast.error('양방향 추적성 데이터를 조회하지 못했습니다.');
        } finally {
            setTraceLoading(false);
        }
    }, []);

    const loadIntegrationLogs = useCallback(async () => {
        setIntegrationLoading(true);
        try {
            const params = {
                page: 0,
                size: 100,
                keyword: integrationFilter.keyword || undefined,
                systemType: integrationFilter.systemType || undefined,
                status: integrationFilter.status || undefined
            };
            const res = await fetchExternalIntegrationLogs(params);
            setIntegrationLogs(res?.content || res || []);
        } catch (err) {
            console.error('Failed to load integration logs:', err);
        } finally {
            setIntegrationLoading(false);
        }
    }, [integrationFilter]);

    const loadBarcodes = useCallback(async () => {
        setBarcodesLoading(true);
        try {
            const params = {
                page: 0,
                size: 100,
                keyword: barcodeFilter.keyword || undefined,
                barcodeType: barcodeFilter.barcodeType || undefined,
                status: barcodeFilter.status || undefined
            };
            const res = await fetchBarcodeRecords(params);
            setBarcodes(res?.content || res || []);
        } catch (err) {
            console.error('Failed to load barcodes:', err);
        } finally {
            setBarcodesLoading(false);
        }
    }, [barcodeFilter]);

    useEffect(() => {
        loadKpis();
        loadBatches();
    }, [loadKpis, loadBatches]);

    useEffect(() => {
        if (selectedBatchNumber) {
            loadTraceMatrix(selectedBatchNumber, traceDirection);
        }
    }, [selectedBatchNumber, traceDirection, loadTraceMatrix]);

    useEffect(() => {
        if (activeTab === 2) loadIntegrationLogs();
        if (activeTab === 3) loadBarcodes();
    }, [activeTab, loadIntegrationLogs, loadBarcodes]);

    // =========================================================================
    // 3. AG Grid 컬럼 정의
    // =========================================================================

    const batchColumnDefs = useMemo(() => [
        {
            headerName: '배치(LOT) 번호',
            field: 'batchNumber',
            width: 170,
            pinned: 'left',
            cellRenderer: p => (
                <span style={{ fontWeight: 800, color: '#1e40af', cursor: 'pointer' }}
                      onClick={() => {
                          setSelectedBatchNumber(p.value);
                          setActiveTab(0);
                      }}>
                    🔍 {p.value}
                </span>
            )
        },
        {
            headerName: '공정 단계',
            field: 'batchStage',
            width: 150,
            cellRenderer: p => {
                const conf = BATCH_STAGES.find(s => s.value === p.value) || { label: p.value, color: '#475569', bg: '#f1f5f9', icon: '🔹' };
                return (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', borderRadius: '9999px',
                        fontSize: '12px', fontWeight: 700,
                        backgroundColor: conf.bg, color: conf.color
                    }}>
                        <span>{conf.icon}</span> {conf.label.split(' ')[0]}
                    </span>
                );
            }
        },
        { headerName: '품목코드', field: 'itemCode', width: 130 },
        { headerName: '품목명', field: 'itemName', width: 220, cellStyle: { fontWeight: 600 } },
        { headerName: '규격/사양', field: 'specification', width: 180 },
        {
            headerName: '보유/잔여수량',
            field: 'quantity',
            width: 140,
            cellRenderer: p => (
                <span style={{ fontWeight: 700 }}>
                    {p.data?.remainingQuantity?.toLocaleString()} / {p.value?.toLocaleString()} {p.data?.unit}
                </span>
            )
        },
        {
            headerName: '품질상태',
            field: 'qualityStatus',
            width: 130,
            cellRenderer: p => {
                const conf = QUALITY_STATUSES.find(s => s.value === p.value) || { label: p.value, color: '#475569', bg: '#f1f5f9' };
                return (
                    <span style={{
                        padding: '4px 10px', borderRadius: '9999px',
                        fontSize: '12px', fontWeight: 700,
                        backgroundColor: conf.bg, color: conf.color
                    }}>
                        ● {conf.label}
                    </span>
                );
            }
        },
        { headerName: '제조일자', field: 'manufacturingDate', width: 120 },
        { headerName: '유효기한', field: 'expirationDate', width: 120 },
        { headerName: '공급처/제조원', field: 'supplierOrManufacturer', width: 180 },
        { headerName: '보관위치', field: 'storageLocation', width: 130 },
        {
            headerName: '관리',
            pinned: 'right',
            width: 180,
            cellRenderer: p => (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => {
                            setSelectedBatchNumber(p.data.batchNumber);
                            setActiveTab(0);
                        }}
                        style={{
                            padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                            backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'pointer'
                        }}>
                        🌐 추적
                    </button>
                    <button
                        onClick={() => {
                            setEditingBatch(p.data);
                            setBatchModalOpen(true);
                        }}
                        style={{
                            padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                            backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', cursor: 'pointer'
                        }}>
                        ✏️ 수정
                    </button>
                    <button
                        onClick={() => handleDeleteBatch(p.data.id, p.data.batchNumber)}
                        style={{
                            padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                            backgroundColor: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', cursor: 'pointer'
                        }}>
                        🗑️
                    </button>
                </div>
            )
        }
    ], []);

    const integrationColumnDefs = useMemo(() => [
        { headerName: '연동 로그번호', field: 'logNumber', width: 160, pinned: 'left', cellStyle: { fontWeight: 700, color: '#1e40af' } },
        {
            headerName: '연계 시스템',
            field: 'systemType',
            width: 140,
            cellRenderer: p => {
                const conf = INTEGRATION_SYSTEMS.find(s => s.value === p.value) || { label: p.value };
                return <span style={{ fontWeight: 700 }}>🖥️ {conf.label.split(' ')[0]}</span>;
            }
        },
        {
            headerName: '인터페이스 유형',
            field: 'interfaceType',
            width: 160,
            cellRenderer: p => {
                const conf = INTERFACE_TYPES.find(s => s.value === p.value) || { label: p.value };
                return <span style={{ fontSize: '13px' }}>{conf.label}</span>;
            }
        },
        { headerName: '전송 방식', field: 'transferProtocolDesc', width: 140 },
        {
            headerName: '상태',
            field: 'status',
            width: 130,
            cellRenderer: p => {
                const isSuccess = p.value === 'SUCCESS' || p.value === 'RECONCILED';
                const isPending = p.value === 'PENDING';
                const bg = isSuccess ? '#d1fae5' : isPending ? '#fef3c7' : '#fee2e2';
                const col = isSuccess ? '#059669' : isPending ? '#d97706' : '#dc2626';
                return (
                    <span style={{
                        padding: '4px 10px', borderRadius: '9999px',
                        fontSize: '12px', fontWeight: 700, backgroundColor: bg, color: col
                    }}>
                        ● {p.data?.statusDesc || p.value}
                    </span>
                );
            }
        },
        { headerName: '대상 배치', field: 'targetBatchNumber', width: 160, cellStyle: { fontWeight: 600 } },
        { headerName: '연동 건수', field: 'recordCount', width: 100, cellRenderer: p => (p.value?.toLocaleString() || '1') },
        {
            headerName: '차이(불일치)',
            field: 'discrepancyCount',
            width: 120,
            cellRenderer: p => (
                <span style={{ fontWeight: 800, color: p.value > 0 ? '#dc2626' : '#059669' }}>
                    {p.value > 0 ? `⚠️ ${p.value} EA` : '0 EA'}
                </span>
            )
        },
        { headerName: '대사 승인자', field: 'reconciledBy', width: 120 },
        { headerName: '대사 일시', field: 'reconciledAt', width: 160 },
        {
            headerName: '수기 대사',
            pinned: 'right',
            width: 140,
            cellRenderer: p => (
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    {p.data.status === 'PENDING' ? (
                        <button
                            onClick={() => {
                                setSelectedReconcileLog(p.data);
                                setReconcileModalOpen(true);
                            }}
                            style={{
                                padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                                backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', cursor: 'pointer'
                            }}>
                            ⚖️ 대사 승인
                        </button>
                    ) : (
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>대사 완료</span>
                    )}
                </div>
            )
        }
    ], []);

    const barcodeColumnDefs = useMemo(() => [
        { headerName: '바코드 / UDI 식별값', field: 'barcodeValue', width: 260, pinned: 'left', cellStyle: { fontWeight: 700, color: '#0f172a' } },
        {
            headerName: '규격 유형',
            field: 'barcodeType',
            width: 160,
            cellRenderer: p => {
                const conf = BARCODE_TYPES.find(b => b.value === p.value) || { label: p.value };
                return <span style={{ fontWeight: 600 }}>🏷️ {conf.label}</span>;
            }
        },
        { headerName: '연계 배치(LOT)', field: 'batchNumber', width: 160, cellStyle: { fontWeight: 700, color: '#1d4ed8' } },
        { headerName: 'GTIN (01)', field: 'gtin', width: 140 },
        { headerName: '유효기한 (17)', field: 'expirationDateString', width: 110 },
        { headerName: '시리얼번호 (21)', field: 'serialNumber', width: 130 },
        {
            headerName: '인쇄 횟수',
            field: 'printCount',
            width: 100,
            cellRenderer: p => <span style={{ fontWeight: 700 }}>{p.value} 회</span>
        },
        {
            headerName: '상태',
            field: 'status',
            width: 110,
            cellRenderer: p => (
                <span style={{
                    padding: '4px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700,
                    backgroundColor: p.value === 'ACTIVE' ? '#d1fae5' : '#dbeafe',
                    color: p.value === 'ACTIVE' ? '#059669' : '#1d4ed8'
                }}>
                    {p.data?.statusDesc || p.value}
                </span>
            )
        },
        {
            headerName: '라벨 인쇄',
            pinned: 'right',
            width: 140,
            cellRenderer: p => (
                <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <button
                        onClick={() => {
                            setSelectedBarcodeForPrint(p.data);
                            setBarcodeModalOpen(true);
                        }}
                        style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                            backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'pointer'
                        }}>
                        🖨️ 라벨 인쇄
                    </button>
                </div>
            )
        }
    ], []);

    // =========================================================================
    // 4. 이벤트 핸들러
    // =========================================================================

    const handleDeleteBatch = async (id, batchNumber) => {
        if (!window.confirm(`배치 [${batchNumber}]을(를) 정말 삭제(Soft Delete)하시겠습니까?`)) return;
        try {
            await deleteTraceabilityBatch(id);
            toast.success(`배치 [${batchNumber}]이(가) 안전하게 삭제되었습니다.`);
            loadBatches();
            loadKpis();
        } catch (err) {
            toast.error('배치 삭제에 실패했습니다.');
        }
    };

    const handleBatchSaveSuccess = () => {
        setBatchModalOpen(false);
        setEditingBatch(null);
        loadBatches();
        loadKpis();
    };

    const handleReconcileSuccess = () => {
        setReconcileModalOpen(false);
        setSelectedReconcileLog(null);
        loadIntegrationLogs();
        loadKpis();
    };

    const handleBarcodeIssueSuccess = () => {
        setBarcodeModalOpen(false);
        setSelectedBarcodeForPrint(null);
        loadBarcodes();
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
            {/* 1. 3단계 표준 헤더 */}
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                padding: '20px 24px',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>🌐</span>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                                외부연계 및 양방향 추적성 관리 (Identification & Traceability)
                            </h1>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => {
                                loadKpis();
                                loadBatches();
                                if (selectedBatchNumber) loadTraceMatrix(selectedBatchNumber, traceDirection);
                                if (activeTab === 2) loadIntegrationLogs();
                                if (activeTab === 3) loadBarcodes();
                                toast.info('데이터를 최신 상태로 새로고침했습니다.');
                            }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                                backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer'
                            }}>
                            🔄 새로고침
                        </button>
                        <button
                            onClick={() => {
                                setEditingBatch(null);
                                setBatchModalOpen(true);
                            }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                                backgroundColor: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                            }}>
                            + 신규 배치(LOT) 등록
                        </button>
                    </div>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                    ISO 13485:2016 §7.5.8 / ISO 22716:2007 §8.3 / 21 CFR 820.65 규정에 부합하는 원자재 ➔ 벌크 ➔ 완제품 전공정 양방향 추적성 및 ERP/WMS 수기 대사(DEC-02), GS1 UDI 바코드 식별을 보증합니다.
                </div>
                <RegulatoryManualBanner pageKey="traceabilityManagement" />
            </div>

            {/* 2. 6 KPI 요약 카드 그리드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
            }}>
                <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>📦 총 관리 LOT</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{kpi.totalBatches.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>원료·포장재·벌크·완제품 전체</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>✨ 완제품/출하 LOT</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981' }}>{kpi.finishedGoodsBatches.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>시장 유통 및 출하 승인 배치</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>🧪 원료/부자재 LOT</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#6366f1' }}>{kpi.rawMaterialBatches.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>건</span></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>입고 검사 및 투입 대기 배치</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0ea5e9' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>🔗 양방향 추적 무결성</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#0ea5e9' }}>{kpi.traceabilityIntegrityRate} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>%</span></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>투입 링크 매핑 완료율</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>🔄 외부연계 성공률</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#8b5cf6' }}>{kpi.integrationSuccessRate} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>%</span></div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>ERP / WMS 인터페이스 정합률</div>
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>⚖️ 대사 요망/불일치</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: kpi.pendingReconciliationCount > 0 ? '#ef4444' : '#10b981' }}>
                        {kpi.pendingReconciliationCount.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>건</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>품질 책임자 수기 대사 대기</div>
                </div>
            </div>

            {/* 3. 상단 탭 네비게이션 */}
            <div style={{
                display: 'flex', gap: '8px', marginBottom: '16px',
                borderBottom: '2px solid #e2e8f0', paddingBottom: '8px'
            }}>
                {[
                    { id: 0, label: '🌐 LOT 양방향 추적성 매트릭스', icon: '🌐' },
                    { id: 1, label: '📦 배치 / LOT 마스터 관리', icon: '📦' },
                    { id: 2, label: '🔄 외부 연계 & 수기 대사 (ERP/WMS)', icon: '🔄' },
                    { id: 3, label: '🏷️ GS1 UDI 바코드 & QR 식별', icon: '🏷️' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                            backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                            color: activeTab === tab.id ? '#2563eb' : '#64748b',
                            border: activeTab === tab.id ? '1px solid #cbd5e1' : 'none',
                            boxShadow: activeTab === tab.id ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                            cursor: 'pointer', transition: 'all 0.2s ease'
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ========================================================================= */}
            {/* 탭 0: 양방향 추적성 매트릭스 (Bidirectional Traceability Matrix) */}
            {/* ========================================================================= */}
            {activeTab === 0 && (
                <div>
                    {/* 상단 타겟 LOT 선택 바 */}
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0',
                        padding: '18px 24px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap',
                        justifyContent: 'space-between', alignItems: 'center', gap: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '320px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                    🎯 기준 배치(LOT) 선택
                                </label>
                                <select
                                    value={selectedBatchNumber}
                                    onChange={e => setSelectedBatchNumber(e.target.value)}
                                    style={{
                                        padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                        fontSize: '14px', fontWeight: 700, color: '#1e40af', backgroundColor: '#f8fafc',
                                        minWidth: '280px'
                                    }}>
                                    <option value="">-- 기준 배치를 선택하세요 --</option>
                                    {batches.map(b => (
                                        <option key={b.id} value={b.batchNumber}>
                                            [{b.batchStageDesc}] {b.batchNumber} - {b.itemName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                    🧭 탐색 방향
                                </label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {[
                                        { val: 'BOTH', label: '양방향 전체 (전공정)' },
                                        { val: 'FORWARD', label: '정방향 (원료➔완제품)' },
                                        { val: 'BACKWARD', label: '역방향 (완제품➔원료)' }
                                    ].map(dir => (
                                        <button
                                            key={dir.val}
                                            onClick={() => setTraceDirection(dir.val)}
                                            style={{
                                                padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                                                backgroundColor: traceDirection === dir.val ? '#1e40af' : '#f1f5f9',
                                                color: traceDirection === dir.val ? '#ffffff' : '#475569',
                                                border: 'none', cursor: 'pointer'
                                            }}>
                                            {dir.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <button
                                onClick={() => setTraceReportModalOpen(true)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                                    backgroundColor: '#059669', color: '#ffffff', border: 'none', cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                                }}>
                                📄 전공정 추적성 검증 보고서 출력
                            </button>
                        </div>
                    </div>

                    {/* 추적 트리 시각화 패널 */}
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
                        padding: '24px', marginBottom: '16px', minHeight: '400px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                🌲 계층형 배치 투입/산출 트리 다이어그램
                            </h2>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                관련 배치 수: <strong style={{ color: '#2563eb' }}>{traceMatrixData?.totalRelatedBatches || 0}</strong>건 |
                                추적 커버리지: <strong style={{ color: '#059669' }}>{traceMatrixData?.traceabilityCoverageRate || 100}%</strong>
                            </div>
                        </div>

                        {traceLoading ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                                ⏳ 양방향 추적성 데이터를 탐색 중입니다...
                            </div>
                        ) : !traceMatrixData?.rootNode ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                                상단에서 기준 배치를 선택하시면 양방향 추적 계층 트리가 시각화됩니다.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <TraceTreeNodeView node={traceMatrixData.rootNode} onSelectBatch={setSelectedBatchNumber} isRoot />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 탭 1: 배치 / LOT 마스터 관리 */}
            {/* ========================================================================= */}
            {activeTab === 1 && (
                <div>
                    {/* 검색 필터 카드 */}
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0',
                        padding: '18px 24px', marginBottom: '16px'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                    🔍 검색어 (LOT번호, 품목명, 제조사)
                                </label>
                                <input
                                    type="text"
                                    placeholder="검색어 입력..."
                                    value={batchFilter.keyword}
                                    onChange={e => setBatchFilter({ ...batchFilter, keyword: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                    🏭 공정 단계
                                </label>
                                <select
                                    value={batchFilter.batchStage}
                                    onChange={e => setBatchFilter({ ...batchFilter, batchStage: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                                    <option value="">전체 공정 단계</option>
                                    {BATCH_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                    🧪 품질 상태
                                </label>
                                <select
                                    value={batchFilter.qualityStatus}
                                    onChange={e => setBatchFilter({ ...batchFilter, qualityStatus: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                                    <option value="">전체 품질 상태</option>
                                    {QUALITY_STATUSES.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                총 <strong style={{ color: '#2563eb' }}>{batches.length}</strong> 건의 배치가 조회되었습니다.
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => {
                                        setBatchFilter({ keyword: '', batchStage: '', qualityStatus: '' });
                                    }}
                                    style={{
                                        padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                                        backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', cursor: 'pointer'
                                    }}>
                                    ♻️ 초기화
                                </button>
                                <button
                                    onClick={loadBatches}
                                    style={{
                                        padding: '7px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                                        backgroundColor: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer'
                                    }}>
                                    🔍 조회
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* AG Grid 카드 */}
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
                        padding: '20px 24px', marginBottom: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                📋 배치 / LOT 마스터 목록
                            </h2>
                            <button
                                onClick={() => {
                                    setEditingBatch(null);
                                    setBatchModalOpen(true);
                                }}
                                style={{
                                    padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                                    backgroundColor: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer'
                                }}>
                                + 배치 등록
                            </button>
                        </div>
                        <div className="ag-theme-alpine" style={{ width: '100%', height: '520px' }}>
                            <AgGridReact
                                rowData={batches}
                                columnDefs={batchColumnDefs}
                                rowHeight={54}
                                headerHeight={48}
                                animateRows={true}
                                pagination={true}
                                paginationPageSize={10}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 탭 2: 외부 시스템 연동 및 수기 대사 (ERP/WMS Integration - DEC-02) */}
            {/* ========================================================================= */}
            {activeTab === 2 && (
                <div>
                    {/* 상단 알림 및 액션 바 */}
                    <div style={{
                        backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe',
                        padding: '16px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af', marginBottom: '2px' }}>
                                🔄 ERP / WMS 시스템 연동 및 불일치 수기 대사 (DEC-02 원칙 정합)
                            </div>
                            <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                                외부 창고 및 생산 실적 인터페이스를 실시간/배치 연계하며, 수량 불일치(Discrepancy) 발생 시 품질 책임자가 대사 승인합니다.
                            </div>
                        </div>
                        <button
                            onClick={() => setExternalSyncModalOpen(true)}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                                backgroundColor: '#1d4ed8', color: '#ffffff', border: 'none', cursor: 'pointer'
                            }}>
                            + 외부 연계 실행 (Sync)
                        </button>
                    </div>

                    {/* AG Grid 카드 */}
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
                        padding: '20px 24px', marginBottom: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                📑 외부 시스템 연동 및 수기 대사 이력 로그
                            </h2>
                        </div>
                        <div className="ag-theme-alpine" style={{ width: '100%', height: '520px' }}>
                            <AgGridReact
                                rowData={integrationLogs}
                                columnDefs={integrationColumnDefs}
                                rowHeight={54}
                                headerHeight={48}
                                animateRows={true}
                                pagination={true}
                                paginationPageSize={10}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 탭 3: GS1 UDI 바코드 및 QR 식별 (Barcode & Label) */}
            {/* ========================================================================= */}
            {activeTab === 3 && (
                <div>
                    {/* 상단 알림 및 액션 바 */}
                    <div style={{
                        backgroundColor: '#f5f3ff', borderRadius: '12px', border: '1px solid #ddd6fe',
                        padding: '16px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#5b21b6', marginBottom: '2px' }}>
                                🏷️ GS1 UDI 바코드 및 2D DataMatrix / QR 식별 체계
                            </div>
                            <div style={{ fontSize: '12px', color: '#7c3aed' }}>
                                21 CFR 820.65 / 820.120 규정에 따른 고유기기식별자(UDI: GTIN + LOT + 유효기한 + 시리얼)를 발행하고 라벨을 인쇄합니다.
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedBarcodeForPrint(null);
                                setBarcodeModalOpen(true);
                            }}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                                backgroundColor: '#6d28d9', color: '#ffffff', border: 'none', cursor: 'pointer'
                            }}>
                            + UDI 라벨 신규 발행
                        </button>
                    </div>

                    {/* AG Grid 카드 */}
                    <div style={{
                        backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
                        padding: '20px 24px', marginBottom: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                📋 UDI 바코드 발행 및 인쇄 이력
                            </h2>
                        </div>
                        <div className="ag-theme-alpine" style={{ width: '100%', height: '520px' }}>
                            <AgGridReact
                                rowData={barcodes}
                                columnDefs={barcodeColumnDefs}
                                rowHeight={54}
                                headerHeight={48}
                                animateRows={true}
                                pagination={true}
                                paginationPageSize={10}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 모달 1: 배치/LOT 등록 및 투입 관계 편성 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {batchModalOpen && (
                <BatchRegistrationModal
                    batch={editingBatch}
                    batches={batches}
                    onClose={() => {
                        setBatchModalOpen(false);
                        setEditingBatch(null);
                    }}
                    onSuccess={handleBatchSaveSuccess}
                />
            )}

            {/* ========================================================================= */}
            {/* 모달 2: 전공정 양방향 추적성 보고서 및 트리 뷰어 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {traceReportModalOpen && (
                <TraceabilityTreeModal
                    matrixData={traceMatrixData}
                    onClose={() => setTraceReportModalOpen(false)}
                />
            )}

            {/* ========================================================================= */}
            {/* 모달 3: 외부 시스템 수기 대사 승인 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {reconcileModalOpen && selectedReconcileLog && (
                <ExternalReconciliationModal
                    log={selectedReconcileLog}
                    onClose={() => {
                        setReconcileModalOpen(false);
                        setSelectedReconcileLog(null);
                    }}
                    onSuccess={handleReconcileSuccess}
                />
            )}

            {/* ========================================================================= */}
            {/* 모달 4: GS1 UDI 바코드 / QR 라벨 생성 및 인쇄 미리보기 모달 (96vw × 92vh) */}
            {/* ========================================================================= */}
            {barcodeModalOpen && (
                <BarcodeIssuanceModal
                    barcode={selectedBarcodeForPrint}
                    batches={batches}
                    onClose={() => {
                        setBarcodeModalOpen(false);
                        setSelectedBarcodeForPrint(null);
                    }}
                    onSuccess={handleBarcodeIssueSuccess}
                />
            )}

            {/* 모달 5: 외부 연계 실행 모달 */}
            {externalSyncModalOpen && (
                <ExternalSyncTriggerModal
                    batches={batches}
                    onClose={() => setExternalSyncModalOpen(false)}
                    onSuccess={() => {
                        setExternalSyncModalOpen(false);
                        loadIntegrationLogs();
                        loadKpis();
                    }}
                />
            )}
        </div>
    );
}

// =========================================================================
// 보조 컴포넌트: 계층형 배치 노드 뷰어 (TraceTreeNodeView)
// =========================================================================

function TraceTreeNodeView({ node, onSelectBatch, isRoot = false }) {
    if (!node) return null;

    const stageConf = BATCH_STAGES.find(s => s.value === node.batchStage) || { color: '#475569', bg: '#f1f5f9', icon: '🔹' };
    const statusConf = QUALITY_STATUSES.find(s => s.value === node.qualityStatus) || { color: '#475569', bg: '#f1f5f9' };

    return (
        <div style={{
            marginLeft: isRoot ? 0 : '32px',
            position: 'relative',
            paddingLeft: isRoot ? 0 : '16px',
            borderLeft: isRoot ? 'none' : '2px dashed #cbd5e1'
        }}>
            <div style={{
                backgroundColor: isRoot ? '#eff6ff' : '#ffffff',
                border: isRoot ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px 20px',
                boxShadow: isRoot ? '0 4px 6px rgba(59,130,246,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{stageConf.icon}</span>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                                fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                                backgroundColor: stageConf.bg, color: stageConf.color
                            }}>
                                {node.batchStageDesc}
                            </span>
                            <span style={{
                                fontSize: '16px', fontWeight: 800, color: '#1e40af', cursor: 'pointer'
                            }} onClick={() => onSelectBatch(node.batchNumber)}>
                                {node.batchNumber}
                            </span>
                            {isRoot && (
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#3b82f6', color: '#ffffff' }}>
                                    기준 배치
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                            {node.itemName} <span style={{ fontSize: '12px', color: '#64748b' }}>({node.itemCode})</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>투입/보유 수량</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                            {node.inputQuantity?.toLocaleString()} {node.unit}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>품질 상태</div>
                        <span style={{
                            fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '9999px',
                            backgroundColor: statusConf.bg, color: statusConf.color
                        }}>
                            ● {node.qualityStatusDesc}
                        </span>
                    </div>
                    {node.supplierOrManufacturer && (
                        <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '6px' }}>
                            제조/공급: <strong>{node.supplierOrManufacturer}</strong>
                        </div>
                    )}
                </div>
            </div>

            {/* 자식 노드 재귀 렌더링 */}
            {node.children && node.children.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {node.children.map((child, idx) => (
                        <TraceTreeNodeView key={idx} node={child} onSelectBatch={onSelectBatch} />
                    ))}
                </div>
            )}
        </div>
    );
}

// =========================================================================
// 모달 1: 배치/LOT 등록 및 투입 관계 편성 모달 (96vw × 92vh)
// =========================================================================

function BatchRegistrationModal({ batch, batches, onClose, onSuccess }) {
    const isEdit = !!batch;

    const [form, setForm] = useState({
        batchNumber: batch?.batchNumber || '',
        batchStage: batch?.batchStage || 'RAW_MATERIAL',
        itemCode: batch?.itemCode || '',
        itemName: batch?.itemName || '',
        itemCategory: batch?.itemCategory || 'COSMETICS',
        specification: batch?.specification || '',
        quantity: batch?.quantity || '',
        remainingQuantity: batch?.remainingQuantity || '',
        unit: batch?.unit || 'EA',
        manufacturingDate: batch?.manufacturingDate || new Date().toISOString().split('T')[0],
        expirationDate: batch?.expirationDate || '',
        supplierOrManufacturer: batch?.supplierOrManufacturer || '',
        manufacturingLine: batch?.manufacturingLine || '',
        storageLocation: batch?.storageLocation || '',
        qualityStatus: batch?.qualityStatus || 'QUARANTINE',
        coaNumber: batch?.coaNumber || '',
        notes: batch?.notes || ''
    });

    // 신규 등록 시 투입 연결 관계(부모 LOT) 추가 옵션
    const [addParentLink, setAddParentLink] = useState(false);
    const [parentLink, setParentLink] = useState({
        parentBatchNumber: '',
        processStep: '칭량조제',
        inputQuantity: '',
        inputUnit: 'EA'
    });

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.itemCode || !form.itemName || !form.quantity) {
            toast.error('품목코드, 품목명, 수량은 필수 입력 항목입니다.');
            return;
        }

        setSubmitting(true);
        try {
            let savedBatch;
            if (isEdit) {
                savedBatch = await updateTraceabilityBatch(batch.id, form);
                toast.success(`배치 [${savedBatch.batchNumber}] 정보가 수정되었습니다.`);
            } else {
                savedBatch = await createTraceabilityBatch(form);
                toast.success(`신규 배치 [${savedBatch.batchNumber}]이(가) 등록되었습니다.`);

                // 부모 LOT 연결 관계가 선택되었으면 링크 생성
                if (addParentLink && parentLink.parentBatchNumber) {
                    await createTraceabilityLink({
                        parentBatchNumber: parentLink.parentBatchNumber,
                        childBatchNumber: savedBatch.batchNumber,
                        processStep: parentLink.processStep,
                        inputQuantity: parentLink.inputQuantity || form.quantity,
                        inputUnit: parentLink.inputUnit || form.unit,
                        linkDate: form.manufacturingDate,
                        notes: '신규 배치 등록 시 자동 편성된 투입 관계'
                    });
                    toast.info(`부모 LOT [${parentLink.parentBatchNumber}]과의 투입 연결이 생성되었습니다.`);
                }
            }
            onSuccess();
        } catch (err) {
            console.error('Batch save error:', err);
            toast.error(err.response?.data?.message || '배치 저장에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                {/* 상단 고정 헤더 */}
                <div style={{
                    padding: '20px 28px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                            {isEdit ? '✏️ 배치(LOT) 마스터 정보 수정' : '📦 신규 배치(LOT) 마스터 등록 및 투입 매핑'}
                        </h2>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            ISO 13485:2016 §7.5.8 식별 및 추적성 기준에 부합하는 배치 정보와 부모 LOT 투입 관계를 구성합니다.
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                {/* 중앙 스크롤 바디 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
                    <form id="batchForm" onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    배치(LOT) 번호 <span style={{ fontSize: '11px', color: '#64748b' }}>(미입력 시 자동채번)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: LOT-202610-001"
                                    value={form.batchNumber}
                                    disabled={isEdit}
                                    onChange={e => setForm({ ...form, batchNumber: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    공정 단계 *
                                </label>
                                <select
                                    value={form.batchStage}
                                    onChange={e => setForm({ ...form, batchStage: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}>
                                    {BATCH_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    품목 규제 분류 *
                                </label>
                                <select
                                    value={form.itemCategory}
                                    onChange={e => setForm({ ...form, itemCategory: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}>
                                    <option value="COSMETICS">화장품 (ISO 22716)</option>
                                    <option value="MEDICAL_DEVICE">의료기기 (ISO 13485)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    품목코드 *
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: PRD-AMP-30"
                                    value={form.itemCode}
                                    onChange={e => setForm({ ...form, itemCode: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    품목명 *
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: 더파운더스 인텐시브 앰플 30ml"
                                    value={form.itemName}
                                    onChange={e => setForm({ ...form, itemName: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    수량 *
                                </label>
                                <input
                                    type="number"
                                    step="0.001"
                                    placeholder="0"
                                    value={form.quantity}
                                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    단위 (Unit)
                                </label>
                                <input
                                    type="text"
                                    placeholder="EA, kg, L, BOX 등"
                                    value={form.unit}
                                    onChange={e => setForm({ ...form, unit: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    품질 상태
                                </label>
                                <select
                                    value={form.qualityStatus}
                                    onChange={e => setForm({ ...form, qualityStatus: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}>
                                    {QUALITY_STATUSES.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    제조/입고 일자
                                </label>
                                <input
                                    type="date"
                                    value={form.manufacturingDate}
                                    onChange={e => setForm({ ...form, manufacturingDate: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    사용기한/유효기한
                                </label>
                                <input
                                    type="date"
                                    value={form.expirationDate}
                                    onChange={e => setForm({ ...form, expirationDate: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    제조원 / 공급업체
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: 더파운더스 제1제조소 / (주)한국바이오"
                                    value={form.supplierOrManufacturer}
                                    onChange={e => setForm({ ...form, supplierOrManufacturer: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    제조 라인 / 호기
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: 조제 1호기 / 충진 2라인"
                                    value={form.manufacturingLine}
                                    onChange={e => setForm({ ...form, manufacturingLine: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    보관 창고 / 위치
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: 완제품창고 P-01 / 랙 A-10"
                                    value={form.storageLocation}
                                    onChange={e => setForm({ ...form, storageLocation: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    COA 시험성적서 번호
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: COA-202610-001"
                                    value={form.coaNumber}
                                    onChange={e => setForm({ ...form, coaNumber: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        {/* 신규 등록일 때 투입 관계(부모 LOT) 매핑 섹션 */}
                        {!isEdit && (
                            <div style={{
                                backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '16px 20px',
                                marginTop: '16px', border: '1px solid #cbd5e1'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <input
                                        type="checkbox"
                                        id="addParentLinkCheckbox"
                                        checked={addParentLink}
                                        onChange={e => setAddParentLink(e.target.checked)}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="addParentLinkCheckbox" style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', cursor: 'pointer' }}>
                                        🔗 상위 투입 배치(부모 LOT) 연결 관계 동시 생성
                                    </label>
                                </div>

                                {addParentLink && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                                투입 원자재/벌크 LOT 선택 *
                                            </label>
                                            <select
                                                value={parentLink.parentBatchNumber}
                                                onChange={e => setParentLink({ ...parentLink, parentBatchNumber: e.target.value })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                                                <option value="">-- 부모 LOT 선택 --</option>
                                                {batches.map(b => (
                                                    <option key={b.id} value={b.batchNumber}>
                                                        [{b.batchStageDesc}] {b.batchNumber} - {b.itemName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                                투입 공정명
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="예: 원료칭량 / 벌크충진"
                                                value={parentLink.processStep}
                                                onChange={e => setParentLink({ ...parentLink, processStep: e.target.value })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                                투입 수량
                                            </label>
                                            <input
                                                type="number"
                                                step="0.001"
                                                placeholder="투입 수량"
                                                value={parentLink.inputQuantity}
                                                onChange={e => setParentLink({ ...parentLink, inputQuantity: e.target.value })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                </div>

                {/* 하단 고정 푸터 */}
                <div style={{
                    padding: '16px 28px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'flex-end', gap: '12px'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                            backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer'
                        }}>
                        취소
                    </button>
                    <button
                        type="submit"
                        form="batchForm"
                        disabled={submitting}
                        style={{
                            padding: '9px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                            backgroundColor: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer'
                        }}>
                        {submitting ? '저장 중...' : isEdit ? '수정 완료' : '등록 완료'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// 모달 2: 전공정 양방향 추적성 보고서 및 계층 트리 뷰어 모달 (96vw × 92vh)
// =========================================================================

function TraceabilityTreeModal({ matrixData, onClose }) {
    if (!matrixData) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                {/* 상단 고정 헤더 */}
                <div style={{
                    padding: '20px 28px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                            📄 전공정 양방향 추적성 감사 리포트 (Traceability Audit Report)
                        </h2>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            기준 LOT: <strong style={{ color: '#2563eb' }}>{matrixData.queryBatchNumber}</strong> |
                            생성일시: {matrixData.generatedAt} | 식별규격: ISO 13485:2016 §7.5.8 / ISO 22716 §8.3
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={handlePrint}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                                backgroundColor: '#1e40af', color: '#ffffff', border: 'none', cursor: 'pointer'
                            }}>
                            🖨️ 인쇄 / PDF 출력
                        </button>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                    </div>
                </div>

                {/* 중앙 스크롤 바디 (리포트 인쇄 최적화 서식) */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: '#ffffff' }}>
                    {/* 문서 타이틀 */}
                    <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
                        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>
                            의료기기 & 화장품 전공정 배치(LOT) 추적성 적합성 검증서
                        </h1>
                        <div style={{ fontSize: '13px', color: '#475569' }}>
                            Quality Assurance Department • Internal Management System
                        </div>
                    </div>

                    {/* 요약 메타 테이블 */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '13px' }}>
                        <tbody>
                            <tr>
                                <th style={{ backgroundColor: '#f1f5f9', padding: '10px', border: '1px solid #cbd5e1', width: '20%', textAlign: 'left' }}>기준 배치(LOT) 번호</th>
                                <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: 800, color: '#1e40af' }}>{matrixData.queryBatchNumber}</td>
                                <th style={{ backgroundColor: '#f1f5f9', padding: '10px', border: '1px solid #cbd5e1', width: '20%', textAlign: 'left' }}>탐색 방향</th>
                                <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: 700 }}>{matrixData.queryDirection}</td>
                            </tr>
                            <tr>
                                <th style={{ backgroundColor: '#f1f5f9', padding: '10px', border: '1px solid #cbd5e1', textAlign: 'left' }}>연계 배치 총 수량</th>
                                <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: 700 }}>{matrixData.totalRelatedBatches} 개소</td>
                                <th style={{ backgroundColor: '#f1f5f9', padding: '10px', border: '1px solid #cbd5e1', textAlign: 'left' }}>추적 무결성(커버리지)</th>
                                <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: 800, color: '#059669' }}>{matrixData.traceabilityCoverageRate}% 적합</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* 트리 구조 다이어그램 */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                            1. 전공정 투입/산출 계층 구조도
                        </h3>
                        <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                            <TraceTreeNodeView node={matrixData.rootNode} onSelectBatch={() => {}} isRoot />
                        </div>
                    </div>

                    {/* 서명란 */}
                    <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end', gap: '32px' }}>
                        <div style={{ textAlign: 'center', width: '140px', borderTop: '1px solid #94a3b8', paddingTop: '8px', fontSize: '13px' }}>
                            <div style={{ fontWeight: 700 }}>작성자 (생산/품질)</div>
                            <div style={{ marginTop: '24px', color: '#64748b' }}>(인)</div>
                        </div>
                        <div style={{ textAlign: 'center', width: '140px', borderTop: '1px solid #94a3b8', paddingTop: '8px', fontSize: '13px' }}>
                            <div style={{ fontWeight: 700 }}>승인자 (품질책임자)</div>
                            <div style={{ marginTop: '24px', color: '#64748b' }}>(인)</div>
                        </div>
                    </div>
                </div>

                {/* 하단 고정 푸터 */}
                <div style={{
                    padding: '16px 28px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '9px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                            backgroundColor: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer'
                        }}>
                        확인 완료
                    </button>
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// 모달 3: 외부 시스템 수기 대사 승인 모달 (96vw × 92vh)
// =========================================================================

function ExternalReconciliationModal({ log, onClose, onSuccess }) {
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleReconcile = async () => {
        if (!notes.trim()) {
            toast.error('대사 검토 의견을 반드시 작성해주세요.');
            return;
        }

        setSubmitting(true);
        try {
            await reconcileIntegrationLog(log.id, { reconciliationNotes: notes.trim() });
            toast.success(`로그 [${log.logNumber}]의 수기 대사가 승인 완료되었습니다.`);
            onSuccess();
        } catch (err) {
            toast.error('대사 승인에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    padding: '20px 28px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                            ⚖️ 외부 시스템 수기 대사 승인 (Manual Reconciliation - DEC-02)
                        </h2>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            ERP/WMS 연계 로그 번호: <strong style={{ color: '#1e40af' }}>{log.logNumber}</strong>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
                    <div style={{
                        backgroundColor: '#fff1f2', borderRadius: '12px', border: '1px solid #fecdd3',
                        padding: '16px 20px', marginBottom: '20px'
                    }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#e11d48', marginBottom: '4px' }}>
                            ⚠️ 재고/실적 수량 불일치 검출: {log.discrepancyCount} EA 차이
                        </div>
                        <div style={{ fontSize: '12px', color: '#be123c' }}>
                            외부 시스템 실적 수량과 eQMS 승인 수량 간 차이가 발생하였습니다. 실물 전수 점검 및 원인 확인 후 승인 사유를 기록하십시오.
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
                        <tbody>
                            <tr>
                                <th style={{ backgroundColor: '#f8fafc', padding: '10px', border: '1px solid #cbd5e1', width: '20%', textAlign: 'left' }}>연계 시스템</th>
                                <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: 700 }}>{log.systemTypeDesc}</td>
                                <th style={{ backgroundColor: '#f8fafc', padding: '10px', border: '1px solid #cbd5e1', width: '20%', textAlign: 'left' }}>인터페이스 유형</th>
                                <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: 700 }}>{log.interfaceTypeDesc}</td>
                            </tr>
                            <tr>
                                <th style={{ backgroundColor: '#f8fafc', padding: '10px', border: '1px solid #cbd5e1', textAlign: 'left' }}>대상 배치 번호</th>
                                <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: 800, color: '#1e40af' }}>{log.targetBatchNumber || '-'}</td>
                                <th style={{ backgroundColor: '#f8fafc', padding: '10px', border: '1px solid #cbd5e1', textAlign: 'left' }}>연동 건수</th>
                                <td style={{ padding: '10px', border: '1px solid #cbd5e1', fontWeight: 700 }}>{log.recordCount} 건</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                            ✍️ 대사 승인 및 불일치 조정 사유 *
                        </label>
                        <textarea
                            rows={6}
                            placeholder="예: 물류 출고 검수 과정에서 샘플링 5EA 추출 확인 완료. 실제 시장 유통 수량과 일치함에 따라 대사 승인함."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                <div style={{
                    padding: '16px 28px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'flex-end', gap: '12px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                            backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer'
                        }}>
                        취소
                    </button>
                    <button
                        onClick={handleReconcile}
                        disabled={submitting}
                        style={{
                            padding: '9px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                            backgroundColor: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer'
                        }}>
                        {submitting ? '승인 중...' : '⚖️ 수기 대사 승인 완료'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// 모달 4: GS1 UDI 바코드 / QR 라벨 생성 및 인쇄 미리보기 모달 (96vw × 92vh)
// =========================================================================

function BarcodeIssuanceModal({ barcode, batches, onClose, onSuccess }) {
    const isPrintMode = !!barcode;

    const [form, setForm] = useState({
        batchNumber: barcode?.batchNumber || (batches[0]?.batchNumber || ''),
        barcodeType: barcode?.barcodeType || 'DATA_MATRIX',
        gtin: barcode?.gtin || '8809123456789',
        expirationDateString: barcode?.expirationDateString || '281015',
        serialNumber: barcode?.serialNumber || ('SN' + Math.floor(Math.random() * 900000 + 100000))
    });

    const [submitting, setSubmitting] = useState(false);

    // 계산된 바코드 문자열
    const assembledBarcode = useMemo(() => {
        if (isPrintMode) return barcode.barcodeValue;
        if (form.barcodeType === 'GS1_128' || form.barcodeType === 'DATA_MATRIX') {
            return `(01)${form.gtin || '8809123456789'}(10)${form.batchNumber}(17)${form.expirationDateString || '281015'}(21)${form.serialNumber || 'SN1001'}`;
        }
        if (form.barcodeType === 'QR_CODE') {
            return `QR-${form.batchNumber}-${form.serialNumber}`;
        }
        return `${form.batchNumber}-${form.serialNumber}`;
    }, [isPrintMode, barcode, form]);

    const handleIssue = async () => {
        if (!form.batchNumber) {
            toast.error('연계 배치(LOT) 번호를 선택해주세요.');
            return;
        }

        setSubmitting(true);
        try {
            await issueBarcodeRecord(form);
            toast.success('신규 UDI 바코드 식별 라벨이 발행되었습니다.');
            onSuccess();
        } catch (err) {
            toast.error('바코드 발행에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrintAndIncrement = async () => {
        if (!barcode) return;
        try {
            await incrementBarcodePrint(barcode.id);
            toast.success(`라벨 인쇄가 실행되었습니다. (누적 인쇄: ${(barcode.printCount || 0) + 1}회)`);
            window.print();
            onSuccess();
        } catch (err) {
            toast.error('인쇄 카운트 갱신 실패');
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                width: '96vw', maxWidth: '1680px', height: '92vh', maxHeight: '94vh',
                backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    padding: '20px 28px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                            {isPrintMode ? '🖨️ GS1 UDI 바코드 라벨 인쇄 미리보기' : '🏷️ GS1 UDI 바코드 및 QR 식별 라벨 발행'}
                        </h2>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            21 CFR 820.65 / 820.120 의료기기 & 화장품 UDI 규격에 따른 고유 식별자 라벨을 생성합니다.
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
                    {/* 좌측 설정 폼 */}
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                            식별자(AI) 파라미터 설정
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    연계 배치(LOT) 번호 *
                                </label>
                                <select
                                    disabled={isPrintMode}
                                    value={form.batchNumber}
                                    onChange={e => setForm({ ...form, batchNumber: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                                    {batches.map(b => (
                                        <option key={b.id} value={b.batchNumber}>
                                            [{b.batchStageDesc}] {b.batchNumber} - {b.itemName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    바코드 규격 유형 *
                                </label>
                                <select
                                    disabled={isPrintMode}
                                    value={form.barcodeType}
                                    onChange={e => setForm({ ...form, barcodeType: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                                    {BARCODE_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    GTIN 상품식별코드 (01)
                                </label>
                                <input
                                    type="text"
                                    disabled={isPrintMode}
                                    value={form.gtin}
                                    onChange={e => setForm({ ...form, gtin: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    유효기한 YYMMDD (17)
                                </label>
                                <input
                                    type="text"
                                    disabled={isPrintMode}
                                    value={form.expirationDateString}
                                    onChange={e => setForm({ ...form, expirationDateString: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    일련번호/시리얼 (21)
                                </label>
                                <input
                                    type="text"
                                    disabled={isPrintMode}
                                    value={form.serialNumber}
                                    onChange={e => setForm({ ...form, serialNumber: e.target.value })}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 우측 라벨 시뮬레이션 미리보기 */}
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                            라벨 실물 미리보기 (Label Preview)
                        </h3>

                        <div style={{
                            border: '2px solid #0f172a', borderRadius: '12px', padding: '24px',
                            backgroundColor: '#ffffff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                            display: 'flex', flexDirection: 'column', gap: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>THE FOUNDERS QMS LABEL</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>ISO 13485 / 22716</div>
                            </div>

                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>PRODUCT NAME / ITEM CODE</div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                                    {batches.find(b => b.batchNumber === form.batchNumber)?.itemName || 'QMS Standard Product'}
                                </div>
                            </div>

                            {/* 바코드 시각화 박스 */}
                            <div style={{
                                backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px',
                                padding: '20px', textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '32px', letterSpacing: '4px', marginBottom: '8px' }}>
                                    |||||| | |||| |||||| || | |||| |||
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: '#1e40af' }}>
                                    {assembledBarcode}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
                                <div>LOT NO: <strong>{form.batchNumber}</strong></div>
                                <div>EXP DATE: <strong>{form.expirationDateString}</strong></div>
                                <div>GTIN: <strong>{form.gtin}</strong></div>
                                <div>SERIAL: <strong>{form.serialNumber}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{
                    padding: '16px 28px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'flex-end', gap: '12px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                            backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer'
                        }}>
                        취소
                    </button>
                    {isPrintMode ? (
                        <button
                            onClick={handlePrintAndIncrement}
                            style={{
                                padding: '9px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                                backgroundColor: '#1d4ed8', color: '#ffffff', border: 'none', cursor: 'pointer'
                            }}>
                            🖨️ 라벨 인쇄 및 이력 기록
                        </button>
                    ) : (
                        <button
                            onClick={handleIssue}
                            disabled={submitting}
                            style={{
                                padding: '9px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                                backgroundColor: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer'
                            }}>
                            {submitting ? '발행 중...' : '🏷️ UDI 라벨 신규 발행'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// 모달 5: 외부 연계 실행 모달 (ExternalSyncTriggerModal)
// =========================================================================

function ExternalSyncTriggerModal({ batches, onClose, onSuccess }) {
    const [systemType, setSystemType] = useState('ERP');
    const [interfaceType, setInterfaceType] = useState('INVENTORY_RECONCILIATION');
    const [targetBatchNumber, setTargetBatchNumber] = useState(batches[0]?.batchNumber || '');
    const [recordCount, setRecordCount] = useState(100);
    const [discrepancyCount, setDiscrepancyCount] = useState(0);
    const [reconciliationNotes, setReconciliationNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSync = async () => {
        setSubmitting(true);
        try {
            await createExternalIntegrationLog({
                systemType,
                interfaceType,
                transferProtocol: 'REST_API',
                targetBatchNumber,
                recordCount,
                discrepancyCount,
                requestPayload: `{"system":"${systemType}","interface":"${interfaceType}","batch":"${targetBatchNumber}","syncTime":"${new Date().toISOString()}"}`,
                reconciliationNotes: reconciliationNotes || undefined
            });
            toast.success('외부 연계 인터페이스가 정상 실행되었습니다.');
            onSuccess();
        } catch (err) {
            toast.error('연계 실행에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                width: '600px', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                        🔄 외부 시스템(ERP/WMS) 연계 실행
                    </h2>
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>연계 대상 시스템</label>
                        <select
                            value={systemType}
                            onChange={e => setSystemType(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                            {INTEGRATION_SYSTEMS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>인터페이스 업무</label>
                        <select
                            value={interfaceType}
                            onChange={e => setInterfaceType(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                            {INTERFACE_TYPES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>대상 배치(LOT)</label>
                        <select
                            value={targetBatchNumber}
                            onChange={e => setTargetBatchNumber(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                            {batches.map(b => <option key={b.id} value={b.batchNumber}>{b.batchNumber} - {b.itemName}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>전송/수신 건수</label>
                            <input
                                type="number"
                                value={recordCount}
                                onChange={e => setRecordCount(Number(e.target.value))}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>불일치(차이) 건수</label>
                            <input
                                type="number"
                                value={discrepancyCount}
                                onChange={e => setDiscrepancyCount(Number(e.target.value))}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>
                </div>
                <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                        취소
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={submitting}
                        style={{ padding: '9px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, backgroundColor: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer' }}>
                        {submitting ? '연계 실행 중...' : '연계 실행'}
                    </button>
                </div>
            </div>
        </div>
    );
}
