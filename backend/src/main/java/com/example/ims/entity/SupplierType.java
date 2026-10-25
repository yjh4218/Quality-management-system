package com.example.ims.entity;

/**
 * 🏭 공급업체 유형 (Supplier Type)
 * ISO 13485:2016 §7.4 / ISO 22716:2007 §12
 */
public enum SupplierType {
    RAW_MATERIAL("원자재/원료의약품/성분 공급사"),
    PACKAGING("용기/라벨/1·2차 포장재 공급사"),
    CONTRACT_MANUFACTURER("위탁제조/충진포장 OEM/ODM"),
    TESTING_LAB("공인 시험/검사 위탁기관"),
    STERILIZATION("멸균/방사선조사 위탁업체"),
    SERVICE_LOGISTICS("보관/물류/유통 서비스사");

    private final String description;

    SupplierType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
