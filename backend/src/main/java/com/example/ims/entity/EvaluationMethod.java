package com.example.ims.entity;

/**
 * 🎓 교육훈련 평가 방식.
 */
public enum EvaluationMethod {
    WRITTEN_TEST("필기 시험"),
    PRACTICAL_EVALUATION("실기/현장 평가"),
    REPORT("결과보고서 제출"),
    ATTENDANCE_ONLY("출석 확인");

    private final String description;

    EvaluationMethod(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
