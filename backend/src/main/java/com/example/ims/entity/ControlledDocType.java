package com.example.ims.entity;

/**
 * 통제문서 유형 (Document Type).
 * ISO 9001, ISO 13485, ISO 22716에 따른 문서화 계층 구조를 정의합니다.
 */
public enum ControlledDocType {
    QUALITY_MANUAL("품질매뉴얼", "QM", 1),
    SOP("표준운영절차서", "SOP", 2),
    WORK_INSTRUCTION("작업지침서", "WI", 3),
    FORM("품질양식/서식", "FORM", 4),
    DHF("설계이력파일(DHF)", "DHF", 2),
    DMR("제품표준서(DMR)", "DMR", 2),
    VALIDATION_REPORT("밸리데이션보고서", "VR", 3),
    EXTERNAL_STANDARD("대외규격/법규", "EXT", 4);

    private final String description;
    private final String prefix;
    private final int level; // 문서화 계층 단계 (1~4단계)

    ControlledDocType(String description, String prefix, int level) {
        this.description = description;
        this.prefix = prefix;
        this.level = level;
    }

    public String getDescription() {
        return description;
    }

    public String getPrefix() {
        return prefix;
    }

    public int getLevel() {
        return level;
    }
}
