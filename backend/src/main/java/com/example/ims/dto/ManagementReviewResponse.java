package com.example.ims.dto;

import com.example.ims.entity.ManagementReview;
import com.example.ims.entity.ManagementReviewStatus;
import com.example.ims.entity.ManagementReviewType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManagementReviewResponse {

    private Long id;
    private String reviewNumber;
    private String title;
    private ManagementReviewType reviewType;
    private String reviewTypeDescription;
    private LocalDate reviewDate;
    private String chairpersonName;
    private String attendees;
    private ManagementReviewStatus status;
    private String statusDescription;

    // 12대 입력요소
    private String auditResultsSummary;
    private String customerFeedbackSummary;
    private String processPerformanceSummary;
    private String capaStatusSummary;
    private String previousFollowUpSummary;
    private String regulatoryChangesSummary;
    private String recommendationsSummary;

    // 3대 출력요소
    private String qmsImprovementDecisions;
    private String productImprovementDecisions;
    private String resourceAllocationDecisions;

    private LocalDate nextReviewDueDate;
    private String approvedBy;
    private LocalDate approvedDate;
    private String minutesFileUrl;
    private boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public static ManagementReviewResponse fromEntity(ManagementReview review) {
        if (review == null) return null;
        return ManagementReviewResponse.builder()
                .id(review.getId())
                .reviewNumber(review.getReviewNumber())
                .title(review.getTitle())
                .reviewType(review.getReviewType())
                .reviewTypeDescription(review.getReviewType() != null ? review.getReviewType().getDescription() : null)
                .reviewDate(review.getReviewDate())
                .chairpersonName(review.getChairpersonName())
                .attendees(review.getAttendees())
                .status(review.getStatus())
                .statusDescription(review.getStatus() != null ? review.getStatus().getDescription() : null)
                .auditResultsSummary(review.getAuditResultsSummary())
                .customerFeedbackSummary(review.getCustomerFeedbackSummary())
                .processPerformanceSummary(review.getProcessPerformanceSummary())
                .capaStatusSummary(review.getCapaStatusSummary())
                .previousFollowUpSummary(review.getPreviousFollowUpSummary())
                .regulatoryChangesSummary(review.getRegulatoryChangesSummary())
                .recommendationsSummary(review.getRecommendationsSummary())
                .qmsImprovementDecisions(review.getQmsImprovementDecisions())
                .productImprovementDecisions(review.getProductImprovementDecisions())
                .resourceAllocationDecisions(review.getResourceAllocationDecisions())
                .nextReviewDueDate(review.getNextReviewDueDate())
                .approvedBy(review.getApprovedBy())
                .approvedDate(review.getApprovedDate())
                .minutesFileUrl(review.getMinutesFileUrl())
                .isDeleted(review.isDeleted())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .createdBy(review.getCreatedBy())
                .lastModifiedBy(review.getLastModifiedBy())
                .build();
    }
}
