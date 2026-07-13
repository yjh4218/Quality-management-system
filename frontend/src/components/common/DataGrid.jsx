import React, { useRef, useState, useCallback, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';

/**
 * QMS 표준 DataGrid 컴포넌트
 * - rowHeight={54} 표준 준수
 * - 컬럼별 플로팅 필터 비활성화 (정렬, 리사이즈만 허용)
 * - 좌측 "전체 N건" 카운터 노출
 * - 하단 중앙 정렬 페이지네이션 바 내장
 * - 마우스 hover 시 bg-blue-50/50 및 cursor-pointer 적용을 위한 클래스 매핑
 */
const DataGrid = React.forwardRef(({
    rowData = [],
    columnDefs = [],
    onRowDoubleClicked,
    paginationPageSize: initialPageSize = 50,
    className = "",
    ...props
}, ref) => {
    const internalRef = useRef(null);
    const gridRef = ref || internalRef;

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const onPaginationChanged = useCallback(() => {
        if (gridRef.current && gridRef.current.api) {
            setCurrentPage(gridRef.current.api.paginationGetCurrentPage());
            setTotalPages(gridRef.current.api.paginationGetTotalPages());
        }
    }, [gridRef]);

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

    // rowData 또는 pageSize 변경 시 페이징 상태 강제 업데이트
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
    }, [rowData, pageSize, gridRef]);

    return (
        <div className={`flex flex-col w-full space-y-3 ${className}`}>
            {/* 상단 툴바: 좌측 전체 건수 (엑셀 중복 버튼 제거하고 건수만 표시) */}
            <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-gray-700">
                    전체 <span className="text-blue-600 font-bold">{rowData.length}</span>건
                </span>
            </div>

            {/* 그리드 컨테이너 (둥근 모서리 및 subtle border) */}
            <div className="ag-theme-alpine w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white" style={{ height: '450px' }}>
                <AgGridReact
                    ref={gridRef}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    rowHeight={54}
                    headerHeight={48}
                    pagination={true}
                    paginationPageSize={pageSize}
                    suppressPaginationPanel={true}
                    onPaginationChanged={onPaginationChanged}
                    onRowDoubleClicked={onRowDoubleClicked}
                    defaultColDef={{
                        sortable: true,
                        resizable: true,
                        filter: false,
                        floatingFilter: false,
                        flex: 1
                    }}
                    rowClass="cursor-pointer hover:bg-blue-50/50 transition-colors duration-150"
                    {...props}
                />
            </div>

            {/* 하단 페이지네이션 바 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-gray-100 px-1">
                {/* 페이지 사이즈 선택기 */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">페이지 표시 개수:</span>
                    <select
                        value={pageSize}
                        onChange={handlePageSizeChange}
                        className="px-2 py-1.5 rounded-lg border border-gray-300 text-xs bg-white text-gray-700 cursor-pointer outline-none hover:border-gray-400 focus:border-blue-500"
                    >
                        <option value={10}>10개씩 보기</option>
                        <option value={20}>20개씩 보기</option>
                        <option value={50}>50개씩 보기</option>
                        <option value={100}>100개씩 보기</option>
                    </select>
                </div>

                {/* 중앙 페이지 조작 컨트롤 */}
                <div className="flex items-center gap-1">
                    <button
                        disabled={currentPage === 0}
                        onClick={() => gridRef.current?.api?.paginationGoToFirstPage()}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                        title="첫 페이지"
                    >
                        ⏮️
                    </button>
                    <button
                        disabled={currentPage === 0}
                        onClick={() => gridRef.current?.api?.paginationGoToPreviousPage()}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                        title="이전 페이지"
                    >
                        ◀️
                    </button>

                    <span className="px-4 text-xs font-semibold text-gray-700">
                        {totalPages > 0 ? currentPage + 1 : 0} / {totalPages} 페이지
                    </span>

                    <button
                        disabled={currentPage >= totalPages - 1}
                        onClick={() => gridRef.current?.api?.paginationGoToNextPage()}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                        title="다음 페이지"
                    >
                        ▶️
                    </button>
                    <button
                        disabled={currentPage >= totalPages - 1}
                        onClick={() => gridRef.current?.api?.paginationGoToLastPage()}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                        title="마지막 페이지"
                    >
                        ⏭️
                    </button>
                </div>

                <div className="hidden sm:block text-xs text-gray-500 font-medium">
                    (검색결과: 총 {rowData.length}건)
                </div>
            </div>
        </div>
    );
});

DataGrid.displayName = 'DataGrid';

export default DataGrid;
