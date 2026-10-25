package com.example.ims.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ControlledDocumentMetricsResponse {
    private long totalDocuments;
    private long effectiveCount;
    private long draftCount;
    private long reviewCount;
    private long approvedCount;
    private long supersededCount;
    private long obsoleteCount;
    private long cosmeticsCount;
    private long medicalDeviceCount;
    private long commonCount;
}
