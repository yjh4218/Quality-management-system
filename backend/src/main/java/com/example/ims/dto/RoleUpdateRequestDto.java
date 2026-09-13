package com.example.ims.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

/**
 * 사용자 역할(Role) 변경 요청 DTO
 */
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record RoleUpdateRequestDto(
    @NotBlank(message = "변경할 권한(role)은 필수 입력 항목입니다.")
    String role
) {}
