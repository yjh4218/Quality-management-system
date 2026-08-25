package com.example.ims.service;

import com.example.ims.entity.*;
import com.example.ims.repository.CustomDocumentTypeRepository;
import com.example.ims.repository.DocumentRequirementRepository;
import com.example.ims.repository.DocumentRequestLogRepository;
import com.example.ims.repository.ProductRepository;
import com.example.ims.repository.ManufacturerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 마스터 품목 필수 서류 자동요청 스케줄러.
 * 매일 새벽 2시에 시스템 부하가 적은 시간에 기동됩니다.
 * [성능 개선]
 * 1. requirementRepository.findAll() 2회 호출 전면 제거
 * 2. @EntityGraph 기반 전용 쿼리로 N+1 문제 해소 (Product/Manufacturer 1회 Fetch Join)
 * 3. 기한 도래/OVERDUE 전용 필터링 쿼리 사용으로 데이터 로딩 및 인메모리 루핑 최소화
 */
@Component
public class DocumentRequestScheduler {

    private static final Logger log = LoggerFactory.getLogger(DocumentRequestScheduler.class);

    private final DocumentRequestService requestService;
    private final DocumentRequirementRepository requirementRepository;
    private final DocumentRequestLogRepository requestLogRepository;
    private final CustomDocumentTypeRepository customDocumentTypeRepository;
    private final ProductRepository productRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final com.example.ims.repository.UserRepository userRepository;

    public DocumentRequestScheduler(
            DocumentRequestService requestService,
            DocumentRequirementRepository requirementRepository,
            DocumentRequestLogRepository requestLogRepository,
            CustomDocumentTypeRepository customDocumentTypeRepository,
            ProductRepository productRepository,
            ManufacturerRepository manufacturerRepository,
            com.example.ims.repository.UserRepository userRepository) {
        this.requestService = requestService;
        this.requirementRepository = requirementRepository;
        this.requestLogRepository = requestLogRepository;
        this.customDocumentTypeRepository = customDocumentTypeRepository;
        this.productRepository = productRepository;
        this.manufacturerRepository = manufacturerRepository;
        this.userRepository = userRepository;
    }

    /**
     * 매일 새벽 2시 크론 스케줄링 실행
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void runDocumentSchedulingTask() {
        log.info("[SCHEDULE] Starting scheduled document request management task...");

        try {
            // 1단계: 신규 마스터 제품/제조사 요구조건(Requirements) 자동 누락 스캔 및 동기화
            syncDocumentRequirements();

            // 2단계: 신규/주기 도래 대상 필수서류 이메일 발송 (N+1 및 findAll 제거 전용 쿼리)
            processScheduledRequests();

            // 3단계: 리마인드 발송 및 기한 경과(OVERDUE) 전환 처리 (전용 쿼리 사용)
            processRemindersAndOverdues();

            log.info("[SCHEDULE] Scheduled document request management task completed successfully.");
        } catch (Exception e) {
            log.error("[SCHEDULE] Scheduled document request management task failed: {}", e.getMessage(), e);
        }
    }

    /**
     * 마스터 품목 및 제조사에 설정된 신규 서류 요구조건을 사전 동기화하여 PENDING 레코드를 적재합니다.
     */
    private void syncDocumentRequirements() {
        // 모든 마스터 품목 연동
        List<Product> masterProducts = productRepository.findByIsMasterTrue();
        for (Product prod : masterProducts) {
            try {
                requestService.initializeMasterProductRequirements(prod);
            } catch (Exception e) {
                log.error("Failed to sync requirement for product ID {}: {}", prod.getId(), e.getMessage());
            }
        }

        // 모든 활성 제조사에 대해 커스텀 제조사 서류 연동
        List<CustomDocumentType> customTypes = customDocumentTypeRepository.findByIsActiveTrue();
        for (CustomDocumentType ct : customTypes) {
            try {
                requestService.initializeCustomRequirementsForAllTargets(ct);
            } catch (Exception e) {
                log.error("Failed to sync custom requirements for type {}: {}", ct.getName(), e.getMessage());
            }
        }
    }

    /**
     * 신규 등록(PENDING) 또는 연체(OVERDUE) 또는 다음 기한 도래 대상을 조건부 쿼리(@EntityGraph)로 가져와 이메일 발송
     */
    private void processScheduledRequests() {
        List<DocumentRequirement> requirements = requirementRepository.findScheduledTargets(
                List.of(DocumentStatus.PENDING, DocumentStatus.OVERDUE),
                LocalDate.now()
        );

        int sentCount = 0;
        int skippedEmptyEmailCount = 0;
        int failedCount = 0;

        for (DocumentRequirement req : requirements) {
            if (req.getStatus() == DocumentStatus.FULFILLED) {
                continue;
            }

            String recipientEmail = getRecipientEmail(req);
            if (recipientEmail != null && !recipientEmail.trim().isEmpty()) {
                try {
                    requestService.sendEmailRequest(req, recipientEmail);
                    sentCount++;
                    log.debug("[SCHEDULE] Document request email sent successfully to: {}, ReqId={}", recipientEmail, req.getId());
                } catch (Exception e) {
                    failedCount++;
                    log.error("[SCHEDULE] Failed to send document request email to: {}, ReqId={}: {}", recipientEmail, req.getId(), e.getMessage());
                }
            } else {
                skippedEmptyEmailCount++;
                log.debug("[SCHEDULE] Recipient email is empty for requirement ID: {}", req.getId());
            }
        }

        log.info("[SCHEDULE] Document request processing summary: Total targets={}, Sent={}, Skipped (No email)={}, Failed={}",
                requirements.size(), sentCount, skippedEmptyEmailCount, failedCount);
    }

    /**
     * 발송 7일 이후 미회신 건에 대한 1회성 리마인드 및 기한 초과(OVERDUE) 상태 자동 갱신을 수행합니다.
     */
    private void processRemindersAndOverdues() {
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);

        // 1. 리마인드 처리 (7일 전 요청되었으며 아직 리마인드 횟수가 0회인 것)
        List<DocumentRequestLog> activeLogs = requestLogRepository
                .findByRequestedAtBeforeAndReminderCount(sevenDaysAgo, 0);

        for (DocumentRequestLog logEntity : activeLogs) {
            if (logEntity.getUploadedAt() == null) {
                Optional<DocumentRequirement> reqOpt = requirementRepository.findById(logEntity.getRequirementId());
                if (reqOpt.isPresent() && reqOpt.get().getStatus() == DocumentStatus.REQUESTED) {
                    DocumentRequirement req = reqOpt.get();
                    String recipientEmail = logEntity.getEmailSentTo();
                    try {
                        requestService.sendEmailRequest(req, recipientEmail);
                        logEntity.setReminderCount(logEntity.getReminderCount() + 1);
                        requestLogRepository.save(logEntity);
                        log.info("[SCHEDULE-REMINDER] Reminder document request email resent to: {}, ReqId={}", recipientEmail, req.getId());
                    } catch (Exception e) {
                        log.error("[SCHEDULE-REMINDER] Failed to resend reminder email: {}", e.getMessage());
                    }
                }
            }
        }

        // 2. 기한 경과(OVERDUE) 상태 갱신 (전용 조건 쿼리로 N+1 및 findAll 제거)
        List<DocumentRequirement> overdueCandidates = requirementRepository.findOverdueCandidates(
                DocumentStatus.REQUESTED,
                LocalDate.now()
        );
        for (DocumentRequirement req : overdueCandidates) {
            req.setStatus(DocumentStatus.OVERDUE);
            requirementRepository.save(req);
            log.info("[SCHEDULE-OVERDUE] Requirement ID {} status updated to OVERDUE due to nextDueDate = {}", req.getId(), req.getNextDueDate());
        }
    }

    private String getRecipientEmail(DocumentRequirement req) {
        Manufacturer mfr = null;

        if (req.getProduct() != null && req.getProduct().getManufacturerInfo() != null) {
            mfr = req.getProduct().getManufacturerInfo();
        } else if (req.getManufacturer() != null) {
            mfr = req.getManufacturer();
        } else if (req.getProductId() != null) {
            Product prod = productRepository.findById(req.getProductId()).orElse(null);
            if (prod != null && prod.getManufacturerInfo() != null) {
                mfr = prod.getManufacturerInfo();
            }
        } else if (req.getManufacturerId() != null) {
            mfr = manufacturerRepository.findById(req.getManufacturerId()).orElse(null);
        }

        // 1차: 제조사의 email 필드 확인
        if (mfr != null && mfr.getEmail() != null && !mfr.getEmail().trim().isEmpty()) {
            return mfr.getEmail().trim();
        }

        // 2차: 제조사의 상호명(companyName)과 매칭되는 사용자 계정의 email 확인 (폴백 방어선)
        if (mfr != null && mfr.getName() != null) {
            List<User> users = userRepository.findByCompanyName(mfr.getName());
            for (User u : users) {
                if (u.getEmail() != null && !u.getEmail().trim().isEmpty() && u.isEnabled()) {
                    return u.getEmail().trim();
                }
            }
        }

        return null;
    }
}
