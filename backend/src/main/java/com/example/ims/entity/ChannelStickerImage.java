package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

/**
 * 특정 채널 분류 스티커 이미지 관리 (Feature 8)
 */
@Entity
@Table(name = "channel_sticker_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelStickerImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "channel_id", nullable = false)
    private SalesChannel channel;

    private String imagePath; // 서버에 저장된 이미지 경로

    private String uploadedBy;

    @CreationTimestamp
    private LocalDateTime uploadedAt;
}
