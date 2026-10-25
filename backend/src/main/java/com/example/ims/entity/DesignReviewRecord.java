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

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * ISO 13485:2016 §7.3.5 설계심의 및 Stage-Gate 판정 기록 엔티티
 */
@Entity
@Table(name = "design_review_records", indexes = {
        @Index(name = "idx_drr_project_id", columnList = "project_id"),
        @Index(name = "idx_drr_review_phase", columnList = "reviewPhase"),
        @Index(name = "idx_drr_gate_decision", columnList = "gateDecision"),
        @Index(name = "idx_drr_deleted", columnList = "isDeleted")
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
public class DesignReviewRecord {

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
     * 심의 관리번호 (e.g. DR-2026-001)
     */
    @Column(name = "review_number", nullable = false, length = 50)
    @NotBlank(message = "심의번호는 필수입니다.")
    @Size(max = 50, message = "심의번호는 50자 이내여야 합니다.")
    private String reviewNumber;

    /**
     * 심의 대상 단계
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "review_phase", nullable = false, length = 30)
    @Builder.Default
    private DesignPhase reviewPhase = DesignPhase.PLANNING;

    /**
     * 심의 제목
     */
    @Column(name = "review_title", nullable = false, length = 200)
    @NotBlank(message = "심의 제목은 필수입니다.")
    @Size(max = 200, message = "심의 제목은 200자 이내여야 합니다.")
    private String reviewTitle;

    /**
     * 심의 일자
     */
    @Column(name = "review_date", nullable = false)
    @NotNull(message = "심의 일자는 필수입니다.")
    private LocalDate reviewDate;

    /**
     * 참석자 명단 (연구, 품질, 제조, 임상 등)
     */
    @Column(name = "attendees", nullable = false, length = 500)
    @NotBlank(message = "참석자 명단은 필수입니다.")
    private String attendees;

    /**
     * 심의 내용 및 결론 요약
     */
    @Column(name = "review_summary", nullable = false, columnDefinition = "TEXT")
    @NotBlank(message = "심의 내용은 필수입니다.")
    private String reviewSummary;

    /**
     * 후속 조치 과제 (Action Items)
     */
    @Column(name = "action_items", columnDefinition = "TEXT")
    private String actionItems;

    /**
     * 단계 게이트 통과 결정 (GO, CONDITIONAL_GO, HOLD, REJECT)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "gate_decision", nullable = false, length = 30)
    @Builder.Default
    private GateDecision gateDecision = GateDecision.GO;

    /**
     * 전자결재 연계 ID (Optional)
     */
    @Column(name = "approval_document_id")
    private Long approvalDocumentId;

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
