package com.example.ims.controller;

import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import com.example.ims.service.AuditLogService;
import com.example.ims.service.EmailService;
import com.example.ims.service.MailService;
import com.example.ims.service.RoleService;
import com.example.ims.config.RoleConstants;
import com.example.ims.dto.UserResponseDto;
import com.example.ims.dto.RoleUpdateRequestDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final UserRepository userRepository;
    private final MailService mailService;
    private final EmailService emailService;
    private final RoleService roleService;
    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("@perm.can('users', 'VIEW')")
    public ResponseEntity<List<UserResponseDto>> getAllUsers(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String companyName,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String role) {
        
        List<User> users;
        if ((name != null && !name.isBlank()) || (companyName != null && !companyName.isBlank())
                || (department != null && !department.isBlank()) || (role != null && !role.isBlank())) {
            users = userRepository.searchUsers(name, companyName, department, role);
        } else {
            users = userRepository.findAll();
        }

        // [보안] 엔티티 대신 DTO를 반환하여 패스워드 해시 등 노출 방지
        List<UserResponseDto> response = users.stream()
                .map(UserResponseDto::fromEntity)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("@perm.can('users', 'EDIT')")
    @org.springframework.cache.annotation.CacheEvict(value = {"dashboard", "dashboard_stats"}, allEntries = true)
    public ResponseEntity<?> approveUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("[ADMIN] Approving user ID: {}", id);
        return userRepository.findById(id)
                .map(user -> {
                    user.setEnabled(true);
                    userRepository.save(user);
                    
                    if (user.getEmail() != null && !user.getEmail().isBlank()) {
                        mailService.sendApprovalEmail(user.getEmail(), user.getName());
                    } else {
                        log.warn("No email address found for user: {}, skipping notification.", user.getUsername());
                    }
                    
                    String modifier = (userDetails != null) ? userDetails.getUsername() : "ADMIN";
                    try {
                        auditLogService.logAction(
                            modifier,
                            "USER_APPROVE",
                            "사용자 승인",
                            String.format("사용자 [%s](ID:%d, %s) 계정 승인 처리", user.getName(), user.getId(), user.getUsername())
                        );
                    } catch (Exception auditEx) {
                        log.error("Failed to log audit for user approval", auditEx);
                    }

                    return ResponseEntity.ok("User approved successfully");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("@perm.can('users', 'EDIT')")
    public ResponseEntity<?> updateUserRole(
            @PathVariable Long id,
            @jakarta.validation.Valid @RequestBody RoleUpdateRequestDto payload,
            @AuthenticationPrincipal UserDetails userDetails) {
        String newRole = payload.role();
        
        // [수정] 하드코딩된 RoleConstants 대신 동적 RoleService를 통해 유효성 검증
        if (!roleService.isValidRole(newRole)) {
            log.warn("[SECURITY] Invalid dynamic role update attempt: {}", newRole);
            return ResponseEntity.badRequest().body("Invalid role specified or not registered in Role Management");
        }

        log.info("[ADMIN] Updating user {} role to {}", id, newRole);
        return userRepository.findById(id)
                .map(user -> {
                    // [보안] 마스터 관리자('admin') 계정의 역할 강등 방어
                    if ("admin".equalsIgnoreCase(user.getUsername()) && !RoleConstants.ADMIN.equals(newRole)) {
                        return ResponseEntity.badRequest().body("시스템 최고 관리자(admin) 계정의 기본 권한은 강등할 수 없습니다.");
                    }

                    String oldRole = user.getRole();
                    user.setRole(newRole);
                    userRepository.save(user);

                    String modifier = (userDetails != null) ? userDetails.getUsername() : "ADMIN";
                    try {
                        auditLogService.logAction(
                            modifier,
                            "USER_ROLE_UPDATE",
                            "사용자 권한 변경",
                            String.format("사용자 [%s](ID:%d, %s) 권한 변경: [%s] -> [%s]", user.getName(), user.getId(), user.getUsername(), oldRole, newRole)
                        );
                    } catch (Exception auditEx) {
                        log.error("Failed to log audit for user role update", auditEx);
                    }

                    return ResponseEntity.ok("User role updated to " + newRole);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/toggle-status")
    @PreAuthorize("@perm.can('users', 'EDIT')")
    @org.springframework.cache.annotation.CacheEvict(value = {"dashboard", "dashboard_stats"}, allEntries = true)
    public ResponseEntity<?> toggleUserStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return userRepository.findById(id)
                .map(user -> {
                    // Prevent deactivating admin accounts
                    if ("admin".equalsIgnoreCase(user.getUsername()) || RoleConstants.ADMIN.equals(user.getRole())) {
                        return ResponseEntity.badRequest().body("Admin accounts cannot be deactivated");
                    }
                    user.setEnabled(!user.isEnabled());
                    userRepository.save(user);
                    log.info("[ADMIN] User {} status toggled to {}", user.getUsername(), user.isEnabled());

                    String modifier = (userDetails != null) ? userDetails.getUsername() : "ADMIN";
                    try {
                        auditLogService.logAction(
                            modifier,
                            "USER_STATUS_TOGGLE",
                            "사용자 상태 변경",
                            String.format("사용자 [%s](ID:%d, %s) 상태 변경: [enabled=%s]", user.getName(), user.getId(), user.getUsername(), user.isEnabled())
                        );
                    } catch (Exception auditEx) {
                        log.error("Failed to log audit for user status toggle", auditEx);
                    }

                    return ResponseEntity.ok("User status toggled to " + user.isEnabled());
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 관리자 화면에서 미인증 사용자의 인증 이메일을 수동 재발송합니다.
     */
    @PostMapping("/{id}/resend-verification")
    @PreAuthorize("@perm.can('users', 'EDIT')")
    public ResponseEntity<?> resendVerificationEmail(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return userRepository.findById(id)
                .map(user -> {
                    if (user.isEmailVerified()) {
                        return ResponseEntity.badRequest().body("이미 이메일 인증이 완료된 사용자입니다.");
                    }
                    if (user.getEmail() == null || user.getEmail().isBlank()) {
                        return ResponseEntity.badRequest().body("등록된 이메일 주소가 없습니다.");
                    }

                    String newToken = UUID.randomUUID().toString();
                    user.setVerificationToken(newToken);
                    userRepository.save(user);

                    String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
                    emailService.sendVerificationEmail(user.getEmail(), newToken, baseUrl + "/api/auth");

                    String modifier = (userDetails != null) ? userDetails.getUsername() : "ADMIN";
                    try {
                        auditLogService.logAction(
                            modifier,
                            "EMAIL_VERIFY_RESEND",
                            "이메일 인증 재발송",
                            String.format("사용자 [%s](%s) 대상 인증 이메일 재발송", user.getName(), user.getEmail())
                        );
                    } catch (Exception auditEx) {
                        log.error("Failed to log audit for email verify resend", auditEx);
                    }

                    return ResponseEntity.ok("인증 이메일이 성공적으로 재발송되었습니다.");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 폐쇄망/테스트 환경 등을 위해 관리자가 이메일 인증을 수동 강제 완료 처리합니다.
     */
    @PostMapping("/{id}/verify-email-manual")
    @PreAuthorize("@perm.can('users', 'EDIT')")
    public ResponseEntity<?> manuallyVerifyEmail(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setEmailVerified(true);
                    user.setVerificationToken(null);
                    userRepository.save(user);

                    String modifier = (userDetails != null) ? userDetails.getUsername() : "ADMIN";
                    try {
                        auditLogService.logAction(
                            modifier,
                            "EMAIL_VERIFY_MANUAL",
                            "이메일 수동 인증 완료",
                            String.format("관리자에 의해 사용자 [%s](%s) 이메일 인증 강제 완료 처리", user.getName(), user.getUsername())
                        );
                    } catch (Exception auditEx) {
                        log.error("Failed to log audit for manual email verification", auditEx);
                    }

                    return ResponseEntity.ok("이메일 인증이 수동 완료 처리되었습니다.");
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
