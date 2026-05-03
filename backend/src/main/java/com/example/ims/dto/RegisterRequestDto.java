package com.example.ims.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * [Task 11] 회원가입 요청 DTO.
 * 엔티티를 직접 노출하지 않고 필요한 필드만 검증하여 수신합니다.
 */
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record RegisterRequestDto(
    @NotBlank(message = "아이디는 필수입니다.")
    @Size(min = 4, max = 20, message = "아이디는 4~20자 사이여야 합니다.")
    String username,

    @NotBlank(message = "비밀번호는 필수입니다.")
    @Size(min = 8, max = 50, message = "비밀번호는 8자 이상이어야 합니다.")
    String password,

    @NotBlank(message = "이름은 필수입니다.")
    String name,

    String companyName,
    String department,
    String phone,

    @Email(message = "유효한 이메일 형식이 아닙니다.")
    String email
) {}
