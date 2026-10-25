package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "internal_audits", indexes = {
        @Index(name = "idx_internal_audit_number", columnList = "audit_number", unique = true),
        @Index(name = "idx_internal_audit_status", columnList = "status"),
        @Index(name = "idx_internal_audit_planned_date", columnList = "planned_start_date"),
        @Index(name = "idx_internal_audit_dept", columnList = "auditee_department")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternalAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_number", nullable = false, unique = true, length = 50)
    private String auditNumber;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "audit_type", nullable = false, length = 50)
    private AuditType auditType;

    @Enumerated(EnumType.STRING)
    @Column(name = "audit_scope", nullable = false, length = 50)
    private AuditScope auditScope;

    @Column(name = "criteria", length = 300)
    private String criteria;

    @Column(name = "planned_start_date", nullable = false)
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date", nullable = false)
    private LocalDate plannedEndDate;

    @Column(name = "actual_start_date")
    private LocalDate actualStartDate;

    @Column(name = "actual_end_date")
    private LocalDate actualEndDate;

    @Column(name = "auditee_department", nullable = false, length = 100)
    private String auditeeDepartment;

    @Column(name = "auditee_lead_name", nullable = false, length = 100)
    private String auditeeLeadName;

    @Column(name = "lead_auditor_name", nullable = false, length = 100)
    private String leadAuditorName;

    @Column(name = "lead_auditor_department", nullable = false, length = 100)
    private String leadAuditorDepartment;

    @Column(name = "audit_team_members", length = 300)
    private String auditTeamMembers;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private AuditStatus status = AuditStatus.PLANNED;

    @Column(name = "summary_conclusion", columnDefinition = "TEXT")
    private String summaryConclusion;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_date")
    private LocalDate approvedDate;

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

    @OneToMany(mappedBy = "internalAudit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AuditChecklist> checklists = new ArrayList<>();

    @OneToMany(mappedBy = "internalAudit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AuditFinding> findings = new ArrayList<>();
}
