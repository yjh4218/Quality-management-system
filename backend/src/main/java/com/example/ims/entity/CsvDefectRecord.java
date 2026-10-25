package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "csv_defect_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvDefectRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private CsvValidationProject project;

    @Column(name = "defect_number", nullable = false, length = 50)
    private String defectNumber; // e.g. DEF-2026-001

    @Column(name = "defect_title", nullable = false, length = 255)
    private String defectTitle;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 30)
    private DefectSeverity severity; // CRITICAL, MAJOR, MINOR

    @Column(name = "test_protocol_number", length = 50)
    private String testProtocolNumber; // e.g. VAL-OQ-003

    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;

    @Column(name = "corrective_action", columnDefinition = "TEXT")
    private String correctiveAction;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private DefectStatus status = DefectStatus.OPEN;

    @Column(name = "reported_by", nullable = false, length = 100)
    private String reportedBy;

    @Column(name = "reported_at", nullable = false)
    private LocalDateTime reportedAt;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "risk_acceptance_justification", columnDefinition = "TEXT")
    private String riskAcceptanceJustification; // 잔여위험 수용 정당화 사유 (ACCEPTED_RISK 판정 시 필수)

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
