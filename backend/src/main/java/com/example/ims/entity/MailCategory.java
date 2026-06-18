package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "mail_categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String categoryCode; // e.g. CLAIM, PRODUCTION_AUDIT

    @Column(nullable = false)
    private String categoryName; // e.g. 클레임 관리, 생산감리

    @Column(columnDefinition = "TEXT")
    private String availableVariables; // Format: claimNumber:클레임 문서번호, productName:제품명

    @Builder.Default
    @Column(nullable = false)
    private Boolean deleted = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
