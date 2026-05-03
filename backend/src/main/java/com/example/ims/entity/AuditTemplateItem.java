package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "audit_template_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AuditTemplateItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    @com.fasterxml.jackson.annotation.JsonBackReference("group-items")
    private AuditTemplateGroup group;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String itemContent; // 세부항목 내용

    private int displayOrder;

    @Builder.Default
    @Column(name = "is_active")
    private boolean active = true;
}
