import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
    fetchDynamicMenusTree, 
    createDynamicMenu, 
    updateDynamicMenu, 
    deleteDynamicMenu, 
    fetchScreenMenuMappings, 
    linkScreenToMenu,
    batchReorderDynamicMenus
} from './api';
import ScreenBuilderModal from './components/dynamic/ScreenBuilderModal';
import { reportGlobalError } from './utils/globalErrorListener';

const QUICK_ICONS = ['📁', '📋', '📊', '⚡', '📦', '🏭', '🔍', '🛡️', '🏷️', '⚙️', '💡', '🔔', '📈', '🛒'];

// 시스템 표준 개발 항목 여부 동적 판별 (하드코딩 금지 준수)
const isSystemStandardItem = (item) => {
    if (!item) return false;
    if (item.menuType === 'DIVIDER' || (item.menuCode && item.menuCode.startsWith('DIV_'))) return false;
    if (item.menuType === 'SYSTEM' || item.isSystem) return true;
    if (item.screenType === 'SYSTEM') return true;
    if (item.menuCode && item.menuCode.endsWith('_ROOT')) return true;
    if (item.menuCode && item.menuCode.startsWith('SYS_')) return true;
    return false;
};

// 메뉴 구분선(소분류 헤더) 여부 판별
const isDividerItem = (item) => {
    if (!item) return false;
    return item.menuType === 'DIVIDER' || (item.menuCode && item.menuCode.startsWith('DIV_'));
};

// 신규 추가 항목 / 커스텀 화면 동적 판별 유틸리티
const isNewOrCustomItem = (item) => {
    if (!item) return false;
    if (isDividerItem(item)) return false;
    if (isSystemStandardItem(item)) return false;
    if (item.isDynamic || item.isDynamicScreen) return true;
    if (item.screenType && item.screenType !== 'SYSTEM') return true;
    if (item.createdAt) {
        try {
            const createdDate = new Date(item.createdAt);
            const now = new Date();
            const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays <= 30) return true;
        } catch (e) {
            // ignore date parsing error
        }
    }
    if (item.screenCode && (item.screenCode.startsWith('SCR_CUSTOM') || item.screenCode.startsWith('DYNAMIC_') || item.screenCode.startsWith('SCR_NOTION'))) {
        return true;
    }
    return false;
};

const ScreenMenuManagementPage = ({ user }) => {
    const [loading, setLoading] = useState(false);
    const [menuTree, setMenuTree] = useState([]);
    const [screenMappings, setScreenMappings] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [screenFilterTab, setScreenFilterTab] = useState('ALL'); // 'ALL' | 'UNASSIGNED' | 'NEW'
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);

    // 메뉴 구분선(DIVIDER) 등록/수정 모달 상태
    const [isDividerModalOpen, setIsDividerModalOpen] = useState(false);
    const [dividerForm, setDividerForm] = useState({
        id: null,
        parentId: '',
        parentName: '',
        menuName: '',
        menuOrder: 10
    });

    // 메뉴 등록/수정 폼 상태
    const [editingMenuId, setEditingMenuId] = useState(null);
    const [editingMenuItem, setEditingMenuItem] = useState(null);
    const [menuForm, setMenuForm] = useState({
        parentId: '',
        menuName: '',
        menuCode: '',
        icon: '📁',
        menuOrder: 10
    });

    // 대분류 카드 접기/펼치기 상태 관리 (기본: 모두 펼침)
    const [collapsedRoots, setCollapsedRoots] = useState({});

    // 개별 대분류 토글
    const toggleRootCollapse = (rootId) => {
        setCollapsedRoots(prev => ({
            ...prev,
            [rootId]: !prev[rootId]
        }));
    };

    // 전체 대분류 접기 / 펼치기
    const handleCollapseAll = () => {
        const all = {};
        menuTree.forEach(m => { all[m.id] = true; });
        setCollapsedRoots(all);
    };

    const handleExpandAll = () => {
        setCollapsedRoots({});
    };

    // 메뉴 등록 폼 접기/펼치기 토글 (스크롤 시 시야 확보)
    const [isFormCollapsed, setIsFormCollapsed] = useState(false);

    // 화면 빠른 배치용 로컬 선택 상태 (screenId -> parentId)
    const [screenQuickAssign, setScreenQuickAssign] = useState({});

    // 드래그앤드롭(DnD) 상태
    const [draggedItem, setDraggedItem] = useState(null); 
    // draggedItem: { type: 'CHILD_MENU' | 'SCREEN_ITEM', id, parentId, name, screenId, screenName, icon }
    const [dragOverRootId, setDragOverRootId] = useState(null);
    const [dragOverChildState, setDragOverChildState] = useState(null); 
    // { childId, rootId, position: 'top' | 'bottom' }

    // 데이터 로드
    const loadAllData = async () => {
        setLoading(true);
        try {
            const [treeRes, mappingRes] = await Promise.all([
                fetchDynamicMenusTree().catch(e => { console.error(e); return { data: [] }; }),
                fetchScreenMenuMappings().catch(e => { console.error(e); return { data: [] }; })
            ]);
            setMenuTree(treeRes.data || []);
            setScreenMappings(mappingRes.data || []);
        } catch (err) {
            console.error('[SCREEN MENU MGMT] Load error', err);
            reportGlobalError(err?.message || '메뉴 및 화면 매핑 로드 실패', err?.stack, 'ScreenMenuManagementPage:loadAllData', 'API_COMMUNICATION');
            toast.error('메뉴 및 화면 정보를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // 대분류 목록 (상위 메뉴 Parent 선택 옵션용 - 오직 최상위 대분류만 허용)
    const rootMenuOptions = useMemo(() => {
        return menuTree
            .filter(root => !editingMenuId || root.id !== editingMenuId)
            .map(root => ({
                id: root.id,
                label: `${root.icon || '📁'} ${root.menuName}`
            }));
    }, [menuTree, editingMenuId]);

    // 화면 필터링
    const filteredScreens = useMemo(() => {
        let list = screenMappings;
        if (screenFilterTab === 'UNASSIGNED') {
            list = list.filter(s => !s.parentMenuId);
        } else if (screenFilterTab === 'NEW') {
            list = list.filter(s => isNewOrCustomItem(s));
        }

        if (!searchKeyword.trim()) return list;
        const kw = searchKeyword.toLowerCase();
        return list.filter(s => 
            (s.screenName && s.screenName.toLowerCase().includes(kw)) ||
            (s.screenCode && s.screenCode.toLowerCase().includes(kw)) ||
            (s.parentMenuName && s.parentMenuName.toLowerCase().includes(kw))
        );
    }, [screenMappings, searchKeyword, screenFilterTab]);

    const unassignedCount = useMemo(() => {
        return screenMappings.filter(s => !s.parentMenuId).length;
    }, [screenMappings]);

    const newScreensCount = useMemo(() => {
        return screenMappings.filter(s => isNewOrCustomItem(s)).length;
    }, [screenMappings]);

    // 메뉴 폼 변경
    const handleFormChange = (field, val) => {
        setMenuForm(prev => {
            const updated = { ...prev, [field]: val };
            if (field === 'menuName' && !editingMenuId && !prev.menuCode) {
                const asciiOnly = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                if (asciiOnly.length >= 2) {
                    updated.menuCode = `MENU_${asciiOnly}`;
                }
            }
            return updated;
        });
    };

    // 메뉴 등록/수정 저장
    const handleSaveMenu = async (e) => {
        e.preventDefault();
        if (!menuForm.menuName.trim()) {
            toast.warning('메뉴명을 입력해주세요.');
            return;
        }

        try {
            const payload = {
                menuName: menuForm.menuName.trim(),
                menuCode: menuForm.menuCode.trim() || undefined,
                parentId: menuForm.parentId ? Number(menuForm.parentId) : null,
                icon: menuForm.icon.trim() || '📁',
                menuOrder: Number(menuForm.menuOrder) || 10
            };

            if (editingMenuId) {
                await updateDynamicMenu(editingMenuId, payload);
                toast.success(`'${payload.menuName}' 메뉴가 수정되었습니다.`);
            } else {
                await createDynamicMenu(payload);
                toast.success(`'${payload.menuName}' 신규 메뉴가 등록되었습니다.`);
            }

            handleResetForm();
            await loadAllData();
            window.dispatchEvent(new CustomEvent('dynamic-menu-updated'));
            window.dispatchEvent(new CustomEvent('qms_menu_updated'));
        } catch (err) {
            console.error('[SCREEN MENU MGMT] Save menu error', err);
            reportGlobalError(err?.response?.data?.message || err?.message || '메뉴 저장 실패', err?.stack, 'ScreenMenuManagementPage:handleSaveMenu', 'DATABASE');
            toast.error(err.response?.data?.message || '메뉴 저장에 실패했습니다.');
        }
    };

    // 수정 모드 진입
    const handleEditMenuClick = (item) => {
        setEditingMenuId(item.id);
        setEditingMenuItem(item);
        setMenuForm({
            parentId: item.parentId ? String(item.parentId) : '',
            menuName: item.menuName || '',
            menuCode: item.menuCode || '',
            icon: item.icon || '📁',
            menuOrder: item.menuOrder !== undefined ? item.menuOrder : 10
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 폼 초기화
    const handleResetForm = () => {
        setEditingMenuId(null);
        setEditingMenuItem(null);
        setMenuForm({
            parentId: '',
            menuName: '',
            menuCode: '',
            icon: '📁',
            menuOrder: 10
        });
    };

    // 메뉴 구분선 모달 열기 (신규 등록 또는 수정)
    const handleOpenDividerModal = (rootMenu, dividerItem = null) => {
        if (dividerItem) {
            setDividerForm({
                id: dividerItem.id,
                parentId: String(dividerItem.parentId || rootMenu.id),
                parentName: rootMenu.menuName,
                menuName: dividerItem.menuName,
                menuOrder: dividerItem.menuOrder !== undefined ? dividerItem.menuOrder : 10
            });
        } else {
            const children = rootMenu.children || [];
            const maxOrder = children.length > 0 ? Math.max(...children.map(c => c.menuOrder || 0)) : 0;
            setDividerForm({
                id: null,
                parentId: String(rootMenu.id),
                parentName: rootMenu.menuName,
                menuName: '',
                menuOrder: maxOrder + 10
            });
        }
        setIsDividerModalOpen(true);
    };

    // 메뉴 구분선 저장 (생성 또는 수정)
    const handleSaveDivider = async (e) => {
        if (e) e.preventDefault();
        if (!dividerForm.menuName || !dividerForm.menuName.trim()) {
            toast.warning('구분선 명칭(헤더 텍스트)을 입력해주세요.');
            return;
        }
        try {
            const payload = {
                parentId: Number(dividerForm.parentId),
                menuName: dividerForm.menuName.trim(),
                menuOrder: Number(dividerForm.menuOrder) || 10,
                menuType: 'DIVIDER',
                icon: '➖'
            };
            if (dividerForm.id) {
                await updateDynamicMenu(dividerForm.id, payload);
                toast.success(`'${payload.menuName}' 구분선이 수정되었습니다.`);
            } else {
                await createDynamicMenu(payload);
                toast.success(`'${payload.menuName}' 구분선이 추가되었습니다.`);
            }
            setIsDividerModalOpen(false);
            await loadAllData();
            window.dispatchEvent(new CustomEvent('dynamic-menu-updated'));
            window.dispatchEvent(new CustomEvent('qms_menu_updated'));
        } catch (err) {
            console.error('[SCREEN MENU MGMT] Save divider error', err);
            toast.error(err?.response?.data?.message || '구분선 저장에 실패했습니다.');
        }
    };

    // 메뉴 삭제 (Soft Delete)
    const handleDeleteMenu = async (id, name, item = null) => {
        if (item && isSystemStandardItem(item)) {
            toast.warning('시스템 표준 개발 메뉴는 데이터 무결성 보호를 위해 삭제할 수 없습니다.');
            return;
        }
        if (!window.confirm(`'${name}' 메뉴를 비활성화(삭제)하시겠습니까?\n하위 메뉴 및 화면 연결도 함께 해제될 수 있습니다.`)) {
            return;
        }
        try {
            await deleteDynamicMenu(id);
            toast.success(`'${name}' 메뉴가 삭제되었습니다.`);
            await loadAllData();
            window.dispatchEvent(new CustomEvent('dynamic-menu-updated'));
            window.dispatchEvent(new CustomEvent('qms_menu_updated'));
        } catch (err) {
            console.error('[SCREEN MENU MGMT] Delete error', err);
            reportGlobalError(err?.message || '메뉴 삭제 실패', err?.stack, 'ScreenMenuManagementPage:handleDeleteMenu', 'DATABASE');
            toast.error('메뉴 삭제에 실패했습니다.');
        }
    };

    // =========================================================================
    // 배치 저장 엔진 (Tier 1 규칙 8: 단일 트랜잭션 일괄 처리)
    // =========================================================================
    const persistBatchReorder = async (updatedTree) => {
        const batchPayload = [];
        updatedTree.forEach((root, rootIdx) => {
            batchPayload.push({
                id: root.id,
                parentId: null,
                menuOrder: (rootIdx + 1) * 10
            });
            if (root.children && root.children.length > 0) {
                root.children.forEach((child, childIdx) => {
                    batchPayload.push({
                        id: child.id,
                        parentId: root.id,
                        menuOrder: (childIdx + 1) * 10
                    });
                });
            }
        });

        try {
            await batchReorderDynamicMenus(batchPayload);
            window.dispatchEvent(new CustomEvent('dynamic-menu-updated'));
            window.dispatchEvent(new CustomEvent('qms_menu_updated'));
        } catch (err) {
            console.error('[SCREEN MENU MGMT] Batch reorder error', err);
            reportGlobalError(err?.response?.data?.message || err?.message || '메뉴 배치 저장 실패', err?.stack, 'ScreenMenuManagementPage:persistBatchReorder', 'DATABASE');
            toast.error('메뉴 순서 및 소속 저장에 실패했습니다. 최신 상태로 새로고침합니다.');
            loadAllData();
        }
    };

    // 드롭다운을 통한 빠른 소속 대메뉴 변경
    const handleQuickMove = async (menuId, newParentIdStr) => {
        const newParentId = newParentIdStr ? Number(newParentIdStr) : null;
        if (!newParentId) return;

        let movedItem = null;
        let originalParentId = null;

        // 1. 트리에서 아이템 찾기 및 분리
        const newTree = menuTree.map(root => {
            const hasChild = root.children && root.children.some(c => c.id === menuId);
            if (hasChild) {
                originalParentId = root.id;
                movedItem = root.children.find(c => c.id === menuId);
                return {
                    ...root,
                    children: root.children.filter(c => c.id !== menuId)
                };
            }
            return root;
        });

        if (!movedItem || originalParentId === newParentId) return;

        // 2. 새 부모에 아이템 추가
        const finalTree = newTree.map(root => {
            if (root.id === newParentId) {
                const currentChildren = root.children || [];
                const updatedMovedItem = {
                    ...movedItem,
                    parentId: newParentId,
                    menuOrder: (currentChildren.length + 1) * 10
                };
                return {
                    ...root,
                    children: [...currentChildren, updatedMovedItem]
                };
            }
            return root;
        });

        // 낙관적 UI 업데이트
        setMenuTree(finalTree);
        toast.info(`'${movedItem.menuName}' 메뉴를 이동하는 중...`);
        await persistBatchReorder(finalTree);
        toast.success(`'${movedItem.menuName}' 메뉴의 소속이 변경되었습니다!`);
    };

    // =========================================================================
    // HTML5 네이티브 드래그앤드롭(DnD) 엔진 (Zero-Cost & Bundle 0KB)
    // =========================================================================

    // 하위 메뉴 드래그 시작
    const handleChildDragStart = (e, child, rootId) => {
        e.stopPropagation();
        const payload = {
            type: 'CHILD_MENU',
            id: child.id,
            parentId: rootId,
            name: child.menuName
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'move';
        setDraggedItem(payload);
    };

    // 보관함의 화면 드래그 시작
    const handleScreenDragStart = (e, screen) => {
        e.stopPropagation();
        const payload = {
            type: 'SCREEN_ITEM',
            screenId: screen.screenId,
            screenName: screen.screenName,
            icon: screen.icon || '📋',
            currentParentId: screen.parentMenuId
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'copyMove';
        setDraggedItem(payload);
    };

    // 드래그 종료 공통
    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverRootId(null);
        setDragOverChildState(null);
    };

    // 대메뉴 카드 위로 드래그 오버 (대메뉴는 고정이며 드롭존 역할만 수행)
    const handleRootDragOver = (e, rootId) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverRootId !== rootId) {
            setDragOverRootId(rootId);
        }
    };

    const handleRootDragLeave = (e, rootId) => {
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget)) return;
        if (dragOverRootId === rootId) {
            setDragOverRootId(null);
        }
    };

    // 하위 메뉴 아이템 위로 드래그 오버 (동일 부모 내 순서 변경 가이드)
    const handleChildDragOver = (e, childId, rootId) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'top' : 'bottom';

        setDragOverChildState({ childId, rootId, position });
        if (dragOverRootId !== rootId) {
            setDragOverRootId(rootId);
        }
    };

    const handleChildDragLeave = (childId) => {
        if (dragOverChildState?.childId === childId) {
            setDragOverChildState(null);
        }
    };

    // 대메뉴 카드(공백 영역 또는 컨테이너)에 드롭
    const handleRootDrop = async (e, targetRoot) => {
        e.preventDefault();
        e.stopPropagation();

        const currentDragged = draggedItem;
        handleDragEnd();

        if (!currentDragged) return;

        // 1. 화면 보관함에서 대메뉴로 드롭한 경우 -> 해당 대메뉴 하위에 바로 화면 링크
        if (currentDragged.type === 'SCREEN_ITEM') {
            await handleDropScreenOnRoot(currentDragged, targetRoot.id, targetRoot.menuName);
            return;
        }

        // 2. 하위 메뉴를 대메뉴 카드(맨 끝)로 이동한 경우
        if (currentDragged.type === 'CHILD_MENU') {
            const sourceRootId = currentDragged.parentId;
            const targetRootId = targetRoot.id;

            // 이미 해당 대메뉴의 마지막에 있으면 생략
            if (sourceRootId === targetRootId && !dragOverChildState) {
                return;
            }

            let movedItem = null;
            const treeWithoutItem = menuTree.map(root => {
                if (root.id === sourceRootId) {
                    movedItem = (root.children || []).find(c => c.id === currentDragged.id);
                    return {
                        ...root,
                        children: (root.children || []).filter(c => c.id !== currentDragged.id)
                    };
                }
                return root;
            });

            if (!movedItem) return;

            const finalTree = treeWithoutItem.map(root => {
                if (root.id === targetRootId) {
                    const children = [...(root.children || [])];
                    children.push({
                        ...movedItem,
                        parentId: targetRootId,
                        menuOrder: (children.length + 1) * 10
                    });
                    return { ...root, children };
                }
                return root;
            });

            setMenuTree(finalTree);
            toast.info(`'${movedItem.menuName}' 메뉴를 '${targetRoot.menuName}' 그룹으로 이동했습니다.`);
            await persistBatchReorder(finalTree);
        }
    };

    // 하위 메뉴 아이템 위에 드롭 (순서 삽입)
    const handleChildDrop = async (e, targetChild, targetRootId) => {
        e.preventDefault();
        e.stopPropagation();

        const currentDragged = draggedItem;
        const dropState = dragOverChildState;
        handleDragEnd();

        if (!currentDragged) return;

        // 화면 보관함에서 하위 아이템 위에 드롭 -> 해당 대메뉴 하위로 화면 링크
        if (currentDragged.type === 'SCREEN_ITEM') {
            const targetRoot = menuTree.find(r => r.id === targetRootId);
            await handleDropScreenOnRoot(currentDragged, targetRootId, targetRoot?.menuName || '대메뉴');
            return;
        }

        if (currentDragged.type === 'CHILD_MENU') {
            if (currentDragged.id === targetChild.id) return; // 자기 자신

            let movedItem = null;
            // 1. 기존 위치에서 제거
            const treeWithoutItem = menuTree.map(root => {
                if (root.id === currentDragged.parentId) {
                    movedItem = (root.children || []).find(c => c.id === currentDragged.id);
                    return {
                        ...root,
                        children: (root.children || []).filter(c => c.id !== currentDragged.id)
                    };
                }
                return root;
            });

            if (!movedItem) return;

            // 2. 타겟 위치 앞 또는 뒤에 삽입
            const finalTree = treeWithoutItem.map(root => {
                if (root.id === targetRootId) {
                    const children = [...(root.children || [])];
                    const targetIdx = children.findIndex(c => c.id === targetChild.id);
                    const insertIdx = (dropState?.position === 'bottom') ? targetIdx + 1 : targetIdx;

                    const updatedItem = {
                        ...movedItem,
                        parentId: targetRootId
                    };

                    if (targetIdx === -1) {
                        children.push(updatedItem);
                    } else {
                        children.splice(insertIdx, 0, updatedItem);
                    }

                    // 순서 재부여
                    const reordered = children.map((c, idx) => ({
                        ...c,
                        menuOrder: (idx + 1) * 10
                    }));

                    return { ...root, children: reordered };
                }
                return root;
            });

            setMenuTree(finalTree);
            toast.info(`'${movedItem.menuName}' 메뉴 순서를 재정렬했습니다.`);
            await persistBatchReorder(finalTree);
        }
    };

    // 보관함 화면을 대메뉴로 연결하는 핸들러
    const handleDropScreenOnRoot = async (screenItem, targetRootId, targetRootName) => {
        try {
            await linkScreenToMenu(screenItem.screenId, {
                parentId: targetRootId,
                menuName: screenItem.screenName,
                menuOrder: 99,
                icon: screenItem.icon || '📋'
            });
            toast.success(`'${screenItem.screenName}' 화면이 '${targetRootName}' 메뉴로 연결되었습니다!`);
            await loadAllData();
            window.dispatchEvent(new CustomEvent('dynamic-menu-updated'));
            window.dispatchEvent(new CustomEvent('qms_menu_updated'));
        } catch (err) {
            console.error('[SCREEN MENU MGMT] Link screen error', err);
            reportGlobalError(err?.message || '화면 메뉴 연결 실패', err?.stack, 'ScreenMenuManagementPage:handleDropScreenOnRoot', 'DATABASE');
            toast.error('화면 메뉴 배치에 실패했습니다.');
        }
    };

    // 보관함에서 수동으로 선택 후 [배치] 버튼 클릭
    const handleQuickAssignScreen = async (screen) => {
        const selectedParentId = screenQuickAssign[screen.screenId];
        if (!selectedParentId) {
            toast.warning('배치할 대상 대메뉴를 선택해주세요.');
            return;
        }

        try {
            await linkScreenToMenu(screen.screenId, {
                parentId: Number(selectedParentId),
                menuName: screen.screenName,
                menuOrder: 99,
                icon: screen.icon || '📋'
            });
            toast.success(`'${screen.screenName}' 화면의 메뉴 배치가 저장되었습니다!`);
            setScreenQuickAssign(prev => {
                const next = { ...prev };
                delete next[screen.screenId];
                return next;
            });
            await loadAllData();
            window.dispatchEvent(new CustomEvent('dynamic-menu-updated'));
            window.dispatchEvent(new CustomEvent('qms_menu_updated'));
        } catch (err) {
            console.error('[SCREEN MENU MGMT] Quick link error', err);
            reportGlobalError(err?.message || '화면 배치 저장 실패', err?.stack, 'ScreenMenuManagementPage:handleQuickAssignScreen', 'DATABASE');
            toast.error('화면 배치 저장에 실패했습니다.');
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
            {/* 1. 상단 메인 헤더 */}
            <div style={{
                background: '#ffffff',
                padding: '20px 24px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>🖥️</span>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                            시스템 화면 및 메뉴 관리 센터
                        </h2>
                        <span style={{
                            padding: '3px 8px',
                            background: '#eff6ff',
                            color: '#2563eb',
                            fontSize: '11px',
                            fontWeight: '700',
                            borderRadius: '4px'
                        }}>
                            SYSTEM & DYNAMIC
                        </span>
                        <span style={{
                            padding: '3px 8px',
                            background: '#f0fdf4',
                            color: '#16a34a',
                            fontSize: '11px',
                            fontWeight: '700',
                            borderRadius: '4px',
                            border: '1px solid #bbf7d0'
                        }}>
                            DnD 드래그앤드롭 활성화
                        </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
                        사이드바 대분류와 하위 메뉴 구조를 단일 뷰에서 통합 관리하고, 화면을 마우스 드래그앤드롭으로 원하는 메뉴 그룹에 즉시 배치합니다.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={loadAllData}
                        disabled={loading}
                        style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#475569',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>🔄</span>
                        <span>{loading ? '새로고침 중...' : '새로고침'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsBuilderOpen(true)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#2563eb',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                        }}
                    >
                        <span>✨</span>
                        <span>새 동적 화면 빌더</span>
                    </button>
                </div>
            </div>

            {/* 2. 관리자 인터랙션 안내 배너 */}
            <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '12px 18px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px',
                color: '#0369a1'
            }}>
                <span style={{ fontSize: '20px' }}>💡</span>
                <div style={{ lineHeight: '1.5' }}>
                    <strong>사용 팁:</strong> <strong>최상위 대분류(ROOT)</strong>는 고정되어 이동되지 않습니다. 하위 메뉴와 화면 항목의 <strong>`⠿` 핸들</strong>을 잡고 드래그하여 <strong>동일 그룹 내 순서 변경</strong>이나 <strong>다른 대분류 카드로 자유롭게 이동</strong>할 수 있습니다. 우측 '화면 보관함'의 화면을 끌어다 좌측 대분류 카드 안으로 드롭하면 즉시 사이드바 메뉴에 편성됩니다.
                </div>
            </div>

            {/* 3. 통합 단일 뷰 그리드 (좌측: 메뉴 카테고리 트리 / 우측: 등록 폼 + 화면 보관함) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
                
                {/* ============================================================== */}
                {/* [좌측] 통합 메뉴 카테고리 트리 & DnD 드롭존                     */}
                {/* ============================================================== */}
                <div style={{
                    background: '#ffffff',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                🌳 통합 메뉴 카테고리 트리
                            </h3>
                            <span style={{
                                fontSize: '11px',
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: '700'
                            }}>
                                {menuTree.length}개 대분류
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                                type="button"
                                onClick={handleCollapseAll}
                                style={{
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    background: '#f8fafc',
                                    fontSize: '11px',
                                    color: '#475569',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                                title="모든 대분류 카드를 접습니다."
                            >
                                🔼 모두 접기
                            </button>
                            <button
                                type="button"
                                onClick={handleExpandAll}
                                style={{
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    background: '#f8fafc',
                                    fontSize: '11px',
                                    color: '#475569',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                                title="모든 대분류 카드를 펼칩니다."
                            >
                                🔽 모두 펼치기
                            </button>
                            <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '4px' }}>
                                대분류 고정 · 하위 항목 드래그 이동
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                            ⏳ 메뉴 및 화면 구조를 불러오는 중입니다...
                        </div>
                    ) : menuTree.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                            등록된 대분류 메뉴가 없습니다. 우측 폼에서 첫 대분류를 생성해보세요!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {menuTree.map(rootMenu => {
                                const isRootDragOver = dragOverRootId === rootMenu.id;
                                const childCount = rootMenu.children?.length || 0;
                                const isCollapsed = !!collapsedRoots[rootMenu.id];

                                return (
                                    <div 
                                        key={rootMenu.id}
                                        className={`root-menu-card ${isRootDragOver ? 'drag-over' : ''}`}
                                        onDragOver={(e) => handleRootDragOver(e, rootMenu.id)}
                                        onDragLeave={(e) => handleRootDragLeave(e, rootMenu.id)}
                                        onDrop={(e) => handleRootDrop(e, rootMenu)}
                                    >
                                        {/* 대메뉴 헤더 (draggable={false}: 절대 이동 불가) */}
                                        <div style={{
                                            padding: '12px 16px',
                                            background: '#f8fafc',
                                            borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            userSelect: 'none'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {/* 접기/펼치기 토글 버튼 */}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleRootCollapse(rootMenu.id)}
                                                    style={{
                                                        border: 'none',
                                                        background: 'transparent',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        color: '#475569',
                                                        padding: '2px 4px',
                                                        borderRadius: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        lineHeight: 1
                                                    }}
                                                    title={isCollapsed ? '대분류 펼치기' : '대분류 접기'}
                                                >
                                                    {isCollapsed ? '▶' : '▼'}
                                                </button>
                                                <span 
                                                    style={{ fontSize: '20px', cursor: 'pointer' }}
                                                    onClick={() => toggleRootCollapse(rootMenu.id)}
                                                >
                                                    {rootMenu.icon || '📁'}
                                                </span>
                                                <span 
                                                    style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', cursor: 'pointer' }}
                                                    onClick={() => toggleRootCollapse(rootMenu.id)}
                                                >
                                                    {rootMenu.menuName}
                                                </span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    color: '#64748b',
                                                    background: '#e2e8f0',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontFamily: 'monospace'
                                                }}>
                                                    {rootMenu.menuCode}
                                                </span>
                                                <span style={{
                                                    fontSize: '10px',
                                                    background: '#e0e7ff',
                                                    color: '#4338ca',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: '700'
                                                }}>
                                                    대분류 (고정)
                                                </span>
                                                {isCollapsed ? (
                                                    <span style={{
                                                        fontSize: '11px',
                                                        color: '#b45309',
                                                        background: '#fef3c7',
                                                        padding: '1px 6px',
                                                        borderRadius: '4px',
                                                        fontWeight: '700'
                                                    }}>
                                                        하위 {childCount}개 접힘
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                        (순서: {rootMenu.menuOrder})
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleResetForm();
                                                        handleFormChange('parentId', String(rootMenu.id));
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #cbd5e1',
                                                        background: '#ffffff',
                                                        fontSize: '11px',
                                                        color: '#0284c7',
                                                        cursor: 'pointer',
                                                        fontWeight: '700'
                                                    }}
                                                    title="이 대메뉴 아래에 새 하위 메뉴 추가"
                                                >
                                                    + 하위 추가
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDividerModal(rootMenu)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #c7d2fe',
                                                        background: '#eef2ff',
                                                        fontSize: '11px',
                                                        color: '#4338ca',
                                                        cursor: 'pointer',
                                                        fontWeight: '700'
                                                    }}
                                                    title="이 대메뉴 아래에 새 메뉴 구분선(소분류 헤더) 추가"
                                                >
                                                    + 구분선 추가
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditMenuClick(rootMenu)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #cbd5e1',
                                                        background: '#ffffff',
                                                        fontSize: '11px',
                                                        color: '#475569',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    수정
                                                </button>
                                                {isSystemStandardItem(rootMenu) ? (
                                                    <button
                                                        type="button"
                                                        disabled={true}
                                                        title="시스템 표준 대분류는 삭제할 수 없습니다."
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            border: '1px solid #e2e8f0',
                                                            background: '#f8fafc',
                                                            fontSize: '11px',
                                                            color: '#94a3b8',
                                                            cursor: 'not-allowed'
                                                        }}
                                                    >
                                                        보호됨
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteMenu(rootMenu.id, rootMenu.menuName, rootMenu)}
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            border: '1px solid #fecaca',
                                                            background: '#fef2f2',
                                                            fontSize: '11px',
                                                            color: '#dc2626',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        삭제
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* 하위 메뉴 및 화면 아이템 리스트 (드롭존 & 드래그 아이템) */}
                                        <div style={{
                                            padding: '12px 14px',
                                            background: isRootDragOver ? '#f0f7ff' : '#ffffff',
                                            display: isCollapsed ? 'none' : 'block'
                                        }}>
                                            {childCount > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {rootMenu.children.map(child => {
                                                        const isDraggingThis = draggedItem?.type === 'CHILD_MENU' && draggedItem?.id === child.id;
                                                        const isOverThis = dragOverChildState?.childId === child.id;
                                                        const indicator = isOverThis ? dragOverChildState.position : null;
                                                        const isDivider = isDividerItem(child);
                                                        const isNew = isNewOrCustomItem(child);

                                                        return (
                                                            <div
                                                                key={child.id}
                                                                className={`menu-dnd-item ${isDraggingThis ? 'dragging' : ''} ${indicator === 'top' ? 'drag-over-top' : indicator === 'bottom' ? 'drag-over-bottom' : ''}`}
                                                                draggable={true}
                                                                onDragStart={(e) => handleChildDragStart(e, child, rootMenu.id)}
                                                                onDragEnd={handleDragEnd}
                                                                onDragOver={(e) => handleChildDragOver(e, child.id, rootMenu.id)}
                                                                onDragLeave={() => handleChildDragLeave(child.id)}
                                                                onDrop={(e) => handleChildDrop(e, child, rootMenu.id)}
                                                                style={{
                                                                    background: isDivider ? '#f8fafc' : '#ffffff',
                                                                    border: isDivider ? '1px dashed #cbd5e1' : undefined
                                                                }}
                                                            >
                                                                {/* 좌측: 핸들 + 아이콘 + 메뉴명 + 동적 뱃지 */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                    <span className="drag-handle-grip" title="잡아서 위/아래 순서 변경 또는 다른 대메뉴로 이동">
                                                                        ⠿
                                                                    </span>
                                                                    <span style={{ fontSize: '15px' }}>{child.icon || (isDivider ? '➖' : '📄')}</span>
                                                                    <span style={{ fontSize: '13px', fontWeight: isDivider ? '800' : '700', color: isDivider ? '#334155' : '#1e293b' }}>
                                                                        {child.menuName}
                                                                    </span>

                                                                    {/* 화면 구분 뱃지 (메뉴 구분선 vs 시스템 표준 개발 항목 vs ✨ 동적 추가 화면) */}
                                                                    {isDivider ? (
                                                                        <span style={{
                                                                            fontSize: '11px',
                                                                            background: '#e0e7ff',
                                                                            color: '#4338ca',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '12px',
                                                                            fontWeight: '800'
                                                                        }}>
                                                                            메뉴 구분선
                                                                        </span>
                                                                    ) : isSystemStandardItem(child) ? (
                                                                        <span className="badge-system-item" title="시스템 코드로 개발 및 등록된 핵심 표준 메뉴">
                                                                            시스템 표준 개발 항목
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge-dynamic-item" title="동적으로 추가/생성된 커스텀 화면">
                                                                            ✨ 동적 추가 화면
                                                                        </span>
                                                                    )}

                                                                    {child.screenCode ? (
                                                                        <span style={{
                                                                            fontSize: '10px',
                                                                            background: '#e0f2fe',
                                                                            color: '#0369a1',
                                                                            padding: '2px 5px',
                                                                            borderRadius: '4px',
                                                                            fontFamily: 'monospace'
                                                                        }}>
                                                                            {child.screenCode}
                                                                        </span>
                                                                    ) : child.menuCode ? (
                                                                        <span style={{
                                                                            fontSize: '10px',
                                                                            background: '#f1f5f9',
                                                                            color: '#64748b',
                                                                            padding: '2px 5px',
                                                                            borderRadius: '4px',
                                                                            fontFamily: 'monospace'
                                                                        }}>
                                                                            {child.menuCode}
                                                                        </span>
                                                                    ) : null}

                                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                                        (순서: {child.menuOrder})
                                                                    </span>
                                                                </div>

                                                                {/* 우측: 빠른 대분류 이동 셀렉트 + 수정 + 삭제 */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <select
                                                                        value={rootMenu.id}
                                                                        onChange={(e) => handleQuickMove(child.id, e.target.value)}
                                                                        title="다른 대메뉴 카테고리로 즉시 소속 이동"
                                                                        style={{
                                                                            padding: '3px 6px',
                                                                            borderRadius: '4px',
                                                                            border: '1px solid #cbd5e1',
                                                                            fontSize: '11px',
                                                                            background: '#ffffff',
                                                                            color: '#475569',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        {rootMenuOptions.map(opt => (
                                                                            <option key={opt.id} value={opt.id}>
                                                                                {opt.label}
                                                                            </option>
                                                                        ))}
                                                                    </select>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => isDivider ? handleOpenDividerModal(rootMenu, child) : handleEditMenuClick(child)}
                                                                        style={{
                                                                            padding: '3px 7px',
                                                                            borderRadius: '4px',
                                                                            border: '1px solid #e2e8f0',
                                                                            background: '#ffffff',
                                                                            fontSize: '11px',
                                                                            color: '#475569',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        수정
                                                                    </button>
                                                                    {isSystemStandardItem(child) ? (
                                                                        <button
                                                                            type="button"
                                                                            disabled={true}
                                                                            title="시스템 표준 개발 메뉴는 데이터 무결성을 위해 삭제할 수 없습니다. (위치/순서 이동만 가능)"
                                                                            style={{
                                                                                padding: '3px 7px',
                                                                                borderRadius: '4px',
                                                                                border: '1px solid #e2e8f0',
                                                                                background: '#f8fafc',
                                                                                fontSize: '11px',
                                                                                color: '#94a3b8',
                                                                                cursor: 'not-allowed'
                                                                            }}
                                                                        >
                                                                            보호됨
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteMenu(child.id, child.menuName, child)}
                                                                            style={{
                                                                                padding: '3px 7px',
                                                                                borderRadius: '4px',
                                                                                border: '1px solid #fecaca',
                                                                                background: '#ffffff',
                                                                                fontSize: '11px',
                                                                                color: '#dc2626',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            삭제
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                /* 빈 대메뉴 드롭존 플레이스홀더 */
                                                <div style={{
                                                    padding: '24px 16px',
                                                    border: '2px dashed #cbd5e1',
                                                    borderRadius: '8px',
                                                    textAlign: 'center',
                                                    color: '#94a3b8',
                                                    fontSize: '12px',
                                                    background: isRootDragOver ? '#e0f2fe' : '#f8fafc',
                                                    transition: 'all 0.15s ease'
                                                }}>
                                                    <span>📥 하위 메뉴나 우측 화면 보관함의 카드를 이곳으로 드래그하여 추가하세요.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ============================================================== */}
                {/* [우측] 상단: 메뉴 등록/수정 폼 & 하단: 화면 보관함              */}
                {/* ============================================================== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* [우측 상단] 메뉴 등록 / 수정 폼 카드 */}
                    <div style={{
                        background: '#ffffff',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                {editingMenuId ? '✏️ 메뉴 정보 수정' : '➕ 새 메뉴 / 카테고리 추가'}
                            </h3>
                            {editingMenuId && (
                                <button
                                    type="button"
                                    onClick={handleResetForm}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #cbd5e1',
                                        background: '#f8fafc',
                                        fontSize: '11px',
                                        color: '#64748b',
                                        cursor: 'pointer'
                                    }}
                                >
                                    취소하고 새로 작성
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSaveMenu} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* 상위 메뉴 선택 (오직 대분류만 선택 가능) */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                                            상위 메뉴 (Parent)
                                        </label>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                                            (대분류만 지정 가능)
                                        </span>
                                    </div>
                                    <select
                                        value={menuForm.parentId}
                                        onChange={(e) => handleFormChange('parentId', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            background: '#ffffff'
                                        }}
                                    >
                                        <option value="">(최상위 대분류로 신규 생성)</option>
                                        {rootMenuOptions.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                            {/* 메뉴명 */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    메뉴명 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={menuForm.menuName}
                                    onChange={(e) => handleFormChange('menuName', e.target.value)}
                                    placeholder="예: 물류 센터 재고 관리"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* 메뉴 코드 */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                                        메뉴 코드 (Menu Code)
                                    </label>
                                    {isSystemStandardItem(editingMenuItem) && (
                                        <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: '700' }}>
                                            [시스템 표준 코드 - 고정]
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={menuForm.menuCode}
                                    disabled={isSystemStandardItem(editingMenuItem)}
                                    onChange={(e) => handleFormChange('menuCode', e.target.value)}
                                    placeholder="비워둘 경우 자동 생성 (예: MENU_LOGISTICS)"
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '13px',
                                        fontFamily: 'monospace',
                                        boxSizing: 'border-box',
                                        background: isSystemStandardItem(editingMenuItem) ? '#f1f5f9' : '#ffffff',
                                        color: isSystemStandardItem(editingMenuItem) ? '#64748b' : '#0f172a',
                                        cursor: isSystemStandardItem(editingMenuItem) ? 'not-allowed' : 'text'
                                    }}
                                />
                            </div>

                            {/* 아이콘 선택 */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    아이콘 (Emoji)
                                </label>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={menuForm.icon}
                                        onChange={(e) => handleFormChange('icon', e.target.value)}
                                        style={{
                                            width: '60px',
                                            padding: '6px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '16px',
                                            textAlign: 'center'
                                        }}
                                    />
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                        {QUICK_ICONS.map(ic => (
                                            <button
                                                key={ic}
                                                type="button"
                                                onClick={() => handleFormChange('icon', ic)}
                                                style={{
                                                    padding: '3px 5px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #e2e8f0',
                                                    background: menuForm.icon === ic ? '#eff6ff' : '#ffffff',
                                                    cursor: 'pointer',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                {ic}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 표시 순서 */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    표시 순서 (Order)
                                </label>
                                <input
                                    type="number"
                                    value={menuForm.menuOrder}
                                    onChange={(e) => handleFormChange('menuOrder', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* 제출 버튼 */}
                            <div style={{ marginTop: '6px' }}>
                                <button
                                    type="submit"
                                    style={{
                                        width: '100%',
                                        padding: '9px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: editingMenuId ? '#0284c7' : '#2563eb',
                                        color: '#ffffff',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                                    }}
                                >
                                    {editingMenuId ? '💾 메뉴 수정사항 저장' : '➕ 신규 메뉴 등록하기'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* [우측 하단] 등록된 화면 및 미배치 화면 보관함 */}
                    <div style={{
                        background: '#ffffff',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                    🧭 등록된 화면 보관함
                                </h3>
                                <span style={{
                                    fontSize: '11px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: '700'
                                }}>
                                    {screenMappings.length}개
                                </span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                화면을 잡아 좌측 대메뉴로 드래그&드롭!
                            </span>
                        </div>

                        <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>
                            원하는 화면을 마우스로 잡고 좌측 대메뉴 카드로 끌어다 놓으면 즉시 메뉴로 편성됩니다.
                        </p>

                        {/* 필터 탭 & 검색창 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                placeholder="화면명, 코드, 소속 검색..."
                                style={{
                                    width: '100%',
                                    padding: '7px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '12px',
                                    boxSizing: 'border-box'
                                }}
                            />

                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => setScreenFilterTab('ALL')}
                                    style={{
                                        flex: 1,
                                        padding: '5px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        background: screenFilterTab === 'ALL' ? '#1e293b' : '#ffffff',
                                        color: screenFilterTab === 'ALL' ? '#ffffff' : '#64748b',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    전체 ({screenMappings.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScreenFilterTab('UNASSIGNED')}
                                    style={{
                                        flex: 1,
                                        padding: '5px 8px',
                                        borderRadius: '6px',
                                        border: screenFilterTab === 'UNASSIGNED' ? '1px solid #b45309' : '1px solid #cbd5e1',
                                        background: screenFilterTab === 'UNASSIGNED' ? '#b45309' : '#ffffff',
                                        color: screenFilterTab === 'UNASSIGNED' ? '#ffffff' : '#b45309',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    미할당 ({unassignedCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScreenFilterTab('NEW')}
                                    style={{
                                        flex: 1,
                                        padding: '5px 8px',
                                        borderRadius: '6px',
                                        border: screenFilterTab === 'NEW' ? '1px solid #059669' : '1px solid #cbd5e1',
                                        background: screenFilterTab === 'NEW' ? '#059669' : '#ffffff',
                                        color: screenFilterTab === 'NEW' ? '#ffffff' : '#059669',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    신규 항목 ({newScreensCount})
                                </button>
                            </div>
                        </div>

                        {/* 화면 리스트 (스크롤 영역) */}
                        <div style={{
                            maxHeight: '440px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            paddingRight: '4px'
                        }}>
                            {filteredScreens.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                    검색 조건에 맞는 화면이 없습니다.
                                </div>
                            ) : (
                                filteredScreens.map(screen => {
                                    const isNew = isNewOrCustomItem(screen);
                                    const selectedQuickParent = screenQuickAssign[screen.screenId] || '';

                                    return (
                                        <div
                                            key={screen.screenId}
                                            draggable={true}
                                            onDragStart={(e) => handleScreenDragStart(e, screen)}
                                            onDragEnd={handleDragEnd}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                background: '#f8fafc',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px',
                                                cursor: 'grab',
                                                userSelect: 'none',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#93c5fd'}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                                        >
                                            {/* 상단: 핸들 + 이름 + 신규 뱃지 */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="drag-handle-grip" title="잡아서 좌측 원하는 대메뉴 카드 안으로 드래그하세요">
                                                        ⠿
                                                    </span>
                                                    <span style={{ fontSize: '14px' }}>{screen.icon || '📋'}</span>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                                        {screen.screenName}
                                                    </span>
                                                </div>

                                                <div>
                                                    {isNew ? (
                                                        <span className="badge-new-item">
                                                            ✨ 신규 추가 항목
                                                        </span>
                                                    ) : (
                                                        <span className="badge-standard-item">
                                                            시스템 표준
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 중간: 코드 + 소속 상태 */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                                                <span style={{ color: '#64748b', fontFamily: 'monospace' }}>
                                                    {screen.screenCode}
                                                </span>

                                                {screen.parentMenuName ? (
                                                    <span style={{ color: '#0284c7', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                                        소속: {screen.parentMenuName}
                                                    </span>
                                                ) : (
                                                    <span className="badge-unassigned-item">
                                                        ⚠️ 메뉴 미할당
                                                    </span>
                                                )}
                                            </div>

                                            {/* 하단: 원클릭 드롭다운 배치 보조 도구 */}
                                            <div style={{
                                                marginTop: '4px',
                                                paddingTop: '6px',
                                                borderTop: '1px dashed #e2e8f0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <select
                                                    value={selectedQuickParent || (screen.parentMenuId ? String(screen.parentMenuId) : '')}
                                                    onChange={(e) => setScreenQuickAssign(prev => ({
                                                        ...prev,
                                                        [screen.screenId]: e.target.value
                                                    }))}
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px 6px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #cbd5e1',
                                                        fontSize: '11px',
                                                        background: '#ffffff'
                                                    }}
                                                >
                                                    <option value="">(배치할 대메뉴 선택)</option>
                                                    {rootMenuOptions.map(opt => (
                                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                    ))}
                                                </select>

                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickAssignScreen(screen)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        border: 'none',
                                                        background: '#0284c7',
                                                        color: '#ffffff',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="선택한 대메뉴로 배치 저장"
                                                >
                                                    배치
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* 동적 화면 빌더 모달 */}
            {isBuilderOpen && (
                <ScreenBuilderModal
                    isOpen={isBuilderOpen}
                    onClose={() => setIsBuilderOpen(false)}
                    onSuccess={() => {
                        setIsBuilderOpen(false);
                        loadAllData();
                    }}
                />
            )}

            {/* 메뉴 구분선(소분류 헤더) 추가/수정 모달 */}
            {isDividerModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(3px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        width: '420px',
                        maxWidth: '92vw',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{
                            padding: '16px 20px',
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                                {dividerForm.id ? '✏️ 메뉴 구분선(소분류 헤더) 수정' : '➕ 새 메뉴 구분선(소분류 헤더) 추가'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsDividerModalOpen(false)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    color: '#64748b'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveDivider} style={{ padding: '20px' }}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                                    소속 대메뉴
                                </label>
                                <input
                                    type="text"
                                    value={dividerForm.parentName || '선택된 대메뉴'}
                                    disabled={true}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        background: '#f1f5f9',
                                        fontSize: '13px',
                                        color: '#64748b',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                                    구분선 명칭 (소분류 제목) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: 기본 마스터, BOM/구성품 관리, 클레임 운영"
                                    value={dividerForm.menuName}
                                    onChange={(e) => setDividerForm(prev => ({ ...prev, menuName: e.target.value }))}
                                    autoFocus={true}
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                    왼쪽 사이드바 메뉴 목록에서 섹션을 구분해 주는 서브헤더로 표시됩니다.
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                                    표시 순서 (Order)
                                </label>
                                <input
                                    type="number"
                                    value={dividerForm.menuOrder}
                                    onChange={(e) => setDividerForm(prev => ({ ...prev, menuOrder: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '13px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                    숫자가 작을수록 상단에 노출되며, 마우스 드래그로도 자유롭게 순서를 변경할 수 있습니다.
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsDividerModalOpen(false)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#475569',
                                        cursor: 'pointer'
                                    }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: '#4338ca',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: '#ffffff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {dividerForm.id ? '수정 완료' : '구분선 등록'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScreenMenuManagementPage;
