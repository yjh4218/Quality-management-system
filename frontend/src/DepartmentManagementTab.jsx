import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
    fetchAdminDepartments,
    saveDepartment,
    deleteDepartment,
    assignDepartmentRole,
    removeDepartmentRole,
    fetchDepartmentRoleHistory,
    fetchCompanyUsersForApproval,
    getManufacturers,
    initBatchDepartments
} from './api';

const DepartmentManagementTab = ({ 
    currentUser, 
    showAlert = (msg) => console.info(msg), 
    showConfirm = (msg, fn) => { if (window.confirm(msg)) fn?.(); } 
}) => {
    const isAdmin = currentUser?.role?.includes('ADMIN') || currentUser?.roles?.some(r => (r.authority || r).includes('ROLE_ADMIN'));
    const userCompany = currentUser?.companyName || '';

    const [manufacturers, setManufacturers] = useState([]);
    const [isBatchRegistering, setIsBatchRegistering] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(isAdmin ? '' : userCompany);
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState(null);
    const [roleHistory, setRoleHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // 모달 상태
    const [deptModalOpen, setDeptModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [deptForm, setDeptForm] = useState({ companyName: userCompany, code: '', name: '', displayOrder: 1, isActive: true });

    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [roleForm, setRoleForm] = useState({ roleCode: 'DEPT_HEAD', userId: '' });
    const [userSearchText, setUserSearchText] = useState('');
    const [companyUsers, setCompanyUsers] = useState([]);

    const loadDepartments = useCallback(async () => {
        try {
            const res = await fetchAdminDepartments(selectedCompany || undefined, false);
            setDepartments(res.data || []);
            if (selectedDept) {
                const refreshed = (res.data || []).find(d => d.id === selectedDept.id);
                setSelectedDept(refreshed || null);
            }
        } catch (err) {
            showAlert?.("부서 목록을 불러오지 못했습니다.");
        }
    }, [selectedCompany, selectedDept, showAlert]);

    useEffect(() => {
        loadDepartments();
    }, [selectedCompany]);

    // 등록된 제조원 마스터 동적 로드
    useEffect(() => {
        const loadMfrs = async () => {
            try {
                const res = await getManufacturers();
                setManufacturers(res.data || []);
            } catch (e) {
                console.error("Failed to load manufacturers", e);
            }
        };
        loadMfrs();
    }, []);

    // 하드코딩 없는 동적 회사 목록 (로그인 회사 + 등록 제조원 + 부서 등록 회사 통합)
    const companyOptions = useMemo(() => {
        const set = new Set();
        if (userCompany) set.add(userCompany);
        manufacturers.forEach(m => {
            const mName = m.name?.trim() || m.manufacturerName?.trim();
            if (mName) set.add(mName);
        });
        departments.forEach(d => {
            if (d.companyName && d.companyName.trim()) set.add(d.companyName.trim());
        });
        return Array.from(set).sort();
    }, [userCompany, manufacturers, departments]);

    // 표준 6개 부서 일괄 등록 핸들러
    const handleBatchInitDepartments = async () => {
        const targetName = selectedCompany || "전체 제조사";
        const msg = selectedCompany 
            ? `'${selectedCompany}'에 6개 표준 부서(영업, 생산관리, QC, 구매/SCM, R&D, 경영지원)를 일괄 등록하시겠습니까?`
            : "부서가 누락된 모든 제조원에 표준 6개 부서를 일괄 등록하시겠습니까?";

        showConfirm?.(msg, async () => {
            try {
                setIsBatchRegistering(true);
                await initBatchDepartments(selectedCompany || undefined);
                showAlert?.(`${targetName}의 표준 부서가 성공적으로 일괄 등록되었습니다.`);
                await loadDepartments();
            } catch (err) {
                showAlert?.("부서 일괄 등록에 실패했습니다.");
            } finally {
                setIsBatchRegistering(false);
            }
        });
    };

    const handleSelectDept = useCallback((dept) => {
        setSelectedDept(dept);
        setShowHistory(false);
    }, []);

    const loadRoleHistory = useCallback(async (deptId) => {
        try {
            const res = await fetchDepartmentRoleHistory(deptId);
            setRoleHistory(res.data || []);
            setShowHistory(true);
        } catch (err) {
            showAlert?.("역할 이력을 불러오지 못했습니다.");
        }
    }, [showAlert]);

    // 회사 사용자 검색
    const searchUsers = useCallback(async (kw) => {
        try {
            const targetCompany = selectedDept?.companyName || userCompany;
            const res = await fetchCompanyUsersForApproval(kw, targetCompany);
            setCompanyUsers(res.data || []);
        } catch (err) {
            console.error("Failed to search users", err);
        }
    }, [selectedDept, userCompany]);

    useEffect(() => {
        if (roleModalOpen) {
            searchUsers(userSearchText);
        }
    }, [roleModalOpen, userSearchText, searchUsers]);

    // 부서 저장 핸들러
    const handleSaveDept = async (e) => {
        e.preventDefault();
        if (!deptForm.name?.trim()) {
            showAlert?.("부서명을 입력해 주세요.");
            return;
        }
        if (!editingDept && !deptForm.code?.trim()) {
            showAlert?.("부서 코드를 입력해 주세요.");
            return;
        }

        try {
            await saveDepartment({
                ...deptForm,
                id: editingDept?.id
            });
            showAlert?.(editingDept ? "부서 정보가 수정되었습니다." : "새 부서가 등록되었습니다.");
            setDeptModalOpen(false);
            setEditingDept(null);
            loadDepartments();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || "부서 저장에 실패했습니다.";
            showAlert?.(typeof msg === 'string' ? msg : "부서 저장에 실패했습니다.");
        }
    };

    // 부서 비활성화
    const handleDeleteDept = (dept) => {
        showConfirm?.(`'${dept.name}' 부서를 비활성화하시겠습니까?`, async () => {
            try {
                await deleteDepartment(dept.id);
                showAlert?.("부서가 비활성화되었습니다.");
                loadDepartments();
            } catch (err) {
                showAlert?.("부서 비활성화에 실패했습니다.");
            }
        });
    };

    // 역할 지정 핸들러
    const handleAssignRole = async (e) => {
        e.preventDefault();
        if (!selectedDept) return;
        if (!roleForm.userId) {
            showAlert?.("대상 사용자를 선택해 주세요.");
            return;
        }

        try {
            await assignDepartmentRole(selectedDept.id, {
                roleCode: roleForm.roleCode,
                userId: Number(roleForm.userId)
            });
            showAlert?.("부서 역할이 성공적으로 지정되었습니다.");
            setRoleModalOpen(false);
            setRoleForm({ roleCode: 'DEPT_HEAD', userId: '' });
            loadDepartments();
        } catch (err) {
            showAlert?.("역할 지정에 실패했습니다.");
        }
    };

    // 역할 해제 핸들러
    const handleRemoveRole = (role) => {
        showConfirm?.(`'${role.roleName}' 역할을 해제하시겠습니까?`, async () => {
            try {
                await removeDepartmentRole(selectedDept.id, role.roleCode);
                showAlert?.("역할이 해제되었습니다.");
                loadDepartments();
            } catch (err) {
                showAlert?.("역할 해제에 실패했습니다.");
            }
        });
    };

    // AG Grid 컬럼 정의
    const columnDefs = useMemo(() => [
        { headerName: 'ID', field: 'id', width: 70, cellStyle: { textAlign: 'center' } },
        { headerName: '소속 회사', field: 'companyName', width: 130 },
        { headerName: '부서 코드', field: 'code', width: 110, cellStyle: { fontWeight: 'bold' } },
        { headerName: '부서명', field: 'name', width: 150, cellStyle: { color: '#1e40af', fontWeight: 'bold' } },
        {
            headerName: '현재 부서장', field: 'departmentHeadName', width: 140,
            cellRenderer: (p) => p.value ? (
                <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                    👑 {p.value}
                </span>
            ) : <span style={{ color: '#94a3b8', fontSize: '12px' }}>- 미지정 -</span>
        },
        { headerName: '정렬 순서', field: 'displayOrder', width: 90, cellStyle: { textAlign: 'center' } },
        {
            headerName: '상태', field: 'isActive', width: 90,
            cellRenderer: (p) => (
                <span style={{
                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                    backgroundColor: p.value ? '#dcfce7' : '#fee2e2',
                    color: p.value ? '#15803d' : '#b91c1c'
                }}>
                    {p.value ? '활성' : '비활성'}
                </span>
            )
        },
        {
            headerName: '관리', width: 140, cellRenderer: (p) => {
                const dept = p.data;
                if (!dept) return null;
                return (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingDept(dept);
                                setDeptForm({
                                    companyName: dept.companyName,
                                    code: dept.code,
                                    name: dept.name,
                                    displayOrder: dept.displayOrder,
                                    isActive: dept.isActive
                                });
                                setDeptModalOpen(true);
                            }}
                            style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            ✏️ 수정
                        </button>
                        {dept.isActive && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDept(dept);
                                }}
                                style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                🗑️ 비활성
                            </button>
                        )}
                    </div>
                );
            }
        }
    ], [handleDeleteDept]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: 0 }}>
            {/* 상단 툴바 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>🏢 회사 구분:</span>
                    {isAdmin ? (
                        <select
                            value={selectedCompany}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', minWidth: '200px' }}
                        >
                            <option value="">전체 회사 ({companyOptions.length}개 사)</option>
                            {companyOptions.map(c => (
                                <option key={c} value={c}>
                                    {c} {c === userCompany ? '(소속/본사)' : '(제조원)'}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{userCompany || '소속 회사'}</span>
                    )}
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                        총 <b>{departments.length}</b>개 부서
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {isAdmin && (
                        <button
                            onClick={handleBatchInitDepartments}
                            disabled={isBatchRegistering}
                            style={{
                                padding: '8px 14px',
                                backgroundColor: '#0284c7',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                fontSize: '13px',
                                cursor: isBatchRegistering ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: isBatchRegistering ? 0.7 : 1
                            }}
                            title="선택된 회사 또는 부서가 없는 제조원에 6대 표준 부서(영업, 생산관리, QC, 구매, R&D, 경영지원)를 일괄 등록합니다."
                        >
                            🏢 {isBatchRegistering ? '일괄 등록 중...' : (selectedCompany ? `'${selectedCompany}' 표준 부서 일괄 등록` : '제조원 표준 부서 일괄 등록')}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setEditingDept(null);
                            setDeptForm({
                                companyName: selectedCompany || userCompany || (companyOptions[0] || ''),
                                code: '',
                                name: '',
                                displayOrder: departments.length + 1,
                                isActive: true
                            });
                            setDeptModalOpen(true);
                        }}
                        style={{ padding: '8px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                    >
                        ➕ 신규 부서 등록
                    </button>
                    <button
                        onClick={loadDepartments}
                        style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                    >
                        🔄 새로고침
                    </button>
                </div>
            </div>

            {/* 메인 분할 뷰: 좌측 부서 목록, 우측 선택 부서의 역할 마스터 */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedDept ? '1fr 400px' : '1fr', gap: '16px', flex: 1, minHeight: 0 }}>
                {/* 부서 목록 그리드 */}
                <div className="ag-theme-alpine" style={{ width: '100%', height: '100%', minHeight: '350px' }}>
                    <AgGridReact
                        theme="legacy"
                        rowData={departments}
                        columnDefs={columnDefs}
                        rowSelection={{ mode: 'singleRow' }}
                        onRowClicked={(e) => handleSelectDept(e.data)}
                        animateRows={true}
                        headerHeight={40}
                        rowHeight={40}
                        defaultColDef={{ resizable: true, sortable: true, filter: true }}
                    />
                </div>

                {/* 우측 부서 역할 마스터 패널 */}
                {selectedDept && (
                    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{selectedDept.companyName} / {selectedDept.code}</div>
                                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: '4px 0 0 0' }}>
                                    {selectedDept.name} 역할 마스터
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedDept(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* 역할 탭 / 이력 탭 전환 */}
                        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                            <button
                                onClick={() => setShowHistory(false)}
                                style={{
                                    padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '4px', border: 'none',
                                    backgroundColor: !showHistory ? '#0f172a' : 'transparent',
                                    color: !showHistory ? '#fff' : '#64748b',
                                    cursor: 'pointer'
                                }}
                            >
                                현재 역할 ({selectedDept.roles?.length || 0})
                            </button>
                            <button
                                onClick={() => loadRoleHistory(selectedDept.id)}
                                style={{
                                    padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '4px', border: 'none',
                                    backgroundColor: showHistory ? '#0f172a' : 'transparent',
                                    color: showHistory ? '#fff' : '#64748b',
                                    cursor: 'pointer'
                                }}
                            >
                                📜 역할 변경 이력
                            </button>
                        </div>

                        {!showHistory ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: '#475569' }}>
                                        부서장·팀장 지정 시 결재선에서 동적으로 매핑됩니다.
                                    </span>
                                    <button
                                        onClick={() => {
                                            setRoleForm({ roleCode: 'DEPT_HEAD', userId: '' });
                                            setUserSearchText('');
                                            setRoleModalOpen(true);
                                        }}
                                        style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        ➕ 역할 지정
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {(!selectedDept.roles || selectedDept.roles.length === 0) ? (
                                        <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '13px' }}>
                                            지정된 역할이 없습니다.<br />부서장을 먼저 지정해 주십시오.
                                        </div>
                                    ) : (
                                        selectedDept.roles.map(r => (
                                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{
                                                            fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px',
                                                            backgroundColor: r.roleCode === 'DEPT_HEAD' ? '#fef3c7' : '#e0e7ff',
                                                            color: r.roleCode === 'DEPT_HEAD' ? '#92400e' : '#3730a3'
                                                        }}>
                                                            {r.roleName}
                                                        </span>
                                                        <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e293b' }}>
                                                            {r.userName}
                                                        </span>
                                                        <span style={{ fontSize: '11px', color: '#64748b' }}>({r.username})</span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                                        지정일: {r.startedAt ? new Date(r.startedAt).toLocaleDateString() : '-'}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveRole(r)}
                                                    style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    해제
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            /* 역할 변경 이력 타임라인 */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                                {roleHistory.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
                                        변경 이력이 없습니다.
                                    </div>
                                ) : (
                                    roleHistory.map(h => (
                                        <div key={h.id} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{h.roleName}: {h.userName}</span>
                                                <span style={{
                                                    fontSize: '10px', padding: '1px 6px', borderRadius: '10px',
                                                    backgroundColor: h.isActive ? '#dcfce7' : '#f1f5f9',
                                                    color: h.isActive ? '#15803d' : '#64748b'
                                                }}>
                                                    {h.isActive ? '현재 재임' : '종료'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                                {h.startedAt ? new Date(h.startedAt).toLocaleDateString() : ''} ~ {h.endedAt ? new Date(h.endedAt).toLocaleDateString() : '현재'}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 부서 추가/수정 모달 */}
            {deptModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '10px', width: '420px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#0f172a' }}>
                            {editingDept ? '부서 정보 수정' : '신규 부서 등록'}
                        </h3>
                        <form onSubmit={handleSaveDept} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>소속 회사</label>
                                <input
                                    type="text"
                                    value={deptForm.companyName}
                                    onChange={(e) => setDeptForm({ ...deptForm, companyName: e.target.value })}
                                    disabled={!isAdmin}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>부서 코드 (영문 대문자)</label>
                                <input
                                    type="text"
                                    value={deptForm.code}
                                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                                    disabled={!!editingDept}
                                    placeholder="예: SALES, QC, PLANNING"
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>부서명</label>
                                <input
                                    type="text"
                                    value={deptForm.name}
                                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                                    placeholder="예: 품질관리팀, 영업팀"
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>표시 순서</label>
                                <input
                                    type="number"
                                    value={deptForm.displayOrder}
                                    onChange={(e) => setDeptForm({ ...deptForm, displayOrder: parseInt(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setDeptModalOpen(false)}
                                    style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 역할 지정 모달 */}
            {roleModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '10px', width: '420px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#0f172a' }}>
                            [{selectedDept?.name}] 부서 역할 지정
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                            새 담당자를 지정하면 이전 담당자의 이력은 자동 보존되며 종료일시가 갱신됩니다.
                        </p>
                        <form onSubmit={handleAssignRole} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>역할 선택</label>
                                <select
                                    value={roleForm.roleCode}
                                    onChange={(e) => setRoleForm({ ...roleForm, roleCode: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                >
                                    <option value="DEPT_HEAD">부서장 (DEPT_HEAD)</option>
                                    <option value="DEPUTY_HEAD">부부서장 (DEPUTY_HEAD)</option>
                                    <option value="TEAM_LEAD">팀장 (TEAM_LEAD)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                                    사용자 검색 ({selectedDept?.companyName})
                                </label>
                                <input
                                    type="text"
                                    value={userSearchText}
                                    onChange={(e) => setUserSearchText(e.target.value)}
                                    placeholder="이름 또는 아이디 검색..."
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '8px' }}
                                />
                                <select
                                    value={roleForm.userId}
                                    onChange={(e) => setRoleForm({ ...roleForm, userId: e.target.value })}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', maxHeight: '120px' }}
                                    required
                                >
                                    <option value="">-- 담당자를 선택해 주세요 --</option>
                                    {companyUsers.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.username}) - {u.department || '부서미지정'} / {u.position || '직급미지정'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setRoleModalOpen(false)}
                                    style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    지정하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentManagementTab;
