package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "approval_document_reads",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_approval_doc_user_read", columnNames = {"document_id", "user_id"})
    },
    indexes = {
        @Index(name = "idx_approval_doc_reads_user", columnList = "user_id"),
        @Index(name = "idx_approval_doc_reads_doc", columnList = "document_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalDocumentRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @CreationTimestamp
    @Column(name = "read_at", nullable = false, updatable = false)
    private LocalDateTime readAt;
}
