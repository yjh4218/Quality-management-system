package com.example.ims.entity;

import lombok.Getter;

/**
 * 9가지 제품 유형 (Feature 1)
 */
@Getter
public enum ProductType {
    PET_REGULAR("PET병 - 막캡"),
    PET_ONE_TOUCH("PET병 - 원터치캡"),
    TUBE("튜브 형태"),
    MASK("마스크"),
    PAD_PP("패드 - PP용기"),
    PAD_POUCH("패드 - 파우치"),
    GLASS("유리(초자)"),
    PET_SERUM("PET병 - 세럼(헤비브로우)"),
    ETC("기타");

    private final String description;

    ProductType(String description) {
        this.description = description;
    }
}
