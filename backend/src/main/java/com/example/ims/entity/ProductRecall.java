package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 제품 회수 (Product Recall) 및 수량 대사(Reconciliation) 엔티티
 * 규격: 의료기기법 제34조, 21 CFR Part 7, EU MDR 2017/745 FSCA, 화장품법 제5조의3
 */
@Entity
@Table(name = "product_recalls")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRecall {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recall_number", nullable = false, unique = true, length = 50)
    private String recallNumber;

    @Column(nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "recall_class", nullable = false, length = 30)
    private RecallClass recallClass;

    @Enumerated(EnumType.STRING)
    @Column(name = "authority_type", nullable = false, length = 30)
    private AuthorityType authorityType;

    @Enumerated(EnumType.STRING)
    @Column(name = "regulatory_type", nullable = false, length = 30)
    private ProductRegulatoryType regulatoryType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RecallStatus status;

    // 대상 품목 및 LOT
    @Column(name = "item_code", nullable = false, length = 100)
    private String itemCode;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "lot_number", nullable = false, length = 100)
    private String lotNumber;

    @Column(name = "distribution_start_date")
    private LocalDate distributionStartDate;

    @Column(name = "distribution_end_date")
    private LocalDate distributionEndDate;

    // 회수 일정 및 당국 접수
    @Column(name = "initiation_date", nullable = false)
    private LocalDate initiationDate;

    @Column(name = "authority_report_date")
    private LocalDate authorityReportDate;

    @Column(name = "authority_approval_number", length = 100)
    private String authorityApprovalNumber;

    @Column(name = "recall_reason", nullable = false, columnDefinition = "TEXT")
    private String recallReason;

    @Column(name = "health_hazard_assessment", columnDefinition = "TEXT")
    private String healthHazardAssessment;

    // 수량 대사 (Reconciliation)
    @Builder.Default
    @Column(name = "shipped_quantity", nullable = false)
    private Integer shippedQuantity = 0;

    @Builder.Default
    @Column(name = "recalled_quantity", nullable = false)
    private Integer recalledQuantity = 0;

    @Builder.Default
    @Column(name = "quarantined_quantity", nullable = false)
    private Integer quarantinedQuantity = 0;

    @Builder.Default
    @Column(name = "disposed_quantity", nullable = false)
    private Integer disposedQuantity = 0;

    @Builder.Default
    @Column(name = "unretrieved_quantity", nullable = false)
    private Integer unretrievedQuantity = 0;

    @Builder.Default
    @Column(name = "recovery_rate", nullable = false)
    private Double recoveryRate = 0.0;

    // 폐기 처분 내역
    @Column(name = "disposal_method", length = 200)
    private String disposalMethod;

    @Column(name = "disposal_date")
    private LocalDate disposalDate;

    @Column(name = "disposal_witness", length = 100)
    private String disposalWitness;

    // 담당자 및 CAPA 연계
    @Column(name = "assigned_leader", nullable = false, length = 100)
    private String assignedLeader;

    @Column(name = "capa_id")
    private Long capaId;

    @Column(name = "capa_number", length = 50)
    private String capaNumber;

    // 종결 정보
    @Column(name = "closure_summary", columnDefinition = "TEXT")
    private String closureSummary;

    @Column(name = "closed_date")
    private LocalDate closedDate;

    @Column(name = "closed_by", length = 100)
    private String closedBy;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    // 감사추적
    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "updated_by", nullable = false, length = 100)
    private String updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    private Long version;

    /**
     * 회수율 및 수량 대사 유효성 자동 계산
     */
    public void calculateRecoveryMetrics() {
        if (shippedQuantity != null && shippedQuantity > 0) {
            int accounted = (recalledQuantity != null ? recalledQuantity : 0)
                    + (quarantinedQuantity != null ? quarantinedQuantity : 0)
                    + (disposedQuantity != null ? disposedQuantity : 0);
            this.recoveryRate = Math.round(((double) accounted / shippedQuantity) * 1000.0) / 10.0;
        } else {
            this.recoveryRate = 0.0;
        }
    }
}
