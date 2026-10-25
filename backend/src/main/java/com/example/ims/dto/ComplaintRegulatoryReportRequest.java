package com.example.ims.dto;

import com.example.ims.entity.ReportabilityStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintRegulatoryReportRequest {

    @NotNull(message = "규제기관 보고 상태는 필수입니다.")
    private ReportabilityStatus reportabilityStatus;

    private LocalDate authorityReportDate;
    private String authorityReportNumber;
    private String authorityFeedback;
}
