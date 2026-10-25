package com.example.ims.entity;

/**
 * 🔄 변경관리 8단계 라이프사이클 상태 (Change Status)
 */
public enum ChangeStatus {
    DRAFT("작성 중"),
    SUBMITTED("제출됨"),
    IMPACT_ASSESSING("영향평가 중"),
    CCB_REVIEW("CCB 심의 중"),
    APPROVED("승인됨"),
    IN_PROGRESS("실행 중"),
    EFFECTIVENESS_CHECK("효과성 평가 중"),
    CLOSED("최종 종결"),
    REJECTED("반려/부결"),
    CANCELLED("취소됨");

    private final String description;

    ChangeStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
