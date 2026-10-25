package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * ISO 14971:2019 위해요인-위해상황-피해 3계층 모델 및 FMEA 통제 조치/잔여위험 평가 항목 엔티티
 */
@Entity
@Table(name = "risk_hazard_items", indexes = {
        @Index(name = "idx_rhi_assessment_id", columnList = "assessment_id"),
        @Index(name = "idx_rhi_item_no", columnList = "itemNo"),
        @Index(name = "idx_rhi_category", columnList = "category"),
        @Index(name = "idx_rhi_init_accept", columnList = "initialAcceptability"),
        @Index(name = "idx_rhi_res_accept", columnList = "residualAcceptability"),
        @Index(name = "idx_rhi_ctrl_status", columnList = "controlStatus"),
        @Index(name = "idx_rhi_deleted", columnList = "isDeleted")
})
@org.hibernate.annotations.SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
@Getter
@Setter
@ToString(exclude = "assessment")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@EntityListeners(AuditingEntityListener.class)
public class RiskHazardItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    @JsonBackReference
    private RiskAssessment assessment;

    /**
     * 위해요인 항목 번호 (e.g. HAZ-001)
     */
    @Column(name = "item_no", nullable = false, length = 50)
    @NotBlank(message = "항목번호는 필수입니다.")
    @Size(max = 50)
    private String itemNo;

    /**
     * 위험 분류 (BIO_SAFETY, ELECTRICAL, SOFTWARE, MECHANICAL, USABILITY, RAW_MATERIAL, ENVIRONMENTAL)
     */
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String category = "ELECTRICAL";

    // --- ISO 14971 3계층 식별 모델 ---

    /**
     * 1단계: 위해요인 (Hazard - 잠재적 위해의 근원)
     */
    @Column(nullable = false, length = 255)
    @NotBlank(message = "위해요인(Hazard)은 필수입니다.")
    private String hazard;

    /**
     * 2단계: 위해상황 (Hazardous Situation - 인체 또는 재산이 위해요인에 노출되는 환경)
     */
    @Column(name = "hazardous_situation", nullable = false, columnDefinition = "TEXT")
    @NotBlank(message = "위해상황(Hazardous Situation)은 필수입니다.")
    private String hazardousSituation;

    /**
     * 3단계: 피해 (Harm - 신체적 상해 또는 건강 손상)
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    @NotBlank(message = "피해(Harm)는 필수입니다.")
    private String harm;

    // --- 통제 전 초기 위험 평가 (Initial Risk) ---

    /**
     * 초기 심각도 (1: Negligible ~ 5: Catastrophic)
     */
    @Column(name = "initial_severity", nullable = false)
    @Min(1) @Max(5)
    @Builder.Default
    private Integer initialSeverity = 3;

    /**
     * 초기 발생확률 (1: Improbable ~ 5: Frequent)
     */
    @Column(name = "initial_probability", nullable = false)
    @Min(1) @Max(5)
    @Builder.Default
    private Integer initialProbability = 3;

    /**
     * 초기 위험도 점수 (심각도 × 발생확률 = 1~25)
     */
    @Column(name = "initial_risk_score", nullable = false)
    @Builder.Default
    private Integer initialRiskScore = 9;

    /**
     * 초기 수용성 판정 (ACCEPTABLE: 수용가능, ALARP: 실행가능최저수준, UNACCEPTABLE: 수용불가)
     */
    @Column(name = "initial_acceptability", nullable = false, length = 30)
    @Builder.Default
    private String initialAcceptability = "ALARP";

    // --- 위험 통제 조치 (Risk Control Measures) ---

    /**
     * 통제 조치 유형 (INHERENT_SAFETY: 본질적 안전설계, PROTECTIVE_MEASURES: 보호수단/알람, INFORMATION_FOR_SAFETY: 안전정보/사용설명)
     */
    @Column(name = "control_category", nullable = false, length = 30)
    @Builder.Default
    private String controlCategory = "INHERENT_SAFETY";

    /**
     * 위험 통제 조치 내용
     */
    @Column(name = "control_measures", nullable = false, columnDefinition = "TEXT")
    @NotBlank(message = "통제 조치 내용은 필수입니다.")
    private String controlMeasures;

    /**
     * 통제 조치 진행 상태 (PENDING, IN_PROGRESS, COMPLETED, VERIFIED)
     */
    @Column(name = "control_status", nullable = false, length = 30)
    @Builder.Default
    private String controlStatus = "COMPLETED";

    /**
     * 검증 방법 (예: IEC 60601-1 발열시험, SW 정적/동적 검증, 임상 사용적합성 테스트)
     */
    @Column(name = "verification_method", length = 255)
    private String verificationMethod;

    /**
     * 검증 결과 (PASS: 적합, CONDITIONAL: 조건부적합, FAIL: 부적합)
     */
    @Column(name = "verification_result", length = 50)
    @Builder.Default
    private String verificationResult = "PASS";

    // --- 통제 후 잔여 위험 평가 (Residual Risk) ---

    /**
     * 잔여 심각도 (1~5)
     */
    @Column(name = "residual_severity", nullable = false)
    @Min(1) @Max(5)
    @Builder.Default
    private Integer residualSeverity = 2;

    /**
     * 잔여 발생확률 (1~5)
     */
    @Column(name = "residual_probability", nullable = false)
    @Min(1) @Max(5)
    @Builder.Default
    private Integer residualProbability = 1;

    /**
     * 잔여 위험도 점수 (잔여 심각도 × 잔여 발생확률 = 1~25)
     */
    @Column(name = "residual_risk_score", nullable = false)
    @Builder.Default
    private Integer residualRiskScore = 2;

    /**
     * 잔여 수용성 판정 (ACCEPTABLE, ALARP, UNACCEPTABLE)
     */
    @Column(name = "residual_acceptability", nullable = false, length = 30)
    @Builder.Default
    private String residualAcceptability = "ACCEPTABLE";

    /**
     * 이익-위험 분석(Benefit-Risk Analysis) 필요 여부
     */
    @Column(name = "benefit_risk_needed")
    @Builder.Default
    private Boolean benefitRiskNeeded = false;

    /**
     * 이익-위험 분석 요약
     */
    @Column(name = "benefit_risk_summary", columnDefinition = "TEXT")
    private String benefitRiskSummary;

    /**
     * 비고
     */
    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    /**
     * 위험도 및 수용성 자동 재계산
     */
    @PrePersist
    @PreUpdate
    public void calculateRiskScores() {
        if (initialSeverity == null) initialSeverity = 1;
        if (initialProbability == null) initialProbability = 1;
        this.initialRiskScore = initialSeverity * initialProbability;
        this.initialAcceptability = determineAcceptability(this.initialRiskScore);

        if (residualSeverity == null) residualSeverity = 1;
        if (residualProbability == null) residualProbability = 1;
        this.residualRiskScore = residualSeverity * residualProbability;
        this.residualAcceptability = determineAcceptability(this.residualRiskScore);

        if ("UNACCEPTABLE".equals(this.residualAcceptability)) {
            this.benefitRiskNeeded = true;
        }
    }

    public static String determineAcceptability(int score) {
        if (score <= 4) return "ACCEPTABLE";
        if (score <= 9) return "ALARP";
        return "UNACCEPTABLE";
    }
}
