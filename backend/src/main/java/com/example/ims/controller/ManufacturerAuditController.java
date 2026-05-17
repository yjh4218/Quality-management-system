package com.example.ims.controller;

import com.example.ims.entity.ManufacturerAudit;
import com.example.ims.service.ManufacturerAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/manufacturer-audits")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class ManufacturerAuditController {

    private final ManufacturerAuditService auditService;
    private final com.example.ims.service.FileStorageService fileStorageService;

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAudits', 'VIEW')")
    public ResponseEntity<List<ManufacturerAudit>> searchAudits(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String manufacturerName,
            @RequestParam(required = false) String manufacturerCode,
            @RequestParam(required = false) String grade) {
        return ResponseEntity.ok(auditService.searchAudits(startDate, endDate, manufacturerName, manufacturerCode, grade));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAudits', 'EDIT')")
    public ResponseEntity<ManufacturerAudit> createAudit(@RequestBody ManufacturerAudit audit, Authentication authentication) {
        if (authentication != null) {
            audit.setModifierInfo(authentication.getName());
        }
        return ResponseEntity.ok(auditService.saveAudit(audit));
    }


    @PostMapping("/upload-photo")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAudits', 'EDIT')")
    public ResponseEntity<String> uploadPhoto(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }
        // 3MB limit as requested
        if (file.getSize() > 3 * 1024 * 1024) {
            return ResponseEntity.badRequest().body("파일 크기는 3MB를 초과할 수 없습니다.");
        }

        String fileName = fileStorageService.storeFile(file, "audit_photo_" + System.currentTimeMillis());
        return ResponseEntity.ok("/uploads/" + fileName);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAudits', 'EDIT')")
    public ResponseEntity<ManufacturerAudit> updateAudit(@PathVariable Long id, @RequestBody ManufacturerAudit audit, Authentication authentication) {
        if (authentication != null) {
            audit.setModifierInfo(authentication.getName());
        }
        audit.setId(id);
        return ResponseEntity.ok(auditService.saveAudit(audit));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAudits', 'DELETE')")
    public ResponseEntity<Void> deleteAudit(@PathVariable Long id) {
        auditService.deleteAudit(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAudits', 'VIEW')")
    public ResponseEntity<?> getAuditHistory(@PathVariable Long id) {
        return ResponseEntity.ok(auditService.getAuditHistory(id));
    }

    /**
     * [고도화 12] Audit 결과를 PDF로 내보냅니다.
     */
    /*
    @GetMapping("/{id}/export/pdf")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAudits', 'VIEW')")
    public ResponseEntity<?> exportPdf(@PathVariable Long id) {
        try {
            log.info("[EXPORT] Generating Audit PDF for ID: {}", id);
            byte[] pdf = auditService.generateAuditPdf(id);
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Audit_Report_" + id + ".pdf")
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .body(pdf);
        } catch (Exception e) {
            log.error("[EXPORT] PDF Export failed for audit {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", "PDF 생성 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }
    */

    /**
     * [고도화 12] Audit 결과를 Excel로 내보냅니다.
     */
    @GetMapping("/{id}/export/excel")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAudits', 'VIEW')")
    public ResponseEntity<?> exportExcel(@PathVariable Long id) {
        try {
            log.info("[EXPORT] Generating Audit Excel for ID: {}", id);
            byte[] excel = auditService.generateAuditExcel(id);
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Audit_Report_" + id + ".xlsx")
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excel);
        } catch (Exception e) {
            log.error("[EXPORT] Excel Export failed for audit {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", "Excel 생성 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @GetMapping("/export/excel")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM') or @perm.can('manufacturerAudits', 'VIEW')")
    public ResponseEntity<?> exportAuditsExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String manufacturerName,
            @RequestParam(required = false) String manufacturerCode,
            @RequestParam(required = false) String grade,
            Authentication authentication) {
        try {
            String username = authentication != null ? authentication.getName() : "anonymous";
            log.info("[EXPORT] Generating Bulk Audit Excel for user: {}", username);
            byte[] excel = auditService.exportAuditsExcel(startDate, endDate, manufacturerName, manufacturerCode, grade, username);
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Manufacturer_Audits_" + LocalDate.now() + ".xlsx")
                    .contentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excel);
        } catch (Exception e) {
            log.error("[EXPORT] Bulk Excel Export failed: {}", e.getMessage(), e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", "Excel 생성 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }
}
