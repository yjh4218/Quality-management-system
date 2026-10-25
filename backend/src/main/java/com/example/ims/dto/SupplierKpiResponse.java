package com.example.ims.dto;

import lombok.*;

import java.util.Map;

/**
 * 🏭 공급업체 및 위탁제조 6대 핵심 KPI 통계 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierKpiResponse {

    // 1. 전체 등록 공급업체 수
    private long totalSuppliers;

    // 2. 공식 승인 공급업체 수 (APPROVED)
    private long approvedSuppliers;

    // 3. 조건부 승인 공급업체 수 (CONDITIONALLY_APPROVED)
    private long conditionalSuppliers;

    // 4. QAA 협약 준수/체결률 (%)
    private double qaaComplianceRate;

    // 5. 30일 내 만료 임박 QAA 건수
    private long qaaExpiringSoonCount;

    // 6. 평균 공급업체 종합평가 점수 (0~100)
    private double averageEvaluationScore;

    // 분포 통계
    private Map<String, Long> statusDistribution;
    private Map<String, Long> gradeDistribution;
    private Map<String, Long> typeDistribution;
    private Map<String, Long> agreementStatusDistribution;
}
