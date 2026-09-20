package com.example.ims.service;

import com.example.ims.entity.*;
import com.example.ims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

/**
 * 전역 설정 및 마스터 데이터 관리 서비스 (Feature 2, 3, 4, 8, 11)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MasterDataService {

    private final PackagingMethodTemplateRepository templateRepository;
    private final MasterPackagingMaterialRepository materialRepository;
    private final ChannelStickerImageRepository stickerRepository;
    private final com.example.ims.repository.UserRepository userRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    // --- Packaging Method Template (Feature 2) ---
    @org.springframework.cache.annotation.Cacheable(value = "packagingTemplates", key = "'all'")
    @Transactional(readOnly = true)
    public List<PackagingMethodTemplate> getAllTemplates() {
        return templateRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<PackagingMethodTemplate> getTemplateByType(ProductType type) {
        return templateRepository.findByProductType(type);
    }

    @org.springframework.cache.annotation.CacheEvict(value = "packagingTemplates", allEntries = true)
    @Transactional
    public PackagingMethodTemplate saveTemplate(PackagingMethodTemplate template, String username) {
        com.example.ims.entity.User user = userRepository.findByUsername(username).orElseThrow();
        String modifierName = user.getName() + " (" + (user.getCompanyName() != null ? user.getCompanyName() : "시스템") + ")";
        
        boolean isNew = template.getId() == null;
        Object oldState = isNew ? null : templateRepository.findById(template.getId()).orElse(null);

        template.setUpdatedBy(username);
        // [수정] 단계별(Steps) 관계 설정 보장
        if (template.getSteps() != null) {
            for (PackagingMethodTemplateStep step : template.getSteps()) {
                step.setTemplate(template);
            }
        }
        PackagingMethodTemplate saved = templateRepository.save(template);

        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("PACKAGING_TEMPLATE")
                .entityId(saved.getId())
                .action(isNew ? "CREATE" : "UPDATE")
                .modifier(modifierName)
                .description((isNew ? "포장공정 템플릿 신규 등록: " : "포장공정 템플릿 수정: ") + saved.getProductType())
                .oldEntity(oldState)
                .newEntity(saved)
                .build());

        return saved;
    }

    // --- Master Packaging Material (Feature 11) ---
    @Transactional(readOnly = true)
    public List<MasterPackagingMaterial> getAllMaterials(String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        boolean isManufacturer = user.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(user.getDepartment());
        
        if (isManufacturer && user.getCompanyName() != null) {
            return materialRepository.findByManufacturer(user.getCompanyName());
        }
        return materialRepository.findAll();
    }

    public String getPrefixForType(String type) {
        if (type == null) return "MAT";
        String t = type.trim();
        if (t.contains("용기")) return "CNT";
        if (t.contains("캡") || t.contains("펌프")) return "CAP";
        if (t.contains("단상자") || t.contains("라벨")) return "BOX";
        if (t.contains("인박스") || t.contains("아웃박스") || t.contains("포장재")) return "SHP";
        if (t.contains("부속품") || t.contains("잡자재") || t.contains("기타")) return "ETC";
        return "MAT";
    }

    @Transactional(readOnly = true)
    public String generateNextBomCode(String type) {
        String subPrefix = getPrefixForType(type);
        String fullPrefix = "MAT-" + subPrefix + "-";
        
        String maxCode = materialRepository.findMaxBomCodeByPrefix(fullPrefix);
        int maxSeq = 0;
        if (maxCode != null && maxCode.startsWith(fullPrefix)) {
            String numPart = maxCode.substring(fullPrefix.length()).replaceAll("\\D.*", "");
            try {
                maxSeq = Integer.parseInt(numPart);
            } catch (NumberFormatException ignored) {}
        }
        return String.format("%s%04d", fullPrefix, maxSeq + 1);
    }

    @Transactional
    public MasterPackagingMaterial saveMaterial(MasterPackagingMaterial material, String username) {
        // [수정] BOM 코드 자동 생성 지원
        if (material.getBomCode() == null || material.getBomCode().trim().isEmpty()) {
            material.setBomCode(generateNextBomCode(material.getType()));
        }

        // [수정] BOM 코드 중복 검사 (신규 등록인 경우)
        if (material.getId() == null && materialRepository.existsByBomCode(material.getBomCode())) {
            throw new RuntimeException("이미 존재하는 BOM 코드입니다: " + material.getBomCode());
        }

        // [수정] 다층 구조(Multi-layer) 처리
        if (Boolean.TRUE.equals(material.getIsMultiLayer()) && material.getLayers() != null && !material.getLayers().isEmpty()) {
            double totalWeight = 0;
            double totalThickness = 0;
            int seq = 1;
            
            for (MasterPackagingMaterialLayer layer : material.getLayers()) {
                if (layer.getWeight() == null || layer.getWeight() <= 0) {
                    throw new RuntimeException("각 레이어의 중량 정보(g)는 필수이며 0보다 커야 합니다.");
                }
                if (layer.getThickness() == null || layer.getThickness() <= 0) {
                    throw new RuntimeException("각 레이어의 두께 정보(um)는 필수이며 0보다 커야 합니다.");
                }
                layer.setLayerSeq(seq++);
                layer.setMasterMaterial(material); // 관계 설정
                totalWeight += layer.getWeight();
                totalThickness += layer.getThickness();
            }
            // 레이어 합계로 자동 고정
            material.setWeight(totalWeight);
            material.setThickness(totalThickness);
        } else {
            // 단일 구조인 경우 기존 필수값 검증
            if (material.getWeight() == null || material.getWeight() <= 0) {
                throw new RuntimeException("중량 정보(g)를 반드시 기재해야 합니다.");
            }
            if (material.getThickness() == null || material.getThickness() <= 0) {
                throw new RuntimeException("두께 정보(um)를 반드시 기재해야 합니다.");
            }
        }

        com.example.ims.entity.User user = userRepository.findByUsername(username).orElseThrow();
        String modifierName = user.getName() + " (" + (user.getCompanyName() != null ? user.getCompanyName() : "시스템") + ")";
        
        boolean isNew = material.getId() == null;
        Object oldState = isNew ? null : materialRepository.findById(material.getId()).orElse(null);

        // updatedBy는 이벤트 로그의 modifier 필드로 기록됨
        
        // [보안] 제조사 권한은 본인 회사 정보만 저장 가능
        boolean isManufacturer = user.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(user.getDepartment());
        if (isManufacturer && !java.util.Objects.equals(user.getCompanyName(), material.getManufacturer())) {
            throw new RuntimeException("해당 제조사 정보를 등록/수정할 권한이 없습니다.");
        }

        MasterPackagingMaterial saved = materialRepository.save(material);

        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("BOM_MASTER")
                .entityId(saved.getId())
                .action(isNew ? "CREATE" : "UPDATE")
                .modifier(modifierName)
                .description((isNew ? "BOM 마스터 신규 등록: " : "BOM 마스터 정보 수정: ") + saved.getBomCode() + " (" + saved.getComponentName() + ")")
                .oldEntity(oldState)
                .newEntity(saved)
                .build());

        return saved;
    }

    @Transactional(readOnly = true)
    public List<MasterPackagingMaterial> searchMaterials(String username, String bomCode, String componentName, String type, String detailedType, String detailedMaterial, String manufacturer) {
        User user = userRepository.findByUsername(username).orElseThrow();
        boolean isManufacturer = user.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(user.getDepartment());
        String companyFilter = isManufacturer ? user.getCompanyName() : null;

        return materialRepository.searchMaterials(companyFilter, bomCode, componentName, type, detailedType, detailedMaterial, manufacturer);
    }

    @Transactional(readOnly = true)
    public boolean checkBomCodeExists(String bomCode) {
        return materialRepository.existsByBomCode(bomCode);
    }

    // --- Channel Sticker Image (Feature 8) ---
    @org.springframework.cache.annotation.Cacheable(value = "stickers", key = "'all'")
    @Transactional(readOnly = true)
    public List<ChannelStickerImage> getAllStickers() {
        return stickerRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<ChannelStickerImage> getStickerByChannel(SalesChannel channel) {
        return stickerRepository.findByChannel(channel);
    }

    @org.springframework.cache.annotation.CacheEvict(value = "stickers", allEntries = true)
    @Transactional
    public ChannelStickerImage saveSticker(ChannelStickerImage sticker, String username) {
        sticker.setUploadedBy(username);
        return stickerRepository.save(sticker);
    }
}
