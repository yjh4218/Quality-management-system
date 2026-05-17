package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ingredient_limit_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientLimitDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private RegulatoryIngredient ingredient;

    private String country; // KR, EU, CN, US, JP
    
    private String productType; // RINSE_OFF, LEAVE_ON, LIP, EYE, etc.
    
    private Double limitPercent;
    
    @Column(columnDefinition = "TEXT")
    private String conditionText;
    
    private boolean isManual;
    
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
