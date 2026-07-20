package com.example.ims.entity;

/**
 * 커스텀 서류 및 기본 서류 갱신 주기 세부 Enum
 */
public enum DocumentPeriod {
    WEEKLY(0),
    MONTHLY(1),
    QUARTERLY(3),
    HALF_YEARLY(6),
    YEARLY(12);

    private final int months;

    DocumentPeriod(int months) {
        this.months = months;
    }

    public int getMonths() {
        return this.months;
    }
}
