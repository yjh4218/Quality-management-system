package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.BarcodeRecordRepository;
import com.example.ims.repository.ExternalIntegrationLogRepository;
import com.example.ims.repository.TraceabilityBatchRepository;
import com.example.ims.repository.TraceabilityLinkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 🌐 외부연계 및 양방향 추적성 관리 서비스 (TraceabilityService)
 * ISO 13485:2016 §7.5.8 / ISO 22716:2007 §8.3 / 21 CFR 820.65 / 820.120
 * DEC-02: ERP/WMS 외부 시스템 연동 Mock 및 수기 대사 지원
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TraceabilityService {

    private final TraceabilityBatchRepository batchRepository;
    private final TraceabilityLinkRepository linkRepository;
    private final ExternalIntegrationLogRepository integrationLogRepository;
    private final BarcodeRecordRepository barcodeRepository;
    private final AuditLogService auditLogService;

    // =========================================================================
    // 0. KPI 지표 요약 집계
    // =========================================================================

    @Transactional(readOnly = true)
    public TraceabilityKpiResponse getTraceabilityKpis() {
        long totalBatches = batchRepository.count();
        long finishedGoodsBatches = batchRepository.countByBatchStage(BatchStage.FINISHED_GOODS)
                + batchRepository.countByBatchStage(BatchStage.SHIPMENT);
        long rawMaterialBatches = batchRepository.countByBatchStage(BatchStage.RAW_MATERIAL)
                + batchRepository.countByBatchStage(BatchStage.PACKAGING);

        // 양방향 추적 무결성: 투입 관계 링크가 존재하는 배치 비율
        long totalLinks = linkRepository.count();
        BigDecimal integrityRate = BigDecimal.ZERO;
        if (totalBatches > 0) {
            BigDecimal rate = BigDecimal.valueOf(Math.min(totalLinks * 2, totalBatches))
                    .divide(BigDecimal.valueOf(totalBatches), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(1, RoundingMode.HALF_UP);
            integrityRate = rate.min(BigDecimal.valueOf(100.0));
        }

        // 외부 연계 성공률 (SUCCESS + RECONCILED) / totalLogs
        long totalLogs = integrationLogRepository.count();
        long successLogs = integrationLogRepository.countByStatus(IntegrationStatus.SUCCESS)
                + integrationLogRepository.countByStatus(IntegrationStatus.RECONCILED);
        BigDecimal successRate = BigDecimal.valueOf(100.0);
        if (totalLogs > 0) {
            successRate = BigDecimal.valueOf(successLogs)
                    .divide(BigDecimal.valueOf(totalLogs), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(1, RoundingMode.HALF_UP);
        }

        long pendingReconciliations = integrationLogRepository.countByStatus(IntegrationStatus.PENDING);

        return TraceabilityKpiResponse.builder()
                .totalBatches(totalBatches)
                .finishedGoodsBatches(finishedGoodsBatches)
                .rawMaterialBatches(rawMaterialBatches)
                .traceabilityIntegrityRate(integrityRate)
                .integrationSuccessRate(successRate)
                .pendingReconciliationCount(pendingReconciliations)
                .build();
    }

    // =========================================================================
    // 1. 배치/LOT 마스터 관리
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<TraceabilityBatchResponse> searchBatches(
            String keyword,
            BatchStage batchStage,
            TraceabilityQualityStatus qualityStatus,
            Pageable pageable) {
        return batchRepository.searchBatches(keyword, batchStage, qualityStatus, pageable)
                .map(TraceabilityBatchResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public TraceabilityBatchResponse getBatchById(Long id) {
        TraceabilityBatch batch = batchRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 배치 정보를 찾을 수 없습니다. ID: " + id));
        return TraceabilityBatchResponse.fromEntity(batch);
    }

    @Transactional(readOnly = true)
    public TraceabilityBatchResponse getBatchByNumber(String batchNumber) {
        TraceabilityBatch batch = batchRepository.findByBatchNumber(batchNumber)
                .orElseThrow(() -> new IllegalArgumentException("해당 배치 번호를 찾을 수 없습니다: " + batchNumber));
        return TraceabilityBatchResponse.fromEntity(batch);
    }

    @Transactional
    public synchronized TraceabilityBatchResponse createBatch(TraceabilityBatchRequest request, String username) {
        String batchNum = request.getBatchNumber();
        if (batchNum == null || batchNum.isBlank()) {
            batchNum = generateBatchNumber(request.getBatchStage());
        } else if (batchRepository.findByBatchNumber(batchNum).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 배치 번호입니다: " + batchNum);
        }

        BigDecimal qty = request.getQuantity() != null ? request.getQuantity() : BigDecimal.ZERO;
        BigDecimal remQty = request.getRemainingQuantity() != null ? request.getRemainingQuantity() : qty;

        TraceabilityBatch batch = TraceabilityBatch.builder()
                .batchNumber(batchNum)
                .batchStage(request.getBatchStage())
                .itemCode(request.getItemCode())
                .itemName(request.getItemName())
                .itemCategory(request.getItemCategory() != null ? request.getItemCategory() : ItemCategory.COSMETICS)
                .specification(request.getSpecification())
                .quantity(qty)
                .remainingQuantity(remQty)
                .unit(request.getUnit() != null ? request.getUnit() : "EA")
                .manufacturingDate(request.getManufacturingDate())
                .expirationDate(request.getExpirationDate())
                .supplierOrManufacturer(request.getSupplierOrManufacturer())
                .manufacturingLine(request.getManufacturingLine())
                .storageLocation(request.getStorageLocation())
                .qualityStatus(request.getQualityStatus() != null ? request.getQualityStatus() : TraceabilityQualityStatus.QUARANTINE)
                .coaNumber(request.getCoaNumber())
                .coaFileUrl(request.getCoaFileUrl())
                .notes(request.getNotes())
                .createdBy(username)
                .updatedBy(username)
                .build();

        TraceabilityBatch saved = batchRepository.save(batch);
        auditLogService.logAction(username, "CREATE", "TRACEABILITY_BATCH: " + saved.getBatchNumber(),
                "배치/LOT 신규 등록: " + saved.getBatchNumber() + " (" + saved.getItemName() + ")");
        return TraceabilityBatchResponse.fromEntity(saved);
    }

    @Transactional
    public TraceabilityBatchResponse updateBatch(Long id, TraceabilityBatchRequest request, String username) {
        TraceabilityBatch batch = batchRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 배치 정보를 찾을 수 없습니다. ID: " + id));

        if (request.getBatchStage() != null) batch.setBatchStage(request.getBatchStage());
        if (request.getItemCode() != null) batch.setItemCode(request.getItemCode());
        if (request.getItemName() != null) batch.setItemName(request.getItemName());
        if (request.getItemCategory() != null) batch.setItemCategory(request.getItemCategory());
        batch.setSpecification(request.getSpecification());
        if (request.getQuantity() != null) batch.setQuantity(request.getQuantity());
        if (request.getRemainingQuantity() != null) batch.setRemainingQuantity(request.getRemainingQuantity());
        if (request.getUnit() != null) batch.setUnit(request.getUnit());
        batch.setManufacturingDate(request.getManufacturingDate());
        batch.setExpirationDate(request.getExpirationDate());
        batch.setSupplierOrManufacturer(request.getSupplierOrManufacturer());
        batch.setManufacturingLine(request.getManufacturingLine());
        batch.setStorageLocation(request.getStorageLocation());
        if (request.getQualityStatus() != null) batch.setQualityStatus(request.getQualityStatus());
        batch.setCoaNumber(request.getCoaNumber());
        batch.setCoaFileUrl(request.getCoaFileUrl());
        batch.setNotes(request.getNotes());
        batch.setUpdatedBy(username);

        TraceabilityBatch saved = batchRepository.save(batch);
        auditLogService.logAction(username, "UPDATE", "TRACEABILITY_BATCH: " + saved.getBatchNumber(),
                "배치/LOT 정보 수정: " + saved.getBatchNumber());
        return TraceabilityBatchResponse.fromEntity(saved);
    }

    @Transactional
    public void deleteBatch(Long id, String username) {
        TraceabilityBatch batch = batchRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 배치 정보를 찾을 수 없습니다. ID: " + id));
        batch.softDelete(username);
        batchRepository.save(batch);
        auditLogService.logAction(username, "DELETE", "TRACEABILITY_BATCH: " + batch.getBatchNumber(),
                "배치/LOT 삭제(Soft Delete): " + batch.getBatchNumber());
    }

    // =========================================================================
    // 2. 투입 연결 관계 관리 (Traceability Links)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<TraceabilityLinkResponse> getLinksForBatch(String batchNumber) {
        List<TraceabilityLink> parents = linkRepository.findByChildBatchNumber(batchNumber);
        List<TraceabilityLink> children = linkRepository.findByParentBatchNumber(batchNumber);

        List<TraceabilityLink> all = new ArrayList<>();
        all.addAll(parents);
        all.addAll(children);

        return all.stream()
                .map(TraceabilityLinkResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public TraceabilityLinkResponse createLink(TraceabilityLinkRequest request, String username) {
        if (request.getParentBatchNumber().equals(request.getChildBatchNumber())) {
            throw new IllegalArgumentException("부모 LOT와 자식 LOT가 동일할 수 없습니다.");
        }

        if (linkRepository.existsByParentBatchNumberAndChildBatchNumber(
                request.getParentBatchNumber(), request.getChildBatchNumber())) {
            throw new IllegalArgumentException("이미 존재하는 투입 연결 관계입니다: "
                    + request.getParentBatchNumber() + " -> " + request.getChildBatchNumber());
        }

        TraceabilityLink link = TraceabilityLink.builder()
                .parentBatchNumber(request.getParentBatchNumber())
                .childBatchNumber(request.getChildBatchNumber())
                .processStep(request.getProcessStep() != null ? request.getProcessStep() : "투입조제")
                .inputQuantity(request.getInputQuantity() != null ? request.getInputQuantity() : BigDecimal.ZERO)
                .inputUnit(request.getInputUnit() != null ? request.getInputUnit() : "EA")
                .yieldRatio(request.getYieldRatio() != null ? request.getYieldRatio() : new BigDecimal("100.00"))
                .linkDate(request.getLinkDate() != null ? request.getLinkDate() : LocalDate.now())
                .operatorName(request.getOperatorName())
                .notes(request.getNotes())
                .createdBy(username)
                .updatedBy(username)
                .build();

        TraceabilityLink saved = linkRepository.save(link);
        auditLogService.logAction(username, "CREATE", "TRACEABILITY_LINK: " + saved.getId(),
                "LOT 투입 매핑 생성: " + saved.getParentBatchNumber() + " -> " + saved.getChildBatchNumber());
        return TraceabilityLinkResponse.fromEntity(saved);
    }

    @Transactional
    public void deleteLink(Long id, String username) {
        TraceabilityLink link = linkRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 투입 관계를 찾을 수 없습니다. ID: " + id));
        link.softDelete(username);
        linkRepository.save(link);
        auditLogService.logAction(username, "DELETE", "TRACEABILITY_LINK: " + id,
                "LOT 투입 매핑 삭제: " + link.getParentBatchNumber() + " -> " + link.getChildBatchNumber());
    }

    // =========================================================================
    // 3. 양방향 추적성 매트릭스 탐색 알고리즘 (Bidirectional Traceability Search)
    // =========================================================================

    @Transactional(readOnly = true)
    public TraceabilityMatrixResponse getBidirectionalTraceability(String batchNumber, String direction) {
        TraceabilityBatch rootBatch = batchRepository.findByBatchNumber(batchNumber)
                .orElseThrow(() -> new IllegalArgumentException("기준 배치를 찾을 수 없습니다: " + batchNumber));

        String effDirection = (direction == null || direction.isBlank()) ? "BOTH" : direction.toUpperCase();

        Set<String> visited = new HashSet<>();
        visited.add(batchNumber);

        TraceabilityMatrixResponse.TraceabilityTreeNode rootNode = mapToTreeNode(rootBatch, null, null, 0);

        if ("FORWARD".equals(effDirection) || "BOTH".equals(effDirection)) {
            // 정방향: root가 부모가 되어 자식들을 재귀 탐색
            exploreForward(rootNode, visited, 1);
        }

        if ("BACKWARD".equals(effDirection) || "BOTH".equals(effDirection)) {
            // 역방향: root가 자식이 되어 부모(투입원자재)들을 재귀 탐색
            exploreBackward(rootNode, visited, 1);
        }

        int totalCount = visited.size();
        BigDecimal coverageRate = BigDecimal.valueOf(100.0);

        return TraceabilityMatrixResponse.builder()
                .queryBatchNumber(batchNumber)
                .queryDirection(effDirection)
                .rootNode(rootNode)
                .totalRelatedBatches(totalCount)
                .traceabilityCoverageRate(coverageRate)
                .generatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                .build();
    }

    private void exploreForward(TraceabilityMatrixResponse.TraceabilityTreeNode currentNode, Set<String> visited, int depth) {
        if (depth > 6) return; // 무한루프 방지 최대 6계층
        List<TraceabilityLink> links = linkRepository.findByParentBatchNumber(currentNode.getBatchNumber());
        for (TraceabilityLink link : links) {
            String childNum = link.getChildBatchNumber();
            Optional<TraceabilityBatch> childOpt = batchRepository.findByBatchNumber(childNum);
            if (childOpt.isPresent()) {
                TraceabilityBatch childBatch = childOpt.get();
                TraceabilityMatrixResponse.TraceabilityTreeNode childNode =
                        mapToTreeNode(childBatch, link.getProcessStep(), link.getInputQuantity(), depth);
                currentNode.getChildren().add(childNode);
                if (visited.add(childNum)) {
                    exploreForward(childNode, visited, depth + 1);
                }
            }
        }
    }

    private void exploreBackward(TraceabilityMatrixResponse.TraceabilityTreeNode currentNode, Set<String> visited, int depth) {
        if (depth > 6) return; // 무한루프 방지
        List<TraceabilityLink> links = linkRepository.findByChildBatchNumber(currentNode.getBatchNumber());
        for (TraceabilityLink link : links) {
            String parentNum = link.getParentBatchNumber();
            Optional<TraceabilityBatch> parentOpt = batchRepository.findByBatchNumber(parentNum);
            if (parentOpt.isPresent()) {
                TraceabilityBatch parentBatch = parentOpt.get();
                TraceabilityMatrixResponse.TraceabilityTreeNode parentNode =
                        mapToTreeNode(parentBatch, link.getProcessStep(), link.getInputQuantity(), depth);
                currentNode.getChildren().add(parentNode);
                if (visited.add(parentNum)) {
                    exploreBackward(parentNode, visited, depth + 1);
                }
            }
        }
    }

    private TraceabilityMatrixResponse.TraceabilityTreeNode mapToTreeNode(
            TraceabilityBatch batch, String step, BigDecimal inQty, int depth) {
        return TraceabilityMatrixResponse.TraceabilityTreeNode.builder()
                .batchNumber(batch.getBatchNumber())
                .batchStage(batch.getBatchStage() != null ? batch.getBatchStage().name() : "")
                .batchStageDesc(batch.getBatchStage() != null ? batch.getBatchStage().getDescription() : "")
                .itemCode(batch.getItemCode())
                .itemName(batch.getItemName())
                .specification(batch.getSpecification())
                .quantity(batch.getQuantity())
                .unit(batch.getUnit())
                .qualityStatus(batch.getQualityStatus() != null ? batch.getQualityStatus().name() : "")
                .qualityStatusDesc(batch.getQualityStatus() != null ? batch.getQualityStatus().getDescription() : "")
                .qualityStatusColor(batch.getQualityStatus() != null ? batch.getQualityStatus().getColor() : "#94a3b8")
                .supplierOrManufacturer(batch.getSupplierOrManufacturer())
                .processStep(step != null ? step : "기준배치")
                .inputQuantity(inQty != null ? inQty : batch.getQuantity())
                .yieldRatio(BigDecimal.valueOf(100.00))
                .depth(depth)
                .children(new ArrayList<>())
                .build();
    }

    // =========================================================================
    // 4. 외부 시스템(ERP/WMS) 연동 및 수기 대사 (DEC-02)
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<ExternalIntegrationResponse> searchIntegrationLogs(
            String keyword,
            IntegrationSystemType systemType,
            IntegrationStatus status,
            Pageable pageable) {
        return integrationLogRepository.searchLogs(keyword, systemType, status, pageable)
                .map(ExternalIntegrationResponse::fromEntity);
    }

    @Transactional
    public ExternalIntegrationResponse createIntegrationLog(ExternalIntegrationRequest request, String username) {
        String logNum = "INT-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-"
                + String.format("%03d", (int) (integrationLogRepository.count() + 1));

        int discrepancy = request.getDiscrepancyCount() != null ? request.getDiscrepancyCount() : 0;
        IntegrationStatus initialStatus = discrepancy > 0 ? IntegrationStatus.PENDING : IntegrationStatus.SUCCESS;

        String responsePayload = "{\"result\": \"ACK\", \"timestamp\": \"" + LocalDateTime.now() + "\", \"records\": "
                + (request.getRecordCount() != null ? request.getRecordCount() : 1) + "}";

        ExternalIntegrationLog log = ExternalIntegrationLog.builder()
                .logNumber(logNum)
                .systemType(request.getSystemType())
                .interfaceType(request.getInterfaceType())
                .transferProtocol(request.getTransferProtocol())
                .status(initialStatus)
                .targetBatchNumber(request.getTargetBatchNumber())
                .requestPayload(request.getRequestPayload())
                .responsePayload(responsePayload)
                .recordCount(request.getRecordCount() != null ? request.getRecordCount() : 1)
                .discrepancyCount(discrepancy)
                .reconciliationNotes(request.getReconciliationNotes())
                .createdBy(username)
                .updatedBy(username)
                .build();

        ExternalIntegrationLog saved = integrationLogRepository.save(log);
        auditLogService.logAction(username, "CREATE", "EXTERNAL_LOG: " + saved.getLogNumber(),
                "외부 연계 인터페이스 실행: " + saved.getSystemType() + " / " + saved.getInterfaceType());
        return ExternalIntegrationResponse.fromEntity(saved);
    }

    @Transactional
    public ExternalIntegrationResponse reconcileLog(Long id, ReconciliationActionRequest request, String username) {
        ExternalIntegrationLog log = integrationLogRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 연계 로그를 찾을 수 없습니다. ID: " + id));

        log.reconcile(username, request.getReconciliationNotes());
        ExternalIntegrationLog saved = integrationLogRepository.save(log);

        auditLogService.logAction(username, "RECONCILE", "EXTERNAL_LOG: " + saved.getLogNumber(),
                "외부 시스템 수기 대사 승인 완료: " + saved.getLogNumber() + " (사유: " + request.getReconciliationNotes() + ")");
        return ExternalIntegrationResponse.fromEntity(saved);
    }

    // =========================================================================
    // 5. GS1 UDI 바코드 및 QR 코드 식별 관리
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<BarcodeRecordResponse> searchBarcodes(
            String keyword,
            BarcodeType barcodeType,
            BarcodeStatus status,
            Pageable pageable) {
        return barcodeRepository.searchBarcodes(keyword, barcodeType, status, pageable)
                .map(BarcodeRecordResponse::fromEntity);
    }

    @Transactional
    public BarcodeRecordResponse issueBarcode(BarcodeIssueRequest request, String username) {
        TraceabilityBatch batch = batchRepository.findByBatchNumber(request.getBatchNumber())
                .orElseThrow(() -> new IllegalArgumentException("해당 배치를 찾을 수 없습니다: " + request.getBatchNumber()));

        String barcodeVal = request.getCustomBarcodeValue();
        String gtin = request.getGtin() != null && !request.getGtin().isBlank() ? request.getGtin() : "8809123456789";
        String expStr = request.getExpirationDateString();
        if (expStr == null || expStr.isBlank()) {
            if (batch.getExpirationDate() != null) {
                expStr = batch.getExpirationDate().format(DateTimeFormatter.ofPattern("yyMMdd"));
            } else {
                expStr = LocalDate.now().plusYears(2).format(DateTimeFormatter.ofPattern("yyMMdd"));
            }
        }
        String sn = request.getSerialNumber() != null && !request.getSerialNumber().isBlank() ?
                request.getSerialNumber() : "SN" + System.currentTimeMillis() % 1000000;

        if (barcodeVal == null || barcodeVal.isBlank()) {
            if (request.getBarcodeType() == BarcodeType.GS1_128 || request.getBarcodeType() == BarcodeType.DATA_MATRIX) {
                // GS1 UDI 표준 포맷: (01)GTIN(10)LOT(17)EXP(21)SN
                barcodeVal = "(01)" + gtin + "(10)" + batch.getBatchNumber() + "(17)" + expStr + "(21)" + sn;
            } else if (request.getBarcodeType() == BarcodeType.QR_CODE) {
                barcodeVal = "QR-" + batch.getBatchNumber() + "-" + sn;
            } else {
                barcodeVal = batch.getBatchNumber() + "-" + sn;
            }
        }

        BarcodeRecord record = BarcodeRecord.builder()
                .barcodeValue(barcodeVal)
                .barcodeType(request.getBarcodeType())
                .batchNumber(batch.getBatchNumber())
                .gtin(gtin)
                .expirationDateString(expStr)
                .serialNumber(sn)
                .printCount(0)
                .status(BarcodeStatus.ACTIVE)
                .issuedBy(username)
                .createdBy(username)
                .updatedBy(username)
                .build();

        BarcodeRecord saved = barcodeRepository.save(record);
        auditLogService.logAction(username, "CREATE", "BARCODE: " + saved.getBarcodeValue(),
                "바코드/UDI 라벨 신규 발행: " + saved.getBarcodeValue() + " (" + saved.getBarcodeType() + ")");
        return BarcodeRecordResponse.fromEntity(saved);
    }

    @Transactional
    public BarcodeRecordResponse incrementBarcodePrint(Long id, String username) {
        BarcodeRecord record = barcodeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 바코드 기록을 찾을 수 없습니다. ID: " + id));
        record.incrementPrintCount();
        record.setUpdatedBy(username);
        BarcodeRecord saved = barcodeRepository.save(record);
        auditLogService.logAction(username, "PRINT", "BARCODE: " + saved.getBarcodeValue(),
                "바코드 라벨 인쇄 (누적: " + saved.getPrintCount() + "회)");
        return BarcodeRecordResponse.fromEntity(saved);
    }

    // =========================================================================
    // 보조 채번 메서드
    // =========================================================================

    private String generateBatchNumber(BatchStage stage) {
        String prefix = switch (stage) {
            case RAW_MATERIAL -> "RM";
            case PACKAGING -> "PK";
            case BULK_PRODUCT -> "BLK";
            case FINISHED_GOODS -> "LOT";
            case SHIPMENT -> "SHP";
        };
        String yyyyMM = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        long count = batchRepository.count() + 1;
        return String.format("%s-%s-%03d", prefix, yyyyMM, count);
    }
}
