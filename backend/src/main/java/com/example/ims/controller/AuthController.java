package com.example.ims.controller;

import com.example.ims.dto.RegisterRequestDto;
import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import com.example.ims.repository.ManufacturerRepository;
import com.example.ims.repository.RoleRepository;
import com.example.ims.service.MailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ManufacturerRepository manufacturerRepository;
    private final MailService mailService;
    private final RoleRepository roleRepository;

    @PostMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        boolean exists = userRepository.findByUsername(username).isPresent();
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    /**
     * [Task 11] 신규 회원가입 신청.
     * DTO와 @Valid를 사용하여 입력 무결성을 검증합니다.
     */
    @PostMapping("/register")
    public ResponseEntity<String> registerUser(@Valid @RequestBody RegisterRequestDto dto) {
        if (userRepository.findByUsername(dto.username()).isPresent()) {
            return ResponseEntity.badRequest().body("이미 존재하는 아이디입니다.");
        }

        // 소속 제조사 존재 여부 검증
        if (dto.companyName() != null && !"더파운더즈".equals(dto.companyName()) && !dto.companyName().isBlank()) {
            manufacturerRepository.findByName(dto.companyName())
                    .orElseThrow(() -> new IllegalArgumentException("등록되지 않은 소속(제조사)입니다."));
        }

        // 비밀번호 복잡도 추가 검증 (DTO에서 길이 체크 후 로직 보강)
        validatePasswordComplexity(dto.password());

        User newUser = User.builder()
                .username(dto.username())
                .password(passwordEncoder.encode(dto.password()))
                .name(dto.name())
                .companyName(dto.companyName())
                .department(dto.department())
                .phone(dto.phone())
                .email(dto.email())
                .role("ROLE_USER") // 승인 대기 기본 역할
                .enabled(false)     // 관리자 승인 전까지 비활성화
                .locked(false)
                .failedAttempts(0)
                .build();

        userRepository.save(newUser);
        log.info("[AUTH] New registration request: {}", dto.username());
        
        return ResponseEntity.ok("회원가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.");
    }

    @PostMapping("/find-password")
    public ResponseEntity<?> findPassword(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String name = body.get("name");
        String email = body.get("email");

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("해당 정보를 가진 사용자를 찾을 수 없습니다."));

        if (!user.getName().equals(name) || !user.getEmail().equals(email)) {
            return ResponseEntity.badRequest().body("입력하신 정보가 일치하지 않습니다.");
        }

        String tempPw = UUID.randomUUID().toString().substring(0, 8);
        user.setPassword(passwordEncoder.encode(tempPw));
        user.setPasswordResetRequired(true);
        userRepository.save(user);

        mailService.sendTemporaryPassword(email, name, tempPw);
        return ResponseEntity.ok("임시 비밀번호가 메일로 발송되었습니다.");
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("name", user.getName());
        response.put("companyName", user.getCompanyName());
        response.put("department", user.getDepartment());
        response.put("passwordResetRequired", Boolean.TRUE.equals(user.getPasswordResetRequired()));

        // 권한 정보 보강 (프론트엔드 기대 구조: roles 리스트)
        java.util.List<Map<String, Object>> roles = new java.util.ArrayList<>();
        roleRepository.findByRoleKey(user.getRole()).ifPresent(r -> {
            Map<String, Object> roleMap = new HashMap<>();
            roleMap.put("authority", user.getRole());
            roleMap.put("displayName", r.getDisplayName());
            roleMap.put("allowedMenus", r.getAllowedMenus());
            roleMap.put("allowedPermissions", r.getAllowedPermissions());
            roles.add(roleMap);
        });
        response.put("roles", roles);

        return ResponseEntity.ok(response);
    }

    private void validatePasswordComplexity(String password) {
        boolean hasLetter = password.matches(".*[a-zA-Z].*");
        boolean hasDigit = password.matches(".*[0-9].*");
        if (!hasLetter || !hasDigit) {
            throw new IllegalArgumentException("비밀번호는 영문과 숫자를 모두 포함해야 합니다.");
        }
    }
}
