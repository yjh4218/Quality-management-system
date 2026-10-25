package com.example.ims.entity;

/**
 * 🏭 품질협약서(QAA) 효력 상태 (Agreement Status)
 */
public enum AgreementStatus {
    ACTIVE("유효 (정상 효력 발효중)"),
    EXPIRING_SOON("만료 임박 (30일 이내 갱신 필요)"),
    EXPIRED("기간 만료 (재체결 필요)"),
    TERMINATED("협약 해지 (거래 종료)");

    private final String description;

    AgreementStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
