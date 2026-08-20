package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import jakarta.persistence.EntityListeners;

import java.time.LocalDateTime;

/**
 * QMS 통합 알림(Notification) JPA 엔티티.
 * [디자인 표준] Soft Delete를 사용하며, 전문적인 일련번호 체계(NTF-YYYYMMDD-000)를 가집니다.
 */
@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "notification_number", unique = true, nullable = false)
    private String notificationNumber;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(nullable = false)
    private String type; // 'CLAIM', 'PRODUCTION_AUDIT', 'USER_APPROVAL', 'ANNOUNCEMENT'

    @Column(name = "target_username")
    private String targetUsername;

    @Column(name = "target_role")
    private String targetRole;

    @Column(name = "target_company_name")
    private String targetCompanyName;

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "link_url")
    private String linkUrl;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
