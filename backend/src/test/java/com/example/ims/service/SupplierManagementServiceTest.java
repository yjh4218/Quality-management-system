package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.ManufacturerRepository;
import com.example.ims.repository.QualityAgreementRepository;
import com.example.ims.repository.SupplierEvaluationRepository;
import com.example.ims.repository.SupplierQualificationRepository;
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

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SupplierManagementServiceTest {

    @Mock
    private SupplierQualificationRepository qualificationRepository;

    @Mock
    private SupplierEvaluationRepository evaluationRepository;

    @Mock
    private QualityAgreementRepository agreementRepository;

    @Mock
    private ManufacturerRepository manufacturerRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private SupplierManagementService service;

    private Manufacturer testManufacturer;
    private SupplierQualification testQualification;

    @BeforeEach
    void setUp() {
        testManufacturer = Manufacturer.builder()
                .id(1L)
                .name("(주)한국바이오소재")
                .category("원료")
                .build();

        testQualification = SupplierQualification.builder()
                .id(10L)
                .supplierCode("SUP-202610-001")
                .manufacturer(testManufacturer)
                .supplierType(SupplierType.RAW_MATERIAL)
                .approvalStatus(SupplierApprovalStatus.APPROVED)
                .supplierGrade(SupplierGrade.GRADE_A)
                .riskLevel("HIGH")
                .isoCertifications("ISO 13485:2016")
                .initialApprovalDate(LocalDate.of(2025, 10, 1))
                .build();
    }

    @Test
    @DisplayName("공급업체 자격 목록 페이징 검색 성공")
    void searchQualifications_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<SupplierQualification> page = new PageImpl<>(List.of(testQualification), pageable, 1);
        when(qualificationRepository.searchQualifications(any(), any(), any(), any(), eq(pageable)))
                .thenReturn(page);

        Page<SupplierQualificationResponse> result = service.searchQualifications(
                SupplierApprovalStatus.APPROVED, null, null, "한국", pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSupplierCode()).isEqualTo("SUP-202610-001");
        assertThat(result.getContent().get(0).getManufacturerName()).isEqualTo("(주)한국바이오소재");
    }

    @Test
    @DisplayName("공급업체 자격 단건 조회 성공 및 미존재 예외")
    void getQualificationById_Tests() {
        when(qualificationRepository.findById(10L)).thenReturn(Optional.of(testQualification));
        when(qualificationRepository.findById(999L)).thenReturn(Optional.empty());

        SupplierQualificationResponse res = service.getQualificationById(10L);
        assertThat(res).isNotNull();
        assertThat(res.getSupplierCode()).isEqualTo("SUP-202610-001");

        assertThatThrownBy(() -> service.getQualificationById(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("찾을 수 없습니다");
    }

    @Test
    @DisplayName("공급업체 신규 등록 성공 (자동채번 및 AuditLog 기록)")
    void createQualification_Success() {
        SupplierQualificationRequest req = SupplierQualificationRequest.builder()
                .manufacturerId(1L)
                .supplierType(SupplierType.CONTRACT_MANUFACTURER)
                .approvalStatus(SupplierApprovalStatus.PENDING_QUALIFICATION)
                .supplierGrade(SupplierGrade.GRADE_B)
                .riskLevel("HIGH")
                .scopeOfSupply("OEM 위탁제조")
                .build();

        when(manufacturerRepository.findById(1L)).thenReturn(Optional.of(testManufacturer));
        when(qualificationRepository.findTopByOrderBySupplierCodeDesc()).thenReturn(Optional.empty());
        when(qualificationRepository.save(any(SupplierQualification.class))).thenAnswer(inv -> {
            SupplierQualification q = inv.getArgument(0);
            q.setId(11L);
            return q;
        });

        SupplierQualificationResponse res = service.createQualification(req, "testAdmin");

        assertThat(res).isNotNull();
        assertThat(res.getId()).isEqualTo(11L);
        assertThat(res.getSupplierCode()).startsWith("SUP-");
        verify(auditLogService, times(1)).logAction(eq("testAdmin"), eq("CREATE"), anyString(), anyString());
    }

    @Test
    @DisplayName("공급업체 정보 수정 성공")
    void updateQualification_Success() {
        when(qualificationRepository.findById(10L)).thenReturn(Optional.of(testQualification));

        SupplierQualificationRequest req = SupplierQualificationRequest.builder()
                .manufacturerId(1L)
                .supplierType(SupplierType.RAW_MATERIAL)
                .approvalStatus(SupplierApprovalStatus.APPROVED)
                .supplierGrade(SupplierGrade.GRADE_A)
                .riskLevel("LOW")
                .scopeOfSupply("수정된 공급 범위")
                .build();

        SupplierQualificationResponse res = service.updateQualification(10L, req, "testAdmin");

        assertThat(res).isNotNull();
        assertThat(res.getRiskLevel()).isEqualTo("LOW");
        assertThat(res.getScopeOfSupply()).isEqualTo("수정된 공급 범위");
        verify(auditLogService, times(1)).logAction(eq("testAdmin"), eq("UPDATE"), anyString(), anyString());
    }

    @Test
    @DisplayName("공급업체 자격 소프트 딜리트 성공")
    void deleteQualification_Success() {
        when(qualificationRepository.findById(10L)).thenReturn(Optional.of(testQualification));

        service.deleteQualification(10L, "testAdmin");

        assertThat(testQualification.isDeleted()).isTrue();
        assertThat(testQualification.getDeletedAt()).isNotNull();
        verify(auditLogService, times(1)).logAction(eq("testAdmin"), eq("DELETE"), anyString(), anyString());
    }

    @Test
    @DisplayName("공급업체 상태 전이 성공")
    void transitionStatus_Success() {
        when(qualificationRepository.findById(10L)).thenReturn(Optional.of(testQualification));

        SupplierQualificationResponse res = service.transitionStatus(10L, SupplierApprovalStatus.SUSPENDED, "홍길동", "testAdmin");

        assertThat(res.getApprovalStatus()).isEqualTo(SupplierApprovalStatus.SUSPENDED);
        assertThat(res.getApprovedBy()).isEqualTo("홍길동");
        verify(auditLogService, times(1)).logAction(eq("testAdmin"), eq("STATUS_CHANGE"), anyString(), anyString());
    }

    @Test
    @DisplayName("정기 종합평가 등록 시 4개 영역 점수 자동합산 및 등급 산출(GRADE_A) 성공")
    void createEvaluation_GradeA_Success() {
        when(qualificationRepository.findById(10L)).thenReturn(Optional.of(testQualification));

        SupplierEvaluationRequest req = SupplierEvaluationRequest.builder()
                .qualificationId(10L)
                .evaluationYear(2026)
                .evaluationPeriod(EvaluationPeriod.ANNUAL)
                .qualityScore(38) // 40
                .deliveryScore(24) // 25
                .complianceScore(19) // 20
                .serviceScore(14) // 15
                .evaluationDate(LocalDate.of(2026, 10, 15))
                .evaluatorName("김평가")
                .evaluatorDepartment("품질보증팀")
                .build();

        when(evaluationRepository.save(any(SupplierEvaluation.class))).thenAnswer(inv -> {
            SupplierEvaluation e = inv.getArgument(0);
            e.setId(100L);
            return e;
        });

        SupplierEvaluationResponse res = service.createEvaluation(req, "testAdmin");

        assertThat(res).isNotNull();
        assertThat(res.getTotalScore()).isEqualTo(95);
        assertThat(res.getEvaluationGrade()).isEqualTo(SupplierGrade.GRADE_A);
        assertThat(testQualification.getSupplierGrade()).isEqualTo(SupplierGrade.GRADE_A);
        verify(auditLogService, times(1)).logAction(eq("testAdmin"), eq("CREATE"), anyString(), anyString());
    }

    @Test
    @DisplayName("정기 종합평가 결과 70점 미만 시 D등급 및 자격미달(DISQUALIFIED) 자동 전이")
    void createEvaluation_GradeD_Disqualified() {
        when(qualificationRepository.findById(10L)).thenReturn(Optional.of(testQualification));

        SupplierEvaluationRequest req = SupplierEvaluationRequest.builder()
                .qualificationId(10L)
                .evaluationYear(2026)
                .evaluationPeriod(EvaluationPeriod.Q3)
                .qualityScore(20)
                .deliveryScore(15)
                .complianceScore(10)
                .serviceScore(8)
                .evaluationDate(LocalDate.of(2026, 10, 15))
                .evaluatorName("이평가")
                .build();

        when(evaluationRepository.save(any(SupplierEvaluation.class))).thenAnswer(inv -> {
            SupplierEvaluation e = inv.getArgument(0);
            e.setId(101L);
            return e;
        });

        SupplierEvaluationResponse res = service.createEvaluation(req, "testAdmin");

        assertThat(res.getTotalScore()).isEqualTo(53);
        assertThat(res.getEvaluationGrade()).isEqualTo(SupplierGrade.GRADE_D);
        assertThat(testQualification.getApprovalStatus()).isEqualTo(SupplierApprovalStatus.DISQUALIFIED);
    }

    @Test
    @DisplayName("품질협약서(QAA) 신규 체결 등록 및 자동채번 성공")
    void createAgreement_Success() {
        when(manufacturerRepository.findById(1L)).thenReturn(Optional.of(testManufacturer));
        when(qualificationRepository.findById(10L)).thenReturn(Optional.of(testQualification));
        when(agreementRepository.findTopByOrderByAgreementNumberDesc()).thenReturn(Optional.empty());

        QualityAgreementRequest req = QualityAgreementRequest.builder()
                .manufacturerId(1L)
                .qualificationId(10L)
                .title("원자재 독점공급 품질보증협약서")
                .agreementType(AgreementType.RAW_MATERIAL)
                .effectiveDate(LocalDate.of(2026, 1, 1))
                .expiryDate(LocalDate.of(2027, 1, 1))
                .retentionExpiryDate(LocalDate.of(2032, 1, 1))
                .build();

        when(agreementRepository.save(any(QualityAgreement.class))).thenAnswer(inv -> {
            QualityAgreement qa = inv.getArgument(0);
            qa.setId(200L);
            return qa;
        });

        QualityAgreementResponse res = service.createAgreement(req, "testAdmin");

        assertThat(res).isNotNull();
        assertThat(res.getId()).isEqualTo(200L);
        assertThat(res.getAgreementNumber()).startsWith("QAA-");
        assertThat(res.getAgreementStatus()).isEqualTo(AgreementStatus.ACTIVE);
        verify(auditLogService, times(1)).logAction(eq("testAdmin"), eq("CREATE"), anyString(), anyString());
    }

    @Test
    @DisplayName("공급업체 관리 6대 핵심 KPI 통계 집계 검증")
    void getSupplierKpis_Success() {
        when(qualificationRepository.count()).thenReturn(10L);
        when(qualificationRepository.countByApprovalStatus(SupplierApprovalStatus.APPROVED)).thenReturn(7L);
        when(qualificationRepository.countByApprovalStatus(SupplierApprovalStatus.CONDITIONALLY_APPROVED)).thenReturn(2L);
        when(agreementRepository.countDistinctActiveManufacturers()).thenReturn(8L);
        when(agreementRepository.countExpiringSoon(any(LocalDate.class))).thenReturn(3L);
        when(evaluationRepository.calculateAverageTotalScore()).thenReturn(87.5);

        List<Object[]> statusList = Collections.singletonList(new Object[]{SupplierApprovalStatus.APPROVED, 7L});
        List<Object[]> gradeList = Collections.singletonList(new Object[]{SupplierGrade.GRADE_A, 5L});
        List<Object[]> typeList = Collections.singletonList(new Object[]{SupplierType.RAW_MATERIAL, 6L});
        List<Object[]> agreementStatusList = Collections.singletonList(new Object[]{AgreementStatus.ACTIVE, 8L});

        when(qualificationRepository.countByApprovalStatus()).thenReturn(statusList);
        when(qualificationRepository.countBySupplierGrade()).thenReturn(gradeList);
        when(qualificationRepository.countBySupplierType()).thenReturn(typeList);
        when(agreementRepository.countByAgreementStatus()).thenReturn(agreementStatusList);

        SupplierKpiResponse kpi = service.getSupplierKpis();

        assertThat(kpi).isNotNull();
        assertThat(kpi.getTotalSuppliers()).isEqualTo(10L);
        assertThat(kpi.getApprovedSuppliers()).isEqualTo(7L);
        assertThat(kpi.getConditionalSuppliers()).isEqualTo(2L);
        assertThat(kpi.getQaaComplianceRate()).isEqualTo(80.0);
        assertThat(kpi.getQaaExpiringSoonCount()).isEqualTo(3L);
        assertThat(kpi.getAverageEvaluationScore()).isEqualTo(87.5);
        assertThat(kpi.getStatusDistribution()).containsEntry("APPROVED", 7L);
    }
}
