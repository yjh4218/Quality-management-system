package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.BarcodeRecordRepository;
import com.example.ims.repository.ExternalIntegrationLogRepository;
import com.example.ims.repository.TraceabilityBatchRepository;
import com.example.ims.repository.TraceabilityLinkRepository;
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
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TraceabilityServiceTest {

    @Mock
    private TraceabilityBatchRepository batchRepository;

    @Mock
    private TraceabilityLinkRepository linkRepository;

    @Mock
    private ExternalIntegrationLogRepository integrationLogRepository;

    @Mock
    private BarcodeRecordRepository barcodeRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private TraceabilityService service;

    private TraceabilityBatch rmBatch;
    private TraceabilityBatch fpBatch;
    private TraceabilityLink testLink;

    @BeforeEach
    void setUp() {
        rmBatch = TraceabilityBatch.builder()
                .id(1L)
                .batchNumber("RM-202610-HA01")
                .batchStage(BatchStage.RAW_MATERIAL)
                .itemCode("RM-HA-99")
                .itemName("의료용 히알루론산 나트륨")
                .itemCategory(ItemCategory.MEDICAL_DEVICE)
                .quantity(new BigDecimal("50.000"))
                .remainingQuantity(new BigDecimal("30.000"))
                .unit("kg")
                .qualityStatus(TraceabilityQualityStatus.PASSED)
                .build();

        fpBatch = TraceabilityBatch.builder()
                .id(2L)
                .batchNumber("LOT-202610-FP01")
                .batchStage(BatchStage.FINISHED_GOODS)
                .itemCode("PRD-AMP-30ML")
                .itemName("더파운더스 인텐시브 앰플 30ml")
                .itemCategory(ItemCategory.COSMETICS)
                .quantity(new BigDecimal("2500.000"))
                .remainingQuantity(new BigDecimal("300.000"))
                .unit("EA")
                .qualityStatus(TraceabilityQualityStatus.RELEASED)
                .build();

        testLink = TraceabilityLink.builder()
                .id(10L)
                .parentBatchNumber("RM-202610-HA01")
                .childBatchNumber("LOT-202610-FP01")
                .processStep("충진 및 포장")
                .inputQuantity(new BigDecimal("20.000"))
                .inputUnit("kg")
                .yieldRatio(new BigDecimal("99.20"))
                .linkDate(LocalDate.now())
                .operatorName("김작업")
                .build();
    }

    @Test
    @DisplayName("KPI 집계: 총 배치 수 및 완제품/원료 비율, 연동 성공률 정상 계산")
    void getTraceabilityKpis_success() {
        when(batchRepository.count()).thenReturn(10L);
        when(batchRepository.countByBatchStage(BatchStage.FINISHED_GOODS)).thenReturn(3L);
        when(batchRepository.countByBatchStage(BatchStage.SHIPMENT)).thenReturn(1L);
        when(batchRepository.countByBatchStage(BatchStage.RAW_MATERIAL)).thenReturn(4L);
        when(batchRepository.countByBatchStage(BatchStage.PACKAGING)).thenReturn(2L);
        when(linkRepository.count()).thenReturn(5L);
        when(integrationLogRepository.count()).thenReturn(8L);
        when(integrationLogRepository.countByStatus(IntegrationStatus.SUCCESS)).thenReturn(6L);
        when(integrationLogRepository.countByStatus(IntegrationStatus.RECONCILED)).thenReturn(2L);
        when(integrationLogRepository.countByStatus(IntegrationStatus.PENDING)).thenReturn(0L);

        TraceabilityKpiResponse kpis = service.getTraceabilityKpis();

        assertThat(kpis.getTotalBatches()).isEqualTo(10L);
        assertThat(kpis.getFinishedGoodsBatches()).isEqualTo(4L);
        assertThat(kpis.getRawMaterialBatches()).isEqualTo(6L);
        assertThat(kpis.getIntegrationSuccessRate()).isEqualTo(new BigDecimal("100.0"));
        assertThat(kpis.getPendingReconciliationCount()).isEqualTo(0L);
    }

    @Test
    @DisplayName("배치 검색: 페이징 및 키워드 필터링 정상 동작")
    void searchBatches_success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<TraceabilityBatch> page = new PageImpl<>(List.of(rmBatch, fpBatch), pageable, 2);
        when(batchRepository.searchBatches(any(), any(), any(), eq(pageable))).thenReturn(page);

        Page<TraceabilityBatchResponse> result = service.searchBatches("히알루론산", BatchStage.RAW_MATERIAL, TraceabilityQualityStatus.PASSED, pageable);

        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent().get(0).getBatchNumber()).isEqualTo("RM-202610-HA01");
    }

    @Test
    @DisplayName("배치 신규 등록: 자동 번호 채번 및 저장 완료")
    void createBatch_autoGeneratedNumber() {
        TraceabilityBatchRequest req = TraceabilityBatchRequest.builder()
                .batchStage(BatchStage.RAW_MATERIAL)
                .itemCode("RM-HA-99")
                .itemName("원료 A")
                .quantity(new BigDecimal("100.000"))
                .unit("kg")
                .qualityStatus(TraceabilityQualityStatus.QUARANTINE)
                .build();

        when(batchRepository.count()).thenReturn(5L);
        when(batchRepository.save(any(TraceabilityBatch.class))).thenAnswer(invocation -> {
            TraceabilityBatch b = invocation.getArgument(0);
            b.setId(99L);
            return b;
        });

        TraceabilityBatchResponse res = service.createBatch(req, "testAdmin");

        assertThat(res.getId()).isEqualTo(99L);
        assertThat(res.getBatchNumber()).startsWith("RM-");
        verify(auditLogService).logAction(eq("testAdmin"), eq("CREATE"), anyString(), anyString());
    }

    @Test
    @DisplayName("배치 신규 등록 실패: 이미 존재하는 중복 배치 번호일 경우 예외 발생")
    void createBatch_duplicateNumber_throwsException() {
        TraceabilityBatchRequest req = TraceabilityBatchRequest.builder()
                .batchNumber("RM-202610-HA01")
                .batchStage(BatchStage.RAW_MATERIAL)
                .itemCode("RM-HA-99")
                .itemName("원료 A")
                .quantity(new BigDecimal("100.000"))
                .build();

        when(batchRepository.findByBatchNumber("RM-202610-HA01")).thenReturn(Optional.of(rmBatch));

        assertThatThrownBy(() -> service.createBatch(req, "admin"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("이미 존재하는 배치 번호입니다");
    }

    @Test
    @DisplayName("투입 연결 관계 생성 성공: 부모-자식 매핑 및 감사로그 기록")
    void createLink_success() {
        TraceabilityLinkRequest req = TraceabilityLinkRequest.builder()
                .parentBatchNumber("RM-202610-HA01")
                .childBatchNumber("LOT-202610-FP01")
                .processStep("충진 조제")
                .inputQuantity(new BigDecimal("15.000"))
                .inputUnit("kg")
                .linkDate(LocalDate.now())
                .operatorName("이작업")
                .build();

        when(linkRepository.existsByParentBatchNumberAndChildBatchNumber(anyString(), anyString())).thenReturn(false);
        when(linkRepository.save(any(TraceabilityLink.class))).thenAnswer(invocation -> {
            TraceabilityLink l = invocation.getArgument(0);
            l.setId(101L);
            return l;
        });

        TraceabilityLinkResponse res = service.createLink(req, "admin");

        assertThat(res.getId()).isEqualTo(101L);
        assertThat(res.getParentBatchNumber()).isEqualTo("RM-202610-HA01");
        assertThat(res.getChildBatchNumber()).isEqualTo("LOT-202610-FP01");
    }

    @Test
    @DisplayName("투입 연결 관계 실패: 부모와 자식 번호가 동일할 때 예외")
    void createLink_sameBatch_throwsException() {
        TraceabilityLinkRequest req = TraceabilityLinkRequest.builder()
                .parentBatchNumber("LOT-SAME")
                .childBatchNumber("LOT-SAME")
                .inputQuantity(BigDecimal.TEN)
                .linkDate(LocalDate.now())
                .build();

        assertThatThrownBy(() -> service.createLink(req, "admin"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("동일할 수 없습니다");
    }

    @Test
    @DisplayName("양방향 추적성 탐색: 정방향(Forward) 탐색 시 하위 완제품 트리 탐색 성공")
    void getBidirectionalTraceability_forward() {
        when(batchRepository.findByBatchNumber("RM-202610-HA01")).thenReturn(Optional.of(rmBatch));
        when(batchRepository.findByBatchNumber("LOT-202610-FP01")).thenReturn(Optional.of(fpBatch));
        when(linkRepository.findByParentBatchNumber("RM-202610-HA01")).thenReturn(List.of(testLink));

        TraceabilityMatrixResponse matrix = service.getBidirectionalTraceability("RM-202610-HA01", "FORWARD");

        assertThat(matrix.getQueryBatchNumber()).isEqualTo("RM-202610-HA01");
        assertThat(matrix.getRootNode().getChildren()).hasSize(1);
        assertThat(matrix.getRootNode().getChildren().get(0).getBatchNumber()).isEqualTo("LOT-202610-FP01");
    }

    @Test
    @DisplayName("양방향 추적성 탐색: 역방향(Backward) 탐색 시 투입 원자재 트리 역추적 성공")
    void getBidirectionalTraceability_backward() {
        when(batchRepository.findByBatchNumber("LOT-202610-FP01")).thenReturn(Optional.of(fpBatch));
        when(batchRepository.findByBatchNumber("RM-202610-HA01")).thenReturn(Optional.of(rmBatch));
        when(linkRepository.findByChildBatchNumber("LOT-202610-FP01")).thenReturn(List.of(testLink));

        TraceabilityMatrixResponse matrix = service.getBidirectionalTraceability("LOT-202610-FP01", "BACKWARD");

        assertThat(matrix.getQueryBatchNumber()).isEqualTo("LOT-202610-FP01");
        assertThat(matrix.getRootNode().getChildren()).hasSize(1);
        assertThat(matrix.getRootNode().getChildren().get(0).getBatchNumber()).isEqualTo("RM-202610-HA01");
    }

    @Test
    @DisplayName("외부 연계 로그 생성: 차이(Discrepancy)가 있을 시 PENDING 상태 설정")
    void createIntegrationLog_withDiscrepancy_pendingStatus() {
        ExternalIntegrationRequest req = ExternalIntegrationRequest.builder()
                .systemType(IntegrationSystemType.ERP)
                .interfaceType(InterfaceType.INVENTORY_RECONCILIATION)
                .transferProtocol(TransferProtocol.REST_API)
                .targetBatchNumber("LOT-202610-FP01")
                .recordCount(100)
                .discrepancyCount(5)
                .reconciliationNotes("5EA 차이 발생")
                .build();

        when(integrationLogRepository.count()).thenReturn(2L);
        when(integrationLogRepository.save(any(ExternalIntegrationLog.class))).thenAnswer(invocation -> {
            ExternalIntegrationLog l = invocation.getArgument(0);
            l.setId(55L);
            return l;
        });

        ExternalIntegrationResponse res = service.createIntegrationLog(req, "admin");

        assertThat(res.getStatus()).isEqualTo(IntegrationStatus.PENDING);
        assertThat(res.getDiscrepancyCount()).isEqualTo(5);
    }

    @Test
    @DisplayName("수기 대사 처리: 대사 검토의견 반영 및 RECONCILED 상태 전이")
    void reconcileLog_success() {
        ExternalIntegrationLog log = ExternalIntegrationLog.builder()
                .id(1L)
                .logNumber("INT-202610-001")
                .status(IntegrationStatus.PENDING)
                .discrepancyCount(5)
                .build();

        when(integrationLogRepository.findById(1L)).thenReturn(Optional.of(log));
        when(integrationLogRepository.save(any(ExternalIntegrationLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReconciliationActionRequest req = ReconciliationActionRequest.builder()
                .reconciliationNotes("물류 샘플 추출 5EA 확인 완료 및 대사 승인")
                .build();

        ExternalIntegrationResponse res = service.reconcileLog(1L, req, "김품질");

        assertThat(res.getStatus()).isEqualTo(IntegrationStatus.RECONCILED);
        assertThat(res.getDiscrepancyCount()).isEqualTo(0);
        assertThat(res.getReconciledBy()).isEqualTo("김품질");
    }

    @Test
    @DisplayName("바코드 라벨 발행: GS1 UDI 규격 포맷 자동 조립 성공")
    void issueBarcode_gs1Format() {
        when(batchRepository.findByBatchNumber("LOT-202610-FP01")).thenReturn(Optional.of(fpBatch));
        when(barcodeRepository.save(any(BarcodeRecord.class))).thenAnswer(invocation -> {
            BarcodeRecord r = invocation.getArgument(0);
            r.setId(77L);
            return r;
        });

        BarcodeIssueRequest req = BarcodeIssueRequest.builder()
                .batchNumber("LOT-202610-FP01")
                .barcodeType(BarcodeType.DATA_MATRIX)
                .gtin("8809999999999")
                .expirationDateString("281015")
                .serialNumber("SN9999")
                .build();

        BarcodeRecordResponse res = service.issueBarcode(req, "김바코드");

        assertThat(res.getBarcodeValue()).isEqualTo("(01)8809999999999(10)LOT-202610-FP01(17)281015(21)SN9999");
        assertThat(res.getStatus()).isEqualTo(BarcodeStatus.ACTIVE);
    }

    @Test
    @DisplayName("바코드 인쇄 횟수 증가: printCount 증가 및 PRINTED 상태 전환")
    void incrementBarcodePrint_success() {
        BarcodeRecord record = BarcodeRecord.builder()
                .id(1L)
                .barcodeValue("(01)8809123456789")
                .printCount(2)
                .status(BarcodeStatus.ACTIVE)
                .build();

        when(barcodeRepository.findById(1L)).thenReturn(Optional.of(record));
        when(barcodeRepository.save(any(BarcodeRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BarcodeRecordResponse res = service.incrementBarcodePrint(1L, "admin");

        assertThat(res.getPrintCount()).isEqualTo(3);
        assertThat(res.getStatus()).isEqualTo(BarcodeStatus.PRINTED);
    }
}
