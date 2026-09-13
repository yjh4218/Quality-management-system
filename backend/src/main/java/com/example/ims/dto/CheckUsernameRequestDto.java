package com.example.ims.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

/**
 * 아이디 중복 확인 요청 DTO
 */
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record CheckUsernameRequestDto(
    @NotBlank(message = "아이디를 입력해주세요.")
    String username
) {}
