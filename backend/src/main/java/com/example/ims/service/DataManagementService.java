package com.example.ims.service;

import com.example.ims.dto.TrashItemDto;
import com.example.ims.entity.Claim;
import com.example.ims.entity.Manufacturer;
import com.example.ims.entity.Product;
import com.example.ims.entity.ProductionAudit;
import com.example.ims.entity.WmsInbound;
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
    private final ProductService productService; // For hard delete file cleanup

    @Transactional(readOnly = true)
    public List<TrashItemDto> getTrashItems() {
        List<TrashItemDto> trash = new ArrayList<>();

        // 1. Products (active = false)
        try {
            trash.addAll(productRepository.findByActiveFalseOrderByUpdatedAtDesc().stream()
                    .map(p -> TrashItemDto.builder()
                            .id(p.getId())
                            .entityType("PRODUCT")
                            .displayTitle(p.getProductName())
                            .identifier(p.getItemCode())
                            .deletedAt(p.getUpdatedAt())
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
                            .deletedAt(c.getUpdatedAt())
                            .build())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("[TRASH] Error fetching deleted claims: {}", e.getMessage());
        }

        // 3. Audits (isDeleted = true)
        try {
            trash.addAll(auditRepository.findDeletedAudits().stream()
                    .map(a -> TrashItemDto.builder()
                            .id(a.getId())
                            .entityType("AUDIT")
                            .displayTitle(a.getProductName())
                            .identifier(a.getItemCode())
                            .deletedAt(a.getUploadDate()) 
                            .build())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("[TRASH] Error fetching deleted audits: {}", e.getMessage());
        }

        // 4. Manufacturers (active = false)
        try {
            trash.addAll(manufacturerRepository.findByActiveFalseOrderByUpdatedAtDesc().stream()
                    .map(m -> TrashItemDto.builder()
                            .id(m.getId())
                            .entityType("MANUFACTURER")
                            .displayTitle(m.getName())
                            .identifier(m.getIdentificationCode())
                            .deletedAt(m.getUpdatedAt())
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
                            .deletedAt(i.getLastModifiedAt() != null ? i.getLastModifiedAt() : i.getInboundDate())
                            .build())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("[TRASH] Error fetching deleted inbounds: {}", e.getMessage());
        }

        return trash;
    }

    @Transactional
    public void restoreItem(String type, Long id) {
        log.info("[TRASH] Restoring {} ID: {}", type, id);
        switch (type.toUpperCase()) {
            case "PRODUCT":
                Product p = productRepository.findById(id).orElseThrow();
                if (productRepository.findByItemCode(p.getItemCode()).isPresent() && productRepository.findByItemCode(p.getItemCode()).get().isActive()) {
                     throw new RuntimeException("동일한 품목코드(" + p.getItemCode() + ")를 가진 활성 제품이 이미 존재하여 복구할 수 없습니다.");
                }
                p.setActive(true);
                productRepository.save(p);
                break;
            case "CLAIM":
                Claim c = claimRepository.findById(id).orElseThrow();
                c.setDeleted(false);
                claimRepository.save(c);
                break;
            case "AUDIT":
                auditRepository.restoreAudit(id);
                break;
            case "MANUFACTURER":
                Manufacturer m = manufacturerRepository.findById(id).orElseThrow();
                m.setActive(true);
                manufacturerRepository.save(m);
                break;
            case "INBOUND":
                inboundRepository.restoreInbound(id);
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
            default:
                throw new IllegalArgumentException("Unknown entity type: " + type);
        }
    }
}
