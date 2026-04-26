package com.example.ims.controller;

import com.example.ims.dto.ProductionAuditDTO;
import com.example.ims.service.ProductionAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 생산감리(Production Audit) 컨트롤러.
 * [보안] 모든 엔드포인트에 역할 기반 접근 제어(RBAC)를 적용합니다.
 */
@RestController
@RequestMapping("/api/production-audits")
@RequiredArgsConstructor
@Slf4j
public class ProductionAuditController {
    private final ProductionAuditService service;

    /**
     * 감리 목록 조회 (모든 역할 허용)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','SALES','MANUFACTURER')")
    public ResponseEntity<List<ProductionAuditDTO>> getAllAudits(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String manufacturerName) {
        return ResponseEntity.ok(service.getAllAudits(userDetails.getUsername(), manufacturerName));
    }

    /**
     * 대기 중인 감리 목록 조회 (모든 역할 허용)
     */
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','SALES','MANUFACTURER')")
    public ResponseEntity<List<ProductionAuditDTO>> getAllPendingAudits(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String manufacturerName) {
        return ResponseEntity.ok(service.getPendingAudits(userDetails.getUsername(), manufacturerName));
    }

    /**
     * 신규 감리 생성 (관리자, 품질팀 권한)
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY')")
    public ResponseEntity<ProductionAuditDTO> createAudit(@RequestBody ProductionAuditDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(service.createAudit(dto, userDetails.getUsername()));
    }

    /**
     * 감리 정보 수정 (관리자, 품질팀 권한)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY')")
    public ResponseEntity<ProductionAuditDTO> updateAudit(@PathVariable Long id, @RequestBody ProductionAuditDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(service.updateAudit(id, dto, userDetails.getUsername()));
    }

    /**
     * 감리 삭제 (관리자, 품질팀 권한)
     * [무결성] 서비스 레이어에서 소프트 딜리트(is_deleted=true)로 처리됩니다.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY')")
    public ResponseEntity<Void> deleteAudit(@PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        service.deleteAudit(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    /**
     * 감리 변경 이력 조회 (모든 역할 허용)
     */
    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','SALES','MANUFACTURER')")
    public ResponseEntity<List<com.example.ims.entity.ProductionAuditHistory>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(service.getHistory(id));
    }

    /**
     * 감리 공개/비공개 토글 (관리자, 품질팀 권한)
     */
    @PatchMapping("/pending/{itemCode}/disclosure")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY')")
    public ResponseEntity<Void> toggleProductDisclosure(
            @PathVariable String itemCode,
            @RequestBody Map<String, Boolean> body) {
        boolean isDisclosed = body.getOrDefault("isDisclosed", false);
        log.info("[CONTROLLER] Toggle Disclosure - ItemCode: {}, isDisclosed: {}", itemCode, isDisclosed);
        service.toggleProductDisclosure(itemCode, isDisclosed);
        return ResponseEntity.ok().build();
    }
}
