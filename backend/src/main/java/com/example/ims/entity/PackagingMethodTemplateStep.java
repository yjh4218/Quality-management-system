package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 포장공정 템플릿의 개별 단계 (Feature 2 - Expanded)
 */
@Entity
@Table(name = "packaging_method_template_steps")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackagingMethodTemplateStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int stepNumber; // 순서 (1, 2, 3...)

    @Column(columnDefinition = "TEXT")
    private String instruction; // 작업 지시 내용

    private String imageUrl; // 작업 이미지 경로

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    @JsonIgnore
    private PackagingMethodTemplate template;
}
