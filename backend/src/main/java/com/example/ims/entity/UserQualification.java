package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 🏅 직무 자격 적격성 엔티티 (UserQualification - Competence Matrix).
 * ISO 13485 §6.2 / 화장품법 제3조·제7조에 따른 법정 및 사내 품질 전문 직무 자격 관리.
 */
@Entity
@Table(name = "user_qualifications", indexes = {
        @Index(name = "idx_uq_username", columnList = "username"),
        @Index(name = "idx_uq_department", columnList = "department"),
        @Index(name = "idx_uq_type", columnList = "qualification_type"),
        @Index(name = "idx_uq_status", columnList = "qualification_status"),
        @Index(name = "idx_uq_expiry_date", columnList = "expiry_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserQualification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    /** 사용자 계정 ID */
    @Column(name = "user_id")
    private Long userId;

    /** 사용자 계정 ID 명 */
    @Column(name = "username", nullable = false, length = 100)
    private String username;

    /** 임직원 성명 */
    @Column(name = "user_name", nullable = false, length = 100)
    private String employeeName;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmployeeName() {
        return employeeName;
    }

    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }

    /** 소속 부서 */
    @Column(name = "department", length = 100)
    private String department;

    /** 직위 / 직책 */
    @Column(name = "position", length = 100)
    private String position;

    /** 자격 명칭 (예: 화장품 책임판매관리자, ISO 13485 내부심사원, 출하판정원) */
    @Column(name = "qualification_name", nullable = false, length = 150)
    private String qualificationName;

    /** 자격 구분 (법정필수, 사내인증, 심사원, 특수공정) */
    @Enumerated(EnumType.STRING)
    @Column(name = "qualification_type", nullable = false, length = 30)
    private QualificationType qualificationType;

    /** 자격 유효 상태 (적격, 조건부, 만료, 정지) */
    @Enumerated(EnumType.STRING)
    @Column(name = "qualification_status", nullable = false, length = 30)
    @Builder.Default
    private QualificationStatus qualificationStatus = QualificationStatus.QUALIFIED;

    /** 자격 취득 / 부여일 */
    @Column(name = "certified_date", nullable = false)
    private LocalDate certifiedDate;

    /** 자격 만료일 (갱신 필요일) */
    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    /** 연계 필수 교육과정 코드 */
    @Column(name = "required_course_code", length = 50)
    private String requiredCourseCode;

    /** 자격 증서 / 자격증 번호 */
    @Column(name = "certificate_number", length = 100)
    private String certificateNumber;

    /** 자격 승인/인정권자 성명 */
    @Column(name = "authorizer_name", length = 100)
    private String authorizerName;

    /** 자격 취득 근거 및 세부 비고 */
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
