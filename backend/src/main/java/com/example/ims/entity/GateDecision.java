package com.example.ims.entity;

public enum GateDecision {
    GO("다음 단계 승인 (GO)"),
    CONDITIONAL_GO("조건부 승인 (Conditional GO)"),
    HOLD("보류 (HOLD)"),
    REJECT("반려/재작업 (REJECT)");

    private final String description;

    GateDecision(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
