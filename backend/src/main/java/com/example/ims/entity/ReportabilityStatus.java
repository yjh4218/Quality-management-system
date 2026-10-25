package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 규제기관(식약처 / FDA MDR) 보고 대상 여부
 * 화장품법 제5조의2 (신속보고 15일) / 21 CFR 820.198(a)(3) & 21 CFR 803 MDR
 */
@Getter
@RequiredArgsConstructor
public enum ReportabilityStatus {
    NOT_REPORTABLE("보고 비대상", "경미한 이상사례 또는 제품 무관으로 법정 보고 기준에 해당하지 않음"),
    REPORTABLE("보고 대상 (기한 내 보고 필요)", "중대한 유해사례 또는 MDR 기준으로 관할 규제당국에 법정 기한 내 보고해야 함"),
    REPORTED("규제기관 보고 완료", "식약처 또는 FDA에 정식 보고서 제출 및 접수 완료됨"),
    EXEMPT("법적 보고 면제", "전문가 위원회 심의 결과 법적 보고 의무가 면제됨");

    private final String label;
    private final String description;
}
