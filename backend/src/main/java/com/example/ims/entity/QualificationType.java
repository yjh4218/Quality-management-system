package com.example.ims.entity;

/**
 * 🏅 직무 자격 구분.
 */
public enum QualificationType {
    LEGAL_MANDATORY("법정 필수 자격 (제조/책임판매관리자 등)"),
    INTERNAL_CERTIFIED("사내 전문 자격 (출하판정원/분석원 등)"),
    AUDITOR("심사원 자격 (내부심사/공급업체 실사원)"),
    OPERATOR("특수공정 작업원 (무균/멸균/조제/세척)");

    private final String description;

    QualificationType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
