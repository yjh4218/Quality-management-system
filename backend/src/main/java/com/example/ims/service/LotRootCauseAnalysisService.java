package com.example.ims.service;

import com.example.ims.dto.LotPpmAnalysisDto;
import com.example.ims.dto.LotPpmAnalysisDto.LotPpmStatus;
import com.example.ims.entity.Claim;
import com.example.ims.entity.WmsInbound;
import com.example.ims.repository.ClaimRepository;
import com.example.ims.repository.WmsInboundRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LotRootCauseAnalysisService {

    private final ClaimRepository claimRepository;
    private final WmsInboundRepository wmsInboundRepository;

    /**
     * 입고-클레임 연동 PPM 분석 및 LOT 근본원인 (통계적 이상) 판정
     *
     * @param itemCode  선택적 품목코드 검색
     * @param startDate 조회 시작일
     * @param endDate   조회 종료일
     * @return LOT별 PPM 분석 결과 리스트 (통계적 이상, 정상, 샘플 부족, LOT 미확인 요약 포함)
     */
    public List<LotPpmAnalysisDto> analyzeLotPpm(String itemCode, LocalDate startDate, LocalDate endDate) {
        return analyzeLotPpm(itemCode, null, null, startDate, endDate, false);
    }

    public List<LotPpmAnalysisDto> analyzeLotPpm(String itemCode, String productName, String lotNumber, LocalDate startDate, LocalDate endDate, boolean groupByMaster) {
        try {
            LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : LocalDateTime.now().minusMonths(6);
            LocalDateTime endDateTime = endDate != null ? endDate.atTime(23, 59, 59) : LocalDateTime.now();

        // 1. 기간 내 WmsInbound (입고 정보) 조회 - DB 조건 쿼리 활용
        List<WmsInbound> inbounds = wmsInboundRepository.findByInboundDateBetween(startDateTime, endDateTime).stream()
                .filter(i -> !i.isDeleted())
                .filter(i -> itemCode == null || itemCode.trim().isEmpty() || itemCode.trim().equalsIgnoreCase(i.getItemCode()))
                .filter(i -> productName == null || productName.trim().isEmpty() || (i.getProductName() != null && i.getProductName().toLowerCase().contains(productName.trim().toLowerCase())))
                .filter(i -> lotNumber == null || lotNumber.trim().isEmpty() || (i.getLotNumber() != null && i.getLotNumber().toLowerCase().contains(lotNumber.trim().toLowerCase())))
                .collect(Collectors.toList());

        // 2. 기간 내 Claim (클레임 정보) 조회 - DB 조건 쿼리 활용
        LocalDate claimStartDate = startDate != null ? startDate : LocalDate.now().minusMonths(6);
        LocalDate claimEndDate = endDate != null ? endDate : LocalDate.now();
        List<Claim> claims = claimRepository.findByReceiptDateBetween(claimStartDate, claimEndDate).stream()
                .filter(c -> !c.isDeleted())
                .filter(c -> itemCode == null || itemCode.trim().isEmpty() || itemCode.trim().equalsIgnoreCase(c.getItemCode()))
                .filter(c -> productName == null || productName.trim().isEmpty() || (c.getProductName() != null && c.getProductName().toLowerCase().contains(productName.trim().toLowerCase())))
                .filter(c -> lotNumber == null || lotNumber.trim().isEmpty() || (c.getLotNumber() != null && c.getLotNumber().toLowerCase().contains(lotNumber.trim().toLowerCase())))
                .collect(Collectors.toList());

        // 3. LOT별 입고 수량 집계
        Map<String, LotAggregate> lotMap = new HashMap<>();

        for (WmsInbound inbound : inbounds) {
            String lot = inbound.getLotNumber() != null ? inbound.getLotNumber().trim() : "";
            if (lot.isEmpty()) continue;

            String groupKey = groupByMaster 
                    ? cleanMasterName(inbound.getProductName()) + ":" + lot 
                    : inbound.getItemCode() + ":" + lot;

            String displayItemCode = groupByMaster ? "MASTER-GROUP" : inbound.getItemCode();
            String displayProductName = groupByMaster ? cleanMasterName(inbound.getProductName()) : inbound.getProductName();

            LotAggregate agg = lotMap.computeIfAbsent(groupKey, k -> new LotAggregate(displayItemCode, displayProductName, lot));
            agg.inboundQty += (inbound.getQuantity() != null ? inbound.getQuantity() : 0);
        }

        // 4. LOT별 클레임 불량 수량 및 건수 집계 (입고 데이터가 없어도 LOT 번호가 있으면 항목 생성)
        long unassignedClaimQty = 0;
        int unassignedClaimCount = 0;

        for (Claim claim : claims) {
            String lot = claim.getLotNumber() != null ? claim.getLotNumber().trim() : "";
            int occQty = claim.getOccurrenceQty() != null ? claim.getOccurrenceQty() : 1;

            if (!lot.isEmpty()) {
                String groupKey = groupByMaster 
                        ? cleanMasterName(claim.getProductName()) + ":" + lot 
                        : claim.getItemCode() + ":" + lot;

                String displayItemCode = groupByMaster ? "MASTER-GROUP" : claim.getItemCode();
                String displayProductName = groupByMaster ? cleanMasterName(claim.getProductName()) : claim.getProductName();

                LotAggregate agg = lotMap.computeIfAbsent(groupKey, k -> new LotAggregate(displayItemCode, displayProductName, lot));
                agg.claimQty += occQty;
                agg.claimCount += 1;
            } else {
                unassignedClaimQty += occQty;
                unassignedClaimCount += 1;
            }
        }

        // 5. 품목/마스터 기준별 Baseline PPM 산출
        Map<String, Double> baselinePpmMap = new HashMap<>();
        Map<String, Long> itemTotalInbound = new HashMap<>();
        Map<String, Long> itemTotalClaim = new HashMap<>();

        for (LotAggregate agg : lotMap.values()) {
            String baseKey = groupByMaster ? agg.productName : agg.itemCode;
            itemTotalInbound.put(baseKey, itemTotalInbound.getOrDefault(baseKey, 0L) + agg.inboundQty);
            itemTotalClaim.put(baseKey, itemTotalClaim.getOrDefault(baseKey, 0L) + agg.claimQty);
        }

        for (String code : itemTotalInbound.keySet()) {
            long totalInbound = itemTotalInbound.get(code);
            long totalClaim = itemTotalClaim.getOrDefault(code, 0L);
            double basePpm = totalInbound > 0 ? ((double) totalClaim / totalInbound) * 1_000_000.0 : 0.0;
            baselinePpmMap.put(code, basePpm);
        }

        // 6. 통계적 유의성 검정 (2-Proportion Z-Test / Wilson Score 기반) 및 DTO 변환
        List<LotPpmAnalysisDto> resultList = new ArrayList<>();

        for (LotAggregate agg : lotMap.values()) {
            String baseKey = groupByMaster ? agg.productName : agg.itemCode;
            double baselinePpm = baselinePpmMap.getOrDefault(baseKey, 0.0);
            double ppm = agg.inboundQty > 0 ? ((double) agg.claimQty / agg.inboundQty) * 1_000_000.0 : 0.0;

            LotPpmStatus status;
            String statusMessage;
            double zScore = 0.0;

            if (agg.inboundQty < 30) {
                status = LotPpmStatus.INSUFFICIENT_SAMPLE;
                statusMessage = "샘플 부족 (입고량 " + agg.inboundQty + "개 < 30개 기준) - 통계 판단 보류";
            } else {
                double p0 = baselinePpm / 1_000_000.0;
                double p = (double) agg.claimQty / agg.inboundQty;

                if (p0 <= 0 || p <= p0) {
                    status = LotPpmStatus.NORMAL;
                    statusMessage = "정상 (허용 불량률 범위 이내)";
                } else {
                    double standardError = Math.sqrt((p0 * (1.0 - p0)) / agg.inboundQty);
                    if (standardError > 0) {
                        zScore = (p - p0) / standardError;
                    }

                    if (zScore >= 1.645) {
                        status = LotPpmStatus.STATISTICAL_ANOMALY;
                        statusMessage = String.format("통계적 이상 (Baseline 대비 Z=%.2f ≥ 1.65, 95%% 신뢰수준 이상 유의미한 불량)", zScore);
                    } else {
                        status = LotPpmStatus.NORMAL;
                        statusMessage = "정상 (통계적 표집 오차 범위 이내)";
                    }
                }
            }

            resultList.add(LotPpmAnalysisDto.builder()
                    .itemCode(agg.itemCode)
                    .productName(agg.productName)
                    .masterProductName(cleanMasterName(agg.productName))
                    .lotNumber(agg.lotNumber)
                    .inboundQty(agg.inboundQty)
                    .claimQty(agg.claimQty)
                    .claimCount(agg.claimCount)
                    .ppm(Math.round(ppm * 100.0) / 100.0)
                    .baselinePpm(Math.round(baselinePpm * 100.0) / 100.0)
                    .zScore(Math.round(zScore * 100.0) / 100.0)
                    .status(status)
                    .statusMessage(statusMessage)
                    .build());
        }

        // 7. LOT 미확인 클레임 요약 항목 추가
        if (unassignedClaimQty > 0 || unassignedClaimCount > 0) {
            resultList.add(LotPpmAnalysisDto.builder()
                    .itemCode(itemCode != null ? itemCode : "ALL")
                    .productName("LOT 미확인 클레임 요약")
                    .masterProductName("LOT 미확인 클레임 요약")
                    .lotNumber("LOT 미확인")
                    .inboundQty(0)
                    .claimQty(unassignedClaimQty)
                    .claimCount(unassignedClaimCount)
                    .ppm(0.0)
                    .baselinePpm(0.0)
                    .zScore(0.0)
                    .status(LotPpmStatus.INSUFFICIENT_SAMPLE)
                    .statusMessage("입고 LOT 정보와 매칭되지 않은 클레임 " + unassignedClaimCount + "건 (총 " + unassignedClaimQty + "개)")
                    .build());
        }

        resultList.sort((a, b) -> {
            if (a.getStatus() != b.getStatus()) {
                return Integer.compare(getStatusOrder(a.getStatus()), getStatusOrder(b.getStatus()));
            }
            return Double.compare(b.getPpm(), a.getPpm());
        });

        return resultList;
        } catch (Exception e) {
            log.error("Failed to analyze lot PPM: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * 월별 클레임율 추이, 제품별 PPM 순위, 클레임 유형별 비중 통합 요약 통계
     */
    public com.example.ims.dto.QualityAnalyticsSummaryDto getQualityAnalyticsSummary(LocalDate startDate, LocalDate endDate) {
        try {
            LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : LocalDateTime.now().minusMonths(6);
            LocalDateTime endDateTime = endDate != null ? endDate.atTime(23, 59, 59) : LocalDateTime.now();

        // 1. Inbounds & Claims 조회 - DB 조건 쿼리 활용
        List<WmsInbound> inbounds = wmsInboundRepository.findByInboundDateBetween(startDateTime, endDateTime).stream()
                .filter(i -> !i.isDeleted())
                .collect(Collectors.toList());

        LocalDate claimStartDate = startDate != null ? startDate : LocalDate.now().minusMonths(6);
        LocalDate claimEndDate = endDate != null ? endDate : LocalDate.now();
        List<Claim> claims = claimRepository.findByReceiptDateBetween(claimStartDate, claimEndDate).stream()
                .filter(c -> !c.isDeleted())
                .collect(Collectors.toList());

        // 2. 월별 입고/클레임 집계 (YYYY-MM)
        Map<String, Long> monthlyInboundMap = new TreeMap<>();
        Map<String, Long> monthlyClaimQtyMap = new TreeMap<>();
        Map<String, Integer> monthlyClaimCountMap = new TreeMap<>();

        for (WmsInbound inbound : inbounds) {
            String monthKey = inbound.getInboundDate().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
            monthlyInboundMap.put(monthKey, monthlyInboundMap.getOrDefault(monthKey, 0L) + (inbound.getQuantity() != null ? inbound.getQuantity() : 0));
        }

        for (Claim claim : claims) {
            String monthKey = claim.getReceiptDate().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
            int qty = claim.getOccurrenceQty() != null ? claim.getOccurrenceQty() : 1;
            monthlyClaimQtyMap.put(monthKey, monthlyClaimQtyMap.getOrDefault(monthKey, 0L) + qty);
            monthlyClaimCountMap.put(monthKey, monthlyClaimCountMap.getOrDefault(monthKey, 0) + 1);
        }

        Set<String> allMonths = new TreeSet<>(monthlyInboundMap.keySet());
        allMonths.addAll(monthlyClaimQtyMap.keySet());

        List<com.example.ims.dto.QualityAnalyticsSummaryDto.MonthlyPpmItem> monthlyList = new ArrayList<>();
        for (String m : allMonths) {
            long inQty = monthlyInboundMap.getOrDefault(m, 0L);
            long clQty = monthlyClaimQtyMap.getOrDefault(m, 0L);
            int clCount = monthlyClaimCountMap.getOrDefault(m, 0);
            double ppm = inQty > 0 ? ((double) clQty / inQty) * 1_000_000.0 : 0.0;

            monthlyList.add(com.example.ims.dto.QualityAnalyticsSummaryDto.MonthlyPpmItem.builder()
                    .month(m)
                    .inboundQty(inQty)
                    .claimQty(clQty)
                    .claimCount(clCount)
                    .ppm(Math.round(ppm * 100.0) / 100.0)
                    .build());
        }

        // 3. 제품(마스터)별 PPM 불량률 순위 (Top 5)
        Map<String, Long> prodInboundMap = new HashMap<>();
        Map<String, Long> prodClaimMap = new HashMap<>();

        for (WmsInbound inbound : inbounds) {
            String masterName = cleanMasterName(inbound.getProductName());
            prodInboundMap.put(masterName, prodInboundMap.getOrDefault(masterName, 0L) + (inbound.getQuantity() != null ? inbound.getQuantity() : 0));
        }

        for (Claim claim : claims) {
            String masterName = cleanMasterName(claim.getProductName());
            int qty = claim.getOccurrenceQty() != null ? claim.getOccurrenceQty() : 1;
            prodClaimMap.put(masterName, prodClaimMap.getOrDefault(masterName, 0L) + qty);
        }

        List<com.example.ims.dto.QualityAnalyticsSummaryDto.ProductPpmItem> productPpmList = new ArrayList<>();
        for (String prodName : prodInboundMap.keySet()) {
            long inQty = prodInboundMap.get(prodName);
            long clQty = prodClaimMap.getOrDefault(prodName, 0L);
            double ppm = inQty > 0 ? ((double) clQty / inQty) * 1_000_000.0 : 0.0;

            productPpmList.add(com.example.ims.dto.QualityAnalyticsSummaryDto.ProductPpmItem.builder()
                    .productName(prodName)
                    .inboundQty(inQty)
                    .claimQty(clQty)
                    .ppm(Math.round(ppm * 100.0) / 100.0)
                    .build());
        }

        productPpmList.sort((a, b) -> Double.compare(b.getPpm(), a.getPpm()));
        List<com.example.ims.dto.QualityAnalyticsSummaryDto.ProductPpmItem> top5Products = productPpmList.stream().limit(5).collect(Collectors.toList());

        // 4. 클레임 유형(primaryCategory)별 발생 비중
        Map<String, Long> categoryQtyMap = new HashMap<>();
        Map<String, Integer> categoryCountMap = new HashMap<>();
        long totalClaimQtyAll = 0;

        for (Claim claim : claims) {
            String cat = claim.getPrimaryCategory() != null && !claim.getPrimaryCategory().trim().isEmpty()
                    ? claim.getPrimaryCategory().trim()
                    : "기타/미분류";
            int qty = claim.getOccurrenceQty() != null ? claim.getOccurrenceQty() : 1;

            categoryQtyMap.put(cat, categoryQtyMap.getOrDefault(cat, 0L) + qty);
            categoryCountMap.put(cat, categoryCountMap.getOrDefault(cat, 0) + 1);
            totalClaimQtyAll += qty;
        }

        List<com.example.ims.dto.QualityAnalyticsSummaryDto.ClaimCategoryItem> categoryList = new ArrayList<>();
        for (Map.Entry<String, Long> entry : categoryQtyMap.entrySet()) {
            String cat = entry.getKey();
            long cQty = entry.getValue();
            int count = categoryCountMap.get(cat);
            double pct = totalClaimQtyAll > 0 ? ((double) cQty / totalClaimQtyAll) * 100.0 : 0.0;

            categoryList.add(com.example.ims.dto.QualityAnalyticsSummaryDto.ClaimCategoryItem.builder()
                    .category(cat)
                    .claimQty(cQty)
                    .count(count)
                    .percentage(Math.round(pct * 10.0) / 10.0)
                    .build());
        }

        categoryList.sort((a, b) -> Long.compare(b.getClaimQty(), a.getClaimQty()));

        // 5. 채널별 클레임 발생 비중 (productName에서 [채널명] 추출)
        Map<String, Long> channelQtyMap = new HashMap<>();
        Map<String, Integer> channelCountMap = new HashMap<>();
        java.util.regex.Pattern channelPattern = java.util.regex.Pattern.compile("\\[(.*?)\\]");

        for (Claim claim : claims) {
            String channelName = "기타/직접";
            if (claim.getProductName() != null) {
                java.util.regex.Matcher matcher = channelPattern.matcher(claim.getProductName());
                if (matcher.find()) {
                    channelName = matcher.group(1).trim();
                }
            }
            int qty = claim.getOccurrenceQty() != null ? claim.getOccurrenceQty() : 1;
            channelQtyMap.put(channelName, channelQtyMap.getOrDefault(channelName, 0L) + qty);
            channelCountMap.put(channelName, channelCountMap.getOrDefault(channelName, 0) + 1);
        }

        List<com.example.ims.dto.QualityAnalyticsSummaryDto.ChannelClaimItem> channelList = new ArrayList<>();
        for (Map.Entry<String, Long> entry : channelQtyMap.entrySet()) {
            String ch = entry.getKey();
            long cQty = entry.getValue();
            int count = channelCountMap.get(ch);
            double pct = totalClaimQtyAll > 0 ? ((double) cQty / totalClaimQtyAll) * 100.0 : 0.0;

            channelList.add(com.example.ims.dto.QualityAnalyticsSummaryDto.ChannelClaimItem.builder()
                    .channel(ch)
                    .claimQty(cQty)
                    .count(count)
                    .percentage(Math.round(pct * 10.0) / 10.0)
                    .build());
        }

        channelList.sort((a, b) -> Long.compare(b.getClaimQty(), a.getClaimQty()));

        return com.example.ims.dto.QualityAnalyticsSummaryDto.builder()
                .monthlyPpmList(monthlyList)
                .topProductPpmList(top5Products)
                .claimCategoryList(categoryList)
                .channelClaimList(channelList)
                .build();
        } catch (Exception e) {
            log.error("Failed to get quality analytics summary: {}", e.getMessage(), e);
            return com.example.ims.dto.QualityAnalyticsSummaryDto.builder()
                    .monthlyPpmList(Collections.emptyList())
                    .topProductPpmList(Collections.emptyList())
                    .claimCategoryList(Collections.emptyList())
                    .channelClaimList(Collections.emptyList())
                    .build();
        }
    }

    private String cleanMasterName(String name) {
        if (name == null) return "미지정 제품";
        return name.replaceAll("\\[.*?\\]", "").trim();
    }

    private int getStatusOrder(LotPpmStatus status) {
        switch (status) {
            case STATISTICAL_ANOMALY: return 1;
            case INSUFFICIENT_SAMPLE: return 2;
            case NORMAL: return 3;
            default: return 4;
        }
    }

    private static class LotAggregate {
        String itemCode;
        String productName;
        String lotNumber;
        long inboundQty = 0;
        long claimQty = 0;
        int claimCount = 0;

        LotAggregate(String itemCode, String productName, String lotNumber) {
            this.itemCode = itemCode;
            this.productName = productName;
            this.lotNumber = lotNumber;
        }
    }
}
