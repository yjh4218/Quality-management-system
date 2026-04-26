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
 * 유통 채널 마스터 데이터 (Feature: Channel Management)
 */
@Entity
@Table(name = "sales_channels")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesChannel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(unique = true, nullable = false)
    private String name; // e.g., 올리브영(OY), 일본/오프라인(JP/OFF)

    private String description;

    @Builder.Default
    private boolean active = true;

    private String updatedBy;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
