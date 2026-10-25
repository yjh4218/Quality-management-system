package com.example.ims.controller;

import com.example.ims.dto.ControlledDocumentMetricsResponse;
import com.example.ims.dto.ControlledDocumentRequest;
import com.example.ims.dto.ControlledDocumentRevisionRequest;
import com.example.ims.dto.ControlledDocumentStatusRequest;
import com.example.ims.entity.ControlledDocStatus;
import com.example.ims.entity.ControlledDocType;
import com.example.ims.entity.ControlledDocument;
import com.example.ims.entity.ProductFamily;
import com.example.ims.service.ControlledDocumentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ControlledDocumentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ControlledDocumentService service;

    @InjectMocks
    private ControlledDocumentController controller;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        HandlerMethodArgumentResolver authResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return Authentication.class.isAssignableFrom(parameter.getParameterType());
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                return org.mockito.Mockito.mock(Authentication.class);
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver(), authResolver)
                .build();
    }

    @Test
    @DisplayName("1. GET /api/controlled-documents - 통제문서 목록 페이징 조회")
    void getDocuments_success() throws Exception {
        ControlledDocument doc = ControlledDocument.builder()
                .id(1L)
                .docNo("SOP-QA-001")
                .title("통제문서 관리 절차서")
                .docType(ControlledDocType.SOP)
                .status(ControlledDocStatus.EFFECTIVE)
                .revisionNo("Rev. 0")
                .build();

        when(service.getDocuments(any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(doc), org.springframework.data.domain.PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/controlled-documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].docNo").value("SOP-QA-001"))
                .andExpect(jsonPath("$.content[0].title").value("통제문서 관리 절차서"));
    }

    @Test
    @DisplayName("2. GET /api/controlled-documents/{id} - 통제문서 단건 상세 조회")
    void getDocumentById_success() throws Exception {
        ControlledDocument doc = ControlledDocument.builder()
                .id(1L)
                .docNo("QM-MD-001")
                .title("의료기기 품질매뉴얼")
                .docType(ControlledDocType.QUALITY_MANUAL)
                .targetFamily(ProductFamily.MEDICAL_DEVICE)
                .status(ControlledDocStatus.EFFECTIVE)
                .revisionNo("Rev. 0")
                .build();

        when(service.getDocumentById(1L)).thenReturn(doc);

        mockMvc.perform(get("/api/controlled-documents/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.docNo").value("QM-MD-001"))
                .andExpect(jsonPath("$.targetFamily").value("MEDICAL_DEVICE"));
    }

    @Test
    @DisplayName("3. POST /api/controlled-documents - 신규 통제문서 등록")
    void createDocument_success() throws Exception {
        ControlledDocumentRequest request = ControlledDocumentRequest.builder()
                .docNo("WI-RA-001")
                .title("DHF 작성 지침서")
                .docType(ControlledDocType.DHF)
                .targetFamily(ProductFamily.MEDICAL_DEVICE)
                .revisionNo("Rev. 0")
                .build();

        ControlledDocument created = ControlledDocument.builder()
                .id(10L)
                .docNo("WI-RA-001")
                .title("DHF 작성 지침서")
                .docType(ControlledDocType.DHF)
                .targetFamily(ProductFamily.MEDICAL_DEVICE)
                .status(ControlledDocStatus.DRAFT)
                .revisionNo("Rev. 0")
                .build();

        when(service.createDocument(any(ControlledDocumentRequest.class), any())).thenReturn(created);

        mockMvc.perform(post("/api/controlled-documents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.docNo").value("WI-RA-001"));
    }

    @Test
    @DisplayName("4. POST /api/controlled-documents/{id}/revision - 새 개정판 생성")
    void createRevision_success() throws Exception {
        ControlledDocumentRevisionRequest request = ControlledDocumentRevisionRequest.builder()
                .revisionNo("Rev. 1.0")
                .changeRationale("정기 개정 검토")
                .build();

        ControlledDocument newRev = ControlledDocument.builder()
                .id(11L)
                .docNo("SOP-QA-001")
                .revisionNo("Rev. 1.0")
                .status(ControlledDocStatus.DRAFT)
                .build();

        when(service.createRevision(eq(1L), any(ControlledDocumentRevisionRequest.class), any())).thenReturn(newRev);

        mockMvc.perform(post("/api/controlled-documents/1/revision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.revisionNo").value("Rev. 1.0"));
    }

    @Test
    @DisplayName("5. PATCH /api/controlled-documents/{id}/status - 상태 전이")
    void changeStatus_success() throws Exception {
        ControlledDocumentStatusRequest request = ControlledDocumentStatusRequest.builder()
                .status(ControlledDocStatus.EFFECTIVE)
                .reason("품질책임자 승인 배포")
                .build();

        ControlledDocument updated = ControlledDocument.builder()
                .id(1L)
                .docNo("SOP-QA-001")
                .status(ControlledDocStatus.EFFECTIVE)
                .build();

        when(service.changeStatus(eq(1L), eq(ControlledDocStatus.EFFECTIVE), eq("품질책임자 승인 배포"), any()))
                .thenReturn(updated);

        mockMvc.perform(patch("/api/controlled-documents/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EFFECTIVE"));
    }

    @Test
    @DisplayName("6. GET /api/controlled-documents/metrics - 종합 메트릭 조회")
    void getMetrics_success() throws Exception {
        ControlledDocumentMetricsResponse metrics = ControlledDocumentMetricsResponse.builder()
                .totalDocuments(7)
                .effectiveCount(5)
                .draftCount(1)
                .reviewCount(1)
                .build();

        when(service.getMetrics()).thenReturn(metrics);

        mockMvc.perform(get("/api/controlled-documents/metrics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDocuments").value(7))
                .andExpect(jsonPath("$.effectiveCount").value(5));
    }

    @Test
    @DisplayName("7. DELETE /api/controlled-documents/{id} - 소프트 삭제")
    void deleteDocument_success() throws Exception {
        mockMvc.perform(delete("/api/controlled-documents/1"))
                .andExpect(status().isNoContent());

        verify(service).softDeleteDocument(eq(1L), any());
    }
}
