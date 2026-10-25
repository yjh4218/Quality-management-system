package com.example.ims.entity;

public enum EquipmentCriticality {
    HIGH("중점관리 (품질직접영향)"),
    MEDIUM("일반관리 (공정간접영향)"),
    LOW("보조관리 (단순보조설비)");

    private final String description;

    EquipmentCriticality(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
