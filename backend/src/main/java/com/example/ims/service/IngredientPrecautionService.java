package com.example.ims.service;

import com.example.ims.dto.IngredientPrecautionDto;
import com.example.ims.entity.IngredientPrecautionRule;
import com.example.ims.repository.IngredientPrecautionRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class IngredientPrecautionService {

    private final IngredientPrecautionRuleRepository ruleRepository;

    @Transactional(readOnly = true)
    public IngredientPrecautionDto.EvaluateResponse evaluatePrecautions(IngredientPrecautionDto.EvaluateRequest request) {
        if (request == null || request.getIngredients() == null || request.getIngredients().isEmpty()) {
            return IngredientPrecautionDto.EvaluateResponse.builder()
                    .totalIngredients(0)
                    .matchedPrecautionCount(0)
                    .hasMandatoryWarnings(false)
                    .precautions(Collections.emptyList())
                    .build();
        }

        try {
            List<IngredientPrecautionDto.IngredientInput> ingredients = request.getIngredients();
            String targetCategory = request.getProductCategory() != null ? request.getProductCategory().trim().toUpperCase() : "ALL";

            // 1. 활성화된 룰 목록 전체 조회 (마스터 룰셋은 수십~수백 건 수준으로 인메모리 매칭이 가장 안전하고 빠름)
            List<IngredientPrecautionRule> activeRules = ruleRepository.findByIsActiveTrue();
            if (activeRules == null || activeRules.isEmpty()) {
                return IngredientPrecautionDto.EvaluateResponse.builder()
                        .totalIngredients(ingredients.size())
                        .matchedPrecautionCount(0)
                        .hasMandatoryWarnings(false)
                        .precautions(Collections.emptyList())
                        .build();
            }

            // 2. 성분별 룰 평가 및 매칭
            List<IngredientPrecautionDto.PrecautionItem> evaluatedItems = new ArrayList<>();
            boolean hasMandatory = false;

            for (IngredientPrecautionDto.IngredientInput ing : ingredients) {
                if (ing == null) continue;

                String kor = ing.getKorName() != null ? ing.getKorName().trim().toLowerCase() : "";
                String eng = ing.getEngName() != null ? ing.getEngName().trim().toLowerCase() : "";
                String inci = ing.getInciName() != null ? ing.getInciName().trim().toLowerCase() : "";

                if (kor.isEmpty() && eng.isEmpty() && inci.isEmpty()) continue;

                Double percent = ing.getContentPercent();
                Double ppm = ing.getContentPpm();

                // percent나 ppm이 상호 보완되도록 처리 (1% = 10,000 ppm)
                if (percent != null && ppm == null) {
                    ppm = percent * 10000.0;
                } else if (ppm != null && percent == null) {
                    percent = ppm / 10000.0;
                }

                for (IngredientPrecautionRule rule : activeRules) {
                    if (rule == null) continue;

                    String ruleKr = rule.getIngredientNameKr() != null ? rule.getIngredientNameKr().trim().toLowerCase() : "";
                    String ruleEn = rule.getIngredientNameEn() != null ? rule.getIngredientNameEn().trim().toLowerCase() : "";

                    boolean nameMatched = (!ruleKr.isEmpty() && (ruleKr.equals(kor) || kor.contains(ruleKr) || (!ruleKr.isEmpty() && kor.equals(ruleKr)))) ||
                                          (!ruleEn.isEmpty() && (ruleEn.equals(eng) || ruleEn.equals(inci) || (!eng.isEmpty() && eng.contains(ruleEn)) || (!inci.isEmpty() && inci.contains(ruleEn))));

                    if (!nameMatched) {
                        continue;
                    }

                    // 카테고리 필터링 (ALL이거나 일치하는 경우)
                    if (rule.getProductCategory() != null && 
                        !"ALL".equalsIgnoreCase(rule.getProductCategory()) && 
                        !"ALL".equalsIgnoreCase(targetCategory) && 
                        !rule.getProductCategory().equalsIgnoreCase(targetCategory)) {
                        continue;
                    }

                    // 조건 평가 (operator & threshold)
                    boolean conditionMet = evaluateCondition(rule.getOperator(), percent, ppm, rule.getThresholdPercent(), rule.getThresholdPpm());

                    if (conditionMet) {
                        if ("MANDATORY_WARNING".equalsIgnoreCase(rule.getPrecautionType())) {
                            hasMandatory = true;
                        }

                        evaluatedItems.add(IngredientPrecautionDto.PrecautionItem.builder()
                                .ruleId(rule.getId())
                                .ingredientName(ing.getKorName() != null && !ing.getKorName().isEmpty() ? ing.getKorName() : (ing.getInciName() != null ? ing.getInciName() : ing.getEngName()))
                                .matchedName(rule.getIngredientNameKr())
                                .inputPercent(percent)
                                .inputPpm(ppm)
                                .operator(rule.getOperator())
                                .thresholdPercent(rule.getThresholdPercent())
                                .thresholdPpm(rule.getThresholdPpm())
                                .precautionType(rule.getPrecautionType())
                                .precautionTitle(rule.getPrecautionTitle())
                                .precautionContent(rule.getPrecautionContent())
                                .regulationSource(rule.getRegulationSource())
                                .build());
                    }
                }
            }

            // 중복 제거 (ruleId + 성분명 기준)
            List<IngredientPrecautionDto.PrecautionItem> distinctItems = evaluatedItems.stream()
                    .collect(Collectors.toMap(
                            item -> (item.getRuleId() != null ? item.getRuleId() : 0L) + "_" + item.getIngredientName(),
                            item -> item,
                            (existing, replacement) -> existing
                    ))
                    .values()
                    .stream()
                    .collect(Collectors.toList());

            return IngredientPrecautionDto.EvaluateResponse.builder()
                    .totalIngredients(ingredients.size())
                    .matchedPrecautionCount(distinctItems.size())
                    .hasMandatoryWarnings(hasMandatory)
                    .precautions(distinctItems)
                    .build();

        } catch (Exception e) {
            log.error("[IngredientPrecautionService] Evaluation failed:", e);
            return IngredientPrecautionDto.EvaluateResponse.builder()
                    .totalIngredients(request.getIngredients().size())
                    .matchedPrecautionCount(0)
                    .hasMandatoryWarnings(false)
                    .precautions(Collections.emptyList())
                    .build();
        }
    }

    private boolean evaluateCondition(String operator, Double inputPercent, Double inputPpm, Double thresholdPercent, Double thresholdPpm) {
        if (operator == null || "ALWAYS".equalsIgnoreCase(operator)) {
            return true;
        }

        // percent 기준 비교 우선
        if (thresholdPercent != null && inputPercent != null) {
            switch (operator.toUpperCase()) {
                case "GT":
                    return inputPercent > thresholdPercent;
                case "GTE":
                    return inputPercent >= thresholdPercent;
                case "LT":
                    return inputPercent < thresholdPercent;
                case "LTE":
                    return inputPercent <= thresholdPercent;
                case "EQ":
                    return Math.abs(inputPercent - thresholdPercent) < 0.00001;
                default:
                    return inputPercent >= thresholdPercent;
            }
        }

        // ppm 기준 비교
        if (thresholdPpm != null && inputPpm != null) {
            switch (operator.toUpperCase()) {
                case "GT":
                    return inputPpm > thresholdPpm;
                case "GTE":
                    return inputPpm >= thresholdPpm;
                case "LT":
                    return inputPpm < thresholdPpm;
                case "LTE":
                    return inputPpm <= thresholdPpm;
                case "EQ":
                    return Math.abs(inputPpm - thresholdPpm) < 0.00001;
                default:
                    return inputPpm >= thresholdPpm;
            }
        }

        // 함량 정보가 없으나 룰이 존재하는 경우 경고성으로 매칭
        return true;
    }
}
