import React, { useState, useEffect } from 'react';
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
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [packagingSpecs, setPackagingSpecs] = useState([]);
    const [currentSpec, setCurrentSpec] = useState({
        packagingMethodText: '',
        packagingMethodImage: '',
        inboxSpec: '',
        zipperBagSpec: '',
        outboxSpec: '',
        palletStackingSpec: '',
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
                }
            };
            fetchFullProduct();
            fetchHistory(product.id);
            fetchPackagingSpecs(product.id);
        } else {
            resetForm();
        }
    }, [product]);

    const loadData = async () => {
        try {
            const [brandRes, manufacturerRes, materialRes, templateRes, ruleRes, channelRes] = await Promise.all([
                getBrands(),
                getManufacturers(),
                api.getMasterMaterials(),
                api.getMasterTemplates(),
                api.getMasterRules(),
                api.getSalesChannels()
            ]);
            setBrands(brandRes.data);
            setManufacturers(manufacturerRes.data);
            setMasterMaterials(materialRes.data);
            setMasterTemplates(templateRes.data);
            setMasterRules(ruleRes.data);
            setSalesChannels(channelRes.data.filter(c => c.active));
        } catch (error) {
            // Load meta fail
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
    };

    const fetchHistory = async (id) => {
        try {
            const res = await api.getProductHistory(id);
            setHistory(res.data);
        } catch (error) {
            // Hist fail
        }
    };

    const fetchPackagingSpecs = async (id) => {
        try {
            const res = await api.getPackagingSpecs(id);
            setPackagingSpecs(res.data);
        } catch (error) {
            // Specs fail
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
        if (selectedBomIndex !== null) {
            const newBoms = [...currentSpec.bomItems];
            newBoms[selectedBomIndex] = {
                ...newBoms[selectedBomIndex],
                masterMaterialId: m.id,
                specification: m.specification || '' // Sync with master specification
            };
            setCurrentSpec({ ...currentSpec, bomItems: newBoms });
        }
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
                        {product && <button type="button" className={`drawer-tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>변경 이력</button>}
                    </div>
                </div>

                <div className="drawer-body">
                    <form id="product-form" onSubmit={handleSubmit} className="drawer-body-form">
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
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '8px', display: 'block' }}>📢 유통 채널 (복수 선택 가능)</label>
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
                                            type="checkbox"
                                            checked={(formData.channels || []).some(c => c.id === channel.id)}
                                            onChange={(e) => {
                                                const newChannels = e.target.checked
                                                    ? [...(formData.channels || []), channel]
                                                    : (formData.channels || []).filter(c => c.id !== channel.id);
                                                setFormData({ ...formData, channels: newChannels });
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
                    <div className="tab-pane">
                        {/* 📢 채널별 준수 규칙 배너 (Card 형태) */}
                        <div className="card" style={{ padding: '20px', marginBottom: '25px', background: '#fffaf0', border: '1px solid #fbd38d', borderRadius: '12px' }}>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#9c4221', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                📢 유통 채널별 규격 준수 안내
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {(formData.channels || []).length === 0 ? (
                                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>등록된 유통 채널이 없습니다. [상세 정보] 탭에서 채널을 선택해 주세요.</p>
                                ) : (formData.channels || []).map(channel => {
                                    const matchedRules = (masterRules || []).filter(r => r.channel?.id === channel.id);
                                    if (matchedRules.length === 0) return null;
                                    return (
                                        <div key={channel.id} style={{ borderLeft: '4px solid #fbd38d', paddingLeft: '12px', marginBottom: '5px' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#7b341e' }}>{channel.name}</div>
                                            {matchedRules.map((rule, rIdx) => (
                                                <div key={rIdx} style={{ fontSize: '12px' }}>• {rule.warningMessage || '규칙 준수 필요'}</div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 📂 포장사양서 마스터 및 요약 카드 */}
                        <div className="card" style={{ padding: '25px', marginBottom: '25px', border: '1px solid #edf2f7', borderRadius: '12px', background: '#e7f5ff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '17px', color: '#003366', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#3182ce' }}>📂</span> 포장사양서 제작 및 관리
                                </h3>
                                {permissions.canManageDisclosure && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: formData.photoAuditDisclosed ? '#eef2ff' : '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${formData.photoAuditDisclosed ? '#c7d2fe' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
                                        <input type="checkbox" name="photoAuditDisclosed" checked={formData.photoAuditDisclosed} onChange={handleChange} disabled={!canEdit} style={{ width: '18px', height: '18px' }} />
                                        <span style={{ fontSize: '13px', fontWeight: '800', color: formData.photoAuditDisclosed ? '#4338ca' : '#718096' }}>📸 사진감리 제조사 공개</span>
                                    </label>
                                )}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {canEdit && (
                                        <button type="button" onClick={handleCopyMasterSpec} className="secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>🛡️ 마스터 사양 복제</button>
                                    )}
                                    <button type="button" onClick={handleDownloadSpecExcel} className="secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>📥 Excel</button>
                                </div>
                            </div>

                            {/* Feature 9: Read-only Header Information */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #d1e9ff', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                                <div><label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', display: 'block' }}>품목코드</label><div style={{ fontWeight: 'bold', fontSize: '13px' }}>{formData.itemCode || '-'}</div></div>
                                <div><label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', display: 'block' }}>제품명</label><div style={{ fontWeight: 'bold', fontSize: '13px' }}>{formData.productName || '-'}</div></div>
                                <div><label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', display: 'block' }}>유통채널</label><div style={{ fontWeight: 'bold', fontSize: '13px' }}>{(formData.channels || []).map(c => c.name).join(', ') || '-'}</div></div>
                                <div><label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', display: 'block' }}>용량/중량</label><div style={{ fontWeight: 'bold', fontSize: '13px' }}>{formData.capacity || formData.weight || '-'}</div></div>
                                <div><label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', display: 'block' }}>사용기한</label><div style={{ fontWeight: 'bold', fontSize: '13px' }}>{formData.shelfLifeMonths ? `${formData.shelfLifeMonths}개월` : '-'}</div></div>
                                <div><label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', display: 'block' }}>포장단위</label><div style={{ fontWeight: 'bold', fontSize: '13px' }}>{formData.inboxInfo?.inboxQuantity || '0'}ea / {formData.outboxInfo?.outboxQuantity || '0'}ea</div></div>
                            </div>
                        </div>

                            {/* 카드 3: 구성품 정보 (BOM Master 매핑) */}
                            <div className="card" style={{ padding: '25px', marginBottom: '25px', border: '1px solid #edf2f7', borderRadius: '12px' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '17px', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#eb4d4b' }}>📋</span> 구성품 정보 (BOM Master)
                                </h3>
                                <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead style={{ background: '#f8f9fa' }}>
                                            <tr>
                                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #eee' }}>구성품명</th>
                                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #eee' }}>재질(ReadOnly)</th>
                                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #eee' }}>제조사(ReadOnly)</th>
                                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #eee' }}>규격</th>
                                                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #eee' }}>수량</th>
                                                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #eee' }}>삭제</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(currentSpec.bomItems || []).map((item, idx) => {
                                                const master = masterMaterials.find(m => m.id === item.masterMaterialId) || {};
                                                return (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                                        <td style={{ padding: '8px' }}>
                                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                                <input
                                                                    value={master.componentName || ''}
                                                                    readOnly
                                                                    placeholder="마스터 선택"
                                                                    style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px', background: '#f8f9fa' }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedBomIndex(idx);
                                                                        setIsBomSearchOpen(true);
                                                                    }}
                                                                    className="secondary"
                                                                    style={{ padding: '4px 8px', fontSize: '11px' }}
                                                                    disabled={!canEdit}
                                                                >
                                                                    🔍
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '8px', color: '#666' }}>{master.material || '-'}</td>
                                                        <td style={{ padding: '8px', color: '#666' }}>{master.manufacturer || '-'}</td>
                                                        <td style={{ padding: '8px' }}>
                                                            <input
                                                                value={item.specification || ''}
                                                                readOnly
                                                                placeholder="마스터 정보 연동"
                                                                style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #ddd', background: '#f8f9fa' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                value={item.usageCount || 1}
                                                                onChange={e => {
                                                                    const newBoms = [...currentSpec.bomItems];
                                                                    newBoms[idx].usageCount = parseFloat(e.target.value);
                                                                    setCurrentSpec({ ...currentSpec, bomItems: newBoms });
                                                                }}
                                                                disabled={!canEdit}
                                                                style={{ width: '60px', padding: '4px', textAlign: 'center', borderRadius: '4px', border: '1px solid #ddd' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newBoms = currentSpec.bomItems.filter((_, i) => i !== idx);
                                                                    setCurrentSpec({ ...currentSpec, bomItems: newBoms });
                                                                }}
                                                                disabled={!canEdit}
                                                                style={{ background: 'none', border: 'none', color: '#dc3545', cursor: canEdit ? 'pointer' : 'not-allowed', fontSize: '18px', opacity: canEdit ? 1 : 0.3 }}
                                                            >×</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentSpec({ ...currentSpec, bomItems: [...(currentSpec.bomItems || []), { masterMaterialId: '', specification: '', usageCount: 1 }] })}
                                        style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#007bff', fontSize: '12px', cursor: canEdit ? 'pointer' : 'not-allowed', opacity: canEdit ? 1 : 0.5 }}
                                        disabled={!canEdit}
                                    >
                                        + 구성품 추가
                                    </button>
                                </div>
                            </div>

                            {/* 카드 4: 세부 포장 및 적재 사양 */}
                            <div className="card" style={{ padding: '25px', marginBottom: '25px', border: '1px solid #edf2f7', borderRadius: '12px' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '17px', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#f0932b' }}>📦</span> 세부 포장 및 적재 사양
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }}>
                                    <div className="form-group">
                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>📤 인박스/입수사양 (Feature 10b)</label>
                                        <textarea
                                            value={currentSpec.inboxSpec || ''}
                                            onChange={e => setCurrentSpec({ ...currentSpec, inboxSpec: e.target.value })}
                                            disabled={!canEdit}
                                            style={{ width: '100%', height: '60px', padding: '8px', borderRadius: '4px', fontSize: '12px' }}
                                            placeholder="입수량, 내품 보호 방식 등"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>🛍️ 지퍼백 사양 (Feature 10c)</label>
                                        <textarea
                                            value={currentSpec.zipperBagSpec || ''}
                                            onChange={e => setCurrentSpec({ ...currentSpec, zipperBagSpec: e.target.value })}
                                            disabled={!canEdit}
                                            style={{ width: '100%', height: '60px', padding: '8px', borderRadius: '4px', fontSize: '12px' }}
                                            placeholder="규격, 재질, 부착 위치 등"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>📦 아웃박스 사양 (Feature 10d)</label>
                                        <textarea
                                            value={currentSpec.outboxSpec || ''}
                                            onChange={e => setCurrentSpec({ ...currentSpec, outboxSpec: e.target.value })}
                                            disabled={!canEdit}
                                            style={{ width: '100%', height: '60px', padding: '8px', borderRadius: '4px', fontSize: '12px' }}
                                            placeholder="박스 테이핑 방식, 중량물 주의 표기 등"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>🧱 팔레트 적재 및 팔레트</label>
                                        <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                                            <select
                                                value={currentSpec.palletType || ''}
                                                onChange={e => setCurrentSpec({ ...currentSpec, palletType: e.target.value })}
                                                disabled={!canEdit}
                                                style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '4px' }}
                                            >
                                                <option value="">팔레트 선택</option>
                                                <option value="AJU">아주(1,100)</option>
                                                <option value="WOODEN_FUMIGATED">나무 훈증(1,200)</option>
                                                <option value="DISPOSABLE_EXPORT">수출용 일회용</option>
                                            </select>
                                        </div>
                                        <textarea
                                            value={currentSpec.palletStackingSpec || ''}
                                            onChange={e => setCurrentSpec({ ...currentSpec, palletStackingSpec: e.target.value })}
                                            disabled={!canEdit}
                                            style={{ width: '100%', height: '30px', padding: '6px', borderRadius: '4px', fontSize: '12px' }}
                                            placeholder="적재 단수, 랩핑 횟수 등"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '11px', fontWeight: 'bold' }}>🔢 제조번호 및 사용기한 입력란 (Feature 10f)</label>
                                    <input
                                        value={currentSpec.lotAndExpiryFormat || ''}
                                        onChange={e => setCurrentSpec({ ...currentSpec, lotAndExpiryFormat: e.target.value })}
                                        disabled={!canEdit}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }}
                                        placeholder="예: EXP YYYY.MM.DD / LOT A001 (착인/압인 위치 및 방식)"
                                    />
                                </div>
                            </div>

                            {/* 카드 5: 포장방법 및 이미지 */}
                            <div className="card" style={{ padding: '25px', marginBottom: '25px', border: '1px solid #edf2f7', borderRadius: '12px' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '17px', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#be2edd' }}>📝</span> 포장방법 및 이미지
                                </h3>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <div style={{ marginBottom: '8px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📋 포장방법 설명 (템플릿 활용)</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                            {masterTemplates.length > 0 ? masterTemplates.map(t => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm(`[${t.productType}] 템플릿을 적용하시겠습니까?`)) {
                                                            setCurrentSpec(prev => ({ ...prev, packagingMethodText: t.templateText }));
                                                        }
                                                    }}
                                                    className="secondary"
                                                    style={{
                                                        fontSize: '10px',
                                                        padding: '2px 8px',
                                                        background: t.productType === formData.productType ? '#003366' : '#e9ecef',
                                                        color: t.productType === formData.productType ? '#fff' : '#495057',
                                                        border: '1px solid #ced4da',
                                                        borderRadius: '4px'
                                                    }}
                                                >
                                                    ⚡ {t.productType}
                                                </button>
                                            )) : (
                                                <span style={{ fontSize: '10px', color: '#999' }}>등록된 템플릿 탐색 중...</span>
                                            )}
                                        </div>
                                    </div>
                                    <textarea
                                        value={currentSpec.packagingMethodText || ''}
                                        onChange={e => setCurrentSpec({ ...currentSpec, packagingMethodText: e.target.value })}
                                        style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                        placeholder="포장방법에 대한 상세 내용을 기재하세요."
                                    />
                                </div>
                            </div>

                            {/* 카드 6: 등록된 포장사양서 목록 */}
                            <div className="card" style={{ padding: '25px', marginBottom: '25px', border: '1px solid #edf2f7', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #edf2f7', paddingBottom: '10px', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0, fontSize: '17px', color: '#2d3748', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#4834d4' }}>📋</span> 등록된 포장사양서 목록
                                    </h3>
                                    {product && (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button type="button" onClick={handleDownloadSpecExcel} className="button secondary" style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                📥 엑셀(Excel) 다운로드
                                            </button>
                                            <button type="button" onClick={handleDownloadSpecPdf} className="button secondary" style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px', color: '#d32f2f', borderColor: '#d32f2f' }}>
                                                📄 PDF 다운로드
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {packagingSpecs.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>등록된 사양서가 없습니다.</p>}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                                    {packagingSpecs.map(spec => (
                                        <div key={spec.id} style={{ border: '1px solid #eee', padding: '10px', borderRadius: '5px', fontSize: '13px', background: '#fff' }}>
                                            <div style={{ fontWeight: 'bold', color: '#0056b3', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                                                버전 v{spec.version || 1}
                                                <span style={{ fontSize: '11px', color: '#666', fontWeight: 'normal', marginLeft: '10px' }}>
                                                    개정사항: {spec.revisionNotes || '신규 등록'}
                                                </span>
                                            </div>
                                            <div style={{ whiteSpace: 'pre-wrap', color: '#333', marginBottom: '8px' }}>
                                                <strong>포장방법 설명:</strong><br />
                                                {spec.packagingMethodText || '기재 내용 없음'}
                                            </div>
                                            {spec.packagingMethodImage && (
                                                <div style={{ marginTop: '5px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', display: 'inline-block' }}>
                                                    <img src={getFileUrl(spec.packagingMethodImage)} alt="포장방법" style={{ maxWidth: '100%', maxHeight: '120px', display: 'block', cursor: 'pointer' }} onClick={() => window.open(getFileUrl(spec.packagingMethodImage), '_blank')} />
                                                </div>
                                            )}
                                            <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>수정: {spec.lastModifiedBy} ({spec.lastModifiedAt?.split('T')[0]})</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
        </div>
    );
};

export default ProductDrawer;
