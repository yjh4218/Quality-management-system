package com.example.ims.controller;

import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class AdminController {

    private final UserRepository userRepository;
    private final com.example.ims.service.MailService mailService;
    private final com.example.ims.service.RoleService roleService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MENU_USERS_VIEW')")
    public ResponseEntity<List<com.example.ims.dto.UserResponseDto>> getAllUsers(
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
        List<com.example.ims.dto.UserResponseDto> response = users.stream()
                .map(com.example.ims.dto.UserResponseDto::fromEntity)
                .collect(java.util.stream.Collectors.toList());
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MENU_USERS_EDIT')")
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public ResponseEntity<?> approveUser(@PathVariable Long id) {
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
                    
                    return ResponseEntity.ok("User approved successfully");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MENU_USERS_EDIT')")
    public ResponseEntity<?> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String newRole = payload.get("role");
        
        // [수정] 하드코딩된 RoleConstants 대신 동적 RoleService를 통해 유효성 검증
        if (!roleService.isValidRole(newRole)) {
            log.warn("[SECURITY] Invalid dynamic role update attempt: {}", newRole);
            return ResponseEntity.badRequest().body("Invalid role specified or not registered in Role Management");
        }

        log.info("[ADMIN] Updating user {} role to {}", id, newRole);
        return userRepository.findById(id)
                .map(user -> {
                    user.setRole(newRole);
                    userRepository.save(user);
                    return ResponseEntity.ok("User role updated to " + newRole);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('MENU_USERS_EDIT')")
    @org.springframework.cache.annotation.CacheEvict(value = "dashboard", allEntries = true)
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    // Prevent deactivating admin accounts
                    if (com.example.ims.config.RoleConstants.ADMIN.equals(user.getRole())) {
                        return ResponseEntity.badRequest().body("Admin accounts cannot be deactivated");
                    }
                    user.setEnabled(!user.isEnabled());
                    userRepository.save(user);
                    log.info("[ADMIN] User {} status toggled to {}", user.getUsername(), user.isEnabled());
                    return ResponseEntity.ok("User status toggled to " + user.isEnabled());
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
