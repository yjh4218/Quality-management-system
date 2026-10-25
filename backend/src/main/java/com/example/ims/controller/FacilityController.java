package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.EnvironmentalArea;
import com.example.ims.service.FacilityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/facilities")
@RequiredArgsConstructor
public class FacilityController {

    private final FacilityService facilityService;

    // =========================================================================
    // KPI
    // =========================================================================

    @GetMapping("/kpi")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_VIEW')")
    public ResponseEntity<FacilityKpiResponse> getFacilityKpi() {
        return ResponseEntity.ok(facilityService.getFacilityKpi());
    }

    // =========================================================================
    // 1. 장비/설비 (Equipment)
    // =========================================================================

    @GetMapping("/equipments")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_VIEW')")
    public ResponseEntity<List<EquipmentResponse>> getAllEquipments() {
        return ResponseEntity.ok(facilityService.getAllEquipments());
    }

    @GetMapping("/equipments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_VIEW')")
    public ResponseEntity<EquipmentResponse> getEquipmentById(@PathVariable Long id) {
        return ResponseEntity.ok(facilityService.getEquipmentById(id));
    }

    @PostMapping("/equipments")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_MANAGE')")
    public ResponseEntity<EquipmentResponse> createEquipment(
            @Valid @RequestBody EquipmentRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED).body(facilityService.createEquipment(req, username));
    }

    @PutMapping("/equipments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_MANAGE')")
    public ResponseEntity<EquipmentResponse> updateEquipment(
            @PathVariable Long id,
            @Valid @RequestBody EquipmentRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(facilityService.updateEquipment(id, req, username));
    }

    @DeleteMapping("/equipments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_MANAGE')")
    public ResponseEntity<Map<String, String>> deleteEquipment(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        facilityService.deleteEquipment(id, username);
        return ResponseEntity.ok(Map.of("message", "장비가 정상적으로 삭제되었습니다.", "id", id.toString()));
    }

    // =========================================================================
    // 2. 교정 이력 (Calibration Records)
    // =========================================================================

    @GetMapping("/calibrations")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_VIEW')")
    public ResponseEntity<List<CalibrationRecordResponse>> getAllCalibrationRecords() {
        return ResponseEntity.ok(facilityService.getAllCalibrationRecords());
    }

    @GetMapping("/calibrations/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_VIEW')")
    public ResponseEntity<CalibrationRecordResponse> getCalibrationRecordById(@PathVariable Long id) {
        return ResponseEntity.ok(facilityService.getCalibrationRecordById(id));
    }

    @GetMapping("/equipments/{equipmentId}/calibrations")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_VIEW')")
    public ResponseEntity<List<CalibrationRecordResponse>> getCalibrationRecordsByEquipment(@PathVariable Long equipmentId) {
        return ResponseEntity.ok(facilityService.getCalibrationRecordsByEquipment(equipmentId));
    }

    @PostMapping("/calibrations")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_MANAGE')")
    public ResponseEntity<CalibrationRecordResponse> createCalibrationRecord(
            @Valid @RequestBody CalibrationRecordRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED).body(facilityService.createCalibrationRecord(req, username));
    }

    @PutMapping("/calibrations/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_MANAGE')")
    public ResponseEntity<CalibrationRecordResponse> updateCalibrationRecord(
            @PathVariable Long id,
            @Valid @RequestBody CalibrationRecordRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(facilityService.updateCalibrationRecord(id, req, username));
    }

    @DeleteMapping("/calibrations/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_MANAGE')")
    public ResponseEntity<Map<String, String>> deleteCalibrationRecord(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        facilityService.deleteCalibrationRecord(id, username);
        return ResponseEntity.ok(Map.of("message", "교정 기록이 삭제되었습니다.", "id", id.toString()));
    }

    // =========================================================================
    // 3. 유지보수 및 예방보전 (Maintenance & PM)
    // =========================================================================

    @GetMapping("/maintenances")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_VIEW')")
    public ResponseEntity<List<MaintenanceRecordResponse>> getAllMaintenanceRecords() {
        return ResponseEntity.ok(facilityService.getAllMaintenanceRecords());
    }

    @GetMapping("/maintenances/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_VIEW')")
    public ResponseEntity<MaintenanceRecordResponse> getMaintenanceRecordById(@PathVariable Long id) {
        return ResponseEntity.ok(facilityService.getMaintenanceRecordById(id));
    }

    @GetMapping("/equipments/{equipmentId}/maintenances")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_VIEW')")
    public ResponseEntity<List<MaintenanceRecordResponse>> getMaintenanceRecordsByEquipment(@PathVariable Long equipmentId) {
        return ResponseEntity.ok(facilityService.getMaintenanceRecordsByEquipment(equipmentId));
    }

    @PostMapping("/maintenances")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_MANAGE')")
    public ResponseEntity<MaintenanceRecordResponse> createMaintenanceRecord(
            @Valid @RequestBody MaintenanceRecordRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED).body(facilityService.createMaintenanceRecord(req, username));
    }

    @PutMapping("/maintenances/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_MANAGE')")
    public ResponseEntity<MaintenanceRecordResponse> updateMaintenanceRecord(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceRecordRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(facilityService.updateMaintenanceRecord(id, req, username));
    }

    @DeleteMapping("/maintenances/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_MANAGE')")
    public ResponseEntity<Map<String, String>> deleteMaintenanceRecord(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        facilityService.deleteMaintenanceRecord(id, username);
        return ResponseEntity.ok(Map.of("message", "유지보수 기록이 삭제되었습니다.", "id", id.toString()));
    }

    // =========================================================================
    // 4. 환경 모니터링 (Environmental Monitoring)
    // =========================================================================

    @GetMapping("/environments")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_VIEW')")
    public ResponseEntity<List<EnvironmentalMonitoringResponse>> getAllEnvironmentalMonitorings(
            @RequestParam(required = false) EnvironmentalArea area) {
        if (area != null) {
            return ResponseEntity.ok(facilityService.getEnvironmentalMonitoringsByArea(area));
        }
        return ResponseEntity.ok(facilityService.getAllEnvironmentalMonitorings());
    }

    @GetMapping("/environments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_VIEW')")
    public ResponseEntity<EnvironmentalMonitoringResponse> getEnvironmentalMonitoringById(@PathVariable Long id) {
        return ResponseEntity.ok(facilityService.getEnvironmentalMonitoringById(id));
    }

    @PostMapping("/environments")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_MANAGE')")
    public ResponseEntity<EnvironmentalMonitoringResponse> createEnvironmentalMonitoring(
            @Valid @RequestBody EnvironmentalMonitoringRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED).body(facilityService.createEnvironmentalMonitoring(req, username));
    }

    @PutMapping("/environments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_MANAGE')")
    public ResponseEntity<EnvironmentalMonitoringResponse> updateEnvironmentalMonitoring(
            @PathVariable Long id,
            @Valid @RequestBody EnvironmentalMonitoringRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(facilityService.updateEnvironmentalMonitoring(id, req, username));
    }

    @DeleteMapping("/environments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('FACILITY_MANAGE')")
    public ResponseEntity<Map<String, String>> deleteEnvironmentalMonitoring(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        facilityService.deleteEnvironmentalMonitoring(id, username);
        return ResponseEntity.ok(Map.of("message", "환경 모니터링 기록이 삭제되었습니다.", "id", id.toString()));
    }
}
