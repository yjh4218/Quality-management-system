package com.example.ims.controller;

import com.example.ims.dto.RegisterRequestDto;
import com.example.ims.dto.ProfileUpdateRequestDto;
import com.example.ims.dto.ApiResponse;
import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import com.example.ims.repository.ManufacturerRepository;
import com.example.ims.repository.RoleRepository;
import com.example.ims.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 인증 및 사용자 관리 컨트롤러.
 * [아키텍처] 3계층 구조를 준수하며 실제 비즈니스 로직은 AuthService에서 처리합니다.
 * [표준화] 모든 응답은 ApiResponse DTO를 통해 일관된 규격으로 반환됩니다.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserRepository userRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final RoleRepository roleRepository;
    private final AuthService authService;

    /**
     * 사용자 아이디 중복 여부를 확인합니다.
     */
    @PostMapping("/check-username")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkUsername(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        boolean exists = userRepository.findByUsername(username).isPresent();
        return ResponseEntity.ok(ApiResponse.success(Map.of("exists", exists)));
    }

    /**
     * 회원가입 신청을 접수합니다.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> registerUser(@Valid @RequestBody RegisterRequestDto dto, jakarta.servlet.http.HttpServletRequest request) {
        String baseUrl = org.springframework.web.servlet.support.ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
        authService.register(dto, baseUrl);
        return ResponseEntity.ok(ApiResponse.success("회원가입 신청이 완료되었습니다. 이메일 인증 후 관리자 승인이 필요합니다.", null));
    }

    /**
     * 이메일 링크를 통한 사용자 인증을 처리합니다. (HTML 응답 반환)
     */
    @GetMapping(value = "/verify-email", produces = "text/html;charset=UTF-8")
    public ResponseEntity<String> verifyEmail(@RequestParam String token) {
        try {
            authService.verifyEmail(token);
            return ResponseEntity.ok("<html><body style='font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #f4f6f8;'>" +
                                 "<div style='background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block;'>" +
                                 "<h1 style='color: #5cb85c;'>✅ 이메일 인증 완료</h1>" +
                                 "<p>성공적으로 인증되었습니다. 이제 관리자 승인을 기다려주세요.</p>" +
                                 "<p>승인이 완료되면 시스템을 이용하실 수 있습니다.</p>" +
                                 "</div></body></html>");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("<html><body style='font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #f4f6f8;'>" +
                              "<div style='background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block;'>" +
                              "<h1 style='color: #d9534f;'>❌ 인증 실패</h1>" +
                              "<p>" + e.getMessage() + "</p>" +
                              "</div></body></html>");
        }
    }

    /**
     * 비밀번호 분실 시 임시 비밀번호 발급 절차를 진행합니다.
     */
    @PostMapping("/find-password")
    public ResponseEntity<ApiResponse<Map<String, String>>> findPassword(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String name = body.get("name");
        String email = body.get("email");

        authService.processFindPassword(username, name, email);

        // [보안] 정보 일치 여부와 무관하게 동일한 메시지 반환 (계정 유출 방지)
        return ResponseEntity.ok(ApiResponse.success("입력하신 정보가 회원 정보와 일치하는 경우 등록된 메일로 임시 비밀번호를 발송합니다.", null));
    }

    /**
     * 현재 로그인한 사용자의 프로필 및 권한 정보를 조회합니다.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCurrentUser() {
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

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 사용자의 프로필(성명, 부서 등)을 업데이트합니다.
     */
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<String>> updateProfile(@Valid @RequestBody ProfileUpdateRequestDto dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        user.setName(dto.name());
        user.setDepartment(dto.department());
        user.setPosition(dto.position());

        if (!"더파운더즈".equals(user.getCompanyName())) {
            if (dto.companyName() != null && !dto.companyName().isBlank()) {
                manufacturerRepository.findByName(dto.companyName())
                        .ifPresent(mfr -> user.setCompanyName(mfr.getName()));
            }
        }

        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("프로필 정보가 성공적으로 업데이트되었습니다.", null));
    }
}
