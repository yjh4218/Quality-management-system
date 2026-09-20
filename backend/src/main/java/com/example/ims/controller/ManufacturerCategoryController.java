package com.example.ims.controller;

import com.example.ims.entity.ManufacturerCategory;
import com.example.ims.repository.ManufacturerCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/manufacturer-categories")
@RequiredArgsConstructor
public class ManufacturerCategoryController {

    private final ManufacturerCategoryRepository repository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @org.springframework.cache.annotation.Cacheable(value = "mfrCategories", key = "'all'")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<ManufacturerCategory> getAll() {
        return repository.findByActiveTrueOrderByNameAsc();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    @org.springframework.cache.annotation.CacheEvict(value = "mfrCategories", allEntries = true)
    @org.springframework.transaction.annotation.Transactional
    public ManufacturerCategory create(@jakarta.validation.Valid @RequestBody ManufacturerCategory category) {
        return repository.save(category);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    @org.springframework.cache.annotation.CacheEvict(value = "mfrCategories", allEntries = true)
    @org.springframework.transaction.annotation.Transactional
    public ManufacturerCategory update(@PathVariable Long id, @jakarta.validation.Valid @RequestBody ManufacturerCategory category) {
        ManufacturerCategory existing = repository.findById(id).orElseThrow();
        existing.setName(category.getName());
        existing.setActive(category.isActive());
        return repository.save(existing);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    @org.springframework.cache.annotation.CacheEvict(value = "mfrCategories", allEntries = true)
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> delete(@PathVariable Long id) {
        ManufacturerCategory existing = repository.findById(id).orElseThrow();
        existing.setActive(false);
        repository.save(existing);
        return ResponseEntity.ok().build();
    }
}
