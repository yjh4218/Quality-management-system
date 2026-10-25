package com.example.ims.dto;

import com.example.ims.entity.MaintenanceRecord;
import com.example.ims.entity.MaintenanceResult;
import com.example.ims.entity.MaintenanceType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceRecordResponse {

    private Long id;
    private String maintenanceNumber;
    private Long equipmentId;
    private String equipmentCode;
    private String equipmentName;
    private String installationLocation;
    private MaintenanceType maintenanceType;
    private String maintenanceTypeDescription;
    private LocalDate maintenanceDate;
    private String performer;
    private BigDecimal cost;
    private MaintenanceResult maintenanceResult;
    private String maintenanceResultDescription;
    private String partsReplaced;
    private BigDecimal downtimeHours;
    private String details;
    private String verifiedBy;
    private LocalDate nextPmDueDate;
    private String remarks;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public static MaintenanceRecordResponse fromEntity(MaintenanceRecord m) {
        if (m == null) return null;

        return MaintenanceRecordResponse.builder()
                .id(m.getId())
                .maintenanceNumber(m.getMaintenanceNumber())
                .equipmentId(m.getEquipment() != null ? m.getEquipment().getId() : null)
                .equipmentCode(m.getEquipment() != null ? m.getEquipment().getEquipmentCode() : null)
                .equipmentName(m.getEquipment() != null ? m.getEquipment().getEquipmentName() : null)
                .installationLocation(m.getEquipment() != null ? m.getEquipment().getInstallationLocation() : null)
                .maintenanceType(m.getMaintenanceType())
                .maintenanceTypeDescription(m.getMaintenanceType() != null ? m.getMaintenanceType().getDescription() : null)
                .maintenanceDate(m.getMaintenanceDate())
                .performer(m.getPerformer())
                .cost(m.getCost())
                .maintenanceResult(m.getMaintenanceResult())
                .maintenanceResultDescription(m.getMaintenanceResult() != null ? m.getMaintenanceResult().getDescription() : null)
                .partsReplaced(m.getPartsReplaced())
                .downtimeHours(m.getDowntimeHours())
                .details(m.getDetails())
                .verifiedBy(m.getVerifiedBy())
                .nextPmDueDate(m.getNextPmDueDate())
                .remarks(m.getRemarks())
                .isDeleted(m.getIsDeleted())
                .createdAt(m.getCreatedAt())
                .updatedAt(m.getUpdatedAt())
                .createdBy(m.getCreatedBy())
                .lastModifiedBy(m.getLastModifiedBy())
                .build();
    }
}
