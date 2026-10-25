package com.example.ims.entity;

/**
 * 🔄 변경 대상 분류 (Change Category)
 * ISO 13485:2016 §7.3.9 / ISO 22716:2007 §11
 */
public enum ChangeCategory {
    PRODUCT("제품/사양/원자재"),
    PROCESS("제조/포장/시험 공정"),
    DOCUMENT("통제문서/SOP/DMR"),
    SUPPLIER("공급업체/외주제조"),
    FACILITY_EQUIPMENT("시설/유틸리티/제조설비"),
    SOFTWARE_SYSTEM("소프트웨어/전산시스템");

    private final String description;

    ChangeCategory(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
