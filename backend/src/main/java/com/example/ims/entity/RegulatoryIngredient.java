package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "regulatory_ingredients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegulatoryIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 1000)
    private String inciName; // International Nomenclature Cosmetic Ingredient

    @Column(length = 2000)
    private String koreanName;

    private String casNumber;

    @Column(length = 50)
    private String sourceApi; // REGL, INGD, MANUAL, LEGACY

    @Column(columnDefinition = "TEXT")
    private String origin;

    @Column(length = 500)
    private String synonym;

    @Column(length = 50)
    private String krStatus; // ALLOWED, RESTRICTED, PROHIBITED
    private Double krLimit; // Percentage limit

    @Column(length = 50)
    private String euStatus;
    private Double euLimit;

    @Column(length = 50)
    private String cnStatus;
    private Double cnLimit;

    @Column(length = 50)
    private String usStatus;
    private Double usLimit;

    @Column(length = 50)
    private String jpStatus;
    private Double jpLimit;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @OneToMany(mappedBy = "ingredient", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonProperty("limitDetails")
    private java.util.List<IngredientLimitDetail> limitDetails = new java.util.ArrayList<>();

    private LocalDateTime lastUpdated;

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        this.lastUpdated = LocalDateTime.now();
    }
}
