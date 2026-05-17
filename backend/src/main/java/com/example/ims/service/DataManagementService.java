package com.example.ims.service;

import com.example.ims.dto.TrashItemDto;
import com.example.ims.repository.ClaimRepository;
import com.example.ims.repository.ManufacturerRepository;
import com.example.ims.repository.ProductRepository;
import com.example.ims.repository.ProductionAuditRepository;
import com.example.ims.repository.WmsInboundRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataManagementService {

    private final ProductRepository productRepository;
    private final ClaimRepository claimRepository;
    private final ProductionAuditRepository auditRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final WmsInboundRepository inboundRepository;
    private final com.example.ims.repository.ManufacturerAuditRepository mfrAuditRepository;
    private final ProductService productService; // For hard delete file cleanup

    @Transactional(readOnly = true)
    public List<TrashItemDto> getTrashItems() {
        List<TrashItemDto> trash = new ArrayList<>();

        // 1. Products (is_deleted = true or active = false)
        try {
            trash.addAll(productRepository.findDeletedProducts().stream()
                    .map(p -> TrashItemDto.builder()
                            .id(p.getId())
                            .entityType("PRODUCT")
                            .displayTitle(p.getProductName())
                            .identifier(p.getItemCode())
                            .deletedAt(p.getDeletedAt() != null ? p.getDeletedAt() : p.getUpdatedAt())
                            .build())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("[TRASH] Error fetching deleted products: {}", e.getMessage());
        }

        // 2. Claims (isDeleted = true)
        try {
            trash.addAll(claimRepository.findDeletedClaims().stream()
                    .map(c -> TrashItemDto.builder()
                            .id(c.getId())
                            .entityType("CLAIM")
                            .displayTitle(c.getProductName() != null ? c.getProductName() : "Unknown Product")
                            .identifier(c.getClaimNumber())
                            .deletedAt(c.getDeletedAt() != null ? c.getDeletedAt() : c.getUpdatedAt())
                            .build())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("[TRASH] Error fetching deleted claims: {}", e.getMessage());
        }

        // 3. Photo Audits (isDeleted = true)
        try {
            trash.addAll(auditRepository.findDeletedAudits().stream()
                    .map(a -> TrashItemDto.builder()
                            .id(a.getId())
                            .entityType("AUDIT")
                            .displayTitle(a.getProductName())
                            .identifier(a.getItemCode())
                            .deletedAt(a.getDeletedAt() != null ? a.getDeletedAt() : a.getUploadDate()) 
                            .build())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("[TRASH] Error fetching deleted audits: {}", e.getMessage());
        }

        // 4. Manufacturers (isDeleted = true or active = false)
        try {
            trash.addAll(manufacturerRepository.findDeletedManufacturers().stream()
                    .map(m -> TrashItemDto.builder()
                            .id(m.getId())
                            .entityType("MANUFACTURER")
                            .displayTitle(m.getName())
                            .identifier(m.getIdentificationCode())
                            .deletedAt(m.getDeletedAt() != null ? m.getDeletedAt() : m.getUpdatedAt())
                            .build())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("[TRASH] Error fetching deleted manufacturers: {}", e.getMessage());
        }

        // 5. WMS Inbounds (isDeleted = true)
        try {
            trash.addAll(inboundRepository.findDeletedInbounds().stream()
                    .map(i -> TrashItemDto.builder()
                            .id(i.getId())
                            .entityType("INBOUND")
                            .displayTitle(i.getProductName())
                            .identifier(i.getGrnNumber())
                            .deletedAt(i.getDeletedAt() != null ? i.getDeletedAt() : i.getLastModifiedAt())
                            .build())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("[TRASH] Error fetching deleted inbounds: {}", e.getMessage());
        }

        // 6. Manufacturer Audits (isDeleted = true)
        try {
            trash.addAll(mfrAuditRepository.findDeletedAudits().stream()
                    .map(a -> TrashItemDto.builder()
                            .id(a.getId())
                            .entityType("MANUFACTURER_AUDIT")
                            .displayTitle(a.getManufacturer() != null ? a.getManufacturer().getName() : "Unknown Mfr")
                            .identifier(a.getAuditDate() != null ? a.getAuditDate().toString() : "No Date")
                            .deletedAt(a.getDeletedAt() != null ? a.getDeletedAt() : java.time.LocalDateTime.now())
                            .build())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("[TRASH] Error fetching deleted mfr audits: {}", e.getMessage());
        }

        return trash;
    }

    @Transactional
    public void restoreItem(String type, Long id) {
        log.info("[TRASH] Restoring {} ID: {}", type, id);
        switch (type.toUpperCase()) {
            case "PRODUCT":
                productRepository.restoreProduct(id);
                break;
            case "CLAIM":
                claimRepository.restoreClaim(id);
                break;
            case "AUDIT":
                auditRepository.restoreAudit(id);
                break;
            case "MANUFACTURER":
                manufacturerRepository.restoreManufacturer(id);
                break;
            case "INBOUND":
                inboundRepository.restoreInbound(id);
                break;
            case "MANUFACTURER_AUDIT":
                mfrAuditRepository.restoreAudit(id);
                break;
            default:
                throw new IllegalArgumentException("Unknown entity type: " + type);
        }
    }

    @Transactional
    public void hardDelete(String type, Long id, String username) {
        log.info("[TRASH] Hard deleting {} ID: {} by {}", type, id, username);
        switch (type.toUpperCase()) {
            case "PRODUCT":
                productService.hardDeleteProduct(id, username);
                break;
            case "CLAIM":
                claimRepository.deleteById(id);
                break;
            case "AUDIT":
                auditRepository.deleteById(id);
                break;
            case "MANUFACTURER":
                manufacturerRepository.deleteById(id);
                break;
            case "INBOUND":
                inboundRepository.deleteById(id);
                break;
            case "MANUFACTURER_AUDIT":
                mfrAuditRepository.deleteById(id);
                break;
            default:
                throw new IllegalArgumentException("Unknown entity type: " + type);
        }
    }
}
