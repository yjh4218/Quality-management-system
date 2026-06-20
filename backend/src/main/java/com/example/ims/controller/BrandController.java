package com.example.ims.controller;

import com.example.ims.entity.Brand;
import com.example.ims.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/brands")
@RequiredArgsConstructor
public class BrandController {
    private final BrandRepository brandRepository;
    private final com.example.ims.service.AuditLogService auditLogService;

    @GetMapping
    public List<Brand> getAll() {
        return brandRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Brand> create(@RequestBody Brand brand, @AuthenticationPrincipal UserDetails userDetails) {
        Brand saved = brandRepository.save(brand);
        auditLogService.logEntityChange("BRAND", saved.getId(), "CREATE", userDetails.getUsername(),
                null, userDetails.getUsername(), null, null,
                "신규 브랜드 등록: " + saved.getName(), null, saved);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Brand> update(@PathVariable Long id, @RequestBody Brand brandDetails, @AuthenticationPrincipal UserDetails userDetails) {
        Brand brand = brandRepository.findById(id).orElse(null);
        if (brand == null) {
            return ResponseEntity.notFound().build();
        }
        String oldJson = auditLogService.toCompactJson(brand);
        
        brand.setName(brandDetails.getName());
        brand.setType(brandDetails.getType());
        
        Brand updated = brandRepository.save(brand);
        auditLogService.logEntityChange("BRAND", updated.getId(), "UPDATE", userDetails.getUsername(),
                null, userDetails.getUsername(), null, null,
                "브랜드 정보 수정: " + updated.getName(), oldJson, updated);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        Brand brand = brandRepository.findById(id).orElse(null);
        if (brand != null) {
            String oldJson = auditLogService.toCompactJson(brand);
            brandRepository.deleteById(id);
            auditLogService.logEntityChange("BRAND", id, "DELETE", userDetails.getUsername(), 
                    null, userDetails.getUsername(), null, null,
                    "브랜드 삭제: " + brand.getName(), oldJson, null);
        }
        return ResponseEntity.ok().build();
    }
}
