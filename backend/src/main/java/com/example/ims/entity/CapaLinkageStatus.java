package com.example.ims.entity;

/**
 * 시정/예방조치(CAPA) 연계 상태
 */
public enum CapaLinkageStatus {
    NOT_REQUIRED("CAPA 불요 (단발성 경미 부적합)"),
    REQUIRED("CAPA 발행 필요 (심의/원인조사 후 확정)"),
    LINKED("CAPA 연계 완료 (CAPA 번호 발번)");

    private final String description;

    CapaLinkageStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
