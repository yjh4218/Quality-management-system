package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.service.NonConformanceService;
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
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class NonConformanceControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private NonConformanceService service;

    @InjectMocks
    private NonConformanceController controller;

    private NonConformanceReportResponse sampleResponse;
    private NcrKpiResponse sampleKpis;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        sampleResponse = NonConformanceReportResponse.builder()
                .id(1L)
                .ncrNumber("NCR-202610-001")
                .title("원료 비중 이탈 부적합")
                .stage(NcrOccurrenceStage.INCOMING_INSPECTION)
                .stageDescription("입고 검사 (원자재/부자재)")
                .severity(NcrSeverity.MAJOR)
                .severityDescription("주요")
                .status(NcrStatus.SUBMITTED)
                .statusDescription("접수 완료 (격리 보관)")
                .itemCode("RM-KOH-01")
                .productName("포타슘 하이드록사이드 45%액")
                .lotNumber("LOT-KOH-20261001")
                .affectedQuantity(BigDecimal.valueOf(500))
                .unit("KG")
                .occurredDate(LocalDate.now())
                .defectDescription("비중 규격 상한 초과")
                .quarantineStatus(QuarantineStatus.QUARANTINED)
                .quarantineStatusDescription("물리적 격리 보관 중")
                .dispositionType(NcrDispositionType.PENDING)
                .actionItems(Collections.emptyList())
                .build();

        sampleKpis = NcrKpiResponse.builder()
                .totalNcrCount(12)
                .openNcrCount(4)
                .quarantinedCount(3)
                .reworkConcessionCount(2)
                .capaLinkedCount(2)
                .closedRatePercent(66.7)
                .build();
    }

    @Test
    @DisplayName("GET /api/ncr/kpis - KPI 요약 지표 정상 조회")
    void getKpis_success() throws Exception {
        when(service.getKpis()).thenReturn(sampleKpis);

        mockMvc.perform(get("/api/ncr/kpis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalNcrCount").value(12))
                .andExpect(jsonPath("$.openNcrCount").value(4))
                .andExpect(jsonPath("$.quarantinedCount").value(3))
                .andExpect(jsonPath("$.closedRatePercent").value(66.7));
    }

    @Test
    @DisplayName("GET /api/ncr - NCR 목록 다차원 검색 페이징 조회")
    void searchNcrs_success() throws Exception {
        when(service.searchNcrs(any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(sampleResponse), PageRequest.of(0, 15), 1));

        mockMvc.perform(get("/api/ncr")
                        .param("keyword", "비중")
                        .param("page", "0")
                        .param("size", "15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].ncrNumber").value("NCR-202610-001"))
                .andExpect(jsonPath("$.content[0].productName").value("포타슘 하이드록사이드 45%액"));
    }

    @Test
    @DisplayName("GET /api/ncr/{id} - 단건 상세 조회")
    void getNcrById_success() throws Exception {
        when(service.getNcrById(1L)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/ncr/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.ncrNumber").value("NCR-202610-001"));
    }

    @Test
    @DisplayName("POST /api/ncr - 신규 NCR 등록")
    void createNcr_success() throws Exception {
        NcrCreateRequest req = NcrCreateRequest.builder()
                .title("원료 비중 이탈 부적합")
                .stage(NcrOccurrenceStage.INCOMING_INSPECTION)
                .severity(NcrSeverity.MAJOR)
                .itemCode("RM-KOH-01")
                .productName("포타슘 하이드록사이드 45%액")
                .defectDescription("비중 규격 상한 초과")
                .occurredDate(LocalDate.now())
                .build();

        when(service.createNcr(any(NcrCreateRequest.class), anyString())).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/ncr")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ncrNumber").value("NCR-202610-001"));
    }

    @Test
    @DisplayName("POST /api/ncr/from-inbound/{inboundId} - 입고 레코드 기반 원클릭 NCR 생성")
    void createFromInbound_success() throws Exception {
        when(service.createFromInbound(eq(100L), anyString())).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/ncr/from-inbound/100"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ncrNumber").value("NCR-202610-001"));
    }

    @Test
    @DisplayName("POST /api/ncr/{id}/disposition - 처리(Disposition) 방안 심의 및 승인")
    void decideDisposition_success() throws Exception {
        NcrDispositionRequest req = NcrDispositionRequest.builder()
                .dispositionType(NcrDispositionType.CONCESSION)
                .concessionJustification("피부 자극성 시험 결과 이상 없음")
                .dispositionDetails("한도 견본 승인 후 1회 특채 출하")
                .build();

        when(service.decideDisposition(eq(1L), any(NcrDispositionRequest.class), anyString()))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/api/ncr/1/disposition")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ncrNumber").value("NCR-202610-001"));
    }

    @Test
    @DisplayName("GET /api/ncr/check-release-eligibility - 출하 승인 게이트 적격성 검증")
    void checkReleaseEligibility_success() throws Exception {
        ReleaseEligibilityResponse elig = ReleaseEligibilityResponse.builder()
                .eligible(true)
                .lotNumber("LOT-CLEAN-001")
                .releaseStatus("RELEASE_PERMITTED")
                .blockingNcrCount(0)
                .message("모든 품질 검사 및 부적합 통제를 통과하여 정상 출하 승인이 가능합니다.")
                .build();

        when(service.checkReleaseEligibility(any(), any(), any())).thenReturn(elig);

        mockMvc.perform(get("/api/ncr/check-release-eligibility")
                        .param("lotNumber", "LOT-CLEAN-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.releaseStatus").value("RELEASE_PERMITTED"));
    }
}
