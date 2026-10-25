package com.example.ims.service;

import com.example.ims.dto.RiskAssessmentRequest;
import com.example.ims.dto.RiskAssessmentResponse;
import com.example.ims.dto.RiskHazardItemRequest;
import com.example.ims.dto.RiskKpiResponse;
import com.example.ims.entity.RiskAssessment;
import com.example.ims.entity.RiskHazardItem;
import com.example.ims.repository.RiskAssessmentRepository;
import com.example.ims.repository.RiskHazardItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RiskAssessmentServiceTest {

    @Mock
    private RiskAssessmentRepository assessmentRepository;

    @Mock
    private RiskHazardItemRepository hazardItemRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private RiskAssessmentService service;

    private RiskAssessment sampleAssessment;
    private RiskHazardItem sampleHazardItem;

    @BeforeEach
    void setUp() {
        sampleAssessment = RiskAssessment.builder()
                .id(1L)
                .assessmentNo("RSK-202610-001")
                .title("스마트 인슐린 펜 주입기 설계 및 사용 위험성 평가")
                .productName("스마트 인슐린 펜 인젝터")
                .targetFamily("MEDICAL_DEVICE")
                .riskPhase("DESIGN")
                .versionTag("1.0")
                .status("DRAFT")
                .author("홍길동")
                .assessmentDate(LocalDate.now())
                .overallResidualRiskAcceptable(true)
                .hazardItems(new ArrayList<>())
                .isDeleted(false)
                .build();

        sampleHazardItem = RiskHazardItem.builder()
                .id(10L)
                .assessment(sampleAssessment)
                .itemNo("HAZ-001")
                .category("ELECTRICAL")
                .hazard("배터리 과충전 발열")
                .hazardousSituation("충전 중 표면 온도 상승")
                .harm("피부 화상")
                .initialSeverity(4)
                .initialProbability(3)
                .initialRiskScore(12)
                .initialAcceptability("UNACCEPTABLE")
                .controlCategory("INHERENT_SAFETY")
                .controlMeasures("PCM 이중 보호회로 및 PTC 서미스터")
                .controlStatus("COMPLETED")
                .verificationMethod("IEC 60601-1 시험")
                .verificationResult("PASS")
                .residualSeverity(2)
                .residualProbability(1)
                .residualRiskScore(2)
                .residualAcceptability("ACCEPTABLE")
                .benefitRiskNeeded(false)
                .isDeleted(false)
                .build();
    }

    @Test
    @DisplayName("위험성 평가 목록 조회 성공")
    void getAssessments_success() {
        Page<RiskAssessment> page = new PageImpl<>(List.of(sampleAssessment));
        when(assessmentRepository.searchAssessments(any(), any(), any(), any(), any(Pageable.class)))
                .thenReturn(page);

        Page<RiskAssessmentResponse> result = service.getAssessments("인슐린", "MEDICAL_DEVICE", "DESIGN", "DRAFT", 0, 10);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAssessmentNo()).isEqualTo("RSK-202610-001");
        assertThat(result.getContent().get(0).getProductName()).isEqualTo("스마트 인슐린 펜 인젝터");
    }

    @Test
    @DisplayName("위험성 평가 상세 조회 성공")
    void getAssessmentById_success() {
        when(assessmentRepository.findById(1L)).thenReturn(Optional.of(sampleAssessment));

        RiskAssessmentResponse result = service.getAssessmentById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getTitle()).isEqualTo("스마트 인슐린 펜 주입기 설계 및 사용 위험성 평가");
    }

    @Test
    @DisplayName("위험성 평가 생성 - 평가번호 자동 생성 및 저장")
    void createAssessment_withAutoNumber() {
        RiskAssessmentRequest request = RiskAssessmentRequest.builder()
                .title("새로운 초음파 진단기 위험관리")
                .productName("휴대용 초음파기")
                .targetFamily("MEDICAL_DEVICE")
                .riskPhase("DESIGN")
                .versionTag("1.0")
                .author("김연구원")
                .assessmentDate(LocalDate.now())
                .build();

        when(assessmentRepository.count()).thenReturn(5L);
        when(assessmentRepository.save(any(RiskAssessment.class))).thenAnswer(invocation -> {
            RiskAssessment a = invocation.getArgument(0);
            a.setId(99L);
            return a;
        });

        RiskAssessmentResponse response = service.createAssessment(request, "admin");

        assertThat(response.getId()).isEqualTo(99L);
        assertThat(response.getAssessmentNo()).startsWith("RSK-");
        assertThat(response.getTitle()).isEqualTo("새로운 초음파 진단기 위험관리");
        verify(eventPublisher, times(1)).publishEvent(any(com.example.ims.event.EntityChangeEvent.class));
    }

    @Test
    @DisplayName("위험성 평가 수정 성공")
    void updateAssessment_success() {
        RiskAssessmentRequest updateReq = RiskAssessmentRequest.builder()
                .title("수정된 평가 제목")
                .productName("스마트 인슐린 펜 인젝터 Pro")
                .targetFamily("MEDICAL_DEVICE")
                .riskPhase("DESIGN")
                .author("홍길동")
                .build();

        when(assessmentRepository.findById(1L)).thenReturn(Optional.of(sampleAssessment));
        when(assessmentRepository.save(any(RiskAssessment.class))).thenReturn(sampleAssessment);

        RiskAssessmentResponse response = service.updateAssessment(1L, updateReq, "admin");

        assertThat(response.getTitle()).isEqualTo("수정된 평가 제목");
        assertThat(response.getProductName()).isEqualTo("스마트 인슐린 펜 인젝터 Pro");
    }

    @Test
    @DisplayName("위험성 평가 소프트 딜리트 성공")
    void deleteAssessment_softDelete() {
        when(assessmentRepository.findById(1L)).thenReturn(Optional.of(sampleAssessment));

        service.deleteAssessment(1L, "admin");

        assertThat(sampleAssessment.getIsDeleted()).isTrue();
        assertThat(sampleAssessment.getDeletedAt()).isNotNull();
        verify(assessmentRepository, times(1)).save(sampleAssessment);
    }

    @Test
    @DisplayName("위험성 평가 최종 승인 처리")
    void approveAssessment_success() {
        when(assessmentRepository.findById(1L)).thenReturn(Optional.of(sampleAssessment));
        when(assessmentRepository.save(any(RiskAssessment.class))).thenReturn(sampleAssessment);

        RiskAssessmentResponse response = service.approveAssessment(1L, "박대표", "admin");

        assertThat(response.getStatus()).isEqualTo("APPROVED");
        assertThat(response.getApprover()).isEqualTo("박대표");
        assertThat(response.getApprovalDate()).isEqualTo(LocalDate.now());
    }

    @Test
    @DisplayName("위해요인 항목 추가 및 5x5 위험도 자동 계산")
    void addHazardItem_autoCalculatesRiskScores() {
        RiskHazardItemRequest request = RiskHazardItemRequest.builder()
                .category("SOFTWARE")
                .hazard("SW 투여량 계산 오류")
                .hazardousSituation("설정값 초과 주입")
                .harm("저혈당 쇼크")
                .initialSeverity(5)
                .initialProbability(3)
                .controlCategory("PROTECTIVE_MEASURES")
                .controlMeasures("듀얼 센서 상호 비교 차단")
                .residualSeverity(3)
                .residualProbability(1)
                .build();

        when(assessmentRepository.findById(1L)).thenReturn(Optional.of(sampleAssessment));
        when(hazardItemRepository.countByAssessmentId(1L)).thenReturn(0L);
        when(hazardItemRepository.save(any(RiskHazardItem.class))).thenAnswer(invocation -> {
            RiskHazardItem h = invocation.getArgument(0);
            h.setId(101L);
            return h;
        });

        RiskHazardItem saved = service.addHazardItem(1L, request, "admin");

        assertThat(saved.getItemNo()).isEqualTo("HAZ-001");
        assertThat(saved.getInitialRiskScore()).isEqualTo(15); // 5 * 3
        assertThat(saved.getInitialAcceptability()).isEqualTo("UNACCEPTABLE");
        assertThat(saved.getResidualRiskScore()).isEqualTo(3); // 3 * 1
        assertThat(saved.getResidualAcceptability()).isEqualTo("ACCEPTABLE");
    }

    @Test
    @DisplayName("위해요인 항목 수정 및 잔여위험도 재계산")
    void updateHazardItem_recalculates() {
        RiskHazardItemRequest updateReq = RiskHazardItemRequest.builder()
                .category("ELECTRICAL")
                .hazard("배터리 과충전 발열 개선")
                .hazardousSituation("충전 중 표면 온도 상승")
                .harm("가벼운 피부 접촉열")
                .initialSeverity(4)
                .initialProbability(2)
                .controlCategory("INHERENT_SAFETY")
                .controlMeasures("3중 보호회로 구축")
                .residualSeverity(1)
                .residualProbability(1)
                .build();

        when(hazardItemRepository.findByAssessmentIdAndId(1L, 10L)).thenReturn(Optional.of(sampleHazardItem));
        when(hazardItemRepository.save(any(RiskHazardItem.class))).thenReturn(sampleHazardItem);

        RiskHazardItem updated = service.updateHazardItem(1L, 10L, updateReq, "admin");

        assertThat(updated.getInitialRiskScore()).isEqualTo(8); // 4 * 2 = 8 (ALARP)
        assertThat(updated.getInitialAcceptability()).isEqualTo("ALARP");
        assertThat(updated.getResidualRiskScore()).isEqualTo(1); // 1 * 1 = 1 (ACCEPTABLE)
        assertThat(updated.getResidualAcceptability()).isEqualTo("ACCEPTABLE");
    }

    @Test
    @DisplayName("위해요인 항목 소프트 삭제")
    void deleteHazardItem_softDelete() {
        when(hazardItemRepository.findByAssessmentIdAndId(1L, 10L)).thenReturn(Optional.of(sampleHazardItem));

        service.deleteHazardItem(1L, 10L, "admin");

        assertThat(sampleHazardItem.getIsDeleted()).isTrue();
        assertThat(sampleHazardItem.getDeletedAt()).isNotNull();
        verify(hazardItemRepository, times(1)).save(sampleHazardItem);
    }

    @Test
    @DisplayName("종합 KPI 및 5x5 FMEA 매트릭스 지표 집계")
    void getKpiMetrics_success() {
        when(assessmentRepository.count()).thenReturn(10L);
        when(hazardItemRepository.count()).thenReturn(25L);
        when(hazardItemRepository.countByControlStatus("COMPLETED")).thenReturn(20L);
        when(hazardItemRepository.countByControlStatus("VERIFIED")).thenReturn(3L);
        when(hazardItemRepository.countByInitialAcceptability("UNACCEPTABLE")).thenReturn(15L);
        when(hazardItemRepository.countByResidualAcceptability("ACCEPTABLE")).thenReturn(24L);
        when(assessmentRepository.countByStatus("REVIEW")).thenReturn(2L);
        when(assessmentRepository.countByStatus("DRAFT")).thenReturn(1L);

        List<Object[]> initialList = new ArrayList<>();
        initialList.add(new Object[]{4, 3, 5L});
        initialList.add(new Object[]{5, 2, 3L});
        when(hazardItemRepository.countInitialMatrix(null)).thenReturn(initialList);

        List<Object[]> residualList = new ArrayList<>();
        residualList.add(new Object[]{2, 1, 8L});
        when(hazardItemRepository.countResidualMatrix(null)).thenReturn(residualList);

        RiskKpiResponse kpi = service.getKpiMetrics();

        assertThat(kpi.getTotalAssessments()).isEqualTo(10L);
        assertThat(kpi.getTotalHazards()).isEqualTo(25L);
        assertThat(kpi.getCompletedControls()).isEqualTo(23L);
        assertThat(kpi.getUnacceptableRisks()).isEqualTo(15L);
        assertThat(kpi.getResidualAcceptableRate()).isEqualTo(96.0); // 24 / 25 * 100
        assertThat(kpi.getPendingReviewCount()).isEqualTo(3L);
        assertThat(kpi.getInitialMatrix().get("S4_P3")).isEqualTo(5);
        assertThat(kpi.getInitialMatrix().get("S5_P2")).isEqualTo(3);
        assertThat(kpi.getResidualMatrix().get("S2_P1")).isEqualTo(8);
    }
}
