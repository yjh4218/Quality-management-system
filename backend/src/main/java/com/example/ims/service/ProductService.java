package com.example.ims.service;

import com.example.ims.entity.Manufacturer;
import com.example.ims.entity.PackagingMaterial;
import com.example.ims.entity.Product;
import com.example.ims.entity.ProductHistory;
import com.example.ims.entity.ProductType;
import com.example.ims.entity.User;
import com.example.ims.repository.BrandRepository;
import com.example.ims.repository.ManufacturerRepository;
import com.example.ims.repository.ProductHistoryRepository;
import com.example.ims.repository.ProductRepository;
import com.example.ims.repository.UserRepository;
import com.example.ims.dto.ProductIngredientDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ims.entity.ProductComponent;
import com.example.ims.entity.ProductIngredient;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import org.apache.poi.ss.usermodel.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final BrandRepository brandRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final RoleService roleService;
    private final FileStorageService fileStorageService;
    private final ExcelExportService excelExportService;
    private final ExcelParsingService excelParsingService;
    private final com.example.ims.repository.ProductionAuditRepository productionAuditRepository;
    private final PackagingSpecService packagingSpecService;
    private final com.example.ims.repository.SalesChannelRepository salesChannelRepository;

    /**
     * Helper to initialize shelf life for existing products if missing.
     */
    public void seedShelfLife() {
        try {
            log.info("Starting automatic initialization of shelf life for existing products...");
            List<Product> products = productRepository.findAll();
            java.util.Random random = new java.util.Random();
            int[] options = {24, 30, 36};
            int updatedCount = 0;
            for (Product p : products) {
                boolean changed = false;
                if (p.getShelfLifeMonths() == null || p.getShelfLifeMonths() == 0) {
                    p.setShelfLifeMonths(options[random.nextInt(options.length)]);
                    changed = true;
                }
                if (p.getOpenedShelfLifeMonths() == null || p.getOpenedShelfLifeMonths() == 0) {
                    p.setOpenedShelfLifeMonths(random.nextInt(6) + 1); // 1 to 6
                    changed = true;
                }
                if (changed) {
                    productRepository.save(p);
                    updatedCount++;
                }
            }
            log.info("Initialized shelf life data for {} products.", updatedCount);
        } catch (Exception e) {
            log.error("Failed to seed shelf lives: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<com.example.ims.dto.ProductSummaryRecord> getProductsPaginated(String username, int page, int size) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        
        String companyFilter = null;
        if (user.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(user.getDepartment())) {
            companyFilter = user.getCompanyName();
        }

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("createdAt").descending());
        
        return productRepository.searchProductsSummary(companyFilter, null, null, null, null, null, null, null, pageable);
    }
    
    @Transactional(readOnly = true)
    public List<Product> getProducts(String username) {
        if (username != null && !username.trim().isEmpty()) {
            User user = userRepository.findByUsername(username).orElse(null);
            if (user != null && (user.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(user.getDepartment()))) {
                String companyName = user.getCompanyName();
                if (companyName != null && !companyName.trim().isEmpty()) {
                    return productRepository.findByActiveTrueAndManufacturer(companyName);
                }
            }
        }
        return productRepository.findByActiveTrue();
    }

    /**
     * Get a product by its ID.
     * ID를 통해 단일 제품 상세 정보를 조회합니다.
     * 
     * @param id Product ID (제품 식별자)
     * @return Optional wrapping the Product (제품 객체 또는 Empty)
     */
    @Transactional(readOnly = true)
    public java.util.Optional<Product> getProductById(Long id, String username) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) return java.util.Optional.empty();

        User user = username != null ? userRepository.findByUsername(username).orElse(null) : null;
        if (user != null) {
            String userCompany = user.getCompanyName() != null ? user.getCompanyName().trim() : "";
            String productCompany = (product.getManufacturerInfo() != null && product.getManufacturerInfo().getName() != null) 
                    ? product.getManufacturerInfo().getName().trim() : "";

            boolean isManufacturer = (user.getRole() != null && user.getRole().contains("ROLE_MANUFACTURER")) || "제조사".equalsIgnoreCase(user.getDepartment());
            if (isManufacturer && !userCompany.isEmpty() && !productCompany.isEmpty() && !userCompany.contains(productCompany) && !productCompany.contains(userCompany)) {
                log.warn(">>>> [SECURITY] Manufacturer {} attempted to access product {} owned by {}", userCompany, product.getItemCode(), productCompany);
                return java.util.Optional.empty();
            }
        }

        // [FIX] LAZY 단일 엔티티 강제 초기화
        if (product.getBrand() != null) org.hibernate.Hibernate.initialize(product.getBrand());
        if (product.getManufacturerInfo() != null) org.hibernate.Hibernate.initialize(product.getManufacturerInfo());

        // [FIX] LAZY 컬렉션 강제 초기화 - JSON 직렬화 시 세션 종료로 인한 LazyInitializationException 방지
        if (product.getImagePaths() != null) product.getImagePaths().size();
        if (product.getProductIngredients() != null) product.getProductIngredients().size();
        if (product.getChannels() != null) product.getChannels().size();
        if (product.getComponents() != null) product.getComponents().size();
        if (product.getPackagingCertificates() != null) product.getPackagingCertificates().size();

        return java.util.Optional.of(product);
    }
    
    /**
     * Check if a given item code already exists in the database.
     * 전달된 품목코드가 이미 등록되어 있는지(중복 여부) 확인합니다.
     * 
     * @param itemCode SKU to check (검사할 품목코드)
     * @return true if duplicate exists, false otherwise (중복 시 true)
     */
    public Boolean checkItemCodeDuplicate(String itemCode) {
        return productRepository.existsByItemCode(itemCode);
    }
    
    /**
     * Register a new Product in the database. Checks user authorization, validates Brand/Manufacturer,
     * checks for component SKU duplication, and logs the creation event.
     * 
     * 신규 제품을 시스템에 등록합니다. 사용자 권한(관리자, 품질팀 유무)을 검증하고, 브랜드 및 제조사 존재 여부를 확인하며,
     * 구성품(Component)의 품목코드가 기존 시스템 코드와 충돌하지 않는지 검사한 후 최종 저장 및 이력을 남깁니다.
     * 
     * @param product New product entity data (신규 등록할 제품 객체 데이터)
     * @param username The ID of the user requesting creation (요청자 아이디)
     * @return The saved Product entity (저장 완료된 제품 객체)
     */
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public Product createProduct(Product product, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        boolean isAuthorized = roleService.hasPermission(user.getRole(), "PRODUCT_MASTER_MANAGE");

        if (!isAuthorized) {
            throw new RuntimeException("등록 권한이 없습니다. (제품 마스터 관리 권한 필요)");
        }

        // 유통 채널 미선택 시 저장 차단
        if (product.getChannels() == null || product.getChannels().isEmpty()) {
            throw new RuntimeException("유통 채널 정보는 필수입니다. 최소 1개 이상의 채널을 선택해 주세요.");
        }

        // 유통 채널 영속성 엔티티 룩업 (ID 또는 이름 기반)
        java.util.List<com.example.ims.entity.SalesChannel> persistentChannels = new java.util.ArrayList<>();
        for (com.example.ims.entity.SalesChannel ch : product.getChannels()) {
            if (ch != null) {
                com.example.ims.entity.SalesChannel matchedChannel = null;
                if (ch.getId() != null) {
                    matchedChannel = salesChannelRepository.findById(ch.getId()).orElse(null);
                }
                if (matchedChannel == null && ch.getName() != null && !ch.getName().trim().isEmpty()) {
                    matchedChannel = salesChannelRepository.findByNameAndIsDeletedFalse(ch.getName().trim()).orElse(null);
                }
                if (matchedChannel != null && !persistentChannels.contains(matchedChannel)) {
                    persistentChannels.add(matchedChannel);
                }
            }
        }
        if (persistentChannels.isEmpty()) {
            throw new IllegalArgumentException("선택하신 유통 채널 정보가 유효하지 않습니다.");
        }
        product.setChannels(persistentChannels);

        // 선택된 채널 정보를 기반으로 제품명 뒤에 _채널코드 접미사 자동 반영
        formatProductNameWithChannel(product);
        
        // Handle Brand verification
        if (product.getBrand() != null && product.getBrand().getId() != null) {
            product.setBrand(brandRepository.findById(product.getBrand().getId())
                    .orElseGet(() -> brandRepository.findByName("아누아").orElse(null)));
        } else if (product.getBrand() != null && product.getBrand().getName() != null && !product.getBrand().getName().isEmpty()) {
            String brandName = product.getBrand().getName();
            product.setBrand(brandRepository.findByName(brandName)
                    .orElseGet(() -> brandRepository.findByName("아누아").orElse(null)));
        } else {
            // 기본 브랜드 지정 ('아누아')
            product.setBrand(brandRepository.findByName("아누아").orElse(null));
        }

        // Handle Manufacturer verification with graceful fallback for Sets/New products
        if (product.getManufacturerInfo() != null && product.getManufacturerInfo().getId() != null) {
            product.setManufacturerInfo(manufacturerRepository.findById(product.getManufacturerInfo().getId())
                    .orElseGet(() -> manufacturerRepository.findByName("한국콜마").orElse(null)));
        } else if (product.getManufacturerInfo() != null && product.getManufacturerInfo().getName() != null && !product.getManufacturerInfo().getName().isEmpty()) {
            String mfrName = product.getManufacturerInfo().getName();
            product.setManufacturerInfo(manufacturerRepository.findByName(mfrName)
                    .orElseGet(() -> manufacturerRepository.findByName("한국콜마").orElse(null)));
        } else {
            // 구성품이 있는 기획세트인 경우 첫 번째 구성품의 등록 제조사 룩업 시도
            Manufacturer resolvedMfr = null;
            if (product.getComponents() != null && !product.getComponents().isEmpty()) {
                for (ProductComponent pc : product.getComponents()) {
                    if (pc.getItemCode() != null) {
                        resolvedMfr = productRepository.findByItemCode(pc.getItemCode())
                                .map(Product::getManufacturerInfo)
                                .orElse(null);
                        if (resolvedMfr != null) break;
                    }
                }
            }
            if (resolvedMfr == null) {
                resolvedMfr = manufacturerRepository.findByName("한국콜마").orElse(null);
                if (resolvedMfr == null) {
                    java.util.List<Manufacturer> actives = manufacturerRepository.findByActiveTrue();
                    if (actives != null && !actives.isEmpty()) {
                        resolvedMfr = actives.get(0);
                    }
                }
            }
            product.setManufacturerInfo(resolvedMfr);
        }

        if (product.getManufacturerInfo() == null) {
            throw new RuntimeException("제조사 정보는 필수 항목입니다. 제조사를 선택해 주세요.");
        }

        // 기획세트 여부 자동 판별 (구성품이 있거나 productType이 기획세트인 경우)
        if (product.getProductType() == ProductType.SET || (product.getComponents() != null && !product.getComponents().isEmpty())) {
            product.setPlanningSet(true);
            product.setParent(true);
            if (product.getProductType() == null) {
                product.setProductType(ProductType.SET);
            }
        }
        
        if (product.getProductIngredients() != null) {
            product.getProductIngredients().forEach(ing -> ing.setProduct(product));
            // [고도화] 성분 요약 캐시 생성 (대규모 조회 성능 최적화)
            product.setIngredients(generateIngredientsSummary(product.getProductIngredients()));
        }
            
        Product saved = productRepository.save(product);

        // [고도화] 신규제품 등록 시 자동으로 신제품 생산감리(사진감리) 연계 (자동으로 DB에 생성)
        com.example.ims.entity.ProductionAudit audit = new com.example.ims.entity.ProductionAudit();
        audit.setItemCode(saved.getItemCode());
        audit.setProductName(saved.getProductName());
        audit.setManufacturerName(saved.getManufacturerInfo() != null ? saved.getManufacturerInfo().getName() : "");
        audit.setStatus("1. 감리대기");
        audit.setDisclosed(false);
        productionAuditRepository.save(audit);

        String company = user.getCompanyName() != null ? user.getCompanyName() : "시스템";
        String modifierName = user.getName() + " (" + company + ")";
        
        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("PRODUCT")
                .entityId(saved.getId())
                .action("CREATE")
                .modifier(modifierName)
                .description("\uC2E0\uCD5C \uC81C\uD488 \uB4F1\uB85D: " + saved.getProductName())
                .newEntity(saved)
                .build());
        
        return saved;
    }

    /**
     * Update an existing Product. Verifies permissions, logs all changed fields for audit purposes, 
     * and maps new values over existing record.
     * 
     * 기존 제품 정보를 수정합니다. 권한 검사를 수행하고, 어딧 로깅(Audit Log)과 상세 이력(History) 테이블에
     * 변경 전/후 데이터를 비교하여 남긴 뒤 최종적으로 필드를 업데이트합니다.
     * 
     * @param id The ID of the Product to update (수정할 제품의 데이터베이스 ID)
     * @param updatedProduct The new product data (업데이트할 새 데이터가 담긴 객체)
     * @param username The ID of the user requesting the update (요청자 아이디)
     * @return The updated Product entity (수정이 반영된 제품 객체)
     */
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public Product updateProduct(Long id, Product updatedProduct, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        boolean isAuthorized = roleService.hasPermission(user.getRole(), "PRODUCT_MASTER_MANAGE");

        if (!isAuthorized) {
            throw new RuntimeException("수정 권한이 없습니다. (제품 마스터 관리 권한 필요)");
        }

        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        
        // 1. Fetch all master data FIRST to avoid mid-transaction flushes
        com.example.ims.entity.Manufacturer manufacturerInfo = null;
        if (updatedProduct.getManufacturerInfo() != null && updatedProduct.getManufacturerInfo().getId() != null) {
            manufacturerInfo = manufacturerRepository.findById(updatedProduct.getManufacturerInfo().getId()).orElse(null);
        }
        if (manufacturerInfo == null && updatedProduct.getManufacturerInfo() != null && updatedProduct.getManufacturerInfo().getName() != null && !updatedProduct.getManufacturerInfo().getName().trim().isEmpty()) {
            String mfrName = updatedProduct.getManufacturerInfo().getName().trim();
            manufacturerInfo = manufacturerRepository.findByName(mfrName).orElse(null);
        }
        if (manufacturerInfo == null && existingProduct.getManufacturerInfo() != null) {
            manufacturerInfo = existingProduct.getManufacturerInfo();
        }
        if (manufacturerInfo == null) {
            throw new RuntimeException("제조사 정보는 필수입니다. 올바른 제조사를 선택해 주세요.");
        }

        // 2. Capture safe snapshot BEFORE modification
        String oldJson = captureJson(existingProduct);
        
        String company = user.getCompanyName() != null ? user.getCompanyName() : "시스템";
        String modifierName = user.getName() + " (" + company + ")";
        
        // 채널 정보 검증 및 _채널코드 자동 반영 (ID 룩업 실패 시 Name 룩업 Fallback 적용)
        if (updatedProduct.getChannels() != null && !updatedProduct.getChannels().isEmpty()) {
            java.util.List<com.example.ims.entity.SalesChannel> persistentChannels = new java.util.ArrayList<>();
            for (com.example.ims.entity.SalesChannel ch : updatedProduct.getChannels()) {
                if (ch != null) {
                    com.example.ims.entity.SalesChannel matchedChannel = null;
                    if (ch.getId() != null) {
                        matchedChannel = salesChannelRepository.findById(ch.getId()).orElse(null);
                    }
                    if (matchedChannel == null && ch.getName() != null && !ch.getName().trim().isEmpty()) {
                        matchedChannel = salesChannelRepository.findByNameAndIsDeletedFalse(ch.getName().trim()).orElse(null);
                    }
                    if (matchedChannel != null && !persistentChannels.contains(matchedChannel)) {
                        persistentChannels.add(matchedChannel);
                        System.out.println(">>>> [SERVICE DEBUG] Matched Channel: id=" + matchedChannel.getId() + ", name=" + matchedChannel.getName());
                    } else {
                        System.out.println(">>>> [SERVICE DEBUG] Failed to match channel input: id=" + ch.getId() + ", name=" + ch.getName());
                    }
                }
            }
            System.out.println(">>>> [SERVICE DEBUG] Total persistentChannels matched count: " + persistentChannels.size());
            if (persistentChannels.isEmpty()) {
                throw new IllegalArgumentException("선택하신 유통 채널 정보가 유효하지 않습니다.");
            }
            updatedProduct.setChannels(persistentChannels);
            if (existingProduct.getChannels() == null) {
                existingProduct.setChannels(new java.util.ArrayList<>());
            } else {
                existingProduct.getChannels().clear();
            }
            existingProduct.getChannels().addAll(persistentChannels);
            formatProductNameWithChannel(updatedProduct);
            existingProduct.setProductName(updatedProduct.getProductName());
        } else if (existingProduct.getChannels() == null || existingProduct.getChannels().isEmpty()) {
            throw new RuntimeException("유통 채널 정보는 필수입니다. 최소 1개 이상의 채널을 선택해 주세요.");
        } else {
            formatProductNameWithChannel(existingProduct);
        }

        // 3. Begin modifications
        existingProduct.setEnglishProductName(updatedProduct.getEnglishProductName());
        existingProduct.setProductType(updatedProduct.getProductType());
        existingProduct.setCapacity(updatedProduct.getCapacity());
        existingProduct.setShelfLifeMonths(updatedProduct.getShelfLifeMonths());
        existingProduct.setOpenedShelfLifeMonths(updatedProduct.getOpenedShelfLifeMonths());
        existingProduct.setCapacityFlOz(updatedProduct.getCapacityFlOz());
        existingProduct.setWeight(updatedProduct.getWeight());
        existingProduct.setWeightOz(updatedProduct.getWeightOz());
        existingProduct.setDimensions(updatedProduct.getDimensions());
        existingProduct.setPackagingRequest(updatedProduct.getPackagingRequest());
        existingProduct.setRecycleGrade(updatedProduct.getRecycleGrade());
        existingProduct.setRecycleEvalNo(updatedProduct.getRecycleEvalNo());
        existingProduct.setRecycleMaterial(updatedProduct.getRecycleMaterial());
        existingProduct.setBrand(updatedProduct.getBrand());
        existingProduct.setManufacturerInfo(manufacturerInfo); // Use the validated manufacturerInfo from step 1

        existingProduct.setProductBarcode(updatedProduct.getProductBarcode());
        existingProduct.setInboxBarcode(updatedProduct.getInboxBarcode());
        existingProduct.setOutboxBarcode(updatedProduct.getOutboxBarcode());
        existingProduct.setParentItemCode(updatedProduct.getParentItemCode());
        existingProduct.setParent(updatedProduct.isParent());
        existingProduct.setMaster(updatedProduct.isMaster());
        existingProduct.setIngredients(updatedProduct.getIngredients());
        existingProduct.setPackagingMaterial(updatedProduct.getPackagingMaterial());

        // Planning Set
        existingProduct.setPlanningSet(updatedProduct.isPlanningSet());
        if (existingProduct.getComponents() != null) {
            existingProduct.getComponents().clear();
            if (updatedProduct.getComponents() != null) {
                existingProduct.getComponents().addAll(updatedProduct.getComponents());
            }
        } else {
            existingProduct.setComponents(updatedProduct.getComponents());
        }

        // Product Ingredients Mapping
        if (updatedProduct.getProductIngredients() != null) {
            existingProduct.getProductIngredients().clear();
            updatedProduct.getProductIngredients().forEach(ing -> ing.setProduct(existingProduct));
            existingProduct.getProductIngredients().addAll(updatedProduct.getProductIngredients());
            // [고도화] 성분 요약 캐시 업데이트
            existingProduct.setIngredients(generateIngredientsSummary(updatedProduct.getProductIngredients()));
        } else {
            existingProduct.setIngredients(null);
            if (existingProduct.getProductIngredients() != null) {
                existingProduct.getProductIngredients().clear();
            }
        }

        // Files (Images handled as collection)
        if (existingProduct.getImagePaths() == null) {
            existingProduct.setImagePaths(new java.util.ArrayList<>());
        }
        
        // [수정] 이미지 리스트 변경 시 삭제된 파일 처리
        java.util.List<String> oldImages = new java.util.ArrayList<>(existingProduct.getImagePaths());
        java.util.List<String> newImages = updatedProduct.getImagePaths() != null ? updatedProduct.getImagePaths() : new java.util.ArrayList<>();
        
        for (String oldImg : oldImages) {
            if (!newImages.contains(oldImg)) {
                fileStorageService.deleteFile(oldImg);
            }
        }
        
        existingProduct.getImagePaths().clear();
        existingProduct.getImagePaths().addAll(newImages);
        
        // 대표 이미지 경로 교체 시 삭제
        if (updatedProduct.getImagePath() != null && !Objects.equals(existingProduct.getImagePath(), updatedProduct.getImagePath())) {
            if (existingProduct.getImagePath() != null) fileStorageService.deleteFile(existingProduct.getImagePath());
            existingProduct.setImagePath(updatedProduct.getImagePath());
        }
        else if (existingProduct.getImagePaths() != null && !existingProduct.getImagePaths().isEmpty())
            existingProduct.setImagePath(existingProduct.getImagePaths().get(0));
        else
            existingProduct.setImagePath(null);

        // 인증서 파일 교체 시 삭제
        if (updatedProduct.getCertStandard() != null && !Objects.equals(existingProduct.getCertStandard(), updatedProduct.getCertStandard())) {
            if (existingProduct.getCertStandard() != null) fileStorageService.deleteFile(existingProduct.getCertStandard());
            existingProduct.setCertStandard(updatedProduct.getCertStandard());
        }
        if (updatedProduct.getCertMsds() != null && !Objects.equals(existingProduct.getCertMsds(), updatedProduct.getCertMsds())) {
            if (existingProduct.getCertMsds() != null) fileStorageService.deleteFile(existingProduct.getCertMsds());
            existingProduct.setCertMsds(updatedProduct.getCertMsds());
        }
        if (updatedProduct.getCertFunction() != null && !Objects.equals(existingProduct.getCertFunction(), updatedProduct.getCertFunction())) {
            if (existingProduct.getCertFunction() != null) fileStorageService.deleteFile(existingProduct.getCertFunction());
            existingProduct.setCertFunction(updatedProduct.getCertFunction());
        }
        if (updatedProduct.getCertExpiry() != null)
            existingProduct.setCertExpiry(updatedProduct.getCertExpiry());

        // Box & Pallet Info
        existingProduct.setInboxInfo(updatedProduct.getInboxInfo());
        existingProduct.setOutboxInfo(updatedProduct.getOutboxInfo());
        existingProduct.setPalletInfo(updatedProduct.getPalletInfo());

        // Channels
        if (updatedProduct.getChannels() != null) {
            if (existingProduct.getChannels() == null) {
                existingProduct.setChannels(new java.util.ArrayList<>());
            }
            existingProduct.getChannels().clear();
            existingProduct.getChannels().addAll(updatedProduct.getChannels());
        }

        // Packaging Certificates
        if (existingProduct.getPackagingCertificates() != null) {
            // [수정] 포장재 인증서 교체 시 삭제
            java.util.List<String> oldCerts = new java.util.ArrayList<>(existingProduct.getPackagingCertificates());
            java.util.List<String> newCerts = updatedProduct.getPackagingCertificates() != null ? updatedProduct.getPackagingCertificates() : new java.util.ArrayList<>();
            for (String oldCert : oldCerts) {
                if (!newCerts.contains(oldCert)) {
                    fileStorageService.deleteFile(oldCert);
                }
            }
            existingProduct.getPackagingCertificates().clear();
            if (updatedProduct.getPackagingCertificates() != null) {
                existingProduct.getPackagingCertificates().addAll(updatedProduct.getPackagingCertificates());
            }
        } else {
            existingProduct.setPackagingCertificates(updatedProduct.getPackagingCertificates());
        }

        Product saved = productRepository.saveAndFlush(existingProduct);
        
        // [FIX] LAZY 단일 엔티티 및 컬렉션 강제 초기화 - JSON 직렬화 시 세션 종료로 인한 channels/brand 증발 방지
        if (saved.getBrand() != null) org.hibernate.Hibernate.initialize(saved.getBrand());
        if (saved.getManufacturerInfo() != null) org.hibernate.Hibernate.initialize(saved.getManufacturerInfo());
        if (saved.getChannels() != null) saved.getChannels().size();
        if (saved.getImagePaths() != null) saved.getImagePaths().size();
        if (saved.getComponents() != null) saved.getComponents().size();
        if (saved.getPackagingCertificates() != null) saved.getPackagingCertificates().size();
        
        // [유통채널 및 정보 변경 시 포장사양서 자동 동기화]
        try {
            packagingSpecService.getFullSpecByProductId(saved.getId());
        } catch (Exception e) {
            log.error("Failed to auto-sync packaging spec after product update", e);
        }
        
        // Capture safe snapshot AFTER modification
        String newJson = captureJson(saved);

        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("PRODUCT")
                .entityId(saved.getId())
                .action("UPDATE")
                .modifier(modifierName)
                .description("제품 정보 수정: " + saved.getProductName())
                .oldEntity(oldJson)
                .newEntity(newJson) // Send safe snapshot string
                .build());

        // Note: Detailed field tracking (logChanges) is suppressed or needs DTO-based refactor
        // For now, we rely on the EntityChangeEvent + AuditLogService
        
        return saved;
    }

    /**
     * Soft delete a product. Instead of removing from DB, it sets active flag to false.
     * 제품을 비활성화(Soft Delete) 처리합니다. 실제 데이터는 삭제되지 않고 목록에서만 보이지 않게 됩니다.
     * 
     * @param id The ID of the Product to delete
     * @param username The user performing the action
     */
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public void deleteProduct(Long id, String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        String company = user.getCompanyName() != null ? user.getCompanyName() : "시스템";
        String modifierName = user.getName() + " (" + company + ")";
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        String oldJson = captureJson(product);
        product.setActive(false);
        product.setDeleted(true);
        product.setDeletedAt(LocalDateTime.now());
        Product saved = productRepository.save(product);
        String newJson = captureJson(saved);
        
        // Cascade soft delete to ProductionAudit
        productionAuditRepository.findByItemCode(product.getItemCode()).ifPresent(audit -> {
            audit.setIsDeleted(true);
            audit.setDeletedAt(LocalDateTime.now());
            productionAuditRepository.save(audit);
        });
        
        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("PRODUCT")
                .entityId(id)
                .action("DELETE")
                .modifier(modifierName)
                .description("제품 삭제(비활성화): " + product.getProductName())
                .oldEntity(oldJson)
                .newEntity(newJson)
                .build());
    }

    /**
     * Restore a soft-deleted product back to active status.
     * 비활성화 된 제품을 다시 활성 상태로 복구(Restore)합니다.
     * 
     * @param id The ID of the Product to restore
     * @param username The user performing the restoration
     */
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public void restoreProduct(Long id, String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        String company = user.getCompanyName() != null ? user.getCompanyName() : "시스템";
        String modifierName = user.getName() + " (" + company + ")";
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        String oldJson = captureJson(product);
        product.setActive(true);
        product.setDeleted(false);
        product.setDeletedAt(null);
        Product saved = productRepository.save(product);
        String newJson = captureJson(saved);
        
        // Cascade restore to ProductionAudit
        productionAuditRepository.findDeletedAuditsByItemCode(product.getItemCode()).forEach(audit -> {
            productionAuditRepository.restoreAudit(audit.getId());
        });
        
        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("PRODUCT")
                .entityId(id)
                .action("RESTORE")
                .modifier(modifierName)
                .description("제품 복구: " + product.getProductName())
                .oldEntity(oldJson)
                .newEntity(newJson)
                .build());
    }

    /**
     * Permanently delete a product from the database (Hard Delete).
     * ADMIN 권한 확인 후, 데이터베이스에서 제품을 영구적으로 삭제(Hard Delete)합니다.
     * 
     * @param id The ID of the Product to be completely removed
     * @param username The admin user performing the hard delete
     */
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public void hardDeleteProduct(Long id, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        if (!user.getRole().contains("ADMIN")) {
            throw new RuntimeException("완전 삭제 권한이 없습니다. (관리자 전용)");
        }
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // Cascade hard delete to ProductionAudit
        productionAuditRepository.findDeletedAuditsByItemCode(product.getItemCode()).forEach(audit -> productionAuditRepository.delete(audit));
        productionAuditRepository.findByItemCode(product.getItemCode())
                .ifPresent(audit -> productionAuditRepository.delete(audit));

        // [추가] 영구 삭제 시 연결된 모든 파일 물리적 삭제
        if (product.getImagePath() != null) fileStorageService.deleteFile(product.getImagePath());
        if (product.getImagePaths() != null) {
            for (String path : product.getImagePaths()) fileStorageService.deleteFile(path);
        }
        if (product.getCertStandard() != null) fileStorageService.deleteFile(product.getCertStandard());
        if (product.getCertMsds() != null) fileStorageService.deleteFile(product.getCertMsds());
        if (product.getCertFunction() != null) fileStorageService.deleteFile(product.getCertFunction());
        if (product.getPackagingCertificates() != null) {
            for (String path : product.getPackagingCertificates()) fileStorageService.deleteFile(path);
        }

        productRepository.delete(product);
        String modifierName = user.getName() + " (" + user.getCompanyName() + ")";
        
        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("PRODUCT")
                .entityId(id)
                .action("HARD_DELETE")
                .modifier(modifierName)
                .description("제품 완전 삭제: " + product.getProductName())
                .oldEntity(captureJson(product))
                .newEntity("-")
                .build());
    }

    /**
     * Compare old and new product objects and log only the fields that were modified.
     * 기존 객체와 신규 객체를 속성별로 비교하여, 변경사항이 있는 항목만 ProductHistory에 기록합니다.
     * 
     * @param oldP Legacy Product state (변경 전 기존 데이터)
     * @param newP Updated Product state (업데이트될 신규 데이터)
     * @param modifier Name of the modifier (수정자 실명/소속)
     */

    private String captureJson(Object obj) {
        if (obj == null) return "-";
        try {
            // Check if obj is already a String (likely pre-serialized)
            if (obj instanceof String) return (String) obj;
            
            // Use ObjectMapper safely
            java.util.Map<String, Object> map;
            if (obj instanceof java.util.Collection) {
                // If it's a collection, serialize as list then return (or just return string)
                return objectMapper.writeValueAsString(obj);
            } else {
                map = objectMapper.convertValue(obj, new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {});
            }
            
            String[] exclude = {"imagePaths", "productIngredients", "channels", "components", "packagingCertificates", "packagingMaterial", "inboxInfo", "outboxInfo", "palletInfo"};
            for (String f : exclude) if (map != null) map.remove(f);
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            log.warn("Failed to capture snapshot for audit log (Type: {}): {}", (obj != null ? obj.getClass().getSimpleName() : "NULL"), e.getMessage());
            return "SNAPSHOT_ERROR";
        }
    }


    public List<ProductHistory> getHistory(Long productId) {
        return historyRepository.findByProductIdOrderByModifiedAtDesc(productId);
    }

    @Transactional(readOnly = true)
    public Product loadMasterProduct(String itemCode) {
        Product master = productRepository.findByItemCode(itemCode)
                .orElseThrow(() -> new RuntimeException("Master product not found"));

        // Return a copy without ID to be used as template
        return Product.builder()
                .productName(master.getProductName())
                .englishProductName(master.getEnglishProductName())
                .productType(master.getProductType())
                .brand(master.getBrand())
                .manufacturerInfo(master.getManufacturerInfo())
                .shelfLifeMonths(master.getShelfLifeMonths())
                .openedShelfLifeMonths(master.getOpenedShelfLifeMonths())
                .capacity(master.getCapacity())
                .capacityFlOz(master.getCapacityFlOz())
                .weight(master.getWeight())
                .weightOz(master.getWeightOz())
                .dimensions(master.getDimensions())
                .inboxInfo(master.getInboxInfo())
                .outboxInfo(master.getOutboxInfo())
                .palletInfo(master.getPalletInfo())
                .packagingRequest(master.getPackagingRequest())
                .recycleGrade(master.getRecycleGrade())
                .recycleEvalNo(master.getRecycleEvalNo())
                .recycleMaterial(master.getRecycleMaterial())
                .packagingMaterial(master.getPackagingMaterial() != null ? PackagingMaterial.builder()
                        .manufacturerContainer(master.getPackagingMaterial().getManufacturerContainer())
                        .manufacturerLabel(master.getPackagingMaterial().getManufacturerLabel())
                        .manufacturerOuterBox(master.getPackagingMaterial().getManufacturerOuterBox())
                        .manufacturerEtc(master.getPackagingMaterial().getManufacturerEtc())
                        .materialBody(master.getPackagingMaterial().getMaterialBody())
                        .weightBody(master.getPackagingMaterial().getWeightBody())
                        .materialLabel(master.getPackagingMaterial().getMaterialLabel())
                        .weightLabel(master.getPackagingMaterial().getWeightLabel())
                        .materialCap(master.getPackagingMaterial().getMaterialCap())
                        .weightCap(master.getPackagingMaterial().getWeightCap())
                        .materialSealing(master.getPackagingMaterial().getMaterialSealing())
                        .weightSealing(master.getPackagingMaterial().getWeightSealing())
                        .materialPump(master.getPackagingMaterial().getMaterialPump())
                        .weightPump(master.getPackagingMaterial().getWeightPump())
                        .materialOuterBox(master.getPackagingMaterial().getMaterialOuterBox())
                        .weightOuterBox(master.getPackagingMaterial().getWeightOuterBox())
                        .materialTool(master.getPackagingMaterial().getMaterialTool())
                        .weightTool(master.getPackagingMaterial().getWeightTool())
                        .materialPacking(master.getPackagingMaterial().getMaterialPacking())
                        .weightPacking(master.getPackagingMaterial().getWeightPacking())
                        .materialEtc(master.getPackagingMaterial().getMaterialEtc())
                        .weightEtc(master.getPackagingMaterial().getWeightEtc())
                        .materialRemarks(master.getPackagingMaterial().getMaterialRemarks())
                        .build() : null)
                .imagePaths(master.getImagePaths() != null ? new java.util.ArrayList<>(master.getImagePaths()) : new java.util.ArrayList<>())
                .imagePath(master.getImagePath())

                .certStandard(master.getCertStandard())
                .certMsds(master.getCertMsds())
                .certFunction(master.getCertFunction())
                .certExpiry(master.getCertExpiry())
                .ingredients(master.getIngredients())
                .components(master.getComponents() != null ? master.getComponents().stream()
                        .map(c -> ProductComponent.builder()
                                .itemCode(c.getItemCode())
                                .productName(c.getProductName())
                                .quantity(c.getQuantity())
                                .capacity(c.getCapacity())
                                .weight(c.getWeight())
                                .build())
                        .toList() : null)
                .productIngredients(master.getProductIngredients() != null ? master.getProductIngredients().stream()
                        .map(i -> {
                            ProductIngredient clone = new ProductIngredient();
                            clone.setKorName(i.getKorName());
                            clone.setEngName(i.getEngName());
                            clone.setContentPercent(i.getContentPercent());
                            clone.setContentPpm(i.getContentPpm());
                            clone.setContentPpb(i.getContentPpb());
                            clone.setInciName(i.getInciName());
                            clone.setAllergenMark(i.getAllergenMark());
                            clone.setLimitClass(i.getLimitClass());
                            // Do not set product yet, wait until saved.
                            return clone;
                        })
                        .toList() : null)
                .packagingCertificates(master.getPackagingCertificates() != null ? new java.util.ArrayList<>(master.getPackagingCertificates()) : new java.util.ArrayList<>())
                .build();
    }
    
    public List<ProductIngredientDto> parseIngredientsExcel(org.springframework.web.multipart.MultipartFile file) throws Exception {
        return excelParsingService.parseIngredientExcel(file);
    }

    public byte[] generateIngredientTemplate() throws IOException {
        // [성능] 메모리 효율적인 SXSSFWorkbook 사용 (대용량 데이터 대비 최적화)
        try (org.apache.poi.xssf.streaming.SXSSFWorkbook workbook = new org.apache.poi.xssf.streaming.SXSSFWorkbook(100)) {
            Sheet sheet = workbook.createSheet("\uC804\uC131\uBD84 \uD15C\uD50C\uB9BF");

            // Instruction Row (Row 0 - Excel Row 1)
            Row noteRow = sheet.createRow(0);
            Cell noteCell = noteRow.createCell(2); // C1
            noteCell.setCellValue("* \uD568\uB2C9(%)\uB9CC \uAE30\uC7AC\uD558\uACE0 ppm, ppb\uB97C \uBE44\uC6CC\uB450\uC2DC\uBA74 \uC5C5\uB85C\uB4DC \uC2DC \uC790\uB3D9\uC73C\uB85C \uCC44\uC6CC\uC9D1\uB2C8\uB2E4.");
            
            CellStyle noteStyle = workbook.createCellStyle();
            Font noteFont = workbook.createFont();
            noteFont.setColor(IndexedColors.RED.getIndex());
            noteFont.setItalic(true);
            noteFont.setFontHeightInPoints((short) 9);
            noteStyle.setFont(noteFont);
            noteCell.setCellStyle(noteStyle);

            // Header Row (Row 1 - Excel Row 2)
            Row headerRow = sheet.createRow(1);
            String[] columns = {"국문 전성분", "영문 전성분", "함량(%)", "INCI명", "알러젠 표시", "배합 한도 성분 분류"};

            // Header Style
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
                // Note: SXSSF doesn't support auto-size well, but constant width is fine
            }

            try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                workbook.write(outputStream);
                workbook.dispose(); // Temporary files cleanup
                return outputStream.toByteArray();
            }
        }
    }

    public org.springframework.data.domain.Page<com.example.ims.dto.ProductSummaryRecord> searchProducts(String username, String itemCode, String productName, String englishProductName, String brand, String manufacturer,
            String ingredients, Boolean isMaster, java.util.List<String> channelNames, org.springframework.data.domain.Pageable pageable) {
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        
        String companyFilter = null;
        if (user.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(user.getDepartment())) {
            companyFilter = user.getCompanyName();
        }

        // [고도화] 빈 문자열은 null로 변환 + 소문자 변환 (JPQL에서 LOWER(:param) 제거 대응)
        // Hibernate 6 + PostgreSQL JDBC 드라이버가 LOWER(:param)의 파라미터를 bytea로 바인딩하는 버그 회피
        String pItemCode = (itemCode == null || itemCode.trim().isEmpty()) ? null : "%" + itemCode.trim().toLowerCase() + "%";
        String pProductName = (productName == null || productName.trim().isEmpty()) ? null : "%" + productName.trim().toLowerCase() + "%";
        String pEngName = (englishProductName == null || englishProductName.trim().isEmpty()) ? null : "%" + englishProductName.trim().toLowerCase() + "%";
        String pBrand = (brand == null || brand.trim().isEmpty()) ? null : "%" + brand.trim().toLowerCase() + "%";
        String pMfr = (manufacturer == null || manufacturer.trim().isEmpty()) ? null : "%" + manufacturer.trim().toLowerCase() + "%";
        String pIngredients = (ingredients == null || ingredients.trim().isEmpty()) ? null : "%" + ingredients.trim().toLowerCase() + "%";
        // 채널 필터: 빈 리스트이면 null로 처리하여 전체 조회
        java.util.List<String> pChannelNames = (channelNames == null || channelNames.isEmpty()) ? null : channelNames;

        log.info(">>>> [DEBUG] Searching products - user={}, role={}, companyFilter={}, itemCode={}, productName={}, brand={}, manufacturer={}, ingredients={}, isMaster={}, channels={}",
                username, user.getRole(), companyFilter, pItemCode, pProductName, pBrand, pMfr, pIngredients, isMaster, pChannelNames);
        
        try {
            var result = productRepository.searchProductsSummary(companyFilter, pItemCode, pProductName, pEngName, pBrand, pMfr, pIngredients, pChannelNames, pageable);
            if (Boolean.TRUE.equals(isMaster)) {
                java.util.List<com.example.ims.dto.ProductSummaryRecord> filtered = result.getContent().stream()
                        .filter(p -> Boolean.TRUE.equals(p.isMaster()))
                        .collect(java.util.stream.Collectors.toList());
                return new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
            }
            log.info(">>>> [DEBUG] Search result: {} items found (totalElements={})", result.getContent().size(), result.getTotalElements());
            return result;
        } catch (Exception e) {
            log.error(">>>> [ERROR] Product search failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 감사 로그나 부가 트리거 없이 제품 엔티티를 조용히 업데이트합니다.
     */
    @Transactional
    public void updateProductSilently(Product product) {
        productRepository.save(product);
    }

    /**
     * 모든 활성 제품의 전성분 요약 캐시(ingredients 필드)를 동기화합니다.
     * 기존 데이터 마이그레이션용으로 사용됩니다.
     */
    @Transactional
    public int syncAllIngredientsSummary() {
        log.info("Starting mass synchronization of ingredients summary...");
        List<Product> products = productRepository.findAll();
        int count = 0;
        for (Product p : products) {
            String summary = generateIngredientsSummary(p.getProductIngredients());
            if (!Objects.equals(p.getIngredients(), summary)) {
                p.setIngredients(summary);
                productRepository.save(p);
                count++;
            }
        }
        log.info("Finished mass synchronization. Updated {} products.", count);
        return count;
    }

    /**
     * 상세 성분 목록으로부터 콤마로 구분된 요약 문자열을 생성합니다.
     * @param ingredients 성분 리스트
     * @return 요약 문자열 (예: "정제수, 글리세린, ...")
     */
    private String generateIngredientsSummary(List<ProductIngredient> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) return null;
        return ingredients.stream()
                .map(i -> i.getKorName() != null ? i.getKorName().trim() : (i.getEngName() != null ? i.getEngName().trim() : ""))
                .filter(name -> !name.isEmpty())
                .collect(java.util.stream.Collectors.joining(", "));
    }
    
    /**
     * [고도화] 제품 목록을 엑셀 파일로 추출합니다.
     */
    public byte[] exportProducts(String username, String itemCode, String productName, String englishProductName,
            String brand, String manufacturer, String ingredients) throws java.io.IOException {
        // 검색 필터 적용 (페이지네이션 없이 전체 조회를 위해 큰 사이즈 지정)
        org.springframework.data.domain.Page<com.example.ims.dto.ProductSummaryRecord> pageResult = searchProducts(
                username, itemCode, productName, englishProductName, brand, manufacturer, ingredients,
                null, null,
                org.springframework.data.domain.PageRequest.of(0, 100000));

        java.util.List<com.example.ims.dto.ProductSummaryRecord> data = pageResult.getContent();

        // [감사 로그] 엑셀 다운로드 이력 기록
        com.example.ims.entity.User user = userRepository.findByUsername(username).orElse(null);
        String modifierName = username;
        Long modifierId = null;
        String modifierNameOnly = null;
        String modifierCompany = null;
        
        if (user != null) {
            modifierName = user.getName() + " (" + (user.getCompanyName() != null ? user.getCompanyName() : "시스템") + ")";
            modifierId = user.getId();
            modifierNameOnly = user.getName();
            modifierCompany = user.getCompanyName();
        }

        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("PRODUCT")
                .entityId(0L) // 전역 엑셀 다운로드는 ID 0
                .action("EXPORT")
                .modifier(modifierName)
                .modifierId(modifierId)
                .modifierUsername(username)
                .modifierName(modifierNameOnly)
                .modifierCompany(modifierCompany)
                .description("제품 마스터 엑셀 다운로드 수행 (내역: " + data.size() + "건)")
                .build());

        String[] headers = {
                "ID", "품목코드", "제품명", "영문제품명", "제품유형", "브랜드", "제조사",
                "유통기한(개월)", "전성분 요약", "마스터여부", "활성여부", "기획세트", "등록일",
                "가로(mm)", "세로(mm)", "높이(mm)", "중량(g)", "인박스수량", "아웃박스수량", "팔레트적재수량",
                "단상자/용기 착인기준", "인박스 현품표 착인기준", "아웃박스 현품표 착인기준", "팔레트 현품표 착인기준",
                "인박스 날짜표기양식", "아웃박스 날짜표기양식", "팔레트 날짜표기양식"
        };

        return excelExportService.exportToExcel("제품마스터", headers, data, p -> {
            List<com.example.ims.entity.PackagingSpecification> specs = packagingSpecService.getSpecsByProductId(p.id());
            com.example.ims.entity.PackagingSpecification spec = (specs != null && !specs.isEmpty()) ? specs.get(specs.size() - 1) : null;

            String unitMarking = spec != null && spec.getContainerMarkingText() != null ? spec.getContainerMarkingText() : "";
            if (unitMarking.isEmpty() && spec != null && spec.getUnitBoxMarkingText() != null) {
                unitMarking = spec.getUnitBoxMarkingText();
            }

            String inboxMarking = "";
            String outboxMarking = "";
            String palletMarking = "";
            String inboxDateFormat = spec != null && spec.getInboxDateFormat() != null ? spec.getInboxDateFormat() : "";
            String outboxDateFormat = spec != null && spec.getOutboxDateFormat() != null ? spec.getOutboxDateFormat() : "";
            String palletDateFormat = spec != null && spec.getPalletDateFormat() != null ? spec.getPalletDateFormat() : "";

            com.example.ims.entity.Product productEntity = productRepository.findById(p.id()).orElse(null);
            if (productEntity != null && productEntity.getChannels() != null && !productEntity.getChannels().isEmpty()) {
                com.example.ims.entity.SalesChannel chan = productEntity.getChannels().get(0);
                if (unitMarking.isEmpty() && chan.getUnitBoxMarkingRule() != null) unitMarking = chan.getUnitBoxMarkingRule();
                if (chan.getInboxLabelMarkingRule() != null) inboxMarking = chan.getInboxLabelMarkingRule();
                if (chan.getOutboxLabelMarkingRule() != null) outboxMarking = chan.getOutboxLabelMarkingRule();
                if (chan.getPalletLabelMarkingRule() != null) palletMarking = chan.getPalletLabelMarkingRule();
                if (inboxDateFormat.isEmpty() && chan.getInboxDateFormat() != null) inboxDateFormat = chan.getInboxDateFormat();
                if (outboxDateFormat.isEmpty() && chan.getOutboxDateFormat() != null) outboxDateFormat = chan.getOutboxDateFormat();
                if (palletDateFormat.isEmpty() && chan.getPalletDateFormat() != null) palletDateFormat = chan.getPalletDateFormat();
            }

            return new Object[] {
                    p.id(), p.itemCode(), p.productName(), p.englishProductName(), p.productType(), p.brandName(),
                    p.manufacturerName(),
                    p.shelfLifeMonths(), p.ingredients(), p.isMaster(), p.active(), p.isPlanningSet(), p.createdAt(),
                    p.width(), p.length(), p.height(), p.weight(), p.inboxQuantity(), p.outboxQuantity(), p.palletQuantity(),
                    unitMarking, inboxMarking, outboxMarking, palletMarking,
                    inboxDateFormat, outboxDateFormat, palletDateFormat
            };
        });
    }

    private void formatProductNameWithChannel(Product product) {
        if (product == null || product.getProductName() == null || product.getProductName().trim().isEmpty()) {
            return;
        }
        if (product.getChannels() != null && !product.getChannels().isEmpty()) {
            com.example.ims.entity.SalesChannel firstChannel = product.getChannels().get(0);
            String channelCode = firstChannel.getChannelCode();
            if (channelCode != null && !channelCode.trim().isEmpty()) {
                String name = product.getProductName().trim();
                // 기존에 이미 _채널코드가 안 붙어 있는 경우만 결합
                if (!name.endsWith("_" + channelCode)) {
                    // 다른 채널코드가 뒤에 붙어 있으면 교체, 아니면 결합
                    int lastUnderscore = name.lastIndexOf('_');
                    if (lastUnderscore > 0 && name.substring(lastUnderscore + 1).matches("^[A-Z0-9/_-]+$")) {
                        name = name.substring(0, lastUnderscore);
                    }
                    product.setProductName(name + "_" + channelCode);
                }
            }
        }
    }
}
