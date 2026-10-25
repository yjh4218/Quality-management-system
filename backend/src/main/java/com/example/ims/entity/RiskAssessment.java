package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ISO 14971:2019 위험관리 파일 (Risk Management File / Assessment) 엔티티
 * 의료기기 전주기(설계, 공정, 사용, 시판후)에 걸친 위험분석 및 종합 잔여위험 평가를 관리합니다.
 */
@Entity
@Table(name = "risk_assessments", indexes = {
        @Index(name = "idx_ra_assessment_no", columnList = "assessmentNo", unique = true),
        @Index(name = "idx_ra_product_name", columnList = "productName"),
        @Index(name = "idx_ra_risk_phase", columnList = "riskPhase"),
        @Index(name = "idx_ra_status", columnList = "status"),
        @Index(name = "idx_ra_target_family", columnList = "targetFamily"),
        @Index(name = "idx_ra_deleted", columnList = "isDeleted")
})
@org.hibernate.annotations.SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
@Getter
@Setter
@ToString(exclude = "hazardItems")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@EntityListeners(AuditingEntityListener.class)
public class RiskAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    /**
     * 위험성 평가 문서 번호 (e.g. RSK-202610-001)
     */
    @Column(name = "assessment_no", unique = true, nullable = false, length = 50)
    @NotBlank(message = "평가번호는 필수입니다.")
    @Size(max = 50, message = "평가번호는 50자 이내여야 합니다.")
    private String assessmentNo;

    /**
     * 평가 문서 제목
     */
    @Column(nullable = false, length = 200)
    @NotBlank(message = "문서 제목은 필수입니다.")
    @Size(max = 200, message = "문서 제목은 200자 이내여야 합니다.")
    private String title;

    /**
     * 대상 품목 ID (연계 품목이 있는 경우)
     */
    @Column(name = "product_id")
    private Long productId;

    /**
     * 대상 품목 코드
     */
    @Column(name = "product_code", length = 50)
    private String productCode;

    /**
     * 대상 품목/장비명
     */
    @Column(name = "product_name", nullable = false, length = 200)
    @NotBlank(message = "대상 품목명은 필수입니다.")
    private String productName;

    /**
     * 제품군 구분 (MEDICAL_DEVICE, IVD, COMBINATION, COSMETICS_DEVICE)
     */
    @Column(name = "target_family", nullable = false, length = 30)
    @Builder.Default
    private String targetFamily = "MEDICAL_DEVICE";

    /**
     * 위험관리 단계 (DESIGN: 설계위험, PROCESS: 공정위험, USE: 사용적합성, POST_MARKET: 시판후위험)
     */
    @Column(name = "risk_phase", nullable = false, length = 30)
    @Builder.Default
    private String riskPhase = "DESIGN";

    /**
     * 개정판 (e.g. 1.0, 1.1, 2.0)
     */
    @Column(name = "version_tag", nullable = false, length = 20)
    @Builder.Default
    private String versionTag = "1.0";

    /**
     * 진행 상태 (DRAFT: 작성중, REVIEW: 검토중, APPROVED: 승인완료, OBSOLETE: 폐기)
     */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT";

    /**
     * 작성자 (담당자)
     */
    @Column(nullable = false, length = 100)
    @NotBlank(message = "작성자는 필수입니다.")
    private String author;

    /**
     * 검토자
     */
    @Column(length = 100)
    private String reviewer;

    /**
     * 승인자 (품질책임자 / 총괄)
     */
    @Column(length = 100)
    private String approver;

    /**
     * 평가 기준일자
     */
    @Column(name = "assessment_date", nullable = false)
    private LocalDate assessmentDate;

    /**
     * 최종 승인일자
     */
    @Column(name = "approval_date")
    private LocalDate approvalDate;

    /**
     * 평가 대상 범위 및 의도된 사용(Intended Use) 설명
     */
    @Column(name = "scope_description", columnDefinition = "TEXT")
    private String scopeDescription;

    /**
     * 종합 잔여 위험 수용성 판정 (전체 잔여위험이 수용 가능한지 여부)
     */
    @Column(name = "overall_residual_risk_acceptable")
    @Builder.Default
    private Boolean overallResidualRiskAcceptable = true;

    /**
     * 종합 결론 및 이익-위험 분석(Benefit-Risk Analysis) 요약
     */
    @Column(name = "overall_conclusion", columnDefinition = "TEXT")
    private String overallConclusion;

    /**
     * 위해요인(Hazard) 항목 목록
     */
    @OneToMany(mappedBy = "assessment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonManagedReference
    private List<RiskHazardItem> hazardItems = new ArrayList<>();

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

    // Helper methods
    public void addHazardItem(RiskHazardItem item) {
        hazardItems.add(item);
        item.setAssessment(this);
    }

    public void removeHazardItem(RiskHazardItem item) {
        hazardItems.remove(item);
        item.setAssessment(null);
    }
}
