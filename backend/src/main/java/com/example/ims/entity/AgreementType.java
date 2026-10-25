package com.example.ims.entity;

/**
 * 🏭 품질협약서(QAA) 유형 (Agreement Type)
 * ISO 13485:2016 §4.1.5 / ISO 22716 §12
 */
public enum AgreementType {
    CONTRACT_MANUFACTURING("위탁제조 및 충진포장 품질협약 (OEM/ODM)"),
    RAW_MATERIAL("핵심 원자재/성분 공급 품질보증협약"),
    PACKAGING_MATERIAL("직접 접촉 포장재 품질보증협약"),
    QUALITY_CONTROL("시험검사/성적서 발행 위탁협약"),
    STERILIZATION("멸균 유효성 공정 품질협약"),
    STORAGE_DISTRIBUTION("보관 및 GDP 물류품질협약");

    private final String description;

    AgreementType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
