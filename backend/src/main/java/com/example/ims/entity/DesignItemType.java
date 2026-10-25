package com.example.ims.entity;

public enum DesignItemType {
    DESIGN_INPUT("설계 입력 (DI)", "사용자/기능/안전성/규제 요구사항"),
    DESIGN_OUTPUT("설계 출력 (DO)", "도면, 회로도, BOM, 소프트웨어 사양, DMR"),
    DESIGN_VERIFICATION("설계 검증 (DV)", "시험검사, 규격시험, 신뢰성 시험, 단위/통합 테스트"),
    DESIGN_VALIDATION("설계 유효성확인 (VAL)", "임상평가, 사용적합성 평가, 모의 임상시험"),
    DESIGN_TRANSFER("설계 이관 (TRF)", "양산 검증, 조립 지그, 작업표준서, 검사기준서");

    private final String label;
    private final String description;

    DesignItemType(String label, String description) {
        this.label = label;
        this.description = description;
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }
}
