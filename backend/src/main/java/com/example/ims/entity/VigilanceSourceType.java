package com.example.ims.entity;

public enum VigilanceSourceType {
    COMPLAINT("고객 불만 / 시판 후 조사"),
    NCR("내부 부적합품 보고"),
    CAPA("시정 및 예방조치"),
    CLINICAL_TRIAL("임상시험 / PMS"),
    INTERNAL_AUDIT("내부심사 / 모니터링"),
    LITERATURE("학술문헌 / 규제당국 통지");

    private final String description;

    VigilanceSourceType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
