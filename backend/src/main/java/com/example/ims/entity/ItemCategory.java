package com.example.ims.entity;

import lombok.Getter;

/**
 * 품목 규제 분류
 */
@Getter
public enum ItemCategory {
    COSMETICS("화장품", "ISO 22716 / 화장품법 관리 품목"),
    MEDICAL_DEVICE("의료기기", "ISO 13485 / 21 CFR 820 관리 품목");

    private final String description;
    private final String detail;

    ItemCategory(String description, String detail) {
        this.description = description;
        this.detail = detail;
    }
}
