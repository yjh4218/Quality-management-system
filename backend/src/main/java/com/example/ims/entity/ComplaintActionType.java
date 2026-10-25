package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 불만 및 이상사례 후속 조치 과제 유형
 * ISO 13485:2016 §8.2.2 / 21 CFR 820.198
 */
@Getter
@RequiredArgsConstructor
public enum ComplaintActionType {
    CUSTOMER_FEEDBACK("고객 안내 및 보상", "소비자 또는 의료기관에 검사 결과 안내 및 보상/회신 진행"),
    SAMPLE_TESTING("보존검체 / 회수품 시험", "동일 로트 보존 검체 또는 고객 회수 제품의 미생물/이화학/기계적 시험"),
    MFR_NOTIFICATION("제조사 시정 요구 통보", "제조업체에 원인 분석 요청 및 공정 개선 요구서 발송"),
    AUTHORITY_REPORT("식약처 / 규제당국 보고", "식약처 의약품안전나라 또는 FDA MDR 시스템에 공식 보고서 제출"),
    LABEL_REVISION("표시기재 및 주의사항 개정", "사용상 주의사항, 전성분 표기 또는 사용 설명서 개정 검토"),
    RECALL_REVIEW("제품 회수(Recall) 심의", "동일 로트 또는 영향 제품의 유통 차단 및 회수 심의 위원회 상정"),
    CAPA_INITIATION("CAPA 시정예방조치 발의", "근본 원인 제거를 위한 16단계 시정 및 예방조치(CAPA) 공식 개시");

    private final String label;
    private final String description;
}
