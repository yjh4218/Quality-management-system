package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "wms_inbound", indexes = {
    @Index(name = "idx_wms_grn_number", columnList = "grnNumber"),
    @Index(name = "idx_wms_item_code", columnList = "itemCode"),
    @Index(name = "idx_wms_inbound_date", columnList = "inboundDate"),
    @Index(name = "idx_wms_manufacturer", columnList = "manufacturer"),
    @Index(name = "idx_wms_lot_number", columnList = "lotNumber")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@org.hibernate.annotations.SQLRestriction("is_deleted = false")
public class WmsInbound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    //@Column(unique = true)
    private String grnNumber;
    
    @Builder.Default
    @Column(name = "is_deleted", columnDefinition = "boolean default false")
    private boolean isDeleted = false;

    @Column(nullable = false)
    private String itemCode;

    @Column(nullable = false)
    private String productName;

    private Integer quantity;

    @Column(nullable = false)
    private String manufacturer; // Linked to User.companyName

    @Column(updatable = true)
    private LocalDateTime inboundDate;

    // 품질 검사 데이터
    private String lotNumber;
    private String expirationDate;
    private Double specificGravity; // 비중값
    @Column(columnDefinition = "TEXT", nullable = true)
    private String coaFileUrl; // 검사성적서 PDF (국문)
    @Column(columnDefinition = "TEXT", nullable = true)
    private String coaFileUrlEng; // 검사성적서 PDF (영문)
    private String coaDecisionDate; // 성적서 판정일 (yyyy-MM-dd)
    
    @Column(columnDefinition = "TEXT", nullable = true)
    private String testReportNumbers; // 시험성적서 번호 (다중 입력을 위해 콤마로 구분)
    
    @Column(columnDefinition = "TEXT", nullable = true)
    private String remark;

    @Column(columnDefinition = "TEXT", nullable = true)
    private String controlSampleRemarks; // 관리품 확인 중 특이사항

    @Column(columnDefinition = "TEXT", nullable = true)
    private String finalInspectionRemarks; // 완제품 검사 중 특이사항

    @Column(columnDefinition = "TEXT", nullable = true)
    private String mfrRemarks; // 제조사 확인 비고

    // --- 고도화된 상태 및 결과 필드 ---
    
    @jakarta.persistence.Convert(converter = com.example.ims.util.OverallStatusConverter.class)
    @Builder.Default
    private OverallStatus overallStatus = OverallStatus.STEP1_WAITING; // 통합 상태 (5단계)

    @Builder.Default
    private String inboundInspectionStatus = "검사 대기"; // 입고 검사 상태 [검사 대기, 검사 중, 검사 완료]
    
    @Builder.Default
    private String inboundInspectionResult = "판정 중"; // 입고 검사 결과 [적합, 부적합, 판정 중]

    @Builder.Default
    private String controlSampleStatus = "검사 대기"; // 관리품 확인 상태 [검사 대기, 검사 중, 검사 완료]
    
    @Builder.Default
    private String finalInspectionResult = "판정 중"; // 완제품 검사 결과 [적합, 부적합, 판정 중]
    
    private String qualityDecisionDate; // 품질 적합 판정일 (yyyy-MM-dd)

    @UpdateTimestamp
    private LocalDateTime lastModifiedAt;
    
    private String lastModifiedBy;

    // 통합 상태 정의
    public enum OverallStatus {
        STEP1_WAITING("1. 입고 검사 대기 중"),
        STEP2_INBOUND_COMPLETE("2. 입고 검사 완료"),
        STEP3_CONTROL_CHECKING("3. 관리품 확인 중"),
        STEP4_CONTROL_COMPLETE("4. 관리품 완료"),
        STEP5_FINAL_COMPLETE("5. 최종 검사 완료");

        private final String label;
        OverallStatus(String label) { this.label = label; }
        public String getLabel() { return label; }
    }

    @PrePersist
    protected void onCreate() {
        if (inboundDate == null) {
            inboundDate = LocalDateTime.now();
        }
    }
}
