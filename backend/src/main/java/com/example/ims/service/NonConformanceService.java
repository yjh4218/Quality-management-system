package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.NcrActionItemRepository;
import com.example.ims.repository.NonConformanceReportRepository;
import com.example.ims.repository.WmsInboundRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ⚠️ 부적합품 관리 및 출하승인 서비스 (NonConformanceService)
 * ISO 13485:2016 §8.3 / ISO 22716:2007 §8.4 / 21 CFR 820.90
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NonConformanceService {

    private final NonConformanceReportRepository ncrRepository;
    private final NcrActionItemRepository actionItemRepository;
    private final WmsInboundRepository wmsInboundRepository;

    private static final List<NcrStatus> BLOCKING_STATUSES = Arrays.asList(
            NcrStatus.SUBMITTED,
            NcrStatus.UNDER_INVESTIGATION,
            NcrStatus.DISPOSITION_PENDING,
            NcrStatus.REWORK_IN_PROGRESS
    );

    /**
     * 6대 핵심 반응형 KPI 집계
     */
    public NcrKpiResponse getKpis() {
        long total = ncrRepository.count();
        long open = ncrRepository.countByStatusIn(Arrays.asList(
                NcrStatus.SUBMITTED,
                NcrStatus.UNDER_INVESTIGATION,
                NcrStatus.DISPOSITION_PENDING
        ));
        long quarantined = ncrRepository.countByQuarantineStatus(QuarantineStatus.QUARANTINED);
        long reworkConcession = ncrRepository.countByDispositionTypeIn(Arrays.asList(
                NcrDispositionType.REWORK,
                NcrDispositionType.CONCESSION
        ));
        long capaLinked = ncrRepository.countByCapaRequiredTrueOrCapaStatus(CapaLinkageStatus.LINKED);
        long closedCount = ncrRepository.countByStatusIn(List.of(NcrStatus.CLOSED));
        double closedRate = total > 0 ? Math.round(((double) closedCount / total * 100.0) * 10.0) / 10.0 : 0.0;

        return NcrKpiResponse.builder()
                .totalNcrCount(total)
                .openNcrCount(open)
                .quarantinedCount(quarantined)
                .reworkConcessionCount(reworkConcession)
                .capaLinkedCount(capaLinked)
                .closedRatePercent(closedRate)
                .build();
    }

    /**
     * NCR 다차원 검색 페이징
     */
    public Page<NonConformanceReportResponse> searchNcrs(
            String keyword,
            NcrOccurrenceStage stage,
            NcrSeverity severity,
            NcrStatus status,
            QuarantineStatus quarantineStatus,
            Pageable pageable
    ) {
        return ncrRepository.searchNcrs(keyword, stage, severity, status, quarantineStatus, pageable)
                .map(NonConformanceReportResponse::from);
    }

    /**
     * 단건 조회 (ID)
     */
    public NonConformanceReportResponse getNcrById(Long id) {
        NonConformanceReport ncr = ncrRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("부적합 보고서를 찾을 수 없습니다. (ID: " + id + ")"));
        return NonConformanceReportResponse.from(ncr);
    }

    /**
     * 단건 조회 (NCR 번호)
     */
    public NonConformanceReportResponse getNcrByNumber(String ncrNumber) {
        NonConformanceReport ncr = ncrRepository.findByNcrNumber(ncrNumber)
                .orElseThrow(() -> new IllegalArgumentException("부적합 보고서를 찾을 수 없습니다. (NCR 번호: " + ncrNumber + ")"));
        return NonConformanceReportResponse.from(ncr);
    }

    /**
     * 신규 NCR 등록
     */
    @Transactional
    public NonConformanceReportResponse createNcr(NcrCreateRequest req, String username) {
        String ncrNumber = req.getNcrNumber();
        if (ncrNumber == null || ncrNumber.isBlank()) {
            ncrNumber = generateNcrNumber();
        } else if (ncrRepository.findByNcrNumber(ncrNumber).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 NCR 번호입니다: " + ncrNumber);
        }

        QuarantineStatus quarantine = req.getQuarantineStatus() != null
                ? req.getQuarantineStatus()
                : QuarantineStatus.QUARANTINED;

        boolean isCritical = req.getSeverity() == NcrSeverity.CRITICAL;
        boolean capaReq = Boolean.TRUE.equals(req.getCapaRequired()) || isCritical;
        CapaLinkageStatus capaStatus = capaReq ? CapaLinkageStatus.REQUIRED : CapaLinkageStatus.NOT_REQUIRED;

        NonConformanceReport ncr = NonConformanceReport.builder()
                .ncrNumber(ncrNumber)
                .title(req.getTitle())
                .stage(req.getStage() != null ? req.getStage() : NcrOccurrenceStage.INCOMING_INSPECTION)
                .severity(req.getSeverity() != null ? req.getSeverity() : NcrSeverity.MAJOR)
                .status(NcrStatus.SUBMITTED)
                .sourceType(req.getSourceType() != null ? req.getSourceType() : "WMS_INBOUND")
                .sourceRecordId(req.getSourceRecordId())
                .itemCode(req.getItemCode())
                .productName(req.getProductName())
                .lotNumber(req.getLotNumber())
                .affectedQuantity(req.getAffectedQuantity() != null ? req.getAffectedQuantity() : BigDecimal.ZERO)
                .unit(req.getUnit() != null ? req.getUnit() : "EA")
                .supplierName(req.getSupplierName())
                .occurredDate(req.getOccurredDate() != null ? req.getOccurredDate() : LocalDate.now())
                .discoveredBy(req.getDiscoveredBy() != null ? req.getDiscoveredBy() : username)
                .defectType(req.getDefectType())
                .defectDescription(req.getDefectDescription())
                .immediateAction(req.getImmediateAction())
                .quarantineStatus(quarantine)
                .quarantineLocation(req.getQuarantineLocation())
                .dispositionType(NcrDispositionType.PENDING)
                .capaRequired(capaReq)
                .capaStatus(capaStatus)
                .capaRationale(req.getCapaRationale())
                .createdBy(username)
                .updatedBy(username)
                .build();

        NonConformanceReport saved = ncrRepository.save(ncr);
        log.info("[NCR] 신규 부적합 보고서 생성 완료: 번호 {}, 품목 {}, 작성자 {}", saved.getNcrNumber(), saved.getItemCode(), username);
        return NonConformanceReportResponse.from(saved);
    }

    /**
     * 입고(WmsInbound) 불합격 건 기반 원클릭 NCR 생성
     */
    @Transactional
    public NonConformanceReportResponse createFromInbound(Long inboundId, String username) {
        WmsInbound inbound = wmsInboundRepository.findById(inboundId)
                .orElseThrow(() -> new IllegalArgumentException("입고 레코드를 찾을 수 없습니다. (ID: " + inboundId + ")"));

        String title = String.format("[입고 검사 부적합] %s (LOT: %s)",
                inbound.getProductName(),
                inbound.getLotNumber() != null ? inbound.getLotNumber() : "미상");

        String defectDesc = String.format("입고 검사 불합격 (상태: %s, 검사결과: %s, 완제품결과: %s, 비고: %s)",
                inbound.getInboundInspectionStatus() != null ? inbound.getInboundInspectionStatus() : "미정",
                inbound.getInboundInspectionResult() != null ? inbound.getInboundInspectionResult() : "판정 중",
                inbound.getFinalInspectionResult() != null ? inbound.getFinalInspectionResult() : "판정 중",
                inbound.getRemark() != null ? inbound.getRemark() : "없음");

        NcrCreateRequest req = NcrCreateRequest.builder()
                .title(title)
                .stage(NcrOccurrenceStage.INCOMING_INSPECTION)
                .severity(NcrSeverity.MAJOR)
                .sourceType("WMS_INBOUND")
                .sourceRecordId(inbound.getId())
                .itemCode(inbound.getItemCode())
                .productName(inbound.getProductName())
                .lotNumber(inbound.getLotNumber())
                .affectedQuantity(inbound.getQuantity() != null ? BigDecimal.valueOf(inbound.getQuantity()) : BigDecimal.ZERO)
                .unit("EA")
                .supplierName(inbound.getManufacturer())
                .occurredDate(LocalDate.now())
                .discoveredBy(username)
                .defectType("입고 검사 기준 이탈")
                .defectDescription(defectDesc)
                .immediateAction("입고 보류(HOLD) 등록 및 격리창고 Q-101 입고 표기")
                .quarantineStatus(QuarantineStatus.QUARANTINED)
                .quarantineLocation("원자재 격리창고 Q-101")
                .capaRequired(false)
                .build();

        return createNcr(req, username);
    }

    /**
     * NCR 기본 정보 수정
     */
    @Transactional
    public NonConformanceReportResponse updateNcr(Long id, NcrUpdateRequest req, String username) {
        NonConformanceReport ncr = ncrRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("부적합 보고서를 찾을 수 없습니다. (ID: " + id + ")"));

        if (ncr.getStatus() == NcrStatus.CLOSED || ncr.getStatus() == NcrStatus.VOID) {
            throw new IllegalStateException("종결 또는 무효화된 NCR은 수정할 수 없습니다.");
        }

        if (req.getTitle() != null && !req.getTitle().isBlank()) ncr.setTitle(req.getTitle());
        if (req.getStage() != null) ncr.setStage(req.getStage());
        if (req.getSeverity() != null) ncr.setSeverity(req.getSeverity());
        if (req.getItemCode() != null && !req.getItemCode().isBlank()) ncr.setItemCode(req.getItemCode());
        if (req.getProductName() != null && !req.getProductName().isBlank()) ncr.setProductName(req.getProductName());
        if (req.getLotNumber() != null) ncr.setLotNumber(req.getLotNumber());
        if (req.getAffectedQuantity() != null) ncr.setAffectedQuantity(req.getAffectedQuantity());
        if (req.getUnit() != null) ncr.setUnit(req.getUnit());
        if (req.getSupplierName() != null) ncr.setSupplierName(req.getSupplierName());
        if (req.getOccurredDate() != null) ncr.setOccurredDate(req.getOccurredDate());
        if (req.getDiscoveredBy() != null) ncr.setDiscoveredBy(req.getDiscoveredBy());
        if (req.getDefectType() != null) ncr.setDefectType(req.getDefectType());
        if (req.getDefectDescription() != null && !req.getDefectDescription().isBlank()) ncr.setDefectDescription(req.getDefectDescription());
        if (req.getImmediateAction() != null) ncr.setImmediateAction(req.getImmediateAction());
        if (req.getQuarantineStatus() != null) ncr.setQuarantineStatus(req.getQuarantineStatus());
        if (req.getQuarantineLocation() != null) ncr.setQuarantineLocation(req.getQuarantineLocation());
        if (req.getRootCauseAnalysis() != null) ncr.setRootCauseAnalysis(req.getRootCauseAnalysis());
        if (req.getCapaRequired() != null) {
            ncr.setCapaRequired(req.getCapaRequired());
            if (Boolean.TRUE.equals(req.getCapaRequired()) && ncr.getCapaStatus() == CapaLinkageStatus.NOT_REQUIRED) {
                ncr.setCapaStatus(CapaLinkageStatus.REQUIRED);
            }
        }
        if (req.getCapaRationale() != null) ncr.setCapaRationale(req.getCapaRationale());

        ncr.setUpdatedBy(username);
        return NonConformanceReportResponse.from(ncr);
    }

    /**
     * 원인 조사 내용 제출 (5-Why / 어골도 분석)
     */
    @Transactional
    public NonConformanceReportResponse submitInvestigation(Long id, NcrInvestigationRequest req, String username) {
        NonConformanceReport ncr = ncrRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("부적합 보고서를 찾을 수 없습니다. (ID: " + id + ")"));

        ncr.setRootCauseAnalysis(req.getRootCauseAnalysis());
        if (req.getCapaRequired() != null) {
            ncr.setCapaRequired(req.getCapaRequired());
            ncr.setCapaStatus(Boolean.TRUE.equals(req.getCapaRequired()) ? CapaLinkageStatus.REQUIRED : CapaLinkageStatus.NOT_REQUIRED);
        }
        if (req.getCapaRationale() != null) {
            ncr.setCapaRationale(req.getCapaRationale());
        }

        if (ncr.getStatus() == NcrStatus.SUBMITTED) {
            ncr.setStatus(NcrStatus.DISPOSITION_PENDING);
        }
        ncr.setUpdatedBy(username);

        log.info("[NCR] 원인 조사 제출 완료: 번호 {}, 담당자 {}", ncr.getNcrNumber(), username);
        return NonConformanceReportResponse.from(ncr);
    }

    /**
     * 처리(Disposition) 방안 심의 및 승인 (ISO 13485:2016 §8.3 Concession / Rework 검증)
     */
    @Transactional
    public NonConformanceReportResponse decideDisposition(Long id, NcrDispositionRequest req, String username) {
        NonConformanceReport ncr = ncrRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("부적합 보고서를 찾을 수 없습니다. (ID: " + id + ")"));

        if (req.getDispositionType() == NcrDispositionType.CONCESSION) {
            if (req.getConcessionJustification() == null || req.getConcessionJustification().trim().isEmpty()) {
                throw new IllegalStateException("특채(Concession/양보) 승인 시 품질 및 안전성에 미치는 영향이 없음을 증명하는 타당성 사유가 필수입니다. (ISO 13485:2016 §8.3)");
            }
        }

        if (req.getDispositionType() == NcrDispositionType.REWORK) {
            if (req.getReworkInstructions() == null || req.getReworkInstructions().trim().isEmpty()) {
                throw new IllegalStateException("재작업(Rework) 판정 시 재작업 작업지침 및 재검사 기준이 필수입니다. (21 CFR 820.90)");
            }
        }

        ncr.setDispositionType(req.getDispositionType());
        ncr.setDispositionDetails(req.getDispositionDetails());
        ncr.setDispositionApprovedBy(username);
        ncr.setDispositionApprovedAt(LocalDateTime.now());
        ncr.setReworkInstructions(req.getReworkInstructions());
        ncr.setConcessionJustification(req.getConcessionJustification());

        if (req.getDispositionType() == NcrDispositionType.REWORK) {
            ncr.setStatus(NcrStatus.REWORK_IN_PROGRESS);
        } else {
            ncr.setStatus(NcrStatus.DISPOSITION_APPROVED);
        }

        if (req.getCapaRequired() != null) {
            ncr.setCapaRequired(req.getCapaRequired());
            if (Boolean.TRUE.equals(req.getCapaRequired())) {
                ncr.setCapaStatus(req.getCapaReferenceId() != null && !req.getCapaReferenceId().isBlank()
                        ? CapaLinkageStatus.LINKED
                        : CapaLinkageStatus.REQUIRED);
            } else {
                ncr.setCapaStatus(CapaLinkageStatus.NOT_REQUIRED);
            }
        }

        if (req.getCapaReferenceId() != null && !req.getCapaReferenceId().isBlank()) {
            ncr.setCapaReferenceId(req.getCapaReferenceId());
            ncr.setCapaStatus(CapaLinkageStatus.LINKED);
        }
        if (req.getCapaRationale() != null) {
            ncr.setCapaRationale(req.getCapaRationale());
        }

        ncr.setUpdatedBy(username);
        log.info("[NCR] 처리방안 승인 완료: 번호 {}, 방안 {}, 승인자 {}", ncr.getNcrNumber(), ncr.getDispositionType(), username);
        return NonConformanceReportResponse.from(ncr);
    }

    /**
     * 격리 상태 및 보관 위치 변경
     */
    @Transactional
    public NonConformanceReportResponse updateQuarantine(Long id, NcrQuarantineUpdateRequest req, String username) {
        NonConformanceReport ncr = ncrRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("부적합 보고서를 찾을 수 없습니다. (ID: " + id + ")"));

        ncr.setQuarantineStatus(req.getQuarantineStatus());
        if (req.getQuarantineLocation() != null) {
            ncr.setQuarantineLocation(req.getQuarantineLocation());
        }
        ncr.setUpdatedBy(username);
        return NonConformanceReportResponse.from(ncr);
    }

    /**
     * 최종 NCR 종결 (Closed)
     */
    @Transactional
    public NonConformanceReportResponse closeNcr(Long id, NcrCloseRequest req, String username) {
        NonConformanceReport ncr = ncrRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("부적합 보고서를 찾을 수 없습니다. (ID: " + id + ")"));

        if (ncr.getDispositionType() == NcrDispositionType.PENDING) {
            throw new IllegalStateException("처리 방안(Disposition)이 결정되지 않은 NCR은 종결할 수 없습니다.");
        }

        // 미완료된 조치 과제가 있는지 확인
        if (ncr.getActionItems() != null) {
            boolean hasPendingActions = ncr.getActionItems().stream()
                    .anyMatch(a -> a.getStatus() == NcrActionStatus.PENDING || a.getStatus() == NcrActionStatus.IN_PROGRESS);
            if (hasPendingActions) {
                throw new IllegalStateException("진행 중이거나 대기 중인 조치 과제가 남아 있어 종결할 수 없습니다. 모든 과제를 완료 후 종결하십시오.");
            }
        }

        ncr.setStatus(NcrStatus.CLOSED);
        ncr.setClosedBy(username);
        ncr.setClosedAt(LocalDateTime.now());
        ncr.setClosureRemarks(req.getClosureRemarks());
        if (ncr.getQuarantineStatus() == QuarantineStatus.QUARANTINED) {
            ncr.setQuarantineStatus(QuarantineStatus.RELEASED_FROM_QUARANTINE);
        }
        ncr.setUpdatedBy(username);

        log.info("[NCR] 부적합 보고서 최종 종결: 번호 {}, 종결자 {}", ncr.getNcrNumber(), username);
        return NonConformanceReportResponse.from(ncr);
    }

    /**
     * 출하 승인 게이트 사전 적격성 검증 (Market Release Eligibility Check)
     */
    public ReleaseEligibilityResponse checkReleaseEligibility(String lotNumber, String itemCode, Long inboundId) {
        List<NonConformanceReport> blockingList = new ArrayList<>();

        if (lotNumber != null && !lotNumber.isBlank()) {
            blockingList.addAll(ncrRepository.findByLotNumberAndStatusIn(lotNumber, BLOCKING_STATUSES));
        }

        if (inboundId != null) {
            blockingList.addAll(ncrRepository.findBySourceRecordIdAndStatusIn(inboundId, BLOCKING_STATUSES));
        }

        // 중복 제거
        List<NonConformanceReport> distinctBlocking = blockingList.stream()
                .distinct()
                .collect(Collectors.toList());

        String inspectionResult = "적합";
        if (inboundId != null) {
            var inboundOpt = wmsInboundRepository.findById(inboundId);
            if (inboundOpt.isPresent()) {
                var inbound = inboundOpt.get();
                if ("부적합".equalsIgnoreCase(inbound.getFinalInspectionResult())
                        || "부적합".equalsIgnoreCase(inbound.getInboundInspectionResult())) {
                    inspectionResult = "부적합";
                }
            }
        }

        if (!distinctBlocking.isEmpty()) {
            List<NonConformanceReportResponse> dtos = distinctBlocking.stream()
                    .map(NonConformanceReportResponse::from)
                    .collect(Collectors.toList());
            return ReleaseEligibilityResponse.builder()
                    .eligible(false)
                    .lotNumber(lotNumber)
                    .itemCode(itemCode)
                    .inboundId(inboundId)
                    .inspectionResult(inspectionResult)
                    .releaseStatus("RELEASE_BLOCKED_NCR")
                    .blockingNcrCount(distinctBlocking.size())
                    .blockingNcrs(dtos)
                    .message("미해결 부적합 보고서(" + distinctBlocking.size() + "건)가 존재하여 출하가 차단(HOLD)되었습니다.")
                    .build();
        }

        if ("부적합".equalsIgnoreCase(inspectionResult)) {
            return ReleaseEligibilityResponse.builder()
                    .eligible(false)
                    .lotNumber(lotNumber)
                    .itemCode(itemCode)
                    .inboundId(inboundId)
                    .inspectionResult(inspectionResult)
                    .releaseStatus("RELEASE_BLOCKED_INSPECTION")
                    .blockingNcrCount(0)
                    .message("품질 검사 결과가 부적합으로 판정되어 출하할 수 없습니다.")
                    .build();
        }

        return ReleaseEligibilityResponse.builder()
                .eligible(true)
                .lotNumber(lotNumber)
                .itemCode(itemCode)
                .inboundId(inboundId)
                .inspectionResult(inspectionResult)
                .releaseStatus("RELEASE_PERMITTED")
                .blockingNcrCount(0)
                .message("모든 품질 검사 및 부적합 통제를 통과하여 정상 출하 승인이 가능합니다.")
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // 조치 과제(Action Items) 서브 엔티티 관리
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public NcrActionItemResponse addActionItem(Long ncrId, NcrActionItemRequest req, String username) {
        NonConformanceReport ncr = ncrRepository.findById(ncrId)
                .orElseThrow(() -> new IllegalArgumentException("부적합 보고서를 찾을 수 없습니다. (ID: " + ncrId + ")"));

        int order = req.getItemOrder() != null ? req.getItemOrder() : (ncr.getActionItems().size() + 1);

        NcrActionItem item = NcrActionItem.builder()
                .ncrReport(ncr)
                .itemOrder(order)
                .actionType(req.getActionType() != null ? req.getActionType() : NcrActionType.CORRECTION)
                .description(req.getDescription())
                .assignee(req.getAssignee())
                .dueDate(req.getDueDate())
                .status(NcrActionStatus.PENDING)
                .verificationResult(VerificationResult.PENDING)
                .createdBy(username)
                .updatedBy(username)
                .build();

        ncr.addActionItem(item);
        NcrActionItem saved = actionItemRepository.save(item);
        return NcrActionItemResponse.from(saved);
    }

    @Transactional
    public NcrActionItemResponse completeActionItem(Long actionId, String username) {
        NcrActionItem item = actionItemRepository.findById(actionId)
                .orElseThrow(() -> new IllegalArgumentException("조치 과제를 찾을 수 없습니다. (ID: " + actionId + ")"));

        item.setStatus(NcrActionStatus.COMPLETED);
        item.setCompletedAt(LocalDateTime.now());
        item.setUpdatedBy(username);
        return NcrActionItemResponse.from(item);
    }

    @Transactional
    public NcrActionItemResponse verifyActionItem(Long actionId, VerificationResult result, String notes, String username) {
        NcrActionItem item = actionItemRepository.findById(actionId)
                .orElseThrow(() -> new IllegalArgumentException("조치 과제를 찾을 수 없습니다. (ID: " + actionId + ")"));

        item.setVerificationResult(result);
        item.setVerifiedBy(username);
        item.setVerifiedAt(LocalDateTime.now());
        item.setVerificationNotes(notes);
        item.setUpdatedBy(username);
        return NcrActionItemResponse.from(item);
    }

    @Transactional
    public void deleteActionItem(Long actionId, String username) {
        NcrActionItem item = actionItemRepository.findById(actionId)
                .orElseThrow(() -> new IllegalArgumentException("조치 과제를 찾을 수 없습니다. (ID: " + actionId + ")"));
        actionItemRepository.delete(item);
    }

    /**
     * NCR 자동 채번 생성기 (예: NCR-202610-001)
     */
    private String generateNcrNumber() {
        String yearMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        String prefix = "NCR-" + yearMonth + "-";

        return ncrRepository.findTopByNcrNumberStartingWithOrderByNcrNumberDesc(prefix)
                .map(last -> {
                    try {
                        String suffix = last.getNcrNumber().substring(prefix.length());
                        int nextNum = Integer.parseInt(suffix) + 1;
                        return String.format("%s%03d", prefix, nextNum);
                    } catch (Exception e) {
                        return prefix + "001";
                    }
                })
                .orElse(prefix + "001");
    }
}
