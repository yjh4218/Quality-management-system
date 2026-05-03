package com.example.ims.controller;

import com.example.ims.entity.SystemSetting;
import com.example.ims.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/system-settings")
@RequiredArgsConstructor
public class SystemSettingController {

    private final SystemSettingRepository repository;

    @GetMapping("/{key}")
    public org.springframework.http.ResponseEntity<SystemSetting> getSetting(@PathVariable String key) {
        return repository.findById(key)
                .map(org.springframework.http.ResponseEntity::ok)
                .orElseGet(() -> {
                    SystemSetting defaultSetting = new SystemSetting();
                    defaultSetting.setSettingKey(key);
                    if ("AUDIT_GRADE_THRESHOLDS".equals(key)) {
                        defaultSetting.setSettingValue("{\"A\":90,\"B\":80,\"C\":70,\"D\":60}");
                        defaultSetting.setDescription("제조사 Audit 등급 산정 기준 점수");
                    } else {
                        defaultSetting.setSettingValue("{}");
                    }
                    return org.springframework.http.ResponseEntity.ok(defaultSetting);
                });
    }

    @PostMapping
    public SystemSetting saveSetting(@RequestBody SystemSetting setting) {
        return repository.save(setting);
    }
}
