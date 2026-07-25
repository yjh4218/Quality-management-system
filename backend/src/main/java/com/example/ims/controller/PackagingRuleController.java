package com.example.ims.controller;

import com.example.ims.entity.ChannelPackagingRule;
import com.example.ims.service.MasterDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/master-data/rules")
@RequiredArgsConstructor
public class PackagingRuleController {

    private final MasterDataService masterDataService;

    @GetMapping
    public ResponseEntity<List<ChannelPackagingRule>> getAllRules() {
        return ResponseEntity.ok(masterDataService.getAllRules());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<ChannelPackagingRule> saveRule(
            @RequestBody ChannelPackagingRule rule,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "system";
        return ResponseEntity.ok(masterDataService.saveRule(rule, username));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        masterDataService.deleteRule(id);
        return ResponseEntity.ok().build();
    }
}
