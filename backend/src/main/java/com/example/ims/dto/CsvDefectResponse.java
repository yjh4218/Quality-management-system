package com.example.ims.dto;

import com.example.ims.entity.DefectSeverity;
import com.example.ims.entity.DefectStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvDefectResponse {
    private Long id;
    private Long projectId;
    private String projectCode;
    private String defectNumber;
    private String defectTitle;
    private DefectSeverity severity;
    private String severityDescription;
    private String testProtocolNumber;
    private String description;
    private String rootCause;
    private String correctiveAction;
    private DefectStatus status;
    private String statusDescription;
    private String reportedBy;
    private LocalDateTime reportedAt;
    private String resolvedBy;
    private LocalDateTime resolvedAt;
    private String riskAcceptanceJustification;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
