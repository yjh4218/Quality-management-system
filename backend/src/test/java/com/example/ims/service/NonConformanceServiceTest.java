package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.NcrActionItemRepository;
import com.example.ims.repository.NonConformanceReportRepository;
import com.example.ims.repository.WmsInboundRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NonConformanceServiceTest {

    @Mock
    private NonConformanceReportRepository ncrRepository;

    @Mock
    private NcrActionItemRepository actionItemRepository;

    @Mock
    private WmsInboundRepository wmsInboundRepository;

    @InjectMocks
    private NonConformanceService service;

    private NonConformanceReport sampleNcr;
    private WmsInbound sampleInbound;

    @BeforeEach
    void setUp() {
        sampleNcr = NonConformanceReport.builder()
                .id(1L)
                .ncrNumber("NCR-202610-001")
                .title("원료 비중 이탈 부적합")
                .stage(NcrOccurrenceStage.INCOMING_INSPECTION)
                .severity(NcrSeverity.MAJOR)
                .status(NcrStatus.SUBMITTED)
                .itemCode("RM-KOH-01")
                .productName("포타슘 하이드록사이드 45%액")
                .lotNumber("LOT-KOH-20261001")
                .affectedQuantity(BigDecimal.valueOf(500))
                .unit("KG")
                .occurredDate(LocalDate.now())
                .defectDescription("비중 기준치 초과")
                .quarantineStatus(QuarantineStatus.QUARANTINED)
                .dispositionType(NcrDispositionType.PENDING)
                .capaRequired(false)
                .actionItems(new ArrayList<>())
                .build();

        sampleInbound = WmsInbound.builder()
                .id(100L)
                .itemCode("RM-HA-99")
                .productName("히알루론산 나트륨")
                .lotNumber("LOT-HA-001")
                .quantity(30)
                .manufacturer("(주)한국바이오")
                .inboundInspectionStatus("검사 완료")
                .inboundInspectionResult("부적합")
                .finalInspectionResult("부적합")
                .remark("외관 이물 혼입 의심")
                .build();
    }

    @Test
    @DisplayName("6대 KPI 집계 조회 정상 반환")
    void getKpis_success() {
        when(ncrRepository.count()).thenReturn(10L);
        when(ncrRepository.countByStatusIn(anyList())).thenReturn(4L);
        when(ncrRepository.countByQuarantineStatus(QuarantineStatus.QUARANTINED)).thenReturn(3L);
        when(ncrRepository.countByDispositionTypeIn(anyList())).thenReturn(2L);
        when(ncrRepository.countByCapaRequiredTrueOrCapaStatus(any())).thenReturn(2L);

        NcrKpiResponse kpis = service.getKpis();

        assertThat(kpis.getTotalNcrCount()).isEqualTo(10L);
        assertThat(kpis.getOpenNcrCount()).isEqualTo(4L);
        assertThat(kpis.getQuarantinedCount()).isEqualTo(3L);
        assertThat(kpis.getReworkConcessionCount()).isEqualTo(2L);
        assertThat(kpis.getCapaLinkedCount()).isEqualTo(2L);
    }

    @Test
    @DisplayName("NCR 다차원 페이징 검색 정상 동작")
    void searchNcrs_success() {
        Page<NonConformanceReport> p = new PageImpl<>(List.of(sampleNcr));
        when(ncrRepository.searchNcrs(any(), any(), any(), any(), any(), any(Pageable.class))).thenReturn(p);

        Page<NonConformanceReportResponse> result = service.searchNcrs("비중", null, null, null, null, PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getNcrNumber()).isEqualTo("NCR-202610-001");
    }

    @Test
    @DisplayName("단건 조회 성공 및 미존재 시 예외 발생")
    void getNcrById_successAndNotFound() {
        when(ncrRepository.findById(1L)).thenReturn(Optional.of(sampleNcr));
        when(ncrRepository.findById(999L)).thenReturn(Optional.empty());

        NonConformanceReportResponse found = service.getNcrById(1L);
        assertThat(found.getNcrNumber()).isEqualTo("NCR-202610-001");

        assertThatThrownBy(() -> service.getNcrById(999L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("신규 NCR 등록 - 자동 채번 및 치명(CRITICAL) 시 CAPA 필수 자동 설정 검증")
    void createNcr_criticalForcesCapa() {
        when(ncrRepository.findTopByNcrNumberStartingWithOrderByNcrNumberDesc(anyString())).thenReturn(Optional.empty());
        when(ncrRepository.save(any(NonConformanceReport.class))).thenAnswer(i -> {
            NonConformanceReport n = i.getArgument(0);
            n.setId(10L);
            return n;
        });

        NcrCreateRequest req = NcrCreateRequest.builder()
                .title("멸균 필터 파손 부적합")
                .stage(NcrOccurrenceStage.IN_PROCESS)
                .severity(NcrSeverity.CRITICAL)
                .itemCode("BLK-AMP-30")
                .productName("앰플 벌크")
                .defectDescription("필터 파손으로 인한 균 혼입 우려")
                .occurredDate(LocalDate.now())
                .build();

        NonConformanceReportResponse res = service.createNcr(req, "tester");

        assertThat(res.getNcrNumber()).startsWith("NCR-");
        assertThat(res.getSeverity()).isEqualTo(NcrSeverity.CRITICAL);
        assertThat(res.getCapaRequired()).isTrue();
        assertThat(res.getCapaStatus()).isEqualTo(CapaLinkageStatus.REQUIRED);
        assertThat(res.getQuarantineStatus()).isEqualTo(QuarantineStatus.QUARANTINED);
    }

    @Test
    @DisplayName("입고(WmsInbound) 불합격 레코드로부터 원클릭 NCR 생성 검증")
    void createFromInbound_success() {
        when(wmsInboundRepository.findById(100L)).thenReturn(Optional.of(sampleInbound));
        when(ncrRepository.findTopByNcrNumberStartingWithOrderByNcrNumberDesc(anyString())).thenReturn(Optional.empty());
        when(ncrRepository.save(any(NonConformanceReport.class))).thenAnswer(i -> {
            NonConformanceReport n = i.getArgument(0);
            n.setId(20L);
            return n;
        });

        NonConformanceReportResponse res = service.createFromInbound(100L, "inspector");

        assertThat(res.getSourceType()).isEqualTo("WMS_INBOUND");
        assertThat(res.getSourceRecordId()).isEqualTo(100L);
        assertThat(res.getItemCode()).isEqualTo("RM-HA-99");
        assertThat(res.getQuarantineStatus()).isEqualTo(QuarantineStatus.QUARANTINED);
        assertThat(res.getDefectDescription()).contains("입고 검사 불합격");
    }

    @Test
    @DisplayName("근본 원인 조사(5-Why) 제출 시 상태 전이(DISPOSITION_PENDING) 검증")
    void submitInvestigation_success() {
        when(ncrRepository.findById(1L)).thenReturn(Optional.of(sampleNcr));

        NcrInvestigationRequest req = NcrInvestigationRequest.builder()
                .rootCauseAnalysis("공급사 농축 증발기 온도 센서 오작동으로 인한 과농축")
                .capaRequired(true)
                .capaRationale("원료 로트 전반 영향 평가 필요")
                .build();

        NonConformanceReportResponse res = service.submitInvestigation(1L, req, "investigator");

        assertThat(res.getRootCauseAnalysis()).contains("온도 센서 오작동");
        assertThat(res.getStatus()).isEqualTo(NcrStatus.DISPOSITION_PENDING);
        assertThat(res.getCapaRequired()).isTrue();
    }

    @Test
    @DisplayName("특채(Concession) 판정 시 타당성 근거 누락 시 예외 발생 (ISO 13485:2016 §8.3 준수)")
    void decideDisposition_concessionWithoutJustification_throws() {
        when(ncrRepository.findById(1L)).thenReturn(Optional.of(sampleNcr));

        NcrDispositionRequest req = NcrDispositionRequest.builder()
                .dispositionType(NcrDispositionType.CONCESSION)
                .concessionJustification("") // 누락
                .build();

        assertThatThrownBy(() -> service.decideDisposition(1L, req, "qa_manager"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("특채(Concession/양보) 승인 시");
    }

    @Test
    @DisplayName("재작업(Rework) 판정 시 작업지침서 누락 시 예외 발생 (21 CFR 820.90 준수)")
    void decideDisposition_reworkWithoutInstructions_throws() {
        when(ncrRepository.findById(1L)).thenReturn(Optional.of(sampleNcr));

        NcrDispositionRequest req = NcrDispositionRequest.builder()
                .dispositionType(NcrDispositionType.REWORK)
                .reworkInstructions("   ") // 누락
                .build();

        assertThatThrownBy(() -> service.decideDisposition(1L, req, "qa_manager"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("재작업(Rework) 판정 시");
    }

    @Test
    @DisplayName("특채(Concession) 타당성 근거 입력 시 정상 승인 및 상태 전이 검증")
    void decideDisposition_concessionApproved_success() {
        when(ncrRepository.findById(1L)).thenReturn(Optional.of(sampleNcr));

        NcrDispositionRequest req = NcrDispositionRequest.builder()
                .dispositionType(NcrDispositionType.CONCESSION)
                .concessionJustification("피부 자극성 및 안전성 무영향 입증, 기준 상한 미세 초과이나 완제품 희석 배합 시 규격 충족")
                .dispositionDetails("한도 견본 승인 및 1회 한정 특채 사용 허용")
                .capaRequired(false)
                .build();

        NonConformanceReportResponse res = service.decideDisposition(1L, req, "qa_manager");

        assertThat(res.getDispositionType()).isEqualTo(NcrDispositionType.CONCESSION);
        assertThat(res.getStatus()).isEqualTo(NcrStatus.DISPOSITION_APPROVED);
        assertThat(res.getDispositionApprovedBy()).isEqualTo("qa_manager");
        assertThat(res.getDispositionApprovedAt()).isNotNull();
    }

    @Test
    @DisplayName("격리 상태 및 보관 위치 변경 검증")
    void updateQuarantine_success() {
        when(ncrRepository.findById(1L)).thenReturn(Optional.of(sampleNcr));

        NcrQuarantineUpdateRequest req = NcrQuarantineUpdateRequest.builder()
                .quarantineStatus(QuarantineStatus.TAGGED_HOLD)
                .quarantineLocation("부자재창고 HOLD-02")
                .build();

        NonConformanceReportResponse res = service.updateQuarantine(1L, req, "operator");

        assertThat(res.getQuarantineStatus()).isEqualTo(QuarantineStatus.TAGGED_HOLD);
        assertThat(res.getQuarantineLocation()).isEqualTo("부자재창고 HOLD-02");
    }

    @Test
    @DisplayName("미완료 조치 과제가 남아 있는 경우 종결 차단 검증")
    void closeNcr_withPendingActions_throws() {
        NcrActionItem action = NcrActionItem.builder()
                .id(1L)
                .status(NcrActionStatus.IN_PROGRESS)
                .description("공급사 8D 보고서 수령")
                .build();
        sampleNcr.setDispositionType(NcrDispositionType.RETURN_TO_SUPPLIER);
        sampleNcr.getActionItems().add(action);

        when(ncrRepository.findById(1L)).thenReturn(Optional.of(sampleNcr));

        NcrCloseRequest req = NcrCloseRequest.builder()
                .closureRemarks("모든 조치 완료로 종결 요청")
                .build();

        assertThatThrownBy(() -> service.closeNcr(1L, req, "qa_manager"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("진행 중이거나 대기 중인 조치 과제");
    }

    @Test
    @DisplayName("조치 과제 완료 후 정상 종결 및 격리 자동 해제 검증")
    void closeNcr_success() {
        NcrActionItem action = NcrActionItem.builder()
                .id(1L)
                .status(NcrActionStatus.COMPLETED)
                .description("공급사 8D 보고서 수령 및 환불 처리")
                .build();
        sampleNcr.setDispositionType(NcrDispositionType.RETURN_TO_SUPPLIER);
        sampleNcr.getActionItems().add(action);

        when(ncrRepository.findById(1L)).thenReturn(Optional.of(sampleNcr));

        NcrCloseRequest req = NcrCloseRequest.builder()
                .closureRemarks("공급사 반품 및 대금 정산 완료 확인")
                .build();

        NonConformanceReportResponse res = service.closeNcr(1L, req, "qa_manager");

        assertThat(res.getStatus()).isEqualTo(NcrStatus.CLOSED);
        assertThat(res.getClosedBy()).isEqualTo("qa_manager");
        assertThat(res.getClosedAt()).isNotNull();
        assertThat(res.getQuarantineStatus()).isEqualTo(QuarantineStatus.RELEASED_FROM_QUARANTINE);
    }

    @Test
    @DisplayName("출하 승인 게이트 사전 적격성 검증 - 미해결 NCR 존재 시 차단(HOLD)")
    void checkReleaseEligibility_blockingNcr() {
        when(ncrRepository.findByLotNumberAndStatusIn(eq("LOT-KOH-20261001"), anyCollection()))
                .thenReturn(List.of(sampleNcr));

        ReleaseEligibilityResponse res = service.checkReleaseEligibility("LOT-KOH-20261001", "RM-KOH-01", null);

        assertThat(res.isEligible()).isFalse();
        assertThat(res.getReleaseStatus()).isEqualTo("RELEASE_BLOCKED_NCR");
        assertThat(res.getBlockingNcrCount()).isEqualTo(1);
        assertThat(res.getMessage()).contains("출하가 차단");
    }

    @Test
    @DisplayName("출하 승인 게이트 사전 적격성 검증 - 모든 검사 및 부적합 통제 통과 시 출하 허용")
    void checkReleaseEligibility_permitted() {
        when(ncrRepository.findByLotNumberAndStatusIn(anyString(), anyCollection()))
                .thenReturn(Collections.emptyList());

        ReleaseEligibilityResponse res = service.checkReleaseEligibility("LOT-CLEAN-001", "PRD-AMP-30ML", null);

        assertThat(res.isEligible()).isTrue();
        assertThat(res.getReleaseStatus()).isEqualTo("RELEASE_PERMITTED");
        assertThat(res.getBlockingNcrCount()).isEqualTo(0);
        assertThat(res.getMessage()).contains("출하 승인이 가능합니다");
    }
}
