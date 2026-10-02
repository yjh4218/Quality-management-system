package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalHistoryLogDto {
    private Long id;
    private Long documentId;
    private Long actorUserId;
    private String actorUsername;
    private String actorUserName;
    private String action;
    private String detailJson;
    private LocalDateTime createdAt;
}
