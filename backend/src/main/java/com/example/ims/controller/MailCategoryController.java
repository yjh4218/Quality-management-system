package com.example.ims.controller;

import com.example.ims.entity.MailCategory;
import com.example.ims.service.MailCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mail-categories")
@RequiredArgsConstructor
public class MailCategoryController {

    private final MailCategoryService service;

    @GetMapping
    public ResponseEntity<List<MailCategory>> getAllCategories() {
        return ResponseEntity.ok(service.getAllCategories());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','QUALITY_TEAM')")
    public ResponseEntity<?> createCategory(@RequestBody MailCategory category) {
        try {
            return ResponseEntity.ok(service.saveCategory(category));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','QUALITY_TEAM')")
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @RequestBody MailCategory category) {
        try {
            category.setId(id);
            return ResponseEntity.ok(service.saveCategory(category));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','QUALITY_TEAM')")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        service.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
