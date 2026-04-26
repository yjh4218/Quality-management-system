package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 각각의 화면별 사용자 가이드를 저장하는 엔티티입니다. (V11 Renamed)
 */
@Entity
@Table(name = "system_page_guides")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemPageGuide {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String pageKey;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String sectionsJson;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
