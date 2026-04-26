package com.example.ims.controller;

import com.example.ims.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SystemSettingController {

    private final SystemSettingService systemSettingService;

    // Only Admins can access System Settings
    @PreAuthorize("hasAuthority('users:edit') or hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<Map<String, String>> getAllSettings() {
        return ResponseEntity.ok(systemSettingService.getAllSettings());
    }

    @PreAuthorize("hasAuthority('users:edit') or hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<?> saveSettings(@RequestBody Map<String, String> settings) {
        systemSettingService.saveSettings(settings);
        return ResponseEntity.ok("설정이 성공적으로 저장되었습니다.");
    }
}
