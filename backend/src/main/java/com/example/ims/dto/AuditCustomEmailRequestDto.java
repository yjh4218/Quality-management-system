package com.example.ims.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

/**
 * 감리 커스텀 이메일 발송 요청 DTO
 */
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record AuditCustomEmailRequestDto(
    @NotBlank(message = "수신자 이메일 주소는 필수입니다.")
    String toEmail,

    @NotBlank(message = "메일 제목은 필수입니다.")
    String subject,

    @NotBlank(message = "메일 본문 내용은 필수입니다.")
    String body
) {}
