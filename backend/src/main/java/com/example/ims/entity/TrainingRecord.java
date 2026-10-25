package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 🎓 교육이수 및 평가 기록 엔티티 (TrainingRecord).
 * 개별 임직원의 교육 이수, 평가 점수, 수료 유효기간 및 효과성 평가(ISO 13485:2016 §6.2) 추적.
 */
@Entity
@Table(name = "training_records", indexes = {
        @Index(name = "idx_tr_record_no", columnList = "record_no"),
        @Index(name = "idx_tr_course_id", columnList = "course_id"),
        @Index(name = "idx_tr_course_code", columnList = "course_code"),
        @Index(name = "idx_tr_username", columnList = "username"),
        @Index(name = "idx_tr_department", columnList = "department"),
        @Index(name = "idx_tr_status", columnList = "completion_status"),
        @Index(name = "idx_tr_training_date", columnList = "training_date"),
        @Index(name = "idx_tr_expiry_date", columnList = "expiry_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    /** 교육이수 관리 번호 (예: TRR-202610-001) */
    @Column(name = "record_no", nullable = false, unique = true, length = 50)
    private String recordNo;

    /** 과정 ID 연동 */
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    /** 교육과정 코드 */
    @Column(name = "course_code", nullable = false, length = 50)
    private String courseCode;

    /** 교육과정 명칭 */
    @Column(name = "course_name", nullable = false, length = 200)
    private String courseName;

    /** 교육 분류 (GMP, 의료기기, 보안 등) */
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private TrainingCategory category;

    /** 적용 제품군 */
    @Enumerated(EnumType.STRING)
    @Column(name = "target_family", nullable = false, length = 30)
    @Builder.Default
    private ProductFamily targetFamily = ProductFamily.COMMON;

    /** 교육 대상자 계정 ID */
    @Column(name = "user_id")
    private Long userId;

    /** 교육 대상자 사용자 아이디 */
    @Column(name = "username", nullable = false, length = 100)
    private String username;

    /** 교육 대상자 성명 */
    @Column(name = "trainee_name", nullable = false, length = 100)
    private String traineeName;

    /** 소속 부서 */
    @Column(name = "department", length = 100)
    private String department;

    /** 직위 / 직책 */
    @Column(name = "position", length = 100)
    private String position;

    /** 교육 이수 일자 */
    @Column(name = "training_date", nullable = false)
    private LocalDate trainingDate;

    /** 자격/수료 유효 만료일 (주기 기반 자동 산출) */
    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    /** 이수 완료 상태 (COMPLETED, SCHEDULED, IN_PROGRESS, FAILED, EXPIRED) */
    @Enumerated(EnumType.STRING)
    @Column(name = "completion_status", nullable = false, length = 30)
    @Builder.Default
    private TrainingCompletionStatus completionStatus = TrainingCompletionStatus.SCHEDULED;

    /** 평가 점수 (0 ~ 100) */
    @Column(name = "score")
    private Integer score;

    /** 합격 / 수료 판정 여부 */
    @Column(name = "is_passed")
    @Builder.Default
    private Boolean isPassed = false;

    public Boolean isPassed() {
        return Boolean.TRUE.equals(this.isPassed);
    }

    /** 평가 방식 (필기시험, 실기평가, 결과보고서, 출석확인) */
    @Enumerated(EnumType.STRING)
    @Column(name = "evaluation_method", length = 30)
    @Builder.Default
    private EvaluationMethod evaluationMethod = EvaluationMethod.WRITTEN_TEST;

    /** 교육훈련 효과성 평가 (ISO 13485:2016 §6.2(c)) */
    @Enumerated(EnumType.STRING)
    @Column(name = "effectiveness_evaluation", length = 30)
    @Builder.Default
    private EffectivenessEvaluation effectivenessEvaluation = EffectivenessEvaluation.PENDING;

    /** 효과성 평가자 성명 */
    @Column(name = "effectiveness_evaluator", length = 100)
    private String effectivenessEvaluator;

    /** 효과성 평가 일자 */
    @Column(name = "effectiveness_date")
    private LocalDate effectivenessDate;

    /** 효과성 평가 세부 의견 / 소견 */
    @Column(name = "effectiveness_notes", columnDefinition = "TEXT")
    private String effectivenessNotes;

    /** 수료증/결과보고서 첨부파일 URL */
    @Column(name = "certificate_url", length = 500)
    private String certificateUrl;

    /** 수료증 파일명 */
    @Column(name = "certificate_file_name", length = 255)
    private String certificateFileName;

    /** 수료증 파일 크기 (bytes) */
    @Column(name = "certificate_file_size")
    private Long certificateFileSize;

    /** 특이사항 및 강사 소견 */
    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

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
