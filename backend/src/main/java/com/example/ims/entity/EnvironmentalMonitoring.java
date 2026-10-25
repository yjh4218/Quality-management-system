package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 작업환경 및 청정실 모니터링 엔티티
 * 규격: ISO 13485:2016 §6.4 (Work environment and contamination control) / ISO 22716:2007 §4 (Premises)
 */
@Entity
@Table(name = "environmental_monitorings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvironmentalMonitoring {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "monitoring_number", nullable = false, unique = true, length = 50)
    private String monitoringNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private EnvironmentalArea area;

    @Column(name = "monitoring_date", nullable = false)
    private LocalDateTime monitoringDate;

    @Column(precision = 5, scale = 2)
    private BigDecimal temperature;

    @Column(precision = 5, scale = 2)
    private BigDecimal humidity;

    @Column(name = "differential_pressure", precision = 6, scale = 2)
    private BigDecimal differentialPressure;

    @Column(name = "airborne_particles_05")
    private Integer airborneParticles05;

    @Column(name = "airborne_particles_50")
    private Integer airborneParticles50;

    @Column(name = "microbial_count")
    private Integer microbialCount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    @Builder.Default
    private EnvironmentalStatus status = EnvironmentalStatus.NORMAL;

    @Column(nullable = false, length = 100)
    private String inspector;

    @Column(name = "corrective_action", columnDefinition = "TEXT")
    private String correctiveAction;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "last_modified_by", length = 100)
    private String lastModifiedBy;
}
