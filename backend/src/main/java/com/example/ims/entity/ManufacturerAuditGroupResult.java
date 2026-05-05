package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "manufacturer_audit_group_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ManufacturerAuditGroupResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audit_id")
    @com.fasterxml.jackson.annotation.JsonBackReference("audit-group-results")
    private ManufacturerAudit audit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private AuditTemplateGroup group;

    @Column(columnDefinition = "TEXT")
    private String feedback;
}
