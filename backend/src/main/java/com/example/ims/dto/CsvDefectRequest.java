package com.example.ims.dto;

import com.example.ims.entity.DefectSeverity;
import com.example.ims.entity.DefectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvDefectRequest {
    @NotNull(message = "소속 CSV 프로젝트 ID는 필수입니다.")
    private Long projectId;

    @NotBlank(message = "결함 번호는 필수입니다.")
    private String defectNumber;

    @NotBlank(message = "결함 제목은 필수입니다.")
    private String defectTitle;

    @NotNull(message = "결함 심각도는 필수입니다.")
    private DefectSeverity severity;

    private String testProtocolNumber;

    @NotBlank(message = "결함 세부 설명은 필수입니다.")
    private String description;

    private String rootCause;
    private String correctiveAction;
    private DefectStatus status;
    private String reportedBy;
    private LocalDateTime reportedAt;
    private String resolvedBy;
    private LocalDateTime resolvedAt;
    private String riskAcceptanceJustification;
}
