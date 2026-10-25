package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 불만 및 이상사례 처리 상태 수명주기
 * ISO 13485:2016 §8.2.2 / 21 CFR 820.198
 */
@Getter
@RequiredArgsConstructor
public enum ComplaintEvaluationStatus {
    SUBMITTED("접수 완료", "초기 불만 및 이상사례 정보가 등록됨"),
    UNDER_REVIEW("조사·검토 진행", "의학적 인과관계 조사 및 제품 검체 분석 진행 중"),
    EVALUATED("평가 판정 완료", "인과관계 및 규제기관 보고 대상 여부 판정 완료"),
    REPORTED("규제보고 완료", "식약처 또는 관할 당국에 공식 보고 접수됨"),
    CLOSED("최종 완료 종결", "모든 원인 규명, 고객 회신 및 시정예방(CAPA) 조치가 완료되어 종결됨");

    private final String label;
    private final String description;
}
