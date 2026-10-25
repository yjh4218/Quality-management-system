package com.example.ims.entity;

/**
 * 부적합 심각도 등급 (ISO 13485:2016 / 21 CFR 820.90)
 */
public enum NcrSeverity {
    CRITICAL("치명 (Critical - 안전성/법적규격 위반, 즉시 전량 격리 및 CAPA 필수)"),
    MAJOR("주요 (Major - 제품 기능/성능 저하, 규격 이탈, 재작업 또는 심의 필요)"),
    MINOR("경미 (Minor - 외관 미세 흠집/색차, 단순 표시 오기, 안전성 무영향)");

    private final String description;

    NcrSeverity(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
