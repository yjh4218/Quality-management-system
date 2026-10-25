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
 * 🏭 품질협약서 마스터 엔티티 (Quality Assurance Agreement - QAA)
 * ISO 13485:2016 §4.1.5, §7.4 / ISO 22716:2007 §12
 */
@Entity
@Table(name = "quality_agreements", indexes = {
    @Index(name = "idx_qaa_manufacturer", columnList = "manufacturer_id"),
    @Index(name = "idx_qaa_status", columnList = "agreement_status"),
    @Index(name = "idx_qaa_expiry", columnList = "expiry_date"),
    @Index(name = "idx_qaa_retention", columnList = "retention_expiry_date"),
    @Index(name = "idx_qaa_deleted", columnList = "is_deleted")
})
@SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"manufacturer", "qualification"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@EntityListeners(AuditingEntityListener.class)
public class QualityAgreement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    private Long version;

    @Column(name = "agreement_number", nullable = false, unique = true, length = 50)
    private String agreementNumber; // QAA-yyyyMM-xxx

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manufacturer_id", nullable = false)
    private Manufacturer manufacturer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "qualification_id")
    private SupplierQualification qualification;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "agreement_type", nullable = false, length = 50)
    @Builder.Default
    private AgreementType agreementType = AgreementType.CONTRACT_MANUFACTURING;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "retention_expiry_date", nullable = false)
    private LocalDate retentionExpiryDate; // 법정보존만료일 (수명 종료 후 5년 / 유통기한 후 3년)

    @Builder.Default
    @Column(name = "auto_renewal")
    private Boolean autoRenewal = false;

    @Builder.Default
    @Column(name = "renewal_notice_days")
    private Integer renewalNoticeDays = 60;

    @Enumerated(EnumType.STRING)
    @Column(name = "agreement_status", nullable = false, length = 30)
    @Builder.Default
    private AgreementStatus agreementStatus = AgreementStatus.ACTIVE;

    @Column(name = "change_notification_obligation", columnDefinition = "TEXT")
    private String changeNotificationObligation; // 변경 30일/60일 전 통보 의무

    @Builder.Default
    @Column(name = "audit_rights_confirmed")
    private Boolean auditRightsConfirmed = true; // 현장 실사권 보장

    @Column(name = "agreement_doc_url", length = 500)
    private String agreementDocUrl;

    @Column(name = "document_file_name", length = 255)
    private String documentFileName;

    @Column(columnDefinition = "TEXT")
    private String notes;

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

    public void updateStatusByDate(LocalDate today) {
        if (today == null) today = LocalDate.now();
        if (agreementStatus == AgreementStatus.TERMINATED) return;
        if (expiryDate != null && expiryDate.isBefore(today)) {
            this.agreementStatus = AgreementStatus.EXPIRED;
        } else if (expiryDate != null && !expiryDate.isAfter(today.plusDays(30))) {
            this.agreementStatus = AgreementStatus.EXPIRING_SOON;
        } else {
            this.agreementStatus = AgreementStatus.ACTIVE;
        }
    }

    public boolean isDeleted() {
        return deleted != null && deleted;
    }

    public void setIsDeleted(boolean val) {
        this.deleted = val;
    }
}
