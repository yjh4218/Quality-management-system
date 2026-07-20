import React, { useState, useEffect } from 'react';
import { getBaseURL } from './api';

export default function VendorUploadPage({ token }) {
    const [loading, setLoading] = useState(true);
    const [targetInfo, setTargetInfo] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [toast, setToast] = useState(null);

    const baseURL = getBaseURL();

    useEffect(() => {
        if (!token) {
            setErrorMsg("유효한 토큰이 제공되지 않았습니다.");
            setLoading(false);
            return;
        }
        fetchTargetInfo();
    }, [token]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchTargetInfo = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${baseURL}/api/vendor-upload/${token}`);
            const data = await res.json();
            
            if (res.status === 429) {
                setErrorMsg(data.message || "요청 한도를 초과했습니다. 1분 후 다시 시도해 주세요.");
            } else if (!res.ok) {
                setErrorMsg(data.message || "유효하지 않은 제출 링크이거나 만료되었습니다.");
            } else {
                setTargetInfo(data);
            }
        } catch (err) {
            setErrorMsg("서버와 통신하는 중 요류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) {
                showToast("10MB 이하의 파일만 업로드할 수 있습니다.", "error");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            showToast("제출할 파일을 선택해 주세요.", "error");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const res = await fetch(`${baseURL}/api/vendor-upload/${token}/file`, {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (res.status === 429) {
                showToast(data.message || "업로드 제한을 초과했습니다. 잠시 후 시도해 주세요.", "error");
            } else if (!res.ok) {
                showToast(data.message || "제출에 실패했습니다.", "error");
            } else {
                showToast("품질 서류가 정상 제출 완료되었습니다.");
                setUploadSuccess(true);
            }
        } catch (err) {
            showToast("업로드 중 서버 에러가 발생했습니다.", "error");
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="vendor-upload-container loading">
                <div className="spinner"></div>
                <p>제출 링크 보안성을 검증하고 있습니다...</p>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="vendor-upload-container">
                <div className="error-card">
                    <span className="error-icon">⚠️</span>
                    <h2>제출 링크 만료 안내</h2>
                    <p>{errorMsg}</p>
                    <p className="notice">본 링크는 보안 정책에 의해 14일 경과 시 만료되며, 1회 제출 성공 시 즉시 파기됩니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="vendor-upload-container">
            {toast && (
                <div className={`toast-message ${toast.type}`}>
                    {toast.type === 'error' ? '❌' : '✅'} {toast.message}
                </div>
            )}

            {uploadSuccess ? (
                <div className="success-card">
                    <span className="success-icon">🎉</span>
                    <h2>품질 서류 제출 성공</h2>
                    <p>요청된 서류가 내부 관리자 QMS 시스템에 정상 수령 및 자동 반영되었습니다.</p>
                    <p className="highlight">서류명: {targetInfo?.documentName}</p>
                    <p>이제 이 탭을 닫아주셔도 좋습니다. 협조해 주셔서 대단히 감사합니다.</p>
                </div>
            ) : (
                <div className="upload-card">
                    <div className="header">
                        <h1>통합 품질 관리 시스템 (QMS)</h1>
                        <p className="subtitle">제조사 필수 품질서류 제출 보드</p>
                    </div>

                    <div className="meta-box">
                        <div className="meta-row">
                            <span className="label">제출 대상 품목</span>
                            <span className="value">{targetInfo?.targetName || '제조사 공통'} {targetInfo?.itemCode ? `(${targetInfo.itemCode})` : ''}</span>
                        </div>
                        <div className="meta-row">
                            <span className="label">요청 품질서류</span>
                            <span className="value highlight">{targetInfo?.documentName}</span>
                        </div>
                        <div className="meta-row">
                            <span className="label">제조처</span>
                            <span className="value">{targetInfo?.manufacturerName}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="upload-form">
                        <div className="dropzone">
                            <input 
                                type="file" 
                                id="fileInput" 
                                onChange={handleFileChange} 
                                accept=".pdf,image/*"
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="fileInput" className="dropzone-label">
                                <span className="icon">📂</span>
                                <span className="text">클릭하여 PDF 또는 이미지 파일 첨부</span>
                                <span className="subtext">10MB 이하 파일만 지원 (PDF, JPG, PNG)</span>
                            </label>
                        </div>

                        {selectedFile && (
                            <div className="file-info-box">
                                <span className="file-icon">📄</span>
                                <span className="file-name">{selectedFile.name}</span>
                                <span className="file-size">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                                <button type="button" className="remove-btn" onClick={() => setSelectedFile(null)}>✕</button>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={!selectedFile || uploading} 
                            className={`submit-btn ${uploading ? 'uploading' : ''}`}
                        >
                            {uploading ? (
                                <>
                                    <span className="mini-spinner"></span>
                                    <span>서류를 검증하여 저장하고 있습니다...</span>
                                </>
                            ) : (
                                "품질 서류 최종 제출하기"
                            )}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
