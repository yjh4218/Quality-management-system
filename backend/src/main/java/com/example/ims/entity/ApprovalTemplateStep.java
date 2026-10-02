package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "approval_template_steps", indexes = {
    @Index(name = "idx_tpl_steps_template_id", columnList = "template_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalTemplateStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    @ToString.Exclude
    private ApprovalTemplate template;

    @Column(name = "step_order", nullable = false)
    private Integer stepOrder;

    @Column(name = "step_type", nullable = false, length = 20)
    private String stepType;

    @Column(name = "assignee_type", nullable = false, length = 20)
    private String assigneeType;

    @Column(name = "assignee_role", length = 50)
    private String assigneeRole;

    @Column(name = "assignee_department_id")
    private Long assigneeDepartmentId;

    @Column(name = "assignee_user_id")
    private Long assigneeUserId;

    @Column(name = "condition_json", columnDefinition = "TEXT")
    private String conditionJson;

    @Builder.Default
    @Column(name = "is_required", nullable = false)
    private Boolean isRequired = true;
}
