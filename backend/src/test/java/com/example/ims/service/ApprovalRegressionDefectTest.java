package com.example.ims.service;

import com.example.ims.dto.ApprovalActionRequestDto;
import com.example.ims.dto.ApprovalDocumentDetailDto;
import com.example.ims.entity.*;
import com.example.ims.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * 01단계: 결재 및 사후 연동 결함 특성화 및 회귀 방어 테스트
 * (DEC-09: 기존 로직 100% 보존 및 결함 방어 검증)
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ApprovalRegressionDefectTest {

    @Mock
    private ApprovalDocumentRepository documentRepository;
    @Mock
    private ApprovalStepInstanceRepository stepInstanceRepository;
    @Mock
    private ApprovalHistoryLogRepository historyLogRepository;
    @Mock
    private ApprovalDocTypeRepository docTypeRepository;
    @Mock
    private ApprovalTemplateRepository templateRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private DepartmentRoleRepository departmentRoleRepository;
    @Mock
    private NotificationRuleRepository notificationRuleRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private EmailService emailService;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private WmsInboundRepository wmsInboundRepository;
    @Mock
    private ClaimRepository claimRepository;
    @Mock
    private ProductionAuditRepository productionAuditRepository;
    @Mock
    private ManufacturerAuditRepository manufacturerAuditRepository;
    @Mock
    private ApprovalDocumentReadRepository readRepository;
    @Mock
    private NonConformanceReportRepository ncrRepository;

    @InjectMocks
    private ApprovalService approvalService;

    private User approver;
    private User submitter;
    private ApprovalDocType marketReleaseType;
    private ApprovalDocType claimReportType;

    @BeforeEach
    void setUp() {
        approver = User.builder().id(1L).username("approver").name("결재자").role("ADMIN").build();
        submitter = User.builder().id(2L).username("submitter").name("기안자").role("QUALITY").build();

        marketReleaseType = ApprovalDocType.builder()
                .id(1L)
                .code("MARKET_RELEASE")
                .name("출하승인서")
                .isActive(true)
                .build();

        claimReportType = ApprovalDocType.builder()
                .id(2L)
                .code("CLAIM_REPORT")
                .name("클레임 대책보고서")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("[회귀방어 D-3] MARKET_RELEASE 결재 완료 시 입고 상태 갱신 및 검사 결과 연동 동작 검증")
    void testMarketRelease_ApprovalHook_UpdatesInbound() {
        ApprovalDocument doc = ApprovalDocument.builder()
                .id(100L)
                .docType(marketReleaseType)
                .sourceRecordId(200L)
                .title("출하승인 요청 건")
                .status("PENDING")
                .submittedBy(submitter)
                .submittedAt(LocalDateTime.now())
                .build();

        ApprovalStepInstance step = ApprovalStepInstance.builder()
                .id(10L)
                .document(doc)
                .stepOrder(1)
                .stepType("APPROVAL")
                .assigneeUser(approver)
                .status("PENDING")
                .build();

        WmsInbound inbound = new WmsInbound();
        inbound.setId(200L);
        inbound.setOverallStatus(WmsInbound.OverallStatus.STEP4_CONTROL_COMPLETE);
        inbound.setFinalInspectionResult("적합");

        when(userRepository.findByUsername("approver")).thenReturn(Optional.of(approver));
        when(documentRepository.findById(100L)).thenReturn(Optional.of(doc));
        when(stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(100L)).thenReturn(List.of(step));
        when(stepInstanceRepository.countByDocumentIdAndStepOrderAndStatusNot(100L, 1, "APPROVED")).thenReturn(0L);
        when(documentRepository.findDetailById(100L)).thenReturn(Optional.of(doc));
        when(wmsInboundRepository.findById(200L)).thenReturn(Optional.of(inbound));

        ApprovalActionRequestDto actionDto = ApprovalActionRequestDto.builder().comment("출하 승인합니다.").build();
        approvalService.approve(100L, actionDto, "approver");

        assertEquals("APPROVED", doc.getStatus());
        assertEquals("APPROVED", step.getStatus());

        ArgumentCaptor<WmsInbound> captor = ArgumentCaptor.forClass(WmsInbound.class);
        verify(wmsInboundRepository).save(captor.capture());
        WmsInbound savedInbound = captor.getValue();
        assertEquals(WmsInbound.OverallStatus.STEP5_FINAL_COMPLETE, savedInbound.getOverallStatus());
        assertEquals("적합", savedInbound.getFinalInspectionResult());
    }

    @Test
    @DisplayName("[회귀방어 D-4] CLAIM_REPORT 결재 완료 시 클레임 상태 연동 동작 검증")
    void testClaimReport_ApprovalHook_UpdatesClaim() {
        ApprovalDocument doc = ApprovalDocument.builder()
                .id(101L)
                .docType(claimReportType)
                .sourceRecordId(300L)
                .title("클레임 대책보고서 승인 건")
                .status("PENDING")
                .submittedBy(submitter)
                .submittedAt(LocalDateTime.now())
                .build();

        ApprovalStepInstance step = ApprovalStepInstance.builder()
                .id(11L)
                .document(doc)
                .stepOrder(1)
                .stepType("APPROVAL")
                .assigneeUser(approver)
                .status("PENDING")
                .build();

        Claim claim = new Claim();
        claim.setId(300L);
        claim.setQualityStatus("4단계 (대책 수립)");

        when(userRepository.findByUsername("approver")).thenReturn(Optional.of(approver));
        when(documentRepository.findById(101L)).thenReturn(Optional.of(doc));
        when(stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(101L)).thenReturn(List.of(step));
        when(stepInstanceRepository.countByDocumentIdAndStepOrderAndStatusNot(101L, 1, "APPROVED")).thenReturn(0L);
        when(documentRepository.findDetailById(101L)).thenReturn(Optional.of(doc));
        when(claimRepository.findById(300L)).thenReturn(Optional.of(claim));

        ApprovalActionRequestDto actionDto = ApprovalActionRequestDto.builder().comment("대책 승인").build();
        approvalService.approve(101L, actionDto, "approver");

        assertEquals("APPROVED", doc.getStatus());
        ArgumentCaptor<Claim> captor = ArgumentCaptor.forClass(Claim.class);
        verify(claimRepository).save(captor.capture());
        Claim savedClaim = captor.getValue();
        assertEquals("5단계 (종결)", savedClaim.getQualityStatus());
        assertNotNull(savedClaim.getTerminationDate());
    }

    @Test
    @DisplayName("[D-3] 완제품 검사 결과가 부적합인 경우 MARKET_RELEASE 최종 승인 차단 검증")
    void testMarketRelease_ApprovalHook_RejectsUnfitInbound() {
        ApprovalDocument doc = ApprovalDocument.builder()
                .id(103L)
                .docType(marketReleaseType)
                .sourceRecordId(201L)
                .title("출하승인 요청 건(부적합 품목)")
                .status("PENDING")
                .submittedBy(submitter)
                .submittedAt(LocalDateTime.now())
                .build();

        ApprovalStepInstance step = ApprovalStepInstance.builder()
                .id(13L)
                .document(doc)
                .stepOrder(1)
                .stepType("APPROVAL")
                .assigneeUser(approver)
                .status("PENDING")
                .build();

        WmsInbound inbound = new WmsInbound();
        inbound.setId(201L);
        inbound.setOverallStatus(WmsInbound.OverallStatus.STEP4_CONTROL_COMPLETE);
        inbound.setFinalInspectionResult("부적합"); // 검사 결과 부적합!

        when(userRepository.findByUsername("approver")).thenReturn(Optional.of(approver));
        when(documentRepository.findById(103L)).thenReturn(Optional.of(doc));
        when(stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(103L)).thenReturn(List.of(step));
        when(stepInstanceRepository.countByDocumentIdAndStepOrderAndStatusNot(103L, 1, "APPROVED")).thenReturn(0L);
        when(wmsInboundRepository.findById(201L)).thenReturn(Optional.of(inbound));

        ApprovalActionRequestDto actionDto = ApprovalActionRequestDto.builder().comment("출하 승인 시도").build();

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                approvalService.approve(103L, actionDto, "approver")
        );
        assertTrue(ex.getMessage().contains("부적합"));
    }

    @Test
    @DisplayName("[D-3 & DEC-05] 완제품 검사 결과가 부적합인 경우 MARKET_RELEASE 결재 상신 자체 차단 검증")
    void testMarketRelease_SubmitApproval_RejectsUnfitInbound() {
        WmsInbound inbound = new WmsInbound();
        inbound.setId(202L);
        inbound.setFinalInspectionResult("부적합");

        when(userRepository.findByUsername("submitter")).thenReturn(Optional.of(submitter));
        when(docTypeRepository.findByCode("MARKET_RELEASE")).thenReturn(Optional.of(marketReleaseType));
        when(wmsInboundRepository.findById(202L)).thenReturn(Optional.of(inbound));

        com.example.ims.dto.ApprovalSubmitRequestDto submitDto = com.example.ims.dto.ApprovalSubmitRequestDto.builder()
                .docTypeCode("MARKET_RELEASE")
                .sourceRecordId(202L)
                .title("부적합 건 출하 결재 상신 시도")
                .build();

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                approvalService.submitApproval(submitDto, "submitter")
        );
        assertTrue(ex.getMessage().contains("부적합"));
    }

    @Test
    @DisplayName("[D-4] 원인 분석 및 대책 수립이 미완료된 클레임에 대한 CLAIM_REPORT 종결 승인 차단 검증")
    void testClaimReport_ApprovalHook_RejectsUninvestigatedClaim() {
        ApprovalDocument doc = ApprovalDocument.builder()
                .id(104L)
                .docType(claimReportType)
                .sourceRecordId(301L)
                .title("미조사 클레임 대책보고서 승인 시도")
                .status("PENDING")
                .submittedBy(submitter)
                .submittedAt(LocalDateTime.now())
                .build();

        ApprovalStepInstance step = ApprovalStepInstance.builder()
                .id(14L)
                .document(doc)
                .stepOrder(1)
                .stepType("APPROVAL")
                .assigneeUser(approver)
                .status("PENDING")
                .build();

        Claim uninvestigatedClaim = new Claim();
        uninvestigatedClaim.setId(301L);
        uninvestigatedClaim.setQualityStatus("0단계 (접수 대기)");
        uninvestigatedClaim.setRootCauseAnalysis(null);
        uninvestigatedClaim.setPreventativeAction(null);

        when(userRepository.findByUsername("approver")).thenReturn(Optional.of(approver));
        when(documentRepository.findById(104L)).thenReturn(Optional.of(doc));
        when(stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(104L)).thenReturn(List.of(step));
        when(stepInstanceRepository.countByDocumentIdAndStepOrderAndStatusNot(104L, 1, "APPROVED")).thenReturn(0L);
        when(claimRepository.findById(301L)).thenReturn(Optional.of(uninvestigatedClaim));

        ApprovalActionRequestDto actionDto = ApprovalActionRequestDto.builder().comment("승인 시도").build();

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                approvalService.approve(104L, actionDto, "approver")
        );
        assertTrue(ex.getMessage().contains("원인 분석") || ex.getMessage().contains("대책 수립"));
    }

    @Test
    @DisplayName("[D-5] 사후 연동 훅 예외 발생 시 예외 전파 및 트랜잭션 롤백 보장 검증")
    void testPostApprovalAction_ExceptionPropagated_EnsuresAtomicity() {
        ApprovalDocument doc = ApprovalDocument.builder()
                .id(102L)
                .docType(marketReleaseType)
                .sourceRecordId(999L)
                .title("출하승인 원자성 보장 테스트")
                .status("PENDING")
                .submittedBy(submitter)
                .submittedAt(LocalDateTime.now())
                .build();

        ApprovalStepInstance step = ApprovalStepInstance.builder()
                .id(12L)
                .document(doc)
                .stepOrder(1)
                .stepType("APPROVAL")
                .assigneeUser(approver)
                .status("PENDING")
                .build();

        when(userRepository.findByUsername("approver")).thenReturn(Optional.of(approver));
        when(documentRepository.findById(102L)).thenReturn(Optional.of(doc));
        when(stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(102L)).thenReturn(List.of(step));
        when(stepInstanceRepository.countByDocumentIdAndStepOrderAndStatusNot(102L, 1, "APPROVED")).thenReturn(0L);
        when(wmsInboundRepository.findById(999L)).thenThrow(new RuntimeException("DB Connection Timeout"));

        ApprovalActionRequestDto actionDto = ApprovalActionRequestDto.builder().comment("승인").build();

        // D-5 해결: 연동 오류가 삼켜지지 않고 예외로 전파되어 트랜잭션 롤백 보장
        assertThrows(RuntimeException.class, () -> approvalService.approve(102L, actionDto, "approver"));
    }
}
