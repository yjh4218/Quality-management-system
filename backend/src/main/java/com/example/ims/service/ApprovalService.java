package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApprovalService {

    private final ApprovalDocumentRepository documentRepository;
    private final ApprovalStepInstanceRepository stepInstanceRepository;
    private final ApprovalHistoryLogRepository historyLogRepository;
    private final ApprovalDocTypeRepository docTypeRepository;
    private final ApprovalTemplateRepository templateRepository;
    private final DepartmentRepository departmentRepository;
    private final DepartmentRoleRepository departmentRoleRepository;
    private final NotificationRuleRepository notificationRuleRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final WmsInboundRepository wmsInboundRepository;
    private final ClaimRepository claimRepository;
    private final ProductionAuditRepository productionAuditRepository;
    private final ManufacturerAuditRepository manufacturerAuditRepository;
    private final ApprovalDocumentReadRepository readRepository;

    // ═══════════════════════════════════════════
    // 1. Submit (상신)
    // ═══════════════════════════════════════════

    @Transactional
    public ApprovalDocumentDetailDto submitApproval(ApprovalSubmitRequestDto dto, String username) {
        User submitter = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));
        validateNotManufacturer(submitter);

        ApprovalDocType docType = docTypeRepository.findByCode(dto.getDocTypeCode())
                .orElseThrow(() -> new IllegalArgumentException("문서 유형을 찾을 수 없습니다: " + dto.getDocTypeCode()));

        if (Boolean.FALSE.equals(docType.getIsActive())) {
            throw new IllegalStateException("해당 결재 문서 유형('" + docType.getName() + "')은 현재 비활성화(중지) 상태이므로 상신할 수 없습니다.");
        }

        ApprovalTemplate template = templateRepository.findByDocTypeCodeAndIsCurrentTrue(dto.getDocTypeCode())
                .orElse(null);

        boolean hasAdhocApprovers = (dto.getAdhocApproverUserIds() != null && !dto.getAdhocApproverUserIds().isEmpty())
                || (dto.getAdhocConsensusUserIds() != null && !dto.getAdhocConsensusUserIds().isEmpty());
        if (template == null && !hasAdhocApprovers) {
            throw new IllegalArgumentException("해당 문서 유형에 기본 결재선 템플릿이 없으므로, [결재라인 지정]에서 결재자를 직접 선택해 주십시오.");
        }

        // 중복 상신 체크 (동일 소속 원본 레코드에 대해 이미 진행 중인 결재가 있는 경우, sourceRecordId가 있을 때만 검사)
        if (dto.getSourceRecordId() != null) {
            documentRepository.findFirstByDocTypeCodeAndSourceRecordIdAndStatusInOrderByCreatedAtDesc(
                    dto.getDocTypeCode(), dto.getSourceRecordId(), List.of("PENDING")
            ).ifPresent(existing -> {
                throw new IllegalStateException("해당 건에 대해 이미 진행 중인 결재가 존재합니다. (문서번호: " + existing.getId() + ")");
            });
        }

        // 1. 문서 인스턴스 생성
        ApprovalDocument doc = ApprovalDocument.builder()
                .docType(docType)
                .sourceRecordId(dto.getSourceRecordId())
                .template(template)
                .title(dto.getTitle() != null && !dto.getTitle().isBlank()
                        ? dto.getTitle()
                        : String.format("[%s] %s 결재 요청", docType.getName(), submitter.getName()))
                .content(dto.getContent())
                .retentionPeriod(dto.getRetentionPeriod() != null ? dto.getRetentionPeriod() : "5년")
                .status("PENDING")
                .submittedBy(submitter)
                .submittedAt(LocalDateTime.now())
                .parentDocumentId(dto.getParentDocumentId())
                .stepInstances(new ArrayList<>())
                .build();

        ApprovalDocument savedDoc = documentRepository.save(doc);

        // 2. 결재선 인스턴스 생성 및 저장
        List<ApprovalStepInstance> instances = createStepInstances(savedDoc, template, dto, submitter);
        List<ApprovalStepInstance> savedInstances = stepInstanceRepository.saveAll(instances);
        savedDoc.setStepInstances(savedInstances);

        // 3. 감사 로그 기록
        ApprovalHistoryLog logEntry = ApprovalHistoryLog.builder()
                .document(savedDoc)
                .actorUser(submitter)
                .action("SUBMIT")
                .detailJson(dto.getComment() != null ? dto.getComment() : "결재 상신")
                .build();
        historyLogRepository.save(logEntry);

        // 4. 첫 번째 단계(min stepOrder) 결재자들에게 알림 발송
        int firstStepOrder = instances.stream()
                .filter(s -> !"REFERENCE".equalsIgnoreCase(s.getStepType()))
                .mapToInt(ApprovalStepInstance::getStepOrder)
                .min()
                .orElse(1);

        List<User> firstApprovers = instances.stream()
                .filter(s -> s.getStepOrder() == firstStepOrder && !"REFERENCE".equalsIgnoreCase(s.getStepType()))
                .map(ApprovalStepInstance::getAssigneeUser)
                .distinct()
                .collect(Collectors.toList());

        notifyUsers("MY_TURN", firstApprovers, savedDoc,
                "결재 요청: " + savedDoc.getTitle(),
                String.format("%s님이 '%s' 결재를 상신하였습니다. 승인 처리가 필요합니다.", submitter.getName(), savedDoc.getTitle()));

        // 참조자들에게 알림 발송
        List<User> refUsers = instances.stream()
                .filter(s -> "REFERENCE".equalsIgnoreCase(s.getStepType()))
                .map(ApprovalStepInstance::getAssigneeUser)
                .distinct()
                .collect(Collectors.toList());

        notifyUsers("REFERENCE_TAGGED", refUsers, savedDoc,
                "결재 문서 참조: " + savedDoc.getTitle(),
                String.format("%s님이 상신한 '%s' 결재 문서에 참조자로 지정되었습니다.", submitter.getName(), savedDoc.getTitle()));

        return getDocumentDetail(savedDoc.getId(), username);
    }

    // ═══════════════════════════════════════════
    // 2. Approve (승인)
    // ═══════════════════════════════════════════

    @Transactional
    public ApprovalDocumentDetailDto approve(Long documentId, ApprovalActionRequestDto dto, String username) {
        User approver = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));
        validateNotManufacturer(approver);

        ApprovalDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("결재 문서를 찾을 수 없습니다. ID: " + documentId));

        if (!"PENDING".equalsIgnoreCase(doc.getStatus())) {
            throw new IllegalStateException("진행 중인 결재 문서만 승인할 수 있습니다. 현재 상태: " + doc.getStatus());
        }

        // 현재 본인 차례의 PENDING 인스턴스 찾기
        List<ApprovalStepInstance> allSteps = stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(documentId);

        // 현재 진행 중인 최소 stepOrder 찾기
        int currentActiveOrder = allSteps.stream()
                .filter(s -> !"REFERENCE".equalsIgnoreCase(s.getStepType()) && "PENDING".equalsIgnoreCase(s.getStatus()))
                .mapToInt(ApprovalStepInstance::getStepOrder)
                .min()
                .orElseThrow(() -> new IllegalStateException("대기 중인 결재 단계가 없습니다."));

        ApprovalStepInstance myStep = allSteps.stream()
                .filter(s -> s.getStepOrder() == currentActiveOrder
                        && s.getAssigneeUser().getId().equals(approver.getId())
                        && "PENDING".equalsIgnoreCase(s.getStatus())
                        && !"REFERENCE".equalsIgnoreCase(s.getStepType()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("현재 승인 권한이 없거나 이미 처리된 단계입니다."));

        myStep.setStatus("APPROVED");
        myStep.setComment(dto != null ? dto.getComment() : null);
        myStep.setProcessedAt(LocalDateTime.now());
        if (myStep.getReadAt() == null) {
            myStep.setReadAt(LocalDateTime.now());
        }
        stepInstanceRepository.save(myStep);

        // 감사 로그
        historyLogRepository.save(ApprovalHistoryLog.builder()
                .document(doc)
                .actorUser(approver)
                .action("APPROVE")
                .detailJson(dto != null && dto.getComment() != null ? dto.getComment() : "승인 완료")
                .build());

        // 동일 stepOrder 내 다른 필수 결재자가 아직 PENDING인지 확인 (병렬 처리 지원)
        long pendingInSameOrder = stepInstanceRepository.countByDocumentIdAndStepOrderAndStatusNot(
                documentId, currentActiveOrder, "APPROVED");

        if (pendingInSameOrder == 0) {
            // 현재 단계 전원 승인 완료 -> 다음 단계 확인
            OptionalInt nextOrderOpt = allSteps.stream()
                    .filter(s -> !"REFERENCE".equalsIgnoreCase(s.getStepType())
                            && s.getStepOrder() > currentActiveOrder
                            && "PENDING".equalsIgnoreCase(s.getStatus()))
                    .mapToInt(ApprovalStepInstance::getStepOrder)
                    .min();

            if (nextOrderOpt.isPresent()) {
                // 다음 단계 활성화 알림
                int nextOrder = nextOrderOpt.getAsInt();
                List<User> nextApprovers = allSteps.stream()
                        .filter(s -> s.getStepOrder() == nextOrder && !"REFERENCE".equalsIgnoreCase(s.getStepType()))
                        .map(ApprovalStepInstance::getAssigneeUser)
                        .distinct()
                        .collect(Collectors.toList());

                notifyUsers("MY_TURN", nextApprovers, doc,
                        "결재 요청: " + doc.getTitle(),
                        String.format("이전 단계 승인이 완료되어 '%s' 결재 차례가 되었습니다.", doc.getTitle()));
            } else {
                // 최종 승인 완료!
                doc.setStatus("APPROVED");
                doc.setCompletedAt(LocalDateTime.now());
                documentRepository.save(doc);

                // 원천 레코드 상태 자동 갱신 (Post-Approval Hook)
                handlePostApprovalAction(doc);

                // 상신자에게 최종 승인 알림
                notifyUsers("APPROVED", List.of(doc.getSubmittedBy()), doc,
                        "결재 완료 (최종 승인): " + doc.getTitle(),
                        String.format("상신하신 결재 문서 '%s'가 모든 결재선의 승인을 받아 최종 완료되었습니다.", doc.getTitle()));
            }
        }

        return getDocumentDetail(documentId, username);
    }

    private void handlePostApprovalAction(ApprovalDocument doc) {
        if (doc == null || doc.getSourceRecordId() == null || doc.getDocType() == null) {
            return;
        }

        String docTypeCode = doc.getDocType().getCode();
        Long sourceId = doc.getSourceRecordId();

        try {
            if ("MARKET_RELEASE".equalsIgnoreCase(docTypeCode)) {
                wmsInboundRepository.findById(sourceId).ifPresent(inbound -> {
                    inbound.setOverallStatus(WmsInbound.OverallStatus.STEP5_FINAL_COMPLETE);
                    inbound.setFinalInspectionResult("적합");
                    if (inbound.getQualityDecisionDate() == null || inbound.getQualityDecisionDate().trim().isEmpty()) {
                        inbound.setQualityDecisionDate(java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE));
                    }
                    inbound.setLastModifiedBy(doc.getSubmittedBy() != null ? doc.getSubmittedBy().getName() : "전자결재 시스템");
                    wmsInboundRepository.save(inbound);
                    log.info("[Approval Hook] MARKET_RELEASE 결재 승인 연동 완료: 입고 ID {}, 상태 5. 최종 검사 완료 전환", sourceId);
                });
            } else if ("CLAIM_REPORT".equalsIgnoreCase(docTypeCode)) {
                claimRepository.findById(sourceId).ifPresent(claim -> {
                    claim.setQualityStatus("5단계 (종결)");
                    if (claim.getTerminationDate() == null) {
                        claim.setTerminationDate(java.time.LocalDate.now());
                    }
                    claimRepository.save(claim);
                    log.info("[Approval Hook] CLAIM_REPORT 결재 승인 연동 완료: 클레임 ID {}, 5단계 종결 전환", sourceId);
                });
            } else if ("PROD_AUDIT".equalsIgnoreCase(docTypeCode)) {
                productionAuditRepository.findById(sourceId).ifPresent(audit -> {
                    audit.setStatus("APPROVED");
                    productionAuditRepository.save(audit);
                    log.info("[Approval Hook] PROD_AUDIT 결재 승인 연동 완료: 생산감리 ID {}, APPROVED 전환", sourceId);
                });
            } else if ("MFR_AUDIT".equalsIgnoreCase(docTypeCode)) {
                manufacturerAuditRepository.findById(sourceId).ifPresent(audit -> {
                    audit.setModifierInfo(doc.getSubmittedBy() != null ? doc.getSubmittedBy().getName() + " (전자결재 최종승인)" : "전자결재 최종승인");
                    manufacturerAuditRepository.save(audit);
                    log.info("[Approval Hook] MFR_AUDIT 결재 승인 연동 완료: 제조사Audit ID {}, 승인완료 기록", sourceId);
                });
            }
        } catch (Exception ex) {
            log.error("[Approval Hook] 사후 연동 처리 중 오류 발생 (문서 ID: {}, 유형: {}): {}", doc.getId(), docTypeCode, ex.getMessage(), ex);
        }
    }

    // ═══════════════════════════════════════════
    // 3. Reject (반려)
    // ═══════════════════════════════════════════

    @Transactional
    public ApprovalDocumentDetailDto reject(Long documentId, ApprovalActionRequestDto dto, String username) {
        if (dto == null || dto.getComment() == null || dto.getComment().trim().isBlank()) {
            throw new IllegalArgumentException("반려 사유(Comment)를 필수로 입력해야 합니다.");
        }

        User approver = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));
        validateNotManufacturer(approver);

        ApprovalDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("결재 문서를 찾을 수 없습니다. ID: " + documentId));

        if (!"PENDING".equalsIgnoreCase(doc.getStatus())) {
            throw new IllegalStateException("진행 중인 결재 문서만 반려할 수 있습니다.");
        }

        List<ApprovalStepInstance> allSteps = stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(documentId);

        int currentActiveOrder = allSteps.stream()
                .filter(s -> !"REFERENCE".equalsIgnoreCase(s.getStepType()) && "PENDING".equalsIgnoreCase(s.getStatus()))
                .mapToInt(ApprovalStepInstance::getStepOrder)
                .min()
                .orElseThrow(() -> new IllegalStateException("대기 중인 결재 단계가 없습니다."));

        ApprovalStepInstance myStep = allSteps.stream()
                .filter(s -> s.getStepOrder() == currentActiveOrder
                        && s.getAssigneeUser().getId().equals(approver.getId())
                        && "PENDING".equalsIgnoreCase(s.getStatus())
                        && !"REFERENCE".equalsIgnoreCase(s.getStepType()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("현재 반려 권한이 없거나 이미 처리된 단계입니다."));

        // 1. 본인 단계 REJECTED
        myStep.setStatus("REJECTED");
        myStep.setComment(dto.getComment().trim());
        myStep.setProcessedAt(LocalDateTime.now());
        if (myStep.getReadAt() == null) {
            myStep.setReadAt(LocalDateTime.now());
        }
        stepInstanceRepository.save(myStep);

        // 2. 다른 모든 미처리 PENDING 단계 SKIPPED 처리
        for (ApprovalStepInstance step : allSteps) {
            if (!step.getId().equals(myStep.getId()) && "PENDING".equalsIgnoreCase(step.getStatus())) {
                step.setStatus("SKIPPED");
                stepInstanceRepository.save(step);
            }
        }

        // 3. 문서 상태 REJECTED
        doc.setStatus("REJECTED");
        doc.setCompletedAt(LocalDateTime.now());
        documentRepository.save(doc);

        // 4. 감사 로그
        historyLogRepository.save(ApprovalHistoryLog.builder()
                .document(doc)
                .actorUser(approver)
                .action("REJECT")
                .detailJson("반려 사유: " + dto.getComment().trim())
                .build());

        // 5. 상신자에게 반려 알림
        notifyUsers("REJECTED", List.of(doc.getSubmittedBy()), doc,
                "결재 반려: " + doc.getTitle(),
                String.format("상신하신 결재 문서 '%s'가 %s님에 의해 반려되었습니다. (사유: %s)",
                        doc.getTitle(), approver.getName(), dto.getComment().trim()));

        return getDocumentDetail(documentId, username);
    }

    // ═══════════════════════════════════════════
    // 4. Recall (회수)
    // ═══════════════════════════════════════════

    @Transactional
    public ApprovalDocumentDetailDto recall(Long documentId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));
        validateNotManufacturer(user);

        ApprovalDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("결재 문서를 찾을 수 없습니다. ID: " + documentId));

        if (!doc.getSubmittedBy().getId().equals(user.getId())) {
            throw new IllegalStateException("본인이 상신한 결재 문서만 회수할 수 있습니다.");
        }

        if (!"PENDING".equalsIgnoreCase(doc.getStatus())) {
            throw new IllegalStateException("진행 중인 결재 문서만 회수할 수 있습니다.");
        }

        List<ApprovalStepInstance> allSteps = stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(documentId);

        // 결재선 중 한 명이라도 이미 승인/반려했는지 검증
        boolean anyProcessed = allSteps.stream()
                .filter(s -> !"REFERENCE".equalsIgnoreCase(s.getStepType()))
                .anyMatch(s -> "APPROVED".equalsIgnoreCase(s.getStatus()) || "REJECTED".equalsIgnoreCase(s.getStatus()));

        if (anyProcessed) {
            throw new IllegalStateException("이미 결재가 진행(승인/반려)된 문서는 회수할 수 없습니다.");
        }

        // 모든 미처리 단계 SKIPPED 처리
        for (ApprovalStepInstance step : allSteps) {
            if ("PENDING".equalsIgnoreCase(step.getStatus())) {
                step.setStatus("SKIPPED");
                stepInstanceRepository.save(step);
            }
        }

        doc.setStatus("RECALLED");
        doc.setCompletedAt(LocalDateTime.now());
        documentRepository.save(doc);

        historyLogRepository.save(ApprovalHistoryLog.builder()
                .document(doc)
                .actorUser(user)
                .action("RECALL")
                .detailJson("상신자에 의한 결재 회수")
                .build());

        return getDocumentDetail(documentId, username);
    }

    // ═══════════════════════════════════════════
    // 4-1. Resubmit (수정 후 재상신)
    // ═══════════════════════════════════════════

    @Transactional
    public ApprovalDocumentDetailDto resubmit(Long documentId, ApprovalSubmitRequestDto dto, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));
        validateNotManufacturer(user);

        ApprovalDocument doc = documentRepository.findDetailById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("결재 문서를 찾을 수 없습니다. ID: " + documentId));

        if (!doc.getSubmittedBy().getId().equals(user.getId())) {
            throw new IllegalStateException("본인이 상신한 결재 문서만 재상신할 수 있습니다.");
        }

        if (!"RECALLED".equalsIgnoreCase(doc.getStatus()) && !"REJECTED".equalsIgnoreCase(doc.getStatus())) {
            throw new IllegalStateException("회수 또는 반려된 문서만 재상신할 수 있습니다. 현재 상태: " + doc.getStatus());
        }

        if (dto.getTitle() != null && !dto.getTitle().isBlank()) {
            doc.setTitle(dto.getTitle());
        }
        if (dto.getContent() != null) {
            doc.setContent(dto.getContent());
        }
        if (dto.getRetentionPeriod() != null) {
            doc.setRetentionPeriod(dto.getRetentionPeriod());
        }
        if (dto.getSourceRecordId() != null) {
            doc.setSourceRecordId(dto.getSourceRecordId());
        }
        doc.setStatus("PENDING");
        doc.setSubmittedAt(LocalDateTime.now());
        doc.setCompletedAt(null);

        // 기존 결재 단계 초기화 및 신규 단계 등록 (orphanRemoval 자동 처리)
        if (doc.getStepInstances() != null) {
            doc.getStepInstances().clear();
        } else {
            doc.setStepInstances(new ArrayList<>());
        }

        // 신규 결재선 생성 및 컬렉션에 추가
        ApprovalTemplate template = doc.getTemplate();
        List<ApprovalStepInstance> newInstances = createStepInstances(doc, template, dto, user);
        for (ApprovalStepInstance step : newInstances) {
            step.setDocument(doc);
            doc.getStepInstances().add(step);
        }
        documentRepository.save(doc);

        // 감사 로그 기록
        historyLogRepository.save(ApprovalHistoryLog.builder()
                .document(doc)
                .actorUser(user)
                .action("RESUBMIT")
                .detailJson(dto.getComment() != null && !dto.getComment().isBlank() 
                        ? dto.getComment() 
                        : "결재 문서 수정 후 재상신")
                .build());

        // 첫 번째 결재자에게 알림
        int firstStepOrder = newInstances.stream()
                .filter(s -> !"REFERENCE".equalsIgnoreCase(s.getStepType()))
                .mapToInt(ApprovalStepInstance::getStepOrder)
                .min()
                .orElse(1);

        List<User> firstApprovers = newInstances.stream()
                .filter(s -> s.getStepOrder() == firstStepOrder && !"REFERENCE".equalsIgnoreCase(s.getStepType()))
                .map(ApprovalStepInstance::getAssigneeUser)
                .distinct()
                .collect(Collectors.toList());

        notifyUsers("MY_TURN", firstApprovers, doc,
                "결재 요청(재상신): " + doc.getTitle(),
                String.format("%s님이 '%s' 결재를 수정하여 재상신하였습니다. 승인 처리가 필요합니다.", user.getName(), doc.getTitle()));

        // 참조자들에게 알림
        List<User> refUsers = newInstances.stream()
                .filter(s -> "REFERENCE".equalsIgnoreCase(s.getStepType()))
                .map(ApprovalStepInstance::getAssigneeUser)
                .distinct()
                .collect(Collectors.toList());

        notifyUsers("REFERENCE_TAGGED", refUsers, doc,
                "결재 문서 참조(재상신): " + doc.getTitle(),
                String.format("%s님이 재상신한 '%s' 결재 문서에 참조자로 지정되었습니다.", user.getName(), doc.getTitle()));

        return getDocumentDetail(documentId, username);
    }

    // ═══════════════════════════════════════════
    // 5. Ad-hoc 결재자 추가
    // ═══════════════════════════════════════════

    @Transactional
    public ApprovalDocumentDetailDto addAdhocApprover(Long documentId, Long targetUserId, String stepType, String username) {
        User actor = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));
        validateNotManufacturer(actor);

        ApprovalDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("결재 문서를 찾을 수 없습니다. ID: " + documentId));

        if (!"PENDING".equalsIgnoreCase(doc.getStatus())) {
            throw new IllegalStateException("진행 중인 결재 문서에만 결재자를 추가할 수 있습니다.");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("추가할 사용자를 찾을 수 없습니다: " + targetUserId));

        if (!validateSameCompany(actor, targetUser)) {
            throw new IllegalArgumentException("같은 회사 소속 사용자만 결재선에 추가할 수 있습니다.");
        }

        List<ApprovalStepInstance> allSteps = stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(documentId);

        int order;
        if ("REFERENCE".equalsIgnoreCase(stepType)) {
            order = 0;
        } else {
            int maxOrder = allSteps.stream()
                    .filter(s -> !"REFERENCE".equalsIgnoreCase(s.getStepType()))
                    .mapToInt(ApprovalStepInstance::getStepOrder)
                    .max()
                    .orElse(0);
            order = maxOrder + 1;
        }

        ApprovalStepInstance step = ApprovalStepInstance.builder()
                .document(doc)
                .stepOrder(order)
                .stepType(stepType != null ? stepType : "APPROVAL")
                .assigneeUser(targetUser)
                .isAdhoc(true)
                .status("PENDING")
                .build();

        stepInstanceRepository.save(step);

        historyLogRepository.save(ApprovalHistoryLog.builder()
                .document(doc)
                .actorUser(actor)
                .action("ADD_ADHOC")
                .detailJson(String.format("%s(%s) 추가: %s",
                        "REFERENCE".equalsIgnoreCase(stepType) ? "참조자" : "결재자",
                        stepType, targetUser.getName()))
                .build());

        return getDocumentDetail(documentId, username);
    }

    // ═══════════════════════════════════════════
    // 6. 결재함 목록 조회 (Tabs) & 읽음 상태 처리
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<ApprovalDocumentSummaryDto> getInbox(String tab, String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));
        validateNotManufacturer(user);

        Page<ApprovalDocument> pageResult = switch (tab.toUpperCase()) {
            case "PENDING", "INBOX" -> documentRepository.findPendingForAssignee(user.getId(), pageable);
            case "SUBMITTED" -> documentRepository.findBySubmittedByIdOrderByCreatedAtDesc(user.getId(), pageable);
            case "IN_PROGRESS" -> documentRepository.findByStatusOrderByCreatedAtDesc("PENDING", pageable);
            case "COMPLETED", "APPROVED" -> documentRepository.findByStatusOrderByCreatedAtDesc("APPROVED", pageable);
            case "REJECTED" -> documentRepository.findByStatusOrderByCreatedAtDesc("REJECTED", pageable);
            case "REFERENCE" -> documentRepository.findReferencedForUser(user.getId(), pageable);
            case "PROCESSED" -> documentRepository.findProcessedByAssignee(user.getId(), pageable);
            default -> documentRepository.findBySubmittedByIdOrderByCreatedAtDesc(user.getId(), pageable);
        };

        List<Long> docIds = pageResult.getContent().stream().map(ApprovalDocument::getId).collect(Collectors.toList());
        Set<Long> readDocIds = docIds.isEmpty() ? Collections.emptySet()
                : readRepository.findReadDocumentIdsByUserIdAndDocumentIdIn(user.getId(), docIds);

        return pageResult.map(doc -> {
            ApprovalDocumentSummaryDto dto = toSummaryDto(doc);
            dto.setIsRead(readDocIds.contains(doc.getId()));
            return dto;
        });
    }

    @Transactional
    public void markAsRead(Long documentId, String username) {
        if (documentId == null || username == null) return;
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) return;

        if (!readRepository.existsByDocumentIdAndUserId(documentId, user.getId())) {
            try {
                readRepository.save(ApprovalDocumentRead.builder()
                        .documentId(documentId)
                        .userId(user.getId())
                        .build());
            } catch (Exception ignored) {
                // 병렬 요청 시 유니크 제약 예외 무시
            }
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getUnreadCounts(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));
        validateNotManufacturer(user);

        Set<Long> allReadIds = readRepository.findAllReadDocumentIdsByUserId(user.getId());
        PageRequest top200 = PageRequest.of(0, 200);

        long pendingUnread = documentRepository.findPendingForAssignee(user.getId(), top200)
                .getContent().stream().filter(d -> !allReadIds.contains(d.getId())).count();
        long submittedUnread = documentRepository.findBySubmittedByIdOrderByCreatedAtDesc(user.getId(), top200)
                .getContent().stream().filter(d -> !allReadIds.contains(d.getId())).count();
        long inProgressUnread = documentRepository.findByStatusOrderByCreatedAtDesc("PENDING", top200)
                .getContent().stream().filter(d -> !allReadIds.contains(d.getId())).count();
        long completedUnread = documentRepository.findByStatusOrderByCreatedAtDesc("APPROVED", top200)
                .getContent().stream().filter(d -> !allReadIds.contains(d.getId())).count();
        long rejectedUnread = documentRepository.findByStatusOrderByCreatedAtDesc("REJECTED", top200)
                .getContent().stream().filter(d -> !allReadIds.contains(d.getId())).count();
        long referenceUnread = documentRepository.findReferencedForUser(user.getId(), top200)
                .getContent().stream().filter(d -> !allReadIds.contains(d.getId())).count();
        long processedUnread = documentRepository.findProcessedByAssignee(user.getId(), top200)
                .getContent().stream().filter(d -> !allReadIds.contains(d.getId())).count();

        Map<String, Long> counts = new HashMap<>();
        counts.put("PENDING", pendingUnread);
        counts.put("SUBMITTED", submittedUnread);
        counts.put("IN_PROGRESS", inProgressUnread);
        counts.put("COMPLETED", completedUnread);
        counts.put("REJECTED", rejectedUnread);
        counts.put("REFERENCE", referenceUnread);
        counts.put("PROCESSED", processedUnread);
        counts.put("TOTAL", pendingUnread + submittedUnread + inProgressUnread + completedUnread + rejectedUnread + referenceUnread + processedUnread);
        return counts;
    }

    @Transactional
    public ApprovalDocumentDetailDto getDocumentDetail(Long documentId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));
        validateNotManufacturer(user);

        ApprovalDocument doc = documentRepository.findDetailById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("결재 문서를 찾을 수 없습니다. ID: " + documentId));

        List<ApprovalStepInstance> steps = stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(documentId);
        List<ApprovalHistoryLog> history = historyLogRepository.findByDocumentIdOrderByCreatedAtAsc(documentId);

        // IDOR 방어: ADMIN이 아닌 경우, 기안자 또는 결재선(결재/합의/참조) 참여자만 열람 가능
        boolean isAdminUser = user.getRole() != null && user.getRole().contains("ROLE_ADMIN");
        if (!isAdminUser) {
            boolean isSubmitter = doc.getSubmittedBy() != null && doc.getSubmittedBy().getId().equals(user.getId());
            boolean isInApprovalLine = steps.stream().anyMatch(s -> s.getAssigneeUser() != null && s.getAssigneeUser().getId().equals(user.getId()));
            if (!isSubmitter && !isInApprovalLine) {
                throw new AccessDeniedException("해당 결재 문서에 대한 열람 권한이 없습니다.");
            }
        }

        // 1) 본인이 참조자 또는 결재자인 경우 stepInstance 읽음 일시(readAt) 갱신
        steps.stream()
                .filter(s -> s.getAssigneeUser().getId().equals(user.getId()) && s.getReadAt() == null)
                .forEach(s -> {
                    s.setReadAt(LocalDateTime.now());
                    stepInstanceRepository.save(s);
                });

        // 2) 전역 열람 이력(approval_document_reads) 기록
        markAsRead(documentId, username);

        // 현재 액션 가능 여부 판별
        boolean isDocPending = "PENDING".equalsIgnoreCase(doc.getStatus());

        int currentOrder = steps.stream()
                .filter(s -> !"REFERENCE".equalsIgnoreCase(s.getStepType()) && "PENDING".equalsIgnoreCase(s.getStatus()))
                .mapToInt(ApprovalStepInstance::getStepOrder)
                .min()
                .orElse(-1);

        boolean canApprove = isDocPending && steps.stream().anyMatch(s ->
                s.getStepOrder() == currentOrder
                        && s.getAssigneeUser().getId().equals(user.getId())
                        && "PENDING".equalsIgnoreCase(s.getStatus())
                        && !"REFERENCE".equalsIgnoreCase(s.getStepType())
        );

        boolean canReject = canApprove;

        boolean canRecall = isDocPending
                && doc.getSubmittedBy().getId().equals(user.getId())
                && steps.stream().filter(s -> !"REFERENCE".equalsIgnoreCase(s.getStepType()))
                        .noneMatch(s -> "APPROVED".equalsIgnoreCase(s.getStatus()) || "REJECTED".equalsIgnoreCase(s.getStatus()));

        boolean canResubmit = ("RECALLED".equalsIgnoreCase(doc.getStatus()) || "REJECTED".equalsIgnoreCase(doc.getStatus()))
                && doc.getSubmittedBy().getId().equals(user.getId());

        return toDetailDto(doc, steps, history, canApprove, canReject, canRecall, canResubmit);
    }

    // ═══════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════

    private List<ApprovalStepInstance> createStepInstances(ApprovalDocument doc, ApprovalTemplate template,
                                                          ApprovalSubmitRequestDto dto, User submitter) {
        List<ApprovalStepInstance> instances = new ArrayList<>();
        int maxOrder = 0;

        if (template != null && template.getSteps() != null) {
            for (ApprovalTemplateStep tStep : template.getSteps()) {
                if ("REFERENCE".equalsIgnoreCase(tStep.getStepType())) {
                    User refUser = resolveStepAssignee(tStep, submitter);
                    if (refUser != null) {
                        instances.add(ApprovalStepInstance.builder()
                                .document(doc)
                                .stepOrder(0)
                                .stepType("REFERENCE")
                                .assigneeUser(refUser)
                                .isAdhoc(false)
                                .status("PENDING")
                                .build());
                    }
                } else {
                    User approver = resolveStepAssignee(tStep, submitter);
                    if (approver != null) {
                        int order = tStep.getStepOrder() != null ? tStep.getStepOrder() : 1;
                        if (order > maxOrder) maxOrder = order;

                        instances.add(ApprovalStepInstance.builder()
                                .document(doc)
                                .stepOrder(order)
                                .stepType(tStep.getStepType())
                                .assigneeUser(approver)
                                .isAdhoc(false)
                                .status("PENDING")
                                .build());
                    } else if (Boolean.TRUE.equals(tStep.getIsRequired())) {
                        log.warn("필수 결재자 resolve 실패: stepOrder={}, type={}", tStep.getStepOrder(), tStep.getAssigneeType());
                    }
                }
            }
        }

        // Ad-hoc 결재자 추가 (동일 회사 검증 및 제조사 배제)
        if (dto.getAdhocApproverUserIds() != null && !dto.getAdhocApproverUserIds().isEmpty()) {
            int adhocOrder = maxOrder + 1;
            for (Long uid : dto.getAdhocApproverUserIds()) {
                User adhocUser = userRepository.findById(uid).orElse(null);
                if (adhocUser != null && !isManufacturerUser(adhocUser) && validateSameCompany(submitter, adhocUser)) {
                    instances.add(ApprovalStepInstance.builder()
                            .document(doc)
                            .stepOrder(adhocOrder++)
                            .stepType("APPROVAL")
                            .assigneeUser(adhocUser)
                            .isAdhoc(true)
                            .status("PENDING")
                            .build());
                }
            }
            maxOrder = adhocOrder - 1;
        }

        // Ad-hoc 합의자 추가 (동일 회사 검증 및 제조사 배제)
        if (dto.getAdhocConsensusUserIds() != null && !dto.getAdhocConsensusUserIds().isEmpty()) {
            int consensusOrder = maxOrder + 1;
            for (Long uid : dto.getAdhocConsensusUserIds()) {
                User adhocUser = userRepository.findById(uid).orElse(null);
                if (adhocUser != null && !isManufacturerUser(adhocUser) && validateSameCompany(submitter, adhocUser)) {
                    instances.add(ApprovalStepInstance.builder()
                            .document(doc)
                            .stepOrder(consensusOrder++)
                            .stepType("CONSENSUS")
                            .assigneeUser(adhocUser)
                            .isAdhoc(true)
                            .status("PENDING")
                            .build());
                }
            }
        }

        // Ad-hoc 참조자 추가 (동일 회사 검증 및 제조사 배제)
        if (dto.getAdhocReferenceUserIds() != null && !dto.getAdhocReferenceUserIds().isEmpty()) {
            for (Long uid : dto.getAdhocReferenceUserIds()) {
                User adhocRef = userRepository.findById(uid).orElse(null);
                if (adhocRef != null && !isManufacturerUser(adhocRef) && validateSameCompany(submitter, adhocRef)) {
                    instances.add(ApprovalStepInstance.builder()
                            .document(doc)
                            .stepOrder(0)
                            .stepType("REFERENCE")
                            .assigneeUser(adhocRef)
                            .isAdhoc(true)
                            .status("PENDING")
                            .build());
                }
            }
        }

        // 만약 템플릿 스텝에서 승인자가 resolve되지 않았으나 사용자가 adhoc 결재자를 추가한 경우
        if (instances.stream().noneMatch(s -> !"REFERENCE".equalsIgnoreCase(s.getStepType()))) {
            if (dto.getAdhocApproverUserIds() != null && !dto.getAdhocApproverUserIds().isEmpty()) {
                int adhocOrder = 1;
                for (Long uid : dto.getAdhocApproverUserIds()) {
                    User adhocUser = userRepository.findById(uid).orElse(null);
                    if (adhocUser != null && !isManufacturerUser(adhocUser) && validateSameCompany(submitter, adhocUser)) {
                        instances.add(ApprovalStepInstance.builder()
                                .document(doc)
                                .stepOrder(adhocOrder++)
                                .stepType("APPROVAL")
                                .assigneeUser(adhocUser)
                                .isAdhoc(true)
                                .status("PENDING")
                                .build());
                    }
                }
            }
        }

        if (instances.stream().noneMatch(s -> !"REFERENCE".equalsIgnoreCase(s.getStepType()))) {
            throw new IllegalArgumentException("유효한 결재선이 지정되지 않았습니다. [결재라인 지정]에서 결재자를 선택해 주십시오.");
        }

        return instances;
    }

    private User resolveStepAssignee(ApprovalTemplateStep tStep, User submitter) {
        String assigneeType = tStep.getAssigneeType();

        if ("USER".equalsIgnoreCase(assigneeType) && tStep.getAssigneeUserId() != null) {
            return userRepository.findById(tStep.getAssigneeUserId())
                    .filter(User::isEnabled)
                    .orElse(null);
        }

        if ("SUBMITTER_MANAGER".equalsIgnoreCase(assigneeType) || "ROLE".equalsIgnoreCase(assigneeType)) {
            String roleCode = tStep.getAssigneeRole() != null ? tStep.getAssigneeRole() : "DEPT_HEAD";

            // 1단계: 지정된 부서 ID 또는 상신자 소속 부서명 기반 부서 엔티티 탐색
            Long deptId = tStep.getAssigneeDepartmentId();
            String compName = submitter.getCompanyName() != null ? submitter.getCompanyName().trim() : "";
            String deptName = submitter.getDepartment() != null ? submitter.getDepartment().trim() : "";

            if (deptId == null && !deptName.isEmpty()) {
                deptId = departmentRepository.findByCompanyNameAndName(compName, deptName)
                        .map(Department::getId)
                        .orElseGet(() -> departmentRepository.findAll().stream()
                                .filter(d -> d.getName() != null && (
                                        d.getName().equalsIgnoreCase(deptName)
                                        || d.getName().contains(deptName)
                                        || deptName.contains(d.getName())
                                ))
                                .findFirst()
                                .map(Department::getId)
                                .orElse(null));
            }

            // 2단계: 부서 역할(DEPT_HEAD) 매핑 탐색
            if (deptId != null) {
                User deptRoleUser = departmentRoleRepository.findByDepartmentIdAndRoleCodeAndIsActiveTrue(deptId, roleCode)
                        .map(DepartmentRole::getUser)
                        .filter(u -> u != null && u.isEnabled())
                        .orElse(null);
                if (deptRoleUser != null) {
                    return deptRoleUser;
                }
            }

            // 3단계 Fallback: 동일 부서 내 다른 활성 사용자 탐색 (상신자 본인 제외 우선)
            if (!deptName.isEmpty() && !compName.isEmpty()) {
                User sameDeptUser = userRepository.findAll().stream()
                        .filter(u -> u.isEnabled()
                                && compName.equalsIgnoreCase(u.getCompanyName())
                                && deptName.equalsIgnoreCase(u.getDepartment())
                                && !u.getId().equals(submitter.getId()))
                        .findFirst()
                        .orElse(null);
                if (sameDeptUser != null) {
                    return sameDeptUser;
                }
            }

            // 4단계 Fallback: 동일 회사 내 최고 관리자(ROLE_ADMIN) 탐색
            User fallbackAdmin = userRepository.findAll().stream()
                    .filter(u -> u.isEnabled()
                            && compName.equalsIgnoreCase(u.getCompanyName())
                            && u.getRole() != null && u.getRole().contains("ROLE_ADMIN")
                            && !u.getId().equals(submitter.getId()))
                    .findFirst()
                    .orElseGet(() -> userRepository.findAll().stream()
                            .filter(u -> u.isEnabled() && u.getRole() != null && u.getRole().contains("ROLE_ADMIN"))
                            .findFirst()
                            .orElse(null));

            if (fallbackAdmin != null) {
                log.info("부서장 미지정으로 관리자(id={})로 결재선 Fallback 배정", fallbackAdmin.getId());
                return fallbackAdmin;
            }
        }

        return null;
    }

    private boolean isManufacturerUser(User user) {
        if (user == null) return false;
        return (user.getRole() != null && (user.getRole().contains("ROLE_MANUFACTURER") || user.getRole().contains("MANUFACTURER")))
                || "제조사".equalsIgnoreCase(user.getDepartment())
                || user.getManufacturer() != null;
    }

    private void validateNotManufacturer(User user) {
        if (user == null) {
            throw new AccessDeniedException("인증된 사용자 정보가 필요합니다.");
        }
        if (isManufacturerUser(user)) {
            throw new AccessDeniedException("협력업체(제조사) 계정은 사내 전자결재 시스템에 접근할 수 없습니다.");
        }
    }

    private boolean validateSameCompany(User user1, User user2) {
        String comp1 = user1.getCompanyName() != null ? user1.getCompanyName().trim() : "";
        String comp2 = user2.getCompanyName() != null ? user2.getCompanyName().trim() : "";
        return comp1.equalsIgnoreCase(comp2);
    }

    private void notifyUsers(String eventType, List<User> recipients, ApprovalDocument doc, String title, String message) {
        if (recipients == null || recipients.isEmpty()) return;

        List<NotificationRule> rules = notificationRuleRepository.findByEventTypeAndIsActiveTrue(eventType);
        boolean inAppActive = rules.stream().anyMatch(r -> "IN_APP".equalsIgnoreCase(r.getChannel()));
        boolean emailActive = rules.stream().anyMatch(r -> "EMAIL".equalsIgnoreCase(r.getChannel()));

        String linkUrl = "/approvals?docId=" + doc.getId();

        for (User u : recipients) {
            if (inAppActive && u.getUsername() != null) {
                try {
                    notificationService.createNotification(
                            title, message, "APPROVAL_" + eventType,
                            u.getUsername(), u.getRole(), u.getCompanyName(), linkUrl
                    );
                } catch (Exception e) {
                    log.error("결재 인앱 알림 발송 실패 (user: {}): {}", u.getUsername(), e.getMessage());
                }
            }

            if (emailActive && u.getEmail() != null && !u.getEmail().isBlank()) {
                try {
                    emailService.sendCustomEmail(u.getEmail(), "[QMS 전자결재] " + title,
                            String.format("<html><body><div style='padding:20px; font-family:sans-serif;'>" +
                                    "<h3>%s</h3><p>%s</p>" +
                                    "<p style='margin-top:20px;'><a href='%s' style='background:#003366;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;'>결재 문서 바로가기</a></p>" +
                                    "</div></body></html>", title, message, linkUrl));
                } catch (Exception e) {
                    log.error("결재 이메일 발송 실패 (email: {}): {}", u.getEmail(), e.getMessage());
                }
            }
        }
    }

    private ApprovalDocumentSummaryDto toSummaryDto(ApprovalDocument doc) {
        List<ApprovalStepInstance> steps = doc.getStepInstances() != null ? doc.getStepInstances() : List.of();

        int currentOrder = steps.stream()
                .filter(s -> !"REFERENCE".equalsIgnoreCase(s.getStepType()) && "PENDING".equalsIgnoreCase(s.getStatus()))
                .mapToInt(ApprovalStepInstance::getStepOrder)
                .min()
                .orElse(0);

        List<String> currentAssignees = steps.stream()
                .filter(s -> s.getStepOrder() == currentOrder && "PENDING".equalsIgnoreCase(s.getStatus()))
                .map(s -> s.getAssigneeUser() != null ? s.getAssigneeUser().getName() : "")
                .filter(name -> !name.isBlank())
                .collect(Collectors.toList());

        return ApprovalDocumentSummaryDto.builder()
                .id(doc.getId())
                .docTypeId(doc.getDocType() != null ? doc.getDocType().getId() : null)
                .docTypeCode(doc.getDocType() != null ? doc.getDocType().getCode() : null)
                .docTypeName(doc.getDocType() != null ? doc.getDocType().getName() : null)
                .sourceRecordId(doc.getSourceRecordId())
                .title(doc.getTitle())
                .status(doc.getStatus())
                .submittedById(doc.getSubmittedBy() != null ? doc.getSubmittedBy().getId() : null)
                .submittedByUsername(doc.getSubmittedBy() != null ? doc.getSubmittedBy().getUsername() : null)
                .submittedByName(doc.getSubmittedBy() != null ? doc.getSubmittedBy().getName() : null)
                .submittedByCompanyName(doc.getSubmittedBy() != null ? doc.getSubmittedBy().getCompanyName() : null)
                .submittedAt(doc.getSubmittedAt())
                .completedAt(doc.getCompletedAt())
                .parentDocumentId(doc.getParentDocumentId())
                .createdAt(doc.getCreatedAt())
                .currentStepOrder(currentOrder)
                .currentAssigneeNames(currentAssignees)
                .build();
    }

    private ApprovalDocumentDetailDto toDetailDto(ApprovalDocument doc, List<ApprovalStepInstance> steps,
                                                  List<ApprovalHistoryLog> history,
                                                  boolean canApprove, boolean canReject, boolean canRecall,
                                                  boolean canResubmit) {
        List<ApprovalStepInstanceDto> stepDtos = steps.stream().map(s -> ApprovalStepInstanceDto.builder()
                .id(s.getId())
                .documentId(doc.getId())
                .stepOrder(s.getStepOrder())
                .stepType(s.getStepType())
                .assigneeUserId(s.getAssigneeUser() != null ? s.getAssigneeUser().getId() : null)
                .assigneeUsername(s.getAssigneeUser() != null ? s.getAssigneeUser().getUsername() : null)
                .assigneeUserName(s.getAssigneeUser() != null ? s.getAssigneeUser().getName() : null)
                .assigneeDepartment(s.getAssigneeUser() != null ? s.getAssigneeUser().getDepartment() : null)
                .assigneePosition(s.getAssigneeUser() != null ? s.getAssigneeUser().getPosition() : null)
                .assigneeCompanyName(s.getAssigneeUser() != null ? s.getAssigneeUser().getCompanyName() : null)
                .isAdhoc(s.getIsAdhoc())
                .status(s.getStatus())
                .comment(s.getComment())
                .processedAt(s.getProcessedAt())
                .readAt(s.getReadAt())
                .build()
        ).collect(Collectors.toList());

        List<ApprovalHistoryLogDto> historyDtos = history.stream().map(h -> ApprovalHistoryLogDto.builder()
                .id(h.getId())
                .documentId(doc.getId())
                .actorUserId(h.getActorUser() != null ? h.getActorUser().getId() : null)
                .actorUsername(h.getActorUser() != null ? h.getActorUser().getUsername() : null)
                .actorUserName(h.getActorUser() != null ? h.getActorUser().getName() : null)
                .action(h.getAction())
                .detailJson(h.getDetailJson())
                .createdAt(h.getCreatedAt())
                .build()
        ).collect(Collectors.toList());

        return ApprovalDocumentDetailDto.builder()
                .id(doc.getId())
                .docTypeId(doc.getDocType() != null ? doc.getDocType().getId() : null)
                .docTypeCode(doc.getDocType() != null ? doc.getDocType().getCode() : null)
                .docTypeName(doc.getDocType() != null ? doc.getDocType().getName() : null)
                .sourceRecordId(doc.getSourceRecordId())
                .templateId(doc.getTemplate() != null ? doc.getTemplate().getId() : null)
                .title(doc.getTitle())
                .content(doc.getContent())
                .retentionPeriod(doc.getRetentionPeriod())
                .status(doc.getStatus())
                .submittedById(doc.getSubmittedBy() != null ? doc.getSubmittedBy().getId() : null)
                .submittedByUsername(doc.getSubmittedBy() != null ? doc.getSubmittedBy().getUsername() : null)
                .submittedByName(doc.getSubmittedBy() != null ? doc.getSubmittedBy().getName() : null)
                .submittedByDepartment(doc.getSubmittedBy() != null ? doc.getSubmittedBy().getDepartment() : null)
                .submittedByCompanyName(doc.getSubmittedBy() != null ? doc.getSubmittedBy().getCompanyName() : null)
                .submittedAt(doc.getSubmittedAt())
                .completedAt(doc.getCompletedAt())
                .parentDocumentId(doc.getParentDocumentId())
                .createdAt(doc.getCreatedAt())
                .steps(stepDtos)
                .historyLogs(historyDtos)
                .canApprove(canApprove)
                .canReject(canReject)
                .canRecall(canRecall)
                .canResubmit(canResubmit)
                .build();
    }
}
