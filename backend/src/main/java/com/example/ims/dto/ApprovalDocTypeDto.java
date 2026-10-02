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
public class ApprovalDocTypeDto {
    private Long id;
    private String code;
    private String name;
    private String sourceTable;
    private String sourceScreen;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private Boolean hasCurrentTemplate;
}
