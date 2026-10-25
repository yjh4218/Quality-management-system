package com.example.ims.entity;

public enum RecallStatus {
    INITIATED("회수 발의 및 계획수립"),
    AUTHORITY_NOTIFIED("규제당국 회수계획 보고"),
    CUSTOMER_NOTIFIED("거래처/소비자 회수 공표"),
    IN_RECALL("회수 진행 및 수거·격리"),
    RECONCILIATION("회수 수량 대사 및 폐기"),
    COMPLETED("회수 완료 및 최종 종결"),
    CANCELLED("회수 취소");

    private final String description;

    RecallStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
