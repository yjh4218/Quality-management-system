package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QualityAnalyticsSummaryDto {

    // 월별 PPM 추이
    private List<MonthlyPpmItem> monthlyPpmList;

    // 제품별 PPM 불량률 Top 순위
    private List<ProductPpmItem> topProductPpmList;

    // 클레임 유형별 비중
    private List<ClaimCategoryItem> claimCategoryList;

    // 채널별 클레임 비중
    private List<ChannelClaimItem> channelClaimList;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChannelClaimItem {
        private String channel;        // 채널명 (스마트스토어, 올리브영 등)
        private long claimQty;        // 불량 수량
        private int count;            // 건수
        double percentage;            // 비중 (%)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyPpmItem {
        private String month;         // YYYY-MM
        private long inboundQty;     // 입고 수량
        private long claimQty;       // 클레임 발생 수량
        private int claimCount;      // 클레임 건수
        private double ppm;          // 불량률 (PPM)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductPpmItem {
        private String productName;  // 마스터 제품명
        private long inboundQty;     // 입고 수량
        private long claimQty;       // 클레임 수량
        private double ppm;          // 불량률 (PPM)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClaimCategoryItem {
        private String category;     // 클레임 유형 (용기불량, 내용물불량 등)
        private long claimQty;       // 불량 수량
        private int count;           // 건수
        private double percentage;   // 비중 (%)
    }
}
