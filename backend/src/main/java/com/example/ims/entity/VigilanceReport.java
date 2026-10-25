package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 규제당국 이상사례/부작용 보고 (Vigilance / MDR) 엔티티
 * 규격: 의료기기법 제31조, 21 CFR Part 803 (FDA MDR), EU MDR 2017/745 Art. 87, 화장품법 제5조의2
 */
@Entity
@Table(name = "vigilance_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VigilanceReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_number", nullable = false, unique = true, length = 50)
    private String reportNumber;

    @Column(nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "authority_type", nullable = false, length = 30)
    private AuthorityType authorityType;

    @Enumerated(EnumType.STRING)
    @Column(name = "regulatory_type", nullable = false, length = 30)
    private ProductRegulatoryType regulatoryType;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_classification", nullable = false, length = 50)
    private VigilanceReportClassification reportClassification;

    @Enumerated(EnumType.STRING)
    @Column(name = "incident_severity", nullable = false, length = 40)
    private IncidentSeverity incidentSeverity;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 40)
    private VigilanceSourceType sourceType;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "source_number", length = 50)
    private String sourceNumber;

    @Column(name = "source_description", columnDefinition = "TEXT")
    private String sourceDescription;

    // 대상 품목 및 LOT
    @Column(name = "item_code", length = 100)
    private String itemCode;

    @Column(name = "product_name", length = 200)
    private String productName;

    @Column(name = "lot_number", length = 100)
    private String lotNumber;

    @Builder.Default
    @Column(name = "is_lot_unknown")
    private Boolean isLotUnknown = false;

    // 기한 및 일정 관리
    @Column(name = "awareness_date", nullable = false)
    private LocalDate awarenessDate;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "submission_date")
    private LocalDate submissionDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "submission_status", nullable = false, length = 30)
    private VigilanceSubmissionStatus submissionStatus;

    @Column(name = "authority_submission_number", length = 100)
    private String authoritySubmissionNumber;

    // 이상사례 상세 및 임상/유해 평가
    @Column(name = "incident_description", nullable = false, columnDefinition = "TEXT")
    private String incidentDescription;

    @Column(name = "patient_impact", columnDefinition = "TEXT")
    private String patientImpact;

    @Column(name = "preliminary_causality", columnDefinition = "TEXT")
    private String preliminaryCausality;

    @Column(name = "reporter_name", length = 100)
    private String reporterName;

    @Column(name = "reported_to_department", length = 100)
    private String reportedToDepartment;

    @Column(name = "action_taken", columnDefinition = "TEXT")
    private String actionTaken;

    // CAPA 연계
    @Builder.Default
    @Column(name = "capa_required")
    private Boolean capaRequired = false;

    @Column(name = "capa_id")
    private Long capaId;

    @Column(name = "capa_number", length = 50)
    private String capaNumber;

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
}
