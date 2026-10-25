package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 고객 불만 및 시판 후 이상사례 안전성 평가 마스터 엔티티
 * ISO 13485:2016 §8.2.2 / ISO 22716:2007 §10 / 21 CFR 820.198
 * Defect Resolution: D-9 해소 (LOT 미상 접수 허용)
 */
@Entity
@Table(name = "complaint_safety_evaluations", indexes = {
    @Index(name = "idx_cse_eval_number", columnList = "evaluationNumber"),
    @Index(name = "idx_cse_claim_id", columnList = "claimId"),
    @Index(name = "idx_cse_product_type", columnList = "productType"),
    @Index(name = "idx_cse_item_code", columnList = "itemCode"),
    @Index(name = "idx_cse_lot_number", columnList = "lotNumber"),
    @Index(name = "idx_cse_is_lot_unknown", columnList = "isLotUnknown"),
    @Index(name = "idx_cse_is_serious", columnList = "isSerious"),
    @Index(name = "idx_cse_causality_grade", columnList = "causalityGrade"),
    @Index(name = "idx_cse_reportability", columnList = "reportabilityStatus"),
    @Index(name = "idx_cse_status", columnList = "evaluationStatus")
})
@org.hibernate.annotations.SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class ComplaintSafetyEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    @Column(name = "evaluation_number", nullable = false, unique = true, length = 50)
    private String evaluationNumber; // SAFE-yyyyMM-001

    @Column(name = "claim_id")
    private Long claimId;

    @Column(name = "claim_number", length = 50)
    private String claimNumber;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_type", nullable = false, length = 50)
    @Builder.Default
    private ProductRegulatoryType productType = ProductRegulatoryType.COSMETIC;

    @Column(name = "item_code", nullable = false, length = 100)
    private String itemCode;

    @Column(name = "product_name", nullable = false, length = 255)
    private String productName;

    @Column(name = "lot_number", length = 100)
    private String lotNumber; // D-9: nullable 허용

    @Column(name = "is_lot_unknown", nullable = false)
    @Builder.Default
    private Boolean isLotUnknown = false;

    @Column(length = 150)
    private String manufacturer;

    @Column(name = "receipt_date", nullable = false)
    private LocalDate receiptDate;

    @Column(name = "evaluator_name", nullable = false, length = 100)
    private String evaluatorName;

    @Column(name = "evaluation_date", nullable = false)
    private LocalDate evaluationDate;

    // 환자/고객 정보
    @Column(name = "customer_name", length = 100)
    private String customerName;

    @Column(name = "customer_contact", length = 100)
    private String customerContact;

    @Column(name = "patient_age")
    private Integer patientAge;

    @Column(name = "patient_gender", length = 20)
    @Builder.Default
    private String patientGender = "UNKNOWN"; // MALE, FEMALE, UNKNOWN

    // 이상사례 증상 및 진료 내역
    @Enumerated(EnumType.STRING)
    @Column(name = "adverse_event_category", nullable = false, length = 100)
    private AdverseEventCategory adverseEventCategory;

    @Column(name = "symptom_description", nullable = false, columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String symptomDescription;

    @Column(name = "onset_days")
    @Builder.Default
    private Integer onsetDays = 0;

    @Column(name = "medical_treatment_given", nullable = false)
    @Builder.Default
    private Boolean medicalTreatmentGiven = false;

    @Column(name = "treatment_details", columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String treatmentDetails;

    // 중대성 판정
    @Column(name = "is_serious", nullable = false)
    @Builder.Default
    private Boolean isSerious = false;

    @Column(name = "serious_reason", length = 255)
    private String seriousReason;

    // 인과관계 평가 (WHO-UMC)
    @Enumerated(EnumType.STRING)
    @Column(name = "causality_grade", nullable = false, length = 50)
    @Builder.Default
    private CausalityGrade causalityGrade = CausalityGrade.EVALUATING;

    @Column(name = "causality_rationale", columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String causalityRationale;

    // 규제기관 보고 판정 (식약처 / FDA MDR)
    @Enumerated(EnumType.STRING)
    @Column(name = "reportability_status", nullable = false, length = 50)
    @Builder.Default
    private ReportabilityStatus reportabilityStatus = ReportabilityStatus.NOT_REPORTABLE;

    @Column(name = "report_deadline")
    private LocalDate reportDeadline; // 중대사례 인지 후 15일

    @Column(name = "authority_report_date")
    private LocalDate authorityReportDate;

    @Column(name = "authority_report_number", length = 100)
    private String authorityReportNumber;

    @Column(name = "authority_feedback", columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String authorityFeedback;

    // 원인조사 (21 CFR 820.198(b))
    @Column(name = "investigation_required", nullable = false)
    @Builder.Default
    private Boolean investigationRequired = true;

    @Column(name = "no_investigation_reason", columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String noInvestigationReason;

    @Column(name = "investigation_summary", columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String investigationSummary;

    // 16단계 CAPA 연계
    @Column(name = "capa_required", nullable = false)
    @Builder.Default
    private Boolean capaRequired = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "capa_status", nullable = false, length = 50)
    @Builder.Default
    private CapaLinkageStatus capaStatus = CapaLinkageStatus.NOT_REQUIRED;

    @Column(name = "capa_number", length = 50)
    private String capaNumber;

    @Column(name = "capa_rationale", columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String capaRationale;

    // 수명주기 상태
    @Enumerated(EnumType.STRING)
    @Column(name = "evaluation_status", nullable = false, length = 50)
    @Builder.Default
    private ComplaintEvaluationStatus evaluationStatus = ComplaintEvaluationStatus.SUBMITTED;

    @Column(name = "closed_by", length = 100)
    private String closedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "closure_remarks", columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String closureRemarks;

    // 액션 아이템 연관관계
    @OneToMany(mappedBy = "evaluation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ComplaintActionItem> actionItems = new ArrayList<>();

    // 감사추적 메타데이터
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false, length = 100)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void addActionItem(ComplaintActionItem item) {
        actionItems.add(item);
        item.setEvaluation(this);
    }

    public void removeActionItem(ComplaintActionItem item) {
        actionItems.remove(item);
        item.setEvaluation(null);
    }
}
