import React, { useState, useEffect } from 'react';
import { createClaim, updateClaim, uploadClaimResponse, uploadClaimPhoto, getClaimHistory, deleteClaim } from './api';
import * as api from './api';
import { toast } from 'react-toastify';
import DOMPurify from 'dompurify';
import ProductSearchPopup from './ProductSearchPopup';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';

const ClaimDrawer = ({ claim, onClose, onSaved, user, readOnly = false, onNavigateToEdit }) => {
    const [formData, setFormData] = useState({
        receiptDate: new Date().toISOString().split('T')[0],
        country: '',
        itemCode: '',
        productName: '',
        lotNumber: '',
        manufacturer: '',
        occurrenceQty: 1,
        primaryCategory: '',
        secondaryCategory: '',
        tertiaryCategory: '',
        claimContent: '',
        consumerReplyNeeded: '불필요',
        productRetrievalNeeded: '불필요',
        expectedRetrievalDate: '',
        qualityCheckNeeded: '필요',
        claimPhotos: [],
        
        qualityStatus: '0. 접수',
        rootCauseAnalysis: '',
        preventativeAction: '',
        qualityReceivedReturnedProduct: '미수령',
        qualityReceivedDate: '',
        manufacturerResponsePdf: '',
        sharedWithManufacturer: false,
        terminationDate: '',
        isCriticalClaim: false,
        criticalRequestStatus: 'PENDING',
        
        mfrRootCauseAnalysis: '',
        mfrPreventativeAction: '',
        mfrRecallDate: '',
        mfrRecallStatus: '미회수',
        mfrTerminationDate: '',
        qualityRemarks: '',
        mfrRemarks: '',
        mfrStatus: '1. 접수',
        emailSentAt: '',
        version: 0
    });

    const stands = user?.roles || [];
    const isManufacturer = stands.some(r => r.authority === 'ROLE_MANUFACTURER');
    const isAdmin = stands.some(r => r.authority === 'ROLE_ADMIN');
    const isQuality = stands.some(r => r.authority === 'ROLE_QUALITY' || 
        (user?.companyName === '더파운더즈' && (user?.department === 'Quality' || user?.department === '품질팀' || user?.department === '품질')));

    const { canEdit: canEditClaim, canDelete: canDeleteClaim } = usePermissions(user);
    const hasGlobalEdit = canEditClaim('claims');



    const canEditCs = (!readOnly) && hasGlobalEdit && (!isManufacturer);
    const canEditQuality = (!readOnly) && hasGlobalEdit && (isAdmin || isQuality || isManufacturer);
    const canEditMfr = (!readOnly) && (isAdmin || isManufacturer);

    const [isSearchPopupOpen, setIsSearchPopupOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailForm, setEmailForm] = useState({ toEmail: '', subject: '', body: '' });
    const [initialToEmail, setInitialToEmail] = useState('');
    const [deptEmails, setDeptEmails] = useState({});
    const [selectedDepts, setSelectedDepts] = useState([]);
    const [emailModalTab, setEmailModalTab] = useState('preview');
    const [reRequestReason, setReRequestReason] = useState('');
    const [emailActionType, setEmailActionType] = useState('SHARE'); // 'SHARE' or 'RE_REQUEST'
    const isSavingRef = React.useRef(false);

    useEffect(() => {
        if (!isManufacturer) {
            api.getActiveMailTemplates('CLAIM')
               .then(res => {
                   setTemplates(res.data);
                   if (res.data.length > 0) setSelectedTemplate(res.data[0].templateCode);
               })
               .catch(err => console.error("Failed to load templates", err));
        }
    }, [isManufacturer]);

    const loadHistory = async () => {
        if (!claim) return;
        try {
            const res = await getClaimHistory(claim.id);
            setHistory(res.data);
        } catch (error) {
            // Silently fail
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab, claim]);

    const fieldTranslations = {
        'ReceiptDate': '접수일자',
        'Country': '인입 국가',
        'ItemCode': '품목코드',
        'ProductName': '품목명',
        'LotNumber': '로트(LOT)',
        'Manufacturer': '제조사',
        'OccurrenceQty': '발생수량',
        'PrimaryCategory': '대분류',
        'SecondaryCategory': '중분류',
        'TertiaryCategory': '소분류',
        'ClaimContent': '상세 클레임 내용',
        'QualityCheckNeeded': '품질팀 확인 필요 여부',
        'ConsumerReplyNeeded': '소비자 회신 필요 여부',
        'ProductRetrievalNeeded': '제품 회수 여부',
        'ExpectedRetrievalDate': '제품 회수 예상일자',
        'ClaimPhotos': '첨부 사진',
        'QualityStatus': '품질팀 처리 상태',
        'RootCauseAnalysis': '원인 분석',
        'PreventativeAction': '재발방지 체계 수립 내역',
        'QualityReceivedReturnedProduct': '품질팀 회수 제품 수령 여부',
        'QualityReceivedDate': '회수 제품 수령일자',
        'MfrRootCauseAnalysis': '제조사 원인 분석',
        'MfrPreventativeAction': '제조사 재발방지 대책',
        'MfrRecallDate': '제조사 제품 회수 일자',
        'MfrRecallStatus': '제조사 제품 회수 여부',
        'MfrTerminationDate': '제조사 클레임 종결일자',
        'MfrStatus': '제조사 처리 상태',
        'QualityRemarks': '품질팀 비고',
        'MfrRemarks': '제조사 비고'
    };

    const formatHistoryValue = (val, fieldName) => {
        if (!val || val === 'null' || val === '[]' || val === '-' || val === '{}') return '없음';
        if (typeof val === 'boolean' || val === 'true' || val === 'false') {
            return String(val) === 'true' ? '예' : '아니오';
        }
        try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'boolean') return parsed ? '예' : '아니오';
            
            if (Array.isArray(parsed)) {
                if (parsed.length === 0) return '없음';
                return parsed.map((item, index) => {
                    if (typeof item === 'string') {
                        if (item.startsWith('http') || item.startsWith('/uploads')) {
                            return decodeURIComponent(item.split('/').pop()).replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '');
                        }
                        return item;
                    }
                    if (typeof item === 'object') {
                        return '【 ' + Object.entries(item)
                            .filter(([k,v]) => v !== null && v !== '' && k !== 'id')
                            .map(([k,v]) => `${fieldTranslations[k] || k}: ${v}`)
                            .join(', ') + ' 】';
                    }
                    return String(item);
                }).join(', ');
            }
            if (typeof parsed === 'object') {
                return Object.entries(parsed)
                    .filter(([k,v]) => v !== null && v !== '' && v !== '[]' && v !== '{}' && v !== false && k !== 'id')
                    .map(([k,v]) => `${fieldTranslations[k] || k}: ${formatHistoryValue(typeof v === 'string' ? v : JSON.stringify(v), k)}`)
                    .join(' | ');
            }
        } catch (e) {}
        
        if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('/uploads'))) {
            return decodeURIComponent(val.split('/').pop()).replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '');
        }
        
        return val;
    };

    useEffect(() => {
        if (claim) {
            setFormData({
                receiptDate: claim.receiptDate || '',
                country: claim.country || '',
                itemCode: claim.itemCode || '',
                productName: claim.productName || '',
                lotNumber: claim.lotNumber || '',
                manufacturer: claim.manufacturer || '',
                occurrenceQty: claim.occurrenceQty || 1,
                primaryCategory: claim.primaryCategory || '',
                secondaryCategory: claim.secondaryCategory || '',
                tertiaryCategory: claim.tertiaryCategory || '',
                claimContent: claim.claimContent || '',
                consumerReplyNeeded: claim.consumerReplyNeeded || '불필요',
                productRetrievalNeeded: claim.productRetrievalNeeded || '불필요',
                expectedRetrievalDate: claim.expectedRetrievalDate || '',
                qualityCheckNeeded: claim.qualityCheckNeeded || '필요',
                claimPhotos: claim.claimPhotos || [],
                qualityStatus: claim.qualityStatus || '0. 접수',
                rootCauseAnalysis: claim.rootCauseAnalysis || '',
                preventativeAction: claim.preventativeAction || '',
                qualityReceivedReturnedProduct: claim.qualityReceivedReturnedProduct || '미수령',
                qualityReceivedDate: claim.qualityReceivedDate || '',
                manufacturerResponsePdf: claim.manufacturerResponsePdf || '',
                sharedWithManufacturer: claim.sharedWithManufacturer || false,
                terminationDate: claim.terminationDate || '',
                isCriticalClaim: claim.isCriticalClaim || false,
                criticalRequestStatus: claim.criticalRequestStatus || 'PENDING',
                mfrRootCauseAnalysis: claim.mfrRootCauseAnalysis || '',
                mfrPreventativeAction: claim.mfrPreventativeAction || '',
                mfrRecallDate: claim.mfrRecallDate || '',
                mfrRecallStatus: claim.mfrRecallStatus || '미회수',
                mfrTerminationDate: claim.mfrTerminationDate || '',
                qualityRemarks: claim.qualityRemarks || '',
                mfrRemarks: claim.mfrRemarks || '',
                mfrStatus: claim.mfrStatus || '1. 접수',
                createdAt: claim.createdAt || '',
                updatedAt: claim.updatedAt || '',
                emailSentAt: claim.emailSentAt || '',
                version: claim.version || 0
            });
        }
    }, [claim]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (formData.claimPhotos.length + files.length > 10) {
            alert("최대 10장까지 가능합니다.");
            return;
        }
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) continue;
            try {
                const res = await uploadClaimPhoto(file);
                setFormData(prev => ({ ...prev, claimPhotos: [...prev.claimPhotos, res.data] }));
            } catch (error) {}
        }
    };
    const removePhoto = (indexToRemove) => {
        setFormData(prev => ({ ...prev, claimPhotos: prev.claimPhotos.filter((_, idx) => idx !== indexToRemove) }));
    };

    const handleResponsePdfUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!claim || !claim.id) {
            alert("저장된 클레임에 대해서만 보고서를 첨부할 수 있습니다. 먼저 저장해 주세요.");
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert("파일 크기는 5MB를 초과할 수 없습니다.");
            return;
        }
        
        const allowedExtensions = /(\.pdf|\.jpg|\.jpeg)$/i;
        if (!allowedExtensions.exec(file.name)) {
            alert("PDF 또는 JPG/JPEG 파일만 업로드 가능합니다.");
            return;
        }
        
        try {
            toast.info("파일을 업로드 중입니다...");
            const res = await uploadClaimResponse(claim.id, file, claim.productName || formData.productName);
            
            // 파일 업로드 시 백엔드에서 엔티티가 직접 저장되어 버전이 올라갔으므로, 최신 버전을 다시 조회하여 동기화합니다.
            const updatedClaimRes = await api.getClaimById(claim.id);
            const updatedClaim = updatedClaimRes.data;
            
            setFormData(prev => ({ 
                ...prev, 
                manufacturerResponsePdf: res.data,
                version: updatedClaim.version || 0 
            }));
            
            toast.success("대체 보고서 파일이 업로드되었습니다.");
            if (onSaved) onSaved(updatedClaim);
        } catch (error) {
            console.error(error);
            const serverMsg = error.response?.data?.message || error.response?.data || "파일 업로드에 실패했습니다.";
            toast.error(`업로드 실패: ${serverMsg}`);
        }
    };

    const removeResponsePdf = () => {
        if (window.confirm("첨부된 대체 보고서를 삭제하시겠습니까?")) {
            setFormData(prev => ({ ...prev, manufacturerResponsePdf: '' }));
        }
    };

    const handleOpenEmailModal = async () => {
        if (!claim || !claim.id) {
            toast.warn("저장된 클레임만 메일을 발송할 수 있습니다. 먼저 저장해주세요.");
            return;
        }
        if (!selectedTemplate) {
            toast.warn("발송할 메일 양식을 선택해주세요.");
            return;
        }

        try {
            const res = await api.getClaimEmailPreview(claim.id, selectedTemplate);
            const { toEmail, subject, body } = res.data;

            // Load departments and pre-check '품질팀' and '영업팀'
            let loadedDeptEmails = {};
            const companyName = claim?.manufacturer || formData?.manufacturer;
            if (companyName) {
                try {
                    const deptRes = await api.getCompanyDepartmentsAndEmails(companyName);
                    loadedDeptEmails = deptRes.data || {};
                    setDeptEmails(loadedDeptEmails);
                } catch (deptErr) {
                    console.error("Failed to load departments", deptErr);
                }
            }

            const defaultDepts = [];
            let defaultEmails = [];
            if (loadedDeptEmails['품질팀']) {
                defaultDepts.push('품질팀');
                defaultEmails = [...defaultEmails, ...loadedDeptEmails['품질팀'].map(e => e.trim())];
            }
            if (loadedDeptEmails['영업팀']) {
                defaultDepts.push('영업팀');
                defaultEmails = [...defaultEmails, ...loadedDeptEmails['영업팀'].map(e => e.trim())];
            }

            const uniqueEmails = [...new Set(defaultEmails.filter(Boolean))];

            setSelectedDepts(defaultDepts);
            setEmailForm({
                toEmail: uniqueEmails.join(', '),
                subject: subject || '',
                body: body || ''
            });
            setInitialToEmail('');
            setEmailActionType('SHARE');
            setEmailModalTab('preview');
            setIsEmailModalOpen(true);
        } catch (error) {
            toast.error("메일 템플릿 정보를 가져오지 못했습니다.");
        }
    };

    const handleDeptToggle = (deptName) => {
        const isChecked = selectedDepts.includes(deptName);
        const newDepts = isChecked 
            ? selectedDepts.filter(d => d !== deptName)
            : [...selectedDepts, deptName];
            
        setSelectedDepts(newDepts);

        // Rebuild toEmail to ONLY include emails of checked departments
        const currentEmails = [];
        newDepts.forEach(d => {
            if (deptEmails[d]) {
                deptEmails[d].forEach(email => {
                    const trimmed = email.trim();
                    if (trimmed && !currentEmails.includes(trimmed)) {
                        currentEmails.push(trimmed);
                    }
                });
            }
        });
        
        setEmailForm(prev => ({ ...prev, toEmail: currentEmails.join(', ') }));
    };

    const handleSendEmail = async () => {
        if (!emailForm.toEmail.trim()) {
            toast.error("수신자 이메일을 입력해 주세요.");
            return;
        }
        setIsSendingEmail(true);
        try {
            let finalClaim = null;
            if (emailActionType === 'RE_REQUEST') {
                // 대책 재요청 시: 메일 발송 버튼 클릭 시에만 재요청 API(상태 및 이유 반영) 호출
                finalClaim = await api.reRequestCriticalCapa(claim.id, reRequestReason);
            } else {
                // 일반 메일 발송 시: 기존 저장 로직 수행
                const sanitizedData = { ...formData };
                if (claim) {
                    sanitizedData.sharedWithManufacturer = claim.sharedWithManufacturer;
                }
                const dateFields = ['receiptDate', 'expectedRetrievalDate', 'recallDate', 'qualityReceivedDate', 'terminationDate', 'mfrRecallDate', 'mfrTerminationDate'];
                dateFields.forEach(field => {
                    if (sanitizedData[field] === '') {
                        sanitizedData[field] = null;
                    }
                });
                if (claim && claim.id) {
                    try {
                        const latestRes = await api.getClaimById(claim.id);
                        sanitizedData.version = latestRes.data.version || 0;
                    } catch (versionErr) {
                        console.warn('최신 버전 조회 실패, 기존 버전 사용:', versionErr);
                    }
                    await updateClaim(claim.id, sanitizedData);
                }
            }

            // 실제 이메일 발송
            const res = await api.sendClaimEmail(claim.id, emailForm);
            
            // 메일 전송 완료 후 최종 데이터 동기화
            const updatedClaimRes = await api.getClaimById(claim.id);
            const updatedClaim = updatedClaimRes.data;
            
            setFormData(prev => ({
                ...prev,
                sharedWithManufacturer: updatedClaim.sharedWithManufacturer,
                emailSentAt: updatedClaim.emailSentAt || '',
                criticalRequestStatus: updatedClaim.criticalRequestStatus,
                mfrStatus: updatedClaim.mfrStatus,
                qualityRemarks: updatedClaim.qualityRemarks,
                version: updatedClaim.version || 0
            }));
            
            if (onSaved) onSaved(updatedClaim);
            onClose();

            if (res.data?.isMock || res.data?.message === "SMTP_NOT_CONFIGURED") {
                toast.info("💡 SMTP 서버 미설정으로 [Mock 모드]가 동작했습니다. mock_emails 폴더에 메일이 저장되었습니다.", { autoClose: 8000 });
            } else {
                toast.success(emailActionType === 'RE_REQUEST' ? "제조사에 대책 재요청 메일이 전송되었습니다." : "메일 발송을 요청했습니다.");
            }
            setIsEmailModalOpen(false);
        } catch (error) {
            console.error(error);
            const errorData = error.response?.data;
            const errorMsg = typeof errorData === 'string' ? errorData : (errorData?.message || "메일 발송 및 재요청 처리에 실패했습니다.");
            toast.error(`[오류 발생] ${errorMsg}`);

            if (emailActionType === 'RE_REQUEST') {
                // 대책 재요청 도중 에러가 발생한 경우 자동 버그 리포트 전송
                try {
                    await api.submitBugReport({
                        description: `[품질팀 재요청 오류] 대책 재요청 중 에러 발생: ${error.message || error}`,
                        steps: [
                            `Error: ${error.stack || error.message || 'No stack trace'}`,
                            `Claim ID: ${claim?.id || 'N/A'}`,
                            `Reason: ${reRequestReason || 'N/A'}`,
                            `UserAgent: ${navigator.userAgent}`
                        ].join('\n'),
                        screenName: 'ClaimDrawer (대책 재요청)',
                        url: window.location.href,
                        severity: 'HIGH',
                        serverError: error.response?.data ? JSON.stringify(error.response.data) : 'FRONTEND_CATCH_EXCEPTION'
                    });
                } catch (reportErr) {
                    console.error("Failed to submit bug report", reportErr);
                }
            }
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleReRequestCapa = async () => {
        if (!claim || !claim.id) return;
        const reason = prompt("제조사에 재발방지대책 재요청을 보내는 사유를 입력해 주세요:");
        if (reason === null) return;
        if (!reason.trim()) {
            toast.warn("재요청 사유를 입력하셔야 메일을 발송할 수 있습니다.");
            return;
        }

        setReRequestReason(reason);
        setEmailActionType('RE_REQUEST');
        setLoading(true);

        try {
            // 부서별 메일 주소 로드
            let loadedDeptEmails = {};
            const companyName = claim?.manufacturer || formData?.manufacturer;
            if (companyName) {
                try {
                    const deptRes = await api.getCompanyDepartmentsAndEmails(companyName);
                    loadedDeptEmails = deptRes.data || {};
                    setDeptEmails(loadedDeptEmails);
                } catch (deptErr) {
                    console.error("Failed to load departments", deptErr);
                }
            }

            const defaultDepts = [];
            let defaultEmails = [];
            if (loadedDeptEmails['품질팀']) {
                defaultDepts.push('품질팀');
                defaultEmails = [...defaultEmails, ...loadedDeptEmails['품질팀'].map(e => e.trim())];
            }
            if (loadedDeptEmails['영업팀']) {
                defaultDepts.push('영업팀');
                defaultEmails = [...defaultEmails, ...loadedDeptEmails['영업팀'].map(e => e.trim())];
            }
            const uniqueEmails = [...new Set(defaultEmails.filter(Boolean))];

            const subject = `[QMS 대책 재요청] 클레임 번호 ${claim.claimNumber}번에 대한 재발방지대책 보완 요청`;
            const body = `<html>
<body style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); background-color: #ffffff;">
    <h2 style="color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-top: 0;">통합 품질 관리 시스템 (QMS)</h2>
    <p>안녕하세요, ${companyName} 담당자님.</p>
    <p>더파운더즈 품질팀입니다.<br/>귀사에서 제출하신 클레임에 대한 원인 분석 및 재발방지 대책이 검토 결과 미흡하여 보완(재요청)을 요청드립니다. 아래 내용을 확인 후 재발방지대책 보완 회신을 부탁드립니다.</p>
    
    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <ul style="margin: 0; padding-left: 20px; color: #475569; line-height: 1.8;">
        <li style="margin-bottom: 8px;"><b>클레임번호:</b> ${claim.claimNumber}</li>
        <li style="margin-bottom: 8px;"><b>품목코드:</b> ${claim.itemCode || formData.itemCode}</li>
        <li style="margin-bottom: 8px;"><b>제품명:</b> ${claim.productName || formData.productName}</li>
        <li style="margin-bottom: 8px;"><b>LOT번호:</b> ${claim.lotNumber || formData.lotNumber}</li>
        <li style="margin-bottom: 8px;"><b>발생수량:</b> ${claim.occurrenceQty || formData.occurrenceQty || '-'}</li>
        <li style="margin-bottom: 8px;"><b>클레임 내용:</b> ${claim.claimContent || formData.claimContent}</li>
        <li style="margin-bottom: 8px; color: #c53030;"><b>대책 재요청 사유:</b> <strong>${reason}</strong></li>
      </ul>
    </div>
    
    <p>QMS 시스템에 접속하여 보완된 원인 분석 및 재발방지 대책을 다시 수립하여 제출해 주시기 바랍니다.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:5173/?claimId=${claim.id}&amp;fromEmail=true" style="display: inline-block; padding: 12px 24px; color: #ffffff; background-color: #4f46e5; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">🔍 클레임 상세 내용 확인하기</a>
    </div>
    
    <p style="margin-bottom: 0;">감사합니다.</p>
    <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">본 메일은 QMS 시스템에서 자동으로 발송된 메일입니다.</p>
  </div>
</body>
</html>`;

            setSelectedDepts(defaultDepts);
            setEmailForm({
                toEmail: uniqueEmails.join(', '),
                subject: subject,
                body: body
            });
            setInitialToEmail('');
            setEmailModalTab('preview');
            setIsEmailModalOpen(true);
        } catch (error) {
            toast.error("재발방지대책 재요청 메일 준비 중 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };
    const handleClaimDelete = async () => {
        if (!claim || !claim.id) return;
        
        if (window.confirm("정말 이 클레임을 삭제하시겠습니까? 삭제된 데이터는 휴지통에서 확인 가능합니다.")) {
            try {
                await deleteClaim(claim.id);
                alert("클레임이 삭제되었습니다.");
                onSaved();
                onClose();
            } catch (error) {
                alert("삭제 중 오류가 발생했습니다.");
            }
        }
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        setIsConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsConfirmOpen(false);
        if (loading || isSavingRef.current) return;
        
        isSavingRef.current = true;
        const sanitizedData = { ...formData };
        const dateFields = ['receiptDate', 'expectedRetrievalDate', 'recallDate', 'qualityReceivedDate', 'terminationDate', 'mfrRecallDate', 'mfrTerminationDate'];
        dateFields.forEach(field => {
            if (sanitizedData[field] === '') {
                sanitizedData[field] = null;
            }
        });

        setLoading(true);
        try {
            if (claim) {
                // [버전 동기화] DB에서 최신 버전을 가져와서 낙관적 락 충돌 방지
                try {
                    const latestRes = await api.getClaimById(claim.id);
                    sanitizedData.version = latestRes.data.version || 0;
                } catch (versionErr) {
                    console.warn('최신 버전 조회 실패, 기존 버전 사용:', versionErr);
                }
                await updateClaim(claim.id, sanitizedData);
                alert("수정되었습니다.");
            } else {
                await createClaim(sanitizedData);
                alert("등록되었습니다.");
            }
            onSaved();
            onClose();
        } catch (error) {
            const serverMsg = error.response?.data?.message || "";
            alert(`저장 중에 오류가 발생했습니다.\n${serverMsg}\n날짜 형식이 올바른지 확인해주세요.`);
        } finally {
            setLoading(false);
            isSavingRef.current = false;
        }
    };

    return (
        <div className="drawer-overlay">
            <div className="drawer" onClick={e => e.stopPropagation()}>
                {/* 1. Header Section */}
                <div className="drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h2>{claim ? '🔍 클레임 상세 현황' : '🆕 신규 클레임 접수'}</h2>
                        {claim?.claimNumber && (
                            <span className="badge" style={{ 
                                background: '#e2e8f0', padding: '4px 12px', borderRadius: '20px', 
                                fontSize: '13px', fontWeight: 'bold', color: '#475569', 
                                border: '1px solid #cbd5e1' 
                            }}>
                                📑 {claim.claimNumber}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                {/* 2. Tabs Section */}
                <div className="drawer-tabs-wrapper">
                    <div className="drawer-tabs">
                        <button 
                            type="button" 
                            className={`drawer-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                            onClick={() => setActiveTab('details')} 
                        >
                            상세 정보
                        </button>
                        {!isManufacturer && (
                            <button 
                                type="button" 
                                className={`drawer-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                                onClick={() => setActiveTab('history')} 
                            >
                                변경 이력
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. Body Section (Scrollable) */}
                <div className="drawer-body">
                    <form id="claim-form" onSubmit={handleSubmit} className="drawer-body-form">
                        {activeTab === 'details' && (
                            <div className="tab-pane">
                                {/* 접수 정보 섹션 */}
                                <div className="card">
                                    <h3>
                                        <span style={{ color: '#4a90e2' }}>📝</span> 접수 정보
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>접수일자</label>
                                            <input type="date" name="receiptDate" value={formData.receiptDate} onChange={handleChange} disabled={!canEditCs} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>인입 국가</label>
                                            <input type="text" name="country" value={formData.country} onChange={handleChange} disabled={!canEditCs} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '20px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>품목코드</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input type="text" value={formData.itemCode} readOnly style={{ flex: 1, backgroundColor: '#f8fafc' }} />
                                                {canEditCs && <button type="button" onClick={() => setIsSearchPopupOpen(true)} className="secondary" style={{ padding: '0 15px' }}>검색</button>}
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>품목명</label>
                                            <input type="text" value={formData.productName} readOnly style={{ backgroundColor: '#f8fafc' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>로트(LOT)</label>
                                            <input type="text" name="lotNumber" value={formData.lotNumber} onChange={handleChange} disabled={!canEditCs} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>발생수량</label>
                                            <input type="number" name="occurrenceQty" value={formData.occurrenceQty} onChange={handleChange} disabled={!canEditCs} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>상세 클레임 내용</label>
                                        <textarea name="claimContent" value={formData.claimContent} onChange={handleChange} disabled={!canEditCs} rows="4" />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '20px' }}>
                                        <label>첨부 사진 (최대 5MB, 10개까지)</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
                                            {formData.claimPhotos.map((photo, idx) => (
                                                <div key={idx} style={{ position: 'relative', width: '90px', height: '90px' }}>
                                                    <img 
                                                        src={photo.startsWith('http') ? photo : `http://localhost:8080${photo}`} 
                                                        alt="Claim" 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }} 
                                                        onClick={() => window.open(photo.startsWith('http') ? photo : `http://localhost:8080${photo}`, '_blank')}
                                                    />
                                                    {canEditCs && (
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                                                            style={{ 
                                                                position: 'absolute', top: -8, right: -8, background: '#ef4444', 
                                                                color: 'white', border: 'none', borderRadius: '50%', 
                                                                width: '24px', height: '24px', cursor: 'pointer', 
                                                                fontSize: '14px', display: 'flex', alignItems: 'center', 
                                                                justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                                                            }}
                                                        >&times;</button>
                                                    )}
                                                </div>
                                            ))}
                                            {canEditCs && formData.claimPhotos.length < 10 && (
                                                <div style={{ 
                                                    width: '90px', height: '90px', background: '#f8fafc', 
                                                    border: '2px dashed #cbd5e1', borderRadius: '8px', 
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                                    justifyContent: 'center', cursor: 'pointer', position: 'relative', 
                                                    color: '#64748b', transition: 'all 0.2s'
                                                }}>
                                                    <span style={{ fontSize: '24px' }}>+</span>
                                                    <span style={{ fontSize: '11px' }}>추가</span>
                                                    <input 
                                                        type="file" 
                                                        multiple 
                                                        accept="image/*" 
                                                        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} 
                                                        onChange={handlePhotoUpload} 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 품질 분석 및 조치 (제조사 미노출) */}
                                {!isManufacturer && (
                                    <div className="card" style={{ borderLeft: '5px solid #38b2ac' }}>
                                        <h3>
                                            <span style={{ color: '#38b2ac' }}>🔬</span> 품질 분석 및 조치
                                        </h3>
                                        {(isAdmin || isQuality) && (
                                            <div style={{ 
                                                display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px', 
                                                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', 
                                                marginBottom: '20px' 
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <label className="custom-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#1e293b' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            name="sharedWithManufacturer" 
                                                            checked={formData.sharedWithManufacturer} 
                                                            onChange={(e) => setFormData(p => ({ ...p, sharedWithManufacturer: e.target.checked }))}
                                                            disabled={!canEditQuality}
                                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                        />
                                                        클레임 제조사 공개 여부 (QMS 시스템 권한)
                                                    </label>
                                                    <span style={{ fontSize: '12px', color: '#64748b' }}>* 체크 시 제조사 담당자가 로그인하여 해당 클레임을 조회하고 의견을 작성할 수 있습니다.</span>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '5px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                                                    <label className="custom-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#be123c' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            name="isCriticalClaim" 
                                                            checked={formData.isCriticalClaim} 
                                                            onChange={(e) => setFormData(p => ({ ...p, isCriticalClaim: e.target.checked }))}
                                                            disabled={!canEditQuality}
                                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                        />
                                                        🔥 크리티컬 클레임으로 지정 (제조사 재발방지대책(CAPA) 연계 요구)
                                                    </label>
                                                </div>

                                                {formData.isCriticalClaim && (
                                                    <div style={{ padding: '15px', background: '#fff5f5', borderRadius: '8px', border: '1px solid #feb2b2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#9b2c2c' }}>
                                                            ⚠️ 재발방지대책 요구 상태: 
                                                            <span style={{ marginLeft: '6px', color: 
                                                                formData.criticalRequestStatus === 'APPROVED' ? '#2f855a' : 
                                                                formData.criticalRequestStatus === 'RE_REQUESTED' ? '#c53030' : '#dd6b20'
                                                            }}>
                                                                {formData.criticalRequestStatus === 'PENDING' ? '대책 수립 대기' : 
                                                                 formData.criticalRequestStatus === 'SUBMITTED' ? '제출 완료 (검토중)' : 
                                                                 formData.criticalRequestStatus === 'RE_REQUESTED' ? '대책 재요청됨' : '최종 승인 완료'}
                                                            </span>
                                                        </span>
                                                        {(isAdmin || isQuality) && formData.criticalRequestStatus === 'SUBMITTED' && (
                                                            <button
                                                                type="button"
                                                                onClick={handleReRequestCapa}
                                                                style={{ padding: '6px 12px', fontSize: '12px', color: '#c53030', background: '#fff', border: '1px solid #feb2b2', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                                                            >
                                                                ↩️ 대책 재요청
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {(!isManufacturer) && formData.emailSentAt && (
                                                    <div style={{ fontSize: '13px', color: '#4f46e5', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        📧 제조사 전달 메일 발송 일시: <span style={{ color: '#1e293b' }}>{formData.emailSentAt.substring(0, 16).replace('T', ' ')}</span>
                                                    </div>
                                                )}
                                                
                                                
                                                {formData.sharedWithManufacturer && (
                                                    <>
                                                        <div style={{ height: '1px', background: '#e2e8f0', margin: '5px 0' }}></div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: 'bold', color: '#334155' }}>📧 알림 메일 즉시 발송</span>
                                                            <select 
                                                                value={selectedTemplate} 
                                                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '200px' }}
                                                            >
                                                                {templates.length === 0 && <option value="">이용 가능한 양식 없음</option>}
                                                                {templates.map(t => (
                                                                    <option key={t.templateCode} value={t.templateCode}>{t.templateName}</option>
                                                                ))}
                                                            </select>
                                                            <button 
                                                                type="button" 
                                                                onClick={handleOpenEmailModal} 
                                                                disabled={isSendingEmail || !selectedTemplate}
                                                                className="primary"
                                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 'bold' }}
                                                            >
                                                                {isSendingEmail ? (
                                                                    <><div className="spinner-ring" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div> 처리 중...</>
                                                                ) : (
                                                                    <>메일 발송하기</>
                                                                )}
                                                            </button>
                                                            <span style={{ fontSize: '12px', color: '#64748b' }}>* 버튼 클릭 시 해당 양식으로 메일 내용 미리보기가 표시됩니다.</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>품질팀 처리 상태</label>
                                                <select 
                                                    name="qualityStatus" 
                                                    value={formData.qualityStatus} 
                                                    onChange={handleChange} 
                                                    disabled={!canEditQuality}
                                                    style={{ fontWeight: 'bold' }}
                                                >
                                                    <option value="0. 접수">0. 접수</option>
                                                    <option value="1. 클레임 접수">1. 클레임 접수</option>
                                                    <option value="2. 원인분석/개선방안">2. 원인분석/개선방안</option>
                                                    <option value="3. 재발방지 수립/적용">3. 재발방지 수립/적용</option>
                                                    <option value="4. 클레임 종결">4. 클레임 종결</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>품질팀 클레임 종결일</label>
                                                <input type="date" name="terminationDate" value={formData.terminationDate} onChange={handleChange} disabled={!canEditQuality || !formData.preventativeAction} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>회수 제품 수령 여부</label>
                                                <select name="qualityReceivedReturnedProduct" value={formData.qualityReceivedReturnedProduct} onChange={handleChange} disabled={!canEditQuality}>
                                                    <option value="미수령">미수령</option>
                                                    <option value="수령">수령</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>회수 제품 수령일자</label>
                                                <input type="date" name="qualityReceivedDate" value={formData.qualityReceivedDate} onChange={handleChange} disabled={!canEditQuality} />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>품질팀 원인 분석/개선 방안</label>
                                            <textarea name="rootCauseAnalysis" value={formData.rootCauseAnalysis} onChange={handleChange} disabled={!canEditQuality} rows="3" />
                                        </div>
                                        <div className="form-group">
                                            <label>품질팀 재발방지대책 수립</label>
                                            <textarea name="preventativeAction" value={formData.preventativeAction} onChange={handleChange} disabled={!canEditQuality} rows="3" />
                                        </div>
                                    </div>
                                )}

                                {/* 제조사 담당자 기재 구역 */}
                                {(isManufacturer || (formData.sharedWithManufacturer && (isAdmin || isQuality))) && (
                                    <div className="card" style={{ borderLeft: '5px solid #ed8936' }}>
                                        <h3>
                                            <span style={{ color: '#ed8936' }}>🏭</span> 제조사 담당자 의견
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>제조사 처리 상태</label>
                                                <select 
                                                    name="mfrStatus" 
                                                    value={formData.mfrStatus} 
                                                    onChange={handleChange} 
                                                    disabled={!canEditMfr}
                                                    style={{ border: '1px solid #fbd38d', fontWeight: 'bold' }}
                                                >
                                                    <option value="1. 접수">1. 접수</option>
                                                    <option value="2. 원인분석">2. 원인분석</option>
                                                    <option value="3. 대책수립">3. 대책수립</option>
                                                    <option value="4. 클레임 종결">4. 클레임 종결</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>제조사 종결일자</label>
                                                <input type="date" name="mfrTerminationDate" value={formData.mfrTerminationDate} onChange={handleChange} disabled={!canEditMfr || !formData.mfrPreventativeAction} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>제조사 제품 회수 여부</label>
                                                <select name="mfrRecallStatus" value={formData.mfrRecallStatus} onChange={handleChange} disabled={!canEditMfr}>
                                                    <option value="미회수">미회수</option>
                                                    <option value="회수">회수</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>제조사 제품 회수 일자</label>
                                                <input type="date" name="mfrRecallDate" value={formData.mfrRecallDate} onChange={handleChange} disabled={!canEditMfr} />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>제조사 원인 분석</label>
                                            <textarea name="mfrRootCauseAnalysis" value={formData.mfrRootCauseAnalysis} onChange={handleChange} disabled={!canEditMfr} rows="3" />
                                        </div>
                                        <div className="form-group">
                                            <label>제조사 재발방지 대책</label>
                                            <textarea name="mfrPreventativeAction" value={formData.mfrPreventativeAction} onChange={handleChange} disabled={!canEditMfr} rows="3" />
                                        </div>

                                        {/* 클레임 대체 보고서 첨부 섹션 */}
                                        <div className="form-group" style={{ marginTop: '20px', borderTop: '1px dashed #e2e8f0', paddingTop: '20px' }}>
                                            <label style={{ fontWeight: 'bold', color: '#4a5568', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                📂 클레임 대체 보고서 첨부 (PDF, JPG)
                                            </label>
                                            
                                            {formData.manufacturerResponsePdf ? (
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '15px', 
                                                    marginTop: '10px', 
                                                    padding: '12px 16px', 
                                                    background: '#f8fafc', 
                                                    border: '1px solid #e2e8f0', 
                                                    borderRadius: '8px' 
                                                }}>
                                                    {/* 미리보기 영역 */}
                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        {formData.manufacturerResponsePdf.toLowerCase().endsWith('.pdf') ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontSize: '24px' }}>📄</span>
                                                                <a 
                                                                    href={formData.manufacturerResponsePdf.startsWith('http') ? formData.manufacturerResponsePdf : `http://localhost:8080${formData.manufacturerResponsePdf}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: '#3182ce', fontWeight: 'bold', textDecoration: 'underline', fontSize: '13px' }}
                                                                >
                                                                    {decodeURIComponent(formData.manufacturerResponsePdf.split('/').pop()).replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '') || '대체_보고서.pdf'}
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                <img 
                                                                    src={formData.manufacturerResponsePdf.startsWith('http') ? formData.manufacturerResponsePdf : `http://localhost:8080${formData.manufacturerResponsePdf}`} 
                                                                    alt="대체 보고서" 
                                                                    style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #cbd5e0', cursor: 'pointer' }}
                                                                    onClick={() => window.open(formData.manufacturerResponsePdf.startsWith('http') ? formData.manufacturerResponsePdf : `http://localhost:8080${formData.manufacturerResponsePdf}`, '_blank')}
                                                                />
                                                                <span style={{ fontSize: '11px', color: '#718096' }}>* 이미지 클릭 시 원본 보기</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 제거 버튼 */}
                                                    {canEditMfr && (
                                                        <button 
                                                            type="button" 
                                                            onClick={removeResponsePdf} 
                                                            className="secondary"
                                                            style={{ 
                                                                padding: '6px 12px', 
                                                                background: '#fee2e2', 
                                                                color: '#ef4444', 
                                                                border: '1px solid #fca5a5', 
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                fontWeight: 'bold',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fca5a5'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                                                        >
                                                            제거
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ marginTop: '10px' }}>
                                                    {canEditMfr ? (
                                                        <div style={{ 
                                                            display: 'inline-block', 
                                                            position: 'relative',
                                                            background: '#fff',
                                                            border: '1px solid #cbd5e0',
                                                            borderRadius: '6px',
                                                            padding: '8px 16px',
                                                            cursor: 'pointer',
                                                            textAlign: 'center',
                                                            fontSize: '13px',
                                                            fontWeight: 'bold',
                                                            color: '#4a5568',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#cbd5e0'; e.currentTarget.style.background = '#f7fafc'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e0'; e.currentTarget.style.background = '#fff'; }}
                                                        >
                                                            📁 보고서 파일 업로드 (PDF, JPG)
                                                            <input 
                                                                type="file" 
                                                                accept=".pdf, image/jpeg, image/jpg" 
                                                                onChange={handleResponsePdfUpload}
                                                                style={{ 
                                                                    position: 'absolute', 
                                                                    top: 0, 
                                                                    left: 0, 
                                                                    width: '100%', 
                                                                    height: '100%', 
                                                                    opacity: 0, 
                                                                    cursor: 'pointer' 
                                                                }} 
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: '13px', color: '#a0aec0', fontStyle: 'italic' }}>등록된 대체 보고서가 없습니다.</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* 크리티컬 클레임 대책 재요청 피드백 루프 (제조사 의견 검토 후 반려) */}
                                        {formData.isCriticalClaim && (
                                            <div style={{ marginTop: '20px', borderTop: '1px solid #fecaca', paddingTop: '20px' }}>
                                                <div style={{ padding: '15px', background: '#fff5f5', borderRadius: '8px', border: '1px solid #feb2b2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#9b2c2c' }}>
                                                        ⚠️ 재발방지대책 요구 상태: 
                                                        <span style={{ marginLeft: '6px', color: 
                                                            formData.criticalRequestStatus === 'APPROVED' ? '#2f855a' : 
                                                            formData.criticalRequestStatus === 'RE_REQUESTED' ? '#c53030' : '#dd6b20'
                                                        }}>
                                                            {formData.criticalRequestStatus === 'PENDING' ? '대책 수립 대기' : 
                                                             formData.criticalRequestStatus === 'SUBMITTED' ? '제출 완료 (품질팀 검토 중)' : 
                                                             formData.criticalRequestStatus === 'RE_REQUESTED' ? '대책 재요청됨' : '최종 승인 완료'}
                                                        </span>
                                                    </span>
                                                    {(isAdmin || isQuality) && formData.criticalRequestStatus === 'SUBMITTED' && (
                                                        <button
                                                            type="button"
                                                            onClick={handleReRequestCapa}
                                                            style={{ padding: '8px 16px', fontSize: '13px', color: '#c53030', background: '#fff', border: '1px solid #feb2b2', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                        >
                                                            ↩️ 제조사 대책 재요청 (반려)
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="tab-pane">
                                {history.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0', background: '#f8fafc', borderRadius: '12px' }}>
                                        <p style={{ fontSize: '18px', margin: 0 }}>📭 변경 이력이 없습니다.</p>
                                    </div>
                                ) : (
                                    Object.entries(
                                        history.reduce((acc, rec) => {
                                            const timeKey = rec.modifiedAt ? rec.modifiedAt.substring(0, 19).replace('T', ' ') : '알 수 없는 시간';
                                            const mName = rec.modifierName || rec.modifier || '시스템';
                                            const mId = rec.modifierUsername ? `(${rec.modifierUsername})` : '';
                                            const mComp = rec.modifierCompany ? ` [${rec.modifierCompany}]` : '';
                                            const groupKey = `${mName}${mId}${mComp} | ${timeKey}`;
                                            if (!acc[groupKey]) acc[groupKey] = [];
                                            acc[groupKey].push(rec);
                                            return acc;
                                        }, {})
                                    ).map(([groupKey, records], idx) => (
                                        <div key={idx} className="card">
                                            <div style={{ color: '#2b6cb0', fontWeight: '800', fontSize: '14px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                🕒 {groupKey}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {records.map((rec, rIdx) => {
                                                    const displayName = fieldTranslations[rec.fieldName] || rec.fieldName;
                                                    const oldVal = formatHistoryValue(rec.oldValue, rec.fieldName);
                                                    const newVal = formatHistoryValue(rec.newValue, rec.fieldName);
                                                    
                                                    return (
                                                        <div key={rec.id || rIdx} style={{ fontSize: '13px', paddingLeft: '15px', position: 'relative', borderLeft: '2px solid #e2e8f0', paddingBottom: '5px' }}>
                                                            <strong style={{ display: 'inline-block', minWidth: '140px', color: '#4a5568' }}>{displayName}</strong>
                                                            <span style={{ color: '#e53e3e', textDecoration: oldVal === '없음' ? 'none' : 'line-through', marginRight: '8px' }}>{oldVal}</span>
                                                            <span style={{ color: '#a0aec0', margin: '0 8px' }}>→</span>
                                                            <span style={{ color: '#38a169', fontWeight: '700' }}>{newVal}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </form>
                </div>

                {/* 4. Footer Section */}
                <div className="drawer-footer">
                    <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#94a3b8' }}>
                        <span>📅 등록일: <strong>{formData.createdAt ? formData.createdAt.substring(0, 16).replace('T', ' ') : '-'}</strong></span>
                        <span>🔄 마지막 수정: <strong>{formData.updatedAt ? formData.updatedAt.substring(0, 16).replace('T', ' ') : '-'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {claim && canDeleteClaim('claims') && (
                            <button 
                                type="button" 
                                className="outline" 
                                onClick={handleClaimDelete} 
                                style={{ minWidth: '80px', color: '#dc3545', borderColor: '#dc3545' }}
                            >
                                🗑️ 삭제
                            </button>
                        )}
                        <button type="button" className="secondary" onClick={onClose} style={{ minWidth: '80px' }}>닫기</button>
                        {(canEditQuality || canEditMfr) && (
                            <button 
                                type="submit" 
                                form="claim-form"
                                className="primary" 
                                style={{ minWidth: '120px', background: '#003366', color: '#fff' }} 
                                disabled={loading}
                            >
                                {loading ? '⏳ 저장 중...' : (claim ? '💾 저장하기' : '🚀 등록하기')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Popups */}
            {isSearchPopupOpen && (
                <ProductSearchPopup 
                    onClose={() => setIsSearchPopupOpen(false)}
                    onSelect={(p) => {
                        setFormData(prev => ({ ...prev, itemCode: p.itemCode, productName: p.productName, manufacturer: p.manufacturerName || p.manufacturer || '' }));
                        setIsSearchPopupOpen(false);
                    }}
                />
            )}
            {isConfirmOpen && (
                <SaveConfirmModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmSave}
                />
            )}
            
            {isEmailModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '700px', maxWidth: '95vw', borderRadius: '16px', backdropFilter: 'blur(20px)', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid #edf2f7', padding: '20px 25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1a202c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📧 클레임 알림 메일 발송 미리보기
                                </h3>
                                <button onClick={() => setIsEmailModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#a0aec0' }}>
                                    ×
                                </button>
                            </div>
                        </div>
                        
                        <div className="modal-body" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: '700', fontSize: '14px', color: '#4a5568', marginBottom: '8px', display: 'block' }}>수신자 이메일</label>
                                <input 
                                    type="email" 
                                    value={emailForm.toEmail} 
                                    onChange={(e) => setEmailForm({ ...emailForm, toEmail: e.target.value })}
                                    placeholder="이메일 주소를 쉼표로 구분하여 여러 개 입력할 수 있습니다" 
                                    style={{ width: '100%', height: '45px', borderRadius: '8px', border: '1px solid #cbd5e0', padding: '0 15px', fontSize: '14px' }} 
                                />
                                {!emailForm.toEmail && (
                                    <p style={{ margin: '6px 0 0 0', color: '#e53e3e', fontSize: '12px', fontWeight: '600' }}>
                                        ⚠️ 제조사에 등록된 이메일이 없습니다. 이메일 주소를 직접 입력해 주세요.
                                    </p>
                                )}
                            </div>

                            {Object.keys(deptEmails).length > 0 && (
                                <div className="form-group">
                                    <label style={{ fontWeight: '700', fontSize: '14px', color: '#4a5568', marginBottom: '8px', display: 'block' }}>
                                        🏢 제조사 내 수신 부서/팀 필터 (체크 시 수신 주소 목록에 자동 추가)
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', background: '#f7fafc', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        {Object.keys(deptEmails).map(dept => (
                                            <label key={dept} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#4a5568', cursor: 'pointer', margin: 0 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDepts.includes(dept)}
                                                    onChange={() => handleDeptToggle(dept)}
                                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                />
                                                <span>{dept} ({deptEmails[dept].length}명)</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label style={{ fontWeight: '700', fontSize: '14px', color: '#4a5568', marginBottom: '8px', display: 'block' }}>메일 제목</label>
                                <input 
                                    type="text" 
                                    value={emailForm.subject} 
                                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                                    placeholder="메일 제목을 입력하세요" 
                                    style={{ width: '100%', height: '45px', borderRadius: '8px', border: '1px solid #cbd5e0', padding: '0 15px', fontSize: '14px', fontWeight: '600' }} 
                                />
                            </div>

                            <div className="form-group">
                                <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #edf2f7', marginBottom: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEmailModalTab('preview')}
                                        style={{
                                            padding: '8px 16px',
                                            background: emailModalTab === 'preview' ? '#3182ce' : 'transparent',
                                            color: emailModalTab === 'preview' ? '#fff' : '#4a5568',
                                            border: 'none',
                                            borderTopLeftRadius: '6px',
                                            borderTopRightRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        👁️ 실제 메일 미리보기 (HTML 렌더링)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEmailModalTab('edit')}
                                        style={{
                                            padding: '8px 16px',
                                            background: emailModalTab === 'edit' ? '#3182ce' : 'transparent',
                                            color: emailModalTab === 'edit' ? '#fff' : '#4a5568',
                                            border: 'none',
                                            borderTopLeftRadius: '6px',
                                            borderTopRightRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        ✍️ 메일 내용 직접 편집 (HTML 코드)
                                    </button>
                                </div>

                                {emailModalTab === 'preview' ? (
                                    <div style={{
                                        border: '1px solid #cbd5e0',
                                        borderRadius: '8px',
                                        padding: '20px',
                                        background: '#fff',
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                                        fontSize: '14px',
                                        color: '#2d3748',
                                        lineHeight: '1.6'
                                    }}>
                                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(emailForm.body) }} />
                                    </div>
                                ) : (
                                    <textarea 
                                        value={emailForm.body} 
                                        onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                                        placeholder="메일 본문 내용을 입력하세요" 
                                        style={{ width: '100%', minHeight: '220px', borderRadius: '8px', border: '1px solid #cbd5e0', padding: '15px', fontSize: '14px', fontFamily: 'monospace', lineHeight: '1.5', resize: 'vertical' }} 
                                    />
                                )}
                            </div>
                        </div>

                        <div className="modal-footer" style={{ borderTop: '1px solid #edf2f7', padding: '15px 25px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={() => setIsEmailModalOpen(false)} 
                                className="secondary" 
                                style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
                                disabled={isSendingEmail}
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleSendEmail} 
                                className="primary" 
                                style={{ padding: '10px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
                                disabled={isSendingEmail}
                            >
                                {isSendingEmail ? (
                                    <>
                                        <span style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                                        <span>전송 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🚀 확인 및 발송</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClaimDrawer;
