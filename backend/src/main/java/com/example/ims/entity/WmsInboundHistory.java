package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "wms_inbound_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WmsInboundHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long wmsInboundId;

    @Column(nullable = false)
    private String modifier;

    @Column
    private String fieldName;

    @CreationTimestamp
    private LocalDateTime modifiedAt;

    @Column(columnDefinition = "TEXT")
    private String changeLog; // "LOT 번호 수정: A -> B" 등 상세 내용

    @Column(columnDefinition = "TEXT")
    private String oldValue;

    @Column(columnDefinition = "TEXT")
    private String newValue;
}
