package com.example.ims.entity;

/**
 * 부적합 보고서(NCR) 수명주기 상태 (ISO 13485:2016 §8.3)
 */
public enum NcrStatus {
    DRAFT("작성 중"),
    SUBMITTED("접수 완료 (격리 보관)"),
    UNDER_INVESTIGATION("원인 조사 중 (5-Why/어골도)"),
    DISPOSITION_PENDING("처리방안 심의 대기"),
    DISPOSITION_APPROVED("처리방안 승인 완료"),
    REWORK_IN_PROGRESS("재작업/조치 실행 중"),
    EFFECTIVENESS_VERIFIED("조치 유효성 확인 완료"),
    CLOSED("최종 종결 (품질책임자 확인)"),
    VOID("무효/취소");

    private final String description;

    NcrStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
