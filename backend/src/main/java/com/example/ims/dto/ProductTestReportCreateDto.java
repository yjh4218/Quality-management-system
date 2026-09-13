package com.example.ims.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

/**
 * 제품 시험성적서 등록 DTO
 */
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record ProductTestReportCreateDto(
    @NotBlank(message = "성적서 이름은 필수 입력 항목입니다.")
    String reportName,

    String fileName,

    @NotBlank(message = "파일 경로는 필수 입력 항목입니다.")
    String filePath,

    String fileType
) {}
