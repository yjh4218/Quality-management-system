package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DefectSeverity {
    CRITICAL("치명적 (Critical - 시스템 중단 / 데이터 유실 / 규제 위반)"),
    MAJOR("중대 (Major - 핵심 비즈니스 가드 오작동 / 결재 통제 오류)"),
    MINOR("경미 (Minor - UI/UX 결함 / 표시 오류 / 단순 텍스트)");

    private final String description;
}
