package com.example.ims.service;

import com.example.ims.entity.PackagingMaterial;
import com.example.ims.entity.Product;
import com.example.ims.entity.ProductHistory;
import com.example.ims.entity.User;
import com.example.ims.repository.BrandRepository;
import com.example.ims.repository.ManufacturerRepository;
import com.example.ims.repository.ProductHistoryRepository;
import com.example.ims.repository.ProductRepository;
import com.example.ims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ims.entity.ProductComponent;
import com.example.ims.entity.ProductIngredient;
import java.util.List;
import java.util.Objects;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
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
    private final ExcelParsingService excelParsingService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final RoleService roleService;
    private final FileStorageService fileStorageService;

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
        
        return productRepository.searchProductsSummary(companyFilter, null, null, null, null, null, null, pageable);
    }
    
    @Transactional(readOnly = true)
    public List<Product> getProducts(String username) {
        return productRepository.findByActiveTrue();
    }

    /**
     * Get a product by its ID.
     * ID를 통해 단일 제품 상세 정보를 조회합니다.
     * 
     * @param id Product ID (제품 식별자)
     * @return Optional wrapping the Product (제품 객체 또는 Empty)
     */
    public java.util.Optional<Product> getProductById(Long id, String username) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) return java.util.Optional.empty();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        boolean isManufacturer = user.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(user.getDepartment());
        if (isManufacturer && !Objects.equals(user.getCompanyName(), product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : null)) {
            throw new RuntimeException("해당 제품에 대한 접근 권한이 없습니다.");
        }

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
        
        // Handle Brand verification
        if (product.getBrand() != null && product.getBrand().getName() != null && !product.getBrand().getName().isEmpty()) {
            String brandName = product.getBrand().getName();
            product.setBrand(brandRepository.findByName(brandName)
                    .orElseThrow(() -> new RuntimeException("등록되지 않은 브랜드입니다: " + brandName + ". 먼저 브랜드를 등록해 주세요.")));
        } else {
            throw new RuntimeException("Brand information is required.");
        }

        // Handle Manufacturer verification
        if (product.getManufacturerInfo() != null && product.getManufacturerInfo().getName() != null && !product.getManufacturerInfo().getName().isEmpty()) {
            String mfrName = product.getManufacturerInfo().getName();
            product.setManufacturerInfo(manufacturerRepository.findByName(mfrName)
                    .orElseThrow(() -> new RuntimeException("등록되지 않은 제조사입니다: " + mfrName + ". 먼저 제조사를 등록해 주세요.")));
        } else {
            throw new RuntimeException("Manufacturer information is required.");
        }

        if (product.getComponents() != null) {
            for (ProductComponent pc : product.getComponents()) {
                if (pc.getItemCode() != null && productRepository.existsByItemCode(pc.getItemCode())) {
                    throw new RuntimeException("구성품의 품목코드 " + pc.getItemCode() + " 는 이미 시스템에 등록되어 재사용이 불가능합니다.");
                }
            }
        }
        
        if (product.getProductIngredients() != null) {
            product.getProductIngredients().forEach(ing -> ing.setProduct(product));
            // [고도화] 성분 요약 캐시 생성 (대규모 조회 성능 최적화)
            product.setIngredients(generateIngredientsSummary(product.getProductIngredients()));
        }
            
        Product saved = productRepository.save(product);
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
        if (updatedProduct.getManufacturerInfo() != null && updatedProduct.getManufacturerInfo().getName() != null && !updatedProduct.getManufacturerInfo().getName().isEmpty()) {
            String mfrName = updatedProduct.getManufacturerInfo().getName();
            manufacturerInfo = manufacturerRepository.findByName(mfrName)
                    .orElseThrow(() -> new RuntimeException("등록되지 않은 제조사입니다: " + mfrName + ". 먼저 제조사 정보를 등록해 주세요."));
        } else {
            throw new RuntimeException("제조사 정보는 필수입니다.");
        }

        // 2. Capture safe snapshot BEFORE modification
        String oldJson = captureJson(existingProduct);
        
        String company = user.getCompanyName() != null ? user.getCompanyName() : "시스템";
        String modifierName = user.getName() + " (" + company + ")";
        
        // 3. Begin modifications
        existingProduct.setProductName(updatedProduct.getProductName());
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

        Product saved = productRepository.save(existingProduct);
        
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
        Product saved = productRepository.save(product);
        String newJson = captureJson(saved);
        
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
        Product saved = productRepository.save(product);
        String newJson = captureJson(saved);
        
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
    private void logChanges(Product oldP, Product newP, String modifier) {
        java.util.List<ProductHistory> historyBatch = new java.util.ArrayList<>();
        compareAndAdd(historyBatch, oldP.getId(), modifier, "ProductName", oldP.getProductName(), newP.getProductName());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "EnglishProductName", oldP.getEnglishProductName(), newP.getEnglishProductName());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "ProductType", oldP.getProductType(), newP.getProductType());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Capacity", oldP.getCapacity(), newP.getCapacity());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Weight", oldP.getWeight(), newP.getWeight());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "ShelfLifeMonths", oldP.getShelfLifeMonths(), newP.getShelfLifeMonths());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "OpenedShelfLifeMonths", oldP.getOpenedShelfLifeMonths(), newP.getOpenedShelfLifeMonths());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "RecycleGrade", oldP.getRecycleGrade(), newP.getRecycleGrade());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "RecycleEvalNo", oldP.getRecycleEvalNo(), newP.getRecycleEvalNo());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "RecycleMaterial", oldP.getRecycleMaterial(), newP.getRecycleMaterial());

        // Handle Brand Name for Log
        String oldBrand = oldP.getBrand() != null ? oldP.getBrand().getName() : null;
        String newBrand = null;
        if (newP.getBrand() != null) {
            if (newP.getBrand().getName() != null) {
                newBrand = newP.getBrand().getName();
            } else if (newP.getBrand().getId() != null) {
                newBrand = brandRepository.findById(newP.getBrand().getId()).map(b -> b.getName()).orElse(null);
            }
        }
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Brand", oldBrand, newBrand);

        // Handle Manufacturer Name for Log
        String oldMfr = oldP.getManufacturerInfo() != null ? oldP.getManufacturerInfo().getName() : null;
        String newMfr = null;
        if (newP.getManufacturerInfo() != null) {
            if (newP.getManufacturerInfo().getName() != null) {
                newMfr = newP.getManufacturerInfo().getName();
            } else if (newP.getManufacturerInfo().getId() != null) {
                newMfr = manufacturerRepository.findById(newP.getManufacturerInfo().getId()).map(m -> m.getName())
                        .orElse(null);
            }
        }
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Manufacturer", oldMfr, newMfr);
        compareAndAdd(historyBatch, oldP.getId(), modifier, "ParentItemCode", oldP.getParentItemCode(), newP.getParentItemCode());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "IsParent", oldP.isParent(), newP.isParent());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "IsMaster", oldP.isMaster(), newP.isMaster());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Ingredients", oldP.getIngredients(), newP.getIngredients());
        
        // Log product ingredients detailed changes
        List<ProductIngredient> oldIngs = oldP.getProductIngredients() != null ? oldP.getProductIngredients() : java.util.Collections.emptyList();
        List<ProductIngredient> newIngs = newP.getProductIngredients() != null ? newP.getProductIngredients() : java.util.Collections.emptyList();

        java.util.Map<String, ProductIngredient> oldMap = oldIngs.stream()
                .filter(i -> i.getKorName() != null)
                .collect(java.util.stream.Collectors.toMap(ProductIngredient::getKorName, i -> i, (existing, replacement) -> existing));
        java.util.Map<String, ProductIngredient> newMap = newIngs.stream()
                .filter(i -> i.getKorName() != null)
                .collect(java.util.stream.Collectors.toMap(ProductIngredient::getKorName, i -> i, (existing, replacement) -> existing));

        java.util.List<String> details = new java.util.ArrayList<>();

        // Added or Modified
        for (String name : newMap.keySet()) {
            ProductIngredient newIng = newMap.get(name);
            if (!oldMap.containsKey(name)) {
                details.add("[추가] " + name + " (" + formatValue(newIng.getContentPercent()) + "%)");
            } else {
                ProductIngredient oldIng = oldMap.get(name);
                if (!Objects.equals(oldIng.getContentPercent(), newIng.getContentPercent()) ||
                    !Objects.equals(oldIng.getContentPpm(), newIng.getContentPpm()) ||
                    !Objects.equals(oldIng.getContentPpb(), newIng.getContentPpb())) {
                    details.add("[수정] " + name + ": " + formatValue(oldIng.getContentPercent()) + "% -> " + formatValue(newIng.getContentPercent()) + "%");
                }
            }
        }
        // Removed
        for (String name : oldMap.keySet()) {
            if (!newMap.containsKey(name)) {
                details.add("[삭제] " + name);
            }
        }

        if (!details.isEmpty()) {
            compareAndAdd(historyBatch, oldP.getId(), modifier, "전성분 변경 요약", "-", String.join(", ", details));
        }

        compareAndAdd(historyBatch, oldP.getId(), modifier, "ImagePaths", captureJson(oldP.getImagePaths()), captureJson(newP.getImagePaths()));
        compareAndAdd(historyBatch, oldP.getId(), modifier, "ImagePath", oldP.getImagePath(), newP.getImagePath());

        compareAndAdd(historyBatch, oldP.getId(), modifier, "CertStandard", oldP.getCertStandard(), newP.getCertStandard());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "CertMsds", oldP.getCertMsds(), newP.getCertMsds());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "CertFunction", oldP.getCertFunction(), newP.getCertFunction());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "CertExpiry", oldP.getCertExpiry(), newP.getCertExpiry());
        
        compareAndAdd(historyBatch, oldP.getId(), modifier, "InboxInfo", captureJson(oldP.getInboxInfo()), captureJson(newP.getInboxInfo()));
        compareAndAdd(historyBatch, oldP.getId(), modifier, "OutboxInfo", captureJson(oldP.getOutboxInfo()), captureJson(newP.getOutboxInfo()));
        compareAndAdd(historyBatch, oldP.getId(), modifier, "PalletInfo", captureJson(oldP.getPalletInfo()), captureJson(newP.getPalletInfo()));
        
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Channels", captureJson(oldP.getChannels()), captureJson(newP.getChannels()));
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Components", captureJson(oldP.getComponents()), captureJson(newP.getComponents()));
        compareAndAdd(historyBatch, oldP.getId(), modifier, "PackagingCertificates", captureJson(oldP.getPackagingCertificates()), captureJson(newP.getPackagingCertificates()));

        // Log Dimensions
        String oldLen = oldP.getDimensions() != null && oldP.getDimensions().getLength() != null ? String.valueOf(oldP.getDimensions().getLength()) : null;
        String newLen = newP.getDimensions() != null && newP.getDimensions().getLength() != null ? String.valueOf(newP.getDimensions().getLength()) : null;
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Dim.Length", oldLen, newLen);

        String oldWid = oldP.getDimensions() != null && oldP.getDimensions().getWidth() != null ? String.valueOf(oldP.getDimensions().getWidth()) : null;
        String newWid = newP.getDimensions() != null && newP.getDimensions().getWidth() != null ? String.valueOf(newP.getDimensions().getWidth()) : null;
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Dim.Width", oldWid, newWid);

        String oldHei = oldP.getDimensions() != null && oldP.getDimensions().getHeight() != null ? String.valueOf(oldP.getDimensions().getHeight()) : null;
        String newHei = newP.getDimensions() != null && newP.getDimensions().getHeight() != null ? String.valueOf(newP.getDimensions().getHeight()) : null;
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Dim.Height", oldHei, newHei);

        // Log Packaging Request
        String oldLid = oldP.getPackagingRequest() != null ? oldP.getPackagingRequest().getLidMaterial() : null;
        String newLid = newP.getPackagingRequest() != null ? newP.getPackagingRequest().getLidMaterial() : null;
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Pkg.Lid", oldLid, newLid);

        String oldBody = oldP.getPackagingRequest() != null ? oldP.getPackagingRequest().getBodyMaterial() : null;
        String newBody = newP.getPackagingRequest() != null ? newP.getPackagingRequest().getBodyMaterial() : null;
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Pkg.Body", oldBody, newBody);

        String oldLabel = oldP.getPackagingRequest() != null ? oldP.getPackagingRequest().getLabelMaterial() : null;
        String newLabel = newP.getPackagingRequest() != null ? newP.getPackagingRequest().getLabelMaterial() : null;
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Pkg.Label", oldLabel, newLabel);

        String oldOther = oldP.getPackagingRequest() != null ? oldP.getPackagingRequest().getOtherMaterial() : null;
        String newOther = newP.getPackagingRequest() != null ? newP.getPackagingRequest().getOtherMaterial() : null;
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Pkg.Other", oldOther, newOther);

        // Log Packaging Material
        PackagingMaterial oldM = oldP.getPackagingMaterial() != null ? oldP.getPackagingMaterial() : new PackagingMaterial();
        PackagingMaterial newM = newP.getPackagingMaterial() != null ? newP.getPackagingMaterial() : new PackagingMaterial();

        compareAndAdd(historyBatch, oldP.getId(), modifier, "Mat.Cap", oldM.getMaterialCap(), newM.getMaterialCap());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Weight.Cap", oldM.getWeightCap(), newM.getWeightCap());
        
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Mat.Sealing", oldM.getMaterialSealing(), newM.getMaterialSealing());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Weight.Sealing", oldM.getWeightSealing(), newM.getWeightSealing());
        
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Mat.Pump", oldM.getMaterialPump(), newM.getMaterialPump());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Weight.Pump", oldM.getWeightPump(), newM.getWeightPump());
        
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Mat.OuterBox", oldM.getMaterialOuterBox(), newM.getMaterialOuterBox());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Weight.OuterBox", oldM.getWeightOuterBox(), newM.getWeightOuterBox());
        
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Mat.Tool", oldM.getMaterialTool(), newM.getMaterialTool());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Weight.Tool", oldM.getWeightTool(), newM.getWeightTool());
        
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Mat.Packing", oldM.getMaterialPacking(), newM.getMaterialPacking());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Weight.Packing", oldM.getWeightPacking(), newM.getWeightPacking());
        
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Mat.Etc", oldM.getMaterialEtc(), newM.getMaterialEtc());
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Weight.Etc", oldM.getWeightEtc(), newM.getWeightEtc());
        
        compareAndAdd(historyBatch, oldP.getId(), modifier, "Mat.Remarks", oldM.getMaterialRemarks(), newM.getMaterialRemarks());

        if (!historyBatch.isEmpty()) {
            historyRepository.saveAll(historyBatch);
        }
    }

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

    private String formatValue(String val) {
        if (val == null || val.trim().isEmpty()) return "0";
        try {
            return new java.math.BigDecimal(val.trim())
                    .setScale(2, java.math.RoundingMode.HALF_UP)
                    .stripTrailingZeros()
                    .toPlainString();
        } catch (Exception e) {
            return val;
        }
    }

    private void compareAndAdd(java.util.List<ProductHistory> batch, Long productId, String modifier, String field, Object oldVal, Object newVal) {
        String sOld = (oldVal == null || oldVal.toString().trim().isEmpty()) ? "-" : oldVal.toString();
        String sNew = (newVal == null || newVal.toString().trim().isEmpty()) ? "-" : newVal.toString();

        if (!Objects.equals(sOld, sNew)) {
            batch.add(ProductHistory.builder()
                    .productId(productId)
                    .modifier(modifier)
                    .fieldName(field)
                    .oldValue(sOld)
                    .newValue(sNew)
                    .build());
        }
    }

    public List<ProductHistory> getHistory(Long productId) {
        return historyRepository.findByProductIdOrderByModifiedAtDesc(productId);
    }

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
    
    public List<com.example.ims.dto.ProductIngredientDto> parseIngredientsExcel(org.springframework.web.multipart.MultipartFile file) throws Exception {
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
            String ingredients, org.springframework.data.domain.Pageable pageable) {
        
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

        log.info(">>>> [DEBUG] Searching products - user={}, role={}, companyFilter={}, itemCode={}, productName={}, brand={}, manufacturer={}, ingredients={}",
                username, user.getRole(), companyFilter, pItemCode, pProductName, pBrand, pMfr, pIngredients);
        
        try {
            var result = productRepository.searchProductsSummary(companyFilter, pItemCode, pProductName, pEngName, pBrand, pMfr, pIngredients, pageable);
            log.info(">>>> [DEBUG] Search result: {} items found (totalElements={})", result.getContent().size(), result.getTotalElements());
            return result;
        } catch (Exception e) {
            log.error(">>>> [ERROR] Product search failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * [성능 최적화] 엔티티를 DTO로 안전하게 변환합니다. 
     * @deprecated 이제 Repository 레벨에서 직접 Project를 수행하므로 사용하지 않습니다.
     */
    @Deprecated
    private com.example.ims.dto.ProductSummaryRecord convertToSummaryRecord(Product p) {
        com.example.ims.entity.Dimensions dim = p.getDimensions() != null ? p.getDimensions() : new com.example.ims.entity.Dimensions();
        com.example.ims.entity.InboxInfo inbox = p.getInboxInfo() != null ? p.getInboxInfo() : new com.example.ims.entity.InboxInfo();
        com.example.ims.entity.OutboxInfo outbox = p.getOutboxInfo() != null ? p.getOutboxInfo() : new com.example.ims.entity.OutboxInfo();
        com.example.ims.entity.PalletInfo pallet = p.getPalletInfo() != null ? p.getPalletInfo() : new com.example.ims.entity.PalletInfo();
        com.example.ims.entity.PackagingMaterial mat = p.getPackagingMaterial() != null ? p.getPackagingMaterial() : new com.example.ims.entity.PackagingMaterial();

        return new com.example.ims.dto.ProductSummaryRecord(
            p.getId(),
            p.getItemCode(),
            p.getProductName(),
            p.getEnglishProductName(),
            p.getProductType(),
            p.getBrand() != null ? p.getBrand().getName() : "-",
            p.getManufacturerInfo() != null ? p.getManufacturerInfo().getName() : "-",
            p.getShelfLifeMonths(),
            p.getIngredients(),
            p.isMaster(),
            p.isActive(),
            p.isPlanningSet(),
            p.getCreatedAt(),
            
            dim.getStatus() != null ? dim.getStatus() : "\uAC00\uC548",
            dim.getWidth(),
            dim.getLength(),
            dim.getHeight(),
            p.getWeight(),
            
            inbox.getInboxQuantity(),
            inbox.getInboxWeight(),
            outbox.getOutboxQuantity(),
            outbox.getOutboxWeight(),
            pallet.getPalletQuantity(),
            
            mat.getMaterialBody(),
            mat.getWeightBody(),
            mat.getMaterialLabel(),
            mat.getWeightLabel(),
            mat.getMaterialCap(),
            mat.getWeightCap(),
            mat.getMaterialSealing(),
            mat.getWeightSealing(),
            mat.getMaterialPump(),
            mat.getWeightPump(),
            mat.getMaterialOuterBox(),
            mat.getWeightOuterBox(),
            mat.getMaterialTool(),
            mat.getWeightTool(),
            mat.getMaterialPacking(),
            mat.getWeightPacking(),
            mat.getMaterialEtc(),
            mat.getWeightEtc(),
            
            mat.getManufacturerContainer(),
            mat.getManufacturerLabel(),
            mat.getManufacturerOuterBox(),
            mat.getManufacturerEtc(),
            mat.getMaterialRemarks()
        );
    }
    

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
}
