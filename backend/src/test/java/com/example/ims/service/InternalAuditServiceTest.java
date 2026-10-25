package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.AuditChecklistRepository;
import com.example.ims.repository.AuditFindingRepository;
import com.example.ims.repository.InternalAuditRepository;
import com.example.ims.repository.ManagementReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class InternalAuditServiceTest {

    @Mock
    private InternalAuditRepository auditRepository;

    @Mock
    private AuditChecklistRepository checklistRepository;

    @Mock
    private AuditFindingRepository findingRepository;

    @Mock
    private ManagementReviewRepository reviewRepository;

    @InjectMocks
    private InternalAuditService auditService;

    private InternalAudit sampleAudit;

    @BeforeEach
    void setUp() {
        sampleAudit = InternalAudit.builder()
                .id(1L)
                .auditNumber("IA-20261025-001")
                .title("2026년 하반기 생산/품질관리 정기 내부심사")
                .auditType(AuditType.REGULAR_INTERNAL)
                .auditScope(AuditScope.MANUFACTURING_PROCESS)
                .plannedStartDate(LocalDate.of(2026, 10, 20))
                .plannedEndDate(LocalDate.of(2026, 10, 22))
                .auditeeDepartment("제조공정관리팀")
                .auditeeLeadName("박생산 부장")
                .leadAuditorName("김품질 팀장")
                .leadAuditorDepartment("품질보증팀")
                .status(AuditStatus.PLANNED)
                .build();
    }

    @Test
    @DisplayName("[내부심사] 심사원 독립성이 충족되면 심사 계획이 정상 생성된다")
    void createAudit_Success() {
        // given
        InternalAuditRequest req = InternalAuditRequest.builder()
                .title("2026년 하반기 생산/품질관리 정기 내부심사")
                .auditType(AuditType.REGULAR_INTERNAL)
                .auditScope(AuditScope.MANUFACTURING_PROCESS)
                .plannedStartDate(LocalDate.of(2026, 10, 20))
                .plannedEndDate(LocalDate.of(2026, 10, 22))
                .auditeeDepartment("제조공정관리팀")
                .auditeeLeadName("박생산 부장")
                .leadAuditorName("김품질 팀장")
                .leadAuditorDepartment("품질보증팀") // 다른 부서: 독립성 만족
                .build();

        given(auditRepository.save(any(InternalAudit.class))).willAnswer(inv -> {
            InternalAudit a = inv.getArgument(0);
            a.setId(1L);
            return a;
        });

        // when
        InternalAuditResponse response = auditService.createAudit(req, "admin");

        // then
        assertThat(response).isNotNull();
        assertThat(response.getAuditNumber()).startsWith("IA-");
        assertThat(response.getTitle()).isEqualTo("2026년 하반기 생산/품질관리 정기 내부심사");
        assertThat(response.getLeadAuditorDepartment()).isEqualTo("품질보증팀");
        assertThat(response.getAuditeeDepartment()).isEqualTo("제조공정관리팀");
    }

    @Test
    @DisplayName("[심사원 독립성 가드] 심사원 소속 부서와 피심사 부서가 동일하면 예외가 발생한다")
    void createAudit_IndependenceGuard_Fail() {
        // given
        InternalAuditRequest req = InternalAuditRequest.builder()
                .title("품질보증팀 자체 내부심사 시도")
                .auditType(AuditType.REGULAR_INTERNAL)
                .auditScope(AuditScope.QMS_FULL)
                .plannedStartDate(LocalDate.of(2026, 10, 20))
                .plannedEndDate(LocalDate.of(2026, 10, 22))
                .auditeeDepartment("품질보증팀")
                .auditeeLeadName("이품질 실장")
                .leadAuditorName("김품질 팀장")
                .leadAuditorDepartment("품질보증팀") // 동일 부서! 이해상충
                .build();

        // when & then
        assertThatThrownBy(() -> auditService.createAudit(req, "admin"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("자신의 소속 부서");
    }

    @Test
    @DisplayName("[지적사항 CAPA 가드] CRITICAL 또는 MAJOR 부적합을 CAPA 번호 없이 종결(CLOSED)하려 하면 예외가 발생한다")
    void createFinding_CriticalMajorClosingGuard_Fail() {
        // given
        given(auditRepository.findById(1L)).willReturn(Optional.of(sampleAudit));

        AuditFindingRequest req = AuditFindingRequest.builder()
                .internalAuditId(1L)
                .clauseNumber("ISO 13485 §7.5.8")
                .classification(FindingClassification.MAJOR)
                .status(FindingStatus.CLOSED) // 종결 시도
                .capaNumber(null) // CAPA 미연계!
                .findingDetails("고위험 원료 칭량 시 교차오염 위험 발견")
                .build();

        // when & then
        assertThatThrownBy(() -> auditService.createFinding(req, "admin"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("CAPA");
    }

    @Test
    @DisplayName("[지적사항 갱신] MAJOR 부적합에 CAPA 번호가 연계되면 정상적으로 종결(CLOSED) 처리된다")
    void updateFinding_CriticalMajorClosingGuard_Success() {
        // given
        AuditFinding finding = AuditFinding.builder()
                .id(10L)
                .findingNumber("FND-20261025-001")
                .internalAudit(sampleAudit)
                .clauseNumber("ISO 13485 §7.5.8")
                .classification(FindingClassification.MAJOR)
                .status(FindingStatus.OPEN)
                .findingDetails("고위험 원료 칭량 시 교차오염 위험 발견")
                .build();

        given(findingRepository.findById(10L)).willReturn(Optional.of(finding));
        given(findingRepository.save(any(AuditFinding.class))).willAnswer(inv -> inv.getArgument(0));

        AuditFindingRequest updateReq = AuditFindingRequest.builder()
                .internalAuditId(1L)
                .clauseNumber("ISO 13485 §7.5.8")
                .classification(FindingClassification.MAJOR)
                .status(FindingStatus.CLOSED)
                .capaNumber("CAPA-202610-001") // CAPA 연계 완료!
                .findingDetails("고위험 원료 칭량 시 교차오염 위험 발견")
                .verifiedBy("김품질 팀장")
                .verifiedDate(LocalDate.now())
                .verificationNotes("CAPA 시정조치 완료 및 스쿠프 각인 확인 완료")
                .build();

        // when
        AuditFindingResponse response = auditService.updateFinding(10L, updateReq, "admin");

        // then
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(FindingStatus.CLOSED);
        assertThat(response.getCapaNumber()).isEqualTo("CAPA-202610-001");
    }

    @Test
    @DisplayName("[체크리스트 등록] 내부심사에 체크리스트 항목이 정상 추가된다")
    void createChecklist_Success() {
        // given
        given(auditRepository.findById(1L)).willReturn(Optional.of(sampleAudit));
        given(checklistRepository.save(any(AuditChecklist.class))).willAnswer(inv -> {
            AuditChecklist c = inv.getArgument(0);
            c.setId(100L);
            return c;
        });

        AuditChecklistRequest req = AuditChecklistRequest.builder()
                .internalAuditId(1L)
                .clauseNumber("ISO 13485 §6.4.1")
                .checkpoint("청정실 차압(+20Pa) 유지 점검")
                .result(ChecklistResult.CONFORMING)
                .auditedBy("김품질 팀장")
                .build();

        // when
        AuditChecklistResponse response = auditService.createChecklist(req, "admin");

        // then
        assertThat(response).isNotNull();
        assertThat(response.getClauseNumber()).isEqualTo("ISO 13485 §6.4.1");
        assertThat(response.getResult()).isEqualTo(ChecklistResult.CONFORMING);
    }

    @Test
    @DisplayName("[경영검토] 12대 입력 및 3대 출력 검토 회의록이 정상 등록된다")
    void createReview_Success() {
        // given
        ManagementReviewRequest req = ManagementReviewRequest.builder()
                .title("2026년 하반기 정기 품질경영시스템(QMS) 경영검토 회의")
                .reviewType(ManagementReviewType.REGULAR_ANNUAL)
                .reviewDate(LocalDate.of(2026, 10, 15))
                .chairpersonName("강대표 대표이사")
                .attendees("강대표, 김품질, 박생산")
                .status(ManagementReviewStatus.APPROVED)
                .auditResultsSummary("심사 5건 완료, Major 1건 CAPA 진행 중")
                .qmsImprovementDecisions("DMS 전자 결재 프로세스 고도화")
                .resourceAllocationDecisions("RA 규제 인력 1명 충원 및 헤파필터 교체 예산 승인")
                .nextReviewDueDate(LocalDate.of(2027, 4, 15))
                .build();

        given(reviewRepository.save(any(ManagementReview.class))).willAnswer(inv -> {
            ManagementReview mr = inv.getArgument(0);
            mr.setId(1L);
            return mr;
        });

        // when
        ManagementReviewResponse response = auditService.createReview(req, "admin");

        // then
        assertThat(response).isNotNull();
        assertThat(response.getReviewNumber()).startsWith("MR-");
        assertThat(response.getChairpersonName()).isEqualTo("강대표 대표이사");
        assertThat(response.getStatus()).isEqualTo(ManagementReviewStatus.APPROVED);
    }

    @Test
    @DisplayName("[종합 KPI] 내부심사 실시율, 미해결 지적사항, 경영검토 지표가 정상 집계된다")
    void getInternalAuditKpi_Success() {
        // given
        given(auditRepository.countPlannedAuditsBetween(any(), any())).willReturn(6L);
        given(auditRepository.countCompletedAuditsBetween(any(), any())).willReturn(5L);
        given(auditRepository.countByStatus(AuditStatus.IN_PROGRESS)).willReturn(1L);
        given(auditRepository.countByStatus(AuditStatus.REPORT_PENDING)).willReturn(0L);
        given(findingRepository.countOpenFindings()).willReturn(2L);
        given(findingRepository.countOpenCriticalMajorFindings()).willReturn(1L);
        given(findingRepository.countCapaLinkedFindings()).willReturn(1L);
        given(reviewRepository.countApprovedReviewsBetween(any(), any())).willReturn(1L);
        given(reviewRepository.findUpcomingReviews()).willReturn(Collections.emptyList());

        // when
        InternalAuditKpiResponse kpi = auditService.getInternalAuditKpi();

        // then
        assertThat(kpi).isNotNull();
        assertThat(kpi.getAnnualPlannedAudits()).isEqualTo(6L);
        assertThat(kpi.getCompletedAudits()).isEqualTo(5L);
        assertThat(kpi.getAuditExecutionRate()).isEqualTo(83.3);
        assertThat(kpi.getInProgressAudits()).isEqualTo(1L);
        assertThat(kpi.getOpenFindings()).isEqualTo(2L);
        assertThat(kpi.getCriticalMajorFindings()).isEqualTo(1L);
        assertThat(kpi.getCapaLinkedFindings()).isEqualTo(1L);
        assertThat(kpi.isRecentReviewApproved()).isTrue();
    }
}
