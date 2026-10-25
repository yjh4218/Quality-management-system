package com.example.ims.entity;

public enum ChecklistResult {
    CONFORMING("적합"),
    NON_CONFORMING("부적합"),
    NOT_APPLICABLE("해당없음 (N/A)");

    private final String description;

    ChecklistResult(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
