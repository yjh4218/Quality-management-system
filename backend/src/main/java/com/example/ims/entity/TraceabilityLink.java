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
 * 🔗 양방향 투입 연결 관계 엔티티 (TraceabilityLink)
 * 상위(부모) LOT -> 하위(자식) LOT 투입 매핑
 */
@Entity
@Table(name = "traceability_links", indexes = {
    @Index(name = "idx_trace_link_parent", columnList = "parent_batch_number"),
    @Index(name = "idx_trace_link_child", columnList = "child_batch_number"),
    @Index(name = "idx_trace_link_deleted", columnList = "is_deleted")
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
public class TraceabilityLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    private Long version;

    @Column(name = "parent_batch_number", nullable = false, length = 100)
    private String parentBatchNumber; // 투입된 원료/포장재/벌크 LOT 번호

    @Column(name = "child_batch_number", nullable = false, length = 100)
    private String childBatchNumber; // 산출된 벌크/완제품 LOT 번호

    @Column(name = "process_step", nullable = false, length = 100)
    @Builder.Default
    private String processStep = "투입조제";

    @Column(name = "input_quantity", nullable = false, precision = 15, scale = 3)
    @Builder.Default
    private BigDecimal inputQuantity = BigDecimal.ZERO;

    @Column(name = "input_unit", nullable = false, length = 20)
    @Builder.Default
    private String inputUnit = "EA";

    @Column(name = "yield_ratio", precision = 7, scale = 2)
    @Builder.Default
    private BigDecimal yieldRatio = new BigDecimal("100.00");

    @Column(name = "link_date", nullable = false)
    private LocalDate linkDate;

    @Column(name = "operator_name", length = 100)
    private String operatorName;

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
