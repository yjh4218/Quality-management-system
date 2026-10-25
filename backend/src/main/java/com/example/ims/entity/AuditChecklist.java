package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_checklists", indexes = {
        @Index(name = "idx_checklist_audit_id", columnList = "internal_audit_id"),
        @Index(name = "idx_checklist_result", columnList = "result")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditChecklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "internal_audit_id", nullable = false)
    @JsonIgnore
    private InternalAudit internalAudit;

    @Column(name = "clause_number", nullable = false, length = 100)
    private String clauseNumber;

    @Column(name = "checkpoint", nullable = false, columnDefinition = "TEXT")
    private String checkpoint;

    @Column(name = "audit_method", length = 100)
    private String auditMethod;

    @Column(name = "evidence_notes", columnDefinition = "TEXT")
    private String evidenceNotes;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 50)
    @Builder.Default
    private ChecklistResult result = ChecklistResult.CONFORMING;

    @Column(name = "audited_by", length = 100)
    private String auditedBy;

    @Column(name = "audited_date")
    private LocalDate auditedDate;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

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
