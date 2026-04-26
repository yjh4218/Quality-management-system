package com.example.ims.controller;

import com.example.ims.dto.DataTransferDto;
import com.example.ims.entity.SystemPageGuide;
import com.example.ims.service.DataTransferService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 시스템 관리 및 마이그레이션을 위한 관리자 전용 컨트롤러.
 * [보안] 헬스체크를 제외한 모든 기능은 ADMIN 권한이 필수입니다.
 */
@RestController
@RequestMapping("/api/admin/system")
@RequiredArgsConstructor
@Slf4j
public class AdminSystemController {

    private final DataTransferService migrationService;

    /**
     * 시스템 상태 확인 및 배포 버전 확인 (인증 불필요 - 로드밸런서용)
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK-v26-SECURED-" + java.time.LocalDateTime.now());
    }

    /**
     * 마이그레이션 진행 상태 조회 (ADMIN 권한 필요)
     */
    @GetMapping("/migration-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> getMigrationStatus() {
        Map<String, String> status = new HashMap<>();
        status.put("status", migrationService.getMigrationStatus());
        status.put("lastError", migrationService.getMigrationError());
        return ResponseEntity.ok(status);
    }

    /**
     * 전체 데이터 임포트 실행 (ADMIN 권한 필요)
     * [무결성] @Transactional을 적용하여 전체 프로세스 성공 시에만 최종 반영되도록 보장합니다.
     */
    @PostMapping("/import-from-file")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(rollbackFor = Exception.class)
    public ResponseEntity<Map<String, String>> importFromFile() {
        Map<String, String> response = new HashMap<>();
        String filePath = "h2_migration_data.json";

        try {
            log.info(">>>> [ADMIN] TRIGGERING BULK IMPORT FROM FILE: {}...", filePath);

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
            mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            java.io.File file = new java.io.File(filePath);
            if (!file.exists()) {
                response.put("status", "Failed");
                response.put("message", "Migration file not found.");
                return ResponseEntity.status(404).body(response);
            }

            DataTransferDto data = mapper.readValue(file, DataTransferDto.class);

            // 데이터 임포트 실행
            migrationService.importData(data);

            response.put("status", "Success");
            response.put("message", "Bulk data import completed.");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Bulk import failed", e);
            response.put("status", "Failed");
            response.put("message", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/page-guides")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SystemPageGuide>> getPageGuides() {
        return ResponseEntity.ok(migrationService.getPageGuides());
    }

    /**
     * 페이지 가이드 마이그레이션 (ADMIN 권한 필요)
     */
    @PostMapping("/page-guides/migrate")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(rollbackFor = Exception.class)
    public ResponseEntity<Map<String, Object>> migratePageGuides(@RequestBody List<SystemPageGuide> guides) {
        Map<String, Object> response = new HashMap<>();
        try {
            migrationService.upsertPageGuidesWithReset(guides);
            response.put("status", "success");
            response.put("message", "Page guides replaced and migrated.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Page guide migration failed", e);
            response.put("status", "failed");
            response.put("message", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/page-guides/upsert")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> upsertPageGuides(@RequestBody List<SystemPageGuide> guides) {
        try {
            Map<String, Object> result = migrationService.upsertPageGuides(guides);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Page guide upsert failed", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "failed");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/diag")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getDiagnostics() {
        return ResponseEntity.ok(new HashMap<>());
    }
}
