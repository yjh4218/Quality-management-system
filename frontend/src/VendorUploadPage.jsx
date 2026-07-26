import React, { useState, useEffect } from 'react';
import api, { submitBugReport } from './api';
import { toast } from 'react-toastify';
import { Box, Button, TextField, Typography, Card, CardContent, Divider, CircularProgress } from '@mui/material';

export default function VendorUploadPage({ token: propToken }) {
    // URL 쿼리 파라미터 ?token=SECRET_UUID 자동 추출 지원
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('token');
    const activeToken = propToken || queryToken;

    const [loading, setLoading] = useState(true);
    const [portalData, setPortalData] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    // 업로드 폼 상태
    const [uploaderName, setUploaderName] = useState('');
    const [changeReason, setChangeReason] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    useEffect(() => {
        if (!activeToken) {
            setErrorMsg("유효한 보안 인증 토큰이 제공되지 않았습니다. 이메일 안의 제출 링크를 다시 확인해 주세요.");
            setLoading(false);
            return;
        }
        fetchPortalData();
    }, [activeToken]);

    const fetchPortalData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/document-requests/vendor-portal?token=${encodeURIComponent(activeToken)}`);
            setPortalData(res.data);
            setErrorMsg(null);
        } catch (err) {
            console.error("제조사 포털 로드 실패:", err);
            const msg = err.response?.data?.message || "유효하지 않거나 만료된 보안 토큰입니다.";
            setErrorMsg(msg);
            // 버그 발생 시 버그리포트 자동 전송
            submitBugReport({
                title: "[자동 감지] 제조사 업로드 포털 접속 실패",
                description: `Token: ${activeToken}, Error: ${msg}`,
                severity: "HIGH"
            }).catch(() => {});
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 20 * 1024 * 1024) {
                toast.error("파일 크기는 최대 20MB까지 허용됩니다.");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSubmitUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            toast.error("제출할 PDF 또는 이미지 파일(PNG/JPG)을 선택해 주십시오.");
            return;
        }
        if (!uploaderName.trim()) {
            toast.error("제출자 성명 또는 담당자명을 입력해 주십시오.");
            return;
        }

        setUploading(true);
        try {
            // 파일 가상 URL 생성 (실제 운영 시 S3 / Storage URL)
            const fakeFileUrl = `/uploads/documents/${Date.now()}_${selectedFile.name}`;

            const payload = {
                token: activeToken,
                fileName: selectedFile.name,
                fileUrl: fakeFileUrl,
                uploaderName: uploaderName.trim(),
                changeReason: changeReason.trim() || '서류 신규 업로드 및 갱신'
            };

            await api.post('/api/document-requests/vendor-upload', payload);
            toast.success("서류가 성공적으로 업로드 및 제출 완료되었습니다!");
            setUploadSuccess(true);
            fetchPortalData(); // 이력 갱신
        } catch (err) {
            console.error("서류 업로드 실패:", err);
            const msg = err.response?.data?.message || "서류 업로드 처리 중 오류가 발생했습니다.";
            toast.error(msg);

            // 버그리포트 자동 전달
            submitBugReport({
                title: "[자동 감지] 서류 업로드 실패",
                description: `Token: ${activeToken}, Uploader: ${uploaderName}, File: ${selectedFile?.name}, Error: ${msg}`,
                severity: "CRITICAL"
            }).catch(() => {});
        } finally {
            setUploading(false);
        }
    };

    const handleReportBugManual = () => {
        submitBugReport({
            title: "[사용자 수동 신고] 제조사 품질서류 포털 문의/오류",
            description: `Token: ${activeToken}, Page: VendorUploadPage`,
            severity: "MEDIUM"
        }).then(() => toast.info("버그/오류 신고가 시스템 관리자에게 전달되었습니다."));
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2, color: '#64748b' }}>🔒 보안 접속 토큰을 검증하고 있습니다...</Typography>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '60px auto', textAlign: 'center', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #fee2e2' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#991b1b', mb: 1 }}>
                    품질서류 제출 포털 접속 오류
                </Typography>
                <Typography variant="body2" sx={{ color: '#7f1d1d', mb: 3 }}>
                    {errorMsg}
                </Typography>
                <Button variant="outlined" color="error" onClick={handleReportBugManual}>
                    🐞 버그/오류 리포트 제출
                </Button>
            </div>
        );
    }

    const { requirement, product, childProducts, histories } = portalData || {};

    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '40px 20px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* 포털 헤더 */}
                <Card sx={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', mb: 3, border: '1px solid #e2e8f0' }}>
                    <CardContent style={{ padding: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '12px' }}>
                                    🔒 제조사 보안 데이터 격리 포털
                                </span>
                                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b', mt: 1 }}>
                                    📋 필수 품질서류 웹 제출 포털
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                                    별도의 로그인 없이 제공받으신 이메일 고유 토큰을 통해 필수 품질 서류를 직접 업로드 및 갱신하실 수 있습니다.
                                </Typography>
                            </div>
                            <Button variant="text" size="small" onClick={handleReportBugManual} sx={{ color: '#64748b' }}>
                                🐞 시스템 오류 신고
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 격리된 마스터 및 SKU 제품 정보 */}
                <Card sx={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', mb: 3, border: '1px solid #e2e8f0' }}>
                    <CardContent style={{ padding: '24px' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b', mb: 2 }}>
                            📦 대상 마스터 품목 정보
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '12px' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>마스터 품목명</div>
                                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>{product?.productName || '공통 제조처 서류'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>마스터 품목코드</div>
                                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#2563eb' }}>{product?.itemCode || 'MANUFACTURER_SCOPE'}</div>
                            </div>
                        </div>

                        {/* 연동 하위 SKU 목록 */}
                        {childProducts && childProducts.length > 0 && (
                            <div style={{ mt: 2, marginTop: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', mb: 1 }}>
                                    🔗 이 품질서류가 함께 연동 적용되는 실제 판매 SKU 품목 ({childProducts.length}개):
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {childProducts.map(cp => (
                                        <span key={cp.id} style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontWeight: 'bold' }}>
                                            📦 {cp.productName} ({cp.itemCode})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 서류 업로드 Form */}
                <Card sx={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', mb: 3, border: '1px solid #e2e8f0' }}>
                    <CardContent style={{ padding: '24px' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b', mb: 2 }}>
                            📤 서류 파일(PDF / 이미지) 업로드 제출
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        {uploadSuccess && (
                            <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#15803d', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px' }}>
                                ✅ 서류 제출이 완료되었습니다! 필요 시 수정본을 재업로드하실 수 있습니다.
                            </div>
                        )}

                        <form onSubmit={handleSubmitUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ border: '2px dashed #cbd5e1', padding: '30px', borderRadius: '12px', textAlign: 'center', backgroundColor: '#fafafa' }}>
                                <input
                                    type="file"
                                    id="file-input"
                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>📁</div>
                                    <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>
                                        {selectedFile ? `선택된 파일: ${selectedFile.name}` : '이곳을 클릭하거나 서류 파일(PDF, PNG, JPG)을 드래그하세요'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                        최대 파일 용량: 20MB 이하
                                    </div>
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <TextField
                                    label="제출 담당자 성명 *"
                                    size="small"
                                    placeholder="예: 홍길동 팀장"
                                    value={uploaderName}
                                    onChange={(e) => setUploaderName(e.target.value)}
                                    required
                                    fullWidth
                                />
                                <TextField
                                    label="변경 / 갱신 사유"
                                    size="small"
                                    placeholder="예: 2026년도 정기 MSDS 갱신제출"
                                    value={changeReason}
                                    onChange={(e) => setChangeReason(e.target.value)}
                                    fullWidth
                                />
                            </div>

                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={uploading}
                                sx={{ backgroundColor: '#2563eb', borderRadius: '8px', fontWeight: 'bold', py: 1.5 }}
                            >
                                {uploading ? '서류 업로드 및 제출 중...' : '🚀 품질 서류 제출하기'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* 서류 변경 이력 타임라인 (Audit Trail) */}
                <Card sx={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <CardContent style={{ padding: '24px' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b', mb: 2 }}>
                            📜 서류 변경 및 제출 이력 타임라인 ({histories ? histories.length : 0}건)
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        {!histories || histories.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                                아직 제출된 서류 이력이 없습니다.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {histories.map(h => (
                                    <div key={h.id} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e293b' }}>
                                                📄 {h.fileName}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                제출자: <strong>{h.uploadedBy}</strong> | 일시: {h.uploadedAt ? h.uploadedAt.replace("T", " ").substring(0, 16) : '-'}
                                            </div>
                                            {h.changeReason && (
                                                <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px' }}>
                                                    사유: {h.changeReason}
                                                </div>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 'bold' }}>
                                            {h.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
