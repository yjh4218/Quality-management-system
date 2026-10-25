package com.example.ims.entity;

/**
 * 🔄 변경관리위원회(CCB: Change Control Board) 심의 결정
 */
public enum CcbDecision {
    APPROVED("승인 (Approved)"),
    CONDITIONALLY_APPROVED("조건부 승인 (Conditionally Approved)"),
    REJECTED("부결/반려 (Rejected)"),
    MORE_INFO_REQUIRED("보완 요구 (More Info Required)");

    private final String description;

    CcbDecision(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
