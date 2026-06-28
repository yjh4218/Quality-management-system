package com.example.ims.controller;

import com.example.ims.dto.ApiResponse;
import com.example.ims.entity.NotificationSetting;
import com.example.ims.repository.NotificationSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications/settings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_RESPONSIBLE_SALES')")
public class NotificationSettingController {

    private final NotificationSettingRepository notificationSettingRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationSetting>>> getAllSettings() {
        List<NotificationSetting> settings = notificationSettingRepository.findAll();
        return ResponseEntity.ok(ApiResponse.success(settings));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<NotificationSetting>> createSetting(@RequestBody NotificationSetting setting) {
        if (notificationSettingRepository.existsByEventType(setting.getEventType())) {
            throw new RuntimeException("이미 존재하는 이벤트 코드입니다.");
        }
        if (setting.getSourceAction() == null || setting.getSourceAction().trim().isEmpty()) {
            setting.setSourceAction("CREATE");
        }
        NotificationSetting saved = notificationSettingRepository.save(setting);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<NotificationSetting>> updateSetting(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        
        NotificationSetting setting = notificationSettingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("알림 설정을 찾을 수 없습니다."));

        if (payload.containsKey("displayName")) {
            setting.setDisplayName(payload.get("displayName"));
        }
        if (payload.containsKey("description")) {
            setting.setDescription(payload.get("description"));
        }
        if (payload.containsKey("targetRoles")) {
            setting.setTargetRoles(payload.get("targetRoles"));
        }
        if (payload.containsKey("sourceDomain")) {
            setting.setSourceDomain(payload.get("sourceDomain"));
        }
        if (payload.containsKey("sourceAction")) {
            String action = payload.get("sourceAction");
            setting.setSourceAction(action != null && !action.trim().isEmpty() ? action : "CREATE");
        }
        
        NotificationSetting saved = notificationSettingRepository.save(setting);
        return ResponseEntity.ok(ApiResponse.success(saved));
    }
}
