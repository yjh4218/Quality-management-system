package com.example.ims.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintSafetyKpiResponse {

    private Long totalEvaluations;       // 전체 불만/이상사례 접수 건수
    private Long seriousCases;          // 중대한 유해사례 (Serious AE)
    private Long reportableCases;       // 규제기관 보고 대상/완료 건수
    private Long underReviewCases;      // 인과관계 및 조사 진행 중 건수
    private Long unknownLotCases;       // LOT 미상 접수 건수 (D-9 실증)
    private Long capaRequiredCases;     // CAPA 연계 필요/개시 건수

    public static ComplaintSafetyKpiResponse empty() {
        return ComplaintSafetyKpiResponse.builder()
                .totalEvaluations(0L)
                .seriousCases(0L)
                .reportableCases(0L)
                .underReviewCases(0L)
                .unknownLotCases(0L)
                .capaRequiredCases(0L)
                .build();
    }
}
