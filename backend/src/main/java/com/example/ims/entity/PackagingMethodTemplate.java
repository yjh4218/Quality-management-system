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
 * 제품 유형별 포장방법 템플릿 (Feature 2)
 */
@Entity
@Table(name = "packaging_method_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackagingMethodTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(unique = true, nullable = false)
    private ProductType productType;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("stepNumber ASC")
    private java.util.List<PackagingMethodTemplateStep> steps = new java.util.ArrayList<>();

    private String updatedBy;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
