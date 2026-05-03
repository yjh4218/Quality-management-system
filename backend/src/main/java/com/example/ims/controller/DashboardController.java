package com.example.ims.controller;

import com.example.ims.dto.DashboardDTO;
import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import com.example.ims.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getDashboard() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body("Not authenticated");
            }
            User user = userRepository.findByUsername(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found: " + auth.getName()));
            
            return ResponseEntity.ok(dashboardService.getDashboardData(user));
        } catch (Exception e) {
            e.printStackTrace();
            String errorMessage = e.getMessage();
            if (e.getCause() != null) {
                errorMessage += " | CAUSE: " + e.getCause().getMessage();
            }
            return ResponseEntity.status(500).body("Dashboard Error: " + errorMessage);
        }
    }
}
