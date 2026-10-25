package com.example.ims.entity;

public enum RecordCategory {
    SPECIFICATION("제품표준서 및 기준규격서 (Specification)"),
    BATCH_RECORD("제조지시 및 제조기록서 (Batch Production Record)"),
    TEST_REPORT("원자재 및 완제품 시험성적서 (Test Certificate/COA)"),
    RELEASE_RECORD("출하승인 및 적합판정서 (Market Release Record)"),
    CHANGE_RECORD("변경관리 및 영향평가서 (Change Control Record)"),
    CAPA_RECORD("시정 및 예방조치 보고서 (CAPA Record)"),
    NCR_RECORD("부적합품 보고서 (NCR Record)"),
    AUDIT_RECORD("내부심사 및 경영검토 기록서 (Internal Audit & MR)"),
    FACILITY_RECORD("설비적격성 및 검교정 성적서 (Equipment & Calibration)"),
    COMPLAINT_RECORD("고객불만 및 이상사례 보고서 (Complaint & Vigilance)"),
    TRAINING_RECORD("교육훈련 및 자격인정서 (Training & Qualification)");

    private final String description;

    RecordCategory(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
