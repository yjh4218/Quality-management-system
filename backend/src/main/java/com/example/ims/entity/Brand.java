package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "brands")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@lombok.EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Brand {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @lombok.EqualsAndHashCode.Include
    private Long id;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(nullable = false, unique = true)
    private String name; // 브랜드명

    @Builder.Default
    @Column(nullable = false)
    private String type = "기타"; // 브랜드 유형 (스킨케어, 메이크업, 바디케어 등)

    @org.hibernate.annotations.Formula("(SELECT COUNT(*) FROM products p WHERE p.brand_id = id AND (p.is_deleted = false OR p.is_deleted IS NULL))")
    private Integer productCount;
}
