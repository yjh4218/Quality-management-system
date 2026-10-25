package com.example.ims.entity;

import lombok.Getter;

/**
 * 배치/LOT 공정 단계
 * ISO 13485:2016 §7.5.8 / ISO 22716:2007 §8.3
 */
@Getter
public enum BatchStage {
    RAW_MATERIAL("원자재", "배치 제조에 투입되는 원료의약품/원료화합물"),
    PACKAGING("포장재", "1차 충진 용기, 바이알, 앰플, 드롭퍼, 2차 단상자"),
    BULK_PRODUCT("반제품(벌크)", "칭량, 조제, 교반 완료된 벌크 내용물"),
    FINISHED_GOODS("완제품", "충진, 포장, 멸균, 라벨링 완료된 최종 판매 제품"),
    SHIPMENT("출하(유통)", "거래처, 병의원, 유통망으로 출하 유통된 제품");

    private final String description;
    private final String detail;

    BatchStage(String description, String detail) {
        this.description = description;
        this.detail = detail;
    }
}
