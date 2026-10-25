package com.example.ims.controller;

import com.example.ims.dto.ControlledDocumentMetricsResponse;
import com.example.ims.dto.ControlledDocumentRequest;
import com.example.ims.dto.ControlledDocumentRevisionRequest;
import com.example.ims.dto.ControlledDocumentStatusRequest;
import com.example.ims.entity.ControlledDocStatus;
import com.example.ims.entity.ControlledDocType;
import com.example.ims.entity.ControlledDocument;
import com.example.ims.entity.ProductFamily;
import com.example.ims.service.ControlledDocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 📂 통제문서 및 개정관리(DMS) REST 컨트롤러.
 * RBAC 기반 세부 권한 제어(@PreAuthorize) 및 규제 표준 가이드라인 연동.
 */
@RestController
@RequestMapping("/api/controlled-documents")
@RequiredArgsConstructor
public class ControlledDocumentController {

    private final ControlledDocumentService service;

    @GetMapping
    @PreAuthorize("@perm.can('controlledDocuments', 'VIEW')")
    public ResponseEntity<Page<ControlledDocument>> getDocuments(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) ControlledDocType docType,
            @RequestParam(required = false) ControlledDocStatus status,
            @RequestParam(required = false) ProductFamily targetFamily,
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(service.getDocuments(keyword, docType, status, targetFamily, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@perm.can('controlledDocuments', 'VIEW')")
    public ResponseEntity<ControlledDocument> getDocumentById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getDocumentById(id));
    }

    @GetMapping("/history/{docNo}")
    @PreAuthorize("@perm.can('controlledDocuments', 'VIEW')")
    public ResponseEntity<List<ControlledDocument>> getRevisionHistory(@PathVariable String docNo) {
        return ResponseEntity.ok(service.getDocumentRevisionHistory(docNo));
    }

    @GetMapping("/metrics")
    @PreAuthorize("@perm.can('controlledDocuments', 'VIEW')")
    public ResponseEntity<ControlledDocumentMetricsResponse> getMetrics() {
        return ResponseEntity.ok(service.getMetrics());
    }

    @PostMapping
    @PreAuthorize("@perm.can('controlledDocuments', 'CREATE')")
    public ResponseEntity<ControlledDocument> createDocument(
            @Valid @RequestBody ControlledDocumentRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "SYSTEM";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createDocument(request, username));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.can('controlledDocuments', 'EDIT')")
    public ResponseEntity<ControlledDocument> updateDocument(
            @PathVariable Long id,
            @Valid @RequestBody ControlledDocumentRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "SYSTEM";
        return ResponseEntity.ok(service.updateDocument(id, request, username));
    }

    @PostMapping("/{id}/revision")
    @PreAuthorize("@perm.can('controlledDocuments', 'CREATE')")
    public ResponseEntity<ControlledDocument> createRevision(
            @PathVariable Long id,
            @Valid @RequestBody ControlledDocumentRevisionRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "SYSTEM";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createRevision(id, request, username));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("@perm.can('controlledDocuments', 'EDIT')")
    public ResponseEntity<ControlledDocument> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody ControlledDocumentStatusRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "SYSTEM";
        return ResponseEntity.ok(service.changeStatus(id, request.getStatus(), request.getReason(), username));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.can('controlledDocuments', 'DELETE')")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "SYSTEM";
        service.softDeleteDocument(id, username);
        return ResponseEntity.noContent().build();
    }
}
