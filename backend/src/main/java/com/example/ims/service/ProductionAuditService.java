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
    private final EmailService emailService;
    private final com.example.ims.repository.ManufacturerRepository manufacturerRepository;
    private final MailTemplateService mailTemplateService;
    private final NotificationService notificationService;

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
            String mfrName = (user.getManufacturer() != null) ? user.getManufacturer().getName() : user.getCompanyName();
            log.info(">>>> [AUDIT DEBUG] Manufacturer Audits request. User: '{}', User Company: '{}'", username, mfrName);
            audits = repository.findByManufacturerNameAndIsDisclosedTrueAndIsDeletedFalse(cleanCompanyName(mfrName));
            log.info(">>>> [AUDIT DEBUG] Found Manufacturer Audits count: {}", audits.size());
        }

        return audits.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @SuppressWarnings("deprecation")
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
            log.info(">>>> [AUDIT DEBUG] Pending Audits request. User: '{}', User Company: '{}'", username, user.getCompanyName());
            products = repository.findPendingProductsByManufacturerAndIsDisclosedTrue(cleanCompanyName(user.getCompanyName()));
            log.info(">>>> [AUDIT DEBUG] Found Pending count: {}", products.size());
            if (products.isEmpty()) {
                List<Product> allProds = productRepository.findAll();
                log.info(">>>> [AUDIT DEBUG] DB Products total size: {}. All Products: {}",
                    allProds.size(),
                    allProds.stream().map(p -> "[" + p.getItemCode() + ", name=" + p.getProductName() + ", mfr=" + p.getManufacturer() + ", info=" + (p.getManufacturerInfo() != null ? p.getManufacturerInfo().getName() : "null") + ", discl=" + p.isPhotoAuditDisclosed() + ", active=" + p.isActive() + "]").collect(Collectors.toList())
                );
            }
        }
        
        return products.stream().map(p -> {
            ProductionAuditDTO dto = new ProductionAuditDTO();
            dto.setItemCode(p.getItemCode());
            dto.setProductName(p.getProductName());
            String mfrName = (p.getManufacturerInfo() != null) ? p.getManufacturerInfo().getName() : (p.getManufacturer() != null ? p.getManufacturer() : "");
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
            boolean wasDisclosed = p.isPhotoAuditDisclosed();
            p.setPhotoAuditDisclosed(audit.isDisclosed());
            productRepository.save(p);

            if (!wasDisclosed && audit.isDisclosed() && p.getManufacturerInfo() != null && p.getManufacturerInfo().getName() != null) {
                com.example.ims.entity.Manufacturer mfr = manufacturerRepository.findByName(p.getManufacturerInfo().getName()).orElse(null);
                if (mfr != null && mfr.getEmail() != null && !mfr.getEmail().isEmpty()) {
                    emailService.sendProductionAuditNotificationEmail(mfr.getEmail(), p);
                } else {
                    log.warn("Cannot send audit notification email: Manufacturer email not found for {}", p.getManufacturerInfo().getName());
                }

                // [알림 연동] 생산감리 공개요청(사진 등록 요청) 시 제조사에 알림 적재
                try {
                    notificationService.createNotification(
                        "생산감리 사진 등록 요청",
                        String.format("품목 %s(%s)의 생산감리 사진 등록 요청이 등록되었습니다. 사진을 업로드해 주세요.", 
                            p.getProductName(), p.getItemCode()),
                        "PRODUCTION_AUDIT",
                        null,
                        "ROLE_MANUFACTURER",
                        p.getManufacturerInfo().getName(),
                        String.format("/production-audits?itemCode=%s", p.getItemCode())
                    );
                } catch (Exception e) {
                    log.error("Failed to create audit request notification: {}", e.getMessage());
                }
            }
        });

        // [알림 연동] 제조사가 사진을 업로드하고 상태가 SUBMITTED(또는 업로드 완료 상태)가 되었을 때 품질팀에 알림 발송
        if ("SUBMITTED".equals(savedAudit.getStatus()) && !"SUBMITTED".equals(oldAuditClone.getStatus())) {
            try {
                notificationService.createNotification(
                    "생산감리 사진 제출 완료",
                    String.format("제조사(%s)에서 품목 %s의 생산감리 사진 3종 제출을 완료했습니다. 검토 바랍니다.", 
                        savedAudit.getManufacturerName(), savedAudit.getProductName()),
                    "PRODUCTION_AUDIT",
                    null,
                    "ROLE_QUALITY",
                    null,
                    String.format("/production-audits?itemCode=%s", savedAudit.getItemCode())
                );
            } catch (Exception e) {
                log.error("Failed to create audit submit notification: {}", e.getMessage());
            }
        }

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
        audit.setDeletedAt(java.time.LocalDateTime.now());
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

    @Transactional(readOnly = true)
    public java.util.Map<String, String> getAuditEmailPreview(String idOrItemCode) {
        ProductionAudit audit = null;
        com.example.ims.entity.Product product = null;

        // Try to parse as ID
        try {
            Long id = Long.parseLong(idOrItemCode);
            audit = repository.findById(id).orElse(null);
        } catch (NumberFormatException e) {
            // Not a number, so it is an itemCode
        }

        if (audit == null) {
            String itemCode = idOrItemCode;
            audit = repository.findByItemCode(itemCode).orElse(null);
            if (audit == null) {
                product = productRepository.findByItemCode(itemCode).orElse(null);
                if (product == null && !itemCode.equals("null") && !itemCode.equals("undefined")) {
                    product = productRepository.findAll().stream()
                            .filter(p -> p.getItemCode().equalsIgnoreCase(itemCode))
                            .findFirst().orElse(null);
                }
                
                if (product != null) {
                    audit = new ProductionAudit();
                    audit.setItemCode(product.getItemCode());
                    audit.setProductName(product.getProductName());
                    String mfrName = "";
                    try {
                        if (product.getManufacturerInfo() != null) {
                            mfrName = product.getManufacturerInfo().getName();
                        }
                    } catch (Exception e) {
                        log.warn("Failed to load manufacturerInfo proxy for itemCode: {}", product.getItemCode(), e);
                    }
                    audit.setManufacturerName(mfrName);
                } else {
                    throw new RuntimeException("해당 품목코드에 해당하는 제품 정보 또는 생산감리 정보를 찾을 수 없습니다.");
                }
            }
        }

        String toEmail = "";
        if (audit.getManufacturerName() != null && !audit.getManufacturerName().isEmpty()) {
            com.example.ims.entity.Manufacturer mfr = manufacturerRepository.findByName(audit.getManufacturerName()).orElse(null);
            if (mfr != null && mfr.getEmail() != null) {
                toEmail = mfr.getEmail();
            }
        }

        // Try to load active template for PRODUCTION_AUDIT, fallback to default hardcoded if not found
        com.example.ims.entity.MailTemplate template = mailTemplateService.getActiveTemplatesByCategory("PRODUCTION_AUDIT")
                .stream()
                .findFirst()
                .orElse(null);

        String subject;
        String body;

        if (template != null) {
            subject = emailService.processAuditTemplate(template.getSubject(), audit);
            body = emailService.processAuditTemplate(template.getBody(), audit);
        } else {
            subject = "[QMS 알림] 신제품 생산감리 사진 등록 요청 (" + audit.getProductName() + ")";
            body = "<html>\n<body style=\"font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333;\">\n" +
                    "  <div style=\"max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);\">\n" +
                    "    <h2 style=\"color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px;\">통합 품질 관리 시스템 (QMS)</h2>\n" +
                    "    <p>안녕하세요, 귀사에 <b>신제품 생산감리 사진 등록</b>이 요청되었습니다.</p>\n" +
                    "    <div style=\"background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;\">\n" +
                    "      <ul style=\"margin: 0; padding-left: 20px; color: #475569;\">\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>품목코드:</b> " + (audit.getItemCode() != null ? audit.getItemCode() : "") + "</li>\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>제품명:</b> " + (audit.getProductName() != null ? audit.getProductName() : "") + "</li>\n" +
                    "      </ul>\n" +
                    "    </div>\n" +
                    "    <p>QMS 시스템에 접속하여 해당 제품에 대한 용기, 단상자, 적재 사진을 업로드해 주시기 바랍니다.</p>\n" +
                    "    <div style=\"text-align: center; margin: 30px 0;\">\n" +
                    "      <a href=\"http://localhost:5173/production-audit?itemCode=" + audit.getItemCode() + "\" style=\"display: inline-block; padding: 12px 24px; color: #ffffff; background-color: #003366; text-decoration: none; border-radius: 6px; font-weight: bold;\">📸 생산감리 사진 등록하러 가기</a>\n" +
                    "    </div>\n" +
                    "    <hr style=\"border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;\" />\n" +
                    "    <p style=\"font-size: 12px; color: #94a3b8; text-align: center;\">본 메일은 QMS 시스템에서 자동으로 발송된 메일입니다.</p>\n" +
                    "  </div>\n" +
                    "</body>\n" +
                    "</html>";
        }

        java.util.Map<String, String> preview = new java.util.HashMap<>();
        preview.put("toEmail", toEmail);
        preview.put("subject", subject);
        preview.put("body", body);
        return preview;
    }

    @Transactional
    public boolean sendAuditCustomEmail(String idOrItemCode, java.util.Map<String, String> emailRequest, org.springframework.security.core.userdetails.UserDetails userDetails) {
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

        Long auditId = 0L;
        String itemCode = null;
        try {
            auditId = Long.parseLong(idOrItemCode);
        } catch (NumberFormatException e) {
            itemCode = idOrItemCode;
        }

        User modifier = null;
        if (userDetails != null) {
            modifier = userRepository.findByUsername(userDetails.getUsername()).orElse(null);
        }

        // [추가] 메일 발송 완료 후 공개 상태 자동 적용
        ProductionAudit audit = null;
        if (auditId > 0) {
            audit = repository.findById(auditId).orElse(null);
        } else if (itemCode != null) {
            audit = repository.findByItemCode(itemCode).orElse(null);
        }

        if (audit != null) {
            if (!audit.isDisclosed()) {
                if (modifier != null) {
                    compareAndAdd(new java.util.ArrayList<>(), audit.getId(), modifier, "isDisclosed", false, true);
                }
                audit.setDisclosed(true);
                repository.save(audit);
            }
            productRepository.findByItemCode(audit.getItemCode()).ifPresent(p -> {
                p.setPhotoAuditDisclosed(true);
                productRepository.save(p);
            });
        } else if (itemCode != null) {
            final String finalItemCode = itemCode;
            productRepository.findByItemCode(finalItemCode).ifPresent(p -> {
                p.setPhotoAuditDisclosed(true);
                productRepository.save(p);
            });
        }

        String modifierName = modifier != null ? modifier.getName() : "시스템";
        Long modifierId = modifier != null ? modifier.getId() : null;
        String modifierUsername = modifier != null ? modifier.getUsername() : null;
        String modifierCompany = modifier != null ? modifier.getCompanyName() : null;

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("PRODUCTION_AUDIT")
                .entityId(auditId > 0 ? auditId : (audit != null ? audit.getId() : 0L))
                .action("EMAIL_SENT")
                .modifier(modifierName)
                .modifierId(modifierId)
                .modifierUsername(modifierUsername)
                .modifierName(modifierName)
                .modifierCompany(modifierCompany)
                .description("신제품 생산감리 커스텀 이메일 발송 완료 (대상: " + toEmail + ")")
                .build());

        return isMock;
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
        boolean wasDisclosed = product.isPhotoAuditDisclosed();
        product.setPhotoAuditDisclosed(isDisclosed);
        productRepository.save(product);

        if (!wasDisclosed && isDisclosed && product.getManufacturerInfo() != null && product.getManufacturerInfo().getName() != null) {
            com.example.ims.entity.Manufacturer mfr = manufacturerRepository.findByName(product.getManufacturerInfo().getName()).orElse(null);
            if (mfr != null && mfr.getEmail() != null && !mfr.getEmail().isEmpty()) {
                emailService.sendProductionAuditNotificationEmail(mfr.getEmail(), product);
            } else {
                log.warn("Cannot send audit notification email: Manufacturer email not found for {}", product.getManufacturerInfo().getName());
            }
        }

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

    private String cleanCompanyName(String name) {
        if (name == null) return "";
        int idx = name.indexOf("•");
        if (idx != -1) {
            name = name.substring(0, idx);
        }
        return name.replace("(주)", "").replace("주식회사", "").trim();
    }
}
