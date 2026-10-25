package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.service.CsvValidationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/csv-validation")
@RequiredArgsConstructor
@Slf4j
public class CsvValidationController {

    private final CsvValidationService csvService;

    // -------------------------------------------------------------------------
    // 0. KPI 지표
    // -------------------------------------------------------------------------

    @GetMapping("/kpi")
    public ResponseEntity<CsvKpiResponse> getKpi() {
        return ResponseEntity.ok(csvService.getKpi());
    }

    // -------------------------------------------------------------------------
    // 1. Projects
    // -------------------------------------------------------------------------

    @GetMapping("/projects")
    public ResponseEntity<List<CsvProjectResponse>> getAllProjects() {
        return ResponseEntity.ok(csvService.getAllProjects());
    }

    @GetMapping("/projects/{id}")
    public ResponseEntity<CsvProjectResponse> getProjectById(@PathVariable Long id) {
        return ResponseEntity.ok(csvService.getProjectById(id));
    }

    @PostMapping("/projects")
    public ResponseEntity<CsvProjectResponse> createProject(
            @Valid @RequestBody CsvProjectRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED).body(csvService.createProject(req, username));
    }

    @PutMapping("/projects/{id}")
    public ResponseEntity<CsvProjectResponse> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody CsvProjectRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "admin";
        return ResponseEntity.ok(csvService.updateProject(id, req, username));
    }

    @DeleteMapping("/projects/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        csvService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------
    // 2. Protocols
    // -------------------------------------------------------------------------

    @GetMapping("/projects/{projectId}/protocols")
    public ResponseEntity<List<CsvProtocolResponse>> getProtocolsByProjectId(@PathVariable Long projectId) {
        return ResponseEntity.ok(csvService.getProtocolsByProjectId(projectId));
    }

    @PostMapping("/protocols")
    public ResponseEntity<CsvProtocolResponse> createProtocol(
            @Valid @RequestBody CsvProtocolRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED).body(csvService.createProtocol(req, username));
    }

    @PutMapping("/protocols/{id}")
    public ResponseEntity<CsvProtocolResponse> updateProtocol(
            @PathVariable Long id,
            @Valid @RequestBody CsvProtocolRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "admin";
        return ResponseEntity.ok(csvService.updateProtocol(id, req, username));
    }

    @DeleteMapping("/protocols/{id}")
    public ResponseEntity<Void> deleteProtocol(@PathVariable Long id) {
        csvService.deleteProtocol(id);
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------
    // 3. Defects
    // -------------------------------------------------------------------------

    @GetMapping("/projects/{projectId}/defects")
    public ResponseEntity<List<CsvDefectResponse>> getDefectsByProjectId(@PathVariable Long projectId) {
        return ResponseEntity.ok(csvService.getDefectsByProjectId(projectId));
    }

    @PostMapping("/defects")
    public ResponseEntity<CsvDefectResponse> createDefect(
            @Valid @RequestBody CsvDefectRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED).body(csvService.createDefect(req, username));
    }

    @PutMapping("/defects/{id}")
    public ResponseEntity<CsvDefectResponse> updateDefect(
            @PathVariable Long id,
            @Valid @RequestBody CsvDefectRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "admin";
        return ResponseEntity.ok(csvService.updateDefect(id, req, username));
    }

    @DeleteMapping("/defects/{id}")
    public ResponseEntity<Void> deleteDefect(@PathVariable Long id) {
        csvService.deleteDefect(id);
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------
    // 4. Go-Live Approval
    // -------------------------------------------------------------------------

    @GetMapping("/projects/{projectId}/go-live")
    public ResponseEntity<CsvGoLiveResponse> getGoLiveApproval(@PathVariable Long projectId) {
        CsvGoLiveResponse response = csvService.getGoLiveApprovalByProjectId(projectId);
        return response != null ? ResponseEntity.ok(response) : ResponseEntity.noContent().build();
    }

    @PostMapping("/go-live")
    public ResponseEntity<CsvGoLiveResponse> createOrUpdateGoLiveApproval(
            @Valid @RequestBody CsvGoLiveRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "admin";
        return ResponseEntity.ok(csvService.createOrUpdateGoLiveApproval(req, username));
    }
}
