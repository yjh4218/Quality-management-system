package com.example.ims.controller;

import com.example.ims.dto.RegisterRequestDto;
import com.example.ims.dto.ProfileUpdateRequestDto;
import com.example.ims.dto.ApiResponse;
import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import com.example.ims.repository.RoleRepository;
import com.example.ims.service.AuthService;
import com.example.ims.service.PasswordResetService;
import com.example.ims.dto.PasswordResetDto;
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
    private final RoleRepository roleRepository;
    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    /**
     * 사용자 아이디 중복 여부를 확인합니다.
     */
    @PostMapping("/check-username")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkUsername(@Valid @RequestBody com.example.ims.dto.CheckUsernameRequestDto body) {
        String username = body.username();
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

    /**
     * 비밀번호 재설정 1단계: 사용자 계정 확인 및 마스킹된 연락처 정보 반환
     */
    @PostMapping("/password-reset/check-user")
    public ResponseEntity<ApiResponse<PasswordResetDto.CheckUserResponse>> checkUserForPasswordReset(
            @Valid @RequestBody PasswordResetDto.CheckUserRequest request) {
        var response = passwordResetService.checkUser(request.username());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 비밀번호 재설정 2단계-1: 6자리 본인확인 인증번호 발송 (이메일 또는 휴대폰)
     */
    @PostMapping("/password-reset/send-code")
    public ResponseEntity<ApiResponse<Map<String, String>>> sendPasswordResetCode(
            @Valid @RequestBody PasswordResetDto.SendCodeRequest request) {
        passwordResetService.sendVerificationCode(request.username(), request.method());
        String msg = "EMAIL".equalsIgnoreCase(request.method()) 
                ? "등록된 이메일로 6자리 인증번호가 발송되었습니다." 
                : "등록된 휴대폰 번호로 6자리 인증번호가 발송되었습니다.";
        return ResponseEntity.ok(ApiResponse.success(msg, Map.of("method", request.method())));
    }

    /**
     * 비밀번호 재설정 2단계-2: 6자리 인증번호 일치 확인 및 1회용 resetToken 발급
     */
    @PostMapping("/password-reset/verify-code")
    public ResponseEntity<ApiResponse<PasswordResetDto.VerifyCodeResponse>> verifyPasswordResetCode(
            @Valid @RequestBody PasswordResetDto.VerifyCodeRequest request) {
        var response = passwordResetService.verifyCode(request.username(), request.code());
        return ResponseEntity.ok(ApiResponse.success("본인인증이 완료되었습니다.", response));
    }

    /**
     * 비밀번호 재설정 3단계: 새 비밀번호 설정 및 계정 잠금 해제
     */
    @PostMapping("/password-reset/confirm")
    public ResponseEntity<ApiResponse<Map<String, String>>> confirmPasswordReset(
            @Valid @RequestBody PasswordResetDto.ConfirmResetRequest request) {
        passwordResetService.confirmReset(request.username(), request.resetToken(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.success("비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.", Map.of("status", "SUCCESS")));
    }

    @PostMapping("/find-password")
    public ResponseEntity<ApiResponse<Map<String, String>>> findPassword(@Valid @RequestBody com.example.ims.dto.FindPasswordRequestDto body) {
        String username = body.username();
        String name = body.name();
        String email = body.email();

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

        // [보안] companyName 및 manufacturer_id는 셀프서비스 변경 금지 (관리자 승인으로만 변경 가능)

        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("프로필 정보가 성공적으로 업데이트되었습니다.", null));
    }
}
