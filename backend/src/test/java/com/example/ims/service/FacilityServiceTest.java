package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.CalibrationRecordRepository;
import com.example.ims.repository.EnvironmentalMonitoringRepository;
import com.example.ims.repository.EquipmentRepository;
import com.example.ims.repository.MaintenanceRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FacilityServiceTest {

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private CalibrationRecordRepository calibrationRepository;

    @Mock
    private MaintenanceRecordRepository maintenanceRepository;

    @Mock
    private EnvironmentalMonitoringRepository environmentalRepository;

    @InjectMocks
    private FacilityService facilityService;

    private Equipment sampleEquipment;

    @BeforeEach
    void setUp() {
        sampleEquipment = Equipment.builder()
                .id(1L)
                .equipmentCode("EQ-20261025-001")
                .equipmentName("HPLC 1호기")
                .category(EquipmentCategory.MEASURING_INSTRUMENT)
                .modelNumber("1260 Infinity")
                .serialNumber("SN-12345")
                .manufacturer("Agilent")
                .department("QC")
                .managerName("김책임")
                .status(EquipmentStatus.OPERATIONAL)
                .calibrationCycleMonths(12)
                .lastCalibrationDate(LocalDate.now().minusMonths(6))
                .nextCalibrationDueDate(LocalDate.now().plusMonths(6))
                .pmCycleMonths(6)
                .lastPmDate(LocalDate.now().minusMonths(2))
                .nextPmDueDate(LocalDate.now().plusMonths(4))
                .criticality(EquipmentCriticality.HIGH)
                .isDeleted(false)
                .build();
    }

    @Test
    @DisplayName("장비 마스터 등록 성공 - 차기 교정일 및 PM 예정일 자동 산출")
    void testCreateEquipment_Success() {
        // given
        EquipmentRequest req = EquipmentRequest.builder()
                .equipmentName("HPLC 2호기")
                .category(EquipmentCategory.MEASURING_INSTRUMENT)
                .status(EquipmentStatus.OPERATIONAL)
                .calibrationCycleMonths(12)
                .lastCalibrationDate(LocalDate.of(2026, 1, 15))
                .pmCycleMonths(6)
                .lastPmDate(LocalDate.of(2026, 1, 15))
                .criticality(EquipmentCriticality.HIGH)
                .build();

        given(equipmentRepository.findTopByEquipmentCodeStartingWithOrderByEquipmentCodeDesc(anyString()))
                .willReturn(Optional.empty());
        given(equipmentRepository.save(any(Equipment.class)))
                .willAnswer(invocation -> {
                    Equipment e = invocation.getArgument(0);
                    e.setId(2L);
                    return e;
                });

        // when
        EquipmentResponse response = facilityService.createEquipment(req, "admin");

        // then
        assertThat(response).isNotNull();
        assertThat(response.getEquipmentCode()).startsWith("EQ-");
        assertThat(response.getNextCalibrationDueDate()).isEqualTo(LocalDate.of(2027, 1, 15));
        assertThat(response.getNextPmDueDate()).isEqualTo(LocalDate.of(2026, 7, 15));
        verify(equipmentRepository).save(any(Equipment.class));
    }

    @Test
    @DisplayName("교정 성적서 등록 (적합) - 장비 마스터 교정일 자동 갱신")
    void testCreateCalibrationRecord_Pass_UpdatesEquipment() {
        // given
        LocalDate calDate = LocalDate.now();
        CalibrationRecordRequest req = CalibrationRecordRequest.builder()
                .equipmentId(1L)
                .calibrationDate(calDate)
                .agencyType(CalibrationAgencyType.EXTERNAL_KOLAS)
                .agencyName("KOLAS 한국인정기구")
                .certificateNumber("CERT-2026-001")
                .result(CalibrationResult.PASS)
                .toleranceStandard("허용오차 ±1.0% 이내")
                .maxDeviation("+0.1%")
                .calibratedBy("공인기사")
                .build();

        given(equipmentRepository.findById(1L)).willReturn(Optional.of(sampleEquipment));
        given(calibrationRepository.findTopByCalibrationNumberStartingWithOrderByCalibrationNumberDesc(anyString()))
                .willReturn(Optional.empty());
        given(calibrationRepository.save(any(CalibrationRecord.class)))
                .willAnswer(invocation -> {
                    CalibrationRecord cr = invocation.getArgument(0);
                    cr.setId(10L);
                    return cr;
                });

        // when
        CalibrationRecordResponse response = facilityService.createCalibrationRecord(req, "admin");

        // then
        assertThat(response).isNotNull();
        assertThat(response.getResult()).isEqualTo(CalibrationResult.PASS);
        assertThat(response.getImpactAssessmentRequired()).isFalse();
        assertThat(sampleEquipment.getLastCalibrationDate()).isEqualTo(calDate);
        assertThat(sampleEquipment.getNextCalibrationDueDate()).isEqualTo(calDate.plusMonths(12));
        assertThat(sampleEquipment.getStatus()).isEqualTo(EquipmentStatus.OPERATIONAL);
    }

    @Test
    @DisplayName("교정 불합격(FAIL) 가드 - 장비 상태 OUT_OF_SERVICE 전환 및 소급 영향평가 강제")
    void testCreateCalibrationRecord_Fail_SetsEquipmentOutOfService_And_RequiresImpactAssessment() {
        // given
        LocalDate calDate = LocalDate.now();
        CalibrationRecordRequest req = CalibrationRecordRequest.builder()
                .equipmentId(1L)
                .calibrationDate(calDate)
                .agencyType(CalibrationAgencyType.EXTERNAL_KOLAS)
                .agencyName("KOLAS 한국인정기구")
                .certificateNumber("CERT-2026-FAIL")
                .result(CalibrationResult.FAIL)
                .toleranceStandard("허용오차 ±1.0% 이내")
                .maxDeviation("+3.5% (기준초과)")
                .calibratedBy("공인기사")
                .build();

        given(equipmentRepository.findById(1L)).willReturn(Optional.of(sampleEquipment));
        given(calibrationRepository.findTopByCalibrationNumberStartingWithOrderByCalibrationNumberDesc(anyString()))
                .willReturn(Optional.empty());
        given(calibrationRepository.save(any(CalibrationRecord.class)))
                .willAnswer(invocation -> {
                    CalibrationRecord cr = invocation.getArgument(0);
                    cr.setId(11L);
                    return cr;
                });

        // when
        CalibrationRecordResponse response = facilityService.createCalibrationRecord(req, "admin");

        // then
        assertThat(response).isNotNull();
        assertThat(response.getResult()).isEqualTo(CalibrationResult.FAIL);
        assertThat(response.getImpactAssessmentRequired()).isTrue();
        assertThat(response.getImpactAssessmentNotes()).contains("영향평가");
        assertThat(sampleEquipment.getStatus()).isEqualTo(EquipmentStatus.OUT_OF_SERVICE);
    }

    @Test
    @DisplayName("정기 예방보전(PM) 완료 - 차기 PM 예정일 자동 산출 및 장비 가동 복구")
    void testCreateMaintenanceRecord_PreventivePm_Completed_UpdatesEquipment() {
        // given
        sampleEquipment.setStatus(EquipmentStatus.UNDER_MAINTENANCE);
        LocalDate mntDate = LocalDate.now();

        MaintenanceRecordRequest req = MaintenanceRecordRequest.builder()
                .equipmentId(1L)
                .maintenanceType(MaintenanceType.PREVENTIVE_PM)
                .maintenanceDate(mntDate)
                .performer("유지보수업체")
                .cost(BigDecimal.valueOf(500000))
                .maintenanceResult(MaintenanceResult.COMPLETED)
                .details("정기 소모품 교체 및 클리닝 완료")
                .build();

        given(equipmentRepository.findById(1L)).willReturn(Optional.of(sampleEquipment));
        given(maintenanceRepository.findTopByMaintenanceNumberStartingWithOrderByMaintenanceNumberDesc(anyString()))
                .willReturn(Optional.empty());
        given(maintenanceRepository.save(any(MaintenanceRecord.class)))
                .willAnswer(invocation -> {
                    MaintenanceRecord m = invocation.getArgument(0);
                    m.setId(20L);
                    return m;
                });

        // when
        MaintenanceRecordResponse response = facilityService.createMaintenanceRecord(req, "admin");

        // then
        assertThat(response).isNotNull();
        assertThat(response.getMaintenanceResult()).isEqualTo(MaintenanceResult.COMPLETED);
        assertThat(sampleEquipment.getLastPmDate()).isEqualTo(mntDate);
        assertThat(sampleEquipment.getNextPmDueDate()).isEqualTo(mntDate.plusMonths(6));
        assertThat(sampleEquipment.getStatus()).isEqualTo(EquipmentStatus.OPERATIONAL);
    }

    @Test
    @DisplayName("환경 모니터링 등록 (OOS) - 즉각 시정조치 가이드 자동 생성")
    void testCreateEnvironmentalMonitoring_Oos_GeneratesCorrectiveAction() {
        // given
        EnvironmentalMonitoringRequest req = EnvironmentalMonitoringRequest.builder()
                .area(EnvironmentalArea.CLEANROOM_GRADE_C)
                .monitoringDate(LocalDateTime.now())
                .temperature(BigDecimal.valueOf(26.5)) // 기준 초과
                .humidity(BigDecimal.valueOf(70.2)) // 기준 초과
                .differentialPressure(BigDecimal.valueOf(10.0)) // 차압 저하
                .status(EnvironmentalStatus.OUT_OF_SPEC)
                .inspector("최수민")
                .build();

        given(environmentalRepository.findTopByMonitoringNumberStartingWithOrderByMonitoringNumberDesc(anyString()))
                .willReturn(Optional.empty());
        given(environmentalRepository.save(any(EnvironmentalMonitoring.class)))
                .willAnswer(invocation -> {
                    EnvironmentalMonitoring env = invocation.getArgument(0);
                    env.setId(30L);
                    return env;
                });

        // when
        EnvironmentalMonitoringResponse response = facilityService.createEnvironmentalMonitoring(req, "admin");

        // then
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(EnvironmentalStatus.OUT_OF_SPEC);
        assertThat(response.getCorrectiveAction()).contains("기준 이탈");
        verify(environmentalRepository).save(any(EnvironmentalMonitoring.class));
    }

    @Test
    @DisplayName("시설 종합 KPI 집계 검증")
    void testGetFacilityKpi() {
        // given
        EquipmentRepository.EquipmentKpiProjection projection = new EquipmentRepository.EquipmentKpiProjection() {
            @Override public Long getTotalEquipment() { return 10L; }
            @Override public Long getOperationalEquipment() { return 8L; }
            @Override public Long getMaintenanceEquipment() { return 1L; }
            @Override public Long getOutOfServiceEquipment() { return 1L; }
            @Override public Long getOverdueCalibrations() { return 1L; }
            @Override public Long getDueSoonCalibrations() { return 2L; }
            @Override public Long getDueSoonPm() { return 3L; }
        };

        given(equipmentRepository.getEquipmentKpiSummary(any(LocalDate.class), any(LocalDate.class)))
                .willReturn(projection);
        given(calibrationRepository.countByResultAndIsDeletedFalse(CalibrationResult.FAIL))
                .willReturn(1L);
        given(environmentalRepository.countByStatusInAndMonitoringDateAfterAndIsDeletedFalse(anyList(), any(LocalDateTime.class)))
                .willReturn(2L);

        // when
        FacilityKpiResponse kpi = facilityService.getFacilityKpi();

        // then
        assertThat(kpi).isNotNull();
        assertThat(kpi.getTotalEquipment()).isEqualTo(10L);
        assertThat(kpi.getOperationalEquipment()).isEqualTo(8L);
        assertThat(kpi.getOperationalRate()).isEqualTo(new BigDecimal("80.0"));
        assertThat(kpi.getTotalCalibrationAttention()).isEqualTo(3L);
        assertThat(kpi.getDueSoonPm()).isEqualTo(3L);
        assertThat(kpi.getFailedCalibrations()).isEqualTo(1L);
        assertThat(kpi.getRecentEnvironmentalOos()).isEqualTo(2L);
    }
}
