import React, { useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const DynamicGrid = ({
    columns = [],
    userViews = [],
    rowData = [],
    loading = false,
    enableRowSelection = false,
    rowSelectionMode = 'MULTI',
    onRowSelected,
    onRowDoubleClicked
}) => {
    const gridRef = useRef(null);

    const viewMap = useMemo(() => {
        const map = {};
        userViews.forEach(uv => {
            map[uv.columnId] = { isVisible: uv.isVisible, order: uv.columnOrder };
        });
        return map;
    }, [userViews]);

    const colDefs = useMemo(() => {
        if (!columns || columns.length === 0) return [];

        const orderedCols = [...columns].sort((a, b) => {
            const orderA = viewMap[a.id]?.order ?? a.displayOrder;
            const orderB = viewMap[b.id]?.order ?? b.displayOrder;
            return orderA - orderB;
        });

        const defs = [];

        if (enableRowSelection) {
            defs.push({
                headerCheckboxSelection: rowSelectionMode === 'MULTI',
                checkboxSelection: true,
                width: 50,
                pinned: 'left',
                lockPosition: true,
                suppressMenu: true
            });
        }

        orderedCols.forEach(col => {
            const isVisible = viewMap[col.id]?.isVisible ?? true;
            if (!isVisible) return;

            defs.push({
                field: col.fieldKey,
                headerName: col.label,
                width: col.width || 150,
                sortable: col.sortable ?? true,
                filter: true,
                resizable: true,
                editable: col.editable ?? false,
                valueGetter: (params) => {
                    if (!params.data) return null;
                    const key = col.fieldKey;
                    const data = params.data;
                    
                    let val = data[key];

                    // 대체/대응 키 fallback
                    if (val === undefined || val === null || val === '') {
                        if (key === 'brand' || key === 'brandName') {
                            val = data.brandName || (data.brand && typeof data.brand === 'object' ? data.brand.name : data.brand);
                        } else if (key === 'manufacturer' || key === 'manufacturerName') {
                            val = data.manufacturerName || (data.manufacturer && typeof data.manufacturer === 'object' ? data.manufacturer.name : data.manufacturer) || (data.manufacturerInfo && data.manufacturerInfo.name);
                        } else if (key === 'defectQuantity' || key === 'occurrenceQty' || key === 'quantity') {
                            val = data.occurrenceQty ?? data.defectQuantity ?? data.quantity;
                        } else if (key === 'claimCost' || key === 'claimAmount' || key === 'totalCost') {
                            val = data.claimCost ?? data.claimAmount ?? data.totalCost;
                        } else if (key === 'claimType' || key === 'primaryCategory' || key === 'category') {
                            val = data.primaryCategory ?? data.claimType ?? data.category;
                        } else if (key === 'status' || key === 'qualityStatus') {
                            val = data.qualityStatus ?? data.status;
                        } else if (key === 'productName' || key === 'product') {
                            val = data.productName || (data.product && typeof data.product === 'object' ? (data.product.productName || data.product.name) : data.product);
                        }
                    }

                    // 객체 형태일 경우 name, label 등 자동 추출
                    if (val && typeof val === 'object') {
                        return val.name || val.label || val.title || val.productName || val.code || JSON.stringify(val);
                    }

                    return val;
                },
                cellRenderer: (params) => renderCell(params, col.fieldType)
            });
        });

        return defs;
    }, [columns, viewMap, enableRowSelection, rowSelectionMode]);

    return (
        <div 
            className="ag-theme-alpine" 
            style={{ 
                width: '100%', 
                height: 'calc(100vh - 350px)', 
                minHeight: '480px',
                borderRadius: '12px', 
                overflow: 'hidden', 
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                border: '1px solid #e2e8f0',
                background: '#ffffff'
            }}
        >
            <AgGridReact
                ref={gridRef}
                theme="legacy"
                rowData={rowData}
                columnDefs={colDefs}
                animateRows={true}
                headerHeight={42}
                rowHeight={40}
                rowSelection={enableRowSelection ? (rowSelectionMode === 'SINGLE' ? 'single' : 'multiple') : undefined}
                onSelectionChanged={() => {
                    if (onRowSelected && gridRef.current) {
                        const selected = gridRef.current.api.getSelectedRows();
                        onRowSelected(selected);
                    }
                }}
                onRowDoubleClicked={(e) => onRowDoubleClicked && onRowDoubleClicked(e.data)}
                overlayLoadingTemplate="<span class='ag-overlay-loading-center' style='font-size:13px; color:#64748b;'>⏳ 데이터를 불러오는 중입니다...</span>"
                overlayNoRowsTemplate="<span class='ag-overlay-no-rows-center' style='font-size:13px; color:#94a3b8;'>표시할 데이터가 없습니다.</span>"
            />
        </div>
    );
};

const renderCell = (params, fieldType) => {
    const val = params.value;
    if (val === null || val === undefined || val === '') {
        return <span style={{ color: '#cbd5e1' }}>-</span>;
    }

    switch (fieldType) {
        case 'NUMBER':
            return (
                <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '600', color: '#0f172a' }}>
                    {typeof val === 'number' ? val.toLocaleString() : (isNaN(Number(val)) ? val : Number(val).toLocaleString())}
                </div>
            );

        case 'RELATION':
            return (
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#eef2ff',
                    color: '#4338ca',
                    fontSize: '12px',
                    fontWeight: '600'
                }}>
                    <span style={{ fontSize: '11px' }}>🔗</span>
                    <span>{String(val)}</span>
                </span>
            );

        case 'SELECT':
        case 'BADGE': {
            const strVal = String(val).toUpperCase();
            let bg = '#f1f5f9';
            let color = '#475569';
            let border = '#e2e8f0';

            if (strVal.includes('ACTIVE') || strVal.includes('정상') || strVal.includes('COMPLETED') || strVal.includes('완료') || strVal.includes('RESOLVED')) {
                bg = '#ecfdf5';
                color = '#065f46';
                border = '#a7f3d0';
            } else if (strVal.includes('PENDING') || strVal.includes('대기') || strVal.includes('ING') || strVal.includes('진행') || strVal.includes('REVIEW')) {
                bg = '#eff6ff';
                color = '#1e40af';
                border = '#bfdbfe';
            } else if (strVal.includes('REJECT') || strVal.includes('반려') || strVal.includes('ERROR') || strVal.includes('CRITICAL')) {
                bg = '#fef2f2';
                color = '#991b1b';
                border = '#fecaca';
            } else if (strVal.includes('WARNING') || strVal.includes('주의') || strVal.includes('HOLD')) {
                bg = '#fffbeb';
                color = '#92400e';
                border = '#fde68a';
            }

            return (
                <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: bg,
                    color: color,
                    border: `1px solid ${border}`,
                    fontSize: '11px',
                    fontWeight: '700',
                    lineHeight: '1.4'
                }}>
                    {String(val)}
                </span>
            );
        }

        case 'DATE':
            return (
                <span style={{ fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
                    {String(val).substring(0, 10)}
                </span>
            );

        default:
            return <span style={{ color: '#1e293b', fontSize: '13px' }}>{String(val)}</span>;
    }
};

export default DynamicGrid;
