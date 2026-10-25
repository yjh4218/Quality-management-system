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
 * 🔄 외부 연계 및 수기 대사 로그 엔티티 (ExternalIntegrationLog - DEC-02)
 */
@Entity
@Table(name = "external_integration_logs", indexes = {
    @Index(name = "idx_ext_log_num", columnList = "log_number"),
    @Index(name = "idx_ext_log_system", columnList = "system_type"),
    @Index(name = "idx_ext_log_status", columnList = "status"),
    @Index(name = "idx_ext_log_batch", columnList = "target_batch_number")
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
public class ExternalIntegrationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    private Long version;

    @Column(name = "log_number", nullable = false, unique = true, length = 100)
    private String logNumber; // 예: INT-202610-001

    @Enumerated(EnumType.STRING)
    @Column(name = "system_type", nullable = false, length = 50)
    @Builder.Default
    private IntegrationSystemType systemType = IntegrationSystemType.ERP;

    @Enumerated(EnumType.STRING)
    @Column(name = "interface_type", nullable = false, length = 50)
    @Builder.Default
    private InterfaceType interfaceType = InterfaceType.INVENTORY_RECONCILIATION;

    @Enumerated(EnumType.STRING)
    @Column(name = "transfer_protocol", nullable = false, length = 50)
    @Builder.Default
    private TransferProtocol transferProtocol = TransferProtocol.REST_API;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private IntegrationStatus status = IntegrationStatus.PENDING;

    @Column(name = "target_batch_number", length = 100)
    private String targetBatchNumber;

    @Column(name = "request_payload", columnDefinition = "TEXT")
    private String requestPayload;

    @Column(name = "response_payload", columnDefinition = "TEXT")
    private String responsePayload;

    @Column(name = "record_count")
    @Builder.Default
    private Integer recordCount = 1;

    @Column(name = "discrepancy_count")
    @Builder.Default
    private Integer discrepancyCount = 0;

    @Column(name = "reconciled_by", length = 100)
    private String reconciledBy;

    @Column(name = "reconciliation_notes", columnDefinition = "TEXT")
    private String reconciliationNotes;

    @Column(name = "reconciled_at")
    private LocalDateTime reconciledAt;

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

    public void reconcile(String user, String notes) {
        this.status = IntegrationStatus.RECONCILED;
        this.reconciledBy = user;
        this.reconciliationNotes = notes;
        this.reconciledAt = LocalDateTime.now();
        this.discrepancyCount = 0;
        this.updatedBy = user;
    }

    public void softDelete(String user) {
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
        this.updatedBy = user;
    }
}
