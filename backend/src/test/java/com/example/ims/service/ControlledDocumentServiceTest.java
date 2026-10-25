package com.example.ims.service;

import com.example.ims.dto.ControlledDocumentMetricsResponse;
import com.example.ims.dto.ControlledDocumentRequest;
import com.example.ims.dto.ControlledDocumentRevisionRequest;
import com.example.ims.entity.ControlledDocStatus;
import com.example.ims.entity.ControlledDocType;
import com.example.ims.entity.ControlledDocument;
import com.example.ims.entity.ProductFamily;
import com.example.ims.repository.ControlledDocumentRepository;
import com.example.ims.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ControlledDocumentServiceTest {

    @Mock private ControlledDocumentRepository repository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks private ControlledDocumentService service;

    private ControlledDocument sampleDoc;

    @BeforeEach
    void setUp() {
        sampleDoc = ControlledDocument.builder()
                .id(1L)
                .docNo("SOP-QA-001")
                .title("통제문서 관리 절차서")
                .docType(ControlledDocType.SOP)
                .targetFamily(ProductFamily.COMMON)
                .status(ControlledDocStatus.DRAFT)
                .revisionNo("Rev. 0")
                .revisionInt(0)
                .authorName("QA담당자")
                .department("품질보증팀")
                .isDeleted(false)
                .build();
    }

    @Test
    @DisplayName("1. 신규 통제문서 최초 등록 성공")
    void createDocument_success() {
        ControlledDocumentRequest request = ControlledDocumentRequest.builder()
                .docNo("SOP-QA-001")
                .title("통제문서 관리 절차서")
                .docType(ControlledDocType.SOP)
                .targetFamily(ProductFamily.COMMON)
                .revisionNo("Rev. 0")
                .department("품질보증팀")
                .authorName("QA담당자")
                .changeRationale("최초 제정")
                .build();

        when(repository.existsByDocNoAndRevisionNoAndIsDeletedFalse("SOP-QA-001", "Rev. 0")).thenReturn(false);
        when(repository.save(any(ControlledDocument.class))).thenAnswer(inv -> {
            ControlledDocument d = inv.getArgument(0);
            d.setId(10L);
            return d;
        });

        ControlledDocument result = service.createDocument(request, "admin");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getStatus()).isEqualTo(ControlledDocStatus.DRAFT);
        assertThat(result.getDocNo()).isEqualTo("SOP-QA-001");
        verify(repository).save(any(ControlledDocument.class));
    }

    @Test
    @DisplayName("2. 동일 문서번호와 리비전 번호 중복 등록 시 예외 발생 검증")
    void createDocument_duplicateThrows() {
        ControlledDocumentRequest request = ControlledDocumentRequest.builder()
                .docNo("SOP-QA-001")
                .title("통제문서 관리 절차서")
                .docType(ControlledDocType.SOP)
                .revisionNo("Rev. 0")
                .build();

        when(repository.existsByDocNoAndRevisionNoAndIsDeletedFalse("SOP-QA-001", "Rev. 0")).thenReturn(true);

        assertThatThrownBy(() -> service.createDocument(request, "admin"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("이미 등록된 문서 번호와 개정 번호입니다");
    }

    @Test
    @DisplayName("3. 새 개정판(Revision) 생성 시 부모문서 참조 및 개정번호/사유 자동 연동 검증")
    void createRevision_success() {
        ControlledDocument effectiveParent = ControlledDocument.builder()
                .id(1L)
                .docNo("SOP-QA-001")
                .title("통제문서 관리 절차서")
                .docType(ControlledDocType.SOP)
                .targetFamily(ProductFamily.COMMON)
                .status(ControlledDocStatus.EFFECTIVE)
                .revisionNo("Rev. 0")
                .revisionInt(0)
                .department("품질보증팀")
                .isDeleted(false)
                .build();

        ControlledDocumentRevisionRequest revRequest = ControlledDocumentRevisionRequest.builder()
                .revisionNo("Rev. 1.0")
                .changeRationale("ISO 13485:2016 규제 요구사항 반영에 따른 전면 개정")
                .authorName("QA책임자")
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(effectiveParent));
        when(repository.existsByDocNoAndRevisionNoAndIsDeletedFalse("SOP-QA-001", "Rev. 1.0")).thenReturn(false);
        when(repository.save(any(ControlledDocument.class))).thenAnswer(inv -> {
            ControlledDocument d = inv.getArgument(0);
            d.setId(2L);
            return d;
        });

        ControlledDocument nextRev = service.createRevision(1L, revRequest, "admin");

        assertThat(nextRev.getId()).isEqualTo(2L);
        assertThat(nextRev.getDocNo()).isEqualTo("SOP-QA-001");
        assertThat(nextRev.getRevisionNo()).isEqualTo("Rev. 1.0");
        assertThat(nextRev.getRevisionInt()).isEqualTo(1);
        assertThat(nextRev.getParentDocumentId()).isEqualTo(1L);
        assertThat(nextRev.getStatus()).isEqualTo(ControlledDocStatus.DRAFT);
        assertThat(nextRev.getChangeRationale()).contains("ISO 13485:2016");
    }

    @Test
    @DisplayName("4. 새 버전이 EFFECTIVE(배포)될 때 기존 EFFECTIVE 버전이 자동으로 SUPERSEDED로 전환 검증")
    void changeStatus_autoSupersedesOldEffective() {
        ControlledDocument oldEffective = ControlledDocument.builder()
                .id(1L)
                .docNo("SOP-QA-001")
                .status(ControlledDocStatus.EFFECTIVE)
                .revisionNo("Rev. 0")
                .isDeleted(false)
                .build();

        ControlledDocument newDraft = ControlledDocument.builder()
                .id(2L)
                .docNo("SOP-QA-001")
                .status(ControlledDocStatus.UNDER_REVIEW)
                .revisionNo("Rev. 1.0")
                .isDeleted(false)
                .build();

        when(repository.findById(2L)).thenReturn(Optional.of(newDraft));
        when(repository.findFirstByDocNoAndStatusAndIsDeletedFalse("SOP-QA-001", ControlledDocStatus.EFFECTIVE))
                .thenReturn(Optional.of(oldEffective));
        when(repository.save(any(ControlledDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        ControlledDocument activated = service.changeStatus(2L, ControlledDocStatus.EFFECTIVE, "최종 승인 배포", "admin");

        assertThat(activated.getStatus()).isEqualTo(ControlledDocStatus.EFFECTIVE);
        assertThat(oldEffective.getStatus()).isEqualTo(ControlledDocStatus.SUPERSEDED);
        verify(repository, atLeast(2)).save(any(ControlledDocument.class));
    }

    @Test
    @DisplayName("5. 배포(EFFECTIVE) 상태의 문서 직접 삭제 시도 시 차단 검증")
    void softDelete_effectiveDocumentBlocked() {
        ControlledDocument effectiveDoc = ControlledDocument.builder()
                .id(1L)
                .docNo("SOP-QA-001")
                .status(ControlledDocStatus.EFFECTIVE)
                .isDeleted(false)
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(effectiveDoc));

        assertThatThrownBy(() -> service.softDeleteDocument(1L, "admin"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("현재 배포/유효(EFFECTIVE) 상태인 통제문서는 직접 삭제할 수 없습니다");
    }

    @Test
    @DisplayName("6. 통제문서 메트릭 집계 정상 반환 검증")
    void getMetrics_success() {
        when(repository.countByIsDeletedFalse()).thenReturn(10L);
        when(repository.countByStatusAndIsDeletedFalse(ControlledDocStatus.EFFECTIVE)).thenReturn(6L);
        when(repository.countByStatusAndIsDeletedFalse(ControlledDocStatus.DRAFT)).thenReturn(2L);
        when(repository.countByStatusAndIsDeletedFalse(ControlledDocStatus.UNDER_REVIEW)).thenReturn(1L);
        when(repository.countByStatusAndIsDeletedFalse(ControlledDocStatus.APPROVED)).thenReturn(1L);
        when(repository.countByStatusAndIsDeletedFalse(ControlledDocStatus.SUPERSEDED)).thenReturn(3L);
        when(repository.countByStatusAndIsDeletedFalse(ControlledDocStatus.OBSOLETE)).thenReturn(0L);
        when(repository.countByTargetFamilyAndIsDeletedFalse(ProductFamily.COSMETICS)).thenReturn(4L);
        when(repository.countByTargetFamilyAndIsDeletedFalse(ProductFamily.MEDICAL_DEVICE)).thenReturn(3L);
        when(repository.countByTargetFamilyAndIsDeletedFalse(ProductFamily.COMMON)).thenReturn(3L);

        ControlledDocumentMetricsResponse metrics = service.getMetrics();

        assertThat(metrics.getTotalDocuments()).isEqualTo(10L);
        assertThat(metrics.getEffectiveCount()).isEqualTo(6L);
        assertThat(metrics.getCosmeticsCount()).isEqualTo(4L);
        assertThat(metrics.getMedicalDeviceCount()).isEqualTo(3L);
    }
}
