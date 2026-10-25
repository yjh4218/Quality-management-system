package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum EffectivenessResult {
    NOT_EVALUATED("미평가 (검증 대기)", "#94a3b8"),
    EFFECTIVE("효과적 (목표 달성 - 종결 가능)", "#10b981"),
    PARTIALLY_EFFECTIVE("부분 효과적 (보완 조치 필요)", "#f59e0b"),
    INEFFECTIVE("비효과적 (재발생 - 재조사 필수)", "#ef4444");

    private final String description;
    private final String color;
}
