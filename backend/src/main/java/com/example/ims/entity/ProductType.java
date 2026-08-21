package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

/**
 * 제품 유형 (Feature 1)
 */
@Getter
public enum ProductType {
    SET("기획세트"),
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

    @JsonValue
    public String getDescription() {
        return this.description;
    }

    @JsonCreator
    public static ProductType fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return ETC;
        }
        String trimmed = value.trim();
        for (ProductType type : ProductType.values()) {
            if (type.name().equalsIgnoreCase(trimmed) || 
                type.description.equalsIgnoreCase(trimmed) ||
                (trimmed.contains("기획세트") && type == SET)) {
                return type;
            }
        }
        return ETC;
    }
}

