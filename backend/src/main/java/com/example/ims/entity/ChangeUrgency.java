package com.example.ims.entity;

/**
 * 🔄 변경 긴급도 (Change Urgency)
 */
public enum ChangeUrgency {
    EMERGENCY("긴급 (안전/법적 긴급조치)"),
    STANDARD("일반 (정규 절차)"),
    MINOR("경미 (단순 오탈자/경미 변경)");

    private final String description;

    ChangeUrgency(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
