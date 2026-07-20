package com.example.ims.service.packaging.spaceratio;

import com.example.ims.entity.Product;
import com.example.ims.entity.PackagingComponent;
import com.example.ims.entity.PackagingLayer;
import com.example.ims.entity.PackagingMaterialType;

import java.util.ArrayList;
import java.util.List;

public class TaiwanSpaceRatioStrategy implements PackagingSpaceRatioStrategy {

    @Override
    public RatioResult calculate(Product product, List<PackagingComponent> components) {
        List<String> flags = new ArrayList<>();
        flags.add("환경부 공고 원문 재확인 권장");

        // 1. 적용 대상 확인: 기획세트(isPlanningSet = true 또는 구성품 2개 이상)만 해당.
        boolean isSet = product.isPlanningSet() || (components != null && components.size() >= 2);
        if (!isSet) {
            return RatioResult.builder()
                    .country("TW")
                    .status("NOT_APPLICABLE")
                    .detailMessage("대만 과도포장 규정은 화장품 기획세트(禮盒) 전용입니다. 단품은 해당 없음.")
                    .flags(flags)
                    .build();
        }

        if (components == null || components.isEmpty()) {
            return RatioResult.builder()
                    .country("TW")
                    .status("UNABLE_TO_CALCULATE")
                    .detailMessage("대만 기획세트 내 구성품 정보가 없어 계산할 수 없습니다.")
                    .flags(flags)
                    .build();
        }

        // 2. C값 분기 (단일재질 = 3.1, 복합재질 = 2.7)
        double c = 3.1;
        if (product.getPackagingMaterialType() != null) {
            if (product.getPackagingMaterialType() == PackagingMaterialType.COMPOSITE_MATERIAL) {
                c = 2.7;
            }
        }

        // 3. npv(額定包裝體積) 계산 = Σ(n × l × w × h × C)
        // l, w, h는 mm 단위로 각각 정수 올림(Math.ceil) 처리
        double npv = 0.0;
        for (PackagingComponent comp : components) {
            List<PackagingLayer> layers = comp.getLayers();
            if (layers != null && !layers.isEmpty()) {
                // 1차 포장(CONTAINER) 레이어의 외경 치수 활용
                PackagingLayer firstLayer = layers.stream()
                        .filter(l -> l.getLayerOrder() == 1)
                        .findFirst()
                        .orElse(layers.get(0));

                double l = Math.ceil(firstLayer.getOuterLengthMm());
                double w = Math.ceil(firstLayer.getOuterWidthMm());
                double h = Math.ceil(firstLayer.getOuterHeightMm());
                
                // n = 수량 (기획세트 내 개별 구성품 개수, 기본 1)
                double n = 1.0; 
                npv += (n * l * w * h * c);
            } else {
                // 레이어 데이터 부재 시 내용적 환산 기본구형 체적으로 올림 연산 모킹
                double val = (product.getContentVolumeMl() != null ? product.getContentVolumeMl() : 50.0) * 1000.0;
                double side = Math.ceil(Math.cbrt(val));
                npv += (1.0 * side * side * side * c);
            }
        }

        // 4. 포장체적(분자) 계산: 최외곽 직육면체 부피 (손잡이, 끈, 비닐막 제외한 외용적)
        double boxVol = 0.0;
        if (product.getDimensions() != null && product.getDimensions().getWidth() != null 
                && product.getDimensions().getLength() != null && product.getDimensions().getHeight() != null) {
            // 손잡이 등을 제외하기 위해 순수 치수 대입
            boxVol = product.getDimensions().getWidth() 
                   * product.getDimensions().getLength() 
                   * product.getDimensions().getHeight();
        }

        if (boxVol <= 0 || npv <= 0) {
            return RatioResult.builder()
                    .country("TW")
                    .status("UNABLE_TO_CALCULATE")
                    .detailMessage("외곽 아웃박스 규격 혹은 구성품 크기 정보가 부재하여 대만 포장비율을 계산할 수 없습니다.")
                    .flags(flags)
                    .build();
        }

        // 包裝體積比値 = 포장체적 ÷ npv (소수점 둘째자리 반올림)
        double ratioVal = boxVol / npv;
        double roundedRatio = Math.round(ratioVal * 100.0) / 100.0;

        // 합격 기준: 비율값 <= 1
        boolean isPass = (roundedRatio <= 1.0);
        String status = isPass ? "PASS" : "FAIL";

        String detail = String.format("대만 포장체적비치: %.2f (기준: 1.0 이하, 적용 C값: %.1f, 세트외용적: %.0f mm³, npv: %.0f)", 
                roundedRatio, c, boxVol, npv);

        // 역산 결과 제안 (npv 값 자체가 분자의 상한선 한계치)
        String recommended = String.format("대만 기획세트 아웃박스 권장 외용적 상한: %.0f mm³ 이하 (현재: %.0f mm³)", 
                npv, boxVol);

        return RatioResult.builder()
                .country("TW")
                .ratio(roundedRatio * 100.0) // 대시보드 백분율 통일을 위해 100 곱해서 비율 수치 주입
                .status(status)
                .detailMessage(detail)
                .recommendedSpec(recommended)
                .flags(flags)
                .build();
    }
}
