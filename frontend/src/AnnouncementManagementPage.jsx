import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
    getAnnouncements,
    saveAnnouncement,
    deleteAnnouncement,
    getAnnouncementCategories,
    saveAnnouncementCategory,
    deleteAnnouncementCategory,
    sendAnnouncementEmail,
    getManufacturerCategories,
    getManufacturers,
    getCompanyDepartmentsAndEmails
} from './api';
import { toast } from 'react-toastify';
import { usePermissions } from './usePermissions';
import SaveConfirmModal from './components/SaveConfirmModal';

/**
 * 전체공지사항 관리 페이지 V2.
 * [디자인 표준] 3단계 표준 헤더 레이아웃, Ag-Grid 목록, 제품 마스터 수정 스타일 표준 Drawer 팝업 적용.
 * [권한 제어] announcements 및 announcementCategories VIEW/EDIT/DELETE 권한 준수.
 */
const AnnouncementManagementPage = ({ user, onNavigate, navigationData }) => {
    const gridRef = useRef(null);
    const { canEdit: canEditPermission, canDelete: canDeletePermission } = usePermissions(user);
    const canEdit = canEditPermission('announcements');
    const canDelete = canDeletePermission('announcements');
    const canEditCategories = canEditPermission('announcementCategories');
    const canDeleteCategories = canDeletePermission('announcementCategories');

    // Tab State
    const [activeTab, setActiveTab] = useState('announcements'); // 'announcements' or 'categories'

    // Data State
    const [rowData, setRowData] = useState([]);
    const [categoriesList, setCategoriesList] = useState([]);
    const [mfrCategories, setMfrCategories] = useState([]);
    const [mfrList, setMfrList] = useState([]); // 제조사 목록
    const [deptList, setDeptList] = useState([]); // 부서 목록
    const [loading, setLoading] = useState(false);
    const [quickFilterText, setQuickFilterText] = useState('');
    const [categoryQuickFilterText, setCategoryQuickFilterText] = useState('');

    // Announcement Drawer/Modal State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // Detail View & Email Preview Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
    const [previewAnnouncement, setPreviewAnnouncement] = useState(null);

    // Announcement Form State
    const [selectedAnnouncement, setSelectedAnnouncement] = useState({
        id: null,
        announcementNumber: '',
        title: '',
        content: '',
        categoryId: '',
        targetType: 'ALL', // 'ALL', 'CATEGORY', 'MANUFACTURER'
        targetCategory: '',
        targetManufacturer: '',
        targetDepartments: '',
        emailSent: false,
        emailSentAt: null
    });

    // Category Drawer State
    const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
    const [isCategoryEditMode, setIsCategoryEditMode] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState({
        id: null,
        name: '',
        color: '#475569',
        bold: false,
        sortOrder: 0
    });

    useEffect(() => {
        fetchAnnouncements();
        fetchCategories();
        fetchMfrCategories();
        fetchManufacturersList();
    }, []);

    // 대시보드 연동: navigationData.id 가 있는 경우 해당 공지 자동 보기
    const hasAutoOpened = useRef(false);
    useEffect(() => {
        if (rowData.length > 0 && navigationData?.id && !hasAutoOpened.current) {
            const matched = rowData.find(ann => ann.id === Number(navigationData.id) || ann.id === navigationData.id);
            if (matched) {
                hasAutoOpened.current = true;
                handleOpenDetail(matched);
            }
        }
    }, [rowData, navigationData]);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const response = await getAnnouncements();
            setRowData(response.data || []);
        } catch (error) {
            toast.error("공지사항 목록을 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await getAnnouncementCategories();
            setCategoriesList(response.data || []);
        } catch (error) {
            toast.error("공지 분류 목록을 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const fetchMfrCategories = async () => {
        try {
            const data = await getManufacturerCategories();
            setMfrCategories(data || []);
        } catch (error) {
            console.error("제조사 카테고리 로딩 실패:", error);
        }
    };

    const fetchManufacturersList = async () => {
        try {
            const response = await getManufacturers();
            setMfrList(response.data || []);
        } catch (error) {
            console.error("제조사 목록 로딩 실패:", error);
        }
    };

    const loadDepartmentsForCompany = async (companyName) => {
        if (!companyName) {
            setDeptList([]);
            return;
        }
        try {
            const response = await getCompanyDepartmentsAndEmails(companyName);
            const depts = Object.keys(response.data || {});
            setDeptList(depts);
        } catch (error) {
            console.error("제조사 부서 로딩 실패:", error);
            setDeptList([]);
        }
    };

    // --- Announcement Actions ---
    const handleCopyText = (announcement) => {
        const cat = announcement.category || categoriesList.find(c => c.id === announcement.categoryId) || { name: '일반' };
        const textToCopy = `[${cat.name}] ${announcement.title}\n\n${announcement.content}`;
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                toast.success("공지 텍스트가 클립보드에 복사되었습니다.");
            })
            .catch(() => {
                toast.error("클립보드 복사에 실패했습니다.");
            });
    };

    const handleCopy = (announcement) => {
        const selectedCat = announcement.category || categoriesList.find(c => c.id === announcement.categoryId);
        setSelectedAnnouncement({
            id: null,
            announcementNumber: '',
            title: `[복사본] ${announcement.title}`,
            content: announcement.content,
            categoryId: announcement.categoryId || (selectedCat ? selectedCat.id : ''),
            targetType: announcement.targetType || 'ALL',
            targetCategory: announcement.targetCategory || '',
            targetManufacturer: announcement.targetManufacturer || '',
            targetDepartments: announcement.targetDepartments || '',
            emailSent: false,
            emailSentAt: null
        });
        setIsEditMode(false);
        setIsDrawerOpen(true);
        if (announcement.targetType === 'MANUFACTURER' && announcement.targetManufacturer) {
            loadDepartmentsForCompany(announcement.targetManufacturer);
        } else {
            setDeptList([]);
        }
    };

    const handleOpenEmailPreview = (announcement) => {
        const cat = announcement.category || categoriesList.find(c => c.id === announcement.categoryId) || { name: '일반', color: '#475569', bold: false };
        setPreviewAnnouncement({ ...announcement, category: cat });
        setIsEmailPreviewOpen(true);
    };

    const handleOpenDetail = (announcement) => {
        const cat = announcement.category || categoriesList.find(c => c.id === announcement.categoryId) || { name: '일반', color: '#475569', bold: false };
        setSelectedAnnouncement({ ...announcement, category: cat });
        setIsDetailModalOpen(true);
    };

    const handleOpenDrawer = (announcement = null) => {
        if (announcement) {
            setSelectedAnnouncement({
                id: announcement.id,
                announcementNumber: announcement.announcementNumber,
                title: announcement.title,
                content: announcement.content,
                categoryId: announcement.categoryId || '',
                targetType: announcement.targetType || 'ALL',
                targetCategory: announcement.targetCategory || '',
                targetManufacturer: announcement.targetManufacturer || '',
                targetDepartments: announcement.targetDepartments || '',
                emailSent: announcement.emailSent || false,
                emailSentAt: announcement.emailSentAt || null
            });
            setIsEditMode(true);
            if (announcement.targetType === 'MANUFACTURER' && announcement.targetManufacturer) {
                loadDepartmentsForCompany(announcement.targetManufacturer);
            } else {
                setDeptList([]);
            }
        } else {
            setSelectedAnnouncement({
                id: null,
                announcementNumber: '',
                title: '',
                content: '',
                categoryId: categoriesList.length > 0 ? categoriesList[0].id : '',
                targetType: 'ALL',
                targetCategory: '',
                targetManufacturer: '',
                targetDepartments: '',
                emailSent: false,
                emailSentAt: null
            });
            setIsEditMode(false);
            setDeptList([]);
        }
        setIsDrawerOpen(true);
    };

    const handleSaveTrigger = (e) => {
        e.preventDefault();

        if (!selectedAnnouncement.title.trim()) {
            toast.error("공지 제목을 입력해 주세요.");
            return;
        }
        if (!selectedAnnouncement.content.trim()) {
            toast.error("공지 내용을 입력해 주세요.");
            return;
        }
        if (!selectedAnnouncement.categoryId) {
            toast.error("공지 분류를 선택해 주세요.");
            return;
        }

        setIsConfirmOpen(true);
    };

    const handleSave = async () => {
        setIsConfirmOpen(false);
        if (!canEdit) {
            toast.error("전체공지를 작성하거나 편집할 권한이 없습니다.");
            return;
        }
        try {
            setLoading(true);

            const payload = {
                id: selectedAnnouncement.id,
                announcementNumber: selectedAnnouncement.announcementNumber,
                title: selectedAnnouncement.title.trim(),
                content: selectedAnnouncement.content.trim(),
                categoryId: Number(selectedAnnouncement.categoryId),
                targetType: selectedAnnouncement.targetType,
                targetCategory: selectedAnnouncement.targetType === 'CATEGORY' ? selectedAnnouncement.targetCategory : '',
                targetManufacturer: selectedAnnouncement.targetType === 'MANUFACTURER' ? selectedAnnouncement.targetManufacturer : '',
                targetDepartments: selectedAnnouncement.targetType === 'MANUFACTURER' ? selectedAnnouncement.targetDepartments : ''
            };

            await saveAnnouncement(payload);
            toast.success(isEditMode ? "공지사항이 수정되었습니다." : "새로운 공지사항이 등록되었습니다.");
            setIsDrawerOpen(false);
            fetchAnnouncements();
        } catch (error) {
            toast.error(error.response?.data?.message || "저장 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`[${title}] 공지사항을 삭제하시겠습니까?\n삭제 시 대시보드에서 즉시 제거됩니다.`)) {
            return;
        }
        try {
            setLoading(true);
            await deleteAnnouncement(id);
            toast.success("공지사항이 삭제되었습니다.");
            fetchAnnouncements();
        } catch (error) {
            toast.error("공지사항 삭제에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!gridRef.current || !gridRef.current.api) return;
        const selectedNodes = gridRef.current.api.getSelectedNodes();
        if (selectedNodes.length === 0) {
            toast.warning("삭제할 공지사항을 선택해 주세요.");
            return;
        }
        if (!canDelete) {
            toast.error("공지사항을 삭제할 권한이 없습니다.");
            return;
        }
        if (!window.confirm(`선택한 ${selectedNodes.length}개의 공지사항을 정말 삭제하시겠습니까?`)) {
            return;
        }
        try {
            setLoading(true);
            for (const node of selectedNodes) {
                await deleteAnnouncement(node.data.id);
            }
            toast.success("선택한 공지사항이 일괄 삭제되었습니다.");
            fetchAnnouncements();
        } catch (error) {
            toast.error("일부 공지사항 삭제 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkEmail = async () => {
        if (!gridRef.current || !gridRef.current.api) return;
        const selectedNodes = gridRef.current.api.getSelectedNodes();
        if (selectedNodes.length === 0) {
            toast.warning("이메일을 발송할 공지사항을 선택해 주세요.");
            return;
        }
        if (!canEdit) {
            toast.error("이메일을 발송할 권한이 없습니다.");
            return;
        }
        if (!window.confirm(`선택한 ${selectedNodes.length}개의 공지사항에 대해 일괄 메일 전송을 진행하시겠습니까?\n이메일은 각 공지의 수신 대상자에게 자동 발송됩니다.`)) {
            return;
        }
        try {
            setLoading(true);
            for (const node of selectedNodes) {
                await sendAnnouncementEmail(node.data.id);
            }
            toast.success("선택한 공지사항의 메일 발송 요청이 완료되었습니다.");
            fetchAnnouncements();
        } catch (error) {
            toast.error("일부 이메일 발송 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkExcel = () => {
        if (!gridRef.current || !gridRef.current.api) return;
        const selectedNodes = gridRef.current.api.getSelectedNodes();
        const dataToExport = selectedNodes.length > 0
            ? selectedNodes.map(node => node.data)
            : rowData;

        if (dataToExport.length === 0) {
            toast.warning("내보낼 데이터가 없습니다.");
            return;
        }

        // CSV 파일 생성 및 다운로드
        const headers = ["공지번호", "분류", "제목", "내용", "대상구분", "이메일발송", "작성자", "작성일"];
        const rows = dataToExport.map(item => [
            item.announcementNumber,
            item.category?.name || '일반',
            `"${item.title.replace(/"/g, '""')}"`,
            `"${item.content.replace(/"/g, '""')}"`,
            item.targetType === 'ALL' ? '일괄 공지' : `${item.targetType} 제조사`,
            item.emailSent ? '완료' : '미발송',
            item.createdByName || '',
            item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `QMS_Announcements_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSendEmail = async (id) => {
        setIsEmailPreviewOpen(false);
        try {
            setLoading(true);
            await sendAnnouncementEmail(id);
            toast.success("이메일 발송이 성공적으로 완료되었습니다.");
            fetchAnnouncements();
            if (isDrawerOpen && selectedAnnouncement.id === id) {
                setSelectedAnnouncement(prev => ({ ...prev, emailSent: true, emailSentAt: new Date().toISOString() }));
            }
        } catch (error) {
            toast.error("이메일 발송 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // --- Category Actions ---
    const handleOpenCategoryDrawer = (category = null) => {
        if (category) {
            setSelectedCategory({
                id: category.id,
                name: category.name,
                color: category.color || '#475569',
                bold: category.bold || false,
                sortOrder: category.sortOrder || 0
            });
            setIsCategoryEditMode(true);
        } else {
            setSelectedCategory({
                id: null,
                name: '',
                color: '#475569',
                bold: false,
                sortOrder: categoriesList.length + 1
            });
            setIsCategoryEditMode(false);
        }
        setIsCategoryDrawerOpen(true);
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        if (!selectedCategory.name.trim()) {
            toast.error("분류명을 입력해 주세요.");
            return;
        }
        try {
            setLoading(true);
            await saveAnnouncementCategory(selectedCategory);
            toast.success(isCategoryEditMode ? "분류가 수정되었습니다." : "새로운 분류가 등록되었습니다.");
            setIsCategoryDrawerOpen(false);
            fetchCategories();
            fetchAnnouncements(); // 공지 목록의 카테고리 정보 갱신용
        } catch (error) {
            toast.error(error.response?.data?.message || "분류 저장 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = async (id, name) => {
        if (!window.confirm(`[${name}] 공지 분류를 삭제하시겠습니까?`)) {
            return;
        }
        try {
            setLoading(true);
            await deleteAnnouncementCategory(id);
            toast.success("분류가 정상적으로 삭제되었습니다.");
            fetchCategories();
            fetchAnnouncements();
        } catch (error) {
            toast.error("분류 삭제에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // --- AG-Grid Column Definitions ---
    const columnDefs = useMemo(() => [
        {
            field: "announcementNumber",
            headerName: "일련번호 (Code)",
            width: 200,
            pinned: 'left',
            sort: 'desc',
            checkboxSelection: true,
            headerCheckboxSelection: true
        },
        {
            field: "category",
            headerName: "공지 분류",
            width: 130,
            cellStyle: { fontSize: '17px', display: 'flex', alignItems: 'center' },
            cellRenderer: (params) => {
                const category = params.data.category || categoriesList.find(c => c.name === '일반');
                if (!category) return <span className="badge" style={{ backgroundColor: '#475569', color: '#fff', borderRadius: '16px', padding: '2px 12px', lineHeight: '1.2', fontSize: '17px' }}>일반</span>;
                return (
                    <span className="badge" style={{
                        backgroundColor: category.color,
                        color: '#fff',
                        fontWeight: category.bold ? 'bold' : 'normal',
                        padding: '10px 20px',
                        lineHeight: '1.2',
                        borderRadius: '16px',
                        fontSize: '17px'
                    }}>
                        {category.name}
                    </span>
                );
            }
        },
        {
            field: "title",
            headerName: "공지 제목",
            flex: 1.0,
            filter: true,
            cellStyle: { fontSize: '17px', display: 'flex', alignItems: 'center' }
        },
        {
            field: "targetType",
            headerName: "대상 구분",
            width: 160,
            cellStyle: { fontSize: '17px', display: 'flex', alignItems: 'center' },
            cellRenderer: (params) => {
                const type = params.value;
                if (type === 'ALL') return <span style={{ color: '#1e293b', fontWeight: 'bold' }}>📢 일괄 공지</span>;
                if (type === 'MANUFACTURER') return <span style={{ color: '#1e293b', fontWeight: 'bold' }}>🏭 일반 제조사</span>;
                if (type === 'PACKAGING') return <span style={{ color: '#1e293b', fontWeight: 'bold' }}>📦 포장재 제조사</span>;
                return <span style={{ color: '#1e293b', fontWeight: 'bold' }}>🏭 {type} 제조사</span>;
            }
        },
        {
            field: "emailSent",
            headerName: "이메일 발송",
            width: 160,
            cellStyle: { fontSize: '17px', display: 'flex', alignItems: 'center' },
            cellRenderer: (params) => {
                const sent = params.value;
                const date = params.data.emailSentAt;
                if (sent) {
                    return (
                        <div style={{ fontSize: '16px', color: '#059669', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', lineHeight: '1.2' }}>
                            <span style={{ fontWeight: 'bold' }}>✅ 발송 완료</span>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                {date ? new Date(date).toLocaleDateString() : ''}
                            </span>
                        </div>
                    );
                }
                return <span style={{ color: '#9ca3af', fontSize: '16px' }}>⏳ 미발송</span>;
            }
        },
        {
            field: "createdByName",
            headerName: "작성자",
            width: 110,
            cellStyle: { fontSize: '17px', display: 'flex', alignItems: 'center' }
        },
        {
            field: "createdAt",
            headerName: "작성일시",
            width: 150,
            valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '',
            cellStyle: { fontSize: '17px', display: 'flex', alignItems: 'center' }
        },
        {
            headerName: "관리 액션",
            width: 580,
            sortable: false,
            filter: false,
            cellRenderer: (params) => (
                <div className="actions" style={{ justifyContent: 'center', gap: '12px', height: '100%', alignItems: 'center', display: 'flex' }}>
                    <button
                        onClick={() => handleOpenDetail(params.data)}
                        className="secondary"
                        style={{ padding: '8px 16px', fontSize: '13px', background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold' }}
                    >
                        🔍 상세
                    </button>
                    <button
                        onClick={() => handleCopyText(params.data)}
                        className="secondary"
                        style={{ padding: '8px 16px', fontSize: '13px', background: '#f8fafc', color: '#6366f1', border: '1px solid #c7d2fe', borderRadius: '8px', fontWeight: 'bold' }}
                    >
                        📋 텍스트 복사
                    </button>
                    <button
                        onClick={() => handleCopy(params.data)}
                        className="secondary"
                        style={{ padding: '8px 16px', fontSize: '13px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '8px', fontWeight: 'bold', opacity: canEdit ? 1 : 0.5 }}
                        disabled={!canEdit}
                    >
                        📋 복사
                    </button>
                    <button
                        onClick={() => handleOpenDrawer(params.data)}
                        className="secondary"
                        style={{ padding: '8px 16px', fontSize: '13px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', fontWeight: 'bold', opacity: canEdit ? 1 : 0.5 }}
                        disabled={!canEdit}
                    >
                        ✍️ 수정
                    </button>
                    <button
                        onClick={() => handleOpenEmailPreview(params.data)}
                        className="primary"
                        style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', opacity: canEdit ? 1 : 0.5 }}
                        disabled={!canEdit}
                    >
                        📧 메일
                    </button>
                    <button
                        onClick={() => handleDelete(params.data.id, params.data.title)}
                        className="secondary"
                        style={{ padding: '8px 16px', fontSize: '13px', color: '#e53e3e', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 'bold', opacity: canDelete ? 1 : 0.5 }}
                        disabled={!canDelete}
                    >
                        ❌ 삭제
                    </button>
                </div>
            )
        }
    ], [canEdit, canDelete, categoriesList]);

    const categoryColumnDefs = useMemo(() => [
        { field: "name", headerName: "분류명", flex: 1, filter: true },
        {
            field: "color",
            headerName: "글자 색상",
            width: 180,
            cellRenderer: (params) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: params.value, border: '1px solid #cbd5e1' }} />
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{params.value}</span>
                </div>
            )
        },
        {
            field: "bold",
            headerName: "굵게 표시",
            width: 140,
            cellRenderer: (params) => params.value ? <span style={{ fontWeight: 'bold', color: '#1e293b' }}>🔴 굵게</span> : <span style={{ color: '#94a3b8' }}>일반</span>
        },
        { field: "sortOrder", headerName: "정렬 순서", width: 120, sort: 'asc' },
        {
            headerName: "관리 액션",
            width: 200,
            sortable: false,
            filter: false,
            cellRenderer: (params) => (
                <div className="actions" style={{ justifyContent: 'center', gap: '8px' }}>
                    <button
                        onClick={() => handleOpenCategoryDrawer(params.data)}
                        className="secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', opacity: canEditCategories ? 1 : 0.5 }}
                        disabled={!canEditCategories}
                    >
                        수정
                    </button>
                    <button
                        onClick={() => handleDeleteCategory(params.data.id, params.data.name)}
                        className="secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', color: '#e53e3e', background: '#fff5f5', opacity: canDeleteCategories ? 1 : 0.5 }}
                        disabled={!canDeleteCategories}
                    >
                        삭제
                    </button>
                </div>
            )
        }
    ], [canEditCategories, canDeleteCategories]);

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9', width: '100%' }}>

            {/* 3단계 표준 헤더 레이아웃 */}
            <div className="page-header-standard" style={{
                marginBottom: '20px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '24px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #f1f5f9'
            }}>
                {/* 1단계: 생성 및 연동 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="header-title">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                            📢 전사 전체공지 및 분류 관리
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {activeTab === 'announcements' ? (
                            canEdit && (
                                <button
                                    className="primary"
                                    onClick={() => handleOpenDrawer()}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '10px',
                                        fontWeight: '800',
                                        backgroundColor: '#2563eb',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ➕ 신규 전체공지 작성
                                </button>
                            )
                        ) : (
                            canEditCategories && (
                                <button
                                    className="primary"
                                    onClick={() => handleOpenCategoryDrawer()}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '10px',
                                        fontWeight: '800',
                                        backgroundColor: '#0d9488',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ➕ 신규 공지 분류 등록
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* 2단계: 핵심 제어 */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderTop: '1px solid #f1f5f9',
                    borderBottom: '1px solid #f1f5f9'
                }}>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                        {activeTab === 'announcements'
                            ? "사용자 분류별 대시보드에 공지되는 전체공지를 관리하고 메일 알림을 보냅니다."
                            : "중요, 긴급, 법령 등 전체공지사항의 분류(카테고리) 및 글자 스타일(색상, 굵기)을 관리합니다."
                        }
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="primary"
                            onClick={activeTab === 'announcements' ? fetchAnnouncements : fetchCategories}
                            style={{ backgroundColor: activeTab === 'announcements' ? '#2563eb' : '#0d9488', padding: '10px 24px', fontWeight: 'bold', fontSize: '14px' }}
                        >
                            🔍 조회
                        </button>
                        <button
                            className="outline"
                            onClick={() => activeTab === 'announcements' ? setQuickFilterText('') : setCategoryQuickFilterText('')}
                            style={{ padding: '10px 16px', fontSize: '14px' }}
                        >
                            ♻️ 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* 탭 네비게이션 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button
                    onClick={() => setActiveTab('announcements')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '800',
                        fontSize: '14px',
                        backgroundColor: activeTab === 'announcements' ? '#2563eb' : '#fff',
                        color: activeTab === 'announcements' ? '#fff' : '#475569',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s'
                    }}
                >
                    📢 공지 관리
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '800',
                        fontSize: '14px',
                        backgroundColor: activeTab === 'categories' ? '#0d9488' : '#fff',
                        color: activeTab === 'categories' ? '#fff' : '#475569',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s'
                    }}
                >
                    🏷️ 분류 관리
                </button>
            </div>

            {/* 공지 관리 탭 */}
            {activeTab === 'announcements' && (
                <>
                    {/* 검색 필터 */}
                    <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔍 공지 내용 검색</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="제목, 내용 또는 작성자 검색..."
                                        value={quickFilterText}
                                        onChange={(e) => setQuickFilterText(e.target.value)}
                                        style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ag-Grid 데이터 카드 */}
                    <div className="card" style={{ padding: '24px', borderRadius: '16px', flex: 1, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0', minHeight: 0 }}>
                        {loading && <div style={{ fontSize: '14px', color: '#2563eb', marginBottom: '10px', fontWeight: 'bold' }}>데이터 처리 중...</div>}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: '#64748b' }}>
                                등록된 활성 공지 수: <span style={{ color: '#2563eb' }}>{rowData.length}</span> 건
                            </div>

                            {/* 일괄 선택 작업 툴바 */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={handleBulkExcel}
                                    className="secondary"
                                    style={{ padding: '8px 16px', fontSize: '12px', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold' }}
                                >
                                    📥 선택/전체 엑셀 다운로드
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBulkEmail}
                                    className="primary"
                                    style={{ padding: '8px 16px', fontSize: '12px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', opacity: canEdit ? 1 : 0.5 }}
                                    disabled={!canEdit}
                                >
                                    📧 선택 일괄 메일 발송
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBulkDelete}
                                    className="secondary"
                                    style={{ padding: '8px 16px', fontSize: '12px', color: '#e53e3e', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 'bold', opacity: canDelete ? 1 : 0.5 }}
                                    disabled={!canDelete}
                                >
                                    🗑️ 선택 일괄 삭제
                                </button>
                            </div>
                        </div>

                        <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                            <AgGridReact
                                ref={gridRef}
                                theme="legacy"
                                rowHeight={54}
                                rowSelection="multiple"
                                rowData={rowData}
                                columnDefs={columnDefs}
                                pagination={true}
                                paginationPageSize={50}
                                quickFilterText={quickFilterText}
                                animateRows={true}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* 분류 관리 탭 */}
            {activeTab === 'categories' && (
                <>
                    {/* 검색 필터 */}
                    <div className="card" style={{ marginBottom: '20px', padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>🔍 분류 검색</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="분류명 검색..."
                                        value={categoryQuickFilterText}
                                        onChange={(e) => setCategoryQuickFilterText(e.target.value)}
                                        style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ag-Grid 분류 목록 카드 */}
                    <div className="card" style={{ padding: '24px', borderRadius: '16px', flex: 1, display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0', minHeight: 0 }}>
                        <div style={{ marginBottom: '15px', fontWeight: '800', fontSize: '14px', color: '#64748b' }}>
                            등록된 분류 수: <span style={{ color: '#0d9488' }}>{categoriesList.length}</span> 건
                        </div>
                        <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
                            <AgGridReact
                                theme="legacy"
                                rowHeight={54}
                                rowData={categoriesList}
                                columnDefs={categoryColumnDefs}
                                pagination={true}
                                paginationPageSize={50}
                                quickFilterText={categoryQuickFilterText}
                                animateRows={true}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* 공지 등록/수정 Drawer */}
            {isDrawerOpen && (
                <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
                    <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: '850px', borderRadius: '28px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div className="drawer-header" style={{ padding: '30px 45px', flexShrink: 0 }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '900' }}>
                                {isEditMode ? `🛠️ [${selectedAnnouncement.announcementNumber}] 공지 수정` : '✨ 신규 전체공지 등록'}
                            </h2>
                            <button onClick={() => setIsDrawerOpen(false)} className="secondary close-button" style={{ borderRadius: '50%', width: '45px', height: '45px', padding: 0, fontSize: '20px' }}>✕</button>
                        </div>

                        <form onSubmit={handleSaveTrigger} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div className="drawer-body" style={{ padding: '45px', background: '#f8fafc', overflowY: 'auto', flex: 1 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                                    {/* 대상 지정 영역 */}
                                    <div className="card" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', background: 'white' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '15px', color: '#0d9488' }}>🎯 공지 대상 설정</h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="targetType"
                                                    value="ALL"
                                                    checked={selectedAnnouncement.targetType === 'ALL'}
                                                    onChange={(e) => setSelectedAnnouncement(prev => ({ ...prev, targetType: e.target.value, targetCategory: '', targetManufacturer: '', targetDepartments: '' }))}
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                                📢 일괄 공지 (로그인하는 모든 사용자에게 노출)
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="targetType"
                                                    value="CATEGORY"
                                                    checked={selectedAnnouncement.targetType === 'CATEGORY'}
                                                    onChange={(e) => setSelectedAnnouncement(prev => ({ ...prev, targetType: e.target.value, targetCategory: mfrCategories[0]?.name || '', targetManufacturer: '', targetDepartments: '' }))}
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                                🏭 제조사 구분별 공지 (특정 구분의 제조사 사용자에게 노출)
                                            </label>

                                            {selectedAnnouncement.targetType === 'CATEGORY' && (
                                                <div style={{ paddingLeft: '28px' }}>
                                                    <select
                                                        value={selectedAnnouncement.targetCategory}
                                                        onChange={(e) => setSelectedAnnouncement(prev => ({ ...prev, targetCategory: e.target.value }))}
                                                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '13px', width: '250px' }}
                                                    >
                                                        {mfrCategories.map(cat => (
                                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="targetType"
                                                    value="MANUFACTURER"
                                                    checked={selectedAnnouncement.targetType === 'MANUFACTURER'}
                                                    onChange={(e) => {
                                                        const firstMfr = mfrList[0]?.name || '';
                                                        setSelectedAnnouncement(prev => ({ ...prev, targetType: e.target.value, targetManufacturer: firstMfr, targetDepartments: '', targetCategory: '' }));
                                                        loadDepartmentsForCompany(firstMfr);
                                                    }}
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                                🏢 특정 제조사 지정 공지 (특정 제조사의 소속 사용자에게 노출)
                                            </label>

                                            {selectedAnnouncement.targetType === 'MANUFACTURER' && (
                                                <div style={{ paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                    <div>
                                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>제조사 선택</label>
                                                        <select
                                                            value={selectedAnnouncement.targetManufacturer}
                                                            onChange={(e) => {
                                                                setSelectedAnnouncement(prev => ({ ...prev, targetManufacturer: e.target.value, targetDepartments: '' }));
                                                                loadDepartmentsForCompany(e.target.value);
                                                            }}
                                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '13px', width: '250px' }}
                                                        >
                                                            <option value="">-- 제조사 선택 --</option>
                                                            {mfrList.map(m => (
                                                                <option key={m.id} value={m.name}>{m.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {deptList.length > 0 && (
                                                        <div>
                                                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>
                                                                👥 대상 부서 선택 (미체크 시 회사 전체 노출)
                                                            </label>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', background: '#fff', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                {deptList.map(dept => {
                                                                    const checkedList = selectedAnnouncement.targetDepartments ? selectedAnnouncement.targetDepartments.split(',').map(s => s.trim()) : [];
                                                                    const isChecked = checkedList.includes(dept);
                                                                    return (
                                                                        <label key={dept} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4a5568', cursor: 'pointer', margin: 0 }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => {
                                                                                    let newList;
                                                                                    if (isChecked) {
                                                                                        newList = checkedList.filter(d => d !== dept);
                                                                                    } else {
                                                                                        newList = [...checkedList, dept];
                                                                                    }
                                                                                    setSelectedAnnouncement(prev => ({ ...prev, targetDepartments: newList.join(',') }));
                                                                                }}
                                                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                                            />
                                                                            <span>{dept}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                     )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 기본 정보 */}
                                    <div className="card" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', background: 'white' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px', color: '#2563eb' }}>📌 공지 내용 입력</h3>

                                        <div className="form-group" style={{ marginBottom: '20px' }}>
                                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>공지 번호 (일련번호) <span style={{ color: '#64748b', fontWeight: 'normal' }}>(비워두면 자동 생성)</span></label>
                                            <input
                                                type="text"
                                                placeholder="예: ANC-20260616-001 (미입력 시 자동 채번)"
                                                value={selectedAnnouncement.announcementNumber}
                                                onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, announcementNumber: e.target.value })}
                                                style={{ padding: '14px', borderRadius: '12px', fontWeight: '600', width: '100%', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '20px' }}>
                                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>공지 분류 <span style={{ color: '#e53e3e' }}>*</span></label>
                                            <select
                                                value={selectedAnnouncement.categoryId}
                                                onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, categoryId: e.target.value })}
                                                style={{ padding: '14px', borderRadius: '12px', fontWeight: '600', width: '100%', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}
                                                required
                                            >
                                                <option value="">-- 분류 선택 --</option>
                                                {categoriesList.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '20px' }}>
                                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>공지 제목 <span style={{ color: '#e53e3e' }}>*</span></label>
                                            <input
                                                type="text"
                                                placeholder="공지 제목을 명확하게 입력해 주세요."
                                                value={selectedAnnouncement.title}
                                                onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, title: e.target.value })}
                                                style={{ padding: '14px', borderRadius: '12px', fontWeight: '600', width: '100%', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>공지 본문 <span style={{ color: '#e53e3e' }}>*</span></label>
                                            <textarea
                                                rows="10"
                                                placeholder="공지할 내용을 상세히 기술하세요. 중요한 정책 변경사항이나 일정을 명기합니다."
                                                value={selectedAnnouncement.content}
                                                onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, content: e.target.value })}
                                                style={{ padding: '18px', borderRadius: '16px', resize: 'none', fontWeight: '500', fontSize: '14px', lineHeight: '1.6', width: '100%', border: '1px solid #cbd5e1' }}
                                                required
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <div className="drawer-footer" style={{ padding: '25px 45px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <div>
                                    {isEditMode && selectedAnnouncement.id && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const cat = categoriesList.find(c => c.id === Number(selectedAnnouncement.categoryId)) || { name: '일반', color: '#475569', bold: false };
                                                handleOpenEmailPreview({ ...selectedAnnouncement, category: cat });
                                            }}
                                            style={{
                                                padding: '12px 24px',
                                                borderRadius: '12px',
                                                backgroundColor: '#e0e7ff',
                                                color: '#4f46e5',
                                                border: '1px solid #c7d2fe',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            📧 이메일 발송
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button type="button" className="secondary" onClick={() => setIsDrawerOpen(false)} style={{ padding: '12px 35px', borderRadius: '12px', fontWeight: '700' }}>닫기</button>
                                    <button type="submit" className="primary" style={{ padding: '12px 60px', borderRadius: '12px', fontWeight: '900', backgroundColor: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>
                                        {isEditMode ? '💾 수정 저장' : '✅ 등록'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 분류 등록/수정 Drawer */}
            {isCategoryDrawerOpen && (
                <div className="drawer-overlay" onClick={() => setIsCategoryDrawerOpen(false)}>
                    <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: '600px', borderRadius: '28px' }}>
                        <div className="drawer-header" style={{ padding: '30px 45px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '900' }}>
                                {isCategoryEditMode ? `🛠️ [${selectedCategory.name}] 분류 수정` : '✨ 신규 공지 분류 등록'}
                            </h2>
                            <button onClick={() => setIsCategoryDrawerOpen(false)} className="secondary close-button" style={{ borderRadius: '50%', width: '45px', height: '45px', padding: 0, fontSize: '20px' }}>✕</button>
                        </div>

                        <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="drawer-body" style={{ padding: '45px', background: '#f8fafc', overflowY: 'auto' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                                    <div className="card" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', background: 'white' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px', color: '#0d9488' }}>📌 분류 속성 설정</h3>

                                        <div className="form-group" style={{ marginBottom: '20px' }}>
                                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>분류명 <span style={{ color: '#e53e3e' }}>*</span></label>
                                            <input
                                                type="text"
                                                placeholder="예: 긴급, 중요, 법령 등"
                                                value={selectedCategory.name}
                                                onChange={(e) => setSelectedCategory({ ...selectedCategory, name: e.target.value })}
                                                style={{ padding: '14px', borderRadius: '12px', fontWeight: '600', width: '100%', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                required
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '20px' }}>
                                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>글자 색상 (HEX) <span style={{ color: '#e53e3e' }}>*</span></label>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <input
                                                    type="color"
                                                    value={selectedCategory.color}
                                                    onChange={(e) => setSelectedCategory({ ...selectedCategory, color: e.target.value })}
                                                    style={{ width: '50px', height: '45px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', padding: '2px' }}
                                                />
                                                <input
                                                    type="text"
                                                    value={selectedCategory.color}
                                                    onChange={(e) => setSelectedCategory({ ...selectedCategory, color: e.target.value })}
                                                    placeholder="#475569"
                                                    style={{ padding: '12px', borderRadius: '12px', fontWeight: '600', flex: 1, border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'monospace' }}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '20px', padding: '10px 0' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    style={{ width: '18px', height: '18px' }}
                                                    checked={selectedCategory.bold}
                                                    onChange={(e) => setSelectedCategory({ ...selectedCategory, bold: e.target.checked })}
                                                />
                                                🔴 글자를 굵게 표시 (bold)
                                            </label>
                                        </div>

                                        <div className="form-group">
                                            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>정렬 순서</label>
                                            <input
                                                type="number"
                                                value={selectedCategory.sortOrder}
                                                onChange={(e) => setSelectedCategory({ ...selectedCategory, sortOrder: Number(e.target.value) })}
                                                style={{ padding: '14px', borderRadius: '12px', fontWeight: '600', width: '100%', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <div className="drawer-footer" style={{ padding: '25px 45px', display: 'flex', justifyContent: 'flex-end', gap: '15px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
                                <button type="button" className="secondary" onClick={() => setIsCategoryDrawerOpen(false)} style={{ padding: '12px 35px', borderRadius: '12px', fontWeight: '700' }}>닫기</button>
                                <button type="submit" className="primary" style={{ padding: '12px 60px', borderRadius: '12px', fontWeight: '900', backgroundColor: '#0d9488', color: '#fff', border: 'none', cursor: 'pointer' }}>
                                    {isCategoryEditMode ? '💾 수정 저장' : '✅ 등록'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <SaveConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleSave}
                title={isEditMode ? "공지 수정 확인" : "공지 등록 확인"}
                message={isEditMode ? "정말 수정하시겠습니까?" : "정말 등록하겠습니까?"}
            />

            {/* 상세 보기 팝업 모달 */}
            {isDetailModalOpen && selectedAnnouncement && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '750px',
                        maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        position: 'relative', border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                                🔍 전체공지 상세 정보
                            </h2>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#475569' }}>일련번호:</span>
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', marginRight: '20px' }}>{selectedAnnouncement.announcementNumber}</span>

                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#475569' }}>공지 분류:</span>
                                <span className="badge" style={{
                                    backgroundColor: selectedAnnouncement.category?.color || '#475569',
                                    color: '#fff',
                                    fontWeight: selectedAnnouncement.category?.bold ? 'bold' : 'normal',
                                    padding: '3px 8px',
                                    borderRadius: '6px'
                                }}>
                                    {selectedAnnouncement.category?.name || '일반'}
                                </span>

                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#475569', marginLeft: '20px' }}>대상:</span>
                                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                                    {selectedAnnouncement.targetType === 'MANUFACTURER' ? '🏭 일반 제조사' : selectedAnnouncement.targetType === 'PACKAGING' ? '📦 포장재 제조사' : '📢 전체 공지'}
                                </span>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>공지 제목</label>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', padding: '14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                    {selectedAnnouncement.title}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>공지 본문</label>
                                <div style={{
                                    fontSize: '14px', color: '#334155', padding: '18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                                    lineHeight: '1.6', whiteSpace: 'pre-wrap', minHeight: '180px', wordBreak: 'break-all'
                                }}>
                                    {selectedAnnouncement.content}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                <span>작성자: {selectedAnnouncement.createdByName} ({selectedAnnouncement.createdByUsername})</span>
                                <span>작성일시: {selectedAnnouncement.createdAt ? new Date(selectedAnnouncement.createdAt).toLocaleString() : ''}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="primary"
                                style={{ padding: '10px 30px', borderRadius: '10px', fontWeight: '800', backgroundColor: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer' }}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 이메일 발송 미리보기 팝업 모달 */}
            {isEmailPreviewOpen && previewAnnouncement && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '700px',
                        maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        position: 'relative', border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#4f46e5', margin: 0 }}>
                                📧 공지 알림 메일 발송 미리보기
                            </h2>
                            <button
                                onClick={() => setIsEmailPreviewOpen(false)}
                                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ padding: '14px', background: '#f5f3ff', borderRadius: '12px', border: '1px solid #ddd6fe', fontSize: '13px', color: '#4c1d95', fontWeight: 'bold' }}>
                                📢 수신 대상: <span style={{ textDecoration: 'underline' }}>
                                    {previewAnnouncement.targetType === 'MANUFACTURER'
                                        ? '일반 제조사 (부자재 제외) 활성 사용자 전원'
                                        : previewAnnouncement.targetType === 'PACKAGING'
                                            ? '포장재 제조사 (부자재 카테고리) 활성 사용자 전원'
                                            : 'QMS 시스템 가입 활성 사용자 전원'}
                                </span>
                            </div>

                            <div style={{ border: '1px solid #cbd5e1', borderRadius: '16px', padding: '24px', background: '#ffffff', fontFamily: '"Malgun Gothic", sans-serif' }}>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                    <b>제목:</b> [QMS 전체공지 - {previewAnnouncement.category?.name || '일반'}] {previewAnnouncement.title}
                                </div>

                                <div style={{ fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: '#f8fafc' }}>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a', borderBottom: '2px solid #cbd5e1', paddingBottom: '10px' }}>
                                        통합 품질 관리 시스템 (QMS) 전체공지
                                    </h3>
                                    <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#334155' }}>
                                        시스템에 새로운 전체공지사항이 등록되었습니다.
                                    </p>

                                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#475569', lineHeight: '1.8' }}>
                                            <li><b>공지 분류:</b> {previewAnnouncement.category?.name || '일반'}</li>
                                            <li><b>공지 번호:</b> {previewAnnouncement.announcementNumber}</li>
                                            <li><b>공지 제목:</b> {previewAnnouncement.title}</li>
                                            <li><b>작성자:</b> {previewAnnouncement.createdByName}</li>
                                        </ul>
                                    </div>

                                    <div style={{
                                        fontSize: '13px', color: '#1e293b', lineHeight: '1.6', whiteSpace: 'pre-wrap',
                                        borderTop: '1px dashed #cbd5e1', paddingTop: '14px', wordBreak: 'break-all'
                                    }}>
                                        {previewAnnouncement.content}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button
                                type="button"
                                className="secondary"
                                onClick={() => setIsEmailPreviewOpen(false)}
                                style={{ padding: '10px 24px', borderRadius: '10px', fontWeight: '700' }}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                className="primary"
                                onClick={() => handleSendEmail(previewAnnouncement.id)}
                                style={{ padding: '10px 35px', borderRadius: '10px', fontWeight: '800', backgroundColor: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer' }}
                            >
                                📧 메일 최종 발송
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnouncementManagementPage;
