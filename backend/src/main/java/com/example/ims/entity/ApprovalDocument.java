package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "approval_documents", indexes = {
    @Index(name = "idx_approval_docs_status", columnList = "status"),
    @Index(name = "idx_approval_docs_submitted_by", columnList = "submitted_by"),
    @Index(name = "idx_approval_docs_doc_type", columnList = "doc_type_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doc_type_id", nullable = false)
    private ApprovalDocType docType;

    @Column(name = "source_record_id")
    private Long sourceRecordId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private ApprovalTemplate template;

    @Column(nullable = false, length = 255)
    private String title;

    @Builder.Default
    @Column(nullable = false, length = 20)
    private String status = "DRAFT";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by", nullable = false)
    private User submittedBy;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "parent_document_id")
    private Long parentDocumentId;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "retention_period", length = 50)
    private String retentionPeriod;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepOrder ASC, id ASC")
    @org.hibernate.annotations.BatchSize(size = 50)
    @Builder.Default
    @ToString.Exclude
    private List<ApprovalStepInstance> stepInstances = new ArrayList<>();
}
