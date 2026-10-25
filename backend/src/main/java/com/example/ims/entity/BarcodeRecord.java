package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 🏷️ 바코드 및 UDI 식별 기록 엔티티 (BarcodeRecord)
 * ISO 13485:2016 §7.5.8 / 21 CFR 820.120
 */
@Entity
@Table(name = "barcode_records", indexes = {
    @Index(name = "idx_barcode_val", columnList = "barcode_value"),
    @Index(name = "idx_barcode_batch", columnList = "batch_number"),
    @Index(name = "idx_barcode_status", columnList = "status"),
    @Index(name = "idx_barcode_deleted", columnList = "is_deleted")
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
public class BarcodeRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    private Long version;

    @Column(name = "barcode_value", nullable = false, unique = true, length = 255)
    private String barcodeValue; // 예: (01)8809123456789(10)LOT-202610-FP01(17)281015(21)SN202610001

    @Enumerated(EnumType.STRING)
    @Column(name = "barcode_type", nullable = false, length = 50)
    @Builder.Default
    private BarcodeType barcodeType = BarcodeType.GS1_128;

    @Column(name = "batch_number", nullable = false, length = 100)
    private String batchNumber;

    @Column(length = 50)
    private String gtin;

    @Column(name = "expiration_date_string", length = 20)
    private String expirationDateString; // YYMMDD format for GS1

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(name = "print_count", nullable = false)
    @Builder.Default
    private Integer printCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private BarcodeStatus status = BarcodeStatus.ACTIVE;

    @Column(name = "issued_by", length = 100)
    private String issuedBy;

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

    public void incrementPrintCount() {
        this.printCount = (this.printCount == null ? 0 : this.printCount) + 1;
        this.status = BarcodeStatus.PRINTED;
    }

    public void softDelete(String user) {
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
        this.updatedBy = user;
    }
}
