package com.example.ims.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 의료기기 품목 마스터 엔티티 (Medical Device Product Master).
 * ISO 13485 및 의료기기법 규제 요건(기기등급, UDI, 사용목적, 인허가번호 등)을 관리합니다.
 * Soft delete (is_deleted) 및 감사 추적(audit trail)을 지원합니다.
 */
@Entity
@Table(name = "medical_device_products", indexes = {
        @Index(name = "idx_mdp_item_code", columnList = "itemCode", unique = true),
        @Index(name = "idx_mdp_product_name", columnList = "productName"),
        @Index(name = "idx_mdp_device_class", columnList = "deviceClassification"),
        @Index(name = "idx_mdp_udi_di", columnList = "udiDi"),
        @Index(name = "idx_mdp_active_deleted", columnList = "active, is_deleted")
})
@org.hibernate.annotations.SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@EntityListeners(AuditingEntityListener.class)
public class MedicalDeviceProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Version
    @Builder.Default
    private Long version = 0L;

    /**
     * 품목 식별 코드 (SKU / 관리 코드)
     */
    @Column(unique = true, nullable = false, length = 50)
    @NotBlank(message = "품목코드는 필수입니다.")
    @Size(max = 50, message = "품목코드는 50자 이내여야 합니다.")
    private String itemCode;

    /**
     * 국문 품목명 (제품명)
     */
    @Column(nullable = false, length = 255)
    @NotBlank(message = "제품명은 필수입니다.")
    @Size(max = 255, message = "제품명은 255자 이내여야 합니다.")
    private String productName;

    /**
     * 영문 품목명
     */
    @Column(length = 255)
    private String englishProductName;

    /**
     * 모델명 / 형식 (Model Name / Type)
     */
    @Column(length = 100)
    private String modelName;

    /**
     * 의료기기 등급 (기기등급: CLASS_I, CLASS_II, CLASS_III, CLASS_IV 또는 1등급, 2등급, 3등급, 4등급)
     */
    @Column(length = 30, nullable = false)
    @Builder.Default
    private String deviceClassification = "CLASS_I";

    /**
     * 사용 목적 및 적응증 (Intended Use / Indications)
     */
    @Column(columnDefinition = "TEXT")
    private String intendedUse;

    /**
     * 품목 허가 / 신고 / 인증 번호 (Regulatory Approval / License Number)
     */
    @Column(length = 100)
    private String licenseNumber;

    /**
     * UDI-DI (기기식별코드: GS1 GTIN 등 14자리 고유식별자)
     */
    @Column(length = 50)
    private String udiDi;

    /**
     * UDI-PI 관리 속성 (생산식별자: LOT, SERIAL, EXPIRY, MFG_DATE 구분 표시)
     * 예: "LOT,EXPIRY"
     */
    @Column(length = 100)
    @Builder.Default
    private String udiPiType = "LOT,EXPIRY";

    /**
     * 소프트웨어 의료기기 여부 (SaMD / SiMD)
     */
    @Builder.Default
    private boolean isSoftware = false;

    /**
     * 소프트웨어 버전 (Software Version)
     */
    @Column(length = 50)
    private String softwareVersion;

    /**
     * 멸균 의료기기 여부 (Sterile Product)
     */
    @Builder.Default
    private boolean isSterile = false;

    /**
     * 멸균 방식 (Sterilization Method: EO_GAS, STEAM, GAMMA, RADIATION, NONE)
     */
    @Column(length = 50)
    private String sterilizationMethod;

    /**
     * 보관 및 수송 조건 (Storage Conditions: 실온(1~30℃), 냉장(2~8℃), 냉동 등)
     */
    @Column(length = 100)
    private String storageConditions;

    /**
     * 유효기간 / 사용기한 (개월 수)
     */
    private Integer shelfLifeMonths;

    /**
     * 제조소 / 제조원 정보 (Manufacturer Info / Subcontractor)
     */
    @Column(length = 100)
    private String manufacturer;

    /**
     * 비고 및 특이사항
     */
    @Column(columnDefinition = "TEXT")
    private String remarks;

    /**
     * 활성 여부
     */
    @Builder.Default
    private boolean active = true;

    /**
     * Soft delete 삭제 플래그
     */
    @Builder.Default
    @Column(name = "is_deleted", columnDefinition = "boolean default false")
    private Boolean deleted = false;

    public boolean isDeleted() {
        return deleted != null && deleted;
    }

    public void setIsDeleted(boolean val) {
        this.deleted = val;
    }

    private LocalDateTime deletedAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
