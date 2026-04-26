import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { usePermissions } from '../usePermissions';
import api, { 
    getInboundData, 
    updateInboundData, 
    getInboundHistory, 
    uploadCoaFile,
    triggerWmsFetch,
    getManufacturers 
} from '../api';

export const useQualityManagement = (user, navigationData, onNavigated) => {
    const gridRef = useRef();
    const [rowData, setRowData] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedInbound, setSelectedInbound] = useState(null);
    const [history, setHistory] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('info');
    
    const { canEdit: canEditPerm, isAdmin: isPermAdmin } = usePermissions(user);
    const canEdit = canEditPerm('inboundInspection');
    const isAdmin = isPermAdmin;
    const isInternalQuality = canEdit;
    const isManufacturer = user?.roles?.some(r => r.authority === 'ROLE_MANUFACTURER');

    const getInitialDates = () => {
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        const format = d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        return { start: format(lastWeek), end: format(today) };
    };
    
    // 검색 필터 상태
    const [searchParams, setSearchParams] = useState({
        startDate: getInitialDates().start,
        endDate: getInitialDates().end,
        itemCode: '',
        productName: '',
        lotNumber: '',
        manufacturer: '',
        excludeStatus: 'STEP5_FINAL_COMPLETE' // 초기값: 완료건 제외
    });

    const [manufacturers, setManufacturers] = useState([]);
    const [changedRows, setChangedRows] = useState(new Set());

    const overallStatusMap = {
        'STEP1_WAITING': '1. 입고 검사 대기 중',
        'STEP2_INBOUND_COMPLETE': '2. 입고 검사 완료',
        'STEP3_CONTROL_CHECKING': '3. 관리품 확인 중',
        'STEP4_CONTROL_COMPLETE': '4. 관리품 완료',
        'STEP5_FINAL_COMPLETE': '5. 최종 검사 완료'
    };
    
    const getFullUrl = (url) => url?.startsWith('http') ? url : `${api.defaults.baseURL.replace('/api', '')}${url}`;

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

    const hasFetchedOnMount = useRef(false);
    useEffect(() => {
        if (hasFetchedOnMount.current) return;
        hasFetchedOnMount.current = true;
        fetchInboundData();
        loadManufacturers();
    }, []);

    const loadManufacturers = async () => {
        try {
            const res = await getManufacturers();
            setManufacturers(res.data || []);
        } catch (error) {
            // Silently fail
        }
    };

    useEffect(() => {
        if (navigationData && navigationData.id && rowData.length > 0) {
            const target = rowData.find(item => item.id === navigationData.id);
            if (target) {
                handleRowAction(target);
            }
            if (onNavigated) onNavigated();
        }
    }, [navigationData, rowData]);

    const fetchInboundData = async () => {
        setIsLoading(true);
        try {
            const response = await getInboundData(searchParams);
            setRowData(response.data || []);
        } catch (error) {
            toast.error("입고 데이터를 불러오지 못했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsLoading(true);
        try {
            await triggerWmsFetch();
            toast.success("WMS 데이터 동기화 완료!");
            fetchInboundData();
        } catch (error) {
            toast.error("데이터 동기화에 실패했습니다.");
            setIsLoading(false);
        }
    };

    const onCellValueChanged = (params) => {
        params.node.setSelected(true); // 수정 시 자동 체크
        setChangedRows(prev => new Set(prev).add(params.data.id));
    };

    const handleBatchSave = async () => {
        if (!gridRef.current) return;
        const selectedNodes = gridRef.current.api.getSelectedNodes();
        if (selectedNodes.length === 0) {
            toast.warning("저장할 수정사항이 없습니다.");
            return;
        }

        setIsLoading(true);
        const updates = selectedNodes.map(node => node.data);
        let successCount = 0;
        
        try {
            for (const data of updates) {
                await updateInboundData(data.id, data);
                successCount++;
            }
            toast.success(`${successCount}건의 수정사항이 저장되었습니다.`);
            setChangedRows(new Set());
            gridRef.current.api.deselectAll();
            fetchInboundData();
        } catch (error) {
            toast.error("일부 저장 실패: " + (error.response?.data?.message || error.message));
            fetchInboundData();
        } finally {
            setIsLoading(false);
        }
    };

    const handleRowAction = async (data) => {
        setSelectedInbound(data);
        setActiveTab('info');
        setIsDrawerOpen(true);
        try {
            const res = await getInboundHistory(data.id);
            setHistory(res.data);
        } catch (error) {
            // Silently fail
        }
    };

    const handleFileUpload = async (e, record, field = 'coaFileUrl') => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validation: PDF Extension
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            toast.error("PDF 파일만 업로드 가능합니다.");
            e.target.value = '';
            return;
        }
        
        // Validation: File Size (10MB limit)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            toast.error("파일 크기는 10MB를 초과할 수 없습니다.");
            e.target.value = '';
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading("파일을 업로드 중입니다...");
        try {
            const res = await uploadCoaFile(file, record.productName);
            const fileUrl = res.data;
            
            const existingUrls = record[field];
            const newCoaFileUrl = existingUrls ? `${existingUrls},${fileUrl}` : fileUrl;
            const updated = { ...record, [field]: newCoaFileUrl };
            await updateInboundData(record.id, updated);
            
            setRowData(prev => prev.map(row => row.id === record.id ? updated : row));
            const gridApi = gridRef.current?.api;
            if (gridApi) {
                const node = gridApi.getRowNode(String(record.id));
                if (node) node.setSelected(true);
            }

            if (selectedInbound?.id === record.id) setSelectedInbound(updated);
            
            toast.update(toastId, { render: "COA 파일이 성공적으로 업로드되었습니다.", type: "success", isLoading: false, autoClose: 3000 });
        } catch (error) {
            toast.update(toastId, { render: "업로드 실패: " + (error.response?.data?.message || error.response?.data || error.message), type: "error", isLoading: false, autoClose: 5000 });
        } finally {
            setIsUploading(false);
            e.target.value = ''; 
        }
    };

    return {
        gridRef,
        rowData,
        setRowData,
        isDrawerOpen,
        setIsDrawerOpen,
        selectedInbound,
        setSelectedInbound,
        history,
        setHistory,
        isUploading,
        isLoading,
        activeTab,
        setActiveTab,
        searchParams,
        setSearchParams,
        manufacturers,
        isAdmin,
        isQuality: canEdit,
        isInternalQuality: canEdit,
        isManufacturer,
        canEdit,
        overallStatusMap,
        getFullUrl,
        getCleanFileName,
        getInitialDates,
        fetchInboundData,
        handleSync,
        onCellValueChanged,
        handleBatchSave,
        handleRowAction,
        handleFileUpload
    };
};
