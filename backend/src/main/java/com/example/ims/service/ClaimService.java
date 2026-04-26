package com.example.ims.service;

import com.example.ims.dto.ClaimDashboardDto;
import org.springframework.transaction.annotation.Transactional;
import com.example.ims.entity.Claim;
import com.example.ims.entity.Product;
import com.example.ims.repository.ClaimRepository;
import com.example.ims.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.example.ims.entity.ClaimHistory;
import com.example.ims.repository.ClaimHistoryRepository;
import com.example.ims.entity.User;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final ProductRepository productRepository;
    private final ClaimHistoryRepository claimHistoryRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final AuditLogService auditLogService;
    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public List<Claim> getClaims(String role, String companyName) {
        if (role != null && role.contains("MANUFACTURER")) {
            return claimRepository.findByManufacturer(companyName).stream()
                    .filter(Claim::isSharedWithManufacturer)
                    .collect(java.util.stream.Collectors.toList());
        }
        return claimRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Claim> searchClaims(String role, String companyName, String startDate, String endDate, String itemCode,
            String productName, String lotNumber, String country, String qualityStatus, String claimNumber,
            String sharedFilterStr) {
        Boolean sharedWithManufacturer = null;
        if (sharedFilterStr != null && !sharedFilterStr.trim().isEmpty()) {
            if (sharedFilterStr.equalsIgnoreCase("true") || sharedFilterStr.equals("1")) {
                sharedWithManufacturer = true;
            } else if (sharedFilterStr.equalsIgnoreCase("false") || sharedFilterStr.equals("0")) {
                sharedWithManufacturer = false;
            }
        }

        final Boolean finalSharedValue = sharedWithManufacturer;

        Specification<Claim> spec = (root, query, cb) -> {
            try {
                List<Predicate> predicates = new ArrayList<>();

                // 1. [권한 필터] 제조사 권한은 오로지 본인 회사의 '공유된' 항목만 접근 가능
                if (role != null && (role.equals("ROLE_MANUFACTURER") || role.equals("MANUFACTURER"))) {
                    if (companyName != null) {
                        predicates.add(cb.equal(root.get("manufacturer"), companyName));
                    }
                    predicates.add(cb.isTrue(root.get("sharedWithManufacturer")));
                }

                // 2. [날짜 필터]
                if (startDate != null && !startDate.trim().isEmpty() && endDate != null && !endDate.trim().isEmpty()) {
                    try {
                        predicates.add(cb.between(root.get("receiptDate"), LocalDate.parse(startDate),
                                LocalDate.parse(endDate)));
                    } catch (Exception e) {
                        System.err.println("Date Parse Error: " + startDate + " ~ " + endDate);
                    }
                }

                // 3. [일반 검색 조건]
                if (itemCode != null && !itemCode.trim().isEmpty())
                    predicates.add(cb.like(cb.lower(root.get("itemCode")), "%" + itemCode.trim().toLowerCase() + "%"));
                if (productName != null && !productName.trim().isEmpty())
                    predicates.add(
                            cb.like(cb.lower(root.get("productName")), "%" + productName.trim().toLowerCase() + "%"));
                if (lotNumber != null && !lotNumber.trim().isEmpty())
                    predicates
                            .add(cb.like(cb.lower(root.get("lotNumber")), "%" + lotNumber.trim().toLowerCase() + "%"));
                if (country != null && !country.trim().isEmpty())
                    predicates.add(cb.like(cb.lower(root.get("country")), "%" + country.trim().toLowerCase() + "%"));

                if (qualityStatus != null && !qualityStatus.trim().isEmpty()) {
                    predicates.add(cb.equal(root.get("qualityStatus"), qualityStatus.trim()));
                }

                if (claimNumber != null && !claimNumber.trim().isEmpty()) {
                    predicates.add(cb.like(root.get("claimNumber"), "%" + claimNumber.trim() + "%"));
                }

                // 4. [제조사 공유 여부 필터]
                if (finalSharedValue != null) {
                    predicates.add(cb.equal(root.get("sharedWithManufacturer"), finalSharedValue));
                }

                query.orderBy(cb.desc(root.get("receiptDate")));
                return cb.and(predicates.toArray(new Predicate[0]));
            } catch (Exception e) {
                System.err.println("CRITICAL ERROR inside Specification lambda:");
                e.printStackTrace();
                throw e;
            }
        };

        try {
            List<Claim> results = claimRepository.findAll(spec);

            // [추가] 제조사 권한일 경우 품질팀의 분석 내역 마스킹 (Security)
            if (role != null && (role.equals("ROLE_MANUFACTURER") || role.equals("MANUFACTURER"))) {
                for (Claim c : results) {
                    c.setRootCauseAnalysis(null);
                    c.setPreventativeAction(null);
                }
            }

            log.debug("Found {} claims for search criteria", results.size());
            return results;
        } catch (Exception e) {
            log.error("CRITICAL ERROR in claimRepository.findAll(spec): {}", e.getMessage(), e);
            throw e;
        }
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public Claim saveClaim(Claim claim) {
        if (claim.getReceiptDate() == null) {
            claim.setReceiptDate(LocalDate.now());
        }

        // [Task 4] PostgreSQL 시퀀스 기반 채번 (CLM-YYYYMMDD-NNN) - 3자리 0패딩 적용
        if (claim.getClaimNumber() == null || claim.getClaimNumber().isEmpty()) {
            String dateStr = claim.getReceiptDate().toString().replace("-", "");
            Long seq = claimRepository.getNextClaimSequence();
            String newNumber = String.format("CLM-%s-%03d", dateStr, seq);
            claim.setClaimNumber(newNumber);
        }

        // [방어적 코딩] 기초 유효성 검증
        if (claim.getProductName() == null || claim.getProductName().trim().isEmpty()) {
            throw new RuntimeException("Product Name is mandatory.");
        }

        determineStatus(claim);
        boolean isNew = claim.getId() == null;
        Claim saved = claimRepository.save(claim);

        // [고도화] 직접 호출 대신 이벤트를 발행하여 AuditLogService와 결합도 해제
        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("CLAIM")
                .entityId(saved.getId())
                .action(isNew ? "CREATE" : "UPDATE")
                .modifier("\uC2DC\uC2A4\uD15C/\uD488\uC9C8\uD300")
                .description((isNew ? "\uC2E0\uCD5C \uD074\uB608\uC784 \uC811\uC218: "
                        : "\uD074\uB608\uC784 \uC815\uBCF4 \uAC31\uC2E0: ") + saved.getClaimNumber())
                .newEntity(saved)
                .build());

        return saved;
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public void deleteClaim(Long id, User user) {
        Claim claim = getClaim(id, user);
        String oldJson = captureJson(claim);
        claim.setDeleted(true); // Soft delete
        Claim saved = claimRepository.save(claim);

        String company = user.getCompanyName() != null ? user.getCompanyName() : "시스템";
        String modifierName = user.getName() + " (" + company + ")";

        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("CLAIM")
                .entityId(id)
                .action("DELETE")
                .modifier(modifierName)
                .description("클레임 삭제: " + saved.getClaimNumber())
                .oldEntity(oldJson)
                .newEntity(saved)
                .build());
    }

    /**
     * 보조 헬퍼: 현재 엔티티 상태를 감사 로그용 JSON으로 수동 변환 (이벤트 발행 전 시점 스냅샷)
     */
    private String captureJson(Claim claim) {
        // [수정] AuditLogService 직접 호출 대신 정적 변환기나 다른 방식 고려 가능하나
        // 여기서는 필드별 비교 로직이 이미 있으므로 최소한으로 유지
        return "SNAPSHOT_" + claim.getClaimNumber();
    }

    // [고도화 2] 데이터 상태에 따른 5단계 자동 상태 판정 (최고 단계 기준, 역전이 지원)
    private void determineStatus(Claim claim) {
        String status = "0. 접수";

        if (claim.getTerminationDate() != null) {
            status = "4. 클레임 종결";
        } else if (claim.getPreventativeAction() != null && !claim.getPreventativeAction().isEmpty()) {
            status = "3. 재발방지 수립/적용";
        } else if (claim.getRootCauseAnalysis() != null && !claim.getRootCauseAnalysis().isEmpty()) {
            status = "2. 원인분석/개선방안";
        } else if ("수령".equals(claim.getQualityReceivedReturnedProduct()) && claim.getQualityReceivedDate() != null) {
            status = "1. 클레임 접수";
        }

        claim.setQualityStatus(status);
    }

    // [수정] 제조사 4단계 자동 상태 판정 (1.접수, 2.원인분석, 3.대책수립, 4.종결)
    private void determineMfrStatus(Claim claim) {
        String mfrStatus = "1. 접수"; // 기본 단계

        if (claim.getMfrTerminationDate() != null) {
            mfrStatus = "4. 클레임 종결";
        } else if (claim.getMfrPreventativeAction() != null && !claim.getMfrPreventativeAction().isEmpty()) {
            mfrStatus = "3. 대책수립";
        } else if ((claim.getMfrRootCauseAnalysis() != null && !claim.getMfrRootCauseAnalysis().isEmpty())) {
            mfrStatus = "2. 원인분석";
        } else if (claim.getMfrRecallDate() != null || "회수".equals(claim.getMfrRecallStatus())) {
            mfrStatus = "1. 접수";
        }

        claim.setMfrStatus(mfrStatus);
    }

    @Transactional(readOnly = true)
    public Claim getClaim(Long id, User user) {
        Claim claim = claimRepository.findById(id).orElseThrow(() -> new RuntimeException("Claim not found"));

        boolean isManufacturer = user.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(user.getDepartment());
        if (isManufacturer) {
            if (!Objects.equals(user.getCompanyName(), claim.getManufacturer()) || !claim.isSharedWithManufacturer()) {
                throw new RuntimeException("해당 클레임에 대한 접근 권한이 없습니다.");
            }
        }

        return claim;
    }

    @Transactional(readOnly = true)
    public List<ClaimHistory> getClaimHistory(Long claimId) {
        return claimHistoryRepository.findByClaimIdOrderByModifiedAtDesc(claimId);
    }

    private void compareAndSave(Long claimId, String modifier, String field, String oldVal, String newVal) {
        // [보정] null과 ""를 동일하게 취급하여 불필요한 이력 방지 및 데이터 누락 방지 통합
        String nOld = (oldVal == null || oldVal.trim().isEmpty()) ? "" : oldVal.trim();
        String nNew = (newVal == null || newVal.trim().isEmpty()) ? "" : newVal.trim();

        if (!nOld.equals(nNew)) {
            claimHistoryRepository.save(ClaimHistory.builder()
                    .claimId(claimId)
                    .modifier(modifier)
                    .fieldName(field)
                    .oldValue(nOld)
                    .newValue(nNew)
                    .build());
        }
    }

    private String getListString(List<String> list) {
        if (list == null || list.isEmpty())
            return "[]";
        return "[" + String.join(", ", list) + "]";
    }

    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public Claim updateClaim(Long id, Claim updatedData, User user) {
        Claim existing = getClaim(id, user);
        String oldJson = auditLogService.toCompactJson(existing);

        String company = user.getCompanyName() != null ? user.getCompanyName() : "시스템";
        String modifierName = user.getName() + " (" + company + ")";

        // [고도화 3] 공유 토글 필드 업데이트
        if (updatedData.isSharedWithManufacturer() != existing.isSharedWithManufacturer()) {
            compareAndSave(id, modifierName, "SharedWithManufacturer",
                    String.valueOf(existing.isSharedWithManufacturer()),
                    String.valueOf(updatedData.isSharedWithManufacturer()));
            existing.setSharedWithManufacturer(updatedData.isSharedWithManufacturer());
        }

        // 종결일 업데이트
        if (updatedData.getTerminationDate() != null) {
            compareAndSave(id, modifierName, "TerminationDate",
                    existing.getTerminationDate() != null ? existing.getTerminationDate().toString() : null,
                    updatedData.getTerminationDate().toString());
            existing.setTerminationDate(updatedData.getTerminationDate());
        }

        // CS fields...
        if (updatedData.getReceiptDate() != null) {
            compareAndSave(id, modifierName, "ReceiptDate",
                    existing.getReceiptDate() != null ? existing.getReceiptDate().toString() : null,
                    updatedData.getReceiptDate().toString());
            existing.setReceiptDate(updatedData.getReceiptDate());
        }
        if (updatedData.getCountry() != null) {
            compareAndSave(id, modifierName, "Country", existing.getCountry(), updatedData.getCountry());
            existing.setCountry(updatedData.getCountry());
        }
        if (updatedData.getItemCode() != null) {
            compareAndSave(id, modifierName, "ItemCode", existing.getItemCode(), updatedData.getItemCode());
            existing.setItemCode(updatedData.getItemCode());
        }
        if (updatedData.getProductName() != null) {
            compareAndSave(id, modifierName, "ProductName", existing.getProductName(), updatedData.getProductName());
            existing.setProductName(updatedData.getProductName());
        }
        if (updatedData.getLotNumber() != null) {
            compareAndSave(id, modifierName, "LotNumber", existing.getLotNumber(), updatedData.getLotNumber());
            existing.setLotNumber(updatedData.getLotNumber());
        }
        if (updatedData.getManufacturer() != null) {
            compareAndSave(id, modifierName, "Manufacturer", existing.getManufacturer(), updatedData.getManufacturer());
            existing.setManufacturer(updatedData.getManufacturer());
        }
        if (updatedData.getOccurrenceQty() != null) {
            compareAndSave(id, modifierName, "OccurrenceQty",
                    existing.getOccurrenceQty() != null ? String.valueOf(existing.getOccurrenceQty()) : null,
                    String.valueOf(updatedData.getOccurrenceQty()));
            existing.setOccurrenceQty(updatedData.getOccurrenceQty());
        }
        if (updatedData.getPrimaryCategory() != null) {
            compareAndSave(id, modifierName, "PrimaryCategory", existing.getPrimaryCategory(),
                    updatedData.getPrimaryCategory());
            existing.setPrimaryCategory(updatedData.getPrimaryCategory());
        }
        if (updatedData.getSecondaryCategory() != null) {
            compareAndSave(id, modifierName, "SecondaryCategory", existing.getSecondaryCategory(),
                    updatedData.getSecondaryCategory());
            existing.setSecondaryCategory(updatedData.getSecondaryCategory());
        }
        if (updatedData.getTertiaryCategory() != null) {
            compareAndSave(id, modifierName, "TertiaryCategory", existing.getTertiaryCategory(),
                    updatedData.getTertiaryCategory());
            existing.setTertiaryCategory(updatedData.getTertiaryCategory());
        }
        if (updatedData.getClaimContent() != null) {
            compareAndSave(id, modifierName, "ClaimContent", existing.getClaimContent(), updatedData.getClaimContent());
            existing.setClaimContent(updatedData.getClaimContent());
        }
        if (updatedData.getQualityCheckNeeded() != null) {
            compareAndSave(id, modifierName, "QualityCheckNeeded", existing.getQualityCheckNeeded(),
                    updatedData.getQualityCheckNeeded());
            existing.setQualityCheckNeeded(updatedData.getQualityCheckNeeded());
        }
        if (updatedData.getConsumerReplyNeeded() != null) {
            compareAndSave(id, modifierName, "ConsumerReplyNeeded", existing.getConsumerReplyNeeded(),
                    updatedData.getConsumerReplyNeeded());
            existing.setConsumerReplyNeeded(updatedData.getConsumerReplyNeeded());
        }
        if (updatedData.getProductRetrievalNeeded() != null) {
            compareAndSave(id, modifierName, "ProductRetrievalNeeded", existing.getProductRetrievalNeeded(),
                    updatedData.getProductRetrievalNeeded());
            existing.setProductRetrievalNeeded(updatedData.getProductRetrievalNeeded());
        }
        if (updatedData.getExpectedRetrievalDate() != null) {
            compareAndSave(id, modifierName, "ExpectedRetrievalDate",
                    existing.getExpectedRetrievalDate() != null ? existing.getExpectedRetrievalDate().toString() : null,
                    updatedData.getExpectedRetrievalDate().toString());
            existing.setExpectedRetrievalDate(updatedData.getExpectedRetrievalDate());
        }
        if (updatedData.getClaimPhotos() != null) {
            // [수정] 클레임 사진 리스트 변경 시 삭제 처리
            java.util.List<String> oldPhotos = existing.getClaimPhotos() != null
                    ? new java.util.ArrayList<>(existing.getClaimPhotos())
                    : new java.util.ArrayList<>();
            java.util.List<String> newPhotos = updatedData.getClaimPhotos();
            for (String oldP : oldPhotos) {
                if (!newPhotos.contains(oldP)) {
                    fileStorageService.deleteFile(oldP);
                }
            }

            compareAndSave(id, modifierName, "ClaimPhotos", getListString(existing.getClaimPhotos()),
                    getListString(updatedData.getClaimPhotos()));
            existing.setClaimPhotos(updatedData.getClaimPhotos());
        }

        // Quality/Manufacturer fields...
        if (updatedData.getRecallDate() != null) {
            compareAndSave(id, modifierName, "RecallDate",
                    existing.getRecallDate() != null ? existing.getRecallDate().toString() : null,
                    updatedData.getRecallDate().toString());
            existing.setRecallDate(updatedData.getRecallDate());
        }
        if (updatedData.getRootCauseAnalysis() != null) {
            compareAndSave(id, modifierName, "RootCauseAnalysis", existing.getRootCauseAnalysis(),
                    updatedData.getRootCauseAnalysis());
            existing.setRootCauseAnalysis(updatedData.getRootCauseAnalysis());
        }
        if (updatedData.getPreventativeAction() != null) {
            compareAndSave(id, modifierName, "PreventativeAction", existing.getPreventativeAction(),
                    updatedData.getPreventativeAction());
            existing.setPreventativeAction(updatedData.getPreventativeAction());
        }
        if (updatedData.getManufacturerResponsePdf() != null) {
            // [수정] 제조사 답변 PDF 교체 시 삭제 처리
            if (existing.getManufacturerResponsePdf() != null
                    && !existing.getManufacturerResponsePdf().equals(updatedData.getManufacturerResponsePdf())) {
                fileStorageService.deleteFile(existing.getManufacturerResponsePdf());
            }
            compareAndSave(id, modifierName, "ManufacturerResponsePdf", existing.getManufacturerResponsePdf(),
                    updatedData.getManufacturerResponsePdf());
            existing.setManufacturerResponsePdf(updatedData.getManufacturerResponsePdf());
        }

        // [수정] 품질팀 회수 제품 수령 필드 업데이트 누락분 추가
        if (updatedData.getQualityReceivedReturnedProduct() != null) {
            compareAndSave(id, modifierName, "QualityReceivedReturnedProduct",
                    existing.getQualityReceivedReturnedProduct(), updatedData.getQualityReceivedReturnedProduct());
            existing.setQualityReceivedReturnedProduct(updatedData.getQualityReceivedReturnedProduct());
        }
        if (updatedData.getQualityReceivedDate() != null) {
            compareAndSave(id, modifierName, "QualityReceivedDate",
                    existing.getQualityReceivedDate() != null ? existing.getQualityReceivedDate().toString() : null,
                    updatedData.getQualityReceivedDate().toString());
            existing.setQualityReceivedDate(updatedData.getQualityReceivedDate());
        }

        // [추가] 제조사 전용 기입 필드 업데이트
        if (updatedData.getMfrRootCauseAnalysis() != null) {
            compareAndSave(id, modifierName, "MfrRootCauseAnalysis", existing.getMfrRootCauseAnalysis(),
                    updatedData.getMfrRootCauseAnalysis());
            existing.setMfrRootCauseAnalysis(updatedData.getMfrRootCauseAnalysis());
        }
        if (updatedData.getMfrPreventativeAction() != null) {
            compareAndSave(id, modifierName, "MfrPreventativeAction", existing.getMfrPreventativeAction(),
                    updatedData.getMfrPreventativeAction());
            existing.setMfrPreventativeAction(updatedData.getMfrPreventativeAction());
        }
        if (updatedData.getMfrRecallDate() != null) {
            compareAndSave(id, modifierName, "MfrRecallDate",
                    existing.getMfrRecallDate() != null ? existing.getMfrRecallDate().toString() : null,
                    updatedData.getMfrRecallDate().toString());
            existing.setMfrRecallDate(updatedData.getMfrRecallDate());
        }
        if (updatedData.getMfrRecallStatus() != null) {
            compareAndSave(id, modifierName, "MfrRecallStatus", existing.getMfrRecallStatus(),
                    updatedData.getMfrRecallStatus());
            existing.setMfrRecallStatus(updatedData.getMfrRecallStatus());
        }
        if (updatedData.getMfrTerminationDate() != null) {
            compareAndSave(id, modifierName, "MfrTerminationDate",
                    existing.getMfrTerminationDate() != null ? existing.getMfrTerminationDate().toString() : null,
                    updatedData.getMfrTerminationDate().toString());
            existing.setMfrTerminationDate(updatedData.getMfrTerminationDate());
        }
        // [수정] 비고 및 대책 항목들은 null이 아닌 이상(빈 문자열 포함) 저장되도록 보장
        if (updatedData.getQualityRemarks() != null) {
            compareAndSave(id, modifierName, "QualityRemarks", existing.getQualityRemarks(),
                    updatedData.getQualityRemarks());
            existing.setQualityRemarks(updatedData.getQualityRemarks());
        }
        if (updatedData.getMfrRemarks() != null) {
            compareAndSave(id, modifierName, "MfrRemarks", existing.getMfrRemarks(), updatedData.getMfrRemarks());
            existing.setMfrRemarks(updatedData.getMfrRemarks());
        }

        // [고도화 2] 상태 자동 업데이트
        determineStatus(existing);
        determineMfrStatus(existing);

        Claim saved = claimRepository.save(existing);

        // [고도화] 이벤트 발행
        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("CLAIM")
                .entityId(id)
                .action("UPDATE")
                .modifier(modifierName)
                .description("클레임 상세 정보 수정: " + existing.getClaimNumber())
                .oldEntity(oldJson)
                .newEntity(saved)
                .build());

        return saved;
    }

    @Transactional(readOnly = true)
    public ClaimDashboardDto getDashboardStats(String role, String companyName, String startDate, String endDate,
            String itemCode, String productName, String manufacturer) {
        // Calculate the maximum required period for all KPI cards (at least 1 year ago)
        LocalDate now = LocalDate.now();
        LocalDate oneYearAgo = now.minusYears(1);
        String dbStartDate = (startDate != null && !startDate.isEmpty()) ? startDate : oneYearAgo.toString();

        // Fetch all relevant claims for statistics in a single optimized DB query
        // Ensure we fetch at least from 1 year ago for the KPI cards to be accurate
        LocalDate effectiveStart = LocalDate.parse(dbStartDate);
        if (effectiveStart.isAfter(oneYearAgo)) {
            effectiveStart = oneYearAgo;
        }

        List<Claim> allFilteredClaims = searchClaims(role, companyName, effectiveStart.toString(), endDate, itemCode,
                productName, null, null, null, null, null);

        LocalDate oneMonthAgo = now.minusMonths(1);

        // Pre-filter recent claims for top lists (Last 1 Month)
        List<Claim> recentClaims = allFilteredClaims.stream()
                .filter(c -> c.getReceiptDate() != null && !c.getReceiptDate().isBefore(oneMonthAgo))
                .collect(Collectors.toList());

        // 1. Top 5 Products by Brand (Using optimized product lookup)
        Map<String, List<Claim>> byBrand = new HashMap<>();
        List<Product> allActiveProducts = productRepository.findAll();
        Map<String, Product> productMap = allActiveProducts.stream()
                .filter(p -> p.getItemCode() != null)
                .collect(Collectors.toMap(Product::getItemCode, p -> p, (p1, p2) -> p1));

        for (Claim c : recentClaims) {
            if (c.getItemCode() == null)
                continue;
            Product p = productMap.get(c.getItemCode());
            String brandName = (p != null && p.getBrand() != null) ? p.getBrand().getName() : "기타(브랜드없음)";
            byBrand.computeIfAbsent(brandName, k -> new ArrayList<>()).add(c);
        }

        Map<String, List<Map<String, Object>>> topProductsByBrand = new HashMap<>();
        for (Map.Entry<String, List<Claim>> entry : byBrand.entrySet()) {
            Map<String, Long> countMap = entry.getValue().stream()
                    .collect(Collectors.groupingBy(
                            c -> c.getItemCode() + "::" + (c.getProductName() != null ? c.getProductName() : ""),
                            Collectors.counting()));

            List<Map<String, Object>> topList = countMap.entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .limit(5)
                    .map(e -> {
                        String[] parts = e.getKey().split("::");
                        Map<String, Object> map = new HashMap<>();
                        map.put("itemCode", parts[0]);
                        map.put("productName", parts.length > 1 ? parts[1] : parts[0]);
                        map.put("count", e.getValue());
                        return map;
                    })
                    .collect(Collectors.toList());
            topProductsByBrand.put(entry.getKey(), topList);
        }

        // 2. Top 5 Categories (Last 1 Month)
        List<Map<String, Object>> topCategories = recentClaims.stream()
                .filter(c -> c.getPrimaryCategory() != null)
                .collect(Collectors.groupingBy(Claim::getPrimaryCategory, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("category", e.getKey());
                    map.put("count", e.getValue());
                    return map;
                })
                .collect(Collectors.toList());

        // 3. Repeated Claims Alert (Last 1 Month)
        Map<String, Long> repeatedCounts = recentClaims.stream()
                .filter(c -> c.getItemCode() != null)
                .collect(Collectors.groupingBy(
                        c -> c.getItemCode() + "::" + (c.getPrimaryCategory() != null ? c.getPrimaryCategory() : "미분류")
                                + "::" + (c.getProductName() != null ? c.getProductName() : ""),
                        Collectors.counting()));

        List<Map<String, Object>> alerts = new ArrayList<>();
        for (Map.Entry<String, Long> entry : repeatedCounts.entrySet()) {
            if (entry.getValue() >= 3) {
                String[] parts = entry.getKey().split("::");
                Map<String, Object> alert = new HashMap<>();
                alert.put("itemCode", parts[0]);
                alert.put("category", parts[1]);
                alert.put("productName", parts.length > 2 ? parts[2] : parts[0]);
                alert.put("count", entry.getValue());
                alerts.add(alert);
            }
        }

        // 4. Period Cumulative Stats
        LocalDate thisMonthStart = now.withDayOfMonth(1);
        LocalDate lastMonthStart = now.minusMonths(1).withDayOfMonth(1);
        LocalDate lastMonthEnd = now.withDayOfMonth(1).minusDays(1);

        int currentQ = (now.getMonthValue() - 1) / 3 + 1;
        LocalDate lastQStart;
        LocalDate lastQEnd;
        if (currentQ == 1) {
            lastQStart = LocalDate.of(now.getYear() - 1, 10, 1);
            lastQEnd = LocalDate.of(now.getYear() - 1, 12, 31);
        } else {
            lastQStart = LocalDate.of(now.getYear(), (currentQ - 2) * 3 + 1, 1);
            lastQEnd = lastQStart.plusMonths(3).minusDays(1);
        }

        long thisMonthCount = 0, lastMonthCount = 0, lastQuarterCount = 0, oneYearCount = 0;

        for (Claim c : allFilteredClaims) {
            LocalDate rd = c.getReceiptDate();
            if (rd == null)
                continue;

            if (!rd.isBefore(thisMonthStart))
                thisMonthCount++;
            if (!rd.isBefore(lastMonthStart) && !rd.isAfter(lastMonthEnd))
                lastMonthCount++;
            if (!rd.isBefore(lastQStart) && !rd.isAfter(lastQEnd))
                lastQuarterCount++;
            if (!rd.isBefore(oneYearAgo))
                oneYearCount++;
        }

        // 5. Unclosed Claims (All time, but limited by filtered base)
        List<Claim> unclosedClaims = allFilteredClaims.stream()
                .filter(c -> c.getQualityStatus() == null || !c.getQualityStatus().contains("5단계"))
                .sorted(Comparator.comparing(Claim::getReceiptDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        // 6. Chart Claims (Filter based on user's exact startDate/endDate request)
        final LocalDate reqStart = (startDate != null && !startDate.isEmpty()) ? LocalDate.parse(startDate)
                : oneYearAgo;
        final LocalDate reqEnd = (endDate != null && !endDate.isEmpty()) ? LocalDate.parse(endDate) : now;

        List<Claim> chartClaims = allFilteredClaims.stream()
                .filter(c -> c.getReceiptDate() != null && !c.getReceiptDate().isBefore(reqStart)
                        && !c.getReceiptDate().isAfter(reqEnd))
                .collect(Collectors.toList());

        return ClaimDashboardDto.builder()
                .topProductsByBrand(topProductsByBrand)
                .topCategories(topCategories)
                .repeatedClaimsAlert(alerts)
                .thisMonthCount(thisMonthCount)
                .lastMonthCount(lastMonthCount)
                .lastQuarterCount(lastQuarterCount)
                .oneYearCount(oneYearCount)
                .unclosedClaims(unclosedClaims)
                .allClaims(chartClaims)
                .build();
    }
}
