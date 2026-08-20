package com.example.ims.service.packaging.spaceratio;

import com.example.ims.entity.Product;
import com.example.ims.entity.PackagingComponent;
import com.example.ims.entity.PackagingLayer;

import java.util.ArrayList;
import java.util.List;

public class JapanSpaceRatioStrategy implements PackagingSpaceRatioStrategy {

    @Override
    public RatioResult calculate(Product product, List<PackagingComponent> components) {
        List<String> flags = new ArrayList<>();
        flags.add("업계 자율규약(적정포장규칙) 기준 - 정부 공식 법령 아님");

        double contentMl = product.getContentVolumeMl() != null ? product.getContentVolumeMl() : 0.0;

        // 1. 면제 대상 판정
        // 향수(perfume, 콜롱 등), 메이크업류(파운데이션, 립스틱 등), 30g/30mL 이하
        boolean isMakeupOrPerfume = false;
        String nameLower = product.getProductName() != null ? product.getProductName().toLowerCase() : "";
        if (nameLower.contains("perfume") || nameLower.contains("향수") || nameLower.contains("cologne") || 
            nameLower.contains("립스틱") || nameLower.contains("lipstick") || nameLower.contains("foundation") || 
            nameLower.contains("파운데이션") || nameLower.contains("립") || nameLower.contains("lip")) {
            isMakeupOrPerfume = true;
        }

        if (contentMl <= 30.0 || isMakeupOrPerfume) {
            return RatioResult.builder()
                    .country("JP")
                    .ratio(0.0)
                    .status("PASS")
                    .detailMessage("일본 적정포장규칙 수치 기준 면제 대상 제품입니다. (향수/메이크업류 또는 30mL 이하 소형)")
                    .flags(flags)
                    .build();
        }

        // 2. 세트(기획세트) 간격 계산 시도
        boolean isSet = product.isPlanningSet() || (components != null && components.size() >= 2);
        if (isSet) {
            // 배치 좌표 데이터가 필요한 간격 규정이므로, 좌표 정보가 없는 현재 데이터 모델 상에서는 "계산 불가" 반환
            flags.add("세트 상하좌우 15mm / 깊이 5mm 간격 계산은 배치 좌표 데이터 확보 후 가능");
            return RatioResult.builder()
                    .country("JP")
                    .status("UNABLE_TO_CALCULATE")
                    .detailMessage("일본 기획세트 간격 규정은 개별 용기 배치 좌표 데이터가 부재하여 수치 계산이 불가합니다.")
                    .flags(flags)
                    .build();
        }

        // 3. 단품 1차 용기 충전율 계산 (내용물체적 ÷ 1차용기 외용적)
        if (components == null || components.isEmpty()) {
            return RatioResult.builder()
                    .country("JP")
                    .status("UNABLE_TO_CALCULATE")
                    .detailMessage("포장 구성품 정보가 없어 일본 충전율을 계산할 수 없습니다.")
                    .flags(flags)
                    .build();
        }

        PackagingComponent comp = components.get(0);
        List<PackagingLayer> layers = comp.getLayers();
        if (layers == null || layers.isEmpty()) {
            return RatioResult.builder()
                    .country("JP")
                    .status("UNABLE_TO_CALCULATE")
                    .detailMessage("1차 용기 규격 정보가 등록되어 있지 않습니다.")
                    .flags(flags)
                    .build();
        }

        // 1차 용기 외용적 계산
        PackagingLayer container = layers.stream()
                .filter(l -> l.getLayerOrder() == 1)
                .findFirst()
                .orElse(layers.get(0));

        double outerVol = container.getOuterLengthMm() * container.getOuterWidthMm() * container.getOuterHeightMm();
        if (outerVol <= 0) {
            return RatioResult.builder()
                    .country("JP")
                    .status("UNABLE_TO_CALCULATE")
                    .detailMessage("1차 용기의 외측 치수가 0 이하입니다.")
                    .flags(flags)
                    .build();
        }

        double contentVol = contentMl * 1000.0;
        double fillRatio = (contentVol / outerVol) * 100.0;

        // 충전율 기준선: 내용량 40g(40mL) 이하는 30% 이상, 40g 초과는 40% 이상 합격
        double limit = (contentMl <= 40.0) ? 30.0 : 40.0;
        boolean isPass = (fillRatio >= limit); // 충전율은 기준 이상이어야 PASS (부등호 방향 주의)
        String status = isPass ? "PASS" : "FAIL";

        String detail = String.format("일본 1차용기 충전율: %.1f%% (합격 기준: %.1f%% 이상, 용기외용적: %.0f mm³)", 
                fillRatio, limit, outerVol);

        // 역산 제안
        double maxOuterVol = contentVol / (limit / 100.0);
        String recommended = String.format("일본 충전율 규격 만족 1차용기 권장 외용적 상한: %.0f mm³ 이하 (현재: %.0f mm³)", 
                maxOuterVol, outerVol);

        return RatioResult.builder()
                .country("JP")
                .ratio(fillRatio)
                .status(status)
                .detailMessage(detail)
                .recommendedSpec(recommended)
                .flags(flags)
                .build();
    }
}
