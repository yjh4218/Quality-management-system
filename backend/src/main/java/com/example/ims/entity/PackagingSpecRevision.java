package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

/**
 * 포장사양서 개정 이력 엔티티 (Sheet 1 개정 내역 매핑용)
 */
@Entity
@Table(name = "packaging_spec_revisions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackagingSpecRevision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "spec_id", nullable = false)
    private Long specId; // 연관 포장사양 ID

    private Integer revisionNo;         // NO. (개정 번호)
    private String content;             // 개정 내용
    private LocalDate revisionDate;     // 개정일
    private String revisionAuthor;      // 개정자
}
