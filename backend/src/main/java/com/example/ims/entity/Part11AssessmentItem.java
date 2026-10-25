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
@Table(name = "part11_assessment_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE part11_assessment_items SET is_deleted = true, updated_at = NOW() WHERE id = ?")
@SQLRestriction("is_deleted = false")
public class Part11AssessmentItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "section_code", nullable = false, length = 50)
    private String sectionCode;

    @Column(name = "requirement_title", nullable = false, length = 200)
    private String requirementTitle;

    @Column(name = "regulatory_standard", length = 100)
    private String regulatoryStandard;

    @Lob
    @Column(name = "requirement_details", columnDefinition = "TEXT")
    private String requirementDetails;

    @Enumerated(EnumType.STRING)
    @Column(name = "compliance_status", nullable = false, length = 50)
    private Part11ComplianceStatus complianceStatus;

    @Lob
    @Column(name = "implementation_summary", columnDefinition = "TEXT")
    private String implementationSummary;

    @Column(name = "evidence_document", length = 300)
    private String evidenceDocument;

    @Column(name = "assessed_by", length = 100)
    private String assessedBy;

    @Column(name = "assessed_date")
    private LocalDate assessedDate;

    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 1;

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
