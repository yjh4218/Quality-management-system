package com.example.ims.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NcrKpiResponse {

    private long totalNcrCount;
    private long openNcrCount;
    private long quarantinedCount;
    private long reworkConcessionCount;
    private long capaLinkedCount;
    private double closedRatePercent;
}
