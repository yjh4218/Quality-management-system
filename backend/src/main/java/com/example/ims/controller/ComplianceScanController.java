package com.example.ims.controller;

import com.example.ims.dto.ComplianceScanDto;
import com.example.ims.service.ComplianceScanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/compliance")
@RequiredArgsConstructor
public class ComplianceScanController {

    private final ComplianceScanService complianceScanService;

    @PostMapping("/scan")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    public ResponseEntity<ComplianceScanDto.Response> scanIngredients(@RequestBody ComplianceScanDto.Request request) {
        return ResponseEntity.ok(complianceScanService.scanIngredients(request));
    }
}
