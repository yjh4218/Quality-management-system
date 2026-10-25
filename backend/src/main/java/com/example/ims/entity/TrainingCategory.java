package com.example.ims.entity;

/**
 * 🎓 교육훈련 구분 카테고리.
 * ISO 13485:2016 §6.2, ISO 22716 §3 및 관련 규격 분류.
 */
public enum TrainingCategory {
    GMP("화장품 우수제조관리기준 (GMP)"),
    MEDICAL_DEVICE("의료기기 품질경영/규제 (ISO 13485)"),
    SECURITY("정보보안 및 전자기록 (21 CFR Part 11)"),
    SAFETY("산업안전 및 보건위생"),
    QUALITY_GENERAL("품질경영 일반 (CAPA/위험관리/내부심사)");

    private final String description;

    TrainingCategory(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
