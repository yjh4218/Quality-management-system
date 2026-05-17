package com.example.ims.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegulatoryIngredientUpdateDto {
    private String koreanName;
    private String casNumber;
    
    private String krStatus;
    private Double krLimit;
    
    private String euStatus;
    private Double euLimit;
    
    private String cnStatus;
    private Double cnLimit;
    
    private String usStatus;
    private Double usLimit;
    
    private String jpStatus;
    private Double jpLimit;
    
    private String remarks;
    
    @JsonProperty("ingredient_limit_details")
    @Builder.Default
    private List<IngredientLimitDetailDto> ingredientLimitDetails = new ArrayList<>();
}
