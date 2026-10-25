package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "csv_validation_projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvValidationProject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_code", nullable = false, unique = true, length = 50)
    private String projectCode; // e.g. CSV-2026-001

    @Column(name = "project_name", nullable = false, length = 200)
    private String projectName;

    @Column(name = "system_version", nullable = false, length = 50)
    private String systemVersion; // e.g. v1.0.0-PROD

    @Enumerated(EnumType.STRING)
    @Column(name = "gamp_category", nullable = false, length = 50)
    private GampCategory gampCategory;

    @Column(name = "system_description", columnDefinition = "TEXT")
    private String systemDescription;

    @Column(name = "validation_lead", nullable = false, length = 100)
    private String validationLead;

    @Column(name = "qa_manager", nullable = false, length = 100)
    private String qaManager;

    @Column(name = "executive_sponsor", length = 100)
    private String executiveSponsor;

    @Column(name = "planned_start_date")
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date")
    private LocalDate plannedEndDate;

    @Column(name = "actual_completion_date")
    private LocalDate actualCompletionDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "project_status", nullable = false, length = 50)
    private CsvProjectStatus projectStatus;

    @Column(name = "overall_conclusion", columnDefinition = "TEXT")
    private String overallConclusion;

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
