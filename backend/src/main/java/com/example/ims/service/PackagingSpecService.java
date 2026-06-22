package com.example.ims.service;

import com.example.ims.entity.*;
import com.example.ims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.ims.dto.PackagingSpecFullDto;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
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
    private final PackagingSpecRevisionRepository revisionRepository;
    private final PackagingSpecComponentRepository componentRepository;

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
        StringBuilder remarksBuilder = new StringBuilder();
        if (spec.getRemarks() != null && !spec.getRemarks().isEmpty()) {
            remarksBuilder.append(spec.getRemarks());
        }

        for (ChannelPackagingRule rule : rules) {
            if (rule.getRuleType() == null) continue;
            switch (rule.getRuleType()) {
                case "PALLET_SPEC":
                    spec.setPalletTypeStr(rule.getRuleValue());
                    if (rule.getRuleValue() != null) {
                        if (rule.getRuleValue().contains("1,100")) {
                            spec.setPalletSize("1,100 x 1,100 mm");
                        } else if (rule.getRuleValue().contains("1219")) {
                            spec.setPalletSize("1,219 x 1,016 x 120 mm");
                        } else {
                            spec.setPalletSize(rule.getRuleValue());
                        }
                    }
                    break;

                case "STICKER_REQUIRED":
                    spec.setApplyChannelSticker("부착".equals(rule.getRuleValue()));
                    break;

                case "LOAD_HEIGHT":
                    spec.setPalletHeightLimit(rule.getRuleValue());
                    break;

                case "LABELING":
                    spec.setLotAndExpiryFormat(rule.getRuleValue());
                    if (rule.getWarningMessage() != null && !rule.getWarningMessage().isEmpty()) {
                        if (remarksBuilder.length() > 0) {
                            remarksBuilder.append("\n");
                        }
                        remarksBuilder.append("[채널 표기 특이사항]\n").append(rule.getWarningMessage());
                    }
                    break;
            }
        }

        if (remarksBuilder.length() > 0) {
            spec.setRemarks(remarksBuilder.toString());
        }

        spec.setPalletType(calculateDefaultPalette(spec.getProduct()));
    }

    private Integer getNextVersion(Long productId) {
        return specRepository.findByProductId(productId).size() + 1;
    }

    private PaletteType calculateDefaultPalette(Product product) {
        if (product == null || product.getChannels() == null || product.getChannels().isEmpty()) {
            return PaletteType.DISPOSABLE_EXPORT;
        }

        for (SalesChannel channel : product.getChannels()) {
            String name = channel.getName();
            if (name.contains("일반") || name.contains("OY") || name.contains("PX") || name.contains("JP/ON")) {
                return PaletteType.AJU;
            }
            if (name.contains("EU/ON")) {
                return PaletteType.WOODEN_FUMIGATED;
            }
        }
        
        return PaletteType.DISPOSABLE_EXPORT;
    }

    private boolean shouldApplySticker(Product product) {
        if (product == null || product.getChannels() == null) return false;
        return product.getChannels().stream()
                .anyMatch(ch -> ch.getName().contains("EU") || ch.getName().contains("AMZ") || ch.getName().contains("HALAL"));
    }

    @Transactional
    public PackagingSpecFullDto saveFullSpec(PackagingSpecFullDto dto, String username) {
        PackagingSpecification spec = dto.getSpec();
        if (spec.getProduct() != null && spec.getProduct().getId() != null) {
            Product prod = productRepository.findById(spec.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));
            spec.setProduct(prod);
        }
        
        spec.setLastModifiedBy(username);
        
        // 버전 계산 및 개정 노트 세팅
        List<PackagingSpecification> existingSpecs = specRepository.findByProductId(spec.getProduct().getId());
        PackagingSpecification latestSpec = null;
        int maxVersion = 0;
        for (PackagingSpecification existing : existingSpecs) {
            if (existing.getVersion() != null && existing.getVersion() > maxVersion) {
                if (spec.getId() == null || !existing.getId().equals(spec.getId())) {
                    maxVersion = existing.getVersion();
                    latestSpec = existing;
                }
            }
        }
        
        if (spec.getVersion() == null) {
            spec.setVersion(maxVersion + 1);
        }
        
        if (latestSpec == null && spec.getId() == null) {
            spec.setRevisionNotes("최초 등록");
        } else if (spec.getRevisionNotes() == null || spec.getRevisionNotes().isEmpty()) {
            spec.setRevisionNotes("포장사양 업데이트");
        }
        
        PackagingSpecification savedSpec = specRepository.save(spec);
        Long specId = savedSpec.getId();
        
        // 1. 개정 이력 저장
        revisionRepository.deleteBySpecId(specId);
        List<PackagingSpecRevision> revisions = dto.getRevisions();
        if (revisions != null) {
            revisions.forEach(r -> {
                r.setSpecId(specId);
                if (r.getRevisionDate() == null) {
                    r.setRevisionDate(LocalDate.now());
                }
            });
            revisionRepository.saveAll(revisions);
        }
        
        // 2. 구성품 리스트 저장
        componentRepository.deleteBySpecId(specId);
        List<PackagingSpecComponent> components = dto.getComponents();
        if (components != null) {
            components.forEach(c -> c.setSpecId(specId));
            componentRepository.saveAll(components);
        }
        
        return new PackagingSpecFullDto(savedSpec, revisions, components);
    }

    @Transactional(readOnly = true)
    public PackagingSpecFullDto getFullSpecByProductId(Long productId) {
        List<PackagingSpecification> specs = specRepository.findByProductId(productId);
        
        // 없으면 빈 스펙을 만들어서 내려줌
        if (specs.isEmpty()) {
            Product prod = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("Product not found"));
            
            PackagingSpecification newSpec = PackagingSpecification.builder()
                    .product(prod)
                    .version(1)
                    .applyChannelSticker(shouldApplySticker(prod))
                    .palletType(calculateDefaultPalette(prod))
                    .build();
            
            // 제품 유형별 기본 포장방법 자동 지정
            masterDataService.getTemplateByType(prod.getProductType())
                    .ifPresent(template -> {
                        String summary = template.getSteps().stream()
                                .map(step -> String.format("Step %d: %s", step.getStepNumber(), step.getInstruction()))
                                .collect(Collectors.joining("\n"));
                        newSpec.setPackagingMethodText(summary);
                    });
            
            return new PackagingSpecFullDto(newSpec, new java.util.ArrayList<>(), new java.util.ArrayList<>());
        }
        
        // 가장 버전이 높은 최신 것을 사용
        PackagingSpecification latestSpec = specs.stream()
                .max((a, b) -> Integer.compare(
                        a.getVersion() != null ? a.getVersion() : 0, 
                        b.getVersion() != null ? b.getVersion() : 0))
                .orElse(specs.get(0));
        
        List<PackagingSpecRevision> revisions = revisionRepository.findBySpecId(latestSpec.getId());
        List<PackagingSpecComponent> components = componentRepository.findBySpecId(latestSpec.getId());
        
        return new PackagingSpecFullDto(latestSpec, revisions, components);
    }
}
