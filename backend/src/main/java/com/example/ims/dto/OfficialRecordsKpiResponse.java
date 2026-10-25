package com.example.ims.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfficialRecordsKpiResponse {

    private Long totalSignatures;
    private Long qualityAuthoritySignatures;
    private Double part11ComplianceRate;
    private Long activePolicies;
    private Double hybridPolicyRate;
    private Double integrityValidRate;
}
