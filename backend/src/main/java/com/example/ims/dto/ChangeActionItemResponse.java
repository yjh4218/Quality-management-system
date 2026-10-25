package com.example.ims.dto;

import com.example.ims.entity.ChangeActionItem;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 🔄 변경실행 조치항목 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeActionItemResponse {

    private Long id;
    private Long changeRequestId;
    private Integer actionOrder;
    private String actionTitle;
    private String actionDetails;
    private String assignedPerson;
    private String assignedDepartment;
    private LocalDate dueDate;
    private LocalDate completionDate;
    private String status;
    private String evidenceDocUrl;
    private String verificationNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;

    public static ChangeActionItemResponse fromEntity(ChangeActionItem entity) {
        if (entity == null) return null;
        return ChangeActionItemResponse.builder()
                .id(entity.getId())
                .changeRequestId(entity.getChangeRequest() != null ? entity.getChangeRequest().getId() : null)
                .actionOrder(entity.getActionOrder())
                .actionTitle(entity.getActionTitle())
                .actionDetails(entity.getActionDetails())
                .assignedPerson(entity.getAssignedPerson())
                .assignedDepartment(entity.getAssignedDepartment())
                .dueDate(entity.getDueDate())
                .completionDate(entity.getCompletionDate())
                .status(entity.getStatus())
                .evidenceDocUrl(entity.getEvidenceDocUrl())
                .verificationNotes(entity.getVerificationNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .build();
    }
}
