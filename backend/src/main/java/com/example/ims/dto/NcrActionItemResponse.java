package com.example.ims.dto;

import com.example.ims.entity.NcrActionItem;
import com.example.ims.entity.NcrActionStatus;
import com.example.ims.entity.NcrActionType;
import com.example.ims.entity.VerificationResult;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NcrActionItemResponse {

    private Long id;
    private Long ncrId;
    private Integer itemOrder;
    private NcrActionType actionType;
    private String actionTypeDescription;
    private String description;
    private String assignee;
    private LocalDate dueDate;
    private LocalDateTime completedAt;
    private NcrActionStatus status;
    private String statusDescription;
    private VerificationResult verificationResult;
    private String verificationResultDescription;
    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String verificationNotes;
    private LocalDateTime createdAt;
    private String createdBy;

    public static NcrActionItemResponse from(NcrActionItem entity) {
        if (entity == null) return null;
        return NcrActionItemResponse.builder()
                .id(entity.getId())
                .ncrId(entity.getNcrReport() != null ? entity.getNcrReport().getId() : null)
                .itemOrder(entity.getItemOrder())
                .actionType(entity.getActionType())
                .actionTypeDescription(entity.getActionType() != null ? entity.getActionType().getDescription() : null)
                .description(entity.getDescription())
                .assignee(entity.getAssignee())
                .dueDate(entity.getDueDate())
                .completedAt(entity.getCompletedAt())
                .status(entity.getStatus())
                .statusDescription(entity.getStatus() != null ? entity.getStatus().getDescription() : null)
                .verificationResult(entity.getVerificationResult())
                .verificationResultDescription(entity.getVerificationResult() != null ? entity.getVerificationResult().getDescription() : null)
                .verifiedBy(entity.getVerifiedBy())
                .verifiedAt(entity.getVerifiedAt())
                .verificationNotes(entity.getVerificationNotes())
                .createdAt(entity.getCreatedAt())
                .createdBy(entity.getCreatedBy())
                .build();
    }
}
