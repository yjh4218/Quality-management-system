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
public class TrashItemDto {
    private Long id;
    private String entityType; // PRODUCT, CLAIM, AUDIT
    private String displayTitle; // 품목명/클레임번호 등
    private String identifier; // 품목코드/클레임번호
    private String deletedBy; // (추후 고도화 시 활용)
    private LocalDateTime deletedAt;
}
