package com.example.ims.service;

import com.example.ims.dto.PasswordResetDto;
import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository userRepository;
    private final MailService mailService;
    private final SmsService smsService;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    // 인증코드 캐시: username -> VerificationSession (유효시간: 3분)
    private final Map<String, VerificationSession> codeSessions = new ConcurrentHashMap<>();
    
    // 재설정 토큰 캐시: resetToken -> ResetTokenSession (유효시간: 10분)
    private final Map<String, ResetTokenSession> resetTokenSessions = new ConcurrentHashMap<>();

    private final SecureRandom secureRandom = new SecureRandom();

    private record VerificationSession(
            String code,
            String method,
            Instant expiresAt,
            Instant lastSentAt,
            int attemptCount
    ) {}

    private record ResetTokenSession(
            String username,
            Instant expiresAt
    ) {}

    /**
     * 1단계: 사용자 계정 존재 여부 및 마스킹된 연락처 정보 반환
     */
    @Transactional(readOnly = true)
    public PasswordResetDto.CheckUserResponse checkUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("입력하신 아이디를 가진 계정을 찾을 수 없습니다."));

        String email = user.getEmail();
        String phone = user.getPhone();

        boolean hasEmail = email != null && !email.trim().isEmpty();
        boolean hasPhone = phone != null && !phone.trim().isEmpty();

        if (!hasEmail && !hasPhone) {
            throw new IllegalStateException("해당 계정에는 등록된 이메일 또는 휴대폰 번호가 없어 직접 재설정할 수 없습니다. 시스템 관리자에게 문의하세요.");
        }

        return new PasswordResetDto.CheckUserResponse(
                user.getUsername(),
                maskEmail(email),
                maskPhone(phone),
                hasEmail,
                hasPhone,
                user.isLocked()
        );
    }

    /**
     * 2단계-1: 6자리 인증코드 발송 (이메일 또는 SMS)
     */
    public void sendVerificationCode(String username, String method) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("계정을 찾을 수 없습니다."));

        Instant now = Instant.now();

        // 1분 내 재발송 제한 (Rate Limiting)
        VerificationSession existing = codeSessions.get(username);
        if (existing != null && existing.lastSentAt() != null && now.isBefore(existing.lastSentAt().plusSeconds(60))) {
            long remaining = 60 - (now.getEpochSecond() - existing.lastSentAt().getEpochSecond());
            throw new IllegalStateException(String.format("인증번호가 이미 발송되었습니다. %d초 후에 다시 시도해주세요.", Math.max(1, remaining)));
        }

        // 6자리 난수 생성 (000000 ~ 999999)
        String code = String.format("%06d", secureRandom.nextInt(1000000));
        Instant expiresAt = now.plusSeconds(180); // 3분 유효

        codeSessions.put(username, new VerificationSession(code, method, expiresAt, now, 0));

        if ("EMAIL".equalsIgnoreCase(method)) {
            if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
                throw new IllegalArgumentException("계정에 등록된 이메일 주소가 없습니다.");
            }
            mailService.sendVerificationCode(user.getEmail(), user.getName(), code);
        } else if ("PHONE".equalsIgnoreCase(method)) {
            if (user.getPhone() == null || user.getPhone().trim().isEmpty()) {
                throw new IllegalArgumentException("계정에 등록된 휴대폰 번호가 없습니다.");
            }
            smsService.sendVerificationCode(user.getPhone(), code);
        } else {
            throw new IllegalArgumentException("지원하지 않는 인증 수단입니다: " + method);
        }

        try {
            auditLogService.logAction(username, "PASSWORD_RESET_CODE_SENT", "인증코드 발송", 
                    String.format("[%s] 수단으로 비밀번호 재설정 인증번호 발송", method));
        } catch (Exception e) {
            log.warn("감사로그 기록 실패: {}", e.getMessage());
        }
    }

    /**
     * 2단계-2: 6자리 인증코드 검증 및 1회용 resetToken 발급
     */
    public PasswordResetDto.VerifyCodeResponse verifyCode(String username, String code) {
        VerificationSession session = codeSessions.get(username);
        Instant now = Instant.now();

        if (session == null || now.isAfter(session.expiresAt())) {
            codeSessions.remove(username);
            throw new IllegalArgumentException("인증번호 유효시간(3분)이 만료되었거나 발송 내역이 없습니다. 다시 발송해주세요.");
        }

        if (session.attemptCount() >= 5) {
            codeSessions.remove(username);
            throw new IllegalArgumentException("인증번호 입력 오류 5회 초과로 인증이 취소되었습니다. 인증번호를 다시 발송해주세요.");
        }

        if (!session.code().equals(code.trim())) {
            // 실패 카운트 증가
            codeSessions.put(username, new VerificationSession(
                    session.code(),
                    session.method(),
                    session.expiresAt(),
                    session.lastSentAt(),
                    session.attemptCount() + 1
            ));
            int remaining = 5 - (session.attemptCount() + 1);
            throw new IllegalArgumentException(String.format("인증번호가 일치하지 않습니다. (남은 시도 횟수: %d회)", remaining));
        }

        // 인증 성공: 코드 세션 삭제 및 10분 유효 resetToken 발급
        codeSessions.remove(username);
        String resetToken = UUID.randomUUID().toString();
        resetTokenSessions.put(resetToken, new ResetTokenSession(username, now.plusSeconds(600))); // 10분

        try {
            auditLogService.logAction(username, "PASSWORD_RESET_VERIFIED", "본인인증 성공", "인증코드 일치 확인 완료");
        } catch (Exception e) {
            // Ignore
        }

        return new PasswordResetDto.VerifyCodeResponse(resetToken, 600);
    }

    /**
     * 3단계: 새 비밀번호 설정 및 계정 잠금 해제
     */
    @Transactional
    public void confirmReset(String username, String resetToken, String newPassword) {
        ResetTokenSession tokenSession = resetTokenSessions.get(resetToken);
        Instant now = Instant.now();

        if (tokenSession == null || now.isAfter(tokenSession.expiresAt()) || !tokenSession.username().equals(username)) {
            resetTokenSessions.remove(resetToken);
            throw new IllegalArgumentException("비밀번호 재설정 인증 세션이 만료되었습니다. 처음부터 다시 진행해주세요.");
        }

        // 비밀번호 강도 검증
        validatePasswordStrength(newPassword);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("계정을 찾을 수 없습니다."));

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setLocked(false);
        user.setFailedAttempts(0);
        user.setPasswordResetRequired(false);
        userRepository.save(user);

        // 사용한 토큰 즉시 파기
        resetTokenSessions.remove(resetToken);

        try {
            auditLogService.logAction(username, "PASSWORD_RESET_COMPLETED", "비밀번호 재설정 완료", "본인인증을 통한 비밀번호 변경 및 계정 잠금 해제");
        } catch (Exception e) {
            log.warn("감사로그 기록 실패: {}", e.getMessage());
        }
    }

    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8 || password.length() > 64) {
            throw new IllegalArgumentException("비밀번호는 8자 이상 64자 이하이어야 합니다.");
        }
        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        boolean hasSpecial = password.chars().anyMatch(ch -> "!@#$%^&*()_+-=[]{}|;:,.<>?".indexOf(ch) >= 0);

        if (!hasLetter || !hasDigit || !hasSpecial) {
            throw new IllegalArgumentException("비밀번호는 영문, 숫자, 특수문자를 각각 최소 1개 이상 포함해야 합니다.");
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "";
        String[] parts = email.split("@");
        String idPart = parts[0];
        String domain = parts[1];

        if (idPart.length() <= 2) {
            return idPart.charAt(0) + "*@" + domain;
        } else {
            return idPart.substring(0, 2) + "***@" + domain;
        }
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.trim().isEmpty()) return "";
        String clean = phone.replaceAll("[^0-9]", "");
        if (clean.length() == 11) {
            return clean.substring(0, 3) + "-****-" + clean.substring(7);
        } else if (clean.length() == 10) {
            return clean.substring(0, 3) + "-***-" + clean.substring(6);
        }
        return phone;
    }
}

