package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 🎓 표준 교육과정 마스터 엔티티 (TrainingCourse).
 * ISO 13485:2016 §6.2 및 ISO 22716 §3에 따른 교육훈련 과정 정의.
 */
@Entity
@Table(name = "training_courses", indexes = {
        @Index(name = "idx_tc_course_code", columnList = "course_code"),
        @Index(name = "idx_tc_category", columnList = "category"),
        @Index(name = "idx_tc_target_family", columnList = "target_family"),
        @Index(name = "idx_tc_status", columnList = "status"),
        @Index(name = "idx_tc_is_required", columnList = "is_required")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    /** 교육과정 코드 (예: TRC-GMP-001, TRC-MD-001) */
    @Column(name = "course_code", nullable = false, unique = true, length = 50)
    private String courseCode;

    /** 교육과정 명칭 */
    @Column(name = "course_name", nullable = false, length = 200)
    private String courseName;

    /** 교육 구분 (GMP, 의료기기, 보안, 안전, 품질일반) */
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private TrainingCategory category;

    /** 적용 제품군 (COMMON, COSMETICS, MEDICAL_DEVICE) */
    @Enumerated(EnumType.STRING)
    @Column(name = "target_family", nullable = false, length = 30)
    @Builder.Default
    private ProductFamily targetFamily = ProductFamily.COMMON;

    /** 대상 직무 및 부서 (예: 제조/QA/QC, 전임직원, 책임판매관리자) */
    @Column(name = "target_audience", length = 200)
    private String targetAudience;

    /** 교육 주기 (개월 단위: 12=연간, 6=반기, 0=일회성) */
    @Column(name = "cycle_months", nullable = false)
    @Builder.Default
    private Integer cycleMonths = 12;

    /** 수료 기준 점수 (기본 70점 / 80점) */
    @Column(name = "passing_score", nullable = false)
    @Builder.Default
    private Integer passingScore = 70;

    /** 교육 시간 (시간 단위: 예 2.0, 4.0, 8.0) */
    @Column(name = "training_hours")
    @Builder.Default
    private Double trainingHours = 2.0;

    /** 법정/규제 필수 교육 여부 */
    @Column(name = "is_required", nullable = false)
    @Builder.Default
    private Boolean isRequired = true;

    /** 강사 / 교육 기관 (사내 강사 또는 외부 공인기관) */
    @Column(name = "instructor", length = 100)
    private String instructor;

    /** 교육 목표 및 상세 커리큘럼 */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** 교육 교재/자료 링크 */
    @Column(name = "material_url", length = 500)
    private String materialUrl;

    /** 과정 운영 상태 (ACTIVE, INACTIVE) */
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    /** 소프트 삭제 플래그 */
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;
}
