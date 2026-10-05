package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "screen_form_field")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScreenFormField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_page_id", nullable = false)
    private ScreenSubPage subPage;

    @Column(name = "field_key", nullable = false, length = 50)
    private String fieldKey;

    @Column(nullable = false, length = 50)
    private String label;

    @Column(name = "field_type", nullable = false, length = 20)
    private String fieldType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "relation_source_id")
    private MasterDataSource relationSource;

    @Builder.Default
    @Column(name = "is_required")
    private Boolean isRequired = false;

    @Builder.Default
    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @Builder.Default
    @Column(name = "max_file_count")
    private Integer maxFileCount = 5;

    @Column(name = "accepted_file_types", length = 100)
    private String acceptedFileTypes;
}
