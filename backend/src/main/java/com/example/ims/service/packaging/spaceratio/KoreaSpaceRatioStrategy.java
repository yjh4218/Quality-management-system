package com.example.ims.service.packaging.spaceratio;

import com.example.ims.entity.Product;
import com.example.ims.entity.PackagingComponent;
import com.example.ims.entity.PackagingLayer;
import com.example.ims.entity.ProductType;

import java.util.ArrayList;
import java.util.List;

public class KoreaSpaceRatioStrategy implements PackagingSpaceRatioStrategy {

    @Override
    public RatioResult calculate(Product product, List<PackagingComponent> components) {
        if (components == null || components.isEmpty()) {
            return RatioResult.builder()
                    .country("KR")
                    .status("UNABLE_TO_CALCULATE")
                    .detailMessage("포장 구성품 정보가 없어 계산할 수 없습니다.")
                    .build();
        }

        // 인체/두발 세정용 제품 여부 판단 (샴푸, 바디, 클렌징, 세정 등 키워드 필터링)
        boolean isCleansing = false;
        String typeName = "";
        if (product.getProductType() != null) {
            typeName = product.getProductType().name().toLowerCase();
        }
        if (product.getProductName() != null) {
            typeName += "_" + product.getProductName().toLowerCase();
        }
        if (typeName.contains("shampoo") || typeName.contains("샴푸") || 
            typeName.contains("wash") || typeName.contains("워시") || 
            typeName.contains("cleans") || typeName.contains("클렌징") || 
            typeName.contains("soap") || typeName.contains("비누") ||
            typeName.contains("세정")) {
            isCleansing = true;
        }

        double singleLimit = isCleansing ? 15.0 : 10.0;
        double setLimit = 25.0;

        List<String> flags = new ArrayList<>();
        
        // 1. 단품 계산 (PackagingComponent가 1개인 경우)
        if (components.size() == 1) {
            PackagingComponent comp = components.get(0);
            List<PackagingLayer> layers = comp.getLayers();
            if (layers == null || layers.isEmpty()) {
                return RatioResult.builder()
                        .country("KR")
                        .status("UNABLE_TO_CALCULATE")
                        .detailMessage("단품에 포장 레이어(1차/2차 등)가 등록되어 있지 않습니다.")
                        .build();
            }

            if (layers.size() >= 3) {
                flags.add("포장횟수 기준(2차 이내 원칙) 확인 필요 (현재 레이어 수: " + layers.size() + "차)");
            }

            // 1mL = 1000mm³ 환산 내용물 체적
            double contentVolume = (product.getContentVolumeMl() != null ? product.getContentVolumeMl() : 0.0) * 1000.0;
            
            // 캐스케이드 연쇄 계산 진행
            double lastOuterVolume = contentVolume;
            double finalRatio = 0.0;
            StringBuilder pathMsg = new StringBuilder();

            for (int i = 0; i < layers.size(); i++) {
                PackagingLayer layer = layers.get(i);
                double innerVol = layer.getInnerLengthMm() * layer.getInnerWidthMm() * layer.getInnerHeightMm();
                if (innerVol <= 0) {
                    return RatioResult.builder()
                            .country("KR")
                            .status("UNABLE_TO_CALCULATE")
                            .detailMessage(layer.getLayerOrder() + "차 레이어의 내측 부피가 0 이하입니다.")
                            .build();
                }

                // 완충재 사용 시 내용물 외경에 5mm 가산 규칙
                double targetContentVol = lastOuterVolume;
                if (layer.getUsesCushioningMaterial() != null && layer.getUsesCushioningMaterial()) {
                    // 직육면체 각 변에 +5mm 가산 효과 적용 (부피 간이 가산 계산 반영)
                    double factor = 1.0;
                    if (i > 0) {
                        PackagingLayer prevLayer = layers.get(i - 1);
                        double cushioningVol = (prevLayer.getOuterLengthMm() + 5.0) 
                                             * (prevLayer.getOuterWidthMm() + 5.0) 
                                             * (prevLayer.getOuterHeightMm() + 5.0);
                        targetContentVol = cushioningVol;
                    } else {
                        // 내용물 자체 가산 (contentVolume을 가상 구형으로 환산 혹은 직육면체 가정)
                        double side = Math.cbrt(contentVolume);
                        targetContentVol = Math.pow(side + 5.0, 3);
                    }
                }

                finalRatio = ((innerVol - targetContentVol) / innerVol) * 100.0;
                pathMsg.append(String.format("[%d차 %s: %.1f%%] ", layer.getLayerOrder(), layer.getLayerType(), finalRatio));
                
                // 다음 레이어 연쇄를 위한 외측 부피 갱신
                lastOuterVolume = layer.getOuterLengthMm() * layer.getOuterWidthMm() * layer.getOuterHeightMm();
            }

            boolean isPass = (finalRatio <= singleLimit);
            String status = isPass ? "PASS" : "FAIL";
            String detail = pathMsg + (isPass ? "한국 포장공간비율 통과" : "한국 포장공간비율 초과 (기준: " + singleLimit + "%)");

            // 역산 추천 권장 사양 산출
            String recommended = "";
            if (!isPass && !layers.isEmpty()) {
                PackagingLayer outerMost = layers.get(layers.size() - 1);
                double targetInnerVol = lastOuterVolume / (1.0 - (singleLimit / 100.0));
                recommended = String.format("최외곽 레이어 권장 내측부피: %.0f mm³ 이하로 조정 필요 (현재: %.0f mm³)", 
                        targetInnerVol, outerMost.getInnerLengthMm() * outerMost.getInnerWidthMm() * outerMost.getInnerHeightMm());
            }

            return RatioResult.builder()
                    .country("KR")
                    .ratio(finalRatio)
                    .status(status)
                    .detailMessage(detail)
                    .recommendedSpec(recommended)
                    .flags(flags)
                    .build();
        } 
        
        // 2. 종합제품(세트) 계산 (PackagingComponent가 2개 이상인 경우)
        else {
            StringBuilder detail = new StringBuilder();
            boolean allComponentsPass = true;
            double maxComponentRatio = 0.0;
            
            // (a) 각 구성품별 개별 판정 (10%/15%, 캐스케이드 적용)
            for (int k = 0; k < components.size(); k++) {
                PackagingComponent comp = components.get(k);
                List<PackagingLayer> layers = comp.getLayers();
                if (layers == null || layers.isEmpty()) {
                    detail.append(String.format("[구성품 %d번 '%s': 레이어 데이터 없음 (불합격)] ", k+1, comp.getComponentName()));
                    allComponentsPass = false;
                    continue;
                }

                if (layers.size() >= 3) {
                    flags.add(String.format("구성품 '%s' 포장횟수 기준(2차 이내) 확인 필요", comp.getComponentName()));
                }

                // 각 구성품별 contentVolume 도출
                double contentVolume = (product.getContentVolumeMl() != null ? product.getContentVolumeMl() : 0.0) * 1000.0;
                double lastOuterVolume = contentVolume;
                double compRatio = 0.0;

                for (int i = 0; i < layers.size(); i++) {
                    PackagingLayer layer = layers.get(i);
                    double innerVol = layer.getInnerLengthMm() * layer.getInnerWidthMm() * layer.getInnerHeightMm();
                    if (innerVol <= 0) {
                        compRatio = 100.0;
                        break;
                    }
                    double targetContentVol = lastOuterVolume;
                    if (layer.getUsesCushioningMaterial() != null && layer.getUsesCushioningMaterial()) {
                        double side = Math.cbrt(lastOuterVolume);
                        targetContentVol = Math.pow(side + 5.0, 3);
                    }
                    compRatio = ((innerVol - targetContentVol) / innerVol) * 100.0;
                    lastOuterVolume = layer.getOuterLengthMm() * layer.getOuterWidthMm() * layer.getOuterHeightMm();
                }

                maxComponentRatio = Math.max(maxComponentRatio, compRatio);
                boolean compPass = (compRatio <= singleLimit);
                if (!compPass) {
                    allComponentsPass = false;
                }
                detail.append(String.format("[구성품 %d번 '%s': %.1f%% (%s)] ", k+1, comp.getComponentName(), compRatio, compPass ? "PASS" : "FAIL"));
            }

            // (b) 세트 전체 최외곽 포장 기준 (25% 이하) 판정
            // 세트 전체는 모든 구성품의 1차(또는 최외곽) 부피의 합을 "내용물 전체 체적"으로 보고, 
            // 세트 아웃박스(전체 최소 포장) 내측부피와의 비율을 구합니다.
            double totalComponentOuterVolume = 0.0;
            for (PackagingComponent comp : components) {
                List<PackagingLayer> layers = comp.getLayers();
                if (layers != null && !layers.isEmpty()) {
                    PackagingLayer outerMost = layers.get(layers.size() - 1);
                    totalComponentOuterVolume += (outerMost.getOuterLengthMm() * outerMost.getOuterWidthMm() * outerMost.getOuterHeightMm());
                } else {
                    // 레이어가 없는 경우 1mL * 1000 기본 환산 가산
                    totalComponentOuterVolume += (product.getContentVolumeMl() != null ? product.getContentVolumeMl() : 0.0) * 1000.0;
                }
            }

            // 세트 최외곽 포장은 제품 치수(Product.dimensions) 정보를 활용
            double setBoxInnerVolume = 0.0;
            if (product.getDimensions() != null && product.getDimensions().getWidth() != null 
                    && product.getDimensions().getLength() != null && product.getDimensions().getHeight() != null) {
                setBoxInnerVolume = product.getDimensions().getWidth() 
                                  * product.getDimensions().getLength() 
                                  * product.getDimensions().getHeight();
            }

            double setRatio = 0.0;
            boolean setPass = false;
            if (setBoxInnerVolume > 0) {
                setRatio = ((setBoxInnerVolume - totalComponentOuterVolume) / setBoxInnerVolume) * 100.0;
                setPass = (setRatio <= setLimit);
            }

            detail.append(String.format("[세트 전체 아웃박스: %.1f%% (%s)] ", setRatio, setBoxInnerVolume > 0 ? (setPass ? "PASS" : "FAIL") : "규격 미확인"));

            boolean finalPass = allComponentsPass && setPass;
            String status = finalPass ? "PASS" : "FAIL";

            String recommended = "";
            if (!setPass && setBoxInnerVolume > 0) {
                double targetSetVol = totalComponentOuterVolume / (1.0 - (setLimit / 100.0));
                recommended = String.format("세트 아웃박스 권장 내측부피: %.0f mm³ 이하로 조정 필요 (현재: %.0f mm³)", 
                        targetSetVol, setBoxInnerVolume);
            }

            return RatioResult.builder()
                    .country("KR")
                    .ratio(setRatio) // 종합 세트는 아웃박스 비율을 주 비율로 표기
                    .status(status)
                    .detailMessage(detail.toString())
                    .recommendedSpec(recommended)
                    .flags(flags)
                    .build();
        }
    }
}
