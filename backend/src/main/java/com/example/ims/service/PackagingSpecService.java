package com.example.ims.service;

import com.example.ims.entity.*;
import com.example.ims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.ims.dto.PackagingSpecFullDto;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Comparator;
import java.util.stream.Collectors;

/**
 * 포장사양서 핵심 비즈니스 로직 서비스 (개편 버전)
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
    private final PackagingMethodImageRepository methodImageRepository;
    private final AuditLogService auditLogService;
    private final com.example.ims.repository.ChannelSpecialNoteRepository specialNoteRepository;

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

        // 기본 포장공정 템플릿 적용
        masterDataService.getTemplateByType(product.getProductType())
                .ifPresent(template -> {
                    String summary = template.getSteps().stream()
                            .map(step -> String.format("Step %d: %s", step.getStepNumber(), step.getInstruction()))
                            .collect(Collectors.joining("\n"));
                    spec.setPackagingMethodText(summary);
                });

        // 채널별 규칙 적용 및 디폴트 팔레트 산출
        spec.setPalletType(calculateDefaultPalette(product));
        
        // 채널 공통 규칙 적용
        if (product.getChannels() != null) {
            boolean hasNonGeneral = product.getChannels().stream()
                    .anyMatch(ch -> !"일반(GENERAL)".equals(ch.getName()));
            
            if (product.getChannels().size() > 1 && hasNonGeneral) {
                long nonGeneralCount = product.getChannels().stream()
                        .filter(ch -> !"일반(GENERAL)".equals(ch.getName()))
                        .count();
                if (nonGeneralCount > 1) {
                    spec.setRemarks("[SYSTEM] 복수 채널 감지: 담당자 확인 필요");
                }
            }
            
            for (SalesChannel channel : product.getChannels()) {
                List<ChannelPackagingRule> rules = masterDataService.getRulesByChannel(channel);
                applyChannelRulesToSpec(spec, rules);
            }
        }

        PackagingSpecification savedSpec = specRepository.save(spec);

        try {
            auditLogService.logAction(
                    username != null ? username : "SYSTEM",
                    "CREATE_PACKAGING_SPEC",
                    "PACKAGING_SPEC",
                    String.format("포장사양서 신규 생성 [ID: %d, 품목: %s, 버전: %s]", savedSpec.getId(), product.getProductName(), savedSpec.getVersion())
            );
        } catch (Exception e) {
            log.error("Audit log failed for createSpec", e);
        }

        return savedSpec;
    }

    /**
     * 마스터 상품 포장사양서 복사
     */
    @Transactional
    public PackagingSpecification copyFromMaster(Long productId, Long masterProductId, String username) {
        PackagingSpecification masterSpec = specRepository.findByProductId(masterProductId).stream()
                .findFirst()
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
                .lastModifiedBy(username)
                .build();

        // [복사 규칙 개선] 채널 종속 필드들은 복사하지 않고 신규 상품 기준 재계산
        newSpec.setPalletType(calculateDefaultPalette(product));
        newSpec.setApplyChannelSticker(shouldApplySticker(product));
        
        // 채널 공통 규칙 반영
        if (product.getChannels() != null) {
            boolean hasNonGeneral = product.getChannels().stream()
                    .anyMatch(ch -> !"일반(GENERAL)".equals(ch.getName()));
            
            if (product.getChannels().size() > 1 && hasNonGeneral) {
                long nonGeneralCount = product.getChannels().stream()
                        .filter(ch -> !"일반(GENERAL)".equals(ch.getName()))
                        .count();
                if (nonGeneralCount > 1) {
                    newSpec.setRemarks("[SYSTEM] 복수 채널 감지: 담당자 확인 필요");
                }
            }
            
            for (SalesChannel channel : product.getChannels()) {
                List<ChannelPackagingRule> rules = masterDataService.getRulesByChannel(channel);
                applyChannelRulesToSpec(newSpec, rules);
            }
        }

        PackagingSpecification saved = specRepository.save(newSpec);

        // [추가] 포장 이미지 및 주석 정보 전체 복제 (새로운 별개 row로 복제)
        List<com.example.ims.entity.PackagingMethodImage> masterImages = methodImageRepository.findActiveBySpecId(masterSpec.getId());
        if (masterImages != null) {
            List<com.example.ims.entity.PackagingMethodImage> newImages = masterImages.stream()
                    .map(img -> com.example.ims.entity.PackagingMethodImage.builder()
                            .packagingSpecId(saved.getId())
                            .imageUrl(img.getImageUrl())
                            .displayOrder(img.getDisplayOrder())
                            .layoutWidthPx(img.getLayoutWidthPx())
                            .layoutHeightPx(img.getLayoutHeightPx())
                            .annotationsJson(img.getAnnotationsJson())
                            .captionText(img.getCaptionText())
                            .thumbnailUrl(img.getThumbnailUrl())
                            .build())
                    .collect(Collectors.toList());
            methodImageRepository.saveAll(newImages);
        }

        // BOM 항목 복사
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
        if (spec.getBomItems() != null) {
            spec.getBomItems().forEach(item -> item.setPackagingSpec(spec));
        }
        return specRepository.save(spec);
    }

    @Transactional
    public void syncRulesForChannel(SalesChannel channel) {
        log.info("Starting rule synchronization for channel: {}", channel.getName());
        
        List<Product> products = productRepository.findAll().stream()
                .filter(p -> p.getChannels().contains(channel))
                .collect(Collectors.toList());

        List<ChannelPackagingRule> rules = masterDataService.getRulesByChannel(channel);

        for (Product product : products) {
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
                        if (rule.getRuleValue().contains("1,100") || rule.getRuleValue().contains("1100")) {
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

                case "PAD_FRAME_REQUIRED":
                    if ("필요".equals(rule.getRuleValue())) {
                        if (remarksBuilder.length() > 0) {
                            remarksBuilder.append("\n");
                        }
                        remarksBuilder.append("[적재사항] 패드 및 각대 부착 필수 채널");
                    }
                    break;

                case "SPECIAL_NOTE":
                    if (rule.getRuleValue() != null && !rule.getRuleValue().trim().isEmpty()) {
                        if (remarksBuilder.length() > 0) {
                            remarksBuilder.append("\n");
                        }
                        remarksBuilder.append("• ").append(rule.getRuleValue());
                    }
                    break;
            }
        }

        // 유통 채널별 항목별 특이사항 (ChannelSpecialNote) 렌더링 연결 ([항목명] 내용)
        if (spec.getProduct() != null && spec.getProduct().getChannels() != null) {
            for (SalesChannel ch : spec.getProduct().getChannels()) {
                var notes = specialNoteRepository.findByChannelId(ch.getId());
                notes.stream()
                        .filter(n -> n.getCategory() != null && Boolean.TRUE.equals(n.getCategory().getIsActive()))
                        .filter(n -> n.getNoteContent() != null && !n.getNoteContent().trim().isEmpty())
                        .sorted(Comparator.comparingInt(n -> n.getCategory().getDisplayOrder()))
                        .forEach(n -> {
                            if (remarksBuilder.length() > 0) {
                                remarksBuilder.append("\n");
                            }
                            remarksBuilder.append(String.format("[%s] %s", n.getCategory().getCategoryLabel(), n.getNoteContent().trim()));
                        });
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

        // DB 채널 규칙 조회를 통해 동적으로 산출
        for (SalesChannel channel : product.getChannels()) {
            List<ChannelPackagingRule> rules = masterDataService.getRulesByChannel(channel);
            for (ChannelPackagingRule rule : rules) {
                if ("PALLET_SPEC".equals(rule.getRuleType()) && rule.getRuleValue() != null) {
                    String specVal = rule.getRuleValue();
                    if (specVal.contains("아주팔레트")) {
                        return PaletteType.AJU;
                    }
                    if (specVal.contains("목재") || specVal.contains("GMA")) {
                        return PaletteType.WOODEN_FUMIGATED;
                    }
                }
            }
        }
        
        return PaletteType.DISPOSABLE_EXPORT;
    }

    private boolean shouldApplySticker(Product product) {
        if (product == null || product.getChannels() == null) return false;
        
        // DB 채널 규칙 조회를 통해 동적으로 판단
        for (SalesChannel channel : product.getChannels()) {
            List<ChannelPackagingRule> rules = masterDataService.getRulesByChannel(channel);
            for (ChannelPackagingRule rule : rules) {
                if ("STICKER_REQUIRED".equals(rule.getRuleType()) && "부착".equals(rule.getRuleValue())) {
                    return true;
                }
            }
        }
        return false;
    }

    @Transactional
    public PackagingSpecFullDto saveFullSpec(PackagingSpecFullDto dto, String username) {
        PackagingSpecification spec = dto.getSpec();
        if (spec.getProduct() != null && spec.getProduct().getId() != null) {
            Product prod = productRepository.findById(spec.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));
            spec.setProduct(prod);
        }
        
        // [검증 로직] 각 채널별 포장 사양 규칙 동적 검사
        if (spec.getProduct() != null && spec.getProduct().getChannels() != null) {
            for (SalesChannel channel : spec.getProduct().getChannels()) {
                // 1. 팔레트 종류 일치 검사
                if (channel.getPalletType() != null && !channel.getPalletType().trim().isEmpty() && spec.getPalletType() != null) {
                    String reqPalette = channel.getPalletType();
                    PaletteType selectedPalette = spec.getPalletType();
                    boolean isMatch = false;
                    if (reqPalette.contains("아주팔레트") && selectedPalette == PaletteType.AJU) {
                        isMatch = true;
                    } else if ((reqPalette.contains("일회용") || reqPalette.contains("검은색")) && selectedPalette == PaletteType.DISPOSABLE_EXPORT) {
                        isMatch = true;
                    } else if (reqPalette.contains("목재") && selectedPalette == PaletteType.WOODEN_FUMIGATED) {
                        isMatch = true;
                    }
                    if (!isMatch) {
                        throw new RuntimeException(String.format("[%s 채널 오류] 규정상 %s를 사용해야 합니다. 현재 선택된 팔레트: %s", 
                                channel.getName(), reqPalette, selectedPalette.getDescription()));
                    }
                }

                // 2. 적재 높이 검사 (onePalletHeight 입력값 체크)
                if (spec.getOnePalletHeight() != null && channel.getMaxStackHeightMm() != null) {
                    if (spec.getOnePalletHeight() > channel.getMaxStackHeightMm()) {
                        throw new RuntimeException(String.format("[%s 채널 오류] 적재높이 %dmm를 초과할 수 없습니다. 현재 입력: %.1fmm",
                                channel.getName(), channel.getMaxStackHeightMm(), spec.getOnePalletHeight()));
                    }
                }

                // 3. 물류 스티커 필수 여부 검사
                if (Boolean.TRUE.equals(channel.getChannelStickerRequired()) && !spec.isApplyChannelSticker()) {
                    throw new RuntimeException(String.format("[%s 채널 오류] 물류 스티커 부착이 필수입니다. 스티커 부착 옵션을 켜 주십시오.", channel.getName()));
                }

                // 4. 사용기한 규격 형식 검사
                if ("표기금지".equals(channel.getExpDateFormat())) {
                    if (spec.getLotAndExpiryFormat() != null && !spec.getLotAndExpiryFormat().trim().isEmpty() && !"표기금지".equals(spec.getLotAndExpiryFormat())) {
                        throw new RuntimeException(String.format("[%s 채널 오류] 사용기한 표기가 금지되어 있습니다. '표기금지'로 설정해 주십시오.", channel.getName()));
                    }
                } else if (channel.getExpDateFormat() != null && !channel.getExpDateFormat().trim().isEmpty() && !"(미정)".equals(channel.getExpDateFormat())) {
                    String reqFormat = channel.getExpDateFormat();
                    String userFormat = spec.getLotAndExpiryFormat();
                    if (userFormat == null || !userFormat.contains(reqFormat)) {
                        throw new RuntimeException(String.format("[%s 채널 오류] 사용기한 형식으로 '%s'를 포함해야 합니다. 현재 입력: %s",
                                channel.getName(), reqFormat, userFormat == null ? "없음" : userFormat));
                    }
                }
            }
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
        
        if (spec.getId() != null) {
            specRepository.findById(spec.getId()).ifPresent(existing -> {
                spec.setBomItems(existing.getBomItems());
            });
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

        // 3. 포장 이미지/주석 정보 복원/저장
        List<com.example.ims.entity.PackagingMethodImage> currentImages = methodImageRepository.findActiveBySpecId(specId);
        if (currentImages != null && !currentImages.isEmpty()) {
            currentImages.forEach(img -> {
                img.setDeletedAt(LocalDateTime.now());
            });
            methodImageRepository.saveAll(currentImages);
        }
        List<com.example.ims.entity.PackagingMethodImage> methodImages = dto.getMethodImages();
        if (methodImages != null) {
            methodImages.forEach(img -> {
                img.setPackagingSpecId(specId);
                img.setDeletedAt(null);
            });
            methodImageRepository.saveAll(methodImages);
        }
        
        List<com.example.ims.entity.PackagingMethodImage> activeImages = methodImageRepository.findActiveBySpecId(specId);

        try {
            auditLogService.logAction(
                    username != null ? username : "SYSTEM",
                    "SAVE_PACKAGING_SPEC",
                    "PACKAGING_SPEC",
                    String.format("포장사양서 전체 저장/업데이트 [ID: %d, 품목: %s, 버전: %s]", specId, savedSpec.getProduct() != null ? savedSpec.getProduct().getProductName() : "-", savedSpec.getVersion())
            );
        } catch (Exception e) {
            log.error("Audit log failed for saveFullSpec", e);
        }
        
        return new PackagingSpecFullDto(savedSpec, revisions, components, activeImages);
    }

    @Transactional(readOnly = true)
    public PackagingSpecFullDto getFullSpecByProductId(Long productId) {
        List<PackagingSpecification> specs = specRepository.findByProductId(productId);
        
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
            
            // 복수 채널 감지 경고
            if (prod.getChannels() != null) {
                boolean hasNonGeneral = prod.getChannels().stream()
                        .anyMatch(ch -> !"일반(GENERAL)".equals(ch.getName()));
                
                if (prod.getChannels().size() > 1 && hasNonGeneral) {
                    long nonGeneralCount = prod.getChannels().stream()
                            .filter(ch -> !"일반(GENERAL)".equals(ch.getName()))
                            .count();
                    if (nonGeneralCount > 1) {
                        newSpec.setRemarks("[SYSTEM] 복수 채널 감지: 담당자 확인 필요");
                    }
                }
                
                for (SalesChannel channel : prod.getChannels()) {
                    List<ChannelPackagingRule> rules = masterDataService.getRulesByChannel(channel);
                    applyChannelRulesToSpec(newSpec, rules);
                }
            }
            
            return new PackagingSpecFullDto(newSpec, new java.util.ArrayList<>(), new java.util.ArrayList<>(), new java.util.ArrayList<>());
        }
        
        PackagingSpecification latestSpec = specs.stream()
                .max((a, b) -> Integer.compare(
                        a.getVersion() != null ? a.getVersion() : 0, 
                        b.getVersion() != null ? b.getVersion() : 0))
                .orElse(specs.get(0));
        
        // [제품 마스터 -> 사양서 동기화]
        syncSpecWithProduct(latestSpec, latestSpec.getProduct());
        
        List<PackagingSpecRevision> revisions = revisionRepository.findBySpecId(latestSpec.getId());
        List<PackagingSpecComponent> components = componentRepository.findBySpecId(latestSpec.getId());
        List<com.example.ims.entity.PackagingMethodImage> activeImages = methodImageRepository.findActiveBySpecId(latestSpec.getId());
        
        return new PackagingSpecFullDto(latestSpec, revisions, components, activeImages);
    }

    private Integer parseIntSafe(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Integer.parseInt(s.trim()); }
        catch (NumberFormatException e) { return null; }
    }

    private Double parseDoubleSafe(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Double.parseDouble(s.trim()); }
        catch (NumberFormatException e) { return null; }
    }

    private boolean hasAllDimensions(Double len, Double width, Double height) {
        if (len == null) return false;
        if (width == null) return false;
        return true;
    }

    private void syncSpecWithProduct(PackagingSpecification spec, Product prod) {
        if (prod == null || spec == null) return;

        // 1. 인박스 동기화
        if (prod.getInboxInfo() != null) {
            if (prod.getInboxInfo().getInboxQuantity() != null) {
                spec.setInboxQty(prod.getInboxInfo().getInboxQuantity());
            }
            if (hasAllDimensions(prod.getInboxInfo().getInboxLength(), 
                                prod.getInboxInfo().getInboxWidth(), 
                                prod.getInboxInfo().getInboxHeight())) {
                spec.setInboxSize(prod.getInboxInfo().getInboxLength() + "x" 
                    + prod.getInboxInfo().getInboxWidth() + "x" 
                    + prod.getInboxInfo().getInboxHeight());
            }
        }

        // 2. 아웃박스 동기화
        if (prod.getOutboxInfo() != null) {
            if (prod.getOutboxInfo().getOutboxQuantity() != null) {
                spec.setOutboxQty(prod.getOutboxInfo().getOutboxQuantity());
            }
            if (hasAllDimensions(prod.getOutboxInfo().getOutboxLength(), 
                                prod.getOutboxInfo().getOutboxWidth(), 
                                prod.getOutboxInfo().getOutboxHeight())) {
                spec.setOutboxSize(prod.getOutboxInfo().getOutboxLength() + "x" 
                    + prod.getOutboxInfo().getOutboxWidth() + "x" 
                    + prod.getOutboxInfo().getOutboxHeight());
            }
            if (prod.getOutboxInfo().getOutboxWeight() != null) {
                spec.setOneOutboxWeight(prod.getOutboxInfo().getOutboxWeight());
            }
        }

        // 3. 팔레트 동기화
        if (prod.getPalletInfo() != null) {
            if (hasAllDimensions(prod.getPalletInfo().getPalletLength(), 
                                prod.getPalletInfo().getPalletWidth(), null)) {
                spec.setPalletSize(prod.getPalletInfo().getPalletLength() + "x" 
                    + prod.getPalletInfo().getPalletWidth());
            }
            if (prod.getPalletInfo().getPalletHeight() != null) {
                spec.setOnePalletHeight(prod.getPalletInfo().getPalletHeight());
            }
            // 1팔레트 중량 계산 (아웃박스중량 × 팔레트입수량)
            if (prod.getOutboxInfo() != null && prod.getOutboxInfo().getOutboxWeight() != null
                && prod.getPalletInfo().getPalletQuantity() != null) {
                double w = prod.getOutboxInfo().getOutboxWeight();
                int q = prod.getPalletInfo().getPalletQuantity();
                spec.setOnePalletWeight(Math.round(w * q * 10.0) / 10.0);
            }
        }

        // 4. 사용기한 정보
        if (prod.getShelfLifeMonths() != null || prod.getOpenedShelfLifeMonths() != null) {
            String shelf = prod.getShelfLifeMonths() != null 
                ? "제조일로부터 " + prod.getShelfLifeMonths() + "개월" : "";
            String opened = prod.getOpenedShelfLifeMonths() != null 
                ? "개봉 후 " + prod.getOpenedShelfLifeMonths() + "개월" : "";
            String combined = java.util.stream.Stream.of(shelf, opened).filter(s -> !s.isEmpty())
                .collect(Collectors.joining(" / "));
            if (!combined.isEmpty()) {
                spec.setMarkingStandard(combined);
            }
        }

        // 5. 유통채널 규칙 동기화
        if (prod.getChannels() != null && !prod.getChannels().isEmpty()) {
            spec.setApplyChannelSticker(shouldApplySticker(prod));
            for (com.example.ims.entity.SalesChannel channel : prod.getChannels()) {
                List<ChannelPackagingRule> rules = masterDataService.getRulesByChannel(channel);
                applyChannelRulesToSpec(spec, rules);
            }
        }
    }
}
