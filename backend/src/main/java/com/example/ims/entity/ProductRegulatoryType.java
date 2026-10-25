package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 제품 규제 유형 분류 (화장품 vs 의료기기 vs 일반)
 * ISO 13485:2016 §8.2.2 / ISO 22716:2007 §10
 */
@Getter
@RequiredArgsConstructor
public enum ProductRegulatoryType {
    COSMETIC("화장품", "ISO 22716 / 화장품 안전성 정보 보고 관리 규정"),
    MEDICAL_DEVICE("의료기기", "ISO 13485 / 21 CFR 820.198 고객 불만 및 MDR 관리 규정"),
    GENERAL("일반 공산품", "일반 품질 관리 규정");

    private final String description;
    private final String standardGuide;
}
