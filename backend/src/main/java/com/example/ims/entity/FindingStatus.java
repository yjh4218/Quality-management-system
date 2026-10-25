package com.example.ims.entity;

public enum FindingStatus {
    OPEN("시정조치 요구/대기"),
    ACTION_SUBMITTED("대책서 제출 완료"),
    CAPA_LINKED("CAPA 발행 연계"),
    VERIFIED("시정조치 검증 완료"),
    CLOSED("최종 종결");

    private final String description;

    FindingStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
