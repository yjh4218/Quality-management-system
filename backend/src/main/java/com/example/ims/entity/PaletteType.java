package com.example.ims.entity;

import lombok.Getter;

/**
 * 채널별 팔레트 종류 (Feature 6)
 */
@Getter
public enum PaletteType {
    AJU("아주팔레트 1,100 x 1,100 mm"),
    WOODEN_FUMIGATED("나무 팔레트 1,200 x 800 mm 훈증 팔레트"),
    DISPOSABLE_EXPORT("수출용 일회용 팔레트");

    private final String description;

    PaletteType(String description) {
        this.description = description;
    }
}
