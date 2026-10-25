package com.example.ims.dto;

import com.example.ims.entity.EquipmentCategory;
import com.example.ims.entity.EquipmentCriticality;
import com.example.ims.entity.EquipmentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentRequest {

    @NotBlank(message = "장비명은 필수입니다.")
    private String equipmentName;

    @NotNull(message = "장비 분류는 필수입니다.")
    private EquipmentCategory category;

    private String modelNumber;
    private String serialNumber;
    private String manufacturer;
    private String supplier;

    private LocalDate installationDate;
    private String installationLocation;
    private String department;
    private String managerName;

    @NotNull(message = "장비 상태는 필수입니다.")
    private EquipmentStatus status;

    private Integer calibrationCycleMonths;
    private LocalDate lastCalibrationDate;
    private LocalDate nextCalibrationDueDate;

    private Integer pmCycleMonths;
    private LocalDate lastPmDate;
    private LocalDate nextPmDueDate;

    @NotNull(message = "관리 중요도는 필수입니다.")
    private EquipmentCriticality criticality;

    private String specifications;
    private String remarks;
}
