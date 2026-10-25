package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CapaSourceType {
    COMPLAINT_SAFETY("고객 불만 / 이상사례"),
    NCR("부적합품 (NCR)"),
    SUPPLIER_AUDIT("공급업체 / 제조사 심사"),
    CHANGE_CONTROL("변경관리 (Change Control)"),
    INTERNAL_AUDIT("내부감사 / 자체점검"),
    INSPECTION_DEFECT("품질 검사 일탈"),
    REGULATORY_FINDING("규제기관 지적사항"),
    AD_HOC("자체 발굴 / 상시 개선");

    private final String description;
}
