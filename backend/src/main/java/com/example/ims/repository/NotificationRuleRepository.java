package com.example.ims.repository;

import com.example.ims.entity.NotificationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRuleRepository extends JpaRepository<NotificationRule, Long> {
    List<NotificationRule> findByIsActiveTrue();
    List<NotificationRule> findByEventTypeAndIsActiveTrue(String eventType);
}
