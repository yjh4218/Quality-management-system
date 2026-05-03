package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "products", indexes = {
        @Index(name = "idx_item_code", columnList = "itemCode", unique = true),
        @Index(name = "idx_products_active_created", columnList = "active, createdAt DESC"),
        @Index(name = "idx_products_dimensions_status", columnList = "status"),
        @Index(name = "idx_product_name", columnList = "productName")
})
@Getter
@Setter
@ToString(exclude = {"brand", "manufacturerInfo", "productIngredients", "channels", "components"})
@NoArgsConstructor
@AllArgsConstructor
@Builder
@lombok.EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @lombok.EqualsAndHashCode.Include
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    /**
     * Unique identifier for the product (SKU).
     * 품목코드 (단품, 세트 등 고유 식별자)
     */
    @Column(unique = true, nullable = false)
    private String itemCode;

    /**
     * Korean product name.
     * 국문 제품명
     */
    @Column(nullable = false)
    private String productName;

    /**
     * English product name.
     * 영문 제품명
     */
    private String englishProductName;

    /**
     * Category of the product (PET병, 튜브 등 - Feature 1)
     */
    @jakarta.persistence.Convert(converter = com.example.ims.util.ProductTypeConverter.class)
    private ProductType productType;

    /**
     * Reference to the Brand entity.
     * 브랜드 정보와 연관 관계 매핑
     */
    @ManyToOne
    @JoinColumn(name = "brand_id")
    private Brand brand;

    /**
     * Reference to the Manufacturer entity.
     * 상세 제조사 정보 연관 관계 매핑
     */
    @ManyToOne
    @JoinColumn(name = "manufacturer_id")
    private Manufacturer manufacturerInfo;

    /**
     * Shelf life / Expiration period in months
     * 제품의 사용기한(월) - 최대 2자리 숫자
     */
    @Column(name = "shelf_life_months")
    private Integer shelfLifeMonths;

    /**
     * Opened Shelf life / Expiration period after opening in months
     * 개봉 후 사용기한(월) - 최대 2자리 숫자
     */
    @Column(name = "opened_shelf_life_months")
    private Integer openedShelfLifeMonths;

    @Deprecated
    private String manufacturer; // Linked to User.companyName

    // ----- Specifications (제품 사양) -----
    
    /**
     * Capacity string, usually in mL or fl.oz.
     * 용량 (텍스트, 예: 30mL 등)
     */
    private String capacity;
    private Double capacityFlOz; // 계산된 fl.oz 값 저장 (Calculated fl.oz)

    /**
     * Net weight string, usually in grams.
     * 제품 중량 (텍스트, 예: 50g 등)
     */
    private String weight;
    private Double weightOz; // 계산된 oz 값 저장 (Calculated oz)

    /**
     * Embedded volumetric dimensions (width, height, length, outer/inner).
     * 제품, 아웃박스 등의 상세 체적(크기) 정보
     */
    @Embedded
    private Dimensions dimensions;

    // Embeddable Packaging Request
    @Embedded
    private PackagingRequest packagingRequest;

    @Embedded
    @Builder.Default
    private InboxInfo inboxInfo = new InboxInfo();
    
    @Embedded
    @Builder.Default
    private OutboxInfo outboxInfo = new OutboxInfo();
    
    @Embedded
    @Builder.Default
    private PalletInfo palletInfo = new PalletInfo();

    private String recycleGrade;
    private String recycleEvalNo; // 재활용 평가 번호
    private String recycleMaterial; // 재활용 재질구조분류

    @Embedded
    @Builder.Default
    private PackagingMaterial packagingMaterial = new PackagingMaterial();

    // File Paths
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_images", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "image_path")
    @Builder.Default
    private java.util.List<String> imagePaths = new java.util.ArrayList<>();

    private String imagePath; // Selected representative image path
    private String certStandard; // 제품표준서
    private String certMsds; // MSDS
    private String certFunction; // 기능성보고서
    private String certExpiry; // 유통기한설정서류

    // Ingredients
    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String ingredients; // 전성분 요약 캐시 (List View용 역정규화 필드)

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private java.util.List<ProductIngredient> productIngredients = new java.util.ArrayList<>();

    // ----- Component & History Info (구성품 및 식별 정보) -----
    
    /**
     * If the item is part of a set, this references the parent SKU.
     * 기획세트 등 모품목에 종속된 경우 모품목 코드를 기록
     */
    private String parentItemCode;

    /**
     * Indicates if this item acts as a parent (contains children).
     * 본 품목이 모품목인지 여부
     */
    @JsonProperty("isParent")
    private boolean isParent;

    /**
     * Indicates if this is the master blueprint product.
     * 기준이 되는 마스터 제품 여부
     */
    @JsonProperty("isMaster")
    private boolean isMaster;

    /**
     * True if the product is a promotional/planning set.
     * 특별 기획 세트 여부 표시
     */
    @JsonProperty("isPlanningSet")
    private boolean isPlanningSet;

    /**
     * List of distribution channels (ex: Olive Young, Amazon).
     * 유통 채널 목록 (올리브영, 자사몰 등)
     */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "product_sales_channels",
        joinColumns = @JoinColumn(name = "product_id"),
        inverseJoinColumns = @JoinColumn(name = "channel_id")
    )
    @Builder.Default
    private java.util.List<SalesChannel> channels = new java.util.ArrayList<>();

    /**
     * Soft delete indicator for the record.
     * 삭제 여부 플래그 (Soft delete 적용)
     */
    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private boolean photoAuditDisclosed = false;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id")
    @Builder.Default
    private java.util.List<ProductComponent> components = new java.util.ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_packaging_certificates", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "certificate_path")
    @Builder.Default
    private java.util.List<String> packagingCertificates = new java.util.ArrayList<>();

    @Deprecated
    private String certificatePath;
}
