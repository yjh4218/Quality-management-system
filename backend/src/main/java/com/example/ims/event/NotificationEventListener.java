package com.example.ims.event;

import com.example.ims.repository.NotificationSettingRepository;
import com.example.ims.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationSettingRepository notificationSettingRepository;
    private final NotificationService notificationService;

    @Async // 비동기 백그라운드 스레드에서 실행하여 성능 지연 및 트랜잭션 충돌 방지
    @EventListener
    public void handleNotificationEvent(NotificationEvent event) {
        log.info(">>>> [NOTIFICATION EVENT DETECTED] Type: {}, Domain: {}, Action: {}, Title: {}", 
            event.getEventType(), event.getSourceDomain(), event.getSourceAction(), event.getTitle());

        java.util.List<com.example.ims.entity.NotificationSetting> matchedSettings = new java.util.ArrayList<>();

        // 1. eventType으로 직접 조회 시도
        if (event.getEventType() != null && !event.getEventType().trim().isEmpty()) {
            notificationSettingRepository.findByEventType(event.getEventType().trim())
                .ifPresent(matchedSettings::add);
        }

        // 2. eventType으로 지정하지 않았거나 찾지 못한 경우, sourceDomain 으로 조회하여 매칭하는 모든 것 필터링
        if (matchedSettings.isEmpty() && event.getSourceDomain() != null && !event.getSourceDomain().trim().isEmpty()) {
            String domain = event.getSourceDomain().trim();
            String action = event.getSourceAction() != null ? event.getSourceAction().trim() : "CREATE";
            
            java.util.List<com.example.ims.entity.NotificationSetting> domainSettings = notificationSettingRepository.findBySourceDomain(domain);
            for (com.example.ims.entity.NotificationSetting setting : domainSettings) {
                // 만약 DB의 sourceAction이 null이거나 비어있거나, 혹은 발행된 event의 action과 일치하면 매칭 성공
                if (setting.getSourceAction() == null || setting.getSourceAction().trim().isEmpty() || setting.getSourceAction().trim().equalsIgnoreCase(action)) {
                    matchedSettings.add(setting);
                }
            }
        }

        if (matchedSettings.isEmpty()) {
            log.warn("No NotificationSetting found for eventType: {} or sourceDomain: {}", event.getEventType(), event.getSourceDomain());
            return;
        }

        for (com.example.ims.entity.NotificationSetting setting : matchedSettings) {
            String targetRolesStr = setting.getTargetRoles();
            if (targetRolesStr != null && !targetRolesStr.trim().isEmpty()) {
                String[] roles = targetRolesStr.split(",");
                for (String role : roles) {
                    String cleanRole = role.trim();
                    if (!cleanRole.isEmpty()) {
                        try {
                            notificationService.createNotification(
                                event.getTitle(),
                                event.getMessage(),
                                event.getCategory() != null ? event.getCategory() : "GENERAL",
                                null,
                                cleanRole,
                                "ROLE_MANUFACTURER".equals(cleanRole) ? event.getCompanyName() : null,
                                event.getLinkUrl()
                            );
                            log.info(">>>> [NOTIFICATION EVENT SENT] Sent to role: {} via setting: {}", cleanRole, setting.getEventType());
                        } catch (Exception e) {
                            log.error("Failed to send event notification for role {} using setting {}: {}", cleanRole, setting.getEventType(), e.getMessage(), e);
                        }
                    }
                }
            }
        }
    }
}
