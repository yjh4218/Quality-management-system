package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * [고도화 11] 사용자 개인정보 수정을 위한 DTO
 */
public record ProfileUpdateRequestDto(
    @NotBlank(message = "이름은 필수 입력 항목입니다.")
    String name,
    
    String companyName,
    
    @NotBlank(message = "소속 부서는 필수 입력 항목입니다.")
    String department,
    
    String position
) {}
