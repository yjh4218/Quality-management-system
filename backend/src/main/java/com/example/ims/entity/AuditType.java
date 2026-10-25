package com.example.ims.entity;

public enum AuditType {
    REGULAR_INTERNAL("정기 내부심사 (ISO 13485)"),
    SPECIAL_INTERNAL("특별/수시 내부심사"),
    SELF_INSPECTION_CGMP("화장품 자체점검 (ISO 22716/CGMP)"),
    PRE_INSPECTION("인증/규제기관 사전모의심사");

    private final String description;

    AuditType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
