package com.example.ims.entity;

public enum FindingClassification {
    CRITICAL("중대 부적합 (Critical)"),
    MAJOR("주요 부적합 (Major)"),
    MINOR("경미 부적합 (Minor)"),
    OBSERVATION("권고/관찰사항 (Observation)");

    private final String description;

    FindingClassification(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
