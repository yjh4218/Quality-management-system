package com.example.ims.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

/**
 * 버그 리포트 상태 업데이트 DTO
 */
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record BugReportStatusUpdateDto(
    @NotBlank(message = "변경할 상태값은 필수 입력 항목입니다.")
    String status
) {}
