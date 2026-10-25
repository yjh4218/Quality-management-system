package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ISO 13485:2016 §7.3 / 21 CFR 820.30 의료기기 설계개발 프로젝트 및 DHF 마스터 엔티티
 */
@Entity
@Table(name = "design_projects", indexes = {
        @Index(name = "idx_dp_project_code", columnList = "projectCode", unique = true),
        @Index(name = "idx_dp_dhf_number", columnList = "dhfNumber", unique = true),
        @Index(name = "idx_dp_current_phase", columnList = "currentPhase"),
        @Index(name = "idx_dp_status", columnList = "status"),
        @Index(name = "idx_dp_dhf_status", columnList = "dhfStatus"),
        @Index(name = "idx_dp_deleted", columnList = "isDeleted")
})
@org.hibernate.annotations.SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
@Getter
@Setter
@ToString(exclude = {"controlItems", "reviewRecords"})
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@EntityListeners(AuditingEntityListener.class)
public class DesignProject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    /**
     * 프로젝트 코드 (e.g. DP-2026-001)
     */
    @Column(name = "project_code", unique = true, nullable = false, length = 50)
    @NotBlank(message = "프로젝트 코드는 필수입니다.")
    @Size(max = 50, message = "프로젝트 코드는 50자 이내여야 합니다.")
    private String projectCode;

    /**
     * 프로젝트 명칭
     */
    @Column(name = "project_name", nullable = false, length = 200)
    @NotBlank(message = "프로젝트 명은 필수입니다.")
    @Size(max = 200, message = "프로젝트 명은 200자 이내여야 합니다.")
    private String projectName;

    /**
     * 연계 의료기기 마스터 ID (Optional)
     */
    @Column(name = "medical_device_id")
    private Long medicalDeviceId;

    /**
     * 대상 의료기기 명칭
     */
    @Column(name = "target_device_name", nullable = false, length = 200)
    @NotBlank(message = "대상 의료기기 명칭은 필수입니다.")
    private String targetDeviceName;

    /**
     * 기기 등급 (CLASS_I, CLASS_II, CLASS_III, CLASS_IV)
     */
    @Column(name = "device_classification", nullable = false, length = 30)
    @Builder.Default
    private String deviceClassification = "CLASS_II";

    /**
     * 프로젝트 총괄 책임자
     */
    @Column(name = "project_leader", nullable = false, length = 100)
    @NotBlank(message = "책임자는 필수입니다.")
    private String projectLeader;

    /**
     * 담당 부서
     */
    @Column(name = "department", nullable = false, length = 100)
    @NotBlank(message = "부서는 필수입니다.")
    private String department;

    /**
     * 시작일
     */
    @Column(name = "start_date", nullable = false)
    @NotNull(message = "시작일은 필수입니다.")
    private LocalDate startDate;

    /**
     * 목표 완료일
     */
    @Column(name = "target_completion_date", nullable = false)
    @NotNull(message = "목표 완료일은 필수입니다.")
    private LocalDate targetCompletionDate;

    /**
     * 실제 완료일
     */
    @Column(name = "actual_completion_date")
    private LocalDate actualCompletionDate;

    /**
     * 현재 설계 단계 (PLANNING, INPUT, OUTPUT, VERIFICATION, VALIDATION, TRANSFER, COMPLETED)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "current_phase", nullable = false, length = 30)
    @Builder.Default
    private DesignPhase currentPhase = DesignPhase.PLANNING;

    /**
     * 프로젝트 상태 (ACTIVE, UNDER_REVIEW, APPROVED, ON_HOLD, COMPLETED, CANCELLED)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private DesignProjectStatus status = DesignProjectStatus.ACTIVE;

    /**
     * DHF 관리번호 (e.g. DHF-2026-001)
     */
    @Column(name = "dhf_number", unique = true, nullable = false, length = 50)
    @NotBlank(message = "DHF 관리번호는 필수입니다.")
    private String dhfNumber;

    /**
     * DHF 편철 상태 (OPEN, FROZEN, ARCHIVED)
     */
    @Column(name = "dhf_status", nullable = false, length = 30)
    @Builder.Default
    private String dhfStatus = "OPEN";

    /**
     * 연계 위험관리 파일(ISO 14971) ID
     */
    @Column(name = "risk_assessment_id")
    private Long riskAssessmentId;

    /**
     * 프로젝트 개요 및 사양 설명
     */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * 설계통제 항목 및 추적성 목록
     */
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    @Builder.Default
    private List<DesignControlItem> controlItems = new ArrayList<>();

    /**
     * 단계별 설계심의(Stage-Gate) 이력
     */
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    @Builder.Default
    private List<DesignReviewRecord> reviewRecords = new ArrayList<>();

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    public void addControlItem(DesignControlItem item) {
        controlItems.add(item);
        item.setProject(this);
    }

    public void removeControlItem(DesignControlItem item) {
        controlItems.remove(item);
        item.setProject(null);
    }

    public void addReviewRecord(DesignReviewRecord record) {
        reviewRecords.add(record);
        record.setProject(this);
    }
}
