package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "electronic_signatures")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE electronic_signatures SET is_deleted = true, updated_at = NOW() WHERE id = ?")
@SQLRestriction("is_deleted = false")
public class ElectronicSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "signature_number", unique = true, nullable = false, length = 50)
    private String signatureNumber;

    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(name = "target_number", length = 100)
    private String targetNumber;

    @Column(name = "target_title", length = 300)
    private String targetTitle;

    @Column(name = "signer_username", nullable = false, length = 100)
    private String signerUsername;

    @Column(name = "signer_full_name", nullable = false, length = 100)
    private String signerFullName;

    @Column(name = "signer_department", length = 100)
    private String signerDepartment;

    @Column(name = "signer_role", length = 100)
    private String signerRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "signature_meaning", nullable = false, length = 50)
    private SignatureMeaning signatureMeaning;

    @Column(name = "signature_reason", length = 500)
    private String signatureReason;

    @Column(name = "signed_at", nullable = false)
    private LocalDateTime signedAt;

    @Column(name = "ip_address", length = 100)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Enumerated(EnumType.STRING)
    @Column(name = "reauth_method", nullable = false, length = 50)
    private SignatureReauthMethod reauthMethod;

    @Column(name = "signature_hash", nullable = false, length = 64)
    private String signatureHash;

    @Column(name = "manifest_json", columnDefinition = "TEXT")
    private String manifestJson;

    @Column(name = "is_revoked", nullable = false)
    @Builder.Default
    private Boolean isRevoked = false;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "revoked_by", length = 100)
    private String revokedBy;

    @Column(name = "revocation_reason", length = 500)
    private String revocationReason;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
