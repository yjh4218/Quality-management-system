package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 시설/장비/계측기 마스터 엔티티
 * 규격: ISO 13485:2016 §6.3, §7.6 / ISO 22716:2007 §4, §5 / 21 CFR 820.70(g), 820.72
 */
@Entity
@Table(name = "equipments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "equipment_code", nullable = false, unique = true, length = 50)
    private String equipmentCode;

    @Column(name = "equipment_name", nullable = false, length = 200)
    private String equipmentName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private EquipmentCategory category;

    @Column(name = "model_number", length = 100)
    private String modelNumber;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(length = 150)
    private String manufacturer;

    @Column(length = 150)
    private String supplier;

    @Column(name = "installation_date")
    private LocalDate installationDate;

    @Column(name = "installation_location", length = 150)
    private String installationLocation;

    @Column(length = 100)
    private String department;

    @Column(name = "manager_name", length = 100)
    private String managerName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private EquipmentStatus status = EquipmentStatus.OPERATIONAL;

    @Column(name = "calibration_cycle_months")
    @Builder.Default
    private Integer calibrationCycleMonths = 12;

    @Column(name = "last_calibration_date")
    private LocalDate lastCalibrationDate;

    @Column(name = "next_calibration_due_date")
    private LocalDate nextCalibrationDueDate;

    @Column(name = "pm_cycle_months")
    @Builder.Default
    private Integer pmCycleMonths = 6;

    @Column(name = "last_pm_date")
    private LocalDate lastPmDate;

    @Column(name = "next_pm_due_date")
    private LocalDate nextPmDueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private EquipmentCriticality criticality = EquipmentCriticality.MEDIUM;

    @Column(columnDefinition = "TEXT")
    private String specifications;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "last_modified_by", length = 100)
    private String lastModifiedBy;
}
