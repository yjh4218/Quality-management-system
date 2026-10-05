package com.example.ims.service;

import com.example.ims.dto.dynamic.DynamicScreenMetaResponse;
import com.example.ims.dto.dynamic.ScreenCreateRequest;
import com.example.ims.dto.dynamic.ScreenUpdateRequest;
import com.example.ims.dto.dynamic.UserViewUpdateRequest;
import com.example.ims.entity.*;
import com.example.ims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DynamicScreenService {

    private final DynamicScreenRepository screenRepository;
    private final ScreenSearchFieldRepository searchFieldRepository;
    private final ScreenGridColumnRepository gridColumnRepository;
    private final ScreenGridUserViewRepository userViewRepository;
    private final ScreenSubPageRepository subPageRepository;
    private final ScreenFormFieldRepository formFieldRepository;
    private final DynamicMenuRepository menuRepository;
    private final DynamicMenuPermissionRepository menuPermissionRepository;
    private final RoleRepository roleRepository;
    private final SearchFieldCatalogRepository searchFieldCatalogRepository;
    private final MasterDataSourceRepository masterDataSourceRepository;

    @Transactional(readOnly = true)
    public DynamicScreenMetaResponse getScreenMeta(Long screenId, Long userId) {
        DynamicScreen screen = screenRepository.findById(screenId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 동적 화면 ID: " + screenId));
        return buildScreenMeta(screen, userId);
    }

    @Transactional(readOnly = true)
    public DynamicScreenMetaResponse getScreenMetaByCode(String screenCode, Long userId) {
        DynamicScreen screen = screenRepository.findByScreenCode(screenCode)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 동적 화면 코드: " + screenCode));
        return buildScreenMeta(screen, userId);
    }

    @Transactional(readOnly = true)
    public List<DynamicScreen> getAllActiveScreens() {
        return screenRepository.findByIsActiveTrue();
    }

    private DynamicScreenMetaResponse buildScreenMeta(DynamicScreen screen, Long userId) {
        // 1. 검색 필드 매핑
        List<ScreenSearchField> searchFields = searchFieldRepository.findByScreenIdOrderByDisplayOrderAsc(screen.getId());
        List<DynamicScreenMetaResponse.SearchFieldDto> searchFieldDtos = searchFields.stream().map(sf -> {
            SearchFieldCatalog cat = sf.getCatalog();
            return DynamicScreenMetaResponse.SearchFieldDto.builder()
                    .id(sf.getId())
                    .catalogId(cat != null ? cat.getId() : null)
                    .catalogKey(cat != null ? cat.getCatalogKey() : null)
                    .label(cat != null ? cat.getLabel() : "")
                    .fieldType(cat != null ? cat.getFieldType() : "TEXT")
                    .componentKey(cat != null ? cat.getComponentKey() : null)
                    .displayOrder(sf.getDisplayOrder())
                    .relationSource(cat != null ? cat.getRelationSource() : null)
                    .build();
        }).collect(Collectors.toList());

        // 2. 그리드 컬럼 매핑
        List<ScreenGridColumn> columns = gridColumnRepository.findByScreenIdOrderByDisplayOrderAsc(screen.getId());
        List<DynamicScreenMetaResponse.GridColumnDto> columnDtos = columns.stream().map(c -> 
            DynamicScreenMetaResponse.GridColumnDto.builder()
                    .id(c.getId())
                    .fieldKey(c.getFieldKey())
                    .label(c.getLabel())
                    .fieldType(c.getFieldType())
                    .width(c.getWidth())
                    .sortable(c.getSortable())
                    .editable(c.getEditable())
                    .displayOrder(c.getDisplayOrder())
                    .isMeasure(c.getIsMeasure())
                    .isDimension(c.getIsDimension())
                    .aggregationType(c.getAggregationType())
                    .isPrimaryDate(c.getIsPrimaryDate())
                    .isExcludedFromDashboard(c.getIsExcludedFromDashboard())
                    .relationSource(c.getRelationSource())
                    .build()
        ).collect(Collectors.toList());

        // 3. 사용자 그리드 뷰 (Notion 속성 토글 및 컬럼 순서)
        List<DynamicScreenMetaResponse.UserViewDto> userViewDtos = new ArrayList<>();
        if (userId != null) {
            List<ScreenGridUserView> userViews = userViewRepository.findByScreenIdAndUserIdOrderByColumnOrderAsc(screen.getId(), userId);
            userViewDtos = userViews.stream().map(uv -> 
                DynamicScreenMetaResponse.UserViewDto.builder()
                        .columnId(uv.getColumn().getId())
                        .fieldKey(uv.getColumn().getFieldKey())
                        .isVisible(uv.getIsVisible())
                        .columnOrder(uv.getColumnOrder())
                        .build()
            ).collect(Collectors.toList());
        }

        // 4. 서브페이지 및 등록 폼 필드
        DynamicScreenMetaResponse.SubPageDto subPageDto = null;
        List<ScreenSubPage> subPages = subPageRepository.findByParentScreenId(screen.getId());
        if (!subPages.isEmpty()) {
            ScreenSubPage sp = subPages.get(0);
            List<ScreenFormField> formFields = formFieldRepository.findBySubPageIdOrderByDisplayOrderAsc(sp.getId());
            List<DynamicScreenMetaResponse.FormFieldDto> formFieldDtos = formFields.stream().map(ff -> 
                DynamicScreenMetaResponse.FormFieldDto.builder()
                        .id(ff.getId())
                        .fieldKey(ff.getFieldKey())
                        .label(ff.getLabel())
                        .fieldType(ff.getFieldType())
                        .isRequired(ff.getIsRequired())
                        .displayOrder(ff.getDisplayOrder())
                        .maxFileCount(ff.getMaxFileCount())
                        .acceptedFileTypes(ff.getAcceptedFileTypes())
                        .relationSource(ff.getRelationSource())
                        .build()
            ).collect(Collectors.toList());

            subPageDto = DynamicScreenMetaResponse.SubPageDto.builder()
                    .id(sp.getId())
                    .pageType(sp.getPageType())
                    .buttonLabel(sp.getButtonLabel())
                    .formFields(formFieldDtos)
                    .build();
        }

        // 5. 연결된 사이드바 메뉴 정보 매핑
        DynamicMenu linkedMenu = menuRepository.findFirstByScreenId(screen.getId()).orElse(null);
        DynamicScreenMetaResponse.LinkedMenuDto menuDto = null;
        if (linkedMenu != null) {
            menuDto = DynamicScreenMetaResponse.LinkedMenuDto.builder()
                    .id(linkedMenu.getId())
                    .menuName(linkedMenu.getMenuName())
                    .menuCode(linkedMenu.getMenuCode())
                    .parentId(linkedMenu.getParent() != null ? linkedMenu.getParent().getId() : null)
                    .icon(linkedMenu.getIcon())
                    .menuOrder(linkedMenu.getMenuOrder())
                    .build();
        }

        return DynamicScreenMetaResponse.builder()
                .screen(screen)
                .searchFields(searchFieldDtos)
                .gridColumns(columnDtos)
                .userViews(userViewDtos)
                .subPage(subPageDto)
                .menu(menuDto)
                .build();
    }

    @Transactional
    public void saveUserViews(Long screenId, Long userId, UserViewUpdateRequest request) {
        if (request == null || request.getSettings() == null || request.getSettings().isEmpty()) {
            return;
        }

        DynamicScreen screen = screenRepository.findById(screenId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 동적 화면 ID: " + screenId));

        // 기존 뷰 조회 후 업데이트 또는 신규 추가
        List<ScreenGridUserView> existingViews = userViewRepository.findByScreenIdAndUserIdOrderByColumnOrderAsc(screenId, userId);
        Map<Long, ScreenGridUserView> viewMap = existingViews.stream()
                .collect(Collectors.toMap(uv -> uv.getColumn().getId(), uv -> uv));

        List<ScreenGridUserView> toSave = new ArrayList<>();
        for (UserViewUpdateRequest.ColumnViewSetting setting : request.getSettings()) {
            ScreenGridUserView view = viewMap.get(setting.getColumnId());
            if (view != null) {
                view.setIsVisible(setting.getIsVisible());
                view.setColumnOrder(setting.getColumnOrder());
                toSave.add(view);
            } else {
                ScreenGridColumn col = gridColumnRepository.findById(setting.getColumnId())
                        .orElse(null);
                if (col != null) {
                    ScreenGridUserView newView = ScreenGridUserView.builder()
                            .screen(screen)
                            .userId(userId)
                            .column(col)
                            .isVisible(setting.getIsVisible())
                            .columnOrder(setting.getColumnOrder())
                            .build();
                    toSave.add(newView);
                }
            }
        }
        userViewRepository.saveAll(toSave);
        log.info("[DYNAMIC SCREEN] Saved {} user view settings for screenId={}, userId={}", toSave.size(), screenId, userId);
    }

    @Transactional
    public DynamicScreen createScreen(ScreenCreateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("화면 생성 요청 정보가 비어있습니다.");
        }

        // 1. 중복 화면 코드 검증
        if (screenRepository.findByScreenCode(request.getScreenCode()).isPresent()) {
            throw new IllegalArgumentException("이미 사용 중인 화면 코드입니다: " + request.getScreenCode());
        }

        // 2. DynamicScreen 생성 및 저장
        DynamicScreen screen = DynamicScreen.builder()
                .screenCode(request.getScreenCode().trim())
                .screenName(request.getScreenName().trim())
                .screenType(request.getScreenType() != null && !request.getScreenType().isBlank() ? request.getScreenType() : "GRID")
                .apiEndpoint(request.getApiEndpoint() != null ? request.getApiEndpoint().trim() : null)
                .targetTable(request.getTargetTable() != null ? request.getTargetTable().trim() : null)
                .description(request.getDescription())
                .enableRowSelection(request.getEnableRowSelection() != null ? request.getEnableRowSelection() : false)
                .rowSelectionMode(request.getRowSelectionMode() != null ? request.getRowSelectionMode() : "MULTI")
                .isActive(true)
                .build();
        screen = screenRepository.save(screen);

        // 3. 컬럼 일괄 매핑 및 저장
        if (request.getColumns() != null && !request.getColumns().isEmpty()) {
            List<ScreenGridColumn> columns = new ArrayList<>();
            int colOrder = 1;
            for (ScreenCreateRequest.GridColumnCreateDto colDto : request.getColumns()) {
                MasterDataSource ds = null;
                if (colDto.getRelationSourceId() != null) {
                    ds = masterDataSourceRepository.findById(colDto.getRelationSourceId()).orElse(null);
                }

                ScreenGridColumn col = ScreenGridColumn.builder()
                        .screen(screen)
                        .fieldKey(colDto.getFieldKey().trim())
                        .label(colDto.getLabel().trim())
                        .fieldType(colDto.getFieldType() != null ? colDto.getFieldType() : "TEXT")
                        .relationSource(ds)
                        .width(colDto.getWidth() != null ? colDto.getWidth() : 150)
                        .sortable(colDto.getSortable() != null ? colDto.getSortable() : true)
                        .editable(colDto.getEditable() != null ? colDto.getEditable() : false)
                        .displayOrder(colDto.getDisplayOrder() != null ? colDto.getDisplayOrder() : colOrder++)
                        .isMeasure(colDto.getIsMeasure() != null ? colDto.getIsMeasure() : false)
                        .isDimension(colDto.getIsDimension() != null ? colDto.getIsDimension() : false)
                        .aggregationType(colDto.getAggregationType())
                        .isPrimaryDate(colDto.getIsPrimaryDate() != null ? colDto.getIsPrimaryDate() : false)
                        .isExcludedFromDashboard(colDto.getIsExcludedFromDashboard() != null ? colDto.getIsExcludedFromDashboard() : false)
                        .build();
                columns.add(col);
            }
            gridColumnRepository.saveAll(columns);
        }

        // 4. 검색 필드 일괄 매핑 및 저장
        if (request.getSearchFieldCatalogIds() != null && !request.getSearchFieldCatalogIds().isEmpty()) {
            List<ScreenSearchField> searchFields = new ArrayList<>();
            int sfOrder = 1;
            for (Long catalogId : request.getSearchFieldCatalogIds()) {
                SearchFieldCatalog catalog = searchFieldCatalogRepository.findById(catalogId).orElse(null);
                if (catalog != null) {
                    ScreenSearchField sf = ScreenSearchField.builder()
                            .screen(screen)
                            .catalog(catalog)
                            .displayOrder(sfOrder++)
                            .build();
                    searchFields.add(sf);
                }
            }
            searchFieldRepository.saveAll(searchFields);
        }

        // 5. 사이드바 메뉴 연동 (DynamicMenu 생성)
        DynamicMenu parentMenu = null;
        if (request.getParentMenuId() != null) {
            parentMenu = menuRepository.findById(request.getParentMenuId()).orElse(null);
        }

        String menuCode = "MENU_" + screen.getScreenCode();
        if (menuRepository.findByMenuCode(menuCode).isPresent()) {
            menuCode = menuCode + "_" + System.currentTimeMillis();
        }

        DynamicMenu menu = DynamicMenu.builder()
                .menuName(screen.getScreenName())
                .menuCode(menuCode)
                .parent(parentMenu)
                .screen(screen)
                .icon(request.getMenuIcon() != null && !request.getMenuIcon().isBlank() ? request.getMenuIcon() : "📋")
                .menuOrder(request.getMenuOrder() != null ? request.getMenuOrder() : 99)
                .isActive(true)
                .build();
        menu = menuRepository.save(menu);

        // 6. 모든 권한(Role)에 기본 뷰 권한 부여, ADMIN에게는 전체 권한 부여
        List<Role> allRoles = roleRepository.findAll();
        List<DynamicMenuPermission> permissions = new ArrayList<>();
        for (Role r : allRoles) {
            boolean isAdmin = "ROLE_ADMIN".equalsIgnoreCase(r.getRoleKey()) 
                    || "ADMIN".equalsIgnoreCase(r.getRoleKey());
            DynamicMenuPermission perm = DynamicMenuPermission.builder()
                    .menu(menu)
                    .role(r)
                    .canView(true)
                    .canCreate(isAdmin)
                    .canEdit(isAdmin)
                    .canDelete(isAdmin)
                    .build();
            permissions.add(perm);
        }
        if (!permissions.isEmpty()) {
            menuPermissionRepository.saveAll(permissions);
        }

        log.info("[DYNAMIC SCREEN] Successfully created screen code={}, id={}, menuCode={}", 
                screen.getScreenCode(), screen.getId(), menu.getMenuCode());

        return screen;
    }

    @Transactional(readOnly = true)
    public List<SearchFieldCatalog> getAllSearchCatalogs() {
        return searchFieldCatalogRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<MasterDataSource> getAllMasterDataSources() {
        return masterDataSourceRepository.findAll();
    }

    @Transactional
    public void deactivateScreen(Long screenId) {
        DynamicScreen screen = screenRepository.findById(screenId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 동적 화면 ID: " + screenId));
        screen.setIsActive(false);
        screenRepository.save(screen);

        List<DynamicMenu> linkedMenus = menuRepository.findByScreenId(screenId);
        for (DynamicMenu m : linkedMenus) {
            m.setIsActive(false);
        }
        if (!linkedMenus.isEmpty()) {
            menuRepository.saveAll(linkedMenus);
        }
        log.info("[DYNAMIC SCREEN] Screen deactivated: screenId={}, deactivatedMenusCount={}", screenId, linkedMenus.size());
    }

    @Transactional
    public DynamicScreen updateScreen(Long screenId, ScreenUpdateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("화면 수정 요청 정보가 비어있습니다.");
        }

        DynamicScreen screen = screenRepository.findById(screenId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 동적 화면 ID: " + screenId));

        // 1. 기본 정보 수정 (화면명, 화면유형, 화면설명만 변경 가능 - 식별자 및 데이터소스 보호)
        if (request.getScreenName() != null && !request.getScreenName().isBlank()) {
            screen.setScreenName(request.getScreenName().trim());
        }
        if (request.getScreenType() != null && !request.getScreenType().isBlank()) {
            screen.setScreenType(request.getScreenType().trim());
        }
        screen.setDescription(request.getDescription());
        if (request.getApiEndpoint() != null && !request.getApiEndpoint().isBlank()) {
            screen.setApiEndpoint(request.getApiEndpoint().trim());
        }
        if (request.getEnableRowSelection() != null) {
            screen.setEnableRowSelection(request.getEnableRowSelection());
        }
        if (request.getRowSelectionMode() != null) {
            screen.setRowSelectionMode(request.getRowSelectionMode());
        }
        screen = screenRepository.save(screen);

        // 2. 그리드 컬럼 수정
        if (request.getColumns() != null && !request.getColumns().isEmpty()) {
            // 외래키 무결성을 위해 기존 사용자 뷰 먼저 삭제 후 기존 컬럼 삭제
            userViewRepository.deleteByScreenId(screen.getId());
            gridColumnRepository.deleteByScreenId(screen.getId());

            List<ScreenGridColumn> columns = new ArrayList<>();
            int colOrder = 1;
            for (ScreenCreateRequest.GridColumnCreateDto colDto : request.getColumns()) {
                MasterDataSource ds = null;
                if (colDto.getRelationSourceId() != null) {
                    ds = masterDataSourceRepository.findById(colDto.getRelationSourceId()).orElse(null);
                }

                ScreenGridColumn col = ScreenGridColumn.builder()
                        .screen(screen)
                        .fieldKey(colDto.getFieldKey().trim())
                        .label(colDto.getLabel().trim())
                        .fieldType(colDto.getFieldType() != null ? colDto.getFieldType() : "TEXT")
                        .relationSource(ds)
                        .width(colDto.getWidth() != null ? colDto.getWidth() : 150)
                        .sortable(colDto.getSortable() != null ? colDto.getSortable() : true)
                        .editable(colDto.getEditable() != null ? colDto.getEditable() : false)
                        .displayOrder(colDto.getDisplayOrder() != null ? colDto.getDisplayOrder() : colOrder++)
                        .isMeasure(colDto.getIsMeasure() != null ? colDto.getIsMeasure() : false)
                        .isDimension(colDto.getIsDimension() != null ? colDto.getIsDimension() : false)
                        .aggregationType(colDto.getAggregationType())
                        .isPrimaryDate(colDto.getIsPrimaryDate() != null ? colDto.getIsPrimaryDate() : false)
                        .isExcludedFromDashboard(colDto.getIsExcludedFromDashboard() != null ? colDto.getIsExcludedFromDashboard() : false)
                        .build();
                columns.add(col);
            }
            gridColumnRepository.saveAll(columns);
        }

        // 3. 검색 필드 수정
        if (request.getSearchFieldCatalogIds() != null) {
            searchFieldRepository.deleteByScreenId(screen.getId());
            List<ScreenSearchField> searchFields = new ArrayList<>();
            int sfOrder = 1;
            for (Long catalogId : request.getSearchFieldCatalogIds()) {
                SearchFieldCatalog catalog = searchFieldCatalogRepository.findById(catalogId).orElse(null);
                if (catalog != null) {
                    ScreenSearchField sf = ScreenSearchField.builder()
                            .screen(screen)
                            .catalog(catalog)
                            .displayOrder(sfOrder++)
                            .build();
                    searchFields.add(sf);
                }
            }
            if (!searchFields.isEmpty()) {
                searchFieldRepository.saveAll(searchFields);
            }
        }

        // 4. 메뉴 배치 정보 수정
        List<DynamicMenu> linkedMenus = menuRepository.findByScreenId(screen.getId());
        if (!linkedMenus.isEmpty()) {
            DynamicMenu menu = linkedMenus.get(0);
            menu.setMenuName(screen.getScreenName());
            if (request.getParentMenuId() != null) {
                DynamicMenu parent = menuRepository.findById(request.getParentMenuId()).orElse(null);
                menu.setParent(parent);
            } else {
                menu.setParent(null);
            }
            if (request.getMenuIcon() != null && !request.getMenuIcon().isBlank()) {
                menu.setIcon(request.getMenuIcon());
            }
            if (request.getMenuOrder() != null) {
                menu.setMenuOrder(request.getMenuOrder());
            }
            menuRepository.save(menu);
        }

        log.info("[DYNAMIC SCREEN] Screen updated successfully: screenId={}, screenCode={}, screenName={}",
                screen.getId(), screen.getScreenCode(), screen.getScreenName());

        return screen;
    }
}

