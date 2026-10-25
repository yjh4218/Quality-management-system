package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.CapaActionItemRepository;
import com.example.ims.repository.CapaRecordRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CapaService {

    private final CapaRecordRepository capaRepository;
    private final CapaActionItemRepository actionItemRepository;

    /**
     * 6개 핵심 KPI 요약 조회
     */
    @Transactional(readOnly = true)
    public CapaKpiResponse getKpiSummary() {
        CapaRecordRepository.CapaKpiProjection proj = capaRepository.getKpiSummary();
        long total = proj.getTotalCapas();
        long closedEffective = proj.getClosedEffectiveCapas();
        double rate = total > 0 ? Math.round((double) closedEffective / total * 1000.0) / 10.0 : 0.0;

        return CapaKpiResponse.builder()
                .totalCapas(total)
                .inProgressCapas(proj.getInProgressCapas())
                .pendingEffectivenessCapas(proj.getPendingEffectivenessCapas())
                .overdueCapas(proj.getOverdueCapas())
                .criticalOrHighRiskCapas(proj.getCriticalOrHighRiskCapas())
                .closedEffectiveCapas(closedEffective)
                .closureEffectivenessRate(rate)
                .build();
    }

    /**
     * 다차원 검색 및 페이징 목록 조회
     */
    @Transactional(readOnly = true)
    public Page<CapaResponse> searchCapas(
            String keyword,
            CapaSourceType sourceType,
            CapaStatus status,
            CapaCategory category,
            CapaRiskLevel riskLevel,
            String assignedTo,
            Boolean overdueOnly,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable) {

        Specification<CapaRecord> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.trim().isEmpty()) {
                String pattern = "%" + keyword.trim() + "%";
                predicates.add(cb.or(
                        cb.like(root.get("capaNumber"), pattern),
                        cb.like(root.get("title"), pattern),
                        cb.like(root.get("problemDescription"), pattern),
                        cb.like(root.get("sourceNumber"), pattern),
                        cb.like(root.get("productName"), pattern),
                        cb.like(root.get("itemCode"), pattern)
                ));
            }

            if (sourceType != null) {
                predicates.add(cb.equal(root.get("sourceType"), sourceType));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (category != null) {
                predicates.add(cb.equal(root.get("category"), category));
            }

            if (riskLevel != null) {
                predicates.add(cb.equal(root.get("riskLevel"), riskLevel));
            }

            if (assignedTo != null && !assignedTo.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("assignedTo"), assignedTo.trim()));
            }

            if (Boolean.TRUE.equals(overdueOnly)) {
                predicates.add(cb.and(
                        cb.notEqual(root.get("status"), CapaStatus.CLOSED),
                        cb.notEqual(root.get("status"), CapaStatus.VOID),
                        cb.lessThan(root.get("targetCompletionDate"), LocalDate.now())
                ));
            }

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("targetCompletionDate"), startDate));
            }

            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("targetCompletionDate"), endDate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return capaRepository.findAll(spec, pageable).map(CapaResponse::fromEntity);
    }

    /**
     * 상세 조회
     */
    @Transactional(readOnly = true)
    public CapaResponse getCapaById(Long id) {
        CapaRecord record = capaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 CAPA 건입니다. ID: " + id));
        return CapaResponse.fromEntity(record);
    }

    /**
     * 신규 CAPA 발의/등록
     */
    @Transactional
    public CapaResponse createCapa(CapaCreateRequest req, String username) {
        String actor = (username != null && !username.trim().isEmpty()) ? username : "system";
        String capaNum = generateCapaNumber();

        CapaRecord record = CapaRecord.builder()
                .capaNumber(capaNum)
                .title(req.getTitle())
                .sourceType(req.getSourceType())
                .sourceId(req.getSourceId())
                .sourceNumber(req.getSourceNumber())
                .sourceDescription(req.getSourceDescription())
                .category(req.getCategory())
                .riskLevel(req.getRiskLevel())
                .status(CapaStatus.INITIATED)
                .problemDescription(req.getProblemDescription())
                .containmentAction(req.getContainmentAction())
                .containmentDate(req.getContainmentDate())
                .containmentResponsible(req.getContainmentResponsible())
                .itemCode(req.getItemCode())
                .productName(req.getProductName())
                .lotNumber(req.getLotNumber())
                .isLotUnknown(Boolean.TRUE.equals(req.getIsLotUnknown()))
                .assignedTo(req.getAssignedTo())
                .targetCompletionDate(req.getTargetCompletionDate())
                .effectivenessCriteria(req.getEffectivenessCriteria())
                .effectivenessTargetDate(req.getEffectivenessTargetDate())
                .effectivenessResult(EffectivenessResult.NOT_EVALUATED)
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        CapaRecord saved = capaRepository.save(record);
        log.info(">>>> [CAPA-INIT] Created new CAPA: {} by {}", saved.getCapaNumber(), actor);
        return CapaResponse.fromEntity(saved);
    }

    /**
     * 근본원인 분석 (5-Why & Fishbone) 기록
     */
    @Transactional
    public CapaResponse recordRootCause(Long id, CapaRootCauseRequest req, String username) {
        String actor = (username != null && !username.trim().isEmpty()) ? username : "system";
        CapaRecord record = capaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 CAPA 건입니다. ID: " + id));

        if (record.getStatus() == CapaStatus.CLOSED || record.getStatus() == CapaStatus.VOID) {
            throw new IllegalStateException("종결되었거나 무효화된 CAPA는 원인분석을 수정할 수 없습니다.");
        }

        record.setRootCauseAnalysis(req.getRootCauseAnalysis());
        record.setWhy1(req.getWhy1());
        record.setWhy2(req.getWhy2());
        record.setWhy3(req.getWhy3());
        record.setWhy4(req.getWhy4());
        record.setWhy5(req.getWhy5());
        record.setFishboneMan(req.getFishboneMan());
        record.setFishboneMachine(req.getFishboneMachine());
        record.setFishboneMaterial(req.getFishboneMaterial());
        record.setFishboneMethod(req.getFishboneMethod());
        record.setFishboneMeasurement(req.getFishboneMeasurement());
        record.setFishboneEnvironment(req.getFishboneEnvironment());
        record.setUpdatedBy(actor);

        if (record.getStatus() == CapaStatus.INITIATED) {
            record.setStatus(CapaStatus.UNDER_INVESTIGATION);
        }

        return CapaResponse.fromEntity(record);
    }

    /**
     * 조치과제 추가
     */
    @Transactional
    public CapaActionItemResponse addActionItem(Long id, CapaActionItemRequest req, String username) {
        String actor = (username != null && !username.trim().isEmpty()) ? username : "system";
        CapaRecord record = capaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 CAPA 건입니다. ID: " + id));

        if (record.getStatus() == CapaStatus.CLOSED || record.getStatus() == CapaStatus.VOID) {
            throw new IllegalStateException("종결되었거나 무효화된 CAPA에는 조치과제를 추가할 수 없습니다.");
        }

        CapaActionItem item = CapaActionItem.builder()
                .capaRecord(record)
                .actionType(req.getActionType())
                .title(req.getTitle())
                .description(req.getDescription())
                .assignedTo(req.getAssignedTo())
                .targetDate(req.getTargetDate())
                .status("PENDING")
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        record.addActionItem(item);
        if (record.getStatus() == CapaStatus.INITIATED || record.getStatus() == CapaStatus.UNDER_INVESTIGATION) {
            record.setStatus(CapaStatus.ACTION_PLANNING);
        }

        CapaActionItem saved = actionItemRepository.save(item);
        record.setUpdatedBy(actor);
        return CapaActionItemResponse.fromEntity(saved);
    }

    /**
     * 조치과제 수정
     */
    @Transactional
    public CapaActionItemResponse updateActionItem(Long itemId, CapaActionItemRequest req, String username) {
        String actor = (username != null && !username.trim().isEmpty()) ? username : "system";
        CapaActionItem item = actionItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 조치과제입니다. ID: " + itemId));

        item.setActionType(req.getActionType());
        item.setTitle(req.getTitle());
        item.setDescription(req.getDescription());
        item.setAssignedTo(req.getAssignedTo());
        item.setTargetDate(req.getTargetDate());
        if (req.getStatus() != null) {
            item.setStatus(req.getStatus());
            if ("COMPLETED".equalsIgnoreCase(req.getStatus()) && item.getCompletionDate() == null) {
                item.setCompletionDate(req.getCompletionDate() != null ? req.getCompletionDate() : LocalDate.now());
            }
        }
        item.setCompletionNotes(req.getCompletionNotes());
        item.setUpdatedBy(actor);

        // 부모 CAPA 상태 연동 (모든 조치가 등록되어 진행 중일 때 IMPLEMENTATION 전환)
        CapaRecord parent = item.getCapaRecord();
        if (parent != null && parent.getStatus() == CapaStatus.ACTION_PLANNING) {
            parent.setStatus(CapaStatus.IMPLEMENTATION);
            parent.setUpdatedBy(actor);
        }

        return CapaActionItemResponse.fromEntity(item);
    }

    /**
     * 조치과제 완료 검증
     */
    @Transactional
    public CapaActionItemResponse verifyActionItem(Long itemId, String verifiedBy, String notes, String username) {
        String actor = (username != null && !username.trim().isEmpty()) ? username : "system";
        CapaActionItem item = actionItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 조치과제입니다. ID: " + itemId));

        item.setStatus("COMPLETED");
        if (item.getCompletionDate() == null) {
            item.setCompletionDate(LocalDate.now());
        }
        item.setVerifiedBy(verifiedBy != null ? verifiedBy : actor);
        item.setVerifiedAt(LocalDateTime.now());
        item.setVerificationNotes(notes);
        item.setUpdatedBy(actor);

        return CapaActionItemResponse.fromEntity(item);
    }

    /**
     * 조치과제 삭제
     */
    @Transactional
    public void deleteActionItem(Long itemId) {
        CapaActionItem item = actionItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 조치과제입니다. ID: " + itemId));
        actionItemRepository.delete(item);
    }

    /**
     * 효과성 검증 (Effectiveness Review) 수행
     */
    @Transactional
    public CapaResponse evaluateEffectiveness(Long id, CapaEffectivenessRequest req, String username) {
        String actor = (username != null && !username.trim().isEmpty()) ? username : "system";
        CapaRecord record = capaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 CAPA 건입니다. ID: " + id));

        if (record.getStatus() == CapaStatus.CLOSED || record.getStatus() == CapaStatus.VOID) {
            throw new IllegalStateException("이미 종결되었거나 무효화된 CAPA입니다.");
        }

        // 효과성 검증 전 조치과제 완료 여부 확인
        long pendingActions = actionItemRepository.countByCapaRecordIdAndStatusNot(id, "COMPLETED");
        if (pendingActions > 0) {
            log.warn(">>>> [CAPA-EFF-WARN] Action items not fully completed yet ({} pending) for CAPA: {}", pendingActions, record.getCapaNumber());
        }

        record.setEffectivenessResult(req.getEffectivenessResult());
        record.setEffectivenessEvidence(req.getEffectivenessEvidence());
        record.setFollowUpActionRequired(Boolean.TRUE.equals(req.getFollowUpActionRequired()));
        record.setEffectivenessReviewedBy(actor);
        record.setEffectivenessReviewedDate(LocalDate.now());
        record.setStatus(CapaStatus.EFFECTIVENESS_REVIEW);
        record.setUpdatedBy(actor);

        log.info(">>>> [CAPA-EFF] Evaluated effectiveness for {}: Result={}", record.getCapaNumber(), req.getEffectivenessResult());
        return CapaResponse.fromEntity(record);
    }

    /**
     * 공식 최종 종결 (Closure)
     */
    @Transactional
    public CapaResponse closeCapa(Long id, CapaCloseRequest req, String username) {
        String actor = (username != null && !username.trim().isEmpty()) ? username : "system";
        CapaRecord record = capaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 CAPA 건입니다. ID: " + id));

        if (record.getStatus() == CapaStatus.CLOSED) {
            throw new IllegalStateException("이미 최종 종결된 CAPA입니다.");
        }

        // 1. 미완료 조치과제 잔존 가드 (ISO 13485 §8.5.2)
        long pendingActions = actionItemRepository.countByCapaRecordIdAndStatusNot(id, "COMPLETED");
        if (pendingActions > 0) {
            throw new IllegalStateException(String.format("미완료된 조치과제가 %d건 남아 있어 종결할 수 없습니다. 모든 과제를 완료 후 검증하십시오.", pendingActions));
        }

        // 2. 효과성 판정 결과 검증 가드 (21 CFR 820.100(a)(4))
        if (record.getEffectivenessResult() != EffectivenessResult.EFFECTIVE) {
            throw new IllegalStateException("효과성 검증 결과가 '효과적(EFFECTIVE)'으로 판정되지 않은 CAPA는 종결할 수 없습니다. 현재 상태: " 
                    + (record.getEffectivenessResult() != null ? record.getEffectivenessResult().getDescription() : "미평가"));
        }

        record.setStatus(CapaStatus.CLOSED);
        record.setClosureComment(req.getClosureComment());
        record.setClosedBy(actor);
        record.setClosedDate(LocalDate.now());
        record.setActualCompletionDate(LocalDate.now());
        record.setUpdatedBy(actor);

        log.info(">>>> [CAPA-CLOSED] Successfully closed CAPA: {} by {}", record.getCapaNumber(), actor);
        return CapaResponse.fromEntity(record);
    }

    /**
     * CAPA 무효화 처리
     */
    @Transactional
    public CapaResponse voidCapa(Long id, String reason, String username) {
        String actor = (username != null && !username.trim().isEmpty()) ? username : "system";
        CapaRecord record = capaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 CAPA 건입니다. ID: " + id));

        record.setStatus(CapaStatus.VOID);
        record.setClosureComment("[무효화 사유] " + reason);
        record.setClosedBy(actor);
        record.setClosedDate(LocalDate.now());
        record.setUpdatedBy(actor);

        log.info(">>>> [CAPA-VOID] Voided CAPA: {} by {} (Reason: {})", record.getCapaNumber(), actor, reason);
        return CapaResponse.fromEntity(record);
    }

    /**
     * 자동 채번 생성기: CAPA-yyyyMM-001
     */
    private synchronized String generateCapaNumber() {
        String prefix = "CAPA-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        return capaRepository.findTopByCapaNumberStartingWithOrderByCapaNumberDesc(prefix)
                .map(last -> {
                    try {
                        String seqStr = last.getCapaNumber().substring(prefix.length());
                        int seq = Integer.parseInt(seqStr) + 1;
                        return prefix + String.format("%03d", seq);
                    } catch (Exception e) {
                        return prefix + "001";
                    }
                })
                .orElse(prefix + "001");
    }
}
