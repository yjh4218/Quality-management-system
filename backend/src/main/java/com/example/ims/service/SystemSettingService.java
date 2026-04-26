package com.example.ims.service;

import com.example.ims.entity.SystemSetting;
import com.example.ims.repository.SystemSettingRepository;
import com.example.ims.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemSettingService {

    private final SystemSettingRepository systemSettingRepository;
    private final EncryptionUtil encryptionUtil;

    // Keys
    public static final String SMTP_HOST = "SMTP_HOST";
    public static final String SMTP_PORT = "SMTP_PORT";
    public static final String SMTP_USERNAME = "SMTP_USERNAME";
    public static final String SMTP_PASSWORD = "SMTP_PASSWORD"; // Sensitive

    public String getSettingValue(String key) {
        return systemSettingRepository.findById(key)
                .map(SystemSetting::getSettingValue)
                .orElse("");
    }

    public String getSmtpPassword() {
        String encrypted = getSettingValue(SMTP_PASSWORD);
        if (encrypted == null || encrypted.isEmpty()) {
            return "";
        }
        return encryptionUtil.decrypt(encrypted);
    }

    @Transactional
    public void saveSetting(String key, String value, String description) {
        try {
            SystemSetting setting = systemSettingRepository.findById(key)
                    .orElse(SystemSetting.builder()
                            .settingKey(key)
                            .settingValue("") // Initialize with empty string
                            .build());
            
            if (SMTP_PASSWORD.equals(key)) {
                // If value is null/empty, clear it
                if (value == null || value.trim().isEmpty()) {
                    setting.setSettingValue("");
                } 
                // If value is masked, DO NOT update (keep existing)
                else if (!"********".equals(value)) {
                    setting.setSettingValue(encryptionUtil.encrypt(value));
                }
            } else {
                // For other settings, just save the value
                setting.setSettingValue(value != null ? value : "");
            }
            
            // Final safety check to ensure NOT NULL constraint is met
            if (setting.getSettingValue() == null) {
                setting.setSettingValue("");
            }
            
            setting.setDescription(description);
            systemSettingRepository.save(setting);
            log.info("[SETTINGS] Saved setting key: {}", key);
        } catch (Exception e) {
            log.error("Error saving setting key [{}]: {}", key, e.getMessage(), e);
            throw new RuntimeException("설정 저장 중 오류가 발생했습니다: " + key, e);
        }
    }

    @Transactional
    public void saveSettings(Map<String, String> settings) {
        settings.forEach((k, v) -> {
            saveSetting(k, v, "Updated via API");
        });
    }

    public Map<String, String> getAllSettings() {
        List<SystemSetting> all = systemSettingRepository.findAll();
        Map<String, String> map = new HashMap<>();
        for (SystemSetting s : all) {
            if (SMTP_PASSWORD.equals(s.getSettingKey())) {
                // Return a dummy value or the decrypted value?
                // Usually we just return asterisks if it exists, but for the UI to know it's set:
                String val = s.getSettingValue();
                map.put(s.getSettingKey(), (val != null && !val.isEmpty()) ? "********" : "");
            } else {
                map.put(s.getSettingKey(), s.getSettingValue());
            }
        }
        return map;
    }
}
