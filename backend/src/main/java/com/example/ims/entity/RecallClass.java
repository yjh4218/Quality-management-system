package com.example.ims.entity;

public enum RecallClass {
    CLASS_1("1등급 (사망/중대한 건강피해 위험)"),
    CLASS_2("2등급 (일시적/가역적 건강피해 위험)"),
    CLASS_3("3등급 (경미한 위반/건강피해 희박)");

    private final String description;

    RecallClass(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
