package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

public class ComplianceScanDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private String ingredientsText;
        private List<String> countries; // e.g. ["KR", "EU", "CN", "US", "JP"]
        private String productType; // e.g. "LEAVE_ON", "RINSE_OFF"
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private boolean compliant;
        private List<ResultItem> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResultItem {
        private String inputName;
        private String matchedKoreanName;
        private String matchedInciName;
        private String casNumber;
        private String status; // SAFE, WARNING, CRITICAL (PROHIBITED)
        private String country;
        private String restrictionType; // PROHIBITED, RESTRICTED, etc.
        private Double limitPercentage;
        private String conditionText;
    }
}
