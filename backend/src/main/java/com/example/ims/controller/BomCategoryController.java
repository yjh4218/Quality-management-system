package com.example.ims.controller;

import com.example.ims.entity.BomCategory;
import com.example.ims.service.BomCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/bom-categories")
@RequiredArgsConstructor
public class BomCategoryController {

    private final BomCategoryService service;

    @GetMapping("/active")
    public ResponseEntity<List<BomCategory>> getActiveCategories() {
        return ResponseEntity.ok(service.getAllActiveCategories());
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BomCategory>> getAllCategories() {
        return ResponseEntity.ok(service.getAllCategories());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BomCategory> saveCategory(
            @RequestBody BomCategory category,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(service.saveCategory(category, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}/soft")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> softDelete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        service.softDelete(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> hardDelete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        service.hardDelete(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }
}
