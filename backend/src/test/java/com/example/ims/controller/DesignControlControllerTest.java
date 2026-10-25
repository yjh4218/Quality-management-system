package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.service.DesignControlService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DesignControlControllerTest {

    private MockMvc mockMvc;

    @Mock
    private DesignControlService service;

    @InjectMocks
    private DesignControlController controller;

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
    @DisplayName("GET /api/quality/design-controls/projects - 목록 조회 성공")
    void getProjects_success() throws Exception {
        DesignProjectResponse res = DesignProjectResponse.builder()
                .id(1L)
                .projectCode("DP-2026-001")
                .projectName("스마트 인슐린 펜 인젝터 설계개발")
                .currentPhase(DesignPhase.VERIFICATION)
                .currentPhaseLabel("설계 검증")
                .status(DesignProjectStatus.ACTIVE)
                .statusLabel("진행중")
                .dhfNumber("DHF-2026-001")
                .dhfStatus("OPEN")
                .build();

        when(service.getProjects(any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(res), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/quality/design-controls/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].projectCode").value("DP-2026-001"))
                .andExpect(jsonPath("$.content[0].dhfNumber").value("DHF-2026-001"));
    }

    @Test
    @DisplayName("GET /api/quality/design-controls/projects/{id} - 단건 상세 조회")
    void getProjectById_success() throws Exception {
        DesignProjectResponse res = DesignProjectResponse.builder()
                .id(1L)
                .projectCode("DP-2026-001")
                .projectName("스마트 인슐린 펜 인젝터 설계개발")
                .build();

        when(service.getProjectById(1L)).thenReturn(res);

        mockMvc.perform(get("/api/quality/design-controls/projects/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.projectCode").value("DP-2026-001"));
    }

    @Test
    @DisplayName("POST /api/quality/design-controls/projects - 신규 등록 201 Created")
    void createProject_success() throws Exception {
        DesignProjectRequest req = DesignProjectRequest.builder()
                .projectName("신규 인슐린 펜")
                .targetDeviceName("인슐린 펜")
                .projectLeader("홍길동")
                .department("연구팀")
                .startDate(LocalDate.now())
                .targetCompletionDate(LocalDate.now().plusMonths(6))
                .build();

        DesignProjectResponse res = DesignProjectResponse.builder()
                .id(10L)
                .projectCode("DP-2026-010")
                .projectName("신규 인슐린 펜")
                .build();

        when(service.createProject(any(), any())).thenReturn(res);

        mockMvc.perform(post("/api/quality/design-controls/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.projectCode").value("DP-2026-010"));
    }

    @Test
    @DisplayName("POST /api/quality/design-controls/projects/{id}/phase - 단계 전이")
    void advancePhase_success() throws Exception {
        DesignProjectResponse res = DesignProjectResponse.builder()
                .id(1L)
                .currentPhase(DesignPhase.VALIDATION)
                .build();

        when(service.advancePhase(eq(1L), eq(DesignPhase.VALIDATION), any())).thenReturn(res);

        mockMvc.perform(post("/api/quality/design-controls/projects/1/phase")
                        .param("nextPhase", "VALIDATION"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentPhase").value("VALIDATION"));
    }

    @Test
    @DisplayName("GET /api/quality/design-controls/projects/{id}/items - 통제 항목 목록")
    void getControlItems_success() throws Exception {
        DesignControlItem item = DesignControlItem.builder()
                .id(100L)
                .itemCode("DI-001")
                .itemType(DesignItemType.DESIGN_INPUT)
                .title("투여량 정밀 제어")
                .specification("사양서")
                .responsiblePerson("홍길동")
                .build();

        when(service.getControlItems(1L)).thenReturn(List.of(item));

        mockMvc.perform(get("/api/quality/design-controls/projects/1/items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].itemCode").value("DI-001"));
    }

    @Test
    @DisplayName("GET /api/quality/design-controls/projects/{id}/traceability-matrix - RTM 매트릭스")
    void getTraceabilityMatrix_success() throws Exception {
        DesignTraceabilityMatrixDto row = DesignTraceabilityMatrixDto.builder()
                .inputItemCode("DI-001")
                .inputTitle("정밀 투여량")
                .outputItemCode("DO-001")
                .verificationItemCode("DV-001")
                .verificationResult("PASS")
                .fullyTraced(true)
                .build();

        when(service.getTraceabilityMatrix(1L)).thenReturn(List.of(row));

        mockMvc.perform(get("/api/quality/design-controls/projects/1/traceability-matrix"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].inputItemCode").value("DI-001"))
                .andExpect(jsonPath("$[0].fullyTraced").value(true));
    }

    @Test
    @DisplayName("GET /api/quality/design-controls/kpi - KPI 지표 반환")
    void getDesignKpis_success() throws Exception {
        DesignKpiResponse kpi = DesignKpiResponse.builder()
                .totalProjects(2L)
                .activeProjects(2L)
                .overallVerificationPassRate(95.0)
                .openDhfCount(2L)
                .phaseDistribution(Map.of("VERIFICATION", 1L))
                .build();

        when(service.getDesignKpis()).thenReturn(kpi);

        mockMvc.perform(get("/api/quality/design-controls/kpi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProjects").value(2))
                .andExpect(jsonPath("$.overallVerificationPassRate").value(95.0));
    }
}
