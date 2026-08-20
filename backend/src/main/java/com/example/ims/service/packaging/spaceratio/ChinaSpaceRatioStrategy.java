package com.example.ims.service.packaging.spaceratio;

import com.example.ims.entity.Product;
import com.example.ims.entity.PackagingComponent;

import java.util.ArrayList;
import java.util.List;

public class ChinaSpaceRatioStrategy implements PackagingSpaceRatioStrategy {

    @Override
    public RatioResult calculate(Product product, List<PackagingComponent> components) {
        List<String> flags = new ArrayList<>();
        flags.add("원문 표 A.1 확인 후 정확한 합격선 반영 필요");

        // 1. 판매포장 층수 확인 (구성품의 레이어 수 기반)
        int maxLayerCount = 0;
        if (components != null) {
            for (PackagingComponent comp : components) {
                if (comp.getLayers() != null) {
                    maxLayerCount = Math.max(maxLayerCount, comp.getLayers().size());
                }
            }
        }

        // 1겹 포장이면 계산 없이 자동 통과
        if (maxLayerCount == 1) {
            return RatioResult.builder()
                    .country("CN")
                    .ratio(0.0)
                    .status("PASS")
                    .detailMessage("판매포장 층수가 1겹이므로 GB 23350-2021 규정에 따라 무조건 합격입니다.")
                    .flags(flags)
                    .build();
        }

        if (maxLayerCount > 4) {
            flags.add("보안 경고: 판매포장 층수가 4겹을 초과하여 규격 위반 가능성 있음 (현재: " + maxLayerCount + "겹)");
        }

        // 2. k값 설정
        double k = 9.0; // 디폴트 액상
        if (product.getContentType() != null) {
            switch (product.getContentType()) {
                case LIQUID:
                    k = 9.0;
                    break;
                case CREAM_EMULSION:
                    k = 9.0; // 크림/에멀전도 액상계열 준용
                    break;
                case POWDER:
                    k = 15.0;
                    break;
                case WAX:
                    k = 20.0;
                    break;
                case TOOTHPASTE:
                    k = 5.0;
                    break;
                case MASK_SHEET:
                    k = 9.0; // 마스크팩은 액상 기준 잠정 사용
                    flags.add("마스크팩에 대한 GB 23350-2021 k값 확인 필요 플래그");
                    break;
                default:
                    k = 9.0;
                    break;
            }
        }

        // 3. 부피 및 비율 계산
        double contentVol = (product.getContentVolumeMl() != null ? product.getContentVolumeMl() : 0.0) * 1000.0;
        
        // 판매포장 부피 (최외곽 Product.dimensions 사용 - 손잡이/잠금장치 포함된 외용적)
        double boxVol = 0.0;
        if (product.getDimensions() != null && product.getDimensions().getWidth() != null 
                && product.getDimensions().getLength() != null && product.getDimensions().getHeight() != null) {
            boxVol = product.getDimensions().getWidth() 
                   * product.getDimensions().getLength() 
                   * product.getDimensions().getHeight();
        }

        if (boxVol <= 0) {
            return RatioResult.builder()
                    .country("CN")
                    .status("UNABLE_TO_CALCULATE")
                    .detailMessage("외곽 판매포장 치수 정보가 부재하여 계산할 수 없습니다.")
                    .flags(flags)
                    .build();
        }

        // 포장공간비율 = (판매포장체적 - k * 내용물체적) ÷ 판매포장체적 * 100
        double ratio = ((boxVol - (k * contentVol)) / boxVol) * 100.0;

        // k값에 따른 합격선 기준: GB 23350-2021에서는 공간비율이 k배 내용적 대비 허용되는 상한선이 있음.
        // 공식: 공간비율 <= 허용상한 (일반적으로 화장품류는 층수별 공간비율 규제가 있음 - 예: 2겹 50%, 3겹 40%, 4겹 30% 이하 등)
        // 원문 미확보에 대한 경고 메세지 추가
        boolean isPass = (ratio >= 0 && ratio <= 60.0); // 임시 안전상한 60% 가이드라인 설정
        String status = isPass ? "PASS" : "FAIL";

        String detail = String.format("중국 포장공간비율: %.1f%% (적용 k값: %.1f, 판매포장부피: %.0f mm³, 내용물부피: %.0f mm³)", 
                ratio, k, boxVol, contentVol);

        // 역산 권장 제안
        double targetBoxVol = (k * contentVol) / (1.0 - (40.0 / 100.0)); // 3겹 기준 임시 상한 40% 대입 역산
        String recommended = String.format("[잠정치] 3겹 이하 포장 통과 권장 판매포장부피: %.0f mm³ 이하 (현재: %.0f mm³)", 
                targetBoxVol, boxVol);

        return RatioResult.builder()
                .country("CN")
                .ratio(ratio)
                .status(status)
                .detailMessage(detail)
                .recommendedSpec(recommended)
                .flags(flags)
                .build();
    }
}
