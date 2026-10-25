package com.example.ims.entity;

/**
 * 통제문서 라이프사이클 상태 (Document Lifecycle Status).
 * ISO 13485 §4.2.4 및 ISO 22716 §17에 부합하는 문서 관리 라이프사이클을 제공합니다.
 */
public enum ControlledDocStatus {
    DRAFT("작성중", false),
    UNDER_REVIEW("검토중", false),
    APPROVED("승인완료", false),
    EFFECTIVE("배포/유효", true),
    SUPERSEDED("개정대체", false),
    OBSOLETE("폐기", false);

    private final String description;
    private final boolean isCurrentEffective;

    ControlledDocStatus(String description, boolean isCurrentEffective) {
        this.description = description;
        this.isCurrentEffective = isCurrentEffective;
    }

    public String getDescription() {
        return description;
    }

    public boolean isCurrentEffective() {
        return isCurrentEffective;
    }
}
