package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity representing the packaging specifications for a specific product.
 * 제품별 포장 사양 등록 정보를 관리하는 엔티티
 */
@Entity
@Table(name = "packaging_specifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackagingSpecification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(columnDefinition = "TEXT")
    private String packagingMethodText;

    /**
     * URL or path to the packaging method image
     * 포장방법 사진 (캡처 포함)
     */
    private String packagingMethodImage;

    // --- 포장 사양 세부 항목 (Feature 10) ---
    @Column(columnDefinition = "TEXT")
    private String inboxSpec;   // 인박스 사양 (입수량, 규격 등)

    @Column(columnDefinition = "TEXT")
    private String zipperBagSpec;  // 지퍼백 사양 (입수량, 규격 등)

    @Column(columnDefinition = "TEXT")
    private String outboxSpec;  // 아웃박스 사양 (입수량, 규격 등)

    @Column(columnDefinition = "TEXT")
    private String palletStackingSpec; // 팔레트 적재량 (단/아웃박스 기준 적재 수량 등)

    @Enumerated(EnumType.STRING)
    private PaletteType palletType; // 팔레트 종류 (Feature 6)

    private String lotAndExpiryFormat; // 제조번호 및 사용기한 입력란 (착인/압인 방식 등)

    @Column(columnDefinition = "TEXT")
    private String signatureJson; // 담당자별 서명란 (JSON 형태: {role, name, signedAt})

    @Column(nullable = false)
    private boolean applyChannelSticker; // 채널 분류 스티커 부착 여부 (Feature 8)

    @OneToMany(mappedBy = "packagingSpec", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<PackagingSpecBomItem> bomItems = new java.util.ArrayList<>();

    /**
     * Version number (1, 2, 3...)
     * 1부터 시작하는 버전 번호
     */
    private Integer version;

    /**
     * Auto-generated notes on what changed from the previous version
     * 버전에 따른 개정내용 (예: 최초 등록, 포장방법 설명 변경 등)
     */
    private String revisionNotes;

    private String lastModifiedBy;
    private LocalDateTime lastModifiedAt;

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        this.lastModifiedAt = LocalDateTime.now();
    }
}
