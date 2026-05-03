package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * BOM 유형 및 세부유형 마스터 데이터 테이블
 */
@Entity
@Table(name = "bom_categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BomCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(name = "main_type", nullable = false)
    private String mainType; // 유형 (예: 용기, 캡, 라벨)

    @Column(name = "sub_type", nullable = false)
    private String subType; // 세부유형 (예: PET병, PP)

    @Column(name = "active")
    @Builder.Default
    private boolean active = true; // 삭제(숨김) 여부

    @Column(name = "updated_by")
    private String updatedBy;
}
