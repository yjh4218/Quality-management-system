package com.example.ims.service;

import com.example.ims.dto.ComplianceScanDto;
import com.example.ims.entity.IngredientLimitDetail;
import com.example.ims.entity.RegulatoryIngredient;
import com.example.ims.repository.RegulatoryIngredientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComplianceScanService {

    private final RegulatoryIngredientRepository regulatoryIngredientRepository;

    @Transactional(readOnly = true)
    public ComplianceScanDto.Response scanIngredients(ComplianceScanDto.Request request) {
        if (request.getIngredientsText() == null || request.getIngredientsText().trim().isEmpty()) {
            return ComplianceScanDto.Response.builder()
                    .compliant(true)
                    .items(new ArrayList<>())
                    .build();
        }

        // 1. Parse raw text into tokens
        List<String> rawTokens = Arrays.stream(request.getIngredientsText().split("[,\\n\\r\\t/]+"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());

        if (rawTokens.isEmpty()) {
            return ComplianceScanDto.Response.builder()
                    .compliant(true)
                    .items(new ArrayList<>())
                    .build();
        }

        List<String> searchTokens = rawTokens.stream()
                .map(String::toLowerCase)
                .collect(Collectors.toList());

        // 2. Fetch matches from DB in batch
        List<RegulatoryIngredient> matchedIngredients = regulatoryIngredientRepository.findByNames(searchTokens);

        // Map for fast lookup by name
        Map<String, RegulatoryIngredient> nameMap = new HashMap<>();
        for (RegulatoryIngredient ing : matchedIngredients) {
            if (ing.getKoreanName() != null) {
                nameMap.put(ing.getKoreanName().trim().toLowerCase(), ing);
            }
            if (ing.getInciName() != null) {
                nameMap.put(ing.getInciName().trim().toLowerCase(), ing);
            }
        }

        List<ComplianceScanDto.ResultItem> scanResults = new ArrayList<>();
        boolean isCompliant = true;

        List<String> targetCountries = request.getCountries() == null || request.getCountries().isEmpty()
                ? List.of("KR") // Default to Korea
                : request.getCountries();

        // 3. Evaluate each input token
        for (String originalToken : rawTokens) {
            String lowerToken = originalToken.toLowerCase();
            RegulatoryIngredient ingredient = nameMap.get(lowerToken);

            if (ingredient != null) {
                // Check status for each target country
                for (String country : targetCountries) {
                    ComplianceScanDto.ResultItem item = evaluateCompliance(originalToken, ingredient, country, request.getProductType());
                    if (item != null) {
                        scanResults.add(item);
                        if ("CRITICAL".equals(item.getStatus())) {
                            isCompliant = false;
                        }
                    }
                }
            }
        }

        return ComplianceScanDto.Response.builder()
                .compliant(isCompliant)
                .items(scanResults)
                .build();
    }

    private ComplianceScanDto.ResultItem evaluateCompliance(String originalToken, RegulatoryIngredient ingredient, String country, String productType) {
        String status = "SAFE"; // SAFE, WARNING, CRITICAL
        String restrictionType = "ALLOWED";
        Double limitPercent = null;
        String conditionText = "";

        // First, check Advanced limit details from database (joined details)
        if (ingredient.getLimitDetails() != null && !ingredient.getLimitDetails().isEmpty()) {
            for (IngredientLimitDetail detail : ingredient.getLimitDetails()) {
                if (country.equalsIgnoreCase(detail.getCountry())) {
                    // Match product type if specified
                    if (productType == null || detail.getProductType() == null || 
                        productType.equalsIgnoreCase(detail.getProductType())) {
                        
                        limitPercent = detail.getLimitPercent();
                        conditionText = detail.getConditionText();
                        
                        if (limitPercent != null && limitPercent == 0.0) {
                            status = "CRITICAL";
                            restrictionType = "BANNED";
                        } else if (limitPercent != null) {
                            status = "WARNING";
                            restrictionType = "RESTRICTED";
                        }
                        
                        return ComplianceScanDto.ResultItem.builder()
                                .inputName(originalToken)
                                .matchedKoreanName(ingredient.getKoreanName())
                                .matchedInciName(ingredient.getInciName())
                                .casNumber(ingredient.getCasNumber())
                                .status(status)
                                .country(country.toUpperCase())
                                .restrictionType(restrictionType)
                                .limitPercentage(limitPercent)
                                .conditionText(conditionText)
                                .build();
                    }
                }
            }
        }

        // Fallback to column-based simple rules on RegulatoryIngredient
        String targetStatus = null;
        Double targetLimit = null;

        switch (country.toUpperCase()) {
            case "EU":
                targetStatus = ingredient.getEuStatus();
                targetLimit = ingredient.getEuLimit();
                break;
            case "CN":
                targetStatus = ingredient.getCnStatus();
                targetLimit = ingredient.getCnLimit();
                break;
            case "US":
                targetStatus = ingredient.getUsStatus();
                targetLimit = ingredient.getUsLimit();
                break;
            case "JP":
                targetStatus = ingredient.getJpStatus();
                targetLimit = ingredient.getJpLimit();
                break;
            case "KR":
            default:
                targetStatus = ingredient.getKrStatus();
                targetLimit = ingredient.getKrLimit();
                break;
        }

        if (targetStatus != null) {
            restrictionType = targetStatus.toUpperCase();
            if (restrictionType.contains("PROHIBITED") || restrictionType.contains("BANNED") || restrictionType.contains("금지")) {
                status = "CRITICAL";
                restrictionType = "BANNED";
            } else if (restrictionType.contains("RESTRICTED") || restrictionType.contains("제한") || targetLimit != null) {
                status = "WARNING";
                restrictionType = "RESTRICTED";
                limitPercent = targetLimit;
            }
        }

        if (!"SAFE".equals(status)) {
            return ComplianceScanDto.ResultItem.builder()
                    .inputName(originalToken)
                    .matchedKoreanName(ingredient.getKoreanName())
                    .matchedInciName(ingredient.getInciName())
                    .casNumber(ingredient.getCasNumber())
                    .status(status)
                    .country(country.toUpperCase())
                    .restrictionType(restrictionType)
                    .limitPercentage(limitPercent)
                    .conditionText(ingredient.getRemarks())
                    .build();
        }

        return null; // Safe items that have no special restrictions can be skipped or included as SAFE
    }
}
