package com.example.ims.controller;

import com.example.ims.entity.SalesChannel;
import com.example.ims.service.SalesChannelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/master-data/sales-channels")
@RequiredArgsConstructor
public class SalesChannelController {

    private final SalesChannelService service;

    @GetMapping
    public ResponseEntity<List<SalesChannel>> getAllChannels() {
        return ResponseEntity.ok(service.getAllChannels());
    }

    @GetMapping("/active")
    public ResponseEntity<List<SalesChannel>> getActiveChannels() {
        return ResponseEntity.ok(service.getActiveChannels());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM')")
    public ResponseEntity<SalesChannel> saveChannel(@RequestBody SalesChannel channel, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(service.saveChannel(channel, userDetails.getUsername()));
    }

    @PostMapping("/{id}/toggle")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY_TEAM')")
    public ResponseEntity<Void> toggleActive(@PathVariable Long id) {
        service.toggleActive(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteChannel(@PathVariable Long id) {
        service.deleteChannel(id);
        return ResponseEntity.ok().build();
    }
}
