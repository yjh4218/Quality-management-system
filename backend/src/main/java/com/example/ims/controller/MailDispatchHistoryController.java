package com.example.ims.controller;

import com.example.ims.entity.MailDispatchHistory;
import com.example.ims.repository.MailDispatchHistoryRepository;
import com.example.ims.service.MailDispatchHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mail-histories")
@RequiredArgsConstructor
public class MailDispatchHistoryController {

    private final MailDispatchHistoryService mailDispatchHistoryService;

    @GetMapping("/domain/{domain}/{sourceId}")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','QUALITY_TEAM')")
    public ResponseEntity<List<MailDispatchHistory>> getHistoriesByDomain(
            @PathVariable String domain,
            @PathVariable Long sourceId) {
        return ResponseEntity.ok(mailDispatchHistoryService.getHistoriesByDomainAndSource(domain, sourceId));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','QUALITY_TEAM')")
    public ResponseEntity<List<MailDispatchHistory>> getAllHistories() {
        return ResponseEntity.ok(mailDispatchHistoryService.getAllHistories());
    }

    @GetMapping("/analytics/manufacturer-lead-time")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','QUALITY_TEAM')")
    public ResponseEntity<List<MailDispatchHistoryRepository.ManufacturerLeadTimeStatsProjection>> getManufacturerLeadTimeStats() {
        return ResponseEntity.ok(mailDispatchHistoryService.getManufacturerLeadTimeStats());
    }

    @PostMapping("/{id}/mark-replied")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','QUALITY_TEAM')")
    public ResponseEntity<MailDispatchHistory> markReplied(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> request) {
        String remarks = request != null ? request.get("remarks") : null;
        return ResponseEntity.ok(mailDispatchHistoryService.markRepliedById(id, remarks));
    }

    @PostMapping("/{id}/send-reminder")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','QUALITY_TEAM')")
    public ResponseEntity<MailDispatchHistory> sendReminder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String requesterName = userDetails != null ? userDetails.getUsername() : "USER";
        return ResponseEntity.ok(mailDispatchHistoryService.sendManualReminder(id, requesterName));
    }
}
