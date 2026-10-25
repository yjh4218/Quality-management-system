package com.example.ims.entity;

public enum OfficialOriginalType {
    ELECTRONIC_ONLY("완전 전자기록 (Electronic Original - 21 CFR Part 11)"),
    HYBRID("하이브리드 (화면 전자서명 + 인쇄본 서명부 보관 - DEC-01)"),
    PAPER_ONLY("수기/종이 원본 보관 (시스템은 보조 열람)");

    private final String description;

    OfficialOriginalType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
