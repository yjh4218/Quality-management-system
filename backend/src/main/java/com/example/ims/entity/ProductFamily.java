package com.example.ims.entity;

/**
 * 제품군 분류 (Product Family).
 * 화장품(COSMETICS)과 의료기기(MEDICAL_DEVICE) 품목군을 식별합니다.
 */
public enum ProductFamily {
    COSMETICS("화장품", "ISO 22716 / 화장품법"),
    MEDICAL_DEVICE("의료기기", "ISO 13485 / 의료기기법"),
    COMMON("공통(품질경영)", "ISO 9001 / 통합 eQMS");

    private final String description;
    private final String standard;

    ProductFamily(String description, String standard) {
        this.description = description;
        this.standard = standard;
    }

    public String getDescription() {
        return description;
    }

    public String getStandard() {
        return standard;
    }
}
