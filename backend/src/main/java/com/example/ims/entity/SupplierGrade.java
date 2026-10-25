package com.example.ims.entity;

/**
 * 🏭 공급업체 평가 등급 (Supplier Grade)
 * 종합점수 기준: A(90+), B(80~89), C(70~79), D(<70)
 */
public enum SupplierGrade {
    GRADE_A("A등급 (우수 - 90점 이상)"),
    GRADE_B("B등급 (양호 - 80~89점)"),
    GRADE_C("C등급 (주의/조건부 - 70~79점)"),
    GRADE_D("D등급 (부적격 - 70점 미만)");

    private final String description;

    SupplierGrade(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    public static SupplierGrade calculateGrade(int totalScore) {
        if (totalScore >= 90) return GRADE_A;
        if (totalScore >= 80) return GRADE_B;
        if (totalScore >= 70) return GRADE_C;
        return GRADE_D;
    }
}
