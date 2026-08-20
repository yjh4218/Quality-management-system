package com.example.ims.repository;

import com.example.ims.entity.NotificationSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface NotificationSettingRepository extends JpaRepository<NotificationSetting, Long> {
    Optional<NotificationSetting> findByEventType(String eventType);
    boolean existsByEventType(String eventType);
    java.util.List<NotificationSetting> findBySourceDomain(String sourceDomain);
    java.util.List<NotificationSetting> findBySourceDomainAndSourceAction(String sourceDomain, String sourceAction);
}
