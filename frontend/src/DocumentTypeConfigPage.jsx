import React, { useState, useEffect } from 'react';
import api from './api';

export default function DocumentTypeConfigPage({ user, onBack }) {
    const [customTypes, setCustomTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // 신규 추가 폼 상태
    const [name, setName] = useState('');
    const [scope, setScope] = useState('PRODUCT');
    const [recurrenceType, setRecurrenceType] = useState('ONE_TIME');
    const [periodMonths, setPeriodMonths] = useState(12);

    const [submitting, setSubmitting] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchCustomTypes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/document-requests/custom-types');
            setCustomTypes(res.data || []);
        } catch (err) {
            showToast("커스텀 추가서류 목록 로드 실패", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomTypes();
    }, []);

    const handleCreateType = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            showToast("서류 종류명을 입력해 주십시오.", "error");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: name.trim(),
                scope,
                recurrenceType,
                periodMonths: recurrenceType === 'PERIODIC' ? periodMonths : null,
                isActive: true
            };

            await api.post('/api/document-requests/custom-types', payload);
            showToast("신규 품질서류 종류가 등록 및 전체 배포되었습니다.");
            setName('');
            setRecurrenceType('ONE_TIME');
            setPeriodMonths(12);
            fetchCustomTypes();
        } catch (err) {
            const errorMsg = err.response?.data?.message || "등록 실패";
            showToast(errorMsg, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (id, currentActive) => {
        try {
            await api.put(`/api/document-requests/custom-types/${id}`, { isActive: !currentActive });
            showToast("상태 변경이 저장되었습니다.");
            fetchCustomTypes();
        } catch (err) {
            showToast("상태 변경 저장 실패", "error");
        }
    };

    return (
        <div className="quality-audit-container">
            {toast && (
                <div className={`toast-message ${toast.type}`}>
                    {toast.type === 'error' ? '❌' : '✅'} {toast.message}
                </div>
            )}

            <div className="section-header">
                <h2>⚙️ 품질서류 갱신 주기 및 종류 설정</h2>
                <div className="header-actions">
                    <button className="secondary-btn" onClick={onBack}>
                        ◀ 대시보드로 복귀
                    </button>
                </div>
            </div>

            <div className="config-grid">
                {/* 1. 신규 품질 서류 유형 추가 폼 */}
                <div className="config-form-card">
                    <h3>➕ 신규 추가 품질서류 추가</h3>
                    <form onSubmit={handleCreateType} className="qms-form">
                        <div className="form-group">
                            <label>서류명</label>
                            <input 
                                type="text" 
                                placeholder="예: 비건인증서, 잔류용제분석서..." 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>적용 범위 (Scope)</label>
                            <select value={scope} onChange={(e) => setScope(e.target.value)}>
                                <option value="PRODUCT">📦 품목 단위 (마스터 제품별 제출)</option>
                                <option value="MANUFACTURER">🏭 제조사 단위 (제조처 공통 제출)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>제출 주기 구분</label>
                            <select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}>
                                <option value="ONE_TIME">최초 1회만 제출 (ONE_TIME)</option>
                                <option value="PERIODIC">주기적 자동 갱신 요청 (PERIODIC)</option>
                            </select>
                        </div>

                        {recurrenceType === 'PERIODIC' && (
                            <div className="form-group">
                                <label>갱신 주기 개월 수</label>
                                <div className="input-with-addon">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="60" 
                                        value={periodMonths} 
                                        onChange={(e) => setPeriodMonths(parseInt(e.target.value) || 12)} 
                                    />
                                    <span className="addon">개월</span>
                                </div>
                            </div>
                        )}

                        <button type="submit" className="submit-btn" disabled={submitting}>
                            {submitting ? "배포 생성 중..." : "품질서류 일제 적용 배포"}
                        </button>
                    </form>
                </div>

                {/* 2. 등록된 커스텀 주기 서류 리스트 관리 */}
                <div className="config-list-card">
                    <h3>📋 활성 추가 품질서류 유형 목록</h3>
                    {loading ? (
                        <div className="table-loading">
                            <div className="spinner"></div>
                            <p>서류 설정을 조회 중입니다...</p>
                        </div>
                    ) : (
                        <table className="qms-table">
                            <thead>
                                <tr>
                                    <th>서류명</th>
                                    <th>적용 범위</th>
                                    <th>주기 구분</th>
                                    <th>활성 상태</th>
                                    <th>조작</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customTypes.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="empty-row">
                                            등록된 추가 품질 서류 종류가 존재하지 않습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    customTypes.map(type => (
                                        <tr key={type.id} className={!type.isActive ? 'disabled-row' : ''}>
                                            <td className="font-bold">{type.name}</td>
                                            <td>{type.scope === 'PRODUCT' ? "📦 품목" : "🏭 제조사"}</td>
                                            <td>
                                                {type.recurrenceType === 'ONE_TIME' 
                                                    ? "최초 1회" 
                                                    : `매 ${type.periodMonths || 12}개월`}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${type.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                    {type.isActive ? "활성" : "비활성"}
                                                </span>
                                            </td>
                                            <td>
                                                <button 
                                                    className={`small-btn ${type.isActive ? 'btn-danger-outline' : 'btn-primary-outline'}`}
                                                    onClick={() => handleToggleActive(type.id, type.isActive)}
                                                >
                                                    {type.isActive ? "비활성화" : "활성화"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
