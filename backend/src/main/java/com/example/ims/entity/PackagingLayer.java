package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 포장 레이어 (PackagingLayer) 엔티티.
 * - 한국 포장공간비율 계산 시 1차/2차/3차 캐스케이드 계산을 위해 각 차수별 내측/외측 크기를 기록합니다.
 */
@Entity
@Table(name = "packaging_layers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"component"})
public class PackagingLayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "component_id", nullable = false)
    private Long componentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "component_id", insertable = false, updatable = false)
    private PackagingComponent component;

    @Column(name = "layer_order", nullable = false)
    private Integer layerOrder; // 1=1차, 2=2차, 3=3차...

    @Column(name = "layer_type", nullable = false)
    private String layerType; // CONTAINER, INNER_BOX, POUCH, ETC

    @Column(name = "inner_length_mm", nullable = false)
    private Double innerLengthMm;

    @Column(name = "inner_width_mm", nullable = false)
    private Double innerWidthMm;

    @Column(name = "inner_height_mm", nullable = false)
    private Double innerHeightMm;

    @Column(name = "outer_length_mm", nullable = false)
    private Double outerLengthMm;

    @Column(name = "outer_width_mm", nullable = false)
    private Double outerWidthMm;

    @Column(name = "outer_height_mm", nullable = false)
    private Double outerHeightMm;

    @Column(name = "uses_cushioning_material", nullable = false)
    @Builder.Default
    private Boolean usesCushioningMaterial = false;
}
