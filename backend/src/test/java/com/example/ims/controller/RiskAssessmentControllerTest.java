package com.example.ims.controller;

import com.example.ims.dto.RiskAssessmentRequest;
import com.example.ims.dto.RiskAssessmentResponse;
import com.example.ims.dto.RiskHazardItemRequest;
import com.example.ims.dto.RiskKpiResponse;
import com.example.ims.entity.RiskHazardItem;
import com.example.ims.service.RiskAssessmentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class RiskAssessmentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private RiskAssessmentService service;

    @InjectMocks
    private RiskAssessmentController controller;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @BeforeEach
    void setUp() {
        HandlerMethodArgumentResolver authResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return Authentication.class.isAssignableFrom(parameter.getParameterType());
            }

            @Override
            public Object resolveArgument(MethodParameter parameter,
                                          ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest,
                                          WebDataBinderFactory binderFactory) {
                Authentication auth = org.mockito.Mockito.mock(Authentication.class);
                when(auth.getName()).thenReturn("admin");
                return auth;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(authResolver)
                .build();
    }

    @Test
    @DisplayName("GET /api/quality/risks - 위험성 평가 목록 조회 200 OK")
    void getAssessments_returns200() throws Exception {
        RiskAssessmentResponse resp = RiskAssessmentResponse.builder()
                .id(1L)
                .assessmentNo("RSK-202610-001")
                .title("스마트 인슐린 펜 위험분석")
                .productName("스마트 인슐린 펜 인젝터")
                .status("APPROVED")
                .build();

        when(service.getAssessments(nullable(String.class), nullable(String.class), nullable(String.class), nullable(String.class), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(resp), org.springframework.data.domain.PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/quality/risks")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].assessmentNo").value("RSK-202610-001"))
                .andExpect(jsonPath("$.content[0].productName").value("스마트 인슐린 펜 인젝터"));
    }

    @Test
    @DisplayName("GET /api/quality/risks/{id} - 위험성 평가 상세 조회 200 OK")
    void getAssessmentById_returns200() throws Exception {
        RiskAssessmentResponse resp = RiskAssessmentResponse.builder()
                .id(1L)
                .assessmentNo("RSK-202610-001")
                .title("스마트 인슐린 펜 위험분석")
                .productName("스마트 인슐린 펜 인젝터")
                .status("APPROVED")
                .build();

        when(service.getAssessmentById(1L)).thenReturn(resp);

        mockMvc.perform(get("/api/quality/risks/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assessmentNo").value("RSK-202610-001"));
    }

    @Test
    @DisplayName("POST /api/quality/risks - 위험성 평가 생성 201 Created")
    void createAssessment_returns201() throws Exception {
        RiskAssessmentRequest req = RiskAssessmentRequest.builder()
                .title("혈당측정기 위험분석")
                .productName("연속혈당측정기")
                .targetFamily("MEDICAL_DEVICE")
                .riskPhase("DESIGN")
                .versionTag("1.0")
                .author("김연구")
                .assessmentDate(LocalDate.now())
                .build();

        RiskAssessmentResponse resp = RiskAssessmentResponse.builder()
                .id(2L)
                .assessmentNo("RSK-202610-002")
                .title("혈당측정기 위험분석")
                .productName("연속혈당측정기")
                .status("DRAFT")
                .build();

        when(service.createAssessment(any(RiskAssessmentRequest.class), anyString())).thenReturn(resp);

        mockMvc.perform(post("/api/quality/risks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assessmentNo").value("RSK-202610-002"));
    }

    @Test
    @DisplayName("PUT /api/quality/risks/{id} - 위험성 평가 수정 200 OK")
    void updateAssessment_returns200() throws Exception {
        RiskAssessmentRequest req = RiskAssessmentRequest.builder()
                .title("혈당측정기 위험분석 수정")
                .productName("연속혈당측정기 Pro")
                .targetFamily("MEDICAL_DEVICE")
                .riskPhase("DESIGN")
                .author("김연구")
                .assessmentDate(LocalDate.now())
                .build();

        RiskAssessmentResponse resp = RiskAssessmentResponse.builder()
                .id(2L)
                .assessmentNo("RSK-202610-002")
                .title("혈당측정기 위험분석 수정")
                .build();

        when(service.updateAssessment(eq(2L), any(RiskAssessmentRequest.class), anyString())).thenReturn(resp);

        mockMvc.perform(put("/api/quality/risks/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("혈당측정기 위험분석 수정"));
    }

    @Test
    @DisplayName("DELETE /api/quality/risks/{id} - 위험성 평가 삭제 204 No Content")
    void deleteAssessment_returns204() throws Exception {
        mockMvc.perform(delete("/api/quality/risks/1"))
                .andExpect(status().isNoContent());

        verify(service).deleteAssessment(eq(1L), anyString());
    }

    @Test
    @DisplayName("POST /api/quality/risks/{id}/approve - 위험성 평가 최종 승인 200 OK")
    void approveAssessment_returns200() throws Exception {
        RiskAssessmentResponse resp = RiskAssessmentResponse.builder()
                .id(1L)
                .status("APPROVED")
                .approver("대표이사")
                .build();

        when(service.approveAssessment(eq(1L), nullable(String.class), anyString())).thenReturn(resp);

        mockMvc.perform(post("/api/quality/risks/1/approve")
                        .param("approver", "대표이사"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.approver").value("대표이사"));
    }

    @Test
    @DisplayName("POST /api/quality/risks/{id}/hazards - 위해요인 항목 등록 201 Created")
    void addHazardItem_returns201() throws Exception {
        RiskHazardItemRequest req = RiskHazardItemRequest.builder()
                .category("SOFTWARE")
                .hazard("SW 연산 오류")
                .hazardousSituation("주입 과다")
                .harm("저혈당 쇼크")
                .initialSeverity(5)
                .initialProbability(3)
                .controlCategory("PROTECTIVE_MEASURES")
                .controlMeasures("듀얼 엔코더 상호 검증")
                .residualSeverity(3)
                .residualProbability(1)
                .build();

        RiskHazardItem item = RiskHazardItem.builder()
                .id(50L)
                .itemNo("HAZ-001")
                .hazard("SW 연산 오류")
                .initialRiskScore(15)
                .initialAcceptability("UNACCEPTABLE")
                .residualRiskScore(3)
                .residualAcceptability("ACCEPTABLE")
                .build();

        when(service.addHazardItem(eq(1L), any(RiskHazardItemRequest.class), anyString())).thenReturn(item);

        mockMvc.perform(post("/api/quality/risks/1/hazards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.itemNo").value("HAZ-001"))
                .andExpect(jsonPath("$.initialRiskScore").value(15))
                .andExpect(jsonPath("$.residualRiskScore").value(3));
    }

    @Test
    @DisplayName("GET /api/quality/risks/kpi - 종합 KPI 지표 200 OK")
    void getKpiMetrics_returns200() throws Exception {
        RiskKpiResponse kpi = RiskKpiResponse.builder()
                .totalAssessments(12L)
                .totalHazards(30L)
                .completedControls(28L)
                .unacceptableRisks(18L)
                .residualAcceptableRate(96.7)
                .pendingReviewCount(2L)
                .initialMatrix(Map.of("S4_P3", 5))
                .residualMatrix(Map.of("S2_P1", 8))
                .build();

        when(service.getKpiMetrics()).thenReturn(kpi);

        mockMvc.perform(get("/api/quality/risks/kpi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAssessments").value(12))
                .andExpect(jsonPath("$.totalHazards").value(30))
                .andExpect(jsonPath("$.residualAcceptableRate").value(96.7));
    }
}
