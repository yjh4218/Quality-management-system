package com.example.ims.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManufacturerScorecardDto {
    private Long manufacturerId;
    private String manufacturerName;
    private int auditCount;
    private double averageAuditScore;
    private int claimCount;
    private double claimDeduction;
    private double finalScore;
    private String grade; // A, B, C, D
}
