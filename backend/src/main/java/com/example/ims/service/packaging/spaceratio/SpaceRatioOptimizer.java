package com.example.ims.service.packaging.spaceratio;

public class SpaceRatioOptimizer {

    /**
     * 한국 포장공간비율 역산 최적화
     * 목표 내측부피 = 내용물체적 ÷ (1 - 기준비율)
     */
    public static double optimizeKorea(double lastOuterVolume, double limitPercent) {
        double limitDecimal = limitPercent / 100.0;
        if (limitDecimal >= 1.0) return 0.0;
        return lastOuterVolume / (1.0 - limitDecimal);
    }

    /**
     * 중국/EU 포장공간비율 역산 최적화
     * 목표 판매포장부피 = k × 내용물체적 ÷ (1 - 기준비율)
     */
    public static double optimizeChinaOrEu(double contentVolume, double k, double limitPercent) {
        double limitDecimal = limitPercent / 100.0;
        if (limitDecimal >= 1.0) return 0.0;
        return (k * contentVolume) / (1.0 - limitDecimal);
    }

    /**
     * 일본 충전율 역산 최적화
     * 목표 외용적 ≤ 내용물체적 ÷ 0.4
     */
    public static double optimizeJapan(double contentVolume) {
        return contentVolume / 0.4;
    }
}
