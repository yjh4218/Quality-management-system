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

    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String changeDetail;

    @Column(name = "record_hash", length = 64)
    private String recordHash; // 21 CFR Part 11 / ISO 13485 감사추적 변조 방지 해시

    public static String calculateHash(String entityType, Long entityId, String action, String modifier, LocalDateTime modifiedAt, String description) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            String data = (entityType != null ? entityType : "") + "|" +
                          (entityId != null ? entityId : "") + "|" +
                          (action != null ? action : "") + "|" +
                          (modifier != null ? modifier : "") + "|" +
                          (modifiedAt != null ? modifiedAt.toString() : "") + "|" +
                          (description != null ? description : "");
            byte[] hash = md.digest(data.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return null;
        }
    }
}
