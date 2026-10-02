package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalTemplateStepDto {
    private Long id;
    private Long templateId;
    private Integer stepOrder;
    private String stepType;           // APPROVAL, AGREEMENT, REFERENCE
    private String assigneeType;       // ROLE, USER, DEPT, SUBMITTER_MANAGER
    private String assigneeRole;       // DEPARTMENT_HEAD, DEPUTY_HEAD, TEAM_LEAD, etc.
    private Long assigneeDepartmentId;
    private String assigneeDepartmentName;
    private Long assigneeUserId;
    private String assigneeUserName;
    private String conditionJson;
    private Boolean isRequired;
}
