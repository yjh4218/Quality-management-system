package com.example.ims.controller;

import com.example.ims.entity.Manufacturer;
import com.example.ims.service.ManufacturerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/manufacturers")
@RequiredArgsConstructor
public class ManufacturerController {

    private final ManufacturerService manufacturerService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Manufacturer>> getAll(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(manufacturerService.getAll(userDetails.getUsername()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'RESPONSIBLE_SALES')")
    public ResponseEntity<Manufacturer> create(@RequestBody Manufacturer manufacturer,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(manufacturerService.save(manufacturer, userDetails.getUsername()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'RESPONSIBLE_SALES')")
    public ResponseEntity<Manufacturer> update(@PathVariable Long id, @RequestBody Manufacturer manufacturer,
            @AuthenticationPrincipal UserDetails userDetails) {
        manufacturer.setId(id);
        return ResponseEntity.ok(manufacturerService.save(manufacturer, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        manufacturerService.delete(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> restore(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        manufacturerService.restore(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> hardDelete(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        manufacturerService.hardDelete(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }
}
