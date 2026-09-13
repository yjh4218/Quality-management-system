package com.example.ims.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;

/**
 * 알림 설정 변경 DTO
 */
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record NotificationSettingUpdateDto(
    String displayName,
    String description,
    String targetRoles,
    String sourceDomain,
    String sourceAction
) {}
