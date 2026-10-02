package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Table(name = "approval_step_instances", indexes = {
    @Index(name = "idx_approval_step_inst_doc", columnList = "document_id"),
    @Index(name = "idx_approval_step_inst_assignee", columnList = "assignee_user_id, status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalStepInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    @ToString.Exclude
    private ApprovalDocument document;

    @Column(name = "step_order", nullable = false)
    private Integer stepOrder;

    @Column(name = "step_type", nullable = false, length = 20)
    private String stepType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_user_id", nullable = false)
    private User assigneeUser;

    @Builder.Default
    @Column(name = "is_adhoc", nullable = false)
    private Boolean isAdhoc = false;

    @Builder.Default
    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;
}
