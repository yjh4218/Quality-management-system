package com.example.ims.entity;

public enum AuditScope {
    QMS_FULL("전체 품질경영시스템 (QMS 전체)"),
    MANUFACTURING_PROCESS("제조 및 공정관리"),
    QUALITY_CONTROL("품질관리 및 시험분석"),
    DESIGN_DEVELOPMENT("설계개발 및 DHF"),
    FACILITY_EQUIPMENT("시설설비 및 청정환경"),
    SUPPLIER_CHAIN("구매 및 협력업체 관리");

    private final String description;

    AuditScope(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
