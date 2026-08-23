package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ingredient_precaution_rules", indexes = {
    @Index(name = "idx_prec_rule_name_kr", columnList = "ingredientNameKr"),
    @Index(name = "idx_prec_rule_name_en", columnList = "ingredientNameEn")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientPrecautionRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ingredient_name_kr", length = 500, nullable = false)
    private String ingredientNameKr;

    @Column(name = "ingredient_name_en", length = 500)
    private String ingredientNameEn;

    @Column(name = "cas_number", length = 100)
    private String casNumber;

    @Column(length = 20, nullable = false)
    @Builder.Default
    private String operator = "GTE"; // GTE, GT, LTE, LT, EQ, ALWAYS

    @Column(name = "threshold_percent")
    private Double thresholdPercent;

    @Column(name = "threshold_ppm")
    private Double thresholdPpm;

    @Column(name = "product_category", length = 100)
    @Builder.Default
    private String productCategory = "ALL";

    @Column(name = "precaution_type", length = 100, nullable = false)
    private String precautionType; // MANDATORY_WARNING, ALLERGEN_LABEL, USAGE_LIMIT

    @Column(name = "precaution_title", length = 500, nullable = false)
    private String precautionTitle;

    @Column(name = "precaution_content", columnDefinition = "TEXT", nullable = false)
    private String precautionContent;

    @Column(name = "regulation_source", length = 500)
    private String regulationSource;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
