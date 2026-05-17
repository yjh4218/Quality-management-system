package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientLimitDetailDto {
    private Long id;
    private String country;
    private String productType;
    private Double limitPercent;
    private String conditionText;
    private boolean isManual;
}
