package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * ISO 13485:2016 §7.3 설계통제 세부 항목 및 추적성(RTM) 엔티티
 * (입력 DI, 출력 DO, 검증 DV, 유효성확인 VAL, 이관 TRF)
 */
@Entity
@Table(name = "design_control_items", indexes = {
        @Index(name = "idx_dci_project_id", columnList = "project_id"),
        @Index(name = "idx_dci_item_code", columnList = "itemCode"),
        @Index(name = "idx_dci_item_type", columnList = "itemType"),
        @Index(name = "idx_dci_ver_result", columnList = "verificationResult"),
        @Index(name = "idx_dci_parent_input", columnList = "parentInputItemCode"),
        @Index(name = "idx_dci_risk_hazard", columnList = "riskHazardCode"),
        @Index(name = "idx_dci_deleted", columnList = "isDeleted")
})
@org.hibernate.annotations.SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
@Getter
@Setter
@ToString(exclude = "project")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@EntityListeners(AuditingEntityListener.class)
public class DesignControlItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonBackReference
    @NotNull(message = "설계 프로젝트는 필수입니다.")
    private DesignProject project;

    /**
     * 항목 코드 (e.g. DI-001, DO-001, DV-001, VAL-001, TRF-001)
     */
    @Column(name = "item_code", nullable = false, length = 50)
    @NotBlank(message = "항목 코드는 필수입니다.")
    @Size(max = 50, message = "항목 코드는 50자 이내여야 합니다.")
    private String itemCode;

    /**
     * 통제 유형 (DESIGN_INPUT, DESIGN_OUTPUT, DESIGN_VERIFICATION, DESIGN_VALIDATION, DESIGN_TRANSFER)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 30)
    @Builder.Default
    private DesignItemType itemType = DesignItemType.DESIGN_INPUT;

    /**
     * 항목 명칭 / 요구사항 명
     */
    @Column(name = "title", nullable = false, length = 255)
    @NotBlank(message = "항목명은 필수입니다.")
    @Size(max = 255, message = "항목명은 255자 이내여야 합니다.")
    private String title;

    /**
     * 상세 사양 및 요구사항 내용
     */
    @Column(name = "specification", nullable = false, columnDefinition = "TEXT")
    @NotBlank(message = "상세 사양은 필수입니다.")
    private String specification;

    /**
     * 합격 판정 기준 (Acceptance Criteria)
     */
    @Column(name = "acceptance_criteria", columnDefinition = "TEXT")
    private String acceptanceCriteria;

    /**
     * 검증 방법 (Verification / Validation Method)
     */
    @Column(name = "verification_method", length = 255)
    private String verificationMethod;

    /**
     * 검증 결과 (PENDING, PASS, FAIL, NOT_APPLICABLE)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "verification_result", length = 30)
    @Builder.Default
    private VerificationResultStatus verificationResult = VerificationResultStatus.PENDING;

    /**
     * 검증 결과 요약
     */
    @Column(name = "result_summary", columnDefinition = "TEXT")
    private String resultSummary;

    /**
     * 근거 문서 URL / 파일명 / 성적서 번호
     */
    @Column(name = "evidence_doc_url", length = 500)
    private String evidenceDocUrl;

    /**
     * 상위 설계입력 추적 코드 (DO, DV, VAL 항목이 어느 DI를 충족하는지 역추적)
     */
    @Column(name = "parent_input_item_code", length = 50)
    private String parentInputItemCode;

    /**
     * ISO 14971 위해요인 코드 연계 (e.g. HAZ-001)
     */
    @Column(name = "risk_hazard_code", length = 50)
    private String riskHazardCode;

    /**
     * 담당자
     */
    @Column(name = "responsible_person", nullable = false, length = 100)
    @NotBlank(message = "담당자는 필수입니다.")
    private String responsiblePerson;

    /**
     * 항목 상태 (DRAFT, SUBMITTED, VERIFIED, APPROVED)
     */
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "DRAFT";

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
}
