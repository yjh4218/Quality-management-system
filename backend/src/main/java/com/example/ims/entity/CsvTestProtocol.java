package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "csv_test_protocols")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvTestProtocol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private CsvValidationProject project;

    @Column(name = "protocol_number", nullable = false, length = 50)
    private String protocolNumber; // e.g. VAL-IQ-001, VAL-OQ-001, VAL-PQ-001

    @Enumerated(EnumType.STRING)
    @Column(name = "test_phase", nullable = false, length = 20)
    private ValidationTestPhase testPhase; // IQ, OQ, PQ

    @Column(name = "test_title", nullable = false, length = 255)
    private String testTitle;

    @Column(name = "requirement_mapping", length = 200)
    private String requirementMapping; // e.g. URS-SEC-01, 21 CFR §11.10(a), ISO 13485 §4.1.6

    @Column(name = "preconditions", columnDefinition = "TEXT")
    private String preconditions;

    @Column(name = "execution_steps", columnDefinition = "TEXT")
    private String executionSteps;

    @Column(name = "expected_result", columnDefinition = "TEXT")
    private String expectedResult;

    @Column(name = "actual_result", columnDefinition = "TEXT")
    private String actualResult;

    @Enumerated(EnumType.STRING)
    @Column(name = "result_status", nullable = false, length = 30)
    @Builder.Default
    private TestResultStatus resultStatus = TestResultStatus.PENDING;

    @Column(name = "executed_by", length = 100)
    private String executedBy;

    @Column(name = "executed_at")
    private LocalDateTime executedAt;

    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "deviation_notes", columnDefinition = "TEXT")
    private String deviationNotes;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 1;

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
