package com.example.ims.service;

import com.example.ims.dto.RegisterRequestDto;
import com.example.ims.entity.User;
import com.example.ims.repository.ManufacturerRepository;
import com.example.ims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * 인증 및 권한 관련 비즈니스 로직을 처리하는 서비스 클래스.
 * [아키텍처] 컨트롤러에서 무거운 로직을 분리하여 재사용성과 테스트 용이성을 높였습니다.
 * [보안] 비밀번호 해싱, 복잡도 검증, 토큰 기반 이메일 인증 등을 담당합니다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ManufacturerRepository manufacturerRepository;
    private final MailService mailService;
    private final EmailService emailService;

    /**
     * 신규 사용자 가입 신청을 처리합니다.
     * 비밀번호를 암호화하고 인증 토큰을 생성하여 이메일을 발송합니다.
     */
    @Transactional
    public void register(RegisterRequestDto dto, String baseUrl) {
        if (userRepository.findByUsername(dto.username()).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
        }

        // 제조사 소속일 경우 실제 존재하는 회사인지 검증
        if (dto.companyName() != null && !"더파운더즈".equals(dto.companyName()) && !dto.companyName().isBlank()) {
            manufacturerRepository.findByName(dto.companyName())
                    .orElseThrow(() -> new IllegalArgumentException("등록되지 않은 소속(제조사)입니다."));
        }

        validatePasswordComplexity(dto.password());

        User newUser = User.builder()
                .username(dto.username())
                .password(passwordEncoder.encode(dto.password()))
                .name(dto.name())
                .companyName(dto.companyName())
                .department(dto.department())
                .phone(dto.phone())
                .email(dto.email())
                .role("ROLE_USER")
                .enabled(false)
                .locked(false)
                .failedAttempts(0)
                .emailVerified(false)
                .verificationToken(UUID.randomUUID().toString())
                .build();

        userRepository.save(newUser);
        log.info("[AUTH] New registration request saved: {}", dto.username());

        try {
            // 이메일 인증 링크 발송
            emailService.sendVerificationEmail(newUser.getEmail(), newUser.getVerificationToken(), baseUrl + "/api/auth");
        } catch (Exception e) {
            log.error("Failed to send verification email for {}: {}", newUser.getUsername(), e.getMessage());
        }
    }

    /**
     * 이메일 인증 토큰을 검증하고 사용자 상태를 업데이트합니다.
     */
    @Transactional
    public void verifyEmail(String token) {
        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 인증 토큰입니다."));

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        userRepository.save(user);
    }

    /**
     * 비밀번호 찾기 요청 시 임시 비밀번호를 생성하고 이메일로 발송합니다.
     * [보안] 강력한 난수 기반의 16자리 비밀번호를 생성합니다.
     */
    @Transactional
    public void processFindPassword(String username, String name, String email) {
        try {
            User user = userRepository.findByUsername(username).orElse(null);
            if (user != null && user.getName().equals(name) && user.getEmail().equals(email)) {
                String chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
                java.security.SecureRandom rnd = new java.security.SecureRandom();
                String tempPw = java.util.stream.IntStream.range(0, 16)
                        .mapToObj(i -> String.valueOf(chars.charAt(rnd.nextInt(chars.length()))))
                        .collect(java.util.stream.Collectors.joining());

                user.setPassword(passwordEncoder.encode(tempPw));
                user.setPasswordResetRequired(true);
                userRepository.save(user);

                mailService.sendTemporaryPassword(email, name, tempPw);
                log.info("[SECURITY] High-entropy temporary password issued for user: {}", username);
            }
        } catch (Exception e) {
            log.error("[SECURITY] Error during find-password process for user: {}", username, e);
        }
    }

    /**
     * 비밀번호 복잡도 유효성 검사 (영문 + 숫자 조합 필수)
     */
    private void validatePasswordComplexity(String password) {
        boolean hasLetter = password.matches(".*[a-zA-Z].*");
        boolean hasDigit = password.matches(".*[0-9].*");
        if (!hasLetter || !hasDigit) {
            throw new IllegalArgumentException("비밀번호는 영문과 숫자를 모두 포함해야 합니다.");
        }
    }
}
