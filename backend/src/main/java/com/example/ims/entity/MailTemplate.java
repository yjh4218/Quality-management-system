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
    @jakarta.validation.constraints.NotBlank(message = "템플릿 코드는 필수입니다.")
    private String templateCode; // e.g. CLAIM_NOTIFICATION

    @Column(nullable = false)
    @jakarta.validation.constraints.NotBlank(message = "템플릿 이름은 필수입니다.")
    private String templateName; // e.g. 클레임 접수 통보

    @Column(nullable = false)
    @jakarta.validation.constraints.NotBlank(message = "메일 제목은 필수입니다.")
    private String subject; // e.g. [품질관리] 신규 클레임이 접수되었습니다.

    @Column(columnDefinition = "TEXT", nullable = false)
    @jakarta.validation.constraints.NotBlank(message = "메일 본문은 필수입니다.")
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
