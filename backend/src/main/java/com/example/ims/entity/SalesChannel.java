package com.example.ims.entity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;
import java.time.LocalDateTime;

/**
 * 유통 채널 마스터 데이터 (Feature: Channel Management)
 */
@Entity
@Table(name = "sales_channels")
@SQLDelete(sql = "UPDATE sales_channels SET is_deleted = true WHERE id = ?")
@Where(clause = "is_deleted = false")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesChannel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Builder.Default
    private Boolean isDeleted = false;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(unique = true, nullable = false)
    private String name; // e.g., 올리브영(OY), 일본/오프라인(JP/OFF)

    private String description;

    @Builder.Default
    private boolean active = true;

    // --- 신규 채널 포장 규칙 필드 추가 ---
    private String channelCode;             // OY, PX, JP-ON 등

    private String palletType;              // 아주팔레트, 일회용, 목재 등

    private String palletSpec;              // 팔레트 치수 및 상세 스펙

    private Boolean channelStickerRequired;  // 스티커 부착 필수 여부 (Boolean Wrapper 사용하여 local H2 null constraint 우회)

    private Integer maxStackHeightMm;       // PLT 제외 적재 한도 높이

    private Boolean padAndFrameRequired;     // 패드 및 각대 필요 여부 (Boolean Wrapper)

    private String expDateFormat;           // YYYYMMDD까지, MM-DD-YYYY 등

    private Boolean popRequired;            // 제품 POP 부착/동봉 필요 여부

    private String cushioningStandard;     // 빈공간 완충재(비닐 에어캡 등) 투입 기준

    @Column(columnDefinition = "TEXT")
    private String specialNotes;            // 채널별 핵심 특이사항 원문

    private String updatedBy;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
