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
    private final com.example.ims.service.EmailService emailService;
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
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequestDto dto, jakarta.servlet.http.HttpServletRequest request) {
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
                .emailVerified(false)
                .verificationToken(UUID.randomUUID().toString())
                .build();

        userRepository.save(newUser);
        log.info("[AUTH] New registration request: {}", dto.username());
        
        try {
            String baseUrl = org.springframework.web.servlet.support.ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString() + "/api/auth";
            emailService.sendVerificationEmail(newUser.getEmail(), newUser.getVerificationToken(), baseUrl);
        } catch (Exception e) {
            log.error("Failed to send verification email: ", e);
            // We still proceed, but admin might need to use resend flow or we just return ok anyway
        }
        
        return ResponseEntity.ok("회원가입 신청이 완료되었습니다. 이메일 인증 후 관리자 승인이 필요합니다.");
    }

    @GetMapping(value = "/verify-email", produces = "text/html;charset=UTF-8")
    public ResponseEntity<String> verifyEmail(@RequestParam String token) {
        // [보안 패치] Full Scan 제거 및 전용 메서드 사용
        User user = userRepository.findByVerificationToken(token)
                .orElse(null);

        String failHtml = "<html><body style='font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #f4f6f8;'>" +
                          "<div style='background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block;'>" +
                          "<h1 style='color: #d9534f;'>❌ 인증 실패</h1>" +
                          "<p>유효하지 않은 인증 토큰이거나 이미 인증이 완료되었습니다.</p>" +
                          "</div></body></html>";

        if (user == null) {
            return ResponseEntity.badRequest().body(failHtml);
        }

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        userRepository.save(user);

        String successHtml = "<html><body style='font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #f4f6f8;'>" +
                             "<div style='background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block;'>" +
                             "<h1 style='color: #5cb85c;'>✅ 이메일 인증 완료</h1>" +
                             "<p>성공적으로 인증되었습니다. 이제 관리자 승인을 기다려주세요.</p>" +
                             "<p>승인이 완료되면 시스템을 이용하실 수 있습니다.</p>" +
                             "</div></body></html>";

        return ResponseEntity.ok(successHtml);
    }

    @PostMapping("/find-password")
    public ResponseEntity<?> findPassword(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String name = body.get("name");
        String email = body.get("email");

        // [보안 패치] User Enumeration 방어: 성공/실패 여부를 노출하지 않고 일관된 메시지 반환
        try {
            User user = userRepository.findByUsername(username).orElse(null);
            
            if (user != null && user.getName().equals(name) && user.getEmail().equals(email)) {
                // 보안 정책: 길고 복잡한 영숫자 16자리 임시 비밀번호 생성 (UUID에서 특수기호 제거)
                String tempPwFull = UUID.randomUUID().toString().replace("-", "");
                String tempPw = tempPwFull.substring(0, 8) + tempPwFull.substring(10, 18); // 16자 조합
                
                user.setPassword(passwordEncoder.encode(tempPw));
                user.setPasswordResetRequired(true);
                userRepository.save(user);

                mailService.sendTemporaryPassword(email, name, tempPw);
                log.info("[SECURITY] Temporary password issued for user: {}", username);
            }
        } catch (Exception e) {
            log.error("[SECURITY] Error during find-password process for user: {}", username, e);
        }

        // 항상 동일한 성공 메시지 반환
        return ResponseEntity.ok(Map.of("message", "입력하신 정보가 회원 정보와 일치하는 경우 등록된 메일로 임시 비밀번호를 발송합니다."));
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
