package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "manufacturer_audit_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ManufacturerAuditResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audit_id")
    @com.fasterxml.jackson.annotation.JsonBackReference("audit-results")
    private ManufacturerAudit audit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    private AuditTemplateItem item;

    private int score; // 1-5

    @Column(columnDefinition = "TEXT")
    private String remarks;
}
