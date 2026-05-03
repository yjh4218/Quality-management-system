package com.example.ims.controller;

import com.example.ims.entity.ManufacturerAudit;
import com.example.ims.service.ManufacturerAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/manufacturer-audits")
@RequiredArgsConstructor
public class ManufacturerAuditController {

    private final ManufacturerAuditService auditService;
    private final com.example.ims.service.FileStorageService fileStorageService;

    @GetMapping("/search")
    public ResponseEntity<List<ManufacturerAudit>> searchAudits(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String manufacturerName) {
        return ResponseEntity.ok(auditService.searchAudits(startDate, endDate, manufacturerName));
    }

    @PostMapping
    public ResponseEntity<ManufacturerAudit> createAudit(@RequestBody ManufacturerAudit audit, Authentication authentication) {
        if (authentication != null) {
            audit.setModifierInfo(authentication.getName());
        }
        return ResponseEntity.ok(auditService.saveAudit(audit));
    }


    @PostMapping("/upload-photo")
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
    public ResponseEntity<ManufacturerAudit> updateAudit(@PathVariable Long id, @RequestBody ManufacturerAudit audit, Authentication authentication) {
        if (authentication != null) {
            audit.setModifierInfo(authentication.getName());
        }
        audit.setId(id);
        return ResponseEntity.ok(auditService.saveAudit(audit));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAudit(@PathVariable Long id) {
        auditService.deleteAudit(id);
        return ResponseEntity.noContent().build();
    }
}
