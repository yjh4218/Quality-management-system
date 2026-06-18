package com.example.ims.controller;

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
            return ResponseEntity.status(500).body("시스템 대시보드 데이터를 수집하는 중 오류가 발생했습니다. 지속 발생 시 관리자에게 문의해 주세요.");
        }
    }
}
