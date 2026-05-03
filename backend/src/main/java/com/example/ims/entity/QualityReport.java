package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "quality_reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QualityReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * ID of the corresponding inbound entry (WmsInbound).
     * 연관된 입고 내역의 식별자
     */
    @Column(nullable = false)
    private Long wmsInboundId;

    /**
     * Date when the inspection was created/performed.
     * 품질 검토 수행(등록) 일자
     */
    @CreationTimestamp
    private LocalDateTime inspectionDate;

    /**
     * Legacy boolean to indicate pass/fail.
     * 합격 여부 (초기 버전 호환용 플래그)
     */
    private Boolean isPassed;

    /**
     * Additional remarks or notes from the inspector.
     * 품질 검토자의 특이사항 및 비고 상세 내용
     */
    @Column(columnDefinition = "TEXT")
    private String remark;

    /**
     * Username or identifier of the person who inspected the item.
     * 품질 검사자 식별자 (제조사 담당자 아이디 등)
     */
    private String inspector;
}
