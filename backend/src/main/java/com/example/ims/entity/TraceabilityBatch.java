package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 🌐 배치/LOT 마스터 엔티티 (TraceabilityBatch)
 * ISO 13485:2016 §7.5.8 / ISO 22716:2007 §8.3 / 21 CFR 820.65
 */
@Entity
@Table(name = "traceability_batches", indexes = {
    @Index(name = "idx_trace_batch_num", columnList = "batch_number"),
    @Index(name = "idx_trace_batch_stage", columnList = "batch_stage"),
    @Index(name = "idx_trace_batch_status", columnList = "quality_status"),
    @Index(name = "idx_trace_batch_deleted", columnList = "is_deleted")
})
@SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@EntityListeners(AuditingEntityListener.class)
public class TraceabilityBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    private Long version;

    @Column(name = "batch_number", nullable = false, unique = true, length = 100)
    private String batchNumber; // 예: LOT-202610-001, RM-202610-001

    @Enumerated(EnumType.STRING)
    @Column(name = "batch_stage", nullable = false, length = 50)
    private BatchStage batchStage;

    @Column(name = "item_code", nullable = false, length = 100)
    private String itemCode;

    @Column(name = "item_name", nullable = false, length = 255)
    private String itemName;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_category", nullable = false, length = 50)
    @Builder.Default
    private ItemCategory itemCategory = ItemCategory.COSMETICS;

    @Column(length = 255)
    private String specification;

    @Column(nullable = false, precision = 15, scale = 3)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ZERO;

    @Column(name = "remaining_quantity", nullable = false, precision = 15, scale = 3)
    @Builder.Default
    private BigDecimal remainingQuantity = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String unit = "EA";

    @Column(name = "manufacturing_date")
    private LocalDate manufacturingDate;

    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    @Column(name = "supplier_or_manufacturer", length = 255)
    private String supplierOrManufacturer;

    @Column(name = "manufacturing_line", length = 100)
    private String manufacturingLine;

    @Column(name = "storage_location", length = 100)
    private String storageLocation;

    @Enumerated(EnumType.STRING)
    @Column(name = "quality_status", nullable = false, length = 50)
    @Builder.Default
    private TraceabilityQualityStatus qualityStatus = TraceabilityQualityStatus.QUARANTINE;

    @Column(name = "coa_number", length = 100)
    private String coaNumber;

    @Column(name = "coa_file_url", length = 500)
    private String coaFileUrl;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // 감사추적 메타데이터
    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @CreatedBy
    @Column(name = "created_by", length = 100, updatable = false)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void softDelete(String user) {
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
        this.updatedBy = user;
    }
}
