package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CapaRiskLevel {
    CRITICAL("치명적 (Critical)", "#ef4444"),
    HIGH("높음 (High)", "#f97316"),
    MEDIUM("보통 (Medium)", "#eab308"),
    LOW("낮음 (Low)", "#3b82f6");

    private final String description;
    private final String color;
}
