package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.service.ComplaintSafetyService;
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

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ComplaintSafetyControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private ComplaintSafetyService service;

    @InjectMocks
    private ComplaintSafetyController controller;

    private ComplaintSafetyResponse sampleResponse;
    private ComplaintSafetyKpiResponse sampleKpis;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        sampleResponse = ComplaintSafetyResponse.builder()
                .id(1L)
                .evaluationNumber("SAFE-202610-001")
                .title("수분 크림 접촉피부염")
                .productType(ProductRegulatoryType.COSMETIC)
                .productTypeDescription("화장품")
                .itemCode("COS-CREAM-001")
                .productName("인텐시브 수분 크림")
                .lotNumber("24K05")
                .isLotUnknown(false)
                .adverseEventCategory(AdverseEventCategory.ACUTE_CONTACT_DERMATITIS)
                .causalityGrade(CausalityGrade.PROBABLE)
                .reportabilityStatus(ReportabilityStatus.REPORTED)
                .evaluationStatus(ComplaintEvaluationStatus.SUBMITTED)
                .receiptDate(LocalDate.of(2026, 10, 15))
                .evaluationDate(LocalDate.of(2026, 10, 16))
                .build();

        sampleKpis = ComplaintSafetyKpiResponse.builder()
                .totalEvaluations(10L)
                .seriousCases(3L)
                .reportableCases(2L)
                .underReviewCases(4L)
                .unknownLotCases(2L)
                .capaRequiredCases(3L)
                .build();
    }

    @Test
    @DisplayName("GET /api/complaints/safety/kpis 6개 KPI 정상 응답")
    void getKpis_ReturnsOk() throws Exception {
        when(service.getKpiSummary()).thenReturn(sampleKpis);

        mockMvc.perform(get("/api/complaints/safety/kpis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEvaluations").value(10))
                .andExpect(jsonPath("$.seriousCases").value(3))
                .andExpect(jsonPath("$.reportableCases").value(2))
                .andExpect(jsonPath("$.unknownLotCases").value(2));
    }

    @Test
    @DisplayName("GET /api/complaints/safety 목록 페이징 정상 응답")
    void searchEvaluations_ReturnsOk() throws Exception {
        PageImpl<ComplaintSafetyResponse> page = new PageImpl<>(List.of(sampleResponse), PageRequest.of(0, 20), 1);
        when(service.searchEvaluations(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get("/api/complaints/safety")
                        .param("keyword", "수분")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].evaluationNumber").value("SAFE-202610-001"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("GET /api/complaints/safety/{id} 단건 조회 정상 응답")
    void getEvaluation_ReturnsOk() throws Exception {
        when(service.getEvaluationById(1L)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/complaints/safety/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.evaluationNumber").value("SAFE-202610-001"));
    }

    @Test
    @DisplayName("POST /api/complaints/safety [D-9 실증] LOT 미상 신규 접수 생성 (201 Created)")
    void createEvaluation_UnknownLot_ReturnsCreated() throws Exception {
        ComplaintSafetyCreateRequest req = ComplaintSafetyCreateRequest.builder()
                .title("립밤 구순염 (소비자 용기 분실)")
                .productType(ProductRegulatoryType.COSMETIC)
                .itemCode("COS-LIP-001")
                .productName("립밤")
                .lotNumber(null) // D-9: null 지원
                .isLotUnknown(true)
                .receiptDate(LocalDate.now())
                .evaluatorName("박임상")
                .evaluationDate(LocalDate.now())
                .adverseEventCategory(AdverseEventCategory.CHEILITIS)
                .symptomDescription("입술 균열")
                .investigationRequired(true)
                .build();

        ComplaintSafetyResponse created = ComplaintSafetyResponse.builder()
                .id(2L)
                .evaluationNumber("SAFE-202610-002")
                .isLotUnknown(true)
                .lotNumber(null)
                .build();

        when(service.createEvaluation(any(ComplaintSafetyCreateRequest.class), any())).thenReturn(created);

        mockMvc.perform(post("/api/complaints/safety")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(2))
                .andExpect(jsonPath("$.isLotUnknown").value(true));
    }

    @Test
    @DisplayName("PUT /api/complaints/safety/{id}/causality 인과관계 평가 심의 성공")
    void evaluateCausality_ReturnsOk() throws Exception {
        ComplaintCausalityEvaluationRequest req = ComplaintCausalityEvaluationRequest.builder()
                .causalityGrade(CausalityGrade.CERTAIN)
                .causalityRationale("시간적 선후관계 명확")
                .build();

        sampleResponse.setCausalityGrade(CausalityGrade.CERTAIN);
        when(service.evaluateCausality(eq(1L), any(), any())).thenReturn(sampleResponse);

        mockMvc.perform(put("/api/complaints/safety/1/causality")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.causalityGrade").value("CERTAIN"));
    }

    @Test
    @DisplayName("PUT /api/complaints/safety/{id}/regulatory-report 식약처 보고 접수 성공")
    void submitRegulatoryReport_ReturnsOk() throws Exception {
        ComplaintRegulatoryReportRequest req = ComplaintRegulatoryReportRequest.builder()
                .reportabilityStatus(ReportabilityStatus.REPORTED)
                .authorityReportNumber("KFDA-2026-001")
                .build();

        sampleResponse.setReportabilityStatus(ReportabilityStatus.REPORTED);
        sampleResponse.setAuthorityReportNumber("KFDA-2026-001");
        when(service.submitRegulatoryReport(eq(1L), any(), any())).thenReturn(sampleResponse);

        mockMvc.perform(put("/api/complaints/safety/1/regulatory-report")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authorityReportNumber").value("KFDA-2026-001"));
    }

    @Test
    @DisplayName("PUT /api/complaints/safety/{id}/close 종결 처리 성공")
    void closeEvaluation_ReturnsOk() throws Exception {
        ComplaintCloseRequest req = ComplaintCloseRequest.builder()
                .closedBy("김부장")
                .closureRemarks("종결 완료")
                .build();

        sampleResponse.setEvaluationStatus(ComplaintEvaluationStatus.CLOSED);
        when(service.closeEvaluation(eq(1L), any(), any())).thenReturn(sampleResponse);

        mockMvc.perform(put("/api/complaints/safety/1/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evaluationStatus").value("CLOSED"));
    }
}
