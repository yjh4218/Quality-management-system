package com.example.ims.entity;

/**
 * 🏭 공급업체 평가 주기 (Evaluation Period)
 */
public enum EvaluationPeriod {
    Q1("1분기 정기평가"),
    Q2("2분기 정기평가"),
    Q3("3분기 정기평가"),
    Q4("4분기 정기평가"),
    ANNUAL("연간 정기 종합평가"),
    SPECIAL("특별/비정기 수시평가");

    private final String description;

    EvaluationPeriod(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
