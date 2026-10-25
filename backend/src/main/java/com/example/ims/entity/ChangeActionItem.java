package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 🔄 변경실행 조치항목 (Change Action Item) 엔티티
 * ISO 13485:2016 §7.3.9 / 21 CFR 820.70(b)
 */
@Entity
@Table(name = "change_action_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeActionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "change_request_id", nullable = false)
    private ChangeRequest changeRequest;

    @Column(name = "action_order", nullable = false)
    @Builder.Default
    private Integer actionOrder = 1;

    @Column(name = "action_title", nullable = false, length = 255)
    private String actionTitle;

    @Column(name = "action_details", columnDefinition = "TEXT")
    private String actionDetails;

    @Column(name = "assigned_person", nullable = false, length = 100)
    private String assignedPerson;

    @Column(name = "assigned_department", length = 100)
    private String assignedDepartment;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "completion_date")
    private LocalDate completionDate;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING, IN_PROGRESS, COMPLETED, CANCELLED

    @Column(name = "evidence_doc_url", length = 500)
    private String evidenceDocUrl;

    @Column(name = "verification_notes", columnDefinition = "TEXT")
    private String verificationNotes;

    // -------------------------------------------------------------------------
    // 감사추적 및 소프트 삭제
    // -------------------------------------------------------------------------
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

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
