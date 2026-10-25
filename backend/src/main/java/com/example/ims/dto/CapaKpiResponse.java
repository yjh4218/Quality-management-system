package com.example.ims.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CapaKpiResponse {

    private long totalCapas;
    private long inProgressCapas;
    private long pendingEffectivenessCapas;
    private long overdueCapas;
    private long criticalOrHighRiskCapas;
    private long closedEffectiveCapas;
    private double closureEffectivenessRate;
}
