package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.DesignControlItemRepository;
import com.example.ims.repository.DesignProjectRepository;
import com.example.ims.repository.DesignReviewRecordRepository;
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
class DesignControlServiceTest {

    @Mock
    private DesignProjectRepository projectRepository;

    @Mock
    private DesignControlItemRepository controlItemRepository;

    @Mock
    private DesignReviewRecordRepository reviewRecordRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private DesignControlService service;

    private DesignProject sampleProject;
    private DesignControlItem sampleInput;
    private DesignControlItem sampleOutput;
    private DesignControlItem sampleVerification;
    private DesignReviewRecord sampleReview;

    @BeforeEach
    void setUp() {
        sampleProject = DesignProject.builder()
                .id(1L)
                .projectCode("DP-2026-001")
                .projectName("스마트 인슐린 펜 인젝터 설계개발")
                .targetDeviceName("스마트 인슐린 펜 인젝터")
                .deviceClassification("CLASS_II")
                .projectLeader("홍길동 수석연구원")
                .department("의료기기연구팀")
                .startDate(LocalDate.of(2026, 1, 10))
                .targetCompletionDate(LocalDate.of(2026, 7, 10))
                .currentPhase(DesignPhase.VERIFICATION)
                .status(DesignProjectStatus.ACTIVE)
                .dhfNumber("DHF-2026-001")
                .dhfStatus("OPEN")
                .isDeleted(false)
                .controlItems(new ArrayList<>())
                .reviewRecords(new ArrayList<>())
                .build();

        sampleInput = DesignControlItem.builder()
                .id(10L)
                .project(sampleProject)
                .itemCode("DI-001")
                .itemType(DesignItemType.DESIGN_INPUT)
                .title("투여량 정밀 제어")
                .specification("0.1단위 조절 오차 2% 이내")
                .responsiblePerson("홍길동")
                .status("APPROVED")
                .riskHazardCode("HAZ-002")
                .isDeleted(false)
                .build();

        sampleOutput = DesignControlItem.builder()
                .id(20L)
                .project(sampleProject)
                .itemCode("DO-001")
                .itemType(DesignItemType.DESIGN_OUTPUT)
                .title("듀얼 엔코더 PCB 회로도")
                .specification("4-Layer PCB 거버 파일")
                .parentInputItemCode("DI-001")
                .responsiblePerson("강전자")
                .status("APPROVED")
                .isDeleted(false)
                .build();

        sampleVerification = DesignControlItem.builder()
                .id(30L)
                .project(sampleProject)
                .itemCode("DV-001")
                .itemType(DesignItemType.DESIGN_VERIFICATION)
                .title("용량 전달 정밀도 시험")
                .specification("ISO 11608-1 시험")
                .verificationMethod("공인시험기관 위탁")
                .verificationResult(VerificationResultStatus.PASS)
                .parentInputItemCode("DI-001")
                .responsiblePerson("김품질")
                .status("VERIFIED")
                .isDeleted(false)
                .build();

        sampleReview = DesignReviewRecord.builder()
                .id(100L)
                .project(sampleProject)
                .reviewNumber("DR-001")
                .reviewPhase(DesignPhase.PLANNING)
                .reviewTitle("설계계획서 승인 심의")
                .reviewDate(LocalDate.of(2026, 1, 15))
                .attendees("홍길동, 김품질")
                .reviewSummary("계획 승인")
                .gateDecision(GateDecision.GO)
                .isDeleted(false)
                .build();
    }

    @Test
    @DisplayName("설계 프로젝트 목록 페이징 조회 성공")
    void getProjects_success() {
        Page<DesignProject> page = new PageImpl<>(List.of(sampleProject));
        when(projectRepository.searchProjects(any(), any(), any(), any(), any())).thenReturn(page);
        when(controlItemRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(sampleInput, sampleOutput, sampleVerification));
        when(reviewRecordRepository.countByProjectId(1L)).thenReturn(1L);

        Page<DesignProjectResponse> responses = service.getProjects("인슐린", DesignPhase.VERIFICATION, DesignProjectStatus.ACTIVE, "OPEN", 0, 10);

        assertThat(responses).isNotNull();
        assertThat(responses.getContent()).hasSize(1);
        DesignProjectResponse res = responses.getContent().get(0);
        assertThat(res.getProjectCode()).isEqualTo("DP-2026-001");
        assertThat(res.getCurrentPhaseLabel()).isEqualTo("설계 검증");
        assertThat(res.getTotalControlItemCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("설계 프로젝트 단건 조회 성공")
    void getProjectById_success() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(sampleProject));
        when(controlItemRepository.findByProjectIdOrderByIdAsc(1L)).thenReturn(List.of(sampleInput));
        when(reviewRecordRepository.countByProjectId(1L)).thenReturn(1L);

        DesignProjectResponse response = service.getProjectById(1L);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getProjectName()).contains("인슐린");
        assertThat(response.getDhfNumber()).isEqualTo("DHF-2026-001");
    }

    @Test
    @DisplayName("존재하지 않는 프로젝트 조회 시 예외 발생")
    void getProjectById_notFound() {
        when(projectRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getProjectById(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("존재하지 않거나 삭제된");
    }

    @Test
    @DisplayName("프로젝트 신규 등록 - 코드 자동 생성 및 DHF 생성")
    void createProject_success() {
        DesignProjectRequest req = DesignProjectRequest.builder()
                .projectName("신규 인공관절 설계개발")
                .targetDeviceName("티타늄 고관절 전치환체")
                .deviceClassification("CLASS_III")
                .projectLeader("박바이오")
                .department("정형외과연구팀")
                .startDate(LocalDate.now())
                .targetCompletionDate(LocalDate.now().plusMonths(12))
                .build();

        when(projectRepository.count()).thenReturn(1L);
        when(projectRepository.existsByProjectCode(any())).thenReturn(false);
        when(projectRepository.existsByDhfNumber(any())).thenReturn(false);
        when(projectRepository.save(any(DesignProject.class))).thenAnswer(inv -> {
            DesignProject p = inv.getArgument(0);
            p.setId(2L);
            return p;
        });

        DesignProjectResponse response = service.createProject(req, "admin");

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(2L);
        assertThat(response.getProjectName()).isEqualTo("신규 인공관절 설계개발");
        verify(projectRepository).save(any(DesignProject.class));
    }

    @Test
    @DisplayName("프로젝트 수정 성공")
    void updateProject_success() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(sampleProject));
        when(projectRepository.save(any(DesignProject.class))).thenAnswer(inv -> inv.getArgument(0));

        DesignProjectRequest updateReq = DesignProjectRequest.builder()
                .projectName("스마트 인슐린 펜 인젝터 설계개발 (수정)")
                .targetDeviceName("스마트 인슐린 펜 인젝터 v2")
                .projectLeader("홍길동 수석")
                .department("의료기기연구본부")
                .startDate(sampleProject.getStartDate())
                .targetCompletionDate(sampleProject.getTargetCompletionDate())
                .currentPhase(DesignPhase.VALIDATION)
                .status(DesignProjectStatus.ACTIVE)
                .build();

        DesignProjectResponse updated = service.updateProject(1L, updateReq, "admin");

        assertThat(updated.getProjectName()).contains("(수정)");
        assertThat(sampleProject.getCurrentPhase()).isEqualTo(DesignPhase.VALIDATION);
    }

    @Test
    @DisplayName("프로젝트 소프트 딜리트 성공")
    void deleteProject_success() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(sampleProject));

        service.deleteProject(1L, "admin");

        assertThat(sampleProject.getIsDeleted()).isTrue();
        assertThat(sampleProject.getDeletedAt()).isNotNull();
        verify(projectRepository).save(sampleProject);
    }

    @Test
    @DisplayName("단계 전이 (Advance Phase) 및 완료 처리")
    void advancePhase_success() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(sampleProject));
        when(projectRepository.save(any(DesignProject.class))).thenAnswer(inv -> inv.getArgument(0));

        DesignProjectResponse res = service.advancePhase(1L, DesignPhase.COMPLETED, "admin");

        assertThat(sampleProject.getCurrentPhase()).isEqualTo(DesignPhase.COMPLETED);
        assertThat(sampleProject.getStatus()).isEqualTo(DesignProjectStatus.COMPLETED);
        assertThat(sampleProject.getActualCompletionDate()).isNotNull();
    }

    @Test
    @DisplayName("DHF 상태 변경 (OPEN -> FROZEN)")
    void updateDhfStatus_success() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(sampleProject));
        when(projectRepository.save(any(DesignProject.class))).thenAnswer(inv -> inv.getArgument(0));

        DesignProjectResponse res = service.updateDhfStatus(1L, "FROZEN", "admin");

        assertThat(sampleProject.getDhfStatus()).isEqualTo("FROZEN");
    }

    @Test
    @DisplayName("설계통제 항목 등록 성공")
    void addControlItem_success() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(sampleProject));
        when(controlItemRepository.countByProjectId(1L)).thenReturn(2L);
        when(controlItemRepository.existsByProjectIdAndItemCode(eq(1L), any())).thenReturn(false);
        when(controlItemRepository.save(any(DesignControlItem.class))).thenAnswer(inv -> {
            DesignControlItem item = inv.getArgument(0);
            item.setId(50L);
            return item;
        });

        DesignControlItemRequest req = DesignControlItemRequest.builder()
                .itemType(DesignItemType.DESIGN_VERIFICATION)
                .title("전자파 적합성 시험 (EMC)")
                .specification("IEC 60601-1-2 EMC 시험 합격")
                .responsiblePerson("강전자")
                .build();

        DesignControlItem saved = service.addControlItem(1L, req, "admin");

        assertThat(saved.getId()).isEqualTo(50L);
        assertThat(saved.getItemCode()).startsWith("DV-");
        assertThat(saved.getTitle()).isEqualTo("전자파 적합성 시험 (EMC)");
    }

    @Test
    @DisplayName("설계 심의 기록 등록 성공")
    void addReviewRecord_success() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(sampleProject));
        when(reviewRecordRepository.countByProjectId(1L)).thenReturn(1L);
        when(reviewRecordRepository.existsByProjectIdAndReviewNumber(eq(1L), any())).thenReturn(false);
        when(reviewRecordRepository.save(any(DesignReviewRecord.class))).thenAnswer(inv -> {
            DesignReviewRecord record = inv.getArgument(0);
            record.setId(200L);
            return record;
        });

        DesignReviewRecordRequest req = DesignReviewRecordRequest.builder()
                .reviewPhase(DesignPhase.VERIFICATION)
                .reviewTitle("검증 시험 결과 심의")
                .reviewDate(LocalDate.now())
                .attendees("홍길동, 김품질, 강전자")
                .reviewSummary("성적서 4종 검토 및 적합 승인")
                .gateDecision(GateDecision.GO)
                .build();

        DesignReviewRecord saved = service.addReviewRecord(1L, req, "admin");

        assertThat(saved.getId()).isEqualTo(200L);
        assertThat(saved.getReviewNumber()).startsWith("DR-");
        assertThat(saved.getGateDecision()).isEqualTo(GateDecision.GO);
    }

    @Test
    @DisplayName("요구사항 추적성 매트릭스(RTM) 계산 검증")
    void getTraceabilityMatrix_success() {
        when(controlItemRepository.findByProjectIdOrderByIdAsc(1L))
                .thenReturn(List.of(sampleInput, sampleOutput, sampleVerification));

        List<DesignTraceabilityMatrixDto> matrix = service.getTraceabilityMatrix(1L);

        assertThat(matrix).hasSize(1);
        DesignTraceabilityMatrixDto row = matrix.get(0);
        assertThat(row.getInputItemCode()).isEqualTo("DI-001");
        assertThat(row.getOutputItemCode()).isEqualTo("DO-001");
        assertThat(row.getVerificationItemCode()).isEqualTo("DV-001");
        assertThat(row.getVerificationResult()).isEqualTo("PASS");
        assertThat(row.getRiskHazardCode()).isEqualTo("HAZ-002");
    }

    @Test
    @DisplayName("종합 KPI 산출 검증")
    void getDesignKpis_success() {
        when(projectRepository.count()).thenReturn(2L);
        when(projectRepository.countByStatus(DesignProjectStatus.ACTIVE)).thenReturn(2L);
        when(projectRepository.countByDhfStatus("OPEN")).thenReturn(2L);
        when(projectRepository.countByDhfStatus("FROZEN")).thenReturn(0L);
        when(reviewRecordRepository.countByGateDecision(any())).thenReturn(0L);
        when(controlItemRepository.count()).thenReturn(6L);
        List<Object[]> verResultsList = new ArrayList<>();
        verResultsList.add(new Object[]{VerificationResultStatus.PASS, 4L});
        verResultsList.add(new Object[]{VerificationResultStatus.PENDING, 2L});
        when(controlItemRepository.countGlobalVerificationResultGroup()).thenReturn(verResultsList);

        List<Object[]> phaseList = new ArrayList<>();
        phaseList.add(new Object[]{DesignPhase.VERIFICATION, 1L});
        phaseList.add(new Object[]{DesignPhase.INPUT, 1L});
        when(projectRepository.countByPhaseGroup()).thenReturn(phaseList);

        List<Object[]> statusList = new ArrayList<>();
        statusList.add(new Object[]{DesignProjectStatus.ACTIVE, 2L});
        when(projectRepository.countByStatusGroup()).thenReturn(statusList);

        DesignKpiResponse kpi = service.getDesignKpis();

        assertThat(kpi.getTotalProjects()).isEqualTo(2L);
        assertThat(kpi.getActiveProjects()).isEqualTo(2L);
        assertThat(kpi.getOverallVerificationPassRate()).isEqualTo(100.0);
        assertThat(kpi.getOpenDhfCount()).isEqualTo(2L);
    }
}
