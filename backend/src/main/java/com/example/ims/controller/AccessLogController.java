package com.example.ims.controller;

import com.example.ims.entity.AccessLog;
import com.example.ims.service.AccessLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.example.ims.repository.UserRepository;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/logs/access")
@RequiredArgsConstructor
public class AccessLogController {

    private final AccessLogService accessLogService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AccessLog>> getAllLogs() {
        return ResponseEntity.ok(accessLogService.getAllLogs());
    }

    @PostMapping("/page-move")
    public ResponseEntity<Void> logPageMove(@RequestBody Map<String, String> payload, 
                                          Authentication authentication, 
                                          HttpServletRequest request) {
        if (authentication != null) {
            String username = authentication.getName();
            String pageKey = payload.get("pageKey");
            String pageTitle = payload.get("pageTitle");
            
            // Fetch name from user entity for better logging
            String name = userRepository.findByUsername(username)
                    .map(u -> u.getName())
                    .orElse(username);

            accessLogService.log(username, name, "PAGE_MOVE", pageKey, pageTitle, request);
        }
        return ResponseEntity.ok().build();
    }
}
