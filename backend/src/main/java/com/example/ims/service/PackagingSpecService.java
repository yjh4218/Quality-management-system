package com.example.ims.service;

import com.example.ims.entity.*;
import com.example.ims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 포장사양서 핵심 비즈니스 로직 서비스 (Feature 3, 4, 5, 6, 7, 9, 10, 11)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PackagingSpecService {

    private final PackagingSpecificationRepository specRepository;
    private final ProductRepository productRepository;
    private final MasterDataService masterDataService;
    private final PackagingSpecBomItemRepository bomItemRepository;

    @Transactional(readOnly = true)
    public List<PackagingSpecification> getSpecsByProductId(Long productId) {
        return specRepository.findByProductId(productId);
    }

    @Transactional
    public PackagingSpecification createSpec(Long productId, String username) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        PackagingSpecification spec = PackagingSpecification.builder()
                .product(product)
                .version(getNextVersion(productId))
                .applyChannelSticker(shouldApplySticker(product))
                .lastModifiedBy(username)
                .build();

        // Feature 2: 제품 유형별 기본 포장방법 자동 지정
        masterDataService.getTemplateByType(product.getProductType())
                .ifPresent(template -> {
                    String summary = template.getSteps().stream()
                            .map(step -> String.format("Step %d: %s", step.getStepNumber(), step.getInstruction()))
                            .collect(Collectors.joining("\n"));
                    spec.setPackagingMethodText(summary);
                });

        // Feature 6: 채널별 팔레트 사양 자동 지정
        spec.setPalletType(calculateDefaultPalette(product));

        return specRepository.save(spec);
    }

    /**
     * Feature 5: 마스터 상품 포장사양서 복사
     */
    @Transactional
    public PackagingSpecification copyFromMaster(Long productId, Long masterProductId, String username) {
        PackagingSpecification masterSpec = specRepository.findByProductId(masterProductId).stream()
                .findFirst() // 최신 버전 또는 기본 버전 선택 로직 가능
                .orElseThrow(() -> new RuntimeException("Master specification not found"));

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        PackagingSpecification newSpec = PackagingSpecification.builder()
                .product(product)
                .version(getNextVersion(productId))
                .packagingMethodText(masterSpec.getPackagingMethodText())
                .packagingMethodImage(masterSpec.getPackagingMethodImage())
                .inboxSpec(masterSpec.getInboxSpec())
                .zipperBagSpec(masterSpec.getZipperBagSpec())
                .outboxSpec(masterSpec.getOutboxSpec())
                .palletStackingSpec(masterSpec.getPalletStackingSpec())
                .palletType(masterSpec.getPalletType())
                .lotAndExpiryFormat(masterSpec.getLotAndExpiryFormat())
                .applyChannelSticker(shouldApplySticker(product))
                .lastModifiedBy(username)
                .build();

        PackagingSpecification saved = specRepository.save(newSpec);

        // BOM 항목 복사 (Feature 11)
        if (masterSpec.getBomItems() != null) {
            List<PackagingSpecBomItem> newBomItems = masterSpec.getBomItems().stream()
                    .map(item -> PackagingSpecBomItem.builder()
                            .packagingSpec(saved)
                            .masterMaterial(item.getMasterMaterial())
                            .specification(item.getSpecification())
                            .usageCount(item.getUsageCount())
                            .sortOrder(item.getSortOrder())
                            .build())
                    .collect(Collectors.toList());
            bomItemRepository.saveAll(newBomItems);
        }

        return saved;
    }

    @Transactional
    public PackagingSpecification saveSpec(PackagingSpecification spec) {
        // Handle BOM items persistence
        if (spec.getBomItems() != null) {
            spec.getBomItems().forEach(item -> item.setPackagingSpec(spec));
        }
        return specRepository.save(spec);
    }

    @Transactional
    public void syncRulesForChannel(SalesChannel channel) {
        log.info("Starting rule synchronization for channel: {}", channel.getName());
        
        // 1. 해당 채널을 포함하는 모든 제품 찾기
        List<Product> products = productRepository.findAll().stream()
                .filter(p -> p.getChannels().contains(channel))
                .collect(Collectors.toList());

        // 2. 해당 채널의 마스터 규칙 가져오기
        List<ChannelPackagingRule> rules = masterDataService.getRulesByChannel(channel);

        for (Product product : products) {
            // 해당 제품의 모든 사양서(최신 버전 등)에 규칙 반영
            List<PackagingSpecification> specs = specRepository.findByProductId(product.getId());
            for (PackagingSpecification spec : specs) {
                applyChannelRulesToSpec(spec, rules);
                spec.setRevisionNotes(spec.getRevisionNotes() + "\n[SYSTEM] " + channel.getName() + " 채널 공통 규칙 적용됨.");
                specRepository.save(spec);
            }
        }
        log.info("Rule synchronization completed for {} products in channel {}.", products.size(), channel.getName());
    }

    private void applyChannelRulesToSpec(PackagingSpecification spec, List<ChannelPackagingRule> rules) {
        for (ChannelPackagingRule rule : rules) {
            switch (rule.getRuleType()) {
                case "LABELING":
                case "PROMOTION":
                    // 착인/라벨링 관련 규칙 반영
                    String existingFormat = spec.getLotAndExpiryFormat() != null ? spec.getLotAndExpiryFormat() : "";
                    spec.setLotAndExpiryFormat(rule.getWarningMessage()); // 완전 대체
                    break;
                case "LOGISTICS":
                    if ("PALLET_SPEC".equals(rule.getRuleValue())) {
                        // 규격 정보는 비고나 사양에 추가 가능하지만, 여기선 단순 매핑
                    }
                    break;
                // 추가적인 규칙 타입에 대한 매핑 로직 확장 가능
            }
        }
    }

    private Integer getNextVersion(Long productId) {
        return specRepository.findByProductId(productId).size() + 1;
    }

    private PaletteType calculateDefaultPalette(Product product) {
        if (product.getChannels() == null || product.getChannels().isEmpty()) return PaletteType.DISPOSABLE_EXPORT;

        for (SalesChannel channel : product.getChannels()) {
            if (channel.getName().contains("국내") || channel.getName().contains("OY")) return PaletteType.AJU;
            if (channel.getName().contains("EU/ON")) return PaletteType.WOODEN_FUMIGATED;
        }
        
        return PaletteType.DISPOSABLE_EXPORT;
    }

    private boolean shouldApplySticker(Product product) {
        if (product.getChannels() == null) return false;
        return product.getChannels().stream()
                .anyMatch(ch -> ch.getName().contains("EU") || ch.getName().contains("AMZ"));
    }
}
