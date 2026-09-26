package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Duration;
import java.time.LocalDateTime;

@Entity
@Table(name = "mail_dispatch_histories", indexes = {
    @Index(name = "idx_mail_hist_domain_source", columnList = "domain, sourceId, is_deleted"),
    @Index(name = "idx_mail_hist_manufacturer", columnList = "manufacturer, is_deleted"),
    @Index(name = "idx_mail_hist_status", columnList = "status, is_deleted"),
    @Index(name = "idx_mail_hist_sent_at", columnList = "sentAt")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@org.hibernate.annotations.SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
public class MailDispatchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String domain; // CLAIM, PRODUCTION_AUDIT, COA, GENERAL

    @Column(nullable = false)
    private Long sourceId;

    @Column(length = 100)
    private String sourceNumber; // e.g. CLM-2026..., Item code, etc.

    @Column(length = 100)
    private String templateCode;

    @Column(length = 255)
    private String templateName;

    @Column(length = 255)
    private String manufacturer;

    @Column(nullable = false, length = 500)
    private String recipientEmail;

    @Column(nullable = false, length = 500)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(length = 100)
    private String sentBy;

    @Column(nullable = false)
    private LocalDateTime sentAt;

    @Builder.Default
    @Column(length = 50)
    private String dispatchType = "MANUAL"; // MANUAL, AUTO_REMINDER, MANUAL_REMINDER

    @Builder.Default
    private Integer reminderCount = 0;

    @Builder.Default
    @Column(length = 50)
    private String status = "PENDING"; // PENDING, REPLIED, OVERDUE

    private LocalDateTime repliedAt;

    private Double leadTimeHours;

    @Column(columnDefinition = "TEXT")
    private String replyRemarks;

    @Builder.Default
    @Column(name = "is_deleted", columnDefinition = "boolean default false")
    private Boolean isDeleted = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public void markAsReplied(LocalDateTime replyTime, String remarks) {
        this.repliedAt = replyTime != null ? replyTime : LocalDateTime.now();
        this.status = "REPLIED";
        if (remarks != null && !remarks.trim().isEmpty()) {
            this.replyRemarks = remarks;
        }
        if (this.sentAt != null && this.repliedAt != null) {
            long minutes = Duration.between(this.sentAt, this.repliedAt).toMinutes();
            this.leadTimeHours = Math.round((minutes / 60.0) * 10.0) / 10.0;
        }
    }
}
