package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 🏭 공급업체 정기 종합평가 엔티티 (Supplier Evaluation)
 * 가중치 평가: 품질(40) + 납기(25) + 규제/서류(20) + 서비스/협력(15) = 100점 만점
 */
@Entity
@Table(name = "supplier_evaluations", indexes = {
    @Index(name = "idx_sup_eval_qual", columnList = "qualification_id"),
    @Index(name = "idx_sup_eval_year_period", columnList = "evaluation_year, evaluation_period"),
    @Index(name = "idx_sup_eval_grade", columnList = "evaluation_grade"),
    @Index(name = "idx_sup_eval_deleted", columnList = "is_deleted")
})
@SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"qualification"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@EntityListeners(AuditingEntityListener.class)
public class SupplierEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "qualification_id", nullable = false)
    private SupplierQualification qualification;

    @Column(name = "evaluation_year", nullable = false)
    private Integer evaluationYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "evaluation_period", nullable = false, length = 20)
    @Builder.Default
    private EvaluationPeriod evaluationPeriod = EvaluationPeriod.ANNUAL;

    // 평가 세부 점수
    @Builder.Default
    @Column(name = "quality_score", nullable = false)
    private Integer qualityScore = 0; // 0 ~ 40점

    @Builder.Default
    @Column(name = "delivery_score", nullable = false)
    private Integer deliveryScore = 0; // 0 ~ 25점

    @Builder.Default
    @Column(name = "compliance_score", nullable = false)
    private Integer complianceScore = 0; // 0 ~ 20점

    @Builder.Default
    @Column(name = "service_score", nullable = false)
    private Integer serviceScore = 0; // 0 ~ 15점

    @Builder.Default
    @Column(name = "total_score", nullable = false)
    private Integer totalScore = 0; // 0 ~ 100점

    @Enumerated(EnumType.STRING)
    @Column(name = "evaluation_grade", nullable = false, length = 20)
    @Builder.Default
    private SupplierGrade evaluationGrade = SupplierGrade.GRADE_B;

    @Column(name = "evaluation_date", nullable = false)
    private LocalDate evaluationDate;

    @Column(name = "evaluator_name", nullable = false, length = 100)
    private String evaluatorName;

    @Column(name = "evaluator_department", length = 100)
    private String evaluatorDepartment;

    @Column(name = "evaluation_summary", columnDefinition = "TEXT")
    private String evaluationSummary;

    @Builder.Default
    @Column(name = "corrective_action_required")
    private Boolean correctiveActionRequired = false;

    @Column(name = "action_details", columnDefinition = "TEXT")
    private String actionDetails;

    @Column(name = "capa_id")
    private Long capaId;

    // 감사추적 및 소프트 딜리트
    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean deleted = false;

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

    public void calculateTotalAndGrade() {
        int q = qualityScore != null ? qualityScore : 0;
        int d = deliveryScore != null ? deliveryScore : 0;
        int c = complianceScore != null ? complianceScore : 0;
        int s = serviceScore != null ? serviceScore : 0;
        this.totalScore = q + d + c + s;
        this.evaluationGrade = SupplierGrade.calculateGrade(this.totalScore);
    }

    public boolean isDeleted() {
        return deleted != null && deleted;
    }

    public void setIsDeleted(boolean val) {
        this.deleted = val;
    }
}
