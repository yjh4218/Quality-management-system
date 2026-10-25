package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 🔄 변경요청서 (Change Request) 마스터 엔티티
 * ISO 13485:2016 §7.3.9 / ISO 22716:2007 §11 / 21 CFR 820.70
 */
@Entity
@Table(name = "change_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    @Column(name = "change_number", nullable = false, unique = true, length = 50)
    private String changeNumber; // CR-yyyyMM-xxx

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private ChangeCategory category = ChangeCategory.PRODUCT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ChangeUrgency urgency = ChangeUrgency.STANDARD;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private ChangeStatus status = ChangeStatus.DRAFT;

    @Column(name = "target_item_name", length = 200)
    private String targetItemName;

    @Column(name = "item_code", length = 100)
    private String itemCode;

    @Column(name = "initiator_name", nullable = false, length = 100)
    private String initiatorName;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(name = "request_date", nullable = false)
    private LocalDate requestDate;

    @Column(name = "target_completion_date")
    private LocalDate targetCompletionDate;

    @Column(name = "actual_completion_date")
    private LocalDate actualCompletionDate;

    @Column(name = "change_reason", nullable = false, columnDefinition = "TEXT")
    private String changeReason;

    @Column(name = "current_state", nullable = false, columnDefinition = "TEXT")
    private String currentState;

    @Column(name = "proposed_change", nullable = false, columnDefinition = "TEXT")
    private String proposedChange;

    // -------------------------------------------------------------------------
    // 영향평가 (Change Impact Assessment)
    // -------------------------------------------------------------------------
    @Column(name = "regulatory_impact")
    @Builder.Default
    private Boolean regulatoryImpact = false;

    @Column(name = "regulatory_details", columnDefinition = "TEXT")
    private String regulatoryDetails;

    @Column(name = "quality_safety_impact")
    @Builder.Default
    private Boolean qualitySafetyImpact = false;

    @Column(name = "quality_details", columnDefinition = "TEXT")
    private String qualityDetails;

    @Column(name = "validation_required")
    @Builder.Default
    private Boolean validationRequired = false;

    @Column(name = "validation_details", columnDefinition = "TEXT")
    private String validationDetails;

    // -------------------------------------------------------------------------
    // 양방향 추적성 연계 (Cross-Module Traceability)
    // -------------------------------------------------------------------------
    @Column(name = "risk_assessment_id")
    private Long riskAssessmentId;

    @Column(name = "risk_assessment_code", length = 50)
    private String riskAssessmentCode;

    @Column(name = "dms_document_id")
    private Long dmsDocumentId;

    @Column(name = "dms_document_number", length = 50)
    private String dmsDocumentNumber;

    @Column(name = "design_project_id")
    private Long designProjectId;

    @Column(name = "design_project_code", length = 50)
    private String designProjectCode;

    // -------------------------------------------------------------------------
    // CCB(Change Control Board) 심의 및 결정
    // -------------------------------------------------------------------------
    @Column(name = "ccb_review_date")
    private LocalDate ccbReviewDate;

    @Column(name = "ccb_attendees", length = 255)
    private String ccbAttendees;

    @Column(name = "ccb_summary", columnDefinition = "TEXT")
    private String ccbSummary;

    @Enumerated(EnumType.STRING)
    @Column(name = "ccb_decision", length = 30)
    private CcbDecision ccbDecision;

    @Column(name = "ccb_conditions", columnDefinition = "TEXT")
    private String ccbConditions;

    // -------------------------------------------------------------------------
    // 효과성 검증 (Effectiveness Check)
    // -------------------------------------------------------------------------
    @Column(name = "effectiveness_required")
    @Builder.Default
    private Boolean effectivenessRequired = true;

    @Column(name = "effectiveness_due_date")
    private LocalDate effectivenessDueDate;

    @Column(name = "effectiveness_eval_date")
    private LocalDate effectivenessEvalDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "effectiveness_status", length = 30)
    @Builder.Default
    private EffectivenessStatus effectivenessStatus = EffectivenessStatus.PENDING;

    @Column(name = "effectiveness_summary", columnDefinition = "TEXT")
    private String effectivenessSummary;

    @Column(name = "evaluator_name", length = 100)
    private String evaluatorName;

    // -------------------------------------------------------------------------
    // 실행 조치항목 연관관계
    // -------------------------------------------------------------------------
    @OneToMany(mappedBy = "changeRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("actionOrder ASC")
    @Builder.Default
    private List<ChangeActionItem> actionItems = new ArrayList<>();

    // -------------------------------------------------------------------------
    // 감사추적 및 소프트 삭제
    // -------------------------------------------------------------------------
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;
}
