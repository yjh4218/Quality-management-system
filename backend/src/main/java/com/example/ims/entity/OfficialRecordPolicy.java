package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "official_record_policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE official_record_policies SET is_deleted = true, updated_at = NOW() WHERE id = ?")
@SQLRestriction("is_deleted = false")
public class OfficialRecordPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "policy_code", unique = true, nullable = false, length = 50)
    private String policyCode;

    @Column(name = "policy_title", nullable = false, length = 200)
    private String policyTitle;

    @Enumerated(EnumType.STRING)
    @Column(name = "record_category", nullable = false, length = 50)
    private RecordCategory recordCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "official_original_type", nullable = false, length = 50)
    private OfficialOriginalType officialOriginalType;

    @Column(name = "storage_format", length = 200)
    private String storageFormat;

    @Column(name = "retention_period_years", nullable = false)
    private Integer retentionPeriodYears;

    @Column(name = "retention_period_criteria", length = 300)
    private String retentionPeriodCriteria;

    @Column(name = "legal_basis", length = 300)
    private String legalBasis;

    @Column(name = "disposal_procedure", columnDefinition = "TEXT")
    private String disposalProcedure;

    @Column(name = "is_hybrid_signed_paper_required", nullable = false)
    @Builder.Default
    private Boolean isHybridSignedPaperRequired = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
