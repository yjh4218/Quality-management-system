package com.example.ims.service.packaging.spaceratio;

import com.example.ims.entity.Product;
import com.example.ims.entity.PackagingComponent;
import java.util.List;

public interface PackagingSpaceRatioStrategy {
    /**
     * 국가별 포장공간비율 계산을 실행합니다.
     * @param product 제품 기본 사양 및 용량 정보
     * @param components 포장재 구성품 및 레이어 목록
     * @return RatioResult 계산 및 판정 결과 레코드
     */
    RatioResult calculate(Product product, List<PackagingComponent> components);
}
