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
    getPackagingMethodImages,
    scanComplianceIngredients,
    evaluateIngredientPrecautions
} from './api';
import * as api from './api';
import { toast } from 'react-toastify';
import ProductSearchPopup from './ProductSearchPopup';
import BomMasterSearchModal from './BomMasterSearchModal';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';
import PackagingMethodTab from './components/dashboard/PackagingMethodTab';
import { calculateAllCountrySpaceRatios, generateOptimizationSuggestions } from './utils/packagingRatioCalculator';
import PackagingViewer3D from './components/PackagingViewer3D';
import {
    calcAllPalletPatterns,
    generateArrangementOptions,
    validateArrangement,
    validateInboxArrangement,
    getPIValues
} from './utils/packingCalculator';

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
        productType: 'PET_REGULAR',
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
    const [channelStickerInfo, setChannelStickerInfo] = useState(null); // { fileUrl, fileType, noteContent }
    const [previewStickerFile, setPreviewStickerFile] = useState(null); // { url, type }
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
        inboxPackingPattern: '',
        outboxPackingPattern: '',
        palletStackingPattern: '',
        popUseYn: 'X',
        popHeight: 15,
        airCapUseYn: 'X',
        cornerPostUseYn: 'X',
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

    const [sim3DTab, setSim3DTab] = useState('outbox'); // 'inbox' | 'outbox' | 'pallet'
    const [pallet3DMode, setPallet3DMode] = useState('pallet-cross'); // 'pallet-cross' | 'pallet-normal'
    const [selectedOutboxArrangement, setSelectedOutboxArrangement] = useState(null);
    const [selectedInboxArrangement, setSelectedInboxArrangement] = useState(null);
    const [selectedPalletPattern, setSelectedPalletPattern] = useState(null);
    const [customOutboxArrangement, setCustomArrangement] = useState({ cols: '', rows: '', layers: '' });
    const [customArrangementValidation, setCustomArrangementValidation] = useState(null);
    const [palletCategoryTab, setPalletCategoryTab] = useState('all'); // 'all' | 'pinwheel' | 'grid' | 'brick'
    const [specBaselineInboxUseYn, setSpecBaselineInboxUseYn] = useState(null);
    const viewer3DRef = useRef(null);
    const [snapshotUploading, setSnapshotUploading] = useState(false);
    const [confirmDialogState, setConfirmDialogState] = useState(null); // { icon, title, message, asIs, toBe, onConfirm }

    useEffect(() => {
        if (product) {
            setSpecBaselineInboxUseYn(null);
        }
    }, [product]);

    useEffect(() => {
        if (currentSpec && currentSpec.inboxUseYn !== undefined && specBaselineInboxUseYn === null) {
            setSpecBaselineInboxUseYn(currentSpec.inboxUseYn || 'X');
        }
    }, [currentSpec.inboxUseYn, specBaselineInboxUseYn]);

    const [spaceRatioResults, setSpaceRatioResults] = useState(null);
    const [spaceRatioLoading, setSpaceRatioLoading] = useState(false);

    // 글로벌 전성분 규제 스캔 상태
    const [complianceResults, setComplianceResults] = useState(null);
    const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
    const [complianceLoading, setComplianceLoading] = useState(false);

    // 함량별 법적 의무 기재 주의사항 평가 상태
    const [precautionResults, setPrecautionResults] = useState(null);
    const [precautionLoading, setPrecautionLoading] = useState(false);

    const triggerEvaluatePrecautions = async (ingredientsList) => {
        const list = ingredientsList || formData.productIngredients || [];
        if (!list || list.length === 0) {
            setPrecautionResults(null);
            return;
        }

        try {
            setPrecautionLoading(true);
            const payload = {
                ingredients: list.map(item => ({
                    korName: item.korName || '',
                    engName: item.engName || '',
                    inciName: item.inciName || '',
                    contentPercent: item.contentPercent ? parseFloat(String(item.contentPercent).replace(/,/g, '')) : null,
                    contentPpm: item.contentPpm ? parseFloat(String(item.contentPpm).replace(/,/g, '')) : null,
                    contentPpb: item.contentPpb ? parseFloat(String(item.contentPpb).replace(/,/g, '')) : null
                })),
                productCategory: 'ALL'
            };
            const res = await evaluateIngredientPrecautions(payload);
            setPrecautionResults(res.data);
        } catch (err) {
            console.error("주의사항 자동 평가 오류:", err);
        } finally {
            setPrecautionLoading(false);
        }
    };

    const handleScanCompliance = async () => {
        const ingredients = formData.productIngredients || [];
        const ingredientsText = formData.ingredients || '';

        let targetText = '';
        if (ingredients.length > 0) {
            targetText = ingredients.map(i => i.korName || i.engName || i.inciName).filter(Boolean).join(', ');
        } else if (ingredientsText.trim()) {
            targetText = ingredientsText.trim();
        }

        if (!targetText) {
            toast.warn("등록된 전성분 데이터가 없습니다. 전성분을 입력하거나 엑셀을 업로드해주세요.");
            return;
        }

        setComplianceLoading(true);
        try {
            const res = await scanComplianceIngredients({
                ingredientsText: targetText,
                countries: ['KR', 'EU', 'US', 'CN', 'JP'],
                productType: 'GENERAL'
            });
            setComplianceResults(res.data);
            setIsComplianceModalOpen(true);
            if (res.data?.compliant) {
                toast.success("글로벌 5개국(KR/EU/US/CN/JP) 규제 검사 결과: 위반 및 금지 성분 없음 (적합)");
            } else {
                toast.warn("주의: 규제 성분 또는 배합한도 주의 항목이 검출되었습니다. 검사 결과를 확인하세요.");
            }
        } catch (err) {
            console.error("규제 검사 스캔 실패:", err);
            toast.error("전성분 규제 스캔 중 오류가 발생했습니다: " + (err.response?.data?.message || err.message));
        } finally {
            setComplianceLoading(false);
        }
    };

    // 1차 본체 용기 제원 상태 (공간비율 정밀 산출용)
    const [primaryContainer, setPrimaryContainer] = useState({

        shape: 'cylinder', // 'cylinder' | 'rect' | 'custom_volume'
        diameter: '',
        width: '',
        depth: '',
        height: '',
        capacity_ml: ''
    });

    // 6개국 실시간 공간비율 계산 함수
    const calculateRealtimeSpaceRatio = (overrideParams = null) => {
        setSpaceRatioLoading(true);
        try {
            let width = overrideParams?.width !== undefined 
                ? parseFloat(overrideParams.width) 
                : (parseFloat(String(formData.dimensions?.width || '').replace(/[^0-9.]/g, '')) || 0);
            let length = overrideParams?.length !== undefined 
                ? parseFloat(overrideParams.length) 
                : (parseFloat(String(formData.dimensions?.length || '').replace(/[^0-9.]/g, '')) || 0);
            let height = overrideParams?.height !== undefined 
                ? parseFloat(overrideParams.height) 
                : (parseFloat(String(formData.dimensions?.height || '').replace(/[^0-9.]/g, '')) || 0);

            // Fallback 1: specComponents에서 단상자 규격 검색 (예: 45*45*135)
            if (width === 0 && length === 0 && height === 0 && specComponents && specComponents.length > 0) {
                const boxItem = specComponents.find(c => 
                    (c.componentName && (c.componentName.includes('단상자') || c.componentName.includes('세트박스') || c.componentName.includes('아웃박스') || c.componentName.includes('박스'))) ||
                    (c.bomCode && (c.bomCode.includes('BOX') || c.bomCode.includes('UBX')))
                );
                if (boxItem && boxItem.sizeDimension) {
                    const parsed = String(boxItem.sizeDimension).split(/[*xX×/]/).map(s => parseFloat(s.replace(/[^0-9.]/g, '')) || 0);
                    if (parsed.length >= 3 && parsed[0] > 0 && parsed[1] > 0 && parsed[2] > 0) {
                        width = parsed[0];
                        length = parsed[1];
                        height = parsed[2];
                    }
                }
            }

            // Fallback 2: inboxInfo
            if (width === 0 && length === 0 && height === 0 && formData.inboxInfo) {
                width = parseFloat(String(formData.inboxInfo.inboxWidth || '').replace(/[^0-9.]/g, '')) || 0;
                length = parseFloat(String(formData.inboxInfo.inboxLength || '').replace(/[^0-9.]/g, '')) || 0;
                height = parseFloat(String(formData.inboxInfo.inboxHeight || '').replace(/[^0-9.]/g, '')) || 0;
            }

            const box = {
                width: !isNaN(width) && width > 0 ? width : 0,
                depth: !isNaN(length) && length > 0 ? length : 0,
                height: !isNaN(height) && height > 0 ? height : 0
            };

            const containers = [];
            if (formData.components && formData.components.length > 0) {
                formData.components.forEach((c, idx) => {
                    const ml = parseFloat(String(c.capacity || '').replace(/[^0-9.]/g, '')) || 0;
                    containers.push({
                        id: idx + 1,
                        name: c.productName || `구성품 ${idx + 1}`,
                        shape: c.shape || 'custom_volume',
                        width: c.width || '',
                        depth: c.length || c.depth || '',
                        height: c.height || '',
                        diameter: c.diameter || '',
                        capacity_ml: ml > 0 ? ml : 0,
                        quantity: parseInt(c.quantity, 10) || 1
                    });
                });
            } else {
                let ml = overrideParams?.capacity !== undefined 
                    ? parseFloat(overrideParams.capacity) 
                    : (parseFloat(String(primaryContainer.capacity_ml || formData.capacity || '').replace(/[^0-9.]/g, '')) || 0);

                const shape = overrideParams?.containerShape || primaryContainer.shape || 'cylinder';
                const diameter = overrideParams?.containerDiameter !== undefined ? overrideParams.containerDiameter : primaryContainer.diameter;
                const cWidth = overrideParams?.containerWidth !== undefined ? overrideParams.containerWidth : primaryContainer.width;
                const cDepth = overrideParams?.containerDepth !== undefined ? overrideParams.containerDepth : primaryContainer.depth;
                const cHeight = overrideParams?.containerHeight !== undefined ? overrideParams.containerHeight : primaryContainer.height;

                containers.push({
                    id: 1,
                    name: formData.productName || '본품 1차 용기',
                    shape: shape,
                    diameter: diameter,
                    width: cWidth,
                    depth: cDepth,
                    height: cHeight,
                    capacity_ml: !isNaN(ml) && ml > 0 ? ml : 0,
                    quantity: 1
                });
            }

            const pName = formData.productName || '';
            const isCleansing = pName.includes('클렌징') || pName.includes('샴푸') || pName.includes('워시') || pName.includes('바디') || pName.includes('비누') || pName.includes('클렌저');
            const isSet = formData.isPlanningSet || formData.productType === '기획세트' || containers.length > 1;
            const cat = overrideParams?.category || (isSet ? 'SET' : (isCleansing ? 'CLEANSING' : 'GENERAL'));

            const calculatedList = calculateAllCountrySpaceRatios({
                secondaryBox: box,
                primaryContainers: containers,
                productCategory: cat,
                chinaKValue: 9.0,
                isElectricDeviceIncluded: false,
                taiwanCValue: 3.1,
                packagingLayers: 2
            });

            setSpaceRatioResults(calculatedList);
        } catch (err) {
            console.error("Space ratio calculation error:", err);
        } finally {
            setSpaceRatioLoading(false);
        }
    };

    // 포장재 정보 및 사양서로부터 2차 단상자 및 1차 용기 치수/용량 동기화 헬퍼
    const handleSyncFromPackagingSpec = () => {
        let boxW = 0, boxL = 0, boxH = 0;
        let contShape = 'cylinder', contDia = 0, contW = 0, contD = 0, contH = 0;
        let cap = 0;

        // 문자열에서 첫 번째 유효 부동소수점/정수만 안전하게 추출하는 파서
        const extractNum = (str) => {
            if (!str) return 0;
            const m = String(str).match(/([0-9]+(?:\.[0-9]+)?)/);
            return m ? parseFloat(m[1]) : 0;
        };

        // 규격 문자열(예: '48*48*140', 'Ø55*145 (24g)', '38 x 38 x 125')을 파싱하여 [W, D, H] 또는 [Ø, H] 추출
        const parseDim = (str) => {
            if (!str) return [];
            const parts = String(str).split(/[*xX×/~]/);
            const nums = [];
            for (const p of parts) {
                const n = extractNum(p);
                if (n > 0) nums.push(n);
            }
            return nums;
        };

        // 1. 단상자 기본 치수 (formData.dimensions) 우선 확인
        if (formData.dimensions?.width && formData.dimensions?.length && formData.dimensions?.height) {
            const dw = extractNum(formData.dimensions.width);
            const dl = extractNum(formData.dimensions.length);
            const dh = extractNum(formData.dimensions.height);
            if (dw > 0 && dl > 0 && dh > 0) {
                boxW = dw;
                boxL = dl;
                boxH = dh;
            }
        }

        // 2. specComponents에서 2차 단상자 및 1차 용기 BOM 규격 정밀 추출
        if (specComponents && specComponents.length > 0) {
            // (1) 2차 단상자 검색 (단상자/단품박스/세트박스/슬리브 - 인박스/아웃박스는 절대 제외)
            const boxItem = specComponents.find(c => {
                const name = c.componentName || '';
                const code = c.bomCode || '';
                const isExcluded = name.includes('아웃') || name.includes('인박스') || name.includes('카톤') || code.includes('OUT') || code.includes('INB');
                const isMatch = name.includes('단상자') || name.includes('단품박스') || name.includes('개별박스') || name.includes('세트박스') || name.includes('슬리브') || code.includes('UBX') || code.includes('UNIT');
                return isMatch && !isExcluded;
            });

            if (boxItem && boxItem.sizeDimension) {
                const parsed = parseDim(boxItem.sizeDimension);
                if (parsed.length >= 3 && parsed[0] > 0 && parsed[1] > 0 && parsed[2] > 0) {
                    boxW = parsed[0];
                    boxL = parsed[1];
                    boxH = parsed[2];
                }
            }

            // (2) 1차 본체 용기 검색 (용기/본체/초자/유리/병/튜브/PET)
            const containerItem = specComponents.find(c => {
                const name = c.componentName || '';
                const code = c.bomCode || '';
                return name.includes('용기') || name.includes('본체') || name.includes('초자') || name.includes('유리') || name.includes('병') || name.includes('튜브') || name.includes('PET') || code.includes('BTL') || code.includes('JAR') || code.includes('TUB') || code.includes('CAN');
            });

            if (containerItem && containerItem.sizeDimension) {
                const dimStr = String(containerItem.sizeDimension);
                const isCylinder = dimStr.includes('Ø') || dimStr.includes('ø') || dimStr.includes('파이') || dimStr.includes('D');
                const parsed = parseDim(dimStr);

                if (isCylinder || parsed.length === 2) {
                    contShape = 'cylinder';
                    contDia = parsed[0] || 0;
                    contH = parsed[1] || 0;
                } else if (parsed.length >= 3) {
                    contShape = 'rect';
                    contW = parsed[0] || 0;
                    contD = parsed[1] || 0;
                    contH = parsed[2] || 0;
                }
            }
        }

        // 3. 내용량 (mL)
        cap = extractNum(formData.capacity);
        if (cap === 0 && formData.components && formData.components.length > 0) {
            cap = formData.components.reduce((sum, c) => sum + extractNum(c.capacity), 0);
        }

        // 4. 단상자 기본값 fallback (내용량 기준 표준 단상자 규격 추정)
        if (boxW === 0 || boxL === 0 || boxH === 0) {
            if (cap >= 100) {
                boxW = 48; boxL = 48; boxH = 140;
            } else if (cap >= 50) {
                boxW = 38; boxL = 38; boxH = 125;
            } else if (cap >= 30) {
                boxW = 34; boxL = 34; boxH = 110;
            } else {
                boxW = 40; boxL = 40; boxH = 120;
            }
        }

        // 5. 1차 용기 기본값 fallback (단상자 치수 기준 직경 및 높이 정밀 추정)
        if ((contDia === 0 && (contW === 0 || contD === 0)) || contH === 0) {
            contShape = 'cylinder';
            contDia = Math.max(10, Math.round(boxW - 3));
            contH = Math.max(10, Math.round(boxH - 5));
        }

        // 상태 업데이트
        setFormData(prev => ({
            ...prev,
            dimensions: {
                ...prev.dimensions,
                width: String(boxW),
                length: String(boxL),
                height: String(boxH)
            },
            capacity: cap > 0 ? String(cap) : prev.capacity
        }));

        setPrimaryContainer({
            shape: contShape,
            diameter: contDia > 0 ? String(contDia) : '',
            width: contW > 0 ? String(contW) : '',
            depth: contD > 0 ? String(contD) : '',
            height: contH > 0 ? String(contH) : '',
            capacity_ml: cap > 0 ? String(cap) : ''
        });

        calculateRealtimeSpaceRatio({
            width: boxW,
            length: boxL,
            height: boxH,
            capacity: cap,
            containerShape: contShape,
            containerDiameter: contDia,
            containerWidth: contW,
            containerDepth: contD,
            containerHeight: contH
        });

        toast.success(`사양서 제원(단상자 ${boxW}×${boxL}×${boxH}mm / 1차용기 ${contShape === 'cylinder' ? `Ø${contDia}×${contH}` : `${contW}×${contD}×${contH}`}mm)이 정확하게 동기화되었습니다.`);
    };

    // 실시간 공간비율 계산 검증 연계
    useEffect(() => {
        if (activeTab === 'spaceRatio') {
            calculateRealtimeSpaceRatio();
        }
    }, [activeTab, formData.dimensions?.width, formData.dimensions?.length, formData.dimensions?.height, formData.capacity, formData.components, formData.productType, formData.isPlanningSet, primaryContainer.shape, primaryContainer.diameter, primaryContainer.width, primaryContainer.depth, primaryContainer.height, primaryContainer.capacity_ml]);

    const [masterMethodImagesForInherit, setMasterMethodImagesForInherit] = useState({ images: [], masterSpecId: null });
    const [packagingMethodImages, setPackagingMethodImages] = useState([]);
    const [specValidationModalState, setSpecValidationModalState] = useState({
        isOpen: false,
        title: '',
        missing3D: [],
        missingMethodImages: false,
        missingSpecs: []
    });
    const packagingMethodSaveRef = useRef(null);
    const packagingMethodReloadRef = useRef(null);
    const packagingMethodInheritRef = useRef(null);

    const getFullFileUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const baseUrl = api.getBaseURL ? api.getBaseURL() : 'http://localhost:8080';
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const fetchChannelStickerInfo = async (channelId) => {
        if (!channelId) {
            setChannelStickerInfo(null);
            return;
        }
        try {
            const res = await api.getChannelSpecialNotes(channelId);
            const notes = res.data?.notes || [];
            const stickerNote = notes.find(n => n.categoryKey === 'CHANNEL_STICKER' || (n.categoryLabel && n.categoryLabel.includes('스티커')));
            if (stickerNote && stickerNote.fileUrl) {
                setChannelStickerInfo({
                    fileUrl: stickerNote.fileUrl,
                    fileType: stickerNote.fileType || (stickerNote.fileUrl.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMAGE'),
                    noteContent: stickerNote.noteContent || ''
                });
            } else {
                setChannelStickerInfo(null);
            }
        } catch (err) {
            console.error('채널 스티커 규정 조회 실패:', err);
            setChannelStickerInfo(null);
        }
    };

    useEffect(() => {
        const rawChan = (formData.channels && formData.channels.length > 0) ? formData.channels[0] : null;
        const channelId = rawChan ? rawChan.id : null;
        if (channelId) {
            fetchChannelStickerInfo(channelId);
        } else {
            setChannelStickerInfo(null);
        }
    }, [formData.channels]);

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

        const expText = channel.expDateFormat ? `LOT(제조번호)\nEXP ${channel.expDateFormat}` : '';
        const uRule = isSet ? (channel.setUnitBoxMarkingRule || channel.unitBoxMarkingRule) : channel.unitBoxMarkingRule;
        const inboxRule = isSet ? channel.setInboxLabelMarkingRule : channel.inboxLabelMarkingRule;
        const outboxRule = isSet ? channel.setOutboxLabelMarkingRule : channel.outboxLabelMarkingRule;
        const palletRule = isSet ? channel.setPalletLabelMarkingRule : channel.palletLabelMarkingRule;

        const cleanRule = uRule ? uRule.replace(/\[생산배치번호\]/g, 'LOT(제조번호)').replace(/생산배치번호/g, 'LOT(제조번호)') : '';
        const markingText = cleanRule
            ? (channel.expDateFormat ? `${cleanRule}\n(표기형식: ${channel.expDateFormat})` : cleanRule)
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
            palletSize: channel.palletSpec || prev.palletSize,
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
            unitBoxMarkingRule: cleanRule || prev.unitBoxMarkingRule || '',
            inboxLabelMarkingRule: inboxRule || prev.inboxLabelMarkingRule || '',
            outboxLabelMarkingRule: outboxRule || prev.outboxLabelMarkingRule || '',
            palletLabelMarkingRule: palletRule || prev.palletLabelMarkingRule || '',
            inboxDateFormat: channel.inboxDateFormat || prev.inboxDateFormat || '',
            outboxDateFormat: channel.outboxDateFormat || prev.outboxDateFormat || '',
            palletDateFormat: channel.palletDateFormat || prev.palletDateFormat || '',
            palletPrecautions: precautions.length > 0 ? precautions.join(' / ') : prev.palletPrecautions,
            inboxUseYn: inboxRequired ? 'O' : 'X',
            inboxTapeMethod: inboxTape,
            inboxTapeBanding: 'N',
            cornerPostUseYn: channel.padAndFrameRequired ? 'O' : 'X'
        }));

        // 유통채널 정보와 연계된 정보는 바로 제품 마스터(formData) 수정에 연동
        setFormData(prev => ({
            ...prev,
            channels: [channel],
            palletInfo: {
                ...prev.palletInfo,
                palletType: channel.palletType || prev.palletInfo?.palletType || '',
                maxStackHeight: maxStack ? parseInt(maxStack, 10) || prev.palletInfo?.maxStackHeight : prev.palletInfo?.maxStackHeight
            }
        }));

        if (channel && channel.id) {
            fetchChannelStickerInfo(channel.id);
        }

        toast.success(`[${channel.name}] (${isSet ? '기획세트' : '단품'}) 유통채널 포장재 규격, 착인기준, 현품표 조건이 제품 마스터 및 사양서에 즉시 연동되었습니다.`);
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

            let autoFilledBoxes = false;

            // 1. 인박스 입수 규격 미입력 시 3D 시뮬레이션 계산 규격 자동 보정 (인박스 사용 시)
            if (specToSave.inboxUseYn === 'O') {
                const uBox = get3DUnitBoxDims();
                const iBox = get3DInboxDims();
                const inboxQtyVal = parseInt(specToSave.inboxQty || 10, 10) || 10;
                const inboxOptions = generateArrangementOptions(inboxQtyVal, 5, uBox, iBox);
                const bestInboxOpt = selectedInboxArrangement || inboxOptions.find(o => o.status === 'ok') || inboxOptions[0] || { cols: 2, rows: 5, layers: 1, qty: 10 };

                if (!specToSave.inboxQty) {
                    specToSave.inboxQty = bestInboxOpt.qty || 10;
                    autoFilledBoxes = true;
                }
                if (!specToSave.inboxSize) {
                    specToSave.inboxSize = `${iBox.w}x${iBox.d}x${iBox.h}`;
                    autoFilledBoxes = true;
                }
                if (!specToSave.inboxPackingPattern) {
                    specToSave.inboxPackingPattern = `${bestInboxOpt.cols}열×${bestInboxOpt.rows}행×${bestInboxOpt.layers}단 (${bestInboxOpt.qty}개입)`;
                    autoFilledBoxes = true;
                }
            }

            // 2. 아웃박스 입수 규격 미입력 시 3D 시뮬레이션 계산 규격 자동 보정
            const hasInboxForSave = specToSave.inboxUseYn === 'O';
            const uBoxForSave = get3DUnitBoxDims();
            const iBoxForSave = get3DInboxDims();
            const oBoxForSave = get3DOutboxDims();
            const totalProductQtyForSave = parseInt(specToSave.outboxQty || specToSave.outboxTotalQty || 40, 10) || 40;
            const curInboxQtyForSave = parseInt(specToSave.inboxQty || 10, 10) || 10;
            const outboxInboxesQtyForSave = hasInboxForSave ? Math.max(1, Math.round(totalProductQtyForSave / curInboxQtyForSave)) : totalProductQtyForSave;
            const outboxUnitBoxForSave = hasInboxForSave ? iBoxForSave : uBoxForSave;
            const outboxOptionsForSave = generateArrangementOptions(outboxInboxesQtyForSave, 5, outboxUnitBoxForSave, oBoxForSave);
            const bestOutboxOpt = selectedOutboxArrangement || outboxOptionsForSave.find(o => o.status === 'ok') || outboxOptionsForSave[0] || (hasInboxForSave ? { cols: 2, rows: 2, layers: 1, qty: 4 } : { cols: 4, rows: 5, layers: 2, qty: 40 });

            if (!specToSave.outboxQty && !specToSave.outboxTotalQty) {
                const calcOutQty = hasInboxForSave ? (bestOutboxOpt.qty * curInboxQtyForSave) : bestOutboxOpt.qty;
                specToSave.outboxQty = calcOutQty;
                specToSave.outboxTotalQty = calcOutQty;
                autoFilledBoxes = true;
            }
            if (!specToSave.outboxSize) {
                specToSave.outboxSize = `${oBoxForSave.w}x${oBoxForSave.d}x${oBoxForSave.h}`;
                autoFilledBoxes = true;
            }
            if (!specToSave.outboxPackingPattern) {
                const calcOutQty = hasInboxForSave ? (bestOutboxOpt.qty * curInboxQtyForSave) : bestOutboxOpt.qty;
                specToSave.outboxPackingPattern = hasInboxForSave
                    ? `${bestOutboxOpt.cols}열×${bestOutboxOpt.rows}행×${bestOutboxOpt.layers}단 (인박스 ${bestOutboxOpt.qty}박스입, 총 ${calcOutQty}개)`
                    : `${bestOutboxOpt.cols}열×${bestOutboxOpt.rows}행×${bestOutboxOpt.layers}단 (${bestOutboxOpt.qty}개입)`;
                autoFilledBoxes = true;
            }

            if (autoFilledBoxes) {
                toast.info("📦 인박스/아웃박스 입수 규격이 미입력되어 있어, 현재 3D 시뮬레이션 계산 규격으로 자동 입력 및 저장되었습니다.");
            }

            // 3. 팔레트 사양 자동 확정 연동 (미저장 패턴 자동 채움)
            if (!specToSave.palletStackingPattern && selectedPalletPattern) {
                specToSave.palletStackingPattern = `${selectedPalletPattern.name} (${pallet3DMode === 'pallet-cross' ? '교차적재' : '일반적재'})`;
            }
            if (!specToSave.palletTierQty && selectedPalletPattern?.count) {
                specToSave.palletTierQty = selectedPalletPattern.count;
            }
            if (specToSave.palletTierQty && specToSave.palletTierCount && !specToSave.palletTotalOutboxQty) {
                specToSave.palletTotalOutboxQty = parseInt(specToSave.palletTierQty) * parseInt(specToSave.palletTierCount);
            }

            const dynamicPalletWt = calcPalletWeight(specToSave, formData);
            if (dynamicPalletWt) {
                specToSave.onePalletWeight = dynamicPalletWt;
            }

            // 현재 활성화된 3D 뷰어의 회전/확대 시점 정보 동기화
            if (viewer3DRef.current?.getViewConfig) {
                const curCfg = viewer3DRef.current.getViewConfig();
                if (curCfg) {
                    const cfgStr = JSON.stringify(curCfg);
                    if (sim3DTab === 'inbox') specToSave.inboxViewConfig = cfgStr;
                    else if (sim3DTab === 'outbox') specToSave.outboxViewConfig = cfgStr;
                    else specToSave.palletViewConfig = cfgStr;
                }
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

    const handleAutoGenerateRevision = () => {
        const nextNo = (specRevisions.length > 0 ? Math.max(...specRevisions.map(r => r.revisionNo || 0)) : 0) + 1;
        const outW = formData.outboxInfo?.outboxWidth || '0';
        const outL = formData.outboxInfo?.outboxLength || '0';
        const outH = formData.outboxInfo?.outboxHeight || '0';
        const outQty = formData.outboxInfo?.outboxQuantity || '0';
        const palPat = selectedPalletPattern?.name || '기본 적재';
        const palLayers = customOutboxArrangement?.layers || '0';

        const autoSummary = `[사양변경] 아웃박스(${outW}x${outL}x${outH}mm, ${outQty}ea) / 팔레트(${palPat}, ${palLayers}단)`;

        setSpecRevisions([...specRevisions, {
            revisionNo: nextNo,
            content: autoSummary,
            revisionDate: new Date().toISOString().substring(0, 10),
            revisionAuthor: user?.name || user?.username || ''
        }]);
        toast.info(`개정 이력 ${nextNo}번(현재 포장 제원 자동 요약)이 추가되었습니다.`);
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

    // ── 3D 입수 규격 파싱 및 포맷팅 유틸 ──
    const parseArrangementPattern = (str) => {
        if (!str || typeof str !== 'string') return null;
        const clean = str.trim().replace(/\s+/g, '');
        const match = clean.match(/(\d+)(?:열|[xX*×/])(\d+)(?:행|[xX*×/])?(\d+)?(?:단)?/);
        if (match) {
            const cols = parseInt(match[1], 10) || 1;
            const rows = parseInt(match[2], 10) || 1;
            const layers = match[3] ? (parseInt(match[3], 10) || 1) : 1;
            return { cols, rows, layers, qty: cols * rows * layers };
        }
        const parts = clean.split(/[xX*×/]/).map(s => parseInt(s.replace(/\D/g, ''), 10)).filter(n => !isNaN(n) && n > 0);
        if (parts.length === 2) return { cols: parts[0], rows: parts[1], layers: 1, qty: parts[0] * parts[1] };
        if (parts.length >= 3) return { cols: parts[0], rows: parts[1], layers: parts[2], qty: parts[0] * parts[1] * parts[2] };
        return null;
    };

    // ── 3D 치수 파싱 및 스냅샷 유틸 ──
    const get3DUnitBoxDims = () => {
        let w = parseFloat(formData.dimensions?.width) || 0;
        let d = parseFloat(formData.dimensions?.length) || 0;
        let h = parseFloat(formData.dimensions?.height) || 0;
        if (w === 0 && d === 0 && h === 0 && specComponents && specComponents.length > 0) {
            const boxComp = specComponents.find(c => c.componentName?.includes('단상자') || c.bomCode?.includes('BOX'));
            if (boxComp?.sizeDimension) {
                const parts = String(boxComp.sizeDimension).split(/[*xX×/]/).map(s => parseFloat(s.replace(/[^0-9.]/g, '')) || 0);
                if (parts.length >= 3) { w = parts[0]; d = parts[1]; h = parts[2]; }
            }
        }
        return { w: w || 70, d: d || 40, h: h || 140 };
    };

    const get3DOutboxDims = () => {
        const str = currentSpec.outboxSize || (formData.outboxInfo?.outboxLength && `${formData.outboxInfo.outboxLength}x${formData.outboxInfo.outboxWidth}x${formData.outboxInfo.outboxHeight}`);
        if (str) {
            const parts = String(str).toLowerCase().replace(/mm/g, '').replace(/,/g, '').split(/[x*×]/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
            if (parts.length >= 3) return { w: parts[0], d: parts[1], h: parts[2] };
        }
        return { w: 300, d: 200, h: 150 };
    };

    const get3DInboxDims = () => {
        const str = currentSpec.inboxSize || (formData.inboxInfo?.inboxWidth && `${formData.inboxInfo.inboxWidth}x${formData.inboxInfo.inboxLength}x${formData.inboxInfo.inboxHeight}`);
        if (str) {
            const parts = String(str).toLowerCase().replace(/mm/g, '').replace(/,/g, '').split(/[x*×]/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
            if (parts.length >= 3) return { w: parts[0], d: parts[1], h: parts[2] };
        }
        return { w: 150, d: 100, h: 145 };
    };

    const get3DPalletDims = () => {
        const str = currentSpec.palletSpec || currentSpec.palletSize || formData?.channels?.[0]?.palletSpec || (formData.palletInfo?.palletWidth && `${formData.palletInfo.palletWidth}x${formData.palletInfo.palletLength}`);
        if (str) {
            const match = String(str).match(/(\d{1,4}(?:,\d{3})*|\d{3,4})\s*[*xX×/]\s*(\d{1,4}(?:,\d{3})*|\d{3,4})/);
            if (match) {
                const w = parseFloat(match[1].replace(/,/g, ''));
                const d = parseFloat(match[2].replace(/,/g, ''));
                if (w > 300 && d > 300) return { w, d };
            }
        }
        return { w: 1100, d: 1100 };
    };

    const formatPalletTypeDisplay = () => {
        const spec = currentSpec.palletSpec || currentSpec.palletSize || formData?.channels?.[0]?.palletSpec;
        const type = currentSpec.palletTypeStr || formData?.channels?.[0]?.palletType || formData.palletInfo?.palletType;
        if (spec) {
            if (type && !spec.includes(type) && !spec.includes('(')) {
                return `${type} (${spec})`;
            }
            return spec;
        }
        if (type) {
            const dim = (formData.palletInfo?.palletLength && `${formData.palletInfo.palletLength}×${formData.palletInfo.palletWidth}mm`) || '';
            return dim ? `${type} (${dim})` : type;
        }
        return '';
    };

    const handleUpdateInboxDimensions = (dimKey, rawVal) => {
        const val = rawVal === '' ? '' : Math.max(1, parseInt(rawVal, 10) || 1);
        setCurrentSpec(prev => {
            const curParsed = parseArrangementPattern(prev.inboxPackingPattern) || { cols: 1, rows: 1, layers: 1 };
            const cols = dimKey === 'cols' ? val : (prev.inboxPackingCols !== undefined && prev.inboxPackingCols !== '' ? prev.inboxPackingCols : curParsed.cols);
            const rows = dimKey === 'rows' ? val : (prev.inboxPackingRows !== undefined && prev.inboxPackingRows !== '' ? prev.inboxPackingRows : curParsed.rows);
            const layers = dimKey === 'layers' ? val : (prev.inboxPackingLayers !== undefined && prev.inboxPackingLayers !== '' ? prev.inboxPackingLayers : curParsed.layers);

            const updated = {
                ...prev,
                inboxPackingCols: cols,
                inboxPackingRows: rows,
                inboxPackingLayers: layers
            };

            if (cols && rows && layers) {
                const numCols = parseInt(cols, 10);
                const numRows = parseInt(rows, 10);
                const numLayers = parseInt(layers, 10);
                const inQ = numCols * numRows * numLayers;
                const patternStr = `${numCols}열×${numRows}행×${numLayers}단 (${inQ}개입)`;
                updated.inboxPackingPattern = patternStr;
                updated.inboxQty = inQ;
                setSelectedInboxArrangement({ cols: numCols, rows: numRows, layers: numLayers, qty: inQ });

                let obInQ = parseInt(prev.outboxInboxQty || 0);
                if (obInQ <= 0) {
                    obInQ = 1;
                    updated.outboxInboxQty = 1;
                }
                const tQty = parseInt(prev.palletTierQty || 0);
                const tCount = parseInt(prev.palletTierCount || 0);
                const totalOutboxes = (tQty * tCount) || parseInt(prev.palletTotalOutboxQty || 0) || 0;
                const totalQ = inQ * obInQ;
                updated.outboxTotalQty = totalQ;
                updated.outboxQty = totalQ;
                updated.palletTotalProductQty = totalOutboxes * totalQ;
                updated.onePalletWeight = calcPalletWeight(updated, formData);
            }
            return updated;
        });
    };

    const handleUpdateOutboxDimensions = (dimKey, rawVal, hasInbox) => {
        const val = rawVal === '' ? '' : Math.max(1, parseInt(rawVal, 10) || 1);
        setCurrentSpec(prev => {
            const curParsed = parseArrangementPattern(prev.outboxPackingPattern) || { cols: 1, rows: 1, layers: 1 };
            const cols = dimKey === 'cols' ? val : (prev.outboxPackingCols !== undefined && prev.outboxPackingCols !== '' ? prev.outboxPackingCols : curParsed.cols);
            const rows = dimKey === 'rows' ? val : (prev.outboxPackingRows !== undefined && prev.outboxPackingRows !== '' ? prev.outboxPackingRows : curParsed.rows);
            const layers = dimKey === 'layers' ? val : (prev.outboxPackingLayers !== undefined && prev.outboxPackingLayers !== '' ? prev.outboxPackingLayers : curParsed.layers);

            const updated = {
                ...prev,
                outboxPackingCols: cols,
                outboxPackingRows: rows,
                outboxPackingLayers: layers
            };

            if (cols && rows && layers) {
                const numCols = parseInt(cols, 10);
                const numRows = parseInt(rows, 10);
                const numLayers = parseInt(layers, 10);
                const optQty = numCols * numRows * numLayers;
                setSelectedOutboxArrangement({ cols: numCols, rows: numRows, layers: numLayers, qty: optQty });

                const tQty = parseInt(prev.palletTierQty || 0);
                const tCount = parseInt(prev.palletTierCount || 0);
                const totalOutboxes = (tQty * tCount) || parseInt(prev.palletTotalOutboxQty || 0) || 0;

                if (hasInbox) {
                    let inQ = parseInt(prev.inboxQty || 0);
                    if (inQ <= 0) {
                        inQ = 1;
                        updated.inboxQty = 1;
                    }
                    const totalQ = inQ * optQty;
                    updated.outboxInboxQty = optQty;
                    updated.outboxPackingPattern = `${numCols}열×${numRows}행×${numLayers}단 (인박스 ${optQty}박스입, 총 ${totalQ}개)`;
                    updated.outboxTotalQty = totalQ;
                    updated.outboxQty = totalQ;
                    updated.palletTotalProductQty = totalOutboxes * totalQ;
                } else {
                    updated.outboxPackingPattern = `${numCols}열×${numRows}행×${numLayers}단 (${optQty}개입)`;
                    updated.outboxQty = optQty;
                    updated.outboxTotalQty = optQty;
                    updated.palletTotalProductQty = totalOutboxes * optQty;
                }
                updated.onePalletWeight = calcPalletWeight(updated, formData);
            }
            return updated;
        });
    };

    const handleSave3DSnapshot = async (dataUrl, mode) => {
        if (!currentSpec?.id) {
            toast.warn("사양서를 먼저 한 번 저장한 후 3D 도면을 확정할 수 있습니다.");
            return;
        }
        const normalizedMode = mode.startsWith('pallet') ? 'pallet' : mode;
        if (normalizedMode === 'pallet') {
            const tierQty = parseInt(currentSpec?.palletTierQty || 0, 10);
            const tierCount = parseInt(currentSpec?.palletTierCount || 0, 10);
            if (tierQty <= 0 || tierCount <= 0) {
                toast.warn("🧱 팔레트 적재 사양(1단 적재 수량 및 총 적재 단수)을 먼저 입력해야 팔레트 3D 도면을 확정 저장할 수 있습니다.");
                return;
            }
        }
        try {
            setSnapshotUploading(true);
            const viewConfig = viewer3DRef.current?.getViewConfig?.();
            const viewConfigStr = viewConfig ? JSON.stringify(viewConfig) : null;

            const res = await api.uploadPackagingSpec3DSnapshot(currentSpec.id, normalizedMode, dataUrl, viewConfigStr);
            const savedPath = res.data?.imagePath;
            if (savedPath) {
                if (normalizedMode === 'inbox') {
                    setCurrentSpec(prev => ({ 
                        ...prev, 
                        inboxLayoutImage: savedPath,
                        inboxViewConfig: viewConfigStr || prev.inboxViewConfig
                    }));
                } else if (normalizedMode === 'outbox') {
                    setCurrentSpec(prev => ({ 
                        ...prev, 
                        outboxLayoutImageFile: savedPath, 
                        outboxLayoutImage: savedPath,
                        outboxViewConfig: viewConfigStr || prev.outboxViewConfig
                    }));
                } else {
                    setCurrentSpec(prev => ({ 
                        ...prev, 
                        palletLayoutImage: savedPath,
                        palletViewConfig: viewConfigStr || prev.palletViewConfig
                    }));
                }
                toast.success(`📸 ${normalizedMode === 'inbox' ? '인박스' : normalizedMode === 'outbox' ? '아웃박스' : '팔레트'} 3D 도면이 확정 저장되었습니다! (엑셀 출력 100% 반영)`);
            }
        } catch (err) {
            toast.error("3D 도면 저장 중 오류가 발생했습니다.");
            console.error(err);
        } finally {
            setSnapshotUploading(false);
        }
    };

    const handleCaptureCurrent3D = (mode) => {
        const normalizedMode = mode.startsWith('pallet') ? 'pallet' : mode;
        if (normalizedMode === 'pallet') {
            const tierQty = parseInt(currentSpec?.palletTierQty || 0, 10);
            const tierCount = parseInt(currentSpec?.palletTierCount || 0, 10);
            if (tierQty <= 0 || tierCount <= 0) {
                toast.warn("🧱 팔레트 적재 사양(1단 적재 수량 및 총 적재 단수)을 먼저 입력해야 팔레트 3D 도면을 확정 저장할 수 있습니다.");
                return;
            }
        }

        const curConfirmedImage = normalizedMode === 'inbox' 
            ? currentSpec.inboxLayoutImage 
            : (normalizedMode === 'outbox' ? (currentSpec.outboxLayoutImageFile || currentSpec.outboxLayoutImage) : currentSpec.palletLayoutImage);

        const doCapture = () => {
            if (!viewer3DRef.current?.capture) {
                toast.warn("3D 뷰어가 아직 준비되지 않았습니다.");
                return;
            }
            try {
                viewer3DRef.current.capture();
            } catch (e) {
                console.error(e);
                toast.error("3D 스냅샷 캡처 중 오류가 발생했습니다.");
            }
        };

        if (curConfirmedImage) {
            setConfirmDialogState({
                icon: '📸',
                title: '확정 도면 수정 확인',
                message: '이미 확정된 3D 도면이 존재합니다.\n현재 3D 화면으로 정말 수정하시겠습니까?',
                onConfirm: doCapture
            });
        } else {
            doCapture();
        }
    };

    const handleBatchSave3DSnapshots = async (forceAll = false) => {
        if (!currentSpec?.id) {
            toast.warn("사양서를 먼저 한 번 저장한 후 3D 도면을 일괄 확정할 수 있습니다.");
            return;
        }
        const hasInbox = currentSpec.inboxUseYn === 'O';
        const tierQty = parseInt(currentSpec?.palletTierQty || 0, 10);
        const tierCount = parseInt(currentSpec?.palletTierCount || 0, 10);
        if (tierQty <= 0 || tierCount <= 0) {
            toast.warn("🧱 팔레트 적재 사양(1단 적재 수량 및 총 적재 단수)을 먼저 입력해야 팔레트 도면을 포함하여 일괄 저장할 수 있습니다.");
            return;
        }

        const modesToSave = [];
        if (hasInbox && (forceAll || !currentSpec.inboxLayoutImage)) modesToSave.push('inbox');
        if (forceAll || !(currentSpec.outboxLayoutImageFile || currentSpec.outboxLayoutImage)) modesToSave.push('outbox');
        if (forceAll || !currentSpec.palletLayoutImage) modesToSave.push('pallet');

        if (modesToSave.length === 0) {
            toast.info("이미 모든 3D 도면(인박스, 아웃박스, 팔레트)이 확정 저장되어 있습니다.");
            return;
        }

        try {
            setSnapshotUploading(true);
            const originalTab = sim3DTab;
            const updatedImages = {};

            for (let i = 0; i < modesToSave.length; i++) {
                const targetMode = modesToSave[i];
                const modeLabel = targetMode === 'inbox' ? '인박스' : targetMode === 'outbox' ? '아웃박스' : '팔레트';
                toast.info(`📸 3D 도면 일괄 저장 중... (${i + 1}/${modesToSave.length}) - [${modeLabel}]`, { autoClose: 1200 });
                
                setSim3DTab(targetMode);
                // 3D 씬 및 캔버스 렌더링 동기화 대기
                await new Promise(r => setTimeout(r, 450));

                if (viewer3DRef.current?.capture) {
                    const dataUrl = viewer3DRef.current.capture();
                    if (dataUrl) {
                        const viewConfig = viewer3DRef.current?.getViewConfig?.();
                        const viewConfigStr = viewConfig ? JSON.stringify(viewConfig) : null;
                        const res = await api.uploadPackagingSpec3DSnapshot(currentSpec.id, targetMode, dataUrl, viewConfigStr);
                        const savedPath = res.data?.imagePath;
                        if (savedPath) {
                            if (targetMode === 'inbox') updatedImages.inboxLayoutImage = savedPath;
                            else if (targetMode === 'outbox') {
                                updatedImages.outboxLayoutImageFile = savedPath;
                                updatedImages.outboxLayoutImage = savedPath;
                            } else updatedImages.palletLayoutImage = savedPath;
                        }
                    }
                }
            }

            setCurrentSpec(prev => ({
                ...prev,
                ...updatedImages
            }));

            setSim3DTab(originalTab);
            toast.success(`🎉 ${modesToSave.length}개 3D 도면이 성공적으로 일괄 확정 저장되었습니다! (엑셀 출력 100% 반영)`);
            
            // 검증 모달이 열려있었다면 닫기
            setSpecValidationModalState(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
            console.error("일괄 3D 도면 저장 실패:", err);
            toast.error("3D 도면 일괄 저장 중 오류가 발생했습니다.");
        } finally {
            setSnapshotUploading(false);
        }
    };

    const handleDirectImageUpload = async (file, mode) => {
        if (!file) return;
        const curConfirmedImage = mode === 'inbox' 
            ? currentSpec.inboxLayoutImage 
            : (mode === 'outbox' ? (currentSpec.outboxLayoutImageFile || currentSpec.outboxLayoutImage) : currentSpec.palletLayoutImage);

        const doUpload = async () => {
            if (!currentSpec?.id) {
                toast.warn("사양서를 먼저 한 번 저장한 후 도면 이미지를 등록할 수 있습니다.");
                return;
            }
            try {
                setSnapshotUploading(true);
                const uploadRes = await uploadFile(file, formData.productName || 'pkg-spec');
                const fileUrl = uploadRes.data?.fileUrl || uploadRes.data?.url || uploadRes.data;
                if (fileUrl) {
                    const normalizedMode = mode.startsWith('pallet') ? 'pallet' : mode;
                    if (normalizedMode === 'inbox') {
                        setCurrentSpec(prev => ({ ...prev, inboxLayoutImage: fileUrl }));
                    } else if (normalizedMode === 'outbox') {
                        setCurrentSpec(prev => ({ ...prev, outboxLayoutImageFile: fileUrl, outboxLayoutImage: fileUrl }));
                    } else {
                        setCurrentSpec(prev => ({ ...prev, palletLayoutImage: fileUrl }));
                    }
                    toast.success(`📁 ${normalizedMode === 'inbox' ? '인박스' : normalizedMode === 'outbox' ? '아웃박스' : '팔레트'} 도면 이미지가 등록되었습니다. (사양서 저장 필요)`);
                }
            } catch (err) {
                console.error(err);
                toast.error("도면 이미지 업로드에 실패했습니다.");
            } finally {
                setSnapshotUploading(false);
            }
        };

        if (curConfirmedImage) {
            setConfirmDialogState({
                icon: '📁',
                title: '확정 도면 변경 확인',
                message: '이미 확정된 3D 도면이 존재합니다.\n새 파일로 정말 수정하시겠습니까?',
                onConfirm: doUpload
            });
        } else {
            doUpload();
        }
    };

    const handleRemoveConfirmedImage = (mode) => {
        setConfirmDialogState({
            icon: '🔄',
            title: '자동 모드 복원 확인',
            message: '확정된 도면을 해제하고 자동 3D 모드로 정말 복원하시겠습니까?',
            onConfirm: () => {
                const normalizedMode = mode.startsWith('pallet') ? 'pallet' : mode;
                if (normalizedMode === 'inbox') {
                    setCurrentSpec(prev => ({ ...prev, inboxLayoutImage: null }));
                } else if (normalizedMode === 'outbox') {
                    setCurrentSpec(prev => ({ ...prev, outboxLayoutImageFile: null, outboxLayoutImage: null }));
                } else {
                    setCurrentSpec(prev => ({ ...prev, palletLayoutImage: null }));
                }
                toast.info(`🔄 ${normalizedMode === 'inbox' ? '인박스' : normalizedMode === 'outbox' ? '아웃박스' : '팔레트'} 도면이 자동 3D 모드로 복원되었습니다. (사양서 저장 시 적용)`);
            }
        });
    };

    const handleSelectInboxArrangementWithConfirm = (opt, curArrangement) => {
        const toBe = `${opt.cols}열×${opt.rows}행×${opt.layers}단 (${opt.qty}개입)`;
        const curPattern = currentSpec.inboxPackingPattern;
        const asIs = curPattern || (curArrangement ? `${curArrangement.cols}열×${curArrangement.rows}행×${curArrangement.layers}단 (${curArrangement.qty}개입)` : null);

        const uBox = get3DUnitBoxDims();
        const iBox = get3DInboxDims();

        const vToBe = validateInboxArrangement(uBox, iBox, opt, { w: 0, d: 0, h: 0 });
        const toBeStatus = vToBe.status === 'ok' ? { label: '✓ 적합', bg: '#dcfce7', color: '#15803d', border: '#86efac' }
            : (vToBe.status === 'warn' ? { label: '⚠️ 주의', bg: '#fef3c7', color: '#b45309', border: '#fde68a' }
            : { label: '✕ 초과(부적합)', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' });

        let asIsStatus = { label: '✓ 적합', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
        if (curArrangement) {
            const vAsIs = validateInboxArrangement(uBox, iBox, curArrangement, { w: 0, d: 0, h: 0 });
            asIsStatus = vAsIs.status === 'ok' ? { label: '✓ 적합', bg: '#dcfce7', color: '#15803d', border: '#86efac' }
                : (vAsIs.status === 'warn' ? { label: '⚠️ 주의', bg: '#fef3c7', color: '#b45309', border: '#fde68a' }
                : { label: '✕ 초과(부적합)', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' });
        }

        const applyOpt = () => {
            setSelectedInboxArrangement(opt);
            setCurrentSpec(prev => {
                const updated = {
                    ...prev,
                    inboxPackingPattern: toBe,
                    inboxPackingCols: opt.cols,
                    inboxPackingRows: opt.rows,
                    inboxPackingLayers: opt.layers,
                    inboxQty: opt.qty
                };
                if (prev.outboxInboxQty) {
                    updated.outboxTotalQty = opt.qty * parseInt(prev.outboxInboxQty);
                    updated.outboxQty = updated.outboxTotalQty;
                }
                return updated;
            });
        };

        if (asIs && asIs !== toBe && (curPattern || selectedInboxArrangement)) {
            setConfirmDialogState({
                icon: '📥',
                title: '인박스 입수 규격 변경 확인',
                message: '인박스 입수 규격을 변경하시겠습니까?',
                asIs: asIs,
                asIsStatus: asIsStatus,
                toBe: toBe,
                toBeStatus: toBeStatus,
                onConfirm: applyOpt
            });
        } else {
            applyOpt();
        }
    };

    const handleSelectOutboxArrangementWithConfirm = (opt, curArrangement, hasInbox, inboxQty) => {
        const toBe = hasInbox 
            ? `${opt.cols}열×${opt.rows}행×${opt.layers}단 (인박스 ${opt.qty}박스입, 총 ${opt.qty * inboxQty}개)`
            : `${opt.cols}열×${opt.rows}행×${opt.layers}단 (${opt.qty}개입)`;
        
        const curPattern = currentSpec.outboxPackingPattern;
        const asIs = curPattern || (curArrangement ? (hasInbox ? `${curArrangement.cols}열×${curArrangement.rows}행×${curArrangement.layers}단 (인박스 ${curArrangement.qty}박스입)` : `${curArrangement.cols}열×${curArrangement.rows}행×${curArrangement.layers}단 (${curArrangement.qty}개입)`) : null);

        const uBox = get3DUnitBoxDims();
        const iBox = get3DInboxDims();
        const oBox = get3DOutboxDims();
        const outboxUnitBox = hasInbox ? iBox : uBox;
        const outboxContainerBox = oBox;

        const vToBe = validateArrangement(outboxUnitBox, outboxContainerBox, opt, { w: 0, d: 0, h: 0 });
        const toBeStatus = vToBe.status === 'ok' ? { label: '✓ 적합', bg: '#dcfce7', color: '#15803d', border: '#86efac' }
            : (vToBe.status === 'warn' ? { label: '⚠️ 주의', bg: '#fef3c7', color: '#b45309', border: '#fde68a' }
            : { label: '✕ 초과(부적합)', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' });

        let asIsStatus = { label: '✓ 적합', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
        if (curArrangement) {
            const vAsIs = validateArrangement(outboxUnitBox, outboxContainerBox, curArrangement, { w: 0, d: 0, h: 0 });
            asIsStatus = vAsIs.status === 'ok' ? { label: '✓ 적합', bg: '#dcfce7', color: '#15803d', border: '#86efac' }
                : (vAsIs.status === 'warn' ? { label: '⚠️ 주의', bg: '#fef3c7', color: '#b45309', border: '#fde68a' }
                : { label: '✕ 초과(부적합)', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' });
        }

        const applyOpt = () => {
            setSelectedOutboxArrangement(opt);
            setCurrentSpec(prev => {
                const updated = {
                    ...prev,
                    outboxPackingPattern: toBe,
                    outboxPackingCols: opt.cols,
                    outboxPackingRows: opt.rows,
                    outboxPackingLayers: opt.layers
                };
                if (hasInbox) {
                    updated.outboxInboxQty = opt.qty;
                    if (prev.inboxQty) {
                        updated.outboxTotalQty = opt.qty * parseInt(prev.inboxQty);
                        updated.outboxQty = updated.outboxTotalQty;
                    }
                } else {
                    updated.outboxQty = opt.qty;
                    updated.outboxTotalQty = opt.qty;
                }
                return updated;
            });
        };

        if (asIs && asIs !== toBe && (curPattern || selectedOutboxArrangement)) {
            setConfirmDialogState({
                icon: '📦',
                title: '아웃박스 입수 규격 변경 확인',
                message: '아웃박스 입수 규격을 변경하시겠습니까?',
                asIs: asIs,
                asIsStatus: asIsStatus,
                toBe: toBe,
                toBeStatus: toBeStatus,
                onConfirm: applyOpt
            });
        } else {
            applyOpt();
        }
    };

    const handleSelectPalletPatternWithConfirm = (pat, pallet3DMode, palletStacks, totalProductQty) => {
        const totalBoxes = pat.count * palletStacks;
        const totalProd = totalBoxes * totalProductQty;
        const toBe = `${pat.name} (${pallet3DMode === 'pallet-cross' ? '교차적재' : '일반적재'})`;
        const asIs = currentSpec.palletStackingPattern || null;

        const toBeStatus = pat.status === 'ok' ? { label: pat.statusLabel || '✓ 적합', bg: '#dcfce7', color: '#15803d', border: '#86efac' }
            : (pat.status === 'warn' ? { label: pat.statusLabel || '⚠️ 주의', bg: '#fef3c7', color: '#b45309', border: '#fde68a' }
            : { label: pat.statusLabel || '✕ 돌출초과', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' });

        let asIsStatus = { label: '✓ 적합', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
        if (selectedPalletPattern) {
            asIsStatus = selectedPalletPattern.status === 'ok' ? { label: selectedPalletPattern.statusLabel || '✓ 적합', bg: '#dcfce7', color: '#15803d', border: '#86efac' }
                : (selectedPalletPattern.status === 'warn' ? { label: selectedPalletPattern.statusLabel || '⚠️ 주의', bg: '#fef3c7', color: '#b45309', border: '#fde68a' }
                : { label: selectedPalletPattern.statusLabel || '✕ 돌출초과', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' });
        }

        const applyPat = () => {
            setSelectedPalletPattern(pat);
            setCurrentSpec(prev => {
                const updated = {
                    ...prev,
                    palletTierQty: pat.count,
                    palletStackingPattern: toBe,
                    palletTotalOutboxQty: totalBoxes,
                    palletTotalProductQty: totalProd
                };
                updated.onePalletWeight = calcPalletWeight(updated, formData);
                return updated;
            });
        };

        if (asIs && asIs !== toBe && (currentSpec.palletStackingPattern || selectedPalletPattern)) {
            setConfirmDialogState({
                icon: '🏗️',
                title: '팔레트 적재 패턴 변경 확인',
                message: '팔레트 적재 패턴을 변경하시겠습니까?',
                asIs: asIs,
                asIsStatus: asIsStatus,
                toBe: `${toBe} (1단 ${pat.count}박스)`,
                toBeStatus: toBeStatus,
                onConfirm: applyPat
            });
        } else {
            applyPat();
        }
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

    // 🎁 기획세트 구성품(단품) 연결 BOM 일괄 취합 핸들러
    const handleFetchComponentsBom = async () => {
        const comps = formData.components || [];
        if (comps.length === 0) {
            toast.warning("기획세트에 등록된 구성품(단품)이 없습니다. 먼저 '상세 정보' 탭의 구성품 관리에서 단품을 추가해 주세요.");
            return;
        }

        try {
            toast.info("🎁 기획세트 구성품들의 포장 부자재 BOM 목록을 조회 중입니다...");
            const res = await api.aggregateBomByComponents(comps);
            const aggregated = res.data;
            const bomList = Array.isArray(aggregated) ? aggregated : (aggregated?.data && Array.isArray(aggregated.data) ? aggregated.data : []);

            if (bomList.length === 0) {
                toast.warning("등록된 구성품(단품)에 연결된 포장 부자재 BOM 정보가 없습니다.");
                return;
            }

            const mappedComponents = bomList.map(item => ({
                bomCode: item.bomCode || '',
                componentName: item.componentName || '',
                specDetails: item.specDetails || '',
                sizeDimension: item.sizeDimension || '',
                weight: item.weight || 0,
                quantity: item.quantity || item.usageCount || 1,
                supplier: item.supplier || '',
                imagePath: item.imagePath || '',
                remarks: item.remarks || (item.parentComponentName ? `[구성품: ${item.parentComponentName}]` : '')
            }));

            setSpecComponents(mappedComponents);
            toast.success(`🎁 ${comps.length}개 구성품(단품)의 포장 부자재 BOM 총 ${mappedComponents.length}종을 성공적으로 불러왔습니다!`);
        } catch (error) {
            console.error("Failed to aggregate components BOM:", error);
            toast.error("기획세트 단품 BOM 취합 중 오류가 발생했습니다.");
        }
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
                        productType: fullProduct.productType || (fullProduct.isPlanningSet ? '기획세트' : 'PET_REGULAR'),
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
                        productType: product.productType || (product.isPlanningSet ? '기획세트' : 'PET_REGULAR'),
                        brand: product.brand || { id: null },
                        manufacturerInfo: product.manufacturerInfo || { id: null },
                        shelfLifeMonths: product.shelfLifeMonths || '',
                        openedShelfLifeMonths: product.openedShelfLifeMonths || '',
                        productBarcode: product.productBarcode || product.barcode || '',
                        inboxBarcode: product.inboxBarcode || '',
                        outboxBarcode: product.outboxBarcode || '',
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
                        productIngredients: fullProduct.productIngredients || product.productIngredients || [],
                        photoAuditDisclosed: product.photoAuditDisclosed || false
                    }));
                    const ingList = fullProduct.productIngredients || product.productIngredients;
                    if (ingList && ingList.length > 0) {
                        triggerEvaluatePrecautions(ingList);
                    }
                    fetchPackagingSpecs(product.id, product);
                }
            };
            fetchFullProduct();
            fetchHistory(product.id);
            fetchTestReports(product.id);
        } else if (product) {
            resetForm();
            setFormData(prev => ({
                ...prev,
                ...product,
                productType: product.productType || (product.isPlanningSet ? '기획세트' : 'PET_REGULAR'),
                isPlanningSet: !!(product.isPlanningSet || product.productType === '기획세트')
            }));
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
            productType: 'PET_REGULAR',
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
                        
                        // 바코드 3종 (상세 정보 -> 사양서 자동 연동)
                        updatedSpec.barcode = prod.productBarcode || prod.barcode || updatedSpec.barcode || '';
                        updatedSpec.inboxBarcode = prod.inboxBarcode || updatedSpec.inboxBarcode || '';
                        updatedSpec.outboxBarcode = prod.outboxBarcode || updatedSpec.outboxBarcode || '';

                        // 인박스 사용유무 및 규격/수량 연동
                        const hasInbox = prod.inboxInfo?.hasInbox !== undefined 
                            ? !!prod.inboxInfo.hasInbox 
                            : (parseInt(prod.inboxInfo?.inboxQuantity || 0) > 0 || (prod.inboxInfo?.inboxWidth && prod.inboxInfo?.inboxLength && prod.inboxInfo?.inboxHeight));
                        updatedSpec.inboxUseYn = hasInbox ? 'O' : 'X';

                        if (prod.inboxInfo?.inboxQuantity) {
                            updatedSpec.inboxQty = prod.inboxInfo.inboxQuantity;
                        }
                        if (prod.inboxInfo?.inboxWidth && prod.inboxInfo?.inboxLength && prod.inboxInfo?.inboxHeight) {
                            updatedSpec.inboxSize = `${prod.inboxInfo.inboxWidth}x${prod.inboxInfo.inboxLength}x${prod.inboxInfo.inboxHeight}`;
                        }

                        // 아웃박스 수량, 규격, 중량 (마스터 데이터 우선 연동)
                        if (prod.outboxInfo?.outboxQuantity) {
                            updatedSpec.outboxQty = prod.outboxInfo.outboxQuantity;
                            updatedSpec.outboxTotalQty = prod.outboxInfo.outboxQuantity;
                        }
                        if (prod.outboxInfo?.outboxWidth && prod.outboxInfo?.outboxLength && prod.outboxInfo?.outboxHeight) {
                            updatedSpec.outboxSize = `${prod.outboxInfo.outboxWidth}x${prod.outboxInfo.outboxLength}x${prod.outboxInfo.outboxHeight}`;
                        }
                        if (prod.outboxInfo?.outboxWeight) {
                            updatedSpec.oneOutboxWeight = prod.outboxInfo.outboxWeight;
                        }
                        
                        // 인박스 사용 시 아웃박스 내 인박스 수량 지능형 계산 (총수량 / 인박스입수량)
                        const inQ = parseInt(prod.inboxInfo?.inboxQuantity || updatedSpec.inboxQty || 0);
                        const outQ = parseInt(prod.outboxInfo?.outboxQuantity || updatedSpec.outboxTotalQty || 0);
                        if (hasInbox && inQ > 0 && outQ > 0) {
                            updatedSpec.outboxInboxQty = Math.max(1, Math.round(outQ / inQ));
                        }

                        if (prod.palletInfo?.palletWidth && prod.palletInfo?.palletLength) {
                            updatedSpec.palletSize = `${prod.palletInfo.palletWidth}x${prod.palletInfo.palletLength}`;
                        }
                        if (prod.palletInfo?.palletHeight) {
                            updatedSpec.onePalletHeight = prod.palletInfo.palletHeight;
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
                            const expFormat = selectedChannel.expDateFormat ? `LOT(제조번호)\nEXP ${selectedChannel.expDateFormat}` : '';
                            const cleanAutoRule = uRule ? uRule.replace(/\[생산배치번호\]/g, 'LOT(제조번호)').replace(/생산배치번호/g, 'LOT(제조번호)') : '';
                            const autoMarkingText = cleanAutoRule
                                ? (selectedChannel.expDateFormat ? `${cleanAutoRule}\n(표기형식: ${selectedChannel.expDateFormat})` : cleanAutoRule)
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
            setCurrentSpec(prev => ({
                ...prev,
                inboxUseYn: hasInbox ? 'O' : 'X',
                ...(hasInbox ? {} : { inboxQty: '', inboxSize: '' })
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
                setFormData(prev => {
                    const updatedParent = { ...prev[parent], [child]: actualValue, [inchField]: inchValue };
                    
                    // 사양서(currentSpec) 실시간 동기화
                    if (parent === 'inboxInfo') {
                        const w = child === 'inboxWidth' ? actualValue : updatedParent.inboxWidth;
                        const l = child === 'inboxLength' ? actualValue : updatedParent.inboxLength;
                        const h = child === 'inboxHeight' ? actualValue : updatedParent.inboxHeight;
                        if (w && l && h) {
                            setCurrentSpec(s => ({ ...s, inboxSize: `${w}x${l}x${h}`, inboxUseYn: 'O' }));
                        }
                    } else if (parent === 'outboxInfo') {
                        const w = child === 'outboxWidth' ? actualValue : updatedParent.outboxWidth;
                        const l = child === 'outboxLength' ? actualValue : updatedParent.outboxLength;
                        const h = child === 'outboxHeight' ? actualValue : updatedParent.outboxHeight;
                        if (w && l && h) {
                            setCurrentSpec(s => ({ ...s, outboxSize: `${w}x${l}x${h}` }));
                        }
                    } else if (parent === 'palletInfo') {
                        const w = child === 'palletWidth' ? actualValue : updatedParent.palletWidth;
                        const l = child === 'palletLength' ? actualValue : updatedParent.palletLength;
                        const h = child === 'palletHeight' ? actualValue : updatedParent.palletHeight;
                        if (w && l) {
                            setCurrentSpec(s => ({ ...s, palletSize: `${w}x${l}`, ...(h ? { onePalletHeight: h, palletHeightLimit: h } : {}) }));
                        }
                    }

                    return { ...prev, [parent]: updatedParent };
                });
                return;
            }

            // Handle nested lbs calculation (inbox/outbox weight goes from kg to lbs)
            if (['inboxWeight', 'outboxWeight'].includes(child)) {
                const lbsField = `${child}Lbs`;
                const lbsValue = (!isNaN(numValue) && actualValue !== '') ? (numValue * 2.20462).toFixed(2) : '';
                setFormData(prev => {
                    const updatedParent = { ...prev[parent], [child]: actualValue, [lbsField]: lbsValue };
                    if (parent === 'outboxInfo') {
                        setCurrentSpec(s => ({ ...s, oneOutboxWeight: actualValue }));
                    }
                    return { ...prev, [parent]: updatedParent };
                });
                return;
            }

            if (parent === 'inboxInfo' && child === 'inboxQuantity') {
                if (actualValue) {
                    setCurrentSpec(s => ({ ...s, inboxQty: actualValue, inboxUseYn: 'O' }));
                }
            } else if (parent === 'outboxInfo' && child === 'outboxQuantity') {
                if (actualValue) {
                    setCurrentSpec(s => ({ ...s, outboxQty: actualValue, outboxTotalQty: actualValue }));
                }
            }

            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: actualValue }
            }));
        } else {
            const updates = { [name]: actualValue };
            if (name === 'productBarcode') {
                setCurrentSpec(prev => ({ ...prev, barcode: actualValue }));
            }
            if (name === 'inboxBarcode') {
                setCurrentSpec(prev => ({ ...prev, inboxBarcode: actualValue }));
            }
            if (name === 'outboxBarcode') {
                setCurrentSpec(prev => ({ ...prev, outboxBarcode: actualValue }));
            }
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
                const parsedList = Array.isArray(res.data) ? res.data : [];
                setFormData(prev => ({
                    ...prev,
                    productIngredients: parsedList,
                    ingredients: '엑셀 업로드 완료'
                }));
                triggerEvaluatePrecautions(parsedList);
                alert(`성공적으로 파싱되어 ${parsedList.length}건의 전성분이 불러와졌습니다. (함량별 법적 주의사항 자동 분석 완료)`);
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

        // 1. 유효성 엄격 검증 (Strict Validation)
        const hasInbox = currentSpec.inboxUseYn === 'O';
        const missing3D = [];
        if (hasInbox && !currentSpec.inboxLayoutImage) missing3D.push('인박스 3D 입수 도면');
        if (!(currentSpec.outboxLayoutImageFile || currentSpec.outboxLayoutImage)) missing3D.push('아웃박스 3D 입수 도면');
        if (!currentSpec.palletLayoutImage) missing3D.push('팔레트 3D 적재 도면');

        const methodImgCount = (packagingMethodImages && packagingMethodImages.length) || (currentSpec.methodImages && currentSpec.methodImages.length) || (currentSpec.packagingMethodImage ? 1 : 0);
        const missingMethod = methodImgCount === 0;

        const missingSpecs = [];
        const outQty = parseInt(currentSpec.outboxQty || 0, 10);
        const tierQty = parseInt(currentSpec.palletTierQty || 0, 10);
        const tierCount = parseInt(currentSpec.palletTierCount || 0, 10);
        if (outQty <= 0) missingSpecs.push('아웃박스 총 입수량 (수량 0 초과 필요)');
        if (tierQty <= 0) missingSpecs.push('팔레트 1단 적재 박스 수량 (수량 0 초과 필요)');
        if (tierCount <= 0) missingSpecs.push('팔레트 총 적재 단수 (단수 0 초과 필요)');

        const hasValidationErrors = missing3D.length > 0 || missingMethod || missingSpecs.length > 0;

        if (hasValidationErrors) {
            setSpecValidationModalState({
                isOpen: true,
                title: '포장사양서 엑셀 다운로드 불가 안내',
                missing3D,
                missingMethodImages: missingMethod,
                missingSpecs
            });
            return; // 누락 항목 존재 시 엑셀 다운로드 완전 차단!
        }

        // 2. 검증 완료 시 초고속 다운로드
        try {
            setGlobalLoading(true);
            const response = await downloadPackagingSpecExcel(product.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `포장사양서_${formData.itemCode || product.itemCode || product.id}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("📑 포장사양서 엑셀 다운로드가 완료되었습니다!");
        } catch (error) {
            toast.error("엑셀 다운로드에 실패했습니다.");
            console.error(error);
        } finally {
            setGlobalLoading(false);
        }
    };

    const handleDownloadSpecPdf = async () => {
        if (!product || !product.id) return;

        // 1. 유효성 엄격 검증 (Strict Validation)
        const hasInbox = currentSpec.inboxUseYn === 'O';
        const missing3D = [];
        if (hasInbox && !currentSpec.inboxLayoutImage) missing3D.push('인박스 3D 입수 도면');
        if (!(currentSpec.outboxLayoutImageFile || currentSpec.outboxLayoutImage)) missing3D.push('아웃박스 3D 입수 도면');
        if (!currentSpec.palletLayoutImage) missing3D.push('팔레트 3D 적재 도면');

        const methodImgCount = (packagingMethodImages && packagingMethodImages.length) || (currentSpec.methodImages && currentSpec.methodImages.length) || (currentSpec.packagingMethodImage ? 1 : 0);
        const missingMethod = methodImgCount === 0;

        const missingSpecs = [];
        const outQty = parseInt(currentSpec.outboxQty || 0, 10);
        const tierQty = parseInt(currentSpec.palletTierQty || 0, 10);
        const tierCount = parseInt(currentSpec.palletTierCount || 0, 10);
        if (outQty <= 0) missingSpecs.push('아웃박스 총 입수량 (수량 0 초과 필요)');
        if (tierQty <= 0) missingSpecs.push('팔레트 1단 적재 박스 수량 (수량 0 초과 필요)');
        if (tierCount <= 0) missingSpecs.push('팔레트 총 적재 단수 (단수 0 초과 필요)');

        const hasValidationErrors = missing3D.length > 0 || missingMethod || missingSpecs.length > 0;

        if (hasValidationErrors) {
            setSpecValidationModalState({
                isOpen: true,
                title: '포장사양서 PDF 다운로드 불가 안내',
                missing3D,
                missingMethodImages: missingMethod,
                missingSpecs
            });
            return; // 누락 항목 존재 시 PDF 다운로드 완전 차단!
        }

        try {
            setGlobalLoading(true);
            const response = await downloadPackagingSpecPdf(product.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `포장사양서_${formData.itemCode || product.itemCode || product.id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("📄 포장사양서 PDF 다운로드가 완료되었습니다!");
        } catch (error) {
            toast.error("PDF 다운로드에 실패했습니다.");
            console.error(error);
        } finally {
            setGlobalLoading(false);
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



    // 구성품 목록으로부터 BOM 정보를 백엔드에서 자동 취합하여 연동
    const syncBomFromComponents = async (componentsList) => {
        if (!componentsList || componentsList.length === 0) {
            setSpecComponents([]);
            setCurrentSpec(prev => ({ ...prev, bomItems: [] }));
            return;
        }
        try {
            const res = await api.aggregateBomByComponents(componentsList);
            const aggregatedBoms = res.data;
            const bomList = Array.isArray(aggregatedBoms) ? aggregatedBoms : (aggregatedBoms?.data && Array.isArray(aggregatedBoms.data) ? aggregatedBoms.data : []);
            
            if (bomList.length > 0) {
                // 1. currentSpec.bomItems 갱신
                setCurrentSpec(prev => ({
                    ...prev,
                    bomItems: bomList
                }));

                // 2. Sheet 1 구성품 테이블(specComponents) 갱신 (PackagingSpecComponent 포맷 매핑)
                const mappedComponents = bomList.map(b => {
                    const mat = b.masterMaterial || {};
                    const usage = b.usageCount != null ? Math.round(b.usageCount) : 1;
                    const itemWeight = mat.weight != null ? parseFloat(mat.weight) : 0;
                    const specDetails = [mat.type, mat.detailedType, mat.material, mat.detailedMaterial].filter(Boolean).join(' / ') || b.specification || '';
                    const sizeDim = mat.specification || b.specification || '';
                    const supplier = mat.manufacturer || '';
                    const compName = mat.componentName || b.parentComponentName || '';
                    const bomCode = mat.bomCode || b.parentComponentCode || '';
                    const imagePath = mat.imagePath || '';

                    return {
                        bomCode: bomCode,
                        componentName: compName,
                        specDetails: specDetails,
                        sizeDimension: sizeDim,
                        weight: itemWeight,
                        quantity: usage,
                        supplier: supplier,
                        remarks: b.parentComponentName ? `[${b.parentComponentName}] 구성품 부자재` : '',
                        imagePath: imagePath
                    };
                });
                setSpecComponents(mappedComponents);

                // 3. 구성품들의 용량 및 중량 자동 합산 계산
                let totalMl = 0;
                let totalG = 0;
                componentsList.forEach(c => {
                    const qty = c.quantity || 1;
                    const ml = parseFloat(String(c.capacity || '').replace(/[^0-9.]/g, ''));
                    const g = parseFloat(String(c.weight || '').replace(/[^0-9.]/g, ''));
                    if (!isNaN(ml)) totalMl += (ml * qty);
                    if (!isNaN(g)) totalG += (g * qty);
                });

                if (totalMl > 0 || totalG > 0) {
                    setFormData(prev => ({
                        ...prev,
                        capacity: totalMl > 0 ? String(totalMl) : prev.capacity,
                        capacityFlOz: totalMl > 0 ? (totalMl * 0.033814).toFixed(2) : prev.capacityFlOz,
                        weight: totalG > 0 ? String(totalG) : prev.weight,
                        weightOz: totalG > 0 ? (totalG * 0.035274).toFixed(2) : prev.weightOz
                    }));
                }
                toast.success(`구성품 ${componentsList.length}개의 포장사양서에서 BOM ${mappedComponents.length}건이 Sheet 1 사양서에 자동 연동되었습니다.`);
            } else {
                setSpecComponents([]);
                setCurrentSpec(prev => ({ ...prev, bomItems: [] }));
            }
        } catch (err) {
            console.error('Failed to aggregate BOM from components', err);
        }
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

        const updatedComponents = [...formData.components, {
            itemCode: p.itemCode,
            productName: p.productName,
            quantity: 1,
            capacity: capacity,
            weight: weight
        }];

        setFormData(prev => ({
            ...prev,
            components: updatedComponents
        }));
        setIsSearchOpen(false);

        // 구성품들의 포장사양서에서 BOM 정보 자동 취합 연동
        syncBomFromComponents(updatedComponents);
    };

    const removeComponent = (idx) => {
        const updatedComponents = formData.components.filter((_, i) => i !== idx);
        setFormData(prev => ({
            ...prev,
            components: updatedComponents
        }));
        if (updatedComponents.length > 0) {
            syncBomFromComponents(updatedComponents);
        } else {
            setSpecComponents([]);
            setCurrentSpec(prev => ({ ...prev, bomItems: [] }));
        }
    };

    const updateComponentQty = (idx, qty) => {
        const newComponents = [...formData.components];
        newComponents[idx].quantity = parseInt(qty) || 1;
        setFormData(prev => ({ ...prev, components: newComponents }));
        syncBomFromComponents(newComponents);
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();

        if (!formData.itemCode || !formData.itemCode.trim()) {
            alert("⚠️ 품목코드는 필수 입력 항목입니다.");
            return;
        }

        if (!formData.productName || !formData.productName.trim()) {
            alert("⚠️ 제품명은 필수 입력 항목입니다.");
            return;
        }

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
                    delete specToSave.bomItems;

                    // 바코드 fallback 보장
                    if (!specToSave.barcode && (formData.productBarcode || formData.barcode)) {
                        specToSave.barcode = formData.productBarcode || formData.barcode;
                    }
                    if (!specToSave.inboxBarcode && formData.inboxBarcode) {
                        specToSave.inboxBarcode = formData.inboxBarcode;
                    }
                    if (!specToSave.outboxBarcode && formData.outboxBarcode) {
                        specToSave.outboxBarcode = formData.outboxBarcode;
                    }

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
            let serverMsg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : null);
            if (!serverMsg && error.response?.data && typeof error.response.data === 'object') {
                serverMsg = Object.entries(error.response.data).map(([k, v]) => `${k}: ${v}`).join(', ');
            }
            serverMsg = serverMsg || error.message || "서버 통신 오류";
            alert(`저장 중 오류가 발생했습니다.\n사유: ${serverMsg}`);

            // [오류 추적 및 버그 리포트] 저장 실패 시 시스템 버그 리포트에 자동 적재
            try {
                await api.submitBugReport({
                    screenName: '제품코드 마스터 (ProductDrawer)',
                    url: window.location.href,
                    errorCategory: 'API_400_SAVE_ERROR',
                    errorMessage: `제품 저장 실패 (itemCode: ${formData.itemCode || '미입력'}): ${serverMsg}`,
                    description: `제품 저장 실패 (itemCode: ${formData.itemCode || '미입력'}). 사유: ${serverMsg}`,
                    serverError: typeof error.response?.data === 'object' ? JSON.stringify(error.response.data) : (error.response?.data || error.message),
                    steps: error.stack || 'No Stack Trace',
                    severity: 'HIGH'
                });
                console.log("[QMS] Bug report auto-submitted for save error.");
            } catch (reportErr) {
                console.warn("[QMS] Failed to submit bug report on save error:", reportErr);
            }
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
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                type="button" 
                                                className="secondary" 
                                                style={{ padding: '6px 14px', fontSize: '12px', background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '6px', color: '#4338ca', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}
                                                onClick={handleSyncFromPackagingSpec}
                                                title="사양서 및 BOM 부재료에 기재된 단상자/박스 규격 및 용량을 불러옵니다."
                                            >
                                                📥 사양서 제원 불러오기
                                            </button>
                                            <button 
                                                type="button" 
                                                className="primary" 
                                                style={{ padding: '6px 15px', fontSize: '12.5px', background: '#4f46e5', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                onClick={() => calculateRealtimeSpaceRatio()}
                                            >
                                                🔄 실시간 재계산
                                            </button>
                                        </div>
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 15px 0', lineHeight: '1.5' }}>
                                        품목코드 마스터에 기재된 포장 제원(단상자 치수, 내용량, 구성품)을 기반으로 각 국가의 포장규제 법률에 대입하여 실시간 판정합니다.
                                    </p>

                                    {/* 실시간 계산 파라미터 제어 바 (Live Input & Control Bar) */}
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <strong style={{ fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>⚡</span> 실시간 계산용 포장 제원 (2차 단상자 & 1차 본체 용기 규격)
                                            </strong>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                💡 수치 변경 시 즉시 6개국 법적 공간비율이 실시간 재계산됩니다.
                                            </span>
                                        </div>

                                        {/* 1열: 2차 단상자 외형 규격 */}
                                        <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#4338ca', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span>📦</span> 2차 단상자(외형 박스) 규격
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>단상자 가로 (W mm)</label>
                                                    <input 
                                                        type="text" 
                                                        value={formData.dimensions?.width || ''} 
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                dimensions: { ...prev.dimensions, width: val }
                                                            }));
                                                        }}
                                                        placeholder="예: 48" 
                                                        style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>단상자 세로 (D mm)</label>
                                                    <input 
                                                        type="text" 
                                                        value={formData.dimensions?.length || ''} 
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                dimensions: { ...prev.dimensions, length: val }
                                                            }));
                                                        }}
                                                        placeholder="예: 48" 
                                                        style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>단상자 높이 (H mm)</label>
                                                    <input 
                                                        type="text" 
                                                        value={formData.dimensions?.height || ''} 
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                dimensions: { ...prev.dimensions, height: val }
                                                            }));
                                                        }}
                                                        placeholder="예: 140" 
                                                        style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>단상자 외형 체적</label>
                                                    <div style={{ padding: '6px 10px', fontSize: '12.5px', fontWeight: '600', color: '#334155', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                                        {formData.dimensions?.width && formData.dimensions?.length && formData.dimensions?.height
                                                            ? `${((parseFloat(formData.dimensions.width) * parseFloat(formData.dimensions.length) * parseFloat(formData.dimensions.height)) / 1000).toFixed(1)} mL (cm³)`
                                                            : '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2열: 1차 본체 용기 규격 및 내용량 */}
                                        <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0284c7', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span>🧴</span> 1차 본체 용기(실체적) 및 내용량
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>용기 형태</label>
                                                    <select
                                                        value={primaryContainer.shape || 'cylinder'}
                                                        onChange={(e) => setPrimaryContainer(prev => ({ ...prev, shape: e.target.value }))}
                                                        style={{ padding: '6px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                                                    >
                                                        <option value="cylinder">원기둥 (Ø 직경 × 높이)</option>
                                                        <option value="rect">직육면체 (가로×세로×높이)</option>
                                                        <option value="custom_volume">내용량 직접 산출</option>
                                                    </select>
                                                </div>

                                                {primaryContainer.shape === 'cylinder' ? (
                                                    <>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>용기 직경 (Ø mm)</label>
                                                            <input 
                                                                type="text" 
                                                                value={primaryContainer.diameter || ''} 
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                    setPrimaryContainer(prev => ({ ...prev, diameter: val }));
                                                                }}
                                                                placeholder="예: 45" 
                                                                style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                            />
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>용기 높이 (H mm)</label>
                                                            <input 
                                                                type="text" 
                                                                value={primaryContainer.height || ''} 
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                    setPrimaryContainer(prev => ({ ...prev, height: val }));
                                                                }}
                                                                placeholder="예: 135" 
                                                                style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                            />
                                                        </div>
                                                    </>
                                                ) : primaryContainer.shape === 'rect' ? (
                                                    <>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>용기 가로 (W mm)</label>
                                                            <input 
                                                                type="text" 
                                                                value={primaryContainer.width || ''} 
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                    setPrimaryContainer(prev => ({ ...prev, width: val }));
                                                                }}
                                                                placeholder="예: 45" 
                                                                style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                            />
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>용기 세로 (D mm)</label>
                                                            <input 
                                                                type="text" 
                                                                value={primaryContainer.depth || ''} 
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                    setPrimaryContainer(prev => ({ ...prev, depth: val }));
                                                                }}
                                                                placeholder="예: 45" 
                                                                style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                            />
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>용기 높이 (H mm)</label>
                                                            <input 
                                                                type="text" 
                                                                value={primaryContainer.height || ''} 
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                    setPrimaryContainer(prev => ({ ...prev, height: val }));
                                                                }}
                                                                placeholder="예: 135" 
                                                                style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                            />
                                                        </div>
                                                    </>
                                                ) : null}

                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>내용량 (mL)</label>
                                                    <input 
                                                        type="text" 
                                                        value={formData.capacity || primaryContainer.capacity_ml || ''} 
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            setFormData(prev => ({ ...prev, capacity: val }));
                                                            setPrimaryContainer(prev => ({ ...prev, capacity_ml: val }));
                                                        }}
                                                        placeholder="예: 100" 
                                                        style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                    />
                                                </div>

                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>품목 구분</label>
                                                    <select 
                                                        value={formData.productType || '단품'} 
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                productType: val,
                                                                isPlanningSet: val === '기획세트'
                                                            }));
                                                        }}
                                                        style={{ padding: '6px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                                                    >
                                                        <option value="단품">단품 일반 화장품 (10%)</option>
                                                        <option value="세정용">인체/두발 세정용 (15%)</option>
                                                        <option value="기획세트">기획세트 / 종합제품 (25%)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {spaceRatioLoading ? (
                                        <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>
                                            <div className="spinner" style={{ margin: '0 auto 15px auto', width: '36px', height: '36px', border: '3px solid rgba(99,102,241,0.1)', borderLeftColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                            <span>6개국 포장 규제 연산 엔진 실시간 가동 중...</span>
                                        </div>
                                    ) : !spaceRatioResults || (Array.isArray(spaceRatioResults) && spaceRatioResults.length === 0) ? (
                                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                                            실시간 공간비율 데이터가 생성되지 않았습니다. 상단 입력란에 가로/세로/높이 및 내용량을 입력하십시오.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {/* 6개국 국가 카드 보드 */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                                                {(Array.isArray(spaceRatioResults) ? spaceRatioResults : []).map((r) => {
                                                    const isPass = r.status === 'PASS';
                                                    const isFail = r.status === 'FAIL';
                                                    const isRefer = r.badgeType === 'REFERENCE_ONLY';
                                                    const isWaiting = r.badgeType === 'WAITING_INPUT';

                                                    let borderTop = '4px solid #64748b';
                                                    let cardBg = '#fff';
                                                    let badgeBg = '#f1f5f9';
                                                    let badgeText = '#475569';

                                                    if (isWaiting) {
                                                        borderTop = '4px solid #f59e0b';
                                                        badgeBg = '#fef3c7';
                                                        badgeText = '#b45309';
                                                    } else if (isPass) {
                                                        borderTop = '4px solid #10b981';
                                                        badgeBg = '#dcfce7';
                                                        badgeText = '#15803d';
                                                    } else if (isFail) {
                                                        borderTop = '4px solid #ef4444';
                                                        badgeBg = '#fee2e2';
                                                        badgeText = '#b91c1c';
                                                    } else if (isRefer) {
                                                        borderTop = '4px solid #8b5cf6';
                                                        badgeBg = '#ede9fe';
                                                        badgeText = '#6d28d9';
                                                    } else if (r.badgeType === 'OFFICIAL_VALUE') {
                                                        borderTop = '4px solid #3b82f6';
                                                        badgeBg = '#e0e7ff';
                                                        badgeText = '#3730a3';
                                                    }

                                                    return (
                                                        <div 
                                                            key={r.countryCode} 
                                                            style={{ 
                                                                background: cardBg, 
                                                                border: '1px solid #e2e8f0', 
                                                                borderTop, 
                                                                borderRadius: '10px', 
                                                                padding: '18px 20px',
                                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                justifyContent: 'space-between',
                                                                gap: '12px'
                                                            }}
                                                        >
                                                            <div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <span style={{ fontSize: '20px' }}>{r.flag}</span>
                                                                        <strong style={{ fontSize: '15px', color: '#1e293b' }}>{r.countryName}</strong>
                                                                        {r.isLegalForce ? (
                                                                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b' }}>법적 강제</span>
                                                                        ) : (
                                                                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b' }}>참고용</span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div>
                                                                        {r.badgeType === 'WAITING_INPUT' && (
                                                                            <span style={{ fontSize: '11px', fontWeight: '800', color: badgeText, padding: '3px 8px', borderRadius: '12px', backgroundColor: badgeBg }}>
                                                                                ⚠️ 치수 미입력
                                                                            </span>
                                                                        )}
                                                                        {r.badgeType === 'LEGAL_DECISION' && (
                                                                            <span style={{ fontSize: '11px', fontWeight: '800', color: badgeText, padding: '3px 8px', borderRadius: '12px', backgroundColor: badgeBg }}>
                                                                                {isPass ? '✓ 적합' : '✕ 부적합'}
                                                                            </span>
                                                                        )}
                                                                        {r.badgeType === 'OFFICIAL_VALUE' && (
                                                                            <span style={{ fontSize: '11px', fontWeight: '800', color: badgeText, padding: '3px 8px', borderRadius: '12px', backgroundColor: badgeBg }}>
                                                                                공식 산출치
                                                                            </span>
                                                                        )}
                                                                        {r.badgeType === 'REFERENCE_ONLY' && (
                                                                            <span style={{ fontSize: '11px', fontWeight: '800', color: badgeText, padding: '3px 8px', borderRadius: '12px', backgroundColor: badgeBg }}>
                                                                                참고용 (Reference)
                                                                            </span>
                                                                        )}
                                                                        {r.badgeType === 'NOT_APPLICABLE' && (
                                                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#f1f5f9' }}>
                                                                                해당 없음 (N/A)
                                                                            </span>
                                                                        )}
                                                                        {r.badgeType === 'NO_BADGE' && (
                                                                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                                                {r.title}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* 계산 세부 수치 요약 */}
                                                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                                                                    {r.summary}
                                                                </div>

                                                                {/* 상세 설명 */}
                                                                <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 8px 0', lineHeight: '1.45' }}>
                                                                    {r.detailDescription}
                                                                </p>

                                                                {/* 플래그 경고 */}
                                                                {r.flags && r.flags.length > 0 && (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                                                        {r.flags.map((flag, fIdx) => (
                                                                            <span key={fIdx} style={{ fontSize: '10px', fontWeight: '700', color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                                                                                {flag}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* 법령명 */}
                                                            <div style={{ fontSize: '10.5px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                                                                📜 근거: {r.lawName}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* 글로벌 법률 가이드라인 정보 탭 */}
                                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginTop: '10px' }}>
                                                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b' }}>📌 국가별 포장공간비율 주요 법적 기준 요약</h4>
                                                <ul style={{ fontSize: '12px', color: '#475569', paddingLeft: '20px', lineHeight: '1.7', margin: 0 }}>
                                                    <li><b>🇰🇷 대한민국 (환경부 고시)</b>: 단품 일반 화장품 10% 이하, 인체·두발 세정용 15% 이하, 종합제품(기획세트) 25% 이하. 포장 횟수는 2차 이내(세트 2차 이내) 준수 필수.</li>
                                                    <li><b>🇨🇳 중국 (GB 23350-2021 / 2024 개정)</b>: 화장품 K계수 기본 9.0(전동기구 동봉 시 1.5배 가산)을 적용한 공극률 계산. 포장 층수는 최대 4층 이하 준수.</li>
                                                    <li><b>🇹🇼 대만 (자원회수재이용법 과도포장제한)</b>: 화장품 선물세트(禮盒) 대상 포장체적비치(PVR) 1.00 이하 강제 적용. 단일재질(C=3.1), 복합재질(C=2.7) 계수 반영. 단품은 규제 제외.</li>
                                                    <li><b>🇪🇺 유럽연합 (EU PPWR 2025/40 Article 24)</b>: 개별 화장품 단상자에는 적용되지 않으며, 최종 화물 수송/이커머스 그룹포장 공극률 40%~50% 규제 적용 (참고용 안내).</li>
                                                    <li><b>🇺🇸 미국 (21 CFR 100.100 / California B&P §12606)</b>: 연방법상 고정 수치 상한은 없으나 비기능적 여유공간(Slack-fill)에 따른 소비자 집단소송 리스크 관리 목적 참고치 제공.</li>
                                                    <li><b>🇯🇵 일본 (용기포장리사이클법 / 자율규약)</b>: 개별 공간비율에 대한 법적 벌칙 규정은 없으며, 용기 재활용 의무 및 화장품공업연합회 적정포장 자율규약 기준 안내.</li>
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
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextIsSet = !(formData.isPlanningSet || formData.productType === '기획세트');
                                                setFormData(prev => ({
                                                    ...prev,
                                                    isPlanningSet: nextIsSet,
                                                    productType: nextIsSet ? '기획세트' : (prev.productType === '기획세트' ? 'PET_REGULAR' : prev.productType)
                                                }));
                                                if (formData.channels && formData.channels.length > 0) {
                                                    syncChannelRulesToSpec(formData.channels[0], true);
                                                }
                                                if (nextIsSet) {
                                                    toast.info("🎁 기획세트 모드로 전환되었습니다. 하단 구성품 관리 카드에서 구성품을 추가하세요.");
                                                } else {
                                                    toast.info("단품 모드로 전환되었습니다.");
                                                }
                                            }}
                                            style={{
                                                padding: '4px 12px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                borderRadius: '6px',
                                                border: (formData.isPlanningSet || formData.productType === '기획세트') ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                                                background: (formData.isPlanningSet || formData.productType === '기획세트') ? '#fef3c7' : '#ffffff',
                                                color: (formData.isPlanningSet || formData.productType === '기획세트') ? '#b45309' : '#334155',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                            title="단품과 기획세트(구성품 포함) 등록 모드를 전환합니다."
                                        >
                                            <span>{(formData.isPlanningSet || formData.productType === '기획세트') ? '🎁 기획세트 해제' : '🎁 기획세트 만들기'}</span>
                                        </button>
                                    )}
                                    {!product && canEdit && (
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
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input name="itemCode" value={formData.itemCode} onChange={handleChange} required placeholder="품목 코드(Product Num) 입력" disabled={!!product || !canEdit} style={{ flex: 1 }} />
                                    {!product && canEdit && <button type="button" onClick={handleDuplicateCheck} className="secondary" style={{ width: 'auto' }}>중복 확인</button>}
                                </div>
                            </div>

                            <div style={{ marginTop: '10px', display: 'flex', gap: '20px', alignItems: 'center' }}>
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
                                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', cursor: canEdit ? 'pointer' : 'default', color: (formData.isPlanningSet || formData.productType === '기획세트') ? '#b45309' : 'inherit', fontWeight: (formData.isPlanningSet || formData.productType === '기획세트') ? 'bold' : 'normal' }}>
                                    <input 
                                        type="checkbox" 
                                        name="isPlanningSet" 
                                        checked={formData.isPlanningSet || formData.productType === '기획세트'} 
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                isPlanningSet: checked,
                                                productType: checked ? '기획세트' : (prev.productType === '기획세트' ? 'PET_REGULAR' : prev.productType)
                                            }));
                                            if (formData.channels && formData.channels.length > 0) {
                                                syncChannelRulesToSpec(formData.channels[0], true);
                                            }
                                        }} 
                                        disabled={!canEdit} 
                                    />
                                    🎁 이 제품을 기획세트로 등록 (Planning Set)
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
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>제품구분</span>
                                {(formData.isPlanningSet || formData.productType === '기획세트') && (
                                    <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 'bold', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                                        🎁 기획세트 모드 활성화됨
                                    </span>
                                )}
                            </label>
                            <select name="productType" value={formData.productType} onChange={handleChange} disabled={!canEdit} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: (formData.isPlanningSet || formData.productType === '기획세트') ? '2px solid #f59e0b' : '1px solid #ccc', backgroundColor: (formData.isPlanningSet || formData.productType === '기획세트') ? '#fffbeb' : '#fff' }}>
                                <option value="기획세트">🎁 기획세트 (Planning Set - 복합 구성품)</option>
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

                        {/* 기획세트 구성품 관리 섹션 (기획세트 활성화 시 제품구분 바로 아래에 즉시 표시) */}
                        {(formData.productType === '기획세트' || formData.isPlanningSet) && (
                            <div style={{ 
                                marginBottom: '20px', 
                                padding: '16px', 
                                background: '#fffbeb', 
                                borderRadius: '10px', 
                                border: '2px solid #f59e0b',
                                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.12)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '18px' }}>📦</span>
                                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#92400e' }}>
                                            기획세트 구성품 관리 ({formData.components?.length || 0}개 등록됨)
                                        </h4>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsSearchOpen(true)} 
                                        style={{ 
                                            padding: '6px 14px', 
                                            fontSize: '12.5px', 
                                            fontWeight: 'bold',
                                            backgroundColor: '#d97706', 
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: canEdit ? 'pointer' : 'not-allowed',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            boxShadow: '0 2px 4px rgba(217, 119, 6, 0.3)'
                                        }}
                                        disabled={!canEdit}
                                    >
                                        <span>+ 🎁 구성품 검색 및 추가</span>
                                    </button>
                                </div>

                                <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #fde68a', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ background: '#fef3c7', borderBottom: '1.5px solid #fcd34d', color: '#78350f' }}>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 'bold' }}>품목코드</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 'bold' }}>구성품명</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 'bold' }}>용량 / 중량</th>
                                                <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center', fontWeight: 'bold' }}>수량 (ea)</th>
                                                {canEdit && <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(!formData.components || formData.components.length === 0) ? (
                                                <tr>
                                                    <td colSpan={canEdit ? 5 : 4} style={{ padding: '24px', textAlign: 'center', color: '#92400e' }}>
                                                        <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                                                            등록된 기획세트 구성품이 없습니다.
                                                        </div>
                                                        {canEdit && (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setIsSearchOpen(true)}
                                                                style={{
                                                                    padding: '5px 12px',
                                                                    fontSize: '12px',
                                                                    backgroundColor: '#f59e0b',
                                                                    color: '#fff',
                                                                    border: 'none',
                                                                    borderRadius: '5px',
                                                                    cursor: 'pointer',
                                                                    fontWeight: 'bold'
                                                                }}
                                                            >
                                                                + 🎁 첫 번째 구성품 추가하기
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ) : (
                                                formData.components.map((c, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid #fef3c7', transition: 'background-color 0.15s' }}>
                                                        <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#1d4ed8' }}>{c.itemCode}</td>
                                                        <td style={{ padding: '8px 10px', fontWeight: '500' }}>{c.productName}</td>
                                                        <td style={{ padding: '8px 10px', color: '#475569' }}>
                                                            {c.capacity ? `${c.capacity}mL` : '-'} / {c.weight ? `${c.weight}g` : '-'}
                                                        </td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
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
                                                                style={{ width: '60px', padding: '4px', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}
                                                            />
                                                        </td>
                                                        {canEdit && (
                                                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeComponent(i)}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        color: '#ef4444',
                                                                        fontSize: '18px',
                                                                        cursor: 'pointer',
                                                                        lineHeight: 1,
                                                                        padding: '2px 6px'
                                                                    }}
                                                                    title="구성품 삭제"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>💡</span> 구성품을 추가하거나 수량을 변경하면 <strong>Sheet 1 사양서의 부자재 BOM 목록 및 총 용량/중량이 자동으로 취합·계산</strong>됩니다.
                                </div>
                            </div>
                        )}

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


                            {/* 카드 4: 전성분 관리 (단품 품목일 때만 노출, 기획세트일 때는 완전 숨김) */}
                            {!formData.isPlanningSet && (
                                <div className="card" style={{ borderLeft: '5px solid #1abc9c' }}>
                                    <h3>
                                        <span style={{ color: '#1abc9c' }}>🌱</span> 전성분 (Ingredients)
                                    </h3>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <label style={{ fontWeight: '700', fontSize: '15px', margin: 0, color: '#155724' }}>
                                            🌱 전성분 및 성분 안전성 관리
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <button 
                                                type="button" 
                                                onClick={() => triggerEvaluatePrecautions()} 
                                                disabled={precautionLoading}
                                                className="secondary" 
                                                style={{ 
                                                    fontSize: '12px', 
                                                    padding: '4px 10px', 
                                                    background: '#fffbeb', 
                                                    border: '1.5px solid #fcd34d', 
                                                    color: '#92400e', 
                                                    fontWeight: 'bold',
                                                    borderRadius: '6px',
                                                    cursor: precautionLoading ? 'not-allowed' : 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                                title="함량에 따라 포장재/단상자에 반드시 기재해야 하는 화장품법상 사용상 주의사항 재분석"
                                            >
                                                <span>{precautionLoading ? '⏳' : '⚠️'}</span> {precautionLoading ? '분석 중...' : '함량별 주의사항 재분석'}
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={handleScanCompliance} 
                                                disabled={complianceLoading}
                                                className="secondary" 
                                                style={{ 
                                                    fontSize: '12px', 
                                                    padding: '4px 10px', 
                                                    background: '#ecfdf5', 
                                                    border: '1.5px solid #6ee7b7', 
                                                    color: '#065f46', 
                                                    fontWeight: 'bold',
                                                    borderRadius: '6px',
                                                    cursor: complianceLoading ? 'not-allowed' : 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                                title="등록된 전성분의 글로벌 규제(KR/EU/US/CN/JP) 금지성분 및 배합한도 실시간 스캔"
                                            >
                                                <span>{complianceLoading ? '⏳' : '🛡️'}</span> {complianceLoading ? '스캔 중...' : '실시간 글로벌 규제 스캔'}
                                            </button>
                                            {canEdit && (
                                                <label className="button primary" style={{ cursor: 'pointer', fontSize: '12px', padding: '4px 10px', margin: 0, background: '#28a745', border: 'none', borderRadius: '6px' }}>
                                                    📤 엑셀 업로드
                                                    <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'ingredientsExcel')} />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* ⚠️ 법적 의무 기재 주의사항 안내 섹션 */}
                                    {precautionResults && precautionResults.matchedPrecautionCount > 0 && (
                                        <div style={{
                                            marginBottom: '16px',
                                            padding: '16px',
                                            borderRadius: '10px',
                                            background: '#fffbeb',
                                            border: '1.5px solid #fde68a',
                                            boxShadow: '0 2px 6px rgba(245, 158, 11, 0.08)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '18px' }}>⚠️</span>
                                                    <strong style={{ fontSize: '14px', color: '#92400e' }}>
                                                        함량별 법적 의무 기재 주의사항 및 표시 권고 ({precautionResults.matchedPrecautionCount}건)
                                                    </strong>
                                                </div>
                                                <span style={{ fontSize: '11px', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                                    화장품법 시행규칙 [별표 3] 연계
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {precautionResults.precautions.map((prec, pIdx) => (
                                                    <div key={pIdx} style={{
                                                        padding: '10px 12px',
                                                        borderRadius: '8px',
                                                        background: '#ffffff',
                                                        border: '1px solid #fed7aa',
                                                        fontSize: '12px'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{
                                                                    padding: '1px 6px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '10px',
                                                                    fontWeight: 'bold',
                                                                    background: prec.precautionType === 'MANDATORY_WARNING' ? '#fee2e2' : '#e0e7ff',
                                                                    color: prec.precautionType === 'MANDATORY_WARNING' ? '#991b1b' : '#3730a3'
                                                                }}>
                                                                    {prec.precautionType === 'MANDATORY_WARNING' ? '의무 기재 주의사항' : '성분 표시 의무'}
                                                                </span>
                                                                <strong style={{ color: '#1e293b' }}>{prec.ingredientName}</strong>
                                                                {prec.inputPercent !== null && (
                                                                    <span style={{ color: '#64748b' }}>(입력 함량: {prec.inputPercent}%)</span>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(prec.precautionContent);
                                                                    toast.success(`[${prec.ingredientName}] 주의사항 문구가 클립보드에 복사되었습니다.`);
                                                                }}
                                                                style={{
                                                                    background: '#f1f5f9',
                                                                    border: '1px solid #cbd5e1',
                                                                    borderRadius: '4px',
                                                                    padding: '2px 6px',
                                                                    fontSize: '11px',
                                                                    cursor: 'pointer',
                                                                    color: '#475569'
                                                                }}
                                                                title="표시 문구 복사"
                                                            >
                                                                📋 문구 복사
                                                            </button>
                                                        </div>
                                                        <div style={{ color: '#b91c1c', fontWeight: '600', marginBottom: '2px' }}>
                                                            {prec.precautionTitle}
                                                        </div>
                                                        <div style={{ color: '#334155', lineHeight: '1.4', background: '#f8fafc', padding: '6px 8px', borderRadius: '4px' }}>
                                                            {prec.precautionContent}
                                                        </div>
                                                        {prec.regulationSource && (
                                                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                                                                근거 법령: {prec.regulationSource}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

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
                                                    {canEdit && <th style={{ padding: '10px', width: '40px', textAlign: 'center' }}>삭제</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(!formData.productIngredients || formData.productIngredients.length === 0) ? (
                                                    <tr>
                                                        <td colSpan={canEdit ? 9 : 8} style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                                                            업로드된 전성분 데이터가 없습니다. 엑셀 업로드를 하거나 행을 추가해주세요.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    formData.productIngredients.map((ing, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid #e9ecef', ':hover': { background: '#f8f9fa' } }}>
                                                            <td style={{ padding: '4px 8px' }}>
                                                                <input value={ing.korName || ''} onChange={(e) => updateIngredient(idx, 'korName', e.target.value)} disabled={!canEdit} style={{ width: '100%', border: 'none', background: 'transparent' }} />
                                                            </td>
                                                            <td style={{ padding: '4px 8px' }}>
                                                                <input value={ing.engName || ''} onChange={(e) => updateIngredient(idx, 'engName', e.target.value)} disabled={!canEdit} style={{ width: '100%', border: 'none', background: 'transparent' }} />
                                                            </td>
                                                            <td style={{ padding: '4px 8px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={ing.contentPercent != null ? Number(ing.contentPercent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                                                    onChange={(e) => {
                                                                        const rawValue = e.target.value.replace(/,/g, '');
                                                                        if (!isNaN(rawValue)) updateIngredient(idx, 'contentPercent', rawValue);
                                                                    }}
                                                                    disabled={!canEdit}
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
                                                                    disabled={!canEdit}
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
                                                                    disabled={!canEdit}
                                                                    style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'right' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '4px 8px' }}>
                                                                <input value={ing.inciName || ''} onChange={(e) => updateIngredient(idx, 'inciName', e.target.value)} disabled={!canEdit} style={{ width: '100%', border: 'none', background: 'transparent' }} />
                                                            </td>
                                                            <td style={{ padding: '4px 8px' }}>
                                                                <input value={ing.allergenMark || ''} onChange={(e) => updateIngredient(idx, 'allergenMark', e.target.value)} disabled={!canEdit} style={{ width: '100%', border: 'none', background: 'transparent' }} />
                                                            </td>
                                                            <td style={{ padding: '4px 8px' }}>
                                                                <input value={ing.limitClass || ''} onChange={(e) => updateIngredient(idx, 'limitClass', e.target.value)} disabled={!canEdit} style={{ width: '100%', border: 'none', background: 'transparent' }} />
                                                            </td>
                                                            {canEdit && (
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

                                    {canEdit && (
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
                                                disabled={!canEdit || (formData.productIngredients && formData.productIngredients.length > 0)}
                                                placeholder="제품 전체 성분을 입력하세요."
                                                style={{ width: '100%', height: '60px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '11px', backgroundColor: (formData.productIngredients && formData.productIngredients.length > 0) ? '#f8f9fa' : '#fff' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                            <>
                                                <button 
                                                    type="button" 
                                                    onClick={() => syncChannelRulesToSpec(formData.channels && formData.channels[0], true)}
                                                    style={{ 
                                                        background: '#f0f9ff', 
                                                        border: '1px solid #7dd3fc', 
                                                        color: '#0369a1', 
                                                        fontSize: '12px', 
                                                        fontWeight: '600',
                                                        padding: '6px 12px',
                                                        borderRadius: '7px',
                                                        whiteSpace: 'nowrap',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="선택된 유통채널의 착인 기준 및 적재 규격을 사양서에 동기화합니다."
                                                >
                                                    <span>⚡</span> 채널기준 적용
                                                </button>
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
                                            </>
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
                                                    <label style={{ fontSize: '12px', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span>바코드</span>
                                                        <span style={{ fontSize: '11px', color: '#0369a1', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                            🔒 상세정보 연동
                                                        </span>
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        readOnly
                                                        value={formData.productBarcode || formData.barcode || currentSpec.barcode || ''} 
                                                        style={{ background: '#f8fafc', fontSize: '14px', color: '#1e293b', fontWeight: '600', cursor: 'not-allowed' }} 
                                                        placeholder="상세 정보 탭 바코드 자동 반영"
                                                        title="제품 바코드는 '상세 정보' 탭의 제품 바코드 항목에서 관리됩니다."
                                                    />
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
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button 
                                                            type="button" 
                                                            onClick={handleAutoGenerateRevision} 
                                                            className="secondary" 
                                                            style={{ 
                                                                fontSize: '11px', 
                                                                padding: '4px 8px',
                                                                background: '#eff6ff',
                                                                border: '1px solid #bfdbfe',
                                                                color: '#1d4ed8',
                                                                fontWeight: '600',
                                                                borderRadius: '4px'
                                                            }}
                                                            title="현재 설정된 아웃박스 및 팔레트 적재 사양을 기반으로 개정 요약을 자동 생성합니다."
                                                        >
                                                            ⚡ 변경점 자동 요약 추가
                                                        </button>
                                                        <button type="button" onClick={handleAddRevision} className="secondary" style={{ fontSize: '11px', padding: '4px 8px' }}>
                                                            + 개정내역 추가
                                                        </button>
                                                    </div>
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
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        {(formData.isPlanningSet || formData.productType === '기획세트') && (
                                                            <button 
                                                                type="button" 
                                                                onClick={handleFetchComponentsBom} 
                                                                style={{ 
                                                                    fontSize: '12px', 
                                                                    padding: '7px 14px', 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    gap: '6px',
                                                                    fontWeight: '700',
                                                                    borderRadius: '6px',
                                                                    background: '#fffbeb',
                                                                    border: '1.5px solid #f59e0b',
                                                                    color: '#b45309',
                                                                    cursor: 'pointer',
                                                                    boxShadow: '0 1px 2px rgba(245, 158, 11, 0.15)'
                                                                }}
                                                                title="상세 정보 탭에 등록된 기획세트 구성품(단품)들의 부자재 BOM 목록을 일괄 취합하여 사양서로 불러옵니다."
                                                            >
                                                                <span>🎁</span> 기획세트 단품 BOM 전체 가져오기
                                                            </button>
                                                        )}
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
                                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                                            {(formData.isPlanningSet || formData.productType === '기획세트') && (
                                                                                <button 
                                                                                    type="button" 
                                                                                    onClick={handleFetchComponentsBom} 
                                                                                    style={{ 
                                                                                        fontSize: '12px', 
                                                                                        padding: '6px 14px', 
                                                                                        display: 'inline-flex', 
                                                                                        alignItems: 'center', 
                                                                                        gap: '6px',
                                                                                        fontWeight: '700',
                                                                                        borderRadius: '6px',
                                                                                        background: '#fffbeb',
                                                                                        border: '1.5px solid #f59e0b',
                                                                                        color: '#b45309',
                                                                                        cursor: 'pointer'
                                                                                    }}
                                                                                >
                                                                                    <span>🎁</span> 기획세트 단품 BOM 전체 가져오기
                                                                                </button>
                                                                            )}
                                                                            <button 
                                                                                type="button" 
                                                                                onClick={handleOpenBomModalForAdd} 
                                                                                className="primary" 
                                                                                style={{ fontSize: '12px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                                            >
                                                                                <span>🔍</span> BOM 마스터에서 부자재 가져오기
                                                                            </button>
                                                                        </div>
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
                                                                const chId = e.target.value;
                                                                if (chId) {
                                                                    const targetChannel = salesChannels.find(c => String(c.id) === String(chId));
                                                                    if (targetChannel) {
                                                                        syncChannelRulesToSpec(targetChannel, true);
                                                                    }
                                                                }
                                                            }}
                                                            disabled={!canEdit}
                                                            style={{ width: '100%', borderRadius: '6px', padding: '6px', border: '1px solid #93c5fd', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fff', marginBottom: '6px' }}
                                                            value={(formData.channels && formData.channels[0]?.id) || ''}
                                                        >
                                                            <option value="">-- 🌐 유통채널 연계 착인 기준 선택 --</option>
                                                            {salesChannels.map(ch => (
                                                                <option key={ch.id} value={ch.id}>
                                                                    [{ch.name}] {ch.unitBoxMarkingRule ? ch.unitBoxMarkingRule.replace(/\[생산배치번호\]/g, 'LOT(제조번호)').replace(/생산배치번호/g, 'LOT(제조번호)') : (ch.expDateFormat ? `LOT(제조번호) EXP ${ch.expDateFormat}` : '표준 착인')}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <textarea value={currentSpec.containerMarkingText || ''} onChange={e => setCurrentSpec({...currentSpec, containerMarkingText: e.target.value})} disabled={!canEdit} rows={3} style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }} placeholder={'LOT(제조번호)\nEXP YYYYMMDD 까지'} />
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
                                                                const chId = e.target.value;
                                                                if (chId) {
                                                                    const targetChannel = salesChannels.find(c => String(c.id) === String(chId));
                                                                    if (targetChannel) {
                                                                        syncChannelRulesToSpec(targetChannel, true);
                                                                    }
                                                                }
                                                            }}
                                                            disabled={!canEdit}
                                                            style={{ width: '100%', borderRadius: '6px', padding: '6px', border: '1px solid #93c5fd', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fff', marginBottom: '6px' }}
                                                            value={(formData.channels && formData.channels[0]?.id) || ''}
                                                        >
                                                            <option value="">-- 🌐 유통채널 연계 착인 기준 선택 --</option>
                                                            {salesChannels.map(ch => (
                                                                <option key={ch.id} value={ch.id}>
                                                                    [{ch.name}] {ch.unitBoxMarkingRule ? ch.unitBoxMarkingRule.replace(/\[생산배치번호\]/g, 'LOT(제조번호)').replace(/생산배치번호/g, 'LOT(제조번호)') : (ch.expDateFormat ? `LOT(제조번호) EXP ${ch.expDateFormat}` : '표준 착인')}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <textarea value={currentSpec.unitBoxMarkingText || ''} onChange={e => setCurrentSpec({...currentSpec, unitBoxMarkingText: e.target.value})} disabled={!canEdit} rows={3} style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }} placeholder={'LOT(제조번호)\nEXP YYYYMMDD 까지'} />
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
                                                            const hasInb = formData.inboxInfo?.hasInbox !== undefined 
                                                                ? !!formData.inboxInfo.hasInbox 
                                                                : (parseInt(formData.inboxInfo?.inboxQuantity || 0) > 0 || (formData.inboxInfo?.inboxWidth && formData.inboxInfo?.inboxLength && formData.inboxInfo?.inboxHeight));
                                                            const inboxSz = formData.inboxInfo?.inboxWidth && formData.inboxInfo?.inboxLength && formData.inboxInfo?.inboxHeight 
                                                                ? `${formData.inboxInfo.inboxWidth}x${formData.inboxInfo.inboxLength}x${formData.inboxInfo.inboxHeight}` 
                                                                : currentSpec.inboxSize;
                                                            const outboxSz = formData.outboxInfo?.outboxWidth && formData.outboxInfo?.outboxLength && formData.outboxInfo?.outboxHeight 
                                                                ? `${formData.outboxInfo.outboxWidth}x${formData.outboxInfo.outboxLength}x${formData.outboxInfo.outboxHeight}` 
                                                                : currentSpec.outboxSize;
                                                            const palletSz = formData.palletInfo?.palletWidth && formData.palletInfo?.palletLength 
                                                                ? `${formData.palletInfo.palletWidth}x${formData.palletInfo.palletLength}` 
                                                                : currentSpec.palletSize;
                                                                
                                                            const outQty = parseInt(formData.outboxInfo?.outboxQuantity || currentSpec.outboxQty || currentSpec.outboxTotalQty || 0);
                                                            const inQty = parseInt(formData.inboxInfo?.inboxQuantity || currentSpec.inboxQty || 0);
                                                            let obInbQty = parseInt(currentSpec.outboxInboxQty || 0);
                                                            if (hasInb && inQty > 0 && outQty > 0) {
                                                                obInbQty = Math.max(1, Math.round(outQty / inQty));
                                                            }
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
                                                                inboxUseYn: hasInb ? 'O' : 'X',
                                                                inboxQty: inQty || currentSpec.inboxQty,
                                                                inboxSize: inboxSz,
                                                                outboxInboxQty: obInbQty || currentSpec.outboxInboxQty,
                                                                outboxQty: outQty || currentSpec.outboxQty,
                                                                outboxTotalQty: outQty || currentSpec.outboxTotalQty,
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

                                                    {currentSpec.inboxUseYn === 'O' ? (
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
                                                                <label style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontWeight: 'bold' }}>사이즈 (장x폭x고 mm)</span>
                                                                    {formData.inboxInfo?.inboxWidth && formData.inboxInfo?.inboxLength && formData.inboxInfo?.inboxHeight && (
                                                                        <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'normal' }}>
                                                                            (상세정보: {formData.inboxInfo.inboxWidth}x{formData.inboxInfo.inboxLength}x{formData.inboxInfo.inboxHeight})
                                                                        </span>
                                                                    )}
                                                                </label>
                                                                <input 
                                                                    type="text" 
                                                                    value={currentSpec.inboxSize || ''} 
                                                                    onChange={e => setCurrentSpec({...currentSpec, inboxSize: e.target.value})} 
                                                                    disabled={!canEdit} 
                                                                    style={{ fontSize: '13px', padding: '6px 8px' }} 
                                                                    placeholder="예: 300x200x150" 
                                                                />
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
                                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <span>📥 인박스 입수 규격 (열 × 행 × 단)</span>
                                                                    <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 'normal' }}>
                                                                        단상자 {currentSpec.inboxQty || (currentSpec.inboxPackingCols && currentSpec.inboxPackingRows && currentSpec.inboxPackingLayers ? currentSpec.inboxPackingCols * currentSpec.inboxPackingRows * currentSpec.inboxPackingLayers : 0)}개입
                                                                    </span>
                                                                </label>
                                                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                                                                    💡 인박스 내에 단상자를 가로(열)×세로(행)×높이(단)으로 적재하는 규격입니다.
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="열(가로)"
                                                                        value={currentSpec.inboxPackingCols !== undefined && currentSpec.inboxPackingCols !== null && currentSpec.inboxPackingCols !== '' ? currentSpec.inboxPackingCols : (parseArrangementPattern(currentSpec.inboxPackingPattern)?.cols ?? '')}
                                                                        onChange={e => handleUpdateInboxDimensions('cols', e.target.value)}
                                                                        disabled={!canEdit}
                                                                        style={{ flex: 1, minWidth: 0, fontSize: '13px', padding: '6px 8px', textAlign: 'center', borderColor: '#c4b5fd' }}
                                                                    />
                                                                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>×</span>
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="행(세로)"
                                                                        value={currentSpec.inboxPackingRows !== undefined && currentSpec.inboxPackingRows !== null && currentSpec.inboxPackingRows !== '' ? currentSpec.inboxPackingRows : (parseArrangementPattern(currentSpec.inboxPackingPattern)?.rows ?? '')}
                                                                        onChange={e => handleUpdateInboxDimensions('rows', e.target.value)}
                                                                        disabled={!canEdit}
                                                                        style={{ flex: 1, minWidth: 0, fontSize: '13px', padding: '6px 8px', textAlign: 'center', borderColor: '#c4b5fd' }}
                                                                    />
                                                                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>×</span>
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="단(높이)"
                                                                        value={currentSpec.inboxPackingLayers !== undefined && currentSpec.inboxPackingLayers !== null && currentSpec.inboxPackingLayers !== '' ? currentSpec.inboxPackingLayers : (parseArrangementPattern(currentSpec.inboxPackingPattern)?.layers ?? '')}
                                                                        onChange={e => handleUpdateInboxDimensions('layers', e.target.value)}
                                                                        disabled={!canEdit}
                                                                        style={{ flex: 1, minWidth: 0, fontSize: '13px', padding: '6px 8px', textAlign: 'center', borderColor: '#c4b5fd' }}
                                                                    />
                                                                </div>
                                                            </div>

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
                                                                        value={extractDateFormatPart(currentSpec.inboxDateFormat, 'mfg') || ''}
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
                                                                        <option value="YYYY.MM.DD">YYYY.MM.DD</option>
                                                                        <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                                                                        <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                                                                    </select>
                                                                    <select
                                                                        value={extractDateFormatPart(currentSpec.inboxDateFormat, 'exp') || ''}
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
                                                                        <option value="YYYY.MM.DD까지">YYYY.MM.DD까지</option>
                                                                        <option value="MM-DD-YYYY까지">MM-DD-YYYY까지</option>
                                                                        <option value="DD.MM.YYYY까지">DD.MM.YYYY까지</option>
                                                                        <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                                    </select>
                                                                </div>
                                                                <textarea value={currentSpec.inboxDateFormat || ''} onChange={e => setCurrentSpec({...currentSpec, inboxDateFormat: e.target.value})} disabled={!canEdit} rows={3} style={{ fontSize: '13px', padding: '6px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="인박스 현품표 날짜 표기양식 (3줄 작성)" />
                                                            </div>

                                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                                <label style={{ fontSize: '13px' }}>비고 (3줄 규격)</label>
                                                                <textarea value={currentSpec.inboxRemarks || ''} onChange={e => setCurrentSpec({...currentSpec, inboxRemarks: e.target.value})} disabled={!canEdit} rows={3} style={{ fontSize: '13px', padding: '6px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="인박스 관련 특이사항 (3줄 작성)" />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div style={{ padding: '12px 14px', background: '#f1f5f9', borderRadius: '6px', color: '#64748b', fontSize: '12.5px', marginTop: '6px', border: '1px dashed #cbd5e1' }}>
                                                            💡 <strong>인박스 미사용(X)</strong> 설정 품목입니다. (인박스 포장수량 및 현품표/날짜 표기양식 항목이 비활성화됩니다.)
                                                        </div>
                                                    )}
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
                                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <span>📦 아웃박스 내 인박스 입수 규격 (열 × 행 × 단)</span>
                                                                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'normal' }}>
                                                                        인박스 {currentSpec.outboxInboxQty || (currentSpec.outboxPackingCols && currentSpec.outboxPackingRows && currentSpec.outboxPackingLayers ? currentSpec.outboxPackingCols * currentSpec.outboxPackingRows * currentSpec.outboxPackingLayers : 0)}박스입
                                                                    </span>
                                                                </label>
                                                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                                                                    💡 아웃박스 안에 인박스를 가로(열)×세로(행)×높이(단)으로 적재하는 규격입니다.
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="열(가로)"
                                                                        value={currentSpec.outboxPackingCols !== undefined && currentSpec.outboxPackingCols !== null && currentSpec.outboxPackingCols !== '' ? currentSpec.outboxPackingCols : (parseArrangementPattern(currentSpec.outboxPackingPattern)?.cols ?? '')}
                                                                        onChange={e => handleUpdateOutboxDimensions('cols', e.target.value, true)}
                                                                        disabled={!canEdit}
                                                                        style={{ flex: 1, minWidth: 0, fontSize: '13px', padding: '6px 8px', textAlign: 'center', borderColor: '#93c5fd' }}
                                                                    />
                                                                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>×</span>
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="행(세로)"
                                                                        value={currentSpec.outboxPackingRows !== undefined && currentSpec.outboxPackingRows !== null && currentSpec.outboxPackingRows !== '' ? currentSpec.outboxPackingRows : (parseArrangementPattern(currentSpec.outboxPackingPattern)?.rows ?? '')}
                                                                        onChange={e => handleUpdateOutboxDimensions('rows', e.target.value, true)}
                                                                        disabled={!canEdit}
                                                                        style={{ flex: 1, minWidth: 0, fontSize: '13px', padding: '6px 8px', textAlign: 'center', borderColor: '#93c5fd' }}
                                                                    />
                                                                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>×</span>
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="단(높이)"
                                                                        value={currentSpec.outboxPackingLayers !== undefined && currentSpec.outboxPackingLayers !== null && currentSpec.outboxPackingLayers !== '' ? currentSpec.outboxPackingLayers : (parseArrangementPattern(currentSpec.outboxPackingPattern)?.layers ?? '')}
                                                                        onChange={e => handleUpdateOutboxDimensions('layers', e.target.value, true)}
                                                                        disabled={!canEdit}
                                                                        style={{ flex: 1, minWidth: 0, fontSize: '13px', padding: '6px 8px', textAlign: 'center', borderColor: '#93c5fd' }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
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
                                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <span>📦 아웃박스 내 단상자 입수 규격 (열 × 행 × 단)</span>
                                                                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'normal' }}>
                                                                        단상자 {currentSpec.outboxQty || (currentSpec.outboxPackingCols && currentSpec.outboxPackingRows && currentSpec.outboxPackingLayers ? currentSpec.outboxPackingCols * currentSpec.outboxPackingRows * currentSpec.outboxPackingLayers : 0)}개입
                                                                    </span>
                                                                </label>
                                                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                                                                    💡 인박스 없이 아웃박스 내에 단상자를 가로(열)×세로(행)×높이(단)으로 직적재하는 규격입니다.
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="열(가로)"
                                                                        value={currentSpec.outboxPackingCols !== undefined && currentSpec.outboxPackingCols !== null && currentSpec.outboxPackingCols !== '' ? currentSpec.outboxPackingCols : (parseArrangementPattern(currentSpec.outboxPackingPattern)?.cols ?? '')}
                                                                        onChange={e => handleUpdateOutboxDimensions('cols', e.target.value, false)}
                                                                        disabled={!canEdit}
                                                                        style={{ flex: 1, minWidth: 0, fontSize: '13px', padding: '6px 8px', textAlign: 'center', borderColor: '#93c5fd' }}
                                                                    />
                                                                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>×</span>
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="행(세로)"
                                                                        value={currentSpec.outboxPackingRows !== undefined && currentSpec.outboxPackingRows !== null && currentSpec.outboxPackingRows !== '' ? currentSpec.outboxPackingRows : (parseArrangementPattern(currentSpec.outboxPackingPattern)?.rows ?? '')}
                                                                        onChange={e => handleUpdateOutboxDimensions('rows', e.target.value, false)}
                                                                        disabled={!canEdit}
                                                                        style={{ flex: 1, minWidth: 0, fontSize: '13px', padding: '6px 8px', textAlign: 'center', borderColor: '#93c5fd' }}
                                                                    />
                                                                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>×</span>
                                                                    <input 
                                                                        type="number" 
                                                                        placeholder="단(높이)"
                                                                        value={currentSpec.outboxPackingLayers !== undefined && currentSpec.outboxPackingLayers !== null && currentSpec.outboxPackingLayers !== '' ? currentSpec.outboxPackingLayers : (parseArrangementPattern(currentSpec.outboxPackingPattern)?.layers ?? '')}
                                                                        onChange={e => handleUpdateOutboxDimensions('layers', e.target.value, false)}
                                                                        disabled={!canEdit}
                                                                        style={{ flex: 1, minWidth: 0, fontSize: '13px', padding: '6px 8px', textAlign: 'center', borderColor: '#93c5fd' }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span>사이즈 (장x폭x고 mm)</span>
                                                            {formData.outboxInfo?.outboxWidth && formData.outboxInfo?.outboxLength && formData.outboxInfo?.outboxHeight && (
                                                                <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'normal' }}>
                                                                    (상세정보: {formData.outboxInfo.outboxWidth}x{formData.outboxInfo.outboxLength}x{formData.outboxInfo.outboxHeight})
                                                                </span>
                                                            )}
                                                        </label>
                                                        <input type="text" value={currentSpec.outboxSize || ''} onChange={e => setCurrentSpec({...currentSpec, outboxSize: e.target.value})} disabled={!canEdit} style={{ fontSize: '13px', padding: '6px 8px' }} placeholder="예: 600x400x300" />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px' }}>재질 (기본: KLB.S.S.K.K)</label>
                                                        <input type="text" value={currentSpec.outboxMaterial || 'KLB.S.S.K.K'} onChange={e => setCurrentSpec({...currentSpec, outboxMaterial: e.target.value})} disabled={!canEdit} style={{ fontSize: '13px', padding: '6px 8px' }} />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#7c3aed' }}>🏷️ 채널스티커 (채널 자동 매칭 - 수정 불가)</label>
                                                        <input type="text" value={currentSpec.outboxChannelStickerStandard || ''} readOnly style={{ fontSize: '13px', padding: '6px 8px', background: '#e2e8f0', color: '#334155', cursor: 'not-allowed' }} placeholder="채널 선택 시 자동 반영" />
                                                        {channelStickerInfo?.fileUrl && (
                                                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px' }}>
                                                                {channelStickerInfo.fileType === 'PDF' || channelStickerInfo.fileUrl.toLowerCase().endsWith('.pdf') ? (
                                                                    <div 
                                                                        style={{ width: '48px', height: '48px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '11px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                                                                        onClick={() => setPreviewStickerFile({ url: getFullFileUrl(channelStickerInfo.fileUrl), type: 'PDF' })}
                                                                        title="클릭 시 크게보기"
                                                                    >
                                                                        📄 PDF
                                                                    </div>
                                                                ) : (
                                                                    <img
                                                                        src={getFullFileUrl(channelStickerInfo.fileUrl)}
                                                                        alt="채널 스티커 규정"
                                                                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: '#fff', flexShrink: 0 }}
                                                                        onClick={() => setPreviewStickerFile({ url: getFullFileUrl(channelStickerInfo.fileUrl), type: 'IMAGE' })}
                                                                        title="클릭 시 크게보기"
                                                                    />
                                                                )}
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <span>📷 채널 스티커 규정 이미지/문서 첨부됨</span>
                                                                    </div>
                                                                    {channelStickerInfo.noteContent && (
                                                                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', whiteSpace: 'pre-line', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                                            {channelStickerInfo.noteContent}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewStickerFile({ url: getFullFileUrl(channelStickerInfo.fileUrl), type: channelStickerInfo.fileType || (channelStickerInfo.fileUrl.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMAGE') })}
                                                                    style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '600', color: '#6d28d9', backgroundColor: '#fff', border: '1px solid #c4b5fd', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                                >
                                                                    👁️ 크게보기
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: '8px' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#0284c7' }}>🎈 빈공간 완충재 처리 기준 (채널 자동 매칭 - 수정 불가)</label>
                                                        <input type="text" value={currentSpec.outboxCushioningStandard || ''} readOnly style={{ fontSize: '13px', padding: '6px 8px', background: '#e2e8f0', color: '#334155', cursor: 'not-allowed' }} placeholder="채널 선택 시 자동 반영" />
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
                                                                value={extractDateFormatPart(currentSpec.outboxDateFormat, 'mfg') || ''}
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
                                                                <option value="YYYY.MM.DD">YYYY.MM.DD</option>
                                                                <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                                                                <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                                                            </select>
                                                            <select
                                                                value={extractDateFormatPart(currentSpec.outboxDateFormat, 'exp') || ''}
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
                                                                <option value="YYYY.MM.DD까지">YYYY.MM.DD까지</option>
                                                                <option value="MM-DD-YYYY까지">MM-DD-YYYY까지</option>
                                                                <option value="DD.MM.YYYY까지">DD.MM.YYYY까지</option>
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
                                                        <input 
                                                            type="text" 
                                                            value={formatPalletTypeDisplay()} 
                                                            readOnly 
                                                            style={{ fontSize: '13px', padding: '6px 8px', background: '#e2e8f0', color: '#1e293b', fontWeight: 'bold', cursor: 'not-allowed' }} 
                                                            placeholder="채널 선택 시 자동 반영" 
                                                        />
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
                                                            <option value="팔레트 랩핑 후 전면 1면 현품표 부착 (제조일자, 사용기한 필수)">팔레트 랩핑 후 전면 1면 현품표 부착 (제조일자, 사용기한 필수)</option>
                                                            <option value="현품표 사용기한(Exp. Date) 항목 표기 안함">현품표 사용기한(Exp. Date) 항목 표기 안함</option>
                                                            <option value="그 외">그 외 (직접 입력)</option>
                                                        </select>
                                                        <textarea value={currentSpec.palletLabelMarkingRule || ''} onChange={e => setCurrentSpec({...currentSpec, palletLabelMarkingRule: e.target.value})} disabled={!canEdit} rows={2} style={{ fontSize: '13px', padding: '6px 8px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="팔레트 현품표 부착/착인 기준" />
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8' }}>🏷️ 팔레트 날짜 표기양식 (제조일자/사용기한)</label>
                                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                                            <select
                                                                value={extractDateFormatPart(currentSpec.palletDateFormat, 'mfg') || ''}
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
                                                                <option value="YYYY.MM.DD">YYYY.MM.DD</option>
                                                                <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                                                                <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                                                            </select>
                                                            <select
                                                                value={extractDateFormatPart(currentSpec.palletDateFormat, 'exp') || ''}
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
                                                                <option value="YYYY.MM.DD까지">YYYY.MM.DD까지</option>
                                                                <option value="MM-DD-YYYY까지">MM-DD-YYYY까지</option>
                                                                <option value="DD.MM.YYYY까지">DD.MM.YYYY까지</option>
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

                                        {/* 3D 제품 입수 및 팔레트 적재 시뮬레이션 섹션 */}
                                        {(() => {
                                            const uBox = get3DUnitBoxDims();
                                            const oBox = get3DOutboxDims();
                                            const iBox = get3DInboxDims();
                                            const pBox = get3DPalletDims();
                                            const hasInbox = currentSpec.inboxUseYn === 'O';
                                            const totalProductQty = parseInt(currentSpec.outboxQty || currentSpec.outboxTotalQty || 40, 10) || 40;
                                            const inboxQty = parseInt(currentSpec.inboxQty || 10, 10) || 10;
                                            const outboxInboxesQty = hasInbox ? Math.max(1, Math.round(totalProductQty / inboxQty)) : totalProductQty;
                                            const palletStacks = parseInt(currentSpec.palletTierCount || 8, 10) || 8;
                                            const isCornerPostActive = currentSpec.cornerPostUseYn === 'O' || Boolean(formData?.channels?.[0]?.padAndFrameRequired);

                                            // 아웃박스 입수 배열 옵션 (인박스 사용 시 인박스 수량 기준, 미사용 시 단상자 수량 기준)
                                            const outboxContainerBox = oBox;
                                            const outboxUnitBox = hasInbox ? iBox : uBox;
                                            const outboxOptions = generateArrangementOptions(outboxInboxesQty, 5, outboxUnitBox, outboxContainerBox);
                                            const savedOutboxMatch = currentSpec.outboxPackingPattern ? outboxOptions.find(o => currentSpec.outboxPackingPattern.includes(`${o.cols}열`) && currentSpec.outboxPackingPattern.includes(`${o.rows}행`)) : null;
                                            const bestOutboxOpt = outboxOptions.find(o => o.status === 'ok') || outboxOptions.find(o => o.status === 'warn') || outboxOptions[0] || (hasInbox ? { cols: 2, rows: 2, layers: 1, status: 'ok' } : { cols: 4, rows: 5, layers: 2, status: 'ok' });
                                            const curOutboxArrangement = selectedOutboxArrangement || savedOutboxMatch || bestOutboxOpt;

                                            // 인박스 입수 배열 옵션
                                            const inboxOptions = generateArrangementOptions(inboxQty, 5, uBox, iBox);
                                            const savedInboxMatch = currentSpec.inboxPackingPattern ? inboxOptions.find(o => currentSpec.inboxPackingPattern.includes(`${o.cols}열`) && currentSpec.inboxPackingPattern.includes(`${o.rows}행`)) : null;
                                            const bestInboxOpt = inboxOptions.find(o => o.status === 'ok') || inboxOptions.find(o => o.status === 'warn') || inboxOptions[0] || { cols: 2, rows: 5, layers: 1, status: 'ok' };
                                            const curInboxArrangement = selectedInboxArrangement || savedInboxMatch || bestInboxOpt;

                                            // 팔레트 적재 패턴 목록
                                            const allPalletPatterns = calcAllPalletPatterns(oBox.w, oBox.d, pBox.w, pBox.d);
                                            const savedPalletMatch = currentSpec.palletStackingPattern 
                                                ? allPalletPatterns.find(p => 
                                                    currentSpec.palletStackingPattern.includes(p.name) || 
                                                    currentSpec.palletStackingPattern.includes(p.label) ||
                                                    (currentSpec.palletStackingPattern.includes('8방') && p.id === '8pin') ||
                                                    (currentSpec.palletStackingPattern.includes('4방') && p.id === '4pin') ||
                                                    (currentSpec.palletStackingPattern.includes('벽돌') && p.id === 'brick') ||
                                                    (currentSpec.palletStackingPattern.includes('격자') && p.id.includes('grid'))
                                                  ) 
                                                : null;
                                            const bestPalletOpt = allPalletPatterns.find(p => p.status === 'ok') || allPalletPatterns[0] || null;
                                            const curPalletPattern = selectedPalletPattern || savedPalletMatch || bestPalletOpt;

                                            const filteredPatterns = allPalletPatterns.filter(p => {
                                                if (palletCategoryTab === 'all') return true;
                                                if (palletCategoryTab === 'pinwheel') return p.category === 'pinwheel';
                                                if (palletCategoryTab === 'grid') return p.category === 'grid';
                                                if (palletCategoryTab === 'brick') return p.category === 'brick' || p.category === 'mix';
                                                return true;
                                            });

                                            // 유효성 검증: 인박스 사용 시 아웃박스는 인박스 규격(iBox)과 비교, 미사용 시 단상자(uBox)와 비교
                                            const outboxValidation = validateArrangement(outboxUnitBox, outboxContainerBox, curOutboxArrangement, { w: 0, d: 0, h: 0 });
                                            const inboxValidation = validateInboxArrangement(uBox, iBox, curInboxArrangement, { w: 0, d: 0, h: 0 });

                                            return (
                                                <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid #c7d2fe', borderRadius: '12px', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', boxShadow: '0 4px 12px rgba(79,70,229,0.05)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                                        <div>
                                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span>🔲 3D 제품 입수 및 팔레트 적재 시뮬레이션</span>
                                                                <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Three.js 3D 엔진</span>
                                                            </h3>
                                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                                                {hasInbox 
                                                                    ? `단상자(${uBox.w}×${uBox.d}×${uBox.h}mm) → 인박스(${iBox.w}×${iBox.d}×${iBox.h}mm) → 아웃박스(${oBox.w}×${oBox.d}×${oBox.h}mm) → 팔레트(${pBox.w}×${pBox.d}mm)`
                                                                    : `단상자(${uBox.w}×${uBox.d}×${uBox.h}mm) → 아웃박스(${oBox.w}×${oBox.d}×${oBox.h}mm) → 팔레트(${pBox.w}×${pBox.d}mm)`
                                                                }
                                                            </div>
                                                        </div>

                                                        {/* 모드 탭 (아웃박스 / 인박스 / 팔레트) */}
                                                        <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px', gap: '4px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSim3DTab('outbox')}
                                                                style={{
                                                                    border: 'none',
                                                                    background: sim3DTab === 'outbox' ? '#2563eb' : 'transparent',
                                                                    color: sim3DTab === 'outbox' ? '#ffffff' : '#475569',
                                                                    fontWeight: sim3DTab === 'outbox' ? 'bold' : 'normal',
                                                                    padding: '6px 14px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '12px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s'
                                                                }}
                                                            >
                                                                📦 아웃박스 3D {hasInbox && '(인박스 입수)'}
                                                            </button>
                                                            {hasInbox && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSim3DTab('inbox')}
                                                                    style={{
                                                                        border: 'none',
                                                                        background: sim3DTab === 'inbox' ? '#7c3aed' : 'transparent',
                                                                        color: sim3DTab === 'inbox' ? '#ffffff' : '#475569',
                                                                        fontWeight: sim3DTab === 'inbox' ? 'bold' : 'normal',
                                                                        padding: '6px 14px',
                                                                        borderRadius: '6px',
                                                                        fontSize: '12px',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                >
                                                                    📥 인박스 3D (단상자 입수)
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => setSim3DTab('pallet')}
                                                                style={{
                                                                    border: 'none',
                                                                    background: sim3DTab === 'pallet' ? '#d97706' : 'transparent',
                                                                    color: sim3DTab === 'pallet' ? '#ffffff' : '#475569',
                                                                    fontWeight: sim3DTab === 'pallet' ? 'bold' : 'normal',
                                                                    padding: '6px 14px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '12px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s'
                                                                }}
                                                            >
                                                                🏗️ 팔레트 3D 적재
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* 본문 그리드 (왼쪽: 440px 고정 설정 패널, 오른쪽: 1fr 동적 3D 뷰어 공간) */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: '440px 1fr', gap: '16px', alignItems: 'start' }}>
                                                        
                                                        {/* 왼쪽: 입수 배열 / 적재 패턴 선택 패널 (440px 고정) */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '440px' }}>
                                                            
                                                            {/* 1. 아웃박스 탭일 때 */}
                                                            {sim3DTab === 'outbox' && (
                                                                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
                                                                        <strong style={{ fontSize: '13px', color: '#1e293b', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            {hasInbox 
                                                                                ? `📐 인박스 ${outboxInboxesQty}박스 추천 배열 (${outboxInboxesQty * inboxQty}개입)`
                                                                                : `📐 총 입수량 ${totalProductQty}개 기준 추천 배열`
                                                                            }
                                                                        </strong>
                                                                        <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>선택 시 3D 즉시 갱신</span>
                                                                    </div>

                                                                    {/* 자동 생성된 입수 배열 버튼들 */}
                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
                                                                        {outboxOptions.slice(0, 6).map((opt, idx) => {
                                                                            const isSel = curOutboxArrangement.cols === opt.cols && curOutboxArrangement.rows === opt.rows && curOutboxArrangement.layers === opt.layers;
                                                                            const v = validateArrangement(outboxUnitBox, outboxContainerBox, opt, { w: 0, d: 0, h: 0 });
                                                                            const isOk = v.status === 'ok';
                                                                            const isWarn = v.status === 'warn';
                                                                            return (
                                                                                <button
                                                                                    key={idx}
                                                                                    type="button"
                                                                                    onClick={() => handleSelectOutboxArrangementWithConfirm(opt, curOutboxArrangement, hasInbox, inboxQty)}
                                                                                    style={{
                                                                                        textAlign: 'left',
                                                                                        padding: '8px 10px',
                                                                                        borderRadius: '8px',
                                                                                        border: isSel ? '2px solid #2563eb' : (isOk ? '1px solid #cbd5e1' : '1px dashed #cbd5e1'),
                                                                                        background: isSel ? '#eff6ff' : '#ffffff',
                                                                                        cursor: 'pointer',
                                                                                        position: 'relative'
                                                                                    }}
                                                                                >
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: isSel ? '#1d4ed8' : '#1e293b' }}>
                                                                                            {opt.cols}열 × {opt.rows}행 × {opt.layers}단
                                                                                        </div>
                                                                                        <span style={{
                                                                                            fontSize: '10px',
                                                                                            padding: '1px 6px',
                                                                                            borderRadius: '4px',
                                                                                            fontWeight: 'bold',
                                                                                            background: isOk ? '#dcfce7' : (isWarn ? '#fef3c7' : '#fee2e2'),
                                                                                            color: isOk ? '#15803d' : (isWarn ? '#b45309' : '#b91c1c'),
                                                                                            border: isOk ? '1px solid #86efac' : (isWarn ? '1px solid #fde68a' : '1px solid #fca5a5')
                                                                                        }}>
                                                                                            {isOk ? '✓ 적합' : (isWarn ? '⚠️ 주의' : '✕ 초과')}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                                                        {hasInbox ? `인박스 ${opt.qty}박스 (총 ${opt.qty * inboxQty}개)` : `단상자 ${opt.qty}개`}
                                                                                    </div>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>


                                                                    {/* 유효성 검증 메시지 */}
                                                                    <div style={{ marginTop: '12px' }}>
                                                                        {outboxValidation.valid ? (
                                                                            <div style={{ padding: '8px 10px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '12px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <span>✅</span>
                                                                                <span><strong>아웃박스 규격 적합:</strong> 필요치수 {Math.round(outboxValidation.actualNeeded?.w)}×{Math.round(outboxValidation.actualNeeded?.d)}×{Math.round(outboxValidation.actualNeeded?.h)}mm ≤ 박스 {oBox.w}×{oBox.d}×{oBox.h}mm</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ padding: '8px 10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '12px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <span>⚠️</span>
                                                                                <span><strong>{outboxValidation.reason}</strong></span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* 2. 인박스 탭일 때 */}
                                                            {sim3DTab === 'inbox' && (
                                                                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
                                                                        <strong style={{ fontSize: '13px', color: '#1e293b', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            📥 인박스 입수량 {inboxQty}개 기준 추천 배열
                                                                        </strong>
                                                                        <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>선택 시 3D 즉시 갱신</span>
                                                                    </div>

                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
                                                                        {inboxOptions.slice(0, 6).map((opt, idx) => {
                                                                            const isSel = curInboxArrangement.cols === opt.cols && curInboxArrangement.rows === opt.rows && curInboxArrangement.layers === opt.layers;
                                                                            const v = validateInboxArrangement(uBox, iBox, opt, { w: 0, d: 0, h: 0 });
                                                                            const isOk = v.status === 'ok';
                                                                            const isWarn = v.status === 'warn';
                                                                            return (
                                                                                <button
                                                                                    key={idx}
                                                                                    type="button"
                                                                                    onClick={() => handleSelectInboxArrangementWithConfirm(opt, curInboxArrangement)}
                                                                                    style={{
                                                                                        textAlign: 'left',
                                                                                        padding: '8px 10px',
                                                                                        borderRadius: '8px',
                                                                                        border: isSel ? '2px solid #7c3aed' : (isOk ? '1px solid #cbd5e1' : '1px dashed #cbd5e1'),
                                                                                        background: isSel ? '#f5f3ff' : '#ffffff',
                                                                                        cursor: 'pointer'
                                                                                    }}
                                                                                >
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: isSel ? '#6d28d9' : '#1e293b' }}>
                                                                                            {opt.cols}열 × {opt.rows}행 × {opt.layers}단
                                                                                        </div>
                                                                                        <span style={{
                                                                                            fontSize: '10px',
                                                                                            padding: '1px 6px',
                                                                                            borderRadius: '4px',
                                                                                            fontWeight: 'bold',
                                                                                            background: isOk ? '#dcfce7' : (isWarn ? '#fef3c7' : '#fee2e2'),
                                                                                            color: isOk ? '#15803d' : (isWarn ? '#b45309' : '#b91c1c'),
                                                                                            border: isOk ? '1px solid #86efac' : (isWarn ? '1px solid #fde68a' : '1px solid #fca5a5')
                                                                                        }}>
                                                                                            {isOk ? '✓ 적합' : (isWarn ? '⚠️ 주의' : '✕ 초과')}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                                                        단상자 {opt.qty}개입
                                                                                    </div>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    <div>
                                                                        {inboxValidation.valid ? (
                                                                            <div style={{ padding: '8px 10px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '12px', color: '#15803d' }}>
                                                                                ✅ <strong>인박스 내부 공간 적합</strong> (필요치수 {Math.round(inboxValidation.actualNeeded?.w)}×{Math.round(inboxValidation.actualNeeded?.d)}×{Math.round(inboxValidation.actualNeeded?.h)}mm ≤ 박스 {iBox.w}×{iBox.d}×{iBox.h}mm)
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ padding: '8px 10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '12px', color: '#b91c1c' }}>
                                                                                ⚠️ <strong>{inboxValidation.reason}</strong>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* 3. 팔레트 탭일 때 */}
                                                            {sim3DTab === 'pallet' && (
                                                                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                                                                        <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                                                                            🏗️ 팔레트 적재 패턴 선택 (총 {filteredPatterns.length}개)
                                                                        </strong>

                                                                        {/* 교차 vs 일반 적재 토글 */}
                                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setPallet3DMode('pallet-cross')}
                                                                                style={{
                                                                                    padding: '3px 8px',
                                                                                    borderRadius: '4px',
                                                                                    fontSize: '11px',
                                                                                    fontWeight: 600,
                                                                                    border: '1px solid #cbd5e1',
                                                                                    background: pallet3DMode === 'pallet-cross' ? '#d97706' : '#ffffff',
                                                                                    color: pallet3DMode === 'pallet-cross' ? '#ffffff' : '#475569',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            >
                                                                                🔀 교차적재
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setPallet3DMode('pallet-normal')}
                                                                                style={{
                                                                                    padding: '3px 8px',
                                                                                    borderRadius: '4px',
                                                                                    fontSize: '11px',
                                                                                    fontWeight: 600,
                                                                                    border: '1px solid #cbd5e1',
                                                                                    background: pallet3DMode === 'pallet-normal' ? '#d97706' : '#ffffff',
                                                                                    color: pallet3DMode === 'pallet-normal' ? '#ffffff' : '#475569',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            >
                                                                                ⏸️ 일반적재
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* 팔레트 카테고리 필터 탭 */}
                                                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                                                        {[
                                                                            { id: 'all', label: '전체' },
                                                                            { id: 'pinwheel', label: '🌀 핀휠 (4/8/12/16/20/24)' },
                                                                            { id: 'grid', label: '📐 격자 (6/8/12/16)' },
                                                                            { id: 'brick', label: '🧱 벽돌/혼합' }
                                                                        ].map(c => (
                                                                            <button
                                                                                key={c.id}
                                                                                type="button"
                                                                                onClick={() => setPalletCategoryTab(c.id)}
                                                                                style={{
                                                                                    padding: '3px 8px',
                                                                                    borderRadius: '12px',
                                                                                    fontSize: '11px',
                                                                                    fontWeight: palletCategoryTab === c.id ? 'bold' : 'normal',
                                                                                    background: palletCategoryTab === c.id ? '#fef3c7' : '#f1f5f9',
                                                                                    color: palletCategoryTab === c.id ? '#b45309' : '#64748b',
                                                                                    border: palletCategoryTab === c.id ? '1px solid #fcd34d' : '1px solid transparent',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            >
                                                                                {c.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>

                                                                    {/* 패턴 카드 목록 */}
                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                                                                        {filteredPatterns.map((pat, idx) => {
                                                                            const isSel = curPalletPattern?.name === pat.name;
                                                                            const isOk = pat.status === 'ok';
                                                                            const isWarn = pat.status === 'warn';
                                                                            return (
                                                                                <button
                                                                                    key={idx}
                                                                                    type="button"
                                                                                    disabled={pat.status === 'ng'}
                                                                                    onClick={() => handleSelectPalletPatternWithConfirm(pat, pallet3DMode, palletStacks, totalProductQty)}
                                                                                    style={{
                                                                                        textAlign: 'left',
                                                                                        padding: '8px',
                                                                                        borderRadius: '8px',
                                                                                        border: isSel ? '2px solid #d97706' : '1px solid #cbd5e1',
                                                                                        background: isSel ? '#fffbeb' : (pat.status === 'ng' ? '#f8fafc' : '#ffffff'),
                                                                                        opacity: pat.status === 'ng' ? 0.45 : 1,
                                                                                        cursor: pat.status === 'ng' ? 'not-allowed' : 'pointer'
                                                                                    }}
                                                                                >
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: isSel ? '#b45309' : '#1e293b' }}>
                                                                                            {pat.label || pat.name}
                                                                                        </span>
                                                                                        <span style={{
                                                                                            fontSize: '10px',
                                                                                            padding: '1px 6px',
                                                                                            borderRadius: '4px',
                                                                                            fontWeight: 'bold',
                                                                                            background: isOk ? '#dcfce7' : (isWarn ? '#fef3c7' : '#fee2e2'),
                                                                                            color: isOk ? '#15803d' : (isWarn ? '#b45309' : '#b91c1c'),
                                                                                            border: isOk ? '1px solid #86efac' : (isWarn ? '1px solid #fde68a' : '1px solid #fca5a5')
                                                                                        }}>
                                                                                            {pat.statusLabel}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                                                                                        1단 <strong>{pat.count}박스</strong> (fp: {Math.round(pat.fp)}mm)
                                                                                    </div>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* 🛠️ 3D 시각화 옵션: POP, 비닐에어캡, 코너 각대 (여유로운 카드 레이아웃) */}
                                                            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px 14px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span>🛠️ 3D 시각화 고급 옵션</span>
                                                                    </span>
                                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                                                                        포장사양서 3D 캡처 자동 연동
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {/* 1. 단상자 POP 적용 토글 & 높이 */}
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#b45309' }}>🏷️ POP 동봉 (마주보기)</span>
                                                                            {(currentSpec.popUseYn === 'O' || (currentSpec.popRequiredStandard && !currentSpec.popRequiredStandard.includes('해당 없음') && currentSpec.popRequiredStandard.includes('POP'))) && (
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>높이:</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        value={currentSpec.popHeight ?? 15}
                                                                                        onChange={(e) => {
                                                                                            const val = Number(e.target.value);
                                                                                            setCurrentSpec(prev => ({ ...prev, popHeight: val }));
                                                                                        }}
                                                                                        disabled={!canEdit}
                                                                                        style={{ width: '45px', padding: '2px 4px', fontSize: '11px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold', color: '#e11d48', background: '#fff' }}
                                                                                    />
                                                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>mm</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const isPop = currentSpec.popUseYn !== 'O' && !(currentSpec.popRequiredStandard && !currentSpec.popRequiredStandard.includes('해당 없음') && currentSpec.popRequiredStandard.includes('POP'));
                                                                                setCurrentSpec(prev => ({
                                                                                    ...prev,
                                                                                    popUseYn: isPop ? 'O' : 'X',
                                                                                    popHeight: prev.popHeight || 15,
                                                                                    popRequiredStandard: isPop ? (prev.popRequiredStandard && !prev.popRequiredStandard.includes('해당 없음') ? prev.popRequiredStandard : 'POP 부착/동봉 필수') : '해당 없음 (POP 미동봉)'
                                                                                }));
                                                                            }}
                                                                            disabled={!canEdit}
                                                                            style={{
                                                                                padding: '4px 10px',
                                                                                fontSize: '11px',
                                                                                fontWeight: 'bold',
                                                                                borderRadius: '6px',
                                                                                border: 'none',
                                                                                background: (currentSpec.popUseYn === 'O' || (currentSpec.popRequiredStandard && !currentSpec.popRequiredStandard.includes('해당 없음') && currentSpec.popRequiredStandard.includes('POP'))) ? '#e11d48' : '#e2e8f0',
                                                                                color: (currentSpec.popUseYn === 'O' || (currentSpec.popRequiredStandard && !currentSpec.popRequiredStandard.includes('해당 없음') && currentSpec.popRequiredStandard.includes('POP'))) ? '#ffffff' : '#64748b',
                                                                                cursor: 'pointer',
                                                                                whiteSpace: 'nowrap'
                                                                            }}
                                                                        >
                                                                            {(currentSpec.popUseYn === 'O' || (currentSpec.popRequiredStandard && !currentSpec.popRequiredStandard.includes('해당 없음') && currentSpec.popRequiredStandard.includes('POP'))) ? 'ON (동봉)' : 'OFF'}
                                                                        </button>
                                                                    </div>

                                                                    {/* 2. 비닐 에어캡 완충재 토글 & 3. 코너 각대 나란히 */}
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0284c7' }}>🫧 에어캡 완충재</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const isAir = currentSpec.airCapUseYn !== 'O';
                                                                                    setCurrentSpec(prev => ({
                                                                                        ...prev,
                                                                                        airCapUseYn: isAir ? 'O' : 'X'
                                                                                    }));
                                                                                }}
                                                                                disabled={!canEdit}
                                                                                style={{
                                                                                    padding: '4px 10px',
                                                                                    fontSize: '11px',
                                                                                    fontWeight: 'bold',
                                                                                    borderRadius: '6px',
                                                                                    border: 'none',
                                                                                    background: currentSpec.airCapUseYn === 'O' ? '#0284c7' : '#e2e8f0',
                                                                                    color: currentSpec.airCapUseYn === 'O' ? '#ffffff' : '#64748b',
                                                                                    cursor: 'pointer',
                                                                                    whiteSpace: 'nowrap'
                                                                                }}
                                                                            >
                                                                                {currentSpec.airCapUseYn === 'O' ? 'ON' : 'OFF'}
                                                                            </button>
                                                                        </div>

                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#d97706' }}>📐 코너 각대</span>
                                                                            <div
                                                                                title="유통채널 마스터(SalesChannel)의 '패드/각대' 규정에 따라 자동 결정되며, 임의 수정이 제한됩니다."
                                                                                style={{
                                                                                    padding: '4px 8px',
                                                                                    fontSize: '10px',
                                                                                    fontWeight: 'bold',
                                                                                    borderRadius: '6px',
                                                                                    background: isCornerPostActive ? '#fef3c7' : '#f1f5f9',
                                                                                    color: isCornerPostActive ? '#b45309' : '#64748b',
                                                                                    border: isCornerPostActive ? '1px solid #fde68a' : '1px solid #cbd5e1',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '3px',
                                                                                    cursor: 'not-allowed',
                                                                                    whiteSpace: 'nowrap'
                                                                                }}
                                                                            >
                                                                                <span>🔒</span>
                                                                                <span>{isCornerPostActive ? 'ON (채널 연동)' : 'OFF (채널 연동)'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 선택된 패턴 종합 요약 카드 */}
                                                            <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#334155' }}>
                                                                <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
                                                                    📋 현재 설정된 3D 포장 사양
                                                                </div>
                                                                <div>• 아웃박스 입수: <strong>{currentSpec.outboxPackingPattern || (hasInbox ? `${curOutboxArrangement.cols}열×${curOutboxArrangement.rows}행×${curOutboxArrangement.layers}단 (인박스 ${curOutboxArrangement.qty}박스입)` : `${curOutboxArrangement.cols}열×${curOutboxArrangement.rows}행×${curOutboxArrangement.layers}단`)}</strong></div>
                                                                {hasInbox && (
                                                                    <div>• 인박스 입수: <strong>{currentSpec.inboxPackingPattern || `${curInboxArrangement.cols}열×${curInboxArrangement.rows}행×${curInboxArrangement.layers}단`}</strong></div>
                                                                )}
                                                                <div>• 팔레트 적재: <strong>{currentSpec.palletStackingPattern || (curPalletPattern?.name ? `${curPalletPattern.name} (${pallet3DMode === 'pallet-cross' ? '교차적재' : '일반적재'})` : '8방 핀휠 교차적재')}</strong> (1단 {currentSpec.palletTierQty || 8}박스 × {palletStacks}단)</div>
                                                                <div>• 고급 옵션: <strong>POP {currentSpec.popUseYn === 'O' || (currentSpec.popRequiredStandard && !currentSpec.popRequiredStandard.includes('해당 없음') && currentSpec.popRequiredStandard.includes('POP')) ? '적용(마주보기)' : '미적용'}</strong> / <strong>에어캡 {currentSpec.airCapUseYn === 'O' ? '적용' : '미적용'}</strong> / <strong>팔레트 각대 {isCornerPostActive ? '적용(채널연동)' : '미적용(채널연동)'}</strong></div>
                                                            </div>
                                                        </div>

                                                        {/* 오른쪽: 3D 뷰어 캔버스 및 도면 확정 제어 바 */}
                                                        {(() => {
                                                            const isInboxUseYnChanged = specBaselineInboxUseYn !== null && specBaselineInboxUseYn !== currentSpec.inboxUseYn;
                                                            
                                                            // 현재 활성화된 시뮬레이션 모드의 도면 정보
                                                            const curConfirmedImage = sim3DTab === 'inbox' 
                                                                ? currentSpec.inboxLayoutImage 
                                                                : (sim3DTab === 'outbox' 
                                                                    ? (currentSpec.outboxLayoutImageFile || currentSpec.outboxLayoutImage) 
                                                                    : currentSpec.palletLayoutImage);
                                                            const hasConfirmedImage = Boolean(curConfirmedImage);
                                                            const tabName = sim3DTab === 'inbox' ? '인박스' : (sim3DTab === 'outbox' ? '아웃박스' : '팔레트');

                                                            return (
                                                                <div style={{ position: 'relative', minHeight: '460px' }}>
                                                                    <div style={{
                                                                        filter: isInboxUseYnChanged ? 'blur(6px)' : 'none',
                                                                        pointerEvents: isInboxUseYnChanged ? 'none' : 'auto',
                                                                        opacity: isInboxUseYnChanged ? 0.35 : 1,
                                                                        transition: 'filter 0.25s ease, opacity 0.25s ease'
                                                                    }}>
                                                                        {/* 3D 도면 확정 컨트롤 헤더 바 */}
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'center',
                                                                            background: '#f8fafc',
                                                                            padding: '8px 12px',
                                                                            borderRadius: '8px 8px 0 0',
                                                                            border: '1px solid #e2e8f0',
                                                                            borderBottom: 'none',
                                                                            flexWrap: 'wrap',
                                                                            gap: '8px'
                                                                        }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>
                                                                                    {sim3DTab === 'inbox' ? '📥 인박스 3D' : (sim3DTab === 'outbox' ? '📦 아웃박스 3D' : '🏗️ 팔레트 3D')}
                                                                                </span>
                                                                                {hasConfirmedImage ? (
                                                                                    <span style={{
                                                                                        fontSize: '11px',
                                                                                        padding: '2px 8px',
                                                                                        borderRadius: '12px',
                                                                                        background: '#dcfce7',
                                                                                        color: '#15803d',
                                                                                        border: '1px solid #86efac',
                                                                                        fontWeight: 'bold',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '3px'
                                                                                    }}>
                                                                                        <span>✓</span> <span>확정 도면 적용중</span>
                                                                                    </span>
                                                                                ) : (
                                                                                    <span style={{
                                                                                        fontSize: '11px',
                                                                                        padding: '2px 8px',
                                                                                        borderRadius: '12px',
                                                                                        background: '#e0f2fe',
                                                                                        color: '#0369a1',
                                                                                        border: '1px solid #bae6fd',
                                                                                        fontWeight: 500
                                                                                    }}>
                                                                                        ⚡ 자동 3D 도면 모드
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {/* 도면 확정 및 관리 액션 버튼들 */}
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                {/* 0. 3D 도면 일괄 확정/저장 버튼 */}
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={snapshotUploading}
                                                                                    onClick={() => handleBatchSave3DSnapshots(false)}
                                                                                    style={{
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '4px',
                                                                                        padding: '5px 12px',
                                                                                        borderRadius: '6px',
                                                                                        fontSize: '12px',
                                                                                        fontWeight: 'bold',
                                                                                        background: '#4f46e5',
                                                                                        color: '#ffffff',
                                                                                        border: 'none',
                                                                                        cursor: snapshotUploading ? 'wait' : 'pointer',
                                                                                        boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)'
                                                                                    }}
                                                                                    title="미저장된 3D 도면(인박스/아웃박스/팔레트)을 현재 화면 기준으로 순차 자동 캡처하여 일괄 확정합니다."
                                                                                >
                                                                                    <span>⚡</span>
                                                                                    <span>3D 도면 일괄 확정</span>
                                                                                </button>

                                                                                {/* 1. 현재 3D 뷰 확정/저장 버튼 */}
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={snapshotUploading}
                                                                                    onClick={() => handleCaptureCurrent3D(sim3DTab)}
                                                                                    style={{
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '4px',
                                                                                        padding: '5px 12px',
                                                                                        borderRadius: '6px',
                                                                                        fontSize: '12px',
                                                                                        fontWeight: 'bold',
                                                                                        background: hasConfirmedImage ? '#2563eb' : '#059669',
                                                                                        color: '#ffffff',
                                                                                        border: 'none',
                                                                                        cursor: snapshotUploading ? 'wait' : 'pointer',
                                                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                                                                                    }}
                                                                                    title="현재 회전/확대된 3D 상태를 포장사양서 정식 도면으로 확정 저장합니다."
                                                                                >
                                                                                    <span>📸</span>
                                                                                    <span>{hasConfirmedImage ? '현재 3D 뷰로 재확정' : `현재 ${tabName} 3D 도면 확정/저장`}</span>
                                                                                </button>

                                                                                {/* 2. 도면 이미지 파일 직접 업로드 */}
                                                                                <label
                                                                                    style={{
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '3px',
                                                                                        padding: '5px 8px',
                                                                                        borderRadius: '6px',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: 600,
                                                                                        background: '#ffffff',
                                                                                        color: '#475569',
                                                                                        border: '1px solid #cbd5e1',
                                                                                        cursor: 'pointer'
                                                                                    }}
                                                                                    title="외부에서 제작한 3D 도면 이미지 파일(PNG/JPG)을 직접 등록합니다."
                                                                                >
                                                                                    <span>📁</span>
                                                                                    <span>파일 등록</span>
                                                                                    <input
                                                                                        type="file"
                                                                                        accept="image/*"
                                                                                        style={{ display: 'none' }}
                                                                                        onChange={(e) => {
                                                                                            if (e.target.files?.[0]) {
                                                                                                handleDirectImageUpload(e.target.files[0], sim3DTab);
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                </label>

                                                                                {/* 3. 확정 도면 삭제 / 자동 3D 도면으로 복원 */}
                                                                                {hasConfirmedImage && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleRemoveConfirmedImage(sim3DTab)}
                                                                                        style={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '3px',
                                                                                            padding: '5px 8px',
                                                                                            borderRadius: '6px',
                                                                                            fontSize: '11px',
                                                                                            fontWeight: 500,
                                                                                            background: '#ffffff',
                                                                                            color: '#dc2626',
                                                                                            border: '1px solid #fca5a5',
                                                                                            cursor: 'pointer'
                                                                                        }}
                                                                                        title="확정된 스냅샷을 삭제하고 자동 3D 도면 모드로 복귀합니다."
                                                                                    >
                                                                                        <span>🔄</span>
                                                                                        <span>자동모드 복원</span>
                                                                                    </button>
                                                                                )}

                                                                                {/* 4. 뷰 초기화 */}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        if (viewer3DRef.current?.resetView) {
                                                                                            viewer3DRef.current.resetView();
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '3px',
                                                                                        padding: '5px 8px',
                                                                                        borderRadius: '6px',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: 500,
                                                                                        background: '#ffffff',
                                                                                        color: '#64748b',
                                                                                        border: '1px solid #cbd5e1',
                                                                                        cursor: 'pointer'
                                                                                    }}
                                                                                    title="카메라 각도를 기본 등각투시도로 초기화합니다."
                                                                                >
                                                                                    🎯 초기화
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        <PackagingViewer3D
                                                                            ref={viewer3DRef}
                                                                            mode={sim3DTab === 'pallet' ? pallet3DMode : sim3DTab}
                                                                            unitBox={uBox}
                                                                            inbox={iBox}
                                                                            outbox={oBox}
                                                                            arrangement={sim3DTab === 'inbox' ? curInboxArrangement : curOutboxArrangement}
                                                                            inboxArrangement={curInboxArrangement}
                                                                            useInbox={hasInbox}
                                                                            hasPop={currentSpec.popUseYn === 'O' || (currentSpec.popRequiredStandard && !currentSpec.popRequiredStandard.includes('해당 없음') && currentSpec.popRequiredStandard.includes('POP'))}
                                                                            popHeight={Number(currentSpec.popHeight) || 15}
                                                                            useAirCap={currentSpec.airCapUseYn === 'O'}
                                                                            useCornerPost={isCornerPostActive}
                                                                            palletConfig={{
                                                                                w: pBox.w,
                                                                                d: pBox.d,
                                                                                pattern: curPalletPattern,
                                                                                stacks: palletStacks
                                                                            }}
                                                                            savedViewConfig={
                                                                                sim3DTab === 'inbox' 
                                                                                    ? currentSpec.inboxViewConfig 
                                                                                    : (sim3DTab === 'outbox' ? currentSpec.outboxViewConfig : currentSpec.palletViewConfig)
                                                                            }
                                                                            onCapture={(dataUrl, renderedMode) => handleSave3DSnapshot(dataUrl, renderedMode)}
                                                                            height={410}
                                                                        />

                                                                        {/* 3D 사양서 도면 3대 영역 확정 현황 패널 */}
                                                                        <div style={{
                                                                            marginTop: '10px',
                                                                            padding: '10px 12px',
                                                                            background: '#f8fafc',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid #e2e8f0'
                                                                        }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>
                                                                                    📑 포장사양서(엑셀) 반영 도면 현황
                                                                                </span>
                                                                                <span style={{ fontSize: '10px', color: '#64748b' }}>
                                                                                    (확정된 이미지는 엑셀 Section 5-1에 100% 삽입됩니다)
                                                                                </span>
                                                                            </div>

                                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                                                                {/* 1. 인박스 */}
                                                                                <div style={{
                                                                                    background: '#ffffff',
                                                                                    padding: '6px 8px',
                                                                                    borderRadius: '6px',
                                                                                    border: currentSpec.inboxLayoutImage ? '1px solid #ddd6fe' : '1px dashed #cbd5e1',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '6px'
                                                                                }}>
                                                                                    {currentSpec.inboxLayoutImage ? (
                                                                                        <img
                                                                                            src={getFileUrl(currentSpec.inboxLayoutImage)}
                                                                                            alt="인박스 도면"
                                                                                            style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                                                                        />
                                                                                    ) : (
                                                                                        <div style={{ width: '32px', height: '32px', background: '#f5f3ff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                                                                                            📥
                                                                                        </div>
                                                                                    )}
                                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6d28d9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                            1. 인박스 도면
                                                                                        </div>
                                                                                        <div style={{ fontSize: '10px', color: currentSpec.inboxLayoutImage ? '#15803d' : '#94a3b8' }}>
                                                                                            {currentSpec.inboxLayoutImage ? '✓ 도면 확정됨' : '자동 3D 도면'}
                                                                                        </div>
                                                                                    </div>
                                                                                    {hasInbox && (
                                                                                        <button
                                                                                            type="button"
                                                                                            disabled={snapshotUploading}
                                                                                            onClick={() => {
                                                                                                setSim3DTab('inbox');
                                                                                                setTimeout(() => handleCaptureCurrent3D('inbox'), 250);
                                                                                            }}
                                                                                            style={{
                                                                                                padding: '3px 6px',
                                                                                                fontSize: '10px',
                                                                                                fontWeight: 600,
                                                                                                borderRadius: '4px',
                                                                                                border: '1px solid #ddd6fe',
                                                                                                background: '#f5f3ff',
                                                                                                color: '#6d28d9',
                                                                                                cursor: 'pointer',
                                                                                                whiteSpace: 'nowrap'
                                                                                            }}
                                                                                            title="인박스 3D 뷰로 이동하여 즉시 캡처/저장합니다."
                                                                                        >
                                                                                            📸 {currentSpec.inboxLayoutImage ? '재캡처' : '캡처'}
                                                                                        </button>
                                                                                    )}
                                                                                </div>

                                                                                {/* 2. 아웃박스 */}
                                                                                <div style={{
                                                                                    background: '#ffffff',
                                                                                    padding: '6px 8px',
                                                                                    borderRadius: '6px',
                                                                                    border: (currentSpec.outboxLayoutImageFile || currentSpec.outboxLayoutImage) ? '1px solid #bfdbfe' : '1px dashed #cbd5e1',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '6px'
                                                                                }}>
                                                                                    {(currentSpec.outboxLayoutImageFile || currentSpec.outboxLayoutImage) ? (
                                                                                        <img
                                                                                            src={getFileUrl(currentSpec.outboxLayoutImageFile || currentSpec.outboxLayoutImage)}
                                                                                            alt="아웃박스 도면"
                                                                                            style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                                                                        />
                                                                                    ) : (
                                                                                        <div style={{ width: '32px', height: '32px', background: '#eff6ff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                                                                                            📦
                                                                                        </div>
                                                                                    )}
                                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1d4ed8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                            2. 아웃박스 도면
                                                                                        </div>
                                                                                        <div style={{ fontSize: '10px', color: (currentSpec.outboxLayoutImageFile || currentSpec.outboxLayoutImage) ? '#15803d' : '#94a3b8' }}>
                                                                                            {(currentSpec.outboxLayoutImageFile || currentSpec.outboxLayoutImage) ? '✓ 도면 확정됨' : '자동 3D 도면'}
                                                                                        </div>
                                                                                    </div>
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={snapshotUploading}
                                                                                        onClick={() => {
                                                                                            setSim3DTab('outbox');
                                                                                            setTimeout(() => handleCaptureCurrent3D('outbox'), 250);
                                                                                        }}
                                                                                        style={{
                                                                                            padding: '3px 6px',
                                                                                            fontSize: '10px',
                                                                                            fontWeight: 600,
                                                                                            borderRadius: '4px',
                                                                                            border: '1px solid #bfdbfe',
                                                                                            background: '#eff6ff',
                                                                                            color: '#1d4ed8',
                                                                                            cursor: 'pointer',
                                                                                            whiteSpace: 'nowrap'
                                                                                        }}
                                                                                        title="아웃박스 3D 뷰로 이동하여 즉시 캡처/저장합니다."
                                                                                    >
                                                                                        📸 {(currentSpec.outboxLayoutImageFile || currentSpec.outboxLayoutImage) ? '재캡처' : '캡처'}
                                                                                    </button>
                                                                                </div>

                                                                                {/* 3. 팔레트 */}
                                                                                <div style={{
                                                                                    background: '#ffffff',
                                                                                    padding: '6px 8px',
                                                                                    borderRadius: '6px',
                                                                                    border: currentSpec.palletLayoutImage ? '1px solid #fde68a' : '1px dashed #cbd5e1',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '6px'
                                                                                }}>
                                                                                    {currentSpec.palletLayoutImage ? (
                                                                                        <img
                                                                                            src={getFileUrl(currentSpec.palletLayoutImage)}
                                                                                            alt="팔레트 도면"
                                                                                            style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                                                                        />
                                                                                    ) : (
                                                                                        <div style={{ width: '32px', height: '32px', background: '#fef3c7', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                                                                                            🏗️
                                                                                        </div>
                                                                                    )}
                                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#b45309', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                            3. 팔레트 도면
                                                                                        </div>
                                                                                        <div style={{ fontSize: '10px', color: currentSpec.palletLayoutImage ? '#15803d' : '#94a3b8' }}>
                                                                                            {currentSpec.palletLayoutImage ? '✓ 도면 확정됨' : '자동 3D 도면'}
                                                                                        </div>
                                                                                    </div>
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={snapshotUploading}
                                                                                        onClick={() => {
                                                                                            setSim3DTab('pallet');
                                                                                            setTimeout(() => handleCaptureCurrent3D('pallet'), 250);
                                                                                        }}
                                                                                        style={{
                                                                                            padding: '3px 6px',
                                                                                            fontSize: '10px',
                                                                                            fontWeight: 600,
                                                                                            borderRadius: '4px',
                                                                                            border: '1px solid #fde68a',
                                                                                            background: '#fffbeb',
                                                                                            color: '#b45309',
                                                                                            cursor: 'pointer',
                                                                                            whiteSpace: 'nowrap'
                                                                                        }}
                                                                                        title="팔레트 3D 뷰로 이동하여 즉시 캡처/저장합니다."
                                                                                    >
                                                                                        📸 {currentSpec.palletLayoutImage ? '재캡처' : '캡처'}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* 📦 인박스 사용유무 변경 시 블러 오버레이 & 즉시 새로고침 안내 */}
                                                                    {isInboxUseYnChanged && (
                                                                        <div style={{
                                                                            position: 'absolute',
                                                                            top: 0,
                                                                            left: 0,
                                                                            right: 0,
                                                                            bottom: 0,
                                                                            background: 'rgba(255, 255, 255, 0.85)',
                                                                            backdropFilter: 'blur(5px)',
                                                                            WebkitBackdropFilter: 'blur(5px)',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            zIndex: 30,
                                                                            borderRadius: '12px',
                                                                            padding: '24px',
                                                                            textAlign: 'center',
                                                                            border: '2px dashed #93c5fd',
                                                                            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.18)'
                                                                        }}>
                                                                            <div style={{ fontSize: '38px', marginBottom: '10px' }}>📦🔄</div>
                                                                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
                                                                                인박스(Inner Box) 사용 설정이 변경되었습니다.
                                                                            </div>
                                                                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.6', maxWidth: '340px' }}>
                                                                                포장 구조가 변경되었습니다.<br/>
                                                                                <strong>사양서 저장 후 3D 시뮬레이션을 재조회</strong>해 주세요.<br/>
                                                                                <span style={{ fontSize: '11px', color: '#2563eb' }}>(임시로 즉시 시뮬레이션하시려면 아래 버튼을 눌러주세요)</span>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSpecBaselineInboxUseYn(currentSpec.inboxUseYn);
                                                                                    setSelectedOutboxArrangement(null);
                                                                                    setSelectedInboxArrangement(null);
                                                                                    setSim3DTab('outbox');
                                                                                }}
                                                                                style={{
                                                                                    padding: '9px 20px',
                                                                                    fontSize: '13px',
                                                                                    fontWeight: 'bold',
                                                                                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                                                                    color: '#ffffff',
                                                                                    border: 'none',
                                                                                    borderRadius: '8px',
                                                                                    cursor: 'pointer',
                                                                                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '8px'
                                                                                }}
                                                                            >
                                                                                <span>🔄</span>
                                                                                <span>3D 시뮬레이션 즉시 새로고침</span>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}

                                                    </div>
                                                </div>
                                            );
                                        })()}

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
                                        onImagesChange={setPackagingMethodImages}
                                        onRegisterSaveHandler={(fn) => { packagingMethodSaveRef.current = fn; }}
                                        onRegisterReloadHandler={(fn) => { packagingMethodReloadRef.current = fn; }}
                                        onRegisterInheritHandler={(fn) => { packagingMethodInheritRef.current = fn; }}
                                        onEnsureSpecCreated={async () => {
                                            if (!product || !product.id) {
                                                toast.warn("제품 기본 정보를 먼저 저장해주세요.");
                                                return null;
                                            }
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
                                            try {
                                                const res = await api.saveFullPackagingSpec(payload);
                                                const savedSpec = res.data?.spec || res.data;
                                                const savedId = savedSpec?.id || res.data?.id || currentSpec?.id;
                                                if (savedId) {
                                                    setCurrentSpec(prev => ({ ...prev, ...savedSpec, id: savedId }));
                                                    fetchPackagingSpecs(product.id);
                                                }
                                                return savedId;
                                            } catch (e) {
                                                console.error("Failed to auto-create spec", e);
                                                return null;
                                            }
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
                                                        <td style={{ padding: '8px' }}>LOT(제조번호)</td>
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
                                                        <td style={{ padding: '8px' }}>LOT(제조번호)</td>
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
                                                        <td style={{ padding: '8px' }}>LOT(제조번호)</td>
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
                    onSelect={handleAddComponent}
                    title="기획세트 구성품 검색 및 추가 (ItemCode/ProductName)"
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

            {/* 채널 스티커 첨부 규정 파일 미리보기 모달 (PDF / 이미지 뷰어) */}
            {previewStickerFile && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '80vw', height: '85vh', backgroundColor: '#fff', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                                🏷️ 채널 스티커 첨부 규정 미리보기 ({previewStickerFile.type})
                            </h3>
                            <button
                                type="button"
                                onClick={() => setPreviewStickerFile(null)}
                                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: '#475569' }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                            {previewStickerFile.type === 'PDF' || previewStickerFile.url?.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={previewStickerFile.url} title="PDF Viewer" style={{ width: '100%', height: '100%', border: 'none' }} />
                            ) : (
                                <img src={previewStickerFile.url} alt="Sticker Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 3D 사양/도면 수정 확인 모달 */}
            {confirmDialogState && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '440px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>{confirmDialogState.icon || '⚠️'}</span>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>{confirmDialogState.title || '확인'}</h4>
                        </div>
                        <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                            {confirmDialogState.message}
                        </div>
                        {confirmDialogState.asIs && confirmDialogState.toBe && (
                            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                        <span style={{ padding: '2px 8px', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', flexShrink: 0 }}>AS-IS</span>
                                        <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{confirmDialogState.asIs}</span>
                                    </div>
                                    {confirmDialogState.asIsStatus && (
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontWeight: 'bold',
                                            background: confirmDialogState.asIsStatus.bg,
                                            color: confirmDialogState.asIsStatus.color,
                                            border: `1px solid ${confirmDialogState.asIsStatus.border || '#cbd5e1'}`,
                                            flexShrink: 0
                                        }}>
                                            {confirmDialogState.asIsStatus.label}
                                        </span>
                                    )}
                                </div>
                                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', lineHeight: 1 }}>⬇️</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                        <span style={{ padding: '2px 8px', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', flexShrink: 0 }}>TO-BE</span>
                                        <span style={{ color: '#0f172a', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{confirmDialogState.toBe}</span>
                                    </div>
                                    {confirmDialogState.toBeStatus && (
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontWeight: 'bold',
                                            background: confirmDialogState.toBeStatus.bg,
                                            color: confirmDialogState.toBeStatus.color,
                                            border: `1px solid ${confirmDialogState.toBeStatus.border || '#cbd5e1'}`,
                                            flexShrink: 0
                                        }}>
                                            {confirmDialogState.toBeStatus.label}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                            <button
                                type="button"
                                onClick={() => setConfirmDialogState(null)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const action = confirmDialogState.onConfirm;
                                    setConfirmDialogState(null);
                                    if (action) action();
                                }}
                                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(37, 99, 235, 0.3)' }}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 글로벌 전성분 규제 스캔 결과 모달 */}
            {isComplianceModalOpen && complianceResults && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '850px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        {/* 모달 헤더 */}
                        <div style={{
                            padding: '18px 24px',
                            background: complianceResults.compliant ? '#ecfdf5' : '#fff1f2',
                            borderBottom: `1px solid ${complianceResults.compliant ? '#a7f3d0' : '#fecdd3'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '24px' }}>{complianceResults.compliant ? '✅' : '⚠️'}</span>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: complianceResults.compliant ? '#065f46' : '#9f1239' }}>
                                        글로벌 규제 성분 & 배합한도 검사 결과
                                    </h3>
                                    <span style={{ fontSize: '12px', color: complianceResults.compliant ? '#047857' : '#be123c', fontWeight: '500' }}>
                                        대상 국가: 한국(KR) · 유럽(EU) · 미국(US) · 중국(CN) · 일본(JP)
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsComplianceModalOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '22px',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '6px'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* 요약 바 */}
                        <div style={{
                            padding: '14px 24px',
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            gap: '24px',
                            fontSize: '13px'
                        }}>
                            <div>
                                <span style={{ color: '#64748b' }}>검사 상태: </span>
                                <span style={{
                                    fontWeight: '800',
                                    color: complianceResults.compliant ? '#16a34a' : '#dc2626',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: complianceResults.compliant ? '#dcfce7' : '#fee2e2'
                                }}>
                                    {complianceResults.compliant ? '글로벌 5개국 적합 (위반 없음)' : '주의/위반 항목 검출'}
                                </span>
                            </div>
                            {complianceResults.totalScanned !== undefined && (
                                <div>
                                    <span style={{ color: '#64748b' }}>스캔 성분 수: </span>
                                    <span style={{ fontWeight: '700', color: '#1e293b' }}>{complianceResults.totalScanned}개</span>
                                </div>
                            )}
                            {complianceResults.flaggedCount !== undefined && (
                                <div>
                                    <span style={{ color: '#64748b' }}>주의/규제 검출: </span>
                                    <span style={{ fontWeight: '700', color: complianceResults.flaggedCount > 0 ? '#dc2626' : '#16a34a' }}>
                                        {complianceResults.flaggedCount}건
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 모달 본문 - 테이블 */}
                        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                            {complianceResults.items && complianceResults.items.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                            <th style={{ padding: '10px 8px', textAlign: 'left', color: '#334155' }}>성분명 (국문/영문)</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'center', width: '70px', color: '#334155' }}>국가</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'center', width: '90px', color: '#334155' }}>규제 분류</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'center', width: '90px', color: '#334155' }}>배합 한도</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'left', color: '#334155' }}>규제 상세 및 주의사항</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {complianceResults.items.map((item, idx) => (
                                            <tr key={idx} style={{
                                                borderBottom: '1px solid #f1f5f9',
                                                background: item.restrictionType?.includes('PROHIBITED') || item.restrictionType?.includes('금지') 
                                                    ? '#fff5f5' 
                                                    : item.restrictionType?.includes('LIMIT') || item.restrictionType?.includes('한도')
                                                    ? '#fffbeb'
                                                    : '#ffffff'
                                            }}>
                                                <td style={{ padding: '10px 8px', fontWeight: '600', color: '#1e293b' }}>
                                                    <div>{item.ingredientName || item.korName || item.inciName}</div>
                                                    {item.inciName && item.inciName !== item.ingredientName && (
                                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '400' }}>INCI: {item.inciName}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        background: '#e0e7ff',
                                                        color: '#3730a3'
                                                    }}>
                                                        {item.country || 'ALL'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        background: item.restrictionType?.includes('PROHIBITED') || item.restrictionType?.includes('금지')
                                                            ? '#fee2e2'
                                                            : '#fef3c7',
                                                        color: item.restrictionType?.includes('PROHIBITED') || item.restrictionType?.includes('금지')
                                                            ? '#991b1b'
                                                            : '#92400e'
                                                    }}>
                                                        {item.restrictionType || '배합한도'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '700', color: '#b91c1c' }}>
                                                    {item.maxLimitPercent !== undefined && item.maxLimitPercent !== null ? `${item.maxLimitPercent}%` : '-'}
                                                </td>
                                                <td style={{ padding: '10px 8px', color: '#475569', lineHeight: '1.4' }}>
                                                    {item.description || item.reason || item.notes || '배합 한도 및 규제 조건을 확인하십시오.'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#16a34a' }}>
                                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
                                    <div style={{ fontSize: '15px', fontWeight: '700' }}>위반 및 규제 대상 성분이 검출되지 않았습니다.</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                        한국, 유럽, 미국, 중국, 일본의 기본 배합 금지/한도 DB 기준 모두 안전합니다.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 모달 푸터 */}
                        <div style={{
                            padding: '14px 24px',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setIsComplianceModalOpen(false)}
                                className="button primary"
                                style={{
                                    padding: '8px 20px',
                                    fontSize: '13px',
                                    borderRadius: '8px',
                                    background: '#0f172a',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                확인 및 닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ⚠️ 포장사양서 다운로드 필수 검증 모달 (다운로드 차단 및 가이드) */}
            {specValidationModalState.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999,
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '560px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #fee2e2',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'modalSlideUp 0.2s ease-out'
                    }}>
                        {/* 헤더 */}
                        <div style={{
                            padding: '18px 24px',
                            background: '#fef2f2',
                            borderBottom: '1px solid #fecaca',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: '#fee2e2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px'
                            }}>
                                🚫
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#991b1b' }}>
                                    {specValidationModalState.title || '포장사양서 엑셀 다운로드 불가 안내'}
                                </h3>
                                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#b91c1c' }}>
                                    사양서의 핵심 정보 또는 도면/사진이 누락되어 엑셀 다운로드가 제한됩니다.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSpecValidationModalState(prev => ({ ...prev, isOpen: false }))}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    color: '#991b1b',
                                    padding: '4px'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* 모달 본문 - 누락 항목 체크리스트 */}
                        <div style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
                            <div style={{ fontSize: '13px', color: '#334155', marginBottom: '14px', lineHeight: '1.5' }}>
                                완성도 높은 정식 포장사양서 출력을 위해 <strong>아래 누락 항목들을 먼저 등록 및 확정</strong>해 주시기 바랍니다.
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* 1. 3D 도면 누락 */}
                                {specValidationModalState.missing3D && specValidationModalState.missing3D.length > 0 && (
                                    <div style={{
                                        background: '#fff1f2',
                                        border: '1px solid #fecdd3',
                                        borderRadius: '10px',
                                        padding: '12px 16px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px', color: '#be123c', marginBottom: '6px' }}>
                                            <span>📸</span>
                                            <span>3D 포장/적재 도면 미저장 ({specValidationModalState.missing3D.length}건)</span>
                                        </div>
                                        <ul style={{ margin: 0, paddingLeft: '22px', fontSize: '12px', color: '#9f1239', lineHeight: '1.6' }}>
                                            {specValidationModalState.missing3D.map((item, i) => (
                                                <li key={i}>{item} 미확정</li>
                                            ))}
                                        </ul>
                                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                disabled={snapshotUploading}
                                                onClick={() => handleBatchSave3DSnapshots(false)}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    background: '#e11d48',
                                                    color: '#ffffff',
                                                    cursor: snapshotUploading ? 'wait' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    boxShadow: '0 2px 4px rgba(225, 29, 72, 0.25)'
                                                }}
                                            >
                                                <span>⚡</span>
                                                <span>{snapshotUploading ? '일괄 캡처 중...' : '미저장 3D 도면 바로 일괄 저장하기'}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* 2. 포장방법 공정 사진 누락 */}
                                {specValidationModalState.missingMethodImages && (
                                    <div style={{
                                        background: '#fffbeb',
                                        border: '1px solid #fde68a',
                                        borderRadius: '10px',
                                        padding: '12px 16px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px', color: '#b45309', marginBottom: '6px' }}>
                                            <span>🖼️</span>
                                            <span>포장방법 공정 사진 미등록</span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#92400e', lineHeight: '1.5' }}>
                                            엑셀 Sheet 2(포장방법)에 출력할 공정 사진이 1장도 등록되지 않았습니다. [Sheet 2 포장방법] 탭에서 사진을 최소 1장 이상 등록 후 저장해 주세요.
                                        </div>
                                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSpecValidationModalState(prev => ({ ...prev, isOpen: false }));
                                                    setSpecSubTab('sheet2');
                                                }}
                                                style={{
                                                    padding: '5px 12px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    borderRadius: '6px',
                                                    border: '1px solid #f59e0b',
                                                    background: '#ffffff',
                                                    color: '#b45309',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                👉 포장방법 사진 탭으로 이동
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* 3. 필수 사양 미입력 */}
                                {specValidationModalState.missingSpecs && specValidationModalState.missingSpecs.length > 0 && (
                                    <div style={{
                                        background: '#f8fafc',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '10px',
                                        padding: '12px 16px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                                            <span>📐</span>
                                            <span>필수 포장/적재 사양 수치 미입력 ({specValidationModalState.missingSpecs.length}건)</span>
                                        </div>
                                        <ul style={{ margin: 0, paddingLeft: '22px', fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                                            {specValidationModalState.missingSpecs.map((item, i) => (
                                                <li key={i}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 모달 푸터 */}
                        <div style={{
                            padding: '14px 24px',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '10px'
                        }}>
                            <button
                                type="button"
                                onClick={() => setSpecValidationModalState(prev => ({ ...prev, isOpen: false }))}
                                style={{
                                    padding: '8px 20px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    borderRadius: '8px',
                                    background: '#475569',
                                    color: '#ffffff',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                확인 (닫기)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDrawer;


