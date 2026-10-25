package com.example.ims.entity;

/**
 * 🎓 교육훈련 효과성 평가 결과 (ISO 13485:2016 §6.2(c) 요구사항).
 */
public enum EffectivenessEvaluation {
    EFFECTIVE("유효함 (업무 역량 입증)"),
    NEEDS_RETRAINING("재교육 필요 (현장 부적합 발생 등)"),
    PENDING("효과성 평가 대기");

    private final String description;

    EffectivenessEvaluation(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
