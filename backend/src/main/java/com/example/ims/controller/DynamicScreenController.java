package com.example.ims.controller;

import com.example.ims.config.RoleConstants;
import com.example.ims.dto.dynamic.DynamicScreenMetaResponse;
import com.example.ims.dto.dynamic.ScreenCreateRequest;
import com.example.ims.dto.dynamic.ScreenUpdateRequest;
import com.example.ims.dto.dynamic.UserViewUpdateRequest;
import com.example.ims.entity.DynamicScreen;
import com.example.ims.entity.MasterDataSource;
import com.example.ims.entity.SearchFieldCatalog;
import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import com.example.ims.service.DynamicScreenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dynamic/screens")
@RequiredArgsConstructor
@Slf4j
public class DynamicScreenController {

    private final DynamicScreenService screenService;
    private final UserRepository userRepository;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            return userRepository.findByUsername(auth.getName())
                    .map(User::getId)
                    .orElse(null);
        }
        return null;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DynamicScreen>> getAllActiveScreens() {
        return ResponseEntity.ok(screenService.getAllActiveScreens());
    }

    @GetMapping("/{id}/meta")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DynamicScreenMetaResponse> getScreenMeta(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(screenService.getScreenMeta(id, userId));
    }

    @GetMapping("/by-code/{code}/meta")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DynamicScreenMetaResponse> getScreenMetaByCode(@PathVariable String code) {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(screenService.getScreenMetaByCode(code, userId));
    }

    @PutMapping("/{id}/user-views")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> saveUserViews(@PathVariable Long id, @RequestBody UserViewUpdateRequest request) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        screenService.saveUserViews(id, userId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping
    @PreAuthorize("hasAuthority(T(com.example.ims.config.RoleConstants).ADMIN) or hasRole(T(com.example.ims.config.RoleConstants).ADMIN_NAME)")
    public ResponseEntity<DynamicScreen> createScreen(@Valid @RequestBody ScreenCreateRequest request) {
        log.info("[DYNAMIC SCREEN] Request to create screen code={}, name={}", request.getScreenCode(), request.getScreenName());
        DynamicScreen created = screenService.createScreen(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority(T(com.example.ims.config.RoleConstants).ADMIN) or hasRole(T(com.example.ims.config.RoleConstants).ADMIN_NAME)")
    public ResponseEntity<DynamicScreen> updateScreen(@PathVariable Long id, @Valid @RequestBody ScreenUpdateRequest request) {
        log.info("[DYNAMIC SCREEN] Request to update screen id={}, name={}", id, request.getScreenName());
        DynamicScreen updated = screenService.updateScreen(id, request);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/catalogs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SearchFieldCatalog>> getSearchFieldCatalogs() {
        return ResponseEntity.ok(screenService.getAllSearchCatalogs());
    }

    @GetMapping("/data-sources")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MasterDataSource>> getMasterDataSources() {
        return ResponseEntity.ok(screenService.getAllMasterDataSources());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority(T(com.example.ims.config.RoleConstants).ADMIN) or hasRole(T(com.example.ims.config.RoleConstants).ADMIN_NAME)")
    public ResponseEntity<Void> deleteScreen(@PathVariable Long id) {
        log.info("[DYNAMIC SCREEN] Request to deactivate screen id={}", id);
        screenService.deactivateScreen(id);
        return ResponseEntity.noContent().build();
    }
}

