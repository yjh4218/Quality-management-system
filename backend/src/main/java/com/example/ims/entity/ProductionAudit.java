package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@org.hibernate.annotations.SQLRestriction("is_deleted = false")
public class ProductionAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String itemCode;

    @Column(nullable = false)
    private String productName;

    @Column(nullable = false)
    private String manufacturerName;

    private LocalDate productionDate;

    private LocalDateTime uploadDate;

    // 이미지 경로들을 콤마(,)로 구분된 문자열로 저장
    @Column(columnDefinition = "TEXT")
    private String containerImages;

    @Column(columnDefinition = "TEXT")
    private String boxImages;

    @Column(columnDefinition = "TEXT")
    private String loadImages;

    private String status; // SUBMITTED, APPROVED, REJECTED

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "is_disclosed")
    private boolean isDisclosed = false;

    private boolean isDeleted = false;

    @PrePersist
    protected void onCreate() {
        this.uploadDate = LocalDateTime.now();
        if (this.status == null) {
            this.status = "SUBMITTED";
        }
    }
}
