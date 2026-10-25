package com.example.ims.entity;

public enum IncidentSeverity {
    DEATH("사망"),
    LIFE_THREATENING("생명 위협"),
    HOSPITALIZATION("입원 또는 입원 연장"),
    PERMANENT_DISABILITY("영구적 장애 또는 기능 상실"),
    CONGENITAL_ANOMALY("선천적 기형/이상"),
    MALFUNCTION_RISK("기능부전 (재발 시 사망/손상 우려)"),
    OTHER_SERIOUS("기타 중대한 건강상 위해");

    private final String description;

    IncidentSeverity(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
