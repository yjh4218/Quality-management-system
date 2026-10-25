package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 📂 통제문서 및 개정관리(DMS) 엔티티.
 * ISO 9001, ISO 13485, ISO 22716 요구사항에 따른 품질 문서 라이프사이클 및 개정 추적성을 관리합니다.
 */
@Entity
@Table(name = "controlled_documents", indexes = {
        @Index(name = "idx_cd_doc_no", columnList = "doc_no"),
        @Index(name = "idx_cd_status", columnList = "status"),
        @Index(name = "idx_cd_doc_type", columnList = "doc_type"),
        @Index(name = "idx_cd_target_family", columnList = "target_family"),
        @Index(name = "idx_cd_title", columnList = "title"),
        @Index(name = "idx_cd_parent_id", columnList = "parent_document_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ControlledDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    /** 문서 관리 번호 (예: SOP-QA-001, QM-COS-001) */
    @Column(name = "doc_no", nullable = false, length = 50)
    private String docNo;

    /** 문서 제목 */
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    /** 문서 유형 (품질매뉴얼, SOP, WI, 양식, DHF, DMR 등) */
    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false, length = 30)
    private ControlledDocType docType;

    /** 적용 제품군 (화장품, 의료기기, 공통) */
    @Enumerated(EnumType.STRING)
    @Column(name = "target_family", nullable = false, length = 30)
    @Builder.Default
    private ProductFamily targetFamily = ProductFamily.COMMON;

    /** 문서 상태 (DRAFT, UNDER_REVIEW, APPROVED, EFFECTIVE, SUPERSEDED, OBSOLETE) */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private ControlledDocStatus status = ControlledDocStatus.DRAFT;

    /** 개정 번호 표기 (예: Rev. 0, Rev. 1.0, Rev. 2.1) */
    @Column(name = "revision_no", nullable = false, length = 20)
    @Builder.Default
    private String revisionNo = "Rev. 0";

    /** 개정 번호 정수형 (정렬 및 비교용: 0, 1, 2...) */
    @Column(name = "revision_int", nullable = false)
    @Builder.Default
    private Integer revisionInt = 0;

    /** 직전 리비전 문서 ID (개정 이력 체인 추적) */
    @Column(name = "parent_document_id")
    private Long parentDocumentId;

    /** 개정 사유 및 변경 내용 요약 */
    @Column(name = "change_rationale", columnDefinition = "TEXT")
    private String changeRationale;

    /** 효력 발생일 (배포일) */
    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    /** 차기 정기 검토일 또는 유효기간 */
    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    /** 주관 부서 (예: 품질보증팀, RA팀, 생산관리팀) */
    @Column(name = "department", length = 100)
    private String department;

    /** 작성자 / 기안자 명 */
    @Column(name = "author_name", length = 100)
    private String authorName;

    /** 검토자 명 */
    @Column(name = "reviewer_name", length = 100)
    private String reviewerName;

    /** 최종 승인자 명 (품질책임자 / 대표이사) */
    @Column(name = "approver_name", length = 100)
    private String approverName;

    /** 문서 본문 내용 (마크다운 / 표준 서식 HTML 전문) */
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    /** 첨부파일 URL / 스토리지 경로 */
    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    /** 첨부 원본 파일명 */
    @Column(name = "attachment_file_name", length = 255)
    private String attachmentFileName;

    /** 첨부 파일 크기 (Bytes) */
    @Column(name = "attachment_file_size")
    private Long attachmentFileSize;

    /** 연동된 전자결재 문서 ID */
    @Column(name = "approval_doc_id")
    private Long approvalDocId;

    /** 소프트 딜리트 플래그 (규제 무결성 감사 추적 보존) */
    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    /** 삭제 일시 */
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
