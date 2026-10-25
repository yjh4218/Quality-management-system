package com.example.ims.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FacilityKpiResponse {

    private Long totalEquipment;
    private Long operationalEquipment;
    private BigDecimal operationalRate;
    private Long overdueCalibrations;
    private Long dueSoonCalibrations;
    private Long totalCalibrationAttention; // overdue + dueSoon
    private Long dueSoonPm;
    private Long failedCalibrations;
    private Long recentEnvironmentalOos;
}
