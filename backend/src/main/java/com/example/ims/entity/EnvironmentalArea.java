package com.example.ims.entity;

public enum EnvironmentalArea {
    CLEANROOM_GRADE_C("청정실 Grade C (조제실)"),
    CLEANROOM_GRADE_D("청정실 Grade D (충전실)"),
    WEIGHING_ROOM("원료 칭량실 (칭량부스)"),
    PACKAGING_AREA("포장실 (일반제조구역)"),
    WAREHOUSE("보관소 (온·습도 관리구역)"),
    QC_LAB("품질관리 시험실 (이화학/미생물)");

    private final String description;

    EnvironmentalArea(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
