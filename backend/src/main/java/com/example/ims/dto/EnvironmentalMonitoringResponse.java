package com.example.ims.dto;

import com.example.ims.entity.EnvironmentalArea;
import com.example.ims.entity.EnvironmentalMonitoring;
import com.example.ims.entity.EnvironmentalStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvironmentalMonitoringResponse {

    private Long id;
    private String monitoringNumber;
    private EnvironmentalArea area;
    private String areaDescription;
    private LocalDateTime monitoringDate;
    private BigDecimal temperature;
    private BigDecimal humidity;
    private BigDecimal differentialPressure;
    private Integer airborneParticles05;
    private Integer airborneParticles50;
    private Integer microbialCount;
    private EnvironmentalStatus status;
    private String statusDescription;
    private String inspector;
    private String correctiveAction;
    private String remarks;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public static EnvironmentalMonitoringResponse fromEntity(EnvironmentalMonitoring env) {
        if (env == null) return null;

        return EnvironmentalMonitoringResponse.builder()
                .id(env.getId())
                .monitoringNumber(env.getMonitoringNumber())
                .area(env.getArea())
                .areaDescription(env.getArea() != null ? env.getArea().getDescription() : null)
                .monitoringDate(env.getMonitoringDate())
                .temperature(env.getTemperature())
                .humidity(env.getHumidity())
                .differentialPressure(env.getDifferentialPressure())
                .airborneParticles05(env.getAirborneParticles05())
                .airborneParticles50(env.getAirborneParticles50())
                .microbialCount(env.getMicrobialCount())
                .status(env.getStatus())
                .statusDescription(env.getStatus() != null ? env.getStatus().getDescription() : null)
                .inspector(env.getInspector())
                .correctiveAction(env.getCorrectiveAction())
                .remarks(env.getRemarks())
                .isDeleted(env.getIsDeleted())
                .createdAt(env.getCreatedAt())
                .updatedAt(env.getUpdatedAt())
                .createdBy(env.getCreatedBy())
                .lastModifiedBy(env.getLastModifiedBy())
                .build();
    }
}
