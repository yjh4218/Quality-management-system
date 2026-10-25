package com.example.ims.entity;

/**
 * 🔄 변경 효과성 검증 결과 상태
 */
public enum EffectivenessStatus {
    EFFECTIVE("효과성 입증 (적합)"),
    INEFFICIENT("효과성 미흡 (부적합/재검토)"),
    PENDING("평가 대기 중"),
    NOT_APPLICABLE("해당 없음");

    private final String description;

    EffectivenessStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
