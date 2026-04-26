package com.example.ims.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackagingMaterial {

    private String manufacturerContainer; // 용기 업체 제조사
    private String manufacturerLabel; // 라벨 업체 제조사
    private String manufacturerOuterBox; // 단상자 업체 제조사
    private String manufacturerEtc; // 기타 업체 제조사

    private String materialBody; // 몸체
    private Double weightBody;

    private String materialLabel; // 라벨
    private Double weightLabel;

    private String materialCap; // 캡(마개)
    private Double weightCap;

    private String materialSealing; // 실링지
    private Double weightSealing;

    private String materialPump; // 펌프
    private Double weightPump;

    private String materialOuterBox; // 단상자
    private Double weightOuterBox;

    private String materialTool; // 도구
    private Double weightTool;

    private String materialPacking; // 박킹
    private Double weightPacking;

    private String materialEtc; // 기타
    private Double weightEtc;

    @Column(columnDefinition = "TEXT")
    private String materialRemarks; // 비고
}
