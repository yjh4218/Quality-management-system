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
    private final ExcelExportService excelExportService;
    private final com.example.ims.repository.UserRepository userRepository;
    private final EmailService emailService;
    private final com.example.ims.repository.ManufacturerRepository manufacturerRepository;
    private final MailTemplateService mailTemplateService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<Claim> getClaims(String role, String companyName) {
        if (role != null && role.contains("MANUFACTURER")) {
            return claimRepository.findByManufacturer(cleanCompanyName(companyName)).stream()
                    .filter(Claim::isSharedWithManufacturer)
                    .collect(java.util.stream.Collectors.toList());
        }
        return claimRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Claim> searchClaims(String role, String companyName, String startDate, String endDate, String itemCode,
            String productName, String lotNumber, String country, String qualityStatus, String claimNumber,
            String manufacturer, String sharedFilterStr) {
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
                        predicates.add(cb.equal(root.get("manufacturer"), cleanCompanyName(companyName)));
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

                if (manufacturer != null && !manufacturer.trim().isEmpty()) {
                    predicates.add(cb.like(cb.lower(root.get("manufacturer")), "%" + manufacturer.trim().toLowerCase() + "%"));
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

        // [알림 연동] 신규 클레임이 등록되고 제조사 공유 상태일 때, 제조사 전체에 알림 발송
        if (isNew && saved.isSharedWithManufacturer() && saved.getManufacturer() != null) {
            try {
                notificationService.createNotification(
                    "신규 클레임 접수 알림",
                    String.format("품목 %s(Lot: %s)에 대한 신규 클레임(%s)이 접수되었습니다. 확인 부탁드립니다.", 
                        saved.getProductName(), saved.getLotNumber() != null ? saved.getLotNumber() : "-", saved.getClaimNumber()),
                    "CLAIM",
                    null, // targetUsername
                    "ROLE_MANUFACTURER", // targetRole
                    saved.getManufacturer(), // targetCompanyName
                    String.format("/claims?claimId=%d", saved.getId()) // linkUrl (클레임 모달 딥링크)
                );
            } catch (Exception e) {
                log.error("Failed to create claim notification: {}", e.getMessage());
            }
        }

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
        Claim claim = getClaim(id, user, false);
        String oldJson = captureJson(claim);
        claim.setDeleted(true); // Soft delete
        claim.setDeletedAt(java.time.LocalDateTime.now());
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

    @Transactional
    public Claim getClaim(Long id, User user, boolean fromEmail) {
        Claim claim = claimRepository.findById(id).orElseThrow(() -> new RuntimeException("Claim not found"));

        boolean isManufacturer = user.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(user.getDepartment());
        if (isManufacturer) {
            // 메일 링크로 들어왔고 제조사명이 일치한다면 자동으로 공개 처리
            if (fromEmail && Objects.equals(cleanCompanyName(user.getCompanyName()), cleanCompanyName(claim.getManufacturer()))) {
                if (!claim.isSharedWithManufacturer()) {
                    claim.setSharedWithManufacturer(true);
                    claimRepository.save(claim);
                }
            }

            if (!Objects.equals(cleanCompanyName(user.getCompanyName()), cleanCompanyName(claim.getManufacturer())) || !claim.isSharedWithManufacturer()) {
                throw new RuntimeException("해당 클레임에 대한 접근 권한이 없습니다.");
            }
        }

        return claim;
    }

    @Transactional(readOnly = true)
    public List<ClaimHistory> getClaimHistory(Long claimId) {
        return claimHistoryRepository.findByClaimIdOrderByModifiedAtDesc(claimId);
    }

    private void compareAndSave(Long claimId, User user, String field, String oldVal, String newVal) {
        // [보정] null과 ""를 동일하게 취급하여 불필요한 이력 방지 및 데이터 누락 방지 통합
        String nOld = (oldVal == null || oldVal.trim().isEmpty()) ? "" : oldVal.trim();
        String nNew = (newVal == null || newVal.trim().isEmpty()) ? "" : newVal.trim();

        if (!nOld.equals(nNew)) {
            String company = user.getCompanyName() != null ? user.getCompanyName() : "시스템";
            String modifierName = user.getName() + " (" + company + ")";
            claimHistoryRepository.save(ClaimHistory.builder()
                    .claimId(claimId)
                    .modifier(modifierName)
                    .modifierId(user.getId())
                    .modifierUsername(user.getUsername())
                    .modifierName(user.getName())
                    .modifierCompany(user.getCompanyName())
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

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public Claim updateClaim(Long id, Claim updatedData, User user) {
        Claim existing = getClaim(id, user, false);
        
        // 제조사가 이전에 대책서(원인분석/재발방지대책)를 제출했었는지 여부 백업
        boolean wasMfrSubmitted = (existing.getMfrRootCauseAnalysis() != null && !existing.getMfrRootCauseAnalysis().isEmpty())
                               || (existing.getMfrPreventativeAction() != null && !existing.getMfrPreventativeAction().isEmpty());
        
        // 제조사 기입 내용 수정 변경 여부 체크
        boolean mfrFieldsChanged = false;
        if (updatedData.getMfrRootCauseAnalysis() != null && !updatedData.getMfrRootCauseAnalysis().equals(existing.getMfrRootCauseAnalysis())) {
            mfrFieldsChanged = true;
        }
        if (updatedData.getMfrPreventativeAction() != null && !updatedData.getMfrPreventativeAction().equals(existing.getMfrPreventativeAction())) {
            mfrFieldsChanged = true;
        }
        // 낙관적 락 수동 검증: 요청 버전과 DB의 최신 버전 비교 (null 안전 비교)
        Long reqVersion = updatedData.getVersion() != null ? updatedData.getVersion() : 0L;
        Long dbVersion = existing.getVersion() != null ? existing.getVersion() : 0L;
        if (!reqVersion.equals(dbVersion)) {
            throw new org.springframework.orm.ObjectOptimisticLockingFailureException(Claim.class, id);
        }

        String oldJson = auditLogService.toCompactJson(existing);

        String company = user.getCompanyName() != null ? user.getCompanyName() : "시스템";
        String modifierName = user.getName() + " (" + company + ")";

        // [고도화 3] 공유 토글 필드 업데이트
        if (updatedData.isSharedWithManufacturer() != existing.isSharedWithManufacturer()) {
            compareAndSave(id, user, "SharedWithManufacturer",
                    String.valueOf(existing.isSharedWithManufacturer()),
                    String.valueOf(updatedData.isSharedWithManufacturer()));
            existing.setSharedWithManufacturer(updatedData.isSharedWithManufacturer());

            // 공유 처리 시 제조사 이메일 발송 및 시스템 알림 등록
            if (updatedData.isSharedWithManufacturer() && existing.getManufacturer() != null) {
                com.example.ims.entity.Manufacturer mfr = manufacturerRepository.findByName(existing.getManufacturer()).orElse(null);
                if (mfr != null && mfr.getEmail() != null && !mfr.getEmail().isEmpty()) {
                    emailService.sendClaimNotificationEmail(mfr.getEmail(), existing);
                } else {
                    log.warn("Cannot send claim notification email: Manufacturer email not found for {}", existing.getManufacturer());
                }
                
                try {
                    notificationService.createNotification(
                        "신규 클레임 접수 알림",
                        String.format("품목 %s(Lot: %s)에 대한 신규 클레임(%s)이 공유되었습니다. 확인 부탁드립니다.", 
                            existing.getProductName(), existing.getLotNumber() != null ? existing.getLotNumber() : "-", existing.getClaimNumber()),
                        "CLAIM",
                        null,
                        "ROLE_MANUFACTURER",
                        existing.getManufacturer(),
                        String.format("/claims?claimId=%d", existing.getId())
                    );
                } catch (Exception e) {
                    log.error("Failed to create claim share notification: {}", e.getMessage());
                }
            }
        }

        // 종결일 업데이트
        if (updatedData.getTerminationDate() != null) {
            compareAndSave(id, user, "TerminationDate",
                    existing.getTerminationDate() != null ? existing.getTerminationDate().toString() : null,
                    updatedData.getTerminationDate().toString());
            existing.setTerminationDate(updatedData.getTerminationDate());
        }

        // CS fields...
        if (updatedData.getReceiptDate() != null) {
            compareAndSave(id, user, "ReceiptDate",
                    existing.getReceiptDate() != null ? existing.getReceiptDate().toString() : null,
                    updatedData.getReceiptDate().toString());
            existing.setReceiptDate(updatedData.getReceiptDate());
        }
        if (updatedData.getCountry() != null) {
            compareAndSave(id, user, "Country", existing.getCountry(), updatedData.getCountry());
            existing.setCountry(updatedData.getCountry());
        }
        if (updatedData.getItemCode() != null) {
            compareAndSave(id, user, "ItemCode", existing.getItemCode(), updatedData.getItemCode());
            existing.setItemCode(updatedData.getItemCode());
        }
        if (updatedData.getProductName() != null) {
            compareAndSave(id, user, "ProductName", existing.getProductName(), updatedData.getProductName());
            existing.setProductName(updatedData.getProductName());
        }
        if (updatedData.getLotNumber() != null) {
            compareAndSave(id, user, "LotNumber", existing.getLotNumber(), updatedData.getLotNumber());
            existing.setLotNumber(updatedData.getLotNumber());
        }
        if (updatedData.getManufacturer() != null) {
            compareAndSave(id, user, "Manufacturer", existing.getManufacturer(), updatedData.getManufacturer());
            existing.setManufacturer(updatedData.getManufacturer());
        }
        if (updatedData.getOccurrenceQty() != null) {
            compareAndSave(id, user, "OccurrenceQty",
                    existing.getOccurrenceQty() != null ? String.valueOf(existing.getOccurrenceQty()) : null,
                    String.valueOf(updatedData.getOccurrenceQty()));
            existing.setOccurrenceQty(updatedData.getOccurrenceQty());
        }
        if (updatedData.getPrimaryCategory() != null) {
            compareAndSave(id, user, "PrimaryCategory", existing.getPrimaryCategory(),
                    updatedData.getPrimaryCategory());
            existing.setPrimaryCategory(updatedData.getPrimaryCategory());
        }
        if (updatedData.getSecondaryCategory() != null) {
            compareAndSave(id, user, "SecondaryCategory", existing.getSecondaryCategory(),
                    updatedData.getSecondaryCategory());
            existing.setSecondaryCategory(updatedData.getSecondaryCategory());
        }
        if (updatedData.getTertiaryCategory() != null) {
            compareAndSave(id, user, "TertiaryCategory", existing.getTertiaryCategory(),
                    updatedData.getTertiaryCategory());
            existing.setTertiaryCategory(updatedData.getTertiaryCategory());
        }
        if (updatedData.getClaimContent() != null) {
            compareAndSave(id, user, "ClaimContent", existing.getClaimContent(), updatedData.getClaimContent());
            existing.setClaimContent(updatedData.getClaimContent());
        }
        if (updatedData.getQualityCheckNeeded() != null) {
            compareAndSave(id, user, "QualityCheckNeeded", existing.getQualityCheckNeeded(),
                    updatedData.getQualityCheckNeeded());
            existing.setQualityCheckNeeded(updatedData.getQualityCheckNeeded());
        }
        if (updatedData.getConsumerReplyNeeded() != null) {
            compareAndSave(id, user, "ConsumerReplyNeeded", existing.getConsumerReplyNeeded(),
                    updatedData.getConsumerReplyNeeded());
            existing.setConsumerReplyNeeded(updatedData.getConsumerReplyNeeded());
        }
        if (updatedData.getProductRetrievalNeeded() != null) {
            compareAndSave(id, user, "ProductRetrievalNeeded", existing.getProductRetrievalNeeded(),
                    updatedData.getProductRetrievalNeeded());
            existing.setProductRetrievalNeeded(updatedData.getProductRetrievalNeeded());
        }
        if (updatedData.getExpectedRetrievalDate() != null) {
            compareAndSave(id, user, "ExpectedRetrievalDate",
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

            compareAndSave(id, user, "ClaimPhotos", getListString(existing.getClaimPhotos()),
                    getListString(updatedData.getClaimPhotos()));
            existing.setClaimPhotos(updatedData.getClaimPhotos());
        }

        // Quality/Manufacturer fields...
        if (updatedData.getRecallDate() != null) {
            compareAndSave(id, user, "RecallDate",
                    existing.getRecallDate() != null ? existing.getRecallDate().toString() : null,
                    updatedData.getRecallDate().toString());
            existing.setRecallDate(updatedData.getRecallDate());
        }
        if (updatedData.getRootCauseAnalysis() != null) {
            compareAndSave(id, user, "RootCauseAnalysis", existing.getRootCauseAnalysis(),
                    updatedData.getRootCauseAnalysis());
            existing.setRootCauseAnalysis(updatedData.getRootCauseAnalysis());
        }
        if (updatedData.getPreventativeAction() != null) {
            compareAndSave(id, user, "PreventativeAction", existing.getPreventativeAction(),
                    updatedData.getPreventativeAction());
            existing.setPreventativeAction(updatedData.getPreventativeAction());
        }
        if (updatedData.getManufacturerResponsePdf() != null) {
            // [수정] 제조사 답변 PDF 교체 시 삭제 처리
            if (existing.getManufacturerResponsePdf() != null
                    && !existing.getManufacturerResponsePdf().equals(updatedData.getManufacturerResponsePdf())) {
                fileStorageService.deleteFile(existing.getManufacturerResponsePdf());
            }
            compareAndSave(id, user, "ManufacturerResponsePdf", existing.getManufacturerResponsePdf(),
                    updatedData.getManufacturerResponsePdf());
            existing.setManufacturerResponsePdf(updatedData.getManufacturerResponsePdf());
        }

        // [수정] 품질팀 회수 제품 수령 필드 업데이트 누락분 추가
        if (updatedData.getQualityReceivedReturnedProduct() != null) {
            compareAndSave(id, user, "QualityReceivedReturnedProduct",
                    existing.getQualityReceivedReturnedProduct(), updatedData.getQualityReceivedReturnedProduct());
            existing.setQualityReceivedReturnedProduct(updatedData.getQualityReceivedReturnedProduct());
        }
        if (updatedData.getQualityReceivedDate() != null) {
            compareAndSave(id, user, "QualityReceivedDate",
                    existing.getQualityReceivedDate() != null ? existing.getQualityReceivedDate().toString() : null,
                    updatedData.getQualityReceivedDate().toString());
            existing.setQualityReceivedDate(updatedData.getQualityReceivedDate());
        }

        // [추가] 제조사 전용 기입 필드 업데이트
        if (updatedData.getMfrRootCauseAnalysis() != null) {
            compareAndSave(id, user, "MfrRootCauseAnalysis", existing.getMfrRootCauseAnalysis(),
                    updatedData.getMfrRootCauseAnalysis());
            existing.setMfrRootCauseAnalysis(updatedData.getMfrRootCauseAnalysis());
        }
        if (updatedData.getMfrPreventativeAction() != null) {
            compareAndSave(id, user, "MfrPreventativeAction", existing.getMfrPreventativeAction(),
                    updatedData.getMfrPreventativeAction());
            existing.setMfrPreventativeAction(updatedData.getMfrPreventativeAction());
        }
        if (updatedData.getMfrRecallDate() != null) {
            compareAndSave(id, user, "MfrRecallDate",
                    existing.getMfrRecallDate() != null ? existing.getMfrRecallDate().toString() : null,
                    updatedData.getMfrRecallDate().toString());
            existing.setMfrRecallDate(updatedData.getMfrRecallDate());
        }
        if (updatedData.getMfrRecallStatus() != null) {
            compareAndSave(id, user, "MfrRecallStatus", existing.getMfrRecallStatus(),
                    updatedData.getMfrRecallStatus());
            existing.setMfrRecallStatus(updatedData.getMfrRecallStatus());
        }
        if (updatedData.getMfrTerminationDate() != null) {
            compareAndSave(id, user, "MfrTerminationDate",
                    existing.getMfrTerminationDate() != null ? existing.getMfrTerminationDate().toString() : null,
                    updatedData.getMfrTerminationDate().toString());
            existing.setMfrTerminationDate(updatedData.getMfrTerminationDate());
        }
        // [수정] 비고 및 대책 항목들은 null이 아닌 이상(빈 문자열 포함) 저장되도록 보장
        if (updatedData.getQualityRemarks() != null) {
            compareAndSave(id, user, "QualityRemarks", existing.getQualityRemarks(),
                    updatedData.getQualityRemarks());
            existing.setQualityRemarks(updatedData.getQualityRemarks());
        }
        if (updatedData.getMfrRemarks() != null) {
            compareAndSave(id, user, "MfrRemarks", existing.getMfrRemarks(), updatedData.getMfrRemarks());
            existing.setMfrRemarks(updatedData.getMfrRemarks());
        }

        // [수정] 수동으로 지정된 상태값이 있으면 우선 적용하고, 없으면 자동 판정 수행
        if (updatedData.getQualityStatus() != null && !updatedData.getQualityStatus().trim().isEmpty()) {
            compareAndSave(id, user, "QualityStatus", existing.getQualityStatus(), updatedData.getQualityStatus());
            existing.setQualityStatus(updatedData.getQualityStatus());
        } else {
            determineStatus(existing);
        }

        if (updatedData.getMfrStatus() != null && !updatedData.getMfrStatus().trim().isEmpty()) {
            compareAndSave(id, user, "MfrStatus", existing.getMfrStatus(), updatedData.getMfrStatus());
            existing.setMfrStatus(updatedData.getMfrStatus());
        } else {
            determineMfrStatus(existing);
        }

        boolean mfrSubmitted = (updatedData.getMfrRootCauseAnalysis() != null && !updatedData.getMfrRootCauseAnalysis().isEmpty()) 
                            || (updatedData.getMfrPreventativeAction() != null && !updatedData.getMfrPreventativeAction().isEmpty());

        Claim saved = claimRepository.save(existing);

        // 제조사가 대책서/원인분석을 새로 기입하거나 수정하여 저장했을 때 품질팀(ROLE_QUALITY) 및 관리자(ROLE_ADMIN)에게 알림 발송
        if (mfrFieldsChanged && mfrSubmitted) {
            // 1. 품질 담당자에게 알림 생성
            try {
                notificationService.createNotification(
                    "제조사 대책서 제출 알림",
                    String.format("제조사(%s)에서 클레임 %s에 대한 원인분석 및 대책서를 제출하였습니다.", 
                        saved.getManufacturer(), saved.getClaimNumber()),
                    "CLAIM",
                    null,
                    "ROLE_QUALITY",
                    null,
                    String.format("/claims?claimId=%d", saved.getId())
                );
            } catch (Exception e) {
                log.error("Failed to create manufacturer action plan notification for quality: {}", e.getMessage());
            }

            // 2. 시스템 관리자에게 알림 생성
            try {
                notificationService.createNotification(
                    "제조사 대책서 제출 알림",
                    String.format("제조사(%s)에서 클레임 %s에 대한 원인분석 및 대책서를 제출하였습니다.", 
                        saved.getManufacturer(), saved.getClaimNumber()),
                    "CLAIM",
                    null,
                    "ROLE_ADMIN",
                    null,
                    String.format("/claims?claimId=%d", saved.getId())
                );
            } catch (Exception e) {
                log.error("Failed to create manufacturer action plan notification for admin: {}", e.getMessage());
            }
        }

        // [고도화] 이벤트 발행
        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("CLAIM")
                .entityId(id)
                .action("UPDATE")
                .modifier(modifierName)
                .modifierId(user.getId())
                .modifierUsername(user.getUsername())
                .modifierName(user.getName())
                .modifierCompany(user.getCompanyName())
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
                productName, null, null, null, null, manufacturer, null);

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
    /**
     * [고도화] 클레임 목록을 엑셀 파일로 추출합니다.
     */
    public byte[] exportClaims(String username, String role, String companyName, String startDate, String endDate, String itemCode, String productName, String lotNumber, String country, String qualityStatus, String claimNumber, String manufacturer, String sharedFilterStr) throws java.io.IOException {
        List<Claim> data = searchClaims(role, companyName, startDate, endDate, itemCode, productName, lotNumber, country, qualityStatus, claimNumber, manufacturer, sharedFilterStr);
        
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

        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("CLAIM")
                .entityId(0L)
                .action("EXPORT")
                .modifier(modifierName)
                .modifierId(modifierId)
                .modifierUsername(username)
                .modifierName(modifierNameOnly)
                .modifierCompany(modifierCompany)
                .description("클레임 관리 엑셀 다운로드 수행 (내역: " + data.size() + "건)")
                .build());

        String[] headers = {
            "클레임번호", "접수일", "국가", "품목코드", "제품명", "LOT번호", "제조사", "발생수량",
            "대분류", "중분류", "품질상태", "제조사상태", "공유여부"
        };
        
        return excelExportService.exportToExcel("클레임내역", headers, data, c -> new Object[]{
            c.getClaimNumber(), c.getReceiptDate() != null ? c.getReceiptDate().toString() : "-",
            c.getCountry(), c.getItemCode(), c.getProductName(), c.getLotNumber(), c.getManufacturer(),
            c.getOccurrenceQty(), c.getPrimaryCategory(), c.getSecondaryCategory(),
            c.getQualityStatus(), c.getMfrStatus(), c.isSharedWithManufacturer()
        });
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getClaimEmailPreview(Long claimId, String templateCode) {
        Claim claim = claimRepository.findById(claimId).orElseThrow(() -> new RuntimeException("클레임을 찾을 수 없습니다."));
        com.example.ims.entity.MailTemplate template = mailTemplateService.getTemplateByCode(templateCode);
        if (template == null) {
            throw new RuntimeException("해당 메일 양식을 찾을 수 없습니다: " + templateCode);
        }

        String manufacturerName = claim.getManufacturer();
        if (manufacturerName == null || manufacturerName.isEmpty()) {
            throw new RuntimeException("해당 클레임에 지정된 제조사가 없습니다.");
        }

        String targetEmailStr = "";
        com.example.ims.entity.Manufacturer mfr = manufacturerRepository.findByName(manufacturerName).orElse(null);
        if (mfr != null && mfr.getEmail() != null) {
            targetEmailStr = mfr.getEmail();
        }

        String subject = emailService.processClaimTemplate(template.getSubject(), claim);
        String body = emailService.processClaimTemplate(template.getBody(), claim);

        java.util.Map<String, Object> preview = new java.util.HashMap<>();
        preview.put("toEmail", targetEmailStr);
        preview.put("subject", subject);
        preview.put("body", body);
        return preview;
    }

    @Transactional
    public void sendEmailToManufacturer(Long claimId, String templateCode, User modifier) {
        Claim claim = claimRepository.findById(claimId).orElseThrow(() -> new RuntimeException("클레임을 찾을 수 없습니다."));
        com.example.ims.entity.MailTemplate template = mailTemplateService.getTemplateByCode(templateCode);
        if (template == null) {
            throw new RuntimeException("해당 메일 양식을 찾을 수 없습니다: " + templateCode);
        }

        String manufacturerName = claim.getManufacturer();
        if (manufacturerName == null || manufacturerName.isEmpty()) {
            throw new RuntimeException("해당 클레임에 지정된 제조사가 없습니다.");
        }

        List<User> manufacturerUsers = userRepository.findByCompanyName(manufacturerName);
        if (manufacturerUsers.isEmpty()) {
            throw new RuntimeException("해당 제조사(" + manufacturerName + ") 소속으로 등록된 사용자가 없습니다.");
        }

        List<String> targetEmails = manufacturerUsers.stream()
                .filter(u -> u.getEmail() != null && !u.getEmail().isEmpty())
                .map(User::getEmail)
                .collect(Collectors.toList());

        if (targetEmails.isEmpty()) {
            throw new RuntimeException("해당 제조사(" + manufacturerName + ") 소속 사용자 중 이메일 주소가 등록된 사용자가 없습니다.");
        }

        for (String targetEmail : targetEmails) {
            emailService.sendDynamicEmail(targetEmail, template, claim);
        }

        String targetEmailList = String.join(", ", targetEmails);

        // Audit Log
        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("CLAIM")
                .entityId(claim.getId())
                .action("EMAIL_SENT")
                .modifier(modifier.getName())
                .modifierId(modifier.getId())
                .modifierUsername(modifier.getUsername())
                .modifierName(modifier.getName())
                .modifierCompany(modifier.getCompanyName())
                .description("제조사에 이메일 통보 완료 (템플릿: " + template.getTemplateName() + ", 대상: " + targetEmailList + ")")
                .build());
    }

    @Transactional
    public boolean sendCustomEmailToManufacturer(Long claimId, java.util.Map<String, String> emailRequest, User modifier) {
        Claim claim = claimRepository.findById(claimId).orElseThrow(() -> new RuntimeException("클레임을 찾을 수 없습니다."));
        
        String toEmail = emailRequest.get("toEmail");
        String subject = emailRequest.get("subject");
        String body = emailRequest.get("body");

        if (toEmail == null || toEmail.trim().isEmpty()) {
            throw new RuntimeException("수신자 메일 주소가 입력되지 않았습니다.");
        }
        if (subject == null || subject.trim().isEmpty()) {
            throw new RuntimeException("메일 제목이 입력되지 않았습니다.");
        }
        if (body == null || body.trim().isEmpty()) {
            throw new RuntimeException("메일 내용이 입력되지 않았습니다.");
        }

        boolean isMock = false;
        // Split by comma in case multiple emails are provided
        String[] emails = toEmail.split(",");
        for (String email : emails) {
            String trimmedEmail = email.trim();
            if (!trimmedEmail.isEmpty()) {
                isMock = emailService.sendCustomEmail(trimmedEmail, subject, body);
            }
        }

        // 메일 발송 일시 기록 및 제조사 자동 공유 설정
        claim.setEmailSentAt(java.time.LocalDateTime.now());
        if (!claim.isSharedWithManufacturer()) {
            compareAndSave(claimId, modifier, "SharedWithManufacturer", "false", "true");
            claim.setSharedWithManufacturer(true);
        }
        claimRepository.save(claim);



        // Audit Log
        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("CLAIM")
                .entityId(claim.getId())
                .action("EMAIL_SENT")
                .modifier(modifier.getName())
                .modifierId(modifier.getId())
                .modifierUsername(modifier.getUsername())
                .modifierName(modifier.getName())
                .modifierCompany(modifier.getCompanyName())
                .description("제조사에 커스텀 이메일 발송 완료 (대상: " + toEmail + ")")
                .build());

        return isMock;
    }

    private String cleanCompanyName(String name) {
        if (name == null) return "";
        int idx = name.indexOf("•");
        if (idx != -1) {
            name = name.substring(0, idx);
        }
        return name.replace("(주)", "").replace("주식회사", "").trim();
    }
}
