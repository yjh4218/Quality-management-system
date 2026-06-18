package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "mail_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String templateCode; // e.g. CLAIM_NOTIFICATION

    @Column(nullable = false)
    private String templateName; // e.g. 클레임 접수 통보

    @Column(nullable = false)
    private String subject; // e.g. [품질관리] 신규 클레임이 접수되었습니다.

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body; // HTML or Text template with placeholders like ${claimNumber}

    @Column(nullable = false)
    private String category; // e.g. CLAIM, PRODUCTION_AUDIT

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Builder.Default
    @Column(nullable = false)
    private Boolean deleted = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
