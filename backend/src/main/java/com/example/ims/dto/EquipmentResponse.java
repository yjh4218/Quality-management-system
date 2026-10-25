package com.example.ims.dto;

import com.example.ims.entity.Equipment;
import com.example.ims.entity.EquipmentCategory;
import com.example.ims.entity.EquipmentCriticality;
import com.example.ims.entity.EquipmentStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentResponse {

    private Long id;
    private String equipmentCode;
    private String equipmentName;
    private EquipmentCategory category;
    private String categoryDescription;
    private String modelNumber;
    private String serialNumber;
    private String manufacturer;
    private String supplier;
    private LocalDate installationDate;
    private String installationLocation;
    private String department;
    private String managerName;
    private EquipmentStatus status;
    private String statusDescription;
    private Integer calibrationCycleMonths;
    private LocalDate lastCalibrationDate;
    private LocalDate nextCalibrationDueDate;
    private Integer pmCycleMonths;
    private LocalDate lastPmDate;
    private LocalDate nextPmDueDate;
    private EquipmentCriticality criticality;
    private String criticalityDescription;
    private String specifications;
    private String remarks;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    // Derived flags for UI
    private Boolean isCalibrationOverdue;
    private Boolean isCalibrationDueSoon;
    private Boolean isPmDueSoon;

    public static EquipmentResponse fromEntity(Equipment e, LocalDate today, LocalDate thirtyDaysLater) {
        if (e == null) return null;

        boolean calOverdue = e.getNextCalibrationDueDate() != null && e.getNextCalibrationDueDate().isBefore(today);
        boolean calDueSoon = e.getNextCalibrationDueDate() != null &&
                !e.getNextCalibrationDueDate().isBefore(today) &&
                !e.getNextCalibrationDueDate().isAfter(thirtyDaysLater);
        boolean pmDue = e.getNextPmDueDate() != null && !e.getNextPmDueDate().isAfter(thirtyDaysLater);

        return EquipmentResponse.builder()
                .id(e.getId())
                .equipmentCode(e.getEquipmentCode())
                .equipmentName(e.getEquipmentName())
                .category(e.getCategory())
                .categoryDescription(e.getCategory() != null ? e.getCategory().getDescription() : null)
                .modelNumber(e.getModelNumber())
                .serialNumber(e.getSerialNumber())
                .manufacturer(e.getManufacturer())
                .supplier(e.getSupplier())
                .installationDate(e.getInstallationDate())
                .installationLocation(e.getInstallationLocation())
                .department(e.getDepartment())
                .managerName(e.getManagerName())
                .status(e.getStatus())
                .statusDescription(e.getStatus() != null ? e.getStatus().getDescription() : null)
                .calibrationCycleMonths(e.getCalibrationCycleMonths())
                .lastCalibrationDate(e.getLastCalibrationDate())
                .nextCalibrationDueDate(e.getNextCalibrationDueDate())
                .pmCycleMonths(e.getPmCycleMonths())
                .lastPmDate(e.getLastPmDate())
                .nextPmDueDate(e.getNextPmDueDate())
                .criticality(e.getCriticality())
                .criticalityDescription(e.getCriticality() != null ? e.getCriticality().getDescription() : null)
                .specifications(e.getSpecifications())
                .remarks(e.getRemarks())
                .isDeleted(e.getIsDeleted())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .createdBy(e.getCreatedBy())
                .lastModifiedBy(e.getLastModifiedBy())
                .isCalibrationOverdue(calOverdue)
                .isCalibrationDueSoon(calDueSoon)
                .isPmDueSoon(pmDue)
                .build();
    }
}
