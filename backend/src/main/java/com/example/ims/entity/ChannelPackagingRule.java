package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * 채널별 포장 규칙 관리 (Feature 3, 4)
 */
@Entity
@Table(name = "channel_packaging_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelPackagingRule {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "channel_id")
    private SalesChannel channel;

    private String ruleType; // e.g., MAX_BOX_HEIGHT, STICKER_REQUIRED

    private String ruleValue; // e.g., 180, AJU

    @Column(columnDefinition = "TEXT")
    private String warningMessage;

    private String updatedBy;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
