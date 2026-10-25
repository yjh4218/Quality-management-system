package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 교정 이력 및 성적서 관리 엔티티
 * 규격: ISO 13485:2016 §7.6 / 21 CFR 820.72 (Inspection, measuring, and test equipment)
 */
@Entity
@Table(name = "calibration_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalibrationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "calibration_number", nullable = false, unique = true, length = 50)
    private String calibrationNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @Column(name = "calibration_date", nullable = false)
    private LocalDate calibrationDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "agency_type", nullable = false, length = 40)
    private CalibrationAgencyType agencyType;

    @Column(name = "agency_name", length = 150)
    private String agencyName;

    @Column(name = "certificate_number", length = 100)
    private String certificateNumber;

    @Column(name = "certificate_file_url", length = 500)
    private String certificateFileUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CalibrationResult result;

    @Column(name = "tolerance_standard", length = 255)
    private String toleranceStandard;

    @Column(name = "max_deviation", length = 100)
    private String maxDeviation;

    @Column(name = "calibrated_by", length = 100)
    private String calibratedBy;

    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    @Column(name = "verification_date")
    private LocalDate verificationDate;

    @Column(name = "impact_assessment_required", nullable = false)
    @Builder.Default
    private Boolean impactAssessmentRequired = false;

    @Column(name = "impact_assessment_notes", columnDefinition = "TEXT")
    private String impactAssessmentNotes;

    @Column(name = "next_calibration_due_date", nullable = false)
    private LocalDate nextCalibrationDueDate;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "last_modified_by", length = 100)
    private String lastModifiedBy;
}
