package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.CsvDefectRecordRepository;
import com.example.ims.repository.CsvGoLiveApprovalRepository;
import com.example.ims.repository.CsvTestProtocolRepository;
import com.example.ims.repository.CsvValidationProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CsvValidationServiceTest {

    @Mock
    private CsvValidationProjectRepository projectRepository;

    @Mock
    private CsvTestProtocolRepository protocolRepository;

    @Mock
    private CsvDefectRecordRepository defectRepository;

    @Mock
    private CsvGoLiveApprovalRepository goLiveRepository;

    @InjectMocks
    private CsvValidationService csvService;

    private CsvValidationProject testProject;

    @BeforeEach
    void setUp() {
        testProject = CsvValidationProject.builder()
                .id(1L)
                .projectCode("CSV-2026-TEST")
                .projectName("테스트 CSV 프로젝트")
                .systemVersion("v1.0.0")
                .gampCategory(GampCategory.CATEGORY_5_CUSTOM)
                .validationLead("이운영")
                .qaManager("김품질")
                .projectStatus(CsvProjectStatus.IQ_EXECUTING)
                .isDeleted(false)
                .build();
    }

    @Test
    @DisplayName("[프로젝트 등록] 신규 CSV 밸리데이션 프로젝트 생성 성공")
    void testCreateProject_Success() {
        CsvProjectRequest req = CsvProjectRequest.builder()
                .projectCode("CSV-2026-NEW")
                .projectName("신규 eQMS 밸리데이션")
                .systemVersion("v1.1.0")
                .gampCategory(GampCategory.CATEGORY_4_CONFIGURED)
                .validationLead("박책임")
                .qaManager("최품질")
                .build();

        when(projectRepository.save(any(CsvValidationProject.class))).thenAnswer(invocation -> {
            CsvValidationProject p = invocation.getArgument(0);
            p.setId(10L);
            return p;
        });

        CsvProjectResponse res = csvService.createProject(req, "tester");

        assertThat(res).isNotNull();
        assertThat(res.getProjectCode()).isEqualTo("CSV-2026-NEW");
        assertThat(res.getGampCategory()).isEqualTo(GampCategory.CATEGORY_4_CONFIGURED);
    }

    @Test
    @DisplayName("[프로토콜 등록] IQ/OQ/PQ 시험 항목 등록 및 결과 판정")
    void testCreateProtocol_Success() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(testProject));
        when(protocolRepository.save(any(CsvTestProtocol.class))).thenAnswer(invocation -> {
            CsvTestProtocol p = invocation.getArgument(0);
            p.setId(101L);
            return p;
        });

        CsvProtocolRequest req = CsvProtocolRequest.builder()
                .projectId(1L)
                .protocolNumber("VAL-OQ-101")
                .testPhase(ValidationTestPhase.OQ)
                .testTitle("서명 재인증 가드 시험")
                .resultStatus(TestResultStatus.PASS)
                .executedBy("박테스터")
                .build();

        CsvProtocolResponse res = csvService.createProtocol(req, "admin");

        assertThat(res).isNotNull();
        assertThat(res.getProtocolNumber()).isEqualTo("VAL-OQ-101");
        assertThat(res.getResultStatus()).isEqualTo(TestResultStatus.PASS);
    }

    @Test
    @DisplayName("[결함 관리] 결함 등록 및 조치 완료")
    void testCreateDefect_Success() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(testProject));
        when(defectRepository.save(any(CsvDefectRecord.class))).thenAnswer(invocation -> {
            CsvDefectRecord d = invocation.getArgument(0);
            d.setId(201L);
            return d;
        });

        CsvDefectRequest req = CsvDefectRequest.builder()
                .projectId(1L)
                .defectNumber("DEF-2026-001")
                .defectTitle("UI 반응형 정렬 결함")
                .severity(DefectSeverity.MINOR)
                .description("헤더 정렬 오차")
                .status(DefectStatus.OPEN)
                .build();

        CsvDefectResponse res = csvService.createDefect(req, "tester");

        assertThat(res).isNotNull();
        assertThat(res.getDefectNumber()).isEqualTo("DEF-2026-001");
        assertThat(res.getSeverity()).isEqualTo(DefectSeverity.MINOR);
    }

    @Test
    @DisplayName("[Guard 1 - Go-Live 차단] 미완료(PENDING) 또는 불합격(FAIL) 프로토콜 존재 시 Go-Live 승인 차단")
    void testGoLiveReadinessGuard_BlockedWhenProtocolPendingOrFail() {
        CsvTestProtocol failProtocol = CsvTestProtocol.builder()
                .id(1L)
                .protocolNumber("VAL-OQ-001")
                .testTitle("결재 가드 시험")
                .resultStatus(TestResultStatus.FAIL)
                .isDeleted(false)
                .build();

        when(protocolRepository.findByProjectIdAndIsDeletedFalseOrderByDisplayOrderAsc(1L))
                .thenReturn(List.of(failProtocol));

        assertThatThrownBy(() -> csvService.validateGoLiveReadiness(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Go-Live 승인 불가: 미완료(PENDING) 또는 불합격(FAIL) 상태의 테스트 프로토콜이 존재합니다");
    }

    @Test
    @DisplayName("[Guard 1 - Go-Live 차단] 미해결(OPEN) 상태인 CRITICAL 결함 존재 시 Go-Live 승인 차단")
    void testGoLiveReadinessGuard_BlockedWhenCriticalDefectOpen() {
        when(protocolRepository.findByProjectIdAndIsDeletedFalseOrderByDisplayOrderAsc(1L))
                .thenReturn(new ArrayList<>());

        CsvDefectRecord criticalDefect = CsvDefectRecord.builder()
                .id(1L)
                .defectNumber("DEF-CRITICAL-01")
                .defectTitle("데이터 유실 위험 결함")
                .severity(DefectSeverity.CRITICAL)
                .status(DefectStatus.OPEN)
                .isDeleted(false)
                .build();

        when(defectRepository.findByProjectIdAndIsDeletedFalseOrderByReportedAtDesc(1L))
                .thenReturn(List.of(criticalDefect));

        assertThatThrownBy(() -> csvService.validateGoLiveReadiness(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Go-Live 승인 불가: 미해결된 치명적(CRITICAL) 또는 중대(MAJOR) 결함이 존재합니다");
    }

    @Test
    @DisplayName("[Guard 2 - 3자 서명 가드] 시스템소유자/QA/경영진 중 1명이라도 서명 누락 시 Go-Live 인가 차단")
    void testThreePartySignatureGuard_BlockedWhenSignaturesIncomplete() {
        CsvGoLiveRequest req = CsvGoLiveRequest.builder()
                .projectId(1L)
                .releaseVersion("v1.0.0")
                .approvalTitle("Go-Live 헌장")
                .systemOwnerName("이운영")
                .systemOwnerSignedAt(LocalDateTime.now())
                .qaLeadName("김품질")
                .qaLeadSignedAt(LocalDateTime.now())
                .executiveName("홍대표")
                .executiveSignedAt(null) // 누락
                .finalApprovalStatus("APPROVED")
                .build();

        assertThatThrownBy(() -> csvService.validateThreePartySignatures(req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Go-Live 최종 운영 승인 불가: 시스템 관리자(System Owner), 품질관리 책임자(QA Lead), 최고경영자(Executive Sponsor) 3인의 필수 전자서명이 모두 완료되어야");
    }

    @Test
    @DisplayName("[Go-Live 최종 승인] 모든 요건 충족 및 3자 전자서명 완료 시 프로젝트 OPERATIONAL 전환 성공")
    void testGoLiveApproval_SuccessAndTransitionToOperational() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(testProject));
        when(protocolRepository.findByProjectIdAndIsDeletedFalseOrderByDisplayOrderAsc(1L)).thenReturn(List.of(
                CsvTestProtocol.builder().resultStatus(TestResultStatus.PASS).build()
        ));
        when(defectRepository.findByProjectIdAndIsDeletedFalseOrderByReportedAtDesc(1L)).thenReturn(List.of(
                CsvDefectRecord.builder().status(DefectStatus.RESOLVED).severity(DefectSeverity.MAJOR).build()
        ));
        when(goLiveRepository.findByProjectIdAndIsDeletedFalse(1L)).thenReturn(Optional.empty());
        when(goLiveRepository.save(any(CsvGoLiveApproval.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDateTime now = LocalDateTime.now();
        CsvGoLiveRequest req = CsvGoLiveRequest.builder()
                .projectId(1L)
                .releaseVersion("v1.0.0-PROD")
                .approvalTitle("정식 가동 릴리즈 헌장")
                .systemOwnerName("이운영")
                .systemOwnerSignedAt(now)
                .systemOwnerSignatureNumber("SIG-SYS-01")
                .qaLeadName("김품질")
                .qaLeadSignedAt(now)
                .qaLeadSignatureNumber("SIG-QA-01")
                .executiveName("홍길동")
                .executiveSignedAt(now)
                .executiveSignatureNumber("SIG-CEO-01")
                .finalApprovalStatus("APPROVED")
                .goLiveDate(LocalDate.now())
                .build();

        CsvGoLiveResponse res = csvService.createOrUpdateGoLiveApproval(req, "admin");

        assertThat(res).isNotNull();
        assertThat(res.getFinalApprovalStatus()).isEqualTo("APPROVED");
        assertThat(res.getIsFullySigned()).isTrue();
        assertThat(testProject.getProjectStatus()).isEqualTo(CsvProjectStatus.OPERATIONAL);
    }

    @Test
    @DisplayName("[CSV KPI] 6대 지표 정상 산출")
    void testGetKpi_Success() {
        when(projectRepository.countByIsDeletedFalse()).thenReturn(1L);
        when(protocolRepository.countByIsDeletedFalse()).thenReturn(13L);
        when(protocolRepository.countByResultStatusAndIsDeletedFalse(TestResultStatus.PASS)).thenReturn(13L);
        when(defectRepository.countByStatusAndIsDeletedFalse(DefectStatus.OPEN)).thenReturn(0L);
        when(defectRepository.countByStatusAndIsDeletedFalse(DefectStatus.ACCEPTED_RISK)).thenReturn(1L);
        when(goLiveRepository.findByIsDeletedFalseOrderByCreatedAtDesc()).thenReturn(List.of(
                CsvGoLiveApproval.builder().finalApprovalStatus("APPROVED").build()
        ));

        CsvKpiResponse kpi = csvService.getKpi();

        assertThat(kpi).isNotNull();
        assertThat(kpi.getTotalProjects()).isEqualTo(1L);
        assertThat(kpi.getTotalProtocols()).isEqualTo(13L);
        assertThat(kpi.getPassRate()).isEqualTo(100.0);
        assertThat(kpi.getOpenDefects()).isEqualTo(0L);
        assertThat(kpi.getAcceptedRisks()).isEqualTo(1L);
        assertThat(kpi.getGoLiveStatus()).isEqualTo("APPROVED");
        assertThat(kpi.getGoLiveReadinessRate()).isEqualTo(100.0);
    }
}
