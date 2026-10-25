package com.example.ims.service;

import com.example.ims.dto.ProductRecallRequest;
import com.example.ims.dto.ProductRecallResponse;
import com.example.ims.dto.VigilanceReportRequest;
import com.example.ims.dto.VigilanceReportResponse;
import com.example.ims.entity.*;
import com.example.ims.repository.ProductRecallRepository;
import com.example.ims.repository.VigilanceReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VigilanceRecallServiceTest {

    @Mock
    private VigilanceReportRepository vigilanceRepository;

    @Mock
    private ProductRecallRepository recallRepository;

    @InjectMocks
    private VigilanceRecallService service;

    private LocalDate testAwarenessDate;

    @BeforeEach
    void setUp() {
        testAwarenessDate = LocalDate.of(2026, 10, 20);
    }

    @Test
    @DisplayName("국가별 이상사례 법정 보고 기한 자동 산정 테스트 (식약처 7일/15일, FDA 5일/30일, EU 2일/10일)")
    void testCalculateStatutoryDueDate() {
        // 식약처 사망/생명위협 7일
        LocalDate dueDateMfds7 = service.calculateStatutoryDueDate(
                VigilanceReportClassification.MFDS_DEATH_LIFE_THREAT_7D, testAwarenessDate);
        assertThat(dueDateMfds7).isEqualTo(testAwarenessDate.plusDays(7));

        // 식약처 중대 유해사례 15일
        LocalDate dueDateMfds15 = service.calculateStatutoryDueDate(
                VigilanceReportClassification.MFDS_SERIOUS_15D, testAwarenessDate);
        assertThat(dueDateMfds15).isEqualTo(testAwarenessDate.plusDays(15));

        // FDA 5-Day MDR
        LocalDate dueDateFda5 = service.calculateStatutoryDueDate(
                VigilanceReportClassification.FDA_5DAY_MDR, testAwarenessDate);
        assertThat(dueDateFda5).isEqualTo(testAwarenessDate.plusDays(5));

        // FDA 30-Day MDR
        LocalDate dueDateFda30 = service.calculateStatutoryDueDate(
                VigilanceReportClassification.FDA_30DAY_MDR, testAwarenessDate);
        assertThat(dueDateFda30).isEqualTo(testAwarenessDate.plusDays(30));

        // EU MDR 즉시 보고 2일
        LocalDate dueDateEu2 = service.calculateStatutoryDueDate(
                VigilanceReportClassification.EU_MDR_IMMEDIATE_2D, testAwarenessDate);
        assertThat(dueDateEu2).isEqualTo(testAwarenessDate.plusDays(2));

        // EU MDR 사망 10일
        LocalDate dueDateEu10 = service.calculateStatutoryDueDate(
                VigilanceReportClassification.EU_MDR_SERIOUS_10D, testAwarenessDate);
        assertThat(dueDateEu10).isEqualTo(testAwarenessDate.plusDays(10));
    }

    @Test
    @DisplayName("신규 Vigilance 보고 등록 시 채번 및 기한 자동 계산 정상 동작")
    void testCreateVigilanceReport() {
        VigilanceReportRequest req = VigilanceReportRequest.builder()
                .title("테스트 이상사례 보고")
                .authorityType(AuthorityType.MFDS)
                .regulatoryType(ProductRegulatoryType.MEDICAL_DEVICE)
                .reportClassification(VigilanceReportClassification.MFDS_SERIOUS_15D)
                .incidentSeverity(IncidentSeverity.HOSPITALIZATION)
                .sourceType(VigilanceSourceType.COMPLAINT)
                .itemCode("MD-001")
                .productName("의료기기 테스트")
                .awarenessDate(testAwarenessDate)
                .incidentDescription("치료 중 피부 발적 발생")
                .build();

        when(vigilanceRepository.findTopByReportNumberStartingWithOrderByReportNumberDesc(anyString()))
                .thenReturn(Optional.empty());

        when(vigilanceRepository.save(any(VigilanceReport.class))).thenAnswer(invocation -> {
            VigilanceReport entity = invocation.getArgument(0);
            entity.setId(101L);
            return entity;
        });

        VigilanceReportResponse response = service.createVigilanceReport(req, "tester");

        assertThat(response).isNotNull();
        assertThat(response.getReportNumber()).startsWith("VIG-");
        assertThat(response.getDueDate()).isEqualTo(testAwarenessDate.plusDays(15));
        assertThat(response.getSubmissionStatus()).isEqualTo(VigilanceSubmissionStatus.DRAFT);
        verify(vigilanceRepository, times(1)).save(any(VigilanceReport.class));
    }

    @Test
    @DisplayName("Vigilance 보고 당국 제출 처리 시 SUBMITTED 상태 및 접수번호 정상 반영")
    void testSubmitVigilanceReport() {
        VigilanceReport existing = VigilanceReport.builder()
                .id(101L)
                .reportNumber("VIG-202610-001")
                .title("기존 보고서")
                .submissionStatus(VigilanceSubmissionStatus.DRAFT)
                .isDeleted(false)
                .build();

        when(vigilanceRepository.findById(101L)).thenReturn(Optional.of(existing));

        VigilanceReportResponse res = service.submitVigilanceReport(101L, "MFDS-2026-REC-001", LocalDate.now(), "qaUser");

        assertThat(res.getSubmissionStatus()).isEqualTo(VigilanceSubmissionStatus.SUBMITTED);
        assertThat(res.getAuthoritySubmissionNumber()).isEqualTo("MFDS-2026-REC-001");
        assertThat(res.getSubmissionDate()).isEqualTo(LocalDate.now());
    }

    @Test
    @DisplayName("회수 수량 대사 불일치 시 COMPLETED 종결 차단 가드 (21 CFR Part 7 / 의료기기법 제34조)")
    void testRecallCompletionGuard_WhenQuantitiesMismatch() {
        ProductRecall recall = ProductRecall.builder()
                .id(201L)
                .recallNumber("RCL-202610-001")
                .title("불일치 회수 건")
                .status(RecallStatus.RECONCILIATION)
                .shippedQuantity(5000)
                .recalledQuantity(4000)
                .quarantinedQuantity(500)
                .disposedQuantity(0)
                .unretrievedQuantity(200) // 총 대사량 4700개 != 5000개 (오차 300개 발생)
                .isDeleted(false)
                .build();

        when(recallRepository.findById(201L)).thenReturn(Optional.of(recall));

        assertThatThrownBy(() -> service.transitionRecallStatus(201L, RecallStatus.COMPLETED, "종결 시도", "admin"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("회수 수량 대사가 불일치하여 종결할 수 없습니다")
                .hasMessageContaining("오차: 300개");
    }

    @Test
    @DisplayName("회수 수량 대사 100% 일치 시 정상 COMPLETED 종결 처리")
    void testRecallCompletionGuard_WhenQuantitiesMatch() {
        ProductRecall recall = ProductRecall.builder()
                .id(201L)
                .recallNumber("RCL-202610-001")
                .title("일치 회수 건")
                .status(RecallStatus.RECONCILIATION)
                .shippedQuantity(5000)
                .recalledQuantity(4200)
                .quarantinedQuantity(500)
                .disposedQuantity(0)
                .unretrievedQuantity(300) // 총 대사량 5000개 == 5000개 (오차 0개)
                .isDeleted(false)
                .build();

        when(recallRepository.findById(201L)).thenReturn(Optional.of(recall));

        ProductRecallResponse res = service.transitionRecallStatus(201L, RecallStatus.COMPLETED, "대사 100% 완료 및 종결 승인", "qaDirector");

        assertThat(res.getStatus()).isEqualTo(RecallStatus.COMPLETED);
        assertThat(res.getClosedDate()).isEqualTo(LocalDate.now());
        assertThat(res.getClosedBy()).isEqualTo("qaDirector");
        assertThat(res.getIsReconciliationBalanced()).isTrue();
    }
}
