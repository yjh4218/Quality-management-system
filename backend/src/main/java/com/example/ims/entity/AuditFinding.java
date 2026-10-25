package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_findings", indexes = {
        @Index(name = "idx_audit_finding_number", columnList = "finding_number", unique = true),
        @Index(name = "idx_audit_finding_audit_id", columnList = "internal_audit_id"),
        @Index(name = "idx_audit_finding_classification", columnList = "classification"),
        @Index(name = "idx_audit_finding_status", columnList = "status"),
        @Index(name = "idx_audit_finding_capa", columnList = "capa_number")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditFinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "finding_number", nullable = false, unique = true, length = 50)
    private String findingNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "internal_audit_id", nullable = false)
    @JsonIgnore
    private InternalAudit internalAudit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audit_checklist_id")
    @JsonIgnore
    private AuditChecklist auditChecklist;

    @Column(name = "clause_number", nullable = false, length = 100)
    private String clauseNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "classification", nullable = false, length = 50)
    private FindingClassification classification;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private FindingStatus status = FindingStatus.OPEN;

    @Column(name = "finding_details", nullable = false, columnDefinition = "TEXT")
    private String findingDetails;

    @Column(name = "requirement_criteria", columnDefinition = "TEXT")
    private String requirementCriteria;

    @Column(name = "auditee_action_plan", columnDefinition = "TEXT")
    private String auditeeActionPlan;

    @Column(name = "action_due_date")
    private LocalDate actionDueDate;

    @Column(name = "action_completed_date")
    private LocalDate actionCompletedDate;

    @Column(name = "capa_number", length = 50)
    private String capaNumber;

    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    @Column(name = "verified_date")
    private LocalDate verifiedDate;

    @Column(name = "verification_notes", columnDefinition = "TEXT")
    private String verificationNotes;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 50)
    private String createdBy;

    @Column(name = "last_modified_by", length = 50)
    private String lastModifiedBy;
}
