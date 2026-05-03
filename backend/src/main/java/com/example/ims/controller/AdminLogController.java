package com.example.ims.controller;

import com.example.ims.entity.AuditLog;
import com.example.ims.service.AuditLogService;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/admin/logs")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class AdminLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MENU_LOGS_VIEW')")
    public ResponseEntity<org.springframework.data.domain.Page<AuditLog>> getAllLogs(
            @org.springframework.web.bind.annotation.RequestParam(required = false) String entityType,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String search,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String startDate,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String endDate,
            org.springframework.data.domain.Pageable pageable) {
        log.info("[DEBUG] Accessing Global Audit Logs. Params: entityType={}, search={}", entityType, search);
        return ResponseEntity.ok(auditLogService.searchLogs(entityType, search, startDate, endDate, pageable));
    }

    @org.springframework.web.bind.annotation.PostMapping("/{logId}/restore")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MENU_LOGS_EDIT')")
    public ResponseEntity<Void> restoreFromLog(@org.springframework.web.bind.annotation.PathVariable Long logId, @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        auditLogService.restoreFromLog(logId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }
}
