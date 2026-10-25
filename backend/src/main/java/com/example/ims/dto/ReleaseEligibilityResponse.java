package com.example.ims.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReleaseEligibilityResponse {

    private boolean eligible;
    private String lotNumber;
    private String itemCode;
    private Long inboundId;
    private String inspectionResult;
    private String releaseStatus; // RELEASE_PERMITTED, RELEASE_BLOCKED_NCR, RELEASE_BLOCKED_INSPECTION, RELEASE_CONDITIONAL_CONCESSION
    private int blockingNcrCount;
    @Builder.Default
    private List<NonConformanceReportResponse> blockingNcrs = new ArrayList<>();
    private String message;
}
