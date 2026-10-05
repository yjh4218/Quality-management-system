package com.example.ims.service;

import com.example.ims.dto.dynamic.DynamicMenuBatchReorderDto;
import com.example.ims.dto.dynamic.DynamicMenuRequest;
import com.example.ims.dto.dynamic.DynamicMenuResponse;
import com.example.ims.dto.dynamic.ScreenMenuMappingResponse;
import com.example.ims.entity.DynamicMenu;
import com.example.ims.entity.DynamicMenuPermission;
import com.example.ims.entity.DynamicScreen;
import com.example.ims.entity.Role;
import com.example.ims.entity.User;
import com.example.ims.repository.DynamicMenuPermissionRepository;
import com.example.ims.repository.DynamicMenuRepository;
import com.example.ims.repository.DynamicScreenRepository;
import com.example.ims.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DynamicMenuService {

    private final DynamicMenuRepository menuRepository;
    private final DynamicMenuPermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final DynamicScreenRepository screenRepository;

    @Transactional(readOnly = true)
    public List<DynamicMenuResponse> getMyMenus(User user) {
        if (user == null || user.getRole() == null) {
            return Collections.emptyList();
        }

        String userRoleKey = user.getRole();
        boolean isAdmin = "ROLE_ADMIN".equalsIgnoreCase(userRoleKey) 
                || (user.getUsername() != null && "admin".equalsIgnoreCase(user.getUsername()));

        List<DynamicMenu> allActiveMenus = menuRepository.findByIsActiveTrueOrderByMenuOrderAsc();
        List<DynamicMenuPermission> permissions = Collections.emptyList();
        if (userRoleKey != null) {
            Role roleEntity = roleRepository.findByRoleKey(userRoleKey).orElse(null);
            if (roleEntity != null) {
                permissions = permissionRepository.findByRoleId(roleEntity.getId());
            }
        }
        Map<Long, DynamicMenuPermission> permMap = permissions.stream()
                .collect(Collectors.toMap(p -> p.getMenu().getId(), p -> p));

        List<DynamicMenu> accessibleMenus = new ArrayList<>();
        for (DynamicMenu menu : allActiveMenus) {
            if (isAdmin) {
                accessibleMenus.add(menu);
            } else {
                DynamicMenuPermission perm = permMap.get(menu.getId());
                if (perm != null && Boolean.TRUE.equals(perm.getCanView())) {
                    accessibleMenus.add(menu);
                }
            }
        }

        return buildTree(accessibleMenus, permMap, isAdmin);
    }

    @Transactional(readOnly = true)
    public List<DynamicMenuResponse> getAllMenusTree() {
        List<DynamicMenu> allMenus = menuRepository.findByIsActiveTrueOrderByMenuOrderAsc();
        return buildTree(allMenus, Collections.emptyMap(), true);
    }

    @Transactional
    public DynamicMenuResponse createMenu(DynamicMenuRequest req) {
        if (req.getMenuName() == null || req.getMenuName().trim().isEmpty()) {
            throw new IllegalArgumentException("메뉴명은 필수 입력값입니다.");
        }

        DynamicMenu parent = null;
        if (req.getParentId() != null) {
            parent = menuRepository.findById(req.getParentId()).orElse(null);
        }

        DynamicScreen screen = null;
        if (req.getScreenId() != null) {
            screen = screenRepository.findById(req.getScreenId()).orElse(null);
        }

        String resolvedMenuType = req.getMenuType() != null && !req.getMenuType().trim().isEmpty() 
                ? req.getMenuType().trim().toUpperCase() : "DYNAMIC";

        String menuCode = req.getMenuCode();
        if (menuCode == null || menuCode.trim().isEmpty()) {
            menuCode = "DIVIDER".equals(resolvedMenuType) ? "DIV_" + System.currentTimeMillis() : "MENU_" + System.currentTimeMillis();
        } else {
            menuCode = menuCode.trim().toUpperCase();
            if (menuRepository.findByMenuCode(menuCode).isPresent()) {
                menuCode = menuCode + "_" + System.currentTimeMillis();
            }
        }

        String defaultIcon = "DIVIDER".equals(resolvedMenuType) ? "➖" : (screen != null ? "📋" : "📁");
        String finalIcon = req.getIcon() != null && !req.getIcon().trim().isEmpty() ? req.getIcon().trim() : defaultIcon;

        DynamicMenu menu = DynamicMenu.builder()
                .menuName(req.getMenuName().trim())
                .menuCode(menuCode)
                .parent(parent)
                .screen("DIVIDER".equals(resolvedMenuType) ? null : screen)
                .icon(finalIcon)
                .menuOrder(req.getMenuOrder() != null ? req.getMenuOrder() : 99)
                .menuType(resolvedMenuType)
                .isActive(true)
                .build();

        menu = menuRepository.save(menu);

        // 기본 권한 부여 (관리자: 전체 권한, 일반: 조회 권한)
        List<Role> allRoles = roleRepository.findAll();
        List<DynamicMenuPermission> permissions = new ArrayList<>();
        for (Role r : allRoles) {
            boolean isAdmin = "ROLE_ADMIN".equalsIgnoreCase(r.getRoleKey()) || "ADMIN".equalsIgnoreCase(r.getRoleKey());
            permissions.add(DynamicMenuPermission.builder()
                    .menu(menu)
                    .role(r)
                    .canView(true)
                    .canCreate(isAdmin)
                    .canEdit(isAdmin)
                    .canDelete(isAdmin)
                    .build());
        }
        if (!permissions.isEmpty()) {
            permissionRepository.saveAll(permissions);
        }

        return toResponse(menu, true);
    }

    @Transactional
    public DynamicMenuResponse updateMenu(Long id, DynamicMenuRequest req) {
        DynamicMenu menu = menuRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 메뉴입니다. ID: " + id));

        if (req.getMenuName() != null && !req.getMenuName().trim().isEmpty()) {
            menu.setMenuName(req.getMenuName().trim());
        }
        if (req.getIcon() != null) {
            menu.setIcon(req.getIcon().trim());
        }
        if (req.getMenuOrder() != null) {
            menu.setMenuOrder(req.getMenuOrder());
        }
        if (req.getMenuType() != null && !req.getMenuType().trim().isEmpty()) {
            menu.setMenuType(req.getMenuType().trim().toUpperCase());
        }
        if (req.getIsActive() != null) {
            menu.setIsActive(req.getIsActive());
        }

        if (req.getParentId() != null) {
            if (req.getParentId().equals(menu.getId())) {
                throw new IllegalArgumentException("자신을 상위 메뉴로 지정할 수 없습니다.");
            }
            DynamicMenu parent = menuRepository.findById(req.getParentId()).orElse(null);
            menu.setParent(parent);
        } else if (Boolean.TRUE.equals(req.getIsActive())) {
            // parentId가 명시적으로 null로 전달된 경우 최상위 메뉴로 설정
            menu.setParent(null);
        }

        if (req.getScreenId() != null) {
            DynamicScreen screen = screenRepository.findById(req.getScreenId()).orElse(null);
            menu.setScreen(screen);
        }

        menu = menuRepository.save(menu);
        return toResponse(menu, true);
    }

    @Transactional
    public void deleteMenu(Long id) {
        DynamicMenu menu = menuRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 메뉴입니다. ID: " + id));

        if ("SYSTEM".equalsIgnoreCase(menu.getMenuType())) {
            throw new IllegalArgumentException("시스템 표준 개발 메뉴는 삭제할 수 없습니다. (ID: " + id + ")");
        }

        // Soft delete
        menu.setIsActive(false);
        menuRepository.save(menu);

        // 하위 메뉴들도 비활성화
        List<DynamicMenu> children = menuRepository.findByParentIdAndIsActiveTrueOrderByMenuOrderAsc(id);
        for (DynamicMenu child : children) {
            child.setIsActive(false);
        }
        if (!children.isEmpty()) {
            menuRepository.saveAll(children);
        }
    }

    @Transactional
    public void batchReorderMenus(List<DynamicMenuBatchReorderDto> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        List<Long> menuIds = items.stream()
                .map(DynamicMenuBatchReorderDto::getId)
                .filter(Objects::nonNull)
                .toList();
        Map<Long, DynamicMenu> menuMap = menuRepository.findAllById(menuIds).stream()
                .collect(Collectors.toMap(DynamicMenu::getId, Function.identity()));

        List<Long> parentIds = items.stream()
                .map(DynamicMenuBatchReorderDto::getParentId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, DynamicMenu> parentMap = parentIds.isEmpty() ? Collections.emptyMap() :
                menuRepository.findAllById(parentIds).stream()
                        .collect(Collectors.toMap(DynamicMenu::getId, Function.identity()));

        List<DynamicMenu> toSave = new ArrayList<>();
        for (DynamicMenuBatchReorderDto item : items) {
            if (item.getId() == null) continue;
            DynamicMenu menu = menuMap.get(item.getId());
            if (menu == null) continue;

            if (item.getParentId() != null) {
                if (!item.getParentId().equals(menu.getId())) {
                    menu.setParent(parentMap.get(item.getParentId()));
                }
            } else {
                menu.setParent(null);
            }

            if (item.getMenuOrder() != null) {
                menu.setMenuOrder(item.getMenuOrder());
            }
            toSave.add(menu);
        }
        if (!toSave.isEmpty()) {
            menuRepository.saveAll(toSave);
        }
    }

    @Transactional(readOnly = true)
    public List<ScreenMenuMappingResponse> getScreenMenuMappings() {
        List<DynamicScreen> screens = screenRepository.findByIsActiveTrueOrderByCreatedAtDesc();
        List<ScreenMenuMappingResponse> result = new ArrayList<>();

        for (DynamicScreen s : screens) {
            Optional<DynamicMenu> menuOpt = menuRepository.findFirstByScreenId(s.getId());
            DynamicMenu menu = menuOpt.orElse(null);

            result.add(ScreenMenuMappingResponse.builder()
                    .screenId(s.getId())
                    .screenCode(s.getScreenCode())
                    .screenName(s.getScreenName())
                    .screenType(s.getScreenType())
                    .description(s.getDescription())
                    .menuId(menu != null ? menu.getId() : null)
                    .menuName(menu != null ? menu.getMenuName() : null)
                    .menuCode(menu != null ? menu.getMenuCode() : null)
                    .parentMenuId(menu != null && menu.getParent() != null ? menu.getParent().getId() : null)
                    .parentMenuName(menu != null && menu.getParent() != null ? menu.getParent().getMenuName() : null)
                    .icon(menu != null ? menu.getIcon() : "📋")
                    .menuOrder(menu != null ? menu.getMenuOrder() : 99)
                    .isActive(s.getIsActive())
                    .createdAt(s.getCreatedAt() != null ? s.getCreatedAt().toString() : null)
                    .isDynamic(true)
                    .build());
        }
        return result;
    }

    @Transactional
    public ScreenMenuMappingResponse linkScreenToMenu(Long screenId, DynamicMenuRequest req) {
        DynamicScreen screen = screenRepository.findById(screenId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 화면입니다. ID: " + screenId));

        DynamicMenu menu = menuRepository.findFirstByScreenId(screenId).orElse(null);
        DynamicMenu parentMenu = null;
        if (req.getParentId() != null) {
            parentMenu = menuRepository.findById(req.getParentId()).orElse(null);
        }

        if (menu == null) {
            String menuCode = "MENU_" + screen.getScreenCode();
            if (menuRepository.findByMenuCode(menuCode).isPresent()) {
                menuCode = menuCode + "_" + System.currentTimeMillis();
            }
            menu = DynamicMenu.builder()
                    .menuName(req.getMenuName() != null ? req.getMenuName() : screen.getScreenName())
                    .menuCode(menuCode)
                    .parent(parentMenu)
                    .screen(screen)
                    .icon(req.getIcon() != null && !req.getIcon().isBlank() ? req.getIcon() : "📋")
                    .menuOrder(req.getMenuOrder() != null ? req.getMenuOrder() : 99)
                    .isActive(true)
                    .build();
        } else {
            menu.setParent(parentMenu);
            if (req.getMenuName() != null && !req.getMenuName().isBlank()) {
                menu.setMenuName(req.getMenuName().trim());
            }
            if (req.getIcon() != null && !req.getIcon().isBlank()) {
                menu.setIcon(req.getIcon().trim());
            }
            if (req.getMenuOrder() != null) {
                menu.setMenuOrder(req.getMenuOrder());
            }
            menu.setIsActive(true);
        }

        menu = menuRepository.save(menu);

        return ScreenMenuMappingResponse.builder()
                .screenId(screen.getId())
                .screenCode(screen.getScreenCode())
                .screenName(screen.getScreenName())
                .screenType(screen.getScreenType())
                .description(screen.getDescription())
                .menuId(menu.getId())
                .menuName(menu.getMenuName())
                .menuCode(menu.getMenuCode())
                .parentMenuId(parentMenu != null ? parentMenu.getId() : null)
                .parentMenuName(parentMenu != null ? parentMenu.getMenuName() : null)
                .icon(menu.getIcon())
                .menuOrder(menu.getMenuOrder())
                .isActive(screen.getIsActive())
                .createdAt(screen.getCreatedAt() != null ? screen.getCreatedAt().toString() : null)
                .isDynamic(true)
                .build();
    }

    private DynamicMenuResponse toResponse(DynamicMenu m, boolean isAdmin) {
        String menuType = m.getMenuType() != null ? m.getMenuType() : (m.getScreen() != null ? "DYNAMIC" : "SYSTEM");
        boolean isSystem = "SYSTEM".equalsIgnoreCase(menuType);

        return DynamicMenuResponse.builder()
                .id(m.getId())
                .parentId(m.getParent() != null ? m.getParent().getId() : null)
                .menuName(m.getMenuName())
                .menuCode(m.getMenuCode())
                .menuOrder(m.getMenuOrder())
                .screenId(m.getScreen() != null ? m.getScreen().getId() : null)
                .screenCode(m.getScreen() != null ? m.getScreen().getScreenCode() : null)
                .screenType(m.getScreen() != null ? m.getScreen().getScreenType() : null)
                .isDynamicScreen(m.getScreen() != null)
                .menuType(menuType)
                .isSystem(isSystem)
                .createdAt(m.getScreen() != null && m.getScreen().getCreatedAt() != null ? m.getScreen().getCreatedAt().toString() : null)
                .icon(m.getIcon())
                .canCreate(isAdmin)
                .canEdit(isAdmin)
                .canDelete(isAdmin && !isSystem)
                .children(new ArrayList<>())
                .build();
    }

    private List<DynamicMenuResponse> buildTree(List<DynamicMenu> menus, Map<Long, DynamicMenuPermission> permMap, boolean isAdmin) {
        Map<Long, DynamicMenuResponse> responseMap = new LinkedHashMap<>();
        for (DynamicMenu m : menus) {
            String menuType = m.getMenuType() != null ? m.getMenuType() : (m.getScreen() != null ? "DYNAMIC" : "SYSTEM");
            boolean isSystem = "SYSTEM".equalsIgnoreCase(menuType);

            DynamicMenuPermission perm = permMap.get(m.getId());
            boolean canCreate = isAdmin || (perm != null && Boolean.TRUE.equals(perm.getCanCreate()));
            boolean canEdit = isAdmin || (perm != null && Boolean.TRUE.equals(perm.getCanEdit()));
            boolean canDelete = !isSystem && (isAdmin || (perm != null && Boolean.TRUE.equals(perm.getCanDelete())));

            DynamicMenuResponse res = DynamicMenuResponse.builder()
                    .id(m.getId())
                    .parentId(m.getParent() != null ? m.getParent().getId() : null)
                    .menuName(m.getMenuName())
                    .menuCode(m.getMenuCode())
                    .menuOrder(m.getMenuOrder())
                    .screenId(m.getScreen() != null ? m.getScreen().getId() : null)
                    .screenCode(m.getScreen() != null ? m.getScreen().getScreenCode() : null)
                    .screenType(m.getScreen() != null ? m.getScreen().getScreenType() : null)
                    .isDynamicScreen(m.getScreen() != null)
                    .menuType(menuType)
                    .isSystem(isSystem)
                    .createdAt(m.getScreen() != null && m.getScreen().getCreatedAt() != null ? m.getScreen().getCreatedAt().toString() : null)
                    .icon(m.getIcon())
                    .canCreate(canCreate)
                    .canEdit(canEdit)
                    .canDelete(canDelete)
                    .children(new ArrayList<>())
                    .build();
            responseMap.put(m.getId(), res);
        }

        List<DynamicMenuResponse> rootList = new ArrayList<>();
        for (DynamicMenuResponse item : responseMap.values()) {
            if (item.getParentId() == null || !responseMap.containsKey(item.getParentId())) {
                rootList.add(item);
            } else {
                responseMap.get(item.getParentId()).getChildren().add(item);
            }
        }
        return rootList;
    }
}
