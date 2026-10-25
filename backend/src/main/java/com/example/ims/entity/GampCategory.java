package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GampCategory {
    CATEGORY_3_NON_CONFIGURED("카테고리 3: 표준 비설정 소프트웨어 (Non-Configured COTS)"),
    CATEGORY_4_CONFIGURED("카테고리 4: 설정 가능 소프트웨어 (Configured Products)"),
    CATEGORY_5_CUSTOM("카테고리 5: 맞춤 개발 소프트웨어 (Custom Applications / eQMS Bespoke)");

    private final String description;
}
