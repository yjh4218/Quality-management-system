package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "csv_go_live_approvals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvGoLiveApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false, unique = true)
    private CsvValidationProject project;

    @Column(name = "release_version", nullable = false, length = 50)
    private String releaseVersion; // e.g. v1.0.0-PROD

    @Column(name = "approval_title", nullable = false, length = 255)
    private String approvalTitle;

    // 1. 시스템 관리자/개발 책임자 (System Owner)
    @Column(name = "system_owner_name", nullable = false, length = 100)
    private String systemOwnerName;

    @Column(name = "system_owner_signed_at")
    private LocalDateTime systemOwnerSignedAt;

    @Column(name = "system_owner_signature_number", length = 50)
    private String systemOwnerSignatureNumber;

    // 2. 품질관리 책임자 (Quality Authority / QA Director)
    @Column(name = "qa_lead_name", nullable = false, length = 100)
    private String qaLeadName;

    @Column(name = "qa_lead_signed_at")
    private LocalDateTime qaLeadSignedAt;

    @Column(name = "qa_lead_signature_number", length = 50)
    private String qaLeadSignatureNumber;

    // 3. 최고경영자 / 총괄책임자 (Executive Sponsor / CEO)
    @Column(name = "executive_name", nullable = false, length = 100)
    private String executiveName;

    @Column(name = "executive_signed_at")
    private LocalDateTime executiveSignedAt;

    @Column(name = "executive_signature_number", length = 50)
    private String executiveSignatureNumber;

    @Column(name = "final_approval_status", nullable = false, length = 30)
    @Builder.Default
    private String finalApprovalStatus = "APPROVED"; // PENDING, APPROVED, REJECTED

    @Column(name = "go_live_date", nullable = false)
    private LocalDate goLiveDate;

    @Column(name = "contingency_plan", columnDefinition = "TEXT")
    private String contingencyPlan; // 비상 복구 및 롤백 계획

    @Column(name = "authorized_notes", columnDefinition = "TEXT")
    private String authorizedNotes; // 최종 릴리즈 승인 결언

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
