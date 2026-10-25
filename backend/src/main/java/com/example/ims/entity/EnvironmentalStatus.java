package com.example.ims.entity;

public enum EnvironmentalStatus {
    NORMAL("정상 적합"),
    WARNING_ACTION_LIMIT("주의 (경계/조치기준 근접)"),
    OUT_OF_SPEC("기준 이탈 (OOS / 부적합)");

    private final String description;

    EnvironmentalStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
