package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String entityType; // PRODUCT, MANUFACTURER, BRAND, etc.

    @Column(nullable = false)
    private Long entityId;

    @Column(nullable = false)
    private String action; // CREATE, UPDATE, DELETE, RESTORE

    @Column(nullable = false)
    private String modifier; // Login ID (for backward compatibility)

    private Long modifierId;
    private String modifierUsername;
    private String modifierName;
    private String modifierCompany;

    @CreationTimestamp
    private LocalDateTime modifiedAt;

    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String description; // Summary of changes

    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String oldValue;

    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String newValue;
}
