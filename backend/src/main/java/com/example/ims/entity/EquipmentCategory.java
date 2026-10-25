package com.example.ims.entity;

public enum EquipmentCategory {
    MEASURING_INSTRUMENT("계측기/시험장비"),
    PRODUCTION_EQUIPMENT("제조설비/가공기"),
    UTILITY_FACILITY("유틸리티/공조/순수"),
    STORAGE_EQUIPMENT("보관/냉장설비"),
    OTHER("기타 설비");

    private final String description;

    EquipmentCategory(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
