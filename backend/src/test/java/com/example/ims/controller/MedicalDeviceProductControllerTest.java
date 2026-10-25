package com.example.ims.controller;

import com.example.ims.entity.MedicalDeviceProduct;
import com.example.ims.service.MedicalDeviceProductService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class MedicalDeviceProductControllerTest {

    private MockMvc mockMvc;

    @Mock
    private MedicalDeviceProductService service;

    @InjectMocks
    private MedicalDeviceProductController controller;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private MedicalDeviceProduct sampleDevice;

    @BeforeEach
    void setUp() {
        HandlerMethodArgumentResolver authPrincipalResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                return User.withUsername("admin").password("password").roles("ADMIN").build();
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(authPrincipalResolver)
                .build();

        sampleDevice = MedicalDeviceProduct.builder()
                .id(1L)
                .itemCode("MD-2026-001")
                .productName("휴대용 초음파 진단기")
                .deviceClassification("CLASS_II")
                .udiDi("88012345678901")
                .active(true)
                .build();
    }

    @Test
    @DisplayName("GET /api/medical-devices - 목록 페이징 조회")
    void testGetDevices() throws Exception {
        Page<MedicalDeviceProduct> page = new PageImpl<>(List.of(sampleDevice), PageRequest.of(0, 10), 1);
        when(service.getDevicesPaginated(any(), any(), anyInt(), anyInt())).thenReturn(page);

        mockMvc.perform(get("/api/medical-devices")
                        .param("page", "0")
                        .param("size", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].itemCode").value("MD-2026-001"));
    }

    @Test
    @DisplayName("POST /api/medical-devices - 신규 품목 등록 성공")
    void testCreateDevice() throws Exception {
        when(service.createDevice(any(MedicalDeviceProduct.class), eq("admin"))).thenReturn(sampleDevice);

        mockMvc.perform(post("/api/medical-devices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDevice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCode").value("MD-2026-001"));
    }

    @Test
    @DisplayName("GET /api/medical-devices/check-duplicate/{itemCode} - 중복 확인")
    void testCheckDuplicate() throws Exception {
        when(service.checkItemCodeDuplicate("MD-2026-001")).thenReturn(true);

        mockMvc.perform(get("/api/medical-devices/check-duplicate/MD-2026-001"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    @DisplayName("GET /api/medical-devices/metrics - 요약 통계 지표")
    void testGetMetrics() throws Exception {
        when(service.getSummaryMetrics()).thenReturn(Map.of("totalCount", 5L, "udiRegisteredCount", 4L));

        mockMvc.perform(get("/api/medical-devices/metrics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(5));
    }
}
