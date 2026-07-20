package com.example.ims.controller;

import com.example.ims.entity.SpaceRatioCheckLog;
import com.example.ims.service.packaging.spaceratio.SpaceRatioRequest;
import com.example.ims.service.packaging.spaceratio.SpaceRatioResult;
import com.example.ims.service.packaging.spaceratio.SpaceRatioService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

/**
 * 국가별 포장공간비율 자동검증 및 독립 계산용 API 컨트롤러
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class SpaceRatioController {

    private final SpaceRatioService spaceRatioService;

    /**
     * 특정 상품 기준 6개국 포장공간비율 자동 검증 실행 API
     */
    @PostMapping("/products/{productId}/space-ratio-check")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES')")
    public ResponseEntity<List<SpaceRatioResult>> checkProductSpaceRatio(
            @PathVariable Long productId,
            Principal principal) {
        String username = principal != null ? principal.getName() : "Anonymous";
        List<SpaceRatioResult> results = spaceRatioService.checkProductSpaceRatio(productId, username);
        return ResponseEntity.ok(results);
    }

    /**
     * 독립 계산기 전용 6개국 공간비율 산출 API
     */
    @PostMapping("/space-ratio/calculator")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES')")
    public ResponseEntity<List<SpaceRatioResult>> calculateSpaceRatio(
            @RequestBody SpaceRatioRequest request,
            Principal principal) {
        String username = principal != null ? principal.getName() : "Anonymous";
        List<SpaceRatioResult> results = spaceRatioService.calculateSpaceRatio(request, username);
        return ResponseEntity.ok(results);
    }

    /**
     * 포장공간비율 검증 이력 최신순 조회 API (페이징 필수 정책 준수)
     */
    @GetMapping("/space-ratio/logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<Page<SpaceRatioCheckLog>> getLogs(
            @PageableDefault(size = 20, sort = "checkedAt") Pageable pageable) {
        Page<SpaceRatioCheckLog> logs = spaceRatioService.getCheckLogs(pageable);
        return ResponseEntity.ok(logs);
    }
}
