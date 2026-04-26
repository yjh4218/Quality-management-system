package com.example.ims.service;

import com.example.ims.entity.QualityReport;
import com.example.ims.entity.User;
import com.example.ims.entity.WmsInbound;
import com.example.ims.entity.WmsInboundHistory;
import com.example.ims.repository.QualityReportRepository;
import com.example.ims.repository.WmsInboundHistoryRepository;
import com.example.ims.repository.WmsInboundRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.example.ims.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class QualityReportService {

    private final QualityReportRepository qualityReportRepository;
    private final WmsInboundRepository inboundRepository;
    private final WmsInboundHistoryRepository historyRepository;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;
    private final WmsService wmsService;
    private final ExcelExportService excelExportService;
    private final UserRepository userRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Transactional
    public QualityReport submitReport(QualityReport report) {
        // 이 메서드는 기존 호환성을 위해 유지하거나, 필요 시 제거/수정합니다.
        QualityReport savedReport = qualityReportRepository.save(report);
        WmsInbound inbound = inboundRepository.findById(report.getWmsInboundId())
                .orElseThrow(() -> new RuntimeException("Inbound entry not found"));
        
        // 최종 검사 완료로 간주
        inbound.setOverallStatus(WmsInbound.OverallStatus.STEP5_FINAL_COMPLETE);
        inboundRepository.save(inbound);

        return savedReport;
    }

    /**
     * Update an inbound quality report from the grid UI.
     * Restricts editing if the status is already 'Final Complete'.
     * Logs the changes to WmsInboundHistory.
     * 
     * 입고 품질 검사 내역을 그리드 또는 상세 뷰에서 수정합니다.
     * '최종 검사 완료' 상태인 경우 서버단에서 수정을 차단(방어)합니다.
     * 필드를 업데이트한 후, 상태 자동 변환 로직(updateOverallStatus)을 호출하며, 전체 변경 내역을 이력(History) 테이블에 기록합니다.
     * 
     * @param id The ID of the WmsInbound record
     * @param updatedData New data carrying quality info
     * @param modifier The user performing the update
     * @return The updated WmsInbound entity
     */
    @Transactional
    public WmsInbound updateInbound(Long id, WmsInbound updatedData, User modifierUser, boolean isAdmin) {
        String modifier = modifierUser.getName() + " (" + (modifierUser.getCompanyName() != null ? modifierUser.getCompanyName() : "시스템") + ")";
        WmsInbound original = inboundRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("해당 입고 정보를 찾을 수 없습니다."));

        try {
            boolean isManufacturer = modifierUser.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(modifierUser.getDepartment());
            if (isManufacturer) {
                if (!java.util.Objects.equals(modifierUser.getCompanyName(), original.getManufacturer())) {
                    throw new RuntimeException("해당 입고 정보에 대한 수정 권한이 없습니다.");
                }
            }

            // 최종 검사 완료 상태에서는 관리자를 제외하고 더 이상 수정 불가
            if (!isAdmin && WmsInbound.OverallStatus.STEP5_FINAL_COMPLETE.equals(original.getOverallStatus())) {
                throw new RuntimeException("최종 검사 완료 상태에서는 수정할 수 없습니다.");
            }
            
            String oldJson = auditLogService.toCompactJson(original);
            
            // 변경 이력 기록 (필드별 비교)
            compareAndSave(id, modifierUser, "itemCode", original.getItemCode(), updatedData.getItemCode());
            compareAndSave(id, modifierUser, "productName", original.getProductName(), updatedData.getProductName());
            compareAndSave(id, modifierUser, "manufacturer", original.getManufacturer(), updatedData.getManufacturer());
            compareAndSave(id, modifierUser, "quantity", original.getQuantity(), updatedData.getQuantity());
            compareAndSave(id, modifierUser, "inboundDate", original.getInboundDate(), updatedData.getInboundDate());
            compareAndSave(id, modifierUser, "overallStatus", original.getOverallStatus(), updatedData.getOverallStatus());
            compareAndSave(id, modifierUser, "lotNumber", original.getLotNumber(), updatedData.getLotNumber());
            compareAndSave(id, modifierUser, "expirationDate", original.getExpirationDate(), updatedData.getExpirationDate());
            compareAndSave(id, modifierUser, "specificGravity", original.getSpecificGravity(), updatedData.getSpecificGravity());
            compareAndSave(id, modifierUser, "remark", original.getRemark(), updatedData.getRemark());
            compareAndSave(id, modifierUser, "coaFileUrl", original.getCoaFileUrl(), updatedData.getCoaFileUrl());
            compareAndSave(id, modifierUser, "coaFileUrlEng", original.getCoaFileUrlEng(), updatedData.getCoaFileUrlEng());
            compareAndSave(id, modifierUser, "testReportNumbers", original.getTestReportNumbers(), updatedData.getTestReportNumbers());
            compareAndSave(id, modifierUser, "inboundInspectionStatus", original.getInboundInspectionStatus(), updatedData.getInboundInspectionStatus());
            compareAndSave(id, modifierUser, "inboundInspectionResult", original.getInboundInspectionResult(), updatedData.getInboundInspectionResult());
            compareAndSave(id, modifierUser, "controlSampleStatus", original.getControlSampleStatus(), updatedData.getControlSampleStatus());
            compareAndSave(id, modifierUser, "finalInspectionResult", original.getFinalInspectionResult(), updatedData.getFinalInspectionResult());
            compareAndSave(id, modifierUser, "qualityDecisionDate", original.getQualityDecisionDate(), updatedData.getQualityDecisionDate());
            compareAndSave(id, modifierUser, "coaDecisionDate", original.getCoaDecisionDate(), updatedData.getCoaDecisionDate());
            compareAndSave(id, modifierUser, "controlSampleRemarks", original.getControlSampleRemarks(), updatedData.getControlSampleRemarks());
            compareAndSave(id, modifierUser, "finalInspectionRemarks", original.getFinalInspectionRemarks(), updatedData.getFinalInspectionRemarks());
            compareAndSave(id, modifierUser, "mfrRemarks", original.getMfrRemarks(), updatedData.getMfrRemarks());

            // 필드 업데이트
            original.setItemCode(updatedData.getItemCode());
            original.setProductName(updatedData.getProductName());
            original.setManufacturer(updatedData.getManufacturer());
            if (updatedData.getQuantity() != null) original.setQuantity(updatedData.getQuantity());
            if (updatedData.getInboundDate() != null) original.setInboundDate(updatedData.getInboundDate());
            if (updatedData.getOverallStatus() != null) original.setOverallStatus(updatedData.getOverallStatus());
            
            original.setLotNumber(updatedData.getLotNumber());
            original.setExpirationDate(updatedData.getExpirationDate());
            original.setSpecificGravity(updatedData.getSpecificGravity());
            original.setRemark(updatedData.getRemark());
            original.setCoaFileUrl(updatedData.getCoaFileUrl());
            original.setCoaFileUrlEng(updatedData.getCoaFileUrlEng());
            original.setTestReportNumbers(updatedData.getTestReportNumbers());
            
            // 상태 및 결과 필드 업데이트
            original.setInboundInspectionStatus(updatedData.getInboundInspectionStatus());
            original.setInboundInspectionResult(updatedData.getInboundInspectionResult());
            original.setControlSampleStatus(updatedData.getControlSampleStatus());
            original.setFinalInspectionResult(updatedData.getFinalInspectionResult());
            original.setQualityDecisionDate(updatedData.getQualityDecisionDate());
            original.setCoaDecisionDate(updatedData.getCoaDecisionDate());

            original.setControlSampleRemarks(updatedData.getControlSampleRemarks());
            original.setFinalInspectionRemarks(updatedData.getFinalInspectionRemarks());
            original.setMfrRemarks(updatedData.getMfrRemarks());
            
            original.setLastModifiedBy(modifier);

            // 통합 상태 자동 업데이트 로직
            updateOverallStatus(original);

            WmsInbound saved = inboundRepository.save(original);
            
            // 글로벌 감사 로그 추가 (상세 정보 포함)
            eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                    .entityType("INBOUND")
                    .entityId(id)
                    .action("UPDATE")
                    .modifier(modifier)
                    .modifierId(modifierUser.getId())
                    .modifierUsername(modifierUser.getUsername())
                    .modifierName(modifierUser.getName())
                    .modifierCompany(modifierUser.getCompanyName())
                    .description("입고 품질 정보 수정: " + saved.getItemCode())
                    .oldEntity(oldJson)
                    .newEntity(saved)
                    .build());

            return saved;
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("수정 중 오류 발생: " + e.getMessage(), e);
        }
    }

    private void compareAndSave(Long inboundId, User user, String field, Object oldVal, Object newVal) {
        String sOld = (oldVal == null || oldVal.toString().trim().isEmpty()) ? "" : oldVal.toString().trim();
        String sNew = (newVal == null || newVal.toString().trim().isEmpty()) ? "" : newVal.toString().trim();

        if (!sOld.equals(sNew)) {
            String company = user.getCompanyName() != null ? user.getCompanyName() : "시스템";
            String modifierName = user.getName() + " (" + company + ")";
            WmsInboundHistory history = WmsInboundHistory.builder()
                    .wmsInboundId(inboundId)
                    .modifier(modifierName)
                    .modifierId(user.getId())
                    .modifierUsername(user.getUsername())
                    .modifierName(user.getName())
                    .modifierCompany(user.getCompanyName())
                    .fieldName(field)
                    .oldValue(sOld)
                    .newValue(sNew)
                    .changeLog(null) // 개별 필드 기반으로 표시하므로 null 처리
                    .build();
            historyRepository.save(history);
        }
    }

    /**
     * Automatically advance the overall status step based on sub-inspection states.
     * 1. If Inbound Inspection is COMPLETE -> STEP2.
     * 2. If Control Sample is IN PROGRESS -> STEP3.
     * 3. If Control Sample is COMPLETE -> STEP4.
     * 4. If all results are evaluated (not processing) -> STEP5.
     * 
     * 하위 검사 단계의 상태(검사 중, 검사 완료)와 판정 결과(적합, 부적합, 판정 중)를 종합하여
     * 전체 통합 진행 상태(Overall Status)를 자동으로 다음 단계로 승급 처리합니다.
     * 
     * @param inbound The WmsInbound entity to update
     */
    private void updateOverallStatus(WmsInbound inbound) {
        String inboundStatus = inbound.getInboundInspectionStatus();
        String inboundResult = inbound.getInboundInspectionResult();
        String controlStatus = inbound.getControlSampleStatus();
        String finalResult = inbound.getFinalInspectionResult();

        // 1. 입고 검사 완료 기준 (결과가 판정 중이 아니어야 함)
        if ("검사 완료".equals(inboundStatus) && !"판정 중".equals(inboundResult)) {
            inbound.setOverallStatus(WmsInbound.OverallStatus.STEP2_INBOUND_COMPLETE);
        }

        // 2. 관리품 확인 중 기준
        if ("검사 중".equals(controlStatus)) {
            inbound.setOverallStatus(WmsInbound.OverallStatus.STEP3_CONTROL_CHECKING);
        }

        // 3. 관리품 완료 기준 (결과가 판정 중이 아니어야 함)
        if ("검사 완료".equals(controlStatus) && !"판정 중".equals(finalResult)) {
            inbound.setOverallStatus(WmsInbound.OverallStatus.STEP4_CONTROL_COMPLETE);
        }

        // 4. 최종 검사 완료 기준
        // 관리품까지 완료되고 모든 결과가 판정된 경우 최종 완료로 자동 전환 고려 가능
        if ("검사 완료".equals(controlStatus) && !"판정 중".equals(finalResult) && finalResult != null && !finalResult.isEmpty()) {
            // STEP4와 STEP5의 구분을 위해 명시적으로 '최종' 느낌을 주는 로직 (여기서는 관리품 완료와 최종 완료를 일단 업무 흐름에 따라 매핑)
            inbound.setOverallStatus(WmsInbound.OverallStatus.STEP5_FINAL_COMPLETE);
            if (inbound.getQualityDecisionDate() == null || inbound.getQualityDecisionDate().trim().isEmpty()) {
                inbound.setQualityDecisionDate(java.time.LocalDate.now().toString());
            }
        }
    }

    @Transactional
    public void completeInspection(Long id, String modifier) {
        WmsInbound inbound = inboundRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inbound entry not found"));
        
        String oldJson = auditLogService.toCompactJson(inbound);
        inbound.setOverallStatus(WmsInbound.OverallStatus.STEP5_FINAL_COMPLETE);
        inbound.setLastModifiedBy(modifier);
        WmsInbound saved = inboundRepository.save(inbound);

        User user = userRepository.findByUsername(modifier).orElse(null);
        Long modifierId = null;
        String modifierNameOnly = null;
        String modifierCompany = null;
        if (user != null) {
            modifierId = user.getId();
            modifierNameOnly = user.getName();
            modifierCompany = user.getCompanyName();
        }

        // [추가] 글로벌 감사 로그 기록
        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("INBOUND")
                .entityId(id)
                .action("FINAL_DECISION")
                .modifier(inbound.getLastModifiedBy())
                .modifierId(modifierId)
                .modifierUsername(modifier)
                .modifierName(modifierNameOnly)
                .modifierCompany(modifierCompany)
                .description("시장출하 적부 판정 완료 (Step 5)")
                .oldEntity(oldJson)
                .newEntity(saved)
                .build());

        WmsInboundHistory history = WmsInboundHistory.builder()
                .wmsInboundId(id)
                .modifier(inbound.getLastModifiedBy())
                .modifierId(modifierId)
                .modifierUsername(modifier)
                .modifierName(modifierNameOnly)
                .modifierCompany(modifierCompany)
                .fieldName("STATUS")
                .newValue("STEP5_FINAL_COMPLETE")
                .changeLog("최종 검사 완료 처리 (수정 잠금)")
                .build();
        historyRepository.save(history);
    }

    public List<WmsInboundHistory> getInboundHistory(Long inboundId, User user) {
        WmsInbound inbound = inboundRepository.findById(inboundId)
                .orElseThrow(() -> new RuntimeException("Inbound not found"));
        
        boolean isManufacturer = user.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(user.getDepartment());
        if (isManufacturer) {
            if (!java.util.Objects.equals(user.getCompanyName(), inbound.getManufacturer())) {
                throw new RuntimeException("해당 이력에 대한 조회 권한이 없습니다.");
            }
        }
        return historyRepository.findByWmsInboundIdOrderByModifiedAtDesc(inboundId);
    }

    public QualityReport getReportByInboundId(Long inboundId) {
        return qualityReportRepository.findByWmsInboundId(inboundId).orElse(null);
    }

    /**
     * [고도화] 입고 품질 검사 목록을 엑셀 파일로 추출합니다.
     */
    public byte[] exportInbound(String username, String companyName, String startDate, String endDate, String itemCode, String productName, String lotNumber, String manufacturer, String grnNumber) throws java.io.IOException {
        java.time.LocalDateTime start = null;
        java.time.LocalDateTime end = null;
        java.time.ZoneId kst = java.time.ZoneId.of("Asia/Seoul");
        
        if (startDate != null && !startDate.isEmpty()) {
            start = java.time.LocalDate.parse(startDate).atStartOfDay(kst).toLocalDateTime();
        }
        if (endDate != null && !endDate.isEmpty()) {
            end = java.time.LocalDate.parse(endDate).atTime(23, 59, 59, 999999999).atZone(kst).toLocalDateTime();
        }

        List<WmsInbound> data = wmsService.searchInbound(companyName, start, end, itemCode, productName, lotNumber, manufacturer, "", grnNumber);
        
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
                .entityType("QUALITY_INBOUND")
                .entityId(0L)
                .action("EXPORT")
                .modifier(modifierName)
                .modifierId(modifierId)
                .modifierUsername(username)
                .modifierName(modifierNameOnly)
                .modifierCompany(modifierCompany)
                .description("입고 품질 검사 엑셀 다운로드 수행 (내역: " + data.size() + "건)")
                .build());

        String[] headers = {
            "상태", "입고번호", "입고일자", "품목코드", "제품명", "제조사", "수량", "LOT번호",
            "비중", "성적서번호", "성적서판정일", "입고검사단계", "입고검사결과", "관리품확인", "완제품결과", "판정일"
        };
        
        return excelExportService.exportToExcel("입고품질검사", headers, data, i -> new Object[]{
            i.getOverallStatus() != null ? i.getOverallStatus().toString() : "-", 
            i.getGrnNumber(), i.getInboundDate() != null ? i.getInboundDate().toString() : "-",
            i.getItemCode(), i.getProductName(), i.getManufacturer(), i.getQuantity(), i.getLotNumber(), 
            i.getSpecificGravity() != null ? i.getSpecificGravity() : "-", 
            i.getTestReportNumbers(), i.getCoaDecisionDate() != null ? i.getCoaDecisionDate().toString() : "-",
            i.getInboundInspectionStatus(), i.getInboundInspectionResult(), i.getControlSampleStatus(), i.getFinalInspectionResult(),
            i.getQualityDecisionDate() != null ? i.getQualityDecisionDate().toString() : "-"
        });
    }
}
