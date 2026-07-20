package com.example.ims.entity;

/**
 * 기본 제공 필수서류 4종 Enum
 */
public enum DocumentEnumType {
    MSDS(DocumentScope.PRODUCT, RecurrenceType.PERIODIC, 12),
    MANUFACTURING_PROCESS_CHART(DocumentScope.PRODUCT, RecurrenceType.ONE_TIME, 0),
    PRODUCT_STANDARD(DocumentScope.PRODUCT, RecurrenceType.ONE_TIME, 0),
    STABILITY_TEST(DocumentScope.PRODUCT, RecurrenceType.ONE_TIME, 0);

    private final DocumentScope scope;
    private final RecurrenceType recurrenceType;
    private final int periodMonths;

    DocumentEnumType(DocumentScope scope, RecurrenceType recurrenceType, int periodMonths) {
        this.scope = scope;
        this.recurrenceType = recurrenceType;
        this.periodMonths = periodMonths;
    }

    public DocumentScope getScope() {
        return scope;
    }

    public RecurrenceType getRecurrenceType() {
        return recurrenceType;
    }

    public int getPeriodMonths() {
        return periodMonths;
    }

    public String getDescription() {
        switch (this) {
            case MSDS: return "MSDS (물질안전보건자료)";
            case MANUFACTURING_PROCESS_CHART: return "제조공정리스트 / 제조공정도";
            case PRODUCT_STANDARD: return "제품표준서 / 벌크규격서";
            case STABILITY_TEST: return "안정성시험자료";
            default: return this.name();
        }
    }
}
