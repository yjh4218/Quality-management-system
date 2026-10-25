package com.example.ims.entity;

import lombok.Getter;

/**
 * 추적성 배치 품질 판정 상태
 * ISO 13485:2016 §7.5.8 / §8.2.6
 */
@Getter
public enum TraceabilityQualityStatus {
    QUARANTINE("보관/검사중", "시험검사 결과 대기 중인 격리 보관 상태", "#f59e0b"),
    PASSED("적합(승인)", "COA 성적서 발행 및 품질 적합 승인 완료", "#10b981"),
    REJECTED("부적합(폐기)", "규격 부적합으로 인한 폐기/반품 대상", "#ef4444"),
    RELEASED("출하승인", "품질보증부서 최종 출하 승인 완료", "#3b82f6"),
    RECALLED("회수(격리)", "시장 리콜 또는 클레임 격리 조치 대상", "#8b5cf6");

    private final String description;
    private final String detail;
    private final String color;

    TraceabilityQualityStatus(String description, String detail, String color) {
        this.description = description;
        this.detail = detail;
        this.color = color;
    }
}
