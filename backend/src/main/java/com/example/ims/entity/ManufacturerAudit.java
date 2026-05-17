package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "manufacturer_audits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@org.hibernate.annotations.SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class ManufacturerAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Builder.Default
    @Column(name = "is_deleted", columnDefinition = "boolean default false")
    private Boolean deleted = false;

    public boolean isDeleted() {
        return deleted != null && deleted;
    }

    public void setIsDeleted(boolean val) {
        this.deleted = val;
    }

    private LocalDateTime deletedAt;

    @Column(nullable = false)
    private LocalDate auditDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manufacturer_id")
    private Manufacturer manufacturer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private AuditTemplate template;

    @Column(nullable = false)
    private String auditType; // 신규, 정기, 비정기

    private int totalScore;
    private String grade; // A, B, C...

    @Column(columnDefinition = "TEXT")
    private String finalEvaluation;

    @Column(columnDefinition = "TEXT")
    private String positiveFeedback;

    @Column(columnDefinition = "TEXT")
    private String negativeFeedback;

    @ElementCollection
    @CollectionTable(name = "manufacturer_audit_positive_photos", joinColumns = @JoinColumn(name = "audit_id"))
    @Column(name = "photo_url")
    @Builder.Default
    private List<String> positivePhotos = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "manufacturer_audit_negative_photos", joinColumns = @JoinColumn(name = "audit_id"))
    @Column(name = "photo_url")
    @Builder.Default
    private List<String> negativePhotos = new ArrayList<>();

    private String reportFileUrl;
    private String auditor; // 점검 담당자
    private String modifierInfo;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "audit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonManagedReference("audit-results")
    private List<ManufacturerAuditResult> results = new ArrayList<>();

    @OneToMany(mappedBy = "audit", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonManagedReference("audit-group-results")
    private List<ManufacturerAuditGroupResult> groupResults = new ArrayList<>();

    @OneToMany(fetch = FetchType.LAZY)
    @JoinColumn(name = "auditId", referencedColumnName = "id", insertable = false, updatable = false)
    @Builder.Default
    private List<ManufacturerAuditHistory> history = new ArrayList<>();
}
