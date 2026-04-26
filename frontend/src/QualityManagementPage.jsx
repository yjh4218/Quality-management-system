import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Backdrop, CircularProgress } from '@mui/material';
import QualitySearchFilter from './components/QualitySearchFilter';
import QualityDetailDrawer from './components/QualityDetailDrawer';
import api, { 
    getInboundData, 
    updateInboundData, 
    getInboundHistory, 
    uploadCoaFile,
    triggerWmsFetch,
    getManufacturers 
} from './api';

import { useQualityManagement } from './hooks/useQualityManagement';

const QualityManagementPage = ({ user, navigationData, onNavigated }) => {
    const {
        gridRef,
        rowData,
        setRowData,
        isDrawerOpen,
        setIsDrawerOpen,
        selectedInbound,
        setSelectedInbound,
        history,
        activeTab,
        setActiveTab,
        searchParams,
        setSearchParams,
        manufacturers,
        isAdmin,
        isInternalQuality,
        isManufacturer,
        overallStatusMap,
        getFullUrl,
        getCleanFileName,
        getInitialDates,
        fetchInboundData,
        handleSync,
        onCellValueChanged,
        handleBatchSave,
        handleRowAction,
        handleFileUpload,
        isLoading
    } = useQualityManagement(user, navigationData, onNavigated);


    const getRowClass = (params) => {
        const inboundDateStr = params.data.inboundDate ? params.data.inboundDate.split('T')[0] : null;
        if (!inboundDateStr) return '';
        
        const inboundDate = new Date(inboundDateStr);
        const coaDate = params.data.coaDecisionDate ? new Date(params.data.coaDecisionDate) : null;
        const qualityDate = params.data.qualityDecisionDate ? new Date(params.data.qualityDecisionDate) : null;

        if (coaDate && coaDate > inboundDate) return 'row-alert-red';
        if (qualityDate && qualityDate < inboundDate) return 'row-alert-red';
        return '';
    };

    const colDefs = useMemo(() => [
        { 
            field: "overallStatus", 
            headerName: "입고 검사 상태", 
            width: 200, 
            pinned: 'left',
            checkboxSelection: true,
            headerCheckboxSelection: true,
            valueFormatter: p => overallStatusMap[p.value] || p.value,
            cellStyle: { fontWeight: 'bold', backgroundColor: '#f0f0f0', color: '#666' },
            cellRenderer: p => {
                const label = overallStatusMap[p.value] || p.value;
                return <span>{label}</span>;
            }
        },
        { field: "grnNumber", headerName: "입고번호", width: 180, pinned: 'left', sortable: true, filter: true },
        { field: "inboundDate", headerName: "입고일자", width: 140, pinned: 'left', valueFormatter: p => p.value?.split('T')[0] },
        { field: "itemCode", headerName: "품목코드", filter: true, width: 130, pinned: 'left' },
        { field: "productName", headerName: "제품명", filter: true, width: 200, pinned: 'left' },
        { field: "manufacturer", headerName: "제조사", filter: true, width: 130 },
        { field: "quantity", headerName: "입고수량", width: 120, valueFormatter: p => p.value != null ? Number(p.value).toLocaleString() : '' },
        { field: "lotNumber", headerName: "LOT 번호", width: 140 },
        { field: "expirationDate", headerName: "사용기한", width: 120 },
        { 
            headerName: '품질 담당자 영역',
            headerClass: 'quality-group-header',
            children: [
                { 
                    field: "inboundInspectionStatus", 
                    headerName: "입고검사 단계", 
                    width: 150,
                    headerClass: 'quality-header-left',
                    cellClass: 'quality-cell-left',
                    valueFormatter: p => p.value || '검사 대기',
                    editable: params => (isInternalQuality || isAdmin) && params.data.overallStatus !== 'STEP5_FINAL_COMPLETE',
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: ['검사 대기', '검사 중', '검사 완료', '반품'] },
                    cellStyle: params => {
                        if (params.data.overallStatus === 'STEP5_FINAL_COMPLETE') return { backgroundColor: '#f0f0f0', color: '#666' };
                        if (params.value === '반품') return { color: 'red', fontWeight: 'bold' };
                        return null;
                    }
                },
                { 
                    field: "inboundInspectionResult", 
                    headerName: "입고 검사 결과", 
                    width: 150,
                    headerClass: 'quality-header',
                    valueFormatter: p => p.value || '판정 중',
                    editable: params => (isInternalQuality || isAdmin) && params.data.overallStatus !== 'STEP5_FINAL_COMPLETE',
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: ['판정 중', '적합', '부적합'] },
                    cellStyle: params => params.data.overallStatus === 'STEP5_FINAL_COMPLETE' ? { backgroundColor: '#f0f0f0', color: '#666' } : null
                },
                { 
                    field: "controlSampleStatus", 
                    headerName: "관리품 확인", 
                    width: 120,
                    headerClass: 'quality-header',
                    valueFormatter: p => p.value || '검사 대기',
                    editable: params => (isInternalQuality || isAdmin) && params.data.overallStatus !== 'STEP5_FINAL_COMPLETE',
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: ['검사 대기', '검사 중', '검사 완료'] },
                    cellStyle: params => params.data.overallStatus === 'STEP5_FINAL_COMPLETE' ? { backgroundColor: '#f0f0f0', color: '#666' } : null
                },
                { 
                    field: "finalInspectionResult", 
                    headerName: "완제품 검사 결과", 
                    width: 130,
                    headerClass: 'quality-header',
                    valueFormatter: p => p.value || '판정 중',
                    editable: params => (isInternalQuality || isAdmin) && params.data.overallStatus !== 'STEP5_FINAL_COMPLETE',
                    cellEditor: 'agSelectCellEditor',
                    cellEditorParams: { values: ['판정 중', '적합', '부적합'] },
                    cellStyle: params => params.data.overallStatus === 'STEP5_FINAL_COMPLETE' ? { backgroundColor: '#f0f0f0', color: '#666' } : null
                },
                {
                    field: "qualityDecisionDate",
                    headerName: "품질 적합 판정일",
                    width: 150,
                    headerClass: 'quality-header-right',
                    cellClass: 'quality-cell-right',
                    valueFormatter: p => p.value || '-',
                    editable: params => (isInternalQuality || isAdmin) && params.data.overallStatus !== 'STEP5_FINAL_COMPLETE',
                    cellEditor: 'agDateStringCellEditor',
                    cellStyle: params => params.data.overallStatus === 'STEP5_FINAL_COMPLETE' ? { backgroundColor: '#f0f0f0', color: '#666' } : null
                }
            ]
        },
        { 
            headerName: '제조사 영역',
            headerClass: 'manufacturer-group-header',
            children: [
                { 
                    field: "specificGravity", 
                    headerName: "비중값", 
                    width: 90, 
                    headerClass: 'manufacturer-header-left',
                    cellClass: 'manufacturer-cell-left',
                    editable: params => (isManufacturer || isInternalQuality || isAdmin) && params.data.overallStatus !== 'STEP5_FINAL_COMPLETE',
                    cellStyle: params => params.data.overallStatus === 'STEP5_FINAL_COMPLETE' ? { backgroundColor: '#f0f0f0', color: '#666' } : null,
                    valueFormatter: p => p.value != null ? Number(p.value).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : ''
                },
                { 
                    field: "testReportNumbers", 
                    headerName: "시험성적서 번호", 
                    width: 150, 
                    headerClass: 'manufacturer-header',
                    editable: params => (isManufacturer || isInternalQuality || isAdmin) && params.data.overallStatus !== 'STEP5_FINAL_COMPLETE',
                    tooltipField: "testReportNumbers",
                    cellStyle: params => params.data.overallStatus === 'STEP5_FINAL_COMPLETE' ? { backgroundColor: '#f0f0f0', color: '#666' } : null,
                    valueFormatter: p => p.value ? p.value.split(',').join(', ') : ''
                },
                {
                    headerName: "COA (국문)",
                    width: 200,
                    headerClass: 'manufacturer-header',
                    onCellClicked: (params) => { params.event.stopPropagation(); }, // Prevent drawer from opening
                    cellRenderer: p => {
                        const urls = p.data.coaFileUrl && typeof p.data.coaFileUrl === 'string' ? p.data.coaFileUrl.split(',').filter(u => u.trim() !== '') : [];
                        return (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '100%', overflowX: 'auto' }} onClick={e => e.stopPropagation()}>
                            {urls.length > 0 ? (
                                urls.map((url, idx) => {
                                    const displayName = getCleanFileName(url);
                                    
                                    return (
                                    <div key={idx} style={{ display: 'flex', gap: '4px', alignItems: 'center', border: '1px solid #ddd', padding: '2px', borderRadius: '4px', backgroundColor: '#f9f9f9', maxWidth: '150px' }}>
                                        <span title={displayName} style={{ fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{displayName}</span>
                                        <button onClick={(e) => { e.stopPropagation(); window.open(getFullUrl(url), '_blank'); }}
                                           className="small-btn primary" 
                                           style={{ padding: '2px 6px', fontSize: '10px' }}>열기</button>
                                        {(isManufacturer || isInternalQuality || isAdmin) && p.data.overallStatus !== 'STEP5_FINAL_COMPLETE' && (
                                            <button onClick={async (e) => { 
                                                e.stopPropagation(); 
                                                if(window.confirm("이 국문 COA 파일을 삭제하시겠습니까?")) {
                                                    const remainingUrls = urls.filter((_, i) => i !== idx).join(',');
                                                    const updated = { ...p.data, coaFileUrl: remainingUrls || null };
                                                    await updateInboundData(p.data.id, updated);
                                                    setRowData(prev => prev.map(row => row.id === p.data.id ? updated : row));
                                                }
                                            }} className="small-btn outline" style={{ color: '#e74c3c', borderColor: '#e74c3c', fontWeight: 'bold', padding: '2px 6px', fontSize: '10px' }}>X</button>
                                        )}
                                    </div>
                                    );
                                })
                            ) : <span style={{ color: '#999', fontSize: '11px', marginRight: '5px' }}>미등록</span>}
                            {(isManufacturer || isInternalQuality || isAdmin) && p.data.overallStatus !== 'STEP5_FINAL_COMPLETE' && (
                                <label style={{ cursor: 'pointer', fontSize: '12px', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ccc', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                                    추가 (10MB)
                                    <input type="file" hidden accept=".pdf" onChange={e => { e.stopPropagation(); handleFileUpload(e, p.data, 'coaFileUrl'); }} />
                                </label>
                            )}
                        </div>
                        );
                    }
                },
                {
                    headerName: "COA (영문)",
                    width: 200,
                    headerClass: 'manufacturer-header',
                    onCellClicked: (params) => { params.event.stopPropagation(); }, // Prevent drawer from opening
                    cellRenderer: p => {
                        const urls = p.data.coaFileUrlEng && typeof p.data.coaFileUrlEng === 'string' ? p.data.coaFileUrlEng.split(',').filter(u => u.trim() !== '') : [];
                        return (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '100%', overflowX: 'auto' }} onClick={e => e.stopPropagation()}>
                            {urls.length > 0 ? (
                                urls.map((url, idx) => {
                                    const displayName = getCleanFileName(url);
                                    
                                    return (
                                    <div key={idx} style={{ display: 'flex', gap: '4px', alignItems: 'center', border: '1px solid #ddd', padding: '2px', borderRadius: '4px', backgroundColor: '#f9f9f9', maxWidth: '150px' }}>
                                        <span title={displayName} style={{ fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{displayName}</span>
                                        <button onClick={(e) => { e.stopPropagation(); window.open(getFullUrl(url), '_blank'); }}
                                           className="small-btn primary" 
                                           style={{ padding: '2px 6px', fontSize: '10px' }}>열기</button>
                                        {(isManufacturer || isInternalQuality || isAdmin) && p.data.overallStatus !== 'STEP5_FINAL_COMPLETE' && (
                                            <button onClick={async (e) => { 
                                                e.stopPropagation(); 
                                                if(window.confirm("이 영문 COA 파일을 삭제하시겠습니까?")) {
                                                    const remainingUrls = urls.filter((_, i) => i !== idx).join(',');
                                                    const updated = { ...p.data, coaFileUrlEng: remainingUrls || null };
                                                    await updateInboundData(p.data.id, updated);
                                                    setRowData(prev => prev.map(row => row.id === p.data.id ? updated : row));
                                                }
                                            }} className="small-btn outline" style={{ color: '#e74c3c', borderColor: '#e74c3c', fontWeight: 'bold', padding: '2px 6px', fontSize: '10px' }}>X</button>
                                        )}
                                    </div>
                                    );
                                })
                            ) : <span style={{ color: '#999', fontSize: '11px', marginRight: '5px' }}>미등록</span>}
                            {(isManufacturer || isInternalQuality || isAdmin) && p.data.overallStatus !== 'STEP5_FINAL_COMPLETE' && (
                                <label style={{ cursor: 'pointer', fontSize: '12px', backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ccc', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                                    추가 (10MB)
                                    <input type="file" hidden accept=".pdf" onChange={e => { e.stopPropagation(); handleFileUpload(e, p.data, 'coaFileUrlEng'); }} />
                                </label>
                            )}
                        </div>
                        );
                    }
                },
                { 
                    field: "coaDecisionDate", 
                    headerName: "성적서 판정일", 
                    width: 120,
                    headerClass: 'manufacturer-header-right',
                    cellClass: 'manufacturer-cell-right',
                    editable: params => (isManufacturer || isInternalQuality || isAdmin) && params.data.overallStatus !== 'STEP5_FINAL_COMPLETE',
                    cellEditor: 'agDateCellEditor',
                    cellStyle: params => params.data.overallStatus === 'STEP5_FINAL_COMPLETE' ? { backgroundColor: '#f0f0f0', color: '#666' } : null
                }
            ]
        },
        { field: "remark", headerName: "비고", flex: 1, minWidth: 150, editable: params => (isInternalQuality || isManufacturer || isAdmin) && params.data.overallStatus !== 'STEP5_FINAL_COMPLETE', cellStyle: params => params.data.overallStatus === 'STEP5_FINAL_COMPLETE' ? { backgroundColor: '#f0f0f0', color: '#666' } : null }
    ], [isInternalQuality, isManufacturer, isAdmin]);

    const updateDetailField = async (field, value) => {
        if (!selectedInbound) return;
        
        // Prevent auto-save attempting to hit the backend if user has no edit rights at all
        if (!isInternalQuality && !isAdmin && !isManufacturer) return;

        const updated = { ...selectedInbound, [field]: value };
        setSelectedInbound(updated);
        try {
            const res = await updateInboundData(selectedInbound.id, updated);
            if (res.data) {
                setRowData(prev => prev.map(row => row.id === res.data.id ? res.data : row));
                const gridApi = gridRef.current?.api;
                if (gridApi) {
                    const node = gridApi.getRowNode(String(res.data.id));
                    if (node) node.setSelected(true);
                }
            }
        } catch (error) {
            import('react-toastify').then(({ toast }) => toast.error("수정 실패"));
        }
    };

    return (
        <div className="card" style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
            <style>{`
                /* Quality Area */
                .quality-group-header {
                    background-color: #e6f7ff !important;
                    border-top: 2px solid #1890ff !important;
                    border-left: 2px solid #1890ff !important;
                    border-right: 2px solid #1890ff !important;
                    color: #000 !important;
                    font-weight: bold;
                }
                .quality-header {
                    background-color: #e6f7ff !important;
                    border-bottom: 2px solid #1890ff !important;
                    color: #000 !important;
                    font-weight: bold;
                }
                .quality-header-left {
                    background-color: #e6f7ff !important;
                    border-bottom: 2px solid #1890ff !important;
                    border-left: 2px solid #1890ff !important;
                    color: #000 !important;
                    font-weight: bold;
                }
                .quality-header-right {
                    background-color: #e6f7ff !important;
                    border-bottom: 2px solid #1890ff !important;
                    border-right: 2px solid #1890ff !important;
                    color: #000 !important;
                    font-weight: bold;
                }
                .quality-cell-left { border-left: 2px solid #1890ff !important; }
                .quality-cell-right { border-right: 2px solid #1890ff !important; }

                /* Manufacturer Area */
                .manufacturer-group-header {
                    background-color: #e8f5e9 !important;
                    border-top: 2px solid #28a745 !important;
                    border-left: 2px solid #28a745 !important;
                    border-right: 2px solid #28a745 !important;
                    color: #000 !important;
                    font-weight: bold;
                }
                .manufacturer-header {
                    background-color: #e8f5e9 !important;
                    border-bottom: 2px solid #28a745 !important;
                    color: #000 !important;
                    font-weight: bold;
                }
                .manufacturer-header-left {
                    background-color: #e8f5e9 !important;
                    border-bottom: 2px solid #28a745 !important;
                    border-left: 2px solid #28a745 !important;
                    color: #000 !important;
                    font-weight: bold;
                }
                .manufacturer-header-right {
                    background-color: #e8f5e9 !important;
                    border-bottom: 2px solid #28a745 !important;
                    border-right: 2px solid #28a745 !important;
                    color: #000 !important;
                    font-weight: bold;
                }
                .manufacturer-cell-left { border-left: 2px solid #28a745 !important; }
                .manufacturer-cell-right { border-right: 2px solid #28a745 !important; }

                /* Center Text in Headers and allow wrapping */
                .ag-header-group-cell-label {
                    justify-content: center !important;
                }
                .ag-header-cell-label {
                    justify-content: center !important;
                    white-space: normal !important;
                    text-align: center;
                    line-height: 1.2;
                }

                /* Highlight logically flawed sequence dates in red */
                .row-alert-red .ag-cell {
                    color: #d32f2f !important;
                    font-weight: bold;
                }
            `}</style>
            <QualitySearchFilter 
                searchParams={searchParams}
                setSearchParams={setSearchParams}
                onSearch={fetchInboundData}
                onReset={() => {
                    const initD = getInitialDates();
                    setSearchParams({ startDate: initD.start, endDate: initD.end, itemCode: '', productName: '', lotNumber: '', manufacturer: '', excludeStatus: 'STEP5_FINAL_COMPLETE', grnNumber: '' });
                }}
                onSync={handleSync}
                onBatchSave={handleBatchSave}
                isInternalQuality={isInternalQuality}
                manufacturers={manufacturers}
                canViewInbound={true}
                inboundCount={rowData.length}
            />

            <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', fontSize: '12px' }}>
                <AgGridReact theme="legacy" 
                    rowHeight={50}
                    ref={gridRef}
                    rowData={rowData} 
                    getRowId={p => String(p.data.id)}
                    columnDefs={colDefs} 
                    getRowClass={getRowClass}
                    rowSelection="multiple"
                    suppressRowClickSelection={true}
                    onCellValueChanged={onCellValueChanged}
                    onRowDoubleClicked={p => handleRowAction(p.data)}
                    pagination={true}
                    singleClickEdit={true}
                    stopEditingWhenCellsLoseFocus={true}
                />
            </div>


            {/* 상세 내역 Drawer */}
            <QualityDetailDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                selectedInbound={selectedInbound}
                setSelectedInbound={setSelectedInbound}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                history={history}
                manufacturers={manufacturers}
                isInternalQuality={isInternalQuality}
                isAdmin={isAdmin}
                isManufacturer={isManufacturer}
                overallStatusMap={overallStatusMap}
                handleFileUpload={handleFileUpload}
                handleSave={async () => {
                    try {
                        const res = await updateInboundData(selectedInbound.id, selectedInbound);
                        if (res.data) {
                            setRowData(prev => prev.map(row => row.id === res.data.id ? res.data : row));
                        }
                        import('react-toastify').then(({ toast }) => toast.success("상세 품질 정보가 성공적으로 저장되었습니다."));
                        setIsDrawerOpen(false);
                        fetchInboundData();
                    } catch(e) {
                        import('react-toastify').then(({ toast }) => toast.error("저장 실패: " + (e.response?.data?.message || e.message)));
                    }
                }}
                getFullUrl={getFullUrl}
                getCleanFileName={getCleanFileName}
            />
            {/* Loading Overlay */}
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 4000 }}
                open={isLoading}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        </div>
    );
};

export default QualityManagementPage;
