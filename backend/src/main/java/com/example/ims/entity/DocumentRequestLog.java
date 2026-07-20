package com.example.ims.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 제조사 메일 발송 건별 추적 및 파일 제출 연동 로그 (DocumentRequestLog) 엔티티.
 */
@Entity
@Table(name = "document_request_logs")
public class DocumentRequestLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requirement_id", nullable = false)
    private Long requirementId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requirement_id", insertable = false, updatable = false)
    private DocumentRequirement requirement;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "upload_token", nullable = false, unique = true)
    private String uploadToken;

    @Column(name = "token_expires_at", nullable = false)
    private LocalDateTime tokenExpiresAt;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    @Column(name = "uploaded_file_url", length = 1000)
    private String uploadedFileUrl;

    @Column(name = "email_sent_to", nullable = false)
    private String emailSentTo;

    @Column(name = "reminder_count", nullable = false)
    private Integer reminderCount = 0;

    public DocumentRequestLog() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getRequirementId() { return requirementId; }
    public void setRequirementId(Long requirementId) { this.requirementId = requirementId; }
    public DocumentRequirement getRequirement() { return requirement; }
    public void setRequirement(DocumentRequirement requirement) { this.requirement = requirement; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }
    public String getUploadToken() { return uploadToken; }
    public void setUploadToken(String uploadToken) { this.uploadToken = uploadToken; }
    public LocalDateTime getTokenExpiresAt() { return tokenExpiresAt; }
    public void setTokenExpiresAt(LocalDateTime tokenExpiresAt) { this.tokenExpiresAt = tokenExpiresAt; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
    public String getUploadedFileUrl() { return uploadedFileUrl; }
    public void setUploadedFileUrl(String uploadedFileUrl) { this.uploadedFileUrl = uploadedFileUrl; }
    public String getEmailSentTo() { return emailSentTo; }
    public void setEmailSentTo(String emailSentTo) { this.emailSentTo = emailSentTo; }
    public Integer getReminderCount() { return reminderCount; }
    public void setReminderCount(Integer reminderCount) { this.reminderCount = reminderCount; }

    // Builder
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long requirementId;
        private LocalDateTime requestedAt;
        private String uploadToken;
        private LocalDateTime tokenExpiresAt;
        private LocalDateTime uploadedAt;
        private String uploadedFileUrl;
        private String emailSentTo;
        private Integer reminderCount = 0;

        public Builder requirementId(Long v) { this.requirementId = v; return this; }
        public Builder requestedAt(LocalDateTime v) { this.requestedAt = v; return this; }
        public Builder uploadToken(String v) { this.uploadToken = v; return this; }
        public Builder tokenExpiresAt(LocalDateTime v) { this.tokenExpiresAt = v; return this; }
        public Builder uploadedAt(LocalDateTime v) { this.uploadedAt = v; return this; }
        public Builder uploadedFileUrl(String v) { this.uploadedFileUrl = v; return this; }
        public Builder emailSentTo(String v) { this.emailSentTo = v; return this; }
        public Builder reminderCount(Integer v) { this.reminderCount = v; return this; }

        public DocumentRequestLog build() {
            DocumentRequestLog e = new DocumentRequestLog();
            e.requirementId = this.requirementId;
            e.requestedAt = this.requestedAt;
            e.uploadToken = this.uploadToken;
            e.tokenExpiresAt = this.tokenExpiresAt;
            e.uploadedAt = this.uploadedAt;
            e.uploadedFileUrl = this.uploadedFileUrl;
            e.emailSentTo = this.emailSentTo;
            e.reminderCount = this.reminderCount;
            return e;
        }
    }
}
