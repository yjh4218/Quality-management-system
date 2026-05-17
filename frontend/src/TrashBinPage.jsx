import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { getTrashItems, restoreTrashItem, hardDeleteTrashItem } from './api';
import { toast } from 'react-toastify';
import { usePermissions } from './usePermissions';

const TrashBinPage = ({ user }) => {
    const [rowData, setRowData] = useState([]);
    const [loading, setLoading] = useState(false);
    const { isAdmin } = usePermissions(user);

    useEffect(() => {
        loadTrashItems();
    }, []);

    const loadTrashItems = async () => {
        setLoading(true);
        try {
            const res = await getTrashItems();
            setRowData(res.data || []);
        } catch (error) {
            toast.error("휴지통 내역을 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (entityType, id) => {
        if (!window.confirm("선택한 항목을 복구하시겠습니까?")) return;
        
        try {
            await restoreTrashItem(entityType, id);
            toast.success("항목이 성공적으로 복구되었습니다.");
            loadTrashItems();
        } catch (error) {
            toast.error("복구 중 오류가 발생했습니다.");
        }
    };

    const handleHardDelete = async (entityType, id) => {
        if (!window.confirm("정말로 이 항목을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

        try {
            await hardDeleteTrashItem(entityType, id);
            toast.success("항목이 영구 삭제되었습니다.");
            loadTrashItems();
        } catch (error) {
            toast.error("영구 삭제 중 오류가 발생했습니다.");
        }
    };

    const colDefs = useMemo(() => [
        { 
            headerName: '유형', 
            field: 'entityType', 
            width: 150,
            cellRenderer: (p) => {
                const types = {
                    'PRODUCT': '📦 제품',
                    'INBOUND': '📥 입고품질',
                    'AUDIT': '📸 생산감리',
                    'CLAIM': '🔍 클레임',
                    'MANUFACTURER': '🏭 제조사',
                    'MANUFACTURER_AUDIT': '📝 제조사 Audit'
                };
                return types[p.value] || p.value;
            }
        },
        { headerName: '식별코드', field: 'identifier', width: 200 },
        { headerName: '내용/명칭', field: 'displayTitle', width: 350, flex: 1 },
        { 
            headerName: '삭제일시', 
            field: 'deletedAt', 
            width: 180,
            valueFormatter: p => p.value ? p.value.replace('T', ' ').substring(0, 19) : '-'
        },
        { 
            headerName: '삭제자', 
            field: 'deletedBy', 
            width: 150,
            valueFormatter: p => p.value || '시스템'
        },
        {
            headerName: '관리',
            width: 180,
            sortable: false,
            filter: false,
            cellRenderer: (p) => (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '100%' }}>
                    <button 
                        onClick={() => handleRestore(p.data.entityType, p.data.id)} 
                        className="secondary" 
                        style={{ padding: '2px 10px', fontSize: '11px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
                    >
                        🔄 복구
                    </button>
                    {isAdmin && (
                        <button 
                            onClick={() => handleHardDelete(p.data.entityType, p.data.id)} 
                            className="danger" 
                            style={{ padding: '2px 10px', fontSize: '11px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                        >
                            🗑️ 영구삭제
                        </button>
                    )}
                </div>
            )
        }
    ], [isAdmin]);

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
            
            {/* 2단계 표준 헤더 레이아웃 */}
            <div className="page-header-standard" style={{ 
                marginBottom: '20px', 
                flexDirection: 'column', 
                alignItems: 'flex-start', 
                gap: '12px',
                padding: '24px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #f1f5f9'
            }}>
                {/* 1단계: 생성 및 연동 (최상단) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            🗑️ 데이터 복구 (휴지통)
                        </h2>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="outline" 
                            onClick={fetchTrashItems} 
                            style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: '800', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}
                        >
                            🔄 새로고침
                        </button>
                    </div>
                </div>

                {/* 2단계: 핵심 제어 (중단) */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    width: '100%', 
                    alignItems: 'center', 
                    padding: '12px 0', 
                    borderTop: '1px solid #f1f5f9',
                    borderBottom: '1px solid #f1f5f9'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                        소프트 삭제된 데이터를 확인하고 복구하거나 영구적으로 삭제할 수 있습니다.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="outline" 
                            onClick={() => alert("휴지통 내역 엑셀 다운로드 기능 준비 중입니다.")}
                            style={{ fontSize: '14px', padding: '10px 20px', backgroundColor: '#fff', color: '#107c41', borderColor: '#107c41' }}
                        >
                            📊 결과 다운로드
                        </button>
                        <button 
                            className="primary" 
                            onClick={fetchTrashItems} 
                            style={{ backgroundColor: '#2563eb', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            🔍 조회
                        </button>
                        <button 
                            className="outline" 
                            onClick={() => {}} 
                            style={{ padding: '10px 16px', fontSize: '14px' }}
                        >
                            ♻️ 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 검색 필터 그리드 */}
            <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔍 삭제 내역 검색</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="식별코드, 명칭, 삭제자 검색..."
                                style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                                onKeyDown={(e) => e.key === 'Enter' && fetchTrashItems()}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 데이터 카드 */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', flex: 1, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '15px', fontWeight: '800', fontSize: '14px', color: '#64748b' }}>
                    휴지통 보관 수: <span style={{ color: '#2563eb' }}>{rowData.length}</span> 건
                </div>
                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                    <AgGridReact
                        theme="legacy"
                        rowHeight={55}
                        rowData={rowData}
                        columnDefs={colDefs}
                        pagination={true}
                        paginationPageSize={50}
                        animateRows={true}
                    />
                </div>
            </div>
        </div>
    );
};

export default TrashBinPage;
