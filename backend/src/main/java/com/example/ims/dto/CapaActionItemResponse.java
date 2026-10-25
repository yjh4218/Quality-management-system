package com.example.ims.dto;

import com.example.ims.entity.CapaActionItem;
import com.example.ims.entity.CapaActionType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CapaActionItemResponse {

    private Long id;
    private Long capaId;
    private CapaActionType actionType;
    private String actionTypeDescription;
    private String title;
    private String description;
    private String assignedTo;
    private LocalDate targetDate;
    private LocalDate completionDate;
    private String status;
    private String completionNotes;
    private String verificationNotes;
    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String createdBy;
    private LocalDateTime createdAt;

    public static CapaActionItemResponse fromEntity(CapaActionItem item) {
        if (item == null) return null;
        return CapaActionItemResponse.builder()
                .id(item.getId())
                .capaId(item.getCapaRecord() != null ? item.getCapaRecord().getId() : null)
                .actionType(item.getActionType())
                .actionTypeDescription(item.getActionType() != null ? item.getActionType().getDescription() : null)
                .title(item.getTitle())
                .description(item.getDescription())
                .assignedTo(item.getAssignedTo())
                .targetDate(item.getTargetDate())
                .completionDate(item.getCompletionDate())
                .status(item.getStatus())
                .completionNotes(item.getCompletionNotes())
                .verificationNotes(item.getVerificationNotes())
                .verifiedBy(item.getVerifiedBy())
                .verifiedAt(item.getVerifiedAt())
                .createdBy(item.getCreatedBy())
                .createdAt(item.getCreatedAt())
                .build();
    }
}
