package com.example.ims.entity;

/**
 * 🏅 직무 자격 유효 상태.
 */
public enum QualificationStatus {
    QUALIFIED("적격 (자격 유효)"),
    CONDITIONAL("조건부 적격 (수습/수퍼비전 대상)"),
    EXPIRED("기한 만료 (재인증 필요)"),
    SUSPENDED("자격 정지");

    private final String description;

    QualificationStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
