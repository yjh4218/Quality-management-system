package com.example.ims.controller;

import com.example.ims.entity.MailCategory;
import com.example.ims.service.MailCategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mail-categories")
public class MailCategoryController {

    @Autowired
    private MailCategoryService service;

    @GetMapping
    public ResponseEntity<List<MailCategory>> getAllCategories() {
        return ResponseEntity.ok(service.getAllCategories());
    }

    @PostMapping
    public ResponseEntity<?> createCategory(@RequestBody MailCategory category) {
        try {
            return ResponseEntity.ok(service.saveCategory(category));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @RequestBody MailCategory category) {
        try {
            category.setId(id);
            return ResponseEntity.ok(service.saveCategory(category));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        service.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
