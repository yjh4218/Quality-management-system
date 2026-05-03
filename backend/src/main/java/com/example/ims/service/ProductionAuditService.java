package com.example.ims.service;

import com.example.ims.dto.ProductionAuditDTO;
import com.example.ims.entity.ProductionAudit;
import com.example.ims.entity.Product;
import com.example.ims.entity.User;
import com.example.ims.entity.ProductionAuditHistory;
import com.example.ims.event.EntityChangeEvent;
import com.example.ims.repository.ProductionAuditHistoryRepository;
import com.example.ims.repository.ProductionAuditRepository;
import com.example.ims.repository.ProductRepository;
import com.example.ims.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 신제품 생산감리(사진감리) 비즈니스 로직을 처리하는 서비스 클래스입니다.
 * 제조사의 사진 업로드, 품질팀의 승인/반려 프로세스 및 변경 이력 추적을 담당합니다.
 */
@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class ProductionAuditService {
    private final ProductionAuditRepository repository;
    private final ProductionAuditHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final RoleService roleService;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;
    private final FileStorageService fileStorageService;
    private final ExcelExportService excelExportService;

    @Transactional(readOnly = true)
    public List<ProductionAuditDTO> getAllAudits(String username, String manufacturerName) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        boolean isManager = roleService.hasPermission(user.getRole(), "AUDIT_DISCLOSE_MANAGE");
        List<ProductionAudit> audits;

        if (isManager) {
            // 관리 권한이 있는 사용자는 요청한 제조사명으로 조회 (필터링 없이 전체)
            if (manufacturerName != null && !manufacturerName.isEmpty() && !manufacturerName.equals("더파운더즈")) {
                audits = repository.findByManufacturerNameAndIsDeletedFalseInternal(manufacturerName);
            } else {
                audits = repository.findByIsDeletedFalse();
            }
        } else {
            // 제조사는 무조건 본인 업체 데이터 중 '공개'된 것만 조회
            audits = repository.findByManufacturerNameAndIsDisclosedTrueAndIsDeletedFalse(user.getCompanyName());
        }

        return audits.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductionAuditDTO> getPendingAudits(String username, String manufacturerName) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        boolean isManager = roleService.hasPermission(user.getRole(), "AUDIT_DISCLOSE_MANAGE");
        List<Product> products;

        if (isManager) {
            // 관리 권한이 있는 사용자는 요청한 제조사의 미진행 전체 조회
            if (manufacturerName != null && !manufacturerName.isEmpty() && !manufacturerName.equals("더파운더즈")) {
                products = repository.findPendingProductsByManufacturerInternal(manufacturerName);
            } else {
                products = repository.findPendingProducts();
            }
        } else {
            // 제조사는 본인 업체 미진행 중 '공개요청'된 것만 조회
            products = repository.findPendingProductsByManufacturerAndIsDisclosedTrue(user.getCompanyName());
        }
        
        return products.stream().map(p -> {
            ProductionAuditDTO dto = new ProductionAuditDTO();
            dto.setItemCode(p.getItemCode());
            dto.setProductName(p.getProductName());
            String mfrName = (p.getManufacturerInfo() != null) ? p.getManufacturerInfo().getName() : p.getManufacturer();
            dto.setManufacturerName(mfrName);
            dto.setDisclosed(p.isPhotoAuditDisclosed());
            dto.setStatus("PENDING");
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public ProductionAuditDTO createAudit(ProductionAuditDTO dto, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        
        ProductionAudit audit = new ProductionAudit();
        BeanUtils.copyProperties(dto, audit, "id", "uploadDate");
        ProductionAudit savedAudit = repository.save(audit);
        
        // 제품 정보와 동기화
        productRepository.findByItemCode(dto.getItemCode()).ifPresent(p -> {
            p.setPhotoAuditDisclosed(dto.isDisclosed());
            productRepository.save(p);
        });

        String modifierName = user.getName() + " (" + (user.getCompanyName() != null ? user.getCompanyName() : "시스템") + ")";
        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("PRODUCTION_AUDIT")
                .entityId(savedAudit.getId())
                .action("CREATE")
                .modifier(modifierName)
                .modifierId(user.getId())
                .modifierUsername(user.getUsername())
                .modifierName(user.getName())
                .modifierCompany(user.getCompanyName())
                .description("생산감리 신규 등록: " + savedAudit.getProductName())
                .newEntity(savedAudit)
                .build());

        return convertToDTO(savedAudit);
    }

    /**
     * 생산감리 정보를 업데이트합니다.
     * [주요 로직]
     * 1. 이전 데이터와 비교하여 변경 사항을 ProductionAuditHistory에 자동 기록합니다.
     * 2. 제품(Product) 엔티티의 '사진감리 공개여부' 필드와 동기화합니다.
     * 3. 시스템 글로벌 Audit Log 이벤트를 발생시킵니다.
     * 
     * @param id 감리 ID
     * @param dto 수정할 데이터
     * @param username 수정자 ID
     * @return 업데이트된 ProductionAuditDTO
     */
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public ProductionAuditDTO updateAudit(Long id, ProductionAuditDTO dto, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        ProductionAudit audit = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Audit not found"));
        
        String oldJson = captureJson(audit);
        ProductionAudit oldAuditClone = new ProductionAudit();
        BeanUtils.copyProperties(audit, oldAuditClone);

        // Update fields if they are not null in DTO
        if (dto.getProductionDate() != null) audit.setProductionDate(dto.getProductionDate());
        
        // [수정] 사진 리스트 변경 시 삭제된 파일 처리 루틴
        handleFileCleanup(audit.getContainerImages(), dto.getContainerImages());
        handleFileCleanup(audit.getBoxImages(), dto.getBoxImages());
        handleFileCleanup(audit.getLoadImages(), dto.getLoadImages());
        
        if (dto.getContainerImages() != null) audit.setContainerImages(dto.getContainerImages());
        if (dto.getBoxImages() != null) audit.setBoxImages(dto.getBoxImages());
        if (dto.getLoadImages() != null) audit.setLoadImages(dto.getLoadImages());
        
        if (dto.getStatus() != null) audit.setStatus(dto.getStatus());
        if (dto.getRejectionReason() != null) audit.setRejectionReason(dto.getRejectionReason());
        audit.setDisclosed(dto.isDisclosed());
        
        ProductionAudit savedAudit = repository.save(audit);

        // 제품 정보와 동기화
        productRepository.findByItemCode(audit.getItemCode()).ifPresent(p -> {
            p.setPhotoAuditDisclosed(audit.isDisclosed());
            productRepository.save(p);
        });

        String modifierName = user.getName() + " (" + (user.getCompanyName() != null ? user.getCompanyName() : "시스템") + ")";
        
        // 기록을 위해 상세 변경사항(ProductionAuditHistory) 자동 생성
        logChanges(oldAuditClone, savedAudit, user);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("PRODUCTION_AUDIT")
                .entityId(savedAudit.getId())
                .action("UPDATE")
                .modifier(modifierName)
                .modifierId(user.getId())
                .modifierUsername(user.getUsername())
                .modifierName(user.getName())
                .modifierCompany(user.getCompanyName())
                .description("생산감리 정보 수정: " + savedAudit.getProductName() + " (" + savedAudit.getStatus() + ")")
                .oldEntity(oldJson)
                .newEntity(captureJson(savedAudit))
                .build());
        
        return convertToDTO(savedAudit);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public void deleteAudit(Long id, String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        ProductionAudit audit = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Audit not found"));
        
        String oldJson = captureJson(audit);
        audit.setDeleted(true);
        repository.save(audit);

        String modifierName = user.getName() + " (" + (user.getCompanyName() != null ? user.getCompanyName() : "시스템") + ")";
        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("PRODUCTION_AUDIT")
                .entityId(id)
                .action("DELETE")
                .modifier(modifierName)
                .modifierId(user.getId())
                .modifierUsername(user.getUsername())
                .modifierName(user.getName())
                .modifierCompany(user.getCompanyName())
                .description("생산감리 삭제: " + audit.getProductName())
                .oldEntity(oldJson)
                .newEntity("-")
                .build());
    }

    /**
     * 특정 생산감리의 데이터 변경 이력을 조회합니다. (역순)
     * 
     * @param auditId 감리 ID
     * @return 변경 이력 리스트
     */
    @Transactional(readOnly = true)
    public List<ProductionAuditHistory> getHistory(Long auditId) {
        return historyRepository.findByAuditIdOrderByModifiedAtDesc(auditId);
    }

    private void logChanges(ProductionAudit oldA, ProductionAudit newA, User user) {
        List<ProductionAuditHistory> batch = new ArrayList<>();
        compareAndAdd(batch, oldA.getId(), user, "productionDate", oldA.getProductionDate(), newA.getProductionDate());
        compareAndAdd(batch, oldA.getId(), user, "status", oldA.getStatus(), newA.getStatus());
        compareAndAdd(batch, oldA.getId(), user, "isDisclosed", oldA.isDisclosed(), newA.isDisclosed());
        compareAndAdd(batch, oldA.getId(), user, "rejectionReason", oldA.getRejectionReason(), newA.getRejectionReason());
        compareAndAdd(batch, oldA.getId(), user, "containerImages", oldA.getContainerImages(), newA.getContainerImages());
        compareAndAdd(batch, oldA.getId(), user, "boxImages", oldA.getBoxImages(), newA.getBoxImages());
        compareAndAdd(batch, oldA.getId(), user, "loadImages", oldA.getLoadImages(), newA.getLoadImages());

        if (!batch.isEmpty()) {
            historyRepository.saveAll(batch);
        }
    }

    private void compareAndAdd(List<ProductionAuditHistory> batch, Long auditId, User user, String field, Object oldVal, Object newVal) {
        String sOld = (oldVal == null) ? "-" : oldVal.toString();
        String sNew = (newVal == null) ? "-" : newVal.toString();
        if ("true".equals(sOld)) sOld = "공개";
        if ("false".equals(sOld)) sOld = "비공개";
        if ("true".equals(sNew)) sNew = "공개";
        if ("false".equals(sNew)) sNew = "비공개";

        if (!Objects.equals(sOld, sNew)) {
            String company = user.getCompanyName() != null ? user.getCompanyName() : "시스템";
            String modifierName = user.getName() + " (" + company + ")";
            batch.add(ProductionAuditHistory.builder()
                    .auditId(auditId)
                    .modifier(modifierName)
                    .modifierId(user.getId())
                    .modifierUsername(user.getUsername())
                    .modifierName(user.getName())
                    .modifierCompany(user.getCompanyName())
                    .fieldName(field)
                    .oldValue(sOld)
                    .newValue(sNew)
                    .build());
        }
    }

    private String captureJson(Object obj) {
        if (obj == null) return "-";
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "SNAPSHOT_ERROR";
        }
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public void toggleProductDisclosure(String itemCode, boolean isDisclosed) {
        log.info("[SERVICE] Updating Disclosure for Item: {} to {}", itemCode, isDisclosed);
        Product product = productRepository.findByItemCode(itemCode)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        product.setPhotoAuditDisclosed(isDisclosed);
        productRepository.save(product);
        log.info("[SERVICE] Successfully saved product disclosure status.");
    }

    private ProductionAuditDTO convertToDTO(ProductionAudit entity) {
        ProductionAuditDTO dto = new ProductionAuditDTO();
        BeanUtils.copyProperties(entity, dto);
        return dto;
    }

    /**
     * 이미지 문자열 비교 후 삭제된 파일 스토리지에서 제거
     */
    private void handleFileCleanup(String oldImages, String newImages) {
        if (oldImages == null || oldImages.isBlank()) return;
        
        List<String> oldList = Arrays.asList(oldImages.split(","));
        List<String> newList = (newImages == null || newImages.isBlank()) 
                               ? Collections.emptyList() 
                               : Arrays.asList(newImages.split(","));
                               
        for (String oldPath : oldList) {
            String trimmedPath = oldPath.trim();
            if (!trimmedPath.isEmpty() && !newList.stream().anyMatch(n -> n.trim().equals(trimmedPath))) {
                fileStorageService.deleteFile(trimmedPath);
            }
        }
    }
    /**
     * [고도화] 생산감리 목록을 엑셀 파일로 추출합니다.
     */
    public byte[] exportAudits(String username, String manufacturerName, String itemCode, String productName) throws java.io.IOException {
        List<ProductionAuditDTO> audits = getAllAudits(username, manufacturerName);
        
        // 추가 필터링 (품목코드, 제품명)
        if ((itemCode != null && !itemCode.isEmpty()) || (productName != null && !productName.isEmpty())) {
            audits = audits.stream().filter(a -> {
                boolean matchesItem = (itemCode == null || itemCode.isEmpty()) || (a.getItemCode() != null && a.getItemCode().contains(itemCode));
                boolean matchesProduct = (productName == null || productName.isEmpty()) || (a.getProductName() != null && a.getProductName().contains(productName));
                return matchesItem && matchesProduct;
            }).collect(java.util.stream.Collectors.toList());
        }

        // [감사 로그] 엑셀 다운로드 이력 기록
        User userObj = userRepository.findByUsername(username).orElse(null);
        String modifierName = username;
        Long modifierId = null;
        String modifierNameOnly = null;
        String modifierCompany = null;
        
        if (userObj != null) {
            modifierName = userObj.getName() + " (" + (userObj.getCompanyName() != null ? userObj.getCompanyName() : "시스템") + ")";
            modifierId = userObj.getId();
            modifierNameOnly = userObj.getName();
            modifierCompany = userObj.getCompanyName();
        }

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("PRODUCTION_AUDIT")
                .entityId(0L)
                .action("EXPORT")
                .modifier(modifierName)
                .modifierId(modifierId)
                .modifierUsername(username)
                .modifierName(modifierNameOnly)
                .modifierCompany(modifierCompany)
                .description("신제품 생산감리(사진감리) 엑셀 다운로드 수행 (내역: " + audits.size() + "건)")
                .build());

        String[] headers = {
            "ID", "상태", "품목코드", "제품명", "제조사", "생산일자", "업로드일시", "제조사공개", "반려사유"
        };
        
        return excelExportService.exportToExcel("생산감리", headers, audits, a -> new Object[]{
            a.getId(), a.getStatus(), a.getItemCode(), a.getProductName(), a.getManufacturerName(),
            a.getProductionDate(), a.getUploadDate(), a.isDisclosed(), a.getRejectionReason()
        });
    }
}
