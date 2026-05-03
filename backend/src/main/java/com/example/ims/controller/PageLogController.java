package com.example.ims.controller;

import com.example.ims.service.AuditLogService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class PageLogController {

    private final AuditLogService auditLogService;

    @PostMapping("/page-view")
    public ResponseEntity<Void> logPageView(@RequestBody PageViewRequest request, Authentication authentication) {
        if (authentication != null && authentication.getName() != null) {
            auditLogService.logPageView(authentication.getName(), request.getPageKey(), request.getPageTitle());
        }
        return ResponseEntity.ok().build();
    }

    @Data
    public static class PageViewRequest {
        private String pageKey;
        private String pageTitle;
    }
}
