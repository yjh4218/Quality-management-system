package com.example.ims.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

/**
 * 제품 감리 공개 여부 변경 DTO
 */
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record ProductDisclosureUpdateDto(
    @NotNull(message = "공개 여부(isDisclosed)는 필수 입력 항목입니다.")
    Boolean isDisclosed
) {}
