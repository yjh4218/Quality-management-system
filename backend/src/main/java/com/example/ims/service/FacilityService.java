package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.CalibrationRecordRepository;
import com.example.ims.repository.EnvironmentalMonitoringRepository;
import com.example.ims.repository.EquipmentRepository;
import com.example.ims.repository.MaintenanceRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 시설/장비, 교정 및 유지보수, 환경모니터링 관리 서비스
 * 규격: ISO 13485:2016 §6.3, §6.4, §7.6 / ISO 22716:2007 §4, §5 / 21 CFR 820.70, 820.72
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FacilityService {

    private final EquipmentRepository equipmentRepository;
    private final CalibrationRecordRepository calibrationRepository;
    private final MaintenanceRecordRepository maintenanceRepository;
    private final EnvironmentalMonitoringRepository environmentalRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    // =========================================================================
    // 1. 장비/설비 마스터 (Equipment)
    // =========================================================================

    @Transactional
    public EquipmentResponse createEquipment(EquipmentRequest req, String username) {
        String equipmentCode = generateEquipmentCode();

        Integer calCycle = req.getCalibrationCycleMonths() != null ? req.getCalibrationCycleMonths() : 12;
        LocalDate nextCalDue = req.getNextCalibrationDueDate();
        if (nextCalDue == null && req.getLastCalibrationDate() != null) {
            nextCalDue = req.getLastCalibrationDate().plusMonths(calCycle);
        }

        Integer pmCycle = req.getPmCycleMonths() != null ? req.getPmCycleMonths() : 6;
        LocalDate nextPmDue = req.getNextPmDueDate();
        if (nextPmDue == null && req.getLastPmDate() != null) {
            nextPmDue = req.getLastPmDate().plusMonths(pmCycle);
        }

        Equipment equipment = Equipment.builder()
                .equipmentCode(equipmentCode)
                .equipmentName(req.getEquipmentName())
                .category(req.getCategory())
                .modelNumber(req.getModelNumber())
                .serialNumber(req.getSerialNumber())
                .manufacturer(req.getManufacturer())
                .supplier(req.getSupplier())
                .installationDate(req.getInstallationDate())
                .installationLocation(req.getInstallationLocation())
                .department(req.getDepartment())
                .managerName(req.getManagerName())
                .status(req.getStatus() != null ? req.getStatus() : EquipmentStatus.OPERATIONAL)
                .calibrationCycleMonths(calCycle)
                .lastCalibrationDate(req.getLastCalibrationDate())
                .nextCalibrationDueDate(nextCalDue)
                .pmCycleMonths(pmCycle)
                .lastPmDate(req.getLastPmDate())
                .nextPmDueDate(nextPmDue)
                .criticality(req.getCriticality() != null ? req.getCriticality() : EquipmentCriticality.MEDIUM)
                .specifications(req.getSpecifications())
                .remarks(req.getRemarks())
                .isDeleted(false)
                .createdBy(username)
                .lastModifiedBy(username)
                .build();

        Equipment saved = equipmentRepository.save(equipment);
        log.info("[FACILITY] Created equipment: {} ({}) by {}", saved.getEquipmentCode(), saved.getEquipmentName(), username);
        return toEquipmentResponse(saved);
    }

    @Transactional
    public EquipmentResponse updateEquipment(Long id, EquipmentRequest req, String username) {
        Equipment equipment = equipmentRepository.findById(id)
                .filter(e -> !Boolean.TRUE.equals(e.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 장비입니다. ID: " + id));

        Integer calCycle = req.getCalibrationCycleMonths() != null ? req.getCalibrationCycleMonths() : equipment.getCalibrationCycleMonths();
        LocalDate nextCalDue = req.getNextCalibrationDueDate();
        if (nextCalDue == null && req.getLastCalibrationDate() != null) {
            nextCalDue = req.getLastCalibrationDate().plusMonths(calCycle);
        }

        Integer pmCycle = req.getPmCycleMonths() != null ? req.getPmCycleMonths() : equipment.getPmCycleMonths();
        LocalDate nextPmDue = req.getNextPmDueDate();
        if (nextPmDue == null && req.getLastPmDate() != null) {
            nextPmDue = req.getLastPmDate().plusMonths(pmCycle);
        }

        equipment.setEquipmentName(req.getEquipmentName());
        equipment.setCategory(req.getCategory());
        equipment.setModelNumber(req.getModelNumber());
        equipment.setSerialNumber(req.getSerialNumber());
        equipment.setManufacturer(req.getManufacturer());
        equipment.setSupplier(req.getSupplier());
        equipment.setInstallationDate(req.getInstallationDate());
        equipment.setInstallationLocation(req.getInstallationLocation());
        equipment.setDepartment(req.getDepartment());
        equipment.setManagerName(req.getManagerName());
        equipment.setStatus(req.getStatus());
        equipment.setCalibrationCycleMonths(calCycle);
        equipment.setLastCalibrationDate(req.getLastCalibrationDate());
        equipment.setNextCalibrationDueDate(nextCalDue);
        equipment.setPmCycleMonths(pmCycle);
        equipment.setLastPmDate(req.getLastPmDate());
        equipment.setNextPmDueDate(nextPmDue);
        equipment.setCriticality(req.getCriticality());
        equipment.setSpecifications(req.getSpecifications());
        equipment.setRemarks(req.getRemarks());
        equipment.setLastModifiedBy(username);

        log.info("[FACILITY] Updated equipment: {} by {}", equipment.getEquipmentCode(), username);
        return toEquipmentResponse(equipment);
    }

    @Transactional(readOnly = true)
    public EquipmentResponse getEquipmentById(Long id) {
        Equipment equipment = equipmentRepository.findById(id)
                .filter(e -> !Boolean.TRUE.equals(e.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 장비입니다. ID: " + id));
        return toEquipmentResponse(equipment);
    }

    @Transactional(readOnly = true)
    public List<EquipmentResponse> getAllEquipments() {
        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysLater = today.plusDays(30);

        return equipmentRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc().stream()
                .map(e -> EquipmentResponse.fromEntity(e, today, thirtyDaysLater))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteEquipment(Long id, String username) {
        Equipment equipment = equipmentRepository.findById(id)
                .filter(e -> !Boolean.TRUE.equals(e.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 장비입니다. ID: " + id));

        equipment.setIsDeleted(true);
        equipment.setLastModifiedBy(username);
        log.warn("[FACILITY] Soft-deleted equipment: {} by {}", equipment.getEquipmentCode(), username);
    }

    // =========================================================================
    // 2. 교정 관리 (Calibration Records)
    // =========================================================================

    @Transactional
    public CalibrationRecordResponse createCalibrationRecord(CalibrationRecordRequest req, String username) {
        Equipment equipment = equipmentRepository.findById(req.getEquipmentId())
                .filter(e -> !Boolean.TRUE.equals(e.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("대상 장비가 존재하지 않습니다. ID: " + req.getEquipmentId()));

        String calNumber = generateCalibrationNumber();

        Integer cycle = equipment.getCalibrationCycleMonths() != null ? equipment.getCalibrationCycleMonths() : 12;
        LocalDate nextDueDate = req.getNextCalibrationDueDate() != null
                ? req.getNextCalibrationDueDate()
                : req.getCalibrationDate().plusMonths(cycle);

        boolean isFail = req.getResult() == CalibrationResult.FAIL;
        boolean impactRequired = Boolean.TRUE.equals(req.getImpactAssessmentRequired()) || isFail;

        String impactNotes = req.getImpactAssessmentNotes();
        if (isFail && (impactNotes == null || impactNotes.isBlank())) {
            impactNotes = "교정 불합격(OOS)에 따른 측정 편차 발생. 해당 장비로 측정/시험된 제품에 대한 품질 유효성 소급 영향평가(NCR/CAPA 검토) 필수 수행 요망.";
        }

        CalibrationRecord record = CalibrationRecord.builder()
                .calibrationNumber(calNumber)
                .equipment(equipment)
                .calibrationDate(req.getCalibrationDate())
                .agencyType(req.getAgencyType())
                .agencyName(req.getAgencyName())
                .certificateNumber(req.getCertificateNumber())
                .certificateFileUrl(req.getCertificateFileUrl())
                .result(req.getResult())
                .toleranceStandard(req.getToleranceStandard())
                .maxDeviation(req.getMaxDeviation())
                .calibratedBy(req.getCalibratedBy())
                .verifiedBy(req.getVerifiedBy())
                .verificationDate(req.getVerificationDate())
                .impactAssessmentRequired(impactRequired)
                .impactAssessmentNotes(impactNotes)
                .nextCalibrationDueDate(nextDueDate)
                .remarks(req.getRemarks())
                .isDeleted(false)
                .createdBy(username)
                .lastModifiedBy(username)
                .build();

        CalibrationRecord saved = calibrationRepository.save(record);

        // 장비 마스터 상태 연동 가드
        if (isFail) {
            equipment.setStatus(EquipmentStatus.OUT_OF_SERVICE);
            log.warn("[CALIBRATION GUARD] Equipment {} set to OUT_OF_SERVICE due to calibration FAIL", equipment.getEquipmentCode());
        } else {
            equipment.setLastCalibrationDate(req.getCalibrationDate());
            equipment.setNextCalibrationDueDate(nextDueDate);
            if (equipment.getStatus() == EquipmentStatus.CALIBRATION_PENDING || equipment.getStatus() == EquipmentStatus.OUT_OF_SERVICE) {
                equipment.setStatus(EquipmentStatus.OPERATIONAL);
            }
        }
        equipment.setLastModifiedBy(username);

        log.info("[CALIBRATION] Registered calibration {} for equipment {} (Result: {}) by {}",
                saved.getCalibrationNumber(), equipment.getEquipmentCode(), saved.getResult(), username);

        return CalibrationRecordResponse.fromEntity(saved);
    }

    @Transactional
    public CalibrationRecordResponse updateCalibrationRecord(Long id, CalibrationRecordRequest req, String username) {
        CalibrationRecord record = calibrationRepository.findById(id)
                .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 교정 기록입니다. ID: " + id));

        Equipment equipment = record.getEquipment();

        Integer cycle = equipment.getCalibrationCycleMonths() != null ? equipment.getCalibrationCycleMonths() : 12;
        LocalDate nextDueDate = req.getNextCalibrationDueDate() != null
                ? req.getNextCalibrationDueDate()
                : req.getCalibrationDate().plusMonths(cycle);

        boolean isFail = req.getResult() == CalibrationResult.FAIL;
        boolean impactRequired = Boolean.TRUE.equals(req.getImpactAssessmentRequired()) || isFail;

        record.setCalibrationDate(req.getCalibrationDate());
        record.setAgencyType(req.getAgencyType());
        record.setAgencyName(req.getAgencyName());
        record.setCertificateNumber(req.getCertificateNumber());
        record.setCertificateFileUrl(req.getCertificateFileUrl());
        record.setResult(req.getResult());
        record.setToleranceStandard(req.getToleranceStandard());
        record.setMaxDeviation(req.getMaxDeviation());
        record.setCalibratedBy(req.getCalibratedBy());
        record.setVerifiedBy(req.getVerifiedBy());
        record.setVerificationDate(req.getVerificationDate());
        record.setImpactAssessmentRequired(impactRequired);
        record.setImpactAssessmentNotes(req.getImpactAssessmentNotes());
        record.setNextCalibrationDueDate(nextDueDate);
        record.setRemarks(req.getRemarks());
        record.setLastModifiedBy(username);

        if (isFail) {
            equipment.setStatus(EquipmentStatus.OUT_OF_SERVICE);
        } else {
            equipment.setLastCalibrationDate(req.getCalibrationDate());
            equipment.setNextCalibrationDueDate(nextDueDate);
            if (equipment.getStatus() == EquipmentStatus.CALIBRATION_PENDING || equipment.getStatus() == EquipmentStatus.OUT_OF_SERVICE) {
                equipment.setStatus(EquipmentStatus.OPERATIONAL);
            }
        }
        equipment.setLastModifiedBy(username);

        log.info("[CALIBRATION] Updated calibration {} by {}", record.getCalibrationNumber(), username);
        return CalibrationRecordResponse.fromEntity(record);
    }

    @Transactional(readOnly = true)
    public CalibrationRecordResponse getCalibrationRecordById(Long id) {
        CalibrationRecord record = calibrationRepository.findById(id)
                .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 교정 기록입니다. ID: " + id));
        return CalibrationRecordResponse.fromEntity(record);
    }

    @Transactional(readOnly = true)
    public List<CalibrationRecordResponse> getAllCalibrationRecords() {
        return calibrationRepository.findAllByIsDeletedFalseOrderByCalibrationDateDesc().stream()
                .map(CalibrationRecordResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CalibrationRecordResponse> getCalibrationRecordsByEquipment(Long equipmentId) {
        return calibrationRepository.findAllByEquipmentIdAndIsDeletedFalseOrderByCalibrationDateDesc(equipmentId).stream()
                .map(CalibrationRecordResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteCalibrationRecord(Long id, String username) {
        CalibrationRecord record = calibrationRepository.findById(id)
                .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 교정 기록입니다. ID: " + id));

        record.setIsDeleted(true);
        record.setLastModifiedBy(username);
        log.warn("[CALIBRATION] Soft-deleted calibration {} by {}", record.getCalibrationNumber(), username);
    }

    // =========================================================================
    // 3. 유지보수 및 예방보전 (Maintenance & PM)
    // =========================================================================

    @Transactional
    public MaintenanceRecordResponse createMaintenanceRecord(MaintenanceRecordRequest req, String username) {
        Equipment equipment = equipmentRepository.findById(req.getEquipmentId())
                .filter(e -> !Boolean.TRUE.equals(e.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("대상 장비가 존재하지 않습니다. ID: " + req.getEquipmentId()));

        String mntNumber = generateMaintenanceNumber();

        LocalDate nextPmDue = req.getNextPmDueDate();
        if (req.getMaintenanceType() == MaintenanceType.PREVENTIVE_PM) {
            Integer pmCycle = equipment.getPmCycleMonths() != null ? equipment.getPmCycleMonths() : 6;
            if (nextPmDue == null) {
                nextPmDue = req.getMaintenanceDate().plusMonths(pmCycle);
            }
        }

        MaintenanceRecord record = MaintenanceRecord.builder()
                .maintenanceNumber(mntNumber)
                .equipment(equipment)
                .maintenanceType(req.getMaintenanceType())
                .maintenanceDate(req.getMaintenanceDate())
                .performer(req.getPerformer())
                .cost(req.getCost() != null ? req.getCost() : BigDecimal.ZERO)
                .maintenanceResult(req.getMaintenanceResult())
                .partsReplaced(req.getPartsReplaced())
                .downtimeHours(req.getDowntimeHours() != null ? req.getDowntimeHours() : BigDecimal.ZERO)
                .details(req.getDetails())
                .verifiedBy(req.getVerifiedBy())
                .nextPmDueDate(nextPmDue)
                .remarks(req.getRemarks())
                .isDeleted(false)
                .createdBy(username)
                .lastModifiedBy(username)
                .build();

        MaintenanceRecord saved = maintenanceRepository.save(record);

        // PM 완료 시 장비 마스터 갱신
        if (req.getMaintenanceType() == MaintenanceType.PREVENTIVE_PM && req.getMaintenanceResult() == MaintenanceResult.COMPLETED) {
            equipment.setLastPmDate(req.getMaintenanceDate());
            equipment.setNextPmDueDate(nextPmDue);
            if (equipment.getStatus() == EquipmentStatus.UNDER_MAINTENANCE) {
                equipment.setStatus(EquipmentStatus.OPERATIONAL);
            }
            equipment.setLastModifiedBy(username);
        } else if (req.getMaintenanceResult() == MaintenanceResult.PARTIAL) {
            equipment.setStatus(EquipmentStatus.UNDER_MAINTENANCE);
            equipment.setLastModifiedBy(username);
        }

        log.info("[MAINTENANCE] Registered maintenance {} for equipment {} (Type: {}) by {}",
                saved.getMaintenanceNumber(), equipment.getEquipmentCode(), saved.getMaintenanceType(), username);

        return MaintenanceRecordResponse.fromEntity(saved);
    }

    @Transactional
    public MaintenanceRecordResponse updateMaintenanceRecord(Long id, MaintenanceRecordRequest req, String username) {
        MaintenanceRecord record = maintenanceRepository.findById(id)
                .filter(m -> !Boolean.TRUE.equals(m.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 유지보수 기록입니다. ID: " + id));

        Equipment equipment = record.getEquipment();

        LocalDate nextPmDue = req.getNextPmDueDate();
        if (req.getMaintenanceType() == MaintenanceType.PREVENTIVE_PM) {
            Integer pmCycle = equipment.getPmCycleMonths() != null ? equipment.getPmCycleMonths() : 6;
            if (nextPmDue == null) {
                nextPmDue = req.getMaintenanceDate().plusMonths(pmCycle);
            }
        }

        record.setMaintenanceType(req.getMaintenanceType());
        record.setMaintenanceDate(req.getMaintenanceDate());
        record.setPerformer(req.getPerformer());
        record.setCost(req.getCost() != null ? req.getCost() : BigDecimal.ZERO);
        record.setMaintenanceResult(req.getMaintenanceResult());
        record.setPartsReplaced(req.getPartsReplaced());
        record.setDowntimeHours(req.getDowntimeHours() != null ? req.getDowntimeHours() : BigDecimal.ZERO);
        record.setDetails(req.getDetails());
        record.setVerifiedBy(req.getVerifiedBy());
        record.setNextPmDueDate(nextPmDue);
        record.setRemarks(req.getRemarks());
        record.setLastModifiedBy(username);

        if (req.getMaintenanceType() == MaintenanceType.PREVENTIVE_PM && req.getMaintenanceResult() == MaintenanceResult.COMPLETED) {
            equipment.setLastPmDate(req.getMaintenanceDate());
            equipment.setNextPmDueDate(nextPmDue);
            if (equipment.getStatus() == EquipmentStatus.UNDER_MAINTENANCE) {
                equipment.setStatus(EquipmentStatus.OPERATIONAL);
            }
            equipment.setLastModifiedBy(username);
        }

        log.info("[MAINTENANCE] Updated maintenance {} by {}", record.getMaintenanceNumber(), username);
        return MaintenanceRecordResponse.fromEntity(record);
    }

    @Transactional(readOnly = true)
    public MaintenanceRecordResponse getMaintenanceRecordById(Long id) {
        MaintenanceRecord record = maintenanceRepository.findById(id)
                .filter(m -> !Boolean.TRUE.equals(m.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 유지보수 기록입니다. ID: " + id));
        return MaintenanceRecordResponse.fromEntity(record);
    }

    @Transactional(readOnly = true)
    public List<MaintenanceRecordResponse> getAllMaintenanceRecords() {
        return maintenanceRepository.findAllByIsDeletedFalseOrderByMaintenanceDateDesc().stream()
                .map(MaintenanceRecordResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MaintenanceRecordResponse> getMaintenanceRecordsByEquipment(Long equipmentId) {
        return maintenanceRepository.findAllByEquipmentIdAndIsDeletedFalseOrderByMaintenanceDateDesc(equipmentId).stream()
                .map(MaintenanceRecordResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteMaintenanceRecord(Long id, String username) {
        MaintenanceRecord record = maintenanceRepository.findById(id)
                .filter(m -> !Boolean.TRUE.equals(m.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 유지보수 기록입니다. ID: " + id));

        record.setIsDeleted(true);
        record.setLastModifiedBy(username);
        log.warn("[MAINTENANCE] Soft-deleted maintenance {} by {}", record.getMaintenanceNumber(), username);
    }

    // =========================================================================
    // 4. 작업환경 및 청정실 모니터링 (Environmental Monitoring)
    // =========================================================================

    @Transactional
    public EnvironmentalMonitoringResponse createEnvironmentalMonitoring(EnvironmentalMonitoringRequest req, String username) {
        String envNumber = generateMonitoringNumber();

        String correctiveAction = req.getCorrectiveAction();
        if (req.getStatus() == EnvironmentalStatus.OUT_OF_SPEC && (correctiveAction == null || correctiveAction.isBlank())) {
            correctiveAction = "기준 이탈(OOS) 확인: 즉시 구역 환기율 상향, 출입 통제 및 2차 정밀 재측정 / 원인조사 착수 요망.";
        }

        EnvironmentalMonitoring entity = EnvironmentalMonitoring.builder()
                .monitoringNumber(envNumber)
                .area(req.getArea())
                .monitoringDate(req.getMonitoringDate())
                .temperature(req.getTemperature())
                .humidity(req.getHumidity())
                .differentialPressure(req.getDifferentialPressure())
                .airborneParticles05(req.getAirborneParticles05())
                .airborneParticles50(req.getAirborneParticles50())
                .microbialCount(req.getMicrobialCount())
                .status(req.getStatus())
                .inspector(req.getInspector())
                .correctiveAction(correctiveAction)
                .remarks(req.getRemarks())
                .isDeleted(false)
                .createdBy(username)
                .lastModifiedBy(username)
                .build();

        EnvironmentalMonitoring saved = environmentalRepository.save(entity);
        log.info("[ENVIRONMENT] Logged monitoring {} for area {} (Status: {}) by {}",
                saved.getMonitoringNumber(), saved.getArea(), saved.getStatus(), username);

        return EnvironmentalMonitoringResponse.fromEntity(saved);
    }

    @Transactional
    public EnvironmentalMonitoringResponse updateEnvironmentalMonitoring(Long id, EnvironmentalMonitoringRequest req, String username) {
        EnvironmentalMonitoring entity = environmentalRepository.findById(id)
                .filter(e -> !Boolean.TRUE.equals(e.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 환경 모니터링 기록입니다. ID: " + id));

        entity.setArea(req.getArea());
        entity.setMonitoringDate(req.getMonitoringDate());
        entity.setTemperature(req.getTemperature());
        entity.setHumidity(req.getHumidity());
        entity.setDifferentialPressure(req.getDifferentialPressure());
        entity.setAirborneParticles05(req.getAirborneParticles05());
        entity.setAirborneParticles50(req.getAirborneParticles50());
        entity.setMicrobialCount(req.getMicrobialCount());
        entity.setStatus(req.getStatus());
        entity.setInspector(req.getInspector());
        entity.setCorrectiveAction(req.getCorrectiveAction());
        entity.setRemarks(req.getRemarks());
        entity.setLastModifiedBy(username);

        log.info("[ENVIRONMENT] Updated monitoring {} by {}", entity.getMonitoringNumber(), username);
        return EnvironmentalMonitoringResponse.fromEntity(entity);
    }

    @Transactional(readOnly = true)
    public EnvironmentalMonitoringResponse getEnvironmentalMonitoringById(Long id) {
        EnvironmentalMonitoring entity = environmentalRepository.findById(id)
                .filter(e -> !Boolean.TRUE.equals(e.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 환경 모니터링 기록입니다. ID: " + id));
        return EnvironmentalMonitoringResponse.fromEntity(entity);
    }

    @Transactional(readOnly = true)
    public List<EnvironmentalMonitoringResponse> getAllEnvironmentalMonitorings() {
        return environmentalRepository.findAllByIsDeletedFalseOrderByMonitoringDateDesc().stream()
                .map(EnvironmentalMonitoringResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EnvironmentalMonitoringResponse> getEnvironmentalMonitoringsByArea(EnvironmentalArea area) {
        return environmentalRepository.findAllByAreaAndIsDeletedFalseOrderByMonitoringDateDesc(area).stream()
                .map(EnvironmentalMonitoringResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteEnvironmentalMonitoring(Long id, String username) {
        EnvironmentalMonitoring entity = environmentalRepository.findById(id)
                .filter(e -> !Boolean.TRUE.equals(e.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 환경 모니터링 기록입니다. ID: " + id));

        entity.setIsDeleted(true);
        entity.setLastModifiedBy(username);
        log.warn("[ENVIRONMENT] Soft-deleted monitoring {} by {}", entity.getMonitoringNumber(), username);
    }

    // =========================================================================
    // 5. 종합 KPI 집계
    // =========================================================================

    @Transactional(readOnly = true)
    public FacilityKpiResponse getFacilityKpi() {
        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysLater = today.plusDays(30);

        EquipmentRepository.EquipmentKpiProjection eqKpi = equipmentRepository.getEquipmentKpiSummary(today, thirtyDaysLater);

        long total = eqKpi != null && eqKpi.getTotalEquipment() != null ? eqKpi.getTotalEquipment() : 0L;
        long operational = eqKpi != null && eqKpi.getOperationalEquipment() != null ? eqKpi.getOperationalEquipment() : 0L;
        long overdueCal = eqKpi != null && eqKpi.getOverdueCalibrations() != null ? eqKpi.getOverdueCalibrations() : 0L;
        long dueSoonCal = eqKpi != null && eqKpi.getDueSoonCalibrations() != null ? eqKpi.getDueSoonCalibrations() : 0L;
        long dueSoonPm = eqKpi != null && eqKpi.getDueSoonPm() != null ? eqKpi.getDueSoonPm() : 0L;

        BigDecimal opRate = total > 0
                ? BigDecimal.valueOf(operational)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long failedCalibrations = calibrationRepository.countByResultAndIsDeletedFalse(CalibrationResult.FAIL);

        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        long recentOos = environmentalRepository.countByStatusInAndMonitoringDateAfterAndIsDeletedFalse(
                List.of(EnvironmentalStatus.OUT_OF_SPEC), thirtyDaysAgo);

        return FacilityKpiResponse.builder()
                .totalEquipment(total)
                .operationalEquipment(operational)
                .operationalRate(opRate)
                .overdueCalibrations(overdueCal)
                .dueSoonCalibrations(dueSoonCal)
                .totalCalibrationAttention(overdueCal + dueSoonCal)
                .dueSoonPm(dueSoonPm)
                .failedCalibrations(failedCalibrations)
                .recentEnvironmentalOos(recentOos)
                .build();
    }

    // =========================================================================
    // 채번 및 유틸리티
    // =========================================================================

    private String generateEquipmentCode() {
        String todayStr = LocalDate.now().format(DATE_FORMATTER);
        String prefix = "EQ-" + todayStr + "-";
        return equipmentRepository.findTopByEquipmentCodeStartingWithOrderByEquipmentCodeDesc(prefix)
                .map(e -> {
                    String lastCode = e.getEquipmentCode();
                    int lastSeq = Integer.parseInt(lastCode.substring(lastCode.lastIndexOf("-") + 1));
                    return String.format("%s%03d", prefix, lastSeq + 1);
                })
                .orElse(prefix + "001");
    }

    private String generateCalibrationNumber() {
        String todayStr = LocalDate.now().format(DATE_FORMATTER);
        String prefix = "CAL-" + todayStr + "-";
        return calibrationRepository.findTopByCalibrationNumberStartingWithOrderByCalibrationNumberDesc(prefix)
                .map(c -> {
                    String lastNumber = c.getCalibrationNumber();
                    int lastSeq = Integer.parseInt(lastNumber.substring(lastNumber.lastIndexOf("-") + 1));
                    return String.format("%s%03d", prefix, lastSeq + 1);
                })
                .orElse(prefix + "001");
    }

    private String generateMaintenanceNumber() {
        String todayStr = LocalDate.now().format(DATE_FORMATTER);
        String prefix = "MNT-" + todayStr + "-";
        return maintenanceRepository.findTopByMaintenanceNumberStartingWithOrderByMaintenanceNumberDesc(prefix)
                .map(m -> {
                    String lastNumber = m.getMaintenanceNumber();
                    int lastSeq = Integer.parseInt(lastNumber.substring(lastNumber.lastIndexOf("-") + 1));
                    return String.format("%s%03d", prefix, lastSeq + 1);
                })
                .orElse(prefix + "001");
    }

    private String generateMonitoringNumber() {
        String todayStr = LocalDate.now().format(DATE_FORMATTER);
        String prefix = "ENV-" + todayStr + "-";
        return environmentalRepository.findTopByMonitoringNumberStartingWithOrderByMonitoringNumberDesc(prefix)
                .map(env -> {
                    String lastNumber = env.getMonitoringNumber();
                    int lastSeq = Integer.parseInt(lastNumber.substring(lastNumber.lastIndexOf("-") + 1));
                    return String.format("%s%03d", prefix, lastSeq + 1);
                })
                .orElse(prefix + "001");
    }

    private EquipmentResponse toEquipmentResponse(Equipment e) {
        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysLater = today.plusDays(30);
        return EquipmentResponse.fromEntity(e, today, thirtyDaysLater);
    }
}
