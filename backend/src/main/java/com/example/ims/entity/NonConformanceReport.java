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
import java.util.ArrayList;
import java.util.List;

/**
 * ⚠️ 부적합 보고서(NCR: Non-Conformance Report) 엔티티
 * ISO 13485:2016 §8.3 / ISO 22716:2007 §8.4 / 21 CFR 820.90
 */
@Entity
@Table(name = "ncr_reports", indexes = {
    @Index(name = "idx_ncr_num", columnList = "ncr_number"),
    @Index(name = "idx_ncr_stage", columnList = "stage"),
    @Index(name = "idx_ncr_severity", columnList = "severity"),
    @Index(name = "idx_ncr_status", columnList = "status"),
    @Index(name = "idx_ncr_quarantine", columnList = "quarantine_status"),
    @Index(name = "idx_ncr_lot", columnList = "lot_number"),
    @Index(name = "idx_ncr_item", columnList = "item_code"),
    @Index(name = "idx_ncr_source", columnList = "source_type, source_record_id"),
    @Index(name = "idx_ncr_deleted", columnList = "is_deleted")
})
@SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "actionItems")
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@EntityListeners(AuditingEntityListener.class)
public class NonConformanceReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    private Long version;

    @Column(name = "ncr_number", nullable = false, unique = true, length = 50)
    private String ncrNumber; // 예: NCR-202610-001

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false, length = 50)
    @Builder.Default
    private NcrOccurrenceStage stage = NcrOccurrenceStage.INCOMING_INSPECTION;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 30)
    @Builder.Default
    private NcrSeverity severity = NcrSeverity.MAJOR;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private NcrStatus status = NcrStatus.SUBMITTED;

    @Column(name = "source_type", length = 50)
    @Builder.Default
    private String sourceType = "WMS_INBOUND"; // WMS_INBOUND, PRODUCTION_BATCH, FINAL_RELEASE, CLAIM, MANUAL

    @Column(name = "source_record_id")
    private Long sourceRecordId; // wms_inbound.id or traceability_batches.id

    @Column(name = "item_code", nullable = false, length = 100)
    private String itemCode;

    @Column(name = "product_name", nullable = false, length = 255)
    private String productName;

    @Column(name = "lot_number", length = 100)
    private String lotNumber;

    @Column(name = "affected_quantity", precision = 15, scale = 3)
    @Builder.Default
    private BigDecimal affectedQuantity = BigDecimal.ZERO;

    @Column(name = "unit", length = 30)
    @Builder.Default
    private String unit = "EA";

    @Column(name = "supplier_name", length = 150)
    private String supplierName;

    @Column(name = "occurred_date", nullable = false)
    private LocalDate occurredDate;

    @Column(name = "discovered_by", length = 100)
    private String discoveredBy;

    @Column(name = "defect_type", length = 100)
    private String defectType; // 비중 이탈, 치수 불량, 이물 혼입, 라벨 오표기 등

    @Column(name = "defect_description", nullable = false, columnDefinition = "TEXT")
    private String defectDescription;

    @Column(name = "immediate_action", columnDefinition = "TEXT")
    private String immediateAction;

    @Enumerated(EnumType.STRING)
    @Column(name = "quarantine_status", nullable = false, length = 50)
    @Builder.Default
    private QuarantineStatus quarantineStatus = QuarantineStatus.QUARANTINED;

    @Column(name = "quarantine_location", length = 150)
    private String quarantineLocation;

    @Column(name = "root_cause_analysis", columnDefinition = "TEXT")
    private String rootCauseAnalysis;

    @Enumerated(EnumType.STRING)
    @Column(name = "disposition_type", nullable = false, length = 50)
    @Builder.Default
    private NcrDispositionType dispositionType = NcrDispositionType.PENDING;

    @Column(name = "disposition_details", columnDefinition = "TEXT")
    private String dispositionDetails;

    @Column(name = "disposition_approved_by", length = 100)
    private String dispositionApprovedBy;

    @Column(name = "disposition_approved_at")
    private LocalDateTime dispositionApprovedAt;

    @Column(name = "rework_instructions", columnDefinition = "TEXT")
    private String reworkInstructions;

    @Column(name = "concession_justification", columnDefinition = "TEXT")
    private String concessionJustification;

    @Column(name = "capa_required", nullable = false)
    @Builder.Default
    private Boolean capaRequired = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "capa_status", nullable = false, length = 50)
    @Builder.Default
    private CapaLinkageStatus capaStatus = CapaLinkageStatus.NOT_REQUIRED;

    @Column(name = "capa_reference_id", length = 50)
    private String capaReferenceId; // 예: CAPA-202610-001

    @Column(name = "capa_rationale", columnDefinition = "TEXT")
    private String capaRationale;

    @Column(name = "closed_by", length = 100)
    private String closedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "closure_remarks", columnDefinition = "TEXT")
    private String closureRemarks;

    @OneToMany(mappedBy = "ncrReport", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<NcrActionItem> actionItems = new ArrayList<>();

    // 감사추적 필드
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false, length = 100)
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

    public void addActionItem(NcrActionItem item) {
        if (this.actionItems == null) {
            this.actionItems = new ArrayList<>();
        }
        item.setNcrReport(this);
        this.actionItems.add(item);
    }
}
