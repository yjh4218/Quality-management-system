package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 포장사양서 BOM 상세 항목 (Feature 10a, 11)
 * 마스터 포장재 정보를 참조하며, 규격과 사용량만 개별적으로 관리합니다.
 */
@Entity
@Table(name = "packaging_spec_bom_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackagingSpecBomItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "packaging_spec_id", nullable = false)
    private PackagingSpecification packagingSpec;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "master_material_id", nullable = false)
    private MasterPackagingMaterial masterMaterial;

    private String specification; // 규격 (개별 수정 가능)

    private Double usageCount; // 사용량

    private Integer sortOrder;
}
