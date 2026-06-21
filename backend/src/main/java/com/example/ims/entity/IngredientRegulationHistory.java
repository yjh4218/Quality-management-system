package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ingredient_regulation_histories", indexes = {
    @Index(name = "idx_history_inci", columnList = "inciName"),
    @Index(name = "idx_history_korean", columnList = "koreanName"),
    @Index(name = "idx_history_date", columnList = "updatedAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientRegulationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 1000)
    private String inciName;

    @Column(length = 2000)
    private String koreanName;

    private String casNumber;

    @Column(length = 50)
    private String changeType; // ADD, UPDATE

    @Column(length = 50)
    private String country; // KR, EU, CN, US, JP, ALL

    @Column(length = 100)
    private String fieldName; // status, limit, remarks

    @Column(length = 2000)
    private String oldValue;

    @Column(length = 2000)
    private String newValue;

    @Column(length = 100)
    private String updatedBy; // SYSTEM_AUTO, admin 등

    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.updatedAt = LocalDateTime.now();
    }
}
