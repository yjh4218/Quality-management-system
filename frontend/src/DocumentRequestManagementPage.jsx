import React, { useState, useEffect, useCallback } from 'react';
import { getBaseURL } from './api';

export default function DocumentRequestManagementPage({ user, onNavigateToConfig }) {
    const [requirements, setRequirements] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(15);

    // 필터링 상태
    const [search, setSearch] = useState('');
    const [manufacturer, setManufacturer] = useState('');
    const [status, setStatus] = useState('');
    const [scope, setScope] = useState('');

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // 메일 발송 팝업 모달 상태
    const [selectedReq, setSelectedReq] = useState(null);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const baseURL = getBaseURL();

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchRequirements = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                search,
                manufacturer,
                status,
                scope,
                page: currentPage,
                size: pageSize
            });

            const res = await fetch(`${baseURL}/api/document-requests?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // 세션/토큰 기조 유지
                }
            });
            const data = await res.json();
            if (res.ok) {
                setRequirements(data.content || []);
                setTotalElements(data.totalElements || 0);
                setTotalPages(data.totalPages || 0);
            } else {
                showToast(data.message || "데이터 조회 실패", "error");
            }
        } catch (err) {
            showToast("서버 통신 에러 발생", "error");
        } finally {
            setLoading(false);
        }
    }, [search, manufacturer, status, scope, currentPage, pageSize, baseURL]);

    useEffect(() => {
        fetchRequirements();
    }, [fetchRequirements]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setCurrentPage(0);
        fetchRequirements();
    };

    // 재발송 모달 열기
    const openReRequestModal = (req) => {
        setSelectedReq(req);
        // 기본 제조사 담당자 메일 주소 로드
        let defaultEmail = '';
        if (req.product && req.product.manufacturerInfo) {
            defaultEmail = req.product.manufacturerInfo.email || '';
        } else if (req.manufacturer) {
            defaultEmail = req.manufacturer.email || '';
        }
        setRecipientEmail(defaultEmail);
        setShowPreviewModal(true);
    };

    // 이메일 실제 전송 API 호출
    const handleSendRequest = async () => {
        if (!recipientEmail || !recipientEmail.includes('@')) {
            showToast("올바른 이메일 주소를 입력해 주십시오.", "error");
            return;
        }

        setPreviewLoading(true);
        try {
            const res = await fetch(`${baseURL}/api/document-requests/${selectedReq.id}/re-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ recipientEmail })
            });

            if (res.ok) {
                showToast("요청 이메일이 발송되었습니다.");
                setShowPreviewModal(false);
                fetchRequirements(); // 상태가 REQUESTED로 갱신되므로 테이블 갱신
            } else {
                const data = await res.json();
                showToast(data.message || "발송 실패", "error");
            }
        } catch (err) {
            showToast("메일 전송 처리 중 오류가 발생했습니다.", "error");
        } finally {
            setPreviewLoading(false);
        }
    };

    const getStatusBadgeClass = (statusStr) => {
        switch (statusStr) {
            case 'PENDING': return 'badge-secondary';
            case 'REQUESTED': return 'badge-primary';
            case 'FULFILLED': return 'badge-success';
            case 'OVERDUE': return 'badge-danger';
            default: return 'badge-secondary';
        }
    };

    const getStatusText = (statusStr) => {
        switch (statusStr) {
            case 'PENDING': return '요청대기';
            case 'REQUESTED': return '요청완료(미회신)';
            case 'FULFILLED': return '제출완료';
            case 'OVERDUE': return '기한연체';
            default: return statusStr;
        }
    };

    const getDocumentName = (req) => {
        if (req.documentEnumType) {
            switch (req.documentEnumType) {
                case 'MSDS': return "MSDS (물질안전보건자료)";
                case 'MANUFACTURING_PROCESS_CHART': return "제조공정도";
                case 'PRODUCT_STANDARD': return "제품표준서";
                case 'STABILITY_TEST': return "안정성테스트보고서";
                default: return req.documentEnumType;
            }
        } else if (req.customDocumentType) {
            return req.customDocumentType.name;
        }
        return "미지정 서류";
    };

    const getTargetName = (req) => {
        if (req.product) {
            return `${req.product.productName} (${req.product.itemCode})`;
        } else if (req.manufacturer) {
            return `[제조처] ${req.manufacturer.name}`;
        }
        return "-";
    };

    const getRecipientEmailText = (req) => {
        if (req.product && req.product.manufacturerInfo) {
            return req.product.manufacturerInfo.email || "(이메일 미등록)";
        } else if (req.manufacturer) {
            return req.manufacturer.email || "(이메일 미등록)";
        }
        return "-";
    };

    return (
        <div className="quality-audit-container">
            {toast && (
                <div className={`toast-message ${toast.type}`}>
                    {toast.type === 'error' ? '❌' : '✅'} {toast.message}
                </div>
            )}

            <div className="section-header">
                <h2>📋 필수 품질서류 관리 대시보드</h2>
                <div className="header-actions">
                    <button className="primary-btn" onClick={onNavigateToConfig}>
                        ⚙️ 추가 서류 주기 설정
                    </button>
                </div>
            </div>

            {/* 필터링 보드 */}
            <form onSubmit={handleSearchSubmit} className="search-filter-card">
                <div className="filter-grid">
                    <div className="filter-item">
                        <label>검색 (품목명 / 코드)</label>
                        <input 
                            type="text" 
                            placeholder="품목정보 입력..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                        />
                    </div>
                    <div className="filter-item">
                        <label>제조처명</label>
                        <input 
                            type="text" 
                            placeholder="제조사명 입력..." 
                            value={manufacturer} 
                            onChange={(e) => setManufacturer(e.target.value)} 
                        />
                    </div>
                    <div className="filter-item">
                        <label>서류 상태</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">전체 상태</option>
                            <option value="PENDING">요청대기 (PENDING)</option>
                            <option value="REQUESTED">요청중 (REQUESTED)</option>
                            <option value="FULFILLED">제출완료 (FULFILLED)</option>
                            <option value="OVERDUE">기한연체 (OVERDUE)</option>
                        </select>
                    </div>
                    <div className="filter-item">
                        <label>요청 단위 (Scope)</label>
                        <select value={scope} onChange={(e) => setScope(e.target.value)}>
                            <option value="">전체 단위</option>
                            <option value="PRODUCT">품목 단위 (PRODUCT)</option>
                            <option value="MANUFACTURER">제조사 단위 (MANUFACTURER)</option>
                        </select>
                    </div>
                </div>
                <div className="filter-actions">
                    <button type="button" className="btn-secondary" onClick={() => { setSearch(''); setManufacturer(''); setStatus(''); setScope(''); }}>
                        🔄 필터 초기화
                    </button>
                    <button type="submit" className="btn-primary">
                        🔍 검색 및 동기화
                    </button>
                </div>
            </form>

            {/* 테이블 데이터 내역 */}
            <div className="table-wrapper">
                {loading ? (
                    <div className="table-loading">
                        <div className="spinner"></div>
                        <p>품질서류 상태 목록을 불러오고 있습니다...</p>
                    </div>
                ) : (
                    <>
                        <table className="qms-table">
                            <thead>
                                <tr>
                                    <th>적용 단위</th>
                                    <th>품목 / 제조처 정보</th>
                                    <th>요청 서류유형</th>
                                    <th>담당 벤더 이메일</th>
                                    <th>최종 수령일</th>
                                    <th>제출 마감기한</th>
                                    <th>진행 상태</th>
                                    <th>수동 재발송</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requirements.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="empty-row">
                                            조건에 만족하는 품질서류 요구사항 내역이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    requirements.map(req => (
                                        <tr key={req.id}>
                                            <td>{req.productId ? "📦 품목" : "🏭 제조사"}</td>
                                            <td>{getTargetName(req)}</td>
                                            <td className="highlight-col">{getDocumentName(req)}</td>
                                            <td>{getRecipientEmailText(req)}</td>
                                            <td>{req.lastReceivedDate || "-"}</td>
                                            <td className={req.status === 'OVERDUE' ? 'text-danger font-bold' : ''}>
                                                {req.nextDueDate || "최초 1회 제출"}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${getStatusBadgeClass(req.status)}`}>
                                                    {getStatusText(req.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <button 
                                                    className="small-btn btn-action" 
                                                    onClick={() => openReRequestModal(req)}
                                                >
                                                    📧 재발송
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* 페이징 하단 조작기 */}
                        {totalPages > 1 && (
                            <div className="pagination-bar">
                                <button 
                                    disabled={currentPage === 0} 
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 0))}
                                    className="page-btn"
                                >
                                    ◀ 이전
                                </button>
                                <span className="page-info">
                                    {currentPage + 1} / {totalPages} 페이지 (총 {totalElements}건)
                                </span>
                                <button 
                                    disabled={currentPage === totalPages - 1} 
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages - 1))}
                                    className="page-btn"
                                >
                                    다음 ▶
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 수동 요청 전용 팝업 메일 미리보기 모달 */}
            {showPreviewModal && selectedReq && (
                <div className="modal-backdrop">
                    <div className="qms-modal-card">
                        <div className="modal-header">
                            <h3>📧 필수서류 자동요청 이메일 송신</h3>
                            <button className="close-btn" onClick={() => setShowPreviewModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p className="description">
                                제조사 벤더에 품질서류 제출용 보안 링크를 포함한 요청 메일을 발송합니다.<br />
                                수신 이메일 주소를 확인하거나 수정한 뒤 발송해 주십시오.
                            </p>
                            <div className="form-group">
                                <label>수신 벤더 이메일 주소</label>
                                <input 
                                    type="email" 
                                    value={recipientEmail} 
                                    onChange={(e) => setRecipientEmail(e.target.value)} 
                                    placeholder="example@vendor.com" 
                                />
                            </div>

                            <div className="email-preview-box">
                                <div className="preview-header">
                                    <span><b>제목:</b> [QMS 필수서류 제출 요청] {selectedReq.product?.productName || selectedReq.manufacturer?.name} - {getDocumentName(selectedReq)}</span>
                                </div>
                                <div className="preview-body-html">
                                    <p>안녕하세요. <b>{selectedReq.product?.productName || selectedReq.manufacturer?.name}</b> 관련 품질서류 보완 및 제출을 요청드립니다.</p>
                                    <p>제출 대상 서류: <b>{getDocumentName(selectedReq)}</b></p>
                                    <p>[제출하기 보안링크 버튼 내장]</p>
                                    <p className="footer">※ 본 링크는 발송일로부터 14일 동안만 유효합니다.</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowPreviewModal(false)}>
                                취소
                            </button>
                            <button className="btn-primary" onClick={handleSendRequest} disabled={previewLoading}>
                                {previewLoading ? "메일 전송 중..." : "📨 이메일 발송하기"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
