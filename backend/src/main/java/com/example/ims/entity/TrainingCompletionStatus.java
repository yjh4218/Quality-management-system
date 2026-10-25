package com.example.ims.entity;

/**
 * 🎓 교육이수 상태.
 */
public enum TrainingCompletionStatus {
    SCHEDULED("교육 예정"),
    IN_PROGRESS("진행 중"),
    COMPLETED("이수 완료"),
    FAILED("미달/재평가 필요"),
    EXPIRED("유효기간 만료");

    private final String description;

    TrainingCompletionStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
