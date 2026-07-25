package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "manufacturer_invite_tokens", indexes = {
    @Index(name = "idx_mfr_invite_token", columnList = "token", unique = true),
    @Index(name = "idx_mfr_invite_mfr_id", columnList = "manufacturer_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManufacturerInviteToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manufacturer_id", nullable = false)
    private Manufacturer manufacturer;

    @Column(nullable = false, unique = true, length = 100)
    private String token;

    private String createdBy;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private LocalDateTime usedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public boolean isValid() {
        return usedAt == null && expiresAt != null && expiresAt.isAfter(LocalDateTime.now());
    }
}
