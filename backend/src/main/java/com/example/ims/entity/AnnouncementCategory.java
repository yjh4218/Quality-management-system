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
 * 전체공지 카테고리 JPA 엔티티.
 */
@Entity
@Table(name = "announcement_categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnnouncementCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    @Builder.Default
    private String color = "#475569";

    @Column(name = "is_bold")
    @Builder.Default
    private boolean isBold = false;

    @Column(name = "sort_order")
    @Builder.Default
    private int sortOrder = 0;

    @Builder.Default
    @Column(name = "is_deleted")
    private boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
