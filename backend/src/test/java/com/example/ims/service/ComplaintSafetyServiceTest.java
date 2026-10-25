package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.ClaimRepository;
import com.example.ims.repository.ComplaintActionItemRepository;
import com.example.ims.repository.ComplaintSafetyEvaluationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComplaintSafetyServiceTest {

    @Mock
    private ComplaintSafetyEvaluationRepository evaluationRepository;

    @Mock
    private ComplaintActionItemRepository actionItemRepository;

    @Mock
    private ClaimRepository claimRepository;

    @InjectMocks
    private ComplaintSafetyService service;

    private ComplaintSafetyEvaluation sampleEvaluation;

    @BeforeEach
    void setUp() {
        sampleEvaluation = ComplaintSafetyEvaluation.builder()
                .id(1L)
                .evaluationNumber("SAFE-202610-001")
                .title("수분 크림 접촉피부염 이상사례")
                .productType(ProductRegulatoryType.COSMETIC)
                .itemCode("COS-CREAM-001")
                .productName("인텐시브 하이드레이팅 크림 50ml")
                .lotNumber("24K05")
                .isLotUnknown(false)
                .manufacturer("(주)코스메틱코리아")
                .receiptDate(LocalDate.of(2026, 10, 15))
                .evaluatorName("김안전")
                .evaluationDate(LocalDate.of(2026, 10, 16))
                .adverseEventCategory(AdverseEventCategory.ACUTE_CONTACT_DERMATITIS)
                .symptomDescription("도포 후 안면부 급성 부종 및 팽진")
                .onsetDays(1)
                .medicalTreatmentGiven(true)
                .treatmentDetails("응급실 진료 및 항히스타민제 처방")
                .isSerious(true)
                .seriousReason("응급실 진료 및 전문의 진단서 발급")
                .causalityGrade(CausalityGrade.EVALUATING)
                .reportabilityStatus(ReportabilityStatus.REPORTABLE)
                .reportDeadline(LocalDate.of(2026, 10, 31))
                .investigationRequired(true)
                .evaluationStatus(ComplaintEvaluationStatus.SUBMITTED)
                .build();
    }

    @Test
    @DisplayName("6개 KPI 단일 쿼리 요약 정상 조회")
    void getKpiSummary_Success() {
        var projection = mock(ComplaintSafetyEvaluationRepository.ComplaintSafetyKpiProjection.class);
        when(projection.getTotalEvaluations()).thenReturn(10L);
        when(projection.getSeriousCases()).thenReturn(3L);
        when(projection.getReportableCases()).thenReturn(2L);
        when(projection.getUnderReviewCases()).thenReturn(4L);
        when(projection.getUnknownLotCases()).thenReturn(2L);
        when(projection.getCapaRequiredCases()).thenReturn(3L);

        when(evaluationRepository.getKpiSummary()).thenReturn(projection);

        ComplaintSafetyKpiResponse res = service.getKpiSummary();

        assertThat(res.getTotalEvaluations()).isEqualTo(10L);
        assertThat(res.getSeriousCases()).isEqualTo(3L);
        assertThat(res.getReportableCases()).isEqualTo(2L);
        assertThat(res.getUnderReviewCases()).isEqualTo(4L);
        assertThat(res.getUnknownLotCases()).isEqualTo(2L);
        assertThat(res.getCapaRequiredCases()).isEqualTo(3L);
    }

    @Test
    @DisplayName("[D-9 실증] LOT 번호가 없는 경우 isLotUnknown=true로 정상 접수")
    void createEvaluation_UnknownLot_Success() {
        ComplaintSafetyCreateRequest req = ComplaintSafetyCreateRequest.builder()
                .title("립밤 구순염 (소비자 용기 분실 LOT 미상)")
                .productType(ProductRegulatoryType.COSMETIC)
                .itemCode("COS-LIP-001")
                .productName("모이스처 립밤")
                .lotNumber(null) // D-9: null 전달
                .isLotUnknown(true)
                .receiptDate(LocalDate.now())
                .evaluatorName("박임상")
                .evaluationDate(LocalDate.now())
                .adverseEventCategory(AdverseEventCategory.CHEILITIS)
                .symptomDescription("도포 2일 후 입술 균열 및 각질 탈락")
                .investigationRequired(true)
                .build();

        when(evaluationRepository.existsByEvaluationNumber(anyString())).thenReturn(false);
        when(evaluationRepository.save(any(ComplaintSafetyEvaluation.class))).thenAnswer(i -> {
            ComplaintSafetyEvaluation e = i.getArgument(0);
            e.setId(2L);
            return e;
        });

        ComplaintSafetyResponse res = service.createEvaluation(req, "testUser");

        assertThat(res.getId()).isEqualTo(2L);
        assertThat(res.getIsLotUnknown()).isTrue();
        assertThat(res.getLotNumber()).isNull();
    }

    @Test
    @DisplayName("21 CFR 820.198(b) 검증: 조사 미실시 시 사유가 누락되면 예외 발생")
    void createEvaluation_NoInvestigationWithoutReason_ThrowsException() {
        ComplaintSafetyCreateRequest req = ComplaintSafetyCreateRequest.builder()
                .title("단순 사용감 불만")
                .productType(ProductRegulatoryType.MEDICAL_DEVICE)
                .itemCode("MD-001")
                .productName("의료기기")
                .lotNumber("LOT-123")
                .receiptDate(LocalDate.now())
                .evaluatorName("최의료")
                .evaluationDate(LocalDate.now())
                .adverseEventCategory(AdverseEventCategory.MECHANICAL_RESISTANCE)
                .symptomDescription("방아쇠 뻑뻑함")
                .investigationRequired(false) // 조사 미실시
                .noInvestigationReason(null) // 사유 누락!
                .build();

        assertThatThrownBy(() -> service.createEvaluation(req, "testUser"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("21 CFR 820.198(b)");
    }

    @Test
    @DisplayName("중대한 이상사례 접수 시 식약처 15일 법정 보고 기한 자동 산정")
    void createEvaluation_Serious_CalculatesReportDeadline() {
        LocalDate evalDate = LocalDate.of(2026, 10, 20);
        ComplaintSafetyCreateRequest req = ComplaintSafetyCreateRequest.builder()
                .title("중대 이상사례 안면 부종")
                .productType(ProductRegulatoryType.COSMETIC)
                .itemCode("COS-001")
                .productName("수분 크림")
                .lotNumber("24K01")
                .receiptDate(evalDate)
                .evaluatorName("김안전")
                .evaluationDate(evalDate)
                .adverseEventCategory(AdverseEventCategory.ANGIOEDEMA_SWELLING)
                .symptomDescription("응급실 치료")
                .isSerious(true)
                .seriousReason("응급실 진료")
                .investigationRequired(true)
                .build();

        when(evaluationRepository.existsByEvaluationNumber(anyString())).thenReturn(false);
        when(evaluationRepository.save(any(ComplaintSafetyEvaluation.class))).thenAnswer(i -> {
            ComplaintSafetyEvaluation e = i.getArgument(0);
            e.setId(3L);
            return e;
        });

        ComplaintSafetyResponse res = service.createEvaluation(req, "testUser");

        assertThat(res.getIsSerious()).isTrue();
        assertThat(res.getReportabilityStatus()).isEqualTo(ReportabilityStatus.REPORTABLE);
        assertThat(res.getReportDeadline()).isEqualTo(evalDate.plusDays(15));
    }

    @Test
    @DisplayName("기존 Claim으로부터 원클릭 안전성 평가 초안 정상 생성")
    void createFromClaim_Success() {
        Claim claim = Claim.builder()
                .id(100L)
                .claimNumber("CLM-202610-099")
                .itemCode("COS-SERUM-001")
                .productName("진정 세럼")
                .lotNumber("LOT-미상")
                .isLotUnknown(true)
                .manufacturer("(주)화장품제조")
                .receiptDate(LocalDate.now())
                .claimContent("피부 붉어짐 발생")
                .isCriticalClaim(true)
                .build();

        when(claimRepository.findById(100L)).thenReturn(Optional.of(claim));
        when(evaluationRepository.existsByEvaluationNumber(anyString())).thenReturn(false);
        when(evaluationRepository.save(any(ComplaintSafetyEvaluation.class))).thenAnswer(i -> {
            ComplaintSafetyEvaluation e = i.getArgument(0);
            e.setId(4L);
            return e;
        });

        ComplaintSafetyResponse res = service.createFromClaim(100L, "testAdmin");

        assertThat(res.getClaimId()).isEqualTo(100L);
        assertThat(res.getClaimNumber()).isEqualTo("CLM-202610-099");
        assertThat(res.getIsLotUnknown()).isTrue();
        assertThat(claim.getSafetyEvalRequired()).isTrue();
        assertThat(claim.getSafetyEvaluationId()).isEqualTo(4L);
    }

    @Test
    @DisplayName("인과관계 평가 심의 시 CERTAIN 및 중대사례인 경우 CAPA 자동 필수화")
    void evaluateCausality_CertainAndSerious_RequiresCapa() {
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(sampleEvaluation));

        ComplaintCausalityEvaluationRequest req = ComplaintCausalityEvaluationRequest.builder()
                .causalityGrade(CausalityGrade.CERTAIN)
                .causalityRationale("도포 후 시간적 선후관계 명확 및 잔류 유효물질 과다 확인")
                .isSerious(true)
                .seriousReason("전문의 진단서 발급")
                .build();

        ComplaintSafetyResponse res = service.evaluateCausality(1L, req, "reviewer");

        assertThat(res.getCausalityGrade()).isEqualTo(CausalityGrade.CERTAIN);
        assertThat(res.getCapaRequired()).isTrue();
        assertThat(res.getCapaStatus()).isEqualTo(CapaLinkageStatus.REQUIRED);
        assertThat(res.getEvaluationStatus()).isEqualTo(ComplaintEvaluationStatus.EVALUATED);
    }

    @Test
    @DisplayName("식약처/FDA 규제기관 보고 접수 등록 시 상태 전이")
    void submitRegulatoryReport_Success() {
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(sampleEvaluation));

        ComplaintRegulatoryReportRequest req = ComplaintRegulatoryReportRequest.builder()
                .reportabilityStatus(ReportabilityStatus.REPORTED)
                .authorityReportDate(LocalDate.of(2026, 10, 22))
                .authorityReportNumber("KFDA-2026-999")
                .authorityFeedback("식약처 화장품안전과 접수 확인")
                .build();

        ComplaintSafetyResponse res = service.submitRegulatoryReport(1L, req, "reporter");

        assertThat(res.getReportabilityStatus()).isEqualTo(ReportabilityStatus.REPORTED);
        assertThat(res.getAuthorityReportNumber()).isEqualTo("KFDA-2026-999");
        assertThat(res.getEvaluationStatus()).isEqualTo(ComplaintEvaluationStatus.REPORTED);
    }

    @Test
    @DisplayName("진행 중인 조치과제가 존재하면 최종 종결 불가 (예외 발생)")
    void closeEvaluation_UnfinishedActionItems_ThrowsException() {
        ComplaintActionItem actionItem = ComplaintActionItem.builder()
                .id(10L)
                .actionItemNumber("ACT-SAFE-001-01")
                .status(NcrActionStatus.IN_PROGRESS) // 미완료 상태!
                .build();
        sampleEvaluation.setActionItems(List.of(actionItem));

        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(sampleEvaluation));

        ComplaintCloseRequest req = ComplaintCloseRequest.builder()
                .closedBy("김부장")
                .closureRemarks("모든 조사 종결 처리")
                .build();

        assertThatThrownBy(() -> service.closeEvaluation(1L, req, "closer"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("진행 중이거나 대기 중인 후속 조치과제가 존재하여");
    }

    @Test
    @DisplayName("모든 조치과제가 완료된 경우 정상 종결 완료")
    void closeEvaluation_AllActionsCompleted_Success() {
        ComplaintActionItem actionItem = ComplaintActionItem.builder()
                .id(10L)
                .actionItemNumber("ACT-SAFE-001-01")
                .status(NcrActionStatus.COMPLETED)
                .build();
        sampleEvaluation.setActionItems(List.of(actionItem));

        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(sampleEvaluation));

        ComplaintCloseRequest req = ComplaintCloseRequest.builder()
                .closedBy("김부장")
                .closureRemarks("모든 고객 보상 및 시험검사 완료 종결")
                .build();

        ComplaintSafetyResponse res = service.closeEvaluation(1L, req, "closer");

        assertThat(res.getEvaluationStatus()).isEqualTo(ComplaintEvaluationStatus.CLOSED);
        assertThat(res.getClosedBy()).isEqualTo("김부장");
        assertThat(res.getClosedAt()).isNotNull();
    }

    @Test
    @DisplayName("후속 조치과제 추가 성공")
    void addActionItem_Success() {
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(sampleEvaluation));
        when(actionItemRepository.countByEvaluationId(1L)).thenReturn(0L);
        when(actionItemRepository.save(any(ComplaintActionItem.class))).thenAnswer(i -> {
            ComplaintActionItem a = i.getArgument(0);
            a.setId(50L);
            return a;
        });

        ComplaintActionItemRequest req = ComplaintActionItemRequest.builder()
                .actionType(ComplaintActionType.SAMPLE_TESTING)
                .title("보존검체 미생물 한도시험")
                .description("보존샘플 세균/진균수 측정")
                .assigneeName("이연구")
                .assigneeDept("시험실")
                .dueDate(LocalDate.now().plusDays(7))
                .build();

        ComplaintActionItemResponse res = service.addActionItem(1L, req, "user");

        assertThat(res.getId()).isEqualTo(50L);
        assertThat(res.getActionItemNumber()).isEqualTo("ACT-202610-001-01");
        assertThat(res.getActionType()).isEqualTo(ComplaintActionType.SAMPLE_TESTING);
    }
}
