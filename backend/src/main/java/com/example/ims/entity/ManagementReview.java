package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "management_reviews", indexes = {
        @Index(name = "idx_mr_number", columnList = "review_number", unique = true),
        @Index(name = "idx_mr_status", columnList = "status"),
        @Index(name = "idx_mr_review_date", columnList = "review_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManagementReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "review_number", nullable = false, unique = true, length = 50)
    private String reviewNumber;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_type", nullable = false, length = 50)
    private ManagementReviewType reviewType;

    @Column(name = "review_date", nullable = false)
    private LocalDate reviewDate;

    @Column(name = "chairperson_name", nullable = false, length = 100)
    private String chairpersonName;

    @Column(name = "attendees", nullable = false, length = 500)
    private String attendees;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private ManagementReviewStatus status = ManagementReviewStatus.SCHEDULED;

    // 12대 입력요소 핵심 요약
    @Column(name = "audit_results_summary", columnDefinition = "TEXT")
    private String auditResultsSummary;

    @Column(name = "customer_feedback_summary", columnDefinition = "TEXT")
    private String customerFeedbackSummary;

    @Column(name = "process_performance_summary", columnDefinition = "TEXT")
    private String processPerformanceSummary;

    @Column(name = "capa_status_summary", columnDefinition = "TEXT")
    private String capaStatusSummary;

    @Column(name = "previous_follow_up_summary", columnDefinition = "TEXT")
    private String previousFollowUpSummary;

    @Column(name = "regulatory_changes_summary", columnDefinition = "TEXT")
    private String regulatoryChangesSummary;

    @Column(name = "recommendations_summary", columnDefinition = "TEXT")
    private String recommendationsSummary;

    // 3대 출력요소 핵심 결정사항
    @Column(name = "qms_improvement_decisions", columnDefinition = "TEXT")
    private String qmsImprovementDecisions;

    @Column(name = "product_improvement_decisions", columnDefinition = "TEXT")
    private String productImprovementDecisions;

    @Column(name = "resource_allocation_decisions", columnDefinition = "TEXT")
    private String resourceAllocationDecisions;

    @Column(name = "next_review_due_date")
    private LocalDate nextReviewDueDate;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_date")
    private LocalDate approvedDate;

    @Column(name = "minutes_file_url", length = 500)
    private String minutesFileUrl;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 50)
    private String createdBy;

    @Column(name = "last_modified_by", length = 50)
    private String lastModifiedBy;
}
