package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 포장재 재질 및 제조사 정보 마스터 테이블 (Feature 11)
 */
@Entity
@Table(name = "master_packaging_materials")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MasterPackagingMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(nullable = false, unique = true)
    private String bomCode; // BOM 코드

    @Column(nullable = false)
    private String componentName; // 구성품명

    private String type; // 유형

    private String detailedType; // 세부유형

    private String detailedMaterial; // 세부재질

    @Column(nullable = false)
    private Double weight; // 중량 (g)

    @Column(nullable = false)
    private Double thickness; // 두께 (um)

    private String material; // 재질 (기존 필드 유지하되, 상세 필드 우선 사용 권장)

    private String manufacturer; // 제조사

    private String specification; // 구성품 규격

    @Builder.Default
    private Boolean isMultiLayer = false; // 다층 구조 여부

    @OneToMany(mappedBy = "masterMaterial", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<MasterPackagingMaterialLayer> layers = new ArrayList<>();

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @PrePersist
    public void ensureMandatoryFields() {
        if (this.bomCode == null || this.bomCode.trim().isEmpty()) {
            this.bomCode = "AUTO-BOM-" + (this.id != null ? this.id : System.nanoTime());
        }
        if (this.componentName == null || this.componentName.trim().isEmpty()) {
            this.componentName = "MIGRATED_COMPONENT";
        }
        if (this.weight == null) {
            this.weight = 0.0;
        }
        if (this.thickness == null) {
            this.thickness = 0.0;
        }
    }
}
