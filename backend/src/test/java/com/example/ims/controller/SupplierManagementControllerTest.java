package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.service.SupplierManagementService;
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
class SupplierManagementControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private SupplierManagementService service;

    @InjectMocks
    private SupplierManagementController controller;

    private SupplierQualificationResponse sampleQual;
    private SupplierEvaluationResponse sampleEval;
    private QualityAgreementResponse sampleAgreement;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        sampleQual = SupplierQualificationResponse.builder()
                .id(1L)
                .supplierCode("SUP-202610-001")
                .manufacturerId(10L)
                .manufacturerName("(주)한국바이오")
                .supplierType(SupplierType.RAW_MATERIAL)
                .supplierTypeDesc("원자재")
                .approvalStatus(SupplierApprovalStatus.APPROVED)
                .approvalStatusDesc("공식 승인")
                .supplierGrade(SupplierGrade.GRADE_A)
                .riskLevel("HIGH")
                .build();

        sampleEval = SupplierEvaluationResponse.builder()
                .id(100L)
                .qualificationId(1L)
                .supplierCode("SUP-202610-001")
                .evaluationYear(2026)
                .evaluationPeriod(EvaluationPeriod.ANNUAL)
                .qualityScore(38)
                .deliveryScore(24)
                .complianceScore(19)
                .serviceScore(14)
                .totalScore(95)
                .evaluationGrade(SupplierGrade.GRADE_A)
                .evaluatorName("김평가")
                .build();

        sampleAgreement = QualityAgreementResponse.builder()
                .id(200L)
                .agreementNumber("QAA-202610-001")
                .manufacturerId(10L)
                .title("원자재 독점공급 품질보증협약서")
                .agreementType(AgreementType.RAW_MATERIAL)
                .effectiveDate(LocalDate.of(2026, 1, 1))
                .expiryDate(LocalDate.of(2027, 1, 1))
                .retentionExpiryDate(LocalDate.of(2032, 1, 1))
                .agreementStatus(AgreementStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("공급업체 자격 목록 조회 API 검증")
    void searchQualifications_Api() throws Exception {
        when(service.searchQualifications(any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(sampleQual), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/quality/suppliers/qualifications")
                        .param("status", "APPROVED")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].supplierCode").value("SUP-202610-001"))
                .andExpect(jsonPath("$.content[0].manufacturerName").value("(주)한국바이오"));
    }

    @Test
    @DisplayName("공급업체 자격 단건 조회 API 검증")
    void getQualificationById_Api() throws Exception {
        when(service.getQualificationById(1L)).thenReturn(sampleQual);

        mockMvc.perform(get("/api/quality/suppliers/qualifications/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supplierCode").value("SUP-202610-001"))
                .andExpect(jsonPath("$.approvalStatus").value("APPROVED"));
    }

    @Test
    @DisplayName("공급업체 자격 신규 등록 API 검증 (201 Created)")
    void createQualification_Api() throws Exception {
        SupplierQualificationRequest req = SupplierQualificationRequest.builder()
                .manufacturerId(10L)
                .supplierType(SupplierType.RAW_MATERIAL)
                .approvalStatus(SupplierApprovalStatus.PENDING_QUALIFICATION)
                .supplierGrade(SupplierGrade.GRADE_B)
                .build();

        when(service.createQualification(any(SupplierQualificationRequest.class), anyString()))
                .thenReturn(sampleQual);

        mockMvc.perform(post("/api/quality/suppliers/qualifications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.supplierCode").value("SUP-202610-001"));
    }

    @Test
    @DisplayName("공급업체 자격 상태 전이 API 검증")
    void transitionStatus_Api() throws Exception {
        when(service.transitionStatus(eq(1L), eq(SupplierApprovalStatus.SUSPENDED), any(), anyString()))
                .thenReturn(sampleQual);

        mockMvc.perform(post("/api/quality/suppliers/qualifications/1/status")
                        .param("status", "SUSPENDED")
                        .param("approvedBy", "품질팀장"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("정기 종합평가 등록 API 검증 (201 Created)")
    void createEvaluation_Api() throws Exception {
        SupplierEvaluationRequest req = SupplierEvaluationRequest.builder()
                .qualificationId(1L)
                .evaluationYear(2026)
                .evaluationPeriod(EvaluationPeriod.ANNUAL)
                .qualityScore(38)
                .deliveryScore(24)
                .complianceScore(19)
                .serviceScore(14)
                .evaluationDate(LocalDate.of(2026, 10, 15))
                .evaluatorName("김평가")
                .build();

        when(service.createEvaluation(any(SupplierEvaluationRequest.class), anyString()))
                .thenReturn(sampleEval);

        mockMvc.perform(post("/api/quality/suppliers/evaluations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalScore").value(95))
                .andExpect(jsonPath("$.evaluationGrade").value("GRADE_A"));
    }

    @Test
    @DisplayName("품질협약서(QAA) 신규 체결 등록 API 검증 (201 Created)")
    void createAgreement_Api() throws Exception {
        QualityAgreementRequest req = QualityAgreementRequest.builder()
                .manufacturerId(10L)
                .title("원자재 독점공급 품질보증협약서")
                .agreementType(AgreementType.RAW_MATERIAL)
                .effectiveDate(LocalDate.of(2026, 1, 1))
                .expiryDate(LocalDate.of(2027, 1, 1))
                .retentionExpiryDate(LocalDate.of(2032, 1, 1))
                .build();

        when(service.createAgreement(any(QualityAgreementRequest.class), anyString()))
                .thenReturn(sampleAgreement);

        mockMvc.perform(post("/api/quality/suppliers/agreements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.agreementNumber").value("QAA-202610-001"));
    }

    @Test
    @DisplayName("6대 KPI 통계 조회 API 검증")
    void getSupplierKpis_Api() throws Exception {
        SupplierKpiResponse kpi = SupplierKpiResponse.builder()
                .totalSuppliers(10)
                .approvedSuppliers(7)
                .conditionalSuppliers(2)
                .qaaComplianceRate(80.0)
                .qaaExpiringSoonCount(3)
                .averageEvaluationScore(87.5)
                .statusDistribution(Collections.singletonMap("APPROVED", 7L))
                .build();

        when(service.getSupplierKpis()).thenReturn(kpi);

        mockMvc.perform(get("/api/quality/suppliers/kpi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSuppliers").value(10))
                .andExpect(jsonPath("$.approvedSuppliers").value(7))
                .andExpect(jsonPath("$.qaaComplianceRate").value(80.0))
                .andExpect(jsonPath("$.averageEvaluationScore").value(87.5));
    }
}
