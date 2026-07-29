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
    downloadPackagingSpecPdf
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
        outboxLayoutImage: '',
        packagingMethodText: '',
        markingLocationImage: '',
        inboxType: '',
        inboxQty: '',
        inboxSize: '',
        inboxTapeBanding: 'N',
        inboxInterlayerSheet: 'N',
        inboxMaterial: '',
        inboxRemarks: '',
        outboxType: '',
        outboxQty: '',
        outboxSize: '',
        outboxTapeBanding: 'N',
        outboxInterlayerSheet: 'N',
        outboxMaterial: '',
        outboxRemarks: '',
        palletTypeStr: '',
        palletStackingMethod: '',
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

    const packagingMethodSaveRef = useRef(null);

    const handleSaveFullSpec = async () => {
        try {
            const payload = {
                spec: {
                    ...currentSpec,
                    product: { id: product.id }
                },
                revisions: specRevisions,
                components: specComponents
            };
            const res = await api.saveFullPackagingSpec(payload);
            if (res.data) {
                // 포장방법 사진/캡션/주석 변경사항이 있다면 함께 일괄 저장
                if (packagingMethodSaveRef.current) {
                    await packagingMethodSaveRef.current();
                }
                toast.success("포장사양서가 성공적으로 저장되었습니다.");
                fetchPackagingSpecs(product.id);
            }
        } catch (error) {
            const errMsg = error.response?.data?.message || error.message || "오류가 발생했습니다.";
            toast.error(`포장사양서 저장 실패: ${errMsg}`);
            console.error(error);
        }
    };

    const handleAddRevision = () => {
        const nextNo = specRevisions.length + 1;
        setSpecRevisions([...specRevisions, {
            revisionNo: nextNo,
            content: '',
            revisionDate: new Date().toISOString().split('T')[0],
            revisionAuthor: user?.username || 'system'
        }]);
    };

    const handleRemoveRevision = (idx) => {
        setSpecRevisions(specRevisions.filter((_, i) => i !== idx));
    };

    const handleRevisionChange = (idx, field, val) => {
        const updated = [...specRevisions];
        updated[idx][field] = val;
        setSpecRevisions(updated);
    };

    const handleAddSpecComponent = () => {
        setSpecComponents([...specComponents, {
            componentName: '',
            specDetails: '',
            sizeDimension: '',
            quantity: 1,
            supplier: '',
            remarks: ''
        }]);
    };

    const handleRemoveSpecComponent = (idx) => {
        setSpecComponents(specComponents.filter((_, i) => i !== idx));
    };

    const handleSpecComponentChange = (idx, field, val) => {
        const updated = [...specComponents];
        updated[idx][field] = val;
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
            const brandsData = await getBrands().then(r => r.data).catch(() => []);
            const manufacturersData = await getManufacturers().then(r => r.data).catch(() => []);
            const materialsData = await api.getMasterMaterials().then(r => r.data).catch(() => []);
            const templatesData = await api.getMasterTemplates().then(r => r.data).catch(() => []);
            const rulesData = await api.getMasterRules().then(r => r.data).catch(() => []);
            const channelsData = await api.getSalesChannels()
                .then(r => {
                    console.log("Loaded sales channels API response:", r.data);
                    return r.data;
                })
                .catch(err => {
                    console.error("Failed to load sales channels API:", err);
                    return [];
                });

            setBrands(brandsData);
            setManufacturers(manufacturersData);
            setMasterMaterials(materialsData);
            setMasterTemplates(templatesData);
            setMasterRules(rulesData);
            setSalesChannels(channelsData.filter(c => c.active));
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
                const { spec, revisions, components } = fullRes.data;
                setIsSpecLoaded(true);
                if (spec) {
                    // Auto-fill empty spec fields using product details
                    const prod = loadedProduct || formData;
                    if (prod) {
                        const updatedSpec = { ...spec };
                        
                        if (prod.inboxInfo?.inboxQuantity) {
                            updatedSpec.inboxQty = prod.inboxInfo.inboxQuantity;
                        }
                        if (prod.inboxInfo?.inboxLength && prod.inboxInfo?.inboxWidth && prod.inboxInfo?.inboxHeight) {
                            updatedSpec.inboxSize = `${prod.inboxInfo.inboxLength}x${prod.inboxInfo.inboxWidth}x${prod.inboxInfo.inboxHeight}`;
                        }
                        if (prod.outboxInfo?.outboxQuantity) {
                            updatedSpec.outboxQty = prod.outboxInfo.outboxQuantity;
                        }
                        if (prod.outboxInfo?.outboxLength && prod.outboxInfo?.outboxWidth && prod.outboxInfo?.outboxHeight) {
                            updatedSpec.outboxSize = `${prod.outboxInfo.outboxLength}x${prod.outboxInfo.outboxWidth}x${prod.outboxInfo.outboxHeight}`;
                        }
                        if (prod.outboxInfo?.outboxWeight) {
                            updatedSpec.oneOutboxWeight = prod.outboxInfo.outboxWeight;
                        }
                        if (prod.palletInfo?.palletLength && prod.palletInfo?.palletWidth) {
                            updatedSpec.palletSize = `${prod.palletInfo.palletLength}x${prod.palletInfo.palletWidth}`;
                        }
                        if (prod.palletInfo?.palletHeight) {
                            updatedSpec.onePalletHeight = prod.palletInfo.palletHeight;
                        }
                        if (prod.palletInfo?.palletHeight) {
                            updatedSpec.palletHeightLimit = prod.palletInfo.palletHeight;
                        }
                        if (prod.palletInfo?.palletQuantity && prod.outboxInfo?.outboxWeight) {
                            updatedSpec.onePalletWeight = (parseFloat(prod.outboxInfo.outboxWeight) * parseInt(prod.palletInfo.palletQuantity)).toFixed(1);
                        }
                        if (prod.shelfLifeMonths || prod.openedShelfLifeMonths) {
                            const shelfLifeStr = prod.shelfLifeMonths ? `제조일로부터 ${prod.shelfLifeMonths}개월` : '';
                            const openedStr = prod.openedShelfLifeMonths ? `개봉 후 ${prod.openedShelfLifeMonths}개월` : '';
                            updatedSpec.markingStandard = [shelfLifeStr, openedStr].filter(Boolean).join(' / ');
                        }
                        setCurrentSpec(updatedSpec);
                    } else {
                        setCurrentSpec(spec);
                    }
                }
                setSpecRevisions(revisions || []);
                setSpecComponents(components || []);
            }
        } catch (error) {
            console.error("포장사양서 상세 로드 실패: ", error);
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
                updates.isPlanningSet = actualValue === '기획세트';
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
            const response = await downloadPackagingSpecExcel(product.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `packaging_spec_${product.id}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert("엑셀 다운로드에 실패했습니다.");
        }
    };

    const handleDownloadSpecPdf = async () => {
        if (!product || !product.id) return;
        try {
            const response = await downloadPackagingSpecPdf(product.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `packaging_spec_${product.id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert("PDF 다운로드에 실패했습니다.");
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
        setIsMasterSearchOpen(true);
    };

    const handleMasterSelect = async (p) => {
        setIsMasterSearchOpen(false);
        if (!p || !p.itemCode) return;

        try {
            const res = await loadMasterProduct(p.itemCode);
            if (res.data) {
                setFormData(prev => enrichWithCalculations({
                    ...prev,
                    ...res.data,
                    itemCode: prev.itemCode, // 현재 입력 중인 코드는 유지
                    id: prev.id, // 기존 ID 유지
                    isMaster: false, // 불러온 데이터는 마스터가 아님 (템플릿 용도)
                    parentItemCode: res.data.itemCode, // 마스터 코드를 부모 코드로 설정
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
                alert(`마스터 제품[${p.productName}] 정보를 성공적으로 불러왔습니다.`);
            }
        } catch (error) {
            alert("마스터 정보를 가져오는데 실패했습니다.");
        }
    };

    const handleBomSelect = (m) => {
        if (bomSearchMode === 'add') {
            setSpecComponents([...specComponents, {
                componentName: m.componentName || '',
                specDetails: m.detailedMaterial || m.material || '',
                sizeDimension: m.specification || '',
                quantity: 1,
                supplier: m.manufacturer || '',
                remarks: ''
            }]);
        } else if (bomSearchMode === 'edit' && selectedBomIndex !== null) {
            const updated = [...specComponents];
            updated[selectedBomIndex] = {
                ...updated[selectedBomIndex],
                componentName: m.componentName || '',
                specDetails: m.detailedMaterial || m.material || '',
                sizeDimension: m.specification || '',
                supplier: m.manufacturer || ''
            };
            setSpecComponents(updated);
        } else if (selectedBomIndex !== null) {
            const newBoms = [...currentSpec.bomItems];
            newBoms[selectedBomIndex] = {
                ...newBoms[selectedBomIndex],
                masterMaterialId: m.id,
                specification: m.specification || '' // Sync with master specification
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

            if (window.confirm("마스터 상품의 포장사양서를 복사하시겠습니까? (현재 데이터가 덮어씌워질 수 있습니다)")) {
                const res = await api.copyMasterPackagingSpec(product.id, masterRes.data.id);
                alert("마스터 포장사양서를 성공적으로 복제했습니다.");
                fetchPackagingSpecs(product.id);
                if (res.data) {
                    setCurrentSpec(prev => ({
                        ...prev,
                        ...res.data,
                        bomItems: res.data.bomItems || []
                    }));
                }
            }
        } catch (error) {
            alert("포장사양서 복제에 실패했습니다.");
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
        if (payload.brand && !payload.brand.id) payload.brand = null;
        if (payload.manufacturerInfo && !payload.manufacturerInfo.id) payload.manufacturerInfo = null;

        if (payload.capacity && !String(payload.capacity).includes('mL')) payload.capacity = `${payload.capacity}mL`;
        if (payload.weight && !String(payload.weight).includes('g')) payload.weight = `${payload.weight}g`;

        try {
            if (product) {
                if (isSpecLoaded) {
                    const specPayload = {
                        spec: {
                            ...currentSpec,
                            product: { id: product.id }
                        },
                        revisions: specRevisions,
                        components: specComponents
                    };
                    await api.saveFullPackagingSpec(specPayload);
                }
                await updateProduct(product.id, payload);
                alert("제품 정보가 업데이트되었습니다.");
            } else {
                await createProduct(payload);
                alert("신규 제품이 등록되었습니다.");
            }
            onClose(true);
        } catch (error) {
            alert("저장에 실패했습니다.");
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

    const getFileUrl = (path) => path?.startsWith('http') ? path : `http://localhost:8080${path}`;

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
                                {canEdit && <button type="button" onClick={handleMasterLoad} className="secondary" style={{ padding: '2px 10px', fontSize: '12px' }}>마스터 제품 불러오기</button>}
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input name="itemCode" value={formData.itemCode} onChange={handleChange} required placeholder="품목 코드(Product Num) 입력" disabled={!!product || !canEdit} style={{ flex: 1 }} />
                                    {!product && canEdit && <button type="button" onClick={handleDuplicateCheck} className="secondary" style={{ width: 'auto' }}>중복 확인</button>}
                                </div>
                            </div>

                            <div style={{ marginTop: '10px' }}>
                                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <input type="checkbox" name="isMaster" checked={formData.isMaster} onChange={(e) => setFormData(prev => ({ ...prev, isMaster: e.target.checked }))} disabled={!canEdit} />
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
                                {salesChannels.map(channel => (
                                    <label key={channel.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="productChannel"
                                            checked={(formData.channels || []).some(c => c.id === channel.id)}
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
                                                    setFormData({
                                                        ...formData,
                                                        channels: [channel],
                                                        productName: newName
                                                    });
                                                }
                                            }}
                                            disabled={!canEdit}
                                        />
                                        {channel.name}
                                    </label>
                                ))}
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
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
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

                            </div>

                            {/* 카드 2: 기획세트 구성품 관리 (기획세트일 때만 표시) */}
                            <div style={{ display: formData.productType === '기획세트' ? 'block' : 'none' }}>
                                <div className="card" style={{ borderLeft: '5px solid #f1c40f' }}>
                                    <h3>
                                        <span style={{ color: '#f1c40f' }}>📦</span> 기획세트 구성품 관리
                                    </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📦 기획세트 구성품 관리 (Planning Set)
                                </label>
                                    <button 
                                        type="button" 
                                        className="primary" 
                                        onClick={() => setIsSearchOpen(true)} 
                                        style={{ padding: '2px 10px', fontSize: '12px', opacity: canEdit ? 1 : 0.5 }}
                                        disabled={!canEdit}
                                    >
                                        🎁 구성품 추가
                                    </button>
                            </div>

                            {formData.isPlanningSet && (
                                <div style={{ marginTop: '15px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#856404' }}>📦 기획세트 구성품</label>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px', background: '#fff' }}>
                                        <thead>
                                            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                                                <th style={{ padding: '8px', textAlign: 'left' }}>품목코드</th>
                                                <th style={{ padding: '8px', textAlign: 'left' }}>제품명</th>
                                                <th style={{ padding: '8px', textAlign: 'left' }}>용량/중량</th>
                                                <th style={{ padding: '8px', width: '80px' }}>수량</th>
                                                {canEdit && <th style={{ padding: '8px', width: '40px' }}></th>}
                                            </tr>

                                        </thead>
                                        <tbody>
                                            {formData.components.length === 0 && (
                                                <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>구성품이 없습니다. 상단 버튼으로 추가해주세요.</td></tr>
                                            )}
                                            {formData.components.map((c, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: '8px' }}>{c.itemCode}</td>
                                                    <td style={{ padding: '8px' }}>{c.productName}</td>
                                                    <td style={{ padding: '8px' }}>{c.capacity || '-'}/{c.weight || '-'}</td>
                                                    <td style={{ padding: '8px' }}>
                                                        <input
                                                            type="number"
                                                            value={c.quantity}
                                                            onChange={(e) => updateComponentQty(i, e.target.value)}
                                                            disabled={!canEdit}
                                                            style={{ width: '100%', padding: '2px' }}
                                                        />
                                                    </td>

                                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                                        <span 
                                                            onClick={() => canEdit && removeComponent(i)} 
                                                            style={{ 
                                                                color: 'red', 
                                                                cursor: canEdit ? 'pointer' : 'not-allowed', 
                                                                fontWeight: 'bold',
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
                            )}
                        </div>

                                </div>

                            {/* 카드 3: 규격 및 체적 정보 (용량, 중량, 박스규격) */}
                            <div className="card" style={{ borderLeft: '5px solid #2ecc71' }}>
                                <h3>
                                    <span style={{ color: '#2ecc71' }}>📏</span> 규격 및 체적 정보
                                </h3>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>용량 (mL)</label>
                                    <div className="input-group">
                                        <input name="capacity" type="number" value={formData.capacity || ''} onChange={handleChange} disabled={!canEdit || formData.isPlanningSet} placeholder={formData.isPlanningSet ? "자동 계산 예정" : "mL 입력"} />
                                        <div className="input-group-addon">fl.oz: {formData.capacityFlOz || '0'}</div>
                                    </div>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>제품 중량 (g)</label>
                                    <div className="input-group">
                                        <input name="weight" type="number" value={formData.weight || ''} onChange={handleChange} disabled={!canEdit || formData.isPlanningSet} placeholder="g 입력" />
                                        <div className="input-group-addon">oz: {formData.weightOz || '0'}</div>
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
                                        <label style={{ fontSize: '12px', color: '#64748b' }}>{dim === 'width' ? '가로' : dim === 'length' ? '세로' : '높이'} (mm)</label>
                                        <div className="input-group">
                                            <input name={`dimensions.${dim}`} value={formData.dimensions[dim] || ''} onChange={handleChange} type="number" step="0.1" disabled={!canEdit || formData.dimensions?.status === '확정'} placeholder="mm" />
                                            <div className="input-group-addon">in: {formData.dimensions[`${dim}Inch`] || '0'}</div>
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
                                        <label style={{ fontSize: '12px', color: '#64748b' }}>{dim.includes('Width') ? '가로' : dim.includes('Length') ? '세로' : '높이'} (mm)</label>
                                        <div className="input-group">
                                            <input name={`inboxInfo.${dim}`} value={formData.inboxInfo[dim]} onChange={handleChange} type="number" step="0.1" disabled={!canEditBoxes || !formData.inboxInfo?.hasInbox} placeholder="mm" />
                                            <div className="input-group-addon">in: {formData.inboxInfo[`${dim}Inch`] || '0'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '12px', color: '#64748b' }}>입수량 (ea)</label>
                                    <input name="inboxInfo.inboxQuantity" type="number" value={formData.inboxInfo.inboxQuantity} onChange={handleChange} disabled={!canEditBoxes || !formData.inboxInfo?.hasInbox} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '12px', color: '#64748b' }}>중량 (kg)</label>
                                    <div className="input-group">
                                        <input name="inboxInfo.inboxWeight" type="number" step="0.01" value={formData.inboxInfo.inboxWeight} onChange={handleChange} disabled={!canEditBoxes || !formData.inboxInfo?.hasInbox} placeholder="kg" />
                                        <div className="input-group-addon">lbs: {formData.inboxInfo.inboxWeightLbs || '0'}</div>
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
                                        <label style={{ fontSize: '12px', color: '#64748b' }}>{dim.includes('Width') ? '가로' : dim.includes('Length') ? '세로' : '높이'} (mm)</label>
                                        <div className="input-group">
                                            <input name={`outboxInfo.${dim}`} value={formData.outboxInfo[dim]} onChange={handleChange} type="number" step="0.1" disabled={!canEditBoxes} placeholder="mm" />
                                            <div className="input-group-addon">in: {formData.outboxInfo[`${dim}Inch`] || '0'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '12px', color: '#64748b' }}>수량 (ea)</label>
                                    <input name="outboxInfo.outboxQuantity" type="number" value={formData.outboxInfo.outboxQuantity} onChange={handleChange} disabled={!canEditBoxes} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '12px', color: '#64748b' }}>중량 (kg)</label>
                                    <div className="input-group">
                                        <input name="outboxInfo.outboxWeight" type="number" step="0.01" value={formData.outboxInfo.outboxWeight} onChange={handleChange} disabled={!canEditBoxes} placeholder="kg" />
                                        <div className="input-group-addon">lbs: {formData.outboxInfo.outboxWeightLbs || '0'}</div>
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
                                        <label style={{ fontSize: '12px', color: '#64748b' }}>{dim.includes('Width') ? '가로' : dim.includes('Length') ? '세로' : '높이'} (mm)</label>
                                        <div className="input-group">
                                            <input name={`palletInfo.${dim}`} value={formData.palletInfo[dim]} onChange={handleChange} type="number" step="0.1" disabled={!canEditBoxes} placeholder="mm" />
                                            <div className="input-group-addon">in: {formData.palletInfo[`${dim}Inch`] || '0'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '12px', color: '#64748b' }}>적재수량 (ea)</label>
                                    <input name="palletInfo.palletQuantity" type="number" value={formData.palletInfo.palletQuantity} onChange={handleChange} disabled={!canEditBoxes} />
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
                                {/* 탭 메뉴 헤더 */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #edf2f7', paddingBottom: '10px' }}>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <button type="button" onClick={() => setSpecSubTab('sheet1')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: specSubTab === 'sheet1' ? '#003366' : 'transparent', color: specSubTab === 'sheet1' ? '#fff' : '#4a5568', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                            📄 Sheet 1: 사양서 양식
                                        </button>
                                        <button type="button" onClick={() => setSpecSubTab('sheet2')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: specSubTab === 'sheet2' ? '#003366' : 'transparent', color: specSubTab === 'sheet2' ? '#fff' : '#4a5568', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                            📸 Sheet 2: 포장방법 사진
                                        </button>
                                        <button type="button" onClick={() => setSpecSubTab('sheet3')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: specSubTab === 'sheet3' ? '#003366' : 'transparent', color: specSubTab === 'sheet3' ? '#fff' : '#4a5568', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                            📦 Sheet 3: 현품표 아웃박스
                                        </button>
                                        <button type="button" onClick={() => setSpecSubTab('sheet4')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: specSubTab === 'sheet4' ? '#003366' : 'transparent', color: specSubTab === 'sheet4' ? '#fff' : '#4a5568', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                            🧱 Sheet 4: 현품표 팔레트
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {canEdit && specSubTab !== 'sheet2' && (
                                            <button type="button" onClick={handleSaveFullSpec} className="primary" style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', fontSize: '12px', padding: '6px 14px' }}>
                                                💾 사양서 저장
                                            </button>
                                        )}
                                        {product && (
                                            <>
                                                <button type="button" onClick={handleDownloadSpecExcel} className="button secondary" style={{ fontSize: '11px', padding: '6px 12px' }}>
                                                    📥 Excel 다운
                                                </button>
                                                <button type="button" onClick={handleDownloadSpecPdf} className="button secondary" style={{ fontSize: '11px', padding: '6px 12px', color: '#d32f2f', borderColor: '#d32f2f' }}>
                                                    📄 PDF 다운
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* 📢 채널별 준수 규칙 배너 */}
                                <div style={{ padding: '15px 20px', marginBottom: '20px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '12px' }}>
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        📢 채널별 포장 규격 자동 연동 규칙
                                    </h4>
                                    <div style={{ fontSize: '12px', color: '#78350f' }}>
                                        {(formData.channels || []).length === 0 ? (
                                            <span>선택된 유통 채널이 없습니다. [상세 정보] 탭에서 채널을 지정하세요.</span>
                                        ) : (
                                            formData.channels.map(ch => {
                                                const rules = (masterRules || []).filter(r => r.channel?.id === ch.id);
                                                return (
                                                    <div key={ch.id} style={{ marginBottom: '4px' }}>
                                                        <strong>{ch.name}:</strong> {rules.length > 0 ? rules.map(r => r.warningMessage).join(' / ') : '지정된 전용 규칙 없음'}
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
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>브랜드명</label>
                                                    <input type="text" readOnly value={formData.brand?.brandName || '-'} style={{ background: '#f8fafc', fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>품명(국문)</label>
                                                    <input type="text" readOnly value={formData.productName || '-'} style={{ background: '#f8fafc', fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>품명(영문)</label>
                                                    <input type="text" readOnly value={formData.englishProductName || '-'} style={{ background: '#f8fafc', fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>품목코드</label>
                                                    <input type="text" readOnly value={formData.itemCode || '-'} style={{ background: '#f8fafc', fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>제조사</label>
                                                    <input type="text" readOnly value={formData.manufacturerInfo?.name || '-'} style={{ background: '#f8fafc', fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>사용기한 / 개봉 후 기한</label>
                                                    <input type="text" readOnly value={`${formData.shelfLifeMonths || '-'}개월 / ${formData.openedShelfLifeMonths || '-'}개월`} style={{ background: '#f8fafc', fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>바코드</label>
                                                    <input type="text" value={currentSpec.barcode || ''} onChange={e => setCurrentSpec({...currentSpec, barcode: e.target.value})} disabled={!canEdit} style={{ fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>랩 넘버</label>
                                                    <input type="text" value={currentSpec.labNumber || ''} onChange={e => setCurrentSpec({...currentSpec, labNumber: e.target.value})} disabled={!canEdit} style={{ fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>바코드 담당자</label>
                                                    <input type="text" value={currentSpec.barcodeManager || ''} onChange={e => setCurrentSpec({...currentSpec, barcodeManager: e.target.value})} disabled={!canEdit} style={{ fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>기획 담당</label>
                                                    <input type="text" value={currentSpec.plannerName || ''} onChange={e => setCurrentSpec({...currentSpec, plannerName: e.target.value})} disabled={!canEdit} style={{ fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>디자인 담당</label>
                                                    <input type="text" value={currentSpec.designerName || ''} onChange={e => setCurrentSpec({...currentSpec, designerName: e.target.value})} disabled={!canEdit} style={{ fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>품질관리 담당</label>
                                                    <input type="text" value={currentSpec.qcName || ''} onChange={e => setCurrentSpec({...currentSpec, qcName: e.target.value})} disabled={!canEdit} style={{ fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>관리품 구분</label>
                                                    <select value={currentSpec.managementType || '러닝'} onChange={e => setCurrentSpec({...currentSpec, managementType: e.target.value})} disabled={!canEdit} style={{ fontSize: '12px' }}>
                                                        <option value="벌크 신규">벌크 신규</option>
                                                        <option value="사양 변경">사양 변경</option>
                                                        <option value="러닝">러닝</option>
                                                    </select>
                                                </div>
                                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>결재 라인 (기획/디자인/구매/품질 + 검토일)</label>
                                                    <input type="text" value={currentSpec.approvalChainJson || ''} onChange={e => setCurrentSpec({...currentSpec, approvalChainJson: e.target.value})} disabled={!canEdit} style={{ fontSize: '12px' }} placeholder='[{"role":"기획", "name":"홍길동", "date":"2026-06-21"}]' />
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

                                        {/* 구성품 리스트 테이블 */}
                                        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}> 제품 구성품 리스트</h3>
                                                {canEdit && (
                                                    <button type="button" onClick={handleAddSpecComponent} className="secondary" style={{ fontSize: '11px', padding: '4px 8px' }}>
                                                        + 구성품 추가
                                                    </button>
                                                )}
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                        <th style={{ padding: '8px', textAlign: 'left' }}>구성품명</th>
                                                        <th style={{ padding: '8px', textAlign: 'left' }}>재질 및 세부사양</th>
                                                        <th style={{ padding: '8px', textAlign: 'left' }}>규격 및 사이즈</th>
                                                        <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>입수량</th>
                                                        <th style={{ padding: '8px', textAlign: 'left' }}>업체</th>
                                                        <th style={{ padding: '8px', textAlign: 'left' }}>비고</th>
                                                        {canEdit && <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>삭제</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {specComponents.map((comp, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '6px' }}>
                                                                <input type="text" value={comp.componentName || ''} onChange={e => handleSpecComponentChange(idx, 'componentName', e.target.value)} disabled={!canEdit} style={{ width: '100%', fontSize: '12px' }} />
                                                            </td>
                                                            <td style={{ padding: '6px' }}>
                                                                <input type="text" value={comp.specDetails || ''} onChange={e => handleSpecComponentChange(idx, 'specDetails', e.target.value)} disabled={!canEdit} style={{ width: '100%', fontSize: '12px' }} />
                                                            </td>
                                                            <td style={{ padding: '6px' }}>
                                                                <input type="text" value={comp.sizeDimension || ''} onChange={e => handleSpecComponentChange(idx, 'sizeDimension', e.target.value)} disabled={!canEdit} style={{ width: '100%', fontSize: '12px' }} />
                                                            </td>
                                                            <td style={{ padding: '6px', textAlign: 'center' }}>
                                                                <input type="number" value={comp.quantity || 1} onChange={e => handleSpecComponentChange(idx, 'quantity', parseInt(e.target.value))} disabled={!canEdit} style={{ width: '65px', textAlign: 'center', fontSize: '12px' }} />
                                                            </td>
                                                            <td style={{ padding: '6px' }}>
                                                                <input type="text" value={comp.supplier || ''} onChange={e => handleSpecComponentChange(idx, 'supplier', e.target.value)} disabled={!canEdit} style={{ width: '100%', fontSize: '12px' }} />
                                                            </td>
                                                            <td style={{ padding: '6px' }}>
                                                                <input type="text" value={comp.remarks || ''} onChange={e => handleSpecComponentChange(idx, 'remarks', e.target.value)} disabled={!canEdit} style={{ width: '100%', fontSize: '12px' }} />
                                                            </td>
                                                            {canEdit && (
                                                                <td style={{ padding: '6px', textAlign: 'center' }}>
                                                                    <button type="button" onClick={() => handleRemoveSpecComponent(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer' }}>&times;</button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                    {specComponents.length === 0 && (
                                                        <tr>
                                                            <td colSpan={canEdit ? 7 : 6} style={{ textAlign: 'center', color: '#94a3b8', padding: '15px' }}>등록된 구성품이 없습니다.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* 아웃박스 & 착인 기준 */}
                                        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                            <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#1e293b' }}>📦 아웃박스 & 착인 기준</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>제품 착인기준 - 표기 방법</label>
                                                    <input type="text" value={currentSpec.markingMethod || ''} onChange={e => setCurrentSpec({...currentSpec, markingMethod: e.target.value})} disabled={!canEdit} style={{ fontSize: '12px' }} placeholder="예: 레이저 인쇄" />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>제품 착인기준 - 표기 기준</label>
                                                    <input type="text" value={currentSpec.markingStandard || ''} onChange={e => setCurrentSpec({...currentSpec, markingStandard: e.target.value})} disabled={!canEdit} style={{ fontSize: '12px' }} placeholder="예: 제조일로부터 24개월" />
                                                </div>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                                <label style={{ fontSize: '11px', color: '#475569' }}>포장방법 (서술)</label>
                                                <textarea value={currentSpec.packagingMethodText || ''} onChange={e => setCurrentSpec({...currentSpec, packagingMethodText: e.target.value})} disabled={!canEdit} style={{ width: '100%', height: '80px', fontSize: '12px' }} placeholder="서수형 포장 조립 순서 설명..." />
                                            </div>
                                        </div>

                                        {/* 적재사항 및 검증 */}
                                        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>📐 적재 사양 및 검증</h3>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        className="outline"
                                                        style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', border: '1px solid #2563eb', color: '#2563eb', borderRadius: '6px', background: 'transparent', cursor: 'pointer' }}
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
                                                                
                                                            setCurrentSpec({
                                                                ...currentSpec,
                                                                inboxQty: formData.inboxInfo?.inboxQuantity || currentSpec.inboxQty,
                                                                inboxSize: inboxSz,
                                                                outboxQty: formData.outboxInfo?.outboxQuantity || currentSpec.outboxQty,
                                                                outboxSize: outboxSz,
                                                                palletSize: palletSz,
                                                                onePalletHeight: formData.palletInfo?.palletHeight || currentSpec.onePalletHeight,
                                                                palletHeightLimit: formData.palletInfo?.palletHeight || currentSpec.palletHeightLimit,
                                                                oneOutboxWeight: formData.outboxInfo?.outboxWeight || currentSpec.oneOutboxWeight,
                                                                onePalletWeight: formData.palletInfo?.palletQuantity && formData.outboxInfo?.outboxWeight
                                                                    ? (parseFloat(formData.outboxInfo.outboxWeight) * parseInt(formData.palletInfo.palletQuantity)).toFixed(1)
                                                                    : currentSpec.onePalletWeight
                                                            });
                                                            toast.info("제품 마스터의 규격 및 적재 정보가 동기화되었습니다.");
                                                        }}
                                                     >
                                                        🔄 제품 마스터 규격 연동
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* 실시간 검증 경고 배너 */}
                                            <div style={{ marginBottom: '15px' }}>
                                                {parseFloat(currentSpec.oneOutboxWeight || 0) > 12 && (
                                                    <div style={{ padding: '8px 12px', marginBottom: '6px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#b91c1c', fontSize: '12px', fontWeight: 'bold' }}>
                                                        ⚠️ 1 아웃박스 중량이 제한치(12kg)를 초과했습니다! (현재: {currentSpec.oneOutboxWeight}kg)
                                                    </div>
                                                )}
                                                {parseFloat(currentSpec.onePalletWeight || 0) > 630 && (
                                                    <div style={{ padding: '8px 12px', marginBottom: '6px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#b91c1c', fontSize: '12px', fontWeight: 'bold' }}>
                                                        ⚠️ 1 팔레트 중량이 제한치(630kg)를 초과했습니다! (현재: {currentSpec.onePalletWeight}kg)
                                                    </div>
                                                )}
                                                {parseFloat(currentSpec.onePalletHeight || 0) > 1500 && (
                                                    <div style={{ padding: '8px 12px', marginBottom: '6px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#b91c1c', fontSize: '12px', fontWeight: 'bold' }}>
                                                        ⚠️ 1 팔레트 적재 높이가 제한치(1,500mm)를 초과했습니다! (현재: {currentSpec.onePalletHeight}mm)
                                                    </div>
                                                )}
                                                {checkChannelRules().map((warn, wIdx) => (
                                                    <div key={wIdx} style={{ padding: '8px 12px', marginBottom: '6px', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', color: '#b45309', fontSize: '12px', fontWeight: 'bold' }}>
                                                        {warn}
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
                                                <div style={{ border: '1px solid #f1f5f9', padding: '12px', borderRadius: '8px', background: '#f8fafc' }}>
                                                    <strong style={{ fontSize: '12px', color: '#334155', display: 'block', marginBottom: '8px' }}>📦 인박스</strong>
                                                    <div className="form-group"><label style={{ fontSize: '10px' }}>구분</label><input type="text" value={currentSpec.inboxType || ''} onChange={e => setCurrentSpec({...currentSpec, inboxType: e.target.value})} disabled={!canEdit} style={{ fontSize: '11px' }} /></div>
                                                    <div className="form-group"><label style={{ fontSize: '10px' }}>입수량 (ea)</label><input type="number" value={currentSpec.inboxQty || ''} onChange={e => setCurrentSpec({...currentSpec, inboxQty: parseInt(e.target.value)})} disabled={!canEdit} style={{ fontSize: '11px' }} /></div>
                                                    <div className="form-group"><label style={{ fontSize: '10px' }}>사이즈 (장x폭x고)</label><input type="text" value={currentSpec.inboxSize || ''} onChange={e => setCurrentSpec({...currentSpec, inboxSize: e.target.value})} disabled={!canEdit} style={{ fontSize: '11px' }} placeholder="예: 300x200x150" /></div>
                                                    <div className="form-group"><label style={{ fontSize: '10px' }}>재질</label><input type="text" value={currentSpec.inboxMaterial || ''} onChange={e => setCurrentSpec({...currentSpec, inboxMaterial: e.target.value})} disabled={!canEdit} style={{ fontSize: '11px' }} /></div>
                                                </div>
                                                <div style={{ border: '1px solid #f1f5f9', padding: '12px', borderRadius: '8px', background: '#f8fafc' }}>
                                                    <strong style={{ fontSize: '12px', color: '#334155', display: 'block', marginBottom: '8px' }}>📦 아웃박스</strong>
                                                    <div className="form-group"><label style={{ fontSize: '10px' }}>구분</label><input type="text" value={currentSpec.outboxType || ''} onChange={e => setCurrentSpec({...currentSpec, outboxType: e.target.value})} disabled={!canEdit} style={{ fontSize: '11px' }} /></div>
                                                    <div className="form-group"><label style={{ fontSize: '10px' }}>입수량 (ea)</label><input type="number" value={currentSpec.outboxQty || ''} onChange={e => setCurrentSpec({...currentSpec, outboxQty: parseInt(e.target.value)})} disabled={!canEdit} style={{ fontSize: '11px' }} /></div>
                                                    <div className="form-group"><label style={{ fontSize: '10px' }}>사이즈 (장x폭x고)</label><input type="text" value={currentSpec.outboxSize || ''} onChange={e => setCurrentSpec({...currentSpec, outboxSize: e.target.value})} disabled={!canEdit} style={{ fontSize: '11px' }} placeholder="예: 600x400x300" /></div>
                                                    <div className="form-group"><label style={{ fontSize: '10px' }}>재질</label><input type="text" value={currentSpec.outboxMaterial || ''} onChange={e => setCurrentSpec({...currentSpec, outboxMaterial: e.target.value})} disabled={!canEdit} style={{ fontSize: '11px' }} /></div>
                                                </div>
                                                <div style={{ border: '1px solid #f1f5f9', padding: '12px', borderRadius: '8px', background: '#f8fafc' }}>
                                                    <strong style={{ fontSize: '12px', color: '#334155', display: 'block', marginBottom: '8px' }}>🧱 팔레트 적재</strong>
                                                    <div className="form-group"><label style={{ fontSize: '10px' }}>종류</label><input type="text" value={currentSpec.palletTypeStr || ''} onChange={e => setCurrentSpec({...currentSpec, palletTypeStr: e.target.value})} disabled={!canEdit} style={{ fontSize: '11px' }} placeholder="예: AJU 11형 플라스틱" /></div>
                                                    <div className="form-group"><label style={{ fontSize: '10px' }}>적재방법</label><input type="text" value={currentSpec.palletStackingMethod || ''} onChange={e => setCurrentSpec({...currentSpec, palletStackingMethod: e.target.value})} disabled={!canEdit} style={{ fontSize: '11px' }} placeholder="예: 6단 엇갈려 쌓기" /></div>
                                                    <div className="form-group"><label style={{ fontSize: '10px' }}>사이즈</label><input type="text" value={currentSpec.palletSize || ''} onChange={e => setCurrentSpec({...currentSpec, palletSize: e.target.value})} disabled={!canEdit} style={{ fontSize: '11px' }} placeholder="예: 1100x1100" /></div>
                                                    <div className="form-group"><label style={{ fontSize: '10px' }}>높이 제한 (mm)</label><input type="text" value={currentSpec.palletHeightLimit || ''} onChange={e => setCurrentSpec({...currentSpec, palletHeightLimit: e.target.value})} disabled={!canEdit} style={{ fontSize: '11px' }} placeholder="예: 1500" /></div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>1 아웃박스 중량 (kg) [제한: 12kg]</label>
                                                    <input type="number" step="0.01" value={currentSpec.oneOutboxWeight || ''} onChange={e => setCurrentSpec({...currentSpec, oneOutboxWeight: parseFloat(e.target.value) || ''})} disabled={!canEdit} style={{ borderColor: parseFloat(currentSpec.oneOutboxWeight || 0) > 12 ? '#ef4444' : '#ddd', fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>1 팔레트 중량 (kg) [제한: 630kg]</label>
                                                    <input type="number" step="0.1" value={currentSpec.onePalletWeight || ''} onChange={e => setCurrentSpec({...currentSpec, onePalletWeight: parseFloat(e.target.value) || ''})} disabled={!canEdit} style={{ borderColor: parseFloat(currentSpec.onePalletWeight || 0) > 630 ? '#ef4444' : '#ddd', fontSize: '12px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: '11px', color: '#475569' }}>1 팔레트 높이 (mm) [제한: 1,500mm]</label>
                                                    <input type="number" step="1" value={currentSpec.onePalletHeight || ''} onChange={e => setCurrentSpec({...currentSpec, onePalletHeight: parseFloat(e.target.value) || ''})} disabled={!canEdit} style={{ borderColor: parseFloat(currentSpec.onePalletHeight || 0) > 1500 ? '#ef4444' : '#ddd', fontSize: '12px' }} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 특이사항 */}
                                        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                            <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#1e293b' }}>📝 특이사항</h3>
                                            <textarea value={currentSpec.remarks || ''} onChange={e => setCurrentSpec({...currentSpec, remarks: e.target.value})} disabled={!canEdit} style={{ width: '100%', height: '80px', fontSize: '12px' }} placeholder="공장 출하 또는 적재 보관 시 특이 우려 사항 자유 서술..." />
                                        </div>
                                    </div>
                                )}

                                {specSubTab === 'sheet2' && (
                                    currentSpec && currentSpec.id ? (
                                         <PackagingMethodTab 
                                             specId={currentSpec.id} 
                                             canEdit={canEdit} 
                                             onRegisterSaveHandler={(fn) => { packagingMethodSaveRef.current = fn; }}
                                         />
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📸</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b', marginBottom: '6px' }}>포장사양서 기본 정보를 먼저 저장해주세요</div>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>포장방법 사진 등록은 사양서 저장(생성) 완료 후 이용하실 수 있습니다.</div>
                                            <button 
                                                type="button" 
                                                onClick={handleSaveFullSpec} 
                                                style={{ backgroundColor: '#0f172a', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                                            >
                                                💾 포장사양서 저장하기
                                            </button>
                                        </div>
                                    )
                                )}

                                {specSubTab === 'sheet3' && (
                                    <div className="card" style={{ padding: '25px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                                        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                                            📦 Sheet 3: 현품표 아웃박스 시각화
                                        </h3>
                                        
                                        {/* 현품표 가상 카드 레이아웃 */}
                                        <div style={{ maxWidth: '500px', margin: '0 auto', background: '#fff', border: '2px solid #000', padding: '20px', fontFamily: 'monospace', color: '#000' }}>
                                            <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
                                                [ 아 웁 박 스 현 품 표 ]
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <tbody>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', width: '120px' }}>품목코드:</td>
                                                        <td style={{ padding: '8px' }}>{formData.itemCode || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>제품명:</td>
                                                        <td style={{ padding: '8px' }}>{formData.productName || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>입수량:</td>
                                                        <td style={{ padding: '8px' }}>{currentSpec.outboxQty ? `${currentSpec.outboxQty} EA` : '0 EA'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>박스 규격:</td>
                                                        <td style={{ padding: '8px' }}>{currentSpec.outboxSize || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>중 량:</td>
                                                        <td style={{ padding: '8px' }}>{currentSpec.oneOutboxWeight ? `${currentSpec.oneOutboxWeight} kg` : '- kg'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>제조일자:</td>
                                                        <td style={{ padding: '8px' }}>[ 생산 배치일 별도 표기 ]</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>제조사:</td>
                                                        <td style={{ padding: '8px' }}>{formData.manufacturerInfo?.name || '-'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <div style={{ marginTop: '20px', borderTop: '2px dashed #000', paddingTop: '15px', textAlign: 'center' }}>
                                                {/* 가상 바코드 */}
                                                <div style={{ letterSpacing: '8px', fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>
                                                    ||||| | |||| ||| ||
                                                </div>
                                                <div style={{ fontSize: '12px' }}>{currentSpec.barcode || 'BARCODE-NOT-SET'}</div>
                                            </div>
                                        </div>

                                        {/* 3D / 이미지 가상 캔버스 영역 설계 */}
                                        <div style={{ marginTop: '25px', padding: '20px', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>📸 아웃박스 외관 및 착인 위치 이미지 (3D 모델/도면 연동부)</div>
                                            <div style={{ height: '180px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                                [ 이미지 드래그 업로드 또는 3D WebGL 캔버스 렌더링 영역 ]
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {specSubTab === 'sheet4' && (
                                    <div className="card" style={{ padding: '25px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                                        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                                            🧱 Sheet 4: 현품표 팔레트 시각화
                                        </h3>
                                        
                                        {/* 팔레트 현품표 가상 카드 */}
                                        <div style={{ maxWidth: '500px', margin: '0 auto', background: '#fff', border: '2px solid #000', padding: '20px', fontFamily: 'monospace', color: '#000' }}>
                                            <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
                                                [ 팔 레 트 현 품 표 ]
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <tbody>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', width: '120px' }}>적재 제품:</td>
                                                        <td style={{ padding: '8px' }}>{formData.productName || '-'} ({formData.itemCode || '-'})</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>팔레트 종류:</td>
                                                        <td style={{ padding: '8px' }}>{currentSpec.palletTypeStr || '-'}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>적재 단수/방법:</td>
                                                        <td style={{ padding: '8px' }}>{currentSpec.palletStackingMethod || '-'} / 높이제한: {currentSpec.palletHeightLimit || '-'}mm</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>총 적재 높이:</td>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: parseFloat(currentSpec.onePalletHeight || 0) > 1500 ? '#ef4444' : '#000' }}>
                                                            {currentSpec.onePalletHeight ? `${currentSpec.onePalletHeight} mm` : '- mm'}
                                                            {parseFloat(currentSpec.onePalletHeight || 0) > 1500 && ' (초과)'}
                                                        </td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>총 적재 중량:</td>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: parseFloat(currentSpec.onePalletWeight || 0) > 630 ? '#ef4444' : '#000' }}>
                                                            {currentSpec.onePalletWeight ? `${currentSpec.onePalletWeight} kg` : '- kg'}
                                                            {parseFloat(currentSpec.onePalletWeight || 0) > 630 && ' (초과)'}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>적재 시 주의사항:</td>
                                                        <td style={{ padding: '8px', whiteSpace: 'pre-wrap' }}>{currentSpec.palletPrecautions || '낙하 주의 및 보호 필름 랩핑 필수'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* 팔레트 입형태 적재 이미지 가상 캔버스 */}
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
        </div>
    );
};

export default ProductDrawer;
