package com.example.ims.service;

import com.example.ims.dto.ApprovalActionRequestDto;
import com.example.ims.dto.ApprovalDocumentDetailDto;
import com.example.ims.dto.ApprovalSubmitRequestDto;
import com.example.ims.entity.*;
import com.example.ims.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ApprovalServiceTest {

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
    private ApprovalDocumentReadRepository readRepository;

    @InjectMocks
    private ApprovalService approvalService;

    private User submitter;
    private User deptHead;
    private Department dept;
    private DepartmentRole deptRole;
    private ApprovalDocType docType;
    private ApprovalTemplate template;

    @BeforeEach
    void setUp() {
        submitter = User.builder()
                .id(1L)
                .username("submitter")
                .name("기안자")
                .companyName("더파운더즈")
                .department("품질")
                .role("ROLE_USER")
                .enabled(true)
                .build();

        deptHead = User.builder()
                .id(2L)
                .username("depthead")
                .name("부서장")
                .companyName("더파운더즈")
                .department("품질")
                .role("ROLE_USER")
                .enabled(true)
                .build();

        dept = Department.builder()
                .id(10L)
                .companyName("더파운더즈")
                .code("QC")
                .name("품질")
                .isActive(true)
                .build();

        deptRole = DepartmentRole.builder()
                .id(100L)
                .department(dept)
                .roleCode("DEPT_HEAD")
                .user(deptHead)
                .isActive(true)
                .build();

        docType = ApprovalDocType.builder()
                .id(1L)
                .code("PROD_AUDIT")
                .name("생산감리")
                .sourceTable("production_audits")
                .isActive(true)
                .build();

        template = ApprovalTemplate.builder()
                .id(1L)
                .docType(docType)
                .version(1)
                .isCurrent(true)
                .createdBy(deptHead)
                .steps(new ArrayList<>())
                .build();

        ApprovalTemplateStep step1 = ApprovalTemplateStep.builder()
                .id(1L)
                .template(template)
                .stepOrder(1)
                .stepType("APPROVAL")
                .assigneeType("SUBMITTER_MANAGER")
                .isRequired(true)
                .build();

        template.getSteps().add(step1);
    }

    @Test
    @DisplayName("결재 상신 - 상신자 부서장 자동 resolve 및 step_instance 생성 성공")
    void testSubmitApproval_Success() {
        when(userRepository.findByUsername("submitter")).thenReturn(Optional.of(submitter));
        when(docTypeRepository.findByCode("PROD_AUDIT")).thenReturn(Optional.of(docType));
        when(templateRepository.findByDocTypeCodeAndIsCurrentTrue("PROD_AUDIT")).thenReturn(Optional.of(template));
        when(documentRepository.findFirstByDocTypeCodeAndSourceRecordIdAndStatusInOrderByCreatedAtDesc(anyString(), anyLong(), anyList()))
                .thenReturn(Optional.empty());

        when(departmentRepository.findByCompanyNameAndName("더파운더즈", "품질")).thenReturn(Optional.of(dept));
        when(departmentRoleRepository.findByDepartmentIdAndRoleCodeAndIsActiveTrue(10L, "DEPT_HEAD"))
                .thenReturn(Optional.of(deptRole));

        ApprovalDocument savedDoc = ApprovalDocument.builder()
                .id(500L)
                .docType(docType)
                .sourceRecordId(101L)
                .template(template)
                .title("생산감리 결재 요청")
                .status("PENDING")
                .submittedBy(submitter)
                .submittedAt(LocalDateTime.now())
                .stepInstances(new ArrayList<>())
                .build();

        when(documentRepository.save(any(ApprovalDocument.class))).thenReturn(savedDoc);
        when(stepInstanceRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));

        when(documentRepository.findDetailById(500L)).thenReturn(Optional.of(savedDoc));

        ApprovalSubmitRequestDto request = ApprovalSubmitRequestDto.builder()
                .docTypeCode("PROD_AUDIT")
                .sourceRecordId(101L)
                .title("생산감리 결재 요청")
                .comment("1차 생산분 감리 결과 결재 요청드립니다.")
                .build();

        ApprovalDocumentDetailDto result = approvalService.submitApproval(request, "submitter");

        assertNotNull(result);
        assertEquals(500L, result.getId());
        assertEquals("PENDING", result.getStatus());
        verify(documentRepository).save(any(ApprovalDocument.class));
        verify(historyLogRepository).save(any(ApprovalHistoryLog.class));
    }

    @Test
    @DisplayName("결재 승인 - 최종 단계 승인 시 문서 완료 상태 전이")
    void testApprove_FinalStep_Success() {
        ApprovalDocument doc = ApprovalDocument.builder()
                .id(500L)
                .docType(docType)
                .sourceRecordId(101L)
                .template(template)
                .title("테스트 결재")
                .status("PENDING")
                .submittedBy(submitter)
                .submittedAt(LocalDateTime.now())
                .build();

        ApprovalStepInstance step1 = ApprovalStepInstance.builder()
                .id(1001L)
                .document(doc)
                .stepOrder(1)
                .stepType("APPROVAL")
                .assigneeUser(deptHead)
                .status("PENDING")
                .build();

        when(userRepository.findByUsername("depthead")).thenReturn(Optional.of(deptHead));
        when(documentRepository.findById(500L)).thenReturn(Optional.of(doc));
        when(stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(500L)).thenReturn(List.of(step1));
        when(stepInstanceRepository.countByDocumentIdAndStepOrderAndStatusNot(500L, 1, "APPROVED")).thenReturn(0L);
        when(documentRepository.findDetailById(500L)).thenReturn(Optional.of(doc));

        ApprovalActionRequestDto actionDto = ApprovalActionRequestDto.builder()
                .comment("확인하였습니다. 승인합니다.")
                .build();

        ApprovalDocumentDetailDto detail = approvalService.approve(500L, actionDto, "depthead");

        assertEquals("APPROVED", step1.getStatus());
        assertEquals("APPROVED", doc.getStatus());
        assertNotNull(doc.getCompletedAt());
        verify(stepInstanceRepository).save(step1);
        verify(documentRepository).save(doc);
    }

    @Test
    @DisplayName("결재 반려 - 사유 입력 필수 및 이후 단계 SKIPPED 전이")
    void testReject_WithComment_Success() {
        ApprovalDocument doc = ApprovalDocument.builder()
                .id(500L)
                .docType(docType)
                .sourceRecordId(101L)
                .template(template)
                .title("테스트 결재")
                .status("PENDING")
                .submittedBy(submitter)
                .submittedAt(LocalDateTime.now())
                .build();

        ApprovalStepInstance step1 = ApprovalStepInstance.builder()
                .id(1001L)
                .document(doc)
                .stepOrder(1)
                .stepType("APPROVAL")
                .assigneeUser(deptHead)
                .status("PENDING")
                .build();

        when(userRepository.findByUsername("depthead")).thenReturn(Optional.of(deptHead));
        when(documentRepository.findById(500L)).thenReturn(Optional.of(doc));
        when(stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(500L)).thenReturn(List.of(step1));
        when(documentRepository.findDetailById(500L)).thenReturn(Optional.of(doc));

        ApprovalActionRequestDto actionDto = ApprovalActionRequestDto.builder()
                .comment("외관 결함 보완 후 재상신 필요")
                .build();

        ApprovalDocumentDetailDto detail = approvalService.reject(500L, actionDto, "depthead");

        assertEquals("REJECTED", step1.getStatus());
        assertEquals("REJECTED", doc.getStatus());
        assertNotNull(doc.getCompletedAt());
        verify(stepInstanceRepository).save(step1);
        verify(documentRepository).save(doc);
    }

    @Test
    @DisplayName("결재 반려 - 사유 미입력 시 예외 발생 검증")
    void testReject_NoComment_ThrowsException() {
        ApprovalActionRequestDto actionDto = ApprovalActionRequestDto.builder().comment("").build();

        assertThrows(IllegalArgumentException.class, () -> {
            approvalService.reject(500L, actionDto, "depthead");
        });
    }

    @Test
    @DisplayName("결재 회수 - 상신자 본인이 미처리 상태에서 회수 성공")
    void testRecall_Success() {
        ApprovalDocument doc = ApprovalDocument.builder()
                .id(500L)
                .docType(docType)
                .sourceRecordId(101L)
                .template(template)
                .title("테스트 결재")
                .status("PENDING")
                .submittedBy(submitter)
                .submittedAt(LocalDateTime.now())
                .build();

        ApprovalStepInstance step1 = ApprovalStepInstance.builder()
                .id(1001L)
                .document(doc)
                .stepOrder(1)
                .stepType("APPROVAL")
                .assigneeUser(deptHead)
                .status("PENDING")
                .build();

        when(userRepository.findByUsername("submitter")).thenReturn(Optional.of(submitter));
        when(documentRepository.findById(500L)).thenReturn(Optional.of(doc));
        when(stepInstanceRepository.findByDocumentIdOrderByStepOrderAscIdAsc(500L)).thenReturn(List.of(step1));
        when(documentRepository.findDetailById(500L)).thenReturn(Optional.of(doc));

        ApprovalDocumentDetailDto detail = approvalService.recall(500L, "submitter");

        assertEquals("RECALLED", doc.getStatus());
        assertEquals("SKIPPED", step1.getStatus());
        verify(documentRepository).save(doc);
    }
}
