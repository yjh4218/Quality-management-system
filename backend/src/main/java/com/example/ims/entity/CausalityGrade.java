package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 이상사례 인과관계 평가 등급
 * WHO-UMC (세계보건기구 웁살라 모니터링 센터) 및 대한민국 식품의약품안전처 인과관계 평가 기준
 */
@Getter
@RequiredArgsConstructor
public enum CausalityGrade {
    CERTAIN("확실함 (Certain)", "사용 후 증상 발현의 시간적 선후관계가 명확하고, 제품 중단/재시험 또는 검체 분석으로 제품 기인이 명백함"),
    PROBABLE("가능성 높음 (Probable)", "합리적인 시간적 관계가 있으며, 기저 질환이나 타 제품 등 대체 원인으로 설명하기 어려움"),
    POSSIBLE("가능함 (Possible)", "합리적인 시간적 관계가 있으나, 다른 화장품/약물 또는 환경적 요인에 의한 가능성을 완전히 배제할 수 없음"),
    UNLIKELY("관련성 적음 (Unlikely)", "시간적 관계가 일치하지 않거나, 환자의 기존 병력/기저 질환 등 타 원인에 의한 가능성이 훨씬 큼"),
    CONDITIONAL("조건부 / 평가중 (Conditional)", "정확한 평가를 위해 검체 분석 또는 의학적 추가 자료가 더 요구되는 상태"),
    UNASSESSABLE("평가 불가 (Unassessable)", "정보가 불충분하거나 모순되어 인과관계를 의학적으로 판정할 수 없음"),
    EVALUATING("평가 대기 / 접수", "초기 접수 후 품질/안전성 팀에서 검토를 개시하는 단계");

    private final String label;
    private final String criteria;
}
