package com.example.ims.entity;

/**
 * 부적합품 처리(Disposition) 방안 (ISO 13485:2016 §8.3 / 21 CFR 820.90)
 */
public enum NcrDispositionType {
    PENDING("처리방안 미결/검토 중"),
    SCRAP("폐기 처분 (전량 소각/폐수 처리)"),
    RETURN_TO_SUPPLIER("공급사 반품 (클레임 및 환불/교환)"),
    REWORK("재작업 (승인된 SOP 지침 및 재검사 필수)"),
    CONCESSION("특채/양보 승인 (기준 이탈이나 안전성/유효성 입증 조건부 허용)"),
    DOWNGRADE("등급 하향 / 타 용도 전용"),
    RETEST_RELEASE("추가/재시험 후 조건부 출하 허용");

    private final String description;

    NcrDispositionType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
