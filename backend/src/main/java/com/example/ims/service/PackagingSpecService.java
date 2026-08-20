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
    private final com.example.ims.repository.SalesChannelRepository salesChannelRepository;

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
                applyChannelRulesToSpec(spec, channel);
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
                .inboxViewConfig(masterSpec.getInboxViewConfig())
                .outboxViewConfig(masterSpec.getOutboxViewConfig())
                .palletViewConfig(masterSpec.getPalletViewConfig())
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
                applyChannelRulesToSpec(newSpec, channel);
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
                .filter(p -> p.getChannels() != null && p.getChannels().contains(channel))
                .collect(Collectors.toList());

        for (Product product : products) {
            List<PackagingSpecification> specs = specRepository.findByProductId(product.getId());
            for (PackagingSpecification spec : specs) {
                applyChannelRulesToSpec(spec, channel);
                spec.setRevisionNotes(spec.getRevisionNotes() != null ? spec.getRevisionNotes() + "\n[SYSTEM] " + channel.getName() + " 채널 공통 규칙 적용됨." : "[SYSTEM] " + channel.getName() + " 채널 공통 규칙 적용됨.");
                specRepository.save(spec);
            }
        }
        log.info("Rule synchronization completed for {} products in channel {}.", products.size(), channel.getName());
    }

    private void applyChannelRulesToSpec(PackagingSpecification spec, SalesChannel channel) {
        if (channel == null) return;
        boolean isSet = spec.getProduct() != null && spec.getProduct().isPlanningSet();

        if (channel.getPalletType() != null && !channel.getPalletType().isEmpty()) {
            spec.setPalletTypeStr(channel.getPalletType());
        }
        if (channel.getPalletSpec() != null && !channel.getPalletSpec().isEmpty()) {
            spec.setPalletSize(channel.getPalletSpec());
        }
        if (channel.getChannelStickerRequired() != null) {
            spec.setApplyChannelSticker(channel.getChannelStickerRequired());
        }
        if (isSet && channel.getSetPalletHeightLimit() != null && !channel.getSetPalletHeightLimit().isEmpty()) {
            spec.setPalletHeightLimit(channel.getSetPalletHeightLimit());
        } else if (channel.getMaxStackHeightMm() != null) {
            spec.setPalletHeightLimit(channel.getMaxStackHeightMm() + "mm 이하");
        }
        if (channel.getExpDateFormat() != null && !channel.getExpDateFormat().isEmpty()) {
            spec.setLotAndExpiryFormat("EXP " + channel.getExpDateFormat());
        }

        // [특이사항 자동 생성 예외 처리]
        if (spec.getId() == null && (spec.getRemarks() == null || spec.getRemarks().trim().isEmpty())) {
            StringBuilder remarksBuilder = new StringBuilder();
            if (channel.getPadAndFrameRequired() != null && channel.getPadAndFrameRequired()) {
                remarksBuilder.append("[적재사항] 패드 및 각대 부착 필수 채널");
            }
            if (channel.getSpecialNotes() != null && !channel.getSpecialNotes().trim().isEmpty()) {
                if (remarksBuilder.length() > 0) remarksBuilder.append("\n");
                remarksBuilder.append("• ").append(channel.getSpecialNotes().trim());
            }

            if (spec.getProduct() != null && spec.getProduct().getChannels() != null) {
                for (SalesChannel ch : spec.getProduct().getChannels()) {
                    var notes = specialNoteRepository.findByChannelId(ch.getId());
                    notes.stream()
                            .filter(n -> n.getCategory() != null && Boolean.TRUE.equals(n.getCategory().getIsActive()))
                            .filter(n -> n.getNoteContent() != null && !n.getNoteContent().trim().isEmpty())
                            .sorted(Comparator.comparingInt(n -> n.getCategory().getDisplayOrder()))
                            .forEach(n -> {
                                if (remarksBuilder.length() > 0) remarksBuilder.append("\n");
                                remarksBuilder.append(String.format("[%s] %s", n.getCategory().getCategoryLabel(), n.getNoteContent().trim()));
                            });
                }
            }

            if (remarksBuilder.length() > 0) {
                spec.setRemarks(remarksBuilder.toString());
            }
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
            String specVal = channel.getPalletSpec() != null ? channel.getPalletSpec() : channel.getPalletType();
            if (specVal != null) {
                if (specVal.contains("아주팔레트") || specVal.contains("1,100") || specVal.contains("1100")) {
                    return PaletteType.AJU;
                }
                if (specVal.contains("목재") || specVal.contains("GMA") || specVal.contains("1219")) {
                    return PaletteType.WOODEN_FUMIGATED;
                }
            }
        }
        
        return PaletteType.DISPOSABLE_EXPORT;
    }

    private boolean shouldApplySticker(Product product) {
        if (product == null || product.getChannels() == null) return false;
        
        for (SalesChannel channel : product.getChannels()) {
            if (Boolean.TRUE.equals(channel.getChannelStickerRequired())) {
                return true;
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

        // [자동 동기화] palletTypeStr 입력값을 기반으로 ENUM palletType 자동 매핑
        if (spec.getPalletTypeStr() != null) {
            String pStr = spec.getPalletTypeStr().toUpperCase();
            if (pStr.contains("아주") || pStr.contains("AJU")) {
                spec.setPalletType(PaletteType.AJU);
            } else if (pStr.contains("일회용") || pStr.contains("DISPOSABLE") || pStr.contains("검은색")) {
                spec.setPalletType(PaletteType.DISPOSABLE_EXPORT);
            } else if (pStr.contains("목재") || pStr.contains("WOOD")) {
                spec.setPalletType(PaletteType.WOODEN_FUMIGATED);
            }
        }
        
        // [검증 로직] 각 채널별 포장 사양 규칙 동적 검사 (선택된 채널이 있으면 선택 채널 대상, 없으면 제품 연동 채널 전체)
        List<SalesChannel> channelsToValidate = new java.util.ArrayList<>();
        if (dto.getSelectedChannels() != null && !dto.getSelectedChannels().isEmpty()) {
            for (SalesChannel ch : dto.getSelectedChannels()) {
                if (ch.getId() != null) {
                    salesChannelRepository.findById(ch.getId()).ifPresent(channelsToValidate::add);
                } else if (ch.getName() != null) {
                    salesChannelRepository.findByNameAndIsDeletedFalse(ch.getName()).ifPresent(channelsToValidate::add);
                }
            }
        }
        if (channelsToValidate.isEmpty() && spec.getProduct() != null && spec.getProduct().getChannels() != null) {
            channelsToValidate.addAll(spec.getProduct().getChannels());
        }

        if (!channelsToValidate.isEmpty()) {
            for (SalesChannel channel : channelsToValidate) {
                // 1. 팔레트 종류 일치 검사 및 자동 보정
                if (channel.getPalletType() != null && !channel.getPalletType().trim().isEmpty()) {
                    String reqPalette = channel.getPalletType();
                    PaletteType selectedPalette = spec.getPalletType();
                    boolean isMatch = false;
                    
                    if (selectedPalette != null) {
                        if (reqPalette.contains("아주") && selectedPalette == PaletteType.AJU) {
                            isMatch = true;
                        } else if ((reqPalette.contains("일회용") || reqPalette.contains("검은색")) && selectedPalette == PaletteType.DISPOSABLE_EXPORT) {
                            isMatch = true;
                        } else if (reqPalette.contains("목재") && selectedPalette == PaletteType.WOODEN_FUMIGATED) {
                            isMatch = true;
                        }
                    }
                    
                    if (!isMatch && spec.getPalletTypeStr() != null) {
                        String userPalStr = spec.getPalletTypeStr();
                        if (reqPalette.contains("아주") && (userPalStr.contains("아주") || userPalStr.contains("AJU"))) {
                            isMatch = true;
                        } else if ((reqPalette.contains("일회용") || reqPalette.contains("검은색")) && (userPalStr.contains("일회용") || userPalStr.contains("검은색"))) {
                            isMatch = true;
                        } else if (reqPalette.contains("목재") && userPalStr.contains("목재")) {
                            isMatch = true;
                        }
                    }

                    // 불일치 시 채널 규격으로 자동 보정
                    if (!isMatch) {
                        spec.setPalletTypeStr(reqPalette);
                        if (reqPalette.contains("아주")) spec.setPalletType(PaletteType.AJU);
                        else if (reqPalette.contains("일회용") || reqPalette.contains("검은색")) spec.setPalletType(PaletteType.DISPOSABLE_EXPORT);
                        else if (reqPalette.contains("목재")) spec.setPalletType(PaletteType.WOODEN_FUMIGATED);
                    }
                }

                // 2. 적재 높이 검사
                if (spec.getOnePalletHeight() != null && channel.getMaxStackHeightMm() != null) {
                    if (spec.getOnePalletHeight() > channel.getMaxStackHeightMm()) {
                        spec.setOnePalletHeight(channel.getMaxStackHeightMm().doubleValue());
                    }
                }

                // 3. 물류 스티커 필수 여부 검사 및 자동 반영
                if (Boolean.TRUE.equals(channel.getChannelStickerRequired())) {
                    spec.setApplyChannelSticker(true);
                }

                // 4. 사용기한 규격 형식 검사 및 자동 반영
                if ("표기금지".equals(channel.getExpDateFormat())) {
                    spec.setLotAndExpiryFormat("표기금지");
                } else if (channel.getExpDateFormat() != null && !channel.getExpDateFormat().trim().isEmpty() && !"(미정)".equals(channel.getExpDateFormat())) {
                    String reqFormat = channel.getExpDateFormat();
                    String userFormat = spec.getLotAndExpiryFormat();
                    if (userFormat == null || !userFormat.contains(reqFormat)) {
                        spec.setLotAndExpiryFormat(reqFormat);
                    }
                }
            }
        }

        spec.setLastModifiedBy(username);
        
        // 500 에러 예방: Product 엔티티가 detached/transient 상태일 수 있으므로 DB에서 완전한 영속 객체로 조회
        if (spec.getProduct() != null && spec.getProduct().getId() != null) {
            Product managedProduct = productRepository.findById(spec.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("상품 정보를 찾을 수 없습니다. (ID: " + spec.getProduct().getId() + ")"));
            spec.setProduct(managedProduct);
        } else {
            throw new RuntimeException("사양서 저장을 위한 상품 ID가 전달되지 않았습니다.");
        }

        // 수치 및 필드 타입 안전 보정 (1 팔레트 중량 자동 산출: 아웃박스 중량 × 팔레트 적재 박스 수)
        double boxWeight = spec.getOneOutboxWeight() != null ? spec.getOneOutboxWeight() : 0.0;
        if (boxWeight == 0.0 && spec.getProduct() != null && spec.getProduct().getOutboxInfo() != null && spec.getProduct().getOutboxInfo().getOutboxWeight() != null) {
            boxWeight = spec.getProduct().getOutboxInfo().getOutboxWeight();
        }

        int totBoxes = spec.getPalletTotalOutboxQty() != null ? spec.getPalletTotalOutboxQty() : 0;
        if (totBoxes == 0 && spec.getPalletTierQty() != null && spec.getPalletTierCount() != null) {
            totBoxes = spec.getPalletTierQty() * spec.getPalletTierCount();
        }
        if (totBoxes == 0 && spec.getProduct() != null && spec.getProduct().getPalletInfo() != null && spec.getProduct().getPalletInfo().getPalletQuantity() != null) {
            totBoxes = spec.getProduct().getPalletInfo().getPalletQuantity();
        }

        if (boxWeight > 0.0 && totBoxes > 0) {
            double calcWeight = Math.round(boxWeight * totBoxes * 10.0) / 10.0;
            spec.setOnePalletWeight(calcWeight);
        }

        if (spec.getPalletHeightLimit() == null && spec.getOnePalletHeight() != null) {
            spec.setPalletHeightLimit(String.valueOf(spec.getOnePalletHeight().intValue()));
        } else if (spec.getPalletHeightLimit() != null) {
            String cleanLimit = String.valueOf(spec.getPalletHeightLimit()).replaceAll("[^0-9]", "");
            if (!cleanLimit.isEmpty()) {
                spec.setPalletHeightLimit(cleanLimit);
            }
        }

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
        
        PackagingSpecification targetSpec = spec;
        PackagingSpecification existingToUpdate = null;
        if (spec.getId() != null) {
            existingToUpdate = specRepository.findById(spec.getId()).orElse(null);
        } else if (!existingSpecs.isEmpty()) {
            existingToUpdate = existingSpecs.stream()
                    .max(Comparator.comparingInt(s -> s.getVersion() != null ? s.getVersion() : 0))
                    .orElse(existingSpecs.get(0));
        }

        if (existingToUpdate != null) {
            // Update managed entity fields
            existingToUpdate.setBarcode(spec.getBarcode());
            existingToUpdate.setLabNumber(spec.getLabNumber());
            existingToUpdate.setPlannerName(spec.getPlannerName());
            existingToUpdate.setDesignerName(spec.getDesignerName());
            existingToUpdate.setQcName(spec.getQcName());
            existingToUpdate.setManagementType(spec.getManagementType());
            existingToUpdate.setBarcodeManager(spec.getBarcodeManager());
            existingToUpdate.setApprovalChainJson(spec.getApprovalChainJson());
            
            existingToUpdate.setMarkingMethod(spec.getMarkingMethod());
            existingToUpdate.setMarkingStandard(spec.getMarkingStandard());
            existingToUpdate.setContainerMarkingType(spec.getContainerMarkingType());
            existingToUpdate.setContainerMarkingStandard(spec.getContainerMarkingStandard());
            existingToUpdate.setUnitBoxMarkingType(spec.getUnitBoxMarkingType());
            existingToUpdate.setUnitBoxMarkingStandard(spec.getUnitBoxMarkingStandard());
            existingToUpdate.setOutboxLayoutImage(spec.getOutboxLayoutImage());
            existingToUpdate.setPackagingMethodText(spec.getPackagingMethodText());
            existingToUpdate.setMarkingLocationImage(spec.getMarkingLocationImage());
            
            existingToUpdate.setInboxType(spec.getInboxType());
            existingToUpdate.setInboxQty(spec.getInboxQty());
            existingToUpdate.setInboxSize(spec.getInboxSize());
            existingToUpdate.setInboxTapeBanding(spec.getInboxTapeBanding());
            existingToUpdate.setInboxInterlayerSheet(spec.getInboxInterlayerSheet());
            existingToUpdate.setInboxMaterial(spec.getInboxMaterial());
            existingToUpdate.setInboxRemarks(spec.getInboxRemarks());
            existingToUpdate.setInboxUseYn(spec.getInboxUseYn());
            existingToUpdate.setInboxCategory(spec.getInboxCategory());
            
            existingToUpdate.setOutboxType(spec.getOutboxType());
            existingToUpdate.setOutboxQty(spec.getOutboxQty());
            existingToUpdate.setOutboxSize(spec.getOutboxSize());
            existingToUpdate.setOutboxTapeBanding(spec.getOutboxTapeBanding());
            existingToUpdate.setOutboxInterlayerSheet(spec.getOutboxInterlayerSheet());
            existingToUpdate.setOutboxMaterial(spec.getOutboxMaterial());
            existingToUpdate.setOutboxRemarks(spec.getOutboxRemarks());
            existingToUpdate.setOutboxBarcodeStickerStandard(spec.getOutboxBarcodeStickerStandard());
            existingToUpdate.setOutboxChannelStickerStandard(spec.getOutboxChannelStickerStandard());
            existingToUpdate.setOutboxCushioningStandard(spec.getOutboxCushioningStandard());
            existingToUpdate.setPopRequiredStandard(spec.getPopRequiredStandard());

            existingToUpdate.setContainerMarkingDisplay(spec.getContainerMarkingDisplay());
            existingToUpdate.setContainerMarkingLocation(spec.getContainerMarkingLocation());
            existingToUpdate.setContainerMarkingText(spec.getContainerMarkingText());
            existingToUpdate.setContainerMarkingLotFormat(spec.getContainerMarkingLotFormat());
            existingToUpdate.setContainerMarkingExpiryFormat(spec.getContainerMarkingExpiryFormat());

            existingToUpdate.setUnitBoxMarkingDisplay(spec.getUnitBoxMarkingDisplay());
            existingToUpdate.setUnitBoxMarkingLocation(spec.getUnitBoxMarkingLocation());
            existingToUpdate.setUnitBoxMarkingText(spec.getUnitBoxMarkingText());
            existingToUpdate.setUnitBoxMarkingLotFormat(spec.getUnitBoxMarkingLotFormat());
            existingToUpdate.setUnitBoxMarkingExpiryFormat(spec.getUnitBoxMarkingExpiryFormat());

            existingToUpdate.setInboxPackagingType(spec.getInboxPackagingType());
            existingToUpdate.setInboxTapeMethod(spec.getInboxTapeMethod());
            existingToUpdate.setInboxDateFormat(spec.getInboxDateFormat());
            existingToUpdate.setInboxLabelMarkingRule(spec.getInboxLabelMarkingRule());

            existingToUpdate.setOutboxTotalQty(spec.getOutboxTotalQty());
            existingToUpdate.setOutboxInboxQty(spec.getOutboxInboxQty());
            existingToUpdate.setOutboxDateFormat(spec.getOutboxDateFormat());
            existingToUpdate.setOutboxLabelMarkingRule(spec.getOutboxLabelMarkingRule());
            
            existingToUpdate.setPalletSpec(spec.getPalletSpec());
            existingToUpdate.setPalletTotalProductQty(spec.getPalletTotalProductQty());
            existingToUpdate.setPalletDateFormat(spec.getPalletDateFormat());
            existingToUpdate.setPalletLabelMarkingRule(spec.getPalletLabelMarkingRule());
            
            existingToUpdate.setPalletTypeStr(spec.getPalletTypeStr());
            existingToUpdate.setPalletStackingMethod(spec.getPalletStackingMethod());
            existingToUpdate.setPalletSize(spec.getPalletSize());
            existingToUpdate.setPalletHeightLimit(spec.getPalletHeightLimit());
            existingToUpdate.setPalletPrecautions(spec.getPalletPrecautions());
            existingToUpdate.setPalletTierQty(spec.getPalletTierQty());
            existingToUpdate.setPalletTierCount(spec.getPalletTierCount());
            existingToUpdate.setPalletTotalOutboxQty(spec.getPalletTotalOutboxQty());
            existingToUpdate.setPalletTotalQuantity(spec.getPalletTotalQuantity());
            
            existingToUpdate.setOneOutboxWeight(spec.getOneOutboxWeight());
            existingToUpdate.setOnePalletWeight(spec.getOnePalletWeight());
            existingToUpdate.setOnePalletHeight(spec.getOnePalletHeight());
            existingToUpdate.setRemarks(spec.getRemarks());
            
            existingToUpdate.setPalletType(spec.getPalletType());
            existingToUpdate.setInboxPackingPattern(spec.getInboxPackingPattern());
            existingToUpdate.setOutboxPackingPattern(spec.getOutboxPackingPattern());
            existingToUpdate.setPalletStackingPattern(spec.getPalletStackingPattern());
            existingToUpdate.setPopUseYn(spec.getPopUseYn());
            existingToUpdate.setPopHeight(spec.getPopHeight());
            existingToUpdate.setAirCapUseYn(spec.getAirCapUseYn());
            existingToUpdate.setCornerPostUseYn(spec.getCornerPostUseYn());
            existingToUpdate.setInboxPackingCols(spec.getInboxPackingCols());
            existingToUpdate.setInboxPackingRows(spec.getInboxPackingRows());
            existingToUpdate.setInboxPackingLayers(spec.getInboxPackingLayers());
            existingToUpdate.setOutboxPackingCols(spec.getOutboxPackingCols());
            existingToUpdate.setOutboxPackingRows(spec.getOutboxPackingRows());
            existingToUpdate.setOutboxPackingLayers(spec.getOutboxPackingLayers());

            existingToUpdate.setInboxViewConfig(spec.getInboxViewConfig());
            existingToUpdate.setOutboxViewConfig(spec.getOutboxViewConfig());
            existingToUpdate.setPalletViewConfig(spec.getPalletViewConfig());

            targetSpec = existingToUpdate;
        }
        
        PackagingSpecification savedSpec = specRepository.save(targetSpec);
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

        // 3. 포장 이미지/주석 정보 복원/저장 (dto.getMethodImages()가 명시적으로 전달된 경우에만 처리)
        List<com.example.ims.entity.PackagingMethodImage> methodImages = dto.getMethodImages();
        if (methodImages != null) {
            List<com.example.ims.entity.PackagingMethodImage> currentImages = methodImageRepository.findActiveBySpecId(specId);
            if (currentImages != null && !currentImages.isEmpty()) {
                currentImages.forEach(img -> {
                    img.setDeletedAt(LocalDateTime.now());
                });
                methodImageRepository.saveAll(currentImages);
            }
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
            Product prod = productRepository.findById(productId).orElse(null);
            if (prod == null) {
                return new PackagingSpecFullDto();
            }
            
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
                    applyChannelRulesToSpec(newSpec, channel);
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
        if (activeImages.isEmpty() && !specs.isEmpty()) {
            List<Long> allSpecIds = specs.stream()
                    .map(PackagingSpecification::getId)
                    .filter(java.util.Objects::nonNull)
                    .collect(java.util.stream.Collectors.toList());
            if (!allSpecIds.isEmpty()) {
                activeImages = methodImageRepository.findActiveBySpecIds(allSpecIds);
            }
        }
        
        return new PackagingSpecFullDto(latestSpec, revisions, components, activeImages);
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
                applyChannelRulesToSpec(spec, channel);
            }
        }
    }

    /**
     * 특정 품목코드(Item Code)의 최신 포장사양서로부터 포장방법 사진 복사
     */
    @Transactional
    public List<PackagingMethodImage> copyMethodImagesByItemCode(Long targetSpecId, String sourceItemCode, String username) {
        log.info(">>>> [METHOD-IMAGES] COPY-FROM-ITEM-CODE targetSpecId={}, sourceItemCode={}", targetSpecId, sourceItemCode);
        if (sourceItemCode == null || sourceItemCode.trim().isEmpty()) {
            throw new IllegalArgumentException("Source item code must not be empty");
        }

        Product sourceProduct = productRepository.findByItemCode(sourceItemCode.trim())
                .orElseThrow(() -> new RuntimeException("Source product not found: " + sourceItemCode));

        List<PackagingSpecification> sourceSpecs = specRepository.findByProductId(sourceProduct.getId());
        if (sourceSpecs.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        // 최신 버전 사양서 선택
        PackagingSpecification latestSourceSpec = sourceSpecs.stream()
                .max(Comparator.comparingInt(s -> s.getVersion() != null ? s.getVersion() : 0))
                .orElse(sourceSpecs.get(0));

        List<PackagingMethodImage> sourceImages = methodImageRepository.findActiveBySpecId(latestSourceSpec.getId());
        if (sourceImages.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        String currentUsername = username != null ? username : "admin";
        List<PackagingMethodImage> copiedList = new java.util.ArrayList<>();
        for (PackagingMethodImage src : sourceImages) {
            PackagingMethodImage copy = PackagingMethodImage.builder()
                    .packagingSpecId(targetSpecId)
                    .imageUrl(src.getImageUrl())
                    .imagePath(src.getImagePath())
                    .thumbnailUrl(src.getThumbnailUrl())
                    .displayOrder(src.getDisplayOrder())
                    .layoutWidthPx(src.getLayoutWidthPx())
                    .layoutHeightPx(src.getLayoutHeightPx())
                    .annotationsJson(src.getAnnotationsJson())
                    .captionText(src.getCaptionText())
                    .createdBy(currentUsername)
                    .build();
            copiedList.add(methodImageRepository.save(copy));
        }

        return copiedList;
    }

    /**
     * 기획세트 구성품 목록으로부터 각 구성품의 BOM 정보 취합 반환
     */
    @Transactional(readOnly = true)
    public List<java.util.Map<String, Object>> aggregateBomByComponents(List<java.util.Map<String, Object>> components) {
        if (components == null || components.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        int sortIndex = 1;

        for (java.util.Map<String, Object> comp : components) {
            String itemCode = (String) comp.get("itemCode");
            String compName = (String) comp.get("productName");
            Number qtyNum = (Number) comp.get("quantity");
            int quantity = qtyNum != null ? qtyNum.intValue() : 1;

            if (itemCode == null || itemCode.trim().isEmpty()) continue;

            Product product = productRepository.findByItemCode(itemCode.trim()).orElse(null);
            if (product == null) continue;

            List<PackagingSpecification> specs = specRepository.findByProductId(product.getId());
            PackagingSpecification latestSpec = specs.stream()
                    .max(Comparator.comparingInt(s -> s.getVersion() != null ? s.getVersion() : 0))
                    .orElse(null);

            if (latestSpec != null && latestSpec.getBomItems() != null && !latestSpec.getBomItems().isEmpty()) {
                for (PackagingSpecBomItem bomItem : latestSpec.getBomItems()) {
                    MasterPackagingMaterial mat = bomItem.getMasterMaterial();
                    double baseUsage = bomItem.getUsageCount() != null ? bomItem.getUsageCount() : 1.0;
                    double totalUsage = baseUsage * quantity;

                    java.util.Map<String, Object> itemMap = new java.util.HashMap<>();
                    itemMap.put("id", null);
                    itemMap.put("sortOrder", sortIndex++);
                    itemMap.put("usageCount", totalUsage);
                    itemMap.put("specification", bomItem.getSpecification());
                    itemMap.put("parentComponentCode", itemCode);
                    itemMap.put("parentComponentName", compName != null ? compName : product.getProductName());

                    if (mat != null) {
                        java.util.Map<String, Object> matMap = new java.util.HashMap<>();
                        matMap.put("id", mat.getId());
                        matMap.put("bomCode", mat.getBomCode());
                        matMap.put("type", mat.getType());
                        matMap.put("detailedType", mat.getDetailedType());
                        matMap.put("componentName", mat.getComponentName());
                        matMap.put("material", mat.getMaterial());
                        matMap.put("detailedMaterial", mat.getDetailedMaterial());
                        matMap.put("specification", mat.getSpecification());
                        matMap.put("weight", mat.getWeight());
                        matMap.put("manufacturer", mat.getManufacturer());
                        matMap.put("imagePath", mat.getImagePath());
                        itemMap.put("masterMaterial", matMap);
                    }
                    result.add(itemMap);
                }
            } else if (product.getPackagingMaterial() != null) {
                // 포장재 정보로부터 기본 BOM 아이템 가공
                PackagingMaterial pm = product.getPackagingMaterial();
                String[] types = {"용기(본체)", "캡(뚜껑)", "단상자", "라벨", "펌프"};
                String[] materials = {pm.getMaterialBody(), pm.getMaterialCap(), pm.getMaterialOuterBox(), pm.getMaterialLabel(), pm.getMaterialPump()};
                String[] manufacturers = {pm.getManufacturerContainer(), pm.getManufacturerOuterBox(), pm.getManufacturerOuterBox(), pm.getManufacturerLabel(), pm.getManufacturerContainer()};

                for (int i = 0; i < types.length; i++) {
                    if (materials[i] != null && !materials[i].trim().isEmpty()) {
                        java.util.Map<String, Object> itemMap = new java.util.HashMap<>();
                        itemMap.put("id", null);
                        itemMap.put("sortOrder", sortIndex++);
                        itemMap.put("usageCount", (double) quantity);
                        itemMap.put("specification", materials[i]);
                        itemMap.put("parentComponentCode", itemCode);
                        itemMap.put("parentComponentName", compName != null ? compName : product.getProductName());

                        java.util.Map<String, Object> matMap = new java.util.HashMap<>();
                        matMap.put("id", null);
                        matMap.put("bomCode", itemCode + "-" + (i + 1));
                        matMap.put("type", types[i]);
                        matMap.put("componentName", (compName != null ? compName : product.getProductName()) + " " + types[i]);
                        matMap.put("material", materials[i]);
                        matMap.put("manufacturer", manufacturers[i] != null ? manufacturers[i] : "");
                        itemMap.put("masterMaterial", matMap);

                        result.add(itemMap);
                    }
                }
            }
        }

        return result;
    }
}
