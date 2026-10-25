package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CapaCategory {
    PRODUCT_QUALITY("완제품 품질"),
    PACKAGING("용기 / 포장재 / 표시기재"),
    PROCESS_CONTROL("제조 공정 제어"),
    EQUIPMENT_FACILITY("설비 / 장비 / 교정"),
    RAW_MATERIAL("원료 / 부자재"),
    COMPLIANCE("규제 / 표준 / 인허가"),
    DOCUMENTATION("품질 문서 / 기록 관리"),
    ENVIRONMENT_CLEANROOM("환경 모니터링 / 클린룸");

    private final String description;
}
