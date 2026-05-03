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
    public List<ManufacturerCategory> getAll() {
        return repository.findByActiveTrueOrderByNameAsc();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    public ManufacturerCategory create(@RequestBody ManufacturerCategory category) {
        return repository.save(category);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    public ManufacturerCategory update(@PathVariable Long id, @RequestBody ManufacturerCategory category) {
        ManufacturerCategory existing = repository.findById(id).orElseThrow();
        existing.setName(category.getName());
        existing.setActive(category.isActive());
        return repository.save(existing);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        ManufacturerCategory existing = repository.findById(id).orElseThrow();
        existing.setActive(false);
        repository.save(existing);
        return ResponseEntity.ok().build();
    }
}
