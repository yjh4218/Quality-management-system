package com.example.ims.dto;

import com.example.ims.entity.SignatureMeaning;
import com.example.ims.entity.SignatureReauthMethod;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ElectronicSignatureResponse {

    private Long id;
    private String signatureNumber;
    private String documentType;
    private Long targetId;
    private String targetNumber;
    private String targetTitle;
    private String signerUsername;
    private String signerFullName;
    private String signerDepartment;
    private String signerRole;
    private SignatureMeaning signatureMeaning;
    private String signatureMeaningDescription;
    private String signatureReason;
    private LocalDateTime signedAt;
    private String ipAddress;
    private String userAgent;
    private SignatureReauthMethod reauthMethod;
    private String signatureHash;
    private String manifestJson;
    private Boolean isRevoked;
    private LocalDateTime revokedAt;
    private String revokedBy;
    private String revocationReason;
    private Boolean isIntegrityValid;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
