package com.example.ims.controller;

import com.example.ims.dto.LotPpmAnalysisDto;
import com.example.ims.dto.QualityAnalyticsSummaryDto;
import com.example.ims.service.LotRootCauseAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/quality-analytics")
@RequiredArgsConstructor
public class LotPpmAnalyticsController {

    private final LotRootCauseAnalysisService lotRootCauseAnalysisService;

    @GetMapping("/lot-ppm")
    @PreAuthorize("hasAnyRole(T(com.example.ims.config.RoleConstants).ADMIN_NAME, T(com.example.ims.config.RoleConstants).QUALITY_NAME, T(com.example.ims.config.RoleConstants).QUALITY_TEAM_NAME)")
    public ResponseEntity<List<LotPpmAnalysisDto>> getLotPpmAnalysis(
            @RequestParam(required = false) String itemCode,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String lotNumber,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "false") boolean groupByMaster) {
        
        List<LotPpmAnalysisDto> results = lotRootCauseAnalysisService.analyzeLotPpm(itemCode, productName, lotNumber, startDate, endDate, groupByMaster);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole(T(com.example.ims.config.RoleConstants).ADMIN_NAME, T(com.example.ims.config.RoleConstants).QUALITY_NAME, T(com.example.ims.config.RoleConstants).QUALITY_TEAM_NAME)")
    public ResponseEntity<QualityAnalyticsSummaryDto> getQualityAnalyticsSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        QualityAnalyticsSummaryDto summary = lotRootCauseAnalysisService.getQualityAnalyticsSummary(startDate, endDate);
        return ResponseEntity.ok(summary);
    }
}
