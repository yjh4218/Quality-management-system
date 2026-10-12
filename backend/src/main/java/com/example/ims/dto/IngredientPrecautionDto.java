package com.example.ims.dto;

import lombok.*;
import java.util.List;

public class IngredientPrecautionDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class IngredientInput {
        private String korName;
        private String engName;
        private String inciName;
        private Double contentPercent;
        private Double contentPpm;
        private Double contentPpb;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EvaluateRequest {
        private List<IngredientInput> ingredients;
        private String productCategory; // LEAVE_ON, RINSE_OFF, ALL
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PrecautionItem {
        private Long ruleId;
        private String ingredientName;
        private String matchedName;
        private Double inputPercent;
        private Double inputPpm;
        private String operator;
        private Double thresholdPercent;
        private Double thresholdPpm;
        private String precautionType; // MANDATORY_WARNING, ALLERGEN_LABEL, USAGE_LIMIT
        private String precautionTitle;
        private String precautionContent;
        private String regulationSource;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class IngredientUpdateItem {
        private String inputKorName;
        private String inputEngName;
        private String inputInciName;
        private String matchedKoreanName;
        private String matchedInciName;
        private String casNumber;
        private String krStatus;
        private Double krLimit;
        private String limitClass;
        private String remarks;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EvaluateResponse {
        private int totalIngredients;
        private int matchedPrecautionCount;
        private boolean hasMandatoryWarnings;
        private List<PrecautionItem> precautions;
        private List<IngredientUpdateItem> ingredientUpdates;
    }
}
