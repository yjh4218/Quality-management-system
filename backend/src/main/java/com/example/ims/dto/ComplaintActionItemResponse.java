package com.example.ims.dto;

import com.example.ims.entity.ComplaintActionItem;
import com.example.ims.entity.ComplaintActionType;
import com.example.ims.entity.NcrActionStatus;
import com.example.ims.entity.VerificationResult;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintActionItemResponse {

    private Long id;
    private Long evaluationId;
    private String actionItemNumber;
    private ComplaintActionType actionType;
    private String actionTypeDescription;
    private String title;
    private String description;
    private String assigneeName;
    private String assigneeDept;
    private LocalDate dueDate;
    private LocalDate completedDate;
    private NcrActionStatus status;
    private String actionResult;
    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private VerificationResult verificationResult;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ComplaintActionItemResponse from(ComplaintActionItem item) {
        if (item == null) return null;
        return ComplaintActionItemResponse.builder()
                .id(item.getId())
                .evaluationId(item.getEvaluation() != null ? item.getEvaluation().getId() : null)
                .actionItemNumber(item.getActionItemNumber())
                .actionType(item.getActionType())
                .actionTypeDescription(item.getActionType() != null ? item.getActionType().getLabel() : "")
                .title(item.getTitle())
                .description(item.getDescription())
                .assigneeName(item.getAssigneeName())
                .assigneeDept(item.getAssigneeDept())
                .dueDate(item.getDueDate())
                .completedDate(item.getCompletedDate())
                .status(item.getStatus())
                .actionResult(item.getActionResult())
                .verifiedBy(item.getVerifiedBy())
                .verifiedAt(item.getVerifiedAt())
                .verificationResult(item.getVerificationResult())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
