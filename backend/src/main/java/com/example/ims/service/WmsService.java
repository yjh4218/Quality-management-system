package com.example.ims.service;

import com.example.ims.entity.WmsInbound;
import com.example.ims.repository.WmsInboundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.LinkedHashMap;


@Service
@RequiredArgsConstructor
public class WmsService {

    private final com.example.ims.repository.WmsInboundRepository inboundRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    /**
     * Helper to auto-fill missing LOT numbers on-demand.
     */
    public void autoFillLotNumbers() {
        List<WmsInbound> all = inboundRepository.findAll();
        boolean updated = false;
        for (WmsInbound inbound : all) {
            if (inbound.getLotNumber() == null || inbound.getLotNumber().trim().isEmpty() || inbound.getLotNumber().equals("null")) {
                String randomLot = "LOT" + (1000 + new java.util.Random().nextInt(9000));
                inbound.setLotNumber(randomLot);
                updated = true;
            }
        }
        if (updated) {
            inboundRepository.saveAll(all);
            System.out.println("Auto-filled random LOT numbers for WmsInbound records.");
        }
    }

    /**
     * Simulations fetching data from an external WMS system.
     */
    public void fetchAndSaveInboundData() {
        // [수정] Mock 데이터 생성기에도 자동 채번 및 검증 로직 적용
        // ... (이 부분은 실제 운영 데이터가 아니므로 생략 가능하나, 테스트를 위해 실제 로직 호출 방식으로 변경 권장)
        // 실제 운영 시에는 외부 WMS API를 통해 수신 시 saveWmsInbound()를 거치도록 함
    }
    
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public WmsInbound saveWmsInbound(WmsInbound inbound) {
        boolean isNew = inbound.getId() == null;
        if (inbound.getInboundDate() == null) {
            inbound.setInboundDate(LocalDateTime.now());
        }
        
        // [추가] GRN 번호 자동 채번 (GRN-YYYYMMDD-001)
        if (inbound.getGrnNumber() == null || inbound.getGrnNumber().isEmpty()) {
            LocalDateTime now = inbound.getInboundDate();
            LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
            LocalDateTime endOfDay = now.toLocalDate().atTime(23, 59, 59);
            
            long count = inboundRepository.countByInboundDateBetween(startOfDay, endOfDay);
            String dateStr = now.toLocalDate().toString().replace("-", "");
            String newNumber = String.format("GRN-%s-%03d", dateStr, count + 1);
            inbound.setGrnNumber(newNumber);
        }

        // [추가] LOT 번호 자동 보정 (필요한 경우에만)
        if (inbound.getLotNumber() == null || inbound.getLotNumber().trim().isEmpty() || "null".equals(inbound.getLotNumber())) {
            inbound.setLotNumber("LOT" + (1000 + new java.util.Random().nextInt(9000)));
        }
        
        // [방어적 코딩] 유효성 검증
        if (inbound.getItemCode() == null || inbound.getItemCode().trim().isEmpty()) {
            throw new RuntimeException("Item Code is mandatory for GRN.");
        }
        
        WmsInbound saved = inboundRepository.save(inbound);
        
        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("WMS_INBOUND")
                .entityId(saved.getId())
                .action(isNew ? "CREATE" : "UPDATE")
                .modifier("\uC2DC\uC2A4\uD15C/WMS")
                .description("\uC785\uACE0 \uC815\uBCF4 \uC810\uACAC: " + saved.getGrnNumber() + " (" + saved.getProductName() + ")")
                .newEntity(saved)
                .build());
        
        return saved;
    }

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public void deleteInbound(Long id) {
        WmsInbound inbound = inboundRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inbound record not found"));
        inbound.setDeleted(true);
        WmsInbound saved = inboundRepository.save(inbound);

        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("WMS_INBOUND")
                .entityId(id)
                .action("DELETE")
                .modifier("\uC2DC\uC2A4\uD15C")
                .description("\uC785\uACE0 \uB300\uC774\uD130 \uC0AD\uC81C: " + inbound.getGrnNumber())
                .oldEntity(inbound)
                .newEntity(saved)
                .build());
    }

    public List<WmsInbound> getInboundForManufacturer(String companyName) {
        if (companyName == null) {
            return inboundRepository.findAll();
        }
        return inboundRepository.findByManufacturer(companyName);
    }

    public List<WmsInbound> searchInbound(String companyName, LocalDateTime startDate, LocalDateTime endDate, 
                                          String itemCode, String productName, String lotNumber, String manufacturer,
                                          String excludeStatus, String grnNumber) {
        return inboundRepository.findAll((Specification<WmsInbound>) (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (companyName != null && !companyName.isEmpty()) {
                predicates.add(criteriaBuilder.equal(root.get("manufacturer"), companyName));
            }

            if (startDate != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("inboundDate"), startDate));
            }
            if (endDate != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("inboundDate"), endDate));
            }
            if (itemCode != null && !itemCode.isEmpty()) {
                predicates.add(criteriaBuilder.like(root.get("itemCode"), "%" + itemCode + "%"));
            }
            if (productName != null && !productName.isEmpty()) {
                predicates.add(criteriaBuilder.like(root.get("productName"), "%" + productName + "%"));
            }
            if (lotNumber != null && !lotNumber.isEmpty()) {
                predicates.add(criteriaBuilder.like(root.get("lotNumber"), "%" + lotNumber + "%"));
            }
            if (manufacturer != null && !manufacturer.isEmpty()) {
                predicates.add(criteriaBuilder.like(root.get("manufacturer"), "%" + manufacturer + "%"));
            }

            if (grnNumber != null && !grnNumber.isEmpty()) {
                predicates.add(criteriaBuilder.like(root.get("grnNumber"), "%" + grnNumber + "%"));
            }
            
            if (excludeStatus != null && !excludeStatus.isEmpty()) {
                try {
                    WmsInbound.OverallStatus status = WmsInbound.OverallStatus.valueOf(excludeStatus);
                    predicates.add(criteriaBuilder.notEqual(root.get("overallStatus"), status));
                } catch (IllegalArgumentException ignored) {}
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        });
    }

    public List<WmsInbound> getReleaseRecords(String qualityDecisionDate) {
        List<WmsInbound> rawRecords = inboundRepository.findByQualityDecisionDate(qualityDecisionDate);
        
        // Group by productName and lotNumber
        Map<String, WmsInbound> groupedMap = new LinkedHashMap<>();
        
        for (WmsInbound record : rawRecords) {
            String key = (record.getProductName() != null ? record.getProductName() : "") + "|" + 
                         (record.getLotNumber() != null ? record.getLotNumber() : "");
            
            if (groupedMap.containsKey(key)) {
                WmsInbound existing = groupedMap.get(key);
                // Sum quantity with null-safe check (Integrity)
                int currentQty = existing.getQuantity() != null ? existing.getQuantity() : 0;
                int addQty = record.getQuantity() != null ? record.getQuantity() : 0;
                existing.setQuantity(currentQty + addQty);
                
                // Merge TR Numbers if they exist and are different
                String existingTr = existing.getTestReportNumbers();
                String newTr = record.getTestReportNumbers();
                if (newTr != null && !newTr.isEmpty()) {
                    if (existingTr == null || existingTr.isEmpty()) {
                        existing.setTestReportNumbers(newTr);
                    } else if (!existingTr.contains(newTr)) {
                        existing.setTestReportNumbers(existingTr + ", " + newTr);
                    }
                }
            } else {
                // We need to clone it so we don't accidentally mutate JPA entities in session if it's attached.
                // Or we can just use a builder. But we can just detach or use Builder.
                WmsInbound cloned = WmsInbound.builder()
                        .id(record.getId())
                        .itemCode(record.getItemCode())
                        .productName(record.getProductName())
                        .lotNumber(record.getLotNumber())
                        .quantity(record.getQuantity())
                        .finalInspectionResult(record.getFinalInspectionResult())
                        .qualityDecisionDate(record.getQualityDecisionDate())
                        .testReportNumbers(record.getTestReportNumbers())
                        .build();
                groupedMap.put(key, cloned);
            }
        }
        
        return new ArrayList<>(groupedMap.values());
    }
}
