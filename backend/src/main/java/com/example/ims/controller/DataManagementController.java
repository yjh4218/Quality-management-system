package com.example.ims.controller;

import com.example.ims.dto.TrashItemDto;
import com.example.ims.service.DataManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/trash")
@RequiredArgsConstructor
@Slf4j
public class DataManagementController {

    private final DataManagementService dataManagementService;

    @GetMapping
    @PreAuthorize("@perm.can('trashBin', 'VIEW') or hasRole(T(com.example.ims.config.RoleConstants).ADMIN_NAME)")
    public ResponseEntity<List<TrashItemDto>> getTrashItems() {
        return ResponseEntity.ok(dataManagementService.getTrashItems());
    }

    @PostMapping("/{type}/{id}/restore")
    @PreAuthorize("@perm.can('trashBin', 'EDIT') or hasRole(T(com.example.ims.config.RoleConstants).ADMIN_NAME)")
    @org.springframework.cache.annotation.CacheEvict(value = {"dashboard", "dashboard_stats"}, allEntries = true)
    public ResponseEntity<?> restoreItem(@PathVariable String type, @PathVariable Long id) {
        try {
            dataManagementService.restoreItem(type, id);
            return ResponseEntity.ok(Map.of("message", "항목이 성공적으로 복구되었습니다."));
        } catch (Exception e) {
            log.error("[TRASH] Restoration failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{type}/{id}")
    @PreAuthorize("@perm.can('trashBin', 'DELETE') or hasRole(T(com.example.ims.config.RoleConstants).ADMIN_NAME)")
    @org.springframework.cache.annotation.CacheEvict(value = {"dashboard", "dashboard_stats"}, allEntries = true)
    public ResponseEntity<?> hardDelete(@PathVariable String type, @PathVariable Long id, java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body(Map.of("error", "인증이 필요합니다."));
        }
        try {
            dataManagementService.hardDelete(type, id, principal.getName());
            return ResponseEntity.ok(Map.of("message", "항목이 영구적으로 삭제되었습니다."));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            log.warn("[TRASH] Hard delete data integrity conflict: {}", e.getMessage());
            return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT)
                    .body(Map.of("error", "DataIntegrityViolation", "message", e.getMessage() != null ? e.getMessage() : "참조 무결성 제약조건에 위배되어 영구 삭제할 수 없습니다."));
        } catch (IllegalArgumentException e) {
            log.warn("[TRASH] Hard delete bad argument: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "BadRequest", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("[TRASH] Hard delete failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
