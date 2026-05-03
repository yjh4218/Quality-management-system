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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TrashItemDto>> getTrashItems() {
        return ResponseEntity.ok(dataManagementService.getTrashItems());
    }

    @PostMapping("/{type}/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
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
    @PreAuthorize("hasRole('ADMIN')")
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public ResponseEntity<?> hardDelete(@PathVariable String type, @PathVariable Long id, java.security.Principal principal) {
        try {
            dataManagementService.hardDelete(type, id, principal.getName());
            return ResponseEntity.ok(Map.of("message", "항목이 영구적으로 삭제되었습니다."));
        } catch (Exception e) {
            log.error("[TRASH] Hard delete failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
