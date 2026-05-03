package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "claim_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClaimHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long claimId;

    @Column(nullable = false)
    private String modifier; // Username or actual name

    private Long modifierId;
    private String modifierUsername;
    private String modifierName;
    private String modifierCompany;

    @CreationTimestamp
    private LocalDateTime modifiedAt;

    private String fieldName;

    @Column(columnDefinition = "TEXT")
    private String oldValue;

    @Column(columnDefinition = "TEXT")
    private String newValue;
}
