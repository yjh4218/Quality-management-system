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
@Table(name = "capa_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CapaRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "capa_number", nullable = false, unique = true, length = 50)
    private String capaNumber;

    @Column(nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 50)
    private CapaSourceType sourceType;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "source_number", length = 50)
    private String sourceNumber;

    @Column(name = "source_description", columnDefinition = "TEXT")
    private String sourceDescription;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CapaCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false, length = 30)
    private CapaRiskLevel riskLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CapaStatus status;

    // 문제 설명 및 임시 봉쇄조치 (Containment)
    @Column(name = "problem_description", nullable = false, columnDefinition = "TEXT")
    private String problemDescription;

    @Column(name = "containment_action", columnDefinition = "TEXT")
    private String containmentAction;

    @Column(name = "containment_date")
    private LocalDate containmentDate;

    @Column(name = "containment_responsible", length = 100)
    private String containmentResponsible;

    // 근본원인 분석 (5-Why & Fishbone)
    @Column(name = "root_cause_analysis", columnDefinition = "TEXT")
    private String rootCauseAnalysis;

    @Column(length = 255)
    private String why1;

    @Column(length = 255)
    private String why2;

    @Column(length = 255)
    private String why3;

    @Column(length = 255)
    private String why4;

    @Column(length = 255)
    private String why5;

    @Column(name = "fishbone_man", columnDefinition = "TEXT")
    private String fishboneMan;

    @Column(name = "fishbone_machine", columnDefinition = "TEXT")
    private String fishboneMachine;

    @Column(name = "fishbone_material", columnDefinition = "TEXT")
    private String fishboneMaterial;

    @Column(name = "fishbone_method", columnDefinition = "TEXT")
    private String fishboneMethod;

    @Column(name = "fishbone_measurement", columnDefinition = "TEXT")
    private String fishboneMeasurement;

    @Column(name = "fishbone_environment", columnDefinition = "TEXT")
    private String fishboneEnvironment;

    // 대상 품목 및 LOT (선택적)
    @Column(name = "item_code", length = 100)
    private String itemCode;

    @Column(name = "product_name", length = 200)
    private String productName;

    @Column(name = "lot_number", length = 100)
    private String lotNumber;

    @Column(name = "is_lot_unknown")
    @Builder.Default
    private Boolean isLotUnknown = false;

    // 일정 및 담당자
    @Column(name = "assigned_to", nullable = false, length = 100)
    private String assignedTo;

    @Column(name = "target_completion_date", nullable = false)
    private LocalDate targetCompletionDate;

    @Column(name = "actual_completion_date")
    private LocalDate actualCompletionDate;

    // 효과성 검증 (Effectiveness Review)
    @Column(name = "effectiveness_criteria", columnDefinition = "TEXT")
    private String effectivenessCriteria;

    @Column(name = "effectiveness_target_date")
    private LocalDate effectivenessTargetDate;

    @Column(name = "effectiveness_reviewed_date")
    private LocalDate effectivenessReviewedDate;

    @Column(name = "effectiveness_reviewed_by", length = 100)
    private String effectivenessReviewedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "effectiveness_result", length = 30)
    @Builder.Default
    private EffectivenessResult effectivenessResult = EffectivenessResult.NOT_EVALUATED;

    @Column(name = "effectiveness_evidence", columnDefinition = "TEXT")
    private String effectivenessEvidence;

    @Column(name = "follow_up_action_required")
    @Builder.Default
    private Boolean followUpActionRequired = false;

    // 종결 정보
    @Column(name = "closure_comment", columnDefinition = "TEXT")
    private String closureComment;

    @Column(name = "closed_by", length = 100)
    private String closedBy;

    @Column(name = "closed_date")
    private LocalDate closedDate;

    // 조치과제 목록 연동
    @OneToMany(mappedBy = "capaRecord", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CapaActionItem> actionItems = new ArrayList<>();

    // 감사추적
    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "updated_by", nullable = false, length = 100)
    private String updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    private Long version;

    public void addActionItem(CapaActionItem item) {
        actionItems.add(item);
        item.setCapaRecord(this);
    }

    public void removeActionItem(CapaActionItem item) {
        actionItems.remove(item);
        item.setCapaRecord(null);
    }
}
