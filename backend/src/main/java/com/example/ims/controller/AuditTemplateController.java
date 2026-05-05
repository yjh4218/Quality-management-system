package com.example.ims.controller;

import com.example.ims.entity.AuditTemplate;
import com.example.ims.service.ManufacturerAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/audit-templates")
@RequiredArgsConstructor
public class AuditTemplateController {

    private final ManufacturerAuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAuditItems', 'VIEW')")
    public ResponseEntity<List<AuditTemplate>> getAllTemplates() {
        return ResponseEntity.ok(auditService.getAllTemplates());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAuditItems', 'VIEW')")
    public ResponseEntity<AuditTemplate> getTemplateById(@PathVariable Long id) {
        return ResponseEntity.ok(auditService.getTemplateById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAuditItems', 'EDIT')")
    public ResponseEntity<AuditTemplate> saveTemplate(@RequestBody AuditTemplate template) {
        return ResponseEntity.ok(auditService.saveTemplate(template));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAuditItems', 'DELETE')")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        auditService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
