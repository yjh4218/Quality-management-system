package com.example.ims.entity;

/**
 * 부적합 발생 단계/영역 (ISO 13485:2016 §8.3 / ISO 22716:2007 §8.4)
 */
public enum NcrOccurrenceStage {
    INCOMING_INSPECTION("입고 검사 (원자재/부자재)"),
    IN_PROCESS("제조공정 (조제/충진/포장)"),
    FINAL_RELEASE("완제품 검사 및 출하 승인"),
    STORAGE_STABILITY("보관창고 및 안정성 시험"),
    MARKET_COMPLAINT("시판 후 불만 및 반품"),
    SUPPLIER_AUDIT("공급업체 평가 및 정기실사"),
    OTHER("기타");

    private final String description;

    NcrOccurrenceStage(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
