package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 제품별 포장 사양 등록 정보를 관리하는 엔티티 (개편 버전)
 * 전달받은 packaging_spec_3 엑셀 서식의 3개 시트 사양 필드들을 모두 수용합니다.
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"brand", "manufacturerInfo", "channels", "components", "productIngredients", "imagePaths", "packagingCertificates"})
    private Product product;

    // --- 기본 정보 (Sheet 1) ---
    private String barcode;             // 바코드
    private String labNumber;           // 랩 넘버
    private String plannerName;         // 기획 담당
    private String designerName;        // 디자인 담당
    private String qcName;              // 품질관리 담당
    private String managementType;      // 관리품 구분 (벌크 신규 / 사양 변경 / 러닝)
    private String barcodeManager;      // 바코드 담당자
    @Column(columnDefinition = "TEXT")
    private String approvalChainJson;   // 결재 라인 정보 (JSON String: 기획/디자인/구매/품질 + 검토일)

    // --- 개정 내역 및 구성품 리스트는 1:N 연관 엔티티로 분리 (bomItems는 하위 호환용으로 유지) ---
    @OneToMany(mappedBy = "packagingSpec", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<PackagingSpecBomItem> bomItems = new java.util.ArrayList<>();

    // --- 아웃박스 & 착인 기준 (Sheet 1) ---
    private String markingMethod;               // 제품 착인기준 - 표기 방법
    private String markingStandard;             // 제품 착인기준 - 표기 기준
    private String outboxLayoutImage;           // 제품 이미지/구성품 첨부 파일 경로 (향후 3D/이미지 연동)
    @Column(columnDefinition = "TEXT")
    private String packagingMethodText;         // 포장방법 (서술)
    private String markingLocationImage;        // 착인 위치 (이미지 파일 경로)

    // --- 적재사항: 인/아웃박스 (Sheet 1) ---
    private String inboxType;                   // 인박스 구분
    private Integer inboxQty;                   // 인박스 입수량
    private String inboxSize;                   // 인박스 사이즈 (장폭고mm)
    private String inboxTapeBanding;            // 인박스 테이프 밴딩 여부
    private String inboxInterlayerSheet;        // 인박스 간지 유무
    private String inboxMaterial;               // 인박스 재질
    private String inboxRemarks;                // 인박스 비고

    private String outboxType;                  // 아웃박스 구분
    private Integer outboxQty;                  // 아웃박스 입수량
    private String outboxSize;                  // 아웃박스 사이즈 (장폭고mm)
    private String outboxTapeBanding;           // 아웃박스 테이프 밴딩 여부
    private String outboxInterlayerSheet;       // 아웃박스 간지 유무
    private String outboxMaterial;              // 아웃박스 재질
    private String outboxRemarks;               // 아웃박스 비고

    // --- 적재사항: 팔레트 (Sheet 1) ---
    private String palletTypeStr;               // 팔레트 종류 (종이/플라스틱 등)
    private String palletStackingMethod;        // 팔레트 적재방법
    private String palletSize;                  // 팔레트 사이즈
    private String palletHeightLimit;           // 팔레트 높이
    @Column(columnDefinition = "TEXT")
    private String palletPrecautions;           // 팔레트 주의사항

    private String inboxLayoutImage;            // 인박스 입수형태 이미지 경로
    private String outboxLayoutImageFile;       // 아웃박스 입수형태 이미지 경로
    private String palletLayoutImage;           // 팔레트 적재형태 이미지 경로

    // --- 중량 및 적재 높이 검증 (Sheet 1) ---
    private Double oneOutboxWeight;             // 1 아웃박스 중량 (Max 12kg)
    private Double onePalletWeight;             // 1 팔렛트 중량 (Max 630kg)
    private Double onePalletHeight;             // 1 팔렛트 높이 (Max 1,500mm)

    // --- 특이사항 (Sheet 1) ---
    @Column(columnDefinition = "TEXT")
    private String remarks;                     // 특이사항 (자유 서술)

    // --- 기존 필드 유지 (하위 호환) ---
    @Enumerated(EnumType.STRING)
    private PaletteType palletType;
    private String lotAndExpiryFormat;
    private String signatureJson;
    private boolean applyChannelSticker;
    private String packagingMethodImage;
    private String inboxSpec;
    private String zipperBagSpec;
    private String outboxSpec;
    private String palletStackingSpec;

    private Integer version;
    private String revisionNotes;
    private String lastModifiedBy;
    private LocalDateTime lastModifiedAt;

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        this.lastModifiedAt = LocalDateTime.now();
    }
}
