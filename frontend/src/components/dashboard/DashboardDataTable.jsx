import React, { useState, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

/**
 * DashboardDataTable:
 * - AG Grid 기반의 공용 데이터 테이블 컴포넌트
 * - ag-theme-quartz 고정 (ag-theme-alpine 금지)
 * - 페이지 사이즈 선택 + 이전/다음 버튼 페이징 컨트롤을 컴포넌트 내부에 기본 내장
 * - ChartCard 와 동일한 카드 톤(패딩/테두리/그림자/모서리) 통일
 */
const DashboardDataTable = ({
    title,
    totalCount,
    rowData = [],
    columnDefs = [],
    onRowDoubleClick,
    pageSizeOptions = [10, 20, 50, 100],
    defaultPageSize = 20
}) => {
    const gridRef = useRef(null);
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // 페이지 사이즈 변경 핸들러
    const handlePageSizeChange = (e) => {
        const newSize = Number(e.target.value);
        setPageSize(newSize);
        if (gridRef.current && gridRef.current.api) {
            const api = gridRef.current.api;
            if (typeof api.setGridOption === 'function') {
                api.setGridOption('paginationPageSize', newSize);
            } else if (typeof api.paginationSetPageSize === 'function') {
                api.paginationSetPageSize(newSize);
            }
        }
    };

    // 이전 페이지
    const handlePrevPage = () => {
        if (gridRef.current && gridRef.current.api) {
            gridRef.current.api.paginationGoToPreviousPage();
        }
    };

    // 다음 페이지
    const handleNextPage = () => {
        if (gridRef.current && gridRef.current.api) {
            gridRef.current.api.paginationGoToNextPage();
        }
    };

    // 페이지 변경 이벤트 핸들러
    const onPaginationChanged = () => {
        if (gridRef.current && gridRef.current.api) {
            const api = gridRef.current.api;
            if (typeof api.paginationGetCurrentPage === 'function') {
                setCurrentPage(api.paginationGetCurrentPage());
            }
            if (typeof api.paginationGetTotalPages === 'function') {
                setTotalPages(api.paginationGetTotalPages() || 1);
            }
        }
    };

    // rowData 또는 pageSize 변경 시 페이지 상태 업데이트 강제
    useEffect(() => {
        if (gridRef.current && gridRef.current.api) {
            const api = gridRef.current.api;
            if (typeof api.setGridOption === 'function') {
                api.setGridOption('paginationPageSize', pageSize);
            } else if (typeof api.paginationSetPageSize === 'function') {
                api.paginationSetPageSize(pageSize);
            }
            if (typeof api.paginationGetCurrentPage === 'function') {
                setCurrentPage(api.paginationGetCurrentPage());
            }
            if (typeof api.paginationGetTotalPages === 'function') {
                setTotalPages(api.paginationGetTotalPages() || 1);
            }
        }
    }, [rowData, pageSize]);

    return (
        <section style={{
            padding: '24px 28px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            {/* 헤더 섹션 */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#1e293b',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {title} 
                    {totalCount !== undefined && (
                        <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#64748b',
                            backgroundColor: '#f1f5f9',
                            padding: '2px 8px',
                            borderRadius: '12px'
                        }}>
                            {totalCount}건
                        </span>
                    )}
                </h3>
            </div>

            {/* 그리드 컨테이너 */}
            <div className="ag-theme-quartz" style={{ height: '400px', width: '100%' }}>
                <AgGridReact
                    ref={gridRef}
                    theme="legacy"
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={{
                        flex: 1,
                        minWidth: 100,
                        resizable: true,
                        sortable: true,
                        filter: true
                    }}
                    pagination={true}
                    paginationPageSize={pageSize}
                    suppressPaginationPanel={true}
                    onPaginationChanged={onPaginationChanged}
                    onRowDoubleClicked={(params) => {
                        if (onRowDoubleClick) {
                            onRowDoubleClick(params.data);
                        }
                    }}
                />
            </div>

            {/* 하단 페이징 영역 (디자인 톤 통합) */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '8px',
                borderTop: '1px solid #f1f5f9'
            }}>
                {/* 페이지 크기 조절기 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                    <span>표시 개수:</span>
                    <select
                        value={pageSize}
                        onChange={handlePageSizeChange}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#1e293b',
                            fontWeight: '600',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {pageSizeOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}개</option>
                        ))}
                    </select>
                </div>

                {/* 이전/다음 페이지 버튼 및 번호 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 0}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: currentPage === 0 ? '#f8fafc' : '#ffffff',
                            color: currentPage === 0 ? '#94a3b8' : '#334155',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        이전
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                        {currentPage + 1} / {totalPages}
                    </span>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages - 1}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: currentPage >= totalPages - 1 ? '#f8fafc' : '#ffffff',
                            color: currentPage >= totalPages - 1 ? '#94a3b8' : '#334155',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        다음
                    </button>
                </div>
            </div>
        </section>
    );
};

export default DashboardDataTable;
