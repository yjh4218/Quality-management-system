package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 전체공지사항(System-wide Announcement) JPA 엔티티.
 * [디자인 표준] Soft Delete를 사용하며, 전문적인 일련번호 체계(ANC-YYYYMMDD-000)를 가집니다.
 */
@Entity
@Table(name = "announcements")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "announcement_number", unique = true, nullable = false)
    private String announcementNumber;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "target_roles", columnDefinition = "TEXT")
    private String targetRoles; // 콤마 구분된 roleKey 목록 (예: "ROLE_QUALITY,ROLE_MANUFACTURER")

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", insertable = false, updatable = false)
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    private AnnouncementCategory category;

    @Column(name = "category_id")
    private Long categoryId;

    @Builder.Default
    @Column(name = "target_type", nullable = false)
    private String targetType = "ALL"; // 'ALL', 'CATEGORY', 'MANUFACTURER'

    @Column(name = "target_category")
    private String targetCategory;

    @Column(name = "target_manufacturer")
    private String targetManufacturer;

    @Column(name = "target_departments", columnDefinition = "TEXT")
    private String targetDepartments;

    @Builder.Default
    @Column(name = "email_sent")
    private boolean emailSent = false;

    @Column(name = "email_sent_at")
    private LocalDateTime emailSentAt;

    @Column(name = "created_by_username", nullable = false)
    private String createdByUsername;

    @Column(name = "created_by_name")
    private String createdByName;

    @Builder.Default
    @Column(name = "is_deleted")
    private boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
