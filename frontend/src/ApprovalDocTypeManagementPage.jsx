import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { fetchApprovalDocTypes, saveApprovalDocType } from './api';
import { usePermissions } from './usePermissions';

const SCREEN_PRESETS = [
    { label: '-- 연동할 화면을 선택하세요 --', value: '', table: '', code: '', name: '' },
    { label: '📦 입고품질관리 (출하승인서)', value: '입고품질관리 (출하승인서)', table: 'market_release_records', code: 'MARKET_RELEASE', name: '출하 승인서' },
    { label: '🔍 CX 클레임 관리 (대책보고서)', value: '클레임 관리 (대책보고서)', table: 'claims', code: 'CLAIM_REPORT', name: '클레임 대책보고서' },
    { label: '📸 공정 품질 감사 (생산감리)', value: '공정 품질 감사 (생산감리)', table: 'production_audits', code: 'PROD_AUDIT', name: '공정 품질 감사 보고서' },
    { label: '🏭 제조사 Audit 관리', value: '제조사 Audit 관리', table: 'manufacturer_audits', code: 'MFR_AUDIT', name: '제조사 Audit 보고서' },
    { label: '📝 일반 결재 기안서', value: '일반 결재 기안서', table: 'approval_documents', code: 'GENERAL', name: '일반 결재 기안서' },
    { label: '✍️ 직접 입력', value: 'CUSTOM', table: '', code: '', name: '' }
];

const ApprovalDocTypeManagementPage = ({ 
    user,
    showAlert = (msg) => console.info(msg), 
    showConfirm = (msg, fn) => { if (window.confirm(msg)) fn?.(); } 
}) => {
    const { canView, canEdit, isAdmin } = usePermissions(user);
    const hasView = isAdmin || canView('approvalDocTypes');
    const hasEdit = isAdmin || canEdit('approvalDocTypes');

    const [docTypes, setDocTypes] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDocType, setEditingDocType] = useState(null);
    const [selectedScreenPreset, setSelectedScreenPreset] = useState('');
    const [form, setForm] = useState({ code: '', name: '', sourceScreen: '', sourceTable: '', isActive: true });

    if (user && !hasView) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', borderRadius: '8px', margin: '20px', border: '1px solid #fee2e2' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⛔</div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>접근 권한 없음</h3>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>이 페이지는 결재 문서유형 관리 조회 권한이 있는 사용자만 접근할 수 있습니다.</p>
            </div>
        );
    }

    const loadDocTypes = useCallback(async () => {
        try {
            const res = await fetchApprovalDocTypes(false);
            setDocTypes(res.data || []);
        } catch (err) {
            showAlert?.("결재 문서유형 목록을 불러오지 못했습니다.");
        }
    }, [showAlert]);

    useEffect(() => {
        loadDocTypes();
    }, [loadDocTypes]);

    const handleScreenPresetChange = (presetValue) => {
        setSelectedScreenPreset(presetValue);
        const preset = SCREEN_PRESETS.find(p => p.value === presetValue);
        if (preset && preset.value && preset.value !== 'CUSTOM') {
            setForm(prev => ({
                ...prev,
                sourceScreen: preset.value,
                sourceTable: preset.table,
                code: (!editingDocType && preset.code) ? preset.code : prev.code,
                name: (!prev.name.trim() && preset.name) ? preset.name : prev.name
            }));
        } else if (presetValue === 'CUSTOM') {
            // 직접 입력 모드로 전환
            setForm(prev => ({
                ...prev,
                sourceScreen: prev.sourceScreen || '',
                sourceTable: prev.sourceTable || ''
            }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name?.trim()) {
            showAlert?.("문서유형 명칭을 입력해 주세요.");
            return;
        }
        if (!editingDocType && !form.code?.trim()) {
            showAlert?.("문서유형 코드를 입력해 주세요.");
            return;
        }

        try {
            await saveApprovalDocType({
                ...form,
                id: editingDocType?.id
            });
            showAlert?.(editingDocType ? "문서유형이 수정되었습니다." : "새 문서유형이 등록되었습니다.");
            setModalOpen(false);
            setEditingDocType(null);
            loadDocTypes();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || "문서유형 저장 실패";
            showAlert?.(typeof msg === 'string' ? msg : "문서유형 저장 실패");
        }
    };

    const handleToggleActive = (docType) => {
        const nextState = !docType.isActive;
        showConfirm?.(`'${docType.name}' 문서유형을 ${nextState ? '활성화' : '비활성화'}하시겠습니까?`, async () => {
            try {
                await saveApprovalDocType({
                    ...docType,
                    isActive: nextState
                });
                showAlert?.(`문서유형이 ${nextState ? '활성화' : '비활성화'}되었습니다.`);
                loadDocTypes();
            } catch (err) {
                showAlert?.("상태 변경 실패");
            }
        });
    };

    const columnDefs = useMemo(() => [
        { headerName: 'ID', field: 'id', width: 70, cellStyle: { textAlign: 'center' } },
        { headerName: '문서유형 코드', field: 'code', width: 140, cellStyle: { fontWeight: 'bold' } },
        { headerName: '문서유형 명칭', field: 'name', width: 180, cellStyle: { color: '#1e40af', fontWeight: 'bold' } },
        {
            headerName: '연동된 화면', field: 'sourceScreen', width: 220,
            cellRenderer: (p) => {
                const screen = p.value || (p.data.sourceTable === 'claims' ? '클레임 관리 (대책보고서)'
                    : p.data.sourceTable === 'market_release_records' ? '입고품질관리 (출하승인서)'
                    : p.data.sourceTable === 'production_audits' ? '공정 품질 감사 (생산감리)'
                    : p.data.sourceTable === 'manufacturer_audits' ? '제조사 Audit 관리'
                    : p.data.sourceTable === 'approval_documents' ? '일반 결재 기안서'
                    : '-');
                return (
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>
                        🖥️ {screen}
                    </span>
                );
            }
        },
        { headerName: '연동 원본 테이블', field: 'sourceTable', width: 160, cellStyle: { fontFamily: 'monospace', color: '#64748b' } },
        {
            headerName: '템플릿 등록 여부', field: 'hasCurrentTemplate', width: 130, cellStyle: { textAlign: 'center' },
            cellRenderer: (p) => (
                <span style={{
                    padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                    backgroundColor: p.value ? '#e0f2fe' : '#fef3c7',
                    color: p.value ? '#0369a1' : '#92400e'
                }}>
                    {p.value ? '✅ 템플릿 있음' : '⚠️ 미등록'}
                </span>
            )
        },
        {
            headerName: '상태', field: 'isActive', width: 90, cellStyle: { textAlign: 'center' },
            cellRenderer: (p) => (
                <span style={{
                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                    backgroundColor: p.value ? '#dcfce7' : '#fee2e2',
                    color: p.value ? '#15803d' : '#b91c1c'
                }}>
                    {p.value ? '사용중' : '중지'}
                </span>
            )
        },
        {
            headerName: '관리', width: 140, cellRenderer: (p) => {
                const item = p.data;
                if (!item) return null;
                return (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '100%' }}>
                        <button
                            onClick={() => {
                                setEditingDocType(item);
                                const matchedPreset = SCREEN_PRESETS.find(pr => pr.value === item.sourceScreen || pr.table === item.sourceTable);
                                setSelectedScreenPreset(matchedPreset ? matchedPreset.value : (item.sourceScreen ? 'CUSTOM' : ''));
                                setForm({
                                    code: item.code,
                                    name: item.name,
                                    sourceScreen: item.sourceScreen || '',
                                    sourceTable: item.sourceTable,
                                    isActive: item.isActive
                                });
                                setModalOpen(true);
                            }}
                            style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            {hasEdit ? '✏️ 수정' : '👁️ 조회'}
                        </button>
                        {hasEdit && (
                            <button
                                onClick={() => handleToggleActive(item)}
                                style={{
                                    padding: '3px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer',
                                    backgroundColor: item.isActive ? '#fee2e2' : '#dcfce7',
                                    color: item.isActive ? '#b91c1c' : '#15803d',
                                    border: '1px solid #cbd5e1'
                                }}
                            >
                                {item.isActive ? '비활성' : '활성'}
                            </button>
                        )}
                    </div>
                );
            }
        }
    ], [handleToggleActive, hasEdit]);

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                        📑 결재 문서유형 마스터 관리
                    </h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                        생산감리, 제조사 Audit, CX 클레임 등 결재 대상이 되는 비즈니스 문서 유형과 연동 화면을 등록하고 관리합니다.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {hasEdit && (
                        <button
                            onClick={() => {
                                setEditingDocType(null);
                                setSelectedScreenPreset('');
                                setForm({ code: '', name: '', sourceScreen: '', sourceTable: '', isActive: true });
                                setModalOpen(true);
                            }}
                            style={{ padding: '8px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                        >
                            ➕ 신규 문서유형 등록
                        </button>
                    )}
                    <button
                        onClick={loadDocTypes}
                        style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                    >
                        🔄 새로고침
                    </button>
                </div>
            </div>

            <div className="ag-theme-alpine" style={{ width: '100%', flex: 1, minHeight: '400px' }}>
                <AgGridReact
                    theme="legacy"
                    rowData={docTypes}
                    columnDefs={columnDefs}
                    animateRows={true}
                    headerHeight={40}
                    rowHeight={46}
                    defaultColDef={{ resizable: true, sortable: true, filter: true }}
                />
            </div>

            {/* 등록/수정 모달 */}
            {modalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '10px', width: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
                                {!hasEdit ? '문서유형 상세정보 (조회)' : editingDocType ? '문서유형 수정' : '신규 결재 문서유형 등록'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>

                        <form onSubmit={hasEdit ? handleSave : (e) => { e.preventDefault(); setModalOpen(false); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* 화면 선택 드롭다운 (요청사항 반영) */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                                    연동 화면 선택 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    value={selectedScreenPreset}
                                    onChange={(e) => handleScreenPresetChange(e.target.value)}
                                    disabled={!hasEdit}
                                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: !hasEdit ? '#f1f5f9' : '#f8fafc', fontWeight: '600' }}
                                >
                                    {SCREEN_PRESETS.map((preset, idx) => (
                                        <option key={idx} value={preset.value}>
                                            {preset.label}
                                        </option>
                                    ))}
                                </select>
                                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                                    화면을 선택하면 연동 원본 테이블과 권장 코드가 자동으로 매핑됩니다.
                                </span>
                            </div>

                            {/* 연동된 화면 명칭 (표시용/커스텀) */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                                    연동 화면 명칭 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.sourceScreen}
                                    onChange={(e) => setForm({ ...form, sourceScreen: e.target.value })}
                                    disabled={!hasEdit}
                                    placeholder="예: 클레임 관리 (대책보고서)"
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: !hasEdit ? '#f1f5f9' : '#fff' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                                    유형 코드 (영문 대문자) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    disabled={!hasEdit || !!editingDocType}
                                    placeholder="예: PROD_AUDIT, MFR_AUDIT"
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: (!hasEdit || editingDocType) ? '#f1f5f9' : '#fff' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                                    문서유형 명칭 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    disabled={!hasEdit}
                                    placeholder="예: 생산감리, 제조사 Audit"
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: !hasEdit ? '#f1f5f9' : '#fff' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                                    연동 원본 테이블명 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.sourceTable}
                                    onChange={(e) => setForm({ ...form, sourceTable: e.target.value })}
                                    disabled={!hasEdit}
                                    placeholder="예: production_audits, claims"
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: !hasEdit ? '#f1f5f9' : '#fff' }}
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                                >
                                    {hasEdit ? '취소' : '닫기'}
                                </button>
                                {hasEdit && (
                                    <button
                                        type="submit"
                                        style={{ padding: '8px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        저장
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalDocTypeManagementPage;
