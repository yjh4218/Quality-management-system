package com.example.ims.entity;

public enum SignatureMeaning {
    AUTHOR("작성 완료 (Author/Created)"),
    REVIEWER("기술 및 절차 검토 완료 (Reviewed)"),
    APPROVER("부서장 승인 (Approved)"),
    QUALITY_AUTHORITY("품질책임자 최종 인가 (Quality Authority Release)"),
    WITNESS("입회 및 시험 확인 (Witness/Verified)");

    private final String description;

    SignatureMeaning(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
