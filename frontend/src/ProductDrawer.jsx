import React, { useState, useEffect, useRef } from 'react';
import {
    createProduct,
    updateProduct,
    uploadFile,
    getProductHistory,
    getBrands,
    getManufacturers,
    checkDuplicateItemCode,
    loadMasterProduct,
    getPackagingSpecs,
    savePackagingSpec,
    downloadPackagingSpecExcel,
    downloadPackagingSpecPdf,
    getFileUrl,
    getPackagingMethodImages
} from './api';
import * as api from './api';
import { toast } from 'react-toastify';
import ProductSearchPopup from './ProductSearchPopup';
import BomMasterSearchModal from './BomMasterSearchModal';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';
import PackagingMethodTab from './components/dashboard/PackagingMethodTab';

const ProductDrawer = ({ product, onClose, user }) => {
    const isMobile = window.innerWidth <= 768; // Simple check for mobile
    const [formData, setFormData] = useState({
        itemCode: '',
        productName: '',
        englishProductName: '',
        brand: { id: null },
        manufacturerInfo: { id: null },
        shelfLifeMonths: '',
        openedShelfLifeMonths: '',
        productBarcode: '',
        inboxBarcode: '',
        outboxBarcode: '',
        productType: '단품',
        capacity: '',
        capacityFlOz: '',
        weight: '',
        weightOz: '',
        dimensions: { width: '', length: '', height: '', widthInch: '', lengthInch: '', heightInch: '', status: '가안' },
        recycleEvalNo: '',
        recycleMaterial: '',
        recycleGrade: '',
        imagePath: '',
        certStandard: '',
        certMsds: '',
        certFunction: '',
        certExpiry: '',
        parentItemCode: '',
        isParent: false,
        isPlanningSet: false,
        isMaster: false,
        ingredients: '',
        channels: [], // New field
        components: [], // List of { itemCode, productName, quantity }
        inboxInfo: { hasInbox: true, inboxWidth: '', inboxLength: '', inboxHeight: '', inboxWidthInch: '', inboxLengthInch: '', inboxHeightInch: '', inboxQuantity: '', inboxWeight: '', inboxWeightLbs: '' },
        outboxInfo: { outboxWidth: '', outboxLength: '', outboxHeight: '', outboxWidthInch: '', outboxLengthInch: '', outboxHeightInch: '', outboxQuantity: '', outboxWeight: '', outboxWeightLbs: '' },
        palletInfo: { palletWidth: '', palletLength: '', palletHeight: '', palletWidthInch: '', palletLengthInch: '', palletHeightInch: '', palletQuantity: '' },
        packagingMaterial: {
            manufacturerContainer: '',
            manufacturerLabel: '',
            manufacturerOuterBox: '',
            manufacturerEtc: '',
            materialBody: '',
            materialLabel: '',
            materialCap: '',
            materialSealing: '',
            materialPump: '',
            materialOuterBox: '',
            materialTool: '',
            materialEtc: '',
            materialRemarks: ''
        },
        packagingCertificates: [],
        productIngredients: [],
        imagePaths: [],
        photoAuditDisclosed: false
    });

    const [brands, setBrands] = useState([]);
    const [manufacturers, setManufacturers] = useState([]);
    const [salesChannels, setSalesChannels] = useState([]);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('details');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMasterSearchOpen, setIsMasterSearchOpen] = useState(false);
    const [isBomSearchOpen, setIsBomSearchOpen] = useState(false);
    const [selectedBomIndex, setSelectedBomIndex] = useState(null);
    const [bomSearchMode, setBomSearchMode] = useState(''); // 'add', 'edit' or empty
    const [bomPhotoPreview, setBomPhotoPreview] = useState(null);
    const [isSpecLoaded, setIsSpecLoaded] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [testReports, setTestReports] = useState([]);
    const [testReportPreview, setTestReportPreview] = useState({ open: false, url: '', type: '', name: '' });
    const [packagingSpecs, setPackagingSpecs] = useState([]);
    const [specRevisions, setSpecRevisions] = useState([]);
    const [specComponents, setSpecComponents] = useState([]);
    const [currentSpec, setCurrentSpec] = useState({
        barcode: '',
        labNumber: '',
        plannerName: '',
        designerName: '',
        qcName: '',
        managementType: '러닝',
        barcodeManager: '',
        approvalChainJson: '[]',
        markingMethod: '',
        markingStandard: '',
        containerMarkingDisplay: '',
        containerMarkingLocation: '',
        containerMarkingText: '',
        containerMarkingLotFormat: '',
        containerMarkingExpiryFormat: '',
        unitBoxMarkingDisplay: '',
        unitBoxMarkingLocation: '',
        unitBoxMarkingText: '',
        unitBoxMarkingLotFormat: '',
        unitBoxMarkingExpiryFormat: '',
        outboxLayoutImage: '',
        packagingMethodText: '',
        markingLocationImage: '',
        inboxUseYn: 'X',
        inboxPackagingType: '',
        inboxTapeMethod: '',
        inboxType: '',
        inboxQty: '',
        inboxSize: '',
        inboxTapeBanding: 'N',
        inboxInterlayerSheet: 'N',
        inboxMaterial: '',
        inboxRemarks: '',
        outboxType: '',
        outboxTotalQty: '',
        outboxInboxQty: '',
        outboxQty: '',
        outboxSize: '',
        outboxTapeBanding: 'N',
        outboxInterlayerSheet: 'N',
        outboxMaterial: 'KLB.S.S.K.K',
        outboxChannelStickerStandard: '',
        outboxCushioningStandard: '',
        popRequiredStandard: '',
        outboxRemarks: '',
        palletTypeStr: '',
        palletStackingMethod: '',
        palletTierQty: '',
        palletTierCount: '',
        palletTotalOutboxQty: '',
        palletTotalProductQty: '',
        palletSpec: '',
        palletSize: '',
        palletHeightLimit: '',
        palletPrecautions: '',
        inboxLayoutImage: '',
        outboxLayoutImageFile: '',
        palletLayoutImage: '',
        oneOutboxWeight: '',
        onePalletWeight: '',
        onePalletHeight: '',
        remarks: '',
        palletType: '',
        lotAndExpiryFormat: '',
        signatureJson: '[]',
        applyChannelSticker: false,
        bomItems: []
    });
    const [masterCertificates, setMasterCertificates] = useState([]);
    const [masterMaterials, setMasterMaterials] = useState([]);
    const [masterTemplates, setMasterTemplates] = useState([]);
    const [masterRules, setMasterRules] = useState([]);

    const [specSubTab, setSpecSubTab] = useState('sheet1');

    const [spaceRatioResults, setSpaceRatioResults] = useState(null);
    const [spaceRatioLoading, setSpaceRatioLoading] = useState(false);

    // 실시간 공간비율 계산 검증 API 연계
    useEffect(() => {
        if (activeTab === 'spaceRatio' && product && product.id) {
            setSpaceRatioLoading(true);
            api.checkProductSpaceRatio(product.id)
            .then(res => {
                // api.jsx는 이미 응답 포장(unwrap)이 되어있으므로 res.data 또는 res를 그대로 사용
                setSpaceRatioResults(res.data || res);
            })
            .catch(err => {
                console.error("Space ratio calculation error:", err);
            })
            .finally(() => {
                setSpaceRatioLoading(false);
            });
        }
    }, [activeTab, product]);

    const [masterMethodImagesForInherit, setMasterMethodImagesForInherit] = useState({ images: [], masterSpecId: null });
    const packagingMethodSaveRef = useRef(null);
    const packagingMethodReloadRef = useRef(null);
    const packagingMethodInheritRef = useRef(null);

    // 3자리 수치 콤마(,) 포맷팅 헬퍼
    const formatComma = (val) => {
        if (val === null || val === undefined || val === '') return '';
        const numStr = String(val).replace(/,/g, '').trim();
        const num = parseFloat(numStr);
        if (isNaN(num)) return val;
        const parts = numStr.split('.');
        parts[0] = parseInt(parts[0], 10).toLocaleString('en-US');
        return parts.join('.');
    };

    // 1 팔레트 중량 자동 연산 헬퍼 (1 아웃박스 중량 × 총 적재 아웃박스 수량)
    const calcPalletWeight = (specObj, formDataObj) => {
        const outboxWt = parseFloat(specObj?.oneOutboxWeight || formDataObj?.outboxInfo?.outboxWeight || 0);
        const tierQty = parseInt(specObj?.palletTierQty || 0);
        const tierCount = parseInt(specObj?.palletTierCount || 0);
        let totalBoxes = (tierQty * tierCount) > 0 ? (tierQty * tierCount) : 0;
        if (totalBoxes <= 0) {
            if (specObj?.palletTotalOutboxQty) {
                totalBoxes = parseInt(specObj.palletTotalOutboxQty) || 0;
            } else if (formDataObj?.palletInfo?.palletQuantity) {
                const outboxQty = parseInt(specObj?.outboxQty || specObj?.outboxTotalQty || formDataObj?.outboxInfo?.outboxQuantity || 0);
                const palletProdQty = parseInt(formDataObj.palletInfo.palletQuantity || 0);
                totalBoxes = (outboxQty > 0 && palletProdQty > 0) ? Math.floor(palletProdQty / outboxQty) : palletProdQty;
            }
        }
        if (outboxWt > 0 && totalBoxes > 0) {
            return (outboxWt * totalBoxes).toFixed(1);
        }
        return specObj?.onePalletWeight || '';
    };

    // 날짜 표기양식 프리셋 스마트 교체/추가 헬퍼
    const applyDateFormatPreset = (currentVal, type, presetVal) => {
        if (!presetVal) return currentVal || '';
        const prefix = type === 'mfg' ? '제조일자 (Mfg. Date):' : '사용기한 (Exp. Date):';
        const newEntry = `${prefix} ${presetVal}`;
        if (!currentVal || !currentVal.trim()) return newEntry;

        const lines = currentVal.split('\n');
        let replaced = false;
        const updatedLines = lines.map(line => {
            if (type === 'mfg' && (line.includes('제조일자') || line.includes('Mfg. Date') || line.includes('Mfg'))) {
                replaced = true;
                return newEntry;
            }
            if (type === 'exp' && (line.includes('사용기한') || line.includes('Exp. Date') || line.includes('EXP') || line.includes('Exp'))) {
                replaced = true;
                return newEntry;
            }
            return line;
        });

        if (!replaced) {
            updatedLines.push(newEntry);
        }
        return updatedLines.filter(Boolean).join('\n');
    };

    // 현품표 규칙 프리셋 스마트 적용 헬퍼
    const applyLabelRulePreset = (currentVal, presetVal) => {
        if (!presetVal) return currentVal || '';
        if (presetVal === '그 외') return currentVal || '';
        return presetVal;
    };

    // 현품표 시각화용 제조일자 / 사용기한 개별 추출 헬퍼
    const extractDateFormatPart = (fullText, type) => {
        if (!fullText) return null;
        const lines = fullText.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (type === 'mfg' && (trimmed.includes('제조일자') || trimmed.includes('Mfg. Date') || trimmed.includes('Mfg'))) {
                return trimmed.replace(/^.*?:\s*/, '').trim() || trimmed;
            }
            if (type === 'exp' && (trimmed.includes('사용기한') || trimmed.includes('Exp. Date') || trimmed.includes('EXP') || trimmed.includes('Exp'))) {
                return trimmed.replace(/^.*?:\s*/, '').trim() || trimmed;
            }
        }
        if (lines.length === 1 && !lines[0].includes(':')) {
            return lines[0].trim();
        }
        return null;
    };

    // 현품표 사용기한 행 표시/숨김 여부 판정 헬퍼
    const isExpiryHidden = (dateFormatStr) => {
        if (hideExpiryOnLabels) return true;
        if (!dateFormatStr) return false;
        return dateFormatStr.includes('표기 안함') || dateFormatStr.includes('표기안함') || dateFormatStr.includes('표기금지');
    };

    // 📢 유통채널 규격 포장사양서 자동 매핑 함수
    const syncChannelRulesToSpec = (channelInput, force = false) => {
        if (!channelInput) {
            setCurrentSpec(prev => ({
                ...prev,
                palletTypeStr: '',
                palletSpec: '',
                palletHeightLimit: '',
                containerMarkingExpiryFormat: '',
                unitBoxMarkingExpiryFormat: '',
                containerMarkingText: '',
                unitBoxMarkingText: '',
                containerMarkingDisplay: '',
                outboxChannelStickerStandard: '',
                outboxCushioningStandard: '',
                popRequiredStandard: '',
                palletPrecautions: '',
                inboxUseYn: 'X',
                inboxTapeMethod: '별도 테이핑 X (테이프 박스 미부착)',
                inboxTapeBanding: 'N'
            }));
            return;
        }

        // 마스터 데이터 목록(salesChannels)에서 전체 유통채널 정보를 정확히 조회하여 매칭
        const channel = salesChannels.find(c => String(c.id) === String(channelInput.id) || c.name === channelInput.name) || channelInput;

        // 덮어쓰기 방지 체크: 사양서 주요 필드에 이미 값이 존재하는 경우 확인 다이얼로그
        if (!force) {
            const hasExistingValue = !!(
                currentSpec.palletTypeStr ||
                currentSpec.outboxChannelStickerStandard ||
                currentSpec.outboxCushioningStandard ||
                currentSpec.containerMarkingText
            );
            if (hasExistingValue) {
                const confirmed = window.confirm(`[${channel.name}] 유통채널 포장 규격으로 기존 사양서 입력값을 덮어쓰시겠습니까?`);
                if (!confirmed) return false;
            }
        }

        const isSet = !!(product?.isPlanningSet || formData?.isPlanningSet || formData?.productType === '기획세트');

        const stickerLabel = isSet && channel.setChannelStickerStandard
            ? channel.setChannelStickerStandard
            : (channel.channelStickerRequired ? `${channel.channelCode || channel.name} 스티커 부착` : '해당 없음');
        const popLabel = channel.popRequired
            ? `${channel.channelCode || channel.name} POP 부착/동봉 필수`
            : '해당 없음';
        const cushioningLabel = isSet && channel.setCushioningStandard
            ? channel.setCushioningStandard
            : (channel.cushioningStandard || '박스 상단 빈공간 비닐 에어캡 완충재 투입');

        const expText = channel.expDateFormat ? `LOT 번호\nEXP ${channel.expDateFormat}` : '';
        const uRule = isSet ? (channel.setUnitBoxMarkingRule || channel.unitBoxMarkingRule) : channel.unitBoxMarkingRule;
        const inboxRule = isSet ? channel.setInboxLabelMarkingRule : channel.inboxLabelMarkingRule;
        const outboxRule = isSet ? channel.setOutboxLabelMarkingRule : channel.outboxLabelMarkingRule;
        const palletRule = isSet ? channel.setPalletLabelMarkingRule : channel.palletLabelMarkingRule;

        const markingText = uRule
            ? (channel.expDateFormat ? `${uRule}\n(표기형식: ${channel.expDateFormat})` : uRule)
            : expText;
        const containerDisplay = isSet
            ? (channel.setContainerMarkingDisplay || '인쇄')
            : '인쇄';

        let precautions = [];
        if (channel.padAndFrameRequired) precautions.push('패드 및 각대 부착 필수');
        if (channel.specialNotes) precautions.push(`채널특이사항: ${channel.specialNotes}`);

        const maxStack = isSet && channel.setPalletHeightLimit
            ? channel.setPalletHeightLimit
            : (channel.maxStackHeightMm ? String(channel.maxStackHeightMm) : '');

        const inboxRequired = channel.inboxRequired !== undefined ? channel.inboxRequired : true;
        const inboxTape = !inboxRequired ? '별도 테이핑 X (테이프 박스 미부착)' : (currentSpec.inboxTapeMethod || '별도 테이핑 X');

        setCurrentSpec(prev => ({
            ...prev,
            palletTypeStr: channel.palletType || prev.palletTypeStr,
            palletSpec: channel.palletSpec || prev.palletSpec,
            palletHeightLimit: maxStack || prev.palletHeightLimit,
            onePalletHeight: maxStack || prev.onePalletHeight,
            containerMarkingExpiryFormat: channel.expDateFormat || prev.containerMarkingExpiryFormat,
            unitBoxMarkingExpiryFormat: channel.expDateFormat || prev.containerMarkingExpiryFormat,
            containerMarkingText: markingText || prev.containerMarkingText,
            unitBoxMarkingText: markingText || prev.unitBoxMarkingText,
            containerMarkingDisplay: containerDisplay || prev.containerMarkingDisplay,
            unitBoxMarkingDisplay: containerDisplay || prev.unitBoxMarkingDisplay,
            outboxChannelStickerStandard: stickerLabel,
            applyChannelSticker: !!channel.channelStickerRequired,
            outboxCushioningStandard: cushioningLabel,
            popRequiredStandard: popLabel,
            unitBoxMarkingRule: uRule || prev.unitBoxMarkingRule || '',
            inboxLabelMarkingRule: inboxRule || prev.inboxLabelMarkingRule || '',
            outboxLabelMarkingRule: outboxRule || prev.outboxLabelMarkingRule || '',
            palletLabelMarkingRule: palletRule || prev.palletLabelMarkingRule || '',
            inboxDateFormat: channel.inboxDateFormat || prev.inboxDateFormat || '',
            outboxDateFormat: channel.outboxDateFormat || prev.outboxDateFormat || '',
            palletDateFormat: channel.palletDateFormat || prev.palletDateFormat || '',
            palletPrecautions: precautions.length > 0 ? precautions.join(' / ') : prev.palletPrecautions,
            inboxUseYn: inboxRequired ? 'O' : 'X',
            inboxTapeMethod: inboxTape,
            inboxTapeBanding: 'N'
        }));

        toast.success(`[${channel.name}] (${isSet ? '기획세트' : '단품'}) 유통채널 포장재 규격, 착인기준, 현품표 조건이 동기화되었습니다.`);
        return true;
    };

    const handleSaveFullSpec = async (isSilent = false) => {
        if (!product || !product.id) {
            if (!isSilent) toast.warn("제품 기본 정보가 먼저 저장되어야 사양서를 저장할 수 있습니다.");
            return false;
        }
        try {
            const specToSave = { ...currentSpec };
            delete specToSave.methodImages;

            const dynamicPalletWt = calcPalletWeight(currentSpec, formData);
            if (dynamicPalletWt) {
                specToSave.onePalletWeight = dynamicPalletWt;
            }

            const payload = {
                spec: {
                    ...specToSave,
                    product: { id: product.id }
                },
                revisions: specRevisions,
                components: specComponents,
                methodImages: null
            };
            const res = await api.saveFullPackagingSpec(payload);
            const savedSpec = res.data?.spec || res.data;
            const savedSpecId = savedSpec?.id || res.data?.id || currentSpec?.id;

            if (savedSpecId) {
                setCurrentSpec(prev => ({ ...prev, ...savedSpec, id: savedSpecId }));
                // 포장방법 사진/캡션/주석 변경사항이 있다면 함께 일괄 저장
                if (packagingMethodSaveRef.current) {
                    await packagingMethodSaveRef.current(savedSpecId);
                }
                if (!isSilent) toast.success("포장사양서가 성공적으로 저장되었습니다.");
                fetchPackagingSpecs(product.id);
            }
            return true;
        } catch (error) {
            const errMsg = error.response?.data?.message || error.message || "오류가 발생했습니다.";
            if (!isSilent) toast.error(`포장사양서 저장 실패: ${errMsg}`);
            console.error(error);
            return false;
        }
    };

    const handleAddRevision = () => {
        const nextNo = (specRevisions.length > 0 ? Math.max(...specRevisions.map(r => r.revisionNo || 0)) : 0) + 1;
        setSpecRevisions([...specRevisions, {
            revisionNo: nextNo,
            content: '',
            revisionDate: new Date().toISOString().substring(0, 10),
            revisionAuthor: user?.name || user?.username || ''
        }]);
    };

    const handleRemoveRevision = (idx) => {
        setSpecRevisions(specRevisions.filter((_, i) => i !== idx));
    };

    const handleRevisionChange = (idx, field, val) => {
        const updated = [...specRevisions];
        updated[idx] = { ...updated[idx], [field]: val };
        setSpecRevisions(updated);
    };

    const handleAddSpecComponent = () => {
        setSpecComponents([...specComponents, {
            bomCode: '',
            componentName: '',
            specDetails: '',
            sizeDimension: '',
            weight: 0,
            quantity: 1,
            supplier: '',
            remarks: ''
        }]);
    };

    const handleOpenBomModalForAdd = () => {
        setBomSearchMode('add');
        setSelectedBomIndex(null);
        setIsBomSearchOpen(true);
    };

    const handleOpenBomModalForEdit = (index) => {
        setBomSearchMode('edit');
        setSelectedBomIndex(index);
        setIsBomSearchOpen(true);
    };

    const handleRemoveSpecComponent = (idx) => {
        setSpecComponents(specComponents.filter((_, i) => i !== idx));
    };

    const handleSpecComponentChange = (idx, field, val) => {
        const updated = [...specComponents];
        updated[idx] = { ...updated[idx], [field]: val };
        setSpecComponents(updated);
    };
    const { canEdit: canEditProduct, canDelete: canDeleteProduct, isAdmin } = usePermissions(user);
    const canEdit = canEditProduct('products');
    const isDimensionsConfirmed = formData.dimensions?.status === '확정';
    const canEditBoxes = canEdit && !isDimensionsConfirmed;
    const canEditPackaging = canEdit && formData.isMaster;

    useEffect(() => {
        loadData();
    }, []);

    const [permissions, setPermissions] = useState({ canManageDisclosure: false, canViewPackaging: false });
    const [hideExpiryOnLabels, setHideExpiryOnLabels] = useState(false);

    useEffect(() => {
        const canManageDisclosure = canEditProduct('products', 'EDIT') || isAdmin;
        const canViewPackaging = user?.roles?.some(r => {
            const perms = r.allowedPermissions ? JSON.parse(r.allowedPermissions) : [];
            return perms.includes('PRODUCT_PACKAGING_VIEW');
        }) || isAdmin;
        setPermissions({ canManageDisclosure, canViewPackaging });
    }, [user, isAdmin, canEditProduct]);

    useEffect(() => {
        if (formData.parentItemCode) {
            fetchMasterCertificates(formData.parentItemCode);
        } else {
            setMasterCertificates([]);
        }
    }, [formData.parentItemCode]);

    const fetchMasterCertificates = async (itemCode) => {
        try {
            const res = await loadMasterProduct(itemCode);
            if (res.data && res.data.packagingCertificates) {
                setMasterCertificates(res.data.packagingCertificates);
            } else {
                setMasterCertificates([]);
            }
        } catch (error) {
            setMasterCertificates([]);
        }
    };

    const enrichWithCalculations = (data) => {
        const result = { ...data };
        if (result.capacity) {
            const ml = parseFloat(String(result.capacity).replace(/[^0-9.]/g, ''));
            if (!isNaN(ml)) result.capacityFlOz = (ml * 0.033814).toFixed(2);
        }
        if (result.weight) {
            const g = parseFloat(String(result.weight).replace(/[^0-9.]/g, ''));
            if (!isNaN(g)) result.weightOz = (g * 0.035274).toFixed(2);
        }
        if (result.dimensions) {
            ['width', 'length', 'height'].forEach(dim => {
                if (result.dimensions[dim]) {
                    const mm = parseFloat(result.dimensions[dim]);
                    if (!isNaN(mm)) result.dimensions[`${dim}Inch`] = (mm * 0.03937).toFixed(2);
                }
            });
        }
        if (result.inboxInfo) {
            ['inboxWidth', 'inboxLength', 'inboxHeight'].forEach(dim => {
                if (result.inboxInfo[dim]) {
                    const mm = parseFloat(result.inboxInfo[dim]);
                    if (!isNaN(mm)) result.inboxInfo[`${dim}Inch`] = (mm * 0.03937).toFixed(2);
                }
            });
            if (result.inboxInfo.inboxWeight) {
                const kg = parseFloat(result.inboxInfo.inboxWeight);
                if (!isNaN(kg)) result.inboxInfo.inboxWeightLbs = (kg * 2.20462).toFixed(2);
            }
        }
        if (result.outboxInfo) {
            ['outboxWidth', 'outboxLength', 'outboxHeight'].forEach(dim => {
                if (result.outboxInfo[dim]) {
                    const mm = parseFloat(result.outboxInfo[dim]);
                    if (!isNaN(mm)) result.outboxInfo[`${dim}Inch`] = (mm * 0.03937).toFixed(2);
                }
            });
            if (result.outboxInfo.outboxWeight) {
                const kg = parseFloat(result.outboxInfo.outboxWeight);
                if (!isNaN(kg)) result.outboxInfo.outboxWeightLbs = (kg * 2.20462).toFixed(2);
            }
        }
        if (result.palletInfo) {
            ['palletWidth', 'palletLength', 'palletHeight'].forEach(dim => {
                if (result.palletInfo[dim]) {
                    const mm = parseFloat(result.palletInfo[dim]);
                    if (!isNaN(mm)) result.palletInfo[`${dim}Inch`] = (mm * 0.03937).toFixed(2);
                }
            });
        }
        return result;
    };

    useEffect(() => {
        if (product) {
            // Fetch full product details to ensure components are loaded
            const fetchFullProduct = async () => {
                try {
                    const res = await api.getProductById(product.id);
                    const fullProduct = res.data;
                    setFormData(enrichWithCalculations({
                        itemCode: fullProduct.itemCode || '',
                        productName: fullProduct.productName || '',
                        englishProductName: fullProduct.englishProductName || '',
                        productType: fullProduct.productType || (fullProduct.isPlanningSet ? '기획세트' : '단품'),
                        brand: fullProduct.brand || { id: null },
                        manufacturerInfo: fullProduct.manufacturerInfo || { id: null },
                        shelfLifeMonths: fullProduct.shelfLifeMonths || '',
                        openedShelfLifeMonths: fullProduct.openedShelfLifeMonths || '',
                        productBarcode: fullProduct.productBarcode || fullProduct.barcode || '',
                        inboxBarcode: fullProduct.inboxBarcode || '',
                        outboxBarcode: fullProduct.outboxBarcode || '',
                        capacity: fullProduct.capacity ? String(fullProduct.capacity).replace(/[^0-9.]/g, '') : '',
                        capacityFlOz: fullProduct.capacityFlOz || '',
                        weight: fullProduct.weight ? String(fullProduct.weight).replace(/[^0-9.]/g, '') : '',
                        weightOz: fullProduct.weightOz || '',
                        dimensions: fullProduct.dimensions ? { ...fullProduct.dimensions, status: fullProduct.dimensions.status || '가안' } : { width: '', length: '', height: '', widthInch: '', lengthInch: '', heightInch: '', status: '가안' },
                        recycleEvalNo: fullProduct.recycleEvalNo || '',
                        recycleMaterial: fullProduct.recycleMaterial || '',
                        recycleGrade: fullProduct.recycleGrade || '',
                        imagePath: fullProduct.imagePath || '',
                        imagePaths: fullProduct.imagePaths || [],
                        certStandard: fullProduct.certStandard || '',
                        certMsds: fullProduct.certMsds || '',
                        certFunction: fullProduct.certFunction || '',
                        certExpiry: fullProduct.certExpiry || '',
                        parentItemCode: fullProduct.parentItemCode || '',
                        isParent: fullProduct.isParent || false,
                        isPlanningSet: fullProduct.isPlanningSet || false,
                        isMaster: fullProduct.isMaster || false,
                        ingredients: fullProduct.ingredients || '',
                        channels: fullProduct.channels || [],
                        components: fullProduct.components || [],
                        inboxInfo: fullProduct.inboxInfo || { hasInbox: true, inboxWidth: '', inboxLength: '', inboxHeight: '', inboxWidthInch: '', inboxLengthInch: '', inboxHeightInch: '', inboxQuantity: '', inboxWeight: '', inboxWeightLbs: '' },
                        outboxInfo: fullProduct.outboxInfo || { outboxWidth: '', outboxLength: '', outboxHeight: '', outboxWidthInch: '', outboxLengthInch: '', outboxHeightInch: '', outboxQuantity: '', outboxWeight: '', outboxWeightLbs: '' },
                        palletInfo: fullProduct.palletInfo || { palletWidth: '', palletLength: '', palletHeight: '', palletWidthInch: '', palletLengthInch: '', palletHeightInch: '', palletQuantity: '' },
                        packagingMaterial: fullProduct.packagingMaterial || { manufacturerContainer: '', manufacturerLabel: '', manufacturerOuterBox: '', manufacturerEtc: '', materialBody: '', materialLabel: '', materialCap: '', materialSealing: '', materialPump: '', materialOuterBox: '', materialTool: '', materialEtc: '', materialRemarks: '' },
                        packagingCertificates: fullProduct.packagingCertificates || [],
                        productIngredients: fullProduct.productIngredients || [],
                        photoAuditDisclosed: fullProduct.photoAuditDisclosed || false
                    }));
                    fetchPackagingSpecs(product.id, fullProduct);
                } catch (error) {
                    // Fallback to passed product prop
                    setFormData(enrichWithCalculations({
                        itemCode: product.itemCode || '',
                        productName: product.productName || '',
                        englishProductName: product.englishProductName || '',
                        productType: product.productType || (product.isPlanningSet ? '기획세트' : '단품'),
                        brand: product.brand || { id: null },
                        manufacturerInfo: product.manufacturerInfo || { id: null },
                        shelfLifeMonths: product.shelfLifeMonths || '',
                        openedShelfLifeMonths: product.openedShelfLifeMonths || '',
                        capacity: product.capacity ? String(product.capacity).replace(/[^0-9.]/g, '') : '',
                        capacityFlOz: product.capacityFlOz || '',
                        weight: product.weight ? String(product.weight).replace(/[^0-9.]/g, '') : '',
                        weightOz: product.weightOz || '',
                        dimensions: product.dimensions ? { ...product.dimensions, status: product.dimensions.status || '가안' } : { width: '', length: '', height: '', widthInch: '', lengthInch: '', heightInch: '', status: '가안' },
                        recycleEvalNo: product.recycleEvalNo || '',
                        recycleMaterial: product.recycleMaterial || '',
                        recycleGrade: product.recycleGrade || '',
                        imagePath: product.imagePath || '',
                        certStandard: product.certStandard || '',
                        certMsds: product.certMsds || '',
                        certFunction: product.certFunction || '',
                        certExpiry: product.certExpiry || '',
                        parentItemCode: product.parentItemCode || '',
                        isParent: product.isParent || false,
                        isPlanningSet: product.isPlanningSet || false,
                        isMaster: product.isMaster || false,
                        ingredients: product.ingredients || '',
                        channels: product.channels || [],
                        components: product.components || [],
                        inboxInfo: product.inboxInfo || { hasInbox: true, inboxWidth: '', inboxLength: '', inboxHeight: '', inboxWidthInch: '', inboxLengthInch: '', inboxHeightInch: '', inboxQuantity: '', inboxWeight: '', inboxWeightLbs: '' },
                        outboxInfo: product.outboxInfo || { outboxWidth: '', outboxLength: '', outboxHeight: '', outboxWidthInch: '', outboxLengthInch: '', outboxHeightInch: '', outboxQuantity: '', outboxWeight: '', outboxWeightLbs: '' },
                        palletInfo: product.palletInfo || { palletWidth: '', palletLength: '', palletHeight: '', palletWidthInch: '', palletLengthInch: '', palletHeightInch: '', palletQuantity: '' },
                        packagingMaterial: product.packagingMaterial || { manufacturerContainer: '', manufacturerLabel: '', manufacturerOuterBox: '', manufacturerEtc: '', materialBody: '', materialLabel: '', materialCap: '', materialSealing: '', materialPump: '', materialOuterBox: '', materialTool: '', materialEtc: '', materialRemarks: '' },
                        packagingCertificates: product.packagingCertificates || [],
                        productIngredients: product.productIngredients || [],
                        photoAuditDisclosed: product.photoAuditDisclosed || false
                    }));
                    fetchPackagingSpecs(product.id, product);
                }
            };
            fetchFullProduct();
            fetchHistory(product.id);
            fetchTestReports(product.id);
        } else {
            resetForm();
        }
    }, [product]);

    const loadData = async () => {
        try {
            const [brandsRes, mfrsRes, matRes, tmplRes, channelsRes] = await Promise.allSettled([
                getBrands(),
                getManufacturers(),
                api.getMasterMaterials(),
                api.getMasterTemplates(),
                api.getSalesChannels()
            ]);

            setBrands(brandsRes.status === 'fulfilled' && brandsRes.value?.data ? brandsRes.value.data : []);
            setManufacturers(mfrsRes.status === 'fulfilled' && mfrsRes.value?.data ? mfrsRes.value.data : []);
            setMasterMaterials(matRes.status === 'fulfilled' && matRes.value?.data ? matRes.value.data : []);
            setMasterTemplates(tmplRes.status === 'fulfilled' && tmplRes.value?.data ? tmplRes.value.data : []);
            setMasterRules([]);

            const channels = channelsRes.status === 'fulfilled' && channelsRes.value?.data ? channelsRes.value.data : [];
            setSalesChannels(channels.filter(c => c.active));
        } catch (error) {
            console.error("General master data load error:", error);
        }
    };

    const resetForm = () => {
        setFormData({
            itemCode: '',
            productName: '',
            englishProductName: '',
            productType: '단품',
            brand: { id: null },
            manufacturerInfo: { id: null },
            capacity: '',
            weight: '',
            dimensions: { width: '', length: '', height: '', status: '가안' },
            recycleEvalNo: '',
            recycleMaterial: '',
            recycleGrade: '',
            imagePath: '',
            certStandard: '',
            certMsds: '',
            certFunction: '',
            certExpiry: '',
            parentItemCode: '',
            isParent: false,
            isPlanningSet: false,
            isMaster: false,
            ingredients: '',
            channels: [],
            components: [],
            inboxInfo: { hasInbox: true, inboxWidth: '', inboxLength: '', inboxHeight: '', inboxWidthInch: '', inboxLengthInch: '', inboxHeightInch: '', inboxQuantity: '', inboxWeight: '', inboxWeightLbs: '' },
            outboxInfo: { outboxWidth: '', outboxLength: '', outboxHeight: '', outboxWidthInch: '', outboxLengthInch: '', outboxHeightInch: '', outboxQuantity: '', outboxWeight: '', outboxWeightLbs: '' },
            palletInfo: { palletWidth: '', palletLength: '', palletHeight: '', palletWidthInch: '', palletLengthInch: '', palletHeightInch: '', palletQuantity: '' },
            packagingMaterial: { manufacturerContainer: '', manufacturerLabel: '', manufacturerOuterBox: '', manufacturerEtc: '', materialBody: '', materialLabel: '', materialCap: '', materialSealing: '', materialPump: '', materialOuterBox: '', materialTool: '', materialEtc: '', materialRemarks: '' },
            packagingCertificates: [],
            productIngredients: [],
            photoAuditDisclosed: false
        });
        setHistory([]);
        setIsSpecLoaded(false);
    };

    const fetchHistory = async (id) => {
        try {
            const res = await api.getProductHistory(id);
            setHistory(res.data);
        } catch (error) {
            // Hist fail
        }
    };

    const fetchPackagingSpecs = async (id, loadedProduct = null) => {
        try {
            const res = await api.getPackagingSpecs(id);
            setPackagingSpecs(res.data || []);
            
            // 통합 포장사양서 로드
            const fullRes = await api.getFullPackagingSpec(id);
            if (fullRes && fullRes.data) {
                const { spec, revisions, components, methodImages } = fullRes.data;
                setIsSpecLoaded(true);
                if (spec) {
                    // Auto-fill empty spec fields using product details
                    const prod = loadedProduct || formData;
                    if (prod) {
                        const updatedSpec = { ...spec };
                        
                        if (!updatedSpec.inboxQty && prod.inboxInfo?.inboxQuantity) {
                            updatedSpec.inboxQty = prod.inboxInfo.inboxQuantity;
                        }
                        if (!updatedSpec.inboxSize && prod.inboxInfo?.inboxLength && prod.inboxInfo?.inboxWidth && prod.inboxInfo?.inboxHeight) {
                            updatedSpec.inboxSize = `${prod.inboxInfo.inboxLength}x${prod.inboxInfo.inboxWidth}x${prod.inboxInfo.inboxHeight}`;
                        }
                        if (!updatedSpec.outboxQty && prod.outboxInfo?.outboxQuantity) {
                            updatedSpec.outboxQty = prod.outboxInfo.outboxQuantity;
                        }
                        if (!updatedSpec.outboxSize && prod.outboxInfo?.outboxLength && prod.outboxInfo?.outboxWidth && prod.outboxInfo?.outboxHeight) {
                            updatedSpec.outboxSize = `${prod.outboxInfo.outboxLength}x${prod.outboxInfo.outboxWidth}x${prod.outboxInfo.outboxHeight}`;
                        }
                        if (!updatedSpec.oneOutboxWeight && prod.outboxInfo?.outboxWeight) {
                            updatedSpec.oneOutboxWeight = prod.outboxInfo.outboxWeight;
                        }
                        if (!updatedSpec.palletSize && prod.palletInfo?.palletLength && prod.palletInfo?.palletWidth) {
                            updatedSpec.palletSize = `${prod.palletInfo.palletLength}x${prod.palletInfo.palletWidth}`;
                        }
                        if (!updatedSpec.onePalletHeight && prod.palletInfo?.palletHeight) {
                            updatedSpec.onePalletHeight = prod.palletInfo.palletHeight;
                        }
                        if (!updatedSpec.palletHeightLimit && prod.palletInfo?.palletHeight) {
                            updatedSpec.palletHeightLimit = prod.palletInfo.palletHeight;
                        }
                        const dynamicPalletWt = calcPalletWeight(updatedSpec, prod);
                        if (dynamicPalletWt) {
                            updatedSpec.onePalletWeight = dynamicPalletWt;
                        }
                        if (!updatedSpec.markingStandard && (prod.shelfLifeMonths || prod.openedShelfLifeMonths)) {
                            const shelfLifeStr = prod.shelfLifeMonths ? `제조일로부터 ${prod.shelfLifeMonths}개월` : '';
                            const openedStr = prod.openedShelfLifeMonths ? `개봉 후 ${prod.openedShelfLifeMonths}개월` : '';
                            updatedSpec.markingStandard = [shelfLifeStr, openedStr].filter(Boolean).join(' / ');
                        }

                        // 유통채널 4대 착인/현품표 규칙 및 사용기한 기준 자동 동기화 보충 (마스터 데이터 연동)
                        const rawChan = (prod.channels && prod.channels.length > 0) ? prod.channels[0] : null;
                        const selectedChannel = rawChan ? (salesChannels.find(c => String(c.id) === String(rawChan.id) || c.name === rawChan.name) || rawChan) : null;
                        if (selectedChannel) {
                            const isSet = !!(prod.isPlanningSet || prod.productType === '기획세트');
                            const uRule = isSet ? (selectedChannel.setUnitBoxMarkingRule || selectedChannel.unitBoxMarkingRule) : selectedChannel.unitBoxMarkingRule;
                            const iRule = isSet ? selectedChannel.setInboxLabelMarkingRule : selectedChannel.inboxLabelMarkingRule;
                            const oRule = isSet ? selectedChannel.setOutboxLabelMarkingRule : selectedChannel.outboxLabelMarkingRule;
                            const pRule = isSet ? selectedChannel.setPalletLabelMarkingRule : selectedChannel.palletLabelMarkingRule;
                            const expFormat = selectedChannel.expDateFormat ? `LOT 번호\nEXP ${selectedChannel.expDateFormat}` : '';
                            const autoMarkingText = uRule
                                ? (selectedChannel.expDateFormat ? `${uRule}\n(표기형식: ${selectedChannel.expDateFormat})` : uRule)
                                : expFormat;

                            const stickerLabel = isSet && selectedChannel.setChannelStickerStandard
                                ? selectedChannel.setChannelStickerStandard
                                : (selectedChannel.channelStickerRequired ? `${selectedChannel.channelCode || selectedChannel.name} 스티커 부착` : '해당 없음');
                            const cushioningLabel = isSet && selectedChannel.setCushioningStandard
                                ? selectedChannel.setCushioningStandard
                                : (selectedChannel.cushioningStandard || '박스 상단 빈공간 비닐 에어캡 완충재 투입');
                            const popLabel = selectedChannel.popRequired
                                ? `${selectedChannel.channelCode || selectedChannel.name} POP 부착/동봉 필수`
                                : '해당 없음';
                            const maxStack = isSet && selectedChannel.setPalletHeightLimit
                                ? selectedChannel.setPalletHeightLimit
                                : (selectedChannel.maxStackHeightMm ? String(selectedChannel.maxStackHeightMm) : '');
                            const containerDisplay = isSet
                                ? (selectedChannel.setContainerMarkingDisplay || '인쇄')
                                : '인쇄';

                            if (selectedChannel.expDateFormat === '표기금지' || selectedChannel.name?.includes('JP/OFF')) {
                                setHideExpiryOnLabels(true);
                            }

                            if (!updatedSpec.palletTypeStr) updatedSpec.palletTypeStr = selectedChannel.palletType || '';
                            if (!updatedSpec.palletSpec) updatedSpec.palletSpec = selectedChannel.palletSpec || '';
                            if (!updatedSpec.palletHeightLimit && maxStack) updatedSpec.palletHeightLimit = maxStack;
                            if (!updatedSpec.onePalletHeight && maxStack) updatedSpec.onePalletHeight = maxStack;
                            if (!updatedSpec.outboxChannelStickerStandard) updatedSpec.outboxChannelStickerStandard = stickerLabel;
                            if (!updatedSpec.outboxCushioningStandard) updatedSpec.outboxCushioningStandard = cushioningLabel;
                            if (!updatedSpec.popRequiredStandard) updatedSpec.popRequiredStandard = popLabel;
                            if (!updatedSpec.containerMarkingDisplay) updatedSpec.containerMarkingDisplay = containerDisplay;
                            if (!updatedSpec.unitBoxMarkingDisplay) updatedSpec.unitBoxMarkingDisplay = containerDisplay;

                            if (!updatedSpec.inboxUseYn && selectedChannel.inboxRequired !== undefined) {
                                updatedSpec.inboxUseYn = selectedChannel.inboxRequired ? 'O' : 'X';
                            }

                            updatedSpec.unitBoxMarkingRule = updatedSpec.unitBoxMarkingRule || uRule || '';
                            updatedSpec.inboxLabelMarkingRule = updatedSpec.inboxLabelMarkingRule || iRule || '';
                            updatedSpec.outboxLabelMarkingRule = updatedSpec.outboxLabelMarkingRule || oRule || '';
                            updatedSpec.palletLabelMarkingRule = updatedSpec.palletLabelMarkingRule || pRule || '';
                            updatedSpec.inboxDateFormat = updatedSpec.inboxDateFormat || selectedChannel.inboxDateFormat || '';
                            updatedSpec.outboxDateFormat = updatedSpec.outboxDateFormat || selectedChannel.outboxDateFormat || '';
                            updatedSpec.palletDateFormat = updatedSpec.palletDateFormat || selectedChannel.palletDateFormat || '';

                            if (autoMarkingText) {
                                if (!updatedSpec.containerMarkingText) updatedSpec.containerMarkingText = autoMarkingText;
                                if (!updatedSpec.unitBoxMarkingText) updatedSpec.unitBoxMarkingText = autoMarkingText;
                            }
                        }
                        setCurrentSpec(updatedSpec);
                    } else {
                        setCurrentSpec(spec);
                    }
                }
                setSpecRevisions(revisions || []);
                setSpecComponents(components || []);
                const targetSpecId = spec?.id || currentSpec?.id;
                if (targetSpecId && packagingMethodReloadRef.current) {
                    packagingMethodReloadRef.current(targetSpecId);
                }
            }
        } catch (error) {
            console.error("포장사양서 상세 로드 실패 (신규 사양서 준비): ", error);
            setIsSpecLoaded(true);
        }
    };

    const checkChannelRules = () => {
        const warnings = [];
        const selectedCh = formData.channels && formData.channels[0];
        if (!selectedCh) return warnings;

        const rules = (masterRules || []).filter(r => r.channel && String(r.channel.id) === String(selectedCh.id));
        
        rules.forEach(rule => {
            const val = rule.ruleValue;
            const msg = rule.warningMessage || `${rule.ruleType} 규칙 위반`;
            
            if (rule.ruleType === 'MAX_BOX_HEIGHT' || rule.ruleType === 'LOAD_HEIGHT') {
                const limit = parseFloat(val);
                const height = parseFloat(currentSpec.onePalletHeight || 0);
                if (!isNaN(limit) && height > limit) {
                    warnings.push(`⚠️ [${selectedCh.name} 규칙 위반] ${msg} (제한: ${limit}mm, 현재: ${height}mm)`);
                }
            } else if (rule.ruleType === 'STICKER_REQUIRED') {
                if (!currentSpec.applyChannelSticker) {
                    warnings.push(`⚠️ [${selectedCh.name} 규칙 위반] ${msg} (스티커 부착 필수이나 미설정 상태)`);
                }
            } else if (rule.ruleType === 'PALLET_SPEC') {
                if (val && currentSpec.palletTypeStr && !currentSpec.palletTypeStr.toLowerCase().includes(val.toLowerCase())) {
                    warnings.push(`⚠️ [${selectedCh.name} 규칙 위반] ${msg} (지정 규격: ${val}, 현재: ${currentSpec.palletTypeStr})`);
                }
            }
        });
        
        return warnings;
    };

    const fetchTestReports = async (id) => {
        try {
            const res = await api.getProductTestReports(id);
            setTestReports(res.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUploadTestReport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error("파일 크기는 10MB를 초과할 수 없습니다.");
            return;
        }
        try {
            const uploadRes = await api.uploadFile(file, formData.productName || 'test-report');
            // uploadRes.data is expected to be a string containing the URL or file path.
            if (uploadRes && uploadRes.data) {
                const filePath = typeof uploadRes.data === 'string' ? uploadRes.data : uploadRes.data.filePath;
                if (!filePath) {
                    throw new Error("Invalid response format from upload API");
                }
                const reportName = prompt("성적서 이름을 입력하세요 (예: 유해물질 불검출 성적서)");
                if (!reportName) return;

                const payload = {
                    reportName,
                    fileName: file.name,
                    filePath: filePath,
                    fileType: file.type
                };
                const res = await api.addProductTestReport(product.id, payload);
                setTestReports([...testReports, res.data.data || res.data]);
                toast.success("성적서가 등록되었습니다.");
            }
        } catch (error) {
            console.error(error);
            toast.error("업로드 중 오류가 발생했습니다.");
        }
    };

    const handleDeleteTestReport = async (reportId) => {
        if (!window.confirm("이 성적서를 삭제하시겠습니까?")) return;
        try {
            await api.deleteProductTestReport(reportId);
            setTestReports(testReports.filter(r => r.id !== reportId));
            toast.success("성적서가 삭제되었습니다.");
        } catch (error) {
            console.error(error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        let actualValue = type === 'checkbox' ? (name.includes('hasInbox') ? !checked : checked) : value; // For hasInbox, if checked means '없음', so hasInbox=false

        if (name === 'inboxInfo.hasInbox') {
            const hasInbox = !checked; // The UI checkbox is "없음", so checked = hasInbox is false
            setFormData(prev => ({
                ...prev,
                inboxInfo: hasInbox
                    ? { ...prev.inboxInfo, hasInbox: true }
                    : { hasInbox: false, inboxWidth: 0, inboxLength: 0, inboxHeight: 0, inboxWidthInch: 0, inboxLengthInch: 0, inboxHeightInch: 0, inboxQuantity: 0, inboxWeight: 0, inboxWeightLbs: 0 }
            }));
            return;
        }

        if (name === 'capacity') {
            if (value === '') {
                setFormData(prev => ({ ...prev, capacity: '', capacityFlOz: '' }));
            } else {
                const ml = parseFloat(value);
                if (!isNaN(ml)) {
                    const flOz = (ml * 0.033814).toFixed(2);
                    setFormData(prev => ({ ...prev, capacity: value, capacityFlOz: flOz }));
                } else {
                    setFormData(prev => ({ ...prev, capacity: value }));
                }
            }
            return;
        }
        if (name === 'weight') {
            if (value === '') {
                setFormData(prev => ({ ...prev, weight: '', weightOz: '' }));
            } else {
                const g = parseFloat(value);
                if (!isNaN(g)) {
                    const oz = (g * 0.035274).toFixed(2);
                    setFormData(prev => ({ ...prev, weight: value, weightOz: oz }));
                } else {
                    setFormData(prev => ({ ...prev, weight: value }));
                }
            }
            return;
        }

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            const numValue = parseFloat(actualValue);

            // Handle nested inches calculation
            if (['width', 'length', 'height', 'inboxWidth', 'inboxLength', 'inboxHeight', 'outboxWidth', 'outboxLength', 'outboxHeight', 'palletWidth', 'palletLength', 'palletHeight'].includes(child)) {
                const inchField = `${child}Inch`;
                const inchValue = (!isNaN(numValue) && actualValue !== '') ? (numValue * 0.03937).toFixed(2) : '';
                setFormData(prev => ({
                    ...prev,
                    [parent]: { ...prev[parent], [child]: actualValue, [inchField]: inchValue }
                }));
                return;
            }

            // Handle nested lbs calculation (inbox/outbox weight goes from kg to lbs)
            if (['inboxWeight', 'outboxWeight'].includes(child)) {
                const lbsField = `${child}Lbs`;
                const lbsValue = (!isNaN(numValue) && actualValue !== '') ? (numValue * 2.20462).toFixed(2) : '';
                setFormData(prev => ({
                    ...prev,
                    [parent]: { ...prev[parent], [child]: actualValue, [lbsField]: lbsValue }
                }));
                return;
            }

            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: actualValue }
            }));
        } else {
            const updates = { [name]: actualValue };
            if (name === 'productType') {
                const isSet = actualValue === '기획세트';
                updates.isPlanningSet = isSet;
                if (formData.channels && formData.channels.length > 0) {
                    setTimeout(() => {
                        syncChannelRulesToSpec(formData.channels[0], true);
                    }, 50);
                }
            }
            setFormData(prev => ({ ...prev, ...updates }));
        }
    };

    const handleRelationChange = (e, field) => {
        const id = e.target.value === 'null' ? null : Number(e.target.value);
        setFormData(prev => ({ ...prev, [field]: { id } }));
    };

    const handleFileUpload = async (e, field) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const isProductImage = field === 'imagePaths';
        const MAX_SIZE_IMG = 3 * 1024 * 1024;
        const MAX_SIZE_OTHER = 10 * 1024 * 1024;
        const limitLabel = isProductImage ? "3MB" : "10MB";

        try {
            if (field === 'ingredientsExcel') {
                const res = await api.uploadIngredients(files[0]);
                setFormData(prev => ({
                    ...prev,
                    productIngredients: Array.isArray(res.data) ? res.data : [],
                    ingredients: '엑셀 업로드 완료'
                }));
                alert(`성공적으로 파싱되어 ${res.data.length}건의 전성분이 불러와졌습니다.`);
            } else if (isProductImage) {
                // 다중 이미지 처리
                const currentCount = formData.imagePaths?.length || 0;
                const remainingSlots = 10 - currentCount;
                
                if (remainingSlots <= 0) {
                    alert("이미지는 최대 10개까지만 등록할 수 있습니다.");
                    return;
                }

                const uploadTasks = files.slice(0, remainingSlots).map(async (file) => {
                    if (file.size > MAX_SIZE_IMG) {
                        toast.warn(`[${file.name}] 용량이 3MB를 초과하여 제외되었습니다.`);
                        return null;
                    }
                    try {
                        const res = await uploadFile(file, formData.productName);
                        return res.data;
                    } catch (err) {
                        toast.error(`[${file.name}] 업로드 실패`);
                        return null;
                    }
                });

                const results = (await Promise.all(uploadTasks)).filter(Boolean);
                if (results.length > 0) {
                    setFormData(prev => {
                        const newPaths = [...(prev.imagePaths || []), ...results];
                        return {
                            ...prev,
                            imagePaths: newPaths,
                            imagePath: prev.imagePath || results[0] // 대표 이미지 없으면 첫 번째 업로드 건으로 설정
                        };
                    });
                    toast.success(`${results.length}개의 이미지가 업로드되었습니다.`);
                }
                
                if (files.length > remainingSlots) {
                    toast.info(`최대 10개 제한으로 인해 ${files.length - remainingSlots}개 파일이 무시되었습니다.`);
                }
            } else {
                // 단일 파일 업로드 (기존 로직 유지)
                const file = files[0];
                if (file.size > MAX_SIZE_OTHER) {
                    alert(`용량이 10MB를 초과합니다. (현재: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
                    return;
                }
                const res = await uploadFile(file, formData.productName);
                setFormData(prev => ({ ...prev, [field]: res.data }));
                toast.success("파일이 업로드되었습니다.");
            }
        } catch (error) {
            toast.error("파일 처리 중 오류가 발생했습니다.");
        } finally {
            e.target.value = '';
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.downloadIngredientTemplate();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Ingredient_Template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert("양식 다운로드에 실패했습니다.");
        }
    };

    const handleDownloadSpecExcel = async () => {
        if (!product || !product.id) return;
        try {
            // 현재 입력 중인 최신 사양서 정보 자동 저장 후 다운로드
            await handleSaveFullSpec(true);
            const response = await downloadPackagingSpecExcel(product.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `포장사양서_${formData.itemCode || product.itemCode || product.id}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error("엑셀 다운로드에 실패했습니다.");
        }
    };

    const handleDownloadSpecPdf = async () => {
        if (!product || !product.id) return;
        try {
            // 현재 입력 중인 최신 사양서 정보 자동 저장 후 다운로드
            await handleSaveFullSpec(true);
            const response = await downloadPackagingSpecPdf(product.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `포장사양서_${formData.itemCode || product.itemCode || product.id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error("PDF 다운로드에 실패했습니다.");
        }
    };

    // Handlers for modifying the ingredients grid directly
    const updateIngredient = (index, field, value) => {
        setFormData(prev => {
            const newIngredients = [...prev.productIngredients];
            newIngredients[index] = { ...newIngredients[index], [field]: value };
            return { ...prev, productIngredients: newIngredients };
        });
    };

    const removeIngredient = (index) => {
        setFormData(prev => ({
            ...prev,
            productIngredients: prev.productIngredients.filter((_, i) => i !== index)
        }));
    };

    const addIngredientRow = () => {
        setFormData(prev => ({
            ...prev,
            productIngredients: [...prev.productIngredients, { korName: '', engName: '', contentPercent: '', contentPpm: '', contentPpb: '', inciName: '', allergenMark: '', limitClass: '' }]
        }));
    };

    const handleMasterLoad = () => {
        if (formData.isMaster) {
            toast.warn("해당 제품이 마스터 제품으로 설정된 경우 타 마스터 정보를 불러올 수 없습니다.");
            return;
        }
        setIsMasterSearchOpen(true);
    };

    const handleMasterSelect = async (p) => {
        setIsMasterSearchOpen(false);
        if (!p || !p.itemCode) return;

        try {
            const res = await loadMasterProduct(p.itemCode);
            if (res.data) {
                // 바코드 3종(제품/인박스/아웃박스 바코드) 및 사양서 바코드는 승계 대상에서 제외하고 기존값 보존
                const {
                    productBarcode,
                    inboxBarcode,
                    outboxBarcode,
                    barcode,
                    ...masterDataToInherit
                } = res.data;

                setFormData(prev => enrichWithCalculations({
                    ...prev,
                    ...masterDataToInherit,
                    itemCode: prev.itemCode, // 현재 입력 중인 코드는 유지
                    id: prev.id, // 기존 ID 유지
                    isMaster: false, // 불러온 데이터는 마스터가 아님 (템플릿 용도)
                    parentItemCode: res.data.itemCode, // 마스터 코드를 부모 코드로 설정
                    // 바코드 3종은 기존 자식 제품의 입력값을 그대로 유지 (승계 제외)
                    productBarcode: prev.productBarcode || '',
                    inboxBarcode: prev.inboxBarcode || '',
                    outboxBarcode: prev.outboxBarcode || '',
                    capacity: res.data.capacity ? String(res.data.capacity).replace(/[^0-9.]/g, '') : '',
                    weight: res.data.weight ? String(res.data.weight).replace(/[^0-9.]/g, '') : '',
                    ingredients: res.data.ingredients || '',
                    dimensions: res.data.dimensions || { width: '', length: '', height: '', widthInch: '', lengthInch: '', heightInch: '', status: '가안' },
                    inboxInfo: res.data.inboxInfo || { hasInbox: true, inboxWidth: '', inboxLength: '', inboxHeight: '', inboxWidthInch: '', inboxLengthInch: '', inboxHeightInch: '', inboxQuantity: '', inboxWeight: '', inboxWeightLbs: '' },
                    outboxInfo: res.data.outboxInfo || { outboxWidth: '', outboxLength: '', outboxHeight: '', outboxWidthInch: '', outboxLengthInch: '', outboxHeightInch: '', outboxQuantity: '', outboxWeight: '', outboxWeightLbs: '' },
                    palletInfo: res.data.palletInfo || { palletWidth: '', palletLength: '', palletHeight: '', palletWidthInch: '', palletLengthInch: '', palletHeightInch: '', palletQuantity: '' },
                    productIngredients: res.data.productIngredients ? res.data.productIngredients.map(i => ({ ...i, id: undefined, product: undefined })) : [],
                    imagePaths: res.data.imagePaths || []
                }));

                // 마스터 포장사양서도 자동으로 함께 조회하여 사양서 탭에 승계 (바코드는 제외)
                const masterProductId = res.data?.id || p?.id;
                if (masterProductId) {
                    try {
                        const masterSpecRes = await api.getPackagingSpecs(masterProductId);
                        const masterSpecData = masterSpecRes.data?.spec || (Array.isArray(masterSpecRes.data) ? masterSpecRes.data[0] : masterSpecRes.data);
                        if (masterSpecData) {
                            const { barcode: masterBar, ...specFieldsToInherit } = masterSpecData;
                            setCurrentSpec(prevSpec => ({
                                ...prevSpec,
                                ...specFieldsToInherit,
                                id: prevSpec.id || undefined,
                                barcode: prevSpec.barcode || '', // 사양서 바코드 제외/유지
                                bomItems: masterSpecData.bomItems || prevSpec.bomItems || []
                            }));

                            // 개정 내역 및 구성품 리스트 승계
                            if (masterSpecRes.data?.revisions && Array.isArray(masterSpecRes.data.revisions)) {
                                setSpecRevisions(masterSpecRes.data.revisions.map(r => ({ ...r, id: undefined, specId: undefined })));
                            }
                            if (masterSpecRes.data?.components && Array.isArray(masterSpecRes.data.components)) {
                                setSpecComponents(masterSpecRes.data.components.map(c => ({ ...c, id: undefined, specId: undefined })));
                            }

                            // 마스터 포장방법 이미지 목록 승계
                            if (masterSpecData.id) {
                                try {
                                    const masterImagesRes = await getPackagingMethodImages(masterSpecData.id);
                                    const masterImages = masterImagesRes.data || masterImagesRes || [];
                                    if (Array.isArray(masterImages) && masterImages.length > 0) {
                                        setMasterMethodImagesForInherit({ images: masterImages, masterSpecId: masterSpecData.id });
                                    }
                                } catch (imgErr) {
                                    console.log("마스터 포장방법 사진 승계 생략:", imgErr);
                                }
                            }
                        }
                    } catch (specErr) {
                        console.log("마스터 포장사양서 승계 생략:", specErr);
                    }
                }

                toast.success(`마스터 제품[${p.productName}]의 규격/사양 정보를 성공적으로 승계했습니다. (바코드 3종 제외)`);
            }
        } catch (error) {
            toast.error("마스터 정보를 가져오는데 실패했습니다.");
        }
    };

    const handleBomSelect = (m) => {
        const specDetails = [
            m.type && m.detailedType ? `[${m.type}/${m.detailedType}]` : (m.type ? `[${m.type}]` : ''),
            m.isMultiLayer ? m.layers?.map(l => l.materialName).join(' + ') : (m.detailedMaterial || m.material || '')
        ].filter(Boolean).join(' ');

        if (bomSearchMode === 'add') {
            setSpecComponents([...specComponents, {
                bomCode: m.bomCode || '',
                componentName: m.componentName || '',
                specDetails: specDetails,
                sizeDimension: m.specification || '',
                weight: m.weight != null ? m.weight : 0,
                quantity: 1,
                supplier: m.manufacturer || '',
                imagePath: m.imagePath || '',
                remarks: ''
            }]);
            toast.success(`[${m.bomCode || m.componentName}] 부자재가 사양서 구성품에 추가되었습니다.`);
        } else if (bomSearchMode === 'edit' && selectedBomIndex !== null) {
            const updated = [...specComponents];
            updated[selectedBomIndex] = {
                ...updated[selectedBomIndex],
                bomCode: m.bomCode || updated[selectedBomIndex]?.bomCode || '',
                componentName: m.componentName || updated[selectedBomIndex]?.componentName || '',
                specDetails: specDetails || updated[selectedBomIndex]?.specDetails || '',
                sizeDimension: m.specification || updated[selectedBomIndex]?.sizeDimension || '',
                weight: m.weight != null ? m.weight : updated[selectedBomIndex]?.weight || 0,
                supplier: m.manufacturer || updated[selectedBomIndex]?.supplier || '',
                imagePath: m.imagePath || updated[selectedBomIndex]?.imagePath || ''
            };
            setSpecComponents(updated);
            toast.success(`[${m.bomCode || m.componentName}] 부자재 정보로 업데이트되었습니다.`);
        } else if (selectedBomIndex !== null) {
            const newBoms = [...(currentSpec.bomItems || [])];
            newBoms[selectedBomIndex] = {
                ...newBoms[selectedBomIndex],
                masterMaterialId: m.id,
                bomCode: m.bomCode,
                specification: m.specification || ''
            };
            setCurrentSpec({ ...currentSpec, bomItems: newBoms });
        }
        setIsBomSearchOpen(false);
        setBomSearchMode('');
        setSelectedBomIndex(null);
    };

    const handleCopyMasterSpec = async () => {
        if (!product || !product.id) return;

        // Find master product ID based on parentItemCode
        if (!formData.parentItemCode) {
            alert("마스터 상품(부모 코드)이 지정되지 않았습니다.");
            return;
        }

        try {
            // First, get the master product's ID
            const masterRes = await api.loadMasterProduct(formData.parentItemCode);
            if (!masterRes.data || !masterRes.data.id) {
                alert("마스터 상품 정보를 찾을 수 없습니다.");
                return;
            }

            if (window.confirm("마스터 상품의 포장사양서를 복사하시겠습니까? (바코드를 제외한 규격/사양 데이터가 승계됩니다)")) {
                const res = await api.copyMasterPackagingSpec(product.id, masterRes.data.id);
                fetchPackagingSpecs(product.id);
                if (res.data) {
                    const { barcode: copiedBarcode, ...copiedFields } = res.data;
                    setCurrentSpec(prev => ({
                        ...prev,
                        ...copiedFields,
                        barcode: prev.barcode || '', // 바코드 제외/기존값 유지
                        bomItems: res.data.bomItems || []
                    }));
                }
                toast.success("마스터 포장사양서를 성공적으로 승계했습니다. (바코드 제외)");
            }
        } catch (error) {
            toast.error("포장사양서 복제에 실패했습니다.");
        }
    };

    const handleLoadTemplate = async () => {
        try {
            const res = await api.getMasterTemplates();
            const template = res.data.find(t => t.productType === formData.productType);
            if (template) {
                setCurrentSpec(prev => ({
                    ...prev,
                    packagingMethodText: template.templateText
                }));
                toast.success(`${formData.productType} 템플릿을 불러왔습니다.`);
            } else {
                toast.warn("해당 제품 유형의 템플릿이 등록되어 있지 않습니다.");
            }
        } catch (error) { toast.error("템플릿 로드 실패"); }
    };

    const handleAddComponent = (p) => {
        const exists = formData.components.find(c => c.itemCode === p.itemCode);
        if (exists) {
            alert("이미 추가된 품목입니다.");
            return;
        }
        // Extract capacity and weight info from the selected product
        const capacity = p.capacity || '';
        const weight = p.weight || '';

        setFormData(prev => ({
            ...prev,
            components: [...prev.components, {
                itemCode: p.itemCode,
                productName: p.productName,
                quantity: 1,
                capacity: capacity,
                weight: weight
            }]
        }));
        setIsSearchOpen(false);
    };


    const removeComponent = (idx) => {
        setFormData(prev => ({
            ...prev,
            components: prev.components.filter((_, i) => i !== idx)
        }));
    };

    const updateComponentQty = (idx, qty) => {
        const newComponents = [...formData.components];
        newComponents[idx].quantity = parseInt(qty) || 1;
        setFormData(prev => ({ ...prev, components: newComponents }));
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();

        // 채널 정보가 선택되지 않은 경우 필수 안내 알림 및 진행 차단
        if (!formData.channels || formData.channels.length === 0) {
            alert("⚠️ 유통 채널 정보가 선택되지 않았습니다.\n제품 등록 및 수정 시 반드시 1개 이상의 유통 채널을 선택해야 합니다.");
            return;
        }

        setIsConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsConfirmOpen(false);
        const payload = { ...formData };
        if (payload.brand && !payload.brand.id && !payload.brand.name) payload.brand = null;
        if (payload.manufacturerInfo && !payload.manufacturerInfo.id && !payload.manufacturerInfo.name) payload.manufacturerInfo = null;

        if (payload.capacity && !String(payload.capacity).includes('mL')) payload.capacity = `${payload.capacity}mL`;
        if (payload.weight && !String(payload.weight).includes('g')) payload.weight = `${payload.weight}g`;

        // 유통 채널 payload 규격화 (JPA ManyToMany 룩업 및 영속화 완벽 보장)
        if (payload.channels && Array.isArray(payload.channels)) {
            payload.channels = payload.channels.map(ch => (ch && ch.id ? { ...ch } : {
                id: ch?.id || null,
                name: ch?.name || '',
                channelCode: ch?.channelCode || ''
            })).filter(c => c.id || c.name);
        }

        console.log(">>>> [FRONTEND SAVE PAYLOAD] Channels:", payload.channels);

        try {
            if (product) {
                const updatedRes = await updateProduct(product.id, payload);
                if (isSpecLoaded) {
                    const specToSave = { ...currentSpec };
                    delete specToSave.methodImages;

                    const dynamicPalletWt = calcPalletWeight(currentSpec, formData);
                    if (dynamicPalletWt) {
                        specToSave.onePalletWeight = dynamicPalletWt;
                    }

                    const specPayload = {
                        spec: {
                            ...specToSave,
                            product: { id: product.id }
                        },
                        revisions: specRevisions,
                        components: specComponents,
                        methodImages: null
                    };
                    const res = await api.saveFullPackagingSpec(specPayload);
                    const savedSpec = res.data?.spec || res.data;
                    const savedSpecId = savedSpec?.id || res.data?.id || currentSpec?.id;

                    if (savedSpecId && packagingMethodSaveRef.current) {
                        await packagingMethodSaveRef.current(savedSpecId);
                    }
                }
                alert("제품 기본정보, 유통채널 및 포장재 사양서/포장방법 사진이 일괄 저장되었습니다.");
            } else {
                await createProduct(payload);
                alert("신규 제품이 등록되었습니다.");
            }
            onClose(true);
        } catch (error) {
            console.error("Batch save error:", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    const handleDuplicateCheck = async () => {
        if (!formData.itemCode) return;
        try {
            const res = await checkDuplicateItemCode(formData.itemCode);
            if (res.data) alert("이미 존재하는 코드입니다.");
            else alert("사용 가능한 코드입니다.");
        } catch (error) {
            alert("중복 체크 실패");
        }
    };

    const handleProductDelete = async () => {
        if (!product || !product.id) return;
        
        if (window.confirm("정말 이 제품을 삭제하시겠습니까? 삭제된 데이터는 휴지통에서 확인 가능합니다.")) {
            try {
                await api.deleteProduct(product.id);
                alert("제품이 삭제되었습니다.");
                onClose(true);
            } catch (error) {
                alert("삭제 중 오류가 발생했습니다.");
            }
        }
    };

    // getFileUrl imported from ./api

    const getCleanFileName = (path) => {
        if (!path) return '';
        let fileName = decodeURIComponent(path.split('/').pop());

        // Handle OLD format: UUID_OriginalName.pdf
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/;
        if (uuidRegex.test(fileName)) {
            return fileName.replace(uuidRegex, '');
        }

        // Handle NEW format: Prefix_shortUUID.ext
        const shortUuidRegex = /_[0-9a-f]{8}(\.[a-zA-Z0-9]+)$/;
        if (shortUuidRegex.test(fileName)) {
            return fileName.replace(shortUuidRegex, '$1');
        }

        return fileName;
    };

    return (
        <div className="drawer-overlay">
            {isSearchOpen && <ProductSearchPopup onClose={() => setIsSearchOpen(false)} onSelect={handleAddComponent} />}
            {isMasterSearchOpen && <ProductSearchPopup onClose={() => setIsMasterSearchOpen(false)} onSelect={handleMasterSelect} />}

            <div className="drawer" onClick={(e) => e.stopPropagation()}>
                <div className="drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h2 style={{ margin: 0, fontSize: isMobile ? '20px' : '22px' }}>
                            {product ? '📦 제품 마스터 수정' : '🆕 신규 제품 등록'} {!canEdit && '(조회 전용)'}
                        </h2>
                        {formData.itemCode && (
                            <span className="badge" style={{ background: '#e2e8f0', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', color: '#475569', border: '1px solid #cbd5e1' }}>
                                📑 {formData.itemCode}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="secondary close-button">
                        <span className="icon">×</span> 닫기
                    </button>
                </div>

                <div className="drawer-tabs-wrapper">
                    <div className="drawer-tabs">
                        <button type="button" className={`drawer-tab-btn ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>상세 정보</button>
                        {permissions.canViewPackaging && (
                            <button type="button" className={`drawer-tab-btn ${activeTab === 'packaging' ? 'active' : ''}`} onClick={() => setActiveTab('packaging')}>포장재 정보 및 사양서</button>
                        )}
                        {formData.isMaster && permissions.canViewPackaging && (
                            <button type="button" className={`drawer-tab-btn ${activeTab === 'spaceRatio' ? 'active' : ''}`} onClick={() => setActiveTab('spaceRatio')}>⚖️ 국가별 공간비율 검증</button>
                        )}
                        <button type="button" className={`drawer-tab-btn ${activeTab === 'testReports' ? 'active' : ''}`} onClick={() => setActiveTab('testReports')}>공인성적서 관리</button>
                        {product && permissions.canViewHistory && (
                            <button type="button" className={`drawer-tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>변경 이력</button>
                        )}
                    </div>
                </div>

                <div className="drawer-body">
                    <form id="product-form" onSubmit={handleSubmit} className="drawer-body-form">
                        {activeTab === 'spaceRatio' && (
                            <div className="tab-pane" style={{ gap: '20px' }}>
                                <div className="card" style={{ borderLeft: '5px solid #6366f1' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h3 style={{ margin: 0 }}>⚖️ 6개국 포장공간비율 검증 및 규격 최적화 역산</h3>
                                        <button 
                                            type="button" 
                                            className="primary" 
                                            style={{ padding: '6px 15px', fontSize: '12.5px', background: '#4f46e5', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                                            onClick={() => {
                                                // 강제 새로고침 트리거
                                                setActiveTab('details');
                                                setTimeout(() => setActiveTab('spaceRatio'), 50);
                                            }}
                                        >
                                            🔄 실시간 재계산
                                        </button>
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                                        품목코드 마스터에 기재된 포장 제원(내용량, 구성품 크기, 외곽박스 치수)을 기반으로 각 국가의 포장규제 법률에 대입하여 실시간 판정합니다.
                                    </p>

                                    {spaceRatioLoading ? (
                                        <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>
                                            <div className="spinner" style={{ margin: '0 auto 15px auto', width: '36px', height: '36px', border: '3px solid rgba(99,102,241,0.1)', borderLeftColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                            <span>국가별 전략 패턴 연산 엔진 가동 중...</span>
                                        </div>
                                    ) : !spaceRatioResults ? (
                                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                                            실시간 공간비율 데이터가 생성되지 않았습니다. 포장 사양의 가로/세로/높이 및 내용량이 채워졌는지 확인하십시오.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {/* 6개국 국가 카드 보드 */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                                                {Object.entries(spaceRatioResults).map(([countryKey, res]) => {
                                                    const isPass = res.passed;
                                                    const isNull = res.spaceRatio === null;
                                                    const countryName = 
                                                        countryKey === 'KOREA' ? '대한민국 (Korea)' :
                                                        countryKey === 'CHINA' ? '중국 (China)' :
                                                        countryKey === 'TAIWAN' ? '대만 (Taiwan)' :
                                                        countryKey === 'JAPAN' ? '일본 (Japan)' :
                                                        countryKey === 'EU' ? '유럽연합 (EU)' :
                                                        countryKey === 'USA' ? '미국 (USA)' : countryKey;

                                                    let borderTop = '4px solid #10b981'; // Green
                                                    let bgLight = '#ecfdf5';
                                                    let statusText = '합격 (Pass)';
                                                    let statusColor = '#10b981';

                                                    if (isNull) {
                                                        borderTop = '4px solid #94a3b8'; // Gray
                                                        bgLight = '#f8fafc';
                                                        statusText = '판정 보류';
                                                        statusColor = '#64748b';
                                                    } else if (!isPass) {
                                                        borderTop = '4px solid #ef4444'; // Red
                                                        bgLight = '#fef2f2';
                                                        statusText = '불합격 (Fail)';
                                                        statusColor = '#ef4444';
                                                    }

                                                    return (
                                                        <div 
                                                            key={countryKey} 
                                                            style={{ 
                                                                background: '#fff', 
                                                                border: '1px solid #e2e8f0', 
                                                                borderTop, 
                                                                borderRadius: '10px', 
                                                                padding: '20px',
                                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                justifyContent: 'space-between'
                                                            }}
                                                        >
                                                            <div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                                    <strong style={{ fontSize: '15px', color: '#1e293b' }}>{countryName}</strong>
                                                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: statusColor, padding: '2px 8px', borderRadius: '4px', backgroundColor: bgLight }}>
                                                                        {statusText}
                                                                    </span>
                                                                </div>

                                                                {/* 계산 세부 수치 */}
                                                                <div style={{ fontSize: '13px', color: '#475569', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <span>측정 공간비율:</span>
                                                                        <span style={{ fontWeight: '700', color: '#1e293b' }}>
                                                                            {isNull || typeof res.spaceRatio !== 'number' ? '-' : `${res.spaceRatio.toFixed(1)}%`}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <span>법적 허용한도:</span>
                                                                        <span>{isNull ? '-' : `${res.limitRatio}% 이하`}</span>
                                                                    </div>
                                                                </div>

                                                                {/* 피드백 상세 메시지 */}
                                                                {res.feedbackMessage && (
                                                                    <div style={{ fontSize: '12px', color: '#4f46e5', backgroundColor: '#f5f3ff', padding: '10px', borderRadius: '6px', marginBottom: '15px', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                                                                        💡 {res.feedbackMessage}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* 역산 최적화 추천안 (Recommended Dimension Spec) */}
                                                            {!isPass && res.recommendedSpec && (
                                                                <div style={{ marginTop: 'auto', background: '#fef2f2', border: '1px solid #fee2e2', padding: '12px', borderRadius: '8px' }}>
                                                                    <strong style={{ fontSize: '12px', color: '#b91c1c', display: 'block', marginBottom: '6px' }}>🛠️ 합격 기준 역산 권장 치수</strong>
                                                                    <div style={{ fontSize: '12.5px', color: '#7f1d1d', fontFamily: 'monospace' }}>
                                                                        가로 &times; 세로 &times; 높이:<br />
                                                                        <b>
                                                                            {Math.floor(res.recommendedSpec.recommendedWidth)} &times; {Math.floor(res.recommendedSpec.recommendedLength)} &times; {Math.floor(res.recommendedSpec.recommendedHeight)} mm 이하
                                                                        </b>
                                                                    </div>
                                                                    <span style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px', display: 'block' }}>
                                                                        (외곽부피가 {Math.floor(res.recommendedSpec.targetOuterVolume / 1000).toLocaleString()} cm³ 이하가 되도록 패키지를 수정하십시오)
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* 글로벌 법률 가이드라인 정보 탭 */}
                                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginTop: '10px' }}>
                                                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b' }}>📌 국가별 포장공간비율 주요 법적 기준 요약</h4>
                                                <ul style={{ fontSize: '12px', color: '#475569', paddingLeft: '20px', lineHeight: '1.6', margin: 0 }}>
                                                    <li><b>한국 환경부 예외</b>: 종합제품(세트)은 개별 단품 판정 결과와 전체 세트 판정(25%이하)을 동시 독립 검증합니다. 3겹 이상 포장 시 자동 불합격 경고합니다.</li>
                                                    <li><b>중국 SAMR 신표준(GB 23350)</b>: 끈/손잡이 부피를 최외곽 판매포장에 포함하며, 1겹 포장은 강제 합격 대상입니다. k값(화장품 기본 6.0) 가중치를 적용합니다.</li>
                                                    <li><b>대만 EPA 고지</b>: 세트 포장박스 내부의 불필요한 고정용 완충 패드는 순수내용량(npv) 부피에서 배제하며, 단일/복합 재질 분류 C값으로 포장용적을 나눕니다.</li>
                                                    <li><b>일본 적정포장규칙</b>: 1차 용기 내 내용물 충전율이 40%(소형 30%) 이상이어야 하며, 세트박스 내벽과의 간격은 유리(GLASS) 용기인 경우 상하/깊이방향 예외 완화(최대 15mm/8mm)가 적용됩니다.</li>
                                                    <li><b>유럽연합(EU) / 미국(FDA)</b>: 법적 허용한도 명세가 부재하거나 사기성 포장금지(FDA) 포괄주의 기조이므로 참고치(50%) 및 Null(판정보류) 상태를 고지합니다.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'details' && (
                            <div className="tab-pane">
                                <div className="card">
                                <h3>
                                    <span style={{ color: '#4a90e2' }}>📝</span> 품목 기본 정보
                                </h3>
                                <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                                <label style={{ fontWeight: 'bold' }}>🔗 품목코드(Product Num) 및 중복 확인</label>
                                {canEdit && (
                                    <button 
                                        type="button" 
                                        onClick={handleMasterLoad} 
                                        className="secondary" 
                                        disabled={formData.isMaster}
                                        style={{ 
                                            padding: '2px 10px', 
                                            fontSize: '12px',
                                            opacity: formData.isMaster ? 0.45 : 1,
                                            cursor: formData.isMaster ? 'not-allowed' : 'pointer'
                                        }}
                                        title={formData.isMaster ? '마스터 제품으로 설정된 경우 타 마스터 제품 정보를 불러올 수 없습니다.' : '마스터 제품 불러오기'}
                                    >
                                        마스터 제품 불러오기
                                    </button>
                                )}
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input name="itemCode" value={formData.itemCode} onChange={handleChange} required placeholder="품목 코드(Product Num) 입력" disabled={!!product || !canEdit} style={{ flex: 1 }} />
                                    {!product && canEdit && <button type="button" onClick={handleDuplicateCheck} className="secondary" style={{ width: 'auto' }}>중복 확인</button>}
                                </div>
                            </div>

                            <div style={{ marginTop: '10px' }}>
                                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', cursor: canEdit ? 'pointer' : 'default' }}>
                                    <input 
                                        type="checkbox" 
                                        name="isMaster" 
                                        checked={formData.isMaster || false} 
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                isMaster: checked,
                                                parentItemCode: checked ? '' : prev.parentItemCode
                                            }));
                                        }} 
                                        disabled={!canEdit} 
                                    />
                                    이 제품을 마스터 제품으로 등록
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>제품명 (한글)</label>
                                <input name="productName" value={formData.productName} onChange={handleChange} required disabled={!canEdit} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>제품명 (영문)</label>
                                <input name="englishProductName" value={formData.englishProductName || ''} onChange={handleChange} disabled={!canEdit} placeholder="English Product Name" />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label>제품구분</label>
                            <select name="productType" value={formData.productType} onChange={handleChange} disabled={!canEdit} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                <option value="PET_REGULAR">PET병 - 막캡</option>
                                <option value="PET_ONE_TOUCH">PET병 - 원터치캡</option>
                                <option value="TUBE">튜브 형태</option>
                                <option value="MASK">마스크</option>
                                <option value="PAD_PP">패드 - PP용기</option>
                                <option value="PAD_POUCH">패드 - 파우치</option>
                                <option value="GLASS">유리(초자)</option>
                                <option value="PET_SERUM">PET병 - 세럼(헤비브로우)</option>
                                <option value="ETC">기타</option>
                            </select>
                        </div>

                        {/* Channel Selection Checkboxes */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '8px', display: 'block' }}>📢 유통 채널 (단일 선택)</label>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '8px',
                                padding: '12px',
                                background: '#f8f9fa',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                {salesChannels.map(channel => {
                                    const isSelected = (formData.channels || []).some(c => c.id === channel.id);
                                    return (
                                        <label key={channel.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="productChannel"
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        const channelCode = channel.channelCode || '';
                                                        let curName = formData.productName || '';
                                                        
                                                        // 기존 채널코드 접미사(_XXX)가 존재하면 제거 후 본래 제품명 추출
                                                        let baseName = curName;
                                                        const lastUnderscore = curName.lastIndexOf('_');
                                                        if (lastUnderscore > 0 && curName.substring(lastUnderscore + 1).match(/^[A-Z0-9/_-]+$/)) {
                                                            baseName = curName.substring(0, lastUnderscore);
                                                        }
                                                        
                                                        const newName = channelCode ? `${baseName}_${channelCode}` : baseName;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            channels: [channel],
                                                            productName: newName
                                                        }));

                                                        // 유통채널 포장 가이드라인 자동 매칭 (덮어쓰기 검증 및 인박스/착인표시 보완)
                                                        syncChannelRulesToSpec(channel);
                                                    }
                                                }}
                                                disabled={!canEdit}
                                            />
                                            {channel.name}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label>브랜드</label>
                                <select value={formData.brand?.id || 'null'} onChange={e => handleRelationChange(e, 'brand')} disabled={!canEdit}>
                                    <option value="null">선택하세요</option>
                                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label>제조사</label>
                                <select value={formData.manufacturerInfo?.id || 'null'} onChange={e => handleRelationChange(e, 'manufacturerInfo')} disabled={!canEdit}>
                                    <option value="null">선택하세요</option>
                                    {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Shelf Life Field */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label>사용기한 (개월)</label>
                                <input
                                    type="text"
                                    name="shelfLifeMonths"
                                    value={formData.shelfLifeMonths || ''}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, ''); // Remove non-digits
                                        if (val.length <= 2) {
                                            handleChange({ target: { name: 'shelfLifeMonths', value: val } });
                                        }
                                    }}
                                    disabled={!canEdit}
                                    placeholder="단위: 개월 (예: 24, 36 등 최대 2자리 숫자)"
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label>개봉 후 사용기한 (개월)</label>
                                <input
                                    type="text"
                                    name="openedShelfLifeMonths"
                                    value={formData.openedShelfLifeMonths || ''}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, ''); // Remove non-digits
                                        if (val.length <= 2) {
                                            handleChange({ target: { name: 'openedShelfLifeMonths', value: val } });
                                        }
                                    }}
                                    disabled={!canEdit}
                                    placeholder="단위: 개월 (예: 6, 12 등 최대 2자리 숫자)"
                                />
                            </div>
                        </div>

                        {/* Barcode Section: 사용기한 하단에 제품 / 인박스 / 아웃박스 바코드 3종 배치 */}
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>제품 바코드 (Product Barcode)</label>
                                <input
                                    type="text"
                                    name="productBarcode"
                                    style={{ fontSize: '13px', padding: '8px 12px' }}
                                    value={formData.productBarcode || ''}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    placeholder="예: 8809123456789 (단품/본품 바코드)"
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>인박스 바코드 (Inbox Barcode)</label>
                                <input
                                    type="text"
                                    name="inboxBarcode"
                                    style={{ fontSize: '13px', padding: '8px 12px' }}
                                    value={formData.inboxBarcode || ''}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    placeholder="예: 18809123456783 (인박스 바코드)"
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>아웃박스 바코드 (Outbox Barcode)</label>
                                <input
                                    type="text"
                                    name="outboxBarcode"
                                    style={{ fontSize: '13px', padding: '8px 12px' }}
                                    value={formData.outboxBarcode || ''}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    placeholder="예: 18809123456786 (물류 아웃박스 바코드)"
                                />
                            </div>
                        </div>
                    </div>

                            {/* 카드 2: 기획세트 구성품 관리 (기획세트일 때만 표시) */}
                            <div style={{ display: formData.productType === '기획세트' ? 'block' : 'none' }}>
                                <div className="card" style={{ borderLeft: '5px solid #f1c40f' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h3 style={{ margin: 0 }}>
                                            <span style={{ color: '#f1c40f' }}>📦</span> 기획세트 구성품 관리 (Planning Set)
                                        </h3>
                                        <button 
                                            type="button" 
                                            className="primary" 
                                            onClick={() => setIsSearchOpen(true)} 
                                            style={{ padding: '4px 12px', fontSize: '12px', opacity: canEdit ? 1 : 0.5 }}
                                            disabled={!canEdit}
                                        >
                                            🎁 구성품 추가
                                        </button>
                                    </div>

                                    <div style={{ marginTop: '10px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#fff' }}>
                                            <thead>
                                                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                                                    <th style={{ padding: '8px', textAlign: 'left' }}>품목코드</th>
                                                    <th style={{ padding: '8px', textAlign: 'left' }}>제품명</th>
                                                    <th style={{ padding: '8px', textAlign: 'left' }}>용량/중량</th>
                                                    <th style={{ padding: '8px', width: '100px', textAlign: 'center' }}>수량 (ea)</th>
                                                    {canEdit && <th style={{ padding: '8px', width: '40px', textAlign: 'center' }}></th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.components.length === 0 && (
                                                    <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>구성품이 없습니다. 상단 버튼으로 추가해주세요.</td></tr>
                                                )}
                                                {formData.components.map((c, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{c.itemCode}</td>
                                                        <td style={{ padding: '8px' }}>{c.productName}</td>
                                                        <td style={{ padding: '8px' }}>{c.capacity || '-'}/{c.weight || '-'}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            <input
                                                                type="text"
                                                                value={formatComma(c.quantity) || ''}
                                                                onChange={(e) => {
                                                                    const raw = e.target.value.replace(/,/g, '').trim();
                                                                    if (/^\d*$/.test(raw)) {
                                                                        updateComponentQty(i, raw);
                                                                    }
                                                                }}
                                                                disabled={!canEdit}
                                                                style={{ width: '70px', padding: '4px', textAlign: 'center' }}
                                                            />
                                                            {c.quantity && <div style={{ fontSize: '10px', color: '#2563eb' }}>{formatComma(c.quantity)} ea</div>}
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            <span 
                                                                onClick={() => canEdit && removeComponent(i)} 
                                                                style={{ 
                                                                    color: 'red', 
                                                                    cursor: canEdit ? 'pointer' : 'not-allowed', 
                                                                    fontWeight: 'bold',
                                                                    fontSize: '16px',
                                                                    opacity: canEdit ? 1 : 0.3 
                                                                }}
                                                            >
                                                                ×
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* 카드 3: 규격 및 체적 정보 (용량, 중량, 박스규격) */}
                            <div className="card" style={{ borderLeft: '5px solid #2ecc71' }}>
                                <h3>
                                    <span style={{ color: '#2ecc71' }}>📏</span> 규격 및 체적 정보
                                </h3>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>용량 (mL)</span>
                                        {formData.capacity && <span style={{ fontSize: '11px', color: '#2563eb' }}>{formatComma(formData.capacity)} mL</span>}
                                    </label>
                                    <div className="input-group">
                                        <input 
                                            name="capacity" 
                                            type="text" 
                                            value={formatComma(formData.capacity) || ''} 
                                            onChange={e => {
                                                const raw = e.target.value.replace(/,/g, '').trim();
                                                if (/^\d*\.?\d*$/.test(raw)) {
                                                    handleChange({ target: { name: 'capacity', value: raw } });
                                                }
                                            }} 
                                            disabled={!canEdit || formData.isPlanningSet} 
                                            placeholder={formData.isPlanningSet ? "자동 계산 예정" : "mL 입력"} 
                                        />
                                        <div className="input-group-addon" style={{ background: '#e2e8f0', color: '#334155', fontWeight: 'bold', cursor: 'not-allowed', minWidth: '120px' }}>
                                            fl.oz (자동): {formatComma(formData.capacityFlOz) || '0'}
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>제품 중량 (g)</span>
                                        {formData.weight && <span style={{ fontSize: '11px', color: '#2563eb' }}>{formatComma(formData.weight)} g</span>}
                                    </label>
                                    <div className="input-group">
                                        <input 
                                            name="weight" 
                                            type="text" 
                                            value={formatComma(formData.weight) || ''} 
                                            onChange={e => {
                                                const raw = e.target.value.replace(/,/g, '').trim();
                                                if (/^\d*\.?\d*$/.test(raw)) {
                                                    handleChange({ target: { name: 'weight', value: raw } });
                                                }
                                            }} 
                                            disabled={!canEdit || formData.isPlanningSet} 
                                            placeholder="g 입력" 
                                        />
                                        <div className="input-group-addon" style={{ background: '#e2e8f0', color: '#334155', fontWeight: 'bold', cursor: 'not-allowed', minWidth: '120px' }}>
                                            oz (자동): {formatComma(formData.weightOz) || '0'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <label style={{ fontWeight: '800', fontSize: '14px', color: '#2d3748' }}>📐 제품 본체 체적정보</label>
                                <div style={{ display: 'flex', gap: '10px', background: '#fff', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => handleChange({ target: { name: 'dimensions.status', value: '가안' } })}
                                        style={{ 
                                            padding: '4px 12px', fontSize: '12px', borderRadius: '6px', border: 'none',
                                            background: formData.dimensions?.status !== '확정' ? '#ebf8ff' : 'transparent',
                                            color: formData.dimensions?.status !== '확정' ? '#2b6cb0' : '#718096',
                                            fontWeight: formData.dimensions?.status !== '확정' ? '700' : '400'
                                        }}
                                        disabled={!canEdit}
                                    >가안</button>
                                    <button 
                                        type="button" 
                                        onClick={() => handleChange({ target: { name: 'dimensions.status', value: '확정' } })}
                                        style={{ 
                                            padding: '4px 12px', fontSize: '12px', borderRadius: '6px', border: 'none',
                                            background: formData.dimensions?.status === '확정' ? '#f0fff4' : 'transparent',
                                            color: formData.dimensions?.status === '확정' ? '#2f855a' : '#718096',
                                            fontWeight: formData.dimensions?.status === '확정' ? '700' : '400'
                                        }}
                                        disabled={!canEdit}
                                    >확정</button>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                {['width', 'length', 'height'].map(dim => (
                                    <div key={dim} className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{dim === 'width' ? '가로' : dim === 'length' ? '세로' : '높이'} (mm)</span>
                                            {formData.dimensions[dim] && <span style={{ fontSize: '11px', color: '#2563eb' }}>{formatComma(formData.dimensions[dim])} mm</span>}
                                        </label>
                                        <div className="input-group">
                                            <input 
                                                name={`dimensions.${dim}`} 
                                                value={formatComma(formData.dimensions[dim]) || ''} 
                                                onChange={e => {
                                                    const raw = e.target.value.replace(/,/g, '').trim();
                                                    if (/^\d*\.?\d*$/.test(raw)) {
                                                        handleChange({ target: { name: `dimensions.${dim}`, value: raw } });
                                                    }
                                                }} 
                                                type="text" 
                                                disabled={!canEdit || formData.dimensions?.status === '확정'} 
                                                placeholder="mm" 
                                            />
                                            <div className="input-group-addon" style={{ background: '#e2e8f0', color: '#334155', fontWeight: 'bold', cursor: 'not-allowed' }}>
                                                in (자동): {formatComma(formData.dimensions[`${dim}Inch`]) || '0'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 1. Inbox */}
                        <div style={{ padding: '20px', background: '#f1f5f9', borderRadius: '12px', marginBottom: '15px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <label style={{ fontWeight: '800', fontSize: '14px', color: '#1e40af' }}>📦 1. 인박스 (지퍼백 포함) 체적정보</label>
                                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#fff', padding: '4px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', color: !formData.inboxInfo?.hasInbox ? '#dc3545' : '#64748b' }}>
                                    <input type="checkbox" name="inboxInfo.hasInbox" checked={!formData.inboxInfo?.hasInbox} onChange={handleChange} disabled={!canEditBoxes} /> 
                                    <span style={{ fontWeight: !formData.inboxInfo?.hasInbox ? '700' : '400' }}>해당 없음</span>
                                </label>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
                                {['inboxWidth', 'inboxLength', 'inboxHeight'].map(dim => (
                                    <div key={dim} className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{dim.includes('Width') ? '가로' : dim.includes('Length') ? '세로' : '높이'} (mm)</span>
                                            {formData.inboxInfo[dim] && <span style={{ fontSize: '11px', color: '#2563eb' }}>{formatComma(formData.inboxInfo[dim])} mm</span>}
                                        </label>
                                        <div className="input-group">
                                            <input 
                                                name={`inboxInfo.${dim}`} 
                                                value={formatComma(formData.inboxInfo[dim]) || ''} 
                                                onChange={e => {
                                                    const raw = e.target.value.replace(/,/g, '').trim();
                                                    if (/^\d*\.?\d*$/.test(raw)) {
                                                        handleChange({ target: { name: `inboxInfo.${dim}`, value: raw } });
                                                    }
                                                }} 
                                                type="text" 
                                                disabled={!canEditBoxes || !formData.inboxInfo?.hasInbox} 
                                                placeholder="mm" 
                                            />
                                            <div className="input-group-addon" style={{ background: '#e2e8f0', color: '#334155', fontWeight: 'bold', cursor: 'not-allowed' }}>
                                                in (자동): {formatComma(formData.inboxInfo[`${dim}Inch`]) || '0'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>입수량 (ea)</span>
                                        {formData.inboxInfo.inboxQuantity && <span style={{ fontSize: '11px', color: '#2563eb' }}>{formatComma(formData.inboxInfo.inboxQuantity)} ea</span>}
                                    </label>
                                    <input 
                                        name="inboxInfo.inboxQuantity" 
                                        type="text" 
                                        value={formatComma(formData.inboxInfo.inboxQuantity) || ''} 
                                        onChange={e => {
                                            const raw = e.target.value.replace(/,/g, '').trim();
                                            if (/^\d*$/.test(raw)) {
                                                handleChange({ target: { name: 'inboxInfo.inboxQuantity', value: raw } });
                                            }
                                        }} 
                                        disabled={!canEditBoxes || !formData.inboxInfo?.hasInbox} 
                                        placeholder="ea 입력"
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>중량 (kg)</span>
                                        {formData.inboxInfo.inboxWeight && <span style={{ fontSize: '11px', color: '#2563eb' }}>{formatComma(formData.inboxInfo.inboxWeight)} kg</span>}
                                    </label>
                                    <div className="input-group">
                                        <input 
                                            name="inboxInfo.inboxWeight" 
                                            type="text" 
                                            value={formatComma(formData.inboxInfo.inboxWeight) || ''} 
                                            onChange={e => {
                                                const raw = e.target.value.replace(/,/g, '').trim();
                                                if (/^\d*\.?\d*$/.test(raw)) {
                                                    handleChange({ target: { name: 'inboxInfo.inboxWeight', value: raw } });
                                                }
                                            }} 
                                            disabled={!canEditBoxes || !formData.inboxInfo?.hasInbox} 
                                            placeholder="kg" 
                                        />
                                        <div className="input-group-addon" style={{ background: '#e2e8f0', color: '#334155', fontWeight: 'bold', cursor: 'not-allowed' }}>
                                            lbs (자동): {formatComma(formData.inboxInfo.inboxWeightLbs) || '0'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Outbox */}
                        <div style={{ padding: '20px', background: '#fdfaf5', borderRadius: '12px', marginBottom: '15px', border: '1px solid #f3e8d2', borderLeft: '4px solid #d97706' }}>
                            <label style={{ fontWeight: '800', fontSize: '14px', color: '#92400e', display: 'block', marginBottom: '15px' }}>📦 2. 아웃박스 체적정보</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
                                {['outboxWidth', 'outboxLength', 'outboxHeight'].map(dim => (
                                    <div key={dim} className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{dim.includes('Width') ? '가로' : dim.includes('Length') ? '세로' : '높이'} (mm)</span>
                                            {formData.outboxInfo[dim] && <span style={{ fontSize: '11px', color: '#2563eb' }}>{formatComma(formData.outboxInfo[dim])} mm</span>}
                                        </label>
                                        <div className="input-group">
                                            <input 
                                                name={`outboxInfo.${dim}`} 
                                                value={formatComma(formData.outboxInfo[dim]) || ''} 
                                                onChange={e => {
                                                    const raw = e.target.value.replace(/,/g, '').trim();
                                                    if (/^\d*\.?\d*$/.test(raw)) {
                                                        handleChange({ target: { name: `outboxInfo.${dim}`, value: raw } });
                                                    }
                                                }} 
                                                type="text" 
                                                disabled={!canEditBoxes} 
                                                placeholder="mm" 
                                            />
                                            <div className="input-group-addon" style={{ background: '#e2e8f0', color: '#334155', fontWeight: 'bold', cursor: 'not-allowed' }}>
                                                in (자동): {formatComma(formData.outboxInfo[`${dim}Inch`]) || '0'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>수량 (ea)</span>
                                        {formData.outboxInfo.outboxQuantity && <span style={{ fontSize: '11px', color: '#2563eb' }}>{formatComma(formData.outboxInfo.outboxQuantity)} ea</span>}
                                    </label>
                                    <input 
                                        name="outboxInfo.outboxQuantity" 
                                        type="text" 
                                        value={formatComma(formData.outboxInfo.outboxQuantity) || ''} 
                                        onChange={e => {
                                            const raw = e.target.value.replace(/,/g, '').trim();
                                            if (/^\d*$/.test(raw)) {
                                                handleChange({ target: { name: 'outboxInfo.outboxQuantity', value: raw } });
                                            }
                                        }} 
                                        disabled={!canEditBoxes} 
                                        placeholder="ea 입력"
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>중량 (kg)</span>
                                        {formData.outboxInfo.outboxWeight && <span style={{ fontSize: '11px', color: '#2563eb' }}>{formatComma(formData.outboxInfo.outboxWeight)} kg</span>}
                                    </label>
                                    <div className="input-group">
                                        <input 
                                            name="outboxInfo.outboxWeight" 
                                            type="text" 
                                            value={formatComma(formData.outboxInfo.outboxWeight) || ''} 
                                            onChange={e => {
                                                const raw = e.target.value.replace(/,/g, '').trim();
                                                if (/^\d*\.?\d*$/.test(raw)) {
                                                    handleChange({ target: { name: 'outboxInfo.outboxWeight', value: raw } });
                                                }
                                            }} 
                                            disabled={!canEditBoxes} 
                                            placeholder="kg" 
                                        />
                                        <div className="input-group-addon" style={{ background: '#e2e8f0', color: '#334155', fontWeight: 'bold', cursor: 'not-allowed' }}>
                                            lbs (자동): {formatComma(formData.outboxInfo.outboxWeightLbs) || '0'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Pallet */}
                        <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px', marginBottom: '20px', border: '1px solid #dcfce7', borderLeft: '4px solid #16a34a' }}>
                            <label style={{ fontWeight: '800', fontSize: '14px', color: '#166534', display: 'block', marginBottom: '15px' }}>📦 3. 팔레트 체적정보</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
                                {['palletWidth', 'palletLength', 'palletHeight'].map(dim => (
                                    <div key={dim} className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{dim.includes('Width') ? '가로' : dim.includes('Length') ? '세로' : '높이'} (mm)</span>
                                            {formData.palletInfo[dim] && <span style={{ fontSize: '11px', color: '#2563eb' }}>{formatComma(formData.palletInfo[dim])} mm</span>}
                                        </label>
                                        <div className="input-group">
                                            <input 
                                                name={`palletInfo.${dim}`} 
                                                value={formatComma(formData.palletInfo[dim]) || ''} 
                                                onChange={e => {
                                                    const raw = e.target.value.replace(/,/g, '').trim();
                                                    if (/^\d*\.?\d*$/.test(raw)) {
                                                        handleChange({ target: { name: `palletInfo.${dim}`, value: raw } });
                                                    }
                                                }} 
                                                type="text" 
                                                disabled={!canEditBoxes} 
                                                placeholder="mm" 
                                            />
                                            <div className="input-group-addon" style={{ background: '#e2e8f0', color: '#334155', fontWeight: 'bold', cursor: 'not-allowed' }}>
                                                in (자동): {formatComma(formData.palletInfo[`${dim}Inch`]) || '0'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>적재수량 (ea)</span>
                                        {formData.palletInfo.palletQuantity && <span style={{ fontSize: '11px', color: '#2563eb' }}>{formatComma(formData.palletInfo.palletQuantity)} ea</span>}
                                    </label>
                                    <input 
                                        name="palletInfo.palletQuantity" 
                                        type="text" 
                                        value={formatComma(formData.palletInfo.palletQuantity) || ''} 
                                        onChange={e => {
                                            const raw = e.target.value.replace(/,/g, '').trim();
                                            if (/^\d*$/.test(raw)) {
                                                handleChange({ target: { name: 'palletInfo.palletQuantity', value: raw } });
                                            }
                                        }} 
                                        disabled={!canEditBoxes} 
                                        placeholder="ea 입력"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>


                            {/* 카드 4: 전성분 관리 */}
                            <div className="card" style={{ borderLeft: '5px solid #1abc9c' }}>
                                <h3>
                                    <span style={{ color: '#1abc9c' }}>🌱</span> 전성분 (Ingredients)
                                </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <label style={{ fontWeight: '700', fontSize: '15px', margin: 0, color: formData.isPlanningSet ? '#999' : '#155724' }}>
                                    🌱 전성분 (Ingredients) {formData.isPlanningSet && '(기획세트 품목은 비활성화됩니다)'}
                                </label>
                                {!formData.isPlanningSet && canEdit && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {/* TODO: 템플릿 파일(packaging_spec_template.xlsx) 재도입 시 아래 버튼 활성화
                                        <button type="button" onClick={handleDownloadTemplate} className="button secondary" style={{ fontSize: '12px', padding: '4px 10px', textDecoration: 'none', background: '#e2e3e5', color: '#383d41', display: 'flex', alignItems: 'center', border: 'none', cursor: 'pointer' }}>
                                            📥 양식 다운로드
                                        </button>
                                        */}
                                        <label className="button primary" style={{ cursor: 'pointer', fontSize: '12px', padding: '4px 10px', margin: 0, background: '#28a745', border: 'none' }}>
                                            📤 엑셀 업로드
                                            <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'ingredientsExcel')} />
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Data Grid for Ingredients */}
                            <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #1abc9c' }}>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#155724' }}>국문 전성분</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#155724' }}>영문 전성분</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#155724' }}>함량(%)</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#155724' }}>함량(ppm)</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#155724' }}>함량(ppb)</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#155724' }}>INCI명</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#155724' }}>알러젠 표시</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#155724' }}>배합 한도 성분 분류</th>
                                            {!formData.isPlanningSet && canEdit && <th style={{ padding: '10px', width: '40px', textAlign: 'center' }}>삭제</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(!formData.productIngredients || formData.productIngredients.length === 0) ? (
                                            <tr>
                                                <td colSpan={canEdit && !formData.isPlanningSet ? 9 : 8} style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                                                    업로드된 전성분 데이터가 없습니다. 엑셀 업로드를 하거나 행을 추가해주세요.
                                                </td>
                                            </tr>
                                        ) : (
                                            formData.productIngredients.map((ing, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #e9ecef', ':hover': { background: '#f8f9fa' } }}>
                                                    <td style={{ padding: '4px 8px' }}>
                                                        <input value={ing.korName || ''} onChange={(e) => updateIngredient(idx, 'korName', e.target.value)} disabled={!canEdit || formData.isPlanningSet} style={{ width: '100%', border: 'none', background: 'transparent' }} />
                                                    </td>
                                                    <td style={{ padding: '4px 8px' }}>
                                                        <input value={ing.engName || ''} onChange={(e) => updateIngredient(idx, 'engName', e.target.value)} disabled={!canEdit || formData.isPlanningSet} style={{ width: '100%', border: 'none', background: 'transparent' }} />
                                                    </td>
                                                    <td style={{ padding: '4px 8px' }}>
                                                        <input
                                                            type="text"
                                                            value={ing.contentPercent != null ? Number(ing.contentPercent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/,/g, '');
                                                                if (!isNaN(rawValue)) updateIngredient(idx, 'contentPercent', rawValue);
                                                            }}
                                                            disabled={!canEdit || formData.isPlanningSet}
                                                            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '4px 8px' }}>
                                                        <input
                                                            type="text"
                                                            value={ing.contentPpm != null ? Number(ing.contentPpm).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/,/g, '');
                                                                if (!isNaN(rawValue)) updateIngredient(idx, 'contentPpm', rawValue);
                                                            }}
                                                            disabled={!canEdit || formData.isPlanningSet}
                                                            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '4px 8px' }}>
                                                        <input
                                                            type="text"
                                                            value={ing.contentPpb != null ? Number(ing.contentPpb).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/,/g, '');
                                                                if (!isNaN(rawValue)) updateIngredient(idx, 'contentPpb', rawValue);
                                                            }}
                                                            disabled={!canEdit || formData.isPlanningSet}
                                                            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '4px 8px' }}>
                                                        <input value={ing.inciName || ''} onChange={(e) => updateIngredient(idx, 'inciName', e.target.value)} disabled={!canEdit || formData.isPlanningSet} style={{ width: '100%', border: 'none', background: 'transparent' }} />
                                                    </td>
                                                    <td style={{ padding: '4px 8px' }}>
                                                        <input value={ing.allergenMark || ''} onChange={(e) => updateIngredient(idx, 'allergenMark', e.target.value)} disabled={!canEdit || formData.isPlanningSet} style={{ width: '100%', border: 'none', background: 'transparent' }} />
                                                    </td>
                                                    <td style={{ padding: '4px 8px' }}>
                                                        <input value={ing.limitClass || ''} onChange={(e) => updateIngredient(idx, 'limitClass', e.target.value)} disabled={!canEdit || formData.isPlanningSet} style={{ width: '100%', border: 'none', background: 'transparent' }} />
                                                    </td>
                                                    {!formData.isPlanningSet && canEdit && (
                                                        <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                                                            <button type="button" onClick={() => removeIngredient(idx)} style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '16px', padding: 0 }}>×</button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {!formData.isPlanningSet && canEdit && (
                                <div style={{ marginTop: '10px', textAlign: 'right' }}>
                                    <button type="button" onClick={addIngredientRow} className="secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>+ 행 추가</button>
                                </div>
                            )}

                            {/* Legacy textarea (hidden or read-only backup) */}
                            <div style={{ marginTop: '15px' }}>
                                <label style={{ fontSize: '11px', color: '#6c757d', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={() => {
                                    const el = document.getElementById('legacyIngredients');
                                    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                                }}>
                                    전성분 리스트 {formData.ingredients && (!formData.productIngredients || formData.productIngredients.length === 0) ? '(이전 데이터 표시 중)' : ''}
                                </label>
                                <div id="legacyIngredients" style={{ display: 'block', marginTop: '5px' }}>
                                    <textarea
                                        name="ingredients"
                                        value={
                                            (formData.productIngredients && formData.productIngredients.length > 0)
                                                ? formData.productIngredients.map(ing => ing.korName).filter(Boolean).join(', ')
                                                : formData.ingredients || ''
                                        }
                                        onChange={handleChange}
                                        disabled={!canEdit || formData.isPlanningSet || (formData.productIngredients && formData.productIngredients.length > 0)}
                                        placeholder="제품 전체 성분을 입력하세요."
                                        style={{ width: '100%', height: '60px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '11px', backgroundColor: (formData.productIngredients && formData.productIngredients.length > 0) ? '#f8f9fa' : '#fff' }}
                                    />
                        </div>
                                </div>
                            </div>

                            {/* 카드 5: 제품 이미지 */}
                            <div className="card" style={{ borderLeft: '5px solid #9b59b6' }}>
                                <h3>
                                    <span style={{ color: '#9b59b6' }}>🖼️</span> 제품 이미지 관리
                                    <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b', marginLeft: 'auto' }}>
                                        (이미지당 최대 3MB, 최대 10개까지 등록 가능)
                                    </span>
                                </h3>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#4a5568' }}>📷 신규 이미지 업로드</label>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: (formData.imagePaths?.length || 0) >= 10 ? '#ef4444' : '#64748b' }}>
                                            현재 {formData.imagePaths?.length || 0} / 10 개
                                        </span>
                                    </div>
                                    {canEdit && (
                                        <div style={{ marginTop: '10px' }}>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                multiple
                                                onChange={(e) => handleFileUpload(e, 'imagePaths')} 
                                                disabled={(formData.imagePaths?.length || 0) >= 10}
                                                style={{ width: '100%', fontSize: '13px', color: '#4a5568' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' }}>
                                    {formData.imagePaths && formData.imagePaths.map((path, idx) => {
                                        const isRepresentative = formData.imagePath === path;
                                        return (
                                            <div key={idx} style={{ 
                                                position: 'relative', 
                                                padding: '8px', 
                                                borderRadius: '10px', 
                                                border: isRepresentative ? '2px solid #9b59b6' : '1px solid #eee',
                                                background: isRepresentative ? '#fdfaff' : '#fff',
                                                transition: 'all 0.2s ease',
                                                boxShadow: isRepresentative ? '0 4px 12px rgba(155, 89, 182, 0.15)' : 'none'
                                            }}>
                                                {isRepresentative && (
                                                    <div style={{ 
                                                        position: 'absolute', top: '-10px', left: '10px', 
                                                        background: '#9b59b6', color: '#fff', fontSize: '10px', 
                                                        padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold',
                                                        zIndex: 2
                                                    }}>
                                                        대표 이미지
                                                    </div>
                                                )}
                                                <div style={{ width: '100%', height: '100px', overflow: 'hidden', borderRadius: '6px', marginBottom: '8px', cursor: 'pointer', background: '#f8f9fa' }} onClick={() => window.open(getFileUrl(path), '_blank')}>
                                                    <img 
                                                        src={getFileUrl(path)} 
                                                        alt={`Product ${idx}`} 
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                                        title="클릭하여 크게 보기"
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {!isRepresentative && canEdit && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setFormData(prev => ({ ...prev, imagePath: path }))}
                                                            style={{ fontSize: '10px', padding: '4px', background: '#f0f4f8', border: '1px solid #d1d9e6', borderRadius: '4px', color: '#4a5568', cursor: 'pointer' }}
                                                        >
                                                            ⭐ 대표설정
                                                        </button>
                                                    )}
                                                    {canEdit && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                const newPaths = formData.imagePaths.filter(p => p !== path);
                                                                let nextRep = formData.imagePath;
                                                                if (isRepresentative) {
                                                                    nextRep = newPaths.length > 0 ? newPaths[0] : '';
                                                                }
                                                                setFormData(prev => ({ ...prev, imagePaths: newPaths, imagePath: nextRep }));
                                                            }}
                                                            style={{ fontSize: '10px', padding: '4px', background: 'transparent', border: '1px solid #fed7d7', borderRadius: '4px', color: '#e53e3e', cursor: 'pointer' }}
                                                        >
                                                            🗑️ 삭제
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!formData.imagePaths || formData.imagePaths.length === 0) && (
                                        <div style={{ gridColumn: '1 / -1', padding: '30px', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px', border: '2px dashed #e2e8f0', color: '#a0aec0', fontSize: '13px' }}>
                                            등록된 이미지가 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>
                                </div>
                        )}

                        {activeTab === 'testReports' && (
                            <div className="tab-pane" style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', color: '#003366', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>📋</span> 공인기관 성적서 관리
                                    </h3>
                                    {canEdit && (
                                        <label className="btn secondary" style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                            📤 새 성적서 업로드
                                            <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={handleUploadTestReport} />
                                        </label>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                                    {testReports.length === 0 ? (
                                        <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#718096', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                            등록된 성적서가 없습니다. 새 성적서를 업로드해주세요.
                                        </div>
                                    ) : (
                                        testReports.map(report => (
                                            <div key={report.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#2d3748' }}>{report.reportName || report.fileName}</div>
                                                <div style={{ fontSize: '12px', color: '#718096', wordBreak: 'break-all' }}>{report.fileName}</div>
                                                <div style={{ fontSize: '11px', color: '#a0aec0' }}>등록일: {new Date(report.uploadedAt).toLocaleString()}</div>
                                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px' }}>
                                                    <button type="button" className="btn secondary" style={{ flex: 1, padding: '6px', fontSize: '12px' }} onClick={() => setTestReportPreview({ open: true, url: report.filePath.startsWith('http') ? report.filePath : api.getBaseURL() + report.filePath, type: report.fileType, name: report.reportName })}>미리보기</button>
                                                    {canEdit && (
                                                        <button type="button" className="btn danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDeleteTestReport(report.id)}>삭제</button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                    <div>
                        {history.length === 0 ? <p style={{ padding: '20px', color: '#777' }}>변경 이력이 없습니다.</p> : Object.entries(
                            history.reduce((acc, rec) => {
                                const timeKey = rec.modifiedAt ? rec.modifiedAt.substring(0, 19).replace('T', ' ') : '알 수 없는 시간';
                                // [고도화] 상세 사용자 정보 우선 노출, 없으면 기존 modifier 필드 사용
                                const mName = rec.modifierName || rec.modifier || '시스템';
                                const mId = rec.modifierUsername ? `(${rec.modifierUsername})` : '';
                                const mComp = rec.modifierCompany ? ` [${rec.modifierCompany}]` : '';
                                const groupKey = `${mName}${mId}${mComp} | ${timeKey}`;
                                if (!acc[groupKey]) acc[groupKey] = [];
                                acc[groupKey].push(rec);
                                return acc;
                            }, {})
                        ).map(([groupKey, records], idx) => (
                            <div key={idx} style={{ padding: '15px', borderBottom: '1px solid #eee', marginBottom: '8px', background: '#fafbfc', borderRadius: '6px' }}>
                                <div style={{ color: '#003366', fontWeight: 'bold', fontSize: '13px', marginBottom: '10px' }}>
                                    🕒 {groupKey}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {records.map(rec => {
                                        const fieldTranslations = {
                                            'ProductName': '제품명(한글)', 'EnglishProductName': '제품명(영문)', 'Brand': '브랜드', 'Manufacturer': '제조사',
                                            'Capacity': '용량', 'Weight': '중량', 'RecycleGrade': '재활용 등급', 'RecycleEvalNo': '재활용 평가번호',
                                            'RecycleMaterial': '재활용 재질분류', 'ParentItemCode': '부모 품목코드', 'IsParent': '모품목 여부',
                                            'IsMaster': '마스터 제품 여부', 'Ingredients': '전성분', 'ImagePath': '제품 이미지',
                                            'Dim.Length': '체적(가로)', 'Dim.Width': '체적(세로)', 'Dim.Height': '체적(높이)',
                                            'CertStandard': '제품표준서', 'CertMsds': 'MSDS', 'CertFunction': '기능성보고서', 'CertExpiry': '유통기한설정서류',
                                            'InboxInfo': '인박스 정보', 'OutboxInfo': '아웃박스 정보', 'PalletInfo': '팔레트 정보', 'Channels': '유통국가',
                                            'Components': '구성품', 'PackagingCertificates': '사양서/성적서',
                                            'Mat.Body': '재질(본체)', 'Weight.Body': '중량(본체)', 'Mat.Cap': '재질(캡)', 'Weight.Cap': '중량(캡)',
                                            'Mat.Pump': '재질(펌프/스프레이)', 'Weight.Pump': '중량(펌프)', 'Mat.Sealing': '재질(실링/리드)', 'Weight.Sealing': '중량(실링/리드)',
                                            'Mat.Label': '재질(라벨)', 'Weight.Label': '중량(라벨)', 'Mat.Tool': '재질(도구/어플)', 'Weight.Tool': '중량(도구/어플)',
                                            'Mat.Packing': '재질(포장재)', 'Weight.Packing': '중량(포장재)', 'Mat.OuterBox': '재질(아웃박스)', 'Weight.OuterBox': '중량(아웃박스)',
                                            'Mat.Etc': '재질(기타)', 'Weight.Etc': '중량(기타)', 'Mat.Remarks': '재질/부자재 비고',
                                            'hasInbox': '인박스 유무',
                                            'inboxWidth': '가로(mm)', 'inboxLength': '세로(mm)', 'inboxHeight': '높이(mm)',
                                            'inboxWidthInch': '가로(in)', 'inboxLengthInch': '세로(in)', 'inboxHeightInch': '높이(in)',
                                            'inboxQuantity': '입수량(ea)', 'inboxWeight': '중량(kg)', 'inboxWeightLbs': '중량(lbs)',
                                            'outboxWidth': '가로(mm)', 'outboxLength': '세로(mm)', 'outboxHeight': '높이(mm)',
                                            'outboxWidthInch': '가로(in)', 'outboxLengthInch': '세로(in)', 'outboxHeightInch': '높이(in)',
                                            'outboxQuantity': '수량(ea)', 'outboxWeight': '중량(kg)', 'outboxWeightLbs': '중량(lbs)',
                                            'palletWidth': '가로(mm)', 'palletLength': '세로(mm)', 'palletHeight': '높이(mm)',
                                            'palletWidthInch': '가로(in)', 'palletLengthInch': '세로(in)', 'palletHeightInch': '높이(in)',
                                            'palletQuantity': '적재수량(ea)',
                                            'itemCode': '품목코드', 'productName': '품목명', 'quantity': '수량',
                                            'id': 'ID', 'productType': '제품구분'
                                        };

                                        const formatHistoryValue = (val, fieldName) => {
                                            if (!val || val === '-' || val === 'null' || val === '[]' || val === '{}') return '없음';
                                            if (fieldName === 'ImagePath') return getCleanFileName(val) || '없음';
                                            if (typeof val === 'boolean' || val === 'true' || val === 'false') {
                                                return String(val) === 'true' ? '예' : '아니오';
                                            }
                                            try {
                                                const parsed = JSON.parse(val);
                                                if (typeof parsed === 'boolean') return parsed ? '예' : '아니오';

                                                if (Array.isArray(parsed)) {
                                                    return parsed.length === 0 ? '없음' : parsed.map(item => {
                                                        if (typeof item === 'string') return decodeURIComponent(item.split('/').pop());
                                                        if (typeof item === 'object') {
                                                            return '【 ' + Object.entries(item)
                                                                .filter(([k, v]) => v !== null && v !== '' && k !== 'id')
                                                                .map(([k, v]) => `${fieldTranslations[k] || k}: ${v}`)
                                                                .join(', ') + ' 】';
                                                        }
                                                        return String(item);
                                                    }).join(', ');
                                                }
                                                return String(parsed);
                                            } catch (e) { return val; }
                                        };

                                        return (
                                            <div key={rec.id} style={{ display: 'flex', gap: '10px', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                                                <div style={{ minWidth: '120px', color: '#666' }}>{fieldTranslations[rec.fieldName] || rec.fieldName}</div>
                                                <div style={{ flex: 1, color: '#333' }}>
                                                    <span style={{ color: '#999', textDecoration: 'line-through' }}>{formatHistoryValue(rec.oldValue, rec.fieldName)}</span>
                                                    <span style={{ margin: '0 8px' }}>→</span>
                                                    <span style={{ fontWeight: 'bold' }}>{formatHistoryValue(rec.newValue, rec.fieldName)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                        )}

                        {activeTab === 'packaging' && (
                            <div className="tab-pane" style={{ animation: 'fadeIn 0.3s ease' }}>
                                {/* 탭 메뉴 헤더 (상단 스크롤 고정 & 모던 세그먼트 알약 UI) */}
                                <div style={{ 
                                    position: 'sticky', 
                                    top: '-30px', 
                                    zIndex: 100, 
                                    background: 'rgba(255, 255, 255, 0.96)', 
                                    backdropFilter: 'blur(8px)',
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    margin: '-30px -40px 20px -40px', 
                                    padding: '12px 36px', 
                                    borderBottom: '1px solid #e2e8f0', 
                                    boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.06)',
                                    gap: '12px',
                                    flexWrap: 'nowrap'
                                }}>
                                    {/* Segmented Pill Tabs Container */}
                                    <div style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center',
                                        background: '#f1f5f9', 
                                        padding: '3px', 
                                        borderRadius: '10px', 
                                        border: '1px solid #e2e8f0',
                                        gap: '2px',
                                        overflowX: 'auto',
                                        maxWidth: 'calc(100% - 240px)'
                                    }}>
                                        {[
                                            { id: 'sheet1', icon: '📄', label: 'Sheet 1: 사양서 양식' },
                                            { id: 'sheet2', icon: '📸', label: 'Sheet 2: 포장방법 사진' },
                                            { id: 'sheet3', icon: '📦', label: 'Sheet 3: 인박스 현품표' },
                                            { id: 'sheet4', icon: '📦', label: 'Sheet 4: 아웃박스 현품표' },
                                            { id: 'sheet5', icon: '🧱', label: 'Sheet 5: 팔레트 현품표' },
                                        ].map(tab => {
                                            const isActive = specSubTab === tab.id;
                                            return (
                                                <button 
                                                    key={tab.id}
                                                    type="button" 
                                                    onClick={() => setSpecSubTab(tab.id)} 
                                                    style={{ 
                                                        padding: '6px 13px', 
                                                        borderRadius: '7px', 
                                                        border: isActive ? '1px solid #cbd5e1' : '1px solid transparent', 
                                                        background: isActive ? '#ffffff' : 'transparent', 
                                                        color: isActive ? '#003366' : '#64748b', 
                                                        fontWeight: isActive ? '700' : '500', 
                                                        cursor: 'pointer', 
                                                        transition: 'all 0.15s ease', 
                                                        fontSize: '12.5px',
                                                        whiteSpace: 'nowrap',
                                                        boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px'
                                                    }}
                                                >
                                                    <span>{tab.icon}</span>
                                                    <span>{tab.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Action Buttons (Right-aligned, single line, no text wrapping) */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                        {canEdit && specSubTab !== 'sheet2' && (
                                            <button 
                                                type="button" 
                                                onClick={handleSaveFullSpec} 
                                                className="primary" 
                                                style={{ 
                                                    background: '#10b981', 
                                                    borderColor: '#059669', 
                                                    color: '#ffffff', 
                                                    fontSize: '12.5px', 
                                                    fontWeight: '600',
                                                    padding: '6px 14px',
                                                    borderRadius: '7px',
                                                    whiteSpace: 'nowrap',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    boxShadow: '0 1px 2px rgba(16, 185, 129, 0.2)'
                                                }}
                                            >
                                                <span>💾</span> 사양서 저장
                                            </button>
                                        )}
                                        {product && (
                                            <>
                                                <button 
                                                    type="button" 
                                                    onClick={handleDownloadSpecExcel} 
                                                    className="secondary" 
                                                    style={{ 
                                                        fontSize: '12px', 
                                                        padding: '6px 12px', 
                                                        borderRadius: '7px',
                                                        whiteSpace: 'nowrap',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        borderColor: '#cbd5e1',
                                                        color: '#334155',
                                                        background: '#ffffff'
                                                    }}
                                                    title="현재 입력된 사양서를 엑셀로 다운로드"
                                                >
                                                    <span>📥</span> Excel
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={handleDownloadSpecPdf} 
                                                    className="secondary" 
                                                    style={{ 
                                                        fontSize: '12px', 
                                                        padding: '6px 12px', 
                                                        borderRadius: '7px',
                                                        whiteSpace: 'nowrap',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        color: '#dc2626', 
                                                        borderColor: '#fca5a5',
                                                        background: '#fef2f2'
                                                    }}
                                                    title="현재 입력된 사양서를 PDF로 다운로드"
                                                >
                                                    <span>📄</span> PDF
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* 📢 채널별 준수 규칙 배너 & 포장 규격 재동기화 버튼 */}
                                <div style={{ padding: '15px 20px', marginBottom: '20px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <h4 style={{ margin: 0, fontSize: '14px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            📢 선택된 유통채널 포장 규격 자동 연동
                                        </h4>
                                        {(formData.channels || []).length > 0 && canEdit && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const ch = formData.channels[0];
                                                    if (ch) syncChannelRulesToSpec(ch, true);
                                                }}
                                                style={{
                                                    background: '#d97706',
                                                    color: '#fff',
                                                    border: 'none',
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🔄 포장규격 강제 재동기화
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#78350f' }}>
                                        {(formData.channels || []).length === 0 ? (
                                            <span>선택된 유통 채널이 없습니다. [상세 정보] 탭에서 유통 채널을 지정하면 포장재 사양서에 포장 규격이 자동 동기화됩니다.</span>
                                        ) : (
                                            formData.channels.map(ch => {
                                                const rules = (masterRules || []).filter(r => r.channel?.id === ch.id);
                                                return (
                                                    <div key={ch.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div>
                                                            <strong>선택 채널:</strong> [{ch.name}] (채널코드: {ch.channelCode || '미지정'})
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#92400e', display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                                            <span>• 팔레트: {ch.palletType || '미지정'} ({ch.palletSpec || '기본'})</span>
                                                            <span>• 최대 적재: {ch.maxStackHeightMm ? `${ch.maxStackHeightMm}mm` : '제한없음'}</span>
                                                            <span>• 착인: {ch.expDateFormat || '미지정'}</span>
                                                            <span>• 완충재: {ch.cushioningStandard || '기본 투입'}</span>
                                                            <span>• 인박스 테이프: {ch.inboxRequired === false ? '별도 테이핑 X (미부착)' : '표준'}</span>
                                                        </div>
                                                        {rules.length > 0 && (
                                                            <div style={{ marginTop: '4px', fontWeight: 'bold' }}>
                                                                <strong>특이 규칙:</strong> {rules.map(r => r.warningMessage).join(' / ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {specSubTab === 'sheet1' && (
                                    <div>
                                        {/* 기본 정보 카드 */}
                                        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                            <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                                🔍 기본 정보
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>브랜드명</label>
                                                    <input type="text" readOnly value={formData.brand?.brandName || '-'} style={{ background: '#f8fafc', fontSize: '14px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>품명(국문)</label>
                                                    <input type="text" readOnly value={formData.productName || '-'} style={{ background: '#f8fafc', fontSize: '14px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>품명(영문)</label>
                                                    <input type="text" readOnly value={formData.englishProductName || '-'} style={{ background: '#f8fafc', fontSize: '14px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>품목코드</label>
                                                    <input type="text" readOnly value={formData.itemCode || '-'} style={{ background: '#f8fafc', fontSize: '14px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>제조사</label>
                                                    <input type="text" readOnly value={formData.manufacturerInfo?.name || '-'} style={{ background: '#f8fafc', fontSize: '14px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>사용기한 / 개봉 후 기한</label>
                                                    <input type="text" readOnly value={`${formData.shelfLifeMonths || '-'}개월 / ${formData.openedShelfLifeMonths || '-'}개월`} style={{ background: '#f8fafc', fontSize: '14px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>바코드</label>
                                                    <input type="text" value={currentSpec.barcode || ''} onChange={e => setCurrentSpec({...currentSpec, barcode: e.target.value})} disabled={!canEdit} style={{ fontSize: '14px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>랩 넘버</label>
                                                    <input type="text" value={currentSpec.labNumber || ''} onChange={e => setCurrentSpec({...currentSpec, labNumber: e.target.value})} disabled={!canEdit} style={{ fontSize: '14px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>바코드 담당자</label>
                                                    <input type="text" value={currentSpec.barcodeManager || ''} onChange={e => setCurrentSpec({...currentSpec, barcodeManager: e.target.value})} disabled={!canEdit} style={{ fontSize: '14px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>기획 담당</label>
                                                    <input type="text" value={currentSpec.plannerName || ''} onChange={e => setCurrentSpec({...currentSpec, plannerName: e.target.value})} disabled={!canEdit} style={{ fontSize: '14px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>디자인 담당</label>
                                                    <input type="text" value={currentSpec.designerName || ''} onChange={e => setCurrentSpec({...currentSpec, designerName: e.target.value})} disabled={!canEdit} style={{ fontSize: '14px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>품질관리 담당</label>
                                                    <input type="text" value={currentSpec.qcName || ''} onChange={e => setCurrentSpec({...currentSpec, qcName: e.target.value})} disabled={!canEdit} style={{ fontSize: '14px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>관리품 구분</label>
                                                    <select value={currentSpec.managementType || '러닝'} onChange={e => setCurrentSpec({...currentSpec, managementType: e.target.value})} disabled={!canEdit} style={{ fontSize: '14px' }}>
                                                        <option value="벌크 신규">벌크 신규</option>
                                                        <option value="사양 변경">사양 변경</option>
                                                        <option value="러닝">러닝</option>
                                                    </select>
                                                </div>
                                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                                    <label style={{ fontSize: '12px', color: '#475569' }}>결재 라인 (기획/디자인/구매/품질 + 검토일)</label>
                                                    <input type="text" value={currentSpec.approvalChainJson || ''} onChange={e => setCurrentSpec({...currentSpec, approvalChainJson: e.target.value})} disabled={!canEdit} style={{ fontSize: '14px' }} placeholder='[{"role":"기획", "name":"홍길동", "date":"2026-06-21"}]' />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 개정 내역 테이블 */}
                                        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>📝 개정 내역</h3>
                                                {canEdit && (
                                                    <button type="button" onClick={handleAddRevision} className="secondary" style={{ fontSize: '11px', padding: '4px 8px' }}>
                                                        + 개정내역 추가
                                                    </button>
                                                )}
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                        <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>NO.</th>
                                                        <th style={{ padding: '8px', textAlign: 'left' }}>개정 내용</th>
                                                        <th style={{ padding: '8px', textAlign: 'center', width: '150px' }}>개정일</th>
                                                        <th style={{ padding: '8px', textAlign: 'center', width: '120px' }}>개정자</th>
                                                        {canEdit && <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>삭제</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {specRevisions.map((rev, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>
                                                                <input type="number" value={rev.revisionNo || ''} onChange={e => handleRevisionChange(idx, 'revisionNo', parseInt(e.target.value))} disabled={!canEdit} style={{ width: '60px', textAlign: 'center', fontSize: '12px' }} />
                                                            </td>
                                                            <td style={{ padding: '6px' }}>
                                                                <input type="text" value={rev.content || ''} onChange={e => handleRevisionChange(idx, 'content', e.target.value)} disabled={!canEdit} style={{ width: '100%', fontSize: '12px' }} />
                                                            </td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>
                                                                <input type="date" value={rev.revisionDate || ''} onChange={e => handleRevisionChange(idx, 'revisionDate', e.target.value)} disabled={!canEdit} style={{ width: '130px', fontSize: '12px' }} />
                                                            </td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>
                                                                <input type="text" value={rev.revisionAuthor || ''} onChange={e => handleRevisionChange(idx, 'revisionAuthor', e.target.value)} disabled={!canEdit} style={{ width: '100px', textAlign: 'center', fontSize: '12px' }} />
                                                            </td>
                                                            {canEdit && (
                                                                <td style={{ padding: '6px', textAlign: 'center' }}>
                                                                    <button type="button" onClick={() => handleRemoveRevision(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer' }}>&times;</button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                    {specRevisions.length === 0 && (
                                                        <tr>
                                                            <td colSpan={canEdit ? 5 : 4} style={{ textAlign: 'center', color: '#94a3b8', padding: '15px' }}>등록된 개정이력이 없습니다.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* 구성품 및 BOM 리스트 테이블 */}
                                        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                                                        <span>📦</span> 제품 구성품 및 BOM 리스트
                                                    </h3>
                                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                        BOM 마스터에서 등록된 표준 부자재 정보를 표시합니다. (비고만 직접 수정 가능)
                                                    </span>
                                                </div>
                                                {canEdit && (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            type="button" 
                                                            onClick={handleOpenBomModalForAdd} 
                                                            className="primary" 
                                                            style={{ 
                                                                fontSize: '12px', 
                                                                padding: '7px 14px', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '6px',
                                                                fontWeight: '600',
                                                                borderRadius: '6px',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                            }}
                                                        >
                                                            <span>🔍</span> BOM 마스터에서 부자재 추가
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                                <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                                    <thead>
                                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                                            <th style={{ padding: '10px 8px', textAlign: 'center', width: '55px', fontWeight: '600' }}>사진</th>
                                                            <th style={{ padding: '10px 10px', textAlign: 'left', width: '160px', fontWeight: '600' }}>BOM 코드</th>
                                                            <th style={{ padding: '10px 10px', textAlign: 'left', minWidth: '140px', fontWeight: '600' }}>구성품명</th>
                                                            <th style={{ padding: '10px 10px', textAlign: 'left', minWidth: '150px', fontWeight: '600' }}>재질 및 세부사양</th>
                                                            <th style={{ padding: '10px 10px', textAlign: 'left', minWidth: '120px', fontWeight: '600' }}>규격 및 사이즈</th>
                                                            <th style={{ padding: '10px 8px', textAlign: 'right', width: '85px', fontWeight: '600' }}>개별중량</th>
                                                            <th style={{ padding: '10px 8px', textAlign: 'center', width: '65px', fontWeight: '600' }}>수량</th>
                                                            <th style={{ padding: '10px 8px', textAlign: 'right', width: '90px', fontWeight: '600' }}>합산중량</th>
                                                            <th style={{ padding: '10px 10px', textAlign: 'left', width: '110px', fontWeight: '600' }}>제조/공급사</th>
                                                            <th style={{ padding: '10px 10px', textAlign: 'left', minWidth: '150px', fontWeight: '600' }}>비고 (수정가능)</th>
                                                            {canEdit && <th style={{ padding: '10px 8px', textAlign: 'center', width: '50px', fontWeight: '600' }}>삭제</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {specComponents.map((comp, idx) => {
                                                            const itemWeight = parseFloat(comp.weight) || 0;
                                                            const itemQty = parseInt(comp.quantity) || 1;
                                                            const totalItemWeight = (itemWeight * itemQty).toFixed(2);
                                                            return (
                                                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                                        {comp.imagePath ? (
                                                                            <img 
                                                                                src={comp.imagePath} 
                                                                                alt="부자재 사진" 
                                                                                style={{ 
                                                                                    width: '36px', 
                                                                                    height: '36px', 
                                                                                    objectFit: 'contain', 
                                                                                    borderRadius: '6px', 
                                                                                    border: '1px solid #e2e8f0',
                                                                                    background: '#fff',
                                                                                    cursor: 'pointer',
                                                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                                                }}
                                                                                title="클릭 시 확대 미리보기"
                                                                                onClick={() => setBomPhotoPreview({ url: comp.imagePath, title: `${comp.bomCode || ''} ${comp.componentName || ''}` })}
                                                                            />
                                                                        ) : (
                                                                            <span style={{ fontSize: '16px', opacity: 0.35 }} title="사진 미등록">📦</span>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ padding: '8px 10px' }}>
                                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                                            <span style={{ 
                                                                                fontFamily: 'monospace', 
                                                                                fontSize: '11px', 
                                                                                fontWeight: '700', 
                                                                                color: '#1d4ed8', 
                                                                                background: '#eff6ff', 
                                                                                padding: '3px 8px', 
                                                                                borderRadius: '5px', 
                                                                                border: '1px solid #bfdbfe',
                                                                                whiteSpace: 'nowrap'
                                                                            }}>
                                                                                {comp.bomCode || '-'}
                                                                            </span>
                                                                            {canEdit && (
                                                                                <button 
                                                                                    type="button" 
                                                                                    onClick={() => handleOpenBomModalForEdit(idx)}
                                                                                    style={{ 
                                                                                        background: '#f1f5f9', 
                                                                                        border: '1px solid #cbd5e1', 
                                                                                        color: '#475569', 
                                                                                        padding: '2px 5px', 
                                                                                        borderRadius: '4px', 
                                                                                        cursor: 'pointer', 
                                                                                        fontSize: '10px' 
                                                                                    }}
                                                                                    title="다른 BOM 부자재로 교체"
                                                                                >
                                                                                    🔍
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '8px 10px' }}>
                                                                        <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>
                                                                            {comp.componentName || '-'}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '8px 10px' }}>
                                                                        <span style={{ 
                                                                            color: '#334155', 
                                                                            fontSize: '12px', 
                                                                            background: '#f8fafc', 
                                                                            padding: '3px 8px', 
                                                                            borderRadius: '4px', 
                                                                            border: '1px solid #e2e8f0',
                                                                            display: 'inline-block'
                                                                        }}>
                                                                            {comp.specDetails || '-'}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '8px 10px' }}>
                                                                        <span style={{ color: '#475569', fontSize: '12px', fontFamily: 'monospace' }}>
                                                                            {comp.sizeDimension || '-'}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                                                                        <span style={{ color: '#334155', fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>
                                                                            {itemWeight > 0 ? `${itemWeight.toFixed(2)}g` : '-'}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                                                        <span style={{ 
                                                                            display: 'inline-block', 
                                                                            padding: '2px 8px', 
                                                                            background: '#f1f5f9', 
                                                                            color: '#334155', 
                                                                            borderRadius: '10px', 
                                                                            fontWeight: '600', 
                                                                            fontSize: '11px' 
                                                                        }}>
                                                                            {itemQty}ea
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                                                                        <strong style={{ color: '#0f766e', fontWeight: '700', fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>
                                                                            {totalItemWeight}g
                                                                        </strong>
                                                                    </td>
                                                                    <td style={{ padding: '8px 10px' }}>
                                                                        <span style={{ color: '#64748b', fontSize: '12px' }}>
                                                                            {comp.supplier || '-'}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '6px 10px' }}>
                                                                        <input 
                                                                            type="text" 
                                                                            value={comp.remarks || ''} 
                                                                            onChange={e => handleSpecComponentChange(idx, 'remarks', e.target.value)} 
                                                                            disabled={!canEdit} 
                                                                            placeholder="특이사항 입력..."
                                                                            style={{ 
                                                                                width: '100%', 
                                                                                fontSize: '12px', 
                                                                                padding: '6px 10px', 
                                                                                borderRadius: '6px', 
                                                                                border: '1px solid #cbd5e1',
                                                                                backgroundColor: canEdit ? '#ffffff' : '#f8fafc'
                                                                            }} 
                                                                        />
                                                                    </td>
                                                                    {canEdit && (
                                                                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                                                                            <button 
                                                                                type="button" 
                                                                                onClick={() => handleRemoveSpecComponent(idx)} 
                                                                                style={{ 
                                                                                    background: 'none', 
                                                                                    border: 'none', 
                                                                                    color: '#ef4444', 
                                                                                    fontSize: '16px', 
                                                                                    cursor: 'pointer', 
                                                                                    lineHeight: 1,
                                                                                    padding: '4px',
                                                                                    borderRadius: '4px'
                                                                                }}
                                                                                title="삭제"
                                                                            >
                                                                                🗑️
                                                                            </button>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                        {specComponents.length === 0 && (
                                                            <tr>
                                                                <td colSpan={canEdit ? 11 : 10} style={{ textAlign: 'center', color: '#64748b', padding: '36px 20px', background: '#fafbfc' }}>
                                                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                                                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>등록된 BOM 부자재 구성품이 없습니다.</div>
                                                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>표준화된 포장 부자재 마스터에서 부자재를 선택하여 등록하세요.</div>
                                                                    {canEdit && (
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={handleOpenBomModalForAdd} 
                                                                            className="primary" 
                                                                            style={{ fontSize: '12px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                                        >
                                                                            <span>🔍</span> BOM 마스터에서 부자재 가져오기
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* 구성품 중량 및 수량 합산 요약 박스 */}
                                            {specComponents.length > 0 && (
                                                <div style={{ marginTop: '15px', padding: '12px 18px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                                    <div style={{ fontSize: '12px', color: '#475569' }}>
                                                        총 <strong>{specComponents.length}</strong>개 구성품 품목 등록됨
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                        <div style={{ fontSize: '13px', color: '#1e293b' }}>
                                                            총 포장 부자재 합산 중량 (Tare Weight):{' '}
                                                            <strong style={{ color: '#0f766e', fontSize: '15px' }}>
                                                                {specComponents.reduce((acc, c) => acc + ((parseFloat(c.weight) || 0) * (parseInt(c.quantity) || 1)), 0).toFixed(2)} g
                                                            </strong>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 아웃박스 & 착인 기준 */}
                                        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>📦 용기 & 단상자 착인 기준 (단품 / 기획세트)</h3>
                                                <span style={{ fontSize: '12px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                                                    ℹ️ 유통채널 규격 자동 매칭
                                                </span>
                                            </div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                                {/* 왼쪽: 용기 착인 기준 */}
                                                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        🧴 용기 (1차 포장) 착인 기준
                                                    </h4>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>1. 표시방법</label>
                                                        <select value={currentSpec.containerMarkingDisplay || ''} onChange={e => setCurrentSpec({...currentSpec, containerMarkingDisplay: e.target.value})} disabled={!canEdit} style={{ fontSize: '13px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
                                                            <option value="">선택 (압인/잉크젯/스티커 등)</option>
                                                            <option value="압인">압인</option>
                                                            <option value="잉크젯 인쇄">잉크젯 인쇄</option>
                                                            <option value="레이저 인쇄">레이저 인쇄</option>
                                                            <option value="투명 스티커 부착">투명 스티커 부착</option>
                                                            <option value="기타">기타</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>2. 착인 또는 압인 위치</label>
                                                        <input type="text" value={currentSpec.containerMarkingLocation || ''} onChange={e => setCurrentSpec({...currentSpec, containerMarkingLocation: e.target.value})} disabled={!canEdit} style={{ fontSize: '13px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="예: 용기 하단에 2줄 착인" />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>3. 사용기한 및 제조번호 표기 기준 (3줄)</label>
                                                        <select
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val) {
                                                                    const textToAppend = val === '그 외' 
                                                                        ? "1. 사용기한 착인 또는 압인 시 '[직접 표기 기준 입력]' 기재" 
                                                                        : `1. 사용기한 착인 또는 압인 시 '${val}' 기재`;
                                                                    const current = currentSpec.containerMarkingText ? currentSpec.containerMarkingText + '\n' : '';
                                                                    setCurrentSpec({ ...currentSpec, containerMarkingText: current + textToAppend });
                                                                }
                                                            }}
                                                            disabled={!canEdit}
                                                            style={{ width: '100%', borderRadius: '6px', padding: '6px', border: '1px solid #93c5fd', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fff', marginBottom: '6px' }}
                                                        >
                                                            <option value="">-- 🧴 용기 착인 기준 프리셋 선택 --</option>
                                                            <option value="LOT EXP YYYYMMDD까지">LOT EXP YYYYMMDD까지</option>
                                                            <option value="LOT EXP DDMMYYYY">LOT EXP DDMMYYYY</option>
                                                            <option value="LOT EXP MM-DD-YYYY">LOT EXP MM-DD-YYYY</option>
                                                            <option value="표기금지(제조번호만 허용)">표기금지(제조번호만 허용)</option>
                                                            <option value="그 외">그 외 (직접 별도 유형/목록 입력)</option>
                                                        </select>
                                                        <textarea value={currentSpec.containerMarkingText || ''} onChange={e => setCurrentSpec({...currentSpec, containerMarkingText: e.target.value})} disabled={!canEdit} rows={3} style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }} placeholder={'LOT 번호\nEXP YYYYMMDD 까지'} />
                                                    </div>
                                                </div>

                                                {/* 오른쪽: 단상자 착인 기준 */}
                                                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        📦 단상자 (2차 포장) 착인 기준
                                                    </h4>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>1. 표시방법</label>
                                                        <select value={currentSpec.unitBoxMarkingDisplay || ''} onChange={e => setCurrentSpec({...currentSpec, unitBoxMarkingDisplay: e.target.value})} disabled={!canEdit} style={{ fontSize: '13px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
                                                            <option value="">선택 (압인/잉크젯/스티커 등)</option>
                                                            <option value="압인">압인</option>
                                                            <option value="잉크젯 인쇄">잉크젯 인쇄</option>
                                                            <option value="레이저 인쇄">레이저 인쇄</option>
                                                            <option value="투명 스티커 부착">투명 스티커 부착</option>
                                                            <option value="기타">기타</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>2. 착인 또는 압인 위치</label>
                                                        <input type="text" value={currentSpec.unitBoxMarkingLocation || ''} onChange={e => setCurrentSpec({...currentSpec, unitBoxMarkingLocation: e.target.value})} disabled={!canEdit} style={{ fontSize: '13px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="예: 단상자 하단에 2줄 착인" />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>3. 사용기한 및 제조번호 표기 기준 (3줄)</label>
                                                        <select
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val) {
                                                                    const textToAppend = val === '그 외' 
                                                                        ? "1. 사용기한 착인 또는 압인 시 '[직접 표기 기준 입력]' 기재" 
                                                                        : `1. 사용기한 착인 또는 압인 시 '${val}' 기재`;
                                                                    const current = currentSpec.unitBoxMarkingText ? currentSpec.unitBoxMarkingText + '\n' : '';
                                                                    setCurrentSpec({ ...currentSpec, unitBoxMarkingText: current + textToAppend });
                                                                }
                                                            }}
                                                            disabled={!canEdit}
                                                            style={{ width: '100%', borderRadius: '6px', padding: '6px', border: '1px solid #93c5fd', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fff', marginBottom: '6px' }}
                                                        >
                                                            <option value="">-- 📦 단상자 착인 기준 프리셋 선택 --</option>
                                                            <option value="LOT EXP YYYYMMDD까지">LOT EXP YYYYMMDD까지</option>
                                                            <option value="LOT EXP DDMMYYYY">LOT EXP DDMMYYYY</option>
                                                            <option value="LOT EXP MM-DD-YYYY">LOT EXP MM-DD-YYYY</option>
                                                            <option value="표기금지(제조번호만 허용)">표기금지(제조번호만 허용)</option>
                                                            <option value="그 외">그 외 (직접 별도 유형/목록 입력)</option>
                                                        </select>
                                                        <textarea value={currentSpec.unitBoxMarkingText || ''} onChange={e => setCurrentSpec({...currentSpec, unitBoxMarkingText: e.target.value})} disabled={!canEdit} rows={3} style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }} placeholder={'LOT 번호\nEXP YYYYMMDD 까지'} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 적재 사양 및 검증 */}
                                        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>📐 적재 사양 및 검증</h3>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        className="outline"
                                                        style={{ fontSize: '13px', padding: '4px 10px', height: 'auto', border: '1px solid #2563eb', color: '#2563eb', borderRadius: '6px', background: 'transparent', cursor: 'pointer' }}
                                                        onClick={() => {
                                                            const inboxSz = formData.inboxInfo?.inboxLength && formData.inboxInfo?.inboxWidth && formData.inboxInfo?.inboxHeight 
                                                                ? `${formData.inboxInfo.inboxLength}x${formData.inboxInfo.inboxWidth}x${formData.inboxInfo.inboxHeight}` 
                                                                : currentSpec.inboxSize;
                                                            const outboxSz = formData.outboxInfo?.outboxLength && formData.outboxInfo?.outboxWidth && formData.outboxInfo?.outboxHeight 
                                                                ? `${formData.outboxInfo.outboxLength}x${formData.outboxInfo.outboxWidth}x${formData.outboxInfo.outboxHeight}` 
                                                                : currentSpec.outboxSize;
                                                            const palletSz = formData.palletInfo?.palletLength && formData.palletInfo?.palletWidth 
                                                                ? `${formData.palletInfo.palletLength}x${formData.palletInfo.palletWidth}` 
                                                                : currentSpec.palletSize;
                                                                
                                                            const outQty = parseInt(formData.outboxInfo?.outboxQuantity || currentSpec.outboxQty || currentSpec.outboxTotalQty || 0);
                                                            const pltTierQty = parseInt(currentSpec.palletTierQty || 0);
                                                            const pltTierCount = parseInt(currentSpec.palletTierCount || 0);
                                                            let calcTotalOutbox = pltTierQty * pltTierCount;
                                                            if (calcTotalOutbox <= 0) {
                                                                if (currentSpec.palletTotalOutboxQty) {
                                                                    calcTotalOutbox = parseInt(currentSpec.palletTotalOutboxQty) || 0;
                                                                } else if (formData.palletInfo?.palletQuantity) {
                                                                    calcTotalOutbox = outQty > 0 ? Math.floor(parseInt(formData.palletInfo.palletQuantity) / outQty) : parseInt(formData.palletInfo.palletQuantity);
                                                                }
                                                            }
                                                            const calcTotalProd = calcTotalOutbox * outQty;
                                                            const outboxWt = parseFloat(formData.outboxInfo?.outboxWeight || currentSpec.oneOutboxWeight || 0);
                                                            const calcPalletWt = (calcTotalOutbox > 0 && outboxWt > 0) ? (calcTotalOutbox * outboxWt).toFixed(1) : '';

                                                            setCurrentSpec({
                                                                ...currentSpec,
                                                                inboxQty: formData.inboxInfo?.inboxQuantity || currentSpec.inboxQty,
                                                                inboxSize: inboxSz,
                                                                outboxQty: outQty || currentSpec.outboxQty,
                                                                outboxSize: outboxSz,
                                                                palletSize: palletSz,
                                                                onePalletHeight: formData.palletInfo?.palletHeight || currentSpec.onePalletHeight,
                                                                palletHeightLimit: formData.palletInfo?.palletHeight || currentSpec.palletHeightLimit,
                                                                oneOutboxWeight: outboxWt || currentSpec.oneOutboxWeight,
                                                                palletTotalOutboxQty: calcTotalOutbox || currentSpec.palletTotalOutboxQty,
                                                                palletTotalProductQty: calcTotalProd || currentSpec.palletTotalProductQty,
                                                                onePalletWeight: calcPalletWt || currentSpec.onePalletWeight
                                                            });
                                                            toast.info("제품 마스터 규격 및 적재 수량이 자동 연동되었습니다.");
                                                        }}
                                                     >
                                                        🔄 제품 마스터 규격 연동
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* 실시간 검증 경고 배너 */}
                                            <div style={{ marginBottom: '15px' }}>
                                                {parseFloat(currentSpec.oneOutboxWeight || formData.outboxInfo?.outboxWeight || 0) > 12 && (
                                                    <div style={{ padding: '8px 12px', marginBottom: '6px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: 'bold' }}>
                                                        ⚠️ 1 아웃박스 중량이 제한치(12kg)를 초과했습니다! (현재: {currentSpec.oneOutboxWeight || formData.outboxInfo?.outboxWeight}kg)
                                                    </div>
                                                )}
                                                {parseFloat(calcPalletWeight(currentSpec, formData) || currentSpec.onePalletWeight || 0) > 630 && (
                                                    <div style={{ padding: '8px 12px', marginBottom: '6px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: 'bold' }}>
                                                        ⚠️ 1 팔레트 중량이 제한치(630kg)를 초과했습니다! (현재: {calcPalletWeight(currentSpec, formData) || currentSpec.onePalletWeight}kg)
                                                    </div>
                                                )}
                                                {parseFloat(currentSpec.onePalletHeight || formData.palletInfo?.palletHeight || 0) > 1500 && (
                                                    <div style={{ padding: '8px 12px', marginBottom: '6px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: 'bold' }}>
                                                        ⚠️ 1 팔레트 적재 높이가 제한치(1,500mm)를 초과했습니다! (현재: {currentSpec.onePalletHeight || formData.palletInfo?.palletHeight}mm)
                                                    </div>
                                                )}
                                                {checkChannelRules().map((warn, wIdx) => (
                                                    <div key={wIdx} style={{ padding: '8px 12px', marginBottom: '6px', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', color: '#b45309', fontSize: '13px', fontWeight: 'bold' }}>
                                                        {warn}
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
                                                {/* 1. 인박스 섹션 */}
                                                <div style={{ border: '1px solid #cbd5e1', padding: '14px', borderRadius: '8px', background: '#f8fafc' }}>
                                                    <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '10px' }}>📦 인박스 (Inner Box)</strong>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>사용유무</label>
                                                        <select
                                                            value={currentSpec.inboxUseYn || 'X'}
                                                            onChange={e => {
                                                                const useYn = e.target.value;
                                                                let updated = { ...currentSpec, inboxUseYn: useYn };
                                                                if (useYn === 'O') {
                                                                    const inQ = parseInt(currentSpec.inboxQty || 0);
                                                                    let obInQ = parseInt(currentSpec.outboxInboxQty || 0);
                                                                    const prevOutQ = parseInt(currentSpec.outboxQty || currentSpec.outboxTotalQty || 0);
                                                                    
                                                                    if (inQ > 0) {
                                                                        if (obInQ <= 0) {
                                                                            obInQ = 1;
                                                                            updated.outboxInboxQty = 1;
                                                                        }
                                                                        const totalQ = inQ * obInQ;
                                                                        const tQty = parseInt(currentSpec.palletTierQty || 0);
                                                                        const tCount = parseInt(currentSpec.palletTierCount || 0);
                                                                        const totalOutboxes = (tQty * tCount) || parseInt(currentSpec.palletTotalOutboxQty || 0) || 0;
                                                                        updated.outboxTotalQty = totalQ;
                                                                        updated.outboxQty = totalQ;
                                                                        updated.palletTotalProductQty = totalOutboxes * totalQ;
                                                                        updated.onePalletWeight = calcPalletWeight(updated, formData);
                                                                    } else if (prevOutQ > 0) {
                                                                        updated.inboxQty = prevOutQ;
                                                                        updated.outboxInboxQty = 1;
                                                                        updated.outboxTotalQty = prevOutQ;
                                                                        updated.outboxQty = prevOutQ;
                                                                    }
                                                                }
                                                                setCurrentSpec(updated);
                                                            }}
                                                            disabled={!canEdit}
                                                            style={{ fontSize: '13px', padding: '6px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                        >
                                                            <option value="O">사용 (O)</option>
                                                            <option value="X">미사용 (X)</option>
                                                        </select>
                                                    </div>

                                                    {currentSpec.inboxUseYn === 'O' && (
                                                        <>
                                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                                <label style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>포장 유형</label>
                                                                <select
                                                                    value={currentSpec.inboxPackagingType || ''}
                                                                    onChange={e => {
                                                                        const pkgType = e.target.value;
                                                                        let tape = '별도 테이핑 X';
                                                                        let mat = 'OPP';
                                                                        if (pkgType === 'A형 박스') {
                                                                            tape = '일자 테이핑(H)';
                                                                            mat = 'SK.S.S.K.K';
                                                                        } else if (pkgType === 'B형 박스') {
                                                                            tape = '별도 테이핑 X';
                                                                            mat = 'SK.S.S.K.K';
                                                                        } else if (pkgType === '지퍼백') {
                                                                            tape = '별도 테이핑 X';
                                                                            mat = 'OPP';
                                                                        }
                                                                        setCurrentSpec({
                                                                            ...currentSpec,
                                                                            inboxPackagingType: pkgType,
                                                                            inboxTapeMethod: tape,
                                                                            inboxMaterial: mat
                                                                        });
                                                                    }}
                                                                    disabled={!canEdit}
                                                                    style={{ fontSize: '13px', padding: '6px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                                >
                                                                    <option value="">선택 (지퍼백 / A형 / B형)</option>
                                                                    <option value="지퍼백">지퍼백</option>
                                                                    <option value="A형 박스">A형 박스</option>
                                                                    <option value="B형 박스">B형 박스</option>
                                                                </select>
                                                            </div>
                                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                                <label style={{ fontSize: '13px', color: '#64748b' }}>테이핑 처리 (자동)</label>
                                                                <input type="text" value={currentSpec.inboxTapeMethod || ''} readOnly style={{ fontSize: '13px', padding: '6px 8px', background: '#e2e8f0', color: '#334155' }} />
                                                            </div>
                                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                                <label style={{ fontSize: '13px', color: '#64748b' }}>재질 (자동)</label>
                                                                <input type="text" value={currentSpec.inboxMaterial || ''} readOnly style={{ fontSize: '13px', padding: '6px 8px', background: '#e2e8f0', color: '#334155' }} />
                                                            </div>
                                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>인박스 포장 수량 (ea)</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={formatComma(currentSpec.inboxQty) || ''} 
                                                                    onChange={e => {
                                                                        const raw = e.target.value.replace(/,/g, '').trim();
                                                                        if (/^\d*$/.test(raw)) {
                                                                            const inQ = raw !== '' ? parseInt(raw) : '';
                                                                            let obInQ = parseInt(currentSpec.outboxInboxQty || 0);
                                                                            const tQty = parseInt(currentSpec.palletTierQty || 0);
                                                                            const tCount = parseInt(currentSpec.palletTierCount || 0);
                                                                            const totalOutboxes = (tQty * tCount) || parseInt(currentSpec.palletTotalOutboxQty || 0) || 0;
                                                                            
                                                                            let updated = { ...currentSpec, inboxQty: inQ };
                                                                            if (inQ !== '' && inQ > 0) {
                                                                                if (obInQ <= 0) {
                                                                                    obInQ = 1;
                                                                                    updated.outboxInboxQty = 1;
                                                                                }
                                                                                const totalQ = inQ * obInQ;
                                                                                const calcProd = totalOutboxes * totalQ;
                                                                                updated.outboxTotalQty = totalQ;
                                                                                updated.outboxQty = totalQ;
                                                                                updated.palletTotalProductQty = calcProd;
                                                                                const calcWt = calcPalletWeight(updated, formData);
                                                                                updated.onePalletWeight = calcWt;
                                                                            } else if (inQ === '') {
                                                                                updated.outboxTotalQty = '';
                                                                                updated.outboxQty = '';
                                                                                updated.palletTotalProductQty = 0;
                                                                            }
                                                                            setCurrentSpec(updated);
                                                                        }
                                                                    }} 
                                                                    disabled={!canEdit} 
                                                                    style={{ fontSize: '13px', padding: '6px 8px' }} 
                                                                    placeholder="수량 입력 (ea)"
                                                                />
                                                            </div>
                                                        </>
                                                    )}

                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8' }}>🏷️ 인박스 현품표 착인/기재 사항</label>
                                                        <select
                                                            value=""
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val) {
                                                                    setCurrentSpec(prev => ({
                                                                        ...prev,
                                                                        inboxLabelMarkingRule: applyLabelRulePreset(prev.inboxLabelMarkingRule, val)
                                                                    }));
                                                                }
                                                            }}
                                                            disabled={!canEdit}
                                                            style={{ width: '100%', borderRadius: '4px', padding: '4px 6px', border: '1px solid #93c5fd', fontSize: '13px', marginBottom: '4px', backgroundColor: '#fff' }}
                                                        >
                                                            <option value="">-- 📥 인박스 현품표 프리셋 --</option>
                                                            <option value="인박스 측면 현품표 스티커 부착 (제품명, 입수량, LOT, 사용기한 기재)">인박스 측면 현품표 스티커 부착 (제품명, 입수량, LOT, 사용기한 기재)</option>
                                                            <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                            <option value="그 외">그 외 (직접 입력)</option>
                                                        </select>
                                                        <textarea value={currentSpec.inboxLabelMarkingRule || ''} onChange={e => setCurrentSpec({...currentSpec, inboxLabelMarkingRule: e.target.value})} disabled={!canEdit} rows={2} style={{ fontSize: '13px', padding: '6px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="인박스 현품표 부착/착인 기준" />
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8' }}>📥 인박스 날짜 표기양식 (제조일자/사용기한)</label>
                                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                                            <select
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val) {
                                                                        setCurrentSpec(prev => ({
                                                                            ...prev,
                                                                            inboxDateFormat: applyDateFormatPreset(prev.inboxDateFormat, 'mfg', val)
                                                                        }));
                                                                    }
                                                                }}
                                                                disabled={!canEdit}
                                                                style={{ flex: 1, borderRadius: '4px', padding: '4px', border: '1px solid #93c5fd', fontSize: '13px', backgroundColor: '#fff' }}
                                                            >
                                                                <option value="">-- Mfg Date 프리셋 --</option>
                                                                <option value="YYYYMMDD">YYYYMMDD</option>
                                                                <option value="YYYY.MM.DD">YYYY.MM.DD</option>
                                                                <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                                                                <option value="DDMMYYYY">DDMMYYYY</option>
                                                            </select>
                                                            <select
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val) {
                                                                        setCurrentSpec(prev => ({
                                                                            ...prev,
                                                                            inboxDateFormat: applyDateFormatPreset(prev.inboxDateFormat, 'exp', val)
                                                                        }));
                                                                    }
                                                                }}
                                                                disabled={!canEdit}
                                                                style={{ flex: 1, borderRadius: '4px', padding: '4px', border: '1px solid #93c5fd', fontSize: '13px', backgroundColor: '#fff' }}
                                                            >
                                                                <option value="">-- Exp Date 프리셋 --</option>
                                                                <option value="YYYYMMDD까지">YYYYMMDD까지</option>
                                                                <option value="YYYY.MM.DD까지">YYYY.MM.DD까지</option>
                                                                <option value="MM-DD-YYYY까지">MM-DD-YYYY까지</option>
                                                                <option value="DDMMYYYY까지">DDMMYYYY까지</option>
                                                                <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                            </select>
                                                        </div>
                                                        <textarea value={currentSpec.inboxDateFormat || ''} onChange={e => setCurrentSpec({...currentSpec, inboxDateFormat: e.target.value})} disabled={!canEdit} rows={3} style={{ fontSize: '13px', padding: '6px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="인박스 현품표 날짜 표기양식 (3줄 작성)" />
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px' }}>비고 (3줄 규격)</label>
                                                        <textarea value={currentSpec.inboxRemarks || ''} onChange={e => setCurrentSpec({...currentSpec, inboxRemarks: e.target.value})} disabled={!canEdit} rows={3} style={{ fontSize: '13px', padding: '6px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="인박스 관련 특이사항 (3줄 작성)" />
                                                    </div>
                                                </div>

                                                {/* 2. 아웃박스 섹션 */}
                                                <div style={{ border: '1px solid #cbd5e1', padding: '14px', borderRadius: '8px', background: '#f8fafc' }}>
                                                    <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '10px' }}>📦 아웃박스 (Outer Box)</strong>
                                                    
                                                    {currentSpec.inboxUseYn === 'O' ? (
                                                        <>
                                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>
                                                                    총 입수량 (ea)
                                                                    {currentSpec.inboxQty && currentSpec.outboxInboxQty ? (
                                                                        <span style={{ fontSize: '13px', color: '#2563eb', marginLeft: '6px', fontWeight: 'normal' }}>
                                                                            (인박스 {formatComma(currentSpec.inboxQty)}ea × {formatComma(currentSpec.outboxInboxQty)}개)
                                                                        </span>
                                                                    ) : null}
                                                                </label>
                                                                <input 
                                                                    type="text" 
                                                                    value={formatComma(currentSpec.outboxTotalQty || currentSpec.outboxQty) || ''} 
                                                                    onChange={e => {
                                                                        const raw = e.target.value.replace(/,/g, '').trim();
                                                                        if (/^\d*$/.test(raw)) {
                                                                            const totalQ = raw !== '' ? parseInt(raw) : 0;
                                                                            const inQ = parseInt(currentSpec.inboxQty || 0);
                                                                            const tQty = parseInt(currentSpec.palletTierQty || 0);
                                                                            const tCount = parseInt(currentSpec.palletTierCount || 0);
                                                                            const totalOutboxes = (tQty * tCount) || parseInt(currentSpec.palletTotalOutboxQty || 0) || 0;
                                                                            const calcProd = totalOutboxes * totalQ;
                                                                            let updated = {
                                                                                ...currentSpec,
                                                                                outboxTotalQty: raw !== '' ? parseInt(raw) : '',
                                                                                outboxQty: raw !== '' ? parseInt(raw) : '',
                                                                                palletTotalProductQty: calcProd
                                                                            };
                                                                            if (raw !== '' && totalQ > 0 && inQ > 0) {
                                                                                updated.outboxInboxQty = Math.floor(totalQ / inQ) || 1;
                                                                            }
                                                                            const calcWt = calcPalletWeight(updated, formData);
                                                                            setCurrentSpec({ ...updated, onePalletWeight: calcWt });
                                                                        }
                                                                    }} 
                                                                    disabled={!canEdit} 
                                                                    style={{ fontSize: '13px', padding: '6px 8px' }} 
                                                                    placeholder="총 입수량 (ea)"
                                                                />
                                                            </div>
                                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>인박스 입수량 (ea)</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={formatComma(currentSpec.outboxInboxQty) || ''} 
                                                                    onChange={e => {
                                                                        const raw = e.target.value.replace(/,/g, '').trim();
                                                                        if (/^\d*$/.test(raw)) {
                                                                            const obInQ = raw !== '' ? parseInt(raw) : '';
                                                                            let inQ = parseInt(currentSpec.inboxQty || 0);
                                                                            const tQty = parseInt(currentSpec.palletTierQty || 0);
                                                                            const tCount = parseInt(currentSpec.palletTierCount || 0);
                                                                            const totalOutboxes = (tQty * tCount) || parseInt(currentSpec.palletTotalOutboxQty || 0) || 0;
                                                                            
                                                                            let updated = { ...currentSpec, outboxInboxQty: obInQ };
                                                                            if (obInQ !== '' && obInQ > 0) {
                                                                                if (inQ <= 0) {
                                                                                    inQ = 1;
                                                                                    updated.inboxQty = 1;
                                                                                }
                                                                                const totalQ = inQ * obInQ;
                                                                                const calcProd = totalOutboxes * totalQ;
                                                                                updated.outboxTotalQty = totalQ;
                                                                                updated.outboxQty = totalQ;
                                                                                updated.palletTotalProductQty = calcProd;
                                                                                const calcWt = calcPalletWeight(updated, formData);
                                                                                updated.onePalletWeight = calcWt;
                                                                            } else if (obInQ === '') {
                                                                                if (inQ > 0) {
                                                                                    updated.outboxTotalQty = inQ;
                                                                                    updated.outboxQty = inQ;
                                                                                    updated.palletTotalProductQty = totalOutboxes * inQ;
                                                                                }
                                                                            }
                                                                            setCurrentSpec(updated);
                                                                        }
                                                                    }} 
                                                                    disabled={!canEdit} 
                                                                    style={{ fontSize: '13px', padding: '6px 8px' }} 
                                                                    placeholder="인박스 입수량 (ea)"
                                                                />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                                            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>총 입수량 (ea)</label>
                                                            <input 
                                                                type="text" 
                                                                value={formatComma(currentSpec.outboxQty || currentSpec.outboxTotalQty) || ''} 
                                                                onChange={e => {
                                                                    const raw = e.target.value.replace(/,/g, '').trim();
                                                                    if (/^\d*$/.test(raw)) {
                                                                        const totalQ = raw !== '' ? parseInt(raw) : 0;
                                                                        const tQty = parseInt(currentSpec.palletTierQty || 0);
                                                                        const tCount = parseInt(currentSpec.palletTierCount || 0);
                                                                        const totalOutboxes = (tQty * tCount) || parseInt(currentSpec.palletTotalOutboxQty || 0) || 0;
                                                                        const calcProd = totalOutboxes * totalQ;
                                                                        const updated = {
                                                                            ...currentSpec,
                                                                            outboxQty: raw !== '' ? parseInt(raw) : '',
                                                                            outboxTotalQty: raw !== '' ? parseInt(raw) : '',
                                                                            palletTotalProductQty: calcProd
                                                                        };
                                                                        const calcWt = calcPalletWeight(updated, formData);
                                                                        setCurrentSpec({ ...updated, onePalletWeight: calcWt });
                                                                    }
                                                                }} 
                                                                disabled={!canEdit} 
                                                                style={{ fontSize: '13px', padding: '6px 8px' }} 
                                                                placeholder="총 입수량 (ea)"
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px' }}>사이즈 (장x폭x고 mm)</label>
                                                        <input type="text" value={currentSpec.outboxSize || ''} onChange={e => setCurrentSpec({...currentSpec, outboxSize: e.target.value})} disabled={!canEdit} style={{ fontSize: '13px', padding: '6px 8px' }} placeholder="예: 600x400x300" />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px' }}>재질 (기본: KLB.S.S.K.K)</label>
                                                        <input type="text" value={currentSpec.outboxMaterial || 'KLB.S.S.K.K'} onChange={e => setCurrentSpec({...currentSpec, outboxMaterial: e.target.value})} disabled={!canEdit} style={{ fontSize: '13px', padding: '6px 8px' }} />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#7c3aed' }}>🏷️ 채널스티커 (채널 자동 매칭 - 수정 불가)</label>
                                                        <input type="text" value={currentSpec.outboxChannelStickerStandard || ''} readOnly style={{ fontSize: '13px', padding: '6px 8px', background: '#e2e8f0', color: '#334155', cursor: 'not-allowed' }} placeholder="채널 선택 시 자동 반영" />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#0284c7' }}>🎈 빈공간 완충재 처리 기준 (채널 자동 매칭 - 수정 불가)</label>
                                                        <input type="text" value={currentSpec.outboxCushioningStandard || ''} readOnly style={{ fontSize: '13px', padding: '6px 8px', background: '#e2e8f0', color: '#334155', cursor: 'not-allowed' }} placeholder="채널 선택 시 자동 반영" />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#d97706' }}>📣 제품 POP 부착/동봉 여부 (채널 자동 매칭 - 수정 불가)</label>
                                                        <input type="text" value={currentSpec.popRequiredStandard || ''} readOnly style={{ fontSize: '13px', padding: '6px 8px', background: '#e2e8f0', color: '#334155', cursor: 'not-allowed' }} placeholder="채널 선택 시 자동 반영" />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8' }}>🏷️ 아웃박스 현품표 착인/기재 사항</label>
                                                        <select
                                                            value=""
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val) {
                                                                    setCurrentSpec(prev => ({
                                                                        ...prev,
                                                                        outboxLabelMarkingRule: applyLabelRulePreset(prev.outboxLabelMarkingRule, val)
                                                                    }));
                                                                }
                                                            }}
                                                            disabled={!canEdit}
                                                            style={{ width: '100%', borderRadius: '4px', padding: '4px 6px', border: '1px solid #93c5fd', fontSize: '13px', marginBottom: '4px', backgroundColor: '#fff' }}
                                                        >
                                                            <option value="">-- 📦 아웃박스 현품표 프리셋 --</option>
                                                            <option value="아웃박스 우측 상단 현품표 착인 (제조번호, 바코드, 사용기한 포함)">아웃박스 우측 상단 현품표 착인 (제조번호, 바코드, 사용기한 포함)</option>
                                                            <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                            <option value="그 외">그 외 (직접 입력)</option>
                                                        </select>
                                                        <textarea value={currentSpec.outboxLabelMarkingRule || ''} onChange={e => setCurrentSpec({...currentSpec, outboxLabelMarkingRule: e.target.value})} disabled={!canEdit} rows={2} style={{ fontSize: '13px', padding: '6px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="아웃박스 현품표 부착/착인 기준" />
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8' }}>📦 아웃박스 날짜 표기양식 (제조일자/사용기한)</label>
                                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                                            <select
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val) {
                                                                        setCurrentSpec(prev => ({
                                                                            ...prev,
                                                                            outboxDateFormat: applyDateFormatPreset(prev.outboxDateFormat, 'mfg', val)
                                                                        }));
                                                                    }
                                                                }}
                                                                disabled={!canEdit}
                                                                style={{ flex: 1, borderRadius: '4px', padding: '4px', border: '1px solid #93c5fd', fontSize: '13px', backgroundColor: '#fff' }}
                                                            >
                                                                <option value="">-- Mfg Date 프리셋 --</option>
                                                                <option value="YYYYMMDD">YYYYMMDD</option>
                                                                <option value="YYYY.MM.DD">YYYY.MM.DD</option>
                                                                <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                                                                <option value="DDMMYYYY">DDMMYYYY</option>
                                                            </select>
                                                            <select
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val) {
                                                                        setCurrentSpec(prev => ({
                                                                            ...prev,
                                                                            outboxDateFormat: applyDateFormatPreset(prev.outboxDateFormat, 'exp', val)
                                                                        }));
                                                                    }
                                                                }}
                                                                disabled={!canEdit}
                                                                style={{ flex: 1, borderRadius: '4px', padding: '4px', border: '1px solid #93c5fd', fontSize: '13px', backgroundColor: '#fff' }}
                                                            >
                                                                <option value="">-- Exp Date 프리셋 --</option>
                                                                <option value="YYYYMMDD까지">YYYYMMDD까지</option>
                                                                <option value="YYYY.MM.DD까지">YYYY.MM.DD까지</option>
                                                                <option value="MM-DD-YYYY까지">MM-DD-YYYY까지</option>
                                                                <option value="DDMMYYYY까지">DDMMYYYY까지</option>
                                                                <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                            </select>
                                                        </div>
                                                        <textarea value={currentSpec.outboxDateFormat || ''} onChange={e => setCurrentSpec({...currentSpec, outboxDateFormat: e.target.value})} disabled={!canEdit} rows={3} style={{ fontSize: '13px', padding: '6px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="아웃박스 현품표 날짜 표기양식 (3줄 작성)" />
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ fontSize: '13px' }}>비고</label>
                                                        <input type="text" value={currentSpec.outboxRemarks || ''} onChange={e => setCurrentSpec({...currentSpec, outboxRemarks: e.target.value})} disabled={!canEdit} style={{ fontSize: '13px', padding: '6px 8px' }} placeholder="아웃박스 특이사항" />
                                                    </div>
                                                </div>

                                                {/* 3. 팔레트 적재 섹션 */}
                                                <div style={{ border: '1px solid #cbd5e1', padding: '14px', borderRadius: '8px', background: '#f8fafc' }}>
                                                    <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '10px' }}>🧱 팔레트 적재 (Pallet Spec)</strong>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a' }}>종류 (채널 자동 연동 - 수정 불가)</label>
                                                        <input type="text" value={currentSpec.palletTypeStr || ''} readOnly style={{ fontSize: '13px', padding: '6px 8px', background: '#e2e8f0', color: '#334155', fontWeight: 'bold', cursor: 'not-allowed' }} placeholder="채널 선택 시 자동 반영" />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold' }}>1단 적재 수량 (아웃박스 ea)</label>
                                                        <input 
                                                            type="text" 
                                                            value={formatComma(currentSpec.palletTierQty) || ''} 
                                                            onChange={e => {
                                                                const raw = e.target.value.replace(/,/g, '').trim();
                                                                if (/^\d*$/.test(raw)) {
                                                                    const tQty = raw !== '' ? parseInt(raw) : 0;
                                                                    const tCount = parseInt(currentSpec.palletTierCount || 0);
                                                                    const calcOutbox = tQty * tCount;
                                                                    const outQty = parseInt(currentSpec.outboxQty || currentSpec.outboxTotalQty || formData.outboxInfo?.outboxQuantity || 0);
                                                                    const calcProd = calcOutbox * outQty;

                                                                    const updated = {
                                                                        ...currentSpec,
                                                                        palletTierQty: raw !== '' ? parseInt(raw) : '',
                                                                        palletTotalOutboxQty: calcOutbox,
                                                                        palletTotalProductQty: calcProd
                                                                    };
                                                                    const calcWt = calcPalletWeight(updated, formData);
                                                                    setCurrentSpec({ ...updated, onePalletWeight: calcWt });
                                                                }
                                                            }} 
                                                            disabled={!canEdit} 
                                                            style={{ fontSize: '13px', padding: '6px 8px' }} 
                                                            placeholder="1단당 박스수" 
                                                        />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold' }}>총 적재 단수</label>
                                                        <input 
                                                            type="text" 
                                                            value={formatComma(currentSpec.palletTierCount) || ''} 
                                                            onChange={e => {
                                                                const raw = e.target.value.replace(/,/g, '').trim();
                                                                if (/^\d*$/.test(raw)) {
                                                                    const tCount = raw !== '' ? parseInt(raw) : 0;
                                                                    const tQty = parseInt(currentSpec.palletTierQty || 0);
                                                                    const calcOutbox = tQty * tCount;
                                                                    const outQty = parseInt(currentSpec.outboxQty || currentSpec.outboxTotalQty || formData.outboxInfo?.outboxQuantity || 0);
                                                                    const calcProd = calcOutbox * outQty;

                                                                    const updated = {
                                                                        ...currentSpec,
                                                                        palletTierCount: raw !== '' ? parseInt(raw) : '',
                                                                        palletTotalOutboxQty: calcOutbox,
                                                                        palletTotalProductQty: calcProd
                                                                    };
                                                                    const calcWt = calcPalletWeight(updated, formData);
                                                                    setCurrentSpec({ ...updated, onePalletWeight: calcWt });
                                                                }
                                                            }} 
                                                            disabled={!canEdit} 
                                                            style={{ fontSize: '13px', padding: '6px 8px' }} 
                                                            placeholder="단수" 
                                                        />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', color: '#1e3a8a', fontWeight: 'bold' }}>총 적재 아웃박스 수량 (자동 연산)</label>
                                                        <input 
                                                            type="text" 
                                                            value={(() => {
                                                                const tQty = parseInt(currentSpec.palletTierQty || 0);
                                                                const tCount = parseInt(currentSpec.palletTierCount || 0);
                                                                const calc = (tQty * tCount) || parseInt(currentSpec.palletTotalOutboxQty || 0) || 0;
                                                                return calc ? `${formatComma(calc)} ea` : '';
                                                            })()} 
                                                            readOnly 
                                                            style={{ fontSize: '13px', padding: '6px 8px', background: '#e2e8f0', color: '#1d4ed8', fontWeight: 'bold', cursor: 'not-allowed' }} 
                                                            placeholder="1단당 박스수 x 단수 자동 계산" 
                                                        />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', color: '#1e3a8a', fontWeight: 'bold' }}>총 적재 제품 수량 (자동 연산)</label>
                                                        <input 
                                                            type="text" 
                                                            value={(() => {
                                                                const tQty = parseInt(currentSpec.palletTierQty || 0);
                                                                const tCount = parseInt(currentSpec.palletTierCount || 0);
                                                                const totalBoxes = (tQty * tCount) || parseInt(currentSpec.palletTotalOutboxQty || 0) || 0;
                                                                const outQty = parseInt(currentSpec.outboxQty || currentSpec.outboxTotalQty || formData.outboxInfo?.outboxQuantity || 0);
                                                                const calc = (totalBoxes * outQty) || parseInt(currentSpec.palletTotalProductQty || 0) || 0;
                                                                return calc ? `${formatComma(calc)} ea` : '';
                                                            })()} 
                                                            readOnly 
                                                            style={{ fontSize: '13px', padding: '6px 8px', background: '#e2e8f0', color: '#1d4ed8', fontWeight: 'bold', cursor: 'not-allowed' }} 
                                                            placeholder="총 아웃박스 x 아웃박스 총 입수량 자동 계산" 
                                                        />
                                                    </div>
                                                    
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8' }}>🏷️ 팔레트 현품표 착인/기재 사항</label>
                                                        <select
                                                            value=""
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val) {
                                                                    setCurrentSpec(prev => ({
                                                                        ...prev,
                                                                        palletLabelMarkingRule: applyLabelRulePreset(prev.palletLabelMarkingRule, val)
                                                                    }));
                                                                }
                                                            }}
                                                            disabled={!canEdit}
                                                            style={{ width: '100%', borderRadius: '4px', padding: '4px 6px', border: '1px solid #93c5fd', fontSize: '13px', marginBottom: '4px', backgroundColor: '#fff' }}
                                                        >
                                                            <option value="">-- 🏷️ 팔레트 현품표 프리셋 --</option>
                                                            <option value="팔레트 랩핑 후 전면/측면 2면 현품표 부착 (제조일자, 사용기한 필수)">팔레트 랩핑 후 전면/측면 2면 현품표 부착 (제조일자, 사용기한 필수)</option>
                                                            <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                            <option value="그 외">그 외 (직접 입력)</option>
                                                        </select>
                                                        <textarea value={currentSpec.palletLabelMarkingRule || ''} onChange={e => setCurrentSpec({...currentSpec, palletLabelMarkingRule: e.target.value})} disabled={!canEdit} rows={2} style={{ fontSize: '13px', padding: '6px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="팔레트 현품표 부착/착인 기준" />
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8' }}>🏷️ 팔레트 날짜 표기양식 (제조일자/사용기한)</label>
                                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                                            <select
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val) {
                                                                        setCurrentSpec(prev => ({
                                                                            ...prev,
                                                                            palletDateFormat: applyDateFormatPreset(prev.palletDateFormat, 'mfg', val)
                                                                        }));
                                                                    }
                                                                }}
                                                                disabled={!canEdit}
                                                                style={{ flex: 1, borderRadius: '4px', padding: '4px', border: '1px solid #93c5fd', fontSize: '13px', backgroundColor: '#fff' }}
                                                            >
                                                                <option value="">-- Mfg Date 프리셋 --</option>
                                                                <option value="YYYYMMDD">YYYYMMDD</option>
                                                                <option value="YYYY.MM.DD">YYYY.MM.DD</option>
                                                                <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                                                                <option value="DDMMYYYY">DDMMYYYY</option>
                                                            </select>
                                                            <select
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val) {
                                                                        setCurrentSpec(prev => ({
                                                                            ...prev,
                                                                            palletDateFormat: applyDateFormatPreset(prev.palletDateFormat, 'exp', val)
                                                                        }));
                                                                    }
                                                                }}
                                                                disabled={!canEdit}
                                                                style={{ flex: 1, borderRadius: '4px', padding: '4px', border: '1px solid #93c5fd', fontSize: '13px', backgroundColor: '#fff' }}
                                                            >
                                                                <option value="">-- Exp Date 프리셋 --</option>
                                                                <option value="YYYYMMDD까지">YYYYMMDD까지</option>
                                                                <option value="YYYY.MM.DD까지">YYYY.MM.DD까지</option>
                                                                <option value="MM-DD-YYYY까지">MM-DD-YYYY까지</option>
                                                                <option value="DDMMYYYY까지">DDMMYYYY까지</option>
                                                                <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                            </select>
                                                        </div>
                                                        <textarea value={currentSpec.palletDateFormat || ''} onChange={e => setCurrentSpec({...currentSpec, palletDateFormat: e.target.value})} disabled={!canEdit} rows={3} style={{ fontSize: '13px', padding: '6px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="팔레트 현품표 날짜 표기양식 (3줄 작성)" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>
                                                        1 아웃박스 중량 (kg) [제한: 12kg]
                                                        {currentSpec.oneOutboxWeight && <span style={{ fontSize: '13px', color: '#2563eb', marginLeft: '6px', fontWeight: 'bold' }}>({formatComma(currentSpec.oneOutboxWeight)} kg)</span>}
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={formatComma(currentSpec.oneOutboxWeight) || ''} 
                                                        onChange={e => {
                                                            const raw = e.target.value.replace(/,/g, '').trim();
                                                            if (/^\d*\.?\d*$/.test(raw)) {
                                                                const newOutboxWt = raw !== '' ? parseFloat(raw) : '';
                                                                const tQty = parseInt(currentSpec.palletTierQty || 0);
                                                                const tCount = parseInt(currentSpec.palletTierCount || 0);
                                                                const totalBoxes = (tQty * tCount) || parseInt(currentSpec.palletTotalOutboxQty || 0) || 0;
                                                                const calcWt = (newOutboxWt > 0 && totalBoxes > 0) ? (newOutboxWt * totalBoxes).toFixed(1) : '';
                                                                setCurrentSpec({ ...currentSpec, oneOutboxWeight: raw, onePalletWeight: calcWt });
                                                            }
                                                        }} 
                                                        disabled={!canEdit} 
                                                        style={{ borderColor: parseFloat(currentSpec.oneOutboxWeight || 0) > 12 ? '#ef4444' : '#cbd5e1', fontSize: '13px', padding: '6px 8px' }} 
                                                        placeholder="kg 단위 입력 (예: 8.5)"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>
                                                        1 팔레트 중량 (kg) [제한: 630kg] (자동 연산)
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={(() => {
                                                            const calc = calcPalletWeight(currentSpec, formData);
                                                            return calc ? `${formatComma(calc)} kg` : '';
                                                        })()} 
                                                        readOnly 
                                                        style={{ 
                                                            background: '#e2e8f0', 
                                                            color: '#1d4ed8', 
                                                            fontWeight: 'bold', 
                                                            cursor: 'not-allowed', 
                                                            borderColor: parseFloat(calcPalletWeight(currentSpec, formData) || currentSpec.onePalletWeight || 0) > 630 ? '#ef4444' : '#cbd5e1', 
                                                            fontSize: '13px',
                                                            padding: '6px 8px'
                                                        }} 
                                                        placeholder="총 아웃박스 x 1 아웃박스 중량 자동 계산"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>
                                                        1 팔레트 높이 (mm) [제한: 1,500mm]
                                                        {currentSpec.onePalletHeight && <span style={{ fontSize: '13px', color: '#2563eb', marginLeft: '6px', fontWeight: 'bold' }}>({formatComma(currentSpec.onePalletHeight)} mm)</span>}
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={formatComma(currentSpec.onePalletHeight) || ''} 
                                                        onChange={e => {
                                                            const raw = e.target.value.replace(/,/g, '').trim();
                                                            if (/^\d*$/.test(raw)) {
                                                                setCurrentSpec({...currentSpec, onePalletHeight: raw ? parseInt(raw, 10) : ''});
                                                            }
                                                        }} 
                                                        disabled={!canEdit} 
                                                        style={{ borderColor: parseFloat(currentSpec.onePalletHeight || 0) > 1500 ? '#ef4444' : '#cbd5e1', fontSize: '13px', padding: '6px 8px', fontWeight: 'bold' }} 
                                                        placeholder="예: 1,500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 특이사항 */}
                                        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                            <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>📝 사양서 특이사항</h3>
                                            <textarea value={currentSpec.remarks || ''} onChange={e => setCurrentSpec({...currentSpec, remarks: e.target.value})} disabled={!canEdit} style={{ width: '100%', height: '160px', fontSize: '14px', fontWeight: '500', lineHeight: '1.6', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="공장 출하 또는 적재 보관 시 특이 우려 사항 자유 서술..." />
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: specSubTab === 'sheet2' ? 'block' : 'none' }}>
                                    <PackagingMethodTab 
                                        specId={currentSpec?.id} 
                                        canEdit={canEdit} 
                                        masterMethodImages={masterMethodImagesForInherit}
                                        onRegisterSaveHandler={(fn) => { packagingMethodSaveRef.current = fn; }}
                                        onRegisterReloadHandler={(fn) => { packagingMethodReloadRef.current = fn; }}
                                        onRegisterInheritHandler={(fn) => { packagingMethodInheritRef.current = fn; }}
                                        onEnsureSpecCreated={async () => {
                                            const specToSave = { ...currentSpec };
                                            delete specToSave.methodImages;

                                            const payload = {
                                                spec: {
                                                    ...specToSave,
                                                    product: { id: product.id }
                                                },
                                                revisions: specRevisions,
                                                components: specComponents,
                                                methodImages: null
                                            };
                                            const res = await api.saveFullPackagingSpec(payload);
                                            const savedSpec = res.data?.spec || res.data;
                                            return savedSpec?.id || res.data?.id;
                                        }}
                                    />
                                </div>

                                {specSubTab === 'sheet3' && (
                                    <div className="card" style={{ padding: '25px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                                            <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>
                                                📦 Sheet 3: 인박스 현품표 (Inbox Label) 시각화
                                            </h3>
                                            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#c53030', fontWeight: 'bold' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={hideExpiryOnLabels}
                                                    onChange={(e) => setHideExpiryOnLabels(e.target.checked)}
                                                />
                                                🏷️ [현품표 옵션] 현품표 사용기한(Exp. Date) 항목 표기 안함 (삭제)
                                            </label>
                                        </div>

                                        {/* JP/OFF 채널 특이사항 안내 */}
                                        <div style={{ padding: '10px 14px', background: '#fefcbf', border: '1px solid #f6e05e', borderRadius: '6px', fontSize: '13px', color: '#744210', marginBottom: '20px' }}>
                                            💡 <strong>[JP/OFF 채널 특이사항]</strong> 기획세트에만 해당, 구성품의 제조번호 순차적으로 전부 기재. /로 구분
                                        </div>
                                        
                                        {/* 인박스 현품표 가상 카드 레이아웃 */}
                                        <div style={{ maxWidth: '520px', margin: '0 auto', background: '#fff', border: '2px solid #2563eb', padding: '20px', fontFamily: 'monospace', color: '#000', borderRadius: '8px' }}>
                                            <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', borderBottom: '2px solid #2563eb', paddingBottom: '10px', marginBottom: '15px', color: '#1e40af' }}>
                                                [ 인 박 스 현 품 표 / INBOX LABEL ]
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <tbody>
                                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', width: '210px', color: '#334155' }}>품목코드 (Product Code):</td>
                                                        <td style={{ padding: '8px' }}>{formData.itemCode || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#334155' }}>국문 제품명 (Product Name KOR):</td>
                                                        <td style={{ padding: '8px' }}>{formData.productName || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#334155' }}>영문 제품명 (Product Name ENG):</td>
                                                        <td style={{ padding: '8px' }}>{formData.englishProductName || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#334155' }}>제조번호 (Lot No.):</td>
                                                        <td style={{ padding: '8px' }}>[ 생산 배치번호 표기 ]</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#334155' }}>제조일자 (Mfg. Date):</td>
                                                        <td style={{ padding: '8px' }}>[ {extractDateFormatPart(currentSpec.inboxDateFormat, 'mfg') || 'YYYY.MM.DD 표기'} ]</td>
                                                    </tr>
                                                    {!isExpiryHidden(currentSpec.inboxDateFormat) && (
                                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                            <td style={{ padding: '8px', fontWeight: 'bold', color: '#334155' }}>사용기한 (Exp. Date):</td>
                                                            <td style={{ padding: '8px' }}>[ {extractDateFormatPart(currentSpec.inboxDateFormat, 'exp') || 'YYYY.MM.DD 까지'} ]</td>
                                                        </tr>
                                                    )}
                                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#334155' }}>입수량 (Quantity):</td>
                                                        <td style={{ padding: '8px' }}>{currentSpec.inboxQty ? `${formatComma(currentSpec.inboxQty)} EA` : '0 EA'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#334155' }}>제조사 (Manufacturer):</td>
                                                        <td style={{ padding: '8px' }}>{formData.manufacturerInfo?.name || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderTop: '2px solid #2563eb', backgroundColor: '#f0f9ff' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#1e40af' }}>🏷️ 현품표 표기/착인 기재 사항:</td>
                                                        <td style={{ padding: '8px', color: '#0369a1', fontWeight: 'bold' }}>{currentSpec.inboxLabelMarkingRule || '인박스 현품표 표준 규격 적용'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <div style={{ marginTop: '15px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                                                ⚠️ 인박스 현품표에는 바코드를 부착/표기하지 않습니다. (규정 준수)
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '25px', padding: '20px', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>📸 인박스 외관 및 포장 상태 이미지 (3D 모델/도면 연동부)</div>
                                            <div style={{ height: '180px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                                [ 인박스 3D WebGL / 도면 렌더링 영역 ]
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {specSubTab === 'sheet4' && (
                                    <div className="card" style={{ padding: '25px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                                            <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>
                                                📦 Sheet 4: 아웃박스 현품표 (Outbox Label) 시각화
                                            </h3>
                                            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#c53030', fontWeight: 'bold' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={hideExpiryOnLabels}
                                                    onChange={(e) => setHideExpiryOnLabels(e.target.checked)}
                                                />
                                                🏷️ 현품표 사용기한(Exp. Date) 항목 표기 안함
                                            </label>
                                        </div>

                                        {/* JP/OFF 채널 특이사항 안내 */}
                                        <div style={{ padding: '10px 14px', background: '#fefcbf', border: '1px solid #f6e05e', borderRadius: '6px', fontSize: '13px', color: '#744210', marginBottom: '20px' }}>
                                            💡 <strong>[JP/OFF 채널 특이사항]</strong> 기획세트에만 해당, 구성품의 제조번호 순차적으로 전부 기재. /로 구분
                                        </div>
                                        
                                        {/* 아웃박스 현품표 가상 카드 레이아웃 */}
                                        <div style={{ maxWidth: '520px', margin: '0 auto', background: '#fff', border: '2px solid #000', padding: '20px', fontFamily: 'monospace', color: '#000', borderRadius: '8px' }}>
                                            <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
                                                [ 아 웃 박 스 현 품 표 / OUTBOX LABEL ]
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <tbody>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', width: '210px' }}>품목코드 (Product Code):</td>
                                                        <td style={{ padding: '8px' }}>{formData.itemCode || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>국문 제품명 (Product Name KOR):</td>
                                                        <td style={{ padding: '8px' }}>{formData.productName || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>영문 제품명 (Product Name ENG):</td>
                                                        <td style={{ padding: '8px' }}>{formData.englishProductName || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>제조번호 (Lot No.):</td>
                                                        <td style={{ padding: '8px' }}>[ 생산 배치번호 표기 ]</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>제조일자 (Mfg. Date):</td>
                                                        <td style={{ padding: '8px' }}>[ {extractDateFormatPart(currentSpec.outboxDateFormat, 'mfg') || 'YYYY.MM.DD 표기'} ]</td>
                                                    </tr>
                                                    {!isExpiryHidden(currentSpec.outboxDateFormat) && (
                                                        <tr style={{ borderBottom: '1px solid #000' }}>
                                                            <td style={{ padding: '8px', fontWeight: 'bold' }}>사용기한 (Exp. Date):</td>
                                                            <td style={{ padding: '8px' }}>[ {extractDateFormatPart(currentSpec.outboxDateFormat, 'exp') || 'YYYY.MM.DD 까지'} ]</td>
                                                        </tr>
                                                    )}
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>입수량 (Quantity):</td>
                                                        <td style={{ padding: '8px' }}>{currentSpec.outboxQty ? `${formatComma(currentSpec.outboxQty)} EA` : '0 EA'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>제품무게 (Gross Weight):</td>
                                                        <td style={{ padding: '8px' }}>{currentSpec.oneOutboxWeight ? `${currentSpec.oneOutboxWeight} kg` : '- kg'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>제조사 (Manufacturer):</td>
                                                        <td style={{ padding: '8px' }}>{formData.manufacturerInfo?.name || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderTop: '2px solid #2563eb', backgroundColor: '#f0f9ff' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#1e40af' }}>🏷️ 현품표 표기/착인 기재 사항:</td>
                                                        <td style={{ padding: '8px', color: '#0369a1', fontWeight: 'bold' }}>{currentSpec.outboxLabelMarkingRule || '아웃박스 현품표 표준 규격 적용'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <div style={{ marginTop: '20px', borderTop: '2px dashed #000', paddingTop: '15px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                                                    바코드 (Barcode): {formData.outboxBarcode ? '아웃박스 바코드' : '제품 바코드 (기본)'}
                                                </div>
                                                <div style={{ letterSpacing: '10px', fontSize: '48px', fontWeight: 'bold', margin: '14px 0', lineHeight: '1.2' }}>
                                                    ||||| | |||| ||| ||
                                                </div>
                                                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                                                    {formData.outboxBarcode || formData.productBarcode || currentSpec.barcode || 'BARCODE-NOT-SET'}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '25px', padding: '20px', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>📸 아웃박스 외관 및 착인 위치 이미지 (3D 모델/도면 연동부)</div>
                                            <div style={{ height: '180px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                                [ 이미지 드래그 업로드 또는 3D WebGL 캔버스 렌더링 영역 ]
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {specSubTab === 'sheet5' && (
                                    <div className="card" style={{ padding: '25px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                                            <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>
                                                🧱 Sheet 5: 팔레트 현품표 (Pallet Label) 시각화
                                            </h3>
                                            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#c53030', fontWeight: 'bold' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={hideExpiryOnLabels}
                                                    onChange={(e) => setHideExpiryOnLabels(e.target.checked)}
                                                />
                                                🏷️ [현품표 옵션] 현품표 사용기한(Exp. Date) 항목 표기 안함 (삭제)
                                            </label>
                                        </div>

                                        {/* JP/OFF 채널 특이사항 안내 */}
                                        <div style={{ padding: '10px 14px', background: '#fefcbf', border: '1px solid #f6e05e', borderRadius: '6px', fontSize: '13px', color: '#744210', marginBottom: '20px' }}>
                                            💡 <strong>[JP/OFF 채널 특이사항]</strong> 기획세트에만 해당, 구성품의 제조번호 순차적으로 전부 기재. /로 구분
                                        </div>
                                        
                                        {/* 팔레트 현품표 가상 카드 */}
                                        <div style={{ maxWidth: '520px', margin: '0 auto', background: '#fff', border: '2px solid #000', padding: '20px', fontFamily: 'monospace', color: '#000', borderRadius: '8px' }}>
                                            <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
                                                [ 팔 레 트 현 품 표 / PALLET LABEL ]
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <tbody>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', width: '210px' }}>품목코드 (Product Code):</td>
                                                        <td style={{ padding: '8px' }}>{formData.itemCode || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>국문 제품명 (Product Name KOR):</td>
                                                        <td style={{ padding: '8px' }}>{formData.productName || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>영문 제품명 (Product Name ENG):</td>
                                                        <td style={{ padding: '8px' }}>{formData.englishProductName || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>제조번호 (Lot No.):</td>
                                                        <td style={{ padding: '8px' }}>[ 생산 배치번호 표기 ]</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>제조일자 (Mfg. Date):</td>
                                                        <td style={{ padding: '8px' }}>[ {extractDateFormatPart(currentSpec.palletDateFormat, 'mfg') || 'YYYY.MM.DD 표기'} ]</td>
                                                    </tr>
                                                    {!isExpiryHidden(currentSpec.palletDateFormat) && (
                                                        <tr style={{ borderBottom: '1px solid #000' }}>
                                                            <td style={{ padding: '8px', fontWeight: 'bold' }}>사용기한 (Exp. Date):</td>
                                                            <td style={{ padding: '8px' }}>[ {extractDateFormatPart(currentSpec.palletDateFormat, 'exp') || 'YYYY.MM.DD 까지'} ]</td>
                                                        </tr>
                                                    )}
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>적재 박스 수량 (Box Qty/Pallet):</td>
                                                        <td style={{ padding: '8px' }}>{formData.palletInfo?.palletQuantity ? `${formatComma(formData.palletInfo.palletQuantity)} Box` : '- Box'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>적재 낱개 수량 (Total Pcs/Pallet):</td>
                                                        <td style={{ padding: '8px' }}>
                                                            {formData.palletInfo?.palletQuantity && currentSpec.outboxQty
                                                                ? `${formatComma(parseInt(formData.palletInfo.palletQuantity) * parseInt(currentSpec.outboxQty))} EA`
                                                                : '- EA'}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>제조사 (Manufacturer):</td>
                                                        <td style={{ padding: '8px' }}>{formData.manufacturerInfo?.name || '-'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <div style={{ marginTop: '20px', borderTop: '2px dashed #000', paddingTop: '15px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                                                    바코드 (Barcode): 제품 바코드
                                                </div>
                                                <div style={{ letterSpacing: '10px', fontSize: '48px', fontWeight: 'bold', margin: '14px 0', lineHeight: '1.2' }}>
                                                    ||||| | |||| ||| ||
                                                </div>
                                                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                                                    {formData.productBarcode || currentSpec.barcode || 'BARCODE-NOT-SET'}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '25px', padding: '20px', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>📸 팔레트 적재 형태 도면 / 이미지</div>
                                            <div style={{ height: '180px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                                [ 적재 3D 시뮬레이터 캔버스 영역 ]
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                </div>

                <div className="drawer-footer">
                    <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#94a3b8' }}>
                        <span>📅 등록: {formData.createdAt ? formData.createdAt.substring(0, 16).replace('T', ' ') : '-'}</span>
                        <span>🔄 마지막 수정: {formData.updatedAt ? formData.updatedAt.substring(0, 16).replace('T', ' ') : '-'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {product && canDeleteProduct('products') && (
                            <button 
                                type="button" 
                                className="outline" 
                                onClick={handleProductDelete} 
                                style={{ color: '#c53030', borderColor: '#feb2b2', marginRight: 'auto' }}
                            >
                                🗑️ 삭제
                            </button>
                        )}
                        <button type="button" className="secondary" onClick={onClose} style={{ minWidth: '80px' }}>닫기</button>
                        <button
                            type="submit"
                            form="product-form"
                            className="primary"
                            disabled={!canEdit}
                            style={{ 
                                minWidth: '120px', 
                                background: '#003366', 
                                color: '#fff', 
                                border: 'none', 
                                borderRadius: '4px', 
                                fontWeight: 'bold', 
                                padding: '10px 20px',
                                opacity: canEdit ? 1 : 0.5,
                                cursor: canEdit ? 'pointer' : 'not-allowed'
                            }}
                        >
                            {canEdit ? (product ? '💾 저장하기' : '🆕 등록하기') : '🚫 권한 없음'}
                        </button>
                    </div>
                </div>
            </div>

            {isSearchOpen && (
                <ProductSearchPopup
                    onClose={() => setIsSearchOpen(false)}
                    onSelect={handleLoadProduct}
                    title="내부 품목 검색 (ItemCode/ProductName)"
                />
            )}

            {isMasterSearchOpen && (
                <ProductSearchPopup
                    onClose={() => setIsMasterSearchOpen(false)}
                    onSelect={handleMasterSelect}
                    initialIsMasterOnly={true}
                    title="기존 마스터 제품 검색 (복제용)"
                />
            )}

            {isBomSearchOpen && (
                <BomMasterSearchModal
                    onSelect={handleBomSelect}
                    onClose={() => setIsBomSearchOpen(false)}
                />
            )}
            {isConfirmOpen && (
                <SaveConfirmModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmSave}
                />
            )}

            {testReportPreview.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 11000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: '#fff', width: '90%', maxWidth: '1000px', height: '90%', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#1a202c' }}>{testReportPreview.name || '성적서 미리보기'}</h3>
                            <button type="button" onClick={() => setTestReportPreview({ open: false, url: '', type: '', name: '' })} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', background: '#f1f5f9' }}>
                            {testReportPreview.type?.includes('image') ? (
                                <img src={testReportPreview.url} alt="Preview" style={{ maxWidth: '100%', objectFit: 'contain' }} />
                            ) : (
                                <iframe src={testReportPreview.url} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Preview" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* BOM 부자재 사진 고화질 라이트박스 확대 뷰어 모달 */}
            {bomPhotoPreview && (
                <div 
                    onClick={() => setBomPhotoPreview(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 99999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px'
                    }}
                >
                    <div 
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '16px',
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                            position: 'relative'
                        }}
                    >
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>
                                📸 {bomPhotoPreview.title || '부자재 패키지 사진'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setBomPhotoPreview(null)}
                                style={{
                                    border: 'none',
                                    background: '#f1f5f9',
                                    borderRadius: '50%',
                                    width: '28px',
                                    height: '28px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    color: '#64748b'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img 
                                src={bomPhotoPreview.url} 
                                alt={bomPhotoPreview.title}
                                style={{
                                    maxWidth: '80vw',
                                    maxHeight: '75vh',
                                    objectFit: 'contain',
                                    borderRadius: '8px'
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDrawer;


