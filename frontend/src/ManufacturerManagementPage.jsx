import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { getManufacturers, deleteManufacturer } from './api';
import ManufacturerDrawer from './ManufacturerDrawer';
import { usePermissions } from './usePermissions';
import { toast } from 'react-toastify';

/**
 * 제조사 정보 관리 페이지
 * [디자인 표준화] 제품코드 마스터의 20px 여백 및 표준 그리드 레이아웃을 적용했습니다.
 * [UX 개선] 기존 카드 형태에서 Ag-Grid 기반의 데이터 중심 레이아웃으로 전환하여 대량의 협력사 정보를 효율적으로 관리합니다.
 */
const ManufacturerManagementPage = ({ user }) => {
    const { canEdit: checkEdit, canDelete: checkDelete } = usePermissions(user);
    const canEdit = checkEdit('manufacturers');
    const canDelete = checkDelete('manufacturers');
    const [rowData, setRowData] = useState([]);
    const [selectedManufacturer, setSelectedManufacturer] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [quickFilterText, setQuickFilterText] = useState('');

    const fetchManufacturers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getManufacturers();
            setRowData(res.data);
        } catch (error) {
            toast.error("제조사 정보를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchManufacturers();
    }, [fetchManufacturers]);

    const handleRowDoubleClicked = (params) => {
        setSelectedManufacturer(params.data);
        setIsDrawerOpen(true);
    };

    const handleAddClick = () => {
        setSelectedManufacturer(null);
        setIsDrawerOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("정말 이 제조사 정보를 삭제하시겠습니까? 관련 데이터가 존재할 경우 오류가 발생할 수 있습니다.")) return;
        try {
            await deleteManufacturer(id);
            toast.success("제조사 정보가 삭제되었습니다.");
            fetchManufacturers();
        } catch (error) {
            toast.error("삭제 실패: 관련 데이터가 존재할 수 있습니다.");
        }
    };

    const columnDefs = useMemo(() => [
        { field: "identificationCode", headerName: "식별 코드", width: 150, filter: true, pinned: 'left' },
        { field: "name", headerName: "제조사 명칭", flex: 1, filter: true, cellStyle: { fontWeight: '800', color: '#1a202c' } },
        { field: "category", headerName: "구분", width: 130, filter: true,
          cellRenderer: (params) => <span className="badge primary">{params.value || '미분류'}</span>
        },
        { field: "contactPerson", headerName: "담당자", width: 130, filter: true },
        { field: "phoneNumber", headerName: "연락처", width: 160, filter: true },
        { field: "email", headerName: "이메일", width: 200, filter: true },
        {
            headerName: "관리",
            width: 140,
            sortable: false,
            filter: false,
            pinned: 'right',
            cellRenderer: (params) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
                    <button
                        className="secondary"
                        onClick={() => { setSelectedManufacturer(params.data); setIsDrawerOpen(true); }}
                        style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '800' }}
                    >
                        수정
                    </button>
                    <button
                        className="secondary"
                        onClick={() => handleDelete(params.data.id)}
                        style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '800', color: '#e53e3e', background: '#fff5f5' }}
                        disabled={!canDelete}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ], [canDelete]);

    if (loading && rowData.length === 0) return (
        <div className="global-loading-overlay">
            <div className="spinner-ring"></div>
            <div className="loading-text">협력사 마스터 데이터를 동기화 중입니다...</div>
        </div>
    );

    return (
        <div className="page-container">
            {/* 표준화된 헤더 레이아웃 */}
            <div className="page-header-standard">
                <div className="header-title">
                    <h2>🏭 제조사 정보 관리</h2>
                    <p>협력사별 인증 서류, 담당자 인적사항 및 제조 역량을 통합 관리합니다. (항목 더블클릭 시 상세 정보 확인)</p>
                </div>
                <button
                    className="primary"
                    onClick={handleAddClick}
                    style={{
                        padding: '12px 28px',
                        borderRadius: '12px',
                        fontSize: '15px',
                        boxShadow: '0 4px 12px rgba(0, 51, 102, 0.2)',
                        opacity: canEdit ? 1 : 0.5
                    }}
                    disabled={!canEdit}
                >
                    ➕ 신규 제조사 등록
                </button>
            </div>

            {/* 그리드 데이터 카드 */}
            <div className="card" style={{ padding: '25px', borderRadius: '24px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: '#475569' }}>
                        제조사 목록 <span style={{ color: 'var(--primary-color)', marginLeft: '8px' }}>{rowData.length}</span>
                    </div>
                    <div className="search-bar-standard" style={{ padding: '0', border: 'none', boxShadow: 'none', margin: 0, width: '350px' }}>
                        <div style={{ display: 'flex', width: '100%', position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="명칭, 코드 등으로 빠른 검색..."
                                value={quickFilterText}
                                onChange={(e) => setQuickFilterText(e.target.value)}
                                style={{ padding: '12px 45px 12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', width: '100%', fontWeight: '600' }}
                            />
                            <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
                        </div>
                    </div>
                </div>

                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                    <AgGridReact
                        theme="legacy"
                        rowHeight={55}
                        rowData={rowData}
                        columnDefs={columnDefs}
                        pagination={true}
                        paginationPageSize={50}
                        quickFilterText={quickFilterText}
                        animateRows={true}
                        onRowDoubleClicked={handleRowDoubleClicked}
                    />
                </div>
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
