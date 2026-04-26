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
                "신규 브랜드 등록: " + saved.getName(), null, saved);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        Brand brand = brandRepository.findById(id).orElse(null);
        if (brand != null) {
            String oldJson = auditLogService.toCompactJson(brand);
            brandRepository.deleteById(id);
            auditLogService.logEntityChange("BRAND", id, "DELETE", userDetails.getUsername(), "브랜드 삭제: " + brand.getName(),
                    oldJson, null);
        }
        return ResponseEntity.ok().build();
    }
}
