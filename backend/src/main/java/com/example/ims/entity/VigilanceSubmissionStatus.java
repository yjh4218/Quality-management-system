package com.example.ims.entity;

public enum VigilanceSubmissionStatus {
    DRAFT("작성 중 / 기안"),
    SUBMITTED("보고 완료 (제출)"),
    ACKNOWLEDGED("규제당국 접수 완료"),
    FOLLOW_UP_REQUIRED("보완 요구 / 추가 조사 중"),
    CLOSED("최종 종결");

    private final String description;

    VigilanceSubmissionStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
