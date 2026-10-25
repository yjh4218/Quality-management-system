package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.service.TraceabilityService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class TraceabilityControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private TraceabilityService service;

    @InjectMocks
    private TraceabilityController controller;

    private TraceabilityBatchResponse sampleBatch;
    private TraceabilityKpiResponse sampleKpi;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        sampleBatch = TraceabilityBatchResponse.builder()
                .id(1L)
                .batchNumber("LOT-202610-FP01")
                .batchStage(BatchStage.FINISHED_GOODS)
                .batchStageDesc("완제품")
                .itemCode("PRD-AMP-30")
                .itemName("더파운더스 인텐시브 앰플")
                .quantity(new BigDecimal("2500.000"))
                .unit("EA")
                .qualityStatus(TraceabilityQualityStatus.RELEASED)
                .qualityStatusDesc("출하승인")
                .build();

        sampleKpi = TraceabilityKpiResponse.builder()
                .totalBatches(10L)
                .finishedGoodsBatches(4L)
                .rawMaterialBatches(6L)
                .traceabilityIntegrityRate(new BigDecimal("100.0"))
                .integrationSuccessRate(new BigDecimal("100.0"))
                .pendingReconciliationCount(0L)
                .build();
    }

    @Test
    @DisplayName("GET /api/traceability/kpis - KPI 요약 지표 조회 성공")
    void getTraceabilityKpis() throws Exception {
        when(service.getTraceabilityKpis()).thenReturn(sampleKpi);

        mockMvc.perform(get("/api/traceability/kpis")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalBatches").value(10))
                .andExpect(jsonPath("$.finishedGoodsBatches").value(4));
    }

    @Test
    @DisplayName("GET /api/traceability/batches - 배치 목록 검색 및 페이징 성공")
    void searchBatches() throws Exception {
        when(service.searchBatches(any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(sampleBatch), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/traceability/batches")
                        .param("keyword", "앰플")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].batchNumber").value("LOT-202610-FP01"));
    }

    @Test
    @DisplayName("POST /api/traceability/batches - 신규 배치 등록 성공")
    void createBatch() throws Exception {
        TraceabilityBatchRequest req = TraceabilityBatchRequest.builder()
                .batchStage(BatchStage.FINISHED_GOODS)
                .itemCode("PRD-AMP-30")
                .itemName("더파운더스 인텐시브 앰플")
                .itemCategory(ItemCategory.COSMETICS)
                .quantity(new BigDecimal("2500.000"))
                .unit("EA")
                .build();

        when(service.createBatch(any(), any())).thenReturn(sampleBatch);

        mockMvc.perform(post("/api/traceability/batches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.batchNumber").value("LOT-202610-FP01"));
    }

    @Test
    @DisplayName("GET /api/traceability/matrix - 양방향 추적성 트리 조회 성공")
    void getBidirectionalTraceability() throws Exception {
        TraceabilityMatrixResponse matrix = TraceabilityMatrixResponse.builder()
                .queryBatchNumber("LOT-202610-FP01")
                .queryDirection("BOTH")
                .totalRelatedBatches(3)
                .traceabilityCoverageRate(new BigDecimal("100.0"))
                .build();

        when(service.getBidirectionalTraceability(eq("LOT-202610-FP01"), anyString())).thenReturn(matrix);

        mockMvc.perform(get("/api/traceability/matrix")
                        .param("batchNumber", "LOT-202610-FP01")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.queryBatchNumber").value("LOT-202610-FP01"))
                .andExpect(jsonPath("$.totalRelatedBatches").value(3));
    }

    @Test
    @DisplayName("POST /api/traceability/integrations/{id}/reconcile - 외부 시스템 수기 대사 완료 성공")
    void reconcileLog() throws Exception {
        ExternalIntegrationResponse res = ExternalIntegrationResponse.builder()
                .id(1L)
                .logNumber("INT-202610-001")
                .status(IntegrationStatus.RECONCILED)
                .reconciledBy("김품질")
                .build();

        when(service.reconcileLog(eq(1L), any(), any())).thenReturn(res);

        ReconciliationActionRequest req = ReconciliationActionRequest.builder()
                .reconciliationNotes("재고 불일치 원인 확인 및 대사 승인")
                .build();

        mockMvc.perform(post("/api/traceability/integrations/1/reconcile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RECONCILED"));
    }

    @Test
    @DisplayName("POST /api/traceability/barcodes - 바코드/UDI 라벨 신규 발행 성공")
    void issueBarcode() throws Exception {
        BarcodeRecordResponse res = BarcodeRecordResponse.builder()
                .id(1L)
                .barcodeValue("(01)8809123456789(10)LOT-202610-FP01(17)281015(21)SN123")
                .barcodeType(BarcodeType.DATA_MATRIX)
                .status(BarcodeStatus.ACTIVE)
                .build();

        when(service.issueBarcode(any(), any())).thenReturn(res);

        BarcodeIssueRequest req = BarcodeIssueRequest.builder()
                .batchNumber("LOT-202610-FP01")
                .barcodeType(BarcodeType.DATA_MATRIX)
                .build();

        mockMvc.perform(post("/api/traceability/barcodes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.barcodeValue").value("(01)8809123456789(10)LOT-202610-FP01(17)281015(21)SN123"));
    }
}
