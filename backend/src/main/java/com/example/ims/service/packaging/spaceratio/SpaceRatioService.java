package com.example.ims.service.packaging.spaceratio;

import com.example.ims.entity.Product;
import com.example.ims.entity.PackagingComponent;
import com.example.ims.entity.SpaceRatioCheckLog;
import com.example.ims.repository.ProductRepository;
import com.example.ims.repository.PackagingComponentRepository;
import com.example.ims.repository.SpaceRatioCheckLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SpaceRatioService {

    private final ProductRepository productRepository;
    private final PackagingComponentRepository componentRepository;
    private final SpaceRatioCheckLogRepository logRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 특정 상품 기준 6개국 포장공간비율 자동 검증 실행
     */
    @Transactional
    public List<SpaceRatioResult> checkProductSpaceRatio(Long productId, String username) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("해당 제품을 찾을 수 없습니다."));

        List<PackagingComponent> components = componentRepository.findByProductId(productId);

        List<RatioResult> rawResults = new ArrayList<>();
        rawResults.add(new KoreaSpaceRatioStrategy().calculate(product, components));
        rawResults.add(new ChinaSpaceRatioStrategy().calculate(product, components));
        rawResults.add(new TaiwanSpaceRatioStrategy().calculate(product, components));
        rawResults.add(new JapanSpaceRatioStrategy().calculate(product, components));
        rawResults.add(new EuSpaceRatioStrategy().calculate(product, components));
        rawResults.add(new UsSpaceRatioStrategy().calculate(product, components));

        List<SpaceRatioResult> results = rawResults.stream()
                .map(r -> new SpaceRatioResult(
                        r.getCountry(),
                        r.getRatio(),
                        r.getStatus(),
                        r.getDetailMessage(),
                        r.getRecommendedSpec(),
                        r.getFlags()
                )).collect(Collectors.toList());

        // 기록 저장
        try {
            String requestJson = objectMapper.writeValueAsString(product);
            String resultsJson = objectMapper.writeValueAsString(results);
            SpaceRatioCheckLog checkLog = SpaceRatioCheckLog.builder()
                    .productId(productId)
                    .itemCode(product.getItemCode())
                    .productName(product.getProductName())
                    .requestJson(requestJson)
                    .resultsJson(resultsJson)
                    .username(username)
                    .build();
            logRepository.save(checkLog);
        } catch (Exception e) {
            log.error("Failed to save SpaceRatioCheckLog", e);
        }

        return results;
    }

    /**
     * 독립 계산기 전용 6개국 공간비율 산출
     */
    @Transactional
    public List<SpaceRatioResult> calculateSpaceRatio(SpaceRatioRequest request, String username) {
        // 독립 계산을 위한 임시 Product 및 구성 생성
        Product tempProduct = new Product();
        tempProduct.setContentVolumeMl(request.getContentVolumeMl());
        tempProduct.setContentType(request.getContentType());
        tempProduct.setPlanningSet(request.getIsPlanningSet() != null ? request.getIsPlanningSet() : false);

        // 치수(dimensions) 정보 설정
        com.example.ims.entity.Dimensions dims = new com.example.ims.entity.Dimensions();
        dims.setWidth(request.getPackagingWidth());
        dims.setLength(request.getPackagingLength());
        dims.setHeight(request.getPackagingHeight());
        tempProduct.setDimensions(dims);

        // 가상 구성품 및 1개 레이어 생성
        List<PackagingComponent> tempComponents = new ArrayList<>();
        if (request.getNumberOfLayers() != null && request.getNumberOfLayers() > 0) {
            PackagingComponent comp = new PackagingComponent();
            comp.setComponentName("임시 계산용 용기");
            
            List<com.example.ims.entity.PackagingLayer> layers = new ArrayList<>();
            for (int i = 1; i <= request.getNumberOfLayers(); i++) {
                com.example.ims.entity.PackagingLayer layer = com.example.ims.entity.PackagingLayer.builder()
                        .layerOrder(i)
                        .layerType("CONTAINER")
                        .innerLengthMm(request.getPackagingLength() != null ? request.getPackagingLength() : 0.0)
                        .innerWidthMm(request.getPackagingWidth() != null ? request.getPackagingWidth() : 0.0)
                        .innerHeightMm(request.getPackagingHeight() != null ? request.getPackagingHeight() : 0.0)
                        .outerLengthMm(request.getPackagingLength() != null ? request.getPackagingLength() : 0.0)
                        .outerWidthMm(request.getPackagingWidth() != null ? request.getPackagingWidth() : 0.0)
                        .outerHeightMm(request.getPackagingHeight() != null ? request.getPackagingHeight() : 0.0)
                        .usesCushioningMaterial(false)
                        .build();
                layers.add(layer);
            }
            comp.setLayers(layers);
            tempComponents.add(comp);
        }

        List<RatioResult> rawResults = new ArrayList<>();
        rawResults.add(new KoreaSpaceRatioStrategy().calculate(tempProduct, tempComponents));
        rawResults.add(new ChinaSpaceRatioStrategy().calculate(tempProduct, tempComponents));
        rawResults.add(new TaiwanSpaceRatioStrategy().calculate(tempProduct, tempComponents));
        rawResults.add(new JapanSpaceRatioStrategy().calculate(tempProduct, tempComponents));
        rawResults.add(new EuSpaceRatioStrategy().calculate(tempProduct, tempComponents));
        rawResults.add(new UsSpaceRatioStrategy().calculate(tempProduct, tempComponents));

        List<SpaceRatioResult> results = rawResults.stream()
                .map(r -> new SpaceRatioResult(
                        r.getCountry(),
                        r.getRatio(),
                        r.getStatus(),
                        r.getDetailMessage(),
                        r.getRecommendedSpec(),
                        r.getFlags()
                )).collect(Collectors.toList());

        // 기록 저장
        try {
            String requestJson = objectMapper.writeValueAsString(request);
            String resultsJson = objectMapper.writeValueAsString(results);
            SpaceRatioCheckLog checkLog = SpaceRatioCheckLog.builder()
                    .itemCode("CALCULATOR")
                    .productName("독립 계산기 실행")
                    .requestJson(requestJson)
                    .resultsJson(resultsJson)
                    .username(username)
                    .build();
            logRepository.save(checkLog);
        } catch (Exception e) {
            log.error("Failed to save SpaceRatioCheckLog for Calculator", e);
        }

        return results;
    }

    /**
     * 포장공간비율 검증 이력 최신순 조회 (페이징 보장)
     */
    @Transactional(readOnly = true)
    public Page<SpaceRatioCheckLog> getCheckLogs(Pageable pageable) {
        return logRepository.findAllByOrderByCheckedAtDesc(pageable);
    }
}
