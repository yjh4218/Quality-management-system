package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "master_packaging_material_layers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MasterPackagingMaterialLayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer layerSeq; // 레이어 순차 (1, 2, 3...)

    @Column(nullable = false)
    private String materialName; // 재질명

    @Column(nullable = false)
    private Double weight; // 중량 (g)

    @Column(nullable = false)
    private Double thickness; // 두께 (um)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "master_material_id")
    @JsonBackReference
    private MasterPackagingMaterial masterMaterial;
}
