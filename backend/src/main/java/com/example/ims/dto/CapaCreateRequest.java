package com.example.ims.dto;

import com.example.ims.entity.CapaCategory;
import com.example.ims.entity.CapaRiskLevel;
import com.example.ims.entity.CapaSourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CapaCreateRequest {

    @NotBlank(message = "CAPA 제목은 필수입니다.")
    private String title;

    @NotNull(message = "발의 소스 유형은 필수입니다.")
    private CapaSourceType sourceType;

    private Long sourceId;
    private String sourceNumber;
    private String sourceDescription;

    @NotNull(message = "CAPA 분류 범주는 필수입니다.")
    private CapaCategory category;

    @NotNull(message = "위험도 등급은 필수입니다.")
    private CapaRiskLevel riskLevel;

    @NotBlank(message = "문제 현상 설명은 필수입니다.")
    private String problemDescription;

    // 임시 봉쇄조치 (Containment)
    private String containmentAction;
    private LocalDate containmentDate;
    private String containmentResponsible;

    // 품목 및 LOT (선택)
    private String itemCode;
    private String productName;
    private String lotNumber;
    private Boolean isLotUnknown;

    // 담당자 및 목표일자
    @NotBlank(message = "CAPA 담당자는 필수입니다.")
    private String assignedTo;

    @NotNull(message = "완료 목표일자는 필수입니다.")
    private LocalDate targetCompletionDate;

    // 효과성 검증 계획
    private String effectivenessCriteria;
    private LocalDate effectivenessTargetDate;
}
