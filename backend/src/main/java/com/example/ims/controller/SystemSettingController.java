package com.example.ims.controller;

import com.example.ims.entity.SystemSetting;
import com.example.ims.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/system-settings")
@RequiredArgsConstructor
public class SystemSettingController {

    private final SystemSettingService service;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> getAllSettings() {
        return ResponseEntity.ok(service.getAllSettings());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> saveSettings(@RequestBody Map<String, String> settings) {
        service.saveSettings(settings);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{key}")
    public ResponseEntity<SystemSetting> getSetting(@PathVariable String key) {
        SystemSetting setting = SystemSetting.builder()
                .settingKey(key)
                .settingValue(service.getSettingValue(key))
                .build();
        return ResponseEntity.ok(setting);
    }

    @PostMapping("/{key}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'GRID_SYSTEM_LEGEND_MANAGE')")
    public ResponseEntity<Void> saveSettingByKey(@PathVariable String key, @RequestBody Map<String, String> body) {
        String value = body != null ? body.get("value") : "";
        service.saveSetting(key, value != null ? value : "", "Updated via Grid Legend/Settings API");
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{key}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'GRID_SYSTEM_LEGEND_MANAGE')")
    public ResponseEntity<Void> deleteSettingByKey(@PathVariable String key) {
        service.deleteSetting(key);
        return ResponseEntity.ok().build();
    }
}
