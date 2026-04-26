import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { getAdminLogs, restoreProduct, hardDeleteProduct, restoreManufacturer, hardDeleteManufacturer, rollbackAuditLog } from './api';
import { usePermissions } from './usePermissions';

const LogManagementPage = ({ user }) => {
    const { canEdit, canDelete } = usePermissions(user);
    const [rowData, setRowData] = useState([]);
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // [추가] 필터 상태 (기본값: 최근 7일)
    const [filters, setFilters] = useState(() => {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        
        const formatDate = (date) => date.toISOString().split('T')[0];
        
        return {
            startDate: formatDate(sevenDaysAgo),
            endDate: formatDate(today),
            entityType: '',
            entityId: ''
        };
    });

    const fetchLogs = async () => {
        try {
            const res = await getAdminLogs({ ...filters, size: 1000 });
            setRowData(res.data.content || []);
        } catch (error) {
            alert("로그 정보를 불러오지 못했습니다.");
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [filters.entityType]); // Refetch on type change or manually via button

    const handleRollback = async (logId) => {
        if (!window.confirm("선택하신 시점의 이전 데이터 내용으로 항목을 롤백(덮어쓰기)하시겠습니까?")) return;
        try {
            await rollbackAuditLog(logId);
            alert("롤백 성공적으로 처리되었습니다.");
            setIsModalOpen(false);
            fetchLogs();
        } catch (err) {
            alert(err.response?.data?.message || "롤백 실패");
        }
    };

    const handleRestore = async (params) => {
        const { entityType, entityId, action } = params.data;
        if (action !== 'DELETE') {
            alert("복구는 '삭제(DELETE)' 항목에 대해서만 가능합니다.");
            return;
        }

        if (!window.confirm(`${entityType} [ID: ${entityId}] 항목을 복구하시겠습니까?`)) return;

        try {
            if (entityType === 'PRODUCT') {
                await restoreProduct(entityId);
            } else if (entityType === 'MANUFACTURER') {
                await restoreManufacturer(entityId);
            } else {
                alert("지원하지 않는 엔티티 타입입니다.");
                return;
            }
            alert("복구되었습니다.");
            fetchLogs();
        } catch (err) {
            alert("복구 실패");
        }
    };

    const handleHardDelete = async (params) => {
        const { entityType, entityId } = params.data;
        if (!window.confirm(`${entityType} [ID: ${entityId}] 항목을 시스템에서 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

        try {
            if (entityType === 'PRODUCT') {
                await hardDeleteProduct(entityId);
            } else if (entityType === 'MANUFACTURER') {
                await hardDeleteManufacturer(entityId);
            } else {
                alert("지원하지 않는 엔티티 타입입니다.");
                return;
            }
            alert("영구 삭제되었습니다.");
            fetchLogs();
        } catch (err) {
            alert("영구 삭제 실패");
        }
    };

    const ActionsRenderer = (params) => {
        const { action } = params.data;
        const disabled = !canDelete('logs');
        return (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '100%', opacity: disabled ? 0.5 : 1 }}>
                {action === 'DELETE' && (
                    <button
                        onClick={() => !disabled && handleRestore(params)}
                        disabled={disabled}
                        style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: disabled ? 'not-allowed' : 'pointer' }}
                    >
                        복구
                    </button>
                )}
                <button
                    onClick={() => !disabled && handleHardDelete(params)}
                    disabled={disabled}
                    style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: disabled ? 'not-allowed' : 'pointer' }}
                >
                    영구 삭제
                </button>
            </div>
        );
    };

    const colDefs = useMemo(() => [
        { field: "modifiedAt", headerName: "변경 일시", width: 180, valueFormatter: p => p.value?.replace('T', ' ') },
        { field: "modifierName", headerName: "변경자 성함", width: 120 },
        { field: "modifierUsername", headerName: "ID (로그인)", width: 120 },
        { field: "modifierCompany", headerName: "소속(업체명)", width: 150 },
        {
            field: "entityType", headerName: "유형", width: 110, cellStyle: p => {
                if (p.value === 'PRODUCT') return { color: '#003366', fontWeight: 'bold' };
                if (p.value === 'CLAIM') return { color: '#e67e22', fontWeight: 'bold' };
                if (p.value === 'INBOUND') return { color: '#27ae60', fontWeight: 'bold' };
                if (p.value === 'MANUFACTURER') return { color: '#2c3e50', fontWeight: 'bold' };
                if (p.value === 'BRAND') return { color: '#8e44ad', fontWeight: 'bold' };
                return null;
            }
        },
        {
            field: "action", headerName: "액션", width: 110, cellStyle: p => {
                if (p.value === 'CREATE') return { color: 'green', fontWeight: 'bold' };
                if (p.value === 'UPDATE') return { color: 'blue', fontWeight: 'bold' };
                if (p.value === 'DELETE') return { color: 'red', fontWeight: 'bold' };
                if (p.value === 'EXPORT') return { color: '#8e44ad', fontWeight: 'bold' };
                return null;
            }
        },
        { field: "description", headerName: "변경 상세 정보", flex: 1 },
        {
            headerName: "시스템 제어",
            cellRenderer: ActionsRenderer,
            width: 180,
            sortable: false,
            filter: false
        }
    ], []);

    const JsonDiffViewer = ({ oldStr, newStr }) => {
        if (!oldStr || oldStr === '-' || oldStr === 'HARD_DELETED' || oldStr.startsWith('{"warning"')) {
            return <div style={{ padding: '10px', color: '#555' }}>{oldStr || '데이터 없음'} <br/> ➡️ <br/> {newStr}</div>;
        }

        const fieldTranslations = {
            'productName': '제품명(한글)', 'englishProductName': '제품명(영문)', 'brand': '브랜드', 'manufacturer': '제조사',
            'capacity': '용량', 'weight': '중량', 'recycleGrade': '재활용 등급', 'recycleEvalNo': '재활용 평가번호',
            'recycleMaterial': '재활용 재질분류', 'parentItemCode': '부모 품목코드', 'isParent': '모품목 여부',
            'isMaster': '마스터 제품 여부', 'isPlanningSet': '기획세트 여부', 'ingredients': '전성분', 'imagePath': '제품 이미지',
            'dimensions': '제품 체적', 'width': '가로', 'length': '세로', 'height': '높이',
            'widthInch': '가로(inch)', 'lengthInch': '세로(inch)', 'heightInch': '높이(inch)',
            'volume': '부피', 'capacityFlOz': '용량(fl.oz)', 'weightOz': '중량(oz)',
            'certStandard': '제품표준서', 'certMsds': 'MSDS', 'certFunction': '기능성보고서', 'certExpiry': '유통기한설정서류',
            'inboxInfo': '인박스 정보', 'outboxInfo': '아웃박스 정보', 'palletInfo': '팔레트 정보', 'channels': '유통국가',
            'components': '구성품', 'packagingCertificates': '사양서/성적서', 'active': '상태',
            'itemCode': '품목코드', 'createdAt': '생성일시', 'status': '상태', 'description': '설명',
            'hasInbox': '인박스 유무', 'inboxWidth': '인박스 가로', 'inboxLength': '인박스 세로', 'inboxHeight': '인박스 높이',
            'inboxWidthInch': '인박스 가로(inch)', 'inboxLengthInch': '인박스 세로(inch)', 'inboxHeightInch': '인박스 높이(inch)',
            'inboxQuantity': '인박스 수량', 'inboxWeight': '중량(kg)', 'inboxWeightLbs': '중량(lbs)',
            'outboxWidth': '가로(mm)', 'outboxLength': '세로(mm)', 'outboxHeight': '높이(mm)',
            'outboxWidthInch': '가로(in)', 'outboxLengthInch': '세로(in)', 'outboxHeightInch': '높이(in)',
            'outboxQuantity': '수량(ea)', 'outboxWeight': '중량(kg)', 'outboxWeightLbs': '중량(lbs)',
            'palletWidth': '가로(mm)', 'palletLength': '세로(mm)', 'palletHeight': '높이(mm)',
            'palletWidthInch': '가로(in)', 'palletLengthInch': '세로(in)', 'palletHeightInch': '높이(in)',
            'palletQuantity': '적재수량(ea)',
            'productType': '제품구분',
            'productionDate': '생산일자', 'containerImages': '용기 사진', 'boxImages': '단상자 사진',
            'loadImages': '적재 사진', 'rejectionReason': '반려사유', 'isDisclosed': '제조사 공개여부',
            'id': '고유 ID', 'name': '이름', 'category': '분류', 'identificationCode': '식별코드',
            'packagingMaterial': '포장재질 정보',
            'manufacturerContainer': '제조사(용기)', 'manufacturerLabel': '제조사(라벨)', 'manufacturerOuterBox': '제조사(단상자)', 'manufacturerEtc': '제조사(기타)',
            'materialBody': '재질(본체)', 'weightBody': '중량(본체)', 'materialCap': '재질(캡)', 'weightCap': '중량(캡)',
            'materialPump': '재질(펌프)', 'weightPump': '중량(펌프)', 'materialSealing': '재질(실링)', 'weightSealing': '중량(실링)',
            'materialLabel': '재질(라벨)', 'weightLabel': '중량(라벨)', 'materialTool': '재질(어플리케이터)', 'weightTool': '중량(어플리케이터)',
            'materialPacking': '재질(포장재)', 'weightPacking': '중량(포장재)', 'materialOuterBox': '재질(아웃박스)', 'weightOuterBox': '중량(아웃박스)',
            'materialEtc': '재질(기타)', 'weightEtc': '중량(기타)', 'materialRemarks': '재질/부자재 비고',
            // Claim fields
            'receiptDate': '접수일', 'claimNumber': '클레임 번호', 'lotNumber': 'LOT 번호', 'occurrenceQty': '발생 수량',
            'qualityStatus': '상시 상태', 'mfrStatus': '제조사 상태', 'terminationDate': '품질 종결일', 'mfrTerminationDate': '제조사 종결일',
            'claimContent': '클레임 내용', 'primaryCategory': '대분류', 'secondaryCategory': '중분류', 'tertiaryCategory': '소분류',
            'sharedWithManufacturer': '제조사 공유 여부', 'qualityRemarks': '품질 비고', 'mfrRemarks': '제조사 비고',
            'rootCauseAnalysis': '원인 분석(품질)', 'preventativeAction': '재발 방지(품질)',
            'mfrRootCauseAnalysis': '원인 분석(제조사)', 'mfrPreventativeAction': '재발 방지(제조사)',
            // Inbound fields
            'overallStatus': '통합 진행 상태', 'inboundInspectionStatus': '입고 검사 상태', 'inboundInspectionResult': '입고 검사 결과',
            'controlSampleStatus': '관리품 상태', 'finalInspectionResult': '최종 판정 결과', 'qualityDecisionDate': '판정 일자',
            'quantity': '입고 수량', 'inboundDate': '입고일', 'coaFileUrl': 'COA (URL)', 'remark': '비고',
            'registrationDate': '등록일'
        };

        const formatFriendly = (val, key) => {
            if (val === null || val === undefined || val === '') return '없음';
            if (typeof val === 'boolean') return val ? '예(O)' : '아니오(X)';
            if (Array.isArray(val)) {
                if (val.length === 0) return '없음';
                return val.map(v => formatFriendly(v, null)).join(', ');
            }
            if (typeof val === 'object') {
                if (val.name) return val.name; // For brand/manufacturer objects
                if (val.fileName) return val.fileName; // For file objects
                return Object.entries(val)
                    .filter(([k, v]) => v !== null && v !== '' && v !== false)
                    .map(([k, v]) => `${fieldTranslations[k] || k}: ${formatFriendly(v, k)}`)
                    .join(' | ');
            }
            // If it's a URL path, get the filename
            if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('/uploads'))) {
                let fileName = decodeURIComponent(val.split('/').pop());
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/;
                const shortUuidRegex = /_[0-9a-f]{8}(\.[a-zA-Z0-9]+)$/;
                return fileName.replace(uuidRegex, '').replace(shortUuidRegex, '$1');
            }
            return String(val);
        };

        let oldObj = {}, newObj = {};
        try { oldObj = JSON.parse(oldStr); } catch(e) { oldObj = { value: oldStr }; }
        try { newObj = JSON.parse(newStr); } catch(e) { newObj = { value: newStr }; }

        if (typeof oldObj !== 'object' || typeof newObj !== 'object' || Array.isArray(oldObj)) {
            return (
                <div style={{ padding: '10px', fontSize: '13px' }}>
                    <div style={{ color: '#e74c3c', textDecoration: 'line-through' }}>{oldStr}</div>
                    <div style={{ color: '#2ecc71', fontWeight: 'bold', marginTop: '5px' }}>{newStr}</div>
                </div>
            );
        }

        const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

        return (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f1f8f5', borderBottom: '2px solid #28a745' }}>
                        <th style={{ padding: '10px', textAlign: 'left', width: '20%', color: '#155724' }}>항목 (Field)</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '40%', color: '#155724' }}>변경 전 (Old Value)</th>
                        <th style={{ padding: '10px', textAlign: 'left', width: '40%', color: '#155724' }}>변경 후 (New Value)</th>
                    </tr>
                </thead>
                <tbody>
                    {allKeys.map(key => {
                        const oldV = oldObj[key];
                        const newV = newObj[key];
                        const oldS = formatFriendly(oldV, key);
                        const newS = formatFriendly(newV, key);
                        
                        // Ignore unchanged fields for cleaner UI, unless creating/deleting
                        if (oldS === newS) return null;
                        
                        const displayKey = fieldTranslations[key] || key;

                        return (
                            <tr key={key} style={{ borderBottom: '1px solid #e9ecef', backgroundColor: '#fff8e1' }}>
                                <td style={{ padding: '8px', fontWeight: 'bold', color: '#555' }}>{displayKey}</td>
                                <td style={{ padding: '8px', color: '#e74c3c', wordBreak: 'break-all', textDecoration: (oldS && oldS !== '없음') ? 'line-through' : 'none' }}>
                                    {oldS}
                                </td>
                                <td style={{ padding: '8px', color: '#2ecc71', wordBreak: 'break-all', fontWeight: 'bold' }}>
                                    {newS}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>📜 시스템 변경 및 감사 이력 (Global Audit Log)</h2>
                    <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>시스템 내 제품, 제조사, 브랜드의 모든 변경 사항(생성, 수정, 삭제)을 추적합니다. (해당 행을 더블 클릭하면 전/후 상세 데이터를 확인할 수 있습니다.)</p>
                </div>
                <button onClick={fetchLogs} className="secondary" style={{ padding: '10px 24px', fontWeight: '600' }}>🔄 로그 새로고침</button>
            </div>

            {/* [추가] 고급 필터 바 */}
            <div className="responsive-filter-grid" style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e9ecef' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>📅 기간:</span>
                    <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                    <span>~</span>
                    <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>📂 섹터(유형):</span>
                    <select value={filters.entityType} onChange={e => setFilters({...filters, entityType: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}>
                        <option value="">전체</option>
                        <option value="PRODUCT">제품 관리</option>
                        <option value="CLAIM">클레임 관리</option>
                        <option value="INBOUND">입고 품질</option>
                        <option value="MANUFACTURER">제조사 관리</option>
                        <option value="BRAND">브랜드 관리</option>
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>🔍 대상 ID/검색:</span>
                    <input placeholder="ID 또는 품목코드" value={filters.entityId} onChange={e => setFilters({...filters, entityId: e.target.value})} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd', width: '130px' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={fetchLogs} style={{ backgroundColor: '#2c3e50', color: 'white', padding: '7px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>🔎 검색</button>
                    <button onClick={() => {
                        const today = new Date();
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(today.getDate() - 7);
                        const formatDate = (date) => date.toISOString().split('T')[0];
                        setFilters({startDate: formatDate(sevenDaysAgo), endDate: formatDate(today), entityType:'', entityId:''});
                    }} style={{ backgroundColor: '#fff', color: '#666', padding: '7px 15px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>초기화</button>
                </div>
            </div>

            <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 280px)', width: '100%' }}>
                <AgGridReact theme="legacy"
                    rowData={rowData}
                    columnDefs={colDefs}
                    pagination={true}
                    paginationPageSize={50}
                    animateRows={true}
                    onRowDoubleClicked={(e) => {
                        setSelectedLog(e.data);
                        setIsModalOpen(true);
                    }}
                    getRowStyle={params => {
                        if (!params.data) return null;
                        if (params.data.action === 'DELETE') return { backgroundColor: '#fff5f5' };
                        return null;
                    }}
                />
            </div>

            {/* 변경 이력 상세 모달 */}
            {isModalOpen && selectedLog && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '800px', maxHeight: '80vh', border: '1px solid #ccc',
                        display: 'flex', flexDirection: 'column',
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                            🔍 변경 상세 내역 [{selectedLog.action}]
                        </h3>
                        <div style={{ fontSize: '13px', marginBottom: '15px' }}>
                            <strong>대상:</strong> {selectedLog.entityType} (ID: {selectedLog.entityId}) <br/>
                            <strong>변경자:</strong> {selectedLog.modifierName || selectedLog.modifier} (ID: {selectedLog.modifierUsername || '-'}, 소속: {selectedLog.modifierCompany || '시스템'}) <br/>
                            <strong>변경일시:</strong> {selectedLog.modifiedAt?.replace('T', ' ')} <br/>
                            <strong>설명:</strong> {selectedLog.description}
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                            <JsonDiffViewer oldStr={selectedLog.oldValue} newStr={selectedLog.newValue} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '15px' }}>
                            {['PRODUCT', 'CLAIM', 'INBOUND'].includes(selectedLog.entityType) && selectedLog.oldValue !== '-' && selectedLog.oldValue !== 'HARD_DELETED' && !selectedLog.oldValue?.startsWith('{"warning"') && (
                                <button 
                                    onClick={() => handleRollback(selectedLog.id)} 
                                    disabled={!canEdit('logs')}
                                    style={{ 
                                        padding: '8px 40px', 
                                        backgroundColor: '#f39c12', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '4px', 
                                        cursor: canEdit('logs') ? 'pointer' : 'not-allowed', 
                                        fontWeight: 'bold',
                                        opacity: canEdit('logs') ? 1 : 0.5
                                    }}
                                >
                                    🔄 이 시점으로 데이터 복원(롤백)
                                </button>
                            )}
                            <button onClick={() => setIsModalOpen(false)} className="secondary" style={{ padding: '8px 40px' }}>닫기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogManagementPage;
