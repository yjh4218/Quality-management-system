package com.example.ims.service.packaging.spaceratio;

import com.example.ims.entity.Product;
import com.example.ims.entity.PackagingComponent;

import java.util.ArrayList;
import java.util.List;

public class EuSpaceRatioStrategy implements PackagingSpaceRatioStrategy {

    @Override
    public RatioResult calculate(Product product, List<PackagingComponent> components) {
        List<String> flags = new ArrayList<>();
        flags.add("EU PPWR 2025/40 Article 24 기준 (그룹/수송/이커머스 포장 대상)");
        flags.add("잠정 참고치, 정식 기준 아님 (2028년 2월 공식 측정방법론 확정 예정)");

        // 포장총부피 (아웃박스 외용적)
        double outboxVol = 0.0;
        if (product.getOutboxInfo() != null && product.getOutboxInfo().getOutboxWidth() != null 
                && product.getOutboxInfo().getOutboxLength() != null && product.getOutboxInfo().getOutboxHeight() != null) {
            outboxVol = product.getOutboxInfo().getOutboxWidth() 
                      * product.getOutboxInfo().getOutboxLength() 
                      * product.getOutboxInfo().getOutboxHeight();
        }

        // 판매포장부피 (단품/세트 개별 포장 박스 총합 체적)
        double singleBoxVol = 0.0;
        if (product.getDimensions() != null && product.getDimensions().getWidth() != null 
                && product.getDimensions().getLength() != null && product.getDimensions().getHeight() != null) {
            singleBoxVol = product.getDimensions().getWidth() 
                         * product.getDimensions().getLength() 
                         * product.getDimensions().getHeight();
        }

        // 수량 배수 처리 (아웃박스당입수)
        int inQty = 1;
        if (product.getInboxInfo() != null && product.getInboxInfo().getInboxQuantity() != null) {
            inQty = product.getInboxInfo().getInboxQuantity();
        }

        double totalSalesVol = singleBoxVol * inQty;

        if (outboxVol <= 0 || totalSalesVol <= 0) {
            return RatioResult.builder()
                    .country("EU")
                    .status("UNABLE_TO_CALCULATE")
                    .detailMessage("아웃박스 또는 판매포장 치수 정보가 부재하여 EU 포장비율을 계산할 수 없습니다.")
                    .flags(flags)
                    .build();
        }

        // 계산식: (포장총부피 - 판매포장부피) ÷ 포장총부피 * 100
        double ratio = ((outboxVol - totalSalesVol) / outboxVol) * 100.0;
        
        // 기준: 50% 이하
        boolean isPass = (ratio <= 50.0);
        String status = isPass ? "PASS" : "FAIL";

        String detail = String.format("EU 수송포장 공간비율: %.1f%% (합격선: 50.0%% 이하, 아웃박스체적: %.0f mm³, 입수: %d)", 
                ratio, outboxVol, inQty);

        // 역산 결과 제안
        double targetOutboxVol = totalSalesVol / (1.0 - (50.0 / 100.0));
        String recommended = String.format("EU 수송규격 만족 권장 아웃박스체적: %.0f mm³ 이하 (현재: %.0f mm³)", 
                targetOutboxVol, outboxVol);

        return RatioResult.builder()
                .country("EU")
                .ratio(ratio)
                .status(status)
                .detailMessage(detail)
                .recommendedSpec(recommended)
                .flags(flags)
                .build();
    }
}
