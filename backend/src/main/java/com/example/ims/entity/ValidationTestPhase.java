package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ValidationTestPhase {
    IQ("설치 적격성평가 (Installation Qualification)"),
    OQ("운전 적격성평가 (Operational Qualification)"),
    PQ("성능 적격성평가 (Performance Qualification)");

    private final String description;
}
