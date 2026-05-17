import React, { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { AgGridReact } from 'ag-grid-react';
import api from './api';
import { usePermissions } from './usePermissions';

const IngredientCompliancePage = ({ user }) => {
    const { canEdit, hasPerm, isAdmin } = usePermissions(user);
    const hasSyncPermission = canEdit('ingredientCompliance') || hasPerm('INGREDIENT_SAFETY_SYNC') || isAdmin;

    const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' or 'lookup'
    const [file, setFile] = useState(null);
    const [analysisResults, setAnalysisResults] = useState([]);
    const [dbIngredients, setDbIngredients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [searchFields, setSearchFields] = useState({
        inciName: '',
        status: ''
    });
    const [globalSyncing, setGlobalSyncing] = useState(false);
    const [editModal, setEditModal] = useState({ isOpen: false, data: null });
    const [showConfirmModal, setShowConfirmModal] = useState(false); // [FIX] 동기화 확인 팝업 상태 추가
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);
    const gridRef = useRef(null);

    const prevSyncingRef = useRef(false);

    useEffect(() => {
        checkSyncStatus();
        const interval = setInterval(checkSyncStatus, 3000); // Check every 3s for faster detection
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeTab === 'lookup' && !globalSyncing) {
            fetchDbIngredients();
        }
    }, [activeTab, globalSyncing]);

    // [FIX] 동기화 완료 감지 → 자동 데이터 새로고침 + 토스트 알림
    useEffect(() => {
        if (prevSyncingRef.current === true && globalSyncing === false) {
            showToast('✅ 식약처(MFDS) 규제 데이터 동기화가 완료되었습니다! 최신 데이터가 자동으로 로드됩니다.', 'success');
            fetchDbIngredients();
        }
        prevSyncingRef.current = globalSyncing;
    }, [globalSyncing]);

    const checkSyncStatus = async () => {
        try {
            const response = await api.get('/api/quality/ingredients/sync-status', { skipLoading: true, skipToast: true });
            const newSyncing = !!response.data;
            setGlobalSyncing(prev => {
                if (prev !== newSyncing) return newSyncing;
                return prev;
            });
        } catch (error) {
            console.error('Status check error:', error);
        }
    };

    const fetchDbIngredients = async () => {
        setLookupLoading(true);
        try {
            const response = await api.get('/api/quality/ingredients/list', { skipLoading: true, skipToast: true });
            // Backend returns ApiResponse { success, data, message }
            const list = response.data.data || response.data;
            if (Array.isArray(list)) {
                setDbIngredients(list);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLookupLoading(false);
        }
    };

    const handleSaveIngredient = async () => {
        if (!editModal.data || !editModal.data.id) return;
        setSaving(true);
        try {
            await api.put(`/api/quality/ingredients/${editModal.data.id}`, editModal.data);
            showToast('성분 규제 정보가 수정되었습니다.', 'success');
            setEditModal({ isOpen: false, data: null });
            fetchDbIngredients();
        } catch (error) {
            console.error('Update error:', error);
            showToast('수정 중 오류가 발생했습니다.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleManualSync = () => {
        // [FIX] 동기화 실행 시 즉시 컨펌 모달 오픈
        setShowConfirmModal(true);
    };

    const executeManualSync = async (countries = ['KR', 'EU', 'US', 'CN', 'JP']) => {
        setShowConfirmModal(false);
        // [FIX] 즉시 화면 수정/조회 차단 락아웃 활성화 (3초 지연 제거)
        setGlobalSyncing(true);
        setLookupLoading(true);
        try {
            const countryParams = countries.join(',');
            await api.post(`/api/quality/ingredients/sync?countries=${countryParams}`);
            showToast('데이터 동기화가 백그라운드에서 성공적으로 시작되었습니다.', 'success');
            fetchDbIngredients();
        } catch (error) {
            console.error('Sync error:', error);
            showToast('동기화 중 오류가 발생했습니다.', 'error');
            // 에러 발생 시에만 락아웃 해제
            setGlobalSyncing(false);
        } finally {
            setLookupLoading(false);
        }
    }; const handleExport = async () => {
        try {
            const response = await api.get('/api/quality/ingredients/export', { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Global_Ingredient_Regulations_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            showToast('엑셀 다운로드 중 오류가 발생했습니다.', 'error');
        }
    };

    const filteredIngredients = useMemo(() => {
        return dbIngredients.filter(item => {
            if (!item || !item.inciName) return false;

            const inci = item.inciName ? item.inciName.toLowerCase() : "";
            const kor = item.koreanName ? item.koreanName.toLowerCase() : "";
            const search = searchFields.inciName.toLowerCase();

            const matchesInci = inci.includes(search);
            const matchesKorean = kor.includes(search);
            const matchesStatus = !searchFields.status ||
                [item.krStatus, item.euStatus, item.cnStatus, item.usStatus, item.jpStatus].includes(searchFields.status);

            return (matchesInci || matchesKorean) && matchesStatus;
        });
    }, [dbIngredients, searchFields]);

    const stats = useMemo(() => {
        const total = dbIngredients.length;
        const prohibited = dbIngredients.filter(i => [i.krStatus, i.euStatus, i.cnStatus, i.usStatus, i.jpStatus].includes('PROHIBITED')).length;
        const restricted = dbIngredients.filter(i => [i.krStatus, i.euStatus, i.cnStatus, i.usStatus, i.jpStatus].includes('RESTRICTED')).length;
        const allowed = total - prohibited - restricted;
        return { total, prohibited, restricted, allowed };
    }, [dbIngredients]);

    const colDefs = useMemo(() => [
        { field: "inciName", headerName: "INCI Name (Eng)", filter: true, width: 440, pinned: 'left' },
        { field: "koreanName", headerName: "성분명 (Kor)", filter: true, width: 360, pinned: 'left', cellStyle: { fontWeight: 'bold', color: '#2b6cb0' } },
        { field: "casNumber", headerName: "CAS No.", filter: true, width: 120 },
        {
            field: "krStatus",
            headerName: "한국 (KR)",
            width: 150,
            cellRenderer: p => (
                <div className="status-cell">
                    {getStatusPill(p.value)}
                    {p.data.krLimit && <small className="limit-text">{p.data.krLimit}% 한도</small>}
                </div>
            )
        },
        {
            field: "euStatus",
            headerName: "유럽 (EU)",
            width: 150,
            cellRenderer: p => {
                const status = p.value || (p.data.euLimit ? 'RESTRICTED' : null);
                return (
                    <div className="status-cell">
                        {getStatusPill(status)}
                        {status === 'RESTRICTED' && (
                            <small className="limit-text">
                                {p.data.euLimit ? `${p.data.euLimit}% 한도` : '수치미상'}
                            </small>
                        )}
                    </div>
                );
            }
        },
        {
            field: "cnStatus",
            headerName: "중국 (CN)",
            width: 150,
            cellRenderer: p => {
                const status = p.value || (p.data.cnLimit ? 'RESTRICTED' : null);
                return (
                    <div className="status-cell">
                        {getStatusPill(status)}
                        {status === 'RESTRICTED' && (
                            <small className="limit-text">
                                {p.data.cnLimit ? `${p.data.cnLimit}% 한도` : '수치미상'}
                            </small>
                        )}
                    </div>
                );
            }
        },
        {
            field: "usStatus",
            headerName: "미국 (US)",
            width: 150,
            cellRenderer: p => {
                const status = p.value || (p.data.usLimit ? 'RESTRICTED' : null);
                return (
                    <div className="status-cell">
                        {getStatusPill(status)}
                        {status === 'RESTRICTED' && (
                            <small className="limit-text">
                                {p.data.usLimit ? `${p.data.usLimit}% 한도` : '수치미상'}
                            </small>
                        )}
                    </div>
                );
            }
        },
        {
            field: "jpStatus",
            headerName: "일본 (JP)",
            width: 150,
            cellRenderer: p => {
                const status = p.value || (p.data.jpLimit ? 'RESTRICTED' : null);
                return (
                    <div className="status-cell">
                        {getStatusPill(status)}
                        {status === 'RESTRICTED' && (
                            <small className="limit-text">
                                {p.data.jpLimit ? `${p.data.jpLimit}% 한도` : '수치미상'}
                            </small>
                        )}
                    </div>
                );
            }
        },
        {
            field: "lastUpdated",
            headerName: "최종 업데이트",
            width: 150,
            valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '-'
        },
        {
            field: "remarks",
            headerName: "상세 비고 (제품유형별)",
            width: 350,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
            cellRenderer: p => {
                const details = p.data.limitDetails || p.data.ingredient_limit_details || [];
                const remarks = p.value || "";
                if (details.length === 0) return <span style={{ color: '#a0aec0' }}>{remarks || '-'}</span>;
                
                return (
                    <div style={{ lineHeight: '1.4', padding: '4px 0' }}>
                        {remarks && <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>{remarks}</div>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {details.map((d, i) => (
                                <span key={i} style={{ fontSize: '10px', background: '#edf2f7', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                    {d.country}: {d.productType} ({d.limitPercent}%)
                                </span>
                            ))}
                        </div>
                    </div>
                );
            }
        },
        {
            headerName: "작업",
            width: 100,
            pinned: 'right',
            cellRenderer: p => (
                <button 
                    className="btn-primary" 
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={() => setEditModal({ isOpen: true, data: { ...p.data } })}
                >
                    🔧 수정
                </button>
            )
        }
    ], []);

    const showToast = (msg, type) => {
        if (type === 'error') toast.error(msg);
        else if (type === 'warning') toast.warning(msg);
        else toast.success(msg);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
            setFile(selectedFile);
        } else {
            showToast('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.', 'error');
            setFile(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            showToast('업로드할 파일을 선택해주세요.', 'warning');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/api/quality/ingredients/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // [Fix] api utility unwraps data
            if (Array.isArray(response.data)) {
                setAnalysisResults(response.data);
                showToast('분석이 완료되었습니다.', 'success');
            } else if (response.data && response.data.success) {
                setAnalysisResults(response.data.data);
                showToast('분석이 완료되었습니다.', 'success');
            }
        } catch (error) {
            console.error('Analysis error:', error);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setAnalysisResults([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getStatusPill = (status) => {
        switch (status) {
            case 'ALLOWED': return <span className="status-pill pill-success">사용가능</span>;
            case 'RESTRICTED': return <span className="status-pill pill-warning">배합한도</span>;
            case 'PROHIBITED': return <span className="status-pill pill-danger">사용불가</span>;
            default: return <span className="status-pill pill-info">미지정</span>;
        }
    };

    return (
        <div className="page-container" style={{ position: 'relative' }}>
            {globalSyncing ? (
                /* Global Syncing Blocked Screen */
                <div className="sync-locked-container animate-fade-in" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 40px',
                    margin: '20px auto',
                    maxWidth: '800px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid #bee3f8',
                    borderRadius: '24px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    textAlign: 'center',
                    gap: '28px'
                }}>
                    <div style={{
                        width: '85px',
                        height: '85px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3182ce 0%, #319795 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 15px -3px rgba(49, 130, 206, 0.3)',
                        fontSize: '38px',
                        color: 'white',
                        animation: 'spin 10s linear infinite'
                    }}>
                        🌍
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h3 style={{ margin: 0, color: '#2b6cb0', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                            식약처(MFDS) 및 글로벌 규제 표준 동기화 중
                        </h3>
                        <p style={{ margin: 0, color: '#4a5568', fontSize: '13px', fontWeight: '700' }}>
                            무중단 글로벌 규제 정합성 실시간 검증 및 DB 적재 (약 2~3분 소요)
                        </p>
                    </div>

                    <div style={{
                        maxWidth: '600px',
                        color: '#4a5568',
                        fontSize: '14px',
                        lineHeight: '1.75',
                        background: '#f7fafc',
                        padding: '24px 28px',
                        borderRadius: '18px',
                        border: '1px solid #edf2f7',
                        fontWeight: '500',
                        textAlign: 'left'
                    }}>
                        <strong style={{ color: '#2b6cb0', display: 'block', marginBottom: '8px', fontSize: '15px' }}>ℹ️ 안전 동기화 진행 상태 안내</strong>
                        현재 백엔드 서버에서 <strong style={{ color: '#2b6cb0' }}>2.5만 건 이상의 원자성 규제 정보</strong>를 식약처 공공 OpenAPI로부터 동적으로 가져와 실시간 구조 파싱 작업을 하고 있습니다.
                        <br />
                        <span style={{ color: '#e53e3e', fontWeight: '700' }}>
                            ⚠️ 동기화 도중 데이터 조회나 필터 검색을 시도하면 불완전한 결과가 조회되거나 무결성이 훼손될 위험이 있습니다.
                        </span>
                        <br />
                        이에 따라 데이터 안전 보호를 위해 성분 조회 화면이 일시 차단되며, 완료되는 순간 **성공 알림 토스트와 함께 모든 검색 기능이 깨끗하게 자동 복원**됩니다.
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '320px' }}>
                        <div className="spinner-large" style={{
                            width: '45px',
                            height: '45px',
                            border: '3px solid #edf2f7',
                            borderTop: '3px solid #3182ce',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                        <span style={{ fontSize: '12.5px', color: '#4a5568', fontWeight: '700' }}>
                            백그라운드 동기화 완료 대기 중...
                        </span>
                    </div>

                    <div style={{
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '20px',
                        width: '100%',
                        fontSize: '13px',
                        color: '#4a5568',
                        fontWeight: '600'
                    }}>
                        💡 <strong style={{ color: '#319795' }}>작업 팁:</strong> 동기화는 백그라운드 스레드에서 완전히 독립적으로 동작합니다. 기다리지 마시고 왼쪽 메뉴를 이용해 다른 페이지로 이동하여 즉시 일반 업무를 보셔도 안전합니다.
                    </div>
                </div>
            ) : (
                <>
                    <div className="page-header" style={{ padding: '20px 24px', background: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '5px' }}>
                        <div className="header-title-area">
                            <h1 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                🧪 성분 안전성 검토 <span style={{ fontSize: '12px', background: '#ebf8ff', color: '#3182ce', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>Global Compliance</span>
                            </h1>
                        </div>
                        <div className="header-actions">
                            {!globalSyncing && activeTab === 'analysis' && (
                                <>
                                    <button className="btn-secondary" onClick={reset} style={{ padding: '8px 16px' }}>📎 파일 재선택</button>
                                    <button className="btn-primary" onClick={handleUpload} disabled={loading || !file} style={{ padding: '8px 24px' }}>
                                        {loading ? '분석 중...' : '검토 시작'}
                                    </button>
                                </>
                            )}
                            {!globalSyncing && activeTab === 'lookup' && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {hasSyncPermission && (
                                        <button className="btn-secondary" onClick={handleManualSync} disabled={lookupLoading} style={{ padding: '8px 16px', fontWeight: '700', color: '#2b6cb0', background: '#ebf8ff', borderColor: '#bee3f8' }}>
                                            {lookupLoading ? '⏳ 동기화 중...' : '🌍 전체 동기화 (고속)'}
                                        </button>
                                    )}
                                    <button className="btn-outline" onClick={handleExport} style={{ padding: '8px 16px' }}>📂 엑셀 다운로드</button>
                                    <button className="btn-primary" onClick={fetchDbIngredients} disabled={lookupLoading} style={{ padding: '8px 16px' }}>새로고침</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* [FIX] 데이터 조회 중 전면 오버레이 (버그 오인 방지용) */}
                    {lookupLoading && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(3px)',
                            zIndex: 999,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '16px'
                        }}>
                            <div style={{
                                padding: '30px 40px',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '20px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '16px'
                            }}>
                                <div className="spinner-large" style={{
                                    width: '45px',
                                    height: '45px',
                                    border: '4px solid #edf2f7',
                                    borderTop: '4px solid #3182ce',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }}></div>
                                <div>
                                    <h4 style={{ margin: '0 0 4px 0', color: '#2d3748', fontSize: '16px', fontWeight: '800' }}>📋 규제 데이터 조회 중...</h4>
                                    <p style={{ margin: 0, color: '#718096', fontSize: '12px', fontWeight: '500' }}>데이터베이스로부터 대용량 표준 성분을 읽어오고 있습니다.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="stats-grid mb-4" style={{ marginBottom: '5px' }}>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: '#ebf8ff', color: '#3182ce' }}>📊</div>
                            <div className="stat-info">
                                <span className="stat-label">전체 관리 성분</span>
                                <span className="stat-value">{stats.total} <small>건</small></span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: '#fff5f5', color: '#e53e3e' }}>❌</div>
                            <div className="stat-info">
                                <span className="stat-label">글로벌 사용불가</span>
                                <span className="stat-value" style={{ color: '#e53e3e' }}>{stats.prohibited} <small>건</small></span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: '#fffaf0', color: '#dd6b20' }}>⚠️</div>
                            <div className="stat-info">
                                <span className="stat-label">배합한도 관리</span>
                                <span className="stat-value" style={{ color: '#dd6b20' }}>{stats.restricted} <small>건</small></span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: '#f0fff4', color: '#38a169' }}>✅</div>
                            <div className="stat-info">
                                <span className="stat-label">정상 사용 가능</span>
                                <span className="stat-value" style={{ color: '#38a169' }}>{stats.allowed} <small>건</small></span>
                            </div>
                        </div>
                    </div>

                    <div className="tabs-container mb-4" style={{ marginBottom: '5px' }}>
                        <button
                            className={`tab-item ${activeTab === 'analysis' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analysis')}
                        >
                            📑 성분 안전성 분석
                        </button>
                        <button
                            className={`tab-item ${activeTab === 'lookup' ? 'active' : ''}`}
                            onClick={() => setActiveTab('lookup')}
                        >
                            🔍 규제 성분 DB 조회
                        </button>
                    </div>

                    {activeTab === 'analysis' ? (
                        <>
                            <div className="content-card mb-4">
                                <div className="upload-section">
                                    <div className={`drop-zone ${file ? 'has-file' : ''}`} onClick={() => fileInputRef.current.click()}>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                            accept=".xlsx, .xls"
                                        />
                                        <div className="upload-icon">📁</div>
                                        {file ? (
                                            <div className="file-info">
                                                <span className="file-name">{file.name}</span>
                                                <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                                            </div>
                                        ) : (
                                            <p>엑셀 파일을 클릭하거나 이곳에 드래그하세요. (INCI명, 함량% 포함)</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {analysisResults.length > 0 && (
                                <div className="content-card animate-fade-in">
                                    <div className="card-header">
                                        <h2>분석 결과 보고서</h2>
                                        <span className="badge badge-info">{analysisResults.length}개 성분 분석됨</span>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="modern-table">
                                            <thead>
                                                <tr>
                                                    <th>성분명 (INCI Name)</th>
                                                    <th>함량 (%)</th>
                                                    <th>상태</th>
                                                    <th>상세 메시지</th>
                                                    <th>위반 국가</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {analysisResults.map((item, idx) => (
                                                    <tr key={idx} className={item.status === 'DANGER' ? 'row-danger' : item.status === 'CAUTION' ? 'row-warning' : ''}>
                                                        <td className="font-bold">{item.inciName}</td>
                                                        <td>{item.percentage}%</td>
                                                        <td>
                                                            <span className={`status-pill ${item.status === 'DANGER' ? 'pill-danger' : item.status === 'CAUTION' ? 'pill-warning' : 'pill-success'}`}>
                                                                {item.status === 'DANGER' ? '위반' : item.status === 'CAUTION' ? '주의' : '적합'}
                                                            </span>
                                                        </td>
                                                        <td>{item.message}</td>
                                                        <td>
                                                            {item.countryViolations.map((v, i) => (
                                                                <span key={i} className="violation-tag">{v}</span>
                                                            ))}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="lookup-container animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {/* 검색 필터 영역 */}
                            <div className="filter-card">
                                <div className="filter-grid">
                                    <div className="filter-item">
                                        <label>🧪 성분명 (INCI / 한글)</label>
                                        <input
                                            type="text"
                                            placeholder="영문명 또는 한글명 검색..."
                                            value={searchFields.inciName}
                                            onChange={(e) => setSearchFields({ ...searchFields, inciName: e.target.value })}
                                        />
                                    </div>
                                    <div className="filter-item">
                                        <label>🚩 규제 유형</label>
                                        <select
                                            value={searchFields.status}
                                            onChange={(e) => setSearchFields({ ...searchFields, status: e.target.value })}
                                        >
                                            <option value="">전체 보기</option>
                                            <option value="ALLOWED">사용 가능 (ALLOWED)</option>
                                            <option value="RESTRICTED">배합 한도 (RESTRICTED)</option>
                                            <option value="PROHIBITED">사용 불가 (PROHIBITED)</option>
                                        </select>
                                    </div>
                                    <div className="filter-actions">
                                        <button className="btn-outline" onClick={() => setSearchFields({ inciName: '', status: '' })}>
                                            ♻️ 검색 초기화
                                        </button>
                                        <button className="btn-primary" onClick={fetchDbIngredients}>
                                            🔍 검색
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 그리드 영역 */}
                            <div className="grid-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div className="ag-theme-alpine" style={{ flex: 1, width: '100%', minHeight: '500px' }}>
                                    <AgGridReact
                                        ref={gridRef}
                                        theme="legacy"
                                        rowData={filteredIngredients}
                                        columnDefs={colDefs}
                                        onRowDoubleClicked={(e) => setEditModal({ isOpen: true, data: { ...e.data } })}
                                        loadingOverlayComponent={() => <div>데이터를 불러오는 중...</div>}
                                        noRowsOverlayComponent={() => <div>검색 결과가 없습니다.</div>}
                                        pagination={true}
                                        paginationPageSize={100}
                                        paginationPageSizeSelector={false}
                                        animateRows={true}
                                        rowHeight={60}
                                        headerHeight={50}
                                        suppressCellFocus={true}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <style>{`
                .page-container {
                    padding: 5px;
                    background: #f7fafc;
                    min-height: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .tabs-container {
                    display: flex;
                    gap: 10px;
                    border-bottom: 2px solid #edf2f7;
                    padding-bottom: 0;
                }
                .tab-item {
                    padding: 12px 24px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-weight: 600;
                    color: #718096;
                    border-bottom: 3px solid transparent;
                    transition: all 0.3s;
                }
                .tab-item:hover {
                    color: #2d3748;
                }
                .tab-item.active {
                    color: #3182ce;
                    border-bottom-color: #3182ce;
                }
                .upload-section {
                    padding: 20px;
                    text-align: center;
                }
                .drop-zone {
                    border: 2px dashed #e2e8f0;
                    border-radius: 12px;
                    padding: 40px;
                    cursor: pointer;
                    transition: all 0.3s;
                    background: #f8fafc;
                }
                .drop-zone:hover {
                    border-color: #3182ce;
                    background: #ebf8ff;
                }
                .drop-zone.has-file {
                    border-color: #48bb78;
                    background: #f0fff4;
                }
                .upload-icon {
                    font-size: 40px;
                    margin-bottom: 15px;
                }
                .file-name {
                    font-weight: 700;
                    color: #2d3748;
                    display: block;
                }
                .file-size {
                    color: #718096;
                    font-size: 12px;
                }
                .violation-tag {
                    display: inline-block;
                    background: #fff5f5;
                    color: #c53030;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 700;
                    margin-right: 5px;
                    border: 1px solid #feb2b2;
                }
                .row-danger {
                    background-color: #fff5f5;
                }
                .row-warning {
                    background-color: #fffaf0;
                }
                .lookup-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .filter-card {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }
                .filter-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr auto;
                    gap: 20px;
                    align-items: flex-end;
                }
                .filter-item {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .filter-item label {
                    font-size: 13px;
                    font-weight: 700;
                    color: #4a5568;
                }
                .filter-item input, .filter-item select {
                    padding: 10px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }
                .filter-item input:focus {
                    outline: none;
                    border-color: #3182ce;
                    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
                }
                .filter-actions {
                    display: flex;
                    gap: 10px;
                }
                .grid-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                }
                .status-cell {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    height: 100%;
                    line-height: 1.2;
                }
                .limit-text {
                    color: #718096;
                    font-size: 11px;
                    margin-top: 2px;
                }
                .btn-outline {
                    padding: 10px 20px;
                    background: white;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-weight: 600;
                    color: #4a5568;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-outline:hover {
                    background: #f7fafc;
                    border-color: #a0aec0;
                }
                .sync-dropdown {
                    position: relative;
                    display: inline-block;
                }
                .dropdown-content {
                    display: none;
                    position: absolute;
                    right: 0;
                    background-color: #ffffff;
                    min-width: 200px;
                    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
                    z-index: 1000;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    padding: 8px 0;
                    margin-top: 5px;
                }
                .dropdown-content button {
                    color: #4a5568;
                    padding: 12px 16px;
                    text-decoration: none;
                    display: block;
                    width: 100%;
                    text-align: left;
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background 0.2s;
                }
                .dropdown-content button:hover {
                    background-color: #f7fafc;
                    color: #2d3748;
                }
                .sync-dropdown:hover .dropdown-content {
                    display: block;
                }
                .dropdown-content hr {
                    border: 0;
                    border-top: 1px solid #edf2f7;
                    margin: 8px 0;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                }
                .stat-card {
                    background: white;
                    padding: 15px 20px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                }
                .stat-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }
                .stat-info {
                    display: flex;
                    flex-direction: column;
                }
                .stat-label {
                    font-size: 11px;
                    font-weight: 700;
                    color: #718096;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .stat-value {
                    font-size: 18px;
                    font-weight: 800;
                    color: #2d3748;
                }
                .stat-value small {
                    font-size: 12px;
                    font-weight: 600;
                    color: #a0aec0;
                }
                .header-info {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .sync-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(4px);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 20px;
                }
                .sync-message-card {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    text-align: center;
                    max-width: 450px;
                    border: 1px solid #edf2f7;
                }
                .sync-message-card h3 {
                    margin: 20px 0 10px;
                    color: #2d3748;
                    font-size: 20px;
                    font-weight: 800;
                }
                .sync-message-card p {
                    color: #4a5568;
                    line-height: 1.6;
                    margin-bottom: 20px;
                }
                .small-info {
                    font-size: 13px;
                    color: #718096 !important;
                }
                .spinner-large {
                    width: 50px;
                    height: 50px;
                    border: 4px solid #edf2f7;
                    border-top: 4px solid #3182ce;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .progress-bar-container {
                    width: 100%;
                    height: 8px;
                    background: #edf2f7;
                    border-radius: 4px;
                    overflow: hidden;
                }
                .progress-bar-fill {
                    height: 100%;
                    width: 60%;
                    background: linear-gradient(90deg, #4299e1, #667eea);
                    border-radius: 4px;
                    animation: progressLoop 2s infinite ease-in-out;
                }
                @keyframes progressLoop {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 3000;
                }
                .modal-content {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    width: 600px;
                    max-width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                }
                .edit-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-top: 20px;
                }
                .edit-item {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .edit-item label {
                    font-size: 13px;
                    font-weight: 600;
                    color: #4a5568;
                }
                .edit-item input, .edit-item select {
                    padding: 8px;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                }
                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 24px;
                    padding-top: 16px;
                    border-top: 1px solid #edf2f7;
                }
            `}</style>

            {editModal.isOpen && editModal.data && (
                <div className="modal-overlay">
                    <div className="modal-content animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '800' }}>🧪 성분 규제 정보 수정</h2>
                            <button className="btn-outline" onClick={() => setEditModal({ isOpen: false, data: null })} style={{ padding: '4px 8px' }}>✕</button>
                        </div>
                        
                        <div style={{ background: '#f7fafc', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#2d3748' }}>{editModal.data.inciName}</div>
                            <div style={{ fontSize: '13px', color: '#718096' }}>{editModal.data.koreanName || '한글명 미등록'}</div>
                        </div>

                        <div className="edit-grid">
                            <div className="edit-item">
                                <label>CAS No.</label>
                                <input 
                                    type="text" 
                                    value={editModal.data.casNumber || ''} 
                                    onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, casNumber: e.target.value } })}
                                />
                            </div>
                            <div className="edit-item">
                                <label>비고 (Remarks)</label>
                                <input 
                                    type="text" 
                                    value={editModal.data.remarks || ''} 
                                    onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, remarks: e.target.value } })}
                                />
                            </div>
                            
                            {/* KR */}
                            <div className="edit-item">
                                <label>🇰🇷 한국 (KR) 상태</label>
                                <select value={editModal.data.krStatus || ''} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, krStatus: e.target.value } })}>
                                    <option value="">미지정</option>
                                    <option value="ALLOWED">사용가능</option>
                                    <option value="RESTRICTED">배합한도</option>
                                    <option value="PROHIBITED">사용불가</option>
                                </select>
                            </div>
                            <div className="edit-item">
                                <label>KR 한도 (%)</label>
                                <input type="number" step="0.01" value={editModal.data.krLimit || ''} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, krLimit: e.target.value ? parseFloat(e.target.value) : null } })} />
                            </div>

                            {/* EU */}
                            <div className="edit-item">
                                <label>🇪🇺 유럽 (EU) 상태</label>
                                <select value={editModal.data.euStatus || ''} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, euStatus: e.target.value } })}>
                                    <option value="">미지정</option>
                                    <option value="ALLOWED">사용가능</option>
                                    <option value="RESTRICTED">배합한도</option>
                                    <option value="PROHIBITED">사용불가</option>
                                </select>
                            </div>
                            <div className="edit-item">
                                <label>EU 한도 (%)</label>
                                <input type="number" step="0.01" value={editModal.data.euLimit || ''} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, euLimit: e.target.value ? parseFloat(e.target.value) : null } })} />
                            </div>

                            {/* CN */}
                            <div className="edit-item">
                                <label>🇨🇳 중국 (CN) 상태</label>
                                <select value={editModal.data.cnStatus || ''} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, cnStatus: e.target.value } })}>
                                    <option value="">미지정</option>
                                    <option value="ALLOWED">사용가능</option>
                                    <option value="RESTRICTED">배합한도</option>
                                    <option value="PROHIBITED">사용불가</option>
                                </select>
                            </div>
                            <div className="edit-item">
                                <label>CN 한도 (%)</label>
                                <input type="number" step="0.01" value={editModal.data.cnLimit || ''} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, cnLimit: e.target.value ? parseFloat(e.target.value) : null } })} />
                            </div>

                            {/* US */}
                            <div className="edit-item">
                                <label>🇺🇸 미국 (US) 상태</label>
                                <select value={editModal.data.usStatus || ''} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, usStatus: e.target.value } })}>
                                    <option value="">미지정</option>
                                    <option value="ALLOWED">사용가능</option>
                                    <option value="RESTRICTED">배합한도</option>
                                    <option value="PROHIBITED">사용불가</option>
                                </select>
                            </div>
                            <div className="edit-item">
                                <label>US 한도 (%)</label>
                                <input type="number" step="0.01" value={editModal.data.usLimit || ''} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, usLimit: e.target.value ? parseFloat(e.target.value) : null } })} />
                            </div>

                            {/* JP */}
                            <div className="edit-item">
                                <label>🇯🇵 일본 (JP) 상태</label>
                                <select value={editModal.data.jpStatus || ''} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, jpStatus: e.target.value } })}>
                                    <option value="">미지정</option>
                                    <option value="ALLOWED">사용가능</option>
                                    <option value="RESTRICTED">배합한도</option>
                                    <option value="PROHIBITED">사용불가</option>
                                </select>
                            </div>
                            <div className="edit-item">
                                <label>JP 한도 (%)</label>
                                <input type="number" step="0.01" value={editModal.data.jpLimit || ''} onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, jpLimit: e.target.value ? parseFloat(e.target.value) : null } })} />
                            </div>
                        </div>

                        {/* Granular Limits Section */}
                        <div style={{ marginTop: '24px', borderTop: '2px solid #edf2f7', paddingTop: '16px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#2d3748', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                📋 제품 유형별 상세 한도 (Granular Limits)
                                <button className="btn-secondary" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => {
                                    const newDetail = { country: 'KR', productType: '', limitPercent: 0, conditionText: '', isManual: true };
                                    const details = editModal.data.ingredient_limit_details || [];
                                    setEditModal({ ...editModal, data: { ...editModal.data, ingredient_limit_details: [...details, newDetail] } });
                                }}>+ 추가</button>
                            </h3>
                            
                            <div className="granular-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(editModal.data.ingredient_limit_details || []).map((detail, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 120px 80px 1fr 40px', gap: '8px', alignItems: 'center', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <select value={detail.country} onChange={e => {
                                            const newDetails = [...editModal.data.ingredient_limit_details];
                                            newDetails[idx].country = e.target.value;
                                            setEditModal({ ...editModal, data: { ...editModal.data, ingredient_limit_details: newDetails } });
                                        }} style={{ padding: '4px' }}>
                                            <option value="KR">KR</option>
                                            <option value="EU">EU</option>
                                            <option value="CN">CN</option>
                                            <option value="US">US</option>
                                            <option value="JP">JP</option>
                                        </select>
                                        <input type="text" placeholder="유형 (예: 씻어내는)" value={detail.productType || ''} onChange={e => {
                                            const newDetails = [...editModal.data.ingredient_limit_details];
                                            newDetails[idx].productType = e.target.value;
                                            setEditModal({ ...editModal, data: { ...editModal.data, ingredient_limit_details: newDetails } });
                                        }} style={{ padding: '4px' }} />
                                        <input type="number" step="0.01" placeholder="%" value={detail.limitPercent || 0} onChange={e => {
                                            const newDetails = [...editModal.data.ingredient_limit_details];
                                            newDetails[idx].limitPercent = parseFloat(e.target.value);
                                            setEditModal({ ...editModal, data: { ...editModal.data, ingredient_limit_details: newDetails } });
                                        }} style={{ padding: '4px' }} />
                                        <input type="text" placeholder="상세 조건" value={detail.conditionText || ''} onChange={e => {
                                            const newDetails = [...editModal.data.ingredient_limit_details];
                                            newDetails[idx].conditionText = e.target.value;
                                            setEditModal({ ...editModal, data: { ...editModal.data, ingredient_limit_details: newDetails } });
                                        }} style={{ padding: '4px' }} />
                                        <button className="btn-outline" onClick={() => {
                                            const newDetails = editModal.data.ingredient_limit_details.filter((_, i) => i !== idx);
                                            setEditModal({ ...editModal, data: { ...editModal.data, ingredient_limit_details: newDetails } });
                                        }} style={{ padding: '4px', color: '#e53e3e', borderColor: '#feb2b2' }}>✕</button>
                                    </div>
                                ))}
                                {(!editModal.data.ingredient_limit_details || editModal.data.ingredient_limit_details.length === 0) && (
                                    <div style={{ textAlign: 'center', color: '#a0aec0', fontSize: '13px', padding: '10px' }}>등록된 상세 한도가 없습니다.</div>
                                )}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setEditModal({ isOpen: false, data: null })}>취소</button>
                            <button className="btn-primary" onClick={handleSaveIngredient} disabled={saving}>
                                {saving ? '저장 중...' : '저장하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showConfirmModal && (
                <div className="modal-overlay animate-fade-in" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(45, 55, 72, 0.4)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div className="modal-container animate-slide-up" style={{
                        width: '100%',
                        maxWidth: '520px',
                        background: 'white',
                        borderRadius: '24px',
                        padding: '30px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid #edf2f7', paddingBottom: '16px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: '#fff5f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                                color: '#e53e3e'
                            }}>
                                ⚠️
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#2d3748' }}>글로벌 규제 동기화 확인</h3>
                                <p style={{ margin: 0, fontSize: '12.5px', color: '#718096', fontWeight: '500' }}>Global Regulatory Database Update</p>
                            </div>
                        </div>

                        <div style={{ fontSize: '14.5px', color: '#4a5568', lineHeight: '1.65', fontWeight: '500' }}>
                            전체 동기화를 하시겠습니까?
                            <br />
                            <span style={{ color: '#e53e3e', fontWeight: '800' }}>
                                🚨 [주의] 전체 동기화 중에는 '성분 안전성 검토' 페이지를 사용할 수 없습니다.
                            </span>
                            <br />
                            동기화가 안전하게 백그라운드에 안착될 때까지 화면 내 조회, 검색 및 편집이 임시 제한됩니다.
                        </div>

                        <div className="modal-actions" style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '10px',
                            borderTop: '1px solid #edf2f7',
                            paddingTop: '16px',
                            marginTop: '4px'
                        }}>
                            <button className="btn-secondary" onClick={() => setShowConfirmModal(false)} style={{ padding: '8px 20px', borderRadius: '10px', fontWeight: '700' }}>
                                닫기
                            </button>
                            <button className="btn-primary" onClick={() => executeManualSync(['KR', 'EU', 'US', 'CN', 'JP'])} style={{
                                padding: '8px 24px',
                                borderRadius: '10px',
                                background: '#e53e3e',
                                borderColor: '#e53e3e',
                                color: 'white',
                                fontWeight: '700',
                                boxShadow: '0 4px 6px -1px rgba(229, 62, 62, 0.2)'
                            }}>
                                동기화 진행
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IngredientCompliancePage;
