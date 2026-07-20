package com.example.ims.service.packaging.spaceratio;

import com.example.ims.entity.Product;
import com.example.ims.entity.PackagingComponent;
import com.example.ims.entity.PackagingLayer;

import java.util.ArrayList;
import java.util.List;

public class UsSpaceRatioStrategy implements PackagingSpaceRatioStrategy {

    @Override
    public RatioResult calculate(Product product, List<PackagingComponent> components) {
        List<String> flags = new ArrayList<>();
        flags.add("FDA FDCA §362(d) / California B&P §12606 기준");
        flags.add("미국은 고정된 백분율(%) 상한 규격이 없으며, 오도 가능성 유무로 정성적 판단함");

        if (components == null || components.isEmpty()) {
            return RatioResult.builder()
                    .country("US")
                    .status(null) // 판정불가
                    .detailMessage("포장 정보 부재로 충전율 계산을 수행할 수 없습니다.")
                    .flags(flags)
                    .build();
        }

        PackagingComponent comp = components.get(0);
        List<PackagingLayer> layers = comp.getLayers();
        if (layers == null || layers.isEmpty()) {
            return RatioResult.builder()
                    .country("US")
                    .status(null)
                    .detailMessage("1차 용기 치수가 부재합니다.")
                    .flags(flags)
                    .build();
        }

        PackagingLayer container = layers.stream()
                .filter(l -> l.getLayerOrder() == 1)
                .findFirst()
                .orElse(layers.get(0));

        double outerVol = container.getOuterLengthMm() * container.getOuterWidthMm() * container.getOuterHeightMm();
        if (outerVol <= 0) {
            return RatioResult.builder()
                    .country("US")
                    .status(null)
                    .detailMessage("1차 용기 체적이 0 이하입니다.")
                    .flags(flags)
                    .build();
        }

        double contentVol = (product.getContentVolumeMl() != null ? product.getContentVolumeMl() : 0.0) * 1000.0;
        double fillRatio = (contentVol / outerVol) * 100.0;

        String detail = String.format("미국 FDA 1차용기 충전율: %.1f%% (수치 판정 제외 대상, 용기외용적: %.0f mm³)", 
                fillRatio, outerVol);

        return RatioResult.builder()
                .country("US")
                .ratio(fillRatio)
                .status(null) // 미국은 합격/불합격 결과값 자체를 반환하지 않고 null 반환
                .detailMessage(detail)
                .flags(flags)
                .build();
    }
}
