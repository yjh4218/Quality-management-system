package com.example.ims.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChannelPackagingRuleDto {
    private Long id;
    private String channel;
    private String ruleKey;
    private String ruleContent;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
