package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CapaStatus {
    INITIATED("발의 / 접수", "#3b82f6"),
    UNDER_INVESTIGATION("원인조사 중", "#8b5cf6"),
    ACTION_PLANNING("조치계획 수립", "#f59e0b"),
    IMPLEMENTATION("조치 실행 중", "#06b6d4"),
    EFFECTIVENESS_REVIEW("효과성 검증 중", "#ec4899"),
    CLOSED("공식 종결", "#10b981"),
    VOID("무효화", "#64748b");

    private final String description;
    private final String color;
}
