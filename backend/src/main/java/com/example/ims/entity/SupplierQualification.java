package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 🏭 공급업체 품질 적격성 마스터 엔티티 (Supplier Qualification)
 * ISO 13485:2016 §7.4 / ISO 22716:2007 §12
 */
@Entity
@Table(name = "supplier_qualifications", indexes = {
    @Index(name = "idx_sup_qual_manufacturer", columnList = "manufacturer_id"),
    @Index(name = "idx_sup_qual_status", columnList = "approval_status"),
    @Index(name = "idx_sup_qual_grade", columnList = "supplier_grade"),
    @Index(name = "idx_sup_qual_type", columnList = "supplier_type"),
    @Index(name = "idx_sup_qual_deleted", columnList = "is_deleted")
})
@SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"manufacturer"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@EntityListeners(AuditingEntityListener.class)
public class SupplierQualification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    private Long version;

    @Column(name = "supplier_code", nullable = false, unique = true, length = 50)
    private String supplierCode; // SUP-yyyyMM-xxx

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manufacturer_id", nullable = false)
    private Manufacturer manufacturer;

    @Enumerated(EnumType.STRING)
    @Column(name = "supplier_type", nullable = false, length = 50)
    @Builder.Default
    private SupplierType supplierType = SupplierType.RAW_MATERIAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 50)
    @Builder.Default
    private SupplierApprovalStatus approvalStatus = SupplierApprovalStatus.PENDING_QUALIFICATION;

    @Enumerated(EnumType.STRING)
    @Column(name = "supplier_grade", nullable = false, length = 20)
    @Builder.Default
    private SupplierGrade supplierGrade = SupplierGrade.GRADE_B;

    @Column(name = "risk_level", length = 20)
    @Builder.Default
    private String riskLevel = "MEDIUM"; // HIGH, MEDIUM, LOW

    @Column(name = "iso_certifications", length = 255)
    private String isoCertifications;

    @Column(name = "business_registration_number", length = 50)
    private String businessRegistrationNumber;

    @Column(name = "initial_approval_date")
    private LocalDate initialApprovalDate;

    @Column(name = "last_audit_date")
    private LocalDate lastAuditDate;

    @Column(name = "next_evaluation_date")
    private LocalDate nextEvaluationDate;

    @Column(name = "scope_of_supply", columnDefinition = "TEXT")
    private String scopeOfSupply;

    @Column(name = "qualification_notes", columnDefinition = "TEXT")
    private String qualificationNotes;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    // 감사추적 및 소프트 딜리트
    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean deleted = false;

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

    public boolean isDeleted() {
        return deleted != null && deleted;
    }

    public void setIsDeleted(boolean val) {
        this.deleted = val;
    }
}
