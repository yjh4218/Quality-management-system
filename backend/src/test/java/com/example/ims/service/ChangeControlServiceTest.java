package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.ChangeActionItemRepository;
import com.example.ims.repository.ChangeRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ChangeControlServiceTest {

    @Mock
    private ChangeRequestRepository changeRequestRepository;

    @Mock
    private ChangeActionItemRepository changeActionItemRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private ChangeControlService service;

    private ChangeRequest sampleCr;
    private ChangeActionItem sampleItem;

    @BeforeEach
    void setUp() {
        sampleCr = ChangeRequest.builder()
                .id(1L)
                .changeNumber("CR-202610-001")
                .title("배터리 사양 변경")
                .category(ChangeCategory.PRODUCT)
                .urgency(ChangeUrgency.STANDARD)
                .status(ChangeStatus.DRAFT)
                .initiatorName("홍길동")
                .department("연구개발팀")
                .requestDate(LocalDate.now())
                .changeReason("단종으로 인한 대체 배터리 승인")
                .currentState("350mAh 단일 PCM")
                .proposedChange("400mAh 듀얼 보호회로")
                .isDeleted(false)
                .actionItems(new ArrayList<>())
                .build();

        sampleItem = ChangeActionItem.builder()
                .id(10L)
                .changeRequest(sampleCr)
                .actionOrder(1)
                .actionTitle("시험성적서 접수")
                .assignedPerson("강전자")
                .dueDate(LocalDate.now().plusDays(10))
                .status("PENDING")
                .isDeleted(false)
                .build();
    }

    @Test
    @DisplayName("변경요청서 신규 생성 - 자동 채번 및 기본값 설정 성공")
    void createChangeRequest_Success() {
        ChangeRequestRequest dto = ChangeRequestRequest.builder()
                .title("신규 배터리 변경")
                .category(ChangeCategory.PRODUCT)
                .urgency(ChangeUrgency.STANDARD)
                .status(ChangeStatus.DRAFT)
                .initiatorName("홍길동")
                .department("R&D")
                .requestDate(LocalDate.now())
                .changeReason("원자재 개선")
                .currentState("이전 사양")
                .proposedChange("개선 사양")
                .build();

        when(changeRequestRepository.countByIsDeletedFalse()).thenReturn(5L);
        when(changeRequestRepository.existsByChangeNumberAndIsDeletedFalse(anyString())).thenReturn(false);
        when(changeRequestRepository.save(any(ChangeRequest.class))).thenAnswer(i -> {
            ChangeRequest r = i.getArgument(0);
            r.setId(99L);
            return r;
        });

        ChangeRequestResponse result = service.createChangeRequest(dto, "admin");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(99L);
        assertThat(result.getChangeNumber()).startsWith("CR-");
        assertThat(result.getTitle()).isEqualTo("신규 배터리 변경");
        verify(changeRequestRepository, times(1)).save(any(ChangeRequest.class));
        verify(auditLogService, times(1)).logAction(eq("admin"), eq("CREATE"), anyString(), anyString());
    }

    @Test
    @DisplayName("변경요청서 상세 조회 - 성공")
    void getChangeRequestById_Success() {
        when(changeRequestRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sampleCr));

        ChangeRequestResponse result = service.getChangeRequestById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getChangeNumber()).isEqualTo("CR-202610-001");
        assertThat(result.getTitle()).isEqualTo("배터리 사양 변경");
    }

    @Test
    @DisplayName("존재하지 않는 변경요청서 조회 시 예외 발생")
    void getChangeRequestById_NotFound() {
        when(changeRequestRepository.findByIdAndIsDeletedFalse(999L)).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class, () -> service.getChangeRequestById(999L));
    }

    @Test
    @DisplayName("변경요청서 소프트 삭제 - isDeleted=true 설정")
    void deleteChangeRequest_Success() {
        when(changeRequestRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sampleCr));

        service.deleteChangeRequest(1L, "admin");

        assertThat(sampleCr.getIsDeleted()).isTrue();
        assertThat(sampleCr.getDeletedAt()).isNotNull();
        verify(auditLogService, times(1)).logAction(eq("admin"), eq("DELETE"), anyString(), anyString());
    }

    @Test
    @DisplayName("상태 전이 테스트 - DRAFT -> SUBMITTED")
    void transitionStatus_Success() {
        when(changeRequestRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sampleCr));

        ChangeRequestResponse result = service.transitionStatus(1L, ChangeStatus.SUBMITTED, "admin");

        assertThat(result.getStatus()).isEqualTo(ChangeStatus.SUBMITTED);
        verify(auditLogService, times(1)).logAction(eq("admin"), eq("TRANSITION"), anyString(), anyString());
    }

    @Test
    @DisplayName("CCB 심의 승인 - 상태가 APPROVED로 자동 변경")
    void reviewCcb_Approved_AutoStatusTransition() {
        when(changeRequestRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sampleCr));

        CcbReviewRequest ccbDto = CcbReviewRequest.builder()
                .ccbReviewDate(LocalDate.now())
                .ccbAttendees("홍길동, 김품질")
                .ccbSummary("원자재 교체 타당성 검토 완료")
                .ccbDecision(CcbDecision.APPROVED)
                .ccbConditions("성적서 접수 후 개정")
                .build();

        ChangeRequestResponse result = service.reviewCcb(1L, ccbDto, "admin");

        assertThat(result.getCcbDecision()).isEqualTo(CcbDecision.APPROVED);
        assertThat(result.getStatus()).isEqualTo(ChangeStatus.APPROVED);
        verify(auditLogService, times(1)).logAction(eq("admin"), eq("CCB_REVIEW"), anyString(), anyString());
    }

    @Test
    @DisplayName("CCB 심의 부결 - 상태가 REJECTED로 자동 변경")
    void reviewCcb_Rejected_AutoStatusTransition() {
        when(changeRequestRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sampleCr));

        CcbReviewRequest ccbDto = CcbReviewRequest.builder()
                .ccbReviewDate(LocalDate.now())
                .ccbAttendees("홍길동, 김품질")
                .ccbSummary("부적합")
                .ccbDecision(CcbDecision.REJECTED)
                .build();

        ChangeRequestResponse result = service.reviewCcb(1L, ccbDto, "admin");

        assertThat(result.getCcbDecision()).isEqualTo(CcbDecision.REJECTED);
        assertThat(result.getStatus()).isEqualTo(ChangeStatus.REJECTED);
    }

    @Test
    @DisplayName("효과성 평가 - EFFECTIVE 판정 시 상태 CLOSED로 자동 전이")
    void evaluateEffectiveness_Effective_AutoClose() {
        sampleCr.setStatus(ChangeStatus.EFFECTIVENESS_CHECK);
        when(changeRequestRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sampleCr));

        ChangeEffectivenessRequest evalDto = ChangeEffectivenessRequest.builder()
                .effectivenessEvalDate(LocalDate.now())
                .effectivenessStatus(EffectivenessStatus.EFFECTIVE)
                .effectivenessSummary("3배치 연속 불량률 0% 달성")
                .evaluatorName("김품질 팀장")
                .build();

        ChangeRequestResponse result = service.evaluateEffectiveness(1L, evalDto, "admin");

        assertThat(result.getEffectivenessStatus()).isEqualTo(EffectivenessStatus.EFFECTIVE);
        assertThat(result.getStatus()).isEqualTo(ChangeStatus.CLOSED);
        assertThat(result.getActualCompletionDate()).isNotNull();
    }

    @Test
    @DisplayName("실행 조치과제 등록 - 성공")
    void addActionItem_Success() {
        when(changeRequestRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sampleCr));
        when(changeActionItemRepository.countByChangeRequestIdAndIsDeletedFalse(1L)).thenReturn(0L);
        when(changeActionItemRepository.save(any(ChangeActionItem.class))).thenAnswer(i -> {
            ChangeActionItem a = i.getArgument(0);
            a.setId(101L);
            return a;
        });

        ChangeActionItemRequest dto = ChangeActionItemRequest.builder()
                .actionTitle("도면 개정")
                .assignedPerson("최생산")
                .dueDate(LocalDate.now().plusDays(20))
                .status("PENDING")
                .build();

        ChangeActionItemResponse result = service.addActionItem(1L, dto, "admin");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(101L);
        assertThat(result.getActionTitle()).isEqualTo("도면 개정");
        verify(changeActionItemRepository, times(1)).save(any(ChangeActionItem.class));
    }

    @Test
    @DisplayName("실행 조치과제 수정 및 완료 처리 - 성공")
    void updateActionItem_Success() {
        when(changeRequestRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sampleCr));
        when(changeActionItemRepository.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(sampleItem));

        ChangeActionItemRequest dto = ChangeActionItemRequest.builder()
                .actionTitle("시험성적서 접수 및 검토 완료")
                .assignedPerson("강전자")
                .dueDate(sampleItem.getDueDate())
                .completionDate(LocalDate.now())
                .status("COMPLETED")
                .verificationNotes("KTL 적합 성적서 접수")
                .build();

        ChangeActionItemResponse result = service.updateActionItem(1L, 10L, dto, "admin");

        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getCompletionDate()).isNotNull();
    }

    @Test
    @DisplayName("실행 조치과제 삭제 - 소프트 딜리트")
    void deleteActionItem_Success() {
        when(changeRequestRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(sampleCr));
        when(changeActionItemRepository.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(sampleItem));

        service.deleteActionItem(1L, 10L, "admin");

        assertThat(sampleItem.getIsDeleted()).isTrue();
    }

    @Test
    @DisplayName("6대 KPI 요약 통계 집계 - 성공")
    void getChangeControlKpis_Success() {
        when(changeRequestRepository.countByIsDeletedFalse()).thenReturn(10L);
        when(changeRequestRepository.countByStatusInAndIsDeletedFalse(anyList())).thenReturn(4L);
        when(changeRequestRepository.countByStatusAndIsDeletedFalse(ChangeStatus.CCB_REVIEW)).thenReturn(2L);
        when(changeRequestRepository.countTotalClosedChanges()).thenReturn(5L);
        when(changeRequestRepository.countEffectiveClosedChanges()).thenReturn(4L);
        List<Object[]> catList = Collections.singletonList(new Object[]{ChangeCategory.PRODUCT, 6L});
        List<Object[]> statusList = Collections.singletonList(new Object[]{ChangeStatus.IN_PROGRESS, 3L});
        List<Object[]> urgencyList = Collections.singletonList(new Object[]{ChangeUrgency.EMERGENCY, 1L});
        when(changeRequestRepository.countByCategory()).thenReturn(catList);
        when(changeRequestRepository.countByStatus()).thenReturn(statusList);
        when(changeRequestRepository.countByUrgency()).thenReturn(urgencyList);

        ChangeControlKpiResponse kpi = service.getChangeControlKpis();

        assertThat(kpi).isNotNull();
        assertThat(kpi.getTotalChanges()).isEqualTo(10L);
        assertThat(kpi.getActiveChanges()).isEqualTo(4L);
        assertThat(kpi.getCcbPendingCount()).isEqualTo(2L);
        assertThat(kpi.getEffectivenessPassRate()).isEqualTo(80.0);
        assertThat(kpi.getEmergencyCount()).isEqualTo(1L);
    }
}
