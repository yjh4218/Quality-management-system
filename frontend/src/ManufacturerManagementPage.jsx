import React, { useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { getManufacturers, deleteManufacturer } from './api';
import ManufacturerDrawer from './ManufacturerDrawer';
import { usePermissions } from './usePermissions';

const ManufacturerManagementPage = ({ user }) => {
    const { canEdit: checkEdit, canDelete: checkDelete } = usePermissions(user);
    const canEdit = checkEdit('manufacturers');
    const canDelete = checkDelete('manufacturers');
    const [rowData, setRowData] = useState([]);
    const [selectedManufacturer, setSelectedManufacturer] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const fetchManufacturers = useCallback(async () => {
        try {
            const res = await getManufacturers();
            setRowData(res.data);
        } catch (error) {
            // Silently fail
        }
    }, []);

    useEffect(() => {
        fetchManufacturers();
    }, [fetchManufacturers]);

    const handleRowDoubleClicked = (event) => {
        setSelectedManufacturer(event.data);
        setIsDrawerOpen(true);
    };

    const handleAddClick = () => {
        setSelectedManufacturer(null);
        setIsDrawerOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("정말 삭제하시겠습니까? (관리자 전용)")) return;
        try {
            await deleteManufacturer(id);
            fetchManufacturers();
        } catch (error) {
            alert("삭제에 실패했습니다.");
        }
    };

    const columnDefs = [
        { field: 'category', headerName: '구분', width: 130, filter: true },
        { field: 'identificationCode', headerName: '식별코드', width: 130, filter: true },
        { field: 'name', headerName: '제조사명', flex: 1, filter: true },
        { field: 'contactPerson', headerName: '담당자', width: 150 },
        { field: 'department', headerName: '소속팀', width: 150 },
        { field: 'email', headerName: '이메일', flex: 1.5 },
        { field: 'phoneNumber', headerName: '전화번호', width: 180 },
        {
            headerName: '관리',
            width: 130,
            cellRenderer: (params) => (
                <button 
                    onClick={() => handleDelete(params.data.id)} 
                    className="secondary" 
                    style={{ padding: '2px 8px', fontSize: '11px', opacity: canDelete ? 1 : 0.5 }}
                    disabled={!canDelete}
                >
                    삭제
                </button>
            )
        }
    ];

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1>🏭 제조사 정보 관리</h1>
                    <p style={{ color: '#666', fontSize: '14px' }}>협력사의 인증 서류 및 담당자 정보를 관리합니다.</p>
                </div>
                <button 
                    onClick={handleAddClick} 
                    className="primary" 
                    style={{ opacity: canEdit ? 1 : 0.5, cursor: canEdit ? 'pointer' : 'not-allowed' }}
                    disabled={!canEdit}
                >
                    + 신규 제조사 등록
                </button>
            </div>

            <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 250px)', width: '100%' }}>
                <AgGridReact
                    theme="legacy"
                    rowHeight={50}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    onRowDoubleClicked={handleRowDoubleClicked}
                    pagination={true}
                    paginationPageSize={20}
                />
            </div>

            {isDrawerOpen && (
                <ManufacturerDrawer
                    manufacturer={selectedManufacturer}
                    onClose={() => {
                        setIsDrawerOpen(false);
                        fetchManufacturers();
                    }}
                    canEdit={canEdit}
                />
            )}
        </div>
    );
};

export default ManufacturerManagementPage;
