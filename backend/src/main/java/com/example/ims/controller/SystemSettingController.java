package com.example.ims.controller;

import com.example.ims.entity.SystemSetting;
import com.example.ims.service.EmailSender;
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
    private final EmailSender emailSender;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> getAllSettings() {
        return ResponseEntity.ok(service.getAllSettings());
    }

    @PostMapping("/test-email")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> testEmail(@RequestBody Map<String, String> body) {
        String targetEmail = body != null ? body.get("targetEmail") : null;
        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "수신자 이메일 주소를 입력해 주세요."));
        }
        try {
            if (!emailSender.isConfigured()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "SMTP 또는 메일 발송 서버가 설정되어 있지 않습니다."));
            }
            String testSubject = "[QMS] 메일 발송 연동 테스트 안내";
            String testBody = "<h3>QMS 메일 발송 연동 성공 안내</h3>"
                    + "<p>안녕하세요. 본 메일은 QMS 시스템 설정에서 메일 발송(SMTP/Resend) 연동이 정상적으로 작동하는지 확인하기 위한 테스트 메일입니다.</p>"
                    + "<ul>"
                    + "<li><strong>발송 시각:</strong> " + java.time.LocalDateTime.now() + "</li>"
                    + "<li><strong>수신 대상:</strong> " + targetEmail + "</li>"
                    + "<li><strong>발송 엔진:</strong> " + emailSender.getClass().getSimpleName() + "</li>"
                    + "</ul>"
                    + "<p>정상적으로 수신되셨다면 시스템에서 실제 클레임 및 알림 메일이 안전하게 전송됩니다.</p>";

            emailSender.send(targetEmail.trim(), testSubject, testBody);
            return ResponseEntity.ok(Map.of("success", true, "message", "테스트 메일이 성공적으로 발송되었습니다: " + targetEmail));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "메일 발송 실패: " + e.getMessage()));
        }
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
