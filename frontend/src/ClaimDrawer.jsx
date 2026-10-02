import React, { useState, useEffect } from 'react';
import { createClaim, updateClaim, uploadClaimResponse, uploadClaimPhoto, getClaimHistory, deleteClaim, getFileUrl, fetchApprovalDocTypes } from './api';
import * as api from './api';
import { toast } from 'react-toastify';
import DOMPurify from 'dompurify';
import ProductSearchPopup from './ProductSearchPopup';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';
import NumericFormattedInput from './components/common/NumericFormattedInput';
import useFormDraft from './hooks/useFormDraft';
import DraftRestoreBanner from './components/common/DraftRestoreBanner';
import CommonFilePreviewModal from './components/common/CommonFilePreviewModal';
import ApprovalSubmitModal from './ApprovalSubmitModal';

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
    const isQuality = stands.some(r => r.authority === 'ROLE_QUALITY') || 
        (!isManufacturer && (user?.department === 'Quality' || user?.department === '품질팀' || user?.department === '품질'));

    const { canEdit: canEditClaim, canDelete: canDeleteClaim, canApproveClaim } = usePermissions(user);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [isClaimDocTypeActive, setIsClaimDocTypeActive] = useState(false);
    const hasGlobalEdit = canEditClaim('claims');

    useEffect(() => {
        fetchApprovalDocTypes(true)
            .then(res => {
                const list = res.data || [];
                setIsClaimDocTypeActive(list.some(dt => dt.code === 'CLAIM_REPORT'));
            })
            .catch(() => setIsClaimDocTypeActive(false));
    }, []);

    // 폼 자동 임시저장(Autosave) 및 복원 훅
    const { hasDraft, draftSavedAt, restoreDraft, clearDraft } = useFormDraft(
        claim ? `claim_edit_${claim.id || claim.claimNumber}` : 'claim_new',
        formData,
        setFormData,
        { enabled: !readOnly && (canEditClaim('claims') || isAdmin || isQuality) }
    );

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

    // 수신자 자동완성 검색 및 태그 관리 상태 (구글 메일 스타일)
    const [recipientSearchKeyword, setRecipientSearchKeyword] = useState('');
    const [recipientSearchResults, setRecipientSearchResults] = useState([]);
    const [isSearchingRecipients, setIsSearchingRecipients] = useState(false);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const searchDropdownRef = React.useRef(null);
    const recipientInputRef = React.useRef(null);
    const [isRecipientInputFocused, setIsRecipientInputFocused] = useState(false);
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    const [recipientList, setRecipientList] = useState([]);

    // 메일 발송 및 회신 이력 상태
    const [mailHistories, setMailHistories] = useState([]);
    const [mailHistoryLoading, setMailHistoryLoading] = useState(false);
    const [previewMailModal, setPreviewMailModal] = useState({ open: false, title: '', body: '', sentAt: '', recipient: '' });
    const [previewModalFile, setPreviewModalFile] = useState(null);
    const [remindingId, setRemindingId] = useState(null);
    const [markingId, setMarkingId] = useState(null);

    // LOT 역추적 상태
    const [isLotTraceOpen, setIsLotTraceOpen] = useState(false);
    const [lotTraceLoading, setLotTraceLoading] = useState(false);
    const [lotTraceResults, setLotTraceResults] = useState([]);

    const handleTraceLot = async () => {
        if (!formData.lotNumber || !formData.lotNumber.trim()) {
            toast.warn("분석할 LOT 번호를 입력해주세요.");
            return;
        }
        setLotTraceLoading(true);
        setIsLotTraceOpen(true);
        try {
            const res = await api.getLotPpmAnalysis({
                lotNumber: formData.lotNumber.trim(),
                itemCode: formData.itemCode || ''
            });
            setLotTraceResults(res.data || []);
        } catch (err) {
            console.error("LOT 역추적 실패:", err);
            toast.error("LOT 역추적 데이터를 가져오지 못했습니다.");
        } finally {
            setLotTraceLoading(false);
        }
    };

    const loadMailHistories = async (forceRefresh = false) => {
        if (!claim?.id) return;
        setMailHistoryLoading(true);
        try {
            const res = await api.getMailHistoriesByDomain('CLAIM', claim.id, forceRefresh);
            setMailHistories(res.data || []);
        } catch (err) {
            console.error("클레임 메일 발송 이력 로드 실패:", err);
        } finally {
            setMailHistoryLoading(false);
        }
    };

    const handleMarkReplied = async (historyId) => {
        if (!window.confirm("제조사로부터 회신을 수령하셨습니까?\n동일 클레임 건의 모든 발송 이력을 회신 완료로 변경하고 리드타임을 기록합니다.")) return;
        setMarkingId(historyId);
        try {
            await api.markMailHistoryReplied(historyId);
            toast.success("회신 완료로 기록되었습니다.");
            loadMailHistories(true);
        } catch (err) {
            toast.error(err.response?.data?.message || "회신 상태 변경 실패");
        } finally {
            setMarkingId(null);
        }
    };

    const handleSendReminder = async (historyId) => {
        if (!window.confirm("제조사 담당자에게 리마인드 메일을 즉시 재발송하시겠습니까?")) return;
        setRemindingId(historyId);
        try {
            await api.sendMailHistoryReminder(historyId);
            toast.success("리마인드 메일이 성공적으로 재발송되었습니다.");
            loadMailHistories(true);
        } catch (err) {
            const msg = err.response?.data?.message || "리마인드 메일 발송 실패";
            toast.error(msg);
        } finally {
            setRemindingId(null);
        }
    };

    const formatLeadTime = (hours) => {
        if (hours === null || hours === undefined) return '-';
        if (hours < 1) return `${Math.round(hours * 60)}분`;
        if (hours < 24) return `${hours.toFixed(1)}시간`;
        const days = Math.floor(hours / 24);
        const remHours = Math.round(hours % 24);
        return `${days}일 ${remHours}시간`;
    };

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

    // 초기 마운트 시 메일 발송 이력 카운트 선조회
    useEffect(() => {
        if (claim?.id && !isManufacturer) {
            api.getMailHistoriesByDomain('CLAIM', claim.id)
                .then(res => setMailHistories(res.data || []))
                .catch(() => {});
        }
    }, [claim?.id, isManufacturer]);

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
        } else if (activeTab === 'mailHistory') {
            loadMailHistories();
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
        'ConsumerReplyNeeded': '고객 회신 필요 여부',
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

            // If uniqueEmails is empty and toEmail exists, use it
            if (uniqueEmails.length === 0 && toEmail) {
                toEmail.split(',').map(e => e.trim()).filter(Boolean).forEach(e => {
                    if (!uniqueEmails.includes(e)) uniqueEmails.push(e);
                });
            }

            const initialRecipients = [];
            uniqueEmails.forEach(email => {
                const deptName = Object.keys(loadedDeptEmails).find(k => (loadedDeptEmails[k] || []).map(e => e.trim()).includes(email)) || '';
                initialRecipients.push({
                    id: `init-${email}`,
                    name: email.split('@')[0],
                    companyName: companyName || '',
                    department: deptName,
                    email: email,
                    isCustom: false
                });
            });

            setRecipientList(initialRecipients);
            setRecipientSearchKeyword('');
            setRecipientSearchResults([]);
            setIsSearchDropdownOpen(false);

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

    // 수신자 자동완성 외부 클릭 감지
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
                setIsSearchDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 수신자 검색 디바운스 (150ms로 기민하게 반응)
    useEffect(() => {
        if (!recipientSearchKeyword || recipientSearchKeyword.trim().length < 1) {
            setRecipientSearchResults([]);
            setIsSearchingRecipients(false);
            setIsSearchDropdownOpen(false);
            setActiveSearchIndex(0);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingRecipients(true);
            try {
                const results = await api.searchUserRecipients(recipientSearchKeyword.trim());
                setRecipientSearchResults(Array.isArray(results) ? results : []);
                setActiveSearchIndex(0);
                setIsSearchDropdownOpen(true);
            } catch (err) {
                console.error("수신자 검색 실패:", err);
                setRecipientSearchResults([]);
            } finally {
                setIsSearchingRecipients(false);
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [recipientSearchKeyword]);

    const handleAddRecipientUser = (targetUser) => {
        if (!targetUser || !targetUser.email) {
            toast.warning("유효한 이메일 주소가 없는 사용자입니다.");
            return;
        }
        const trimmedEmail = targetUser.email.trim();
        const alreadyExists = recipientList.some(
            r => r.email && r.email.trim().toLowerCase() === trimmedEmail.toLowerCase()
        );
        if (alreadyExists) {
            toast.warning(`[${targetUser.name || targetUser.username}] 님은 이미 수신 목록에 포함되어 있습니다.`);
            return;
        }

        const newRec = {
            id: targetUser.id || `custom-${Date.now()}`,
            username: targetUser.username,
            name: targetUser.name || targetUser.username,
            email: trimmedEmail,
            companyName: targetUser.companyName || '-',
            department: targetUser.department || '-',
            position: targetUser.position || '',
            role: targetUser.role || '',
            isCustom: true
        };

        const updated = [...recipientList, newRec];
        setRecipientList(updated);
        setEmailForm(prev => ({ ...prev, toEmail: updated.map(r => r.email).join(', ') }));
        setRecipientSearchKeyword('');
        setIsSearchDropdownOpen(false);
        setActiveSearchIndex(0);
        recipientInputRef.current?.focus();
    };

    const handleAddDirectEmail = () => {
        const trimmed = recipientSearchKeyword.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            toast.warning("올바른 이메일 형식(예: user@example.com)을 입력해 주세요.");
            return;
        }
        const alreadyExists = recipientList.some(
            r => r.email && r.email.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (alreadyExists) {
            toast.warning("이미 수신 목록에 포함된 이메일 주소입니다.");
            return;
        }

        const newRec = {
            id: `direct-${Date.now()}`,
            username: trimmed.split('@')[0],
            name: trimmed.split('@')[0],
            email: trimmed,
            companyName: '외부',
            department: '-',
            position: '',
            role: '',
            isCustom: true
        };

        const updated = [...recipientList, newRec];
        setRecipientList(updated);
        setEmailForm(prev => ({ ...prev, toEmail: updated.map(r => r.email).join(', ') }));
        setRecipientSearchKeyword('');
        setIsSearchDropdownOpen(false);
        setActiveSearchIndex(0);
        recipientInputRef.current?.focus();
    };

    const handleRemoveRecipient = (emailToRemove) => {
        const updated = recipientList.filter(r => r.email !== emailToRemove);
        setRecipientList(updated);
        setEmailForm(prev => ({ ...prev, toEmail: updated.map(r => r.email).join(', ') }));
    };

    const handleDeptToggle = (deptName) => {
        const isChecked = selectedDepts.includes(deptName);
        const newDepts = isChecked 
            ? selectedDepts.filter(d => d !== deptName)
            : [...selectedDepts, deptName];
            
        setSelectedDepts(newDepts);

        // Gather all emails from checked departments
        const deptEmailsList = [];
        newDepts.forEach(d => {
            if (deptEmails[d]) {
                deptEmails[d].forEach(email => {
                    const trimmed = email.trim();
                    if (trimmed && !deptEmailsList.includes(trimmed)) {
                        deptEmailsList.push(trimmed);
                    }
                });
            }
        });

        // Retain custom searched recipients
        const customRecipients = recipientList.filter(r => r.isCustom);
        const newRecipientList = [...customRecipients];

        // Add department recipients
        const companyName = claim?.manufacturer || formData?.manufacturer || '';
        deptEmailsList.forEach(email => {
            if (!newRecipientList.some(r => r.email.toLowerCase() === email.toLowerCase())) {
                newRecipientList.push({
                    id: `dept-${email}`,
                    name: email.split('@')[0],
                    companyName: companyName,
                    department: Object.keys(deptEmails).find(k => (deptEmails[k] || []).includes(email)) || '',
                    email: email,
                    isCustom: false
                });
            }
        });

        setRecipientList(newRecipientList);
        setEmailForm(prev => ({ ...prev, toEmail: newRecipientList.map(r => r.email).join(', ') }));
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
      <a href="${window.location.origin}/?claimId=${claim.id}&amp;fromEmail=true" style="display: inline-block; padding: 12px 24px; color: #ffffff; background-color: #4f46e5; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">🔍 클레임 상세 내용 확인하기</a>
    </div>
    
    <p style="margin-bottom: 0;">감사합니다.</p>
    <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">본 메일은 QMS 시스템에서 자동으로 발송된 메일입니다.</p>
  </div>
</body>
</html>`;

            const initialRecipients = [];
            uniqueEmails.forEach(email => {
                const deptName = Object.keys(loadedDeptEmails).find(k => (loadedDeptEmails[k] || []).map(e => e.trim()).includes(email)) || '';
                initialRecipients.push({
                    id: `init-${email}`,
                    name: email.split('@')[0],
                    companyName: companyName || '',
                    department: deptName,
                    email: email,
                    isCustom: false
                });
            });

            setRecipientList(initialRecipients);
            setRecipientSearchKeyword('');
            setRecipientSearchResults([]);
            setIsSearchDropdownOpen(false);

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
                // 기존 보유 버전 전달 (불필요한 선행 GET 조회 제거)
                sanitizedData.version = claim.version ?? formData.version ?? 0;
                await updateClaim(claim.id, sanitizedData);
                alert("수정되었습니다.");
            } else {
                await createClaim(sanitizedData);
                alert("등록되었습니다.");
            }
            clearDraft();
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
        <div className="drawer-overlay" style={{ zIndex: 4500 }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {claim && canApproveClaim && isClaimDocTypeActive && (
                            <button 
                                type="button" 
                                className="outline" 
                                onClick={() => setIsApprovalModalOpen(true)} 
                                style={{ 
                                    padding: '6px 14px', 
                                    color: '#4f46e5', 
                                    borderColor: '#818cf8', 
                                    fontWeight: 'bold', 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '6px',
                                    fontSize: '13px',
                                    borderRadius: '6px'
                                }}
                                title="이 CX 클레임 건을 전자결재로 상신합니다."
                            >
                                📝 전자결재 상신
                            </button>
                        )}
                        <button onClick={onClose} className="secondary close-button">
                            <span className="icon">×</span> 닫기
                        </button>
                    </div>
                </div>

                {hasDraft && (
                    <div style={{ padding: '0 24px', paddingTop: '12px' }}>
                        <DraftRestoreBanner
                            hasDraft={hasDraft}
                            draftSavedAt={draftSavedAt}
                            onRestore={restoreDraft}
                            onClear={clearDraft}
                        />
                    </div>
                )}

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
                            <>
                                <button 
                                    type="button" 
                                    className={`drawer-tab-btn ${activeTab === 'mailHistory' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('mailHistory')} 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <span>📧 메일 발송·회신 이력</span>
                                    {mailHistories.length > 0 && (
                                        <span style={{ 
                                            background: '#3b82f6', color: '#fff', fontSize: '11px', 
                                            fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px' 
                                        }}>
                                            {mailHistories.length}
                                        </span>
                                    )}
                                </button>
                                <button 
                                    type="button" 
                                    className={`drawer-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('history')} 
                                >
                                    변경 이력
                                </button>
                            </>
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
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label style={{ margin: 0 }}>로트(LOT)</label>
                                                {formData.lotNumber && (
                                                    <button 
                                                        type="button" 
                                                        onClick={handleTraceLot} 
                                                        className="secondary" 
                                                        style={{ fontSize: '11px', padding: '2px 8px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 'bold' }}
                                                        title="해당 LOT 번호의 전체 입고 수량 및 누적 클레임 불량률 통계 분석"
                                                    >
                                                        🔍 LOT 분석
                                                    </button>
                                                )}
                                            </div>
                                            <input type="text" name="lotNumber" value={formData.lotNumber} onChange={handleChange} disabled={!canEditCs} placeholder="예: 24A01 또는 LOT-202608..." />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>발생수량</label>
                                            <NumericFormattedInput name="occurrenceQty" value={formData.occurrenceQty} onChange={handleChange} disabled={!canEditCs} placeholder="수량 입력" />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label style={{ margin: 0 }}>고객 회신 필요</label>
                                                {formData.consumerReplyNeeded === '필요' && (
                                                    <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 'bold', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px' }}>
                                                        🚨 회신 필수
                                                    </span>
                                                )}
                                            </div>
                                            <select 
                                                name="consumerReplyNeeded" 
                                                value={formData.consumerReplyNeeded || '불필요'} 
                                                onChange={handleChange} 
                                                disabled={!canEditCs}
                                                style={{ 
                                                    fontWeight: formData.consumerReplyNeeded === '필요' ? 'bold' : 'normal',
                                                    borderColor: formData.consumerReplyNeeded === '필요' ? '#ef4444' : '#cbd5e1',
                                                    backgroundColor: formData.consumerReplyNeeded === '필요' ? '#fff5f5' : '#fff',
                                                    color: formData.consumerReplyNeeded === '필요' ? '#b91c1c' : '#1e293b'
                                                }}
                                            >
                                                <option value="불필요">불필요 (기본)</option>
                                                <option value="필요">⚠️ 필요 (고객 회신 요구)</option>
                                            </select>
                                        </div>
                                    </div>
                                    {formData.consumerReplyNeeded === '필요' && (
                                        <div style={{ 
                                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', 
                                            marginBottom: '16px', background: '#fff1f2', border: '1px solid #fecdd3', 
                                            borderRadius: '6px', fontSize: '12px', color: '#be123c' 
                                        }}>
                                            <span>⚠️</span>
                                            <span><b>고객 회신 필요 건</b>으로 지정되었습니다. 클레임 목록에서 붉은색 배경으로 강조 표기됩니다.</span>
                                        </div>
                                    )}
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
                                                        src={getFileUrl(photo)} 
                                                        alt="Claim" 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }} 
                                                        onClick={() => setPreviewModalFile({ url: getFileUrl(photo), title: `클레임 사진 #${idx + 1}` })}
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
                                                                    href={getFileUrl(formData.manufacturerResponsePdf)} 
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setPreviewModalFile({
                                                                            url: getFileUrl(formData.manufacturerResponsePdf),
                                                                            title: '제조사 회신 보고서',
                                                                            type: 'PDF'
                                                                        });
                                                                    }}
                                                                    style={{ color: '#3182ce', fontWeight: 'bold', textDecoration: 'underline', fontSize: '13px', cursor: 'pointer' }}
                                                                >
                                                                    {decodeURIComponent(formData.manufacturerResponsePdf.split('/').pop()).replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '') || '대체_보고서.pdf'}
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                <img 
                                                                    src={getFileUrl(formData.manufacturerResponsePdf)} 
                                                                    alt="대체 보고서" 
                                                                    style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #cbd5e0', cursor: 'pointer' }}
                                                                    onClick={() => setPreviewModalFile({
                                                                        url: getFileUrl(formData.manufacturerResponsePdf),
                                                                        title: '제조사 회신 보고서',
                                                                        type: 'IMAGE'
                                                                    })}
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

                        {activeTab === 'mailHistory' && (
                            <div className="tab-pane">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                                        📬 클레임 메일 발송 및 제조사 회신 이력 
                                        <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b', marginLeft: '8px' }}>
                                            (양식 마스터 설정에 따라 최근 이력 자동 보관)
                                        </span>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={loadMailHistories} 
                                        className="secondary" 
                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                        disabled={mailHistoryLoading}
                                    >
                                        🔄 새로고침
                                    </button>
                                </div>

                                {mailHistoryLoading ? (
                                    <div style={{ textAlign: 'center', padding: '50px' }}>
                                        <div className="spinner-ring" style={{ margin: '0 auto 12px auto' }}></div>
                                        <div style={{ color: '#64748b', fontSize: '13px' }}>메일 발송 이력을 조회하고 있습니다...</div>
                                    </div>
                                ) : mailHistories.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '50px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                        <p style={{ fontSize: '24px', margin: '0 0 10px 0' }}>📭</p>
                                        <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#475569', margin: '0 0 6px 0' }}>발송된 메일 이력이 없습니다.</p>
                                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>상세 정보 탭에서 [제조사 공개] 체크 후 메일을 발송하시면 회신 추적 및 리마인드가 활성화됩니다.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {mailHistories.map((item, idx) => {
                                            const isReplied = item.replyStatus === 'REPLIED';
                                            const isOverdue = item.replyStatus === 'OVERDUE';

                                            return (
                                                <div 
                                                    key={item.id || idx} 
                                                    className="card" 
                                                    style={{ 
                                                        margin: 0,
                                                        borderLeft: isReplied ? '4px solid #10b981' : isOverdue ? '4px solid #ef4444' : '4px solid #f59e0b',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                <span style={{ 
                                                                    background: item.dispatchType === 'REMINDER' ? '#fffbeb' : '#eff6ff', 
                                                                    color: item.dispatchType === 'REMINDER' ? '#b45309' : '#1d4ed8', 
                                                                    border: item.dispatchType === 'REMINDER' ? '1px solid #fde68a' : '1px solid #bfdbfe',
                                                                    fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' 
                                                                }}>
                                                                    {item.dispatchType === 'REMINDER' ? `🔔 리마인드 (${item.reminderCount}회차)` : '📤 최초 발송'}
                                                                </span>
                                                                <strong style={{ fontSize: '15px', color: '#1e293b' }}>
                                                                    {item.templateName || item.subject}
                                                                </strong>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                                발송일시: <strong>{item.sentAt ? item.sentAt.substring(0, 19).replace('T', ' ') : '-'}</strong> | 발송자: <strong>{item.senderName || item.senderEmail || '시스템'}</strong>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ 
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                                fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px',
                                                                background: isReplied ? '#dcfce7' : isOverdue ? '#fee2e2' : '#fef3c7',
                                                                color: isReplied ? '#15803d' : isOverdue ? '#b91c1c' : '#b45309',
                                                                border: isReplied ? '1px solid #bbf7d0' : isOverdue ? '1px solid #fecaca' : '1px solid #fde68a'
                                                            }}>
                                                                {isReplied ? `✅ 회신 완료 (${formatLeadTime(item.leadTimeHours)})` :
                                                                 isOverdue ? '🚨 회신 지연' : '⏳ 회신 대기'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#334155', marginBottom: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                                                        <div><strong>수신처:</strong> {item.recipientEmail}</div>
                                                        {item.ccEmail && <div><strong>참조:</strong> {item.ccEmail}</div>}
                                                        <div><strong>제목:</strong> {item.subject}</div>
                                                        {isReplied && (
                                                            <div style={{ color: '#15803d' }}>
                                                                <strong>회신일시:</strong> {item.repliedAt ? item.repliedAt.substring(0, 19).replace('T', ' ') : '-'}
                                                            </div>
                                                        )}
                                                        {item.remindTargetDate && !isReplied && (
                                                            <div style={{ color: '#d97706' }}>
                                                                <strong>다음 자동 리마인드 예정:</strong> {item.remindTargetDate.substring(0, 10)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewMailModal({
                                                                open: true,
                                                                title: item.subject,
                                                                body: item.contentSnapshot,
                                                                sentAt: item.sentAt,
                                                                recipient: item.recipientEmail
                                                            })}
                                                            className="secondary"
                                                            style={{ fontSize: '12px', padding: '4px 10px' }}
                                                        >
                                                            👁️ 메일 원문 보기
                                                        </button>
                                                        
                                                        {(isAdmin || isQuality) && !isReplied && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleMarkReplied(item.id)}
                                                                    disabled={markingId === item.id}
                                                                    style={{ 
                                                                        fontSize: '12px', padding: '4px 10px', 
                                                                        background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', 
                                                                        borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' 
                                                                    }}
                                                                >
                                                                    {markingId === item.id ? '기록 중...' : '↩️ 수동 회신 확인'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSendReminder(item.id)}
                                                                    disabled={remindingId === item.id}
                                                                    style={{ 
                                                                        fontSize: '12px', padding: '4px 10px', 
                                                                        background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', 
                                                                        borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' 
                                                                    }}
                                                                >
                                                                    {remindingId === item.id ? '발송 중...' : '🔔 즉시 리마인드 재발송'}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                </div>

                {/* 4. Footer Section */}
                <div className="drawer-footer">
                    <div className="footer-left">
                        <span>📅 등록일: <strong>{formData.createdAt ? formData.createdAt.substring(0, 16).replace('T', ' ') : '-'}</strong></span>
                        <span>🔄 마지막 수정: <strong>{formData.updatedAt ? formData.updatedAt.substring(0, 16).replace('T', ' ') : '-'}</strong></span>
                    </div>
                    <div className="footer-actions">
                        {claim && canDeleteClaim('claims') && (
                            <button 
                                type="button" 
                                className="outline" 
                                onClick={handleClaimDelete} 
                                style={{ minWidth: '80px', color: '#c53030', borderColor: '#feb2b2', marginRight: 'auto' }}
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
                                style={{ minWidth: '120px', background: '#003366', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', padding: '10px 20px' }} 
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
                <div className="modal-overlay" style={{ zIndex: 10001 }}>
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
                            {/* Google Mail (Gmail) 스타일 받는사람 수신자 입력바 */}
                            <div style={{ position: 'relative' }} ref={searchDropdownRef}>
                                <div
                                    onClick={() => recipientInputRef.current?.focus()}
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        minHeight: '46px',
                                        backgroundColor: '#ffffff',
                                        border: isRecipientInputFocused ? '2px solid #1a73e8' : '1px solid #dadce0',
                                        borderRadius: '8px',
                                        boxShadow: isRecipientInputFocused ? '0 1px 3px rgba(26,115,232,0.2)' : 'none',
                                        cursor: 'text',
                                        boxSizing: 'border-box',
                                        transition: 'border-color 0.15s, box-shadow 0.15s'
                                    }}
                                >
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#5f6368',
                                        marginRight: '6px',
                                        userSelect: 'none',
                                        flexShrink: 0
                                    }}>
                                        받는사람
                                    </span>

                                    {/* Google Mail 스타일 선택된 수신자 칩들 */}
                                    {recipientList.map((rec) => (
                                        <div
                                            key={rec.email}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                background: '#f1f3f4',
                                                border: '1px solid #dadce0',
                                                borderRadius: '16px',
                                                padding: '2px 8px 2px 10px',
                                                fontSize: '13px',
                                                color: '#202124',
                                                fontWeight: '500',
                                                maxWidth: '320px'
                                            }}
                                        >
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {rec.companyName && rec.companyName !== '-' && rec.companyName !== '기타' ? `[${rec.companyName}] ` : ''}
                                                {rec.name || rec.email.split('@')[0]}
                                                {rec.position ? ` ${rec.position}` : ''}
                                                {rec.department && rec.department !== '-' ? ` (${rec.department})` : ''}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveRecipient(rec.email);
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#5f6368',
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    width: '16px',
                                                    height: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '50%',
                                                    fontSize: '13px',
                                                    lineHeight: 1
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dadce0'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                title="수신자 제외"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}

                                    {/* Google Mail 인라인 검색/입력창 */}
                                    <input
                                        ref={recipientInputRef}
                                        type="text"
                                        value={recipientSearchKeyword}
                                        onFocus={() => {
                                            setIsRecipientInputFocused(true);
                                            if (recipientSearchKeyword.trim().length > 0) {
                                                setIsSearchDropdownOpen(true);
                                            }
                                        }}
                                        onBlur={() => setIsRecipientInputFocused(false)}
                                        onChange={(e) => {
                                            setRecipientSearchKeyword(e.target.value);
                                            if (e.target.value.trim().length > 0) {
                                                setIsSearchDropdownOpen(true);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Backspace' && !recipientSearchKeyword && recipientList.length > 0) {
                                                handleRemoveRecipient(recipientList[recipientList.length - 1].email);
                                            } else if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                if (recipientSearchResults.length > 0) {
                                                    setActiveSearchIndex(prev => (prev + 1) % recipientSearchResults.length);
                                                }
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                if (recipientSearchResults.length > 0) {
                                                    setActiveSearchIndex(prev => (prev - 1 + recipientSearchResults.length) % recipientSearchResults.length);
                                                }
                                            } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (isSearchDropdownOpen && recipientSearchResults.length > 0) {
                                                    const target = recipientSearchResults[activeSearchIndex] || recipientSearchResults[0];
                                                    handleAddRecipientUser(target);
                                                } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientSearchKeyword.trim())) {
                                                    handleAddDirectEmail();
                                                }
                                            } else if (e.key === 'Escape') {
                                                setIsSearchDropdownOpen(false);
                                            }
                                        }}
                                        placeholder={recipientList.length === 0 ? "이름, 회사명(제조사), 부서 또는 이메일을 입력하세요..." : ""}
                                        style={{
                                            flex: 1,
                                            minWidth: '160px',
                                            border: 'none',
                                            outline: 'none',
                                            fontSize: '13.5px',
                                            color: '#202124',
                                            padding: '4px 0',
                                            backgroundColor: 'transparent'
                                        }}
                                    />

                                    {/* 우측 수신자 카운트 배지 */}
                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '12px', color: '#1a73e8', fontWeight: '600' }}>
                                            총 {recipientList.length}명
                                        </span>
                                    </div>
                                </div>

                                {/* Google Mail 스타일 자동완성 드롭다운 (입력바 바로 아래 플로팅) */}
                                {isSearchDropdownOpen && recipientSearchKeyword.trim().length > 0 && (
                                    <div
                                        onMouseDown={(e) => e.preventDefault()}
                                        style={{
                                            position: 'absolute',
                                        top: 'calc(100% + 4px)',
                                        left: 0,
                                        width: '100%',
                                        maxWidth: '560px',
                                        backgroundColor: '#ffffff',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                                        maxHeight: '280px',
                                        overflowY: 'auto',
                                        zIndex: 9999
                                    }}>
                                        {isSearchingRecipients ? (
                                            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', color: '#5f6368', fontSize: '13px' }}>
                                                <span>검색 중...</span>
                                            </div>
                                        ) : recipientSearchResults.length === 0 ? (
                                            <div style={{ padding: '16px', color: '#5f6368', fontSize: '13px' }}>
                                                <div>일치하는 사용자가 없습니다.</div>
                                                {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientSearchKeyword.trim()) && (
                                                    <div
                                                        onClick={handleAddDirectEmail}
                                                        style={{
                                                            marginTop: '8px',
                                                            color: '#1a73e8',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <span>➕</span>
                                                        <span><strong>{recipientSearchKeyword.trim()}</strong> 직접 추가하기 (Enter)</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            recipientSearchResults.map((userItem, idx) => {
                                                const isAlreadyAdded = recipientList.some(
                                                    r => r.email && r.email.trim().toLowerCase() === userItem.email?.trim().toLowerCase()
                                                );
                                                const isSelected = idx === activeSearchIndex;

                                                // 아바타 색상 결정 (해시 기반 동적 팔레트)
                                                const avatarColors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#db2777'];
                                                const hash = (userItem.companyName || userItem.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                                                const avatarBg = avatarColors[hash % avatarColors.length];

                                                return (
                                                    <div
                                                        key={userItem.id || userItem.email || idx}
                                                        onClick={() => {
                                                            if (!isAlreadyAdded) {
                                                                handleAddRecipientUser(userItem);
                                                            }
                                                        }}
                                                        onMouseEnter={() => setActiveSearchIndex(idx)}
                                                        style={{
                                                            padding: '10px 16px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            cursor: isAlreadyAdded ? 'default' : 'pointer',
                                                            backgroundColor: isSelected ? '#f1f3f4' : isAlreadyAdded ? '#f8fafc' : '#ffffff',
                                                            transition: 'background-color 0.1s',
                                                            borderBottom: '1px solid #f1f3f4',
                                                            opacity: isAlreadyAdded ? 0.6 : 1
                                                        }}
                                                    >
                                                        {/* Google Mail 스타일 원형 아바타 */}
                                                        <div style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: '50%',
                                                            backgroundColor: avatarBg,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#ffffff',
                                                            flexShrink: 0,
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                        }}>
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                                                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                                            </svg>
                                                        </div>

                                                        {/* 2줄 텍스트 (이름/회사/직급 + 이메일) */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                fontSize: '14px',
                                                                fontWeight: '600',
                                                                color: '#202124',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {userItem.companyName && userItem.companyName !== '-' ? `${userItem.companyName} ` : ''}
                                                                {userItem.name || userItem.username}
                                                                {userItem.position ? ` ${userItem.position}` : ''}
                                                                {userItem.department && userItem.department !== '-' ? ` (${userItem.department})` : ''}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '12px',
                                                                color: '#5f6368',
                                                                marginTop: '2px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {userItem.email}
                                                            </div>
                                                        </div>

                                                        {/* 상태 표시 */}
                                                        {isAlreadyAdded && (
                                                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', background: '#ecfdf5', padding: '2px 8px', borderRadius: '10px' }}>
                                                                추가됨
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {recipientList.length === 0 && (
                                    <p style={{ margin: '6px 0 0 0', color: '#e53e3e', fontSize: '12px', fontWeight: '600' }}>
                                        ⚠️ 수신자가 지정되지 않았습니다. 사용자/제조사명을 검색하여 선택하거나 이메일을 직접 입력해 주세요.
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

            {/* LOT 역추적 통계 분석 모달 */}
            {isLotTraceOpen && (
                <div className="modal-backdrop" style={{ zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <div className="modal-content" style={{ maxWidth: '750px', width: '90%', borderRadius: '16px', background: '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <div className="modal-header" style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>📊</span> LOT 역추적 및 불량률(PPM) 분석: <code style={{ color: '#1d4ed8', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>{formData.lotNumber}</code>
                            </h3>
                            <button onClick={() => setIsLotTraceOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>
                        <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
                            {lotTraceLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                                    <div style={{ width: '32px', height: '32px', border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                                    <span>해당 LOT의 입고 데이터 및 클레임 내역을 분석 중입니다...</span>
                                </div>
                            ) : lotTraceResults.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                                    <div style={{ fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>연관 입고/클레임 통계 데이터 없음</div>
                                    <div style={{ fontSize: '13px' }}>입력하신 LOT 번호에 대한 입고 이력이 WMS에 등록되어 있지 않거나 클레임 발생 이력이 없습니다.</div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {lotTraceResults.map((item, idx) => (
                                        <div key={idx} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', background: item.status === 'STATISTICAL_OUTLIER' ? '#fef2f2' : '#f8fafc' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <div>
                                                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{item.productName || item.itemCode}</strong>
                                                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>({item.itemCode})</span>
                                                </div>
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '3px 10px',
                                                    borderRadius: '20px',
                                                    fontWeight: 'bold',
                                                    background: item.status === 'STATISTICAL_OUTLIER' ? '#fee2e2' : '#dcfce7',
                                                    color: item.status === 'STATISTICAL_OUTLIER' ? '#b91c1c' : '#15803d',
                                                    border: `1px solid ${item.status === 'STATISTICAL_OUTLIER' ? '#fca5a5' : '#86efac'}`
                                                }}>
                                                    {item.statusDescription || item.status}
                                                </span>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>총 입고 수량</div>
                                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{(item.inboundQty || 0).toLocaleString()}개</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>클레임 건수</div>
                                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{item.claimCount || 0}건</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>클레임 불량수량</div>
                                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: item.claimQty > 0 ? '#b91c1c' : '#0f172a' }}>{(item.claimQty || 0).toLocaleString()}개</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>PPM 불량률</div>
                                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: item.ppm > 500 ? '#b91c1c' : '#047857' }}>
                                                        {item.ppm !== null && item.ppm !== undefined ? `${Math.round(item.ppm)} PPM` : '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            {item.analysisNote && (
                                                <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569', background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px' }}>
                                                    💡 <strong>분석 의견:</strong> {item.analysisNote}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setIsLotTraceOpen(false)} className="primary" style={{ padding: '8px 20px', fontSize: '13px' }}>
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 메일 발송 원문 스냅샷 모달 */}
            {previewMailModal.open && (
                <div className="modal-overlay" style={{ zIndex: 6000 }} onClick={() => setPreviewMailModal({ open: false, title: '', body: '', sentAt: '', recipient: '' })}>
                    <div className="modal-content" style={{ maxWidth: '750px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
                                📧 메일 발송 스냅샷 원문
                            </h3>
                            <button type="button" onClick={() => setPreviewMailModal({ open: false, title: '', body: '', sentAt: '', recipient: '' })} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>
                        <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#475569' }}>
                            <div><strong>제목:</strong> {previewMailModal.title}</div>
                            <div><strong>수신처:</strong> {previewMailModal.recipient} | <strong>발송일시:</strong> {previewMailModal.sentAt ? previewMailModal.sentAt.substring(0, 19).replace('T', ' ') : '-'}</div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#ffffff' }}>
                            <div 
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewMailModal.body || '') }} 
                                style={{ lineHeight: 1.6, fontSize: '14px', color: '#334155' }}
                            />
                        </div>
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                            <button type="button" className="secondary" onClick={() => setPreviewMailModal({ open: false, title: '', body: '', sentAt: '', recipient: '' })}>
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Standardized File/Photo Preview Modal */}
            <CommonFilePreviewModal
                isOpen={!!previewModalFile}
                file={previewModalFile}
                title={previewModalFile?.title || '첨부 파일 미리보기'}
                onClose={() => setPreviewModalFile(null)}
            />

            {/* Electronic Approval Submit Modal */}
            {isApprovalModalOpen && (
                <ApprovalSubmitModal
                    isOpen={isApprovalModalOpen}
                    onClose={() => setIsApprovalModalOpen(false)}
                    initialDocTypeCode="CLAIM_REPORT"
                    initialSourceRecordId={claim?.id}
                    initialTitle={`[CX클레임] ${formData.claimNumber || ''} ${formData.productName || '품목'} 클레임 품의`}
                    initialContent={[
                        '■ 1. CX 클레임 기본 정보',
                        '--------------------------------------------------------------------------------',
                        `• 접수번호 : ${formData.claimNumber || '-'}`,
                        `• 품 목 명 : ${formData.productName || '-'} (코드: ${formData.itemCode || '-'})`,
                        `• 제 조 사 : ${formData.manufacturer || '-'}`,
                        `• 제조번호(LOT) : ${formData.lotNumber || '-'}`,
                        `• 발생국가/채널 : ${formData.country || '-'}`,
                        `• 불량유형 : ${formData.primaryCategory || '-'} > ${formData.secondaryCategory || '-'} ${formData.tertiaryCategory ? '> ' + formData.tertiaryCategory : ''}`,
                        `• 발생수량 : ${formData.occurrenceQty != null ? Number(formData.occurrenceQty).toLocaleString() + '개' : '-'}`,
                        `• 접수일자 : ${formData.receiptDate || '-'} | 진행상태: ${formData.qualityStatus || '-'}`,
                        '',
                        '■ 2. 클레임 상세 내용',
                        '--------------------------------------------------------------------------------',
                        formData.claimContent || '등록된 상세 내용이 없습니다.',
                        '',
                        '■ 3. 원인 분석 및 재발방지 대책',
                        '--------------------------------------------------------------------------------',
                        `[원인 분석]\n${formData.mfrRootCauseAnalysis || formData.rootCauseAnalysis || '특이사항 없음'}`,
                        `\n[재발방지 대책]\n${formData.mfrPreventativeAction || formData.preventativeAction || '특이사항 없음'}`,
                        '',
                        '■ 4. 품질보증팀 종합 검토 의견',
                        '--------------------------------------------------------------------------------',
                        formData.qualityRemarks || '품질 기준 및 원인 분석 결과에 따라 위와 같이 대책보고서를 품의합니다.'
                    ].join('\n')}
                    currentUser={user}
                    onSubmitted={() => {
                        setIsApprovalModalOpen(false);
                        toast.success("CX 클레임 전자결재 상신이 완료되었습니다.");
                        onSaved?.();
                        if (window.confirm("CX 클레임 전자결재가 정상 상신되었습니다.\n기안 문서함으로 이동하여 진행 상태를 확인하시겠습니까?")) {
                            window.__QMS_NAVIGATE__?.('approvalSubmitted');
                        }
                    }}
                />
            )}
        </div>
    );
};

export default ClaimDrawer;
