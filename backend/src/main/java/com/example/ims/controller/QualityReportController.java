package com.example.ims.controller;

import com.example.ims.entity.QualityReport;
import com.example.ims.entity.User;
import com.example.ims.entity.WmsInbound;
import com.example.ims.entity.WmsInboundHistory;
import com.example.ims.repository.UserRepository;
import com.example.ims.service.FileStorageService;
import com.example.ims.service.QualityReportService;
import com.example.ims.service.WmsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/quality")
@RequiredArgsConstructor
public class QualityReportController {

    private final WmsService wmsService;
    private final QualityReportService qualityReportService;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @GetMapping("/inbound")
    public ResponseEntity<List<WmsInbound>> getInboundData(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String itemCode,
            @RequestParam(required = false) String productName,
            @RequestParam(required = false) String lotNumber,
            @RequestParam(required = false) String manufacturer,
            @RequestParam(required = false) String excludeStatus,
            @RequestParam(required = false) String grnNumber) {
        
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // 한국 시간(KST) 기준으로 처리하여 UTC DB와 연동 시 오차 방지
        java.time.ZoneId kst = java.time.ZoneId.of("Asia/Seoul");
        java.time.LocalDateTime start = null;
        java.time.LocalDateTime end = null;

        if (startDate != null && !startDate.isEmpty()) {
            start = java.time.LocalDate.parse(startDate).atStartOfDay(kst).toOffsetDateTime().toLocalDateTime();
        }
        if (endDate != null && !endDate.isEmpty()) {
            end = java.time.LocalDate.parse(endDate).atTime(23, 59, 59, 999999999).atZone(kst).toOffsetDateTime().toLocalDateTime();
        }
        
        String companyFilter = null;
        if (!user.getRole().contains("ADMIN") && !"더파운더즈".equals(user.getCompanyName())) {
            companyFilter = user.getCompanyName();
        }

        return ResponseEntity.ok(wmsService.searchInbound(companyFilter, start, end, itemCode, productName, lotNumber, manufacturer, excludeStatus, grnNumber));
    }

    @GetMapping("/inbound/release-record")
    public ResponseEntity<List<WmsInbound>> getReleaseRecords(@RequestParam String date) {
        return ResponseEntity.ok(wmsService.getReleaseRecords(date));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'MANUFACTURER')")
    @PutMapping("/inbound/{id}")
    public ResponseEntity<WmsInbound> updateInbound(@PathVariable Long id, @RequestBody WmsInbound updatedData,
                                                   @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        boolean isACompanyQuality = "더파운더즈".equals(user.getCompanyName()) && "Quality".equals(user.getDepartment());
        boolean isAdmin = user.getRole().contains("ADMIN");
        
        if (!isAdmin && !isACompanyQuality && !user.getRole().contains("MANUFACTURER")) {
            throw new RuntimeException("수정 권한이 없습니다.");
        }
        return ResponseEntity.ok(qualityReportService.updateInbound(id, updatedData, user, isAdmin));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    @PostMapping("/inbound/{id}/complete")
    public ResponseEntity<Void> completeInspection(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        checkQualityAuthority(userDetails);
        qualityReportService.completeInspection(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/inbound/{id}/history")
    public ResponseEntity<List<WmsInboundHistory>> getInboundHistory(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return ResponseEntity.ok(qualityReportService.getInboundHistory(id, user));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'MANUFACTURER')")
    @PostMapping("/inbound/upload-coa")
    public ResponseEntity<String> uploadCoa(@RequestParam("file") MultipartFile file,
                                             @RequestParam(value = "productName", required = false) String productName) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }
        
        String fileName = fileStorageService.storeFile(file, productName);
        return ResponseEntity.ok("/uploads/" + fileName);
    }

    @PostMapping("/report")
    public ResponseEntity<QualityReport> submitReport(@RequestBody QualityReport report,
            @AuthenticationPrincipal UserDetails userDetails) {
        checkQualityAuthority(userDetails);
        report.setInspector(userDetails.getUsername());
        return ResponseEntity.ok(qualityReportService.submitReport(report));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    @PostMapping("/fetch-wms")
    public ResponseEntity<String> triggerWmsFetch() {
        wmsService.fetchAndSaveInboundData();
        return ResponseEntity.ok("WMS sync triggered (Simulated)");
    }

    private void checkQualityAuthority(UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        boolean isACompanyQuality = "더파운더즈".equals(user.getCompanyName()) && "Quality".equals(user.getDepartment());
        if (!user.getRole().contains("ADMIN") && !isACompanyQuality) {
            throw new RuntimeException("품질 검사 및 수정을 위한 권한이 없습니다. (더파운더즈 품질팀만 가능)");
        }
    }
}
