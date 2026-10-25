package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 유지보수 및 예방보전(PM) 이력 엔티티
 * 규격: ISO 13485:2016 §6.3 / ISO 22716:2007 §5 / 21 CFR 820.70(g)
 */
@Entity
@Table(name = "maintenance_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "maintenance_number", nullable = false, unique = true, length = 50)
    private String maintenanceNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @Enumerated(EnumType.STRING)
    @Column(name = "maintenance_type", nullable = false, length = 40)
    private MaintenanceType maintenanceType;

    @Column(name = "maintenance_date", nullable = false)
    private LocalDate maintenanceDate;

    @Column(nullable = false, length = 150)
    private String performer;

    @Column(precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal cost = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "maintenance_result", nullable = false, length = 40)
    private MaintenanceResult maintenanceResult;

    @Column(name = "parts_replaced", length = 500)
    private String partsReplaced;

    @Column(name = "downtime_hours", precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal downtimeHours = BigDecimal.ZERO;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String details;

    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    @Column(name = "next_pm_due_date")
    private LocalDate nextPmDueDate;

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
