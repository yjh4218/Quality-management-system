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

    // --- 포장재 및 단상자 표시 기준 (Sheet 1) ---
    private String markingMethod;               // 제품 착인기준 - 표기 방법
    private String markingStandard;             // 제품 착인기준 - 표기 기준
    private String containerMarkingType;        // 1차 용기 표시 방식 (압인 / 착인)
    private String containerMarkingStandard;    // 1차 용기 표시 기준
    private String unitBoxMarkingType;          // 2차 단상자 표시 방식 (압인 / 착인)
    private String unitBoxMarkingStandard;      // 2차 단상자 표시 기준
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

    // --- 고도화 추가 필드 (인박스/아웃박스/팔레트 세부 적재 수치 및 특이사항) ---
    private String inboxUseYn;                      // 인박스 사용 여부 (사용/미사용 또는 O/X)
    private String inboxCategory;                   // 인박스 종류 (A박스(H 테이핑), B박스(테이핑 사용 금지), 지퍼백)
    private Integer palletTierQty;                  // 1단 아웃박스 적재 수량
    private Integer palletTierCount;                // 아웃박스 적재 단수
    private Integer palletTotalOutboxQty;           // 팔레트 총 적재 아웃박스 수량
    private Integer palletTotalQuantity;            // 팔레트 총 낱개 수량
    private String outboxChannelStickerStandard;    // 아웃박스 채널 스티커 부착 여부 및 기준
    private String outboxBarcodeStickerStandard;    // 아웃박스 바코드 별도 부착 기준
    private String outboxCushioningStandard;        // 아웃박스 완충재/빈공간 처리 기준
    private String popRequiredStandard;             // 아웃박스 제품 POP 부착/동봉 여부 및 기준

    // --- 2026-08 개편: 용기/단상자 세부 착인 및 포장/적재 상세 필드 ---
    private String containerMarkingDisplay;         // 용기 표시방법 (압인/잉크젯/스티커 등)
    private String containerMarkingLocation;        // 용기 착인 또는 압인 위치
    private String containerMarkingText;            // 용기 사용기한 및 제조번호 표기 기준 (3줄)
    private String containerMarkingLotFormat;       // 용기 제조번호 착인 형식 (하위 호환)
    private String containerMarkingExpiryFormat;    // 용기 사용기한 착인 형식 (하위 호환)
    private String unitBoxMarkingDisplay;           // 단상자 표시방법 (압인/잉크젯/스티커 등)
    private String unitBoxMarkingLocation;          // 단상자 착인 또는 압인 위치
    private String unitBoxMarkingText;              // 단상자 사용기한 및 제조번호 표기 기준 (3줄)
    private String unitBoxMarkingLotFormat;         // 단상자 제조번호 착인 형식 (하위 호환)
    private String unitBoxMarkingExpiryFormat;      // 단상자 사용기한 착인 형식 (하위 호환)
    private String inboxPackagingType;              // 인박스 포장 유형 (지퍼백 / A형 박스 / B형 박스)
    private String inboxTapeMethod;                 // 인박스 테이핑 처리 (별도 테이핑 X / 일자 테이핑)
    private Integer outboxTotalQty;                 // 아웃박스 제품 총 입수량 (인박스 사용 시)
    private Integer outboxInboxQty;                 // 아웃박스 인박스 입수량 (인박스 사용 시)
    private String palletSpec;                      // 팔레트 규격
    private Integer palletTotalProductQty;          // 팔레트 총 제품 수량


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
