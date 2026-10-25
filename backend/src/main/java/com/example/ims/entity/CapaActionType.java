package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CapaActionType {
    CORRECTIVE("시정조치 (재발 방지)"),
    PREVENTIVE("예방조치 (수평 전개)"),
    CONTAINMENT("임시 봉쇄조치 (격리/HOLD)"),
    DOCUMENT_REVISION("문서 / 절차서 개정"),
    TRAINING("교육훈련 및 자격부여");

    private final String description;
}
