package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalStepInstanceDto {
    private Long id;
    private Long documentId;
    private Integer stepOrder;
    private String stepType;
    private Long assigneeUserId;
    private String assigneeUsername;
    private String assigneeUserName;
    private String assigneeDepartment;
    private String assigneePosition;
    private String assigneeCompanyName;
    private Boolean isAdhoc;
    private String status;
    private String comment;
    private LocalDateTime processedAt;
    private LocalDateTime readAt;
}
