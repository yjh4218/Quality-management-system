package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalTemplateDto {
    private Long id;
    private Long docTypeId;
    private String docTypeCode;
    private String docTypeName;
    private Integer version;
    private Boolean isCurrent;
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private List<ApprovalTemplateStepDto> steps;
}
