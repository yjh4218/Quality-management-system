package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class PasswordResetDto {

    public record CheckUserRequest(
            @NotBlank(message = "아이디를 입력해주세요.")
            String username
    ) {}

    public record CheckUserResponse(
            String username,
            String maskedEmail,
            String maskedPhone,
            boolean hasEmail,
            boolean hasPhone,
            boolean isLocked
    ) {}

    public record SendCodeRequest(
            @NotBlank(message = "아이디를 입력해주세요.")
            String username,
            @NotBlank(message = "인증 수단(EMAIL 또는 PHONE)을 선택해주세요.")
            @Pattern(regexp = "EMAIL|PHONE", message = "인증 수단은 EMAIL 또는 PHONE이어야 합니다.")
            String method
    ) {}

    public record VerifyCodeRequest(
            @NotBlank(message = "아이디를 입력해주세요.")
            String username,
            @NotBlank(message = "인증번호를 입력해주세요.")
            @Size(min = 6, max = 6, message = "인증번호는 6자리 숫자입니다.")
            String code
    ) {}

    public record VerifyCodeResponse(
            String resetToken,
            long expiresInSeconds
    ) {}

    public record ConfirmResetRequest(
            @NotBlank(message = "아이디를 입력해주세요.")
            String username,
            @NotBlank(message = "인증 토큰이 유효하지 않습니다.")
            String resetToken,
            @NotBlank(message = "새 비밀번호를 입력해주세요.")
            @Size(min = 8, max = 64, message = "비밀번호는 8자 이상 64자 이하이어야 합니다.")
            String newPassword
    ) {}
}

