package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 포장사양서 구성품 엔티티 (Sheet 1 구성품 리스트 매핑용)
 */
@Entity
@Table(name = "packaging_spec_components")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackagingSpecComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "spec_id", nullable = false)
    private Long specId; // 연관 포장사양 ID

    private String bomCode;             // BOM 코드
    private String componentName;       // 구성품명
    private String specDetails;         // 재질 및 세부 사양
    private String sizeDimension;       // 규격 및 사이즈
    private Double weight;              // 개별 중량 (g)
    private Integer quantity;           // 입수량
    private String supplier;            // 업체
    private String remarks;             // 비고

    @Column(length = 500)
    private String coatingSpec;         // 코팅 세부 사양
    @Column(length = 500)
    private String printingSpec;        // 인쇄 세부 사양
    @Column(length = 500)
    private String adhesiveSpec;        // 접착제 세부 사양
    @Column(length = 500)
    private String postProcessingSpec;  // 후가공 사양

    @Column(length = 1000)
    private String imagePath;           // 부자재 사진 URL
}
