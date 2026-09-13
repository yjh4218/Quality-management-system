package com.example.ims.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

/**
 * 비밀번호 찾기(임시 비밀번호 발급) 요청 DTO
 */
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record FindPasswordRequestDto(
    @NotBlank(message = "아이디를 입력해주세요.")
    String username,

    @NotBlank(message = "이름을 입력해주세요.")
    String name,

    @NotBlank(message = "이메일을 입력해주세요.")
    @Email(message = "유효한 이메일 형식이 아닙니다.")
    String email
) {}
