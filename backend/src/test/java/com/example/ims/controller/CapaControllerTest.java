package com.example.ims.controller;

import com.example.ims.dto.CapaKpiResponse;
import com.example.ims.dto.CapaResponse;
import com.example.ims.entity.CapaCategory;
import com.example.ims.entity.CapaRiskLevel;
import com.example.ims.entity.CapaSourceType;
import com.example.ims.entity.CapaStatus;
import com.example.ims.service.CapaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CapaControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CapaService capaService;

    @InjectMocks
    private CapaController capaController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(capaController).build();
    }

    @Test
    @DisplayName("GET /api/capa/kpis: 6개 KPI 요약 조회 성공 200 OK")
    void getKpis_success() throws Exception {
        CapaKpiResponse kpi = CapaKpiResponse.builder()
                .totalCapas(12)
                .inProgressCapas(4)
                .pendingEffectivenessCapas(3)
                .overdueCapas(1)
                .criticalOrHighRiskCapas(5)
                .closedEffectiveCapas(4)
                .closureEffectivenessRate(80.0)
                .build();

        given(capaService.getKpiSummary()).willReturn(kpi);

        mockMvc.perform(get("/api/capa/kpis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCapas").value(12))
                .andExpect(jsonPath("$.inProgressCapas").value(4))
                .andExpect(jsonPath("$.overdueCapas").value(1))
                .andExpect(jsonPath("$.closureEffectivenessRate").value(80.0));
    }

    @Test
    @DisplayName("GET /api/capa: 페이징 목록 검색 성공 200 OK")
    void searchCapas_success() throws Exception {
        CapaResponse item = CapaResponse.builder()
                .id(1L)
                .capaNumber("CAPA-202610-001")
                .title("시카 크림 보존제 편차 시정조치")
                .sourceType(CapaSourceType.COMPLAINT_SAFETY)
                .status(CapaStatus.IMPLEMENTATION)
                .riskLevel(CapaRiskLevel.CRITICAL)
                .actionItems(new java.util.ArrayList<>())
                .build();

        given(capaService.searchCapas(any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .willReturn(new PageImpl<>(java.util.List.of(item), org.springframework.data.domain.PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/capa")
                        .param("keyword", "시카")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].capaNumber").value("CAPA-202610-001"))
                .andExpect(jsonPath("$.content[0].riskLevel").value("CRITICAL"));
    }

    @Test
    @DisplayName("POST /api/capa: 신규 발의 성공 201 Created")
    void createCapa_success() throws Exception {
        CapaResponse res = CapaResponse.builder()
                .id(2L)
                .capaNumber("CAPA-202610-002")
                .title("앰플 오버캡 누액 NCR CAPA")
                .status(CapaStatus.INITIATED)
                .build();

        given(capaService.createCapa(any(), any())).willReturn(res);

        String json = """
        {
            "title": "앰플 오버캡 누액 NCR CAPA",
            "sourceType": "NCR",
            "sourceId": 1,
            "sourceNumber": "NCR-202610-001",
            "category": "PACKAGING",
            "riskLevel": "HIGH",
            "problemDescription": "오버캡 기밀 누액 다발",
            "assignedTo": "정기술",
            "targetCompletionDate": "2026-11-20"
        }
        """;

        mockMvc.perform(post("/api/capa")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.capaNumber").value("CAPA-202610-002"))
                .andExpect(jsonPath("$.status").value("INITIATED"));
    }
}
