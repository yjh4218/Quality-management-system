package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.CapaActionItemRepository;
import com.example.ims.repository.CapaRecordRepository;
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
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class CapaServiceTest {

    @Mock
    private CapaRecordRepository capaRepository;

    @Mock
    private CapaActionItemRepository actionItemRepository;

    @InjectMocks
    private CapaService capaService;

    @Test
    @DisplayName("신규 CAPA 발의 시 채번 및 INITIATED 초기 상태 생성 검증")
    void createCapa_success() {
        // given
        CapaCreateRequest req = CapaCreateRequest.builder()
                .title("원료 분산 편차 시정조치")
                .sourceType(CapaSourceType.COMPLAINT_SAFETY)
                .sourceId(1L)
                .sourceNumber("SAFE-202610-001")
                .category(CapaCategory.PRODUCT_QUALITY)
                .riskLevel(CapaRiskLevel.HIGH)
                .problemDescription("보존제 국소 농축 발생")
                .assignedTo("김품질")
                .targetCompletionDate(LocalDate.now().plusMonths(1))
                .build();

        given(capaRepository.findTopByCapaNumberStartingWithOrderByCapaNumberDesc(any())).willReturn(Optional.empty());
        given(capaRepository.save(any(CapaRecord.class))).willAnswer(inv -> {
            CapaRecord r = inv.getArgument(0);
            r.setId(10L);
            return r;
        });

        // when
        CapaResponse res = capaService.createCapa(req, "tester");

        // then
        assertThat(res).isNotNull();
        assertThat(res.getCapaNumber()).startsWith("CAPA-");
        assertThat(res.getStatus()).isEqualTo(CapaStatus.INITIATED);
        assertThat(res.getSourceType()).isEqualTo(CapaSourceType.COMPLAINT_SAFETY);
        assertThat(res.getCreatedBy()).isEqualTo("tester");
    }

    @Test
    @DisplayName("5-Why 및 Fishbone 원인분석 기록 시 UNDER_INVESTIGATION 상태 전이 검증")
    void recordRootCause_updatesStatus() {
        // given
        CapaRecord record = CapaRecord.builder()
                .id(1L)
                .capaNumber("CAPA-202610-001")
                .status(CapaStatus.INITIATED)
                .build();

        given(capaRepository.findById(1L)).willReturn(Optional.of(record));

        CapaRootCauseRequest req = CapaRootCauseRequest.builder()
                .rootCauseAnalysis("교반 인터락 미연동 및 토출 시간 미준수")
                .why1("교반 불균일")
                .why2("시간 미준수")
                .fishboneMachine("교반 밸브 수동 제어")
                .build();

        // when
        CapaResponse res = capaService.recordRootCause(1L, req, "investigator");

        // then
        assertThat(res.getStatus()).isEqualTo(CapaStatus.UNDER_INVESTIGATION);
        assertThat(res.getRootCauseAnalysis()).contains("교반 인터락");
        assertThat(res.getWhy1()).isEqualTo("교반 불균일");
        assertThat(res.getFishboneMachine()).isEqualTo("교반 밸브 수동 제어");
    }

    @Test
    @DisplayName("미완료 조치과제가 남아 있는 경우 최종 종결 차단 가드 (ISO 13485 §8.5.2)")
    void closeCapa_failsWhenPendingActionItemsExist() {
        // given
        CapaRecord record = CapaRecord.builder()
                .id(1L)
                .capaNumber("CAPA-202610-001")
                .status(CapaStatus.EFFECTIVENESS_REVIEW)
                .effectivenessResult(EffectivenessResult.EFFECTIVE)
                .build();

        given(capaRepository.findById(1L)).willReturn(Optional.of(record));
        given(actionItemRepository.countByCapaRecordIdAndStatusNot(1L, "COMPLETED")).willReturn(2L);

        CapaCloseRequest req = CapaCloseRequest.builder().closureComment("종결 승인").build();

        // when & then
        assertThatThrownBy(() -> capaService.closeCapa(1L, req, "manager"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("미완료된 조치과제가 2건 남아 있어 종결할 수 없습니다");
    }

    @Test
    @DisplayName("효과성 검증 결과가 EFFECTIVE가 아니면 종결 차단 가드 (21 CFR 820.100)")
    void closeCapa_failsWhenNotEffective() {
        // given
        CapaRecord record = CapaRecord.builder()
                .id(1L)
                .capaNumber("CAPA-202610-001")
                .status(CapaStatus.EFFECTIVENESS_REVIEW)
                .effectivenessResult(EffectivenessResult.PARTIALLY_EFFECTIVE)
                .build();

        given(capaRepository.findById(1L)).willReturn(Optional.of(record));
        given(actionItemRepository.countByCapaRecordIdAndStatusNot(1L, "COMPLETED")).willReturn(0L);

        CapaCloseRequest req = CapaCloseRequest.builder().closureComment("종결 시도").build();

        // when & then
        assertThatThrownBy(() -> capaService.closeCapa(1L, req, "manager"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("효과적(EFFECTIVE)'으로 판정되지 않은 CAPA는 종결할 수 없습니다");
    }

    @Test
    @DisplayName("모든 과제 완료 및 EFFECTIVE 판정 시 성공적으로 CLOSED 종결")
    void closeCapa_success() {
        // given
        CapaRecord record = CapaRecord.builder()
                .id(1L)
                .capaNumber("CAPA-202610-001")
                .status(CapaStatus.EFFECTIVENESS_REVIEW)
                .effectivenessResult(EffectivenessResult.EFFECTIVE)
                .build();

        given(capaRepository.findById(1L)).willReturn(Optional.of(record));
        given(actionItemRepository.countByCapaRecordIdAndStatusNot(1L, "COMPLETED")).willReturn(0L);

        CapaCloseRequest req = CapaCloseRequest.builder().closureComment("재발 0건 및 안정화 확인되어 종결함").build();

        // when
        CapaResponse res = capaService.closeCapa(1L, req, "qaManager");

        // then
        assertThat(res.getStatus()).isEqualTo(CapaStatus.CLOSED);
        assertThat(res.getClosedBy()).isEqualTo("qaManager");
        assertThat(res.getClosedDate()).isEqualTo(LocalDate.now());
    }
}
