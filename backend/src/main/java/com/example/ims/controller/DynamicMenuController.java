package com.example.ims.controller;

import com.example.ims.dto.dynamic.DynamicMenuBatchReorderDto;
import com.example.ims.dto.dynamic.DynamicMenuRequest;
import com.example.ims.dto.dynamic.DynamicMenuResponse;
import com.example.ims.dto.dynamic.ScreenMenuMappingResponse;
import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import com.example.ims.service.DynamicMenuService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/dynamic/menus")
@RequiredArgsConstructor
@Slf4j
public class DynamicMenuController {

    private final DynamicMenuService menuService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            return userRepository.findByUsername(auth.getName()).orElse(null);
        }
        return null;
    }

    @GetMapping("/my-menus")
    public ResponseEntity<List<DynamicMenuResponse>> getMyMenus() {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(menuService.getMyMenus(user));
    }

    @GetMapping("/tree")
    public ResponseEntity<List<DynamicMenuResponse>> getAllMenusTree() {
        return ResponseEntity.ok(menuService.getAllMenusTree());
    }

    @PostMapping
    public ResponseEntity<DynamicMenuResponse> createMenu(@RequestBody DynamicMenuRequest req) {
        log.info("[DYNAMIC MENU] Creating menu: {}", req.getMenuName());
        return ResponseEntity.ok(menuService.createMenu(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DynamicMenuResponse> updateMenu(@PathVariable Long id, @RequestBody DynamicMenuRequest req) {
        log.info("[DYNAMIC MENU] Updating menu ID: {}, name: {}", id, req.getMenuName());
        return ResponseEntity.ok(menuService.updateMenu(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMenu(@PathVariable Long id) {
        log.info("[DYNAMIC MENU] Deleting menu ID: {}", id);
        menuService.deleteMenu(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/screens")
    public ResponseEntity<List<ScreenMenuMappingResponse>> getScreenMenuMappings() {
        return ResponseEntity.ok(menuService.getScreenMenuMappings());
    }

    @PutMapping("/screens/{screenId}/link")
    public ResponseEntity<ScreenMenuMappingResponse> linkScreenToMenu(
            @PathVariable Long screenId,
            @RequestBody DynamicMenuRequest req) {
        log.info("[DYNAMIC MENU] Linking screen ID: {} to parent menu ID: {}", screenId, req.getParentId());
        return ResponseEntity.ok(menuService.linkScreenToMenu(screenId, req));
    }

    @PutMapping("/batch-reorder")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<Void> batchReorderMenus(@RequestBody List<DynamicMenuBatchReorderDto> items) {
        log.info("[DYNAMIC MENU] Batch reordering {} items", items != null ? items.size() : 0);
        menuService.batchReorderMenus(items);
        return ResponseEntity.ok().build();
    }
}

