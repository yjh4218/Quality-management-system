package com.example.ims.dto;

import com.example.ims.entity.MaintenanceResult;
import com.example.ims.entity.MaintenanceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceRecordRequest {

    @NotNull(message = "대상 장비 ID는 필수입니다.")
    private Long equipmentId;

    @NotNull(message = "유지보수 구분은 필수입니다.")
    private MaintenanceType maintenanceType;

    @NotNull(message = "작업 일자는 필수입니다.")
    private LocalDate maintenanceDate;

    @NotBlank(message = "작업자/업체명은 필수입니다.")
    private String performer;

    private BigDecimal cost;

    @NotNull(message = "작업 결과는 필수입니다.")
    private MaintenanceResult maintenanceResult;

    private String partsReplaced;
    private BigDecimal downtimeHours;

    @NotBlank(message = "작업 상세 내용은 필수입니다.")
    private String details;

    private String verifiedBy;

    // Optional override; if null and type is PREVENTIVE_PM, auto-calculated
    private LocalDate nextPmDueDate;

    private String remarks;
}
