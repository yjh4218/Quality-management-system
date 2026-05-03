package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "claims", indexes = {
    @Index(name = "idx_claim_number", columnList = "claimNumber"),
    @Index(name = "idx_claims_receipt_mfr", columnList = "receiptDate DESC, manufacturer"),
    @Index(name = "idx_claim_receipt_date", columnList = "receiptDate"),
    @Index(name = "idx_claim_item_code", columnList = "itemCode"),
    @Index(name = "idx_claim_product_name", columnList = "productName"),
    @Index(name = "idx_claim_manufacturer", columnList = "manufacturer"),
    @Index(name = "idx_claim_shared_with_manufacturer", columnList = "sharedWithManufacturer")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true)
    private String claimNumber;
    
    @Builder.Default
    @Column(columnDefinition = "boolean default false")
    private boolean isDeleted = false;

    // 접수부서 (CS/영업) 필드
    private LocalDate receiptDate;
    private String country;
    private String itemCode;
    private String productName;
    private String lotNumber;
    private String manufacturer;
    private Integer occurrenceQty;
    
    private String primaryCategory;
    private String secondaryCategory;
    private String tertiaryCategory;
    
    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String claimContent;
    
    @Builder.Default
    private String qualityCheckNeeded = "필요"; // "필요", "불필요"
    
    private String consumerReplyNeeded; // "필요", "불필요"
    private String productRetrievalNeeded; // "필요", "불필요"
    private LocalDate expectedRetrievalDate;
    private LocalDate recallDate; // 실제 제품 회수 일자

    // 품질/제조사 부서 필드
    @Builder.Default
    private String qualityStatus = "0단계 (접수 대기)"; 

    private boolean sharedWithManufacturer; // [고도화 3] 제조사 노출 여부 스위치
    private LocalDate terminationDate;    // [고도화 2] 5단계 종결 시점

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "claim_photos", joinColumns = @JoinColumn(name = "claim_id"))
    @Column(name = "photo_url", columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    @Builder.Default
    private java.util.List<String> claimPhotos = new java.util.ArrayList<>();
    
    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String rootCauseAnalysis;
    
    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String preventativeAction;
    
    @Builder.Default
    private String qualityReceivedReturnedProduct = "미수령"; // "수령", "미수령"
    private LocalDate qualityReceivedDate;
    
    private String manufacturerResponsePdf; // PDF 파일 경로 (증빙)

    // [추가] 제조사 담당자 기재 및 상태 필드
    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String mfrRootCauseAnalysis;
    
    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String mfrPreventativeAction;
    
    @Builder.Default
    private String mfrStatus = "0단계 (접수 대기)"; // "0단계 (접수 대기)", "1단계...", "5단계..."

    @Builder.Default
    private String mfrRecallStatus = "미회수"; // [추가] "회수", "미회수"
    private LocalDate mfrRecallDate; // [추가] 제조사 측 제품 회수 일자
    private LocalDate mfrTerminationDate; // [추가] 제조사 측 클레임 종결 일자

    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String qualityRemarks; // [신설] 품질팀 비고

    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String mfrRemarks; // [신설] 제조사 비고

    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
