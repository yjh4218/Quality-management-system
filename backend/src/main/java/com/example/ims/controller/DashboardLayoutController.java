package com.example.ims.controller;

import com.example.ims.entity.DashboardLayout;
import com.example.ims.repository.DashboardLayoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard-layouts")
@RequiredArgsConstructor
public class DashboardLayoutController {

    private final DashboardLayoutRepository dashboardLayoutRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<DashboardLayout> getAllLayouts() {
        return dashboardLayoutRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardLayout> createLayout(@RequestBody DashboardLayout layout) {
        return ResponseEntity.ok(dashboardLayoutRepository.save(layout));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardLayout> updateLayout(@PathVariable Long id, @RequestBody DashboardLayout details) {
        DashboardLayout layout = dashboardLayoutRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Layout not found"));
        
        layout.setName(details.getName());
        layout.setWidgetConfig(details.getWidgetConfig());
        return ResponseEntity.ok(dashboardLayoutRepository.save(layout));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteLayout(@PathVariable Long id) {
        dashboardLayoutRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
